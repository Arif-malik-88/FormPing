'use client';

import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

/**
 * Manage the PUBLIC share link for a SINGLE URL (FR-27) — the per-URL sibling of
 * ShareStatusControl. Generate / copy / regenerate / revoke a `/status/u/<token>`
 * link a client can open with no login. Hidden controls for viewers (canManage).
 */
export function UrlShareControl({
  projectId,
  urlKeyParam,
  initialToken,
  canManage = true,
}: {
  projectId: string;
  /** base64url-encoded canonical url_key (the route segment). */
  urlKeyParam: string;
  initialToken?: string | null;
  canManage?: boolean;
}) {
  const [token, setToken] = useState<string | null>(initialToken ?? null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const base = `/api/projects/${projectId}/url/${urlKeyParam}/share`;
  const url = token && typeof window !== 'undefined' ? `${window.location.origin}/status/u/${token}` : '';

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch(base, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.shareToken) setToken(data.shareToken as string);
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    try {
      const res = await fetch(base, { method: 'DELETE' });
      if (res.ok) setToken(null);
    } finally {
      setBusy(false);
      setConfirmRevoke(false);
    }
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — user can select the text manually */
    }
  }

  if (!token) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3.5">
        <p className="text-xs text-slate-500">
          No public link for this page yet{canManage ? ' — create one to share just this URL’s status.' : '.'}
        </p>
        {canManage && (
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="shrink-0 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            {busy ? 'Creating…' : 'Create link'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Live · anyone with the link can view this page
        </p>
        {canManage && (
          <div className="flex items-center gap-3">
            <button type="button" onClick={generate} disabled={busy} title="Generate a new link and invalidate the old one" className="text-[11px] text-slate-500 hover:text-slate-300 disabled:opacity-40">Regenerate</button>
            <button type="button" onClick={() => setConfirmRevoke(true)} disabled={busy} className="text-[11px] text-slate-500 hover:text-rose-300 disabled:opacity-40">Turn off</button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1.5 font-mono text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <a href={url} target="_blank" rel="noreferrer" className="shrink-0 rounded-md border border-slate-700 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-800">Open</a>
        <button type="button" onClick={copy} className="shrink-0 rounded-md bg-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-600">{copied ? 'Copied ✓' : 'Copy'}</button>
      </div>

      <ConfirmDialog
        open={confirmRevoke}
        variant="danger"
        title="Turn off this page’s public link?"
        confirmLabel="Turn off"
        message={
          <>
            The shared link stops working <strong className="text-slate-300">immediately</strong> — the
            client will see a not-found page. Your monitoring is unaffected, and you can create a new
            link anytime.
          </>
        }
        onConfirm={revoke}
        onCancel={() => setConfirmRevoke(false)}
      />
    </div>
  );
}
