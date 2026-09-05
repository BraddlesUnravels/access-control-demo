\set ON_ERROR_STOP on
begin;

\echo 'ACCESS GATE CHECK 1/6: Verifying schema, RLS, privileges, and RPC signature'
do $$
declare
  redeem_function_count integer;
  validate_function_count integer;
begin
  if not exists (
    select
      1
    from
      pg_class as tables
      join pg_namespace as schemas on schemas.oid = tables.relnamespace
    where
      schemas.nspname = 'public'
      and tables.relname = 'access_invites'
      and tables.relrowsecurity) then
  raise exception 'RLS is not enabled on public.access_invites';
end if;
    if not exists (
      select
        1
      from
        pg_class as tables
        join pg_namespace as schemas on schemas.oid = tables.relnamespace
      where
        schemas.nspname = 'public'
        and tables.relname = 'access_visits'
        and tables.relrowsecurity) then
    raise exception 'RLS is not enabled on public.access_visits';
end if;
    if exists (
      select
        1
      from
        information_schema.columns
      where
        table_schema = 'public'
        and table_name = 'access_visits'
        and column_name = 'user_agent') then
    raise exception 'public.access_visits should not contain user_agent';
end if;
    if has_table_privilege('anon', 'public.access_invites', 'SELECT')
      or has_table_privilege('anon', 'public.access_invites', 'INSERT')
      or has_table_privilege('authenticated', 'public.access_invites', 'SELECT')
      or has_table_privilege('authenticated', 'public.access_invites', 'INSERT')
      then
      raise exception 'Browser-facing roles must not directly access access_invites';
    end if;
    if not has_table_privilege('service_role', 'public.access_invites',
      'SELECT') or not has_table_privilege('service_role',
      'public.access_invites', 'INSERT') or has_table_privilege('service_role',
      'public.access_invites', 'UPDATE') or has_table_privilege('service_role',
      'public.access_invites', 'DELETE') then
      raise exception 'service_role access_invites privileges are not least-privilege';
    end if;
    if has_table_privilege('anon', 'public.access_visits', 'SELECT')
      or has_table_privilege('authenticated', 'public.access_visits', 'SELECT')
      or has_table_privilege('service_role', 'public.access_visits', 'SELECT')
      or has_table_privilege('service_role', 'public.access_visits', 'INSERT')
      then
      raise exception 'access_visits should not be directly exposed to application roles';
    end if;
    if not has_function_privilege('anon', 'public.redeem_access_invite(text)', 'EXECUTE') then
      raise exception 'anon must be able to execute redeem_access_invite(text)';
    end if;
    if not has_function_privilege('authenticated', 'public.redeem_access_invite(text)', 'EXECUTE') then
      raise exception 'authenticated must be able to execute redeem_access_invite(text)';
    end if;
    if not has_function_privilege('service_role', 'public.redeem_access_invite(text)', 'EXECUTE') then
      raise exception 'service_role must be able to execute redeem_access_invite(text)';
    end if;
    select
      count(*)
    into
      redeem_function_count
    from
      pg_proc as functions
      join pg_namespace as schemas on schemas.oid = functions.pronamespace
    where
      schemas.nspname = 'public'
      and functions.proname = 'redeem_access_invite';
    if redeem_function_count <> 1 then
      raise exception 'Expected exactly one redeem_access_invite overload. count=%', redeem_function_count;
    end if;
    if not exists (
      select
        1
      from
        pg_proc as functions
        join pg_namespace as schemas on schemas.oid = functions.pronamespace
      where
        schemas.nspname = 'public'
        and functions.proname = 'redeem_access_invite'
        and functions.prosecdef
        and pg_get_function_identity_arguments(functions.oid) = 'p_code_hash text') then
    raise exception 'redeem_access_invite must be SECURITY DEFINER with only p_code_hash';
end if;
    if not has_function_privilege('anon', 'public.validate_access_gate_session(uuid, uuid)',
      'EXECUTE') or not has_function_privilege('authenticated',
      'public.validate_access_gate_session(uuid, uuid)', 'EXECUTE') or not
      has_function_privilege('service_role', 'public.validate_access_gate_session(uuid, uuid)', 'EXECUTE')
      then
      raise exception 'All application roles must be able to execute validate_access_gate_session(uuid, uuid)';
    end if;
    select
      count(*)
    into
      validate_function_count
    from
      pg_proc as functions
      join pg_namespace as schemas on schemas.oid = functions.pronamespace
    where
      schemas.nspname = 'public'
      and functions.proname = 'validate_access_gate_session';
    if validate_function_count <> 1 then
      raise exception 'Expected exactly one validate_access_gate_session overload. count=%', validate_function_count;
    end if;
    if not exists (
      select
        1
      from
        pg_proc as functions
        join pg_namespace as schemas on schemas.oid = functions.pronamespace
      where
        schemas.nspname = 'public'
        and functions.proname = 'validate_access_gate_session'
        and functions.prosecdef
        and pg_get_function_identity_arguments(functions.oid) = 'p_invite_id uuid, p_visit_id uuid') then
    raise exception 'validate_access_gate_session must be SECURITY DEFINER with invite and visit UUID arguments';
end if;
    raise notice 'PASS: access-gate schema and privileges are correct';
end
$$;

\echo 'ACCESS GATE CHECK 2/6: Verifying invite-state constraints'
do $$
begin
  insert into public.access_invites(
    code_hash,
    label,
    access_duration_days)
  values(
    'constraint-valid-unused-hash',
    'Valid unused invite',
    14);
  begin
    insert into public.access_invites(
      code_hash,
      label,
      access_duration_days,
      expires_at)
    values(
      'constraint-partial-window-hash',
      'Invalid partial access window',
      14,
      now() + interval '14 days');
    raise exception 'Expected partial access window to violate a check constraint';
  exception
    when check_violation then
      null;
  end;
  begin
    insert into public.access_invites(
      code_hash,
      label,
      access_duration_days)
    values(
      'constraint-duration-zero-hash',
      'Invalid zero duration',
      0);
    raise exception 'Expected zero-day duration to violate a check constraint';
  exception
    when check_violation then
      null;
  end;
  begin
    insert into public.access_invites(
      code_hash,
      label,
      access_duration_days)
    values(
      'constraint-duration-too-long-hash',
      'Invalid excessive duration',
      366);
    raise exception 'Expected 366-day duration to violate a check constraint';
  exception
    when check_violation then
      null;
  end;
  raise notice 'PASS: invite-state constraints reject inconsistent data';
end
$$;

\echo 'ACCESS GATE CHECK 3/6: Verifying service-role invite creation privileges'
do $$
declare
  created_invite_id uuid;
  selected_label text;
begin
  execute 'set local role service_role';
  insert into public.access_invites(
    code_hash,
    label,
    access_duration_days)
  values (
    'service-role-create-hash',
    'Service role create probe',
    14)
returning
  id
into
  created_invite_id;
  select
    label
  into
    selected_label
  from
    public.access_invites
  where
    id = created_invite_id;
  if selected_label is distinct from 'Service role create probe' then
    raise exception 'service_role could not read the invite it created';
  end if;
  begin
    update
      public.access_invites
    set
      label = 'Forbidden update'
    where
      id = created_invite_id;
    raise exception 'service_role should not have direct UPDATE privilege';
  exception
    when insufficient_privilege then
      null;
  end;
  reset role;
  raise notice 'PASS: service_role can create/read invites but cannot update them directly';
end
$$;

reset role;

\echo 'ACCESS GATE CHECK 4/6: Verifying expected rejection outcomes'
do $$
declare
  revoked_invite_id uuid := gen_random_uuid();
  expired_invite_id uuid := gen_random_uuid();
  invalid_reason text;
  blank_reason text;
  revoked_reason text;
  expired_reason text;
  failed_visit_count integer;
begin
  insert into public.access_invites(
    id,
    code_hash,
    label,
    access_duration_days,
    revoked_at)
  values (
    revoked_invite_id,
    'revoked-redeem-hash',
    'Revoked redeem invite',
    14,
    now());
  insert into public.access_invites(
    id,
    code_hash,
    label,
    access_duration_days,
    first_accessed_at,
    expires_at)
  values (
    expired_invite_id,
    'expired-redeem-hash',
    'Expired redeem invite',
    14,
    now() - interval '15 days',
    now() - interval '1 day');
  execute 'set local role anon';
  select
    reason
  into
    invalid_reason
  from
    public.redeem_access_invite('unknown-redeem-hash');
  select
    reason
  into
    blank_reason
  from
    public.redeem_access_invite('   ');
  select
    reason
  into
    revoked_reason
  from
    public.redeem_access_invite('revoked-redeem-hash');
  select
    reason
  into
    expired_reason
  from
    public.redeem_access_invite('expired-redeem-hash');
  reset role;
  if invalid_reason is distinct from 'invalid' or blank_reason is
    distinct from 'invalid' or revoked_reason is distinct from
    'revoked' or expired_reason is distinct from 'expired' then
    raise exception 'Unexpected rejection outcomes: invalid=%, blank=%, revoked=%, expired=%', invalid_reason, blank_reason,
      revoked_reason, expired_reason;
  end if;
  select
    count(*)
  into
    failed_visit_count
  from
    public.access_visits
  where
    invite_id in (revoked_invite_id, expired_invite_id);
  if failed_visit_count <> 0 then
    raise exception 'Rejected redemptions must not create visits. count=%', failed_visit_count;
  end if;
  raise notice 'PASS: invalid, revoked, and expired redemptions are rejected';
end
$$;

reset role;

\echo 'ACCESS GATE CHECK 5/6: Verifying first-use expiry and reusable redemption'
do $$
declare
  invite_id_value uuid := gen_random_uuid();
  first_reason text;
  second_reason text;
  first_visit_id uuid;
  second_visit_id uuid;
  first_expiry timestamptz;
  second_expiry timestamptz;
  first_access_after_first timestamptz;
  first_access_after_second timestamptz;
  adjusted_expiry timestamptz;
  stored_expiry timestamptz;
  visit_count integer;
  use_count_value integer;
begin
  insert into public.access_invites(
    id,
    code_hash,
    label,
    access_duration_days)
  values (
    invite_id_value,
    'first-use-redeem-hash',
    'First-use redeem invite',
    14);
  execute 'set local role anon';
  select
    reason,
    visit_id,
    access_expires_at
  into
    first_reason,
    first_visit_id,
    first_expiry
  from
    public.redeem_access_invite('first-use-redeem-hash');
  reset role;
  select
    first_accessed_at,
    expires_at
  into
    first_access_after_first,
    stored_expiry
  from
    public.access_invites
  where
    id = invite_id_value;
  if first_reason is distinct from 'ok' or first_visit_id is null
    or first_expiry is null then
    raise exception 'First redemption did not return a complete successful result';
  end if;
  if first_access_after_first is null then
    raise exception 'First redemption must establish first_accessed_at';
  end if;
  if stored_expiry is distinct from first_expiry then
    raise exception 'Returned expiry must match the stored invite expiry';
  end if;
  if first_expiry is distinct from first_access_after_first + interval
    '14 days' then
    raise exception 'Initial expiry must equal first access plus the configured duration';
  end if;
  -- Deliberately change the existing absolute expiry before re-entry.
  -- 
  -- The second redemption must preserve this value. This provides a stronger
  -- non-sliding-expiry test than simply calling the RPC twice inside the same
  -- transaction, because PostgreSQL now() is transaction-stable.
  adjusted_expiry := first_access_after_first + interval '13 days';
  update
    public.access_invites
  set
    expires_at = adjusted_expiry
  where
    id = invite_id_value;
  execute 'set local role anon';
  select
    reason,
    visit_id,
    access_expires_at
  into
    second_reason,
    second_visit_id,
    second_expiry
  from
    public.redeem_access_invite('first-use-redeem-hash');
  reset role;
  if second_reason is distinct from 'ok' then
    raise exception 'Reusable invite should return ok on re-entry. reason=%', second_reason;
  end if;
  if second_visit_id is null or second_visit_id = first_visit_id then
    raise exception 'Each successful redemption must create a distinct visit';
  end if;
  if second_expiry is distinct from adjusted_expiry then
    raise exception 'Re-entry changed the existing expiry. expected=%, actual=%', adjusted_expiry, second_expiry;
  end if;
  select
    first_accessed_at,
    expires_at,
    use_count
  into
    first_access_after_second,
    stored_expiry,
    use_count_value
  from
    public.access_invites
  where
    id = invite_id_value;
  if first_access_after_second is distinct from first_access_after_first then
    raise exception 'Re-entry changed first_accessed_at';
  end if;
  if stored_expiry is distinct from adjusted_expiry then
    raise exception 'Re-entry changed the stored absolute expiry';
  end if;
  select
    count(*)
  into
    visit_count
  from
    public.access_visits
  where
    invite_id = invite_id_value;
  if visit_count <> 2 or use_count_value <> 2 then
    raise exception 'Expected two visits and use_count=2. visits=%, uses=%', visit_count, use_count_value;
  end if;
  raise notice 'PASS: first use starts the window and re-entry does not extend it';
end
$$;

reset role;

\echo 'ACCESS GATE CHECK 7/7: Verifying access-session validation outcomes'
do $$
declare
  valid_invite_id uuid := gen_random_uuid();
  expired_invite_id uuid := gen_random_uuid();
  revoked_invite_id uuid := gen_random_uuid();
  valid_visit_id uuid := gen_random_uuid();
  expired_visit_id uuid := gen_random_uuid();
  revoked_visit_id uuid := gen_random_uuid();
  missing_invite_id uuid := gen_random_uuid();
  missing_visit_id uuid := gen_random_uuid();
  valid_result boolean;
  missing_result boolean;
  expired_result boolean;
  revoked_result boolean;
begin
  insert into public.access_invites(
    id,
    code_hash,
    label,
    access_duration_days,
    first_accessed_at,
    expires_at)
  values
    (
      valid_invite_id,
      'validate-valid-hash',
      'Validation valid invite',
      14,
      now(),
      now() + interval '1 hour'),
(
      expired_invite_id,
      'validate-expired-hash',
      'Validation expired invite',
      14,
      now() - interval '2 days',
      now() - interval '1 hour'),
(
      revoked_invite_id,
      'validate-revoked-hash',
      'Validation revoked invite',
      14,
      now(),
      now() + interval '1 hour');
  update
    public.access_invites
  set
    revoked_at = now()
  where
    id = revoked_invite_id;
  insert into public.access_visits(
    id,
    invite_id)
  values
    (
      valid_visit_id,
      valid_invite_id),
(
      expired_visit_id,
      expired_invite_id),
(
      revoked_visit_id,
      revoked_invite_id);
  execute 'set local role anon';
  select
    public.validate_access_gate_session(valid_invite_id, valid_visit_id)
  into
    valid_result;
  select
    public.validate_access_gate_session(missing_invite_id, missing_visit_id)
  into
    missing_result;
  select
    public.validate_access_gate_session(expired_invite_id, expired_visit_id)
  into
    expired_result;
  select
    public.validate_access_gate_session(revoked_invite_id, revoked_visit_id)
  into
    revoked_result;
  reset role;
  if valid_result is distinct from true then
    raise exception 'A valid access session must be accepted';
  end if;
  if missing_result is distinct from false then
    raise exception 'A missing access session must be rejected';
  end if;
  if expired_result is distinct from false then
    raise exception 'An expired access session must be rejected';
  end if;
  if revoked_result is distinct from false then
    raise exception 'A revoked access session must be rejected';
  end if;
  raise notice 'PASS: valid, missing, expired, and revoked access sessions are handled correctly';
end
$$;

reset role;

\echo 'ACCESS GATE CHECK 8/8: Verifying app roles cannot directly read gate tables'
do $$
begin
  execute 'set local role anon';
  begin
    perform
      1
    from
      public.access_invites
    limit 1;
    raise exception 'anon should not directly read public.access_invites';
  exception
    when insufficient_privilege then
      null;
  end;
  execute 'set local role authenticated';
  begin
    perform
      1
    from
      public.access_visits
    limit 1;
    raise exception 'authenticated should not directly read public.access_visits';
  exception
    when insufficient_privilege then
      null;
  end;
  reset role;
  raise notice 'PASS: browser-facing roles cannot directly read gate tables';
end
$$;

reset role;

\echo 'ACCESS GATE CHECK RESULT: ALL 8 CHECKS PASSED (transaction rolled back)'
rollback;
