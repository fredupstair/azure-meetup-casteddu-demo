"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const index_1 = require("../GetProductionStats/index");
const index_2 = require("../GetProductionItems/index");
const index_3 = require("../GetRecentCustomers/index");
functions_1.app.http('GetProductionStats', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'GetProductionStats',
    handler: index_1.GetProductionStats
});
functions_1.app.http('GetProductionItems', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'GetProductionItems',
    handler: index_2.GetProductionItems
});
functions_1.app.http('GetRecentCustomers', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'GetRecentCustomers',
    handler: index_3.GetRecentCustomers
});
//# sourceMappingURL=index.js.map