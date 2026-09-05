create or replace function public.validate_access_gate_session(p_invite_id
  uuid, p_visit_id uuid)
  returns boolean
  language sql
  security definer
  set search_path = '' stable
  as $$
  select
    exists(
      select
        1
      from
        public.access_invites as invites
        inner join public.access_visits as visits on visits.invite_id = invites.id
      where
        invites.id = p_invite_id
        and visits.id = p_visit_id
        and invites.first_accessed_at is not null
        and invites.expires_at > now()
        and invites.revoked_at is null);
$$;

revoke all on function public.validate_access_gate_session(uuid, uuid) from public;

grant execute on function public.validate_access_gate_session(uuid, uuid) to
  anon, authenticated, service_role;
