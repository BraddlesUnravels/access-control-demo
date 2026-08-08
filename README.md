# Access Control Demo

A small full-stack learning management system demonstrating layered access control, authentication, role-based authorization, resource ownership, and PostgreSQL row-level security.

The application is built with Next.js, TypeScript, Supabase, PostgreSQL, Docker, and Azure Container Apps. The LMS domain is intentionally small so the authentication and authorization boundaries remain explicit and easy to review.

## What this project demonstrates

- An outer invite-based access gate for hosted portfolio and recruiter demos
- Signed, expiring access-gate cookies
- HMAC-based invite-code storage without retaining plaintext codes
- Server-side rate limiting on invite redemption to reduce automated brute-force attempts
- Email and password authentication with Supabase Auth
- Email confirmation and password recovery
- Protected application routes
- Role-based access control for students and administrators
- Resource ownership checks for student consultations
- Server-side authorization in Next.js route handlers
- PostgreSQL row-level security
- Read-only administrator access
- Local authentication email testing with MailPit
- Automated unit, proxy, API, database, and container integration tests
- Containerized deployment with Docker
- GitHub Actions CI/CD
- Azure Container Apps deployment through Bicep and GitHub OIDC

## Access-control model

The hosted application has two separate access boundaries:

```text
Visitor
   |
   v
Invite access gate
   |
   v
Supabase authentication
   |
   v
Application authorization
   |
   v
PostgreSQL row-level security
```

The invite gate controls who may reach the demonstration application. It does not identify an LMS user or grant a student or administrator role.

After passing the gate, the visitor must still authenticate through Supabase Auth.

The authenticated application has two roles:

| Role          | Access                                                                             |
| ------------- | ---------------------------------------------------------------------------------- |
| Student       | View, create, reschedule, complete, and cancel their own consultations             |
| Administrator | View consultations belonging to all students through a read-only dashboard and API |

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

1. Installs dependencies.
2. Starts the local Supabase services.
3. Applies database migrations and seed data.
4. Generates `.env.local`.
5. Starts the Next.js development server.

The application runs at:

```text
http://localhost:3000
```

The generated local environment enables the outer access gate:

```text
ACCESS_GATE_DISABLED=false
```

Because `npm run infra:reset` recreates the local database, create an invite after the reset:

```bash
npm run invite:create -- --label "Local demo" --days 14
```

The command prints the plaintext invite once, for example:

```text
code: ACD-4GZ3-PDQJ-FWT9
path: /?code=ACD-4GZ3-PDQJ-FWT9
```

Open the generated path or enter the code at:

```text
http://localhost:3000/
```

To bypass the outer gate during local development, set:

```text
ACCESS_GATE_DISABLED=true
```

in `.env.local` and restart the development server.

The bypass is deliberately ignored in Azure Container Apps, so `ACCESS_GATE_DISABLED=true` cannot disable the deployed production gate.

## Visitor invite access gate

The hosted demo sits behind an outer invite gate so the intentionally simple demonstration credentials are not directly exposed to the public internet.

### Flow

1. A visitor opens `/`, optionally with a `?code=` query parameter.
2. The visitor submits an invite code to `POST /api/access/unlock`.
3. The server applies a per-client rate limit before parsing or validating the request.
4. If the request is allowed, the server normalizes the code and creates an HMAC-SHA256 digest using `ACCESS_GATE_CODE_SECRET`.
5. The server calls the PostgreSQL `redeem_access_invite` function.
6. The database validates the invite and atomically establishes its access window on the first successful redemption.
7. A successful redemption creates an `access_visits` record.
8. The server issues a signed `httpOnly` access-gate cookie using the database-controlled absolute expiry.
9. Subsequent requests with a valid access-gate cookie proceed to the normal Supabase authentication layer.

The root route is the gate entry point:

```text
/
```

There is no `/access` route.

Invite links therefore use:

```text
/?code=ACD-XXXX-XXXX-XXXX
```

Protected page requests without access are redirected back to `/` with a safe `next` destination.

Protected API requests without access return:

```text
401 Unauthorized
```

The health endpoint and access-gate API remain available without an access cookie.

### Invite lifetime

New invites begin with no active access window:

```text
first_accessed_at = NULL
expires_at = NULL
```

The first successful redemption establishes:

```text
first_accessed_at = first successful redemption time
expires_at = first_accessed_at + access_duration_days
```

The same invite may be entered again while that original window remains active.

Re-entry:

- creates another visit record;
- increments the invite use count;
- does not change `first_accessed_at`;
- does not extend `expires_at`.

The invite-creation CLI accepts durations from 1 to 30 days:

```bash
npm run invite:create -- --label "Acme recruiter" --days 14
```

If `--days` is omitted, the current database default is used.

### Invite-code storage

Generated codes use the format:

```text
ACD-XXXX-XXXX-XXXX
```

The plaintext code is never stored in PostgreSQL.

Instead, the operator script and application independently calculate:

```text
HMAC-SHA256(normalized invite code, ACCESS_GATE_CODE_SECRET)
```

and the resulting digest is stored in `access_invites.code_hash`.

The code secret used to mint an invite must therefore exactly match the code secret used by the deployed application.

### Invite redemption rate limiting

`POST /api/access/unlock` uses an in-memory fixed-window rate limiter to reduce automated invite-code guessing and abusive request volume.

The current policy allows up to five redemption attempts per client within a 60-second window. Requests above the limit receive:

```text
429 Too Many Requests
```

with a `Retry-After` header indicating when the client may retry.

Rate limiting is applied before request-body parsing, validation, invite hashing, or Supabase access so blocked requests do not perform unnecessary application or database work.

In Azure Container Apps, the limiter identifies clients using the rightmost address supplied through `X-Forwarded-For`. Forwarding headers are not trusted outside the Azure environment.

Limiter state is process-local and bounded in memory. The production deployment intentionally runs a single active application replica, so this is appropriate for the current portfolio workload.

The limiter resets when the application process restarts and would not provide a shared limit across multiple replicas. A horizontally scaled production deployment would require shared rate-limit state, such as Redis or PostgreSQL, or an upstream rate-limiting layer.

### Access cookie

The access cookie is HMAC-signed with a separate:

```text
ACCESS_GATE_COOKIE_SECRET
```

Its payload contains only:

```text
version
inviteId
exp
```

The cookie is:

- `httpOnly`;
- `SameSite=Lax`;
- `Secure` when running in Azure;
- limited to the database-provided absolute expiry.

The cookie secret and invite-code secret are intentionally separate.

### Revocation behavior

The redemption function rejects an invite whose `revoked_at` value has been set, preventing further redemption of that invite.

The current access cookie is stateless. A cookie that was issued before an invite was revoked remains valid until its existing absolute expiry.

Immediate revocation of previously issued cookies would require an additional server-side revalidation mechanism.

## Creating invites

### Local Supabase

`npm run infra:env` generates the values required by the local invite-creation script, including a local Supabase service-role key.

Create an invite with:

```bash
npm run invite:create -- --label "Local recruiter demo" --days 14
```

The plaintext code is printed once. Store it before closing the terminal.

### Hosted Supabase

For production invites, run the operator script locally while pointing it at the hosted Supabase project.

A local file such as `.env.production.local` can contain:

```text
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
ACCESS_GATE_CODE_SECRET=your-production-access-gate-code-secret
```

`SUPABASE_SECRET_KEY` is preferred for trusted server-side/operator tooling. The script also supports the legacy:

```text
SUPABASE_SERVICE_ROLE_KEY
```

as a fallback.

Run:

```bash
node --env-file=.env.production.local \
  scripts/create-access-invite.mjs \
  --label "Acme recruiter" \
  --days 14
```

The Supabase secret/service-role key is an operator credential. It is not required by the deployed Next.js application and should not be exposed to browser code or committed to the repository.

## Demo accounts

The local seed data creates the following users:

| Role          | Email              | Password      |
| ------------- | ------------------ | ------------- |
| Student       | `student1@lms.com` | `password123` |
| Student       | `student2@lms.com` | `password123` |
| Administrator | `admin@lms.com`    | `password123` |

These credentials are intended only for the demonstration environment.

Invite codes are not seeded into the database. Create them with `npm run invite:create` after resetting the local database.

## Suggested walkthrough

### Visitor gate

1. Create a local invite.
2. Open `/`.
3. Enter the generated invite code.
4. Confirm that the application redirects to the LMS login.
5. Delete the `access_gate` browser cookie.
6. Re-enter the same invite code.
7. Confirm that access is restored without extending the original database expiry.

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

The main application access-control boundaries are:

- Visitors without invite access cannot reach protected application pages.
- Protected API requests without invite access receive `401 Unauthorized`.
- Unauthenticated LMS API requests receive `401 Unauthorized`.
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

1. Pass the local invite gate or temporarily disable it locally.
2. Open `/auth/sign-up`.
3. Register a new account.
4. Open MailPit.
5. Select the confirmation email.
6. Follow the confirmation link.

### Password recovery

1. Open `/auth/forgot-password`.
2. Submit the account email address.
3. Open MailPit.
4. Select the password-reset email.
5. Follow the reset link.
6. Choose a new password.

MailPit keeps local authentication testing deterministic and avoids requiring an external email provider.

## Architecture

The request path is deliberately layered:

```text
Browser
   |
   v
Next.js Proxy
   |
   +--> Invite access-gate validation
   |
   +--> Supabase SSR session refresh
   |
   v
Next.js route handlers
   |
   v
Supabase client
   |
   v
PostgreSQL + row-level security
```

Invite redemption uses a separate path:

```text
AccessGateForm
      |
      v
POST /api/access/unlock
      |
      v
Client identification
      |
      v
In-memory rate limiter
      |
      +--> Limit exceeded --> 429 Too Many Requests
      |
      v
Request validation
      |
      v
HMAC invite-code digest
      |
      v
redeem_access_invite(...)
      |
      +--> access_invites
      |
      +--> access_visits
      |
      v
Signed access_gate cookie
```

### Next.js Proxy

The root `proxy.ts` performs two lightweight request-boundary operations:

1. The outer access-gate check.
2. Supabase SSR session refresh for requests allowed through the gate.

The access-gate proxy performs optimistic verification using the signed cookie and does not query PostgreSQL on every request.

Public access-gate and health routes remain reachable without the cookie.

### User interface

The user interface is responsible for:

- Rendering the invite access form
- Rendering authentication forms
- Displaying role-appropriate dashboards
- Submitting consultation actions
- Presenting loading, success, and error states

The interface hides actions unavailable to the current role, but authorization does not depend on those controls being hidden.

### Route handlers

Next.js route handlers are responsible for:

- Applying rate limits to public invite-redemption attempts
- Redeeming access invites
- Verifying authenticated sessions
- Resolving application roles
- Enforcing role requirements
- Enforcing resource ownership
- Validating request payloads
- Performing database operations
- Returning appropriate HTTP responses

Keeping these checks at the API boundary makes authorization decisions explicit and easy to inspect.

### Database

PostgreSQL provides both the LMS authorization boundary and the transactional invite-redemption boundary.

The LMS policies enforce that:

- Students can select only their own consultations.
- Students can create consultations only for their own account.
- Students can update only their own consultations.
- Administrators can select consultations belonging to all students.
- Administrators cannot insert, update, or delete consultations.
- Authenticated users cannot physically delete consultation records.

The access-gate database design additionally ensures that:

- Browser-facing roles cannot directly access `access_invites` or `access_visits`.
- Plaintext invite codes are never stored.
- The trusted operator role has only the table privileges required to create and read invites.
- Redemption occurs through a narrowly scoped `SECURITY DEFINER` function.
- Concurrent first redemptions are serialized with a row lock.
- First-use expiry is established atomically.
- Re-entry does not slide or extend the existing access window.

## Authentication and authorization

The project separates four related concerns.

### Visitor access

The invite gate determines whether a browser may reach the demonstration application.

It is an outer access-control layer, not the LMS identity system.

### Authentication

Authentication determines who the current LMS user is.

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

### Access gate

#### `POST /api/access/unlock`

Redeems an invite code.

Possible application outcomes include:

- `200` for a successful redemption;
- `400` for malformed or invalid request input;
- `401` when no invite matches the submitted code;
- `403` for an expired or revoked invite;
- `429` when the client exceeds the invite-redemption rate limit;
- `500` when the invite-verification infrastructure or RPC contract fails.

Rate-limited responses include a `Retry-After` header and do not proceed to request parsing or Supabase invite redemption.

A successful response sets the signed `access_gate` cookie.

### Student endpoints

#### `GET /api/consultations`

Returns consultations belonging to the authenticated student.

Requirements:

- The visitor must have invite access.
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

- The visitor must have invite access.
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

- The visitor must have invite access.
- The user must be authenticated.
- The user must have the `student` role.
- The consultation must belong to the authenticated user.
- Cancelled consultations cannot be modified.

#### `DELETE /api/consultations/:id`

Cancels an owned consultation by changing its status to `cancelled`.

The database record is not physically deleted.

Requirements:

- The visitor must have invite access.
- The user must be authenticated.
- The user must have the `student` role.
- The consultation must belong to the authenticated user.

The operation is idempotent when the consultation is already cancelled.

### Administrator endpoint

#### `GET /api/admin/consultations`

Returns a read-only list of consultations belonging to all students.

Requirements:

- The visitor must have invite access.
- The user must be authenticated.
- The user must have the `admin` role.

### Health endpoint

#### `GET /api/health`

Returns the application health status.

This route intentionally bypasses the access gate so Docker and Azure Container Apps health probes do not depend on user authentication or Supabase availability.

## Database model

### `public.access_invites`

Stores invite metadata and the access-window state.

Important fields include:

- `code_hash`
- `label`
- `access_duration_days`
- `first_accessed_at`
- `expires_at`
- `revoked_at`
- `use_count`
- `created_at`

### `public.access_visits`

Records successful invite redemptions.

Important fields include:

- `invite_id`
- `used_at`

No user-agent or other browser-identifying metadata is stored.

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
├── api/
│   ├── access/
│   │   └── unlock/
│   │       ├── helpers.ts
│   │       ├── route.ts
│   │       └── types.ts
│   ├── admin/
│   │   └── consultations/
│   ├── consultations/
│   └── health/
├── auth/
├── protected/
├── page.tsx
└── layout.tsx

components/
├── admin/
├── student/
└── ui/
    └── forms/
        └── access-gate-form.tsx

lib/
├── access-gate/
│   ├── constants.ts
│   ├── cookie.ts
│   ├── env.ts
│   ├── hash.ts
│   ├── paths.ts
│   └── proxy.ts
├── rate-limiter/
│   ├── client.ts
│   ├── in-memory.ts
│   └── types.ts
├── server/
│   └── auth.ts
└── supabase/
    ├── client.ts
    ├── database.types.ts
    ├── proxy.ts
    └── server.ts

scripts/
├── create-access-invite.mjs
├── generate-local-env.mjs
├── run-container-tests.mjs
└── run-rls-tests.mjs

supabase/
├── migrations/
├── tests/
│   ├── access_gate_checks.sql
│   └── rls_checks.sql
├── config.toml
├── schema.sql
└── seed.sql

docker/
└── Dockerfile

deploy/
└── azure/
    ├── bootstrap-oidc.sh
    └── main.bicep

.github/
└── workflows/
    ├── ci.yml
    ├── container-stage.yml
    ├── dependency-review.yml
    ├── production.yml
    ├── production-teardown.yml
    └── take-containers-offline.yml

proxy.ts
```

Key responsibilities:

- `app/page.tsx`: public invite-gate entry screen
- `app/api/access/unlock/**`: rate-limited invite validation, response construction, and access-cookie issuance
- `lib/access-gate/**`: invite hashing, cookie signing, safe redirects, environment validation, and proxy gate logic
- `lib/rate-limiter/**`: trusted client identification and bounded in-memory fixed-window rate limiting
- `proxy.ts`: access-gate and Supabase session orchestration
- `app/auth/**`: authentication screens and callback routes
- `app/protected/page.tsx`: role-aware dashboard entry point
- `app/admin/**`: administrator-only dashboard
- `app/api/consultations/**`: student consultation operations
- `app/api/admin/consultations/**`: administrator read-only consultation API
- `lib/server/auth.ts`: authenticated application context and role authorization
- `lib/supabase/**`: browser and server Supabase clients and SSR session handling
- `supabase/migrations/**`: executable database schema history
- `supabase/tests/rls_checks.sql`: LMS authorization and RLS checks
- `supabase/tests/access_gate_checks.sql`: access-gate schema, privilege, and lifecycle checks
- `scripts/create-access-invite.mjs`: trusted invite operator tool
- `docker/Dockerfile`: production standalone Next.js container
- `deploy/azure/**`: Azure Container Apps infrastructure and OIDC bootstrap
- `.github/workflows/**`: CI, container staging, deployment, dependency review, and production operations

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

Create an invite:

```bash
npm run invite:create -- --label "Local demo" --days 14
```

Start the Next.js development server:

```bash
npm run dev
```

After another `npm run infra:reset`, recreate any local invites because the local database has been reset.

## Environment variables

### Application runtime

The application uses:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ACCESS_GATE_CODE_SECRET
ACCESS_GATE_COOKIE_SECRET
```

The two access-gate secrets must be at least 32 characters.

They should also be different values.

Local development may additionally use:

```text
ACCESS_GATE_DISABLED
```

Setting it to `true` bypasses the outer invite gate only outside Azure.

Local values can be generated with:

```bash
npm run infra:env
```

### Invite operator tooling

Creating invites additionally requires one trusted Supabase administrative credential:

```text
SUPABASE_SECRET_KEY
```

or the legacy fallback:

```text
SUPABASE_SERVICE_ROLE_KEY
```

These credentials are only for trusted operator tooling and should not be supplied to browser code.

### Production GitHub environment

The production GitHub Environment uses non-sensitive configuration as environment variables:

```text
AZURE_RESOURCE_GROUP
AZURE_LOCATION
AZURE_CONTAINER_ENVIRONMENT
AZURE_CONTAINER_APP
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Sensitive values are stored as GitHub environment secrets:

```text
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
ACCESS_GATE_CODE_SECRET
ACCESS_GATE_COOKIE_SECRET
```

The production `ACCESS_GATE_CODE_SECRET` must exactly match the value used locally when creating invites against the hosted Supabase project.

The deployed application does not require:

```text
SUPABASE_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### Database types

After schema migrations, regenerate database types with:

```bash
npm run db:types
```

## Available scripts

| Command                 | Purpose                                                       |
| ----------------------- | ------------------------------------------------------------- |
| `npm run dev`           | Start the Next.js development server                          |
| `npm run build`         | Create a production build                                     |
| `npm run start`         | Start the production server                                   |
| `npm run typecheck`     | Run the TypeScript compiler without emitting files            |
| `npm run lint`          | Run ESLint                                                    |
| `npm run format`        | Format the project with Prettier                              |
| `npm run format:check`  | Check formatting without modifying files                      |
| `npm test`              | Run unit and application tests with Vitest                    |
| `npm run test:watch`    | Run Vitest in watch mode                                      |
| `npm run test:db`       | Run LMS RLS and access-gate PostgreSQL checks                 |
| `npm run infra:up`      | Start local Supabase services                                 |
| `npm run infra:reset`   | Reset the local database and apply migrations and seed data   |
| `npm run infra:env`     | Generate local Supabase and access-gate environment variables |
| `npm run infra:down`    | Stop local Supabase services                                  |
| `npm run invite:create` | Create a labeled invite whose lifetime begins on first use    |
| `npm run demo:start`    | Prepare and start the complete local demonstration            |
| `npm run db:types`      | Regenerate TypeScript types from the local database           |

## Testing

Run the application test suite with:

```bash
npm test
```

The Vitest suite covers:

- invite-code normalization and HMAC hashing;
- access-cookie signing and malformed-cookie rejection;
- safe access-gate redirects;
- local versus Azure access-gate configuration;
- proxy gate behavior;
- rate-limit client identification and trusted Azure forwarding behavior;
- fixed-window rate-limit enforcement, expiry, client isolation, and bounded overflow behavior;
- access-unlock API outcomes, including rate-limited requests;
- Supabase proxy cookie/session handling;
- root Proxy orchestration;
- invite-creation tooling.

Run the database security and lifecycle checks with:

```bash
npm run test:db
```

This runs:

```text
supabase/tests/rls_checks.sql
supabase/tests/access_gate_checks.sql
```

The database suite verifies both the LMS authorization model and access-gate behavior, including:

- RLS configuration;
- table privileges;
- RPC execution privileges;
- invite-state constraints;
- invalid, expired, and revoked redemption outcomes;
- first-use expiry;
- non-sliding re-entry;
- access-visit creation;
- browser-role isolation from gate tables.

Run the complete local quality checks with:

```bash
npm run format:check
npm run typecheck
npm run lint
npm test
npm run test:db
npm run build
```

## CI/CD and deployment

### Continuous integration

Pull requests run application quality checks including:

- formatting;
- TypeScript type checking;
- linting;
- Vitest;
- production builds;
- dependency review.

### Container stage

The container-stage workflow starts a disposable local Supabase environment, reapplies migrations and seed data, runs the database checks, builds the production Docker image, and performs container integration tests before deployment.

### Production

Production images are built as standalone Next.js containers and published to GitHub Container Registry.

GitHub Actions authenticates to Azure with OpenID Connect rather than a stored Azure client secret.

Bicep provisions:

- the Azure Container Apps environment;
- the Container App;
- external HTTPS ingress;
- application runtime configuration;
- access-gate secrets;
- startup, readiness, and liveness probes;
- a single always-available application replica.

Production deployment uses immutable commit-SHA image references.

Operational workflows are also provided for taking the production application offline or tearing down the Container App resources.

## Design decisions

### Layered access control

The outer invite gate and Supabase authentication solve different problems.

The invite gate limits access to the hosted demonstration, while Supabase Auth identifies the LMS user.

Passing the invite gate never grants a student or administrator role.

### First-use invite expiry

Invite validity is anchored to the first successful redemption rather than invite creation time.

This avoids consuming a recruiter's access window before they first open the demo.

The expiry is established transactionally in PostgreSQL and subsequent redemption cannot extend it.

### Separate HMAC secrets

Invite-code hashing and cookie signing use separate secrets:

```text
ACCESS_GATE_CODE_SECRET
ACCESS_GATE_COOKIE_SECRET
```

Compromise or rotation of one therefore does not require using the same key for the other cryptographic purpose.

### Stateless access cookie

Normal protected requests validate the signed cookie without querying the database.

This keeps Next.js Proxy lightweight and avoids a database lookup on every asset or page request.

The trade-off is that database revocation does not immediately invalidate an already-issued cookie.

### Process-local rate limiting

Invite redemption uses a bounded in-memory fixed-window rate limiter to reduce automated code guessing without introducing additional infrastructure for the portfolio workload.

The limiter is scoped specifically to the public invite-redemption endpoint and executes before request parsing or database access.

The Azure deployment currently runs one active application replica, so process-local state provides a single effective rate-limit boundary for the deployed application.

This is an intentional scope trade-off. The limiter resets on process restart and would not coordinate state across multiple replicas. If the application were horizontally scaled, the rate limit would move to shared storage or an upstream rate-limiting layer.

### Minimal visitor data

Successful invite redemption persists only:

```text
invite_id
used_at
```

No client IP address, user-agent, or other browser-identifying metadata is persisted to PostgreSQL.

The rate limiter uses the client identifier transiently in application memory for the duration of the rate-limit window. That state is not written to the database and is discarded when the window expires or the application process restarts.

### Least-privilege invite tables

Browser-facing Supabase roles do not directly access the invite tables.

The trusted operator role has only the table privileges needed to create and inspect invites, while browser redemption occurs through the dedicated database function.

### Defense in depth

LMS authorization is enforced in both Next.js route handlers and PostgreSQL row-level security policies.

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

For the current scope, keeping authentication, authorization, validation, and persistence visible at their relevant boundaries makes the behaviour easier to review.

Additional layers would become appropriate if the application introduced more complex domain workflows, external integrations, or multiple entry points.

## Scope

The project is intended as a focused demonstration of access control, authentication, authorization, and deployment practices rather than a complete learning management system.

The domain remains deliberately small so the important security behaviours are easy to inspect:

- Which visitors may reach the demo
- How abusive invite-redemption attempts are constrained
- Who is authenticated
- Which role an authenticated user has
- Which routes that role may access
- Which resources the user owns
- Which rows PostgreSQL permits them to read or modify
- Which security boundaries remain independent

## Potential extensions

Possible future improvements include:

1. Add browser-level end-to-end tests for the complete invite and authentication flows.
2. Add bounded server-side revalidation so revoking an invite can invalidate already-issued access cookies before their natural expiry.
3. Add narrowly scoped operator commands for listing and revoking invites.
4. Add pagination, search, and filtering to the administrator dashboard.
5. Add an audit log for consultation status changes.
6. Add more granular permissions beyond the current student and administrator roles.
7. Add account management and profile editing.
8. Move rate-limit state to shared infrastructure if the application is horizontally scaled.
