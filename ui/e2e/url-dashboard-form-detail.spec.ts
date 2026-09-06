import { test, expect } from '@playwright/test';

/**
 * FR-67 — the per-URL dashboard now shows the LAST Form Tester run's detail, not
 * just a pass/fail badge. Hermetic: the dashboard's API needs auth + Supabase
 * (both blanked in e2e), so we intercept it and serve a payload whose internal
 * `tech.form` carries the persisted detail — then assert the panel renders it.
 */

const RAN_AT = '2026-09-06T10:00:00.000Z';

const PAYLOAD = {
  name: 'Test project',
  generatedAt: RAN_AT,
  windowDays: 30,
  overall: 'operational',
  sharedUrl: 'https://ex.test/contact/',
  shareToken: null,
  sites: [
    {
      host: 'ex.test',
      url: 'https://ex.test/contact/',
      state: 'up',
      uptime: { d1: null, d7: null, d30: null },
      uptimeWindowPct: null,
      dailyUptime: [],
      incidents: 0,
      ssl: null,
      formWorking: true,
      lastCheckedAt: RAN_AT,
      tech: {
        url: 'https://ex.test/contact/',
        statusCode: null,
        lastResponseMs: null,
        lastCheckedAt: RAN_AT,
        domainDaysRemaining: null,
        avgResponseMs: null,
        responseTrend: [],
        intervalMs: null,
        form: {
          mode: 'safe',
          level: null,
          label: null,
          lastRunAt: RAN_AT,
          reasonCode: 'SAFE_MODE_NO_SUBMIT',
          durationMs: 98000,
          detail: {
            formType: 'native',
            fieldCount: 3,
            fields: [
              { label: 'Full name', type: 'text' },
              { label: 'Work email', type: 'email' },
              { label: 'Message', type: 'textarea' },
            ],
            isMultiStep: false,
            resolvedPage: 'https://ex.test/contact/',
            captchaDetected: true,
            siteFormsCount: 4,
            forms: [
              { url: 'https://ex.test/contact/', kind: 'contact', about: 'Contact Us', formType: 'native', fieldCount: 3, captcha: true, outcome: 'filled', primary: true },
              { url: 'https://ex.test/rental/', kind: 'contact', about: 'Request a Rental', formType: 'native', fieldCount: 8, captcha: false, outcome: 'filled' },
              { url: 'https://ex.test/book-a-demo/', kind: 'contact', formType: 'native', fieldCount: 5, captcha: false, outcome: 'detected' },
              { url: 'https://ex.test/', kind: 'search', fieldCount: 1, siteWide: true, seenOn: 12, outcome: 'detected' },
            ],
            tracking: { utm: ['utm_source'], other: [] },
          },
        },
      },
    },
  ],
};

test.describe('Per-URL dashboard — Form Tester run detail (FR-67)', () => {
  test('shows what the last run found, not just a badge', async ({ page }) => {
    await page.route('**/api/projects/**/url/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PAYLOAD) }),
    );

    await page.goto('/projects/test-project/url/ex-test-contact');

    await expect(page.getByText('Contact form working')).toBeVisible();
    // Mode + when it ran + how long it took, and the plain FR-64 outcome.
    // 98s renders as "1.6m" — the formatter switches to minutes above 90s.
    await expect(page.getByText(/took 1\.6m/)).toBeVisible();
    await expect(page.getByText(/filled, not submitted/i)).toBeVisible();
    // The chattier copy is intentionally NOT shown here.
    await expect(page.getByText(/Switch to Live mode/i)).toHaveCount(0);

    // EVERY form found is listed, each as its own row headed by its full URL.
    await expect(page.getByText('Forms found (4)')).toBeVisible();
    const rental = page.locator('details').filter({ hasText: 'https://ex.test/rental/' });
    const demo = page.locator('details').filter({ hasText: 'https://ex.test/book-a-demo/' });
    await expect(rental).toBeVisible();
    await expect(demo).toBeVisible();

    // Outcome chips — `exact` so the prose "form filled, not submitted" can't match.
    await expect(page.getByText('Filled', { exact: true })).toHaveCount(2);
    await expect(page.getByText('Detected', { exact: true })).toHaveCount(2);
    await expect(page.getByText('Primary', { exact: true })).toBeVisible();

    // Collapsed by default (a <details> keeps its content in the DOM, so assert
    // VISIBILITY rather than presence), and expands to that form's own facts.
    await expect(rental.getByText('Request a Rental')).toBeHidden();
    await rental.getByText('https://ex.test/rental/').click();
    await expect(rental.getByText('Request a Rental')).toBeVisible();
    await expect(rental.getByText('8 fields')).toBeVisible();
    // FR-73 — we no longer claim the absence of bot protection: an invisible
    // reCAPTCHA leaves nothing to detect, so silence is the honest answer.
    await expect(rental.getByText('No bot protection seen')).toHaveCount(0);
  });
});
