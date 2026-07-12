create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.consultations enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "consultations_select_own_or_admin" on public.consultations;
create policy "consultations_select_own_or_admin"
on public.consultations
for select
to authenticated
using (
  (select auth.uid()) = student_user_id
  or (select private.is_admin())
);

drop policy if exists "consultations_insert_own" on public.consultations;
create policy "consultations_insert_own"
on public.consultations
for insert
to authenticated
with check ((select auth.uid()) = student_user_id);

drop policy if exists "consultations_update_own" on public.consultations;
create policy "consultations_update_own"
on public.consultations
for update
to authenticated
using ((select auth.uid()) = student_user_id)
with check ((select auth.uid()) = student_user_id);

revoke delete on table public.consultations from authenticated;
