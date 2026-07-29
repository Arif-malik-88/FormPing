'use client';

import { useEffect, useState } from 'react';
import { useMe } from '@/lib/auth/useMe';

/**
 * "Report a bug" form (footer). Collects name, email and the issue, and POSTs to
 * /api/bug-reports, which stores it and pings Slack so Tajamul sees it right away.
 * Name/email prefill from the signed-in user but stay editable.
 */
export function BugReportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useMe();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Prefill from the logged-in user when the modal opens.
  useEffect(() => {
    if (open) {
      setName(me.name ?? '');
      setEmail(me.email ?? '');
      setMessage('');
      setError(null);
      setDone(false);
    }
  }, [open, me.name, me.email]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!message.trim()) {
      setError('Please describe the issue.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          page: typeof window !== 'undefined' ? window.location.pathname : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Could not send your report. Please try again.');
        return;
      }
      setDone(true);
    } catch {
      setError('Network error — could not send. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const input =
    'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-40';
  const label = 'mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onMouseDown={() => !busy && onClose()}>
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        {done ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6" aria-hidden><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L9 11.58l6.3-6.3a1 1 0 011.4 0z" clipRule="evenodd" /></svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-100">Thanks — we got it</h3>
            <p className="mt-1 text-xs text-slate-400">Your report was sent. We&apos;ll take a look.</p>
            <button type="button" onClick={onClose} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h3 className="text-sm font-semibold text-slate-100">Report a bug</h3>
            <p className="mt-1 text-xs text-slate-400">Tell us what went wrong — it goes straight to the team.</p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" disabled={busy} className={input} />
              </div>
              <div>
                <label className={label}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@apexure.com" disabled={busy} className={input} />
              </div>
            </div>
            <div className="mt-3">
              <label className={label}>What happened?</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Describe the bug — what you did, what you expected, what happened." disabled={busy} className={input} autoFocus />
            </div>

            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40">
                Cancel
              </button>
              <button type="submit" disabled={busy || message.trim().length === 0} className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40">
                {busy ? 'Sending…' : 'Send report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
