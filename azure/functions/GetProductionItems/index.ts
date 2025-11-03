import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { TableClient } from "@azure/data-tables";

interface ProductionItem {
    partitionKey: string;
    rowKey: string;
    itemCode: string;
    productName: string;
    quantity: number;
    productionDate: string;
    status: string;
}

export async function GetProductionItems(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('GetProductionItems function triggered');

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
        const tableClient = TableClient.fromConnectionString(connectionString, "ProductionItems");

        // Get last 5 items
        const items: ProductionItem[] = [];
        const iterator = tableClient.listEntities<ProductionItem>({
            queryOptions: { filter: "PartitionKey eq 'ITEM'" }
        });

        for await (const entity of iterator) {
            items.push({
                partitionKey: entity.partitionKey,
                rowKey: entity.rowKey,
                itemCode: entity.itemCode as string,
                productName: entity.productName as string,
                quantity: entity.quantity as number,
                productionDate: entity.productionDate as string,
                status: entity.status as string
            });
            
            if (items.length >= 5) break;
        }

        // Sort by production date (most recent first)
        items.sort((a, b) => new Date(b.productionDate).getTime() - new Date(a.productionDate).getTime());

        // If no items, return mock data
        if (items.length === 0) {
            return {
                status: 200,
                headers,
                jsonBody: [
                    { itemCode: "PRD-2024-1150", productName: "Widget A", quantity: 500, productionDate: new Date().toISOString(), status: "Completed" },
                    { itemCode: "PRD-2024-1149", productName: "Gadget B", quantity: 350, productionDate: new Date(Date.now() - 3600000).toISOString(), status: "Completed" },
                    { itemCode: "PRD-2024-1148", productName: "Component C", quantity: 800, productionDate: new Date(Date.now() - 7200000).toISOString(), status: "Completed" },
                    { itemCode: "PRD-2024-1147", productName: "Part D", quantity: 250, productionDate: new Date(Date.now() - 10800000).toISOString(), status: "In Progress" },
                    { itemCode: "PRD-2024-1146", productName: "Assembly E", quantity: 150, productionDate: new Date(Date.now() - 14400000).toISOString(), status: "Completed" }
                ]
            };
        }

        return {
            status: 200,
            headers,
            jsonBody: items.slice(0, 5)
        };
    } catch (error) {
        context.error('Error in GetProductionItems:', error);
        return {
            status: 500,
            jsonBody: { error: 'Internal server error' }
        };
    }
}

// Registered in src/index.ts
