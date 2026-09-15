/**
 * Controlescript voor de module Boutberekening.
 *
 * Rekent templates/boutberekening.ts door met de invoer van de zes
 * de referentie-uitwerking-referentiebladen (document1C t/m 6C) en vergelijkt elke
 * tussenstap met het afgedrukte getal.
 *
 * Basis: S235 · 8.8 · M16 · afschuifvlak door de draad · eindbout · t 20 ·
 * e₁ 30 · p₁ 80 · e₂ 25 · p₂ 60. Elk blad varieert één ding.
 *
 * B_p,Rd is een splitspunt — de referentie-uitwerking vult voor d_m de sleutelwijdte in in
 * plaats van het gemiddelde uit §3.6.1(3). In de de referentie-uitwerking-stand hoort hij
 * daarom exact te kloppen; de norm-tak staat op het blad als `B_p,Rd,nb`.
 * gemarkeerd en telt niet als fout. Zie docs/afwijkingen-referentie.md §6.
 *
 * Draaien:  node scripts/check-boutberekening.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { parse, evaluate } from "../packages/core/dist/index.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/** Projectgegevens: `rekenwijze` = 1 → de referentie-uitwerking volgen op de splitspunten. */
const PROJECT = { rekenwijze: 1 };

const hier = dirname(fileURLToPath(import.meta.url));
const bron = readFileSync(join(hier, "../packages/desktop/src/templates/boutberekening.ts"), "utf8");
// De template-literal uit het TS-bestand pakken.
const tpl = bron.slice(bron.indexOf("`") + 1, bron.lastIndexOf("`"));

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
    invoer: {},
    verwacht: { B_p_Rd: 260.6, F_t_Rd: 90.4, F_v_Rd: 60.3, F_b_Rd: 112.1, k_1: 2.189, "α_d": 0.556 },
  },
  {
    blad: "document6C — e₁ 60 en e₂ 50: k₁ én α_b op hun bovengrens",
    invoer: { e_1: "60", e_2: "50" },
    verwacht: { B_p_Rd: 260.6, F_t_Rd: 90.4, F_v_Rd: 60.3, F_b_Rd: 230.4, k_1: 2.5, "α_d": 1.111, "α_b": 1 },
  },
];

/** de referentie-uitwerking print op vier cijfers; die marge houden we aan. */
const gelijk = (a, b) => Math.abs(a - b) <= Math.max(0.05, Math.abs(b) * 0.0006);

function waarden(selectValues) {
  const uit = {};
  for (const node of evaluate(parse(tpl), selectValues, PROJECT)) {
    if (node.type === "var-display") uit[node.name] = parseFloat(String(node.result).replace(",", "."));
  }
  return uit;
}

let fouten = 0;
for (const ref of REFERENTIES) {
  console.log(`\n${ref.blad}`);
  let got;
  try {
    got = waarden({ ...BASIS, ...ref.invoer });
  } catch (err) {
    console.log(`  FOUT   blad kon niet worden doorgerekend: ${err.message}`);
    fouten++;
    continue;
  }
  for (const [naam, xc] of Object.entries(ref.verwacht)) {
    const ons = got[naam];
    const ok = ons !== undefined && gelijk(ons, xc);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} ${naam.padEnd(8)} ons ${String(ons ?? "—").padStart(8)}   de referentie-uitwerking ${xc}`);
  }
  for (const [naam, xc] of Object.entries(ref.afwijkend ?? {})) {
    const ons = got[naam];
    console.log(`  afwijkend ${naam.padEnd(6)} ons ${String(ons ?? "—").padStart(8)}   de referentie-uitwerking ${xc}   (§6 in het register)`);
  }
}

console.log(
  fouten === 0
    ? "\nAlle referenties exact — op de gemarkeerde afwijkingen na."
    : `\n${fouten} afwijking(en) die niet in het register staan.`,
);
process.exit(fouten === 0 ? 0 : 1);
