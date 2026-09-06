import { test, expect } from '@playwright/test';

/**
 * FR-73 — evidence and honest confidence on the Form Tester report.
 *
 * Hermetic, same approach as tester-multiform: seed a realistic result into the
 * tester's localStorage cache and assert what the report actually renders.
 *
 * What these lock in:
 *  · a screenshot of the matched form is shown, and it is a HOSTED url — the
 *    heavy inline data: image must never reach the browser or its cache;
 *  · the form's page link carries its anchor, so one link lands on the form;
 *  · page-wide bot protection is described as a page fact, NOT as a CAPTCHA
 *    chip on a form that has no widget (the original over-claim);
 *  · a form that DOES carry a widget still gets its CAPTCHA chip;
 *  · a low-confidence match says so instead of reading as a pass.
 */

const SHOT = 'https://cdn.test/form-shots/2026-09/abc.jpg';

const BASE = {
  inputUrl: 'https://ex.test',
  normalizedUrl: 'https://ex.test/',
  mode: 'safe',
  resolvedContactPage: 'https://ex.test/contact/',
  contactPageFound: true,
  contactPageConfidence: 1,
  formFound: true,
  formConfidence: 1,
  formIdentifier: null,
  submissionAttempted: false,
  submissionResult: 'not_attempted',
  redirectUrl: null,
  finalUrl: 'https://ex.test/contact/',
  thankYouDetected: false,
  inlineSuccessDetected: false,
  captchaDetected: false,
  antiBotDetected: false,
  finalStatus: 'warn',
  reasonCode: 'SAFE_MODE_NO_SUBMIT',
  notes: [],
  errors: [],
  durationMs: 4000,
};

/** A whole-site run: the contact form has page-level protection but no widget of
 *  its own; the rental form has a real reCAPTCHA on it. */
const MULTI = {
  ...BASE,
  siteForms: [
    {
      url: 'https://ex.test/contact/', kind: 'contact', about: 'Contact Us', formType: 'native',
      fieldCount: 3,
      fields: [{ label: 'Name', type: 'text' }, { label: 'Email', type: 'email' }, { label: 'Message', type: 'textarea' }],
      security: { captcha: false, pageProtection: true },
      tracking: { utm: [], other: [] }, siteWide: false, seenOn: 1,
      outcome: { state: 'detected', note: 'tested as the primary contact form' },
      hiddenFields: [], anchorId: 'contact-form', shot: SHOT,
    },
    {
      url: 'https://ex.test/rental/', kind: 'other', about: 'Request a Rental', formType: 'native',
      fieldCount: 4,
      fields: [{ label: 'First Name', type: 'text' }, { label: 'Email', type: 'email' }, { label: 'Phone', type: 'tel' }, { label: 'Machine', type: 'text' }],
      security: { captcha: true, pageProtection: true },
      tracking: { utm: [], other: [] }, siteWide: false, seenOn: 1,
      outcome: { state: 'filled', filledCount: 4 }, hiddenFields: [],
    },
  ],
};

/** A landing-page run that matched a stray one-field form — the comingsoon.co
 *  shape. Single form, so the report falls back to the single-result card. */
const WEAK = {
  ...BASE,
  landingPageMode: true,
  finalStatus: 'warn',
  reasonCode: 'LOW_CONFIDENCE_FORM',
  formType: 'native',
  fieldCount: 1,
  fields: [{ label: 'Email', type: 'email' }],
  formConfidenceLevel: 'low',
  lowConfidenceReason: 'the only form here has a single input — that reads like a search box or an email sign-up, not a contact form',
  pageProtection: true,
  formShot: SHOT,
  formAnchorId: 'mc-embedded-subscribe-form',
};

const seed = (result: unknown) => JSON.stringify([result]);

test.describe('FR-73 — evidence on the multi-form report', () => {
  test.beforeEach(async ({ page }) => {
    // Screenshots point at a CDN the e2e env can't reach: serve a 1x1 so the
    // <img> resolves without a real network dependency.
    await page.route(SHOT, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'image/gif',
        body: Buffer.from('R0lGODlhAQABAAAAACw=', 'base64'),
      }),
    );
  });

  test('shows a hosted screenshot, and the page link lands on the form', async ({ page }) => {
    await page.addInitScript((data) => {
      window.localStorage.setItem('fp:tester:results', data);
    }, seed(MULTI));
    await page.goto('/');

    await expect(page.getByText('The form we matched')).toBeVisible();
    const shot = page.getByRole('img', { name: /Screenshot of the/i });
    await expect(shot).toBeVisible();
    // The image must be a hosted URL. An inline data: image would mean the
    // engine's bytes reached the browser — the thing FR-73 deliberately avoids.
    await expect(shot).toHaveAttribute('src', SHOT);

    // The link READS as the clean page address — no machine id in the middle of
    // it — but it carries the form's anchor, so the click lands on the form.
    //
    // Located by its title, NOT by accessible name: getByRole matches names by
    // SUBSTRING, and the screenshot link's alt text contains this same URL, so a
    // name locator matches several links and trips strict mode.
    const link = page.locator('a[title*="scrolled to the form"]');
    await expect(link).toHaveAttribute('href', 'https://ex.test/contact/#contact-form');
    await expect(link).toHaveText('https://ex.test/contact/');
  });

  test('page-wide protection is a page fact, not a CAPTCHA claim on the form', async ({ page }) => {
    await page.addInitScript((data) => {
      window.localStorage.setItem('fp:tester:results', data);
    }, seed(MULTI));
    await page.goto('/');

    // One panel renders at a time, so a count of 0 here means the chip is absent
    // from the contact form. It has NO widget of its own — only the page does.
    await expect(page.getByText('CAPTCHA', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Bot protection on this page/i)).toBeVisible();

    // Form 2 genuinely has one — the chip is still earned there.
    await page.getByRole('tab', { name: /Form 2/ }).click();
    await expect(page.getByText('CAPTCHA', { exact: true })).toBeVisible();
    await expect(page.getByText(/Bot protection on this page/i)).toHaveCount(0);
  });
});

test.describe('FR-73 — a weak match says so', () => {
  test('a single-field match is not sold as a pass', async ({ page }) => {
    await page.route(SHOT, (route) =>
      route.fulfill({ status: 200, contentType: 'image/gif', body: Buffer.from('R0lGODlhAQABAAAAACw=', 'base64') }),
    );
    await page.addInitScript((data) => {
      window.localStorage.setItem('fp:tester:results', data);
    }, seed(WEAK));
    await page.goto('/');

    // The verdict asks rather than claims, and nothing on the card says it
    // filled the form or that it is healthy.
    await expect(page.getByText(/is this your contact form\?/i)).toBeVisible();
    await expect(page.getByText(/single input/i).first()).toBeVisible();
    // Evidence is offered in place of the confident claim, and the clean page
    // link still carries the form's own anchor behind it.
    await expect(page.getByText('The form we matched')).toBeVisible();
    await expect(page.locator('a[title*="scrolled to the form"]')).toHaveAttribute(
      'href',
      'https://ex.test/contact/#mc-embedded-subscribe-form',
    );
  });
});
