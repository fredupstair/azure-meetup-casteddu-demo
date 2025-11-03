"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetRecentCustomers = GetRecentCustomers;
const data_tables_1 = require("@azure/data-tables");
async function GetRecentCustomers(request, context) {
    context.log('GetRecentCustomers function triggered');
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
        context.log(`User ID: ${userId}`);
        const connectionString = process.env.AzureWebJobsStorage;
        const tableClient = data_tables_1.TableClient.fromConnectionString(connectionString, "Customers");
        // If anonymous, return all customers from all users
        if (userId === 'anonymous') {
            context.log('[DEBUG] Anonymous user - returning all customers');
            const allCustomers = [];
            const iterator = tableClient.listEntities();
            for await (const entity of iterator) {
                allCustomers.push({
                    partitionKey: entity.partitionKey,
                    rowKey: entity.rowKey,
                    customerCode: entity.customerCode,
                    customerName: entity.customerName,
                    lastOrderDate: entity.lastOrderDate,
                    totalOrders: entity.totalOrders,
                    location: entity.location
                });
            }
            return {
                status: 200,
                headers,
                jsonBody: { allUsers: allCustomers, message: 'Showing all users data (anonymous mode)', count: allCustomers.length }
            };
        }
        const customers = [];
        const partitionKey = `${userId}_Customers`;
        const iterator = tableClient.listEntities({
            queryOptions: { filter: `PartitionKey eq '${partitionKey}'` }
        });
        for await (const entity of iterator) {
            customers.push({
                partitionKey: entity.partitionKey,
                rowKey: entity.rowKey,
                customerCode: entity.customerCode,
                customerName: entity.customerName,
                lastOrderDate: entity.lastOrderDate,
                totalOrders: entity.totalOrders,
                location: entity.location
            });
        }
        // Sort by last order date
        customers.sort((a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime());
        return {
            status: 200,
            headers,
            jsonBody: customers
        };
    }
    catch (error) {
        context.error('Error in GetRecentCustomers:', error);
        return {
            status: 500,
            jsonBody: { error: 'Internal server error' }
        };
    }
}
// Registered in src/index.ts
//# sourceMappingURL=index.js.map