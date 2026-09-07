# Development

This guide covers the local setup, environment values, invite flow, and common development tasks for the demo.

## Prerequisites

Install:

- Node.js LTS
- npm
- Supabase CLI
- Docker

## Fast local setup

```bash
npm run demo:start
```

This does the full local bootstrap:

1. installs dependencies;
2. starts local Supabase services;
3. applies migrations and seed data;
4. generates `.env.local`;
5. starts the Next.js dev server.

The app is available at:

```text
http://localhost:3000
```

## Manual setup

If you want to run the steps individually:

```bash
npm install
npm run infra:up
npm run infra:reset
npm run infra:env
npm run dev
```

After a reset, recreate any local invites:

```bash
npm run invite:create -- --label "Local demo" --days 14
```

## Local email testing

Authentication emails are captured by MailPit instead of being delivered externally.

Open:

```text
http://localhost:54324
```

Use MailPit to complete:

- sign-up confirmation;
- password reset flows.

## Environment variables

The app expects these runtime values:

```text
NEXT_SUPABASE_URL
NEXT_SUPABASE_PUBLISHABLE_KEY
ACCESS_GATE_CODE_SECRET
ACCESS_GATE_COOKIE_SECRET
```

For local convenience, `ACCESS_GATE_DISABLED=true` can bypass the invite gate outside Azure. This is only a local dev shortcut and is ignored in Azure Container Apps.

Invite creation also needs a trusted Supabase admin credential:

```text
SUPABASE_SERVICE_ROLE_KEY
```

The legacy fallback `SUPABASE_SECRET_KEY` is still supported for compatibility, but the current documented variable is `SUPABASE_SERVICE_ROLE_KEY`.

## Database types

Supabase-generated database types are the source of truth for database-backed TypeScript structures. After a schema change, regenerate them with:

```bash
npm run db:types
```

The generated file is:

```text
lib/supabase/database.types.ts
```

Do not edit it manually.

## Common scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:node
npm run test:ui
npm run test:db
npm run infra:up
npm run infra:reset
npm run infra:env
npm run invite:create
npm run db:types
```
