# Deployment

This project is deployed as a standalone Next.js container in Azure Container Apps.

## Production model

The Azure deployment uses:

- GitHub Actions for CI/CD;
- OIDC-based Azure authentication;
- Azure Key Vault for runtime secret resolution;
- Azure Container Apps for the running app;
- Azure Monitor and Log Analytics for operational logs.

## Infrastructure

The production bootstrap and release files are under `deploy/azure/`.

The bootstrap process configures:

- resource group and provider registrations;
- the GitHub deployment identity and OIDC federated credential;
- Key Vault and managed identities;
- required Azure RBAC assignments.

The release deployment provisions the Container Apps environment, ingress, App configuration, and Key Vault secret references.

## GitHub OIDC

GitHub Actions authenticates to Azure using OIDC rather than a long-lived Azure client secret. The required environment values are limited to the identifiers needed for the federation and deployment flow.

## Access-gate configuration

The app resolves these secrets at runtime from Azure Key Vault:

```text
ACCESS_GATE_CODE_SECRET
ACCESS_GATE_COOKIE_SECRET
```

`ACCESS_GATE_DISABLED=true` cannot disable the access gate in Azure, even if it is a convenient local development toggle.

## Observability

The app writes structured logs to stdout/stderr. Azure Container Apps forwards them to Azure Monitor and Log Analytics for collection and querying.

The deployment is intentionally simple: the app logs structured JSON, and the platform handles collection and retention.
