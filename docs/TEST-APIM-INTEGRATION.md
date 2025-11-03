# 🧪 Test Integrazione SPFx → APIM → Azure Functions

## 📋 Checklist Pre-Test

Prima di testare la webpart, assicurati di aver completato:

- [ ] ✅ Azure Infrastructure deployata (APIM, Functions, Storage)
- [ ] ✅ Azure AD App Registration configurata
- [ ] ✅ APIM Backend configurato con function key (`configure-apim-backend.ps1`)
- [ ] ✅ APIM policy con JWT validation attiva
- [ ] ✅ API testate via CLI con token Azure AD (devono funzionare)

## 🚀 Build e Deploy SPFx

### 1. Build della Solution

```bash
cd sp
npm install
gulp bundle --ship
gulp package-solution --ship
```

Questo genera: `sp/sharepoint/solution/azure-meetup-casteddu-demo.sppkg`

### 2. Deploy in SharePoint App Catalog

1. Vai al **SharePoint App Catalog** del tenant
2. Carica il file `.sppkg`
3. Clicca **Deploy**
4. ⚠️ **IMPORTANTE**: Verrà mostrato un warning riguardo le API permissions - **clicca "Deploy"**

### 3. Approva API Permissions

⭐ **Questo è il passo CRUCIALE per far funzionare l'autenticazione!**

1. Vai su **SharePoint Admin Center** (https://[tenant]-admin.sharepoint.com)
2. Espandi **Advanced** nel menu laterale
3. Clicca **API Access**
4. Vedrai tre richieste pending:
   - `Microsoft Graph - Calendars.Read` ✅ Approva
   - `Microsoft Graph - Mail.Read` ✅ Approva
   - **`Productivity API - user_impersonation`** ⭐ **APPROVA QUESTA!**

5. Clicca su ogni richiesta e scegli **Approve**

### 4. Aggiungi la WebPart a una Pagina

1. Vai su un sito SharePoint
2. Crea o modifica una pagina
3. Aggiungi la webpart **"MyProductivity"**
4. Salva e pubblica la pagina

## 🔍 Test della Chiamata API

### Cosa aspettarsi

Quando apri il tab **📊 Produzione**:

1. ⏳ Vedrai uno spinner "Caricamento dati da Azure API..."
2. 🔐 SPFx chiederà automaticamente un token Azure AD per `api://4543e176-c20a-4904-bed3-49463d757c4f`
3. 📡 La chiamata viene fatta a APIM con il token nell'header `Authorization: Bearer ...`
4. ✅ Se tutto funziona, vedrai:
   - Banner verde "✅ Dati caricati correttamente da APIM"
   - Debug output con il JSON completo della risposta
   - 5 card con le statistiche (Data, Pezzi Prodotti, Velocità, Efficienza, Ultimo Aggiornamento)

### Esempio Output Atteso

```json
{
  "date": "2025-11-03",
  "totalPiecesProduced": 1247,
  "averageProductionSpeed": 42.5,
  "efficiency": 94.2,
  "lastUpdated": "2025-11-03T17:45:00Z"
}
```

## 🐛 Troubleshooting

### ❌ Errore: "Failed to get production stats: Unauthorized"

**Causa**: Le API permissions non sono state approvate

**Soluzione**:
1. Vai in SharePoint Admin Center → API Access
2. Approva la richiesta per "Productivity API - user_impersonation"
3. Ricarica la pagina SharePoint (potrebbe richiedere fino a 5 minuti per propagarsi)

### ❌ Errore: "Failed to get production stats: 401"

**Causa**: JWT validation in APIM sta fallendo

**Soluzione**:
1. Verifica che la policy APIM contenga `validate-jwt`
2. Controlla che l'audience sia corretta: `api://4543e176-c20a-4904-bed3-49463d757c4f`
3. Testa manualmente l'API da CLI:
   ```powershell
   $token = (az account get-access-token --resource "api://4543e176-c20a-4904-bed3-49463d757c4f" --query accessToken -o tsv)
   Invoke-RestMethod -Uri "https://prodcasteddu-apim-demo.azure-api.net/productivity/stats" -Headers @{Authorization="Bearer $token"}
   ```

### ❌ Errore: "Failed to get production stats: 404"

**Causa**: URL errato o routing APIM non configurato

**Soluzione**:
1. Verifica l'URL nelle proprietà della webpart (Edit Web Part → Configurazione Azure API)
2. Assicurati che sia: `https://prodcasteddu-apim-demo.azure-api.net/productivity` (senza `/stats`)
3. Verifica che le operation policies abbiano il rewrite URI corretto

### ❌ Errore: "Network request failed" o CORS error

**Causa**: CORS non configurato correttamente in APIM

**Soluzione**:
1. Verifica la policy APIM contenga:
   ```xml
   <cors allow-credentials="true">
     <allowed-origins>
       <origin>https://[tenant].sharepoint.com</origin>
     </allowed-origins>
   </cors>
   ```
2. Se usi `*` come origin, assicurati che `allow-credentials="false"`

## 📊 Debugging Avanzato

### Controlla i Network Logs

1. Apri F12 Developer Tools in SharePoint
2. Vai al tab **Network**
3. Filtra per `prodcasteddu-apim-demo`
4. Cerca la richiesta a `/productivity/stats`
5. Controlla:
   - **Request Headers**: Deve avere `Authorization: Bearer eyJ0eX...`
   - **Response Status**: Deve essere `200 OK`
   - **Response Body**: Deve contenere i dati JSON

### Verifica il Token JWT

1. Copia il token dall'header `Authorization` (senza "Bearer ")
2. Vai su https://jwt.ms
3. Incolla il token
4. Verifica:
   - `aud` = `api://4543e176-c20a-4904-bed3-49463d757c4f` ✅
   - `iss` = `https://sts.windows.net/{tenant-id}/` ✅
   - `scp` = `user_impersonation` ✅
   - Token non scaduto (`exp` > now) ✅

### Controlla Application Insights

1. Vai su Azure Portal → Application Insights
2. Cerca nella sezione **Logs** o **Transaction search**
3. Filtra per le ultime chiamate
4. Verifica che vedi le richieste da APIM → Functions

## ✅ Test di Successo

Se vedi questo output nella webpart, **TUTTO FUNZIONA!** 🎉

```
✅ Dati caricati correttamente da APIM

🔍 Debug - Dati ricevuti dall'API:
{
  "date": "2025-11-03",
  "totalPiecesProduced": 1247,
  "averageProductionSpeed": 42.5,
  "efficiency": 94.2,
  "lastUpdated": "2025-11-03T17:45:00.000Z"
}

[5 card con statistiche visualizzate]
```

## 🎯 Prossimi Passi

Una volta che il tab "Produzione" funziona:

1. ✅ Implementare il tab "Clienti" con chiamata a `/productivity/customers`
2. ✅ Migliorare l'UI con grafici e visualizzazioni
3. ✅ Aggiungere refresh automatico
4. ✅ Implementare caching locale
5. ✅ Rimuovere il debug output JSON (produzione)

## 📝 Note Importanti

- **AadHttpClient gestisce automaticamente** il token refresh
- **Non serve passare manualmente il token** - SPFx lo fa per te
- **Le API permissions devono essere approvate** dall'admin SharePoint
- **Il consent è per-tenant**, quindi tutti gli utenti del tenant potranno usare la webpart
- **CORS deve essere configurato** per il dominio SharePoint specifico in produzione
