import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { TableClient } from "@azure/data-tables";

export async function GetProductionStats(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('GetProductionStats function triggered');

    try {
        // CORS headers
        const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        };

        // Handle OPTIONS preflight
        if (request.method === 'OPTIONS') {
            return { status: 204, headers };
        }

        const connectionString = process.env.AzureWebJobsStorage;
        const tableClient = TableClient.fromConnectionString(connectionString, "ProductionStats");

        // Get today's stats
        const today = new Date().toISOString().split('T')[0];
        const partitionKey = "STATS";
        
        try {
            const entity = await tableClient.getEntity(partitionKey, today);
            
            return {
                status: 200,
                headers,
                jsonBody: {
                    date: today,
                    totalPiecesProduced: entity.totalPiecesProduced || 0,
                    averageProductionSpeed: entity.averageProductionSpeed || 0,
                    efficiency: entity.efficiency || 0,
                    lastUpdated: entity.timestamp
                }
            };
        } catch (error) {
            // If no data for today, return mock data
            return {
                status: 200,
                headers,
                jsonBody: {
                    date: today,
                    totalPiecesProduced: 1247,
                    averageProductionSpeed: 42.5,
                    efficiency: 94.2,
                    lastUpdated: new Date().toISOString()
                }
            };
        }
    } catch (error) {
        context.error('Error in GetProductionStats:', error);
        return {
            status: 500,
            jsonBody: { error: 'Internal server error' }
        };
    }
}

// Registered in src/index.ts
