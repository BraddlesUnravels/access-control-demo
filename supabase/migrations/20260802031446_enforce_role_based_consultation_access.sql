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

revoke execute on function private.has_role(public.app_role) from public;

revoke execute on function private.has_role(public.app_role) from anon;

grant execute on function private.has_role(public.app_role) to authenticated;

drop policy "consultations_select_own_or_admin" on public.consultations;

create policy "consultations_select_own_or_admin" on public.consultations
  for select to authenticated
  using ((
    select
      auth.uid()) = student_user_id
      or (
        select
          private.has_role('admin')));

drop policy "consultations_insert_own" on public.consultations;

create policy "consultations_insert_own" on public.consultations
  for insert to authenticated
  with check ((
    select
      auth.uid()) = student_user_id
      and (
        select
          private.has_role('student')));

drop policy "consultations_update_own" on public.consultations;

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

drop function private.is_admin();
