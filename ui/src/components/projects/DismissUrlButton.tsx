'use client';

import { useState } from 'react';

/**
 * "Dismiss" — hide a URL from the Unassigned bucket. Records a dismissal (POST
 * /api/projects/dismissed) so the URL leaves Projects and stops being prompted.
 * Labelled "Dismiss" (NOT "Delete") on purpose: it is intentionally NON-destructive
 * — a Form/Site Watch schedule keeps running and is managed in its own tab; this
 * only removes the URL's presence in Projects. Re-testing the URL, or adding a
 * monitor, un-dismisses it. Across the app "Delete" is reserved for the destructive
 * purge (project delete / per-URL delete); this hide must never wear that word.
 */
export function DismissUrlButton({ url, onDone }: { url: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);

  async function dismiss() {
    setBusy(true);
    try {
      await fetch('/api/projects/dismissed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      onDone();
    } catch {
      /* best-effort */
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void dismiss()}
      disabled={busy}
      title="Hide this URL from Projects. It's not deleted — any monitor keeps running (manage it in its Forms/Site tab), and re-testing brings it back."
      className="inline-flex items-center gap-1 rounded-md border border-line-strong bg-ground/50 px-2 py-1 text-[11px] font-medium text-ink-muted hover:text-ink hover:border-ink-faint transition-colors disabled:opacity-40"
    >
      {busy ? 'Dismissing…' : 'Dismiss'}
    </button>
  );
}
