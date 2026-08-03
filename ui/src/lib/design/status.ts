/**
 * Canonical status vocabulary (FR-35).
 *
 * The app used to speak TWO status languages — Form Watch said
 * `healthy/attention/failing/pending` and Site Watch said `up/down/blocked/unknown`
 * — so a green dot didn't reliably mean the same thing on every screen. This module
 * is the ONE language: four levels, one colour + one dot for each, used identically
 * on Projects rows, dashboards, the public status page and toasts.
 *
 *   ok      emerald  — healthy / up / operational
 *   warn    amber    — needs attention / degraded / blocked
 *   danger  rose     — failing / down / critical
 *   idle    slate    — not monitored / pending / unknown
 *
 * The class strings reference the design tokens (`ok`, `warn`, `danger`, `idle`
 * from tailwind.config.ts), so colour stays centralised. Domain values map into a
 * level via the `from*` helpers below; presentational components (StatusDot,
 * StatusPill, StatusBadge in components/ui) render a level.
 */

import type { FormHealthLevel, ProjectRollup, SiteUpState } from '@/lib/projects/types';

export type StatusLevel = 'ok' | 'warn' | 'danger' | 'idle';

export interface StatusStyle {
  /** bg class for a solid dot */
  dot: string;
  /** text colour class */
  text: string;
  /** soft pill fill + text (badge background) */
  soft: string;
  /** ring class (1px inset ring on chips/monograms) */
  ring: string;
  /** left severity edge bar (rows / cards) */
  edge: string;
}

/** The one place status → colour is decided. Everything else references a level. */
export const STATUS: Record<StatusLevel, StatusStyle> = {
  ok: {
    dot: 'bg-ok',
    text: 'text-ok',
    soft: 'bg-ok/12 text-ok',
    ring: 'ring-ok/30',
    edge: 'bg-ok/80',
  },
  warn: {
    dot: 'bg-warn',
    text: 'text-warn',
    soft: 'bg-warn/12 text-warn',
    ring: 'ring-warn/30',
    edge: 'bg-warn/80',
  },
  danger: {
    dot: 'bg-danger',
    text: 'text-danger',
    soft: 'bg-danger/12 text-danger',
    ring: 'ring-danger/30',
    edge: 'bg-danger/90',
  },
  idle: {
    dot: 'bg-idle',
    text: 'text-ink-muted',
    soft: 'bg-idle/12 text-ink-secondary',
    ring: 'ring-white/10',
    edge: 'bg-idle/70',
  },
};

/** Whether a level should visibly "live" (pulsing dot) — only actively-good/bad. */
export function isLive(level: StatusLevel): boolean {
  return level !== 'idle';
}

// ── Domain → canonical level ──────────────────────────────────────────────────

export function fromFormLevel(l: FormHealthLevel | undefined | null): StatusLevel {
  switch (l) {
    case 'healthy':
      return 'ok';
    case 'attention':
      return 'warn';
    case 'failing':
      return 'danger';
    default:
      return 'idle'; // pending / unknown
  }
}

export function fromSiteState(s: SiteUpState | undefined | null): StatusLevel {
  switch (s) {
    case 'up':
      return 'ok';
    case 'blocked':
      return 'warn';
    case 'down':
      return 'danger';
    default:
      return 'idle'; // unknown
  }
}

export function fromChangeSeverity(sev: 'low' | 'medium' | 'high' | undefined, changesFound = 0): StatusLevel {
  if (!changesFound) return 'idle';
  if (sev === 'high') return 'danger';
  if (sev === 'medium') return 'warn';
  return 'ok';
}

/**
 * The Projects ROW / card status — the FR-37 four-state pill. Folds "is it
 * monitored?" and "is it healthy?" into ONE compact signal, with NO per-dimension
 * (SSL/form/uptime) detail (that lives inside the detail/dashboard):
 *
 *   ○ Not monitoring  (idle)   — no live scheduler
 *   ● Monitoring      (ok)     — live + everything healthy
 *   ● Attention       (warn)   — live + something needs a look
 *   ● Failing         (danger) — live + something down
 *
 * `severity` thresholds match the existing rollup severity scale.
 */
export function fromProjectRollup(r: ProjectRollup): { level: StatusLevel; label: string } {
  if (!r.monitored) return { level: 'idle', label: 'Not monitoring' };
  if (r.severity >= 30) return { level: 'danger', label: 'Failing' };
  if (r.severity >= 15) return { level: 'warn', label: 'Attention' };
  return { level: 'ok', label: 'Monitoring' };
}
