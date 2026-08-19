#!/usr/bin/env bash
set -euo pipefail

if [[ "${GITHUB_ACTIONS:-}" == 'true' ]]; then
  echo 'This bootstrap script must be run from a trusted operator workstation, not GitHub Actions.' >&2
  exit 1
fi

required_variables=(
  AZURE_SUBSCRIPTION_ID
  AZURE_RESOURCE_GROUP
  AZURE_KEY_VAULT
  REPOSITORY_SLUG
)

for variable_name in "${required_variables[@]}"; do
  if [[ -z "${!variable_name:-}" ]]; then
    echo "Missing required environment variable: ${variable_name}" >&2
    exit 1
  fi
done

if [[ "${REPOSITORY_SLUG}" != */* ]]; then
  echo 'REPOSITORY_SLUG must use the owner/repository format.' >&2
  exit 1
fi

SCRIPT_DIR="$(
  cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1
  pwd
)"

REPOSITORY_OWNER="${REPOSITORY_SLUG%%/*}"
REPOSITORY_NAME="${REPOSITORY_SLUG##*/}"

# Immutable GitHub repository identifiers. These remain stable if the
# repository or owner is renamed.
REPOSITORY_OWNER_ID="${REPOSITORY_OWNER_ID:-103235805}"
REPOSITORY_ID="${REPOSITORY_ID:-1298659298}"

AZURE_LOCATION="${AZURE_LOCATION:-australiaeast}"
AZURE_IDENTITY_NAME="${AZURE_IDENTITY_NAME:-github-access-control-demo-production}"
AZURE_SECRET_READER_IDENTITY="${AZURE_SECRET_READER_IDENTITY:-id-access-control-demo-secrets}"
DEPLOYMENT_ENVIRONMENT="${DEPLOYMENT_ENVIRONMENT:-production}"

FEDERATED_CREDENTIAL_NAME="github-${DEPLOYMENT_ENVIRONMENT}"
OIDC_ISSUER='https://token.actions.githubusercontent.com'
OIDC_AUDIENCE='api://AzureADTokenExchange'

OIDC_SUBJECT="repo:${REPOSITORY_OWNER}@${REPOSITORY_OWNER_ID}/${REPOSITORY_NAME}@${REPOSITORY_ID}:environment:${DEPLOYMENT_ENVIRONMENT}"

az account set \
  --subscription "${AZURE_SUBSCRIPTION_ID}"

for provider_namespace in \
  Microsoft.App \
  Microsoft.Insights \
  Microsoft.KeyVault \
  Microsoft.ManagedIdentity \
  Microsoft.OperationalInsights; do
  az provider register \
    --namespace "${provider_namespace}" \
    --wait
done

az group create \
  --name "${AZURE_RESOURCE_GROUP}" \
  --location "${AZURE_LOCATION}" \
  --output none

operator_principal_id="$(
  az ad signed-in-user show \
    --query id \
    --output tsv
)"

if [[ -z "${operator_principal_id}" ]]; then
  echo 'Unable to resolve the signed-in Azure operator object ID.' >&2
  exit 1
fi

az deployment group create \
  --name 'access-control-demo-bootstrap' \
  --resource-group "${AZURE_RESOURCE_GROUP}" \
  --template-file "${SCRIPT_DIR}/bootstrap.bicep" \
  --parameters \
    location="${AZURE_LOCATION}" \
    keyVaultName="${AZURE_KEY_VAULT}" \
    secretReaderIdentityName="${AZURE_SECRET_READER_IDENTITY}" \
    secretOperatorPrincipalId="${operator_principal_id}" \
  --output none

if ! az identity show \
  --name "${AZURE_IDENTITY_NAME}" \
  --resource-group "${AZURE_RESOURCE_GROUP}" \
  --output none \
  2>/dev/null; then
  az identity create \
    --name "${AZURE_IDENTITY_NAME}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --location "${AZURE_LOCATION}" \
    --output none
fi

client_id="$(
  az identity show \
    --name "${AZURE_IDENTITY_NAME}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --query clientId \
    --output tsv
)"

principal_id="$(
  az identity show \
    --name "${AZURE_IDENTITY_NAME}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --query principalId \
    --output tsv
)"

tenant_id="$(
  az identity show \
    --name "${AZURE_IDENTITY_NAME}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --query tenantId \
    --output tsv
)"

resource_group_scope="/subscriptions/${AZURE_SUBSCRIPTION_ID}/resourceGroups/${AZURE_RESOURCE_GROUP}"

existing_role_assignment="$(
  az role assignment list \
    --assignee "${principal_id}" \
    --scope "${resource_group_scope}" \
    --role Contributor \
    --query '[0].id' \
    --output tsv
)"

if [[ -z "${existing_role_assignment}" ]]; then
  az role assignment create \
    --assignee-object-id "${principal_id}" \
    --assignee-principal-type ServicePrincipal \
    --role Contributor \
    --scope "${resource_group_scope}" \
    --output none
fi

if az identity federated-credential show \
  --name "${FEDERATED_CREDENTIAL_NAME}" \
  --identity-name "${AZURE_IDENTITY_NAME}" \
  --resource-group "${AZURE_RESOURCE_GROUP}" \
  --output none \
  2>/dev/null; then
  az identity federated-credential update \
    --name "${FEDERATED_CREDENTIAL_NAME}" \
    --identity-name "${AZURE_IDENTITY_NAME}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --issuer "${OIDC_ISSUER}" \
    --subject "${OIDC_SUBJECT}" \
    --audiences "${OIDC_AUDIENCE}" \
    --output none
else
  az identity federated-credential create \
    --name "${FEDERATED_CREDENTIAL_NAME}" \
    --identity-name "${AZURE_IDENTITY_NAME}" \
    --resource-group "${AZURE_RESOURCE_GROUP}" \
    --issuer "${OIDC_ISSUER}" \
    --subject "${OIDC_SUBJECT}" \
    --audiences "${OIDC_AUDIENCE}" \
    --output none
fi

cat <<OUTPUT

Azure production bootstrap completed.

Configure the GitHub "${DEPLOYMENT_ENVIRONMENT}" environment with the following values.

GitHub environment SECRETS
--------------------------
AZURE_CLIENT_ID=${client_id}
AZURE_TENANT_ID=${tenant_id}
AZURE_SUBSCRIPTION_ID=${AZURE_SUBSCRIPTION_ID}


GitHub environment VARIABLES
----------------------------
AZURE_RESOURCE_GROUP=${AZURE_RESOURCE_GROUP}
AZURE_LOCATION=${AZURE_LOCATION}
AZURE_CONTAINER_ENVIRONMENT=acae-access-control-demo
AZURE_CONTAINER_APP=aca-access-control-demo
AZURE_KEY_VAULT=${AZURE_KEY_VAULT}
AZURE_SECRET_READER_IDENTITY=${AZURE_SECRET_READER_IDENTITY}

NEXT_PUBLIC_SUPABASE_URL=<hosted Supabase project URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<hosted Supabase publishable key>


Key Vault setup
---------------
Key Vault:
${AZURE_KEY_VAULT}

Secret reader identity:
${AZURE_SECRET_READER_IDENTITY}

Before the first production deployment, populate these Key Vault secrets from this trusted operator workstation:

- access-gate-code-secret
- access-gate-cookie-secret

Use deploy/azure/set-production-secrets.sh to populate or rotate them.

Do not store these access-gate secret values in GitHub Actions.


Federated identity
------------------
Managed identity:
${AZURE_IDENTITY_NAME}

Federated credential name:
${FEDERATED_CREDENTIAL_NAME}

Subject:
${OIDC_SUBJECT}

IMPORTANT:
The Azure federated credential subject must exactly match the subject GitHub issues for this repository and environment.

Repositories created before GitHub's immutable-subject rollout must opt in before using the owner-ID/repository-ID subject above.

OUTPUT