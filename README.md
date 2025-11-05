# Azure Meetup Casteddu - SPFx + Azure Demo

Demo completa di integrazione SharePoint Framework (SPFx) con Azure e Microsoft Graph.

## 📖 Panoramica

Questa soluzione dimostra l'integrazione tra:
- **SharePoint Framework (SPFx)**: Webpart di produttività
- **Microsoft Graph API**: Calendario ed email
- **Azure Backend**: API Management + Functions + Table Storage

## 🎯 Funzionalità della Dashboard

La webpart di produttività mostra 5 sezioni tramite tab:

1. **📅 Calendario**: Prossimi appuntamenti (Microsoft Graph)
2. **📧 Email**: Messaggi non letti (Microsoft Graph)
3. **📊 Statistiche Produzione**: KPI di produttività (Azure)
4. **📦 Pezzi Prodotti**: Ultimi pezzi prodotti (Azure)
5. **👥 Clienti**: Clienti recenti (Azure)

## 🏗️ Architettura

```
┌─────────────────────────────────────────────────────┐
│         SharePoint Online / Teams                   │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │      SPFx Productivity WebPart               │  │
│  │      (AadHttpClient + Azure AD Token)        │  │
│  │                                               │  │
│  │  ┌────────┐  ┌────────┐  ┌────────────────┐ │  │
│  │  │Calendar│  │ Email  │  │ Production     │ │  │
│  │  │  Tab   │  │  Tab   │  │ Data Tabs      │ │  │
│  │  └────────┘  └────────┘  └────────────────┘ │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
           │                           │
           │ Microsoft Graph           │ HTTPS + Bearer Token
           │ (Azure AD)                │ (Azure AD JWT)
           ▼                           ▼
┌──────────────────┐      ┌────────────────────────┐
│ Microsoft Graph  │      │ Azure API Management   │
│    API           │      │                        │
│                  │      │  validate-jwt policy   │
│ - Calendar       │      │  ✓ Audience            │
│ - Mail           │      │  ✓ Issuer              │
└──────────────────┘      │  ✓ Signature           │
                          │                        │
                          │  /productivity/stats   │
                          │  /productivity/items   │
                          │  /productivity/customers│
                          └────────────────────────┘
                                     │
                                     ▼
                          ┌─────────────────────────┐
                          │  Azure Functions        │
                          │  (Node.js/TypeScript)   │
                          │  + User OID Filtering   │
                          │  - GetProductionStats   │
                          │  - GetProductionItems   │
                          │  - GetRecentCustomers   │
                          └─────────────────────────┘
                                     │
                                     ▼
                          ┌─────────────────────────┐
                          │  Azure Table Storage    │
                          │                         │
                          │  - ProductionStats      │
                          │  - ProductionItems      │
                          │  - Customers            │
                          └─────────────────────────┘
```

## 📁 Struttura del Repository

```
azure-meetup-casteddu-demo/
├── docs/                           # Documentazione
│   ├── AUTHENTICATION-FLOW.md     # Flusso autenticazione completo
│   ├── SPFX-INTEGRATION.md        # Guida integrazione SPFx
│   └── QUICK-REFERENCE.md         # Guida rapida setup
├── azure/                          # Backend Azure
│   ├── README.md                  # Setup e deployment backend
│   ├── infrastructure/
│   │   └── main.bicep             # IaC template
│   ├── functions/                 # Azure Functions
│   │   ├── GetProductionStats/
│   │   ├── GetProductionItems/
│   │   └── GetRecentCustomers/
│   ├── scripts/
│   │   ├── deploy.ps1
│   │   └── seed-data.ps1
│   └── config/
│       └── aad-app-config.json    # Azure AD App config
│
└── sp/                            # SPFx WebPart
    ├── README.md                  # Sviluppo webpart
    ├── src/
    │   ├── webparts/
    │   │   └── myProductivity/
    │   └── services/              # Graph & API services
    ├── config/
    └── package.json
```

## 🚀 Quick Start

### 1. Setup Azure AD App Registration

```powershell
cd azure/scripts
./setup-aad-app.ps1 -AppName "Productivity API"
```

Salva il **Client ID** dall'output!

### 2. Deploy Azure Backend

```powershell
./deploy.ps1 -ResourceGroupName "rg-meetup-casteddu" -ApiClientId "YOUR-CLIENT-ID-HERE"
```

Salva l'output con API Gateway URL e Resource URI.

### 3. Seed Demo Data

```powershell
./seed-data.ps1 -StorageAccountName "prodcasteddudemost" -ResourceGroupName "rg-meetup-casteddu"
```

### 4. Configura SPFx (TODO)

Vedi la guida completa: [docs/SPFX-INTEGRATION.md](./docs/SPFX-INTEGRATION.md)

```powershell
cd sp
npm install
gulp serve
```

## 📋 Prerequisiti

### Azure
- Azure Subscription attiva
- Azure CLI (`az login`)
- Azure Functions Core Tools v4
- Node.js 20.x

### SPFx
- Node.js 18.x (per SPFx)
- SharePoint Online tenant
- Microsoft 365 Developer account

> **📝 Nota**: Questo repository contiene valori placeholder. Prima di utilizzarlo:
> - Sostituisci `YOUR-TENANT` con il nome del tuo tenant SharePoint
> - Sostituisci `YOUR-CLIENT-ID-HERE` con il Client ID della tua App Registration Azure AD
> - Sostituisci `YOUR-TENANT-ID-HERE` con il tuo Tenant ID Azure AD
> - Il file `azure/config/aad-app-config.json` verrà generato automaticamente durante il setup

## 🔑 Configurazione

### Azure AD Authentication

L'API è protetta tramite Azure AD JWT validation. SPFx usa `AadHttpClient`:

```typescript
// In SPFx WebPart
const client = await this.context.aadHttpClientFactory
  .getClient('api://YOUR-CLIENT-ID');

const response = await client.get(
  'https://prodcasteddu-apim-demo.azure-api.net/productivity/stats',
  AadHttpClient.configurations.v1
);
```

### SPFx Configuration

Aggiungi in `config/package-solution.json`:

```json
{
  "solution": {
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

Dopo il deploy, approva i permessi in **SharePoint Admin Center** → **API Access**.
Guida completa: [docs/SPFX-INTEGRATION.md](./docs/SPFX-INTEGRATION.md)

## 📚 Documentazione

- **[Quick Reference Guide](./docs/QUICK-REFERENCE.md)** - 🚀 Guida rapida setup
- **[Azure Backend](./azure/README.md)** - Setup e deployment backend Azure
- [SPFx Integration Guide](./docs/SPFX-INTEGRATION.md) - Integrazione SPFx con Azure AD
- [Authentication Flow](./docs/AUTHENTICATION-FLOW.md) - Flusso completo autenticazione
- [SPFx WebPart README](./sp/README.md) - Sviluppo webpart

## 🎓 Demo Flow

1. **Mostra l'architettura** (questo README)
2. **Backend Azure**:
   - Mostra le Azure Functions nel portale
   - Testa le API in APIM
   - Visualizza i dati in Table Storage
3. **SPFx WebPart**:
   - Mostra il codice TypeScript/React
   - Spiega l'integrazione con Graph
   - Live demo della dashboard in SharePoint

## 🧪 Testing

### Test Azure Functions Localmente

```powershell
cd azure/functions
npm start
```

Test endpoint:
```
curl http://localhost:7071/api/GetProductionStats
```

### Test SPFx Localmente

```powershell
cd sp
gulp serve --nobrowser
```

## 🐛 Troubleshooting

### Azure Functions non rispondono
- Verifica che il deployment sia completato
- Controlla i log in Application Insights
- Testa localmente prima

### CORS errors
- Verifica la configurazione APIM
- Aggiungi il dominio SharePoint agli allowed origins

### Graph API 403 Forbidden
- Verifica i permessi API in SharePoint Admin Center
- Controlla che l'utente abbia accesso ai dati

### Azure AD 401 Unauthorized
- Verifica che l'API permission sia stata approvata
- Controlla che il Resource URI sia corretto (`api://{client-id}`)
- Usa https://jwt.ms per decodificare il token e verificare claims

## 🛠️ Tech Stack

| Componente | Tecnologia |
|-----------|-----------|
| Frontend | SPFx, React, Fluent UI |
| Backend | Azure Functions (Node.js/TypeScript) |
| API Gateway | Azure API Management |
| Authentication | Azure AD (JWT validation) |
| Database | Azure Table Storage |
| IaC | Bicep |
| Monitoring | Application Insights |

## 📊 Costi Stimati

Usando tier Consumption/serverless:
- Azure Functions: ~€0 (free tier copre la demo)
- APIM Consumption: ~€3-5/mese
- Storage Account: ~€0.50/mese
- Application Insights: ~€2/mese

**Totale stimato**: ~€5-10/mese per la demo

## 🗑️ Cleanup

```powershell
az group delete --name "rg-meetup-casteddu" --yes
```

## 🤝 Contributing

Questa è una demo per Azure Meetup Casteddu.

## 📄 License

MIT License - Usa pure per le tue demo!

## 👨‍💻 Autore

Demo preparata per **Azure Meetup Casteddu**

---

**Buona demo! 🚀**
