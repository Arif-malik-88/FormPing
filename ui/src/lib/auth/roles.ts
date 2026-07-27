/**
 * Role model for access privileges (FR-24). Pure — no DB, no I/O — so it can be
 * used anywhere (server routes, and later the client for hiding controls).
 *
 * Hierarchy, lowest to highest: viewer < member < admin < owner.
 * A check of "at least role X" uses the rank order, so higher roles inherit
 * everything a lower role can do.
 */

export type Role = 'viewer' | 'member' | 'admin' | 'owner';

export const ROLES: Role[] = ['viewer', 'member', 'admin', 'owner'];

const RANK: Record<Role, number> = { viewer: 0, member: 1, admin: 2, owner: 3 };

/** The role a brand-new allow-listed login receives (see FR-24: least surprise, */
/*  can work immediately, but cannot delete or manage users). */
export const DEFAULT_ROLE: Role = 'member';

/** True when `role` is at least `min` in the hierarchy. */
export function atLeast(role: Role, min: Role): boolean {
  return RANK[role] >= RANK[min];
}

/** Narrow an untrusted string to a Role, falling back to the default. */
export function toRole(v: unknown): Role {
  return typeof v === 'string' && (ROLES as string[]).includes(v) ? (v as Role) : DEFAULT_ROLE;
}

/** Human label for UI. */
export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};
