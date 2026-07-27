import { NextRequest, NextResponse } from 'next/server';
import { listSchedules, upsertSchedule } from '@/lib/siteWatch/scheduleStore';
import { kickSiteWatchTicker } from '@/lib/siteWatch/ticker';
import { requireRole } from '@/lib/auth/authorize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/site-watch/pause — pause or resume a monitor. Body: { id, paused }.
 * Paused monitors are skipped by the ticker but keep their history + alert state
 * (unlike Stop, which removes them). On resume we check promptly.
 */
export async function POST(request: NextRequest) {
  const denied = await requireRole(request, 'member');
  if (denied) return denied;

  let body: { id?: unknown; paused?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const id = typeof body.id === 'string' ? body.id : '';
  const paused = body.paused === true;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const schedule = (await listSchedules()).find((s) => s.id === id);
  if (!schedule) return NextResponse.json({ error: 'Monitor not found' }, { status: 404 });

  const updated = { ...schedule, paused };
  if (!paused) updated.nextCheckAt = new Date().toISOString(); // resume → check now
  await upsertSchedule(updated);
  if (!paused) kickSiteWatchTicker();

  return NextResponse.json({ schedule: updated });
}
