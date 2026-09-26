/**
 * Controlescript voor de module Kolom (houten kolom op druk + buiging).
 *
 * Zes referentieberekeningen. Basisgeval: 75×175 C24, klimaatklasse 1,
 * belastingsduurklasse blijvend, L = L_cr,y = L_cr,z = L_cr = 3200 mm,
 * N_Ed = 10 kN, CC2. Belastingen zijn rekenwaarden, dus er is geen
 * combinatielogica en geen 6.10a-vraag zoals bij gording.
 *
 *   1  basisgeval — alleen druk
 *   2  M_yA = 3 kNm      — eindmoment, koppelkracht in V_Ed
 *   3  q_z = 1,5 kN/m    — dwarslast, veldmoment
 *   4  44×144 met álles tegelijk: L_cr,y 1500 / L_cr,z 2000 / L_cr 1600,
 *      N 15, M_A 5, M_B 3, q_z 2. Hier komt k_h om beide assen boven water
 *      (h én b < 150) én het werkelijke veldmaximum van het momentenverloop
 *   5  klimaatklasse 2 — k_def verandert, maar dit blad kent geen doorbuiging,
 *      dus alle uitkomsten moeten gelijk blijven aan document1
 *   6  klimaatklasse 3 — de lagere k_mod-tak
 *
 * Daarnaast twee sets met een negatieve dwarslast (geen referentieblad, met de
 * hand nagerekend): het extreem ligt dan in het veld en is negatief.
 *
 * Draaien:  node scripts/check-kolom.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { laadTemplate, reken, toets, toetsNormStand, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("kolom.ts");

/** CC2 → K_FI = 1,00; `rekenwijze` = 1 → de referentie-uitwerking volgen. */
const PROJECT = { K_FI: 1, rekenwijze: 1 };

const BASIS = {
  profiel: "5", sterkteklasse: "2", klimaatklasse: "1", duurklasse: "1",
  L: "3200", Lcr_y: "3200", Lcr_z: "3200", Lcr: "3200",
  N_Ed: "10", M_yA_Ed: "0", M_yB_Ed: "0", q_z_Ed: "0",
};

/** Waarden die de referentie-uitwerking op één decimaal afdrukt in de toetsregels. */
const REFERENTIES = [
  { blad: "document1 — 75×175 C24, alleen druk N_Ed = 10 kN",
    invoer: {},
    verwacht: {
      f_myd: "11.08", f_mzd: "12.7", f_c0d: "9.7", k_hz: "1.149",
      "σ_c0d": "0.8", "λ_y": "63.34", "λ_z": "147.80",
      "λ_rel_y": "1.074", "λ_rel_z": "2.506",
      k_y: "1.15", k_z: "3.86", k_cy: "0.63", k_cz: "0.15",
      l_ef: "3200", "σ_mcrit": "58", "λ_rel_m": "0.643", k_crit: "1.00",
      UC_623: "0.12", UC_624: "0.53",
    } },

  { blad: "document2 — eindmoment M_yA = 3 kNm",
    invoer: { M_yA_Ed: "3" },
    verwacht: {
      M_yEd: "3.000", V_Ed: "0.9375", "σ_myd": "7.8", "τ_d": "0.11", f_vd: "1.8",
      UC_619: "0.71", UC_623: "0.83", UC_624: "1.03", UC_635: "1.03",
    } },

  { blad: "document3 — dwarslast q_z = 1,5 kN/m",
    invoer: { q_z_Ed: "1.5" },
    verwacht: {
      M_yEd: "1.920", V_Ed: "2.400", "σ_myd": "5.0", "τ_d": "0.27",
      UC_619: "0.46", UC_623: "0.58", UC_624: "0.85", UC_635: "0.74",
    } },

  { blad: "document4 — 44×144 met alle belastingen tegelijk",
    invoer: { profiel: "11", Lcr_y: "1500", Lcr_z: "2000", Lcr: "1600",
              N_Ed: "15", M_yA_Ed: "5", M_yB_Ed: "3", q_z_Ed: "2" },
    verwacht: {
      k_hy: "1.008", k_hz: "1.278", f_myd: "11.2", f_mzd: "14.2",
      // Het werkelijke veldmaximum, niet max|M_A;M_B| + q·L²/8 (= 7,56).
      M_yEd: "6.658", V_Ed: "3.825", "σ_c0d": "2.4", "σ_myd": "43.8", "τ_d": "0.91",
      "λ_y": "36.08", "λ_rel_y": "0.612", k_y: "0.72", k_cy: "0.91",
      "λ_z": { waarde: "157.46", tol: 0.05,
               waarom: "ons blad drukt boven 100 nog maar één decimaal af" },
      "λ_rel_z": "2.670", k_z: "4.30", k_cz: "0.13",
      // l_ef rekent met de kolomlengte 3200, niet met L_cr = 1600.
      l_ef: "3168", "σ_mcrit": "24.5", "λ_rel_m": "0.99", k_crit: "0.818",
      UC_619: "3.98", UC_623: "4.19", UC_624: "4.62", UC_635: "24.87",
    } },

  { blad: "document5 — klimaatklasse 2 (moet gelijk zijn aan document1)",
    invoer: { klimaatklasse: "2" },
    verwacht: { f_myd: "11.08", f_c0d: "9.7", UC_623: "0.12", UC_624: "0.53" } },

  { blad: "document6 — klimaatklasse 3 (k_mod 0,50)",
    invoer: { klimaatklasse: "3" },
    verwacht: { f_c0d: "8.1", f_myd: "9.2", f_mzd: "10.6",
                UC_623: "0.15", UC_624: "0.64" } },
];

/** De u.c.'s staan in de conclusieregels, niet als var-display. */
function ucsUitTekst(text) {
  const uit = {};
  // De formules bevatten zelf cijfers (σ c,0,d , k m , f v,d ), dus knip op "UC"
  // en pak in elk stuk het getal dat vlak vóór de vergelijking met 1,0 staat.
  for (const stuk of text.split("UC")) {
    const m = stuk.match(/^\s*(6\.\d+)\s*=[\s\S]*?=\s*([\d.]+)\s*(?:≤|>)\s*1\.0/);
    if (m) uit[`UC_${m[1].replace(".", "")}`] = parseFloat(m[2]);
  }
  return uit;
}

/**
 * Negatieve dwarslast. Het momentenverloop is dan convex en het negatieve
 * extreem ligt in het veld; |M| en V horen gelijk te zijn aan de gespiegelde
 * belasting.
 */
const NEGATIEF = [
  { blad: "document4 gespiegeld — M_A = −5, M_B = −3, q_z = −2",
    invoer: { profiel: "11", Lcr_y: "1500", Lcr_z: "2000", Lcr: "1600",
              N_Ed: "15", M_yA_Ed: "-5", M_yB_Ed: "-3", q_z_Ed: "-2" },
    // Alle lasten van teken omgekeerd: M(x) keert om, |M| en V blijven die van document4.
    verwacht: { M_yEd: "6.658", V_Ed: "3.825", "σ_myd": "43.8", "τ_d": "0.91",
                UC_619: "3.98", UC_623: "4.19", UC_624: "4.62", UC_635: "24.87", UC_max: "24.87" } },

  { blad: "75×175, alleen q_z = −2 kN/m",
    invoer: { q_z_Ed: "-2" },
    // |M| = 2·3,2²/8 = 2,56 kNm · V = 2·3,2/2 = 3,2 kN
    // τ_d = 1,5·3200/(75·175) = 0,366 · f_v,d = 0,6·4,0/1,3 = 1,846 → UC 0,198
    verwacht: { M_yEd: "2.560", V_Ed: "3.200", "τ_d": "0.366", UC_613: "0.198" } },
];

let fouten = 0;
for (const ref of [...REFERENTIES, ...NEGATIEF]) {
  const got = reken(tpl, { ...BASIS, ...ref.invoer }, PROJECT);
  fouten += toets(ref.blad, got, ref.verwacht, ref.afwijkend ?? {}, ucsUitTekst(got.text));
}

// ── Norm-stand ────────────────────────────────────────────────────────────
// Eén splitspunt. De kiplengte rekent bij de referentie-uitwerking met de
// kolomlengte L, bij de norm met max(L; L_cr); op alle bladen is L_cr ≤ L, dus
// l_ef hoort in beide standen gelijk te zijn. De afschuiving is geen
// splitspunt: beide standen rekenen met k_cr = 1,0 (NB art. 6.1.7(2)), dus
// τ_d en UC_6.13 zijn gelijk.
for (const ref of [...REFERENTIES, ...NEGATIEF]) {
  const invoer = { ...BASIS, ...ref.invoer };
  const xc = reken(tpl, invoer, PROJECT);
  const nb = reken(tpl, invoer, { ...PROJECT, rekenwijze: 0 });
  fouten += toetsNormStand(ref.blad, xc, nb, {
    l_ef: "gelijk", "σ_mcrit": "gelijk", k_crit: "gelijk", k_cy: "gelijk", k_cz: "gelijk",
    "τ_d": "gelijk", UC_613: "gelijk",
  });
}

// De afschuiving op document4 in de norm-stand, met de hand (k_cr = 1,0):
// τ_d = 1,5·3825/(1,0·44·144) = 0,9055 N/mm² · UC = 0,9055/1,846 = 0,4905
// (met k_cr = 0,67 was het 1,352 en 0,732).
{
  const doc4 = REFERENTIES.find((r) => r.blad.startsWith("document4"));
  const nb = reken(tpl, { ...BASIS, ...doc4.invoer }, { ...PROJECT, rekenwijze: 0 });
  fouten += toets("document4 — norm-stand, afschuiving met k_cr = 1,0", nb,
    { "τ_d": "0.9055", UC_613: "0.4905" }, {}, ucsUitTekst(nb.text));
}

// ── Het beeld ─────────────────────────────────────────────────────────────
// KolomDesigner.tsx rekent niet zelf maar leest zijn getallen uit dit blad.
// Elke naam die het beeld opvraagt, moet het blad in beide standen zichtbaar
// uitrekenen; anders staat er in het paneel een "—".
{
  const beeld = readFileSync(new URL("../packages/desktop/src/components/calc/KolomDesigner.tsx", import.meta.url), "utf8");
  const namen = [...new Set([...beeld.matchAll(/\bw\("([^"]+)"/g)].map((m) => m[1]))];
  console.log(`\nKolomDesigner leest ${namen.length} namen uit het blad`);
  for (const [stand, rekenwijze] of [["referentie", 1], ["norm", 0]]) {
    const uit = reken(tpl, BASIS, { ...PROJECT, rekenwijze });
    const mist = namen.filter((n) => !Number.isFinite(uit.values[n]));
    if (mist.length) fouten++;
    console.log(`  ${mist.length ? "FOUT  " : "OK    "} ${stand}stand${mist.length ? `: ontbreekt ${mist.join(", ")}` : ": alle namen aanwezig"}`);
  }
}

console.log(`
Twee dingen die deze bladen vastleggen en die de modulekop eerder verkeerd had:
M_y,Ed is het wérkelijke maximum van het momentenverloop (document4: 6,658 kNm,
niet 5 + q·L²/8 = 7,56), en de kiplengte rekent met de kolomlengte L en niet met
de ingevoerde ongesteunde lengte L_cr — document4 heeft L_cr = 1600 en gebruikt
toch 0,9 × 3200 + 2 × 144 = 3168 mm. Dat laatste is nu een splitspunt: in de
norm-stand telt max(L; L_cr).`);

afronden(fouten, "Kolom");
