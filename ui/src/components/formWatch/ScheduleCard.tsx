'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormSchedule, FormRunRecord } from '@/lib/formWatch/types';
import { runVerdict, type VerdictLevel } from '@/lib/formWatch/verdict';
import { TrendBar, type TrendTone } from '@/components/TrendBar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cx, KeptNotice } from '@/components/ui';
import { friendlyNotes } from '@/lib/friendlyNotes';
import { FormFactChips } from '@/components/FormFactChips';

const LEVEL_STYLE: Record<VerdictLevel | 'pending', { dot: string; text: string; label: string }> = {
  healthy: { dot: 'bg-ok', text: 'text-ok', label: 'Healthy' },
  attention: { dot: 'bg-warn', text: 'text-warn', label: 'Needs attention' },
  failing: { dot: 'bg-danger', text: 'text-danger', label: 'Failing' },
  pending: { dot: 'bg-idle', text: 'text-ink-muted', label: 'Pending first run' },
};

const MODE_LABEL: Record<string, string> = { 'detect-only': 'Detect', safe: 'Safe', live: 'Live' };

function pathOf(url: string | null): string {
  if (!url) return '';
  try { return new URL(url).pathname || '/'; } catch { return url; }
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
  const days = ms / 86_400_000;
  if (days >= 1 && Number.isInteger(days)) return `every ${days} day${days === 1 ? '' : 's'}`;
  return `every ${Math.round(ms / 3_600_000)}h`;
}

export function ScheduleCard({
  schedule,
  onStop,
  onTogglePause,
  onDone,
  onHold,
}: {
  schedule: FormSchedule;
  onStop: (id: string) => Promise<void>;
  onTogglePause: (id: string, paused: boolean) => Promise<void>;
  /** Reload the list once this card has finished showing its "stopped" note. */
  onDone: () => void;
  /** Hold/release the parent's background poll while the "stopped" note is up. */
  onHold: (active: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [runs, setRuns] = useState<FormRunRecord[] | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [justStopped, setJustStopped] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holding = useRef(false);

  const verdict = schedule.lastStatus
    ? runVerdict(schedule.lastReasonCode ?? '', schedule.lastFormFound ?? false, schedule.lastStatus)
    : null;
  const level: VerdictLevel | 'pending' = verdict ? verdict.level : 'pending';
  const style = LEVEL_STYLE[level];

  const recentRuns = (runs ?? []).slice(0, 12).reverse();
  const levels = recentRuns.map((r) => runVerdict(r.reasonCode, r.fingerprint.formFound, r.status).level);
  const passPct = levels.length ? Math.round((levels.filter((l) => l === 'healthy').length / levels.length) * 100) : null;
  const trendTones: TrendTone[] = levels.map((l) => (l === 'healthy' ? 'emerald' : l === 'failing' ? 'red' : 'amber'));

  async function loadRuns() {
    setLoadingRuns(true);
    try {
      const res = await fetch(`/api/form-watch/results?id=${encodeURIComponent(schedule.id)}`, { cache: 'no-store' }).then((r) => r.json());
      setRuns(Array.isArray(res?.runs) ? res.runs : []);
    } catch {
      setRuns([]);
    } finally {
      setLoadingRuns(false);
    }
  }
  function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next) void loadRuns();
  }
  useEffect(() => {
    void loadRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule.lastRunAt]);

  // Release the poll hold if this card unmounts while its note is still up.
  useEffect(() => () => { if (holding.current) onHold(false); if (timer.current) clearTimeout(timer.current); }, [onHold]);

  function finish() {
    if (timer.current) clearTimeout(timer.current);
    if (holding.current) { holding.current = false; onHold(false); }
    onDone();
  }

  async function doStop() {
    setStopping(true);
    try {
      await onStop(schedule.id); // API only — no reload yet
    } finally {
      setStopping(false);
    }
    setConfirmStop(false);
    holding.current = true;
    onHold(true); // freeze the poll so the note stays put
    setJustStopped(true);
    timer.current = setTimeout(finish, 7000);
  }

  async function handlePause() {
    setPausing(true);
    try {
      await onTogglePause(schedule.id, !schedule.paused);
    } finally {
      setPausing(false);
    }
  }

  // ── In-place "stopped" confirmation — appears exactly where this card was ──
  if (justStopped) {
    return <KeptNotice title="Stopped — its last results are kept in Projects" subtitle={schedule.url} onDismiss={finish} />;
  }

  return (
    <div className={cx('rounded-xl border bg-panel/60', schedule.paused ? 'border-dashed border-line-strong' : 'border-line')}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={cx('inline-flex items-center gap-1.5 text-xs font-semibold', style.text)}>
                <span className={cx('h-2 w-2 rounded-full', style.dot, level === 'pending' && 'animate-pulse motion-reduce:animate-none')} />
                {level === 'pending' ? 'Setting up' : style.label}
              </span>
              {verdict && <span className="text-[11px] text-ink-muted">· {verdict.label}</span>}
              {level === 'pending' && (
                <span className="text-[11px] text-ink-muted">
                  · running the first check {schedule.landingPage ? 'on this page' : 'across your site'}…
                </span>
              )}
              {schedule.paused && (
                <span className="rounded bg-panel-raised px-1.5 py-0.5 text-[11px] font-medium text-ink-muted ring-1 ring-line-strong">Paused</span>
              )}
            </div>
            <a href={schedule.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-ink hover:text-accent-soft" title={schedule.url}>
              {schedule.url}
            </a>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-faint">
              <span>{intervalLabel(schedule.intervalMs)}</span>
              <span className="rounded bg-panel-raised px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-muted">{schedule.mode}</span>
              {schedule.landingPage && (
                <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent-soft ring-1 ring-accent/30" title="Landing-page mode: tested on this exact URL">Landing</span>
              )}
              <span>last run {relativeTime(schedule.lastRunAt)}</span>
              <span>next {relativeTime(schedule.nextRunAt)}</span>
              {passPct != null && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-ink-muted">{passPct}% healthy</span>
                  <TrendBar tones={trendTones} title={`last ${trendTones.length} runs`} />
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handlePause}
              disabled={pausing}
              className="rounded-md border border-line-strong px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-panel hover:text-ink disabled:opacity-40"
            >
              {pausing ? '…' : schedule.paused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmStop(true)}
              disabled={stopping}
              title="Stops watching this URL and clears its run history here. Its result stays in Projects. Use Pause to keep it."
              className="rounded-md border border-danger/40 px-2.5 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-40"
            >
              {stopping ? 'Stopping…' : 'Stop'}
            </button>
          </div>
        </div>

        {schedule.paused && (
          <p className="mt-2.5 rounded-md border border-line bg-panel-raised px-3 py-2 text-[11px] text-ink-muted">
            Paused — not running right now. Its last results stay in Projects; hit <strong className="text-ink-secondary">Resume</strong> to start again.
          </p>
        )}

        {/* Live can't actually submit multi-step / third-party forms yet — say so
            up front so a Live schedule that never submits isn't a surprise. FR-64.
            (Multi-step submission is FR-63; cross-origin embeds can't be submitted.) */}
        {schedule.mode === 'live' &&
          (schedule.lastReasonCode === 'MULTI_STEP_FORM_DETECTED' || schedule.lastReasonCode === 'THIRD_PARTY_EMBED_FORM') && (
            <p className="mt-2.5 rounded-md border border-warn/25 bg-warn/10 px-3 py-2 text-[11px] text-warn">
              Live mode can’t submit this form yet — it’s a{' '}
              {schedule.lastReasonCode === 'THIRD_PARTY_EMBED_FORM' ? 'third-party embedded' : 'multi-step'} form. Each run will
              keep reporting it as <strong>detected</strong> (not submitted).{' '}
              {schedule.lastReasonCode === 'THIRD_PARTY_EMBED_FORM'
                ? 'Cross-origin embeds can’t be auto-submitted — verify it manually.'
                : 'Step-through submission is coming soon; use Detect or Safe in the meantime.'}
            </p>
          )}

        <button type="button" onClick={toggleExpand} className="mt-3 text-xs font-medium text-ink-muted transition-colors hover:text-ink">
          {expanded ? '▾ Hide run history' : '▸ View run history'}
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-line p-4">
          {loadingRuns && (
            <div className="space-y-2"><div className="fp-skeleton h-12 rounded-lg" /><div className="fp-skeleton h-12 rounded-lg" /></div>
          )}
          {!loadingRuns && runs && runs.length === 0 && (
            <p className="text-xs text-ink-faint">No runs yet — they appear here after the first check.</p>
          )}
          {!loadingRuns && runs && runs.map((run, i) => <RunRow key={`${run.ranAt}-${i}`} run={run} />)}
        </div>
      )}

      <ConfirmDialog
        open={confirmStop}
        variant="danger"
        title="Stop this form scheduler?"
        confirmLabel="Stop scheduler"
        message={
          <>
            Stops watching <span className="break-all font-mono text-ink-secondary">{schedule.url}</span> and clears its run history here.{' '}
            <strong className="text-ink-secondary">Its result stays in Projects</strong> — only deleting the project removes it. Want to keep it? Use{' '}
            <strong className="text-ink-secondary">Pause</strong>.
          </>
        }
        onConfirm={doStop}
        onCancel={() => setConfirmStop(false)}
      />
    </div>
  );
}

function RunRow({ run }: { run: FormRunRecord }) {
  const v = runVerdict(run.reasonCode, run.fingerprint.formFound, run.status);
  const s = LEVEL_STYLE[v.level];
  return (
    <div className="rounded-lg border border-line bg-ground/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className={cx('inline-flex items-center gap-1.5 text-xs font-medium', s.text)}>
          <span className={cx('h-2 w-2 rounded-full', s.dot)} />
          {s.label}
          <span className="font-normal text-ink-muted">· {v.label}</span>
        </span>
        <span className="text-[11px] text-ink-faint">{new Date(run.ranAt).toLocaleString()}</span>
      </div>
      <div className="mt-1 text-[11px] text-ink-faint">
        {MODE_LABEL[run.mode] ?? run.mode} mode · {Math.round(run.durationMs / 1000)}s
      </div>
      {(() => {
        const fp = run.fingerprint;
        const embed = fp.formType === 'third-party';
        const foundPath = pathOf(fp.contactPage);
        if (!fp.formFound && !embed) return null;
        // Step-ness is only shown when actually known (new-format records);
        // legacy runs without the facts omit it rather than guess.
        const stepKnown = fp.formType === 'native' || fp.isMultiStep === true;
        const names = (fp.fields ?? []).map((f) => f.label?.trim()).filter(Boolean) as string[];
        const shown = names.slice(0, 6);
        const more = names.length > shown.length ? `, +${names.length - shown.length} more` : '';
        return (
          <div className="mt-1.5 space-y-1 text-[11px] text-ink-muted">
            <div>
              <span className="font-medium text-ink-secondary">Form found</span>
              {foundPath && <> on <span className="font-mono text-ink-faint">{foundPath}</span></>}
            </div>
            <FormFactChips
              formType={fp.formType}
              embedProvider={fp.embedProvider}
              embedKind={fp.embedKind}
              isMultiStep={fp.isMultiStep}
              fieldCount={fp.fieldCount}
              stepKnown={stepKnown}
              captchaPresent={fp.captchaDetected}
            />
            {!embed && shown.length > 0 && <div className="text-ink-faint">{shown.join(', ')}{more}</div>}
          </div>
        );
      })()}
      {friendlyNotes(run.notes).length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {friendlyNotes(run.notes).map((n, i) => (
            <li key={i} className="flex gap-1.5 text-[11px] text-ink-faint"><span className="shrink-0 text-ink-faint">•</span><span>{n}</span></li>
          ))}
        </ul>
      )}
      {run.errors.length > 0 && <p className="mt-1.5 text-[11px] text-danger/80">{run.errors.slice(0, 2).join('; ')}</p>}
    </div>
  );
}
