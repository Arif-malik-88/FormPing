'use client';
import type { SiteResult, RunProgress } from '@/types';
import { ResultCard } from './ResultCard';

interface Props {
  results: SiteResult[];
  progress: RunProgress | null;
  logs: string[];
  running: boolean;
  /** Clear the on-screen view + URL input (not the server-stored result). */
  onClear?: () => void;
}

function StatPill({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${color}`}>
      <span className="font-mono text-base font-bold tabular-nums">{count}</span>
      <span className="uppercase tracking-wide opacity-80">{label}</span>
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ResultsPanel({ results, progress, logs, running, onClear }: Props) {
  const pass = results.filter((r) => r.finalStatus === 'pass').length;
  const fail = results.filter((r) => r.finalStatus === 'fail').length;
  const warn = results.filter((r) => r.finalStatus === 'warn').length;
  const error = results.filter((r) => r.finalStatus === 'error').length;

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formping-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isEmpty = results.length === 0 && !running;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {(results.length > 0 || running) && (
        <div className="rounded-xl border border-line bg-panel p-4">
          {running && progress && (
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-accent" />
                  <span className="max-w-xs truncate font-mono text-ink-secondary">{progress.currentUrl || 'Running…'}</span>
                </div>
                <span className="shrink-0 font-mono text-ink-faint">{progress.current}/{progress.total}</span>
              </div>
              <ProgressBar current={progress.current} total={progress.total} />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <StatPill count={results.length} label="Total" color="bg-panel-raised text-ink-secondary" />
            {pass > 0 && <StatPill count={pass} label="Pass" color="bg-ok/10 text-ok" />}
            {fail > 0 && <StatPill count={fail} label="Fail" color="bg-danger/10 text-danger" />}
            {warn > 0 && <StatPill count={warn} label="Warn" color="bg-warn/10 text-warn" />}
            {error > 0 && <StatPill count={error} label="Error" color="bg-idle/10 text-ink-muted" />}

            {results.length > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={downloadJson}
                  className="flex items-center gap-1.5 rounded-lg bg-panel-raised px-3 py-1.5 text-xs text-ink-muted ring-1 ring-line-strong transition-colors hover:text-ink"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export JSON
                </button>
                {onClear && !running && (
                  <button
                    onClick={onClear}
                    title="Clear the results and URL from this tab. Does NOT delete the stored result Projects uses."
                    className="flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger ring-1 ring-danger/30 transition-colors hover:bg-danger/20"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear results
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log feed */}
      {running && logs.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-line bg-panel">
          <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
            <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Live log</span>
          </div>
          <div className="max-h-32 space-y-1 overflow-y-auto px-4 py-3">
            {logs.slice(-20).map((log, i) => (
              <p key={i} className="truncate font-mono text-xs text-ink-muted">{log}</p>
            ))}
          </div>
        </div>
      )}

      {/* Results list */}
      <div className="space-y-3">
        {results.map((r, i) => (
          <ResultCard key={`${r.normalizedUrl}-${i}`} result={r} />
        ))}
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-panel/40 px-8 py-16 text-center">
          <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
            {/* animated "ping" rings — on-brand (form + ping) */}
            <span className="absolute inline-flex h-14 w-14 animate-ping rounded-full bg-accent/15 [animation-duration:2.2s] motion-reduce:animate-none" aria-hidden />
            <span className="absolute h-16 w-16 rounded-full border border-accent/15" aria-hidden />
            <span className="absolute h-20 w-20 rounded-full border border-accent/10" aria-hidden />
            {/* form glyph */}
            <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-panel-raised text-accent-soft shadow-lg shadow-accent-deep/20 ring-1 ring-line-strong">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
                <rect x="4" y="3" width="16" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
          </div>
          <p className="text-[15px] font-semibold text-ink">Ready to test a contact form</p>
          <p className="mt-1.5 max-w-sm text-sm text-ink-muted">
            Enter a URL in the bar above and hit <strong className="text-ink-secondary">Run test</strong> — the health report shows up right here.
          </p>
        </div>
      )}
    </div>
  );
}
