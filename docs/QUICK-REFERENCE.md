# Quick Reference - Azure AD Setup

## 📋 Passi Rapidi

### 1️⃣ Setup Azure AD App (Una volta sola)

```powershell
cd azure/scripts
./setup-aad-app.ps1 -AppName "Productivity API"
```

**Output importante:**
- ✅ Application (Client) ID: `abc123-def456-...`
- ✅ Scope: `api://abc123-def456-.../user_impersonation`

📝 **Salva il Client ID!** Ti servirà per il deploy.

---

### 2️⃣ Deploy Infrastructure Azure

```powershell
./deploy.ps1 -ResourceGroupName "rg-meetup-casteddu" -ApiClientId "abc123-def456-..."
```

**Output importante:**
- ✅ API Gateway URL: `https://prodcasteddu-apim-demo.azure-api.net/productivity`
- ✅ Resource URI: `api://abc123-def456-...`

---

### 3️⃣ Seed Dati Demo

```powershell
./seed-data.ps1 -StorageAccountName "prodcasteddustdemo" -ResourceGroupName "rg-meetup-casteddu"
```

---

### 4️⃣ Test API (Opzionale)

```powershell
# Ottieni un token Azure AD
$token = az account get-access-token --resource api://YOUR-CLIENT-ID --query accessToken -o tsv

# Test API
curl -H "Authorization: Bearer $token" `
  https://prodcasteddu-apim-demo.azure-api.net/productivity/stats
```

---

## 🔧 Configurazione SPFx

### A. Aggiungi a `config/package-solution.json`

```json
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
```

### B. Usa AadHttpClient in SPFx

```typescript
// 1. Inizializza client
const client = await this.context.aadHttpClientFactory
  .getClient('api://YOUR-CLIENT-ID');

// 2. Chiama API
const response = await client.get(
  'https://your-apim.azure-api.net/productivity/stats',
  AadHttpClient.configurations.v1
);

const data = await response.json();
```

### C. Deploy e Approva Permessi

1. Build e deploy SPFx package
2. Vai a **SharePoint Admin Center**
3. **Advanced** → **API Access**
4. Approva "Productivity API - user_impersonation"

---

## ⚡ Comandi Quick Reference

| Comando | Descrizione |
|---------|-------------|
| `./setup-aad-app.ps1` | Crea Azure AD App Registration |
| `./deploy.ps1 -ResourceGroupName "rg-name" -ApiClientId "xxx"` | Deploy infrastruttura |
| `./seed-data.ps1 -StorageAccountName "xxx" -ResourceGroupName "rg-name"` | Popola dati demo |
| `az account get-access-token --resource api://CLIENT-ID` | Ottieni token per test |

---

## 🔍 Verifica Setup

### ✅ Checklist Azure AD App

```powershell
# Verifica App Registration esista
az ad app show --id YOUR-CLIENT-ID

# Verifica Application ID URI
az ad app show --id YOUR-CLIENT-ID --query identifierUris

# Output atteso: ["api://YOUR-CLIENT-ID"]
```

### ✅ Checklist API Management

```powershell
# Verifica APIM esista
az apim show -n prodcasteddu-apim-demo -g rg-meetup-casteddu

# Test endpoint (senza auth - dovrebbe dare 401)
curl https://prodcasteddu-apim-demo.azure-api.net/productivity/stats
# Expected: {"statusCode":401,"message":"Unauthorized..."}
```

### ✅ Checklist Azure Functions

```powershell
# Verifica Functions siano deployate
az functionapp function list -n prodcasteddu-func-demo -g rg-meetup-casteddu

# Expected: GetProductionStats, GetProductionItems, GetRecentCustomers
```

---

## 🆘 Troubleshooting Veloce

| Errore | Soluzione |
|--------|----------|
| `AADSTS700016: Application not found` | Client ID errato o App non creata |
| `401 Unauthorized from APIM` | Token mancante o invalido |
| `validate-jwt failed` | Audience o Issuer non corretto nel token |
| `CORS error` | Dominio SharePoint non in allowed origins |
| `API permission not approved` | Vai in SharePoint Admin > API Access |

---

## 📞 Link Utili

- **Azure Portal**: https://portal.azure.com
- **Azure AD Apps**: https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps
- **SharePoint Admin Center**: https://TENANT-admin.sharepoint.com
- **API Access**: SharePoint Admin > Advanced > API Access
- **JWT Decoder**: https://jwt.ms (per debug token)

---

## 💾 File Importanti

| File | Contiene |
|------|----------|
| `azure/config/aad-app-config.json` | Client ID e configurazione (non committare!) |
| `azure/infrastructure/main.bicep` | Template infrastruttura |
| `sp/config/package-solution.json` | Configurazione SPFx |

---

**Fatto! Ora hai tutto configurato per la demo! 🎉**
