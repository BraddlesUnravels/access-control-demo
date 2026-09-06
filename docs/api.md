# API reference

This document summarizes the app's public HTTP boundaries. Each protected route still performs its own validation and authorization; the docs below are a quick contract reference, not a substitute for the middleware and handler logic.

## Public routes

| Route                | Method | Purpose                                           |
| -------------------- | ------ | ------------------------------------------------- |
| `/api/health`        | `GET`  | Health probe for Docker and Azure checks          |
| `/api/access/unlock` | `POST` | Redeem an invite and set the `access_gate` cookie |

### `POST /api/access/unlock`

- No existing access cookie is required.
- The request is rate-limited before JSON parsing.
- The invite code is normalized and hashed server-side.
- A successful redemption creates an access record and sets a signed cookie.

Typical responses:

- `200` — invite accepted and cookie issued
- `400` — malformed JSON or invalid payload
- `401` — no matching invite
- `403` — invite expired or revoked
- `429` — rate-limited
- `500` — unexpected failure

## Student consultation routes

All student routes require:

- a valid access-gate cookie;
- an authenticated Supabase user;
- the `student` app role;
- database authorization via RLS.

| Route                    | Method   | Behavior                                                 |
| ------------------------ | -------- | -------------------------------------------------------- |
| `/api/consultations`     | `GET`    | Return consultations owned by the authenticated student  |
| `/api/consultations`     | `POST`   | Create a new scheduled consultation                      |
| `/api/consultations/:id` | `PATCH`  | Update supported fields or lifecycle status              |
| `/api/consultations/:id` | `DELETE` | Cancel the consultation; idempotent if already cancelled |

A student cannot choose another student's `student_user_id` through the API. The authenticated user identity is always used as the owner.

## Admin consultation routes

| Route                      | Method | Behavior                                              |
| -------------------------- | ------ | ----------------------------------------------------- |
| `/api/admin/consultations` | `GET`  | Read all consultations as a read-only admin dashboard |

Admin endpoints are restricted to the `admin` app role and do not expose mutation routes.

## Cache and validation

Authenticated API responses are wrapped by `withApiHandler()`. This applies a default:

```http
Cache-Control: private, no-store, max-age=0, must-revalidate
```

The consultation client treats successful JSON as `unknown` and validates it with Valibot before it reaches React components.
