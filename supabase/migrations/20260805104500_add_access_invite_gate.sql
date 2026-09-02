-- Base tables and redemption path for the outer portfolio access gate.
-- 
-- Browser-facing roles must not access the underlying tables directly.
-- Invite creation is performed by a trusted server-side operator script using
-- the service_role, while invite redemption is performed through the
-- redeem_access_invite() RPC.
-- 
-- The subsequent migration
-- 20260806105412_anchor_access_expiry_to_first_use.sql
-- adds the first-access expiry model and replaces the redemption function.
create table public.access_invites(
  id uuid primary key default gen_random_uuid(),
  code_hash text not null,
  label text not null,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  revoked_at timestamptz,
  use_count integer not null default 0,
  constraint access_invites_code_hash_not_blank check (char_length(trim(code_hash)) > 0),
  constraint access_invites_label_not_blank check (char_length(trim(label)) > 0),
  constraint access_invites_use_count_non_negative check (use_count >= 0)
);

create unique index access_invites_code_hash_uidx on public.access_invites(code_hash);

create index access_invites_expires_at_idx on public.access_invites(expires_at);

create table public.access_visits(
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.access_invites(id) on delete cascade,
  used_at timestamptz not null default timezone('utc', now())
);

create index access_visits_invite_id_idx on public.access_visits(invite_id);

create index access_visits_used_at_idx on public.access_visits(used_at);

-- RLS is enabled even though browser-facing roles receive no direct table
-- privileges. This provides defence in depth if grants change in the future.
alter table public.access_invites enable row level security;

alter table public.access_visits enable row level security;

-- Start from an explicit deny state.
-- 
-- anon and authenticated must never read or mutate these tables directly.
-- service_role is also reset here so its required privileges are deliberately
-- granted below rather than relying on Supabase defaults.
revoke all on table public.access_invites from anon, authenticated, service_role;

revoke all on table public.access_visits from anon, authenticated, service_role;

-- The trusted invite creation script inserts an invite and immediately returns
-- selected fields from the created row.
-- 
-- INSERT is required to create an invite.
-- SELECT is required by:
-- 
-- .insert(...)
-- .select(...)
-- .single()
-- 
-- UPDATE and DELETE are intentionally not granted.
grant select, insert on table public.access_invites to service_role;

-- No application code needs direct access to access_visits.
-- Visits are written only by the SECURITY DEFINER redemption function.
-- 
-- service_role therefore intentionally receives no direct privileges on
-- public.access_visits.
-- Redeem is the only application-facing mutation path.
-- 
-- p_code_hash is computed server-side. The plaintext invite code is never
-- stored in PostgreSQL.
-- 
-- SECURITY DEFINER is intentional because anon/authenticated have no direct
-- table privileges. The empty search_path and fully qualified object names
-- reduce the risks associated with SECURITY DEFINER functions.
create or replace function public.redeem_access_invite(p_code_hash text)
  returns table(
    invite_id uuid,
    visit_id uuid,
    label text,
    reason text)
  language plpgsql
  security definer
  set search_path = ''
  as $$
declare
  selected_invite public.access_invites%rowtype;
  created_visit_id uuid;
begin
  if p_code_hash is null or char_length(trim(p_code_hash)) = 0 then
    return query
    select
      null::uuid,
      null::uuid,
      null::text,
      'invalid'::text;
    return;
  end if;
  -- Lock the matching invite for the duration of this transaction so
  -- concurrent redemptions cannot mutate the same invite inconsistently.
  select
    *
  into
    selected_invite
  from
    public.access_invites as invites
  where
    invites.code_hash = p_code_hash
  for update;
  if not found then
    return query
    select
      null::uuid,
      null::uuid,
      null::text,
      'invalid'::text;
    return;
  end if;
  if selected_invite.revoked_at is not null then
    return query
    select
      selected_invite.id,
      null::uuid,
      selected_invite.label,
      'revoked'::text;
    return;
  end if;
  if selected_invite.expires_at is not null and selected_invite.expires_at <=
    timezone('utc', now()) then
    return query
    select
      selected_invite.id,
      null::uuid,
      selected_invite.label,
      'expired'::text;
    return;
  end if;
  update
    public.access_invites as invites
  set
    use_count = invites.use_count + 1
  where
    invites.id = selected_invite.id;
  insert into public.access_visits(
    invite_id)
  values (
    selected_invite.id)
returning
  id
into
  created_visit_id;
  return query
  select
    selected_invite.id,
    created_visit_id,
    selected_invite.label,
    'ok'::text;
end;
$$;

-- PostgreSQL functions are executable by PUBLIC by default, so explicitly
-- remove that privilege before granting only the roles that use this RPC.
revoke all on function public.redeem_access_invite(text) from public;

grant execute on function public.redeem_access_invite(text) to anon,
  authenticated, service_role;
