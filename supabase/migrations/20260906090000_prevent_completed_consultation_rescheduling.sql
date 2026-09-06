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
  if old.status = 'completed' and new.scheduled_for is distinct from
    old.scheduled_for then
    raise exception 'Completed consultations cannot be rescheduled'
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
