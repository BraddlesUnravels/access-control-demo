# Access Control Demo

A small full-stack learning management system demonstrating authentication, role-based access control, resource ownership, and PostgreSQL row-level security.

The application is built with Next.js, TypeScript, Supabase, and PostgreSQL. The LMS domain is intentionally small so the authentication and authorization boundaries remain explicit and easy to review.

## What this project demonstrates

- Resume invite access gate for recruiter demos
- Email and password authentication
- Email confirmation and password recovery
- Protected application routes
- Role-based access control for students and administrators
- Resource ownership checks for student consultations
- Server-side authorization in Next.js route handlers
- PostgreSQL row-level security
- Read-only administrator access
- Local authentication email testing with MailPit
- Automated validation of database access policies

## Authorization model

The application has two roles:

| Role          | Access                                                                             |
| ------------- | ---------------------------------------------------------------------------------- |
| Student       | View, create, reschedule, complete, and cancel their own consultations             |
| Administrator | View consultations belonging to all students through a read-only dashboard and API |
|               |

Authorization is enforced at both the application and database layers.

The user interface reflects the permissions available to each role, but it is not treated as a security boundary. Next.js route handlers and PostgreSQL row-level security independently enforce the access rules.

## Prerequisites

- Node.js LTS
- npm
- Supabase CLI
- Docker

## Quick start

Start the complete local environment with:

```bash
npm run demo:start
```

This command:

1. Installs dependencies
2. Starts the local Supabase services
3. Applies database migrations and seed data
4. Generates `.env.local`
5. Starts the Next.js development server

The application runs at:

```text
http://localhost:3000
```

Local development disables the outer invite gate by default (`ACCESS_GATE_DISABLED=true` from `npm run infra:env`) so the seeded LMS login flow stays easy to use.

To exercise the invite gate locally, set `ACCESS_GATE_DISABLED=false` in `.env.local` and use one of the seeded invite codes below.

## Resume invite access gate

Deployed demos sit behind an outer invite gate so weak demo passwords are not openly reachable.

Flow:

1. A visitor opens `/access` (optionally with `?code=`).
2. They enter only the invite code.
3. The server verifies the code, logs a visit, and sets a 7-day httpOnly cookie.
4. Existing LMS login and role demos continue unchanged.

Identification comes from the invite `label` you set when minting a code, not from a visitor-entered name. Codes are multi-use until expiry or revoke, so a lost cookie or another device only requires entering the same code again.

Mint a code:

```bash
npm run invite:create -- --label "Acme recruiter" --expires 2026-12-31
```

Required env for minting and production gate enforcement:

```text
ACCESS_GATE_SECRET
SUPABASE_SERVICE_ROLE_KEY
ACCESS_GATE_DISABLED=false
```

Expired or invalid codes show the operator contact details from app constants and a request-more-tokens link.

## Demo accounts

The local seed data creates the following users:

| Role          | Email              | Password      |
| ------------- | ------------------ | ------------- |
| Student       | `student1@lms.com` | `password123` |
| Student       | `student2@lms.com` | `password123` |
| Administrator | `admin@lms.com`    | `password123` |

These credentials are intended only for the local demonstration environment.

## Demo access invite codes

Local seed data also creates invite hashes for `ACCESS_GATE_SECRET=local-access-gate-secret` (the value written by `npm run infra:env`):

| Code            | Label                | Notes                                  |
| --------------- | -------------------- | -------------------------------------- |
| `ACD-DEV1-TEST` | Local developer      | Valid, no expiry                       |
| `ACD-DEV2-TEST` | Local recruiter demo | Valid, expires one year after seed     |
| `ACD-EXPIRED1`  | Expired local invite | Already expired; useful for failure UX |

Example unlock path:

```text
http://localhost:3000/access?code=ACD-DEV1-TEST
```

Plaintext codes are documented only for local development. The database stores code hashes, never the codes themselves.

## Suggested walkthrough

### Student workflow

1. Sign in as `student1@lms.com`.
2. Confirm that only consultations belonging to Student 1 are displayed.
3. Create a consultation.
4. Mark the consultation as complete.
5. Mark the consultation as incomplete.
6. Reschedule the consultation.
7. Cancel the consultation.
8. Sign out.
9. Sign in as `student2@lms.com`.
10. Confirm that Student 1's consultations are not visible.

### Administrator workflow

1. Sign in as `admin@lms.com`.
2. Open the administrator consultations page.
3. Confirm that consultations belonging to both students are visible.
4. Confirm that the administrator view is read-only.
5. Confirm that no consultation mutation controls are available.

### Authorization checks

The main access-control boundaries are:

- Unauthenticated API requests receive `401 Unauthorized`.
- Students cannot access administrator endpoints.
- Administrators cannot use student consultation endpoints.
- Students can retrieve only their own consultations.
- Students cannot update or cancel consultations belonging to another student.
- Administrators can read all consultations but cannot create, update, or cancel them.

## Local email testing

Authentication emails are captured locally by MailPit rather than being delivered to a real inbox.

Open MailPit at:

```text
http://localhost:54324
```

### Sign-up confirmation

1. Open `/auth/sign-up`.
2. Register a new account.
3. Open MailPit.
4. Select the confirmation email.
5. Follow the confirmation link.

### Password recovery

1. Open `/auth/forgot-password`.
2. Submit the account email address.
3. Open MailPit.
4. Select the password-reset email.
5. Follow the reset link.
6. Choose a new password.

MailPit keeps local authentication testing deterministic and avoids requiring an external email provider.

## Architecture

The application uses a deliberately small architecture:

```text
Browser UI
    |
    v
Next.js route handlers
    |
    v
Supabase client
    |
    v
PostgreSQL with row-level security
```

### User interface

The user interface is responsible for:

- Rendering authentication forms
- Displaying role-appropriate dashboards
- Submitting consultation actions
- Presenting loading, success, and error states

The interface hides actions that are unavailable to the current role, but authorization does not depend on those controls being hidden.

### Route handlers

Next.js route handlers are responsible for:

- Verifying the authenticated session
- Resolving the application role
- Enforcing role requirements
- Enforcing resource ownership
- Validating request payloads
- Performing database operations
- Returning appropriate HTTP responses

Keeping these checks at the API boundary makes authorization decisions explicit and easy to inspect.

### Database

PostgreSQL row-level security provides an additional authorization layer.

The database policies enforce that:

- Students can select only their own consultations.
- Students can create consultations only for their own account.
- Students can update only their own consultations.
- Administrators can select consultations belonging to all students.
- Administrators cannot insert, update, or delete consultations.
- Authenticated users cannot physically delete consultation records.

This provides defense in depth if an application endpoint is incorrectly configured or bypassed.

## Authentication and authorization

The project separates four related concerns.

### Authentication

Authentication determines who the current user is.

Supabase Auth manages:

- Account registration
- Email confirmation
- Sign-in sessions
- Sign-out
- Password recovery
- Password updates

### Role-based authorization

Each authenticated user has an application profile with one of two roles:

```text
student
admin
```

Route handlers check the resolved role before allowing access to role-specific operations.

### Resource ownership

Student operations are scoped using both the consultation identifier and the authenticated student's user ID.

This prevents one authenticated student from accessing or modifying another student's consultation by supplying a different consultation ID.

### Row-level security

PostgreSQL row-level security repeats the important access restrictions at the database boundary.

The overlap between API authorization and database authorization is intentional:

- API checks provide clear application behaviour and HTTP responses.
- Row-level security protects the underlying data independently of the application interface.

## Consultation lifecycle

Consultations use the following states:

```text
scheduled
completed
cancelled
```

Students can:

- Create a scheduled consultation
- Change its scheduled date
- Mark it as completed
- Return it to scheduled
- Cancel it

Cancellation is represented as a status transition rather than a physical database deletion.

This preserves the record and retains cancellation metadata.

## API summary

### Student endpoints

#### `GET /api/consultations`

Returns consultations belonging to the authenticated student.

Requirements:

- The user must be authenticated.
- The user must have the `student` role.

#### `POST /api/consultations`

Creates a consultation belonging to the authenticated student.

The request validates:

- `firstName`
- `lastName`
- `reason`
- `scheduledFor`

Requirements:

- The user must be authenticated.
- The user must have the `student` role.
- The consultation owner must match the authenticated user.

#### `PATCH /api/consultations/:id`

Updates the scheduled date or status of an owned consultation.

Supported actions include:

- Rescheduling
- Marking complete
- Marking incomplete

Requirements:

- The user must be authenticated.
- The user must have the `student` role.
- The consultation must belong to the authenticated user.
- Cancelled consultations cannot be modified.

#### `DELETE /api/consultations/:id`

Cancels an owned consultation by changing its status to `cancelled`.

The database record is not physically deleted.

Requirements:

- The user must be authenticated.
- The user must have the `student` role.
- The consultation must belong to the authenticated user.

The operation is idempotent when the consultation is already cancelled.

### Administrator endpoint

#### `GET /api/admin/consultations`

Returns a read-only list of consultations belonging to all students.

Requirements:

- The user must be authenticated.
- The user must have the `admin` role.

## Database model

### `public.profiles`

Stores application-specific information associated with a Supabase Auth user.

Important fields include:

- User ID
- Application role
- Creation timestamp
- Update timestamp

The profile ID corresponds to the authenticated user's Supabase Auth ID.

### `public.consultations`

Stores consultations owned by students.

Important fields include:

- `student_user_id`
- `first_name`
- `last_name`
- `reason`
- `scheduled_for`
- `status`
- `created_at`
- `updated_at`
- `completed_at`
- `cancelled_at`

## Project structure

```text
app/
├── admin/
│   └── page.tsx
├── api/
│   ├── admin/
│   │   └── consultations/
│   │       └── route.ts
│   └── consultations/
│       ├── [id]/
│       │   └── route.ts
│       └── route.ts
├── auth/
│   ├── confirm/
│   ├── error/
│   ├── forgot-password/
│   ├── login/
│   ├── sign-up/
│   └── update-password/
└── protected/
    └── page.tsx

components/
├── admin/
├── student/
└── ui/

lib/
├── server/
│   └── auth.ts
└── supabase/
    ├── client.ts
    ├── proxy.ts
    └── server.ts

supabase/
├── migrations/
├── tests/
│   └── rls_checks.sql
├── config.toml
├── schema.sql
└── seed.sql
```

Key responsibilities:

- `app/auth/**`: authentication screens and callback routes
- `app/protected/page.tsx`: role-aware dashboard entry point
- `app/admin/page.tsx`: administrator-only dashboard
- `app/api/consultations/route.ts`: student consultation list and creation
- `app/api/consultations/[id]/route.ts`: student consultation updates and cancellation
- `app/api/admin/consultations/route.ts`: administrator read-only consultation list
- `lib/server/auth.ts`: authentication context and role authorization
- `lib/supabase/**`: browser and server Supabase clients
- `supabase/migrations/**`: executable database schema history
- `supabase/tests/rls_checks.sql`: database authorization checks
- `supabase/seed.sql`: local demonstration users and data

## Manual local setup

Install dependencies:

```bash
npm install
```

Start the local Supabase services:

```bash
npm run infra:up
```

Apply migrations and seed data:

```bash
npm run infra:reset
```

Generate the local environment configuration:

```bash
npm run infra:env
```

Start the Next.js development server:

```bash
npm run dev
```

## Environment variables

The application requires:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ACCESS_GATE_SECRET
```

For minting invites and production gate operation, also set:

```text
SUPABASE_SERVICE_ROLE_KEY
ACCESS_GATE_DISABLED=false
```

Local values can be generated with:

```bash
npm run infra:env
```

That local generator sets `ACCESS_GATE_DISABLED=true` and a local `ACCESS_GATE_SECRET`.

After schema migrations, regenerate database types with:

```bash
npm run db:types
```

## Available scripts

| Command                 | Purpose                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `npm run dev`           | Start the Next.js development server                        |
| `npm run build`         | Create a production build                                   |
| `npm run start`         | Start the production server                                 |
| `npm run typecheck`     | Run the TypeScript compiler without emitting files          |
| `npm run lint`          | Run ESLint                                                  |
| `npm run format`        | Format the project with Prettier                            |
| `npm run format:check`  | Check formatting without modifying files                    |
| `npm run test`          | Run unit tests with Vitest                                  |
| `npm run test:watch`    | Run Vitest in watch mode                                    |
| `npm run test:rls`      | Run PostgreSQL row-level security checks                    |
| `npm run infra:up`      | Start local Supabase services                               |
| `npm run infra:reset`   | Reset the local database and apply migrations and seed data |
| `npm run infra:env`     | Generate local Supabase environment variables               |
| `npm run infra:down`    | Stop local Supabase services                                |
| `npm run invite:create` | Mint a labeled resume invite code                           |
| `npm run demo:start`    | Prepare and start the complete local demonstration          |
| `npm run db:types`      | Regenerate TypeScript types from the local database         |

## Testing

Run the application unit tests with:

```bash
npm test
```

Run the row-level security checks with:

```bash
npm run test:rls
```

Run the complete quality checks with:

```bash
npm run format:check
npm run typecheck
npm run lint
npm test
npm run test:rls
npm run build
```

## Design decisions

### Defense in depth

Authorization is enforced in both Next.js route handlers and PostgreSQL row-level security policies.

This duplication is intentional:

- Route handlers provide clear application-level responses.
- Database policies protect data if the application layer is bypassed or incorrectly configured.

### Read-only administrator role

Administrators can view all consultations but cannot modify them.

This provides a clear demonstration of broad read access without granting unnecessary write permissions.

### Ownership-based student access

Students can manage consultations only when `student_user_id` matches their authenticated user ID.

Queries also scope mutations by both the consultation ID and owner ID to prevent cross-user access.

### Status-based cancellation

Consultations are cancelled by updating their status instead of deleting the database row.

This preserves historical data and associated timestamps.

### Small application architecture

The project intentionally avoids unnecessary service and repository layers.

For the current scope, keeping authentication, authorization, validation, and persistence visible in the route handlers makes the behaviour easier to follow.

Additional layers would become appropriate if the application introduced more complex domain workflows, transactions, external integrations, or multiple entry points.

## Scope

The project is intended as a focused example of authentication and authorization rather than a complete learning management system.

The domain remains deliberately small so the important security behaviours are easy to demonstrate:

- Who is authenticated
- Which role they have
- Which routes they may access
- Which resources they own
- Which rows the database permits them to read or modify

## Potential extensions

Possible future improvements include:

1. Add end-to-end tests for complete authentication flows.
2. Add route-level integration tests for unauthorized and forbidden requests.
3. Add pagination, search, and filtering to the administrator dashboard.
4. Add an audit log for consultation status changes.
5. Add more granular permissions beyond the current student and administrator roles.
6. Add account management and profile editing.
7. Containerize the Next.js application for deployment.
8. Add CI checks for unit tests, type checking, linting, builds, and RLS validation.
