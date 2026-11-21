# Helpy Finance

Web App finanziaria di Helpy Group. Il ramo `main` contiene il codice della dashboard, il backend Apps Script e la procedura di rilascio.

| Percorso | Contenuto |
| --- | --- |
| `src/` | Dashboard, grafica ed esportazioni |
| `apps-script/` | Backend Apps Script, interfaccia con Google Drive e file di deploy |
| `scripts/` | Build Web App e versione autonoma |
| `tests/` | Verifiche di build, salvataggio e contenuti pubblicabili |
| `examples/` | Dati dimostrativi |
| `docs/` | Architettura, modello dati e istruzioni di rilascio |

## Web App online

La dashboard è servita da [GitHub Pages](https://madnash00.github.io/helpyfinance/) e Google Apps Script gestisce l’accesso a Drive. Il database operativo è il JSON nella cartella Google Drive **Helpy Finance DB**. Nel repository pubblico sono versionati sorgenti e dati dimostrativi. Le proprietà dello script identificano il database e gli account abilitati.

Apri la dashboard e seleziona **Collega Google Drive**. Lascia aperta la finestra Google mentre lavori. La dashboard legge la revisione corrente e invia le modifiche premendo **Salva su Drive**. Per aggiornare la Web App segui la [procedura di rilascio](docs/GOOGLE_DRIVE.md).

## Demo locale v1.7

Richiede Python 3.9 o successivo. Dalla cartella del repository:

```sh
python3 scripts/standalone.py build dist/Helpy-Finance-demo.html
```

Apri il file generato nel browser. Il file include CSS, JavaScript, librerie e workbook dimostrativo.

## Versione autonoma v1.7 con i dati originali

Conserva l'HTML v1.7 e le copie di lavoro in una cartella riservata. L'estrazione richiede il file originale verificato via SHA-256. Usa un nuovo percorso di destinazione per ogni estrazione e ogni build.

```sh
python3 scripts/standalone.py extract "/percorso/Helpy-Finance-v1.7.html" private/inputs
python3 scripts/standalone.py build dist/Helpy-Finance-v1.7.html --private private/inputs
```

La cartella di estrazione contiene il workbook e il profilo privato. L'HTML prodotto incorpora entrambi. Aprilo in locale. Se cambi percorso, nome del file, browser o origine HTTP, verifica di avere un backup delle personalizzazioni locali. Conserva anche la copia originale nel suo percorso abituale durante il passaggio.

- [Architettura](docs/ARCHITECTURE.md)
- [Modello dati e calcoli](docs/DATA_MODEL.md)
- [Verifiche e limiti](docs/QA_CHECKLIST.md)
- [Changelog](docs/CHANGELOG.md)
