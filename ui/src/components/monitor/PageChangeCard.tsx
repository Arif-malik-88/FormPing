'use client';
import { useState } from 'react';
import type { PageChange, TextChange } from '@/types';
import { SeverityBadge } from './SeverityBadge';
import { TextDiffBlock } from './TextDiffBlock';

const BORDER: Record<PageChange['severity'], string> = {
  high: 'border-danger/20',
  medium: 'border-warn/20',
  low: 'border-line-strong',
};

function shortPath(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname || '/';
  } catch {
    return url;
  }
}

/** Hide the high-level lines that are already shown via TextDiffBlock to avoid duplication. */
function isStructuralLine(line: string): boolean {
  return /^(Heading|H1|H2|H3|H4|H5|H6|Paragraph|List item|Text|Body text)\s+(edited|added|removed):/.test(line);
}

const PREVIEW_TEXT_DIFFS = 3;

export function PageChangeCard({ change }: { change: PageChange }) {
  const [showAllText, setShowAllText] = useState(false);

  const textChanges: TextChange[] = change.textChanges ?? [];
  const visibleTextChanges = showAllText ? textChanges : textChanges.slice(0, PREVIEW_TEXT_DIFFS);
  const otherChanges = change.changes.filter((c) => !isStructuralLine(c));

  return (
    <div className={`rounded-xl border ${BORDER[change.severity]} bg-panel overflow-hidden animate-slide-in`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-medium text-ink truncate">{shortPath(change.url)}</p>
          <p className="font-mono text-xs text-ink-faint truncate mt-0.5">{change.url}</p>
        </div>
        <SeverityBadge severity={change.severity} />
      </div>

      {/* Other (non-text) changes — forms, scripts, SEO, etc. */}
      {otherChanges.length > 0 && (
        <ul className="px-4 py-3 space-y-1.5 border-b border-line">
          {otherChanges.map((c, i) => (
            <li key={i} className="text-sm text-ink-secondary flex gap-2 leading-relaxed">
              <span className="text-ink-faint shrink-0 mt-0.5">·</span>
              <span className="break-words">{c}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Structured text diffs */}
      {textChanges.length > 0 && (
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-ink-faint uppercase tracking-wider">
              Text changes
              <span className="ml-2 text-ink-faint font-mono normal-case tracking-normal">
                {textChanges.length} item{textChanges.length !== 1 ? 's' : ''}
              </span>
            </p>
            {textChanges.length > PREVIEW_TEXT_DIFFS && (
              <button
                onClick={() => setShowAllText((v) => !v)}
                className="text-xs text-accent hover:text-accent-soft transition-colors"
              >
                {showAllText ? 'Show less' : `Show all ${textChanges.length}`}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {visibleTextChanges.map((tc, i) => (
              <TextDiffBlock key={i} change={tc} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
