import type { SnapshotResult } from '@/types';

export function SnapshotResultCard({ result }: { result: SnapshotResult }) {
  return (
    <div className="rounded-xl border border-ok/20 bg-panel p-5 animate-slide-in">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-ok/15 flex items-center justify-center text-ok text-lg shrink-0">
          ✓
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-ink">Snapshot saved</h3>
          <p className="text-xs text-ink-muted mt-1">
            Crawled <strong className="text-ink">{result.pagesScanned}</strong> page{result.pagesScanned !== 1 ? 's' : ''} for <strong className="text-ink">{result.site}</strong>
          </p>
          {/* The snapshot's absolute path used to be printed here. It is a path
              INSIDE the server container (e.g. /app/data/snapshots/…) — not
              openable and meaningless to the user, a leftover from when this
              tool was file-first. The baseline is now recorded against the
              project instead, which is the useful signal. */}
          <p className="text-xs text-ink-faint mt-3 leading-relaxed">
            This is now the baseline for <strong className="text-ink-secondary">{result.site}</strong>. Run{' '}
            <span className="font-mono bg-ground px-1.5 py-0.5 rounded text-ink-secondary">compare</span> later to see
            what changed since it — the project shows it as <em className="text-ink-muted">Baseline captured</em>.
          </p>
        </div>
      </div>
    </div>
  );
}
