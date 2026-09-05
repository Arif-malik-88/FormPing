/**
 * Per-form "Submit a live test" (FR-76).
 *
 * Sends a real live submission for ONE detected form by running the existing
 * `/api/run` pipeline in **live + landing-page** mode against that form's own
 * source URL — landing-page mode tests the form on the exact URL, so no new
 * endpoint or engine path is needed. Reuses all the submit-detection, CAPTCHA
 * and anti-bot honesty of a normal run.
 *
 * Isolated from the main tester run store: this resolves the single final
 * SiteResult so the caller can show the outcome on that one form's panel,
 * without touching the results list.
 *
 * v1 limitation: if two lead forms share a page, landing-page mode submits the
 * strongest-scoring one — precise per-form targeting by identifier is a follow-up.
 */

import type { SiteResult, RunConfig, SSEEvent } from '@/types';

export async function submitLiveTest(url: string, config: RunConfig): Promise<SiteResult | null> {
  const response = await fetch('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Force live + landing-page for this one URL, whatever the command bar is set to.
    body: JSON.stringify({ urls: [url], ...config, mode: 'live', landingPage: true }),
  });
  if (!response.ok || !response.body) return null;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: SiteResult | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const event = JSON.parse(line.slice(6)) as SSEEvent;
        if (event.type === 'result') result = event.result;
      } catch {
        /* malformed SSE line — skip */
      }
    }
  }
  return result;
}
