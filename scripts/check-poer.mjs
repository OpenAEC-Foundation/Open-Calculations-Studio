/**
 * Controlescript voor de module Tweepaals poer (NEN-EN 1992-1-1 met NB,
 * staafwerkmodel volgens §6.5 en §9.8.1).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten daarom op twee manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript: paalreacties met eigen
 *      gewicht en paalafwijking, het staafwerk met een hydrostatische knoop
 *      onder de kolom, de knopen (6.60) en (6.61), de verankering langs de
 *      staafas met α_5 uit de drukspreiding (9.8.1(5)) en de ombuiging (8.1),
 *      beide met de paal e_paal naar de kop van de poer (9.8.1(1)),
 *      dwarskracht met β (6.2.2(6)) of beugels (6.19) en de bovengrens,
 *      scheurwijdte (7.3.4) onder de frequente combinatie, de detaillering en
 *      het oordeel van de slotregel.
 *   2. Voor de standaardinvoer een volledige handberekening, en een grensgeval
 *      waarin de knoop onder de kolom precies op UC = 1 komt: net eronder
 *      voldoet de poer, net erboven niet.
 *
 * Daarnaast: de beginwaarden van het beeld zijn gelijk aan de standaardinvoer
 * hier, elk invoerveld van het blad krijgt een beginwaarde, en het beeld
 * schrijft alleen naar velden die het blad kent.
 *
 * Draaien:  node scripts/check-poer.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("tweepaalsPoer.ts");

const STANDAARD = {
  kolomvorm: 1, paalvorm: 1, d_kolom: 500, b_kolom: 500, b_paal: 450, l_paal: 450,
  b_poer: 600, h_poer: 1250, l_hoh: 1600, oversteek: 400, e_paal: 100,
  betonklasse: 35, betonstaal: 2, betonoppervlak: 1, c_dek: 55,
  n_langs: 6, d_langs: 32, n_sneden: 3, d_beugel: 12, s_beugel: 100,
  F_Ed: 3600, M_Ed: 0, F_fr: 2500, R_cd: 2400,
};

// ── Onafhankelijke uitwerking; eenheden N en mm, lasten in kN ────────────────
function uitwerking(v, CC = 2) {
  const fck = v.betonklasse, fcd = fck / 1.5, fctm = 0.3 * fck ** (2 / 3), fctd = (0.7 * fctm) / 1.5;
  const fyd = 500 / 1.15, nuK = 1 - fck / 250;
  const Ecm = 22000 * ((fck + 8) / 10) ** 0.3, Es = 200000;
  const rond = v.kolomvorm === 1, prond = v.paalvorm === 2;
  const phi = v.d_langs, n = v.n_langs, c1 = v.c_dek + v.d_beugel;
  const ys = c1 + phi / 2, d = v.h_poer - ys;
  const xk = rond ? (2 * v.d_kolom) / (3 * Math.PI) : v.d_kolom / 4;

  const geldig = v.h_poer > ys && v.l_hoh > 2 * xk && v.e_paal >= 0 && v.oversteek > v.c_dek + v.e_paal &&
    v.b_poer > 0 && v.d_kolom > 0 &&
    v.b_paal > 0 && n >= 1 && phi > 0 && v.s_beugel > 0 && v.F_Ed >= 0 && v.F_fr >= 0 &&
    (rond || v.b_kolom > 0) && (prond || v.l_paal > 0);
  if (!geldig) return { geldig };

  // paalreacties
  const Gk = 25e-9 * (v.l_hoh + 2 * v.oversteek) * v.b_poer * v.h_poer;
  const gG = CC === 1 ? 1.2 : CC === 3 ? 1.5 : 1.35;
  const N = v.F_Ed + gG * Gk, M = Math.abs(v.M_Ed), l = v.l_hoh / 1000;
  const Mtot = M + (N * v.e_paal) / 1000;
  const R = N / 2 + Mtot / l, Rmin = N / 2 - Mtot / l;
  const UCpaal = v.R_cd > 0 ? R / v.R_cd : 0;

  // staafwerk
  const ak = rond ? (v.d_kolom * Math.sqrt(Math.PI)) / 2 : v.d_kolom;
  const a = v.l_hoh / 2 - xk;
  const knoopPast = d * d > ak * a;
  const z = (d + Math.sqrt(Math.max(d * d - ak * a, 0))) / 2;
  const theta = (Math.atan(z / a) * 180) / Math.PI;
  const Ftd = (R * a) / z;
  const As = (n * Math.PI * phi ** 2) / 4;
  const UCtrek = (Ftd * 1e3) / fyd / As;
  const sh = (v.b_poer - 2 * c1 - phi) / Math.max(n - 1, 1);

  // knopen
  const Rk = v.F_Ed / 2 + M / l;
  const Ak = rond ? (Math.PI * v.d_kolom ** 2) / 4 : v.d_kolom * v.b_kolom;
  const UCkn1 = (2 * Rk * 1e3) / Ak / (nuK * fcd);
  const Ap = prond ? (Math.PI * v.b_paal ** 2) / 4 : v.b_paal * v.l_paal;
  const ap = prond ? Math.sqrt(Ap) : v.b_paal, bp = prond ? Math.sqrt(Ap) : v.l_paal;
  const L = Math.hypot(z, a);
  const w2 = (ap * z + 2 * ys * a) / L;
  const sd = (R * 1e3 * L) / (z * w2 * Math.min(bp, v.b_poer));
  const UCkn2 = Math.max((R * 1e3) / Ap, sd) / (0.85 * nuK * fcd);

  // verankering en ombuiging
  const eta2 = phi <= 32 ? 1 : (132 - phi) / 100;
  const fbd = 2.25 * eta2 * fctd;
  const ssd = (Ftd * 1e3) / As;
  const lbrqd = ((phi / 4) * ssd) / fbd;
  const p = (R * 1e3) / ((ap + 2 * ys) * (bp + 2 * ys));
  const a5 = Math.min(1, Math.max(0.7, 1 - 0.04 * p));
  const cd = Math.min((sh - phi) / 2, c1);
  const a1 = cd > 3 * phi ? 0.7 : 1;
  const lbd = Math.max(a1 * a5 * lbrqd, 0.3 * lbrqd, 10 * phi, 100);
  const phimTab = (phi <= 16 ? 4 : 5) * phi;
  const ab = Math.min(sh / 2, c1 + phi / 2);
  const phimBet = ((Ftd * 1e3) / n) * (1 / ab + 1 / (2 * phi)) / Math.min(fcd, 55 / 1.5);
  const phim = Math.max(phimTab, phimBet);
  // De paal kan e_paal naar de kop van de poer staan (9.8.1(1)).
  const ov = v.oversteek - v.e_paal;
  const UCrol = (phim / 2 + phi) / (ov - v.c_dek);
  const rb = phim / 2 + phi / 2;
  const l1 = ov + ap / 2 - v.c_dek - phim / 2 - phi;
  const lv = v.h_poer - v.c_dek - ys - rb;
  const lbesch = l1 + (Math.PI * rb) / 2 + lv;
  const UCank = lbd / lbesch;
  const lvNodig = Math.max(lbd - l1 - (Math.PI * rb) / 2, 0);

  // dwarskracht
  const av = Math.max(v.l_hoh / 2 - v.d_kolom / 2 - v.b_paal / 2, 0.5 * d);
  const beta = Math.min(1, av / (2 * d));
  const k = Math.min(2, 1 + Math.sqrt(200 / d));
  const rho = Math.min(0.02, As / (v.b_poer * d));
  const vRdc = Math.max(0.12 * k * (100 * rho * fck) ** (1 / 3), 0.035 * k ** 1.5 * Math.sqrt(fck));
  const VRdc = (vRdc * v.b_poer * d) / 1e3;
  const VRds = (Math.floor((0.75 * av) / v.s_beugel) * v.n_sneden * Math.PI / 4 * v.d_beugel ** 2 * fyd) / 1e3;
  const UCV = (beta * R) / Math.max(VRdc, VRds);
  const VRdmax = (0.5 * 0.6 * nuK * fcd * v.b_poer * 0.9 * d) / 1e3;
  const UCVmax = R / VRdmax;

  // scheurwijdte
  const Nfr = v.F_fr + Gk;
  const Rfr = Nfr / 2 + (M + (Nfr * v.e_paal) / 1000) / l;
  const ss = (Rfr * 1e3 * a) / (z * As);
  const hcef = Math.min(2.5 * ys, v.h_poer / 2);
  const rpe = As / (v.b_poer * hcef);
  const srmax = sh > 5 * (c1 + phi / 2) ? 1.3 * v.h_poer : 3.4 * c1 + (0.17 * phi) / rpe;
  const eps = Math.max((ss - ((0.4 * fctm) / rpe) * (1 + (Es / Ecm) * rpe)) / Es, (0.6 * ss) / Es);
  const wk = srmax * eps;
  const UCw = wk / (v.betonoppervlak === 1 ? 0.3 : 0.2);

  // detaillering
  const Asmin = Math.max((0.26 * fctm) / 500, 0.0013) * v.b_poer * d;
  const st = (v.b_poer - 2 * v.c_dek - v.d_beugel) / Math.max(v.n_sneden - 1, 1);
  const stMax = R > 0.5 * VRdmax ? Math.min(0.75 * d, 500) : 500;
  const det = phi >= 8 && !(n > 1 && sh - phi < Math.max(phi, 37)) && As >= Asmin &&
    v.b_poer - 2 * c1 <= bp + 2 * ys && v.s_beugel <= Math.min(0.75 * d, 300) && st <= stMax;

  const UCmax = Math.max(UCpaal, UCtrek, UCkn1, UCkn2, UCank, UCrol, UCV, UCVmax, UCw);
  const voldoet = knoopPast && det && UCmax <= 1 && Rmin >= 0;
  return {
    geldig, R, Rmin, UCpaal, z, theta, Ftd, UCtrek, UCkn1, UCkn2, lbrqd, a5, lbd, phim, UCrol, lbesch, lvNodig, UCank,
    beta, VRdc, VRds, UCV, VRdmax, UCVmax, ss, srmax, wk, UCw, Asmin, UCmax, knoopPast, det, voldoet,
  };
}

const s4 = (x) => {
  if (x === 0) return "0";
  const dec = Math.max(0, 3 - Math.floor(Math.log10(Math.abs(x))));
  return x.toFixed(dec);
};
const ruim = (x) => ({ waarde: s4(x), tol: Math.max(Math.abs(x) * 0.002, 1e-6) });

function verwachtingen(r, v) {
  const uit = {
    R_Ed: ruim(r.R), R_Ed_min: ruim(r.Rmin), z: ruim(r.z), θ: ruim(r.theta), F_td: ruim(r.Ftd),
    UC_trek: ruim(r.UCtrek), UC_kn_1: ruim(r.UCkn1), UC_kn_2: ruim(r.UCkn2), l_b_rqd: ruim(r.lbrqd), α_5: ruim(r.a5),
    l_bd: ruim(r.lbd), φ_m: ruim(r.phim), UC_rol: ruim(r.UCrol), l_b_besch: ruim(r.lbesch), l_v_nodig: ruim(r.lvNodig),
    UC_ank: ruim(r.UCank), β: ruim(r.beta), V_Rd_c: ruim(r.VRdc), V_Rd_s: ruim(r.VRds), UC_V: ruim(r.UCV),
    V_Rd_max: ruim(r.VRdmax), UC_Vmax: ruim(r.UCVmax), σ_s: ruim(r.ss), s_r_max: ruim(r.srmax), w_k: ruim(r.wk),
    UC_w: ruim(r.UCw), A_s_min: ruim(r.Asmin), UC_max: ruim(r.UCmax),
  };
  // Zonder draagvermogen staat UC_paal niet als getal in het blad.
  if (v.R_cd > 0) uit.UC_paal = ruim(r.UCpaal);
  return uit;
}

const SETS = [
  {
    naam: "1 — standaard: Ø500 op twee palen 450×450, poer 2400×600×1250, 6Ø32, C35/45",
    invoer: {},
    // Met de hand (N, mm, kN):
    // f_cd = 35/1,5 = 23,33; ν′ = 1 − 35/250 = 0,86; f_yd = 500/1,15 = 434,8;
    // f_ctm = 0,30·35^(2/3) = 3,210; f_ctd = 0,7·3,210/1,5 = 1,498.
    // Paalreacties: G_k = 25·2,4·0,6·1,25 = 45,0 kN, γ_G = 1,35 → 60,75 kN;
    // M_tot = (3600 + 60,75)·0,100 = 366,1 kNm; R_Ed = 3660,75/2 + 366,1/1,6
    // = 1830,4 + 228,8 = 2059,2 kN (R_Ed,min = 1601,6); UC_paal = 2059,2/2400 = 0,858.
    // Staafwerk: y_s = 55 + 12 + 16 = 83, d = 1167; a_k = √π/2·500 = 443,1;
    // x_k = 2·500/(3π) = 106,1; a = 800 − 106,1 = 693,9; d² − a_k·a = 1 361 889
    // − 307 467 = 1 054 422 → z = (1167 + 1026,8)/2 = 1096,9 mm; θ = atan(1096,9/693,9)
    // = 57,68°. F_td = 2059,2·693,9/1096,9 = 1302,6 kN → A_s,nodig = 2996 mm²
    // tegen 6·804,2 = 4825 mm²: UC_trek = 0,621.
    // Knoop onder de kolom: σ = 3600e3/196 350 = 18,33 tegen 0,86·23,33 = 20,07: UC 0,914.
    // Knoop boven de paal: σ_p = 2059,2e3/202 500 = 10,17; √(z² + a²) = 1297,9;
    // w_2 = (450·1096,9 + 166·693,9)/1297,9 = 469,0; σ_d = 2059,2e3·1297,9/(1096,9·469,1·450)
    // = 11,54 tegen 0,85·20,07 = 17,06: UC 0,677.
    // Verankering: f_bd = 2,25·1,498 = 3,370; σ_sd = 1302,6e3/4825 = 269,9;
    // l_b,rqd = 32/4·269,9/3,370 = 640,7; p = 2059,2e3/616² = 5,427 → α_5 = 0,783;
    // c_d = (86,8 − 32)/2 = 27,4 < 3φ → α_1 = 1; l_bd = 0,783·640,7 = 501,6 (> l_b,min 320).
    // Ombuiging: F_bt = 1302,6/6 = 217,1 kN; a_b = min(86,8/2; 67 + 16) = 43,4;
    // φ_m = 217 100·(1/43,4 + 1/64)/23,33 = 359,8 mm (> 5φ = 160). De paal staat
    // e = 100 mm naar de kop (9.8.1(1)): o_min = 400 − 100 = 300; UC_rol = (179,9 + 32)/245 = 0,865.
    // r_b = 195,9; l_1 = 300 + 225 − 55 − 179,9 − 32 = 258,1; l_v = 1250 − 55 − 83 − 195,9 = 916,1;
    // l_b,besch = 258,1 + π·195,9/2 + 916,1 = 1481,9 → UC_ank = 501,6/1481,9 = 0,338.
    // Dwarskracht: a_v = max(800 − 250 − 225; 0,5·1167) = 583,5 → β = 0,25; k = 1,414;
    // ρ_l = 0,006892; v_Rd,c = 0,12·1,414·(24,12)^(1/3) = 0,4903 → V_Rd,c = 343,3 kN;
    // 4 beugels in 0,75·a_v: V_Rd,s = 4·3·113,1·434,8 = 590,1 kN; UC_V = 0,25·2059,2/590,1 = 0,872;
    // V_Rd,max = 0,5·0,6·0,86·23,33·600·0,9·1167 = 3794 kN → UC 0,543.
    // Scheurwijdte: R_fr = 2545/2 + 254,5/1,6 = 1431,6 kN; σ_s = 1431,6e3·693,9/(1096,9·4825)
    // = 187,7; h_c,ef = 2,5·83 = 207,5; ρ_p,eff = 0,03876; s_r,max = 3,4·67 + 0,17·32/0,03876
    // = 368,2; E_cm = 34 078, α_e = 5,869; ε = (187,7 − 0,4·3,210/0,03876·1,2275)/200 000
    // = 7,35e-4; w_k = 0,271 mm → UC_w = 0,902.
    // Maatgevend: de knoop onder de kolom, UC 0,914 → voldoet.
    handwerk: {
      f_cd: "23.33", ν_k: "0.86", G_k: "45.0", M_tot: "366.1", R_Ed: "2059", UC_paal: "0.858",
      d: "1167", a_k: "443.1", x_k: "106.1", a: "693.9", z: "1097", θ: "57.68", F_td: "1303", A_s_nodig: "2996",
      UC_trek: "0.621", σ_Ed_1: "18.33", σ_Rd_1: "20.07", UC_kn_1: "0.914", σ_p: "10.17", w_2: "469.0", σ_d: "11.54",
      UC_kn_2: "0.677", f_bd: "3.370", l_b_rqd: "640.7", α_5: "0.783", l_bd: "501.6", φ_m_bet: "359.8", o_min: "300", UC_rol: "0.865",
      l_b_besch: "1482", UC_ank: "0.338", β: "0.25", V_Rd_c: "343.3", V_Rd_s: "590.1", UC_V: "0.872", V_Rd_max: "3794",
      σ_s: "187.7", s_r_max: "368.2", w_k: "0.271", UC_w: "0.902", UC_max: "0.914",
    },
  },
  {
    naam: "2 — grensgeval: F_Ed = 3940 kN, knoop onder de kolom net onder UC = 1",
    invoer: { F_Ed: 3940 },
    // σ_Rd,1 = 20,067 N/mm²; F_Ed/A_k = 3 940 000/196 350 = 20,066 → UC 0,99997: voldoet.
    // Het blad drukt 1,000 af, maar oordeelt op de exacte waarde; dat toetst het oordeel hieronder.
    // De rest blijft eronder: R_Ed = 4000,75/2 + 400,1/1,6 = 2250,4 kN, UC_V = 0,25·2250,4/590,1 = 0,953.
    handwerk: { σ_Ed_1: "20.07", UC_kn_1: "1.000", R_Ed: "2250", UC_V: "0.953" },
  },
  {
    naam: "3 — grensgeval: F_Ed = 3941 kN, knoop onder de kolom net boven UC = 1",
    invoer: { F_Ed: 3941 },
    // 3 941 000/196 350 = 20,071 > 20,067 → UC 1,0002: voldoet niet (afgedrukt 1,000).
    handwerk: { UC_kn_1: "1.000" },
  },
  {
    naam: "4 — rechthoekige kolom 500×400 op ronde palen Ø450, M_Ed = 400 kNm",
    invoer: { kolomvorm: 2, b_kolom: 400, paalvorm: 2, M_Ed: 400 },
    // x_k = 500/4 = 125, a = 675; R_k = 1800 + 400/1,6 = 2050 kN;
    // σ_Ed,1 = 2·2050e3/(500·400) = 20,50 > 20,07 → UC 1,022: voldoet niet.
    // Paal: A_p = π/4·450² = 159 043 mm², a_p = √A_p = 398,8 mm.
    handwerk: { x_k: "125.0", a: "675.0", R_k: "2050", σ_Ed_1: "20.50", UC_kn_1: "1.022", A_p: "159000", a_p: "398.8" },
  },
  {
    naam: "5 — geen draagvermogen ingevuld (R_cd = 0): de paal is niet getoetst",
    invoer: { R_cd: 0 },
    melding: /draagvermogen van de paal is niet getoetst/,
  },
  {
    naam: "6 — kleine last met groot moment: een paal krijgt trek",
    invoer: { F_Ed: 400, M_Ed: 400, e_paal: 0, F_fr: 300, R_cd: 0 },
    // R_Ed,min = (400 + 60,75)/2 − 400/1,6 = 230,4 − 250 = −19,6 kN.
    handwerk: { R_Ed_min: "-19.6" },
    melding: /Een paal krijgt trek.*niet volledig getoetst/,
  },
  {
    naam: "7 — poer lager dan dekking, beugel en halve staaf: invoer onvolledig",
    invoer: { h_poer: 80 },
    melding: /invoer onvolledig/,
  },
  {
    naam: "8 — lage, lange poer: de knoop onder de kolom past niet (d² ≤ a_k·a)",
    invoer: { h_poer: 700, l_hoh: 2400, oversteek: 600 },
    // d = 617; a = 1200 − 106,1 = 1093,9; a_k·a = 484 717 > 617² = 380 689.
    handwerk: { d: "617", a: "1094" },
    melding: /knoop onder de kolom past niet/,
  },
  {
    naam: "9 — brede poer (1200 mm): de trekband ligt buiten de drukspreiding boven de paal",
    invoer: { b_poer: 1200 },
    // b_band = 1200 − 2·67 = 1066 > b_zone = 450 + 2·83 = 616.
    handwerk: { b_band: "1066", b_zone: "616" },
    melding: /breder dan de drukspreiding/,
  },
  {
    naam: "10 — betonoppervlak niet controleerbaar: w_max = 0,2 mm",
    invoer: { betonoppervlak: 2 },
    // w_k = 0,2706 mm → UC_w = 0,2706/0,2 = 1,353.
    handwerk: { w_max: "0.2", UC_w: "1.353" },
  },
  {
    naam: "11 — twee staven Ø32: grote staafafstand, s_r,max = 1,3·h (7.14)",
    invoer: { n_langs: 2 },
    // s_h = 600 − 134 − 32 = 434 > 5·(67 + 16) = 415 → s_r,max = 1,3·1250 = 1625 mm.
    handwerk: { s_h: "434.0", s_r_max: "1625" },
  },
  {
    naam: "12 — vier staven Ø40: η_2 = (132 − 40)/100 = 0,92",
    invoer: { n_langs: 4, d_langs: 40 },
    // f_bd = 2,25·0,92·1,498 = 3,101 N/mm²; A_s = 4·1256,6 = 5027 mm².
    handwerk: { f_bd: "3.101", A_s: "5027" },
  },
  {
    naam: "13 — slanke poer: θ ver onder 45°, dwarskracht met weinig beugels",
    invoer: { h_poer: 900, l_hoh: 2400, oversteek: 600, s_beugel: 300, F_Ed: 1500, F_fr: 1100 },
  },
  {
    naam: "14 — gevolgklasse CC3: γ_G = 1,5 op het eigen gewicht",
    invoer: {},
    cc: 3,
    // R_Ed = (3600 + 67,5)/2 + 366,75/1,6 = 1833,75 + 229,2 = 2063,0 kN.
    handwerk: { γ_G: "1.5", R_Ed: "2063" },
  },
  {
    naam: "15 — korte oversteek: de ombuiging past niet voorbij het paalhart",
    invoer: { oversteek: 250 },
    // φ_m ≈ 359 mm; met de paalafwijking o_min = 250 − 100 = 150 → (179,5 + 32)/(150 − 55) = 2,226.
    handwerk: { UC_rol: "2.226" },
  },
  {
    naam: "16 — paalafwijking groter dan oversteek min dekking: invoer past niet",
    invoer: { oversteek: 150, e_paal: 100 },
    melding: /invoer onvolledig/,
  },
  {
    naam: "17 — negatieve paalafwijking: invoer past niet",
    invoer: { e_paal: -100 },
    melding: /invoer onvolledig/,
  },
];

let fouten = 0;
for (const set of SETS) {
  const v = { ...STANDAARD, ...set.invoer };
  const cc = set.cc ?? 2;
  const selectValues = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, selectValues, { CC: cc, K_FI: cc === 1 ? 0.9 : cc === 3 ? 1.1 : 1.0 });
  const r = uitwerking(v, cc);
  if (r.geldig) fouten += toets(`${set.naam} — narekening`, got, verwachtingen(r, v));
  else console.log(`\n${set.naam} — ongeldige invoer, geen narekening`);
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk);

  // Een blad dat heel doorrekent: geen foutmelding en geen NaN.
  const stuk = got.text.match(/Undefined symbol|Error|NaN|Unexpected/);
  if (stuk) fouten++;
  console.log(`  ${stuk ? "FOUT  " : "OK    "} uitwerking ${stuk ? `bevat "${stuk[0]}"` : "zonder foutmelding of NaN"}`);

  // Zoals de rapportkop het leest (bladResultaat.ts): de slotzin vanaf
  // "Maatgevende UC" bevat "voldoet" en niet "voldoet niet".
  const i = got.text.lastIndexOf("Maatgevende UC");
  const zin = i >= 0 ? got.text.slice(i, i + 240) : "";
  const voldoet = !/voldoe[nt] niet/.test(zin) && /voldoe[nt]/.test(zin);
  const wil = r.geldig && r.voldoet;
  const ok = i >= 0 && voldoet === wil;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    ons ${voldoet ? "voldoet" : "voldoet niet"}   narekening ${wil ? "voldoet" : "voldoet niet"}`);
  if (set.melding) {
    const gezien = set.melding.test(got.text);
    if (!gezien) fouten++;
    console.log(`  ${gezien ? "OK    " : "FOUT  "} melding    ${set.melding.source}`);
  }
}

// ── Het beeld: beginwaarden en veldnamen lopen gelijk met het blad ──────────
{
  console.log("\nBeeld tegen blad");
  const ts = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../packages/desktop/src/components/calc/TweepaalsPoerDesigner.tsx"),
    "utf8",
  );
  const blok = ts.match(/const DEFAULTS[^{]*\{([\s\S]*?)\};/)[1];
  const beeld = Object.fromEntries([...blok.matchAll(/(\w+):\s*(-?[\d.]+)/g)].map((m) => [m[1], Number(m[2])]));
  const invoer = new Set([
    ...[...tpl.matchAll(/^\s*(\w+)\s*=\s*\?/gm)].map((m) => m[1]),
    ...[...tpl.matchAll(/@select\s+(\w+)/g)].map((m) => m[1]),
  ]);
  const gezet = new Set([...ts.matchAll(/set\("(\w+)"/g)].map((m) => m[1]));
  const mis = [];
  for (const [k, x] of Object.entries(STANDAARD)) if (beeld[k] !== x) mis.push(`beginwaarde ${k}: beeld ${beeld[k]}, hier ${x}`);
  for (const k of Object.keys(beeld)) if (!(k in STANDAARD)) mis.push(`beginwaarde ${k} staat niet in de standaardinvoer`);
  for (const k of invoer) if (!(k in beeld)) mis.push(`invoerveld ${k} heeft geen beginwaarde in het beeld`);
  for (const k of gezet) if (!invoer.has(k)) mis.push(`het beeld schrijft naar ${k}, dat het blad niet kent`);
  for (const m of mis) console.log(`  FOUT   ${m}`);
  if (mis.length) fouten++;
  console.log(`  ${mis.length ? "FOUT  " : "OK    "} ${invoer.size} invoervelden, ${Object.keys(beeld).length} beginwaarden, ${gezet.size} velden die het beeld schrijft`);
}

afronden(fouten, "Tweepaals poer");
