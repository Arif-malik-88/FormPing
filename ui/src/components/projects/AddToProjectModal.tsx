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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-slate-100">Add this URL to a project?</h3>
        <p className="mt-1 text-xs text-slate-400">
          <span className="font-mono text-slate-300 break-all">{url}</span>
        </p>

        {/* Option 1 — add to a project */}
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Add to a client
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Group it under a client — it shows in Projects with its health, dashboard, shareable status
          page, and alerts.
        </p>
        <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/40 p-1.5">
          <ProjectChooser url={url} onAssigned={onClose} />
        </div>

        {/* Options 2 & 3 — not now / never. Styled as clearly-clickable cards. */}
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Or, not now
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            className="group flex flex-col rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2.5 text-left ring-1 ring-inset ring-white/5 transition hover:border-indigo-500/60 hover:bg-slate-800 active:scale-[0.99]"
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-100">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-400">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 00.293.707l2.5 2.5a1 1 0 001.414-1.414L11 9.586V7z" clipRule="evenodd" />
              </svg>
              Decide later
            </span>
            <span className="mt-1 block text-[11px] leading-snug text-slate-400">
              Keeps it in Projects → <strong className="text-slate-300">Unassigned</strong>. Assign or
              dismiss it anytime.
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void dismiss()}
            className="group flex flex-col rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2.5 text-left ring-1 ring-inset ring-white/5 transition hover:border-red-500/60 hover:bg-red-500/10 active:scale-[0.99] disabled:opacity-40"
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-100">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-slate-400 group-hover:text-red-400">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
              </svg>
              Don&apos;t track this URL
            </span>
            <span className="mt-1 block text-[11px] leading-snug text-slate-400">
              Hides it from Projects and <strong className="text-slate-300">stops asking</strong>. Existing
              results stay saved; testing it again brings it back.
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
