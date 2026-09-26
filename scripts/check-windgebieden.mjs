/**
 * Controlescript voor de windgebiedenkaart (NEN-EN 1991-1-4, NB figuur NB.1).
 *
 * Plaatsen met een bekend gebied, vooral langs de grens tussen I en II in
 * Noord-Holland: de vijf grensgemeenten liggen zelf in gebied II, net als
 * Zaanstad; de gemeenten erboven, ook Beemster en Zeevang, in gebied I.
 * Daarnaast Katwijk en Noordwijk: die vielen eerder door een rechte lijn op
 * 52° NB ten onrechte in gebied I.
 *
 * Tot slot de overgangszone van figuur NB.2: binnen 5 km van de grens met
 * het lagere gebied ligt v_b,0 tussen beide waarden in.
 *
 * Draaien:  node scripts/check-windgebieden.mjs
 * De kaartdata opnieuw maken:  python scripts/windgebieden/genereer.py
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { maakWindKaart } from "../packages/desktop/src/lib/windgebieden.ts";

const hier = dirname(fileURLToPath(import.meta.url));
const kaart = maakWindKaart(JSON.parse(
  readFileSync(join(hier, "../packages/desktop/src/templates/nl-windgebieden.geojson"), "utf8"),
));

const PLAATSEN = [
  // gebied I — Noord-Holland ten noorden van de grensgemeenten
  ["Den Helder", 52.9563, 4.7601, 1],
  ["Alkmaar", 52.6324, 4.7534, 1],
  ["Hoorn", 52.6424, 5.0597, 1],
  ["Castricum", 52.5483, 4.6694, 1],
  ["Middenbeemster (Beemster)", 52.5486, 4.9112, 1],
  ["Oosthuizen (Zeevang)", 52.5725, 5.0036, 1],
  ["Enkhuizen", 52.7034, 5.2913, 1],
  // gebied I — eilanden en water
  ["Den Burg (Texel)", 53.0543, 4.7973, 1],
  ["West-Terschelling", 53.3615, 5.2170, 1],
  ["Schiermonnikoog", 53.4800, 6.1600, 1],
  ["IJsselmeer", 52.8000, 5.3000, 1],
  ["Markermeer", 52.5500, 5.2500, 1],
  ["Waddenzee bij Harlingen", 53.2500, 5.2500, 1],
  // gebied II — de grensgemeenten zelf en Zaanstad
  ["Heemskerk", 52.5110, 4.6710, 2],
  ["Uitgeest", 52.5290, 4.7090, 2],
  ["Wormer (Wormerland)", 52.4967, 4.8067, 2],
  ["Zaandam (Zaanstad)", 52.4389, 4.8258, 2],
  ["Purmerend", 52.5050, 4.9597, 2],
  ["Volendam", 52.4950, 5.0710, 2],
  // gebied II — rest
  ["Amsterdam", 52.3731, 4.8926, 2],
  ["Haarlem", 52.3874, 4.6462, 2],
  ["Leeuwarden", 53.2012, 5.7999, 2],
  ["Groningen", 53.2194, 6.5665, 2],
  ["Lelystad", 52.5185, 5.4714, 2],
  ["Katwijk", 52.2000, 4.4167, 2],
  ["Noordwijk", 52.2400, 4.4400, 2],
  ["Den Haag", 52.0705, 4.3007, 2],
  ["Rotterdam", 51.9225, 4.4792, 2],
  ["Middelburg", 51.4988, 3.6109, 2],
  // gebied III
  ["Utrecht", 52.0907, 5.1214, 3],
  ["Assen", 52.9925, 6.5649, 3],
  ["Zwolle", 52.5168, 6.0830, 3],
  ["Arnhem", 51.9851, 5.8987, 3],
  ["Eindhoven", 51.4416, 5.4697, 3],
  ["Maastricht", 50.8514, 5.6910, 3],
  // buiten Nederland
  ["Brussel", 50.8503, 4.3517, null],
  ["Noordzee", 52.6000, 3.8000, null],
];

const ROMEINS = { 1: "I", 2: "II", 3: "III" };
let fouten = 0;
for (const [naam, lat, lng, verwacht] of PLAATSEN) {
  const gebied = kaart.gebiedVoor(lat, lng);
  const ok = gebied === verwacht;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${naam.padEnd(27)} ${ROMEINS[gebied] ?? "—"}` +
    (ok ? "" : `   verwacht ${ROMEINS[verwacht] ?? "—"}`));
}

// Overgangszone (figuur NB.2): v_b,0 loopt binnen 5 km van de grenslijn lineair
// naar de waarde van het lagere gebied. Castricum ligt vlak boven Heemskerk,
// Schoonhoven vlak bij de provincie Utrecht (gebied III); Den Helder, Alkmaar
// en Den Haag liggen ruim van een grens af.
const OVERGANG = [
  ["Castricum", 52.5483, 4.6694, true],
  ["Schoonhoven", 51.9475, 4.8497, true],
  ["Den Helder", 52.9563, 4.7601, false],
  ["Alkmaar", 52.6324, 4.7534, false],
  ["Den Haag", 52.0705, 4.3007, false],
];
for (const [naam, lat, lng, inZone] of OVERGANG) {
  const loc = kaart.locatie(lat, lng);
  const o = loc?.overgang;
  const lager = o ? { 2: 27.0, 3: 24.5 }[o.naarGebied] : null;
  const ok = inZone
    ? !!o && o.afstandKm < 5 && o.vb0 > lager && o.vb0 < loc.vb0Gebied
      && Math.abs(o.vb0 - (lager + (loc.vb0Gebied - lager) * o.afstandKm / 5)) < 1e-9
    : !!loc && o === null;
  if (!ok) fouten++;
  const tekst = o ? `${o.afstandKm.toFixed(1)} km van de grens, v_b,0 = ${o.vb0.toFixed(2)} m/s`
    : `geen overgang, v_b,0 = ${loc?.vb0Gebied ?? "—"} m/s`;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${naam.padEnd(27)} ${tekst}`);
}

if (fouten > 0) {
  console.error(`\nWindgebieden: ${fouten} afwijking(en).`);
  process.exit(1);
}
console.log("\nWindgebieden: alle plaatsen in het juiste gebied, overgangszone klopt.");
