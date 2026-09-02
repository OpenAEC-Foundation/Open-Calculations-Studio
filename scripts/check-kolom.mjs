/**
 * Controlescript voor de module Kolom (houten kolom op druk + buiging).
 *
 * Zes de referentie-uitwerking-referenties. Basisgeval: 75×175 C24, klimaatklasse 1,
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
 * Draaien:  node scripts/check-kolom.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
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
      sig_c0d: "0.8", lam_y: "63.34", lam_z: "147.80",
      lam_rel_y: "1.074", lam_rel_z: "2.506",
      k_y: "1.15", k_z: "3.86", k_cy: "0.63", k_cz: "0.15",
      l_ef: "3200", sig_mcrit: "58", lam_rel_m: "0.643", k_crit: "1.00",
      UC_623: "0.12", UC_624: "0.53",
    } },

  { blad: "document2 — eindmoment M_yA = 3 kNm",
    invoer: { M_yA_Ed: "3" },
    verwacht: {
      M_yEd: "3.000", V_Ed: "0.9375", sig_myd: "7.8", tau_d: "0.11", f_vd: "1.8",
      UC_619: "0.71", UC_623: "0.83", UC_624: "1.03", UC_635: "1.03",
    } },

  { blad: "document3 — dwarslast q_z = 1,5 kN/m",
    invoer: { q_z_Ed: "1.5" },
    verwacht: {
      M_yEd: "1.920", V_Ed: "2.400", sig_myd: "5.0", tau_d: "0.27",
      UC_619: "0.46", UC_623: "0.58", UC_624: "0.85", UC_635: "0.74",
    } },

  { blad: "document4 — 44×144 met alle belastingen tegelijk",
    invoer: { profiel: "11", Lcr_y: "1500", Lcr_z: "2000", Lcr: "1600",
              N_Ed: "15", M_yA_Ed: "5", M_yB_Ed: "3", q_z_Ed: "2" },
    verwacht: {
      k_hy: "1.008", k_hz: "1.278", f_myd: "11.2", f_mzd: "14.2",
      // Het werkelijke veldmaximum, niet max|M_A;M_B| + q·L²/8 (= 7,56).
      M_yEd: "6.658", V_Ed: "3.825", sig_c0d: "2.4", sig_myd: "43.8", tau_d: "0.91",
      lam_y: "36.08", lam_rel_y: "0.612", k_y: "0.72", k_cy: "0.91",
      lam_z: { waarde: "157.46", tol: 0.05,
               waarom: "ons blad drukt boven 100 nog maar één decimaal af" },
      lam_rel_z: "2.670", k_z: "4.30", k_cz: "0.13",
      // l_ef rekent met de kolomlengte 3200, niet met L_cr = 1600.
      l_ef: "3168", sig_mcrit: "24.5", lam_rel_m: "0.99", k_crit: "0.818",
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

let fouten = 0;
for (const ref of REFERENTIES) {
  const got = reken(tpl, { ...BASIS, ...ref.invoer }, PROJECT);
  fouten += toets(ref.blad, got, ref.verwacht, ref.afwijkend ?? {}, ucsUitTekst(got.text));
}

// ── Norm-stand ────────────────────────────────────────────────────────────
// Eén splitspunt: de kiplengte rekent bij de referentie-uitwerking met de kolomlengte L, bij
// de norm met max(L; L_cr). Op alle zes bladen is L_cr ≤ L, dus l_ef hoort in
// beide standen gelijk te zijn — dat is precies wat hier wordt vastgelegd.
for (const ref of REFERENTIES) {
  const invoer = { ...BASIS, ...ref.invoer };
  const xc = reken(tpl, invoer, PROJECT);
  const nb = reken(tpl, invoer, { ...PROJECT, rekenwijze: 0 });
  fouten += toetsNormStand(ref.blad, xc, nb, {
    l_ef: "gelijk", sig_mcrit: "gelijk", k_crit: "gelijk", k_cy: "gelijk", k_cz: "gelijk",
  });
}

console.log(`
Twee dingen die deze bladen vastleggen en die de modulekop eerder verkeerd had:
M_y,Ed is het wérkelijke maximum van het momentenverloop (document4: 6,658 kNm,
niet 5 + q·L²/8 = 7,56), en de kiplengte rekent met de kolomlengte L en niet met
de ingevoerde ongesteunde lengte L_cr — document4 heeft L_cr = 1600 en gebruikt
toch 0,9 × 3200 + 2 × 144 = 3168 mm. Dat laatste is nu een splitspunt: in de
norm-stand telt max(L; L_cr).`);

afronden(fouten, "Kolom");
