begin;

\echo 'RLS CHECK 1/7: Verifying required policies exist'
do $$
declare
  expected_policies text[] := array['profiles_select_own', 'consultations_select_own_or_admin',
    'consultations_insert_own', 'consultations_update_own'];
  missing_policies text[];
begin
  select
    coalesce(array_agg(policy_name), '{}')
  into
    missing_policies
  from (
    select
      policy_name
    from
      unnest(expected_policies) as expected(policy_name)
    where
      not exists (
        select
          1
        from
          pg_policies
        where
          schemaname = 'public'
          and policyname = expected.policy_name)) missing;
  if cardinality(missing_policies) > 0 then
    raise exception 'Missing expected policies: %', array_to_string(missing_policies, ', ');
  end if;
  raise notice 'PASS: required policies are present';
end
$$;

\echo 'RLS CHECK 2/7: Verifying RLS is enabled on target tables'
do $$
begin
  if not exists(
    select
      1
    from
      pg_class c
      join pg_namespace n on n.oid = c.relnamespace
    where
      n.nspname = 'public'
      and c.relname = 'profiles'
      and c.relrowsecurity) then
  raise exception 'RLS is not enabled on public.profiles';
end if;
  if not exists(
    select
      1
    from
      pg_class c
      join pg_namespace n on n.oid = c.relnamespace
    where
      n.nspname = 'public'
      and c.relname = 'consultations'
      and c.relrowsecurity) then
  raise exception 'RLS is not enabled on public.consultations';
end if;
  raise notice 'PASS: RLS enabled on public.profiles and public.consultations';
end
$$;

\echo 'RLS CHECK 3/7: Verifying least-privilege table grants for LMS tables'
do $$
declare
  role_name text;
  table_name text;
  privilege_name text;
  non_row_privileges text[] := array['DELETE', 'TRUNCATE',
    'REFERENCES', 'TRIGGER', 'MAINTAIN'];
  browser_roles text[] := array['anon', 'authenticated'];
  lms_tables text[] := array['public.profiles', 'public.consultations'];
begin
  -- Browser-facing roles must not hold privileges that RLS cannot constrain,
  -- and must not hold physical DELETE on consultations.
  foreach role_name in array browser_roles loop
    foreach table_name in array lms_tables loop
      foreach privilege_name in array non_row_privileges loop
        if has_table_privilege(role_name, table_name, privilege_name) then
          raise exception '% must not have % on %', role_name, privilege_name, table_name;
        end if;
      end loop;
    end loop;
  end loop;
  if has_table_privilege('anon', 'public.profiles', 'SELECT') or
    has_table_privilege('anon', 'public.profiles', 'INSERT') or
    has_table_privilege('anon', 'public.profiles', 'UPDATE') or
    has_table_privilege('anon', 'public.consultations', 'SELECT') or
    has_table_privilege('anon', 'public.consultations', 'INSERT') or
    has_table_privilege('anon', 'public.consultations', 'UPDATE') then
    raise exception 'anon must not have direct row privileges on LMS tables';
  end if;
  if not has_table_privilege('authenticated', 'public.profiles', 'SELECT') then
    raise exception 'authenticated must retain SELECT on public.profiles';
  end if;
  if not has_table_privilege('authenticated', 'public.consultations', 'SELECT') then
    raise exception 'authenticated must retain SELECT on public.consultations';
  end if;
  -- Consultation mutations are intentionally column-scoped. Table-level
  -- INSERT/UPDATE privileges stay absent; only these columns are writable.
  if not has_column_privilege('authenticated', 'public.consultations',
    'student_user_id', 'INSERT') or not
    has_column_privilege('authenticated', 'public.consultations', 'first_name',
    'INSERT') or not has_column_privilege('authenticated',
    'public.consultations', 'last_name', 'INSERT') or not
    has_column_privilege('authenticated', 'public.consultations', 'reason',
    'INSERT') or not has_column_privilege('authenticated',
    'public.consultations', 'scheduled_for', 'INSERT') then
    raise exception 'authenticated must retain column INSERT privileges on public.consultations';
  end if;
  if not has_column_privilege('authenticated', 'public.consultations',
    'scheduled_for', 'UPDATE') or not
    has_column_privilege('authenticated', 'public.consultations', 'status',
    'UPDATE') then
    raise exception 'authenticated must retain column UPDATE privileges on public.consultations';
  end if;
  if has_column_privilege('authenticated', 'public.consultations', 'id',
    'INSERT') or has_column_privilege('authenticated', 'public.consultations',
    'status', 'INSERT') or has_column_privilege('authenticated',
    'public.consultations', 'created_at', 'INSERT') or
    has_column_privilege('authenticated', 'public.consultations', 'updated_at',
    'INSERT') or has_column_privilege('authenticated',
    'public.consultations', 'completed_at', 'INSERT') or
    has_column_privilege('authenticated', 'public.consultations', 'cancelled_at',
    'INSERT') or has_column_privilege('authenticated',
    'public.consultations', 'completed_at', 'UPDATE') or
    has_column_privilege('authenticated', 'public.consultations', 'cancelled_at',
    'UPDATE') then
    raise exception 'authenticated must not write protected consultation columns';
  end if;
  -- service_role is reserved for trusted operator paths such as invite creation.
  -- It must not retain direct LMS table privileges by default.
  foreach table_name in array lms_tables loop
    foreach privilege_name in array array['SELECT', 'INSERT',
      'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES',
      'TRIGGER', 'MAINTAIN'] loop
      if has_table_privilege('service_role', table_name, privilege_name) then
        raise exception 'service_role must not have % on %', privilege_name, table_name;
      end if;
    end loop;
  end loop;
  raise notice 'PASS: LMS table privileges match the least-privilege model';
end
$$;

\echo 'RLS CHECK 4/7: Verifying TRUNCATE is denied at runtime for browser roles'
do $$
begin
  begin
    execute 'set local role anon';
    execute 'truncate table public.consultations';
    raise exception 'anon was able to truncate public.consultations';
  exception
    when insufficient_privilege then
      raise notice 'PASS: anon cannot truncate public.consultations';
  end;
  reset role;
  begin
    execute 'set local role authenticated';
    execute 'truncate table public.profiles';
    raise exception 'authenticated was able to truncate public.profiles';
  exception
    when insufficient_privilege then
      raise notice 'PASS: authenticated cannot truncate public.profiles';
  end;
  reset role;
end
$$;

\echo 'RLS CHECK 5/7: Verifying student/admin visibility behavior'
do $$
declare
  student_id uuid;
  admin_id uuid;
  probe_reason text := 'RLS probe visibility check';
  student_probe_visible integer;
  admin_probe_visible integer;
begin
  select
    id
  into
    student_id
  from
    auth.users
  where
    email = 'student1@lms.com';
  select
    id
  into
    admin_id
  from
    auth.users
  where
    email = 'admin@lms.com';
  if student_id is null then
    raise exception 'Seeded student user not found';
  end if;
  if admin_id is null then
    raise exception 'Seeded admin user not found';
  end if;
  -- Create the probe as the database owner so this check tests only
  -- visibility behaviour, not insert authorization.
  insert into public.consultations(
    student_user_id,
    first_name,
    last_name,
    reason,
    scheduled_for,
    status)
  values (
    admin_id,
    'Admin',
    'Probe',
    probe_reason,
    timezone(
      'utc', now()) + interval '1 day',
    'scheduled');
  execute 'set local role authenticated';
  perform
    set_config('request.jwt.claim.sub', student_id::text, true);
  select
    count(*)
  into
    student_probe_visible
  from
    public.consultations
  where
    reason = probe_reason;
  if student_probe_visible <> 0 then
    raise exception 'Student should not see admin probe row. visible_count=%', student_probe_visible;
  end if;
  raise notice 'PASS: student cannot see admin-owned probe row';
  perform
    set_config('request.jwt.claim.sub', admin_id::text, true);
  select
    count(*)
  into
    admin_probe_visible
  from
    public.consultations
  where
    reason = probe_reason;
  if admin_probe_visible <> 1 then
    raise exception 'Admin should see admin probe row. visible_count=%', admin_probe_visible;
  end if;
  raise notice 'PASS: admin can see admin-owned probe row';
end
$$;

reset role;

\echo 'RLS CHECK 6/7: Verifying student mutation boundary and lifecycle enforcement'
do $$
declare
  student_id uuid;
  other_student_id uuid;
  other_consultation_id uuid;
  probe_id uuid;
  completed_time timestamptz;
  cancelled_time timestamptz;
  updated_rows integer;
begin
  select
    id
  into
    student_id
  from
    auth.users
  where
    email = 'student1@lms.com';
  select
    id
  into
    other_student_id
  from
    auth.users
  where
    email = 'student2@lms.com';
  if student_id is null or other_student_id is null then
    raise exception 'Seeded student users were not found';
  end if;
  select
    id
  into
    other_consultation_id
  from
    public.consultations
  where
    student_user_id = other_student_id
  order by
    created_at
  limit 1;
  if other_consultation_id is null then
    raise exception 'Seeded consultation for student2 was not found';
  end if;
  execute 'set local role authenticated';
  perform
    set_config('request.jwt.claim.sub', student_id::text, true);
  -- Legitimate create using only client-writable columns.
  insert into public.consultations(
    student_user_id,
    first_name,
    last_name,
    reason,
    scheduled_for)
  values (
    student_id,
    'Student',
    'Lifecycle Probe',
    'Student lifecycle mutation probe',
    timezone(
      'utc', now()) + interval '1 day')
returning
  id
into
  probe_id;
  if not exists (
    select
      1
    from
      public.consultations
    where
      id = probe_id
      and status = 'scheduled'
      and completed_at is null
      and cancelled_at is null) then
  raise exception 'Student-created consultation should use database defaults';
end if;
  raise notice 'PASS: student can create a consultation using permitted columns';
  -- Protected insert columns must not be client controlled.
  begin
    insert into public.consultations(
      id,
      student_user_id,
      first_name,
      last_name,
      reason,
      scheduled_for)
    values (
      gen_random_uuid(),
      student_id,
      'Student',
      'Protected Insert Probe',
      'Protected ID insert should be rejected',
      timezone(
        'utc', now()) + interval '1 day');
    raise exception 'Student should not be allowed to supply consultation ID';
  exception
    when insufficient_privilege then
      raise notice 'PASS: student cannot supply protected insert columns';
  end;
  -- Immutable-after-creation fields must not be writable directly.
  begin
    update
      public.consultations
    set
      reason = 'Protected reason update should be rejected'
    where
      id = probe_id;
      raise exception 'Student should not be allowed to update consultation reason';
  exception
    when insufficient_privilege then
      raise notice 'PASS: student cannot update protected consultation columns';
  end;
  -- PostgreSQL owns completion metadata.
  update
    public.consultations
  set
    status = 'completed'
  where
    id = probe_id;
    select
      completed_at
    into
      completed_time
    from
      public.consultations
    where
      id = probe_id;
      if completed_time is null then
        raise exception 'Database should set completed_at when status becomes completed';
        end if;
        raise notice 'PASS: database records consultation completion time';
        -- Completed consultations cannot be rescheduled.
        begin
          update
            public.consultations
          set
            scheduled_for = scheduled_for + interval '1 hour'
          where
            id = probe_id;
            raise exception 'Completed consultation should not be reschedulable';
        exception
          when check_violation then
            raise notice 'PASS: completed consultation cannot be rescheduled';
        end;
        -- Existing behaviour allows completed -> scheduled.
        update
          public.consultations
        set
          status = 'scheduled'
        where
          id = probe_id;
          if exists (
            select
              1
            from
              public.consultations
            where
              id = probe_id
              and completed_at is not null) then
          raise exception 'Returning a consultation to scheduled should clear completed_at';
end if;
raise notice 'PASS: returning to scheduled clears completion time';
-- PostgreSQL also owns cancellation metadata.
update
  public.consultations
set
  status = 'cancelled'
where
  id = probe_id;
  select
    cancelled_at
  into
    cancelled_time
  from
    public.consultations
  where
    id = probe_id;
    if cancelled_time is null then
      raise exception 'Database should set cancelled_at when status becomes cancelled';
      end if;
      raise notice 'PASS: database records consultation cancellation time';
      -- Cancellation remains terminal.
      begin
        update
          public.consultations
        set
          scheduled_for = scheduled_for + interval '1 hour'
        where
          id = probe_id;
          raise exception 'Cancelled consultation should not be reschedulable';
      exception
        when check_violation then
          raise notice 'PASS: cancelled consultation cannot be updated';
      end;
      -- Use an allowed column so RLS, not the column ACL, is what blocks this.
      update
        public.consultations
      set
        scheduled_for = scheduled_for + interval '1 hour'
      where
        id = other_consultation_id;
        get diagnostics updated_rows = row_count;
        if updated_rows <> 0 then
          raise exception 'Student should not update another student consultation. updated_rows=%', updated_rows;
          end if;
          raise notice 'PASS: student cannot update another student consultation';
end
$$;

reset role;

reset role;

\echo 'RLS CHECK 7/7: Verifying administrator write access is denied'
do $$
declare
  admin_id uuid;
  student_id uuid;
  student_consultation_id uuid;
  updated_rows integer;
begin
  select
    id
  into
    admin_id
  from
    auth.users
  where
    email = 'admin@lms.com';
  select
    id
  into
    student_id
  from
    auth.users
  where
    email = 'student1@lms.com';
  if admin_id is null then
    raise exception 'Seeded administrator user not found';
  end if;
  if student_id is null then
    raise exception 'Seeded student user not found';
  end if;
  select
    id
  into
    student_consultation_id
  from
    public.consultations
  where
    student_user_id = student_id
  order by
    created_at
  limit 1;
  if student_consultation_id is null then
    raise exception 'Seeded student consultation was not found';
  end if;
  execute 'set local role authenticated';
  perform
    set_config('request.jwt.claim.sub', admin_id::text, true);
  begin
    insert into public.consultations(
      student_user_id,
      first_name,
      last_name,
      reason,
      scheduled_for,
      status)
    values (
      admin_id,
      'Admin',
      'Write Probe',
      'Administrator insert should be rejected',
      timezone(
        'utc', now()) + interval '1 day',
      'scheduled');
    raise exception 'Administrator should not be allowed to create consultations';
  exception
    when insufficient_privilege then
      raise notice 'PASS: administrator cannot create consultations';
  end;
  update
    public.consultations
  set
    scheduled_for = scheduled_for + interval '1 hour'
  where
    id = student_consultation_id;
    get diagnostics updated_rows = row_count;
    if updated_rows <> 0 then
      raise exception 'Administrator should not be allowed to update consultations';
      end if;
      raise notice 'PASS: administrator cannot update consultations';
end
$$;

reset role;

\echo 'RLS CHECK RESULT: ALL 7 CHECKS PASSED (transaction rolled back)'
rollback;
