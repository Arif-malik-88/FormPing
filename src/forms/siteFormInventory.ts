import type { Browser } from 'playwright';
import type { AppConfig, DetectedFormField, SiteForm } from '../types.js';
import { extractForms, type FormInfo } from './findContactForm.js';
import { detectEmbeds } from './detectEmbeds.js';
import { classifyFormKind, meaningfulFields, detectTrackingParams } from '../runners/formFacts.js';
import { fetchHtml } from '../browser/playwrightClient.js';
import { loadHtml, extractLinks } from '../utils/dom.js';
import { resolveHref, isSameOrigin } from '../utils/url.js';
import { fetchSitemapUrls } from '../discovery/sitemap.js';
import { logger } from '../utils/logger.js';

/**
 * Site-level form inventory (FR-68).
 *
 * The single-page flow discovers ONE contact page and tests it. This crawls the
 * site's reachable pages (nav/footer links + sitemap, bounded) and inventories
 * EVERY form on each — so a site whose forms live on different pages (contact on
 * /contact-us, rental on /rental, demo on /book-a-demo) is fully reported, not
 * just the one page we happened to test. Read-only: never fills or submits.
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

/** Lead forms first, then marketing, then utility — for a sensible report order. */
const KIND_RANK: Record<string, number> = { contact: 0, other: 1, newsletter: 2, login: 3, search: 4, 'third-party': 5 };

export async function inventorySiteForms(
  inputUrl: string,
  browser: Browser,
  config: AppConfig,
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
  logger.info(`Site inventory: crawling ${pool.length} page(s) for forms`);

  // ── 2. Render each page, extract its native forms + embeds.
  const records: Array<{ url: string; form?: FormInfo; captcha: boolean; embedProvider?: string }> = [];
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  ctx.setDefaultNavigationTimeout(RENDER_TIMEOUT);
  try {
    for (const url of pool) {
      let page = null;
      try {
        page = await ctx.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: RENDER_TIMEOUT });
        await page.waitForLoadState('networkidle', { timeout: SETTLE_TIMEOUT }).catch(() => { /* bounded */ });
        const forms = await extractForms(page);
        const embeds = await detectEmbeds(page);
        const captcha = /recaptcha|hcaptcha|turnstile|g-recaptcha/i.test(await page.content());
        for (const form of forms) records.push({ url, form, captcha });
        for (const embed of embeds) records.push({ url, captcha, embedProvider: embed.provider });
      } catch (err) {
        logger.debug(`Site inventory: skipped ${url}: ${err}`);
      } finally {
        if (page) await page.close().catch(() => { /* ignore */ });
      }
    }
  } finally {
    await ctx.close().catch(() => { /* ignore */ });
  }

  // ── 3. Build SiteForm[] + dedupe site-wide forms.
  // Identity = a stable cross-page `action` (collapses the search/newsletter that
  // sit on every page into one entry); forms with no shared action stay distinct
  // per page (so Contact / Rental / Demo remain separate). Seen on 3+ pages = site-wide.
  const byKey = new Map<string, SiteForm>();
  const bump = (sf: SiteForm) => { sf.seenOn += 1; sf.siteWide = sf.seenOn >= 3; };

  for (const rec of records) {
    if (rec.embedProvider) {
      const key = `embed:${rec.embedProvider.toLowerCase()}`;
      const found = byKey.get(key);
      if (found) { bump(found); continue; }
      byKey.set(key, {
        url: rec.url, kind: 'third-party', about: rec.embedProvider, formType: 'third-party',
        provider: rec.embedProvider, fieldCount: 0, fields: [], security: { captcha: rec.captcha },
        tracking: { utm: [], other: [] }, siteWide: false, seenOn: 1,
      });
      continue;
    }
    const f = rec.form!;
    const fields = toFields(f);
    const kind = classifyFormKind({ fields, submitText: f.submitText, allText: f.allText });
    const meaningful = meaningfulFields(fields);
    const action = (f.action ?? '').trim();
    const key = action
      ? `act:${action}|${kind}|${meaningful.length}`
      : `page:${rec.url}|${kind}|${meaningful.length}`;
    const found = byKey.get(key);
    if (found) { bump(found); continue; }
    byKey.set(key, {
      url: rec.url, kind, about: aboutOf(f), formType: 'native',
      fieldCount: meaningful.length, fields: meaningful, security: { captcha: rec.captcha },
      tracking: detectTrackingParams(fields), siteWide: false, seenOn: 1,
    });
  }

  return Array.from(byKey.values()).sort(
    (a, b) => (KIND_RANK[a.kind] ?? 9) - (KIND_RANK[b.kind] ?? 9) || b.fieldCount - a.fieldCount,
  );
}
