# Deployment

Production runs as a standalone Next.js container on Azure Container Apps in the
shared platform resource group `rg-platform-production`.

This repository owns:

- CI and tests
- immutable image publish to the shared Azure Container Registry (ACR)
- hosted Supabase migration gates before dispatch
- `repository_dispatch` evidence to the central IaC repository

Azure infrastructure apply, custom-domain binding, and planner/deployer OIDC
live in [BraddlesUnravels/iac](https://github.com/BraddlesUnravels/iac). Canonical
operator docs there:

- `docs/workloads/single-container-web-runbook.md`
- `docs/workloads/access-control-demo-runbook.md`

This repository does **not** contain Bicep, ARM, bootstrap scripts, or an Azure
apply workflow.

# Release triggers

| Trigger                                 | When                     | `releaseTag` sent to IaC |
| --------------------------------------- | ------------------------ | ------------------------ |
| Push of a version tag matching `vX.Y.Z` | Normal audited release   | `vX.Y.Z`                 |
| `workflow_dispatch` on `main`           | Operator hotfix / replay | `main`                   |

Do **not** auto-deploy on every push to `main`.

Both paths publish an immutable 40-character commit SHA image tag. IaC rejects
`latest` as a deploy identity.

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

Publisher authentication uses GitHub OIDC against
`id-access-control-production-publisher` via the protected `image-publish`
environment.

# Supabase migrations

Before IaC dispatch, the release job applies hosted migrations with the pinned
Supabase CLI (`db push` + migration list check). Failure blocks dispatch.

Migration operator secrets stay in the `image-publish` environment only:

```text
SUPABASE_PROJECT_REF
SUPABASE_ACCESS_TOKEN
SUPABASE_DB_PASSWORD
```

`NEXT_SUPABASE_URL` and `NEXT_SUPABASE_PUBLISHABLE_KEY` exist on `image-publish`
only for the pre-publish container smoke test. Runtime values in Azure come from
Key Vault, not from GitHub deploy jobs.

# IaC dispatch

After a successful image push, the workflow posts:

```text
event_type: single-container-web-release-v1
```

to `BraddlesUnravels/iac` with a non-secret evidence payload (application, source
repository ids, release id/tag, source commit SHA, image tag, digest).

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

Source job success means **dispatch accepted / deployment pending**. Final Azure
health is owned by the IaC run (`deploy-single-container-release.yml`).

# Runtime configuration (Azure)

| Item                | Value                                                    |
| ------------------- | -------------------------------------------------------- |
| Resource group      | `rg-platform-production`                                 |
| Stack               | `single-container-web`                                   |
| ACA environment     | `acae-access-control-demo-production`                    |
| Container app       | `aca-access-control-demo`                                |
| Custom domain       | `aca.braddlesunravels.online`                            |
| Default FQDN suffix | `greenwave-bd9d2bee.australiaeast.azurecontainerapps.io` |
| Runtime identity    | `id-access-control-demo-secrets`                         |
| Key Vault           | `kv-acd-prod-braddles`                                   |
| Health probe        | `GET /api/health`                                        |
| Replicas            | min = max = 1                                            |

Plain contract env (non-secret) includes `NODE_ENV`, `PORT`, bind-all host,
telemetry flags, and `ACCESS_GATE_DISABLED=false`. The stack injects
`AZURE_CUSTOM_DOMAIN=aca.braddlesunravels.online` when custom domain is enabled.

# Runtime secrets (Key Vault only)

| Env var                         | Key Vault secret name           |
| ------------------------------- | ------------------------------- |
| `ACCESS_GATE_CODE_SECRET`       | `access-gate-code-secret`       |
| `ACCESS_GATE_COOKIE_SECRET`     | `access-gate-cookie-secret`     |
| `NEXT_SUPABASE_URL`             | `next-supabase-url`             |
| `NEXT_SUPABASE_PUBLISHABLE_KEY` | `next-supabase-publishable-key` |

Architecture rule: the Supabase project URL is a **secret**, not plain contract
env and not injected by a deploy job.

Create or rotate values from a trusted operator workstation only. Secret values
never pass through GitHub Actions deploy jobs, dispatch payloads, or rendered
Azure deploy parameters. See [Secrets Management](secrets-management.md).

# GitHub configuration (this repository)

## `image-publish` environment

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

## Repository-level dispatch

```text
vars.IAC_DISPATCH_APP_ID
secrets.IAC_DISPATCH_APP_PRIVATE_KEY
```

## Do not store as application runtime GitHub secrets

```text
ACCESS_GATE_CODE_SECRET
ACCESS_GATE_COOKIE_SECRET
SUPABASE_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Access-gate plaintext and Supabase service-role credentials belong on a trusted
operator workstation (invite tooling), never in application runtime GitHub
configuration.

The legacy GitHub `production` environment (old Azure client ids, resource-group
variables, and access-gate secrets) is unused and should remain empty.

# Observability

Production logging is the platform stdout/stderr pipeline into Azure Monitor /
Log Analytics on the platform-hosted environment. Application Insights
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
stacks/single-container-web (rg-platform-production)
      |
      | runtime UAMI secret resolve
      v
Key Vault --> Container App env --> Next.js
```
