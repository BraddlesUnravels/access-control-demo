revoke insert, update
on table public.consultations
from authenticated;

grant insert (
  student_user_id,
  first_name,
  last_name,
  reason,
  scheduled_for
)
on table public.consultations
to authenticated;

grant update (
  scheduled_for,
  status
)
on table public.consultations
to authenticated;

create or replace function private.enforce_consultation_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'cancelled' then
    raise exception 'Cancelled consultations cannot be updated'
      using errcode = '23514';
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  case new.status
    when 'scheduled' then
      new.completed_at = null;
      new.cancelled_at = null;

    when 'completed' then
      new.completed_at = timezone('utc', now());
      new.cancelled_at = null;

    when 'cancelled' then
      new.cancelled_at = timezone('utc', now());
  end case;

  return new;
end;
$$;

create trigger consultations_enforce_lifecycle
before update of scheduled_for, status on public.consultations
for each row
execute function private.enforce_consultation_lifecycle();