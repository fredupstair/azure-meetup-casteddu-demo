# Azure Meetup Casteddu - Productivity Dashboard Backend

Backend Azure per la demo di integrazione SPFx con Azure e Microsoft Graph.

## 🏗️ Architettura

```
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│  SharePoint  │ ────────>│     APIM     │ ────────>│   Azure      │
│   SPFx WP    │  JWT     │  (Gateway)   │  Func    │  Functions   │
│              │  Token   │  + User ID   │  Key     │   (filter)   │
└──────────────┘          └──────────────┘          └──────────────┘
                                │                           │
                          JWT Validation                    ▼
                          Extract User OID           ┌──────────────┐
                          X-User-Id Header           │    Table     │
                          CORS Policy                │   Storage    │
                          Function Key Injection     │ (partitioned │
                                                     │  by userId)  │
                                                     └──────────────┘
```

**Componenti principali:**

- **Azure API Management**: Gateway unificato con autenticazione Azure AD JWT
  - Valida token JWT dall'utente SharePoint
  - **Estrae User OID dal JWT e passa come header X-User-Id** 🆕
  - Aggiunge automaticamente function key alle richieste backend
  - Policy CORS per SharePoint
  - URL rewrite per mapping endpoint
  
- **Azure Functions v4**: 3 funzioni serverless (Node.js 20 / TypeScript)
  - `GetProductionStats`: Statistiche di produttività **filtrate per utente** 🆕
  - `GetProductionItems`: Ultimi 5 pezzi prodotti **filtrati per utente** 🆕
  - `GetRecentCustomers`: 3 clienti più recenti **filtrati per utente** 🆕
  - **Auth Level**: `function` - richiedono function key (passato da APIM)
  - **Leggono X-User-Id header e filtrano dati per userId** 🆕
  
- **Azure Table Storage**: Database con **partitioning multi-utente** 🆕
  - **PartitionKey schema**: `{userId}_Stats`, `{userId}_Items`, `{userId}_Customers`
  - **Isolamento dati**: Ogni utente vede solo i propri dati
  - Query performanti su singola partizione

- **Application Insights**: Monitoring e logging end-to-end

**Flusso di sicurezza e data isolation:**
1. **Layer 1 - Autenticazione utente**: SPFx → APIM con JWT (verifica identità utente)
2. **Layer 2 - Autorizzazione backend**: APIM → Functions con function key (solo APIM può chiamare)
3. **Layer 3 - Isolamento dati**: Functions filtrano Table Storage per User OID 🆕

## 📋 Prerequisiti

- Azure CLI installato e autenticato (`az login`)
- Azure Functions Core Tools v4
- Node.js 20.x
- PowerShell 7+ (raccomandato)

## 🚀 Deployment

### 1. Setup Azure AD App Registration

Prima di tutto, crea l'App Registration per l'autenticazione Azure AD:

```powershell
cd azure/scripts
./setup-aad-app.ps1 -AppName "Productivity API"
```

Questo script:
- Crea l'App Registration in Azure AD
- Configura l'Application ID URI (`api://{client-id}`)
- Espone l'API scope `user_impersonation`
- Pre-autorizza SharePoint Online
- Salva la configurazione in `azure/config/aad-app-config.json`

**Importante**: Salva il **Client ID** mostrato nell'output!

### 2. Deploy Infrastructure

Usa il Client ID ottenuto dal passo precedente:

```powershell
cd azure/scripts
./deploy.ps1 -ResourceGroupName "rg-meetup-casteddu" -Location "westeurope" -ApiClientId "YOUR-CLIENT-ID-HERE"
```

Lo script esegue:
- Creazione Resource Group
- Deploy dell'infrastruttura con Bicep
- Configurazione API Management con Azure AD authentication
- **Configurazione APIM Backend con function key** ⭐
- **Aggiornamento automatico App Registration con URL APIM** ⭐
- Build e deploy delle Azure Functions
- Output delle credenziali e configurazioni necessarie

> **⚠️ IMPORTANTE**: Lo script aggiorna automaticamente:
> 1. L'App Registration aggiungendo l'URL di APIM come redirect URI
> 2. Il Backend di APIM aggiungendo il function key per chiamare le Functions
>
> Questo è essenziale per il corretto funzionamento dell'autenticazione e dell'autorizzazione.

### 3. Seed Demo Data

```powershell
./seed-data.ps1 -StorageAccountName "prodcasteddudemost" -ResourceGroupName "rg-meetup-casteddu"
```

Popola le tabelle con dati fittizi per **più utenti di test** (3 utenti di default).

**Schema multi-utente:**
- Crea dati per utente corrente + 2 test users
- PartitionKey: `{userId}_Stats`, `{userId}_Items`, `{userId}_Customers`
- Ogni utente ha dati randomizzati diversi

> **📝 Nota**: Lo script usa OID reali. Per aggiungere altri utenti, modifica l'array `$users` nello script con OID da Azure AD (ottienibili con `az ad user show --id user@domain.com --query id -o tsv`)

## 🔧 Sviluppo Locale

### Setup

```powershell
cd azure/functions
npm install
```

### Avviare localmente

```powershell
npm start
```

Le funzioni saranno disponibili su:
- http://localhost:7071/api/GetProductionStats
- http://localhost:7071/api/GetProductionItems
- http://localhost:7071/api/GetRecentCustomers

## 📡 API Endpoints

Dopo il deployment, le API saranno disponibili tramite API Management:

### GET /productivity/stats
Restituisce statistiche di produzione correnti.

**Response:**
```json
{
  "date": "2025-11-03",
  "totalPiecesProduced": 1247,
  "averageProductionSpeed": 42.5,
  "efficiency": 94.2,
  "lastUpdated": "2025-11-03T10:30:00Z"
}
```

### GET /productivity/items
Restituisce gli ultimi 5 pezzi prodotti.

**Response:**
```json
[
  {
    "itemCode": "PRD-2024-1150",
    "productName": "Widget A",
    "quantity": 500,
    "productionDate": "2025-11-03T10:00:00Z",
    "status": "Completed"
  }
]
```

### GET /productivity/customers
Restituisce i 3 clienti più recenti.

**Response:**
```json
[
  {
    "customerCode": "CUST-001",
    "customerName": "Acme Corporation",
    "lastOrderDate": "2025-11-03T09:00:00Z",
    "totalOrders": 47,
    "location": "Milano"
  }
]
```

## 🔑 Autenticazione

Le API sono protette tramite **Azure AD JWT token validation**.

### Per SPFx WebPart

Usa `AadHttpClient` in SPFx:

```typescript
import { AadHttpClient } from '@microsoft/sp-http';

const client = await this.context.aadHttpClientFactory
  .getClient('api://YOUR-CLIENT-ID');

const response = await client.get(
  'https://your-apim.azure-api.net/productivity/stats',
  AadHttpClient.configurations.v1
);
```

### Configurazione SPFx

In `config/package-solution.json`:

```json
{
  "solution": {
    "webApiPermissionRequests": [
      {
        "resource": "Productivity API",
        "scope": "user_impersonation"
      }
    ]
  }
}
```

Dopo il deploy della SPFx solution, approva i permessi in:
**SharePoint Admin Center** → **Advanced** → **API Access**

Vedi [SPFX-INTEGRATION.md](../docs/SPFX-INTEGRATION.md) per la guida completa.

### Per test con Postman/curl

1. Ottieni un token Azure AD:
```powershell
az account get-access-token --resource api://YOUR-CLIENT-ID --query accessToken -o tsv
```

2. Usa il token nelle richieste:
```bash
curl -H "Authorization: Bearer YOUR-TOKEN" \
  https://your-apim.azure-api.net/productivity/stats
```

## 🔍 Monitoring

Accedi ad Application Insights per:
- Request/Response logs
- Performance metrics
- Failure tracking
- Dependency tracking

## 📂 Struttura del Progetto

```
azure/
├── config/
│   └── aad-app-config.json           # Azure AD App configuration (generato)
├── infrastructure/
│   └── main.bicep                    # Template Bicep principale
├── functions/
│   ├── package.json                  # Dipendenze Node.js
│   ├── tsconfig.json                 # Configurazione TypeScript
│   ├── host.json                     # Configurazione Functions
│   ├── local.settings.json           # Settings locali
│   ├── GetProductionStats/
│   │   ├── function.json            # Binding configuration
│   │   └── index.ts                 # Function implementation
│   ├── GetProductionItems/
│   │   ├── function.json
│   │   └── index.ts
│   └── GetRecentCustomers/
│       ├── function.json
│       └── index.ts
├── scripts/
│   ├── setup-aad-app.ps1            # Setup Azure AD App Registration
│   ├── deploy.ps1                    # Script deployment completo
│   └── seed-data.ps1                 # Popola dati fittizi
├── README.md                         # Questo file
└── SPFX-INTEGRATION.md               # Guida integrazione SPFx
```

## 🛠️ Comandi Utili

### Build locale
```powershell
cd azure/functions
npm run build
```

### Watch mode (sviluppo)
```powershell
npm run watch
```

### Deploy solo le Functions
```powershell
cd azure/functions
func azure functionapp publish <FUNCTION_APP_NAME>
```

### Visualizzare i log in tempo reale
```powershell
func azure functionapp logstream <FUNCTION_APP_NAME>
```

## 🗑️ Cleanup

Per eliminare tutte le risorse:

```powershell
az group delete --name "rg-meetup-casteddu" --yes --no-wait
```

## 📝 Note

- Le Azure Functions usano il piano Consumption (serverless)
- API Management usa il tier Consumption (pay-per-use)
- I dati fittizi vengono rigenerati automaticamente se non presenti nelle tabelle
- CORS è configurato per accettare richieste da qualsiasi origine (*) di default
  - In produzione, usa `-sharePointTenantUrl "https://yourtenant.sharepoint.com"` per limitare CORS
- TLS 1.2+ obbligatorio per tutte le connessioni
- **L'App Registration viene aggiornata POST-deployment con l'URL di APIM**

## 📚 Documentazione Avanzata

- [AUTHENTICATION-FLOW.md](../docs/AUTHENTICATION-FLOW.md) - Flusso completo di autenticazione SharePoint → APIM → Functions
- [SPFX-INTEGRATION.md](../docs/SPFX-INTEGRATION.md) - Guida step-by-step integrazione SPFx
- [QUICK-REFERENCE.md](../docs/QUICK-REFERENCE.md) - Quick reference per comandi comuni

## 🔐 Sicurezza

L'architettura implementa **triplo layer di sicurezza con isolamento dati multi-utente**:

### Layer 1: Autenticazione Utente (Azure AD JWT)

**Gestito da APIM tramite validate-jwt policy:**
- ✅ JWT token validation in API Management
- ✅ Token issuer e audience verification
- ✅ **Estrazione User OID dal claim JWT** 🆕
- ✅ Nessuna API key esposta nel client SPFx
- ✅ User context preservation
- ✅ Token short-lived (1 ora tipicamente)

**Policy APIM:**
```xml
<validate-jwt header-name="Authorization">
  <openid-config url="https://login.microsoftonline.com/{tenant}/.well-known/openid-configuration" />
  <audiences>
    <audience>api://{client-id}</audience>
  </audiences>
  <issuers>
    <issuer>https://sts.windows.net/{tenant}/</issuer>
  </issuers>
</validate-jwt>

<!-- Extract User OID from JWT and pass to backend -->
<set-header name="X-User-Id" exists-action="override">
  <value>@{
    var jwt = context.Request.Headers.GetValueOrDefault("Authorization","").AsJwt();
    return jwt != null ? jwt.Claims.GetValueOrDefault("oid", "anonymous") : "anonymous";
  }</value>
</set-header>
```

### Layer 2: Autorizzazione Backend (Function Key)

**Gestito da APIM Backend Credentials:**
- ✅ Azure Functions con `authLevel: 'function'`
- ✅ Function key configurato in APIM backend (non hard-coded nelle policy)
- ✅ APIM aggiunge automaticamente `?code={key}` alle richieste
- ✅ Solo APIM può chiamare le Functions
- ✅ Blocca accesso diretto anche con function key (combinato con IP restriction opzionale)

**Configurazione Backend:**
```json
{
  "credentials": {
    "query": {
      "code": ["<function-key>"]
    }
  }
}
```

### Layer 3: Isolamento Dati Multi-Utente 🆕

**Gestito da Azure Functions con Table Storage partitioning:**
- ✅ Functions leggono `X-User-Id` header da APIM
- ✅ Query filtrate per PartitionKey = `{userId}_{EntityType}`
- ✅ **Ogni utente vede SOLO i propri dati**
- ✅ Impossibile accedere a dati di altri utenti (query cross-partition bloccata)
- ✅ Performance ottimizzate (query su singola partizione)

**Implementazione Functions:**
```typescript
// Extract user ID from APIM header
const userId = request.headers.get('x-user-id') || 'anonymous';
const partitionKey = `${userId}_Stats`; // or _Items, _Customers

// Query only this user's data
const entity = await tableClient.getEntity(partitionKey, rowKey);
```

**Schema Table Storage:**
```
ProductionStats table:
├─ 83834e24-..._Stats (utente 1)
│  └─ 2025-01-15 (stats del giorno)
├─ 00000000-..._Stats (utente 2)
│  └─ 2025-01-15
└─ ...

ProductionItems table:
├─ 83834e24-..._Items (utente 1)
│  ├─ item-001
│  ├─ item-002
│  └─ ...
└─ 00000000-..._Items (utente 2)
   └─ ...
```

### Flusso di Sicurezza Completo

```
1. Utente SharePoint → APIM
   ├─ ❌ Senza JWT → 401 Unauthorized
   └─ ✅ Con JWT valido → Continua + Estrae OID

2. APIM → Azure Functions
   ├─ Aggiunge ?code={function-key}
   ├─ Aggiunge X-User-Id: {oid} header 🆕
   ├─ ❌ Senza function key → 401 Unauthorized  
   └─ ✅ Con function key → Esegue funzione

3. Azure Functions → Table Storage 🆕
   ├─ Legge userId da X-User-Id header
   ├─ Query: PartitionKey = '{userId}_Stats'
   └─ ✅ Ritorna SOLO dati dell'utente autenticato
```

### API Management Policies Aggiuntive
- ✅ CORS configurato per SharePoint domains
- ✅ HTTPS obbligatorio
- ✅ Rate limiting (configurabile)
- ✅ URL rewrite per mapping pulito degli endpoint
- ✅ **User context propagation tramite custom headers** 🆕

### Azure Functions
- ✅ TLS 1.2+ obbligatorio
- ✅ HTTPS only
- ✅ Managed Identity ready
- ✅ Application Insights logging
- ✅ Function keys rotation supportata
- ✅ **User-based data filtering** 🆕
- ✅ **CORS headers includono X-User-Id** 🆕

### Protezione contro accesso diretto alle Functions

**Attualmente implementato:**
- Function key requirement (solo APIM lo ha)

**Best practice aggiuntive per produzione:**
- [ ] IP Restriction: Accetta solo IP pubblico di APIM
- [ ] Virtual Network Integration: Functions in VNET privata
- [ ] Private Endpoint: APIM comunica via private link
- [ ] Managed Identity: Functions usano MI invece di connection strings

### Per la produzione, considera di:
- Limitare CORS a domini specifici SharePoint (`https://tenant.sharepoint.com`)
- Implementare rate limiting più restrittivo in APIM
- Abilitare IP restrictions sulle Functions
- Rotazione periodica dei function keys
- Usare Managed Identity per accesso a Storage
- Implementare Azure Key Vault per secrets
- Abilitare APIM Developer Portal con OAuth2
- Configurare Azure Front Door per DDoS protection

## 🚀 Prossimi Passi

1. Deploy dell'infrastruttura Azure
2. Verifica delle API tramite API Management portal
3. Integrazione con SPFx webpart
4. Test end-to-end della dashboard

## 📞 Supporto

Per domande o problemi:
- Controlla i log in Application Insights
- Verifica la configurazione in Azure Portal
- Testa le funzioni localmente prima del deploy
