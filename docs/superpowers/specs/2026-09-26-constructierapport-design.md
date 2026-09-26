# Constructierapport — ontwerp

Datum: 26-09-2026
Status: goedgekeurd ontwerp, klaar voor het implementatieplan

## Doel

Van een project een compleet constructierapport maken in de vorm die in de
praktijk al met een rekenspreadsheet wordt opgesteld: voorblad met
documentgegevens, inhoud, inleiding, projectgegevens, toelichting op de
constructie, uitgangspunten, belastingen en de berekeningen. De rekenbladen van
het project vormen het hoofdstuk Berekeningen; hun volledige uitwerking komt in
bijlage A.

De opmaak volgt die referentie-spreadsheet (de tabbladen C1 tot en met C3).
Dat wordt aangetoond met een PDF die vel voor vel met een PDF-export van die
spreadsheet wordt vergeleken. De spreadsheet en alles wat eruit komt blijft
lokaal: er staan project-, klant- en persoonsgegevens in.

## Reikwijdte

In dit deelproject:

- rapportgegevens in het project: documentgegevens, revisies, teksten,
  uitgangspunten, belastingen, toelichting per rekenblad;
- een bureauprofiel in de instellingen, met huisstijl;
- standaardteksten: neutrale varianten in de app, eigen varianten in de
  instellingen;
- een rapportpaneel in de projectboom;
- de afdruk van het volledige rapport;
- verificatie tegen de referentie-PDF, en controles in de repo.

Niet in dit deelproject:

- de opbouwen uit hoofdstuk 5 automatisch laten doorwerken in de rekenbladen;
- tekeningen of externe documenten in het rapport opnemen (een bijlage zoals
  "Constructieoverzicht" staat alleen met titel in de inhoud);
- paginanummers in de inhoudsopgave (bij afdrukken via de browser niet
  betrouwbaar vooraf te bepalen).

## Hoofdstukindeling

Vast vastgelegd in één definitie (`src/rapport/opzet.ts`). Per onderdeel: id,
titel, soort (tekst, tabel, rekenbladen) en of het optioneel is. Een leeg
optioneel onderdeel valt weg; de nummering loopt automatisch door.

| nr | titel | inhoud |
|---|---|---|
| — | Voorblad | titel, projectnaam, project, opdrachtgever, documentgegevens, revisies |
| — | Inhoud | hoofdstukken, paragrafen, bijlagen |
| 1 | Inleiding | tekst, met een opsomming van aanvullende berekeningen door derden |
| 2 | Projectgegevens | 2.1 Projectomschrijving (tekst); 2.2 Rol binnen het project en bereik rapport (tekst plus rol, bouwkundig adviseur/architect, datum bouwkundige onderlegger) |
| 3 | Constructie | 3.1 Toelichting constructie: blokken Bestaande situatie (subkoppen verticale belastingafdracht, stabiliteit, fundatie, beoordeling bestaande constructie), Wijziging, Belendingen, elk optioneel; 3.2 Aandachtspunten bij uitvoering: blokken Bestaande situatie, Verbouw/renovatie, Nieuwbouw, elk optioneel |
| 4 | Uitgangspunten | 4.1 t/m 4.12, zie "Inhoud H4" |
| 5 | Belastingen | 5.1 t/m 5.5, zie "Inhoud H5" |
| 6 | Berekeningen | inhoudsopgave van de paragrafen; per rekenblad een paragraaf met samenvatting, eigen toelichting en verwijzing naar de bijlage |
| A | Uitgebreide uitwerking berekeningen | elk rekenblad zoals de huidige afdruk: kop, parametrisch beeld, uitwerking |
| B… | eigen bijlagen | alleen titel |

## Gegevensmodel

### In het projectbestand: `project.rapport`

Optioneel veld; een oud bestand zonder rapport krijgt bij openen de
standaardwaarden. Hoort bij de ongedaan-maken-geschiedenis zoals de rest van
het project.

- `titel` — bijvoorbeeld "Constructieadvies & berekeningen".
- `kenmerk` — documentkenmerk.
- `fase` — SO, VO, DO, TO of UO.
- `normen` — standaard "NEN-EN 1990 t/m 1997".
- `opdrachtgeverAdres` — adresregels onder de opdrachtgever uit de
  projectgegevens.
- `verantwoordelijk`, `uitvoerend` — namen uit het bureauprofiel.
- `revisies[]` — code, datum, omschrijving, status (concept, ter goedkeuring,
  definitief). De eerste revisie geeft "1ᵉ datum rapport"; de laatste bepaalt
  de rapportstatus. Een nieuw rapport begint met revisie A, eerste uitgave,
  concept.
- `teksten` — per tekstonderdeel (id uit de opzet) de tekst.
- `rol` — rol, bouwkundig adviseur/architect, datum onderlegger (2.2).
- `uitgangspunten` — de invoer van H4 (zie hieronder).
- `belastingen` — de invoer van H5 (zie hieronder).
- `toelichting` — per rekenblad (exemplaar-id) een eigen tekst voor H6.
- `bijlagen[]` — titels van eigen bijlagen (B, C, …).
- `bureau` — vastgelegde kopie van het bureauprofiel, gemaakt met
  **Bijwerken uit bureauprofiel**; tot dan gebruiken afdruk en paneel het live
  profiel uit de instellingen. Zo verandert een oud rapport niet als het
  profiel verandert.

Afgeleide normwaarden worden niet opgeslagen maar bij het opmaken berekend.
Wat al in de projectgegevens staat (CC, RC, ontwerplevensduur, windgebied,
terreincategorie, projectnummer, -naam, opdrachtgever, locatie) wordt daar
gelezen en niet gedupliceerd.

### In de instellingen

- `bureauProfiel` — naam, adres, postcode, plaats, telefoon, e-mail, logo,
  voetafbeelding, huisstijl (hoofdkleur, accentkleur, tabeltekstkleur,
  invoerkleur, lettertype) en de constructeurs (titel en naam, telefoon,
  e-mail). Afbeeldingen als data-URL, hooguit 500 kB per afbeelding.
- `rapportTeksten` — eigen varianten per tekstonderdeel.

De repo levert neutrale standaarden: geen bureau-, persoons- of productnamen.

## Bediening

- **Projectboom**: onder "Projectgegevens" een vaste knoop **Rapport**. Die
  opent twee tabs: **Rapport** (het paneel) en **Afdrukvoorbeeld** (het hele
  rapport).
- **Rapportpaneel**, één scrollend formulier:
  1. Document — titel, kenmerk, fase, normen, verantwoordelijk en uitvoerend
     constructeur, adresregels opdrachtgever.
  2. Revisies — tabel; "Revisie toevoegen" vult de volgende code (A→B, 1→2)
     en de datum van vandaag in.
  3. Hoofdstukken 1–3 — per tekstonderdeel kop, knop **Standaardtekst ▾**
     (meegeleverde en eigen varianten; eigen varianten ook te verwijderen),
     tekstvak dat meegroeit, knop **Bewaar als eigen variant**. Vervangen van
     bestaande tekst vraagt om bevestiging. Een lijst met invulvelden onder
     het blok.
  4. Uitgangspunten — de invoer van H4; afgeleide waarden grijs, met een link
     naar Projectgegevens waar ze vandaan komen.
  5. Belastingen — de invoer van H5, met tabellen die rijen en opbouwen laten
     toevoegen en verwijderen.
  6. Berekeningen — per rekenblad de automatische samenvatting en een
     toelichtingsveld.
  7. Bijlagen — eigen bijlagetitels.
  8. Bureau — de vastgelegde gegevens, **Bijwerken uit bureauprofiel**, en een
     melding als het profiel verschilt.
- **Instellingen**: tab **Bureau** met het bureauprofiel.
- **Lint**: "PDF project" wordt **Rapport (PDF)**; "PDF blad" blijft de losse
  berekening zoals nu.

Invulvelden in teksten: `{adviseur}`, `{projectnummer}`, `{projectnaam}`,
`{opdrachtgever}`, `{locatie}`, `{verantwoordelijk}`, `{uitvoerend}`. Een leeg
veld wordt "—". Opmaak in tekst: een regel die met "-" begint is een
opsommingsregel; een lege regel begint een nieuwe alinea.

## Inhoud H4

- **4.1 Constructieve uitgangspunten bouwwerk** — soort bouwwerk (lijst:
  woning, eengezinswoning, appartementencomplex, villa, kantoor, bedrijfshal,
  bijgebouw, schuur, of eigen tekst); CC en RC uit de projectgegevens;
  ontwerplevensduurklasse en ontwerplevensduur (NEN-EN 1990 tabel 2.1); β
  (tabel B2); K_FI (tabel B3); ontwerp- en berekeningssupervisie (tabel B4);
  inspectieniveau (tabel B5). Normverwijzingen rechts, cursief.
- **4.2 Bouwconstructies bij brand** — drie eisen in minuten ("-" = geen eis)
  en een verwijzingsveld.
- **4.3 Toegepaste materialen** — bewerkbare tabel materiaaltype, soort,
  opmerking; tabel bevestigingsmiddelen; slotregel "(tenzij anders
  aangegeven)".
- **4.4 Conservering staalconstructie** — drie bewerkbare regels en een
  slotzin.
- **4.5 Belastingfactoren en belastingcombinaties** — uit CC volgens de
  tabellen NB.3, NB.4 en NB.5 van NEN-EN 1990: EQU; STR 6.10a en 6.10b; GEO,
  FAT en HYD "niet van toepassing"; buitengewoon, karakteristiek, frequent,
  quasi-blijvend.
- **4.6 Bestaande situatie** (optioneel) — bouwjaar en bron; norm uit het
  bouwjaar (opzoektabel van historische voorschriften tot de Eurocodes);
  bestaande berekening beschikbaar; materiaalgegevens beschikbaar.
- **4.7 Trillingen**, **4.9 Montage en bouwfase**, **4.10 Toegepaste
  rekenprogrammatuur**, **4.11 Temperatuursinvloeden**, **4.12 Aardbevingen**
  — tekstonderdelen met standaardteksten. De meegeleverde variant van 4.10
  noemt alleen dit programma.
- **4.8 Vervormingen en horizontale verplaatsingen** — inleidende zin en een
  bewerkbare tabel onderdeel, u_bij, u_hor.

## Inhoud H5

- **5.1 Sneeuwbelasting** — plat dak s = μ₁·C_e·C_t·s_k = 0,8 × 1,0 × 1,0 ×
  0,7 = 0,56 kN/m² (s_k = 0,7 kN/m² in heel Nederland), plus tekst.
- **5.2 Windbelastingen** — windgebied en terreincategorie uit de
  projectgegevens; gebouwhoogte en c_s·c_d als invoer; z₀ en z_min uit de
  terreincategorie; v_b,0 uit het windgebied; q_p berekend zoals in de
  gordingmodule; een bewerkbare lijst coëfficiënten c met P_rep = c·q_p;
  ψ₀ = 0, ψ₁ = 0,2, ψ₂ = 0.
- **5.3 Regenwateraccumulatie** — tekstonderdeel, standaard "Niet van
  toepassing".
- **5.4 Overige veranderlijke belastingen** — één of meer belastingklassen;
  per categorie q_k, Q_k en ψ uit NEN-EN 1991-1-1 NB en NEN-EN 1990 NB; bij
  vloeren lichte scheidingswanden en de som; bij daken plat, schuin, q-last en
  dakhelling.
- **5.5 Blijvende belastingen** — opbouwen in de groepen "Vloer, daken" en
  "Wanden". Vlakopbouw: per laag d × ρ of een directe waarde, som in kN/m².
  Gevelopbouw: per laag p_rep × h × vulling, som in kN/m¹.

## Opmaak

Huisstijl uit het bureauprofiel, met neutrale standaardwaarden in de repo:

- lettertype (referentie: Segoe UI);
- hoofdstuktitels 24 pt vet in de hoofdkleur; rapporttitel 22 pt;
  ondertitel 14 pt in de accentkleur;
- paragraafkoppen 12 pt vet in de accentkleur; koppen in H6 12 pt normaal in
  de accentkleur met een lijn eronder;
- blokkoppen in H3 11 pt vet met een lijn over de volle breedte; subkoppen
  vet-cursief;
- labels vet in de accentkleur; tabeltekst in de tabeltekstkleur; invoer in de
  invoerkleur; normverwijzingen 8 pt cursief;
- tekst 10 pt; regelafstand 6,6 mm (41 regels per pagina); A4 staand met de
  marges van de referentie;
- tabellen: label/waarde-rijen met een lijn van 0,75 pt eronder; kopregels met
  vulling in hoofd- of accentkleur; sommatieregels met "+" en een lijn;
- voet op elke pagina: de voetafbeelding over de volle breedte en rechts het
  paginanummer; zonder afbeelding een dunne lijn met de bureaunaam.

Bewust anders dan de referentie, omdat de referentie daar niet klopt:

- 4.1 en 4.5: K_FI, β en de belastingfactoren volgens de norm (de referentie
  toont K_FI = 3,30 bij CC1, een lege β en γ_G;sup = 4,46);
- 4.1: inspectieniveau IL1 in plaats van DSL1;
- 4.1: levensduurklasse volgens NB-tabel NB.1–2.1: 50 jaar → klasse 3 (de
  referentie toont 4, volgens tabel 2.1 zonder NB);
- 5.2: q_p en P_rep berekend (in de referentie leeg);
- koppen "4 Uitgangspunten" en "5 Belastingen" zonder punt, gelijk aan de
  andere hoofdstukken; typfouten in labels gecorrigeerd;
- 5.4: Q_k voor een plat dak volgens de NB; wijkt de referentie daarvan af, dan
  staat dat in de verificatielijst;
- het rapport nummert zijn pagina's vanaf 1 (de referentie begint bij 3).

## Architectuur

- `src/rapport/` — logica zonder React: `opzet.ts` (indeling en nummering),
  `model.ts` (typen en standaardwaarden), `invullen.ts` (invulvelden en
  tekstopmaak), `revisies.ts`, `normwaarden.ts`, `opbouw.ts`,
  `standaardteksten.ts`. Alleen type-imports van buiten, zodat een Node-script
  ze direct kan laden.
- `store/projectStore.ts` en `store/projectBestand.ts` — het veld `rapport`
  met acties, persistentie en bestandsformaat.
- `store/bureauProfiel.ts` — profiel en eigen teksten via de instellingen.
- `components/rapport/` — het rapportpaneel en de afdrukweergave van het
  rapport (voorblad, inhoud, hoofdstukken, bijlage A), met eigen CSS die de
  huisstijl als CSS-variabelen krijgt.
- `components/settings/` — tab Bureau.
- Aanpassingen in de projectboom, de werkruimte (knoop Rapport met twee tabs),
  de printstore en het lint.

## Verificatie en tests

1. `scripts/check-rapport.mjs` (loopt mee in check-alles) toetst de logica:
   nummering, weglaten van lege delen, invulvelden, revisiecodes, normwaarden
   (K_FI, β, factoren per CC, sneeuw 0,56, q_p tegen de gordingmodule),
   opbouwsommen.
2. `scripts/rapport-pdf.mjs` maakt zonder printdialoog een PDF van het rapport
   van een projectbestand. Het gebruikt een geïnstalleerde Chrome of Edge
   headless tegen de dev-server en de ingebouwde WebSocket van Node, zonder
   nieuwe afhankelijkheden. Er is een fictief voorbeeldproject als rooktest.
3. Lokale vergelijking met de referentie-PDF, buiten de repo: een
   verificatieproject met de inhoud van de referentie, de huisstijl en de
   voetafbeelding in het profiel. Het vergelijkingsscript levert
   - een PDF met per vel referentie en app naast elkaar;
   - een tekstcontrole: koppen, labels en waarden in dezelfde volgorde op het
     overeenkomstige vel;
   - een stijlcontrole: lettertype, grootte (±0,5 pt) en kleur per kop en
     label;
   - een plaatscontrole: hoofdstukken beginnen op hetzelfde vel, koppen binnen
     ±2 mm.
   Afwijkingen die niet op de lijst hierboven staan, worden opgelost.
4. Controle van paneel en afdrukvoorbeeld in de browser, tsc, check-alles.

Klaar is het als alle 13 referentievellen een tegenhanger hebben die op tekst,
stijl en paginering overeenkomt, op de bewuste afwijkingen na, en alle
controles groen zijn.

## Aandachtspunten

- De wijziging in de projectstore laat een draaiende app herladen. De losse
  app zet het project daarna terug uit zijn eigen opslag; het Browser-paneel
  niet.
- De referentie-spreadsheet, de referentie-PDF, het verificatieproject en de
  vergelijkings-PDF blijven buiten de repo.
