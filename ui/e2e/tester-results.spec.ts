import { test, expect } from '@playwright/test';

/**
 * Form Tester results log (FR-75/FR-76). Hermetic — the multi-form report itself
 * needs run data (deferred to the mocked-SSE fixture follow-up), so this covers
 * the surface that renders WITHOUT a run: the results panel's ready/empty state
 * on load, so a regression in that surface is caught end-to-end.
 */
test.describe('Form Tester results log', () => {
  test('shows the ready / empty state before any run', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Ready to test a contact form')).toBeVisible();
    // The count pills + JSON/clear actions only appear once there are results —
    // the empty surface must not show a confusing "0"/tally.
    await expect(page.getByRole('button', { name: 'Export JSON' })).toHaveCount(0);
  });
});
