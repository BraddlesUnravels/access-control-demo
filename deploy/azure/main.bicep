targetScope = 'resourceGroup'

@description('Azure region for the Container Apps environment and application.')
param location string = resourceGroup().location

@description('Name of the Azure Container Apps environment.')
param environmentName string = 'acae-access-control-demo'

@description('Name of the Azure Container App.')
param containerAppName string = 'aca-access-control-demo'

@description('Immutable public container image reference tagged with the Git commit SHA.')
param image string

@description('Hosted Supabase project URL.')
param supabaseUrl string

@secure()
@description('Supabase publishable key. RLS remains the security boundary.')
param supabasePublishableKey string

var commonTags = {
  application: 'access-control-demo'
  environment: 'production'
  managedBy: 'bicep'
}

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2026-01-01' = {
  name: environmentName
  location: location
  tags: commonTags
  properties: {
    appLogsConfiguration: {
      destination: 'none'
    }
  }
}

resource containerApp 'Microsoft.App/containerApps@2026-01-01' = {
  name: containerAppName
  location: location
  tags: commonTags
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      maxInactiveRevisions: 1
      ingress: {
        external: true
        allowInsecure: false
        targetPort: 3000
        transport: 'auto'
      }
      secrets: [
        {
          name: 'supabase-publishable-key'
          value: supabasePublishableKey
        }
      ]
    }
    template: {
      terminationGracePeriodSeconds: 30
      containers: [
        {
          name: 'web'
          image: image
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'NEXT_TELEMETRY_DISABLED'
              value: '1'
            }
            {
              name: 'HOSTNAME'
              value: '0.0.0.0'
            }
            {
              name: 'PORT'
              value: '3000'
            }
            {
              name: 'NEXT_PUBLIC_SUPABASE_URL'
              value: supabaseUrl
            }
            {
              name: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
              secretRef: 'supabase-publishable-key'
            }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          probes: [
            {
              type: 'Startup'
              httpGet: {
                path: '/api/health'
                port: 3000
              }
              initialDelaySeconds: 2
              periodSeconds: 3
              timeoutSeconds: 2
              failureThreshold: 10
              successThreshold: 1
            }
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/health'
                port: 3000
              }
              initialDelaySeconds: 10
              periodSeconds: 30
              timeoutSeconds: 3
              failureThreshold: 3
              successThreshold: 1
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/health'
                port: 3000
              }
              initialDelaySeconds: 5
              periodSeconds: 10
              timeoutSeconds: 3
              failureThreshold: 3
              successThreshold: 1
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

output applicationName string = containerApp.name
output applicationFqdn string = containerApp.properties.configuration.ingress.fqdn
output applicationUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
