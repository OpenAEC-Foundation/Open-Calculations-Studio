# Backlog — vastgelegde vervolgstappen

Punten die bewust naar later zijn geschoven, met de reden erbij. Geen
wensenlijst: alles hier is een besluit dat al genomen is, alleen nog niet
uitgevoerd.

---

## 1. Gording en stalen gevelkolom rekenen hun eigen q_p — afgerond

| | |
|---|---|
| Modules | Gording (`templates/gording.ts`), stalen gevelkolom (`templates/stalenGevelkolom.ts`) |
| Norm | NEN-EN 1991-1-4 + NB, §4 (Tabel NB.1 windgebied, Tabel NB.3-4.1 terreincategorie) en §7.2.2 (Tabel NB.6 – 7.1) |
| Vastgelegd | 25-08-2026 · **gording afgerond 26-08-2026** · **gevelkolom afgerond 25-09-2026** |

Beide bladen rekenen de keten windgebied → v_b → c_r(z) → v_m → I_v → q_p(z)
zelf, met windgebied en terreincategorie uit de projectgegevens en de
referentiehoogte als bladinvoer, want die hoort bij het constructiedeel en niet
bij het project. De gording is gekalibreerd op zeven referentiebladen die alleen
in de windvelden verschillen (`scripts/check-gording.mjs`, sets wind1 t/m
wind7), inclusief de ondergrens z_min en alle drie de windgebieden en
terreincategorieën.

De gevelkolom vroeg een rekenwaarde van de wind. Hij vraagt nu niets meer over
wind dan de hoogte en diepte van het gebouw en de afstand van de kolom tot de
hoek, en past γ_Q bij de gevolgklasse zelf toe. De drukcoëfficiënten komen uit
tabel NB.6 – 7.1: zone D bij druk, bij zuiging de ongunstigste van zone E en de
zijgevelzone A, B of C; c_pi is +0,2 of −0,3. Voor dit blad bestaan geen
referentiebladen; `scripts/check-gevelkolom.mjs` rekent het na met een
onafhankelijke uitwerking en handberekeningen.

Beide bladen hebben een keuze om q_p zelf in te vullen; de gevelkolom ook om de
netto winddruk en -zuiging zelf in te vullen, bijvoorbeeld bij een dominante
opening in de gevel.

---

## 2. IFC-export — wat er na de projectbrede export nog open staat

| | |
|---|---|
| Modules | `packages/core/src/ifc-generator.ts`, de export in `CalcTab` |
| Vastgelegd | 25-08-2026 |

Sinds 25-08-2026 schrijft `Opslaan` het héle project als één IFCX (en STEP),
met een element per exemplaar. Wat daarna nog open staat, met de volledige
uitleg in [ifc-export.md](ifc-export.md):

1. **Namespace voor toetsresultaten.** `properties` en `verification` zijn nu
   kale sleutels. OpenAEC werkt met namespaces per domein. Vraag aan Maarten
   of er al een afspraak ligt; zo niet, dan is dit programma de eerste die er
   een nodig heeft.
2. **Detectiedekking.** De valse positieven zijn eruit (zie ifc-export.md),
   maar nog steeds leveren 9 van de 79 bladen een element op, in drie soorten:
   paal, fundering, balk. Kolommen, wanden en verbindingen worden niet
   herkend. Uitbreiden vraagt domeinkennis, geen giswerk.
3. **Bladen zonder eigen element** (boutberekening, kruipfactor) leveren nog
   niets in de IFCX, ook niet gekoppeld. Hangt af van punt 1.
4. **Model inladen en elementen aanwijzen.** Het veld `elementen` bestaat, er
   is nog geen manier om het te vullen. Vraagt een viewer-component.
5. **Geometrie.** Bestaat niet in dit programma en zou nieuwe invoer vragen.

## 3. Balklaag en Gording rekenen het eigen gewicht verschillend

| | |
|---|---|
| Modules | `templates/balklaag.ts`, `templates/gording.ts` |
| Vastgelegd | 26-08-2026 |

Beide zijn gecalibreerd op de referentie-uitwerking, maar met een andere uitkomst van
dezelfde discussie:

```
balklaag:  A · ρ_mean(EN 338) · 9,81      (keuzelijst biedt 550 kg/m³ aan)
gording:   A · 5,5 kN/m³                   (= 550 kg/m³ · g = 10, hardcoded)
```

In één en hetzelfde project krijgt de vloer dus de normconforme dichtheid en
het dak die van de referentie-uitwerking. Dat is niet uit te leggen op een rapport waar beide
bladen in staan.

**Waarom later:** de keuze zelf is niet vrij — zie punt 8 van
[afwijkingen-referentie.md](afwijkingen-referentie.md), waar vastligt dat de
norm voorgaat. Wat wél werk is: gording dezelfde keuzelijst geven, de
controlescripts op de de referentie-uitwerking-stand zetten, en nagaan of de andere
houtmodules (kolom, schijfwerking) hetzelfde probleem hebben.

---

## 4. Geen LICENSE-bestand

De OpenAEC-familie is LGPL-3.0; deze repo heeft geen LICENSE. Voor een
stichting die alles open wil hebben is dat een gat.

---

## 5. De Rust-rapportengine is niet aangesloten

| | |
|---|---|
| Modules | `lib/documentToReport.ts`, `tauri/pdfReport.ts`, `src-tauri/Cargo.toml` |
| Vastgelegd | 25-08-2026 |

Afdrukken loopt sinds 25-08-2026 via de browser (`components/calc/PrintDocument.tsx`),
niet via `openaec-core`. Twee redenen:

1. **De engine gooit tekeningen weg.** `documentToReport` slaat svg- en
   image-knopen over — *"skipped (out-of-scope for PDF)"*. Acht sjabloon-
   bestanden bevatten `@svg` of `@img(`, dus de uitdraai bevatte geen enkele
   tekening. Voor een constructieberekening is dat niet acceptabel.
2. **De app is er niet mee te bouwen.** `Cargo.toml` heeft een pad-afhankelijk-
   heid `openaec-core = { path = "../../../../openaec-reports/..." }`. Zonder
   die zusterrepo faalt `cargo build`, en daarmee de hele desktop-app — niet
   alleen de PDF.

`documentToReport.projectToReport` en `savePdfReport` staan er nog; ze worden
alleen niet aangeroepen.

### Wat de proef van 25-08-2026 opleverde

De engine is die dag voor het eerst echt gedraaid, met een wegwerp-crate die
`generate_pdf_bytes` aanroept op de `ReportData` die dit programma zelf
opbouwt. Bevindingen, van hard naar zacht:

1. **Hij is nooit aangeroepen geweest.** Wij stuurden `status: "draft"`, maar
   het schema kent alleen `CONCEPT` / `DEFINITIEF` / `REVISIE`. Serde weigert
   dat, dus élke aanroep zou op de eerste regel zijn omgevallen. Dit is op
   25-08-2026 gerepareerd in `documentToReport.ts`.

2. **De engine heeft assets nodig die niet in de crate zitten.** Zonder
   `OPENAEC_TENANT_DIR`, `OPENAEC_TENANTS_ROOT` en `OPENAEC_FONTS_DIR` (of een
   werkmap ín de reports-monorepo) levert hij 12 lege pagina's van 14 kB. Mét
   die verwijzingen: 868 kB, 13 pagina's, 7 ingesloten fonts, echte getallen.
   Voor een Tauri-app betekent dat: de tenant-map (fonts + template-YAML's)
   moet worden meegeleverd en die omgevingsvariabelen moeten worden gezet.

3. **Maar de uitdraai is nog geen berekening.** Er komen alleen de
   rekentabellen uit — geen voorblad, geen kopjes, geen proza, en geen
   variabelenamen. Je leest `150 mm | 150 mm | mm` zonder te weten dat het
   `D_eq` is. Van de zeven ingesloten fonts wordt er één gebruikt: er staat
   werkelijk niets anders in. Wisselen naar de template `structural_report`
   maakte geen verschil.

4. **Onze converter dubbelt de eenheid.** `result` bevat al "150 mm" en er gaat
   apart nog `unit: "mm"` mee; de engine drukt allebei af.

5. **Er is meer mogelijk dan wij gebruiken.** Het schema kent een `ImageBlock`
   (`src` als pad, URL of base64 — dus tekeningen kúnnen mee) en een
   `CheckBlock` met `description`, `required_value`, `calculated_value`,
   `unity_check` en `limit`. Dat laatste is precies een Eurocode-toetsing; onze
   converter maakt van alles een `calculation`-blok.

**Conclusie:** de engine werkt, maar onze kant ervan is half af. Om deze weg
bruikbaar te maken is nodig: variabelenamen en proza meegeven, `CheckBlock`
gebruiken voor unity checks, tekeningen als `ImageBlock`, de dubbele eenheid
eruit, en de tenant-assets meeleveren. Tot die tijd is afdrukken via de browser
de betere uitdraai — die heeft de tekeningen en de opmaak al.

Punt 2 is op 25-08-2026 opgelost: `openaec-core` is nu een **optionele
git-afhankelijkheid** op de publieke repo in plaats van een pad naar een
zusterrepo. `cargo build` werkt daarmee overal zonder die repo; met
`--features rapportengine` komt de engine mee. Wat nog nodig is om de engine
weer als PDF-weg te gebruiken: een blokvorm in het ReportData-schema waarmee
een tekening of afbeelding mee kan.

Bevestigd op 25-08-2026 met Rust 1.98.0 (MSVC): `cargo check` slaagt zonder de
feature (de app bouwt dus op zichzelf), `cargo check --features rapportengine`
haalt `openaec-core` en `openaec-layout` van commit `3a5fa40a` en compileert
mee, en `cargo build` linkt de binary. `ReportData` en `generate_pdf_bytes`
bestaan nog zoals `lib.rs` ze aanroept.

## 6. Het parametrische beeld in de afdruk — opgelost 25-08-2026

De designers lazen de invoer van het *actieve* exemplaar, waardoor de afdruk ze
niet per blad kon tekenen. Opgelost met `ExemplaarContext`: alle 22 designers
lezen nu via `useActiefExemplaar()`, dat normaal het actieve blad geeft en in de
afdruk het blad dat de context aanwijst.

Twee dingen om te onthouden als hier ooit aan gesleuteld wordt:

- **De afdrukweergave mag niet `display: none` zijn.** De designers meten hun
  tekengebied met een ResizeObserver; zonder opmaak meet die nul en blijft de
  tekening leeg. Hij staat daarom buiten beeld (`left: -20000px`) mét een echte
  breedte.
- **Geef het tekengebied een vaste hoogte, geen `auto`.** Met een
  inhoud-gestuurde hoogte meet de observer de tekening die hij zelf net groter
  maakte: de spuwer liep op tot een SVG van 33 miljoen pixels hoog, de voetplaat
  viel juist samen tot 0×0. Nu 150 mm, ruim genoeg voor de hoogste tekening.
