-- Outer resume invite gate tables and redeem path.
-- Invite codes are multi-use until expires_at or revoked_at.
-- Operator sets label at mint time to identify the invite recipient.
-- Application users must not read or write these tables directly.

create table public.access_invites (
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

create unique index access_invites_code_hash_uidx
on public.access_invites (code_hash);

create index access_invites_expires_at_idx
on public.access_invites (expires_at);

create table public.access_visits (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.access_invites (id) on delete cascade,
  used_at timestamptz not null default timezone('utc', now()),
  user_agent text
);

create index access_visits_invite_id_idx
on public.access_visits (invite_id);

create index access_visits_used_at_idx
on public.access_visits (used_at);

alter table public.access_invites enable row level security;
alter table public.access_visits enable row level security;

revoke all on table public.access_invites from anon, authenticated;
revoke all on table public.access_visits from anon, authenticated;

-- Redeem is the only application-facing write path.
-- code_hash is computed server-side; plaintext codes never reach the database.
create or replace function public.redeem_access_invite(
  p_code_hash text,
  p_user_agent text default null
)
returns table (
  invite_id uuid,
  visit_id uuid,
  label text,
  reason text
)
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

  select *
  into selected_invite
  from public.access_invites as invites
  where invites.code_hash = p_code_hash
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

  if selected_invite.expires_at is not null
    and selected_invite.expires_at <= timezone('utc', now())
  then
    return query
    select
      selected_invite.id,
      null::uuid,
      selected_invite.label,
      'expired'::text;
    return;
  end if;

  update public.access_invites as invites
  set use_count = invites.use_count + 1
  where invites.id = selected_invite.id;

  insert into public.access_visits (
    invite_id,
    user_agent
  )
  values (
    selected_invite.id,
    nullif(trim(coalesce(p_user_agent, '')), '')
  )
  returning id into created_visit_id;

  return query
  select
    selected_invite.id,
    created_visit_id,
    selected_invite.label,
    'ok'::text;
end;
$$;

revoke all on function public.redeem_access_invite(text, text) from public;
grant execute on function public.redeem_access_invite(text, text) to anon, authenticated, service_role;
