# Secrets Management

The application uses separate secrets for separate trust boundaries. Secrets are
never required by browser code.

## Secret inventory

| Secret                          | Used by                                  | Purpose                                                   |
| ------------------------------- | ---------------------------------------- | --------------------------------------------------------- |
| `ACCESS_GATE_CODE_SECRET`       | Invite operator and unlock Route Handler | HMAC-hashes invite codes before database lookup.          |
| `ACCESS_GATE_COOKIE_SECRET`     | Access-gate proxy                        | Signs and verifies the `access_gate` cookie.              |
| `NEXT_SUPABASE_URL`             | Server Supabase clients                  | Hosted Supabase project URL (treated as secret).          |
| `NEXT_SUPABASE_PUBLISHABLE_KEY` | Server and browser-safe Supabase clients | Accesses Supabase using the publishable-key trust model.  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Trusted invite operator tooling only     | Creates invite records through the Supabase admin client. |
| `SUPABASE_ACCESS_TOKEN`         | Release migration job only               | Supabase CLI auth for hosted `db push`.                   |
| `SUPABASE_DB_PASSWORD`          | Release migration job only               | Hosted database password for migration apply.             |
| `SUPABASE_PROJECT_REF`          | Release migration job only               | Hosted project identifier for migration apply.            |

`SUPABASE_SECRET_KEY` remains a legacy fallback name for the invite operator
script; `SUPABASE_SERVICE_ROLE_KEY` is the documented current variable.

The two access-gate secrets must be different and at least 32 characters long.
Reusing one key for code hashing and cookie signing couples those cryptographic
purposes unnecessarily.

## Local development

Generate local runtime values with:

```bash
npm run infra:env
```

For trusted invite creation, provide `SUPABASE_SERVICE_ROLE_KEY` in the local
operator environment. Do not put it in client-exposed variables, commit it, or
copy a real value into `.env.example`.

## Production storage

### Application runtime (Azure Key Vault)

```text
access-gate-code-secret
access-gate-cookie-secret
next-supabase-url
next-supabase-publishable-key
```

The Container App receives them through versionless Key Vault references via
the runtime identity `id-access-control-demo-secrets`. GitHub Actions deploy
jobs do not receive these secret contents.

Architecture rule: `NEXT_SUPABASE_URL` is a Key Vault secret, not plain
contract env and not a deploy-time Bicep parameter.

### Release migration (GitHub `image-publish` only)

```text
SUPABASE_PROJECT_REF
SUPABASE_ACCESS_TOKEN
SUPABASE_DB_PASSWORD
```

These never enter the Container App, IaC dispatch payload, or Bicep parameters.

`NEXT_SUPABASE_URL` / `NEXT_SUPABASE_PUBLISHABLE_KEY` may also exist on
`image-publish` for the pre-publish container smoke test only.

### Operator workstation only

```text
SUPABASE_SERVICE_ROLE_KEY
ACCESS_GATE_CODE_SECRET (plaintext while minting invites)
```

## Rotation

### Access-code secret

1. Stop creating invites with the old value.
2. Update the trusted invite operator environment.
3. Update `access-gate-code-secret` in Key Vault.
4. Redeploy via the release path (new revision resolves Key Vault).
5. Recreate invites that must remain usable; existing hashes use the old secret.

### Cookie-signing secret

1. Update `access-gate-cookie-secret` in Key Vault.
2. Redeploy.
3. Expect existing `access_gate` cookies to become invalid.

### Supabase URL or publishable key

1. Update the corresponding Key Vault secret from a trusted workstation.
2. Redeploy so the Container App resolves the new versionless reference.
3. Update `image-publish` smoke-test copies if those GitHub secrets are still used.

### Supabase operator / migration credentials

Rotate in Supabase, update only the trusted operator environment and/or
`image-publish` migration secrets, and never add them to application runtime.

## Incident response

If an access-gate secret is exposed:

- rotate the affected secret immediately
- invalidate or recreate impacted invites when the code secret was exposed
- redeploy when the cookie secret was exposed
- remove the secret from logs, shell history, artifacts, and repository history
- review invite redemption and deployment logs for suspicious activity

Do not log plaintext invite codes, cookie values, access tokens, refresh tokens,
Supabase URLs beyond operational need, or administrative credentials.
