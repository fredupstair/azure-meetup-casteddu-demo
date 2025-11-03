# SPFx Integration Guide - Azure AD Authentication

Questa guida spiega come configurare l'autenticazione Azure AD sicura tra SPFx e Azure API Management usando `AadHttpClient`.

## 🔐 Architettura di Autenticazione

```
┌─────────────────────────────────────────────────────┐
│         SharePoint Framework WebPart                │
│                                                      │
│  AadHttpClient (con token Azure AD)                │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ Bearer Token
                      │ Authorization: Bearer eyJ0eXAi...
                      │
                      ▼
         ┌────────────────────────────┐
         │   Azure API Management     │
         │                            │
         │  validate-jwt policy       │
         │  - Verifica issuer         │
         │  - Verifica audience       │
         │  - Valida signature        │
         └────────────────────────────┘
                      │
                      │ Request autenticata
                      │
                      ▼
         ┌────────────────────────────┐
         │    Azure Functions         │
         │   (Backend API)            │
         └────────────────────────────┘
```

## 📋 Setup Completo

### 1. Creare Azure AD App Registration

```powershell
cd azure/scripts
./setup-aad-app.ps1 -AppName "Productivity API"
```

Questo script:
- ✅ Crea l'App Registration in Azure AD
- ✅ Imposta l'Application ID URI (`api://{client-id}`)
- ✅ Espone un API scope `user_impersonation`
- ✅ Configura SPA redirect URIs per SharePoint
- ✅ Pre-autorizza SharePoint Online
- ✅ Salva la configurazione in `azure/config/aad-app-config.json`

**Salva il Client ID** mostrato nell'output!

### 2. Deploy Infrastructure Azure

```powershell
./deploy.ps1 -ResourceGroupName "rg-meetup-casteddu" -ApiClientId "YOUR-CLIENT-ID-HERE"
```

### 3. Configurare SPFx WebPart

#### A. Modificare `config/package-solution.json`

Aggiungi la sezione `webApiPermissionRequests`:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/spfx-build/package-solution.schema.json",
  "solution": {
    "name": "my-productivity-client-side-solution",
    "id": "...",
    "version": "1.0.0.0",
    "webApiPermissionRequests": [
      {
        "resource": "Productivity API",
        "scope": "user_impersonation"
      },
      {
        "resource": "Microsoft Graph",
        "scope": "Calendars.Read"
      },
      {
        "resource": "Microsoft Graph",
        "scope": "Mail.Read"
      }
    ]
  }
}
```

#### B. Creare il Service per chiamare l'API

Crea `src/services/ProductivityApiService.ts`:

```typescript
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
  private aadHttpClient: AadHttpClient;
  private apiBaseUrl: string;
  private resourceUri: string;

  constructor(context: WebPartContext, apiBaseUrl: string, resourceUri: string) {
    this.apiBaseUrl = apiBaseUrl;
    this.resourceUri = resourceUri;
    
    // AadHttpClient viene inizializzato async
    context.aadHttpClientFactory
      .getClient(resourceUri)
      .then((client: AadHttpClient) => {
        this.aadHttpClient = client;
      });
  }

  private async ensureClient(context: WebPartContext): Promise<AadHttpClient> {
    if (!this.aadHttpClient) {
      this.aadHttpClient = await context.aadHttpClientFactory.getClient(this.resourceUri);
    }
    return this.aadHttpClient;
  }

  public async getProductionStats(context: WebPartContext): Promise<IProductionStats> {
    const client = await this.ensureClient(context);
    const response: HttpClientResponse = await client.get(
      `${this.apiBaseUrl}/stats`,
      AadHttpClient.configurations.v1
    );

    if (!response.ok) {
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

    return await response.json();
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

    return await response.json();
  }
}
```

#### C. Usare il Service nella WebPart

In `MyProductivityWebPart.ts`:

```typescript
import { ProductivityApiService } from '../../services/ProductivityApiService';

export default class MyProductivityWebPart extends BaseClientSideWebPart<IMyProductivityWebPartProps> {
  private productivityService: ProductivityApiService;

  protected onInit(): Promise<void> {
    // Inizializza il service
    const apiBaseUrl = 'https://prodcasteddu-apim-demo.azure-api.net/productivity';
    const resourceUri = 'api://YOUR-CLIENT-ID-HERE';
    
    this.productivityService = new ProductivityApiService(
      this.context,
      apiBaseUrl,
      resourceUri
    );

    return super.onInit();
  }

  public render(): void {
    const element: React.ReactElement<IMyProductivityProps> = React.createElement(
      MyProductivity,
      {
        description: this.properties.description,
        context: this.context,
        productivityService: this.productivityService,
        isDarkTheme: this._isDarkTheme,
        environmentMessage: this._environmentMessage,
        hasTeamsContext: !!this.context.sdks.microsoftTeams,
        userDisplayName: this.context.pageContext.user.displayName
      }
    );

    ReactDom.render(element, this.domElement);
  }
}
```

#### D. Usare il Service nel Componente React

In `MyProductivity.tsx`:

```typescript
import * as React from 'react';
import { IProductionStats } from '../../services/ProductivityApiService';

export const MyProductivity: React.FC<IMyProductivityProps> = (props) => {
  const [stats, setStats] = React.useState<IProductionStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadProductionStats();
  }, []);

  const loadProductionStats = async () => {
    try {
      setLoading(true);
      const data = await props.productivityService.getProductionStats(props.context);
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner label="Loading..." />;
  if (error) return <MessageBar messageBarType={MessageBarType.error}>{error}</MessageBar>;

  return (
    <div>
      <h2>Production Statistics</h2>
      <p>Total Pieces: {stats.totalPiecesProduced}</p>
      <p>Avg Speed: {stats.averageProductionSpeed}</p>
      <p>Efficiency: {stats.efficiency}%</p>
    </div>
  );
};
```

### 4. Deploy e Approvazione Permessi

#### A. Build e Package SPFx

```powershell
cd sp
gulp bundle --ship
gulp package-solution --ship
```

#### B. Upload in App Catalog

1. Vai al **SharePoint App Catalog**
2. Upload del file `.sppkg` da `sp/sharepoint/solution/`
3. Clicca **Deploy**

#### C. Approva API Permissions

1. Vai a **SharePoint Admin Center**
2. **Advanced** → **API Access**
3. Approva la richiesta per "Productivity API - user_impersonation"
4. Approva anche le richieste per Microsoft Graph

### 5. Test della WebPart

1. Aggiungi la webpart a una pagina SharePoint
2. La prima volta, l'utente potrebbe vedere un prompt di consenso
3. Dopo il consenso, la webpart caricherà i dati dall'API

## 🔍 Troubleshooting

### Error: "AADSTS650051: Using domain_hint or login_hint parameter is not supported"

**Soluzione**: Assicurati che l'App Registration abbia i redirect URI configurati correttamente.

### Error: "Failed to get token"

**Cause possibili**:
- L'API permission non è stata approvata
- Il Resource URI è errato
- L'utente non ha dato il consenso

**Soluzione**: 
1. Verifica in SharePoint Admin Center → API Access
2. Controlla che il Resource URI sia `api://{client-id}`

### Error: "401 Unauthorized" da API Management

**Cause possibili**:
- Il token non viene inviato correttamente
- La policy validate-jwt non è configurata bene
- L'audience nel token non corrisponde

**Soluzione**:
1. Usa F12 Developer Tools per ispezionare la richiesta
2. Verifica che l'header `Authorization: Bearer ...` sia presente
3. Decodifica il token JWT su https://jwt.ms
4. Verifica che `aud` claim sia `api://{client-id}`

### Error: "CORS error"

**Soluzione**: La policy CORS in APIM deve includere il dominio SharePoint:

```xml
<cors allow-credentials="true">
  <allowed-origins>
    <origin>https://*.sharepoint.com</origin>
  </allowed-origins>
</cors>
```

## 📝 Best Practices

### 1. Non hardcodare le configurazioni

Usa le WebPart properties:

```typescript
export interface IMyProductivityWebPartProps {
  apiBaseUrl: string;
  apiResourceUri: string;
}

protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
  return {
    pages: [
      {
        groups: [
          {
            groupFields: [
              PropertyPaneTextField('apiBaseUrl', {
                label: 'API Base URL'
              }),
              PropertyPaneTextField('apiResourceUri', {
                label: 'API Resource URI (api://...)'
              })
            ]
          }
        ]
      }
    ]
  };
}
```

### 2. Gestione errori robusta

```typescript
try {
  const data = await service.getProductionStats(context);
  setStats(data);
} catch (error) {
  if (error.message.includes('401')) {
    setError('Not authorized. Please contact your administrator.');
  } else if (error.message.includes('403')) {
    setError('Access denied. API permissions not granted.');
  } else {
    setError(`Error loading data: ${error.message}`);
  }
}
```

### 3. Caching

Implementa un cache semplice per evitare chiamate ripetute:

```typescript
private cache: Map<string, { data: any; timestamp: number }> = new Map();
private CACHE_DURATION = 5 * 60 * 1000; // 5 minuti

private getCachedOrFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = this.cache.get(key);
  if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
    return Promise.resolve(cached.data);
  }

  return fetcher().then(data => {
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  });
}
```

## 🔗 Riferimenti

- [Use AadHttpClient to connect to Azure AD secured APIs](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/use-aadhttpclient)
- [Connect to Azure AD-secured APIs in SharePoint Framework](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/use-aadhttpclient-enterpriseapi)
- [API Management validate-jwt policy](https://learn.microsoft.com/en-us/azure/api-management/validate-jwt-policy)
- [Microsoft identity platform access tokens](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens)
