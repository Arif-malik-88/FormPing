'use client';

import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot, getServerSnapshot } from '@/lib/toast';

/**
 * Inline, in-context action notice (FR-26). Rendered at the TOP OF THE CONTENT on
 * each tool page — right where the user just Cleared results or Stopped a monitor
 * — so the "your data is still in Projects" reassurance appears in their sight,
 * not in a far corner. Reads the shared toast store; self-dismisses.
 */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (toasts.length === 0) return null;

  return (
    <div className="mb-5 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="fp-toast-in flex items-start gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm text-slate-100 shadow-sm"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" aria-hidden>
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
