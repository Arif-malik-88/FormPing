import type { Browser, Page } from 'playwright';
import type { AppConfig, DetectedFormField, FormCandidate, FormKind, FormOutcome, SiteForm, TrackingParams } from '../types.js';
import { extractForms, type FormInfo } from './findContactForm.js';
import { detectEmbeds } from './detectEmbeds.js';
import { fillForm } from './fillForm.js';
import { classifyFormKind, meaningfulFields, detectTrackingParams, isLeadForm } from '../runners/formFacts.js';
import { fetchHtml } from '../browser/playwrightClient.js';
import { loadHtml, extractLinks } from '../utils/dom.js';
import { resolveHref, isSameOrigin } from '../utils/url.js';
import { fetchSitemapUrls } from '../discovery/sitemap.js';
import { logger } from '../utils/logger.js';

/**
 * Site-level form inventory (FR-68 + FR-76).
 *
 * The single-page flow discovers ONE contact page and tests it. This crawls the
 * site's reachable pages (nav/footer links + sitemap, bounded) and inventories
 * EVERY form on each — so a site whose forms live on different pages (contact on
 * /contact-us, rental on /rental, demo on /book-a-demo) is fully reported.
 *
 * FR-76: it no longer just detects. In safe/live mode it also FILLS every lead
 * form it finds (contact / a real multi-field "other" — never search / newsletter
 * / login), recording a per-form `outcome` so the report can honestly say
 * "Filled ✓" on each. It never submits — a live submit stays the primary form's
 * job (runSingleSite) and the per-form opt-in button; detect-only never fills.
 */

// Slugs most likely to hold a lead form — crawled first so the budget is spent well.
const FORM_SLUG = /(contact|rental|demo|quote|evaluation|book|get-in-touch|request|trial|support|pricing|enquir|apply|career|subscribe|sign-?up)/i;
const POOL_CAP = 12;
const RENDER_TIMEOUT = 12_000;
const SETTLE_TIMEOUT = 2_500;

function toFields(f: FormInfo): DetectedFormField[] {
  return f.fields.map((x) => ({ label: x.label || x.placeholder || x.name, type: x.type, name: x.name }));
}

/** "What it's about": nearest heading, else a short submit-button label. */
function aboutOf(f: FormInfo): string {
  const heading = (f.location?.heading ?? '').trim();
  if (heading) return heading;
  const submit = (f.submitText ?? '').trim();
  return submit && submit.length <= 40 ? submit : '';
}

/** Build the FormCandidate fillForm needs (it only reads `index`; the rest keeps
 *  the shape valid + carries fields/kind for logging). */
function toCandidate(f: FormInfo, kind: FormKind): FormCandidate {
  return {
    index: f.index,
    identifier: { id: f.id, name: f.name, action: f.action, method: f.method },
    score: 0,
    signals: [],
    negativeSignals: [],
    kind,
    location: (f.location.landmark || f.location.heading || f.location.anchorId)
      ? {
          ...(f.location.landmark ? { landmark: f.location.landmark } : {}),
          ...(f.location.heading ? { heading: f.location.heading } : {}),
          ...(f.location.anchorId ? { anchorId: f.location.anchorId } : {}),
        }
      : undefined,
    fields: toFields(f),
  };
}

function shortErr(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return m.split('\n')[0]!.replace(/^[a-z]+:\s*/i, '').slice(0, 120);
}

function shortPath(u: string): string {
  try { return new URL(u).pathname || '/'; } catch { return u; }
}

/** Same page, ignoring a trailing slash — used to spot the contact form the main
 *  flow will test, so the inventory doesn't fill it a second time. */
function samePage(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return ua.host === ub.host && ua.pathname.replace(/\/+$/, '') === ub.pathname.replace(/\/+$/, '');
  } catch {
    return a === b;
  }
}

/** Fill one lead form on an open page, translating the fill result into a plain
 *  per-form outcome. Never submits. Best-effort — a throw becomes `failed`. */
async function fillLeadForm(page: Page, f: FormInfo, kind: FormKind, config: AppConfig): Promise<FormOutcome> {
  // A hidden / multi-step form can't be blind-filled reliably from the inventory
  // crawl — report it detected rather than attempting a flaky fill.
  if (!f.visible) return { state: 'skipped', note: 'hidden or multi-step form' };
  try {
    // fillForm never submits — it only enters values — so this is safe in any
    // mode; a live submit stays the primary form's job + the per-form button.
    //
    // Skip the per-form AI honeypot check here (FR-76 perf): honeypots only bite
    // at SUBMISSION (a filled trap field makes the submit silently fail), and the
    // inventory never submits — so the AI round-trip per form is pure cost with no
    // benefit. The primary contact form (the one that IS submitted in live mode)
    // still gets the AI check on its own fill path in runSingleSite.
    const fillConfig: AppConfig = config.aiProvider === 'off' ? config : { ...config, aiProvider: 'off' };
    const fr = await fillForm(page, toCandidate(f, kind), fillConfig);
    if (fr.filledFields.length > 0) {
      const multi = fr.stepsTraversed > 1 || fr.wizardContainerUsed;
      return { state: 'filled', filledCount: fr.filledFields.length, ...(multi ? { note: 'multi-step' } : {}) };
    }
    return { state: 'skipped', note: 'no fillable fields reached' };
  } catch (err) {
    return { state: 'failed', note: shortErr(err) };
  }
}

/** Lead forms first, then marketing, then utility — for a sensible report order. */
const KIND_RANK: Record<string, number> = { contact: 0, other: 1, newsletter: 2, login: 3, search: 4, 'third-party': 5 };

interface NativeRec {
  type: 'native';
  url: string;
  captcha: boolean;
  about: string;
  kind: FormKind;
  action: string;
  meaningful: DetectedFormField[];
  tracking: TrackingParams;
  outcome: FormOutcome;
}
interface EmbedRec {
  type: 'embed';
  url: string;
  captcha: boolean;
  provider: string;
}

export async function inventorySiteForms(
  inputUrl: string,
  browser: Browser,
  config: AppConfig,
  /** The contact page the MAIN flow will test + fill. The inventory detects that
   *  page's contact form but doesn't fill it — the primary path fills it once,
   *  authoritatively — so we never fill the same form twice. FR-76. */
  primaryContactUrl: string | null = null,
): Promise<SiteForm[]> {
  let start: string;
  try {
    start = new URL(inputUrl).toString();
  } catch {
    return [];
  }

  // ── 1. Candidate page pool: homepage links (same-origin) + sitemap, form-likely first.
  const homeHtml = await fetchHtml(start, config.timeout);
  const sameOrigin = new Set<string>();
  if (homeHtml) {
    for (const { href } of extractLinks(loadHtml(homeHtml))) {
      const resolved = resolveHref(start, href);
      if (resolved && isSameOrigin(resolved, start)) {
        try {
          const u = new URL(resolved);
          u.hash = '';
          sameOrigin.add(u.toString());
        } catch { /* skip */ }
      }
    }
  }
  for (const u of await fetchSitemapUrls(start, config.timeout)) {
    if (isSameOrigin(u, start)) {
      try {
        const x = new URL(u);
        x.hash = '';
        sameOrigin.add(x.toString());
      } catch { /* skip */ }
    }
  }
  const others = Array.from(sameOrigin);
  const pool = Array.from(
    new Set([start, ...others.filter((u) => FORM_SLUG.test(u)), ...others.filter((u) => !FORM_SLUG.test(u))]),
  ).slice(0, POOL_CAP);
  const willFill = config.mode !== 'detect-only';
  logger.info(`Site inventory: crawling ${pool.length} page(s) for forms${willFill ? ' (filling lead forms)' : ''}`);

  // ── 2. Render each page, extract its native forms + embeds, and (safe/live)
  //       fill each lead form while the page is open.
  const records: NativeRec[] = [];
  const embedRecords: EmbedRec[] = [];
  let filledCount = 0;
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  ctx.setDefaultNavigationTimeout(RENDER_TIMEOUT);
  try {
    for (const url of pool) {
      let page: Page | null = null;
      try {
        page = await ctx.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: RENDER_TIMEOUT });
        await page.waitForLoadState('networkidle', { timeout: SETTLE_TIMEOUT }).catch(() => { /* bounded */ });
        const forms = await extractForms(page);
        const embeds = await detectEmbeds(page);
        const captcha = /recaptcha|hcaptcha|turnstile|g-recaptcha/i.test(await page.content());

        for (const form of forms) {
          const allFields = toFields(form);
          const kind = classifyFormKind({ fields: allFields, submitText: form.submitText, allText: form.allText });
          const meaningful = meaningfulFields(allFields);
          const lead = isLeadForm(kind, meaningful.length);

          // The contact form on the page the main flow will test is filled there,
          // once — so detect it here but don't re-fill it.
          const isPrimaryContact = kind === 'contact' && primaryContactUrl !== null && samePage(url, primaryContactUrl);

          let outcome: FormOutcome = { state: 'detected' };
          if (lead) {
            // Per-form progress the UI streams into a live narrative ("found a
            // rental form… filled it") — real events, one per lead form. FR-76.
            logger.info(`Site inventory: found a ${kind} form on ${shortPath(url)}`);
            if (willFill && !isPrimaryContact) {
              outcome = await fillLeadForm(page, form, kind, config);
              if (outcome.state === 'filled') {
                filledCount += 1;
                logger.info(`Site inventory: filled the ${kind} form (${outcome.filledCount} fields)`);
              }
            } else if (isPrimaryContact) {
              outcome = { state: 'detected', note: 'tested as the primary contact form' };
            }
          }

          records.push({
            type: 'native',
            url,
            captcha,
            about: aboutOf(form),
            kind,
            action: (form.action ?? '').trim(),
            meaningful,
            tracking: detectTrackingParams(allFields),
            outcome,
          });
        }
        for (const embed of embeds) embedRecords.push({ type: 'embed', url, captcha, provider: embed.provider });
      } catch (err) {
        logger.debug(`Site inventory: skipped ${url}: ${err}`);
      } finally {
        if (page) await page.close().catch(() => { /* ignore */ });
      }
    }
  } finally {
    await ctx.close().catch(() => { /* ignore */ });
  }
  if (willFill) logger.info(`Site inventory: filled ${filledCount} lead form(s)`);

  // ── 3. Build SiteForm[] + dedupe site-wide forms.
  // Identity = a stable cross-page `action` (collapses the search/newsletter that
  // sit on every page into one entry); forms with no shared action stay distinct
  // per page (so Contact / Rental / Demo remain separate). Seen on 3+ pages = site-wide.
  const byKey = new Map<string, SiteForm>();
  const bump = (sf: SiteForm) => { sf.seenOn += 1; sf.siteWide = sf.seenOn >= 3; };

  for (const rec of embedRecords) {
    const key = `embed:${rec.provider.toLowerCase()}`;
    const found = byKey.get(key);
    if (found) { bump(found); continue; }
    byKey.set(key, {
      url: rec.url, kind: 'third-party', about: rec.provider, formType: 'third-party',
      provider: rec.provider, fieldCount: 0, fields: [], security: { captcha: rec.captcha },
      tracking: { utm: [], other: [] }, siteWide: false, seenOn: 1,
      outcome: { state: 'detected', note: 'third-party embed — can’t auto-fill' },
    });
  }

  for (const rec of records) {
    const key = rec.action
      ? `act:${rec.action}|${rec.kind}|${rec.meaningful.length}`
      : `page:${rec.url}|${rec.kind}|${rec.meaningful.length}`;
    const found = byKey.get(key);
    if (found) {
      bump(found);
      // Prefer a real fill outcome if a later copy of the same form was filled.
      if (found.outcome?.state !== 'filled' && rec.outcome.state === 'filled') found.outcome = rec.outcome;
      continue;
    }
    byKey.set(key, {
      url: rec.url, kind: rec.kind, about: rec.about, formType: 'native',
      fieldCount: rec.meaningful.length, fields: rec.meaningful, security: { captcha: rec.captcha },
      tracking: rec.tracking, siteWide: false, seenOn: 1, outcome: rec.outcome,
    });
  }

  return Array.from(byKey.values()).sort(
    (a, b) => (KIND_RANK[a.kind] ?? 9) - (KIND_RANK[b.kind] ?? 9) || b.fieldCount - a.fieldCount,
  );
}
