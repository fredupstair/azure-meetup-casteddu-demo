# Azure Meetup Casteddu - Productivity Dashboard Backend

Backend Azure per la demo di integrazione SPFx con Azure e Microsoft Graph.

## 🏗️ Architettura

```
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│  SharePoint  │ ────────>│     APIM     │ ────────>│   Azure      │
│   SPFx WP    │  JWT     │  (Gateway)   │  Func    │  Functions   │
│              │  Token   │              │  Key     │              │
└──────────────┘          └──────────────┘          └──────────────┘
                                │                           │
                                │                           ▼
                          JWT Validation            ┌──────────────┐
                          CORS Policy               │    Table     │
                          Function Key Injection    │   Storage    │
                                                     └──────────────┘
```

**Componenti principali:**

- **Azure API Management**: Gateway unificato con autenticazione Azure AD JWT
  - Valida token JWT dall'utente SharePoint
  - Aggiunge automaticamente function key alle richieste backend
  - Policy CORS per SharePoint
  - URL rewrite per mapping endpoint
  
- **Azure Functions v4**: 3 funzioni serverless (Node.js 20 / TypeScript)
  - `GetProductionStats`: Statistiche di produttività
  - `GetProductionItems`: Ultimi 5 pezzi prodotti
  - `GetRecentCustomers`: 3 clienti più recenti
  - **Auth Level**: `function` - richiedono function key (passato da APIM)
  
- **Azure Table Storage**: Database per dati fittizi di produzione

- **Application Insights**: Monitoring e logging end-to-end

**Flusso di sicurezza (doppio layer):**
1. **Layer 1 - Autenticazione utente**: SPFx → APIM con JWT (verifica identità utente)
2. **Layer 2 - Autorizzazione backend**: APIM → Functions con function key (solo APIM può chiamare)

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
./seed-data.ps1 -StorageAccountName "prodcasteddustdemo" -ResourceGroupName "rg-meetup-casteddu"
```

Popola le tabelle con dati fittizi per la demo.

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

Vedi [SPFX-INTEGRATION.md](./SPFX-INTEGRATION.md) per la guida completa.

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

- [AUTHENTICATION-FLOW.md](./AUTHENTICATION-FLOW.md) - Flusso completo di autenticazione SharePoint → APIM → Functions
- [SPFX-INTEGRATION.md](./SPFX-INTEGRATION.md) - Guida step-by-step integrazione SPFx
- [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - Quick reference per comandi comuni

## 🔐 Sicurezza

L'architettura implementa **doppio layer di sicurezza**:

### Layer 1: Autenticazione Utente (Azure AD JWT)

**Gestito da APIM tramite validate-jwt policy:**
- ✅ JWT token validation in API Management
- ✅ Token issuer e audience verification
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
</validate-jwt>
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

### Flusso di Sicurezza Completo

```
1. Utente SharePoint → APIM
   ├─ ❌ Senza JWT → 401 Unauthorized
   └─ ✅ Con JWT valido → Continua

2. APIM → Azure Functions
   ├─ APIM aggiunge ?code={function-key}
   ├─ ❌ Senza function key → 401 Unauthorized  
   └─ ✅ Con function key → Esegue funzione
```

### API Management Policies Aggiuntive
- ✅ CORS configurato per SharePoint domains
- ✅ HTTPS obbligatorio
- ✅ Rate limiting (configurabile)
- ✅ URL rewrite per mapping pulito degli endpoint

### Azure Functions
- ✅ TLS 1.2+ obbligatorio
- ✅ HTTPS only
- ✅ Managed Identity ready
- ✅ Application Insights logging
- ✅ Function keys rotation supportata

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
