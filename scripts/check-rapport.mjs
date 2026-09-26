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
