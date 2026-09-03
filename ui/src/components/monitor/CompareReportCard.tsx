'use client';
import { useState } from 'react';
import type { ChangeReport } from '@/types';
import { PageChangeCard } from './PageChangeCard';
import { StatusDot } from '@/components/ui';
import { fromChangeSeverity } from '@/lib/design/status';
import { formatRelativeTime } from '@/lib/time';

function StatPill({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${color}`}>
      <span className="font-mono text-base font-bold">{count}</span>
      <span className="uppercase tracking-wide opacity-80">{label}</span>
    </div>
  );
}

function shortPath(url: string): string {
  try { return new URL(url).pathname || '/'; } catch { return url; }
}

const SEV_RANK = { high: 0, medium: 1, low: 2 } as const;

export function CompareReportCard({ report }: { report: ChangeReport }) {
  const high = report.details.filter((d) => d.severity === 'high').length;
  const medium = report.details.filter((d) => d.severity === 'medium').length;
  const low = report.details.filter((d) => d.severity === 'low').length;
  const isInitial = report.previousSnapshot === null;

  const pages = [...report.details].sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
  const [active, setActive] = useState(0);

  const baselineRel = (() => {
    if (!report.previousSnapshot) return null;
    const stem = (report.previousSnapshot.split('/').pop() ?? '').replace(/\.json$/, '');
    const iso = stem.replace(/-(\d{2})-(\d{2})-(\d{3}Z)$/, ':$1:$2.$3');
    const t = Date.parse(iso);
    return Number.isNaN(t) ? null : formatRelativeTime(new Date(t).toISOString());
  })();

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
      <div className="space-y-3 rounded-xl border border-line-strong bg-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-ink">{report.site}</h3>
            <p className="truncate font-mono text-xs text-ink-faint">{report.rootUrl}</p>
          </div>
          <button onClick={downloadJson} className="flex items-center gap-1.5 rounded-lg bg-ground px-3 py-1.5 text-xs text-ink-muted ring-1 ring-line-strong transition-colors hover:bg-panel-raised hover:text-ink">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export JSON
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatPill count={report.pagesScanned} label={report.pagesScanned === 1 ? 'page scanned' : 'pages scanned'} color="bg-ground text-ink-secondary" />
          {report.pagesChanged > 0 && <StatPill count={report.pagesChanged} label={report.pagesChanged === 1 ? 'page changed' : 'pages changed'} color="bg-accent/10 text-accent-soft" />}
          {report.changesFound > 0 && <StatPill count={report.changesFound} label={report.changesFound === 1 ? 'change' : 'changes'} color="bg-ground text-ink-secondary" />}
          {high > 0 && <StatPill count={high} label="high" color="bg-danger/10 text-danger" />}
          {medium > 0 && <StatPill count={medium} label="medium" color="bg-warn/10 text-warn" />}
          {low > 0 && <StatPill count={low} label="low" color="bg-idle/10 text-ink-muted" />}
        </div>

        {isInitial ? (
          <div className="rounded-lg border border-accent/20 bg-accent/10 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-accent-soft">
              <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden><rect x="2.5" y="5" width="15" height="11" rx="2" /><circle cx="10" cy="10.5" r="2.8" /><path d="M7 5l1-1.5h4L13 5" strokeLinejoin="round" /></svg>
              Initial baseline saved
            </p>
            <p className="mt-1 text-xs text-ink-muted">Run Compare again later to see what changed.</p>
          </div>
        ) : report.changesFound === 0 ? (
          <NoChanges report={report} />
        ) : (
          <div className="rounded-lg border border-line-strong bg-ground px-3 py-2.5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Page changes</p>
            <ul className="space-y-1.5">
              {pages.map((d, i) => (
                <li key={i} className="flex items-baseline gap-2 text-[13px]">
                  <span className="shrink-0 font-semibold text-ink">Page {i + 1}</span>
                  <a href={d.url} target="_blank" rel="noreferrer" className="break-all font-mono text-accent-soft hover:underline">
                    {shortPath(d.url)}
                  </a>
                  <span className="shrink-0 text-xs text-ink-faint">{d.changes.length} change{d.changes.length === 1 ? '' : 's'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-ink-faint">
          Compared <span className="text-ink-muted" title={new Date(report.checkedAt).toISOString()}>{formatRelativeTime(report.checkedAt)}</span>
          {report.previousSnapshot && (
            <> against a baseline{baselineRel ? <> from <span className="text-ink-muted">{baselineRel}</span></> : ''}</>
          )}.
        </p>
      </div>

      {/* Per-page changes — a TAB per changed page, active one shown below */}
      {pages.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {pages.map((d, i) => {
              const on = i === active;
              return (
                <button
                  key={`${d.url}-${i}`}
                  type="button"
                  title={shortPath(d.url)}
                  onClick={() => setActive(i)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2.5 text-[13px] font-medium transition-colors ${on ? 'border-accent/40 bg-accent/10 text-accent-soft' : 'border-line-strong bg-panel text-ink-muted hover:text-ink'}`}
                >
                  <StatusDot level={fromChangeSeverity(d.severity, 1)} />
                  <span>Page {i + 1}</span>
                  <span className={on ? 'text-accent-soft/70' : 'text-ink-faint'}>· {d.changes.length}</span>
                </button>
              );
            })}
          </div>
          {pages[active] && <PageChangeCard change={pages[active]} pageNumber={active + 1} />}
        </div>
      )}
    </div>
  );
}

/** The changesFound===0 states: byte-identical, or changed-but-unpinpointed. */
function NoChanges({ report }: { report: ChangeReport }) {
  const changedPages = report.hashStatus?.filter((h) => h.hashChanged) ?? [];
  if (changedPages.length === 0) {
    return (
      <div className="rounded-lg border border-ok/20 bg-ok/10 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-ok">
          <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M4 10.5l3.5 3.5L16 5.5" /></svg>
          No changes since the last baseline
        </p>
        <p className="mt-1 text-xs text-ink-muted">The site&rsquo;s content is identical to the previous baseline.</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-warn/20 bg-warn/10 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-warn">
        <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M10 6.5v4M10 13.5v.3M8.6 3.9L2.5 15a1.6 1.6 0 001.4 2.4h12.2A1.6 1.6 0 0017.5 15L11.4 3.9a1.6 1.6 0 00-2.8 0z" /></svg>
        Something changed — but we couldn&rsquo;t pinpoint the exact text
      </p>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
        The content differs from the previous baseline on <strong className="text-ink">{changedPages.length} page{changedPages.length !== 1 ? 's' : ''}</strong>,
        but the change is inside markup we don&apos;t read semantically (deep custom widgets, JS-rendered content, etc.). Turn on{' '}
        <strong className="text-ink">Capture screenshots</strong> for a full JS-rendered comparison.
      </p>
    </div>
  );
}
