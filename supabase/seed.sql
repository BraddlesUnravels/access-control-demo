-- Local development seed data only.
-- Test credentials:
-- - student@lms.com / password123
-- - admin@lms.com / password123

do $$
begin
  if not exists (
    select 1
    from auth.users
    where email = 'student@lms.com'
  ) then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      confirmation_token,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'student@lms.com',
      crypt('password123', gen_salt('bf')),
      '',
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now()
    );
  end if;

  if not exists (
    select 1
    from auth.users
    where email = 'admin@lms.com'
  ) then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      confirmation_token,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@lms.com',
      crypt('password123', gen_salt('bf')),
      '',
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now()
    );
  end if;
end $$;

update auth.users
set
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_new = coalesce(email_change_token_new, '')
where
  (
    confirmation_token is null
    or recovery_token is null
    or email_change is null
    or email_change_token_new is null
  )
  and email in ('student@lms.com', 'admin@lms.com');

insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
select
  users.id::text,
  users.id,
  jsonb_build_object('sub', users.id::text, 'email', users.email),
  'email',
  now(),
  now()
from auth.users as users
where users.email in ('student@lms.com', 'admin@lms.com')
on conflict (provider, provider_id) do nothing;

update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where email = 'admin@lms.com'
);

insert into public.consultations (
  student_user_id,
  first_name,
  last_name,
  reason,
  scheduled_for,
  status,
  completed_at
)
select
  student.id,
  consultations.first_name,
  consultations.last_name,
  consultations.reason,
  consultations.scheduled_for,
  consultations.status,
  consultations.completed_at
from (
  values
    (
      'Sam',
      'Student',
      'Review assignment feedback',
      timezone('utc', now()) + interval '2 days',
      'scheduled'::public.consultation_status,
      null::timestamptz
    ),
    (
      'Sam',
      'Student',
      'Discuss interview preparation',
      timezone('utc', now()) - interval '1 day',
      'completed'::public.consultation_status,
      timezone('utc', now()) - interval '20 hours'
    )
) as consultations(first_name, last_name, reason, scheduled_for, status, completed_at)
cross join (
  select id
  from auth.users
  where email = 'student@lms.com'
) as student
where not exists (
  select 1
  from public.consultations as existing
  where existing.student_user_id = student.id
    and existing.reason = consultations.reason
    and existing.status = consultations.status
);
