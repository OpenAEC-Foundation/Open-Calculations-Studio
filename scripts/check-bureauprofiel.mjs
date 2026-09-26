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
