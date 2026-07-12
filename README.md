# Mini-LMS Technical Assessment

This repository contains a full-stack mini-LMS implementation built with Next.js App Router, TypeScript, Supabase, and PostgreSQL.
The application supports student consultation booking/management and an admin read-only consultation overview.

## Assessment Deliverables Status

This section maps the implementation directly to the requested deliverables.

- Authentication (sign up, login, logout): Implemented
- Student dashboard listing own consultations: Implemented
- Consultation create form:
  - First name: Implemented
  - Last name: Implemented
  - Reason: Implemented
  - Datetime: Implemented
- Student can manage own consultations:
  - Mark complete/incomplete: Implemented
  - Reschedule: Implemented
  - Cancel: Implemented
- Admin can view all consultations (read-only): Implemented
- README with setup, assumptions, implementation summary, migrations/schema: Implemented in this document

## Technology Stack

- Framework: Next.js `16.2.10`
- Routing model: App Router
- Language: TypeScript
- Auth + DB platform: Supabase
  - `@supabase/supabase-js`
  - `@supabase/ssr`
- Database engine: PostgreSQL (via local Supabase stack)
- UI:
  - Tailwind CSS
  - shadcn/ui-style component structure
  - Radix UI primitives
- Validation: Valibot

## Project Goals

The project is intentionally scoped to prioritize:

1. End-to-end functionality for all required assessment flows
2. Security and access checks at server boundaries
3. Simplicity and interview-defensible implementation choices
4. Minimal UI complexity with clear, functional UX

## High-Level Architecture

The app follows a route-handler-centric pattern:

- UI components (client and server components) render forms/lists/actions
- Browser calls internal Next.js route handlers under `app/api/**`
- Route handlers perform:
  - session/auth checks
  - role/ownership authorization
  - input validation
  - database operations through Supabase
- Supabase (Postgres) stores users, profiles, and consultations

Core paths:

- Auth pages and auth callback routes: `app/auth/**`
- Student dashboard: `app/protected/page.tsx`
- Admin page: `app/admin/page.tsx`
- API routes:
  - `app/api/auth/login/route.ts`
  - `app/api/consultations/route.ts`
  - `app/api/consultations/[id]/route.ts`
  - `app/api/admin/consultations/route.ts`
- Supabase SQL assets:
  - `supabase/migrations/*.sql`
  - `supabase/schema.sql`
  - `supabase/seed.sql`

## Prerequisites

Install these before running locally:

- Node.js (LTS recommended)
- npm
- Supabase CLI
  - Docs: https://supabase.com/docs/reference/cli/introduction

You also need Docker running locally for `supabase start`.

## Environment Variables

Create `.env.local` in project root:

- Start from `.env.example`
- Required values:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-local-or-remote-publishable-key
```

Notes:

- For local Supabase, use keys/URL returned by `supabase status`.
- The codebase uses the `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` variable name.

## Local Development Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Start local Supabase and reset database

This applies migrations and seed data:

```bash
npm run infra:up
```

Script details:

- `supabase start -x vector`
- `supabase db reset`

### 3) Configure `.env.local`

Populate values from local Supabase output (`supabase status`) or your hosted project.

### 4) Run the app

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

### 5) Optional quality checks

```bash
npm run typecheck
npm run lint
```

## Supabase Local Runtime Notes

From `supabase/config.toml`, notable local service ports are:

- API: `54321`
- Postgres: `54322`
- Studio: `54323`
- Local email testing UI (`local_smtp`): `54324`

This is useful for testing email-based sign-up confirmation and password reset flows locally.

## Seeded Development Users

`supabase/seed.sql` creates these users if missing:

- `student@example.com` / `password123`
- `admin@example.com` / `password123`

It also promotes `admin@example.com` to role `admin` in `public.profiles`.

## Functional Walkthrough

### Entry and auth routing

- `/` redirects to `/auth/login`
- Unauthenticated access to protected routes is redirected to `/auth/login` via the session proxy (`proxy.ts` + `lib/supabase/proxy.ts`)

### Authentication flows

- Sign up:
  - UI: `/auth/sign-up`
  - Uses Supabase browser client `auth.signUp`
  - Redirect confirmation target: `/auth/confirm?next=/protected`
- Login:
  - UI: `/auth/login`
  - Calls `POST /api/auth/login`
  - On success routes to `/protected`
- Logout:
  - Triggered from navigation auth button
  - Uses Supabase browser client `auth.signOut`
  - Routes back to `/auth/login`
- Password reset/update:
  - `/auth/forgot-password`
  - `/auth/update-password`

### Student dashboard

Path: `/protected` (for non-admin users)

Capabilities:

- List own consultations
- Create a consultation
- Reschedule
- Mark complete / mark incomplete
- Cancel (implemented as status transition to `cancelled`)

### Admin view

Paths:

- `/admin` (direct admin page)
- `/protected` also resolves to admin consultation view for admin role

Behavior:

- Read-only list of all consultations
- No mutation actions rendered in admin UI

## API Endpoints

All APIs are implemented as Next.js route handlers.

### `POST /api/auth/login`

Authenticates a user with email/password.

Request body:

- `email: string`
- `password: string`

Validation:

- Valibot schema (`loginInputSchema`)

Responses:

- `200` `{ data: { authenticated: true } }`
- `400` validation/json errors
- `401` invalid credentials

### `GET /api/consultations`

Returns consultations for the authenticated student only.

Authorization:

- Requires authenticated user context
- Filters by `student_user_id = current_user_id`

Responses:

- `200` `{ data: Consultation[] }`
- `401` unauthorized
- `500` server errors

### `POST /api/consultations`

Creates a consultation for the authenticated student.

Request body:

- `firstName: string`
- `lastName: string`
- `reason: string`
- `scheduledFor: ISO datetime string`

Validation:

- Valibot schema (`consultationCreateInputSchema`)

Responses:

- `201` `{ data: Consultation }`
- `400` validation/json errors
- `401` unauthorized
- `500` server errors

### `PATCH /api/consultations/:id`

Updates consultation status and/or scheduled datetime for the authenticated student.

Request body (at least one field required):

- `scheduledFor?: ISO datetime string`
- `status?: "scheduled" | "completed"`

Behavior:

- Loads consultation scoped by both `id` and `student_user_id`
- Rejects updates for cancelled consultations
- If status changes:
  - sets `completed_at` when status becomes `completed`
  - clears `completed_at` when status changes back to `scheduled`

Responses:

- `200` `{ data: Consultation }`
- `400` invalid payload / cancelled cannot update
- `404` consultation not found in student scope
- `401` unauthorized
- `500` server errors

### `DELETE /api/consultations/:id`

Cancels consultation for authenticated student.

Behavior:

- Scoped by both `id` and `student_user_id`
- Idempotent-style handling:
  - if already cancelled, returns existing data (`200`)
  - otherwise sets status `cancelled` and `cancelled_at`

Responses:

- `200` `{ data: Consultation }`
- `404` not found in student scope
- `401` unauthorized
- `500` server errors

### `GET /api/admin/consultations`

Returns all consultations for admin users.

Authorization:

- Requires authenticated context
- Requires role `admin`

Responses:

- `200` `{ data: Consultation[] }`
- `403` forbidden for non-admin
- `401` unauthorized
- `500` server errors

## Authorization and Security Model

### Current model

Authorization is enforced at route-handler boundaries using:

- `requireAuthContext()` for authentication + role resolution
- explicit ownership filters on student APIs:
  - `.eq("student_user_id", userId)`
- explicit admin gate on admin API:
  - role check `role === "admin"`

This ensures UI-level actions are backed by server checks.

### Important security note

The implementation uses both API boundary authorization and database-level RLS.

Migrations include:

- `grant select, insert, update, delete on table public.consultations to authenticated;`
- `supabase/migrations/20260712120500_enable_rls_and_policies.sql` to:
  - enable RLS on `public.profiles` and `public.consultations`
  - enforce own-row access for students
  - allow admin visibility for all consultations
  - revoke `DELETE` from `authenticated` and enforce cancellation through status updates

Implication:

- API-layer authorization is present and functional
- Database-layer row restrictions are enforced via RLS
- The design applies defense-in-depth: route checks plus RLS

## Database Migrations and Schema Summary

The database model is defined through SQL migrations and mirrored by a schema snapshot.

Primary files:

- `supabase/migrations/20260711094235_init_profiles_and_consultations.sql`
- `supabase/migrations/20260712083000_add_authenticated_grants.sql`
- `supabase/migrations/20260712120500_enable_rls_and_policies.sql`
- `supabase/schema.sql` (readable snapshot)

### Enumerated types

- `public.app_role`
  - `student`
  - `admin`
- `public.consultation_status`
  - `scheduled`
  - `completed`
  - `cancelled`

### `public.profiles`

Purpose:

- Application-level profile extension for Supabase auth users
- Stores role for RBAC decisions

Columns:

- `id uuid primary key references auth.users(id) on delete cascade`
- `role public.app_role not null default 'student'`
- `created_at timestamptz`
- `updated_at timestamptz`

Triggers/functions:

- `set_updated_at()` trigger function updates `updated_at`
- `profiles_set_updated_at` trigger uses `set_updated_at()`

### `public.consultations`

Purpose:

- Stores student consultation records and lifecycle status

Columns:

- `id uuid primary key default gen_random_uuid()`
- `student_user_id uuid not null references public.profiles(id) on delete cascade`
- `first_name text not null`
- `last_name text not null`
- `reason text not null`
- `scheduled_for timestamptz not null`
- `status public.consultation_status not null default 'scheduled'`
- `created_at timestamptz`
- `updated_at timestamptz`
- `completed_at timestamptz`
- `cancelled_at timestamptz`

Constraints:

- `consultations_first_name_not_blank`
- `consultations_last_name_not_blank`
- `consultations_reason_not_blank`

Indexes:

- `consultations_student_user_id_idx`
- `consultations_scheduled_for_idx`
- `consultations_status_idx`

Triggers:

- `consultations_set_updated_at` trigger uses `set_updated_at()`

### Auth-to-profile provisioning

Function and trigger:

- `public.handle_new_user()`
- `on_auth_user_created` trigger on `auth.users`

Behavior:

- Automatically inserts a `profiles` row for new auth users
- Defaults new users to role `student`

### Grants migration

`20260712083000_add_authenticated_grants.sql` grants:

- schema usage on `public` to `authenticated`
- profile read access
- full CRUD on consultations for `authenticated`

## Validation Strategy

Validation is implemented with Valibot at API boundaries:

- Login schema:
  - email required + email format
  - password required
- Consultation create schema:
  - firstName, lastName, reason required non-empty strings
  - scheduledFor must parse as valid date
- Consultation update schema:
  - allows `scheduledFor` and/or `status`
  - requires at least one field
  - status restricted to `scheduled | completed`

Error response shape includes:

- `error` (primary message)
- `errors` (flattened list)
- `fieldErrors` (field-level map)

## Scripts

From `package.json`:

- `npm run dev` - run Next.js dev server
- `npm run dev:webpack` - run dev server with webpack mode
- `npm run build` - production build
- `npm run start` - serve production build
- `npm run lint` - ESLint
- `npm run typecheck` - TypeScript no emit
- `npm run format` - Prettier write
- `npm run format:check` - Prettier check
- `npm run infra:up` - start Supabase local stack and reset DB
- `npm run infra:down` - stop Supabase local stack
- `npm run db:types` - generate Supabase database TS types

## Manual Verification Checklist

Suggested walkthrough before submission:

1. Start local infra and app
2. Login as student
3. Create consultation
4. Mark complete, then mark incomplete
5. Reschedule consultation
6. Cancel consultation
7. Confirm student cannot see another student’s data through student APIs
8. Login as admin and verify all consultations list appears read-only
9. Verify sign up flow and email confirmation callback
10. Verify forgot-password and update-password flows

## Assumptions

- The assessment prioritizes secure backend behavior and consistency over UI polish.
- Admin responsibilities are read-only for consultations unless explicitly required otherwise.
- Consultation lifecycle can be represented with a compact status enum and timestamp fields.
- Input validation is applied at API boundaries; client-side validation is supplemental UX.

## Design Choices and Justifications

### Why route handlers over server actions

The implementation intentionally uses explicit API route handlers for business operations because:

- they provide clear server boundaries for auth and authorization
- they align with the assessment preference to favor APIs
- they keep request/response contracts explicit and testable

### Why keep RBAC logic close to endpoints

Role and ownership checks are colocated with endpoint behavior to make security expectations obvious and auditable.

### Why use profile table

Supabase `auth.users` is extended with a `profiles` table for app role management (`student`/`admin`) without overloading auth metadata parsing in every route.

### Why keep admin view read-only

Read-only admin scope satisfies required deliverables while reducing accidental complexity and risk.

## Scalability and Maintainability Notes

Current implementation is intentionally straightforward. It can scale further by adding:

- RLS policies for DB-native row enforcement
- pagination and filtering on consultation lists
- stronger API test coverage and end-to-end tests
- audit logs for status transitions
- richer admin tooling (search, filtering, moderation actions)

## Known Gaps / Next Improvements

If more time were available, the first improvements would be:

1. Add robust RLS policies for `profiles` and `consultations`
2. Add automated tests (unit + route integration + e2e)
3. Add optimistic UI and better loading/error recovery states
4. Add API-level pagination/search for admin list

## Repository Structure (Relevant Excerpts)

- `app/`
  - `api/` route handlers
  - `auth/` auth pages + confirm route
  - `protected/` student/admin dashboard resolution
  - `admin/` admin page
- `components/`
  - auth forms
  - student consultation UI + action hooks
  - admin consultation view
- `lib/`
  - Supabase clients (browser/server/proxy)
  - auth context helper
  - validation schemas
- `supabase/`
  - migrations
  - schema snapshot
  - seed data

## Troubleshooting

### App redirects unexpectedly to login

- Ensure `.env.local` contains valid Supabase URL and publishable key
- Ensure local Supabase stack is running
- Confirm auth cookies are being set

### Email confirmation/reset not working locally

- Check redirect URLs in `supabase/config.toml` and Supabase auth settings
- Use local SMTP UI if running local Supabase

### Database state feels inconsistent

- Reset local DB:

```bash
npm run infra:up
```

This reapplies migrations and seed data.

## Conclusion

This mini-LMS implementation is intentionally scoped to satisfy the assessment’s required deliverables with a clean full-stack baseline:

- clear API boundaries
- explicit auth/authorization checks
- role-aware UX
- migration-driven schema

The code is structured to be understandable under interview constraints while leaving obvious, concrete hardening paths for production-readiness.
