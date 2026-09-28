# Werkafspraken voor deze repository

Lees eerst [docs/overdracht.md](docs/overdracht.md): opbouw, afspraken in de
rekenbladen, controles, bouwen en de stand van de modules.

- Communicatie, commentaar en teksten in het Nederlands, in de stijl van de
  omliggende code.
- Nergens in de repo (code, commentaar, docs, commits, fixtures, tests) namen
  van externe of commerciële rekensoftware, ook geen afkortingen daarvan; geen
  project-, klant- of persoonsgegevens; geen verwijzingen naar gesprekken met
  een assistent. Normtekst niet overnemen: alleen artikel-, formule- en
  tabelnummers.
- Een rekenblad mag nooit onterecht 'voldoet' geven. Bij twijfel: veilige kant,
  of 'niet getoetst' op het blad.
- Rekenwaarden alleen wijzigen met een handberekening; leg die vast als
  commentaar in het check-script van de module.
- Voor het committen: `node scripts/check-alles.mjs` en
  `cd packages/desktop && npx tsc --noEmit -p .` moeten groen zijn.
- De normbladen in `packages/web/src/templates` zijn byte-gelijke kopieën van
  de desktopversie.
- Windows-installers: WebView2 meebundelen (`embedBootstrapper`, silent) en
  `WebView2Loader.dll` in `bundle.resources`.
