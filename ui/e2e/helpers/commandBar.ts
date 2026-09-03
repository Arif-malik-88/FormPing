import { expect, type Page } from '@playwright/test';

/**
 * Shared e2e helpers for the command-bar specs (Tester, Scheduler, Uptime,
 * Content Changes). Keeps the repeated assertions in ONE place so a markup or
 * copy change is a single edit, not N spec edits. FR-65.
 */

/** The three test modes rendered as buttons on the Form Tester + Scheduler bars. */
export async function expectModeButtons(page: Page): Promise<void> {
  for (const mode of ['Detect', 'Safe', 'Live']) {
    await expect(page.getByRole('button', { name: mode, exact: true })).toBeVisible();
  }
}

/** Assert each (partial) text snippet is visible — the helper / note / mode copy. */
export async function expectVisibleText(page: Page, ...snippets: string[]): Promise<void> {
  for (const s of snippets) {
    await expect(page.getByText(s, { exact: false })).toBeVisible();
  }
}
