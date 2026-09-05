---
applyTo: 'supabase/**/*.{sql,toml}'
---

# Supabase, PostgreSQL, and Row-Level Security Instructions

Apply these instructions whenever writing or modifying Supabase configuration, PostgreSQL schema, migrations, seed data, or row-level security tests.

## Database Purpose

The database is an independent authorization boundary.

PostgreSQL row-level security must enforce protected data access even if:

- A route handler is misconfigured
- The user interface exposes an incorrect action
- An application-level ownership check is omitted
- A request bypasses the intended interface

Do not treat application-level authorization as a replacement for database policies.

## Source of Truth

Executable migrations are the source of truth for database changes.

When changing the schema:

- Add a migration.
- Keep `schema.sql` consistent when the repository uses it as a consolidated reference.
- Update generated database types when required.
- Update RLS tests.
- Update seed data only when the change affects local demonstration data.
- Update the README when setup or visible behaviour changes.

Do not edit only the generated or consolidated schema without creating the corresponding migration.

## Migration Rules

Each migration should:

- Have one clear purpose.
- Be deterministic.
- Be safe to apply in the expected environment.
- Preserve existing data unless destructive behaviour is explicitly required.
- Include related policy changes when schema changes affect authorization.
- Use names that describe the database change.

Avoid mixing unrelated schema changes in one migration.

Do not rewrite existing applied migrations merely to make history cleaner.

Add a new migration instead.

## Tables

The primary application tables are:

```text
public.profiles
public.consultations
```

The `profiles.id` value corresponds to the authenticated Supabase user ID.

The `consultations.student_user_id` value identifies the student who owns the consultation.

Preserve referential integrity between authentication users, profiles, and consultations.

## Roles

Supported application roles are:

```text
student
admin
```

Do not introduce additional role values without updating:

- Database constraints
- Application types
- Route authorization
- RLS policies
- Seed data
- Tests
- Documentation

Role values must remain consistent across the database and TypeScript application.

## Consultation Status

Supported statuses are:

```text
scheduled
completed
cancelled
```

Do not introduce another status without updating:

- Database constraints
- Application types
- Route validation
- State-transition logic
- RLS tests
- Unit tests
- Documentation

Cancellation is a status transition, not a physical deletion.

## Row-Level Security

Enable row-level security on protected application tables.

Policies must be explicit about:

- Which role may perform the operation
- Which rows are visible
- Which rows may be inserted
- Which rows may be updated
- Which values are permitted after an update

Use both `USING` and `WITH CHECK` where required.

Remember:

- `USING` controls which existing rows may be selected, updated, or deleted.
- `WITH CHECK` controls which new row values may be inserted or produced by an update.

Do not assume a `USING` expression automatically protects new values after an update.

## Student Policies

Student policies must enforce that students can access only their own consultations.

Ownership should be based on the authenticated user ID:

```sql
student_user_id = auth.uid()
```

Students may:

- Select their own consultations
- Insert consultations for themselves
- Update their own consultations

Students must not:

- Select another student's consultations
- Insert a consultation for another user
- Change `student_user_id` to another user
- Update another student's consultation
- Physically delete consultations

Insert policies must enforce both ownership and the student role. For example, require `(select auth.uid()) = student_user_id` and `(select private.has_role('student'))`.

Update policies must protect both:

- The ownership of the existing row
- The ownership of the resulting row

## Administrator Policies

Administrators may read consultations belonging to all students.

Administrator access is read-only.

Administrators must not be permitted to:

- Insert consultations
- Update consultations
- Delete consultations

Do not create broad administrator write policies.

Do not assume the name `admin` implies unrestricted database access.

The project deliberately demonstrates broad read access without write access.

## Delete Policies

Authenticated application users must not physically delete consultation rows.

Do not add authenticated delete policies for consultations.

Cancellation must be represented by updating:

- `status`
- `cancelled_at`
- Related lifecycle metadata when required

If a destructive cleanup operation is ever required, keep it outside ordinary authenticated application access and document it explicitly.

## Ownership Integrity

Prevent ownership reassignment through updates.

An authenticated student must not be able to change:

```text
student_user_id
```

from their own user ID to another user ID.

Use appropriate:

- RLS `WITH CHECK` expressions
- Foreign keys
- Constraints
- Triggers only when simpler constraints and policies cannot express the rule

Do not rely solely on route-handler validation.

## Constraints

Use database constraints for stable data invariants.

Appropriate constraints include:

- Required columns
- Foreign keys
- Valid role values
- Valid consultation status values
- Timestamp or field relationships when they are stable and enforceable

Do not duplicate complex application workflows in constraints when doing so would make behaviour opaque.

Use the database to enforce durable invariants, not every presentation-level validation rule.

## SQL Style

Use readable SQL with:

- Lowercase SQL keywords unless existing repository style differs
- Descriptive policy and constraint names
- One logical condition per line where helpful
- Explicit schema qualification for application tables
- Clear separation between schema changes and policy definitions

Prefer:

```sql
create policy "Students can read their own consultations"
on public.consultations
for select
to authenticated
using (
  student_user_id = auth.uid()
);
```

Avoid compressed policies that are difficult to inspect.

## Security Definer Functions

Avoid `security definer` functions unless they are necessary.

When one is required:

- Keep its purpose narrow.
- Set a safe `search_path`.
- Revoke unnecessary execution permissions.
- Validate all inputs.
- Do not use it to bypass RLS casually.
- Add explicit tests for its authorization behaviour.
- Document why ordinary policies were insufficient.

Prefer direct RLS policies where they can express the rule clearly.

## Seed Data

Seed data is for local demonstration and testing only.

Seed users include:

```text
student1@lms.com
student2@lms.com
admin@lms.com
```

Do not treat demonstration credentials as production credentials.

Seed data should:

- Be deterministic
- Preserve role distinctions
- Include consultations owned by different students
- Allow ownership isolation to be demonstrated
- Allow administrator read-only access to be demonstrated

Do not include real personal information, production secrets, or reusable credentials.

## Generated Types

After schema changes, regenerate TypeScript database types when required:

```bash
npm run db:types
```

Review generated changes.

Do not manually edit generated database type files unless the generation workflow explicitly requires it.

Application code must not assume schema changes are available until generated types and migrations agree.

## Row-Level Security Tests

Every RLS change must include or update tests in:

```text
supabase/tests/rls_checks.sql
```

Tests must cover both allowed and denied behaviour.

Required student cases include:

- A student can select their own consultations.
- A student cannot select another student's consultations.
- A student can insert a consultation for their own account.
- A student cannot insert a consultation for another account.
- A student can update their own consultation.
- A student cannot update another student's consultation.
- A student cannot reassign ownership.
- A student cannot physically delete a consultation.

Required administrator cases include:

- An administrator can select consultations belonging to all students.
- An administrator cannot insert consultations.
- An administrator cannot update consultations.
- An administrator cannot delete consultations.

Required unauthenticated cases include:

- An unauthenticated user cannot access protected consultation rows.

## Testing Denied Operations

A denied operation must be tested explicitly.

Do not infer denial merely because an allowed-operation test returned limited rows.

For example, separately test:

- Cross-user selection
- Cross-user update
- Ownership reassignment
- Administrator insertion
- Administrator update
- Physical deletion

Tests should fail clearly when a policy becomes too permissive.

## Authentication Context in SQL Tests

When simulating authenticated users:

- Set the authenticated user ID explicitly.
- Set the expected role context explicitly.
- Reset the context between scenarios.
- Avoid leaking one test user's claims into another test.
- Use deterministic user IDs.

Do not rely on test execution order to establish authentication state.

## Defense-in-Depth Consistency

When route authorization changes, review the corresponding RLS policy.

When an RLS policy changes, review the corresponding route authorization.

The two layers do not need identical implementation details, but they must enforce compatible access rules.

Do not create a route permission that the database always denies.

Do not create a database permission that the application intentionally forbids without documenting why the difference is required.

## Performance

Add indexes for common authorization and lookup paths when justified.

Likely lookup fields include:

```text
consultations.student_user_id
consultations.id
consultations.status
consultations.scheduled_for
profiles.id
profiles.role
```

Do not add indexes speculatively.

Consider:

- Query frequency
- Table size
- Selectivity
- Write overhead
- Existing primary-key and foreign-key indexes

Use query plans when evaluating material database performance changes.

## Validation Commands

After database, migration, seed, or policy changes, run the applicable commands:

```bash
npm run infra:reset
npm run db:types
npm run test:db
npm run typecheck
npm test
npm run build
```

Use `npm run infra:reset` only when resetting the local database is appropriate.

Do not claim an RLS policy is correct unless the relevant RLS tests were run.

When a command cannot be run, state which command was skipped and why.
