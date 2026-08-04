import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

/**
 * Button — the one button primitive (FR-35). Variants cover every case the app
 * needs; sizes keep hit-targets consistent. Token-based colours only.
 *
 *   primary    — indigo gradient; the main call-to-action
 *   secondary  — bordered panel; the common neutral action
 *   ghost      — text-only; low-emphasis / toolbar
 *   danger     — rose; destructive confirm
 *
 * Renders a real <button>, so all native props (type, disabled, onClick, aria-*)
 * pass straight through.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50';

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-b from-accent to-accent-strong text-white shadow-sm shadow-accent-deep/40 ' +
    'ring-1 ring-accent-soft/20 hover:from-accent-strong hover:to-accent-strong',
  secondary:
    'border border-line-strong bg-panel text-ink-secondary hover:border-ink-faint hover:text-ink',
  ghost: 'text-ink-muted hover:bg-panel hover:text-ink',
  danger: 'bg-danger/90 text-white ring-1 ring-danger/40 hover:bg-danger',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3.5 py-2 text-sm',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, type = 'button', ...rest },
  ref,
) {
  return <button ref={ref} type={type} className={cx(BASE, VARIANT[variant], SIZE[size], className)} {...rest} />;
});
