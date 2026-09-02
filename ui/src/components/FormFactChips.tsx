import { cx } from '@/components/ui';

/**
 * FR-64 — the "key facts" about a detected form, rendered as small styled chips
 * so they're scannable and consistent across the Form Tester card and the Form
 * Scheduler run rows: form type (native / third-party + provider), how it's
 * mounted (in-page vs iframe), single- vs multi-step, and field count. We
 * deliberately do NOT show the raw form id/UUID — the page/slug (shown as the
 * headline by the caller) is the meaningful identifier.
 */

type Tone = 'neutral' | 'info' | 'warn';

const TONES: Record<Tone, string> = {
  neutral: 'bg-panel-raised text-ink-secondary ring-line-strong',
  info: 'bg-accent/12 text-accent-soft ring-accent/25',
  warn: 'bg-warn/12 text-warn ring-warn/25',
};

export function Chip({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1', TONES[tone])}>
      {children}
    </span>
  );
}

export interface FormFacts {
  formType?: 'native' | 'third-party';
  embedProvider?: string | null;
  embedKind?: 'iframe' | 'script' | 'container' | null;
  isMultiStep?: boolean;
  fieldCount?: number;
  /** True only when step-ness is actually known (new records) — legacy runs omit it. */
  stepKnown?: boolean;
  captchaPresent?: boolean;
}

function mountLabel(kind?: string | null): string {
  switch (kind) {
    case 'iframe': return 'iframe embed';
    case 'script': return 'script embed';
    case 'container': return 'embedded';
    default: return 'embedded';
  }
}

/** A row of chips summarising the detected form. Renders nothing if there's no
 *  form fact to show. */
export function FormFactChips(facts: FormFacts) {
  const embed = facts.formType === 'third-party';
  const native = facts.formType === 'native' || (!embed && (facts.fieldCount ?? 0) > 0);
  const chips: React.ReactNode[] = [];

  if (embed) {
    chips.push(<Chip key="type" tone="info">Third-party{facts.embedProvider ? ` · ${facts.embedProvider}` : ''}</Chip>);
    chips.push(<Chip key="mount">{mountLabel(facts.embedKind)}</Chip>);
  } else if (native) {
    chips.push(<Chip key="type" tone="info">Native form</Chip>);
    chips.push(<Chip key="mount">In-page (not an iframe)</Chip>);
  }

  if (facts.stepKnown) {
    chips.push(<Chip key="step">{facts.isMultiStep ? 'Multi-step' : 'Single-step'}</Chip>);
  }
  if (typeof facts.fieldCount === 'number' && facts.fieldCount > 0) {
    chips.push(<Chip key="fields">{facts.fieldCount} field{facts.fieldCount === 1 ? '' : 's'}</Chip>);
  }
  if (facts.captchaPresent) {
    chips.push(<Chip key="captcha" tone="warn">CAPTCHA</Chip>);
  }

  if (chips.length === 0) return null;
  return <div className="flex flex-wrap items-center gap-1.5">{chips}</div>;
}
