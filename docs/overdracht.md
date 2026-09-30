# Overdracht — stand van de rekenmodules

Stand: 30-09-2026, versie 0.1.9, branch `verbeter/berekeningen`.
Dit document is het startpunt voor wie verder bouwt aan de rekenmodules: hoe
het in elkaar zit, welke afspraken gelden, hoe je controleert en wat er nog
open staat. De open punten staan ook als issues op GitHub (label
`berekeningen`).

---

## 1. Opbouw

| Deel | Wat |
|---|---|
| `packages/core` | Rekenkern op mathjs: `parser.ts` (CalcPAD-achtige syntax), `evaluator.ts` (rekent, registreert de eigen functies), `renderer.ts` (HTML). Eigen oplossers: `ligger.ts` (ligger op 1–4 steunpunten, overstek, inklemming, gerber; Timoshenko optioneel), `raamwerk.ts` (vlakke raamwerken, α_cr), `doorsnede.ts` (samengestelde doorsneden). Bouwen: `npm --prefix packages/core run build`; desktop en scripts gebruiken `dist`. |
| `packages/desktop/src/templates` | De rekenbladen, elk als tekst (CalcPAD-achtig) in een TypeScript-string. Registratie in `index.ts`. |
| `packages/desktop/src/components/calc` | Parametrische beelden (`*Designer.tsx`), koppeling blad↔beeld (`designerKeuze.tsx`, via een herkenningstekst uit de titel), modulecatalogus met status (`projectTree.ts`), uitkomst van een blad (`bladResultaat.ts`), afdruk (`PrintDocument.tsx/.css`, `PrintBlad.tsx`, `paginering.ts`), rekenversie en bijwerken van bladen (`bladVersie.ts`, `BladBijwerken.tsx`). |
| `packages/desktop/src/rapport`, `components/rapport` | Constructierapport (hoofdstukken, uitgangspunten, belastingen met opbouwen en gewichtenbibliotheek `gewichten.ts`, bijlage A met de rekenbladen). |
| `packages/desktop/src/store` | Project (exemplaren/bladen, projectgegevens, rapport), projectbestand, undo. |
| `packages/web/src/templates` | Kopieën van de losse normbladen (`eurocode5`, `en1990`–`en1997`, `vandepitte`) voor de web-app. **Byte-gelijk houden** met de desktopversie. |
| `scripts/check-*.mjs` | Controles; `node scripts/check-alles.mjs` draait ze allemaal (nu 72 controles). |

## 2. Afspraken in de bladen

- **Tekst en rekenen**: regels met `'` zijn tekst/HTML, `#if/#else if/#else/#end if`, `#hide/#show`, `@select` voor keuzelijsten, `x = ?` voor invoer. mathjs kan geen tekst met `+` samenvoegen: gebruik `#if`-takken of losse tekstregels.
- **Slotregel**: `Maatgevende UC = … → … voldoet / voldoet niet`. `bladResultaat.leesResultaat` leest daaruit UC en oordeel voor de rapportkop. Kan het blad niet toetsen (onvolledige invoer), dan geen UC en een duidelijke melding; nooit een onterecht 'voldoet'.
- **Uitdraai kaal houden** (afdruk en rapportbijlage): koppen, invoer, formules met ingevulde waarden, tabellen, lijnen, UC's. Geen uitleg op papier.
  - Een prozaregel die helemaal cursief staat (`'<i>…</i>`) is uitleg: de kern geeft hem de klasse `calc-uitleg` en de afdruk laat hem weg. Een toelichting achter een formule langer dan 60 tekens ook.
  - `<i class="ook-afdruk">…</i>` houdt een cursieve regel op papier: gebruik dat voor *niet getoetst*, aannames en *buiten dit blad*.
  - `<span class="alleen-scherm"></span>` in een regel haalt de hele regel van papier; `<span class="alleen-scherm">…</span>` alleen dat stuk; `alleen-afdruk` omgekeerd.
  - `<span class="kolom-2|3|4"></span>` in de toelichting zet korte regels naast elkaar.
- **Rekenwijze**: de projectinstelling `rekenwijze` kiest op gemarkeerde punten tussen de referentie-uitwerking (1) en de norm (0). Een splitspunt heet `X_ref` / `X_nb` met `X = if(rekenwijze ≡ 1; X_ref; X_nb)`; `check-rekenwijze.mjs` bewaakt dat. Gebruik het achtervoegsel `_ref` voor niets anders. Bewuste afwijkingen staan in `docs/afwijkingen-referentie.md`.
- **Invoernamen** mogen niet gelijk zijn aan projectvariabelen (`CC`, `RC`, `DesignLife`, `K_FI`, `onderdeel`, `windgebied`, `terreincategorie`, `rekenwijze`, `locatie`, …); `check-projectvariabelen.mjs` bewaakt dat.
- **Bestaande bladen**: een blad bewaart zijn eigen kopie van de bladtekst. Met *Bladen bijwerken* gaat het naar de nieuwe tekst; bestaande invoer blijft, nieuwe velden krijgen hun beginwaarde. Kies nieuwe velden en beginwaarden zo dat een bijgewerkt oud blad **nooit stil gunstiger** uitkomt (nieuwe keuze standaard op het oude gedrag, of een veilige standaard). Beelden vullen hun `DEFAULTS` ook in bestaande bladen in (seed): een nieuwe standaardwaarde mag een oud blad niet stil veranderen.
- **Profielen**: `components/calc/profielen.ts` is de bron; een blad krijgt een geplakte matrix (`node scripts/check-profielen.mjs --matrix …`), die `check-profielen` gelijk houdt met de bron.

## 3. Normen

- Eurocodes met de Nederlandse nationale bijlagen (NEN-EN 1990 t/m 1997 + NB, NEN 9997-1). Waar de norm-stand rekent, volgt hij de NB; bijvoorbeeld k_cr = 1,0 voor prismatische houten liggers (NB bij 6.1.7(2)).
- **Normtekst nooit in de repo**: alleen artikel-, formule- en tabelnummers. Controleren gebeurt tegen lokale normteksten van de gebruiker, die niet in de repo staan.
- De normbibliotheek in de modulekiezer verwijst naar de officiële NEN-overzichten. NEN 8700/8701 en EN 1999 staan er als zichtbare ontbrekende rekenbladen; de verwijzing is geen inhoudelijke toets. Editie en nationale bijlage moeten per project worden vastgesteld.
- Waar een waarde niet uit de beschikbare tekst te onderbouwen was, is die **invoer** met een korte uitleg op het scherm, of staat de toets als *niet getoetst* op het blad. Zie de issues voor wat nog tegen een volledige normtekst moet worden gelegd.

## 4. Controleren

```
node scripts/check-alles.mjs
cd packages/desktop && npx tsc --noEmit -p .
```

- Elke module heeft een eigen check met handberekeningen (als commentaar bij de verwachting) en vaak een onafhankelijke uitwerking in het script zelf. Verwachtingen alleen aanpassen met een handberekening die aantoont dat de nieuwe waarde juist is.
- `check-renders.mjs` rekent elk blad met elke keuze uit de keuzelijsten; `check-designerkeuze.mjs` controleert blad↔beeld; `check-blad-bijwerken.mjs` het bijwerken.
- Afdruk als PDF (dev-server `npm run dev --workspace=@openaec/calculations-studio`, poort 3021): `node scripts/rapport-pdf.mjs <project.json> <uit.pdf>`. Voor een proefproject met alleen `templateId`'s: `--beginwaarden`, anders rekenen bladen met een beeld met lege invoer.
- Prestaties van de rekenkern en de volgende matrixproef: [rekenkern-prestaties.md](rekenkern-prestaties.md). Herhaal de warme meting met `node scripts/bench-rekenkern.mjs` na het bouwen van de core.
- Werkwijze die fouten vond die de eigen checks misten: na het bouwen van een module rekent een tweede, onafhankelijke controle minstens twee gevallen met de hand na en zoekt gericht naar een onterecht 'voldoet'.

## 5. Bouwen en uitbrengen

- Versie op zeven plekken: `packages/desktop/package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, de desktop-regel in `package-lock.json`, de app-regel in `src-tauri/Cargo.lock`, en de versieregel in `src/i18n/locales/{nl,en}/common.json`.
- Installer: `npm run tauri build` in `packages/desktop`. WebView2 wordt meegebundeld (`webviewInstallMode` embedBootstrapper, `WebView2Loader.dll` in `bundle.resources`).
- Draait de gebouwde app nog, dan houdt die `target/release/WebView2Loader.dll` vast en faalt de build: bouw dan met een eigen `CARGO_TARGET_DIR` (bijvoorbeeld `src-tauri/target-installer`, niet in git).

## 6. Modules

Status in de catalogus: *gereed* (gecalibreerd op referentiebladen), *controleren* (toetsing compleet en nagerekend, nog niet tegen referentiebladen gelegd), *hoeveelhedenraming* (nagerekende hoeveelheden zonder constructieve sterktetoets).

| Groep | Modules |
|---|---|
| Algemeen | Spuwer, Paaldraagvermogen (alle paaltypen van tabel 7.c, trekpalen, kalendercontrole), Permanente vuurlast, Opdrijven en drijvend lichaam, Lastresultante en statisch moment, Ligger (hout of staal), Portaal en spant, Mechanica (doorsnede, vakwerk, standaardgevallen), Hekwerk en balustrade |
| Staal | Stalen kolom, Stalen gevelkolom, Verticaal windverband, Voetplaat, Moment-, Dwarskracht-, Schoorverbinding, Boutberekening (met boutgroep), Lasberekening, Brandwerendheid (staal, hout of beton) |
| Beton | Betonkolom, Betonplaat en console, Poer (2-, 3-, 4-paals en op staal), Betondoorsnede (met M-κ), Pons, Verankeringslengte, Beton detaillering, Beton- en wapeningshoeveelheid, Plaat- en wandhoeveelheden (beide zonder sterktetoets), Kruipfactor |
| Hout | Kolom (met gevelstijl en stempel), Balklaag, Gording, Houten kap, Wandschijf en stabiliteitswanden (één of maximaal zes HSB-wanden), Nagel- en schroefverbinding (ook keep, pen-en-gat, zwaluwstaart) |
| Metselwerk | Dragende metselwerkwand, Metselwerk loodrecht belast, Oplegging op metselwerk |
| Normbladen | EN 1990–1997 per artikel, waaronder wind (gevel, plat dak, zadeldak, schilddak, overkapping, luifel, lijnlast per zone, windmoment) en sneeuw (kiel, ophoping), hout (wringing, tapse ligger, uitkeping, beschot), staal (onderflensbuiging) |

De 38 selecteerbare modules hebben elk een eigen schematisch beeld in
`components/calc/ModuleAfbeelding.tsx`. `check-modulebeelden.mjs` bewaakt de
dekking van de catalogus. Zie [modulebeelden.md](modulebeelden.md).

## 7. Open punten

Afgehandeld in deze werkstand:

- #12 — browseropslag gebruikt de bestandskiezer en overschrijft na Opslaan als dezelfde gekozen handle; zonder browserondersteuning blijft de downloadterugval;
- #13 — inverse temperatuurcoëfficiënten tonen de werkelijke waarde in 1/K of 1/degC, gecontroleerd met dimensieloze rek;

Nog open als issues met label `berekeningen`:

- #14 — waarden die nog tegen een volledige normtekst moeten worden gelegd;
- #15 — open punten uit het register van afwijkingen: besluit van de constructeur;
- #16 — onderdelen die de modules nog niet toetsen (op het blad als *niet getoetst* vermeld);
- #17 — normen die nog ontbreken (bestaande bouw, aluminium); alleen de officiële bronverwijzingen staan in de bibliotheek, nog geen rekenbladen.

Verder in [backlog.md](backlog.md): IFC-export, licentie, rapportengine.

Het oudere losse blad Schijfwerking blijft in de sjabloonregistratie voor bestaande
projecten en bijwerken van bestaande exemplaren; nieuwe projecten gebruiken de
gecombineerde HSB-module met de keuze voor één tot zes wanden.
