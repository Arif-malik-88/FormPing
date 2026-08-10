'use client';
import type { ChangeReport, SnapshotResult } from '@/types';
import { CompareReportCard } from './CompareReportCard';
import { SnapshotResultCard } from './SnapshotResultCard';

interface Props {
  reports: ChangeReport[];
  snapshot: SnapshotResult | null;
  logs: string[];
  running: boolean;
  watchActive: boolean;
  /** Clear the on-screen view + URL input (not the server-stored reports). */
  onClear?: () => void;
}

export function MonitorResultsPanel({ reports, snapshot, logs, running, watchActive, onClear }: Props) {
  const isEmpty = reports.length === 0 && !snapshot && !running;
  const hasContent = reports.length > 0 || !!snapshot;

  return (
    <div className="space-y-4">
      {/* Clear the view (keeps server-stored reports) */}
      {hasContent && !running && onClear && (
        <div className="flex justify-end">
          <button
            onClick={onClear}
            title="Clear the reports and URL from this tab. Does NOT delete the stored snapshots/reports."
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-danger bg-danger/10 ring-1 ring-danger/30 hover:bg-danger/20 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear results
          </button>
        </div>
      )}

      {/* Live status / progress */}
      {running && (
        <div className="rounded-xl border border-line-strong bg-panel p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="text-sm font-semibold text-ink">
              {watchActive ? 'Watching for changes' : 'Running'}
            </span>
          </div>
          {logs.length > 0 && (
            <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
              {logs.slice(-12).map((log, i) => (
                <p key={i} className="text-xs font-mono text-ink-muted truncate">{log}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Snapshot result (only one at a time) */}
      {snapshot && <SnapshotResultCard result={snapshot} />}

      {/* Reports — newest first */}
      {reports.length > 0 && (
        <div className="space-y-6">
          {watchActive && reports.length > 1 && (
            <p className="text-xs text-ink-faint px-1">
              Showing {reports.length} report{reports.length !== 1 ? 's' : ''} (newest first)
            </p>
          )}
          {[...reports].reverse().map((report, i) => (
            <CompareReportCard key={`${report.checkedAt}-${i}`} report={report} />
          ))}
        </div>
      )}

      {/* Empty state — an animated "page being watched" (scan line sweeps down). */}
      {isEmpty && (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-panel/40 px-8 py-16 text-center">
          <div className="relative mb-5 flex h-[74px] w-24 items-center justify-center">
            <span className="absolute inset-2 rounded-2xl bg-accent/10 blur-xl" aria-hidden />
            <svg viewBox="0 0 96 74" className="relative h-[74px] w-24" fill="none" aria-hidden>
              <defs>
                <clipPath id="fp-scan-clip"><rect x="8" y="24" width="80" height="42" rx="2" /></clipPath>
              </defs>
              {/* browser frame */}
              <rect x="6" y="8" width="84" height="58" rx="9" className="fill-ground stroke-line-strong" strokeWidth="1.5" />
              {/* top bar */}
              <circle cx="15" cy="16" r="1.7" className="fill-line-strong" />
              <circle cx="22" cy="16" r="1.7" className="fill-line-strong" />
              <circle cx="29" cy="16" r="1.7" className="fill-line-strong" />
              <rect x="38" y="13" width="46" height="6" rx="3" className="fill-panel-raised" />
              {/* content lines */}
              <rect x="16" y="30" width="54" height="4" rx="2" className="fill-line-strong" />
              <rect x="16" y="40" width="64" height="4" rx="2" className="fill-line-strong" />
              <rect x="16" y="50" width="40" height="4" rx="2" className="fill-line-strong" />
              {/* scan line */}
              <g clipPath="url(#fp-scan-clip)">
                <g className="fp-scan">
                  <rect x="8" y="26" width="80" height="10" className="fill-accent" opacity="0.14" />
                  <rect x="8" y="34" width="80" height="2" className="fill-accent-soft" />
                </g>
              </g>
            </svg>
          </div>
          <p className="text-[15px] font-semibold text-ink">No reports yet</p>
          <p className="mt-1.5 max-w-sm text-sm text-ink-muted">
            Enter a URL above and hit <strong className="text-ink-secondary">Run</strong> to take a snapshot or compare against the last one.
          </p>
        </div>
      )}
    </div>
  );
}
