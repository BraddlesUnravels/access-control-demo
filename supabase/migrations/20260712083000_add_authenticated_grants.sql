grant usage on schema public to authenticated;

grant select on table public.profiles to authenticated;

grant select, insert, update, delete on table public.consultations to authenticated;
