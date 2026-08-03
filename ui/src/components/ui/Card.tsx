import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

/**
 * Card — the standard panel surface (FR-35): panel background, hairline border,
 * rounded. `interactive` adds the hover lift used by clickable cards/rows.
 * Compose with CardHeader / CardBody or just drop children in.
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  /** Mute the surface (dashed border, dimmer) — e.g. a paused / not-monitored item. */
  muted?: boolean;
}

export function Card({ interactive, muted, className, ...rest }: CardProps) {
  return (
    <div
      className={cx(
        'rounded-xl border bg-panel/70 shadow-sm',
        muted ? 'border-dashed border-line' : 'border-line',
        interactive && 'transition-all hover:-translate-y-0.5 hover:border-line-strong',
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex items-start justify-between gap-3 border-b border-line px-5 py-4', className)}>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-ink">{title}</div>
        {subtitle && <div className="mt-0.5 truncate text-xs text-ink-faint">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('px-5 py-4', className)} {...rest} />;
}
