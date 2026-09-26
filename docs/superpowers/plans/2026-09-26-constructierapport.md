# Constructierapport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Van een project een compleet constructierapport maken (voorblad, inhoud, H1–H6, bijlage A) in de opmaak van de referentie-spreadsheet, met bureauprofiel, rapportpaneel, afdrukvoorbeeld en een headless PDF-maker.

**Architecture:** Zuivere logica in `packages/desktop/src/rapport/` (getest met `scripts/check-rapport.mjs` onder Node 24), het rapport als optioneel onderdeel van het project in de projectstore en het projectbestand, een bureauprofiel in de instellingen, een rapportpaneel en een eigen afdrukweergave die zowel het afdrukvoorbeeld als `window.print()` bedient.

**Tech Stack:** TypeScript, React 19, zustand, Vite, Tauri 2; CalcPAD-kern uit `packages/core`; Node 24 voor controlescripts; Chrome/Edge headless via CDP voor de PDF.

**Spec:** `docs/superpowers/specs/2026-09-26-constructierapport-design.md`

## Global Constraints

- Communicatie, commentaar en commitberichten in het Nederlands; commitberichten eindigen met `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Nergens namen van externe rekensoftware of concurrerende producten; nergens bureau-, klant-, persoons- of projectgegevens uit de referentie-spreadsheet.
- Normteksten alleen als getallen en tabel-/artikelnummers.
- `packages/desktop/.gitignore` heeft een vreemde wijziging en wordt nooit gestaged.
- Code in `packages/desktop/src/rapport/` importeert geen waarden van buiten die map, behalve `../store/projectGegevens.ts`; waarde-imports binnen de map met extensie `.ts`; alleen wegneembare TypeScript-syntaxis.
- Wijzigingen in `store/projectStore.ts`, `store/projectBestand.ts`, `main.tsx`, i18n-JSON of `index.html` laden de draaiende app opnieuw; bundelen en vooraf melden. Nooit een bestand verplaatsen of verwijderen dat nog wordt geïmporteerd.

## Deel: Logica

Dit deel bouwt alles wat zonder React te toetsen is: typen en standaardwaarden,
padbewerking, revisies, invulvelden, normwaarden, opbouwsommen, standaardteksten
en de hoofdstukindeling. Elke module wordt eerst in `scripts/check-rapport.mjs`
getoetst en daarna geschreven. De latere delen (opslag, paneel, afdruk) lezen
alleen uit deze modules.

**Werkmap:** `C:/Users/rickd/Documents/GitHub/Ifc-Calc/.claude/worktrees/practical-mcclintock-34d234`.
Alle commando's draaien vanuit die map.

**Geldt voor elke taak in dit deel**

- Node 24 laadt de `.ts`-bestanden rechtstreeks en streept alleen de typen weg. Daarom:
  - alleen wegstreepbare TypeScript: geen `enum`, geen `namespace`, geen parameter properties, geen `<T>x`-casts;
  - typen altijd via `import type`;
  - waarde-imports binnen `rapport/` met de extensie `.ts`;
  - buiten de map alleen `../store/projectGegevens.ts` (dat bestand heeft zelf geen imports).
- De desktop-tsconfig heeft `lib: ES2020`, `strict`, `noUnusedLocals` en `noUnusedParameters`. Gebruik dus geen `replaceAll`, `.at()`, `Object.hasOwn` of `findLast`.
- Nog niets in de app importeert deze bestanden. De draaiende app (Vite op poort 3021) merkt deze taken dus niet.
- `scripts/check-alles.mjs` neemt elk `scripts/check-*.mjs` automatisch mee. `check-rapport.mjs` hoeft daar nergens aangemeld te worden.
- Stage alleen de genoemde bestanden. `packages/desktop/.gitignore` blijft ongestaged.
- Testgegevens zijn fictief: "Voorbeeld Constructies", "Ir. A. Voorbeeld", "Voorbeeldproject", "Voorbeeldstad".

**Keuzes die niet in het contract staan.** Ze staan ook in de Produces-blokken, zodat de latere delen ze kunnen gebruiken.

1. `model.ts` exporteert ook `normaliseerBureau(x: unknown): BureauProfiel`, voor `store/bureauProfiel.ts`. Lege huisstijlvelden krijgen daarin de standaard: een lege kleur of een leeg lettertype is nooit bedoeld.
2. `normaliseerRapport` legt de teksten uit het bestand over `teksten` (de standaardteksten) heen:
   - een tekst-id dat in het bestand ontbreekt, krijgt zijn standaardtekst;
   - een tekst die de gebruiker bewust leeg heeft gemaakt (`""`), blijft leeg.
3. `volgendeCode`:
   - houdt voorloopnullen vast: "09" → "10", "007" → "008";
   - hoogt kleine letters op als kleine letters: "z" → "aa";
   - hangt "1" aan een code die niet op een cijfer of letter eindigt: "A." → "A.1".
4. `normwaarden.ts`:
   - `fmt(NaN, …)` geeft `""`, zodat de afdruk een lege cel toont;
   - `rond` rondt halven van nul af (−11,025 → −11,03);
   - `levensduurklasse`: boven 100 jaar blijft het klasse 4; ongeldige invoer geeft NaN.
5. `normwaarden.ts` exporteert ook:
   - `kFiVoor`, doorgegeven uit `projectGegevens.ts`, zodat het rapport één bron heeft;
   - `BOUWJAAR_NORMEN`, de opzoektabel.
6. `normVoorBouwjaar`:
   - geen bouwjaar → `""`; vóór 1912 → `"-"`;
   - schrijft "TGB 1990" met spatie (de referentie heeft "TGB1990");
   - de rest van de tabel is gelijk aan de referentie-spreadsheet.
7. `belastingfactorTabel` volgt de rijen en cellen van de referentie-PDF:
   - de buitengewone en bruikbaarheidsrijen hebben 1,00 in beide G-kolommen;
   - bij Karakteristiek staat 1,00 in de kolom "overheersend".
   
   Daarbij drie verbeteringen:
   - de factoren komen uit de norm, niet vermenigvuldigd met K_FI;
   - "6.14b" in plaats van "6,14b";
   - "ψ0" in plaats van "ψo".
   
   Groepen C/D/F voor GEO/FAT/HYD, zoals in de referentie.
8. `CATEGORIEEN` bevat naast de ids uit het contract ook `B-verkeer`, `C-verkeer` (ψ0 = 0,6) en `D-verkeer`. Voor `H-dak` is Q_k = 1,5 kN; `DAK_QK_DIRECT` = 2,0 kN staat apart. Zonder helling geeft `dakQk` NaN.
9. `opbouw.ts` exporteert ook `leesVulling(s: string): number` ("90%", "90" en "0,9" → 0,9; leeg → 1) en `vullingTekst(v: number): string` (0,9 → "90%").
   - Een vlaklaag zonder p en zonder volledige d en ρ telt als 0.
   - Een gevellaag zonder p of h heeft `q` = 0.
10. `standaardteksten.ts` exporteert ook `STANDAARD_IN_NIEUW_RAPPORT`: de ids die in een nieuw rapport meteen hun eerste variant krijgen. Elk van de 20 tekst-ids heeft minstens één variant.
11. `opzet.ts`:
    - codeert "valt weg als …" van 4.6 (`bestaand-situatie`) en 5.5 (`blijvend`) als `optioneel: true`, met een eigen leegregel;
    - geeft een bladparagraaf in Berekeningen het exemplaar-id als `id`;
    - telt `blad.bijlage` ("A.1", "A.2", …) alleen over de bladen die in bijlage A staan; een blad met `inHoofdstuk` krijgt `""`;
    - laat eigen bijlagen zonder titel weg; de eigen bijlagen beginnen altijd bij B.
    
    Het bestand exporteert ook `heeftTekst(k: Knoop): boolean`, `TEKST_IDS: readonly string[]` en `BIJLAGE_A`.
12. Bewuste afwijking van de referentie: bij een ontwerplevensduur van 50 jaar geeft `levensduurklasse` klasse 3, volgens NB-tabel NB.1–2.1 zoals het contract voorschrijft. De referentie toont 4, volgens EN-tabel 2.1. Deze afwijking hoort op de lokale verificatielijst.

---

### Task 1: Gegevensmodel, padbewerking en het controlescript

**Files:**
- Create: `scripts/check-rapport.mjs`
- Create: `packages/desktop/src/rapport/model.ts`
- Create: `packages/desktop/src/rapport/pad.ts`

**Interfaces:**
- Consumes: niets. `model.ts` en `pad.ts` hebben geen imports.
- Produces:
  ```ts
  // rapport/model.ts: alle typen en waarden letterlijk zoals in het contract
  // (sectie "rapport/model.ts — volledig"). Dat zijn:
  //   Fase, FASEN, RevisieStatus, REVISIE_STATUSSEN, Revisie, Constructeur, Huisstijl,
  //   BureauProfiel, STANDAARD_HUISSTIJL, leegBureau(), Rol, Brandeisen, Materiaalregel,
  //   Bevestigingsregel, Conserveringsregel, Vervormingsregel, BestaandeSituatie,
  //   Uitgangspunten, Windcoefficient, Wind, Belastingklasse, Laag, Gevellaag, Opbouw,
  //   Belastingen, Rapport
  export function leegBureau(): BureauProfiel;
  export function standaardRapport(vandaag: string, teksten: Record<string, string>): Rapport;
  export function normaliseerRapport(x: unknown, vandaag: string, teksten: Record<string, string>): Rapport;
  export function normaliseerBureau(x: unknown): BureauProfiel;          // extra, voor store/bureauProfiel.ts

  // rapport/pad.ts
  export type Pad = (string | number)[];
  export function leesPad(pad: string): Pad;
  export function zetOpPad<T>(obj: T, pad: Pad, waarde: unknown): T;
  ```

- [ ] **Step 1: Schrijf de falende test: maak `scripts/check-rapport.mjs`**

  Het script toetst:
  - de standaardwaarden uit het contract;
  - normaliseren: onbekende velden vallen weg, lege invoer en verkeerde typen worden standaard, lijsten worden per element gefilterd;
  - `zetOpPad`: de waarde staat op zijn plek, het origineel blijft onaangetast en takken die niet veranderen blijven gedeeld.

  Latere taken breiden het script uit op drie vaste ankers: de modulelijst in de kop, de laatste import en de regel `// ── Uitslag`.

```js
/**
 * Controlescript voor de logica van het constructierapport
 * (packages/desktop/src/rapport/): alles wat zonder React te toetsen is.
 *
 *   model.ts        standaardrapport; normaliseren van een rapport uit een bestand
 *                   (onbekende velden weg, verkeerde typen en lege invoer →
 *                   standaard, lijsten per element gecontroleerd)
 *   pad.ts          onveranderlijk zetten op een pad
 *
 * Node 24 laadt de .ts-bestanden rechtstreeks (typen worden weggestreept), dus
 * er is geen build nodig. Daarom importeert src/rapport/ waarden alleen binnen
 * de map (met extensie .ts) en uit ../store/projectGegevens.ts.
 *
 * Draaien:  node scripts/check-rapport.mjs
 */
import { leegBureau, normaliseerRapport, standaardRapport, STANDAARD_HUISSTIJL } from "../packages/desktop/src/rapport/model.ts";
import { leesPad, zetOpPad } from "../packages/desktop/src/rapport/pad.ts";

let fouten = 0;
let aantal = 0;

function toets(naam, ok, toelichting = "") {
  aantal++;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${naam}` + (ok || toelichting === "" ? "" : `   ${toelichting}`));
}

/** Diepe vergelijking; volgorde van sleutels telt niet, NaN is gelijk aan NaN. */
function zelfde(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && zelfde(a[k], b[k]));
}

function gelijk(naam, kreeg, verwacht) {
  toets(naam, zelfde(kreeg, verwacht), `kreeg ${JSON.stringify(kreeg)}, verwacht ${JSON.stringify(verwacht)}`);
}

function bijna(naam, kreeg, verwacht, tol) {
  toets(naam, Math.abs(kreeg - verwacht) <= tol, `kreeg ${kreeg}, verwacht ${verwacht} ± ${tol}`);
}

function kop(titel) {
  console.log(`\n${titel}`);
}

const VANDAAG = "26-09-2026";

// ── model.ts ────────────────────────────────────────────────────────────────
kop("model.ts — standaardrapport");
{
  const teksten = { inleiding: "Inleidende tekst.", rol: "{adviseur} heeft opdracht." };
  const r = standaardRapport(VANDAAG, teksten);
  gelijk("titel", r.titel, "Constructieadvies & berekeningen");
  gelijk("normen", r.normen, "NEN-EN 1990 t/m 1997");
  gelijk("fase leeg", r.fase, "");
  gelijk("eerste revisie", r.revisies, [{ code: "A", datum: VANDAAG, omschrijving: "Eerste uitgave", status: "concept" }]);
  gelijk("teksten overgenomen", r.teksten, teksten);
  toets("teksten gekopieerd, niet gedeeld", r.teksten !== teksten);
  gelijk("rol", r.rol, { rol: "Hoofdconstructeur", architect: "n.v.t.", datumOnderlegger: "n.v.t." });
  gelijk("soort bouwwerk", r.uitgangspunten.soortBouwwerk, "Woning");
  gelijk("brandeisen", r.uitgangspunten.brand,
    { hoofddraagconstructie: "-", brandscheiding: "-", vluchtroute: "-", verwijzing: "" });
  gelijk("materialen: typen", r.uitgangspunten.materialen.map((m) => m.type),
    ["TPG Beton", "Hout", "Plaatmateriaal", "Wapeningsstaal", "Staal", "Ondervoeging staal"]);
  gelijk("materialen: staal", r.uitgangspunten.materialen[4], { type: "Staal", soort: "S235", opmerking: "JR" });
  gelijk("bevestiging", r.uitgangspunten.bevestiging.map((b) => `${b.type} ${b.kwaliteit}`),
    ["Bouten 8.8", "Houtdraaibout 4.6", "Chemische Ankers 5.8"]);
  gelijk("conservering: systemen", r.uitgangspunten.conservering.map((c) => c.systeem),
    ["Duplex of thermisch verzinkt", "Thermisch verzinkt", "Verf systeem"]);
  gelijk("bestaande situatie standaard uit", r.uitgangspunten.bestaand.opnemen, false);
  gelijk("vervormingen: vloeren", r.uitgangspunten.vervormingen[1],
    { onderdeel: "Verticale doorbuiging van vloeren", ueind: "0,004l_rep", ubij: "0,003l_rep", uhor: "" });
  gelijk("vervormingen: afscheiding", r.uitgangspunten.vervormingen[4].uhor, "< 20 mm");
  gelijk("windcoëfficiënten", r.belastingen.wind.coefficienten.map((c) => c.c), ["0,04", "0,40", "0,80", "1,10"]);
  gelijk("c_s·c_d", r.belastingen.wind.cscd, "1");
  gelijk("belastingklassen", r.belastingen.klassen, [
    { categorie: "A-vloer", lichteScheidingswanden: "0,80", dakhelling: "", qlast: "" },
    { categorie: "H-dak", lichteScheidingswanden: "", dakhelling: "0", qlast: "2,0" },
  ]);
  gelijk("geen opbouwen", [r.belastingen.vloerenDaken.length, r.belastingen.wanden.length], [0, 0]);
  gelijk("bureau leeg", r.bureau, leegBureau());
  gelijk("huisstijl standaard", r.bureau.huisstijl, STANDAARD_HUISSTIJL);

  const a = standaardRapport(VANDAAG, {});
  const b = standaardRapport(VANDAAG, {});
  a.uitgangspunten.materialen.push({ type: "x", soort: "", opmerking: "" });
  a.bureau.huisstijl.hoofdkleur = "#000000";
  toets("elk rapport eigen lijsten", b.uitgangspunten.materialen.length === 6);
  toets("elk rapport eigen huisstijl", b.bureau.huisstijl.hoofdkleur === STANDAARD_HUISSTIJL.hoofdkleur
    && STANDAARD_HUISSTIJL.hoofdkleur !== "#000000");
}

kop("model.ts — normaliseerRapport");
{
  const teksten = { inleiding: "Standaard inleiding.", sneeuw: "Standaard sneeuw." };
  const standaard = standaardRapport(VANDAAG, teksten);
  for (const [naam, x] of [["undefined", undefined], ["null", null], ["tekst", "rapport"], ["lijst", []], ["leeg object", {}]]) {
    gelijk(`lege invoer (${naam}) → standaard`, normaliseerRapport(x, VANDAAG, teksten), standaard);
  }
  gelijk("standaard blijft zichzelf (heen en terug via JSON)",
    normaliseerRapport(JSON.parse(JSON.stringify(standaard)), VANDAAG, teksten), standaard);

  const r = normaliseerRapport({
    titel: "Eigen titel",
    geheim: "weg",
    fase: "XX",
    kenmerk: 12,
    revisies: [null, 3, "B", { code: "B", datum: "01-02-2026", omschrijving: "Tweede", status: "raar", extra: 1 }],
    teksten: { inleiding: "", wijziging: "Eigen wijziging.", fout: 3 },
    uitgangspunten: { extra: true, soortBouwwerk: "Kantoor", bestaand: { opnemen: "ja", bouwjaar: "1955" } },
    belastingen: {
      wind: { gebouwhoogte: "9" },
      vloerenDaken: [
        { soort: "vlak", naam: "Dak", lagen: [{ naam: "dakpannen", p: "0,48", x: 1 }, "laag"] },
        { soort: "onbekend", naam: "Weg" },
      ],
      wanden: "geen lijst",
    },
    toelichting: { "ex-1": "Eigen toelichting.", "ex-2": 5 },
    inHoofdstuk: { "ex-1": true, "ex-2": "ja" },
    bijlagen: ["Constructieoverzicht", 4],
    bureau: { naam: "Voorbeeld Constructies", huisstijl: { hoofdkleur: "" }, constructeurs: [{ naam: "Ir. A. Voorbeeld" }, 7] },
  }, VANDAAG, teksten);
  gelijk("titel bewaard", r.titel, "Eigen titel");
  toets("onbekend veld weg", !("geheim" in r));
  toets("onbekend genest veld weg", !("extra" in r.uitgangspunten));
  gelijk("ongeldige fase → leeg", r.fase, "");
  gelijk("verkeerd type → standaard", r.kenmerk, "");
  gelijk("revisies gefilterd, status gecontroleerd", r.revisies,
    [{ code: "B", datum: "01-02-2026", omschrijving: "Tweede", status: "concept" }]);
  gelijk("teksten: leeggemaakte tekst blijft leeg", r.teksten.inleiding, "");
  gelijk("teksten: ontbrekend id krijgt standaard", r.teksten.sneeuw, "Standaard sneeuw.");
  gelijk("teksten: eigen tekst bewaard", r.teksten.wijziging, "Eigen wijziging.");
  toets("teksten: geen tekst → weg", !("fout" in r.teksten));
  gelijk("soort bouwwerk bewaard", r.uitgangspunten.soortBouwwerk, "Kantoor");
  gelijk("bestaand: verkeerd type → standaard", r.uitgangspunten.bestaand.opnemen, false);
  gelijk("bestaand: bouwjaar bewaard, rest standaard", r.uitgangspunten.bestaand,
    { opnemen: false, bouwjaar: "1955", bron: "", berekeningBeschikbaar: "Ja", materiaalgegevensBeschikbaar: "Ja" });
  gelijk("ontbrekende lijst → standaard", r.uitgangspunten.materialen.length, 6);
  gelijk("wind: hoogte bewaard, c_s·c_d standaard", [r.belastingen.wind.gebouwhoogte, r.belastingen.wind.cscd], ["9", "1"]);
  gelijk("opbouwen gefilterd", r.belastingen.vloerenDaken,
    [{ soort: "vlak", naam: "Dak", lagen: [{ naam: "dakpannen", d: "", rho: "", p: "0,48" }] }]);
  gelijk("geen lijst → standaard (leeg)", r.belastingen.wanden, []);
  gelijk("toelichting: alleen tekst", r.toelichting, { "ex-1": "Eigen toelichting." });
  gelijk("inHoofdstuk: alleen ja/nee", r.inHoofdstuk, { "ex-1": true });
  gelijk("bijlagen: alleen tekst", r.bijlagen, ["Constructieoverzicht"]);
  gelijk("bureau: naam", r.bureau.naam, "Voorbeeld Constructies");
  gelijk("bureau: lege kleur → standaard", r.bureau.huisstijl.hoofdkleur, STANDAARD_HUISSTIJL.hoofdkleur);
  gelijk("bureau: constructeurs gefilterd", r.bureau.constructeurs, [{ naam: "Ir. A. Voorbeeld", telefoon: "", email: "" }]);
  gelijk("lege lijst blijft leeg", normaliseerRapport({ revisies: [] }, VANDAAG, teksten).revisies, []);
}

// ── pad.ts ──────────────────────────────────────────────────────────────────
kop("pad.ts");
{
  gelijk("leesPad", leesPad("belastingen.wind.gebouwhoogte"), ["belastingen", "wind", "gebouwhoogte"]);
  gelijk("leesPad: cijfers worden indexen", leesPad("revisies.0.code"), ["revisies", 0, "code"]);
  gelijk("leesPad: exemplaar-id blijft tekst", leesPad("inHoofdstuk.ex-1"), ["inHoofdstuk", "ex-1"]);

  const r0 = standaardRapport(VANDAAG, {});
  const r1 = zetOpPad(r0, leesPad("belastingen.wind.gebouwhoogte"), "9");
  gelijk("zetOpPad: waarde gezet", r1.belastingen.wind.gebouwhoogte, "9");
  gelijk("zetOpPad: origineel onaangetast", r0.belastingen.wind.gebouwhoogte, "");
  toets("zetOpPad: pad gekopieerd", r1 !== r0 && r1.belastingen !== r0.belastingen && r1.belastingen.wind !== r0.belastingen.wind);
  toets("zetOpPad: andere takken gedeeld", r1.uitgangspunten === r0.uitgangspunten
    && r1.belastingen.klassen === r0.belastingen.klassen);

  const r2 = zetOpPad(r0, leesPad("revisies.0.status"), "definitief");
  gelijk("zetOpPad in lijst", r2.revisies[0].status, "definitief");
  toets("zetOpPad: lijst blijft lijst", Array.isArray(r2.revisies) && r2.revisies !== r0.revisies);
  gelijk("zetOpPad: origineel in lijst onaangetast", r0.revisies[0].status, "concept");

  const r3 = zetOpPad(r0, leesPad("inHoofdstuk.ex-1"), true);
  gelijk("zetOpPad: nieuwe sleutel", r3.inHoofdstuk, { "ex-1": true });
  const r4 = zetOpPad({}, ["a", 1, "b"], "x");
  toets("zetOpPad: ontbrekende tussenlagen aangemaakt", Array.isArray(r4.a) && r4.a[1].b === "x");
}

// ── Uitslag ─────────────────────────────────────────────────────────────────
if (fouten > 0) {
  console.error(`\nRapport: ${fouten} van de ${aantal} controles gezakt.`);
  process.exit(1);
}
console.log(`\nRapport: alle ${aantal} controles kloppen.`);
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `node scripts/check-rapport.mjs`
Expected: exit code 1, met
`Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…\packages\desktop\src\rapport\model.ts' imported from …\scripts\check-rapport.mjs`

- [ ] **Step 3: Schrijf `packages/desktop/src/rapport/model.ts`**

  - De typen staan letterlijk zoals in het contract.
  - Standaardwaarden worden bij elke aanroep vers gebouwd, zodat twee rapporten nooit een lijst delen.
  - Het normaliseren controleert elk veld afzonderlijk.

```ts
/**
 * Het constructierapport van een project: documentgegevens, teksten,
 * uitgangspunten en belastingen.
 *
 * Alleen gegevens en standaardwaarden: geen React en geen imports met waarden,
 * zodat scripts/check-rapport.mjs dit bestand rechtstreeks kan laden. Invoer
 * staat als tekst opgeslagen, net als de projectgegevens: wat de gebruiker
 * typte ("0,56") blijft staan, rekenen gebeurt pas bij het opmaken.
 */

export type Fase = "" | "SO" | "VO" | "DO" | "TO" | "UO";
export const FASEN: readonly Fase[] = ["SO", "VO", "DO", "TO", "UO"];

export type RevisieStatus = "concept" | "ter goedkeuring" | "definitief";
export const REVISIE_STATUSSEN: readonly RevisieStatus[] = ["concept", "ter goedkeuring", "definitief"];

export interface Revisie {
  code: string;
  /** dd-mm-jjjj */
  datum: string;
  omschrijving: string;
  status: RevisieStatus;
}

export interface Constructeur {
  /** Met titel, zoals hij op het voorblad staat: "Ing. A. de Vries". */
  naam: string;
  telefoon: string;
  email: string;
}

export interface Huisstijl {
  /** Hoofdstuktitels en de rapporttitel. */
  hoofdkleur: string;
  /** Paragraafkoppen, labels op het voorblad, ondertitel, kopregels van tabellen. */
  accentkleur: string;
  /** Tekst in tabellen. */
  tabeltekst: string;
  /** Ingevulde waarden in tabellen. */
  invoerkleur: string;
  /** CSS font-family. */
  lettertype: string;
}

export interface BureauProfiel {
  naam: string;
  adres: string;
  postcode: string;
  plaats: string;
  telefoon: string;
  email: string;
  /** data-URL of "". */
  logo: string;
  /** data-URL of "": over de volle paginabreedte onderaan elke pagina. */
  voetafbeelding: string;
  huisstijl: Huisstijl;
  constructeurs: Constructeur[];
}

export const STANDAARD_HUISSTIJL: Huisstijl = {
  hoofdkleur: "#1f3a5f",
  accentkleur: "#2f7d6d",
  tabeltekst: "#1f2937",
  invoerkleur: "#1d4ed8",
  lettertype: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
};

export function leegBureau(): BureauProfiel {
  return {
    naam: "", adres: "", postcode: "", plaats: "", telefoon: "", email: "",
    logo: "", voetafbeelding: "",
    huisstijl: { ...STANDAARD_HUISSTIJL },
    constructeurs: [],
  };
}

/** 2.2 Rol binnen het project en bereik rapport. */
export interface Rol {
  rol: string;
  architect: string;
  datumOnderlegger: string;
}

export interface Brandeisen {
  /** Minuten, of "-" voor geen eis. */
  hoofddraagconstructie: string;
  brandscheiding: string;
  vluchtroute: string;
  /** Verwijzing naar de regelgeving, rechts van de tabel. */
  verwijzing: string;
}

export interface Materiaalregel { type: string; soort: string; opmerking: string; }
export interface Bevestigingsregel { type: string; kwaliteit: string; }
export interface Conserveringsregel { onderdeel: string; systeem: string; }
/** 4.8: één eis per kolom; leeg = geen eis in die kolom. */
export interface Vervormingsregel { onderdeel: string; ueind: string; ubij: string; uhor: string; }

export interface BestaandeSituatie {
  /** false = paragraaf 4.6 valt weg (nieuwbouw). */
  opnemen: boolean;
  bouwjaar: string;
  bron: string;
  /** "Ja" of "Nee". */
  berekeningBeschikbaar: string;
  materiaalgegevensBeschikbaar: string;
}

export interface Uitgangspunten {
  soortBouwwerk: string;
  brand: Brandeisen;
  materialen: Materiaalregel[];
  materialenNoot: string;
  bevestiging: Bevestigingsregel[];
  conservering: Conserveringsregel[];
  conserveringSlot: string;
  bestaand: BestaandeSituatie;
  vervormingen: Vervormingsregel[];
}

export interface Windcoefficient { omschrijving: string; c: string; }
export interface Wind {
  /** m */
  gebouwhoogte: string;
  cscd: string;
  coefficienten: Windcoefficient[];
}

/** 5.4: één belastingklasse; `categorie` is een id uit CATEGORIEEN (normwaarden.ts). */
export interface Belastingklasse {
  categorie: string;
  /** kN/m², alleen bij vloeren; "" = geen. */
  lichteScheidingswanden: string;
  /** graden, alleen bij daken. */
  dakhelling: string;
  /** kN/m¹, alleen bij daken. */
  qlast: string;
}

/** Een laag in een vlakopbouw: p = d × ρ, of de ingevulde p als die er staat. */
export interface Laag { naam: string; d: string; rho: string; p: string; }
/** Een laag in een gevelopbouw: q = p × h × vulling. */
export interface Gevellaag { naam: string; p: string; h: string; vulling: string; }

export type Opbouw =
  | { soort: "vlak"; naam: string; lagen: Laag[] }
  | { soort: "gevel"; naam: string; lagen: Gevellaag[] };

export interface Belastingen {
  wind: Wind;
  klassen: Belastingklasse[];
  vloerenDaken: Opbouw[];
  wanden: Opbouw[];
}

export interface Rapport {
  titel: string;
  kenmerk: string;
  fase: Fase;
  normen: string;
  /** Adresregels onder de opdrachtgever, gescheiden door "\n". */
  opdrachtgeverAdres: string;
  verantwoordelijk: string;
  uitvoerend: string;
  revisies: Revisie[];
  /** Per tekst-id (zie opzet.ts) de tekst. */
  teksten: Record<string, string>;
  rol: Rol;
  uitgangspunten: Uitgangspunten;
  belastingen: Belastingen;
  /** Per exemplaar-id een eigen toelichting voor hoofdstuk Berekeningen. */
  toelichting: Record<string, string>;
  /** Per exemplaar-id: uitwerking in het hoofdstuk zelf in plaats van in bijlage A. */
  inHoofdstuk: Record<string, boolean>;
  /** Titels van eigen bijlagen (B, C, …); bijlage A is altijd de uitwerking. */
  bijlagen: string[];
  /** Per knoop-id uit opzet.ts: begint op een nieuwe pagina (overschrijft de standaard). */
  nieuwePagina: Record<string, boolean>;
  /** Vastgelegde kopie van het bureauprofiel. */
  bureau: BureauProfiel;
}

// ── Standaardwaarden ────────────────────────────────────────────────────────
// Elke aanroep bouwt verse objecten en lijsten: een rapport dat de store
// bijwerkt mag nooit een lijst delen met het volgende nieuwe rapport.

function standaardRol(): Rol {
  return { rol: "Hoofdconstructeur", architect: "n.v.t.", datumOnderlegger: "n.v.t." };
}

function standaardUitgangspunten(): Uitgangspunten {
  return {
    soortBouwwerk: "Woning",
    brand: { hoofddraagconstructie: "-", brandscheiding: "-", vluchtroute: "-", verwijzing: "" },
    materialen: [
      { type: "TPG Beton", soort: "C20/25", opmerking: "(voor milieuklassen zie berekening betononderdelen en tekening)" },
      { type: "Hout", soort: "C24", opmerking: "" },
      { type: "Plaatmateriaal", soort: "CE2+", opmerking: "" },
      { type: "Wapeningsstaal", soort: "B500", opmerking: "" },
      { type: "Staal", soort: "S235", opmerking: "JR" },
      { type: "Ondervoeging staal", soort: "K50", opmerking: "" },
    ],
    materialenNoot: "(tenzij anders aangegeven)",
    bevestiging: [
      { type: "Bouten", kwaliteit: "8.8" },
      { type: "Houtdraaibout", kwaliteit: "4.6" },
      { type: "Chemische Ankers", kwaliteit: "5.8" },
    ],
    conservering: [
      { onderdeel: "Buitenconstructies", systeem: "Duplex of thermisch verzinkt" },
      { onderdeel: "Constructies in spouw", systeem: "Thermisch verzinkt" },
      { onderdeel: "Staal binnen", systeem: "Verf systeem" },
    ],
    conserveringSlot: "Conservering wordt toegepast op nieuw te plaatsen constructieonderdelen.",
    bestaand: {
      opnemen: false, bouwjaar: "", bron: "",
      berekeningBeschikbaar: "Ja", materiaalgegevensBeschikbaar: "Ja",
    },
    // `_rep` blijft tekst: de afdruk zet het als subscript.
    vervormingen: [
      { onderdeel: "Verticale doorbuiging van daken", ueind: "0,004l_rep", ubij: "0,004l_rep", uhor: "" },
      { onderdeel: "Verticale doorbuiging van vloeren", ueind: "0,004l_rep", ubij: "0,003l_rep", uhor: "" },
      { onderdeel: "Vloer met steenachtige wanden", ueind: "", ubij: "0,002l_rep", uhor: "" },
      { onderdeel: "Horizontale verplaatsing bouwwerk", ueind: "", ubij: "", uhor: "H/300" },
      { onderdeel: "Horizontale verplaatsing afscheiding", ueind: "", ubij: "", uhor: "< 20 mm" },
    ],
  };
}

function standaardBelastingen(): Belastingen {
  return {
    wind: {
      gebouwhoogte: "",
      cscd: "1",
      coefficienten: [
        { omschrijving: "", c: "0,04" },
        { omschrijving: "", c: "0,40" },
        { omschrijving: "", c: "0,80" },
        { omschrijving: "", c: "1,10" },
      ],
    },
    klassen: [
      { categorie: "A-vloer", lichteScheidingswanden: "0,80", dakhelling: "", qlast: "" },
      { categorie: "H-dak", lichteScheidingswanden: "", dakhelling: "0", qlast: "2,0" },
    ],
    vloerenDaken: [],
    wanden: [],
  };
}

/** Een nieuw rapport. `vandaag` in dd-mm-jjjj; `teksten` komen uit de standaardteksten. */
export function standaardRapport(vandaag: string, teksten: Record<string, string>): Rapport {
  return {
    titel: "Constructieadvies & berekeningen",
    kenmerk: "",
    fase: "",
    normen: "NEN-EN 1990 t/m 1997",
    opdrachtgeverAdres: "",
    verantwoordelijk: "",
    uitvoerend: "",
    revisies: [{ code: "A", datum: vandaag, omschrijving: "Eerste uitgave", status: "concept" }],
    teksten: { ...teksten },
    rol: standaardRol(),
    uitgangspunten: standaardUitgangspunten(),
    belastingen: standaardBelastingen(),
    toelichting: {},
    inHoofdstuk: {},
    bijlagen: [],
    nieuwePagina: {},
    bureau: leegBureau(),
  };
}

// ── Normaliseren ────────────────────────────────────────────────────────────
// Een rapport komt uit een projectbestand of uit de opslag, en dus mogelijk
// van een oudere of nieuwere versie, of met de hand bewerkt. Alles wordt per
// veld gecontroleerd: wat ontbreekt of een verkeerd type heeft wordt de
// standaard, onbekende velden vallen weg, en lijsten houden alleen de
// elementen die een object zijn. Een lege tekst ("") is wél geldig: die heeft
// de gebruiker zelf leeggemaakt.

type Los = Record<string, unknown>;

/** Een gewoon object (geen lijst, geen null), anders undefined. */
function object(x: unknown): Los | undefined {
  return x !== null && typeof x === "object" && !Array.isArray(x) ? (x as Los) : undefined;
}

function tekst(x: unknown, standaard: string): string {
  return typeof x === "string" ? x : standaard;
}

/**
 * Een lijst uit het bestand. Geen lijst → de standaard; wel een lijst → alleen
 * de elementen die een object zijn, elk genormaliseerd. `normaliseer` mag een
 * element afwijzen met null (bijvoorbeeld een opbouw van een onbekende soort).
 */
function lijst<T>(x: unknown, standaard: T[], normaliseer: (o: Los) => T | null): T[] {
  if (!Array.isArray(x)) return standaard;
  const uit: T[] = [];
  for (const el of x) {
    const o = object(el);
    if (!o) continue;
    const n = normaliseer(o);
    if (n !== null) uit.push(n);
  }
  return uit;
}

/** Tekstwaarden per sleutel, over `basis` heen; andere typen vallen weg. */
function tekstRecord(x: unknown, basis: Record<string, string> = {}): Record<string, string> {
  const uit: Record<string, string> = { ...basis };
  const o = object(x);
  if (o) for (const [k, v] of Object.entries(o)) if (typeof v === "string") uit[k] = v;
  return uit;
}

/** Ja/nee-waarden per sleutel; andere typen vallen weg. */
function waarheidRecord(x: unknown): Record<string, boolean> {
  const uit: Record<string, boolean> = {};
  const o = object(x);
  if (o) for (const [k, v] of Object.entries(o)) if (typeof v === "boolean") uit[k] = v;
  return uit;
}

function normaliseerOpbouw(o: Los): Opbouw | null {
  const naam = tekst(o.naam, "");
  if (o.soort === "vlak") {
    return {
      soort: "vlak", naam,
      lagen: lijst(o.lagen, [], (l): Laag => ({
        naam: tekst(l.naam, ""), d: tekst(l.d, ""), rho: tekst(l.rho, ""), p: tekst(l.p, ""),
      })),
    };
  }
  if (o.soort === "gevel") {
    return {
      soort: "gevel", naam,
      lagen: lijst(o.lagen, [], (l): Gevellaag => ({
        naam: tekst(l.naam, ""), p: tekst(l.p, ""), h: tekst(l.h, ""), vulling: tekst(l.vulling, ""),
      })),
    };
  }
  return null;
}

/**
 * Een bureauprofiel uit een bestand of de instellingen. Huisstijlvelden die
 * leeg zijn krijgen de standaard: een lege kleur of een leeg lettertype is
 * nooit bedoeld en zou de afdruk kleurloos maken.
 */
export function normaliseerBureau(x: unknown): BureauProfiel {
  const s = leegBureau();
  const o = object(x);
  if (!o) return s;
  const h = object(o.huisstijl) ?? {};
  const stijl = (v: unknown, standaard: string) => tekst(v, standaard) || standaard;
  return {
    naam: tekst(o.naam, ""),
    adres: tekst(o.adres, ""),
    postcode: tekst(o.postcode, ""),
    plaats: tekst(o.plaats, ""),
    telefoon: tekst(o.telefoon, ""),
    email: tekst(o.email, ""),
    logo: tekst(o.logo, ""),
    voetafbeelding: tekst(o.voetafbeelding, ""),
    huisstijl: {
      hoofdkleur: stijl(h.hoofdkleur, s.huisstijl.hoofdkleur),
      accentkleur: stijl(h.accentkleur, s.huisstijl.accentkleur),
      tabeltekst: stijl(h.tabeltekst, s.huisstijl.tabeltekst),
      invoerkleur: stijl(h.invoerkleur, s.huisstijl.invoerkleur),
      lettertype: stijl(h.lettertype, s.huisstijl.lettertype),
    },
    constructeurs: lijst(o.constructeurs, [], (c): Constructeur => ({
      naam: tekst(c.naam, ""), telefoon: tekst(c.telefoon, ""), email: tekst(c.email, ""),
    })),
  };
}

/**
 * Een rapport uit een bestand of de opslag, aangevuld met standaardwaarden. Onbekende
 * velden vallen weg; verkeerde typen worden standaard. Geneste objecten en lijsten
 * worden per veld gecontroleerd.
 */
export function normaliseerRapport(x: unknown, vandaag: string, teksten: Record<string, string>): Rapport {
  const s = standaardRapport(vandaag, teksten);
  const o = object(x);
  if (!o) return s;

  const rol = object(o.rol) ?? {};
  const u = object(o.uitgangspunten) ?? {};
  const su = s.uitgangspunten;
  const brand = object(u.brand) ?? {};
  const bestaand = object(u.bestaand) ?? {};
  const b = object(o.belastingen) ?? {};
  const sb = s.belastingen;
  const wind = object(b.wind) ?? {};

  return {
    titel: tekst(o.titel, s.titel),
    kenmerk: tekst(o.kenmerk, s.kenmerk),
    fase: FASEN.includes(o.fase as Fase) ? (o.fase as Fase) : "",
    normen: tekst(o.normen, s.normen),
    opdrachtgeverAdres: tekst(o.opdrachtgeverAdres, s.opdrachtgeverAdres),
    verantwoordelijk: tekst(o.verantwoordelijk, s.verantwoordelijk),
    uitvoerend: tekst(o.uitvoerend, s.uitvoerend),
    revisies: lijst(o.revisies, s.revisies, (r): Revisie => ({
      code: tekst(r.code, ""),
      datum: tekst(r.datum, ""),
      omschrijving: tekst(r.omschrijving, ""),
      status: REVISIE_STATUSSEN.includes(r.status as RevisieStatus) ? (r.status as RevisieStatus) : "concept",
    })),
    // Over de standaardteksten heen: een tekst-id die in het bestand ontbreekt
    // (ouder bestand, of een onderdeel dat later is bijgekomen) krijgt zo zijn
    // standaardtekst, terwijl een bewust leeggemaakte tekst ("") leeg blijft.
    teksten: tekstRecord(o.teksten, s.teksten),
    rol: {
      rol: tekst(rol.rol, s.rol.rol),
      architect: tekst(rol.architect, s.rol.architect),
      datumOnderlegger: tekst(rol.datumOnderlegger, s.rol.datumOnderlegger),
    },
    uitgangspunten: {
      soortBouwwerk: tekst(u.soortBouwwerk, su.soortBouwwerk),
      brand: {
        hoofddraagconstructie: tekst(brand.hoofddraagconstructie, su.brand.hoofddraagconstructie),
        brandscheiding: tekst(brand.brandscheiding, su.brand.brandscheiding),
        vluchtroute: tekst(brand.vluchtroute, su.brand.vluchtroute),
        verwijzing: tekst(brand.verwijzing, su.brand.verwijzing),
      },
      materialen: lijst(u.materialen, su.materialen, (m): Materiaalregel => ({
        type: tekst(m.type, ""), soort: tekst(m.soort, ""), opmerking: tekst(m.opmerking, ""),
      })),
      materialenNoot: tekst(u.materialenNoot, su.materialenNoot),
      bevestiging: lijst(u.bevestiging, su.bevestiging, (m): Bevestigingsregel => ({
        type: tekst(m.type, ""), kwaliteit: tekst(m.kwaliteit, ""),
      })),
      conservering: lijst(u.conservering, su.conservering, (m): Conserveringsregel => ({
        onderdeel: tekst(m.onderdeel, ""), systeem: tekst(m.systeem, ""),
      })),
      conserveringSlot: tekst(u.conserveringSlot, su.conserveringSlot),
      bestaand: {
        opnemen: typeof bestaand.opnemen === "boolean" ? bestaand.opnemen : su.bestaand.opnemen,
        bouwjaar: tekst(bestaand.bouwjaar, su.bestaand.bouwjaar),
        bron: tekst(bestaand.bron, su.bestaand.bron),
        berekeningBeschikbaar: tekst(bestaand.berekeningBeschikbaar, su.bestaand.berekeningBeschikbaar),
        materiaalgegevensBeschikbaar: tekst(bestaand.materiaalgegevensBeschikbaar, su.bestaand.materiaalgegevensBeschikbaar),
      },
      vervormingen: lijst(u.vervormingen, su.vervormingen, (v): Vervormingsregel => ({
        onderdeel: tekst(v.onderdeel, ""), ueind: tekst(v.ueind, ""), ubij: tekst(v.ubij, ""), uhor: tekst(v.uhor, ""),
      })),
    },
    belastingen: {
      wind: {
        gebouwhoogte: tekst(wind.gebouwhoogte, sb.wind.gebouwhoogte),
        cscd: tekst(wind.cscd, sb.wind.cscd),
        coefficienten: lijst(wind.coefficienten, sb.wind.coefficienten, (c): Windcoefficient => ({
          omschrijving: tekst(c.omschrijving, ""), c: tekst(c.c, ""),
        })),
      },
      klassen: lijst(b.klassen, sb.klassen, (k): Belastingklasse => ({
        categorie: tekst(k.categorie, ""),
        lichteScheidingswanden: tekst(k.lichteScheidingswanden, ""),
        dakhelling: tekst(k.dakhelling, ""),
        qlast: tekst(k.qlast, ""),
      })),
      vloerenDaken: lijst(b.vloerenDaken, sb.vloerenDaken, normaliseerOpbouw),
      wanden: lijst(b.wanden, sb.wanden, normaliseerOpbouw),
    },
    toelichting: tekstRecord(o.toelichting),
    inHoofdstuk: waarheidRecord(o.inHoofdstuk),
    bijlagen: Array.isArray(o.bijlagen) ? o.bijlagen.filter((t): t is string => typeof t === "string") : s.bijlagen,
    nieuwePagina: waarheidRecord(o.nieuwePagina),
    bureau: normaliseerBureau(o.bureau),
  };
}
```

- [ ] **Step 4: Schrijf `packages/desktop/src/rapport/pad.ts`**

```ts
/**
 * Onveranderlijk zetten van één waarde diep in het rapport.
 *
 * Het rapportpaneel heeft tientallen velden; in plaats van een actie per veld
 * geeft elk veld zijn plek als pad ("belastingen.wind.gebouwhoogte",
 * "uitgangspunten.materialen.2.soort") en zet de store de waarde daar. Alleen
 * de objecten en lijsten op het pad worden gekopieerd; de rest blijft gedeeld,
 * zodat React-selectors op ongewijzigde takken niet opnieuw renderen.
 */

export type Pad = (string | number)[];

/**
 * "belastingen.wind.gebouwhoogte" → ["belastingen","wind","gebouwhoogte"]; cijfers worden
 * indexen. Sleutels die zelf alleen uit cijfers bestaan kunnen dus niet via een tekstpad;
 * exemplaar-ids ("ex-…") en tekst-ids hebben daar geen last van.
 */
export function leesPad(pad: string): Pad {
  return pad
    .split(".")
    .filter((deel) => deel !== "")
    .map((deel) => (/^\d+$/.test(deel) ? Number(deel) : deel));
}

/** Nieuwe kopie met `waarde` op `pad`; tussenliggende objecten/lijsten worden gekopieerd. */
export function zetOpPad<T>(obj: T, pad: Pad, waarde: unknown): T {
  if (pad.length === 0) return waarde as T;
  const [kop, ...rest] = pad;
  if (typeof kop === "number") {
    // Een index: de lijst kopiëren, of een nieuwe beginnen als er nog niets staat.
    const lijst: unknown[] = Array.isArray(obj) ? obj.slice() : [];
    lijst[kop] = zetOpPad(lijst[kop], rest, waarde);
    return lijst as T;
  }
  const bron: Record<string, unknown> =
    obj !== null && typeof obj === "object" && !Array.isArray(obj) ? (obj as Record<string, unknown>) : {};
  return { ...bron, [kop]: zetOpPad(bron[kop], rest, waarde) } as T;
}
```

- [ ] **Step 5: Draai de test en zie hem slagen**

Run: `node scripts/check-rapport.mjs`
Expected:
- elke regel begint met `OK`;
- de laatste regel is `Rapport: alle 66 controles kloppen.`;
- exit code 0.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop`
Expected: geen uitvoer, exit code 0.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-rapport.mjs packages/desktop/src/rapport/model.ts packages/desktop/src/rapport/pad.ts
git commit -m "feat(rapport): gegevensmodel en padbewerking voor het constructierapport" -m "Typen, standaardwaarden en normalisatie van project.rapport, en onveranderlijk zetten op een pad voor het rapportpaneel. Getoetst door scripts/check-rapport.mjs, dat de .ts-bestanden rechtstreeks in Node laadt." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Revisies en invulvelden

**Files:**
- Modify: `scripts/check-rapport.mjs`, drie plekken:
  - r. 8: modulelijst in de kop;
  - r. 17: na de laatste import;
  - r. 183: vóór `// ── Uitslag`.
- Create: `packages/desktop/src/rapport/revisies.ts`
- Create: `packages/desktop/src/rapport/invullen.ts`

**Interfaces:**
- Consumes: `import type { Revisie, RevisieStatus } from "./model.ts"` (Task 1).
- Produces:
  ```ts
  // rapport/revisies.ts
  export function volgendeCode(revisies: Revisie[]): string;
  export function rapportStatus(revisies: Revisie[]): RevisieStatus | "";
  export function eersteDatum(revisies: Revisie[]): string;
  export function laatsteRevisie(revisies: Revisie[]): Revisie | undefined;
  export function datumTekst(d: Date): string;                             // dd-mm-jjjj, lokale tijd

  // rapport/invullen.ts
  export interface Invulwaarden {
    adviseur: string; projectnummer: string; projectnaam: string; opdrachtgever: string;
    locatie: string; verantwoordelijk: string; uitvoerend: string;
  }
  export const INVULVELDEN: readonly (keyof Invulwaarden)[];            // adviseur, projectnummer, projectnaam, opdrachtgever, locatie, verantwoordelijk, uitvoerend
  export function vulIn(tekst: string, w: Invulwaarden): string;         // {naam} → waarde, leeg → "—", onbekend blijft staan
  export interface Tekstregel { tekst: string; leeg: boolean; inspringen: boolean; }
  export function tekstRegels(tekst: string): Tekstregel[];              // regels getrimd; "-…" springt in; lege voor- en naloop weg
  ```

- [ ] **Step 1: Breid de test uit in `scripts/check-rapport.mjs`**

(a) Modulelijst in de kop. Vervang

```js
 *   pad.ts          onveranderlijk zetten op een pad
```

door

```js
 *   pad.ts          onveranderlijk zetten op een pad
 *   revisies.ts     volgende revisiecode, rapportstatus, datums
 *   invullen.ts     invulvelden ({adviseur}, …) en tekstregels
```

(b) Imports. Vervang

```js
import { leesPad, zetOpPad } from "../packages/desktop/src/rapport/pad.ts";
```

door

```js
import { leesPad, zetOpPad } from "../packages/desktop/src/rapport/pad.ts";
import { datumTekst, eersteDatum, laatsteRevisie, rapportStatus, volgendeCode } from "../packages/desktop/src/rapport/revisies.ts";
import { INVULVELDEN, tekstRegels, vulIn } from "../packages/desktop/src/rapport/invullen.ts";
```

(c) Secties vóór de uitslag. Vervang

```js
// ── Uitslag ─────────────────────────────────────────────────────────────────
```

door

```js
// ── revisies.ts ─────────────────────────────────────────────────────────────
kop("revisies.ts");
{
  const rev = (code, status = "concept", datum = "01-01-2026") => ({ code, datum, omschrijving: "", status });
  gelijk("volgendeCode: lege lijst → A", volgendeCode([]), "A");
  const CODES = [
    ["A", "B"], ["Z", "AA"], ["AZ", "BA"], ["ZZ", "AAA"], ["b", "c"], ["z", "aa"],
    ["3", "4"], ["9", "10"], ["09", "10"], ["007", "008"], ["B2", "B3"], ["B9", "B10"],
    ["1a", "1b"], ["A.", "A.1"], ["  ", "A"],
  ];
  for (const [van, naar] of CODES) gelijk(`volgendeCode: "${van}" → "${naar}"`, volgendeCode([rev(van)]), naar);
  gelijk("volgendeCode: de laatste revisie telt, niet de hoogste",
    volgendeCode([rev("A"), rev("C"), rev("B")]), "C");

  gelijk("rapportStatus: geen revisies", rapportStatus([]), "");
  gelijk("rapportStatus: laatste revisie", rapportStatus([rev("A", "concept"), rev("B", "definitief")]), "definitief");
  gelijk("eersteDatum: geen revisies", eersteDatum([]), "");
  gelijk("eersteDatum", eersteDatum([rev("A", "concept", "03-02-2026"), rev("B", "concept", "10-06-2026")]), "03-02-2026");
  gelijk("laatsteRevisie: geen", laatsteRevisie([]), undefined);
  gelijk("laatsteRevisie", laatsteRevisie([rev("A"), rev("B")])?.code, "B");
  gelijk("datumTekst", datumTekst(new Date(2026, 0, 5)), "05-01-2026");
  gelijk("datumTekst: eind van het jaar", datumTekst(new Date(2026, 11, 31)), "31-12-2026");
}

// ── invullen.ts ─────────────────────────────────────────────────────────────
kop("invullen.ts");
{
  const w = {
    adviseur: "Voorbeeld Constructies", projectnummer: "2026-001", projectnaam: "Voorbeeldproject",
    opdrachtgever: "", locatie: "Voorbeeldstad", verantwoordelijk: "Ir. A. Voorbeeld", uitvoerend: "Ing. B. Voorbeeld",
  };
  gelijk("INVULVELDEN in volgorde", [...INVULVELDEN],
    ["adviseur", "projectnummer", "projectnaam", "opdrachtgever", "locatie", "verantwoordelijk", "uitvoerend"]);
  gelijk("vulIn", vulIn("{adviseur} heeft opdracht voor {projectnaam}.", w),
    "Voorbeeld Constructies heeft opdracht voor Voorbeeldproject.");
  gelijk("vulIn: leeg veld → —", vulIn("Opdrachtgever: {opdrachtgever}", w), "Opdrachtgever: —");
  gelijk("vulIn: alleen spaties telt als leeg", vulIn("{locatie}", { ...w, locatie: "   " }), "—");
  gelijk("vulIn: onbekend veld blijft staan", vulIn("{onbekend} en {adviseur}", w), "{onbekend} en Voorbeeld Constructies");
  gelijk("vulIn: meermaals", vulIn("{projectnummer}/{projectnummer}", w), "2026-001/2026-001");

  gelijk("tekstRegels: leeg", tekstRegels(""), []);
  gelijk("tekstRegels: alleen witruimte", tekstRegels("  \n \n"), []);
  gelijk("tekstRegels", tekstRegels("\n\nEerste regel.\n\n-punt een;\n  -punt twee;\r\nSlot.  \n\n"), [
    { tekst: "Eerste regel.", leeg: false, inspringen: false },
    { tekst: "", leeg: true, inspringen: false },
    { tekst: "-punt een;", leeg: false, inspringen: true },
    { tekst: "-punt twee;", leeg: false, inspringen: true },
    { tekst: "Slot.", leeg: false, inspringen: false },
  ]);
  gelijk("tekstRegels: twee lege regels blijven twee rijen",
    tekstRegels("a\n\n\nb").map((r) => r.leeg), [false, true, true, false]);
}

// ── Uitslag ─────────────────────────────────────────────────────────────────
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `node scripts/check-rapport.mjs`
Expected: exit code 1, met
`Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…\packages\desktop\src\rapport\revisies.ts' imported from …\scripts\check-rapport.mjs`

- [ ] **Step 3: Schrijf `packages/desktop/src/rapport/revisies.ts`**

```ts
/**
 * Revisies van het rapport: de volgende code, de status en de datums op het
 * voorblad.
 *
 * De eerste revisie geeft de "1ᵉ datum rapport", de laatste bepaalt de
 * rapportstatus. Codes volgen wat het bureau gewend is: letters (A, B, … Z,
 * AA), cijfers (1, 2, …) of een combinatie (B2 → B3). De volgende code gaat
 * altijd uit van de laatste revisie in de lijst, niet van de hoogste: wie een
 * revisie tussenvoegt, heeft daar zelf voor gekozen.
 */
import type { Revisie, RevisieStatus } from "./model.ts";

/** A → B, Z → AA, AZ → BA; hoofd- en kleine letters blijven wat ze waren. */
function volgendeLetters(letters: string): string {
  const tekens = letters.split("");
  for (let i = tekens.length - 1; i >= 0; i--) {
    const t = tekens[i];
    if (t === "Z") { tekens[i] = "A"; continue; }
    if (t === "z") { tekens[i] = "a"; continue; }
    tekens[i] = String.fromCharCode(t.charCodeAt(0) + 1);
    return tekens.join("");
  }
  // Alles liep over (Z → AA, ZZ → AAA): er komt een letter vóór, in de kast van de eerste.
  const eerste = letters[0];
  return (eerste === eerste.toLowerCase() ? "a" : "A") + tekens.join("");
}

/** "A"→"B", "Z"→"AA", "3"→"4", "B2"→"B3"; lijst leeg → "A"; neemt de laatste revisie als basis. */
export function volgendeCode(revisies: Revisie[]): string {
  const laatste = laatsteRevisie(revisies);
  const code = laatste ? laatste.code.trim() : "";
  if (code === "") return "A";
  // Eindigt op cijfers: die ophogen, met behoud van voorloopnullen ("09" → "10", "007" → "008").
  const cijfers = /^(.*?)(\d+)$/.exec(code);
  if (cijfers) {
    const [, voor, getal] = cijfers;
    return voor + String(Number(getal) + 1).padStart(getal.length, "0");
  }
  const letters = /^(.*?)([A-Za-z]+)$/.exec(code);
  if (letters) {
    const [, voor, reeks] = letters;
    return voor + volgendeLetters(reeks);
  }
  // Eindigt op iets anders ("A." of "rev-"): een volgnummer erachter.
  return code + "1";
}

/** Status van de laatste revisie; "" als er geen is. */
export function rapportStatus(revisies: Revisie[]): RevisieStatus | "" {
  return laatsteRevisie(revisies)?.status ?? "";
}

/** Datum van de eerste revisie ("1ᵉ datum rapport"), of "". */
export function eersteDatum(revisies: Revisie[]): string {
  return revisies.length > 0 ? revisies[0].datum : "";
}

export function laatsteRevisie(revisies: Revisie[]): Revisie | undefined {
  return revisies.length > 0 ? revisies[revisies.length - 1] : undefined;
}

/** dd-mm-jjjj, in lokale tijd: de datum die de gebruiker op zijn klok ziet. */
export function datumTekst(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}
```

- [ ] **Step 4: Schrijf `packages/desktop/src/rapport/invullen.ts`**

```ts
/**
 * Invulvelden en tekstopmaak van de rapportteksten.
 *
 * Een standaardtekst noemt het bureau of het project niet letterlijk maar via
 * een invulveld: "{adviseur} heeft opdracht voor het constructieadvies voor dit
 * project." Zo blijft een eigen variant bruikbaar in elk volgend project. De
 * waarden komen bij het opmaken uit het rapport, het bureauprofiel en de
 * projectgegevens; opgeslagen wordt alleen de tekst met de accolades.
 *
 * Opmaak is bewust minimaal, net als in de referentie: één regel is één rij in
 * het rapport, een lege regel is een lege rij (een nieuwe alinea), en een regel
 * die met "-" begint is een opsommingsregel die één kolom inspringt.
 */

export interface Invulwaarden {
  adviseur: string; projectnummer: string; projectnaam: string; opdrachtgever: string;
  locatie: string; verantwoordelijk: string; uitvoerend: string;
}

/** De invulvelden in de volgorde waarin het paneel ze onder een tekstblok toont. */
export const INVULVELDEN: readonly (keyof Invulwaarden)[] = [
  "adviseur", "projectnummer", "projectnaam", "opdrachtgever",
  "locatie", "verantwoordelijk", "uitvoerend",
];

function isInvulveld(naam: string): naam is keyof Invulwaarden {
  return (INVULVELDEN as readonly string[]).includes(naam);
}

/**
 * {naam} → waarde; leeg → "—"; onbekende {x} blijven staan.
 *
 * Een leeg veld wordt een gedachtestreepje in plaats van niets, zodat een zin
 * als "Opdrachtgever: —" in de afdruk laat zien dát er iets ontbreekt. Een
 * onbekende naam blijft letterlijk staan: een tikfout ("{adviseru}") valt dan
 * op in het afdrukvoorbeeld in plaats van stil te verdwijnen.
 */
export function vulIn(tekst: string, w: Invulwaarden): string {
  return tekst.replace(/\{([A-Za-z]+)\}/g, (heel: string, naam: string) => {
    if (!isInvulveld(naam)) return heel;
    const waarde = w[naam].trim();
    return waarde === "" ? "—" : waarde;
  });
}

/** Eén regel van een tekst zoals hij in het rapport komt. */
export interface Tekstregel { tekst: string; leeg: boolean; inspringen: boolean; }

/**
 * Splitst op regeleinden; een lege regel is een lege rij; een regel die met "-" begint springt
 * één kolom in. Laat voor- en naloop van lege regels weg.
 */
export function tekstRegels(tekst: string): Tekstregel[] {
  const regels: Tekstregel[] = tekst.split(/\r\n|\r|\n/).map((ruw) => {
    const regel = ruw.trim();
    return { tekst: regel, leeg: regel === "", inspringen: regel.startsWith("-") };
  });
  let begin = 0;
  let eind = regels.length;
  while (begin < eind && regels[begin].leeg) begin++;
  while (eind > begin && regels[eind - 1].leeg) eind--;
  return regels.slice(begin, eind);
}
```

- [ ] **Step 5: Draai de test en zie hem slagen**

Run: `node scripts/check-rapport.mjs`
Expected:
- elke regel begint met `OK`;
- de laatste regel is `Rapport: alle 101 controles kloppen.`;
- exit code 0.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop`
Expected: geen uitvoer, exit code 0.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-rapport.mjs packages/desktop/src/rapport/revisies.ts packages/desktop/src/rapport/invullen.ts
git commit -m "feat(rapport): revisiecodes, invulvelden en tekstregels" -m "Volgende revisiecode (A→B, Z→AA, 3→4, B2→B3), rapportstatus en datums voor het voorblad; invulvelden als {adviseur} in standaardteksten en het opdelen van een tekst in rijen met inspringende opsommingsregels." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Normwaarden en belastingopbouwen

**Files:**
- Modify: `scripts/check-rapport.mjs`, drie plekken:
  - r. 10: modulelijst in de kop;
  - r. 21: na de laatste import;
  - r. 240: vóór `// ── Uitslag`.
- Create: `packages/desktop/src/rapport/normwaarden.ts`
- Create: `packages/desktop/src/rapport/opbouw.ts`

**Interfaces:**
- Consumes:
  - `import { belastingFactoren, kFiVoor } from "../store/projectGegevens.ts"`:
    - `belastingFactoren(cc: number): { gG: number; gQ: number; gGa: number }` (tabel NB.4/NB.5);
    - `kFiVoor(cc: number): number`.
  - `import type { Gevellaag, Laag } from "./model.ts"` (Task 1).
- Produces:
  ```ts
  // rapport/normwaarden.ts
  export { kFiVoor };                                                      // extra: doorgegeven uit projectGegevens.ts (0,9 / 1,0 / 1,1)
  export function getal(s: string | undefined): number;
  export function rond(v: number, dec: number): number;
  export function fmt(v: number, dec: number, trim?: boolean): string;    // NaN → ""
  export type Klasse = 1 | 2 | 3;
  export function klasse(s: string | undefined, standaard: Klasse): Klasse;
  export function levensduurklasse(jaren: number): number;
  export function beta(rc: Klasse): number;
  export function ontwerpSupervisie(rc: Klasse): string;
  export function inspectieniveau(rc: Klasse): string;
  export interface FactorRij { groep: string; naam: string; cellen: [string, string, string, string] | null; opmerking?: string }
  export function belastingfactorTabel(cc: Klasse): FactorRij[];
  export const BOUWJAAR_NORMEN: readonly (readonly [number, string])[];  // extra
  export function normVoorBouwjaar(jaar: number): string;
  export interface Categorie { id: string; label: string; soort: "vloer" | "dak"; qk: number; Qk: number; psi: [number, number, number] }
  export const CATEGORIEEN: readonly Categorie[];
  export function categorie(id: string): Categorie | undefined;
  export function dakQk(alfaGraden: number): number;
  export const DAK_QK_DIRECT = 2.0;
  export const SNEEUW: { readonly sk: 0.7; readonly mu1: 0.8; readonly ce: 1; readonly ct: 1 };   // `as const`
  export function sneeuwPlatDak(): number;
  export const PSI_WIND: [number, number, number];
  export interface WindUitkomst { vb0: number; z0: number; zmin: number; ze: number; qp: number }
  export function windQp(windgebied: Klasse, terrein: Klasse, zMeter: number): WindUitkomst;
  export function windLabel(windgebied: Klasse, terrein: Klasse): string;

  // rapport/opbouw.ts
  export interface VlakRegel { naam: string; d: number | null; rho: number | null; p: number }
  export interface GevelRegel { naam: string; p: number; h: number; vulling: number; q: number }
  export function vlakOpbouw(lagen: Laag[]): { regels: VlakRegel[]; som: number };
  export function gevelOpbouw(lagen: Gevellaag[]): { regels: GevelRegel[]; som: number };
  export function leesVulling(s: string): number;                         // extra
  export function vullingTekst(v: number): string;                        // extra
  ```

De normwaarden en de tabellen waar ze vandaan komen. Alleen getallen en tabelnummers.

| Onderwerp | Waarden | Bron |
|---|---|---|
| Ontwerplevensduurklasse | 5 jaar → klasse 1; 15 → 2; 50 → 3; 100 → 4 | NEN-EN 1990 NB, tabel NB.1–2.1 |
| β (50 jaar) | RC1 3,3; RC2 3,8; RC3 4,3 | tabel B2 |
| Supervisie en inspectie | DSL1–3 en IL1–3 | tabellen B4 en B5 |
| K_FI | 0,9; 1,0; 1,1 | tabel B3, via `kFiVoor` |
| EQU | 0,90 / 1,10 / 1,5 / 1,5ψ0 | NB.3 |
| STR 6.10a (γ_G,sup / γ_Q), CC1 | 1,20 / 1,35 | NB.5 |
| STR 6.10a (γ_G,sup / γ_Q), CC2 | 1,35 / 1,5 | NB.4 |
| STR 6.10a (γ_G,sup / γ_Q), CC3 | 1,50 / 1,65 | NB.5 |
| STR 6.10b (γ_G,sup / γ_Q), CC1 | 1,10 / 1,35 | NB.5 |
| STR 6.10b (γ_G,sup / γ_Q), CC2 | 1,20 / 1,5 | NB.4 |
| STR 6.10b (γ_G,sup / γ_Q), CC3 | 1,30 / 1,65 | NB.5 |
| ψ0 / ψ1 / ψ2, cat. A | 0,4 / 0,5 / 0,3 | NB.2–A1.1 |
| ψ0 / ψ1 / ψ2, cat. B | 0,5 / 0,5 / 0,3 | NB.2–A1.1 |
| ψ0 / ψ1 / ψ2, cat. C | 0,4 (0,6 bij verkeersruimte) / 0,7 / 0,6 | NB.2–A1.1 |
| ψ0 / ψ1 / ψ2, cat. D | 0,4 / 0,7 / 0,6 | NB.2–A1.1 |
| ψ0 / ψ1 / ψ2, cat. H | 0 / 0 / 0 | NB.2–A1.1 |
| ψ0 / ψ1 / ψ2, wind | 0 / 0,2 / 0 | NB.2–A1.1 |
| q_k / Q_k, A (vloer, trap, balkon, gemeenschappelijk) | 1,75/3; 2,0/3; 2,5/3; 3,0/3 | NEN-EN 1991-1-1 NB.1–6.2 |
| q_k / Q_k, B | 2,5/3 | NB.1–6.2 |
| q_k / Q_k, C1–C5 | 4/3, 4/7, 5/7, 5/7, 5/7 | NB.1–6.2 |
| q_k / Q_k, D1–D2 | 4/7 | NB.1–6.2 |
| Dak (H) | α < 15°: q_k 1,0; 15–20°: q_k = 4 − 0,2α; ≥ 20°: 0 | NB.4–6.10 |
| Dak (H), Q_k | 1,5 kN; direct onder het dakbeschot 2,0 kN | NB.4–6.10 |
| Sneeuw | s_k 0,7; μ₁ 0,8; C_e = C_t = 1,0 → s = 0,56 kN/m² | NEN-EN 1991-1-3, formule 5.1 |
| Wind: v_b,0 | I 29,5; II 27,0; III 24,5 m/s | NEN-EN 1991-1-4 NB.1 |
| Wind: z₀ / z_min | 0: 0,005 / 1; II: 0,2 / 4; III: 0,5 / 7 | NB.3–4.1 |

De q_p-keten is dezelfde als in `templates/gording.ts` (L198–230). De referentiewaarden komen uit `scripts/check-gording.mjs` (L149–169), met een tolerantie van 0,001:

| Windgebied / terrein / z | q_p |
|---|---|
| II / II / 9 m | 0,822 |
| I / II / 9 m | 0,981 |
| III / II / 9 m | 0,676 |
| II / 0 / 9 m | 1,295 |
| II / III / 9 m | 0,649 |
| II / III / 5 m | 0,578 |
| II / II / 20 m | 1,067 |

- [ ] **Step 1: Breid de test uit in `scripts/check-rapport.mjs`**

(a) Modulelijst in de kop. Vervang

```js
 *   invullen.ts     invulvelden ({adviseur}, …) en tekstregels
```

door

```js
 *   invullen.ts     invulvelden ({adviseur}, …) en tekstregels
 *   normwaarden.ts  K_FI, β, DSL/IL, levensduurklasse, belastingfactoren per CC,
 *                   norm uit het bouwjaar, belastingcategorieën, sneeuw 0,56 en
 *                   q_p tegen de referentiewaarden van scripts/check-gording.mjs
 *   opbouw.ts       sommen van vlak- en gevelopbouwen, afgerond zoals de referentie
```

(b) Imports. Vervang

```js
import { INVULVELDEN, tekstRegels, vulIn } from "../packages/desktop/src/rapport/invullen.ts";
```

door

```js
import { INVULVELDEN, tekstRegels, vulIn } from "../packages/desktop/src/rapport/invullen.ts";
import {
  belastingfactorTabel, beta, categorie, CATEGORIEEN, dakQk, fmt, getal, inspectieniveau, kFiVoor,
  klasse, levensduurklasse, normVoorBouwjaar, ontwerpSupervisie, PSI_WIND, rond, sneeuwPlatDak,
  windLabel, windQp,
} from "../packages/desktop/src/rapport/normwaarden.ts";
import { gevelOpbouw, leesVulling, vlakOpbouw, vullingTekst } from "../packages/desktop/src/rapport/opbouw.ts";
```

(c) Secties vóór de uitslag. Vervang

```js
// ── Uitslag ─────────────────────────────────────────────────────────────────
```

door

```js
// ── normwaarden.ts ──────────────────────────────────────────────────────────
kop("normwaarden.ts — getallen");
{
  gelijk("getal: komma", getal("0,56"), 0.56);
  gelijk("getal: spaties", getal(" 3 "), 3);
  gelijk("getal: leeg → NaN", getal(""), NaN);
  gelijk("getal: undefined → NaN", getal(undefined), NaN);
  gelijk("getal: ongeldig → NaN", getal("0,004l_rep"), NaN);
  gelijk("rond(11.025, 2)", rond(11.025, 2), 11.03);
  gelijk("rond(0.595, 2)", rond(0.595, 2), 0.6);
  gelijk("rond(1.005, 2)", rond(1.005, 2), 1.01);
  gelijk("rond(0.1 + 0.2, 2)", rond(0.1 + 0.2, 2), 0.3);
  gelijk("rond(-11.025, 2)", rond(-11.025, 2), -11.03);
  gelijk("rond(2.5, 0)", rond(2.5, 0), 3);
  gelijk("fmt(0.56, 2)", fmt(0.56, 2), "0,56");
  gelijk("fmt(11.025, 2)", fmt(11.025, 2), "11,03");
  gelijk("fmt(1.5, 2, trim)", fmt(1.5, 2, true), "1,5");
  gelijk("fmt(1, 2, trim)", fmt(1, 2, true), "1");
  gelijk("fmt(-0.001, 2) zonder minteken", fmt(-0.001, 2), "0,00");
  gelijk("fmt(NaN) → leeg", fmt(NaN, 2), "");
  gelijk("klasse(\"1\")", klasse("1", 2), 1);
  gelijk("klasse(\"\") → standaard", klasse("", 2), 2);
  gelijk("klasse(\"4\") → standaard", klasse("4", 3), 3);
}

kop("normwaarden.ts — 4.1 constructieve uitgangspunten");
{
  gelijk("K_FI per CC (tabel B3)", [1, 2, 3].map(kFiVoor), [0.9, 1.0, 1.1]);
  gelijk("β per RC, 50 jaar (tabel B2)", [1, 2, 3].map(beta), [3.3, 3.8, 4.3]);
  gelijk("ontwerpsupervisie (tabel B4)", [1, 2, 3].map(ontwerpSupervisie), ["DSL1", "DSL2", "DSL3"]);
  gelijk("inspectieniveau (tabel B5)", [1, 2, 3].map(inspectieniveau), ["IL1", "IL2", "IL3"]);
  gelijk("levensduurklasse (tabel NB.1–2.1)", [5, 10, 15, 25, 50, 100, 120].map(levensduurklasse), [1, 2, 2, 3, 3, 4, 4]);
  gelijk("levensduurklasse: geen invoer", levensduurklasse(NaN), NaN);
}

kop("normwaarden.ts — 4.5 belastingfactoren");
{
  const rij = (cc, naam) => belastingfactorTabel(cc).find((r) => r.naam === naam);
  gelijk("tabel: rijen", belastingfactorTabel(2).map((r) => `${r.groep} ${r.naam}`), [
    "A EQU(6.10)", "B STR(6.10a)", "B STR(6.10b)", "C GEO(6.10)", "D FAT", "F HYD",
    " Buitengewoon(6.11a/b)", " Karakteristiek(6.14b)", " Frequent(6.15b)", " Quasi-Blijvend(6.16b)",
  ]);
  for (const cc of [1, 2, 3]) {
    gelijk(`CC${cc}: EQU hangt niet van CC af`, rij(cc, "EQU(6.10)").cellen, ["0,90", "1,10", "1,5", "1,5ψ0"]);
  }
  gelijk("CC1: 6.10a (NB.5)", rij(1, "STR(6.10a)").cellen, ["0,90", "1,20", "1,35ψ0", "1,35ψ0"]);
  gelijk("CC1: 6.10b (NB.5)", rij(1, "STR(6.10b)").cellen, ["0,90", "1,10", "1,35", "1,35ψ0"]);
  gelijk("CC2: 6.10a (NB.4)", rij(2, "STR(6.10a)").cellen, ["0,90", "1,35", "1,5ψ0", "1,5ψ0"]);
  gelijk("CC2: 6.10b (NB.4)", rij(2, "STR(6.10b)").cellen, ["0,90", "1,20", "1,5", "1,5ψ0"]);
  gelijk("CC3: 6.10a (NB.5)", rij(3, "STR(6.10a)").cellen, ["0,90", "1,50", "1,65ψ0", "1,65ψ0"]);
  gelijk("CC3: 6.10b (NB.5)", rij(3, "STR(6.10b)").cellen, ["0,90", "1,30", "1,65", "1,65ψ0"]);
  gelijk("GEO, FAT, HYD niet van toepassing",
    ["GEO(6.10)", "FAT", "HYD"].map((n) => rij(2, n).cellen), [null, null, null]);
  gelijk("buitengewoon", [rij(2, "Buitengewoon(6.11a/b)").cellen, rij(2, "Buitengewoon(6.11a/b)").opmerking],
    [["1,00", "1,00", "1,0ψ1", "1,0ψ2"], "niet gebruikt"]);
  gelijk("karakteristiek", rij(2, "Karakteristiek(6.14b)").cellen, ["1,00", "1,00", "1,00", "1,0ψ0"]);
  gelijk("frequent", rij(2, "Frequent(6.15b)").cellen, ["1,00", "1,00", "1,0ψ1", "1,0ψ2"]);
  gelijk("quasi-blijvend", rij(2, "Quasi-Blijvend(6.16b)").cellen, ["1,00", "1,00", "1,0ψ2", "1,0ψ2"]);
}

kop("normwaarden.ts — 4.6 norm uit het bouwjaar");
{
  gelijk("1955 → GBV 1950", normVoorBouwjaar(1955), "GBV 1950");
  gelijk("1912 → GBV 1912 (grens telt mee)", normVoorBouwjaar(1912), "GBV 1912");
  gelijk("1911 → -", normVoorBouwjaar(1911), "-");
  gelijk("1700 → -", normVoorBouwjaar(1700), "-");
  gelijk("1995 → TGB 1990", normVoorBouwjaar(1995), "TGB 1990");
  gelijk("2020 → Eurocodes", normVoorBouwjaar(2020), "Eurocodes");
  gelijk("geen bouwjaar → leeg", normVoorBouwjaar(getal("")), "");
}

kop("normwaarden.ts — 5.1 sneeuw en 5.4 veranderlijke belastingen");
{
  bijna("sneeuw plat dak", sneeuwPlatDak(), 0.56, 1e-9);
  gelijk("sneeuw plat dak opgemaakt", fmt(sneeuwPlatDak(), 2), "0,56");
  const a = categorie("A-vloer");
  gelijk("A-vloer: q_k, Q_k, ψ", [a?.soort, a?.qk, a?.Qk, a?.psi], ["vloer", 1.75, 3.0, [0.4, 0.5, 0.3]]);
  gelijk("A-trap", [categorie("A-trap")?.qk, categorie("A-trap")?.Qk], [2.0, 3.0]);
  gelijk("A-balkon", [categorie("A-balkon")?.qk, categorie("A-balkon")?.Qk], [2.5, 3.0]);
  gelijk("A-gemeenschappelijk", [categorie("A-gemeenschappelijk")?.qk, categorie("A-gemeenschappelijk")?.Qk], [3.0, 3.0]);
  gelijk("B: ψ", categorie("B")?.psi, [0.5, 0.5, 0.3]);
  gelijk("C1: q_k, Q_k", [categorie("C1")?.qk, categorie("C1")?.Qk], [4.0, 3.0]);
  gelijk("C3: q_k, Q_k, ψ", [categorie("C3")?.qk, categorie("C3")?.Qk, categorie("C3")?.psi], [5.0, 7.0, [0.4, 0.7, 0.6]]);
  gelijk("D2: q_k, Q_k", [categorie("D2")?.qk, categorie("D2")?.Qk], [4.0, 7.0]);
  const h = categorie("H-dak");
  gelijk("H-dak", [h?.soort, h?.qk, h?.Qk, h?.psi], ["dak", 1.0, 1.5, [0, 0, 0]]);
  gelijk("categorie: onbekend", categorie("X"), undefined);
  toets("categorie-ids uniek", new Set(CATEGORIEEN.map((c) => c.id)).size === CATEGORIEEN.length);
  for (const id of ["A-vloer", "A-trap", "A-balkon", "A-gemeenschappelijk", "B", "C1", "C2", "C3", "C4", "C5", "D1", "D2", "H-dak"]) {
    toets(`categorie ${id} bestaat`, categorie(id) !== undefined);
  }
  gelijk("dakQk: 0°, 14,9°", [dakQk(0), dakQk(14.9)], [1.0, 1.0]);
  bijna("dakQk: 17,5° → 0,5", dakQk(17.5), 0.5, 1e-12);
  gelijk("dakQk: 20°, 45°", [dakQk(20), dakQk(45)], [0, 0]);
  gelijk("dakQk: geen helling", dakQk(NaN), NaN);
}

kop("normwaarden.ts — 5.2 wind (referentie: scripts/check-gording.mjs)");
{
  // [windgebied, terreincategorie-code, z, q_p]; terreincode 1 = 0 (kust), 2 = II, 3 = III.
  const REFERENTIE = [
    [2, 2, 9, 0.822, "II / II / 9 m"],
    [1, 2, 9, 0.981, "I / II / 9 m"],
    [3, 2, 9, 0.676, "III / II / 9 m"],
    [2, 1, 9, 1.295, "II / 0 / 9 m"],
    [2, 3, 9, 0.649, "II / III / 9 m"],
    [2, 3, 5, 0.578, "II / III / 5 m (z_e = z_min = 7 m)"],
    [2, 2, 20, 1.067, "II / II / 20 m"],
  ];
  for (const [wg, tc, z, qp, naam] of REFERENTIE) bijna(`q_p ${naam}`, windQp(wg, tc, z).qp, qp, 0.001);
  const w = windQp(2, 3, 5);
  gelijk("II / III / 5 m: v_b,0, z₀, z_min, z_e", [w.vb0, w.z0, w.zmin, w.ze], [27.0, 0.5, 7, 7]);
  toets("geen gebouwhoogte → q_p NaN", Number.isNaN(windQp(2, 2, getal("")).qp));
  gelijk("windLabel", [windLabel(1, 1), windLabel(2, 2), windLabel(3, 3)], ["1 kust", "2 onbebouwd", "3 bebouwd"]);
  gelijk("ψ wind (NB.2–A1.1)", PSI_WIND, [0, 0.2, 0]);
}

// ── opbouw.ts ───────────────────────────────────────────────────────────────
kop("opbouw.ts");
{
  const laag = (naam, d, rho, p) => ({ naam, d, rho, p });
  const dak = vlakOpbouw([laag("dakpannen", "", "", "0,48"), laag("dakplaten", "", "", "0,07"), laag("gordingen", "", "", "0,15")]);
  bijna("vlak: 0,48 + 0,07 + 0,15", dak.som, 0.7, 1e-9);
  gelijk("vlak: som opgemaakt", fmt(dak.som, 2), "0,70");

  const vloer = vlakOpbouw([
    laag("vloerplaat", "", "", "0,30"),
    laag("beschot", "0,02", "4,0", ""),
    laag("balklaag", "", "", "0,08"),
    laag("plafond", "0,015", "9,0", ""),
  ]);
  gelijk("vlak: d × ρ", fmt(vloer.regels[1].p, 2), "0,08");
  gelijk("vlak: 0,015 × 9,0 = 0,135 → 0,14", fmt(vloer.regels[3].p, 2), "0,14");
  gelijk("vlak: d en ρ als getal, leeg als null", [vloer.regels[1].d, vloer.regels[1].rho, vloer.regels[0].d], [0.02, 4, null]);
  bijna("vlak: som 0,595", vloer.som, 0.595, 1e-9);
  gelijk("vlak: rond(0,595) → 0,6", rond(vloer.som, 2), 0.6);
  gelijk("vlak: som opgemaakt 0,60", fmt(vloer.som, 2), "0,60");
  gelijk("vlak: ingevulde p gaat voor d × ρ", vlakOpbouw([laag("x", "0,1", "10", "0,5")]).som, 0.5);
  gelijk("vlak: onvolledige laag telt als 0", vlakOpbouw([laag("x", "0,1", "", "")]).som, 0);

  const gevel = gevelOpbouw([
    { naam: "metselwerk", p: "2,00", h: "3,00", vulling: "90%" },
    { naam: "metselwerk", p: "2,00", h: "3,00", vulling: "90%" },
    { naam: "kozijn", p: "0,75", h: "3,00", vulling: "10%" },
  ]);
  gelijk("gevel: q per laag", gevel.regels.map((r) => fmt(r.q, 2)), ["5,40", "5,40", "0,23"]);
  bijna("gevel: som 11,025", gevel.som, 11.025, 1e-9);
  gelijk("gevel: rond(11,025) → 11,03", rond(gevel.som, 2), 11.03);
  gelijk("gevel: som opgemaakt", fmt(gevel.som, 2), "11,03");
  gelijk("vulling lezen", ["90%", "90", "0,9", "", "12,5 %"].map(leesVulling), [0.9, 0.9, 0.9, 1, 0.125]);
  gelijk("vulling tonen", [vullingTekst(0.9), vullingTekst(0.125), vullingTekst(1)], ["90%", "12,5%", "100%"]);
  gelijk("gevel: onvolledige laag telt als 0", gevelOpbouw([{ naam: "x", p: "2", h: "", vulling: "" }]).som, 0);
}

// ── Uitslag ─────────────────────────────────────────────────────────────────
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `node scripts/check-rapport.mjs`
Expected: exit code 1, met
`Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…\packages\desktop\src\rapport\normwaarden.ts' imported from …\scripts\check-rapport.mjs`

- [ ] **Step 3: Schrijf `packages/desktop/src/rapport/normwaarden.ts`**

```ts
/**
 * Normwaarden voor de hoofdstukken Uitgangspunten en Belastingen.
 *
 * Niets hiervan wordt opgeslagen: het rapport bewaart alleen de invoer (en de
 * projectgegevens bewaren CC, RC, ontwerplevensduur, windgebied en
 * terreincategorie), en bij het opmaken wordt alles hieruit afgeleid. Zo kan
 * een afgeleide waarde nooit uit de pas lopen met zijn bron.
 *
 * Alleen getallen en tabelnummers uit de normen; geen normtekst. Bronnen:
 *   NEN-EN 1990 + NB      tabel NB.1–2.1, B2, B3, B4, B5, NB.2–A1.1, NB.3, NB.4, NB.5
 *   NEN-EN 1991-1-1 + NB  tabel NB.1–6.2, NB.4–6.10
 *   NEN-EN 1991-1-3 + NB  s_k, C_e, C_t, μ₁ (formule 5.1)
 *   NEN-EN 1991-1-4 + NB  tabel NB.1, NB.3–4.1, formules 4.3 t/m 4.8
 *
 * Buiten deze map alleen ../store/projectGegevens.ts: dat bestand heeft zelf
 * geen imports, dus scripts/check-rapport.mjs kan alles rechtstreeks laden.
 */
import { belastingFactoren, kFiVoor } from "../store/projectGegevens.ts";

/** K_FI bij een gevolgklasse (tabel B3); hier doorgegeven zodat het rapport één bron heeft. */
export { kFiVoor };

// ── Getallen lezen en schrijven ─────────────────────────────────────────────

/** "0,56" → 0.56; "" of ongeldig → NaN. Invoer staat als tekst in het rapport. */
export function getal(s: string | undefined): number {
  if (s === undefined) return NaN;
  const t = s.trim().replace(/,/g, ".");
  return t === "" ? NaN : Number(t);
}

/**
 * Afronden zonder zwevendekommafout: rond(11.025, 2) === 11.03.
 *
 * 11,025 staat binair als 11,02499999…; `Math.round(11.025 * 100)` geeft dan
 * 1102. Via de exponent in de tekst ("11.025e2") rekent JavaScript met de
 * decimale waarde en komt er 1102,5 → 1103 uit. Vooraf gaat de ruis van het
 * optellen eraf (0,1 + 0,2 = 0,30000000000000004) door op 15 cijfers te
 * normaliseren. Halven gaan van nul af: −11,025 → −11,03.
 */
export function rond(v: number, dec: number): number {
  if (!Number.isFinite(v)) return v;
  const schoon = Number(Math.abs(v).toPrecision(15));
  const [m, e = "0"] = String(schoon).split("e");
  const heel = Math.round(Number(`${m}e${Number(e) + dec}`));
  const [m2, e2 = "0"] = String(heel).split("e");
  return Math.sign(v) * Number(`${m2}e${Number(e2) - dec}`);
}

/**
 * Nederlandse notatie; `dec` vaste decimalen; `trim` haalt nullen achteraan weg.
 * Geen getal (NaN, ontbrekende invoer) → "": de afdruk laat de cel dan leeg.
 */
export function fmt(v: number, dec: number, trim = false): string {
  if (!Number.isFinite(v)) return "";
  // `|| 0` maakt van −0 een gewone 0, anders staat er "-0,00".
  let s = (rond(v, dec) || 0).toFixed(dec);
  if (trim && s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s.replace(".", ",");
}

// ── Klassen (NEN-EN 1990) ───────────────────────────────────────────────────

export type Klasse = 1 | 2 | 3;

/** Een keuzeveld uit de projectgegevens ("1", "2", "3") als klasse; anders `standaard`. */
export function klasse(s: string | undefined, standaard: Klasse): Klasse {
  const n = getal(s);
  return n === 1 || n === 2 || n === 3 ? n : standaard;
}

/**
 * Ontwerplevensduurklasse volgens NB-tabel NB.1–2.1 (die vervangt tabel 2.1 voor
 * gebouwen): 5 → 1, 15 → 2, 50 → 3, 100 → 4. Tussenwaarden: de kleinste klasse
 * met jaren ≥ invoer (10 → 2, 25 → 3); boven 100 jaar blijft het klasse 4.
 */
export function levensduurklasse(jaren: number): number {
  if (!Number.isFinite(jaren) || jaren <= 0) return NaN;
  const GRENZEN: [number, number][] = [[5, 1], [15, 2], [50, 3], [100, 4]];
  for (const [grens, k] of GRENZEN) if (jaren <= grens) return k;
  return 4;
}

/** Betrouwbaarheidsindex β voor een referentieperiode van 50 jaar — tabel B2. */
export function beta(rc: Klasse): number {
  return rc === 1 ? 3.3 : rc === 3 ? 4.3 : 3.8;
}

/** Ontwerp- en berekeningssupervisie — tabel B4. */
export function ontwerpSupervisie(rc: Klasse): string {
  return `DSL${rc}`;
}

/** Inspectieniveau tijdens de uitvoering — tabel B5. */
export function inspectieniveau(rc: Klasse): string {
  return `IL${rc}`;
}

// ── 4.5 Belastingfactoren ───────────────────────────────────────────────────

export interface FactorRij {
  groep: string; naam: string;
  /** Opgemaakte cellen; `null` = de hele rij "niet van toepassing". */
  cellen: [string, string, string, string] | null;
  /** Opmerking rechts van de tabel (bijv. "niet gebruikt"). */
  opmerking?: string;
}

/**
 * 4.5 volgens NB.3, NB.4, NB.5 (via belastingFactoren(cc)); ψ als "ψ0"/"ψ1"/"ψ2" (de afdruk
 * zet het cijfer als subscript).
 *
 * Kolommen: γ_G,inf (gunstig), γ_G,sup (ongunstig), γ_Q,1 (overheersend),
 * γ_Q,i (overige). EQU (tabel NB.3) hangt niet van de gevolgklasse af; STR
 * 6.10a en 6.10b komen uit tabel NB.4 (CC2) en NB.5 (CC1, CC3). De tabel
 * rondt zelf af, dus bewust niet K_FI × de factoren van CC2 — zie
 * `belastingFactoren` in projectGegevens.ts. De buitengewone en de
 * bruikbaarheidscombinaties (tabel A1.4) hebben overal factor 1,0.
 */
export function belastingfactorTabel(cc: Klasse): FactorRij[] {
  const { gG, gQ, gGa } = belastingFactoren(cc);
  const g = (v: number) => fmt(v, 2);
  const q = (v: number) => fmt(v, 2, true);
  return [
    { groep: "A", naam: "EQU(6.10)", cellen: [g(0.9), g(1.1), q(1.5), `${q(1.5)}ψ0`] },
    { groep: "B", naam: "STR(6.10a)", cellen: [g(0.9), g(gGa), `${q(gQ)}ψ0`, `${q(gQ)}ψ0`] },
    { groep: "B", naam: "STR(6.10b)", cellen: [g(0.9), g(gG), q(gQ), `${q(gQ)}ψ0`] },
    { groep: "C", naam: "GEO(6.10)", cellen: null },
    { groep: "D", naam: "FAT", cellen: null },
    { groep: "F", naam: "HYD", cellen: null },
    { groep: "", naam: "Buitengewoon(6.11a/b)", cellen: ["1,00", "1,00", "1,0ψ1", "1,0ψ2"], opmerking: "niet gebruikt" },
    { groep: "", naam: "Karakteristiek(6.14b)", cellen: ["1,00", "1,00", "1,00", "1,0ψ0"] },
    { groep: "", naam: "Frequent(6.15b)", cellen: ["1,00", "1,00", "1,0ψ1", "1,0ψ2"] },
    { groep: "", naam: "Quasi-Blijvend(6.16b)", cellen: ["1,00", "1,00", "1,0ψ2", "1,0ψ2"] },
  ];
}

// ── 4.6 Bestaande situatie ──────────────────────────────────────────────────

/**
 * Voorschriften waaronder een bestaand gebouw vermoedelijk is ontworpen, per
 * jaar van invoering. Dezelfde opzoektabel als de referentie-spreadsheet; alleen
 * "TGB 1990" krijgt een spatie, net als de andere namen.
 */
export const BOUWJAAR_NORMEN: readonly (readonly [number, string])[] = [
  [1800, "-"],
  [1912, "GBV 1912"],
  [1918, "GBV 1918"],
  [1930, "GBV 1930"],
  [1940, "GBV 1940"],
  [1950, "GBV 1950"],
  [1962, "GBV 1962"],
  [1974, "VB 1974"],
  [1984, "VB 1984"],
  [1990, "TGB 1990"],
  [2012, "Eurocodes"],
];

/** Opzoektabel van de referentie; grootste jaartal ≤ bouwjaar. Geen bouwjaar → ""; vóór 1800 → "-". */
export function normVoorBouwjaar(jaar: number): string {
  if (!Number.isFinite(jaar)) return "";
  let norm = "-";
  for (const [vanaf, naam] of BOUWJAAR_NORMEN) if (jaar >= vanaf) norm = naam;
  return norm;
}

// ── 5.4 Opgelegde belastingen ───────────────────────────────────────────────

export interface Categorie {
  id: string; label: string;
  soort: "vloer" | "dak";
  /** kN/m²; bij daken de waarde voor een plat dak. */
  qk: number;
  /** kN */
  Qk: number;
  psi: [number, number, number];
}

// ψ0, ψ1, ψ2 per categorie — NEN-EN 1990 tabel NB.2–A1.1. Bij C geldt ψ0 = 0,6
// voor vluchtroutes en trappen (hier: omsloten verkeersruimte), anders 0,4.
const PSI_A: [number, number, number] = [0.4, 0.5, 0.3];
const PSI_B: [number, number, number] = [0.5, 0.5, 0.3];
const PSI_C: [number, number, number] = [0.4, 0.7, 0.6];
const PSI_C_VERKEER: [number, number, number] = [0.6, 0.7, 0.6];
const PSI_D: [number, number, number] = [0.4, 0.7, 0.6];
const PSI_H: [number, number, number] = [0, 0, 0];

/** NEN-EN 1991-1-1 NB (NB.1–6.2, NB.4–6.10) en NEN-EN 1990 NB (NB.2–A1.1). */
export const CATEGORIEEN: readonly Categorie[] = [
  { id: "A-vloer", label: "Categorie A: woon- en verblijfsruimtes", soort: "vloer", qk: 1.75, Qk: 3.0, psi: PSI_A },
  { id: "A-trap", label: "Categorie A: trappen", soort: "vloer", qk: 2.0, Qk: 3.0, psi: PSI_A },
  { id: "A-balkon", label: "Categorie A: balkons", soort: "vloer", qk: 2.5, Qk: 3.0, psi: PSI_A },
  { id: "A-gemeenschappelijk", label: "Categorie A: gemeenschappelijke ruimtes", soort: "vloer", qk: 3.0, Qk: 3.0, psi: PSI_A },
  { id: "B", label: "Categorie B: kantoorruimtes", soort: "vloer", qk: 2.5, Qk: 3.0, psi: PSI_B },
  { id: "B-verkeer", label: "Categorie B: omsloten verkeersruimte", soort: "vloer", qk: 3.0, Qk: 3.0, psi: PSI_B },
  { id: "C-verkeer", label: "Categorie C: omsloten verkeersruimte", soort: "vloer", qk: 5.0, Qk: 3.0, psi: PSI_C_VERKEER },
  { id: "C1", label: "Categorie C1: ruimtes met tafels", soort: "vloer", qk: 4.0, Qk: 3.0, psi: PSI_C },
  { id: "C2", label: "Categorie C2: ruimtes met vaste zitplaatsen", soort: "vloer", qk: 4.0, Qk: 7.0, psi: PSI_C },
  { id: "C3", label: "Categorie C3: ruimtes zonder obstakels", soort: "vloer", qk: 5.0, Qk: 7.0, psi: PSI_C },
  { id: "C4", label: "Categorie C4: ruimtes voor lichamelijke activiteiten", soort: "vloer", qk: 5.0, Qk: 7.0, psi: PSI_C },
  { id: "C5", label: "Categorie C5: ruimtes voor grote menigten", soort: "vloer", qk: 5.0, Qk: 7.0, psi: PSI_C },
  { id: "D-verkeer", label: "Categorie D: omsloten verkeersruimte", soort: "vloer", qk: 4.0, Qk: 7.0, psi: PSI_D },
  { id: "D1", label: "Categorie D1: detailhandel", soort: "vloer", qk: 4.0, Qk: 7.0, psi: PSI_D },
  { id: "D2", label: "Categorie D2: warenhuizen", soort: "vloer", qk: 4.0, Qk: 7.0, psi: PSI_D },
  { id: "H-dak", label: "Categorie H: daken", soort: "dak", qk: 1.0, Qk: 1.5, psi: PSI_H },
];

export function categorie(id: string): Categorie | undefined {
  return CATEGORIEEN.find((c) => c.id === id);
}

/**
 * q_k van een niet-toegankelijk dak bij dakhelling α (graden) — tabel NB.4–6.10:
 * α < 15° → 1,0; 15–20° → 4 − 0,2α; ≥ 20° → 0 (kN/m²). Geen helling → NaN.
 */
export function dakQk(alfaGraden: number): number {
  if (!Number.isFinite(alfaGraden)) return NaN;
  if (alfaGraden < 15) return 1.0;
  if (alfaGraden < 20) return 4 - 0.2 * alfaGraden;
  return 0;
}

/** Q_k voor elementen direct onder de dakbeschot (NB.4–6.10): 2,0 kN; anders 1,5 kN. */
export const DAK_QK_DIRECT = 2.0;

// ── 5.1 Sneeuw (NEN-EN 1991-1-3 + NB) ───────────────────────────────────────

/** s_k in heel Nederland, μ₁ voor een plat dak (0–30°), C_e en C_t. */
export const SNEEUW = { sk: 0.7, mu1: 0.8, ce: 1.0, ct: 1.0 } as const;

/** s = μ₁ · C_e · C_t · s_k (formule 5.1) = 0,56 kN/m² op een plat dak. */
export function sneeuwPlatDak(): number {
  return SNEEUW.mu1 * SNEEUW.ce * SNEEUW.ct * SNEEUW.sk;
}

// ── 5.2 Wind (NEN-EN 1991-1-4 + NB) ─────────────────────────────────────────

/** ψ0, ψ1, ψ2 voor wind — tabel NB.2–A1.1. */
export const PSI_WIND: [number, number, number] = [0, 0.2, 0];

export interface WindUitkomst { vb0: number; z0: number; zmin: number; ze: number; qp: number; }

// Codes zoals in de projectgegevens: windgebied 1..3 = I..III; terreincategorie
// 1 = 0 (zee/kust), 2 = II (onbebouwd), 3 = III (bebouwd).
const VB0: Record<Klasse, number> = { 1: 29.5, 2: 27.0, 3: 24.5 };          // tabel NB.1, m/s
const Z0: Record<Klasse, number> = { 1: 0.005, 2: 0.2, 3: 0.5 };            // tabel NB.3–4.1, m
const ZMIN: Record<Klasse, number> = { 1: 1, 2: 4, 3: 7 };                  // tabel NB.3–4.1, m
const TERREIN: Record<Klasse, string> = { 1: "kust", 2: "onbebouwd", 3: "bebouwd" };

/**
 * Zelfde keten als templates/gording.ts: projectgegevens-codes windgebied 1..3,
 * terreincategorie 1 (0/kust) 2 (II) 3 (III).
 *
 * c_dir = c_season = 1, c_o = 1 (vlak terrein), k_l = 1, ρ = 1,25 kg/m³:
 *   z_e = max(z; z_min)
 *   k_r = 0,19 · (z₀ / 0,05)^0,07              (4.5)
 *   v_m = k_r · ln(z_e / z₀) · v_b,0           (4.3, 4.4)
 *   I_v = 1 / ln(z_e / z₀)                     (4.7)
 *   q_p = (1 + 7 I_v) · ½ · ρ · v_m² / 1000    (4.8, kN/m²)
 * Geen hoogte (NaN) → q_p NaN.
 */
export function windQp(windgebied: Klasse, terrein: Klasse, zMeter: number): WindUitkomst {
  const vb0 = VB0[windgebied];
  const z0 = Z0[terrein];
  const zmin = ZMIN[terrein];
  const ze = Math.max(zMeter, zmin);
  const kr = 0.19 * Math.pow(z0 / 0.05, 0.07);
  const ln = Math.log(ze / z0);
  const vm = kr * ln * vb0;
  const iv = 1 / ln;
  const qp = ((1 + 7 * iv) * 0.5 * 1.25 * vm * vm) / 1000;
  return { vb0, z0, zmin, ze, qp };
}

/** "1 kust" / "2 onbebouwd" / "3 bebouwd": het label van 5.2. */
export function windLabel(windgebied: Klasse, terrein: Klasse): string {
  return `${windgebied} ${TERREIN[terrein]}`;
}
```

- [ ] **Step 4: Schrijf `packages/desktop/src/rapport/opbouw.ts`**

```ts
/**
 * Sommen van de belastingopbouwen in 5.5 Blijvende belastingen.
 *
 * Twee soorten, zoals in de referentie:
 *   vlak  (vloeren, daken, wanden per m²): p = d × ρ, of de ingevulde p, som in kN/m²;
 *   gevel (lijnlast op een ligger):       q = p × h × vulling, som in kN/m¹.
 *
 * De som wordt niet afgerond; dat doet de afdruk met fmt(som, 2). Zo telt een
 * laag van 0,135 als 0,135 mee en niet als de 0,14 die in de tabel staat, net
 * als in de referentie (0,30 + 0,08 + 0,08 + 0,135 = 0,595 → 0,60).
 */
import type { Gevellaag, Laag } from "./model.ts";
import { fmt, getal } from "./normwaarden.ts";

export interface VlakRegel { naam: string; d: number | null; rho: number | null; p: number; }
export interface GevelRegel { naam: string; p: number; h: number; vulling: number; q: number; }

/** Een getal of null als het veld leeg of ongeldig is. */
function ingevuld(s: string): number | null {
  const v = getal(s);
  return Number.isFinite(v) ? v : null;
}

/**
 * Vlakopbouw. Een ingevulde p gaat voor d × ρ (voor lagen waarvan alleen het
 * gewicht per m² bekend is, of waar een vullingsgraad in zit). Een laag zonder
 * p en zonder volledige d en ρ telt als 0.
 */
export function vlakOpbouw(lagen: Laag[]): { regels: VlakRegel[]; som: number } {
  const regels = lagen.map((l): VlakRegel => {
    const d = ingevuld(l.d);
    const rho = ingevuld(l.rho);
    const direct = ingevuld(l.p);
    const p = direct ?? (d !== null && rho !== null ? d * rho : 0);
    return { naam: l.naam, d, rho, p };
  });
  return { regels, som: regels.reduce((s, r) => s + r.p, 0) };
}

/**
 * Vullingsgraad als factor: "90%" → 0,9. Zonder procentteken geldt een getal
 * boven 1 als percentage ("90" → 0,9) en anders als factor ("0,9" → 0,9).
 * Leeg of ongeldig → 1: een gevellaag zonder vulling loopt over de volle hoogte.
 */
export function leesVulling(s: string): number {
  const t = s.trim();
  if (t.endsWith("%")) {
    const v = getal(t.slice(0, -1));
    return Number.isFinite(v) ? v / 100 : 1;
  }
  const v = getal(t);
  if (!Number.isFinite(v)) return 1;
  return v > 1 ? v / 100 : v;
}

/** 0,9 → "90%"; 0,125 → "12,5%". */
export function vullingTekst(v: number): string {
  const s = fmt(v * 100, 1, true);
  return s === "" ? "" : `${s}%`;
}

/**
 * Gevelopbouw: q = p × h × vulling per laag. p en h zijn NaN als ze ontbreken
 * (de afdruk laat die cel leeg); q is dan 0 en telt niet mee.
 */
export function gevelOpbouw(lagen: Gevellaag[]): { regels: GevelRegel[]; som: number } {
  const regels = lagen.map((l): GevelRegel => {
    const p = getal(l.p);
    const h = getal(l.h);
    const vulling = leesVulling(l.vulling);
    const q = p * h * vulling;
    return { naam: l.naam, p, h, vulling, q: Number.isFinite(q) ? q : 0 };
  });
  return { regels, som: regels.reduce((s, r) => s + r.q, 0) };
}
```

- [ ] **Step 5: Draai de test en zie hem slagen**

Run: `node scripts/check-rapport.mjs`
Expected:
- elke regel begint met `OK`, ook alle zeven `q_p …`-regels;
- de laatste regel is `Rapport: alle 207 controles kloppen.`;
- exit code 0.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop`
Expected: geen uitvoer, exit code 0.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-rapport.mjs packages/desktop/src/rapport/normwaarden.ts packages/desktop/src/rapport/opbouw.ts
git commit -m "feat(rapport): normwaarden en belastingopbouwen voor uitgangspunten en belastingen" -m "K_FI, beta, DSL/IL, levensduurklasse, belastingfactoren per gevolgklasse, norm uit het bouwjaar, belastingcategorieen, sneeuw en q_p met dezelfde keten als de gording; sommen van vlak- en gevelopbouwen zonder afrondingsfout (0,595 wordt 0,60, 11,025 wordt 11,03)." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Standaardteksten en hoofdstukindeling

**Files:**
- Modify: `scripts/check-rapport.mjs`, drie plekken:
  - r. 14: modulelijst in de kop;
  - r. 31: na de laatste import;
  - r. 404: vóór `// ── Uitslag`.
- Create: `packages/desktop/src/rapport/standaardteksten.ts`
- Create: `packages/desktop/src/rapport/opzet.ts`

**Interfaces:**
- Consumes:
  - `import type { Rapport } from "./model.ts"` (Task 1), in `opzet.ts`;
  - in de test ook `standaardRapport` (Task 1), en `INVULVELDEN` en `vulIn` (Task 2). Daarmee wordt gecontroleerd dat meegeleverde teksten alleen bekende invulvelden gebruiken.
- Produces:
  ```ts
  // rapport/standaardteksten.ts
  export interface Tekstvariant { label: string; tekst: string; }
  export const STANDAARD_TEKSTEN: Record<string, readonly Tekstvariant[]>;   // alle 20 tekst-ids
  export const STANDAARD_IN_NIEUW_RAPPORT: readonly string[];              // extra: de 11 ids met een standaard in een nieuw rapport
  export function standaardTeksten(): Record<string, string>;

  // rapport/opzet.ts
  export type Inhoud = "tekst" | "rol" | "bouwwerk" | "brand" | "materialen" | "conservering" | "factoren"
    | "bestaand" | "vervormingen" | "sneeuw" | "wind" | "veranderlijk" | "blijvend" | "berekeningen";
  export interface Knoop { id: string; titel: string; niveau: 1 | 2 | 3 | 4; inhoud?: Inhoud; optioneel?: boolean;
    nieuwePagina?: boolean; inspringen?: 0 | 1; kinderen?: Knoop[] }
  export const OPZET: readonly Knoop[];
  export function heeftTekst(k: Knoop): boolean;                           // extra: inhoud "tekst", "rol", "vervormingen" of "sneeuw"
  export const TEKST_IDS: readonly string[];                               // extra: de 20 tekst-ids in rapportvolgorde
  export interface Rapportknoop extends Knoop { nummer: string; nieuwePagina: boolean; kinderen: Rapportknoop[];
    blad?: { id: string; naam: string; bijlage: string } }
  export interface Blad { id: string; naam: string }
  export function bouwOpzet(r: Rapport, bladen: Blad[]): Rapportknoop[];
  export interface Inhoudsregel { nummer: string; titel: string; niveau: 1 | 2; }
  export function inhoudsopgave(knopen: Rapportknoop[]): Inhoudsregel[];
  export interface Bijlage { letter: string; titel: string }
  export const BIJLAGE_A = "Uitgebreide uitwerking berekeningen";          // extra
  export function bijlagen(r: Rapport, bladen: Blad[]): Bijlage[];
  ```

- [ ] **Step 1: Breid de test uit in `scripts/check-rapport.mjs`**

(a) Modulelijst in de kop. Vervang

```js
 *   opbouw.ts       sommen van vlak- en gevelopbouwen, afgerond zoals de referentie
```

door

```js
 *   opbouw.ts       sommen van vlak- en gevelopbouwen, afgerond zoals de referentie
 *   standaardteksten.ts, opzet.ts
 *                   standaardteksten per tekst-id, nummering met weglaten van lege
 *                   onderdelen, inhoudsopgave en bijlagen
```

(b) Imports. Vervang

```js
import { gevelOpbouw, leesVulling, vlakOpbouw, vullingTekst } from "../packages/desktop/src/rapport/opbouw.ts";
```

door

```js
import { gevelOpbouw, leesVulling, vlakOpbouw, vullingTekst } from "../packages/desktop/src/rapport/opbouw.ts";
import { STANDAARD_IN_NIEUW_RAPPORT, STANDAARD_TEKSTEN, standaardTeksten } from "../packages/desktop/src/rapport/standaardteksten.ts";
import { bijlagen, bouwOpzet, inhoudsopgave, OPZET, TEKST_IDS } from "../packages/desktop/src/rapport/opzet.ts";
```

(c) Secties vóór de uitslag. Vervang

```js
// ── Uitslag ─────────────────────────────────────────────────────────────────
```

door

```js
// ── standaardteksten.ts en opzet.ts ─────────────────────────────────────────
kop("standaardteksten.ts");
{
  const IDS = [
    "inleiding", "projectomschrijving", "rol", "bestaand-verticaal", "bestaand-stabiliteit",
    "bestaand-fundatie", "bestaand-beoordeling", "wijziging", "belendingen", "uitvoering-bestaand",
    "uitvoering-verbouw", "uitvoering-nieuwbouw", "trillingen", "vervormingen", "montage",
    "rekenprogrammatuur", "temperatuur", "aardbeving", "sneeuw", "regenwater",
  ];
  gelijk("tekst-ids in de opzet", [...TEKST_IDS], IDS);
  gelijk("varianten voor precies de tekst-ids", Object.keys(STANDAARD_TEKSTEN).sort(), [...IDS].sort());
  for (const id of IDS) {
    const varianten = STANDAARD_TEKSTEN[id];
    toets(`${id}: minstens één variant, elk met label en tekst`, varianten.length > 0
      && varianten.every((v) => v.label.trim() !== "" && v.tekst.trim() !== ""));
  }
  const nieuw = standaardTeksten();
  gelijk("nieuw rapport: welke teksten", Object.keys(nieuw), [...STANDAARD_IN_NIEUW_RAPPORT]);
  gelijk("nieuw rapport: welke teksten (spec)", Object.keys(nieuw).sort(), [
    "inleiding", "projectomschrijving", "rol", "trillingen", "vervormingen", "montage",
    "rekenprogrammatuur", "temperatuur", "aardbeving", "sneeuw", "regenwater",
  ].sort());
  gelijk("nieuw rapport: eerste variant", nieuw.trillingen, STANDAARD_TEKSTEN.trillingen[0].tekst);
  gelijk("rol: openingszin van 2.2", nieuw.rol, "{adviseur} heeft opdracht voor het constructieadvies voor dit project.");
  gelijk("regenwater: standaard", nieuw.regenwater, "Niet van toepassing");
  toets("rekenprogrammatuur noemt OpenAEC Calc", STANDAARD_TEKSTEN.rekenprogrammatuur.every((v) => v.tekst.includes("OpenAEC Calc")));

  // Alleen bekende invulvelden: een tikfout in een meegeleverde tekst zou
  // letterlijk ("{adviseru}") in elk rapport komen.
  const w = Object.fromEntries(INVULVELDEN.map((v) => [v, "x"]));
  const alle = Object.values(STANDAARD_TEKSTEN).flat();
  const rest = alle.map((v) => vulIn(v.tekst, w)).filter((t) => /\{[A-Za-z]+\}/.test(t));
  gelijk("alleen bekende invulvelden", rest, []);
}

kop("opzet.ts — standaardrapport zonder bladen");
{
  const r = standaardRapport(VANDAAG, standaardTeksten());
  const knopen = bouwOpzet(r, []);
  gelijk("hoofdstukken", knopen.map((k) => `${k.nummer} ${k.titel}`), [
    "1 Inleiding", "2 Projectgegevens", "3 Constructie", "4 Uitgangspunten", "5 Belastingen", "6 Berekeningen",
  ]);
  gelijk("inhoudsopgave", inhoudsopgave(knopen).map((i) => `${i.nummer} ${i.titel}`), [
    "1 Inleiding",
    "2 Projectgegevens", "2.1 Projectomschrijving", "2.2 Rol binnen het project en bereik rapport",
    "3 Constructie", "3.1 Toelichting constructie", "3.2 Aandachtspunten bij uitvoering",
    "4 Uitgangspunten", "4.1 Constructieve uitgangspunten bouwwerk", "4.2 Bouwconstructies bij brand",
    "4.3 Toegepaste materialen", "4.4 Conservering staalconstructie",
    "4.5 Belastingfactoren en belastingcombinaties", "4.6 Trillingen",
    "4.7 Vervormingen en horizontale verplaatsingen", "4.8 Montage en bouwfase",
    "4.9 Toegepaste rekenprogrammatuur", "4.10 Temperatuursinvloeden", "4.11 Aardbevingen",
    "5 Belastingen", "5.1 Sneeuwbelastingen(Q)", "5.2 Windbelastingen(Q)", "5.3 Regenwateraccumulatie(Q)",
    "5.4 Overige veranderlijke belastingen(Q)",
    "6 Berekeningen",
  ]);
  gelijk("inhoudsopgave: niveaus", inhoudsopgave(knopen).slice(0, 3).map((i) => i.niveau), [1, 1, 2]);
  gelijk("lege blokken in 3.1 en 3.2 vallen weg", knopen[2].kinderen.map((k) => k.kinderen.length), [0, 0]);
  gelijk("nieuwe pagina's", knopen.map((k) => k.nieuwePagina), [true, false, true, true, true, true]);
  gelijk("inspringen", knopen.map((k) => k.inspringen ?? 0), [0, 0, 0, 1, 1, 0]);
  gelijk("geen bijlagen", bijlagen(r, []), []);
}

kop("opzet.ts — weglaten en terugkomen");
{
  const r = standaardRapport(VANDAAG, standaardTeksten());
  r.teksten["bestaand-stabiliteit"] = "De stabiliteit wordt verzorgd door de gemetselde bouwmuren.";
  r.teksten.belendingen = "   ";
  r.teksten["uitvoering-nieuwbouw"] = "-Wapening laten controleren.";
  r.teksten.trillingen = "";
  r.uitgangspunten.bestaand.opnemen = true;
  r.belastingen.wanden.push({ soort: "gevel", naam: "Gevel", lagen: [] });
  r.nieuwePagina = { projectgegevens: true, inleiding: false };
  const knopen = bouwOpzet(r, []);

  const toelichting = knopen[2].kinderen[0];
  gelijk("3.1: alleen het gevulde blok", toelichting.kinderen.map((k) => `${k.niveau} ${k.titel}`), ["3 Bestaande situatie"]);
  gelijk("3.1: alleen het gevulde subblok", toelichting.kinderen[0].kinderen.map((k) => k.titel), ["Stabiliteit"]);
  gelijk("blokken hebben geen nummer", [toelichting.kinderen[0].nummer, toelichting.kinderen[0].kinderen[0].nummer], ["", ""]);
  gelijk("3.2: witruimte telt als leeg", knopen[2].kinderen[1].kinderen.map((k) => k.id), ["uitvoering-nieuwbouw"]);
  const h4 = knopen[3].kinderen.map((k) => `${k.nummer} ${k.id}`);
  gelijk("4.6 bestaande situatie opgenomen", h4[5], "4.6 bestaand-situatie");
  gelijk("lege niet-optionele tekst blijft staan", h4[6], "4.7 trillingen");
  gelijk("hoofdstuk 4 loopt door tot 4.12", h4[h4.length - 1], "4.12 aardbeving");
  gelijk("5.5 blijvende belastingen met een opbouw", knopen[4].kinderen.map((k) => k.nummer).pop(), "5.5");
  gelijk("nieuwePagina uit het rapport gaat voor", [knopen[0].nieuwePagina, knopen[1].nieuwePagina], [false, true]);
  toets("OPZET zelf onaangetast", OPZET[0].nieuwePagina === true && OPZET[1].nieuwePagina === undefined);
}

kop("opzet.ts — berekeningen en bijlagen");
{
  const r = standaardRapport(VANDAAG, standaardTeksten());
  r.inHoofdstuk = { "ex-a": true };
  r.bijlagen = ["Constructieoverzicht", "  ", "Sonderingen"];
  const bladen = [
    { id: "ex-a", naam: "Houten balklaag dak" },
    { id: "ex-b", naam: "Stalen ligger" },
    { id: "ex-c", naam: "Fundering" },
  ];
  const knopen = bouwOpzet(r, bladen);
  const ber = knopen[knopen.length - 1];
  gelijk("per blad een paragraaf", ber.kinderen.map((k) => `${k.nummer} ${k.titel}`),
    ["6.1 Houten balklaag dak", "6.2 Stalen ligger", "6.3 Fundering"]);
  gelijk("bijlagenummers, blad in het hoofdstuk zonder", ber.kinderen.map((k) => k.blad?.bijlage), ["", "A.1", "A.2"]);
  gelijk("blad: id en naam", ber.kinderen[1].blad, { id: "ex-b", naam: "Stalen ligger", bijlage: "A.1" });
  toets("inhoudsopgave zonder de paragrafen van Berekeningen",
    !inhoudsopgave(knopen).some((i) => i.nummer.startsWith("6.")));
  gelijk("bijlagen", bijlagen(r, bladen), [
    { letter: "A", titel: "Uitgebreide uitwerking berekeningen" },
    { letter: "B", titel: "Constructieoverzicht" },
    { letter: "C", titel: "Sonderingen" },
  ]);
  r.inHoofdstuk = { "ex-a": true, "ex-b": true, "ex-c": true };
  gelijk("alles in het hoofdstuk: geen bijlage A, eigen bijlagen houden hun letter",
    bijlagen(r, bladen).map((b) => b.letter), ["B", "C"]);
}

// ── Uitslag ─────────────────────────────────────────────────────────────────
```

- [ ] **Step 2: Draai de test en zie hem falen**

Run: `node scripts/check-rapport.mjs`
Expected: exit code 1, met
`Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…\packages\desktop\src\rapport\standaardteksten.ts' imported from …\scripts\check-rapport.mjs`

- [ ] **Step 3: Schrijf `packages/desktop/src/rapport/standaardteksten.ts`**

  - Alle varianten zijn neutraal: geen bureau-, persoons-, project- of productnamen, en geen links.
  - Wat per project of bureau verschilt, gaat via invulvelden.
  - `rekenprogrammatuur` noemt alleen "OpenAEC Calc".

```ts
/**
 * Meegeleverde tekstvarianten per tekstonderdeel van het rapport.
 *
 * Neutraal geformuleerd: geen bureau-, persoons-, project- of productnamen.
 * Wat per project of bureau verschilt gaat via invulvelden ({adviseur},
 * {projectnaam}, … — zie invullen.ts). Een bureau legt zijn eigen varianten
 * vast in de instellingen; die komen in het keuzemenu naast deze.
 *
 * De tekst-ids zijn de knoop-ids uit opzet.ts. Regelopmaak: een regel is een
 * rij in het rapport, een lege regel een nieuwe alinea, een regel die met "-"
 * begint een opsommingsregel.
 */

export interface Tekstvariant { label: string; tekst: string; }

/** Per tekst-id de meegeleverde varianten; de eerste is de standaard in een nieuw rapport. */
export const STANDAARD_TEKSTEN: Record<string, readonly Tekstvariant[]> = {
  // ── 1 Inleiding ──
  inleiding: [
    {
      label: "Hoofdberekening",
      tekst: [
        "Ten behoeve van het genoemde project brengt {adviseur} op verzoek van de opdrachtgever in dit rapport een constructieadvies uit.",
        "",
        "Het advies is gebaseerd op de verstrekte gegevens.",
        "",
        "Dit rapport omvat de hoofdberekening van de constructie.",
        "Voor de detailengineering dienen nog aanvullende berekeningen door derden te worden uitgevoerd, die door {adviseur} worden gecontroleerd:",
        "-Tekeningen en berekeningen systeemvloeren;",
        "-Tekeningen en berekeningen staalconstructie;",
        "-Sondering en funderingsadvies;",
      ].join("\n"),
    },
    {
      label: "Alleen uitgangspunten",
      tekst: [
        "Ten behoeve van het genoemde project brengt {adviseur} op verzoek van de opdrachtgever in dit rapport een constructieadvies uit.",
        "",
        "Het advies is gebaseerd op de verstrekte gegevens.",
        "",
        "Dit rapport omvat de uitgangspunten van de constructie.",
      ].join("\n"),
    },
  ],

  // ── 2 Projectgegevens ──
  projectomschrijving: [
    { label: "Aanbouw", tekst: "Het project omvat het realiseren van een aanbouw." },
    { label: "Dakopbouw", tekst: "Het project omvat het realiseren van een dakopbouw." },
    { label: "Nieuwbouw woning", tekst: "Het project omvat het realiseren van een woonhuis." },
    { label: "Verbouwing", tekst: "Het project omvat de verbouwing van een bestaand pand." },
  ],
  rol: [
    { label: "Opdracht constructieadvies", tekst: "{adviseur} heeft opdracht voor het constructieadvies voor dit project." },
    { label: "Opdracht toetsing", tekst: "{adviseur} heeft opdracht voor het toetsen van de constructie van dit project." },
  ],

  // ── 3.1 Toelichting constructie: bestaande situatie ──
  "bestaand-verticaal": [
    {
      label: "Houten balklagen op metselwerk",
      tekst: "De vloeren bestaan uit houten balklagen. Deze dragen via de gemetselde bouwmuren af naar de fundering.",
    },
    {
      label: "Gordingenkap en houten balklagen",
      tekst: "Het dak bestaat uit een gordingenkap. De vloeren bestaan uit houten balklagen.\nDeze dragen via de gemetselde bouwmuren en een dragende tussenwand af naar de fundering.",
    },
    {
      label: "Betonvloeren op dragende wanden",
      tekst: "De vloeren bestaan uit betonvloeren. Deze dragen via de dragende wanden af naar de fundering.",
    },
  ],
  "bestaand-stabiliteit": [
    { label: "Gemetselde bouwmuren", tekst: "De stabiliteit wordt verzorgd door de gemetselde bouwmuren." },
    {
      label: "Stabiliteitswanden en schijfwerking",
      tekst: "De stabiliteit wordt verzorgd door de stabiliteitswanden, in combinatie met de schijfwerking van de vloeren.",
    },
  ],
  "bestaand-fundatie": [
    {
      label: "Onbekend, vermoedelijk op staal",
      tekst: "Er zijn geen archiefgegevens bekend. Vermoedelijk is het gebouw op staal gefundeerd.",
    },
    { label: "Op staal", tekst: "Het gebouw is volgens de archiefgegevens op staal gefundeerd." },
    { label: "Op palen", tekst: "Het gebouw is volgens de archiefgegevens op palen gefundeerd." },
  ],
  "bestaand-beoordeling": [
    {
      label: "Geen aanleiding tot twijfel",
      tekst: "Er is geen aanleiding om te twijfelen aan de bouwkwaliteit van de bestaande constructie.",
    },
    {
      label: "Beoordelen in het werk",
      tekst: "De staat van de bestaande constructie is niet bekend. Deze wordt voor aanvang van de werkzaamheden in het werk beoordeeld.",
    },
  ],

  // ── 3.1 Toelichting constructie: wijziging en belendingen ──
  wijziging: [
    {
      label: "Doorbraak in dragende wand",
      tekst: [
        "Er wordt een doorbraak gemaakt in een dragende wand met een stalen portaal.",
        "De stabiliteit wordt verzorgd door het resterende deel van de wand.",
        "De verticale belastingafdracht naar de fundering gaat via de kolommen en de onderligger naar de bestaande fundering.",
      ].join("\n"),
    },
    {
      label: "Aanbouw met houten balklaag",
      tekst: "De aanbouw wordt gerealiseerd met een houten balklaag als dak, die via dragende wanden afdraagt naar een nieuwe fundering op staal.",
    },
  ],
  belendingen: [
    { label: "Niet beschouwd", tekst: "De constructieve invloed van belendingen is in deze berekening niet beschouwd." },
  ],

  // ── 3.2 Aandachtspunten bij uitvoering ──
  "uitvoering-bestaand": [
    {
      label: "Maatvoering controleren",
      tekst: "-Maatvoering is gebaseerd op archiefstukken en/of de tekening van de architect.\n-Maatvoering moet in het werk worden gecontroleerd.",
    },
  ],
  "uitvoering-verbouw": [
    {
      label: "Stempelen bij nieuwe openingen",
      tekst: "-Bij het maken van nieuwe openingen in bestaand metselwerk de wand en de omliggende constructie voldoende stempelen.",
    },
    {
      label: "Volgorde van slopen",
      tekst: "-Dragende onderdelen pas verwijderen als de nieuwe constructie is aangebracht of de belasting tijdelijk is opgevangen.",
    },
  ],
  "uitvoering-nieuwbouw": [
    {
      label: "Fundering op staal",
      tekst: "-Fundering op staal: de draagkrachtige laag vaststellen tijdens het ontgraven.\n-Wapening voor het storten laten controleren.",
    },
    {
      label: "Paalfundering",
      tekst: "-Kalenderstaten en paalafwijkingen naar de constructeur sturen.\n-Wapeningscontroles van de fundering en van alle vloerstorts.",
    },
  ],

  // ── 4 Uitgangspunten ──
  trillingen: [
    {
      label: "Trillingen bij vloeren",
      tekst: "Bij vloerconstructies worden trillingsberekeningen uitgevoerd.\nVoor overige onderdelen worden trillingen verder niet beschouwd.",
    },
    { label: "Niet beschouwd", tekst: "Trillingen worden in deze berekening niet beschouwd." },
  ],
  vervormingen: [
    { label: "Standaard", tekst: "De onderstaande vervormingseisen worden gehanteerd voor dit project." },
  ],
  montage: [
    {
      label: "Eindfase",
      tekst: "Deze berekening gaat uit van de constructie in de eindfase. Het berekenen van de verschillende bouwfasen, zoals onderstempeling, is niet meegenomen.",
    },
  ],
  rekenprogrammatuur: [
    { label: "OpenAEC Calc", tekst: "De berekeningen in dit rapport zijn opgesteld met OpenAEC Calc." },
    {
      label: "OpenAEC Calc met bijlagen",
      tekst: "De berekeningen in dit rapport zijn opgesteld met OpenAEC Calc.\nBerekeningen met andere rekenprogrammatuur staan in de bijlagen; daarin is de gebruikte versie benoemd.",
    },
  ],
  temperatuur: [
    { label: "Niet aan de orde", tekst: "Bij dit project zijn geen bijzondere temperatuursinvloeden aan de orde." },
    { label: "Per onderdeel", tekst: "Temperatuursinvloeden worden bij de desbetreffende onderdelen beschouwd." },
  ],
  aardbeving: [
    { label: "Niet voorgeschreven", tekst: "Er is geen aardbevingsontwerpsituatie voorgeschreven." },
  ],

  // ── 5 Belastingen ──
  sneeuw: [
    {
      label: "Standaard",
      tekst: "Sneeuwophoping en sneeuwbelasting op hellende daken worden bij de desbetreffende onderdelen berekend, indien van toepassing.",
    },
  ],
  regenwater: [
    { label: "Niet van toepassing", tekst: "Niet van toepassing" },
    {
      label: "Per dakonderdeel",
      tekst: "Wateraccumulatie op platte daken wordt bij de desbetreffende dakonderdelen berekend.",
    },
  ],
};

/**
 * De tekst-ids die in een nieuw rapport meteen hun eerste variant krijgen. De
 * overige onderdelen (bestaande situatie, wijziging, belendingen,
 * aandachtspunten) verschillen per project te veel: die beginnen leeg en
 * vallen dan uit het rapport tot de gebruiker er iets invult.
 */
export const STANDAARD_IN_NIEUW_RAPPORT: readonly string[] = [
  "inleiding", "projectomschrijving", "rol", "trillingen", "vervormingen", "montage",
  "rekenprogrammatuur", "temperatuur", "aardbeving", "sneeuw", "regenwater",
];

/** Per tekst-id de eerste variant, voor standaardRapport(); ids zonder standaard ontbreken. */
export function standaardTeksten(): Record<string, string> {
  const uit: Record<string, string> = {};
  for (const id of STANDAARD_IN_NIEUW_RAPPORT) {
    const eerste = STANDAARD_TEKSTEN[id]?.[0];
    if (eerste) uit[id] = eerste.tekst;
  }
  return uit;
}
```

- [ ] **Step 4: Schrijf `packages/desktop/src/rapport/opzet.ts`**

```ts
/**
 * De hoofdstukindeling van het constructierapport, op één plek vastgelegd.
 *
 * OPZET beschrijft alle onderdelen die een rapport kán hebben. bouwOpzet()
 * maakt daar de indeling van één rapport van: lege optionele onderdelen vallen
 * weg, de nummering loopt daarna door, en hoofdstuk Berekeningen krijgt per
 * rekenblad een paragraaf. Paneel, inhoudsopgave en afdruk lezen allemaal deze
 * uitkomst, zodat ze het nooit oneens zijn over wat "4.6" is.
 */
import type { Rapport } from "./model.ts";

export type Inhoud =
  | "tekst" | "rol"
  | "bouwwerk" | "brand" | "materialen" | "conservering" | "factoren" | "bestaand" | "vervormingen"
  | "sneeuw" | "wind" | "veranderlijk" | "blijvend"
  | "berekeningen";

export interface Knoop {
  /** Ook de sleutel in rapport.teksten als inhoud "tekst" is (of een tekst bij een tabel heeft). */
  id: string;
  titel: string;
  /** 1 hoofdstuk, 2 paragraaf (genummerd), 3 blok (vet, lijn eronder), 4 subblok (vet-cursief). */
  niveau: 1 | 2 | 3 | 4;
  inhoud?: Inhoud;
  /** Weglaten als er niets in staat. */
  optioneel?: boolean;
  /** Standaard: begint op een nieuwe pagina. */
  nieuwePagina?: boolean;
  /** Inspringen van de inhoud in kolommen (hoofdstuk 4 en 5 springen één kolom in). */
  inspringen?: 0 | 1;
  kinderen?: Knoop[];
}

/** Een tekstonderdeel: kop plus tekst uit rapport.teksten, optioneel. */
function tekst(id: string, titel: string, niveau: 3 | 4): Knoop {
  return { id, titel, niveau, inhoud: "tekst", optioneel: true };
}

export const OPZET: readonly Knoop[] = [
  { id: "inleiding", titel: "Inleiding", niveau: 1, inhoud: "tekst", nieuwePagina: true },
  {
    id: "projectgegevens", titel: "Projectgegevens", niveau: 1,
    kinderen: [
      { id: "projectomschrijving", titel: "Projectomschrijving", niveau: 2, inhoud: "tekst" },
      { id: "rol", titel: "Rol binnen het project en bereik rapport", niveau: 2, inhoud: "rol" },
    ],
  },
  {
    id: "constructie", titel: "Constructie", niveau: 1, nieuwePagina: true,
    kinderen: [
      {
        id: "toelichting", titel: "Toelichting constructie", niveau: 2,
        kinderen: [
          {
            id: "bestaand", titel: "Bestaande situatie", niveau: 3, optioneel: true,
            kinderen: [
              tekst("bestaand-verticaal", "Verticale belastingafdracht", 4),
              tekst("bestaand-stabiliteit", "Stabiliteit", 4),
              tekst("bestaand-fundatie", "Fundatie", 4),
              tekst("bestaand-beoordeling", "Beoordeling bestaande constructie", 4),
            ],
          },
          tekst("wijziging", "Wijziging", 3),
          tekst("belendingen", "Belendingen", 3),
        ],
      },
      {
        id: "uitvoering", titel: "Aandachtspunten bij uitvoering", niveau: 2,
        kinderen: [
          tekst("uitvoering-bestaand", "Bestaande situatie", 3),
          tekst("uitvoering-verbouw", "Verbouw, renovatie", 3),
          tekst("uitvoering-nieuwbouw", "Nieuwbouw", 3),
        ],
      },
    ],
  },
  {
    id: "uitgangspunten", titel: "Uitgangspunten", niveau: 1, nieuwePagina: true, inspringen: 1,
    kinderen: [
      { id: "bouwwerk", titel: "Constructieve uitgangspunten bouwwerk", niveau: 2, inhoud: "bouwwerk" },
      { id: "brand", titel: "Bouwconstructies bij brand", niveau: 2, inhoud: "brand" },
      { id: "materialen", titel: "Toegepaste materialen", niveau: 2, inhoud: "materialen" },
      { id: "conservering", titel: "Conservering staalconstructie", niveau: 2, inhoud: "conservering" },
      { id: "factoren", titel: "Belastingfactoren en belastingcombinaties", niveau: 2, inhoud: "factoren" },
      // Valt weg als uitgangspunten.bestaand.opnemen false is (nieuwbouw).
      { id: "bestaand-situatie", titel: "Bestaande situatie", niveau: 2, inhoud: "bestaand", optioneel: true },
      { id: "trillingen", titel: "Trillingen", niveau: 2, inhoud: "tekst" },
      // De tekst `vervormingen` is de inleidende zin boven de tabel.
      { id: "vervormingen", titel: "Vervormingen en horizontale verplaatsingen", niveau: 2, inhoud: "vervormingen" },
      { id: "montage", titel: "Montage en bouwfase", niveau: 2, inhoud: "tekst" },
      { id: "rekenprogrammatuur", titel: "Toegepaste rekenprogrammatuur", niveau: 2, inhoud: "tekst" },
      { id: "temperatuur", titel: "Temperatuursinvloeden", niveau: 2, inhoud: "tekst" },
      { id: "aardbeving", titel: "Aardbevingen", niveau: 2, inhoud: "tekst" },
    ],
  },
  {
    id: "belastingen", titel: "Belastingen", niveau: 1, nieuwePagina: true, inspringen: 1,
    kinderen: [
      // De tekst `sneeuw` staat onder de berekening van s.
      { id: "sneeuw", titel: "Sneeuwbelastingen(Q)", niveau: 2, inhoud: "sneeuw" },
      { id: "wind", titel: "Windbelastingen(Q)", niveau: 2, inhoud: "wind" },
      { id: "regenwater", titel: "Regenwateraccumulatie(Q)", niveau: 2, inhoud: "tekst" },
      { id: "veranderlijk", titel: "Overige veranderlijke belastingen(Q)", niveau: 2, inhoud: "veranderlijk" },
      // Valt weg zonder opbouwen.
      { id: "blijvend", titel: "Blijvende belastingen(G)", niveau: 2, inhoud: "blijvend", optioneel: true },
    ],
  },
  { id: "berekeningen", titel: "Berekeningen", niveau: 1, inhoud: "berekeningen", nieuwePagina: true },
];

/** Inhoudssoorten met een tekst in rapport.teksten naast hun tabel. */
const MET_TEKST: readonly Inhoud[] = ["rol", "vervormingen", "sneeuw"];

/** Heeft deze knoop een tekst in rapport.teksten (onder zijn eigen id)? */
export function heeftTekst(k: Knoop): boolean {
  return k.inhoud === "tekst" || (k.inhoud !== undefined && MET_TEKST.includes(k.inhoud));
}

/** Alle tekst-ids in de volgorde van het rapport — de sleutels van rapport.teksten. */
export const TEKST_IDS: readonly string[] = (() => {
  const ids: string[] = [];
  const loop = (knopen: readonly Knoop[]) => {
    for (const k of knopen) {
      if (heeftTekst(k)) ids.push(k.id);
      if (k.kinderen) loop(k.kinderen);
    }
  };
  loop(OPZET);
  return ids;
})();

/** Een knoop zoals hij in dit rapport voorkomt: met nummer, en zonder wat wegvalt. */
export interface Rapportknoop extends Knoop {
  nummer: string;
  nieuwePagina: boolean;
  kinderen: Rapportknoop[];
  blad?: { id: string; naam: string; bijlage: string };
}

export interface Blad { id: string; naam: string }

/**
 * Staat er niets in? Een tekstknoop is leeg als zijn getrimde tekst leeg is; een
 * knoop zonder eigen inhoud als al zijn kinderen leeg zijn. 4.6 en 5.5 hebben
 * een eigen regel; de overige tabellen zijn nooit leeg.
 */
function isLeeg(k: Knoop, r: Rapport): boolean {
  switch (k.inhoud) {
    case "tekst":
      return (r.teksten[k.id] ?? "").trim() === "";
    case "bestaand":
      return !r.uitgangspunten.bestaand.opnemen;
    case "blijvend":
      return r.belastingen.vloerenDaken.length === 0 && r.belastingen.wanden.length === 0;
    case undefined:
      return (k.kinderen ?? []).every((c) => isLeeg(c, r));
    default:
      return false;
  }
}

/** Niet-optionele knopen blijven altijd staan, ook als ze leeg zijn. */
function valtWeg(k: Knoop, r: Rapport): boolean {
  return k.optioneel === true && isLeeg(k, r);
}

function nieuwePaginaVoor(id: string, standaard: boolean | undefined, r: Rapport): boolean {
  return r.nieuwePagina[id] ?? standaard ?? false;
}

/**
 * Per rekenblad een paragraaf in Berekeningen. Bladen waarvan de uitwerking in
 * bijlage A staat krijgen daar een volgnummer (A.1, A.2, …); een blad met de
 * uitwerking in het hoofdstuk zelf krijgt bijlage "".
 */
function bladKnopen(nummer: string, r: Rapport, bladen: Blad[]): Rapportknoop[] {
  let inBijlage = 0;
  return bladen.map((b, i): Rapportknoop => ({
    id: b.id,
    titel: b.naam,
    niveau: 2,
    nummer: `${nummer}.${i + 1}`,
    nieuwePagina: nieuwePaginaVoor(b.id, false, r),
    kinderen: [],
    blad: { id: b.id, naam: b.naam, bijlage: r.inHoofdstuk[b.id] ? "" : `A.${++inBijlage}` },
  }));
}

function bouwKnoop(k: Knoop, nummer: string, r: Rapport, bladen: Blad[]): Rapportknoop {
  const kinderen = k.inhoud === "berekeningen"
    ? bladKnopen(nummer, r, bladen)
    : (k.kinderen ?? [])
        .filter((c) => !valtWeg(c, r))
        .map((c, j) => bouwKnoop(c, c.niveau === 2 ? `${nummer}.${j + 1}` : "", r, bladen));
  return { ...k, nummer, nieuwePagina: nieuwePaginaVoor(k.id, k.nieuwePagina, r), kinderen };
}

/** Nummert, laat lege optionele knopen weg, voegt per blad een paragraaf toe aan "berekeningen" (bijlage "A.1", "A.2", …). */
export function bouwOpzet(r: Rapport, bladen: Blad[]): Rapportknoop[] {
  return OPZET
    .filter((k) => !valtWeg(k, r))
    .map((k, i) => bouwKnoop(k, String(i + 1), r, bladen));
}

export interface Inhoudsregel { nummer: string; titel: string; niveau: 1 | 2; }

/** Hoofdstukken en paragrafen, behalve de paragrafen van "berekeningen" (die staan in de inhoudsopgave van dat hoofdstuk). */
export function inhoudsopgave(knopen: Rapportknoop[]): Inhoudsregel[] {
  const regels: Inhoudsregel[] = [];
  for (const h of knopen) {
    regels.push({ nummer: h.nummer, titel: h.titel, niveau: 1 });
    if (h.inhoud === "berekeningen") continue;
    for (const p of h.kinderen) {
      if (p.niveau === 2) regels.push({ nummer: p.nummer, titel: p.titel, niveau: 2 });
    }
  }
  return regels;
}

export interface Bijlage { letter: string; titel: string }

/** Titel van bijlage A. */
export const BIJLAGE_A = "Uitgebreide uitwerking berekeningen";

/** 0 → A, 1 → B, … 25 → Z, 26 → AA. */
function bijlageLetter(index: number): string {
  let n = index;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/**
 * A = "Uitgebreide uitwerking berekeningen" (alleen als er een blad in de bijlage staat),
 * daarna rapport.bijlagen als B, C, …
 *
 * De letters van de eigen bijlagen liggen vast (B is altijd de eerste eigen
 * bijlage), ook als A wegvalt: tekeningen en andere stukken verwijzen ernaar.
 * Een eigen bijlage zonder titel telt niet mee.
 */
export function bijlagen(r: Rapport, bladen: Blad[]): Bijlage[] {
  const uit: Bijlage[] = [];
  if (bladen.some((b) => !r.inHoofdstuk[b.id])) uit.push({ letter: "A", titel: BIJLAGE_A });
  r.bijlagen
    .map((t) => t.trim())
    .filter((t) => t !== "")
    .forEach((titel, i) => uit.push({ letter: bijlageLetter(i + 1), titel }));
  return uit;
}
```

- [ ] **Step 5: Draai de test en zie hem slagen**

Run: `node scripts/check-rapport.mjs`
Expected:
- elke regel begint met `OK`;
- de laatste regel is `Rapport: alle 259 controles kloppen.`;
- exit code 0.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop`
Expected: geen uitvoer, exit code 0.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-rapport.mjs packages/desktop/src/rapport/standaardteksten.ts packages/desktop/src/rapport/opzet.ts
git commit -m "feat(rapport): standaardteksten en hoofdstukindeling met nummering" -m "Neutrale tekstvarianten per tekstonderdeel met invulvelden, en de vaste opzet van het rapport: lege optionele onderdelen vallen weg, de nummering loopt door, Berekeningen krijgt per rekenblad een paragraaf, met inhoudsopgave en bijlagen A, B, C." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Deel: Opslag

Dit deel bouwt op Task 1–4 (`packages/desktop/src/rapport/model.ts`, `pad.ts`,
`revisies.ts`, `standaardteksten.ts` en `scripts/check-rapport.mjs`). Alle paden zijn
relatief aan de worktree
`C:/Users/rickd/Documents/GitHub/Ifc-Calc/.claude/worktrees/practical-mcclintock-34d234`;
alle commando's draaien vanuit die map.

> **Live-app.** Elke opslag van `store/projectStore.ts` of `store/projectBestand.ts` laat
> de draaiende app volledig herladen (Vite kan die modules niet vervangen). Het
> Tauri-venster zet daarna zijn project terug uit zijn eigen opslag (`preferences.json`,
> sleutel `projectState`); het Browser-paneel op `http://localhost:3021` heeft geen
> Tauri-opslag en begint na het herladen met een leeg project. Voer de bewerkingen van
> Task 5 daarom achter elkaar uit en controleer pas daarna. Task 6 en 7 maken bestanden
> die de app nog niet importeert: die herladen niets.
>
> Gebruik `http://localhost:3021`, niet `127.0.0.1` (Vite luistert alleen op `::1`).

**Keuzes in dit deel die niet in het contract staan** (namen staan ook in de
Produces-blokken):

- Nieuwe zuivere module `packages/desktop/src/rapport/bureau.ts` met
  `type EigenTeksten`, `normaliseerBureau`, `normaliseerEigenTeksten`,
  `metEigenVariant` en `zonderEigenVariant`, getoetst door het nieuwe
  `scripts/check-bureauprofiel.mjs` (loopt vanzelf mee in `check-alles`). Zo is de logica
  van de bureau-store in Node te toetsen; de store zelf importeert `store.ts` (Tauri) en
  kan dat niet.
- `normaliseerBureau` staat in `rapport/model.ts` (Task 1); `bureau.ts` geeft hem alleen
  door (`export { normaliseerBureau } from "./model.ts"`): één plek die weet hoe een
  profiel eruitziet.
- `voegTekstToe` vervangt een eigen variant met hetzelfde label op zijn plek (anders
  achteraan erbij). `verwijderTekst(id, index)` telt `index` binnen de eigen varianten van
  `id`; een lege lijst laat de tekst-id verdwijnen; een onbekende index verandert niets.
- `werkRapportBij(fn)`: geeft `fn` hetzelfde object terug, dan geen stap in de
  geschiedenis en geen `dirty`.
- `leesProjectBestand` laat `rapport` weg (`undefined`) als het bestand er geen heeft.
  `laadProject` en de hydratatie maken dan een nieuw rapport; wat wél binnenkomt wordt
  (opnieuw) genormaliseerd. Hulpfuncties in `projectStore.ts` (niet geëxporteerd):
  `nieuwRapport()` en `rapportUit(x: unknown)`.
- `PROJECT_FORMAAT_VERSIE` blijft 1: het veld is optioneel en lezen controleert de
  versie niet.
- Een nieuw rapport krijgt `bureau: leegBureau()` (uit `standaardRapport`); er wordt bij
  `nieuwProject` niets uit het bureauprofiel gekopieerd. De kopie komt van "Bijwerken uit
  bureauprofiel" in het paneel; de afdruk valt terug op het live profiel zolang
  `rapport.bureau.naam` leeg is (contract).
- De bureau-store bewaart de twee instellingssleutels los van elkaar, elk met een eigen
  vertraging van 400 ms; hydrateren alleen voor wat nog onaangeroerd is; wat vóór de
  hydratatie al veranderd was, wordt daarna alsnog bewaard. `BureauState` staat in
  property-stijl (`zetProfiel: (p) => void`), zoals `projectStore`; de signaturen zijn die
  van het contract.

---

### Task 5: Rapport in de projectstore en het projectbestand

**Files:**
- Modify: `packages/desktop/src/store/projectStore.ts` (regels 3–9, 52–54, 60–62, 84–86,
  101–105, 129–133, 162–167, 296–298, 305–311, 323–329, 338–341, 351–352, 386–387, 391–399)
- Modify: `packages/desktop/src/store/projectBestand.ts` (regels 3, 16–18, 29–37, 89–92)
- Modify: `packages/desktop/src/hooks/useBestandActies.ts` (regels 53, 58)

**Interfaces:**
- Consumes (Task 1–4):
  - `rapport/model.ts`: `interface Rapport`;
    `standaardRapport(vandaag: string, teksten: Record<string, string>): Rapport`;
    `normaliseerRapport(x: unknown, vandaag: string, teksten: Record<string, string>): Rapport`
  - `rapport/pad.ts`: `type Pad = (string | number)[]`; `leesPad(pad: string): Pad`;
    `zetOpPad<T>(obj: T, pad: Pad, waarde: unknown): T`
  - `rapport/revisies.ts`: `datumTekst(d: Date): string`
  - `rapport/standaardteksten.ts`: `standaardTeksten(): Record<string, string>`
- Produces:
  - `store/projectStore.ts`:
    - `export const RAPPORT_ID = "__rapport__";`
    - `ProjectState.rapport: Rapport` (altijd aanwezig)
    - `zetRapportVeld: (pad: string, waarde: string | boolean) => void` — via
      `leesPad`/`zetOpPad`, geschiedenissleutel `` `rapport:${pad}` `` (doortypen binnen
      700 ms is één stap), `dirty: true`
    - `werkRapportBij: (fn: (r: Rapport) => Rapport) => void` — sleutel `null` (altijd een
      eigen stap), `dirty: true`; geen stap en geen `dirty` als `fn` hetzelfde object
      teruggeeft
    - `Persisted.rapport?: Rapport`; `laadProject(p: Partial<Persisted>)` neemt
      `p.rapport` over (genormaliseerd) of maakt een nieuw rapport; `nieuwProject()` maakt
      een nieuw rapport
    - `Momentopname` bevat `rapport`: ongedaan maken/opnieuw draaien rapportwijzigingen
      terug en springen, net als bij bladen, terug naar de `activeId` van toen
    - de opslag van de app (`projectState`) bewaart `rapport`; een opslag zonder rapport
      krijgt bij hydrateren een nieuw rapport
  - `store/projectBestand.ts`: `ProjectPayload.rapport?: Rapport`;
    `GelezenProject.rapport?: Rapport` (genormaliseerd via `normaliseerRapport`, of
    `undefined` als het bestand geen rapport heeft)
  - `hooks/useBestandActies.ts`: opslaan schrijft `project.rapport` in het bestand

- [ ] **Step 1: Nulmeting in de browser (moet nog "falen")**

Open het Browser-paneel op `http://localhost:3021` (de dev-server draait normaal al; zo
niet: `npm --prefix packages/desktop run dev`). Voer in de DevTools-console (of met de
javascript-tool van het Browser-paneel) uit:

```js
(async () => {
  const zoek = (naam) =>
    performance.getEntriesByType("resource").map((e) => e.name)
      .filter((n) => n.includes(`/src/store/${naam}.ts`)).pop() ?? `/src/store/${naam}.ts`;
  const ps = await import(zoek("projectStore"));
  return [ps.RAPPORT_ID, ps.useProjectStore.getState().rapport];
})()
```

Verwacht nu: `[undefined, undefined]` (de javascript-tool toont `[null, null]`) — er is nog
geen rapport. (`zoek` pakt de URL waarmee
de app de module werkelijk heeft geladen, eventueel met `?t=…`; een kale
`import("/src/store/projectStore.ts")` kan na een hot update een tweede store opleveren.)

- [ ] **Step 2: `projectStore.ts` — imports en `RAPPORT_ID`**

Voer stap 2 t/m 8 direct achter elkaar uit; de app herlaadt bij elke opslag en is pas na
stap 8 weer consistent.

`packages/desktop/src/store/projectStore.ts` regels 3–9, oud:

```ts
import { getSetting, setSetting } from "../store";
import { legeGegevens, type ProjectGegevens } from "./projectGegevens";

const STORE_KEY = "projectState";

/** Vaste id van het projectgegevens-formulier; geen exemplaar, wel selecteerbaar. */
export const PROJECT_ID = "__projectgegevens__";
```

nieuw:

```ts
import { getSetting, setSetting } from "../store";
import { legeGegevens, type ProjectGegevens } from "./projectGegevens";
import { normaliseerRapport, standaardRapport, type Rapport } from "../rapport/model";
import { leesPad, zetOpPad } from "../rapport/pad";
import { datumTekst } from "../rapport/revisies";
import { standaardTeksten } from "../rapport/standaardteksten";

const STORE_KEY = "projectState";

/** Vaste id van het projectgegevens-formulier; geen exemplaar, wel selecteerbaar. */
export const PROJECT_ID = "__projectgegevens__";

/**
 * Vaste id van het rapport in de projectboom; net als PROJECT_ID geen
 * exemplaar, wel selecteerbaar. Exemplaar-ids beginnen met "ex-", dus een
 * `__x__`-id kan nooit met een blad botsen.
 */
export const RAPPORT_ID = "__rapport__";
```

- [ ] **Step 3: `projectStore.ts` — typen (`Persisted`, `ProjectState`, `Momentopname`)**

Regels 52–54 (einde van `interface Persisted`), oud:

```ts
  exemplaren: Exemplaar[];
  activeId: string;
}
```

nieuw:

```ts
  exemplaren: Exemplaar[];
  activeId: string;
  /** Ontbreekt in opslag en bestanden van vóór het constructierapport. */
  rapport?: Rapport;
}
```

Regels 60–62 (in `interface ProjectState`), oud:

```ts
  exemplaren: Exemplaar[];
  /** Wat er in de werkruimte staat: een exemplaar-id of PROJECT_ID. */
  activeId: string;
```

nieuw:

```ts
  exemplaren: Exemplaar[];
  /** Het constructierapport van dit project; zie rapport/model.ts. */
  rapport: Rapport;
  /** Wat er in de werkruimte staat: een exemplaar-id, PROJECT_ID of RAPPORT_ID. */
  activeId: string;
```

Regels 84–86 (in `interface ProjectState`), oud:

```ts
  zetProjectNaam: (naam: string) => void;

  ongedaan: () => void;
```

nieuw:

```ts
  zetProjectNaam: (naam: string) => void;

  /**
   * Zet één veld van het rapport, aangewezen met een pad zoals
   * "belastingen.wind.gebouwhoogte" of "revisies.0.omschrijving" (cijfers zijn
   * indexen). Doortypen in hetzelfde veld is één stap in de geschiedenis.
   */
  zetRapportVeld: (pad: string, waarde: string | boolean) => void;
  /**
   * Structurele wijziging van het rapport: een revisie, tabelregel, opbouw of
   * bijlage erbij of eraf, of "Bijwerken uit bureauprofiel". Altijd een eigen
   * stap in de geschiedenis. `fn` krijgt het huidige rapport en geeft een
   * nieuw object terug; het oude blijft ongemoeid.
   */
  werkRapportBij: (fn: (r: Rapport) => Rapport) => void;

  ongedaan: () => void;
```

Regels 101–105, oud:

```ts
interface Momentopname {
  exemplaren: Exemplaar[];
  gegevens: ProjectGegevens;
  activeId: string;
}
```

nieuw:

```ts
interface Momentopname {
  exemplaren: Exemplaar[];
  gegevens: ProjectGegevens;
  rapport: Rapport;
  activeId: string;
}
```

- [ ] **Step 4: `projectStore.ts` — geschiedenis (`metGeschiedenis`, `ongedaan`, `opnieuw`)**

Regels 129–133 (in `metGeschiedenis`), oud:

```ts
  const punt: Momentopname = {
    exemplaren: s.exemplaren,
    gegevens: s.gegevens,
    activeId: s.activeId,
  };
```

nieuw:

```ts
  const punt: Momentopname = {
    exemplaren: s.exemplaren,
    gegevens: s.gegevens,
    rapport: s.rapport,
    activeId: s.activeId,
  };
```

Regels 305–311 (in `ongedaan`), oud:

```ts
        toekomst: [
          ...s.toekomst,
          { exemplaren: s.exemplaren, gegevens: s.gegevens, activeId: s.activeId },
        ],
        exemplaren: vorige.exemplaren,
        gegevens: vorige.gegevens,
        activeId: vorige.activeId,
```

nieuw:

```ts
        toekomst: [
          ...s.toekomst,
          {
            exemplaren: s.exemplaren,
            gegevens: s.gegevens,
            rapport: s.rapport,
            activeId: s.activeId,
          },
        ],
        exemplaren: vorige.exemplaren,
        gegevens: vorige.gegevens,
        rapport: vorige.rapport,
        activeId: vorige.activeId,
```

Regels 323–329 (in `opnieuw`), oud:

```ts
        verleden: [
          ...s.verleden,
          { exemplaren: s.exemplaren, gegevens: s.gegevens, activeId: s.activeId },
        ].slice(-MAX_GESCHIEDENIS),
        exemplaren: volgende.exemplaren,
        gegevens: volgende.gegevens,
        activeId: volgende.activeId,
```

nieuw:

```ts
        verleden: [
          ...s.verleden,
          {
            exemplaren: s.exemplaren,
            gegevens: s.gegevens,
            rapport: s.rapport,
            activeId: s.activeId,
          },
        ].slice(-MAX_GESCHIEDENIS),
        exemplaren: volgende.exemplaren,
        gegevens: volgende.gegevens,
        rapport: volgende.rapport,
        activeId: volgende.activeId,
```

- [ ] **Step 5: `projectStore.ts` — beginstand, acties, nieuw en laden**

Regels 162–167, oud:

```ts
export const useProjectStore = create<ProjectState>((set, get) => ({
  projectNaam: "Nieuw project",
  bestandspad: null,
  gegevens: legeGegevens(),
  exemplaren: [],
  activeId: PROJECT_ID,
```

nieuw:

```ts
/** Een nieuw rapport: revisie A van vandaag en de meegeleverde standaardteksten. */
function nieuwRapport(): Rapport {
  return standaardRapport(datumTekst(new Date()), standaardTeksten());
}

/**
 * Een rapport van buiten de store — uit de opslag of een ingelezen bestand —
 * aangevuld tot een volledig rapport. Ontbreekt het (opslag of bestand van
 * vóór het constructierapport), dan komt er een nieuw rapport.
 */
function rapportUit(x: unknown): Rapport {
  return x ? normaliseerRapport(x, datumTekst(new Date()), standaardTeksten()) : nieuwRapport();
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectNaam: "Nieuw project",
  bestandspad: null,
  gegevens: legeGegevens(),
  exemplaren: [],
  rapport: nieuwRapport(),
  activeId: PROJECT_ID,
```

Regels 296–298, oud:

```ts
  zetProjectNaam: (naam) => set({ projectNaam: naam, dirty: true }),

  ongedaan: () =>
```

nieuw:

```ts
  zetProjectNaam: (naam) => set({ projectNaam: naam, dirty: true }),

  zetRapportVeld: (pad, waarde) =>
    set((s) => ({
      ...metGeschiedenis(s, `rapport:${pad}`),
      rapport: zetOpPad(s.rapport, leesPad(pad), waarde),
      dirty: true,
    })),

  werkRapportBij: (fn) =>
    set((s) => {
      const rapport = fn(s.rapport);
      // Hetzelfde object terug betekent: niets veranderd. Dan ook geen lege
      // stap in de geschiedenis en geen "niet opgeslagen".
      if (rapport === s.rapport) return s;
      return { ...metGeschiedenis(s, null), rapport, dirty: true };
    }),

  ongedaan: () =>
```

Regels 338–341 (in `nieuwProject`), oud:

```ts
      gegevens: legeGegevens(),
      exemplaren: [],
      activeId: PROJECT_ID,
      dirty: false,
```

nieuw:

```ts
      gegevens: legeGegevens(),
      exemplaren: [],
      rapport: nieuwRapport(),
      activeId: PROJECT_ID,
      dirty: false,
```

Regels 351–352 (in `laadProject`), oud:

```ts
      exemplaren: p.exemplaren ?? [],
      activeId: p.exemplaren?.[0]?.id ?? PROJECT_ID,
```

nieuw:

```ts
      exemplaren: p.exemplaren ?? [],
      rapport: rapportUit(p.rapport),
      activeId: p.exemplaren?.[0]?.id ?? PROJECT_ID,
```

- [ ] **Step 6: `projectStore.ts` — persistentie (hydratatie en momentopname)**

Regels 386–387 (hydratatie), oud:

```ts
      exemplaren: saved.exemplaren,
      activeId: saved.activeId ?? PROJECT_ID,
```

nieuw:

```ts
      exemplaren: saved.exemplaren,
      rapport: rapportUit(saved.rapport),
      activeId: saved.activeId ?? PROJECT_ID,
```

Regels 391–399, oud:

```ts
  useProjectStore.subscribe((s) =>
    schedulePersist({
      projectNaam: s.projectNaam,
      bestandspad: s.bestandspad,
      gegevens: s.gegevens,
      exemplaren: s.exemplaren,
      activeId: s.activeId,
    }),
  );
```

nieuw:

```ts
  // Een expliciete lijst: een nieuw veld moet hier én hierboven bij het
  // hydrateren worden toegevoegd, anders overleeft het geen herstart.
  useProjectStore.subscribe((s) =>
    schedulePersist({
      projectNaam: s.projectNaam,
      bestandspad: s.bestandspad,
      gegevens: s.gegevens,
      exemplaren: s.exemplaren,
      rapport: s.rapport,
      activeId: s.activeId,
    }),
  );
```

- [ ] **Step 7: `projectBestand.ts` — `project.rapport` lezen en schrijven**

`packages/desktop/src/store/projectBestand.ts` regel 3, oud:

```ts
import type { Exemplaar } from "./projectStore";
```

nieuw:

```ts
import type { Exemplaar } from "./projectStore";
import { normaliseerRapport, type Rapport } from "../rapport/model";
import { datumTekst } from "../rapport/revisies";
import { standaardTeksten } from "../rapport/standaardteksten";
```

Regels 16–18 (bestandscommentaar), oud:

```ts
 *   `project` — de eigenlijke inhoud: projectgegevens plus alle exemplaren,
 *               elk met eigen tekst en eigen invoerwaarden.
 *
```

nieuw:

```ts
 *   `project` — de eigenlijke inhoud: projectgegevens plus alle exemplaren,
 *               elk met eigen tekst en eigen invoerwaarden, en het
 *               constructierapport (`project.rapport`).
 *
 * `project.rapport` is optioneel: een bestand van vóór het constructierapport
 * krijgt bij openen een nieuw rapport met de standaardwaarden. De
 * formaatversie blijft daarom 1 (lezen controleert hem ook niet). Een oudere
 * versie van de app kent het veld niet en laat het bij opnieuw opslaan weg.
 *
```

Regels 29–37, oud:

```ts
  gegevens: ProjectGegevens;
  exemplaren: Exemplaar[];
}

export interface GelezenProject {
  projectNaam: string;
  gegevens: ProjectGegevens;
  exemplaren: Exemplaar[];
}
```

nieuw:

```ts
  gegevens: ProjectGegevens;
  exemplaren: Exemplaar[];
  /** Ontbreekt in bestanden van vóór het constructierapport. */
  rapport?: Rapport;
}

export interface GelezenProject {
  projectNaam: string;
  gegevens: ProjectGegevens;
  exemplaren: Exemplaar[];
  /** Afwezig bij een oud bestand of een los blad; laadProject maakt dan een nieuw rapport. */
  rapport?: Rapport;
}
```

Regels 89–92 (in `leesProjectBestand`, tak met `project`), oud:

```ts
            // Ontbreekt in bestanden van vóór de elementkoppeling; leeg = losstaand.
            elementen: e.elementen ?? [],
          })),
        };
```

nieuw:

```ts
            // Ontbreekt in bestanden van vóór de elementkoppeling; leeg = losstaand.
            elementen: e.elementen ?? [],
          })),
          // Per veld gecontroleerd: het bestand kan van een andere versie van
          // de app komen of met de hand zijn aangepast. Onbekende velden
          // vallen weg, ontbrekende krijgen hun standaardwaarde.
          rapport: p.rapport
            ? normaliseerRapport(p.rapport, datumTekst(new Date()), standaardTeksten())
            : undefined,
        };
```

`bouwProjectBestand` en `losBlad` blijven ongewijzigd: de payload wordt zoals hij is
weggeschreven, en een los blad heeft geen rapport (dat maakt `laadProject`).

- [ ] **Step 8: `useBestandActies.ts` — rapport mee in het bestand**

`packages/desktop/src/hooks/useBestandActies.ts` regel 53, oud:

```ts
  const { projectNaam, gegevens, exemplaren } = useProjectStore.getState();
```

nieuw:

```ts
  const { projectNaam, gegevens, exemplaren, rapport } = useProjectStore.getState();
```

Regel 58, oud:

```ts
    { versie: PROJECT_FORMAAT_VERSIE, naam: projectNaam, gegevens, exemplaren },
```

nieuw:

```ts
    { versie: PROJECT_FORMAAT_VERSIE, naam: projectNaam, gegevens, exemplaren, rapport },
```

De openpaden (`openen` hier en `handleOpenRecent` in `App.tsx`) roepen al
`laadProject(leesProjectBestand(…))` aan en nemen het rapport daarmee vanzelf mee.

- [ ] **Step 9: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop`
Verwacht: geen uitvoer, exitcode 0.

- [ ] **Step 10: Logica-controle nog groen**

Run: `node scripts/check-rapport.mjs`
Verwacht: exitcode 0, zoals na Task 1–4 (dit deel raakt `src/rapport/` niet; de controle
bewaakt alleen dat het zo blijft).

- [ ] **Step 11: Browser — store, geschiedenis en paden**

De app in het Browser-paneel is na stap 2–8 herladen en begint met een leeg project.
Voer in de console uit:

```js
(async () => {
  const zoek = (naam) =>
    performance.getEntriesByType("resource").map((e) => e.name)
      .filter((n) => n.includes(`/src/store/${naam}.ts`)).pop() ?? `/src/store/${naam}.ts`;
  const ps = await import(zoek("projectStore"));
  const st = () => ps.useProjectStore.getState();
  const uit = {};
  uit.start = [ps.RAPPORT_ID, st().rapport.titel, st().rapport.revisies[0].code, st().rapport.revisies[0].datum];
  const voor = st().verleden.length;
  st().zetRapportVeld("titel", "Proef");
  st().zetRapportVeld("titel", "Proef 2");
  uit.typen = [st().rapport.titel, st().verleden.length - voor, st().dirty];
  st().ongedaan();
  uit.ongedaan = st().rapport.titel;
  st().opnieuw();
  uit.opnieuw = st().rapport.titel;
  st().ongedaan();
  const n = st().verleden.length;
  st().werkRapportBij((r) => ({ ...r, bijlagen: [...r.bijlagen, "Constructieoverzicht"] }));
  st().werkRapportBij((r) => r);
  uit.bijwerken = [st().rapport.bijlagen.join(), st().verleden.length - n];
  st().ongedaan();
  uit.bijlagenNaOngedaan = st().rapport.bijlagen.length;
  st().zetRapportVeld("revisies.0.omschrijving", "Proefuitgave");
  st().zetRapportVeld("uitgangspunten.bestaand.opnemen", true);
  uit.pad = [st().rapport.revisies[0].omschrijving, Array.isArray(st().rapport.revisies), st().rapport.uitgangspunten.bestaand.opnemen];
  st().ongedaan();
  st().ongedaan();
  uit.padOngedaan = [st().rapport.revisies[0].omschrijving, st().rapport.uitgangspunten.bestaand.opnemen];
  return uit;
})()
```

Verwacht (datum = vandaag als dd-mm-jjjj):

```js
{
  start: ["__rapport__", "Constructieadvies & berekeningen", "A", "26-09-2026"],
  typen: ["Proef 2", 1, true],          // twee keer typen in hetzelfde veld = één stap
  ongedaan: "Constructieadvies & berekeningen",
  opnieuw: "Proef 2",
  bijwerken: ["Constructieoverzicht", 1], // werkRapportBij(r => r) voegt geen stap toe
  bijlagenNaOngedaan: 0,
  pad: ["Proefuitgave", true, true],      // revisies blijft een lijst
  padOngedaan: ["Eerste uitgave", false]
}
```

- [ ] **Step 12: Browser — bestand heen en terug (alleen in het Browser-paneel)**

Let op: dit vervangt het project met `laadProject`. Doe het **niet** in het
Tauri-venster, dat zou het echte project daar overschrijven en bewaren.

```js
(async () => {
  const zoek = (naam) =>
    performance.getEntriesByType("resource").map((e) => e.name)
      .filter((n) => n.includes(`/src/store/${naam}.ts`)).pop() ?? `/src/store/${naam}.ts`;
  const ps = await import(zoek("projectStore"));
  const pb = await import(zoek("projectBestand"));
  const st = () => ps.useProjectStore.getState();
  st().zetRapportVeld("kenmerk", "VB-001");
  const { projectNaam, gegevens, exemplaren, rapport } = st();
  const tekst = pb.bouwProjectBestand(
    { versie: pb.PROJECT_FORMAAT_VERSIE, naam: projectNaam, gegevens, exemplaren, rapport }, null);
  const terug = pb.leesProjectBestand(tekst, "proef");
  const oud = pb.leesProjectBestand(
    JSON.stringify({ project: { naam: "Oud", gegevens: {}, exemplaren: [] } }), "oud");
  const vreemd = pb.leesProjectBestand(
    JSON.stringify({ project: { naam: "X", exemplaren: [], rapport: { titel: "Eigen titel", onzin: 1 } } }), "x");
  const uit = {
    inBestand: JSON.parse(tekst).project.rapport.kenmerk,
    terug: terug.rapport.kenmerk,
    oudZonderRapport: oud.rapport === undefined,
    vreemd: [vreemd.rapport.titel, "onzin" in vreemd.rapport, vreemd.rapport.revisies.length],
  };
  st().laadProject(oud);
  uit.laadOud = [st().rapport.kenmerk, st().rapport.titel, st().verleden.length, st().dirty];
  st().laadProject(terug);
  uit.laadTerug = st().rapport.kenmerk;
  return uit;
})()
```

Verwacht:

```js
{
  inBestand: "VB-001",
  terug: "VB-001",
  oudZonderRapport: true,
  vreemd: ["Eigen titel", false, 1],   // onbekend veld weg, ontbrekende revisies = standaard
  laadOud: ["", "Constructieadvies & berekeningen", 0, false],
  laadTerug: "VB-001"
}
```

- [ ] **Step 13: Browser — projectboom werkt nog, en "Opslaan" schrijft het rapport**

1. De projectboom links toont "Projectgegevens" en "Nog geen rekenbladen…".
2. Klik "Module toevoegen…", typ `balk` in "Zoek een module…", dubbelklik de eerste
   module. Het blad verschijnt in de boom en opent in de werkruimte.
3. Klik "Projectgegevens": het formulier verschijnt. Klik het blad: het blad is terug.
4. Lint "Ongedaan": het blad verdwijnt. "Opnieuw": het blad is terug.
5. Vang de download van "Opslaan" af (de browser heeft geen opslagdialoog; zonder Tauri
   biedt de app het bestand als download aan):

```js
window.__opgeslagen = null;
window.__echt = { url: URL.createObjectURL, klik: HTMLAnchorElement.prototype.click };
URL.createObjectURL = (b) => { window.__opgeslagen = b; return "blob:proef"; };
HTMLAnchorElement.prototype.click = function () {};
"klaar"
```

6. Klik in het lint "Opslaan" (groep Bestand). Er verschijnt geen download.
7. Zet de afvang terug en lees wat er geschreven zou zijn:

```js
(async () => {
  URL.createObjectURL = window.__echt.url;
  HTMLAnchorElement.prototype.click = window.__echt.klik;
  const inhoud = JSON.parse(await window.__opgeslagen.text());
  return [inhoud.project.versie, inhoud.project.exemplaren.length, inhoud.project.rapport.kenmerk];
})()
```

Verwacht: `[1, 1, "VB-001"]`.

8. De console toont geen rode fouten.

- [ ] **Step 14: Tauri-venster (handmatig)**

1. Het venster is door stap 2–8 herladen en toont hetzelfde project als ervoor: dezelfde
   bladen in de boom, hetzelfde blad open.
2. Open de DevTools (Ctrl+Shift+I of rechtsklik → Inspect) en voer uit:

```js
(async () => {
  const zoek = (naam) =>
    performance.getEntriesByType("resource").map((e) => e.name)
      .filter((n) => n.includes(`/src/store/${naam}.ts`)).pop() ?? `/src/store/${naam}.ts`;
  const ps = await import(zoek("projectStore"));
  const s = ps.useProjectStore.getState();
  return [s.rapport.titel, s.rapport.kenmerk, s.exemplaren.length, s.dirty];
})()
```

   Verwacht: `["Constructieadvies & berekeningen", "", <aantal bladen>, false]` — de
   opslag had nog geen rapport (of alleen het standaardrapport van een tussentijdse
   herlaadbeurt), dus het project heeft een nieuw rapport.
3. Bewaren over een herstart: voer uit
   `(async () => { const u = performance.getEntriesByType("resource").map((e) => e.name).filter((n) => n.includes("/src/store/projectStore.ts")).pop() ?? "/src/store/projectStore.ts"; (await import(u)).useProjectStore.getState().zetRapportVeld("kenmerk", "VB-001"); await new Promise((r) => setTimeout(r, 1000)); location.reload(); })()`
   en voer na het herladen het fragment van punt 2 opnieuw uit. Verwacht: kenmerk
   `"VB-001"`.
4. Opruimen: zelfde regel als in punt 3, maar met `zetRapportVeld("kenmerk", "")` en zonder
   `location.reload()`. Het project staat daarna als gewijzigd; niet opslaan is prima.

- [ ] **Step 15: Commit**

```
git add packages/desktop/src/store/projectStore.ts packages/desktop/src/store/projectBestand.ts packages/desktop/src/hooks/useBestandActies.ts
git commit -m "feat(rapport): rapport in de projectstore en het projectbestand" -m "Het project krijgt een constructierapport: in de toestand, in de geschiedenis voor ongedaan maken, in de opslag van de app en in het projectbestand als project.rapport. zetRapportVeld zet een veld via een pad (doortypen is een stap), werkRapportBij doet structurele wijzigingen. Een bestand zonder rapport krijgt bij openen een nieuw rapport." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git status --short
```

Verwacht na de commit: alleen nog ` M packages/desktop/.gitignore` (vreemde wijziging,
blijft ongestaged).

---

### Task 6: Bureauprofiel en eigen tekstvarianten normaliseren (zuivere logica)

**Files:**
- Create: `packages/desktop/src/rapport/bureau.ts`
- Create: `scripts/check-bureauprofiel.mjs`

**Interfaces:**
- Consumes (Task 1–4):
  - `rapport/model.ts`: `interface BureauProfiel`; `leegBureau(): BureauProfiel`;
    `STANDAARD_HUISSTIJL: Huisstijl`; `normaliseerBureau(x: unknown): BureauProfiel`
    (controleert elk veld, lege huisstijlvelden krijgen de standaard)
  - `rapport/standaardteksten.ts`: `interface Tekstvariant { label: string; tekst: string }`
- Produces (`rapport/bureau.ts`, geen imports met waarden van buiten `rapport/`):
  - `export type EigenTeksten = Record<string, Tekstvariant[]>;`
  - `export { normaliseerBureau }` — doorgegeven uit `model.ts` (Task 1), zodat de store
    alles over het profiel uit één module haalt
  - `export function normaliseerEigenTeksten(x: unknown): EigenTeksten;`
  - `export function metEigenVariant(eigen: EigenTeksten, id: string, v: Tekstvariant): EigenTeksten;`
    — nieuw object; zelfde label vervangt op zijn plek, anders achteraan
  - `export function zonderEigenVariant(eigen: EigenTeksten, id: string, index: number): EigenTeksten;`
    — nieuw object; lege lijst laat de id verdwijnen; onbekende id/index geeft hetzelfde
    object terug
  - `scripts/check-bureauprofiel.mjs` (loopt vanzelf mee in `scripts/check-alles.mjs`)

- [ ] **Step 1: Schrijf de controle**

Create `scripts/check-bureauprofiel.mjs`:

```js
/**
 * Controlescript voor het bureauprofiel en de eigen tekstvarianten
 * (packages/desktop/src/rapport/bureau.ts).
 *
 * Beide staan in de instellingen van de app en kunnen daar door een andere
 * versie van de app zijn neergezet, of met de hand zijn aangepast. Normaliseren
 * moet daar altijd een volledig, bruikbaar geheel van maken: onbekende velden
 * weg, verkeerde typen terug naar de standaard, wat klopt blijft staan.
 *
 * Toevoegen en verwijderen van eigen varianten mag het bestaande object nooit
 * aanpassen: de store herkent een wijziging aan een nieuw object, en alleen
 * dan wordt er iets bewaard.
 *
 * Draaien:  node scripts/check-bureauprofiel.mjs
 */
import { isDeepStrictEqual } from "node:util";
import { leegBureau, STANDAARD_HUISSTIJL } from "../packages/desktop/src/rapport/model.ts";
import {
  normaliseerBureau,
  normaliseerEigenTeksten,
  metEigenVariant,
  zonderEigenVariant,
} from "../packages/desktop/src/rapport/bureau.ts";

let fouten = 0;
function toets(naam, ok, gekregen) {
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${naam}` + (ok ? "" : `   gekregen ${JSON.stringify(gekregen)}`));
}
const gelijk = isDeepStrictEqual;

// ── normaliseerBureau ──────────────────────────────────────────────────────
console.log("Bureauprofiel normaliseren");
toets("niets opgeslagen → leeg profiel", gelijk(normaliseerBureau(null), leegBureau()), normaliseerBureau(null));
toets("geen object → leeg profiel", gelijk(normaliseerBureau("onzin"), leegBureau()), normaliseerBureau("onzin"));

const deels = normaliseerBureau({ naam: "Voorbeeldbureau", plaats: "Voorbeeldstad", onbekend: 1 });
toets("ingevulde velden blijven staan", deels.naam === "Voorbeeldbureau" && deels.plaats === "Voorbeeldstad", deels);
toets("onbekend veld valt weg", !("onbekend" in deels), Object.keys(deels));
toets("ontbrekende huisstijl → standaardhuisstijl", gelijk(deels.huisstijl, STANDAARD_HUISSTIJL), deels.huisstijl);
toets("ontbrekende constructeurs → lege lijst", gelijk(deels.constructeurs, []), deels.constructeurs);

const fout = normaliseerBureau({ naam: 12, logo: false });
toets("verkeerd type → standaard", fout.naam === "" && fout.logo === "", fout);

const kleur = normaliseerBureau({ huisstijl: { hoofdkleur: "#000000" } });
toets(
  "huisstijl per veld aangevuld",
  gelijk(kleur.huisstijl, { ...STANDAARD_HUISSTIJL, hoofdkleur: "#000000" }),
  kleur.huisstijl,
);

const ir = { naam: "Ir. A. Voorbeeld", telefoon: "010-0000000", email: "a.voorbeeld@example.com" };
const metIr = normaliseerBureau({ constructeurs: [ir] });
toets("geldige constructeur blijft staan", gelijk(metIr.constructeurs, [ir]), metIr.constructeurs);

// ── normaliseerEigenTeksten ────────────────────────────────────────────────
console.log("Eigen tekstvarianten normaliseren");
toets("niets opgeslagen → geen varianten", gelijk(normaliseerEigenTeksten(null), {}), normaliseerEigenTeksten(null));
toets("lijst in plaats van object → geen varianten", gelijk(normaliseerEigenTeksten([]), {}), normaliseerEigenTeksten([]));
const gemengd = normaliseerEigenTeksten({
  inleiding: [
    { label: "Kort", tekst: "Tekst A" },
    { label: 3, tekst: "zonder geldig label" },
    "geen object",
    { label: "Lang", tekst: "Tekst B", extra: true },
  ],
  rol: "geen lijst",
  sneeuw: [],
});
toets(
  "alleen geldige varianten, zonder extra velden",
  gelijk(gemengd, { inleiding: [{ label: "Kort", tekst: "Tekst A" }, { label: "Lang", tekst: "Tekst B" }] }),
  gemengd,
);

// ── metEigenVariant / zonderEigenVariant ──────────────────────────────────
console.log("Eigen varianten toevoegen en verwijderen");
const basis = { inleiding: [{ label: "Kort", tekst: "A" }] };
const erbij = metEigenVariant(basis, "inleiding", { label: "Lang", tekst: "B" });
toets(
  "toevoegen zet de variant achteraan",
  gelijk(erbij.inleiding, [{ label: "Kort", tekst: "A" }, { label: "Lang", tekst: "B" }]),
  erbij,
);
toets("toevoegen laat het oude object ongemoeid", basis.inleiding.length === 1 && erbij !== basis, basis);

const vervangen = metEigenVariant(erbij, "inleiding", { label: "Kort", tekst: "A2" });
toets(
  "zelfde label vervangt de variant op zijn plek",
  gelijk(vervangen.inleiding, [{ label: "Kort", tekst: "A2" }, { label: "Lang", tekst: "B" }]),
  vervangen.inleiding,
);
const nieuweId = metEigenVariant({}, "sneeuw", { label: "Eigen", tekst: "S" });
toets("nieuwe tekst-id krijgt een eigen lijst", gelijk(nieuweId, { sneeuw: [{ label: "Eigen", tekst: "S" }] }), nieuweId);

const eraf = zonderEigenVariant(erbij, "inleiding", 0);
toets("verwijderen haalt precies die variant weg", gelijk(eraf.inleiding, [{ label: "Lang", tekst: "B" }]), eraf);
toets("verwijderen laat het oude object ongemoeid", erbij.inleiding.length === 2, erbij);
const leeg = zonderEigenVariant(nieuweId, "sneeuw", 0);
toets("laatste variant weg → tekst-id verdwijnt", gelijk(leeg, {}) && !("sneeuw" in leeg), leeg);
toets("onbekende index → zelfde object", zonderEigenVariant(erbij, "inleiding", 5) === erbij, null);
toets("onbekende tekst-id → zelfde object", zonderEigenVariant(erbij, "rol", 0) === erbij, null);

if (fouten > 0) {
  console.error(`\nBureauprofiel: ${fouten} afwijking(en).`);
  process.exit(1);
}
console.log("\nBureauprofiel: normaliseren, toevoegen en verwijderen kloppen.");
```

- [ ] **Step 2: Draai de controle en zie hem falen**

Run: `node scripts/check-bureauprofiel.mjs`
Verwacht: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…\packages\desktop\src\rapport\bureau.ts'`,
exitcode ≠ 0. (Op Windows kan Node daarna nog een regel
`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` tonen; dat hoort bij het afbreken,
niet bij de controle.)

- [ ] **Step 3: Schrijf de module**

Create `packages/desktop/src/rapport/bureau.ts`:

```ts
/**
 * Het bureauprofiel en de eigen tekstvarianten zoals ze in de instellingen
 * staan: normaliseren, en eigen varianten toevoegen en verwijderen.
 *
 * Zonder React en zonder bijwerkingen: store/bureauProfiel.ts gebruikt dit, en
 * scripts/check-bureauprofiel.mjs laadt het rechtstreeks in Node. Wat uit de
 * instellingen komt, is net zo onbetrouwbaar als een projectbestand: het kan
 * door een andere versie van de app zijn geschreven of met de hand zijn
 * aangepast.
 *
 * Elke bewerking geeft een nieuw object terug en laat het oude staan. Zo ziet
 * de store dat er iets veranderd is, en blijft een oude stand bruikbaar.
 */
import type { Tekstvariant } from "./standaardteksten.ts";

/** Eén plek die weet hoe een profiel eruitziet: zie model.ts. */
export { normaliseerBureau } from "./model.ts";

/** Eigen varianten per tekst-id, in de volgorde waarin ze zijn bewaard. */
export type EigenTeksten = Record<string, Tekstvariant[]>;

/**
 * Eigen varianten uit de instellingen. Alleen varianten met een tekstlabel en
 * een tekst blijven staan, zonder extra velden; een tekst-id zonder geldige
 * varianten valt weg.
 */
export function normaliseerEigenTeksten(x: unknown): EigenTeksten {
  if (!x || typeof x !== "object" || Array.isArray(x)) return {};
  const uit: EigenTeksten = {};
  for (const [id, lijst] of Object.entries(x)) {
    if (!Array.isArray(lijst)) continue;
    const varianten: Tekstvariant[] = [];
    for (const v of lijst as unknown[]) {
      if (!v || typeof v !== "object") continue;
      const { label, tekst } = v as Record<string, unknown>;
      if (typeof label === "string" && typeof tekst === "string") varianten.push({ label, tekst });
    }
    if (varianten.length > 0) uit[id] = varianten;
  }
  return uit;
}

/**
 * Voegt een eigen variant toe aan tekst-id `id`, achteraan.
 *
 * Een variant met hetzelfde label wordt op zijn plek vervangen: nog eens
 * "Bewaar als eigen variant" onder dezelfde naam werkt die variant bij, in
 * plaats van een tweede met dezelfde naam in de keuzelijst te zetten.
 */
export function metEigenVariant(eigen: EigenTeksten, id: string, v: Tekstvariant): EigenTeksten {
  const schoon: Tekstvariant = { label: v.label, tekst: v.tekst };
  const lijst = eigen[id] ?? [];
  const i = lijst.findIndex((w) => w.label === schoon.label);
  const nieuw = i < 0 ? [...lijst, schoon] : lijst.map((w, j) => (j === i ? schoon : w));
  return { ...eigen, [id]: nieuw };
}

/**
 * Haalt eigen variant `index` van tekst-id `id` weg. `index` telt binnen de
 * eigen varianten van die tekst, niet in de keuzelijst met de meegeleverde
 * erbij. Is de lijst daarna leeg, dan verdwijnt de tekst-id. Een onbekende id
 * of index verandert niets: dan komt hetzelfde object terug.
 */
export function zonderEigenVariant(eigen: EigenTeksten, id: string, index: number): EigenTeksten {
  const lijst = eigen[id];
  if (!lijst || index < 0 || index >= lijst.length) return eigen;
  const rest = lijst.filter((_, j) => j !== index);
  const uit = { ...eigen };
  if (rest.length > 0) uit[id] = rest;
  else delete uit[id];
  return uit;
}
```

- [ ] **Step 4: Draai de controle en zie hem slagen**

Run: `node scripts/check-bureauprofiel.mjs`
Verwacht: 21 regels `OK`, geen `FOUT`, als laatste regel
`Bureauprofiel: normaliseren, toevoegen en verwijderen kloppen.`, exitcode 0.

Slaagt "huisstijl per veld aangevuld", "verkeerd type → standaard" of "onbekend veld valt
weg" niet, dan controleert `normaliseerBureau` in `model.ts` (Task 1) het profiel niet per
veld zoals het contract vraagt: los het daar op, niet hier.

- [ ] **Step 5: Typecheck en logica-controle**

Run: `npx tsc --noEmit -p packages/desktop`
Verwacht: geen uitvoer, exitcode 0.

Run: `node scripts/check-rapport.mjs`
Verwacht: exitcode 0, zoals na Task 1–4.

- [ ] **Step 6: Commit**

```
git add packages/desktop/src/rapport/bureau.ts scripts/check-bureauprofiel.mjs
git commit -m "feat(rapport): bureauprofiel en eigen tekstvarianten normaliseren" -m "Zuivere functies voor wat in de instellingen staat: normaliseerBureau (doorgegeven uit model.ts, zodat er een plek is die weet hoe een profiel eruitziet), normaliseerEigenTeksten, metEigenVariant en zonderEigenVariant. scripts/check-bureauprofiel.mjs toetst ze en loopt mee in check-alles." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git status --short
```

Verwacht na de commit: alleen nog ` M packages/desktop/.gitignore`.

---

### Task 7: Store voor bureauprofiel en eigen tekstvarianten

**Files:**
- Create: `packages/desktop/src/store/bureauProfiel.ts`

**Interfaces:**
- Consumes:
  - `store.ts`: `getSetting<T>(key: string, fallback: T): Promise<T>`;
    `setSetting<T>(key: string, value: T): Promise<void>` (zonder Tauri: fallback en niets)
  - `rapport/model.ts`: `interface BureauProfiel`; `leegBureau(): BureauProfiel`
  - `rapport/standaardteksten.ts`: `interface Tekstvariant`
  - `rapport/bureau.ts` (Task 6): `normaliseerBureau`, `normaliseerEigenTeksten`,
    `metEigenVariant`, `zonderEigenVariant`
- Produces (`store/bureauProfiel.ts`):
  - `export const useBureauStore` — zustand-hook met (niet geëxporteerde) `BureauState`:
    - `profiel: BureauProfiel` (begint als `leegBureau()`)
    - `eigenTeksten: Record<string, Tekstvariant[]>` (begint als `{}`)
    - `zetProfiel: (p: BureauProfiel) => void` — vervangt het hele profiel
    - `voegTekstToe: (id: string, v: Tekstvariant) => void` — zelfde label vervangt
    - `verwijderTekst: (id: string, index: number) => void` — index binnen de eigen
      varianten van `id`
  - Bewaard onder de instellingssleutels `"bureauProfiel"` en `"rapportTeksten"`: hydrateren
    bij het importeren, daarna per sleutel 400 ms vertraagd wegschrijven. Geen
    vensterevents: lezers gebruiken `useBureauStore(selector)` of `getState()`. In een
    browser zonder Tauri blijft alles in het geheugen.
  - Het afbeeldingslimiet van 500 kB hoort bij de invoer (tab Bureau), niet bij de store.

- [ ] **Step 1: Nulmeting (moet falen)**

In het Browser-paneel op `http://localhost:3021`, console:

```js
import("/src/store/bureauProfiel.ts").then(() => "gevonden", (e) => String(e))
```

Verwacht: een fout, in Chrome/Edge
`"TypeError: Failed to fetch dynamically imported module: http://localhost:3021/src/store/bureauProfiel.ts"`
— het bestand bestaat nog niet.

- [ ] **Step 2: Schrijf de store**

Create `packages/desktop/src/store/bureauProfiel.ts`:

```ts
import { create } from "zustand";
import { getSetting, setSetting } from "../store";
import { leegBureau, type BureauProfiel } from "../rapport/model";
import type { Tekstvariant } from "../rapport/standaardteksten";
import {
  metEigenVariant,
  normaliseerBureau,
  normaliseerEigenTeksten,
  zonderEigenVariant,
} from "../rapport/bureau";

/**
 * Het bureauprofiel en de eigen tekstvarianten: instellingen van de gebruiker,
 * niet van een project.
 *
 * Een rapport krijgt een vastgelegde kopie van het profiel (`rapport.bureau`),
 * zodat een oud rapport niet verandert als het profiel later verandert. Deze
 * store is de bron voor die kopie, voor de tab Bureau in de instellingen en
 * voor de keuzelijst met standaardteksten in het rapportpaneel. Wie iets
 * moet weten, leest de store; er gaan geen vensterevents rond.
 *
 * Bewaard onder twee instellingssleutels, elk apart, zodat een nieuwe tekst
 * niet het hele profiel met zijn afbeeldingen opnieuw wegschrijft. In een
 * browser zonder Tauri is er geen opslag (zie store.ts): dan blijft alles
 * alleen in het geheugen en begint elke sessie met een leeg profiel.
 */

const PROFIEL_KEY = "bureauProfiel";
const TEKSTEN_KEY = "rapportTeksten";

interface BureauState {
  profiel: BureauProfiel;
  /** Eigen varianten per tekst-id. */
  eigenTeksten: Record<string, Tekstvariant[]>;
  zetProfiel: (p: BureauProfiel) => void;
  /** Achteraan erbij; een variant met hetzelfde label wordt vervangen. */
  voegTekstToe: (id: string, v: Tekstvariant) => void;
  /** `index` telt binnen de eigen varianten van `id`. */
  verwijderTekst: (id: string, index: number) => void;
}

// De beginstand, als vaste objecten: zolang de store nog precies deze
// objecten bevat, heeft niemand iets gewijzigd en mag de opgeslagen stand
// eroverheen.
const BEGIN_PROFIEL = leegBureau();
const BEGIN_TEKSTEN: Record<string, Tekstvariant[]> = {};

export const useBureauStore = create<BureauState>((set) => ({
  profiel: BEGIN_PROFIEL,
  eigenTeksten: BEGIN_TEKSTEN,

  zetProfiel: (p) => set({ profiel: p }),

  voegTekstToe: (id, v) => set((s) => ({ eigenTeksten: metEigenVariant(s.eigenTeksten, id, v) })),

  verwijderTekst: (id, index) =>
    set((s) => {
      const eigenTeksten = zonderEigenVariant(s.eigenTeksten, id, index);
      // Niets weggehaald: geen nieuwe stand, dus ook niets op te slaan.
      return eigenTeksten === s.eigenTeksten ? s : { eigenTeksten };
    }),
}));

// Persistentie -------------------------------------------------------------
// Zelfde patroon als projectStore: hydrateren bij het importeren, daarna
// debounced wegschrijven. Per sleutel een eigen timer, zodat typen in het
// profiel een net bewaarde tekstvariant niet ophoudt.

const timers = new Map<string, ReturnType<typeof setTimeout>>();
function planOpslag(sleutel: string, waarde: unknown) {
  const lopend = timers.get(sleutel);
  if (lopend) clearTimeout(lopend);
  timers.set(
    sleutel,
    setTimeout(() => {
      timers.delete(sleutel);
      void setSetting(sleutel, waarde);
    }, 400),
  );
}

void Promise.all([
  getSetting<unknown>(PROFIEL_KEY, null),
  getSetting<unknown>(TEKSTEN_KEY, null),
]).then(([profiel, teksten]) => {
  // De opgeslagen stand komt asynchroon binnen. Wat de gebruiker in de
  // tussentijd al heeft veranderd, wint: dat wordt niet overschreven maar
  // alsnog bewaard.
  const nu = useBureauStore.getState();
  const terug: Partial<Pick<BureauState, "profiel" | "eigenTeksten">> = {};
  if (nu.profiel !== BEGIN_PROFIEL) planOpslag(PROFIEL_KEY, nu.profiel);
  else if (profiel !== null) terug.profiel = normaliseerBureau(profiel);
  if (nu.eigenTeksten !== BEGIN_TEKSTEN) planOpslag(TEKSTEN_KEY, nu.eigenTeksten);
  else if (teksten !== null) terug.eigenTeksten = normaliseerEigenTeksten(teksten);
  if (terug.profiel || terug.eigenTeksten) useBureauStore.setState(terug);

  useBureauStore.subscribe((s, vorige) => {
    if (s.profiel !== vorige.profiel) planOpslag(PROFIEL_KEY, s.profiel);
    if (s.eigenTeksten !== vorige.eigenTeksten) planOpslag(TEKSTEN_KEY, s.eigenTeksten);
  });
});
```

De app importeert dit bestand nog niet (dat doen de tab Bureau en het rapportpaneel in
latere taken), dus er herlaadt niets.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop`
Verwacht: geen uitvoer, exitcode 0.

- [ ] **Step 4: Browser — de store in het geheugen**

Herlaad eerst de pagina (F5): een mislukte dynamische import uit stap 1 blijft binnen
dezelfde pagina mislukken. Daarna in de console:

```js
(async () => {
  const b = await import("/src/store/bureauProfiel.ts");
  const bs = () => b.useBureauStore.getState();
  const uit = { start: [bs().profiel.naam, bs().profiel.huisstijl.hoofdkleur, Object.keys(bs().eigenTeksten).length] };
  bs().zetProfiel({ ...bs().profiel, naam: "Voorbeeldbureau", constructeurs: [{ naam: "Ir. A. Voorbeeld", telefoon: "", email: "" }] });
  bs().voegTekstToe("inleiding", { label: "Kort", tekst: "Proeftekst" });
  bs().voegTekstToe("inleiding", { label: "Kort", tekst: "Proeftekst 2" });
  uit.na = [bs().profiel.naam, bs().profiel.constructeurs.length, bs().eigenTeksten.inleiding.length, bs().eigenTeksten.inleiding[0].tekst];
  const voor = bs().eigenTeksten;
  bs().verwijderTekst("inleiding", 3);
  uit.onbekendeIndex = bs().eigenTeksten === voor;
  bs().verwijderTekst("inleiding", 0);
  uit.verwijderd = !("inleiding" in bs().eigenTeksten);
  await new Promise((r) => setTimeout(r, 1000));
  return uit;
})()
```

Verwacht:

```js
{
  start: ["", "#1f3a5f", 0],
  na: ["Voorbeeldbureau", 1, 1, "Proeftekst 2"],   // zelfde label vervangen, niet verdubbeld
  onbekendeIndex: true,
  verwijderd: true
}
```

en geen rode fouten in de console, ook niet na de wachttijd (zonder Tauri faalt het
wegschrijven stil).

- [ ] **Step 5: Tauri-venster — bewaren over een herstart (handmatig)**

In de DevTools van het Tauri-venster (Ctrl+Shift+I):

1. Zet een proefprofiel en herlaad:

```js
(async () => {
  const b = await import("/src/store/bureauProfiel.ts");
  await new Promise((r) => setTimeout(r, 500));
  const bs = () => b.useBureauStore.getState();
  bs().zetProfiel({ ...bs().profiel, naam: "Voorbeeldbureau" });
  bs().voegTekstToe("inleiding", { label: "Kort", tekst: "Proeftekst" });
  await new Promise((r) => setTimeout(r, 1000));
  location.reload();
})()
```

2. Na het herladen (het project komt terug uit de eigen opslag):

```js
(async () => {
  const b = await import("/src/store/bureauProfiel.ts");
  await new Promise((r) => setTimeout(r, 500));
  const s = b.useBureauStore.getState();
  return [s.profiel.naam, s.profiel.huisstijl.hoofdkleur, s.eigenTeksten.inleiding?.[0]?.label];
})()
```

   Verwacht: `["Voorbeeldbureau", "#1f3a5f", "Kort"]`.

3. Opruimen:

```js
(async () => {
  const b = await import("/src/store/bureauProfiel.ts");
  const m = await import("/src/rapport/model.ts");
  await new Promise((r) => setTimeout(r, 500));
  b.useBureauStore.getState().zetProfiel(m.leegBureau());
  b.useBureauStore.getState().verwijderTekst("inleiding", 0);
  await new Promise((r) => setTimeout(r, 1000));
  const s = b.useBureauStore.getState();
  return [s.profiel.naam, Object.keys(s.eigenTeksten).length];
})()
```

   Verwacht: `["", 0]`.

- [ ] **Step 6: Alle controles**

Run: `node scripts/check-alles.mjs` (duurt ongeveer een minuut; vereist een gebouwde core,
`npm run check` bouwt die eerst)
Verwacht: in de samenvatting een `✓` bij elk script, waaronder `check-bureauprofiel.mjs` en
`check-rapport.mjs`, en als laatste regel `… controles, alle groen.`

- [ ] **Step 7: Commit**

```
git add packages/desktop/src/store/bureauProfiel.ts
git commit -m "feat(rapport): store voor bureauprofiel en eigen tekstvarianten" -m "useBureauStore houdt het bureauprofiel en de eigen tekstvarianten bij, hydrateert bij het importeren uit de instellingen (bureauProfiel, rapportTeksten) en bewaart per sleutel met vertraging. Zonder Tauri blijft alles in het geheugen." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git status --short
```

Verwacht na de commit: alleen nog ` M packages/desktop/.gitignore`.

---

## Deel: Instellingen

Dit deel legt het bureauprofiel vast in de instellingen. Het instellingenvenster krijgt een
tab **Bureau** met de bureaugegevens (naam, adres, postcode, plaats, telefoon, e-mail), het
logo en de voetafbeelding (data-URL, hooguit 500 kB, met voorbeeld en verwijderknop), de
huisstijl (vier kleuren met kleurkiezer en hexcode, plus het lettertype) en een bewerkbare
lijst constructeurs (titel en naam, telefoon, e-mail). De tab werkt, net als de andere tabs,
op een concept: **Opslaan** geeft het profiel aan `useBureauStore.zetProfiel`, en
**Annuleren**/Escape gooit het concept weg.

Alle commando's draaien vanuit de worktree-root
`C:/Users/rickd/Documents/GitHub/Ifc-Calc/.claude/worktrees/practical-mcclintock-34d234`
in Git Bash. Stage nooit `packages/desktop/.gitignore`.

**Afhankelijkheden van andere delen**

| Nodig in | Wat | Uit |
|---|---|---|
| Task 8 | `packages/desktop/src/rapport/model.ts` met `type BureauProfiel`, `type Constructeur`, `type Huisstijl`, `STANDAARD_HUISSTIJL` en `leegBureau()` (zoals in het contract) | Task 1 (logica, model) |
| Task 10 | `packages/desktop/src/store/bureauProfiel.ts` met `export const useBureauStore`, waarvan `getState().profiel: BureauProfiel` en `getState().zetProfiel(p: BureauProfiel): void` (de store bewaart zelf, debounced, onder de sleutel `"bureauProfiel"`) | Task 7 (opslag, bureauprofiel) |

Zonder `model.ts` faalt de typecontrole van Task 8 op
`Cannot find module '../../rapport/model'`; zonder `bureauProfiel.ts` die van Task 10 op
`Cannot find module '../../store/bureauProfiel'`.

**Live-app.** De gebruiker test in de draaiende app (Vite op http://localhost:3021, plus het
Tauri-venster).
- Task 8 maakt een component die nog nergens gemount is en breidt `SettingsDialog.css` uit
  (CSS-HMR). Er verandert niets zichtbaars.
- Task 9 wijzigt de twee `settings.json`-bestanden. Via `i18n/config.ts` en `main.tsx` laadt
  dat de app **volledig opnieuw**. Het is het enige herlaadmoment van dit deel; beide
  JSON-bestanden gaan daarom in één stap. In een browser zonder Tauri is het project na die
  herlaadbeurt leeg.
- Task 10 wijzigt `SettingsDialog.tsx`. Dat bestand exporteert ook niet-componenten
  (`UNITS_DEFAULTS`, `applyTheme`), dus de update loopt via `App.tsx`. In het ergste geval
  herlaadt de pagina.

De JSON-bestanden en `SettingsDialog.tsx` hebben in de werkmap CRLF-regeleinden (in de index
LF). De Edit-tool houdt dat zoals het is; schrijf ze niet in hun geheel opnieuw.

**Beslissingen in dit deel (niet in het contract)**

- `onChange` van `BureauTab` heeft het type `Dispatch<SetStateAction<BureauProfiel>>` (de
  setter van `useState`), niet `(next) => void` zoals `UnitsTabContent`. Het inlezen van een
  afbeelding is asynchroon. Elke wijziging gaat daarom als bijwerkfunctie
  `onChange((p) => …)`, zodat wat je intussen typt niet verloren gaat.
- 500 kB = `500 * 1024` bytes (`MAX_AFBEELDING`, module-intern). De foutmelding toont
  `Math.ceil(size / 1024)` kB. Een bestand dat geen `image/*` is, wordt geweigerd.
- Een hexcode gaat pas bij zes cijfers naar het concept. Drie cijfers (`#abc` → `#aabbcc`)
  en herstel van een ongeldige invoer gebeuren bij het verlaten van het veld.
- Bij Opslaan vallen constructeursregels weg waarin naam, telefoon en e-mail alle drie leeg
  zijn.
- "Standaardwaarden herstellen" laat het bureauprofiel staan. De bevestigingstekst zegt dat
  ook, en de tab heeft een eigen knop **Standaard huisstijl**.
- Het venster wordt 680 × 560 px, met `max-width: calc(100vw - 16px)`, zodat het in het
  smalle Browser-paneel (~626 px) meekrimpt. De veldkolom is `min(300px, 58%)`.
- `scripts/check-bureau-i18n.mjs` (nieuw, `check-alles.mjs` pakt het automatisch op) eist dat
  elke sleutel die `SettingsDialog.tsx` en `BureauTab.tsx` gebruiken in nl én en bestaat.
- Er komt geen `initialTab`-prop: het rapportpaneel kan het venster niet direct op de tab
  Bureau openen. Wie dat wil, voegt de prop in `SettingsDialog` en een opener in `App` toe.

---

### Task 8: Component `BureauTab` en opmaak van de tab

**Files:**
- Create: `packages/desktop/src/components/rapport/BureauTab.tsx`
- Modify: `packages/desktop/src/components/settings/SettingsDialog.css` (L316–319: blok toevoegen direct na `.settings-placeholder p`, aan het eind van het bestand)

**Interfaces:**
- Consumes:
  - uit `packages/desktop/src/rapport/model.ts`: `type BureauProfiel`, `type Constructeur`, `type Huisstijl`, `const STANDAARD_HUISSTIJL: Huisstijl`
  - `useTranslation("settings")` uit `react-i18next`
  - bestaande klassen uit `SettingsDialog.css`: `.settings-section` (+ `h3`), `.settings-row`, `.settings-label`, `.settings-input`, `.settings-description`, `.settings-btn`, `.settings-btn-secondary`
  - thema-variabelen: `--theme-dialog-input-border`, `--theme-dialog-input-bg`, `--theme-dialog-content-secondary`, `--theme-danger-color`, `--theme-btn-secondary-bg`, `--font-mono`
- Produces:
  - `packages/desktop/src/components/rapport/BureauTab.tsx`:
    `export default function BureauTab(props: { profiel: BureauProfiel; onChange: Dispatch<SetStateAction<BureauProfiel>> }): JSX.Element`.
    De enige export, zodat Fast Refresh werkt. Module-intern: `MAX_AFBEELDING = 500 * 1024`,
    `KLEUREN`, `hexKleur(s: string): string | null`,
    `leesAlsDataUrl(bestand: File): Promise<string>`, en de componenten `Tekstveld`,
    `KleurVeld` en `AfbeeldingVeld`.
  - Gebruikte i18n-sleutels (namespace `settings`, worden in Task 9 toegevoegd):
    `bureau.intro`, `alleenSessie`, `gegevens`, `naam`, `naamHint`, `adres`,
    `postcodePlaats`, `postcode`, `plaats`, `telefoon`, `email`, `afbeeldingen`, `logo`,
    `logoHint`, `voetafbeelding`, `voetHint`, `kiezen`, `verwijderen`, `geenAfbeelding`,
    `geenBeeld`, `teGroot`, `leesFout`, `huisstijl`, `hoofdkleur`, `accentkleur`,
    `tabeltekst`, `invoerkleur`, `lettertype`, `lettertypeHint`, `standaardHuisstijl`,
    `proefTitel`, `proefParagraaf`, `proefLabel`, `proefTabel`, `proefInvoer`,
    `constructeurs`, `constructeurNaam`, `naamVoorbeeld`, `emailVoorbeeld`,
    `constructeurToevoegen`, `constructeurVerwijderen` en `geenConstructeurs`. Alle staan
    onder `bureau.`; het zijn er 42.
  - CSS-klassen in `SettingsDialog.css`:
    - containers: `.bureau-tab` (zet `--bureau-veld`), `.bureau-intro`, `.bureau-sessie`,
      `.bureau-hint`, `.bureau-duo`
    - velden: `.bureau-invoer`, `.bureau-postcode`, `.bureau-plaats`
    - afbeeldingen: `.bureau-afbeelding`, `.bureau-afbeelding-rechts`, `.bureau-beeldvak`,
      `.bureau-beeldvak-breed`, `.bureau-beeldvak-leeg`
    - knoppen en melding: `.bureau-knoppen`, `.bureau-knop`, `.bureau-fout`
    - kleuren en proef: `.bureau-kleur`, `.bureau-hex`, `.bureau-proef`,
      `.bureau-proef-titel`, `.bureau-proef-paragraaf`, `.bureau-proef-rij`,
      `.bureau-rechts`
    - constructeurs: `.bureau-constructeurs`, `.bureau-kolomkop`, `.bureau-verwijder`,
      `.bureau-leeg`
    - plus één regel op de bestaande klasse `.settings-dialog`
      (`max-width: calc(100vw - 16px)`)

- [ ] **Step 1: Controleer de uitgangssituatie (typecontrole)**

```bash
npx tsc --noEmit -p packages/desktop
```

Verwacht: geen uitvoer, exitcode 0. Faalt dit al op `rapport/model.ts`, voer dan eerst
Task 1 uit (zie de tabel met afhankelijkheden).

- [ ] **Step 2: Maak `packages/desktop/src/components/rapport/BureauTab.tsx`**

Maak de map `packages/desktop/src/components/rapport/` aan als die nog niet bestaat, en
schrijf dit bestand:

```tsx
import { Fragment, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import {
  STANDAARD_HUISSTIJL,
  type BureauProfiel,
  type Constructeur,
  type Huisstijl,
} from "../../rapport/model";
import "../settings/SettingsDialog.css";

/**
 * De tab "Bureau" in de instellingen: het bureauprofiel dat op het voorblad en
 * in de voet van elk rapport komt (gegevens, logo, voetafbeelding, huisstijl en
 * de constructeurs waaruit het rapport de verantwoordelijke en de uitvoerende
 * kiest).
 *
 * Net als de andere tabs werkt deze tab op een concept uit SettingsDialog: pas
 * Opslaan zet het profiel in store/bureauProfiel.ts, Annuleren gooit het weg.
 * Elke wijziging gaat als bijwerkfunctie naar `onChange((p) => …)` in plaats
 * van als nieuw object. Het inlezen van een afbeelding is asynchroon; met een
 * bijwerkfunctie gaat wat de gebruiker intussen typt niet verloren.
 */

/**
 * Hooguit 500 kB per afbeelding. Het profiel staat als JSON in de instellingen
 * en gaat, eenmaal vastgelegd in een rapport, als kopie mee in het
 * projectbestand; grote foto's horen daar niet in.
 */
const MAX_AFBEELDING = 500 * 1024;

/** De vier kleuren van de huisstijl, in de volgorde van het formulier. */
const KLEUREN: readonly { veld: Exclude<keyof Huisstijl, "lettertype">; sleutel: string }[] = [
  { veld: "hoofdkleur", sleutel: "bureau.hoofdkleur" },
  { veld: "accentkleur", sleutel: "bureau.accentkleur" },
  { veld: "tabeltekst", sleutel: "bureau.tabeltekst" },
  { veld: "invoerkleur", sleutel: "bureau.invoerkleur" },
];

/** "#1F3A5F", "1f3a5f" of "#abc" → "#1f3a5f" / "#aabbcc"; al het andere → null. */
function hexKleur(s: string): string | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return `#${h.toLowerCase()}`;
}

/** Leest een bestand als data-URL (base64), zoals het in het profiel komt te staan. */
function leesAlsDataUrl(bestand: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lezer = new FileReader();
    lezer.onload = () => resolve(String(lezer.result));
    lezer.onerror = () => reject(lezer.error ?? new Error("lezen mislukt"));
    lezer.readAsDataURL(bestand);
  });
}

export default function BureauTab({
  profiel,
  onChange,
}: {
  profiel: BureauProfiel;
  onChange: Dispatch<SetStateAction<BureauProfiel>>;
}) {
  const { t } = useTranslation("settings");
  // De zojuist toegevoegde constructeursrij krijgt de focus (autoFocus werkt
  // alleen bij het mounten, dus bestaande rijen springen niet).
  const [nieuweRij, setNieuweRij] = useState<number | null>(null);
  // Buiten de desktop-app (Browser-paneel, headless Chrome) is er geen
  // instellingenbestand: het profiel leeft dan alleen in het geheugen.
  const inTauri = "__TAURI_INTERNALS__" in window;

  const patch = (deel: Partial<BureauProfiel>) => onChange((p) => ({ ...p, ...deel }));
  const zetHuisstijl = <K extends keyof Huisstijl>(veld: K, waarde: Huisstijl[K]) =>
    onChange((p) => ({ ...p, huisstijl: { ...p.huisstijl, [veld]: waarde } }));
  const zetConstructeur = (i: number, deel: Partial<Constructeur>) =>
    onChange((p) => ({
      ...p,
      constructeurs: p.constructeurs.map((c, j) => (j === i ? { ...c, ...deel } : c)),
    }));
  const voegConstructeurToe = () => {
    setNieuweRij(profiel.constructeurs.length);
    onChange((p) => ({ ...p, constructeurs: [...p.constructeurs, { naam: "", telefoon: "", email: "" }] }));
  };
  const verwijderConstructeur = (i: number) => {
    setNieuweRij(null);
    onChange((p) => ({ ...p, constructeurs: p.constructeurs.filter((_, j) => j !== i) }));
  };

  const h = profiel.huisstijl;

  return (
    <div className="bureau-tab">
      <p className="settings-description bureau-intro">{t("bureau.intro")}</p>
      {!inTauri && <p className="settings-description bureau-sessie">{t("bureau.alleenSessie")}</p>}

      <div className="settings-section">
        <h3>{t("bureau.gegevens")}</h3>
        <Tekstveld label={t("bureau.naam")} waarde={profiel.naam} onWaarde={(v) => patch({ naam: v })} />
        <p className="settings-description bureau-hint">{t("bureau.naamHint")}</p>
        <Tekstveld label={t("bureau.adres")} waarde={profiel.adres} onWaarde={(v) => patch({ adres: v })} />
        <div className="settings-row">
          <span className="settings-label">{t("bureau.postcodePlaats")}</span>
          <div className="bureau-duo">
            <input
              className="settings-input bureau-postcode"
              value={profiel.postcode}
              aria-label={t("bureau.postcode")}
              spellCheck={false}
              onChange={(e) => patch({ postcode: e.target.value })}
            />
            <input
              className="settings-input bureau-plaats"
              value={profiel.plaats}
              aria-label={t("bureau.plaats")}
              spellCheck={false}
              onChange={(e) => patch({ plaats: e.target.value })}
            />
          </div>
        </div>
        <Tekstveld label={t("bureau.telefoon")} type="tel" waarde={profiel.telefoon} onWaarde={(v) => patch({ telefoon: v })} />
        <Tekstveld label={t("bureau.email")} type="email" waarde={profiel.email} onWaarde={(v) => patch({ email: v })} />
      </div>

      <div className="settings-section">
        <h3>{t("bureau.afbeeldingen")}</h3>
        <AfbeeldingVeld
          label={t("bureau.logo")}
          hint={t("bureau.logoHint")}
          waarde={profiel.logo}
          onWaarde={(v) => patch({ logo: v })}
        />
        <AfbeeldingVeld
          label={t("bureau.voetafbeelding")}
          hint={t("bureau.voetHint")}
          waarde={profiel.voetafbeelding}
          breed
          onWaarde={(v) => patch({ voetafbeelding: v })}
        />
      </div>

      <div className="settings-section">
        <h3>{t("bureau.huisstijl")}</h3>
        {KLEUREN.map(({ veld, sleutel }) => (
          <KleurVeld key={veld} label={t(sleutel)} waarde={h[veld]} onWaarde={(k) => zetHuisstijl(veld, k)} />
        ))}
        <Tekstveld label={t("bureau.lettertype")} waarde={h.lettertype} onWaarde={(v) => zetHuisstijl("lettertype", v)} />
        <p className="settings-description bureau-hint">{t("bureau.lettertypeHint")}</p>
        {/* Proefregel met de kleuren en het lettertype zoals het rapport ze gebruikt. */}
        <div className="bureau-proef" style={{ fontFamily: h.lettertype || STANDAARD_HUISSTIJL.lettertype }}>
          <div className="bureau-proef-titel" style={{ color: h.hoofdkleur }}>{t("bureau.proefTitel")}</div>
          <div className="bureau-proef-paragraaf" style={{ color: h.accentkleur }}>{t("bureau.proefParagraaf")}</div>
          <div className="bureau-proef-rij">
            <b style={{ color: h.accentkleur }}>{t("bureau.proefLabel")}</b>
            <span style={{ color: h.tabeltekst }}>{t("bureau.proefTabel")}</span>
            <span style={{ color: h.invoerkleur }}>{t("bureau.proefInvoer")}</span>
          </div>
        </div>
        <div className="bureau-rechts">
          <button
            type="button"
            className="settings-btn settings-btn-secondary bureau-knop"
            onClick={() => onChange((p) => ({ ...p, huisstijl: { ...STANDAARD_HUISSTIJL } }))}
          >
            {t("bureau.standaardHuisstijl")}
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3>{t("bureau.constructeurs")}</h3>
        {profiel.constructeurs.length === 0 ? (
          <p className="settings-description bureau-leeg">{t("bureau.geenConstructeurs")}</p>
        ) : (
          <div className="bureau-constructeurs">
            <span className="bureau-kolomkop">{t("bureau.constructeurNaam")}</span>
            <span className="bureau-kolomkop">{t("bureau.telefoon")}</span>
            <span className="bureau-kolomkop">{t("bureau.email")}</span>
            <span />
            {profiel.constructeurs.map((c, i) => (
              <Fragment key={i}>
                <input
                  className="settings-input"
                  value={c.naam}
                  placeholder={t("bureau.naamVoorbeeld")}
                  aria-label={t("bureau.constructeurNaam")}
                  spellCheck={false}
                  autoFocus={i === nieuweRij}
                  onChange={(e) => zetConstructeur(i, { naam: e.target.value })}
                />
                <input
                  className="settings-input"
                  type="tel"
                  value={c.telefoon}
                  aria-label={t("bureau.telefoon")}
                  spellCheck={false}
                  onChange={(e) => zetConstructeur(i, { telefoon: e.target.value })}
                />
                <input
                  className="settings-input"
                  type="email"
                  value={c.email}
                  placeholder={t("bureau.emailVoorbeeld")}
                  aria-label={t("bureau.email")}
                  spellCheck={false}
                  onChange={(e) => zetConstructeur(i, { email: e.target.value })}
                />
                <button
                  type="button"
                  className="bureau-verwijder"
                  title={t("bureau.constructeurVerwijderen")}
                  aria-label={t("bureau.constructeurVerwijderen")}
                  onClick={() => verwijderConstructeur(i)}
                >
                  ×
                </button>
              </Fragment>
            ))}
          </div>
        )}
        <button type="button" className="settings-btn settings-btn-secondary bureau-knop" onClick={voegConstructeurToe}>
          {t("bureau.constructeurToevoegen")}
        </button>
      </div>
    </div>
  );
}

/** Label links, breed tekstveld rechts; een klik op het label zet de cursor in het veld. */
function Tekstveld({
  label,
  waarde,
  onWaarde,
  type = "text",
}: {
  label: string;
  waarde: string;
  onWaarde: (waarde: string) => void;
  type?: "text" | "tel" | "email";
}) {
  return (
    <label className="settings-row">
      <span className="settings-label">{label}</span>
      <input
        className="settings-input bureau-invoer"
        type={type}
        value={waarde}
        spellCheck={false}
        onChange={(e) => onWaarde(e.target.value)}
      />
    </label>
  );
}

/**
 * Kleurkiezer plus hexcode. Wat er getypt wordt staat eerst alleen hier; pas
 * een volledige code gaat naar het profiel. Zo springt de kleurkiezer niet op
 * zwart halverwege het typen, en wordt "#abc" niet al "#aabbcc" terwijl je
 * "#abcdef" aan het typen bent.
 */
function KleurVeld({
  label,
  waarde,
  onWaarde,
}: {
  label: string;
  waarde: string;
  onWaarde: (kleur: string) => void;
}) {
  const [tekst, setTekst] = useState(waarde);
  useEffect(() => setTekst(waarde), [waarde]);

  return (
    <div className="settings-row">
      <span className="settings-label">{label}</span>
      <div className="bureau-kleur">
        <input
          type="color"
          value={hexKleur(waarde) ?? "#000000"}
          aria-label={label}
          onChange={(e) => onWaarde(e.target.value)}
        />
        <input
          className="settings-input bureau-hex"
          value={tekst}
          aria-label={label}
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value;
            setTekst(v);
            // Zes cijfers: meteen overnemen. Drie cijfers pas bij het verlaten.
            if (/^#?[0-9a-f]{6}$/i.test(v.trim())) onWaarde(hexKleur(v) ?? waarde);
          }}
          onBlur={() => {
            const k = hexKleur(tekst);
            if (k) {
              onWaarde(k);
              setTekst(k);
            } else {
              // Geen geldige kleur: terug naar wat er in het profiel staat.
              setTekst(waarde);
            }
          }}
        />
      </div>
    </div>
  );
}

/**
 * Afbeelding als data-URL: voorbeeld, "Kiezen…" en "Verwijderen". De grootte
 * wordt gecontroleerd vóór het inlezen, zodat een te groot bestand niet eerst
 * helemaal in het geheugen komt.
 */
function AfbeeldingVeld({
  label,
  hint,
  waarde,
  breed = false,
  onWaarde,
}: {
  label: string;
  hint: string;
  waarde: string;
  /** Voetafbeelding: breed en laag, in de verhouding van de paginavoet. */
  breed?: boolean;
  onWaarde: (dataUrl: string) => void;
}) {
  const { t } = useTranslation("settings");
  const invoer = useRef<HTMLInputElement>(null);
  const [fout, setFout] = useState<string | null>(null);

  const lees = async (lijst: FileList | null) => {
    // Het bestand meteen pakken: de aanroeper leegt het invoerveld direct na
    // deze (synchrone) eerste stap, zodat hetzelfde bestand opnieuw kan.
    const bestand = lijst?.[0];
    if (!bestand) return;
    if (!bestand.type.startsWith("image/")) {
      setFout(t("bureau.geenBeeld", { naam: bestand.name }));
      return;
    }
    if (bestand.size > MAX_AFBEELDING) {
      setFout(t("bureau.teGroot", { naam: bestand.name, grootte: Math.ceil(bestand.size / 1024) }));
      return;
    }
    try {
      onWaarde(await leesAlsDataUrl(bestand));
      setFout(null);
    } catch {
      setFout(t("bureau.leesFout", { naam: bestand.name }));
    }
  };

  return (
    <div className="bureau-afbeelding">
      <span className="settings-label">{label}</span>
      <div className="bureau-afbeelding-rechts">
        <div className={`bureau-beeldvak${breed ? " bureau-beeldvak-breed" : ""}`}>
          {waarde ? (
            <img src={waarde} alt={label} />
          ) : (
            <span className="bureau-beeldvak-leeg">{t("bureau.geenAfbeelding")}</span>
          )}
        </div>
        <div className="bureau-knoppen">
          <button
            type="button"
            className="settings-btn settings-btn-secondary bureau-knop"
            onClick={() => invoer.current?.click()}
          >
            {t("bureau.kiezen")}
          </button>
          <button
            type="button"
            className="settings-btn settings-btn-secondary bureau-knop"
            disabled={!waarde}
            onClick={() => {
              onWaarde("");
              setFout(null);
            }}
          >
            {t("bureau.verwijderen")}
          </button>
        </div>
        {fout && (
          <p className="bureau-fout" role="alert">
            {fout}
          </p>
        )}
        <p className="settings-description">{hint}</p>
      </div>
      <input
        ref={invoer}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/gif,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          void lees(e.target.files);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Voeg de opmaak toe aan `packages/desktop/src/components/settings/SettingsDialog.css`**

Vervang het laatste blok van het bestand (L316–319):

```css
.settings-placeholder p {
  font-size: 11px;
  margin: 0;
}
```

door hetzelfde blok met de opmaak van de tab erachter:

```css
.settings-placeholder p {
  font-size: 11px;
  margin: 0;
}

/* ─── Tab Bureau (components/rapport/BureauTab.tsx) ─────────
   Het bureauprofiel is een langer formulier dan de andere tabs:
   brede tekstvelden, afbeeldingen met voorbeeld, kleurvelden en
   een bewerkbare lijst constructeurs. Alle velden rechts zijn even
   breed (--bureau-veld), zodat de kolom recht blijft; in een smal
   venster krimpt die kolom mee.
   ─────────────────────────────────────────────────────────── */

/* Het venster is 680 px breed voor deze tab; in een smal venster
   (het Browser-paneel) krimpt het mee in plaats van buiten beeld te vallen. */
.settings-dialog {
  max-width: calc(100vw - 16px);
}

.bureau-tab {
  --bureau-veld: min(300px, 58%);
}

.bureau-intro {
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.bureau-sessie {
  margin: -6px 0 12px 0;
  color: var(--theme-danger-color);
}

.settings-input.bureau-invoer {
  width: var(--bureau-veld);
}

/* Toelichting onder een veld, uitgelijnd met de veldkolom */
.bureau-hint {
  width: var(--bureau-veld);
  margin: -4px 0 8px auto;
  line-height: 1.4;
}

/* Postcode en plaats op één regel */
.bureau-duo {
  display: flex;
  gap: 6px;
  width: var(--bureau-veld);
}

.settings-input.bureau-postcode {
  width: 80px;
  flex-shrink: 0;
}

.settings-input.bureau-plaats {
  flex: 1;
  min-width: 0;
  width: auto;
}

/* Afbeeldingen: label links, voorbeeld + knoppen rechts */
.bureau-afbeelding {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.bureau-afbeelding .settings-label {
  padding-top: 4px;
}

.bureau-afbeelding-rechts {
  width: var(--bureau-veld);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bureau-beeldvak {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--theme-dialog-input-border);
  /* Wit in elk thema: de afbeelding komt op papier. */
  background: #ffffff;
  overflow: hidden;
}

/* De voet beslaat 210 × 19,8 mm; het voorbeeld houdt die verhouding aan. */
.bureau-beeldvak-breed {
  height: auto;
  aspect-ratio: 210 / 19.8;
}

.bureau-beeldvak img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.bureau-beeldvak-leeg {
  font-size: 11px;
  color: #9ca3af;
}

.bureau-knoppen {
  display: flex;
  gap: 6px;
}

/* Kleinere knop dan de voetknoppen van het venster */
.settings-btn.bureau-knop {
  padding: 3px 10px;
  min-width: 0;
}

.settings-btn.bureau-knop:disabled {
  opacity: 0.5;
}

.settings-btn.bureau-knop:disabled:hover {
  background: var(--theme-btn-secondary-bg);
  border-color: var(--theme-dialog-input-border);
}

.bureau-fout {
  font-size: 11px;
  color: var(--theme-danger-color);
}

/* Kleur: kiezer plus hexcode */
.bureau-kleur {
  display: flex;
  align-items: center;
  gap: 6px;
  width: var(--bureau-veld);
}

.bureau-kleur input[type="color"] {
  width: 32px;
  height: 22px;
  padding: 0 2px;
  border: 1px solid var(--theme-dialog-input-border);
  background: var(--theme-dialog-input-bg);
  cursor: default;
}

.settings-input.bureau-hex {
  width: 80px;
  font-family: var(--font-mono, monospace);
}

/* Proef van de huisstijl: wit en zwart zoals op papier, los van het thema */
.bureau-proef {
  width: var(--bureau-veld);
  margin: 0 0 8px auto;
  padding: 6px 10px;
  border: 1px solid var(--theme-dialog-input-border);
  background: #ffffff;
  color: #000000;
  font-size: 11px;
  line-height: 1.6;
  user-select: none;
}

.bureau-proef-titel {
  font-size: 16px;
  font-weight: 700;
}

.bureau-proef-paragraaf {
  font-size: 12px;
  font-weight: 700;
}

.bureau-proef-rij {
  display: flex;
  gap: 16px;
  border-bottom: 1px solid #000000;
}

.bureau-rechts {
  display: flex;
  justify-content: flex-end;
}

/* Constructeurs: naam, telefoon, e-mail en een verwijderknop per rij */
.bureau-constructeurs {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1.4fr) 22px;
  gap: 4px 6px;
  align-items: center;
  margin-bottom: 8px;
}

.bureau-constructeurs .settings-input {
  width: 100%;
}

.bureau-kolomkop {
  font-size: 10px;
  color: var(--theme-dialog-content-secondary);
}

.bureau-verwijder {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 2px;
  background: transparent;
  color: var(--theme-dialog-content-secondary);
  font-size: 14px;
  line-height: 1;
  cursor: default;
}

.bureau-verwijder:hover {
  color: var(--theme-danger-color);
  border-color: var(--theme-dialog-input-border);
}

.bureau-leeg {
  margin: 0 0 8px 0;
}
```

(`App.css` zet `* { box-sizing: border-box; margin: 0 }`, daarom staan die niet in de nieuwe
regels. `--bureau-veld` staat op `.bureau-tab` en niet op `.settings-content`, omdat
`ModuleKiezer` `.settings-content` hergebruikt.)

- [ ] **Step 4: Typecontrole**

```bash
npx tsc --noEmit -p packages/desktop
```

Verwacht: geen uitvoer, exitcode 0.

- [ ] **Step 5: Controle in de app (niets zichtbaars)**

Open http://localhost:3021 in het Browser-paneel (de pagina hoeft niet te herladen: alleen
de CSS wordt via HMR ververst). Klik rechtsboven in de titelbalk op het tandwiel
**Voorkeuren**. Het venster ziet er precies zo uit als voorheen: 560 px breed, met de tabs
Algemeen, Uiterlijk, Eenheden en Over. Sluit het met **Annuleren**. In de console
(`read_console_messages`, alleen fouten) staat geen nieuwe fout.

- [ ] **Step 6: Commit**

```bash
git add packages/desktop/src/components/rapport/BureauTab.tsx packages/desktop/src/components/settings/SettingsDialog.css
git commit -m "$(cat <<'EOF'
feat(instellingen): component en opmaak voor de tab Bureau

BureauTab bewerkt een concept van het bureauprofiel: bureaugegevens,
logo en voetafbeelding als data-URL (hooguit 500 kB, met voorbeeld),
de huisstijl met kleurkiezer, hexcode en proefregel, en een lijst
constructeurs. Wijzigingen gaan als bijwerkfunctie naar de setter, zodat
een asynchroon ingelezen afbeelding geen getypte tekst overschrijft.
De tab wordt nog nergens getoond.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Vertalingen voor de tab Bureau (nl en en)

**Files:**
- Create: `scripts/check-bureau-i18n.mjs`
- Modify: `packages/desktop/src/i18n/locales/nl/settings.json` (L2–3, L6–7, L73–74)
- Modify: `packages/desktop/src/i18n/locales/en/settings.json` (L4, L8–9, L75–76)

**Interfaces:**
- Consumes:
  - de 42 `bureau.*`-sleutels uit Task 8
  - in `SettingsDialog.tsx`: `t("resetToDefaults")` en `t("resetConfirm")` (L147, L194,
    L202, L207), en `t(\`tabs.${id}\`)` voor elke id in `TAB_IDS` (L25)
- Produces:
  - `scripts/check-bureau-i18n.mjs`. `scripts/check-alles.mjs` draait het automatisch mee
    (elk `check-*.mjs`). Het leest `SettingsDialog.tsx` en `BureauTab.tsx` en eist elke
    gebruikte sleutel in nl én en. Dat zijn `t("…")`-aanroepen met een vaste sleutel,
    `tabs.<id>` voor elke id in `TAB_IDS`, en elke tekst `"bureau.…"` in `BureauTab.tsx`.
    Daarnaast moet de sectie `bureau` in beide talen dezelfde sleutels hebben. Bij een fout
    is de exitcode 1.
  - `settings.json` (nl en en):
    - `tabs.bureau`: "Bureau" / "Office"
    - de sectie `bureau` met de 42 sleutels
    - in nl nieuw: `resetToDefaults` ("Standaardwaarden herstellen") en `resetConfirm`
    - in en: `resetConfirm` aangevuld met "The office profile is kept."

- [ ] **Step 1: Schrijf de falende controle `scripts/check-bureau-i18n.mjs`**

```js
/**
 * Bewaakt de vertalingen van het instellingenvenster.
 *
 * SettingsDialog.tsx en components/rapport/BureauTab.tsx halen hun teksten uit
 * locales/{nl,en}/settings.json. Ontbreekt een sleutel in het Nederlands, dan
 * toont i18next stil de Engelse tekst (fallbackLng "en"); ontbreekt hij in
 * allebei, dan staat de sleutel zelf in beeld. Deze controle eist dat elke
 * gebruikte sleutel in beide talen bestaat, en dat de sectie "bureau" in beide
 * talen dezelfde sleutels heeft.
 *
 * Draaien:  node scripts/check-bureau-i18n.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const hier = dirname(fileURLToPath(import.meta.url));
const SRC = join(hier, "../packages/desktop/src");
const lees = (pad) => readFileSync(join(SRC, pad), "utf8");

/** Alle sleutels van een JSON-object als "a.b.c". */
const sleutels = (o, voor = "") =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? sleutels(v, `${voor}${k}.`) : [`${voor}${k}`]));
const talen = {
  nl: new Set(sleutels(JSON.parse(lees("i18n/locales/nl/settings.json")))),
  en: new Set(sleutels(JSON.parse(lees("i18n/locales/en/settings.json")))),
};

const dialoog = lees("components/settings/SettingsDialog.tsx");
const bureau = lees("components/rapport/BureauTab.tsx");

// Gebruikt: t("…") met een vaste sleutel in beide bestanden, de tabs uit
// TAB_IDS (t(`tabs.${id}`)), en in BureauTab elke tekst "bureau.…" (ook de
// sleutels in de kleurenlijst, die pas later aan t() worden gegeven). TAB_IDS
// alleen aan het begin van een regel: het commentaar erboven heeft een
// voorbeeld met dezelfde naam.
const gebruikt = new Set();
for (const bron of [dialoog, bureau]) for (const m of bron.matchAll(/\bt\("([\w.]+)"/g)) gebruikt.add(m[1]);
const tabs = dialoog.match(/^const TAB_IDS = \[([^\]]*)\]/m);
if (!tabs) throw new Error("TAB_IDS niet gevonden in SettingsDialog.tsx");
for (const m of tabs[1].matchAll(/"(\w+)"/g)) gebruikt.add(`tabs.${m[1]}`);
for (const m of bureau.matchAll(/"(bureau\.\w+)"/g)) gebruikt.add(m[1]);

let fouten = 0;
for (const sleutel of [...gebruikt].sort()) {
  const mist = Object.keys(talen).filter((taal) => !talen[taal].has(sleutel));
  if (mist.length) {
    fouten++;
    console.log(`  FOUT   ${sleutel} ontbreekt in ${mist.join(" en ")}`);
  }
}
console.log(`  ${fouten ? "FOUT  " : "OK    "} ${gebruikt.size} gebruikte sleutels, elk in nl en en`);

// De sectie bureau in beide talen gelijk: een sleutel die maar in één taal
// staat, is een vergeten vertaling of een overblijfsel.
let scheef = 0;
for (const [taal, ander] of [["nl", "en"], ["en", "nl"]]) {
  for (const k of talen[taal]) {
    if (k.startsWith("bureau.") && !talen[ander].has(k)) {
      scheef++;
      console.log(`  FOUT   ${k} staat wel in ${taal}, niet in ${ander}`);
    }
  }
}
console.log(`  ${scheef ? "FOUT  " : "OK    "} sectie bureau gelijk in nl en en`);

process.exit(fouten + scheef ? 1 : 0);
```

- [ ] **Step 2: Draai de controle en zie hem falen**

```bash
node scripts/check-bureau-i18n.mjs; echo "exit $?"
```

Verwacht: 44 regels `FOUT`. Dat zijn de 42 sleutels `bureau.…` ("ontbreekt in nl en en")
plus `resetConfirm ontbreekt in nl` en `resetToDefaults ontbreekt in nl`. Daarna volgen
`FOUT   67 gebruikte sleutels, elk in nl en en`,
`OK     sectie bureau gelijk in nl en en` en `exit 1`.

- [ ] **Step 3: Vul `packages/desktop/src/i18n/locales/nl/settings.json` aan**

Dit wijzigt de i18n-JSON: de app laadt volledig opnieuw. Doe stap 3 en 4 direct na elkaar.

L2–3, oud:

```json
  "title": "Instellingen",
  "tabs": {
```

nieuw:

```json
  "title": "Instellingen",
  "resetToDefaults": "Standaardwaarden herstellen",
  "resetConfirm": "Weet je zeker dat je alle instellingen wilt terugzetten naar de standaardwaarden? Het bureauprofiel blijft staan.",
  "tabs": {
```

L6–7, oud:

```json
    "units": "Eenheden",
    "editor": "Editor",
```

nieuw:

```json
    "units": "Eenheden",
    "bureau": "Bureau",
    "editor": "Editor",
```

L73–74, oud:

```json
  "about": {
    "appName": "Open Template",
```

nieuw:

```json
  "bureau": {
    "intro": "Deze gegevens en de huisstijl komen op het voorblad en in de voet van elk rapport. Een rapport gebruikt dit profiel tot je het in het rapport vastlegt met Bijwerken uit bureauprofiel; daarna veranderen wijzigingen hier dat rapport niet meer.",
    "alleenSessie": "Buiten de desktop-app wordt het profiel niet bewaard: het blijft staan tot de app opnieuw laadt.",
    "gegevens": "Bureaugegevens",
    "naam": "Naam",
    "naamHint": "Staat op het voorblad als adviseur, en in de voet als er geen voetafbeelding is.",
    "adres": "Adres",
    "postcodePlaats": "Postcode en plaats",
    "postcode": "Postcode",
    "plaats": "Plaats",
    "telefoon": "Telefoon",
    "email": "E-mail",
    "afbeeldingen": "Afbeeldingen",
    "logo": "Logo",
    "logoHint": "PNG, JPG of SVG, hooguit 500 kB.",
    "voetafbeelding": "Voetafbeelding",
    "voetHint": "Over de volle paginabreedte onderaan elke pagina (210 × 20 mm), hooguit 500 kB. Zonder voetafbeelding staat er een dunne lijn met de bureaunaam.",
    "kiezen": "Kiezen…",
    "verwijderen": "Verwijderen",
    "geenAfbeelding": "Geen afbeelding",
    "geenBeeld": "{{naam}} is geen afbeelding.",
    "teGroot": "{{naam}} is {{grootte}} kB; een afbeelding mag hooguit 500 kB zijn.",
    "leesFout": "{{naam}} kon niet worden gelezen.",
    "huisstijl": "Huisstijl",
    "hoofdkleur": "Hoofdkleur (hoofdstuktitels)",
    "accentkleur": "Accentkleur (paragrafen, labels)",
    "tabeltekst": "Tabeltekst",
    "invoerkleur": "Invoerwaarden",
    "lettertype": "Lettertype",
    "lettertypeHint": "Een CSS-lettertypelijst: het eerste lettertype dat op de computer staat, wordt gebruikt.",
    "standaardHuisstijl": "Standaard huisstijl",
    "proefTitel": "1 Inleiding",
    "proefParagraaf": "2.1 Projectomschrijving",
    "proefLabel": "Gevolgklasse",
    "proefTabel": "tabeltekst",
    "proefInvoer": "CC2",
    "constructeurs": "Constructeurs",
    "constructeurNaam": "Titel en naam",
    "naamVoorbeeld": "Ir. A. Voorbeeld",
    "emailVoorbeeld": "naam@example.com",
    "constructeurToevoegen": "Constructeur toevoegen",
    "constructeurVerwijderen": "Constructeur verwijderen",
    "geenConstructeurs": "Nog geen constructeurs. In het rapport kies je hieruit de verantwoordelijke en de uitvoerende constructeur."
  },
  "about": {
    "appName": "Open Template",
```

- [ ] **Step 4: Vul `packages/desktop/src/i18n/locales/en/settings.json` aan**

L4, oud:

```json
  "resetConfirm": "Are you sure you want to reset all settings to their default values?",
```

nieuw:

```json
  "resetConfirm": "Are you sure you want to reset all settings to their default values? The office profile is kept.",
```

L8–9, oud:

```json
    "units": "Units",
    "editor": "Editor",
```

nieuw:

```json
    "units": "Units",
    "bureau": "Office",
    "editor": "Editor",
```

L75–76, oud:

```json
  "about": {
    "appName": "Open Template",
```

nieuw:

```json
  "bureau": {
    "intro": "These details and the house style appear on the cover page and in the footer of every report. A report uses this profile until you store it in the report with Bijwerken uit bureauprofiel (update from office profile); after that, changes here no longer affect that report.",
    "alleenSessie": "Outside the desktop app the profile is not saved: it is kept until the app reloads.",
    "gegevens": "Office details",
    "naam": "Name",
    "naamHint": "Shown on the cover page as the consultant, and in the footer when there is no footer image.",
    "adres": "Address",
    "postcodePlaats": "Postcode and town",
    "postcode": "Postcode",
    "plaats": "Town",
    "telefoon": "Phone",
    "email": "Email",
    "afbeeldingen": "Images",
    "logo": "Logo",
    "logoHint": "PNG, JPG or SVG, at most 500 kB.",
    "voetafbeelding": "Footer image",
    "voetHint": "Full page width at the bottom of every page (210 × 20 mm), at most 500 kB. Without a footer image a thin line with the office name is shown.",
    "kiezen": "Choose…",
    "verwijderen": "Remove",
    "geenAfbeelding": "No image",
    "geenBeeld": "{{naam}} is not an image.",
    "teGroot": "{{naam}} is {{grootte}} kB; an image may be at most 500 kB.",
    "leesFout": "{{naam}} could not be read.",
    "huisstijl": "House style",
    "hoofdkleur": "Main colour (chapter titles)",
    "accentkleur": "Accent colour (sections, labels)",
    "tabeltekst": "Table text",
    "invoerkleur": "Input values",
    "lettertype": "Font",
    "lettertypeHint": "A CSS font list: the first font installed on the computer is used.",
    "standaardHuisstijl": "Default house style",
    "proefTitel": "1 Introduction",
    "proefParagraaf": "2.1 Project description",
    "proefLabel": "Consequence class",
    "proefTabel": "table text",
    "proefInvoer": "CC2",
    "constructeurs": "Structural engineers",
    "constructeurNaam": "Title and name",
    "naamVoorbeeld": "Ir. A. Voorbeeld",
    "emailVoorbeeld": "name@example.com",
    "constructeurToevoegen": "Add engineer",
    "constructeurVerwijderen": "Remove engineer",
    "geenConstructeurs": "No engineers yet. In the report you pick the responsible and the executing engineer from this list."
  },
  "about": {
    "appName": "Open Template",
```

- [ ] **Step 5: Draai de controle opnieuw**

```bash
node scripts/check-bureau-i18n.mjs; echo "exit $?"
```

Verwacht:

```
  OK     67 gebruikte sleutels, elk in nl en en
  OK     sectie bureau gelijk in nl en en
exit 0
```

Controleer ook dat beide bestanden geldige JSON zijn (de controle hierboven parseert ze al;
een fout geeft een `SyntaxError` met regelnummer).

- [ ] **Step 6: Controle in de app**

De app in het Browser-paneel (http://localhost:3021) is volledig herladen.
1. Klik rechtsboven in de titelbalk op het tandwiel **Voorkeuren**. De knop linksonder in
   het venster heet nu **Standaardwaarden herstellen**; voorheen stond daar
   "Reset to Defaults".
2. Klik op die knop. Het bevestigingsvenster toont: "Weet je zeker dat je alle instellingen
   wilt terugzetten naar de standaardwaarden? Het bureauprofiel blijft staan." Klik op
   **Annuleren** in het bevestigingsvenster en daarna op **Annuleren** in het
   instellingenvenster.
3. De tab Bureau is er nog niet; dat komt in Task 10.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-bureau-i18n.mjs packages/desktop/src/i18n/locales/nl/settings.json packages/desktop/src/i18n/locales/en/settings.json
git commit -m "$(cat <<'EOF'
feat(instellingen): vertalingen voor de tab Bureau

De teksten van de tab Bureau in het Nederlands en het Engels, plus de
ontbrekende Nederlandse knop- en bevestigingstekst voor het herstellen
van de standaardwaarden. Die bevestiging zegt nu dat het bureauprofiel
blijft staan. scripts/check-bureau-i18n.mjs eist dat elke sleutel die
het instellingenvenster gebruikt in beide talen bestaat.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Tab Bureau in het instellingenvenster

**Files:**
- Modify: `packages/desktop/src/components/settings/SettingsDialog.tsx`
  - imports: L5–8
  - `TAB_IDS`: L25
  - conceptstate: L68–69
  - refs: L74
  - open-effect: L85–89
  - `handleCancel`: L111–112
  - `handleSave`: L124–127
  - `handleConfirmReset`: L140–141
  - `Modal`: L162
  - tabinhoud: L183–186

**Interfaces:**
- Consumes:
  - `BureauTab` (Task 8)
  - `useBureauStore` uit `packages/desktop/src/store/bureauProfiel.ts`, met
    `getState().profiel: BureauProfiel` en `getState().zetProfiel(p: BureauProfiel): void`
  - `leegBureau(): BureauProfiel` en `type BureauProfiel` uit
    `packages/desktop/src/rapport/model.ts`
  - `tabs.bureau` (Task 9)
- Produces (geen nieuwe exports):
  - `TAB_IDS = ["general", "appearance", "units", "bureau", "about"] as const`
  - state `draftBureau: BureauProfiel` en ref `originalBureau`
  - bij openen: het concept is `useBureauStore.getState().profiel`
  - Opslaan: `zetProfiel({ ...draftBureau, constructeurs: <zonder volledig lege regels> })`
  - Annuleren of Escape: het concept gaat terug naar het origineel
  - Standaardwaarden herstellen: raakt het profiel niet aan
  - `Modal` wordt 680 × 560; de CSS begrenst de breedte tot `100vw - 16px`

- [ ] **Step 1: Controleer de uitgangssituatie**

```bash
npx tsc --noEmit -p packages/desktop && node scripts/check-bureau-i18n.mjs
```

Verwacht: geen uitvoer van `tsc`, daarna twee regels `OK` (67 sleutels). Faalt `tsc` op
`store/bureauProfiel`, voer dan eerst Task 7 uit.

- [ ] **Step 2: Imports (L5–8)**

Oud:

```tsx
import Modal from "../Modal";
import ThemedSelect from "../ThemedSelect";
import "../ThemedSelect.css";
import "./SettingsDialog.css";
```

Nieuw:

```tsx
import Modal from "../Modal";
import ThemedSelect from "../ThemedSelect";
import BureauTab from "../rapport/BureauTab";
import { useBureauStore } from "../../store/bureauProfiel";
import { leegBureau, type BureauProfiel } from "../../rapport/model";
import "../ThemedSelect.css";
import "./SettingsDialog.css";
```

- [ ] **Step 3: Tablijst (L25)**

Oud:

```tsx
const TAB_IDS = ["general", "appearance", "units", "about"] as const;
```

Nieuw:

```tsx
const TAB_IDS = ["general", "appearance", "units", "bureau", "about"] as const;
```

- [ ] **Step 4: Concept en origineel (L68–69 en L74)**

Oud (L68–69):

```tsx
  const [draftUnits, setDraftUnits] = useState<UnitsSettings>(UNITS_DEFAULTS);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
```

Nieuw:

```tsx
  const [draftUnits, setDraftUnits] = useState<UnitsSettings>(UNITS_DEFAULTS);
  const [draftBureau, setDraftBureau] = useState<BureauProfiel>(leegBureau);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
```

Oud (L74):

```tsx
  const originalUnits = useRef<UnitsSettings>(UNITS_DEFAULTS);
```

Nieuw:

```tsx
  const originalUnits = useRef<UnitsSettings>(UNITS_DEFAULTS);
  const originalBureau = useRef<BureauProfiel>(leegBureau());
```

- [ ] **Step 5: Laden bij openen (L85–89)**

Oud:

```tsx
      getSetting<UnitsSettings>("units", UNITS_DEFAULTS).then((u) => {
        originalUnits.current = u;
        setDraftUnits(u);
      });
    }
```

Nieuw:

```tsx
      getSetting<UnitsSettings>("units", UNITS_DEFAULTS).then((u) => {
        originalUnits.current = u;
        setDraftUnits(u);
      });
      // Het bureauprofiel staat al in het geheugen: store/bureauProfiel.ts leest
      // het bij het opstarten uit de instellingen. Hier dus geen getSetting.
      const profiel = useBureauStore.getState().profiel;
      originalBureau.current = profiel;
      setDraftBureau(profiel);
    }
```

- [ ] **Step 6: Annuleren (L111–112)**

Oud:

```tsx
    setDraftUnits(originalUnits.current);
    onClose();
```

Nieuw:

```tsx
    setDraftUnits(originalUnits.current);
    setDraftBureau(originalBureau.current);
    onClose();
```

- [ ] **Step 7: Opslaan (L124–127)**

Oud:

```tsx
    setSetting("units", draftUnits);
    window.dispatchEvent(new CustomEvent("units-changed", { detail: draftUnits }));

    onClose();
```

Nieuw:

```tsx
    setSetting("units", draftUnits);
    window.dispatchEvent(new CustomEvent("units-changed", { detail: draftUnits }));

    // De store bewaart het profiel zelf in de instellingen. Een constructeursregel
    // zonder naam, telefoon en e-mail is een vergeten lege rij: die valt weg.
    useBureauStore.getState().zetProfiel({
      ...draftBureau,
      constructeurs: draftBureau.constructeurs.filter(
        (c) => c.naam.trim() !== "" || c.telefoon.trim() !== "" || c.email.trim() !== "",
      ),
    });

    onClose();
```

- [ ] **Step 8: Standaardwaarden herstellen (L140–141)**

Oud:

```tsx
    setDraftUnits(UNITS_DEFAULTS);
    setConfirmResetOpen(false);
```

Nieuw:

```tsx
    setDraftUnits(UNITS_DEFAULTS);
    // Het bureauprofiel blijft staan: dat zijn bureaugegevens, geen voorkeur.
    // Voor de huisstijl heeft de tab Bureau een eigen knop "Standaard huisstijl".
    setConfirmResetOpen(false);
```

- [ ] **Step 9: Venstermaat (L162)**

Oud:

```tsx
    <Modal open={open} onClose={handleCancel} title={t("title")} width={560} height={500} className="settings-dialog" footer={footer}>
```

Nieuw:

```tsx
    <Modal open={open} onClose={handleCancel} title={t("title")} width={680} height={560} className="settings-dialog" footer={footer}>
```

- [ ] **Step 10: Tabinhoud (L183–186)**

Oud:

```tsx
          {activeTab === "units" && (
            <UnitsTabContent units={draftUnits} onChange={setDraftUnits} />
          )}
          {activeTab === "about" && <AboutTabContent />}
```

Nieuw:

```tsx
          {activeTab === "units" && (
            <UnitsTabContent units={draftUnits} onChange={setDraftUnits} />
          )}
          {activeTab === "bureau" && (
            <BureauTab profiel={draftBureau} onChange={setDraftBureau} />
          )}
          {activeTab === "about" && <AboutTabContent />}
```

- [ ] **Step 11: Typecontrole en vertaalcontrole**

```bash
npx tsc --noEmit -p packages/desktop && node scripts/check-bureau-i18n.mjs
```

Verwacht: geen uitvoer van `tsc`, daarna `OK     68 gebruikte sleutels, elk in nl en en`
(nu inclusief `tabs.bureau`) en `OK     sectie bureau gelijk in nl en en`.

- [ ] **Step 12: Controle in het Browser-paneel (http://localhost:3021)**

Het paneel is smal (ongeveer 626 px). Het venster krimpt dan mee tot de paneelbreedte min
16 px; dat is bedoeld. Klik steeds op de knoppen **onderaan het instellingenvenster**. Het
lint heeft ook een knop "Opslaan" (project opslaan); die start in de browser een download.

1. Klik rechtsboven in de titelbalk op het tandwiel **Voorkeuren**. Het venster
   "Instellingen" is breder dan voorheen (680 px of paneelbreed). De zijbalk toont
   **Algemeen, Uiterlijk, Eenheden, Bureau, Over**.
2. Klik op **Bureau**. Bovenaan staat de uitleg ("Deze gegevens en de huisstijl…"), met
   daaronder in rood "Buiten de desktop-app wordt het profiel niet bewaard…". Daarna volgen
   de secties **Bureaugegevens**, **Afbeeldingen**, **Huisstijl** en **Constructeurs**.
   Postcode en plaats staan naast elkaar. Er is geen horizontale schuifbalk.
3. Vul in:
   - Naam: `Voorbeeld Constructies`
   - Adres: `Voorbeeldstraat 1`
   - Postcode: `1234 AB`
   - Plaats: `Voorbeeldstad`
   - Telefoon: `012-3456789`
   - E-mail: `info@example.com`

   Klik je op het label "Adres", dan staat de cursor in het adresveld.
4. Afbeeldingen. Het Browser-paneel heeft geen bestandskiezer die een agent kan bedienen.
   Zet daarom met `javascript_tool` een gemaakte PNG in de verborgen bestandsvelden, zoals
   een gekozen bestand:

   ```js
   const kies = (index, bestand) => {
     const invoer = document.querySelectorAll(".bureau-afbeelding input[type=file]")[index];
     const dt = new DataTransfer();
     dt.items.add(bestand);
     invoer.files = dt.files;
     invoer.dispatchEvent(new Event("change", { bubbles: true }));
   };
   const png = async (w, h, kleur, naam) => {
     const c = document.createElement("canvas");
     c.width = w; c.height = h;
     const g = c.getContext("2d"); g.fillStyle = kleur; g.fillRect(0, 0, w, h);
     return new File([await new Promise((r) => c.toBlob(r, "image/png"))], naam, { type: "image/png" });
   };
   kies(0, await png(160, 60, "#1f3a5f", "logo-proef.png"));
   kies(1, await png(1050, 99, "#2f7d6d", "voet-proef.png"));
   await new Promise((r) => setTimeout(r, 300));
   [...document.querySelectorAll(".bureau-beeldvak img")].map((i) => i.src.slice(0, 22));
   ```

   Verwacht: twee keer `"data:image/png;base64,"`. Het logovak toont een donkerblauw blok.
   Het voetvak toont een brede groene balk in de verhouding van de paginavoet. Onder beide
   is **Verwijderen** nu actief. Controleer daarna de weigering:

   ```js
   kies(0, new File([new Uint8Array(600 * 1024)], "groot.png", { type: "image/png" }));
   kies(1, new File(["x"], "tekst.txt", { type: "text/plain" }));
   await new Promise((r) => setTimeout(r, 200));
   [...document.querySelectorAll(".bureau-fout")].map((e) => e.textContent);
   ```

   Verwacht: `["groot.png is 600 kB; een afbeelding mag hooguit 500 kB zijn.", "tekst.txt is geen afbeelding."]`
   in rood. De eerder gekozen afbeeldingen blijven staan.
5. Huisstijl:
   - Typ `#aa0000` in het hexveld van **Hoofdkleur (hoofdstuktitels)**. Het kleurvakje en
     "1 Inleiding" in de proef worden meteen rood.
   - Typ `#abc` in het hexveld van **Accentkleur** en druk op Tab. Tijdens het typen
     verandert het vakje niet; na Tab staat er `#aabbcc` en is "2.1 Projectomschrijving"
     grijsblauw.
   - Typ `zz` in het hexveld van **Tabeltekst** en druk op Tab. Het veld springt terug naar
     `#1f2937`.
   - Klik op **Standaard huisstijl**. De velden staan weer op `#1f3a5f`, `#2f7d6d`,
     `#1f2937` en `#1d4ed8`, met het standaardlettertype.
   - Zet daarna Hoofdkleur weer op `#aa0000` voor de volgende stappen.
6. Constructeurs:
   - Onder "Constructeurs" staat eerst "Nog geen constructeurs…". Klik op
     **Constructeur toevoegen**. Er verschijnt een rij met kolomkoppen (Titel en naam,
     Telefoon, E-mail); de cursor staat in "Titel en naam" (placeholder
     "Ir. A. Voorbeeld").
   - Typ `Ir. A. Voorbeeld` en telefoon `012-3456789`.
   - Klik nog twee keer op **Constructeur toevoegen**. Verwijder de laatste rij met **×**.
     De middelste rij laat je leeg.
7. Klik op **Opslaan** (onderaan het venster). Het venster sluit.
8. Klik weer op **Voorkeuren**; de tab **Bureau** is nog actief. Controleer:
   - de naam `Voorbeeld Constructies` en de overige gegevens staan er
   - het logo en de voetafbeelding staan er
   - Hoofdkleur is `#aa0000`
   - er is precies één constructeur (`Ir. A. Voorbeeld`); de lege rij is bij het opslaan
     weggevallen
   - de rode foutmeldingen van stap 4 zijn weg
9. Annuleren en Escape:
   - Verander de naam in `Weg` en klik op **Annuleren**. Open het venster opnieuw: de naam
     is `Voorbeeld Constructies`.
   - Verander de naam in `Weg2` en druk op Escape. Open opnieuw: weer
     `Voorbeeld Constructies`.
10. Klik op **Standaardwaarden herstellen** en bevestig. De tab Bureau houdt alle gegevens.
    Klik op **Annuleren**, zodat thema, taal en eenheden niet echt worden teruggezet.
11. Klik op **Uiterlijk** en kies het thema **Forge (donker)** (alleen voorbeeld). Klik op
    **Bureau**. De tekst is leesbaar, en de afbeeldingsvakken en de proef blijven wit. Klik
    op **Annuleren**; het thema gaat terug.
12. Klik op **Eenheden**. De tab werkt zoals voorheen. Sluit het venster met **Annuleren**.
13. Herlaad de pagina (F5). Open **Voorkeuren** → **Bureau**. Het profiel is leeg: zonder
    Tauri leeft het alleen in het geheugen, zoals de rode regel zegt.

- [ ] **Step 13: Controle in het Tauri-venster**

1. Voer stap 1–8 hierboven uit in het Tauri-venster. Kies bij stap 4 met **Kiezen…** een
   echte PNG of JPG kleiner dan 500 kB voor het logo; de gewone bestandskiezer van Windows
   opent. Kies daarna een bestand groter dan 500 kB: de melding "… is … kB; een afbeelding
   mag hooguit 500 kB zijn." verschijnt. De rode regel "Buiten de desktop-app…" staat hier
   niet.
2. Wacht een seconde na **Opslaan** (de store bewaart debounced) en controleer het
   instellingenbestand:

   ```bash
   node -e "const j=require(process.env.APPDATA+'/studio.opencalculations.app/preferences.json');const p=j.bureauProfiel;console.log(p&&{naam:p.naam,logo:p.logo.slice(0,22),voet:p.voetafbeelding.slice(0,22),hoofdkleur:p.huisstijl.hoofdkleur,constructeurs:p.constructeurs.map(c=>c.naam)})"
   ```

   Verwacht:

   ```
   { naam: 'Voorbeeld Constructies', logo: 'data:image/png;base64,', voet: 'data:image/png;base64,', hoofdkleur: '#aa0000', constructeurs: [ 'Ir. A. Voorbeeld' ] }
   ```

   Bij een JPG begint `logo` met `data:image/jpeg;base64`.
3. Sluit de app helemaal en start hem opnieuw. Ga naar **Voorkeuren** → **Bureau**: alle
   waarden en afbeeldingen staan er nog.
4. Wis het proefprofiel daarna niet automatisch. Laat de gebruiker zelf kiezen of het blijft
   staan.

- [ ] **Step 14: Commit**

```bash
git add packages/desktop/src/components/settings/SettingsDialog.tsx
git commit -m "$(cat <<'EOF'
feat(instellingen): tab Bureau in het instellingenvenster

Het venster krijgt de tab Bureau tussen Eenheden en Over. Bij openen is
het concept het profiel uit de bureaustore; Opslaan geeft het terug aan
zetProfiel (lege constructeursregels vallen weg), Annuleren en Escape
laten het profiel ongemoeid. Standaardwaarden herstellen raakt het
bureauprofiel niet aan. Het venster is 680 bij 560 px en krimpt in een
smal venster mee.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

## Deel: Werkruimte

Dit deel hangt het rapport in de app: de printstore kent een soort (bladen of rapport),
de projectboom krijgt een vaste knoop **Rapport**, de werkruimte toont daarvoor de tabs
**Rapport | Afdrukvoorbeeld**, het lint drukt het rapport af, en in dev staan de stores
op `window.__ocs` voor `scripts/rapport-pdf.mjs`.

Alle commando's draaien vanuit de worktree-root
`C:/Users/rickd/Documents/GitHub/Ifc-Calc/.claude/worktrees/practical-mcclintock-34d234`
in Git Bash. Stage nooit `packages/desktop/.gitignore`.

**Afhankelijkheden van andere delen**

| Nodig in | Wat | Uit |
|---|---|---|
| Task 12, 15, 20 | `export const RAPPORT_ID = "__rapport__";` in `store/projectStore.ts` | Task 5 (projectstore) |
| Task 15 | `export default function RapportPanel()` zonder props in `components/rapport/RapportPanel.tsx` | Task 14 (rapportpaneel) |
| Task 21 | `export const useBureauStore` in `store/bureauProfiel.ts` | Task 7 (bureauprofiel) |
| afdrukdeel (Task 22–32) | `usePrintStore((s) => s.soort)` en `type AfdrukSoort` | Task 11 hieronder |

De taken van dit deel staan verspreid tussen die van het rapportpaneel: Task 11 en 12 vóór
Task 13, Task 15 na Task 14, en Task 20 en 21 na Task 19. Tot het afdrukdeel (Task 22–32) klaar
is, toont het afdrukvoorbeeld in rapportmodus nog de bladenuitdraai en drukt "Rapport (PDF)" nog
de bladen af. De tabs, de knoppen en de store werken dan al wel.

**Live-app.** De gebruiker test in de draaiende app (Vite op http://localhost:3021, plus het
Tauri-venster). Task 11, 12, 15 en 20 laden via HMR. Task 21 raakt `ribbon.json` en `main.tsx`,
en die laden de app volledig opnieuw. Daarom staan ze samen in één taak, de laatste van dit deel. In een
browser zonder Tauri is het project na een volledige herlaadbeurt leeg.

**Proefbladen voor de browsercontrole.** Open http://localhost:3021 in het Browser-paneel.
Klik in het lint op tab **Start** en dan op **Module**. Dubbelklik op de tegel
**Spuwer (noodoverlaat)** en druk op Enter om de voorgestelde naam te bevestigen. Doe dat
twee keer, dan staan er twee rekenbladen in de projectboom.

---

### Task 11: Afdruksoort in de printstore

**Files:**
- Create: `scripts/check-afdrukstore.mjs`
- Modify: `packages/desktop/src/store/printStore.ts` (L1–54, het hele bestand)

**Interfaces:**
- Consumes: `create` uit `zustand` (bestaand).
- Produces (in `packages/desktop/src/store/printStore.ts`):
  - `export type AfdrukSoort = "bladen" | "rapport";`
  - `PrintState.soort: AfdrukSoort`, beginwaarde `"bladen"`
  - `afdrukken: (selectie?: string[] | null, soort?: AfdrukSoort) => void`. Een weggelaten argument laat de huidige waarde staan.
  - `toonVoorbeeld: (selectie?: string[] | null, soort?: AfdrukSoort) => void`, met dezelfde regel
  - `export function useAfdrukken(): () => void`: bij een open voorbeeld `afdrukken()`, anders `afdrukken(null, "rapport")`. De hook houdt precies twee selectors in dezelfde volgorde. Daardoor verandert het aantal hooks in `useSneltoetsen`, en dus in `App`, niet. `useSneltoetsen.ts`, `TitleBar.tsx` en `Backstage.tsx` blijven ongewijzigd.
  - module-intern: `function opgegeven(selectie?, soort?): Partial<PrintState>`
  - `scripts/check-afdrukstore.mjs`. `check-alles.mjs` pakt het automatisch op. Het laadt `printStore.ts` rechtstreeks in Node 24; dat bestand importeert alleen `zustand`.

- [ ] **Step 1: Schrijf de falende controle**

Maak `scripts/check-afdrukstore.mjs`:

```js
/**
 * Controlescript voor de afdrukstore: welke uitdraai er komt.
 *
 * Er zijn twee soorten afdruk: de losse rekenbladen ("bladen") en het
 * constructierapport ("rapport"). De soort reist mee met `afdrukken` en
 * `toonVoorbeeld`; weglaten betekent "laat staan wat er stond", net als bij de
 * selectie. Gaat dat mis, dan drukt "PDF blad" na een rapportafdruk opeens een
 * heel rapport af, of de knop in het voorbeeld iets anders dan er te zien is.
 *
 * printStore.ts importeert alleen zustand, dus Node laadt hem rechtstreeks.
 * De hook useAfdrukken zelf is hier niet te toetsen (React); die staat in de
 * handmatige controle van het plan.
 *
 * Draaien:  node scripts/check-afdrukstore.mjs
 */
import { usePrintStore } from "../packages/desktop/src/store/printStore.ts";

const BEGIN = { bezig: false, voorbeeld: false, selectie: null, soort: "bladen" };
let fouten = 0;

/** Vergelijkt de genoemde velden van de huidige stand met `verwacht`. */
function toets(naam, verwacht) {
  const s = usePrintStore.getState();
  const afwijkend = Object.entries(verwacht).filter(([k, v]) => JSON.stringify(s[k]) !== JSON.stringify(v));
  if (afwijkend.length === 0) {
    console.log(`  OK     ${naam}`);
    return;
  }
  fouten++;
  console.log(`  FOUT   ${naam}`);
  for (const [k, v] of afwijkend) {
    console.log(`         ${k}: ${JSON.stringify(s[k])}, verwacht ${JSON.stringify(v)}`);
  }
}

/** Elk geval begint vanaf een bekende stand; geeft de acties terug. */
function vanaf(stand = {}) {
  usePrintStore.setState({ ...BEGIN, ...stand });
  return usePrintStore.getState();
}

// Eerst de beginstand, vóór er iets is gezet.
toets("beginstand: bladen, geen afdruk, geen voorbeeld", BEGIN);

// ── afdrukken ────────────────────────────────────────────────────────────────
vanaf().afdrukken(null, "rapport");
toets('afdrukken(null, "rapport"): het hele rapport', { bezig: true, selectie: null, soort: "rapport" });

vanaf({ soort: "rapport" }).afdrukken(["ex-1"], "bladen");
toets('afdrukken([id], "bladen") na een rapport: één blad', { bezig: true, selectie: ["ex-1"], soort: "bladen" });

vanaf({ voorbeeld: true, soort: "rapport" }).afdrukken();
toets("afdrukken() laat soort en selectie staan (knop in het voorbeeld)", {
  bezig: true, voorbeeld: true, selectie: null, soort: "rapport",
});

vanaf({ selectie: ["ex-2"] }).afdrukken(["ex-3"]);
toets("afdrukken([id]) zonder soort laat de soort staan", { bezig: true, selectie: ["ex-3"], soort: "bladen" });

vanaf({ bezig: true, soort: "rapport" }).klaar();
toets("klaar() zet alleen bezig uit", { bezig: false, soort: "rapport" });

// ── voorbeeld ────────────────────────────────────────────────────────────────
vanaf().toonVoorbeeld(null, "rapport");
toets('toonVoorbeeld(null, "rapport"): het rapportvoorbeeld', {
  voorbeeld: true, bezig: false, selectie: null, soort: "rapport",
});

vanaf({ soort: "rapport" }).toonVoorbeeld(["ex-1"], "bladen");
toets('toonVoorbeeld([id], "bladen"): het voorbeeld van één blad', {
  voorbeeld: true, selectie: ["ex-1"], soort: "bladen",
});

vanaf({ soort: "rapport" }).toonVoorbeeld();
toets("toonVoorbeeld() laat soort en selectie staan", { voorbeeld: true, selectie: null, soort: "rapport" });

vanaf({ voorbeeld: true, soort: "rapport" }).sluitVoorbeeld();
toets("sluitVoorbeeld() laat de soort staan", { voorbeeld: false, soort: "rapport" });

vanaf({ soort: "rapport" }).kiesSelectie(["ex-4"]);
toets("kiesSelectie() raakt de soort niet", { selectie: ["ex-4"], soort: "rapport" });

console.log(
  fouten
    ? `\nAfdrukstore: ${fouten} fout(en).`
    : "\nAfdrukstore: soort en selectie reizen mee zoals bedoeld.",
);
process.exit(fouten ? 1 : 0);
```

- [ ] **Step 2: Draai de controle en zie hem falen**

Run: `node scripts/check-afdrukstore.mjs; echo "exit $?"`

Expected (exact):
```
  FOUT   beginstand: bladen, geen afdruk, geen voorbeeld
         soort: undefined, verwacht "bladen"
  FOUT   afdrukken(null, "rapport"): het hele rapport
         soort: "bladen", verwacht "rapport"
  FOUT   afdrukken([id], "bladen") na een rapport: één blad
         soort: "rapport", verwacht "bladen"
  OK     afdrukken() laat soort en selectie staan (knop in het voorbeeld)
  OK     afdrukken([id]) zonder soort laat de soort staan
  OK     klaar() zet alleen bezig uit
  FOUT   toonVoorbeeld(null, "rapport"): het rapportvoorbeeld
         soort: "bladen", verwacht "rapport"
  FOUT   toonVoorbeeld([id], "bladen"): het voorbeeld van één blad
         soort: "rapport", verwacht "bladen"
  OK     toonVoorbeeld() laat soort en selectie staan
  OK     sluitVoorbeeld() laat de soort staan
  OK     kiesSelectie() raakt de soort niet

Afdrukstore: 5 fout(en).
exit 1
```

- [ ] **Step 3: Vervang de printstore**

Vervang de hele inhoud van `packages/desktop/src/store/printStore.ts` door:

```ts
import { create } from "zustand";

/**
 * Wat er wordt afgedrukt. "bladen" is de uitdraai van rekenbladen: één blad
 * als losse berekening met een titelblok, of meer bladen achter een voorblad.
 * "rapport" is het constructierapport, met de rekenbladen in bijlage A.
 */
export type AfdrukSoort = "bladen" | "rapport";

/**
 * Schakelaar voor de afdrukweergave.
 *
 * Het hele project als HTML opbouwen kost tijd bij twintig bladen, dus dat
 * gebeurt niet bij elke render maar alleen op het moment dat je print. `bezig`
 * staat aan tussen "print gevraagd" en "printdialoog gesloten"; alleen dan
 * bestaat `<PrintDocument />` in de DOM.
 */
interface PrintState {
  bezig: boolean;
  /**
   * Afdrukvoorbeeld: dezelfde weergave, maar op het scherm en zonder de
   * printdialoog. Zonder dit is een printlayout niet te controleren zonder hem
   * uit te draaien — en dan zie je pas op papier dat er iets niet klopt.
   */
  voorbeeld: boolean;
  /**
   * Welke bladen er in de uitdraai komen, als id's; `null` is het hele
   * project. Eén blad is een losse berekening: die krijgt geen voorblad maar
   * een titelblok boven het blad.
   */
  selectie: string[] | null;
  /**
   * Bladen of rapport. Blijft staan tot een volgende afdruk of een volgend
   * voorbeeld een andere soort vraagt, net als `selectie`: de knop
   * "PDF / afdrukken…" in het voorbeeld drukt zo af wat er te zien is.
   */
  soort: AfdrukSoort;
  /** Start het afdrukken; een opgegeven selectie of soort wordt eerst ingesteld. */
  afdrukken: (selectie?: string[] | null, soort?: AfdrukSoort) => void;
  klaar: () => void;
  /** Opent het voorbeeld; een opgegeven selectie of soort wordt eerst ingesteld. */
  toonVoorbeeld: (selectie?: string[] | null, soort?: AfdrukSoort) => void;
  sluitVoorbeeld: () => void;
  kiesSelectie: (selectie: string[] | null) => void;
}

/** Alleen wat is opgegeven: een weggelaten argument laat de huidige keuze staan. */
function opgegeven(selectie?: string[] | null, soort?: AfdrukSoort): Partial<PrintState> {
  return {
    ...(selectie === undefined ? {} : { selectie }),
    ...(soort === undefined ? {} : { soort }),
  };
}

export const usePrintStore = create<PrintState>((set) => ({
  bezig: false,
  voorbeeld: false,
  selectie: null,
  soort: "bladen",
  afdrukken: (selectie, soort) => set({ bezig: true, ...opgegeven(selectie, soort) }),
  klaar: () => set({ bezig: false }),
  toonVoorbeeld: (selectie, soort) => set({ voorbeeld: true, ...opgegeven(selectie, soort) }),
  sluitVoorbeeld: () => set({ voorbeeld: false }),
  kiesSelectie: (selectie) => set({ selectie }),
}));

/**
 * De actie waarmee een knop of sneltoets het afdrukken start: het
 * constructierapport, tenzij het afdrukvoorbeeld openstaat — dan geldt wat
 * daar te zien is (het rapport, alle bladen of één blad).
 *
 * Twee selectors, in deze volgorde: App roept deze hook via useSneltoetsen
 * aan, en het aantal hooks daarin verandert niet zonder App mee te nemen.
 */
export function useAfdrukken(): () => void {
  const afdrukken = usePrintStore((s) => s.afdrukken);
  const voorbeeld = usePrintStore((s) => s.voorbeeld);
  return () => (voorbeeld ? afdrukken() : afdrukken(null, "rapport"));
}
```

- [ ] **Step 4: Draai de controle en de typecheck**

Run: `node scripts/check-afdrukstore.mjs; echo "exit $?"`

Expected (exact):
```
  OK     beginstand: bladen, geen afdruk, geen voorbeeld
  OK     afdrukken(null, "rapport"): het hele rapport
  OK     afdrukken([id], "bladen") na een rapport: één blad
  OK     afdrukken() laat soort en selectie staan (knop in het voorbeeld)
  OK     afdrukken([id]) zonder soort laat de soort staan
  OK     klaar() zet alleen bezig uit
  OK     toonVoorbeeld(null, "rapport"): het rapportvoorbeeld
  OK     toonVoorbeeld([id], "bladen"): het voorbeeld van één blad
  OK     toonVoorbeeld() laat soort en selectie staan
  OK     sluitVoorbeeld() laat de soort staan
  OK     kiesSelectie() raakt de soort niet

Afdrukstore: soort en selectie reizen mee zoals bedoeld.
exit 0
```

Run: `npx tsc --noEmit -p packages/desktop; echo "exit $?"`
Expected: geen meldingen, `exit 0`. Alle bestaande aanroepen blijven geldig, want beide parameters zijn optioneel.

- [ ] **Step 5: Korte controle in de app**

Open http://localhost:3021 met twee proefbladen (zie de inleiding van dit deel). Klik een
blad in de projectboom aan en daarna op de tab **Afdrukvoorbeeld** boven de werkruimte.
Verwacht: het voorbeeldpaneel met de werkbalk "Afdrukvoorbeeld · n pagina's · Bereik". De
keuzelijst **Bereik** staat op "Alleen: <naam van het blad>". Klik **Sluiten**. In de console
(read_console_messages, alleen fouten) staat geen nieuwe fout.

- [ ] **Step 6: Commit**

```bash
git add scripts/check-afdrukstore.mjs packages/desktop/src/store/printStore.ts
git commit -m "$(cat <<'EOF'
feat(afdruk): soort bladen of rapport in de printstore

afdrukken() en toonVoorbeeld() nemen naast de selectie een soort mee:
"bladen" voor de uitdraai van rekenbladen, "rapport" voor het
constructierapport. Een weggelaten argument laat de huidige keuze staan.
Zonder open voorbeeld drukken Ctrl+P, de printknop in de titelbalk en
Backstage voortaan het rapport af. check-afdrukstore toetst de store.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Knoop Rapport in de projectboom en de documentbalk

**Files:**
- Modify: `packages/desktop/src/components/calc/ProjectBrowser.tsx` (L3 import; L129–132, na de knop Projectgegevens)
- Modify: `packages/desktop/src/components/DocumentBar.tsx` (L1 import; L16–19)

**Interfaces:**
- Consumes: `RAPPORT_ID` (`"__rapport__"`) en `selecteer(id: string): void` uit `store/projectStore.ts`.
- Produces:
  - In de boom een tweede vaste knoop direct onder "Projectgegevens", met dezelfde klassen: `tree-item tree-item-emphasis`, plus ` selected` bij `activeId === RAPPORT_ID`. Het label is "Rapport".
  - In de documentbalk `bladNaam === "Rapport"` bij `activeId === RAPPORT_ID`.

- [ ] **Step 1: Controleer dat RAPPORT_ID bestaat**

Run: `grep -n 'export const RAPPORT_ID' packages/desktop/src/store/projectStore.ts`

Expected: één regel `…:export const RAPPORT_ID = "__rapport__";` (uit Task 5).

- [ ] **Step 2: Knoop Rapport in de projectboom**

In `packages/desktop/src/components/calc/ProjectBrowser.tsx`:

Oud (L3):
```ts
import { useProjectStore, PROJECT_ID, type Exemplaar } from "../../store/projectStore";
```
Nieuw:
```ts
import { useProjectStore, PROJECT_ID, RAPPORT_ID, type Exemplaar } from "../../store/projectStore";
```

Oud (L129–132):
```tsx
                <span className="tree-item-label">Projectgegevens</span>
              </button>

              {exemplaren.length === 0 && (
```
Nieuw:
```tsx
                <span className="tree-item-label">Projectgegevens</span>
              </button>

              {/* Het rapport hoort, net als de projectgegevens, bij het hele
                  project en niet bij één blad: daarom een vaste knoop erboven. */}
              <button
                className={`tree-item tree-item-emphasis${activeId === RAPPORT_ID ? " selected" : ""}`}
                onClick={() => selecteer(RAPPORT_ID)}
                title="Rapport — het constructierapport van dit project, met de rekenbladen als bijlage"
              >
                <span className="tree-item-label">Rapport</span>
              </button>

              {exemplaren.length === 0 && (
```

- [ ] **Step 3: Label in de documentbalk**

In `packages/desktop/src/components/DocumentBar.tsx`:

Oud (L1):
```ts
import { useProjectStore, PROJECT_ID } from "../store/projectStore";
```
Nieuw:
```ts
import { useProjectStore, PROJECT_ID, RAPPORT_ID } from "../store/projectStore";
```

Oud (L16–19):
```ts
  const bladNaam =
    activeId === PROJECT_ID
      ? "Projectgegevens"
      : (exemplaren.find((e) => e.id === activeId)?.naam ?? null);
```
Nieuw:
```ts
  const bladNaam =
    activeId === PROJECT_ID
      ? "Projectgegevens"
      : activeId === RAPPORT_ID
        ? "Rapport"
        : (exemplaren.find((e) => e.id === activeId)?.naam ?? null);
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop; echo "exit $?"`
Expected: geen meldingen, `exit 0`.

- [ ] **Step 5: Controle in de browser**

1. Open http://localhost:3021. In de projectboom staat onder "Projectgegevens" een tweede
   vette knoop **Rapport**, met dezelfde zachte accentachtergrond.
2. Klik **Rapport**. De knoop licht op (accentkleur, linkerrand) en "Projectgegevens" niet
   meer. De documentbalk toont `Naamloos.ifccalculation › Rapport`. Tot Task 15 toont de
   werkruimte nog "Nog geen rekenblad geopend"; dat hoort zo.
3. Controle via javascript_tool:
   ```js
   [document.querySelector(".project-browser-tree .tree-item-emphasis.selected")?.textContent,
    document.querySelector(".document-tab-blad")?.textContent]
   ```
   Expected: `["Rapport", "› Rapport"]`
4. Klik **Projectgegevens**. Het formulier verschijnt en de documentbalk toont
   `› Projectgegevens`.
5. De console toont geen nieuwe fouten.

- [ ] **Step 6: Commit**

```bash
git add packages/desktop/src/components/calc/ProjectBrowser.tsx packages/desktop/src/components/DocumentBar.tsx
git commit -m "$(cat <<'EOF'
feat(rapport): knoop Rapport in de projectboom en de documentbalk

Onder Projectgegevens staat een tweede vaste knoop, Rapport: het rapport
hoort bij het hele project en niet bij één blad. De documentbalk toont
dan "Rapport" als onderdeel.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

## Deel: Rapportpaneel

Dit deel bouwt het paneel dat onder de knoop **Rapport** in de werkruimte staat: één scrollend
formulier met de secties Document, Revisies, Hoofdstukken 1–3, Uitgangspunten, Belastingen,
Berekeningen, Bijlagen en Bureau. Alles staat in `packages/desktop/src/components/rapport/`:
`RapportPanel.tsx` + `RapportPanel.css` en de secties in `paneel/`. CSS-klassen beginnen met
`rapport-`; het uiterlijk volgt `ProjectGegevensPanel` (zelfde tokens, maten en kopstijl).

**Werkwijze in dit deel**

- Invoer per veld gaat via `zetRapportVeld(pad, waarde)` (doortypen = één stap ongedaan maken);
  toevoegen, verwijderen, verplaatsen, een standaardtekst kiezen en het bureau bijwerken gaan via
  `werkRapportBij(fn)` (elk een eigen stap).
- Afgeleide normwaarden worden niet opgeslagen: het paneel rekent ze bij elke render uit met
  `normwaarden.ts` en toont ze grijs, met een link naar Projectgegevens waar ze vandaan komen.
- Nummers in de koppen komen uit `bouwOpzet()` (via `OpzetBron`), zodat het paneel dezelfde
  nummering toont als de afdruk; een knoop die wegvalt krijgt het label "valt weg".
- De componentbestanden importeren zonder extensie, zoals de rest van `components/`. Alleen
  `paneel/hulp.ts` importeert mét `.ts`, omdat `scripts/check-rapportpaneel.mjs` dat bestand
  rechtstreeks in Node laadt.
- Regelnummers bij "Modify" gelden voor het bestand zoals de vorige taak het achterlaat. Voer de
  vervangingen van boven naar beneden uit; elke vervanging staat met de exacte oude tekst erbij.

**Voorwaarden** (uit eerdere delen van dit plan): `src/rapport/{model,pad,revisies,invullen,
normwaarden,opbouw,standaardteksten,opzet}.ts` bestaan volgens het contract; `useProjectStore`
heeft `rapport`, `zetRapportVeld` en `werkRapportBij`; `store/bureauProfiel.ts` levert
`useBureauStore` met `profiel`, `eigenTeksten`, `voegTekstToe` en `verwijderTekst`.

**Browsercontrole.** De gebruiker draait de app al (Vite op http://localhost:3021, Browser-paneel
en Tauri-venster); start geen tweede server. Nieuwe bestanden in `components/rapport/` laden via
HMR zonder volledige herlaadbeurt. De browsercontroles gaan ervan uit dat de knoop **Rapport** in
de projectboom het paneel opent: Task 12 zet de knoop in de projectboom en Task 15 hangt
`<RapportPanel />` in `App.tsx`. Task 14 komt vóór Task 15 en heeft daarom geen eigen
browsercontrole; die staat in Task 15 als Step 10. In het Browser-paneel (zonder Tauri) blijven bureauprofiel en eigen tekstvarianten alleen in het geheugen
staan; dat is voor deze controles genoeg. Vragen van `confirm()` beantwoord je met OK, tenzij de
stap iets anders zegt. Ctrl+Z en Ctrl+Y werken alleen als de cursor níét in een invoerveld staat:
klik eerst op een lege plek in het paneel.

---

### Task 13: Hulpfuncties van het rapportpaneel met controlescript

**Files:**
- Create: `packages/desktop/src/components/rapport/paneel/hulp.ts`
- Create: `scripts/check-rapportpaneel.mjs`

**Interfaces:**
- Consumes: `OPZET`, `Knoop` uit `rapport/opzet.ts`; `Pad` uit `rapport/pad.ts`; `fmt(v, dec, trim?)`
  uit `rapport/normwaarden.ts`; `BureauProfiel`, `leegBureau()` uit `rapport/model.ts`.
- Produces (`paneel/hulp.ts`, zonder React):
  - `vindKnoop(id: string, lijst?: readonly Knoop[]): Knoop | undefined`
  - `opPad(obj: unknown, pad: Pad): unknown`
  - `verplaatst<T>(lijst: readonly T[], i: number, richting: -1 | 1): T[]`
  - `getalTekst(v: number | null | undefined, dec: number, trim?: boolean): string` ("—" zonder getal)
  - `uittreksel(tekst: string, max?: number): string`
  - `bijlageLetter(index: number): string` (0 → "B", 24 → "Z", 25 → "AA"; zelfde reeks als `opzet.ts`)
  - `lettertypeNaam(fontFamily: string): string`
  - `adresRegel(b: BureauProfiel): string`
  - `zelfdeBureau(a: BureauProfiel, b: BureauProfiel): boolean`
  - `scripts/check-rapportpaneel.mjs` (loopt vanzelf mee in `check-alles`).

- [ ] **Step 1: Schrijf het falende controlescript**

Maak `scripts/check-rapportpaneel.mjs`:

```js
/**
 * Controlescript voor de hulpfuncties van het rapportpaneel
 * (packages/desktop/src/components/rapport/paneel/hulp.ts).
 *
 * De secties van het paneel zijn React en worden in de app gecontroleerd.
 * Wat hier staat is de logica eronder: knopen opzoeken in de opzet, een lijst
 * op een pad lezen, rijen verplaatsen, getallen en teksten opmaken en twee
 * bureauprofielen vergelijken.
 *
 * Draaien:  node scripts/check-rapportpaneel.mjs
 */
import {
  adresRegel,
  bijlageLetter,
  getalTekst,
  lettertypeNaam,
  opPad,
  uittreksel,
  verplaatst,
  vindKnoop,
  zelfdeBureau,
} from "../packages/desktop/src/components/rapport/paneel/hulp.ts";
import { leegBureau } from "../packages/desktop/src/rapport/model.ts";

let fouten = 0;
function toets(naam, ok, gekregen) {
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${naam}` + (ok || gekregen === undefined ? "" : `   gekregen: ${JSON.stringify(gekregen)}`));
}
const gelijk = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ── vindKnoop: de vaste opzet, diepte eerst ─────────────────────────────────
toets("vindKnoop: hoofdstuk", vindKnoop("berekeningen")?.niveau === 1);
toets("vindKnoop: subblok diep in hoofdstuk 3", vindKnoop("bestaand-verticaal")?.niveau === 4);
toets("vindKnoop: 4.6 heet bestaand-situatie", vindKnoop("bestaand-situatie")?.inhoud === "bestaand");
toets("vindKnoop: onbekende id", vindKnoop("bestaat-niet") === undefined);

// ── opPad: lezen langs een pad van objecten en lijsten ──────────────────────
const boom = { a: { b: [1, { c: "x" }] } };
toets("opPad: object en lijst door elkaar", opPad(boom, ["a", "b", 1, "c"]) === "x");
toets("opPad: tussenstap ontbreekt", opPad(boom, ["a", "q", "c"]) === undefined);
toets("opPad: door een getal heen", opPad({ a: 1 }, ["a", "b"]) === undefined);
toets("opPad: leeg pad geeft het object zelf", opPad(boom, []) === boom);

// ── verplaatst: altijd een nieuwe lijst ─────────────────────────────────────
const lijst = ["A", "B", "C"];
toets("verplaatst: omlaag", gelijk(verplaatst(lijst, 0, 1), ["B", "A", "C"]), verplaatst(lijst, 0, 1));
toets("verplaatst: omhoog", gelijk(verplaatst(lijst, 2, -1), ["A", "C", "B"]), verplaatst(lijst, 2, -1));
toets("verplaatst: aan de rand blijft alles staan", gelijk(verplaatst(lijst, 2, 1), lijst));
toets("verplaatst: kopie, origineel ongemoeid", verplaatst(lijst, 2, 1) !== lijst && gelijk(lijst, ["A", "B", "C"]));

// ── getalTekst ──────────────────────────────────────────────────────────────
toets("getalTekst: komma en vaste decimalen", getalTekst(0.7, 2) === "0,70", getalTekst(0.7, 2));
toets("getalTekst: NaN wordt —", getalTekst(NaN, 2) === "—");
toets("getalTekst: null en undefined worden —", getalTekst(null, 2) === "—" && getalTekst(undefined, 2) === "—");

// ── uittreksel ──────────────────────────────────────────────────────────────
toets("uittreksel: eerste niet-lege regel", uittreksel("\n   Eerste regel  \nTweede regel") === "Eerste regel");
const lang = "x".repeat(100);
toets("uittreksel: ingekort tot 80 tekens met …", uittreksel(lang).length === 80 && uittreksel(lang).endsWith("…"));
toets("uittreksel: alleen witruimte", uittreksel("  \n ") === "");

// ── bijlageLetter, lettertypeNaam, adresRegel ───────────────────────────────
toets("bijlageLetter: eigen bijlagen beginnen bij B, na Z volgt AA",
  bijlageLetter(0) === "B" && bijlageLetter(1) === "C" && bijlageLetter(24) === "Z" && bijlageLetter(25) === "AA");
toets("lettertypeNaam: eerste familie zonder aanhalingstekens",
  lettertypeNaam('"Segoe UI", "Helvetica Neue", Arial, sans-serif') === "Segoe UI");
const metAdres = { ...leegBureau(), adres: "Voorbeeldstraat 1", postcode: "1234 AB", plaats: "Voorbeeldstad" };
toets("adresRegel: volledig", adresRegel(metAdres) === "Voorbeeldstraat 1, 1234 AB Voorbeeldstad", adresRegel(metAdres));
toets("adresRegel: alleen een plaats", adresRegel({ ...leegBureau(), plaats: "Voorbeeldstad" }) === "Voorbeeldstad");
toets("adresRegel: leeg profiel", adresRegel(leegBureau()) === "");

// ── zelfdeBureau ────────────────────────────────────────────────────────────
const basis = leegBureau();
toets("zelfdeBureau: twee lege profielen", zelfdeBureau(basis, leegBureau()));
toets("zelfdeBureau: sleutelvolgorde telt niet",
  zelfdeBureau(basis, JSON.parse(JSON.stringify({ constructeurs: [], ...basis }))));
toets("zelfdeBureau: andere naam", !zelfdeBureau(basis, { ...basis, naam: "Voorbeeldbureau" }));
toets("zelfdeBureau: andere accentkleur",
  !zelfdeBureau(basis, { ...basis, huisstijl: { ...basis.huisstijl, accentkleur: "#000000" } }));
const metConstructeur = { ...basis, constructeurs: [{ naam: "Ir. A. Voorbeeld", telefoon: "", email: "" }] };
toets("zelfdeBureau: constructeur erbij", !zelfdeBureau(basis, metConstructeur));
toets("zelfdeBureau: andere constructeur",
  !zelfdeBureau(metConstructeur, { ...basis, constructeurs: [{ naam: "Ing. B. Voorbeeld", telefoon: "", email: "" }] }));

if (fouten > 0) {
  console.error(`\nRapportpaneel: ${fouten} afwijking(en).`);
  process.exit(1);
}
console.log("\nRapportpaneel: alle hulpfuncties kloppen.");
```

- [ ] **Step 2: Draai het en zie het falen**

Run: `node scripts/check-rapportpaneel.mjs`

Expected: FAIL met `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/packages/desktop/src/components/rapport/paneel/hulp.ts' imported from …/scripts/check-rapportpaneel.mjs`.

- [ ] **Step 3: Schrijf `hulp.ts`**

Maak `packages/desktop/src/components/rapport/paneel/hulp.ts`:

```ts
/**
 * Hulpfuncties van het rapportpaneel, zonder React.
 *
 * Los van de componenten, zodat scripts/check-rapportpaneel.mjs ze direct kan
 * laden. Daarom staan de imports hier mét `.ts`, net als in src/rapport/:
 * Node 24 laadt ze zo zonder bouwstap.
 */
import type { BureauProfiel } from "../../../rapport/model.ts";
import { fmt } from "../../../rapport/normwaarden.ts";
import { OPZET, type Knoop } from "../../../rapport/opzet.ts";
import type { Pad } from "../../../rapport/pad.ts";

/** Zoekt een knoop in de vaste opzet op id, diepte eerst. */
export function vindKnoop(id: string, lijst: readonly Knoop[] = OPZET): Knoop | undefined {
  for (const k of lijst) {
    if (k.id === id) return k;
    const dieper = k.kinderen ? vindKnoop(id, k.kinderen) : undefined;
    if (dieper) return dieper;
  }
  return undefined;
}

/**
 * De waarde op `pad`, of undefined als een tussenstap ontbreekt of geen object
 * is. De leestegenhanger van zetOpPad: een structurele wijziging (rij
 * toevoegen, verwijderen, verplaatsen) moet de lijst van dát moment hebben,
 * niet die van de laatste render.
 */
export function opPad(obj: unknown, pad: Pad): unknown {
  let hier: unknown = obj;
  for (const stap of pad) {
    if (hier === null || typeof hier !== "object") return undefined;
    hier = (hier as Record<string | number, unknown>)[stap];
  }
  return hier;
}

/**
 * Een kopie van `lijst` waarin element `i` één plek omhoog (-1) of omlaag (1)
 * staat. Aan de rand blijft alles staan. Het is altijd een nieuwe lijst, zodat
 * de store een wijziging ziet.
 */
export function verplaatst<T>(lijst: readonly T[], i: number, richting: -1 | 1): T[] {
  const uit = [...lijst];
  const j = i + richting;
  if (i < 0 || i >= uit.length || j < 0 || j >= uit.length) return uit;
  [uit[i], uit[j]] = [uit[j], uit[i]];
  return uit;
}

/** Een getal in Nederlandse notatie, of "—" als er (nog) geen getal is. */
export function getalTekst(v: number | null | undefined, dec: number, trim = false): string {
  return typeof v === "number" && Number.isFinite(v) ? fmt(v, dec, trim) : "—";
}

/** De eerste niet-lege regel van een tekst, ingekort voor in een keuzemenu. */
export function uittreksel(tekst: string, max = 80): string {
  const regel = tekst.split("\n").map((r) => r.trim()).find((r) => r !== "") ?? "";
  return regel.length > max ? `${regel.slice(0, max - 1)}…` : regel;
}

/** Letter van de i-de eigen bijlage: 0 → "B", 24 → "Z", 25 → "AA" (zelfde reeks als opzet.ts). */
export function bijlageLetter(index: number): string {
  let n = index + 1;
  let s = "";
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
}

/** De eerste familie uit een CSS font-family: '"Segoe UI", Arial' → "Segoe UI". */
export function lettertypeNaam(fontFamily: string): string {
  return (fontFamily.split(",")[0] ?? "").replace(/["']/g, "").trim();
}

/** Adres, postcode en plaats op één regel; lege delen vallen weg. */
export function adresRegel(b: BureauProfiel): string {
  const plaats = [b.postcode, b.plaats].map((s) => s.trim()).filter((s) => s !== "").join(" ");
  return [b.adres.trim(), plaats].filter((s) => s !== "").join(", ");
}

const PROFIELVELDEN = [
  "naam",
  "adres",
  "postcode",
  "plaats",
  "telefoon",
  "email",
  "logo",
  "voetafbeelding",
] as const;
const STIJLVELDEN = ["hoofdkleur", "accentkleur", "tabeltekst", "invoerkleur", "lettertype"] as const;

/**
 * Zijn twee bureauprofielen inhoudelijk gelijk?
 *
 * Per veld en niet via JSON.stringify: de volgorde van de sleutels hangt af
 * van waar het object vandaan komt (projectbestand of instellingen), en de
 * afbeeldingen zijn data-URL's van honderden kilobytes die je niet bij elke
 * toetsaanslag wilt serialiseren. Een ongewijzigde afbeelding is dezelfde
 * string, en die vergelijking is direct klaar.
 */
export function zelfdeBureau(a: BureauProfiel, b: BureauProfiel): boolean {
  if (PROFIELVELDEN.some((v) => a[v] !== b[v])) return false;
  if (STIJLVELDEN.some((v) => a.huisstijl[v] !== b.huisstijl[v])) return false;
  if (a.constructeurs.length !== b.constructeurs.length) return false;
  return a.constructeurs.every((c, i) => {
    const d = b.constructeurs[i];
    return c.naam === d.naam && c.telefoon === d.telefoon && c.email === d.email;
  });
}
```

- [ ] **Step 4: Draai het controlescript opnieuw**

Run: `node scripts/check-rapportpaneel.mjs`

Expected: PASS — 29 regels `OK`, geen `FOUT`, als laatste regel
`Rapportpaneel: alle hulpfuncties kloppen.` en exitcode 0.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop`

Expected: geen uitvoer, exitcode 0.

- [ ] **Step 6: Commit**

```powershell
git add packages/desktop/src/components/rapport/paneel/hulp.ts scripts/check-rapportpaneel.mjs
git commit -m @'
feat(rapport): hulpfuncties voor het rapportpaneel met controlescript

Knopen opzoeken in de opzet, een lijst op een pad lezen, rijen
verplaatsen, getallen en teksten opmaken en twee bureauprofielen per
veld vergelijken. Los van React, zodat check-rapportpaneel ze direct
in Node toetst.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 14: Rapportpaneel met bouwstenen, Document en Revisies

**Files:**
- Create: `packages/desktop/src/components/rapport/paneel/velden.tsx`
- Create: `packages/desktop/src/components/rapport/paneel/RijenTabel.tsx`
- Create: `packages/desktop/src/components/rapport/paneel/DocumentSectie.tsx`
- Create: `packages/desktop/src/components/rapport/paneel/RevisieSectie.tsx`
- Create: `packages/desktop/src/components/rapport/RapportPanel.tsx`
- Create: `packages/desktop/src/components/rapport/RapportPanel.css` (volledig, ook de klassen die
  de secties van Task 16–19 gebruiken)

**Interfaces:**
- Consumes: `useProjectStore` (`rapport`, `gegevens`, `exemplaren`, `selecteer`,
  `zetRapportVeld(pad: string, waarde: string | boolean)`, `werkRapportBij(fn: (r: Rapport) => Rapport)`),
  `PROJECT_ID`; `bouwOpzet(r, bladen)`, `Rapportknoop` (opzet.ts); `leesPad`, `zetOpPad` (pad.ts);
  `FASEN`, `Fase`, `REVISIE_STATUSSEN`, `Revisie` (model.ts); `volgendeCode`, `datumTekst`,
  `rapportStatus` (revisies.ts); `vindKnoop`, `opPad`, `verplaatst` (hulp.ts, Task 13);
  `useBureauStore((s) => s.profiel)` (store/bureauProfiel.ts, Task 7).
  Aanname over `bouwOpzet`: een knoop die wegvalt staat niet in de boom, en een paragraaf per blad
  draagt `blad.id` = exemplaar-id.
- Produces:
  - `RapportPanel` (default export, geen props) — Task 15 rendert dit bij `RAPPORT_ID`.
  - `paneel/velden.tsx`: `interface Optie { waarde: string; label: string }`, `useRapport(): Rapport`,
    `interface OpzetStand { nummer(id): string; valtWeg(id): boolean; blad(exemplaarId): { nummer: string; bijlage: string } | undefined }`,
    `useOpzetStand(): OpzetStand`, `OpzetBron({ children })`,
    `Sectie({ id, titel, hoofdstuk?, intro?, children })` (zet `data-sectie={id}`),
    `Kop({ id })`, `NieuwePagina({ id })`,
    `Veld({ label, pad, waarde, hint?, placeholder?, lijst?, eenheid? })`,
    `Keuze({ label, pad, waarde, opties, hint? })`, `Vink({ label, pad, aan, hint? })`,
    `GroeiVeld({ waarde, onChange, placeholder?, rijen? })`, `TekstVak({ pad, waarde, placeholder?, rijen? })`,
    `interface AfgeleideRegel { label: ReactNode; waarde: ReactNode; bron?: string }`,
    `Afgeleid({ regels, uitProjectgegevens? })`, `NaarProjectgegevens()`.
  - `paneel/RijenTabel.tsx`: default `RijenTabel<T extends object>(props: RijenTabelProps<T>)`,
    `interface Kolom<T> { sleutel; kop; breedte?; placeholder?; lijst?; keuzes?: readonly Optie[]; getal? }`,
    `interface Extrakolom<T> { kop; breedte?; waarde(rij: T, index: number): ReactNode }`,
    `interface RijenTabelProps<T> { pad; rijen; kolommen; nieuweRij(rijen): T; toevoegen?; extra?; voet?; leeg?; verplaatsbaar?; minimaal? }`.
  - `paneel/DocumentSectie.tsx`, `paneel/RevisieSectie.tsx` (default exports, geen props).

- [ ] **Step 1: Schrijf de bouwstenen `velden.tsx`**

```tsx
import {
  Fragment,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { bouwOpzet, type Rapportknoop } from "../../../rapport/opzet";
import { PROJECT_ID, useProjectStore } from "../../../store/projectStore";
import { vindKnoop } from "./hulp";

/**
 * Bouwstenen van het rapportpaneel: velden die aan een pad in het rapport
 * hangen, afgeleide waarden, koppen uit de opzet en de omlijsting van een
 * sectie.
 *
 * Invoer gaat via `zetRapportVeld(pad, …)`. Het pad is ook de sleutel van de
 * geschiedenis: doortypen in één veld is één stap ongedaan maken, net als in
 * de projectgegevens. Toevoegen, verwijderen en verplaatsen gaan via
 * `werkRapportBij` en zijn elk een eigen stap.
 */

export interface Optie {
  waarde: string;
  label: string;
}

/** Het rapport van het open project. */
export function useRapport() {
  return useProjectStore((s) => s.rapport);
}

// ─── Nummering zoals in het rapport ────────────────────────────────────

/** Hoe de vaste opzet in dít rapport uitvalt. */
export interface OpzetStand {
  /** Het nummer zoals in het rapport ("4.6"); "" voor blokken en voor wat wegvalt. */
  nummer: (id: string) => string;
  /** true als de knoop niet in het rapport komt: leeg en optioneel, of uitgezet. */
  valtWeg: (id: string) => boolean;
  /** Paragraaf- en bijlagenummer van een rekenblad in hoofdstuk Berekeningen. */
  blad: (exemplaarId: string) => { nummer: string; bijlage: string } | undefined;
}

const GEEN_STAND: OpzetStand = {
  nummer: () => "",
  valtWeg: () => false,
  blad: () => undefined,
};

const OpzetContext = createContext<OpzetStand>(GEEN_STAND);

/** De stand van de opzet; zie OpzetBron. */
export function useOpzetStand(): OpzetStand {
  return useContext(OpzetContext);
}

/**
 * Rekent één keer per wijziging uit hoe de opzet in dit rapport uitvalt, en
 * geeft dat door aan alle koppen eronder.
 *
 * Het paneel toont altijd de hele opzet — ook een leeg optioneel blok moet je
 * kunnen invullen — maar de nummers volgen wat er werkelijk in het rapport
 * komt. Staat 4.6 Bestaande situatie uit, dan heet Trillingen hier 4.6, net
 * als op papier.
 */
export function OpzetBron({ children }: { children: ReactNode }) {
  const rapport = useRapport();
  const exemplaren = useProjectStore((s) => s.exemplaren);
  const stand = useMemo<OpzetStand>(() => {
    const nummers = new Map<string, string>();
    const bladen = new Map<string, { nummer: string; bijlage: string }>();
    const loop = (lijst: Rapportknoop[]) => {
      for (const k of lijst) {
        nummers.set(k.id, k.nummer);
        if (k.blad) bladen.set(k.blad.id, { nummer: k.nummer, bijlage: k.blad.bijlage });
        loop(k.kinderen);
      }
    };
    loop(bouwOpzet(rapport, exemplaren.map((e) => ({ id: e.id, naam: e.naam }))));
    return {
      nummer: (id) => nummers.get(id) ?? "",
      valtWeg: (id) => !nummers.has(id),
      blad: (id) => bladen.get(id),
    };
  }, [rapport, exemplaren]);
  return <OpzetContext.Provider value={stand}>{children}</OpzetContext.Provider>;
}

// ─── Omlijsting en koppen ──────────────────────────────────────────────

/**
 * Eén sectie van het paneel. Met `hoofdstuk` is het een hoofdstuk van het
 * rapport: dan staat het nummer voor de titel en de keuze voor een nieuwe
 * pagina erachter.
 */
export function Sectie({ id, titel, hoofdstuk, intro, children }: {
  /** Voor de sprongbalk bovenaan het paneel (data-sectie). */
  id: string;
  titel: string;
  /** Id van het hoofdstuk in de opzet. */
  hoofdstuk?: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  const stand = useOpzetStand();
  const nummer = hoofdstuk ? stand.nummer(hoofdstuk) : "";
  return (
    <section className="rapport-groep" data-sectie={id}>
      <div className="rapport-groep-kop">
        <h2>
          {nummer && <span className="rapport-nummer">{nummer}</span>}
          {titel}
        </h2>
        {hoofdstuk && <NieuwePagina id={hoofdstuk} />}
      </div>
      {intro && <p className="rapport-intro">{intro}</p>}
      {children}
    </section>
  );
}

const KOPTAGS = ["h3", "h4", "h5", "h6"] as const;

/**
 * De kop van een knoop uit de opzet, met het nummer dat hij in dit rapport
 * krijgt. Valt de knoop weg, dan staat dat erbij: zo zie je waarom de
 * nummering verderop verspringt.
 */
export function Kop({ id }: { id: string }) {
  const stand = useOpzetStand();
  const knoop = vindKnoop(id);
  const niveau = knoop?.niveau ?? 2;
  const Tag = KOPTAGS[niveau - 1];
  const nummer = stand.nummer(id);
  return (
    <div className={`rapport-kop-rij rapport-kop-${niveau}`}>
      <Tag className="rapport-kopregel">
        {nummer && <span className="rapport-nummer">{nummer}</span>}
        {knoop?.titel ?? id}
      </Tag>
      {stand.valtWeg(id) && (
        <span className="rapport-weg" title="Leeg of uitgezet: dit onderdeel komt niet in het rapport.">
          valt weg
        </span>
      )}
      {niveau <= 2 && <NieuwePagina id={id} />}
    </div>
  );
}

/**
 * Of een hoofdstuk of paragraaf op een nieuwe pagina begint. Zonder eigen
 * keuze geldt de standaard uit de opzet; een klik legt de keuze vast in dit
 * rapport.
 */
export function NieuwePagina({ id }: { id: string }) {
  const eigen = useProjectStore((s) => s.rapport.nieuwePagina[id]);
  const zet = useProjectStore((s) => s.zetRapportVeld);
  const aan = eigen ?? vindKnoop(id)?.nieuwePagina ?? false;
  return (
    <label className="rapport-vink rapport-nieuwe-pagina">
      <input
        type="checkbox"
        checked={aan}
        onChange={(e) => zet(`nieuwePagina.${id}`, e.target.checked)}
      />
      begint op nieuwe pagina
    </label>
  );
}

// ─── Velden ────────────────────────────────────────────────────────────

/** Een tekstregel van het rapport, gebonden aan `pad`. */
export function Veld({ label, pad, waarde, hint, placeholder, lijst, eenheid }: {
  label: ReactNode;
  pad: string;
  waarde: string;
  hint?: ReactNode;
  placeholder?: string;
  /** Id van een <datalist> met suggesties; eigen tekst blijft mogelijk. */
  lijst?: string;
  eenheid?: string;
}) {
  const zet = useProjectStore((s) => s.zetRapportVeld);
  return (
    <label className="rapport-veld">
      <span className="rapport-label">{label}</span>
      <span className="rapport-invoer">
        <input
          type="text"
          value={waarde}
          placeholder={placeholder}
          list={lijst}
          onChange={(e) => zet(pad, e.target.value)}
        />
        {eenheid && <span className="rapport-eenheid">{eenheid}</span>}
      </span>
      {hint && <span className="rapport-hint">{hint}</span>}
    </label>
  );
}

/**
 * Een keuzelijst van het rapport. Staat er een waarde die niet (meer) in de
 * lijst voorkomt — een constructeur die uit het bureau verdween — dan blijft
 * die zichtbaar, in plaats van stil op de eerste keuze te springen.
 */
export function Keuze({ label, pad, waarde, opties, hint }: {
  label: ReactNode;
  pad: string;
  waarde: string;
  opties: readonly Optie[];
  hint?: ReactNode;
}) {
  const zet = useProjectStore((s) => s.zetRapportVeld);
  const bekend = opties.some((o) => o.waarde === waarde);
  return (
    <label className="rapport-veld">
      <span className="rapport-label">{label}</span>
      <select value={waarde} onChange={(e) => zet(pad, e.target.value)}>
        {!bekend && <option value={waarde}>{waarde} (niet in de lijst)</option>}
        {opties.map((o) => (
          <option key={o.waarde} value={o.waarde}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="rapport-hint">{hint}</span>}
    </label>
  );
}

/** Een aan/uit-keuze van het rapport. */
export function Vink({ label, pad, aan, hint }: {
  label: ReactNode;
  pad: string;
  aan: boolean;
  hint?: ReactNode;
}) {
  const zet = useProjectStore((s) => s.zetRapportVeld);
  return (
    <div className="rapport-veld">
      <label className="rapport-vink rapport-vink-sterk">
        <input type="checkbox" checked={aan} onChange={(e) => zet(pad, e.target.checked)} />
        {label}
      </label>
      {hint && <span className="rapport-hint">{hint}</span>}
    </div>
  );
}

/**
 * Zet een tekstvak op de hoogte van zijn inhoud. Eerst terug naar "auto",
 * anders kan het niet krimpen; dat maakt het paneel heel even korter en dan
 * springt de scrollpositie, dus die houden we vast. De 2 px zijn de randen
 * (box-sizing: border-box).
 */
function pasHoogteAan(el: HTMLTextAreaElement) {
  const paneel = el.closest(".rapport-panel");
  const scroll = paneel?.scrollTop ?? 0;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + 2}px`;
  if (paneel) paneel.scrollTop = scroll;
}

/**
 * Een tekstvak dat meegroeit met zijn inhoud: een alinea van tien regels is
 * ook tien regels hoog, zodat je niet in een postzegel zit te scrollen.
 * Wordt het paneel smaller of breder, dan lopen de regels anders en past de
 * hoogte zich opnieuw aan.
 */
export function GroeiVeld({ waarde, onChange, placeholder, rijen = 2 }: {
  waarde: string;
  onChange: (waarde: string) => void;
  placeholder?: string;
  rijen?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (ref.current) pasHoogteAan(ref.current);
  }, [waarde]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Alleen op een andere breedte: de hoogte zetten we zelf, en daarop
    // reageren zou een lus geven.
    let breedte = el.clientWidth;
    const waarnemer = new ResizeObserver(() => {
      if (el.clientWidth === breedte) return;
      breedte = el.clientWidth;
      pasHoogteAan(el);
    });
    waarnemer.observe(el);
    return () => waarnemer.disconnect();
  }, []);

  return (
    <textarea
      ref={ref}
      className="rapport-tekstvak"
      rows={rijen}
      value={waarde}
      placeholder={placeholder}
      spellCheck
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** Een meegroeiend tekstvak gebonden aan `pad`. */
export function TekstVak({ pad, waarde, placeholder, rijen }: {
  pad: string;
  waarde: string;
  placeholder?: string;
  rijen?: number;
}) {
  const zet = useProjectStore((s) => s.zetRapportVeld);
  return (
    <GroeiVeld waarde={waarde} onChange={(v) => zet(pad, v)} placeholder={placeholder} rijen={rijen} />
  );
}

// ─── Afgeleide waarden ─────────────────────────────────────────────────

export interface AfgeleideRegel {
  label: ReactNode;
  waarde: ReactNode;
  /** Normverwijzing of herkomst, klein en cursief erachter. */
  bron?: string;
}

/**
 * Waarden die volgen uit de projectgegevens of de norm: grijs en niet te
 * bewerken. Ze worden niet opgeslagen maar bij het opmaken opnieuw berekend,
 * zodat rapport en rekenbladen nooit uit de pas lopen.
 */
export function Afgeleid({ regels, uitProjectgegevens = false }: {
  regels: readonly AfgeleideRegel[];
  /** Toont een link naar de projectgegevens, waar deze waarden vandaan komen. */
  uitProjectgegevens?: boolean;
}) {
  return (
    <div className="rapport-afgeleid">
      <dl>
        {regels.map((r, i) => (
          <Fragment key={i}>
            <dt>{r.label}</dt>
            <dd>
              {r.waarde}
              {r.bron && <span className="rapport-bron">{r.bron}</span>}
            </dd>
          </Fragment>
        ))}
      </dl>
      {uitProjectgegevens && <NaarProjectgegevens />}
    </div>
  );
}

/** Springt naar het formulier Projectgegevens in de projectboom. */
export function NaarProjectgegevens() {
  const selecteer = useProjectStore((s) => s.selecteer);
  return (
    <button type="button" className="rapport-link" onClick={() => selecteer(PROJECT_ID)}>
      Wijzigen in Projectgegevens →
    </button>
  );
}
```

- [ ] **Step 2: Schrijf de generieke tabel `RijenTabel.tsx`**

```tsx
import type { ReactNode } from "react";
import { leesPad, zetOpPad } from "../../../rapport/pad";
import { useProjectStore } from "../../../store/projectStore";
import { opPad, verplaatst } from "./hulp";
import type { Optie } from "./velden";

/**
 * Een bewerkbare tabel van rijen in het rapport: revisies, materialen,
 * windcoëfficiënten, de lagen van een opbouw.
 *
 * Typen in een cel gaat per cel via zetRapportVeld ("…materialen.2.soort"),
 * zodat doortypen één stap ongedaan maken is. Toevoegen, verwijderen en
 * verplaatsen gaan via werkRapportBij en lezen de lijst uit het rapport van
 * dát moment, niet uit de laatste render: twee snelle klikken op "toevoegen"
 * geven dan ook echt twee rijen.
 */

export interface Kolom<T> {
  sleutel: Extract<keyof T, string>;
  kop: ReactNode;
  /** CSS-breedte, bijv. "6em" of "30%"; zonder breedte deelt de kolom de rest. */
  breedte?: string;
  placeholder?: string;
  /** Id van een <datalist> met suggesties. */
  lijst?: string;
  /** Vaste keuzes: een keuzelijst in plaats van een tekstveld. */
  keuzes?: readonly Optie[];
  /** Een getal: rechts uitgelijnd. */
  getal?: boolean;
}

/** Een kolom die niet bewerkt wordt maar uit de rij volgt, zoals P_rep of een berekende p. */
export interface Extrakolom<T> {
  kop: ReactNode;
  breedte?: string;
  waarde: (rij: T, index: number) => ReactNode;
}

export interface RijenTabelProps<T> {
  /** Pad van de lijst in het rapport, bijv. "uitgangspunten.materialen". */
  pad: string;
  rijen: readonly T[];
  kolommen: readonly Kolom<T>[];
  /** De rij die "toevoegen" maakt; krijgt de huidige lijst mee, voor een volgende revisiecode. */
  nieuweRij: (rijen: readonly T[]) => T;
  /** Tekst op de toevoegknop. */
  toevoegen?: string;
  extra?: readonly Extrakolom<T>[];
  /** Onder de tabel, bijvoorbeeld een som. */
  voet?: ReactNode;
  /** Tekst in een lege tabel. */
  leeg?: string;
  /** Knoppen om rijen te verplaatsen; uit voor een lijst met een vaste volgorde. */
  verplaatsbaar?: boolean;
  /** Bij dit aantal rijen of minder kan er geen rij meer weg. */
  minimaal?: number;
}

export default function RijenTabel<T extends object>({
  pad,
  rijen,
  kolommen,
  nieuweRij,
  toevoegen = "Rij toevoegen",
  extra = [],
  voet,
  leeg = "Nog geen regels.",
  verplaatsbaar = true,
  minimaal = 0,
}: RijenTabelProps<T>) {
  const zet = useProjectStore((s) => s.zetRapportVeld);
  const werkBij = useProjectStore((s) => s.werkRapportBij);

  const wijzig = (fn: (lijst: T[]) => T[]) =>
    werkBij((r) => {
      const stappen = leesPad(pad);
      const huidig = opPad(r, stappen);
      return zetOpPad(r, stappen, fn(Array.isArray(huidig) ? (huidig as T[]) : []));
    });

  return (
    <div className="rapport-rijen">
      <table className="rapport-tabel">
        <thead>
          <tr>
            {kolommen.map((k) => (
              <th
                key={k.sleutel}
                style={{ width: k.breedte }}
                className={k.getal ? "rapport-getal" : undefined}
              >
                {k.kop}
              </th>
            ))}
            {extra.map((x, j) => (
              <th key={`extra-${j}`} style={{ width: x.breedte }} className="rapport-getal">
                {x.kop}
              </th>
            ))}
            <th style={{ width: verplaatsbaar ? "74px" : "30px" }} aria-label="Bewerken" />
          </tr>
        </thead>
        <tbody>
          {rijen.length === 0 && (
            <tr>
              <td colSpan={kolommen.length + extra.length + 1} className="rapport-tabel-leeg">
                {leeg}
              </td>
            </tr>
          )}
          {rijen.map((rij, i) => (
            <tr key={i}>
              {kolommen.map((k) => {
                const waarde = String(rij[k.sleutel] ?? "");
                const celPad = `${pad}.${i}.${k.sleutel}`;
                return (
                  <td key={k.sleutel}>
                    {k.keuzes ? (
                      <select value={waarde} onChange={(e) => zet(celPad, e.target.value)}>
                        {!k.keuzes.some((o) => o.waarde === waarde) && (
                          <option value={waarde}>{waarde}</option>
                        )}
                        {k.keuzes.map((o) => (
                          <option key={o.waarde} value={o.waarde}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={waarde}
                        placeholder={k.placeholder}
                        list={k.lijst}
                        className={k.getal ? "rapport-getal" : undefined}
                        onChange={(e) => zet(celPad, e.target.value)}
                      />
                    )}
                  </td>
                );
              })}
              {extra.map((x, j) => (
                <td key={`extra-${j}`} className="rapport-tabel-afgeleid">
                  {x.waarde(rij, i)}
                </td>
              ))}
              <td className="rapport-tabel-knoppen">
                {verplaatsbaar && (
                  <>
                    <button
                      type="button"
                      className="rapport-icoon"
                      title="Omhoog"
                      disabled={i === 0}
                      onClick={() => wijzig((l) => verplaatst(l, i, -1))}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="rapport-icoon"
                      title="Omlaag"
                      disabled={i === rijen.length - 1}
                      onClick={() => wijzig((l) => verplaatst(l, i, 1))}
                    >
                      ↓
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="rapport-icoon"
                  title="Rij verwijderen"
                  disabled={rijen.length <= minimaal}
                  onClick={() => wijzig((l) => l.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {voet}
      <button type="button" className="rapport-knop" onClick={() => wijzig((l) => [...l, nieuweRij(l)])}>
        + {toevoegen}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Schrijf `DocumentSectie.tsx`**

```tsx
import { FASEN, type Fase } from "../../../rapport/model";
import { useBureauStore } from "../../../store/bureauProfiel";
import { useProjectStore } from "../../../store/projectStore";
import { Afgeleid, Keuze, Sectie, TekstVak, Veld, useRapport, type Optie } from "./velden";

/** Suggesties voor de rapporttitel; een eigen titel typen kan altijd. */
const TITELS = [
  "Constructieadvies & berekeningen",
  "Constructieve berekening",
  "Constructief advies",
  "Constructieve berekeningen en tekeningen",
  "Beoordeling bestaande constructie",
];

const FASE_NAMEN: Record<Fase, string> = {
  "": "niet vermelden",
  SO: "schetsontwerp",
  VO: "voorlopig ontwerp",
  DO: "definitief ontwerp",
  TO: "technisch ontwerp",
  UO: "uitvoeringsontwerp",
};

const FASE_OPTIES: Optie[] = [
  { waarde: "", label: "— (niet vermelden)" },
  ...FASEN.map((f) => ({ waarde: f, label: `${f} — ${FASE_NAMEN[f]}` })),
];

/**
 * Sectie Document: wat op het voorblad staat en niet al in de
 * projectgegevens zit.
 */
export default function DocumentSectie() {
  const rapport = useRapport();
  const gegevens = useProjectStore((s) => s.gegevens);
  const profiel = useBureauStore((s) => s.profiel);

  // Zelfde bureau als op papier: het vastgelegde, of zolang dat leeg is het profiel.
  const bureau = rapport.bureau.naam ? rapport.bureau : profiel;
  const namen = bureau.constructeurs.map((c) => c.naam.trim()).filter((n) => n !== "");
  const constructeurs: Optie[] = [
    { waarde: "", label: "—" },
    ...namen.map((n) => ({ waarde: n, label: n })),
  ];

  return (
    <Sectie
      id="document"
      titel="Document"
      intro="Wat op het voorblad staat. Projectnummer, projectnaam, opdrachtgever en locatie komen uit de projectgegevens."
    >
      <Veld
        label="Titel"
        pad="titel"
        waarde={rapport.titel}
        lijst="rapport-titels"
        hint="Kies een suggestie of typ een eigen titel. De projectnaam komt eronder als ondertitel."
      />
      <datalist id="rapport-titels">
        {TITELS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <div className="rapport-rij">
        <Veld label="Documentkenmerk" pad="kenmerk" waarde={rapport.kenmerk} placeholder="bijv. 2026-001-C01" />
        <Keuze label="Fase in bouwproces" pad="fase" waarde={rapport.fase} opties={FASE_OPTIES} />
      </div>
      <Veld label="Toegepaste normen" pad="normen" waarde={rapport.normen} />
      <div className="rapport-rij">
        <Keuze
          label="Verantwoordelijk constructeur"
          pad="verantwoordelijk"
          waarde={rapport.verantwoordelijk}
          opties={constructeurs}
        />
        <Keuze
          label="Uitvoerend constructeur"
          pad="uitvoerend"
          waarde={rapport.uitvoerend}
          opties={constructeurs}
        />
      </div>
      {namen.length === 0 && (
        <p className="rapport-hint">
          Dit rapport heeft nog geen constructeurs. Vul ze in bij Instellingen → Bureau en werk het
          rapport bij in de sectie Bureau onderaan.
        </p>
      )}
      <label className="rapport-veld">
        <span className="rapport-label">Adresregels opdrachtgever</span>
        <TekstVak
          pad="opdrachtgeverAdres"
          waarde={rapport.opdrachtgeverAdres}
          placeholder={"Straat en huisnummer\nPostcode en plaats"}
        />
        <span className="rapport-hint">
          Eén adresregel per regel; ze komen op het voorblad onder de naam van de opdrachtgever.
        </span>
      </label>
      <Afgeleid
        uitProjectgegevens
        regels={[
          { label: "Projectnummer", waarde: gegevens.project_nummer || "—" },
          { label: "Projectnaam", waarde: gegevens.project_naam || "—" },
          { label: "Opdrachtgever", waarde: gegevens.opdrachtgever || "—" },
          { label: "Locatie", waarde: gegevens.locatie || "—" },
        ]}
      />
    </Sectie>
  );
}
```

- [ ] **Step 4: Schrijf `RevisieSectie.tsx`**

```tsx
import { REVISIE_STATUSSEN, type Revisie } from "../../../rapport/model";
import { datumTekst, rapportStatus, volgendeCode } from "../../../rapport/revisies";
import RijenTabel, { type Kolom } from "./RijenTabel";
import { Sectie, useRapport } from "./velden";

const KOLOMMEN: Kolom<Revisie>[] = [
  { sleutel: "code", kop: "Revisie", breedte: "5em" },
  { sleutel: "datum", kop: "Datum", breedte: "8.5em", placeholder: "dd-mm-jjjj" },
  { sleutel: "omschrijving", kop: "Omschrijving" },
  {
    sleutel: "status",
    kop: "Status",
    breedte: "9.5em",
    keuzes: REVISIE_STATUSSEN.map((s) => ({ waarde: s, label: s })),
  },
];

/** Een nieuwe revisie: de volgende code (A → B, 1 → 2) en de datum van vandaag. */
function nieuweRevisie(lijst: readonly Revisie[]): Revisie {
  return {
    code: volgendeCode([...lijst]),
    datum: datumTekst(new Date()),
    omschrijving: "",
    status: "concept",
  };
}

/**
 * Sectie Revisies. De eerste revisie geeft de eerste datum van het rapport,
 * de laatste de rapportstatus; beide staan op het voorblad.
 */
export default function RevisieSectie() {
  const revisies = useRapport().revisies;
  const status = rapportStatus(revisies);
  return (
    <Sectie
      id="revisies"
      titel="Revisies"
      intro="De eerste revisie geeft de 1ᵉ datum van het rapport, elke latere een regel Datum wijz. De laatste revisie bepaalt de rapportstatus op het voorblad."
    >
      <RijenTabel<Revisie>
        pad="revisies"
        rijen={revisies}
        kolommen={KOLOMMEN}
        verplaatsbaar={false}
        nieuweRij={nieuweRevisie}
        toevoegen="Revisie toevoegen"
        leeg="Nog geen revisies: het voorblad laat datum en status dan leeg."
      />
      <p className="rapport-hint">
        Rapportstatus: <strong>{status || "—"}</strong>
      </p>
    </Sectie>
  );
}
```

- [ ] **Step 5: Schrijf `RapportPanel.tsx`**

```tsx
import { useRef } from "react";
import DocumentSectie from "./paneel/DocumentSectie";
import RevisieSectie from "./paneel/RevisieSectie";
import { OpzetBron } from "./paneel/velden";
import "./RapportPanel.css";

/**
 * Het rapportpaneel: één scrollend formulier met alles wat in het
 * constructierapport komt en niet al in de projectgegevens of de rekenbladen
 * staat.
 *
 * Wat je hier invult hoort bij het project: het gaat mee in het
 * projectbestand en in ongedaan maken. Grijze waarden volgen uit de
 * projectgegevens of de norm en worden pas bij het opmaken berekend, zodat
 * rapport en rekenbladen nooit uit de pas lopen. De tab Afdrukvoorbeeld
 * ernaast toont het hele rapport.
 */

/** De secties in volgorde, voor de sprongbalk bovenaan. */
const SECTIES: readonly [id: string, label: string][] = [
  ["document", "Document"],
  ["revisies", "Revisies"],
];

export default function RapportPanel() {
  const paneelRef = useRef<HTMLDivElement>(null);

  const naarSectie = (id: string) =>
    paneelRef.current
      ?.querySelector(`[data-sectie="${id}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="rapport-panel" ref={paneelRef}>
      <div className="rapport-kop">
        <h1>Rapport</h1>
        <p>
          Documentgegevens, teksten, uitgangspunten en belastingen van het constructierapport. Alles
          hier hoort bij het project en gaat mee in opslaan en ongedaan maken. Grijze waarden komen uit
          de projectgegevens of de norm.
        </p>
      </div>

      <nav className="rapport-nav" aria-label="Secties van het rapport">
        {SECTIES.map(([id, label]) => (
          <button key={id} type="button" onClick={() => naarSectie(id)}>
            {label}
          </button>
        ))}
      </nav>

      <OpzetBron>
        <DocumentSectie />
        <RevisieSectie />
      </OpzetBron>

      <p className="rapport-voet">
        Het bureauprofiel — naam, logo, huisstijl en constructeurs — staat bij Instellingen → Bureau.
        Rapport (PDF) in het lint drukt het hele rapport af; PDF blad blijft één losse berekening.
      </p>
    </div>
  );
}
```

- [ ] **Step 6: Schrijf `RapportPanel.css`**

```css
/*
 * Rapportpaneel — één scrollend formulier met de invoer van het
 * constructierapport. Dezelfde tokens en maten als het formulier van de
 * projectgegevens (ProjectGegevensPanel.css), aangevuld met wat daar niet
 * bestaat: tekstvakken die meegroeien, bewerkbare tabellen, kaarten voor
 * belastingklassen, opbouwen en rekenbladen, en het keuzemenu voor
 * standaardteksten.
 */

.rapport-panel {
  height: 100%;
  overflow-y: auto;
  padding: 0 32px 48px;
  background: var(--theme-bg);
  color: var(--theme-text);
  font-family: var(--font-body);
}

/* ─── Kop en sprongbalk ───────────────────────────────────────── */

.rapport-kop {
  max-width: 760px;
  padding-top: 24px;
  margin-bottom: 4px;
}

.rapport-kop h1 {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 600;
}

.rapport-kop p {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--theme-text-secondary);
}

/* Blijft bovenaan staan bij het scrollen; secties houden er ruimte voor vrij. */
.rapport-nav {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 760px;
  margin-bottom: 22px;
  padding: 10px 0;
  background: var(--theme-bg);
  border-bottom: 1px solid var(--theme-border-subtle, rgba(217, 119, 6, 0.15));
}

.rapport-nav button {
  padding: 3px 10px;
  font-size: 11.5px;
  color: var(--theme-text-secondary);
  background: transparent;
  border: 1px solid var(--theme-border-subtle, rgba(217, 119, 6, 0.2));
  border-radius: 12px;
  cursor: pointer;
}

.rapport-nav button:hover {
  color: var(--theme-accent, #d97706);
  border-color: var(--theme-accent, #d97706);
}

/* ─── Secties ─────────────────────────────────────────────────── */

.rapport-groep {
  max-width: 760px;
  margin-bottom: 36px;
  scroll-margin-top: 56px;
}

.rapport-groep-kop {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.rapport-groep-kop h2 {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--theme-accent, #d97706);
}

.rapport-intro {
  margin: 0 0 14px;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--theme-text-secondary);
}

/* ─── Koppen uit de opzet: hoofdstuk, paragraaf, blok, subblok ── */

.rapport-knoop {
  margin-top: 16px;
}

.rapport-niveau-1 {
  margin-top: 24px;
  padding-top: 14px;
  border-top: 1px solid var(--theme-border-subtle, rgba(217, 119, 6, 0.15));
}

.rapport-niveau-3,
.rapport-niveau-4 {
  padding-left: 14px;
  border-left: 2px solid var(--theme-border-subtle, rgba(217, 119, 6, 0.15));
}

.rapport-kop-rij {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  min-width: 0;
  margin-bottom: 6px;
}

.rapport-kopregel {
  margin: 0;
  font-family: var(--font-heading);
  letter-spacing: -0.01em;
  color: var(--theme-text);
}

.rapport-kop-1 .rapport-kopregel {
  font-size: 15px;
  font-weight: 600;
}

.rapport-kop-2 .rapport-kopregel {
  font-size: 13px;
  font-weight: 600;
}

.rapport-kop-3 .rapport-kopregel {
  font-size: 12px;
  font-weight: 600;
}

.rapport-kop-4 .rapport-kopregel {
  font-size: 12px;
  font-weight: 600;
  font-style: italic;
}

.rapport-nummer {
  margin-right: 8px;
  font-variant-numeric: tabular-nums;
  color: var(--theme-accent, #d97706);
}

.rapport-weg {
  padding: 0 7px;
  font-size: 10px;
  line-height: 16px;
  color: var(--theme-text-secondary);
  border: 1px dashed var(--theme-border-subtle, rgba(217, 119, 6, 0.3));
  border-radius: 8px;
}

.rapport-nieuwe-pagina {
  margin-left: auto;
}

.rapport-subkop {
  margin: 14px 0 6px;
  font-family: var(--font-body);
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--theme-text-secondary);
}

/* ─── Velden ──────────────────────────────────────────────────── */

.rapport-veld {
  display: block;
  min-width: 0;
  margin-bottom: 12px;
}

/* Blok en geen flex: een label met <sub> (c_s c_d) moet één regel tekst blijven. */
.rapport-label {
  display: block;
  margin-bottom: 3px;
  font-size: 12px;
  font-weight: 500;
}

.rapport-invoer {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rapport-eenheid {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--theme-text-secondary);
}

.rapport-panel input[type="text"],
.rapport-panel select,
.rapport-panel textarea {
  width: 100%;
  min-width: 0;
  padding: 5px 8px;
  font-family: inherit;
  font-size: 12px;
  color: var(--theme-text);
  background: var(--theme-bg-lighter);
  border: 1px solid var(--theme-border-subtle, rgba(217, 119, 6, 0.2));
  border-radius: 4px;
}

.rapport-panel input[type="text"]:focus,
.rapport-panel select:focus,
.rapport-panel textarea:focus {
  outline: none;
  border-color: var(--theme-accent, #d97706);
}

.rapport-panel input::placeholder,
.rapport-panel textarea::placeholder {
  color: var(--theme-text-faint, rgba(0, 0, 0, 0.35));
}

/* Groeit mee via GroeiVeld; met de hand groter trekken mag ook. */
.rapport-tekstvak {
  display: block;
  line-height: 1.5;
  resize: vertical;
  overflow-y: hidden;
}

/* Velden naast elkaar; in een smal paneel vanzelf onder elkaar. */
.rapport-rij {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0 16px;
}

.rapport-hint {
  display: block;
  margin-top: 3px;
  font-size: 10.5px;
  line-height: 1.45;
  color: var(--theme-text-secondary);
}

p.rapport-hint {
  margin: 4px 0 12px;
}

.rapport-vink {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--theme-text-secondary);
  white-space: nowrap;
  cursor: pointer;
}

.rapport-vink-sterk {
  font-size: 12px;
  font-weight: 500;
  color: var(--theme-text);
}

.rapport-vink input {
  margin: 0;
  accent-color: var(--theme-accent, #d97706);
  cursor: pointer;
}

/* ─── Afgeleide waarden: grijs, niet te bewerken ──────────────── */

.rapport-afgeleid {
  margin: 2px 0 14px;
  padding: 8px 12px;
  background: var(--theme-bg-lighter);
  border-left: 2px solid var(--theme-border-subtle, rgba(217, 119, 6, 0.25));
  border-radius: 0 4px 4px 0;
}

.rapport-afgeleid dl {
  display: grid;
  grid-template-columns: minmax(150px, max-content) 1fr;
  gap: 3px 16px;
  font-size: 11.5px;
  line-height: 1.5;
}

.rapport-afgeleid dt {
  color: var(--theme-text-secondary);
}

.rapport-afgeleid dd {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--theme-text-secondary);
  user-select: text;
}

.rapport-bron {
  margin-left: 10px;
  font-family: var(--font-body);
  font-size: 10px;
  font-style: italic;
  color: var(--theme-text-faint, rgba(0, 0, 0, 0.4));
}

.rapport-afgeleid .rapport-link {
  margin-top: 6px;
}

.rapport-link {
  padding: 0;
  font-size: 11px;
  color: var(--theme-accent, #d97706);
  background: none;
  border: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

/* ─── Knoppen ─────────────────────────────────────────────────── */

.rapport-knop {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  padding: 4px 10px;
  font-size: 11.5px;
  color: var(--theme-text);
  background: transparent;
  border: 1px solid var(--theme-border-subtle, rgba(217, 119, 6, 0.25));
  border-radius: 4px;
  white-space: nowrap;
  cursor: pointer;
}

.rapport-knop:hover:not(:disabled) {
  color: var(--theme-accent, #d97706);
  border-color: var(--theme-accent, #d97706);
}

.rapport-knop:disabled {
  opacity: 0.45;
  cursor: default;
}

.rapport-knop-primair {
  font-weight: 600;
  color: var(--theme-btn-primary-text, #fff);
  background: var(--theme-btn-primary-bg, #d97706);
  border-color: transparent;
}

.rapport-knop-primair:hover:not(:disabled) {
  color: var(--theme-btn-primary-hover-text, #fff);
  background: var(--theme-btn-primary-hover-bg, #ea580c);
  border-color: transparent;
}

.rapport-knoppen {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.rapport-icoon {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  padding: 0;
  font-size: 11px;
  line-height: 1;
  color: var(--theme-text-secondary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  cursor: pointer;
}

.rapport-icoon:hover:not(:disabled) {
  color: var(--theme-accent, #d97706);
  background: var(--theme-hover, rgba(217, 119, 6, 0.1));
  border-color: var(--theme-border-subtle, rgba(217, 119, 6, 0.25));
}

.rapport-icoon:disabled {
  opacity: 0.3;
  cursor: default;
}

/* ─── Bewerkbare tabellen ─────────────────────────────────────── */

.rapport-rijen {
  margin: 4px 0 14px;
}

.rapport-tabel {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 12px;
}

.rapport-tabel th {
  padding: 0 3px 4px;
  font-size: 10.5px;
  font-weight: 600;
  text-align: left;
  color: var(--theme-text-secondary);
}

.rapport-tabel td {
  padding: 2px 3px;
  vertical-align: middle;
}

.rapport-panel .rapport-tabel input[type="text"],
.rapport-panel .rapport-tabel select {
  padding: 4px 6px;
}

.rapport-tabel th.rapport-getal,
.rapport-panel .rapport-tabel input.rapport-getal {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.rapport-tabel-afgeleid {
  font-family: var(--font-mono);
  font-size: 11px;
  text-align: right;
  white-space: nowrap;
  color: var(--theme-text-secondary);
}

.rapport-tabel-knoppen {
  text-align: right;
  white-space: nowrap;
}

.rapport-tabel-leeg {
  padding: 8px 3px;
  font-size: 11.5px;
  font-style: italic;
  color: var(--theme-text-secondary);
}

/* Som onder de berekende kolom: rechts, vóór de kolom met knoppen. */
.rapport-som {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin: 2px 0 0;
  padding: 4px 80px 0 3px;
  font-size: 11.5px;
  border-top: 1px solid var(--theme-border-subtle, rgba(217, 119, 6, 0.25));
}

.rapport-som strong {
  font-family: var(--font-mono);
  font-size: 11.5px;
}

/* ─── Kaarten: belastingklassen, opbouwen, rekenbladen ────────── */

.rapport-kaart {
  margin: 8px 0 12px;
  padding: 10px 12px;
  border: 1px solid var(--theme-border-subtle, rgba(217, 119, 6, 0.2));
  border-radius: 6px;
}

.rapport-kaart > :last-child {
  margin-bottom: 0;
}

.rapport-kaart-kop {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.rapport-panel .rapport-kaart-kop input[type="text"],
.rapport-panel .rapport-kaart-kop select {
  flex: 1;
  width: auto;
}

.rapport-kaart-titel {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rapport-kaart-voet {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 14px;
  margin-top: 8px;
}

.rapport-kaart-voet .rapport-hint {
  margin: 0;
}

.rapport-soort {
  flex-shrink: 0;
  font-size: 10.5px;
  color: var(--theme-text-secondary);
}

.rapport-opbouwgroep {
  margin-top: 10px;
}

.rapport-samenvatting {
  margin: 0 0 8px;
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--theme-text-secondary);
}

.rapport-oordeel {
  flex-shrink: 0;
  padding: 1px 8px;
  font-size: 10.5px;
  font-weight: 600;
  border-radius: 10px;
}

.rapport-oordeel.goed {
  color: #15803d;
  background: rgba(21, 128, 61, 0.12);
}

.rapport-oordeel.fout {
  color: var(--theme-danger-color, #b91c1c);
  background: rgba(185, 28, 28, 0.12);
}

/* ─── Tekstonderdelen met standaardteksten ────────────────────── */

.rapport-tekstveld {
  margin: 4px 0 14px;
}

.rapport-tekst-balk {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.rapport-tekst-balk .rapport-kop-rij {
  margin-bottom: 0;
}

.rapport-tekst-knoppen {
  position: relative;
  display: flex;
  flex-shrink: 0;
  gap: 6px;
  margin-left: auto;
}

.rapport-tekst-knoppen .rapport-knop {
  margin-top: 0;
}

.rapport-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 10;
  width: 360px;
  max-height: 340px;
  overflow-y: auto;
  padding: 4px;
  background: var(--theme-surface, var(--theme-bg));
  border: 1px solid var(--theme-border, rgba(217, 119, 6, 0.25));
  border-radius: 6px;
  box-shadow: var(--theme-popover-shadow, 0 8px 24px rgba(0, 0, 0, 0.18));
}

.rapport-menu-groep {
  padding: 6px 8px 2px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--theme-accent, #d97706);
}

.rapport-menu-regel {
  display: flex;
  align-items: center;
  gap: 2px;
}

.rapport-menu-item {
  display: block;
  flex: 1;
  width: 100%;
  min-width: 0;
  padding: 5px 8px;
  font-size: 12px;
  text-align: left;
  color: var(--theme-text);
  background: transparent;
  border: 0;
  border-radius: 4px;
  cursor: pointer;
}

.rapport-menu-item:hover:not(:disabled) {
  background: var(--theme-hover, rgba(217, 119, 6, 0.1));
}

.rapport-menu-item:disabled {
  opacity: 0.45;
  cursor: default;
}

.rapport-menu-label {
  display: block;
  font-weight: 500;
}

.rapport-menu-uittreksel {
  display: block;
  overflow: hidden;
  font-size: 10.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--theme-text-secondary);
}

.rapport-menu-leeg {
  padding: 6px 8px;
  font-size: 11.5px;
  font-style: italic;
  color: var(--theme-text-secondary);
}

.rapport-menu-scheiding {
  height: 1px;
  margin: 4px 0;
  background: var(--theme-border-subtle, rgba(217, 119, 6, 0.2));
}

.rapport-bewaar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

.rapport-panel .rapport-bewaar input[type="text"] {
  flex: 1;
  width: auto;
}

.rapport-bewaar .rapport-knop {
  margin-top: 0;
}

.rapport-melding {
  display: block;
  margin-top: 4px;
  font-size: 10.5px;
  color: var(--theme-accent, #d97706);
}

.rapport-invulvelden {
  margin-top: 22px;
  padding-top: 10px;
  border-top: 1px dashed var(--theme-border-subtle, rgba(217, 119, 6, 0.25));
}

.rapport-invulvelden-lijst {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 2px 0 4px;
}

.rapport-invulvelden code {
  padding: 1px 6px;
  font-size: 10.5px;
  color: var(--theme-text-secondary);
  background: var(--theme-bg-lighter);
  border-radius: 3px;
  cursor: help;
}

/* ─── Bijlagen ────────────────────────────────────────────────── */

.rapport-bijlagen {
  list-style: none;
  margin: 0 0 6px;
}

.rapport-bijlagen li {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.rapport-panel .rapport-bijlagen input[type="text"] {
  flex: 1;
  width: auto;
}

.rapport-letter {
  flex-shrink: 0;
  width: 22px;
  font-weight: 600;
  text-align: center;
  color: var(--theme-accent, #d97706);
}

.rapport-vast {
  flex: 1;
  padding: 5px 8px;
  font-size: 12px;
  font-style: italic;
  color: var(--theme-text-secondary);
}

/* ─── Bureau ──────────────────────────────────────────────────── */

.rapport-melding-blok {
  margin: 0 0 12px;
  padding: 8px 12px;
  font-size: 11.5px;
  line-height: 1.5;
  background: var(--theme-accent-soft, rgba(217, 119, 6, 0.08));
  border: 1px solid var(--theme-border-subtle, rgba(217, 119, 6, 0.25));
  border-radius: 4px;
}

.rapport-melding-blok.rustig {
  color: var(--theme-text-secondary);
  background: transparent;
}

.rapport-bureau {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 10px;
}

.rapport-bureau dl {
  display: grid;
  flex: 1;
  grid-template-columns: max-content 1fr;
  gap: 3px 16px;
  font-size: 12px;
  line-height: 1.5;
}

.rapport-bureau dt {
  color: var(--theme-text-secondary);
}

.rapport-bureau ul {
  list-style: none;
}

.rapport-beeld {
  max-width: 180px;
  max-height: 64px;
  padding: 3px;
  object-fit: contain;
  background: #fff;
  border: 1px solid var(--theme-border-subtle, rgba(217, 119, 6, 0.25));
  border-radius: 3px;
}

.rapport-voetbeeld {
  display: block;
  width: 100%;
  max-height: 56px;
  margin-top: 10px;
  object-fit: contain;
  background: #fff;
  border: 1px solid var(--theme-border-subtle, rgba(217, 119, 6, 0.25));
  border-radius: 3px;
}

.rapport-kleuren {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}

.rapport-kleur {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--theme-text-secondary);
}

.rapport-staal {
  width: 14px;
  height: 14px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

.rapport-lettertype {
  display: block;
  margin-top: 2px;
}

/* ─── Voet ────────────────────────────────────────────────────── */

.rapport-voet {
  max-width: 760px;
  margin: 28px 0 0;
  padding-top: 14px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--theme-text-secondary);
  border-top: 1px solid var(--theme-border-subtle, rgba(217, 119, 6, 0.15));
}
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop`

Expected: geen uitvoer, exitcode 0.

- [ ] **Step 8: Browsercontrole**

Geen browsercontrole; het paneel hangt pas in Task 15 in de werkruimte. De controle van dit
paneel staat daar als Step 10.

- [ ] **Step 9: Commit**

```powershell
git add packages/desktop/src/components/rapport/RapportPanel.tsx packages/desktop/src/components/rapport/RapportPanel.css packages/desktop/src/components/rapport/paneel/velden.tsx packages/desktop/src/components/rapport/paneel/RijenTabel.tsx packages/desktop/src/components/rapport/paneel/DocumentSectie.tsx packages/desktop/src/components/rapport/paneel/RevisieSectie.tsx
git commit -m @'
feat(rapport): rapportpaneel met documentgegevens en revisies

Het paneel onder de knoop Rapport: een scrollend formulier met een
sprongbalk, in de stijl van de projectgegevens. Document bevat titel,
kenmerk, fase, normen, de constructeurs uit het bureau van het rapport en
de adresregels van de opdrachtgever; projectnummer, -naam,
opdrachtgever en locatie staan grijs met een link naar de
projectgegevens. Revisies is een tabel waarin toevoegen de volgende
code en de datum van vandaag invult.

velden.tsx levert de bouwstenen (velden op een pad, afgeleide waarden,
koppen met de nummering van de afdruk) en RijenTabel de bewerkbare
tabel die de volgende secties gebruiken.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 15: Werkruimte van de knoop Rapport

**Files:**
- Modify: `packages/desktop/src/App.tsx`:
  - L13–14 en L19: imports
  - L85: selector
  - L123: nieuw effect na het volg-effect
  - L128: constanten
  - L134 en L148–150: tabbalk van een blad, en de tabbalk van het rapport
  - L184–188: render

**Interfaces:**
- Consumes:
  - `RapportPanel` (default export, geen props) uit `components/rapport/RapportPanel.tsx` (Task 14)
  - `RAPPORT_ID` uit `store/projectStore.ts` (Task 5)
  - uit Task 11: `usePrintStore((s) => s.soort)`, `toonVoorbeeld(selectie?, soort?)` en `sluitVoorbeeld()`
  - `AfdrukVoorbeeld` (bestaand). Het afdrukdeel laat die bij soort "rapport" `<RapportAfdruk />` meten.
- Produces (gedrag in `App`; lokale namen `printSoort`, `toontRapport`, `rapportVoorbeeld`, `rapportWerkruimte`, `rapportTabs`):
  - Bij `activeId === RAPPORT_ID` verschijnt een tabbalk (`split-tabs`) met "Rapport" en "Afdrukvoorbeeld". "Rapport" roept `sluitVoorbeeld()` aan en "Afdrukvoorbeeld" roept `toonVoorbeeld(null, "rapport")` aan. Daaronder staat `<RapportPanel />` of `<AfdrukVoorbeeld />`.
  - Die tak staat vóór de `printVoorbeeld`-tak. Op de IFC-linttab wint hij alleen als het rapportvoorbeeld openstaat, net zoals een open bladenvoorbeeld nu van de IFC-weergave wint.
  - Effect: staat een voorbeeld open en geldt `(soort === "rapport") !== (activeId === RAPPORT_ID)`, dan volgt `sluitVoorbeeld()`. Een andere knoop kiezen sluit dus een open rapportvoorbeeld. De knoop Rapport kiezen sluit een open bladenvoorbeeld. Het rapport afdrukken vanuit het voorbeeld van een blad sluit dat voorbeeld. Projectgegevens met een open bladenvoorbeeld blijft zoals nu: het voorbeeld blijft staan.
  - De tab "Afdrukvoorbeeld" van een los blad roept `toonVoorbeeld([actief.id], "bladen")` aan.
- App krijgt één selector en één effect erbij. De volgorde van de hooks verandert alleen in `App.tsx` zelf. Fast Refresh hermonteert `App` daarbij één keer; de storestand blijft staan.

- [ ] **Step 1: Controleer de voorwaarden**

Run:
```bash
grep -n "export default function RapportPanel" packages/desktop/src/components/rapport/RapportPanel.tsx
grep -n "soort: AfdrukSoort;" packages/desktop/src/store/printStore.ts
grep -n 'export const RAPPORT_ID' packages/desktop/src/store/projectStore.ts
```
Expected: elk commando geeft één regel. Geeft het eerste niets, voer dan eerst Task 14 uit.
Geeft het tweede niets, voer eerst Task 11 uit. Geeft het derde niets, voer eerst Task 5 uit.

- [ ] **Step 2: Imports**

In `packages/desktop/src/App.tsx`:

Oud (L13–14):
```ts
import ProjectGegevensPanel from "./components/calc/ProjectGegevensPanel";
import PrintDocument from "./components/calc/PrintDocument";
```
Nieuw:
```ts
import ProjectGegevensPanel from "./components/calc/ProjectGegevensPanel";
import RapportPanel from "./components/rapport/RapportPanel";
import PrintDocument from "./components/calc/PrintDocument";
```

Oud (L19):
```ts
import { useProjectStore, PROJECT_ID } from "./store/projectStore";
```
Nieuw:
```ts
import { useProjectStore, PROJECT_ID, RAPPORT_ID } from "./store/projectStore";
```

- [ ] **Step 3: Selector voor de soort**

Oud (L84–85):
```ts
  const printSelectie = usePrintStore((s) => s.selectie);
  const kiesSelectie = usePrintStore((s) => s.kiesSelectie);
```
Nieuw:
```ts
  const printSelectie = usePrintStore((s) => s.selectie);
  const kiesSelectie = usePrintStore((s) => s.kiesSelectie);
  const printSoort = usePrintStore((s) => s.soort);
```

- [ ] **Step 4: Effect dat een voorbeeld op de verkeerde knoop sluit**

Oud (L123–125):
```ts
  }, [printVoorbeeld, actief, printSelectie, kiesSelectie]);

  const designerPane = designerVoor(source);
```
Nieuw:
```ts
  }, [printVoorbeeld, actief, printSelectie, kiesSelectie]);

  // Het rapportvoorbeeld hoort bij de knoop Rapport, het voorbeeld van bladen
  // bij de bladen. Kies je een andere knoop terwijl het rapportvoorbeeld
  // openstaat, of de knoop Rapport terwijl er bladen in het voorbeeld staan,
  // dan gaat het voorbeeld dicht. Anders blijft het onzichtbaar "open" en
  // drukt Ctrl+P iets anders af dan je ziet. Hetzelfde als je vanuit het
  // voorbeeld van een blad het rapport afdrukt: dat voorbeeld zou daarna het
  // rapport tonen onder de tabs van het blad.
  useEffect(() => {
    if (!printVoorbeeld) return;
    if ((printSoort === "rapport") !== (activeId === RAPPORT_ID)) sluitVoorbeeld();
  }, [printVoorbeeld, printSoort, activeId, sluitVoorbeeld]);

  const designerPane = designerVoor(source);
```

- [ ] **Step 5: Wat de werkruimte toont bij de knoop Rapport**

Oud (L128–129):
```ts
  const toontProjectGegevens = activeId === PROJECT_ID;
  const hasDesigner = designerPane !== null && !toontProjectGegevens;
```
Nieuw:
```ts
  const toontProjectGegevens = activeId === PROJECT_ID;
  // Het rapport is evenmin een rekenblad: een eigen paneel, met het hele
  // rapport als afdrukvoorbeeld in de tweede tab. Net als bij de bladen wint
  // een open voorbeeld van de IFC-weergave, het invulpaneel niet.
  const toontRapport = activeId === RAPPORT_ID;
  const rapportVoorbeeld = printVoorbeeld && printSoort === "rapport";
  const rapportWerkruimte = toontRapport && (rapportVoorbeeld || activeView !== "ifc");
  const hasDesigner = designerPane !== null && !toontProjectGegevens;
```

- [ ] **Step 6: Tabbalk van een blad op "bladen", tabbalk van het rapport erbij**

Oud (L134):
```ts
  // De weergaven van een geopend blad, met het afdrukvoorbeeld als laatste tab.
```
Nieuw:
```ts
  // De weergaven van een geopend blad, met het afdrukvoorbeeld als laatste tab.
  // Dat voorbeeld toont de bladen, ook als er eerder een rapport is afgedrukt.
```

Oud (L148–150):
```tsx
      <button className={`split-tab${printVoorbeeld ? " active" : ""}`} onClick={() => toonVoorbeeld([actief.id])}>Afdrukvoorbeeld</button>
    </div>
  ) : null;
```
Nieuw:
```tsx
      <button className={`split-tab${printVoorbeeld ? " active" : ""}`} onClick={() => toonVoorbeeld([actief.id], "bladen")}>Afdrukvoorbeeld</button>
    </div>
  ) : null;

  // De knoop Rapport: het invulpaneel, of het hele rapport zoals het op papier komt.
  const rapportTabs = (
    <div className="split-tabs">
      <button className={`split-tab${rapportVoorbeeld ? "" : " active"}`} onClick={() => sluitVoorbeeld()}>Rapport</button>
      <button className={`split-tab${rapportVoorbeeld ? " active" : ""}`} onClick={() => toonVoorbeeld(null, "rapport")}>Afdrukvoorbeeld</button>
    </div>
  );
```

- [ ] **Step 7: De tak voor het rapport, vóór de voorbeeldtak**

Oud (L184–189):
```tsx
          {printVoorbeeld ? (
            <>
              {tabBalk}
              <AfdrukVoorbeeld />
            </>
          ) : activeView === "ifc" ? (
```
Nieuw:
```tsx
          {rapportWerkruimte ? (
            <>
              {rapportTabs}
              {rapportVoorbeeld ? (
                <AfdrukVoorbeeld />
              ) : (
                <div style={{ flex: 1, minHeight: 0 }}>
                  <RapportPanel />
                </div>
              )}
            </>
          ) : printVoorbeeld ? (
            <>
              {tabBalk}
              <AfdrukVoorbeeld />
            </>
          ) : activeView === "ifc" ? (
```

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop; echo "exit $?"`
Expected: geen meldingen, `exit 0`.

- [ ] **Step 9: Controle in de browser**

Begin met twee proefbladen (zie de inleiding van dit deel). Gebruik voor de tabcontrole dit
fragment in javascript_tool; hieronder heet het **TABS**:
```js
({
  tabs: [...document.querySelectorAll(".split-tabs .split-tab")].map((b) => b.textContent + (b.classList.contains("active") ? " (actief)" : "")),
  voorbeeld: !!document.querySelector(".av-paneel"),
})
```

1. Klik in de boom op **Rapport**. Het rapportpaneel staat onder de tabbalk en scrolt binnen
   de werkruimte; lint en statusbalk blijven op hun plaats. TABS geeft
   `{ tabs: ["Rapport (actief)", "Afdrukvoorbeeld"], voorbeeld: false }`.
2. Klik de tab **Afdrukvoorbeeld**. TABS geeft
   `{ tabs: ["Rapport", "Afdrukvoorbeeld (actief)"], voorbeeld: true }`. Is het afdrukdeel al
   klaar, dan staat het rapport in de vellen (`!!document.querySelector('.av-paneel [class*="rpa-"]')`
   is `true`). Anders staan er nog de voorblad- en bladvellen.
3. Klik de tab **Rapport**. Het paneel is terug en `voorbeeld` is `false`.
4. Klik opnieuw **Afdrukvoorbeeld** en daarna in de boom het eerste rekenblad. De gewone
   weergave van het blad staat er. In TABS staat "Afdrukvoorbeeld" zonder "(actief)", en
   `voorbeeld` is `false`: het rapportvoorbeeld is dicht.
5. Klik op dat blad de tab **Afdrukvoorbeeld**. `voorbeeld` is `true`, en de keuzelijst
   `#av-bereik` toont "Alleen: <naam van het blad>". Klik nu in de boom op **Rapport**. TABS
   geeft `{ tabs: ["Rapport (actief)", "Afdrukvoorbeeld"], voorbeeld: false }`. Klik het blad
   weer aan: de gewone weergave, zonder open voorbeeld.
6. Open op het blad opnieuw **Afdrukvoorbeeld** en klik **Projectgegevens**. Het
   bladenvoorbeeld blijft staan (`voorbeeld: true`), zoals nu. Sluit het met **Sluiten**.
7. Klik **Rapport** in de boom en daarna de linttab **IFC**. De IFC-weergave verschijnt, zonder
   `.split-tabs`. Klik de linttab **Start**: het rapportpaneel met de tabs is terug. Open de tab
   **Afdrukvoorbeeld** en klik weer **IFC**. Het rapportvoorbeeld blijft met de tabs staan. Klik
   **Start** en daarna de tab **Rapport**.
8. De console (read_console_messages, alleen fouten) toont geen nieuwe fouten en geen
   waarschuwing over het aantal hooks.

- [ ] **Step 10: Browsercontrole van het rapportpaneel (uit Task 14)**

Het paneel van Task 14 (Document en Revisies) hangt nu in de werkruimte; loop daarom hier de
controle van dat paneel af. Er verandert geen code.

1. Open http://localhost:3021 en klik in de projectboom op **Rapport** (onder Projectgegevens).
   De tab **Rapport** is actief.
2. Zichtbaar: kop "Rapport" met een korte uitleg, daaronder de sprongbalk met **Document** en
   **Revisies**. Sectie **DOCUMENT**: Titel "Constructieadvies & berekeningen", Documentkenmerk
   leeg (grijze voorbeeldtekst "bijv. 2026-001-C01"), Fase in bouwproces "— (niet vermelden)",
   Toegepaste normen "NEN-EN 1990 t/m 1997", twee keuzelijsten constructeur op "—" met eronder de
   melding "Dit rapport heeft nog geen constructeurs…", een tekstvak Adresregels opdrachtgever van
   twee regels hoog, en een grijs blok Projectnummer/Projectnaam/Opdrachtgever/Locatie ("—") met de
   link **Wijzigen in Projectgegevens →**.
3. Maak het veld Titel leeg: de suggestielijst toont vijf titels. Kies "Constructief advies"; het
   veld toont die titel.
4. Kies bij Fase "DO — definitief ontwerp".
5. Typ in Adresregels drie regels ("Voorbeeldstraat 1", Enter, "1234 AB Voorbeeldstad", Enter,
   "Postbus 1"): het tekstvak groeit mee tot drie regels, zonder schuifbalk erin.
6. Klik **Wijzigen in Projectgegevens →**: het formulier Projectgegevens opent. Vul Projectnummer
   "2026-001" en Projectnaam "Voorbeeldproject" in, klik weer op **Rapport**: het grijze blok toont
   beide waarden.
7. Sectie **REVISIES**: één rij A, datum van het aanmaken, "Eerste uitgave", status "concept"; onder
   de tabel "Rapportstatus: concept". Bij deze tabel staan geen ↑/↓-knoppen, alleen ✕.
8. Klik **+ Revisie toevoegen**: rij B met de datum van vandaag (dd-mm-jjjj, volledig leesbaar in de
   kolom), lege omschrijving, "concept". Zet de status van B op "definitief": de regel eronder wordt
   "Rapportstatus: definitief".
9. Klik ✕ bij rij B: de rij verdwijnt, status weer "concept". Klik op een lege plek in het paneel en
   druk Ctrl+Z: rij B staat er weer (met "definitief"). Ctrl+Y: weer weg.
10. Scroll naar beneden: de sprongbalk blijft bovenaan staan. Klik **Document** in de balk: het
    paneel scrollt zacht terug en de kop DOCUMENT staat direct onder de balk.
11. Maak het paneel smal (venster verkleinen of projectboom breder slepen): Documentkenmerk en Fase
    komen onder elkaar, er verschijnt geen horizontale schuifbalk.
12. Zet via Instellingen (tandwiel) → Uiterlijk een donker thema: velden, grijze blokken en tabel blijven
    leesbaar. Zet het thema terug.
13. De console (DevTools of `read_console_messages`) toont geen fouten of React-waarschuwingen uit
    `components/rapport/`.

- [ ] **Step 11: Commit**

```bash
git add packages/desktop/src/App.tsx
git commit -m "$(cat <<'EOF'
feat(rapport): werkruimte met tabs Rapport en Afdrukvoorbeeld

De knoop Rapport opent een eigen werkruimte: het rapportpaneel en het
afdrukvoorbeeld van het hele rapport, als twee tabs. Een voorbeeld dat
niet bij de gekozen knoop hoort gaat dicht, zodat Ctrl+P afdrukt wat je
ziet. Het afdrukvoorbeeld van een los blad vraagt uitdrukkelijk de
bladen.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 16: Teksten van hoofdstuk 1 t/m 3 met standaard- en eigen varianten

**Files:**
- Create: `packages/desktop/src/components/rapport/paneel/TekstVeld.tsx`
- Create: `packages/desktop/src/components/rapport/paneel/HoofdstukTeksten.tsx`
- Modify: `packages/desktop/src/components/rapport/RapportPanel.tsx` (regels 2–3 imports, 22–23
  `SECTIES`, 54–55 inhoud van `OpzetBron`)

**Interfaces:**
- Consumes: `STANDAARD_TEKSTEN`, `Tekstvariant` (standaardteksten.ts); `INVULVELDEN`,
  `Invulwaarden` (invullen.ts); `useBureauStore` (`profiel.naam`, `eigenTeksten[id]`,
  `voegTekstToe(id, v)`, `verwijderTekst(id, index)`); `Knoop` (opzet.ts); uit Task 13–14:
  `vindKnoop`, `uittreksel`, `GroeiVeld`, `Kop`, `Sectie`, `Veld`, `useRapport`.
- Produces:
  - `paneel/TekstVeld.tsx`: default `TekstVeld({ id: string; kop?: ReactNode; hint?: ReactNode; placeholder?: string })`
    — tekstvak op `rapport.teksten[id]`, menu **Standaardtekst ▾** (meegeleverd, eigen varianten
    met ✕, Leegmaken), **Bewaar als eigen variant**; named `Invulvelden()` — de regel met de zeven
    invulvelden.
  - `paneel/HoofdstukTeksten.tsx`: default `HoofdstukTeksten()` (sectie `data-sectie="teksten"`).

- [ ] **Step 1: Schrijf `TekstVeld.tsx`**

```tsx
import { useEffect, useRef, useState, type ReactNode } from "react";
import { INVULVELDEN, type Invulwaarden } from "../../../rapport/invullen";
import { STANDAARD_TEKSTEN, type Tekstvariant } from "../../../rapport/standaardteksten";
import { useBureauStore } from "../../../store/bureauProfiel";
import { useProjectStore } from "../../../store/projectStore";
import { uittreksel } from "./hulp";
import { GroeiVeld } from "./velden";

const GEEN: readonly Tekstvariant[] = [];

/**
 * Eén tekstonderdeel van het rapport (rapport.teksten[id]) met zijn
 * standaardteksten.
 *
 * "Standaardtekst ▾" toont de meegeleverde varianten en de eigen varianten
 * uit de instellingen. Kiezen vervangt de tekst; staat er al iets anders,
 * dan vraagt het eerst om bevestiging. Het vervangen is één eigen stap in
 * ongedaan maken. "Bewaar als eigen variant" legt de tekst van nu vast onder
 * een naam, voor dit onderdeel in elk volgend rapport.
 */
export default function TekstVeld({ id, kop, hint, placeholder }: {
  /** Tekst-id uit de opzet, tevens de sleutel in rapport.teksten. */
  id: string;
  /** Links van de knoppen; meestal een <Kop>. */
  kop?: ReactNode;
  hint?: ReactNode;
  placeholder?: string;
}) {
  const tekst = useProjectStore((s) => s.rapport.teksten[id] ?? "");
  const zet = useProjectStore((s) => s.zetRapportVeld);
  const werkBij = useProjectStore((s) => s.werkRapportBij);
  const eigen = useBureauStore((s) => s.eigenTeksten[id] ?? GEEN);
  const voegTekstToe = useBureauStore((s) => s.voegTekstToe);
  const verwijderTekst = useBureauStore((s) => s.verwijderTekst);
  const meegeleverd = STANDAARD_TEKSTEN[id] ?? GEEN;

  const [menuOpen, setMenuOpen] = useState(false);
  /** Naam voor een nieuwe eigen variant; null zolang dat regeltje dicht is. */
  const [variantNaam, setVariantNaam] = useState<string | null>(null);
  const [melding, setMelding] = useState("");
  const knoppenRef = useRef<HTMLDivElement>(null);

  // Een klik buiten het menu of Escape sluit het.
  useEffect(() => {
    if (!menuOpen) return;
    const klik = (e: MouseEvent) => {
      if (!knoppenRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const toets = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", klik);
    document.addEventListener("keydown", toets);
    return () => {
      document.removeEventListener("mousedown", klik);
      document.removeEventListener("keydown", toets);
    };
  }, [menuOpen]);

  /** Vervangt de tekst na bevestiging, als je er iets anders mee kwijtraakt. */
  const vervang = (nieuw: string, vraag: string) => {
    const huidig = tekst.trim();
    if (huidig !== "" && huidig !== nieuw.trim() && !confirm(vraag)) return;
    werkBij((r) => ({ ...r, teksten: { ...r.teksten, [id]: nieuw } }));
    setMenuOpen(false);
    setMelding("");
  };

  const bewaar = () => {
    const label = (variantNaam ?? "").trim();
    if (label === "" || tekst.trim() === "") return;
    voegTekstToe(id, { label, tekst });
    setVariantNaam(null);
    setMelding(`Bewaard als eigen variant "${label}"; te kiezen onder Standaardtekst.`);
  };

  const variant = (v: Tekstvariant, sleutel: string) => (
    <button
      key={sleutel}
      type="button"
      role="menuitem"
      className="rapport-menu-item"
      title={v.tekst}
      onClick={() => vervang(v.tekst, `De huidige tekst vervangen door "${v.label}"?`)}
    >
      <span className="rapport-menu-label">{v.label}</span>
      <span className="rapport-menu-uittreksel">{uittreksel(v.tekst)}</span>
    </button>
  );

  return (
    <div className="rapport-tekstveld">
      <div className="rapport-tekst-balk">
        {kop}
        <div className="rapport-tekst-knoppen" ref={knoppenRef}>
          <button
            type="button"
            className="rapport-knop"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((open) => !open);
              setMelding("");
            }}
          >
            Standaardtekst ▾
          </button>
          <button
            type="button"
            className="rapport-knop"
            disabled={tekst.trim() === ""}
            title="Deze tekst bewaren in de instellingen, om hem in elk rapport te kunnen kiezen"
            onClick={() => {
              setVariantNaam(`Eigen variant ${eigen.length + 1}`);
              setMenuOpen(false);
              setMelding("");
            }}
          >
            Bewaar als eigen variant
          </button>
          {menuOpen && (
            <div className="rapport-menu" role="menu">
              {meegeleverd.length > 0 && <div className="rapport-menu-groep">Meegeleverd</div>}
              {meegeleverd.map((v, i) => variant(v, `m${i}`))}
              {eigen.length > 0 && <div className="rapport-menu-groep">Eigen varianten</div>}
              {eigen.map((v, i) => (
                <div className="rapport-menu-regel" key={`e${i}`}>
                  {variant(v, `e${i}`)}
                  <button
                    type="button"
                    className="rapport-icoon"
                    title="Eigen variant verwijderen"
                    onClick={() => {
                      if (confirm(`Eigen variant "${v.label}" verwijderen?`)) verwijderTekst(id, i);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {meegeleverd.length === 0 && eigen.length === 0 && (
                <div className="rapport-menu-leeg">Nog geen varianten voor dit onderdeel.</div>
              )}
              <div className="rapport-menu-scheiding" />
              <button
                type="button"
                role="menuitem"
                className="rapport-menu-item"
                disabled={tekst === ""}
                onClick={() => vervang("", "De tekst van dit onderdeel leegmaken?")}
              >
                <span className="rapport-menu-label">Leegmaken</span>
                <span className="rapport-menu-uittreksel">
                  Een leeg optioneel onderdeel valt weg uit het rapport.
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
      <GroeiVeld waarde={tekst} onChange={(v) => zet(`teksten.${id}`, v)} placeholder={placeholder} />
      {variantNaam !== null && (
        <div className="rapport-bewaar">
          <input
            type="text"
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            value={variantNaam}
            placeholder="Naam van de variant"
            onChange={(e) => setVariantNaam(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") bewaar();
              if (e.key === "Escape") setVariantNaam(null);
            }}
          />
          <button
            type="button"
            className="rapport-knop rapport-knop-primair"
            disabled={variantNaam.trim() === ""}
            onClick={bewaar}
          >
            Bewaar
          </button>
          <button type="button" className="rapport-knop" onClick={() => setVariantNaam(null)}>
            Annuleer
          </button>
        </div>
      )}
      {melding && <span className="rapport-melding">{melding}</span>}
      {hint && <span className="rapport-hint">{hint}</span>}
    </div>
  );
}

/**
 * De invulvelden die een tekst kan gebruiken. Met de muis erop zie je wat er
 * nu in het rapport komt te staan.
 */
export function Invulvelden() {
  const gegevens = useProjectStore((s) => s.gegevens);
  const rapport = useProjectStore((s) => s.rapport);
  const projectNaam = useProjectStore((s) => s.projectNaam);
  const profielNaam = useBureauStore((s) => s.profiel.naam);
  // Zelfde bronnen als bij het opmaken: projectgegevens, documentgegevens en
  // het bureau — het vastgelegde, of zolang dat leeg is het profiel.
  const waarden: Invulwaarden = {
    adviseur: rapport.bureau.naam || profielNaam,
    projectnummer: gegevens.project_nummer ?? "",
    projectnaam: gegevens.project_naam || projectNaam,
    opdrachtgever: gegevens.opdrachtgever ?? "",
    locatie: gegevens.locatie ?? "",
    verantwoordelijk: rapport.verantwoordelijk,
    uitvoerend: rapport.uitvoerend,
  };
  return (
    <div className="rapport-invulvelden">
      <span className="rapport-label">Invulvelden</span>
      <span className="rapport-invulvelden-lijst">
        {INVULVELDEN.map((v) => (
          <code key={v} title={waarden[v] ? `Nu: ${waarden[v]}` : 'Nu leeg: in het rapport komt "—"'}>
            {`{${v}}`}
          </code>
        ))}
      </span>
      <span className="rapport-hint">
        Een invulveld wordt in het rapport vervangen door zijn waarde; een leeg veld wordt "—". Een regel
        die met "-" begint is een opsommingsregel, een lege regel begint een nieuwe alinea.
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Schrijf `HoofdstukTeksten.tsx`**

```tsx
import type { Knoop } from "../../../rapport/opzet";
import { vindKnoop } from "./hulp";
import TekstVeld, { Invulvelden } from "./TekstVeld";
import { Kop, Sectie, Veld, useRapport } from "./velden";

/**
 * De hoofdstukken die alleen uit tekst bestaan (plus de rol in 2.2). Voor
 * Uitgangspunten, Belastingen en Berekeningen heeft het paneel een eigen
 * sectie.
 */
const HOOFDSTUKKEN = ["inleiding", "projectgegevens", "constructie"];

/** Suggesties voor de rol in 2.2; eigen tekst kan altijd. */
const ROLLEN = ["Hoofdconstructeur", "Constructeur", "Constructief adviseur", "Controlerend constructeur"];

/**
 * Sectie Hoofdstukken 1 t/m 3: per tekstonderdeel uit de opzet een tekstvak
 * met standaardteksten, in de volgorde en met de koppen van het rapport.
 */
export default function HoofdstukTeksten() {
  return (
    <Sectie
      id="teksten"
      titel="Hoofdstukken 1 t/m 3"
      intro="Per onderdeel een tekst. Standaardtekst ▾ kiest een meegeleverde of eigen variant. Een optioneel blok dat leeg blijft, valt weg uit het rapport."
    >
      {HOOFDSTUKKEN.map((id) => {
        const knoop = vindKnoop(id);
        return knoop ? <KnoopInvoer key={id} knoop={knoop} /> : null;
      })}
      <Invulvelden />
    </Sectie>
  );
}

/** Eén knoop uit de opzet met zijn invoer; zonder eigen inhoud de kop met de kinderen eronder. */
function KnoopInvoer({ knoop }: { knoop: Knoop }) {
  const klasse = `rapport-knoop rapport-niveau-${knoop.niveau}`;
  if (knoop.inhoud === "tekst") {
    return (
      <div className={klasse}>
        <TekstVeld
          id={knoop.id}
          kop={<Kop id={knoop.id} />}
          placeholder={knoop.optioneel ? "Leeg laten: dan valt dit onderdeel weg." : undefined}
        />
      </div>
    );
  }
  if (knoop.inhoud === "rol") {
    return (
      <div className={klasse}>
        <TekstVeld
          id={knoop.id}
          kop={<Kop id={knoop.id} />}
          hint="De openingszin van de paragraaf; de drie gegevens hieronder staan er als tabel onder."
        />
        <RolVelden />
      </div>
    );
  }
  return (
    <div className={klasse}>
      <Kop id={knoop.id} />
      {knoop.kinderen?.map((k) => <KnoopInvoer key={k.id} knoop={k} />)}
    </div>
  );
}

/** 2.2: rol, bouwkundig adviseur of architect, datum van de bouwkundige onderlegger. */
function RolVelden() {
  const rol = useRapport().rol;
  return (
    <div className="rapport-rij">
      <Veld label="Rol" pad="rol.rol" waarde={rol.rol} lijst="rapport-rollen" />
      <Veld label="Bouwkundig adviseur / architect" pad="rol.architect" waarde={rol.architect} />
      <Veld
        label="Datum bouwkundige onderlegger"
        pad="rol.datumOnderlegger"
        waarde={rol.datumOnderlegger}
        placeholder="dd-mm-jjjj"
      />
      <datalist id="rapport-rollen">
        {ROLLEN.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
    </div>
  );
}
```

- [ ] **Step 3: Neem de sectie op in `RapportPanel.tsx`**

Vervang (regels 2–3)

```tsx
import DocumentSectie from "./paneel/DocumentSectie";
import RevisieSectie from "./paneel/RevisieSectie";
```

door

```tsx
import DocumentSectie from "./paneel/DocumentSectie";
import HoofdstukTeksten from "./paneel/HoofdstukTeksten";
import RevisieSectie from "./paneel/RevisieSectie";
```

Vervang (regels 22–23)

```tsx
  ["revisies", "Revisies"],
];
```

door

```tsx
  ["revisies", "Revisies"],
  ["teksten", "Hoofdstukken 1–3"],
];
```

Vervang (regels 54–55)

```tsx
        <RevisieSectie />
      </OpzetBron>
```

door

```tsx
        <RevisieSectie />
        <HoofdstukTeksten />
      </OpzetBron>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop`

Expected: geen uitvoer, exitcode 0.

- [ ] **Step 5: Browsercontrole**

1. Open het rapportpaneel. De sprongbalk heeft nu ook **Hoofdstukken 1–3**; klik erop.
2. Zichtbaar onder de sectiekop **HOOFDSTUKKEN 1 T/M 3**, in de volgorde en met de nummers van het
   rapport:
   - "1 Inleiding" met rechts ☑ *begint op nieuwe pagina*, **Standaardtekst ▾** en **Bewaar als
     eigen variant**, daaronder de standaardtekst van de inleiding;
   - "2 Projectgegevens" met ☐ *begint op nieuwe pagina*; "2.1 Projectomschrijving" met tekst;
     "2.2 Rol binnen het project en bereik rapport" met de openingszin (met `{adviseur}`) en de drie
     velden Rol "Hoofdconstructeur", Bouwkundig adviseur / architect "n.v.t.", Datum bouwkundige
     onderlegger "n.v.t.";
   - "3 Constructie" met ☑; "3.1 Toelichting constructie" met het blok "Bestaande situatie"
     (label *valt weg*) en daarin vier cursieve subkoppen (Verticale belastingafdracht, Stabiliteit,
     Fundatie, Beoordeling bestaande constructie), elk *valt weg* en met de grijze tekst "Leeg laten:
     dan valt dit onderdeel weg."; daarna "Wijziging" en "Belendingen" (*valt weg*);
     "3.2 Aandachtspunten bij uitvoering" met drie blokken (*valt weg*);
   - onderaan **Invulvelden** met `{adviseur}` `{projectnummer}` `{projectnaam}` `{opdrachtgever}`
     `{locatie}` `{verantwoordelijk}` `{uitvoerend}`.
3. Typ "Nieuwe dakopbouw." in Wijziging: het label *valt weg* bij Wijziging verdwijnt. Typ in
   "Fundatie" een woord: *valt weg* verdwijnt bij Fundatie én bij het blok Bestaande situatie.
4. Klik **Standaardtekst ▾** bij 1 Inleiding: een menu met de groep **MEEGELEVERD** (de varianten
   uit `STANDAARD_TEKSTEN.inleiding`, per variant het label en de eerste regel), een scheidingslijn
   en **Leegmaken**. Klik ernaast: het menu sluit. Open het opnieuw en druk Escape: het sluit.
5. Typ een extra woord achter de inleiding. Open het menu en kies de eerste meegeleverde variant:
   de vraag `De huidige tekst vervangen door "<label>"?` verschijnt. Kies **Annuleren**: de tekst
   blijft staan. Herhaal en kies **OK**: de tekst is de variant. Klik op een lege plek, Ctrl+Z: je
   eigen tekst (met het extra woord) staat er weer, in één stap.
6. Klik **Bewaar als eigen variant**: onder het tekstvak verschijnt een regel met "Eigen variant 1"
   geselecteerd. Typ "Inleiding kort" en druk Enter: de regel sluit en er staat
   `Bewaard als eigen variant "Inleiding kort"; te kiezen onder Standaardtekst.` Open het menu:
   er is een groep **EIGEN VARIANTEN** met "Inleiding kort" en een ✕. Het menu bij 2.1
   Projectomschrijving toont die eigen variant niet (varianten horen bij één onderdeel).
7. Klik ✕ bij "Inleiding kort" → `Eigen variant "Inleiding kort" verwijderen?` → OK: de groep
   verdwijnt.
8. Kies in het menu van Wijziging **Leegmaken** → `De tekst van dit onderdeel leegmaken?` → OK: het
   vak is leeg en *valt weg* staat er weer. Bij een leeg vak is **Bewaar als eigen variant** grijs.
9. Houd de muis op `{projectnaam}`: tooltip "Nu: Voorbeeldproject" (uit Task 15, stap 10, punt 6). Op
   `{adviseur}` zonder bureau: `Nu leeg: in het rapport komt "—"`.
10. Vink bij "2 Projectgegevens" *begint op nieuwe pagina* aan en weer uit; klik op een lege plek en
    druk Ctrl+Z: het vinkje volgt.
11. Plak een alinea van tien regels in 2.1: het vak groeit mee. Maak het paneel smaller: de regels
    lopen anders en het vak past zijn hoogte aan, zonder schuifbalk erin; de scrollpositie van het
    paneel springt niet.
12. Geen fouten of waarschuwingen in de console.

- [ ] **Step 6: Commit**

```powershell
git add packages/desktop/src/components/rapport/paneel/TekstVeld.tsx packages/desktop/src/components/rapport/paneel/HoofdstukTeksten.tsx packages/desktop/src/components/rapport/RapportPanel.tsx
git commit -m @'
feat(rapport): teksten van hoofdstuk 1 t/m 3 met standaard- en eigen varianten

Per tekstonderdeel uit de opzet een tekstvak dat meegroeit, met de kop
en het nummer zoals in het rapport. Standaardtekst kiest een
meegeleverde of eigen variant (vervangen van andere tekst vraagt eerst
om bevestiging en is één stap ongedaan maken); Bewaar als eigen
variant legt de tekst vast in de instellingen. Lege optionele blokken
staan gemarkeerd als "valt weg". Onder het blok de invulvelden, met hun
huidige waarde als tooltip.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 17: Uitgangspunten (hoofdstuk 4) in het paneel

**Files:**
- Create: `packages/desktop/src/components/rapport/paneel/UitgangspuntenSectie.tsx`
- Modify: `packages/desktop/src/components/rapport/RapportPanel.tsx` (regel 4 import, 24–25
  `SECTIES`, 57–58 inhoud van `OpzetBron`)

**Interfaces:**
- Consumes: `klasse`, `getal`, `fmt`, `levensduurklasse`, `beta`, `ontwerpSupervisie`,
  `inspectieniveau`, `normVoorBouwjaar` (normwaarden.ts); `kFiVoor(cc)` (store/projectGegevens.ts,
  dezelfde functie die normwaarden.ts gebruikt); `Materiaalregel`, `Bevestigingsregel`,
  `Conserveringsregel`, `Vervormingsregel` (model.ts); `gegevens.CC`, `gegevens.RC`,
  `gegevens.DesignLife`; uit Task 14 en 16: `RijenTabel`, `Kolom`, `TekstVeld`, `Afgeleid`, `Keuze`,
  `Kop`, `Sectie`, `TekstVak`, `Veld`, `Vink`, `useRapport`, `Optie`.
- Produces: `paneel/UitgangspuntenSectie.tsx` — default `UitgangspuntenSectie()` (sectie
  `data-sectie="uitgangspunten"`, hoofdstuk `uitgangspunten`).

- [ ] **Step 1: Schrijf `UitgangspuntenSectie.tsx`**

```tsx
import type {
  Bevestigingsregel,
  Conserveringsregel,
  Materiaalregel,
  Vervormingsregel,
} from "../../../rapport/model";
import {
  beta,
  fmt,
  getal,
  inspectieniveau,
  klasse,
  levensduurklasse,
  normVoorBouwjaar,
  ontwerpSupervisie,
} from "../../../rapport/normwaarden";
import { kFiVoor } from "../../../store/projectGegevens";
import { useProjectStore } from "../../../store/projectStore";
import RijenTabel, { type Kolom } from "./RijenTabel";
import TekstVeld from "./TekstVeld";
import { Afgeleid, Keuze, Kop, Sectie, TekstVak, Veld, Vink, useRapport, type Optie } from "./velden";

/** Suggesties voor 4.1; eigen tekst kan altijd. */
const SOORTEN = [
  "Woning",
  "Eengezinswoning",
  "Appartementencomplex",
  "Villa",
  "Kantoor",
  "Bedrijfshal",
  "Bijgebouw",
  "Schuur",
];

const JA_NEE: Optie[] = [
  { waarde: "Ja", label: "Ja" },
  { waarde: "Nee", label: "Nee" },
];

const MATERIAAL_KOLOMMEN: Kolom<Materiaalregel>[] = [
  { sleutel: "type", kop: "Materiaaltype", breedte: "30%" },
  { sleutel: "soort", kop: "Soort / sterkteklasse", breedte: "24%" },
  { sleutel: "opmerking", kop: "Opmerking" },
];

const BEVESTIGING_KOLOMMEN: Kolom<Bevestigingsregel>[] = [
  { sleutel: "type", kop: "Bevestigingsmiddel", breedte: "55%" },
  { sleutel: "kwaliteit", kop: "Kwaliteit" },
];

const CONSERVERING_KOLOMMEN: Kolom<Conserveringsregel>[] = [
  { sleutel: "onderdeel", kop: "Onderdeel", breedte: "45%" },
  { sleutel: "systeem", kop: "Systeem" },
];

const VERVORMING_KOLOMMEN: Kolom<Vervormingsregel>[] = [
  { sleutel: "onderdeel", kop: "Onderdeel" },
  { sleutel: "ueind", kop: <>u<sub>eind</sub></>, breedte: "7.5em" },
  { sleutel: "ubij", kop: <>u<sub>bij</sub></>, breedte: "7.5em" },
  { sleutel: "uhor", kop: <>u<sub>hor</sub></>, breedte: "7.5em" },
];

/** Tekstonderdelen van hoofdstuk 4 na de vervormingen. */
const SLOTTEKSTEN = ["montage", "rekenprogrammatuur", "temperatuur", "aardbeving"];

/**
 * Sectie Uitgangspunten (hoofdstuk 4). Invoer die alleen in het rapport
 * bestaat staat hier; CC, RC, ontwerplevensduur en wat daaruit volgt staan
 * grijs, want die komen uit de projectgegevens en de norm.
 */
export default function UitgangspuntenSectie() {
  const u = useRapport().uitgangspunten;
  const gegevens = useProjectStore((s) => s.gegevens);

  const cc = klasse(gegevens.CC, 2);
  const rc = klasse(gegevens.RC, 2);
  const jaren = getal(gegevens.DesignLife);
  const bouwjaar = getal(u.bestaand.bouwjaar);

  return (
    <Sectie
      id="uitgangspunten"
      titel="Uitgangspunten"
      hoofdstuk="uitgangspunten"
      intro="Grijze waarden volgen uit de projectgegevens en de norm; ze worden bij het opmaken berekend en niet opgeslagen."
    >
      <div className="rapport-knoop">
        <Kop id="bouwwerk" />
        <Veld
          label="Soort bouwwerk"
          pad="uitgangspunten.soortBouwwerk"
          waarde={u.soortBouwwerk}
          lijst="rapport-soorten"
          hint="Kies uit de lijst of typ een eigen omschrijving."
        />
        <datalist id="rapport-soorten">
          {SOORTEN.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <Afgeleid
          uitProjectgegevens
          regels={[
            { label: "Gevolgklasse", waarde: `CC${cc}` },
            { label: "Betrouwbaarheidsklasse", waarde: `RC${rc}` },
            {
              label: "Ontwerplevensduur",
              waarde: Number.isFinite(jaren)
                ? `${fmt(jaren, 0)} jaar — klasse ${levensduurklasse(jaren)}`
                : "—",
              bron: "tabel NB.1–2.1",
            },
            { label: "Betrouwbaarheidsindex β", waarde: fmt(beta(rc), 1), bron: "tabel B2, 50 jaar" },
            { label: <>K<sub>FI</sub></>, waarde: fmt(kFiVoor(cc), 2), bron: "tabel B3" },
            {
              label: "Ontwerp- en berekeningssupervisie",
              waarde: ontwerpSupervisie(rc),
              bron: "tabel B4",
            },
            { label: "Inspectieniveau", waarde: inspectieniveau(rc), bron: "tabel B5" },
          ]}
        />
      </div>

      <div className="rapport-knoop">
        <Kop id="brand" />
        <div className="rapport-rij">
          <Veld
            label="Hoofddraagconstructie"
            pad="uitgangspunten.brand.hoofddraagconstructie"
            waarde={u.brand.hoofddraagconstructie}
            eenheid="min"
          />
          <Veld
            label="Brandscheiding"
            pad="uitgangspunten.brand.brandscheiding"
            waarde={u.brand.brandscheiding}
            eenheid="min"
          />
          <Veld
            label="Vluchtroute"
            pad="uitgangspunten.brand.vluchtroute"
            waarde={u.brand.vluchtroute}
            eenheid="min"
          />
        </div>
        <Veld
          label="Verwijzing"
          pad="uitgangspunten.brand.verwijzing"
          waarde={u.brand.verwijzing}
          placeholder="verwijzing naar de regelgeving"
          hint='Staat rechts naast de tabel. Een "-" betekent: geen eis.'
        />
      </div>

      <div className="rapport-knoop">
        <Kop id="materialen" />
        <RijenTabel<Materiaalregel>
          pad="uitgangspunten.materialen"
          rijen={u.materialen}
          kolommen={MATERIAAL_KOLOMMEN}
          nieuweRij={() => ({ type: "", soort: "", opmerking: "" })}
          toevoegen="Materiaal toevoegen"
        />
        <Veld label="Slotregel" pad="uitgangspunten.materialenNoot" waarde={u.materialenNoot} />
        <h6 className="rapport-subkop">Bevestigingsmiddelen</h6>
        <RijenTabel<Bevestigingsregel>
          pad="uitgangspunten.bevestiging"
          rijen={u.bevestiging}
          kolommen={BEVESTIGING_KOLOMMEN}
          nieuweRij={() => ({ type: "", kwaliteit: "" })}
          toevoegen="Bevestigingsmiddel toevoegen"
        />
      </div>

      <div className="rapport-knoop">
        <Kop id="conservering" />
        <RijenTabel<Conserveringsregel>
          pad="uitgangspunten.conservering"
          rijen={u.conservering}
          kolommen={CONSERVERING_KOLOMMEN}
          nieuweRij={() => ({ onderdeel: "", systeem: "" })}
          toevoegen="Regel toevoegen"
        />
        <label className="rapport-veld">
          <span className="rapport-label">Slotzin</span>
          <TekstVak pad="uitgangspunten.conserveringSlot" waarde={u.conserveringSlot} rijen={1} />
        </label>
      </div>

      <div className="rapport-knoop">
        <Kop id="factoren" />
        <p className="rapport-hint">
          De belastingfactoren en -combinaties volgen uit gevolgklasse CC{cc} volgens de tabellen NB.3,
          NB.4 en NB.5 van NEN-EN 1990. Hier is niets in te vullen; het afdrukvoorbeeld toont de tabel.
        </p>
      </div>

      <div className="rapport-knoop">
        <Kop id="bestaand-situatie" />
        <Vink
          label="Bestaande situatie opnemen"
          pad="uitgangspunten.bestaand.opnemen"
          aan={u.bestaand.opnemen}
          hint="Uit bij nieuwbouw: de paragraaf valt dan weg en de nummering schuift door."
        />
        {u.bestaand.opnemen && (
          <>
            <div className="rapport-rij">
              <Veld
                label="Bouwjaar"
                pad="uitgangspunten.bestaand.bouwjaar"
                waarde={u.bestaand.bouwjaar}
                placeholder="bijv. 1965"
              />
              <Veld
                label="Bron"
                pad="uitgangspunten.bestaand.bron"
                waarde={u.bestaand.bron}
                placeholder="bijv. archieftekeningen"
              />
            </div>
            <Afgeleid
              regels={[
                {
                  label: "Norm uit het bouwjaar",
                  waarde: Number.isFinite(bouwjaar) ? normVoorBouwjaar(bouwjaar) : "— (vul het bouwjaar in)",
                },
              ]}
            />
            <div className="rapport-rij">
              <Keuze
                label="Bestaande berekening beschikbaar"
                pad="uitgangspunten.bestaand.berekeningBeschikbaar"
                waarde={u.bestaand.berekeningBeschikbaar}
                opties={JA_NEE}
              />
              <Keuze
                label="Materiaalgegevens beschikbaar"
                pad="uitgangspunten.bestaand.materiaalgegevensBeschikbaar"
                waarde={u.bestaand.materiaalgegevensBeschikbaar}
                opties={JA_NEE}
              />
            </div>
          </>
        )}
      </div>

      <div className="rapport-knoop">
        <TekstVeld id="trillingen" kop={<Kop id="trillingen" />} />
      </div>

      <div className="rapport-knoop">
        <TekstVeld id="vervormingen" kop={<Kop id="vervormingen" />} hint="De inleidende zin boven de tabel." />
        <RijenTabel<Vervormingsregel>
          pad="uitgangspunten.vervormingen"
          rijen={u.vervormingen}
          kolommen={VERVORMING_KOLOMMEN}
          nieuweRij={() => ({ onderdeel: "", ueind: "", ubij: "", uhor: "" })}
          toevoegen="Eis toevoegen"
        />
        <p className="rapport-hint">
          Schrijf een eis als 0,004l_rep, H/300 of &lt; 20 mm; "_rep" komt in de afdruk als subscript. Een
          lege cel betekent: geen eis in die kolom.
        </p>
      </div>

      {SLOTTEKSTEN.map((id) => (
        <div className="rapport-knoop" key={id}>
          <TekstVeld id={id} kop={<Kop id={id} />} />
        </div>
      ))}
    </Sectie>
  );
}
```

- [ ] **Step 2: Neem de sectie op in `RapportPanel.tsx`**

Vervang (regel 4)

```tsx
import RevisieSectie from "./paneel/RevisieSectie";
```

door

```tsx
import RevisieSectie from "./paneel/RevisieSectie";
import UitgangspuntenSectie from "./paneel/UitgangspuntenSectie";
```

Vervang (regels 24–25)

```tsx
  ["teksten", "Hoofdstukken 1–3"],
];
```

door

```tsx
  ["teksten", "Hoofdstukken 1–3"],
  ["uitgangspunten", "Uitgangspunten"],
];
```

Vervang (regels 57–58)

```tsx
        <HoofdstukTeksten />
      </OpzetBron>
```

door

```tsx
        <HoofdstukTeksten />
        <UitgangspuntenSectie />
      </OpzetBron>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop`

Expected: geen uitvoer, exitcode 0.

- [ ] **Step 4: Browsercontrole** (projectgegevens op de standaard: CC2, RC2, 50 jaar)

1. Klik **Uitgangspunten** in de sprongbalk. Sectiekop "4 UITGANGSPUNTEN" met rechts ☑ *begint op
   nieuwe pagina*.
2. **4.1 Constructieve uitgangspunten bouwwerk**: Soort bouwwerk "Woning"; leegmaken toont de acht
   suggesties (Woning … Schuur); typ "Tuinhuis": dat blijft staan. Het grijze blok toont
   Gevolgklasse CC2, Betrouwbaarheidsklasse RC2, Ontwerplevensduur "50 jaar — klasse 3" (tabel
   NB.1–2.1), Betrouwbaarheidsindex β 3,8 (tabel B2, 50 jaar), K<sub>FI</sub> 1,00 (tabel B3),
   Ontwerp- en berekeningssupervisie DSL2 (tabel B4), Inspectieniveau IL2 (tabel B5), en de link
   naar Projectgegevens.
3. Klik de link, zet Gevolgklasse CC1 en Betrouwbaarheidsklasse RC1, terug naar Rapport: CC1, RC1,
   β 3,3, K<sub>FI</sub> 0,90, DSL1, IL1. Zet beide terug op 2.
4. **4.2**: drie velden "-" met "min" erachter en het veld Verwijzing.
5. **4.3**: de materiaaltabel met de zes standaardregels (TPG Beton C20/25 met de opmerking over
   milieuklassen, Hout C24, Plaatmateriaal CE2+, Wapeningsstaal B500, Staal S235 "JR",
   Ondervoeging staal K50), Slotregel "(tenzij anders aangegeven)", en de tabel
   Bevestigingsmiddelen (Bouten 8.8, Houtdraaibout 4.6, Chemische Ankers 5.8). Klik
   **+ Materiaal toevoegen**, typ in de nieuwe rij "Aluminium" / "EN AW-6060"; ↑ zet hem een plek
   hoger; bij de bovenste rij is ↑ grijs, bij de onderste ↓. ✕ verwijdert hem; Ctrl+Z (na klik op
   een lege plek) zet hem terug.
6. **4.4**: drie conserveringsregels en de Slotzin in een meegroeiend vak.
7. **4.5**: alleen de uitleg dat de factoren uit CC2 volgen (tabellen NB.3–NB.5).
8. **Bestaande situatie** staat zonder nummer met *valt weg*, en de volgende paragraaf heet
   "4.6 Trillingen". Vink **Bestaande situatie opnemen** aan: de kop wordt "4.6 Bestaande situatie",
   Trillingen wordt 4.7, en de velden Bouwjaar, Bron, het grijze blok "Norm uit het bouwjaar — (vul
   het bouwjaar in)" en twee keuzelijsten Ja/Nee verschijnen. Typ bouwjaar 1955: "GBV 1950".
9. **Trillingen**, **Vervormingen en horizontale verplaatsingen** (inleidende zin plus de tabel met
   vijf regels en kolommen u<sub>eind</sub>, u<sub>bij</sub>, u<sub>hor</sub>), **Montage en
   bouwfase**, **Toegepaste rekenprogrammatuur**, **Temperatuursinvloeden** en **Aardbevingen**:
   elk met hun standaardtekst en een werkend menu **Standaardtekst ▾**.
10. Vink Bestaande situatie weer uit: de nummering springt terug. Geen fouten in de console.

- [ ] **Step 5: Commit**

```powershell
git add packages/desktop/src/components/rapport/paneel/UitgangspuntenSectie.tsx packages/desktop/src/components/rapport/RapportPanel.tsx
git commit -m @'
feat(rapport): uitgangspunten van hoofdstuk 4 in het rapportpaneel

Soort bouwwerk met suggesties; CC, RC, ontwerplevensduur, β, K_FI,
supervisie- en inspectieniveau grijs uit de projectgegevens en de
norm. Brandeisen, bewerkbare tabellen voor materialen,
bevestigingsmiddelen, conservering en vervormingseisen, de bestaande
situatie aan of uit met de norm uit het bouwjaar, en de
tekstonderdelen 4.7 tot en met 4.12.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 18: Belastingen (hoofdstuk 5) met klassen en opbouwen

**Files:**
- Create: `packages/desktop/src/components/rapport/paneel/OpbouwEditor.tsx`
- Create: `packages/desktop/src/components/rapport/paneel/BelastingenSectie.tsx`
- Modify: `packages/desktop/src/components/rapport/RapportPanel.tsx` (regels 1–2 imports, 26–27
  `SECTIES`, 60–61 inhoud van `OpzetBron`)

**Interfaces:**
- Consumes: `CATEGORIEEN`, `categorie(id)`, `dakQk(α)`, `DAK_QK_DIRECT`, `SNEEUW`,
  `sneeuwPlatDak()`, `PSI_WIND`, `windQp(windgebied, terrein, z)`, `windLabel(windgebied, terrein)`,
  `klasse`, `getal`, `fmt` (normwaarden.ts); `vlakOpbouw(lagen)`, `gevelOpbouw(lagen)` (opbouw.ts, Task 3:
  `regels[i]` hoort bij `lagen[i]`, en `leesVulling` leest een vulling als "90%", "90" en
  "0,9"); `Belastingklasse`, `Windcoefficient`, `Opbouw`, `Laag`, `Gevellaag`
  (model.ts); `gegevens.windgebied`, `gegevens.terreincategorie`; uit Task 13, 14 en 16: `getalTekst`,
  `verplaatst`, `RijenTabel`, `Kolom`, `TekstVeld`, `Afgeleid`, `Kop`, `Sectie`, `Veld`, `useRapport`.
- Produces:
  - `paneel/OpbouwEditor.tsx`: `type Opbouwgroep = "vloerenDaken" | "wanden"`, default
    `OpbouwEditor({ groep: Opbouwgroep; titel: string })`.
  - `paneel/BelastingenSectie.tsx`: default `BelastingenSectie()` (sectie
    `data-sectie="belastingen"`, hoofdstuk `belastingen`).
  - Keuze die dit deel vastlegt: P<sub>rep</sub> = c · q<sub>p</sub> (zoals de spec), zonder
    c<sub>s</sub>c<sub>d</sub>; q<sub>p</sub> en P<sub>rep</sub> met twee decimalen.

- [ ] **Step 1: Schrijf `OpbouwEditor.tsx`**

```tsx
import { useMemo } from "react";
import type { Gevellaag, Laag, Opbouw } from "../../../rapport/model";
import { gevelOpbouw, vlakOpbouw } from "../../../rapport/opbouw";
import { useProjectStore } from "../../../store/projectStore";
import { getalTekst, verplaatst } from "./hulp";
import RijenTabel, { type Kolom } from "./RijenTabel";

/** De twee groepen van 5.5. */
export type Opbouwgroep = "vloerenDaken" | "wanden";

const VLAK_KOLOMMEN: Kolom<Laag>[] = [
  { sleutel: "naam", kop: "Laag" },
  { sleutel: "d", kop: "d [m]", breedte: "5.5em", getal: true },
  { sleutel: "rho", kop: "ρ [kN/m³]", breedte: "6.5em", getal: true },
  { sleutel: "p", kop: "p [kN/m²]", breedte: "6.5em", getal: true, placeholder: "d × ρ" },
];

const GEVEL_KOLOMMEN: Kolom<Gevellaag>[] = [
  { sleutel: "naam", kop: "Laag" },
  { sleutel: "p", kop: <>p<sub>rep</sub> [kN/m²]</>, breedte: "7em", getal: true },
  { sleutel: "h", kop: "h [m]", breedte: "5.5em", getal: true },
  { sleutel: "vulling", kop: "vulling", breedte: "5.5em", getal: true, placeholder: "90%" },
];

function nieuweOpbouw(soort: Opbouw["soort"]): Opbouw {
  return soort === "vlak"
    ? { soort: "vlak", naam: "", lagen: [{ naam: "", d: "", rho: "", p: "" }] }
    : { soort: "gevel", naam: "", lagen: [{ naam: "", p: "", h: "", vulling: "" }] };
}

/**
 * De opbouwen van één groep uit 5.5 Blijvende belastingen. Een vlakopbouw
 * telt per laag d × ρ op (of de ingevulde p) tot kN/m²; een gevelopbouw telt
 * p × h × vulling op tot kN/m¹. De sommen komen uit opbouw.ts, dezelfde
 * rekensom als in de afdruk.
 */
export default function OpbouwEditor({ groep, titel }: { groep: Opbouwgroep; titel: string }) {
  const opbouwen = useProjectStore((s) => s.rapport.belastingen[groep]);
  const werkBij = useProjectStore((s) => s.werkRapportBij);

  const wijzig = (fn: (lijst: Opbouw[]) => Opbouw[]) =>
    werkBij((r) => {
      const b = r.belastingen;
      const lijst = fn(b[groep]);
      return {
        ...r,
        belastingen: groep === "wanden" ? { ...b, wanden: lijst } : { ...b, vloerenDaken: lijst },
      };
    });

  return (
    <div className="rapport-opbouwgroep">
      <h5 className="rapport-subkop">{titel}</h5>
      {opbouwen.length === 0 && <p className="rapport-hint">Nog geen opbouwen in deze groep.</p>}
      {opbouwen.map((o, i) => (
        <OpbouwKaart
          key={i}
          opbouw={o}
          pad={`belastingen.${groep}.${i}`}
          index={i}
          aantal={opbouwen.length}
          wijzig={wijzig}
        />
      ))}
      <div className="rapport-knoppen">
        <button type="button" className="rapport-knop" onClick={() => wijzig((l) => [...l, nieuweOpbouw("vlak")])}>
          + Vlakopbouw (kN/m²)
        </button>
        <button type="button" className="rapport-knop" onClick={() => wijzig((l) => [...l, nieuweOpbouw("gevel")])}>
          + Gevelopbouw (kN/m¹)
        </button>
      </div>
    </div>
  );
}

function OpbouwKaart({ opbouw, pad, index, aantal, wijzig }: {
  opbouw: Opbouw;
  pad: string;
  index: number;
  aantal: number;
  wijzig: (fn: (lijst: Opbouw[]) => Opbouw[]) => void;
}) {
  const zet = useProjectStore((s) => s.zetRapportVeld);
  const vlak = opbouw.soort === "vlak";
  return (
    <div className="rapport-kaart">
      <div className="rapport-kaart-kop">
        <input
          type="text"
          value={opbouw.naam}
          aria-label="Naam van de opbouw"
          placeholder={vlak ? "Naam, bijv. Begane grondvloer" : "Naam, bijv. Voorgevel"}
          onChange={(e) => zet(`${pad}.naam`, e.target.value)}
        />
        <span className="rapport-soort">{vlak ? "vlakopbouw · kN/m²" : "gevelopbouw · kN/m¹"}</span>
        <button
          type="button"
          className="rapport-icoon"
          title="Omhoog"
          disabled={index === 0}
          onClick={() => wijzig((l) => verplaatst(l, index, -1))}
        >
          ↑
        </button>
        <button
          type="button"
          className="rapport-icoon"
          title="Omlaag"
          disabled={index === aantal - 1}
          onClick={() => wijzig((l) => verplaatst(l, index, 1))}
        >
          ↓
        </button>
        <button
          type="button"
          className="rapport-icoon"
          title="Opbouw verwijderen"
          onClick={() => {
            const naam = opbouw.naam.trim() || "zonder naam";
            if (confirm(`Opbouw "${naam}" met al zijn lagen verwijderen?`)) {
              wijzig((l) => l.filter((_, j) => j !== index));
            }
          }}
        >
          ✕
        </button>
      </div>
      {opbouw.soort === "vlak" ? (
        <VlakLagen pad={`${pad}.lagen`} lagen={opbouw.lagen} />
      ) : (
        <GevelLagen pad={`${pad}.lagen`} lagen={opbouw.lagen} />
      )}
    </div>
  );
}

function VlakLagen({ pad, lagen }: { pad: string; lagen: Laag[] }) {
  const { regels, som } = useMemo(() => vlakOpbouw(lagen), [lagen]);
  return (
    <RijenTabel<Laag>
      pad={pad}
      rijen={lagen}
      kolommen={VLAK_KOLOMMEN}
      nieuweRij={() => ({ naam: "", d: "", rho: "", p: "" })}
      toevoegen="Laag toevoegen"
      extra={[{ kop: "berekend", breedte: "6em", waarde: (_rij, i) => getalTekst(regels[i]?.p, 2) }]}
      voet={
        <p className="rapport-som">
          <span>Totaal</span>
          <strong>{getalTekst(som, 2)} kN/m²</strong>
        </p>
      }
    />
  );
}

function GevelLagen({ pad, lagen }: { pad: string; lagen: Gevellaag[] }) {
  const { regels, som } = useMemo(() => gevelOpbouw(lagen), [lagen]);
  return (
    <RijenTabel<Gevellaag>
      pad={pad}
      rijen={lagen}
      kolommen={GEVEL_KOLOMMEN}
      nieuweRij={() => ({ naam: "", p: "", h: "", vulling: "" })}
      toevoegen="Laag toevoegen"
      extra={[{ kop: "q [kN/m¹]", breedte: "6em", waarde: (_rij, i) => getalTekst(regels[i]?.q, 2) }]}
      voet={
        <p className="rapport-som">
          <span>Totaal</span>
          <strong>{getalTekst(som, 2)} kN/m¹</strong>
        </p>
      }
    />
  );
}
```

- [ ] **Step 2: Schrijf `BelastingenSectie.tsx`**

```tsx
import type { Belastingklasse, Windcoefficient } from "../../../rapport/model";
import {
  CATEGORIEEN,
  DAK_QK_DIRECT,
  PSI_WIND,
  SNEEUW,
  categorie,
  dakQk,
  fmt,
  getal,
  klasse,
  sneeuwPlatDak,
  windLabel,
  windQp,
} from "../../../rapport/normwaarden";
import { useProjectStore } from "../../../store/projectStore";
import { getalTekst, verplaatst } from "./hulp";
import OpbouwEditor from "./OpbouwEditor";
import RijenTabel, { type Kolom } from "./RijenTabel";
import TekstVeld from "./TekstVeld";
import { Afgeleid, Kop, Sectie, Veld, useRapport } from "./velden";

const WIND_KOLOMMEN: Kolom<Windcoefficient>[] = [
  { sleutel: "omschrijving", kop: "Omschrijving", placeholder: "bijv. gevel, druk" },
  { sleutel: "c", kop: "c", breedte: "6em", getal: true },
];

/** Codes uit de projectgegevens → hoe de norm ze noemt. */
const GEBIED = { 1: "I", 2: "II", 3: "III" } as const;
const TERREIN = { 1: "0 (zee of kust)", 2: "II (onbebouwd)", 3: "III (bebouwd)" } as const;

const PSI = <>ψ<sub>0</sub> / ψ<sub>1</sub> / ψ<sub>2</sub></>;

/** "0,4 / 0,5 / 0,3" */
function psiTekst(psi: readonly number[]): string {
  return psi.map((p) => fmt(p, 1, true)).join(" / ");
}

const NIEUWE_KLASSE: Belastingklasse = {
  categorie: "A-vloer",
  lichteScheidingswanden: "",
  dakhelling: "",
  qlast: "",
};

/**
 * Sectie Belastingen (hoofdstuk 5): sneeuw, wind, regenwater, de
 * belastingklassen en de opbouwen van de blijvende belasting. Normwaarden
 * volgen uit de projectgegevens en worden hier alleen getoond.
 */
export default function BelastingenSectie() {
  const b = useRapport().belastingen;
  const gegevens = useProjectStore((s) => s.gegevens);
  const werkBij = useProjectStore((s) => s.werkRapportBij);

  const wg = klasse(gegevens.windgebied, 2);
  const tc = klasse(gegevens.terreincategorie, 2);
  const h = getal(b.wind.gebouwhoogte);
  const hoogteBekend = Number.isFinite(h) && h > 0;
  // Zonder gebouwhoogte is er geen q_p, maar v_b,0, z_0 en z_min hangen
  // alleen van gebied en terrein af: die staan er dan al wel.
  const wind = windQp(wg, tc, hoogteBekend ? h : 0);
  const qp = hoogteBekend ? wind.qp : NaN;

  const wijzigKlassen = (fn: (lijst: Belastingklasse[]) => Belastingklasse[]) =>
    werkBij((r) => ({ ...r, belastingen: { ...r.belastingen, klassen: fn(r.belastingen.klassen) } }));

  return (
    <Sectie
      id="belastingen"
      titel="Belastingen"
      hoofdstuk="belastingen"
      intro="Grijze waarden volgen uit de projectgegevens en de norm. De opbouwen in 5.5 staan alleen in het rapport; ze werken (nog) niet door in de rekenbladen."
    >
      <div className="rapport-knoop">
        <Kop id="sneeuw" />
        <Afgeleid
          regels={[
            {
              label: "Plat dak",
              waarde: (
                <>
                  s = μ<sub>1</sub>·C<sub>e</sub>·C<sub>t</sub>·s<sub>k</sub> = {fmt(SNEEUW.mu1, 1)} ×{" "}
                  {fmt(SNEEUW.ce, 1)} × {fmt(SNEEUW.ct, 1)} × {fmt(SNEEUW.sk, 1)} ={" "}
                  {fmt(sneeuwPlatDak(), 2)} kN/m²
                </>
              ),
              bron: "NEN-EN 1991-1-3 (5.1)",
            },
          ]}
        />
        <TekstVeld id="sneeuw" hint="Tekst onder de sneeuwbelasting." />
      </div>

      <div className="rapport-knoop">
        <Kop id="wind" />
        <Afgeleid
          uitProjectgegevens
          regels={[
            {
              label: "Windgebied",
              waarde: <>{GEBIED[wg]} — v<sub>b,0</sub> = {fmt(wind.vb0, 1)} m/s</>,
              bron: "tabel NB.1",
            },
            { label: "Terreincategorie", waarde: TERREIN[tc], bron: "tabel NB.3–4.1" },
            { label: "Omschrijving in 5.2", waarde: windLabel(wg, tc) },
          ]}
        />
        <div className="rapport-rij">
          <Veld
            label="Gebouwhoogte"
            pad="belastingen.wind.gebouwhoogte"
            waarde={b.wind.gebouwhoogte}
            eenheid="m"
            placeholder="bijv. 9"
          />
          <Veld
            label={<>c<sub>s</sub>c<sub>d</sub></>}
            pad="belastingen.wind.cscd"
            waarde={b.wind.cscd}
            hint="1 bij gebouwen lager dan 15 m, zie 6.2(1)."
          />
        </div>
        <Afgeleid
          regels={[
            { label: <>z<sub>0</sub></>, waarde: `${fmt(wind.z0, 3, true)} m` },
            { label: <>z<sub>min</sub></>, waarde: `${fmt(wind.zmin, 0)} m` },
            {
              label: <>z<sub>e</sub></>,
              waarde: hoogteBekend ? `${fmt(wind.ze, 2, true)} m` : "—",
              bron: "gebouwhoogte, ten minste z_min",
            },
            {
              label: <>q<sub>p</sub>(z<sub>e</sub>)</>,
              waarde: hoogteBekend ? `${fmt(qp, 2)} kN/m²` : "— (vul de gebouwhoogte in)",
              bron: "(4.8)",
            },
            { label: PSI, waarde: psiTekst(PSI_WIND), bron: "tabel NB.2–A1.1" },
          ]}
        />
        <h6 className="rapport-subkop">Coëfficiënten</h6>
        <RijenTabel<Windcoefficient>
          pad="belastingen.wind.coefficienten"
          rijen={b.wind.coefficienten}
          kolommen={WIND_KOLOMMEN}
          nieuweRij={() => ({ omschrijving: "", c: "" })}
          toevoegen="Coëfficiënt toevoegen"
          extra={[
            {
              kop: <>P<sub>rep</sub> [kN/m²]</>,
              breedte: "8em",
              waarde: (rij) => getalTekst(getal(rij.c) * qp, 2),
            },
          ]}
        />
        <p className="rapport-hint">
          P<sub>rep</sub> = c · q<sub>p</sub>; zonder gebouwhoogte blijft de kolom leeg.
        </p>
      </div>

      <div className="rapport-knoop">
        <TekstVeld id="regenwater" kop={<Kop id="regenwater" />} />
      </div>

      <div className="rapport-knoop">
        <Kop id="veranderlijk" />
        {b.klassen.length === 0 && <p className="rapport-hint">Nog geen belastingklassen.</p>}
        {b.klassen.map((k, i) => (
          <KlasseKaart key={i} regel={k} index={i} aantal={b.klassen.length} wijzig={wijzigKlassen} />
        ))}
        <button
          type="button"
          className="rapport-knop"
          onClick={() => wijzigKlassen((l) => [...l, { ...NIEUWE_KLASSE }])}
        >
          + Belastingklasse toevoegen
        </button>
      </div>

      <div className="rapport-knoop">
        <Kop id="blijvend" />
        <OpbouwEditor groep="vloerenDaken" titel="Vloeren, daken" />
        <OpbouwEditor groep="wanden" titel="Wanden" />
      </div>
    </Sectie>
  );
}

/**
 * Eén belastingklasse uit 5.4. Bij een vloer telt de toeslag voor lichte
 * scheidingswanden op bij q_k; bij een dak hangt q_k af van de dakhelling.
 */
function KlasseKaart({ regel, index, aantal, wijzig }: {
  regel: Belastingklasse;
  index: number;
  aantal: number;
  wijzig: (fn: (lijst: Belastingklasse[]) => Belastingklasse[]) => void;
}) {
  const zet = useProjectStore((s) => s.zetRapportVeld);
  const pad = `belastingen.klassen.${index}`;
  const cat = categorie(regel.categorie);
  const ls = getal(regel.lichteScheidingswanden);
  const alfa = getal(regel.dakhelling);

  return (
    <div className="rapport-kaart">
      <div className="rapport-kaart-kop">
        <select
          value={regel.categorie}
          aria-label="Categorie"
          onChange={(e) => zet(`${pad}.categorie`, e.target.value)}
        >
          {!cat && <option value={regel.categorie}>{regel.categorie || "—"} (onbekend)</option>}
          <optgroup label="Vloeren">
            {CATEGORIEEN.filter((c) => c.soort === "vloer").map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Daken">
            {CATEGORIEEN.filter((c) => c.soort === "dak").map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </optgroup>
        </select>
        <button
          type="button"
          className="rapport-icoon"
          title="Omhoog"
          disabled={index === 0}
          onClick={() => wijzig((l) => verplaatst(l, index, -1))}
        >
          ↑
        </button>
        <button
          type="button"
          className="rapport-icoon"
          title="Omlaag"
          disabled={index === aantal - 1}
          onClick={() => wijzig((l) => verplaatst(l, index, 1))}
        >
          ↓
        </button>
        <button
          type="button"
          className="rapport-icoon"
          title="Belastingklasse verwijderen"
          onClick={() => wijzig((l) => l.filter((_, j) => j !== index))}
        >
          ✕
        </button>
      </div>

      {!cat && <p className="rapport-hint">Onbekende categorie: kies er een uit de lijst.</p>}

      {cat?.soort === "vloer" && (
        <>
          <Veld
            label="Lichte scheidingswanden (L.S.)"
            pad={`${pad}.lichteScheidingswanden`}
            waarde={regel.lichteScheidingswanden}
            eenheid="kN/m²"
            placeholder="leeg = geen"
            hint="0,5 / 0,8 / 1,2 kN/m² bij een wandgewicht tot 1,0 / 2,0 / 3,0 kN/m, zie 6.3.1.2(8)."
          />
          <Afgeleid
            regels={[
              { label: <>q<sub>k</sub></>, waarde: `${fmt(cat.qk, 2)} kN/m²`, bron: "tabel NB.1–6.2" },
              {
                label: <>q<sub>k</sub> + L.S.</>,
                waarde: `${fmt(cat.qk + (Number.isFinite(ls) ? ls : 0), 2)} kN/m²`,
              },
              { label: <>Q<sub>k</sub></>, waarde: `${fmt(cat.Qk, 1)} kN` },
              { label: PSI, waarde: psiTekst(cat.psi), bron: "tabel NB.2–A1.1" },
            ]}
          />
        </>
      )}

      {cat?.soort === "dak" && (
        <>
          <div className="rapport-rij">
            <Veld label="Dakhelling α" pad={`${pad}.dakhelling`} waarde={regel.dakhelling} eenheid="°" />
            <Veld label="q-last" pad={`${pad}.qlast`} waarde={regel.qlast} eenheid="kN/m¹" />
          </div>
          <Afgeleid
            regels={[
              {
                label: <>q<sub>k</sub> plat dak</>,
                waarde: `${fmt(cat.qk, 2)} kN/m²`,
                bron: "tabel NB.4–6.10",
              },
              {
                label: <>q<sub>k</sub> bij α</>,
                waarde: Number.isFinite(alfa) ? `${fmt(dakQk(alfa), 2)} kN/m²` : "— (vul de dakhelling in)",
              },
              {
                label: <>Q<sub>k</sub></>,
                waarde: `${fmt(cat.Qk, 1)} kN; direct onder het dakbeschot ${fmt(DAK_QK_DIRECT, 1)} kN`,
              },
              { label: PSI, waarde: psiTekst(cat.psi), bron: "tabel NB.2–A1.1" },
            ]}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Neem de sectie op in `RapportPanel.tsx`**

Vervang (regels 1–2)

```tsx
import { useRef } from "react";
import DocumentSectie from "./paneel/DocumentSectie";
```

door

```tsx
import { useRef } from "react";
import BelastingenSectie from "./paneel/BelastingenSectie";
import DocumentSectie from "./paneel/DocumentSectie";
```

Vervang (regels 26–27)

```tsx
  ["uitgangspunten", "Uitgangspunten"],
];
```

door

```tsx
  ["uitgangspunten", "Uitgangspunten"],
  ["belastingen", "Belastingen"],
];
```

Vervang (regels 60–61)

```tsx
        <UitgangspuntenSectie />
      </OpzetBron>
```

door

```tsx
        <UitgangspuntenSectie />
        <BelastingenSectie />
      </OpzetBron>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop`

Expected: geen uitvoer, exitcode 0.

- [ ] **Step 5: Browsercontrole** (projectgegevens: windgebied II, terreincategorie II)

1. Klik **Belastingen** in de sprongbalk: sectiekop "5 BELASTINGEN" met ☑ *begint op nieuwe
   pagina*.
2. **5.1 Sneeuwbelastingen(Q)**: grijs "s = μ<sub>1</sub>·C<sub>e</sub>·C<sub>t</sub>·s<sub>k</sub>
   = 0,8 × 1,0 × 1,0 × 0,7 = 0,56 kN/m²" (NEN-EN 1991-1-3 (5.1)) en het tekstvak met de
   sneeuwtekst.
3. **5.2 Windbelastingen(Q)**: grijs Windgebied "II — v<sub>b,0</sub> = 27,0 m/s", Terreincategorie
   "II (onbebouwd)", Omschrijving in 5.2 = de uitkomst van `windLabel(2, 2)`, en de link naar
   Projectgegevens. Het label c<sub>s</sub>c<sub>d</sub> staat op één regel. Zonder gebouwhoogte:
   z<sub>0</sub> 0,2 m, z<sub>min</sub> 4 m, z<sub>e</sub> "—", q<sub>p</sub> "— (vul de
   gebouwhoogte in)", ψ 0 / 0,2 / 0, en in de coëfficiëntentabel (0,04 / 0,40 / 0,80 / 1,10) staat
   bij P<sub>rep</sub> overal "—".
4. Typ gebouwhoogte 9: z<sub>e</sub> 9 m, q<sub>p</sub>(z<sub>e</sub>) **0,82 kN/m²**, P<sub>rep</sub>
   0,03 / 0,33 / 0,66 / 0,90. Zet in Projectgegevens de terreincategorie op III: q<sub>p</sub> 0,65;
   terug op II. Typ gebouwhoogte 5 en terrein III: z<sub>e</sub> 7 m (z<sub>min</sub>),
   q<sub>p</sub> 0,58. Zet alles terug (terrein II, hoogte 9).
5. **5.3 Regenwateraccumulatie(Q)**: tekstvak met de standaardtekst.
6. **5.4 Overige veranderlijke belastingen(Q)**: twee kaarten.
   - Vloer (A-vloer): L.S. 0,80 kN/m²; grijs q<sub>k</sub> 1,75, q<sub>k</sub> + L.S. 2,55,
     Q<sub>k</sub> 3,0 kN, ψ 0,4 / 0,5 / 0,3. Maak L.S. leeg: q<sub>k</sub> + L.S. 1,75.
   - Dak (H-dak): dakhelling 0 °, q-last 2,0 kN/m¹; grijs q<sub>k</sub> plat dak 1,00,
     q<sub>k</sub> bij α 1,00, Q<sub>k</sub> "1,5 kN; direct onder het dakbeschot 2,0 kN", ψ 0 / 0 / 0.
     Typ α 17,5: q<sub>k</sub> bij α 0,50; α 25: 0,00.
   - **+ Belastingklasse toevoegen** voegt een vloerkaart toe; zet de categorie op een dak: de
     velden wisselen naar dakhelling en q-last. ↑/↓ verplaatsen de kaart, ✕ verwijdert hem.
7. **5.5 Blijvende belastingen(G)** heeft *valt weg* zolang er geen opbouw is. Klik bij "Vloeren,
   daken" **+ Vlakopbouw (kN/m²)**: een kaart met naamveld, "vlakopbouw · kN/m²" en één lege laag;
   *valt weg* verdwijnt. Noem hem "Begane grondvloer" en vul vier lagen in (**+ Laag toevoegen**):
   p = 0,30; d = 0,02 en ρ = 4,0; p = 0,08; d = 0,015 en ρ = 9,0. Kolom *berekend*: 0,30 / 0,08 /
   0,08 / 0,14; **Totaal 0,60 kN/m²**.
8. Klik bij "Wanden" **+ Gevelopbouw (kN/m¹)**, noem hem "Voorgevel" met drie lagen: p 2, h 3,
   vulling 90%; p 2, h 3, vulling 90%; p 0,75, h 3, vulling 10%. Kolom q: 5,40 / 5,40 / 0,23;
   **Totaal 11,03 kN/m¹**.
9. Verplaats een laag met ↑/↓. Bij één opbouw in een groep zijn ↑ en ↓ op de kaart zelf grijs.
   ✕ bij de opbouw vraagt `Opbouw "Voorgevel" met al zijn lagen verwijderen?`; OK verwijdert hem,
   Ctrl+Z (na klik op een lege plek) zet hem terug.
10. Geen fouten in de console.

- [ ] **Step 6: Commit**

```powershell
git add packages/desktop/src/components/rapport/paneel/OpbouwEditor.tsx packages/desktop/src/components/rapport/paneel/BelastingenSectie.tsx packages/desktop/src/components/rapport/RapportPanel.tsx
git commit -m @'
feat(rapport): belastingen van hoofdstuk 5 met klassen en opbouwen

Sneeuw op een plat dak en de wind uit de projectgegevens staan grijs;
gebouwhoogte en c_s·c_d zijn invoer, q_p rekent mee en de
coëfficiëntentabel toont P_rep = c·q_p. Belastingklassen kiezen een
categorie en tonen q_k, Q_k en ψ, met lichte scheidingswanden bij een
vloer en dakhelling en q-last bij een dak. De opbouwen van 5.5 hebben
lagen die je toevoegt, verplaatst en verwijdert, met de som uit
opbouw.ts eronder.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 19: Berekeningen, bijlagen en bureau in het paneel

**Files:**
- Modify: `packages/desktop/src/components/calc/bladResultaat.ts` (functie `samenvatting` achteraan erbij)
- Create: `packages/desktop/src/components/rapport/paneel/BerekeningenSectie.tsx`
- Create: `packages/desktop/src/components/rapport/paneel/BijlagenSectie.tsx`
- Create: `packages/desktop/src/components/rapport/paneel/BureauSectie.tsx`
- Modify: `packages/desktop/src/components/rapport/RapportPanel.tsx` (regels 2–3 imports, 28–29
  `SECTIES`, 63–64 inhoud van `OpzetBron`)

**Interfaces:**
- Consumes: `parse`, `evaluate` (`@ifc-calc/core`); `calcpadIncludes`, `calcpadImageUrls`
  (templates/calcpad-includes.ts); `projectScope(gegevens)` (store/projectGegevens.ts);
  `leesResultaat(nodes, naam)`, `Resultaat` (components/calc/bladResultaat.ts);
  `rapport.toelichting`, `rapport.inHoofdstuk`, `rapport.bijlagen`, `rapport.bureau`;
  `useBureauStore((s) => s.profiel)`; `Huisstijl` (model.ts); uit Task 13–14: `bijlageLetter`,
  `verplaatst`, `adresRegel`, `lettertypeNaam`, `zelfdeBureau`, `GroeiVeld`, `Sectie`,
  `useOpzetStand` (`blad(exemplaarId)`), `useRapport`.
- Produces:
  - `components/calc/bladResultaat.ts`: `export function samenvatting(r: Resultaat): string` — de
    automatische samenvatting voor hoofdstuk Berekeningen, `"<titel> — UC 0,82, voldoet."`, zonder
    UC `"<titel> — voldoet."`, zonder beide `"<titel>."`. Eén functie voor paneel en afdruk (Task 28).
  - `paneel/BerekeningenSectie.tsx`: default `BerekeningenSectie()` (hoofdstuk `berekeningen`).
  - `paneel/BijlagenSectie.tsx`: default `BijlagenSectie()`.
  - `paneel/BureauSectie.tsx`: default `BureauSectie()` — **Bijwerken uit bureauprofiel** zet
    `rapport.bureau = structuredClone(profiel)` via `werkRapportBij`.

- [ ] **Step 1: Voeg `samenvatting` toe aan `bladResultaat.ts` en schrijf `BerekeningenSectie.tsx`**

Voeg achteraan in `packages/desktop/src/components/calc/bladResultaat.ts` toe (`ucTekst` en
`Resultaat` staan al in dat bestand):

```ts
/** De automatische samenvatting voor hoofdstuk Berekeningen: "Houten balklaag — UC 0,82, voldoet.". */
export function samenvatting(r: Resultaat): string {
  const delen: string[] = [];
  if (r.uc !== null) delen.push(`UC ${ucTekst(r.uc)}`);
  if (r.voldoet !== null) delen.push(r.voldoet ? "voldoet" : "voldoet niet");
  return delen.length > 0 ? `${r.titel} — ${delen.join(", ")}.` : `${r.titel}.`;
}
```

Maak daarna `packages/desktop/src/components/rapport/paneel/BerekeningenSectie.tsx`:

```tsx
import { useMemo } from "react";
import { evaluate, parse } from "@ifc-calc/core";
import { calcpadImageUrls, calcpadIncludes } from "../../../templates/calcpad-includes";
import { projectScope } from "../../../store/projectGegevens";
import { useProjectStore } from "../../../store/projectStore";
import { leesResultaat, samenvatting, type Resultaat } from "../../calc/bladResultaat";
import { GroeiVeld, Sectie, useOpzetStand, useRapport } from "./velden";

interface Uitkomst {
  resultaat: Resultaat;
  /** De foutmelding als het blad niet door te rekenen was. */
  fout: string | null;
}

/**
 * Rekent elk blad door en leest zijn uitkomst, net als de afdruk. Hangt
 * alleen af van de bladen en de projectgegevens: typen in het rapport rekent
 * niets opnieuw.
 */
function useUitkomsten(): Map<string, Uitkomst> {
  const exemplaren = useProjectStore((s) => s.exemplaren);
  const gegevens = useProjectStore((s) => s.gegevens);
  return useMemo(() => {
    const scope = projectScope(gegevens);
    const opties = { includes: calcpadIncludes, imageUrls: calcpadImageUrls };
    const uit = new Map<string, Uitkomst>();
    for (const ex of exemplaren) {
      try {
        const nodes = evaluate(parse(ex.source, opties), ex.waarden, scope);
        uit.set(ex.id, { resultaat: leesResultaat(nodes, ex.naam), fout: null });
      } catch (err) {
        uit.set(ex.id, {
          resultaat: { titel: ex.naam, norm: "", uc: null, voldoet: null },
          fout: (err as Error).message,
        });
      }
    }
    return uit;
  }, [exemplaren, gegevens]);
}

/**
 * Sectie Berekeningen (hoofdstuk 6): per rekenblad de samenvatting die in
 * het rapport komt, een eigen toelichting, en de keuze of de volledige
 * uitwerking in het hoofdstuk zelf staat of in bijlage A.
 */
export default function BerekeningenSectie() {
  const exemplaren = useProjectStore((s) => s.exemplaren);
  const zet = useProjectStore((s) => s.zetRapportVeld);
  const rapport = useRapport();
  const stand = useOpzetStand();
  const uitkomsten = useUitkomsten();

  return (
    <Sectie
      id="berekeningen"
      titel="Berekeningen"
      hoofdstuk="berekeningen"
      intro="Elk rekenblad van het project krijgt een paragraaf met een samenvatting en je eigen toelichting. De volledige uitwerking staat in bijlage A, tenzij je hem in het hoofdstuk zelf opneemt."
    >
      {exemplaren.length === 0 && (
        <p className="rapport-hint">
          Dit project heeft nog geen rekenbladen. Voeg ze toe in de projectboom; elk blad krijgt hier
          vanzelf een paragraaf.
        </p>
      )}
      {exemplaren.map((ex) => {
        const uitkomst = uitkomsten.get(ex.id);
        const r = uitkomst?.resultaat;
        // Zonder UC, oordeel of eigen kop zegt de samenvatting niets meer dan de naam.
        const zegtIets = !!r && (r.titel !== ex.naam || r.uc !== null || r.voldoet !== null);
        const plaats = stand.blad(ex.id);
        const inHoofdstuk = rapport.inHoofdstuk[ex.id] ?? false;
        // Het exemplaar-id staat in het pad; ids van de vorm "ex-…" bevatten
        // geen punt, dus leesPad knipt ze niet in stukken.
        return (
          <div className="rapport-kaart" key={ex.id}>
            <div className="rapport-kaart-kop">
              {plaats?.nummer && <span className="rapport-nummer">{plaats.nummer}</span>}
              <span className="rapport-kaart-titel">{ex.naam}</span>
              {r && r.voldoet !== null && (
                <span className={`rapport-oordeel ${r.voldoet ? "goed" : "fout"}`}>
                  {r.voldoet ? "voldoet" : "voldoet niet"}
                </span>
              )}
            </div>
            {r && zegtIets && <p className="rapport-samenvatting">{samenvatting(r)}</p>}
            {uitkomst?.fout && (
              <p className="rapport-hint">Dit blad kon niet worden doorgerekend: {uitkomst.fout}</p>
            )}
            <GroeiVeld
              waarde={rapport.toelichting[ex.id] ?? ""}
              onChange={(v) => zet(`toelichting.${ex.id}`, v)}
              placeholder="Eigen toelichting bij deze berekening (optioneel)."
            />
            <div className="rapport-kaart-voet">
              <label className="rapport-vink">
                <input
                  type="checkbox"
                  checked={inHoofdstuk}
                  onChange={(e) => zet(`inHoofdstuk.${ex.id}`, e.target.checked)}
                />
                Uitwerking in dit hoofdstuk
              </label>
              <span className="rapport-hint">
                {inHoofdstuk
                  ? "De volledige uitwerking staat direct onder de toelichting."
                  : `De volledige uitwerking staat in bijlage ${plaats?.bijlage || "A"}.`}
              </span>
            </div>
          </div>
        );
      })}
    </Sectie>
  );
}
```

- [ ] **Step 2: Schrijf `BijlagenSectie.tsx`**

```tsx
import { useProjectStore } from "../../../store/projectStore";
import { bijlageLetter, verplaatst } from "./hulp";
import { Sectie } from "./velden";

/**
 * Sectie Bijlagen. Bijlage A is altijd de uitgebreide uitwerking van de
 * berekeningen; eigen bijlagen (een constructieoverzicht, een sondering)
 * staan alleen met hun titel in de inhoud.
 */
export default function BijlagenSectie() {
  const bijlagen = useProjectStore((s) => s.rapport.bijlagen);
  const inHoofdstuk = useProjectStore((s) => s.rapport.inHoofdstuk);
  const exemplaren = useProjectStore((s) => s.exemplaren);
  const zet = useProjectStore((s) => s.zetRapportVeld);
  const werkBij = useProjectStore((s) => s.werkRapportBij);

  const wijzig = (fn: (lijst: string[]) => string[]) =>
    werkBij((r) => ({ ...r, bijlagen: fn(r.bijlagen) }));

  // Bijlage A bestaat alleen als er minstens één uitwerking in staat.
  const metA = exemplaren.some((e) => !inHoofdstuk[e.id]);

  // Zelfde telling als bijlagen() in rapport/opzet.ts: een bijlage zonder titel telt niet mee.
  let volgnummer = 0;
  const letters = bijlagen.map((t) => (t.trim() === "" ? "–" : bijlageLetter(volgnummer++)));

  return (
    <Sectie
      id="bijlagen"
      titel="Bijlagen"
      intro="Eigen bijlagen staan met hun titel in de inhoudsopgave; het document zelf voeg je buiten de app toe."
    >
      <ol className="rapport-bijlagen">
        <li>
          <span className="rapport-letter">A</span>
          <span className="rapport-vast">
            Uitgebreide uitwerking berekeningen
            {metA ? "" : " — vervalt: er staat geen uitwerking in de bijlage"}
          </span>
        </li>
        {bijlagen.map((titel, i) => (
          <li key={i}>
            <span className="rapport-letter">{letters[i]}</span>
            <input
              type="text"
              value={titel}
              placeholder="Titel, bijv. Constructieoverzicht"
              aria-label={`Titel van bijlage ${letters[i]}`}
              onChange={(e) => zet(`bijlagen.${i}`, e.target.value)}
            />
            <button
              type="button"
              className="rapport-icoon"
              title="Omhoog"
              disabled={i === 0}
              onClick={() => wijzig((l) => verplaatst(l, i, -1))}
            >
              ↑
            </button>
            <button
              type="button"
              className="rapport-icoon"
              title="Omlaag"
              disabled={i === bijlagen.length - 1}
              onClick={() => wijzig((l) => verplaatst(l, i, 1))}
            >
              ↓
            </button>
            <button
              type="button"
              className="rapport-icoon"
              title="Bijlage verwijderen"
              onClick={() => wijzig((l) => l.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className="rapport-knop" onClick={() => wijzig((l) => [...l, ""])}>
        + Bijlage toevoegen
      </button>
    </Sectie>
  );
}
```

- [ ] **Step 3: Schrijf `BureauSectie.tsx`**

```tsx
import { useMemo } from "react";
import type { Huisstijl } from "../../../rapport/model";
import { useBureauStore } from "../../../store/bureauProfiel";
import { useProjectStore } from "../../../store/projectStore";
import { adresRegel, lettertypeNaam, zelfdeBureau } from "./hulp";
import { Sectie } from "./velden";

const KLEUREN: readonly [sleutel: Exclude<keyof Huisstijl, "lettertype">, label: string][] = [
  ["hoofdkleur", "hoofdkleur"],
  ["accentkleur", "accent"],
  ["tabeltekst", "tabeltekst"],
  ["invoerkleur", "invoer"],
];

/**
 * Sectie Bureau: de kopie van het bureauprofiel die in dit rapport is
 * vastgelegd.
 *
 * Een rapport bewaart zijn eigen kopie, zodat een uitgebracht rapport niet
 * verandert als het profiel later wijzigt (een nieuw logo, een constructeur
 * die vertrekt). Bijwerken is een bewuste stap, en één stap in ongedaan
 * maken.
 */
export default function BureauSectie() {
  const bureau = useProjectStore((s) => s.rapport.bureau);
  const werkBij = useProjectStore((s) => s.werkRapportBij);
  const profiel = useBureauStore((s) => s.profiel);

  const gelijk = useMemo(() => zelfdeBureau(bureau, profiel), [bureau, profiel]);
  const vastgelegd = bureau.naam.trim() !== "";
  const profielIngevuld = profiel.naam.trim() !== "";

  const bijwerken = () => {
    if (vastgelegd && !confirm("De bureaugegevens van dit rapport bijwerken uit het huidige bureauprofiel?")) {
      return;
    }
    werkBij((r) => ({ ...r, bureau: structuredClone(profiel) }));
  };

  let melding: string;
  if (!vastgelegd && !profielIngevuld) {
    melding = "Er is nog geen bureauprofiel. Vul het in bij Instellingen → Bureau en werk dit rapport hier bij.";
  } else if (!vastgelegd) {
    melding =
      "Dit rapport heeft nog geen vastgelegde bureaugegevens; de afdruk gebruikt zolang het bureauprofiel uit de instellingen.";
  } else if (!profielIngevuld) {
    melding = "Het bureauprofiel in de instellingen is leeg; dit rapport houdt zijn vastgelegde gegevens.";
  } else if (gelijk) {
    melding = "Gelijk aan het bureauprofiel in de instellingen.";
  } else {
    melding =
      "Het bureauprofiel in de instellingen wijkt af van wat in dit rapport is vastgelegd. Bijwerken werkt alleen dit rapport bij.";
  }

  return (
    <Sectie
      id="bureau"
      titel="Bureau"
      intro="De bureaugegevens en huisstijl zoals ze in dit rapport zijn vastgelegd."
    >
      <p className={`rapport-melding-blok${vastgelegd && gelijk ? " rustig" : ""}`}>{melding}</p>

      {vastgelegd && (
        <div className="rapport-bureau">
          <dl>
            <dt>Naam</dt>
            <dd>{bureau.naam}</dd>
            <dt>Adres</dt>
            <dd>{adresRegel(bureau) || "—"}</dd>
            <dt>Telefoon</dt>
            <dd>{bureau.telefoon || "—"}</dd>
            <dt>E-mail</dt>
            <dd>{bureau.email || "—"}</dd>
            <dt>Constructeurs</dt>
            <dd>
              {bureau.constructeurs.length === 0 ? (
                "—"
              ) : (
                <ul>
                  {bureau.constructeurs.map((c, i) => (
                    <li key={i}>{[c.naam, c.telefoon, c.email].filter((s) => s.trim() !== "").join(" · ")}</li>
                  ))}
                </ul>
              )}
            </dd>
            <dt>Huisstijl</dt>
            <dd>
              <span className="rapport-kleuren">
                {KLEUREN.map(([sleutel, label]) => (
                  <span className="rapport-kleur" key={sleutel}>
                    <span className="rapport-staal" style={{ background: bureau.huisstijl[sleutel] }} />
                    {label}
                  </span>
                ))}
              </span>
              <span className="rapport-lettertype" style={{ fontFamily: bureau.huisstijl.lettertype }}>
                {lettertypeNaam(bureau.huisstijl.lettertype) || "—"}
              </span>
            </dd>
          </dl>
          {bureau.logo ? (
            <img className="rapport-beeld" src={bureau.logo} alt="Logo" />
          ) : (
            <span className="rapport-hint">geen logo</span>
          )}
        </div>
      )}
      {vastgelegd && bureau.voetafbeelding && (
        <img className="rapport-voetbeeld" src={bureau.voetafbeelding} alt="Voetafbeelding" />
      )}

      <button
        type="button"
        className="rapport-knop rapport-knop-primair"
        disabled={!profielIngevuld || gelijk}
        onClick={bijwerken}
      >
        Bijwerken uit bureauprofiel
      </button>
    </Sectie>
  );
}
```

- [ ] **Step 4: Neem de secties op in `RapportPanel.tsx`**

Vervang (regels 2–3)

```tsx
import BelastingenSectie from "./paneel/BelastingenSectie";
import DocumentSectie from "./paneel/DocumentSectie";
```

door

```tsx
import BelastingenSectie from "./paneel/BelastingenSectie";
import BerekeningenSectie from "./paneel/BerekeningenSectie";
import BijlagenSectie from "./paneel/BijlagenSectie";
import BureauSectie from "./paneel/BureauSectie";
import DocumentSectie from "./paneel/DocumentSectie";
```

Vervang (regels 28–29)

```tsx
  ["belastingen", "Belastingen"],
];
```

door

```tsx
  ["belastingen", "Belastingen"],
  ["berekeningen", "Berekeningen"],
  ["bijlagen", "Bijlagen"],
  ["bureau", "Bureau"],
];
```

Vervang (regels 63–64)

```tsx
        <BelastingenSectie />
      </OpzetBron>
```

door

```tsx
        <BelastingenSectie />
        <BerekeningenSectie />
        <BijlagenSectie />
        <BureauSectie />
      </OpzetBron>
```

Het volledige bestand ziet er daarna zo uit:

```tsx
import { useRef } from "react";
import BelastingenSectie from "./paneel/BelastingenSectie";
import BerekeningenSectie from "./paneel/BerekeningenSectie";
import BijlagenSectie from "./paneel/BijlagenSectie";
import BureauSectie from "./paneel/BureauSectie";
import DocumentSectie from "./paneel/DocumentSectie";
import HoofdstukTeksten from "./paneel/HoofdstukTeksten";
import RevisieSectie from "./paneel/RevisieSectie";
import UitgangspuntenSectie from "./paneel/UitgangspuntenSectie";
import { OpzetBron } from "./paneel/velden";
import "./RapportPanel.css";

/**
 * Het rapportpaneel: één scrollend formulier met alles wat in het
 * constructierapport komt en niet al in de projectgegevens of de rekenbladen
 * staat.
 *
 * Wat je hier invult hoort bij het project: het gaat mee in het
 * projectbestand en in ongedaan maken. Grijze waarden volgen uit de
 * projectgegevens of de norm en worden pas bij het opmaken berekend, zodat
 * rapport en rekenbladen nooit uit de pas lopen. De tab Afdrukvoorbeeld
 * ernaast toont het hele rapport.
 */

/** De secties in volgorde, voor de sprongbalk bovenaan. */
const SECTIES: readonly [id: string, label: string][] = [
  ["document", "Document"],
  ["revisies", "Revisies"],
  ["teksten", "Hoofdstukken 1–3"],
  ["uitgangspunten", "Uitgangspunten"],
  ["belastingen", "Belastingen"],
  ["berekeningen", "Berekeningen"],
  ["bijlagen", "Bijlagen"],
  ["bureau", "Bureau"],
];

export default function RapportPanel() {
  const paneelRef = useRef<HTMLDivElement>(null);

  const naarSectie = (id: string) =>
    paneelRef.current
      ?.querySelector(`[data-sectie="${id}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="rapport-panel" ref={paneelRef}>
      <div className="rapport-kop">
        <h1>Rapport</h1>
        <p>
          Documentgegevens, teksten, uitgangspunten en belastingen van het constructierapport. Alles
          hier hoort bij het project en gaat mee in opslaan en ongedaan maken. Grijze waarden komen uit
          de projectgegevens of de norm.
        </p>
      </div>

      <nav className="rapport-nav" aria-label="Secties van het rapport">
        {SECTIES.map(([id, label]) => (
          <button key={id} type="button" onClick={() => naarSectie(id)}>
            {label}
          </button>
        ))}
      </nav>

      <OpzetBron>
        <DocumentSectie />
        <RevisieSectie />
        <HoofdstukTeksten />
        <UitgangspuntenSectie />
        <BelastingenSectie />
        <BerekeningenSectie />
        <BijlagenSectie />
        <BureauSectie />
      </OpzetBron>

      <p className="rapport-voet">
        Het bureauprofiel — naam, logo, huisstijl en constructeurs — staat bij Instellingen → Bureau.
        Rapport (PDF) in het lint drukt het hele rapport af; PDF blad blijft één losse berekening.
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop`

Expected: geen uitvoer, exitcode 0.

- [ ] **Step 6: Controlescripts**

Run: `node scripts/check-rapportpaneel.mjs`

Expected: PASS, laatste regel `Rapportpaneel: alle hulpfuncties kloppen.`

- [ ] **Step 7: Browsercontrole**

1. Zonder rekenbladen: klik **Berekeningen** in de sprongbalk (die nu acht knoppen heeft). Sectiekop
   "6 BEREKENINGEN" met ☑ *begint op nieuwe pagina* en de melding "Dit project heeft nog geen
   rekenbladen…". **BIJLAGEN**: regel "A Uitgebreide uitwerking berekeningen — vervalt: er staat
   geen uitwerking in de bijlage".
2. Voeg via het lint (Module toevoegen) twee rekenbladen toe, bijvoorbeeld een balklaag en een
   gording, en klik weer op **Rapport**. Per blad een kaart: nummer "6.1"/"6.2", de naam, rechts
   "voldoet" (groen) of "voldoet niet" (rood) als het blad een oordeel geeft, daaronder de
   samenvatting "<titel> — UC 0,xx, voldoet." (of "voldoet niet"; dezelfde UC als in de kop van het
   blad in het afdrukvoorbeeld), een leeg tekstvak "Eigen toelichting bij deze berekening (optioneel)." en
   ☐ **Uitwerking in dit hoofdstuk** met "De volledige uitwerking staat in bijlage A.1" (A.2 bij het
   tweede blad). Bijlage A heeft nu geen "vervalt" meer.
3. Typ een toelichting bij 6.1: het vak groeit mee. Vink **Uitwerking in dit hoofdstuk** aan bij
   6.1: de tekst wordt "De volledige uitwerking staat direct onder de toelichting." en het tweede
   blad krijgt het bijlagenummer dat `bouwOpzet` nu geeft. Vink ook 6.2 aan: bijlage A krijgt weer
   "vervalt". Zet beide vinkjes terug.
4. Typen in het rapport rekent de bladen niet opnieuw door (het paneel blijft vlot bij snel typen in
   een toelichting).
5. **Bijlagen**: **+ Bijlage toevoegen** twee keer: twee rijen met een leeg titelveld en als letter
   "–" (een bijlage zonder titel telt niet mee, net als in de afdruk). Typ "Constructieoverzicht"
   en "Sonderingen": de letters worden B en C; ↓ bij B: de titels wisselen (letters blijven B, C);
   maak de titel van B leeg: die rij krijgt "–" en de andere wordt B; zet de titel terug. ✕ bij C
   verwijdert die rij; Ctrl+Z (na klik op een lege plek) zet hem terug.
6. **Bureau** met een leeg bureauprofiel: de melding "Er is nog geen bureauprofiel. Vul het in bij
   Instellingen → Bureau en werk dit rapport hier bij." en een grijze knop **Bijwerken uit
   bureauprofiel**.
7. Open Instellingen → Bureau en vul in: naam "Voorbeeldbureau", adres "Voorbeeldstraat 1",
   postcode "1234 AB", plaats "Voorbeeldstad", constructeur "Ir. A. Voorbeeld" met telefoon
   "010-0000000"; Opslaan. De sectie toont nu "Dit rapport heeft nog geen vastgelegde
   bureaugegevens; de afdruk gebruikt zolang het bureauprofiel uit de instellingen." en de knop is
   actief.
8. Klik **Bijwerken uit bureauprofiel** (geen vraag, want er was nog niets vastgelegd): de melding
   wordt "Gelijk aan het bureauprofiel in de instellingen." (rustig, zonder kleur), eronder Naam
   "Voorbeeldbureau", Adres "Voorbeeldstraat 1, 1234 AB Voorbeeldstad", Telefoon "—", E-mail "—",
   Constructeurs "Ir. A. Voorbeeld · 010-0000000", Huisstijl met vier kleurstalen en de naam van
   het lettertype in dat lettertype, rechts "geen logo". De knop is weer grijs.
9. Ga naar **Document**: de keuzelijsten Verantwoordelijk en Uitvoerend constructeur bieden
   "Ir. A. Voorbeeld"; kies die bij Verantwoordelijk. Hover in Hoofdstukken 1–3 op `{adviseur}`:
   "Nu: Voorbeeldbureau".
10. Wijzig in Instellingen → Bureau het telefoonnummer van het bureau en sla op: de melding wordt
    "Het bureauprofiel in de instellingen wijkt af van wat in dit rapport is vastgelegd. …" en de
    knop is actief. Klik hem → `De bureaugegevens van dit rapport bijwerken uit het huidige
    bureauprofiel?` → OK: weer "Gelijk…". Klik op een lege plek, Ctrl+Z: de vorige vastgelegde
    gegevens (en de melding "wijkt af") komen terug.
11. Met een logo en een voetafbeelding in het profiel (na bijwerken): het logo staat rechts naast de
    gegevens, de voetafbeelding over de volle breedte eronder.
12. Loop de hele sprongbalk af: elke knop brengt zijn sectie direct onder de balk in beeld. Geen
    fouten of waarschuwingen in de console.

- [ ] **Step 8: Commit**

```powershell
git add packages/desktop/src/components/calc/bladResultaat.ts packages/desktop/src/components/rapport/paneel/BerekeningenSectie.tsx packages/desktop/src/components/rapport/paneel/BijlagenSectie.tsx packages/desktop/src/components/rapport/paneel/BureauSectie.tsx packages/desktop/src/components/rapport/RapportPanel.tsx
git commit -m @'
feat(rapport): berekeningen, bijlagen en bureau in het rapportpaneel

Berekeningen toont per rekenblad de samenvatting uit de uitwerking
(maatgevende UC en oordeel; samenvatting staat in bladResultaat.ts en
geeft dezelfde tekst als de afdruk), een eigen toelichting en de keuze om
de uitwerking in het hoofdstuk op te nemen in plaats van in bijlage A.
Bijlagen beheert de titels van eigen bijlagen B, C, …, met dezelfde
letters als in de afdruk. Bureau toont de in het rapport vastgelegde
bureaugegevens, meldt wanneer het bureauprofiel afwijkt en werkt het
op verzoek bij, als één stap in ongedaan maken.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
```

---

### Task 20: Lintknoppen voor rapport, voorbeeld en blad

**Files:**
- Modify: `packages/desktop/src/components/ribbon/CalcTab.tsx`:
  - L16: import
  - L34: selector
  - L38–72: handlers
  - L121–126: knop "PDF project"

**Interfaces:**
- Consumes:
  - `RAPPORT_ID` en `selecteer` uit `store/projectStore.ts`
  - uit Task 11: `afdrukken(selectie?, soort?)` en `toonVoorbeeld(selectie?, soort?)`
- Produces:
  - "PDF project" heet voortaan "Rapport (PDF)" en roept `afdrukken(null, "rapport")` aan. De i18n-sleutel blijft `calc.pdfSave`; de tekst verandert in Task 21. Er komt geen melding meer bij een project zonder bladen.
  - "Voorbeeld" roept `selecteer(RAPPORT_ID)` aan en daarna `toonVoorbeeld(null, "rapport")`.
  - "PDF blad" roept `afdrukken([activeId], "bladen")` aan. De knop is uitgeschakeld zolang er geen blad openstaat (bestaand gedrag).
  - de handler `handlePrint` heet voortaan `handleRapport`

- [ ] **Step 1: Import en selector**

In `packages/desktop/src/components/ribbon/CalcTab.tsx`:

Oud (L16):
```ts
import { useProjectStore } from "../../store/projectStore";
```
Nieuw:
```ts
import { useProjectStore, RAPPORT_ID } from "../../store/projectStore";
```

Oud (L34–35):
```ts
  const activeId = useProjectStore((s) => s.activeId);
  const { nieuw, openen, opslaan } = useBestandActies();
```
Nieuw:
```ts
  const activeId = useProjectStore((s) => s.activeId);
  const selecteer = useProjectStore((s) => s.selecteer);
  const { nieuw, openen, opslaan } = useBestandActies();
```

- [ ] **Step 2: Handlers**

Oud (L38–72):
```ts
  /**
   * Afdrukken via de browser, niet via de rapportengine.
   *
   * `documentToReport` (de weg naar de Rust-engine) slaat svg- en image-knopen
   * over, dus daar komt geen enkele tekening uit. Bovendien is die engine een
   * pad-afhankelijkheid naar de `openaec-reports`-repo; zonder die repo is de
   * app niet eens te bouwen. Deze weg print exact wat de uitwerking toont —
   * formules, tekeningen en afbeeldingen — en in de printdialoog kies je
   * "Opslaan als PDF". Zie docs/backlog.md.
   */
  const handlePrint = useCallback(() => {
    if (useProjectStore.getState().exemplaren.length === 0) {
      alert("Dit project bevat nog geen rekenbladen.");
      return;
    }
    afdrukken(null);
  }, [afdrukken]);

  /** Alleen de berekening die openstaat, als losse uitdraai met een titelblok. */
  const bladOpen = exemplaren.some((e) => e.id === activeId);
  const handlePrintBlad = useCallback(() => {
    if (!useProjectStore.getState().exemplaren.some((e) => e.id === activeId)) {
      alert("Open eerst het rekenblad dat je als PDF wilt opslaan.");
      return;
    }
    afdrukken([activeId]);
  }, [afdrukken, activeId]);

  const handleVoorbeeld = useCallback(() => {
    if (useProjectStore.getState().exemplaren.length === 0) {
      alert("Dit project bevat nog geen rekenbladen.");
      return;
    }
    toonVoorbeeld(null);
  }, [toonVoorbeeld]);
```
Nieuw:
```ts
  /**
   * Het constructierapport afdrukken via de browser, niet via de rapportengine.
   *
   * `documentToReport` (de weg naar de Rust-engine) slaat svg- en image-knopen
   * over, dus daar komt geen enkele tekening uit. Bovendien is die engine een
   * pad-afhankelijkheid naar de `openaec-reports`-repo; zonder die repo is de
   * app niet eens te bouwen. Deze weg print exact wat de uitwerking toont —
   * formules, tekeningen en afbeeldingen — en in de printdialoog kies je
   * "Opslaan als PDF". Zie docs/backlog.md.
   *
   * Geen melding bij een project zonder rekenbladen: het rapport heeft dan nog
   * steeds zijn hoofdstukken, alleen bijlage A valt weg.
   */
  const handleRapport = useCallback(() => {
    afdrukken(null, "rapport");
  }, [afdrukken]);

  /** Alleen de berekening die openstaat, als losse uitdraai met een titelblok. */
  const bladOpen = exemplaren.some((e) => e.id === activeId);
  const handlePrintBlad = useCallback(() => {
    if (!useProjectStore.getState().exemplaren.some((e) => e.id === activeId)) {
      alert("Open eerst het rekenblad dat je als PDF wilt opslaan.");
      return;
    }
    // Uitdrukkelijk "bladen": na een rapportafdruk staat de soort nog op
    // "rapport", en dan kwam dit blad als bijlage in een heel rapport terecht.
    afdrukken([activeId], "bladen");
  }, [afdrukken, activeId]);

  /**
   * Het voorbeeld van het hele rapport. Dat hoort bij de knoop Rapport, dus
   * die gaat eerst open; het voorbeeld van één blad zit in de tabs van dat blad.
   */
  const handleVoorbeeld = useCallback(() => {
    selecteer(RAPPORT_ID);
    toonVoorbeeld(null, "rapport");
  }, [selecteer, toonVoorbeeld]);
```

- [ ] **Step 3: Knop Rapport (PDF)**

Oud (L121–126):
```tsx
          <RibbonButton
            icon={pdfIcon}
            label={t("calc.pdfSave", "PDF project")}
            size="large"
            onClick={handlePrint}
          />
```
Nieuw:
```tsx
          <RibbonButton
            icon={pdfIcon}
            label={t("calc.pdfSave", "Rapport (PDF)")}
            size="large"
            onClick={handleRapport}
          />
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop; echo "exit $?"`
Expected: geen meldingen, `exit 0`.

- [ ] **Step 5: Controle in de browser**

Het label is nog "PDF project"; de tekst uit `ribbon.json` wint van de standaardtekst in de
code tot Task 21. De knoppen zijn te vinden op hun `title`, die gelijk is aan het label.

1. Leeg project: herlaad http://localhost:3021 (F5). Het project is dan leeg. Draai in
   javascript_tool:
   ```js
   window.print = () => { window.__geprint = true; };
   document.querySelector('button.ribbon-btn[title="PDF project"]').click();
   await new Promise((r) => setTimeout(r, 600));
   window.__geprint === true
   ```
   Expected: `true`, zonder alert "Dit project bevat nog geen rekenbladen.". Het rapport wordt
   ook zonder bladen afgedrukt. `window.print` is hier vervangen, dus er opent geen dialoog.
2. Voeg twee proefbladen toe en klik het eerste aan. Klik in het lint (groep Exporteren) op
   **Voorbeeld**. In de boom licht **Rapport** op, de documentbalk toont `› Rapport`, en de
   tabbalk toont "Afdrukvoorbeeld" als actief met het voorbeeldpaneel eronder
   (`!!document.querySelector(".av-paneel")` is `true`).
3. Draai `document.querySelector('button.ribbon-btn[title="PDF blad"]').disabled`. Op de knoop
   Rapport: `true`. Klik een rekenblad aan en draai het opnieuw: `false`. Het rapportvoorbeeld
   is nu dicht (Task 15).
4. Op dat blad, in javascript_tool:
   ```js
   window.__geprint = false;
   window.print = () => { window.__geprint = true; };
   document.querySelector('button.ribbon-btn[title="PDF blad"]').click();
   await new Promise((r) => setTimeout(r, 600));
   window.__geprint === true
   ```
   Expected: `true`.
5. Herlaad de pagina (F5) om de echte `window.print` terug te zetten. De console toont geen
   nieuwe fouten.
6. Optioneel, in het Tauri-venster: **PDF blad** op een blad opent de printdialoog met alleen
   dat blad en zijn titelblok. Klik Annuleren.

- [ ] **Step 6: Commit**

```bash
git add packages/desktop/src/components/ribbon/CalcTab.tsx
git commit -m "$(cat <<'EOF'
feat(lint): rapport afdrukken, rapportvoorbeeld en PDF blad als bladen

De knop PDF project drukt het constructierapport af, ook zonder
rekenbladen. Voorbeeld opent de knoop Rapport met het voorbeeld van het
hele rapport. PDF blad vraagt uitdrukkelijk de bladen, zodat een losse
berekening na een rapportafdruk een losse berekening blijft.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 21: Linttekst en ontwikkelhaak (één herlaadmoment)

`ribbon.json` en `main.tsx` laden de app allebei volledig opnieuw. Voer stap 2 tot en met 4
daarom direct na elkaar uit. Daarna importeert `main.tsx` de stores. `main.tsx` is geen
HMR-grens, dus voortaan laden ook wijzigingen in `printStore.ts`, `projectBestand.ts` en
`bureauProfiel.ts` de app volledig opnieuw.

**Files:**
- Modify: `packages/desktop/src/i18n/locales/nl/ribbon.json` (L25)
- Modify: `packages/desktop/src/i18n/locales/en/ribbon.json` (L25)
- Modify: `packages/desktop/src/vite-env.d.ts` (L1–6, het hele bestand)
- Modify: `packages/desktop/src/main.tsx` (L1–12, het hele bestand)

**Interfaces:**
- Consumes:
  - `useProjectStore` uit `store/projectStore.ts`
  - `usePrintStore` uit `store/printStore.ts` (Task 11)
  - `useBureauStore` uit `store/bureauProfiel.ts` (Task 7)
  - `leesProjectBestand(raw: string, bestandsnaam: string)` uit `store/projectBestand.ts`
- Produces:
  - `window.__ocs = { useProjectStore, usePrintStore, useBureauStore, leesProjectBestand }`, alleen bij `import.meta.env.DEV`. `scripts/rapport-pdf.mjs` gebruikt dit.
  - globaal type `interface Window { __ocs?: { … } }` in `vite-env.d.ts`, met `typeof import("./store/…")` per veld
  - linttekst `calc.pdfSave`: nl "Rapport (PDF)", en "Report (PDF)"

- [ ] **Step 1: Controleer de voorwaarde**

Run: `grep -n "export const useBureauStore" packages/desktop/src/store/bureauProfiel.ts`
Expected: één regel. Geeft het niets, voer dan eerst Task 7 uit.

- [ ] **Step 2: Linttekst in beide talen**

In `packages/desktop/src/i18n/locales/nl/ribbon.json`, oud (L25):
```json
    "pdfSave": "PDF project",
```
Nieuw:
```json
    "pdfSave": "Rapport (PDF)",
```

In `packages/desktop/src/i18n/locales/en/ribbon.json`, oud (L25):
```json
    "pdfSave": "PDF project",
```
Nieuw:
```json
    "pdfSave": "Report (PDF)",
```

- [ ] **Step 3: Type van de ontwikkelhaak**

Vervang de hele inhoud van `packages/desktop/src/vite-env.d.ts` door:

```ts
/// <reference types="vite/client" />

declare module "*.geojson?raw" {
  const content: string;
  export default content;
}

/**
 * Ontwikkelhaak uit main.tsx, alleen bij `import.meta.env.DEV`: de stores en
 * de bestandslezer voor scripts/rapport-pdf.mjs. In een productiebouw bestaat
 * hij niet, vandaar optioneel.
 */
interface Window {
  __ocs?: {
    useProjectStore: typeof import("./store/projectStore").useProjectStore;
    usePrintStore: typeof import("./store/printStore").usePrintStore;
    useBureauStore: typeof import("./store/bureauProfiel").useBureauStore;
    leesProjectBestand: typeof import("./store/projectBestand").leesProjectBestand;
  };
}
```

Het bestand blijft een script: geen `import` of `export` op het hoogste niveau. Daardoor vult
`interface Window` het globale type aan zonder `declare global`.

- [ ] **Step 4: Ontwikkelhaak in main.tsx**

Vervang de hele inhoud van `packages/desktop/src/main.tsx` door:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n/config";
import App from "./App";
import { useProjectStore } from "./store/projectStore";
import { usePrintStore } from "./store/printStore";
import { useBureauStore } from "./store/bureauProfiel";
import { leesProjectBestand } from "./store/projectBestand";
import "./themes.css";
import "./App.css";

// Alleen tijdens ontwikkeling: de stores op `window`, voor scripts/rapport-pdf.mjs.
// Dat script stuurt een headless browser aan en moet dezelfde stores raken als
// de app. Zelf importeren via een URL gaat mis zodra Vite een module heeft
// vernieuwd: de app laadt dan `…/projectStore.ts?t=…`, een losse kopie met een
// eigen store. In een productiebouw valt dit blok weg.
if (import.meta.env.DEV) {
  window.__ocs = { useProjectStore, usePrintStore, useBureauStore, leesProjectBestand };
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

De nieuwe imports staan na `App`. Ze zitten al in de modulegraaf van `App`, dus de volgorde
waarin modules worden uitgevoerd verandert niet.

- [ ] **Step 5: Typecheck en JSON**

Run: `npx tsc --noEmit -p packages/desktop; echo "exit $?"`
Expected: geen meldingen, `exit 0`.

Run:
```bash
node -e "for (const t of ['nl','en']) console.log(t, JSON.parse(require('fs').readFileSync('packages/desktop/src/i18n/locales/'+t+'/ribbon.json','utf8')).calc.pdfSave)"
```
Expected:
```
nl Rapport (PDF)
en Report (PDF)
```

- [ ] **Step 6: Controle in de browser**

De app is volledig herladen en het project is leeg. Voeg één proefblad toe (Module →
dubbelklik **Spuwer (noodoverlaat)** → Enter). Draai de fragmenten één voor één in
javascript_tool.

1. Het lint (tab Start, groep Exporteren) toont **Rapport (PDF)**.
   `!!document.querySelector('button.ribbon-btn[title="Rapport (PDF)"]')` geeft `true`.
2. Controleer dat de haak er is:
   ```js
   Object.keys(window.__ocs ?? {})
   ```
   Expected: `["useProjectStore", "usePrintStore", "useBureauStore", "leesProjectBestand"]`
3. Controleer dat de haak dezelfde store raakt als de app:
   ```js
   window.__ocs.useProjectStore.getState().selecteer("__rapport__");
   await new Promise((r) => setTimeout(r, 100));
   [document.querySelector(".project-browser-tree .tree-item-emphasis.selected")?.textContent,
    document.querySelector(".document-tab-blad")?.textContent]
   ```
   Expected: `["Rapport", "› Rapport"]`
4. Ctrl+P zonder open voorbeeld drukt het rapport af (`useAfdrukken`):
   ```js
   const ps4 = window.__ocs.usePrintStore;
   ps4.getState().sluitVoorbeeld();
   window.print = () => {};
   await new Promise((r) => setTimeout(r, 400));
   document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "p", ctrlKey: true, bubbles: true }));
   const s4 = ps4.getState();
   ({ bezig: s4.bezig, soort: s4.soort, selectie: s4.selectie })
   ```
   Expected: `{ bezig: true, soort: "rapport", selectie: null }`
5. Ctrl+P met het voorbeeld van één blad open drukt dat blad af:
   ```js
   const ps5 = window.__ocs.usePrintStore;
   const id5 = window.__ocs.useProjectStore.getState().exemplaren[0].id;
   window.__ocs.useProjectStore.getState().selecteer(id5);
   ps5.getState().toonVoorbeeld([id5], "bladen");
   await new Promise((r) => setTimeout(r, 400));
   document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "p", ctrlKey: true, bubbles: true }));
   const s5 = ps5.getState();
   ({ bezig: s5.bezig, soort: s5.soort, voorbeeld: s5.voorbeeld, zelfdeBlad: s5.selectie?.[0] === id5 })
   ```
   Expected: `{ bezig: true, soort: "bladen", voorbeeld: true, zelfdeBlad: true }`
6. Engels: open **Instellingen** (tandwiel), zet bij Algemeen de taal op English en klik
   Opslaan. Het lint toont **Report (PDF)**. Zet de taal terug op Nederlands.
7. Herlaad de pagina (F5) om de echte `window.print` terug te zetten. De console toont geen
   nieuwe fouten.

- [ ] **Step 7: De haak valt weg in een productiebouw**

Run: `(cd packages/desktop && npx vite build)`
Expected: eindigt met `✓ built in …`. Een waarschuwing over chunks groter dan 500 kB is
bekend en onschuldig. De uitvoer staat in `packages/desktop/dist/`, en die map staat in
`.gitignore`.

Run: `grep -l "__ocs" packages/desktop/dist/assets/*.js; echo "grep-exit: $?"`
Expected: geen bestandsnamen, alleen `grep-exit: 1`.

- [ ] **Step 8: Commit**

```bash
git add packages/desktop/src/i18n/locales/nl/ribbon.json packages/desktop/src/i18n/locales/en/ribbon.json packages/desktop/src/vite-env.d.ts packages/desktop/src/main.tsx
git commit -m "$(cat <<'EOF'
feat(rapport): linttekst Rapport (PDF) en ontwikkelhaak voor de PDF-controle

De knop heet Rapport (PDF), in het Engels Report (PDF). In dev zet
main.tsx de project-, print- en bureaustore en leesProjectBestand op
window.__ocs, zodat scripts/rapport-pdf.mjs dezelfde stores aanstuurt
als de app, ook nadat Vite een module heeft vernieuwd. Een productiebouw
bevat de haak niet.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

## Deel: Afdruk

Dit deel maakt van de rapportgegevens een afdruk: voorblad, inhoud, de hoofdstukken 1 t/m 6 en
bijlage A, op het raster van de referentie-PDF. Dezelfde weergave (`<RapportAfdruk />`) draait
op twee plaatsen: in de meetopstelling van het afdrukvoorbeeld (dat hem zelf over vellen
verdeelt) en in `PrintDocument` voor de echte afdruk (waar Chromium verdeelt).

**Vereist uit eerdere taken:** `packages/desktop/src/rapport/{model,opzet,invullen,revisies,normwaarden,opbouw}.ts`
volgens het contract; `rapport` in de projectstore; `store/bureauProfiel.ts` met `useBureauStore`;
`printStore.soort` (`"bladen" | "rapport"`) met `afdrukken(selectie?, soort?)` en
`toonVoorbeeld(selectie?, soort?)`; de knoop **Rapport** met de tabs Rapport/Afdrukvoorbeeld in
`App.tsx`; de lintknop **Rapport (PDF)**; de tab **Bureau** in de instellingen; het rapportpaneel.

### Keuzes die niet in het contract staan (namen zoals ze hieronder gebruikt worden)

1. **Twee gedeelde bestanden in `components/calc/`**, zodat `PrintDocument` en het rapport elkaar
   niet over en weer importeren: `bladDoorrekenen.ts` (`zorgVoorKernstijlen()`,
   `rekenBladDoor(ex, scope): DoorgerekendBlad`) en `PrintBlad.tsx` (`Oordeel`, `PrintBlad`;
   `nummer` wordt `number | string` voor "A.1").
2. **`scripts/check-paginering.mjs`** toetst het rekenwerk van `paginering.ts` (loopt mee in check-alles).
3. **`paginering.ts`**: `interface Maten`, `MATEN`, `verdeelPerSectie()`, een
   afrondingsruimte `AFRONDING = 1` px, `.rpa-vlak` als tweede wikkel, afdalen in `.rpa-wortel`,
   `.rpa-voet` overslaan, en klasse **`rpa-houd`** = "houd bij volgende" voor kopregels die geen
   `h1`–`h6` zijn.
4. **`@page rapport` onderaan 19,8 mm**, zoals het contract: CSS-marge, de offset van `.rpa-voet`
   en `MATEN.rapport` gebruiken dezelfde 19,8 mm (bladspiegel 270,6 mm = 41 regels van 6,6 mm),
   zodat voorbeeld en afdruk niet verschillen. De voet is 19,8 mm hoog en staat op de onderrand.
5. **Extra bestanden in `components/rapport/afdruk/`**: `raster.tsx` (bouwstenen `Vlak`, `Rij`,
   `Cel`, `Leeg`, `Index`, `Eenheid`, `Tekst`), `Uitgangspunten.tsx` (H4), `Belastingen.tsx` (H5),
   `Knopen.tsx` (`hoofdstukStukken()`, koppen, tekst, rol, berekeningen).
6. **`useRapportWeergave.ts`** exporteert ook `useRapportBureau()`, `RapportBlad`, `RapportWeergave`.
   De samenvatting van een blad komt uit `samenvatting(r)` in `components/calc/bladResultaat.ts`
   (Task 19), dezelfde functie als in het rapportpaneel.
7. **Bijlage A** krijgt een eigen titelvel "Bijlage A <titel>" vóór de bladen.
8. **WANDEN** begint alleen op een nieuw vel als er ook opbouwen onder VLOER, DAKEN staan (anders
   bleef de kop 5.5 alleen achter).
9. **Voorblad**: per latere revisie een regel "Datum wijz. <code>" met de datum; het blok "In
   opdracht van" is minstens vier regels, zodat de documentgegevens op hun plek blijven; een
   logo uit het profiel staat rechtsboven naast de titel.
10. **4.1**: normverwijzing "tabel NB.1–2.1" op de regel "Ontwerplevensduur (t)"; K_FI via
    `kFiVoor(cc)` met "tabel B3"; de levensduurklasse volgt NB-tabel NB.1–2.1 (50 jaar → 3), een
    bewuste afwijking van de referentie. **4.8**: de kopcel boven de eerste eiskolom blijft leeg,
    zoals in de referentie.
11. **5.4**: "Dak plat Q_k" = `categorie.Qk`; "Dak schuin" = `dakQk(α)`. **5.2**: een omschrijving
    van een coëfficiënt staat in kolom 9.
12. **Berekeningen**: per blad de automatische samenvatting én, als die er is, de eigen toelichting;
    ook bij een blad met `inHoofdstuk`. Zonder bladen de regel "Dit project bevat nog geen
    rekenbladen.".
13. **`useUitdraai()`** geeft in de stand `rapport` geen bladen (het rapport rekent zelf door).
14. Materialentabel: de tabel bevestigingsmiddelen begint naast de derde materiaalregel
    (`BEVESTIGING_VANAF = 2`), zoals in de referentie.

### Hoe de afdruk in elkaar zit

```
div.rpa-wortel            huisstijl als CSS-variabelen, page: rapport
  div.rpa-voet            alleen in de echte afdruk: position: fixed in de ondermarge
  section.rpa-sectie.rpa-voorblad
  section.rpa-sectie.rpa-inhoud
  section.rpa-sectie …    hoofdstukken; een knoop met nieuwePagina begint een nieuwe sectie
  section.rpa-sectie.rpa-bijlagekop
  section.print-blad …    bijlage A: PrintBlad per blad
```

- Elke regel (kop, tekstregel, tabelrij, lege regel) is een los blok. Groeperen gebeurt met
  `div.rpa-vlak`; het voorbeeld vlakt die wikkels uit (zoals `.ifc-calc`) en zet hun klassen per
  vel terug. Een tabel loopt zo gewoon over twee vellen.
- Witruimte bóven een kop is padding (geen marge): het voorbeeld zet de bovenmarge van het eerste
  blok op een vel op nul, en de browser laat marges bij een paginaovergang vallen.
- Een kop heeft een lege regel boven zich, behalve direct onder de kop van zijn ouder
  (klasse `rpa-direct`). Hoofdstuk-, paragraaf- en blokkoppen hebben er één onder zich. Een
  hoofdstukkop die in een sectie doorloopt krijgt er één extra boven zich (`rpa-vervolg`).
- CSS hangt aan `.rpa-wortel` plus een eigen klasse op het element. Op een vel van het voorbeeld
  is `.av-pagina` de wortel (klasse `rpa-wortel`, huisstijl gekopieerd) en `.av-pagina-inhoud`
  draagt de sectieklassen.

---

### Task 22: Doorrekenen en rekenblad los van PrintDocument

Een zuivere verhuizing, zonder zichtbaar verschil: het doorrekenen van een blad en de component
`PrintBlad` gaan naar eigen bestanden, zodat het rapport (Task 30) ze kan gebruiken zonder
`PrintDocument` te importeren, dat op zijn beurt het rapport importeert (Task 32).

**Files:**
- Create: `packages/desktop/src/components/calc/bladDoorrekenen.ts`
- Create: `packages/desktop/src/components/calc/PrintBlad.tsx`
- Modify: `packages/desktop/src/components/calc/PrintDocument.tsx` (regels 1–65 en 97–116)

**Interfaces:**
- Consumes: `parse`, `evaluate`, `render`, `defaultStyles` uit `@ifc-calc/core`;
  `leesResultaat(nodes, naam): Resultaat`, `ucTekst(uc: number): string`, `type Resultaat` uit
  `./bladResultaat`; `calcpadIncludes`, `calcpadImageUrls` uit `../../templates/calcpad-includes`;
  `designerVoor(source: string): ReactElement | null`; `ExemplaarContext`.
- Produces:
  - `export function zorgVoorKernstijlen(): void`
  - `export interface DoorgerekendBlad { html: string; resultaat: Resultaat }`
  - `export function rekenBladDoor(ex: Exemplaar, scope: Record<string, unknown>): DoorgerekendBlad`
  - `export function Oordeel({ r }: { r: Resultaat }): JSX.Element`
  - `export function PrintBlad(props: { ex: Exemplaar; html: string; nummer: number | string; resultaat: Resultaat; projectregel?: ReactNode }): JSX.Element`

- [ ] **Step 1: Maak `bladDoorrekenen.ts`**

```ts
import { parse, evaluate, render, defaultStyles } from "@ifc-calc/core";
import type { Exemplaar } from "../../store/projectStore";
import { calcpadIncludes, calcpadImageUrls } from "../../templates/calcpad-includes";
import { leesResultaat, type Resultaat } from "./bladResultaat";

/*
 * Een rekenblad doorrekenen voor op papier.
 *
 * Staat los van PrintDocument omdat twee uitdraaien het nodig hebben: de losse
 * bladen (PrintDocument) en het constructierapport (components/rapport/afdruk).
 * Eén plek, zodat een blad in het rapport precies zo uitrekent als op zijn
 * eigen afdruk.
 */

let stijlenGeplaatst = false;

/** De opmaak van de rekenbladen staat in de core; die moet ook bij het printen mee. */
export function zorgVoorKernstijlen() {
  if (stijlenGeplaatst || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = defaultStyles;
  el.dataset.ifcCalc = "core-styles";
  document.head.appendChild(el);
  stijlenGeplaatst = true;
}

/** Een doorgerekend blad: de uitwerking als HTML en de uitkomst voor kop en samenvatting. */
export interface DoorgerekendBlad {
  html: string;
  resultaat: Resultaat;
}

/**
 * Rekent één blad door met de projectgegevens als scope.
 *
 * Een blad dat niet doorrekent houdt de rest van de uitdraai niet tegen: het
 * krijgt een rode regel met de fout, en de andere bladen komen gewoon op papier.
 */
export function rekenBladDoor(ex: Exemplaar, scope: Record<string, unknown>): DoorgerekendBlad {
  let html: string;
  let resultaat: Resultaat = { titel: ex.naam, norm: "", uc: null, voldoet: null };
  try {
    const opties = { includes: calcpadIncludes, imageUrls: calcpadImageUrls };
    const nodes = evaluate(parse(ex.source, opties), ex.waarden, scope);
    html = render(nodes);
    resultaat = leesResultaat(nodes, ex.naam);
  } catch (err) {
    html = `<p class="calc-text" style="color:#b91c1c">Dit blad kon niet worden doorgerekend: ${
      (err as Error).message
    }</p>`;
  }
  return { html, resultaat };
}
```

- [ ] **Step 2: Maak `PrintBlad.tsx`**

```tsx
import type { ReactNode } from "react";
import type { Exemplaar } from "../../store/projectStore";
import { ExemplaarContext } from "../../store/actiefBlad";
import { designerVoor } from "./designerKeuze";
import { ucTekst, type Resultaat } from "./bladResultaat";
import "./PrintDocument.css";

/*
 * Eén rekenblad op papier. Staat los van PrintDocument omdat ook het
 * constructierapport het gebruikt (bijlage A); zo importeren het rapport en
 * PrintDocument elkaar niet over en weer.
 */

/** Het oordeel als klein label: groen, rood of neutraal. */
export function Oordeel({ r }: { r: Resultaat }) {
  if (r.voldoet === null) return <span className="print-oordeel neutraal">—</span>;
  return (
    <span className={`print-oordeel ${r.voldoet ? "goed" : "fout"}`}>
      {r.voldoet ? "voldoet" : "voldoet niet"}
    </span>
  );
}

/**
 * Eén rekenblad in de uitdraai: de kop, het parametrische beeld, dan de
 * uitwerking. `nummer` is het volgnummer bij de losse bladen en het
 * bijlagenummer ("A.2") in het rapport.
 */
export function PrintBlad({ ex, html, nummer, resultaat, projectregel }: {
  ex: Exemplaar; html: string; nummer: number | string; resultaat: Resultaat; projectregel?: ReactNode;
}) {
  // Het beeld tekent zichzelf uit de waarden van dít exemplaar, niet uit het
  // blad dat toevallig openstaat. `alleenLezen` houdt tegen dat het afdrukken
  // standaardwaarden aanvult of iets anders aan het project verandert.
  const beeld = designerVoor(ex.source);
  return (
    <section className="print-blad">
      <header className="print-blad-kop">
        <span className="print-blad-nr">{nummer}</span>
        <span className="print-blad-titel">
          <span className="print-blad-naam">{ex.naam}</span>
          {resultaat.norm && <span className="print-blad-norm">{resultaat.norm}</span>}
        </span>
        <span className="print-blad-uitkomst">
          {resultaat.uc !== null && <span className="print-blad-uc">UC {ucTekst(resultaat.uc)}</span>}
          <Oordeel r={resultaat} />
        </span>
      </header>
      {projectregel}
      {beeld && (
        <div className="print-beeld">
          <ExemplaarContext.Provider value={{ exemplaar: ex, alleenLezen: true }}>
            {beeld}
          </ExemplaarContext.Provider>
        </div>
      )}
      <div className="ifc-calc" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}
```

- [ ] **Step 3: `PrintDocument.tsx` — imports en verhuisde code (regels 1–65)**

Oud:

```tsx
import { useMemo, type ReactNode } from "react";
import { parse, evaluate, render, defaultStyles } from "@ifc-calc/core";
import { useProjectStore, type Exemplaar } from "../../store/projectStore";
import { projectScope } from "../../store/projectGegevens";
import { ExemplaarContext } from "../../store/actiefBlad";
import { usePrintStore } from "../../store/printStore";
import { designerVoor } from "./designerKeuze";
import { calcpadIncludes, calcpadImageUrls } from "../../templates/calcpad-includes";
import { leesResultaat, ucTekst, type Resultaat } from "./bladResultaat";
import "./PrintDocument.css";

let stijlenGeplaatst = false;
/** De opmaak van de rekenbladen staat in de core; die moet ook bij het printen mee. */
function zorgVoorKernstijlen() {
  if (stijlenGeplaatst || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = defaultStyles;
  el.dataset.ifcCalc = "core-styles";
  document.head.appendChild(el);
  stijlenGeplaatst = true;
}

/** Het oordeel als klein label: groen, rood of neutraal. */
export function Oordeel({ r }: { r: Resultaat }) {
  if (r.voldoet === null) return <span className="print-oordeel neutraal">—</span>;
  return (
    <span className={`print-oordeel ${r.voldoet ? "goed" : "fout"}`}>
      {r.voldoet ? "voldoet" : "voldoet niet"}
    </span>
  );
}

/** Eén rekenblad in de uitdraai: de kop, het parametrische beeld, dan de uitwerking. */
export function PrintBlad({ ex, html, nummer, resultaat, projectregel }: {
  ex: Exemplaar; html: string; nummer: number; resultaat: Resultaat; projectregel?: ReactNode;
}) {
  // Het beeld tekent zichzelf uit de waarden van dít exemplaar, niet uit het
  // blad dat toevallig openstaat. `alleenLezen` houdt tegen dat het afdrukken
  // standaardwaarden aanvult of iets anders aan het project verandert.
  const beeld = designerVoor(ex.source);
  return (
    <section className="print-blad">
      <header className="print-blad-kop">
        <span className="print-blad-nr">{nummer}</span>
        <span className="print-blad-titel">
          <span className="print-blad-naam">{ex.naam}</span>
          {resultaat.norm && <span className="print-blad-norm">{resultaat.norm}</span>}
        </span>
        <span className="print-blad-uitkomst">
          {resultaat.uc !== null && <span className="print-blad-uc">UC {ucTekst(resultaat.uc)}</span>}
          <Oordeel r={resultaat} />
        </span>
      </header>
      {projectregel}
      {beeld && (
        <div className="print-beeld">
          <ExemplaarContext.Provider value={{ exemplaar: ex, alleenLezen: true }}>
            {beeld}
          </ExemplaarContext.Provider>
        </div>
      )}
      <div className="ifc-calc" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}
```

Nieuw:

```tsx
import { useMemo } from "react";
import { useProjectStore, type Exemplaar } from "../../store/projectStore";
import { projectScope } from "../../store/projectGegevens";
import { usePrintStore } from "../../store/printStore";
import { ucTekst, type Resultaat } from "./bladResultaat";
import { rekenBladDoor, zorgVoorKernstijlen } from "./bladDoorrekenen";
import { Oordeel, PrintBlad } from "./PrintBlad";
import "./PrintDocument.css";
```

- [ ] **Step 4: `PrintDocument.tsx` — `useUitdraai` rekent via `rekenBladDoor` (oorspronkelijk regels 97–116)**

Oud:

```tsx
  const bladen = useMemo(() => {
    const scope = projectScope(gegevens);
    // Een selectie met alleen verdwenen bladen valt terug op het hele project.
    const gekozen = selectie ? exemplaren.filter((e) => selectie.includes(e.id)) : exemplaren;
    return (gekozen.length ? gekozen : exemplaren).map((ex) => {
      let html: string;
      let resultaat: Resultaat = { titel: ex.naam, norm: "", uc: null, voldoet: null };
      try {
        const opties = { includes: calcpadIncludes, imageUrls: calcpadImageUrls };
        const nodes = evaluate(parse(ex.source, opties), ex.waarden, scope);
        html = render(nodes);
        resultaat = leesResultaat(nodes, ex.naam);
      } catch (err) {
        html = `<p class="calc-text" style="color:#b91c1c">Dit blad kon niet worden doorgerekend: ${
          (err as Error).message
        }</p>`;
      }
      return { ex, html, resultaat };
    });
  }, [exemplaren, gegevens, selectie]);
```

Nieuw:

```tsx
  const bladen = useMemo(() => {
    const scope = projectScope(gegevens);
    // Een selectie met alleen verdwenen bladen valt terug op het hele project.
    const gekozen = selectie ? exemplaren.filter((e) => selectie.includes(e.id)) : exemplaren;
    return (gekozen.length ? gekozen : exemplaren).map((ex) => ({ ex, ...rekenBladDoor(ex, scope) }));
  }, [exemplaren, gegevens, selectie]);
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop`
Verwacht: geen uitvoer, exitcode 0.

- [ ] **Step 6: Controle in de app (bladen ongewijzigd)**

In het Browser-paneel op http://localhost:3021 (Vite laadt de wijziging via HMR):
1. Staan er nog geen bladen: lint **Start → Module**, voeg **Boutberekening** toe en daarna
   **Kruipfactor** (groep Beton).
2. Open het blad Boutberekening en kies de tab **Afdrukvoorbeeld** boven het blad.
   Zichtbaar: loopkop met projectnaam, de bladkop met het nummer **1** in het donkere vakje, de
   naam, rechts "UC …" en het oordeel, daaronder het parametrische beeld en de uitwerking;
   onderaan de loopvoet met "Pagina 1 van …".
3. Kies in **Bereik** "Hele project (2 bladen)": eerst het voorblad met de resultatentabel, dan
   blad 1 en blad 2 elk op een nieuw vel. Alles ziet er uit als vóór deze taak.

- [ ] **Step 7: Commit**

```bash
git add packages/desktop/src/components/calc/bladDoorrekenen.ts packages/desktop/src/components/calc/PrintBlad.tsx packages/desktop/src/components/calc/PrintDocument.tsx
git commit -m "refactor(afdruk): doorrekenen en rekenblad los van PrintDocument" -m "Het rapport gebruikt dezelfde doorrekening en dezelfde bladweergave voor bijlage A. Een eigen module voorkomt dat PrintDocument en het rapport elkaar over en weer importeren." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 23: Paginering met maten per soort en rapportvlakken

**Files:**
- Create: `scripts/check-paginering.mjs`
- Modify: `packages/desktop/src/components/calc/paginering.ts` (regels 30–36, 75–90, 103–104, 125, 132–160, 180)

**Interfaces:**
- Consumes: niets nieuws.
- Produces (in `paginering.ts`):
  - `export interface Maten { marge: { boven: number; rechts: number; onder: number; links: number }; inhoud: { breedte: number; hoogte: number; vulhoogte: number } }`
  - `export const MATEN: { bladen: Maten; rapport: Maten }` (`bladen` = `{ marge: MARGE, inhoud: INHOUD }`,
    `rapport` = marge 6,6 / 9,9 / 19,8 / 9,85 mm, inhoud 190,25 × 270,6 mm, vulhoogte 270,6 mm)
  - `export function verdeelPerSectie(blokken: Blok[], hoogteVoor: (sectie: string) => number): Blok[][]`
  - `meetBlokken` vlakt ook `.rpa-vlak` uit, daalt af in `.rpa-wortel`, slaat `.rpa-voet` over;
    `houdBijVolgende` is ook waar voor een element met klasse `rpa-houd`.
  - `verdeelInPaginas` en het doortrekken van koppen rekenen met 1 px afrondingsruimte.

- [ ] **Step 1: Schrijf het controlescript `scripts/check-paginering.mjs`**

```js
/**
 * Controlescript voor het verdelen van een uitdraai over A4-vellen
 * (packages/desktop/src/components/calc/paginering.ts).
 *
 * Alleen het rekenwerk: `verdeelInPaginas` en `verdeelPerSectie` krijgen
 * blokken met een hoogte en geven vellen terug. Het meten zelf (`meetBlokken`)
 * leest de DOM en valt buiten dit script.
 *
 * Draaien:  node scripts/check-paginering.mjs
 */
import {
  MATEN,
  SPELING,
  verdeelInPaginas,
  verdeelPerSectie,
} from "../packages/desktop/src/components/calc/paginering.ts";

let fouten = 0;
function toets(naam, ok, detail = "") {
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${naam}${ok || !detail ? "" : `   (kreeg ${detail})`}`);
}

const blok = (hoogte, sectie = "rpa-sectie", nieuwePagina = false, houdBijVolgende = false) =>
  ({ el: null, hoogte, nieuwePagina, houdBijVolgende, sectie, wikkels: [] });
/** "2+1": twee blokken op het eerste vel, één op het tweede. */
const vorm = (paginas) => paginas.map((p) => p.length).join("+");

// Maten: de bladen zoals ze waren, het rapport zoals gemeten aan de referentie.
const { bladen, rapport } = MATEN;
toets("bladen: bladspiegel 178 × 253 mm", bladen.inhoud.breedte === 178 && bladen.inhoud.hoogte === 253);
toets("bladen: rekenhoogte = bladspiegel min de speling", bladen.inhoud.vulhoogte === bladen.inhoud.hoogte - SPELING);
toets("rapport: breedte = A4 min de zijmarges",
  Math.abs(rapport.inhoud.breedte - (210 - rapport.marge.links - rapport.marge.rechts)) < 1e-9);
toets("rapport: hoogte = A4 min boven- en ondermarge",
  Math.abs(rapport.inhoud.hoogte - (297 - rapport.marge.boven - rapport.marge.onder)) < 1e-9);
toets("rapport: precies 41 regels van 6,6 mm, zonder speling",
  Math.abs(rapport.inhoud.hoogte - 41 * 6.6) < 1e-9 && rapport.inhoud.vulhoogte === rapport.inhoud.hoogte);

// Afronding: gemeten hoogtes tellen een fractie van een pixel te veel op.
const px = 3.7795; // px per mm bij 96 dpi
const regel = 6.6 * px;
const vol = Array.from({ length: 41 }, (_, i) => blok(regel + (i === 0 ? 0.4 : 0), "rpa-sectie", i === 0));
const eenVel = vorm(verdeelInPaginas(vol, rapport.inhoud.vulhoogte * px));
toets("41 regels met 0,4 px afronding passen op één vel", eenVel === "41", eenVel);
const tweeVel = vorm(verdeelInPaginas([...vol, blok(regel)], rapport.inhoud.vulhoogte * px));
toets("de 42e regel gaat naar het volgende vel", tweeVel === "41+1", tweeVel);

// Per sectie een eigen bladhoogte.
const gemengd = [
  blok(40, "rpa-sectie", true), blok(40), blok(40),
  blok(30, "print-blad", true), blok(30, "print-blad"),
];
const perSectie = vorm(verdeelPerSectie(gemengd, (s) => (s === "print-blad" ? 50 : 100)));
toets("rapportsectie op 100 px, rekenblad op 50 px", perSectie === "2+1+1+1", perSectie);

// Een kop onderaan een sectie blijft in die sectie: de volgende begint op een eigen vel.
const kopAchteraan = [blok(50, "rpa-sectie", true), blok(40, "rpa-sectie", false, true), blok(50, "rpa-sectie", true)];
const kopVorm = vorm(verdeelPerSectie(kopAchteraan, () => 100));
toets("een kop schuift niet door naar de volgende sectie", kopVorm === "2+1", kopVorm);

// Binnen een sectie schuift een kop die onderaan achterblijft wél door.
const kopBinnen = [blok(60, "rpa-sectie", true), blok(30, "rpa-sectie", false, true), blok(50)];
const binnenVorm = vorm(verdeelPerSectie(kopBinnen, () => 100));
toets("binnen een sectie gaat een kop mee naar het volgende vel", binnenVorm === "1+2", binnenVorm);

if (fouten > 0) {
  console.error(`\nPaginering: ${fouten} afwijking(en).`);
  process.exit(1);
}
console.log("\nPaginering: maten, afronding en verdeling per sectie kloppen.");
```

- [ ] **Step 2: Draai het script en zie het falen**

Run: `node scripts/check-paginering.mjs`
Verwacht: exitcode 1 met
`SyntaxError: The requested module '../packages/desktop/src/components/calc/paginering.ts' does not provide an export named 'MATEN'`.

- [ ] **Step 3: `paginering.ts` — maten per soort (na `INHOUD`, regels 30–36)**

Oud:

```ts
/** De bladspiegel: wat er aan inhoud op één pagina past. */
export const INHOUD = {
  breedte: A4.breedte - MARGE.links - MARGE.rechts, // 178 mm
  hoogte: A4.hoogte - MARGE.boven - MARGE.onder, // 253 mm
  /** De hoogte waarop de verdeling rekent: bladspiegel minus de speling. */
  vulhoogte: A4.hoogte - MARGE.boven - MARGE.onder - SPELING, // 249 mm
} as const;
```

Nieuw:

```ts
/** De bladspiegel: wat er aan inhoud op één pagina past. */
export const INHOUD = {
  breedte: A4.breedte - MARGE.links - MARGE.rechts, // 178 mm
  hoogte: A4.hoogte - MARGE.boven - MARGE.onder, // 253 mm
  /** De hoogte waarop de verdeling rekent: bladspiegel minus de speling. */
  vulhoogte: A4.hoogte - MARGE.boven - MARGE.onder - SPELING, // 249 mm
} as const;

/** Marges en bladspiegel van één soort uitdraai, in millimeter. */
export interface Maten {
  marge: { boven: number; rechts: number; onder: number; links: number };
  inhoud: { breedte: number; hoogte: number; vulhoogte: number };
}

/**
 * Maten per soort uitdraai, gelijk aan de `@page`-regels.
 *
 * - `bladen`: losse rekenbladen en het projectoverzicht (PrintDocument.css).
 * - `rapport`: het constructierapport (RapportAfdruk.css, `@page rapport`),
 *   gemeten aan de referentie-PDF. De bladspiegel is precies 41 regels van
 *   6,6 mm. De verdeling rekent daarom met de volle hoogte: de speling van de
 *   bladen zou er elke pagina een regel af halen, en dan valt het rapport
 *   anders over de vellen dan de referentie. Het rapport staat op een vast
 *   raster zonder samenklappende marges, dus die speling is daar niet nodig.
 *   Rekenbladen in bijlage A houden hem wel (zie AfdrukVoorbeeld).
 */
export const MATEN = {
  bladen: { marge: MARGE, inhoud: INHOUD },
  rapport: {
    marge: { boven: 6.6, rechts: 9.9, onder: 19.8, links: 9.85 },
    inhoud: { breedte: 190.25, hoogte: 270.6, vulhoogte: 270.6 },
  },
} as const satisfies Record<string, Maten>;
```

- [ ] **Step 4: `paginering.ts` — overslaan en uitvlakken (regels 75–90)**

Oud:

```ts
/** Elementen die geen inhoud zijn maar bediening of loopkop. */
const OVERSLAAN = new Set(["print-loopkop", "print-loopvoet"]);

/**
 * Haalt de `.ifc-calc`-wikkels weg en levert de regels die erin zitten.
 *
 * Recursief, want er zitten er twee in elkaar: de uitdraai zet er zelf een om
 * de uitwerking heen en de kern levert er ook al een mee. Eén laag afpellen
 * houdt dus alleen de binnenste wikkel over — één blok van een halve meter
 * hoog, dat op de eerste de beste pagina blijft steken.
 */
function vlakUit(el: HTMLElement, wikkels: string[] = []): { el: HTMLElement; wikkels: string[] }[] {
  if (!el.classList.contains("ifc-calc")) return [{ el, wikkels }];
  const dieper = [...wikkels, el.className];
  return (Array.from(el.children) as HTMLElement[]).flatMap((k) => vlakUit(k, dieper));
}
```

Nieuw:

```ts
/** Elementen die geen inhoud zijn maar bediening, loopkop of voet. */
const OVERSLAAN = ["print-loopkop", "print-loopvoet", "rpa-voet"];

/**
 * Wikkels die alleen groeperen: `.ifc-calc` om de uitwerking van een blad en
 * `.rpa-vlak` om de regels van het rapport. Wat erin zit, wordt los verdeeld.
 */
const WIKKELS = ["ifc-calc", "rpa-vlak"];

/**
 * Haalt de wikkels weg en levert de regels die erin zitten.
 *
 * Recursief, want er zitten er meer in elkaar: de uitdraai zet een `.ifc-calc`
 * om de uitwerking heen en de kern levert er ook al een mee. Eén laag afpellen
 * houdt dus alleen de binnenste wikkel over — één blok van een halve meter
 * hoog, dat op de eerste de beste pagina blijft steken. In het rapport zit een
 * tabel in een paragraaf in een hoofdstuk; ook dat mag geen blok van een halve
 * pagina worden.
 */
function vlakUit(el: HTMLElement, wikkels: string[] = []): { el: HTMLElement; wikkels: string[] }[] {
  if (!WIKKELS.some((k) => el.classList.contains(k))) return [{ el, wikkels }];
  const dieper = [...wikkels, el.className];
  return (Array.from(el.children) as HTMLElement[]).flatMap((k) => vlakUit(k, dieper));
}
```

- [ ] **Step 5: `paginering.ts` — secties binnen de rapportwortel (regels 103–104)**

Oud:

```ts
  for (const sectie of Array.from(bron.children) as HTMLElement[]) {
    if (OVERSLAAN.has(sectie.className)) continue;
```

Nieuw:

```ts
  // Het rapport staat in één wortel die de huisstijl draagt; de secties zijn
  // de kinderen daarvan. De bladen staan rechtstreeks in de bron.
  const secties = (Array.from(bron.children) as HTMLElement[]).flatMap((el) =>
    el.classList.contains("rpa-wortel") ? (Array.from(el.children) as HTMLElement[]) : [el],
  );

  for (const sectie of secties) {
    if (OVERSLAAN.some((k) => sectie.classList.contains(k))) continue;
```

- [ ] **Step 6: `paginering.ts` — kopregels van tabellen houden bij de volgende regel (regel 125)**

Oud:

```ts
      houdBijVolgende: /^H[1-6]$/.test(r.el.tagName),
```

Nieuw:

```ts
      // Een kop, of een regel die zich zo gedraagt: de kopregel van een tabel
      // in het rapport is geen <h*>, maar hoort evenmin los onderaan een vel.
      houdBijVolgende: /^H[1-6]$/.test(r.el.tagName) || r.el.classList.contains("rpa-houd"),
```

- [ ] **Step 7: `paginering.ts` — afrondingsruimte en verdelen per sectie (regels 132–160 en 180)**

Oud:

```ts
/**
 * Verdeelt de blokken over pagina's van `paginaHoogte` px.
```

Nieuw:

```ts
/**
 * Afrondingsruimte in px.
 *
 * Hoogtes zijn afstanden tussen gemeten blokken, en de browser rekent in
 * 1/64 px. 41 regels van 6,6 mm tellen daardoor soms een fractie boven de
 * bladspiegel op, terwijl ze er precies in passen; zonder deze ruimte ging de
 * laatste regel van een vol vel steeds naar het volgende.
 */
const AFRONDING = 1;

/**
 * Verdeelt per sectie, elk met een eigen bladhoogte.
 *
 * Een sectie begint toch al op een vers vel, dus apart verdelen verandert
 * niets aan de vellen zelf — maar zo kan een rekenblad met speling rekenen en
 * het rapport ernaast met de volle hoogte, en schuift een kop onderaan een
 * sectie niet door naar het eerste vel van de volgende.
 */
export function verdeelPerSectie(blokken: Blok[], hoogteVoor: (sectie: string) => number): Blok[][] {
  const paginas: Blok[][] = [];
  let groep: Blok[] = [];
  const sluit = () => {
    if (groep.length > 0) paginas.push(...verdeelInPaginas(groep, hoogteVoor(groep[0].sectie)));
    groep = [];
  };
  for (const blok of blokken) {
    if (blok.nieuwePagina) sluit();
    groep.push(blok);
  }
  sluit();
  return paginas;
}

/**
 * Verdeelt de blokken over pagina's van `paginaHoogte` px.
```

Oud:

```ts
    else if (gebruikt > 0 && gebruikt + blok.hoogte > paginaHoogte) sluit();
```

Nieuw:

```ts
    else if (gebruikt > 0 && gebruikt + blok.hoogte > paginaHoogte + AFRONDING) sluit();
```

Oud:

```ts
    if (bezet + erbij <= paginaHoogte) volgende.unshift(...verplaats);
```

Nieuw:

```ts
    if (bezet + erbij <= paginaHoogte + AFRONDING) volgende.unshift(...verplaats);
```

- [ ] **Step 8: Draai het script en zie het slagen**

Run: `node scripts/check-paginering.mjs`
Verwacht: tien regels `OK`, slotregel `Paginering: maten, afronding en verdeling per sectie kloppen.`, exitcode 0.

- [ ] **Step 9: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop`
Verwacht: geen uitvoer, exitcode 0.

- [ ] **Step 10: Commit**

```bash
git add scripts/check-paginering.mjs packages/desktop/src/components/calc/paginering.ts
git commit -m "feat(afdruk): paginering met maten per soort en uitvlakken van rapportvlakken" -m "MATEN per soort (bladen en rapport), verdelen per sectie met een eigen bladhoogte, 1 px afrondingsruimte, .rpa-vlak als wikkel en rpa-houd als kop die bij de volgende regel blijft. Controle in scripts/check-paginering.mjs." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 24: De gegevens van de rapportweergave verzamelen

**Files:**
- Create: `packages/desktop/src/components/rapport/afdruk/useRapportWeergave.ts`

**Interfaces:**
- Consumes:
  - `useProjectStore` met `rapport: Rapport`, `gegevens`, `projectNaam`, `exemplaren`;
    `useBureauStore` met `profiel: BureauProfiel` (`store/bureauProfiel.ts`).
  - `bouwOpzet(r, bladen): Rapportknoop[]`, `inhoudsopgave(knopen): Inhoudsregel[]`,
    `bijlagen(r, bladen): Bijlage[]` uit `rapport/opzet.ts`; `type Invulwaarden` uit `rapport/invullen.ts`.
  - `rekenBladDoor`, `zorgVoorKernstijlen` (Task 22); `type Resultaat`.
- Produces:
  - `export interface RapportBlad { ex: Exemplaar; html: string; resultaat: Resultaat }`
  - `export interface RapportWeergave { rapport: Rapport; gegevens: ProjectGegevens; projectNaam: string; bureau: BureauProfiel; bladen: RapportBlad[]; knopen: Rapportknoop[]; inhoud: Inhoudsregel[]; bijlagen: Bijlage[]; invul: Invulwaarden }`
  - `export function useRapportBureau(): BureauProfiel` — `rapport.bureau` als `rapport.bureau.naam` gevuld is, anders het live profiel.
  - `export function useRapportWeergave(): RapportWeergave`

- [ ] **Step 1: Maak `useRapportWeergave.ts`**

```ts
import { useMemo } from "react";
import { useProjectStore, type Exemplaar } from "../../../store/projectStore";
import { useBureauStore } from "../../../store/bureauProfiel";
import { projectScope, type ProjectGegevens } from "../../../store/projectGegevens";
import type { BureauProfiel, Rapport } from "../../../rapport/model";
import {
  bijlagen as bijlagenVan,
  bouwOpzet,
  inhoudsopgave,
  type Bijlage,
  type Inhoudsregel,
  type Rapportknoop,
} from "../../../rapport/opzet";
import type { Invulwaarden } from "../../../rapport/invullen";
import { rekenBladDoor, zorgVoorKernstijlen } from "../../calc/bladDoorrekenen";
import type { Resultaat } from "../../calc/bladResultaat";

/*
 * Alles wat de afdruk van het rapport nodig heeft, op één plek verzameld.
 *
 * Het afdrukvoorbeeld en de echte afdruk renderen allebei <RapportAfdruk />,
 * en die leest alleen via deze hook. Zo kunnen de twee niet uiteenlopen: wat
 * je in het voorbeeld ziet, is wat er op papier komt.
 */

/** Eén blad van het project, doorgerekend. */
export interface RapportBlad {
  ex: Exemplaar;
  html: string;
  resultaat: Resultaat;
}

export interface RapportWeergave {
  rapport: Rapport;
  gegevens: ProjectGegevens;
  projectNaam: string;
  /** Het bureau dat op het rapport staat (zie useRapportBureau). */
  bureau: BureauProfiel;
  /** Alle bladen van het project in de volgorde van de projectboom, los van een afdrukselectie. */
  bladen: RapportBlad[];
  /** De hoofdstukindeling van dit rapport: genummerd, zonder wat wegvalt. */
  knopen: Rapportknoop[];
  inhoud: Inhoudsregel[];
  bijlagen: Bijlage[];
  /** Waarden voor de invulvelden in de teksten. */
  invul: Invulwaarden;
}

/**
 * Het bureau van dit rapport.
 *
 * Een rapport draagt een vastgelegde kopie van het bureauprofiel, zodat een
 * opgeleverd rapport niet verandert als het profiel later wijzigt. Zolang die
 * kopie nog leeg is (een nieuw rapport), geldt het profiel uit de
 * instellingen — anders zou een vers rapport zonder bureaunaam en huisstijl
 * op papier komen.
 */
export function useRapportBureau(): BureauProfiel {
  const vastgelegd = useProjectStore((s) => s.rapport.bureau);
  const profiel = useBureauStore((s) => s.profiel);
  return vastgelegd.naam ? vastgelegd : profiel;
}

export function useRapportWeergave(): RapportWeergave {
  const rapport = useProjectStore((s) => s.rapport);
  const gegevens = useProjectStore((s) => s.gegevens);
  const projectNaam = useProjectStore((s) => s.projectNaam);
  const exemplaren = useProjectStore((s) => s.exemplaren);
  const bureau = useRapportBureau();

  zorgVoorKernstijlen();

  // Alle bladen: het rapport kent geen selectie. Een blad dat in het
  // hoofdstuk zelf staat, telt net zo goed mee als een blad in bijlage A.
  const bladen = useMemo(() => {
    const scope = projectScope(gegevens);
    return exemplaren.map((ex) => ({ ex, ...rekenBladDoor(ex, scope) }));
  }, [exemplaren, gegevens]);

  const opzet = useMemo(() => {
    const lijst = exemplaren.map((ex) => ({ id: ex.id, naam: ex.naam }));
    const knopen = bouwOpzet(rapport, lijst);
    return { knopen, inhoud: inhoudsopgave(knopen), bijlagen: bijlagenVan(rapport, lijst) };
  }, [rapport, exemplaren]);

  const invul = useMemo<Invulwaarden>(
    () => ({
      adviseur: bureau.naam,
      projectnummer: gegevens.project_nummer || "",
      projectnaam: gegevens.project_naam || projectNaam,
      opdrachtgever: gegevens.opdrachtgever || "",
      locatie: gegevens.locatie || "",
      verantwoordelijk: rapport.verantwoordelijk,
      uitvoerend: rapport.uitvoerend,
    }),
    [bureau.naam, gegevens, projectNaam, rapport.verantwoordelijk, rapport.uitvoerend],
  );

  return { rapport, gegevens, projectNaam, bureau, bladen, ...opzet, invul };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop`
Verwacht: geen uitvoer, exitcode 0. (De hook hangt nog nergens in; de browsercontrole volgt in Task 31.)

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/components/rapport/afdruk/useRapportWeergave.ts
git commit -m "feat(rapport): gegevens voor de afdruk van het rapport verzamelen" -m "useRapportWeergave rekent alle bladen door en levert opzet, inhoudsopgave, bijlagen en invulwaarden; useRapportBureau kiest tussen de vastgelegde kopie en het live profiel." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 25: Rasterbouwstenen voor de afdruk

**Files:**
- Create: `packages/desktop/src/components/rapport/afdruk/raster.tsx`

**Interfaces:**
- Consumes: `tekstRegels(tekst): Tekstregel[]`, `vulIn(tekst, w): string`, `type Invulwaarden` uit `rapport/invullen.ts`.
- Produces:
  - `export function Vlak(props: { klasse?: string; children?: ReactNode })` → `div.rpa-vlak`
  - `export function Rij(props: { klasse?: string; houd?: boolean; children?: ReactNode })` → `div.rpa-rij` (+ `rpa-houd`)
  - `export interface CelProps { k: number; n?: number; o?: boolean; b?: boolean; l?: boolean; r?: boolean; klasse?: string; children?: ReactNode }`
  - `export function Cel(props: CelProps)` → `span.rpa-cel` met `grid-column: k / span n`; `o/b/l/r` = lijn onder/boven/links/rechts (`rpa-o`, `rpa-b`, `rpa-l`, `rpa-r`)
  - `export function Leeg(props: { n?: number })` → `div.rpa-leeg`, `n` regels hoog
  - `export function Index(props: { t: string })` — "ψ0" → ψ met onderschrift 0, "_rep" → onderschrift
  - `export function Eenheid(props: { e: "kN/m2" | "kN/m1" | "kN/m3" | "kN" | "m" | "min" })` → "[kN/m²]" enz.
  - `export function Tekst(props: { tekst: string | undefined; invul: Invulwaarden })` → `p.rpa-tekst` per regel (`rpa-streep` bij "-"), `Leeg` voor een lege regel

- [ ] **Step 1: Maak `raster.tsx`**

```tsx
import { Fragment, type ReactNode } from "react";
import { tekstRegels, vulIn, type Invulwaarden } from "../../../rapport/invullen";

/*
 * Bouwstenen van het rapport, op het raster van de referentie-spreadsheet:
 * regels van 6,6 mm en kolommen van 18,98 mm (RapportAfdruk.css).
 *
 * Alles wat hier uit komt is een los blok per regel. Het afdrukvoorbeeld
 * verdeelt het rapport per blok over de vellen; een tabel als één geheel zou
 * niet over twee vellen kunnen lopen en onderaan worden afgeknipt. Groeperen
 * gebeurt daarom met `Vlak`: een wikkel die het voorbeeld weer uitvlakt.
 */

/** Groepeert regels. Het afdrukvoorbeeld pelt deze wikkel af en zet zijn klasse per vel terug. */
export function Vlak({ klasse, children }: { klasse?: string; children?: ReactNode }) {
  return <div className={klasse ? `rpa-vlak ${klasse}` : "rpa-vlak"}>{children}</div>;
}

/**
 * Eén regel van het raster, met cellen op vaste kolommen. `houd` houdt de
 * regel bij de volgende: de kopregel van een tabel blijft niet alleen
 * onderaan een vel staan.
 */
export function Rij({ klasse, houd, children }: { klasse?: string; houd?: boolean; children?: ReactNode }) {
  const klassen = ["rpa-rij"];
  if (houd) klassen.push("rpa-houd");
  if (klasse) klassen.push(klasse);
  return <div className={klassen.join(" ")}>{children}</div>;
}

export interface CelProps {
  /** Eerste kolom, vanaf 1: de linkerkant van het vlak waar de rij in staat. */
  k: number;
  /** Aantal kolommen. Tekst mag er, net als in een spreadsheet, overheen lopen. */
  n?: number;
  /** Lijn onder. */
  o?: boolean;
  /** Lijn boven. */
  b?: boolean;
  /** Lijn links. */
  l?: boolean;
  /** Lijn rechts. */
  r?: boolean;
  klasse?: string;
  children?: ReactNode;
}

/** Eén cel van een rij. */
export function Cel({ k, n = 1, o, b, l, r, klasse, children }: CelProps) {
  const klassen = ["rpa-cel"];
  if (o) klassen.push("rpa-o");
  if (b) klassen.push("rpa-b");
  if (l) klassen.push("rpa-l");
  if (r) klassen.push("rpa-r");
  if (klasse) klassen.push(klasse);
  return (
    <span className={klassen.join(" ")} style={{ gridColumn: `${k} / span ${n}` }}>
      {children}
    </span>
  );
}

/** Lege regels. */
export function Leeg({ n = 1 }: { n?: number }) {
  return <div className="rpa-leeg" style={n === 1 ? undefined : { height: `calc(${n} * var(--rpa-rij))` }} />;
}

/**
 * Indices zoals de norm ze schrijft: "1,5ψ0" → 1,5ψ₀ en "0,004l_rep" →
 * 0,004l met "rep" als onderschrift. Alleen voor velden die zo zijn bedoeld
 * (belastingfactoren, vervormingseisen); een naam van een opbouw blijft zoals
 * hij is getypt.
 */
export function Index({ t }: { t: string }) {
  const delen = t.split(/(ψ\d|_[^\s_]+)/);
  return (
    <>
      {delen.map((d, i) => {
        if (/^ψ\d$/.test(d)) return <Fragment key={i}>ψ<sub>{d.slice(1)}</sub></Fragment>;
        if (d.startsWith("_") && d.length > 1) return <sub key={i}>{d.slice(1)}</sub>;
        return <Fragment key={i}>{d}</Fragment>;
      })}
    </>
  );
}

type Eenheidnaam = "kN/m2" | "kN/m1" | "kN/m3" | "kN" | "m" | "min";

/** Een eenheid tussen haken, met de macht als echte exponent: [kN/m²]. */
export function Eenheid({ e }: { e: Eenheidnaam }) {
  const [basis, macht] = e.split(/(?=\d$)/);
  return (
    <>
      [{basis}
      {macht && <sup>{macht}</sup>}]
    </>
  );
}

/**
 * Een tekst uit het rapport, regel voor regel: een lege regel is een lege rij,
 * een regel die met "-" begint springt één kolom in. De invulvelden
 * ({projectnaam} en dergelijke) worden per regel ingevuld.
 */
export function Tekst({ tekst, invul }: { tekst: string | undefined; invul: Invulwaarden }) {
  return (
    <>
      {tekstRegels(tekst ?? "").map((r, i) =>
        r.leeg ? (
          <Leeg key={i} />
        ) : (
          <p key={i} className={r.inspringen ? "rpa-tekst rpa-streep" : "rpa-tekst"}>
            {vulIn(r.tekst, invul)}
          </p>
        ),
      )}
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop`
Verwacht: geen uitvoer, exitcode 0.

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/components/rapport/afdruk/raster.tsx
git commit -m "feat(rapport): rasterbouwstenen voor de afdruk" -m "Rij, Cel, Leeg, Vlak, Index, Eenheid en Tekst: elke regel een los blok op het raster van 6,6 mm bij 18,98 mm, zodat het voorbeeld het rapport per regel kan verdelen." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 26: Afdruk van hoofdstuk 4, Uitgangspunten

Kolomnummers zijn relatief: de inhoud van H4 staat in een vlak `rpa-in` dat één kolom inspringt,
dus `k={1}` ligt op x = 83,2 pt van het vel (kolom 2 van de referentie).

**Files:**
- Create: `packages/desktop/src/components/rapport/afdruk/Uitgangspunten.tsx`

**Interfaces:**
- Consumes: uit `rapport/normwaarden.ts`: `getal`, `fmt`, `klasse`, `levensduurklasse`, `beta`,
  `ontwerpSupervisie`, `inspectieniveau`, `belastingfactorTabel(cc): FactorRij[]`,
  `normVoorBouwjaar`; `kFiVoor(cc)` uit `store/projectGegevens.ts`; `RapportWeergave` (Task 24);
  bouwstenen (Task 25).
- Produces: `export function Bouwwerk({ w })`, `Brand({ w })`, `Materialen({ w })`,
  `Conservering({ w })`, `Factoren({ w })`, `Bestaand({ w })`, `Vervormingen({ w })` — elk
  `(props: { w: RapportWeergave }) => JSX.Element`.

- [ ] **Step 1: Maak `Uitgangspunten.tsx`**

```tsx
import type { ReactNode } from "react";
import {
  belastingfactorTabel,
  beta,
  fmt,
  getal,
  inspectieniveau,
  klasse,
  levensduurklasse,
  normVoorBouwjaar,
  ontwerpSupervisie,
} from "../../../rapport/normwaarden";
import { kFiVoor } from "../../../store/projectGegevens";
import type { RapportWeergave } from "./useRapportWeergave";
import { Cel, Eenheid, Index, Leeg, Rij, Tekst } from "./raster";

/*
 * Hoofdstuk 4, Uitgangspunten.
 *
 * De inhoud springt één kolom in (het vlak `rpa-in` eromheen), dus kolom 1
 * hier is kolom 2 van het vel. Kolommen en lijnen volgen de referentie-PDF.
 * Wat de gebruiker zelf invult staat in de invoerkleur; wat uit een tabel of
 * formule volgt in zwart.
 */

/** Label over drie kolommen, de waarde in de vierde, een lijn onder beide; rechts eventueel de norm. */
function Veld({ label, waarde, norm, invoer }: {
  label: ReactNode; waarde: ReactNode; norm?: string; invoer?: boolean;
}) {
  return (
    <Rij>
      <Cel k={1} n={3} o>{label}</Cel>
      <Cel k={4} o klasse={invoer ? "rpa-invoer" : undefined}>{waarde}</Cel>
      {norm && <Cel k={8} n={2} klasse="rpa-norm">{norm}</Cel>}
    </Rij>
  );
}

/**
 * 4.1 Constructieve uitgangspunten bouwwerk. CC, RC en de ontwerplevensduur
 * komen uit de projectgegevens; β, K_FI, supervisie en inspectie volgen daaruit.
 */
export function Bouwwerk({ w }: { w: RapportWeergave }) {
  const cc = klasse(w.gegevens.CC, 2);
  const rc = klasse(w.gegevens.RC, 2);
  const jaren = getal(w.gegevens.DesignLife);
  const levensduur = Number.isFinite(jaren) ? jaren : 50;
  return (
    <>
      <Veld label="Soort bouwwerk" waarde={w.rapport.uitgangspunten.soortBouwwerk} invoer />
      <Veld label="Constructiegevolgklasse" waarde={`CC${cc}`} invoer />
      <Veld label="Betrouwbaarheidsklasse" waarde={`RC${rc}`} />
      <Veld label="Ontwerplevensduurklasse" waarde={String(levensduurklasse(levensduur))} />
      <Veld label="Ontwerplevensduur (t)" waarde={fmt(levensduur, 0)} norm="tabel NB.1–2.1" />
      <Veld label="β" waarde={fmt(beta(rc), 1)} norm="tabel B2" />
      <Veld label={<>K<sub>FI</sub></>} waarde={fmt(kFiVoor(cc), 2)} norm="tabel B3" />
      <Veld label="Ontwerp- en berekeningssupervisie" waarde={ontwerpSupervisie(rc)} norm="tabel B4" />
      <Veld label="Inspectie tijdens uitvoering" waarde={inspectieniveau(rc)} norm="tabel B5" />
    </>
  );
}

/** 4.2 Bouwconstructies bij brand: drie eisen in minuten; "-" is geen eis. De verwijzing rechts naast de eerste. */
export function Brand({ w }: { w: RapportWeergave }) {
  const b = w.rapport.uitgangspunten.brand;
  const eisen: [string, string][] = [
    ["Brandwerendheidseis hoofddraagconstructie", b.hoofddraagconstructie],
    ["Brandwerendheidseis brandscheiding", b.brandscheiding],
    ["Brandwerendheidseis vluchtroute", b.vluchtroute],
  ];
  return (
    <>
      {eisen.map(([label, waarde], i) => (
        <Rij key={label}>
          <Cel k={1} n={4} o>{label}</Cel>
          <Cel k={5} o>{waarde.trim() || "-"}</Cel>
          <Cel k={6} o><Eenheid e="min" /></Cel>
          {i === 0 && b.verwijzing.trim() && <Cel k={8} n={2} klasse="rpa-norm">{b.verwijzing}</Cel>}
        </Rij>
      ))}
    </>
  );
}

/**
 * Waar de tabel bevestigingsmiddelen begint: naast de derde materiaalregel,
 * zoals in de referentie. Hij heeft geen eigen kopregel.
 */
const BEVESTIGING_VANAF = 2;

/** 4.3 Toegepaste materialen, met rechts ernaast de bevestigingsmiddelen en onder de tabel de noot. */
export function Materialen({ w }: { w: RapportWeergave }) {
  const u = w.rapport.uitgangspunten;
  const aantal = Math.max(u.materialen.length, BEVESTIGING_VANAF + u.bevestiging.length);
  return (
    <>
      <Rij houd>
        <Cel k={1} n={2} b o l klasse="rpa-kop-donker">Materiaaltype</Cel>
        <Cel k={3} b o l r klasse="rpa-kop-donker rpa-midden">Soort</Cel>
      </Rij>
      {Array.from({ length: aantal }, (_, i) => {
        const m = u.materialen[i];
        const f = u.bevestiging[i - BEVESTIGING_VANAF];
        const eerste = i === BEVESTIGING_VANAF;
        return (
          <Rij key={i}>
            {m && (
              <>
                <Cel k={1} n={2} o l>{m.type}</Cel>
                <Cel k={3} o l r klasse="rpa-midden">{m.soort}</Cel>
                <Cel k={4} n={2}>{m.opmerking}</Cel>
              </>
            )}
            {f && (
              <>
                <Cel k={6} n={2} b={eerste} o l klasse="rpa-midden">{f.type}</Cel>
                <Cel k={8} b={eerste} o l r klasse="rpa-midden">{f.kwaliteit}</Cel>
              </>
            )}
          </Rij>
        );
      })}
      {u.materialenNoot.trim() && (
        <Rij>
          <Cel k={1} n={6}>{u.materialenNoot}</Cel>
        </Rij>
      )}
    </>
  );
}

/** 4.4 Conservering staalconstructie: onderdeel en systeem, en de slotzin met een lijn eronder. */
export function Conservering({ w }: { w: RapportWeergave }) {
  const u = w.rapport.uitgangspunten;
  return (
    <>
      {u.conservering.map((c, i) => (
        <Rij key={i}>
          <Cel k={1} n={2} o>{c.onderdeel}</Cel>
          <Cel k={3} n={3} o>{c.systeem}</Cel>
        </Rij>
      ))}
      {u.conserveringSlot.trim() && (
        <>
          <Leeg />
          <Rij>
            <Cel k={1} n={7} o>{u.conserveringSlot}</Cel>
          </Rij>
        </>
      )}
    </>
  );
}

/**
 * 4.5 Belastingfactoren en belastingcombinaties bij de gevolgklasse van het
 * project. Opeenvolgende regels "niet van toepassing" delen één vak, zonder
 * lijn ertussen, zoals in de referentie.
 */
export function Factoren({ w }: { w: RapportWeergave }) {
  const rijen = belastingfactorTabel(klasse(w.gegevens.CC, 2));
  return (
    <>
      <Rij houd>
        <Cel k={1} b o l klasse="rpa-kop-donker">Groep</Cel>
        <Cel k={2} n={2} b o klasse="rpa-kop-donker">Naam</Cel>
        <Cel k={4} b o klasse="rpa-kop-donker rpa-midden">γ<sub>Gkj;inf</sub></Cel>
        <Cel k={5} b o klasse="rpa-kop-donker rpa-midden">γ<sub>Gkj;sup</sub></Cel>
        <Cel k={6} b o klasse="rpa-kop-donker rpa-midden">γ<sub>Q;1</sub></Cel>
        <Cel k={7} b o r klasse="rpa-kop-donker rpa-midden">γ<sub>Q;2</sub></Cel>
      </Rij>
      <Rij klasse="rpa-cursief" houd>
        <Cel k={1} n={3} o />
        <Cel k={4} o klasse="rpa-midden">gunstig</Cel>
        <Cel k={5} o klasse="rpa-midden">ongunstig</Cel>
        <Cel k={6} o klasse="rpa-midden">overheers.</Cel>
        <Cel k={7} o klasse="rpa-midden">overige</Cel>
      </Rij>
      {rijen.map((r, i) => {
        const volgendeNvt = rijen[i + 1]?.cellen === null;
        return (
          <Rij key={i}>
            <Cel k={1} o l>{r.groep}</Cel>
            <Cel k={2} n={2} o l klasse="rpa-tt">{r.naam}</Cel>
            {r.cellen ? (
              r.cellen.map((c, j) => (
                <Cel key={j} k={4 + j} o l r={j === 3} klasse="rpa-midden"><Index t={c} /></Cel>
              ))
            ) : (
              <Cel k={4} n={4} o={!volgendeNvt} l r>niet van toepassing</Cel>
            )}
            {r.opmerking && <Cel k={8} n={2}>{r.opmerking}</Cel>}
          </Rij>
        );
      })}
    </>
  );
}

/** 4.6 Bestaande situatie: bouwjaar en bron, de norm die bij dat bouwjaar hoort, en wat er beschikbaar is. */
export function Bestaand({ w }: { w: RapportWeergave }) {
  const b = w.rapport.uitgangspunten.bestaand;
  const jaar = getal(b.bouwjaar);
  const norm = Number.isFinite(jaar) ? normVoorBouwjaar(jaar) : "";
  return (
    <>
      <Rij>
        <Cel k={1} n={3} o>Bouwjaar bouwwerk</Cel>
        <Cel k={4} o klasse="rpa-invoer">{b.bouwjaar}</Cel>
        <Cel k={6} o>Bron</Cel>
        <Cel k={7} n={2} o klasse="rpa-invoer">{b.bron}</Cel>
      </Rij>
      <Rij>
        <Cel k={1} n={3} o>Norm</Cel>
        <Cel k={4} o>{norm}</Cel>
        <Cel k={7} n={2} o>afgeleid uit bouwjaar</Cel>
      </Rij>
      <Rij>
        <Cel k={1} n={3} o>Bestaande berekening beschikbaar</Cel>
        <Cel k={4} o klasse="rpa-invoer">{b.berekeningBeschikbaar}</Cel>
      </Rij>
      <Rij>
        <Cel k={1} n={3} o>Materiaalgegevens beschikbaar</Cel>
        <Cel k={4} o klasse="rpa-invoer">{b.materiaalgegevensBeschikbaar}</Cel>
      </Rij>
    </>
  );
}

/** 4.8 Vervormingen en horizontale verplaatsingen: de inleidende zin, dan de eisen per onderdeel. */
export function Vervormingen({ w }: { w: RapportWeergave }) {
  const inleiding = w.rapport.teksten.vervormingen ?? "";
  return (
    <>
      {inleiding.trim() && (
        <>
          <Tekst tekst={inleiding} invul={w.invul} />
          <Leeg />
        </>
      )}
      <Rij houd>
        <Cel k={1} n={3} b o l klasse="rpa-kop-licht">Onderdeel</Cel>
        {/* Leeg, zoals in de referentie. */}
        <Cel k={4} b o klasse="rpa-kop-licht" />
        <Cel k={5} b o klasse="rpa-kop-licht"><Index t="u_bij" /></Cel>
        <Cel k={6} b o r klasse="rpa-kop-licht"><Index t="u_hor" /></Cel>
      </Rij>
      {w.rapport.uitgangspunten.vervormingen.map((r, i) => (
        <Rij key={i}>
          <Cel k={1} n={3} o>{r.onderdeel}</Cel>
          <Cel k={4} o><Index t={r.ueind} /></Cel>
          <Cel k={5} o><Index t={r.ubij} /></Cel>
          <Cel k={6} o><Index t={r.uhor} /></Cel>
        </Rij>
      ))}
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop`
Verwacht: geen uitvoer, exitcode 0.

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/components/rapport/afdruk/Uitgangspunten.tsx
git commit -m "feat(rapport): afdruk van hoofdstuk 4 uitgangspunten" -m "Bouwwerk (CC, RC, levensduur, beta, K_FI, supervisie, inspectie), brand, materialen met bevestigingsmiddelen, conservering, belastingfactoren per gevolgklasse, bestaande situatie en vervormingseisen, op het raster van de referentie." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 27: Afdruk van hoofdstuk 5, Belastingen

Ook hier springt de inhoud één kolom in (`k={1}` = x 83,2 pt). Uitzondering: de groepskop van
5.5 (VLOER, DAKEN / WANDEN) staat buiten het ingesprongen vlak, want zijn bovenlijn loopt over de
volle breedte; zijn cel begint in kolom `1 + inspringen`.

**Files:**
- Create: `packages/desktop/src/components/rapport/afdruk/Belastingen.tsx`

**Interfaces:**
- Consumes: uit `rapport/normwaarden.ts`: `getal`, `fmt`, `klasse`, `sneeuwPlatDak()`,
  `windQp(wg, tc, z): WindUitkomst`, `windLabel(wg, tc)`, `PSI_WIND`, `categorie(id)`,
  `dakQk(α)`; uit `rapport/opbouw.ts` (Task 3): `vlakOpbouw(lagen)`, `gevelOpbouw(lagen)` —
  `regels[i]` hoort bij `lagen[i]`, `leesVulling` leest "90%", "90" en "0,9" als fractie 0,9 —
  en `vullingTekst(v)` (0,9 → "90%"); typen `Belastingklasse`, `Opbouw` uit `rapport/model.ts`.
- Produces: `export function Sneeuw({ w })`, `Wind({ w })`, `Veranderlijk({ w })`;
  `export function Groep(props: { titel: string; opbouwen: Opbouw[]; direct: boolean; inspringen: 0 | 1 })`.

- [ ] **Step 1: Maak `Belastingen.tsx`**

```tsx
import { Fragment, type ReactNode } from "react";
import type { Belastingklasse, Opbouw } from "../../../rapport/model";
import {
  categorie,
  dakQk,
  fmt,
  getal,
  klasse,
  PSI_WIND,
  sneeuwPlatDak,
  windLabel,
  windQp,
} from "../../../rapport/normwaarden";
import { gevelOpbouw, vlakOpbouw, vullingTekst } from "../../../rapport/opbouw";
import type { RapportWeergave } from "./useRapportWeergave";
import { Cel, Eenheid, Leeg, Rij, Tekst, Vlak } from "./raster";

/*
 * Hoofdstuk 5, Belastingen. Kolom 1 is kolom 2 van het vel (de inhoud springt
 * in); kolommen en lijnen volgen de referentie-PDF. Tekst in de tabellen
 * staat in de tabeltekstkleur, ingevulde waarden in de invoerkleur.
 */

/** Een berekend getal, of niets als er (nog) niets te berekenen valt. */
const getalTekst = (v: number, dec: number) => (Number.isFinite(v) ? fmt(v, dec) : "");

/** 5.1 Sneeuw op een plat dak, s = μ1·Ce·Ct·sk; de tekst eronder. */
export function Sneeuw({ w }: { w: RapportWeergave }) {
  const tekst = w.rapport.teksten.sneeuw ?? "";
  return (
    <>
      <Rij>
        <Cel k={1} o>plat dak</Cel>
        <Cel k={2} o>{fmt(sneeuwPlatDak(), 2)}</Cel>
        <Cel k={3} o><Eenheid e="kN/m2" /></Cel>
      </Rij>
      {tekst.trim() && (
        <>
          <Leeg />
          <Tekst tekst={tekst} invul={w.invul} />
        </>
      )}
    </>
  );
}

/**
 * 5.2 Windbelastingen. Links het gebied, de hoogte en q_p (dezelfde keten als
 * de gordingmodule); rechts per coëfficiënt P_rep = c · q_p en daaronder de
 * ψ-factoren voor wind. Zonder gebouwhoogte geen q_p en geen P_rep.
 */
export function Wind({ w }: { w: RapportWeergave }) {
  const { wind } = w.rapport.belastingen;
  const wg = klasse(w.gegevens.windgebied, 2);
  const tc = klasse(w.gegevens.terreincategorie, 2);
  const z = getal(wind.gebouwhoogte);
  const geldig = Number.isFinite(z) && z > 0;
  // z₀, z_min en v_b,0 hangen niet van de hoogte af; q_p wel.
  const u = windQp(wg, tc, geldig ? z : 0);
  const qp = geldig ? u.qp : NaN;

  const links: ReactNode[] = [
    <Cel k={1} n={2}>Windgebied &amp;</Cel>,
    <>
      <Cel k={1} n={2} o>Terreincategorie</Cel>
      <Cel k={3} n={2} o>{windLabel(wg, tc)}</Cel>
    </>,
    <>
      <Cel k={1} n={2} o>Gebouwhoogte</Cel>
      <Cel k={3} o>{wind.gebouwhoogte}</Cel>
      <Cel k={4} o><Eenheid e="m" /></Cel>
    </>,
    <>
      <Cel k={2} o>z<sub>0</sub></Cel>
      <Cel k={3} o>{fmt(u.z0, 3, true)}</Cel>
      <Cel k={4} o />
    </>,
    <>
      <Cel k={2} o>z<sub>min</sub></Cel>
      <Cel k={3} o>{fmt(u.zmin, 0)}</Cel>
      <Cel k={4} o />
    </>,
    <>
      <Cel k={2} o>c<sub>s</sub>*c<sub>d</sub></Cel>
      <Cel k={3} o>{wind.cscd}</Cel>
      <Cel k={4} o />
    </>,
    <>
      <Cel k={2} o>q<sub>p</sub></Cel>
      <Cel k={3} o>{getalTekst(qp, 2)}</Cel>
      <Cel k={4} o><Eenheid e="kN/m2" /></Cel>
    </>,
    <>
      <Cel k={2} o>v<sub>b,0</sub></Cel>
      <Cel k={3} o>{fmt(u.vb0, 1)}</Cel>
    </>,
  ];

  const rechts: ReactNode[] = [];
  rechts[0] = (
    <>
      <Cel k={6} o klasse="rpa-vet">c</Cel>
      <Cel k={7} o klasse="rpa-vet">P<sub>rep</sub></Cel>
    </>
  );
  wind.coefficienten.forEach((c, i) => {
    rechts[1 + i] = (
      <>
        <Cel k={6} o>{c.c}</Cel>
        <Cel k={7} o>{getalTekst(getal(c.c) * qp, 2)}</Cel>
        <Cel k={8} o><Eenheid e="kN/m2" /></Cel>
        {c.omschrijving && <Cel k={9}>{c.omschrijving}</Cel>}
      </>
    );
  });
  // Eén lege regel tussen de coëfficiënten en de ψ-factoren.
  const psiVanaf = wind.coefficienten.length + 2;
  PSI_WIND.forEach((psi, i) => {
    rechts[psiVanaf + i] = (
      <>
        <Cel k={6} o>ψ<sub>{i}</sub></Cel>
        <Cel k={7} o>{fmt(psi, 1)}</Cel>
      </>
    );
  });

  const aantal = Math.max(links.length, rechts.length);
  return (
    <>
      {Array.from({ length: aantal }, (_, i) => (
        <Rij key={i} klasse="rpa-tt">
          {links[i]}
          {rechts[i]}
        </Rij>
      ))}
    </>
  );
}

/**
 * Eén belastingklasse van 5.4: vloer of dak, met rechts de ψ-factoren. Boven
 * de eerste klasse staat de normverwijzing, in de lege regel onder de kop.
 */
function KlasseRijen({ bk, eerste }: { bk: Belastingklasse; eerste: boolean }) {
  const cat = categorie(bk.categorie);
  const rijen: ReactNode[] = [
    <>
      <Cel k={1} n={2} o>Belastingklasse</Cel>
      <Cel k={3} n={3} o klasse="rpa-invoer">{cat?.label ?? bk.categorie}</Cel>
    </>,
  ];
  if (!cat || cat.soort === "vloer") {
    rijen.push(
      <>
        <Cel k={1} n={2} o>Algemeen q<sub>k</sub></Cel>
        <Cel k={3} o klasse="rpa-invoer">{cat ? fmt(cat.qk, 2) : ""}</Cel>
        <Cel k={4} o><Eenheid e="kN/m2" /></Cel>
      </>,
    );
    if (bk.lichteScheidingswanden.trim()) {
      const ls = getal(bk.lichteScheidingswanden);
      rijen.push(
        <>
          <Cel k={1} n={2} o>L.S.</Cel>
          <Cel k={3} o klasse="rpa-invoer">{bk.lichteScheidingswanden}</Cel>
          <Cel k={4} o><Eenheid e="kN/m2" /></Cel>
        </>,
        <>
          <Cel k={1} n={2} o>Algemeen q<sub>k</sub>+L.S.</Cel>
          <Cel k={3} o>{cat ? getalTekst(cat.qk + ls, 2) : ""}</Cel>
          <Cel k={4} o><Eenheid e="kN/m2" /></Cel>
        </>,
      );
    }
    rijen.push(
      <>
        <Cel k={1} n={2} o>Algemeen Q<sub>k</sub></Cel>
        <Cel k={3} o klasse="rpa-invoer">{cat ? fmt(cat.Qk, 2) : ""}</Cel>
        <Cel k={4} o><Eenheid e="kN" /></Cel>
      </>,
    );
  } else {
    const alfa = getal(bk.dakhelling);
    rijen.push(
      <>
        <Cel k={1} n={2} o>Dak plat q<sub>k</sub></Cel>
        <Cel k={3} o klasse="rpa-invoer">{fmt(cat.qk, 1)}</Cel>
        <Cel k={4} o><Eenheid e="kN/m2" /></Cel>
      </>,
      <>
        <Cel k={1} n={2} o>Dak plat Q<sub>k</sub></Cel>
        <Cel k={3} o klasse="rpa-invoer">{fmt(cat.Qk, 1)}</Cel>
        <Cel k={4} o><Eenheid e="kN" /></Cel>
      </>,
      <>
        <Cel k={1} n={2} o>Dak schuin</Cel>
        <Cel k={3} o>{Number.isFinite(alfa) ? fmt(dakQk(alfa), 1) : ""}</Cel>
        <Cel k={4} o><Eenheid e="kN/m2" /></Cel>
      </>,
      <>
        <Cel k={1} n={2} o>Dak q-last</Cel>
        <Cel k={3} o>{bk.qlast}</Cel>
        <Cel k={4} o><Eenheid e="kN/m1" /></Cel>
      </>,
      <>
        <Cel k={1} n={2} o>α</Cel>
        <Cel k={3} o klasse="rpa-invoer">{bk.dakhelling}</Cel>
        <Cel k={4} o>°</Cel>
      </>,
    );
  }
  return (
    <>
      {!eerste && <Leeg />}
      {rijen.map((inhoud, i) => (
        <Rij key={i} klasse={i === 0 && eerste ? "rpa-tt rpa-draagt" : "rpa-tt"}>
          {inhoud}
          {cat && i < 3 && (
            <>
              <Cel k={8} o>ψ<sub>{i}</sub></Cel>
              <Cel k={9} o>{fmt(cat.psi[i], 1)}</Cel>
            </>
          )}
          {i === 0 && eerste && <span className="rpa-boven rpa-norm">6.3.1.2 NEN-EN 1991-1-1</span>}
        </Rij>
      ))}
    </>
  );
}

/** 5.4 Overige veranderlijke belastingen: de belastingklassen onder elkaar, met een lege regel ertussen. */
export function Veranderlijk({ w }: { w: RapportWeergave }) {
  return (
    <>
      {w.rapport.belastingen.klassen.map((bk, i) => (
        <KlasseRijen key={i} bk={bk} eerste={i === 0} />
      ))}
    </>
  );
}

/**
 * Een vlakopbouw: per laag d × ρ, of de ingevulde p; de som in kN/m². d, ρ en
 * een ingevulde p staan er zoals ze zijn ingevuld, een berekende p met twee
 * decimalen. Op de onderste laag het plusteken en de optellijn.
 */
function VlakTabel({ opbouw }: { opbouw: Extract<Opbouw, { soort: "vlak" }> }) {
  const { regels, som } = vlakOpbouw(opbouw.lagen);
  const laatste = opbouw.lagen.length - 1;
  return (
    <>
      <Rij klasse="rpa-vet" houd>
        <Cel k={1} n={2} b o l klasse="rpa-kop-licht">{opbouw.naam}</Cel>
        <Cel k={3} b o klasse="rpa-kop-licht">d<Eenheid e="m" /></Cel>
        <Cel k={4} b o klasse="rpa-kop-licht">ρ<Eenheid e="kN/m3" /></Cel>
        <Cel k={5} n={2} b o r klasse="rpa-kop-licht">p<sub>rep</sub></Cel>
      </Rij>
      {opbouw.lagen.map((laag, i) => {
        const onderste = i === laatste;
        const p = laag.p.trim() ? laag.p : fmt(regels[i]?.p ?? 0, 2);
        return (
          <Rij key={i}>
            <Cel k={1} n={2}>{laag.naam}</Cel>
            <Cel k={3}>{laag.d}</Cel>
            <Cel k={4}>{laag.rho}</Cel>
            <Cel k={5} o={onderste}>{p}</Cel>
            <Cel k={6} o={onderste}><Eenheid e="kN/m2" /></Cel>
            {onderste && <Cel k={7} o>+</Cel>}
          </Rij>
        );
      })}
      <Rij>
        <Cel k={5}>{fmt(som, 2)}</Cel>
        <Cel k={6}><Eenheid e="kN/m2" /></Cel>
      </Rij>
    </>
  );
}

/**
 * Een gevelopbouw: per laag q = p × h × vulling, de som in kN/m¹. p en h zoals
 * ingevuld, de vulling als percentage, q en de som met twee decimalen.
 */
function GevelTabel({ opbouw }: { opbouw: Extract<Opbouw, { soort: "gevel" }> }) {
  const { regels, som } = gevelOpbouw(opbouw.lagen);
  const laatste = opbouw.lagen.length - 1;
  return (
    <>
      <Rij klasse="rpa-vet" houd>
        <Cel k={1} b o l klasse="rpa-kop-licht">{opbouw.naam}</Cel>
        <Cel k={2} b o klasse="rpa-kop-licht">p<sub>rep</sub></Cel>
        <Cel k={3} b o klasse="rpa-kop-licht">h<Eenheid e="m" /></Cel>
        <Cel k={4} b o klasse="rpa-kop-licht">vulling</Cel>
        <Cel k={5} n={2} b o r klasse="rpa-kop-licht">q<sub>rep</sub></Cel>
      </Rij>
      {opbouw.lagen.map((laag, i) => {
        const onderste = i === laatste;
        const regel = regels[i];
        return (
          <Rij key={i}>
            <Cel k={1}>{laag.naam}</Cel>
            <Cel k={2} klasse="rpa-midden">{laag.p}</Cel>
            <Cel k={3}>{laag.h}</Cel>
            <Cel k={4}>{regel ? vullingTekst(regel.vulling) : laag.vulling}</Cel>
            <Cel k={5} o={onderste}>{regel ? fmt(regel.q, 2) : ""}</Cel>
            <Cel k={6} o={onderste}><Eenheid e="kN/m1" /></Cel>
            {onderste && <Cel k={7} o>+</Cel>}
          </Rij>
        );
      })}
      <Rij>
        <Cel k={5}>{fmt(som, 2)}</Cel>
        <Cel k={6}><Eenheid e="kN/m1" /></Cel>
      </Rij>
    </>
  );
}

/**
 * Een groep van 5.5 (VLOER, DAKEN of WANDEN): een donkere kop met een lijn
 * over de volle breedte erboven, dan de opbouwen met telkens een lege regel
 * ertussen. `direct`: de kop staat direct onder de paragraafkop en krijgt dan
 * geen extra lege regel boven zich.
 */
export function Groep({ titel, opbouwen, direct, inspringen }: {
  titel: string; opbouwen: Opbouw[]; direct: boolean; inspringen: 0 | 1;
}) {
  const tabellen = opbouwen.map((o, i) => (
    <Fragment key={i}>
      {i > 0 && <Leeg />}
      {o.soort === "vlak" ? <VlakTabel opbouw={o} /> : <GevelTabel opbouw={o} />}
    </Fragment>
  ));
  return (
    <>
      <Rij klasse={direct ? "rpa-groep rpa-direct" : "rpa-groep"} houd>
        <Cel k={1 + inspringen} n={2} klasse="rpa-kop-donker">{titel}</Cel>
      </Rij>
      {inspringen ? <Vlak klasse="rpa-in">{tabellen}</Vlak> : tabellen}
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop`
Verwacht: geen uitvoer, exitcode 0.

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/components/rapport/afdruk/Belastingen.tsx
git commit -m "feat(rapport): afdruk van hoofdstuk 5 belastingen" -m "Sneeuw op een plat dak, wind met q_p en P_rep per coefficient, belastingklassen voor vloeren en daken met psi-factoren, en de vlak- en gevelopbouwen van de blijvende belastingen met som en optellijn." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 28: Hoofdstukken, koppen en berekeningen

**Files:**
- Create: `packages/desktop/src/components/rapport/afdruk/Knopen.tsx`

**Interfaces:**
- Consumes: `Rapportknoop` (met `nummer`, `nieuwePagina`, `kinderen`, `blad?: { id; naam; bijlage }`,
  `inspringen?`, `inhoud?`); `vulIn`; `RapportWeergave` (Task 24); `samenvatting(r)` uit
  `components/calc/bladResultaat.ts` (Task 19); bouwstenen (Task 25); H4-renderers (Task 26);
  `Sneeuw`, `Wind`, `Veranderlijk`, `Groep` (Task 27).
- Produces:
  - `export interface Stuk { sleutel: string; nieuwePagina: boolean; inhoud: ReactNode }`
  - `export function hoofdstukStukken(w: RapportWeergave): Stuk[]` — per knoop één stuk (kop +
    eigen inhoud in een `Vlak`, ingesprongen in `Vlak klasse="rpa-in"` waar de knoop of zijn
    hoofdstuk `inspringen: 1` heeft); het eerste hoofdstuk begint altijd een nieuwe sectie;
    5.5 levert een tweede stuk `"<id>-wanden"` als WANDEN apart moet.
  - Koppen: `h1.rpa-h1` (+ `rpa-vervolg`), `h2.rpa-h2`, `h3.rpa-h3`, `h4.rpa-h4` (+ `rpa-direct`),
    `h2.rpa-hb` voor een blad in Berekeningen, `h3.rpa-io-kop` "Inhoudsopgave".

- [ ] **Step 1: Maak `Knopen.tsx`**

```tsx
import type { ReactNode } from "react";
import type { Rapportknoop } from "../../../rapport/opzet";
import { vulIn } from "../../../rapport/invullen";
import { samenvatting } from "../../calc/bladResultaat";
import type { RapportWeergave } from "./useRapportWeergave";
import { Cel, Leeg, Rij, Tekst, Vlak } from "./raster";
import { Bestaand, Bouwwerk, Brand, Conservering, Factoren, Materialen, Vervormingen } from "./Uitgangspunten";
import { Groep, Sneeuw, Veranderlijk, Wind } from "./Belastingen";

/*
 * De hoofdstukken van het rapport: koppen met nummering, en per soort inhoud
 * de weergave.
 *
 * Uitkomst is een rij "stukken": één per knoop, met zijn kop en zijn eigen
 * inhoud. RapportAfdruk zet stukken die doorlopen in één sectie en begint een
 * nieuwe sectie waar een knoop op een nieuwe pagina hoort. Zo kan elk
 * hoofdstuk, elke paragraaf en ook het blok WANDEN op een vers vel beginnen,
 * zonder dat een kop en zijn inhoud van elkaar loskomen.
 *
 * Witregels volgen de referentie: een kop heeft een lege regel boven zich,
 * behalve direct onder de kop van zijn ouder; hoofdstuk-, paragraaf- en
 * blokkoppen hebben er ook een onder zich.
 */

/** Een stuk rapport: begint het op een nieuw vel, en wat staat erin. */
export interface Stuk {
  sleutel: string;
  nieuwePagina: boolean;
  inhoud: ReactNode;
}

/** Waar een knoop staat. */
interface Plaats {
  /** Begint een nieuwe sectie, en dus een nieuw vel. */
  begin: boolean;
  /** Staat direct onder de kop van zijn ouder, zonder iets ertussen. */
  direct: boolean;
  /** Inspringen van de inhoud, geërfd van het hoofdstuk. */
  inspringen: 0 | 1;
}

type Blad = NonNullable<Rapportknoop["blad"]>;

/** De kop van een knoop, met nummer. */
function Kop({ knoop, plaats }: { knoop: Rapportknoop; plaats: Plaats }) {
  const tekst = knoop.nummer ? `${knoop.nummer} ${knoop.titel}` : knoop.titel;
  const direct = plaats.direct ? " rpa-direct" : "";
  if (knoop.blad) return <h2 className="rpa-hb">{tekst}</h2>;
  // Een hoofdstuk dat binnen een sectie doorloopt krijgt een extra lege regel
  // boven zich; bovenaan een vel begint het blok van drie regels meteen.
  if (knoop.niveau === 1) return <h1 className={plaats.begin ? "rpa-h1" : "rpa-h1 rpa-vervolg"}>{tekst}</h1>;
  if (knoop.niveau === 2) return <h2 className={`rpa-h2${direct}`}>{tekst}</h2>;
  if (knoop.niveau === 3) return <h3 className={`rpa-h3${direct}`}>{tekst}</h3>;
  return <h4 className={`rpa-h4${direct}`}>{tekst}</h4>;
}

/** 2.2 Rol binnen het project: de openingszin, dan de rol, de architect en de datum van de onderlegger. */
function RolInhoud({ w }: { w: RapportWeergave }) {
  const { rol } = w.rapport;
  return (
    <>
      <Tekst tekst={w.rapport.teksten.rol} invul={w.invul} />
      <Rij>
        <Cel k={1} n={5}>{vulIn("Rol van {adviseur} in dit project:", w.invul)}</Cel>
        <Cel k={6} n={5}>{rol.rol}</Cel>
      </Rij>
      <Rij>
        <Cel k={2} n={4}>Bouwkundig adviseur/Architect:</Cel>
        <Cel k={6} n={5}>{rol.architect}</Cel>
      </Rij>
      <Rij>
        <Cel k={2} n={4}>Datum bouwkundige onderlegger:</Cel>
        <Cel k={6} n={5}>{rol.datumOnderlegger}</Cel>
      </Rij>
    </>
  );
}

/**
 * Het begin van hoofdstuk Berekeningen: een eigen inhoudsopgave van de
 * paragrafen (die staan niet in de inhoud voorin), met een lijn onder elke
 * regel en twee lege regels erna.
 */
function BerekeningenInhoud({ knoop }: { knoop: Rapportknoop }) {
  const paragrafen = knoop.kinderen.filter((k) => k.blad);
  if (paragrafen.length === 0) return <p className="rpa-tekst">Dit project bevat nog geen rekenbladen.</p>;
  return (
    <>
      <h3 className="rpa-io-kop">Inhoudsopgave</h3>
      {paragrafen.map((k) => (
        <Rij key={k.id} klasse="rpa-tt">
          <Cel k={1} n={3} o>{k.nummer} {k.titel}</Cel>
        </Rij>
      ))}
      <Leeg />
    </>
  );
}

/**
 * Eén blad in hoofdstuk Berekeningen: de automatische samenvatting uit de
 * bladkop, daaronder de eigen toelichting als die er is; dan de verwijzing
 * naar bijlage A, of — als het blad in het hoofdstuk zelf hoort — de
 * uitwerking hier.
 */
function Berekening({ blad, w }: { blad: Blad; w: RapportWeergave }) {
  const b = w.bladen.find((x) => x.ex.id === blad.id);
  const toelichting = w.rapport.toelichting[blad.id] ?? "";
  const inHoofdstuk = w.rapport.inHoofdstuk[blad.id] === true;
  return (
    <>
      {b && <p className="rpa-tekst">{samenvatting(b.resultaat)}</p>}
      {toelichting.trim() && <Tekst tekst={toelichting} invul={w.invul} />}
      {inHoofdstuk && b ? (
        // `print-blad` geeft de uitwerking dezelfde compacte opmaak als een
        // los blad; `rpa-inline` haalt de paginasprong van een los blad weg.
        <Vlak klasse="print-blad rpa-inline">
          <div className="ifc-calc" dangerouslySetInnerHTML={{ __html: b.html }} />
        </Vlak>
      ) : (
        blad.bijlage && <p className="rpa-tekst">Zie bijlage {blad.bijlage}.</p>
      )}
    </>
  );
}

/** De eigen inhoud van een knoop, naar zijn soort. */
function InhoudVan({ knoop, w }: { knoop: Rapportknoop; w: RapportWeergave }) {
  switch (knoop.inhoud) {
    case "tekst":
      return <Tekst tekst={w.rapport.teksten[knoop.id]} invul={w.invul} />;
    case "rol":
      return <RolInhoud w={w} />;
    case "bouwwerk":
      return <Bouwwerk w={w} />;
    case "brand":
      return <Brand w={w} />;
    case "materialen":
      return <Materialen w={w} />;
    case "conservering":
      return <Conservering w={w} />;
    case "factoren":
      return <Factoren w={w} />;
    case "bestaand":
      return <Bestaand w={w} />;
    case "vervormingen":
      return <Vervormingen w={w} />;
    case "sneeuw":
      return <Sneeuw w={w} />;
    case "wind":
      return <Wind w={w} />;
    case "veranderlijk":
      return <Veranderlijk w={w} />;
    case "berekeningen":
      return <BerekeningenInhoud knoop={knoop} />;
    default:
      // "blijvend" krijgt in voegToe een eigen behandeling; zonder inhoud is er niets.
      return null;
  }
}

/** Zet een knoop en daarna zijn kinderen als stukken in `uit`. */
function voegToe(knoop: Rapportknoop, w: RapportWeergave, plaats: Plaats, uit: Stuk[]): void {
  const inspringen = knoop.inspringen ?? plaats.inspringen;
  const kop = <Kop knoop={knoop} plaats={plaats} />;

  // 5.5 heeft twee groepen. WANDEN begint standaard op een nieuw vel — maar
  // alleen als er ook vloeren of daken zijn, anders bleef de kop 5.5 alleen
  // achter op het vorige vel.
  if (knoop.inhoud === "blijvend") {
    const { vloerenDaken, wanden } = w.rapport.belastingen;
    const wandenApart = vloerenDaken.length > 0 && wanden.length > 0;
    uit.push({
      sleutel: knoop.id,
      nieuwePagina: plaats.begin,
      inhoud: (
        <Vlak>
          {kop}
          {vloerenDaken.length > 0 && (
            <Groep titel="VLOER, DAKEN" opbouwen={vloerenDaken} direct inspringen={inspringen} />
          )}
          {wanden.length > 0 && !wandenApart && (
            <Groep titel="WANDEN" opbouwen={wanden} direct={vloerenDaken.length === 0} inspringen={inspringen} />
          )}
        </Vlak>
      ),
    });
    if (wandenApart) {
      uit.push({
        sleutel: `${knoop.id}-wanden`,
        nieuwePagina: true,
        inhoud: (
          <Vlak>
            <Groep titel="WANDEN" opbouwen={wanden} direct={false} inspringen={inspringen} />
          </Vlak>
        ),
      });
    }
    return;
  }

  const eigen = knoop.blad ? (
    <Berekening blad={knoop.blad} w={w} />
  ) : knoop.inhoud ? (
    <InhoudVan knoop={knoop} w={w} />
  ) : null;
  uit.push({
    sleutel: knoop.id,
    nieuwePagina: plaats.begin,
    inhoud: (
      <Vlak>
        {kop}
        {eigen && (inspringen ? <Vlak klasse="rpa-in">{eigen}</Vlak> : eigen)}
      </Vlak>
    ),
  });

  // Het eerste kind staat direct onder deze kop als deze knoop zelf niets
  // toont en het kind niet op een nieuw vel begint.
  const zonderEigen = !knoop.inhoud && !knoop.blad;
  knoop.kinderen.forEach((kind, i) =>
    voegToe(
      kind,
      w,
      { begin: kind.nieuwePagina, direct: i === 0 && zonderEigen && !kind.nieuwePagina, inspringen },
      uit,
    ),
  );
}

/** Alle hoofdstukken als stukken. Het eerste begint altijd op een vers vel: de inhoud gaat eraan vooraf. */
export function hoofdstukStukken(w: RapportWeergave): Stuk[] {
  const uit: Stuk[] = [];
  w.knopen.forEach((knoop, i) =>
    voegToe(knoop, w, { begin: i === 0 || knoop.nieuwePagina, direct: false, inspringen: 0 }, uit),
  );
  return uit;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop`
Verwacht: geen uitvoer, exitcode 0.

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/components/rapport/afdruk/Knopen.tsx
git commit -m "feat(rapport): hoofdstukken, koppen en berekeningen in de afdruk" -m "Elke knoop wordt een stuk met kop en eigen inhoud; waar een knoop op een nieuwe pagina hoort begint een nieuwe sectie. Berekeningen krijgt een eigen inhoudsopgave en per blad de samenvatting en de eigen toelichting met de verwijzing naar bijlage A." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 29: Voorblad en inhoudsopgave

Rijnummers op het voorblad (vanaf de bovenkant van de bladspiegel, 0 = eerste regel): titel in
regel 2–3 (22 pt, basislijn 83,8 pt), ondertitel regel 4 (14 pt, basislijn 108,5 pt), "Project"
regel 16, "In opdracht van" regel 18–21, documentgegevens vanaf regel 25, twee lege regels, dan
fase, status en kenmerk. Labels in kolom 3 (x 137,0 pt), waarden in kolom 6 (x 298,5 pt), lijnen
van kolom 3 tot en met 7.

**Files:**
- Create: `packages/desktop/src/components/rapport/afdruk/Voorblad.tsx`
- Create: `packages/desktop/src/components/rapport/afdruk/Inhoud.tsx`

**Interfaces:**
- Consumes: `eersteDatum(revisies)`, `rapportStatus(revisies)` uit `rapport/revisies.ts`;
  `RapportWeergave`; bouwstenen.
- Produces: `export default function Voorblad({ w }: { w: RapportWeergave })` →
  `section.rpa-sectie.rpa-voorblad`; `export default function Inhoud({ w }: { w: RapportWeergave })` →
  `section.rpa-sectie.rpa-inhoud`.

- [ ] **Step 1: Maak `Voorblad.tsx`**

```tsx
import type { ReactNode } from "react";
import { eersteDatum, rapportStatus } from "../../../rapport/revisies";
import type { RapportWeergave } from "./useRapportWeergave";
import { Cel, Leeg, Rij, Vlak } from "./raster";

/*
 * Het voorblad, regel voor regel op de plaatsen van de referentie: titel en
 * projectnaam bovenaan, daaronder het project en de opdrachtgever, en in de
 * onderste helft de documentgegevens met lijnen eronder.
 */

/** Een regel documentgegevens: label in de accentkleur, de waarde, een lijn onder beide. */
function Gegeven({ label, waarde, ingesprongen }: { label: ReactNode; waarde?: string; ingesprongen?: boolean }) {
  return (
    <Rij>
      <Cel k={ingesprongen ? 4 : 3} n={ingesprongen ? 2 : 3} o klasse="rpa-label">{label}</Cel>
      <Cel k={6} n={2} o>{waarde}</Cel>
    </Rij>
  );
}

/** "ter goedkeuring" → "Ter goedkeuring". */
const metHoofdletter = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function Voorblad({ w }: { w: RapportWeergave }) {
  const { rapport, bureau, invul } = w;
  const project = [invul.projectnummer, invul.projectnaam].filter(Boolean).join(" - ");
  const adres = rapport.opdrachtgeverAdres
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean);
  // Minstens vier regels, zodat de documentgegevens op hun vaste plaats blijven
  // staan, ook bij een opdrachtgever zonder adres.
  const opdracht = [invul.opdrachtgever, ...adres];
  while (opdracht.length < 4) opdracht.push("");
  const later = rapport.revisies.slice(1);

  return (
    <section className="rpa-sectie rpa-voorblad">
      <Vlak>
        <h1 className="rpa-vb-titel">
          {rapport.titel}
          {bureau.logo && <img className="rpa-vb-logo" src={bureau.logo} alt="" />}
        </h1>
        <p className="rpa-vb-ondertitel">{invul.projectnaam}</p>
        <Leeg n={11} />
        <Rij>
          <Cel k={3} n={3} klasse="rpa-vet">Project</Cel>
          <Cel k={6} n={5}>{project}</Cel>
        </Rij>
        <Leeg />
        {opdracht.map((regel, i) => (
          <Rij key={i}>
            {i === 0 && <Cel k={3} n={3} klasse="rpa-vet">In opdracht van</Cel>}
            <Cel k={6} n={5}>{regel}</Cel>
          </Rij>
        ))}
        <Leeg n={3} />
        <Gegeven label="Adviseur" waarde={bureau.naam} />
        <Gegeven label="Verantwoordelijk constructeur" waarde={rapport.verantwoordelijk} />
        <Gegeven label="Uitvoerend constructeur" waarde={rapport.uitvoerend} />
        <Gegeven label="Toegepaste Normen" waarde={rapport.normen} />
        <Gegeven label="Documentgegevens" />
        <Gegeven label={<>1<sup>e</sup> Datum rapport</>} waarde={eersteDatum(rapport.revisies)} />
        {later.length === 0 ? (
          <Gegeven label="Datum wijz." ingesprongen />
        ) : (
          later.map((r, i) => (
            <Gegeven key={i} label={`Datum wijz. ${r.code}`} waarde={r.datum} ingesprongen />
          ))
        )}
        <Leeg n={2} />
        <Gegeven label="Fase in bouwproces" waarde={rapport.fase} />
        <Gegeven label="Rapportstatus" waarde={metHoofdletter(rapportStatus(rapport.revisies))} />
        <Gegeven label="Documentkenmerk" waarde={rapport.kenmerk} />
      </Vlak>
    </section>
  );
}
```

- [ ] **Step 2: Maak `Inhoud.tsx`**

```tsx
import type { RapportWeergave } from "./useRapportWeergave";
import { Cel, Rij, Vlak } from "./raster";

/**
 * De inhoudsopgave: hoofdstukken (vet, accentkleur, met een lege regel
 * ervoor) en paragrafen, daarna de bijlagen. Zonder paginanummers: bij
 * afdrukken via de browser liggen die vooraf niet vast.
 */
export default function Inhoud({ w }: { w: RapportWeergave }) {
  return (
    <section className="rpa-sectie rpa-inhoud">
      <Vlak>
        <h1 className="rpa-h1">Inhoud</h1>
        {w.inhoud.map((r, i) => (
          <Rij key={r.nummer} klasse={r.niveau === 1 ? (i === 0 ? "rpa-io1" : "rpa-io1 rpa-voor") : undefined}>
            <Cel k={2}>{r.nummer}</Cel>
            <Cel k={3} n={8}>{r.titel}</Cel>
          </Rij>
        ))}
        {w.bijlagen.map((b, i) => (
          <Rij key={b.letter} klasse={i === 0 ? "rpa-voor" : undefined}>
            <Cel k={2} klasse="rpa-vet">Bijlage {b.letter}</Cel>
            <Cel k={3} n={8}>{b.titel}</Cel>
          </Rij>
        ))}
      </Vlak>
    </section>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop`
Verwacht: geen uitvoer, exitcode 0.

- [ ] **Step 4: Commit**

```bash
git add packages/desktop/src/components/rapport/afdruk/Voorblad.tsx packages/desktop/src/components/rapport/afdruk/Inhoud.tsx
git commit -m "feat(rapport): voorblad en inhoudsopgave" -m "Voorblad met titel, projectnaam, opdrachtgever en documentgegevens op de regels van de referentie; inhoud met hoofdstukken, paragrafen en bijlagen." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 30: De rapportafdruk met huisstijl, raster en bijlage A

**Files:**
- Create: `packages/desktop/src/components/rapport/afdruk/RapportAfdruk.tsx`
- Create: `packages/desktop/src/components/rapport/afdruk/RapportAfdruk.css`

**Interfaces:**
- Consumes: `useRapportWeergave`, `RapportBlad` (Task 24); `hoofdstukStukken`, `Stuk` (Task 28);
  `Voorblad`, `Inhoud` (Task 29); `PrintBlad` (Task 22); `STANDAARD_HUISSTIJL`, `Huisstijl`,
  `BureauProfiel` uit `rapport/model.ts`.
- Produces:
  - `export default function RapportAfdruk(): JSX.Element` → `div.rpa-wortel` met inline
    `--rpa-hoofd`, `--rpa-accent`, `--rpa-tabel`, `--rpa-invoer`, `--rpa-font`; kinderen:
    `div.rpa-voet`, voorblad, inhoud, hoofdstuksecties `section.rpa-sectie`,
    `section.rpa-sectie.rpa-bijlagekop`, en per blad in bijlage A `section.print-blad` met nummer "A.n".
  - CSS: `@page rapport`, het raster (`--rpa-rij: 6.6mm`, `--rpa-kolom: 18.98mm`, `--rpa-cel: 1.4pt`),
    alle `rpa-*`-klassen uit Task 25–29, en `.rpa-voet` als vast element in `html.afdrukmodus`.

- [ ] **Step 1: Maak `RapportAfdruk.tsx`**

```tsx
import { Fragment, type CSSProperties } from "react";
import { STANDAARD_HUISSTIJL, type BureauProfiel, type Huisstijl } from "../../../rapport/model";
import { PrintBlad } from "../../calc/PrintBlad";
import { useRapportWeergave, type RapportBlad } from "./useRapportWeergave";
import { hoofdstukStukken, type Stuk } from "./Knopen";
import Voorblad from "./Voorblad";
import Inhoud from "./Inhoud";
import "./RapportAfdruk.css";

/** De huisstijl als CSS-variabelen op de wortel. Een leeg veld valt terug op de standaard. */
function huisstijlStijl(h: Huisstijl): CSSProperties {
  const s = STANDAARD_HUISSTIJL;
  return {
    "--rpa-hoofd": h.hoofdkleur || s.hoofdkleur,
    "--rpa-accent": h.accentkleur || s.accentkleur,
    "--rpa-tabel": h.tabeltekst || s.tabeltekst,
    "--rpa-invoer": h.invoerkleur || s.invoerkleur,
    "--rpa-font": h.lettertype || s.lettertype,
  } as CSSProperties;
}

/** Stukken in secties: een stuk met `nieuwePagina` begint een nieuwe sectie, en daarmee een nieuw vel. */
function groepeer(stukken: Stuk[]): Stuk[][] {
  const secties: Stuk[][] = [];
  for (const s of stukken) {
    if (s.nieuwePagina || secties.length === 0) secties.push([s]);
    else secties[secties.length - 1].push(s);
  }
  return secties;
}

/**
 * De voet voor de echte afdruk: de voetafbeelding van het bureau over de
 * volle breedte in de ondermarge, of zonder afbeelding een dunne lijn met de
 * bureaunaam. Een vast element herhaalt de browser op elke afgedrukte pagina;
 * op het scherm is hij onzichtbaar (het afdrukvoorbeeld tekent zijn eigen
 * voet per vel).
 */
function Voet({ bureau }: { bureau: BureauProfiel }) {
  return (
    <div className="rpa-voet" aria-hidden="true">
      {bureau.voetafbeelding ? (
        <img className="rpa-voet-beeld" src={bureau.voetafbeelding} alt="" />
      ) : (
        <div className="rpa-voet-lijn">{bureau.naam}</div>
      )}
    </div>
  );
}

/** Een blad in bijlage A, met zijn bijlagenummer. */
type BijlageBlad = RapportBlad & { nummer: string };

/**
 * Het volledige constructierapport: voorblad, inhoud, de hoofdstukken en
 * bijlage A. Elke `section` begint op een nieuw vel — in het afdrukvoorbeeld
 * omdat de verdeling dat zo doet, bij het printen via `break-before`.
 */
export default function RapportAfdruk() {
  const w = useRapportWeergave();
  const secties = groepeer(hoofdstukStukken(w));

  // Bijlage A: de bladen waarvan de uitwerking niet in het hoofdstuk zelf
  // staat, in de volgorde en met de nummers van hoofdstuk Berekeningen.
  const berekeningen = w.knopen.find((k) => k.id === "berekeningen");
  const inBijlage = (berekeningen?.kinderen ?? []).flatMap((k): BijlageBlad[] => {
    const blad = k.blad;
    if (!blad || !blad.bijlage || w.rapport.inHoofdstuk[blad.id]) return [];
    const b = w.bladen.find((x) => x.ex.id === blad.id);
    return b ? [{ ...b, nummer: blad.bijlage }] : [];
  });
  const titelA = w.bijlagen.find((b) => b.letter === "A")?.titel ?? "Uitgebreide uitwerking berekeningen";

  return (
    <div className="rpa-wortel" style={huisstijlStijl(w.bureau.huisstijl)}>
      <Voet bureau={w.bureau} />
      <Voorblad w={w} />
      <Inhoud w={w} />
      {secties.map((stukken) => (
        <section key={stukken[0].sleutel} className="rpa-sectie">
          {stukken.map((s) => (
            <Fragment key={s.sleutel}>{s.inhoud}</Fragment>
          ))}
        </section>
      ))}
      {inBijlage.length > 0 && (
        <section className="rpa-sectie rpa-bijlagekop">
          <h1 className="rpa-h1">Bijlage A {titelA}</h1>
        </section>
      )}
      {inBijlage.map((b) => (
        <PrintBlad key={b.ex.id} ex={b.ex} html={b.html} nummer={b.nummer} resultaat={b.resultaat} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Maak `RapportAfdruk.css`**

```css
/*
 * Het constructierapport op papier.
 *
 * Alles staat op het raster van de referentie-spreadsheet: regels van 6,6 mm
 * (18,7 pt) en kolommen van 18,98 mm (53,8 pt). Elke hoogte is een geheel
 * aantal regels, en de bladspiegel (270,6 mm) is er precies 41. Zo valt een
 * vel van het rapport op dezelfde regels als het vel van de referentie. Tekst
 * van 10 pt met een regelhoogte van 6,6 mm komt met Segoe UI vanzelf op de
 * basislijn van de referentie (13,5 pt onder de bovenkant van de regel).
 *
 * Deze regels gelden op drie plaatsen:
 * - de echte afdruk: .print-root > .rpa-wortel > section;
 * - de meetopstelling van het afdrukvoorbeeld: .av-meet > .rpa-wortel > section;
 * - de vellen van het voorbeeld: .av-pagina.rpa-wortel > .av-pagina-inhoud.<sectieklassen>.
 * Daarom hangt alles aan `.rpa-wortel` plus een eigen klasse op het element
 * zelf, en nooit aan de nesting binnen een sectie: op een vel van het
 * voorbeeld staat een regel los, zonder de wikkels waar hij uit kwam.
 *
 * Witruimte bóven een regel is padding, geen marge: het voorbeeld zet de
 * bovenmarge van het eerste blok op een vel op nul, en de browser laat marges
 * bij een paginaovergang vallen. De lege regel boven een kop moet op beide
 * plaatsen blijven staan, net als in de referentie.
 */

@page rapport {
  size: A4 portrait;
  /*
   * De marges van de referentie, gelijk aan MATEN.rapport in paginering.ts:
   * de bladspiegel is precies 41 regels van 6,6 mm, in het voorbeeld en op
   * papier. De voet vult de ondermarge van 19,8 mm (zie .rpa-voet).
   */
  margin: 6.6mm 9.9mm 19.8mm 9.85mm;

  /* De algemene @page zet "Pagina x van y" in het midden; niet in het rapport. */
  @bottom-center {
    content: none;
  }

  /*
   * Het paginanummer rechtsonder: 10 pt zwart, verticaal midden in de
   * ondermarge — dat komt uit op de basislijn van de referentie (817,9 pt).
   * Vaste lettertypen: een paginamarge erft geen CSS-variabelen van het
   * document.
   */
  @bottom-right {
    content: counter(page);
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    font-size: 10pt;
    color: #000;
    text-align: right;
    vertical-align: middle;
  }
}

.rpa-wortel {
  --rpa-rij: 6.6mm;
  --rpa-kolom: 18.98mm;
  /* Van een kolomgrens tot de tekst in de cel: 29,3 pt − 27,9 pt. */
  --rpa-cel: 1.4pt;
  --rpa-lijn: 0.75pt solid #000;
  page: rapport;
  color: #000;
  /* Vullingen van kopregels ook zonder "achtergrondafbeeldingen" in de printdialoog. */
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.rpa-wortel > section {
  page: rapport;
}

.rpa-wortel .rpa-sectie {
  font-family: var(--rpa-font);
  font-size: 10pt;
  line-height: var(--rpa-rij);
  color: #000;
}

/* Elke sectie op een vers vel; de eerste (het voorblad) begint gewoon bovenaan. */
.print-opmaak .rpa-wortel > section {
  break-before: page;
  page-break-before: always;
}

.print-opmaak .rpa-wortel > section:first-of-type {
  break-before: auto;
  page-break-before: auto;
}

/* ─── Het raster ──────────────────────────────────────────────── */

.rpa-wortel .rpa-rij {
  display: grid;
  grid-template-columns: repeat(10, var(--rpa-kolom));
  grid-auto-rows: minmax(var(--rpa-rij), auto);
  box-sizing: border-box;
  break-inside: avoid;
  page-break-inside: avoid;
}

/* Een cel is één regel hoog; tekst mag, zoals in een spreadsheet, over de
   lege cellen ernaast doorlopen. */
.rpa-wortel .rpa-cel {
  box-sizing: border-box;
  min-width: 0;
  min-height: var(--rpa-rij);
  padding: 0 var(--rpa-cel);
  line-height: var(--rpa-rij);
  white-space: nowrap;
}

/* Lijnen liggen binnen de regel: de regelhoogte krimpt met de lijndikte,
   zodat alles eronder op het raster blijft. */
.rpa-wortel .rpa-o {
  border-bottom: var(--rpa-lijn);
  line-height: calc(var(--rpa-rij) - 0.75pt);
}

.rpa-wortel .rpa-b {
  border-top: var(--rpa-lijn);
  line-height: calc(var(--rpa-rij) - 0.75pt);
}

.rpa-wortel .rpa-o.rpa-b {
  line-height: calc(var(--rpa-rij) - 1.5pt);
}

.rpa-wortel .rpa-l {
  border-left: var(--rpa-lijn);
}

.rpa-wortel .rpa-r {
  border-right: var(--rpa-lijn);
}

.rpa-wortel .rpa-leeg {
  height: var(--rpa-rij);
}

/* Hoofdstuk 4 en 5: de inhoud springt één kolom in, de koppen niet. */
.rpa-wortel .rpa-in {
  padding-left: var(--rpa-kolom);
}

/* Een lege regel boven deze regel, die met de regel meegaat naar een nieuw vel. */
.rpa-wortel .rpa-voor {
  padding-top: var(--rpa-rij);
}

.rpa-wortel .rpa-cel sub,
.rpa-wortel .rpa-cel sup {
  font-size: 70%;
  line-height: 0;
}

/* ─── Lopende tekst ───────────────────────────────────────────── */

.rpa-wortel .rpa-tekst {
  box-sizing: border-box;
  margin: 0;
  padding: 0 var(--rpa-cel);
  min-height: var(--rpa-rij);
  line-height: var(--rpa-rij);
  overflow-wrap: break-word;
  break-inside: avoid;
  page-break-inside: avoid;
}

/* Een opsommingsregel ("-…") springt één kolom in. */
.rpa-wortel .rpa-streep {
  padding-left: calc(var(--rpa-kolom) + var(--rpa-cel));
}

/* ─── Koppen ──────────────────────────────────────────────────── */

/* Hoofdstuk: een blok van drie regels, de tekst onderaan (basislijn 8,6 pt
   boven de onderkant), dan een lege regel. */
.rpa-wortel .rpa-h1 {
  margin: 0;
  padding: var(--rpa-rij) 0 var(--rpa-rij) var(--rpa-cel);
  font-size: 24pt;
  font-weight: 700;
  line-height: calc(2 * var(--rpa-rij));
  color: var(--rpa-hoofd);
}

/* Een hoofdstuk dat binnen een sectie doorloopt: één lege regel extra erboven. */
.rpa-wortel .rpa-h1.rpa-vervolg {
  padding-top: calc(2 * var(--rpa-rij));
}

/* Paragraaf: lege regel, de kop, lege regel. */
.rpa-wortel .rpa-h2 {
  margin: 0;
  padding: var(--rpa-rij) 0 var(--rpa-rij) var(--rpa-cel);
  font-size: 12pt;
  font-weight: 700;
  line-height: var(--rpa-rij);
  color: var(--rpa-accent);
}

/* Blok: lege regel, de kop met een lijn over de volle breedte, lege regel.
   De lege regel eronder is marge, want de lijn hoort direct onder de tekst. */
.rpa-wortel .rpa-h3 {
  margin: 0 0 var(--rpa-rij);
  padding: var(--rpa-rij) 0 0 var(--rpa-cel);
  border-bottom: var(--rpa-lijn);
  font-size: 11pt;
  font-weight: 700;
  line-height: calc(var(--rpa-rij) - 0.75pt);
  color: #000;
}

/* Subblok: lege regel, de kop vet-cursief, de tekst er direct onder. */
.rpa-wortel .rpa-h4 {
  margin: 0;
  padding: var(--rpa-rij) 0 0 var(--rpa-cel);
  font-size: 10pt;
  font-weight: 700;
  font-style: italic;
  line-height: var(--rpa-rij);
}

/* Een blad in hoofdstuk Berekeningen: normaal gewicht, accentkleur, lijn eronder. */
.rpa-wortel .rpa-hb {
  margin: 0 0 var(--rpa-rij);
  padding: var(--rpa-rij) 0 0 var(--rpa-cel);
  border-bottom: var(--rpa-lijn);
  font-size: 12pt;
  font-weight: 400;
  line-height: calc(var(--rpa-rij) - 0.75pt);
  color: var(--rpa-accent);
}

/* "Inhoudsopgave" in hoofdstuk Berekeningen: direct onder de hoofdstukkop. */
.rpa-wortel .rpa-io-kop {
  margin: 0;
  padding: 0 var(--rpa-cel);
  font-size: 12pt;
  font-weight: 700;
  line-height: var(--rpa-rij);
  color: var(--rpa-accent);
}

/* De groepskop van 5.5: lege regel, een lijn over de volle breedte, de kop
   met donkere vulling, lege regel. */
.rpa-wortel .rpa-groep {
  position: relative;
  padding: var(--rpa-rij) 0;
}

.rpa-wortel .rpa-groep::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: var(--rpa-rij);
  border-top: var(--rpa-lijn);
}

.rpa-wortel .rpa-groep.rpa-direct::before {
  top: 0;
}

/* Direct onder de kop van de ouder: geen lege regel erboven. Na de koppen
   hierboven, zodat deze regel wint. */
.rpa-wortel .rpa-direct {
  padding-top: 0;
}

/* Een kop hoort niet los onderaan een vel. */
.rpa-wortel .rpa-sectie h1,
.rpa-wortel .rpa-sectie h2,
.rpa-wortel .rpa-sectie h3,
.rpa-wortel .rpa-sectie h4,
.rpa-wortel .rpa-houd {
  break-after: avoid;
  page-break-after: avoid;
}

/* ─── Tabellen ────────────────────────────────────────────────── */

.rpa-wortel .rpa-vet {
  font-weight: 700;
}

.rpa-wortel .rpa-cursief {
  font-style: italic;
}

.rpa-wortel .rpa-midden {
  text-align: center;
}

.rpa-wortel .rpa-tt {
  color: var(--rpa-tabel);
}

.rpa-wortel .rpa-invoer {
  color: var(--rpa-invoer);
}

.rpa-wortel .rpa-label {
  font-weight: 700;
  color: var(--rpa-accent);
}

/* Normverwijzingen: rechts, 8 pt cursief. */
.rpa-wortel .rpa-norm {
  font-size: 8pt;
  font-style: italic;
  text-align: right;
  color: #000;
}

.rpa-wortel .rpa-kop-donker {
  background: var(--rpa-hoofd);
  color: var(--rpa-accent);
  font-weight: 700;
}

.rpa-wortel .rpa-kop-licht {
  background: var(--rpa-accent);
  color: var(--rpa-hoofd);
}

/* Een verwijzing die boven zijn regel staat, in de lege regel onder de kop. */
.rpa-wortel .rpa-draagt {
  position: relative;
}

.rpa-wortel .rpa-boven {
  position: absolute;
  right: 0;
  bottom: 100%;
  padding: 0 var(--rpa-cel);
  line-height: var(--rpa-rij);
  white-space: nowrap;
}

/* ─── Inhoud ──────────────────────────────────────────────────── */

.rpa-wortel .rpa-io1 {
  font-weight: 700;
  color: var(--rpa-accent);
}

/* ─── Voorblad ────────────────────────────────────────────────── */

/* De titel: 22 pt in de hoofdkleur, in kolom 2, basislijn 83,8 pt. */
.rpa-wortel .rpa-vb-titel {
  position: relative;
  margin: 0;
  padding: calc(2 * var(--rpa-rij)) 0 0 calc(var(--rpa-kolom) + var(--rpa-cel));
  font-size: 22pt;
  font-weight: 700;
  line-height: calc(2 * var(--rpa-rij));
  color: var(--rpa-hoofd);
}

.rpa-wortel .rpa-vb-logo {
  position: absolute;
  top: var(--rpa-rij);
  right: 0;
  max-width: 60mm;
  max-height: calc(3 * var(--rpa-rij));
}

/* De projectnaam: 14 pt in de accentkleur, basislijn 108,5 pt. */
.rpa-wortel .rpa-vb-ondertitel {
  margin: 0;
  padding-left: calc(var(--rpa-kolom) + var(--rpa-cel));
  font-size: 14pt;
  line-height: var(--rpa-rij);
  white-space: nowrap;
  color: var(--rpa-accent);
}

/* ─── Rekenbladen in het rapport ──────────────────────────────── */

/* Een blad (bijlage A of in het hoofdstuk zelf) houdt de opmaak van een los
   blad, niet het raster van het rapport. */
.rpa-wortel .print-blad {
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  font-size: 10.5pt;
  line-height: 1.45;
  color: #000;
}

/* In het hoofdstuk zelf geen paginasprong zoals bij een los blad. */
.print-opmaak .rpa-wortel .print-blad.rpa-inline {
  break-before: auto;
  page-break-before: auto;
}

/* Het vakje met het nummer groeit mee: "A.12" past niet in een vierkant. */
.rpa-wortel .print-blad .print-blad-nr {
  width: auto;
  min-width: 18pt;
  padding: 0 4pt;
}

/* ─── Voet in de echte afdruk ─────────────────────────────────── */

/* Op het scherm onzichtbaar: het afdrukvoorbeeld tekent zijn eigen voet. */
.rpa-wortel .rpa-voet {
  display: none;
}

/* Een vast element herhaalt de browser op elke pagina. De negatieve offset
   zet hem in de ondermarge: over de volle breedte van het papier, de onderste
   19,8 mm. */
html.afdrukmodus .rpa-wortel .rpa-voet {
  display: block;
  position: fixed;
  left: -9.85mm;
  bottom: -19.8mm;
  width: 210mm;
  height: 19.8mm;
}

.rpa-wortel .rpa-voet-beeld {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center bottom;
}

/* Zonder voetafbeelding: een dunne lijn met de bureaunaam links. */
.rpa-wortel .rpa-voet-lijn {
  position: absolute;
  left: 9.85mm;
  right: 9.9mm;
  bottom: 11mm;
  padding-top: 3pt;
  border-top: 0.5pt solid #9ca3af;
  font-family: var(--rpa-font);
  font-size: 8pt;
  line-height: 1.2;
  color: #6b6b73;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p packages/desktop`
Verwacht: geen uitvoer, exitcode 0. (Het rapport hangt pas in Task 31 in het voorbeeld; daar volgt de browsercontrole van Task 24 t/m 30.)

- [ ] **Step 4: Commit**

```bash
git add packages/desktop/src/components/rapport/afdruk/RapportAfdruk.tsx packages/desktop/src/components/rapport/afdruk/RapportAfdruk.css
git commit -m "feat(rapport): rapportafdruk met huisstijl, raster en bijlage A" -m "RapportAfdruk zet voorblad, inhoud, hoofdstukken en bijlage A in secties; de huisstijl gaat als CSS-variabelen op de wortel. De opmaak volgt het raster van de referentie: regels van 6,6 mm, kolommen van 18,98 mm, @page rapport met paginanummer rechtsonder en de voet van het bureau." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 31: Afdrukvoorbeeld van het rapport

**Files:**
- Modify: `packages/desktop/src/components/calc/AfdrukVoorbeeld.tsx` (hele bestand, regels 1–206)
- Modify: `packages/desktop/src/components/calc/AfdrukVoorbeeld.css` (regels 107–108 en na regel 196)

**Interfaces:**
- Consumes: `usePrintStore` met `soort: "bladen" | "rapport"`; `useProjectStore` (`rapport`,
  `gegevens`, `exemplaren`); `RapportAfdruk` (Task 30); `useRapportBureau` (Task 24);
  `meetBlokken`, `verdeelPerSectie`, `pxPerMm`, `MATEN`, `SPELING`, `type Maten` (Task 23).
- Produces: in de stand `rapport` rendert de meetopstelling (breedte `MATEN.rapport.inhoud.breedte`)
  `<RapportAfdruk />`; elk vel krijgt de klasse `rpa-wortel`, de huisstijlvariabelen van de wortel
  en een voet (`img.av-rapport-voet` of `div.av-rapport-lijn`) plus `div.av-rapport-nummer`, zonder
  loopkop. De bladspiegel komt per vel uit `MATEN[soort]`. Opnieuw verdelen bij elke wijziging van
  `rapport`, `gegevens`, `exemplaren` of het bureau.

- [ ] **Step 1: Vervang `AfdrukVoorbeeld.tsx` volledig door**

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { usePrintStore } from "../../store/printStore";
import { useProjectStore } from "../../store/projectStore";
import { useUitdraai, UitdraaiInhoud, loopkopLinks } from "./PrintDocument";
import RapportAfdruk from "../rapport/afdruk/RapportAfdruk";
import { useRapportBureau } from "../rapport/afdruk/useRapportWeergave";
import { meetBlokken, verdeelPerSectie, pxPerMm, MATEN, SPELING, type Maten } from "./paginering";
import "./PrintDocument.css";
import "./AfdrukVoorbeeld.css";

const ZOOMSTANDEN = [0.5, 0.75, 1, 1.25, 1.5];

/**
 * De voet van een vel van het rapport: de voetafbeelding van het bureau over
 * de volle breedte in de ondermarge (of zonder afbeelding een dunne lijn met
 * de bureaunaam), en rechts het paginanummer midden in die marge. Dezelfde
 * plaats als in de echte afdruk, waar de voet een vast element is en het
 * nummer in de paginamarge staat (RapportAfdruk.css).
 */
function rapportVoet(nummer: number, voetafbeelding: string, bureaunaam: string, maten: Maten): HTMLElement[] {
  const uit: HTMLElement[] = [];
  if (voetafbeelding) {
    const beeld = document.createElement("img");
    beeld.className = "av-rapport-voet";
    beeld.alt = "";
    beeld.src = voetafbeelding;
    beeld.style.height = `${maten.marge.onder}mm`;
    uit.push(beeld);
  } else {
    const lijn = document.createElement("div");
    lijn.className = "av-rapport-lijn";
    lijn.textContent = bureaunaam;
    lijn.style.left = `${maten.marge.links}mm`;
    lijn.style.right = `${maten.marge.rechts}mm`;
    uit.push(lijn);
  }
  const nr = document.createElement("div");
  nr.className = "av-rapport-nummer";
  nr.textContent = String(nummer);
  nr.style.right = `${maten.marge.rechts}mm`;
  nr.style.height = `${maten.marge.onder}mm`;
  uit.push(nr);
  return uit;
}

/**
 * Afdrukvoorbeeld als paneel in de applicatie.
 *
 * De uitdraai wordt eerst op ware bladbreedte opgebouwd in een meetopstelling
 * buiten beeld. Daarna wordt hij opgemeten en in vellen verdeeld, en komen er
 * kopieën van de regels op losse A4-pagina's te staan. Kopieën, geen
 * verplaatsingen: de meetopstelling blijft van React, en die zou omvallen als
 * er nodes onder vandaan worden gehaald.
 *
 * Waarom niet gewoon de doorlopende uitdraai tonen: dan zie je niet waar het
 * papier ophoudt, en dat is juist wat je vooraf wilt weten.
 *
 * Twee soorten uitdraai: de losse bladen (loopkop en loopvoet) en het
 * constructierapport (de voet van het bureau en een paginanummer, geen
 * loopkop). Het verdelen is voor beide hetzelfde; de maten en de omlijsting
 * van een vel verschillen.
 */
export default function AfdrukVoorbeeld() {
  const uitdraai = useUitdraai();
  const { bladen, alleBladen, onderdeel, datum } = uitdraai;
  const soort = usePrintStore((s) => s.soort);
  const sluitVoorbeeld = usePrintStore((s) => s.sluitVoorbeeld);
  const afdrukken = usePrintStore((s) => s.afdrukken);
  const selectie = usePrintStore((s) => s.selectie);
  const kiesSelectie = usePrintStore((s) => s.kiesSelectie);
  // De keuzelijst kent twee soorten: het hele project, of één blad.
  const bereik = selectie && selectie.length === 1 ? selectie[0] : "project";

  const rapport = soort === "rapport";
  const maten: Maten = MATEN[soort];
  // Het bureau voor de voet van de rapportvellen. Het rapport, de gegevens en
  // de bladen zelf staan erbij om opnieuw te verdelen als het rapport
  // verandert zonder dat zijn hoogte dat doet (een tekst, een kleur).
  const bureau = useRapportBureau();
  const rapportGegevens = useProjectStore((s) => s.rapport);
  const gegevens = useProjectStore((s) => s.gegevens);
  const exemplaren = useProjectStore((s) => s.exemplaren);
  const voetafbeelding = bureau.voetafbeelding;
  const bureaunaam = bureau.naam;

  const meetRef = useRef<HTMLDivElement>(null);
  const vellenRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.75);
  const [aantal, setAantal] = useState(0);
  const [bezig, setBezig] = useState(true);

  // Kopregels per vel: dezelfde als de loopkop van de echte afdruk.
  const linksBoven = loopkopLinks(uitdraai);

  const bouwPaginas = useCallback(() => {
    const bron = meetRef.current;
    const host = vellenRef.current;
    if (!bron || !host) return;
    // Tijdens het printen verdwijnt de hoofdweergave, en daarmee dit paneel.
    // Meten levert dan overal nul op en de hele uitdraai zou op één pagina
    // belanden. Niets doen is beter: zodra het paneel terug is meet de
    // ResizeObserver opnieuw.
    if (bron.offsetHeight === 0) return;

    const mm = pxPerMm();
    // Elke sectie begint op een vers vel en wordt apart verdeeld, met een
    // eigen bladhoogte: een rekenblad (ook in bijlage A) rekent met de
    // speling, het rapport zelf staat op een vast raster en mag het vel tot en
    // met de laatste regel vullen, net als de referentie.
    const paginas = verdeelPerSectie(meetBlokken(bron), (sectie) =>
      (/\bprint-blad\b/.test(sectie) ? maten.inhoud.hoogte - SPELING : maten.inhoud.vulhoogte) * mm,
    );
    // De huisstijl van het rapport staat als CSS-variabelen op de wortel in de
    // meetopstelling. Een vel staat los van die wortel, dus krijgt hij ze mee.
    const huisstijl = rapport ? bron.querySelector<HTMLElement>(".rpa-wortel")?.style.cssText ?? "" : "";

    host.replaceChildren();
    paginas.forEach((pagina, i) => {
      const vel = document.createElement("div");
      vel.className = rapport ? "av-pagina print-opmaak rpa-wortel" : "av-pagina print-opmaak";
      if (huisstijl) vel.style.cssText = huisstijl;

      // De sectieklasse mee: de opmaakregels hangen eraan, en zonder die ouder
      // valt een losgeknipte regel terug op de schermopmaak.
      const inhoud = document.createElement("div");
      inhoud.className = `av-pagina-inhoud ${pagina[0]?.sectie ?? ""}`.trim();
      inhoud.style.top = `${maten.marge.boven}mm`;
      inhoud.style.left = `${maten.marge.links}mm`;
      inhoud.style.width = `${maten.inhoud.breedte}mm`;
      inhoud.style.height = `${maten.inhoud.hoogte}mm`;
      // Idem voor de wikkels waar de regels uit komen: de kern schrijft zijn
      // lettertype en regelafstand op `.ifc-calc`. Regels met dezelfde wikkels
      // gaan samen in één opgebouwde keten, zodat het er niet alleen goed
      // uitziet maar ook precies zo hoog blijft als bij het meten.
      let doel = inhoud;
      let vorigeWikkels = "";
      let eersteVanDezePagina = true;
      for (const blok of pagina) {
        const sleutel = blok.wikkels.join(" > ");
        if (sleutel !== vorigeWikkels) {
          doel = inhoud;
          for (const klasse of blok.wikkels) {
            const wikkel = document.createElement("div");
            wikkel.className = klasse;
            doel.appendChild(wikkel);
            doel = wikkel;
          }
          vorigeWikkels = sleutel;
        }
        const kloon = blok.el.cloneNode(true) as HTMLElement;
        // De bovenmarge van het eerste blok vervalt op een pagina-overgang. In
        // de doorlopende meting klapt die marge samen met die van het blok
        // erboven; bovenaan een vers vel is er niets om mee samen te klappen en
        // komt hij er als extra ruimte bij — genoeg om de onderste regel van
        // het vel af te duwen.
        if (eersteVanDezePagina) {
          kloon.style.marginTop = "0";
          eersteVanDezePagina = false;
        }
        doel.appendChild(kloon);
      }

      if (rapport) {
        // Geen loopkop: het rapport heeft alleen een voet.
        vel.append(inhoud, ...rapportVoet(i + 1, voetafbeelding, bureaunaam, maten));
      } else {
        const kop = document.createElement("div");
        kop.className = "av-loopkop";
        kop.innerHTML = "<span></span><span></span>";
        (kop.firstChild as HTMLElement).textContent = linksBoven;
        (kop.lastChild as HTMLElement).textContent = onderdeel ?? "";

        const voet = document.createElement("div");
        voet.className = "av-loopvoet";
        voet.innerHTML = "<span></span><span></span><span></span>";
        (voet.children[0] as HTMLElement).textContent = "Open Calculations Studio";
        (voet.children[1] as HTMLElement).textContent = `Pagina ${i + 1} van ${paginas.length}`;
        (voet.children[2] as HTMLElement).textContent = datum;

        vel.append(kop, inhoud, voet);
      }

      // Het nummer buiten het vel: het papier klemt af wat er niet op past, en
      // een bijschrift binnen die rand zou daar in meegaan.
      const nummer = document.createElement("div");
      nummer.className = "av-nummer";
      nummer.textContent = `Pagina ${i + 1} van ${paginas.length}`;

      const omhulsel = document.createElement("div");
      omhulsel.className = "av-vel";
      omhulsel.append(vel, nummer);
      host.appendChild(omhulsel);
    });

    setAantal(paginas.length);
    setBezig(false);
  }, [linksBoven, onderdeel, datum, rapport, maten, voetafbeelding, bureaunaam]);

  /*
   * Opnieuw verdelen zodra de opmaak verandert.
   *
   * De parametrische beelden meten hun eigen tekengebied en schalen zich pas
   * daarna; meteen verdelen zou op hoogtes gebeuren die een tel later niet meer
   * kloppen. Een ResizeObserver op de meetopstelling vangt elke wijziging op,
   * en een korte vertraging bundelt een reeks wijzigingen tot één verdeling.
   * Wat de hoogte niet verandert (een woord, een kleur) komt via de
   * afhankelijkheden binnen.
   *
   * Bewust geen requestAnimationFrame: dat staat volledig stil zodra het
   * venster niet zichtbaar is. Het voorbeeld zou dan blijven hangen op
   * "pagina's opmaken" tot de gebruiker terugkomt.
   */
  useEffect(() => {
    const bron = meetRef.current;
    if (!bron) return;
    setBezig(true);

    let timer = 0;
    const plan = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(bouwPaginas, 120);
    };

    const ro = new ResizeObserver(plan);
    ro.observe(bron);
    plan();

    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
    };
  }, [bouwPaginas, bladen, rapportGegevens, gegevens, exemplaren, bureau]);

  return (
    <div className="av-paneel">
      <div className="av-balk">
        <span className="av-titel">{rapport ? "Afdrukvoorbeeld rapport" : "Afdrukvoorbeeld"}</span>
        <span className="av-tel">
          {bezig ? "pagina's opmaken…" : `${aantal} pagina${aantal === 1 ? "" : "'s"}`}
        </span>
        {/* Het rapport kent geen bereik: het bevat altijd alle bladen. */}
        {!rapport && (
          <span className="av-bereik">
            <label htmlFor="av-bereik">Bereik</label>
            <select
              id="av-bereik"
              value={bereik}
              onChange={(e) => kiesSelectie(e.target.value === "project" ? null : [e.target.value])}
            >
              <option value="project">Hele project ({alleBladen.length} {alleBladen.length === 1 ? "blad" : "bladen"})</option>
              {alleBladen.map((ex) => (
                <option key={ex.id} value={ex.id}>Alleen: {ex.naam}</option>
              ))}
            </select>
          </span>
        )}
        <span className="av-rek" />
        <span className="av-zoom">
          <label htmlFor="av-zoom">Zoom</label>
          <select
            id="av-zoom"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
          >
            {ZOOMSTANDEN.map((z) => (
              <option key={z} value={z}>{Math.round(z * 100)}%</option>
            ))}
          </select>
        </span>
        <button className="av-primair" onClick={() => afdrukken()}>PDF / afdrukken…</button>
        <button onClick={sluitVoorbeeld}>Sluiten</button>
      </div>

      <div className="av-vellen">
        <div className="av-vellen-binnen" ref={vellenRef} style={{ zoom }} />
      </div>

      {/* De meetopstelling: buiten beeld, op de breedte van de bladspiegel van deze soort. */}
      <div
        className="av-meet print-opmaak"
        ref={meetRef}
        aria-hidden="true"
        style={{ width: `${maten.inhoud.breedte}mm` }}
      >
        {rapport ? <RapportAfdruk /> : <UitdraaiInhoud uitdraai={uitdraai} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `AfdrukVoorbeeld.css` — bladspiegel per soort (regels 107–108)**

Oud:

```css
.av-pagina-inhoud {
  position: absolute;
```

Nieuw:

```css
/* Plaats en maat van de bladspiegel zet de weergave per vel uit
   paginering.MATEN (bladen en rapport verschillen); deze waarden zijn die
   van de bladen. */
.av-pagina-inhoud {
  position: absolute;
```

- [ ] **Step 3: `AfdrukVoorbeeld.css` — de voet van de rapportvellen (na regel 196)**

Oud (einde van het bestand):

```css
.av-meet {
  position: absolute;
  left: -20000px;
  top: 0;
  width: 178mm;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  font-size: 10.5pt;
  line-height: 1.45;
  color: #000;
  background: #fff;
}
```

Nieuw:

```css
.av-meet {
  position: absolute;
  left: -20000px;
  top: 0;
  /* De breedte van de bladspiegel; per soort inline gezet uit paginering.MATEN. */
  width: 178mm;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  font-size: 10.5pt;
  line-height: 1.45;
  color: #000;
  background: #fff;
}

/* ─── Vellen van het rapport ──────────────────────────────────── */

/*
 * Het rapport heeft geen loopkop, alleen een voet: de voetafbeelding van het
 * bureau over de volle breedte in de ondermarge, en rechts het paginanummer
 * midden in die marge. Hoogte, marges en afbeelding zet de weergave per vel
 * (uit paginering.MATEN en het bureauprofiel), gelijk aan @page rapport.
 */
.av-rapport-voet {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  object-fit: contain;
  object-position: center bottom;
}

/* Zonder voetafbeelding: een dunne lijn met de bureaunaam, zoals in de echte afdruk. */
.av-rapport-lijn {
  position: absolute;
  bottom: 11mm;
  padding-top: 3pt;
  border-top: 0.5pt solid #9ca3af;
  font-family: var(--rpa-font);
  font-size: 8pt;
  line-height: 1.2;
  color: #6b6b73;
}

.av-rapport-nummer {
  position: absolute;
  bottom: 0;
  display: flex;
  align-items: center;
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  font-size: 10pt;
  line-height: normal;
  color: #000;
}
```

- [ ] **Step 4: Typecheck en controles**

Run: `npx tsc --noEmit -p packages/desktop`
Verwacht: geen uitvoer, exitcode 0.

Run: `node scripts/check-paginering.mjs`
Verwacht: exitcode 0.

- [ ] **Step 5: Controle in het Browser-paneel (http://localhost:3021)**

Opzet (neutrale voorbeelddata; in een browser zonder Tauri blijft het bureauprofiel alleen in het geheugen):
1. Lint **Start → Module**: voeg **Boutberekening** en **Kruipfactor** toe (als ze er nog niet staan).
2. **Projectgegevens**: Projectnummer `1234`, Projectnaam `Voorbeeldproject`, Opdrachtgever
   `Voorbeeld B.V.`, Locatie `Voorbeeldstad`; windgebied en terreincategorie op II laten.
3. **Instellingen → Bureau**: naam `Voorbeeld Ingenieurs`, constructeur `Ir. A. Voorbeeld`; opslaan.
4. Knoop **Rapport**, tab **Rapport**: adresregels opdrachtgever `Voorbeeldstraat 1` en
   `1234 AB Voorbeeldstad`; verantwoordelijk en uitvoerend `Ir. A. Voorbeeld`; bij Belastingen
   gebouwhoogte `9`; onder "Vloer, daken" een vlakopbouw `Dak` met lagen p = `0,48`, `0,07`,
   `0,15`; onder "Wanden" een gevelopbouw `Gevel` met lagen (p, h, vulling) `2,00`/`3,00`/`90%`,
   `2,00`/`3,00`/`90%`, `0,75`/`3,00`/`10%`.
5. Tab **Afdrukvoorbeeld** (naast Rapport), zoom **100%**.

Verwacht:
- Werkbalk: "Afdrukvoorbeeld rapport", geen keuzelijst **Bereik**, "N pagina's".
- **Vel 1, voorblad**: geen loopkop; titel "Constructieadvies & berekeningen" groot in de
  hoofdkleur, daaronder "Voorbeeldproject" in de accentkleur; halverwege "Project" en
  "1234 - Voorbeeldproject"; "In opdracht van" met drie regels; daaronder de labels in vet
  accent (Adviseur "Voorbeeld Ingenieurs", …, 1ᵉ Datum rapport met de datum van vandaag,
  ingesprongen "Datum wijz.") met lijnen eronder; twee lege regels; Fase, Rapportstatus
  "Concept", Documentkenmerk. Onderaan links een dunne lijn met "Voorbeeld Ingenieurs",
  rechtsonder "1".
- **Vel 2, Inhoud**: hoofdstukken vet in de accentkleur met een lege regel ertussen, paragrafen
  zwart, onderaan "Bijlage A  Uitgebreide uitwerking berekeningen".
- **Vel 3**: "1 Inleiding" en direct daarna (zelfde vel) "2 Projectgegevens" met 2.1 en 2.2;
  bij 2.2 "Rol van Voorbeeld Ingenieurs in dit project:" en rechts "Hoofdconstructeur".
- **H3** op een nieuw vel; **H4** op een nieuw vel met ingesprongen tabellen: 4.1 met CC2, RC2,
  β 3,8, K_FI 1,00, DSL2, IL2 en rechts cursieve tabelverwijzingen; 4.3 met donkere kopregel
  en de tabel bevestigingsmiddelen rechts naast de derde materiaalregel; 4.5 met γ-koppen en
  ψ met onderschrift.
- **H5** op een nieuw vel: 5.1 "plat dak 0,56 [kN/m²]"; 5.2 q_p 0,82 en bij c = 0,40
  P_rep 0,33; 5.4 met de verwijzing "6.3.1.2 NEN-EN 1991-1-1" rechts boven de eerste klasse;
  5.5 met de kop VLOER, DAKEN (donker vlak, lijn erboven), de opbouw Dak met "+" en som
  0,70 [kN/m²]. **WANDEN** begint op een eigen vel met een lege regel en een lijn bovenaan;
  de gevel met 90% / 10%, q 5,40 / 5,40 / 0,23 en som 11,03 [kN/m¹].
- **H6** op een nieuw vel: "Inhoudsopgave" met 6.1 en 6.2 onderstreept, dan per blad een kop in
  de accentkleur met een lijn, de samenvatting "… — UC x,xx, voldoet." en "Zie bijlage A.1.".
- Daarna een vel "Bijlage A Uitgebreide uitwerking berekeningen" en per blad een vel met de
  bladkop "A.1"/"A.2", het parametrische beeld en de uitwerking.
- Voer in de console van het Browser-paneel uit (zoom 100%):

```js
(() => {
  const pt = 72 / 96;
  const vellen = [...document.querySelectorAll(".av-vellen .av-pagina")];
  const maat = (vel, el, kant) =>
    Math.round((el.getBoundingClientRect()[kant] - vel.getBoundingClientRect().top) * pt * 10) / 10;
  const voorblad = vellen[0];
  const project = [...voorblad.querySelectorAll(".rpa-rij")].find((r) => r.textContent.startsWith("Project"));
  const inleiding = vellen[2];
  const h1 = inleiding.querySelector(".rpa-h1");
  return {
    vellen: vellen.length,
    projectBoven: maat(voorblad, project, "top"),
    h1Onder: maat(inleiding, h1, "bottom"),
    h1Grootte: getComputedStyle(h1).fontSize,
    nummerVel3: inleiding.querySelector(".av-rapport-nummer")?.textContent,
  };
})()
```

  Verwacht: `projectBoven` 318,1 (±0,3), `h1Onder` 93,5 (±0,3), `h1Grootte` "32px", `nummerVel3` "3".
- Zoom 50% en 150%: de vellen schalen mee, het aantal pagina's blijft gelijk.
- Tab **Rapport**, wijzig één woord in Inleiding, terug naar **Afdrukvoorbeeld**: het nieuwe woord
  staat op vel 3.
- **Instellingen → Bureau**: kies als voetafbeelding een brede PNG of JPEG (bijv. 2480 × 234 px,
  < 500 kB). Elk rapportvel toont hem onderaan over de volle breedte; het paginanummer staat
  erboven, rechts.
- Open het blad Boutberekening en de tab **Afdrukvoorbeeld** van dat blad: weer de bladenweergave
  (loopkop, loopvoet "Pagina 1 van …", keuzelijst Bereik) zoals vóór deze taak.

- [ ] **Step 6: Commit**

```bash
git add packages/desktop/src/components/calc/AfdrukVoorbeeld.tsx packages/desktop/src/components/calc/AfdrukVoorbeeld.css
git commit -m "feat(afdruk): afdrukvoorbeeld van het rapport" -m "In de stand rapport meet het voorbeeld <RapportAfdruk /> op de bladspiegel van het rapport, verdeelt per sectie en zet op elk vel de huisstijl, de voet van het bureau en het paginanummer, zonder loopkop." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 32: Het rapport afdrukken

**Files:**
- Modify: `packages/desktop/src/components/calc/PrintDocument.tsx` (na Task 22: imports bovenaan,
  het begin van `useUitdraai`, en de functie `PrintDocument` onderaan)

**Interfaces:**
- Consumes: `usePrintStore` met `soort`; `RapportAfdruk` (Task 30).
- Produces: `export default function PrintDocument()` rendert bij `soort === "rapport"`
  `div.print-root.print-opmaak > <RapportAfdruk />` (geen loopkop, loopvoet of
  `UitdraaiInhoud`), anders de bladen zoals voorheen. `useUitdraai()` geeft in de stand `rapport`
  een lege lijst `bladen`.

- [ ] **Step 1: Sluit eerst een geopend afdrukvoorbeeld**

In het Browser-paneel en het Tauri-venster: kies de tab **Rapport** (of een blad) zodat er geen
afdrukvoorbeeld open staat. `useUitdraai` krijgt een hook erbij; een geopend voorbeeld zou bij de
hot-update anders een hook-foutmelding kunnen geven.

- [ ] **Step 2: Import van de rapportafdruk**

Oud:

```tsx
import { Oordeel, PrintBlad } from "./PrintBlad";
import "./PrintDocument.css";
```

Nieuw:

```tsx
import { Oordeel, PrintBlad } from "./PrintBlad";
import RapportAfdruk from "../rapport/afdruk/RapportAfdruk";
import "./PrintDocument.css";
```

- [ ] **Step 3: `useUitdraai` rekent niets door in de stand rapport**

Oud:

```tsx
  const selectie = usePrintStore((s) => s.selectie);

  zorgVoorKernstijlen();

  const bladen = useMemo(() => {
    const scope = projectScope(gegevens);
    // Een selectie met alleen verdwenen bladen valt terug op het hele project.
    const gekozen = selectie ? exemplaren.filter((e) => selectie.includes(e.id)) : exemplaren;
    return (gekozen.length ? gekozen : exemplaren).map((ex) => ({ ex, ...rekenBladDoor(ex, scope) }));
  }, [exemplaren, gegevens, selectie]);
```

Nieuw:

```tsx
  const selectie = usePrintStore((s) => s.selectie);
  const soort = usePrintStore((s) => s.soort);

  zorgVoorKernstijlen();

  const bladen = useMemo(() => {
    // Het rapport rekent zijn bladen zelf door: allemaal, los van de selectie
    // (useRapportWeergave). Het afdrukvoorbeeld roept deze hook ook in die
    // stand aan; alles hier nog eens doorrekenen zou dubbel werk zijn.
    if (soort === "rapport") return [];
    const scope = projectScope(gegevens);
    // Een selectie met alleen verdwenen bladen valt terug op het hele project.
    const gekozen = selectie ? exemplaren.filter((e) => selectie.includes(e.id)) : exemplaren;
    return (gekozen.length ? gekozen : exemplaren).map((ex) => ({ ex, ...rekenBladDoor(ex, scope) }));
  }, [exemplaren, gegevens, selectie, soort]);
```

- [ ] **Step 4: `PrintDocument` kiest tussen rapport en bladen**

Oud:

```tsx
/**
 * De gekozen bladen als één afdrukbaar document.
 *
 * Waarom via de browser en niet via de rapportengine: die levert alleen
 * rekentabellen — geen koppen, geen proza, geen variabelenamen en geen
 * tekeningen (zie docs/backlog.md, punt 4). Hier printen we exact wat de
 * uitwerking toont, plus het parametrische beeld dat de app zelf tekent.
 */
export default function PrintDocument() {
  const uitdraai = useUitdraai();
  const { datum, onderdeel } = uitdraai;
```

Nieuw:

```tsx
/**
 * De afdruk: het constructierapport of de gekozen bladen, naar de soort in de
 * printstore. Twee losse componenten, zodat de stand die niet gedrukt wordt
 * ook niets doorrekent.
 */
export default function PrintDocument() {
  const soort = usePrintStore((s) => s.soort);
  return soort === "rapport" ? <RapportDocument /> : <BladenDocument />;
}

/**
 * Het constructierapport: eigen paginamaten (`@page rapport`), de voet van het
 * bureau en het paginanummer rechtsonder, geen loopkop. Het rapport begint
 * bij pagina 1.
 */
function RapportDocument() {
  return (
    <div className="print-root print-opmaak" aria-hidden="true">
      <RapportAfdruk />
    </div>
  );
}

/**
 * De gekozen bladen als één afdrukbaar document.
 *
 * Waarom via de browser en niet via de rapportengine: die levert alleen
 * rekentabellen — geen koppen, geen proza, geen variabelenamen en geen
 * tekeningen (zie docs/backlog.md, punt 4). Hier printen we exact wat de
 * uitwerking toont, plus het parametrische beeld dat de app zelf tekent.
 */
function BladenDocument() {
  const uitdraai = useUitdraai();
  const { datum, onderdeel } = uitdraai;
```

- [ ] **Step 5: Typecheck en controles**

Run: `npx tsc --noEmit -p packages/desktop`
Verwacht: geen uitvoer, exitcode 0.

Run: `node scripts/check-paginering.mjs`
Verwacht: exitcode 0.

- [ ] **Step 6: Controle van de echte afdruk**

In het Tauri-venster (of in Edge/Chrome op http://localhost:3021 met de opzet van Task 31, stap 5):
1. Open een project met rapport en minstens twee bladen. Lint **Rapport (PDF)**.
2. De printdialoog opent met een afdrukvoorbeeld. Verwacht:
   - Vel 1 is het voorblad; geen loopkop, geen "Pagina 1 van n" in het midden; rechtsonder "1".
   - Elk vel heeft onderaan de voet (lijn met bureaunaam, of de voetafbeelding over de volle
     breedte); paginanummers lopen door tot en met bijlage A.
   - Het aantal pagina's is gelijk aan dat van het afdrukvoorbeeld in de app (bijlage A mag
     één pagina verschillen; die verdeelt Chromium zelf).
   - De donkere en lichte kopregels van de tabellen zijn gevuld, ook met "Achtergrondafbeeldingen"
     uit.
   - Inhoud van H4 en H5 springt ongeveer 19 mm in ten opzichte van de paragraafkoppen.
3. Kies "Opslaan als PDF" (of "Microsoft Print to PDF") en open de PDF: papierformaat A4.
4. **Paginanummer en voetafbeelding**: met een voetafbeelding moet het nummer rechtsonder
   zichtbaar zijn. Valt het onder de (witte) rechterkant van de afbeelding, pas dan
   `RapportAfdruk.css` aan zodat de afbeelding vóór de nummerhoek ophoudt:

   Oud:
   ```css
   html.afdrukmodus .rpa-wortel .rpa-voet {
     display: block;
     position: fixed;
     left: -9.85mm;
     bottom: -19.8mm;
     width: 210mm;
     height: 19.8mm;
   }

   .rpa-wortel .rpa-voet-beeld {
     display: block;
     width: 100%;
     height: 100%;
     object-fit: contain;
     object-position: center bottom;
   }
   ```
   Nieuw:
   ```css
   /* De afbeelding houdt op vóór de hoek met het paginanummer: de
      paginamarge wordt onder het document getekend, en de witte rechterkant
      van een voetafbeelding dekte het nummer af. */
   html.afdrukmodus .rpa-wortel .rpa-voet {
     display: block;
     position: fixed;
     left: -9.85mm;
     bottom: -19.8mm;
     width: 194mm;
     height: 19.8mm;
   }

   .rpa-wortel .rpa-voet-beeld {
     display: block;
     width: 100%;
     height: 100%;
     object-fit: cover;
     object-position: left bottom;
   }
   ```
   en neem `packages/desktop/src/components/rapport/afdruk/RapportAfdruk.css` mee in de commit hieronder.
5. Open een blad en kies **PDF blad** in het lint: de losse berekening zoals vóór dit deel —
   loopkop, projectregel, "Pagina 1 van 1" onderaan in het midden.

- [ ] **Step 7: Commit**

```bash
git add packages/desktop/src/components/calc/PrintDocument.tsx packages/desktop/src/components/rapport/afdruk/RapportAfdruk.css
git commit -m "feat(afdruk): rapport afdrukken met eigen paginamaten en paginanummer" -m "PrintDocument rendert in de stand rapport alleen <RapportAfdruk />: de named page rapport zet de marges van de referentie en het paginanummer rechtsonder, de voet van het bureau staat vast in de ondermarge. useUitdraai rekent in die stand niets dubbel door." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Deel: Verificatie

Dit deel levert het gereedschap om het rapport zonder printdialoog als PDF te maken, een
fictief voorbeeldproject als rooktest, de lokale vergelijking met de referentie-PDF en de
documentatie. Het bouwt voort op alle eerdere taken: de rapportmodules in
`packages/desktop/src/rapport/`, het veld `rapport` met `werkRapportBij` in de projectstore,
`store/bureauProfiel.ts`, `printStore.afdrukken(selectie?, soort?)`, de dev-haak `window.__ocs`
in `main.tsx` (Task 21) en de afdruk met de wortel `.rpa-wortel` binnen `.print-root`.

Alle commando's draaien in Git Bash vanuit de repo-root
(`C:/Users/rickd/Documents/GitHub/Ifc-Calc/.claude/worktrees/practical-mcclintock-34d234`).
Twee variabelen worden in meerdere taken gebruikt (zet ze opnieuw in elke nieuwe shell):

```bash
RR="C:/Users/rickd/AppData/Local/Temp/claude/C--Users-rickd-Documents-GitHub-Ifc-Calc--claude-worktrees-practical-mcclintock-34d234/aa700bf5-9015-452a-8266-296043cdadd1/scratchpad/rapport-ref"
TMP="$(node -p "require('os').tmpdir()")"
```

`$RR` ligt buiten de repo. Alles wat daar staat of ontstaat (referentie-spreadsheet,
referentie-PDF, verificatieproject, vergelijkingsscript, vergelijkings-PDF) wordt nooit
gecommit. `packages/desktop/.gitignore` heeft een vreemde wijziging en blijft in elke taak
ongestaged.

Voorwaarden voor Task 34 en 36: de dev-server draait (`npm --prefix packages/desktop run dev`,
poort 3021) en de core is gebouwd (`npm --prefix packages/core run build`).

---

### Task 33: Fictief voorbeeldproject met generator

Een verzonnen project als rooktest voor `rapport-pdf.mjs`. Het bestand wordt gemaakt door een
script dat de rekenteksten rechtstreeks uit `src/templates` en de standaardwaarden uit
`src/rapport` haalt, zodat het voorbeeld na een wijziging daar met één commando weer klopt.
`--controleer` faalt als het bestand ontbreekt of verouderd is, als `normaliseerRapport` er
iets aan verandert (dan klopt een veldnaam niet), of als de sommen van de opbouwen afwijken.

Keuzes die niet in het contract staan:
- vaste datum `01-09-2026`, zodat het bestand niet elke dag verandert;
- exemplaar-ids `ex-voorbeeld-balklaag` en `ex-voorbeeld-spuwer`;
- het veld `source` (de rekentekst van het eerste blad voor lezers die één blad verwachten)
  ontbreekt: `leesProjectBestand` gebruikt alleen `project`;
- vulling in een gevelopbouw staat als percentage zoals de gebruiker het typt: `"90%"`.
  `leesVulling` in `rapport/opbouw.ts` (Task 3) leest "90%", "90" en "0,9", en `regels[i]` hoort
  bij `lagen[i]`; de generator controleert de som 11,03.

**Files:**
- Create: `scripts/maak-rapport-voorbeeld.mjs`
- Create (gegenereerd): `scripts/fixtures/rapport-voorbeeld.ifccalculation`

**Interfaces:**
- Consumes:
  - `standaardRapport(vandaag: string, teksten: Record<string, string>): Rapport`, `normaliseerRapport(x: unknown, vandaag: string, teksten: Record<string, string>): Rapport`, `leegBureau(): BureauProfiel` uit `packages/desktop/src/rapport/model.ts`
  - `standaardTeksten(): Record<string, string>` uit `rapport/standaardteksten.ts`
  - `vlakOpbouw(lagen: Laag[]): { regels: VlakRegel[]; som: number }`, `gevelOpbouw(lagen: Gevellaag[]): { regels: GevelRegel[]; som: number }` uit `rapport/opbouw.ts`
  - `rond(v: number, dec: number): number` uit `rapport/normwaarden.ts`
  - `legeGegevens(): ProjectGegevens` uit `store/projectGegevens.ts`
  - `balklaag`, `spuwer` (strings) uit `templates/balklaag.ts`, `templates/spuwer.ts`
  - `PROJECT_FORMAAT_VERSIE` uit `store/projectBestand.ts` (gelezen met een reguliere expressie; dat bestand laadt niet in Node)
- Produces:
  - `node scripts/maak-rapport-voorbeeld.mjs [--controleer]` — exitcode 0 bij succes, 1 met regels `FOUT  …` op stderr.
  - `scripts/fixtures/rapport-voorbeeld.ifccalculation` — `{ "project": { versie, naam: "Voorbeeldproject", gegevens, exemplaren: [2], rapport } }`.

- [ ] **Step 1: Schrijf de generator**

Create `scripts/maak-rapport-voorbeeld.mjs`:

```js
/**
 * Maakt scripts/fixtures/rapport-voorbeeld.ifccalculation: een verzonnen
 * project waarmee scripts/rapport-pdf.mjs als rooktest een volledig rapport
 * afdrukt.
 *
 * Alles is fictief: geen bestaand bureau, geen personen, geen echt project.
 * De rekenteksten van de twee bladen komen rechtstreeks uit src/templates en
 * de standaardwaarden uit src/rapport. Verandert een van beide, dan maakt één
 * commando het voorbeeld weer passend; `--controleer` meldt of dat nodig is.
 *
 * Het voorbeeld raakt bewust de randen van de opmaak:
 *   • nieuwbouw: de bestaande situatie (3.1 en 4.6) valt weg, net als de
 *     blokken "Bestaande situatie" en "Verbouw, renovatie" in 3.2;
 *   • twee revisies (A en B);
 *   • een invulveld en opsommingsregels in de projectomschrijving;
 *   • vlak- en gevelopbouwen met de getallen uit scripts/check-rapport.mjs,
 *     zodat de sommen in de afdruk bekend zijn (0,70 · 0,60 · 11,03);
 *   • één blad in hoofdstuk 6 zelf, één in bijlage A, en een eigen bijlage B;
 *   • geen voetafbeelding: de voet valt terug op een lijn met de bureaunaam.
 *
 * Draaien:      node scripts/maak-rapport-voorbeeld.mjs
 * Controleren:  node scripts/maak-rapport-voorbeeld.mjs --controleer
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { balklaag } from "../packages/desktop/src/templates/balklaag.ts";
import { spuwer } from "../packages/desktop/src/templates/spuwer.ts";
import { legeGegevens } from "../packages/desktop/src/store/projectGegevens.ts";
import { leegBureau, normaliseerRapport, standaardRapport } from "../packages/desktop/src/rapport/model.ts";
import { standaardTeksten } from "../packages/desktop/src/rapport/standaardteksten.ts";
import { gevelOpbouw, vlakOpbouw } from "../packages/desktop/src/rapport/opbouw.ts";
import { rond } from "../packages/desktop/src/rapport/normwaarden.ts";

const hier = dirname(fileURLToPath(import.meta.url));
const REPO = join(hier, "..");
const DOEL = join(hier, "fixtures", "rapport-voorbeeld.ifccalculation");
const NAAM = relative(REPO, DOEL).replaceAll("\\", "/");

/** Vast, zodat het bestand niet elke dag verandert. */
const DATUM = "01-09-2026";
const BALKLAAG_ID = "ex-voorbeeld-balklaag";
const SPUWER_ID = "ex-voorbeeld-spuwer";

/** De sommen die de afdruk moet tonen (zelfde getallen als scripts/check-rapport.mjs). */
const VERWACHTE_SOMMEN = { Dak: 0.7, Verdiepingsvloer: 0.6, Gevel: 11.03 };

/** Leest het versienummer uit store/projectBestand.ts; dat bestand zelf laadt niet in Node. */
function formaatVersie() {
  const bron = readFileSync(join(REPO, "packages/desktop/src/store/projectBestand.ts"), "utf8");
  const m = bron.match(/export const PROJECT_FORMAAT_VERSIE = (\d+);/);
  if (!m) throw new Error("PROJECT_FORMAAT_VERSIE niet gevonden in packages/desktop/src/store/projectBestand.ts");
  return Number(m[1]);
}

function bouwProject() {
  const gegevens = {
    ...legeGegevens(),
    project_nummer: "2026-001",
    project_naam: "Voorbeeldproject",
    opdrachtgever: "Voorbeeldopdrachtgever B.V.",
    constructeur: "Ir. A. Voorbeeld",
    locatie: "Voorbeeldstad",
    CC: "2",
    RC: "2",
    DesignLife: "50",
    windgebied: "2",
    terreincategorie: "3",
  };

  const exemplaren = [
    { id: BALKLAAG_ID, naam: "Balklaag verdiepingsvloer", templateId: "balklaag", source: balklaag, waarden: {}, elementen: [] },
    { id: SPUWER_ID, naam: "Spuwer dakrand", templateId: "spuwer", source: spuwer, waarden: {}, elementen: [] },
  ];

  const rapport = standaardRapport(DATUM, standaardTeksten());
  rapport.kenmerk = "VB-2026-001";
  rapport.fase = "DO";
  rapport.opdrachtgeverAdres = "Voorbeeldstraat 1\n1234 AB Voorbeeldstad";
  rapport.verantwoordelijk = "Ir. A. Voorbeeld";
  rapport.uitvoerend = "Ing. B. Voorbeeld";
  rapport.revisies = [
    { code: "A", datum: DATUM, omschrijving: "Eerste uitgave", status: "concept" },
    { code: "B", datum: "15-09-2026", omschrijving: "Opmerkingen opdrachtgever verwerkt", status: "ter goedkeuring" },
  ];
  rapport.teksten = {
    ...rapport.teksten,
    projectomschrijving:
      "Het project {projectnaam} omvat de nieuwbouw van een vrijstaande woning met een plat dak.\n" +
      "\n" +
      "-fundering op staal;\n" +
      "-dragende wanden van kalkzandsteen;\n" +
      "-houten balklaag als verdiepingsvloer.",
    belendingen: "Er staan geen bouwwerken binnen de invloedssfeer van de nieuwe fundering.",
    "uitvoering-nieuwbouw":
      "-Maatvoering in het werk controleren.\n" +
      "-Wapening laten keuren voor het storten.",
  };
  rapport.rol = { rol: "Hoofdconstructeur", architect: "Voorbeeldarchitecten", datumOnderlegger: "25-08-2026" };
  rapport.uitgangspunten.brand = { hoofddraagconstructie: "30", brandscheiding: "-", vluchtroute: "-", verwijzing: "" };
  rapport.belastingen.wind = { ...rapport.belastingen.wind, gebouwhoogte: "9" };
  rapport.belastingen.vloerenDaken = [
    {
      soort: "vlak",
      naam: "Dak",
      lagen: [
        { naam: "dakpannen", d: "", rho: "", p: "0,48" },
        { naam: "dakplaten", d: "", rho: "", p: "0,07" },
        { naam: "gordingen", d: "", rho: "", p: "0,15" },
      ],
    },
    {
      soort: "vlak",
      naam: "Verdiepingsvloer",
      lagen: [
        { naam: "vloerafwerking", d: "", rho: "", p: "0,30" },
        { naam: "beschot", d: "0,02", rho: "4,0", p: "" },
        { naam: "balklaag", d: "", rho: "", p: "0,08" },
        { naam: "plafond", d: "0,015", rho: "9,0", p: "" },
      ],
    },
  ];
  rapport.belastingen.wanden = [
    {
      soort: "gevel",
      naam: "Gevel",
      lagen: [
        { naam: "metselwerk buitenblad", p: "2,00", h: "3,00", vulling: "90%" },
        { naam: "metselwerk binnenblad", p: "2,00", h: "3,00", vulling: "90%" },
        { naam: "kozijnen", p: "0,75", h: "3,00", vulling: "10%" },
      ],
    },
  ];
  rapport.toelichting = {
    [BALKLAAG_ID]: "Houten balklaag van de verdiepingsvloer, hart op hart 600 mm, opgelegd op de dragende wanden.",
    [SPUWER_ID]: "Noodoverlaat in de dakrand van het platte dak.",
  };
  rapport.inHoofdstuk = { [SPUWER_ID]: true };
  rapport.bijlagen = ["Constructieoverzicht"];
  rapport.bureau = {
    ...leegBureau(),
    naam: "Voorbeeldbureau B.V.",
    adres: "Voorbeeldlaan 10",
    postcode: "1234 AB",
    plaats: "Voorbeeldstad",
    telefoon: "010-000 00 00",
    email: "info@voorbeeldbureau.example",
    constructeurs: [
      { naam: "Ir. A. Voorbeeld", telefoon: "010-000 00 01", email: "a.voorbeeld@voorbeeldbureau.example" },
      { naam: "Ing. B. Voorbeeld", telefoon: "010-000 00 02", email: "b.voorbeeld@voorbeeldbureau.example" },
    ],
  };

  // Zelfde vorm als bouwProjectBestand() in store/projectBestand.ts, zonder
  // IFCX-inhoud en zonder `source` (de rekentekst van het eerste blad voor
  // lezers die één blad verwachten): bij het openen telt alleen `project`.
  return { project: { versie: formaatVersie(), naam: gegevens.project_naam, gegevens, exemplaren, rapport } };
}

/** Paden waarop twee waarden verschillen, als leesbare regels. */
function verschillen(a, b, pad) {
  if (isDeepStrictEqual(a, b)) return [];
  if (a && b && typeof a === "object" && typeof b === "object" && Array.isArray(a) === Array.isArray(b)) {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => verschillen(a[k], b[k], `${pad}.${k}`));
  }
  return [`${pad}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`];
}

/** Het voorbeeld moet de normalisatie ongeschonden doorstaan en de bekende sommen geven. */
function controleerInhoud(doc) {
  const fouten = [];
  const { rapport } = doc.project;
  // Zoals na opslaan en openen: via JSON, en normaliseerRapport krijgt zijn eigen kopie.
  const gelezen = JSON.parse(JSON.stringify(rapport));
  const genormaliseerd = normaliseerRapport(JSON.parse(JSON.stringify(rapport)), DATUM, standaardTeksten());
  for (const v of verschillen(gelezen, genormaliseerd, "rapport")) fouten.push(`normaliseerRapport verandert ${v}`);
  for (const o of [...rapport.belastingen.vloerenDaken, ...rapport.belastingen.wanden]) {
    const som = rond((o.soort === "vlak" ? vlakOpbouw(o.lagen) : gevelOpbouw(o.lagen)).som, 2);
    if (som !== VERWACHTE_SOMMEN[o.naam]) fouten.push(`opbouw ${o.naam}: som ${som}, verwacht ${VERWACHTE_SOMMEN[o.naam]}`);
  }
  return fouten;
}

const controleer = process.argv.includes("--controleer");
const doc = bouwProject();
const tekst = JSON.stringify(doc, null, 2) + "\n";
const fouten = controleerInhoud(doc);
if (controleer) {
  if (!existsSync(DOEL)) fouten.push(`${NAAM} ontbreekt: draai node scripts/maak-rapport-voorbeeld.mjs`);
  // Git kan op Windows met CRLF uitchecken; de inhoud telt, niet het regeleinde.
  else if (readFileSync(DOEL, "utf8").replace(/\r\n/g, "\n") !== tekst) {
    fouten.push(`${NAAM} is verouderd: draai node scripts/maak-rapport-voorbeeld.mjs`);
  }
}
if (fouten.length) {
  for (const f of fouten) console.error(`FOUT  ${f}`);
  process.exit(1);
}
if (controleer) {
  console.log(`${NAAM} klopt`);
} else {
  mkdirSync(dirname(DOEL), { recursive: true });
  writeFileSync(DOEL, tekst);
  console.log(`geschreven: ${NAAM} (${doc.project.exemplaren.length} bladen, ${Math.round(Buffer.byteLength(tekst) / 1024)} kB)`);
}
```

- [ ] **Step 2: Draai de controle zonder voorbeeldbestand (moet falen)**

Run: `node scripts/maak-rapport-voorbeeld.mjs --controleer`
Verwacht: exitcode 1 en op stderr

```
FOUT  scripts/fixtures/rapport-voorbeeld.ifccalculation ontbreekt: draai node scripts/maak-rapport-voorbeeld.mjs
```

en géén andere `FOUT`-regels. Staat er een regel `normaliseerRapport verandert rapport.…`, dan
klopt een veldnaam of vorm in `bouwProject()` niet met `rapport/model.ts`: pas het voorbeeld aan
(niet `model.ts`) tot alleen de regel "ontbreekt" overblijft.

- [ ] **Step 3: Maak het voorbeeldbestand**

Run: `node scripts/maak-rapport-voorbeeld.mjs`
Verwacht: `geschreven: scripts/fixtures/rapport-voorbeeld.ifccalculation (2 bladen, 63 kB)`
(het aantal kB kan enkele kB afwijken), exitcode 0.

- [ ] **Step 4: Draai de controle opnieuw (moet slagen)**

Run: `node scripts/maak-rapport-voorbeeld.mjs --controleer`
Verwacht: `scripts/fixtures/rapport-voorbeeld.ifccalculation klopt`, exitcode 0.

- [ ] **Step 5: Commit**

```bash
git add scripts/maak-rapport-voorbeeld.mjs scripts/fixtures/rapport-voorbeeld.ifccalculation
git commit -m "$(cat <<'EOF'
test(rapport): fictief voorbeeldproject met generator als rooktest

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 34: `scripts/rapport-pdf.mjs` — headless PDF van het rapport

Start Chrome of Edge headless, stuurt die via het DevTools-protocol met de ingebouwde
WebSocket van Node (geen nieuwe afhankelijkheden), laadt het project via `window.__ocs`,
zet `klaar` en `window.print` op een no-op, roept `afdrukken(null, "rapport")` aan, wacht op
`#root`, de afdrukweergave, lettertypen, beelden, twee frames en 500 ms, en schrijft
`Page.printToPDF` als stroom (`ReturnAsStream` + `IO.read`) weg. Het tijdelijke
browserprofiel wordt altijd opgeruimd. De CDP-volgorde is dezelfde als in de werkende proef
(`cdp-probe.mjs`), inclusief de valkuilen uit `kaart-pdf.md`.

Keuzes die niet in het contract staan:
- extra optie `--browser <pad>`; standaard de eerste die bestaat van Chrome en Edge;
- het script wacht op `.print-root .rpa-wortel` als teken dat de rapportafdruk staat;
- `--bureau`: het profiel gaat via `werkRapportBij` over `rapport.bureau` heen
  (`{ ...r.bureau, ...profiel, huisstijl: { ...r.bureau.huisstijl, ...profiel.huisstijl } }`).

**Files:**
- Create: `scripts/rapport-pdf.mjs`

**Interfaces:**
- Consumes:
  - `window.__ocs.{useProjectStore, usePrintStore, leesProjectBestand}` (Task 21)
  - `useProjectStore.getState().laadProject(p)`, `.werkRapportBij(fn)`, `.rapport`, `.exemplaren`, `.projectNaam`
  - `usePrintStore.setState({ klaar })`, `usePrintStore.getState().afdrukken(null, "rapport")`
  - DOM: `#root`, `html.afdrukmodus`, `.print-root .rpa-wortel` met `section`-kinderen
- Produces:
  - `node scripts/rapport-pdf.mjs <projectbestand> <uit.pdf> [--bureau profiel.json] [--url http://localhost:3021] [--browser <pad>]`
  - exitcode 0 met de regel `PDF geschreven: <pad> (<n> pagina's, <k> kB)`; exitcode 1 met `rapport-pdf: <uitleg>` en eventueel `meldingen uit de pagina:` op stderr.

- [ ] **Step 1: Draai de rooktest zonder script (moet falen)**

```bash
node scripts/rapport-pdf.mjs scripts/fixtures/rapport-voorbeeld.ifccalculation "$TMP/rapport-voorbeeld.pdf"
```

Verwacht: exitcode 1 met `Error: Cannot find module '…\scripts\rapport-pdf.mjs'`.

- [ ] **Step 2: Schrijf het script**

Create `scripts/rapport-pdf.mjs`:

```js
/**
 * rapport-pdf — maakt zonder printdialoog een PDF van het constructierapport
 * van een projectbestand.
 *
 * Het script start een geïnstalleerde Chrome of Edge headless, stuurt die via
 * het DevTools-protocol aan (met de ingebouwde WebSocket van Node, dus zonder
 * extra afhankelijkheden), laadt het project in de draaiende dev-server en laat
 * de browser de afdruk als PDF wegschrijven. De PDF is daarmee precies wat
 * "Rapport (PDF)" in de app oplevert: dezelfde componenten, dezelfde CSS en
 * dezelfde paginering door Chromium.
 *
 * Gebruik:
 *   node scripts/rapport-pdf.mjs <projectbestand> <uit.pdf>
 *        [--bureau profiel.json] [--url http://localhost:3021] [--browser <pad>]
 *
 *   --bureau   een bureauprofiel (JSON in de vorm van BureauProfiel); komt in
 *              rapport.bureau, zodat huisstijl en voet van dat profiel gelden.
 *   --url      de dev-server; standaard http://localhost:3021.
 *   --browser  chrome.exe of msedge.exe; standaard de eerste die bestaat van
 *              Chrome en Edge op hun gewone installatieplek.
 *
 * Vereist:
 *   • een draaiende dev-server: npm --prefix packages/desktop run dev. Het script
 *     gebruikt de haak `window.__ocs` uit main.tsx, die alleen in dev bestaat.
 *   • een gebouwde core: npm --prefix packages/core run build. De app laadt
 *     packages/core/dist; zonder die map blijft de pagina leeg.
 *   • netwerk voor de lettertypen uit index.html, anders vallen ze terug.
 *
 * Valkuilen die het script afvangt:
 *   • Vite luistert alleen op ::1, dus localhost en niet 127.0.0.1. DevTools
 *     zelf luistert juist op 127.0.0.1.
 *   • De afdruk ruimt zichzelf op: App.tsx roept 250 ms na het starten
 *     window.print() aan en daarna klaar(), waarmee de afdrukweergave weer
 *     verdwijnt. Headless keert print() meteen terug. Daarom worden klaar en
 *     window.print eerst op een no-op gezet.
 *   • Een eigen import("/src/store/…") kan na een hot update een tweede
 *     store-exemplaar laden (met ?t=… in de URL) dat de app nooit leest. Via
 *     __ocs gebruikt het script de exemplaren die de app zelf gebruikt.
 *   • De headless pagina is een extra HMR-client: wijzig geen bronbestanden
 *     terwijl het script loopt, anders herlaadt Vite de pagina halverwege.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BROWSERS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];
const GEBRUIK =
  "gebruik: node scripts/rapport-pdf.mjs <projectbestand> <uit.pdf> " +
  "[--bureau profiel.json] [--url http://localhost:3021] [--browser <pad>]";

/** Een fout met een uitleg voor de gebruiker: gemeld zonder stacktrace. */
class Stop extends Error {}
const stop = (tekst) => {
  throw new Stop(tekst);
};
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (tekst) => console.log(`[${(performance.now() / 1000).toFixed(1)} s] ${tekst}`);

/** Meldingen uit de pagina (fouten, mislukte modules); ze helpen bij een lege app. */
const meldingen = [];

function leesArgumenten(argv) {
  const los = [];
  const opties = { bureau: null, url: "http://localhost:3021", browser: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") opties.help = true;
    else if (a === "--bureau" || a === "--url" || a === "--browser") {
      const w = argv[++i];
      if (w === undefined || w.startsWith("--")) stop(`${a} verwacht een waarde.\n${GEBRUIK}`);
      opties[a.slice(2)] = w;
    } else if (a.startsWith("--")) stop(`onbekende optie ${a}.\n${GEBRUIK}`);
    else los.push(a);
  }
  if (opties.help) return { ...opties, project: null, uit: null };
  if (los.length !== 2) stop(`verwacht een projectbestand en een uitvoerbestand.\n${GEBRUIK}`);
  return { ...opties, project: resolve(los[0]), uit: resolve(los[1]) };
}

/** Alles wat vóór het starten van een browser te controleren is. */
async function controleerVooraf(o) {
  if (!existsSync(o.project)) stop(`projectbestand ${o.project} bestaat niet.`);
  if (!existsSync(join(REPO, "packages/core/dist/index.js"))) {
    stop("packages/core/dist ontbreekt: bouw eerst de core met `npm --prefix packages/core run build`. " +
      "Zonder die map blijft de app leeg.");
  }
  const browser = o.browser ?? BROWSERS.find((p) => existsSync(p));
  if (!browser) stop(`geen Chrome of Edge gevonden op ${BROWSERS.join(" of ")}; geef er een op met --browser.`);
  if (!existsSync(browser)) stop(`--browser ${browser} bestaat niet.`);

  let url;
  try {
    url = new URL(o.url);
  } catch {
    stop(`--url ${o.url} is geen geldige URL.`);
  }
  let antwoord;
  try {
    antwoord = await fetch(url, { signal: AbortSignal.timeout(5000) });
  } catch {
    const tip = url.hostname === "127.0.0.1" ? " Vite luistert alleen op ::1; gebruik http://localhost:3021." : "";
    stop(`geen dev-server op ${url.href}: start hem met \`npm --prefix packages/desktop run dev\`.${tip}`);
  }
  const html = await antwoord.text();
  if (!antwoord.ok || !html.includes('id="root"')) stop(`${url.href} geeft geen app-pagina (status ${antwoord.status}).`);

  let bureau = null;
  if (o.bureau) {
    if (!existsSync(o.bureau)) stop(`--bureau ${o.bureau} bestaat niet.`);
    try {
      bureau = JSON.parse(readFileSync(o.bureau, "utf8"));
    } catch (e) {
      stop(`--bureau ${o.bureau} is geen geldige JSON: ${e.message}`);
    }
    if (!bureau || typeof bureau !== "object" || Array.isArray(bureau)) stop(`--bureau ${o.bureau} bevat geen profiel (object).`);
  }

  const raw = readFileSync(o.project, "utf8");
  try {
    if (!JSON.parse(raw).project) log(`let op: ${basename(o.project)} heeft geen "project"; de app opent het als los blad.`);
  } catch {
    log(`let op: ${basename(o.project)} is geen JSON; de app opent het als losse rekentekst.`);
  }
  return { browser, url: url.href, bureau, raw };
}

/** Start de browser met een eigen, tijdelijk profiel en een vrije debugpoort. */
function startBrowser(pad, profiel) {
  const proc = spawn(pad, [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profiel}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1280,900",
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  const b = { proc, stderr: "", fout: null, gestopt: false };
  proc.stderr.on("data", (d) => {
    b.stderr = (b.stderr + d).slice(-4000);
  });
  b.einde = new Promise((r) => {
    proc.on("exit", (code) => {
      b.gestopt = true;
      r(code);
    });
    proc.on("error", (e) => {
      b.fout = e;
      b.gestopt = true;
      r(null);
    });
  });
  return b;
}

/** De poort die de browser koos, uit <profiel>/DevToolsActivePort. */
async function debugPoort(b, profiel) {
  const bestand = join(profiel, "DevToolsActivePort");
  for (let i = 0; i < 150; i++) {
    if (b.fout) stop(`kan de browser niet starten: ${b.fout.message}`);
    if (b.gestopt) stop(`de browser stopte meteen.\n${b.stderr.trim()}`);
    if (existsSync(bestand)) {
      const poort = Number(readFileSync(bestand, "utf8").split(/\r?\n/)[0]);
      if (poort > 0) return poort;
    }
    await wacht(100);
  }
  stop(`de browser gaf binnen 15 s geen debugpoort.\n${b.stderr.trim()}`);
}

/** Minimale DevTools-client: commando's met antwoord, en luisteraars voor gebeurtenissen. */
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.volgende = 0;
    this.open = new Map();
    this.luisteraars = new Set();
    ws.addEventListener("message", (ev) => {
      const b = JSON.parse(typeof ev.data === "string" ? ev.data : Buffer.from(ev.data).toString("utf8"));
      if (b.id !== undefined) {
        const w = this.open.get(b.id);
        if (!w) return;
        this.open.delete(b.id);
        if (b.error) w.nee(new Stop(`${w.methode} mislukte: ${b.error.message}`));
        else w.ja(b.result);
      } else {
        for (const f of [...this.luisteraars]) f(b);
      }
    });
    ws.addEventListener("close", () => {
      for (const w of this.open.values()) w.nee(new Stop("de verbinding met de browser is verbroken."));
      this.open.clear();
    });
  }

  static async verbind(url) {
    const ws = new WebSocket(url);
    await new Promise((ja, nee) => {
      ws.addEventListener("open", ja, { once: true });
      ws.addEventListener("error", () => nee(new Stop(`geen verbinding met ${url}.`)), { once: true });
    });
    return new Cdp(ws);
  }

  stuur(methode, params = {}, sessionId) {
    const id = ++this.volgende;
    this.ws.send(JSON.stringify(sessionId ? { id, method: methode, params, sessionId } : { id, method: methode, params }));
    return new Promise((ja, nee) => this.open.set(id, { ja, nee, methode }));
  }

  wachtOp(filter, ms, wat) {
    return new Promise((ja, nee) => {
      const f = (b) => {
        if (!filter(b)) return;
        klaar();
        ja(b);
      };
      const t = setTimeout(() => {
        klaar();
        nee(new Stop(`${wat} bleef na ${ms / 1000} s uit.`));
      }, ms);
      const klaar = () => {
        clearTimeout(t);
        this.luisteraars.delete(f);
      };
      this.luisteraars.add(f);
    });
  }

  sluit() {
    try {
      this.ws.close();
    } catch {
      // al dicht
    }
  }
}

async function hoofd() {
  const o = leesArgumenten(process.argv.slice(2));
  if (o.help) {
    console.log(GEBRUIK);
    return;
  }
  const { browser: browserPad, url, bureau, raw } = await controleerVooraf(o);
  mkdirSync(dirname(o.uit), { recursive: true });

  const profiel = mkdtempSync(join(tmpdir(), "rapport-pdf-"));
  let browser = null;
  let cdp = null;
  try {
    browser = startBrowser(browserPad, profiel);
    const poort = await debugPoort(browser, profiel);
    const versie = await (await fetch(`http://127.0.0.1:${poort}/json/version`)).json();
    cdp = await Cdp.verbind(versie.webSocketDebuggerUrl);
    log(`${basename(browserPad)} gestart (${versie.Browser})`);

    // Eén tabblad, met een platte sessie: elk paginacommando draagt die sessionId.
    const { targetId } = await cdp.stuur("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.stuur("Target.attachToTarget", { targetId, flatten: true });
    const pagina = (methode, params) => cdp.stuur(methode, params, sessionId);
    cdp.luisteraars.add((b) => {
      if (b.sessionId !== sessionId) return;
      if (b.method === "Runtime.exceptionThrown") {
        const d = b.params.exceptionDetails;
        meldingen.push(`uitzondering: ${d.exception?.description ?? d.text}`);
      } else if (b.method === "Runtime.consoleAPICalled" && b.params.type === "error") {
        meldingen.push(`console.error: ${b.params.args.map((a) => a.value ?? a.description ?? "").join(" ")}`);
      } else if (b.method === "Log.entryAdded" && b.params.entry.level === "error") {
        // Een module die niet laadt (404) verschijnt alleen hier.
        const e = b.params.entry;
        meldingen.push(`${e.source}: ${e.text}${e.url ? ` (${e.url})` : ""}`);
      }
    });
    await pagina("Page.enable");
    await pagina("Runtime.enable");
    await pagina("Log.enable");

    const evalueer = async (expressie, wat) => {
      const r = await pagina("Runtime.evaluate", { expression: expressie, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) {
        stop(`${wat} mislukte in de pagina: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
      }
      return r.result.value;
    };
    const wachtTot = async (expressie, ms, fout) => {
      const tot = performance.now() + ms;
      while (performance.now() < tot) {
        if (await evalueer(expressie, "wachten")) return;
        await wacht(100);
      }
      stop(fout);
    };

    const geladen = cdp.wachtOp((b) => b.sessionId === sessionId && b.method === "Page.loadEventFired", 30000, "het laden van de app");
    const nav = await pagina("Page.navigate", { url });
    if (nav.errorText) stop(`${url} laden mislukte: ${nav.errorText}.`);
    await geladen;
    await wachtTot("(document.getElementById('root')?.childElementCount ?? 0) > 0", 20000,
      "de app verscheen niet (#root bleef leeg). Meestal ontbreekt packages/core/dist of laadt een module niet; zie de meldingen.");
    await wachtTot("typeof window.__ocs === 'object' && window.__ocs !== null", 5000,
      "window.__ocs ontbreekt. main.tsx zet die haak alleen in de dev-server (import.meta.env.DEV); " +
      "draait er een productie-build, of een versie van vóór de haak?");
    log("app geladen");

    const geladenProject = await evalueer(`(() => {
      const { useProjectStore, leesProjectBestand } = window.__ocs;
      useProjectStore.getState().laadProject(leesProjectBestand(${JSON.stringify(raw)}, ${JSON.stringify(basename(o.project, extname(o.project)))}));
      const bureau = ${JSON.stringify(bureau)};
      if (bureau) {
        // Het profiel wordt de vastgelegde kopie van dit rapport, net als
        // "Bijwerken uit bureauprofiel"; ontbrekende velden houden hun waarde.
        useProjectStore.getState().werkRapportBij((r) => ({
          ...r,
          bureau: { ...r.bureau, ...bureau, huisstijl: { ...r.bureau.huisstijl, ...(bureau.huisstijl ?? {}) } },
        }));
      }
      const s = useProjectStore.getState();
      return {
        naam: s.projectNaam,
        bladen: s.exemplaren.length,
        rapport: !!s.rapport && typeof s.rapport === "object",
        bureau: s.rapport?.bureau?.naam ?? "",
      };
    })()`, "het project laden");
    if (!geladenProject.rapport) stop("na het laden heeft het project geen rapport; heeft de dev-server de rapportstore al?");
    log(`project "${geladenProject.naam}" geladen: ${geladenProject.bladen} bladen` +
      (geladenProject.bureau ? `, bureau "${geladenProject.bureau}"` : ", bureau uit het live profiel"));

    await evalueer(`(() => {
      const { usePrintStore } = window.__ocs;
      // App.tsx roept na 250 ms window.print() en daarna klaar() aan; klaar()
      // haalt de afdrukweergave weg. Beide uit, dan blijft hij staan tot de PDF er is.
      usePrintStore.setState({ klaar: () => {} });
      window.print = () => {};
      usePrintStore.getState().afdrukken(null, "rapport");
      return true;
    })()`, "het afdrukken starten");
    await wachtTot("!!document.querySelector('.print-root .rpa-wortel')", 15000,
      "de afdrukweergave van het rapport (.print-root .rpa-wortel) verscheen niet. Rendert afdrukken(null, \"rapport\") het rapport? " +
      "Kreeg de app net een hot update, herstart dan de dev-server.");

    const staat = await evalueer(`(async () => {
      await document.fonts.ready;
      await Promise.all([...document.querySelectorAll(".print-root img")]
        .map((b) => (b.complete ? null : b.decode().catch(() => null))));
      // De parametrische beelden meten zich met een ResizeObserver: die vuurt
      // pas na een opmaakronde. Twee frames plus een halve seconde; zonder
      // zichtbaar venster valt requestAnimationFrame terug op de timer.
      await new Promise((r) => { requestAnimationFrame(() => requestAnimationFrame(r)); setTimeout(r, 1000); });
      await new Promise((r) => setTimeout(r, 500));
      const wortel = document.querySelector(".print-root .rpa-wortel");
      return {
        afdrukmodus: document.documentElement.classList.contains("afdrukmodus"),
        secties: wortel ? wortel.querySelectorAll("section").length : 0,
        tekens: wortel ? wortel.innerText.length : 0,
        lettertypen: [...new Set([...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family))],
      };
    })()`, "wachten op lettertypen en beelden");
    if (!staat.afdrukmodus) stop("html.afdrukmodus staat niet meer aan: de afdrukweergave is al gesloten.");
    if (staat.tekens === 0) stop("de afdrukweergave van het rapport is leeg.");
    log(`afdrukweergave klaar: ${staat.secties} secties, lettertypen ${staat.lettertypen.join(", ") || "(systeem)"}`);

    // Als stroom: een rapport met twintig bladen en beelden past niet prettig
    // in één base64-antwoord.
    const { stream } = await pagina("Page.printToPDF", {
      preferCSSPageSize: true,
      printBackground: true,
      transferMode: "ReturnAsStream",
    });
    const delen = [];
    for (;;) {
      const { data, base64Encoded, eof } = await pagina("IO.read", { handle: stream, size: 1 << 20 });
      delen.push(Buffer.from(data, base64Encoded ? "base64" : "utf8"));
      if (eof) break;
    }
    await pagina("IO.close", { handle: stream });
    const pdf = Buffer.concat(delen);
    if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") stop("de browser gaf geen PDF terug.");
    writeFileSync(o.uit, pdf);
    const paginas = (pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
    log(`PDF geschreven: ${o.uit} (${paginas} pagina's, ${Math.round(pdf.length / 1024)} kB)`);
  } finally {
    if (cdp) {
      await Promise.race([cdp.stuur("Browser.close").catch(() => {}), wacht(3000)]);
      cdp.sluit();
    }
    if (browser && !browser.gestopt) {
      const code = await Promise.race([browser.einde, wacht(10000).then(() => "loopt nog")]);
      if (code === "loopt nog") browser.proc.kill();
      await wacht(300);
    }
    try {
      rmSync(profiel, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch (e) {
      console.warn(`let op: tijdelijk browserprofiel ${profiel} kon niet weg: ${e.message}`);
    }
  }
}

try {
  await hoofd();
} catch (e) {
  if (e instanceof Stop) console.error(`rapport-pdf: ${e.message}`);
  else console.error(`rapport-pdf: onverwachte fout: ${e?.stack ?? e}`);
  if (meldingen.length) {
    console.error("meldingen uit de pagina:");
    for (const m of meldingen.slice(0, 15)) console.error(`  - ${m.slice(0, 400)}`);
  }
  process.exitCode = 1;
}
```

- [ ] **Step 3: Controleer de foutmeldingen**

```bash
node scripts/rapport-pdf.mjs; echo "exit $?"
node scripts/rapport-pdf.mjs bestaat-niet.ifccalculation "$TMP/x.pdf"; echo "exit $?"
node scripts/rapport-pdf.mjs scripts/fixtures/rapport-voorbeeld.ifccalculation "$TMP/x.pdf" --url http://127.0.0.1:3021; echo "exit $?"
```

Verwacht, in deze volgorde:
- `rapport-pdf: verwacht een projectbestand en een uitvoerbestand.` gevolgd door de regel `gebruik: …`, `exit 1`;
- `rapport-pdf: projectbestand …\bestaat-niet.ifccalculation bestaat niet.`, `exit 1`;
- `rapport-pdf: geen dev-server op http://127.0.0.1:3021/: start hem met … Vite luistert alleen op ::1; gebruik http://localhost:3021.`, `exit 1`.

Geen van de drie start een browser.

- [ ] **Step 4: Draai de rooktest**

```bash
node scripts/rapport-pdf.mjs scripts/fixtures/rapport-voorbeeld.ifccalculation "$TMP/rapport-voorbeeld.pdf"; echo "exit $?"
```

Verwacht (tijden en aantallen mogen afwijken):

```
[0.3 s] chrome.exe gestart (Chrome/…)
[… s] app geladen
[… s] project "Voorbeeldproject" geladen: 2 bladen, bureau "Voorbeeldbureau B.V."
[… s] afdrukweergave klaar: … secties, lettertypen …
[… s] PDF geschreven: …\rapport-voorbeeld.pdf (… pagina's, … kB)
exit 0
```

en daarna geen achtergebleven profielmappen:

```bash
ls "$TMP" | grep -c '^rapport-pdf-'
```

Verwacht: `0`.

- [ ] **Step 5: Controleer de inhoud van de PDF**

```bash
python - "$TMP/rapport-voorbeeld.pdf" <<'EOF'
import sys, fitz
d = fitz.open(sys.argv[1])
tekst = "\n".join(p.get_text() for p in d)
b, h = d[0].rect.width, d[0].rect.height
assert abs(b - 595) < 2 and abs(h - 842) < 2, f"geen A4 staand: {b} x {h}"
assert d.page_count >= 8, f"maar {d.page_count} vellen"
for s in ["Constructieadvies & berekeningen", "Voorbeeldproject", "Voorbeeldbureau B.V.", "Inhoud",
          "Inleiding", "Projectgegevens", "Constructie", "Uitgangspunten", "Belastingen", "Berekeningen",
          "Bijlage A", "Constructieoverzicht", "Balklaag verdiepingsvloer", "Spuwer dakrand", "11,03"]:
    assert s in tekst, f"ontbreekt: {s}"
assert "Inhoud" in d[1].get_text(), "vel 2 is niet de inhoud"
print(d.page_count, "vellen, A4, alle verwachte teksten aanwezig")
EOF
```

Verwacht: `<n> vellen, A4, alle verwachte teksten aanwezig`, exitcode 0.

- [ ] **Step 6: Controleer `--bureau`**

```bash
printf '{"naam":"Proefbureau B.V."}' > "$TMP/proefbureau.json"
node scripts/rapport-pdf.mjs scripts/fixtures/rapport-voorbeeld.ifccalculation "$TMP/rapport-proef.pdf" --bureau "$TMP/proefbureau.json"
python -c "import sys, fitz; t = ''.join(p.get_text() for p in fitz.open(sys.argv[1])); print('Proefbureau B.V.' in t, 'Voorbeeldbureau B.V.' in t)" "$TMP/rapport-proef.pdf"
```

Verwacht: de logregel `project "Voorbeeldproject" geladen: 2 bladen, bureau "Proefbureau B.V."` en
daarna `True False` (de bureaunaam op voorblad en voet komt uit het profiel).

- [ ] **Step 7: Bekijk de PDF**

Open `$TMP/rapport-voorbeeld.pdf` en controleer:
- vel 1 (voorblad): titel "Constructieadvies & berekeningen" linksboven, ondertitel
  "Voorbeeldproject" in de accentkleur, blok "Project" en "In opdracht van" met twee
  adresregels, de labels vanaf "Adviseur" vet in de accentkleur, één rij "Datum wijz." voor
  revisie B, rapportstatus "Ter goedkeuring", kenmerk "VB-2026-001";
- vel 2: "Inhoud" met hoofdstukken 1 t/m 6 en "Bijlage A" en "Bijlage B Constructieoverzicht";
- geen loopkop; onderaan elk vel een dunne lijn met links "Voorbeeldbureau B.V." en rechts het
  paginanummer, te beginnen bij 1;
- hoofdstuk 3 heeft alleen 3.1 met het blok "Belendingen" en 3.2 met het blok "Nieuwbouw";
  hoofdstuk 4 heeft geen paragraaf "Bestaande situatie";
- 5.5 toont "Dak" met som 0,70, "Verdiepingsvloer" met 0,60 en "Gevel" met 11,03;
- hoofdstuk 6: "Spuwer dakrand" met zijn uitwerking in het hoofdstuk, "Balklaag
  verdiepingsvloer" met een verwijzing naar bijlage A;
- bijlage A: "A.1 Balklaag verdiepingsvloer" met kop, parametrisch beeld en uitwerking.

- [ ] **Step 8: Commit**

```bash
git add scripts/rapport-pdf.mjs
git commit -m "$(cat <<'EOF'
feat(scripts): rapport-pdf maakt headless een PDF van het rapport

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 35: Lokaal verificatieproject (buiten de repo)

Een script in `$RR` bouwt uit `cellen-C1-C3.json` (de celinhoud van de referentie-spreadsheet,
tabbladen PN, C1, C2, C3) en `referentie-C1-C3.pdf` een projectbestand en een bureauprofiel
waarmee de app hetzelfde rapport opmaakt als de referentie. Het script noemt zelf geen enkele
waarde: alles komt op de hieronder genoemde celadressen uit de spreadsheet, of wordt gemeten in
de PDF. Standaardwaarden en de rekenteksten van de bladen komen via Node uit de repo, zodat het
verificatieproject altijd de vorm heeft die de app op dat moment verwacht. Niets uit deze taak
wordt gecommit.

Afbeelding van spreadsheet naar project (zo zit het in de code hieronder):

| Doel | Bron |
|---|---|
| `gegevens.project_nummer` | `PN!A3` |
| `gegevens.project_naam`, `project.naam` | `PN!B3` (melding als `C1!C6`, de ondertitel, afwijkt) |
| `gegevens.opdrachtgever` | `C1!G20` |
| `gegevens.constructeur` | `C1!G28` |
| `gegevens.locatie` | `PN!F3` |
| `gegevens.CC`, `gegevens.RC` | het cijfer in `C2!F9`, `C2!F10` |
| `gegevens.DesignLife` | `C2!F12` |
| `gegevens.windgebied`, `terreincategorie` | `C2!E142` = "<cijfer> <omgeving>": het cijfer is het windgebied; kust → 1, onbebouwd → 2, bebouwd → 3 |
| `rapport.titel`, `kenmerk`, `fase`, `normen` | `C1!C4`, `C1!G38`, `C1!G36`, `C1!G30` |
| `rapport.opdrachtgeverAdres` | `C1!G21`–`G23`, niet-lege regels met `"\n"` |
| `rapport.verantwoordelijk`, `uitvoerend` | `C1!G28`, `C1!G29` |
| `rapport.revisies` | één revisie `A`, "Eerste uitgave"; datum = eerste dd-mm-jjjj op vel 1 van de referentie-PDF (de export zet daar de datum van de dag; anders `C1!G32`); status = `C1!G37` in kleine letters. De rij "Datum Wijz" (`C1!E33`) heeft geen waarde, dus geen latere revisies |
| `rapport.rol` | `C1!G117`, `C1!G118`, `C1!G119` |
| `rapport.teksten` | per tekst-id een rijbereik (tabel `TEKSTEN` in de code); één spreadsheetrij is één rapportregel, een lege rij een lege regel; per rij de eerste gevulde kolom (C1: B, dan C voor de ingesprongen opsommingen; C2: C). `uitvoering-nieuwbouw` blijft leeg, zoals in de referentie |
| `uitgangspunten.soortBouwwerk` | `C2!F8` |
| `uitgangspunten.brand` | `C2!G20`, `G21`, `G22`; verwijzing `C2!K20` |
| `uitgangspunten.materialen` | `C2` rij 27–32: C type, E soort, F opmerking; `materialenNoot` = `C2!C33` |
| `uitgangspunten.bevestiging` | `C2` rij 29–31: H type, J kwaliteit |
| `uitgangspunten.conservering` | `C2` rij 37–39: C onderdeel, E systeem; `conserveringSlot` = `C2!C41` |
| `uitgangspunten.bestaand` | `opnemen` = `C2!B60` gevuld; bouwjaar `C2!F62`, bron `C2!I62`, `C2!F64`, `C2!F65` |
| `uitgangspunten.vervormingen` | `C2` rij 77–81: C onderdeel, F `ueind`, G `ubij`, H `uhor`; "lrep" wordt "l_rep" |
| `belastingen.wind` | gebouwhoogte `C2!E143`, `cscd` `C2!E146`, coëfficiënten `C2!H142`–`H145` zonder omschrijving |
| `belastingen.klassen` | elk blok dat in `C2!C` met "Belastingklasse" begint, tot het volgende blok of de kop van 5.5: categorie uit "Cat…orie <letter>" in kolom E (A → `A-vloer`, H → `H-dak`, B/C1–C5/D1/D2 gelijk); vloer: `lichteScheidingswanden` uit de rij "L.S."; dak: `dakhelling` uit de rij "α", `qlast` uit de rij "Dak q-last" |
| `belastingen.vloerenDaken`, `wanden` | `C2` tussen de rij "VLOER, DAKEN" en de rij "WANDEN", en na "WANDEN": een kopregel met "d[m]" in E is een vlakopbouw (naam C; lagen naam C, d E, ρ F, p G); een kopregel met "prep" in D en "h[m]" in E is een gevelopbouw (lagen naam C, p D, h E, vulling F). p wordt altijd overgenomen: de spreadsheet toont d afgerond, dus d × ρ opnieuw rekenen geeft een andere p dan de referentie |
| `exemplaren` | drie bladen, ids `ex-verificatie-1..3`; namen `C3!B7`–`B9` zonder "6.n "; modules `balklaag`, `stalen-kolom`, `en1997-funderingsstrook` (alleen van belang voor bijlage A, die de referentie niet heeft) |
| `rapport.toelichting` | `C3!B14`, `C3!B38`, `C3!B47` |
| `rapport.bijlagen` | `C1` rij 82–89 waar kolom C met "Bijlage" begint: de titel in kolom D |
| `rapport.nieuwePagina` | `{ "uitvoering": true }`: de referentie begint 3.2 op een nieuw vel terwijl vel 4 nog ruimte heeft |
| `rapport.inHoofdstuk` | `{}` |
| `rapport.bureau` | blijft de standaard; het profiel gaat via `rapport-pdf.mjs --bureau` |
| profiel: `naam` | `C1!G27` |
| profiel: `constructeurs` | `C1` rij 29–32: N naam, O telefoon, Q e-mail |
| profiel: `voetafbeelding` | `voet.jpeg` als data-URL (hooguit 500 kB) |
| profiel: `huisstijl` | gemeten in de referentie-PDF: hoofdkleur = kleur van de eerste kop van 20 pt of meer na vel 1; accentkleur = eerste vette kop van 12 pt; invoerkleur = kleur van de waarde rechts van het label uit `C2!C8`; tabeltekst = meest voorkomende overige kleur in tekst van 10 pt; lettertype = de standaard |

**Files (allemaal buiten de repo, in `$RR`):**
- Create: `$RR/maak-verificatieproject.py`
- Create (gegenereerd): `$RR/verificatie.ifccalculation`, `$RR/verificatie-bureau.json`

**Interfaces:**
- Consumes:
  - `$RR/cellen-C1-C3.json` (`{ "PN": {adres: tekst}, "C1": {…}, "C2": {…}, "C3": {…} }`), `$RR/referentie-C1-C3.pdf`, `$RR/voet.jpeg`
  - via Node: `standaardRapport`, `leegBureau`, `normaliseerRapport` (`rapport/model.ts`), `standaardTeksten` (`rapport/standaardteksten.ts`), `legeGegevens` (`store/projectGegevens.ts`), de exports `balklaag`, `stalenKolom`, `en1997Funderingsstrook` uit `templates/`, `PROJECT_FORMAAT_VERSIE` (regex op `store/projectBestand.ts`)
- Produces:
  - `python "$RR/maak-verificatieproject.py" [--repo <pad>]` — exitcode 0 als `normaliseerRapport` het rapport (met het profiel als `bureau`) ongemoeid laat, anders 1 met de verschillen
  - `$RR/verificatie.ifccalculation` (`{ "project": { versie, naam, gegevens, exemplaren, rapport } }`) en `$RR/verificatie-bureau.json` (een `BureauProfiel`)

- [ ] **Step 1: Schrijf het script**

Create `$RR/maak-verificatieproject.py`:

```python
"""
maak-verificatieproject.py — bouwt uit de celinhoud van de referentie-spreadsheet
(cellen-C1-C3.json) en de referentie-PDF een projectbestand en een bureauprofiel
waarmee de app hetzelfde rapport opmaakt als de referentie.

Alleen lokaal (scratchpad/rapport-ref). De uitvoer bevat project-, klant- en
persoonsgegevens en komt nooit in de repo. Dit script noemt zelf geen enkele
waarde: alles komt uit de cellen of de PDF, op de adressen hieronder.

Gebruik:
  python maak-verificatieproject.py [--repo <pad naar de repo>]

Schrijft naast dit script:
  verificatie.ifccalculation  project: gegevens, drie bladen, rapport
  verificatie-bureau.json     bureauprofiel voor rapport-pdf.mjs --bureau

Standaardwaarden (leeg rapport, standaardteksten, projectgegevens, de
rekenteksten van de bladen) komen uit de repo zelf, via Node: zo heeft het
verificatieproject altijd de vorm die de app op dat moment verwacht.
"""
from __future__ import annotations

import argparse
import base64
import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

import fitz  # PyMuPDF

HIER = Path(__file__).resolve().parent
STANDAARD_REPO = Path("C:/Users/rickd/Documents/GitHub/Ifc-Calc/.claude/worktrees/practical-mcclintock-34d234")
CELLEN = HIER / "cellen-C1-C3.json"
REF_PDF = HIER / "referentie-C1-C3.pdf"
VOET = HIER / "voet.jpeg"

# Tekst-id → (blad, eerste rij, laatste rij, kolommen). Eén spreadsheetrij is
# één rapportregel; een lege rij blijft een lege regel. Per rij telt de eerste
# gevulde kolom; in hoofdstuk 1 staan opsommingen één kolom verder (C).
TEKSTEN: dict[str, tuple[str, int, int, str] | None] = {
    "inleiding": ("C1", 89, 104, "BC"),
    "projectomschrijving": ("C1", 112, 112, "B"),
    "rol": ("C1", 116, 116, "B"),
    "bestaand-verticaal": ("C1", 136, 137, "B"),
    "bestaand-stabiliteit": ("C1", 140, 140, "B"),
    "bestaand-fundatie": ("C1", 143, 143, "B"),
    "bestaand-beoordeling": ("C1", 146, 146, "B"),
    "wijziging": ("C1", 150, 155, "B"),
    "belendingen": ("C1", 159, 159, "B"),
    "uitvoering-bestaand": ("C1", 174, 175, "B"),
    "uitvoering-verbouw": ("C1", 179, 180, "B"),
    "uitvoering-nieuwbouw": None,  # leeg in de referentie: het blok valt weg
    "trillingen": ("C2", 69, 70, "C"),
    "vervormingen": ("C2", 74, 74, "C"),
    "montage": ("C2", 89, 90, "C"),
    "rekenprogrammatuur": ("C2", 94, 99, "C"),
    "temperatuur": ("C2", 103, 103, "C"),
    "aardbeving": ("C2", 107, 107, "C"),
    "sneeuw": ("C2", 136, 137, "C"),
    "regenwater": ("C2", 153, 153, "C"),
}

# Hoofdstuk 6: (rij van de titel in C3!B, rij van de toelichting in C3!B,
# templateId, bestand in src/templates, exportnaam). De module bepaalt alleen
# bijlage A, die de referentie niet heeft; de titel komt uit de cel.
BLADEN = [
    (7, 14, "balklaag", "balklaag.ts", "balklaag"),
    (8, 38, "stalen-kolom", "stalenKolom.ts", "stalenKolom"),
    (9, 47, "en1997-funderingsstrook", "en1997.ts", "en1997Funderingsstrook"),
]

# Belastingklasse in C2!E: "Categorie A: …" (in de referentie ook "Cateorie H: …").
CATEGORIE = {"A": "A-vloer", "B": "B", "C1": "C1", "C2": "C2", "C3": "C3", "C4": "C4", "C5": "C5",
             "D1": "D1", "D2": "D2", "H": "H-dak"}
# Het tweede woord van C2!E142 ("<windgebied> <omgeving>") → code terreincategorie.
TERREIN = {"kust": "1", "onbebouwd": "2", "bebouwd": "3"}

NODE_BASIS = r"""
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { readFileSync } from "node:fs";
const [repo, datum, bladen] = process.argv.slice(1);
const laad = (p) => import(pathToFileURL(join(repo, "packages/desktop/src", p)).href);
const { standaardRapport, leegBureau } = await laad("rapport/model.ts");
const { standaardTeksten } = await laad("rapport/standaardteksten.ts");
const { legeGegevens } = await laad("store/projectGegevens.ts");
const bronnen = {};
for (const [id, bestand, naam] of JSON.parse(bladen)) {
  const m = await laad("templates/" + bestand);
  if (typeof m[naam] !== "string") throw new Error(`templates/${bestand} exporteert geen ${naam}`);
  bronnen[id] = m[naam];
}
const versie = Number(readFileSync(join(repo, "packages/desktop/src/store/projectBestand.ts"), "utf8")
  .match(/PROJECT_FORMAAT_VERSIE = (\d+)/)[1]);
process.stdout.write(JSON.stringify({
  rapport: standaardRapport(datum, standaardTeksten()), bureau: leegBureau(), gegevens: legeGegevens(), bronnen, versie,
}));
"""

NODE_CONTROLE = r"""
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
const [repo, project, bureau, datum] = process.argv.slice(1);
const laad = (p) => import(pathToFileURL(join(repo, "packages/desktop/src", p)).href);
const { normaliseerRapport } = await laad("rapport/model.ts");
const { standaardTeksten } = await laad("rapport/standaardteksten.ts");
const r = JSON.parse(readFileSync(project, "utf8")).project.rapport;
r.bureau = JSON.parse(readFileSync(bureau, "utf8"));
const n = normaliseerRapport(r, datum, standaardTeksten());
const uit = [];
const loop = (a, b, pad) => {
  if (isDeepStrictEqual(a, b)) return;
  if (a && b && typeof a === "object" && typeof b === "object" && Array.isArray(a) === Array.isArray(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) loop(a[k], b[k], `${pad}.${k}`);
  } else uit.push(`${pad}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`);
};
loop(r, n, "rapport");
process.stdout.write(JSON.stringify(uit));
"""


def node(script: str, *args: str):
    r = subprocess.run(["node", "--input-type=module", "-e", script, *args],
                       capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        raise SystemExit(f"node faalde:\n{r.stderr}")
    return json.loads(r.stdout)


CEL: dict[str, dict[str, str]] = {}


def cel(blad: str, adres: str) -> str:
    return str(CEL[blad].get(adres, "")).strip()


def tekst(blad: str, van: int, tot: int, kolommen: str) -> str:
    regels = [next((cel(blad, f"{k}{r}") for k in kolommen if cel(blad, f"{k}{r}")), "") for r in range(van, tot + 1)]
    return "\n".join(regels).strip("\n")


def cijfer(s: str) -> str:
    m = re.search(r"\d", s)
    if not m:
        raise SystemExit(f"geen cijfer in {s!r}")
    return m.group(0)


def rep(s: str) -> str:
    """"0,004lrep" → "0,004l_rep": de app zet alles na "_" als subscript."""
    return re.sub(r"l(rep)\b", r"l_\1", s)


def rij_van(blad: str, kolom: str, waarde: str) -> int:
    for adres, w in CEL[blad].items():
        m = re.fullmatch(rf"{kolom}(\d+)", adres)
        if m and str(w).strip() == waarde:
            return int(m.group(1))
    raise SystemExit(f"{blad}: geen cel in kolom {kolom} met {waarde!r}")


def opbouwen(van: int, tot: int) -> list[dict]:
    """Opbouwen in C2 tussen twee rijen: een kopregel met d[m] (vlak) of prep/h[m] (gevel), daarna de lagen."""
    uit, r = [], van
    while r <= tot:
        naam = cel("C2", f"C{r}")
        if naam and cel("C2", f"E{r}") == "d[m]":
            lagen, r = [], r + 1
            while r <= tot and cel("C2", f"C{r}"):
                # p altijd uit de spreadsheet: die toont d afgerond (0,015 staat er
                # als "0,02"), dus d × ρ opnieuw uitrekenen geeft een andere p dan
                # de referentie. De app neemt een ingevulde p voor waar.
                lagen.append({"naam": cel("C2", f"C{r}"), "d": cel("C2", f"E{r}"),
                              "rho": cel("C2", f"F{r}"), "p": cel("C2", f"G{r}")})
                r += 1
            uit.append({"soort": "vlak", "naam": naam, "lagen": lagen})
        elif naam and cel("C2", f"D{r}") == "prep" and cel("C2", f"E{r}") == "h[m]":
            lagen, r = [], r + 1
            while r <= tot and cel("C2", f"C{r}"):
                lagen.append({"naam": cel("C2", f"C{r}"), "p": cel("C2", f"D{r}"),
                              "h": cel("C2", f"E{r}"), "vulling": cel("C2", f"F{r}")})
                r += 1
            uit.append({"soort": "gevel", "naam": naam, "lagen": lagen})
        else:
            r += 1
    return uit


def klassen() -> list[dict]:
    """5.4: elk blok begint met "Belastingklasse" in C2!C; de waarden staan in kolom E."""
    starts = sorted(int(a[1:]) for a, w in CEL["C2"].items() if re.fullmatch(r"C\d+", a) and str(w).strip() == "Belastingklasse")
    # Het laatste blok loopt tot de kop van 5.5.
    eind_54 = next(int(a[1:]) for a, w in CEL["C2"].items() if re.fullmatch(r"B\d+", a) and str(w).startswith("5.5 "))
    uit = []
    for i, r in enumerate(starts):
        eind = starts[i + 1] if i + 1 < len(starts) else eind_54
        rijen = {cel("C2", f"C{k}"): cel("C2", f"E{k}") for k in range(r, eind) if cel("C2", f"C{k}")}
        m = re.search(r"Cat\w*orie\s+([A-Z]\d?)\b", cel("C2", f"E{r}"))
        if not m or m.group(1) not in CATEGORIE:
            raise SystemExit(f"C2!E{r}: onbekende belastingcategorie {cel('C2', f'E{r}')!r}")
        cat = CATEGORIE[m.group(1)]
        if cat == "H-dak":
            uit.append({"categorie": cat, "lichteScheidingswanden": "", "dakhelling": rijen.get("α", ""), "qlast": rijen.get("Dak q-last", "")})
        else:
            uit.append({"categorie": cat, "lichteScheidingswanden": rijen.get("L.S.", ""), "dakhelling": "", "qlast": ""})
    return uit


def datum_rapport(ref: fitz.Document) -> str:
    """De export zet de datum van de dag op het voorblad; die telt, niet de cel C1!G32."""
    m = re.search(r"\b(\d{2}-\d{2}-\d{4})\b", ref[0].get_text("text"))
    return m.group(1) if m else cel("C1", "G32")


def huisstijl(ref: fitz.Document, standaard: dict) -> dict:
    """De huisstijlkleuren gemeten in de referentie-PDF, zodat ze nergens als waarde staan."""
    spans = [(i, s) for i, p in enumerate(ref) for b in p.get_text("dict")["blocks"] if b.get("type") == 0
             for l in b["lines"] for s in l["spans"] if s["text"].strip()]
    hoofd = next(s["color"] for i, s in spans if i > 0 and s["size"] >= 20)
    accent = next(s["color"] for i, s in spans if abs(s["size"] - 12) < 0.3 and "bold" in s["font"].lower())
    invoer = None
    for p in ref:
        regels = [(l["spans"][0]["origin"][1], l["spans"][0]["origin"][0], "".join(s["text"] for s in l["spans"]).strip(), l["spans"][0]["color"])
                  for b in p.get_text("dict")["blocks"] if b.get("type") == 0 for l in b["lines"] if l["spans"]]
        label = next((r for r in regels if r[2] == cel("C2", "C8")), None)
        if label:
            invoer = next(r[3] for r in regels if abs(r[0] - label[0]) < 1 and r[1] > label[1] + 50)
            break
    if invoer is None:
        raise SystemExit("invoerkleur niet gevonden: geen label C2!C8 in de referentie-PDF")
    tabel = Counter(s["color"] for _, s in spans if abs(s["size"] - 10) < 0.3
                    and s["color"] not in (0, hoofd, accent, invoer)).most_common(1)[0][0]
    return {**standaard, "hoofdkleur": f"#{hoofd:06x}", "accentkleur": f"#{accent:06x}",
            "tabeltekst": f"#{tabel:06x}", "invoerkleur": f"#{invoer:06x}"}


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--repo", default=str(STANDAARD_REPO))
    repo = ap.parse_args().repo
    CEL.update(json.loads(CELLEN.read_text(encoding="utf-8")))
    ref = fitz.open(REF_PDF)
    datum = datum_rapport(ref)
    basis = node(NODE_BASIS, repo, datum, json.dumps([[b[2], b[3], b[4]] for b in BLADEN]))

    # ── Projectgegevens ──
    windlabel = re.match(r"^\s*([123])\s+(\w+)", cel("C2", "E142"))
    if not windlabel or windlabel.group(2).lower() not in TERREIN:
        raise SystemExit(f"C2!E142: onverwacht windlabel {cel('C2', 'E142')!r}")
    gegevens = {**basis["gegevens"],
                "project_nummer": cel("PN", "A3"), "project_naam": cel("PN", "B3"),
                "opdrachtgever": cel("C1", "G20"), "constructeur": cel("C1", "G28"), "locatie": cel("PN", "F3"),
                "CC": cijfer(cel("C2", "F9")), "RC": cijfer(cel("C2", "F10")), "DesignLife": cel("C2", "F12"),
                "windgebied": windlabel.group(1), "terreincategorie": TERREIN[windlabel.group(2).lower()]}
    if cel("C1", "C6") != gegevens["project_naam"]:
        print("let op: de ondertitel C1!C6 wijkt af van de projectnaam PN!B3")

    # ── Bladen ──
    exemplaren = [{"id": f"ex-verificatie-{n}",
                   "naam": re.sub(r"^\d+(\.\d+)*\s+", "", cel("C3", f"B{titel}")),
                   "templateId": tid, "source": basis["bronnen"][tid], "waarden": {}, "elementen": []}
                  for n, (titel, _, tid, _, _) in enumerate(BLADEN, 1)]

    # ── Rapport ──
    r = basis["rapport"]
    status = cel("C1", "G37").lower()
    if status not in ("concept", "ter goedkeuring", "definitief"):
        raise SystemExit(f"C1!G37: onbekende rapportstatus {status!r}")
    r.update({
        "titel": cel("C1", "C4"),
        "kenmerk": cel("C1", "G38"),
        "fase": cel("C1", "G36"),
        "normen": cel("C1", "G30"),
        "opdrachtgeverAdres": "\n".join(v for v in (cel("C1", f"G{k}") for k in (21, 22, 23)) if v),
        "verantwoordelijk": cel("C1", "G28"),
        "uitvoerend": cel("C1", "G29"),
        # Alleen revisie A: de rij "Datum Wijz" (C1!E33) heeft geen waarde.
        "revisies": [{"code": "A", "datum": datum, "omschrijving": "Eerste uitgave", "status": status}],
        "rol": {"rol": cel("C1", "G117"), "architect": cel("C1", "G118"), "datumOnderlegger": cel("C1", "G119")},
        "toelichting": {f"ex-verificatie-{n}": cel("C3", f"B{rij}") for n, (_, rij, *_rest) in enumerate(BLADEN, 1)},
        "inHoofdstuk": {},
        # Bijlage A is altijd de uitwerking; eigen bijlagen vanaf C1 rij 82.
        "bijlagen": [cel("C1", f"D{k}") for k in range(82, 90) if cel("C1", f"C{k}").startswith("Bijlage") and cel("C1", f"D{k}")],
        # De referentie begint 3.2 op een nieuw vel terwijl vel 4 nog ruimte heeft.
        "nieuwePagina": {"uitvoering": True},
    })
    r["teksten"] = {**r["teksten"], **{tid: (tekst(*bron) if bron else "") for tid, bron in TEKSTEN.items()}}
    u = r["uitgangspunten"]
    u["soortBouwwerk"] = cel("C2", "F8")
    u["brand"] = {"hoofddraagconstructie": cel("C2", "G20"), "brandscheiding": cel("C2", "G21"),
                  "vluchtroute": cel("C2", "G22"), "verwijzing": cel("C2", "K20")}
    u["materialen"] = [{"type": cel("C2", f"C{k}"), "soort": cel("C2", f"E{k}"), "opmerking": cel("C2", f"F{k}")}
                       for k in range(27, 33) if cel("C2", f"C{k}")]
    u["materialenNoot"] = cel("C2", "C33")
    u["bevestiging"] = [{"type": cel("C2", f"H{k}"), "kwaliteit": cel("C2", f"J{k}")} for k in range(29, 32) if cel("C2", f"H{k}")]
    u["conservering"] = [{"onderdeel": cel("C2", f"C{k}"), "systeem": cel("C2", f"E{k}")} for k in range(37, 40) if cel("C2", f"C{k}")]
    u["conserveringSlot"] = cel("C2", "C41")
    u["bestaand"] = {"opnemen": bool(cel("C2", "B60")), "bouwjaar": cel("C2", "F62"), "bron": cel("C2", "I62"),
                     "berekeningBeschikbaar": cel("C2", "F64"), "materiaalgegevensBeschikbaar": cel("C2", "F65")}
    u["vervormingen"] = [{"onderdeel": cel("C2", f"C{k}"), "ueind": rep(cel("C2", f"F{k}")),
                          "ubij": rep(cel("C2", f"G{k}")), "uhor": rep(cel("C2", f"H{k}"))}
                         for k in range(77, 82) if cel("C2", f"C{k}")]
    b = r["belastingen"]
    b["wind"] = {"gebouwhoogte": cel("C2", "E143"), "cscd": cel("C2", "E146"),
                 "coefficienten": [{"omschrijving": "", "c": cel("C2", f"H{k}")} for k in range(142, 146) if cel("C2", f"H{k}")]}
    b["klassen"] = klassen()
    vloer, wand = rij_van("C2", "C", "VLOER, DAKEN"), rij_van("C2", "C", "WANDEN")
    laatste = max(int(a[1:]) for a in CEL["C2"] if re.fullmatch(r"C\d+", a))
    b["vloerenDaken"] = opbouwen(vloer + 1, wand - 1)
    b["wanden"] = opbouwen(wand + 1, laatste)

    # ── Bureauprofiel ──
    bureau = {**basis["bureau"],
              "naam": cel("C1", "G27"),
              "voetafbeelding": "data:image/jpeg;base64," + base64.b64encode(VOET.read_bytes()).decode("ascii"),
              "huisstijl": huisstijl(ref, basis["bureau"]["huisstijl"]),
              "constructeurs": [{"naam": cel("C1", f"N{k}"), "telefoon": cel("C1", f"O{k}"), "email": cel("C1", f"Q{k}")}
                                for k in range(29, 33) if cel("C1", f"N{k}")]}
    if len(base64.b64decode(bureau["voetafbeelding"].split(",", 1)[1])) > 500 * 1024:
        raise SystemExit("voet.jpeg is groter dan 500 kB; de app weigert dat")

    project = {"project": {"versie": basis["versie"], "naam": gegevens["project_naam"], "gegevens": gegevens,
                           "exemplaren": exemplaren, "rapport": r}}
    pad_project, pad_bureau = HIER / "verificatie.ifccalculation", HIER / "verificatie-bureau.json"
    pad_project.write_text(json.dumps(project, ensure_ascii=False, indent=2), encoding="utf-8")
    pad_bureau.write_text(json.dumps(bureau, ensure_ascii=False, indent=2), encoding="utf-8")

    verschillen = node(NODE_CONTROLE, repo, str(pad_project), str(pad_bureau), datum)
    print(f"{pad_project.name}: {len(exemplaren)} bladen, {len(b['klassen'])} belastingklassen, "
          f"{len(b['vloerenDaken'])} vloer/dak-opbouwen, {len(b['wanden'])} wandopbouwen, "
          f"{sum(1 for v in r['teksten'].values() if v.strip())} teksten gevuld")
    print(f"{pad_bureau.name}: {len(bureau['constructeurs'])} constructeurs, voetafbeelding "
          f"{len(VOET.read_bytes()) // 1024} kB, huisstijl gemeten uit de referentie-PDF")
    if verschillen:
        print("normaliseerRapport verandert het rapport; veldnamen of vormen kloppen niet:")
        for v in verschillen:
            print(f"  {v}")
        return 1
    print("normaliseerRapport laat het rapport ongemoeid")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Maak het verificatieproject**

Run: `python "$RR/maak-verificatieproject.py"`
Verwacht, exitcode 0:

```
verificatie.ifccalculation: 3 bladen, 2 belastingklassen, 4 vloer/dak-opbouwen, 2 wandopbouwen, <n> teksten gevuld
verificatie-bureau.json: 4 constructeurs, voetafbeelding 19 kB, huisstijl gemeten uit de referentie-PDF
normaliseerRapport laat het rapport ongemoeid
```

`<n>` is het aantal gevulde teksten: de negentien uit `TEKSTEN` plus de standaardteksten van ids
die niet in `TEKSTEN` staan. Staan er regels onder "normaliseerRapport verandert het rapport",
dan klopt de afbeelding niet met `rapport/model.ts`: pas het script aan (niet het model) en draai
opnieuw.

- [ ] **Step 3: Controleer dat de repo niet is geraakt**

Run: `git status --short`
Verwacht: alleen ` M packages/desktop/.gitignore` (de vreemde wijziging); niets onder `scripts/`
of `docs/`. Deze taak heeft geen commit.

---

### Task 36: Lokaal vergelijkingsscript en de vergelijking met de referentie

`vergelijk.py` (PyMuPDF) legt de app-PDF vel voor vel naast de referentie-PDF: een PDF met per
vel links de referentie en rechts de app, en per vel een tekstcontrole (regels in leesvolgorde
via `difflib`), een stijlcontrole (lettertypefamilie, grootte ±0,5 pt, kleur, vet, cursief), een
plaatscontrole (x en basislijn ±2 mm), een controle dat elk hoofdstuk op hetzelfde vel begint,
de paginanummers en de afbeeldingen (voetafbeelding). Bewuste afwijkingen staan in
`afwijkingen.json`; elke regel draagt een reden en reguliere expressies op `soort`, `sectie`,
`ref`, `app`, `label` of `tekst` (en eventueel `vel`). Regels zonder treffer worden gemeld. Alles
staat in `$RR` en wordt nooit gecommit; alleen reparaties aan de afdruk die uit de vergelijking
volgen komen in de repo.

Soorten bevindingen: `tekst-ontbreekt`, `tekst-extra`, `tekst-anders`, `stijl-grootte`,
`stijl-kleur`, `stijl-lettertype`, `stijl-vet`, `stijl-cursief`, `plaats-x`, `plaats-y`,
`hoofdstuk-vel`, `hoofdstuk-ontbreekt`, `paginanummer`, `beeld`, `vel-ontbreekt`. De `sectie` van
een regel is het nummer van de kop waaronder hij valt (`"4.1"`), of `"Voorblad"` / `"Inhoud"`; het
`label` is de eerste cel van zijn rij.

**Files (allemaal buiten de repo, in `$RR`):**
- Create: `$RR/test_vergelijk.py`
- Create: `$RR/vergelijk.py`
- Create: `$RR/afwijkingen.json`
- Create (gegenereerd): `$RR/app-C1-C3.pdf`, `$RR/naast-elkaar.pdf`

**Interfaces:**
- Consumes: `scripts/rapport-pdf.mjs` (Task 34), `$RR/verificatie.ifccalculation` en `$RR/verificatie-bureau.json` (Task 35), `$RR/referentie-C1-C3.pdf`
- Produces:
  - `python "$RR/vergelijk.py" <referentie.pdf> <app.pdf> --afwijkingen <lijst.json> [--uit <naast-elkaar.pdf>] [--vellen N] [--eerste-pagina 1]` — exitcode 0 zonder open bevindingen, anders 1
  - `vergelijk(ref_pad: str, app_pad: str, afwijkingen: list[dict], vellen: int | None = None, eerste_pagina: int = 1) -> tuple[list[Bevinding], list[dict], dict]` (bevindingen, afwijkingen zonder treffer, `{"vellen": n, "app_paginas": m}`)
  - `lees_afwijkingen(pad: str) -> list[dict]` — weigert onbekende sleutels, een ontbrekende `reden` en een regel zonder patroon

- [ ] **Step 1: Schrijf de toets**

Create `$RR/test_vergelijk.py`:

```python
"""
Toetst vergelijk.py met twee kleine, zelfgemaakte PDF's waarin bekend is wat
er verschilt. Draaien (in deze map):

  python test_vergelijk.py
"""
import json
import subprocess
import sys
import tempfile
import traceback
from pathlib import Path

import fitz

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import vergelijk as v  # noqa: E402

ZWART = (0, 0, 0)
HOOFD = (0.12, 0.23, 0.37)
ACCENT = (0.18, 0.49, 0.43)
ROOD = (0.8, 0.1, 0.1)

# (x, basislijn, tekst, grootte, font, kleur) per regel, één lijst per vel.
REF = [
    [(29.3, 66.0, "1 Inleiding", 24, "hebo", HOOFD),
     (29.3, 106.9, "Eerste regel.", 10, "helv", ZWART),
     (29.3, 125.6, "Tweede regel.", 10, "helv", ZWART),
     (29.3, 162.9, "1.1 Paragraaf", 12, "hebo", ACCENT),
     (83.2, 200.3, "Label", 10, "helv", ZWART),
     (298.5, 200.3, "3,30", 10, "helv", ZWART),
     (562.5, 817.9, "1", 10, "helv", ZWART)],
    [(29.3, 66.0, "2 Tweede hoofdstuk", 24, "hebo", HOOFD),
     (29.3, 106.9, "Tekst.", 10, "helv", ZWART),
     (562.5, 817.9, "2", 10, "helv", ZWART)],
]
APP = [
    [(29.3, 66.0, "1 Inleiding", 22, "hebo", HOOFD),          # 2 pt kleiner
     (29.3, 106.9, "Eerste regel.", 10, "helv", ZWART),
     (29.3, 131.6, "Tweede regel.", 10, "helv", ZWART),       # 6 pt lager: meer dan 2 mm
     (29.3, 162.9, "1.1 Paragraaf", 12, "hebo", ROOD),        # andere kleur
     (83.2, 200.3, "Label", 10, "helv", ZWART),
     (298.5, 200.3, "0,90", 10, "helv", ZWART),               # andere waarde
     (29.3, 237.7, "Extra regel.", 10, "helv", ZWART),        # alleen in de app
     (562.5, 817.9, "1", 10, "helv", ZWART)],
    [(29.3, 106.9, "Tekst.", 10, "helv", ZWART),
     (562.5, 817.9, "2", 10, "helv", ZWART)],
    [(29.3, 66.0, "2 Tweede hoofdstuk", 24, "hebo", HOOFD),   # één vel later
     (562.5, 817.9, "3", 10, "helv", ZWART)],
]

VERWACHT = {
    (1, "stijl-grootte", "1 Inleiding"),
    (1, "plaats-y", "Tweede regel."),
    (1, "stijl-kleur", "1.1 Paragraaf"),
    (1, "tekst-anders", "3,30"),
    (1, "tekst-extra", "Extra regel."),
    (2, "tekst-ontbreekt", "2 Tweede hoofdstuk"),
    (2, "hoofdstuk-vel", "2 Tweede hoofdstuk"),
}


def maak(pad: Path, vellen) -> str:
    doc = fitz.open()
    for regels in vellen:
        p = doc.new_page(width=595.3, height=841.9)
        for x, y, tekst, grootte, font, kleur in regels:
            p.insert_text((x, y), tekst, fontsize=grootte, fontname=font, color=kleur)
    doc.save(pad)
    return str(pad)


def test_zelf(tmp: Path) -> None:
    ref = maak(tmp / "ref.pdf", REF)
    bev, onbenut, info = v.vergelijk(ref, ref, [])
    assert bev == [], [(b.vel, b.soort, b.tekst) for b in bev]
    assert onbenut == [] and info == {"vellen": 2, "app_paginas": 2}


def test_verschillen(tmp: Path) -> None:
    ref, app = maak(tmp / "ref.pdf", REF), maak(tmp / "app.pdf", APP)
    bev, _, info = v.vergelijk(ref, app, [])
    gevonden = {(b.vel, b.soort, b.ref or b.app) for b in bev}
    assert gevonden == VERWACHT, f"te veel: {gevonden - VERWACHT}; te weinig: {VERWACHT - gevonden}"
    anders = next(b for b in bev if b.soort == "tekst-anders")
    assert anders.label == "Label" and anders.app == "0,90"
    assert info == {"vellen": 2, "app_paginas": 3}


def test_bewust(tmp: Path) -> None:
    ref, app = maak(tmp / "ref.pdf", REF), maak(tmp / "app.pdf", APP)
    afw = [{"soort": "^tekst-anders$", "label": "^Label$", "reden": "waarde volgens de norm"},
           {"soort": "^stijl-kleur$", "sectie": "^9\\.9$", "reden": "past nergens op"}]
    bev, onbenut, _ = v.vergelijk(ref, app, afw)
    assert [b.bewust for b in bev if b.soort == "tekst-anders"] == ["waarde volgens de norm"]
    assert all(b.bewust is None for b in bev if b.soort != "tekst-anders")
    assert [a["reden"] for a in onbenut] == ["past nergens op"]


def test_afwijkingen_controle(tmp: Path) -> None:
    for inhoud, fout in ([{"soort": "x"}], "reden"), ([{"reden": "r"}], "geen enkel patroon"), ([{"kolom": "x", "reden": "r"}], "onbekende"):
        pad = tmp / "afw.json"
        pad.write_text(json.dumps(inhoud), encoding="utf-8")
        try:
            v.lees_afwijkingen(str(pad))
        except SystemExit as e:
            assert fout in str(e), str(e)
        else:
            raise AssertionError(f"{inhoud} had geweigerd moeten worden")


def test_cli(tmp: Path) -> None:
    ref, app = maak(tmp / "ref.pdf", REF), maak(tmp / "app.pdf", APP)
    afw = tmp / "afw.json"
    afw.write_text("[]", encoding="utf-8")
    uit = tmp / "naast.pdf"
    r = subprocess.run([sys.executable, str(HIER / "vergelijk.py"), ref, app, "--afwijkingen", str(afw), "--uit", str(uit)],
                       capture_output=True, text=True, encoding="utf-8")
    assert r.returncode == 1, r.stdout + r.stderr
    assert "7 open, 0 bewust" in r.stdout, r.stdout
    assert fitz.open(uit).page_count == 3  # vel 3 van de app staat er zonder referentie bij
    r0 = subprocess.run([sys.executable, str(HIER / "vergelijk.py"), ref, ref, "--afwijkingen", str(afw)],
                        capture_output=True, text=True, encoding="utf-8")
    assert r0.returncode == 0 and "0 open, 0 bewust" in r0.stdout, r0.stdout + r0.stderr


if __name__ == "__main__":
    fouten = 0
    for naam, f in list(globals().items()):
        if naam.startswith("test_") and callable(f):
            with tempfile.TemporaryDirectory() as d:
                try:
                    f(Path(d))
                    print(f"ok    {naam}")
                except Exception:
                    fouten += 1
                    print(f"FOUT  {naam}")
                    traceback.print_exc()
    sys.exit(1 if fouten else 0)
```

- [ ] **Step 2: Draai de toets (moet falen)**

Run: `python "$RR/test_vergelijk.py"`
Verwacht: `ModuleNotFoundError: No module named 'vergelijk'`, exitcode 1.

- [ ] **Step 3: Schrijf het vergelijkingsscript**

Create `$RR/vergelijk.py`:

```python
"""
vergelijk.py — legt de rapport-PDF van de app vel voor vel naast de
referentie-PDF en meldt waar tekst, stijl of plaats verschilt.

Alleen lokaal (scratchpad/rapport-ref). Dit bestand en alles wat het maakt
komt nooit in de repo: de referentie bevat project-, klant- en
persoonsgegevens.

Gebruik:
  python vergelijk.py referentie.pdf app.pdf --afwijkingen afwijkingen.json
                      [--uit naast-elkaar.pdf] [--vellen 13] [--eerste-pagina 1]

Per vel (vel n van de app tegen vel n van de referentie):
  tekst        de regels in leesvolgorde (rij voor rij, binnen een rij van
               links naar rechts); verschillen als ontbreekt / extra / anders.
  stijl        per overeenkomende regel: lettertypefamilie, grootte (±0,5 pt),
               kleur (±8 per kanaal), vet, cursief.
  plaats       per overeenkomende regel: x en basislijn (±2 mm).
  hoofdstuk    elk hoofdstuk (kop van 20 pt of meer) begint op hetzelfde vel.
  paginanummer vel n draagt nummer n + eerste − 1 (standaard: de app nummert
               vanaf 1); stijl en plaats (rechterrand) zoals in de referentie,
               die met een ander beginnummer kan tellen.
  beeld        afbeeldingen (de voetafbeelding) op dezelfde plaats (±2 mm).

Bewuste afwijkingen staan in een JSON-lijst. Elke regel heeft een "reden" en
één of meer reguliere expressies op "soort", "sectie", "ref", "app", "label"
of "tekst", plus eventueel "vel" (een getal). Een bevinding die op een regel
past telt als bewust. Een regel die op niets past wordt gemeld: dan beschrijft
de lijst iets dat niet meer voorkomt.

Exitcode 0 als er geen open bevindingen zijn, anders 1.
"""
from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

import fitz  # PyMuPDF

MM = 72 / 25.4
TOL_PLAATS = 2 * MM        # ±2 mm
TOL_GROOTTE = 0.5          # pt
TOL_KLEUR = 8              # per kanaal, 0–255
VOET_Y = 790.0             # basislijn daaronder: de voet (inhoudsvak eindigt op 785,8 pt)
KOP_GROOTTE = 11.5         # vanaf deze grootte kan een regel een genummerde kop zijn
HOOFDSTUK_GROOTTE = 20.0   # hoofdstukkoppen (24 pt) en de kop "Inhoud"
RIJ_SPELING = 3.0          # basislijnen binnen 3 pt vormen één rij (8 pt-verwijzingen staan iets hoger)
SPAN_GAT = 6.0             # een gat groter dan dit tussen twee spans begint een nieuwe regel

PATROONVELDEN = ("soort", "sectie", "ref", "app", "label", "tekst")

# Superschrift, subschrift en het ordinaal-e tellen als gewone tekens: de
# referentie zet "m2" met een verhoogde 2 in een eigen span, de app misschien "m²".
GEWOON = str.maketrans("⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉ᵉ", "01234567890123456789e")


def sleutel(tekst: str) -> str:
    """De tekst zoals hij wordt vergeleken: zonder opmaaktekens, spaties samengevoegd."""
    t = tekst.translate(GEWOON).replace("\u00a0", " ").replace("\u200b", "").replace("\u00ad", "")
    return re.sub(r"\s+", " ", t).strip()


def familie(font: str) -> str:
    """"ABCDEF+SegoeUI-BoldItalic" → "segoeui"."""
    naam = re.sub(r"^[A-Z]{6}\+", "", font)
    return re.split(r"[-,]", naam)[0].replace(" ", "").lower()


@dataclass
class Regel:
    tekst: str
    sleutel: str
    x0: float
    x1: float
    top: float
    onder: float
    basis: float
    grootte: float
    familie: str
    kleur: int
    vet: bool
    cursief: bool
    vel: int
    sectie: str = ""
    label: str = ""

    @property
    def bbox(self) -> fitz.Rect:
        return fitz.Rect(self.x0, self.top, self.x1, self.onder)


@dataclass
class Bevinding:
    vel: int
    soort: str
    sectie: str
    tekst: str
    ref: str | None = None          # sleutel van de referentieregel
    app: str | None = None          # sleutel van de app-regel
    rrect: fitz.Rect | None = None  # plaats op het referentievel
    arect: fitz.Rect | None = None  # plaats op het app-vel
    label: str = ""
    detail: str = ""
    bewust: str | None = None


def bevinding(vel: int, soort: str, ref: Regel | None = None, app: Regel | None = None,
              detail: str = "") -> Bevinding:
    """Een bevinding; sectie, tekst en label komen van de referentiekant als die er is."""
    bron = ref or app
    return Bevinding(
        vel=vel, soort=soort,
        sectie=bron.sectie if bron else "",
        tekst=bron.tekst if bron else "",
        ref=ref.sleutel if ref else None,
        app=app.sleutel if app else None,
        rrect=ref.bbox if ref else None,
        arect=app.bbox if app else None,
        label=bron.label if bron else "",
        detail=detail,
    )


# ── Inlezen ──────────────────────────────────────────────────────────────────

def _regel(spans: list[dict], vel: int) -> Regel:
    zichtbaar = [s for s in spans if s["text"].strip()]
    # Subschrift en superschrift zijn kleiner: de grootste span draagt de stijl.
    # Bij gelijke grootte wint de eerste.
    hoofd = max(zichtbaar, key=lambda s: s["size"])
    font = hoofd["font"]
    naam = font.lower()
    return Regel(
        tekst="".join(s["text"] for s in spans).strip(),
        sleutel=sleutel("".join(s["text"] for s in spans)),
        x0=zichtbaar[0]["origin"][0],
        x1=max(s["bbox"][2] for s in zichtbaar),
        top=min(s["bbox"][1] for s in zichtbaar),
        onder=max(s["bbox"][3] for s in zichtbaar),
        basis=hoofd["origin"][1],
        grootte=hoofd["size"],
        familie=familie(font),
        kleur=hoofd["color"],
        vet="bold" in naam or bool(hoofd["flags"] & 16),
        cursief="italic" in naam or "oblique" in naam or bool(hoofd["flags"] & 2),
        vel=vel,
    )


def regels_van(pagina: fitz.Page, vel: int) -> list[Regel]:
    """Alle tekstregels van een vel in leesvolgorde, met het label van hun rij."""
    ruw: list[Regel] = []
    for blok in pagina.get_text("dict")["blocks"]:
        if blok.get("type") != 0:
            continue
        for lijn in blok["lines"]:
            groep: list[dict] = []
            for s in lijn["spans"]:
                if not s["text"].strip():
                    if groep:
                        groep.append(s)
                    continue
                # Twee cellen op dezelfde basislijn kunnen in één PDF-regel
                # belanden; een breed gat scheidt ze weer.
                vorige = next((g for g in reversed(groep) if g["text"].strip()), None)
                if vorige is not None and s["bbox"][0] - vorige["bbox"][2] > SPAN_GAT:
                    ruw.append(_regel(groep, vel))
                    groep = []
                groep.append(s)
            if any(g["text"].strip() for g in groep):
                ruw.append(_regel(groep, vel))

    ruw.sort(key=lambda r: (r.basis, r.x0))
    rijen: list[list[Regel]] = []
    for r in ruw:
        if rijen and r.basis - rijen[-1][0].basis <= RIJ_SPELING:
            rijen[-1].append(r)
        else:
            rijen.append([r])
    uit: list[Regel] = []
    for rij in rijen:
        rij.sort(key=lambda r: r.x0)
        for r in rij:
            # Het label van een waarde is de eerste cel van zijn rij: zo kan de
            # lijst met afwijkingen "de waarde naast K_FI" aanwijzen.
            r.label = rij[0].sleutel
            uit.append(r)
    return uit


def lees(doc: fitz.Document, n: int) -> tuple[list[list[Regel]], list[Regel | None]]:
    """De eerste n vellen: regels zonder paginanummer, en per vel het paginanummer."""
    vellen: list[list[Regel]] = []
    nummers: list[Regel | None] = []
    for i in range(n):
        regels = regels_van(doc[i], i + 1)
        nummer = next((r for r in regels if r.basis >= VOET_Y and re.fullmatch(r"\d+", r.sleutel)), None)
        vellen.append([r for r in regels if r is not nummer])
        nummers.append(nummer)
    zet_secties(vellen)
    return vellen, nummers


def zet_secties(vellen: list[list[Regel]]) -> None:
    """Geeft elke regel het nummer van de kop waaronder hij valt ("4.1", "Inhoud", "Voorblad")."""
    sectie = "Voorblad"
    for i, regels in enumerate(vellen, 1):
        for r in regels:
            if i > 1 and r.grootte >= KOP_GROOTTE:
                m = re.match(r"^(\d+(?:\.\d+)*)\.?\s+\S", r.sleutel)
                if m:
                    sectie = m.group(1)
                elif r.grootte >= HOOFDSTUK_GROOTTE:
                    sectie = r.sleutel
            r.sectie = sectie


def beelden(pagina: fitz.Page) -> list[fitz.Rect]:
    return sorted((fitz.Rect(b["bbox"]) for b in pagina.get_image_info()), key=lambda r: (r.y0, r.x0))


# ── Vergelijken ──────────────────────────────────────────────────────────────

def _kleur(c: int) -> tuple[int, int, int]:
    return (c >> 16) & 255, (c >> 8) & 255, c & 255


def vergelijk_regel(vel: int, r: Regel, a: Regel, uit: list[Bevinding], rechts: bool = False) -> None:
    """Stijl en plaats van twee regels die bij elkaar horen."""
    if abs(r.grootte - a.grootte) > TOL_GROOTTE:
        uit.append(bevinding(vel, "stijl-grootte", r, a, f"ref {r.grootte:.1f} pt, app {a.grootte:.1f} pt"))
    if max(abs(x - y) for x, y in zip(_kleur(r.kleur), _kleur(a.kleur))) > TOL_KLEUR:
        uit.append(bevinding(vel, "stijl-kleur", r, a, f"ref #{r.kleur:06x}, app #{a.kleur:06x}"))
    if r.familie != a.familie:
        uit.append(bevinding(vel, "stijl-lettertype", r, a, f"ref {r.familie}, app {a.familie}"))
    if r.vet != a.vet:
        uit.append(bevinding(vel, "stijl-vet", r, a, f"ref {'vet' if r.vet else 'normaal'}, app {'vet' if a.vet else 'normaal'}"))
    if r.cursief != a.cursief:
        uit.append(bevinding(vel, "stijl-cursief", r, a, f"ref {'cursief' if r.cursief else 'recht'}, app {'cursief' if a.cursief else 'recht'}"))
    rx, ax = (r.x1, a.x1) if rechts else (r.x0, a.x0)
    if abs(rx - ax) > TOL_PLAATS:
        uit.append(bevinding(vel, "plaats-x", r, a, f"ref {rx / MM:.1f} mm, app {ax / MM:.1f} mm (Δ {(ax - rx) / MM:+.1f} mm)"))
    if abs(r.basis - a.basis) > TOL_PLAATS:
        uit.append(bevinding(vel, "plaats-y", r, a, f"ref {r.basis / MM:.1f} mm, app {a.basis / MM:.1f} mm (Δ {(a.basis - r.basis) / MM:+.1f} mm)"))


def vergelijk_vel(vel: int, ref: list[Regel], app: list[Regel], uit: list[Bevinding]) -> None:
    """Tekstvolgorde met difflib; bij gelijke of vervangen regels ook stijl en plaats."""
    sm = difflib.SequenceMatcher(a=[r.sleutel for r in ref], b=[a.sleutel for a in app], autojunk=False)
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            for k in range(i2 - i1):
                vergelijk_regel(vel, ref[i1 + k], app[j1 + k], uit)
            continue
        paren = min(i2 - i1, j2 - j1) if op == "replace" else 0
        for k in range(paren):
            r, a = ref[i1 + k], app[j1 + k]
            uit.append(bevinding(vel, "tekst-anders", r, a, f"app: {a.tekst!r}"))
            vergelijk_regel(vel, r, a, uit)
        for r in ref[i1 + paren:i2]:
            uit.append(bevinding(vel, "tekst-ontbreekt", r))
        for a in app[j1 + paren:j2]:
            uit.append(bevinding(vel, "tekst-extra", app=a))


def hoofdstukken(vellen: list[list[Regel]]) -> dict[str, tuple[int, Regel]]:
    """Per hoofdstukkop ("4 Uitgangspunten", ook als er "4." staat) het eerste vel."""
    uit: dict[str, tuple[int, Regel]] = {}
    for i, regels in enumerate(vellen, 1):
        if i == 1:
            continue  # het voorblad heeft een titel van 22 pt, geen hoofdstuk
        for r in regels:
            if r.grootte >= HOOFDSTUK_GROOTTE:
                uit.setdefault(re.sub(r"^(\d+)\.?\s+", r"\1 ", r.sleutel), (i, r))
    return uit


def past(afw: dict, b: Bevinding) -> bool:
    waarden = {"soort": b.soort, "sectie": b.sectie, "ref": b.ref, "app": b.app, "label": b.label, "tekst": b.tekst}
    for veld in PATROONVELDEN:
        if veld in afw:
            w = waarden[veld]
            if w is None or not re.search(afw[veld], w):
                return False
    return afw.get("vel") is None or afw["vel"] == b.vel


def vergelijk(ref_pad: str, app_pad: str, afwijkingen: list[dict], vellen: int | None = None,
              eerste_pagina: int = 1):
    """Alle bevindingen, de afwijkingen die nergens op pasten, en wat kengetallen."""
    ref_doc, app_doc = fitz.open(ref_pad), fitz.open(app_pad)
    n = min(vellen or ref_doc.page_count, ref_doc.page_count)
    ref_vellen, ref_nrs = lees(ref_doc, n)
    app_alle, app_nrs = lees(app_doc, app_doc.page_count)
    uit: list[Bevinding] = []

    for vel in range(1, n + 1):
        if vel > app_doc.page_count:
            uit.append(Bevinding(vel, "vel-ontbreekt", "", f"de app heeft maar {app_doc.page_count} vellen"))
            continue
        vergelijk_vel(vel, ref_vellen[vel - 1], app_alle[vel - 1], uit)

        rn, an = ref_nrs[vel - 1], app_nrs[vel - 1]
        if rn is not None and an is None:
            uit.append(bevinding(vel, "paginanummer", rn, detail="ontbreekt in de app"))
        elif rn is not None and an is not None:
            verwacht = str(vel + eerste_pagina - 1)
            if an.sleutel != verwacht:
                uit.append(bevinding(vel, "paginanummer", rn, an, f"app {an.sleutel}, verwacht {verwacht}"))
            vergelijk_regel(vel, rn, an, uit, rechts=True)

        rb, ab = beelden(ref_doc[vel - 1]), beelden(app_doc[vel - 1])
        if len(rb) != len(ab):
            uit.append(Bevinding(vel, "beeld", "", "afbeeldingen", detail=f"ref {len(rb)}, app {len(ab)}",
                                 rrect=rb[0] if rb else None, arect=ab[0] if ab else None))
        for r, a in zip(rb, ab):
            d = max(abs(r.x0 - a.x0), abs(r.y0 - a.y0), abs(r.x1 - a.x1), abs(r.y1 - a.y1))
            if d > TOL_PLAATS:
                uit.append(Bevinding(vel, "beeld", "", "afbeelding", rrect=r, arect=a,
                                     detail=f"ref {tuple(round(v / MM, 1) for v in r)} mm, app {tuple(round(v / MM, 1) for v in a)} mm"))

    ref_h, app_h = hoofdstukken(ref_vellen), hoofdstukken(app_alle)
    for k, (vel, r) in ref_h.items():
        if k not in app_h:
            uit.append(bevinding(vel, "hoofdstuk-ontbreekt", r))
        elif app_h[k][0] != vel:
            uit.append(bevinding(vel, "hoofdstuk-vel", r, app_h[k][1], f"ref vel {vel}, app vel {app_h[k][0]}"))

    gebruikt = [False] * len(afwijkingen)
    for b in uit:
        for i, afw in enumerate(afwijkingen):
            if past(afw, b):
                b.bewust = afw["reden"]
                gebruikt[i] = True
                break
    onbenut = [a for a, g in zip(afwijkingen, gebruikt) if not g]
    uit.sort(key=lambda b: (b.vel, b.soort))
    return uit, onbenut, {"vellen": n, "app_paginas": app_doc.page_count}


def lees_afwijkingen(pad: str) -> list[dict]:
    lijst = json.loads(Path(pad).read_text(encoding="utf-8"))
    if not isinstance(lijst, list):
        raise SystemExit(f"{pad}: verwacht een JSON-lijst")
    for i, afw in enumerate(lijst, 1):
        onbekend = set(afw) - set(PATROONVELDEN) - {"vel", "reden"}
        if onbekend:
            raise SystemExit(f"{pad}, afwijking {i}: onbekende sleutel(s) {sorted(onbekend)}")
        if not str(afw.get("reden", "")).strip():
            raise SystemExit(f"{pad}, afwijking {i}: 'reden' ontbreekt")
        if not any(k in afw for k in PATROONVELDEN) and afw.get("vel") is None:
            raise SystemExit(f"{pad}, afwijking {i}: geen enkel patroon, zou alles goedkeuren")
        for k in PATROONVELDEN:
            if k in afw:
                re.compile(afw[k])
    return lijst


# ── Uitvoer ──────────────────────────────────────────────────────────────────

def _op(rect: fitz.Rect, bron: fitz.Rect, doel: fitz.Rect) -> fitz.Rect:
    sx, sy = doel.width / bron.width, doel.height / bron.height
    return fitz.Rect(doel.x0 + (rect.x0 - bron.x0) * sx, doel.y0 + (rect.y0 - bron.y0) * sy,
                     doel.x0 + (rect.x1 - bron.x0) * sx, doel.y0 + (rect.y1 - bron.y0) * sy)


def naast_elkaar(ref_pad: str, app_pad: str, bevindingen: list[Bevinding], n: int, uit: str) -> None:
    """Per vel links de referentie en rechts de app; open bevindingen rood, bewuste oranje."""
    ref_doc, app_doc = fitz.open(ref_pad), fitz.open(app_pad)
    doc = fitz.open()
    marge, band = 12.0, 18.0
    per_vel: dict[int, list[Bevinding]] = defaultdict(list)
    for b in bevindingen:
        per_vel[b.vel].append(b)
    for vel in range(1, max(n, app_doc.page_count) + 1):
        rp = ref_doc[vel - 1] if vel <= n else None
        ap = app_doc[vel - 1] if vel <= app_doc.page_count else None
        rr = rp.rect if rp else fitz.Rect(0, 0, 595.3, 841.9)
        ar = ap.rect if ap else fitz.Rect(0, 0, 595.3, 841.9)
        pagina = doc.new_page(width=rr.width + ar.width + 3 * marge, height=max(rr.height, ar.height) + band + 2 * marge)
        links = fitz.Rect(marge, marge + band, marge + rr.width, marge + band + rr.height)
        rechts = fitz.Rect(2 * marge + rr.width, marge + band, 2 * marge + rr.width + ar.width, marge + band + ar.height)
        if rp:
            pagina.show_pdf_page(links, ref_doc, vel - 1)
        if ap:
            pagina.show_pdf_page(rechts, app_doc, vel - 1)
        pagina.draw_rect(links, color=(0.6, 0.6, 0.6), width=0.5)
        pagina.draw_rect(rechts, color=(0.6, 0.6, 0.6), width=0.5)
        open_n = sum(1 for b in per_vel[vel] if not b.bewust)
        pagina.insert_text((marge, marge + 12), f"referentie - vel {vel}" if rp else "referentie - geen vel", fontsize=9)
        kop = f"app - vel {vel}" + (f" - {open_n} open" if rp else " - niet vergeleken")
        pagina.insert_text((rechts.x0, marge + 12), kop, fontsize=9)
        for b in per_vel[vel]:
            kleur = (0.95, 0.55, 0.0) if b.bewust else (0.85, 0.0, 0.0)
            if b.rrect is not None and rp:
                pagina.draw_rect(_op(b.rrect, rr, links), color=kleur, width=0.8)
            if b.arect is not None and ap:
                pagina.draw_rect(_op(b.arect, ar, rechts), color=kleur, width=0.8)
    doc.save(uit, garbage=3, deflate=True)


def druk_af(bevindingen: list[Bevinding], onbenut: list[dict], info: dict) -> None:
    per_vel: dict[int, list[Bevinding]] = defaultdict(list)
    for b in bevindingen:
        per_vel[b.vel].append(b)
    for vel in sorted(per_vel):
        print(f"== vel {vel}")
        for b in per_vel[vel]:
            merk = "bewust" if b.bewust else "OPEN  "
            regel = f"  {merk} {b.soort:<19} [{b.sectie}] {b.tekst[:60]!r}"
            if b.detail:
                regel += f"  {b.detail}"
            if b.bewust:
                regel += f"  ({b.bewust})"
            print(regel)
    open_n = sum(1 for b in bevindingen if not b.bewust)
    print()
    print(f"{info['vellen']} vellen vergeleken; de app heeft {info['app_paginas']} vellen"
          + (f" (vel {info['vellen'] + 1} en verder, bijlage A, niet vergeleken)" if info["app_paginas"] > info["vellen"] else ""))
    print(f"{open_n} open, {len(bevindingen) - open_n} bewust")
    for afw in onbenut:
        print(f"let op: afwijking zonder treffer: {afw['reden']}")


def main(argv: list[str] | None = None) -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description="Vergelijk de rapport-PDF van de app met de referentie-PDF.")
    ap.add_argument("referentie")
    ap.add_argument("app")
    ap.add_argument("--afwijkingen", required=True, help="JSON-lijst met bewuste afwijkingen")
    ap.add_argument("--uit", help="PDF met per vel referentie en app naast elkaar")
    ap.add_argument("--vellen", type=int, help="alleen de eerste n vellen van de referentie")
    ap.add_argument("--eerste-pagina", type=int, default=1, help="het paginanummer op vel 1 van de app")
    a = ap.parse_args(argv)
    afwijkingen = lees_afwijkingen(a.afwijkingen)
    bevindingen, onbenut, info = vergelijk(a.referentie, a.app, afwijkingen, a.vellen, a.eerste_pagina)
    druk_af(bevindingen, onbenut, info)
    if a.uit:
        naast_elkaar(a.referentie, a.app, bevindingen, info["vellen"], a.uit)
        print(f"naast elkaar: {a.uit}")
    return 1 if any(not b.bewust for b in bevindingen) else 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Draai de toets (moet slagen)**

Run: `python "$RR/test_vergelijk.py"`
Verwacht, exitcode 0:

```
ok    test_zelf
ok    test_verschillen
ok    test_bewust
ok    test_afwijkingen_controle
ok    test_cli
```

- [ ] **Step 5: Controleer het script op de referentie zelf**

De referentie-PDF begint bij paginanummer 3; tegen zichzelf vergeleken mag er niets te melden zijn.

```bash
echo '[]' > "$TMP/leeg.json"
python "$RR/vergelijk.py" "$RR/referentie-C1-C3.pdf" "$RR/referentie-C1-C3.pdf" --afwijkingen "$TMP/leeg.json" --eerste-pagina 3; echo "exit $?"
```

Verwacht: `13 vellen vergeleken; de app heeft 13 vellen`, `0 open, 0 bewust`, `exit 0`.

- [ ] **Step 6: Schrijf de lijst met bewuste afwijkingen**

Create `$RR/afwijkingen.json` met precies de afwijkingen uit de spec ("Bewust anders dan de
referentie") en de keuzes uit het contract (één kopgrootte per niveau, één regel voor
opsommingen, rekenbladen in hoofdstuk 6):

```json
[
  {
    "sectie": "^4\\.1$",
    "label": "^Ontwerplevensduur",
    "soort": "^tekst-",
    "reden": "levensduurklasse volgens NEN-EN 1990 NB tabel NB.1–2.1 (50 jaar → 3); de referentie gebruikt tabel 2.1 zonder NB"
  },
  {
    "sectie": "^4\\.1$",
    "label": "^(β|KFI)$",
    "soort": "^tekst-",
    "reden": "β en K_FI volgens NEN-EN 1990 tabel B2 en B3; de referentie laat β leeg en toont een K_FI die niet bij de gevolgklasse hoort"
  },
  {
    "sectie": "^4\\.1$",
    "label": "^(Ontwerp en berekeningssupervisie|Inspectie tijdens uitvoering)$",
    "soort": "^tekst-",
    "reden": "supervisie volgens tabel B4 (DSL) en inspectieniveau volgens tabel B5 (IL); de referentie zet DSL bij de inspectie"
  },
  {
    "sectie": "^4\\.5$",
    "soort": "^tekst-",
    "reden": "belastingfactoren volgens NEN-EN 1990 NB tabel NB.3, NB.4 en NB.5 bij de gevolgklasse; de referentie wijkt daarvan af en heeft typfouten in kop en tabel"
  },
  {
    "sectie": "^5\\.2$",
    "label": "^qp$",
    "soort": "^tekst-extra$",
    "reden": "q_p wordt berekend zoals in de gordingmodule; de referentie laat hem leeg"
  },
  {
    "sectie": "^5\\.2$",
    "ref": "^0,00$",
    "soort": "^tekst-anders$",
    "reden": "P_rep = c · q_p wordt berekend; de referentie toont 0,00 door de lege q_p"
  },
  {
    "ref": "^[45]\\. ",
    "soort": "^tekst-anders$",
    "reden": "hoofdstukkoppen 4 en 5 zonder punt, gelijk aan de andere hoofdstukken"
  },
  {
    "ref": "^4\\.12 Aardbeving$",
    "soort": "^tekst-anders$",
    "reden": "kop gelijk aan de inhoudsopgave (Aardbevingen)"
  },
  {
    "ref": "^5\\.1 Sneeuwbelasting$",
    "soort": "^tekst-anders$",
    "reden": "kop gelijk aan de inhoudsopgave (Sneeuwbelastingen(Q))"
  },
  {
    "sectie": "^5\\.4$",
    "ref": "^Cateorie ",
    "soort": "^tekst-anders$",
    "reden": "typfout in de referentie gecorrigeerd"
  },
  {
    "sectie": "^5\\.4$",
    "label": "^Dak plat Qk$",
    "soort": "^tekst-anders$",
    "reden": "Q_k voor een plat dak volgens NEN-EN 1991-1-1 NB tabel NB.4-6.10"
  },
  {
    "sectie": "^Inhoud$",
    "ref": "computeruitdraai",
    "soort": "^tekst-anders$",
    "reden": "bijlage A heet in de app 'Uitgebreide uitwerking berekeningen'"
  },
  {
    "sectie": "^Voorblad$",
    "ref": "^Datum Wijz$",
    "soort": "^tekst-anders$",
    "reden": "label gecorrigeerd tot 'Datum wijz.'"
  },
  {
    "sectie": "^(3\\.2|4\\.10)$",
    "app": "^-",
    "soort": "^plaats-x$",
    "reden": "de app laat elke opsommingsregel één kolom inspringen; de referentie doet dat alleen in hoofdstuk 1"
  },
  {
    "sectie": "^3\\.2$",
    "ref": "^(Bestaande situatie|Verbouw, renovatie|Nieuwbouw)$",
    "soort": "^stijl-grootte$",
    "reden": "blokkoppen overal 11 pt; de referentie zet ze in 3.2 op 10 pt en in 3.1 op 11 pt"
  },
  {
    "sectie": "^6\\.2$",
    "soort": "^tekst-(ontbreekt|anders)$",
    "reden": "de tabellen q1 en q2 in 6.2 zijn handwerk in de referentie; de app toont per blad de samenvatting en de toelichting"
  },
  {
    "sectie": "^6(\\.\\d+)?$",
    "soort": "^(tekst-extra|plaats-y)$",
    "reden": "de app zet per blad een automatische samenvatting en een verwijzing naar bijlage A in hoofdstuk 6"
  }
]
```

Controleer de lijst op de referentie zelf (ze mag niets verbergen; alle regels zijn daar zonder
treffer):

```bash
python "$RR/vergelijk.py" "$RR/referentie-C1-C3.pdf" "$RR/referentie-C1-C3.pdf" --afwijkingen "$RR/afwijkingen.json" --eerste-pagina 3 | tail -3
```

Verwacht: `0 open, 0 bewust` en daarna regels `let op: afwijking zonder treffer: …`.

- [ ] **Step 7: Maak de app-PDF van het verificatieproject**

```bash
node scripts/rapport-pdf.mjs "$RR/verificatie.ifccalculation" "$RR/app-C1-C3.pdf" --bureau "$RR/verificatie-bureau.json"; echo "exit $?"
```

Verwacht: de logregels van Task 34 met `geladen: 3 bladen, bureau "…"` en `PDF geschreven: …`,
`exit 0`.

- [ ] **Step 8: Vergelijk**

```bash
python "$RR/vergelijk.py" "$RR/referentie-C1-C3.pdf" "$RR/app-C1-C3.pdf" --afwijkingen "$RR/afwijkingen.json" --uit "$RR/naast-elkaar.pdf"; echo "exit $?"
```

Uitvoer: per vel de bevindingen (`OPEN` of `bewust` met reden), daarna
`13 vellen vergeleken; de app heeft <m> vellen (vel 14 en verder, bijlage A, niet vergeleken)`,
`<o> open, <b> bewust`, en eventueel `let op: afwijking zonder treffer: …`. Open
`$RR/naast-elkaar.pdf`: open bevindingen zijn rood omlijnd, bewuste oranje.

- [ ] **Step 9: Werk de open bevindingen weg**

Herhaal Step 7 en 8 tot de uitvoer `0 open` meldt en er geen regel `afwijking zonder treffer`
meer staat. Per open bevinding:

1. Staat de afwijking in de spec onder "Bewust anders dan de referentie" maar vangt geen regel
   hem? Voeg een zo smal mogelijke regel toe aan `$RR/afwijkingen.json` (altijd met `sectie` en
   `ref`, `app` of `label`) met de reden.
2. Komt hij door een fout in de afbeelding van Task 35 (verkeerde rij of kolom)? Pas
   `maak-verificatieproject.py` aan en draai Task 35 Step 2 opnieuw.
3. Anders is het een fout in de afdruk: repareer die in
   `packages/desktop/src/components/rapport/afdruk/*.tsx`, `RapportAfdruk.css`,
   `components/calc/PrintDocument.tsx` of `components/calc/paginering.ts`. Draai
   `npx tsc --noEmit -p packages/desktop`, controleer het afdrukvoorbeeld van de knoop Rapport in
   de app op `http://localhost:3021`, en commit elke reparatie apart met alleen de gewijzigde
   bestanden. De placeholders `<gewijzigde bestanden>` en `<wat er nu gelijk is aan de referentie>`
   vul je per reparatie zelf in:

   ```bash
   git add <gewijzigde bestanden>
   git commit -m "$(cat <<'EOF'
   fix(rapport): <wat er nu gelijk is aan de referentie>

   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   EOF
   )"
   ```

Een regel die `afwijking zonder treffer` meldt, gaat uit de lijst (voor 5.4 "Dak plat Qk" is dat
het geval als de referentie de NB-waarde al toont). Let bij de eerste runs op vel 10 en 11: de
referentie begint de groep "WANDEN" van 5.5 op een nieuw vel. Loopt die in de app door, dan geeft
dat tekstverschillen op beide vellen; dat is geen bewuste afwijking en wordt in de afdruk van 5.5
opgelost.

- [ ] **Step 10: Eindcontrole**

```bash
npx tsc --noEmit -p packages/desktop
npm run check
python "$RR/vergelijk.py" "$RR/referentie-C1-C3.pdf" "$RR/app-C1-C3.pdf" --afwijkingen "$RR/afwijkingen.json" | tail -2
git status --short
```

Verwacht: tsc zonder uitvoer; `npm run check` groen (inclusief `check-rapport.mjs`);
`13 vellen vergeleken; …` en `0 open, <b> bewust` zonder regels `zonder treffer`; `git status`
toont alleen ` M packages/desktop/.gitignore`. Niets uit `$RR` wordt gecommit.

---

### Task 37: `docs/projectmodel.md` — sectie Rapport

**Files:**
- Modify: `docs/projectmodel.md:100-103` (Het bestand), `:118-123` (Exporteren), na `:137` (nieuwe sectie `## Rapport` vóór `## Ongedaan maken`), `:155-156` (Ongedaan maken)

**Interfaces:**
- Consumes: `RAPPORT_ID` (`store/projectStore.ts`), `printStore.soort`, `rapport.*`-velden uit `rapport/model.ts`, `rapport/opzet.ts`, `rapport/normwaarden.ts`, `rapport/opbouw.ts`, `rapport/standaardteksten.ts`, `store/bureauProfiel.ts`, `components/rapport/afdruk/`, `scripts/check-rapport.mjs`, `scripts/rapport-pdf.mjs`, `scripts/maak-rapport-voorbeeld.mjs`, `scripts/fixtures/rapport-voorbeeld.ifccalculation`
- Produces: documentatie; geen code.

- [ ] **Step 1: Controleer dat alle genoemde bestanden bestaan (moet nu slagen; faalt als een eerdere taak een ander pad koos)**

```bash
for f in packages/desktop/src/rapport/model.ts packages/desktop/src/rapport/opzet.ts \
  packages/desktop/src/rapport/normwaarden.ts packages/desktop/src/rapport/opbouw.ts \
  packages/desktop/src/rapport/standaardteksten.ts packages/desktop/src/store/bureauProfiel.ts \
  packages/desktop/src/components/rapport/afdruk scripts/check-rapport.mjs scripts/rapport-pdf.mjs \
  scripts/maak-rapport-voorbeeld.mjs scripts/fixtures/rapport-voorbeeld.ifccalculation; do
  test -e "$f" || echo "ontbreekt: $f"; done
grep -c 'RAPPORT_ID = "__rapport__"' packages/desktop/src/store/projectStore.ts
```

Verwacht: geen regels `ontbreekt:` en daarna `1`.

- [ ] **Step 2: Werk de sectie "Het bestand" bij**

In `docs/projectmodel.md`, vervang:

```markdown
- `project` — de eigenlijke inhoud: projectgegevens plus alle exemplaren.

Een bestand zonder `project` (een oudere versie, of een `.cpd`) wordt geopend
als een project met één exemplaar, zodat er nooit werk verloren gaat.
```

door:

```markdown
- `project` — de eigenlijke inhoud: projectgegevens, alle exemplaren en het
  rapport (`project.rapport`, zie [Rapport](#rapport)).

Een bestand zonder `project` (een oudere versie, of een `.cpd`) wordt geopend
als een project met één exemplaar, zodat er nooit werk verloren gaat. Een
bestand zonder `rapport` krijgt bij het openen een rapport met de
standaardwaarden.
```

- [ ] **Step 3: Werk de sectie "Exporteren" bij**

Vervang:

```markdown
`PDF opslaan` (en de Print-knop, en Ctrl+P) bouwt het hele project op als één
afdrukbaar document: een voorblad uit de projectgegevens, een inhoudsopgave,
daarna elk blad op een eigen pagina — met **het parametrische beeld** erboven en
de uitwerking eronder. Drie balklagen leveren dus drie hoofdstukken op, niet
alleen degene die toevallig openstond. In de printdialoog kies je "Opslaan als
PDF".
```

door:

```markdown
`Rapport (PDF)` in het lint drukt het hele project af als constructierapport;
zie [Rapport](#rapport). Elk blad staat daarin met **het parametrische beeld**
erboven en de uitwerking eronder, in hoofdstuk 6 of in bijlage A. Drie balklagen
leveren dus drie uitwerkingen op, niet alleen degene die toevallig openstond.
`PDF blad` drukt alleen het open blad af, als losse berekening. De Print-knop en
Ctrl+P drukken af wat het open afdrukvoorbeeld toont, en anders het rapport. In
de printdialoog kies je "Opslaan als PDF".
```

- [ ] **Step 4: Voeg de sectie "Rapport" toe**

Vervang:

```markdown
`openaec-reports`-repo is de app niet eens te bouwen.

## Ongedaan maken
```

door:

```markdown
`openaec-reports`-repo is de app niet eens te bouwen.

## Rapport

Een project wordt opgeleverd als constructierapport: voorblad, inhoud,
inleiding, projectgegevens, toelichting op de constructie, uitgangspunten,
belastingen en de berekeningen, met de volledige uitwerking van elk blad in
bijlage A. Dat rapport hoort bij het project en staat in hetzelfde bestand
(`project.rapport`, typen en standaardwaarden in `rapport/model.ts`).

In de projectboom staat onder *Projectgegevens* een vaste knoop **Rapport**
(`RAPPORT_ID` in `store/projectStore.ts`). Die opent twee tabs: het
rapportpaneel, één scrollend formulier voor alles wat alleen in het rapport
staat, en het afdrukvoorbeeld van het hele rapport.

### Wat er wél en níét in staat

Het rapport bewaart alleen wat nergens anders staat: documentgegevens en
revisies, de teksten, de invoer van de uitgangspunten (hoofdstuk 4) en de
belastingen (hoofdstuk 5), een toelichting per blad, eigen bijlagen en een
vastgelegde kopie van het bureauprofiel.

Wat al in de projectgegevens staat — projectnummer en -naam, opdrachtgever,
locatie, CC, RC, ontwerplevensduur, windgebied, terreincategorie — wordt daar
gelezen en niet gekopieerd. Het is dezelfde kern als bovenaan dit document: één
plek per gegeven. Zet je de gevolgklasse op CC3, dan volgen K_FI in 4.1, de
belastingfactoren in 4.5 en elk rekenblad tegelijk.

Afgeleide normwaarden (β, K_FI, supervisie- en inspectieniveau, de factoren van
4.5, q_p, de sommen van de opbouwen) worden niet opgeslagen maar bij het opmaken
berekend (`rapport/normwaarden.ts`, `rapport/opbouw.ts`). Invoer staat als
tekst, net als bij de projectgegevens: wat je typt ("0,56") blijft staan.

### Indeling

De hoofdstukken en paragrafen staan in één definitie, `rapport/opzet.ts`. Een
optioneel onderdeel zonder inhoud valt weg en de nummering schuift door; zo
krijgt een nieuwbouwproject geen lege paragraaf "Bestaande situatie". Per
hoofdstuk en paragraaf kun je een nieuw vel afdwingen (`rapport.nieuwePagina`).

Hoofdstuk 6 heeft per blad een paragraaf met de automatische samenvatting en je
eigen toelichting (`rapport.toelichting`, per exemplaar-id). De uitwerking zelf
— kop, parametrisch beeld, berekening, precies als bij `PDF blad` — komt in
bijlage A, tenzij je voor dat blad kiest voor de uitwerking in het hoofdstuk
(`rapport.inHoofdstuk`).

### Bureauprofiel en teksten

Naam, adres, logo, voetafbeelding, huisstijl en constructeurs staan in de
instellingen (tab *Bureau*, `store/bureauProfiel.ts`), niet in het project: ze
gelden voor elk rapport. Een nieuw rapport gebruikt het profiel uit de
instellingen; *Bijwerken uit bureauprofiel* in het paneel legt er een kopie van
vast (`rapport.bureau`). Daarna verandert een opgeleverd rapport niet meer als
het profiel later verandert; nog eens bijwerken haalt de nieuwe versie bewust
binnen. Het is dezelfde reden als bij de eigen kopie van de rekentekst van een
exemplaar.

Teksten kies je uit varianten: de neutrale die de app meelevert
(`rapport/standaardteksten.ts`) en je eigen, bewaard in de instellingen
(`rapportTeksten`). In een tekst werken de invulvelden `{adviseur}`,
`{projectnummer}`, `{projectnaam}`, `{opdrachtgever}`, `{locatie}`,
`{verantwoordelijk}` en `{uitvoerend}`; een leeg veld wordt "—". Een regel die
met "-" begint is een opsommingsregel, een lege regel begint een nieuwe alinea.

### Afdrukken

`Rapport (PDF)` drukt het hele rapport af; `PDF blad` blijft de losse
berekening van het open blad. De printstore houdt bij welke van de twee
(`soort: "bladen" | "rapport"`). Het rapport heeft een eigen benoemde pagina
(`@page rapport`) met de marges en de voet van de huisstijl, zodat de opmaak van
een los blad ongemoeid blijft.

Net als bij de bladen tonen de afdruk en het voorbeeld dezelfde weergave
(`components/rapport/afdruk/`); het voorbeeld verdeelt hem zelf over vellen. Een
hoofdstuk dat op een nieuw vel begint is daarom een eigen `section`, en koppen
zijn `h1`–`h4`, zodat een kop niet alleen onderaan een vel blijft staan.

### Ongedaan maken in het rapport

Het rapport zit in dezelfde geschiedenis als de rest van het project (zie
hieronder). Doortypen in één veld telt als één stap; een revisie, tabelregel,
laag of bijlage toevoegen of verwijderen is altijd een eigen stap.

### Controle

- `scripts/check-rapport.mjs` (onderdeel van `npm run check`) toetst de logica
  zonder browser: nummering en weglaten, inhoudsopgave, invulvelden,
  revisiecodes, de normwaarden per gevolgklasse, q_p tegen de gordingmodule en
  de sommen van de opbouwen.
- `node scripts/rapport-pdf.mjs <projectbestand> <uit.pdf>` maakt zonder
  printdialoog een PDF van het rapport, met een geïnstalleerde Chrome of Edge
  headless tegen de draaiende dev-server. Het heeft een gebouwde core nodig en
  gebruikt de dev-haak `window.__ocs` uit `main.tsx`. Met `--bureau
  profiel.json` geldt een ander bureauprofiel.
- `scripts/fixtures/rapport-voorbeeld.ifccalculation` is een verzonnen project
  om dat mee te proberen. Maak het opnieuw met
  `node scripts/maak-rapport-voorbeeld.mjs` zodra een sjabloon of het
  rapportmodel verandert; `--controleer` meldt of het nog klopt.

De opmaak is vel voor vel vergeleken met een referentierapport. Die vergelijking
en het referentierapport blijven buiten de repo: er staan project-, klant- en
persoonsgegevens in.

## Ongedaan maken
```

- [ ] **Step 5: Werk de sectie "Ongedaan maken" bij**

Vervang:

```markdown
Een momentopname bewaart alleen verwijzingen naar `exemplaren` en `gegevens`.
Omdat elke mutatie een nieuw object maakt en de rest ongemoeid laat, delen
```

door:

```markdown
Een momentopname bewaart alleen verwijzingen naar `exemplaren`, `gegevens` en
`rapport`. Omdat elke mutatie een nieuw object maakt en de rest ongemoeid laat, delen
```

- [ ] **Step 6: Controleer het resultaat**

```bash
grep -n '^## ' docs/projectmodel.md
grep -c '(#rapport)' docs/projectmodel.md
```

Verwacht: de koppen in de volgorde `## De kern in één regel`, `## Exemplaren`,
`## Projectgegevens`, `## De grens wordt bewaakt`, `## Het bestand`,
`## Koppeling met een model`, `## Exporteren`, `## Rapport`, `## Ongedaan maken`,
`## Wat er verdwenen is`; daarna `2` (de verwijzingen vanuit "Het bestand" en "Exporteren").
Lees de nieuwe sectie in een Markdown-weergave na: de lijst onder "Controle" heeft drie punten
en er staan geen namen van bureaus, personen of externe programma's in.

- [ ] **Step 7: Commit**

```bash
git add docs/projectmodel.md
git commit -m "$(cat <<'EOF'
docs(projectmodel): het rapport in het projectmodel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```
