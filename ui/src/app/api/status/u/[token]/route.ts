import { NextRequest, NextResponse } from 'next/server';
import { projectStore, projectForUrlKey } from '@/lib/projects/projectStore';
import { findUrlShareByToken } from '@/lib/projects/urlShareStore';
import { buildClientStatus, parseWindow } from '@/lib/status/build';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/status/u/[token] — PUBLIC (auth-gate-exempt via middleware).
 *
 * The per-URL sibling of /api/status/[token]: resolves a per-URL share token to
 * its project + url_key and returns the CLIENT-SAFE status for that single URL
 * only (buildClientStatus without `internal`, so no reason codes / response
 * times / other URLs ever leak). Unknown/revoked token → plain 404.
 */
export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token?.trim();
  if (!token) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const ref = await findUrlShareByToken(token);
  if (!ref) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const project = await projectStore.get(ref.projectId);
  const subset = project && projectForUrlKey(project, ref.urlKey);
  if (!subset) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const windowDays = parseWindow(request.nextUrl.searchParams.get('window'));
  const data = await buildClientStatus(subset, { windowDays }); // client-safe only
  return NextResponse.json(data);
}
