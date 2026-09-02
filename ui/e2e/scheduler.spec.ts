import { test, expect } from '@playwright/test';

/**
 * Form Scheduler command bar (FR-63/FR-64). Hermetic — the command bar renders
 * client-side, so no secrets/schedules are needed. Verifies the controls, the
 * per-mode note, the landing helper, and the Safe default.
 */
test.describe('Form Scheduler command bar', () => {
  test('renders the add-monitor controls + explanatory copy', async ({ page }) => {
    await page.goto('/form-watch');

    await expect(page.getByRole('button', { name: 'Add monitor' })).toBeVisible();

    for (const mode of ['Detect', 'Safe', 'Live']) {
      await expect(page.getByRole('button', { name: mode, exact: true })).toBeVisible();
    }

    // Default is Safe (not Live) → its neutral note shows.
    await expect(page.getByText('Safe mode —', { exact: false })).toBeVisible();

    // Whole-site helper under the URL input (landing OFF by default).
    await expect(page.getByText('Each check searches the whole site to find the contact form', { exact: false })).toBeVisible();
  });
});
