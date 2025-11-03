param(
    [Parameter(Mandatory=$false)]
    [string]$AppName = "Productivity API"
)

Write-Host "Setting up Azure AD App Registration for SPFx integration" -ForegroundColor Green

# 1. Create App Registration
Write-Host "`nCreating Azure AD App Registration..." -ForegroundColor Yellow
$app = az ad app create `
    --display-name $AppName `
    --sign-in-audience "AzureADMyOrg" `
    --output json | ConvertFrom-Json

$appId = $app.appId
$objectId = $app.id

Write-Host "App Registration created!" -ForegroundColor Green
Write-Host "Application (client) ID: $appId" -ForegroundColor Cyan
Write-Host "Object ID: $objectId" -ForegroundColor Cyan

# 2. Set Application ID URI
Write-Host "`nSetting Application ID URI..." -ForegroundColor Yellow
az ad app update `
    --id $appId `
    --identifier-uris "api://$appId"

Write-Host "Application ID URI set to: api://$appId" -ForegroundColor Green

# 3. Expose an API - Add scope
Write-Host "`nExposing API with scope..." -ForegroundColor Yellow

$scopeId = [Guid]::NewGuid().ToString()
$oauth2Permissions = @{
    oauth2PermissionScopes = @(
        @{
            id = $scopeId
            adminConsentDescription = "Allow SPfx webpart to access Productivity API"
            adminConsentDisplayName = "Access Productivity API"
            userConsentDescription = "Allow the application to access Productivity API on your behalf"
            userConsentDisplayName = "Access Productivity API"
            type = "User"
            value = "user_impersonation"
            isEnabled = $true
        }
    )
} | ConvertTo-Json -Depth 10

# Save to temp file
$tempFile = [System.IO.Path]::GetTempFileName()
"{`"api`":$oauth2Permissions}" | Out-File -FilePath $tempFile -Encoding UTF8

# Update app with exposed API
try {
    az rest `
        --method PATCH `
        --uri "https://graph.microsoft.com/v1.0/applications/$objectId" `
        --headers "Content-Type=application/json" `
        --body "@$tempFile"
    
    Write-Host "API scope 'user_impersonation' created!" -ForegroundColor Green
} finally {
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}

# 4. Add initial SPA redirect URIs (basic SharePoint URIs)
Write-Host "`nAdding initial SPA redirect URIs..." -ForegroundColor Yellow
Write-Host "Note: APIM and additional URIs will be added automatically during deployment" -ForegroundColor Gray

$redirectUris = @(
    "https://localhost:4321/temp/workbench.html"
)

$spaConfig = @{
    spa = @{
        redirectUris = $redirectUris
    }
} | ConvertTo-Json -Depth 10

$tempFile2 = [System.IO.Path]::GetTempFileName()
$spaConfig | Out-File -FilePath $tempFile2 -Encoding UTF8

try {
    az rest `
        --method PATCH `
        --uri "https://graph.microsoft.com/v1.0/applications/$objectId" `
        --headers "Content-Type=application/json" `
        --body "@$tempFile2"
    
    Write-Host "Initial SPA redirect URIs configured!" -ForegroundColor Green
} finally {
    Remove-Item $tempFile2 -ErrorAction SilentlyContinue
}

# 5. Pre-authorize SharePoint Online
Write-Host "`nPre-authorizing SharePoint Online..." -ForegroundColor Yellow

$sharePointClientId = "00000003-0000-0ff1-ce00-000000000000"

$preAuthorizedApps = @{
    api = @{
        preAuthorizedApplications = @(
            @{
                appId = $sharePointClientId
                delegatedPermissionIds = @($scopeId)
            }
        )
    }
} | ConvertTo-Json -Depth 10

$tempFile3 = [System.IO.Path]::GetTempFileName()
$preAuthorizedApps | Out-File -FilePath $tempFile3 -Encoding UTF8

try {
    az rest `
        --method PATCH `
        --uri "https://graph.microsoft.com/v1.0/applications/$objectId" `
        --headers "Content-Type=application/json" `
        --body "@$tempFile3"
    
    Write-Host "SharePoint Online pre-authorized!" -ForegroundColor Green
} finally {
    Remove-Item $tempFile3 -ErrorAction SilentlyContinue
}

# 6. Get Tenant ID
$tenantId = az account show --query tenantId -o tsv

# Output configuration
Write-Host "`nAzure AD App Registration completed successfully!" -ForegroundColor Green
Write-Host "`nConfiguration Details:" -ForegroundColor Yellow
Write-Host "------------------------------------------------------" -ForegroundColor Gray
Write-Host "Application (Client) ID: $appId" -ForegroundColor Cyan
Write-Host "Tenant ID: $tenantId" -ForegroundColor Cyan
Write-Host "Application ID URI: api://$appId" -ForegroundColor Cyan
Write-Host "Scope: api://$appId/user_impersonation" -ForegroundColor Cyan
Write-Host "------------------------------------------------------" -ForegroundColor Gray

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Use the Client ID in your Bicep deployment:" -ForegroundColor White
Write-Host "   ./deploy.ps1 -ResourceGroupName rg-meetup-casteddu -ApiClientId $appId" -ForegroundColor Cyan
Write-Host "`n2. The deployment will automatically add:" -ForegroundColor White
Write-Host "   - APIM Gateway URL as redirect URI" -ForegroundColor Gray
Write-Host "   - SharePoint wildcard URI (https://*.sharepoint.com/*)" -ForegroundColor Gray

# Save to file
$configDir = Join-Path $PSScriptRoot "..\config"
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

$config = @{
    clientId = $appId
    tenantId = $tenantId
    applicationIdUri = "api://$appId"
    scope = "api://$appId/user_impersonation"
    createdDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
} | ConvertTo-Json

$configPath = Join-Path $configDir "aad-app-config.json"
$config | Out-File -FilePath $configPath -Encoding UTF8
Write-Host "`nConfiguration saved to: $configPath" -ForegroundColor Yellow
