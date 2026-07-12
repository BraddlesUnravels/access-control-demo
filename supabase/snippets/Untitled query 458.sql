-- Optional: consultations + profile role in one view
select
  c.id,
  c.student_user_id,
  p.role as student_role,
  c.first_name,
  c.last_name,
  c.reason,
  c.scheduled_for,
  c.status,
  c.created_at
from public.consultations c
join public.profiles p
  on p.id = c.student_user_id
order by c.scheduled_for desc;