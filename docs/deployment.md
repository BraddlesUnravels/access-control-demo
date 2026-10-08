# Deployment

Production runs as a standalone Next.js container on Azure Container Apps inside
the shared platform resource group `rg-platform-production`.

This application repository owns:

- CI and tests
- immutable image publish to the shared Azure Container Registry (ACR)
- hosted Supabase migration gates before dispatch
- `repository_dispatch` evidence to the central IaC repository

Azure infrastructure apply, custom-domain binding, and planner/deployer OIDC
live in [BraddlesUnravels/iac](https://github.com/BraddlesUnravels/iac). See that
repository's:

- `docs/workloads/single-container-web-runbook.md`
- `docs/workloads/access-control-demo-runbook.md`

# Release triggers

| Trigger | When | `releaseTag` sent to IaC |
| --- | --- | --- |
| Push of a version tag matching `vX.Y.Z` | Normal audited release | `vX.Y.Z` |
| `workflow_dispatch` on `main` | Operator hotfix / replay | `main` |

Do **not** auto-deploy on every push to `main`.

Both paths must publish an immutable 40-character commit SHA image tag. IaC
rejects `latest` as a deploy identity.

Workflow:

```text
.github/workflows/release.yml
```

# Image path

Images are built from:

```text
docker/Dockerfile
```

using the Next.js standalone output, then pushed to:

```text
braddlesunravelsacr.azurecr.io/access-control-demo:<40-char-sha>
```

Production no longer publishes to GHCR and no longer applies Bicep from this
repository.

Publisher authentication uses GitHub OIDC against the
`id-access-control-production-publisher` user-assigned managed identity via the
protected `image-publish` environment.

# Supabase migrations

Before IaC dispatch, the release job applies hosted migrations with the pinned
Supabase CLI (`db push` + migration list check). Failure blocks dispatch.

Migration operator secrets stay in the `image-publish` environment only:

```text
SUPABASE_PROJECT_REF
SUPABASE_ACCESS_TOKEN
SUPABASE_DB_PASSWORD
```

`NEXT_SUPABASE_URL` and `NEXT_SUPABASE_PUBLISHABLE_KEY` are present on
`image-publish` solely for the local container smoke test. Runtime values in
Azure come from Key Vault, not from GitHub deploy jobs.

# IaC dispatch

After a successful image push, the workflow posts:

```text
event_type: single-container-web-release-v1
```

to `BraddlesUnravels/iac` with a non-secret evidence payload (application,
source repository ids, release id/tag, source commit SHA, image tag, digest).

IaC then:

1. verifies provenance and the workload contract
2. plans with the access-control planner UAMI (`production-plan`)
3. applies with the access-control deployer UAMI (`production`)
4. verifies HTTP health on the platform-hosted app

Dispatch authentication uses the repository GitHub App installation:

```text
vars.IAC_DISPATCH_APP_ID
secrets.IAC_DISPATCH_APP_PRIVATE_KEY
```

# Runtime configuration (Azure)

| Item | Value |
| --- | --- |
| Resource group | `rg-platform-production` |
| Stack | `single-container-web` |
| ACA environment | `acae-access-control-demo-production` |
| Container app | `aca-access-control-demo` |
| Custom domain | `aca.braddlesunravels.online` |
| Runtime identity | `id-access-control-demo-secrets` |
| Key Vault | `kv-acd-prod-braddles` |
| Health probe | `GET /api/health` |
| Replicas | min = max = 1 |

Plain contract env (non-secret) includes `NODE_ENV`, `PORT`, bind-all host,
telemetry flags, and `ACCESS_GATE_DISABLED=false`.

# Runtime secrets (Key Vault only)

| Env var | Key Vault secret name |
| --- | --- |
| `ACCESS_GATE_CODE_SECRET` | `access-gate-code-secret` |
| `ACCESS_GATE_COOKIE_SECRET` | `access-gate-cookie-secret` |
| `NEXT_SUPABASE_URL` | `next-supabase-url` |
| `NEXT_SUPABASE_PUBLISHABLE_KEY` | `next-supabase-publishable-key` |

Architecture rule: the Supabase project URL is a **secret**, not plain contract
env and not injected by the deploy job.

Create or rotate values from a trusted operator workstation only. Secret values
never pass through GitHub Actions deploy jobs, dispatch payloads, or rendered
Bicep parameters. See [Secrets Management](secrets-management.md).

# GitHub environments after cutover

## `image-publish` (this repository)

Variables:

```text
AZURE_PUBLISHER_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
```

Secrets:

```text
SUPABASE_PROJECT_REF
SUPABASE_ACCESS_TOKEN
SUPABASE_DB_PASSWORD
NEXT_SUPABASE_URL
NEXT_SUPABASE_PUBLISHABLE_KEY
```

Repository-level dispatch:

```text
vars.IAC_DISPATCH_APP_ID
secrets.IAC_DISPATCH_APP_PRIVATE_KEY
```

## Do not keep as GitHub runtime secrets

```text
ACCESS_GATE_CODE_SECRET
ACCESS_GATE_COOKIE_SECRET
SUPABASE_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Access-gate plaintext and Supabase service-role credentials belong on a trusted
operator workstation (invite tooling), never in application runtime GitHub
configuration.

Legacy `production` environment Azure client ids, resource-group variables, and
GHCR-oriented settings are obsolete after cutover and should be removed once the
platform path is verified.

# Operator foundation and cutover

Privileged one-time steps (foundation apply, managed certificate, DNS CNAME,
legacy RG deletion) are documented in the IaC access-control runbook. This
repository does not contain Bicep bootstrap or Azure apply workflows.

Rough operator order:

1. Foundation identities / env / ACR ABAC already in `rg-platform-production`
2. Seed Key Vault secrets + secret-scoped RBAC for the runtime identity
3. Merge this release workflow
4. First release (tag or manual main); approve IaC plan/apply
5. Verify default FQDN `/api/health` before DNS change
6. Managed cert + SNI binding on the new environment
7. GoDaddy: point `aca` CNAME to the new app FQDN only after SNI is verified
8. Verify `https://aca.braddlesunravels.online/api/health`
9. Delete `rg-access-control-demo` (certs/env first if the RG sticks)

# Observability

Production logging remains the platform stdout/stderr pipeline into Azure
Monitor / Log Analytics on the platform-hosted environment. Application Insights
distributed tracing is intentionally out of scope.

Example query:

```kusto
ContainerAppConsoleLogs
| where ContainerAppName == "aca-access-control-demo"
| extend pino = parse_json(Log)
| project
    TimeGenerated,
    RevisionName,
    Stream,
    level = toint(pino.level),
    message = tostring(pino.msg),
    method = tostring(pino.method),
    path = tostring(pino.path)
| order by TimeGenerated desc
```

# Access-gate and scaling notes

- `ACCESS_GATE_DISABLED=true` cannot disable the access gate when the app runs
  in Azure.
- Invite redemption uses process-local rate limiting; production stays at a
  single replica (`minReplicas = maxReplicas = 1`).
- Horizontal scale requires shared rate-limit and access-session state.

# Hosted Supabase operational prerequisites

Infrastructure deploy does not replace Supabase Auth configuration. Operators
still need:

- migrations applied (release job gate)
- demo users provisioned when required
- Auth redirect allow-list for `https://aca.braddlesunravels.online`
- confirmation email templates aligned with app routes
- production SMTP

Password policy must stay aligned with the application (minimum length 15, no
composition requirements on hosted Auth).

# Deployment boundary

```text
Trusted operator
      |
      v
IaC foundations/single-container-web + Key Vault secrets
      |
      v
GitHub Actions (this repo)  --OIDC publisher--> shared ACR
      |
      | repository_dispatch evidence
      v
IaC deploy-single-container-release.yml
      |
      | planner / deployer OIDC
      v
stacks/single-container-web (platform RG)
      |
      | runtime UAMI secret resolve
      v
Key Vault --> Container App env --> Next.js
```
