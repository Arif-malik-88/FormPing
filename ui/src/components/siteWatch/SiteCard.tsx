'use client';

import { useEffect, useRef, useState } from 'react';
import type { SiteSchedule, SiteCheckRecord, UptimeClass } from '@/lib/siteWatch/types';
import { TrendBar, type TrendTone } from '@/components/TrendBar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cx, KeptNotice } from '@/components/ui';

const UPTIME_STYLE: Record<UptimeClass | 'pending', { dot: string; text: string; label: string }> = {
  up: { dot: 'bg-ok', text: 'text-ok', label: 'Up' },
  down: { dot: 'bg-danger', text: 'text-danger', label: 'Down' },
  blocked: { dot: 'bg-warn', text: 'text-warn', label: 'Reachable (challenged)' },
  pending: { dot: 'bg-idle', text: 'text-ink-muted', label: 'Pending first check' },
};

function expiryStyle(days: number | null, valid: boolean | undefined, kind: 'SSL' | 'Domain'): { text: string; label: string } {
  if (valid === false || days == null) return { text: 'text-ink-faint', label: `${kind}: n/a` };
  if (days <= 0) return { text: 'text-danger', label: `${kind} expired` };
  if (days <= 7) return { text: 'text-danger', label: `${kind} expires in ${days}d` };
  if (days <= 30) return { text: 'text-warn', label: `${kind}: ${days}d left` };
  return { text: 'text-ok', label: `${kind}: ${days}d left` };
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hrs = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  const unit = days >= 1 ? `${days}d` : hrs >= 1 ? `${hrs}h` : `${mins}m`;
  return diff >= 0 ? `in ${unit}` : `${unit} ago`;
}
function intervalLabel(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `every ${mins}m`;
  if (mins < 1440) return `every ${Math.round(mins / 60)}h`;
  return `every ${Math.round(mins / 1440)}d`;
}

export function SiteCard({
  schedule,
  onStop,
  onTogglePause,
  onDone,
  onHold,
}: {
  schedule: SiteSchedule;
  onStop: (id: string) => Promise<void>;
  onTogglePause: (id: string, paused: boolean) => Promise<void>;
  onDone: () => void;
  onHold: (active: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [checks, setChecks] = useState<SiteCheckRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [justStopped, setJustStopped] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holding = useRef(false);

  const up: UptimeClass | 'pending' = schedule.lastClassification ?? 'pending';
  const u = UPTIME_STYLE[up];
  const ssl = expiryStyle(schedule.lastSslDaysRemaining ?? null, schedule.lastSslValid, 'SSL');
  const domain = expiryStyle(schedule.lastDomainDaysRemaining ?? null, schedule.lastDomainValid, 'Domain');

  async function loadChecks() {
    setLoading(true);
    try {
      const res = await fetch(`/api/site-watch/results?id=${encodeURIComponent(schedule.id)}`, { cache: 'no-store' }).then((r) => r.json());
      setChecks(Array.isArray(res?.checks) ? res.checks : []);
    } catch {
      setChecks([]);
    } finally {
      setLoading(false);
    }
  }
  function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (next) void loadChecks();
  }
  useEffect(() => {
    void loadChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule.lastCheckedAt]);

  useEffect(() => () => { if (holding.current) onHold(false); if (timer.current) clearTimeout(timer.current); }, [onHold]);

  const recent = (checks ?? []).slice(0, 12).reverse();
  const upCount = recent.filter((c) => c.uptime.classification !== 'down').length;
  const uptimePct = recent.length ? Math.round((upCount / recent.length) * 100) : null;
  const trendTones: TrendTone[] = recent.map((c) => (c.uptime.classification === 'up' ? 'emerald' : c.uptime.classification === 'blocked' ? 'amber' : 'red'));

  function finish() {
    if (timer.current) clearTimeout(timer.current);
    if (holding.current) { holding.current = false; onHold(false); }
    onDone();
  }
  async function doStop() {
    setStopping(true);
    try { await onStop(schedule.id); } finally { setStopping(false); }
    setConfirmStop(false);
    holding.current = true;
    onHold(true);
    setJustStopped(true);
    timer.current = setTimeout(finish, 7000);
  }
  async function handlePause() {
    setPausing(true);
    try { await onTogglePause(schedule.id, !schedule.paused); } finally { setPausing(false); }
  }

  if (justStopped) {
    return <KeptNotice title="Stopped — its last results are kept in Projects" subtitle={schedule.url} onDismiss={finish} />;
  }

  return (
    <div className={cx('rounded-xl border bg-panel/60', schedule.paused ? 'border-dashed border-line-strong' : 'border-line')}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className={cx('inline-flex items-center gap-1.5 text-xs font-semibold', u.text)}>
                <span className={cx('h-2 w-2 rounded-full', u.dot)} />
                {u.label}
              </span>
              {up !== 'pending' && schedule.lastResponseMs != null && <span className="text-[11px] text-ink-faint">{schedule.lastResponseMs}ms</span>}
              <span className={cx('text-[11px] font-medium', ssl.text)}>{ssl.label}</span>
              <span className={cx('text-[11px] font-medium', domain.text)}>{domain.label}</span>
              {schedule.paused && <span className="rounded bg-panel-raised px-1.5 py-0.5 text-[11px] font-medium text-ink-muted ring-1 ring-line-strong">Paused</span>}
            </div>
            <a href={schedule.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-ink hover:text-accent-soft" title={schedule.url}>
              {schedule.url}
            </a>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-faint">
              <span>{intervalLabel(schedule.intervalMs)}</span>
              <span>checked {relativeTime(schedule.lastCheckedAt)}</span>
              <span>next {relativeTime(schedule.nextCheckAt)}</span>
              {uptimePct != null && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-ink-muted">{uptimePct}% up</span>
                  <TrendBar tones={trendTones} title={`last ${trendTones.length} checks`} />
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={handlePause} disabled={pausing} className="rounded-md border border-line-strong px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-panel hover:text-ink disabled:opacity-40">
              {pausing ? '…' : schedule.paused ? 'Resume' : 'Pause'}
            </button>
            <button type="button" onClick={() => setConfirmStop(true)} disabled={stopping} title="Stops watching this URL and clears its check history here. Its result stays in Projects. Use Pause to keep it." className="rounded-md border border-danger/40 px-2.5 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-40">
              {stopping ? 'Stopping…' : 'Stop'}
            </button>
          </div>
        </div>

        {schedule.paused && (
          <p className="mt-2.5 rounded-md border border-line bg-panel-raised px-3 py-2 text-[11px] text-ink-muted">
            Paused — not checking right now. Its last results stay in Projects; hit <strong className="text-ink-secondary">Resume</strong> to start again.
          </p>
        )}

        <button type="button" onClick={toggle} className="mt-3 text-xs font-medium text-ink-muted transition-colors hover:text-ink">
          {expanded ? '▾ Hide check history' : '▸ View check history'}
        </button>
      </div>

      {expanded && (
        <div className="space-y-2 border-t border-line p-4">
          {loading && <div className="space-y-2"><div className="fp-skeleton h-11 rounded-lg" /><div className="fp-skeleton h-11 rounded-lg" /></div>}
          {!loading && checks && checks.length === 0 && <p className="text-xs text-ink-faint">No checks yet — they appear after the first run.</p>}
          {!loading && checks && checks.slice(0, 40).map((c, i) => <CheckRow key={`${c.checkedAt}-${i}`} check={c} />)}
        </div>
      )}

      <ConfirmDialog
        open={confirmStop}
        variant="danger"
        title="Stop this uptime & SSL monitor?"
        confirmLabel="Stop monitor"
        message={
          <>
            Stops watching <span className="break-all font-mono text-slate-300">{schedule.url}</span> and clears its check history here.{' '}
            <strong className="text-slate-300">Its result stays in Projects</strong> — only deleting the project removes it. Want to keep it? Use <strong className="text-slate-300">Pause</strong>.
          </>
        }
        onConfirm={doStop}
        onCancel={() => setConfirmStop(false)}
      />
    </div>
  );
}

function Field({ label, value, valueClass = 'text-ink-secondary' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="text-[11px]">
      <span className="text-ink-faint">{label}: </span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

function CheckRow({ check }: { check: SiteCheckRecord }) {
  const u = UPTIME_STYLE[check.uptime.classification] ?? UPTIME_STYLE.down;
  const { statusCode, responseMs, error } = check.uptime;
  const ssl = check.ssl;
  const httpValue = statusCode != null ? `${statusCode}${error ? ` — ${error}` : ''}` : error ?? 'no response';

  let sslValue = 'n/a (not HTTPS)';
  let sslClass = 'text-ink-muted';
  if (ssl) {
    if (ssl.ok && ssl.daysRemaining != null) {
      const expiry = ssl.validTo ? new Date(ssl.validTo).toLocaleDateString() : '?';
      sslValue = ssl.daysRemaining <= 0 ? `EXPIRED (was valid to ${expiry})` : `${ssl.daysRemaining} day${ssl.daysRemaining === 1 ? '' : 's'} left (expires ${expiry})`;
      sslClass = ssl.daysRemaining <= 7 ? 'text-danger' : ssl.daysRemaining <= 30 ? 'text-warn' : 'text-ink-secondary';
    } else {
      sslValue = ssl.error ?? 'check failed';
      sslClass = 'text-danger';
    }
  }

  const domain = check.domain;
  let domainValue = 'n/a';
  let domainClass = 'text-ink-muted';
  if (domain) {
    if (domain.ok && domain.daysRemaining != null) {
      const expiry = domain.expiryDate ? new Date(domain.expiryDate).toLocaleDateString() : '?';
      domainValue = domain.daysRemaining <= 0 ? `EXPIRED (was valid to ${expiry})` : `${domain.daysRemaining} day${domain.daysRemaining === 1 ? '' : 's'} left (expires ${expiry})`;
      domainClass = domain.daysRemaining <= 7 ? 'text-danger' : domain.daysRemaining <= 30 ? 'text-warn' : 'text-ink-secondary';
    } else {
      domainValue = domain.error ?? 'check failed';
      domainClass = 'text-ink-muted';
    }
  }

  return (
    <div className="rounded-lg border border-line bg-ground/40 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className={cx('inline-flex items-center gap-1.5 text-xs font-medium', u.text)}>
          <span className={cx('h-2 w-2 rounded-full', u.dot)} />
          {u.label}
        </span>
        <span className="text-[11px] text-ink-faint">{new Date(check.checkedAt).toLocaleString()}</span>
      </div>
      <div className="mt-1.5 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
        <Field label="HTTP status" value={httpValue} />
        <Field label="Response time" value={`${responseMs} ms`} />
        <Field label="SSL certificate" value={sslValue} valueClass={sslClass} />
        <Field label="Domain registration" value={domainValue} valueClass={domainClass} />
      </div>
    </div>
  );
}
