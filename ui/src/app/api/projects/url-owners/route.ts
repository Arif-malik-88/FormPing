import { NextRequest, NextResponse } from 'next/server';
import { projectStore, matchKey } from '@/lib/projects/projectStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/url-owners?url=<u>&url=<u2>&exclude=<projectId>
 *
 * For each supplied URL, returns the project(s) that already contain it (matched
 * on the canonical `matchKey`, so http/https/query/www/etc. don't fool it).
 * Used by the add/edit project form to warn "this URL is already in <project>"
 * before adding a duplicate. Read-only; `exclude` skips the project being edited
 * so its own existing URLs don't count as duplicates.
 *
 * Response: { duplicates: [{ url, projects: [{ id, name }] }] } — only URLs that
 * are already in at least one (non-excluded) project appear.
 */
export async function GET(request: NextRequest) {
  const urls = request.nextUrl.searchParams
    .getAll('url')
    .map((u) => u.trim())
    .filter(Boolean);
  const exclude = request.nextUrl.searchParams.get('exclude') ?? '';
  if (urls.length === 0) return NextResponse.json({ duplicates: [] });

  const projects = (await projectStore.list()).filter((p) => p.id !== exclude);

  const duplicates = urls
    .map((url) => {
      const key = matchKey(url);
      const owners = projects
        .filter((p) => p.urls.some((u) => matchKey(u) === key))
        .map((p) => ({ id: p.id, name: p.name }));
      return { url, projects: owners };
    })
    .filter((d) => d.projects.length > 0);

  return NextResponse.json({ duplicates });
}
