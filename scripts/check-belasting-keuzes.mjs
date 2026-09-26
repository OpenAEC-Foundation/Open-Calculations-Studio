/**
 * Rendercontrole over álle keuzes van de belastingbladen: templates/en1990.ts,
 * en1991.ts, vandepitte.ts en permanenteVuurlast.ts.
 *
 * check-renders.mjs rendert elk blad één keer, met elk @select op zijn eerste
 * keuze. Een fout achter een latere keuze blijft dan onzichtbaar: een eenheid
 * die de rekenkern niet kent in de tak voor 30°–60°, een tabelnummer in proza
 * dat als index wordt gelezen ('NB[4]'), een formule in proza met letterlijke
 * aanhalingstekens. Dit script zet elke keuze van elk @select één keer, met de
 * overige op hun eerste óf hun laatste keuze (zo komen ook keuzes binnen een
 * #if aan de beurt), en vult de invoervelden met 1, 2, 40 en 70 (hellingen
 * boven 30° en boven 60°, een even aantal vakwerkvelden).
 *
 * Per render twee controles:
 *   1. geen foutmelding, onbekend symbool, NaN of verminkte proza;
 *   2. staat er een UC_max, dan een slotzin die de rapportkop kan lezen
 *      ("Maatgevende UC = … → voldoet"), met een oordeel dat bij de UC past —
 *      dezelfde lezing als components/calc/bladResultaat.ts.
 *
 * Draaien:  node scripts/check-belasting-keuzes.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { parse, evaluate, render } from "../packages/core/dist/index.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const TPL_DIR = join(dirname(fileURLToPath(import.meta.url)), "../packages/desktop/src/templates");
const BESTANDEN = ["en1990.ts", "en1991.ts", "vandepitte.ts", "permanenteVuurlast.ts"];

/** Projectgegevens: de standaard en twee uitersten (gevolgklasse, windgebied, levensduur). */
const PROJECTEN = [
  { CC: 2, K_FI: 1.0, rekenwijze: 1, windgebied: 2, terreincategorie: 2, DesignLife: 50 },
  { CC: 1, K_FI: 0.9, rekenwijze: 1, windgebied: 1, terreincategorie: 1, DesignLife: 10 },
  { CC: 3, K_FI: 1.1, rekenwijze: 0, windgebied: 3, terreincategorie: 3, DesignLife: 100 },
];
const INVOER = ["1", "2", "40", "70"];

const FOUTSIGNALEN = [
  "Render error", "Undefined symbol", "Unexpected type", "Cannot read",
  "is not defined", "Invalid argument", "Error evaluating condition",
  "Error defining function", "Error:", "Infinity",
  "NB[", "A1[", "|---|", "&quot;+&quot;", "\"+\"",
];

/** Alle @select-blokken met al hun keuzes, in volgorde. */
function selects(tpl) {
  const uit = [];
  for (const m of tpl.matchAll(/@select\s+([^\s"]+)[^\n]*\n([\s\S]*?)@end/g)) {
    const opties = [...m[2].matchAll(/=\s*(-?[\d.]+)\s*$/gm)].map((o) => o[1]);
    if (opties.length) uit.push({ naam: m[1].replace(/,/g, "_"), opties });
  }
  return uit;
}

/** Alle invoervelden (`naam = ?…`). */
function invoervelden(tpl) {
  const uit = new Set();
  for (const m of tpl.matchAll(/^\s*([^\s='#]+)\s*=\s*\?/gmu)) uit.add(m[1].replace(/,/g, "_"));
  return [...uit];
}

/** Elke keuze één keer, de overige selects op hun eerste of laatste keuze. */
function varianten(lijst) {
  const uit = new Map();
  for (const kant of ["eerste", "laatste"]) {
    const basis = Object.fromEntries(lijst.map((s) => [s.naam, kant === "eerste" ? s.opties[0] : s.opties.at(-1)]));
    uit.set(JSON.stringify(basis), basis);
    for (const s of lijst) {
      for (const o of s.opties) {
        const v = { ...basis, [s.naam]: o };
        uit.set(JSON.stringify(v), v);
      }
    }
  }
  return [...uit.values()];
}

/** Loopt de uitgerekende knopen door, ook die binnen een voorwaardelijk blok. */
function* knopen(lijst) {
  for (const n of lijst) {
    yield n;
    if (Array.isArray(n.children)) yield* knopen(n.children);
  }
}

/** Zelfde lezing als leesResultaat() in components/calc/bladResultaat.ts. */
function slotzinProbleem(nodes) {
  let uc = null;
  const tekst = [];
  for (const n of knopen(nodes)) {
    if ((n.type === "assignment" || n.type === "var-display") && n.name === "UC_max") {
      const t = String(n.result).trim();
      const w = t.startsWith("∞") ? Infinity : parseFloat(t.replace(",", "."));
      if (!Number.isNaN(w)) uc = w;
    }
    if (n.type === "text") tekst.push(n.text);
  }
  if (uc === null) return null;
  const vlak = tekst.join(" ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const i = vlak.lastIndexOf("Maatgevende UC");
  if (i < 0) return `UC_max = ${uc} zonder slotzin`;
  const zin = vlak.slice(i, i + 240);
  if (!/Maatgevende UC\s*=\s*([\d.,]+|∞)/.test(zin)) return `slotzin zonder leesbare UC: ${zin.slice(0, 60)}`;
  const voldoet = !/voldoe[nt] niet/.test(zin) && /voldoe[nt]/.test(zin);
  if (voldoet !== uc <= 1) return `oordeel past niet bij UC = ${uc}: ${zin.slice(0, 80)}`;
  return null;
}

function onderzoek(nodes) {
  const html = render(nodes);
  const problemen = [];
  const tekst = html.replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ");
  for (const s of FOUTSIGNALEN) {
    const i = (s.startsWith("&") ? html : tekst).indexOf(s);
    if (i >= 0) {
      const bron = s.startsWith("&") ? html : tekst;
      problemen.push(`${s}: …${bron.slice(Math.max(0, i - 50), i + 70).replace(/\s+/g, " ").trim()}…`);
    }
  }
  if (/\bNaN\b/.test(tekst)) problemen.push("NaN in de uitwerking");
  const slot = slotzinProbleem(nodes);
  if (slot) problemen.push(slot);
  return problemen;
}

let renders = 0;
let bladen = 0;
const fouten = [];
for (const bestand of BESTANDEN) {
  const src = readFileSync(join(TPL_DIR, bestand), "utf8");
  for (const m of src.matchAll(/export const (\w+) = `([\s\S]*?)`;/g)) {
    const [, naam, tpl] = m;
    bladen++;
    const ast = parse(tpl);
    const velden = invoervelden(tpl);
    const gezien = new Set();
    let n = 0;
    for (const keuze of varianten(selects(tpl))) {
      for (const waarde of INVOER) {
        for (const project of PROJECTEN) {
          const waarden = { ...Object.fromEntries(velden.map((v) => [v, waarde])), ...keuze };
          let problemen;
          try {
            problemen = onderzoek(evaluate(ast, waarden, project));
          } catch (e) {
            problemen = [`gooit: ${String(e.message).slice(0, 140)}`];
          }
          renders++;
          n++;
          for (const p of problemen) {
            const sleutel = `${naam} ${p}`;
            if (gezien.has(sleutel)) continue;
            gezien.add(sleutel);
            fouten.push(`${bestand} :: ${naam}  ${JSON.stringify(keuze)} invoer ${waarde} CC${project.CC}\n        ${p}`);
          }
        }
      }
    }
    console.log(`${gezien.size ? "FOUT " : "ok   "} ${bestand} :: ${naam}  (${n} renders)`);
  }
}

for (const f of fouten) console.log(`\nFOUT  ${f}`);
console.log(`\n${bladen} bladen, ${renders} renders, ${fouten.length} problemen.`);
process.exit(fouten.length === 0 ? 0 : 1);
