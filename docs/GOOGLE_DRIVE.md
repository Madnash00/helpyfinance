# Collegare Helpy Finance a Google Drive

Helpy Finance v1.8 è una Web App Google Apps Script. Il file JSON su Drive è la fonte comune per movimenti, classificazioni, regole, Budget, Forecast ed eliminazioni. La Web App carica la revisione attuale all'apertura. Il tema resta nel browser. Le modifiche sono inviate premendo **Salva su Drive**.

## Aggiornare la Web App esistente

1. Esegui i controlli qui sotto. Se cambia il frontend, genera il nuovo `bridge-payload.js`, confronta il risultato con quello versionato e inserisci il file aggiornato in un commit pubblico.
2. In `apps-script/Bridge.html` aggiorna l’URL del payload al commit esatto appena pubblicato, quindi aggiorna l’attributo `integrity` con lo SHA-384 Base64 del file. Mantieni `crossorigin="anonymous"`.
3. Nel progetto Google Apps Script già in uso aggiorna `Bridge.html` e, quando cambia il backend, `Code.gs`. Mantieni le proprietà `HF_DATABASE_FILE_ID` e `HF_DATABASE_FOLDER_ID`, che puntano al database e alla cartella operativi, e conserva gli account autorizzati configurati nel progetto.
4. In **Gestisci deployment** aggiorna il deployment Web App esistente con **Nuova versione** ed esecuzione come utente che accede all’app. Apri lo stesso URL `/exec` e verifica la revisione letta da Drive.

Per calcolare il valore da anteporre con `sha384-` in `integrity`:

```sh
openssl dgst -sha384 -binary apps-script/bridge-payload.js | openssl base64 -A
```

## Configurare una nuova installazione

Nel backend generico, imposta `HF_OWNER_EMAIL` nelle proprietà Apps Script. `HF_ALLOWED_EMAILS` può contenere gli account aggiuntivi separati da virgole. Gli account ammessi devono avere anche i permessi sul file Drive. La Web App non modifica i permessi del file.

Se hai già un database, imposta `HF_DATABASE_FILE_ID` sul file JSON esistente. Se devi inizializzarlo, il proprietario può selezionare il backup JSON o incollarne il contenuto. Le proprietà facoltative `HF_DATABASE_FOLDER_ID`, `HF_BALANCE_REFERENCE_DATE` e `HF_BALANCE_REFERENCE_AMOUNT` permettono di specificare una cartella Drive già predisposta e il saldo di riferimento. In assenza di un riferimento per il saldo, la dashboard mostra N/D per la disponibilità bancaria. In assenza di una cartella configurata, l’inizializzazione crea **Helpy Finance DB** nel Drive del proprietario.

Il salvataggio confronta la revisione di apertura con quella su Drive. Se nel frattempo un altro utente salva, la Web App rifiuta la sovrascrittura e consente di scaricare il JSON con le modifiche locali prima di riaprire. Prima del primo salvataggio sui dati aziendali, verifica conteggio movimenti, esercizi, Budget, Forecast e riferimenti di saldo rispetto al backup importato. Il limite per il JSON è 8 MiB.

La build offline v1.7 rimane disponibile con il precedente comando `scripts/standalone.py`.

## Test

```sh
python3 tests/check_public.py
node tests/drive.cjs
python3 scripts/build_drive.py --payload dist/bridge-payload.js
node --check dist/bridge-payload.js
cmp dist/bridge-payload.js apps-script/bridge-payload.js
```

Il test simula il protocollo Apps Script. Per il collaudo sul servizio reale, apri la Web App con l'account proprietario, autorizza Google quando richiesto, verifica la lettura e la revisione, poi ripeti con un secondo browser per verificare un conflitto su dati di prova.
