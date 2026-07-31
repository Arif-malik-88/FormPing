import type { Page } from 'playwright';

/**
 * Third-party embed form detection (FR-28).
 *
 * Many sites don't hand-code a native <form>; they drop in a hosted form from
 * Typeform / HubSpot / Calendly / Jotform / Tally / Google Forms / etc. Those
 * render inside a cross-origin <iframe> (or are injected by a provider script),
 * so `document.querySelectorAll('form')` finds nothing and the form-tester would
 * report "No contact form found" — even though a working form is right there.
 *
 * We can't auto-FILL a cross-origin embed (same-origin policy blocks reaching
 * into the iframe), but we can DETECT it from the parent page — the <iframe src>,
 * the provider's embed <script src>, or the container element the provider hooks
 * into are all visible to us. Reporting "Found a Typeform embed — the form
 * exists, not auto-testable" is far more useful than a blank miss.
 */

export interface EmbedDetection {
  /** Human provider name, e.g. "Typeform". */
  provider: string;
  /** How we spotted it. */
  kind: 'iframe' | 'script' | 'container';
  /** The matched src / selector (trimmed) — for the note + debugging. */
  detail: string;
}

interface ProviderRule {
  name: string;
  /** Matched against iframe/script src URLs. */
  url?: RegExp[];
  /** CSS selectors the provider's embed injects into the parent DOM. */
  containers?: string[];
}

// Order matters only for readability; each provider is reported at most once.
const PROVIDERS: ProviderRule[] = [
  { name: 'Typeform', url: [/typeform\.com/i], containers: ['[data-tf-widget]', '[data-tf-live]', '[data-typeform-id]'] },
  { name: 'HubSpot', url: [/hsforms\.(net|com)/i, /js\.hsforms/i, /hubspotusercontent/i], containers: ['.hs-form', '.hbspt-form', '[data-hs-forms-root]'] },
  // GoHighLevel / LeadConnector — its form, survey and booking widgets embed at
  // `/widget/(form|survey|booking)/<id>`, very often on a WHITE-LABELED domain
  // (e.g. links.trusteddds.com), so we match the path, not just the host.
  { name: 'HighLevel', url: [/leadconnectorhq\.com/i, /msgsndr\.com/i, /\/widget\/(form|survey|booking|appointment)s?\//i] },
  { name: 'Calendly', url: [/calendly\.com/i], containers: ['.calendly-inline-widget', '[data-url*="calendly.com"]'] },
  { name: 'Jotform', url: [/jotform\.(com|co)/i], containers: ['.jotform-form', '[id^="JotFormIFrame"]'] },
  { name: 'Tally', url: [/tally\.so/i], containers: ['[data-tally-src]', 'iframe[src*="tally.so"]'] },
  { name: 'Google Forms', url: [/docs\.google\.com\/forms/i] },
  { name: 'Wufoo', url: [/wufoo\.com/i] },
  { name: 'Gravity Forms', url: [/gravityforms/i], containers: ['.gform_wrapper'] },
  { name: 'Formstack', url: [/formstack\.com/i, /formstack\.io/i] },
  { name: 'Marketo', url: [/marketo\.(net|com)/i], containers: ['form[id^="mktoForm"]', '.mktoForm'] },
  { name: 'Paperform', url: [/paperform\.co/i] },
  { name: 'Mailchimp', url: [/list-manage\.com/i], containers: ['#mc_embed_signup'] },
];

/** Scan the loaded page for known third-party embed form providers. */
export async function detectEmbeds(page: Page): Promise<EmbedDetection[]> {
  // Pull raw signals out of the DOM in one pass; keep the provider matching in
  // Node (the page context can't see our regex table cleanly).
  const raw = await page.evaluate(() => {
    const srcs: { kind: 'iframe' | 'script'; value: string }[] = [];
    document.querySelectorAll('iframe[src]').forEach((el) => {
      const v = el.getAttribute('src');
      if (v) srcs.push({ kind: 'iframe', value: v });
    });
    document.querySelectorAll('script[src]').forEach((el) => {
      const v = el.getAttribute('src');
      if (v) srcs.push({ kind: 'script', value: v });
    });
    return srcs;
  });

  const found: EmbedDetection[] = [];
  const seen = new Set<string>();
  const claimed = new Set<string>(); // srcs already matched to a named provider

  const add = (provider: string, kind: EmbedDetection['kind'], detail: string) => {
    if (seen.has(provider)) return;
    seen.add(provider);
    found.push({ provider, kind, detail: detail.slice(0, 200) });
  };

  for (const item of raw) {
    for (const p of PROVIDERS) {
      if (p.url?.some((re) => re.test(item.value))) {
        add(p.name, item.kind, item.value);
        claimed.add(item.value);
        break;
      }
    }
  }

  // Generic fallback: an <iframe> whose path looks like a form / survey / quiz /
  // booking widget, from a provider we don't have a named rule for. Reported by
  // host so an unknown builder still surfaces as "there's an embedded form here"
  // instead of a false "no form found". Scoped to form-ish path segments ONLY —
  // deliberately NOT "embed" (YouTube `/embed/…`, Google Maps `/maps/embed`,
  // Spotify, etc. all use it and would false-positive as forms).
  const GENERIC_FORM_PATH = /\/(forms?|survey|quiz|assessment|poll|booking|appointments?|scheduling)\b/i;
  for (const item of raw) {
    if (item.kind !== 'iframe' || claimed.has(item.value)) continue;
    if (GENERIC_FORM_PATH.test(item.value)) {
      let host = item.value;
      try { host = new URL(item.value).host; } catch { /* keep raw */ }
      add(host, 'iframe', item.value);
    }
  }

  // Container-selector pass — some providers inject a target div/script config
  // without a same-page iframe/script src we can match (e.g. HubSpot's
  // createForm target, Marketo's <form id="mktoForm_1">).
  const containerRules = PROVIDERS.filter((p) => !seen.has(p.name) && p.containers?.length);
  if (containerRules.length) {
    const hits = await page.evaluate(
      (rules: { name: string; containers: string[] }[]) =>
        rules
          .filter((r) => r.containers.some((sel) => document.querySelector(sel)))
          .map((r) => r.name),
      containerRules.map((p) => ({ name: p.name, containers: p.containers! })),
    );
    for (const name of hits) add(name, 'container', PROVIDERS.find((p) => p.name === name)!.containers!.join(', '));
  }

  return found;
}
