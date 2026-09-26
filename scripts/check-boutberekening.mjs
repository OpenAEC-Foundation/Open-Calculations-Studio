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
 * een randbout zonder tweede bout loodrecht op de kracht, een ongeldige p₂,
 * een randbout waarbij de p₂-tak maatgevend is, een steek boven het maximum
 * van tabel 3.3 (signaal, geen afkeur) en de binnenste bout loodrecht op de
 * kracht in beide rekenwijzen.
 *
 * Draaien:  node scripts/check-boutberekening.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
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
  for (const [naam, xc] of Object.entries(ref.verwacht)) {
    const ons = got.values[naam];
    const ok = ons !== undefined && gelijk(ons, xc);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} ${naam.padEnd(8)} ons ${String(ons ?? "—").padStart(8)}   de referentie-uitwerking ${xc}`);
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

console.log(
  fouten === 0
    ? "\nAlle referenties exact — op de gemarkeerde afwijkingen na."
    : `\n${fouten} afwijking(en) die niet in het register staan.`,
);
process.exit(fouten === 0 ? 0 : 1);
