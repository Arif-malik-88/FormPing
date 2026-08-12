import type { TextChange } from '@/types';

const KIND_LABEL: Record<string, string> = {
  heading: 'Heading',
  paragraph: 'Paragraph',
  listItem: 'List item',
  other: 'Text',
};

const TYPE_STYLE = {
  added:   { tag: 'bg-ok/15 text-ok ring-ok/30',           label: 'Added',   wrap: 'border-ok/20' },
  removed: { tag: 'bg-danger/15 text-danger ring-danger/30', label: 'Removed', wrap: 'border-danger/20' },
  edited:  { tag: 'bg-warn/15 text-warn ring-warn/30',     label: 'Edited',  wrap: 'border-warn/20' },
} as const;

/**
 * Token-level diff using LCS.
 * Returns tokens tagged unchanged/added/removed.
 */
function tokenDiff(a: string, b: string): { value: string; type: 'common' | 'added' | 'removed' }[] {
  const aTok = a.split(/(\s+|[.,!?;:])/g).filter((s) => s !== '');
  const bTok = b.split(/(\s+|[.,!?;:])/g).filter((s) => s !== '');
  const m = aTok.length;
  const n = bTok.length;
  // Simple O(m*n) LCS table
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (aTok[i - 1] === bTok[j - 1]) dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      else dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
    }
  }
  const out: { value: string; type: 'common' | 'added' | 'removed' }[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (aTok[i - 1] === bTok[j - 1]) {
      out.unshift({ value: aTok[i - 1]!, type: 'common' });
      i--;
      j--;
    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
      out.unshift({ value: aTok[i - 1]!, type: 'removed' });
      i--;
    } else {
      out.unshift({ value: bTok[j - 1]!, type: 'added' });
      j--;
    }
  }
  while (i > 0) {
    out.unshift({ value: aTok[i - 1]!, type: 'removed' });
    i--;
  }
  while (j > 0) {
    out.unshift({ value: bTok[j - 1]!, type: 'added' });
    j--;
  }
  return out;
}

function HeadingPrefix({ meta, kind }: { meta?: string; kind: TextChange['kind'] }) {
  // Heading uses meta directly (H1/H2/...). 'other' kind uses meta if provided
  // (e.g. "Body" → "Body text") to distinguish fallback diffs from generic divs.
  let label: string;
  if (kind === 'heading' && meta) {
    label = meta;
  } else if (kind === 'other' && meta === 'Body') {
    label = 'Body text';
  } else {
    label = KIND_LABEL[kind] ?? kind;
  }
  return (
    <span className="text-xs font-semibold text-ink-faint font-mono mr-2 shrink-0">
      [{label}]
    </span>
  );
}

function LocationBreadcrumb({ location }: { location?: TextChange['location'] }) {
  if (!location) return null;
  const { section, heading, tag } = location;
  // Build the trail: section › heading › tag
  const parts: { kind: 'section' | 'heading' | 'tag'; text: string }[] = [];
  if (section) parts.push({ kind: 'section', text: section });
  if (heading) parts.push({ kind: 'heading', text: heading });
  if (tag) parts.push({ kind: 'tag', text: `<${tag}>` });
  if (parts.length === 0) return null;

  return (
    <div className="px-3 py-1.5 bg-ground/60 border-b border-line/60 flex items-center gap-1.5 flex-wrap">
      <span className="text-ink-faint text-xs">🧭</span>
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1.5 min-w-0">
          {i > 0 && <span className="text-ink-faint text-xs">›</span>}
          <span
            className={`text-xs truncate ${
              p.kind === 'tag'
                ? 'font-mono text-ink-faint'
                : p.kind === 'heading'
                  ? 'text-ink-muted italic'
                  : 'text-ink-muted font-medium'
            }`}
            title={p.text}
          >
            {p.text}
          </span>
        </span>
      ))}
    </div>
  );
}

export function TextDiffBlock({ change }: { change: TextChange }) {
  const style = TYPE_STYLE[change.type];

  const renderEdited = () => {
    const tokens = tokenDiff(change.before ?? '', change.after ?? '');
    return (
      <div className="space-y-1.5">
        {/* Before — show only common + removed tokens */}
        <div className="text-sm leading-relaxed flex items-start gap-2">
          <span className="text-danger/60 font-mono text-xs mt-0.5 shrink-0">−</span>
          <p className="break-words">
            {tokens
              .filter((t) => t.type !== 'added')
              .map((t, i) =>
                t.type === 'removed' ? (
                  <span key={i} className="bg-danger/20 text-danger rounded px-0.5">{t.value}</span>
                ) : (
                  <span key={i} className="text-ink-muted">{t.value}</span>
                ),
              )}
          </p>
        </div>
        {/* After — show only common + added tokens */}
        <div className="text-sm leading-relaxed flex items-start gap-2">
          <span className="text-ok/80 font-mono text-xs mt-0.5 shrink-0">+</span>
          <p className="break-words">
            {tokens
              .filter((t) => t.type !== 'removed')
              .map((t, i) =>
                t.type === 'added' ? (
                  <span key={i} className="bg-ok/20 text-ok rounded px-0.5 font-medium">{t.value}</span>
                ) : (
                  <span key={i} className="text-ink-secondary">{t.value}</span>
                ),
              )}
          </p>
        </div>
      </div>
    );
  };

  const renderAddedOrRemoved = () => {
    const isAdded = change.type === 'added';
    const text = isAdded ? change.after : change.before;
    return (
      <div className="text-sm leading-relaxed flex items-start gap-2">
        <span
          className={`font-mono text-xs mt-0.5 shrink-0 ${isAdded ? 'text-ok/80' : 'text-danger/60'}`}
        >
          {isAdded ? '+' : '−'}
        </span>
        <p
          className={`break-words ${
            isAdded
              ? 'text-ok bg-ok/10 rounded px-1.5 py-0.5'
              : 'text-danger bg-danger/10 rounded px-1.5 py-0.5 line-through decoration-danger/40'
          }`}
        >
          {text}
        </p>
      </div>
    );
  };

  return (
    <div className={`rounded-lg border ${style.wrap} bg-ground/40 overflow-hidden`}>
      <div className="px-3 py-1.5 bg-panel/60 border-b border-line flex items-center gap-2">
        <HeadingPrefix meta={change.meta} kind={change.kind} />
        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ring-1 ${style.tag}`}>
          {style.label}
        </span>
      </div>
      <LocationBreadcrumb location={change.location} />
      <div className="px-3 py-2.5">
        {change.type === 'edited' ? renderEdited() : renderAddedOrRemoved()}
      </div>
    </div>
  );
}
