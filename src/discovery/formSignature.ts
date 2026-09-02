import { loadHtml } from '../utils/dom.js';
import { normalizeText } from '../utils/text.js';

export interface FormSignature {
  score: number;
  signals: string[];
}

interface Field {
  type: string;
  name: string;
  id: string;
  placeholder: string;
  label: string;
}

/**
 * FR-59 — contact-form "signature" scoring on RAW HTML (Cheerio, no browser).
 *
 * The cheap breadth pass: given a page's HTML, decide whether it holds a real
 * contact form based purely on CONTENT — never the URL/slug — so we can find a
 * form on any page (/reach, /lets-talk, the homepage, …). score > 0 = contact
 * form. Mirrors the intent of `src/forms/findContactForm.ts` `scoreForm`, but on
 * static HTML; kept self-contained (own constants) to stay additive + low-risk.
 */
const NEGATIVE_FORM_PATTERNS = [/search/i, /newsletter/i, /subscribe/i];
const NEGATIVE_SUBMIT_PATTERNS = [/subscribe/i, /newsletter/i, /sign\s*up/i, /register/i, /search/i, /log\s*in/i];
const POSITIVE_SUBMIT_PATTERNS = [/^send$/i, /^submit$/i, /send\b[\w\s]{0,20}\bmessage/i, /contact\s+us/i, /get\s+in\s+touch/i, /^send\s+it$/i, /^go$/i, /^submit\s+form$/i, /let'?s\s+(talk|connect|chat)/i, /send\s+(my\s+)?(enquiry|inquiry|request|details)/i];

function blob(f: Field): string {
  return `${f.name} ${f.id} ${f.placeholder} ${f.label}`;
}

function scoreOneForm(fields: Field[], submitText: string, formText: string): FormSignature {
  const signals: string[] = [];
  let score = 0;
  const allText = normalizeText(`${formText} ${submitText}`);

  // ── Negatives ────────────────────────────────────────────────────────────
  for (const pat of NEGATIVE_FORM_PATTERNS) {
    if (pat.test(allText)) { score -= 20; signals.push(`exclusion text: ${pat.source}`); }
  }
  if (fields.some((f) => f.type === 'password')) { score -= 15; signals.push('password field'); }
  const meaningful = fields.filter((f) => f.type !== 'hidden' && f.type !== 'submit');
  if (meaningful.length <= 1) { score -= 10; signals.push('single-field form'); }

  // ── Positives ────────────────────────────────────────────────────────────
  const hasName = fields.some((f) => /name/i.test(blob(f)) && !/(last|sur)name/i.test(`${f.name} ${f.id}`));
  if (hasName) { score += 15; signals.push('name field'); }
  const hasFirst = fields.some((f) => /first.?name|fname/i.test(blob(f)));
  const hasLast = fields.some((f) => /last.?name|lname|surname/i.test(blob(f)));
  if (hasFirst || hasLast) { score += 10; signals.push('first/last name fields'); }
  const hasEmail = fields.some((f) => f.type === 'email' || /email/i.test(blob(f)));
  if (hasEmail) { score += 15; signals.push('email field'); }
  const hasTextarea = fields.some((f) => f.type === 'textarea');
  if (hasTextarea) { score += 20; signals.push('textarea/message field'); }
  const hasPhone = fields.some((f) => f.type === 'tel' || /phone|mobile/i.test(blob(f)));
  if (hasPhone) { score += 5; signals.push('phone field'); }

  // ── Submit intent (type=submit OR submit-like button text — catches SPA) ──
  for (const pat of POSITIVE_SUBMIT_PATTERNS) {
    if (pat.test(submitText)) { score += 15; signals.push(`submit intent: "${submitText}"`); break; }
  }
  for (const pat of NEGATIVE_SUBMIT_PATTERNS) {
    if (pat.test(submitText)) { score -= 20; signals.push(`submit exclusion: "${submitText}"`); break; }
  }

  return { score, signals };
}

/** Score a page's raw HTML for its best contact-form signature. */
export function scoreContactFormSignature(html: string): FormSignature {
  const $ = loadHtml(html);
  const forms = $('form');
  if (forms.length === 0) return { score: 0, signals: ['no <form> tag'] };

  let best: FormSignature = { score: -Infinity, signals: [] };
  forms.each((_, formEl) => {
    const $form = $(formEl);

    const fields: Field[] = $form
      .find('input, textarea, select')
      .map((_i, el) => {
        const $el = $(el);
        const tag = (el.tagName || 'input').toLowerCase();
        const type = ($el.attr('type') || (tag === 'textarea' ? 'textarea' : tag === 'select' ? 'select' : 'text')).toLowerCase();
        const id = $el.attr('id') ?? '';
        let label = '';
        if (id) label = $(`label[for="${id}"]`).first().text().trim();
        if (!label) label = $el.closest('label').text().trim();
        return { type, name: $el.attr('name') ?? '', id, placeholder: $el.attr('placeholder') ?? '', label };
      })
      .get();

    // Include type=button so SPA/JS submits ("Send" with no type=submit) count.
    const submitEls = $form.find('button[type="submit"], input[type="submit"], button:not([type]), button[type="button"]');
    const submitText = submitEls
      .map((_i, el) => {
        const $el = $(el);
        return ($el.text().trim() || $el.attr('value') || '').trim();
      })
      .get()
      .join(' ')
      .trim();

    const s = scoreOneForm(fields, submitText, $form.text());
    if (s.score > best.score) best = s;
  });

  return best;
}
