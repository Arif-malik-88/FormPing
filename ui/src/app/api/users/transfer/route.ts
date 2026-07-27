import { NextRequest, NextResponse } from 'next/server';
import { requireRole, currentUser } from '@/lib/auth/authorize';
import { transferOwnership } from '@/lib/auth/userStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/users/transfer — hand ownership to a successor. Body: { email }.
 *
 * Owner-only, and the successor must have signed in at least once (so they have a
 * role row). The demote-then-promote sequence + rollback live in userStore, which
 * never lets the single-owner invariant break. Transferring only rewrites roles —
 * it never touches projects or data, so it cannot lock the app or lose anything.
 */
export async function POST(request: NextRequest) {
  const denied = await requireRole(request, 'owner');
  if (denied) return denied;
  const actor = await currentUser(request);
  if (!actor) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  const result = await transferOwnership(actor.email, email);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 403 });
  return NextResponse.json({ ok: true });
}
