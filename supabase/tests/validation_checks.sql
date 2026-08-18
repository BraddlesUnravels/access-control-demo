begin;

\echo 'VALIDATION CHECK 1/4: Verifying consultation text values at configured limits are accepted'

do $$
declare
  student_id uuid;
begin
  select id
  into student_id
  from auth.users
  where email = 'student1@lms.com';

  if student_id is null then
    raise exception 'Seeded student user not found';
  end if;

  insert into public.consultations (
    student_user_id,
    first_name,
    last_name,
    reason,
    scheduled_for
  )
  values (
    student_id,
    repeat('a', 100),
    repeat('b', 100),
    repeat('c', 2000),
    timezone('utc', now()) + interval '1 day'
  );

  raise notice
    'PASS: consultation text values at configured limits are accepted';
end
$$;

\echo 'VALIDATION CHECK 2/4: Verifying oversized first names are rejected'

do $$
declare
  student_id uuid;
  violated_constraint text;
begin
  select id
  into student_id
  from auth.users
  where email = 'student1@lms.com';

  if student_id is null then
    raise exception 'Seeded student user not found';
  end if;

  begin
    insert into public.consultations (
      student_user_id,
      first_name,
      last_name,
      reason,
      scheduled_for
    )
    values (
      student_id,
      repeat('a', 101),
      'Validation',
      'Oversized first-name probe',
      timezone('utc', now()) + interval '1 day'
    );

    raise exception
      'Expected oversized first name to be rejected';
  exception
    when check_violation then
      get stacked diagnostics violated_constraint = constraint_name;

      if violated_constraint
        is distinct from 'consultations_first_name_max_length'
      then
        raise exception
          'Unexpected constraint for oversized first name: %',
          violated_constraint;
      end if;
  end;

  raise notice 'PASS: oversized first name is rejected';
end
$$;

\echo 'VALIDATION CHECK 3/4: Verifying oversized last names are rejected'

do $$
declare
  student_id uuid;
  violated_constraint text;
begin
  select id
  into student_id
  from auth.users
  where email = 'student1@lms.com';

  if student_id is null then
    raise exception 'Seeded student user not found';
  end if;

  begin
    insert into public.consultations (
      student_user_id,
      first_name,
      last_name,
      reason,
      scheduled_for
    )
    values (
      student_id,
      'Validation',
      repeat('b', 101),
      'Oversized last-name probe',
      timezone('utc', now()) + interval '1 day'
    );

    raise exception
      'Expected oversized last name to be rejected';
  exception
    when check_violation then
      get stacked diagnostics violated_constraint = constraint_name;

      if violated_constraint
        is distinct from 'consultations_last_name_max_length'
      then
        raise exception
          'Unexpected constraint for oversized last name: %',
          violated_constraint;
      end if;
  end;

  raise notice 'PASS: oversized last name is rejected';
end
$$;

\echo 'VALIDATION CHECK 4/4: Verifying oversized consultation reasons are rejected'

do $$
declare
  student_id uuid;
  violated_constraint text;
begin
  select id
  into student_id
  from auth.users
  where email = 'student1@lms.com';

  if student_id is null then
    raise exception 'Seeded student user not found';
  end if;

  begin
    insert into public.consultations (
      student_user_id,
      first_name,
      last_name,
      reason,
      scheduled_for
    )
    values (
      student_id,
      'Validation',
      'Probe',
      repeat('c', 2001),
      timezone('utc', now()) + interval '1 day'
    );

    raise exception
      'Expected oversized consultation reason to be rejected';
  exception
    when check_violation then
      get stacked diagnostics violated_constraint = constraint_name;

      if violated_constraint
        is distinct from 'consultations_reason_max_length'
      then
        raise exception
          'Unexpected constraint for oversized consultation reason: %',
          violated_constraint;
      end if;
  end;

  raise notice 'PASS: oversized consultation reason is rejected';
end
$$;

\echo 'VALIDATION CHECK RESULT: ALL 4 CHECKS PASSED (transaction rolled back)'

rollback;