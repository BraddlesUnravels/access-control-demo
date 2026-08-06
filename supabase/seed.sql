-- Local development seed data only.
-- Test credentials:
-- - student1@lms.com / password123
-- - student2@lms.com / password123
-- - admin@lms.com / password123
--
-- Access invite codes (valid only when ACCESS_GATE_CODE_SECRET=replace-with-a-long-random-secret):
-- - ACD-DEV1-TEST  -> Local developer
-- - ACD-DEV2-TEST  -> Local recruiter demo
-- - ACD-EXP1-TEST   -> Expired invite (for gate failure UX)
-- Plaintext codes are never stored. Hashes use sha256(`${secret}:${normalizedCode}`).

do $$
begin
  if not exists (
    select 1
    from auth.users
    where email = 'student1@lms.com'
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
      'student1@lms.com',
      extensions.crypt('password123', extensions.gen_salt('bf')),
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
    where email = 'student2@lms.com'
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
      'student2@lms.com',
      extensions.crypt('password123', extensions.gen_salt('bf')),
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
      extensions.crypt('password123', extensions.gen_salt('bf')),
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
  and email in ('student1@lms.com', 'student2@lms.com', 'admin@lms.com');

insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
select
  users.id::text,
  users.id,
  jsonb_build_object('sub', users.id::text, 'email', users.email),
  'email',
  now(),
  now()
from auth.users as users
where users.email in ('student1@lms.com', 'student2@lms.com', 'admin@lms.com')
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
      'Discuss course progression',
      timezone('utc', now()) - interval '1 day',
      'completed'::public.consultation_status,
      timezone('utc', now()) - interval '20 hours'
    )
) as consultations(first_name, last_name, reason, scheduled_for, status, completed_at)
cross join (
  select id
  from auth.users
  where email = 'student1@lms.com'
) as student
where not exists (
  select 1
  from public.consultations as existing
  where existing.student_user_id = student.id
    and existing.reason = consultations.reason
    and existing.status = consultations.status
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
      'Brad',
      'Student',
      'Review assignment feedback',
      timezone('utc', now()) + interval '2 days',
      'scheduled'::public.consultation_status,
      null::timestamptz
    ),
    (
      'Brad',
      'Student',
      'Discuss course progression',
      timezone('utc', now()) - interval '1 day',
      'completed'::public.consultation_status,
      timezone('utc', now()) - interval '20 hours'
    )
) as consultations(first_name, last_name, reason, scheduled_for, status, completed_at)
cross join (
  select id
  from auth.users
  where email = 'student2@lms.com'
) as student
where not exists (
  select 1
  from public.consultations as existing
  where existing.student_user_id = student.id
    and existing.reason = consultations.reason
    and existing.status = consultations.status
);

-- Local invite gate codes for:
-- ACCESS_GATE_CODE_SECRET=local-access-gate-secret-that-meets-length-requirements
--
-- Test codes:
-- - ACD-DEV1-TEST -> Local developer
-- - ACD-DEV2-TEST -> Local recruiter demo
-- - ACD-EXP1-TEST -> Expired invite (for gate failure UX)
--
-- Valid unused invites have no expiry until their first successful redemption.
-- The expired invite represents a completed 14-day access window that expired

with seeded_invites (
  code_hash,
  label,
  access_duration_days,
  first_accessed_at,
  expires_at,
  revoked_at
) as (
  values
    (
      '7ddb0b8ed9c019afa6210be5f501e38e85db6e031e026b3c8a7a6b6fdca7bafa',
      'Local developer',
      14,
      null::timestamptz,
      null::timestamptz,
      null::timestamptz
    ),
    (
      '23895648c8925754b5863412f1c4bc100d89b3b1501c2b35863ce4029712a700',
      'Local recruiter demo',
      14,
      null::timestamptz,
      null::timestamptz,
      null::timestamptz
    ),
    (
      '3b5e12b20639a4a40d03169e838ab0ff617ee3243ae227540973d2c7d34bba07',
      'Expired local invite',
      14,
      now() - interval '15 days',
      now() - interval '1 day',
      null::timestamptz
    )
)
insert into public.access_invites (
  code_hash,
  label,
  access_duration_days,
  first_accessed_at,
  expires_at,
  revoked_at
)
select
  code_hash,
  label,
  access_duration_days,
  first_accessed_at,
  expires_at,
  revoked_at
from seeded_invites
on conflict (code_hash) do nothing;