/**
 * Controlescript voor de module Dragende metselwerkwand (EN 1996-1-1 §5.5.1
 * en §6.1.2 met bijlage G).
 *
 * Veertien referentiebladen, metselwerkwand-1 tot en met -14. Basis: ℓ = 1000,
 * h = 2800, t = 120 mm, kalkzandsteen <25 % CS12 + M15, categorie I, CC2,
 * n = 2, N_Ed = N_Ed,max = 200 kN en geen momenten; elke set wijzigt alleen
 * wat erbij staat.
 *
 * Daarna de gevallen zonder referentieblad die het blad volgens de norm
 * afhandelt: een resultante buiten de doorsnede (Φ = 0, UC = ∞), een moment
 * zonder normaalkracht, trek, een vloer aan één zijde met een te korte
 * oplegging (§5.5.1.2(11)), het teken van M_mEd in de lage-belastingstak, een
 * penant kleiner dan 0,1 m² ((6.3)) en een N_Ed,max kleiner dan N_Ed.
 *
 * Draaien:  node scripts/check-metselwerkwand.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { laadTemplate, reken, toets, toetsNormStand, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("metselwerkwand.ts");
const PROJECT = { CC: 2, K_FI: 1, rekenwijze: 1 };

const BASIS = {
  ondersteuning: "1", n_rand: "2", l_w: "1000", h_w: "2800", t_w: "120", L_v: "3000",
  steensoort: "3", f_b: "12", morteltype: "1", f_m: "15", steencategorie: "1", phi_inf: "1.5",
  N_Ed: "200", N_Ed_max: "200", M_1Ed: "0", M_mEd: "0", M_2Ed: "0",
};

/**
 * Het blad toont vier significante cijfers: 151,07 staat er als 151,1. Toets
 * zo'n waarde op die weergave, niet op de laatste decimaal van de referentie.
 */
const VIER_CIJFERS = (waarde) => ({ waarde, tol: 0.05, waarom: "het blad toont vier cijfers" });

/** Set 10: de excentriciteit aan de kop is groter dan 0,25·t. */
const SET_10 = { M_1Ed: "10", M_mEd: "5", M_2Ed: "7" };

const REFERENTIES = [
  { blad: "metselwerkwand-1 — alle momenten nul", invoer: {},
    verwacht: { f_k: "5.94", Phi_it: "0.900", Phi_ib: "0.900", Phi_m: "0.605", UC_1: "0.79",
                Phi_m2: "0.360", N_Rdm2: VIER_CIJFERS("151.07"), UC_2: "1.32" } },
  { blad: "metselwerkwand-2 — M_1Ed = 5 kNm", invoer: { M_1Ed: "5" },
    verwacht: { Phi_it: "0.506", N_Rdt: VIER_CIJFERS("211.91"), UC_1: "0.94" } },
  { blad: "metselwerkwand-3 — M_mEd = 5 kNm", invoer: { M_mEd: "5" },
    verwacht: { e_mk: "29.7", Phi_m: "0.201", UC_1: "2.37" } },
  { blad: "metselwerkwand-4 — N = 300, N_max = 150, M = 7/5/3, n = 3 met L_v ≥ 15·t",
    invoer: { N_Ed: "300", N_Ed_max: "150", M_1Ed: "7", M_mEd: "5", M_2Ed: "3", n_rand: "3" },
    verwacht: { n_eff: "2", Phi_it: "0.533", Phi_ib: "0.756", Phi_m: "0.334", UC_1: "2.14" } },
  { blad: "metselwerkwand-5 — M_mEd = 1 kNm", invoer: { M_mEd: "1" },
    verwacht: { e_m: "9.7", Phi_m: "0.539", N_Rdm: VIER_CIJFERS("225.77"), UC_1: "0.89" } },
  { blad: "metselwerkwand-6 — N_Ed = 30 kN, lage-belastingstak", invoer: { N_Ed: "30" },
    verwacht: { e_cap: "55.7", UC_1: "0.12" } },
  { blad: "metselwerkwand-7 — n = 4, L_v = 2000", invoer: { n_rand: "4", L_v: "2000" },
    verwacht: { rho_n: "0.36", h_ef: "1000", Phi_m: "0.839", UC_1: "0.57", h_ef2: "1000", UC_2: "0.62" } },
  { blad: "metselwerkwand-8 — baksteen <25 % fb 18 + lijmmortel L12,5",
    invoer: { steensoort: "1", f_b: "18", morteltype: "2", f_m: "12.5" },
    verwacht: { f_k: "9.00", f_d: "5.29", UC_1: "0.52", UC_2: "0.87" } },
  { blad: "metselwerkwand-9 — CC3, M5", invoer: { f_m: "5" }, project: { CC: 3 },
    verwacht: { f_k: "4.51", gam_M: "1.70", UC_1: "1.04" } },
  { blad: "metselwerkwand-10 — M = 10/5/7, e_t > 0,25·t", invoer: SET_10,
    verwacht: { rho_2: "1.00", h_ef: "2800", Phi_it: "0.063", Phi_ib: "0.313", Phi_m: "0.075",
                N_Rd: "26.39", UC_1: "7.58" } },
  // 11 t/m 14: set 10 met elk van de vier ondersteuningsopties van de
  // referentie. De e_t-regel wint, dus alle vier geven ρ_2 = 1,00.
  ...[1, 2, 3, 4].map((optie, i) => ({
    blad: `metselwerkwand-${11 + i} — set 10 met ondersteuning ${optie}`,
    invoer: { ...SET_10, ondersteuning: String(optie) },
    verwacht: { rho_2: "1.00", h_ef: "2800", N_Rd: "26.39", UC_1: "7.58" },
  })),
];

let fouten = 0;
for (const ref of REFERENTIES) {
  const got = reken(tpl, { ...BASIS, ...ref.invoer }, { ...PROJECT, ...ref.project });
  fouten += toets(ref.blad, got, ref.verwacht);
}

// ── Buiten de referenties ─────────────────────────────────────────────────
// Φ = 1 − 2e/t wordt negatief zodra de resultante buiten de doorsnede valt.
// Een negatieve N_Rd gaf een negatieve UC en dus "voldoet"; het blad houdt Φ
// nu op nul, en een weerstand nul geeft UC = ∞. Trek kan ongewapend
// metselwerk niet opnemen. Een vloer aan één zijde klemt alleen in bij een
// oplegging van ten minste ⅔·t (beton), een houten vloer telt pas als steun
// bij ⅔·t en 85 mm. N_Ed,max ligt in de eerste drie gevallen zo laag dat de
// tweede toets het oordeel niet redt: daar gaf het blad eerder "voldoet".
const GEVALLEN = [
  { naam: "resultante buiten de doorsnede — M_1Ed = 20 kNm",
    invoer: { M_1Ed: "20", N_Ed_max: "100" }, verwacht: { Phi_it: "0", N_Rd: "0" }, uc: "∞", voldoet: false },
  { naam: "moment zonder normaalkracht — N_Ed = 0, M_mEd = 2 kNm",
    invoer: { N_Ed: "0", N_Ed_max: "0", M_mEd: "2" }, verwacht: { Phi_m: "0", N_Rd: "0" }, uc: "∞", voldoet: false },
  { naam: "trek — N_Ed = N_Ed,max = −50 kN",
    invoer: { N_Ed: "-50", N_Ed_max: "-50" }, verwacht: {}, uc: "∞", voldoet: false, tekst: /Trek/ },
  { naam: "betonvloer aan één zijde, oplegging ≥ ⅔·t",
    invoer: { ondersteuning: "2" }, verwacht: { rho_2: "0.75", h_ef: "2100" } },
  { naam: "betonvloer aan één zijde, oplegging korter dan ⅔·t",
    invoer: { ondersteuning: "5" }, verwacht: { rho_2: "1.00", h_ef: "2800" } },
  { naam: "houten vloer aan één zijde, kortere oplegging",
    invoer: { ondersteuning: "6" }, verwacht: { rho_2: "1.00", h_ef: "2800" }, tekst: /Let op/ },

  // Lage-belastingstak met een moment op halve hoogte: het teken van M_mEd mag
  // de uitkomst niet bepalen. N = 30, M_1Ed = 2: e_t = 66,7 > 30 → ρ_2 = 1,00,
  // e_init = 2800/450 = 6,22; ratio_N = 30/(1000·120·3,493e-3) = 0,072 ≤ 0,1,
  // e_cap = 60 − 30 000/(2·1000·3,493) = 55,7; ΔM_t = (72,9 − 55,7)·30 = 0,516 kNm.
  // M_Ed,mc = |±1| + 0,516/2 = 1,258 → e_m = 41,9 + 6,2 = 48,15, A_1 = 0,198,
  // u = (0,882 − 0,063)/(0,73 − 1,17·48,15/120) = 3,14, Φ_m = 0,198·e^(−4,94) = 0,0014,
  // N_Rd,m = 0,0014·1000·120·3,493 = 0,59 kN → UC = 30/0,593 = 50,6.
  // Met M_mEd = −1 gaf het blad eerder M_Ed,mc = −0,742 en UC = 1,00 "voldoet".
  ...["1", "-1"].map((m) => ({
    naam: `lage-belastingstak, M_mEd = ${m} kNm geeft dezelfde uitkomst`,
    invoer: { N_Ed: "30", N_Ed_max: "30", M_1Ed: "2", M_mEd: m },
    verwacht: { e_cap: "55.7", M_Edmc: "1.258", e_m: "48.15", UC_1: "50.6" }, voldoet: false,
  })),

  // Penant 400 × 120: A = 0,048 m² < 0,1 m², dus f_d maal 0,7 + 3·0,048 = 0,844
  // (§6.1.2.1(3), (6.3)): f_d = 3,493·0,844 = 2,948. Φ verandert niet (E = 700·f_k):
  // N_Rd = 0,605·400·120·2,948 = 85,6 → UC_1 = 55/85,6 = 0,64;
  // N_Rd,m2 = 0,3604·400·120·2,948 = 51,0 → UC_2 = 55/51,0 = 1,08 (was 0,91 "voldoet").
  { naam: "penant 400 × 120 — kleine doorsnede (6.3)",
    invoer: { l_w: "400", N_Ed: "55", N_Ed_max: "55" },
    verwacht: { A_w: "0.048", k_A: "0.844", f_d: "2.948", N_Rd: "85.6", UC_1: "0.64", N_Rdm2: "51.0", UC_2: "1.08" },
    voldoet: false },

  // N_Ed,max kleiner dan N_Ed: de NB bij 5.5.1.1(5) vraagt de grootste
  // normaalkracht, dus ten minste N_Ed. Basisset met N_Ed,max = 140:
  // UC_2 = 200/151,07 = 1,32 (was 140/151,07 = 0,93 "voldoet").
  { naam: "N_Ed,max kleiner dan N_Ed — toets met N_Ed",
    invoer: { N_Ed_max: "140" },
    verwacht: { N_mx: "200", N_Rdm2: VIER_CIJFERS("151.07"), UC_2: "1.32" }, voldoet: false, tekst: /N Ed,max is kleiner dan N Ed/ },
];

/** De slotzin van het blad: "Maatgevende UC = … → … voldoet (niet)". */
function slotzin(got) {
  const i = got.text.lastIndexOf("Maatgevende UC");
  return i < 0 ? "" : got.text.slice(i, i + 200);
}

for (const g of GEVALLEN) {
  const got = reken(tpl, { ...BASIS, ...g.invoer }, PROJECT);
  fouten += toets(g.naam, got, g.verwacht);
  const zin = slotzin(got);
  if (g.uc !== undefined) {
    const ok = zin.startsWith(`Maatgevende UC = ${g.uc}`);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} slotzin   ${zin.slice(0, 60) || "(geen)"}   verwacht UC = ${g.uc}`);
  }
  if (g.voldoet !== undefined) {
    const voldoet = !/voldoet niet/.test(zin) && /voldoet/.test(zin);
    const ok = voldoet === g.voldoet;
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel   ${voldoet ? "voldoet" : "voldoet niet"}`);
  }
  if (g.tekst) {
    const ok = g.tekst.test(got.text);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} melding   ${g.tekst}`);
  }
}

// ── Norm-stand ────────────────────────────────────────────────────────────
// In de referentiesets is f_m = 15 ≤ 2·f_b: de norm-stand verandert niets.
// Met baksteen fb 5 + M15 grijpt f_m ≤ 2·f_b wel in (register punt 14).
const NORM = [
  { naam: "metselwerkwand-1", invoer: {},
    richting: { f_k: "gelijk", N_Rd: "gelijk", UC_1: "gelijk" } },
  { naam: "baksteen fb 5 + M15", invoer: { steensoort: "1", f_b: "5" },
    richting: { f_k: "lager", N_Rd: "lager", UC_1: "hoger" } },
];
for (const n of NORM) {
  const invoer = { ...BASIS, ...n.invoer };
  const xc = reken(tpl, invoer, PROJECT);
  const nb = reken(tpl, invoer, { ...PROJECT, rekenwijze: 0 });
  fouten += toetsNormStand(n.naam, xc, nb, n.richting);
}

afronden(fouten, "Dragende metselwerkwand");
