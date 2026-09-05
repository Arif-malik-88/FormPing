import { test, expect } from '@playwright/test';

/**
 * Form Tester multi-form results log (FR-75/FR-76). Hermetic — instead of running
 * the engine (which the e2e env can't), we SEED a realistic multi-form live result
 * into the tester's localStorage cache (the page hydrates from it on load). That
 * renders the real report so we cover: summary + tabs + per-form panels, the
 * auto-submitted primary note, the per-form "Submit a live test" flow (confirm →
 * outcome, with /api/run mocked), the hidden-marketing-fields disclosure, and the
 * absence of the dropped "No CAPTCHA" claim.
 */

const RESULT = {
  inputUrl: 'https://ex.test',
  normalizedUrl: 'https://ex.test/',
  mode: 'live',
  resolvedContactPage: 'https://ex.test/contact/',
  contactPageFound: true,
  contactPageConfidence: 1,
  formFound: true,
  formConfidence: 1,
  formIdentifier: null,
  submissionAttempted: true,
  submissionResult: 'success',
  redirectUrl: null,
  finalUrl: 'https://ex.test/contact/',
  thankYouDetected: true,
  inlineSuccessDetected: false,
  captchaDetected: false,
  antiBotDetected: false,
  finalStatus: 'pass',
  reasonCode: 'THANK_YOU_REDIRECT',
  notes: [],
  errors: [],
  durationMs: 5000,
  siteForms: [
    {
      url: 'https://ex.test/contact/', kind: 'contact', about: 'Contact Us', formType: 'native',
      fieldCount: 3, fields: [{ label: 'Name', type: 'text' }, { label: 'Email', type: 'email' }, { label: 'Message', type: 'textarea' }],
      security: { captcha: false }, tracking: { utm: [], other: [] }, siteWide: false, seenOn: 1,
      outcome: { state: 'detected', note: 'tested as the primary contact form' }, hiddenFields: [],
    },
    {
      url: 'https://ex.test/rental/', kind: 'other', about: 'Request a Rental', formType: 'native',
      fieldCount: 5, fields: [{ label: 'First Name', type: 'text' }, { label: 'Email', type: 'email' }, { label: 'Company', type: 'text' }, { label: 'Phone', type: 'tel' }, { label: 'Machine', type: 'text' }],
      security: { captcha: false }, tracking: { utm: ['utm_source'], other: ['gclid'] }, siteWide: false, seenOn: 1,
      outcome: { state: 'filled', filledCount: 5 },
      hiddenFields: [{ name: 'utm_source', value: 'google' }, { name: 'gclid', value: 'abc123' }],
    },
    {
      url: 'https://ex.test/', kind: 'search', about: '', formType: 'native',
      fieldCount: 1, fields: [{ label: 'Search', type: 'search' }],
      security: { captcha: false }, tracking: { utm: [], other: [] }, siteWide: true, seenOn: 5,
      outcome: { state: 'detected' }, hiddenFields: [],
    },
  ],
};

// A mocked /api/run SSE for the per-form live submit click.
const SUBMITTED_SSE =
  `data: ${JSON.stringify({ type: 'result', result: { ...RESULT, siteForms: undefined } })}\n\n` +
  `data: ${JSON.stringify({ type: 'done', exitCode: 0 })}\n\n`;

test.describe('Form Tester — multi-form report + per-form live submit', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((data) => {
      window.localStorage.setItem('fp:tester:results', data);
    }, JSON.stringify([RESULT]));
  });

  test('renders the summary, tabs and the primary auto-submit note', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('forms found')).toBeVisible();
    await expect(page.getByRole('tab', { name: /Form 1/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Form 2/ })).toBeVisible();
    // Primary contact form leads, auto-submitted by Live mode.
    await expect(page.getByText(/Submitted automatically/i)).toBeVisible();
    // "No CAPTCHA" was dropped — it must not appear anywhere.
    await expect(page.getByText('No CAPTCHA')).toHaveCount(0);
  });

  test('a non-primary lead form shows hidden marketing fields + the submit flow', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /Form 2/ }).click();

    // Hidden marketing fields disclosure (utm_source + gclid), not framework noise.
    await expect(page.getByText(/Hidden marketing fields/i)).toBeVisible();

    // The opt-in per-form live submit → confirm dialog → real outcome.
    await page.route('**/api/run', (route) =>
      route.fulfill({ status: 200, contentType: 'text/event-stream', body: SUBMITTED_SSE }),
    );
    await page.getByRole('button', { name: 'Submit a live test' }).click();
    await expect(page.getByText('Send a real test submission?')).toBeVisible();
    await page.getByRole('button', { name: 'Submit live test' }).click();
    // The real outcome lands on this form's panel.
    await expect(page.getByText(/thank-you page reached/i)).toBeVisible();
  });
});
