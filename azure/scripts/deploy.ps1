param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "westeurope",
    
    [Parameter(Mandatory=$false)]
    [string]$BaseName = "prodcasteddu",
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "demo",

    [Parameter(Mandatory=$true)]
    [string]$ApiClientId
)

Write-Host "Starting deployment for Azure Meetup Casteddu Demo" -ForegroundColor Green

# Verify ApiClientId
if ([string]::IsNullOrWhiteSpace($ApiClientId)) {
    Write-Host "❌ Error: ApiClientId is required!" -ForegroundColor Red
    Write-Host "Run setup-aad-app.ps1 first to create the Azure AD App Registration" -ForegroundColor Yellow
    exit 1
}

# 1. Create Resource Group
Write-Host "`nCreating Resource Group..." -ForegroundColor Yellow
az group create --name $ResourceGroupName --location $Location

# 2. Deploy Infrastructure
Write-Host "`nDeploying Azure Infrastructure..." -ForegroundColor Yellow
$deploymentResult = az deployment group create `
    --resource-group $ResourceGroupName `
    --template-file "../infrastructure/main.bicep" `
    --parameters baseName=$BaseName environment=$Environment apiClientId=$ApiClientId `
    --output json

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Infrastructure deployment failed!" -ForegroundColor Red
    Write-Host "Check the error messages above for details" -ForegroundColor Yellow
    exit 1
}

$deployment = $deploymentResult | ConvertFrom-Json

$functionAppName = $deployment.properties.outputs.functionAppName.value
$apimGatewayUrl = $deployment.properties.outputs.apimGatewayUrl.value
$apimName = $deployment.properties.outputs.apimName.value
$apiResourceUri = $deployment.properties.outputs.apiResourceUri.value
$tenantId = $deployment.properties.outputs.tenantId.value

Write-Host "Infrastructure deployed successfully!" -ForegroundColor Green
Write-Host "   Function App: $functionAppName" -ForegroundColor Cyan
Write-Host "   APIM Gateway: $apimGatewayUrl" -ForegroundColor Cyan

# 2.5 Update Azure AD App Registration with APIM URL
Write-Host "`nUpdating Azure AD App Registration with APIM URL..." -ForegroundColor Yellow
.\update-aad-app-post-deploy.ps1 -ClientId $ApiClientId -ApimGatewayUrl $apimGatewayUrl

# 2.6 Configure APIM Backend with Function Key
Write-Host "`nConfiguring APIM Backend with Function Key..." -ForegroundColor Yellow
.\configure-apim-backend.ps1 -ResourceGroupName $ResourceGroupName -ApimName $apimName -FunctionAppName $functionAppName

# 3. Build and Deploy Functions
Write-Host "`nBuilding and deploying Azure Functions..." -ForegroundColor Yellow
.\deploy-functions.ps1 -ResourceGroupName $ResourceGroupName -FunctionAppName $functionAppName

# 4. Get APIM Subscription Key
Write-Host "`nGetting API Management Subscription Key..." -ForegroundColor Yellow
$subscriptionKey = az rest `
    --method POST `
    --url "https://management.azure.com/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$ResourceGroupName/providers/Microsoft.ApiManagement/service/$apimName/subscriptions/master/listSecrets?api-version=2023-05-01-preview" `
    --query primaryKey -o tsv

Write-Host "`nDeployment completed successfully!" -ForegroundColor Green
Write-Host "`nConfiguration for SPFx:" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------------" -ForegroundColor Gray
Write-Host "API Gateway URL:          " -NoNewline -ForegroundColor White
Write-Host "$apimGatewayUrl/productivity" -ForegroundColor Cyan
Write-Host "Azure AD Resource URI:    " -NoNewline -ForegroundColor White
Write-Host $apiResourceUri -ForegroundColor Cyan
Write-Host "Azure AD Tenant ID:       " -NoNewline -ForegroundColor White
Write-Host $tenantId -ForegroundColor Cyan
Write-Host "--------------------------------------------------------------" -ForegroundColor Gray
Write-Host "`nSPFx package-solution.json webApiPermissionRequests:" -ForegroundColor Yellow
$exampleJson = @"
  {
    "resource": "Productivity API",
    "scope": "user_impersonation"
  }
"@
Write-Host $exampleJson -ForegroundColor Cyan
Write-Host "`nRemember to approve API permissions in SharePoint Admin Center after deployment!" -ForegroundColor Yellow
