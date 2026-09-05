# Access Control and API

This document describes the application's visitor access gate, LMS authentication and authorization model, consultation lifecycle, HTTP API, and database authorization boundary.

## Visitor invite code gate

The hosted demo sits behind an outer invite gate so the intentionally simple demonstration credentials are not directly exposed to the public internet.

The invite gate determines whether a browser may reach the demonstration application. It is separate from Supabase authentication and does not grant a user identity or application role.

## Invite redemption flow

1. A visitor opens `/`, optionally with a `?code=` query parameter.
2. The visitor submits an invite code to `POST /api/access/unlock`.
3. The server applies a per-client rate limit before parsing or validating the request.
4. If allowed, the server normalizes the code and creates an HMAC-SHA256 digest using `ACCESS_GATE_CODE_SECRET`.
5. The server calls the PostgreSQL `redeem_access_invite` function.
6. PostgreSQL validates the invite and atomically establishes its access window on first successful redemption.
7. A successful redemption creates an `access_visits` record.
8. The server issues a signed `httpOnly` access-gate cookie using the database-controlled absolute expiry.
9. Subsequent requests carrying a valid access cookie proceed to Supabase authentication.

The root route is the gate entry point:

```text
/
```

There is no `/access` route.

Invite links therefore use:

```text
/?code=ACD-XXXX-XXXX-XXXX
```

Protected page requests without invite code are redirected to `/` with a safe `next` destination.

Protected API requests without invite code return:

```text
401 Unauthorized
```

The health endpoint and invite-redemption API remain available without an access cookie.

## Invite lifetime

New invites begin without an active access window:

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

Invite creation accepts durations from 1 to 30 days:

```bash
npm run invite:create -- --label "Acme recruiter" --days 14
```

If `--days` is omitted, the current database default is used.

## Invite-code storage

Generated codes use:

```text
ACD-XXXX-XXXX-XXXX
```

The plaintext code is never stored in PostgreSQL.

Instead, both the operator script and application calculate:

```text
HMAC-SHA256(normalized invite code, ACCESS_GATE_CODE_SECRET)
```

The resulting digest is stored in:

```text
access_invites.code_hash
```

The secret used to create an invite must therefore exactly match the code secret used by the deployed application.

## Invite-redemption rate limiting

`POST /api/access/unlock` uses an in-memory fixed-window rate limiter to reduce automated invite-code guessing and abusive request volume.

The current policy permits up to five redemption attempts per client within a 60-second window.

Requests above the limit receive:

```text
429 Too Many Requests
```

with a `Retry-After` header.

Rate limiting occurs before:

- request-body parsing;
- validation;
- invite hashing;
- Supabase access.

Blocked requests therefore avoid unnecessary application and database work.

In Azure Container Apps, the limiter identifies clients using the rightmost address supplied through `X-Forwarded-For`.

Forwarding headers are not trusted outside the Azure environment.

Limiter state is:

- process-local;
- bounded in memory;
- discarded when the process restarts.

The deployed application currently runs a single active application replica, making this appropriate for the current portfolio workload.

A horizontally scaled deployment would require shared rate-limit state such as Redis or supabase postgres, or an upstream rate-limiting layer.

## Access cookie

The access cookie is HMAC-signed using:

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
- restricted to the database-controlled absolute expiry.

Invite-code hashing and cookie signing intentionally use separate secrets.

## Revocation

The redemption function rejects invites with a populated:

```text
revoked_at
```

This prevents further redemption.

The access cookie is currently stateless.

A cookie issued before an invite is revoked therefore remains valid until its existing absolute expiry.

Immediate invalidation would require additional server-side revalidation.

# Creating invites

## Local Supabase

`npm run infra:env` generates the local values required by the invite operator script.

Create an invite with:

```bash
npm run invite:create -- --label "Local recruiter demo" --days 14
```

The plaintext code is printed once.

Store it before closing the terminal.

## Hosted Supabase

For production invites, run the operator script locally while pointing it at the hosted Supabase project.

A local file such as `.env.production.local` can contain:

```text
NEXT_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
ACCESS_GATE_CODE_SECRET=your-production-access-gate-code-secret
```

`SUPABASE_SECRET_KEY` is preferred for trusted server-side/operator tooling.

The script also supports:

```text
SUPABASE_SERVICE_ROLE_KEY
```

as a legacy fallback.

Run:

```bash
node --env-file=.env.production.local \
  scripts/create-access-invite.mjs \
  --label "Acme recruiter" \
  --days 14
```

The Supabase administrative credential is an operator credential.

It is not required by the deployed Next.js application and must not be exposed to browser code or committed to the repository.

# Authentication and authorization

The project separates four related concerns:

```text
Visitor access
    ↓
Authentication
    ↓
Role authorization
    ↓
Resource ownership + RLS
```

## Visitor access

The outer invite gate determines whether a browser may reach the demonstration environment.

Passing the invite gate does not authenticate a user.

## Authentication

Supabase Auth determines the current user identity.

It manages:

- account registration;
- email confirmation;
- sign-in sessions;
- sign-out;
- password recovery;
- password updates.

Application-initiated authentication mutations execute through Next.js Server Actions.

Supabase confirmation and recovery callbacks remain Route Handlers because they require HTTP endpoints.

## Role-based authorization

Authenticated users have one of two application roles:

```text
student
admin
```

Route handlers resolve and validate the application role before performing role-specific operations.

## Resource ownership

Student consultation operations are scoped using both:

```text
consultation ID
authenticated student user ID
```

This prevents a student from accessing another student's consultation by supplying a different resource ID.

## Row-level security

PostgreSQL row-level security repeats the important authorization restrictions at the database boundary.

The overlap is deliberate:

- application checks provide clear HTTP behaviour;
- database policies independently protect the underlying data.

# Consultation lifecycle

Consultations use:

```text
scheduled
completed
cancelled
```

Students can:

- create a scheduled consultation;
- change its scheduled date;
- mark it completed;
- return it to scheduled;
- cancel it.

Cancellation is represented as a status transition rather than physical deletion.

Lifecycle timestamps are owned by PostgreSQL rather than supplied by the application. When a consultation transitions to `completed` or `cancelled`, the database records the corresponding timestamp. Returning a completed consultation to `scheduled` clears its completion timestamp. Cancelled consultations are terminal and cannot be updated.

This preserves the record and its lifecycle metadata while preventing clients from forging those timestamps.

# API summary

## Access gate

### `POST /api/access/unlock`

Redeems an invite code.

Possible outcomes include:

- `200` — successful redemption;
- `400` — malformed or invalid request;
- `401` — no invite matches the submitted code;
- `403` — expired or revoked invite;
- `429` — rate limit exceeded;
- `500` — invite-verification infrastructure or RPC failure.

Rate-limited requests include a `Retry-After` header.

Successful redemption sets the signed `access_gate` cookie.

## Student endpoints

### `GET /api/consultations`

Returns consultations belonging to the authenticated student.

Requirements:

- valid visitor invite code;
- authenticated Supabase session;
- `student` application role.

### `POST /api/consultations`

Creates a consultation belonging to the authenticated student.

Validated request fields include:

```text
firstName
lastName
reason
scheduledFor
```

Requirements:

- valid visitor invite code;
- authenticated user;
- `student` role;
- consultation ownership derived from the authenticated user.

### `PATCH /api/consultations/:id`

Updates the scheduled date or status of an owned consultation.

Supported operations include:

- rescheduling;
- marking complete;
- marking incomplete.

Requirements:

- valid visitor invite code;
- authenticated user;
- `student` role;
- consultation owned by the authenticated student;
- consultation not cancelled.

### `DELETE /api/consultations/:id`

Cancels an owned consultation by setting:

```text
status = cancelled
```

The database row is not physically deleted.

The operation is idempotent when the consultation is already cancelled.

## Administrator endpoint

### `GET /api/admin/consultations`

Returns a read-only list of consultations belonging to all students.

Requirements:

- valid visitor invite code;
- authenticated user;
- `admin` role.

Administrators cannot create, update, or cancel consultations.

## Health endpoint

### `GET /api/health`

Returns application health status.

This route bypasses the invite gate so Docker and Azure Container Apps health probes do not depend on user authentication or Supabase availability.

# Database model

## `public.access_invites`

Stores invite metadata and access-window state.

Important fields:

```text
code_hash
label
access_duration_days
first_accessed_at
expires_at
revoked_at
use_count
created_at
```

## `public.access_visits`

Records successful invite redemptions.

Important fields:

```text
invite_id
used_at
```

No user-agent or other browser-identifying metadata is stored.

## `public.profiles`

Stores application-specific information associated with a Supabase Auth user.

Important information includes:

- authenticated user ID;
- application role;
- creation timestamp;
- update timestamp.

The profile ID corresponds to the Supabase Auth user ID.

## `public.consultations`

Stores consultations owned by students.

Important fields:

```text
student_user_id
first_name
last_name
reason
scheduled_for
status
created_at
updated_at
completed_at
cancelled_at
```

# Database authorization

The database authorization boundary combines RLS with column-level privileges:

- students can select only their own consultations;
- students can create consultations only for themselves;
- student inserts are limited to ownership, name, reason, and scheduling fields;
- student updates are limited to `scheduled_for` and `status`;
- lifecycle timestamps are generated by PostgreSQL and cannot be supplied directly by authenticated clients;
- cancelled consultations cannot be updated;
- administrators can select consultations belonging to all students;
- administrators cannot insert, update, or delete consultations;
- authenticated users cannot physically delete consultation records.

RLS determines which rows an authenticated user can access, while SQL column privileges restrict which fields can be written if the Data API is called directly.

The invite-gate database design additionally ensures that:

- browser-facing roles cannot directly access `access_invites` or `access_visits`;
- plaintext invite codes are never stored;
- the trusted operator role has only the privileges required to create and inspect invites;
- redemption occurs through a narrowly scoped `SECURITY DEFINER` function;
- concurrent first redemptions are serialized using a row lock;
- first-use expiry is established atomically;
- subsequent redemption does not extend the access window.
