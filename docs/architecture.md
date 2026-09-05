# Architecture

The application deliberately separates UI, authentication, HTTP transport, authorization, runtime validation, database access, and database authorization rather than allowing React components to communicate directly with PostgreSQL.

## Authentication boundary

Authentication mutations use a server-only path:

```text
Authentication form
   |
   v
Next.js Server Action
   |
   +--> Runtime input validation
   |
   +--> Supabase Auth operation
   |
   v
Typed Supabase server client
```

Sign-in, sign-out, account registration, password-recovery requests, and password updates do not instantiate Supabase clients in browser code.

Authentication callbacks remain Route Handlers because they receive external redirects or token exchanges from Supabase.

## Server and client module boundaries

The application keeps the React server/client boundary narrow and explicit:

- `use client` is present only on direct client entry points that use state,
  effects, browser APIs, event handlers, SWR, or interactive form behavior.
- Login, sign-up, password, and access-gate forms are Client Components because
  they own browser interaction state and submit events.
- Consultation hooks, lists, items, and the consultation creation form are
  Client Components because they use SWR, mutation state, event handlers, or
  controlled inputs.
- Browser-only email confirmation behavior is a Client Component because it
  uses browser APIs.
- `admin-consultations-view.tsx`, `student-consultations-view.tsx`, and the
  presentational `label.tsx` wrapper do not need their own `use client`
  directive. They can be Server Components while rendering client descendants.

The only file-level `use server` module is `app/auth/actions.ts`. Its exported
functions are callable Server Functions used by client-side authentication
forms. Ordinary Server Components, layouts, Route Handlers, `proxy.ts`, and
server-only utility modules do not need `use server` because their framework
entry point or import graph already keeps them on the server.

Server-only Supabase and authorization utilities import `server-only` to make
the boundary fail closed if a Client Component attempts to import them:

- `lib/supabase/server.ts` creates request-scoped Supabase clients using
  server cookies.
- `lib/server/auth.ts` reads the authenticated server user and profile role and
  may redirect from protected server-rendered routes.

These boundaries do not replace authentication or authorization. Route
Handlers, Server Actions, server data access, and PostgreSQL RLS must still
validate and authorize every request independently.

## Supabase session and response boundaries

The Supabase SSR session flow uses three request-scoped server client variants:

- `serverRequestClient()` reads request cookies for Server Components and
  read-only server operations.
- `serverActionClient()` reads and writes cookies for Server Actions that can
  update the authentication session.
- `serverResponseClient()` collects cookie updates so Route Handlers can apply
  them to the returned `NextResponse`, which is required by authentication
  callbacks such as `/auth/confirm`.

The root `proxy.ts` creates its own request-scoped Supabase client and calls
`supabase.auth.getClaims()` immediately. Refreshed cookies are copied to both
the request and response, and Supabase's `Cache-Control`, `Expires`, and
`Pragma` headers are preserved when the proxy returns an auth redirect.

Authenticated JSON API handlers are wrapped with `withApiHandler()`. That
boundary applies:

```text
Cache-Control: private, no-store, max-age=0, must-revalidate
```

to successful responses and error responses alike, preventing consultation
data or authenticated error responses from being shared by a CDN or reverse
proxy. Public health and access-gate responses use their own explicit cache
policies.

The protected page remains request-dynamic because `requireAuthContext()` reads
the authenticated user from server cookies and resolves the profile role. The
proxy is responsible for session refresh, while the page, route handlers,
Server Actions, and PostgreSQL RLS remain responsible for authorization.

## Authorization entry points

The protected page keeps its authentication and role decision in
`app/protected/page.tsx`. The page calls `requireAuthContext()` before choosing
the administrator or student view. `app/auth/layout.tsx` and
`app/protected/layout.tsx` remain presentation shells; neither layout is used
as the sole security boundary.

Every consultation Route Handler performs its own authentication, role, input,
and ownership checks. Student ownership is derived from the authenticated user
and is also enforced by PostgreSQL RLS. The administrator endpoint remains
read-only and is independently restricted to administrators.

Authentication Server Actions are callable server entry points and therefore
validate their inputs on every invocation:

- `signInAction()` and `signUpAction()` are intentionally unauthenticated
  entry points and validate credentials before calling Supabase Auth.
- `requestPasswordResetAction()` is intentionally unauthenticated and
  validates the email before requesting a reset message.
- `updatePasswordAction()` validates both passwords and calls `getUser()`
  before changing the password, so an expired or missing reset session cannot
  perform the mutation.
- `signOutAction()` is idempotent session cleanup. It uses the server action
  client and does not mutate protected application data, so it does not need a
  separate role or ownership check.

These checks are required even when the action is only called by a visible UI
form. Hidden controls, layouts, and proxy redirects are not authorization
boundaries.

## Authenticated consultation flow

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
Protected React UI
   |
   +--> Query hooks
   |      |
   |      v
   |     SWR
   |
   +--> Mutation hook
          |
          +--> create / update / cancel
          |
          v
Typed consultation API client
lib/consultations/api.ts
   |
   +--> HTTP request
   |
   +--> response treated as unknown
   |
   +--> Valibot runtime validation
   |
   v
Next.js route handlers
   |
   +--> authentication
   +--> role authorization
   +--> ownership checks
   +--> request validation
   |
   v
Typed Supabase server client
   |
   v
PostgreSQL
   |
   v
Row-level security
```

Responsibilities remain separated:

```text
React components
  -> presentation and local interaction state

SWR
  -> client-side server state and revalidation

Consultation hooks
  -> query and mutation orchestration

Consultation API client
  -> HTTP transport and response validation

Authentication Server Actions
  -> authentication mutations and runtime input validation

Route handlers
  -> callbacks, authentication, authorization, validation, and persistence

Supabase generated types
  -> compile-time database contracts

PostgreSQL RLS
  -> independent database authorization
```

## Invite redemption architecture

Invite redemption follows a separate public path:

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

# Next.js Proxy

The root `proxy.ts` performs two lightweight request-boundary operations:

1. Outer invite access-gate validation.
2. Supabase SSR session refresh for requests allowed through the gate.

The gate performs optimistic verification using the signed cookie and does not query PostgreSQL on every request.

Public access-gate and health routes remain reachable without the cookie.

# User interface

The UI is responsible for:

- rendering the invite access form;
- rendering authentication forms;
- displaying role-appropriate dashboards;
- collecting consultation input;
- presenting loading, success, and error states;
- owning transient UI state belonging to individual components.

The interface hides actions unavailable to a role, but authorization does not depend on those controls being hidden.

## Student consultation state

Student consultation state is separated according to responsibility.

### `useStudentConsultations`

Owns the consultation query and exposes:

- SWR-backed data;
- loading state;
- query errors.

### `useStudentConsultationActions`

Owns mutation orchestration.

After successful creation, update, rescheduling, completion changes, or cancellation, it asks SWR to revalidate the consultation resource.

It does not maintain a second manual copy of server state.

### `ConsultationItem`

Owns row-specific interaction state, including:

- current rescheduling value;
- whether that row currently has an action in progress.

This prevents unrelated query, mutation, and per-row UI state from accumulating in one large application hook.

# Client-side server state

SWR manages consultation server state.

The API paths also act as SWR resource keys:

```text
/api/consultations
/api/admin/consultations
```

Mutations do not manually fetch the entire collection and replace React state.

Instead:

```text
Mutation
   |
   v
API request succeeds
   |
   v
SWR mutate(resource key)
   |
   v
Resource revalidation
   |
   v
Updated cached server state
```

Student and administrator views therefore use the same server-state convention while retaining separate endpoints and authorization rules.

The current implementation favours revalidation rather than more complex optimistic cache updates because the dataset is small and correctness is more important than eliminating one follow-up GET request.

# Consultation API boundary

React components do not construct consultation HTTP requests directly.

`lib/consultations/api.ts` encapsulates:

- API paths;
- HTTP methods;
- JSON serialization;
- response parsing;
- API error extraction;
- runtime response validation.

Raw network responses are treated as untrusted.

```text
HTTP response
      |
      v
unknown JSON
      |
      v
Valibot response schema
      |
      v
Validated typed value
      |
      v
Application code
```

A successful HTTP status does not make a payload trusted.

Schemas in:

```text
lib/consultations/schemas.ts
```

validate individual consultation records and consultation collections before the data enters the UI.

# Type safety

Database-backed application types are derived from the generated Supabase schema instead of manually reproducing table structures.

```text
PostgreSQL schema
      |
      v
Supabase generated Database type
      |
      +--> Tables<'consultations'>
      |
      +--> Enums<'consultation_status'>
      |
      +--> Enums<'app_role'>
      |
      v
Application types
```

Supabase proxy and server clients are parameterized with the generated `Database` type.

Runtime schemas remain necessary during runtime to validate network data.

The application therefore combines:

```text
Generated Supabase types
    -> compile-time database safety

Valibot schemas
    -> runtime boundary validation
```

These mechanisms intentionally solve different problems.

# Route handlers

Next.js route handlers are responsible for:

- rate limiting public invite-redemption attempts;
- redeeming access invites;
- verifying authenticated sessions;
- resolving application roles;
- enforcing role requirements;
- enforcing resource ownership;
- validating request payloads;
- performing database operations;
- returning appropriate HTTP responses.

Student consultation operations are scoped using both consultation ID and authenticated student ID.

The database repeats critical ownership restrictions through RLS, so route-handler authorization is not the sole security boundary.

# Design decisions

## Layered access control

The outer invite gate and Supabase authentication solve different problems.

The invite gate restricts access to the hosted demonstration.

Supabase Auth identifies the LMS user.

Passing the invite gate never grants a student or administrator role.

## Server-side authentication boundary

Authentication form mutations are handled with Next.js Server Actions rather than direct browser Supabase calls.

This keeps:

- sign-in;
- sign-out;
- registration;
- password recovery;
- password updates

behind a server boundary while preserving Route Handlers for Supabase callback flows that require an HTTP endpoint.

Client Components remain responsible for interaction state and form feedback.

## Generated database types

Database-backed TypeScript structures derive from the generated Supabase `Database` definition.

This avoids independently maintaining:

- table row definitions;
- database enums;
- update column types.

Generated types provide compile-time alignment with PostgreSQL.

Narrower application input types remain defined around the operations the application actually permits.

## Runtime-validated API contracts

Network data remains untrusted even when an HTTP request succeeds.

The consultation API client parses responses as unknown values and validates successful payloads with Valibot.

This avoids relying on assertions such as:

```text
response.json() as T
```

which cannot guarantee the actual runtime structure.

## SWR server-state management

Consultation query data is server state and is managed with SWR rather than manually duplicated in React state.

Successful student mutations trigger SWR revalidation.

The application currently favours simple revalidation over optimistic updates because consultation collections are small and the consistency model is easier to reason about.

## Scoped React state

State is separated according to ownership:

```text
useStudentConsultations
    -> query state

useStudentConsultationActions
    -> mutation orchestration

ConsultationItem
    -> row-specific interaction state
```

This keeps server state, domain actions, and transient presentation state independently understandable without introducing unnecessary global state infrastructure.

## First-use invite expiry

Invite validity begins at first successful redemption rather than invite creation.

This avoids consuming a recruiter's access period before they first open the demonstration.

Expiry is established transactionally in PostgreSQL.

Subsequent redemption cannot extend it.

## Separate HMAC secrets

Invite-code hashing and cookie signing use separate secrets:

```text
ACCESS_GATE_CODE_SECRET
ACCESS_GATE_COOKIE_SECRET
```

The same key is therefore not reused for two cryptographic purposes.

## Stateless access cookie

Protected requests validate the signed access cookie without querying PostgreSQL.

This keeps Next.js Proxy lightweight and avoids a database lookup on every asset or page request.

The trade-off is that database revocation does not immediately invalidate an already-issued cookie.

## Process-local rate limiting

Invite redemption uses a bounded in-memory fixed-window limiter.

It executes before request parsing or database access.

The Azure deployment currently runs one active application replica, making process-local state suitable for the current workload.

If the application were horizontally scaled, rate-limit state would need to move to shared storage or an upstream gateway.

## Minimal visitor data

Successful invite redemption persists only:

```text
invite_id
used_at
```

No IP address, user-agent, or other browser-identifying metadata is persisted to PostgreSQL.

The rate limiter uses its client identifier only transiently in process memory.

## Least-privilege invite tables

Browser-facing Supabase roles do not directly access invite tables.

The trusted operator role has only the table privileges needed to create and inspect invites.

Browser redemption occurs through the dedicated database function.

## Defense in depth

LMS authorization is enforced both by Next.js and PostgreSQL RLS.

The duplication is intentional:

- Route Handlers provide explicit application-level responses.
- RLS protects row ownership if the application layer is bypassed or incorrectly configured.
- column-level privileges restrict authenticated clients to the mutation fields exposed by the application.
- database triggers own consultation lifecycle timestamps and enforce terminal cancellation.

## Read-only administrator role

Administrators can view consultations belonging to all students but cannot modify them.

This demonstrates broad read access without granting unnecessary write permissions.

## Ownership-based student access

Students can manage consultations only when:

```text
student_user_id = authenticated user ID
```

Queries additionally scope mutations using both consultation ID and owner ID.

## Status-based cancellation

Consultations are cancelled by updating their status rather than deleting the database row.

This preserves historical records and cancellation timestamps.

## Small application architecture

The project deliberately avoids unnecessary service, repository, and global-state layers.

Abstractions are introduced only where they create a meaningful boundary:

- authentication and authorization;
- runtime validation;
- consultation HTTP transport;
- server-state management;
- database access.

Additional layers would become appropriate if the application introduced more complex domain workflows, external integrations, multiple persistence implementations, or substantially broader client-side state requirements.
