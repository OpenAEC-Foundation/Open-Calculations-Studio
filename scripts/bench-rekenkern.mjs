/**
 * Herhaalbare meting van de warme rekenkern. Eerst de core bouwen.
 *
 * Draaien: node scripts/bench-rekenkern.mjs
 * De HTML en rekenuitkomsten worden op gelijkheid gecontroleerd; de tijden
 * zijn indicatief en hangen af van de machine en de achtergrondbelasting.
 */
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse, evaluate, render, process as reken, raamwerkKnik } from "../packages/core/dist/index.js";

const hier = dirname(fileURLToPath(import.meta.url));
const bestand = readFileSync(join(hier, "../packages/desktop/src/templates/hsbStabiliteit.ts"), "utf8");
const bron = bestand.match(/export const hsbStabiliteit = `([\s\S]*?)`;/)?.[1];
if (!bron) throw new Error("HSB-sjabloon ontbreekt");

const mediaan = (waarden) => waarden.sort((a, b) => a - b)[Math.floor(waarden.length / 2)];
const ast = parse(bron);
const volledig = (waarden) => reken(bron, waarden);
const hergebruik = (waarden) => render(evaluate(ast, waarden));
for (let i = 0; i < 3; i++) {
  const waarden = { B_gevel: String(10 + i) };
  volledig(waarden); hergebruik(waarden);
}
const volTijden = [], herTijden = [];
for (let i = 0; i < 12; i++) {
  const waarden = { B_gevel: String(10 + i) };
  let start = performance.now();
  const a = volledig(waarden);
  volTijden.push(performance.now() - start);
  start = performance.now();
  const b = hergebruik(waarden);
  herTijden.push(performance.now() - start);
  if (a !== b) throw new Error("Bladuitvoer wijkt af");
}
console.log(`HSB-blad: volledig ${mediaan(volTijden).toFixed(1)} ms; ` +
  `hergebruik van syntaxisboom ${mediaan(herTijden).toFixed(1)} ms`);

const staven = (n) => Array.from({ length: n }, (_, i) => [i + 1, i + 2, 10000, 1e8, 0, 0]);
const knopen = (n, schaal) => Array.from({ length: n + 1 }, (_, i) => [i * schaal, 0]);
for (const n of [3, 10, 25]) {
  const st = staven(n), op = [[1, 1, 1, 1]], tijden = [];
  for (let i = 0; i < 7; i++) {
    const kn = knopen(n, 1 + i / 10000);
    const start = performance.now();
    const uit = raamwerkKnik(kn, st, op, [[n, 3, 0, 0, -10, 0, 1]]);
    if (!(uit > 0) || !Number.isFinite(uit)) throw new Error("Ongeldige knikfactor");
    if (i > 1) tijden.push(performance.now() - start);
  }
  console.log(`Knikfactor ${n} staven, nieuwe geometrie: ${mediaan(tijden).toFixed(1)} ms`);
}
