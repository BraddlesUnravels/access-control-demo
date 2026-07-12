# Mini-LMS Technical Assessment

Small full-stack LMS assessment built with Next.js App Router, TypeScript, Supabase, and PostgreSQL.
The focus is practical: deliver all required flows, keep security explicit, and keep implementation simple enough to easily explain.
## Prerequisites
- Node.js (LTS)
- npm
- Supabase CLI
- Docker (for local Supabase)

## 1) Assessor quick path (5-10 minutes)

### Run

```bash
npm run assessor:start
```

This boots local Supabase, applies migrations/seed data, creates `.env.local`, and starts the app.

## IMPORTANT for assessors: email-based auth testing happens in MailPit

Sign-up confirmation and forgot-password emails are captured locally in MailPit (not sent to a real inbox).

Open MailPit at:

- `http://localhost:54324/`

Why this exists:

- verifies the full email auth flow end-to-end
- keeps testing local and deterministic
- avoids dependency on external email delivery during assessment

What to verify:

1. Trigger sign-up from `/auth/sign-up`, then confirm via the email link in MailPit.
2. Trigger forgot-password from `/auth/forgot-password`, then complete reset from the email link in MailPit.

### Validate with seeded users

- Student: `student1@lms.com` / `password123`
- Student: `student2@lms.com` / `password123`
- Admin: `admin@lms.com` / `password123`

### Check required student flow

1. Sign in as `student1@lms.com`
2. Create a consultation
3. Mark complete, then mark incomplete
4. Reschedule
5. Cancel

### Check required admin flow

1. Sign in as `admin@lms.com`
2. Open admin consultations page
3. Confirm list is read-only

### Spot-check security

- Student responses from `GET /api/consultations` only include their own rows
- Non-admin gets `403` from `GET /api/admin/consultations`

## 2) Deliverables status

- Authentication (sign up, login, logout): Implemented
- Student dashboard listing own consultations: Implemented
- Consultation create form (first name, last name, reason, datetime): Implemented
- Student actions (complete/incomplete, reschedule, cancel): Implemented
- Admin all-consultations view (read-only): Implemented
- Setup/assumptions/design/schema summary in README: Implemented

## 3) Project structure at a glance

- `app/auth/**`: auth screens + confirmation route
- `app/protected/page.tsx`: role-aware dashboard entrypoint
- `app/admin/page.tsx`: admin-only consultations screen
- `app/api/consultations/route.ts`: student list/create
- `app/api/consultations/[id]/route.ts`: student update/cancel
- `app/api/admin/consultations/route.ts`: admin all-consultations list
- `lib/server/auth.ts`: auth context + role resolution
- `lib/supabase/*`: browser/server/proxy clients
- `supabase/migrations/*.sql`: schema + grants + RLS
- `supabase/seed.sql`: seeded users

## 4) How the app is organized

### Architecture

- UI renders forms/lists/actions
- Browser calls Next.js route handlers under `app/api/**`
- Route handlers own:
  - auth/session checks
  - ownership/role authorization
  - payload validation
  - persistence

### Why this shape

- Keeps security checks at API boundaries
- Keeps behavior explicit and easy to review
- Matches assessment scope without extra layers

## 5) Security and authorization model

Security is enforced in two layers (defense in depth).

### API-layer checks

- `requireAuthContext()` enforces authenticated user context and resolves role
- Student routes scope by both `id` and `student_user_id`
- Admin route checks `role === 'admin'`

### Database-layer checks (RLS)

- `supabase/migrations/20260712120500_enable_rls_and_policies.sql` enables RLS for:
  - `public.profiles`
  - `public.consultations`
- Policies enforce:
  - students can only access their own consultations
  - admins can view all consultations
- `DELETE` is revoked for `authenticated`; cancellation is status-based

### RLS validation

- `supabase/tests/rls_checks.sql`
- Run with:

```bash
npm run test:rls
```

## 6) API summary

### Student APIs

- `GET /api/consultations`
  - Returns consultations for the authenticated student only
- `POST /api/consultations`
  - Creates consultation for the authenticated student
  - Validates `firstName`, `lastName`, `reason`, `scheduledFor`
- `PATCH /api/consultations/:id`
  - Updates `scheduledFor` and/or `status` (`scheduled | completed`)
  - Rejects updates to cancelled consultations
- `DELETE /api/consultations/:id`
  - Cancels consultation (sets status to `cancelled`)
  - Idempotent behavior if already cancelled

### Admin API

- `GET /api/admin/consultations`
  - Admin-only, read-only list of all consultations

## 7) Database summary

Main migration files:

- `supabase/migrations/20260711094235_init_profiles_and_consultations.sql`
- `supabase/migrations/20260712083000_add_authenticated_grants.sql`
- `supabase/migrations/20260712120500_enable_rls_and_policies.sql`

Core domain model:

- `public.profiles`
  - user profile row keyed by auth user id
  - stores role (`student | admin`)
- `public.consultations`
  - consultation owned by `student_user_id`
  - status (`scheduled | completed | cancelled`)
  - timestamps (`created_at`, `updated_at`, `completed_at`, `cancelled_at`)

## 8) Local setup

### Environment variables

Create `.env.local` with:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

You can auto-generate local values with:

```bash
npm run infra:env
```

### Manual startup

```bash
npm install
npm run infra:up
npm run infra:reset
npm run dev
```

App runs at `http://localhost:3000`.

## 9) Useful scripts

- `npm run dev`: Next.js dev server
- `npm run build`: production build
- `npm run start`: production server
- `npm run typecheck`: TypeScript check
- `npm run lint`: lint
- `npm run test`: unit tests (Vitest)
- `npm run test:rls`: RLS SQL checks
- `npm run infra:up`: start local Supabase
- `npm run infra:reset`: reset DB with migrations + seed
- `npm run infra:down`: stop local Supabase
- `npm run assessor:start`: one-command assessor bootstrap

## 10) Assumptions and tradeoffs

- Priority was correctness and security over UI polish
- Admin scope is intentionally read-only (meets requirement with lower risk)
- Route handlers are used for LMS domain behavior to keep boundaries explicit
- Data model is intentionally small and scoped to required lifecycle states

## 11) If there were more time

1. Expand automated route/integration/e2e coverage
2. Improve UI loading/error recovery states
3. Add admin pagination/filtering/search
4. Add lightweight audit trail for consultation status transitions
5. Containerise the Next.js application optimised for cloud hosting
