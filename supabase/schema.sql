set statement_timeout = 0;

set lock_timeout = 0;

set idle_in_transaction_session_timeout = 0;

set client_encoding = 'UTF8';

set standard_conforming_strings = on;

select
  pg_catalog.set_config('search_path', '', false);

set check_function_bodies = false;

set xmloption = content;

set client_min_messages = warning;

set row_security = off;

create schema if not exists "private";

alter schema "private" owner to "postgres";

create schema if not exists "public";

alter schema "public" owner to "pg_database_owner";

comment on schema "public" is 'standard public schema';

create type "public"."app_role" as ENUM(
  'student',
  'admin'
);

alter type "public"."app_role" owner to "postgres";

create type "public"."consultation_status" as ENUM(
  'scheduled',
  'completed',
  'cancelled'
);

alter type "public"."consultation_status" owner to "postgres";

create or replace function "private"."enforce_consultation_lifecycle"()
  returns "trigger"
  language "plpgsql"
  set "search_path" to ''
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

alter function "private"."enforce_consultation_lifecycle"() owner to "postgres";

create or replace function "private"."has_role"("required_role" "public"."app_role")
  returns boolean
  language "sql"
  stable
  security definer
  set "search_path" to ''
  as $$
  select
    exists(
      select
        1
      from
        public.profiles
      where
        id =(
          select
            auth.uid())
          and role = required_role);
$$;

alter function "private"."has_role"("required_role" "public"."app_role") owner
  to "postgres";

create or replace function "public"."handle_new_user"()
  returns "trigger"
  language "plpgsql"
  security definer
  set "search_path" to ''
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

alter function "public"."handle_new_user"() owner to "postgres";

create or replace function "public"."redeem_access_invite"("p_code_hash" "text")
  returns table(
    "invite_id" "uuid",
    "visit_id" "uuid",
    "label" "text",
    "access_expires_at" timestamp with time zone,
    "reason" "text")
  language "plpgsql"
  security definer
  set "search_path" to ''
  as $$
declare
  selected_invite public.access_invites%rowtype;
  created_visit_id uuid;
  redeemed_at timestamptz := now();
begin
  if p_code_hash is null or char_length(trim(p_code_hash)) = 0 then
    return query
    select
      null::uuid,
      null::uuid,
      null::text,
      null::timestamptz,
      'invalid'::text;
    return;
  end if;
  -- Serialize redemption of a particular invite.
  --
  -- This ensures that concurrent first-redemption requests cannot establish
  -- different first_accessed_at or expires_at values.
  select
    *
  into
    selected_invite
  from
    public.access_invites as invites
  where
    invites.code_hash = p_code_hash
  for update;
  if not found then
    return query
    select
      null::uuid,
      null::uuid,
      null::text,
      null::timestamptz,
      'invalid'::text;
    return;
  end if;
  if selected_invite.revoked_at is not null then
    return query
    select
      selected_invite.id,
      null::uuid,
      selected_invite.label,
      selected_invite.expires_at,
      'revoked'::text;
    return;
  end if;
  if selected_invite.expires_at is not null and selected_invite.expires_at <=
    redeemed_at then
    return query
    select
      selected_invite.id,
      null::uuid,
      selected_invite.label,
      selected_invite.expires_at,
      'expired'::text;
    return;
  end if;
  if selected_invite.first_accessed_at is null then
    update
      public.access_invites as invites
    set
      first_accessed_at = redeemed_at,
      expires_at = redeemed_at + make_interval(days => invites.access_duration_days),
      use_count = invites.use_count + 1
    where
      invites.id = selected_invite.id
    returning
      *
    into
      selected_invite;
  else
    update
      public.access_invites as invites
    set
      use_count = invites.use_count + 1
    where
      invites.id = selected_invite.id
    returning
      *
    into
      selected_invite;
  end if;
  insert into public.access_visits(
    invite_id,
    used_at)
  values (
    selected_invite.id,
    redeemed_at)
returning
  id
into
  created_visit_id;
  return query
  select
    selected_invite.id,
    created_visit_id,
    selected_invite.label,
    selected_invite.expires_at,
    'ok'::text;
end;
$$;

alter function "public"."redeem_access_invite"("p_code_hash" "text") owner to
  "postgres";

create or replace function "public"."set_updated_at"()
  returns "trigger"
  language "plpgsql"
  set "search_path" to ''
  as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

alter function "public"."set_updated_at"() owner to "postgres";

create or replace function
  "public"."validate_access_gate_session"("p_invite_id" "uuid", "p_visit_id"
  "uuid")
  returns boolean
  language "sql"
  stable
  security definer
  set "search_path" to ''
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

alter function "public"."validate_access_gate_session"("p_invite_id" "uuid",
  "p_visit_id" "uuid") owner to "postgres";

set default_tablespace = '';

set default_table_access_method = "heap";

create table if not exists "public"."access_invites"(
  "id" "uuid" default "gen_random_uuid"() not null,
  "code_hash" "text" not null,
  "label" "text" not null,
  "created_at" timestamp with time zone default
    "timezone"('utc'::"text", "now"()) not null,
  "expires_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "use_count" integer default 0 not null,
  "access_duration_days" integer default 7 not null,
  "first_accessed_at" timestamp with time zone,
  constraint "access_invites_access_window_consistent" check
    (((("first_accessed_at" is null) and ("expires_at" is null)) or
    (("first_accessed_at" is not null) and ("expires_at" is not null) and
    ("expires_at" > "first_accessed_at")))),
  constraint "access_invites_code_hash_not_blank" check
    (("char_length"(trim(both from "code_hash")) > 0)),
  constraint "access_invites_duration_days_range" check
    ((("access_duration_days" >= 1) and ("access_duration_days" <= 365))),
  constraint "access_invites_label_not_blank" check (("char_length"(trim(both
    from "label")) > 0)),
  constraint "access_invites_use_count_non_negative" check (("use_count" >= 0))
);

alter table "public"."access_invites" owner to "postgres";

create table if not exists "public"."access_visits"(
  "id" "uuid" default "gen_random_uuid"() not null,
  "invite_id" "uuid" not null,
  "used_at" timestamp with time zone default
    "timezone"('utc'::"text", "now"()) not null
);

alter table "public"."access_visits" owner to "postgres";

create table if not exists "public"."consultations"(
  "id" "uuid" default "gen_random_uuid"() not null,
  "student_user_id" "uuid" not null,
  "first_name" "text" not null,
  "last_name" "text" not null,
  "reason" "text" not null,
  "scheduled_for" timestamp with time zone not null,
  "status" "public"."consultation_status" default
    'scheduled'::"public"."consultation_status" not null,
  "created_at" timestamp with time zone default
    "timezone"('utc'::"text", "now"()) not null,
  "updated_at" timestamp with time zone default
    "timezone"('utc'::"text", "now"()) not null,
  "completed_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  constraint "consultations_first_name_max_length" check
    (("char_length"("first_name") <= 100)),
  constraint "consultations_first_name_not_blank" check
    (("char_length"(trim(both from "first_name")) > 0)),
  constraint "consultations_last_name_max_length" check
    (("char_length"("last_name") <= 100)),
  constraint "consultations_last_name_not_blank" check
    (("char_length"(trim(both from "last_name")) > 0)),
  constraint "consultations_reason_max_length" check (("char_length"("reason") <= 2000)),
  constraint "consultations_reason_not_blank" check (("char_length"(trim(both
    from "reason")) > 0))
);

alter table "public"."consultations" owner to "postgres";

create table if not exists "public"."profiles"(
  "id" "uuid" not null,
  "role" "public"."app_role" default 'student'::"public"."app_role" not null,
  "created_at" timestamp with time zone default
    "timezone"('utc'::"text", "now"()) not null,
  "updated_at" timestamp with time zone default
    "timezone"('utc'::"text", "now"()) not null
);

alter table "public"."profiles" owner to "postgres";

alter table only "public"."access_invites"
  add constraint "access_invites_pkey" primary key ("id");

alter table only "public"."access_visits"
  add constraint "access_visits_pkey" primary key ("id");

alter table only "public"."consultations"
  add constraint "consultations_pkey" primary key ("id");

alter table only "public"."profiles"
  add constraint "profiles_pkey" primary key ("id");

create unique index "access_invites_code_hash_uidx" on
  "public"."access_invites" using "btree"("code_hash");

create index "access_invites_expires_at_idx" on "public"."access_invites" using
  "btree"("expires_at");

create index "access_visits_invite_id_idx" on "public"."access_visits" using
  "btree"("invite_id");

create index "access_visits_used_at_idx" on "public"."access_visits" using
  "btree"("used_at");

create index "consultations_scheduled_for_idx" on "public"."consultations"
  using "btree"("scheduled_for");

create index "consultations_status_idx" on "public"."consultations" using
  "btree"("status");

create index "consultations_student_user_id_idx" on "public"."consultations"
  using "btree"("student_user_id");

create or replace trigger "consultations_enforce_lifecycle"
  before update of "scheduled_for",
  "status" on "public"."consultations" for each row
  execute function "private"."enforce_consultation_lifecycle"();

create or replace trigger "consultations_set_updated_at"
  before update on "public"."consultations" for each row
  execute function "public"."set_updated_at"();

create or replace trigger "profiles_set_updated_at"
  before update on "public"."profiles" for each row
  execute function "public"."set_updated_at"();

alter table only "public"."access_visits"
  add constraint "access_visits_invite_id_fkey" foreign key ("invite_id")
    references "public"."access_invites"("id") on delete cascade;

alter table only "public"."consultations"
  add constraint "consultations_student_user_id_fkey" foreign key
    ("student_user_id") references "public"."profiles"("id") on delete cascade;

alter table only "public"."profiles"
  add constraint "profiles_id_fkey" foreign key ("id") references
    "auth"."users"("id") on delete cascade;

alter table "public"."access_invites" enable row level security;

alter table "public"."access_visits" enable row level security;

alter table "public"."consultations" enable row level security;

create policy "consultations_insert_own" on "public"."consultations"
  for insert to "authenticated"
  with check ((((
    select
      "auth"."uid"() as "uid") = "student_user_id")
      and (
        select
          "private"."has_role"('student'::"public"."app_role") as "has_role")));

create policy "consultations_select_own_or_admin" on "public"."consultations"
  for select to "authenticated"
  using ((((
    select
      "auth"."uid"() as "uid") = "student_user_id")
      or (
        select
          "private"."has_role"('admin'::"public"."app_role") as "has_role")));

create policy "consultations_update_own" on "public"."consultations"
  for update to "authenticated"
  using ((((
    select
      "auth"."uid"() as "uid") = "student_user_id")
      and (
        select
          "private"."has_role"('student'::"public"."app_role") as "has_role")))
  with check ((((
    select
      "auth"."uid"() as "uid") = "student_user_id")
      and (
        select
          "private"."has_role"('student'::"public"."app_role") as "has_role")));

alter table "public"."profiles" enable row level security;

create policy "profiles_select_own" on "public"."profiles"
  for select to "authenticated"
  using (((
    select
      "auth"."uid"() as "uid") = "id"));

grant USAGE on schema "private" to "authenticated";

grant USAGE on schema "public" to "postgres";

grant USAGE on schema "public" to "anon";

grant USAGE on schema "public" to "authenticated";

grant USAGE on schema "public" to "service_role";

revoke all on function "private"."has_role"("required_role"
  "public"."app_role") from PUBLIC;

grant all on function "private"."has_role"("required_role" "public"."app_role")
  to "authenticated";

revoke all on function "public"."handle_new_user"() from PUBLIC;

revoke all on function "public"."redeem_access_invite"("p_code_hash" "text")
  from PUBLIC;

grant all on function "public"."redeem_access_invite"("p_code_hash" "text") to "anon";

grant all on function "public"."redeem_access_invite"("p_code_hash" "text") to
  "authenticated";

grant all on function "public"."redeem_access_invite"("p_code_hash" "text") to
  "service_role";

revoke all on function "public"."validate_access_gate_session"("p_invite_id"
  "uuid", "p_visit_id" "uuid") from PUBLIC;

grant all on function "public"."validate_access_gate_session"("p_invite_id"
  "uuid", "p_visit_id" "uuid") to "anon";

grant all on function "public"."validate_access_gate_session"("p_invite_id"
  "uuid", "p_visit_id" "uuid") to "authenticated";

grant all on function "public"."validate_access_gate_session"("p_invite_id"
  "uuid", "p_visit_id" "uuid") to "service_role";

grant select, insert on table "public"."access_invites" to "service_role";

grant references, trigger, truncate, MAINTAIN on table "public"."consultations"
  to "anon";

grant select, references, trigger, truncate, MAINTAIN on table
  "public"."consultations" to "authenticated";

grant references, trigger, truncate, MAINTAIN on table "public"."consultations"
  to "service_role";

grant insert ("student_user_id") on table "public"."consultations" to "authenticated";

grant insert ("first_name") on table "public"."consultations" to "authenticated";

grant insert ("last_name") on table "public"."consultations" to "authenticated";

grant insert ("reason") on table "public"."consultations" to "authenticated";

grant insert ("scheduled_for"), update ("scheduled_for") on table
  "public"."consultations" to "authenticated";

grant update ("status") on table "public"."consultations" to "authenticated";

grant references, trigger, truncate, MAINTAIN on table "public"."profiles" to "anon";

grant select, references, trigger, truncate, MAINTAIN on table
  "public"."profiles" to "authenticated";

grant references, trigger, truncate, MAINTAIN on table "public"."profiles" to
  "service_role";

alter default PRIVILEGES for role "postgres" in schema "public" grant all on
  SEQUENCES to "postgres";

alter default PRIVILEGES for role "postgres" in schema "public" grant update on
  SEQUENCES to "anon";

alter default PRIVILEGES for role "postgres" in schema "public" grant update on
  SEQUENCES to "authenticated";

alter default PRIVILEGES for role "postgres" in schema "public" grant update on
  SEQUENCES to "service_role";

alter default PRIVILEGES for role "postgres" in schema "public" grant all on
  FUNCTIONS to "postgres";

alter default PRIVILEGES for role "postgres" in schema "public" grant all on
  TABLES to "postgres";

alter default PRIVILEGES for role "postgres" in schema "public" grant
  references, trigger, truncate, MAINTAIN on TABLES to "anon";

alter default PRIVILEGES for role "postgres" in schema "public" grant
  references, trigger, truncate, MAINTAIN on TABLES to "authenticated";

alter default PRIVILEGES for role "postgres" in schema "public" grant
  references, trigger, truncate, MAINTAIN on TABLES to "service_role";
