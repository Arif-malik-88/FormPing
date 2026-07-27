import { NextRequest, NextResponse } from 'next/server';
import { removeSchedule } from '@/lib/formWatch/scheduleStore';
import { requireRole } from '@/lib/auth/authorize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/form-watch/stop — stop (remove) a schedule by id.
 * Body: { id: string }
 * Run history for the schedule is preserved.
 */
export async function POST(request: NextRequest) {
  const denied = await requireRole(request, 'member');
  if (denied) return denied;

  let body: { id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'Schedule id is required' }, { status: 400 });

  const removed = await removeSchedule(id);
  if (!removed) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
