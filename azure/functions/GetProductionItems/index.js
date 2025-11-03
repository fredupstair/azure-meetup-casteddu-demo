"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetProductionItems = GetProductionItems;
const data_tables_1 = require("@azure/data-tables");
async function GetProductionItems(request, context) {
    context.log('GetProductionItems function triggered');
    try {
        const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id'
        };
        if (request.method === 'OPTIONS') {
            return { status: 204, headers };
        }
        // Get user ID from APIM header
        const userId = request.headers.get('x-user-id') || 'anonymous';
        context.log(`[DEBUG] User ID from header: ${userId}`);
        context.log(`[DEBUG] All headers:`, JSON.stringify([...request.headers]));
        const connectionString = process.env.AzureWebJobsStorage;
        const tableClient = data_tables_1.TableClient.fromConnectionString(connectionString, "ProductionItems");
        // If anonymous, return all items from all users
        if (userId === 'anonymous') {
            context.log('[DEBUG] Anonymous user - returning all items');
            const allItems = [];
            const iterator = tableClient.listEntities();
            for await (const entity of iterator) {
                allItems.push({
                    partitionKey: entity.partitionKey,
                    rowKey: entity.rowKey,
                    itemCode: entity.itemCode,
                    productName: entity.productName,
                    quantity: entity.quantity,
                    productionDate: entity.productionDate,
                    status: entity.status
                });
            }
            return {
                status: 200,
                headers,
                jsonBody: { allUsers: allItems, message: 'Showing all users data (anonymous mode)', count: allItems.length }
            };
        }
        // Get last 5 items for this specific user
        const items = [];
        const partitionKey = `${userId}_Items`;
        const iterator = tableClient.listEntities({
            queryOptions: { filter: `PartitionKey eq '${partitionKey}'` }
        });
        for await (const entity of iterator) {
            items.push({
                partitionKey: entity.partitionKey,
                rowKey: entity.rowKey,
                itemCode: entity.itemCode,
                productName: entity.productName,
                quantity: entity.quantity,
                productionDate: entity.productionDate,
                status: entity.status
            });
        }
        // Sort by production date (most recent first)
        items.sort((a, b) => new Date(b.productionDate).getTime() - new Date(a.productionDate).getTime());
        return {
            status: 200,
            headers,
            jsonBody: items
        };
    }
    catch (error) {
        context.error('Error in GetProductionItems:', error);
        return {
            status: 500,
            jsonBody: { error: 'Internal server error' }
        };
    }
}
// Registered in src/index.ts
//# sourceMappingURL=index.js.map