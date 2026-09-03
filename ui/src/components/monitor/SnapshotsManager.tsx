'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  url: string;
  disabled: boolean;
  /** bumped by parent after a snapshot/compare completes so we re-fetch info */
  refreshKey: number;
  /** parent callback after a successful clear so it can drop stale results from the screen */
  onCleared?: () => void;
}

interface SnapshotInfo {
  host: string;
  count: number;
  latest: string | null;
  totalBytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function SnapshotsManager({ url, disabled, refreshKey, onCleared }: Props) {
  const [info, setInfo] = useState<SnapshotInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const confirmTimerRef = useRef<NodeJS.Timeout | null>(null);

  const trimmedUrl = url.trim();

  // Debounced fetch on URL change or refresh trigger
  useEffect(() => {
    if (!trimmedUrl) {
      setInfo(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/monitor/snapshots?url=${encodeURIComponent(trimmedUrl)}`);
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as SnapshotInfo;
          setInfo(data);
        } else {
          setInfo(null);
        }
      } catch {
        if (!cancelled) setInfo(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedUrl, refreshKey]);

  const startConfirm = useCallback(() => {
    setConfirming(true);
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = setTimeout(() => setConfirming(false), 4000);
  }, []);

  const handleClear = useCallback(async () => {
    if (!confirming) {
      startConfirm();
      return;
    }
    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
    setClearing(true);
    try {
      const res = await fetch('/api/monitor/snapshots', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
      });
      if (res.ok) {
        setInfo((prev) => (prev ? { ...prev, count: 0, latest: null, totalBytes: 0 } : null));
        onCleared?.();
      }
    } finally {
      setClearing(false);
      setConfirming(false);
    }
  }, [confirming, trimmedUrl, onCleared, startConfirm]);

  if (!trimmedUrl) return null;

  // Empty state — small inline note while we have a URL but no snapshots yet
  if (!loading && info && info.count === 0) {
    return (
      <div className="rounded-lg border border-line bg-panel/50 px-3 py-2 flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-ink-faint shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-ink-faint">
          No snapshots stored yet for <span className="font-mono text-ink-muted">{info.host}</span> — first run will create the baseline.
        </p>
      </div>
    );
  }

  if (!info || info.count === 0) return null;

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 transition-colors ${
        confirming ? 'border-danger/40 bg-danger/5' : 'border-line bg-panel/50'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-secondary leading-relaxed">
            <strong className="font-semibold text-ink">{info.count}</strong>{' '}
            snapshot{info.count !== 1 ? 's' : ''}
            <span className="text-ink-faint"> for </span>
            <span className="font-mono text-ink-muted">{info.host}</span>
            {info.latest && (
              <>
                <span className="text-ink-faint mx-1.5">·</span>
                <span className="text-ink-faint">last {formatRelative(info.latest)}</span>
              </>
            )}
            <span className="text-ink-faint mx-1.5">·</span>
            <span className="text-ink-faint font-mono">{formatBytes(info.totalBytes)}</span>
          </p>
          {confirming && (
            <p className="flex items-start gap-1.5 text-xs text-danger mt-1.5 leading-relaxed">
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M10 6.5v4M10 13.5v.3M8.6 3.9L2.5 15a1.6 1.6 0 001.4 2.4h12.2A1.6 1.6 0 0017.5 15L11.4 3.9a1.6 1.6 0 00-2.8 0z" /></svg>
              <span>This will delete all {info.count} snapshot{info.count !== 1 ? 's' : ''} and screenshots. Click again to confirm.</span>
            </p>
          )}
        </div>
        <button
          onClick={handleClear}
          disabled={disabled || clearing}
          className={`text-xs font-semibold px-2.5 py-1.5 rounded-md transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
            confirming
              ? 'bg-danger hover:brightness-110 text-white shadow shadow-danger/30'
              : 'bg-ground hover:bg-panel-raised text-ink-secondary ring-1 ring-line-strong hover:ring-ink-faint'
          }`}
          title={confirming ? 'Confirm deletion' : 'Clear all snapshots for this site'}
        >
          {clearing ? 'Clearing…' : confirming ? 'Confirm' : 'Clear all'}
        </button>
      </div>
    </div>
  );
}
