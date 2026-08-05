'use client';

/**
 * ProjectsTable (FR-37) — the flagship Projects list as a status-forward table
 * (HubSpot-style): sortable columns, taller rows, one 4-state status pill per row,
 * and attribution. NO per-dimension health tiles on the row — the SSL/form/uptime
 * detail lives inside the project (list = triage, detail = diagnosis).
 *
 * Columns: Name & URL · Status · URLs · Updated (when + by) · Created (when + by).
 * Sortable on Name / Status / Updated; default = worst-health-first.
 */

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { ProjectWithRollup } from '@/lib/projects/types';
import { fromProjectRollup, STATUS } from '@/lib/design/status';
import { StatusPill, cx } from '@/components/ui';
import { monogram, rel } from './uiKit';

type SortKey = 'status' | 'name' | 'updated';
type SortDir = 'asc' | 'desc';

function hostOf(url: string | undefined): string {
  if (!url) return '—';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
function shortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Column widths — shared by the header and every row so they stay aligned.
const COL = {
  status: 'w-36',
  urls: 'w-14',
  updated: 'w-40',
  created: 'w-40',
  chevron: 'w-5',
};

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  // Solid on the active column; on others it stays hidden until the header is
  // hovered, so the sort affordance is discoverable without cluttering the row.
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cx('h-3 w-3 transition-opacity', active ? 'text-accent-soft opacity-100' : 'text-ink-faint opacity-0 group-hover:opacity-70')}
      aria-hidden
    >
      {active && dir === 'asc' ? (
        <path fillRule="evenodd" d="M10 6a.75.75 0 01.6.3l3 4a.75.75 0 01-.6 1.2H7a.75.75 0 01-.6-1.2l3-4A.75.75 0 0110 6z" clipRule="evenodd" />
      ) : (
        <path fillRule="evenodd" d="M10 14a.75.75 0 01-.6-.3l-3-4A.75.75 0 017 8.5h6a.75.75 0 01.6 1.2l-3 4a.75.75 0 01-.6.3z" clipRule="evenodd" />
      )}
    </svg>
  );
}

function HeaderCell({
  label,
  className,
  sortKey,
  active,
  dir,
  onSort,
}: {
  label: string;
  className?: string;
  sortKey?: SortKey;
  active?: boolean;
  dir?: SortDir;
  onSort?: (k: SortKey) => void;
}) {
  if (!sortKey) return <div className={cx('shrink-0', className)}>{label}</div>;
  return (
    <button
      type="button"
      onClick={() => onSort?.(sortKey)}
      title={`Sort by ${label.toLowerCase()}`}
      className={cx('group flex shrink-0 items-center gap-1 transition-colors hover:text-ink-secondary', active && 'text-ink-secondary', className)}
    >
      {label}
      <SortIcon active={Boolean(active)} dir={dir ?? 'desc'} />
    </button>
  );
}

function Row({ p }: { p: ProjectWithRollup }) {
  const { level, label } = fromProjectRollup(p.rollup);
  const count = p.urls.length;
  const host = hostOf(p.urls[0]);

  return (
    <Link
      href={`/projects/${p.id}`}
      className="group relative flex items-center gap-3 border-t border-line px-4 py-3.5 transition-colors hover:bg-panel/60"
    >
      <span className={cx('absolute inset-y-0 left-0 w-[3px]', STATUS[level].edge)} aria-hidden />

      {/* Name & URL */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ring-1 ring-inset ring-white/10', STATUS[level].soft)}>
          {monogram(p.name)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink">{p.name}</div>
          <div className="truncate text-xs text-ink-faint">
            {host}
            {count > 1 && <span className="text-ink-faint"> +{count - 1}</span>}
          </div>
        </div>
      </div>

      {/* Status */}
      <div className={cx('shrink-0', COL.status)}>
        <StatusPill level={level}>{label}</StatusPill>
      </div>

      {/* URLs */}
      <div className={cx('hidden shrink-0 text-center text-sm tabular-nums text-ink-muted sm:block', COL.urls)}>{count}</div>

      {/* Last updated — when + who */}
      <div className={cx('hidden shrink-0 text-xs md:block', COL.updated)}>
        <div className="text-ink-secondary">{rel(p.updatedAt)}</div>
        <div className="truncate text-ink-faint">{p.updatedBy ?? '—'}</div>
      </div>

      {/* Created — when + who */}
      <div className={cx('hidden shrink-0 text-xs lg:block', COL.created)}>
        <div className="text-ink-secondary">{shortDate(p.createdAt)}</div>
        <div className="truncate text-ink-faint">{p.createdBy ?? '—'}</div>
      </div>

      {/* Chevron */}
      <span className={cx('shrink-0 text-ink-faint transition-colors group-hover:text-accent-soft', COL.chevron)} aria-hidden>
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M7.3 5.3a1 1 0 011.4 0l4 4a1 1 0 010 1.4l-4 4a1 1 0 11-1.4-1.4L10.6 10 7.3 6.7a1 1 0 010-1.4z" />
        </svg>
      </span>
    </Link>
  );
}

export function ProjectsTable({ projects }: { projects: ProjectWithRollup[] }): ReactNode {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'status', dir: 'desc' });

  const onSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' }));

  const sorted = useMemo(() => {
    const arr = [...projects];
    const dirMul = sort.dir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let cmp = 0;
      if (sort.key === 'name') cmp = a.name.localeCompare(b.name);
      else if (sort.key === 'updated') cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      else cmp = a.rollup.severity - b.rollup.severity; // status = severity
      if (cmp === 0) cmp = a.name.localeCompare(b.name);
      return cmp * dirMul;
    });
    return arr;
  }, [projects, sort]);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel/40">
      {/* Header */}
      <div className="flex items-center gap-3 bg-panel/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        <HeaderCell label="Name & URL" className="min-w-0 flex-1" sortKey="name" active={sort.key === 'name'} dir={sort.dir} onSort={onSort} />
        <HeaderCell label="Status" className={COL.status} sortKey="status" active={sort.key === 'status'} dir={sort.dir} onSort={onSort} />
        <HeaderCell label="URLs" className={cx('hidden text-center sm:block', COL.urls)} />
        <HeaderCell label="Last updated" className={cx('hidden md:flex', COL.updated)} sortKey="updated" active={sort.key === 'updated'} dir={sort.dir} onSort={onSort} />
        <HeaderCell label="Created" className={cx('hidden lg:block', COL.created)} />
        <span className={cx('shrink-0', COL.chevron)} aria-hidden />
      </div>

      {/* Rows */}
      {sorted.map((p) => (
        <Row key={p.id} p={p} />
      ))}
    </div>
  );
}
