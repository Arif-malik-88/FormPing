'use client';

import { useEffect, useRef, useState } from 'react';
import { ProjectChooser } from './ProjectChooser';
import { shouldPromptForProject } from '@/lib/projects/membershipClient';

/**
 * Popup shown after a monitor is added in Form/Site Watch: "Add this URL to a
 * project?". Choosing/creating a project = yes. "No, don't track in Projects"
 * records a dismissal so the URL stays out of the Unassigned bucket (the monitor
 * keeps running). "Decide later" just closes — it remains in Unassigned.
 *
 * Self-gating: on open it checks membership and silently closes if the URL is
 * already in a project or was previously dismissed (no flash, no nagging).
 */
export function AddToProjectModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [phase, setPhase] = useState<'checking' | 'ask'>('checking');
  const [busy, setBusy] = useState(false);

  // Keep onClose behind a ref so the membership check runs ONCE per url and
  // isn't torn down + restarted every time the parent re-renders (which passes
  // a fresh onClose). Without this, a caller that mounts the modal mid-stream
  // (Change tracking, prompting while log events flood in) re-runs this effect
  // on every render, cancels each fetch before it resolves, and the modal stays
  // stuck on `checking` → returns null → the popup never appears.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Final gate before showing the prompt. The stores already only queue
  // genuinely-unassigned URLs (FR-23), but re-check here too as a safety net
  // against a stale queue — and, critically, PROMPT ONLY ON POSITIVE
  // CONFIRMATION that the URL is unassigned. On any error we close silently
  // rather than nag: the old code did the opposite (`catch → show popup`), which
  // is why a membership hiccup during the change-tracking stream surfaced an
  // "add to project?" popup for a URL that was already grouped.
  useEffect(() => {
    let alive = true;
    (async () => {
      const promptable = await shouldPromptForProject(url); // fails closed
      if (!alive) return;
      if (promptable) setPhase('ask');
      else onCloseRef.current();
    })();
    return () => {
      alive = false;
    };
  }, [url]);

  async function dismiss() {
    setBusy(true);
    try {
      await fetch('/api/projects/dismissed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
    } catch {
      /* best-effort — closing anyway */
    } finally {
      setBusy(false);
      onClose();
    }
  }

  if (phase === 'checking') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        className="fp-menu-in w-full max-w-[540px] overflow-hidden rounded-2xl border border-line-strong bg-gradient-to-b from-panel-raised to-panel shadow-2xl shadow-black/60"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ transformOrigin: 'center' }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 pb-4 pt-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-soft ring-1 ring-accent/25">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
              <path d="M3 5.5A1.5 1.5 0 014.5 4h3.3a1.5 1.5 0 011.06.44l1 1H15.5A1.5 1.5 0 0117 6.94V9h-1.5a3.5 3.5 0 100 7H4.5A1.5 1.5 0 013 14.5v-9z" />
              <path d="M15.5 10.5a.9.9 0 01.9.9v1.7h1.7a.9.9 0 010 1.8h-1.7v1.7a.9.9 0 01-1.8 0v-1.7h-1.7a.9.9 0 010-1.8h1.7v-1.7a.9.9 0 01.9-.9z" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-bold text-ink">Add this URL to a project?</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Group it under a client to track its health over time, open its dashboard, share a status page, and get Slack alerts.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 shrink-0 rounded-lg p-1 text-ink-faint transition-colors hover:bg-panel hover:text-ink">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
          </button>
        </div>

        {/* Target URL */}
        <div className="mx-5 flex items-center gap-2.5 rounded-lg border border-line bg-ground px-3 py-2.5">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM3.5 10a6.5 6.5 0 0112.06-3.4l-1.7 1.02a1 1 0 00-.46.7l-.28 1.68-1.5.6a1 1 0 00-.62.93v1.02l-1.3.86a1 1 0 00-.44.83v1.6A6.5 6.5 0 013.5 10z" /></svg>
          <span className="truncate font-mono text-xs text-ink-secondary" title={url}>{url}</span>
        </div>

        {/* Add to a client */}
        <p className="px-5 pb-2 pt-4 text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint">Add to a client</p>
        <div className="px-4">
          <ProjectChooser url={url} onAssigned={onClose} />
        </div>

        {/* Or, not now */}
        <div className="mt-4 border-t border-line px-5 py-4">
          <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint">Or, not now</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent/15 px-3 py-2.5 text-xs font-semibold text-accent-soft ring-1 ring-inset ring-accent/25 transition hover:bg-accent/25"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 00.29.71l2.5 2.5a1 1 0 001.42-1.42L11 9.59V7z" clipRule="evenodd" /></svg>
                Decide later
              </button>
              <p className="text-[11px] leading-snug text-ink-faint">Keeps it in <strong className="text-ink-secondary">Unassigned</strong> — assign or dismiss it anytime.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => void dismiss()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-danger/15 px-3 py-2.5 text-xs font-semibold text-danger ring-1 ring-inset ring-danger/25 transition hover:bg-danger/25 disabled:opacity-40"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden><path fillRule="evenodd" d="M13.48 14.89A6 6 0 015.1 6.52l8.38 8.37zm1.41-1.41L6.52 5.1a6 6 0 018.37 8.37zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" /></svg>
                Don&apos;t track this URL
              </button>
              <p className="text-[11px] leading-snug text-ink-faint">Hides it and <strong className="text-ink-secondary">stops asking</strong>. Existing results stay saved.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
