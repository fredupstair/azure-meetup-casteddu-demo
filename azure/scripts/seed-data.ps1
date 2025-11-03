param(
    [Parameter(Mandatory=$false)]
    [string]$StorageAccountName = "prodcasteddudemost",
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "rg-meetup-casteddu"
)

Write-Host "Seeding multi-user demo data to Azure Tables..." -ForegroundColor Green

# Get storage account key
$storageKey = az storage account keys list `
    --account-name $StorageAccountName `
    --resource-group $ResourceGroupName `
    --query "[0].value" -o tsv

# Define test users (use real Azure AD Object IDs from your tenant)
# You can get user OIDs with: az ad user show --id user@domain.com --query id -o tsv
$users = @(
    @{oid="83834e24-e320-4221-b70a-0468aa59edaa"; name="Federico Porceddu"},
    @{oid="00000000-0000-0000-0000-000000000001"; name="Test User 1"},
    @{oid="00000000-0000-0000-0000-000000000002"; name="Test User 2"}
)

Write-Host "`nCreating data for $($users.Count) users..." -ForegroundColor Cyan

foreach ($user in $users) {
    $userId = $user.oid
    $userName = $user.name
    Write-Host "`n  User: $userName ($userId)" -ForegroundColor Yellow
    
    # 1. Seed Production Stats for this user
    Write-Host "    Adding Production Statistics..." -ForegroundColor Gray
    $today = Get-Date -Format "yyyy-MM-dd"
    $partitionKey = "${userId}_Stats"
    
    # Randomize stats per user
    $totalPieces = Get-Random -Minimum 1000 -Maximum 2000
    $avgSpeed = [math]::Round((Get-Random -Minimum 35 -Maximum 50) + (Get-Random) / 10, 1)
    $efficiency = [math]::Round((Get-Random -Minimum 85 -Maximum 98) + (Get-Random) / 10, 1)
    
    az storage entity insert `
        --account-name $StorageAccountName `
        --account-key $storageKey `
        --table-name "ProductionStats" `
        --entity PartitionKey=$partitionKey RowKey=$today totalPiecesProduced@odata.type=Edm.Int32 totalPiecesProduced=$totalPieces averageProductionSpeed@odata.type=Edm.Double averageProductionSpeed=$avgSpeed efficiency@odata.type=Edm.Double efficiency=$efficiency

    # 2. Seed Production Items for this user
    Write-Host "    Adding Production Items..." -ForegroundColor Gray
    $partitionKey = "${userId}_Items"
    
    $items = @(
        @{code="PRD-2024-1150"; name="Widget A"; qty=500; status="Completed"},
        @{code="PRD-2024-1149"; name="Gadget B"; qty=350; status="Completed"},
        @{code="PRD-2024-1148"; name="Component C"; qty=800; status="Completed"},
        @{code="PRD-2024-1147"; name="Part D"; qty=250; status="In Progress"},
        @{code="PRD-2024-1146"; name="Assembly E"; qty=150; status="Completed"}
    )

    $timestamp = Get-Date
    foreach ($item in $items) {
        $rowKey = "$userId-$($item.code)"
        $prodDate = $timestamp.AddHours(-($items.IndexOf($item) * 2)).ToString("o")
        
        az storage entity insert `
            --account-name $StorageAccountName `
            --account-key $storageKey `
            --table-name "ProductionItems" `
            --entity PartitionKey=$partitionKey RowKey=$rowKey itemCode=$($item.code) productName=$($item.name) quantity@odata.type=Edm.Int32 quantity=$($item.qty) productionDate=$prodDate status=$($item.status)
    }

    # 3. Seed Customers for this user
    Write-Host "    Adding Customers..." -ForegroundColor Gray
    $partitionKey = "${userId}_Customers"
    
    $customers = @(
        @{code="CUST-001"; name="Acme Corporation"; orders=47; location="Milano"},
        @{code="CUST-002"; name="TechStart SRL"; orders=23; location="Roma"},
        @{code="CUST-003"; name="InnovaSolutions SpA"; orders=65; location="Cagliari"}
    )

    $timestamp = Get-Date
    foreach ($customer in $customers) {
        $rowKey = "$userId-$($customer.code)"
        $orderDate = $timestamp.AddDays(-($customers.IndexOf($customer))).ToString("o")
        
        az storage entity insert `
            --account-name $StorageAccountName `
            --account-key $storageKey `
            --table-name "Customers" `
            --entity PartitionKey=$partitionKey RowKey=$rowKey customerCode=$($customer.code) customerName=$($customer.name) totalOrders@odata.type=Edm.Int32 totalOrders=$($customer.orders) lastOrderDate=$orderDate location=$($customer.location)
    }
}

Write-Host "`nMulti-user demo data seeded successfully!" -ForegroundColor Green
Write-Host "   Created data for $($users.Count) users with user-based partitioning" -ForegroundColor Green
