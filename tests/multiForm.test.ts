/**
 * FR-68 — when a page has several forms, describe them honestly: classify what
 * each is FOR, and summarise "N forms on this page" without noise on single-form
 * pages. Both functions are pure (no DOM), so they're unit-tested here.
 */

import { describe, it, expect } from 'vitest';
import { classifyFormKind, buildFormsOnPage, meaningfulFields, detectTrackingParams } from '../src/runners/formFacts';
import type { FormCandidate, FormIdentifier } from '../src/types';
import type { EmbedDetection } from '../src/forms/detectEmbeds';

const f = (type: string, extra: Partial<{ name: string; placeholder: string; label: string }> = {}) => ({ type, ...extra });
const ident = (id: string | null = null): FormIdentifier => ({ id, name: null, action: null, method: 'post' });

describe('classifyFormKind', () => {
  it('a password field means login', () => {
    expect(classifyFormKind({ fields: [f('email'), f('password')] })).toBe('login');
  });

  it('a search input means search', () => {
    expect(classifyFormKind({ fields: [f('search')] })).toBe('search');
    expect(classifyFormKind({ fields: [f('text')], submitText: 'Search' })).toBe('search');
  });

  it('a lone email input is a newsletter', () => {
    expect(classifyFormKind({ fields: [f('email')] })).toBe('newsletter');
  });

  it('subscribe/newsletter wording is a newsletter', () => {
    expect(classifyFormKind({ fields: [f('email'), f('text')], submitText: 'Subscribe' })).toBe('newsletter');
    expect(classifyFormKind({ fields: [f('email')], allText: 'Join our newsletter' })).toBe('newsletter');
  });

  it('email + message (or name) is a contact form', () => {
    expect(classifyFormKind({ fields: [f('email'), f('textarea')] })).toBe('contact');
    expect(classifyFormKind({ fields: [f('email'), f('text', { name: 'full_name' })] })).toBe('contact');
  });

  it('falls back to other when nothing matches', () => {
    expect(classifyFormKind({ fields: [f('text', { name: 'coupon' })] })).toBe('other');
  });

  it('a login form with a username named field still classifies as login (password wins)', () => {
    expect(classifyFormKind({ fields: [f('text', { name: 'username' }), f('password')] })).toBe('login');
  });
});

describe('meaningfulFields — the ONE accurate counter', () => {
  it('drops hidden / submit / button fields', () => {
    const fields = [
      { label: 'Email', type: 'email' },
      { label: '', type: 'hidden', name: 'csrf' },
      { label: 'Send', type: 'submit' },
    ];
    expect(meaningfulFields(fields).length).toBe(1);
  });

  it('collapses a radio group (same name) into ONE field', () => {
    const fields = [
      { label: 'How did you hear about us?', type: 'radio', name: 'source' },
      { label: 'Google', type: 'radio', name: 'source' },
      { label: 'Friend', type: 'radio', name: 'source' },
    ];
    expect(meaningfulFields(fields).length).toBe(1);
  });

  it('collapses a checkbox group but keeps a separate group distinct', () => {
    const fields = [
      { label: 'Topic A', type: 'checkbox', name: 'topics' },
      { label: 'Topic B', type: 'checkbox', name: 'topics' },
      { label: 'Agree to terms', type: 'checkbox', name: 'consent' },
    ];
    expect(meaningfulFields(fields).length).toBe(2);
  });

  it('counts a realistic contact form accurately (name + email + message + a radio group)', () => {
    const fields = [
      { label: 'Name', type: 'text', name: 'name' },
      { label: 'Email', type: 'email', name: 'email' },
      { label: 'Message', type: 'textarea', name: 'message' },
      { label: 'Budget: low', type: 'radio', name: 'budget' },
      { label: 'Budget: high', type: 'radio', name: 'budget' },
      { label: '', type: 'hidden', name: '_token' },
    ];
    expect(meaningfulFields(fields).length).toBe(4); // was 6 before the fix
  });

  it('keeps un-named radios individually (cannot group without a name)', () => {
    const fields = [
      { label: 'A', type: 'radio' },
      { label: 'B', type: 'radio' },
    ];
    expect(meaningfulFields(fields).length).toBe(2);
  });
});

describe('detectTrackingParams', () => {
  const byName = (...names: string[]) => names.map((name) => ({ name }));

  it('picks out utm_* params, in order, de-duplicated', () => {
    const t = detectTrackingParams(byName('name', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_source', 'email'));
    expect(t.utm).toEqual(['utm_source', 'utm_medium', 'utm_campaign']);
  });

  it('separates known click ids (gclid/fbclid) from utm', () => {
    const t = detectTrackingParams(byName('utm_source', 'gclid', 'fbclid', 'message'));
    expect(t.utm).toEqual(['utm_source']);
    expect(t.other).toEqual(['gclid', 'fbclid']);
  });

  it('returns empty arrays when the form captures no tracking params', () => {
    const t = detectTrackingParams(byName('name', 'email', 'message'));
    expect(t.utm).toEqual([]);
    expect(t.other).toEqual([]);
  });

  it('ignores fields with no name', () => {
    expect(detectTrackingParams([{ name: undefined }, { name: '' }]).utm).toEqual([]);
  });
});

const cand = (index: number, kind: FormCandidate['kind'], fields: { label: string; type: string }[], id?: string) =>
  ({ index, identifier: ident(id ?? null), kind, fields });

describe('buildFormsOnPage', () => {
  it('returns null for a single-form page (no "1 form" noise)', () => {
    expect(buildFormsOnPage([cand(0, 'contact', [{ label: 'Email', type: 'email' }])], [], 0)).toBeNull();
  });

  it('summarises a native form + a third-party embed', () => {
    const embeds: EmbedDetection[] = [{ provider: 'Typeform', kind: 'iframe', detail: '…' }];
    const out = buildFormsOnPage([cand(0, 'contact', [{ label: 'Email', type: 'email' }])], embeds, 0)!;
    expect(out.total).toBe(2);
    expect(out.native).toBe(1);
    expect(out.embeds).toBe(1);
    expect(out.tested).toEqual({ kind: 'contact', identifier: ident(null) });
    expect(out.others).toEqual([{ kind: 'third-party', identifier: null, provider: 'Typeform' }]);
    expect(out.multipleContacts).toBe(false);
  });

  it('lists the OTHER forms (contact tested; newsletter + search alongside)', () => {
    const forms = [
      cand(0, 'contact', [{ label: 'Email', type: 'email' }, { label: 'Message', type: 'textarea' }], 'contact-form'),
      cand(1, 'newsletter', [{ label: 'Email', type: 'email' }], 'mc-embed'),
      cand(2, 'search', [{ label: '', type: 'search' }]),
    ];
    const out = buildFormsOnPage(forms, [], 0)!;
    expect(out.total).toBe(3);
    expect(out.tested!.kind).toBe('contact');
    expect(out.others.map((o) => o.kind)).toEqual(['newsletter', 'search']);
    expect(out.others[0]!.fieldCount).toBe(1);
    expect(out.multipleContacts).toBe(false);
  });

  it('flags ambiguity when 2+ forms look like contact forms', () => {
    const forms = [
      cand(0, 'contact', [{ label: 'Email', type: 'email' }, { label: 'Message', type: 'textarea' }]),
      cand(1, 'contact', [{ label: 'Email', type: 'email' }, { label: 'Name', type: 'text' }]),
    ];
    expect(buildFormsOnPage(forms, [], 0)!.multipleContacts).toBe(true);
  });

  it('drops hidden/submit fields from the other-form field count', () => {
    const forms = [
      cand(0, 'contact', [{ label: 'Email', type: 'email' }]),
      cand(1, 'newsletter', [{ label: 'Email', type: 'email' }, { label: '', type: 'hidden' }, { label: 'Go', type: 'submit' }]),
    ];
    const out = buildFormsOnPage(forms, [], 0)!;
    expect(out.others[0]!.fieldCount).toBe(1);
  });

  it('carries each other form\'s location through to the summary', () => {
    const forms = [
      cand(0, 'contact', [{ label: 'Email', type: 'email' }, { label: 'Message', type: 'textarea' }]),
      { ...cand(1, 'newsletter', [{ label: 'Email', type: 'email' }]), location: { landmark: 'footer', anchorId: 'mc-embed' } },
    ];
    const out = buildFormsOnPage(forms, [], 0)!;
    expect(out.others[0]!.location).toEqual({ landmark: 'footer', anchorId: 'mc-embed' });
  });
});
