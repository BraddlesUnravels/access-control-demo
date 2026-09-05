# Testing

The project uses multiple testing layers so application behaviour, browser interactions, database authorization, and the assembled production container can be validated independently.

```text
TypeScript + Valibot
    -> application contracts

Vitest Node tests
    -> application and API behaviour

Vitest browser tests
    -> interactive React behaviour in Chromium

PostgreSQL tests
    -> database authorization and lifecycle rules

Container-stage integration tests
    -> assembled production-image behaviour
```

# Vitest

Run all Vitest projects with:

```bash
npm test
```

Run the projects independently with:

```bash
npm run test:node
npm run test:ui
```

Watch modes:

```bash
npm run test:watch
npm run test:ui:watch
```

Browser component tests use Vitest Browser Mode with Playwright and Chromium.

They exercise interactive React behaviour in a real browser environment without duplicating the production-container integration suite.

# Application test coverage

The Vitest suites cover:

- invite-code normalization and HMAC hashing;
- access-cookie signing and malformed-cookie rejection;
- access-session cache expiry, bounded eviction, LRU behavior, concurrency, and stale-validation races;
- access-session RPC success, rejection, malformed-result, and fail-closed behavior;
- safe access-gate redirects;
- local versus Azure gate configuration;
- proxy gate behaviour;
- rate-limit client identification;
- trusted Azure forwarding behaviour;
- fixed-window rate-limit enforcement;
- rate-limit expiry and client isolation;
- bounded limiter overflow behaviour;
- access-unlock API outcomes;
- rate-limited requests;
- Supabase proxy cookie and session handling;
- protected-route access-session validation and cookie clearing;
- root Proxy orchestration;
- authentication context and role resolution;
- authentication Server Actions;
- sign-in;
- sign-out;
- registration;
- password recovery;
- password updates;
- demo-account selection;
- password visibility behaviour;
- consultation form loading and disabled states;
- consultation create success and failure states;
- form reset behaviour;
- consultation rescheduling;
- completion and incompletion;
- cancellation;
- status-dependent actions;
- empty consultation lists;
- consultation API-client endpoint selection;
- HTTP method selection;
- consultation create, update, cancellation, and admin request construction;
- API error propagation;
- rejection of malformed successful API responses;
- student consultation route authentication;
- role enforcement;
- ownership scoping;
- request validation;
- malformed JSON handling;
- consultation lifecycle transitions;
- idempotent cancellation;
- administrator route authorization;
- invite-creation tooling.

The API-client and route-handler suites protect both sides of the consultation HTTP contract.

Successful responses are runtime validated rather than trusted through TypeScript assertions.

# Database tests

Run:

```bash
npm run test:db
```

This executes:

```text
supabase/tests/rls_checks.sql
supabase/tests/access_gate_checks.sql
```

The database suite verifies:

- RLS configuration;
- student ownership restrictions;
- administrator read access;
- mutation restrictions;
- table privileges;
- table and column privileges;
- database-managed consultation lifecycle timestamps;
- RPC execution privileges;
- access-session validation RPC privileges and valid, missing, expired, and revoked outcomes;
- invite-state constraints;
- invalid redemption;
- expired redemption;
- revoked redemption;
- first-use expiry;
- non-sliding re-entry;
- access-visit creation;
- browser-role isolation from gate tables.

# Local quality checks

Run the complete local quality suite with:

```bash
npm run format:check
npm run typecheck
npm run lint
npm test
npm run test:db
npm run build
```

# Continuous integration

Pull requests run application quality checks including:

- formatting;
- TypeScript type checking;
- linting;
- Node Vitest tests;
- browser Vitest tests;
- production builds;
- dependency review.

# Container stage

The container-stage workflow provides a higher-level integration check against the assembled production application.

It starts a fresh disposable local Supabase stack.

Supabase applies the repository migrations and seed data during startup.

The workflow then:

```text
Starts disposable Supabase
        |
        v
Runs PostgreSQL security tests
        |
        v
Builds production Docker image
        |
        v
Starts application container
        |
        v
Executes integration scenario
```

The container integration scenario verifies:

- application health;
- container-to-Supabase connectivity;
- invalid invite rejection;
- real disposable invite redemption;
- access-gate cookie propagation;
- real Supabase SSR authentication;
- seeded student authentication;
- seeded administrator authentication;
- protected-route access;
- student consultation ownership isolation;
- student/admin role boundaries;
- rejection of cross-student mutation;
- consultation creation;
- consultation completion;
- consultation cancellation;
- idempotent repeated cancellation;
- persistence visible through the administrator read-only API.

The harness is located at:

```text
scripts/container-tests/
├── docker.mjs
├── http.mjs
├── run-container-tests.mjs
└── supabase.mjs
```

`run-container-tests.mjs` contains the integration scenario.

The helper files isolate:

- Docker/process mechanics;
- HTTP and cookie handling;
- Supabase test setup and authentication.

# Stage label

The container-stage workflow requires the pull request to carry the:

```text
stage
```

label.

If container staging is configured as a required status check for `main`, omitting or removing the label causes the check to fail rather than silently skip.

# Pull-request diagnostics

Successful and failed container-stage runs publish diagnostic comments to the pull-request conversation.

The workflow maintains at most:

```text
one success comment
one failure comment
```

per pull request.

Hidden markers identify the existing comment of each type.

Subsequent passes edit the previous success comment.

Subsequent failures edit the previous failure comment.

This prevents repeated container-stage runs from filling the PR conversation with duplicate diagnostics.

# Stage GitHub environment

The workflow uses the GitHub Environment:

```text
stage
```

Store these values as environment secrets:

```text
ACCESS_GATE_CODE_SECRET
ACCESS_GATE_COOKIE_SECRET
PR_COMMENT_TOKEN
```

The access-gate secrets:

- must be at least 32 characters;
- should use different values;
- are used by the disposable staging environment.

## `PR_COMMENT_TOKEN`

`PR_COMMENT_TOKEN` is a fine-grained GitHub personal access token used by the diagnostic publishing steps.

Scope it to this repository.

The current setup requires repository permissions that allow PR conversation comments to be read, created, and updated.

The configured fine-grained token uses:

```text
Issues: Read and write
Pull requests: Read and write
```

Store the token only as a GitHub Environment secret.

Do not commit it.

Rotate the token when it expires and update the `stage` environment secret.

# Required merge check

The container integration job can be configured as a required status check for `main`.

The job name is:

```text
Container integration
```

When required through the repository ruleset, the PR cannot merge until the container integration stage succeeds.

This means the final merge candidate has passed:

```text
Production image build
+
Real local Supabase integration
+
Access gate
+
Authentication
+
Authorization
+
Ownership
+
Database persistence
```
