# Security architecture

This document explains the layered security model and the architectural decisions that keep the layers independent. It is the security-focused companion to [architecture.md](architecture.md), [access-control.md](access-control.md), and [api.md](api.md).

## Security goals

The application is a small learning-management system with an invite-gated hosted demo. Its security goals are:

- keep unauthenticated visitors outside the hosted demo unless they have a valid invite;
- keep invite access separate from user identity;
- require authentication before accessing student or administrator data;
- enforce role and ownership rules on the server;
- enforce the same important data restrictions independently in PostgreSQL;
- prevent client code, mutable cookies, or client-provided ownership fields from becoming authorization boundaries; and
- fail closed when a dependency or response violates its expected contract.

The design favors visible, reviewable boundaries over a generalized authorization framework. The domain is intentionally small so the authorization rules can remain explicit in route handlers, database policies, and tests.

## Trust boundaries

The system has four identities or trust levels:

| Boundary                    | What it represents                             | What it may be trusted to do                                              |
| --------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------- |
| Browser                     | Untrusted user-controlled code and requests    | Present UI and send requests; never trusted for authorization             |
| Access-gate visitor         | A caller with a valid signed invite cookie     | Pass the outer demo-access gate while the invite session remains valid    |
| Authenticated Supabase user | A caller with a valid Supabase session         | Be identified by `auth.uid()`; still subject to role and ownership checks |
| Server and database         | Trusted application and persistence boundaries | Validate, authorize, mutate, and enforce policy                           |

An access-gate cookie proves temporary access to the hosted demo. It does not identify a user, grant a role, or grant ownership of a consultation. A Supabase session identifies a user, but it does not by itself grant administrator access or access to another student's records.

## Layered request model

```text
                           untrusted input
Browser ----------------------------------------------------+
  |                                                         |
  |  access_gate cookie                                     | request body,
  v                                                         | cookies, URLs
Next.js proxy                                               |
  |                                                         |
  +--> signed access-gate validation                        |
  +--> Supabase SSR session refresh                         |
  |                                                         |
  v                                                         |
Next.js route handler <-------------------------------------+
  |
  +--> request validation
  +--> authentication check
  +--> application-role check
  +--> ownership and state-transition check
  |
  v
Supabase client
  |
  v
PostgreSQL
  +--> SECURITY DEFINER RPC validation where required
  +--> auth.uid()-based role and ownership checks
  +--> row-level security policies
```

Each layer performs a different job. Passing one layer is not treated as proof that all later checks can be skipped.

## Layer 1: visitor access gate

The access gate controls entry to the hosted demo. It is intentionally separate from Supabase Auth because a visitor may need access to the application before they have an application account.

The unlock flow is:

1. The caller sends an invite code to `POST /api/access/unlock`.
2. The route applies rate limiting before parsing the request body.
3. The server validates and normalizes the code.
4. The server hashes the code with `ACCESS_GATE_CODE_SECRET`; the plaintext code is not sent to PostgreSQL.
5. PostgreSQL executes `redeem_access_invite(p_code_hash)` and applies invite validity, revocation, expiry, and visit rules.
6. The server issues a signed `access_gate` cookie with an absolute expiry.
7. The proxy validates that cookie on subsequent protected requests and revalidates the gate session through the database.

The public health endpoint and invite-redemption endpoint remain reachable without an existing gate cookie. That is necessary for deployment health checks and for the gate entry point itself. Public availability does not imply access to protected application data.

### Why the gate is server-side

The browser can display an invite form, but it cannot be trusted to validate an invite or mint a cookie. Keeping hashing, RPC invocation, and cookie signing on the server prevents the browser from choosing the accepted hash, expiry, or cookie contents.

The database redemption function is a `SECURITY DEFINER` function because anonymous and authenticated callers need to redeem an invite without direct table access. Its input and privileges are deliberately narrow, and its behavior is covered by database security tests.

## Layer 2: authentication

Supabase Auth establishes the identity of the caller. Authentication is handled through server-only entry points and refreshed by the Next.js proxy for requests that pass the access gate.

Authentication answers:

> Which user is making this request?

It does not answer:

- whether the user has the required application role;
- whether the user owns the requested consultation; or
- whether the requested lifecycle transition is allowed.

Those decisions are made by later layers.

## Layer 3: application authorization

Protected route handlers repeat the security decisions at the application boundary. They enforce:

- authentication;
- the required application role (`student` or `admin`);
- ownership of student resources;
- request shape and field validity;
- supported consultation state transitions; and
- appropriate HTTP response behavior.

Student operations use both the consultation identifier and the authenticated user identity when addressing an individual consultation. Client-provided ownership values are not accepted as authority.

Administrators have read-only access to all consultations. Administrator access is not a reason to reuse student mutation endpoints, and the application does not provide administrator create, update, cancel, or delete behavior.

### Why route handlers check authorization when RLS also exists

Route handlers are the HTTP security boundary. They can reject malformed requests, distinguish authentication from authorization failures, enforce workflow rules, and return stable public responses. They also make the intended behavior easy to test without relying only on database behavior.

The route checks are not considered sufficient on their own. A future route, query, or implementation mistake must not turn a client-controlled request into unrestricted database access.

## Layer 4: database authorization

PostgreSQL is the final independent enforcement layer. Row-level security is enabled on protected tables, and policies derive identity from `auth.uid()` rather than from request-body fields.

The consultation rules are:

| Operation      | Database rule                                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Student select | The authenticated user may read consultations where `student_user_id = auth.uid()`                                      |
| Admin select   | An authenticated user with the `admin` role may read all consultations                                                  |
| Student insert | The authenticated user must have the `student` role and own the inserted row                                            |
| Student update | The authenticated user must have the `student` role and own the row                                                     |
| Delete         | Application cancellation is a status transition; authenticated application flows do not physically delete consultations |

Role checks use the database profile associated with the authenticated user. Security-definer helper functions use a controlled search path and are tested for their intended privileges.

The access-invite and access-visit tables are also protected from direct ordinary access. The invite RPC performs the controlled read/write operation needed for redemption, while gate-session validation provides a separate database-backed check for an existing invite visit.

### Why RLS is independent of route authorization

RLS protects the data even when access occurs through a different server path, a future endpoint, a debugging mistake, or a compromised application assumption. The overlap with route-handler checks is deliberate defense in depth, not duplicated accidental logic.

## Security invariants

The following properties must remain true regardless of which UI control is visible:

1. A visitor cannot reach protected routes without a valid access-gate session.
2. A valid access-gate session does not create or imply a user identity.
3. An authenticated student can access only their own consultations.
4. A student cannot elevate their role by changing request data.
5. An administrator can read consultations but cannot use administrator access to mutate them through the application.
6. Database policies independently reject rows and mutations outside the caller's authority.
7. Cancelled consultations remain records and cannot be modified through normal student operations.
8. Invite redemption does not expose plaintext invite codes to the database.
9. Secret values remain server-side and are not sent to browser code.
10. Unexpected dependency results produce safe application errors rather than exposing infrastructure details or continuing with invalid data.

## Architectural decisions

### Keep the authorization layers explicit

The project does not introduce a generic policy engine or a broad service/repository layer. The domain has only two roles and a small number of resources, so explicit checks in route handlers and SQL policies are easier to audit than indirection.

A new abstraction becomes worthwhile only when it defines a real security boundary, removes meaningful repeated logic, or supports a more complex workflow.

### Keep the UI outside the security model

The UI may hide unavailable actions to improve usability, but it never determines whether an operation is permitted. Every protected operation is checked again by the route handler and, where data access is involved, by PostgreSQL.

### Use a signed cookie for the outer gate, not for authorization

The cookie is suitable for a short-lived visitor-access assertion because it is signed, server-issued, and checked against database state. It is deliberately not used as a replacement for Supabase Auth or application roles. This prevents the visitor-access mechanism from becoming an alternate identity system.

### Prefer immutable deployment image references

Production deployment uses an image tagged with the commit SHA. The mutable `latest` tag is published only after deployment and the real application's health endpoint succeed. Azure therefore deploys a stable, auditable image reference, while `latest` remains a convenience pointer for subsequent consumers.

### Validate at external boundaries

Supabase responses, request bodies, API responses, cookies, and environment values are treated as external data. Runtime validation is kept separate from TypeScript types because compile-time types do not validate network responses or database behavior.

## Failure behavior

Security failures should fail closed:

- missing or invalid access-gate cookies are rejected;
- missing sessions produce unauthenticated responses;
- wrong roles produce forbidden responses;
- resources outside the caller's ownership scope are unavailable;
- invalid state transitions are rejected;
- malformed successful database responses become safe server errors; and
- internal database or authentication details are logged only at the server boundary and are not returned to clients.

The API layer documents the public status and response contracts in [api.md](api.md).

## Verification and evidence

The layered model is verified at several levels:

- route tests cover authentication, roles, ownership, validation, lifecycle transitions, and safe error responses;
- database tests verify RLS, function privileges, invite lifecycle rules, and role boundaries;
- container-stage tests exercise the assembled production image against a real disposable Supabase instance; and
- production workflow checks validate the image, Azure bootstrap resources, deployment, and the deployed `/api/health` endpoint.

When changing an authorization rule, update the route-level and database-level tests together. A passing UI test is not evidence that the authorization boundary is protected.

## Related documentation

- [Architecture](architecture.md) for the compact request-flow overview.
- [Access control](access-control.md) for invite, role, ownership, and consultation behavior.
- [API reference](api.md) for public HTTP contracts.
- [Secrets management](secrets-management.md) for secret trust boundaries and rotation.
- [Deployment](deployment.md) for Azure, Key Vault, managed identity, and OIDC details.
- [Testing](testing.md) for test layers and commands.
