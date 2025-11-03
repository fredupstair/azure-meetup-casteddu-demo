param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,

    [Parameter(Mandatory=$false)]
    [string]$ApimName = "prodcasteddu-apim-demo",

    [Parameter(Mandatory=$false)]
    [string]$FunctionAppName = "prodcasteddu-func-demo",

    [Parameter(Mandatory=$false)]
    [string]$BackendName = "productivity-backend"
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Configure APIM Backend with Function Key" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Get subscription ID
$subscriptionId = (az account show --query id -o tsv)
Write-Host "✓ Subscription: $subscriptionId" -ForegroundColor Green

# Get function key
Write-Host "`nRetrieving function key from '$FunctionAppName'..." -ForegroundColor Yellow
$functionKeysJson = az functionapp keys list `
    -g $ResourceGroupName `
    -n $FunctionAppName `
    --query "functionKeys" `
    -o json

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to retrieve function keys" -ForegroundColor Red
    exit 1
}

$functionKeys = $functionKeysJson | ConvertFrom-Json
$functionKey = $functionKeys.default

Write-Host "✓ Function key retrieved" -ForegroundColor Green

# Prepare backend update with credentials
Write-Host "`nConfiguring APIM backend with function key..." -ForegroundColor Yellow

$backendUpdate = @{
    properties = @{
        credentials = @{
            query = @{
                code = @($functionKey)
            }
        }
    }
} | ConvertTo-Json -Depth 5

# Save to temp file
$tempFile = "temp-backend-config.json"
$backendUpdate | Out-File -FilePath $tempFile -Encoding UTF8

# Update backend via REST API
$backendUrl = "/subscriptions/$subscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.ApiManagement/service/$ApimName/backends/$BackendName`?api-version=2023-05-01-preview"

az rest --method PATCH --url $backendUrl --body "@$tempFile" | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to configure APIM backend" -ForegroundColor Red
    Remove-Item $tempFile -ErrorAction SilentlyContinue
    exit 1
}

Remove-Item $tempFile -ErrorAction SilentlyContinue

Write-Host "✓ APIM backend configured successfully" -ForegroundColor Green
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Configuration Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "The APIM backend '$BackendName' is now configured to pass" -ForegroundColor White
Write-Host "the function key automatically to Azure Functions." -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Test API endpoints through APIM" -ForegroundColor White
Write-Host "  2. Verify JWT validation is working" -ForegroundColor White
Write-Host "  3. Deploy SPFx solution" -ForegroundColor White
Write-Host ""
