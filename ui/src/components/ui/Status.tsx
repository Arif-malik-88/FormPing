import type { ReactNode } from 'react';
import { STATUS, isLive, type StatusLevel } from '@/lib/design/status';
import { cx } from './cx';

/**
 * Status primitives (FR-35) — the visible half of the canonical status vocabulary.
 * All three render a `StatusLevel`, so a green dot means the same thing on every
 * screen (Projects rows, dashboards, public status page, toasts).
 */

/** Animated status dot — pulses for live (non-idle) levels. */
export function StatusDot({ level, pulse }: { level: StatusLevel; pulse?: boolean }) {
  const on = pulse ?? isLive(level);
  const dot = STATUS[level].dot;
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {on && <span className={cx('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', dot)} />}
      <span className={cx('relative inline-flex h-2 w-2 rounded-full', dot)} />
    </span>
  );
}

/** Soft pill: dot + label on a tinted background. The list/row status signal. */
export function StatusPill({
  level,
  children,
  pulse,
}: {
  level: StatusLevel;
  children: ReactNode;
  pulse?: boolean;
}) {
  const s = STATUS[level];
  const live = pulse ?? isLive(level);
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold', s.soft)}>
      {live ? <StatusDot level={level} pulse /> : <span className={cx('h-1.5 w-1.5 rounded-full', s.dot)} />}
      {children}
    </span>
  );
}

/** Inline dot + coloured label (no pill) — for dense detail lines. */
export function StatusText({
  level,
  children,
  pulse = false,
}: {
  level: StatusLevel;
  children: ReactNode;
  pulse?: boolean;
}) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-[11px] font-medium', STATUS[level].text)}>
      <StatusDot level={level} pulse={pulse} />
      {children}
    </span>
  );
}
