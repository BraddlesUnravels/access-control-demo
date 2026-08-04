# Repository Development Instructions

Follow these instructions when reviewing, writing, or modifying code in this repository.

These rules define the preferred engineering approach. Follow them unless they conflict with:

1. Correctness or security
2. An explicit task requirement
3. A framework, library, or external contract
4. An established repository convention

When an exception is necessary, keep it narrow and explain the reason.

## Project Purpose

This repository is a small full-stack learning management system demonstrating:

- Authentication
- Role-based access control
- Resource ownership
- Server-side authorization
- PostgreSQL row-level security
- Defense in depth

The domain is intentionally small so authentication and authorization boundaries remain explicit and easy to review.

Do not introduce architectural complexity that obscures these boundaries.

## Technology

The project uses:

- Next.js
- TypeScript
- Supabase Auth
- PostgreSQL
- PostgreSQL row-level security
- Vitest
- Supabase CLI
- npm

Before using an API or framework feature that is unclear, inspect:

1. Existing repository usage
2. Installed package versions
3. Available documentation or MCP tools such as context-7, linear, or something similar.

Prefer repository code and version-appropriate documentation over assumptions.

## Decision Priorities

Make decisions in this order:

1. Correctness
2. Security
3. Maintainability
4. Readability
5. Consistency
6. Measured performance
7. Brevity

Do not sacrifice correctness, security, or readability to comply mechanically with a stylistic preference.

## Before Modifying Code

Before writing or changing code:

- Read the relevant source file completely.
- Inspect neighbouring modules that solve similar problems.
- Inspect relevant tests and database policies.
- Identify the layer responsible for the behaviour.
- Check existing public exports before importing internal files.
- Confirm whether the change affects authentication, roles, ownership, or row-level security.
- Preserve existing naming and response conventions unless the task explicitly changes them.
- Consult available documentation or MCP tools when external behaviour is uncertain.

Do not introduce a new pattern when an appropriate repository pattern already exists.

## Scope of Changes

Make the smallest complete change that correctly satisfies the task.

- Do not modify unrelated files.
- Do not rename unrelated symbols.
- Do not perform opportunistic refactors.
- Do not change public APIs unless required.
- Do not add speculative abstractions.
- Update tests when observable behaviour changes.
- Update documentation when commands, architecture, or externally visible behaviour changes.

A small complete change is preferred over either a broad refactor or an incomplete minimal diff.

## Architecture

The intended request flow is:

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

Preserve this deliberately small architecture.

For the current project scope:

- Authentication, authorization, validation, and persistence may remain visible in route handlers.
- Do not introduce service or repository layers merely to follow a generic architecture pattern.
- Extract shared logic only when it removes meaningful duplication, defines a security boundary, or represents a stable domain operation.
- Keep framework-specific concerns near framework boundaries.
- Keep database authorization independently enforced through row-level security.

Additional layers may become appropriate only when there are:

- Complex domain workflows
- Multi-step transactions
- External integrations
- Multiple application entry points
- Substantial repeated domain logic

## Authorization Doctrine

Authorization is enforced independently at the application and database layers.

Never treat the user interface as a security boundary.

### User interface

The UI may hide controls that are unavailable to the current user, but hidden controls do not provide authorization.

### Route handlers

Route handlers must enforce all applicable requirements:

- Authentication
- Application role
- Resource ownership
- Request validation
- Allowed state transitions
- Appropriate HTTP response behaviour

### Database

PostgreSQL row-level security must independently enforce access to protected rows.

Do not weaken database policies because an equivalent route-handler check exists.

Do not remove route-handler checks because an equivalent row-level security policy exists.

The overlap is intentional defense in depth.

## Roles

The project has two roles:

```text
student
admin
```

Use string literal unions rather than TypeScript enums.

### Students

Students may operate only on consultations belonging to their authenticated user ID.

Student reads and mutations must be scoped by ownership.

For an individual consultation operation, use both:

- Consultation ID
- Authenticated student user ID

Prefer enforcing ownership in the database query itself.

Do not retrieve a consultation by ID alone and rely only on a later ownership check when the query can enforce ownership directly.

### Administrators

Administrators have read-only access to consultations belonging to all students.

Do not add administrator create, update, cancel, or delete behaviour unless the authorization model is explicitly changed.

Administrators must not use student consultation endpoints.

## Consultation Lifecycle

Supported consultation states are:

```text
scheduled
completed
cancelled
```

Preserve valid state transitions.

Students may:

- Create a scheduled consultation
- Reschedule a consultation
- Mark a consultation as completed
- Return a completed consultation to scheduled
- Cancel a consultation

Cancelled consultations cannot be modified unless the project requirements explicitly change.

Cancellation is a status transition, not a physical database deletion.

Cancellation must remain idempotent when a consultation is already cancelled.

Do not physically delete consultation records through authenticated application operations.

## Functions and Control Flow

Prefer:

- Small functions with one clear responsibility
- Intention-revealing names
- Guard clauses
- Flat control flow
- Explicit boundaries
- Minimal side effects
- Clear separation between validation, authorization, persistence, and response construction

Avoid:

- Deep nesting
- Boolean flag arguments with unclear meaning
- Generic helpers that hide important behaviour
- Premature abstractions
- Functions extracted solely to reduce line count
- Comments that narrate obvious code

Extract a function when it:

- Creates a meaningful abstraction
- Removes genuine duplication
- Isolates a side effect
- Defines a security or framework boundary
- Makes behaviour independently testable

Do not extract code merely to make a function shorter.

## Errors

Application functions return successful values and throw errors on failure.

Do not introduce generic result-object wrappers unless:

- An existing public API requires one
- Partial success is an expected outcome
- Failure is a normal domain value rather than an exceptional condition

Error messages must be:

- Sentence case
- Human readable
- Specific
- Searchable
- Stable when exposed as part of a public contract

Do not expose internal database, authentication, stack-trace, or infrastructure details to clients.

Catch an error only when:

- Recovering from it
- Translating it at a boundary
- Adding meaningful context
- Performing required cleanup
- Converting it into an appropriate HTTP response

Do not catch and immediately rethrow an unchanged error.

## Logging

Use structured logging only at meaningful boundaries, such as:

- Route-handler failures
- Authentication boundaries
- Background or CLI entry points
- Top-level unexpected failures

Do not log:

- Every function call
- Successful routine steps
- The same error at multiple layers
- Secrets
- Passwords
- Access tokens
- Refresh tokens
- Session values
- Authentication cookies
- Sensitive personal information

Log an error once at the layer responsible for handling or reporting it.

## Types

Types should prevent mistakes and improve editor support without obscuring runtime behaviour.

- Prefer inferred local types when they are clear.
- Add explicit types at public boundaries.
- Prefer `unknown` over `any`.
- Narrow external data before using it.
- Use targeted `any` only when required by an untyped external boundary, and explain why.
- Use string literal unions instead of enums.
- Prefer `undefined` internally.
- Preserve `null` at database boundaries when it represents SQL `NULL`.
- Normalise external nullable values at clear boundaries when useful.
- Avoid complicated conditional or generic types when a simpler named type is clearer.

Do not use type assertions to bypass unresolved type errors.

## Modules and Exports

Prefer:

- Named exports
- Exported `const` arrow functions for ordinary module operations
- Imports through public module surfaces
- Functions and plain objects over classes for ordinary application code

Default exports are acceptable where required or conventional, including:

- Next.js pages
- Next.js layouts
- Framework configuration
- Other framework-defined entry points

Follow existing repository conventions when they are more specific.

## Imports

Use one import block with no blank lines.

Order imports as:

1. External packages
2. Internal aliases
3. Relative modules

Use type-only imports when an import is used only as a type.

Import through public module surfaces when available.

Do not reach into another module's internal path to bypass its intended API.

## Asynchronous Code

Prefer `async` and `await` over promise chains.

- Run independent asynchronous operations concurrently where appropriate.
- Await dependent operations sequentially.
- Do not use `Promise.all` when partial execution could leave unsafe side effects.
- Do not leave promises unhandled.
- Do not add `async` when a function does not await anything.
- Preserve readable error boundaries around asynchronous work.

Promise combinators such as `Promise.all` are encouraged when they clearly represent safe concurrent work.

## Collections

Prefer `map`, `filter`, and `find` when they clearly express intent.

Use a loop when it provides:

- Early exit
- Fewer unnecessary passes
- Lower allocation
- Clearer stateful logic
- Better readability

Use `reduce` only when accumulation is genuinely the clearest operation.

Do not create multiple intermediate arrays in performance-sensitive paths without a reason.

## Performance

Avoid obvious unnecessary work, including:

- Repeated database queries
- Unbounded result sets
- Sequential independent requests
- Repeated parsing or transformation
- Avoidable collection passes
- Recreating expensive clients inside repeated operations
- Fetching columns that are not used

Do not sacrifice readability for speculative optimisation.

Measure material performance changes where practical.

## Comments

Comments should explain:

- Why a non-obvious decision exists
- Why a security restriction is required
- Why an exception to the normal doctrine is necessary
- Why framework behaviour requires an unusual implementation

Do not use comments to repeat what the code already states.

Prefer clearer names and structure over explanatory comments.

## Testing Expectations

Tests must cover observable behaviour affected by a change.

Prioritise tests for:

- Authentication requirements
- Role restrictions
- Resource ownership
- Consultation state transitions
- Invalid request payloads
- Unauthenticated requests
- Forbidden operations
- Row-level security policies
- Error response contracts

Do not weaken an assertion merely to make a failing test pass.

Exact error-message assertions are required when the message is part of the public or user-facing contract.

For internal errors, prefer asserting:

- Error type
- Stable error code
- Relevant properties
- Stable message content

## Validation Commands

Use the narrowest relevant checks while developing.

Before considering a substantial change complete, run the applicable project checks:

```bash
npm run format:check
npm run typecheck
npm run lint
npm test
npm run test:rls
npm run build
```

When developing a narrow change, run the relevant targeted test first before running the broader suite.

Do not claim that checks passed unless they were actually run.

When a check cannot be run, state:

- Which check was not run
- Why it could not be run
- Which checks were successfully run
