'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { ClientStatus } from '@/lib/status/types';
import { StatusView, type WindowId } from '@/components/status/StatusView';
import { UrlShareControl } from '@/components/projects/UrlShareControl';
import { useMe, canRole } from '@/lib/auth/useMe';

type UrlDashboard = ClientStatus & { sharedUrl: string; shareToken: string | null };

/** INTERNAL, auth-gated dashboard for a SINGLE URL of a project (FR-27). Reuses
 *  the same StatusView (one site) + a per-URL client share control. */
export default function UrlDashboardPage() {
  const params = useParams<{ id: string; key: string }>();
  const id = params?.id;
  const key = params?.key;
  const me = useMe();
  const canManage = canRole(me.role, 'member');

  const [data, setData] = useState<UrlDashboard | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound'>('loading');
  const [win, setWin] = useState<WindowId>('30d');

  const load = useCallback(async () => {
    if (!id || !key) return;
    try {
      const res = await fetch(`/api/projects/${id}/url/${key}?window=${win}`, { cache: 'no-store' });
      if (!res.ok) return setState('notfound');
      setData((await res.json()) as UrlDashboard);
      setState('ready');
    } catch {
      setState('notfound');
    }
  }, [id, key, win]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <Link href={`/projects/${id}`} className="text-xs text-ink-muted transition-colors hover:text-ink">
        ← Back to {data?.name ?? 'project'}
      </Link>

      {state === 'loading' && (
        <div className="mt-4 space-y-4">
          <div className="fp-skeleton h-7 w-64 rounded" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="fp-skeleton h-20 rounded-lg" /><div className="fp-skeleton h-20 rounded-lg" /><div className="fp-skeleton h-20 rounded-lg" /></div>
          <div className="fp-skeleton h-40 rounded-lg" />
        </div>
      )}

      {state === 'notfound' && (
        <div className="py-20 text-center">
          <h1 className="text-lg font-semibold text-ink">Page not found</h1>
          <p className="mt-2 text-sm text-ink-muted">This URL may have been removed from the project.</p>
        </div>
      )}

      {state === 'ready' && data && (
        <div className="mt-4">
          <p className="mb-4 break-all font-mono text-xs text-ink-faint">{data.sharedUrl}</p>

          <StatusView data={data} window={win} onWindow={setWin} />

          {/* Share just this page with the client */}
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-ink">Share this page with the client</h2>
            <p className="mb-2 mt-1 text-xs text-ink-muted">
              A live, client-safe status page for this one URL — no login needed.
            </p>
            {key && (
              <UrlShareControl
                projectId={id!}
                urlKeyParam={key}
                initialToken={data.shareToken}
                canManage={canManage}
              />
            )}
          </section>
        </div>
      )}
    </main>
  );
}
