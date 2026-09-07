# Secrets management

The application keeps secrets separated by trust boundary. Browser code never requires the secret values used for server-only operations.

## Secret inventory

| Secret                          | Used by                                   | Purpose                                         |
| ------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| `ACCESS_GATE_CODE_SECRET`       | invite operator and access unlock handler | HMAC-hashes invite codes before database lookup |
| `ACCESS_GATE_COOKIE_SECRET`     | access-gate proxy                         | signs and verifies `access_gate` cookies        |
| `SUPABASE_SERVICE_ROLE_KEY`     | trusted admin tooling only                | creates invites through Supabase admin actions  |
| `NEXT_SUPABASE_PUBLISHABLE_KEY` | browser-safe clients                      | standard Supabase public client access          |

`SUPABASE_SECRET_KEY` remains supported as a legacy fallback while `SUPABASE_SERVICE_ROLE_KEY` is the current documented name.

## Local development

Generate local values with:

```bash
npm run infra:env
```

For invite creation, provide the service-role credential only in a trusted local environment. Do not commit it or expose it to browser code.

## Production storage

Production access-gate secrets live in Azure Key Vault. The running Container App receives them through versionless Key Vault references. GitHub Actions does not receive their plaintext values.

The Supabase service-role credential is not required by the deployed application. It belongs only on a trusted operator workstation used to create invites.

## Rotation

1. stop issuing invites with the old access-code secret;
2. update the operator environment and the app runtime secret;
3. redeploy the app when changing cookie-signing secrets;
4. recreate any invites that must remain valid with the new code secret.

## Incident response

If a secret is exposed:

- rotate it immediately;
- invalidate or recreate impacted invites;
- redeploy when the cookie secret was exposed;
- remove the secret from logs, history, and artifacts;
- review invite-redemption logs for suspicious activity.
