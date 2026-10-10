-- Complete least-privilege table grants for application roles.
--
-- Row-level security governs SELECT, INSERT, UPDATE, and DELETE.
-- PostgreSQL does not apply RLS to whole-table operations such as TRUNCATE,
-- REFERENCES, TRIGGER, or MAINTAIN. Those privileges must be controlled with
-- ordinary GRANT/REVOKE.
--
-- Supabase default privileges in the public schema previously left
-- REFERENCES, TRIGGER, TRUNCATE, and MAINTAIN on application tables for
-- anon, authenticated, and service_role. Invite-gate tables already follow an
-- explicit revoke-then-grant pattern. This migration applies the same model to
-- profiles and consultations, and stops default privileges from reintroducing
-- unnecessary grants on future tables.
--
-- Intended end state:
--
--   anon
--     - no direct privileges on public.profiles or public.consultations
--
--   authenticated
--     - profiles: SELECT
--     - consultations: SELECT
--     - consultations: INSERT (
--         student_user_id, first_name, last_name, reason, scheduled_for
--       )
--     - consultations: UPDATE (scheduled_for, status)
--
--   service_role
--     - no direct privileges on public.profiles or public.consultations
--     - access_invites remains SELECT, INSERT only
--
-- Browser-facing consultation and profile access continues to rely on RLS for
-- row scope. This migration removes privileges that RLS cannot constrain.

-- Start from an explicit deny state for the LMS tables, matching the invite-gate
-- approach. Required privileges are re-granted immediately below.
revoke all on table public.profiles from anon, authenticated, service_role;

revoke all on table public.consultations from anon, authenticated, service_role;

-- Authenticated users may read their own profile row. RLS enforces ownership.
grant select on table public.profiles to authenticated;

-- Authenticated users may read consultations permitted by RLS.
grant select on table public.consultations to authenticated;

-- Students may insert only the application-writable consultation columns.
-- Lifecycle timestamps, status defaults, and identifiers remain database-owned
-- except student_user_id, which RLS requires to equal auth.uid().
grant insert (student_user_id, first_name, last_name, reason, scheduled_for) on
  table public.consultations to authenticated;

-- Students may update only schedule and status. Triggers own lifecycle metadata.
grant update (scheduled_for, status) on table public.consultations to authenticated;

-- Prevent future public tables created by postgres from inheriting broad
-- non-row privileges for client-facing and operator roles.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;

-- Application tables do not expose sequences to client roles. Remove the
-- platform default sequence UPDATE grants so they cannot accumulate later.
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;

-- Keep invite-gate tables locked even if defaults change around them.
revoke all on table public.access_invites from anon, authenticated;

revoke all on table public.access_visits from anon, authenticated, service_role;

-- service_role retains only the deliberate invite-operator surface.
revoke update, delete, truncate, references, trigger, maintain on table
  public.access_invites from service_role;

grant select, insert on table public.access_invites to service_role;
