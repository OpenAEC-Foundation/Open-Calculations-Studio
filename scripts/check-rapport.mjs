/**
 * Controlescript voor de logica van het constructierapport
 * (packages/desktop/src/rapport/): alles wat zonder React te toetsen is.
 *
 *   model.ts        standaardrapport; normaliseren van een rapport uit een bestand
 *                   (onbekende velden weg, verkeerde typen en lege invoer →
 *                   standaard, lijsten per element gecontroleerd)
 *   pad.ts          onveranderlijk zetten op een pad
 *   revisies.ts     volgende revisiecode, rapportstatus, datums
 *   invullen.ts     invulvelden ({adviseur}, …) en tekstregels
 *   normwaarden.ts  K_FI, β, DSL/IL, levensduurklasse, belastingfactoren per CC,
 *                   norm uit het bouwjaar, belastingcategorieën, sneeuw 0,56 en
 *                   q_p tegen de referentiewaarden van scripts/check-gording.mjs
 *   opbouw.ts       sommen van vlak- en gevelopbouwen, afgerond zoals de referentie
 *   gewichten.ts    bibliotheek met gewichten: eenheden en orde van grootte, sommen
 *                   van de opbouwen, invoegen als laag, opbouw of gevellaag
 *   standaardteksten.ts, opzet.ts
 *                   standaardteksten per tekst-id, nummering met weglaten van lege
 *                   onderdelen, inhoudsopgave en bijlagen
 *
 * Node 24 laadt de .ts-bestanden rechtstreeks (typen worden weggestreept), dus
 * er is geen build nodig. Daarom importeert src/rapport/ waarden alleen binnen
 * de map (met extensie .ts) en uit ../store/projectGegevens.ts.
 *
 * Draaien:  node scripts/check-rapport.mjs
 */
import { leegBureau, normaliseerRapport, standaardRapport, STANDAARD_HUISSTIJL } from "../packages/desktop/src/rapport/model.ts";
import { leesPad, zetOpPad } from "../packages/desktop/src/rapport/pad.ts";
import { datumTekst, eersteDatum, laatsteRevisie, rapportStatus, volgendeCode } from "../packages/desktop/src/rapport/revisies.ts";
import { INVULVELDEN, tekstRegels, vulIn } from "../packages/desktop/src/rapport/invullen.ts";
import {
  belastingfactorTabel, beta, categorie, CATEGORIEEN, dakQk, fmt, getal, inspectieniveau, kFiVoor,
  klasse, levensduurklasse, normVoorBouwjaar, ontwerpSupervisie, PSI_WIND, rond, sneeuwPlatDak,
  windLabel, windQp,
} from "../packages/desktop/src/rapport/normwaarden.ts";
import { gevelOpbouw, leesVulling, vlakOpbouw, vullingTekst } from "../packages/desktop/src/rapport/opbouw.ts";
import {
  alsGevellaag, alsLaag, alsOpbouw, LAAGGROEPEN, laaggroepenVoor, OPBOUWEN, opbouwenVoor, omschrijving, somVan, voegToe,
} from "../packages/desktop/src/rapport/gewichten.ts";
import { STANDAARD_IN_NIEUW_RAPPORT, STANDAARD_TEKSTEN, standaardTeksten } from "../packages/desktop/src/rapport/standaardteksten.ts";
import { bijlagen, bouwOpzet, inhoudsopgave, OPZET, TEKST_IDS } from "../packages/desktop/src/rapport/opzet.ts";

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
  gelijk("H-dak", [h?.soort, h?.qk, h?.Qk, h?.psi], ["dak", 1.0, 2.0, [0, 0, 0]]);
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

// ── gewichten.ts ────────────────────────────────────────────────────────────
kop("gewichten.ts — bibliotheek: eenheden en orde van grootte");
{
  const lagen = LAAGGROEPEN.flatMap((g) => g.lagen);
  const alle = [...lagen, ...OPBOUWEN.flatMap((o) => o.lagen)];
  const namen = (lijst) => lijst.map((l) => l.naam);
  // Een verwisselde eenheid (kg/m³ in plaats van kN/m³, mm in plaats van m)
  // valt hier meteen buiten.
  gelijk("p tussen 0 en 8 kN/m²", namen(alle.filter((l) => l.p !== undefined && !(l.p > 0 && l.p <= 8))), []);
  gelijk("ρ tussen 0,3 en 80 kN/m³", namen(alle.filter((l) => l.rho !== undefined && !(l.rho >= 0.3 && l.rho <= 80))), []);
  gelijk("d tussen 0 en 0,5 m", namen(alle.filter((l) => l.d !== undefined && !(l.d > 0 && l.d <= 0.5))), []);
  gelijk("elke laag heeft p of ρ", namen(alle.filter((l) => l.p === undefined && l.rho === undefined)), []);
  gelijk("p naast d en ρ: hooguit d × ρ (een vullingsgraad, geen toeslag)",
    namen(alle.filter((l) => l.p !== undefined && l.d !== undefined && l.rho !== undefined && l.p > l.d * l.rho + 1e-9)), []);

  // Door de kanalen weegt een kanaalplaatvloer duidelijk minder dan massief
  // beton van dezelfde dikte, maar niet minder dan 40% ervan; per reeks is hij
  // zwaarder naarmate hij dikker is. Een tikfout in een gewicht valt zo op.
  const reeksen = new Map();
  for (const l of LAAGGROEPEN.find((g) => g.naam === "Vloerelementen").lagen) {
    const m = /^(kanaalplaatvloer.*?) (\d+) mm$/.exec(l.naam);
    if (!m) continue;
    const h = Number(m[2]) / 1000;
    toets(`${l.naam}: ${fmt(l.p / (h * 25) * 100, 0)}% van massief beton (40–85%)`,
      l.p >= 0.4 * h * 25 && l.p <= 0.85 * h * 25);
    reeksen.set(m[1], [...(reeksen.get(m[1]) ?? []), { h, p: l.p }]);
  }
  for (const [reeks, lijst] of reeksen) {
    toets(`${reeks}: zwaarder naarmate dikker`, lijst.every((x, i) => i === 0 || (x.h > lijst[i - 1].h && x.p > lijst[i - 1].p)));
  }

  const dubbel = (lijst) => lijst.filter((n, i) => lijst.indexOf(n) !== i);
  gelijk("namen van lagen uniek", dubbel(namen(lagen)), []);
  gelijk("namen van opbouwen uniek", dubbel(OPBOUWEN.map((o) => o.naam)), []);
  gelijk("elke laag uit een opbouw ook los te kiezen", namen(OPBOUWEN.flatMap((o) => o.lagen).filter((l) => !lagen.includes(l))), []);
  gelijk("elke groep heeft lagen en bouwdelen",
    LAAGGROEPEN.filter((g) => g.lagen.length === 0 || g.bouwdelen.length === 0).map((g) => g.naam), []);
  gelijk("opbouwen per bouwdeel", ["vloer", "dak", "wand"].map((b) => opbouwenVoor([b]).length > 0), [true, true, true]);
  gelijk("vloeren en daken zonder wanden", opbouwenVoor(["vloer", "dak"]).filter((o) => o.bouwdeel === "wand").length, 0);
  gelijk("laaggroepen bij wanden", laaggroepenVoor(["wand"]).map((g) => g.naam),
    ["Houtskeletbouw", "Glazen puien en daken", "Steenachtige materialen", "Metalen", "Afwerking"]);
}

kop("gewichten.ts — sommen en invoegen");
{
  const opbouw = (naam) => OPBOUWEN.find((o) => o.naam === naam);
  const laag = (naam) => LAAGGROEPEN.flatMap((g) => g.lagen).find((l) => l.naam === naam);

  // De opbouwen met meer lagen tegen de sommen in het gewichtenoverzicht.
  bijna("HSB-binnenwand met gipsplaat: 0,431", somVan(opbouw("HSB-binnenwand met gipsplaat")), 0.431, 1e-9);
  bijna("HSB-binnenwand natte ruimte: 0,375", somVan(opbouw("HSB-binnenwand natte ruimte")), 0.375, 1e-9);
  bijna("glazen pui: 0,754 (overzicht 0,75364)", somVan(opbouw("Glazen pui")), 0.75364, 0.001);
  gelijk("kanaalplaatvloer 200 mm: één laag van 3,03", alsOpbouw(opbouw("Kanaalplaatvloer 200 mm")),
    { soort: "vlak", naam: "Kanaalplaatvloer 200 mm", lagen: [{ naam: "kanaalplaatvloer 200 mm", d: "", rho: "", p: "3,03" }] });

  gelijk("als laag: d en ρ", alsLaag(laag("OSB/3")), { naam: "OSB/3", d: "0,010", rho: "6,0", p: "" });
  gelijk("als laag: p met vulling gaat voor d × ρ", alsLaag(laag("HSB-stijlwerk, vulling 9%")),
    { naam: "HSB-stijlwerk, vulling 9%", d: "0,100", rho: "5,0", p: "0,045" });
  gelijk("als laag: alleen ρ, dikte leeg", alsLaag(laag("staal")), { naam: "staal", d: "", rho: "78,5", p: "" });
  const wand = alsOpbouw(opbouw("HSB-binnenwand met gipsplaat"));
  gelijk("als opbouw: zes lagen", wand.lagen.map((l) => l.naam),
    ["gipsplaat", "OSB/3", "HSB-stijlwerk, vulling 9%", "isolatie", "OSB/3", "gipsplaat"]);
  gelijk("als opbouw: totaal in het rapport 0,43", fmt(vlakOpbouw(wand.lagen).som, 2), "0,43");
  wand.lagen[0].p = "9";
  gelijk("als opbouw: eigen kopie, de bibliotheek blijft", alsLaag(laag("gipsplaat")).p, "");

  const gevellaag = alsGevellaag(opbouw("Glazen pui"));
  gelijk("als gevellaag: totaal als p, h en vulling leeg", gevellaag, { naam: "Glazen pui", p: "0,75", h: "", vulling: "" });
  bijna("als gevellaag: q = 0,75 × 3,00", gevelOpbouw([{ ...gevellaag, h: "3,00" }]).som, 2.25, 1e-9);

  gelijk("omschrijving", [laag("kanaalplaatvloer 200 mm"), laag("OSB/3"), laag("metselwerk"), laag("substraat")].map(omschrijving), [
    "3,03 kN/m²",
    "0,010 m × 6,0 kN/m³ = 0,06 kN/m²",
    "ρ = 20,0 kN/m³, dikte invullen",
    "ρ = 14,0 kN/m³, dikte invullen (voor beplanting)",
  ]);

  const leeg = { naam: "", d: "", rho: "", p: "" };
  const a = { naam: "a", d: "", rho: "", p: "1" };
  const x = { naam: "x", d: "", rho: "", p: "2" };
  gelijk("voegToe: vervangt de lege laag van een nieuwe opbouw", voegToe([leeg], x), [x]);
  gelijk("voegToe: lege lagen aan het eind vervallen", voegToe([a, leeg, { ...leeg, naam: "  " }], x), [a, x]);
  gelijk("voegToe: een lege laag middenin blijft", voegToe([leeg, a], x), [leeg, a, x]);
  const lijst = [a];
  toets("voegToe: nieuwe lijst, origineel ongemoeid", voegToe(lijst, x) !== lijst && lijst.length === 1);
}

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
if (fouten > 0) {
  console.error(`\nRapport: ${fouten} van de ${aantal} controles gezakt.`);
  process.exit(1);
}
console.log(`\nRapport: alle ${aantal} controles kloppen.`);
