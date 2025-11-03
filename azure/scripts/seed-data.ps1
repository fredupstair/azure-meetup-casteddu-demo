param(
    [Parameter(Mandatory=$false)]
    [string]$StorageAccountName = "prodcasteddustdemo",
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "rg-meetup-casteddu"
)

Write-Host "🌱 Seeding demo data to Azure Tables..." -ForegroundColor Green

# Get storage account key
$storageKey = az storage account keys list `
    --account-name $StorageAccountName `
    --resource-group $ResourceGroupName `
    --query "[0].value" -o tsv

# 1. Seed Production Stats
Write-Host "`n📊 Adding Production Statistics..." -ForegroundColor Yellow
$today = Get-Date -Format "yyyy-MM-dd"
az storage entity insert `
    --account-name $StorageAccountName `
    --account-key $storageKey `
    --table-name "ProductionStats" `
    --entity PartitionKey=STATS RowKey=$today totalPiecesProduced@odata.type=Edm.Int32 totalPiecesProduced=1247 averageProductionSpeed@odata.type=Edm.Double averageProductionSpeed=42.5 efficiency@odata.type=Edm.Double efficiency=94.2

# 2. Seed Production Items
Write-Host "📦 Adding Production Items..." -ForegroundColor Yellow
$items = @(
    @{code="PRD-2024-1150"; name="Widget A"; qty=500; status="Completed"},
    @{code="PRD-2024-1149"; name="Gadget B"; qty=350; status="Completed"},
    @{code="PRD-2024-1148"; name="Component C"; qty=800; status="Completed"},
    @{code="PRD-2024-1147"; name="Part D"; qty=250; status="In Progress"},
    @{code="PRD-2024-1146"; name="Assembly E"; qty=150; status="Completed"}
)

$timestamp = Get-Date
foreach ($item in $items) {
    $rowKey = $item.code
    $prodDate = $timestamp.AddHours(-($items.IndexOf($item) * 2)).ToString("o")
    
    az storage entity insert `
        --account-name $StorageAccountName `
        --account-key $storageKey `
        --table-name "ProductionItems" `
        --entity PartitionKey=ITEM RowKey=$rowKey itemCode=$($item.code) productName=$($item.name) quantity@odata.type=Edm.Int32 quantity=$($item.qty) productionDate=$prodDate status=$($item.status)
}

# 3. Seed Customers
Write-Host "👥 Adding Customers..." -ForegroundColor Yellow
$customers = @(
    @{code="CUST-001"; name="Acme Corporation"; orders=47; location="Milano"},
    @{code="CUST-002"; name="TechStart SRL"; orders=23; location="Roma"},
    @{code="CUST-003"; name="InnovaSolutions SpA"; orders=65; location="Cagliari"}
)

$timestamp = Get-Date
foreach ($customer in $customers) {
    $rowKey = $customer.code
    $orderDate = $timestamp.AddDays(-($customers.IndexOf($customer))).ToString("o")
    
    az storage entity insert `
        --account-name $StorageAccountName `
        --account-key $storageKey `
        --table-name "Customers" `
        --entity PartitionKey=CUSTOMER RowKey=$rowKey customerCode=$($customer.code) customerName=$($customer.name) totalOrders@odata.type=Edm.Int32 totalOrders=$($customer.orders) lastOrderDate=$orderDate location=$($customer.location)
}

Write-Host "`n✅ Demo data seeded successfully!" -ForegroundColor Green
