import { cx } from '@/components/ui';
import type { FormBrief, FormIdentifier, FormLocation, FormsOnPage, TrackingParams } from '@/types';

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

// ── FR-68: hidden tracking / UTM params ──────────────────────────────────────

/**
 * The tracking insight: if the form captures utm_* (and other click ids), list
 * them; if a form was found but captures NONE, a small light heads-up that its
 * leads won't carry a campaign source. Renders nothing when tracking is unknown
 * (no native form). FR-68.
 */
export function TrackingParamsLine({ tracking, size = 'sm' }: { tracking?: TrackingParams | null; size?: Size }) {
  if (!tracking) return null;
  const text = size === 'lg' ? 'text-[13px]' : 'text-[11px]';
  const has = tracking.utm.length > 0 || tracking.other.length > 0;

  if (!has) {
    return (
      <p className={cx('mt-2 inline-flex items-center gap-1.5 rounded-md border border-warn/20 bg-warn/5 px-2 py-1 text-warn/80', text)}>
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M10 13.5v-4M10 6.7v.1M10 2.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15z" /></svg>
        No UTM params detected — this form won’t attribute its leads to a campaign.
      </p>
    );
  }

  return (
    <div className={cx('mt-2 flex flex-wrap items-center gap-1.5', text)}>
      <span className="text-ink-faint">Captures tracking:</span>
      {tracking.utm.map((p) => (
        <span key={p} className="rounded border border-ok/25 bg-ok/10 px-1.5 py-0.5 font-mono text-ok">{p}</span>
      ))}
      {tracking.other.map((p) => (
        <span key={p} className="rounded border border-line-strong bg-panel-raised px-1.5 py-0.5 font-mono text-ink-secondary">{p}</span>
      ))}
      {tracking.utm.length === 0 && <span className="text-warn/70">· but no utm_* params</span>}
    </div>
  );
}

// ── FR-68: "N forms on this page" ────────────────────────────────────────────

const KIND_LABEL: Record<string, string> = {
  contact: 'Contact form',
  newsletter: 'Newsletter',
  search: 'Search box',
  login: 'Login form',
  other: 'Other form',
  'third-party': 'Third-party form',
};

function briefLabel(b: FormBrief): string {
  if (b.kind === 'third-party') return b.provider ? `${b.provider} form` : 'Third-party form';
  return KIND_LABEL[b.kind] ?? 'Form';
}

/** A human slug for a form (id / name / action path), never a raw hash/UUID. */
function formSlug(id: FormIdentifier | null): string | null {
  if (!id) return null;
  let raw = (id.id || id.name || '').trim();
  if (!raw && id.action) {
    try { raw = new URL(id.action, 'http://x').pathname.replace(/^\//, ''); } catch { raw = id.action; }
  }
  raw = raw.trim();
  if (!raw) return null;
  // Drop opaque machine ids (long hex / UUID-ish) — they're noise, not a slug.
  if (/^[0-9a-f]{8,}$/i.test(raw) || /^[0-9a-f-]{20,}$/i.test(raw)) return null;
  return raw.slice(0, 40);
}

/** "in the footer" / "under 'Subscribe'" — whichever we found. */
function locationText(loc?: FormLocation): string | null {
  if (!loc) return null;
  if (loc.landmark) return `in the ${loc.landmark}`;
  if (loc.heading) return `under “${loc.heading}”`;
  return null;
}

/** A `page#id` jump-to link when we have both the page URL and an anchor id. */
function deepLink(pageUrl: string | undefined, loc?: FormLocation): string | null {
  if (!pageUrl || !loc?.anchorId) return null;
  try {
    const u = new URL(pageUrl);
    u.hash = loc.anchorId;
    return u.toString();
  } catch {
    return null;
  }
}

/** Inline "also a newsletter and a search box" phrase from the other forms. */
function othersSummary(others: FormBrief[]): string {
  const counts = new Map<string, number>();
  for (const o of others) {
    const l = briefLabel(o);
    counts.set(l, (counts.get(l) ?? 0) + 1);
  }
  const parts = [...counts].map(([l, n]) => (n > 1 ? `${n} ${l.toLowerCase()}s` : `a ${l.toLowerCase()}`));
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * "N forms on this page" — a native <details> disclosure (no client state) that
 * says which form we tested and lists the others by kind + slug. Renders nothing
 * for a single-form page, so pages with one form read exactly as before. FR-68.
 */
export function FormsOnPageLine({ forms, pageUrl, size = 'sm' }: { forms?: FormsOnPage | null; pageUrl?: string; size?: Size }) {
  if (!forms || forms.total < 2) return null;
  const text = size === 'lg' ? 'text-[13px]' : 'text-[11px]';
  const testedLabel = forms.tested ? (KIND_LABEL[forms.tested.kind] ?? 'form').toLowerCase() : 'strongest form';

  return (
    <details className="group mt-2 rounded-lg border border-line-strong bg-panel-raised/40 px-3 py-2 [&_summary::-webkit-details-marker]:hidden">
      <summary className={cx('flex cursor-pointer list-none flex-wrap items-center gap-x-1.5 gap-y-1 font-medium text-ink-secondary', text)}>
        <span className="inline-flex items-center rounded-md border border-line-strong bg-panel-raised px-1.5 py-0.5 font-semibold text-ink">{forms.total} forms</span>
        <span>on this page — testing the <span className="text-ink">{testedLabel}</span></span>
        {forms.others.length > 0 && <span className="text-ink-faint">· also {othersSummary(forms.others)}</span>}
        <svg viewBox="0 0 20 20" className="ml-auto h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform group-open:rotate-180" fill="currentColor" aria-hidden><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
      </summary>
      {forms.multipleContacts && (
        <p className={cx('mt-2 flex items-start gap-1.5 text-warn', text)}>
          <svg viewBox="0 0 20 20" className="mt-0.5 h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M10 7.5v3.5M10 13.7v.1M8.6 3.4L2.3 14.5A1.6 1.6 0 003.7 17h12.6a1.6 1.6 0 001.4-2.5L11.4 3.4a1.6 1.6 0 00-2.8 0z" /></svg>
          Two or more forms look like contact forms — we tested the strongest one.
        </p>
      )}
      <ul className={cx('mt-2 space-y-1', text)}>
        {forms.others.map((o, i) => {
          const slug = formSlug(o.identifier);
          const where = locationText(o.location);
          const link = deepLink(pageUrl, o.location);
          return (
            <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-ink-muted">
              <span className="h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
              <span className="text-ink-secondary">{briefLabel(o)}</span>
              {typeof o.fieldCount === 'number' && o.kind !== 'third-party' && (
                <span className="text-ink-faint">· {o.fieldCount} field{o.fieldCount === 1 ? '' : 's'}</span>
              )}
              {where && <span className="text-ink-faint">· {where}</span>}
              {link ? (
                <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-accent-soft hover:text-accent">
                  · jump to it
                  <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M7 4H5.5A1.5 1.5 0 004 5.5v9A1.5 1.5 0 005.5 16h9a1.5 1.5 0 001.5-1.5V13M12 4h4v4M16 4l-7 7" /></svg>
                </a>
              ) : (
                slug && <span className="truncate font-mono text-ink-faint">· {slug}</span>
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
