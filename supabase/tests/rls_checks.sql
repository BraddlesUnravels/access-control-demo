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

\echo 'RLS CHECK 7/8: Verifying access invite tables are not readable by app roles'

do $$
declare
  invite_id uuid := gen_random_uuid();
  anon_visible integer;
  authenticated_visible integer;
begin
  insert into public.access_invites (
    id,
    code_hash,
    label
  )
  values (
    invite_id,
    'rls-probe-code-hash',
    'RLS probe invite'
  );

  execute 'set local role anon';

  select count(*)
  into anon_visible
  from public.access_invites
  where id = invite_id;

  if anon_visible <> 0 then
    raise exception
      'anon should not read access_invites. visible_count=%',
      anon_visible;
  end if;

  execute 'set local role authenticated';

  select count(*)
  into authenticated_visible
  from public.access_invites
  where id = invite_id;

  if authenticated_visible <> 0 then
    raise exception
      'authenticated should not read access_invites. visible_count=%',
      authenticated_visible;
  end if;

  raise notice
    'PASS: anon and authenticated cannot read access invite rows';
end
$$;

reset role;

\echo 'RLS CHECK 8/8: Verifying redeem_access_invite success, expiry, and re-use'

do $$
declare
  active_invite_id uuid := gen_random_uuid();
  expired_invite_id uuid := gen_random_uuid();
  first_reason text;
  second_reason text;
  expired_reason text;
  first_visit_id uuid;
  second_visit_id uuid;
  visit_count integer;
  use_count_value integer;
begin
  insert into public.access_invites (
    id,
    code_hash,
    label
  )
  values (
    active_invite_id,
    'active-redeem-hash',
    'Active redeem invite'
  );

  insert into public.access_invites (
    id,
    code_hash,
    label,
    expires_at
  )
  values (
    expired_invite_id,
    'expired-redeem-hash',
    'Expired redeem invite',
    timezone('utc', now()) - interval '1 hour'
  );

  execute 'set local role anon';

  select reason, visit_id
  into first_reason, first_visit_id
  from public.redeem_access_invite('active-redeem-hash', 'rls-agent');

  if first_reason is distinct from 'ok' then
    raise exception
      'Active invite redeem should succeed. reason=%',
      first_reason;
  end if;

  if first_visit_id is null then
    raise exception 'Active invite redeem should return a visit id';
  end if;

  select reason, visit_id
  into second_reason, second_visit_id
  from public.redeem_access_invite('active-redeem-hash', 'rls-agent-2');

  if second_reason is distinct from 'ok' then
    raise exception
      'Active invite should be reusable. reason=%',
      second_reason;
  end if;

  if second_visit_id is null or second_visit_id = first_visit_id then
    raise exception
      'Reusable redeem should create a distinct visit id';
  end if;

  select reason
  into expired_reason
  from public.redeem_access_invite('expired-redeem-hash', 'rls-agent');

  if expired_reason is distinct from 'expired' then
    raise exception
      'Expired invite should return expired. reason=%',
      expired_reason;
  end if;

  reset role;

  select count(*)
  into visit_count
  from public.access_visits
  where invite_id = active_invite_id;

  if visit_count <> 2 then
    raise exception
      'Expected two visits for reusable invite. visit_count=%',
      visit_count;
  end if;

  select use_count
  into use_count_value
  from public.access_invites
  where id = active_invite_id;

  if use_count_value <> 2 then
    raise exception
      'Expected use_count=2 after two redeems. use_count=%',
      use_count_value;
  end if;

  raise notice
    'PASS: redeem_access_invite allows reuse and rejects expired codes';
end
$$;

\echo 'RLS CHECK RESULT: ALL 8 CHECKS PASSED (transaction rolled back)'

rollback;
