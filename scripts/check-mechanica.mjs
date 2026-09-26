/**
 * Controlescript voor de module Mechanica (templates/mechanica.ts) en de
 * doorsnedefuncties in de rekenkern (packages/core/src/doorsnede.ts).
 *
 * Geen referentieberekening nodig: elk voorbeeld is hieronder met de hand
 * uitgewerkt (de formules staan in de code, de getallen in het commentaar).
 *
 *   1. De rekenkern: alle 27 I- en H-profielen uit profielen.ts nagerekend uit
 *      h, b, t_w, t_f en r (A, I_y, I_z, W_pl,y, W_pl,z op de afronding van de
 *      tabel), een rechthoek, een cirkel, een buis, een liggend profiel, het
 *      statisch moment en de omtrek voor de tekening.
 *   2. Doorsnede in het blad:
 *      a. T-doorsnede (flens 200 × 20, lijf 10 × 300): zwaartepunt, Steiner,
 *         W_el boven en onder, S op de zwaartelijn en in de aansluiting,
 *         plastische neutrale lijn in de flens en W_pl.
 *      b. Hout 100 × 200 met een stalen strip 100 × 10 eronder, n = 20:
 *         ideële A, z_c en I, en W per deel (σ = n·M/W).
 *      c. Koker 200 × 200 als rechthoek met een gat 100 × 100 (n = −1).
 *      d. L-vorm uit twee rechthoeken: I_yz, de hoofdassen (α = 45°).
 *      e. Een enkel profiel uit de tabel: de tabelwaarden, staand en liggend.
 *   3. Vakwerk in het blad:
 *      a. Driehoek met een pendel, vrij ingevoerd: de knopenmethode (reacties
 *         en alle staafkrachten), statisch bepaald.
 *      b. N-vakwerk op trek, 4 velden: de snedemethode (randen, diagonaal,
 *         verticaal), de reacties en de knik van de maatgevende bovenrand in
 *         hoekstaal (λ̄, χ, N_b,Rd, UC) met de slotzin.
 *      c. Statisch onbepaald: drie staven naar één knoop; de verdeling uit de
 *         rek van de staven en de verplaatsing van de knoop.
 *      d. Twee staven: de verplaatsing met virtuele arbeid, Σ N·n·L/(EA).
 *      e. Houten Warrenvakwerk met een horizontale last: evenwicht en k_c.
 *      f. Beweeglijk (een staaf te weinig) en onvolledig.
 *   4. Vergeetmenietjes: alle veertien gevallen, de waarden van de oplosser
 *      tegen de formule hieronder in het script, en in het blad een vinkje.
 *   5. Een leeg blad per keuze, de slotzin zoals de rapportkop hem leest
 *      (geen UC bij doorsnede en vergeetmenietjes), en de registratie.
 *
 * De tussenwaarden staan deels verborgen in het blad; het script toont ze door
 * de namen aan het eind van het blad te laten afdrukken.
 *
 * Draaien:  node scripts/check-mechanica.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import {
  parse, evaluate, render,
  doorsnedeGrootheden, doorsnedeDeel, doorsnedePlastisch, doorsnedeStatisch, doorsnedeSvgPunten,
} from "../packages/core/dist/index.js";
import { laadTemplate } from "./lib/refcheck.mjs";

const hier = dirname(fileURLToPath(import.meta.url));
const tpl = laadTemplate("mechanica.ts");
const P = await import(pathToFileURL(join(hier, "../packages/desktop/src/components/calc/profielen.ts")).href);
/** Projectgegevens zoals de app ze vóór de eerste regel in de scope zet (CC2). */
const SCOPE = { CC: 2, RC: 2, K_FI: 1, DesignLife: 50, rekenwijze: 1, windgebied: 2, terreincategorie: 2 };

let fouten = 0;
let getest = 0;

function* knopen(lijst) {
  for (const n of lijst) {
    yield n;
    if (Array.isArray(n.children)) yield* knopen(n.children);
  }
}

/** Doorrekenen met de verborgen namen erbij; de uitkomsten als getal, de knopen en de platte tekst. */
function doorreken(waarden, namen = []) {
  const extra = namen.map((n, i) => `x_${i} = ${n}`).join("\n");
  const nodes = evaluate(parse(`${tpl}\n${extra}\n`), waarden, SCOPE);
  const uit = {};
  for (const n of knopen(nodes)) {
    if (n.type === "assignment" || n.type === "var-display") {
      const w = parseFloat(String(n.result).replace(",", "."));
      if (Number.isFinite(w)) uit[n.name] = w;
    }
  }
  namen.forEach((n, i) => { uit[n] = uit[`x_${i}`]; });
  const html = render(nodes);
  const tekst = html.replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return { uit, tekst, html, nodes };
}

/** Vergelijkt met de handberekening; relatieve tolerantie, met een kleine absolute ondergrens. */
function toets(r, verwacht, tol = 2e-3, abs = 1e-6) {
  for (const [naam, doel] of Object.entries(verwacht)) {
    getest++;
    const ons = r.uit[naam];
    const ok = ons !== undefined && (Math.abs(ons - doel) <= tol * Math.abs(doel) || Math.abs(ons - doel) <= abs);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} ${naam.padEnd(14)} blad ${String(ons).padStart(12)}   hand ${Number(doel.toPrecision(6))}`);
  }
}
function gelijk(wat, ons, doel, tol = 1e-9, abs = 1e-9) {
  getest++;
  const ok = Number.isFinite(ons) && (Math.abs(ons - doel) <= tol * Math.abs(doel) || Math.abs(ons - doel) <= abs);
  if (!ok) {
    fouten++;
    console.log(`  FOUT   ${wat}: ${ons} tegen ${doel}`);
  }
  return ok;
}
function waar(wat, ok, detail = "") {
  getest++;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${wat}${ok || !detail ? "" : ` — ${detail}`}`);
}
function geenFouten(r, wat) {
  const signaal = ["Error", "Undefined symbol", "NaN", "niet gedefinieerd", "Unexpected type", "Infinity"].find((s) => r.tekst.includes(s));
  waar(`${wat}: geen foutmelding of NaN`, !signaal, signaal ? r.tekst.slice(Math.max(0, r.tekst.indexOf(signaal) - 80), r.tekst.indexOf(signaal) + 80) : "");
  const svg = (r.html.match(/<svg[\s\S]*?<\/svg>/g) || []).some((s) => /\s(x|y|x1|y1|x2|y2|cx|cy|r|width|height|points)="[^"]*(NaN|Infinity|[a-zA-Z_(][^"]*\()/.test(s));
  waar(`${wat}: tekeningen volledig uitgerekend`, !svg);
}

/**
 * De uitkomst zoals de rapportkop hem leest (leesResultaat in
 * components/calc/bladResultaat.ts): de laatste zichtbare UC_max en het oordeel
 * uit de slotzin vanaf "Maatgevende UC".
 */
function leesResultaat(nodes) {
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
  const vlak = tekst.join(" ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const slot = vlak.lastIndexOf("Maatgevende UC");
  let voldoet = null;
  if (slot >= 0) {
    const zin = vlak.slice(slot, slot + 240);
    voldoet = !/voldoe[nt] niet/.test(zin) && /voldoe[nt]/.test(zin);
    if (uc === null) {
      const m = zin.match(/Maatgevende UC\s*=\s*([\d.,]+|∞)/);
      if (m) uc = m[1].startsWith("∞") ? Infinity : parseFloat(m[1].replace(",", "."));
    }
  } else if (uc !== null) {
    voldoet = uc <= 1;
  }
  return { uc, voldoet };
}

// ── 1. De rekenkern ─────────────────────────────────────────────────────────
console.log("\n1. Rekenkern: doorsnedegrootheden (doorsnede.ts)");
{
  // Profielen: A, I_y, I_z, W_pl,y, W_pl,z uit de maten, tegen de tabel op vier significante cijfers.
  let afwijkend = 0;
  for (const [id, p] of Object.entries(P.PROFIELEN)) {
    const D = [[3, p.h, p.b, p.tw, p.tf, p.r, 0, 0, 1, 0]];
    const [A, , , Iy, Iz] = doorsnedeGrootheden(D);
    const [Wy] = doorsnedePlastisch(D, 1);
    const [Wz] = doorsnedePlastisch(D, 2);
    const rond = (v, t) => Math.abs(v - t) <= Math.max(0.5 * 10 ** (Math.floor(Math.log10(Math.abs(t))) - 3), 1e-9) * 1.0001;
    const tab = [[A, p.A], [Iy, p.Iy], [Iz, p.Iz], [Wy, p.Wply], [Wz, p.Wplz]];
    // De tabel rondt af op vier significante cijfers; een halve eenheid van het vierde cijfer mag.
    const mis = tab.filter(([v, t]) => !rond(v, t));
    if (mis.length) {
      afwijkend++;
      console.log(`  FOUT   ${p.naam}: ${mis.map(([v, t]) => `${v.toPrecision(6)} tegen ${t}`).join(", ")}`);
    }
  }
  waar(`27 profielen: A, I_y, I_z, W_pl,y en W_pl,z uit de maten gelijk aan de tabel`, afwijkend === 0);

  // Rechthoek 100 × 200 met het hart in (10, 20): I = bh³/12, W_pl = bh²/4, S_max = bh²/8, b = 100.
  const R = [[1, 100, 200, 0, 0, 0, 10, 20, 1, 0]];
  const g = doorsnedeGrootheden(R);
  gelijk("rechthoek A", g[0], 20000);
  gelijk("rechthoek y_c, z_c", g[1] + g[2], 30);
  gelijk("rechthoek I_y = bh³/12", g[3], (100 * 200 ** 3) / 12);
  gelijk("rechthoek I_z = hb³/12", g[4], (200 * 100 ** 3) / 12);
  gelijk("rechthoek W_pl,y = bh²/4", doorsnedePlastisch(R, 1)[0], (100 * 200 ** 2) / 4);
  gelijk("rechthoek z_pl", doorsnedePlastisch(R, 1)[1], 20, 1e-9, 1e-9);
  gelijk("rechthoek S_max = bh²/8", doorsnedeStatisch(R, 1, 20)[0], (100 * 200 ** 2) / 8);
  gelijk("rechthoek b op de zwaartelijn", doorsnedeStatisch(R, 1, 20)[1], 100);
  // S op 50 boven het hart: 100·50·(50 + 25) = 375 000.
  gelijk("rechthoek S op z = 70", doorsnedeStatisch(R, 1, 70)[0], 100 * 50 * 75);
  // Cirkel D = 100: A = πD²/4, I = πD⁴/64, W_pl = D³/6, S_max = D³/12.
  const C = [[2, 100, 0, 0, 0, 0, 0, 0, 1, 0]];
  gelijk("cirkel I = πD⁴/64", doorsnedeGrootheden(C)[3], (Math.PI * 100 ** 4) / 64);
  gelijk("cirkel W_pl = D³/6", doorsnedePlastisch(C, 1)[0], 100 ** 3 / 6);
  gelijk("cirkel S_max = D³/12", doorsnedeStatisch(C, 1, 0)[0], 100 ** 3 / 12);
  // Buis 100 × 10: I = π(D⁴ − d⁴)/64, W_pl = (D³ − d³)/6, b op de zwaartelijn 2t.
  const B = [[2, 100, 10, 0, 0, 0, 0, 0, 1, 0]];
  gelijk("buis A", doorsnedeGrootheden(B)[0], (Math.PI * (100 ** 2 - 80 ** 2)) / 4);
  gelijk("buis I", doorsnedeGrootheden(B)[3], (Math.PI * (100 ** 4 - 80 ** 4)) / 64);
  gelijk("buis W_pl", doorsnedePlastisch(B, 1)[0], (100 ** 3 - 80 ** 3) / 6);
  gelijk("buis b op de zwaartelijn = 2t", doorsnedeStatisch(B, 1, 0)[1], 20);
  // Liggend profiel: I_y en I_z gewisseld.
  const p = P.PROFIELEN[24];
  const st = doorsnedeGrootheden([[3, p.h, p.b, p.tw, p.tf, p.r, 0, 0, 1, 0]]);
  const li = doorsnedeGrootheden([[3, p.h, p.b, p.tw, p.tf, p.r, 0, 0, 1, 1]]);
  gelijk("IPE 300 liggend: I_y = I_z staand", li[3], st[4]);
  gelijk("IPE 300 liggend: I_z = I_y staand", li[4], st[3]);
  // doorsnede_deel: een deel op zich, ook met n = 0.
  const d = doorsnedeDeel([[1, 100, 200, 0, 0, 0, 10, 20, 0, 0]], 1);
  gelijk("deel op zich (n = 0): A", d[0], 20000);
  gelijk("deel op zich: z_max", d[6], 120);
  gelijk("een deel met n = 0 telt niet mee in het geheel", doorsnedeGrootheden([[1, 100, 200, 0, 0, 0, 10, 20, 0, 0]])[0], 0);
  // De omtrek: een rechthoek met vier hoeken, een profiel met 4 + 4·7 + 4 punten.
  const pt = doorsnedeSvgPunten(R, 1, 0, 0, 1).split(" ");
  waar("omtrek van een rechthoek: vier punten, y = −40 … 60, z = −80 … 120", pt.length === 4 && pt[0] === "-40,80" && pt[2] === "60,-120", pt.join(" "));
  waar("omtrek van een profiel met afrondingen", doorsnedeSvgPunten([[3, p.h, p.b, p.tw, p.tf, p.r, 0, 0, 1, 0]], 1, 0, 0, 1).split(" ").length === 36);
}

// ── 2. Doorsnede in het blad ────────────────────────────────────────────────
const DEEL = (i, vorm, extra) => ({ [`vorm_${i}`]: String(vorm), ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [`${k}_${i}`, String(v)])) });

console.log("\n2a. T-doorsnede: flens 200 × 20 (hart op z = 310), lijf 10 × 300 (hart op z = 150)");
{
  const r = doorreken({ taak: "1", samengesteld: "0", ...DEEL(1, 1, { b: 200, h: 20, y: 0, z: 310 }), ...DEEL(2, 1, { b: 10, h: 300, y: 0, z: 150 }), S_snede: "1", z_S: "300" });
  geenFouten(r, "T-doorsnede");
  // A = 4000 + 3000 = 7000 mm²; S = 4000·310 + 3000·150 = 1 690 000 mm³; z_c = 241,43 mm.
  const A = 7000, zc = (4000 * 310 + 3000 * 150) / A;
  // I_y = 200·20³/12 + 4000·68,57² + 10·300³/12 + 3000·91,43² = 66 519 048 mm⁴.
  const Iy = (200 * 20 ** 3) / 12 + 4000 * (310 - zc) ** 2 + (10 * 300 ** 3) / 12 + 3000 * (150 - zc) ** 2;
  const Iz = (20 * 200 ** 3) / 12 + (300 * 10 ** 3) / 12;
  // S op de zwaartelijn: flens 4000·(310 − z_c) + lijf 10·(300 − z_c)²/2 = 291 439 mm³; in de aansluiting alleen de flens.
  const Smax = 4000 * (310 - zc) + (10 * (300 - zc) ** 2) / 2;
  // Plastische neutrale lijn: onder 300 ligt 3000 mm² < A/2, dus in de flens: 3000 + 200·(z − 300) = 3500 → z_pl = 302,5.
  // W_pl = 3500·8,75 + 500·1,25 + 3000·152,5 = 488 750 mm³; om de z-as: 20·200²/4 + 300·10²/4 = 207 500 mm³.
  const Wpl = 3500 * 8.75 + 500 * 1.25 + 3000 * 152.5;
  toets(r, {
    A: A / 100, y_c: 0, z_c: zc, I_y: Iy / 1e4, I_z: Iz / 1e4, I_yz: 0,
    W_el_y_b: Iy / (320 - zc) / 1000, W_el_y_o: Iy / zc / 1000, W_el_z_r: Iz / 100 / 1000,
    i_y: Math.sqrt(Iy / A), S_y_max: Smax / 1000, b_0: 10, S_y_snede: (4000 * (310 - zc)) / 1000, b_S: 10,
    z_pl: 302.5, W_pl_y: Wpl / 1000, W_pl_z: 207.5, α_pl_y: Wpl / (Iy / zc),
  });
  waar("T-doorsnede: geen slotzin, geen UC", leesResultaat(r.nodes).uc === null && !/Maatgevende UC/.test(r.tekst));
  waar("T-doorsnede: eindigt met 'Geen toets'", /Geen toets/.test(r.tekst));
}

console.log("\n2b. Hout 100 × 200 (hart op z = 110) met een stalen strip 100 × 10 eronder (z = 5), n = 20");
{
  const r = doorreken({
    taak: "1", samengesteld: "1",
    ...DEEL(1, 1, { b: 100, h: 200, y: 0, z: 110, n: 1 }), ...DEEL(2, 1, { b: 100, h: 10, y: 0, z: 5, n: 20 }),
  }, ["homogeen"]);
  geenFouten(r, "hout-staal");
  // A* = 20 000 + 20·1000 = 40 000 mm²; z_c = (20 000·110 + 20 000·5)/40 000 = 57,5 mm.
  // I* = 100·200³/12 + 20 000·52,5² + 20·100·10³/12 + 20 000·52,5² = 177 083 333 mm⁴.
  const I = (100 * 200 ** 3) / 12 + 20000 * 52.5 ** 2 + (20 * 100 * 10 ** 3) / 12 + 20000 * 52.5 ** 2;
  toets(r, { A: 400, z_c: 57.5, I_y: I / 1e4, W_el_y_b: I / 152.5 / 1000, homogeen: 0 });
  // W per deel: hout I*/(1·152,5) = 1161 cm³ (bovenrand), staal I*/(20·57,5) = 154,0 cm³ (onderrand).
  const Wh = (I / 152.5 / 1000).toPrecision(4), Ws = (I / (20 * 57.5) / 1000).toPrecision(4);
  waar(`W per deel: hout ${Wh} cm³ en staal ${Ws} cm³ in de tabel`, r.tekst.includes(` ${Number(Wh)} `) && r.tekst.includes(` ${Number(Ws)} `));
  waar("samengesteld: geen plastisch weerstandsmoment", /geldt alleen voor een homogene doorsnede/.test(r.tekst) && r.uit.W_pl_y === undefined);
}

console.log("\n2c. Koker 200 × 200 met een gat 100 × 100 (n = −1)");
{
  const r = doorreken({
    taak: "1", samengesteld: "1",
    ...DEEL(1, 1, { b: 200, h: 200, y: 0, z: 0, n: 1 }), ...DEEL(2, 1, { b: 100, h: 100, y: 0, z: 0, n: -1 }),
  });
  geenFouten(r, "koker");
  // A = 40 000 − 10 000; I = (200⁴ − 100⁴)/12 = 125·10⁶ mm⁴; W_pl = (200³ − 100³)/4 = 1 750 000 mm³ (homogeen met een gat).
  toets(r, { A: 300, I_y: 12500, I_z: 12500, W_el_y_b: 1250, W_pl_y: 1750, W_pl_z: 1750, S_y_max: (200 * 100 * 50 - 100 * 50 * 25) / 1000, b_0: 100 });
}

console.log("\n2d. L-vorm: 100 × 10 liggend (hart 50, 5) en 10 × 90 staand (hart 5, 55)");
{
  const r = doorreken({ taak: "1", ...DEEL(1, 1, { b: 100, h: 10, y: 50, z: 5 }), ...DEEL(2, 1, { b: 10, h: 90, y: 5, z: 55 }) });
  geenFouten(r, "L-vorm");
  // A = 1900; y_c = z_c = (1000·50 + 900·5)/1900 = 28,68 mm.
  const c = (1000 * 50 + 900 * 5) / 1900;
  const Iy = (100 * 10 ** 3) / 12 + 1000 * (5 - c) ** 2 + (10 * 90 ** 3) / 12 + 900 * (55 - c) ** 2;
  // I_yz = Σ A·a_y·a_z = 1000·(50 − c)(5 − c) + 900·(5 − c)(55 − c) = −1 065 789 mm⁴ (negatief: de benen liggen langs +y en +z).
  const Iyz = 1000 * (50 - c) * (5 - c) + 900 * (5 - c) * (55 - c);
  // I_y = I_z, dus tan 2α = ∞: α = 45°, I_1,2 = I_y ± |I_yz|.
  toets(r, {
    y_c: c, z_c: c, I_y: Iy / 1e4, I_z: Iy / 1e4, I_yz: Iyz / 1e4,
    I_1: (Iy - Iyz) / 1e4, I_2: (Iy + Iyz) / 1e4, α_1: 45, i_2: Math.sqrt((Iy + Iyz) / 1900),
  });
}

console.log("\n2e. Eén profiel uit de tabel: HEB 200 staand en liggend");
{
  const p = P.PROFIELEN[16];
  for (const draai of ["0", "1"]) {
    const r = doorreken({ taak: "1", vorm_1: "3", prof_1: "16", draai_1: draai, y_1: "0", z_1: "0" });
    geenFouten(r, `HEB 200 ${draai === "0" ? "staand" : "liggend"}`);
    const [Iy, Iz, Wy, Wz] = draai === "0" ? [p.Iy, p.Iz, p.Wply, p.Wplz] : [p.Iz, p.Iy, p.Wplz, p.Wply];
    // Tabelwaarden (afronding op vier cijfers): A = 78,08 cm², I_y = 5696 cm⁴, I_z = 2003 cm⁴, W_pl,y = 642,5, W_pl,z = 305,8 cm³.
    toets(r, { A: p.A / 100, I_y: Iy / 1e4, I_z: Iz / 1e4, W_pl_y: Wy / 1000, W_pl_z: Wz / 1000 }, 1e-3);
  }
}

// ── 3. Vakwerk ──────────────────────────────────────────────────────────────
/** Invoer voor een vrij ingevoerd vakwerk. */
function vrij({ knopen: kn, staven, opl, lasten }, extra = {}) {
  const w = { taak: "2", invoer_v: "2", n_K: String(kn.length), n_S: String(staven.length), n_O: String(opl.length), n_F: String(lasten.length), ...extra };
  kn.forEach(([x, y], k) => { w[`x_K${k + 1}`] = String(x); w[`y_K${k + 1}`] = String(y); });
  staven.forEach(([i, j], m) => { w[`i_S${m + 1}`] = String(i); w[`j_S${m + 1}`] = String(j); });
  opl.forEach(([k, s], o) => { w[`k_O${o + 1}`] = String(k); w[`s_O${o + 1}`] = String(s); });
  lasten.forEach(([k, h, v], f) => { w[`k_F${f + 1}`] = String(k); w[`F_h${f + 1}`] = String(h); w[`F_v${f + 1}`] = String(v); });
  return w;
}
const Nnamen = (n) => Array.from({ length: n }, (_, m) => `Ns(${m + 1})`);

console.log("\n3a. Driehoek met pendel, knopenmethode: 1 (0,0) vast, 3 (8,0) rol, 2 (4,3) en 4 (4,0)");
{
  const r = doorreken(vrij({
    knopen: [[0, 0], [4, 3], [8, 0], [4, 0]],
    staven: [[1, 2], [2, 3], [1, 4], [4, 3], [2, 4]],
    opl: [[1, 3], [3, 2]],
    lasten: [[2, 5, 10], [4, 0, 20]],
  }, { staaf_s: "0", EA_s: "100000" }), [...Nnamen(5), "RR.(1; 2)", "RR.(1; 3)", "RR.(2; 3)", "graad", "status_v"]);
  geenFouten(r, "driehoek");
  // Momenten om knoop 1: 8·R_3 = 10·4 + 20·4 + 5·3 → R_3 = 16,875 kN; R_1y = 30 − 16,875 = 13,125 kN; R_1x = −5 kN.
  // Knoop 4: N_24 = 20 (trek), N_14 = N_43. Knoop 1: 13,125 + 0,6·N_12 = 0 → N_12 = −21,875; −5 + 0,8·N_12 + N_14 = 0 → N_14 = 22,5.
  // Knoop 3: 16,875 + 0,6·N_23 = 0 → N_23 = −28,125; N_43 = −0,8·N_23 = 22,5.
  toets(r, {
    "Ns(1)": -21.875, "Ns(2)": -28.125, "Ns(3)": 22.5, "Ns(4)": 22.5, "Ns(5)": 20,
    "RR.(1; 2)": -5, "RR.(1; 3)": 13.125, "RR.(2; 3)": 16.875, graad: 0, status_v: 1,
  }, 1e-3);
  waar("driehoek: statisch bepaald en geen toets", /Statisch bepaald/.test(r.tekst) && /Geen toets/.test(r.tekst) && leesResultaat(r.nodes).uc === null);
}

console.log("\n3b. N-vakwerk op trek, 4 velden van 3 m, h = 3 m, 10 kN per bovenknoop (eindknopen 5), L 70x70x7 S235");
{
  const r = doorreken({
    taak: "2", invoer_v: "1", vorm_v: "1", n_v: "4", L_v: "12", h_v: "3", F_b: "10", F_o: "0", H_v: "0",
    staaf_s: "1", hoek_s: "5", staalsoort: "235",
  }, [...Nnamen(17), "RR.(1; 3)", "RR.(2; 3)", "mUC"]);
  geenFouten(r, "N-vakwerk");
  // Reacties 40/2 = 20 kN. Staaf 1 onderrand 1–2 (eindveld): 0. Staaf 2 onderrand 2–3: M(3 m) = 20·3 − 5·3 = 45 → 45/3 = 15 kN trek.
  // Bovenrand 7–8 (staaf 6): M(6 m) = 20·6 − 5·6 − 10·3 = 60 → −60/3 = −20 kN. Diagonaal 14 (6–2): dwarskracht 15 → 15·√2 = 21,21 kN trek.
  // Eindverticaal 1–6 (staaf 9): −(5 + 15) = −20 kN; verticaal 2–7 (staaf 10): −15 kN; middenverticaal (staaf 11): −10 kN.
  toets(r, {
    "RR.(1; 3)": 20, "RR.(2; 3)": 20,
    "Ns(1)": 0, "Ns(2)": 15, "Ns(3)": 15, "Ns(5)": -15, "Ns(6)": -20, "Ns(7)": -20, "Ns(9)": -20, "Ns(10)": -15,
    "Ns(11)": -10, "Ns(14)": 15 * Math.SQRT2, "Ns(15)": 5 * Math.SQRT2,
  }, 1e-3);
  // Knik bovenrand, L 70x70x7: A = 9,40 cm², i_v = 13,6 mm, L = 3 m, kromme b.
  // λ̄ = 3000/13,6/(π·√(210 000/235)) = 2,349; Φ = 0,5·(1 + 0,34·(λ̄ − 0,2) + λ̄²) = 3,624; χ = 0,1567; N_b,Rd = χ·940·235 = 34,61 kN; UC = 20/34,61 = 0,578.
  const λ = (3000 / 13.6) / (Math.PI * Math.sqrt(210000 / 235));
  const Φ = 0.5 * (1 + 0.34 * (λ - 0.2) + λ * λ);
  const χ = 1 / (Φ + Math.sqrt(Φ * Φ - λ * λ));
  const NbRd = (χ * 940 * 235) / 1000;
  toets(r, { λ_k: λ, Φ, χ, N_b_Rd: NbRd, UC_max: 20 / NbRd, N_Ed: 20 }, 2e-3);
  waar("maatgevend: een bovenrandstaaf of eindverticaal van 20 kN druk", [6, 7, 9, 13].includes(r.uit.mUC), `staaf ${r.uit.mUC}`);
  const lr = leesResultaat(r.nodes);
  waar("slotzin zoals de rapportkop hem leest: UC 0,578, voldoet", lr.uc !== null && Math.abs(lr.uc - 20 / NbRd) < 0.005 && lr.voldoet === true, JSON.stringify(lr));
}

console.log("\n3c. Statisch onbepaald: knoop 4 (4,3) met staven naar 1 (0,0), 2 (8,0) en 3 (4,0), alle vast; 10 kN omlaag; EA = 100 000 kN");
{
  const r = doorreken(vrij({
    knopen: [[0, 0], [8, 0], [4, 0], [4, 3]],
    staven: [[1, 4], [2, 4], [3, 4]],
    opl: [[1, 3], [2, 3], [3, 3]],
    lasten: [[4, 0, 10]],
  }, { staaf_s: "0", EA_s: "100000" }), [...Nnamen(3), "graad", "UU.(4; 3)"]);
  geenFouten(r, "onbepaald");
  // Knoop 4 zakt δ (symmetrie). Rek: schuine staaf δ·0,6 over 5 m, verticale δ over 3 m.
  // Evenwicht: EA·δ·(2·0,6²/5 + 1/3) = 10 → δ = 10/(100 000·0,477 33) = 0,2095 mm.
  const δ = 10 / (100000 * (2 * 0.36 / 5 + 1 / 3));
  toets(r, { "Ns(1)": (-100000 * δ * 0.6) / 5, "Ns(2)": (-100000 * δ * 0.6) / 5, "Ns(3)": (-100000 * δ) / 3, graad: 1, "UU.(4; 3)": -δ }, 1e-3);
  waar("onbepaald: 1-voudig statisch onbepaald", /1-voudig statisch onbepaald/.test(r.tekst));
}

console.log("\n3d. Twee staven, virtuele arbeid: knoop 3 (4,3) aan 1 (0,0) en 2 (8,0), 10 kN omlaag, EA = 100 000 kN");
{
  const r = doorreken(vrij({
    knopen: [[0, 0], [8, 0], [4, 3]],
    staven: [[1, 3], [2, 3]],
    opl: [[1, 3], [2, 3]],
    lasten: [[3, 0, 10]],
  }, { staaf_s: "0", EA_s: "100000" }), [...Nnamen(2), "UU.(3; 3)", "umax"]);
  geenFouten(r, "twee staven");
  // N = −F/(2·sin θ) = −10/(2·0,6) = −8,333 kN; n = N/F. δ = Σ N·n·L/(EA) = 2·8,333·0,8333·5/100 000 = 0,6944 mm.
  const N = -10 / 1.2;
  toets(r, { "Ns(1)": N, "Ns(2)": N, "UU.(3; 3)": -(2 * N * (N / 10) * 5) / 100000, umax: (2 * N * (N / 10) * 5) / 100000 }, 1e-3);
}

console.log("\n3e. Houten Warrenvakwerk zonder verticalen, 6 velden, L = 18 m, h = 2 m, C24 100 × 100, H = 8 kN");
{
  const r = doorreken({
    taak: "2", invoer_v: "1", vorm_v: "4", n_v: "6", L_v: "18", h_v: "2", F_b: "10", F_o: "5", H_v: "8",
    staaf_s: "4", houtklasse: "2", klimaat: "1", duur: "4", b_s: "100", h_s: "100",
  }, ["RR.(1; 2)", "RR.(1; 3)", "RR.(2; 3)", "Ns(1)", "k_mod", "nS", "nK", "graad"]);
  geenFouten(r, "Warren hout");
  // 6 bovenknopen van 10 kN, 5 tussenknopen onder van 5 kN: ΣF_v = 85 kN; H = 8 kN in bovenknoop 1 (op 1,5 m, 2 m hoog).
  // R_x = −8; momenten om knoop 1: 18·R_2y = 10·(1,5 + 4,5 + … + 16,5) + 5·(3 + 6 + … + 15) + 8·2 = 540 + 225 + 16 → R_2y = 43,39; R_1y = 41,61.
  const R2 = (10 * (1.5 + 4.5 + 7.5 + 10.5 + 13.5 + 16.5) + 5 * (3 + 6 + 9 + 12 + 15) + 8 * 2) / 18;
  const R1 = 85 - R2;
  // Staaf 1 (onderrand, eerste veld), snedemethode: snede door veld 1, momenten om bovenknoop 1 (1,5; 2), waar de
  // diagonaal, de bovenrand en de lasten H en F_b doorheen gaan. Moment linksom: M = (x − 1,5)·F_y − (y − 2)·F_x.
  // Reacties in (0, 0): M = −1,5·R_1y − 2·8 = −1,5·41,61 − 16. Staaf 1 trekt met N_1 naar rechts op y = 0: +2·N_1.
  // Evenwicht: M + 2·N_1 = 0 → N_1 = (1,5·41,61 + 16)/2 = 39,21 kN trek.
  const M = (0 - 1.5) * R1 - (0 - 2) * -8;
  toets(r, { "RR.(1; 2)": -8, "RR.(1; 3)": R1, "RR.(2; 3)": R2, "Ns(1)": -M / 2, k_mod: 0.9, nS: 23, nK: 13, graad: 0 }, 1e-3);
  // Knik van de maatgevende drukstaaf in hout: λ_rel = L/(i·π)·√(f_c,0,k/E_0,05), i = 100/√12; k_c uit (6.25).
  const Ls = r.uit.L_m, i = 100 / Math.sqrt(12);
  if (Ls) {
    const λ = ((Ls * 1000) / i / Math.PI) * Math.sqrt(21 / 7400);
    const k = 0.5 * (1 + 0.2 * (λ - 0.3) + λ * λ);
    const kc = Math.min(1, 1 / (k + Math.sqrt(k * k - λ * λ)));
    // f_c,0,d = 0,9·21/1,3 = 14,54 N/mm²; N_c,Rd = k_c·10 000·f_c,0,d.
    toets(r, { λ_rel: λ, k_c: kc, N_c_Rd: (kc * 10000 * ((0.9 * 21) / 1.3)) / 1000 }, 2e-3);
  } else waar("Warren hout: maatgevend op druk", false, "geen L_m");
  const lr = leesResultaat(r.nodes);
  waar("Warren hout: UC > 1 → voldoet niet", lr.uc > 1 && lr.voldoet === false, JSON.stringify(lr));
}

console.log("\n3f. Beweeglijk en onvolledig");
{
  // Het N-vakwerk als vierhoek zonder diagonaal: 4 knopen, 4 staven, 3 vastgehouden verplaatsingen → s + r = 7 < 8.
  const r = doorreken(vrij({
    knopen: [[0, 0], [4, 0], [4, 3], [0, 3]],
    staven: [[1, 2], [2, 3], [3, 4], [4, 1]],
    opl: [[1, 3], [2, 2]],
    lasten: [[3, 5, 0]],
  }, { staaf_s: "1", hoek_s: "3" }), ["status_v", "graad"]);
  geenFouten(r, "vierhoek");
  toets(r, { status_v: -1, graad: -1 });
  waar("vierhoek: melding beweeglijk", /Het vakwerk is beweeglijk/.test(r.tekst));
  const lr = leesResultaat(r.nodes);
  waar("vierhoek met toets: Maatgevende UC = ∞, voldoet niet", lr.uc === Infinity && lr.voldoet === false, JSON.stringify(lr));
  // Een staaf naar een knoop die niet bestaat.
  const o = doorreken(vrij({ knopen: [[0, 0], [4, 0], [2, 2]], staven: [[1, 2], [2, 3], [3, 7]], opl: [[1, 3], [2, 2]], lasten: [[3, 0, 10]] }, { staaf_s: "0" }));
  geenFouten(o, "onvolledig");
  waar("onvolledig: vraagt om bestaande knopen, geen slotzin", /nog niet compleet/.test(o.tekst) && !/Maatgevende UC/.test(o.tekst));
}

// ── 4. Vergeetmenietjes ─────────────────────────────────────────────────────
console.log("\n4. Vergeetmenietjes: L = 6 m, q = 10 kN/m, F = 20 kN, a = 2 m, E = 210 000 N/mm², I = 8356 cm⁴");
{
  const L = 6, q = 10, F = 20, a = 2, b = L - a, c = Math.min(a, b);
  const EI = 210e6 * 8356e-8; // kNm²
  const w = (x) => x * 1000; // m → mm
  // Per geval [M_veld, M_steun, V_max, w_max], elk uitgeschreven.
  const hand = [
    [(q * L * L) / 8, 0, (q * L) / 2, w((5 * q * L ** 4) / (384 * EI))],
    [(F * L) / 4, 0, F / 2, w((F * L ** 3) / (48 * EI))],
    [(F * a * b) / L, 0, (F * Math.max(a, b)) / L, w((F * c * (L * L - c * c) ** 1.5) / (9 * Math.sqrt(3) * L * EI))],
    [(F * L) / 3, 0, F, w((23 * F * L ** 3) / (648 * EI))],
    [(q * L * L) / (9 * Math.sqrt(3)), 0, (q * L) / 3, w((0.0065216 * q * L ** 4) / EI)],
    [(9 * q * L * L) / 128, (q * L * L) / 8, (5 * q * L) / 8, w((0.0054161 * q * L ** 4) / EI)],
    [(5 * F * L) / 32, (3 * F * L) / 16, (11 * F) / 16, w((F * L ** 3) / (48 * Math.sqrt(5) * EI))],
    [(q * L * L) / 24, (q * L * L) / 12, (q * L) / 2, w((q * L ** 4) / (384 * EI))],
    [(F * L) / 8, (F * L) / 8, F / 2, w((F * L ** 3) / (192 * EI))],
    // Tweezijdig ingeklemd, driehoek: M_A = qL²/30, M_B = qL²/20, R_A = 3qL/20; V = 0 op x = L·√0,3:
    // M_veld = qL²·(−1/30 + 0,15·√0,3 − 0,3^1,5/6) = 0,021 439·qL².
    [q * L * L * (-1 / 30 + 0.15 * Math.sqrt(0.3) - 0.3 ** 1.5 / 6), (q * L * L) / 20, (7 * q * L) / 20, w((0.0013085 * q * L ** 4) / EI)],
    [0, (q * L * L) / 2, q * L, w((q * L ** 4) / (8 * EI))],
    [0, F * L, F, w((F * L ** 3) / (3 * EI))],
    [0, (q * L * L) / 6, (q * L) / 2, w((q * L ** 4) / (30 * EI))],
    [0, (q * L * L) / 3, (q * L) / 2, w((11 * q * L ** 4) / (120 * EI))],
  ];
  const namen = [];
  for (let i = 1; i <= 14; i++) namen.push(`Mv_${i}`, `Ms_${i}`, `Vm_${i}`, `Wm_${i}`, `ok_${i}`);
  const r = doorreken({ taak: "3", L_c: "6", q_c: "10", F_c: "20", a_c: "2", E_c: "210000", I_c: "8356" }, [...namen, "alles_ok"]);
  geenFouten(r, "vergeetmenietjes");
  let mis = 0;
  hand.forEach((h, k) => {
    const i = k + 1;
    const ons = [r.uit[`Mv_${i}`], r.uit[`Ms_${i}`], r.uit[`Vm_${i}`], r.uit[`Wm_${i}`]];
    const fout = ons.map((o, j) => (Math.abs(o - h[j]) <= 3e-4 * Math.abs(h[j]) + 1e-9 ? null : `${["M_veld", "M_steun", "V", "w"][j]} ${o} tegen ${h[j]}`)).filter(Boolean);
    getest++;
    if (fout.length || r.uit[`ok_${i}`] !== 1) {
      mis++;
      fouten++;
      console.log(`  FOUT   geval ${i}: ${fout.join(", ")}${r.uit[`ok_${i}`] !== 1 ? " (geen vinkje in het blad)" : ""}`);
    }
  });
  console.log(`  ${mis ? "FOUT  " : "OK    "} 14 gevallen: M_veld, M_steun, V_max en w_max van de oplosser gelijk aan de handformule, met een vinkje`);
  toets(r, { alles_ok: 1, EI });
  waar("vergeetmenietjes: 14 vinkjes, geen kruis", (r.tekst.match(/✓/g) || []).length === 14 && !r.tekst.includes("✗"));
  waar("vergeetmenietjes: geen slotzin, geen UC", leesResultaat(r.nodes).uc === null && /Geen toets/.test(r.tekst));
  // Zonder E en I: M en V blijven, w krijgt een streepje en telt niet in het vinkje.
  const z = doorreken({ taak: "3", L_c: "6", q_c: "10", F_c: "20" }, ["Mv_1", "alles_ok"]);
  geenFouten(z, "zonder EI");
  toets(z, { Mv_1: 45, alles_ok: 1 });
}

// ── 5. Leeg blad, alle keuzes, registratie ──────────────────────────────────
console.log("\n5. Leeg blad per keuze, de andere vormen en de registratie");
{
  for (const [taak, zin] of [["1", /Vul de maten van ten minste één deel in/], ["2", /Vul de overspanning en de hoogte in/], ["3", /Vul de overspanning in/]]) {
    const r = doorreken({ taak });
    geenFouten(r, `leeg, keuze ${taak}`);
    waar(`leeg, keuze ${taak}: vraagt om invoer, geen slotzin`, zin.test(r.tekst) && !/Maatgevende UC/.test(r.tekst));
  }
  const vrijLeeg = doorreken({ taak: "2", invoer_v: "2" });
  geenFouten(vrijLeeg, "vrij vakwerk, leeg");
  waar("vrij vakwerk, leeg: vraagt om knopen en staven", /nog niet compleet/.test(vrijLeeg.tekst));
  // Elke vorm van het standaardvakwerk en elke doorsnede rekent door.
  for (const vorm of ["1", "2", "3", "4"]) {
    for (const n of ["2", "3", "8"]) {
      const r = doorreken({ taak: "2", invoer_v: "1", vorm_v: vorm, n_v: n, L_v: "10", h_v: "1.5", F_b: "5", F_o: "2", H_v: "1", staaf_s: "2", prof_s: "21" }, ["graad", "status_v"]);
      const ok = !["Error", "NaN", "Undefined symbol"].some((s) => r.tekst.includes(s)) && r.uit.graad === 0 && r.uit.status_v === 1;
      getest++;
      if (!ok) { fouten++; console.log(`  FOUT   vorm ${vorm}, ${n} velden: graad ${r.uit.graad}, status ${r.uit.status_v}`); }
    }
  }
  console.log("  OK     standaardvakwerk: vier vormen × 2, 3 en 8 velden, statisch bepaald en stabiel (fouten hierboven)");
  for (const [naam, w] of [
    ["buis", { staaf_s: "3", D_s: "60.3", t_s: "4" }], ["rond staal", { staaf_s: "3", D_s: "20", t_s: "0" }],
    ["HEA", { staaf_s: "2", prof_s: "3", staalsoort: "355" }], ["hoekstaal S355 (klasse 4)", { staaf_s: "1", hoek_s: "1", staalsoort: "355" }],
  ]) {
    const r = doorreken({ taak: "2", invoer_v: "1", vorm_v: "2", n_v: "4", L_v: "8", h_v: "1", F_b: "5", ...w });
    geenFouten(r, `staaf: ${naam}`);
    const lr = leesResultaat(r.nodes);
    waar(`staaf: ${naam}: slotzin leesbaar`, lr.uc !== null && lr.voldoet !== null, JSON.stringify(lr));
    if (naam.includes("klasse 4")) waar("hoekstaal S355: klasse 4 → voldoet niet", /klasse 4/.test(r.tekst) && lr.voldoet === false);
  }
  const index = readFileSync(join(hier, "../packages/desktop/src/templates/index.ts"), "utf8");
  const boom = readFileSync(join(hier, "../packages/desktop/src/components/calc/projectTree.ts"), "utf8");
  waar("register: templates/index.ts", /"mechanica": mechanica/.test(index));
  waar("modulelijst: projectTree.ts, Algemeen, status controleren", /templateId: "mechanica", status: "controleren"/.test(boom));
}

console.log(
  fouten === 0
    ? `\nMechanica: alle ${getest} controles kloppen met de handberekening.`
    : `\nMechanica: ${fouten} van ${getest} controles wijken af.`,
);
process.exit(fouten === 0 ? 0 : 1);
