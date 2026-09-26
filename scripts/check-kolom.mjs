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
 * De toepassingen gevelstijl en stempel (keuze kolomsoort) hebben evenmin een
 * referentieblad; hun sets zijn met de hand nagerekend en staan met de
 * rekengang als commentaar bij de set. De referentiesets hierboven laten
 * kolomsoort leeg: zo rekent een blad van vóór die keuze, en ze moeten
 * onveranderd blijven.
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
  const refStand = reken(tpl, invoer, PROJECT);
  const nb = reken(tpl, invoer, { ...PROJECT, rekenwijze: 0 });
  fouten += toetsNormStand(ref.blad, refStand, nb, {
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

// ── Gevelstijl en stempel ─────────────────────────────────────────────────
// Geen referentieblad: elke verwachting is met de hand nagerekend. Deze
// toepassingen gebruiken ook de gevolgklasse en de windgegevens van het project.
const PROJECT_TOEPASSING = { ...PROJECT, CC: 2, DesignLife: 50, windgebied: 2, terreincategorie: 2 };

/**
 * Het oordeel zoals de afdruk het leest: getal en woord uit de slotzin
 * "Maatgevende UC = …" (UC_slot, en voldoet als 1 of 0).
 */
function slotzin(text) {
  const i = text.lastIndexOf("Maatgevende UC");
  const zin = i < 0 ? "" : text.slice(i, i + 160);
  const m = zin.match(/Maatgevende UC\s*=\s*([\d.,]+)/);
  const voldoet = !/voldoe[nt] niet/.test(zin) && /voldoe[nt]/.test(zin);
  return { UC_slot: m ? parseFloat(m[1].replace(",", ".")) : NaN, voldoet: i < 0 ? NaN : voldoet ? 1 : 0 };
}

const GEVEL = {
  kolomsoort: "2", profiel: "6", sterkteklasse: "2", klimaatklasse: "1", duurklasse: "1",
  L: "3000", Lcr_y: "3000", Lcr_z: "1000", Lcr: "3000", N_Ed: "5", N_Ed_max: "12",
  qp_bron: "2", q_p_in: "0.8", c_pe_d: "0.8", c_pe_z: "-1.2", b_gevel: "0.6",
};
const STEMPEL = {
  kolomsoort: "3", stempeltype: "1", profiel: "7", sterkteklasse: "2", klimaatklasse: "1",
  L: "2700", stempellast: "1", g_juk: "6", q_juk: "3", a_stempel: "1.2", psi_0: "1",
};
const STAAL = {
  kolomsoort: "3", stempeltype: "2", stempelwaarde: "1", L: "2700",
  stempellast: "2", F_Gk_st: "10", F_Qk_st: "5", psi_0: "0.4", F_tabel: "20.2",
};

const TOEPASSINGEN = [
  // 75×225 C24, klimaatklasse 1; q_p = 0,8 kN/m² zelf ingevuld, c_pe +0,8 en −1,2, h.o.h. 0,6 m.
  // Netto druk (0,8 + 0,3)·0,8 = 0,88 en zuiging (1,2 + 0,2)·0,8 = 1,12 kN/m² (c_pi −0,3 en +0,2);
  // q_z,Ed = 1,5·1,12·0,6 = 1,008 kN/m; M = 1,008·3²/8 = 1,134 kNm; V = 1,512 kN.
  // Met wind k_mod kort = 0,90: f_m,y,d = 16,62 (k_h = 1 bij h = 225), f_c,0,d = 14,54, f_v,d = 2,769.
  // σ_c = 5000/16 875 = 0,2963; σ_m = 1,134·10⁶/632 813 = 1,792; τ = 1,5·1512/16 875 = 0,1344.
  // λ_y = 3000/64,95 = λ_z = 1000/21,65 = 46,19 → λ_rel 0,7832, k = 0,8550, k_c = 0,8347.
  // (6.19) 0,000415 + 0,10785 = 0,1083; (6.23) 0,02442 + 0,10785 = 0,1323; (6.24) 0,02442 + 0,07550 = 0,0999.
  // Kip: l_ef = min(0,9·3000 + 450; 3000) = 3000; σ_crit = 0,78·75²·7400/(225·3000) = 48,10;
  // λ_rel,m = 0,7064 → k_crit 1; (6.35) 0,01163 + 0,02442 = 0,03605.
  // Zonder wind, blijvend (k_mod 0,60): f_c,0,d = 9,692; σ = 12 000/16 875 = 0,7111;
  // UC = 0,7111/(0,8347·9,692) = 0,0879. Maatgevend (6.23) = 0,1323: de gevelstijl voldoet.
  { blad: "gevelstijl — 75×225 C24, q_p zelf 0,8 kN/m²",
    invoer: GEVEL, project: {},
    verwacht: {
      k_mod: "0.90", w_d: "0.88", w_z: "1.12", w_k: "1.12", q_z_Ed: "1.008", M_yEd: "1.134", V_Ed: "1.512",
      f_myd: "16.62", "σ_myd": "1.792", "τ_d": "0.1344", UC_619: "0.1083", UC_613: "0.04853",
      k_cy: "0.8347", k_cz: "0.8347", UC_623: "0.1323", UC_624: "0.0999", "σ_mcrit": "48.10", k_crit: "1",
      UC_635: "0.03605", k_mod_N: "0.60", f_c0d_N: "9.692", "σ_c0d_N": "0.7111", UC_N: "0.0879",
      UC_max: "0.1323", UC_slot: "0.1323", voldoet: "1",
    } },

  // 45×195 C24, klimaatklasse 2, zonder wind middellang; L 3600, L_cr,z 600 (regels), L_cr 3600.
  // q_p uit windgebied I en terreincategorie 0 op 12 m: k_r = 0,19·0,1^0,07 = 0,1617;
  // ln(12/0,005) = 7,783; c_r = 1,259; v_m = 1,259·29,5 = 37,13 m/s; I_v = 0,1285;
  // q_p = (1 + 7·0,1285)·0,625·37,13²/1000 = 1,637 kN/m². Zuiging maatgevend: (1,4 + 0,2)·1,637 = 2,619;
  // q_z,Ed = 1,5·2,619·0,6 = 2,357 kN/m; M = 2,357·3,6²/8 = 3,818 kNm.
  // σ_c = 4000/8775 = 0,4558; σ_m = 3,818·10⁶/285 188 = 13,39; (6.19) 0,00098 + 0,8057 = 0,8067.
  // λ_rel,y = 3600/56,29/π·√(21/7400) = 1,084 → k_c,y 0,6265; λ_rel,z = 600/12,99/π·0,05327 = 0,7832 → 0,8347.
  // (6.23) 0,4558/(0,6265·14,54) + 0,8057 = 0,8558; (6.24) 0,0376 + 0,5640 = 0,6016.
  // Kip: l_ef = min(3240 + 390; 3600) = 3600; σ_crit = 0,78·45²·7400/(195·3600) = 16,65;
  // λ_rel,m = √(24/16,65) = 1,201; k_crit = 1,56 − 0,75·1,201 = 0,6595;
  // (6.35) (13,39/(0,6595·16,62))² + 0,0376 = 1,4924 + 0,0376 = 1,530.
  // Zonder wind, middellang (k_mod 0,80): 0,9117/(0,6265·12,92) = 0,1126.
  // Maatgevend is kip met knik: 1,530, de gevelstijl voldoet niet.
  { blad: "gevelstijl — 45×195, q_p uit windgebied I, terreincategorie 0, 12 m",
    invoer: { ...GEVEL, profiel: "3", klimaatklasse: "2", duurklasse: "2", L: "3600", Lcr_y: "3600",
              Lcr_z: "600", Lcr: "3600", N_Ed: "4", N_Ed_max: "8", qp_bron: "1", z_gevel: "12", c_pe_z: "-1.4" },
    project: { windgebied: 1, terreincategorie: 1 },
    verwacht: {
      k_r: "0.1617", c_r: "1.259", v_m: "37.13", I_v: "0.1285", q_p: "1.637", w_d: "1.800", w_k: "2.619",
      q_z_Ed: "2.357", M_yEd: "3.818", "σ_myd": "13.39", UC_619: "0.8067", k_cy: "0.6265", k_cz: "0.8347",
      UC_623: "0.8558", UC_624: "0.6016", "σ_mcrit": "16.65", "λ_rel_m": "1.201", k_crit: "0.6595",
      UC_635: "1.530", k_mod_N: "0.80", UC_N: "0.1126", UC_max: "1.530", UC_slot: "1.530", voldoet: "0",
    } },

  // Houten stempel 100×100 C24 onder een juk: g_k 6 en q_k 3 kN/m, h.o.h. 1,2 m, ψ_0 = 1,0, CC2.
  // F_G = 7,2 en F_Q = 3,6 kN; 6.10a: 1,35·7,2 + 1,5·1,0·3,6 = 15,12; 6.10b: 1,2·7,2 + 1,5·3,6 = 14,04.
  // Kort, k_mod 0,90: f_c,0,d = 14,54; σ = 15 120/10 000 = 1,512; UC (6.2) = 0,1040.
  // λ = 2700/28,87 = 93,53; λ_rel = 1,586; k = 1,886; k_c = 0,3440; UC = 1,512/(0,3440·14,54) = 0,3024.
  { blad: "houten stempel — 100×100 C24, lijnlast op het juk",
    invoer: STEMPEL, project: {},
    verwacht: {
      F_Gk: "7.2", F_Qk: "3.6", N_Ed_a: "15.12", N_Ed_b: "14.04", N_Ed: "15.12", k_mod: "0.90",
      "σ_c0d": "1.512", UC_62: "0.1040", "λ_rel_z": "1.586", k_cz: "0.3440", UC_613: "0", UC_623: "0.3024",
      UC_624: "0.3024", UC_max: "0.3024", UC_slot: "0.3024", voldoet: "1",
    } },

  // Houten stempel 150×150 C18, klimaatklasse 3, puntlasten G 30 en Q 20 kN, ψ_0 = 0, CC3.
  // 6.10a: 1,5·30 = 45; 6.10b: 1,3·30 + 1,65·20 = 72 kN. Kort in klimaatklasse 3: k_mod 0,70;
  // f_c,0,d = 0,7·18/1,3 = 9,692; σ = 72 000/22 500 = 3,20.
  // λ = 3500/43,30 = 80,83; λ_rel = 80,83/π·√(18/6000) = 1,409; k = 1,604; k_c = 0,4220;
  // UC = 3,20/(0,4220·9,692) = 0,7824.
  { blad: "houten stempel — 150×150 C18, puntlast, klimaatklasse 3, CC3",
    invoer: { ...STEMPEL, profiel: "10", sterkteklasse: "1", klimaatklasse: "3", L: "3500",
              stempellast: "2", F_Gk_st: "30", F_Qk_st: "20", psi_0: "0" },
    project: { CC: 3 },
    verwacht: {
      "γ_Ga": "1.5", "γ_Gb": "1.3", "γ_Q": "1.65", N_Ed_a: "45", N_Ed_b: "72", N_Ed: "72", k_mod: "0.70",
      f_c0d: "9.692", "λ_rel_z": "1.409", k_cz: "0.4220", UC_623: "0.7824", UC_max: "0.7824",
    } },

  // Stalen schroefstempel met een toelaatbare last van 20,2 kN bij deze uitschuiflengte:
  // de karakteristieke last 10 + 5 = 15 kN; UC = 15/20,2 = 0,7426. De rekenwaarde
  // N_Ed = max(1,35·10 + 1,5·0,4·5; 1,2·10 + 1,5·5) = max(16,5; 19,5) = 19,5 kN telt hier niet.
  { blad: "stalen schroefstempel — toelaatbare last",
    invoer: STAAL, project: {},
    verwacht: { N_Ed_a: "16.5", N_Ed_b: "19.5", N_Ed: "19.5", F_rep: "15", UC_st: "0.7426",
                UC_max: "0.7426", UC_slot: "0.7426", voldoet: "1" } },

  // Rekenwaarde van het draagvermogen 14 kN, lijnlast g_k 8 en q_k 2,5 kN/m op h.o.h. 1,0 m, ψ_0 = 1,0:
  // N_Ed = max(1,35·8 + 1,5·2,5; 1,2·8 + 1,5·2,5) = max(14,55; 13,35) = 14,55; UC = 14,55/14 = 1,039.
  { blad: "stalen schroefstempel — rekenwaarde draagvermogen, voldoet niet",
    invoer: { ...STAAL, stempelwaarde: "2", L: "3000", stempellast: "1", g_juk: "8", q_juk: "2.5",
              a_stempel: "1.0", psi_0: "1", F_tabel: "14" },
    project: {},
    verwacht: { N_Ed_a: "14.55", N_Ed_b: "13.35", N_Ed: "14.55", UC_st: "1.039",
                UC_max: "1.039", UC_slot: "1.039", voldoet: "0" } },
];

for (const t of TOEPASSINGEN) {
  const project = { ...PROJECT_TOEPASSING, ...t.project };
  const got = reken(tpl, t.invoer, project);
  fouten += toets(t.blad, got, t.verwacht, {}, { ...ucsUitTekst(got.text), ...slotzin(got.text) });
  // Geen splitspunt in deze toepassingen buiten de kiplengte, en daar is L_cr ≤ L:
  // de norm-stand hoort overal eindig en hetzelfde oordeel te geven.
  const nb = reken(tpl, t.invoer, { ...project, rekenwijze: 0 });
  fouten += toetsNormStand(t.blad, got, nb, { UC_max: "gelijk" });
}

// ── Het beeld ─────────────────────────────────────────────────────────────
// KolomDesigner.tsx rekent niet zelf maar leest zijn getallen uit dit blad.
// Elke naam die het beeld opvraagt, moet het blad in beide standen zichtbaar
// uitrekenen; anders staat er in het paneel een "—". Namen die maar in één
// toepassing bestaan, staan in het beeld tussen `toepassing: …` en
// `toepassing: einde`; die toetsen we in de toepassingen waar het beeld ze
// toont. De rest geldt voor de kolom (het basisgeval).
{
  const beeld = readFileSync(new URL("../packages/desktop/src/components/calc/KolomDesigner.tsx", import.meta.url), "utf8");
  const namenIn = (bron) => [...new Set([...bron.matchAll(/\bw\("([^"]+)"/g)].map((m) => m[1]))];
  const STREEK = /\/\* toepassing: (\w+) \*\/([\s\S]*?)\/\* toepassing: einde \*\//g;
  const invoer = {
    kolom: [BASIS, PROJECT],
    gevel: [{ ...GEVEL, qp_bron: "1", z_gevel: "10" }, PROJECT_TOEPASSING],
    stempel: [STEMPEL, PROJECT_TOEPASSING],
    staal: [STAAL, PROJECT_TOEPASSING],
  };
  /** In welke toepassingen het beeld de namen van een streek toont. */
  const WAAR = { hout: ["kolom", "gevel", "stempel"], gevel: ["gevel"], stempel: ["stempel", "staal"], staal: ["staal"] };
  const groepen = [["kolom", namenIn(beeld.replace(STREEK, "")), ["kolom"]]];
  for (const m of beeld.matchAll(STREEK)) {
    if (!WAAR[m[1]]) { fouten++; console.log(`  FOUT   onbekende toepassing "${m[1]}" in KolomDesigner`); continue; }
    groepen.push([m[1], namenIn(m[2]), WAAR[m[1]]]);
  }
  const totaal = new Set(groepen.flatMap(([, namen]) => namen)).size;
  console.log(`\nKolomDesigner leest ${totaal} namen uit het blad`);
  for (const [streek, namen, toepassingen] of groepen) {
    if (namen.length === 0) continue;
    for (const toepassing of toepassingen) {
      for (const [stand, rekenwijze] of [["referentie", 1], ["norm", 0]]) {
        const [bladInvoer, project] = invoer[toepassing];
        const uit = reken(tpl, bladInvoer, { ...project, rekenwijze });
        const mist = namen.filter((n) => !Number.isFinite(uit.values[n]));
        if (mist.length) fouten++;
        console.log(`  ${mist.length ? "FOUT  " : "OK    "} ${streek} in ${toepassing}, ${stand}stand${mist.length ? `: ontbreekt ${mist.join(", ")}` : `: ${namen.length} namen aanwezig`}`);
      }
    }
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
