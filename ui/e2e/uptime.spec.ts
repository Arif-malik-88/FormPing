import { test, expect } from '@playwright/test';
import { expectVisibleText } from './helpers/commandBar';

/**
 * Uptime & SSL command bar (FR-65). Hermetic — the command bar renders
 * client-side, so no secrets/schedules needed. Verifies the controls, the
 * plain helper copy, and the alert note.
 */
test('Uptime command bar renders controls + helper copy', async ({ page }) => {
  await page.goto('/site-watch');
  await expect(page.getByRole('button', { name: 'Add monitor' })).toBeVisible();

  // Frequency presets (Uptime has no test modes).
  for (const preset of ['5 min', 'Hourly', 'Daily']) {
    await expect(page.getByRole('button', { name: preset, exact: true })).toBeVisible();
  }

  await expectVisibleText(
    page,
    'We check that this URL loads and its SSL certificate is valid',
    'only get a Slack alert when something changes',
  );
});
