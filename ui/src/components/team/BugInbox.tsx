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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-100">Bug reports</h2>
          <p className="mt-1 text-sm text-slate-400">
            Submitted from the footer’s <strong className="text-slate-300">Report a bug</strong> form.
            {openCount > 0 ? <> <strong className="text-amber-300">{openCount} open</strong>.</> : ' All clear. 🎉'}
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900/60 p-0.5">
          {(['all', 'open', 'resolved'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                filter === f ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:text-slate-300'
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
        <div className="mt-4 rounded-lg border border-rose-800/50 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300">
          Couldn’t load bug reports. <button onClick={() => { setState('loading'); void load(); }} className="underline">Try again</button>
        </div>
      )}
      {state === 'ready' && shown.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-slate-800 px-4 py-10 text-center text-sm text-slate-500">
          {filter === 'all' ? 'No bug reports yet.' : `No ${filter} reports.`}
        </p>
      )}

      {state === 'ready' && shown.length > 0 && (
        <div className="mt-4 space-y-2.5">
          {shown.map((r) => {
            const isBusy = busy === r.id;
            const resolved = r.status === 'resolved';
            return (
              <div key={r.id} className={`rounded-xl border p-4 ${resolved ? 'border-slate-800 bg-slate-900/30' : 'border-slate-800 bg-slate-900/60'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                      resolved ? 'bg-emerald-500/12 text-emerald-300 ring-emerald-500/25' : 'bg-amber-500/12 text-amber-300 ring-amber-500/25'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${resolved ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      {r.status}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void setStatus(r, resolved ? 'open' : 'resolved')}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100 disabled:opacity-40"
                    >
                      {isBusy ? '…' : resolved ? 'Reopen' : 'Mark resolved'}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setConfirmDelete(r)}
                      title="Delete this report"
                      className="rounded-md border border-slate-700 bg-slate-900 p-1.5 text-slate-500 transition-colors hover:border-rose-800/60 hover:text-rose-300 disabled:opacity-40"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                </div>

                <p className="mt-2.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">{r.message}</p>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="text-slate-400">{r.name || 'Anonymous'}</span>
                  {r.email && <span className="font-mono text-slate-500">{r.email}</span>}
                  {r.page && <span>· on <span className="font-mono text-slate-400">{r.page}</span></span>}
                  <span>· {rel(r.createdAt)}</span>
                  {r.reporter && r.reporter !== r.email && <span>· signed in as <span className="font-mono">{r.reporter}</span></span>}
                  {resolved && r.resolvedBy && <span className="text-emerald-300/80">· resolved by {r.resolvedBy}</span>}
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
