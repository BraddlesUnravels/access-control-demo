targetScope = 'resourceGroup'

@description('Azure region for persistent production security resources.')
param location string = resourceGroup().location

@description('Globally unique name of the production Azure Key Vault.')
param keyVaultName string

@description('Name of the user-assigned managed identity used by Container Apps to resolve Key Vault secrets.')
#disable-next-line secure-secrets-in-params
param secretReaderIdentityName string = 'id-access-control-demo-secrets'

@description('Object ID of the trusted operator allowed to create and rotate production secrets.')
#disable-next-line secure-secrets-in-params
param secretOperatorPrincipalId string

var commonTags = {
  application: 'access-control-demo'
  environment: 'production'
  managedBy: 'bicep'
}

var keyVaultSecretsUserRoleDefinitionId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '4633458b-17de-408a-b874-0445c86b69e6'
)

var keyVaultSecretsOfficerRoleDefinitionId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  'b86a8fe4-44ce-4948-aee5-eccb2c155cd7'
)

resource secretReaderIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = {
  name: secretReaderIdentityName
  location: location
  tags: commonTags
}

resource keyVault 'Microsoft.KeyVault/vaults@2026-02-01' = {
  name: keyVaultName
  location: location
  tags: commonTags
  properties: {
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    publicNetworkAccess: 'Enabled'
    sku: {
      family: 'A'
      name: 'standard'
    }
  }
}

resource secretReaderRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(
    keyVault.id,
    secretReaderIdentity.id,
    keyVaultSecretsUserRoleDefinitionId
  )
  scope: keyVault
  properties: {
    roleDefinitionId: keyVaultSecretsUserRoleDefinitionId
    principalId: secretReaderIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource secretOperatorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(
    keyVault.id,
    secretOperatorPrincipalId,
    keyVaultSecretsOfficerRoleDefinitionId
  )
  scope: keyVault
  properties: {
    roleDefinitionId: keyVaultSecretsOfficerRoleDefinitionId
    principalId: secretOperatorPrincipalId
    principalType: 'User'
  }
}

output keyVaultName string = keyVault.name
output secretReaderIdentityName string = secretReaderIdentity.name
output secretReaderIdentityId string = secretReaderIdentity.id
