-- FormPing — FR-30 Part A: project attribution / audit fields.
--
-- SCHEMA-AGNOSTIC (see 0001's header): unqualified names, apply per-schema with
-- `set search_path to public;` (prod) then `set search_path to dev;` (dev).
-- Additive + forward-only + idempotent.
--
-- WHY
-- Show accountability on each project: who created it and who last edited it.
-- `created_at` / `updated_at` already exist (updated_at is trigger-maintained);
-- this adds the WHO. Stored as the actor's display name (a snapshot at the time
-- of the action), falling back to their email. Existing rows stay null ("—").

alter table projects add column if not exists created_by text;
alter table projects add column if not exists updated_by text;
