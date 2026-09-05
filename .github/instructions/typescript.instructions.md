---
applyTo: '**/*.{ts,tsx}'
---

# TypeScript and Next.js Instructions

Apply these instructions whenever writing or modifying TypeScript or TSX.

## TypeScript Style

Prefer code that is easy to scan and has consistent shapes.

- Use descriptive names.
- Keep functions focused.
- Use guard clauses for invalid or unsupported states.
- Separate validation, authorization, persistence, and response construction into readable blocks.
- Avoid nested ternaries.
- Avoid clever expressions that conceal business or security behaviour.
- Avoid boolean parameters when a named option or separate function is clearer.
- Do not introduce classes unless framework or library integration makes them appropriate.
- Prefer functions and plain objects for application code.

Use exported arrow functions for ordinary module operations:

```ts
export const getConsultations = async () => {
  // ...
};
```

Use default exports where required or conventional for Next.js and configuration files.

## Type Definitions

Use string literal unions for closed sets:

```ts
export type UserRole = 'student' | 'admin';

export type ConsultationStatus = 'scheduled' | 'completed' | 'cancelled';
```

Do not use TypeScript enums.

Prefer explicit types at module and framework boundaries, including:

- Route request payloads
- Route response bodies
- Authentication context
- Database mapping boundaries
- Shared component props
- Reusable exported functions

Allow TypeScript to infer straightforward local implementation details.

Do not create generic types until there is a real repeated relationship between types.

Do not create generic abstractions solely because two functions have superficially similar shapes.

## Nullability

Prefer `undefined` for optional values within application code.

At Supabase/database boundaries, preserve `null` when it represents SQL `NULL`. For example, clearing `completed_at` requires writing `null`; `undefined` may omit the field instead of updating it.

Do not hide database nullability with unsafe assertions.

Convert nullable database values at an explicit mapping boundary when the application benefits from an `undefined`-based shape.

## External Data

Treat the following as untrusted until validated or narrowed:

- Request bodies
- URL parameters
- Search parameters
- Form data
- Supabase responses
- Authentication metadata
- Environment variables
- Values from external libraries typed as `unknown`

Do not cast request data directly into the desired type.

Validate external data before use.

Prefer `unknown` over `any`.

Do not use an assertion such as `as SomeType` to replace runtime validation.

## Type Assertions

Use type assertions only when:

- Runtime behaviour guarantees the type
- TypeScript cannot represent the guarantee
- The assertion is local and narrow
- The reason is clear from the surrounding code

Do not use assertions to silence unresolved type errors.

Avoid double assertions such as:

```ts
value as unknown as SomeType;
```

Use one only when an external library boundary makes it unavoidable and document the reason.

## Imports

Use one import block with no blank lines.

Order imports as:

1. External dependencies
2. Internal aliases
3. Relative modules

Import from public surfaces when available.

Do not reach into another module's internal path to bypass its intended API.

Use type-only imports when an import is used only as a type:

```ts
import type { Consultation } from '@/types/consultation';
```

## Functions

Prefer small, intention-focused functions.

A function should normally perform one meaningful operation or coordinate a small sequence of closely related operations.

Extract a helper when it:

- Names meaningful behaviour
- Removes genuine duplication
- Isolates a side effect
- Represents a security decision
- Makes behaviour easier to test

Do not extract a helper only to reduce line count.

Avoid vague names such as:

- `handleData`
- `processItem`
- `doRequest`
- `manageState`
- `executeAction`

Use names that describe the specific operation.

## Control Flow

Use guard clauses for:

- Missing authentication
- Incorrect roles
- Invalid input
- Missing resources
- Ownership failures
- Unsupported state transitions
- Failed external operations

Prefer:

```ts
if (!user) {
  throw new Error('Authenticated user is required.');
}

if (user.role !== 'student') {
  throw new Error('Student access is required.');
}

return performOperation();
```

Avoid:

```ts
if (user) {
  if (user.role === 'student') {
    return performOperation();
  }
}
```

Do not add `else` after a branch that returns, throws, or otherwise exits.

## Asynchronous Code

Prefer `async` and `await`.

Avoid promise chains when sequential code is clearer.

Prefer:

```ts
const user = await getAuthenticatedUser();
const consultations = await getConsultations(user.id);
```

Avoid:

```ts
return getAuthenticatedUser().then((user) => {
  return getConsultations(user.id);
});
```

Run independent operations concurrently when safe:

```ts
const [profile, consultations] = await Promise.all([
  getProfile(userId),
  getConsultations(userId),
]);
```

Do not run operations concurrently when:

- One depends on another
- Ordering is important
- Partial execution could leave inconsistent state
- One operation determines whether another is authorized

## Collections

Prefer:

- `map` for one-to-one transformation
- `filter` for selection
- `find` for locating one item
- `some` for existence checks
- `every` for universal checks

Use a loop when it improves readability or avoids unnecessary passes.

Use `reduce` only when accumulation is the clearest representation.

Do not use `reduce` for simple mapping, filtering, or lookup operations.

## Next.js Components

Keep server and client responsibilities explicit.

- Do not add `"use client"` unless the component requires client-side state, effects, browser APIs, or event handlers.
- Keep server-compatible components as server components.
- Do not move authorization into a client component.
- Do not expose server-only clients, keys, or logic to browser bundles.
- Keep role-sensitive navigation and rendering consistent with server-side authorization.
- Treat hidden UI actions as usability behaviour, not access control.

Use Next.js conventions directly instead of wrapping them in unnecessary abstractions.

## Client Components

A client component is appropriate when it requires:

- React state
- React effects
- Browser APIs
- Client-side event handlers
- Interactive form behaviour
- Optimistic UI behaviour

Keep client components focused on interaction and presentation.

Do not place the following inside client components:

- Service-role credentials
- Server-only Supabase clients
- Database access
- Trusted authorization decisions
- Secret environment variables

## Server Components

Use server components for:

- Server-side data retrieval
- Initial authenticated rendering
- Role-aware server rendering
- Non-interactive presentation
- Work that requires server-only dependencies

Do not convert a server component into a client component merely to simplify data flow.

Prefer passing serializable data from server components into focused client components.

## Route Handlers

Next.js route handlers are security boundaries.

For a protected route, use a readable sequence:

1. Resolve authentication
2. Resolve and enforce the required role
3. Validate route parameters or request data
4. Enforce resource ownership or state rules
5. Perform the database operation
6. Return the HTTP response

Keep this control flow explicit and flat.

Example shape:

```ts
export const GET = async () => {
  const auth = await requireAuthenticatedUser();

  if (auth.profile.role !== 'student') {
    return Response.json(
      { message: 'Student access is required.' },
      { status: 403 },
    );
  }

  const consultations = await getOwnedConsultations(auth.user.id);

  return Response.json({ consultations });
};
```

Do not hide important authorization decisions inside generic request wrappers.

Shared authentication and role helpers are appropriate when they make the security boundary clearer.

## Authentication

Use the server-side Supabase client to resolve the current user.

Do not trust:

- Client-provided user IDs
- Client-provided roles
- Request-body ownership fields
- Browser state as proof of authentication
- Unverified authentication metadata

Resolve the authenticated user from the trusted server-side session.

Resolve the application role from the trusted application profile.

Do not infer administrative access from an email address or UI route.

## Ownership

Student-owned consultation operations must be scoped using the authenticated user ID.

For reads or mutations of one consultation, prefer a query equivalent to:

```ts
.eq("id", consultationId)
.eq("student_user_id", authenticatedUserId)
```

Do not trust a `studentUserId` supplied in the request body.

For consultation creation, assign ownership from the authenticated user:

```ts
const consultation = {
  student_user_id: authenticatedUser.id,
  first_name: input.firstName,
  last_name: input.lastName,
  reason: input.reason,
  scheduled_for: input.scheduledFor,
};
```

Do not allow the client to choose the owner.

## Administrator Access

Administrator routes must explicitly require the `admin` role.

Administrator consultation access is read-only.

Do not add administrator mutation handlers or reuse student mutation handlers for administrators.

Do not grant administrators broader database permissions merely because they have broader read access.

## Request Validation

Validate all mutation payloads before database operations.

Validation must cover required fields and domain rules, including:

- `firstName`
- `lastName`
- `reason`
- `scheduledFor`
- Supported status transitions
- Route identifiers

Reject:

- Missing required values
- Incorrect value types
- Invalid dates
- Unsupported status values
- Unsupported actions
- Unexpected ownership fields when they create ambiguity

Keep validation messages sentence case and human readable.

Do not rely only on TypeScript types for runtime request validation.

## HTTP Responses

Use HTTP statuses consistently.

Expected mappings include:

- `200 OK` for successful reads or idempotent updates
- `201 Created` for successful creation
- `400 Bad Request` for invalid request data
- `401 Unauthorized` when authentication is missing
- `403 Forbidden` when the authenticated role is not permitted
- `404 Not Found` when an accessible resource does not exist
- `409 Conflict` when a state transition conflicts with current state
- `500 Internal Server Error` for unexpected failures

Do not expose raw Supabase or PostgreSQL error messages to clients.

Use a consistent response shape within the repository.

Prefer clear messages:

```json
{
  "message": "Consultation not found."
}
```

Avoid vague messages:

```json
{
  "error": "Something went wrong"
}
```

## Error Handling

Catch errors at route boundaries when converting them into HTTP responses.

Do not catch errors solely to log and rethrow them.

Do not return stack traces, SQL text, internal table names, or authentication details.

When an unexpected error occurs:

- Log the internal error at the server boundary
- Return a safe client-facing message
- Preserve the original error for server diagnostics

## Consultation State Changes

Supported consultation states are:

```ts
export type ConsultationStatus = 'scheduled' | 'completed' | 'cancelled';
```

Preserve these state rules:

- New consultations begin as `scheduled`.
- Scheduled consultations may become `completed`.
- Completed consultations may return to `scheduled`.
- Scheduled or completed consultations may become `cancelled`.
- Cancelled consultations cannot be modified.
- Cancelling an already cancelled consultation is idempotent.

When marking a consultation completed:

- Set the status to `completed`.
- Set `completed_at`.
- Clear incompatible cancellation metadata when required by the schema.

When returning a consultation to scheduled:

- Set the status to `scheduled`.
- Clear `completed_at`.

When cancelling a consultation:

- Set the status to `cancelled`.
- Set `cancelled_at`.
- Do not physically delete the row.

## Supabase Queries

Select only required columns where practical.

Prefer:

```ts
.select("id, first_name, last_name, reason, scheduled_for, status")
```

over:

```ts
.select("*")
```

unless all fields are intentionally required.

Always inspect the Supabase error result.

Do not assume a missing data value is equivalent to a successful empty result.

Keep ownership and role restrictions in the query where possible.

## Environment Variables

Access environment variables through server-safe boundaries.

Do not expose server-only values using the `NEXT_PUBLIC_` prefix.

Validate required environment variables before use.

Throw a clear startup or configuration error when required values are missing.

## Components

Keep components focused.

Separate a component when it:

- Encapsulates meaningful reusable UI
- Owns a focused interaction
- Makes role-specific behaviour clearer
- Reduces substantial duplication

Do not split a component merely because it has reached an arbitrary line count.

Use descriptive prop names.

Avoid passing large generic objects when a component requires only a small set of fields.

## Accessibility

Interactive elements must:

- Use semantic HTML
- Have accessible names
- Be keyboard usable
- Communicate disabled states
- Communicate loading states
- Associate labels with inputs
- Expose validation errors meaningfully

Do not use a visual-only element as a button.

Use native elements before adding custom keyboard behaviour.
