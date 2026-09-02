-- Anchor each invite's access window to its first successful redemption.
-- 
-- A newly created invite has no active access window:
-- 
-- first_accessed_at = null
-- expires_at = null
-- 
-- The first successful redemption establishes both timestamps atomically.
-- Re-entering the same invite code creates another visit but never extends
-- the original access window.
alter table public.access_invites
  add column access_duration_days integer not null default 7;

alter table public.access_invites
  add column first_accessed_at timestamptz;

alter table public.access_invites
  add constraint access_invites_duration_days_range check (access_duration_days
    between 1 and 365);

-- Preserve the earliest observed visit for invites that were already used
-- before this migration was introduced.
with first_visits as (
  select
    visits.invite_id,
    min(visits.used_at) as first_accessed_at
  from
    public.access_visits as visits
  group by
    visits.invite_id)
update
  public.access_invites as invites
set
  first_accessed_at = first_visits.first_accessed_at
from
  first_visits
where
  invites.id = first_visits.invite_id;

-- Existing used invites adopt an access window beginning with their earliest
-- recorded visit.
update
  public.access_invites as invites
set
  expires_at = invites.first_accessed_at + make_interval(days =>
    invites.access_duration_days)
where
  invites.first_accessed_at is not null;

-- Preserve already-expired unused legacy invites as expired.
-- 
-- This converts them into a consistent historical access window rather than
-- leaving expires_at populated while first_accessed_at is null.
update
  public.access_invites as invites
set
  first_accessed_at = invites.expires_at - make_interval(days =>
    invites.access_duration_days)
where
  invites.first_accessed_at is null
  and invites.expires_at is not null
  and invites.expires_at <= now();

-- Future legacy expiries were based on invite creation rather than first use.
-- Remove them so the new access window starts only when the invite is first
-- successfully redeemed.
update
  public.access_invites as invites
set
  expires_at = null
where
  invites.first_accessed_at is null
  and invites.expires_at is not null
  and invites.expires_at > now();

-- An invite must either:
-- 
-- 1. have no access window yet, or
-- 2. have both a start and a later expiry.
-- 
-- This prevents partially initialized access windows from entering the table.
alter table public.access_invites
  add constraint access_invites_access_window_consistent check
    ((first_accessed_at is null and expires_at is null) or (first_accessed_at
    is not null and expires_at is not null and expires_at >
    first_accessed_at));

-- The base migration creates the one-argument version.
-- 
-- The two-argument drop is retained defensively so resetting a development
-- database that previously used the user-agent version cannot leave an old
-- overload behind.
drop function if exists public.redeem_access_invite(text);

drop function if exists public.redeem_access_invite(text, text);

create function public.redeem_access_invite(p_code_hash text)
  returns table(
    invite_id uuid,
    visit_id uuid,
    label text,
    access_expires_at timestamptz,
    reason text)
  language plpgsql
  security definer
  set search_path = ''
  as $$
declare
  selected_invite public.access_invites%rowtype;
  created_visit_id uuid;
  redeemed_at timestamptz := now();
begin
  if p_code_hash is null or char_length(trim(p_code_hash)) = 0 then
    return query
    select
      null::uuid,
      null::uuid,
      null::text,
      null::timestamptz,
      'invalid'::text;
    return;
  end if;
  -- Serialize redemption of a particular invite.
  -- 
  -- This ensures that concurrent first-redemption requests cannot establish
  -- different first_accessed_at or expires_at values.
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
      null::timestamptz,
      'invalid'::text;
    return;
  end if;
  if selected_invite.revoked_at is not null then
    return query
    select
      selected_invite.id,
      null::uuid,
      selected_invite.label,
      selected_invite.expires_at,
      'revoked'::text;
    return;
  end if;
  if selected_invite.expires_at is not null and selected_invite.expires_at <=
    redeemed_at then
    return query
    select
      selected_invite.id,
      null::uuid,
      selected_invite.label,
      selected_invite.expires_at,
      'expired'::text;
    return;
  end if;
  if selected_invite.first_accessed_at is null then
    update
      public.access_invites as invites
    set
      first_accessed_at = redeemed_at,
      expires_at = redeemed_at + make_interval(days => invites.access_duration_days),
      use_count = invites.use_count + 1
    where
      invites.id = selected_invite.id
    returning
      *
    into
      selected_invite;
  else
    update
      public.access_invites as invites
    set
      use_count = invites.use_count + 1
    where
      invites.id = selected_invite.id
    returning
      *
    into
      selected_invite;
  end if;
  insert into public.access_visits(
    invite_id,
    used_at)
  values (
    selected_invite.id,
    redeemed_at)
returning
  id
into
  created_visit_id;
  return query
  select
    selected_invite.id,
    created_visit_id,
    selected_invite.label,
    selected_invite.expires_at,
    'ok'::text;
end;
$$;

revoke all on function public.redeem_access_invite(text) from public;

grant execute on function public.redeem_access_invite(text) to anon,
  authenticated, service_role;
