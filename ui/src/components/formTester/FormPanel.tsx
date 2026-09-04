import type { DetectedFormField, SubmitMode } from '@/types';
import { aboutIsTitle, displayName, DOT, KindIcon, type PreparedForm, type Tone } from './formMeta';

/**
 * FR-75 — one form's detail block inside the multi-form results log: a category
 * head with status pill, then the form title · source · type/fields/security
 * chips · a field-name preview · tracking. Newsletter/Search get a highlighted
 * category chip. Site-wide forms say so. In Live mode an untested lead form shows
 * an opt-in "Submit a live test" button (disabled for now — per-form live submit
 * is a follow-up; single-form Live still submits directly).
 */

const RAIL: Record<PreparedForm['rail'], string> = {
  ok: 'bg-ok',
  accent: 'bg-accent',
  info: 'bg-info',
};

const STATUS_PILL: Record<Tone, string> = {
  ok: 'text-ok bg-ok/12 ring-ok/30',
  info: 'text-info bg-info/12 ring-info/30',
  warn: 'text-warn bg-warn/12 ring-warn/30',
  danger: 'text-danger bg-danger/12 ring-danger/30',
  idle: 'text-ink-muted bg-idle/12 ring-line-strong',
};

// A field that belongs to the site chrome (a header/footer search box), not to
// this form — it gets pulled in because it lives near the form in the DOM. We
// flag it so the count + list read honestly. FR-75.
function isGlobalField(f: DetectedFormField): boolean {
  return f.type === 'search' || /search/i.test(f.name ?? '') || /search/i.test(f.label ?? '');
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 opacity-80" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4H5.5A1.5 1.5 0 004 5.5v9A1.5 1.5 0 005.5 16h9a1.5 1.5 0 001.5-1.5V13M12 4h4v4M16 4l-7 7" />
    </svg>
  );
}

/** The "We detected a Newsletter/Searchbar form" highlighted chip. */
function CategoryChip({ text }: { text: string }) {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-info/30 bg-info/12 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-info">
      <svg viewBox="0 0 20 20" className="h-2.5 w-2.5" fill="currentColor" aria-hidden><circle cx="10" cy="10" r="8" /></svg>
      {text}
    </span>
  );
}

/** Small uppercase row label ("FORM TITLE", "FIELDS", "TRACKING"). */
function RowLabel({ children }: { children: React.ReactNode }) {
  return <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-ink-faint">{children}</span>;
}

export function FormPanel({ prepared, mode }: { prepared: PreparedForm; mode: SubmitMode }) {
  const { form, tested, status, rail, isMultiStep } = prepared;
  const lead = rail !== 'info';
  const showTitle = Boolean(form.about) && !aboutIsTitle(form);
  const categoryChip =
    form.kind === 'newsletter' ? 'We detected a Newsletter form'
    : form.kind === 'search' ? 'We detected a Searchbar input form'
    : null;

  const utm = form.tracking?.utm ?? [];
  const other = form.tracking?.other ?? [];
  const hasTracking = utm.length > 0 || other.length > 0;
  // Tracking only makes sense for a lead form (a search box captures nothing).
  const showTracking = lead;

  const fields = form.fields.filter((f) => f.label || f.name || f.type);
  const hasGlobal = fields.some(isGlobalField);
  const FIELD_CAP = 10;

  return (
    <div className="fp-rise relative overflow-hidden rounded-xl border border-line bg-panel p-5">
      <span className={`absolute inset-y-0 left-0 w-[3px] ${RAIL[rail]}`} aria-hidden />

      {/* Head: icon + category name, status pill top-aligned with the heading */}
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${rail === 'ok' ? 'border-ok/30 bg-ok/12 text-ok' : rail === 'accent' ? 'border-accent/30 bg-accent/12 text-accent-soft' : 'border-info/30 bg-info/12 text-info'}`}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
            <KindIcon kind={form.kind} />
          </svg>
        </span>
        <h4 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight text-ink">{displayName(form)}</h4>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1 ${STATUS_PILL[status.tone]}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${DOT[status.tone]}`} />
          {status.label}
        </span>
      </div>

      {/* Body — indented to align under the heading (icon width + gap) */}
      <div className="mt-4 flex flex-col gap-3.5 sm:pl-[52px]">
        {/* Site-wide forms (a header/footer search or newsletter that sits on every
            page) announce that up front, so it's clear this isn't a page-specific form. */}
        {form.siteWide && (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-line-strong bg-panel-raised px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
              <circle cx="10" cy="10" r="7.5" /><path strokeLinecap="round" d="M2.5 10h15M10 2.5c2.2 2.6 2.2 12.4 0 15M10 2.5c-2.2 2.6-2.2 12.4 0 15" />
            </svg>
            Global{form.seenOn > 1 ? ` · on all ${form.seenOn} pages` : ''} · site header / footer
          </span>
        )}
        {categoryChip && <CategoryChip text={categoryChip} />}

        {showTitle && (
          <div className="flex flex-wrap items-baseline gap-2 leading-normal">
            <RowLabel>Form title</RowLabel>
            <span className="text-[15px] font-semibold text-accent-soft">&ldquo;{form.about}&rdquo;</span>
          </div>
        )}

        <a href={form.url} target="_blank" rel="noreferrer" title={form.url} className="inline-flex w-fit max-w-full items-center gap-1.5 font-mono text-[13px] text-accent-soft transition-colors hover:underline">
          <ExternalLinkIcon />
          <span className="truncate">{form.url}</span>
        </a>

        {/* Type · fields · structure · security chips */}
        <div className="flex flex-wrap items-center gap-2">
          <Chip>{form.formType === 'third-party' ? `Third-party${form.provider ? ` · ${form.provider}` : ''}` : 'Native form'}</Chip>
          {tested && typeof isMultiStep === 'boolean' && <Chip>{isMultiStep ? 'Multi-step' : 'Single-step'}</Chip>}
          <Chip><b className="font-mono font-bold text-ink">{form.fieldCount}</b> field{form.fieldCount === 1 ? '' : 's'}</Chip>
          {form.security?.captcha ? (
            <Chip tone="captcha">
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M6 9V6.5a4 4 0 018 0V9M5 9h10a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6a1 1 0 011-1z" /></svg>
              CAPTCHA
            </Chip>
          ) : lead ? (
            <Chip>No CAPTCHA</Chip>
          ) : null}
        </div>

        {/* Field-name preview — each field a chip, aligned next to the label;
            global (site header/footer) fields are marked so they're not mistaken
            for part of this form. FR-75. */}
        {fields.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-start gap-x-2 gap-y-2">
              <span className="mt-1"><RowLabel>Fields</RowLabel></span>
              <div className="flex min-w-0 flex-wrap gap-1.5">
                {fields.slice(0, FIELD_CAP).map((f, i) => {
                  const g = isGlobalField(f);
                  return (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[13px] ${g ? 'border-info/30 bg-info/10 text-info' : 'border-line-strong bg-panel-raised text-ink-secondary'}`}
                    >
                      {f.label || f.name || f.type}
                      {g && <span className="rounded bg-info/20 px-1 py-px font-sans text-[10px] font-semibold uppercase tracking-wide">global</span>}
                    </span>
                  );
                })}
                {fields.length > FIELD_CAP && <span className="self-center text-xs text-ink-faint">+{fields.length - FIELD_CAP} more</span>}
              </div>
            </div>
            {hasGlobal && (
              <p className="text-xs leading-relaxed text-ink-faint">
                <span className="font-semibold text-info">Global</span> fields (a site-wide header/footer input like search) appear on every page — they&rsquo;re not really part of this form.
              </p>
            )}
          </div>
        )}

        {/* Tracking / UTM */}
        {showTracking && (
          <div className="flex flex-wrap items-center gap-2">
            <RowLabel>Tracking</RowLabel>
            {hasTracking ? (
              <>
                {utm.map((p) => (
                  <span key={p} className="rounded-md border border-ok/28 bg-ok/12 px-2 py-0.5 font-mono text-xs text-ok">{p}</span>
                ))}
                {other.map((p) => (
                  <span key={p} className="rounded-md border border-line-strong bg-panel-raised px-2 py-0.5 font-mono text-xs text-ink-secondary">{p}</span>
                ))}
              </>
            ) : (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-warn/30 bg-warn/12 px-3 py-1 text-xs font-medium text-warn">
                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M10 13.5v-4M10 6.8v.1M10 2.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15z" /></svg>
                No UTM params — leads won&rsquo;t carry a campaign source
              </span>
            )}
          </div>
        )}

        {/* Live mode — opt-in per-form submit (disabled for now; wiring is a follow-up).
            The tested contact form is submitted directly, so its button is not shown. */}
        {mode === 'live' && lead && !tested && (
          <button
            type="button"
            disabled
            title="Per-form live submit is coming soon. For now, run a single form in Live mode to submit it."
            className="mt-1 inline-flex w-fit cursor-not-allowed items-center gap-2 rounded-lg border border-line-strong bg-panel-raised px-3.5 py-2 text-[13px] font-semibold text-ink-muted opacity-70"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M5 4l11 6-11 6V4z" /></svg>
            Submit a live test
            <span className="rounded bg-ground px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">Soon</span>
          </button>
        )}
      </div>
    </div>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: 'captcha' }) {
  const cls = tone === 'captcha'
    ? 'border-warn/30 bg-warn/10 text-warn'
    : 'border-line-strong bg-panel-raised text-ink-secondary';
  return <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[13px] font-medium ${cls}`}>{children}</span>;
}
