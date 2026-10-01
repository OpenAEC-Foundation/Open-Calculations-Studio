/**
 * Controlescript voor de module Mechanica (templates/mechanica.ts) en de
 * doorsnedefuncties in de rekenkern (packages/core/src/doorsnede.ts).
 *
 * Geen referentieberekening nodig: elk voorbeeld is hieronder met de hand
 * uitgewerkt (de formules staan in de code, de getallen in het commentaar).
 *
 *   1. De rekenkern: alle 27 I- en H-profielen uit profielen.ts nagerekend uit
 *      h, b, t_w, t_f en r (A, I_y, I_z, W_pl,y, W_pl,z op de afronding van de
 *      tabel), een IPE 300 volledig met de hand (afrondingen als vierkant min
 *      kwart cirkel, de breedte in de aansluiting van lijf en flens), een
 *      rechthoek, een cirkel, een buis, een liggend profiel, het statisch
 *      moment en de omtrek voor de tekening.
 *   2. Doorsnede in het blad:
 *      a. T-doorsnede (flens 200 × 20, lijf 10 × 300): zwaartepunt, Steiner,
 *         W_el boven en onder, S op de zwaartelijn en in de aansluiting,
 *         plastische neutrale lijn in de flens en W_pl.
 *      b. Hout 100 × 200 met een stalen strip 100 × 10 eronder, n = 20:
 *         ideële A, z_c en I, en W per deel (σ = n·M/W).
 *      c. Koker 200 × 200 als rechthoek met een gat 100 × 100 (n = −1).
 *      d. L-vorm uit twee rechthoeken: I_yz, de hoofdassen (α = 45°).
 *      e. Een enkel profiel uit de tabel: de tabelwaarden, staand en liggend.
 *      f. Asymmetrisch hout met een stalen strip rechtsonder (n = 20): I_y,
 *         I_z, I_yz, de hoofdassen, W per vezel en per deel, S; de
 *         kanttekening over scheve buiging.
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
 *      g. Statisch bepaald vakwerk met de snedemethode, twee verplaatsingen met
 *         virtuele arbeid, en de staaftoets in hoekstaal (knik om v) en hout.
 *      h. Enkel hoekstaal op trek, met bouten in één been (NEN-EN 1993-1-8,
 *         3.10.3: één, twee en drie bouten, A_net, β_2 en β_3) of gelast, en
 *         zonder volledige boutinvoer: niet getoetst, voldoet niet.
 *      i. Tekening: een horizontale knooplast valt niet over een staaf.
 *   4. Vergeetmenietjes: alle vijftien gevallen, de waarden van de oplosser
 *      tegen de formule hieronder in het script, en in het blad een vinkje;
 *      een tweede set met de hand (twee steunpunten met q, uitkraging met
 *      driehoekslast, geval 15: tweezijdig ingeklemd met de puntlast buiten
 *      het midden), en een last naar boven.
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
  // IPE 300 met de hand uit h = 300, b = 150, t_w = 7,1, t_f = 10,7, r = 15 (mm).
  // Een afronding is een vierkant r × r min een kwart cirkel: A_f = (1 − π/4)·r² = 48,285 mm², zwaartepunt op
  // e = r·(10 − 3π)/(12 − 3π) = 3,3505 mm van de flens (en van het lijf), I om de flensrand (1 − 5π/16)·r⁴ = 924,0 mm⁴.
  // A = 2·150·10,7 + 278,6·7,1 + 4·48,285 = 3210 + 1978,06 + 193,14 = 5381,2 mm² (tabel 53,81 cm²).
  // I_y = 2·(150·10,7³/12 + 1605·144,65²) + 7,1·278,6³/12 + 4·(A_f·139,3² − 2·139,3·A_f·e + 924,0)
  //     = 67 195 454 + 12 794 415 + 3 571 222 = 83 561 092 mm⁴ (tabel 8356 cm⁴).
  // W_pl,y = 2·(1605·144,65 + 7,1·139,3²/2 + 2·A_f·(139,3 − e)) = 2·(232 163 + 68 886 + 13 129) = 628 356 mm³ (tabel 628,4 cm³).
  {
    const [h, b, tw, tf, r] = [300, 150, 7.1, 10.7, 15];
    const Af = (1 - Math.PI / 4) * r * r, e = (r * (10 - 3 * Math.PI)) / (12 - 3 * Math.PI), If = (1 - (5 * Math.PI) / 16) * r ** 4, d = h / 2 - tf;
    const IPE = [[3, h, b, tw, tf, r, 0, 0, 1, 0]];
    const g3 = doorsnedeGrootheden(IPE);
    gelijk("IPE 300 met de hand: A", g3[0], 2 * b * tf + (h - 2 * tf) * tw + 4 * Af);
    gelijk("IPE 300 met de hand: I_y", g3[3], 2 * ((b * tf ** 3) / 12 + b * tf * (h / 2 - tf / 2) ** 2) + (tw * (h - 2 * tf) ** 3) / 12 + 4 * (Af * d * d - 2 * d * Af * e + If));
    gelijk("IPE 300 met de hand: W_pl,y", doorsnedePlastisch(IPE, 1)[0], 2 * (b * tf * (h / 2 - tf / 2) + (tw * d * d) / 2 + 2 * Af * (d - e)));
    // Breedte in de aansluiting van lijf en flens (z = 139,3): onder de flens het lijf met de twee afrondingen,
    // t_w + 2r = 37,1 mm (niet 37,09: de boog loopt daar steil, de breedte hoort in de snede zelf); onderaan de afrondingen t_w.
    gelijk("IPE 300: breedte in de aansluiting = t_w + 2r", doorsnedeStatisch(IPE, 1, 139.3)[1], tw + 2 * r, 1e-9, 1e-9);
    gelijk("IPE 300: S in de aansluiting = alleen de flens", doorsnedeStatisch(IPE, 1, 139.3)[0], b * tf * (h / 2 - tf / 2), 1e-9, 1e-6);
    gelijk("IPE 300: breedte onderaan de afronding = t_w", doorsnedeStatisch(IPE, 1, 124.3)[1], tw, 1e-9, 1e-9);
  }
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

console.log("\n2f. Asymmetrisch samengesteld: hout 100 × 200 (hart 0; 100) met een stalen strip 60 × 8 rechtsonder (hart 20; −4), n = E_s/E_h = 20");
{
  const r = doorreken({
    taak: "1", samengesteld: "1",
    ...DEEL(1, 1, { b: 100, h: 200, y: 0, z: 100, n: 1 }), ...DEEL(2, 1, { b: 60, h: 8, y: 20, z: -4, n: 20 }),
  }, ["homogeen", "ask"]);
  geenFouten(r, "hout met strip");
  // Hout: A = 20 000 mm², I_y = 100·200³/12 = 66 666 667, I_z = 200·100³/12 = 16 666 667 mm⁴.
  // Staal: n·A = 20·480 = 9 600 mm², n·I_y = 20·60·8³/12 = 51 200, n·I_z = 20·8·60³/12 = 2 880 000 mm⁴.
  // A* = 29 600 mm² = 296 cm²; y_c = 9 600·20/29 600 = 6,486 mm; z_c = (20 000·100 − 9 600·4)/29 600 = 66,270 mm.
  // Steiner voor twee delen: Σ n·A·a² = μ·d² met μ = 20 000·9 600/29 600 = 6 486,5 mm² en d de afstand tussen de harten:
  //   I_y = 66 666 667 + 51 200 + μ·104² = 136 875 705 mm⁴ = 13 688 cm⁴
  //   I_z = 16 666 667 + 2 880 000 + μ·20² = 22 141 261 mm⁴ = 2 214,1 cm⁴
  //   I_yz = μ·(20 − 0)·(−4 − 100) = −13 491 892 mm⁴ = −1 349,2 cm⁴ (strip rechtsonder: y > y_c en z < z_c).
  // Hoofdassen: I_1,2 = 7 950,9 ± √(5 736,7² + 1 349,2²) = 7 950,9 ± 5 893,2 → 13 844,1 en 2 057,6 cm⁴;
  //   α_1 = ½·atan(2·1 349,2/11 473,4) = 6,617° (linksom: de strip rechtsonder draait as 1 omhoog naar rechts).
  // Vezels: e_b = 200 − 66,27 = 133,73; e_o = 66,27 + 8 = 74,27; e_r = 50 − 6,486 = 43,51; e_l = 56,49 mm.
  //   W_el,y,b = 1 023,5; W_el,y,o = 1 842,9; W_el,z,r = 508,8; W_el,z,l = 392,0 cm³ (referentiemateriaal hout).
  //   Per deel: hout I*/(1·133,73) = 1 023,5 cm³ (bovenrand), staal I*/(20·74,27) = 92,15 cm³ (onderrand strip).
  // S op de zwaartelijn: hout boven z_c, 100·133,73²/2 = 894 182 mm³, b = 100 mm. Rechts van y_c liggen hout en strip
  //   allebei tot y = 50: per mm breedte ideëel 200 + 20·8 = 360 mm², S_z = 360·43,51²/2 = 340 817 mm³; h_0 = 200 + 8 = 208 mm.
  // Ter informatie, een vrije ligger (scheve buiging): σ = M_y·(I_z·z − I_yz·y)/(I_y·I_z − I_yz²) geeft in de hoek
  //   rechtsboven W = 803 cm³ in plaats van 1 023 cm³; daarom de kanttekening in het blad zodra I_yz ≠ 0.
  const μ = (20000 * 9600) / 29600, zc = 1961600 / 29600, yc = 192000 / 29600;
  const Iy = 66666666.6667 + 51200 + μ * 104 ** 2, Iz = 16666666.6667 + 2880000 + μ * 20 ** 2, Iyz = μ * 20 * -104;
  const m = (Iy + Iz) / 2, R = Math.hypot((Iy - Iz) / 2, Iyz);
  toets(r, {
    A: 296, y_c: yc, z_c: zc, I_y: Iy / 1e4, I_z: Iz / 1e4, I_yz: Iyz / 1e4, I_1: (m + R) / 1e4, I_2: (m - R) / 1e4,
    α_1: (0.5 * Math.atan2(-2 * Iyz, Iy - Iz) * 180) / Math.PI, e_b: 200 - zc, e_o: zc + 8, e_r: 50 - yc, e_l: 50 + yc,
    W_el_y_b: Iy / (200 - zc) / 1000, W_el_y_o: Iy / (zc + 8) / 1000, W_el_z_r: Iz / (50 - yc) / 1000, W_el_z_l: Iz / (50 + yc) / 1000,
    S_y_max: (100 * (200 - zc) ** 2) / 2 / 1000, b_0: 100, S_z_max: (360 * (50 - yc) ** 2) / 2 / 1000, h_0: 208, homogeen: 0, ask: 1,
  });
  const Ws = (Iy / (20 * (zc + 8)) / 1000).toPrecision(4);
  waar(`W per deel: staal ${Ws} cm³ in de tabel`, r.tekst.includes(` ${Number(Ws)} `));
  waar("I_yz ≠ 0: kanttekening over scheve buiging bij de weerstandsmomenten", /buigt scheef/.test(r.tekst));
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

console.log("\n3g. Vakwerk met de snedemethode en virtuele arbeid: onderrand 1 (0,0) – 2 (4,0) – 3 (8,0) – 4 (12,0), boven 5 (4,3) en 6 (8,3)");
{
  // Staven: 1: 1–2, 2: 2–3, 3: 3–4, 4: 1–5, 5: 5–6, 6: 6–4, 7: 2–5, 8: 3–6, 9: 5–3. Knoop 1 vast, knoop 4 een rol.
  // Lasten: 20 kN omlaag in 5, 10 kN omlaag in 3, 6 kN naar rechts in 6. s + r = 9 + 3 = 12 = 2k: statisch bepaald.
  // Reacties: momenten om 1 (linksom +): 12·R_4 − 20·4 − 10·8 − 6·3 = 0 → R_4 = 178/12 = 14,833; R_1y = 30 − 14,833 = 15,167; R_1x = −6.
  // Snede door veld 2 (staven 5, 9 en 2), linkerdeel met knopen 1, 2 en 5, trek positief:
  //   momenten om knoop 3 (8,0): −8·15,167 + 4·20 − 3·N_5 = 0 → N_5 = −13,778 kN (druk);
  //   momenten om knoop 5 (4,3): −4·15,167 − 3·6 + 3·N_2 = 0 → N_2 = 26,222 kN (trek);
  //   verticaal: 15,167 − 20 − 0,6·N_9 = 0 → N_9 = −8,056 kN (druk); controle horizontaal: −6 − 13,778 + 26,222 − 0,8·8,056 = 0.
  // Knoop 1: 15,167 + 0,6·N_4 = 0 → N_4 = −25,278; −6 + N_1 + 0,8·N_4 = 0 → N_1 = 26,222. Knoop 2: N_7 = 0 (nulstaaf).
  // Knoop 4: 14,833 + 0,6·N_6 = 0 → N_6 = −24,722; N_3 = −0,8·N_6 = 19,778. Knoop 6: N_8 = −0,6·N_6 = 14,833.
  // Verplaatsing van knoop 3 omlaag met virtuele arbeid: eenheidslast 1 omlaag in 3 → R_4 = 2/3, R_1 = 1/3 en
  //   n = 4/9, 4/9, 8/9, −5/9, −8/9, −10/9, 0, 2/3, 5/9 voor staaf 1 … 9. Σ N·n·L = 427,40 kNm.
  //   L 100x100x10: EA = 210 000·1 920 N = 403 200 kN → δ = 427,40/403 200 = 1,060 mm; hout 150 × 150 C24:
  //   EA = 11 000·22 500 N = 247 500 kN → δ = 1,727 mm.
  // Horizontale verplaatsing van de rol (knoop 4): eenheidslast naar rechts in 4 → n = 1 in de onderrand, 0 elders:
  //   Σ N·L = (26,222 + 26,222 + 19,778)·4 = 288,89 kNm → 0,7165 mm (staal).
  const kn = [[0, 0], [4, 0], [8, 0], [12, 0], [4, 3], [8, 3]];
  const staven = [[1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [6, 4], [2, 5], [3, 6], [5, 3]];
  const N = [236 / 9, 236 / 9, 178 / 9, -455 / 18, -124 / 9, -445 / 18, 0, 89 / 6, -145 / 18];
  const n = [4 / 9, 4 / 9, 8 / 9, -5 / 9, -8 / 9, -10 / 9, 0, 2 / 3, 5 / 9];
  const L = staven.map(([i, j]) => Math.hypot(kn[j - 1][0] - kn[i - 1][0], kn[j - 1][1] - kn[i - 1][1]));
  const ΣNnL = N.reduce((s, v, k) => s + v * n[k] * L[k], 0);
  const ΣNL1 = (N[0] + N[1] + N[2]) * 4;
  const model = { knopen: kn, staven, opl: [[1, 3], [4, 2]], lasten: [[5, 0, 20], [3, 0, 10], [6, 6, 0]] };
  const namen = [...Nnamen(9), "RR.(1; 2)", "RR.(1; 3)", "RR.(2; 3)", "UU.(3; 3)", "UU.(4; 2)", "graad", "mUC"];
  const verwacht = Object.fromEntries([...N.map((v, k) => [`Ns(${k + 1})`, v]), ["RR.(1; 2)", -6], ["RR.(1; 3)", 91 / 6], ["RR.(2; 3)", 89 / 6], ["graad", 0], ["mUC", 4]]);

  // Staal: L 100x100x10 S235, knik om de zwakke as v met i_v = 19,5 mm; maatgevend staaf 4 (1–5), 25,28 kN druk over 5 m.
  // λ̄ = 5000/19,5/(π·√(210 000/235)) = 2,730; Φ = 0,5·(1 + 0,34·2,530 + 2,730²) = 4,657; χ = 1/(4,657 + √(4,657² − 2,730²)) = 0,1186;
  // N_b,Rd = 0,1186·1920·235 = 53,52 kN; UC = 25,28/53,52 = 0,472. Trek: N_t,Rd = 1920·235 = 451,2 kN.
  const s = doorreken(vrij(model, { staaf_s: "1", hoek_s: "8", staalsoort: "235" }), namen);
  geenFouten(s, "snedemethode, staal");
  const λ = 5000 / 19.5 / (Math.PI * Math.sqrt(210000 / 235)), Φ = 0.5 * (1 + 0.34 * (λ - 0.2) + λ * λ), χ = 1 / (Φ + Math.sqrt(Φ * Φ - λ * λ));
  toets(s, { ...verwacht, "UU.(3; 3)": -ΣNnL / 403200, "UU.(4; 2)": ΣNL1 / 403200, λ_k: λ, χ, N_b_Rd: (χ * 1920 * 235) / 1000, UC_max: (-N[3] * 1000) / (χ * 1920 * 235) }, 1e-3);
  waar("snedemethode, staal: staaf 4 op druk, staaf 2 op trek, staaf 7 nulstaaf in de tabel", /4 1–5 5 -25\.28 druk/.test(s.tekst) && /2 2–3 4 26\.22 trek/.test(s.tekst) && /7 2–5 3 0 nulstaaf/.test(s.tekst));

  // Hout: C24 150 × 150, klimaatklasse 1, kort: k_mod = 0,9, γ_M = 1,3; i = 150/√12 = 43,30 mm.
  // λ_rel = 5000/(43,30·π)·√(21/7400) = 1,958; k = 0,5·(1 + 0,2·1,658 + 1,958²) = 2,583; k_c = 1/(2,583 + √(2,583² − 1,958²)) = 0,2344;
  // f_c,0,d = 0,9·21/1,3 = 14,54 N/mm²; N_c,Rd = 0,2344·22 500·14,54 = 76,66 kN; UC = 25,28/76,66 = 0,330.
  // Trek: f_t,0,d = 0,9·14/1,3 = 9,692 N/mm², N_t,Rd = 22 500·9,692 = 218,1 kN.
  const h = doorreken(vrij(model, { staaf_s: "4", houtklasse: "2", klimaat: "1", duur: "4", b_s: "150", h_s: "150" }), namen);
  geenFouten(h, "snedemethode, hout");
  const λr = (5000 / (150 / Math.sqrt(12)) / Math.PI) * Math.sqrt(21 / 7400), kk = 0.5 * (1 + 0.2 * (λr - 0.3) + λr * λr), kc = 1 / (kk + Math.sqrt(kk * kk - λr * λr));
  toets(h, {
    ...verwacht, "UU.(3; 3)": -ΣNnL / 247500, λ_rel: λr, k_knik: kk, k_c: kc, f_t_0_d: (0.9 * 14) / 1.3, f_c_0_d: (0.9 * 21) / 1.3,
    N_c_Rd: (kc * 22500 * ((0.9 * 21) / 1.3)) / 1000, UC_max: (-N[3] * 1000) / (kc * 22500 * ((0.9 * 21) / 1.3)),
  }, 1e-3);
  // Op papier staan de karakteristieke waarden in de formule, niet de hulpfunctie van de materiaaltabel.
  const plat = h.tekst.replace(/\s+/g, "");
  waar("hout: f_t,0,d en λ_rel tonen f_t,0,k, f_c,0,k en E_0,05, geen hulpfunctie", !/mh\(|ft0dn|fc0dn|ft0d_n|fc0d_n/.test(plat),plat.match(/.{40}(mh\(|ft0d|fc0d).{40}/)?.[0]);
}

console.log("\n3h. Hoekstaal L 50x50x5 S235 op trek: twee staven van 1 (0,0) en 2 (4,0) naar 3 (2; −1,5), 100 kN omlaag in 3");
{
  // Staaflengte √(2² + 1,5²) = 2,5 m, sin θ = 1,5/2,5 = 0,6: N = 100/(2·0,6) = 83,33 kN trek in beide staven.
  // L 50x50x5: A = 480 mm², t = 5 mm; S235: f_y = 235, f_u = 360 N/mm² (tabel 3.1, t ≤ 40 mm); γ_M0 = 1,0, γ_M2 = 1,25.
  // Gelast (NEN-EN 1993-1-8, 4.13(2): bruto doorsnede): N_t,Rd = 480·235 = 112,8 kN; UC = 83,33/112,8 = 0,739.
  // Bouten in één been, gat d_0 = 13 mm: A_net = 480 − 5·13 = 415 mm² (NEN-EN 1993-1-8, 3.10.3).
  //   Drie bouten, p_1 = 65 = 5·d_0: β_3 = 0,7 (tabel 3.8); N_u,Rd = 0,7·415·360/1,25 = 83,66 kN (3.13);
  //     N_t,Rd = min(112,8; 83,66) = 83,66 kN; UC = 83,33/83,66 = 0,996.
  //   Twee bouten, p_1 = 40 mm: p_1/d_0 = 3,077, β_2 = 0,4 + 0,3·(3,077 − 2,5)/2,5 = 0,4692;
  //     N_u,Rd = 0,4692·415·360/1,25 = 56,08 kN (3.12); UC = 1,486.
  //   Eén bout, e_2 = 25 mm: N_u,Rd = 2·(25 − 0,5·13)·5·360/1,25 = 53,28 kN (3.11); UC = 1,564.
  //   Bouten zonder d_0: niet getoetst → Maatgevende UC = ∞, voldoet niet.
  const model = { knopen: [[0, 0], [4, 0], [2, -1.5]], staven: [[1, 3], [2, 3]], opl: [[1, 3], [2, 3]], lasten: [[3, 0, 100]] };
  const N = 100 / 1.2;
  const basis = { staaf_s: "1", hoek_s: "3", staalsoort: "235" };
  const gev = [
    ["gelast", {}, { UC_max: N / 112.8, N_t_Rd: 112.8 }],
    ["drie bouten, p_1 = 5·d_0", { aansl_s: "2", nb_s: "3", d_0: "13", p_1: "65" }, { A_net: 4.15, β_3: 0.7, N_u_Rd: (0.7 * 415 * 360) / 1250, N_pl_Rd: 112.8, N_t_Rd: (0.7 * 415 * 360) / 1250, UC_max: N / ((0.7 * 415 * 360) / 1250) }],
    ["twee bouten, p_1 = 40", { aansl_s: "2", nb_s: "2", d_0: "13", p_1: "40" }, { β_2: 0.4 + (0.3 * (40 / 13 - 2.5)) / 2.5, N_u_Rd: ((0.4 + (0.3 * (40 / 13 - 2.5)) / 2.5) * 415 * 360) / 1250, UC_max: N / (((0.4 + (0.3 * (40 / 13 - 2.5)) / 2.5) * 415 * 360) / 1250) }],
    ["één bout, e_2 = 25", { aansl_s: "2", nb_s: "1", d_0: "13", e_2: "25" }, { N_u_Rd: (2 * (25 - 6.5) * 5 * 360) / 1250, UC_max: N / ((2 * (25 - 6.5) * 5 * 360) / 1250) }],
  ];
  for (const [wat, extra, verwacht] of gev) {
    const r = doorreken(vrij(model, { ...basis, ...extra }), ["Ns(1)", "Ns(2)"]);
    geenFouten(r, `hoekstaal op trek, ${wat}`);
    toets(r, { "Ns(1)": N, "Ns(2)": N, ...verwacht }, 1e-3);
    const lr = leesResultaat(r.nodes);
    waar(`hoekstaal op trek, ${wat}: slotzin ${verwacht.UC_max <= 1 ? "voldoet" : "voldoet niet"}`, lr.uc !== null && Math.abs(lr.uc - verwacht.UC_max) < 5e-3 && lr.voldoet === verwacht.UC_max <= 1, JSON.stringify(lr));
  }
  const open = doorreken(vrij(model, { ...basis, aansl_s: "2", nb_s: "2" }), ["bo"]);
  geenFouten(open, "hoekstaal op trek, bouten zonder invoer");
  const lr = leesResultaat(open.nodes);
  waar("bouten zonder d_0 en p_1: melding, 'niet getoetst' in de tabel, Maatgevende UC = ∞, voldoet niet",
    open.uit.bo === 1 && /vul de gatdiameter/.test(open.tekst) && /niet getoetst/.test(open.tekst) && lr.uc === Infinity && lr.voldoet === false, JSON.stringify(lr));
  // Druk wordt bij bouten niet op de netto doorsnede getoetst: 3g met bouten geeft dezelfde knik (staaf 4 maatgevend).
  const g = doorreken(vrij({ knopen: [[0, 0], [4, 0], [8, 0], [12, 0], [4, 3], [8, 3]], staven: [[1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [6, 4], [2, 5], [3, 6], [5, 3]], opl: [[1, 3], [4, 2]], lasten: [[5, 0, 20], [3, 0, 10], [6, 6, 0]] },
    { staaf_s: "1", hoek_s: "8", aansl_s: "2", nb_s: "3", d_0: "22", p_1: "70" }), ["mUC"]);
  // L 100x100x10 met drie bouten d_0 = 22, p_1 = 70: A_net = 1920 − 10·22 = 1700 mm², β_3 = 0,5 + 0,2·(70/22 − 2,5)/2,5 = 0,5545,
  // N_u,Rd = 0,5545·1700·360/1,25 = 271,5 kN; de onderrand (26,22 kN) haalt UC 0,097, de knik van staaf 4 blijft maatgevend (0,472).
  toets(g, { mUC: 4, UC_max: 0.4723 }, 2e-3);
}

console.log("\n3i. Tekening: horizontale knooplasten naast de staven");
{
  // Knoop 2 en 3 (onderrand, aan beide kanten een staaf): de pijl 12 px boven de knoop; knoop 6 (links de bovenrand,
  // rechts een schuine staaf 1 : 0,75): de pijl trekt aan de rechterkant; knoop 5 met een last naar links: rechts ligt
  // de bovenrand, dus de pijl trekt aan de linkerkant. Geen enkele pijl mag over een staaf vallen.
  const r = doorreken(vrij({
    knopen: [[0, 0], [4, 0], [8, 0], [12, 0], [4, 3], [8, 3]],
    staven: [[1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [6, 4], [2, 5], [3, 6], [5, 3]],
    opl: [[1, 3], [4, 2]],
    lasten: [[2, 5, 0], [5, -4, 0], [6, 6, 0], [3, -7, 0]],
  }, { staaf_s: "0" }));
  geenFouten(r, "horizontale lasten");
  const svg = (r.html.match(/<svg viewbox="0 0 480[\s\S]*?<\/svg>/) || [""])[0];
  const lijnen = [...svg.matchAll(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)" style="stroke:(#[0-9a-f]+)/g)].map((m) => ({ x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4], kleur: m[5] }));
  const pijlen = lijnen.filter((l) => l.kleur === "#047857" && Math.abs(l.y1 - l.y2) < 0.01);
  const staven = lijnen.filter((l) => ["#1d4ed8", "#b91c1c", "#9ca3af"].includes(l.kleur));
  // Een pijl valt over een staaf als een punt van de pijl op minder dan 2 px van die staaf ligt.
  const afstand = (px, py, s) => {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((px - s.x1) * dx + (py - s.y1) * dy) / L2));
    return Math.hypot(px - s.x1 - t * dx, py - s.y1 - t * dy);
  };
  const over = pijlen.filter((p) => staven.some((s) => [0.25, 0.5, 0.75].some((f) => afstand(p.x1 + f * (p.x2 - p.x1), p.y1, s) < 2)));
  waar("vier horizontale pijlen getekend, geen over een staaf", pijlen.length === 4 && over.length === 0, `${pijlen.length} pijlen, ${over.length} over een staaf`);
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
    // Geval 15, tweezijdig ingeklemd met F op a = 2 m (b = 4 m; c = 2 de kortste, d = 4 de langste afstand):
    // M_A = F·a·b²/L² = 20·2·16/36 = 17,78 kNm (het grootste steunpuntsmoment, F·a·b·d/L²), M_B = F·a²·b/L² = 8,89 kNm;
    // onder de last M = 2F·a²·b²/L³ = 2·20·4·16/216 = 11,85 kNm; R_A = F·d²·(3c + d)/L³ = 20·16·10/216 = 14,81 kN;
    // w_max = 2F·d³·c²/(3EI·(3d + c)²) = 2·20·64·4/(3·EI·14²) = 10 240/(588·EI) m, op 2dL/(3d + c) = 3,43 m van het rechter steunpunt.
    [(2 * F * a * a * b * b) / L ** 3, (F * a * b * b) / L ** 2, (F * b * b * (3 * a + b)) / L ** 3, w((2 * F * b ** 3 * a * a) / (3 * EI * (3 * b + a) ** 2))],
  ];
  const namen = [];
  for (let i = 1; i <= 15; i++) namen.push(`Mv_${i}`, `Ms_${i}`, `Vm_${i}`, `Wm_${i}`, `ok_${i}`);
  const r = doorreken({ taak: "3", L_c: "6", q_c: "10", F_c: "20", a_c: "2", E_c: "210000", I_c: "8356" }, [...namen, "alles_ok"]);
  geenFouten(r, "vergeetmenietjes");
  let mis = 0;
  // Het blad drukt vier significante cijfers af: een halve eenheid van het vierde cijfer is 5·10⁻⁴ relatief (14,81 voor 14,815).
  hand.forEach((h, k) => {
    const i = k + 1;
    const ons = [r.uit[`Mv_${i}`], r.uit[`Ms_${i}`], r.uit[`Vm_${i}`], r.uit[`Wm_${i}`]];
    const fout = ons.map((o, j) => (Math.abs(o - h[j]) <= 5e-4 * Math.abs(h[j]) + 1e-9 ? null : `${["M_veld", "M_steun", "V", "w"][j]} ${o} tegen ${h[j]}`)).filter(Boolean);
    getest++;
    if (fout.length || r.uit[`ok_${i}`] !== 1) {
      mis++;
      fouten++;
      console.log(`  FOUT   geval ${i}: ${fout.join(", ")}${r.uit[`ok_${i}`] !== 1 ? " (geen vinkje in het blad)" : ""}`);
    }
  });
  console.log(`  ${mis ? "FOUT  " : "OK    "} 15 gevallen: M_veld, M_steun, V_max en w_max van de oplosser gelijk aan de handformule, met een vinkje`);
  toets(r, { alles_ok: 1, EI });
  waar("vergeetmenietjes: 15 vinkjes, geen kruis", (r.tekst.match(/✓/g) || []).length === 15 && !r.tekst.includes("✗"));
  waar("vergeetmenietjes: geen slotzin, geen UC", leesResultaat(r.nodes).uc === null && /Geen toets/.test(r.tekst));
  // Zonder E en I: M en V blijven, w krijgt een streepje en telt niet in het vinkje.
  const z = doorreken({ taak: "3", L_c: "6", q_c: "10", F_c: "20" }, ["Mv_1", "alles_ok"]);
  geenFouten(z, "zonder EI");
  toets(z, { Mv_1: 45, alles_ok: 1 });
}

console.log("\n4b. Vergeetmenietjes met de hand: L = 5 m, q = 12 kN/m, F = 30 kN, a = 1,5 m, E = 210 000 N/mm², I = 5790 cm⁴");
{
  // EI = 210·10⁶ kN/m² · 5790·10⁻⁸ m⁴ = 12 159 kNm².
  // Geval 1, twee steunpunten met q: M = qL²/8 = 12·25/8 = 37,5 kNm; V = qL/2 = 30 kN; w = 5qL⁴/(384EI) = 37 500/4 669 056 m = 8,032 mm.
  // Geval 13, uitkraging met driehoekslast, q bij de inklemming: resultante qL/2 = 30 kN op L/3 van de inklemming,
  //   M = 30·5/3 = qL²/6 = 50 kNm; w = qL⁴/(30EI) = 7 500/364 770 m = 20,56 mm.
  // Geval 14, driehoekslast met q aan het vrije eind: resultante 30 kN op 2L/3, M = qL²/3 = 100 kNm;
  //   w = 11qL⁴/(120EI) = 82 500/1 459 080 m = 56,54 mm.
  const EI = 210e6 * 5790e-8;
  const r = doorreken({ taak: "3", L_c: "5", q_c: "12", F_c: "30", a_c: "1.5", E_c: "210000", I_c: "5790" }, [
    "Mv_1", "Vm_1", "Wm_1", "Ms_13", "Vm_13", "Wm_13", "Ms_14", "Vm_14", "Wm_14", "alles_ok",
    // Geval 15 in het blad, en de oplossing zelf om het rechter steunpunt en de plaats van w_max (x_15 is de uitkomst [x, V, M, w] van R_15):
    "Mv_15", "Ms_15", "Vm_15", "Wm_15", "ok_15", "R_15", "ligger_int(x_15; 3; 5)", "ligger_ext(x_15; 4)[2]",
  ]);
  geenFouten(r, "vergeetmenietjes, tweede set");
  toets(r, {
    EI, Mv_1: 37.5, Vm_1: 30, Wm_1: (1000 * 5 * 12 * 5 ** 4) / (384 * EI),
    Ms_13: 50, Vm_13: 30, Wm_13: (1000 * 12 * 5 ** 4) / (30 * EI), Ms_14: 100, Vm_14: 30, Wm_14: (1000 * 11 * 12 * 5 ** 4) / (120 * EI), alles_ok: 1,
  }, 1e-3);
  // Geval 15, tweezijdig ingeklemd, F = 30 kN op a = 1,5 m, b = 3,5 m: M_A = F·a·b²/L² = 30·1,5·12,25/25 = 22,05 kNm;
  // M_B = F·a²·b/L² = 9,45 kNm; M_F = 2F·a²·b²/L³ = 13,23 kNm; R_A = F·b²·(3a + b)/L³ = 30·12,25·8/125 = 23,52 kN;
  // w_max = 2F·b³·a²/(3EI·(3b + a)²) = 2·30·42,875·2,25/(3·12 159·144) = 1,102 mm, op x = L − 2bL/(3b + a) = 2,083 m.
  const a = 1.5, b = 3.5, F = 30, L = 5;
  toets(r, {
    Mv_15: (2 * F * a * a * b * b) / L ** 3, Ms_15: (F * a * b * b) / L ** 2, Vm_15: (F * b * b * (3 * a + b)) / L ** 3,
    Wm_15: (1000 * 2 * F * b ** 3 * a * a) / (3 * EI * (3 * b + a) ** 2), ok_15: 1,
    "ligger_int(x_15; 3; 5)": (-F * a * a * b) / L ** 2, "ligger_ext(x_15; 4)[2]": L - (2 * b * L) / (3 * b + a),
  }, 1e-3);
  // Een last naar boven: het blad vraagt om lasten naar beneden in plaats van een veldmoment 0 met een kruis.
  const neg = doorreken({ taak: "3", L_c: "6", q_c: "-10", F_c: "20", E_c: "210000", I_c: "8356" });
  geenFouten(neg, "last naar boven");
  waar("last naar boven: melding, geen tabel en geen kruis", /Vul q en F naar beneden in/.test(neg.tekst) && !neg.tekst.includes("✗") && !neg.tekst.includes("✓"));
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
    // Kromme a geldt voor een warmgevormde buis (tabel 6.2); een koudgevormde valt onder c. Die aanname staat in het blad.
    if (naam === "buis") waar("buis: kromme a met de aanname 'warmgevormd' zichtbaar", /knikkromme a \(tabel 6\.2, warmgevormde buis/.test(r.tekst));
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
