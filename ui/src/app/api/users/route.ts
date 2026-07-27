import { NextRequest, NextResponse } from 'next/server';
import { requireRole, currentUser } from '@/lib/auth/authorize';
import { listUsers, setRole, removeUser } from '@/lib/auth/userStore';
import { toRole } from '@/lib/auth/roles';

export const runtime = 'nodejs';
// Reads the per-request session + live role rows — never cache.
export const dynamic = 'force-dynamic';

/**
 * Team management API (FR-24 PR 2). Admin+ only — the UI mirror of this lives at
 * /team. Every fine-grained ownership rule (only-owner-touches-admins, can't
 * change your own role, owner is transfer-only, etc.) is enforced in userStore,
 * NOT here — this layer only checks the coarse admin gate and identifies the
 * actor. That keeps one source of truth for the rules.
 *
 * NOTE: these routes need a real signed-in identity to act as. In open-gate local
 * dev (no auth configured) there is no actor, so `currentUser` is null and they
 * return 401 — team management is only meaningful with auth on.
 */

/** GET /api/users — list all users with their roles (owner first). */
export async function GET(request: NextRequest) {
  const denied = await requireRole(request, 'admin');
  if (denied) return denied;
  const actor = await currentUser(request);
  if (!actor) return NextResponse.json({ error: 'Sign in required to manage the team.' }, { status: 401 });

  const users = await listUsers();
  // A break-glass owner (OWNER_EMAIL, before their first callback login) has no
  // row yet — without this they'd stare at an empty table and couldn't see their
  // own access. Always surface the actor so the list reflects who's actually here.
  if (!users.some((u) => u.email === actor.email)) {
    users.unshift({ email: actor.email, role: actor.role, name: null, picture: null, createdAt: '', updatedAt: '' });
  }
  return NextResponse.json({ users, me: { email: actor.email, role: actor.role } });
}

/** PATCH /api/users — change a user's role. Body: { email, role }. */
export async function PATCH(request: NextRequest) {
  const denied = await requireRole(request, 'admin');
  if (denied) return denied;
  const actor = await currentUser(request);
  if (!actor) return NextResponse.json({ error: 'Sign in required to manage the team.' }, { status: 401 });

  let body: { email?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
  // toRole would silently coerce garbage to the default; reject unknown values instead.
  if (typeof body.role !== 'string' || toRole(body.role) !== body.role) {
    return NextResponse.json({ error: 'role must be one of: viewer, member, admin' }, { status: 400 });
  }

  const result = await setRole(actor.email, email, toRole(body.role));
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 403 });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/users — remove a user's role row. Body: { email }. */
export async function DELETE(request: NextRequest) {
  const denied = await requireRole(request, 'admin');
  if (denied) return denied;
  const actor = await currentUser(request);
  if (!actor) return NextResponse.json({ error: 'Sign in required to manage the team.' }, { status: 401 });

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  const result = await removeUser(actor.email, email);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 403 });
  return NextResponse.json({ ok: true });
}
