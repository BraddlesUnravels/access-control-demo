create type public.app_role as enum(
  'student',
  'admin'
);

create type public.consultation_status as enum(
  'scheduled',
  'completed',
  'cancelled'
);

create or replace function public.set_updated_at()
  returns trigger
  language plpgsql
  as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'student',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
  before update on public.profiles for each row
  execute function public.set_updated_at();

create table public.consultations(
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references public.profiles(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  reason text not null,
  scheduled_for timestamptz not null,
  status public.consultation_status not null default 'scheduled',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  cancelled_at timestamptz,
  constraint consultations_first_name_not_blank check (char_length(trim(first_name)) > 0),
  constraint consultations_last_name_not_blank check (char_length(trim(last_name)) > 0),
  constraint consultations_reason_not_blank check (char_length(trim(reason)) > 0)
);

create index consultations_student_user_id_idx on public.consultations(student_user_id);

create index consultations_scheduled_for_idx on public.consultations(scheduled_for);

create index consultations_status_idx on public.consultations(status);

create trigger consultations_set_updated_at
  before update on public.consultations for each row
  execute function public.set_updated_at();

create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
begin
  insert into public.profiles(
    id,
    role)
  values(
    new.id,
    'student')
on conflict(
  id)
  do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users for each row
  execute function public.handle_new_user();
