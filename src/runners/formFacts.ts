import type { DetectedFormField, FormBrief, FormCandidate, FormKind, FormsOnPage, TrackingParams } from '../types.js';
import type { EmbedDetection } from '../forms/detectEmbeds.js';

/**
 * FR-64 — pure helpers that turn raw detection output into the human-facing
 * "what we found" facts on SiteResult. Kept out of the browser-coupled runner so
 * they're unit-testable: given fields / embeds, derive form type, field count +
 * names, and multi-step-ness. No I/O, no Playwright.
 */

// Field `type`s that aren't things a person fills in — excluded from the count
// and the name list so "3 fields: Name, Email, Message" reflects what the user
// actually sees, not hidden tokens or the submit button.
const NON_INPUT_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image']);
const GROUPED_TYPES = new Set(['radio', 'checkbox']);

/**
 * The ONE accurate field counter — used everywhere so counts never disagree.
 * Drops non-inputs (hidden/submit/…) AND collapses a radio/checkbox group that
 * shares a `name` into a single logical field (5 radio options is ONE choice,
 * not 5 fields). Fields without a name are kept as-is. FR-64/FR-68.
 */
export function meaningfulFields(fields: DetectedFormField[]): DetectedFormField[] {
  const out: DetectedFormField[] = [];
  const seenGroups = new Set<string>();
  for (const f of fields) {
    const type = f.type.toLowerCase();
    if (NON_INPUT_TYPES.has(type)) continue;
    if (GROUPED_TYPES.has(type) && f.name) {
      const key = `${type}:${f.name}`;
      if (seenGroups.has(key)) continue; // already counted this group once
      seenGroups.add(key);
    }
    out.push(f);
  }
  return out;
}

export interface NativeFormFacts {
  formType: 'native';
  fieldCount: number;
  fields: DetectedFormField[];
  isMultiStep: boolean;
}

/** Facts for a hand-coded DOM `<form>` we detected. */
export function nativeFormFacts(
  form: Pick<FormCandidate, 'fields'>,
  opts: { hiddenMultiStep: boolean; stepsTraversed?: number },
): NativeFormFacts {
  const fields = meaningfulFields(form.fields);
  const isMultiStep = opts.hiddenMultiStep || (opts.stepsTraversed ?? 0) > 1;
  return { formType: 'native', fieldCount: fields.length, fields, isMultiStep };
}

export interface EmbedFormFacts {
  formType: 'third-party';
  embedProvider: string;
  embedKind: 'iframe' | 'script' | 'container';
}

/** Facts for a third-party hosted embed (Typeform, HubSpot, …). Uses the first
 *  detected provider — detectEmbeds reports the most specific one first. */
export function embedFormFacts(embeds: EmbedDetection[]): EmbedFormFacts | null {
  const first = embeds[0];
  if (!first) return null;
  return { formType: 'third-party', embedProvider: first.provider, embedKind: first.kind };
}

/**
 * FR-63 — decide whether to HOLD a live submission on a multi-step/wizard form.
 * Walking a wizard means we chose values on earlier steps, so we only submit for
 * real when we reached the final step AND filled an email (a real, lead-shaped
 * entry). Non-wizard forms are never held here. Pure — unit-tested.
 */
export function shouldHoldMultiStepSubmit(opts: {
  isWizard: boolean;
  reachedSubmit: boolean;
  filledEmail: boolean;
}): boolean {
  if (!opts.isWizard) return false;
  return !(opts.reachedSubmit && opts.filledEmail);
}

// ── FR-68: multi-form classification + summary ───────────────────────────────

/** Structural input for classification — accepts the engine's raw FieldInfo or a
 *  DetectedFormField; only the bits that hint at purpose are read. */
interface ClassifyField {
  type: string;
  name?: string;
  id?: string;
  placeholder?: string;
  label?: string;
}
interface ClassifyInput {
  fields: ClassifyField[];
  submitText?: string;
  allText?: string;
}

const fieldHay = (f: ClassifyField): string =>
  `${f.type} ${f.name ?? ''} ${f.id ?? ''} ${f.placeholder ?? ''} ${f.label ?? ''}`.toLowerCase();

/**
 * Classify what a form is FOR from its fields + submit/text. Pure + order-
 * sensitive: password → login is the strongest signal, then search, then a
 * lone-email newsletter, then a real contact shape (email + message/name). FR-68.
 */
export function classifyFormKind(form: ClassifyInput): FormKind {
  const text = `${form.submitText ?? ''} ${form.allText ?? ''}`.toLowerCase();
  const fillable = meaningfulFields(form.fields as DetectedFormField[]);

  // Login — a password field is unambiguous.
  if (form.fields.some((f) => f.type.toLowerCase() === 'password')) return 'login';

  // Search — a search input, or "search" text on a tiny form.
  if (form.fields.some((f) => f.type.toLowerCase() === 'search')) return 'search';
  if (/\bsearch\b/.test(text) && fillable.length <= 1) return 'search';

  const hasEmail = form.fields.some(
    (f) => f.type.toLowerCase() === 'email' || /email/.test(fieldHay(f)),
  );

  // Newsletter — subscribe-style intent, or just a lone email input.
  if (/subscribe|newsletter|sign\s?up|join (our|the|my)?\s*(list|newsletter)|get (updates|the newsletter)/.test(text)) {
    return 'newsletter';
  }
  if (hasEmail && fillable.length <= 1) return 'newsletter';

  // Contact — an email plus a message or a name field: a real contact shape.
  const hasMessage = form.fields.some((f) => f.type.toLowerCase() === 'textarea');
  const hasName = form.fields.some((f) => /name/.test(fieldHay(f)) && !/(user|screen)name/.test(fieldHay(f)));
  if (hasEmail && (hasMessage || hasName)) return 'contact';

  return 'other';
}

/**
 * Build the "N forms on this page" summary from the already-scored native forms
 * + detected embeds. Returns null when the page has fewer than 2 forms, so a
 * single-form page stays exactly as before. Pure — no DOM, unit-tested. FR-68.
 */
export function buildFormsOnPage(
  allForms: Pick<FormCandidate, 'index' | 'identifier' | 'kind' | 'fields' | 'location'>[],
  embeds: EmbedDetection[],
  chosenIndex: number | null,
): FormsOnPage | null {
  const total = allForms.length + embeds.length;
  if (total < 2) return null;

  const tested =
    chosenIndex != null ? allForms.find((f) => f.index === chosenIndex) ?? null : null;

  const others: FormBrief[] = [];
  for (const f of allForms) {
    if (chosenIndex != null && f.index === chosenIndex) continue;
    others.push({ kind: f.kind, identifier: f.identifier, fieldCount: meaningfulFields(f.fields).length, location: f.location });
  }
  for (const e of embeds) {
    others.push({ kind: 'third-party', identifier: null, provider: e.provider });
  }

  return {
    total,
    native: allForms.length,
    embeds: embeds.length,
    tested: tested ? { kind: tested.kind, identifier: tested.identifier } : null,
    others,
    multipleContacts: allForms.filter((f) => f.kind === 'contact').length >= 2,
  };
}

// ── FR-68: hidden tracking / UTM params ──────────────────────────────────────

// Known click/campaign tracking params that lead-gen forms capture as hidden
// fields, so a lead can be attributed to its source. UTM (utm_*) is matched by
// prefix; these are the common non-UTM ones.
const TRACKING_NAMES = new Set([
  'gclid', 'gclsrc', 'wbraid', 'gbraid', 'dclid', // Google
  'fbclid', 'fbc', 'fbp', // Meta
  'msclkid', // Microsoft
  'ttclid', // TikTok
  'li_fat_id', // LinkedIn
  'mc_eid', 'mc_cid', // Mailchimp
  'irclickid', // Impact
  '_hsenc', '_hsmi', 'hsa_cam', // HubSpot
  'referrer', 'ref', 'source', 'campaign',
]);

/**
 * Pull the hidden tracking params a form captures from its field names. `utm`
 * holds utm_* (campaign attribution); `other` holds known click ids. Pure +
 * order-preserving + de-duplicated. FR-68.
 */
export function detectTrackingParams(fields: Pick<DetectedFormField, 'name'>[]): TrackingParams {
  const utm: string[] = [];
  const other: string[] = [];
  const seen = new Set<string>();
  for (const f of fields) {
    const name = (f.name ?? '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    if (/^utm_[a-z]+/i.test(name)) {
      utm.push(name);
      seen.add(key);
    } else if (TRACKING_NAMES.has(key)) {
      other.push(name);
      seen.add(key);
    }
  }
  return { utm, other };
}

/** Human phrase for how an embed is mounted — for the card copy. */
export function embedKindLabel(kind: EmbedDetection['kind']): string {
  switch (kind) {
    case 'iframe':
      return 'embedded in an iframe';
    case 'script':
      return 'injected by a provider script';
    case 'container':
      return 'mounted into a provider container';
  }
}
