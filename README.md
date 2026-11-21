# Helpy Finance

Dashboard finanziaria autonoma di Helpy Group. La baseline applicativa è la v1.7. Il repository contiene il codice e un esempio generato con dati fittizi.

## Avvio con dati dimostrativi

Richiede Python 3.9 o successivo. Dalla cartella del repository:

```sh
python3 scripts/standalone.py build dist/Helpy-Finance-demo.html
```

Apri il file generato nel browser. Il file include CSS, JavaScript, librerie e workbook dimostrativo.

## Avvio con i dati originali

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
