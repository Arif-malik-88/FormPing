import type { DetectedFormField, FormCandidate } from '../types.js';
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

/** User-fillable fields only (drops hidden/submit/button/…). */
export function meaningfulFields(fields: DetectedFormField[]): DetectedFormField[] {
  return fields.filter((f) => !NON_INPUT_TYPES.has(f.type.toLowerCase()));
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
