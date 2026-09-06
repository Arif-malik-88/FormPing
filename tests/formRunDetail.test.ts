/**
 * FR-67 — the raw SiteResult → stored `detail` mapping. This is the guard the FR
 * asks for: if the engine's result shape changes, these tests fail instead of the
 * dashboard silently losing fields again.
 *
 * `formRunDetail.ts` is deliberately import-free so it can be unit-tested here
 * (the web app has no Vitest of its own).
 */

import { describe, it, expect } from 'vitest';
import { extractFormRunDetail } from '../ui/src/lib/formRunDetail';

describe('extractFormRunDetail — nothing the engine computes gets dropped', () => {
  it('carries the full set of rich facts through', () => {
    const raw = {
      formType: 'native',
      fieldCount: 3,
      fields: [
        { label: 'Name', type: 'text' },
        { label: 'Email', type: 'email' },
        { label: 'Message', type: 'textarea' },
      ],
      isMultiStep: false,
      resolvedContactPage: 'https://ex.test/contact/',
      landingPageMode: false,
      submissionAttempted: true,
      submissionResult: 'success',
      thankYouDetected: true,
      captchaDetected: false,
      tracking: { utm: ['utm_source'], other: ['gclid'] },
      formsOnPage: { total: 3 },
      siteForms: [{}, {}, {}],
      notes: ['Contact form detected.'],
      errors: [],
    };
    const d = extractFormRunDetail(raw);
    expect(d.formType).toBe('native');
    expect(d.fieldCount).toBe(3);
    expect(d.fields).toEqual([
      { label: 'Name', type: 'text' },
      { label: 'Email', type: 'email' },
      { label: 'Message', type: 'textarea' },
    ]);
    expect(d.isMultiStep).toBe(false);
    expect(d.resolvedPage).toBe('https://ex.test/contact/');
    expect(d.submissionAttempted).toBe(true);
    expect(d.submissionResult).toBe('success');
    expect(d.thankYouDetected).toBe(true);
    expect(d.tracking).toEqual({ utm: ['utm_source'], other: ['gclid'] });
    expect(d.formsOnPageTotal).toBe(3);
    expect(d.siteFormsCount).toBe(3);
    expect(d.notes).toEqual(['Contact form detected.']);
  });

  it('lists every form found, with what we did to each', () => {
    const d = extractFormRunDetail({
      mode: 'safe',
      formFound: true,
      resolvedContactPage: 'https://ex.test/contact-us/',
      siteForms: [
        {
          url: 'https://ex.test/rental/', kind: 'contact', about: 'Request a Rental', formType: 'native',
          fieldCount: 8, security: { captcha: false }, siteWide: false, seenOn: 1,
          tracking: { utm: ['utm_source'], other: [] }, outcome: { state: 'filled' },
        },
        { url: 'https://ex.test/contact-us/', kind: 'contact', fieldCount: 7, outcome: { state: 'detected' } },
        { url: 'https://ex.test/', kind: 'search', fieldCount: 1, siteWide: true, seenOn: 12, outcome: { state: 'detected' } },
      ],
    });
    expect(d.siteFormsCount).toBe(3);
    expect(d.forms).toHaveLength(3);
    // Per-form facts are kept so the dashboard can reproduce the tester's panel.
    expect(d.forms?.[0]).toEqual({
      url: 'https://ex.test/rental/', kind: 'contact', about: 'Request a Rental', formType: 'native',
      fieldCount: 8, captcha: false, siteWide: false, seenOn: 1, utm: ['utm_source'], outcome: 'filled',
    });
    expect(d.forms?.[2]?.siteWide).toBe(true);
    expect(d.forms?.[2]?.seenOn).toBe(12);
    // The PRIMARY contact form is recorded as "detected" by the inventory (the main
    // run fills it) — we report what the run actually did instead of under-claiming.
    expect(d.forms?.[1]?.outcome).toBe('filled');
    expect(d.forms?.[1]?.primary).toBe(true);
    expect(d.forms?.[2]?.outcome).toBe('detected');
    expect(d.forms?.[2]?.primary).toBeUndefined();
  });

  it('marks the primary form submitted on a live run', () => {
    const d = extractFormRunDetail({
      mode: 'live',
      formFound: true,
      submissionAttempted: true,
      resolvedContactPage: 'https://ex.test/contact/',
      siteForms: [{ url: 'https://ex.test/contact/', kind: 'contact', outcome: { state: 'detected' } }],
    });
    expect(d.forms?.[0]?.outcome).toBe('submitted');
  });

  it('drops forms with no URL and tolerates junk entries', () => {
    const d = extractFormRunDetail({ siteForms: [{ kind: 'contact' }, null, 'nope', { url: 'https://ex.test/a', kind: 'other' }] });
    expect(d.forms).toEqual([{ url: 'https://ex.test/a', kind: 'other', outcome: 'detected' }]);
  });

  it('keeps third-party embed facts (provider + kind)', () => {
    const d = extractFormRunDetail({ formType: 'third-party', embedProvider: 'Typeform', embedKind: 'iframe' });
    expect(d.formType).toBe('third-party');
    expect(d.embedProvider).toBe('Typeform');
    expect(d.embedKind).toBe('iframe');
  });

  it('is defensive — junk in, empty object out (never throws)', () => {
    expect(extractFormRunDetail(null)).toEqual({});
    expect(extractFormRunDetail(undefined)).toEqual({});
    expect(extractFormRunDetail('nope')).toEqual({});
    expect(extractFormRunDetail(42)).toEqual({});
  });

  it('drops values of the wrong type rather than storing garbage', () => {
    const d = extractFormRunDetail({
      formType: 'bogus',
      fieldCount: 'three',
      isMultiStep: 'yes',
      embedKind: 'carrier-pigeon',
      notes: 'not-an-array',
    });
    expect(d.formType).toBeUndefined();
    expect(d.fieldCount).toBeUndefined();
    expect(d.isMultiStep).toBeUndefined();
    expect(d.embedKind).toBeUndefined();
    expect(d.notes).toBeUndefined();
  });

  it('skips malformed field entries but keeps the good ones', () => {
    const d = extractFormRunDetail({ fields: [{ label: 'Email', type: 'email' }, null, 'nope', {}] });
    expect(d.fields).toEqual([{ label: 'Email', type: 'email' }]);
  });

  it('omits empty collections instead of storing noise', () => {
    const d = extractFormRunDetail({ notes: [], errors: [], fields: [] });
    expect(d.notes).toBeUndefined();
    expect(d.errors).toBeUndefined();
    expect(d.fields).toBeUndefined();
  });
});
