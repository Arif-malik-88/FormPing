'use client';

import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot, getServerSnapshot } from '@/lib/toast';

/**
 * Action notice (FR-26) — the "your data is still in Projects" reassurance shown
 * on Clear / Stop / Delete. Pinned CENTER-STAGE to the viewport (FR-32) so it's
 * impossible to miss no matter how far the user scrolled down a long list before
 * acting. The full-screen wrapper is pointer-events-none so it never blocks the
 * page — only the card is interactive. Reads the shared toast store; self-dismisses.
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
            className="fp-toast-in pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border border-indigo-500/40 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 shadow-xl backdrop-blur"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" aria-hidden>
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
