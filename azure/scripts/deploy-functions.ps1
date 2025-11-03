param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "rg-meetup-casteddu",
    
    [Parameter(Mandatory=$false)]
    [string]$FunctionAppName = "prodcasteddu-func-demo"
)

Write-Host "Deploying Azure Functions..." -ForegroundColor Green

# Change to functions directory
$functionsDir = Join-Path $PSScriptRoot "..\functions"
Push-Location $functionsDir

try {
    # Clean
    Write-Host "`nCleaning..." -ForegroundColor Yellow
    Remove-Item deploy.zip -ErrorAction SilentlyContinue
    Get-ChildItem -Recurse -Include "*.js", "*.js.map" | Where-Object { $_.Directory.Name -match "^Get" } | Remove-Item -Force

    # Install & Build
    Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
    npm install

    Write-Host "`nBuilding TypeScript..." -ForegroundColor Yellow
    npm run build

    # Verify
    $jsFiles = Get-ChildItem -Recurse -Include "index.js" | Where-Object { $_.Directory.Name -match "^Get" }
    Write-Host "Found $($jsFiles.Count) compiled functions" -ForegroundColor Cyan

    # Package
    Write-Host "`nCreating package..." -ForegroundColor Yellow
    $tempDir = Join-Path $env:TEMP "funcdeploy$(Get-Date -Format 'yyyyMMddHHmmss')"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

    try {
        Copy-Item host.json $tempDir
        Copy-Item package.json $tempDir
        
        # Copy src folder
        Copy-Item src $tempDir -Recurse -Force
        
        # Copy function folders (only .js, no function.json for v4)
        Get-ChildItem -Directory | Where-Object { $_.Name -match "^Get" } | ForEach-Object {
            $targetDir = Join-Path $tempDir $_.Name
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
            Copy-Item (Join-Path $_.FullName "index.js") $targetDir -ErrorAction SilentlyContinue
        }
        
        Write-Host "Installing production dependencies..." -ForegroundColor Gray
        npm install --omit=dev --silent
        Copy-Item node_modules $tempDir -Recurse -Force
        
        Compress-Archive -Path "$tempDir\*" -DestinationPath deploy.zip -Force
        Write-Host "Package created" -ForegroundColor Green
        
        # Deploy
        Write-Host "`nDeploying..." -ForegroundColor Yellow
        az functionapp deployment source config-zip -g $ResourceGroupName -n $FunctionAppName --src deploy.zip --timeout 600
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`nDeployment completed!" -ForegroundColor Green
            Start-Sleep -Seconds 5
            az functionapp function list -g $ResourceGroupName -n $FunctionAppName --query "[].{Name:name}" -o table
        } else {
            Write-Host "`nDeployment failed!" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "`nError: $_" -ForegroundColor Red
    }
    finally {
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
finally {
    Pop-Location
}
