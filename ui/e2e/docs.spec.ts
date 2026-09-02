import { test, expect } from '@playwright/test';

/**
 * Docs page smoke (FR-41 + kept current per FR-63/FR-64). Static content, no
 * secrets — proves /docs renders and still documents the Form Tester.
 */
test('docs page loads and documents the Form Tester', async ({ page }) => {
  await page.goto('/docs');
  // Stable plain-text sentence from the Form Tester docs section.
  await expect(
    page.getByText('finds the form even when the contact page has an unusual name', { exact: false }),
  ).toBeVisible();
});
