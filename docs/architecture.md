# Architecture

The application keeps a deliberately small set of boundaries: UI, auth, proxy, API, and PostgreSQL. The intent is to make each decision easy to review.

## Request flow

```text
Browser UI
  |
  v
Next.js proxy
  |
  +--> access-gate validation
  +--> Supabase session refresh
  |
  v
Protected page or route handler
  |
  +--> auth check
  +--> role check
  +--> ownership or request validation
  |
  v
Typed Supabase client
  |
  v
PostgreSQL with row-level security
```

## Key boundaries

### Client boundary

React components own presentation and local interaction state. They do not talk directly to PostgreSQL.

### Authentication boundary

Authentication actions use server-only entry points and validate request inputs before calling Supabase Auth.

### Proxy boundary

The root `proxy.ts` performs two lightweight checks:

1. validate the signed `access_gate` cookie;
2. refresh the Supabase SSR session for requests that pass the gate.

Public endpoints remain explicitly excluded from the gate and are intentionally available without a valid cookie.

### Route-handler boundary

Every protected route handler re-checks:

- auth status;
- role (`student` or `admin`);
- resource ownership for student updates;
- request validation;
- valid lifecycle transitions.

### Database boundary

PostgreSQL row-level security is the final independent enforcement layer. It restricts what each user can read or modify even if the route handler would otherwise let them in.

## Consultation request flow

```text
Browser
  |
  v
Consultation hooks / SWR
  |
  v
Typed consultation API client
  |
  +--> HTTP request
  +--> runtime response validation
  |
  v
Next.js route handlers
  |
  +--> auth + role checks
  +--> ownership checks
  +--> database mutation
  |
  v
PostgreSQL + RLS
```

## Design principles

- keep auth and authorization visible and explicit;
- avoid treating the UI as a security boundary;
- keep generated Supabase types as the database contract;
- keep runtime validation separate from compile-time types;
- keep the database policy and app logic independent even when they overlap.

This separation is intentional: it makes the access-control demo easier to review, test, and teach.
