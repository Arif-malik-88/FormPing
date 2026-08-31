import { defineConfig } from 'vitest/config';

/**
 * Vitest runs ONLY the engine's unit tests in `tests/`.
 *
 * Without this, Vitest's default glob also matches the web app's Playwright
 * specs (`ui/e2e/*.spec.ts`) and errors — those files use `@playwright/test`,
 * not Vitest. Playwright is scoped separately by `ui/playwright.config.ts`.
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
