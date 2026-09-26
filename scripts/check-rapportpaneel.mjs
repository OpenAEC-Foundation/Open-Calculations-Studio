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
