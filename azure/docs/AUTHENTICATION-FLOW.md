# 🔐 Flusso di Autenticazione SharePoint → APIM → Azure Functions

## 📋 Panoramica

Questo documento spiega come funziona l'autenticazione end-to-end tra SPFx e Azure usando **Azure AD JWT tokens**.

## 🔄 Flusso Completo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       1. UTENTE IN SHAREPOINT                            │
│                                                                          │
│  L'utente accede a una pagina SharePoint che contiene la WebPart        │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    2. SPFX RICHIEDE TOKEN AZURE AD                       │
│                                                                          │
│  AadHttpClient.getClient('api://4543e176-...')                          │
│                                                                          │
│  SPFx chiede ad Azure AD un token per accedere all'API                  │
│  - Resource: api://4543e176-c20a-4904-bed3-49463d757c4f                 │
│  - Scope: user_impersonation                                            │
│  - User: L'utente corrente di SharePoint                                │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    3. AZURE AD EMETTE IL TOKEN                           │
│                                                                          │
│  Token JWT con:                                                         │
│  {                                                                      │
│    "aud": "api://4543e176-c20a-4904-bed3-49463d757c4f",                │
│    "iss": "https://sts.windows.net/{tenant-id}/",                      │
│    "scp": "user_impersonation",                                        │
│    "upn": "user@domain.com",                                           │
│    "appid": "00000003-0000-0ff1-ce00-000000000000" (SharePoint)        │
│  }                                                                      │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              4. SPFX CHIAMA APIM CON IL TOKEN                            │
│                                                                          │
│  GET https://prodcasteddu-apim-demo.azure-api.net/productivity/stats    │
│  Headers:                                                                │
│    Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...                     │
│                                                                          │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  5. APIM VALIDA IL TOKEN JWT                             │
│                                                                          │
│  <validate-jwt> policy verifica:                                        │
│  ✅ Token è firmato da Azure AD                                         │
│  ✅ Issuer: https://sts.windows.net/{tenant-id}/                       │
│  ✅ Audience: api://4543e176-c20a-4904-bed3-49463d757c4f               │
│  ✅ Token non è scaduto                                                 │
│  ✅ Signature è valida                                                  │
│                                                                          │
│  Se tutto OK → continua                                                 │
│  Se fallisce → 401 Unauthorized                                         │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              6. APIM INOLTRA LA RICHIESTA ALLE FUNCTIONS                 │
│                                                                          │
│  GET https://prodcasteddu-func-demo.azurewebsites.net/api/              │
│      GetProductionStats?code={function-key}                              │
│                                                                          │
│  APIM aggiunge automaticamente il function key come query parameter     │
│  configurato nel Backend credentials                                    │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  7. AZURE FUNCTION VALIDA IL FUNCTION KEY                │
│                                                                          │
│  La Function verifica che il ?code= parameter corrisponda al            │
│  function key configurato. Se valido, processa la richiesta.            │
│                                                                          │
│  Questo garantisce che solo APIM possa chiamare le Functions            │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  8. AZURE FUNCTION ELABORA LA RICHIESTA                  │
│                                                                          │
│  La Function:                                                            │
│  - Legge i dati da Azure Table Storage                                  │
│  - Processa la logica business                                          │
│  - Restituisce JSON response                                            │
│                                                                          │
│  La Function NON deve validare il JWT (già fatto da APIM)               │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   9. RISPOSTA RITORNA ALLA WEBPART                       │
│                                                                          │
│  Function → APIM → SPFx AadHttpClient → React Component                 │
│                                                                          │
│  {                                                                      │
│    "totalPiecesProduced": 1247,                                         │
│    "efficiency": 94.2,                                                  │
│    ...                                                                  │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🔑 Componenti Chiave

### 1. **Azure AD App Registration**
- **Client ID**: `4543e176-c20a-4904-bed3-49463d757c4f`
- **Application ID URI**: `api://4543e176-c20a-4904-bed3-49463d757c4f`
- **Exposed API Scope**: `user_impersonation`
- **Pre-authorized Apps**: SharePoint Online (`00000003-0000-0ff1-ce00-000000000000`)

### 2. **SPFx WebPart**
- Usa `AadHttpClient` per ottenere automaticamente token Azure AD
- Richiede token per la risorsa `api://{client-id}`
- Invia token nell'header `Authorization: Bearer ...`

### 3. **API Management**
- **Policy `validate-jwt`**: Verifica il token Azure AD (audience, issuer, signature)
- **CORS**: Configurato per SharePoint (`allow-credentials="true"`)
- **Backend Credentials**: Configurato per passare automaticamente il function key alle Azure Functions
- **URL Rewrite**: Le operation policies mappano `/stats` → `/GetProductionStats`, `/items` → `/GetProductionItems`, `/customers` → `/GetRecentCustomers`

### 4. **Azure Functions**
- **AuthLevel**: `function` - richiedono function key per essere chiamate
- **Function Key injection**: APIM passa automaticamente `?code={function-key}` via backend credentials
- Ricevono richieste solo dopo validazione JWT da APIM
- Operano in un contesto autenticato e protetto

## ✅ Perché Funziona con `webApiPermissionRequests`

### SPFx `package-solution.json`
```json
{
  "webApiPermissionRequests": [
    {
      "resource": "Productivity API",
      "scope": "user_impersonation"
    }
  ]
}
```

Quando configuri questo:

1. **Durante il deployment della SPFx solution** in SharePoint App Catalog, SharePoint legge `webApiPermissionRequests`

2. **SharePoint Admin** vede una richiesta di consenso in **SharePoint Admin Center → API Access**

3. **Dopo l'approvazione**, SharePoint può richiedere token per conto degli utenti per quella API

4. **AadHttpClient automaticamente**:
   - Ottiene il token da Azure AD
   - Lo include nelle richieste HTTP
   - Gestisce il refresh quando scade

## 🚨 Cosa VA Aggiornato DOPO il Deploy di APIM

### ❌ PROBLEMA
L'App Registration viene creata **PRIMA** di conoscere l'URL di APIM.

### ✅ SOLUZIONE
Dopo il deployment, lo script `update-aad-app-post-deploy.ps1` aggiorna automaticamente:

```powershell
# Aggiunge redirect URI di APIM
https://prodcasteddu-apim-demo.azure-api.net/signin-oidc

# Aggiunge wildcard SharePoint (se necessario)
https://*.sharepoint.com/*
```

**Questo è CRITICO** perché:
- SharePoint deve poter redirectare a questi URI durante l'autenticazione
- Azure AD valida i redirect URI per motivi di sicurezza
- Senza questo, potresti avere errori di autenticazione

## 🔍 Come Verificare che Funziona

### 1. Verifica il Token JWT
Apri F12 Developer Tools in SharePoint, trova la richiesta all'APIM, copia l'header `Authorization`:

```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

Vai su https://jwt.ms e incolla il token. Verifica:
- ✅ `aud`: `api://4543e176-c20a-4904-bed3-49463d757c4f`
- ✅ `iss`: `https://sts.windows.net/{tenant-id}/`
- ✅ `scp`: `user_impersonation`

### 2. Test con Postman
```powershell
# Ottieni un token manualmente
$token = az account get-access-token --resource api://4543e176-c20a-4904-bed3-49463d757c4f --query accessToken -o tsv

# Testa l'API
curl -H "Authorization: Bearer $token" https://prodcasteddu-apim-demo.azure-api.net/productivity/stats
```

### 3. Verifica APIM Policy
In Azure Portal → API Management → APIs → Productivity API → Design → Inbound processing:

```xml
<validate-jwt header-name="Authorization" ...>
  <audiences>
    <audience>api://4543e176-c20a-4904-bed3-49463d757c4f</audience>
  </audiences>
  ...
</validate-jwt>
```

## 🛡️ Sicurezza

### ✅ Vantaggi di questo approccio

1. **Zero secrets nel client**: SPFx non ha API keys o secrets
2. **User context**: Ogni chiamata è nel contesto dell'utente corrente
3. **Doppia protezione**:
   - **Layer 1 (APIM)**: Valida JWT Azure AD - solo utenti autenticati
   - **Layer 2 (Functions)**: Richiede function key - solo APIM può chiamare
4. **Consent framework**: Admin può controllare chi ha accesso
5. **Token short-lived**: I JWT scadono (tipicamente 1 ora)
6. **Validazione centralizzata**: APIM fa da gatekeeper per l'autenticazione utente
7. **Audit trail**: Application Insights traccia tutte le chiamate

### 🔒 Come Funziona la Doppia Protezione

```
Internet → APIM → Azure Functions
           ↓
      JWT Check    Function Key Check
      (utente)     (solo APIM)
```

- **Senza JWT valido**: APIM restituisce 401 → Le Functions non vengono MAI chiamate
- **Con JWT ma senza function key**: Functions restituiscono 401 → Blocca accesso diretto
- **Con entrambi**: ✅ Richiesta autorizzata

### ⚠️ Best Practices

1. **Mai esporre Functions direttamente**: Usa sempre APIM come gateway
2. **Function key in APIM Backend**: Configurato automaticamente, non hard-coded nelle policy
3. **AuthLevel 'function' obbligatorio**: Non usare 'anonymous' per le Functions in produzione
4. **Limita CORS in produzione**: Non usare `*`, specifica i domini SharePoint
5. **Monitora Application Insights**: Controlla chiamate anomale
6. **Refresh token automatico**: AadHttpClient gestisce il refresh
7. **Implementa rate limiting in APIM**: Proteggi da abuse
8. **IP Restriction (opzionale)**: Blocca accesso diretto alle Functions anche con function key

## 🔧 Configurazione APIM Backend

Il backend di APIM è configurato per passare automaticamente il function key:

```json
{
  "properties": {
    "url": "https://prodcasteddu-func-demo.azurewebsites.net/api",
    "credentials": {
      "query": {
        "code": ["<function-key>"]
      }
    }
  }
}
```

Questo viene fatto automaticamente da:
```powershell
# Durante il setup
$functionKey = az functionapp keys list ...
az rest --method PATCH .../backends/productivity-backend `
  --body '{"properties":{"credentials":{"query":{"code":["$functionKey"]}}}}'
```

**Vantaggi**:
- ✅ Function key non appare nelle policy XML
- ✅ Facile rotazione del key (aggiorna solo il backend)
- ✅ Separazione delle responsabilità (autenticazione vs autorizzazione)

## 📝 Checklist Deployment

- [ ] 1. Esegui `setup-aad-app-simple.ps1` → Ottieni Client ID
- [ ] 2. Esegui `deploy.ps1` con Client ID → Deploy infra + aggiorna App Registration
- [ ] 3. **Configura APIM Backend con function key** (automatico via script o manuale):
  ```powershell
  $functionKey = (az functionapp keys list -g "rg-name" -n "func-name" --query "functionKeys" -o json | ConvertFrom-Json).default
  # Aggiorna backend APIM con credentials
  ```
- [ ] 4. Verifica redirect URIs in Azure AD App Registration
- [ ] 5. Testa API via APIM con token: `az account get-access-token --resource "api://{client-id}"`
- [ ] 6. Configura `webApiPermissionRequests` in SPFx `package-solution.json`
- [ ] 7. Deploy SPFx solution in App Catalog
- [ ] 8. Approva API permissions in SharePoint Admin Center
- [ ] 9. Testa la WebPart in una pagina SharePoint
- [ ] 10. Verifica token JWT con F12 Developer Tools

## 🔗 Riferimenti

- [SharePoint Framework - AadHttpClient](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/use-aadhttpclient)
- [APIM validate-jwt policy](https://learn.microsoft.com/en-us/azure/api-management/validate-jwt-policy)
- [Azure AD OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [SharePoint API Access](https://learn.microsoft.com/en-us/sharepoint/dev/spfx/use-aadhttpclient#manage-permission-requests)
