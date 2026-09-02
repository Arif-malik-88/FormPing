import type { Page } from 'playwright';
import type { AppConfig, FormCandidate, FormIdentifier } from '../types.js';
import { normalizeText } from '../utils/text.js';
import { logger } from '../utils/logger.js';
import { detectEmbeds, type EmbedDetection } from './detectEmbeds.js';

// Patterns that indicate this is NOT a contact form
const NEGATIVE_SUBMIT_PATTERNS = [/subscribe/i, /newsletter/i, /sign\s*up/i, /register/i, /search/i, /login/i, /log\s*in/i];
const NEGATIVE_FORM_PATTERNS = [/search/i, /newsletter/i, /subscribe/i];

// Positive submit button patterns
const POSITIVE_SUBMIT_PATTERNS = [/^send$/i, /^submit$/i, /send\b[\w\s]{0,20}\bmessage/i, /contact\s+us/i, /get\s+in\s+touch/i, /^send\s+it$/i, /^go$/i, /^submit\s+form$/i, /let'?s\s+(talk|connect|chat)/i, /send\s+(my\s+)?(enquiry|inquiry|request|details)/i];

interface FormInfo {
  index: number;
  id: string | null;
  name: string | null;
  action: string | null;
  method: string | null;
  fields: FieldInfo[];
  submitText: string;
  allText: string;
  /** False when the form is inside a display:none / visibility:hidden / zero-size
   *  container — e.g. a step of a multi-step widget that's revealed on "Next"
   *  (FR-62). Kept (not filtered out) so a hidden-but-real contact form is still
   *  detected; visibility is weighed at selection time. */
  visible: boolean;
}

interface FieldInfo {
  type: string;
  name: string;
  id: string;
  placeholder: string;
  label: string;
}

/**
 * Extract form metadata from the page via Playwright.
 * Returns serializable data so we can score without browser coupling.
 */
async function extractForms(page: Page): Promise<FormInfo[]> {
  return page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll('form'));
    return forms.map((form, index) => {
      const inputs = Array.from(form.querySelectorAll('input, textarea, select'));
      const fields = inputs.map((el) => {
        const input = el as HTMLInputElement;
        const id = input.id || '';
        // Try to find associated label
        let label = '';
        if (id) {
          const lbl = document.querySelector(`label[for="${id}"]`);
          if (lbl) label = lbl.textContent?.trim() ?? '';
        }
        if (!label) {
          const closest = input.closest('label') ?? input.parentElement?.querySelector('label');
          label = closest?.textContent?.trim() ?? '';
        }
        return {
          type: input.type || el.tagName.toLowerCase(),
          name: input.name || '',
          id,
          placeholder: input.placeholder || '',
          label,
        };
      });

      const submitEls = Array.from(
        form.querySelectorAll('button[type="submit"], input[type="submit"], button:not([type])')
      );
      const submitText = submitEls.map((el) => el.textContent?.trim() ?? (el as HTMLInputElement).value ?? '').join(' ').trim();

      // Visibility: walk ancestors for display:none / visibility:hidden, then
      // check the bounding box for "rendered but zero-size" cases.
      //
      // We deliberately do NOT exclude on opacity. An opacity:0 ancestor is
      // still laid out and fully interactable — Playwright ignores opacity for
      // actionability, so a form we'd fill is one we must also detect. Crucially,
      // opacity-based scroll-reveal animations (AOS, framer-motion, ".reveal")
      // sit at opacity:0 until scrolled into view and frequently never fire in
      // headless automation; excluding them silently dropped real contact forms
      // (e.g. a "Send message" form inside `.reveal` scored ~65 yet was reported
      // "No contact form found"). Keep display:none / visibility:hidden (those
      // genuinely remove the element and block interaction) and zero-size. FR-28.
      let formVisible = true;
      let ancestor: Element | null = form;
      while (ancestor && ancestor !== document.body) {
        const s = window.getComputedStyle(ancestor);
        if (s.display === 'none' || s.visibility === 'hidden') {
          formVisible = false;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      if (formVisible) {
        const rect = form.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) formVisible = false;
      }

      return {
        index,
        id: form.id || null,
        name: form.getAttribute('name'),
        action: form.getAttribute('action'),
        method: form.getAttribute('method')?.toLowerCase() ?? 'get',
        fields,
        submitText,
        allText: form.textContent?.slice(0, 500) ?? '',
        visible: formVisible,
      };
    });
    // FR-62: return ALL forms (including hidden ones — multi-step steps sit at
    // display:none until revealed). Selection in findContactForm weighs `visible`.
  }) as Promise<FormInfo[]>;
}

function scoreForm(form: FormInfo): { score: number; signals: string[]; negativeSignals: string[] } {
  const signals: string[] = [];
  const negativeSignals: string[] = [];
  let score = 0;

  const allText = normalizeText(form.allText + ' ' + form.submitText);

  // Negative: clear non-contact patterns
  for (const pat of NEGATIVE_FORM_PATTERNS) {
    if (pat.test(allText)) {
      score -= 20;
      negativeSignals.push(`form text matches exclusion: ${pat.source}`);
    }
  }

  // Negative: password field
  if (form.fields.some((f) => f.type === 'password')) {
    score -= 15;
    negativeSignals.push('password field present');
  }

  // Negative: only single email field (likely newsletter)
  if (form.fields.filter((f) => f.type !== 'hidden' && f.type !== 'submit').length <= 1) {
    score -= 10;
    negativeSignals.push('single-field form');
  }

  // Positive: name field
  const hasName = form.fields.some(
    (f) =>
      /name/i.test(f.name + f.id + f.placeholder + f.label) &&
      !/(last|sur)name/i.test(f.name + f.id)
  );
  if (hasName) { score += 15; signals.push('name field'); }

  // Positive: first/last name fields
  const hasFirstName = form.fields.some((f) => /first.?name|fname/i.test(f.name + f.id + f.placeholder + f.label));
  const hasLastName = form.fields.some((f) => /last.?name|lname|surname/i.test(f.name + f.id + f.placeholder + f.label));
  if (hasFirstName || hasLastName) { score += 10; signals.push('first/last name fields'); }

  // Positive: email field
  const hasEmail = form.fields.some((f) => f.type === 'email' || /email/i.test(f.name + f.id + f.placeholder + f.label));
  if (hasEmail) { score += 15; signals.push('email field'); }

  // Positive: textarea / message field
  const hasTextarea = form.fields.some((f) => f.type === 'textarea');
  if (hasTextarea) { score += 20; signals.push('textarea/message field'); }

  // Positive: phone field
  const hasPhone = form.fields.some((f) => f.type === 'tel' || /phone|mobile/i.test(f.name + f.id + f.placeholder + f.label));
  if (hasPhone) { score += 5; signals.push('phone field'); }

  // Positive: submit button text
  for (const pat of POSITIVE_SUBMIT_PATTERNS) {
    if (pat.test(form.submitText)) {
      score += 15;
      signals.push(`submit button: "${form.submitText}"`);
      break;
    }
  }

  // Negative: negative submit text
  for (const pat of NEGATIVE_SUBMIT_PATTERNS) {
    if (pat.test(form.submitText)) {
      score -= 20;
      negativeSignals.push(`submit text exclusion: "${form.submitText}"`);
      break;
    }
  }

  return { score, signals, negativeSignals };
}

export interface FindContactFormResult {
  form: FormCandidate | null;
  allForms: FormCandidate[];
  usedAiFallback: boolean;
  /** Third-party embed form providers detected on the page (Typeform, HubSpot,
   *  …). Populated regardless of whether a native form was found, so the caller
   *  can report an embed even when `form` is null (FR-28). */
  embeds: EmbedDetection[];
  /** True when `form` was accepted only because we're in landing-page mode and
   *  the user asserted the form is on this page — i.e. it scored below the
   *  contact-form threshold but was taken anyway (FR-28). */
  acceptedByLandingLeniency: boolean;
  /** True when the accepted form sits inside a hidden multi-step widget (a
   *  display:none step revealed via "Next"). It's DETECTED, but the runner should
   *  not attempt a blind fill in safe/live mode — stepping through is Phase 2 (FR-62). */
  hiddenMultiStep: boolean;
}

export async function findContactForm(
  page: Page,
  config: AppConfig,
): Promise<FindContactFormResult> {
  const rawForms = await extractForms(page);
  logger.debug(`Found ${rawForms.length} visible form(s) on contact page`);

  // Detect hosted/third-party embed forms (Typeform, HubSpot, …) up front so
  // every return path can report them — including the "no native form" case,
  // where an embed is the whole story (FR-28).
  const embeds = await detectEmbeds(page);
  if (embeds.length) {
    logger.debug(`Third-party embed(s) detected: ${embeds.map((e) => e.provider).join(', ')}`);
  }

  const scored: FormCandidate[] = rawForms.map((form) => {
    const { score, signals, negativeSignals } = scoreForm(form);
    const identifier: FormIdentifier = {
      id: form.id,
      name: form.name,
      action: form.action,
      method: form.method,
    };
    return { index: form.index, identifier, score, signals, negativeSignals };
  });

  scored.sort((a, b) => b.score - a.score);

  // FR-62: prefer a VISIBLE form. A hidden form (a multi-step step sitting at
  // display:none until "Next" is clicked) is only taken when it clearly signals a
  // contact form, so we never pick up stray hidden/junk forms.
  const visById = new Map(rawForms.map((f) => [f.index, f.visible]));
  const isVisible = (c: FormCandidate) => visById.get(c.index) === true;
  const HIDDEN_ACCEPT_MIN = 25;

  let usedAiFallback = false;
  const bestOverall = scored[0];
  let best = scored.find(isVisible);
  if ((!best || best.score < 0) && bestOverall && !isVisible(bestOverall) && bestOverall.score >= HIDDEN_ACCEPT_MIN) {
    best = bestOverall;
  }

  // AI rescue path: deterministic scoring rejected every form. Before giving
  // up, ask the AI to look at all forms (with their fields) and decide if any
  // is actually the contact form. Only fires when AI is configured.
  if ((!best || best.score < 0) && config.aiProvider !== 'off' && rawForms.length > 0) {
    const { rescueContactForm } = await import('../ai/aiClassifier.js');
    const rescueInput = rawForms.slice(0, 8).map((f) => ({
      index: f.index,
      fields: f.fields.map((field) => ({
        name: field.name,
        type: field.type,
        label: field.label,
      })),
      submitText: f.submitText,
      identifier: [f.id, f.name].filter(Boolean).join('/') || '(no id/name)',
    }));
    const rescue = await rescueContactForm(rescueInput, page.url(), config.aiProvider);
    if (rescue) {
      const picked = scored.find((f) => f.index === rescue.chosenIndex);
      if (picked) {
        usedAiFallback = true;
        logger.info(`AI rescue (${rescue.provider}) picked form index=${picked.index}: ${rescue.reasoning}`);
        return {
          form: { ...picked, signals: [...picked.signals, `AI rescue: ${rescue.reasoning}`] },
          allForms: scored,
          usedAiFallback,
          embeds,
          acceptedByLandingLeniency: false,
          hiddenMultiStep: !isVisible(picked),
        };
      }
    }
  }

  if (!best || best.score < 0) {
    // Landing-page leniency (FR-28): the user asserted "the form is on THIS
    // page", so accept the best-scoring form — visible OR a hidden multi-step one
    // (FR-62) — even below the contact-form threshold. Non-landing runs keep the
    // strict threshold (auto-discovery, so precision matters).
    if (config.landingPage && bestOverall) {
      const hidden = !isVisible(bestOverall);
      logger.debug(`Landing-page leniency: accepting form index=${bestOverall.index} score=${bestOverall.score}${hidden ? ' (hidden/multi-step)' : ''} (below threshold)`);
      return {
        form: {
          ...bestOverall,
          signals: [
            ...bestOverall.signals,
            'accepted in landing-page mode (below contact-form threshold)',
            ...(hidden ? ['hidden/multi-step form (revealed via steps)'] : []),
          ],
        },
        allForms: scored,
        usedAiFallback,
        embeds,
        acceptedByLandingLeniency: true,
        hiddenMultiStep: hidden,
      };
    }
    return { form: null, allForms: scored, usedAiFallback, embeds, acceptedByLandingLeniency: false, hiddenMultiStep: false };
  }

  // If ambiguous (two forms within 5 points) and AI is enabled, fall back to AI
  let chosen = best;
  if (scored.length >= 2 && scored[1]!.score >= best.score - 5 && config.aiProvider !== 'off') {
    const { pickContactForm } = await import('../ai/aiClassifier.js');
    const pageUrl = page.url();
    const choice = await pickContactForm(scored.slice(0, 5), pageUrl, config.aiProvider);
    if (choice) {
      const picked = scored.find((f) => f.index === choice.chosenIndex);
      if (picked) {
        usedAiFallback = true;
        chosen = picked;
        logger.info(`AI (${choice.provider}) picked form index=${picked.index}: ${choice.reasoning}`);
      }
    }
  }

  const chosenHidden = !isVisible(chosen);
  logger.debug(`Best form: index=${chosen.index} score=${chosen.score}${chosenHidden ? ' (hidden/multi-step)' : ''} signals=[${chosen.signals.join(', ')}]`);
  return {
    form: chosenHidden
      ? { ...chosen, signals: [...chosen.signals, 'hidden/multi-step form (revealed via steps)'] }
      : chosen,
    allForms: scored,
    usedAiFallback,
    embeds,
    acceptedByLandingLeniency: false,
    hiddenMultiStep: chosenHidden,
  };
}
