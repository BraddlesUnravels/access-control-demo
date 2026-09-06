# Access control

This project separates three boundaries that are easy to blur together if they are not documented clearly:

1. visitor access to the demo;
2. authenticated user identity;
3. authorization and resource ownership.

## Visitor access gate

The hosted demo sits behind an outer invite gate. This is a public-access control layer, not a user-identity layer.

A visitor can reach the app only after redeeming a valid invite from `POST /api/access/unlock`. The route:

- rate-limits attempts before parsing the request body;
- normalizes and hashes the code server-side;
- calls the PostgreSQL `redeem_access_invite` function;
- issues a signed `access_gate` cookie with an absolute expiry.

The root route is the gate entry point:

```text
/
```

Invite links are built as:

```text
/?code=ACD-XXXX-XXXX-XXXX
```

A valid cookie is required before a user can reach protected routes or authenticated APIs. Public routes remain available without one, including the health check and invite-redemption endpoint.

## Invite lifecycle

Invites are created with a duration of 1-30 days. The lifetime begins on first successful redemption, not at creation time.

The first successful redemption sets:

- `first_accessed_at`;
- `expires_at = first_accessed_at + access_duration_days`.

Subsequent re-entry during the same active window:

- creates another access record;
- increases use count;
- does not change the original lifetime; and
- does not extend the expiry.

A revoked invite cannot be redeemed again. The access cookie may still be checked locally, but protected requests also revalidate the session through the database and fail closed if the invite is rejected.

## Authentication and authorization

The app has two application roles:

| Role      | Access                                                |
| --------- | ----------------------------------------------------- |
| `student` | Read and mutate only their own consultations          |
| `admin`   | Read all student consultations but cannot mutate them |

These are enforced in both places:

- application layer: route handlers and server-side checks;
- database layer: PostgreSQL row-level security.

The UI may hide controls, but the UI is not the authorization boundary.

## Consultation lifecycle

Consultations support these states:

- `scheduled`
- `completed`
- `cancelled`

Students may:

- create a consultation;
- reschedule one;
- mark it `completed`;
- return it to `scheduled`;
- cancel it.

Cancelled consultations cannot be modified unless the project requirements change. Cancellation is a status transition, not a hard delete.

## Why the app uses defense in depth

The access-control model intentionally combines:

- invite gate validation;
- Supabase Auth session checks;
- app-level role/ownership checks;
- PostgreSQL RLS and RPC validation.

This makes the demo easy to review and makes the security boundaries explicit instead of implicit.
