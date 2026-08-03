import { cx } from './cx';

/**
 * Skeleton (FR-35) — a shimmering placeholder block for loading states. Wraps the
 * shared `.fp-skeleton` shimmer (globals.css) so every loader looks the same.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('fp-skeleton rounded-md', className)} aria-hidden />;
}
