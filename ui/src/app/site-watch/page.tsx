'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SiteCard } from '@/components/siteWatch/SiteCard';
import { SiteWatchCommandBar, type Unit } from '@/components/siteWatch/SiteWatchCommandBar';
import { AddToProjectModal } from '@/components/projects/AddToProjectModal';
import { ReadOnlyBanner } from '@/components/ReadOnlyBanner';
import { PageHeader, Skeleton } from '@/components/ui';
import type { SiteSchedule } from '@/lib/siteWatch/types';

const UNIT_TO_MIN: Record<Unit, number> = { min: 1, hour: 60, day: 1440 };

export default function SiteWatchPage() {
  const [schedules, setSchedules] = useState<SiteSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const [url, setUrl] = useState('');
  const [amount, setAmount] = useState(5);
  const [unit, setUnit] = useState<Unit>('min');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const pollHold = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/site-watch').then((r) => r.json());
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

  const submit = useCallback(
    async (force: boolean) => {
      setError(null);
      let target = url.trim();
      if (!target) { setError('Enter a URL'); return; }
      if (!/^https?:\/\//i.test(target)) target = `https://${target}`;
      try { new URL(target); } catch { setError('That doesn’t look like a valid URL'); return; }
      setAdding(true);
      try {
        const intervalMinutes = Math.max(1, amount) * UNIT_TO_MIN[unit];
        const res = await fetch('/api/site-watch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: target, intervalMinutes, force }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 422 && data?.needsConfirm) {
          setError(data.error || 'This URL appears to be down right now.');
          setNeedsConfirm(true);
          return;
        }
        if (!res.ok) { setError(data?.error || 'Could not add monitor'); setNeedsConfirm(false); return; }
        setUrl('');
        setNeedsConfirm(false);
        setJustAdded(target);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Request failed');
      } finally {
        setAdding(false);
      }
    },
    [url, amount, unit, load],
  );

  // API only — the card shows the in-place "stopped, kept in Projects" note.
  const handleStop = useCallback(async (id: string) => {
    await fetch('/api/site-watch/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  }, []);

  const handleTogglePause = useCallback(
    async (id: string, paused: boolean) => {
      await fetch('/api/site-watch/pause', {
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

  const setUrlClearErr = (v: string) => { setUrl(v); setNeedsConfirm(false); setError(null); };

  return (
    <>
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8">
        <PageHeader
          title="Uptime & SSL"
          description="Monitor site availability and SSL / domain expiry on a schedule. Get a Slack alert when a site goes down or comes back, and a warning weeks before a certificate expires."
        />
        <div className="mt-5">
          <ReadOnlyBanner />
        </div>

        <div className="mt-5">
          <SiteWatchCommandBar
            url={url}
            onUrl={setUrlClearErr}
            amount={amount}
            onAmount={setAmount}
            unit={unit}
            onUnit={setUnit}
            onSubmit={submit}
            adding={adding}
            error={error}
            needsConfirm={needsConfirm}
          />
        </div>

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
              <span className="text-xs font-medium text-ok">Monitoring {schedules.length} site{schedules.length === 1 ? '' : 's'} automatically</span>
            </div>
          )}

          {!loading && schedules.length === 0 && (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-panel/40 px-8 py-14 text-center">
              <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
                <span className="absolute inline-flex h-11 w-11 animate-ping rounded-full bg-accent/15 [animation-duration:2.2s] motion-reduce:animate-none" aria-hidden />
                <span className="absolute h-14 w-14 rounded-full border border-accent/15" aria-hidden />
                <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-panel-raised text-accent-soft ring-1 ring-line-strong">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden><path d="M2.5 10a7.5 7.5 0 1115 0 7.5 7.5 0 01-15 0zm7.5-5a.75.75 0 01.75.75v4l2.6 1.55a.75.75 0 01-.77 1.3l-2.95-1.77A.75.75 0 019.25 10V5.75A.75.75 0 0110 5z" /></svg>
                </span>
              </div>
              <p className="text-sm font-semibold text-ink">No sites are being monitored yet</p>
              <p className="mt-1 text-xs text-ink-muted">Add a URL above to start watching uptime & SSL.</p>
            </div>
          )}

          {!loading &&
            schedules.map((s) => (
              <SiteCard key={s.id} schedule={s} onStop={handleStop} onTogglePause={handleTogglePause} onDone={load} onHold={holdPoll} />
            ))}
        </div>
      </main>

      {justAdded && <AddToProjectModal url={justAdded} onClose={() => setJustAdded(null)} />}
    </>
  );
}
