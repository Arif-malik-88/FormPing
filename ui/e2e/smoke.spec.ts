import { test, expect } from '@playwright/test';

/**
 * Smoke test (FR-58): the app boots and the home page renders.
 *
 * Deliberately minimal — it proves the whole stack comes up (Next.js serves,
 * the page hydrates) without needing any secrets. It asserts on stable anchors:
 * the document title and the Form Tester header copy from `app/page.tsx`.
 */
test('home page loads and shows the Form Tester', async ({ page }) => {
  await page.goto('/');

  // Title comes from app/layout.tsx metadata.
  await expect(page).toHaveTitle(/FormPing/);

  // Unique line rendered by the Form Tester page header.
  await expect(
    page.getByText('Point it at any contact form', { exact: false }),
  ).toBeVisible();
});
