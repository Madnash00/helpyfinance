# Collegare Helpy Finance a Google Drive

La [dashboard](https://madnash00.github.io/helpyfinance/) è pubblicata su GitHub Pages da `main:/docs`. Google Apps Script espone le operazioni sul database JSON esistente su Google Drive. Il frontend apre il canale Google all’avvio, in parallelo al caricamento della dashboard, e legge la revisione con un’unica richiesta. Se il browser impedisce a Google di inviare la sessione nel contesto incorporato, la stessa scheda apre il gateway Apps Script. Il gateway usa la sessione Google come sito principale e carica l’interfaccia pubblicata su GitHub Pages. Il browser ricorda questa modalità, senza memorizzare token o dati del database. Il gateway scambia messaggi con l'origine GitHub Pages e con la singola sessione aperta dalla dashboard.

## Aggiornare il frontend

```sh
python3 scripts/build_drive.py --pages --payload dist/pages.js
cp dist/pages.js docs/pages.js
node --check docs/pages.js
git add docs/pages.js
python3 tests/check_public.py
```

Aggiorna anche il parametro `v` nel riferimento a `pages.js` in `docs/index.html` (ad esempio con i primi otto caratteri dello SHA-256 del nuovo file). Commit e push su `main` attivano la pubblicazione. I dati operativi e le proprietà Apps Script rimangono in Google.

## Aggiornare il backend

Aggiorna `Code.gs` e `Gateway.html` nel progetto Apps Script esistente. In **Gestisci deployment** aggiorna il deployment Web App con una nuova versione, con esecuzione come utente che accede all'app. Mantieni l'URL `/exec` usato da `docs/drive-transport.js`, le proprietà del database e i permessi del file Drive.

## Configurare una nuova installazione

Nel backend generico, imposta `HF_OWNER_EMAIL` nelle proprietà Apps Script. `HF_ALLOWED_EMAILS` può contenere gli account aggiuntivi separati da virgole. Gli account ammessi devono avere anche i permessi sul file Drive. La Web App non modifica i permessi del file.

Se hai già un database, imposta `HF_DATABASE_FILE_ID` sul file JSON esistente. Se devi inizializzarlo, il proprietario può selezionare il backup JSON o incollarne il contenuto. Le proprietà facoltative `HF_DATABASE_FOLDER_ID`, `HF_BALANCE_REFERENCE_DATE` e `HF_BALANCE_REFERENCE_AMOUNT` permettono di specificare una cartella Drive già predisposta e il saldo di riferimento. In assenza di un riferimento per il saldo, la dashboard mostra N/D per la disponibilità bancaria. In assenza di una cartella configurata, l’inizializzazione crea **Helpy Finance DB** nel Drive del proprietario.

Il salvataggio confronta la revisione di apertura con quella su Drive. Se nel frattempo un altro utente salva, la Web App rifiuta la sovrascrittura e consente di scaricare il JSON con le modifiche locali prima di riaprire. Prima del primo salvataggio sui dati aziendali, verifica conteggio movimenti, esercizi, Budget, Forecast e riferimenti di saldo rispetto al backup importato. Il limite per il JSON è 8 MiB.

La build offline v1.7 rimane disponibile con il precedente comando `scripts/standalone.py`.

## Test

```sh
python3 tests/check_public.py
node tests/drive.cjs
python3 scripts/build_drive.py --pages --payload dist/pages-verifica.js
node --check dist/pages-verifica.js
cmp dist/pages-verifica.js docs/pages.js
```

Il test simula il protocollo Apps Script. Per il collaudo sul servizio reale, apri la Web App con l'account proprietario, autorizza Google quando richiesto, verifica la lettura e la revisione, poi ripeti con un secondo browser per verificare un conflitto su dati di prova.
