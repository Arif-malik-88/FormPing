import { NextRequest, NextResponse } from 'next/server';
import { projectStore } from '@/lib/projects/projectStore';
import { requireRole } from '@/lib/auth/authorize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Manage a project's public status-page share token. Auth-gated (only the
 * generate/revoke controls need a session; the resulting /status/<token> page
 * itself is public).
 *
 * POST   → generate (or regenerate) the token, returns { shareToken }.
 * DELETE → revoke the token (status page goes 404 immediately).
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // Creating a public share link is Member+ — viewers are read-only.
  const denied = await requireRole(request, 'member');
  if (denied) return denied;

  const project = await projectStore.enableShare(params.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  return NextResponse.json({ shareToken: project.shareToken });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  // Revoking a public share link is Member+ — viewers are read-only.
  const denied = await requireRole(request, 'member');
  if (denied) return denied;

  const project = await projectStore.disableShare(params.id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
