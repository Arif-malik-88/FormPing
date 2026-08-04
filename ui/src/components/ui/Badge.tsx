import type { ReactNode } from 'react';
import { cx } from './cx';

/**
 * Badge — a small non-status label chip (FR-35). For STATUS use StatusPill; this
 * is for neutral/accent tags (role pills, counts, "New", tool names, etc.).
 */
export type BadgeTone = 'neutral' | 'accent' | 'outline';

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-panel-raised text-ink-secondary ring-1 ring-line-strong',
  accent: 'bg-accent/15 text-accent-soft ring-1 ring-accent/25',
  outline: 'text-ink-muted ring-1 ring-line-strong',
};

export function Badge({
  children,
  tone = 'neutral',
  uppercase = false,
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  uppercase?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none',
        uppercase && 'uppercase tracking-wide',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
