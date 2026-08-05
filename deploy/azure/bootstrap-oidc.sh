#!/usr/bin/env bash
set -euo pipefail

required_variables=(
  AZURE_SUBSCRIPTION_ID
  AZURE_RESOURCE_GROUP
  REPOSITORY_SLUG
)

for variable_name in "${required_variables[@]}"; do
  if [[ -z "${!variable_name:-}" ]]; then
    echo "Missing required environment variable: ${variable_name}" >&2
    exit 1
  fi
done

REPOSITORY_OWNER="${REPOSITORY_SLUG%%/*}"
REPOSITORY_OWNER_ID="${103235805}"
REPOSITORY_ID="${1298659298}"
REPOSITORY_NAME="access-control-demo"
AZURE_LOCATION="${AZURE_LOCATION:-australiaeast}"
AZURE_IDENTITY_NAME="${AZURE_IDENTITY_NAME:-github-access-control-demo-production}"
DEPLOYMENT_ENVIRONMENT="${DEPLOYMENT_ENVIRONMENT:-production}"
FEDERATED_CREDENTIAL_NAME="github-${DEPLOYMENT_ENVIRONMENT}"
OIDC_ISSUER="https://token.actions.githubusercontent.com"
OIDC_AUDIENCE="api://AzureADTokenExchange"
OIDC_SUBJECT="repo:${REPOSITORY_OWNER}@${REPOSITORY_OWNER_ID}/${REPOSITORY_NAME}@${REPOSITORY_ID}:environment:${DEPLOYMENT_ENVIRONMENT}"

az account set --subscription "${AZURE_SUBSCRIPTION_ID}"
az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.ManagedIdentity --wait

az group create \
  --name "${AZURE_RESOURCE_GROUP}" \
  --location "${AZURE_LOCATION}" \
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
Azure OIDC bootstrap completed.

Add these variables to the GitHub production environment:
AZURE_CLIENT_ID=${client_id}
AZURE_TENANT_ID=${tenant_id}
AZURE_SUBSCRIPTION_ID=${AZURE_SUBSCRIPTION_ID}
AZURE_RESOURCE_GROUP=${AZURE_RESOURCE_GROUP}
AZURE_LOCATION=${AZURE_LOCATION}
AZURE_CONTAINER_ENVIRONMENT=acae-access-control-demo
AZURE_CONTAINER_APP=aca-access-control-demo

The federated subject is:
${OIDC_SUBJECT}
OUTPUT