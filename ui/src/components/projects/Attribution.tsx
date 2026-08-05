import type { Project } from '@/lib/projects/types';
import { cx } from '@/components/ui';

function rel(iso?: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return new Date(iso).toLocaleDateString();
}

/** Exact timestamp for the hover tooltip (e.g. "Aug 2, 2026, 4:12 PM"). */
function exact(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '';
  }
}

type AttrProject = Pick<Project, 'createdBy' | 'updatedBy' | 'createdAt' | 'updatedAt'>;

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-strong text-[9px] font-bold text-white">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function ClockDot() {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-panel-raised ring-1 ring-inset ring-line-strong">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-ink-faint" aria-hidden>
        <path d="M10 1a9 9 0 100 18 9 9 0 000-18zm1 4a1 1 0 10-2 0v5a1 1 0 00.4.8l3 2.2a1 1 0 101.2-1.6L11 9.5z" />
      </svg>
    </span>
  );
}

/**
 * One metadata chip — [avatar|clock] Label [by Name] · when. Exact time on hover.
 * Name is bold/bright; label + time are muted, so who did it reads first.
 */
function Chip({ label, name, when }: { label: string; name?: string | null; when?: string | null }) {
  return (
    <span
      title={exact(when)}
      className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel/60 px-2.5 py-1.5 text-xs"
    >
      {name ? <Avatar name={name} /> : <ClockDot />}
      <span className="text-ink-faint">
        {label}
        {name ? ' by' : ''}
      </span>
      {name && <span className="font-semibold text-ink-secondary">{name}</span>}
      <span className="text-ink-faint">· {rel(when)}</span>
    </span>
  );
}

/**
 * Project attribution / audit fields (FR-30): who first created it and who last
 * changed it (any add / remove / edit stamps the updater), with timestamps.
 * `variant="chips"` is the metadata row on the project detail; `variant="line"` is
 * the compact single line. Names fall back gracefully for projects created before
 * attribution existed — those show the date with a clock icon instead of a person.
 */
export function Attribution({
  project,
  className = '',
  variant = 'line',
}: {
  project: AttrProject;
  className?: string;
  variant?: 'line' | 'chips';
}) {
  const { createdBy, updatedBy, createdAt, updatedAt } = project;
  // "Actually edited" = a recorded editor, OR updated_at meaningfully after
  // created_at (the create itself can nudge updated_at by a few ms).
  const gap = createdAt && updatedAt ? new Date(updatedAt).getTime() - new Date(createdAt).getTime() : 0;
  const wasEdited = Boolean(updatedBy) || gap > 60_000;

  if (variant === 'chips') {
    return (
      <div className={cx('flex flex-wrap items-center gap-2', className)}>
        <Chip label="Added" name={createdBy} when={createdAt} />
        {wasEdited && <Chip label="Updated" name={updatedBy} when={updatedAt} />}
      </div>
    );
  }

  const added = `Added ${rel(createdAt)}${createdBy ? ` by ${createdBy}` : ''}`;
  const updated = wasEdited ? ` · updated ${rel(updatedAt)}${updatedBy ? ` by ${updatedBy}` : ''}` : '';
  return (
    <p title={exact(updatedAt || createdAt)} className={cx('inline-flex max-w-full items-center gap-1.5', className)}>
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 shrink-0 opacity-70" aria-hidden>
        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM3.5 16.5a6.5 6.5 0 0113 0z" />
      </svg>
      <span className="truncate">{added}{updated}</span>
    </p>
  );
}
