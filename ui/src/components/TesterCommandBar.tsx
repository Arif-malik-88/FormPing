'use client';

import { useState } from 'react';
import type { RunConfig, SubmitMode } from '@/types';
import { AiProviderSelect } from './AiProviderSelect';
import { ProjectUrlPicker } from './projects/ProjectUrlPicker';
import { cx } from '@/components/ui';

/**
 * The Form Tester "command bar" (FR-38) — a full-width control surface at the top
 * of the page: the target URL, the safety-critical Mode, the Landing-page toggle,
 * and Run. Power-user settings live in Advanced. The results take the full-width
 * stage below — the test-runner layout, not a side panel.
 *
 * SINGLE-URL by design: one target → one report. The multi-URL / batch capability
 * is NOT removed — the engine + page `handleRun` still accept an array (they split
 * the value on newlines). To bring batch back to the UI, swap this single `<input>`
 * for a `<textarea>` again; nothing downstream changes.
 */

const MODES: { value: SubmitMode; label: string; desc: string; dot: string }[] = [
  { value: 'detect-only', label: 'Detect', desc: 'No interaction — just checks the form exists', dot: 'bg-idle' },
  { value: 'safe', label: 'Safe', desc: 'Fills the form but does not submit', dot: 'bg-warn' },
  { value: 'live', label: 'Live', desc: 'Fills and submits — sends a real message', dot: 'bg-danger' },
];

const INPUT = 'w-full rounded-lg border border-line-strong bg-ground px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-40';
const LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint';

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cx('relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40', checked ? 'bg-accent-strong' : 'bg-line-strong')}
    >
      <span className={cx('mt-0.5 inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200', checked ? 'translate-x-4' : 'translate-x-0.5')} />
    </button>
  );
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  onStop: () => void;
  running: boolean;
  config: RunConfig;
  onConfig: (c: RunConfig) => void;
  checking: boolean;
  preflight: string | null;
}

export function TesterCommandBar({ value, onChange, onRun, onStop, running, config, onConfig, checking, preflight }: Props) {
  const [advanced, setAdvanced] = useState(false);
  const set = <K extends keyof RunConfig>(key: K, v: RunConfig[K]) => onConfig({ ...config, [key]: v });
  const hasUrl = value.trim().length > 0;

  return (
    <div className="rounded-2xl border border-line-strong bg-gradient-to-b from-panel-raised to-panel shadow-lg shadow-black/30">
      {/* URL field */}
      <div className="p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label htmlFor="tester-url" className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Target URL</label>
          <ProjectUrlPicker align="right" onPick={(u) => onChange(u)} />
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border border-line-strong bg-ground px-3.5 py-3 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
          <svg className="h-4 w-4 shrink-0 text-ink-faint" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM3.5 10a6.5 6.5 0 0112.06-3.4l-1.7 1.02a1 1 0 00-.46.7l-.28 1.68-1.5.6a1 1 0 00-.62.93v1.02l-1.3.86a1 1 0 00-.44.83v1.6A6.5 6.5 0 013.5 10z" /></svg>
          <input
            id="tester-url"
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !running && hasUrl && !checking) onRun(); }}
            disabled={running}
            placeholder="https://client-site.com/contact"
            spellCheck={false}
            autoComplete="off"
            className="w-full bg-transparent font-mono text-[15px] text-ink placeholder:text-ink-faint focus:outline-none disabled:opacity-50"
          />
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line px-4 py-3 sm:px-5">
        {/* Mode segmented */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Mode</span>
          <div className="inline-flex gap-1 rounded-lg bg-ground p-1 ring-1 ring-line-strong">
            {MODES.map((m) => {
              const active = config.mode === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => !running && set('mode', m.value)}
                  disabled={running}
                  title={m.desc}
                  className={cx(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50',
                    active ? 'bg-gradient-to-b from-accent to-accent-strong text-white shadow-sm shadow-accent-deep/40' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  <span className={cx('h-1.5 w-1.5 rounded-full', active ? 'bg-white/80' : m.dot)} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <span className="hidden h-7 w-px shrink-0 self-center bg-line lg:block" aria-hidden />

        {/* Landing toggle */}
        <label className="flex cursor-pointer items-center gap-2">
          <Toggle checked={config.landingPage} onChange={(v) => set('landingPage', v)} disabled={running} />
          <span className="text-xs font-medium text-ink-secondary" title="Test the form on this exact URL — skip searching for a separate contact page.">Landing page</span>
        </label>

        <span className="hidden h-7 w-px shrink-0 self-center bg-line lg:block" aria-hidden />

        <button type="button" onClick={() => setAdvanced((a) => !a)} aria-expanded={advanced} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted transition-colors hover:text-ink">
          Advanced
          <svg viewBox="0 0 20 20" fill="currentColor" className={cx('h-4 w-4 transition-transform', advanced && 'rotate-180')} aria-hidden><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
        </button>

        {/* Run / Stop */}
        <div className="ml-auto">
          {running ? (
            <button onClick={onStop} className="inline-flex items-center gap-2 rounded-lg bg-danger/10 px-5 py-2.5 text-sm font-semibold text-danger ring-1 ring-danger/30 transition-colors hover:bg-danger/20">
              <span className="h-2 w-2 rounded-sm bg-danger" />Stop
            </button>
          ) : (
            <button onClick={onRun} disabled={!hasUrl || checking} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-accent to-accent-strong px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-accent-deep/40 ring-1 ring-accent-soft/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden><path d="M6.3 3.5a1 1 0 00-1.5.87v11.26a1 1 0 001.5.87l9.5-5.63a1 1 0 000-1.74L6.3 3.5z" /></svg>
              {checking ? 'Checking…' : 'Run test'}
            </button>
          )}
        </div>
      </div>

      {/* Live-mode safety note */}
      {config.mode === 'live' && (
        <div className="border-t border-danger/20 bg-danger/5 px-4 py-2 text-xs text-danger last:rounded-b-2xl sm:px-5">
          ⚠ Live mode submits real forms. Use only on sites you own or are authorized to test.
        </div>
      )}

      {/* Preflight / checking */}
      {(checking || preflight) && (
        <div className={cx('border-t px-4 py-2 text-xs last:rounded-b-2xl sm:px-5', preflight ? 'border-warn/30 bg-warn/10 text-warn' : 'border-line bg-panel text-ink-muted')}>
          {checking ? 'Checking URL…' : preflight}
        </div>
      )}

      {/* Advanced drawer */}
      {advanced && (
        <div className="grid gap-5 border-t border-line bg-panel/60 px-4 py-4 last:rounded-b-2xl sm:grid-cols-2 sm:px-5">
          <div className="sm:col-span-2">
            <label className={LABEL}>Test email</label>
            <input type="email" value={config.email} onChange={(e) => set('email', e.target.value)} disabled={running} className={cx(INPUT, 'font-mono')} />
            <p className="mt-1 text-[11px] text-ink-faint">The address used to fill the form. In Live mode, a message is actually sent to the site.</p>
          </div>
          <div>
            <label className={LABEL}>Timeout (ms)</label>
            <input type="number" min={1000} step={1000} value={config.timeout} onChange={(e) => set('timeout', parseInt(e.target.value, 10) || 15000)} disabled={running} className={cx(INPUT, 'font-mono')} />
          </div>
          <label className="flex items-center justify-between">
            <span className="text-sm text-ink-secondary">Show browser (headed)</span>
            <Toggle checked={config.headed} onChange={(v) => set('headed', v)} disabled={running} />
          </label>
          <div className="sm:col-span-2">
            <AiProviderSelect label="AI fallback" hint="Used only when contact-page or form scoring is too close to call" value={config.aiProvider} onChange={(v) => set('aiProvider', v)} disabled={running} />
          </div>
        </div>
      )}
    </div>
  );
}
