import { AadHttpClient, HttpClientResponse } from '@microsoft/sp-http';
import { WebPartContext } from '@microsoft/sp-webpart-base';

export interface IProductionStats {
  date: string;
  totalPiecesProduced: number;
  averageProductionSpeed: number;
  efficiency: number;
  lastUpdated: string;
}

export interface IProductionItem {
  itemCode: string;
  productName: string;
  quantity: number;
  productionDate: string;
  status: string;
}

export interface ICustomer {
  customerCode: string;
  customerName: string;
  lastOrderDate: string;
  totalOrders: number;
  location: string;
}

export class ProductivityApiService {
  private aadHttpClient: AadHttpClient | null = null;

  constructor(
    private apiBaseUrl: string,
    private resourceUri: string
  ) {}

  private async ensureClient(context: WebPartContext): Promise<AadHttpClient> {
    if (!this.aadHttpClient) {
      this.aadHttpClient = await context.aadHttpClientFactory.getClient(this.resourceUri);
    }
    return this.aadHttpClient;
  }

  public async getProductionStats(context: WebPartContext): Promise<IProductionStats> {
    const client = await this.ensureClient(context);
    
    console.log('[ProductivityApiService] Getting stats from:', `${this.apiBaseUrl}/stats`);
    console.log('[ProductivityApiService] Resource URI:', this.resourceUri);
    
    const response: HttpClientResponse = await client.get(
      `${this.apiBaseUrl}/stats`,
      AadHttpClient.configurations.v1
    );

    console.log('[ProductivityApiService] Response status:', response.status);
    console.log('[ProductivityApiService] Response headers:', response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ProductivityApiService] Error response:', errorText);
      throw new Error(`Failed to get production stats: ${response.statusText}`);
    }

    return await response.json();
  }

  public async getProductionItems(context: WebPartContext): Promise<IProductionItem[]> {
    const client = await this.ensureClient(context);
    const response: HttpClientResponse = await client.get(
      `${this.apiBaseUrl}/items`,
      AadHttpClient.configurations.v1
    );

    if (!response.ok) {
      throw new Error(`Failed to get production items: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value || data; // Handle both {value: [...]} and [...] formats
  }

  public async getRecentCustomers(context: WebPartContext): Promise<ICustomer[]> {
    const client = await this.ensureClient(context);
    const response: HttpClientResponse = await client.get(
      `${this.apiBaseUrl}/customers`,
      AadHttpClient.configurations.v1
    );

    if (!response.ok) {
      throw new Error(`Failed to get recent customers: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value || data; // Handle both {value: [...]} and [...] formats
  }
}
