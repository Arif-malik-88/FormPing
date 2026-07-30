import { NextRequest, NextResponse } from 'next/server';
import { projectStore, projectForUrlKey } from '@/lib/projects/projectStore';
import { enableUrlShare, disableUrlShare } from '@/lib/projects/urlShareStore';
import { decodeUrlKey } from '@/lib/projects/urlKeyRoute';
import { requireRole } from '@/lib/auth/authorize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Manage a single URL's public share token (FR-27). `key` is the base64url
 * canonical url_key. Mirrors /api/projects/[id]/share but for one URL:
 *   POST   → generate (or regenerate) → { shareToken }
 *   DELETE → revoke (the /status/u/<token> page goes 404 immediately)
 * Member+ (viewers are read-only). The URL must currently be in the project.
 */
async function resolveUrl(id: string, key: string): Promise<string | null> {
  const project = await projectStore.get(id);
  if (!project) return null;
  const subset = projectForUrlKey(project, decodeUrlKey(key));
  return subset ? subset.urls[0]! : null;
}

export async function POST(request: NextRequest, { params }: { params: { id: string; key: string } }) {
  const denied = await requireRole(request, 'member');
  if (denied) return denied;

  const url = await resolveUrl(params.id, params.key);
  if (!url) return NextResponse.json({ error: 'URL not in this project' }, { status: 404 });

  const shareToken = await enableUrlShare(params.id, url);
  if (!shareToken) return NextResponse.json({ error: 'Could not create share link' }, { status: 500 });
  return NextResponse.json({ shareToken });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; key: string } }) {
  const denied = await requireRole(request, 'member');
  if (denied) return denied;

  const url = await resolveUrl(params.id, params.key);
  if (!url) return NextResponse.json({ error: 'URL not in this project' }, { status: 404 });

  await disableUrlShare(params.id, url);
  return NextResponse.json({ ok: true });
}
