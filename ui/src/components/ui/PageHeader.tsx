import type { ReactNode } from 'react';
import { cx } from './cx';

/**
 * PageHeader (FR-35) — the consistent title block at the top of every area:
 * title, optional one-line description, and a right-aligned actions slot. Gives
 * every page the same frame so the app reads as one product.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex flex-wrap items-end justify-between gap-x-4 gap-y-2', className)}>
      <div className="min-w-0">
        <h1 className="text-lg font-bold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-[70ch] text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
