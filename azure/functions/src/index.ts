import { app } from '@azure/functions';
import { GetProductionStats } from '../GetProductionStats/index';
import { GetProductionItems } from '../GetProductionItems/index';
import { GetRecentCustomers } from '../GetRecentCustomers/index';

app.http('GetProductionStats', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'GetProductionStats',
    handler: GetProductionStats
});

app.http('GetProductionItems', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'GetProductionItems',
    handler: GetProductionItems
});

app.http('GetRecentCustomers', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'GetRecentCustomers',
    handler: GetRecentCustomers
});
