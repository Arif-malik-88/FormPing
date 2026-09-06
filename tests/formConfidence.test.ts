/**
 * FR-73 — the engine must stop presenting a weak match as a confident pass.
 *
 * The bug these pin down: on a page whose only <form> was a stray single input,
 * Landing-page leniency accepted it at a negative score, the runner filled its
 * one field, and Safe mode reported "Form found · 1 field · OK" — a form the
 * user could not see, sold as healthy, with nothing to check it against.
 *
 * Two different failures, so two different answers, and both are pinned here:
 * a single-field match is too weak to fill at all, while a leniency-accepted
 * multi-field form IS still filled (the user asserted the form is on this page)
 * but must never read as green.
 *
 * Pure functions on both sides — the engine helper and the UI verdict — so this
 * runs in the engine's Vitest without the web app's `@/` alias.
 */

import { describe, it, expect } from 'vitest';
import { assessFormConfidence, ownFields } from '../src/runners/formFacts.js';
import { runVerdict } from '../ui/src/lib/formWatch/verdict';

describe('assessFormConfidence', () => {
  it('refuses to fill a single-field form — the comingsoon.co case', () => {
    const c = assessFormConfidence({ score: -30, fieldCount: 1, acceptedByLandingLeniency: true });
    expect(c.level).toBe('low');
    expect(c.tooWeakToFill).toBe(true);
    expect(c.reason).toMatch(/single input/i);
  });

  it('treats a single field as too weak even when the score is fine', () => {
    // A newsletter that happens to score well still isn't something to fill and
    // call healthy — one input is one input.
    const c = assessFormConfidence({ score: 40, fieldCount: 1, acceptedByLandingLeniency: false });
    expect(c.tooWeakToFill).toBe(true);
  });

  it('still fills a leniency-accepted form, but marks it low confidence', () => {
    // FR-28's reason for leniency: on a landing page the user says the form is
    // HERE, so an odd quiz/booking form should still be tested — just not sold
    // as a confident contact-form match.
    const c = assessFormConfidence({ score: -5, fieldCount: 4, acceptedByLandingLeniency: true });
    expect(c.level).toBe('low');
    expect(c.tooWeakToFill).toBe(false);
    expect(c.reason).not.toBe('');
  });

  it('marks a negative score low even outside landing-page mode', () => {
    const c = assessFormConfidence({ score: -20, fieldCount: 3, acceptedByLandingLeniency: false });
    expect(c.level).toBe('low');
    expect(c.tooWeakToFill).toBe(false);
  });

  it('does not judge a multi-step wizard on its field count', () => {
    // A wizard shows one field per step by design — refusing to fill it because
    // step 1 has a single input would break the multi-step support FR-63 added.
    const c = assessFormConfidence({ score: 30, fieldCount: 1, acceptedByLandingLeniency: false, isMultiStep: true });
    expect(c.tooWeakToFill).toBe(false);
    expect(c.level).toBe('high');
  });

  it('leaves a real contact form alone', () => {
    // name + email + textarea + "Send message" — the ordinary case must not
    // regress into a hedged verdict.
    const c = assessFormConfidence({ score: 65, fieldCount: 4, acceptedByLandingLeniency: false });
    expect(c.level).toBe('high');
    expect(c.tooWeakToFill).toBe(false);
    expect(c.reason).toBe('');
  });
});

describe('ownFields — the count matches the form on screen', () => {
  const rental = [
    { label: 'First Name', type: 'text' },
    { label: 'Last Name', type: 'text' },
    { label: 'Company', type: 'text' },
    { label: 'Email', type: 'email' },
    { label: 'Search', type: 'search' }, // the site's header search, swept in
  ];

  it('excludes a site-wide search input swept into another form', () => {
    // Reported from a real run: a rental form with 7 visible boxes said "8 fields".
    expect(ownFields(rental).length).toBe(4);
  });

  it('keeps a SEARCH form\'s own search input', () => {
    // The other direction of the same bug: filter it here and the site's search
    // box reports "0 fields", which is just as wrong.
    expect(ownFields([{ label: 'Search', type: 'search' }], 'search').length).toBe(1);
  });

  it('does not mistake a real field for a search box', () => {
    expect(ownFields([{ label: 'Research budget', type: 'text' }]).length).toBe(1);
  });
});

describe('runVerdict — low confidence never reads as green', () => {
  it('downgrades a safe-mode success to "detected"', () => {
    const v = runVerdict('SAFE_MODE_NO_SUBMIT', true, 'warn', 'low');
    expect(v.level).toBe('detected');
    expect(v.label).toMatch(/not sure/i);
  });

  it('keeps a confident safe-mode success green', () => {
    expect(runVerdict('SAFE_MODE_NO_SUBMIT', true, 'warn', 'high').level).toBe('healthy');
    expect(runVerdict('SAFE_MODE_NO_SUBMIT', true, 'warn').level).toBe('healthy');
  });

  it('downgrades detect-only too', () => {
    expect(runVerdict('DETECT_ONLY', true, undefined, 'low').level).toBe('detected');
    expect(runVerdict('DETECT_ONLY', true).level).toBe('healthy');
  });

  it('classifies LOW_CONFIDENCE_FORM as detected — not broken, not healthy', () => {
    const v = runVerdict('LOW_CONFIDENCE_FORM', true);
    expect(v.level).toBe('detected');
    expect(v.level).not.toBe('failing');
    expect(v.level).not.toBe('healthy');
  });

  it('still fails an error run regardless of confidence', () => {
    expect(runVerdict('ERROR', false, 'error', 'low').level).toBe('failing');
  });
});

describe('runVerdict — a broken backend reads as broken', () => {
  // Seen on a real client site: the form submitted, the site's own /api endpoint
  // answered HTTP 500 (an Astro upgrade had broken it), and the run came back
  // "Validation error" — blaming the data we typed for their server crashing.
  // The engine now prefers the status code; these pin the UI half of that.
  it('classifies SERVER_ERROR as failing, with a plain label', () => {
    const v = runVerdict('SERVER_ERROR', true, 'fail');
    expect(v.level).toBe('failing');
    expect(v.label).toMatch(/server/i);
    expect(v.label).not.toMatch(/validation/i);
  });

  it('does not soften a broken backend just because the match was low-confidence', () => {
    expect(runVerdict('SERVER_ERROR', true, 'fail', 'low').level).toBe('failing');
  });
});
