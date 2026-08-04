import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { cx } from './cx';

/**
 * Form controls (FR-35) — Input, Textarea, Select share one look; Field wraps any
 * of them with a label + optional hint/error. Token-based; native props pass through.
 */

const CONTROL =
  'w-full rounded-lg border border-line-strong bg-panel px-3 py-2 text-sm text-ink placeholder:text-ink-faint ' +
  'transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cx(CONTROL, className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cx(CONTROL, 'min-h-[80px] resize-y', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...rest },
  ref,
) {
  return <select ref={ref} className={cx(CONTROL, 'appearance-none pr-8', className)} {...rest} />;
});

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-ink-secondary">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[11px] text-danger">{error}</p>
      ) : (
        hint && <p className="text-[11px] text-ink-faint">{hint}</p>
      )}
    </div>
  );
}
