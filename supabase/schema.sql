-- Migrations remain the source of execution history.
-- This file is a readable snapshot of the final effective schema.
create type public.app_role as enum(
  'student',
  'admin'
);

create type public.consultation_status as enum(
  'scheduled',
  'completed',
  'cancelled'
);

create or replace function public.set_updated_at()
  returns trigger
  language plpgsql
  set search_path = ''
  as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'student',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
  before update on public.profiles for each row
  execute function public.set_updated_at();

create table public.consultations(
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references public.profiles(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  reason text not null,
  scheduled_for timestamptz not null,
  status public.consultation_status not null default 'scheduled',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  cancelled_at timestamptz,
  constraint consultations_first_name_not_blank check (char_length(trim(first_name)) > 0),
  constraint consultations_last_name_not_blank check (char_length(trim(last_name)) > 0),
  constraint consultations_reason_not_blank check (char_length(trim(reason)) > 0),
  constraint consultations_first_name_max_length check (char_length(first_name) <= 100),
  constraint consultations_last_name_max_length check (char_length(last_name) <= 100),
  constraint consultations_reason_max_length check (char_length(reason) <= 2000)
);

);

create index consultations_student_user_id_idx on public.consultations(student_user_id);

create index consultations_scheduled_for_idx on public.consultations(scheduled_for);

create index consultations_status_idx on public.consultations(status);

create trigger consultations_set_updated_at
  before update on public.consultations for each row
  execute function public.set_updated_at();

create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
  as $$
begin
  insert into public.profiles(
    id,
    role)
  values(
    new.id,
    'student')
on conflict(
  id)
  do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users for each row
  execute function public.handle_new_user();

create schema if not exists private;

create or replace function private.has_role(required_role public.app_role)
  returns boolean
  language sql
  security definer
  set search_path = '' stable
  as $$
  select
    exists(
      select
        1
      from
        public.profiles
      where
        id =(
          select
            auth.uid())
          and role = required_role);
$$;

-- Schema privileges
grant usage on schema public to authenticated;

grant usage on schema private to authenticated;

-- Table privileges
grant select on table public.profiles to authenticated;

grant select, insert, update on table public.consultations to authenticated;

-- Function privileges
revoke execute on function public.handle_new_user() from public;

revoke execute on function public.handle_new_user() from anon;

revoke execute on function public.handle_new_user() from authenticated;

revoke execute on function private.has_role(public.app_role) from public;

revoke execute on function private.has_role(public.app_role) from anon;

grant execute on function private.has_role(public.app_role) to authenticated;

-- Physical deletion is intentionally unavailable to authenticated users.
-- Consultation cancellation is represented by a status update.
revoke delete on table public.consultations from authenticated;

-- Row-level security
alter table public.profiles enable row level security;

alter table public.consultations enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((
    select
      auth.uid()) = id);

create policy "consultations_select_own_or_admin" on public.consultations
  for select to authenticated
  using ((
    select
      auth.uid()) = student_user_id
      or (
        select
          private.has_role('admin')));

create policy "consultations_insert_own" on public.consultations
  for insert to authenticated
  with check ((
    select
      auth.uid()) = student_user_id
      and (
        select
          private.has_role('student')));

create policy "consultations_update_own" on public.consultations
  for update to authenticated
  using ((
    select
      auth.uid()) = student_user_id
      and (
        select
          private.has_role('student')))
  with check ((
    select
      auth.uid()) = student_user_id
      and (
        select
          private.has_role('student')));
