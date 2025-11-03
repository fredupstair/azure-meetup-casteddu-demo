param(
    [Parameter(Mandatory=$true)]
    [string]$ClientId,
    
    [Parameter(Mandatory=$true)]
    [string]$ApimGatewayUrl
)

Write-Host "Updating Azure AD App Registration with APIM URL..." -ForegroundColor Green

# Get the app object ID
Write-Host "`nGetting App Registration details..." -ForegroundColor Yellow
$app = az ad app show --id $ClientId --output json | ConvertFrom-Json
$objectId = $app.id

Write-Host "Found App Object ID: $objectId" -ForegroundColor Cyan

# Get current redirect URIs
$currentRedirectUris = @()
if ($app.spa.redirectUris) {
    $currentRedirectUris = $app.spa.redirectUris
}

Write-Host "`nCurrent SPA Redirect URIs:" -ForegroundColor Yellow
$currentRedirectUris | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }

# Add APIM URL if not already present
$apimRedirectUri = "$ApimGatewayUrl/signin-oidc"
$sharePointUri = "https://*.sharepoint.com/*"
$updated = $false

if ($currentRedirectUris -notcontains $apimRedirectUri) {
    Write-Host "`nAdding APIM redirect URI: $apimRedirectUri" -ForegroundColor Yellow
    $currentRedirectUris += $apimRedirectUri
    $updated = $true
} else {
    Write-Host "`n✅ APIM redirect URI already configured" -ForegroundColor Green
}

if ($currentRedirectUris -notcontains $sharePointUri) {
    Write-Host "Adding SharePoint wildcard URI: $sharePointUri" -ForegroundColor Yellow
    $currentRedirectUris += $sharePointUri
    $updated = $true
} else {
    Write-Host "✅ SharePoint wildcard URI already configured" -ForegroundColor Green
}

# Update only if changes were made
if ($updated) {
    $spaConfig = @{
        spa = @{
            redirectUris = @($currentRedirectUris)
        }
    } | ConvertTo-Json -Depth 10
    
    # Save to temp file to avoid JSON escaping issues
    $tempFile = [System.IO.Path]::GetTempFileName()
    $spaConfig | Out-File -FilePath $tempFile -Encoding UTF8
    
    try {
        az rest `
            --method PATCH `
            --uri "https://graph.microsoft.com/v1.0/applications/$objectId" `
            --headers "Content-Type=application/json" `
            --body "@$tempFile"
        
        Write-Host "✅ App Registration redirect URIs updated successfully!" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Warning: Failed to update redirect URIs: $_" -ForegroundColor Yellow
        Write-Host "You may need to add them manually in Azure Portal" -ForegroundColor Yellow
    } finally {
        Remove-Item $tempFile -ErrorAction SilentlyContinue
    }
}

Write-Host "`nFinal SPA Redirect URIs:" -ForegroundColor Yellow
$updatedApp = az ad app show --id $ClientId --output json | ConvertFrom-Json
$updatedApp.spa.redirectUris | ForEach-Object { Write-Host "  - $_" -ForegroundColor Cyan }

Write-Host "`n✅ App Registration updated successfully!" -ForegroundColor Green
