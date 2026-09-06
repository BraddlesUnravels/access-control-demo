# Testing

The repository validates the app at several layers so the security story is checked as a system, not only as individual components.

## Test layers

```text
TypeScript + Valibot
  -> request/response contracts

Vitest Node tests
  -> logic and route behaviour

Vitest browser tests
  -> interactive UI flows in Chromium

PostgreSQL tests
  -> RLS and invite lifecycle enforcement

Container-stage integration tests
  -> assembled production container behaviour
```

## Main commands

```bash
npm test
npm run test:node
npm run test:ui
npm run test:db
npm run build
```

### Browser tests

Browser tests use Vitest Browser Mode with Playwright and Chromium. They exercise real UI behavior without duplicating production-container checks.

### Database tests

```bash
npm run test:db
```

This runs the SQL security checks under `supabase/tests/` and verifies RLS rules, access-gate behaviour, lifecycle constraints, and privilege boundaries.

### Local quality checks

```bash
npm run format:check
npm run typecheck
npm run lint
npm test
npm run test:db
npm run build
```

## CI expectations

The workflow encourages quality gates for formatting, Typescript, linting, Node tests, browser tests, and production builds.

The container-stage workflow also performs an end-to-end validation against the built Docker image, including real Supabase flows and protected-route access checks.
