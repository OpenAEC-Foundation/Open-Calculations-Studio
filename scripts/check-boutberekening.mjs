/**
 * Controlescript voor de module Boutberekening.
 *
 * Rekent templates/boutberekening.ts door met de invoer van de zes
 * referentiebladen (document1C t/m 6C) en vergelijkt elke
 * tussenstap met het afgedrukte getal.
 *
 * Basis: S235 · 8.8 · M16 · afschuifvlak door de draad · eindbout · t 20 ·
 * e₁ 30 · p₁ 80 · e₂ 25 · p₂ 60. Elk blad varieert één ding.
 *
 * B_p,Rd is een splitspunt — de referentie-uitwerking vult voor d_m de sleutelwijdte in in
 * plaats van het gemiddelde uit §3.6.1(3). In de referentiestand hoort hij
 * daarom exact te kloppen; in de norm-stand hoort hij hoger uit te komen.
 * Zie docs/afwijkingen-referentie.md §6.
 *
 * Daarna volgen sets zonder referentieblad, elk met een handberekening:
 * een randbout zonder tweede bout loodrecht op de kracht (p₂ = 0, niet
 * ingevuld of gewist), een ongeldige p₂, een randbout waarbij de p₂-tak
 * maatgevend is, een steek boven het maximum van tabel 3.3 (signaal, geen
 * afkeur), de binnenste bout loodrecht op de kracht in beide rekenwijzen,
 * f_u van de plaat bij 40 < t ≤ 80 mm en daarboven (tabel 3.1 van
 * NEN-EN 1993-1-1) en een opgeslagen blad met boutklasse 4.8, die de NB bij
 * 3.1.1(3) niet toelaat. Tot slot: blad en beeld bieden 4.8 en 5.8 niet aan.
 *
 * De boutgroep (keuze "Kracht op de bout"): standaard staat die op het invoeren
 * van de kracht op één bout, en dan rekent het blad precies als zonder die
 * keuze — alle uitkomsten van de basis en van elke referentieset worden
 * daarop vergeleken. Daarna drie boutgroepen met een handberekening (draaipunt
 * in het zwaartepunt, met en zonder horizontale kracht, en een vast
 * draaipunt) en één bout onder een moment, die nooit voldoet.
 *
 * Draaien:  node scripts/check-boutberekening.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { laadTemplate, reken, toetsNormStand } from "./lib/refcheck.mjs";

const tpl = laadTemplate("boutberekening.ts");

/** Projectgegevens: `rekenwijze` = 1 → de referentie-uitwerking volgen op de splitspunten. */
const PROJECT = { rekenwijze: 1 };

const BASIS = {
  staalsoort: "235", boutkwaliteit: "88", boutdiameter: "16",
  afschuifvlak: "1", boutpositie: "1", randpositie: "1",
  t_plaat: "20", e_1: "30", p_1: "80", e_2: "25", p_2: "60",
  n_v: "1", F_v_Ed: "0", F_t_Ed: "0",
};

/**
 * De namen zijn de gevouwen vorm: de parser maakt van `F_t,Rd` → `F_t_Rd`.
 * `afwijkend` bevat grootheden waar de referentie-uitwerking aantoonbaar van de norm afwijkt.
 */
const REFERENTIES = [
  {
    blad: "document1C — basis, afschuifvlak door de draad, eindbout",
    invoer: {},
    verwacht: { B_p_Rd: 260.6, F_t_Rd: 90.4, F_v_Rd: 60.3, F_b_Rd: 112.1, k_1: 2.189, "α_d": 0.556, "α_b": 0.556 },
  },
  {
    blad: "document2C — afschuifvlak door de schacht (A i.p.v. A_s)",
    invoer: { afschuifvlak: "2" },
    verwacht: { B_p_Rd: 260.6, F_t_Rd: 90.4, F_v_Rd: 77.2, F_b_Rd: 112.1, A_v: 201 },
  },
  {
    blad: "document3C — binnenste bout in de krachtsrichting",
    invoer: { boutpositie: "2" },
    verwacht: { B_p_Rd: 260.6, F_t_Rd: 90.4, F_v_Rd: 60.3, F_b_Rd: 201.7, k_1: 2.189, "α_d": 1.231, "α_b": 1 },
  },
  {
    blad: "document4C — randbout (in de referentie-uitwerking gelijk aan de eindbout)",
    invoer: {},
    verwacht: { B_p_Rd: 260.6, F_t_Rd: 90.4, F_v_Rd: 60.3, F_b_Rd: 112.1, k_1: 2.189, "α_d": 0.556 },
  },
  {
    blad: "document5C — enkele bout (p₁ en p₂ niet in gebruik)",
    // Enkele bout = randbout zonder tweede bout loodrecht op de kracht: p₂ = 0.
    invoer: { p_2: "0" },
    verwacht: { B_p_Rd: 260.6, F_t_Rd: 90.4, F_v_Rd: 60.3, F_b_Rd: 112.1, k_1: 2.189, "α_d": 0.556 },
  },
  {
    blad: "document6C — e₁ 60 en e₂ 50: k₁ én α_b op hun bovengrens",
    invoer: { e_1: "60", e_2: "50" },
    verwacht: { B_p_Rd: 260.6, F_t_Rd: 90.4, F_v_Rd: 60.3, F_b_Rd: 230.4, k_1: 2.5, "α_d": 1.111, "α_b": 1 },
  },
];

/**
 * Sets zonder referentieblad. De verwachting volgt uit de handberekening in
 * het commentaar erboven (tabel 3.4 met het correctieblad); `oordeel` is de
 * slotzin die het blad moet geven.
 */
const HANDWERK = [
  {
    naam: "Randbout zonder tweede bout loodrecht op de kracht (p₂ = 0) · t 10 · n_v 2 · F_v,Ed 100",
    standen: [1, 0],
    invoer: { t_plaat: "10", p_2: "0", n_v: "2", F_v_Ed: "100" },
    // k₁ = min(2,8·25/18 − 1,7; 2,5) = 2,189 — de p₂-tak vervalt.
    // α_b = min(30/54; 800/360; 1) = 0,5556.
    // F_b,Rd = 2,189·0,5556·360·16·10/1,25 = 56,04 kN → UC_b = 100/56,04 = 1,785.
    verwacht: { k_1: 2.189, F_b_Rd: 56.04, UC_b: 1.785 },
    oordeel: "voldoet niet",
  },
  {
    naam: "Idem, p₂ niet ingevuld",
    standen: [1, 0],
    invoer: { t_plaat: "10", p_2: undefined, n_v: "2", F_v_Ed: "100" },
    // Zelfde handberekening als hierboven: een niet ingevuld veld telt als 0.
    verwacht: { k_1: 2.189, F_b_Rd: 56.04, UC_b: 1.785 },
    oordeel: "voldoet niet",
  },
  {
    naam: "Idem, p₂-veld gewist (leeg)",
    standen: [1, 0],
    invoer: { t_plaat: "10", p_2: "", n_v: "2", F_v_Ed: "100" },
    // Een gewist veld telt in de kern als 0 in de eenheid van het veld (0 mm),
    // dus dezelfde handberekening als de set "p₂ = 0" hierboven.
    verwacht: { k_1: 2.189, F_b_Rd: 56.04, UC_b: 1.785 },
    oordeel: "voldoet niet",
  },
  {
    naam: "Randbout met p₂ 20 < 2,4·d₀ · t 10 · n_v 2 · F_v,Ed 100",
    standen: [1, 0],
    invoer: { t_plaat: "10", p_2: "20", n_v: "2", F_v_Ed: "100" },
    // k₁ = min(2,189; 1,4·20/18 − 1,7 = −0,144; 2,5) = −0,144 → F_b,Rd < 0:
    // een invoerfout, dus nooit "voldoet", hoe klein UC_v ook is.
    verwacht: { k_1: -0.144 },
    oordeel: "voldoet niet",
  },
  {
    naam: "Randbout, p₂-tak maatgevend: e₂ 40 · p₂ 45 · schacht · n_v 2 · F_v,Ed 100",
    standen: [1, 0],
    invoer: { e_2: "40", p_2: "45", afschuifvlak: "2", n_v: "2", F_v_Ed: "100" },
    // k₁ = min(2,8·40/18 − 1,7 = 4,522; 1,4·45/18 − 1,7 = 1,800; 2,5) = 1,800.
    // F_b,Rd = 1,800·0,5556·360·16·20/1,25 = 92,16 kN → UC_b = 100/92,16 = 1,085.
    verwacht: { k_1: 1.8, F_b_Rd: 92.16, UC_b: 1.085 },
    oordeel: "voldoet niet",
  },
  {
    naam: "Randbout met p₂ 150 > 14·t = 140 · t 10 · F_v,Ed 40",
    standen: [1, 0],
    invoer: { t_plaat: "10", p_2: "150", F_v_Ed: "40" },
    // k₁ = min(2,189; 1,4·150/18 − 1,7 = 9,967; 2,5) = 2,189 → F_b,Rd = 56,04 kN.
    // UC_b = 40/56,04 = 0,714; UC_v = 40/60,29 = 0,663 → UC_max = 0,714.
    // Het maximum van tabel 3.3 geldt alleen bij gedrukte of aan weer blootgestelde
    // delen: een signaal, geen afkeur.
    verwacht: { k_1: 2.189, F_b_Rd: 56.04, UC_b: 0.714 },
    oordeel: "voldoet",
  },
  {
    naam: "Binnenste bout loodrecht op de kracht — norm",
    standen: [0],
    invoer: { randpositie: "2" },
    // k₁ = min(1,4·60/18 − 1,7 = 2,967; 2,5) = 2,5.
    // F_b,Rd = 2,5·0,5556·360·16·20/1,25 = 128,0 kN.
    verwacht: { k_1: 2.5, F_b_Rd: 128.0 },
  },
  {
    naam: "Binnenste bout loodrecht op de kracht — referentie-uitwerking (register punt 7)",
    standen: [1],
    invoer: { randpositie: "2" },
    // k₁ = min(2,189; 2,967; 2,5) = 2,189 → F_b,Rd = 112,1 kN.
    verwacht: { F_b_Rd: 112.1 },
  },
  {
    naam: "S355 · M24 · t 45 · e₁ = e₂ = 40 · p₂ = 0: f_u bij 40 < t ≤ 80 mm — norm",
    standen: [0],
    invoer: { staalsoort: "355", boutdiameter: "24", t_plaat: "45", e_1: "40", e_2: "40", p_2: "0", n_v: "2" },
    // Tabel 3.1 van NEN-EN 1993-1-1, S355 met 40 < t ≤ 80 mm: f_u = 470 N/mm² (was 490).
    // α_b = min(40/78; 800/470; 1) = 0,5128; k₁ = min(2,8·40/26 − 1,7 = 2,608; 2,5) = 2,5.
    // F_b,Rd = 2,5·0,5128·470·24·45/1,25 = 520,6 kN (542,8 met 490).
    // d_m = (36 + 39,55)/2 = 37,78 mm → B_p,Rd = 0,6·π·37,78·45·470/1,25 = 1204,8 kN (1256 met 490).
    verwacht: { F_b_Rd: 520.6, B_p_Rd: 1204.8 },
  },
  {
    naam: "Idem — referentiestand: f_u geldt ook daar, d_m = sleutelwijdte",
    standen: [1],
    invoer: { staalsoort: "355", boutdiameter: "24", t_plaat: "45", e_1: "40", e_2: "40", p_2: "0", n_v: "2" },
    // F_b,Rd als hierboven; B_p,Rd = 0,6·π·36·45·470/1,25 = 1148,2 kN.
    verwacht: { F_b_Rd: 520.6, B_p_Rd: 1148.2 },
  },
  {
    naam: "Plaat van 90 mm: buiten tabel 3.1 (NB bij 3.2.1(1)) · F_v,Ed 20",
    standen: [1, 0],
    invoer: { t_plaat: "90", F_v_Ed: "20" },
    // Tabel 3.1 gaat tot 80 mm; daarboven komt f_u uit de productnorm, en die kent het blad
    // niet: nooit "voldoet".
    verwacht: {},
    oordeel: "voldoet niet",
  },
  {
    naam: "Opgeslagen blad met boutklasse 4.8 · M16 · F_v,Ed 20",
    standen: [1, 0],
    invoer: { boutkwaliteit: "48", F_v_Ed: "20" },
    // F_v,Rd = 0,5·400·157/1,25 = 25,12 kN → UC = 0,796, maar 4.8 is niet toegelaten
    // (NB bij 3.1.1(3)): voldoet niet.
    verwacht: { F_v_Rd: 25.12, UC_v: 0.796 },
    oordeel: "voldoet niet",
  },
  {
    naam: "Boutgroep 2 × 3, p_x 80 · p_z 70, V_z,Ed −60 kN en M_Ed 6 kNm, draaipunt in het zwaartepunt",
    standen: [1, 0],
    invoer: { boutgroep: "1", n_x: "2", n_z: "3", p_x: "80", p_z: "70", V_x_Ed: "0", V_z_Ed: "-60", M_Ed: "6" },
    // Bouten op x = ±40 en z = −70, 0, 70 mm. Σr² = 3·2·40² + 2·2·70² = 9600 + 19600 = 29200 mm².
    // M/Σr² = 6000/29200 = 0,2055 kN/mm. Hoekbout (−40; ±70): F_x = ∓0,2055·70 = ∓14,38,
    // F_z = −60/6 − 0,2055·40 = −18,22 → F = √(14,38² + 18,22²) = 23,21 kN.
    // UC_v = 23,21/60,29 = 0,385; UC_b = 23,21/112,1 = 0,207.
    verwacht: { "Σr_2": 29200, F_v_Ed: 23.21, UC_v: 0.385, UC_b: 0.2071 },
    oordeel: "voldoet",
  },
  {
    naam: "Boutgroep 3 × 2, p_x 60 · p_z 90, V_x,Ed 20, V_z,Ed −30 kN, M_Ed −4 kNm (rechtsom)",
    standen: [1],
    invoer: { boutgroep: "1", n_x: "3", n_z: "2", p_x: "60", p_z: "90", V_x_Ed: "20", V_z_Ed: "-30", M_Ed: "-4" },
    // Bouten op x = −60, 0, 60 en z = ±45. Σr² = 2·2·60² + 3·2·45² = 14400 + 12150 = 26550 mm².
    // M/Σr² = −4000/26550 = −0,15066. Bout (60; 45): F_x = 20/6 + 0,15066·45 = 10,113,
    // F_z = −30/6 − 0,15066·60 = −14,040 → F = √(10,113² + 14,040²) = 17,30 kN.
    // UC_v = 17,30/60,29 = 0,287.
    verwacht: { "Σr_2": 26550, F_v_Ed: 17.30, UC_v: 0.2870 },
    oordeel: "voldoet",
  },
  {
    naam: "Boutgroep 2 × 3 om een vast draaipunt 120 mm onder het zwaartepunt, V_z,Ed −60 kN, M_Ed 6 kNm",
    standen: [1, 0],
    invoer: { boutgroep: "2", n_x: "2", n_z: "3", p_x: "80", p_z: "70", V_x_Ed: "0", V_z_Ed: "-60", M_Ed: "6", x_d: "0", z_d: "-120" },
    // M_D = 6000 − 0·(−60) + (−120)·0 = 6000 kNmm. Σr_D² = 29200 + 6·120² = 115600 mm².
    // Bovenste bouten: afstand tot D in z 190 en in x 40: F = 6000·√(190² + 40²)/115600 = 10,08 kN.
    // Draaipunt: de bouten samen 6·6000·120/115600 = 37,37 kN in x, plus V_z = 60 kN:
    // R_d = √(37,37² + 60²) = 70,69 kN.
    verwacht: { "Σr_2": 115600, M_D: 6, F_v_Ed: 10.08, R_d: 70.69, UC_v: 0.1672 },
    oordeel: "voldoet",
  },
  {
    naam: "Eén bout onder V_z,Ed −60 kN en M_Ed 6 kNm",
    standen: [1, 0],
    invoer: { boutgroep: "1", n_x: "1", n_z: "1", p_x: "80", p_z: "70", V_x_Ed: "0", V_z_Ed: "-60", M_Ed: "6" },
    // Eén bout kan geen moment opnemen: F_v,Ed = 60 kN (alleen V), maar het oordeel is voldoet niet.
    verwacht: { F_v_Ed: 60 },
    oordeel: "voldoet niet",
  },
];

/** de referentie-uitwerking print op vier cijfers; die marge houden we aan. */
const gelijk = (a, b) => Math.abs(a - b) <= Math.max(0.05, Math.abs(b) * 0.0006);

const doorreken = (invoer, rekenwijze) => {
  const waarden = { ...BASIS, ...invoer };
  for (const k of Object.keys(waarden)) if (waarden[k] === undefined) delete waarden[k];
  return reken(tpl, waarden, { ...PROJECT, rekenwijze });
};

let fouten = 0;
for (const ref of REFERENTIES) {
  console.log(`\n${ref.blad}`);
  let got;
  try {
    got = doorreken(ref.invoer, 1);
  } catch (err) {
    console.log(`  FOUT   blad kon niet worden doorgerekend: ${err.message}`);
    fouten++;
    continue;
  }
  for (const [naam, refWaarde] of Object.entries(ref.verwacht)) {
    const ons = got.values[naam];
    const ok = ons !== undefined && gelijk(ons, refWaarde);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} ${naam.padEnd(8)} ons ${String(ons ?? "—").padStart(8)}   de referentie-uitwerking ${refWaarde}`);
  }
  // Norm-stand: voor een randbout valt k₁ samen met de tabel, dus F_b,Rd
  // blijft gelijk; d_m volgens §3.6.1(3) maakt B_p,Rd groter.
  fouten += toetsNormStand(ref.blad, got, doorreken(ref.invoer, 0), { F_b_Rd: "gelijk", B_p_Rd: "hoger" });
}

for (const set of HANDWERK) {
  for (const stand of set.standen) {
    console.log(`\n${set.naam}  — ${stand === 1 ? "referentiestand" : "norm-stand"}`);
    const got = doorreken(set.invoer, stand);
    for (const [naam, doel] of Object.entries(set.verwacht)) {
      const ons = got.values[naam];
      const ok = ons !== undefined && gelijk(ons, doel);
      if (!ok) fouten++;
      console.log(`  ${ok ? "OK    " : "FOUT  "} ${naam.padEnd(8)} ons ${String(ons ?? "—").padStart(8)}   hand ${doel}`);
    }
    if (set.oordeel) {
      const slot = got.text.slice(got.text.lastIndexOf("Maatgevende UC"));
      const ons = /voldoet niet/.test(slot) ? "voldoet niet" : /voldoet/.test(slot) ? "voldoet" : "—";
      const ok = ons === set.oordeel;
      if (!ok) fouten++;
      console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel  ons ${ons}   hand ${set.oordeel}`);
    }
  }
}

// De boutgroep staat standaard op de kracht op één bout: zonder de keuze, en met
// de keuze op 0, rekent het blad precies hetzelfde, in beide rekenwijzen.
{
  console.log("\nKracht op de bout: standaard het oude gedrag");
  for (const [naam, invoer] of [["basis", {}], ...REFERENTIES.map((r) => [r.blad.split(" — ")[0], r.invoer]), ...HANDWERK.filter((h) => !("boutgroep" in h.invoer)).map((h) => [h.naam.slice(0, 40), h.invoer])]) {
    for (const stand of [1, 0]) {
      const zonder = doorreken(invoer, stand);
      const met = doorreken({ ...invoer, boutgroep: "0" }, stand);
      const namen = new Set([...Object.keys(zonder.values), ...Object.keys(met.values)]);
      const anders = [...namen].filter((k) => zonder.values[k] !== met.values[k]);
      const gelijkeTekst = zonder.text === met.text;
      const ok = anders.length === 0 && gelijkeTekst;
      if (!ok) fouten++;
      if (!ok || stand === 1) {
        console.log(`  ${ok ? "OK    " : "FOUT  "} ${naam.padEnd(42)} ${ok ? `${namen.size} uitkomsten gelijk` : anders.join(", ") || "tekst verschilt"}`);
      }
    }
  }
}

// De NB bij 3.1.1(3) sluit 4.8 en 5.8 uit, dus ook niet te kiezen in blad of beeld.
{
  console.log("\nBoutklassen in de keuzelijst (NB bij 3.1.1(3))");
  const b = tpl.indexOf("@select boutkwaliteit");
  const blad = [...tpl.slice(b, tpl.indexOf("@end", b)).matchAll(/^\s+([\d.]+) = /gm)].map((m) => m[1]);
  const ts = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../packages/desktop/src/components/calc/BoutDesigner.tsx"), "utf8");
  const k = ts.indexOf("const KWAL");
  const beeld = [...ts.slice(k, ts.indexOf("];", k)).matchAll(/label: "([\d.]+)"/g)].map((m) => m[1]);
  const wil = "4.6, 5.6, 6.8, 8.8, 10.9";
  for (const [waar, lijst] of [["blad", blad], ["beeld", beeld]]) {
    const ok = lijst.join(", ") === wil;
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} ${waar.padEnd(6)} ${lijst.join(", ")}`);
  }
}

console.log(
  fouten === 0
    ? "\nAlle referenties exact — op de gemarkeerde afwijkingen na."
    : `\n${fouten} afwijking(en) die niet in het register staan.`,
);
process.exit(fouten === 0 ? 0 : 1);
