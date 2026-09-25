/**
 * Controlescript voor de module Oplegging op metselwerk (EN 1996-1-1 §6.1.3).
 *
 * Drie referentiebladen, metselwerk-oplegging-1 tot en met -3:
 *
 *   1  kalkzandsteen <25 % CS12 + M15, categorie I, t = 200, a_1 = 300,
 *      N_Edc = 360 kN — β begrensd op β_max = 1,31, voldoet niet (2,18)
 *   2  baksteen <25 % fb 5 + M15, categorie II, t = 150, a_1 = 0 (oplegging
 *      tegen het wandeinde), N_Edc = 50 kN — voldoet (0,76)
 *   3  kalkzandsteen <25 % CS12 + lijmmortel, categorie I, CC2, t = 100,
 *      oplegging 180 × 100 op 300 mm van het wandeinde, geen keep,
 *      N_Edc = 23 kN — β = 1,31, voldoet (0,25)
 *
 * Bladen 1 en 2 in CC1: γ_M = 1,5 (categorie I) en 2,0 (categorie II), tabel NB-1.
 *
 * Blad 2 raakt register punt 14: f_m = 15 is groter dan 2·f_b = 10. Het
 * referentieprogramma rekent toch met 15; in de norm-stand geldt 10, en
 * daarmee een lagere f_k en een hogere u.c.
 *
 * Daarna de gevallen zonder referentieblad: steengroep 2 (β = 1,0),
 * A_b/A_ef boven 0,45, de nevenvoorwaarden in het eindoordeel en trek.
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

// Derde tegenproef, uit een eigen rekenblad: lijmmortel, CC2 (γ_M = 1,70) en
// een wand zonder keep (h_c = h). Dat blad vult f_k afgerond in (6,6), vandaar
// de ruimere marge op f_d en N_Rdc.
const RONDT_FK_AF = "het rekenblad rondt f_k af op 6,6";
fouten += toets("metselwerk-oplegging-3 — kalkzandsteen CS12 + lijmmortel, oplegging 180 × 100",
  reken(tpl, {
    ...BASIS, steensoort: "3", f_b: "12", morteltype: "2", f_m: "12.5", steencategorie: "1",
    t: "100", a_L: "180", a_t: "100", h: "2600", h_k: "0", a_1: "300", L_r: "2220", q_Edc: "0", N_Edc: "23",
  }, { ...PROJECT, CC: 2 }),
  { f_k: "6.6", f_d: { waarde: "3.88", tol: 0.015, waarom: RONDT_FK_AF }, A_b: "18000", l_efm: "1231",
    "β": "1.31", N_Rdc: { waarde: "91.4", tol: 0.3, waarom: RONDT_FK_AF }, UC: "0.25", ratio_Ab: "0.15" });

// ── Buiten de referenties ─────────────────────────────────────────────────
// De vergroting β geldt alleen voor steengroep 1 (§6.1.3(2)); groep 2 krijgt
// β = 1,0 (§6.1.3(3)). Boven A_b/A_ef = 0,45 rekent het blad zonder
// vergroting; in dat geval gaf het blad eerder β = 1,48 en "voldoet". Het
// eindoordeel telt e ≤ t/4, de oplegging van 90 mm en h_c > 0 mee, en trek
// keurt af.
const GEVALLEN = [
  { naam: "blad 1 met kalkzandsteen <55 % (groep 2)", ref: 0, invoer: { steensoort: "4" },
    verwacht: { "β": "1.00", N_Rdc: "105.6", UC: "3.42" }, voldoet: false },
  { naam: "blad 2 met baksteen <55 % (groep 2)", ref: 1, invoer: { steensoort: "2" },
    verwacht: { "β": "1.00", N_Rdc: "44.82", UC: "1.14" }, voldoet: false },
  { naam: "A_b/A_ef boven 0,45 — geen vergroting", ref: 0,
    invoer: { a_L: "600", a_t: "150", h: "800", a_1: "1000" },
    verwacht: { ratio_Ab: "0.49", "β": "1.00", UC: "1.02" }, voldoet: false },
  { naam: "excentriciteit groter dan t/4", ref: 1, invoer: { exc: "60" },
    verwacht: { UC: "0.76" }, voldoet: false },
  { naam: "oplegging korter dan 90 mm", ref: 1, invoer: { a_t: "80", N_Edc: "30" },
    verwacht: { opleg_min: "80", UC: "0.93" }, voldoet: false },
  { naam: "keep even hoog als de wand (h_c = 0)", ref: 1, invoer: { h_k: "2800" },
    verwacht: { h_c: "0", UC: "0.95" }, voldoet: false },
  { naam: "trek op de oplegging", ref: 1, invoer: { N_Edc: "-50" },
    verwacht: { N_Ed: "-48.9" }, uc: "∞", voldoet: false },
  { naam: "blad 2 zelf voldoet", ref: 1, invoer: {}, verwacht: {}, voldoet: true },
];

/** De slotzin van het blad: "Maatgevende UC = … → Oplegging voldoet (niet)". */
function slotzin(got) {
  const i = got.text.lastIndexOf("Maatgevende UC");
  return i < 0 ? "" : got.text.slice(i, i + 160);
}

for (const g of GEVALLEN) {
  const got = reken(tpl, { ...BASIS, ...REFERENTIES[g.ref].invoer, ...g.invoer }, PROJECT);
  fouten += toets(g.naam, got, g.verwacht);
  const zin = slotzin(got);
  if (g.uc !== undefined) {
    const ok = zin.startsWith(`Maatgevende UC = ${g.uc}`);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} slotzin   ${zin.slice(0, 60) || "(geen)"}   verwacht UC = ${g.uc}`);
  }
  const voldoet = !/voldoet niet/.test(zin) && /voldoet/.test(zin);
  const ok = voldoet === g.voldoet;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel   ${voldoet ? "voldoet" : "voldoet niet"}`);
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
