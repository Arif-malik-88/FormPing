import type { SnapshotResult } from '@/types';

export function SnapshotResultCard({ result }: { result: SnapshotResult }) {
  return (
    <div className="rounded-xl border border-ok/20 bg-panel p-5 animate-slide-in">
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ok/15 text-ok">
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 10.5l3.5 3.5L16 5.5" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-ink">Snapshot saved</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Scanned <strong className="text-ink">{result.pagesScanned}</strong> page{result.pagesScanned !== 1 ? 's' : ''} for <strong className="text-ink">{result.site}</strong>
          </p>
          {/* The snapshot's absolute path used to be printed here. It is a path
              INSIDE the server container (e.g. /app/data/snapshots/…) — not
              openable and meaningless to the user, a leftover from when this
              tool was file-first. The baseline is now recorded against the
              project instead, which is the useful signal. */}
          <p className="mt-3 text-[13px] leading-relaxed text-ink-faint">
            This is now the baseline for <strong className="text-ink-secondary">{result.site}</strong>. Switch to{' '}
            <span className="rounded bg-ground px-1.5 py-0.5 font-semibold text-ink-secondary">Compare</span> later to see
            what changed since — the project shows it as <em className="text-ink-muted">Baseline captured</em>.
          </p>
        </div>
      </div>
    </div>
  );
}
