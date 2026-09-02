'use client';
import { useState } from 'react';
import type { SiteResult } from '@/types';
import { StatusBadge, ReasonCodeBadge } from './StatusBadge';
import { getReasonMessage, type Severity } from '@/lib/reasonMessages';
import { friendlyNotes } from '@/lib/friendlyNotes';
import { FormFactChips } from './FormFactChips';

const BANNER_STYLES: Record<Severity, { wrap: string; icon: string; title: string }> = {
  success: { wrap: 'bg-ok/10 border-ok/20', icon: '✓', title: 'text-ok' },
  info: { wrap: 'bg-idle/10 border-line-strong', icon: 'ℹ', title: 'text-ink-secondary' },
  warn: { wrap: 'bg-warn/10 border-warn/20', icon: '⚠', title: 'text-warn' },
  error: { wrap: 'bg-danger/10 border-danger/20', icon: '✕', title: 'text-danger' },
};

function FieldRow({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-xs">
      <span className="w-32 shrink-0 text-ink-faint">{label}</span>
      <span className={`break-all text-ink-secondary ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function CheckIcon({ ok }: { ok: boolean }) {
  return ok ? <span className="text-xs text-ok">✓</span> : <span className="text-xs text-ink-faint">✗</span>;
}

function Pill({ label, active, color }: { label: string; active: boolean; color: string }) {
  if (!active) return null;
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{label}</span>;
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}
function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}
function pathOf(url: string | null): string {
  if (!url) return '';
  try { return new URL(url).pathname || '/'; } catch { return url; }
}
/** Small neutral marker for informational sub-lines (a fact, not a pass/fail). */
function Dot() {
  return <span className="text-xs text-ink-faint">•</span>;
}

export function ResultCard({ result }: { result: SiteResult }) {
  const [expanded, setExpanded] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const domain = getDomain(result.normalizedUrl);

  const statusBorder: Record<string, string> = {
    pass: 'border-ok/25',
    fail: 'border-danger/25',
    warn: 'border-warn/25',
    error: 'border-line-strong',
  };
  const border = statusBorder[result.finalStatus] ?? 'border-line';

  const reason = getReasonMessage(result.reasonCode);
  const banner = BANNER_STYLES[reason.severity];
  const hasErrors = result.errors && result.errors.length > 0;
  // Hide developer-internal notes (scores/signals/byte counts) from the card. FR-64.
  const notes = friendlyNotes(result.notes);

  return (
    <div className={`fp-rise overflow-hidden rounded-xl border ${border} bg-panel`}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
            alt=""
            width={16}
            height={16}
            className="shrink-0 rounded opacity-70"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-medium text-ink">{domain}</p>
            <p className="truncate font-mono text-xs text-ink-faint">{result.normalizedUrl}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-xs text-ink-faint">{formatMs(result.durationMs)}</span>
          <StatusBadge status={result.finalStatus} />
        </div>
      </div>

      {/* Reason banner */}
      <div className={`mx-4 mb-3 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${banner.wrap}`}>
        <span className={`${banner.title} mt-0.5 shrink-0 text-sm font-bold leading-5`}>{banner.icon}</span>
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${banner.title}`}>{reason.title}</p>
          {reason.description && <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{reason.description}</p>}
        </div>
      </div>

      {/* Errors list (field-level failures) */}
      {hasErrors && (
        <div className="mx-4 mb-3 rounded-lg border border-danger/20 bg-danger/5">
          <div className="flex items-center gap-2 border-b border-danger/20 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-danger">
              {result.errors.length} field error{result.errors.length !== 1 ? 's' : ''}
            </span>
          </div>
          <ul className="space-y-1 px-3 py-2">
            {result.errors.slice(0, 8).map((err, i) => (
              <li key={i} className="break-all font-mono text-xs text-danger/80">
                <span className="mr-1 text-danger/60">·</span>{err}
              </li>
            ))}
            {result.errors.length > 8 && <li className="text-xs italic text-ink-faint">+{result.errors.length - 8} more…</li>}
          </ul>
        </div>
      )}

      {/* Quick status row */}
      <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
        <ReasonCodeBadge code={result.reasonCode} />
        <Pill label="CAPTCHA" active={result.captchaDetected} color="bg-warn/15 text-warn" />
        <Pill label="Anti-Bot" active={result.antiBotDetected} color="bg-danger/15 text-danger" />
        <Pill label="Thank-You ✓" active={result.thankYouDetected} color="bg-ok/15 text-ok" />
        <Pill label="Inline Success ✓" active={result.inlineSuccessDetected} color="bg-ok/15 text-ok" />
      </div>

      {/* What we found — plain, accurate summary: where the form is + what kind */}
      {(() => {
        const hasEmbed = result.formType === 'third-party';
        const hasNativeForm = result.formFound && !hasEmbed;
        const aFormExists = hasNativeForm || hasEmbed;
        const fieldNames = (() => {
          const names = (result.fields ?? []).map((f) => f.label?.trim()).filter(Boolean) as string[];
          if (!names.length) return null;
          const shown = names.slice(0, 6);
          const more = names.length > shown.length ? `, +${names.length - shown.length} more` : '';
          return `${shown.join(', ')}${more}`;
        })();
        const pageKnown = Boolean(result.resolvedContactPage || result.finalUrl);
        const pagePath = pathOf(result.resolvedContactPage) || pathOf(result.finalUrl) || '/';
        // In default (non-landing) mode, FormPing may search the site and end up
        // testing a DIFFERENT page than the URL typed. Surface that plainly so the
        // result isn't confusing ("I entered X, why does it say Y?"). FR-64.
        const enteredPath = pathOf(result.normalizedUrl) || '/';
        const enteredLabel = enteredPath === '/' ? 'the homepage' : enteredPath;
        const testedElsewhere = !result.landingPageMode && aFormExists && enteredPath !== pagePath;
        // Nothing useful to add beyond the reason banner (e.g. contact page not found).
        if (!aFormExists && !pageKnown) return null;
        return (
          <div className="space-y-1.5 px-4 pb-3">
            {/* Headline — where the form lives (or that none was found there) */}
            <div className="flex items-start gap-2 text-xs">
              <span className="mt-0.5"><CheckIcon ok={aFormExists} /></span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-ink-secondary">
                  <span className="font-medium text-ink">{aFormExists ? 'Form found on' : 'No form found on'}</span>{' '}
                  <span className="break-all font-mono text-ink-faint">{pagePath}</span>
                </p>

                <div className="pt-1">
                  <FormFactChips
                    formType={result.formType}
                    embedProvider={result.embedProvider}
                    embedKind={result.embedKind}
                    isMultiStep={result.isMultiStep}
                    fieldCount={result.fieldCount}
                    stepKnown={hasNativeForm}
                  />
                </div>
                {hasNativeForm && fieldNames && (
                  <p className="text-ink-faint">{fieldNames}{result.isMultiStep ? ' · revealed across steps' : ''}</p>
                )}
                {hasEmbed && <p className="text-ink-faint">A cross-origin embed FormPing can&rsquo;t auto-fill — verify it manually.</p>}
              </div>
            </div>

            {/* Landing-page runs test only the given page — worth stating in the
                user's own toggle language. Normal runs need no note: the path in
                the headline already says where the form is. No internal jargon. */}
            {result.landingPageMode && (
              <div className="flex items-center gap-2 pl-6 text-xs text-ink-faint">
                <Dot />
                <span>Landing-page mode — only this page was tested</span>
              </div>
            )}
            {testedElsewhere && (
              <div className="flex items-start gap-2 pl-6 text-xs text-ink-faint">
                <Dot />
                <span>
                  You entered <span className="font-mono">{enteredLabel}</span> — we searched the site and tested the contact form found at{' '}
                  <span className="font-mono">{pagePath}</span>. Turn on Landing page to test only the page you enter.
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Expand/collapse footer */}
      <div className="flex items-center divide-x divide-line border-t border-line">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 px-4 py-2 text-left text-xs text-ink-muted transition-colors hover:bg-panel-raised hover:text-ink"
        >
          {notes.length > 0
            ? `${expanded ? '▲ Hide' : '▼ Show'} ${notes.length} note${notes.length !== 1 ? 's' : ''}`
            : expanded ? '▲ Hide details' : '▼ Show details'}
        </button>
        <a
          href={`/form-watch?url=${encodeURIComponent(result.normalizedUrl)}`}
          className="whitespace-nowrap px-4 py-2 text-xs text-ink-muted transition-colors hover:bg-panel-raised hover:text-accent-soft"
          title="Set up scheduled monitoring — the Form Scheduler opens with this URL prefilled; you pick the mode + frequency"
        >
          👁 Monitor…
        </a>
        <button onClick={() => setShowJson(!showJson)} className="px-4 py-2 font-mono text-xs text-ink-faint transition-colors hover:bg-panel-raised hover:text-ink">
          {showJson ? '{ hide }' : '{ JSON }'}
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
          className="px-4 py-2 text-xs text-ink-faint transition-colors hover:bg-panel-raised hover:text-ink"
          title="Copy JSON"
        >
          ⎘ Copy
        </button>
      </div>

      {/* Expanded notes + details */}
      {expanded && (
        <div className="fp-rise space-y-3 border-t border-line px-4 pb-4 pt-2">
          {notes.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-faint">Notes</p>
              <ul className="space-y-1">
                {notes.map((note, i) => (
                  <li key={i} className="flex gap-2 text-xs text-ink-secondary">
                    <span className="shrink-0 text-ink-faint">·</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-1">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-faint">Details</p>
            <FieldRow label="Mode" value={result.mode} />
            <FieldRow label="Contact page" value={result.resolvedContactPage} mono />
            <FieldRow label="Final URL" value={result.finalUrl} mono />
            <FieldRow label="Redirect URL" value={result.redirectUrl} mono />
            <FieldRow label="Submission" value={result.submissionResult} />
            {result.formIdentifier && (
              <>
                <FieldRow label="Form ID" value={result.formIdentifier.id} mono />
                <FieldRow label="Form action" value={result.formIdentifier.action} mono />
                <FieldRow label="Form method" value={result.formIdentifier.method} mono />
              </>
            )}
            {result.error && <FieldRow label="Error" value={result.error} />}
          </div>
        </div>
      )}

      {/* Raw JSON */}
      {showJson && (
        <div className="fp-rise border-t border-line">
          <pre className="overflow-x-auto whitespace-pre-wrap break-all p-4 font-mono text-xs leading-relaxed text-ink-secondary">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
