-- FormPing — FR-27: per-URL public share tokens.
--
-- SCHEMA-AGNOSTIC (see 0001's header): unqualified names, apply per-schema with
-- `set search_path to public;` (prod) then `set search_path to dev;` (dev).
-- Additive + forward-only + idempotent.
--
-- WHY
-- Projects already have ONE share token (projects.share_token → the whole-client
-- status page). FR-27 adds a share link for a SINGLE URL, so a client can be sent
-- one page's status. Each URL gets its own token, generated/revoked independently.
-- Keyed by the canonical `url_key` (matchKey: scheme-agnostic host+path) so it
-- follows the app's one identity for "the same URL".
--
-- A URL can only be shared while it belongs to a project; the app revokes the row
-- when the URL leaves the project or the project is deleted (no orphan links).
--
-- RLS enabled, no policies (anon key does nothing; server secret key bypasses).

create table if not exists url_shares (
  token      text primary key,                     -- opaque share token (in the public URL)
  project_id uuid not null references projects(id) on delete cascade,
  url_key    text not null,                         -- canonical matchKey of the shared URL
  created_at timestamptz not null default now(),
  unique (project_id, url_key)                      -- one active token per URL per project
);

create index if not exists url_shares_project_idx on url_shares (project_id);

alter table url_shares enable row level security;
