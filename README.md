# Access Control Demo

A small full-stack learning management system demonstrating layered access control, authentication, role-based authorization, resource ownership, and PostgreSQL row-level security.

The project is intentionally compact so the security boundaries are easy to inspect and explain. It uses Next.js, TypeScript, Supabase Auth, PostgreSQL, Docker, and Azure Container Apps.

## What the project demonstrates

- Invite-based visitor access before the app is reachable
- Signed, expiring access-gate cookies
- HMAC-based invite-code storage without storing plaintext invite codes
- Rate limiting on invite redemption
- Supabase Auth for student and admin sign-in
- Role-based access control for `student` and `admin`
- Resource ownership checks for student consultations
- Server-side authorization in Next.js route handlers
- PostgreSQL row-level security for database enforcement
- Read-only admin access to all consultations
- Runtime validation with Valibot
- SWR-driven client state and mutations
- Local email testing with MailPit
- Automated Node, browser, database, and container checks

## System overview

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

The invite gate is a separate outer boundary. It determines whether a browser may reach the demo, but it does not grant a user role or access to LMS data.

## Quick start

### Prerequisites

- Node.js LTS
- npm
- Supabase CLI
- Docker

### Start the local demo

```bash
npm run demo:start
```

This installs dependencies, starts local Supabase services, applies migrations and seed data, generates `.env.local`, and starts the Next.js app.

The app runs at:

```text
http://localhost:3000
```

Create a local invite before visiting the app:

```bash
npm run invite:create -- --label "Local demo" --days 14
```

The command prints a code once, for example:

```text
code: ACD-4GZ3-PDQJ-FWT9
path: /?code=ACD-4GZ3-PDQJ-FWT9
```

Open the generated link or enter the code at the root page.

## Demo accounts

The local seed data creates these accounts:

| Role          | Email              | Password            |
| ------------- | ------------------ | ------------------- |
| Student       | `student1@lms.com` | `ReviewStudent**01` |
| Student       | `student2@lms.com` | `ReviewStudent**02` |
| Administrator | `admin@lms.com`    | `ReviewAdmin**00`   |

These are for local demo use only. Automated tests should not rely on the seeded credentials.

## Suggested walkthrough

### Visitor access

1. Create a local invite.
2. Open `/` and enter the invite code.
3. Confirm the app redirects to the LMS login screen.
4. Delete the `access_gate` cookie, re-enter the same invite, and confirm re-entry still works without extending the original expiry.

### Student flow

1. Sign in as `student1@lms.com`.
2. Confirm only Student 1's consultations are visible.
3. Create a consultation.
4. Mark it complete, then incomplete.
5. Reschedule it.
6. Cancel it.
7. Sign out and sign in as `student2@lms.com`.
8. Confirm Student 1's data remains hidden.

### Administrator flow

1. Sign in as `admin@lms.com`.
2. Open the admin consultations page.
3. Confirm both students' consultations are visible.
4. Confirm the dashboard is read-only and no mutation controls are available.

## Documentation map

This repo keeps documentation grouped by domain:

- [Documentation index](docs/README.md) — reader-first map of the docs set
- [Access control](docs/access-control.md) — invite gate, auth model, roles, RLS, and consultation lifecycle
- [API reference](docs/api.md) — HTTP endpoints and request/response expectations
- [Architecture](docs/architecture.md) — boundaries between UI, auth, proxy, API, and database
- [Development](docs/development.md) — local setup, env vars, scripts, and MailPit
- [Testing](docs/testing.md) — test layers and commands
- [Secrets management](docs/secrets-management.md) — secret separation, rotation, and operational guidance
- [Deployment](docs/deployment.md) — Azure Container Apps, Key Vault, and OIDC

## Common commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:node
npm run test:ui
npm run test:db
npm run build
```

See [docs/testing.md](docs/testing.md) for the full test strategy.

## Scope

This is intentionally a focused demo rather than a full learning management system. The purpose is to make these behaviours easy to audit:

- which visitors can reach the app;
- how invite redemption is restricted;
- who is authenticated;
- what role an authenticated user has;
- which routes and records are authorized;
- which rows PostgreSQL allows the user to read or modify;
- which boundaries remain independent.

## Related docs

- [docs/README.md](docs/README.md)
- [docs/access-control.md](docs/access-control.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/development.md](docs/development.md)
- [docs/testing.md](docs/testing.md)
