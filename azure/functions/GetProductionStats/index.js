"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetProductionStats = GetProductionStats;
const data_tables_1 = require("@azure/data-tables");
async function GetProductionStats(request, context) {
    context.log('GetProductionStats function triggered');
    try {
        // CORS headers
        const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id'
        };
        // Handle OPTIONS preflight
        if (request.method === 'OPTIONS') {
            return { status: 204, headers };
        }
        // Get user ID from APIM header
        const userId = request.headers.get('x-user-id') || 'anonymous';
        context.log(`User ID: ${userId}`);
        const connectionString = process.env.AzureWebJobsStorage;
        const tableClient = data_tables_1.TableClient.fromConnectionString(connectionString, "ProductionStats");
        // If anonymous, return all stats from all users
        if (userId === 'anonymous') {
            context.log('[DEBUG] Anonymous user - returning all stats');
            const allStats = [];
            const iterator = tableClient.listEntities();
            for await (const entity of iterator) {
                allStats.push({
                    partitionKey: entity.partitionKey,
                    rowKey: entity.rowKey,
                    totalPiecesProduced: entity.totalPiecesProduced,
                    averageProductionSpeed: entity.averageProductionSpeed,
                    efficiency: entity.efficiency,
                    lastUpdated: entity.timestamp
                });
            }
            return {
                status: 200,
                headers,
                jsonBody: { allUsers: allStats, message: 'Showing all users data (anonymous mode)', count: allStats.length }
            };
        }
        // Get today's stats for this specific user
        const today = new Date().toISOString().split('T')[0];
        const partitionKey = `${userId}_Stats`;
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
        }
        catch (error) {
            // No data found - return empty stats
            context.log('[DEBUG] No stats found for user:', userId);
            return {
                status: 200,
                headers,
                jsonBody: {
                    date: today,
                    totalPiecesProduced: 0,
                    averageProductionSpeed: 0,
                    efficiency: 0,
                    lastUpdated: new Date().toISOString()
                }
            };
        }
    }
    catch (error) {
        context.error('Error in GetProductionStats:', error);
        return {
            status: 500,
            jsonBody: { error: 'Internal server error' }
        };
    }
}
// Registered in src/index.ts
//# sourceMappingURL=index.js.map