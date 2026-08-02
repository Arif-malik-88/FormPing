-- FormPing — FR-31: bug-report triage (admin inbox status fields).
--
-- SCHEMA-AGNOSTIC (see 0001's header): unqualified names, apply per-schema with
-- `set search_path to public;` (prod) then `set search_path to dev;` (dev).
-- Additive + forward-only + idempotent.
--
-- WHY
-- The admin bug inbox (FR-31) lets owner/admins mark a report resolved (or
-- reopen it) and shows who resolved it and when. Adds status + resolver stamps
-- to the FR-26 `bug_reports` table. Existing rows default to 'open'.

alter table bug_reports add column if not exists status      text not null default 'open';
alter table bug_reports add column if not exists resolved_by text;
alter table bug_reports add column if not exists resolved_at timestamptz;

-- Constrain status to the two valid values. `add constraint` has no IF NOT EXISTS,
-- so guard it so the migration stays idempotent (safe to re-run on both schemas).
do $$
begin
  alter table bug_reports
    add constraint bug_reports_status_check check (status in ('open', 'resolved'));
exception
  when duplicate_object then null;
end $$;
