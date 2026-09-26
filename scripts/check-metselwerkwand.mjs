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
 * penant kleiner dan 0,1 m² ((6.3)), een N_Ed,max kleiner dan N_Ed, de
 * ondergrens 0,3 van ρ_3 in (5.7), een slankheid boven 27 in de
 * minimale-excentriciteitstoets, φ_∞ uit tabel NB-3 en een langsvoeg
 * (§3.6.1.2(6)). In de norm-stand loopt de minimale-excentriciteitstoets ook
 * na een eerste afkeur, en geldt f_m ≤ 2·f_b.
 *
 * Draaien:  node scripts/check-metselwerkwand.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { laadTemplate, reken, toets, toetsNormStand, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("metselwerkwand.ts");
const PROJECT = { CC: 2, K_FI: 1, rekenwijze: 1 };

const BASIS = {
  ondersteuning: "1", n_rand: "2", l_w: "1000", h_w: "2800", t_w: "120", L_v: "3000",
  steensoort: "3", f_b: "12", morteltype: "1", f_m: "15", langsvoeg: "1", steencategorie: "1",
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
    verwacht: { f_k: "4.51", gam_M: "1.70", UC_1: "1.04", UC_max: "1.04" } },
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

  // ρ_3 volgens (5.7) is niet kleiner dan 0,3. Basisset met n = 3 en L_v = 500
  // (< 15·t = 1800, dus n blijft 3): h = 2800 > 3,5·500 → 1,5·500/2800 = 0,268
  // → ρ_3 = 0,3, h_ef = 840 (was 750). e_init = 1,87, e_mk = 0,05·t = 6,
  // A_1 = 0,9, λ_F = 7·√(1/700) = 0,2646, u = 0,2016/0,6715 = 0,300,
  // Φ_m = 0,9·e^(−0,045) = 0,860, N_Rd = 0,860·120 000·3,493/1000 = 360,6
  // → UC_1 = 0,55. Tweede toets: h_ef2 = 840, e_mk2 = 10, A_1 = 0,833,
  // u = 0,2016/0,6325 = 0,319, Φ_m2 = 0,833·e^(−0,0508) = 0,792,
  // N_Rd,m2 = 332,0 → UC_2 = 0,60.
  { naam: "n = 3 met L_v < 0,2·h — ρ_3 niet kleiner dan 0,3",
    invoer: { n_rand: "3", L_v: "500" },
    verwacht: { n_eff: "3", rho_n: "0.300", h_ef: "840", Phi_m: "0.860", UC_1: "0.55",
                h_ef2: "840", Phi_m2: "0.792", UC_2: "0.60" }, voldoet: true },

  // Slankheid boven 27 in de minimale-excentriciteitstoets: een capaciteitstoets
  // (NB bij 5.5.1.1(5) en 6.1.2.2(1)(ii)); de grens 27 van §5.5.1.4 hoort bij
  // h_ef uit stap 5. Baksteen fb 20 + M10, t = 100, N = 40:
  // f_k = 0,6·20^0,65·10^0,25 = 7,479, f_d = 4,399; λ = 0,75·2800/100 = 21.
  // λ_2 = 28 > 27 → φ_∞ = 0,7 (tabel NB-3), e_k2 = 0,002·0,7·28·√(100·10) = 1,24,
  // e_mk2 = 11,24, A_1 = 0,775, λ_F = 28·√(1/700) = 1,058,
  // u = 0,9953/(0,73 − 0,1315) = 1,663, Φ_m2 = 0,775·e^(−1,383) = 0,194,
  // N_Rd,m2 = 0,194·100 000·4,399/1000 = 85,6 → UC_2 = 0,47. UC_max = 21/27 = 0,78.
  // Eerder telde λ_2/27 = 1,04 mee en gaf het blad "voldoet niet".
  { naam: "λ_2 = 28 in de minimale-excentriciteitstoets — alleen via e_k",
    invoer: { steensoort: "1", f_b: "20", f_m: "10", t_w: "100", N_Ed: "40", N_Ed_max: "40" },
    verwacht: { lam: "21.0", lam_2: "28.0", phi_inf: "0.7", e_k2: "1.24", Phi_m2: "0.194",
                UC_2: "0.47", UC_max: "0.78" }, voldoet: true },

  // φ_∞ uit tabel NB-3 (NB bij 3.7.4(2)): kalkzandsteen met metselmortel 1,1.
  // Basisset met t = 100, N = 60: λ_2 = 28, e_k2 = 0,002·1,1·28·√1000 = 1,948,
  // e_mk2 = 11,948, A_1 = 0,761, u = 0,9953/(0,73 − 0,1398) = 1,686,
  // Φ_m2 = 0,761·e^(−1,422) = 0,1836, N_Rd,m2 = 0,1836·100 000·3,493/1000 = 64,1
  // → UC_2 = 0,94. Met de vroegere standaard φ_∞ = 0 van het beeld: 0,80.
  { naam: "φ_∞ = 1,1 voor kalkzandsteen met metselmortel (tabel NB-3)",
    invoer: { t_w: "100", N_Ed: "60", N_Ed_max: "60" },
    verwacht: { phi_inf: "1.1", e_k2: "1.948", Phi_m2: "0.1836", N_Rdm2: "64.1", UC_2: "0.94" }, voldoet: true },
  { naam: "φ_∞ = 0,8 voor kalkzandsteen met lijmmortel", invoer: { morteltype: "2", f_m: "12.5" },
    verwacht: { phi_inf: "0.8" } },
  { naam: "φ_∞ = 1,9 voor betonsteen met metselmortel", invoer: { steensoort: "5" },
    verwacht: { phi_inf: "1.9" } },

  // Langsvoeg (§3.6.1.2(6)): K = 0,8·0,6 = 0,48. Baksteen fb 20 + M10,
  // t = 210, N = 600: f_k = 0,8·7,479 = 5,983. Φ verandert niet (E = 700·f_k,
  // λ_F hangt niet van f_k af), dus N_Rd schaalt met 0,8: UC_1 = 0,806/0,8 =
  // 1,01. Zonder langsvoeg voldoet dezelfde wand (0,81).
  { naam: "langsvoeg — K maal 0,8",
    invoer: { steensoort: "1", f_b: "20", f_m: "10", t_w: "210", N_Ed: "600", N_Ed_max: "600", langsvoeg: "2" },
    verwacht: { K: "0.48", f_k: "5.983", UC_1: "1.01" }, voldoet: false },
  { naam: "langsvoeg met lijmmortel — melding", invoer: { morteltype: "2", f_m: "12.5", langsvoeg: "2" },
    verwacht: { K: "0.64" }, tekst: /geeft de norm geen f k/ },
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
// Met baksteen fb 5 + M15 grijpt f_m ≤ 2·f_b wel in (register punt 14):
// f_k = 0,6·5^0,65·10^0,25 = 3,04 in plaats van 0,6·5^0,65·15^0,25 = 3,36. De
// referentiestand meldt dat in rood, de norm-stand niet.
//
// Langsvoeg: baksteen fb 20 + M10, t = 210, N = 600, K = 0,48, f_d = 3,520.
// De referentie slaat de tweede toets over (UC_1 = 1,01). Norm-stand:
// e_mk2 = max(10; 0,05·210) = 10,5, A_1 = 0,9, λ_F = 13,33·√(1/700) = 0,504,
// u = 0,441/0,6715 = 0,657, Φ_m2 = 0,9·e^(−0,216) = 0,725,
// N_Rd,m2 = 0,725·1000·210·3,520/1000 = 536,2 → UC_2 = 600/536,2 = 1,12.
//
// De referentie slaat de minimale-excentriciteitstoets over zodra de eerste
// toets niet voldoet; de norm-stand voert hem altijd uit. Set 9 (CC3, M5):
// f_k = 0,6·12^0,65·5^0,25 = 4,512, f_d = 4,512/1,7 = 2,654; h_ef2 = 2800,
// e_mk2 = max(10; 2800/300) = 10 mm, A_1 = 1 − 20/120 = 0,833,
// λ_F = 23,33·√(1/700) = 0,882, u = (0,882 − 0,063)/(0,73 − 1,17·10/120) = 1,295,
// Φ_m2 = 0,833·e^(−0,838) = 0,360, N_Rd,m2 = 0,360·1000·120·2,654/1000 = 114,8 kN
// → UC_2 = 200/114,8 = 1,74. De referentie geeft als maatgevende UC 1,04.
const NORM = [
  { naam: "metselwerkwand-1", invoer: {},
    richting: { f_k: "gelijk", N_Rd: "gelijk", UC_1: "gelijk" }, melding: false },
  { naam: "baksteen fb 5 + M15", invoer: { steensoort: "1", f_b: "5" },
    richting: { f_k: "lager", N_Rd: "lager", UC_1: "hoger" },
    xc: { f_k: "3.36" }, waarden: { f_k: "3.04" }, melding: true },
  { naam: "metselwerkwand-9 — minimale excentriciteit na een eerste afkeur", invoer: { f_m: "5" },
    project: { CC: 3 }, richting: { UC_1: "gelijk", UC_max: "hoger" },
    waarden: { N_Rdm2: "114.8", UC_2: "1.74", UC_max: "1.74" } },
  { naam: "langsvoeg — minimale excentriciteit na een eerste afkeur",
    invoer: { steensoort: "1", f_b: "20", f_m: "10", t_w: "210", N_Ed: "600", N_Ed_max: "600", langsvoeg: "2" },
    richting: { f_k: "gelijk", UC_1: "gelijk", UC_max: "hoger" },
    waarden: { N_Rdm2: "536.2", UC_2: "1.12", UC_max: "1.12" } },
];
const MELDING_2FB = /f m is groter dan 2·f b/;
for (const n of NORM) {
  const invoer = { ...BASIS, ...n.invoer };
  const project = { ...PROJECT, ...n.project };
  const xc = reken(tpl, invoer, project);
  const nb = reken(tpl, invoer, { ...project, rekenwijze: 0 });
  fouten += toetsNormStand(n.naam, xc, nb, n.richting);
  if (n.xc) fouten += toets(`${n.naam} — referentiestand`, xc, n.xc);
  if (n.waarden) fouten += toets(`${n.naam} — norm-stand, met de hand`, nb, n.waarden);
  if (n.melding !== undefined) {
    const ok = MELDING_2FB.test(xc.text) === n.melding && !MELDING_2FB.test(nb.text);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} melding   f_m > 2·f_b ${n.melding ? "alleen in de referentiestand" : "nergens"}`);
  }
}

afronden(fouten, "Dragende metselwerkwand");
