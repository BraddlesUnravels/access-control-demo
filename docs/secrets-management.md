# Secrets Management

The application uses separate secrets for separate trust boundaries. Secrets are never required by browser code.

## Secret inventory

| Secret                          | Used by                                  | Purpose                                                         |
| ------------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| `ACCESS_GATE_CODE_SECRET`       | Invite operator and unlock Route Handler | HMAC-hashes invite codes before database lookup.                |
| `ACCESS_GATE_COOKIE_SECRET`     | Access-gate proxy                        | Signs and verifies the `access_gate` cookie.                    |
| `SUPABASE_SERVICE_ROLE_KEY`     | Trusted invite operator tooling only     | Creates invite records through the Supabase admin client.       |
| `NEXT_SUPABASE_PUBLISHABLE_KEY` | Server and browser-safe Supabase clients | Accesses Supabase using the normal publishable-key trust model. |

`SUPABASE_SECRET_KEY` is supported as a legacy fallback by the invite operator script, but `SUPABASE_SERVICE_ROLE_KEY` is the documented current variable name.

The two access-gate secrets must be different and at least 32 characters long. Reusing one key for code hashing and cookie signing would unnecessarily couple those cryptographic purposes.

## Local development

Generate local runtime values with:

```bash
npm run infra:env
```

For trusted invite creation, provide `SUPABASE_SERVICE_ROLE_KEY` in the local operator environment. Do not put it in client-exposed variables, commit it, or copy it into `.env.example` with a real value.

## Production storage

Production access-gate secrets are stored in Azure Key Vault:

```text
access-gate-code-secret
access-gate-cookie-secret
```

The Container App receives them through versionless Key Vault references. GitHub Actions does not receive the secret contents. The running application has access only through the Container Apps secret-resolution path.

The Supabase service-role credential is not required by the deployed Next.js application. It belongs only on a trusted operator workstation when creating invites.

## Rotation

### Rotate the access-code secret

1. Stop creating invites with the old value.
2. Update the trusted invite operator environment.
3. Update the application runtime secret in Key Vault.
4. Redeploy the application.
5. Recreate any invites that must remain usable, because existing database hashes use the old secret.

### Rotate the cookie-signing secret

1. Update the application runtime secret in Key Vault.
2. Redeploy the application.
3. Expect all existing `access_gate` cookies to become invalid and require invite redemption again.

### Rotate the Supabase operator credential

Rotate it in the Supabase project, update only the trusted operator environment, and never add it to application runtime or GitHub production configuration.

## Incident response

If an access-gate secret is exposed:

- rotate the affected secret immediately;
- invalidate or recreate impacted invites where the code secret was exposed;
- redeploy when the cookie secret was exposed;
- remove the secret from logs, shell history, artifacts, and repository history where applicable;
- review invite redemption and deployment logs for suspicious activity.

Do not log plaintext invite codes, cookie values, access tokens, refresh tokens, or Supabase administrative credentials.
