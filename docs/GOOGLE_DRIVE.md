# Collegare Helpy Finance a Google Drive

La [dashboard](https://madnash00.github.io/helpyfinance/) è pubblicata su GitHub Pages da `main:/docs`. Google Apps Script espone le operazioni sul database JSON esistente su Google Drive. Dopo il primo accesso, il browser del proprietario conserva una sessione di 30 giorni. Il frontend carica i dati in un’unica richiesta all’API. Le sessioni si possono revocare eliminando le proprietà con prefisso `HF_BROWSER_SESSION_` nel progetto Apps Script.

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

Carica `Code.gs`, `Session.gs`, `Gateway.html` ed `Enrollment.html` nel progetto Apps Script esistente. Usa due versioni immutabili dello stesso progetto per condividere la configurazione privata e il lock del database.

1. Per l’autorizzazione del browser mantieni `HF_API_ONLY = false`. Aggiorna il deployment attuale, eseguito come l’utente che accede, e conserva il suo URL in `enrollmentUrl`.
2. Per l’API, salva una versione separata con `HF_API_ONLY = true`. Pubblica un nuovo deployment eseguito come proprietario e raggiungibile senza login Google. Le operazioni sul database richiedono sempre la sessione rilasciata nel passaggio 1.
3. Prima di pubblicare GitHub Pages, verifica che una richiesta senza sessione riceva `SESSION_REQUIRED`. Imposta `apiUrl` in `docs/drive-transport.js` e aggiorna il relativo parametro `v` in `docs/index.html`. Verifica anche l’accesso e il caricamento con un browser reale.

## Configurare una nuova installazione

Nel backend generico, imposta `HF_OWNER_EMAIL` nelle proprietà Apps Script. `HF_ALLOWED_EMAILS` può contenere gli account aggiuntivi separati da virgole. Gli account ammessi devono avere anche i permessi sul file Drive. La Web App non modifica i permessi del file.

Se hai già un database, imposta `HF_DATABASE_FILE_ID` sul file JSON esistente. Se devi inizializzarlo, il proprietario può selezionare il backup JSON o incollarne il contenuto. Le proprietà facoltative `HF_DATABASE_FOLDER_ID`, `HF_BALANCE_REFERENCE_DATE` e `HF_BALANCE_REFERENCE_AMOUNT` permettono di specificare una cartella Drive già predisposta e il saldo di riferimento. In assenza di un riferimento per il saldo, la dashboard mostra N/D per la disponibilità bancaria. In assenza di una cartella configurata, l’inizializzazione crea **Helpy Finance DB** nel Drive del proprietario.

Il salvataggio confronta la revisione di apertura con quella su Drive. Se nel frattempo un altro utente salva, la Web App rifiuta la sovrascrittura e consente di scaricare il JSON con le modifiche locali prima di riaprire. Prima del primo salvataggio sui dati aziendali, verifica conteggio movimenti, esercizi, Budget, Forecast e riferimenti di saldo rispetto al backup importato. Il limite per il JSON è 8 MiB.

La build offline v1.7 rimane disponibile con il precedente comando `scripts/standalone.py`.

## Test

```sh
python3 tests/check_public.py
node tests/drive.cjs
node tests/session.cjs
python3 scripts/build_drive.py --pages --payload dist/pages-verifica.js
node --check dist/pages-verifica.js
cmp dist/pages-verifica.js docs/pages.js
```

Il test simula il protocollo Apps Script. Per il collaudo sul servizio reale, apri la Web App con l'account proprietario, autorizza Google quando richiesto, verifica la lettura e la revisione, poi ripeti con un secondo browser per verificare un conflitto su dati di prova.
