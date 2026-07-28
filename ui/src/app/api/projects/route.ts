import { NextRequest, NextResponse } from 'next/server';
import { projectStore } from '@/lib/projects/projectStore';
import { rollupsForUrlSets, listUnassignedUrls } from '@/lib/projects/health';
import { removeDismissed } from '@/lib/projects/dismissedStore';
import { requireRole } from '@/lib/auth/authorize';
import type { ProjectWithRollup } from '@/lib/projects/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Reject malformed URLs. (We don't probe reachability here — that's a soft,
 * client-side warning; the server just guarantees a well-formed http(s) URL with
 * a real domain, so garbage like "https://" or "https://foo" can't be stored.)
 */
function badUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return !/^https?:$/.test(url.protocol) || !url.hostname.includes('.');
  } catch {
    return true;
  }
}

/**
 * GET /api/projects?q=... — list projects with a health rollup, sorted
 * worst-first. Optional case-insensitive search by name or URL.
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase();
  const all = await projectStore.list();
  const projects = q
    ? all.filter(
        (p) => p.name.toLowerCase().includes(q) || p.urls.some((u) => u.toLowerCase().includes(q)),
      )
    : all;

  // Orphans = monitored URLs not in any project and not dismissed. Computed
  // centrally (listUnassignedUrls) so the dismiss rule lives in one place.
  let orphans = await listUnassignedUrls();
  if (q) orphans = orphans.filter((u) => u.toLowerCase().includes(q));

  // One pass over the monitor stores for the projects AND the unassigned set.
  const rollups = await rollupsForUrlSets([...projects.map((p) => p.urls), orphans]);
  const orphanRollup = rollups[rollups.length - 1]!;
  const withRollup: ProjectWithRollup[] = projects.map((p, i) => ({ ...p, rollup: rollups[i]! }));

  // Worst-first; ties broken by name.
  withRollup.sort((a, b) => b.rollup.severity - a.rollup.severity || a.name.localeCompare(b.name));

  return NextResponse.json({
    projects: withRollup,
    unassigned: { urls: orphans, rollup: orphanRollup },
  });
}

/** POST /api/projects — create. Body: { name: string, urls?: string[], notes?: string } */
export async function POST(request: NextRequest) {
  // Creating a project is day-to-day work — Member+ (viewers are read-only).
  const denied = await requireRole(request, 'member');
  if (denied) return denied;

  let body: { name?: unknown; urls?: unknown; notes?: unknown; contact?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'A project name is required' }, { status: 400 });

  const urls = Array.isArray(body.urls)
    ? body.urls.filter((u): u is string => typeof u === 'string').map((u) => u.trim()).filter(Boolean)
    : [];
  const bad = urls.find(badUrl);
  if (bad) {
    return NextResponse.json(
      { error: `Invalid URL: "${bad}" — must start with http:// or https://` },
      { status: 400 },
    );
  }

  const notes = typeof body.notes === 'string' ? body.notes : undefined;
  const contact = typeof body.contact === 'string' ? body.contact : undefined;
  const project = await projectStore.create({ name, urls, notes, contact });

  // Any URL grouped under a client is being tracked — clear a stale "don't track"
  // dismissal so the two states can't contradict. Best-effort per URL.
  await Promise.all(
    urls.map((u) =>
      removeDismissed(u).catch((err) =>
        console.warn(`[projects] removeDismissed failed for ${u} (create still succeeded): ${err}`),
      ),
    ),
  );

  return NextResponse.json({ project }, { status: 201 });
}
