


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."app_role" AS ENUM (
    'student',
    'admin'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."consultation_status" AS ENUM (
    'scheduled',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."consultation_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."enforce_consultation_lifecycle"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."enforce_consultation_lifecycle"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."has_role"("required_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."has_role"("required_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_access_invite"("p_code_hash" "text") RETURNS TABLE("invite_id" "uuid", "visit_id" "uuid", "label" "text", "access_expires_at" timestamp with time zone, "reason" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."redeem_access_invite"("p_code_hash" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_access_gate_session"("p_invite_id" "uuid", "p_visit_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."validate_access_gate_session"("p_invite_id" "uuid", "p_visit_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."access_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code_hash" "text" NOT NULL,
    "label" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "expires_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "use_count" integer DEFAULT 0 NOT NULL,
    "access_duration_days" integer DEFAULT 7 NOT NULL,
    "first_accessed_at" timestamp with time zone,
    CONSTRAINT "access_invites_access_window_consistent" CHECK (((("first_accessed_at" IS NULL) AND ("expires_at" IS NULL)) OR (("first_accessed_at" IS NOT NULL) AND ("expires_at" IS NOT NULL) AND ("expires_at" > "first_accessed_at")))),
    CONSTRAINT "access_invites_code_hash_not_blank" CHECK (("char_length"(TRIM(BOTH FROM "code_hash")) > 0)),
    CONSTRAINT "access_invites_duration_days_range" CHECK ((("access_duration_days" >= 1) AND ("access_duration_days" <= 365))),
    CONSTRAINT "access_invites_label_not_blank" CHECK (("char_length"(TRIM(BOTH FROM "label")) > 0)),
    CONSTRAINT "access_invites_use_count_non_negative" CHECK (("use_count" >= 0))
);


ALTER TABLE "public"."access_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."access_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invite_id" "uuid" NOT NULL,
    "used_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."access_visits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_user_id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "scheduled_for" timestamp with time zone NOT NULL,
    "status" "public"."consultation_status" DEFAULT 'scheduled'::"public"."consultation_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "completed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    CONSTRAINT "consultations_first_name_max_length" CHECK (("char_length"("first_name") <= 100)),
    CONSTRAINT "consultations_first_name_not_blank" CHECK (("char_length"(TRIM(BOTH FROM "first_name")) > 0)),
    CONSTRAINT "consultations_last_name_max_length" CHECK (("char_length"("last_name") <= 100)),
    CONSTRAINT "consultations_last_name_not_blank" CHECK (("char_length"(TRIM(BOTH FROM "last_name")) > 0)),
    CONSTRAINT "consultations_reason_max_length" CHECK (("char_length"("reason") <= 2000)),
    CONSTRAINT "consultations_reason_not_blank" CHECK (("char_length"(TRIM(BOTH FROM "reason")) > 0))
);


ALTER TABLE "public"."consultations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "public"."app_role" DEFAULT 'student'::"public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."access_invites"
    ADD CONSTRAINT "access_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."access_visits"
    ADD CONSTRAINT "access_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultations"
    ADD CONSTRAINT "consultations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "access_invites_code_hash_uidx" ON "public"."access_invites" USING "btree" ("code_hash");



CREATE INDEX "access_invites_expires_at_idx" ON "public"."access_invites" USING "btree" ("expires_at");



CREATE INDEX "access_visits_invite_id_idx" ON "public"."access_visits" USING "btree" ("invite_id");



CREATE INDEX "access_visits_used_at_idx" ON "public"."access_visits" USING "btree" ("used_at");



CREATE INDEX "consultations_scheduled_for_idx" ON "public"."consultations" USING "btree" ("scheduled_for");



CREATE INDEX "consultations_status_idx" ON "public"."consultations" USING "btree" ("status");



CREATE INDEX "consultations_student_user_id_idx" ON "public"."consultations" USING "btree" ("student_user_id");



CREATE OR REPLACE TRIGGER "consultations_enforce_lifecycle" BEFORE UPDATE OF "scheduled_for", "status" ON "public"."consultations" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_consultation_lifecycle"();



CREATE OR REPLACE TRIGGER "consultations_set_updated_at" BEFORE UPDATE ON "public"."consultations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."access_visits"
    ADD CONSTRAINT "access_visits_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "public"."access_invites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultations"
    ADD CONSTRAINT "consultations_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."access_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."access_visits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "consultations_insert_own" ON "public"."consultations" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "student_user_id") AND ( SELECT "private"."has_role"('student'::"public"."app_role") AS "has_role")));



CREATE POLICY "consultations_select_own_or_admin" ON "public"."consultations" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "student_user_id") OR ( SELECT "private"."has_role"('admin'::"public"."app_role") AS "has_role")));



CREATE POLICY "consultations_update_own" ON "public"."consultations" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "student_user_id") AND ( SELECT "private"."has_role"('student'::"public"."app_role") AS "has_role"))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "student_user_id") AND ( SELECT "private"."has_role"('student'::"public"."app_role") AS "has_role")));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



GRANT USAGE ON SCHEMA "private" TO "authenticated";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "private"."has_role"("required_role" "public"."app_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."has_role"("required_role" "public"."app_role") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."redeem_access_invite"("p_code_hash" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."redeem_access_invite"("p_code_hash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."redeem_access_invite"("p_code_hash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_access_invite"("p_code_hash" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_access_gate_session"("p_invite_id" "uuid", "p_visit_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_access_gate_session"("p_invite_id" "uuid", "p_visit_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_access_gate_session"("p_invite_id" "uuid", "p_visit_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_access_gate_session"("p_invite_id" "uuid", "p_visit_id" "uuid") TO "service_role";



GRANT SELECT,INSERT ON TABLE "public"."access_invites" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."consultations" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."consultations" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."consultations" TO "service_role";



GRANT INSERT("student_user_id") ON TABLE "public"."consultations" TO "authenticated";



GRANT INSERT("first_name") ON TABLE "public"."consultations" TO "authenticated";



GRANT INSERT("last_name") ON TABLE "public"."consultations" TO "authenticated";



GRANT INSERT("reason") ON TABLE "public"."consultations" TO "authenticated";



GRANT INSERT("scheduled_for"),UPDATE("scheduled_for") ON TABLE "public"."consultations" TO "authenticated";



GRANT UPDATE("status") ON TABLE "public"."consultations" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";
