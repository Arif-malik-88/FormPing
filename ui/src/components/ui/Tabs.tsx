'use client';

import type { ReactNode } from 'react';
import { cx } from './cx';

/**
 * Tabs (FR-35) — a controlled segmented control. The parent owns the active value
 * (so it can also drive routing / URL state). Used for in-page section switches
 * like Team's "Members & roles | Bug reports".
 */
export interface TabItem<T extends string = string> {
  value: T;
  label: ReactNode;
  /** Optional trailing count/badge. */
  badge?: ReactNode;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cx('inline-flex items-center gap-1 rounded-xl bg-panel/70 p-1 ring-1 ring-line', className)} role="tablist">
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              active
                ? 'bg-gradient-to-b from-accent to-accent-strong text-white shadow-sm shadow-accent-deep/40 ring-1 ring-accent-soft/20'
                : 'text-ink-muted hover:bg-panel hover:text-ink',
            )}
          >
            {it.label}
            {it.badge != null && (
              <span
                className={cx(
                  'rounded-full px-1.5 py-px text-[10px] font-bold leading-none',
                  active ? 'bg-white/20 text-white' : 'bg-line-strong text-ink-secondary',
                )}
              >
                {it.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
