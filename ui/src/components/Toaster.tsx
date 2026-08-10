'use client';

import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot, getServerSnapshot, dismissToast } from '@/lib/toast';

/**
 * Action notice (FR-26) — the "your data is still in Projects" reassurance shown
 * on Clear / Stop / Delete. Pinned CENTER-STAGE to the viewport (FR-32) so it's
 * impossible to miss no matter how far the user scrolled down a long list before
 * acting. Big text, strong card styling, an icon badge, and a manual close —
 * self-dismisses on a timer too. The full-screen wrapper is pointer-events-none
 * so it never blocks the page; only the card is interactive. Shared toast store.
 */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="flex w-full max-w-lg flex-col items-center gap-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className="fp-toast-in pointer-events-auto flex w-full items-start gap-4 rounded-2xl border border-accent/40 bg-panel/95 px-6 py-5 shadow-2xl ring-1 ring-black/40 backdrop-blur-md"
          >
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 ring-1 ring-accent/30">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 text-accent" aria-hidden>
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </span>
            <p className="min-w-0 flex-1 text-base font-semibold leading-relaxed text-white sm:text-lg">
              {t.message}
            </p>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss"
              className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-panel-raised hover:text-ink"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
