begin;
\echo 'RLS CHECK 1/4: Verifying required policies exist'
do $$
declare
  expected_policies text[] := array[
    'profiles_select_own',
    'consultations_select_own_or_admin',
    'consultations_insert_own',
    'consultations_update_own'
  ];
  missing_policies text[];
begin
  select coalesce(array_agg(policy_name), '{}') into missing_policies
  from (
    select policy_name
    from unnest(expected_policies) as expected(policy_name)
    where not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and policyname = expected.policy_name
    )
  ) missing;

  if cardinality(missing_policies) > 0 then
    raise exception 'Missing expected policies: %', array_to_string(missing_policies, ', ');
  end if;

  raise notice 'PASS: required policies are present';
end
$$;

\echo 'RLS CHECK 2/4: Verifying RLS is enabled on target tables'
do $$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'profiles'
      and c.relrowsecurity
  ) then
    raise exception 'RLS is not enabled on public.profiles';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'consultations'
      and c.relrowsecurity
  ) then
    raise exception 'RLS is not enabled on public.consultations';
  end if;

  raise notice 'PASS: RLS enabled on public.profiles and public.consultations';
end
$$;

\echo 'RLS CHECK 3/4: Verifying authenticated role lacks DELETE on consultations'
do $$
begin
  if has_table_privilege('authenticated', 'public.consultations', 'DELETE') then
    raise exception 'authenticated role should not have DELETE on public.consultations';
  end if;

  raise notice 'PASS: authenticated does not have DELETE privilege on public.consultations';
end
$$;

\echo 'RLS CHECK 4/4: Verifying student/admin visibility behavior'
do $$
declare
  student_id uuid;
  admin_id uuid;
  probe_reason text := 'RLS probe visibility check';
  student_probe_visible integer;
  admin_probe_visible integer;
begin
  select id into student_id
  from auth.users
  where email = 'student@example.com';

  select id into admin_id
  from auth.users
  where email = 'admin@example.com';

  if student_id is null then
    raise exception 'Seeded student user not found';
  end if;

  if admin_id is null then
    raise exception 'Seeded admin user not found';
  end if;

  insert into public.consultations (
    student_user_id,
    first_name,
    last_name,
    reason,
    scheduled_for,
    status
  )
  values (
    admin_id,
    'Admin',
    'Probe',
    probe_reason,
    timezone('utc', now()) + interval '1 day',
    'scheduled'
  );

  execute 'set local role authenticated';

  perform set_config('request.jwt.claim.sub', student_id::text, true);
  select count(*) into student_probe_visible
  from public.consultations
  where reason = probe_reason;

  if student_probe_visible <> 0 then
    raise exception 'Student should not see admin probe row. visible_count=%', student_probe_visible;
  end if;
  raise notice 'PASS: student cannot see admin-owned probe row';

  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  select count(*) into admin_probe_visible
  from public.consultations
  where reason = probe_reason;

  if admin_probe_visible <> 1 then
    raise exception 'Admin should see admin probe row. visible_count=%', admin_probe_visible;
  end if;
  raise notice 'PASS: admin can see admin-owned probe row';
end
$$;

\echo 'RLS CHECK RESULT: ALL CHECKS PASSED (transaction rolled back)'
rollback;
