import { cx } from '@/components/ui';

/**
 * FR-63/FR-64 — one shared "what we found" summary, used by BOTH the Form Tester
 * card and the Form Scheduler run rows so they read identically. Renders an
 * explanatory sentence with the key facts as highlighted pills: the form TYPE in
 * accent, structure / field-count / embed-kind as neutral pills, CAPTCHA in amber.
 */

type Size = 'sm' | 'lg';
type Tone = 'type' | 'fact' | 'captcha';

function Pill({ children, tone, size }: { children: React.ReactNode; tone: Tone; size: Size }) {
  const tones: Record<Tone, string> = {
    type: 'border-accent/30 bg-accent/12 text-accent-soft',
    fact: 'border-line-strong bg-panel-raised text-ink-secondary',
    captcha: 'border-warn/30 bg-warn/12 text-warn',
  };
  return (
    <span className={cx('mx-0.5 inline-flex items-center rounded-md border font-semibold', size === 'lg' ? 'px-2 py-0.5' : 'px-1.5 py-0.5', tones[tone])}>
      {children}
    </span>
  );
}

export interface FormSummaryProps {
  formType?: 'native' | 'third-party';
  embedProvider?: string | null;
  embedKind?: 'iframe' | 'script' | 'container' | null;
  isMultiStep?: boolean;
  fieldCount?: number;
  /** Only show the structure pill when step-ness is actually known (new records). */
  stepKnown?: boolean;
  captchaPresent?: boolean;
  size?: Size;
}

export function FormSummary({
  formType,
  embedProvider,
  embedKind,
  isMultiStep,
  fieldCount,
  stepKnown,
  captchaPresent,
  size = 'sm',
}: FormSummaryProps) {
  const embed = formType === 'third-party';
  const native = formType === 'native' || (!embed && (fieldCount ?? 0) > 0);
  if (!embed && !native) return null;

  const text = size === 'lg' ? 'text-[15px]' : 'text-xs';

  return (
    <p className={cx('leading-loose text-ink-muted', text)}>
      We found a{' '}
      {native ? (
        <>
          <Pill tone="type" size={size}>Native form</Pill>
          {' — it’s '}
          {stepKnown && <Pill tone="fact" size={size}>{isMultiStep ? 'Multi-step' : 'Single-step'}</Pill>}
          {typeof fieldCount === 'number' && fieldCount > 0 && (
            <>{stepKnown ? ' with ' : ' '}<Pill tone="fact" size={size}>{fieldCount} fields</Pill></>
          )}
          {', built into the page '}
          <span className="text-ink-faint">(not an iframe)</span>
          {captchaPresent && <>, and it&rsquo;s <Pill tone="captcha" size={size}>CAPTCHA</Pill> protected</>}.
        </>
      ) : (
        <>
          <Pill tone="type" size={size}>Third-party{embedProvider ? ` · ${embedProvider}` : ''}</Pill>
          {' form, embedded via '}
          <Pill tone="fact" size={size}>{embedKind ?? 'an embed'}</Pill>{' '}
          <span className="text-ink-faint">(cross-origin — can&rsquo;t auto-fill)</span>
          {captchaPresent && <>, <Pill tone="captcha" size={size}>CAPTCHA</Pill> protected</>}.
        </>
      )}
    </p>
  );
}
