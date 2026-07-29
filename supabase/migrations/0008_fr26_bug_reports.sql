-- FormPing — FR-26: in-app "Report a bug" reports.
--
-- SCHEMA-AGNOSTIC (see 0001's header): unqualified names, apply per-schema with
-- `set search_path to public;` (prod) then `set search_path to dev;` (dev).
-- Additive + forward-only + idempotent.
--
-- WHY
-- The footer's "Report a bug" form writes here (durable record) and also pings
-- Slack (immediate heads-up). One row per submission. `reporter` is the signed-in
-- user's email from the session (may differ from the name/email they typed).
--
-- RLS enabled, no policies (anon key does nothing; server secret key bypasses).

create table if not exists bug_reports (
  id         uuid primary key default gen_random_uuid(),
  name       text,                                  -- name they entered
  email      text,                                  -- email they entered (for reply)
  message    text not null,                         -- the bug description
  page       text,                                  -- app path they were on
  reporter   text,                                  -- signed-in user's email (session)
  created_at timestamptz not null default now()
);

alter table bug_reports enable row level security;
