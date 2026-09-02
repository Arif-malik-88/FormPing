'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ScheduleCard } from '@/components/formWatch/ScheduleCard';
import { SchedulerCommandBar } from '@/components/formWatch/SchedulerCommandBar';
import { AddToProjectModal } from '@/components/projects/AddToProjectModal';
import { ReadOnlyBanner } from '@/components/ReadOnlyBanner';
import { PageHeader, Skeleton } from '@/components/ui';
import type { FormSchedule, FormWatchMode } from '@/lib/formWatch/types';

export default function FormWatchPage() {
  const [schedules, setSchedules] = useState<FormSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const [url, setUrl] = useState('');
  const [days, setDays] = useState(3);
  // Default to Safe — Live submits a real message on EVERY scheduled run, which
  // is a dangerous default. The user opts into Live deliberately. FR-64.
  const [mode, setMode] = useState<FormWatchMode>('safe');
  const [landingPage, setLandingPage] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  // While a card is showing its in-place "stopped" confirmation, hold the poll so
  // a background refresh doesn't yank the card (and its message) out from under it.
  const pollHold = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/form-watch').then((r) => r.json());
      setSchedules(Array.isArray(res?.schedules) ? res.schedules : []);
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => { if (pollHold.current === 0) void load(); }, 15000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    try {
      const prefill = new URLSearchParams(window.location.search).get('url');
      if (prefill) setUrl(prefill);
    } catch { /* ignore */ }
  }, []);

  const handleAdd = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      let target = url.trim();
      if (!target) { setError('Enter a URL'); return; }
      if (!/^https?:\/\//i.test(target)) target = `https://${target}`;
      try { new URL(target); } catch { setError('That doesn’t look like a valid URL'); return; }
      setAdding(true);
      try {
        const res = await fetch('/api/form-watch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: target, intervalDays: days, mode, landingPage }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { setError(data?.error || 'Could not add schedule'); return; }
        setUrl('');
        setLandingPage(false);
        setJustAdded(target);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Request failed');
      } finally {
        setAdding(false);
      }
    },
    [url, days, mode, landingPage, load],
  );

  // API only — the card shows the in-place "stopped, kept in Projects" note, then
  // calls reload() itself when it's done (so the message stays at that card).
  const handleStop = useCallback(async (id: string) => {
    await fetch('/api/form-watch/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  }, []);

  const handleTogglePause = useCallback(
    async (id: string, paused: boolean) => {
      await fetch('/api/form-watch/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, paused }),
      });
      await load();
    },
    [load],
  );

  const holdPoll = useCallback((active: boolean) => {
    pollHold.current = Math.max(0, pollHold.current + (active ? 1 : -1));
  }, []);

  return (
    <>
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8">
        <PageHeader
          title="Form Scheduler"
          description="Automatically re-test contact forms on a schedule. Each run checks form health, detects changes, and sends a Slack alert with the URL."
        />
        <div className="mt-5">
          <ReadOnlyBanner />
        </div>

        {/* Add-monitor command bar */}
        <div className="mt-5">
          <SchedulerCommandBar
            url={url}
            onUrl={setUrl}
            days={days}
            onDays={setDays}
            mode={mode}
            onMode={setMode}
            landingPage={landingPage}
            onLanding={setLandingPage}
            onAdd={handleAdd}
            adding={adding}
            error={error}
          />
        </div>

        {/* Monitors — the full-width stage */}
        <div className="mt-6 space-y-3">
          {loading && (
            [0, 1].map((i) => (
              <div key={i} className="rounded-xl border border-line bg-panel/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-2.5 w-56" /></div>
                  <div className="flex gap-2"><Skeleton className="h-8 w-16 rounded-md" /><Skeleton className="h-8 w-16 rounded-md" /></div>
                </div>
              </div>
            ))
          )}

          {!loading && schedules.length > 0 && (
            <div className="flex items-center gap-2.5 rounded-lg border border-ok/25 bg-ok/10 px-3.5 py-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ok" />
              </span>
              <span className="text-xs font-medium text-ok">
                Scheduler running — automatically watching {schedules.length} form{schedules.length === 1 ? '' : 's'}
              </span>
            </div>
          )}

          {!loading && schedules.length === 0 && (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-panel/40 px-8 py-14 text-center">
              <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
                <span className="absolute inline-flex h-11 w-11 animate-ping rounded-full bg-accent/15 [animation-duration:2.2s] motion-reduce:animate-none" aria-hidden />
                <span className="absolute h-14 w-14 rounded-full border border-accent/15" aria-hidden />
                <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-panel-raised text-accent-soft ring-1 ring-line-strong">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 4a1 1 0 10-2 0v4a1 1 0 00.4.8l3 2.2a1 1 0 101.2-1.6L11 9.5V6z" /></svg>
                </span>
              </div>
              <p className="text-sm font-semibold text-ink">No forms are being watched yet</p>
              <p className="mt-1 text-xs text-ink-muted">Add a URL above to start monitoring on a schedule.</p>
            </div>
          )}

          {!loading &&
            schedules.map((s) => (
              <ScheduleCard key={s.id} schedule={s} onStop={handleStop} onTogglePause={handleTogglePause} onDone={load} onHold={holdPoll} />
            ))}
        </div>
      </main>

      {justAdded && <AddToProjectModal url={justAdded} onClose={() => setJustAdded(null)} />}
    </>
  );
}
