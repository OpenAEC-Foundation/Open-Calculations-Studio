/**
 * Controlescript voor de module Oplegging op metselwerk (EN 1996-1-1 §6.1.3).
 *
 * Twee referentiebladen, metselwerk-oplegging-1 en -2:
 *
 *   1  kalkzandsteen <25 % CS12 + M15, categorie I, t = 200, a_1 = 300,
 *      N_Edc = 360 kN — β begrensd op β_max = 1,31, voldoet niet (2,18)
 *   2  baksteen <25 % fb 5 + M15, categorie II, t = 150, a_1 = 0 (oplegging
 *      tegen het wandeinde), N_Edc = 50 kN — voldoet (0,76)
 *
 * Beide in CC1: γ_M = 1,5 (categorie I) en 2,0 (categorie II), tabel NB-1.
 *
 * Blad 2 raakt register punt 14: f_m = 15 is groter dan 2·f_b = 10. Het
 * referentieprogramma rekent toch met 15; in de norm-stand geldt 10, en
 * daarmee een lagere f_k en een hogere u.c.
 *
 * Draaien:  node scripts/check-opleg-metselwerk.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { laadTemplate, reken, toets, toetsNormStand, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("oplegMetselwerk.ts");
const PROJECT = { CC: 1, K_FI: 0.9, rekenwijze: 1 };

const BASIS = {
  overspanning: "1", morteltype: "1", f_m: "15", h: "2800", h_k: "250",
  a_L: "200", a_t: "160", L_r: "2000", exc: "0", q_Edc: "5.5",
};

const REFERENTIES = [
  { blad: "metselwerk-oplegging-1 — kalkzandsteen CS12 + M15, a_1 = 300",
    invoer: { steensoort: "3", f_b: "12", steencategorie: "1", t: "200", a_1: "300", N_Edc: "360" },
    verwacht: { f_k: "5.94", f_d: "3.96", h_c: "2550", A_b: "32000", l_efm: "1236",
                "β": "1.31", N_Rdc: "165.8", N_Ed: "361.1", UC: "2.18", ratio_Ab: "0.13" } },
  { blad: "metselwerk-oplegging-2 — baksteen fb 5 + M15, a_1 = 0",
    invoer: { steensoort: "1", f_b: "5", steencategorie: "2", t: "150", a_1: "0", N_Edc: "50" },
    verwacht: { f_k: "3.36", f_d: "1.68", l_efm: "936", "β": "1.25",
                N_Rdc: "67.19", N_Ed: "51.1", UC: "0.76", ratio_Ab: "0.23" } },
];

let fouten = 0;
for (const ref of REFERENTIES) {
  const got = reken(tpl, { ...BASIS, ...ref.invoer }, PROJECT);
  fouten += toets(ref.blad, got, ref.verwacht);
}

// ── Norm-stand ────────────────────────────────────────────────────────────
// Blad 1: f_m = 15 ≤ 2·12 → niets verandert. Blad 2: f_m wordt 2·5 = 10, dus
// f_k en N_Rdc dalen en de u.c. stijgt.
const RICHTING = [
  { f_k: "gelijk", N_Rdc: "gelijk", UC: "gelijk" },
  { f_k: "lager", N_Rdc: "lager", UC: "hoger" },
];
REFERENTIES.forEach((ref, i) => {
  const invoer = { ...BASIS, ...ref.invoer };
  const xc = reken(tpl, invoer, PROJECT);
  const nb = reken(tpl, invoer, { ...PROJECT, rekenwijze: 0 });
  fouten += toetsNormStand(ref.blad, xc, nb, RICHTING[i]);
});

afronden(fouten, "Oplegging op metselwerk");
