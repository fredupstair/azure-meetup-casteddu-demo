# SPFx Configuration Files

## serve.json

Questo file configura il server di sviluppo locale di SPFx.

⚠️ **Prima di usare `gulp serve`, aggiorna il campo `initialPage`** con:
- Il nome del tuo tenant SharePoint (sostituisci `YOUR-TENANT`)
- Il nome del tuo sito SharePoint (sostituisci `YOUR-SITE`)

### Esempio:

```json
{
  "initialPage": "https://contoso.sharepoint.com/sites/MyTeamSite/_layouts/workbench.aspx"
}
```

### Come trovare i tuoi valori:

1. Accedi a SharePoint Online
2. Naviga al sito dove vuoi testare la webpart
3. L'URL sarà nel formato: `https://[YOUR-TENANT].sharepoint.com/sites/[YOUR-SITE]`
4. Usa questi valori nel file `serve.json`

## package-solution.json

Configura la soluzione SPFx e le richieste di permessi API.

Le richieste di permessi per "Productivity API" richiedono:
- L'App Registration Azure AD configurata (vedi `azure/scripts/setup-aad-app.ps1`)
- L'approvazione dell'amministratore tenant in SharePoint Admin Center dopo il deploy
