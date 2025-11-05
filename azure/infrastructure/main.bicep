@description('Location for all resources')
param location string = resourceGroup().location

@description('Base name for resources')
param baseName string = 'prodcasteddu'

@description('Environment name')
param environment string = 'demo'

@description('Azure AD Tenant ID for API authentication')
param tenantId string = tenant().tenantId

@description('Azure AD Application (Client) ID for the API')
param apiClientId string

@description('SharePoint tenant URL for CORS (e.g., https://contoso.sharepoint.com)')
param sharePointTenantUrl string = 'https://YOUR-TENANT.sharepoint.com'

var functionAppName = '${baseName}-func-${environment}'
var storageAccountName = toLower(replace('${baseName}${environment}st', '-', ''))
var appServicePlanName = '${baseName}-plan-${environment}'
var apimName = '${baseName}-apim-${environment}'
var appInsightsName = '${baseName}-ai-${environment}'

// Storage Account for Azure Functions and Table Storage
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
  }
}

// Table Service
resource tableService 'Microsoft.Storage/storageAccounts/tableServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

// Tables
resource productionStatsTable 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-01-01' = {
  parent: tableService
  name: 'ProductionStats'
}

resource productionItemsTable 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-01-01' = {
  parent: tableService
  name: 'ProductionItems'
}

resource customersTable 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-01-01' = {
  parent: tableService
  name: 'Customers'
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    RetentionInDays: 30
  }
}

// App Service Plan (Consumption)
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {}
}

// Function App
resource functionApp 'Microsoft.Web/sites@2023-01-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${az.environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${az.environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower(functionAppName)
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
      ]
      cors: {
        allowedOrigins: [
          '*'
        ]
      }
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
    }
    httpsOnly: true
  }
}

// API Management
resource apim 'Microsoft.ApiManagement/service@2023-05-01-preview' = {
  name: apimName
  location: location
  sku: {
    name: 'Consumption'
    capacity: 0
  }
  properties: {
    publisherEmail: 'admin@casteddu.com'
    publisherName: 'Azure Meetup Casteddu'
  }
}

// API Management - Backend (Functions)
// NOTE: Function key credentials must be configured post-deployment via script
// Run: scripts/configure-apim-backend.ps1 after deployment
resource apimBackend 'Microsoft.ApiManagement/service/backends@2023-05-01-preview' = {
  parent: apim
  name: 'productivity-backend'
  properties: {
    description: 'Azure Functions Backend'
    url: 'https://${functionApp.properties.defaultHostName}/api'
    protocol: 'http'
    resourceId: '${az.environment().resourceManager}${functionApp.id}'
  }
}

// API Management - API
resource apimApi 'Microsoft.ApiManagement/service/apis@2023-05-01-preview' = {
  parent: apim
  name: 'productivity-api'
  properties: {
    displayName: 'Productivity API'
    apiRevision: '1'
    subscriptionRequired: false
    path: 'productivity'
    protocols: [
      'https'
    ]
  }
}

// API Management - Operations
resource getStatsOperation 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = {
  parent: apimApi
  name: 'get-production-stats'
  properties: {
    displayName: 'Get Production Statistics'
    method: 'GET'
    urlTemplate: '/stats'
    description: 'Get current production statistics'
  }
}

resource getItemsOperation 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = {
  parent: apimApi
  name: 'get-production-items'
  properties: {
    displayName: 'Get Production Items'
    method: 'GET'
    urlTemplate: '/items'
    description: 'Get last 5 production items'
  }
}

resource getCustomersOperation 'Microsoft.ApiManagement/service/apis/operations@2023-05-01-preview' = {
  parent: apimApi
  name: 'get-recent-customers'
  properties: {
    displayName: 'Get Recent Customers'
    method: 'GET'
    urlTemplate: '/customers'
    description: 'Get 3 most recent customers'
  }
}

// API Management - Operation Policies (URL Rewrite)
resource getStatsOperationPolicy 'Microsoft.ApiManagement/service/apis/operations/policies@2023-05-01-preview' = {
  parent: getStatsOperation
  name: 'policy'
  properties: {
    format: 'rawxml'
    value: '<policies><inbound><base /><rewrite-uri template="/GetProductionStats" /></inbound><backend><base /></backend><outbound><base /></outbound><on-error><base /></on-error></policies>'
  }
}

resource getItemsOperationPolicy 'Microsoft.ApiManagement/service/apis/operations/policies@2023-05-01-preview' = {
  parent: getItemsOperation
  name: 'policy'
  properties: {
    format: 'rawxml'
    value: '<policies><inbound><base /><rewrite-uri template="/GetProductionItems" /></inbound><backend><base /></backend><outbound><base /></outbound><on-error><base /></on-error></policies>'
  }
}

resource getCustomersOperationPolicy 'Microsoft.ApiManagement/service/apis/operations/policies@2023-05-01-preview' = {
  parent: getCustomersOperation
  name: 'policy'
  properties: {
    format: 'rawxml'
    value: '<policies><inbound><base /><rewrite-uri template="/GetRecentCustomers" /></inbound><backend><base /></backend><outbound><base /></outbound><on-error><base /></on-error></policies>'
  }
}

// API Management - API Policy (JWT Validation + CORS + Backend + User Context)
resource apimApiPolicy 'Microsoft.ApiManagement/service/apis/policies@2023-05-01-preview' = {
  parent: apimApi
  name: 'policy'
  properties: {
    format: 'rawxml'
    value: '<policies><inbound><base /><cors allow-credentials="true"><allowed-origins><origin>${sharePointTenantUrl}</origin></allowed-origins><allowed-methods><method>GET</method><method>POST</method><method>OPTIONS</method></allowed-methods><allowed-headers><header>*</header></allowed-headers><expose-headers><header>*</header></expose-headers></cors><validate-jwt header-name="Authorization" failed-validation-httpcode="401" failed-validation-error-message="Unauthorized. Access token is missing or invalid."><openid-config url="https://login.microsoftonline.com/${tenantId}/.well-known/openid-configuration" /><audiences><audience>api://${apiClientId}</audience></audiences><issuers><issuer>https://sts.windows.net/${tenantId}/</issuer></issuers></validate-jwt><set-header name="X-User-Id" exists-action="override"><value>@{var jwt = context.Request.Headers.GetValueOrDefault("Authorization","").AsJwt(); return jwt != null ? jwt.Claims.GetValueOrDefault("oid", "anonymous") : "anonymous";}</value></set-header><set-backend-service backend-id="productivity-backend" /></inbound><backend><base /></backend><outbound><base /></outbound><on-error><base /></on-error></policies>'
  }
}

// Outputs
output functionAppName string = functionApp.name
output apimGatewayUrl string = apim.properties.gatewayUrl
output apimName string = apim.name
output storageAccountName string = storageAccount.name
output apiResourceUri string = 'api://${apiClientId}'
output tenantId string = tenantId
