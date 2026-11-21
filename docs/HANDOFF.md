# Sviluppo di Helpy Finance

Usa il repository come riferimento per il codice. Per ogni modifica parti da una branch dedicata, confronta il nuovo HTML con la baseline pertinente ed esegui le verifiche in `QA_CHECKLIST.md`. Mantieni il bundle corrente finché la separazione in moduli può essere effettuata e verificata senza regressioni.

Gli estratti bancari, il profilo di report, gli HTML con dati aziendali, i backup e le esportazioni restano nell'ambiente locale. Prima di ogni push esegui `python3 tests/check_public.py` e controlla il diff staged. Costruisci gli artefatti pubblici esclusivamente con il profilo dimostrativo.

Per interventi sull'export Excel, conserva sette fogli e quattro grafici, verifica i riferimenti OOXML e raccogli l'esito di apertura in Microsoft Excel per Mac.
