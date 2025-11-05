# Azure Configuration Files

## aad-app-config.json

Questo file viene **generato automaticamente** durante il setup dell'App Registration Azure AD tramite lo script `azure/scripts/setup-aad-app.ps1`.

⚠️ **Non committare questo file nel repository** - contiene informazioni specifiche del tuo tenant.

Il file è già incluso nel `.gitignore` e contiene placeholder generici nel repository.

### Struttura del file:

```json
{
    "applicationIdUri": "api://YOUR-CLIENT-ID-HERE",
    "tenantId": "YOUR-TENANT-ID-HERE",
    "scope": "api://YOUR-CLIENT-ID-HERE/user_impersonation",
    "createdDate": "YYYY-MM-DD HH:MM:SS",
    "clientId": "YOUR-CLIENT-ID-HERE"
}
```

### Come generarlo:

Esegui lo script di setup:

```powershell
cd azure/scripts
./setup-aad-app.ps1 -AppName "Productivity API"
```

Il file verrà creato automaticamente con i tuoi valori reali.
