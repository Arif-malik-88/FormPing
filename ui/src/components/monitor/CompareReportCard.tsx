import type { ChangeReport } from '@/types';
import { PageChangeCard } from './PageChangeCard';
import { formatRelativeTime } from '@/lib/time';

function StatPill({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${color}`}>
      <span className="text-base font-bold font-mono">{count}</span>
      <span className="uppercase tracking-wide opacity-80">{label}</span>
    </div>
  );
}

export function CompareReportCard({ report }: { report: ChangeReport }) {
  const high = report.details.filter((d) => d.severity === 'high').length;
  const medium = report.details.filter((d) => d.severity === 'medium').length;
  const low = report.details.filter((d) => d.severity === 'low').length;
  const isInitial = report.previousSnapshot === null;

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `change-report-${report.site}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 animate-slide-in">
      {/* Summary card */}
      <div className="rounded-xl border border-line-strong bg-panel p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-ink">{report.site}</h3>
            <p className="text-xs font-mono text-ink-faint truncate">{report.rootUrl}</p>
          </div>
          <button
            onClick={downloadJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-ink-muted hover:text-ink bg-ground hover:bg-panel-raised transition-colors ring-1 ring-line-strong"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export JSON
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatPill
            count={report.pagesScanned}
            label={report.pagesScanned === 1 ? 'page scanned' : 'pages scanned'}
            color="bg-ground text-ink-secondary"
          />
          {report.pagesChanged > 0 && (
            <StatPill
              count={report.pagesChanged}
              label={report.pagesChanged === 1 ? 'page changed' : 'pages changed'}
              color="bg-accent/10 text-accent-soft"
            />
          )}
          {report.changesFound > 0 && (
            <StatPill
              count={report.changesFound}
              label={report.changesFound === 1 ? 'change' : 'changes'}
              color="bg-ground text-ink-secondary"
            />
          )}
          {high > 0 && <StatPill count={high} label="high" color="bg-danger/10 text-danger" />}
          {medium > 0 && <StatPill count={medium} label="medium" color="bg-warn/10 text-warn" />}
          {low > 0 && <StatPill count={low} label="low" color="bg-idle/10 text-ink-muted" />}
        </div>

        {isInitial ? (
          <div className="rounded-lg bg-accent/10 border border-accent/20 px-3 py-2.5">
            <p className="text-sm text-accent-soft font-semibold">📷 Initial baseline saved</p>
            <p className="text-xs text-ink-muted mt-1">Run compare again later to see what changed.</p>
          </div>
        ) : report.changesFound === 0 ? (
          (() => {
            const changedPages = report.hashStatus?.filter((h) => h.hashChanged) ?? [];
            if (changedPages.length === 0) {
              return (
                <div className="rounded-lg bg-ok/10 border border-ok/20 px-3 py-2.5">
                  <p className="text-sm text-ok font-semibold">
                    ✓ No changes since last snapshot
                  </p>
                  <p className="text-xs text-ink-muted mt-1">
                    Site is byte-identical to the previous baseline (text-content hashes match).
                  </p>
                </div>
              );
            }
            // Hash differs but our extractor didn't pinpoint specific changes
            return (
              <div className="rounded-lg bg-warn/10 border border-warn/20 px-3 py-2.5">
                <p className="text-sm text-warn font-semibold">
                  ⚠ Page changed, but specific text could not be pinpointed
                </p>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                  The body text hash differs vs the previous snapshot on{' '}
                  <strong className="text-ink">
                    {changedPages.length} page{changedPages.length !== 1 ? 's' : ''}
                  </strong>
                  , but the change is inside markup we don&apos;t extract semantically (deep
                  custom widgets, JS-rendered content, etc.). Try{' '}
                  <strong className="text-ink">--screenshots</strong> mode for full
                  JS-rendered comparison.
                </p>
                <ul className="mt-2 space-y-1">
                  {changedPages.slice(0, 5).map((h) => (
                    <li
                      key={h.url}
                      className="text-xs font-mono text-warn/80 flex items-center gap-2"
                    >
                      <span className="text-warn/60">·</span>
                      <span className="truncate">{new URL(h.url).pathname}</span>
                      <span className="text-ink-faint text-[10px]">
                        {h.oldLength}b → {h.newLength}b
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()
        ) : (
          <div className="rounded-lg bg-ground border border-line-strong px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs font-semibold text-ink-faint uppercase tracking-wider">Summary</p>
              {report.summaryProvider && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/10 text-accent-soft ring-1 ring-accent/20"
                  title="This summary was written by the AI provider"
                >
                  <span aria-hidden>✨</span>
                  {report.summaryProvider}
                </span>
              )}
            </div>
            <p className="text-sm text-ink-secondary leading-relaxed">{report.summary}</p>
          </div>
        )}

        <div className="text-xs text-ink-faint flex items-center gap-3 flex-wrap">
          <span title={new Date(report.checkedAt).toISOString()}>
            Checked {formatRelativeTime(report.checkedAt)}
          </span>
          {report.previousSnapshot && (() => {
            const file = report.previousSnapshot.split('/').pop() ?? '';
            // strip the .json and try to recover an ISO-like timestamp
            const stem = file.replace(/\.json$/, '');
            // Filenames look like "2026-05-08T16-20-51-289Z" — invert to ISO-ish
            const iso = stem.replace(/-(\d{2})-(\d{2})-(\d{3}Z)$/, ':$1:$2.$3');
            const t = Date.parse(iso);
            return Number.isNaN(t) ? (
              <span className="font-mono truncate" title={file}>vs {file}</span>
            ) : (
              <span title={`vs ${file}`}>vs {formatRelativeTime(new Date(t).toISOString())}</span>
            );
          })()}
        </div>
      </div>

      {/* Per-page change cards */}
      {report.details.length > 0 && (
        <div className="space-y-3">
          {[...report.details]
            .sort((a, b) => {
              const rank = { high: 0, medium: 1, low: 2 };
              return rank[a.severity] - rank[b.severity];
            })
            .map((d, i) => (
              <PageChangeCard key={`${d.url}-${i}`} change={d} />
            ))}
        </div>
      )}
    </div>
  );
}
