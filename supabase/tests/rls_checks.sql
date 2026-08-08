begin;

\echo 'RLS CHECK 1/6: Verifying required policies exist'

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
  select coalesce(array_agg(policy_name), '{}')
  into missing_policies
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
    raise exception
      'Missing expected policies: %',
      array_to_string(missing_policies, ', ');
  end if;

  raise notice 'PASS: required policies are present';
end
$$;

\echo 'RLS CHECK 2/6: Verifying RLS is enabled on target tables'

do $$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'profiles'
      and c.relrowsecurity
  ) then
    raise exception
      'RLS is not enabled on public.profiles';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'consultations'
      and c.relrowsecurity
  ) then
    raise exception
      'RLS is not enabled on public.consultations';
  end if;

  raise notice
    'PASS: RLS enabled on public.profiles and public.consultations';
end
$$;

\echo 'RLS CHECK 3/6: Verifying authenticated role lacks DELETE on consultations'

do $$
begin
  if has_table_privilege(
    'authenticated',
    'public.consultations',
    'DELETE'
  ) then
    raise exception
      'authenticated role should not have DELETE on public.consultations';
  end if;

  raise notice
    'PASS: authenticated does not have DELETE privilege on public.consultations';
end
$$;

\echo 'RLS CHECK 4/6: Verifying student/admin visibility behavior'

do $$
declare
  student_id uuid;
  admin_id uuid;
  probe_reason text := 'RLS probe visibility check';
  student_probe_visible integer;
  admin_probe_visible integer;
begin
  select id
  into student_id
  from auth.users
  where email = 'student1@lms.com';

  select id
  into admin_id
  from auth.users
  where email = 'admin@lms.com';

  if student_id is null then
    raise exception 'Seeded student user not found';
  end if;

  if admin_id is null then
    raise exception 'Seeded admin user not found';
  end if;

  -- Create the probe as the database owner so this check tests only
  -- visibility behaviour, not insert authorization.
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

  perform set_config(
    'request.jwt.claim.sub',
    student_id::text,
    true
  );

  select count(*)
  into student_probe_visible
  from public.consultations
  where reason = probe_reason;

  if student_probe_visible <> 0 then
    raise exception
      'Student should not see admin probe row. visible_count=%',
      student_probe_visible;
  end if;

  raise notice
    'PASS: student cannot see admin-owned probe row';

  perform set_config(
    'request.jwt.claim.sub',
    admin_id::text,
    true
  );

  select count(*)
  into admin_probe_visible
  from public.consultations
  where reason = probe_reason;

  if admin_probe_visible <> 1 then
    raise exception
      'Admin should see admin probe row. visible_count=%',
      admin_probe_visible;
  end if;

  raise notice
    'PASS: admin can see admin-owned probe row';
end
$$;

reset role;

\echo 'RLS CHECK 5/6: Verifying student insert and update access is allowed'

do $$
declare
  student_id uuid;
  probe_id uuid := gen_random_uuid();
  inserted_rows integer;
  updated_rows integer;
  persisted_reason text;
  initial_reason text := 'Student insert policy probe';
  updated_reason text := 'Student update policy probe';
begin
  select id
  into student_id
  from auth.users
  where email = 'student1@lms.com';

  if student_id is null then
    raise exception 'Seeded student user not found';
  end if;

  execute 'set local role authenticated';

  perform set_config(
    'request.jwt.claim.sub',
    student_id::text,
    true
  );

  insert into public.consultations (
    id,
    student_user_id,
    first_name,
    last_name,
    reason,
    scheduled_for,
    status
  )
  values (
    probe_id,
    student_id,
    'Student',
    'Write Probe',
    initial_reason,
    timezone('utc', now()) + interval '1 day',
    'scheduled'
  );

  get diagnostics inserted_rows = row_count;

  if inserted_rows <> 1 then
    raise exception
      'Student insert should affect exactly one row. inserted_rows=%',
      inserted_rows;
  end if;

  raise notice
    'PASS: student can create a consultation owned by their account';

  update public.consultations
  set reason = updated_reason
  where id = probe_id;

  get diagnostics updated_rows = row_count;

  if updated_rows <> 1 then
    raise exception
      'Student update should affect exactly one row. updated_rows=%',
      updated_rows;
  end if;

  select reason
  into persisted_reason
  from public.consultations
  where id = probe_id;

  if persisted_reason is distinct from updated_reason then
    raise exception
      'Student update was not persisted. expected=%, actual=%',
      updated_reason,
      persisted_reason;
  end if;

  raise notice
    'PASS: student can update a consultation owned by their account';
end
$$;

reset role;

\echo 'RLS CHECK 6/6: Verifying administrator write access is denied'

do $$
declare
  admin_id uuid;
  student_id uuid;
  student_consultation_id uuid;
  updated_rows integer;
begin
  select id
  into admin_id
  from auth.users
  where email = 'admin@lms.com';

  select id
  into student_id
  from auth.users
  where email = 'student1@lms.com';

  if admin_id is null then
    raise exception
      'Seeded administrator user not found';
  end if;

  if student_id is null then
    raise exception
      'Seeded student user not found';
  end if;

  select id
  into student_consultation_id
  from public.consultations
  where student_user_id = student_id
  order by created_at
  limit 1;

  if student_consultation_id is null then
    raise exception
      'Seeded student consultation was not found';
  end if;

  execute 'set local role authenticated';

  perform set_config(
    'request.jwt.claim.sub',
    admin_id::text,
    true
  );

  begin
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
      'Write Probe',
      'Administrator insert should be rejected',
      timezone('utc', now()) + interval '1 day',
      'scheduled'
    );

    raise exception
      'Administrator should not be allowed to create consultations';
  exception
    when insufficient_privilege then
      raise notice
        'PASS: administrator cannot create consultations';
  end;

  update public.consultations
  set reason = 'Administrator update should not succeed'
  where id = student_consultation_id;

  get diagnostics updated_rows = row_count;

  if updated_rows <> 0 then
    raise exception
      'Administrator should not be allowed to update consultations';
  end if;

  raise notice
    'PASS: administrator cannot update consultations';
end
$$;

reset role;

\echo 'RLS CHECK RESULT: ALL 6 CHECKS PASSED (transaction rolled back)'

rollback;