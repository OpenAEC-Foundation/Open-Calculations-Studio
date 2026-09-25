/**
 * Rendercontrole over álle rekenbladen.
 *
 * De check-<module>-scripts toetsen of een module een referentieblad haalt.
 * Deze toetst iets eenvoudigers dat daaraan voorafgaat: komt elk blad heel uit
 * de rekenkern? Dus geen foutmelding, geen onbekend symbool, geen NaN, geen
 * expressie die als letterlijke tekst in een tekening is blijven staan, en
 * geen tekening die in stukken is geknipt.
 *
 * Die laatste twee zijn verraderlijk omdat ze stil gebeuren: een expressie die
 * niet uitrekent komt gewoon als tekst in een SVG-attribuut terecht, en een
 * doorgeknipte tekening laat de rest van zijn tekenopdrachten als losse
 * alinea's achter. Het blad "werkt", maar de tekening klopt niet.
 *
 * Twee rondes:
 *   1. met ingevulde waarden — elk @select op zijn eerste keuze, elk
 *      invoerveld op 1. Problemen hier tellen als fout.
 *   2. met lege invoer — zoals een blad er de eerste tel na het invoegen
 *      uitziet. NaN in een tekening is dan ruis in de console; dat wordt
 *      gemeld maar telt niet als fout.
 *
 * Draaien:  node scripts/check-renders.mjs      (vereist een gebouwde core)
 */
import { process as rekenblad } from "../packages/core/dist/index.js";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const hier = dirname(fileURLToPath(import.meta.url));
const TPL_DIR = join(hier, "../packages/desktop/src/templates");

/** Bestanden in de templatemap die geen rekenblad bevatten. */
const GEEN_BLAD = new Set([
  "index.ts",            // register
  "calcpad-includes.ts", // hulpbestanden voor #include
  "calcpad-samples.ts",  // groot voorbeeldproject met eigen includes
  "nl-windgebieden.ts",  // kaartgegevens
]);

/** Projectgegevens zoals de app ze vóór de eerste regel in de scope zet. */
function projectScope() {
  const src = readFileSync(join(hier, "../packages/desktop/src/store/projectGegevens.ts"), "utf8");
  const scope = {};
  const veld = /naam:\s*"([^"]+)"[\s\S]*?type:\s*"(keuze|tekst)"[\s\S]*?standaard:\s*"([^"]*)"/g;
  for (const m of src.matchAll(veld)) {
    const [, naam, type, standaard] = m;
    const n = parseFloat(standaard);
    scope[naam] = type === "keuze" && Number.isFinite(n) ? n : standaard;
  }
  const cc = typeof scope.CC === "number" ? scope.CC : 2;
  scope.K_FI = cc === 1 ? 0.9 : cc === 3 ? 1.1 : 1.0;
  return scope;
}

/** Eerste keuze van elk @select-blok. */
function selectWaarden(tpl) {
  const uit = {};
  for (const m of tpl.matchAll(/@select\s+([^\s"]+)[^\n]*\n([\s\S]*?)@end/g)) {
    const eerste = m[2].match(/=\s*(-?[\d.]+)\s*$/m);
    if (eerste) uit[m[1].replace(/,/g, "_")] = eerste[1];
  }
  return uit;
}

/** Alle invoervelden (`naam = ?…`). */
function invoervelden(tpl) {
  const uit = new Set();
  for (const m of tpl.matchAll(/^\s*([^\s='#]+)\s*=\s*\?/gmu)) uit.add(m[1].replace(/,/g, "_"));
  return [...uit];
}

const FOUTSIGNALEN = [
  "Render error", "Undefined symbol", "Unexpected type", "Cannot read",
  "is not defined", "Invalid argument", "Error evaluating condition",
  "Error defining function", "Error:",
];

/** Attributen die in een tekening een getal (of een lijst getallen) horen te zijn. */
const GETALATTRIBUTEN = /\s(x|y|x1|y1|x2|y2|cx|cy|r|rx|ry|width|height|points)="([^"]*)"/g;

function onderzoek(html) {
  const problemen = [];
  const tekst = html.replace(/<[^>]+>/g, " ");

  for (const s of FOUTSIGNALEN) {
    const i = tekst.indexOf(s);
    if (i >= 0) {
      problemen.push(`foutmelding: …${tekst.slice(Math.max(0, i - 50), i + 100).replace(/\s+/g, " ").trim()}…`);
      break;
    }
  }

  const zonderTekeningen = html.replace(/<svg[\s\S]*?<\/svg>/g, "");
  const buitenTekening = zonderTekeningen.replace(/<[^>]+>/g, " ");
  const nanTekst = (buitenTekening.match(/\bNaN\b/g) || []).length;
  if (nanTekst) problemen.push(`NaN in de uitwerking ×${nanTekst}`);

  let nanTekening = 0;
  const onuitgerekend = new Set();
  for (const svg of html.match(/<svg[\s\S]*?<\/svg>/g) || []) {
    for (const m of svg.matchAll(GETALATTRIBUTEN)) {
      const waarde = m[2];
      if (/NaN|Infinity/.test(waarde)) { nanTekening++; continue; }
      // Getallen, eventueel met een SVG-lengte-eenheid erachter: KaTeX tekent
      // wortel- en haaktekens als SVG met `width="400em"`, en dat is geldig.
      // Een expressie die niet is uitgerekend bevat daarentegen namen en
      // operatoren (`mx1 + 12`), en die vallen hier buiten.
      const getallen = /^\s*(-?[\d.]+(e[-+]?\d+)?(em|ex|px|pt|pc|mm|cm|in|%)?[\s,]*)*$/i;
      if (!getallen.test(waarde)) onuitgerekend.add(`${m[1]}="${waarde.slice(0, 40)}"`);
    }
  }
  if (nanTekening) problemen.push(`NaN/Infinity in een tekening ×${nanTekening}`);
  if (onuitgerekend.size) {
    problemen.push(`expressie niet uitgerekend in een tekening: ${[...onuitgerekend].slice(0, 2).join(", ")}`);
  }

  // Een doorgeknipte tekening laat tekenopdrachten als losse alinea's achter.
  const gelekt =
    zonderTekeningen.match(/<p class="calc-text">\s*<(line|rect|polygon|circle|path|text|polyline)\b/g) || [];
  if (gelekt.length) problemen.push(`tekening in stukken: ${gelekt.length} tekenopdracht(en) buiten de SVG`);

  return problemen;
}

const scope = projectScope();
const bladen = [];
for (const bestand of readdirSync(TPL_DIR).filter((f) => f.endsWith(".ts") && !GEEN_BLAD.has(f)).sort()) {
  const src = readFileSync(join(TPL_DIR, bestand), "utf8");
  for (const m of src.matchAll(/export const (\w+) = `([\s\S]*?)`;/g)) {
    bladen.push({ bestand, naam: m[1], tpl: m[2] });
  }
}

let fouten = 0;
const ruis = [];
for (const { bestand, naam, tpl } of bladen) {
  const waarden = selectWaarden(tpl);
  for (const v of invoervelden(tpl)) if (!(v in waarden)) waarden[v] = "1";

  let problemen;
  try {
    problemen = onderzoek(rekenblad(tpl, waarden, undefined, scope));
  } catch (e) {
    problemen = [`gooit: ${String(e.message).slice(0, 140)}`];
  }
  if (problemen.length) {
    fouten++;
    console.log(`FOUT  ${bestand} :: ${naam}`);
    for (const p of problemen) console.log(`        ${p}`);
  } else {
    console.log(`ok    ${bestand} :: ${naam}`);
  }

  // Ronde 2: lege invoer, alleen tekeningen.
  try {
    const leeg = rekenblad(tpl, {}, undefined, scope);
    let n = 0;
    for (const svg of leeg.match(/<svg[\s\S]*?<\/svg>/g) || []) {
      n += (svg.match(/="[^"]*(NaN|Infinity)[^"]*"/g) || []).length;
    }
    if (n) ruis.push(`${bestand} :: ${naam} — ${n} attribuut/attributen`);
  } catch {
    /* lege invoer mag gooien; ronde 1 is de maatstaf */
  }
}

console.log(`\n${bladen.length} bladen gerenderd, ${fouten} met problemen.`);
if (ruis.length) {
  console.log(`\nBij lege invoer (de eerste tel na het invoegen) NaN in de tekening — geen fout, wel consoleruis:`);
  for (const r of ruis) console.log(`  · ${r}`);
}
process.exit(fouten === 0 ? 0 : 1);
