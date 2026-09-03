'use client';
import { useEffect, useState } from 'react';
import type { SiteResult, RunProgress, SubmitMode } from '@/types';
import { ResultCard } from './ResultCard';
import { runVerdict } from '@/lib/formWatch/verdict';

// Plain, on-brand facts shown while a test runs — makes the wait feel purposeful
// and teaches what the tool is doing. Rotated in the loader. FR-63.
const RUN_FACTS = [
  'A broken contact form can quietly lose leads for weeks before anyone notices.',
  'Most forms fail silently — no error shows, the message just never arrives.',
  'We fill the form with realistic test data, so the run behaves like a real visitor.',
  'In Safe mode nothing is ever sent — we stop right before submitting.',
  'Multi-step forms are walked one step at a time, just like a person would.',
  'Embedded forms (Typeform, HubSpot, Calendly…) are detected even inside an iframe.',
  'A green thank-you page isn’t proof — we watch for the real success signal after submit.',
];

interface Props {
  results: SiteResult[];
  progress: RunProgress | null;
  logs: string[];
  running: boolean;
  /** Landing-page toggle for the in-flight run — drives the loader copy. */
  landingPage?: boolean;
  /** Mode for the in-flight run — drives the loader copy. */
  mode?: SubmitMode;
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

/** Determinate for a batch (know how many of N are done); a gentle pulsing track
 *  for a single URL (one long check with no measurable sub-steps). */
function RunBar({ current, total }: { current: number; total: number }) {
  if (total > 1) {
    const pct = (current / total) * 100;
    return (
      <div className="h-1 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    );
  }
  return <div className="fp-indeterminate h-1 w-full rounded-full bg-line" />;
}

// Map raw engine log lines to a friendly, user-facing phase. We NEVER show the
// raw logs (version strings, proxy state, byte counts, "Discovering contact
// page" — all internal); instead we surface a plain phrase tied to real
// progress. Scanned newest-first so the latest meaningful step wins. FR-64.
const PHASE_RULES: [RegExp, string][] = [
  [/submit|submitting|submitted/i, 'Submitting the form…'],
  [/\bfill(ing|ed)?\b/i, 'Filling the form…'],
  [/form found|contact form detected|form detected/i, 'Form found — checking it…'],
  [/contact page:/i, 'Found the page — looking for the form…'],
  [/discovering contact page|lightweight fetch|falling back to playwright|contact page loaded|reload/i, 'Finding the contact form…'],
  [/landing-page mode/i, 'Loading the page…'],
];
function friendlyPhase(logs: string[]): string | null {
  for (let i = logs.length - 1; i >= 0; i--) {
    const line = logs[i]!;
    for (const [re, phrase] of PHASE_RULES) if (re.test(line)) return phrase;
  }
  return null;
}

/** Contextual "we're testing…" loader. The copy tells the user exactly what the
 *  run is doing — a whole-site check vs a single landing page — so the wait is
 *  clear, not a blank spinner, and NEVER exposes raw engine logs. FR-64. */
function RunningLoader({
  progress,
  landingPage,
  mode,
  logs,
}: {
  progress: RunProgress | null;
  landingPage?: boolean;
  mode?: SubmitMode;
  logs: string[];
}) {
  const headline = landingPage ? 'Testing this page' : 'Testing the whole site';
  const finish =
    mode === 'live' ? 'find the form, fill it, and submit a test message'
    : mode === 'detect-only' ? 'find the contact form and confirm it'
    : 'find the contact form and fill it';
  const sub = landingPage
    ? `Landing-page mode — we test only the page you gave: ${finish}.`
    : `Looking across your site for the contact form, then we ${finish}.`;
  const total = progress?.total ?? 0;
  const current = progress?.current ?? 0;
  const cur = progress?.currentUrl;
  const phase = friendlyPhase(logs);
  // Rotate a "did you know" fact every few seconds while the run is in flight.
  const [factIdx, setFactIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFactIdx((i) => (i + 1) % RUN_FACTS.length), 8000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="fp-rise overflow-hidden rounded-xl border border-line bg-panel p-5">
      <div className="flex items-center gap-4">
        {/* animated ping rings — on-brand (form + ping) */}
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
          <span className="absolute inline-flex h-10 w-10 animate-ping rounded-full bg-accent/15 [animation-duration:2s] motion-reduce:animate-none" aria-hidden />
          <span className="absolute h-12 w-12 rounded-full border border-accent/15" aria-hidden />
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-panel-raised text-accent-soft ring-1 ring-line-strong">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
              <rect x="4" y="3" width="16" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">{headline}</p>
            {total > 1 && <span className="shrink-0 font-mono text-xs text-ink-faint">{current}/{total}</span>}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{sub}</p>
          {(phase || cur) && (
            <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-ink-faint">
              <span className="inline-flex h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-accent" />
              {phase && <span className="shrink-0">{phase}</span>}
              {cur && <span className="truncate font-mono text-ink-faint/70">{phase ? '· ' : ''}{cur}</span>}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3">
        <RunBar current={current} total={total} />
      </div>
      {/* Rotating fact — makes the wait purposeful + teaches what the tool does */}
      <div className="mt-3 flex items-start gap-2 border-t border-line pt-3">
        <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-soft" aria-hidden>
          <path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.6.6 1 1.2 1 2h6c0-.8.4-1.4 1-2A6 6 0 0012 3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p key={factIdx} className="fp-rise text-xs leading-relaxed text-ink-muted">
          <span className="font-semibold text-ink-secondary">Did you know?</span> {RUN_FACTS[factIdx]}
        </p>
      </div>
    </div>
  );
}

export function ResultsPanel({ results, progress, logs, running, landingPage, mode, onClear }: Props) {
  // Tally by mode-aware verdict (not raw status), so a healthy safe/detect run
  // counts as OK — never a misleading "WARN". Matches the per-result badge. FR-63.
  const levels = results.map((r) => runVerdict(r.reasonCode, r.formFound, r.finalStatus).level);
  const ok = levels.filter((l) => l === 'healthy').length;
  const detected = levels.filter((l) => l === 'detected').length;
  const attention = levels.filter((l) => l === 'attention').length;
  const failed = levels.filter((l) => l === 'failing').length;

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
      {/* Running loader — contextual copy (whole-site vs landing page) */}
      {running && <RunningLoader progress={progress} landingPage={landingPage} mode={mode} logs={logs} />}

      {/* Stats bar — only once there are results (no "0 TOTAL" mid-run) */}
      {results.length > 0 && (
        <div className="rounded-xl border border-line bg-panel p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatPill count={results.length} label="Total" color="bg-panel-raised text-ink-secondary" />
            {ok > 0 && <StatPill count={ok} label="OK" color="bg-ok/10 text-ok" />}
            {detected > 0 && <StatPill count={detected} label="Detected" color="bg-info/10 text-info" />}
            {attention > 0 && <StatPill count={attention} label="Attention" color="bg-warn/10 text-warn" />}
            {failed > 0 && <StatPill count={failed} label="Failed" color="bg-danger/10 text-danger" />}

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

      {/* Raw engine logs are intentionally NOT shown to users — they're internal
          diagnostics (version, proxy state, byte counts, discovery steps). The
          RunningLoader above surfaces a friendly, progress-tracking phase instead. FR-64 */}

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
