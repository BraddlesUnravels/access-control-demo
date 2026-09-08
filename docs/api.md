# API Reference

This document describes the HTTP boundaries exposed by the Next.js application. Every route remains responsible for its own request validation and authorization; the outer access gate does not replace Supabase Auth, role checks, ownership checks, or PostgreSQL RLS.

## Access gate

### `POST /api/access/unlock`

Redeems an invite code and establishes the outer access-gate cookie.

Access requirements:

- No existing access-gate cookie is required.
- The request is rate-limited before JSON parsing or database work.
- The invite code is normalized and hashed server-side.
- Redemption uses the `redeem_access_invite` PostgreSQL function.

Responses:

- `200` — invite accepted and the signed `access_gate` cookie is set.
- `400` — malformed JSON or invalid request payload.
- `401` — no matching invite.
- `403` — invite expired or revoked.
- `429` — redemption rate limit exceeded; includes `Retry-After`.
- `500` — unexpected invite or RPC failure.

The response is `Cache-Control: no-store`.

## Health

### `GET /api/health`

Returns application health for Docker and Azure Container Apps probes.

This route is intentionally independent of the access gate and Supabase Auth. It must remain available when user authentication or Supabase is unavailable.

## Student consultations

All student consultation endpoints require:

- a valid access-gate cookie;
- an authenticated Supabase user;
- the `student` application role;
- database authorization through RLS.

### `GET /api/consultations`

Returns consultations owned by the authenticated student.

### `POST /api/consultations`

Creates a scheduled consultation. The owner is always derived from the authenticated user; client input cannot choose `student_user_id`.

Request fields:

```json
{
  "firstName": "Ada",
  "lastName": "Lovelace",
  "reason": "Consultation topic",
  "scheduledFor": "2026-09-05T10:00:00.000Z"
}
```

### `PATCH /api/consultations/:id`

Updates an owned consultation's supported scheduled date or lifecycle status.
Cancelled consultations cannot be modified. A scheduled date can be changed
only while the consultation is scheduled.

Supported status transitions are:

```text
scheduled -> completed
completed -> scheduled
scheduled/completed -> cancelled (via DELETE)
```

Cancellation is handled by `DELETE`, not by PATCH. The API and database both
enforce these lifecycle rules, so callers cannot bypass the UI by sending a
direct request. Cancelled consultations remain terminal and cannot be updated.

### `DELETE /api/consultations/:id`

Cancels an owned consultation by changing its status to `cancelled`. It does not delete the database row and is idempotent when already cancelled.

## Administrator consultations

### `GET /api/admin/consultations`

Requires a valid access-gate cookie, an authenticated Supabase user, and the `admin` application role.

Returns all consultations as read-only data. No administrator mutation endpoint exists.

## Demo accounts

### `GET /api/demo-accounts`

Returns the seeded demo-account choices used by the login experience. This is
demo-only application data, not a general account-management API. The route
requires a valid access-gate session, but does not require an authenticated
Supabase user. It does not return accounts to a visitor who has not passed the
outer access gate.

The endpoint must not be expanded to expose production credentials or used as a
replacement for Supabase account management.

## Authentication callbacks

### `/auth/confirm*`

The confirmation Route Handler processes Supabase email-confirmation and
password-recovery callbacks. It exchanges a confirmation `code` or verifies a
`token_hash`, then redirects to the appropriate authentication page.

These callback paths are explicit access-gate exceptions because Supabase must
be able to deliver the link before the visitor has an LMS session. They still
perform their own callback validation and do not grant an application role.

## Response validation and caching

The consultation client in `lib/consultations/api.ts` treats JSON responses as `unknown` and validates successful payloads with Valibot schemas before the data reaches React components.

Authenticated API responses are wrapped by `withApiHandler()` and default to:

```http
Cache-Control: private, no-store, max-age=0, must-revalidate
```

Route-specific cache policies are preserved when a handler sets a stricter policy.

## Access-gate request flow

For application routes other than the explicit public exceptions, the request passes through:

```text
HMAC cookie verification
    |
    v
One-hour process-local session cache
    |
    v
validate_access_gate_session() on cache miss/revalidation
    |
    v
Supabase session refresh
    |
    v
Route Handler or page authorization
```

The public exceptions are `/`, `/api/access/unlock`, `/api/health/*`,
`/auth/confirm`, and `/auth/confirm-email`. All other application routes require
a valid access-gate session before Supabase authentication or route-handler
authorization is evaluated. See [Access Control and API](access-control.md)
for the full redemption, cookie, and revalidation behavior.

The middleware check above is enforced again, independently, inside each protected Route Handler via `requireAccessGateSession()`/`hasValidAccessGateSession()` (`lib/access-gate/require-session.ts`). This defense-in-depth check re-verifies the signed cookie and re-checks the shared, database-backed session cache rather than trusting that the request already passed through the root proxy. It protects `/api/consultations`, `/api/consultations/:id`, `/api/admin/consultations`, `/api/demo-accounts`, and `/auth/confirm`, and runs before Supabase authentication (`requireAuthContext()`) in each handler.
