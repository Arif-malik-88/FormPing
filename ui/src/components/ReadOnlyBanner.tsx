'use client';

import { useMe } from '@/lib/auth/useMe';

/**
 * A slim notice shown ONLY to viewers (read-only role). For every other role —
 * and in open-gate local dev where the role is unknown — it renders nothing, so
 * it's a purely additive element that can't change any existing flow.
 *
 * Viewers are blocked from mutations server-side (requireRole); this just tells
 * them why the create/edit/run controls won't take effect, instead of leaving
 * them to click into a silent 403.
 */
export function ReadOnlyBanner() {
  const me = useMe();
  if (me.role !== 'viewer') return null;

  return (
    <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-line bg-panel/60 px-4 py-2.5 text-xs text-ink-muted">
      <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden>
        <path d="M10 2a5 5 0 00-5 5v1H4.5A1.5 1.5 0 003 9.5v6A1.5 1.5 0 004.5 17h11a1.5 1.5 0 001.5-1.5v-6A1.5 1.5 0 0015.5 8H15V7a5 5 0 00-5-5zm3 6H7V7a3 3 0 016 0v1z" />
      </svg>
      <span>
        <strong className="text-ink-secondary">Read-only access.</strong> You can view everything, but
        creating, editing, running and deleting are disabled for your role. Ask an admin if you need
        more access.
      </span>
    </div>
  );
}
