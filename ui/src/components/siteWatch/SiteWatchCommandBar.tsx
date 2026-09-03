'use client';

import { ProjectUrlPicker } from '@/components/projects/ProjectUrlPicker';
import { cx } from '@/components/ui';

/**
 * "Add a site to monitor" command bar (FR-39) — the top control surface of
 * Uptime & SSL, matching the Form Scheduler's command bar: target URL, check
 * frequency, and Add. Handles the "URL is down → Add anyway" confirm inline. The
 * list of monitored sites is the full-width stage below.
 */

export type Unit = 'min' | 'hour' | 'day';

const PRESETS: { label: string; amount: number; unit: Unit }[] = [
  { label: '5 min', amount: 5, unit: 'min' },
  { label: '15 min', amount: 15, unit: 'min' },
  { label: 'Hourly', amount: 1, unit: 'hour' },
  { label: 'Daily', amount: 1, unit: 'day' },
];

interface Props {
  url: string;
  onUrl: (v: string) => void;
  amount: number;
  onAmount: (v: number) => void;
  unit: Unit;
  onUnit: (v: Unit) => void;
  onSubmit: (force: boolean) => void;
  adding: boolean;
  error: string | null;
  needsConfirm: boolean;
}

export function SiteWatchCommandBar({ url, onUrl, amount, onAmount, unit, onUnit, onSubmit, adding, error, needsConfirm }: Props) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(false); }}
      className="rounded-2xl border border-line-strong bg-gradient-to-b from-panel-raised to-panel shadow-lg shadow-black/30"
    >
      {/* URL */}
      <div className="p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label htmlFor="site-url" className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Site URL</label>
          <ProjectUrlPicker align="right" onPick={(u) => onUrl(u)} />
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border border-line-strong bg-ground px-3.5 py-3 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
          <svg className="h-4 w-4 shrink-0 text-ink-faint" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM3.5 10a6.5 6.5 0 0112.06-3.4l-1.7 1.02a1 1 0 00-.46.7l-.28 1.68-1.5.6a1 1 0 00-.62.93v1.02l-1.3.86a1 1 0 00-.44.83v1.6A6.5 6.5 0 013.5 10z" /></svg>
          <input
            id="site-url"
            type="text"
            value={url}
            onChange={(e) => onUrl(e.target.value)}
            disabled={adding}
            placeholder="client-site.com"
            spellCheck={false}
            autoComplete="off"
            className="w-full bg-transparent font-mono text-[15px] text-ink placeholder:text-ink-faint focus:outline-none disabled:opacity-50"
          />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
          We check that this URL loads and its SSL certificate is valid, on the schedule you set.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Check every</span>
          <div className="inline-flex gap-1 rounded-lg bg-ground p-1 ring-1 ring-line-strong">
            {PRESETS.map((p) => {
              const active = amount === p.amount && unit === p.unit;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => { onAmount(p.amount); onUnit(p.unit); }}
                  disabled={adding}
                  className={cx('rounded-md px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50', active ? 'bg-gradient-to-b from-accent to-accent-strong text-white shadow-sm shadow-accent-deep/40' : 'text-ink-muted hover:text-ink')}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <span className="flex items-center gap-1.5 text-xs text-ink-muted">
            or
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => onAmount(Math.max(1, Number(e.target.value) || 1))}
              disabled={adding}
              className="w-14 rounded-md border border-line-strong bg-ground px-2 py-1 text-center font-mono text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-40"
            />
            <select
              value={unit}
              onChange={(e) => onUnit(e.target.value as Unit)}
              disabled={adding}
              className="rounded-md border border-line-strong bg-ground px-2 py-1 text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-40"
            >
              <option value="min">min</option>
              <option value="hour">hours</option>
              <option value="day">days</option>
            </select>
          </span>
        </div>

        <div className="ml-auto">
          <button type="submit" disabled={adding || url.trim().length === 0} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-accent to-accent-strong px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-accent-deep/40 ring-1 ring-accent-soft/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
            {adding ? (
              <svg className="h-4 w-4 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
                <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path d="M10 5a.75.75 0 01.75.75v3.5h3.5a.75.75 0 010 1.5h-3.5v3.5a.75.75 0 01-1.5 0v-3.5h-3.5a.75.75 0 010-1.5h3.5v-3.5A.75.75 0 0110 5z" /></svg>
            )}
            {adding ? 'Adding monitor…' : 'Add monitor'}
          </button>
        </div>
      </div>

      {/* Error / down-confirm */}
      {error && (
        <div className={cx('border-t px-4 py-2.5 text-xs last:rounded-b-2xl sm:px-5', needsConfirm ? 'border-warn/30 bg-warn/10 text-warn' : 'border-danger/30 bg-danger/10 text-danger')}>
          {error}
          {needsConfirm && (
            <button type="button" onClick={() => onSubmit(true)} disabled={adding} className="mt-2 block rounded-md bg-warn/20 px-3 py-1.5 text-xs font-semibold text-warn ring-1 ring-warn/40 transition hover:bg-warn/30 disabled:opacity-40">
              {adding ? 'Adding…' : 'Add anyway — monitor for recovery'}
            </button>
          )}
        </div>
      )}

      <p className="border-t border-line px-4 py-2 text-[11px] text-ink-faint last:rounded-b-2xl sm:px-5">
        You&rsquo;ll only get a Slack alert when something changes — the site goes down, comes back up, or a certificate is close to expiring.
      </p>
    </form>
  );
}
