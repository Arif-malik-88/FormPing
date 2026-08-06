import type { ReactNode } from 'react';
import { cx } from './cx';

/**
 * KeptNotice (FR-38) — the ONE in-place "your data is kept in Projects"
 * confirmation, shown exactly where an action happened (the results area you
 * cleared, or the monitor card you stopped) instead of a floating toast. Calm
 * green, a check, an optional detail line, a "View in Projects" link, and a
 * dismiss. Used across Form Tester, Form Scheduler, Site Watch and Content
 * Changes so the reassurance looks and behaves identically everywhere.
 */
export function KeptNotice({
  title,
  subtitle,
  onDismiss,
  projectsLink = true,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onDismiss?: () => void;
  projectsLink?: boolean;
  className?: string;
}) {
  return (
    <div className={cx('fp-rise flex items-center gap-3 rounded-xl border border-ok/25 bg-ok/[0.08] px-4 py-3.5', className)}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ok/15 text-ok">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 111.4-1.4l2.8 2.79 6.8-6.79a1 1 0 011.4 0z" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {subtitle && <p className="truncate font-mono text-xs text-ink-faint">{subtitle}</p>}
      </div>
      {projectsLink && (
        <a href="/projects" className="shrink-0 text-xs font-semibold text-accent-soft transition-colors hover:text-accent">
          View in Projects →
        </a>
      )}
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 text-ink-faint transition-colors hover:text-ink">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
        </button>
      )}
    </div>
  );
}
