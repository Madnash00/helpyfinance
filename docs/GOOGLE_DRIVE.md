# Collegare Helpy Finance a Google Drive

Helpy Finance v1.8 è una Web App Google Apps Script. Il file JSON su Drive è la fonte comune per movimenti, classificazioni, regole, Budget, Forecast ed eliminazioni. La Web App carica la revisione attuale all'apertura. Il tema resta nel browser. Le modifiche sono inviate premendo **Salva su Drive**.

## Deploy

1. Compila `python3 scripts/build_drive.py dist/Bridge.html` con Python 3.9 o successivo.
2. In Apps Script, inserisci il backend `apps-script/Code.gs` e crea il file HTML chiamato `Bridge` con l'output generato. Usa la modalità Web App con esecuzione come utente che accede all'app. L'URL operativo è quello del deployment `/exec`.
3. Per una nuova installazione del backend generico, imposta la proprietà `HF_OWNER_EMAIL` nell'editor Apps Script. `HF_ALLOWED_EMAILS` può contenere gli account aggiuntivi separati da virgole. Gli account ammessi devono anche avere i permessi sul file Drive. La Web App non modifica i permessi del file.
4. Se esiste già un database, conserva il suo `HF_DATABASE_FILE_ID`. Se non esiste, il proprietario può inizializzarlo selezionando il backup JSON più recente. Sono accettati i precedenti export Helpy Finance e le copie dai database Drive. Imposta `HF_DATABASE_FOLDER_ID` per usare una cartella già predisposta. Altrimenti, alla prima inizializzazione viene creata la cartella privata **Helpy Finance DB** nel Drive del proprietario.
5. Le proprietà facoltative `HF_BALANCE_REFERENCE_DATE` e `HF_BALANCE_REFERENCE_AMOUNT` conservano la data ISO e il saldo di riferimento della v1.7. In loro assenza la dashboard mostra N/D per la disponibilità bancaria.

Il salvataggio confronta la revisione di apertura con quella su Drive. Se nel frattempo un altro utente salva, la Web App rifiuta la sovrascrittura e consente di scaricare il JSON con le modifiche locali prima di riaprire. Prima del primo salvataggio sui dati aziendali, verifica conteggio movimenti, esercizi, Budget, Forecast e riferimenti di saldo rispetto al backup importato. Il limite per il JSON è 8 MiB.

La build offline v1.7 rimane disponibile con il precedente comando `scripts/standalone.py`.

## Test

```sh
node tests/drive.cjs
python3 scripts/build_drive.py dist/Bridge.html
```

Il test simula il protocollo Apps Script. Per il collaudo sul servizio reale, apri la Web App con l'account proprietario, autorizza Google quando richiesto, verifica la lettura e la revisione, poi ripeti con un secondo browser per verificare un conflitto su dati di prova.
