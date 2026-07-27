'use client';

import { useEffect, useState } from 'react';
import { atLeast, toRole, type Role } from './roles';

export interface Me {
  email: string | null;
  name: string | null;
  picture: string | null;
  /**
   * The signed-in user's role, or `null` when we can't determine one — i.e. auth
   * is disabled (open-gate local dev) or nobody is signed in. `null` means "don't
   * restrict": the server is the real gate, and when it's open the UI must not
   * pretend otherwise. See `canRole`.
   */
  role: Role | null;
  loading: boolean;
}

type Snapshot = Omit<Me, 'loading'>;
const LOGGED_OUT: Snapshot = { email: null, name: null, picture: null, role: null };

// Module-level cache + subscribers, so many components share ONE /me fetch
// instead of each firing its own on mount.
let cache: Snapshot | null = null;
let inflight: Promise<void> | null = null;
const subscribers = new Set<() => void>();

function load(): Promise<void> {
  if (!inflight) {
    inflight = fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        cache =
          d && d.user
            ? { email: d.user, name: d.name ?? null, picture: d.picture ?? null, role: d.role ? toRole(d.role) : null }
            : LOGGED_OUT;
      })
      .catch(() => {
        cache = LOGGED_OUT;
      })
      .finally(() => {
        subscribers.forEach((fn) => fn());
      });
  }
  return inflight;
}

/** Read the current user + role. Shares one fetch across all callers. */
export function useMe(): Me {
  const [snap, setSnap] = useState<Snapshot | null>(cache);

  useEffect(() => {
    const notify = () => setSnap(cache);
    subscribers.add(notify);
    if (cache === null) void load();
    else setSnap(cache);
    return () => {
      subscribers.delete(notify);
    };
  }, []);

  return { ...(snap ?? LOGGED_OUT), loading: snap === null };
}

/**
 * Client-side permission check for showing/hiding UI. Returns true when the role
 * is unknown (`null`) so we never hide actions in open-gate mode — hiding is
 * only convenience; `requireRole` on the server is the real boundary.
 */
export function canRole(role: Role | null, min: Role): boolean {
  if (role === null) return true;
  return atLeast(role, min);
}

/** Force a re-fetch of /me (e.g. after a role change on the Team page). */
export function refreshMe(): Promise<void> {
  cache = null;
  inflight = null;
  return load();
}
