import { NextRequest, NextResponse } from 'next/server';
import { projectStore, matchKey } from '@/lib/projects/projectStore';
import { isDismissed } from '@/lib/projects/dismissedStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/membership?url=... — is this URL already in a project, or
 * dismissed? The add-time popup uses this to decide whether to prompt at all
 * (skip if it's already grouped or the user previously said "don't track").
 */
export async function GET(request: NextRequest) {
  const url = (request.nextUrl.searchParams.get('url') ?? '').trim();
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  // `isDismissed` MUST keep using the persisted `urlKey` (it reads the stored
  // `dismissed_urls.url_key`), so leave that path untouched. The in-project match,
  // by contrast, is a pure in-memory comparison of project URLs vs the target —
  // so use the stricter `matchKey` here to close the http/https, query-string and
  // fragment gaps that made an already-tracked page re-prompt (FR-25).
  const [projects, dismissed] = await Promise.all([projectStore.list(), isDismissed(url)]);
  const target = matchKey(url);
  const inProject = projects.some((p) => p.urls.some((u) => matchKey(u) === target));

  return NextResponse.json({ inProject, dismissed });
}
