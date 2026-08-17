# Deployment

Production is deployed as a standalone Next.js container to Azure Container Apps.

GitHub Actions builds and publishes immutable production images and authenticates to Azure using OpenID Connect rather than a stored Azure client secret.

# Production GitHub environment

The production GitHub Environment stores non-sensitive configuration as environment variables:

```text
AZURE_RESOURCE_GROUP
AZURE_LOCATION
AZURE_CONTAINER_ENVIRONMENT
AZURE_CONTAINER_APP
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Sensitive values are stored as GitHub Environment secrets:

```text
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
ACCESS_GATE_CODE_SECRET
ACCESS_GATE_COOKIE_SECRET
```

The production:

```text
ACCESS_GATE_CODE_SECRET
```

must exactly match the value used when creating invites against the hosted Supabase project.

The deployed Next.js application does not require:

```text
SUPABASE_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Those credentials are reserved for trusted operator tooling.

# Container image

Production images are built using:

```text
docker/Dockerfile
```

The application uses the Next.js standalone production output.

Images are published to GitHub Container Registry.

Production deployments use immutable commit-SHA image references.

# Azure infrastructure

Infrastructure is defined under:

```text
deploy/azure/
├── bootstrap-oidc.sh
└── main.bicep
```

Bicep provisions:

- the Azure Container Apps environment;
- the Container App;
- external HTTPS ingress;
- application runtime configuration;
- access-gate secrets;
- startup probes;
- readiness probes;
- liveness probes;
- a single always-available application replica.

# GitHub OIDC

GitHub Actions authenticates to Azure through OpenID Connect.

This avoids storing a long-lived Azure client secret in GitHub.

The repository still stores the identifiers required for OIDC authentication:

```text
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
```

The OIDC bootstrap tooling is located at:

```text
deploy/azure/bootstrap-oidc.sh
```

# Access-gate configuration

Production uses:

```text
ACCESS_GATE_CODE_SECRET
ACCESS_GATE_COOKIE_SECRET
```

as separate cryptographic secrets.

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

# Health probes

The application exposes:

```text
GET /api/health
```

for Docker and Azure health probes.

The health route bypasses visitor access and LMS authentication.

Health checks therefore do not depend on a user session.

# Production workflows

The repository contains GitHub Actions workflows for:

```text
.github/workflows/
├── production.yml
├── production-teardown.yml
└── take-containers-offline.yml
```

These provide:

- production deployment;
- taking the application offline;
- tearing down Container App resources.

# Deployment boundary

The production flow is approximately:

```text
GitHub Actions
      |
      v
Quality / Deployment workflow
      |
      v
Docker production build
      |
      v
GitHub Container Registry
      |
      v
Azure OIDC authentication
      |
      v
Bicep infrastructure
      |
      v
Azure Container Apps
      |
      v
Next.js standalone container
      |
      v
Hosted Supabase
```

The deployed application receives only the Supabase public client configuration and the two access-gate secrets needed at runtime.

Trusted Supabase administrative credentials remain outside the deployed application.
