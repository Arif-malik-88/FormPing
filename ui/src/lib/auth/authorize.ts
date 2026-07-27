/**
 * Server-side authorization for route handlers (Node runtime).
 *
 * The middleware handles AUTHENTICATION (is there a valid session?). This handles
 * AUTHORIZATION (does that user's role permit this action?). It is the REAL gate —
 * the UI hiding buttons is only convenience; every privileged route calls this.
 *
 * Role is read fresh from the DB per call, so a demotion takes effect immediately.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { verifySession, SESSION_COOKIE_NAME, gateEnabled } from '@/lib/session';
import { getRole } from './userStore';
import { atLeast, type Role } from './roles';

/** The signed-in user + their current role, or null when unauthenticated. */
export async function currentUser(req: NextRequest): Promise<{ email: string; role: Role } | null> {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySession(cookie);
  if (!session) return null;
  return { email: session.user, role: await getRole(session.user) };
}

/**
 * Require at least `min` role. Returns a Response to send back when the caller is
 * NOT allowed (401 unauthenticated / 403 under-privileged), or `null` when the
 * caller may proceed.
 *
 * When the gate is open (no auth configured — local dev), enforcement is skipped,
 * matching the app's existing "open when unconfigured" behaviour so nothing
 * breaks in that mode.
 */
export async function requireRole(req: NextRequest, min: Role): Promise<NextResponse | null> {
  if (!gateEnabled()) return null;
  const u = await currentUser(req);
  if (!u) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!atLeast(u.role, min)) {
    return NextResponse.json(
      { error: `This action requires ${min} access.`, role: u.role, required: min },
      { status: 403 },
    );
  }
  return null;
}
