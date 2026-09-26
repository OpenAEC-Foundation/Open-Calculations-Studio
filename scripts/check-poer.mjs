/**
 * Controlescript voor de module Tweepaals poer (NEN-EN 1992-1-1 met NB,
 * staafwerkmodel volgens §6.5 en §9.8.1).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten daarom op twee manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript: paalreacties met eigen
 *      gewicht en paalafwijking, een plastisch drukblok onder de kolom
 *      (rechthoek, of het cirkelsegment met zijn zwaartepunt op e_k, hier met
 *      een eigen bisectie op de zwaartepuntsformule, en als knoopbreedte niet
 *      meer dan de kolombreedte op e_k), het staafwerk met een
 *      hydrostatische knoop onder de kolom waarvan het verticale vlak tussen de
 *      knoophelften F_td onder de spanning van het drukblok draagt, de knopen
 *      (6.60) en (6.61),
 *      de dwarstrek in de drukdiagonaal (6.59) tegen de beugels, de
 *      verankering langs de staafas met α_5 uit de drukspreiding (9.8.1(5)) en
 *      de ombuiging (8.1), beide met de paal e_paal naar de kop van de poer
 *      (9.8.1(1)), het opgebogen einde van ten minste 5φ, dwarskracht met β
 *      (6.2.2(6)) of de beugels in 0,75 van de werkelijke a_v (6.19) en de
 *      bovengrens, scheurwijdte (7.3.4) onder de frequente combinatie met de
 *      hefboomsarm van het drukblok over de hele kolom (5.6.4(2)), A_s,min
 *      volgens de NB bij 9.2.1.1(1), de detaillering en het oordeel van de
 *      slotregel.
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
  n_langs: 6, d_langs: 32, n_sneden: 4, d_beugel: 12, s_beugel: 75,
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
    v.b_paal > 0 && n >= 1 && phi > 0 && v.s_beugel > 0 && v.F_Ed > 0 && v.F_fr >= 0 &&
    (rond || v.b_kolom > 0) && (prond || v.l_paal > 0);
  if (!geldig) return { geldig };

  // paalreacties
  const Gk = 25e-9 * (v.l_hoh + 2 * v.oversteek) * v.b_poer * v.h_poer;
  const gG = CC === 1 ? 1.2 : CC === 3 ? 1.5 : 1.35;
  const N = v.F_Ed + gG * Gk, M = Math.abs(v.M_Ed), l = v.l_hoh / 1000;
  const Mtot = M + (N * v.e_paal) / 1000;
  const R = N / 2 + Mtot / l, Rmin = N / 2 - Mtot / l;
  const UCpaal = v.R_cd > 0 ? R / v.R_cd : 0;

  // Plastisch drukblok onder de kolom met de resultante op e = M/F. Rechthoek:
  // lengte D − 2e over de breedte b. Rond: het cirkelsegment met halve
  // openingshoek α waarvan het zwaartepunt 4R·sin³α/(3(2α − sin 2α)) op e ligt;
  // dat zwaartepunt neemt af van R (α → 0) tot 0 (α = π), dus bisectie.
  const ak = rond ? (v.d_kolom * Math.sqrt(Math.PI)) / 2 : v.d_kolom;
  const Ak = rond ? (Math.PI * v.d_kolom ** 2) / 4 : v.d_kolom * v.b_kolom;
  const ek = (M * 1000) / v.F_Ed;
  const kolomDruk = 2 * ek < v.d_kolom;
  let Ablok = Ak;
  if (kolomDruk && ek > 0) {
    if (rond) {
      const Rk = v.d_kolom / 2;
      const zp = (al) => (4 * Rk * Math.sin(al) ** 3) / (3 * (2 * al - Math.sin(2 * al)));
      let lo = 1e-4, hi = Math.PI;
      for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        if (zp(mid) > ek) lo = mid; else hi = mid;
      }
      const al = (lo + hi) / 2;
      Ablok = (Rk * Rk * (2 * al - Math.sin(2 * al))) / 2;
    } else {
      Ablok = v.b_kolom * (v.d_kolom - 2 * ek);
    }
  }
  // Breedte van de knoop: bij een ronde kolom a_k, maar niet breder dan de
  // kolom op het zwaartepunt e_k van het segment (daar of dichter bij de koorde
  // ligt het scheidingsvlak tussen de knoophelften).
  const bk = rond ? (kolomDruk && ek > 0 ? Math.min(ak, 2 * Math.sqrt((v.d_kolom / 2) ** 2 - ek ** 2)) : ak) : v.b_kolom;
  const ck = Ablok / bk;

  // staafwerk: hydrostatische knoop onder de kolom. Het verticale vlak tussen de
  // knoophelften draagt F_td onder σ = F/A_blok, dus u = F_td·c_k/F; met z = d − u/2 en
  // F_td = R·a/z volgt z² − d·z + R·a·c_k/(2F) = 0.
  const a = v.l_hoh / 2 - xk;
  const q = (2 * R * a * ck) / v.F_Ed;
  const knoopPast = d * d > q;
  const z = (d + Math.sqrt(Math.max(d * d - q, 0))) / 2;
  const theta = (Math.atan(z / a) * 180) / Math.PI;
  const Ftd = (R * a) / z;
  const uk = (Ftd * ck) / v.F_Ed;
  const As = (n * Math.PI * phi ** 2) / 4;
  const AsNodig = (Ftd * 1e3) / fyd;
  const UCtrek = AsNodig / As;
  const sh = (v.b_poer - 2 * c1 - phi) / Math.max(n - 1, 1);

  // knopen
  const sEd1 = kolomDruk ? (v.F_Ed * 1e3) / Ablok : 0;
  const UCkn1 = sEd1 / (nuK * fcd);
  const Ap = prond ? (Math.PI * v.b_paal ** 2) / 4 : v.b_paal * v.l_paal;
  const ap = prond ? Math.sqrt(Ap) : v.b_paal, bp = prond ? Math.sqrt(Ap) : v.l_paal;
  const L = Math.hypot(z, a);
  const w2 = (ap * z + 2 * ys * a) / L;
  const sd = (R * 1e3 * L) / (z * w2 * Math.min(bp, v.b_poer));
  const UCkn2 = Math.max((R * 1e3) / Ap, sd) / (0.85 * nuK * fcd);

  // dwarstrek in de drukdiagonaal: T = ¼(1 − 0,7·a/h)·F (6.59) met h = L/2
  // en a de smalste kant: aan de kolomknoop w_1 = C·c_k/F (dezelfde spanning
  // als het drukblok), aan de paalknoop w_2. Beugels over de lengte a, met hun
  // component loodrecht op de diagonaal (cos θ = a/L).
  const C = (R * L) / z;
  const w1 = (C * ck) / v.F_Ed;
  const Tdw = Math.max(0.25 * (1 - (0.7 * Math.min(w1, w2)) / (L / 2)), 0) * C;
  const ndw = Math.floor(a / v.s_beugel);
  const TRddw = (ndw * v.n_sneden * (Math.PI / 4) * v.d_beugel ** 2 * fyd * (a / L)) / 1e3;
  const okDw = TRddw > 0 || Tdw <= 0;
  const UCdw = TRddw > 0 ? Tdw / TRddw : 0;

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
  const lvNodig = Math.max(lbd - l1 - (Math.PI * rb) / 2, 5 * phi);

  // dwarskracht
  // β met a_v ≥ 0,5·d; de beugels alleen in 0,75 van de werkelijke a_v.
  const av = Math.max(v.l_hoh / 2 - v.d_kolom / 2 - v.b_paal / 2, 0);
  const beta = Math.min(1, Math.max(av, 0.5 * d) / (2 * d));
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
  // In de BGT niet het plastische blok van het moment (5.6.4(2)): de
  // hefboomsarm met het drukblok over de hele kolom (c_k = a_k).
  const zFr = (d + Math.sqrt(Math.max(d * d - (2 * R * a * ak) / v.F_Ed, 0))) / 2;
  const ss = (Rfr * 1e3 * a) / (zFr * As);
  const hcef = Math.min(2.5 * ys, v.h_poer / 2);
  const rpe = As / (v.b_poer * hcef);
  const srmax = sh > 5 * (c1 + phi / 2) ? 1.3 * v.h_poer : 3.4 * c1 + (0.17 * phi) / rpe;
  const eps = Math.max((ss - ((0.4 * fctm) / rpe) * (1 + (Es / Ecm) * rpe)) / Es, (0.6 * ss) / Es);
  const wk = srmax * eps;
  // w_max: 0,3 mm bij X0–XC4 (te inspecteren), anders 0,2 mm (niet te
  // inspecteren, of XD/XS).
  const UCw = wk / (v.betonoppervlak === 1 ? 0.3 : 0.2);

  // detaillering
  // A_s,min volgens de NB bij 9.2.1.1(1): de kleinste van A_s,min1, nodig voor
  // M_E,min = W·f_ctm met een rechthoekig drukblok (x = F/(0,8·b·f_cd), arm
  // d − 0,4x), en A_s,min2 = 1,25·A_s,nodig.
  const MEmin = ((v.b_poer * v.h_poer ** 2) / 6) * fctm; // N·mm
  const Fmin = v.b_poer * fcd * (d - Math.sqrt(d * d - (2 * MEmin) / (v.b_poer * fcd)));
  const Asmin1 = Fmin / fyd;
  const Asmin = Math.min(Asmin1, 1.25 * AsNodig);
  const st = (v.b_poer - 2 * v.c_dek - v.d_beugel) / Math.max(v.n_sneden - 1, 1);
  const stMax = R > 0.5 * VRdmax ? Math.min(0.75 * d, 500) : 500;
  const det = phi >= 8 && !(n > 1 && sh - phi < Math.max(phi, 37)) && As >= Asmin && lv >= 5 * phi &&
    v.b_poer - 2 * c1 <= bp + 2 * ys && v.s_beugel <= Math.min(0.75 * d, 300) && st <= stMax;

  const UCmax = Math.max(UCpaal, UCtrek, UCkn1, UCkn2, UCdw, UCank, UCrol, UCV, UCVmax, UCw);
  const voldoet = knoopPast && okDw && det && UCmax <= 1 && Rmin >= 0 && kolomDruk;
  return {
    geldig, R, Rmin, UCpaal, ek, Ablok, ck, z, theta, Ftd, uk, UCtrek, kolomDruk, sEd1, UCkn1, UCkn2, L, C, w1, Tdw, TRddw, UCdw, okDw,
    lbrqd, a5, lbd, phim, UCrol, lbesch, lvNodig, UCank,
    av, beta, VRdc, VRds, UCV, VRdmax, UCVmax, zFr, ss, srmax, wk, UCw, Asmin1, Asmin, UCmax, knoopPast, det, voldoet,
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
    R_Ed: ruim(r.R), R_Ed_min: ruim(r.Rmin), e_k: ruim(r.ek), z: ruim(r.z), θ: ruim(r.theta), F_td: ruim(r.Ftd), u_k: ruim(r.uk),
    UC_trek: ruim(r.UCtrek), UC_kn_2: ruim(r.UCkn2), L_d: ruim(r.L), C_d: ruim(r.C), w_1: ruim(r.w1), T_dw: ruim(r.Tdw),
    T_Rd_dw: ruim(r.TRddw), l_b_rqd: ruim(r.lbrqd), α_5: ruim(r.a5),
    l_bd: ruim(r.lbd), φ_m: ruim(r.phim), UC_rol: ruim(r.UCrol), l_b_besch: ruim(r.lbesch), l_v_nodig: ruim(r.lvNodig),
    UC_ank: ruim(r.UCank), a_v: ruim(r.av), β: ruim(r.beta), V_Rd_c: ruim(r.VRdc), V_Rd_s: ruim(r.VRds), UC_V: ruim(r.UCV),
    V_Rd_max: ruim(r.VRdmax), UC_Vmax: ruim(r.UCVmax), σ_s: ruim(r.ss), s_r_max: ruim(r.srmax), w_k: ruim(r.wk),
    UC_w: ruim(r.UCw), A_s_min1: ruim(r.Asmin1), A_s_min: ruim(r.Asmin), UC_max: ruim(r.UCmax),
  };
  // Zonder beugels langs de diagonaal staat UC_dw niet als getal in het blad.
  if (r.TRddw > 0) uit.UC_dw = ruim(r.UCdw);
  // c_k staat altijd in het blad, het drukblok A_blok alleen bij een moment zonder
  // trek in de kolomvoet.
  uit.c_k = ruim(r.ck);
  if (r.kolomDruk && r.ek > 0) Object.assign(uit, { A_blok: ruim(r.Ablok), z_fr: ruim(r.zFr) });
  // Zonder draagvermogen staat UC_paal niet als getal in het blad; bij trek in
  // de kolomvoet de knoop onder de kolom niet.
  if (v.R_cd > 0) uit.UC_paal = ruim(r.UCpaal);
  if (r.kolomDruk) Object.assign(uit, { σ_Ed_1: ruim(r.sEd1), UC_kn_1: ruim(r.UCkn1) });
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
    // x_k = 2·500/(3π) = 106,1; a = 800 − 106,1 = 693,9. Geen moment: c_k = a_k.
    // Hydrostatische knoop: 2·R·a·c_k/F = 2·2059,2·693,9·443,1/3600 = 351 755;
    // d² − 351 755 = 1 361 889 − 351 755 = 1 010 134 → z = (1167 + 1005,05)/2 = 1086,0 mm;
    // θ = atan(1086,0/693,9) = 57,42°. F_td = 2059,2·693,9/1086,0 = 1315,7 kN;
    // u = 1315,7·443,1/3600 = 161,9 mm (en inderdaad 1167 − 161,9/2 = 1086,0).
    // A_s,nodig = 1315,7e3/434,8 = 3026 mm² tegen 6·804,2 = 4825 mm²: UC_trek = 0,627.
    // (Met de oude, alleen geometrische knoop z = 1096,9 was het vlak tussen de knoophelften
    // 2·R/A_k = 20,97 N/mm² > 20,07 belast, terwijl alleen het vlak onder de kolom werd getoetst.)
    // Knoop onder de kolom: σ = 3600e3/196 350 = 18,33 tegen 0,86·23,33 = 20,07: UC 0,914.
    // Knoop boven de paal: σ_p = 2059,2e3/202 500 = 10,17; L_d = √(z² + a²) = 1288,8;
    // w_2 = (450·1086,0 + 166·693,9)/1288,8 = 468,6; σ_d = 2059,2e3·1288,8/(1086,0·468,6·450)
    // = 11,59 tegen 0,85·20,07 = 17,06: UC 0,679.
    // Dwarstrek (6.59): C_d = 2059,2·1288,8/1086,0 = 2443,6 kN; w_1 = C_d·c_k/F
    // = 2443,6·443,1/3600 = 300,8 mm < w_2; h = 1288,8/2 = 644,4;
    // T = ¼·(1 − 0,7·300,8/644,4)·2443,6 = ¼·0,6733·2443,6 = 411,3 kN. Beugels: 693,9/75 → 9,
    // 9·4·113,1·434,8·(693,9/1288,8) = 1770,2·0,5384 = 953,1 kN → UC_dw = 0,4315.
    // Verankering: f_bd = 2,25·1,498 = 3,370; σ_sd = 1315,7e3/4825 = 272,6;
    // l_b,rqd = 32/4·272,6/3,370 = 647,2; p = 2059,2e3/616² = 5,427 → α_5 = 0,783;
    // c_d = (86,8 − 32)/2 = 27,4 < 3φ → α_1 = 1; l_bd = 0,783·647,2 = 506,7 (> l_b,min 320).
    // Ombuiging: F_bt = 1315,7/6 = 219,3 kN; a_b = min(86,8/2; 67 + 16) = 43,4;
    // φ_m = 219 300·(1/43,4 + 1/64)/23,33 = 363,4 mm (> 5φ = 160). De paal staat
    // e = 100 mm naar de kop (9.8.1(1)): o_min = 400 − 100 = 300; UC_rol = (181,7 + 32)/245 = 0,872.
    // r_b = 197,7; l_1 = 300 + 225 − 55 − 181,7 − 32 = 256,3; l_v = 1250 − 55 − 83 − 197,7 = 914,3;
    // l_b,besch = 256,3 + π·197,7/2 + 914,3 = 1481,2 → UC_ank = 506,7/1481,2 = 0,342.
    // Het opgebogen einde: l_bd − l_1 − π·r_b/2 < 0, dus ten minste 5φ = 160 mm (figuur 8.1).
    // Dwarskracht: a_v = 800 − 250 − 225 = 325 < 0,5·1167 → β = 583,5/2334 = 0,25; k = 1,414;
    // ρ_l = 0,006892; v_Rd,c = 0,12·1,414·(24,12)^(1/3) = 0,4903 → V_Rd,c = 343,3 kN;
    // beugels alleen in 0,75·325 = 243,8 mm: 3 stuks Ø12-75 met 4 sneden →
    // V_Rd,s = 3·4·113,1·434,8 = 590,1 kN; UC_V = 0,25·2059,2/590,1 = 0,872;
    // V_Rd,max = 0,5·0,6·0,86·23,33·600·0,9·1167 = 3794 kN → UC 0,543.
    // Scheurwijdte: R_fr = 2545/2 + 254,5/1,6 = 1431,6 kN; σ_s = 1431,6e3·693,9/(1086,0·4825)
    // = 189,5; h_c,ef = 2,5·83 = 207,5; ρ_p,eff = 0,03876; s_r,max = 3,4·67 + 0,17·32/0,03876
    // = 368,2; E_cm = 34 078, α_e = 5,869; ε = (189,5 − 0,4·3,210/0,03876·1,2275)/200 000
    // = 7,44e-4; w_k = 0,274 mm → UC_w = 0,914.
    // A_s,min (NB bij 9.2.1.1(1)): M_E,min = 600·1250²/6·3,210 = 501,6 kNm;
    // 2·M/(b·f_cd) = 1003,1e6/14 000 = 71 650 → A_s,min1 = 14 000·(1167 − √1 290 239)/434,8
    // = 14 000·31,1/434,8 = 1002 mm²; A_s,min2 = 1,25·3026 = 3783 → A_s,min = 1002 < 4825.
    // ((9.1N) zou 0,26·3,210/500·600·1167 = 1169 mm² geven.)
    // Maatgevend: de knoop onder de kolom, UC 0,914 → voldoet (de scheurwijdte ligt er net onder).
    handwerk: {
      f_cd: "23.33", ν_k: "0.86", G_k: "45.0", M_tot: "366.1", R_Ed: "2059", UC_paal: "0.858",
      d: "1167", a_k: "443.1", x_k: "106.1", a: "693.9", z: "1086", θ: "57.42", F_td: "1316", u_k: "161.9",
      A_s_nodig: "3026", UC_trek: "0.627", σ_Ed_1: "18.33", σ_Rd_1: "20.07", UC_kn_1: "0.914", σ_p: "10.17",
      w_2: "468.6", σ_d: "11.59", UC_kn_2: "0.679", L_d: "1289", C_d: "2444", w_1: "300.8", T_dw: "411.3",
      n_dw: "9", T_Rd_dw: "953.1", UC_dw: "0.4315",
      f_bd: "3.370", l_b_rqd: "647.2", α_5: "0.783", l_bd: "506.7", φ_m_bet: "363.4", o_min: "300", UC_rol: "0.872",
      l_b_besch: "1481", UC_ank: "0.342", l_v_nodig: "160", a_v: "325", β: "0.25", n_bg: "3", V_Rd_c: "343.3",
      V_Rd_s: "590.1", UC_V: "0.872", V_Rd_max: "3794", s_t: "159.3",
      σ_s: "189.5", s_r_max: "368.2", w_k: "0.274", UC_w: "0.914", M_E_min: "501.6", A_s_min1: "1002", A_s_min: "1002",
      UC_max: "0.914",
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
    // x_k = 500/4 = 125, a = 675; e_k = 400/3600 = 111,1 mm < 250;
    // drukblok 400·(500 − 222,2) = 111 111 mm² → σ_Ed,1 = 3600e3/111 111 = 32,40 N/mm²
    // tegen 20,07 → UC 1,615: voldoet niet. (Met twee gelijk belaste kolomhelften
    // zou dat 2·(1800 + 250)e3/200 000 = 20,50 zijn: te gunstig, het moment komt
    // dan maar voor 2·x_k/l = 16 % in de kolomvoet terecht.)
    // Knoop: c_k = 277,8; R_Ed = 3660,75/2 + (400 + 366,1)/1,6 = 2309,2 kN;
    // 2·2309,2·675·277,8/3600 = 240 540 → z = (1167 + √1 121 349)/2 = (1167 + 1058,9)/2 = 1113,0.
    // Paal: A_p = π/4·450² = 159 043 mm², a_p = √A_p = 398,8 mm.
    handwerk: {
      x_k: "125.0", a: "675.0", e_k: "111.1", c_k: "277.8", A_blok: "111100", R_Ed: "2309", z: "1113",
      σ_Ed_1: "32.40", UC_kn_1: "1.615", A_p: "159000", a_p: "398.8",
    },
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
    naam: "8 — lage, lange poer: de knoop onder de kolom past niet (d² ≤ 2·R_Ed·a·c_k/F_Ed)",
    invoer: { h_poer: 700, l_hoh: 2400, oversteek: 600 },
    // d = 617; a = 1200 − 106,1 = 1093,9; G_k = 25·3,6·0,6·0,7 = 37,8 → R_Ed = 3651,0/2 + 365,1/1,6
    // = 1977,7 kN; 2·1977,7·1093,9·443,1/3600 = 532 580 > 617² = 380 689.
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
    naam: "10 — betonoppervlak niet te inspecteren: w_max = 0,2 mm",
    invoer: { betonoppervlak: 2 },
    // w_k = 0,2741 mm (set 1) → UC_w = 0,2741/0,2 = 1,370.
    handwerk: { w_max: "0.2", UC_w: "1.370" },
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
    // G_k = 25·2,1·0,6·1,25 = 39,4 → R_Ed = 3653,2/2 + 365,3/1,6 = 2054,9 kN; z = 1086,2;
    // F_td = 2054,9·693,9/1086,2 = 1312,7 → F_bt = 218,8 kN → φ_m = 218 800·0,03867/23,33 = 362,6;
    // met de paalafwijking o_min = 250 − 100 = 150 → (181,3 + 32)/(150 − 55) = 2,245.
    handwerk: { UC_rol: "2.245" },
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
  {
    naam: "18 — rechthoekige kolom 450×350 op ronde palen Ø380, korte a_v, C30/37, 4Ø25, M_Ed = 60 kNm",
    invoer: {
      kolomvorm: 2, d_kolom: 450, b_kolom: 350, paalvorm: 2, b_paal: 380, l_hoh: 1300, b_poer: 550, h_poer: 950,
      oversteek: 380, e_paal: 50, betonklasse: 30, c_dek: 50, n_langs: 4, d_langs: 25, n_sneden: 2, d_beugel: 10,
      s_beugel: 100, F_Ed: 2100, M_Ed: 60, F_fr: 1500, R_cd: 1300,
    },
    // Met de hand: f_cd = 20,00; ν′ = 0,88; f_ctm = 2,897; f_ctd = 1,352; E_cm = 32 837.
    // G_k = 25·2,06·0,55·0,95 = 26,91 kN; N = 2100 + 1,35·26,91 = 2136,3 kN;
    // M_tot = 60 + 2136,3·0,05 = 166,8 kNm; R_Ed = 1068,2 + 128,3 = 1196,5 kN → UC_paal 0,920.
    // y_s = 50 + 10 + 12,5 = 72,5; d = 877,5; a_k = 450, x_k = 112,5, a = 537,5;
    // kolom: e_k = 60/2100 = 28,57 mm → c_k = 450 − 57,14 = 392,86; A_blok = 350·392,86 = 137 500 mm².
    // 2·1196,5·537,5·392,86/2100 = 240 619 → z = (877,5 + √(770 006 − 240 619))/2 = (877,5 + 727,6)/2
    // = 802,5; θ = 56,19°; F_td = 1196,5·537,5/802,5 = 801,3 kN; u = 801,3·392,86/2100 = 149,9;
    // A_s,nodig = 1843 tegen 1963 mm² → UC_trek 0,939.
    // Kolom: σ = 2100e3/137 500 = 15,27 tegen 17,60: UC 0,868.
    // Paal: A_p = 113 411, a_p = 336,8; L_d = 965,9; w_2 = (336,8·802,5 + 145·537,5)/965,9 = 360,5;
    // σ_d = 11,86 tegen 0,85·17,6 = 14,96: UC 0,793.
    // Dwarstrek: C_d = 1196,5·965,9/802,5 = 1440,0; w_1 = 1440,0·392,86/2100 = 269,4 < w_2;
    // T = ¼·(1 − 0,7·269,4/483,0)·1440,0 = 219,4 kN; 537,5/100 → 5 beugels, 2 sneden Ø10:
    // 5·2·78,54·434,8·(537,5/965,9) = 190,0 kN → UC_dw = 1,155: voldoet niet.
    // Verankering: σ_sd = 408,1; l_b,rqd = 25/4·408,1/3,041 = 838,7; p = 5,155 → α_5 = 0,794;
    // l_bd = 665,8. φ_m = 200,3e3·(1/67,5 + 1/50)/20 = 348,7 (> 5φ = 125); o_min = 330;
    // UC_rol = (174,4 + 25)/280 = 0,712; l_1 = 249,0, r_b = 186,9, l_v = 640,6, l_b,besch = 1183 → UC_ank 0,563.
    // Dwarskracht: a_v = 650 − 225 − 190 = 235 mm < 0,5·d → β = 0,25; V_Rd,c = 0,4082·550·877,5 = 197,0 kN;
    // in 0,75·235 = 176 mm past één beugel: V_Rd,s = 1·2·78,54·434,8 = 68,3 kN → UC_V = 0,25·1196,5/197,0 = 1,518.
    // Scheurwijdte met het drukblok over de hele kolom (5.6.4(2)): 2·1196,5·537,5·450/2100 = 275 622
    // → z_fr = (877,5 + √494 384)/2 = (877,5 + 703,1)/2 = 790,3; R_fr = 763,5 + 104,9 = 868,3;
    // σ_s = 868,3e3·537,5/(790,3·1963,5) = 300,8; s_r,max = 3,4·60 + 0,17·25/0,01970 = 419,8;
    // ε = (300,8 − 0,4·2,897/0,01970·1,120)/200 000 = 1,174e-3 → w_k = 0,493 mm → UC_w 1,643 (maatgevend).
    // (Met z = 802,5 van het plastische blok zou σ_s = 296,2 zijn.)
    // A_s,min: M_E,min = 550·950²/6·2,897 = 239,6 kNm → A_s,min1 = 11 000·(877,5 − 852,3)/434,8 = 637 mm².
    handwerk: {
      G_k: "26.91", R_Ed: "1196", UC_paal: "0.920", c_k: "392.9", A_blok: "137500", z: "802.5", θ: "56.19",
      F_td: "801.3", u_k: "149.9", UC_trek: "0.939",
      e_k: "28.57", σ_Ed_1: "15.27", UC_kn_1: "0.868", w_2: "360.5", σ_d: "11.86", UC_kn_2: "0.793",
      C_d: "1440", w_1: "269.4", T_dw: "219.4", n_dw: "5", T_Rd_dw: "190.0", UC_dw: "1.155",
      l_b_rqd: "838.7", α_5: "0.794", l_bd: "665.8", φ_m: "348.7", UC_rol: "0.712", l_b_besch: "1183", UC_ank: "0.563",
      a_v: "235", β: "0.25", V_Rd_c: "197.0", n_bg: "1", V_Rd_s: "68.3", UC_V: "1.518",
      z_fr: "790.3", σ_s: "300.8", s_r_max: "419.8", w_k: "0.493", UC_w: "1.643", A_s_min1: "637", UC_max: "1.643",
    },
  },
  {
    naam: "19 — groot kolommoment zonder trekpaal: de kolomvoet krijgt trek, de knoop is niet getoetst",
    invoer: { M_Ed: 900, R_cd: 0 },
    // e_k = 900/3600 = 250 mm ≥ d_kolom/2 = 250 mm. R_Ed,min = 1830,4 − (900 + 366,1)/1,6 = 1039 kN > 0.
    handwerk: { e_k: "250.0", R_Ed_min: "1039" },
    melding: /kolomwapening krijgt trek/,
  },
  {
    naam: "20 — lage poer met Ø40: het opgebogen einde past niet in de hoogte (l_v < 5φ)",
    invoer: { h_poer: 600, l_hoh: 1000, oversteek: 600, n_langs: 3, d_langs: 40, R_cd: 0 },
    melding: /past niet in de hoogte/,
  },
  {
    naam: "21 — ronde kolom Ø800 met M_Ed = 840 kNm: het drukblok is een cirkelsegment",
    invoer: {
      d_kolom: 800, b_poer: 900, b_paal: 600, l_paal: 600, l_hoh: 2200, h_poer: 1500, oversteek: 550, e_paal: 50,
      n_langs: 8, F_Ed: 4200, M_Ed: 840, F_fr: 2400, R_cd: 0,
    },
    // e_k = 840/4200 = 200 mm = R/2. Segment met halve openingshoek α: zwaartepunt
    // 4R·sin³α/(3(2α − sin 2α)) = R/2 → sin³α/(α − sin α·cos α) = 0,75.
    // α = 82,0°: 0,97107/1,29335 = 0,7508; α = 82,1°: 0,97178/1,29677 = 0,7494 → α = 82,06°
    // (1,43217 rad), sin α·cos α = ½·sin 164,12° = 0,13687 → A = 400²·(1,43217 − 0,13687)
    // = 160 000·1,29530 = 207 250 mm². σ = 4200e3/207 250 = 20,27 tegen 20,07 → UC 1,010: voldoet niet.
    // Als vierkant a_k = 709,0 met lengte a_k − 2e = 309,0 zou het blok 219 060 mm² zijn:
    // σ = 19,17, UC 0,955, en de poer zou ten onrechte voldoen.
    // Knoopbreedte: de kolom is op e_k 2·√(400² − 200²) = 692,8 < a_k breed → b_k = 692,8;
    // c_k = 207 250/692,8 = 299,1 mm.
    handwerk: {
      e_k: "200.0", A_blok: { waarde: "207250", tol: 60, waarom: "het blad drukt 4 cijfers af" }, b_k: "692.8", c_k: "299.1",
      σ_Ed_1: "20.27", UC_kn_1: "1.010",
    },
  },
  {
    naam: "22 — lichte last: A_s,min volgens de NB is 1,25·A_s,nodig, kleiner dan (9.1N)",
    invoer: {
      d_kolom: 400, b_paal: 350, l_paal: 350, b_poer: 550, h_poer: 800, l_hoh: 1400, oversteek: 350, e_paal: 50,
      n_langs: 3, d_langs: 16, n_sneden: 2, d_beugel: 10, s_beugel: 150, F_Ed: 350, F_fr: 140, R_cd: 0,
    },
    // G_k = 25·2,1·0,55·0,8 = 23,10 kN; N = 350 + 31,19 = 381,2; M_tot = 19,06; R_Ed = 190,6 + 13,6 = 204,2 kN.
    // y_s = 73, d = 727; a_k = 354,5, x_k = 84,9, a = 615,1; 2·204,2·615,1·354,5/350 = 254 450
    // → z = (727 + √274 080)/2 = (727 + 523,5)/2 = 625,3; F_td = 204,2·615,1/625,3 = 200,9 kN;
    // A_s,nodig = 462,1 mm² tegen 3·201,1 = 603,2 mm².
    // M_E,min = 550·800²/6·3,210 = 188,3 kNm; 2·M/(b·f_cd) = 376,6e6/12 833 = 29 350
    // → A_s,min1 = 12 833·(727 − 706,5)/434,8 = 604 mm²; A_s,min2 = 1,25·462,1 = 577,6
    // → A_s,min = 577,6 ≤ 603,2: voldoet. (9.1N) gaf 0,001669·550·727 = 667 mm²: voldeed niet.
    handwerk: { R_Ed: "204.2", z: "625.3", F_td: "200.9", A_s_nodig: "462.1", M_E_min: "188.3", A_s_min1: "604", A_s_min: "577.6" },
  },
  {
    naam: "23 — weinig beugels (Ø8-250, 2 sneden): de dwarstrek in de diagonaal is maatgevend",
    invoer: { n_sneden: 2, d_beugel: 8, s_beugel: 250 },
    // y_s = 55 + 8 + 16 = 79, d = 1171; 2·R·a·c_k/F = 351 754 (als set 1) → z = (1171 + √1 019 487)/2
    // = (1171 + 1009,7)/2 = 1090,4; L_d = √(1090,4² + 693,9²) = 1292,4; C_d = 2059,2·1292,4/1090,4 = 2440,8;
    // w_1 = 2440,8·443,1/3600 = 300,4 < w_2 = (450·1090,4 + 158·693,9)/1292,4 = 464,5;
    // T = ¼·(1 − 0,7·300,4/646,2)·2440,8 = 411,6 kN. 693,9/250 → 2 beugels:
    // 2·2·50,27·434,8·(693,9/1292,4) = 46,93 kN → UC_dw = 8,77 (de dwarskracht geeft 1,50).
    handwerk: { z: "1090", w_1: "300.4", w_2: "464.5", T_dw: "411.6", n_dw: "2", T_Rd_dw: "46.93", UC_dw: "8.77" },
    melding: /\(dwarstrek, drukdiagonaal\) > 1,0/,
  },
  {
    naam: "24 — beugelafstand groter dan de diagonaal: er kruisen geen beugels de diagonaal",
    invoer: { s_beugel: 800, R_cd: 0 },
    // 693,9/800 → 0 beugels: T_Rd = 0 → de dwarstrek wordt niet opgenomen, de poer voldoet niet.
    handwerk: { n_dw: "0", T_Rd_dw: "0" },
    melding: /geen beugels nemen de dwarstrek/,
  },
  {
    naam: "25 — milieuklasse XD of XS: w_max = 0,2 mm (tabel 7.1N, NB)",
    invoer: { betonoppervlak: 3 },
    // w_k = 0,2741 mm (set 1) → UC_w = 1,370.
    handwerk: { w_max: "0.2", UC_w: "1.370" },
  },
  {
    naam: "26 — geen kolomlast (F_Ed = 0): invoer onvolledig",
    invoer: { F_Ed: 0 },
    melding: /invoer onvolledig/,
  },
  {
    naam: "27 — kolom 500×500 met M_Ed = 300 kNm: de scheurwijdte met de hefboomsarm over de hele kolom (5.6.4(2))",
    invoer: { kolomvorm: 2, b_kolom: 500, h_poer: 1000, F_Ed: 3000, M_Ed: 300, F_fr: 1800, R_cd: 0 },
    // G_k = 25·2,4·0,6·1,0 = 36,0; N = 3048,6; M_tot = 300 + 304,9 = 604,9 → R_Ed = 1524,3 + 378,0 = 1902,3 kN.
    // d = 917, x_k = 125, a = 675; e_k = 100 → c_k = 300, σ = 3000e3/150 000 = 20,00 → UC_kn,1 0,997.
    // UGT: 2·1902,3·675·300/3000 = 256 810 → z = (917 + √584 079)/2 = (917 + 764,2)/2 = 840,6.
    // BGT: 2·1902,3·675·500/3000 = 428 018 → z_fr = (917 + √412 871)/2 = (917 + 642,5)/2 = 779,8.
    // R_fr = 1836/2 + (300 + 183,6)/1,6 = 918 + 302,3 = 1220,3 kN; σ_s = 1220,3e3·675/(779,8·4825) = 218,9;
    // ε = (218,9 − 0,4·3,210/0,03876·1,2275)/200 000 = 8,91e-4 → w_k = 368,2·8,91e-4 = 0,328 → UC_w 1,094.
    // Met z = 840,6 van het plastische blok zou UC_w 0,996 zijn en de poer ten onrechte voldoen.
    handwerk: { z: "840.6", z_fr: "779.8", σ_s: "218.9", w_k: "0.328", UC_w: "1.094", UC_kn_1: "0.997" },
    melding: /\(scheurwijdte\) > 1,0/,
  },
  {
    naam: "28 — ronde kolom Ø500, F_Ed = 400 kN met M_Ed = 80 kNm: smal segment, de knoop is smaller dan a_k",
    invoer: { F_Ed: 400, M_Ed: 80, F_fr: 300, R_cd: 0 },
    // e_k = 200 mm = 0,8·R. Segment: α = 48,47°, sin α = 0,7486, sin³α = 0,4194, sin α·cos α = 0,4963
    // → 0,4194/(0,8459 − 0,4963) = 1,200 = 1,5·0,8 → A = 250²·0,3495 = 21 846 mm²; σ = 18,31 → UC 0,912.
    // De kolom is op e_k maar 2·√(250² − 200²) = 300 mm breed (a_k = 443,1): b_k = 300, c_k = 72,82.
    // R_Ed = 460,75/2 + (80 + 46,08)/1,6 = 309,2 kN; 2·309,2·693,9·72,82/400 = 78 112
    // → z = (1167 + √1 283 777)/2 = (1167 + 1133,0)/2 = 1150,0; u = 186,5·72,82/400 = 33,96 mm.
    // Met de breedte a_k zou u = 22,9 mm zijn en het vlak tussen de knoophelften tot ~1,5× σ krijgen.
    handwerk: {
      e_k: "200.0", A_blok: { waarde: "21846", tol: 6, waarom: "het blad drukt 4 cijfers af" }, b_k: "300.0",
      c_k: "72.82", σ_Ed_1: "18.31", UC_kn_1: "0.9125", z: "1150", u_k: "33.96",
    },
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
