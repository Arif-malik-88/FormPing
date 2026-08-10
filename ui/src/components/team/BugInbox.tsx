'use client';

import { useCallback, useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type BugStatus = 'open' | 'resolved';
interface BugReport {
  id: string;
  name: string | null;
  email: string | null;
  message: string;
  page: string | null;
  reporter: string | null;
  status: BugStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}
type Filter = 'all' | 'open' | 'resolved';

function rel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Admin bug-report inbox (FR-31). Lives on the Team page (admin+ only, same gate).
 * Lists every report, lets an admin resolve / reopen, and hard-delete (confirmed).
 */
export function BugInbox() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BugReport | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/bug-reports', { cache: 'no-store' });
      if (!res.ok) return setState('error');
      const data = await res.json();
      setReports(Array.isArray(data?.reports) ? data.reports : []);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function setStatus(r: BugReport, status: BugStatus) {
    setBusy(r.id);
    try {
      const res = await fetch('/api/bug-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.id, status }),
      });
      if (res.ok) await load();
    } finally {
      setBusy(null);
    }
  }
  async function doDelete(r: BugReport) {
    setBusy(r.id);
    try {
      const res = await fetch('/api/bug-reports', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.id }),
      });
      if (res.ok) await load();
    } finally {
      setBusy(null);
      setConfirmDelete(null);
    }
  }

  const openCount = reports.filter((r) => r.status === 'open').length;
  const shown = reports.filter((r) => (filter === 'all' ? true : r.status === filter));

  return (
    <section className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink">Bug reports</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Sent from the footer’s <strong className="text-ink-secondary">Report a bug</strong> form.
            {openCount > 0 ? <> <strong className="text-warn">{openCount} open</strong>.</> : ' All clear. 🎉'}
          </p>
        </div>
        <div className="inline-flex rounded-xl bg-panel/70 p-1 ring-1 ring-line">
          {(['all', 'open', 'resolved'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                filter === f ? 'bg-gradient-to-b from-accent to-accent-strong text-white shadow-sm shadow-accent-deep/40 ring-1 ring-accent-soft/20' : 'text-ink-muted hover:bg-panel hover:text-ink'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {state === 'loading' && (
        <div className="mt-4 space-y-2">{[0, 1].map((i) => <div key={i} className="fp-skeleton h-20 rounded-xl" />)}</div>
      )}
      {state === 'error' && (
        <div className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-xs text-danger">
          Couldn’t load bug reports. <button onClick={() => { setState('loading'); void load(); }} className="underline">Try again</button>
        </div>
      )}
      {state === 'ready' && shown.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-muted">
          {filter === 'all' ? 'No bug reports yet.' : `No ${filter} reports.`}
        </p>
      )}

      {state === 'ready' && shown.length > 0 && (
        <div className="mt-4 space-y-2.5">
          {shown.map((r) => {
            const isBusy = busy === r.id;
            const resolved = r.status === 'resolved';
            return (
              <div key={r.id} className={`rounded-xl border border-line p-4 ${resolved ? 'bg-panel/30' : 'bg-panel/60'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                      resolved ? 'bg-ok/12 text-ok ring-ok/25' : 'bg-warn/12 text-warn ring-warn/25'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${resolved ? 'bg-ok' : 'bg-warn'}`} />
                      {r.status}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void setStatus(r, resolved ? 'open' : 'resolved')}
                      className="rounded-md border border-line-strong bg-panel px-2.5 py-1 text-[11px] font-semibold text-ink-secondary transition-colors hover:border-ink-faint hover:text-ink disabled:opacity-40"
                    >
                      {isBusy ? '…' : resolved ? 'Reopen' : 'Mark resolved'}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setConfirmDelete(r)}
                      title="Delete this report"
                      className="rounded-md border border-line-strong bg-panel p-1.5 text-ink-faint transition-colors hover:border-danger/60 hover:text-danger disabled:opacity-40"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                </div>

                <p className="mt-2.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{r.message}</p>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
                  <span className="text-ink-muted">{r.name || 'Anonymous'}</span>
                  {r.email && <span className="font-mono text-ink-faint">{r.email}</span>}
                  {r.page && <span>· on <span className="font-mono text-ink-muted">{r.page}</span></span>}
                  <span>· {rel(r.createdAt)}</span>
                  {r.reporter && r.reporter !== r.email && <span>· signed in as <span className="font-mono">{r.reporter}</span></span>}
                  {resolved && r.resolvedBy && <span className="text-ok/80">· resolved by {r.resolvedBy}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        variant="danger"
        title="Delete this bug report?"
        confirmLabel="Delete report"
        message={<>This permanently removes the report from the backend. It can’t be undone — but bug reports are disposable, so that’s fine once it’s handled.</>}
        onConfirm={() => { if (confirmDelete) return doDelete(confirmDelete); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </section>
  );
}
