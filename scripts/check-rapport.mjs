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
if (fouten > 0) {
  console.error(`\nRapport: ${fouten} van de ${aantal} controles gezakt.`);
  process.exit(1);
}
console.log(`\nRapport: alle ${aantal} controles kloppen.`);
