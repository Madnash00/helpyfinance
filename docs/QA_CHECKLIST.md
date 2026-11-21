# Verifiche della migrazione iniziale

| Controllo | Esito |
| --- | --- |
| Ricostruzione privata con la baseline v1.7 | Identità byte per byte confermata con `cmp` e SHA-256 |
| Workbook reale | Il parser della dashboard ha letto movimenti e anni in locale |
| Dataset dimostrativo | Parser XLSX, saldo, segni, IVA 0/4/10/22%, import CSV valido e non valido, chiave stabile per import ripetuto |
| Excel nativo dimostrativo | ZIP e XML leggibili. Sette fogli, quattro grafici rilevati anche da openpyxl e formula MON presente |
| PDF dimostrativo | Generazione completata. PDF di nove pagine leggibile da pdfinfo |
| Microsoft Excel per Mac | Apertura senza recupero da verificare in Microsoft Excel |
| Smoke test browser | Suite disponibile. L'avvio del motore Chromium è stato bloccato nell'ambiente di esecuzione |
| Backup JSON | Previsto nello smoke test. La UI v1.7 non offre un comando di ripristino JSON |
| Dati pubblici | Template con segnaposto, workbook e grafica dimostrativi. File e output privati esclusi da Git |

## Ripetere i controlli

```sh
python3 scripts/standalone.py build dist/Helpy-Finance-demo.html
node tests/verify.cjs dist/Helpy-Finance-demo.html dist/qa
python3 tests/check_xlsx.py dist/qa/verifica.xlsx
```

Il test Node richiede Node.js 18 o successivo. Il test browser richiede Playwright e Chromium disponibili. Esegui:

```sh
node tests/smoke.cjs dist/Helpy-Finance-demo.html dist/smoke
```

Continua il collaudo UI con selezione di anno, mese, tipo, categoria e progetto, modifica e cancellazione dei movimenti, persistenza di classificazioni e note, separazione Budget/Forecast, tooltip e navigazione da tastiera. Verifica anche l'impaginazione del PDF con l'intestazione reale e le aperture XLSX su Excel per Mac sia con righe fittizie sia con quelle reali. In caso di riparazione conserva il log prodotto da Excel per individuare il documento XML da correggere.
