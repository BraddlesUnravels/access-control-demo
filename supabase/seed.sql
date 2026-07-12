-- Local development seed data only.
-- Test credentials:
-- - student@example.com / password123
-- - admin@example.com / password123

do $$
begin
  if not exists (
    select 1
    from auth.users
    where id = '11111111-1111-1111-1111-111111111111'
  ) then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      '11111111-1111-1111-1111-111111111111',
      'authenticated',
      'authenticated',
      'student@example.com',
      crypt('password123', gen_salt('bf')),
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
    where id = '22222222-2222-2222-2222-222222222222'
  ) then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      '22222222-2222-2222-2222-222222222222',
      'authenticated',
      'authenticated',
      'admin@example.com',
      crypt('password123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now()
    );
  end if;
end $$;

insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  created_at,
  updated_at
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"student@example.com"}',
    'email',
    now(),
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"admin@example.com"}',
    'email',
    now(),
    now()
  )
on conflict (provider, provider_id) do nothing;

update public.profiles
set role = 'admin'
where id = '22222222-2222-2222-2222-222222222222';

insert into public.consultations (
  id,
  student_user_id,
  first_name,
  last_name,
  reason,
  scheduled_for,
  status,
  completed_at
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Sam',
    'Student',
    'Review assignment feedback',
    timezone('utc', now()) + interval '2 days',
    'scheduled',
    null
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    'Sam',
    'Student',
    'Discuss interview preparation',
    timezone('utc', now()) - interval '1 day',
    'completed',
    timezone('utc', now()) - interval '20 hours'
  )
on conflict (id) do nothing;
