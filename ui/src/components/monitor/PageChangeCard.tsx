'use client';
import { useState } from 'react';
import type { PageChange, TextChange } from '@/types';
import { SeverityBadge } from './SeverityBadge';

type Kind = 'added' | 'removed' | 'edited';
type Cat = 'form' | 'seo' | 'content' | 'scripts' | 'other';

const TAG: Record<Kind, { label: string; cls: string }> = {
  added: { label: 'Added', cls: 'border-ok/30 bg-ok/12 text-ok' },
  removed: { label: 'Removed', cls: 'border-danger/30 bg-danger/12 text-danger' },
  edited: { label: 'Changed', cls: 'border-warn/30 bg-warn/12 text-warn' },
};

// Order = business importance: leads first, then discoverability, then content.
const CAT_ORDER: Cat[] = ['form', 'seo', 'content', 'scripts', 'other'];
const CAT_META: Record<Cat, { label: string; why: string }> = {
  form: { label: 'Contact form', why: 'Changes here can stop visitors submitting — you may be losing leads.' },
  seo: { label: 'SEO & search', why: 'Titles, descriptions and indexing rules affect how this page shows up on Google.' },
  content: { label: 'Page content', why: 'The text visitors actually read — missing content can make a page look broken or empty.' },
  scripts: { label: 'Scripts & tracking', why: 'Scripts run features and analytics — removals can break functionality or tracking.' },
  other: { label: 'Other', why: '' },
};

function shortPath(url: string): string {
  try { return new URL(url).pathname || '/'; } catch { return url; }
}
const isStructuralLine = (l: string): boolean =>
  /^(Heading|H1|H2|H3|H4|H5|H6|Paragraph|List item|Text|Body text)\s+(edited|added|removed|changed|updated|replaced):/.test(l);

function otherKind(line: string): Kind {
  if (/\b(removed|deleted)\b/i.test(line)) return 'removed';
  if (/\badded\b/i.test(line)) return 'added';
  return 'edited';
}
function catOfLine(line: string): Cat {
  if (/^\s*(Form field|Button|Field\b)/i.test(line)) return 'form';
  if (/^\s*(Title|Meta description|Canonical|Robots meta|Open Graph|Description)\b/i.test(line)) return 'seo';
  if (/^\s*Script\b/i.test(line)) return 'scripts';
  return 'other';
}

// ── Humanisers: raw diff line → plain wording ────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  firstname: 'First name', lastname: 'Last name', name: 'Name', fullname: 'Full name',
  email: 'Email', phone: 'Phone', tel: 'Phone', mobile: 'Phone', company: 'Company',
  message: 'Message', subject: 'Subject', budget: 'Budget', website: 'Website', url: 'Website',
  event_city: 'Event city', guest_count: 'Guest count', event_type: 'Event type', event_type_: 'Event type',
  event_date: 'Event date', event_description: 'Event description',
};
function prettyField(name: string): string {
  const key = name.toLowerCase().trim();
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  if (/^[a-f0-9_]{16,}$/i.test(key)) return 'a hidden field';
  return name.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
function scriptName(url: string): string {
  const u = url.toLowerCase();
  if (u.includes('maps.googleapis') || u.includes('google.com/maps')) return 'Google Maps';
  if (u.includes('googletagmanager') || u.includes('gtm.js')) return 'Google Tag Manager';
  if (u.includes('gtag') || u.includes('google-analytics') || u.includes('/analytics')) return 'Google Analytics';
  if (u.includes('swiper')) return 'Swiper slider';
  if (u.includes('contact-form-7') || u.includes('wpcf7')) return 'Contact Form 7';
  if (u.includes('jquery')) return 'jQuery';
  if (u.includes('recaptcha')) return 'reCAPTCHA';
  try {
    const file = (new URL(url).pathname.split('/').pop() ?? '').replace(/\.(min\.)?js.*$/i, '').replace(/[-_.]+/g, ' ').trim();
    return file || 'a site script';
  } catch { return 'a site script'; }
}

interface Item { key: Kind; node: React.ReactNode }

/** Build the humanised item node for one raw free-text change line. */
function freeTextItem(line: string): { cat: Cat; item: Item } {
  const cat = catOfLine(line);
  const key = otherKind(line);
  let node: React.ReactNode;
  if (cat === 'form') {
    const name = line.match(/"([^"]+)"/)?.[1];
    const type = line.match(/\(was\s+([a-z]+)\)/i)?.[1];
    if (/^\s*Button/i.test(line)) {
      node = <span>Button <span className="text-ink">“{name ?? '?'}”</span></span>;
    } else {
      node = (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <span className="text-ink">{name ? prettyField(name) : 'A field'}</span>
          {type && <span className="rounded border border-accent/25 bg-accent/10 px-1.5 py-0.5 font-mono text-[11px] text-accent-soft">was {type.toLowerCase()}</span>}
        </span>
      );
    }
  } else if (cat === 'scripts') {
    const url = line.replace(/^\s*Script[^:]*:\s*/i, '');
    node = <span className="text-ink">{scriptName(url)}</span>;
  } else if (cat === 'seo') {
    const relabel = line
      .replace(/^\s*Robots meta\b[^:]*:?/i, 'Search-engine indexing:')
      .replace(/^\s*Canonical URL\b[^:]*:?/i, 'Canonical link:')
      .replace(/^\s*Meta description\b[^:]*/i, 'Meta description')
      .replace(/^\s*Title\b[^:]*:?/i, 'Page title:')
      .replace(/→\s*""/g, '→ (empty)');
    node = <span className="break-words text-ink-secondary">{relabel}</span>;
  } else {
    node = <span className="break-words text-ink-secondary">{line.replace(/→\s*""/g, '→ (empty)')}</span>;
  }
  return { cat, item: { key, node } };
}

function kindLabelOf(tc: TextChange): string {
  if (tc.kind === 'heading' && tc.meta) return tc.meta;
  if (tc.kind === 'other' && tc.meta === 'Body') return 'Body text';
  return { heading: 'Heading', paragraph: 'Paragraph', listItem: 'List item', other: 'Text' }[tc.kind] ?? tc.kind;
}
function contentItem(tc: TextChange): Item {
  const label = kindLabelOf(tc);
  let node: React.ReactNode;
  if (tc.type === 'removed') node = <span className="break-words"><span className="text-ink-faint">{label}: </span><span className="text-danger line-through decoration-danger/40">{tc.before}</span></span>;
  else if (tc.type === 'added') node = <span className="break-words"><span className="text-ink-faint">{label}: </span><span className="text-ok">{tc.after}</span></span>;
  else node = (
    <span className="inline-flex flex-wrap items-center gap-1.5 break-words">
      <span className="text-ink-faint">{label}:</span>
      <span className="text-ink-muted line-through decoration-danger/40">{tc.before}</span>
      <span className="text-ink-faint">→</span>
      <span className="rounded bg-ok/15 px-1 text-ok ring-1 ring-ok/25">{tc.after}</span>
    </span>
  );
  return { key: tc.type as Kind, node };
}

const PREVIEW = 6;

export function PageChangeCard({ change, pageNumber }: { change: PageChange; pageNumber?: number }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Bucket every change into a meaningful group.
  const buckets: Record<Cat, Item[]> = { form: [], seo: [], content: [], scripts: [], other: [] };
  for (const c of change.changes.filter((l) => !isStructuralLine(l))) {
    const { cat, item } = freeTextItem(c);
    buckets[cat].push(item);
  }
  for (const tc of change.textChanges ?? []) buckets.content.push(contentItem(tc));

  const groups = CAT_ORDER.map((cat) => ({ cat, items: buckets[cat] })).filter((g) => g.items.length > 0);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{pageNumber ? `Page ${pageNumber}` : shortPath(change.url)}</p>
          <a href={change.url} target="_blank" rel="noreferrer" className="block truncate font-mono text-[11px] text-ink-faint hover:text-accent-soft">{change.url}</a>
        </div>
        <SeverityBadge severity={change.severity} />
      </div>

      <div className="space-y-3 p-4">
        {groups.map((g) => {
          const show = expanded[g.cat];
          const visible = show ? g.items : g.items.slice(0, PREVIEW);
          return (
            <div key={g.cat} className="rounded-lg border border-line bg-ground/30 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">{CAT_META[g.cat].label}</p>
                <span className="text-[11px] text-ink-faint">{g.items.length} change{g.items.length === 1 ? '' : 's'}</span>
              </div>
              {CAT_META[g.cat].why && <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">{CAT_META[g.cat].why}</p>}
              <ul className="mt-2.5 grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
                {visible.map((it, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                    <span className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TAG[it.key].cls}`}>{TAG[it.key].label}</span>
                    {it.node}
                  </li>
                ))}
              </ul>
              {g.items.length > PREVIEW && (
                <button onClick={() => setExpanded((s) => ({ ...s, [g.cat]: !show }))} className="mt-2 text-xs text-accent transition-colors hover:text-accent-soft">
                  {show ? 'Show less' : `Show all ${g.items.length}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
