'use client';

import { useState } from 'react';
import type { MonitorConfig, MonitorMode } from '@/types';
import { AiProviderSelect } from '../AiProviderSelect';
import { ProjectUrlPicker } from '../projects/ProjectUrlPicker';
import { cx } from '@/components/ui';

/**
 * Content Changes "command bar" (FR-39) — full-width control surface: the site
 * URL, the Mode (Snapshot / Compare / Watch), and Run, with the crawl settings in
 * Advanced. The reports take the full-width stage below. Mirrors the Form Tester.
 */

const MODES: { value: MonitorMode; label: string; desc: string; dot: string }[] = [
  { value: 'snapshot', label: 'Snapshot', desc: 'Save a baseline of the site', dot: 'bg-ok' },
  { value: 'compare', label: 'Compare', desc: 'Diff the site against its latest baseline', dot: 'bg-accent-soft' },
  { value: 'watch', label: 'Watch', desc: 'Re-compare on a schedule until you stop', dot: 'bg-warn' },
];

const INPUT = 'w-full rounded-lg border border-line-strong bg-ground px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-40';
const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint';

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => !disabled && onChange(!checked)} disabled={disabled} className={cx('relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40', checked ? 'bg-accent-strong' : 'bg-line-strong')}>
      <span className={cx('mt-0.5 inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200', checked ? 'translate-x-4' : 'translate-x-0.5')} />
    </button>
  );
}

interface Props {
  url: string;
  onUrl: (v: string) => void;
  config: MonitorConfig;
  onConfig: (c: MonitorConfig) => void;
  onRun: () => void;
  onStop: () => void;
  running: boolean;
  watchActive: boolean;
  checking: boolean;
  preflight: string | null;
}

export function MonitorCommandBar({ url, onUrl, config, onConfig, onRun, onStop, running, watchActive, checking, preflight }: Props) {
  const [advanced, setAdvanced] = useState(false);
  const set = <K extends keyof MonitorConfig>(key: K, v: MonitorConfig[K]) => onConfig({ ...config, [key]: v });
  const busy = running || watchActive;

  return (
    <div className="rounded-2xl border border-line-strong bg-gradient-to-b from-panel-raised to-panel shadow-lg shadow-black/30">
      {/* URL */}
      <div className="p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label htmlFor="monitor-url" className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Site URL</label>
          <ProjectUrlPicker align="right" onPick={(u) => onUrl(u)} />
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border border-line-strong bg-ground px-3.5 py-3 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
          <svg className="h-4 w-4 shrink-0 text-ink-faint" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM3.5 10a6.5 6.5 0 0112.06-3.4l-1.7 1.02a1 1 0 00-.46.7l-.28 1.68-1.5.6a1 1 0 00-.62.93v1.02l-1.3.86a1 1 0 00-.44.83v1.6A6.5 6.5 0 013.5 10z" /></svg>
          <input id="monitor-url" type="text" value={url} onChange={(e) => onUrl(e.target.value)} disabled={running} placeholder="https://client-site.com" spellCheck={false} autoComplete="off" className="w-full bg-transparent font-mono text-[15px] text-ink placeholder:text-ink-faint focus:outline-none disabled:opacity-50" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Mode</span>
          <div className="inline-flex gap-1 rounded-lg bg-ground p-1 ring-1 ring-line-strong">
            {MODES.map((m) => {
              const active = config.monitorMode === m.value;
              return (
                <button key={m.value} type="button" onClick={() => !running && set('monitorMode', m.value)} disabled={running} title={m.desc} className={cx('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50', active ? 'bg-gradient-to-b from-accent to-accent-strong text-white shadow-sm shadow-accent-deep/40' : 'text-ink-muted hover:text-ink')}>
                  <span className={cx('h-1.5 w-1.5 rounded-full', active ? 'bg-white/80' : m.dot)} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <span className="hidden h-7 w-px shrink-0 self-center bg-line lg:block" aria-hidden />

        <button type="button" onClick={() => setAdvanced((a) => !a)} aria-expanded={advanced} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted transition-colors hover:text-ink">
          Advanced
          <svg viewBox="0 0 20 20" fill="currentColor" className={cx('h-4 w-4 transition-transform', advanced && 'rotate-180')} aria-hidden><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
        </button>

        <div className="ml-auto">
          {busy ? (
            <button onClick={onStop} className="inline-flex items-center gap-2 rounded-lg bg-danger/10 px-5 py-2.5 text-sm font-semibold text-danger ring-1 ring-danger/30 transition-colors hover:bg-danger/20">
              <span className="h-2 w-2 rounded-sm bg-danger" />{watchActive ? 'Stop watching' : 'Stop'}
            </button>
          ) : (
            <button onClick={onRun} disabled={!url.trim() || checking} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-accent to-accent-strong px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-accent-deep/40 ring-1 ring-accent-soft/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden><path d="M6.3 3.5a1 1 0 00-1.5.87v11.26a1 1 0 001.5.87l9.5-5.63a1 1 0 000-1.74L6.3 3.5z" /></svg>
              {checking ? 'Checking…' : 'Run'}
            </button>
          )}
        </div>
      </div>

      {/* Watch note */}
      {config.monitorMode === 'watch' && (
        <div className="border-t border-warn/20 bg-warn/5 px-4 py-2 text-xs text-warn last:rounded-b-2xl sm:px-5">
          ⏱ Watch re-compares the site continuously (every {Math.max(1, Math.round(config.watchIntervalMs / 3_600_000))}h) until you stop it.
        </div>
      )}

      {/* Preflight */}
      {(checking || preflight) && (
        <div className={cx('border-t px-4 py-2 text-xs last:rounded-b-2xl sm:px-5', preflight ? 'border-warn/30 bg-warn/10 text-warn' : 'border-line bg-panel text-ink-muted')}>
          {checking ? 'Checking URL…' : preflight}
        </div>
      )}

      {/* Advanced */}
      {advanced && (
        <div className="grid gap-5 border-t border-line bg-panel/60 px-4 py-4 last:rounded-b-2xl sm:grid-cols-2 sm:px-5">
          <div>
            <label className={LABEL}>Max pages to crawl</label>
            <input type="number" min={1} max={50} value={config.maxPages} onChange={(e) => set('maxPages', parseInt(e.target.value, 10) || 10)} disabled={running} className={cx(INPUT, 'font-mono')} />
          </div>
          {config.monitorMode === 'watch' && (
            <div>
              <label className={LABEL}>Watch interval (hours)</label>
              <input type="number" min={1} step={1} value={Math.max(1, Math.round(config.watchIntervalMs / 3_600_000))} onChange={(e) => set('watchIntervalMs', Math.max(1, parseInt(e.target.value, 10) || 1) * 3_600_000)} disabled={running} className={cx(INPUT, 'font-mono')} />
            </div>
          )}
          <label className="flex items-center justify-between sm:col-span-2">
            <span><span className="block text-sm text-ink-secondary">Capture screenshots</span><span className="block text-[11px] text-ink-faint">Uses a real browser — slower</span></span>
            <Toggle checked={config.takeScreenshots} onChange={(v) => set('takeScreenshots', v)} disabled={running} />
          </label>
          <div className="sm:col-span-2">
            <AiProviderSelect label="AI summary" hint="Turn the diff into a readable paragraph" value={config.aiProvider} onChange={(v) => set('aiProvider', v)} disabled={running} />
          </div>
        </div>
      )}
    </div>
  );
}
