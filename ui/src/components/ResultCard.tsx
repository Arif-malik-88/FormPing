'use client';
import { useState } from 'react';
import type { SiteResult } from '@/types';
import { getReasonMessage, type Severity } from '@/lib/reasonMessages';
import { runVerdict } from '@/lib/formWatch/verdict';
import { FormSummary, FormsOnPageLine, TrackingParamsLine } from './FormFactChips';

// Banner icons are real SVGs (no emoji glyphs — house design rule). `info` reads
// as a recognised, informational state (a detected third-party embed). FR-60.
const BANNER_ICON: Record<Severity, JSX.Element> = {
  success: <path strokeLinecap="round" strokeLinejoin="round" d="M4 10.5l3.5 3.5L16 5.5" />,
  info: <path strokeLinecap="round" strokeLinejoin="round" d="M10 13.5v-4M10 6.7v.1M10 2.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15z" />,
  warn: <path strokeLinecap="round" strokeLinejoin="round" d="M10 7.5v3.5M10 13.7v.1M8.6 3.4L2.3 14.5A1.6 1.6 0 003.7 17h12.6a1.6 1.6 0 001.4-2.5L11.4 3.4a1.6 1.6 0 00-2.8 0z" />,
  error: <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l8 8M14 6l-8 8" />,
};
const BANNER_STYLES: Record<Severity, { wrap: string; title: string }> = {
  success: { wrap: 'bg-ok/10 border-ok/20', title: 'text-ok' },
  info: { wrap: 'bg-info/10 border-info/25', title: 'text-info' },
  warn: { wrap: 'bg-warn/10 border-warn/20', title: 'text-warn' },
  error: { wrap: 'bg-danger/10 border-danger/20', title: 'text-danger' },
};

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
/** A properly-sized status mark (check / cross in a tinted circle) for the
 *  "what we found" headline — aligned with the title, not a drowning glyph. */
function StatusMark({ ok }: { ok: boolean }) {
  return (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-ok/15 text-ok' : 'bg-danger/15 text-danger'}`}>
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
        {ok
          ? <path strokeLinecap="round" strokeLinejoin="round" d="M4 10.5l3.5 3.5L16 5.5" />
          : <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l8 8M14 6l-8 8" />}
      </svg>
    </span>
  );
}
/** Mode-aware header badge — a healthy safe/detect run reads "OK", not amber
 *  "WARN". Mirrors the Scheduler verdict so both surfaces agree. FR-63. */
function VerdictBadge({ level }: { level: 'healthy' | 'detected' | 'attention' | 'failing' }) {
  const map = {
    healthy: { cls: 'bg-ok/15 text-ok ring-ok/30', dot: 'bg-ok', label: 'OK' },
    detected: { cls: 'bg-info/15 text-info ring-info/30', dot: 'bg-info', label: 'Detected' },
    attention: { cls: 'bg-warn/15 text-warn ring-warn/30', dot: 'bg-warn', label: 'Attention' },
    failing: { cls: 'bg-danger/15 text-danger ring-danger/30', dot: 'bg-danger', label: 'Failed' },
  }[level];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${map.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${map.dot}`} />
      {map.label}
    </span>
  );
}

export function ResultCard({ result }: { result: SiteResult }) {
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
          <VerdictBadge level={runVerdict(result.reasonCode, result.formFound, result.finalStatus).level} />
        </div>
      </div>

      {/* Reason banner */}
      <div className={`mx-4 mb-3 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${banner.wrap}`}>
        <svg viewBox="0 0 20 20" className={`${banner.title} mt-0.5 h-4 w-4 shrink-0`} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          {BANNER_ICON[reason.severity]}
        </svg>
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

      {/* Quick status flags — only when something noteworthy is present */}
      {(result.captchaDetected || result.antiBotDetected || result.thankYouDetected || result.inlineSuccessDetected) && (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          <Pill label="CAPTCHA" active={result.captchaDetected} color="bg-warn/15 text-warn" />
          <Pill label="Anti-Bot" active={result.antiBotDetected} color="bg-danger/15 text-danger" />
          <Pill label="Thank-You ✓" active={result.thankYouDetected} color="bg-ok/15 text-ok" />
          <Pill label="Inline Success ✓" active={result.inlineSuccessDetected} color="bg-ok/15 text-ok" />
        </div>
      )}

      {/* What we found — plain, accurate summary: where the form is + what kind */}
      {(() => {
        const hasEmbed = result.formType === 'third-party';
        const hasNativeForm = result.formFound && !hasEmbed;
        const aFormExists = hasNativeForm || hasEmbed;
        const pageKnown = Boolean(result.resolvedContactPage || result.finalUrl);
        const pagePath = pathOf(result.resolvedContactPage) || pathOf(result.finalUrl) || '/';
        // Show the FULL url of the page that holds the form, so it's directly clickable/knowable.
        const pageUrl = result.resolvedContactPage || result.finalUrl || result.normalizedUrl;
        // In default (non-landing) mode, FormPing may search the site and end up
        // testing a DIFFERENT page than the URL typed. Surface that plainly so the
        // result isn't confusing ("I entered X, why does it say Y?"). FR-64.
        const enteredPath = pathOf(result.normalizedUrl) || '/';
        const enteredLabel = enteredPath === '/' ? 'the homepage' : enteredPath;
        const testedElsewhere = !result.landingPageMode && aFormExists && enteredPath !== pagePath;
        // Nothing useful to add beyond the reason banner (e.g. contact page not found).
        if (!aFormExists && !pageKnown) return null;
        return (
          <div className="mx-4 mb-3 rounded-lg border border-line bg-panel-raised/40 px-5 py-4">
            {/* Headline — big + obvious: found or not, and the FULL url */}
            <div className="flex items-center gap-3">
              <StatusMark ok={aFormExists} />
              <p className="min-w-0 text-base">
                <span className="font-semibold text-ink">{aFormExists ? 'Form found on' : 'No form found on'}</span>{' '}
                <span className="break-all font-mono text-sm text-ink-muted">{pageUrl}</span>
              </p>
            </div>

            {/* Summary sentence — type + structure + fields as highlighted pills */}
            {(hasNativeForm || hasEmbed) && (
              <div className="mt-3 pl-[40px]">
                <FormSummary
                  size="lg"
                  formType={result.formType}
                  embedProvider={result.embedProvider}
                  embedKind={result.embedKind}
                  isMultiStep={result.isMultiStep}
                  fieldCount={result.fieldCount}
                  stepKnown={hasNativeForm}
                  captchaPresent={result.captchaDetected}
                />
                <TrackingParamsLine tracking={result.tracking} size="lg" />
              </div>
            )}

            {/* Third-party embed — the one useful action is to open it and send a
                quick manual test, since we can't submit through a cross-origin form. FR-60. */}
            {hasEmbed && (
              <a
                href={pageUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 ml-[40px] inline-flex items-center gap-1.5 rounded-lg bg-info/10 px-3 py-1.5 text-xs font-semibold text-info ring-1 ring-info/25 transition-colors hover:bg-info/15"
              >
                Open the form
                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 4H5.5A1.5 1.5 0 004 5.5v9A1.5 1.5 0 005.5 16h9a1.5 1.5 0 001.5-1.5V13M12 4h4v4M16 4l-7 7" />
                </svg>
              </a>
            )}

            {/* Landing-page / tested-elsewhere context — the user's own toggle language */}
            {result.landingPageMode && (
              <p className="mt-3 pl-[34px] text-xs text-ink-faint">Landing-page mode — only this page was tested.</p>
            )}
            {testedElsewhere && (
              <p className="mt-3 pl-[34px] text-xs leading-relaxed text-ink-faint">
                You entered <span className="font-mono text-ink-muted">{enteredLabel}</span> — we searched the site and tested the contact form at{' '}
                <span className="font-mono text-ink-muted">{pagePath}</span>. Turn on Landing page to test only the page you enter.
              </p>
            )}
          </div>
        );
      })()}

      {/* How many forms are on the page + what the others are (2+ forms only). FR-68. */}
      {result.formsOnPage && (
        <div className="mx-4 mb-3">
          <FormsOnPageLine
            forms={result.formsOnPage}
            pageUrl={result.resolvedContactPage || result.finalUrl || result.normalizedUrl}
            size="lg"
          />
        </div>
      )}

      {/* Footer: raw JSON for devs (everything else is already on the card) */}
      <div className="flex items-center justify-end border-t border-line">
        <button onClick={() => setShowJson(!showJson)} className="px-4 py-2 font-mono text-xs text-ink-faint transition-colors hover:bg-panel-raised hover:text-ink">
          {showJson ? '{ hide }' : '{ JSON }'}
        </button>
      </div>

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
