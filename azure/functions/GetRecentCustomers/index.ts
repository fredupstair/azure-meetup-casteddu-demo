import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { TableClient } from "@azure/data-tables";

interface Customer {
    partitionKey: string;
    rowKey: string;
    customerCode: string;
    customerName: string;
    lastOrderDate: string;
    totalOrders: number;
    location: string;
}

export async function GetRecentCustomers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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
        const tableClient = TableClient.fromConnectionString(connectionString, "Customers");

        // If anonymous, return all customers from all users
        if (userId === 'anonymous') {
            context.log('[DEBUG] Anonymous user - returning all customers');
            const allCustomers: Customer[] = [];
            const iterator = tableClient.listEntities<Customer>();
            for await (const entity of iterator) {
                allCustomers.push({
                    partitionKey: entity.partitionKey,
                    rowKey: entity.rowKey,
                    customerCode: entity.customerCode as string,
                    customerName: entity.customerName as string,
                    lastOrderDate: entity.lastOrderDate as string,
                    totalOrders: entity.totalOrders as number,
                    location: entity.location as string
                });
            }
            return {
                status: 200,
                headers,
                jsonBody: { allUsers: allCustomers, message: 'Showing all users data (anonymous mode)', count: allCustomers.length }
            };
        }

        const customers: Customer[] = [];
        const partitionKey = `${userId}_Customers`;
        const iterator = tableClient.listEntities<Customer>({
            queryOptions: { filter: `PartitionKey eq '${partitionKey}'` }
        });

        for await (const entity of iterator) {
            customers.push({
                partitionKey: entity.partitionKey,
                rowKey: entity.rowKey,
                customerCode: entity.customerCode as string,
                customerName: entity.customerName as string,
                lastOrderDate: entity.lastOrderDate as string,
                totalOrders: entity.totalOrders as number,
                location: entity.location as string
            });
        }

        // Sort by last order date
        customers.sort((a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime());

        return {
            status: 200,
            headers,
            jsonBody: customers
        };
    } catch (error) {
        context.error('Error in GetRecentCustomers:', error);
        return {
            status: 500,
            jsonBody: { error: 'Internal server error' }
        };
    }
}

// Registered in src/index.ts
