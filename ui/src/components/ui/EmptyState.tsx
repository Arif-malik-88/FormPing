import type { ReactNode } from 'react';
import { cx } from './cx';

/**
 * EmptyState (FR-35) — the designed "nothing here yet" surface: an icon, a title,
 * a short explanation, and an optional primary action. Used for empty lists,
 * cleared filters, and first-run states so blank screens read intentional, not broken.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-panel/40 px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-panel-raised text-ink-muted ring-1 ring-line-strong">
          {icon}
        </span>
      )}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-[46ch] text-xs leading-relaxed text-ink-faint">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
