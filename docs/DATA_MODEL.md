# Modello dati e calcoli v1.7

| Entità | Origine e comportamento |
| --- | --- |
| Movimento | Foglio `Estratto Conto` all'avvio o CSV incrementale. Data, valuta, descrizione, importo, classificazione, imponibile, saldo, IVA, fee, progetto e note. L'importo usa la colonna IMPORTO quando presente, altrimenti AVERE meno DARE. Le righe di saldo sono escluse dai movimenti. |
| Identità | L'ID considera data, valuta, importo, causale, IBAN e riferimento ABI. Una seconda chiave confronta anche data, valuta, importo e descrizione normalizzata per unire dati preesistenti ed escludere duplicati. |
| Budget | Valori annuali dal foglio `P&L AAAA` per voce. Le pianificazioni salvate per anno e voce possono sostituire l'importo o sommare le righe di dettaglio. |
| Forecast | Pianificazione separata per anno e voce. Budget e Forecast hanno scostamenti distinti. |
| KPI consuntivi | La sintesi somma gli imponibili positivi delle entrate e il valore assoluto degli imponibili delle uscite. MON = ricavi meno costi. Il calcolo del netto in riattribuzione usa il lordo assoluto diviso per 1 più l'aliquota IVA. |
| Disponibilità | Saldo di riferimento a una data, più o meno la somma dei movimenti successivi o precedenti rispetto alla data osservata. La lista di movimenti di saldo è esclusa dal calcolo. |

| Chiave locale | Contenuto |
| --- | --- |
| `hf-state` | Stato dei movimenti e modifiche locali. All'avvio il workbook e lo stato sono riconciliati per chiave di confronto. |
| `hf-deleted-movements` | ID dei movimenti eliminati da escludere al caricamento e all'import. |
| `hf-keyword-rules` | Regole di classificazione per anno. |
| `hf-planning` | Budget, Forecast e dettaglio delle pianificazioni per anno. |
| `hf-forecast` | Chiave storica letta all'inizializzazione delle pianificazioni. |
| `hf-dark` | Preferenza del tema. |

La v1.7 esporta un JSON con dati, pianificazione e regole. La sua interfaccia di importazione accetta CSV. Per cambiare origine o percorso senza perdere impostazioni è necessario conservare anche i valori `hf-*` del profilo browser di origine, inclusi gli ID eliminati e il tema. Fai il passaggio con la v1.7 di origine ancora accessibile.
