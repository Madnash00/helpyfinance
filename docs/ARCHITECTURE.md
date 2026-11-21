# Architettura

| File | Responsabilità |
| --- | --- |
| `src/index.html` | Documento, CSS, favicon e punti di inserimento per script e workbook |
| `src/dashboard.js` | Bundle v1.7 con React, SheetJS, icone, UI e logica applicativa |
| `src/report.js` | Generatore nativo dei report XLSX e PDF |
| `scripts/standalone.py` | Estrazione verificata della v1.7 e generazione dell'HTML autonomo |
| `examples/` | Workbook e grafica dimostrativi, generati per questo repository |

Il processo Python usa soltanto la libreria standard. I file di `src/` sono template. La build inserisce i valori del profilo, poi assembla i tre script nell'HTML. La baseline v1.7 resta il riferimento storico e la build con il suo profilo è identica byte per byte.

All'avvio la UI richiede `/data/Helpy_PL.xlsx`. Nella v1.7 il wrapper di `window.fetch` intercetta sempre quel percorso e risponde con i byte del workbook incorporato. Il percorso non richiede una cartella pubblicata sul server. Aprire in locale è la modalità prevista per il file aziendale.

Il profilo privato comprende saldo e data di riferimento, anagrafiche di progetto scorporate, logo PDF e testo dell'intestazione a piè di pagina. Il workbook sorgente e il profilo vanno conservati localmente. Gli output sono generati con permessi di lettura e scrittura per il proprietario sui sistemi che li supportano. Il browser usa `localStorage` per le modifiche operative.

Riferimento v1.7, SHA-256:

`ac5046c2650b19554bd46edc7b24e66740c40151dec302037ac18d5fc39dc25e`
