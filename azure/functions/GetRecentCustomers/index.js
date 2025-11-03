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
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        };
        if (request.method === 'OPTIONS') {
            return { status: 204, headers };
        }
        const connectionString = process.env.AzureWebJobsStorage;
        const tableClient = data_tables_1.TableClient.fromConnectionString(connectionString, "Customers");
        const customers = [];
        const iterator = tableClient.listEntities({
            queryOptions: { filter: "PartitionKey eq 'CUSTOMER'" }
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
            if (customers.length >= 3)
                break;
        }
        // Sort by last order date
        customers.sort((a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime());
        // If no customers, return mock data
        if (customers.length === 0) {
            return {
                status: 200,
                headers,
                jsonBody: [
                    { customerCode: "CUST-001", customerName: "Acme Corporation", lastOrderDate: new Date().toISOString(), totalOrders: 47, location: "Milano" },
                    { customerCode: "CUST-002", customerName: "TechStart SRL", lastOrderDate: new Date(Date.now() - 86400000).toISOString(), totalOrders: 23, location: "Roma" },
                    { customerCode: "CUST-003", customerName: "InnovaSolutions SpA", lastOrderDate: new Date(Date.now() - 172800000).toISOString(), totalOrders: 65, location: "Cagliari" }
                ]
            };
        }
        return {
            status: 200,
            headers,
            jsonBody: customers.slice(0, 3)
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