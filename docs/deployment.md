# Deployment

Production is deployed as a standalone Next.js container to Azure Container Apps.

GitHub Actions builds and publishes immutable production images and authenticates to Azure using OpenID Connect rather than a stored Azure client secret.

# Production bootstrap

Production has persistent security resources that are provisioned separately from normal application releases.

Bootstrap infrastructure is defined under:

```text
deploy/azure/
├── bootstrap.bicep
├── bootstrap-oidc.sh
├── main.bicep
└── set-production-secrets.sh
```

The one-time bootstrap creates or configures:

- the production resource group;
- required Azure resource-provider registrations;
- the GitHub deployment managed identity;
- the GitHub OIDC federated credential;
- Contributor access for the GitHub deployment identity at the production resource-group scope;
- the production Azure Key Vault;
- the user-assigned managed identity used by Container Apps to resolve Key Vault secrets;
- the `Key Vault Secrets User` assignment for that secret-reader identity;
- the `Key Vault Secrets Officer` assignment for the trusted bootstrap operator.

The bootstrap script is intended to run from a trusted operator workstation, not GitHub Actions. The signed-in operator must be allowed to create role assignments at the production resource-group scope because bootstrap assigns both the GitHub deployment role and Key Vault data-plane roles.

Before running it, configure:

```text
AZURE_SUBSCRIPTION_ID
AZURE_RESOURCE_GROUP
AZURE_KEY_VAULT
REPOSITORY_SLUG
```

Optional bootstrap values are:

```text
AZURE_LOCATION
AZURE_IDENTITY_NAME
AZURE_SECRET_READER_IDENTITY
DEPLOYMENT_ENVIRONMENT
REPOSITORY_OWNER_ID
REPOSITORY_ID
```

Run:

```bash
deploy/azure/bootstrap-oidc.sh
```

The script prints the GitHub production Environment values that must be configured after bootstrap.

The Azure federated credential subject uses GitHub's immutable owner-ID and repository-ID subject format. The configured Azure subject must exactly match the subject GitHub issues for this repository and production environment. Repositories that predate GitHub's immutable-subject rollout must opt in before using this subject format.

# Production secrets

Production access-gate secrets are stored only in Azure Key Vault.

GitHub Actions does not store or receive:

```text
ACCESS_GATE_CODE_SECRET
ACCESS_GATE_COOKIE_SECRET
```

The Key Vault contains these secret names:

```text
access-gate-code-secret
access-gate-cookie-secret
```

After bootstrap, populate or rotate the values from the trusted operator workstation:

```bash
export AZURE_KEY_VAULT=<production-key-vault-name>
deploy/azure/set-production-secrets.sh
```

The code secret must exactly match the production secret used when creating access invites against hosted Supabase.

The Container App uses versionless Key Vault references. The application receives the values through Container Apps secret references rather than GitHub or Bicep receiving the secret contents.

# Production GitHub environment

Configure these GitHub production Environment secrets:

```text
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
NEXT_SUPABASE_URL
NEXT_SUPABASE_PUBLISHABLE_KEY
```

Configure these GitHub production Environment variables:

```text
AZURE_RESOURCE_GROUP
AZURE_LOCATION
AZURE_CONTAINER_ENVIRONMENT
AZURE_CONTAINER_APP
AZURE_CUSTOM_DOMAIN
AZURE_CUSTOM_DOMAIN_CERTIFICATE_ID
AZURE_KEY_VAULT
AZURE_SECRET_READER_IDENTITY
```

Do not configure these as GitHub production secrets:

```text
ACCESS_GATE_CODE_SECRET
ACCESS_GATE_COOKIE_SECRET
SUPABASE_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
```

The deployed Next.js application does not require trusted Supabase administrative credentials.

# Container image

Production images are built using:

```text
docker/Dockerfile
```

The application uses the Next.js standalone production output.

Images are published to GitHub Container Registry.

Production deployments use immutable commit-SHA image references.

The production workflow also verifies that known development-only packages are not resolvable from the final runtime image.

# Azure infrastructure

Normal production releases use:

```text
deploy/azure/main.bicep
```

The release deployment provisions:

- a Log Analytics workspace for production observability;
- the Azure Container Apps environment;
- an Azure Monitor diagnostic setting;
- the Container App;
- external HTTPS ingress;
- application runtime configuration;
- Key Vault-backed Container Apps secret references;
- startup probes;
- readiness probes;
- liveness probes;
- a single always-available application replica.

`main.bicep` treats the Key Vault and secret-reader managed identity as existing persistent resources. The production workflow verifies that they exist before attempting the release deployment.

# Key Vault access model

The running Container App has a dedicated user-assigned managed identity for Key Vault secret resolution.

That identity has only the `Key Vault Secrets User` role on the production vault.

The Container App configures the identity with an application lifecycle of `None`, because the identity is used by the Container Apps platform to resolve Key Vault references rather than by application code to obtain Azure tokens.

A trusted operator receives `Key Vault Secrets Officer` on the vault so production secrets can be created and rotated without giving the application write access.

# Observability

Production logging uses the platform-native stdout/stderr pipeline:

```text
Next.js / Pino
      |
      | structured JSON to stdout/stderr
      v
Azure Container Apps
      |
      | Azure Monitor resource logs
      v
Diagnostic setting
      |
      v
Log Analytics workspace
```

The Container Apps environment uses `azure-monitor` as its application log destination.

The diagnostic setting sends:

- `ContainerAppConsoleLogs`, containing application stdout/stderr including Pino records;
- `ContainerAppSystemLogs`, containing Container Apps platform and lifecycle events.

The application does not use an Azure-specific Pino transport. Pino remains responsible for structured application logging, while Azure Container Apps and Azure Monitor handle collection, routing, retention, and querying.

A useful query for recent Pino records is:

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

The production deployment verifies the Azure Monitor destination and diagnostic-setting configuration. It does not fail based on immediate Log Analytics ingestion.

Application Insights distributed tracing is intentionally not part of this logging deployment. If tracing is required later, add it as a separate observability change using Next.js instrumentation and OpenTelemetry.

# GitHub OIDC

GitHub Actions authenticates to Azure through OpenID Connect.

The release workflow requires only the identifiers needed for OIDC authentication:

```text
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
```

No long-lived Azure client secret is stored in GitHub.

The OIDC bootstrap tooling is located at:

```text
deploy/azure/bootstrap-oidc.sh
```

# Hosted Supabase production setup

The Azure deployment provisions the application container, but the hosted Supabase project still needs operational configuration before the production site can authenticate users and send email-based auth flows.

## Apply the database migrations

The application treats the migration history in `supabase/migrations/` as the executable source of truth. The hosted Supabase project must be pointed at the correct project and then have the migration history applied before production traffic is enabled.

Typical steps:

```bash
supabase link --project <project-ref>
supabase db push
```

If the project is being managed by CI rather than a trusted operator workstation, run the same migration step in the release pipeline and do not rely on the local dev database snapshot alone.

After changing a migration locally, regenerate the schema snapshot and verify that it matches the live migration state:

```bash
npm run schema:generate
npm run schema:check
```

Do not treat `supabase/schema.sql` as the source of truth. It is a generated snapshot intended to detect drift against the migration history.

## Provision the hosted demo users

The application expects the same demo-user boundary used by the local project: one student account, a second student account, and one administrator account. These users must be created in the hosted Supabase Auth project before the production demo is useful.

Use a trusted operator workflow to create the same accounts used by the project documentation, or a one-time admin script that creates the accounts with the expected email addresses and role assignments. The exact credentials should match the app's supported demo workflow and the documentation in the repository.

The production environment should not depend on the local seed data or local MailPit state. Provisioning is a deployment prerequisite rather than a runtime side effect.

## Configure Auth redirect allow-lists

Supabase Auth requires exact URLs in its redirect allow-list. Configure the production project with:

```text
site_url = "https://<production-domain>"
additional_redirect_urls = [
  "https://<production-domain>/auth/confirm",
  "https://<production-domain>/auth/confirm?next=/protected",
  "https://<production-domain>/auth/confirm-email?next=/protected",
  "https://<production-domain>/auth/update-password",
  "https://<production-domain>/protected",
]
```

These routes are required because the app generates password-reset and email-confirmation links that redirect back into the application. Missing entries here prevent the auth token callback from completing in production.

## Install or verify the confirmation templates

The application uses Supabase Auth email flows for:

- sign-up confirmation;
- password reset;
- update-password completion.

Make sure the hosted project has the relevant email templates installed and that their links point to the application routes created by the app:

- `/auth/confirm?next=/auth/update-password`
- `/auth/confirm-email?next=/protected`
- `/auth/update-password`

The confirmation flow intentionally splits signup-email confirmation and recovery-token verification. The templates and redirect targets must match that logic or the app will redirect users to the wrong screen or reject valid tokens.

## Configure the production email provider

Hosted Supabase Auth sends confirmation and reset emails through an SMTP provider rather than MailPit. Configure the production project with a real email provider and verified sender address before enabling user sign-up or password recovery.

Typical settings include:

```text
SMTP host
SMTP port
SMTP username
SMTP password
sender name
sender email
TLS / STARTTLS and verification state
```

Use a production domain that is already verified by the provider. Test the full flow end-to-end after configuration:

1. sign up with a real email address;
2. confirm the email flow;
3. request a password reset;
4. verify the reset link reaches `/auth/confirm` and then `/auth/update-password`.

The project does not rely on a local MailPit SMTP server in production. The hosted Supabase project must be configured to deliver real email to end users.

# Access-gate configuration

Production uses two separate cryptographic secrets:

```text
ACCESS_GATE_CODE_SECRET
ACCESS_GATE_COOKIE_SECRET
```

Their values are resolved from Azure Key Vault at runtime.

`ACCESS_GATE_DISABLED=true` cannot disable the access gate when the application is running in Azure.

This prevents a development bypass from accidentally disabling the public production boundary.

# Rate limiting

Invite redemption currently uses process-local rate limiting.

The production deployment intentionally runs a single active application replica.

Under that deployment model, all invite-redemption attempts reach one effective in-memory limiter.

If the application is later scaled horizontally, rate-limit state should move to:

- shared Redis;
- PostgreSQL;
- another shared data store;
- an upstream gateway or rate-limiting layer.

# Access-session revalidation

Protected application requests use a signed `access_gate` cookie as a fast
local check and then consult the existing `validate_access_gate_session()` RPC
through a process-local cache.

Successful validation is cached for up to one hour and no longer than the
cookie's absolute expiry. Rejected sessions and RPC failures are not cached;
they fail closed and the supplied access cookie is cleared where the response
can modify cookies.

The cache is bounded to 1,000 sessions and is held in the application process.
The current Container App uses one active replica, so all requests share that
cache. If the application is horizontally scaled, each replica can have a
different validation view unless the cache is moved to shared infrastructure or
each request revalidates directly against the database.

The only public application access-gate route is:

```text
POST /api/access/unlock
```

Health probes and Supabase authentication callbacks remain public operational
exceptions.

# Health probes

The application exposes:

```text
GET /api/health
```

for Docker and Azure health probes.

The health route bypasses visitor access and LMS authentication.

Health checks therefore do not depend on a user session.

# Supabase Auth password policy

Password creation and authentication intentionally use different application validation rules:

- sign-up and password updates accept passwords between 15 and 64 characters;
- passwords may contain any supported characters and do not require a prescribed mix of uppercase letters, lowercase letters, numbers, or symbols;
- sign-in requires only a non-empty password so the application does not pre-reject a credential before Supabase Auth evaluates it.

Local Supabase Auth mirrors the 15-character minimum through `supabase/config.toml`.

The hosted Supabase project's Auth password settings must also use a minimum password length of 15 and must not add character-composition requirements. This keeps direct Supabase Auth requests aligned with the application's password-creation boundary.

The 64-character maximum is enforced by the application when creating or changing passwords.

# Production workflows

The repository contains GitHub Actions workflows for:

```text
.github/workflows/
├── production.yml
├── production-teardown.yml
└── take-containers-offline.yml
```

These provide:

- production deployment and configuration verification;
- taking the application offline;
- tearing down the Container App and Container Apps environment.

Persistent bootstrap resources are intentionally outside the normal application teardown lifecycle:

- Azure Key Vault;
- production access-gate secrets;
- secret-reader managed identity;
- GitHub OIDC deployment identity and federation;
- Log Analytics historical data.

# Deployment boundary

The production flow is approximately:

```text
Trusted operator
      |
      v
bootstrap-oidc.sh
      |
      +--> GitHub OIDC identity
      +--> Key Vault
      +--> secret-reader identity
      +--> Key Vault RBAC
      |
      v
set-production-secrets.sh
      |
      v
Azure Key Vault

GitHub Actions
      |
      | OIDC
      v
Azure deployment identity
      |
      v
main.bicep
      |
      +--> Container Apps environment
      +--> Container App
      +--> Azure Monitor / Log Analytics
      |
      v
Container Apps platform
      |
      | secret-reader managed identity
      v
Azure Key Vault
      |
      v
Next.js environment variables
```

The browser authenticates directly with Supabase using the publishable key.

Next.js route handlers enforce application authorization before performing privileged application operations.

PostgreSQL RLS and database permissions independently enforce the same security properties for direct Data API access.
