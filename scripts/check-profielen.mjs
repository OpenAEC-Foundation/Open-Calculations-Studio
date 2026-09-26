/**
 * Controlescript voor de gedeelde profieltabel
 * packages/desktop/src/components/calc/profielen.ts (I- en H-profielen en
 * gelijkzijdig hoekstaal voor de staalmodules).
 *
 *   1. Eigen berekening. Voor elk profiel rekent het script de
 *      doorsnedegrootheden na uit de nominale maten — h, b, t_w, t_f, r voor
 *      een I-profiel, h, t, r_1, r_2 voor een hoekstaal — en vergelijkt ze met
 *      de tabel, binnen de afronding van die tabel (I-profielen op vier
 *      significante cijfers, hoekstaal op drie, steeds minstens op 0,01).
 *      Het I-profiel analytisch, met de holle hoeken als exacte vlakken; het
 *      hoekstaal als veelhoek met fijn verdeelde bogen.
 *   2. Steekproef. Voor negen I- en H-profielen en twee hoekstalen staan de
 *      tabelwaarden hieronder los overgenomen uit de profieltabellen; die
 *      moeten exact zo in profielen.ts staan.
 *   3. De matrix voor de rekenbladen. profielMatrix() met profielOpzoeking(),
 *      en de hoekstaalvarianten, gaan door de rekenkern; elke grootheid moet
 *      voor elk profiel met de juiste eenheid uit de matrix komen.
 *   4. De bladen. Een blad dat de matrix geplakt heeft (herkenbaar aan de
 *      kopregel) moet gelijk lopen met profielen.ts, en de keuzelijsten van de
 *      staalbladen moeten dezelfde id's en namen gebruiken als de tabel.
 *
 * Draaien:   node scripts/check-profielen.mjs
 * Afdrukken: node scripts/check-profielen.mjs --matrix [id,id,…] [--sleutel profiel]
 *            node scripts/check-profielen.mjs --hoekmatrix [id,id,…] [--sleutel hoekprofiel]
 * Vereist een gebouwde core (npm --prefix packages/core run build) en een Node
 * die TypeScript rechtstreeks laadt (22.18 of nieuwer): profielen.ts wordt
 * zelf ingelezen, niet overgetypt.
 */
import { parse, evaluate } from "../packages/core/dist/index.js";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const hier = dirname(fileURLToPath(import.meta.url));
const TPL_DIR = join(hier, "../packages/desktop/src/templates");
const P = await import(pathToFileURL(join(hier, "../packages/desktop/src/components/calc/profielen.ts")).href);

// ── Afdrukken voor een blad ─────────────────────────────────────────────────
{
  const args = process.argv.slice(2);
  const i = args.findIndex((a) => a === "--matrix" || a === "--hoekmatrix");
  if (i >= 0) {
    const hoek = args[i] === "--hoekmatrix";
    const lijst = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1].split(",").map(Number) : undefined;
    const s = args.indexOf("--sleutel");
    console.log(hoek ? P.hoekstaalMatrix({ ids: lijst }) : P.profielMatrix({ ids: lijst }));
    if (s >= 0) console.log(hoek ? P.hoekstaalOpzoeking(args[s + 1]) : P.profielOpzoeking(args[s + 1]));
    process.exit(0);
  }
}

let fouten = 0;
const toon = (v) => (Number.isFinite(v) ? String(Number(v.toPrecision(6))) : String(v));
const schoon = (v) => Number(v.toPrecision(12));

/**
 * Tabelgrootheden in de eenheden van de profieltabel, met de factor van de
 * mm-waarde in profielen.ts naar die eenheid.
 */
const I_GROOTHEDEN = [
  ["A", "cm²", 1e-2], ["Iy", "cm⁴", 1e-4], ["Wely", "cm³", 1e-3], ["Wply", "cm³", 1e-3], ["iy", "cm", 0.1],
  ["Avz", "cm²", 1e-2], ["Iz", "cm⁴", 1e-4], ["Welz", "cm³", 1e-3], ["Wplz", "cm³", 1e-3], ["iz", "cm", 0.1],
  ["It", "cm⁴", 1e-4], ["Iw", "10³ cm⁶", 1e-9],
];
const L_GROOTHEDEN = [
  ["A", "cm²", 1e-2], ["e", "cm", 0.1], ["Iy", "cm⁴", 1e-4], ["Wel", "cm³", 1e-3], ["iy", "cm", 0.1],
  ["Iu", "cm⁴", 1e-4], ["iu", "cm", 0.1], ["Iv", "cm⁴", 1e-4], ["iv", "cm", 0.1],
];

// ── 1. Eigen berekening uit de nominale maten ───────────────────────────────

/**
 * I-profiel met vier holle hoeken met straal r. Van zo'n hoek (het vlak tussen
 * twee loodrechte randen en een kwartcirkel) zijn oppervlak en eerste en
 * tweede moment ten opzichte van een rechte rand exact bekend:
 *   a = (1 − π/4)·r²,  S = (5/6 − π/4)·r³,  J = (1 − 5π/16)·r⁴.
 * I_t volgens de formule van de profieltabellen (flenzen, lijf en de
 * verdikking bij de afrondingen), I_w = t_f·b³·(h − t_f)²/24 en
 * A_v,z = A − 2·b·t_f + (t_w + 2r)·t_f (EN 1993-1-1 6.2.6(3)a).
 */
function eigenI({ h, b, tw, tf, r }) {
  const a = (1 - Math.PI / 4) * r * r;
  const S = (5 / 6 - Math.PI / 4) * r ** 3;
  const J = (1 - (5 * Math.PI) / 16) * r ** 4;
  const hw = h - 2 * tf;
  const y0 = h / 2 - tf; // flensbinnenkant tot de y-as
  const x0 = tw / 2;     // lijfvlak tot de z-as
  const A = 2 * b * tf + hw * tw + 4 * a;
  const Iy = 2 * (b * tf ** 3 / 12 + b * tf * ((h - tf) / 2) ** 2) + tw * hw ** 3 / 12
    + 4 * (y0 * y0 * a - 2 * y0 * S + J);
  const Iz = 2 * tf * b ** 3 / 12 + hw * tw ** 3 / 12 + 4 * (x0 * x0 * a + 2 * x0 * S + J);
  const Wply = 2 * (b * tf * (h - tf) / 2 + tw * y0 * y0 / 2 + 2 * (y0 * a - S));
  const Wplz = 2 * (tf * b * b / 4 + hw * tw * tw / 8 + 2 * (x0 * a + S));
  const D = ((r + tw / 2) ** 2 + (r + tf) ** 2 - r * r) / (2 * r + tf);
  const It = (2 / 3) * (b - 0.63 * tf) * tf ** 3 + (hw * tw ** 3) / 3
    + 2 * (tw / tf) * (0.145 + (0.1 * r) / tf) * D ** 4;
  return {
    A, Iy, Iz, Wely: Iy / (h / 2), Welz: Iz / (b / 2), Wply, Wplz,
    iy: Math.sqrt(Iy / A), iz: Math.sqrt(Iz / A),
    Avz: A - 2 * b * tf + (tw + 2 * r) * tf, It, Iw: (tf * b ** 3 * (h - tf) ** 2) / 24,
  };
}

/** Gelijkzijdig hoekstaal als veelhoek: rug op de assen, hiel in de oorsprong. */
function eigenL({ h, t, r1, r2 }) {
  const boog = (cx, cy, r, a0, a1, n = 600) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const f = a0 + ((a1 - a0) * i) / n;
      return [cx + r * Math.cos(f), cy + r * Math.sin(f)];
    });
  const pt = [
    [0, 0], [h, 0],
    ...boog(h - r2, t - r2, r2, 0, Math.PI / 2),                 // teen van het liggende been
    ...boog(t + r1, t + r1, r1, -Math.PI / 2, -Math.PI, 1200),   // binnenhoek
    ...boog(t - r2, h - r2, r2, 0, Math.PI / 2),                 // teen van het staande been
    [0, h],
  ];
  let A = 0, Sx = 0, Sy = 0, Ixx = 0, Iyy = 0, Ixy = 0;
  for (let i = 0; i < pt.length; i++) {
    const [x0, y0] = pt[i], [x1, y1] = pt[(i + 1) % pt.length];
    const c = x0 * y1 - x1 * y0;
    A += c / 2;
    Sx += ((x0 + x1) * c) / 6;
    Sy += ((y0 + y1) * c) / 6;
    Ixx += ((y0 * y0 + y0 * y1 + y1 * y1) * c) / 12;
    Iyy += ((x0 * x0 + x0 * x1 + x1 * x1) * c) / 12;
    Ixy += ((x0 * y1 + 2 * x0 * y0 + 2 * x1 * y1 + x1 * y0) * c) / 24;
  }
  const e = Sy / A;
  const I = Ixx - A * e * e;
  const Iyz = Math.abs(Ixy - A * (Sx / A) * e);
  return {
    A, e, Iy: I, Wel: I / (h - e), iy: Math.sqrt(I / A),
    Iu: I + Iyz, iu: Math.sqrt((I + Iyz) / A), Iv: I - Iyz, iv: Math.sqrt((I - Iyz) / A),
  };
}

/** Halve eenheid van het laatste cijfer dat de tabel afdrukt. */
const afronding = (v, cijfers) =>
  Math.max(0.5 * 10 ** (Math.floor(Math.log10(Math.abs(v))) - (cijfers - 1)), 0.005);

console.log("1. Eigen berekening uit de nominale maten, binnen de afronding van de tabel");
{
  let mis = 0;
  for (const [id, p] of Object.entries(P.PROFIELEN)) {
    const eigen = eigenI(p);
    const fout = [];
    for (const [k, eenheid, f] of I_GROOTHEDEN) {
      const tab = schoon(p[k] * f), ons = eigen[k] * f;
      if (!(Math.abs(ons - tab) <= afronding(tab, 4) + 1e-9)) fout.push(`${k} tabel ${tab} ${eenheid}, berekend ${toon(ons)}`);
    }
    if (fout.length) { mis++; console.log(`  FOUT   ${id} ${p.naam}: ${fout.join("; ")}`); }
  }
  for (const [id, p] of Object.entries(P.HOEKSTALEN)) {
    const eigen = eigenL(p);
    const fout = [];
    for (const [k, eenheid, f] of L_GROOTHEDEN) {
      const tab = schoon(p[k] * f), ons = eigen[k] * f, tol = afronding(tab, 3) + 1e-9;
      // I_v en i_v: de tabel ligt voor enkele maten tot 0,4 % onder de exacte
      // uitkomst. Toegestaan tot 0,5 % eronder, erboven alleen binnen de
      // afronding (de veilige kant).
      const ok = k === "Iv" || k === "iv"
        ? tab <= ons + tol && tab >= ons * 0.995 - tol
        : Math.abs(ons - tab) <= tol;
      if (!ok) fout.push(`${k} tabel ${tab} ${eenheid}, berekend ${toon(ons)}`);
    }
    if (fout.length) { mis++; console.log(`  FOUT   ${id} ${p.naam}: ${fout.join("; ")}`); }
  }
  const n = Object.keys(P.PROFIELEN).length, m = Object.keys(P.HOEKSTALEN).length;
  console.log(`  ${mis ? "FOUT  " : "OK    "} ${n} I- en H-profielen × ${I_GROOTHEDEN.length} grootheden, ${m} hoekstalen × ${L_GROOTHEDEN.length} grootheden`);
  fouten += mis;
}

// ── 2. Steekproef: tabelwaarden los overgenomen ─────────────────────────────

/**
 * h, b, t_w, t_f, r (mm) | A (cm²) | I_y (cm⁴), W_el,y, W_pl,y (cm³), i_y (cm),
 * A_v,z (cm²) | I_z (cm⁴), W_el,z, W_pl,z (cm³), i_z (cm) | I_t (cm⁴), I_w (10³ cm⁶).
 */
const STEEKPROEF_I = {
  1: ["HEA 100", 96, 100, 5, 8, 12, 21.24, 349.2, 72.76, 83.01, 4.06, 7.56, 133.8, 26.76, 41.14, 2.51, 5.24, 2.58],
  6: ["HEA 200", 190, 200, 6.5, 10, 18, 53.83, 3692, 388.6, 429.5, 8.28, 18.08, 1336, 133.6, 203.8, 4.98, 20.98, 108.0],
  10: ["HEA 300", 290, 300, 8.5, 14, 27, 112.5, 18260, 1260, 1383, 12.74, 37.28, 6310, 420.6, 641.2, 7.49, 85.17, 1200],
  11: ["HEB 100", 100, 100, 6, 10, 12, 26.04, 449.5, 89.91, 104.2, 4.16, 9.04, 167.3, 33.45, 51.42, 2.53, 9.25, 3.38],
  16: ["HEB 200", 200, 200, 9, 15, 18, 78.08, 5696, 569.6, 642.5, 8.54, 24.83, 2003, 200.3, 305.8, 5.07, 59.28, 171.1],
  20: ["HEB 300", 300, 300, 11, 19, 27, 149.1, 25170, 1678, 1869, 12.99, 47.43, 8563, 570.9, 870.1, 7.58, 185.0, 1688],
  21: ["IPE 200", 200, 100, 5.6, 8.5, 12, 28.48, 1943, 194.3, 220.6, 8.26, 14.00, 142.4, 28.47, 44.61, 2.24, 6.98, 12.99],
  24: ["IPE 300", 300, 150, 7.1, 10.7, 15, 53.81, 8356, 557.1, 628.4, 12.46, 25.68, 603.8, 80.50, 125.2, 3.35, 20.12, 125.9],
  27: ["IPE 400", 400, 180, 8.6, 13.5, 21, 84.46, 23130, 1156, 1307, 16.55, 42.69, 1318, 146.4, 229.0, 3.95, 51.08, 490.0],
};
/** h, t, r_1, r_2 (mm) | A (cm²), e (cm) | I_y (cm⁴), W_el (cm³), i_y (cm) | I_u (cm⁴), i_u (cm) | I_v (cm⁴), i_v (cm). */
const STEEKPROEF_L = {
  3: ["L 50x50x5", 50, 5, 7, 3.5, 4.80, 1.40, 11.0, 3.05, 1.51, 17.4, 1.90, 4.54, 0.97],
  8: ["L 100x100x10", 100, 10, 12, 6, 19.2, 2.82, 177, 24.6, 3.04, 280, 3.83, 73.0, 1.95],
};

console.log("\n2. Steekproef: tabelwaarden los overgenomen, exact in profielen.ts");
for (const [tabel, steekproef, maten, grootheden] of [
  [P.PROFIELEN, STEEKPROEF_I, ["h", "b", "tw", "tf", "r"], I_GROOTHEDEN],
  [P.HOEKSTALEN, STEEKPROEF_L, ["h", "t", "r1", "r2"], L_GROOTHEDEN],
]) {
  for (const [id, [naam, ...w]] of Object.entries(steekproef)) {
    const p = tabel[id];
    const ons = p ? [...maten.map((k) => p[k]), ...grootheden.map(([k, , f]) => schoon(p[k] * f))] : [];
    const namen = [...maten, ...grootheden.map(([k]) => k)];
    const fout = namen.filter((k, i) => ons[i] !== w[i]).map((k) => `${k} ${ons[namen.indexOf(k)]} i.p.v. ${w[namen.indexOf(k)]}`);
    const ok = p && p.naam === naam && fout.length === 0;
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} ${String(id).padStart(2)} ${naam.padEnd(13)} ${ok ? `${namen.length} waarden` : p ? `naam "${p.naam}"; ${fout.join("; ")}` : "ontbreekt"}`);
  }
}

// ── 3. De matrix door de rekenkern ───────────────────────────────────────────

/** Rekent een proefblad door en geeft per var-display {getal, eenheid}. */
function doorreken(tpl, keuzes) {
  const uit = {};
  const loop = (lijst) => {
    for (const n of lijst) {
      if (n.type === "var-display" || n.type === "assignment") {
        const m = String(n.result).match(/^\s*(-?[\d.]+(?:e[-+]?\d+)?)\s*(.*)$/i);
        if (m) uit[n.name] = { getal: Number(m[1]), eenheid: m[2].trim() };
      }
      if (Array.isArray(n.children)) loop(n.children);
    }
  };
  loop(evaluate(parse(tpl), keuzes));
  return uit;
}

/** Variabelenaam zoals de kern hem teruggeeft (`W_el,y` → `W_el_y`). */
const kernnaam = (n) => n.replace(/,/g, "_");

function proefblad(kop, sleutel, tabel, blok, namen) {
  const keuze = Object.entries(tabel).map(([id, p]) => `  ${p.naam} = ${id}`).join("\n");
  return `"${kop}\n@select ${sleutel} "Profiel"\n${keuze}\n@end\n#hide\n${blok}\n#show\n${namen.join("\n")}\n`;
}

console.log("\n3. profielMatrix() en profielOpzoeking() door de rekenkern");
{
  // Standaardnamen en -eenheden per grootheid, in de volgorde van de matrix.
  const I_NAMEN = [
    ["h", "h", "mm", 1], ["b", "b", "mm", 1], ["tw", "t_w", "mm", 1], ["tf", "t_f", "mm", 1], ["r", "r", "mm", 1],
    ["A", "A", "cm^2", 1e-2], ["Iy", "I_y", "cm^4", 1e-4], ["Wely", "W_el,y", "cm^3", 1e-3], ["Wply", "W_pl,y", "cm^3", 1e-3],
    ["iy", "i_y", "cm", 0.1], ["Avz", "A_v,z", "cm^2", 1e-2], ["Iz", "I_z", "cm^4", 1e-4], ["Welz", "W_el,z", "cm^3", 1e-3],
    ["Wplz", "W_pl,z", "cm^3", 1e-3], ["iz", "i_z", "cm", 0.1], ["It", "I_t", "cm^4", 1e-4], ["Iw", "I_w", "cm^6", 1e-6],
  ];
  const L_NAMEN = [
    ["h", "h", "mm", 1], ["t", "t", "mm", 1], ["r1", "r_1", "mm", 1], ["r2", "r_2", "mm", 1],
    ["A", "A", "cm^2", 1e-2], ["e", "e", "cm", 0.1], ["Iy", "I_y", "cm^4", 1e-4], ["Wel", "W_el", "cm^3", 1e-3],
    ["iy", "i_y", "cm", 0.1], ["Iu", "I_u", "cm^4", 1e-4], ["iu", "i_u", "cm", 0.1], ["Iv", "I_v", "cm^4", 1e-4],
    ["iv", "i_v", "cm", 0.1],
  ];
  const vergelijk = (label, tabel, sleutel, blok, namen) => {
    const tpl = proefblad("Proef profieltabel", sleutel, tabel, blok, namen.map(([, n]) => n));
    let mis = 0;
    for (const [id, p] of Object.entries(tabel)) {
      const uit = doorreken(tpl, { [sleutel]: id });
      for (const [veld, naam, eenheid, f] of namen) {
        const w = uit[kernnaam(naam)];
        const wil = schoon(p[veld] * f);
        const ok = w && w.eenheid === eenheid && Math.abs(w.getal - wil) <= 1e-9 * Math.max(1, Math.abs(wil));
        if (!ok) {
          mis++;
          if (mis <= 5) console.log(`  FOUT   ${p.naam} ${naam}: ${w ? `${w.getal} ${w.eenheid}` : "ontbreekt"}, verwacht ${wil} ${eenheid}`);
        }
      }
    }
    if (mis) fouten++;
    console.log(`  ${mis ? "FOUT  " : "OK    "} ${label}: ${Object.keys(tabel).length} profielen × ${namen.length} grootheden${mis ? `, ${mis} verkeerd` : ""}`);
  };

  vergelijk("alle I- en H-profielen, standaardnamen", P.PROFIELEN, "profiel",
    `${P.profielMatrix()}\n${P.profielOpzoeking("profiel")}`, I_NAMEN);
  vergelijk("alle hoekstalen, standaardnamen", P.HOEKSTALEN, "hoekprofiel",
    `${P.hoekstaalMatrix()}\n${P.hoekstaalOpzoeking("hoekprofiel")}`, L_NAMEN);

  // Eigen namen, een deel van de grootheden en een beperkte matrix: de
  // kolom- en liggerlijst van een momentverbinding in één blad.
  {
    const kolommen = [13, 14, 16, 20], liggers = [21, 24, 27];
    const blok = [
      P.profielMatrix({ naam: "staal", ids: [...kolommen, ...liggers] }),
      P.profielOpzoeking("kolomprofiel", { matrix: "staal", namen: { h: "h_c", tf: "t_fc", tw: "t_wc", r: "r_c", Avz: "A_vc" } }),
      P.profielOpzoeking("liggerprofiel", { matrix: "staal", namen: { h: "h_b", tf: "t_fb", Wply: "W_pl,b" } }),
    ].join("\n");
    const regels = blok.split("\n").filter((r) => / = hlookup\(/.test(r)).length;
    const keuze = (naam, ids) => `@select ${naam} "${naam}"\n${ids.map((id) => `  ${P.PROFIELEN[id].naam} = ${id}`).join("\n")}\n@end`;
    const tpl = `"Proef\n${keuze("kolomprofiel", kolommen)}\n${keuze("liggerprofiel", liggers)}\n#hide\n${blok}\n#show\nh_c\nt_fc\nt_wc\nr_c\nA_vc\nh_b\nt_fb\nW_pl,b\n`;
    let ok = regels === 8;
    for (const k of kolommen) for (const l of liggers) {
      const uit = doorreken(tpl, { kolomprofiel: String(k), liggerprofiel: String(l) });
      const c = P.PROFIELEN[k], b = P.PROFIELEN[l];
      const wil = {
        h_c: [c.h, "mm"], t_fc: [c.tf, "mm"], t_wc: [c.tw, "mm"], r_c: [c.r, "mm"], A_vc: [schoon(c.Avz / 100), "cm^2"],
        h_b: [b.h, "mm"], t_fb: [b.tf, "mm"], W_pl_b: [schoon(b.Wply / 1e3), "cm^3"],
      };
      for (const [n, [g, e]] of Object.entries(wil)) {
        if (!uit[n] || uit[n].getal !== g || uit[n].eenheid !== e) {
          ok = false;
          console.log(`  FOUT   ${c.naam}/${b.naam} ${n}: ${uit[n] ? `${uit[n].getal} ${uit[n].eenheid}` : "ontbreekt"}, verwacht ${g} ${e}`);
        }
      }
    }
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} eigen namen en beperkte matrix: ${regels} opzoekregels, ${kolommen.length} × ${liggers.length} combinaties`);
  }
}

// ── 4. De bladen ─────────────────────────────────────────────────────────────

/**
 * Bladen waarvan de keuzelijst de id's van profielen.ts gebruikt. Een blad met
 * een geplakte matrix (kopregel PROFIEL_KOP of HOEKSTAAL_KOP) hoort er
 * vanzelf bij.
 */
const GEBRUIKERS_I = ["stalenKolom.ts", "momentverbinding.ts", "dwarskrachtverbinding.ts", "brandwerendheid.ts"];
const GEBRUIKERS_L = ["schoorverbinding.ts"];

console.log("\n4. De bladen: geplakte matrix en keuzelijsten tegen profielen.ts");
{
  const bestanden = readdirSync(TPL_DIR).filter((f) => f.endsWith(".ts")).sort();
  const norm = (s) => s.replace(/[×x]/g, "x").replace(/\s+/g, "");
  let geplakt = 0, lijsten = 0;
  for (const bestand of bestanden) {
    const src = readFileSync(join(TPL_DIR, bestand), "utf8");
    const regels = src.split(/\r?\n/);

    // Geplakte matrix: de kopregel en de regel eronder moeten exact zijn wat
    // profielen.ts nu oplevert voor dezelfde naam en dezelfde id's.
    for (const [kop, maak] of [[P.PROFIEL_KOP, P.profielMatrix], [P.HOEKSTAAL_KOP, P.hoekstaalMatrix]]) {
      regels.forEach((regel, i) => {
        if (!regel.trim().startsWith(kop)) return;
        geplakt++;
        const volgende = (regels[i + 1] ?? "").trim();
        const m = volgende.match(/^(\S+) = \[([^|\]]*)\|/);
        let ok = false, wil = "";
        try {
          if (m) {
            wil = maak({ naam: m[1], ids: m[2].split(";").map((x) => Number(x.trim())) });
            ok = `${regel.trim()}\n${volgende}` === wil;
          }
        } catch (e) {
          wil = String(e.message);
        }
        if (!ok) fouten++;
        console.log(`  ${ok ? "OK    " : "FOUT  "} ${bestand}:${i + 1} geplakte matrix${m ? ` "${m[1]}"` : ""}${ok ? " gelijk aan profielen.ts" : " wijkt af; opnieuw plakken met --matrix/--hoekmatrix"}`);
      });
    }
    if (/\$\{\s*(profielMatrix|hoekstaalMatrix|profielOpzoeking|hoekstaalOpzoeking)\(/.test(src)) {
      console.log(`  let op ${bestand}: de matrix staat er als \${…} in; check-renders.mjs en refcheck lezen de ruwe tekst en zien hem niet`);
    }

    // Keuzelijsten: elke optie "naam = id" moet dezelfde naam hebben als het
    // profiel met dat id in profielen.ts.
    const soorten = [];
    if (GEBRUIKERS_I.includes(bestand) || src.includes(P.PROFIEL_KOP)) soorten.push([P.PROFIELEN, /^(HE[AB]|IPE)\s*\d+$/]);
    if (GEBRUIKERS_L.includes(bestand) || src.includes(P.HOEKSTAAL_KOP)) soorten.push([P.HOEKSTALEN, /^L\s*\d+\s*[x×]/]);
    for (const [tabel, patroon] of soorten) {
      for (const blok of src.matchAll(/@select\s+(\S+)[^\n]*\n([\s\S]*?)@end/g)) {
        const opties = [...blok[2].matchAll(/^\s*(.+?)\s*=\s*(\d+)\s*$/gm)].filter((o) => patroon.test(o[1].trim()));
        if (!opties.length) continue;
        lijsten++;
        const fout = opties
          .filter(([, naam, id]) => !tabel[id] || norm(tabel[id].naam) !== norm(naam))
          .map(([, naam, id]) => `"${naam.trim()} = ${id}" (tabel: ${tabel[id] ? tabel[id].naam : "geen profiel"})`);
        if (fout.length) fouten++;
        console.log(`  ${fout.length ? "FOUT  " : "OK    "} ${bestand} @select ${blok[1]}: ${opties.length} opties${fout.length ? `; ${fout.join(", ")}` : ""}`);
      }
    }
  }
  if (!geplakt) console.log("  (nog geen blad met een geplakte matrix)");
  if (!lijsten) { fouten++; console.log("  FOUT   geen enkele keuzelijst gevonden"); }
}

console.log(
  fouten === 0
    ? "\nProfieltabel: alles klopt."
    : `\nProfieltabel: ${fouten} afwijking(en).`,
);
process.exit(fouten === 0 ? 0 : 1);
