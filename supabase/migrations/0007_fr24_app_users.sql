-- FormPing — FR-24: access privileges (per-user roles).
--
-- SCHEMA-AGNOSTIC (see 0001's header): unqualified names, apply per-schema with
-- `set search_path to public;` (prod) or `set search_path to dev;` (dev) first.
-- Additive + forward-only + idempotent.
--
-- WHY
-- Access was binary: any allow-listed Google login got FULL access, including
-- the irreversible project delete. This table holds one row per person, keyed by
-- their Google email (the domain is shared, the local-part is unique), assigning
-- a role. Google proves WHO you are; this table decides WHAT you may do.
--
-- Roles (highest to lowest):
--   owner  — exactly one; the only role that can manage admins or transfer
--            ownership. Seeded from the OWNER_EMAIL env (break-glass).
--   admin  — full app incl. delete projects + manage members/viewers.
--   member — add URLs, create/run/edit monitors, view everything. NO delete,
--            NO user management. (Default for a new allow-listed login.)
--   viewer — read-only.
--
-- The role lives HERE, not in the session token: the token is verified in Edge
-- middleware which can't reach the DB, and a DB-authoritative role means a
-- promotion/demotion takes effect immediately (no waiting for a session to
-- expire). Login upserts the row; server routes read the current role to enforce.
--
-- LOCKOUT SAFETY: exactly one owner at all times (enforced in app code). The
-- OWNER_EMAIL env re-seeds an owner ONLY when the table has none, so the app can
-- never end up with no administrator.
--
-- RLS enabled, no policies (anon key does nothing; server secret key bypasses).

create table if not exists app_users (
  email      text primary key,                    -- lowercased Google email
  role       text not null default 'member'
             check (role in ('owner', 'admin', 'member', 'viewer')),
  name       text,                                 -- Google display name (for the Team page)
  picture    text,                                 -- Google avatar URL
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most ONE owner, enforced by the database itself (belt to the app's braces).
create unique index if not exists app_users_single_owner_idx
  on app_users ((true)) where role = 'owner';

alter table app_users enable row level security;
