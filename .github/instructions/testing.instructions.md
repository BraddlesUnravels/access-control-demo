---
applyTo: '**/*.{test,spec}.{ts,tsx}'
---

# Testing Instructions

Apply these instructions whenever writing or modifying automated TypeScript tests.

## Testing Principles

Tests must describe observable behaviour.

Prioritise:

1. Security behaviour
2. Public contracts
3. Domain behaviour
4. Error handling
5. Important edge cases
6. Implementation details only when unavoidable

Do not test private implementation details when the same behaviour can be verified through a public boundary.

## Test Structure

Tests should mirror the source structure.

Examples:

```text
lib/server/auth.ts
test/lib/server/auth.test.ts
```

```text
app/api/consultations/route.ts
test/app/api/consultations/route.test.ts
```

Follow the repository's existing test directory conventions when they differ.

Keep related tests together under clear `describe` blocks.

Use behaviour-focused test names.

Prefer:

```ts
it('rejects unauthenticated requests with 401', async () => {
  // ...
});
```

Avoid:

```ts
it('works', async () => {
  // ...
});
```

## Arrange, Act, Assert

Structure tests into clear phases:

```ts
it('returns only consultations owned by the authenticated student', async () => {
  const student = createStudent();
  const ownedConsultation = createConsultation({
    studentUserId: student.id,
  });
  const otherConsultation = createConsultation();

  const response = await requestConsultations(student);

  expect(response.status).toBe(200);
  expect(response.body.consultations).toEqual([ownedConsultation]);
  expect(response.body.consultations).not.toContain(otherConsultation);
});
```

Blank lines may separate arrange, act, and assert sections.

Comments such as `Arrange`, `Act`, and `Assert` are unnecessary when the structure is already obvious.

## Test Isolation

Each test must be independent.

- Do not depend on test execution order.
- Reset mocks between tests.
- Restore replaced globals.
- Use fresh test data.
- Avoid shared mutable state.
- Clean up database records or transactions when required.
- Do not depend on local seed state unless the test is explicitly an integration or demonstration test.

Use deterministic values.

Avoid current timestamps unless time is controlled.

## Exact Assertions

Assert exact values when they are part of a stable contract.

For public error responses, assert:

- HTTP status
- Response shape
- Exact message when message stability is intentional

Example:

```ts
expect(response.status).toBe(403);
expect(await response.json()).toEqual({
  message: 'Administrator access is required.',
});
```

For thrown public errors:

```ts
await expect(operation()).rejects.toThrow('Authenticated user is required.');
```

For internal errors whose wording is not a public contract, prefer asserting:

- Error class
- Error code
- Relevant fields
- Stable message content

Do not assert only that an operation throws when the error identity matters.

Avoid:

```ts
await expect(operation()).rejects.toThrow();
```

Prefer:

```ts
await expect(operation()).rejects.toThrow(
  'Consultation cannot be modified after cancellation.',
);
```

## Authentication Tests

Protected route tests should cover:

- Missing authentication
- Valid student authentication
- Valid administrator authentication
- Missing application profile
- Incorrect role
- Session resolution failure when relevant

Do not mock authentication so broadly that role and ownership behaviour are bypassed.

## Authorization Tests

Student route tests should cover:

- Students can access their permitted endpoints.
- Administrators cannot use student-only endpoints.
- Students cannot use administrator endpoints.
- Students can retrieve only their own consultations.
- Students cannot update another student's consultation.
- Students cannot cancel another student's consultation.
- Client-provided ownership values are ignored or rejected.
- Ownership is derived from the authenticated user.

Administrator route tests should cover:

- Administrators can read all consultations.
- Students cannot access administrator endpoints.
- Administrator access remains read-only.
- Administrator mutation behaviour is not introduced accidentally.

## Consultation Lifecycle Tests

Test each supported state transition.

Required cases include:

- Creation begins in `scheduled`.
- Scheduled consultations can be rescheduled.
- Scheduled consultations can become `completed`.
- Completed consultations can return to `scheduled`.
- Scheduled consultations can become `cancelled`.
- Completed consultations can become `cancelled`.
- Cancelled consultations cannot be rescheduled.
- Cancelled consultations cannot be completed.
- Repeated cancellation is idempotent.
- Cancellation does not physically delete the row.

Assert related timestamps where relevant:

- `completed_at`
- `cancelled_at`
- `updated_at`

Use controlled timestamps when exact values matter.

## Request Validation Tests

Mutation route tests should cover:

- Missing required fields
- Empty strings
- Incorrect field types
- Invalid dates
- Invalid consultation IDs
- Unsupported status values
- Unsupported actions
- Unexpected ownership fields
- Valid payloads

Assert that invalid requests do not perform database mutations.

## HTTP Contract Tests

For route handlers, assert:

- HTTP status
- Response body
- Relevant response headers when part of the contract
- Database or dependency calls
- Absence of unauthorized database calls

Expected security statuses include:

- `401` for unauthenticated requests
- `403` for authenticated users with the wrong role
- `404` for resources unavailable within the authenticated user's scope
- `409` for invalid state transitions when conflict semantics are used

Do not expose raw database errors in expected response bodies.

## Mocking

Mock only external boundaries or expensive dependencies.

Appropriate mock targets include:

- Supabase clients
- Authentication session resolution
- Time
- Network operations
- Environment-dependent behaviour

Avoid mocking the unit's own internal implementation.

Prefer typed mocks.

Reset mocks between tests:

```ts
beforeEach(() => {
  vi.clearAllMocks();
});
```

Use `vi.restoreAllMocks()` when replacing real implementations or globals.

## Database Call Assertions

When testing ownership-sensitive behaviour, assert that database queries include the authenticated user ID.

For example, verify the equivalent of:

```ts
.eq("id", consultationId)
.eq("student_user_id", authenticatedUserId)
```

Do not limit the test to checking that a query occurred.

Verify that the query was scoped correctly.

## Failure Tests

When a dependency fails:

- Assert the expected safe public response.
- Assert that internal details are not returned.
- Assert logging only when logging is part of the boundary's responsibility.
- Assert that no later mutation occurs after the failure.
- Assert that errors are not logged repeatedly across layers.

## Test Data

Use factory functions when they improve readability and consistency.

Prefer:

```ts
const consultation = createConsultation({
  status: 'cancelled',
});
```

over repeated large object literals.

Factories should:

- Provide valid defaults
- Allow narrow overrides
- Avoid hidden mutable state
- Return fresh values
- Use deterministic identifiers and timestamps

Do not create a generic test factory framework for a small number of simple values.

## Test Coverage Boundaries

Focus coverage on meaningful behaviour rather than achieving a percentage through low-value assertions.

High-priority boundaries include:

- Authentication
- Role resolution
- Ownership enforcement
- Route handlers
- State transitions
- Validation
- Safe error responses
- RLS policies

Snapshot tests should not replace explicit assertions for security-sensitive behaviour.

## Running Tests

Run the narrowest relevant test while developing.

Examples:

```bash
npm test -- auth.test.ts
```

```bash
npm test -- consultations
```

Before considering a substantial change complete, run:

```bash
npm test
npm run test:rls
```

Run the complete repository quality checks when appropriate:

```bash
npm run format:check
npm run typecheck
npm run lint
npm test
npm run test:rls
npm run build
```

Do not state that a test passed unless it was actually executed.
