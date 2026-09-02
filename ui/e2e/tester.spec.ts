import { test, expect } from '@playwright/test';

/**
 * Form Tester command bar (FR-63/FR-64). Hermetic — no secrets, no run needed;
 * it exercises the client-rendered controls and the per-mode / landing-page
 * helper copy so a regression in that UI is caught end-to-end.
 */
test.describe('Form Tester command bar', () => {
  test('mode + landing controls and their explanatory copy render', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Run test' })).toBeVisible();

    // The three modes are present.
    for (const mode of ['Detect', 'Safe', 'Live']) {
      await expect(page.getByRole('button', { name: mode, exact: true })).toBeVisible();
    }

    // Default is Safe → its neutral explanatory note shows.
    await expect(page.getByText('Safe mode —', { exact: false })).toBeVisible();

    // Default (landing OFF) → whole-site helper under the URL input.
    await expect(page.getByText('We search the whole site to find the contact form', { exact: false })).toBeVisible();
  });

  test('mode note switches when a different mode is picked', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Detect', exact: true }).click();
    await expect(page.getByText('Detect mode —', { exact: false })).toBeVisible();
  });

  test('landing-page toggle swaps the helper copy', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('switch').first().click();
    await expect(page.getByText('Landing page is on', { exact: false })).toBeVisible();
  });
});
