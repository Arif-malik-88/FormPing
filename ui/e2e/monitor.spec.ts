import { test, expect } from '@playwright/test';
import { expectVisibleText } from './helpers/commandBar';

/**
 * Content Changes command bar (FR-65). Hermetic — renders client-side, no
 * secrets needed. Verifies the modes, the Snapshot default + its note, and the
 * helper copy.
 */
test('Content Changes command bar renders modes + Snapshot default copy', async ({ page }) => {
  await page.goto('/monitor');

  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible();
  for (const mode of ['Snapshot', 'Compare', 'Watch']) {
    await expect(page.getByRole('button', { name: mode, exact: true })).toBeVisible();
  }

  // Defaults to Snapshot → its note; plus the helper under the URL input.
  await expectVisibleText(
    page,
    'Snapshot mode — saves a baseline of the site now',
    'We scan this site’s pages and track their content, SEO, forms and scripts',
  );
});
