/**
 * Controlescript voor de module Poer (templates/tweepaalsPoer.ts): een poer op
 * twee, drie of vier palen (NEN-EN 1992-1-1 met NB, staafwerkmodel volgens
 * §6.5 en §9.8.1) of op staal (NEN 9997-1 6.5 en NEN-EN 1992-1-1 §6.2, §6.4,
 * §9.8.2).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten daarom op twee manieren na. Voor de tweepaals poer (de eerste
 * keuze van `poertype`, en het gedrag van elk blad van vóór die keuze):
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
 * Voor de drie- en vierpaals poer en de poer op staal net zo, met eigen
 * rekenwegen die bewust anders lopen dan het blad:
 *
 *   • drie en vier palen — de paalreacties voor elke paal bij beide tekens van
 *     de momenten en 720 richtingen van de paalafwijking; de vrije afstand
 *     tussen kolom en paal door de randen te bemonsteren; de hefboomsarm door
 *     iteratie op z = d − u/2 in plaats van de wortelformule; de kolomknoop als
 *     zwaartepunt van een cirkelsector; W van de controle-omtrek door
 *     numerieke integratie. Verder knopen, verankering, dwarskracht over de
 *     volle breedte, pons rond kolom en paal, scheurwijdte en A_s,min.
 *   • poer op staal — het draagvermogen met de formules van NEN 9997-1 in
 *     radialen, de grondspanning als functie van x en de momenten, de
 *     dwarskracht en de verankeringskracht (9.13) door numerieke integratie
 *     (Simpson), de ongunstigste ponsomtrek door een fijne scan over a; op
 *     trek het evenwicht (2.8), de buiging bovenin, dwarskracht en pons.
 *
 * Voor de standaardinvoer met vier en drie palen, voor een vierpaals poer met
 * diagonalen en momenten, en voor een centrische, een excentrische (met en
 * zonder kier), een horizontaal belaste en een op trek belaste poer op staal
 * een handberekening in het commentaar bij de set.
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
  poertype: 2, kolomvorm: 1, paalvorm: 1, d_kolom: 500, b_kolom: 500, b_paal: 450, l_paal: 450,
  b_poer: 600, h_poer: 1250, l_hoh: 1600, oversteek: 400, e_paal: 100,
  betonklasse: 35, betonstaal: 2, betonoppervlak: 1, c_dek: 55,
  n_langs: 6, d_langs: 32, n_sneden: 4, d_beugel: 12, s_beugel: 75,
  F_Ed: 3600, M_Ed: 0, F_fr: 2500, R_cd: 2400,
  l_hoh_y: 1600, M_Ed_y: 0, trekbanden: 1, haarspelden: 0,
  B_x: 2400, B_y: 2400, D_aanleg: 1500, belasting_staal: 1, afwijking: 1,
  phi_k: 30, c_eff_k: 0, gamma_k: 18, gamma_sat: 20, grondwater: 1,
  s_langs: 150, d_boven: 16, s_boven: 150, H_Ed: 0, phi_cv_k: 30, factoren: 1,
};

/** Een poer op staal voor de sets hieronder: 2400 × 2400 × 600 op 1 m, kolom 400 × 400, Ø16-150, C30/37. */
const STAAL = {
  poertype: 1, kolomvorm: 2, d_kolom: 400, b_kolom: 400, B_x: 2400, B_y: 2400, h_poer: 600, D_aanleg: 1000,
  betonklasse: 30, c_dek: 50, d_langs: 16, s_langs: 150, F_Ed: 1500,
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

// ── Onafhankelijke uitwerking, drie- en vierpaals poer; N en mm, lasten in kN ──
function uitwerking34(v, CC = 2) {
  const drie = v.poertype === 3;
  const fck = v.betonklasse, fcd = fck / 1.5, fctm = 0.3 * fck ** (2 / 3), fctd = (0.7 * fctm) / 1.5;
  const fyd = 500 / 1.15, nuK = 1 - fck / 250;
  const Ecm = 22000 * ((fck + 8) / 10) ** 0.3, Es = 200000;
  const rondK = v.kolomvorm === 1, rondP = v.paalvorm === 2;
  const cxK = v.d_kolom, cyK = rondK ? v.d_kolom : v.b_kolom;
  const pxP = v.b_paal, pyP = rondP ? v.b_paal : v.l_paal;
  const s = v.l_hoh, ly = v.l_hoh_y, o = v.oversteek, e = v.e_paal, h = v.h_poer;
  const phi = v.d_langs, n = v.n_langs, c = v.c_dek;
  const r = s / Math.sqrt(3);
  // Paalharten (x, y) t.o.v. het kolomhart.
  const palen = drie ? [[-s / 2, -r / 2], [s / 2, -r / 2], [0, r]] : [[-s / 2, -ly / 2], [s / 2, -ly / 2], [s / 2, ly / 2], [-s / 2, ly / 2]];

  // Vrije afstand kolom–paal: numeriek, door de randen te bemonsteren.
  const rand = (rond, bx, by, x0, y0) => {
    const pt = [];
    if (rond) for (let i = 0; i < 1440; i++) { const t = (2 * Math.PI * i) / 1440; pt.push([x0 + (bx / 2) * Math.cos(t), y0 + (bx / 2) * Math.sin(t)]); }
    else {
      const m = 400;
      for (let i = 0; i <= m; i++) {
        const f = i / m;
        pt.push([x0 - bx / 2 + f * bx, y0 - by / 2], [x0 - bx / 2 + f * bx, y0 + by / 2], [x0 - bx / 2, y0 - by / 2 + f * by], [x0 + bx / 2, y0 - by / 2 + f * by]);
      }
    }
    return pt;
  };
  const kolRand = rand(rondK, cxK, cyK, 0, 0);
  let apk = Infinity;
  for (const [X, Y] of palen) {
    const pr = rand(rondP, pxP, pyP, X, Y);
    for (const [a1, b1] of kolRand) for (const [a2, b2] of pr) apk = Math.min(apk, Math.hypot(a1 - a2, b1 - b2));
  }
  const geldig = h > c + 2 * phi && apk > 1 && s > Math.max(pxP, pyP) && (drie || ly > Math.max(pxP, pyP)) && e >= 0 && c >= 0 &&
    o > c + e && o >= Math.max(pxP, pyP) / 2 && n >= 1 && phi > 0 && v.F_Ed > 0 && v.F_fr >= 0 && cxK > 0 && cyK > 0;
  if (!geldig) return { geldig };

  // Paalreacties van een stijve poer, de zwaarste en de lichtste over alle
  // tekens van de momenten en alle richtingen van de paalafwijking.
  const Apoer = drie ? (Math.sqrt(3) / 4) * s * s + 3 * s * o + 2 * Math.sqrt(3) * o * o : (s + 2 * o) * (ly + 2 * o); // mm²
  const Gk = 25e-9 * Apoer * h;
  const gG = CC === 1 ? 1.2 : CC === 3 ? 1.5 : 1.35;
  const N = v.F_Ed + gG * Gk;
  const Sxx = palen.reduce((t, p) => t + p[0] ** 2, 0), Syy = palen.reduce((t, p) => t + p[1] ** 2, 0);
  const reacties = (NN) => {
    let max = -Infinity, min = Infinity;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (let k = 0; k < 720; k++) {
      const t = (2 * Math.PI * k) / 720;
      const Mx = sx * Math.abs(v.M_Ed) * 1000 + NN * e * Math.cos(t), My = sy * Math.abs(v.M_Ed_y) * 1000 + NN * e * Math.sin(t); // kN·mm
      for (const [x, y] of palen) {
        const R = NN / palen.length + (Mx * x) / Sxx + (My * y) / Syy;
        max = Math.max(max, R); min = Math.min(min, R);
      }
    }
    return [max, min];
  };
  const [R, Rmin] = reacties(N);
  const UCpaal = v.R_cd > 0 ? R / v.R_cd : 0;

  // Staafwerk
  const ys = c + phi, d = h - ys;
  const ak = rondK ? (v.d_kolom * Math.sqrt(Math.PI)) / 2 : 0;
  const Ak = rondK ? (Math.PI * v.d_kolom ** 2) / 4 : cxK * cyK;
  // Kolomknoop: zwaartepunt van een kwart kolom (vier palen) of een sector van
  // 120° (drie palen; bij een rechthoekige kolom van de ingeschreven cirkel).
  const sectorZp = (Rr, halveHoek) => (2 * Rr * Math.sin(halveHoek)) / (3 * halveHoek);
  let xk, yk;
  if (drie) { xk = sectorZp(Math.min(cxK, cyK) / 2, Math.PI / 3); yk = xk; }
  else if (rondK) { xk = sectorZp(v.d_kolom / 2, Math.PI / 4) / Math.SQRT2; yk = xk; }
  else { xk = cxK / 4; yk = cyK / 4; }
  const ex = (Math.abs(v.M_Ed) * 1000) / v.F_Ed, ey = (Math.abs(v.M_Ed_y) * 1000) / v.F_Ed;
  let Ablok = Ak, ckx = rondK ? ak : cxK, cky = rondK ? ak : cyK, kolomDruk;
  if (rondK) {
    const ek = Math.hypot(ex, ey);
    kolomDruk = 2 * ek < v.d_kolom;
    if (kolomDruk && ek > 0) {
      const Rk = v.d_kolom / 2;
      const zp = (al) => (4 * Rk * Math.sin(al) ** 3) / (3 * (2 * al - Math.sin(2 * al)));
      let lo = 1e-4, hi = Math.PI;
      for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (zp(mid) > ek) lo = mid; else hi = mid; }
      const al = (lo + hi) / 2;
      Ablok = (Rk * Rk * (2 * al - Math.sin(2 * al))) / 2;
      const bk = Math.min(ak, 2 * Math.sqrt(Rk * Rk - ek * ek));
      ckx = cky = Math.max(bk, Ablok / bk);
    }
  } else {
    kolomDruk = 2 * ex < cxK && 2 * ey < cyK;
    if (kolomDruk && ex + ey > 0) { ckx = cxK - 2 * ex; cky = cyK - 2 * ey; Ablok = ckx * cky; }
  }
  const ax = drie ? 0 : s / 2 - xk, ay = drie ? 0 : ly / 2 - yk;
  const a = drie ? r - xk : Math.hypot(ax, ay);
  // Hefboomsarm door iteratie: z = d − u/2 met u = (horizontale kracht door
  // het zwaarste vlak)·c/F, vanaf z = d.
  const Hvlak = (z) => drie ? Math.max((R * a) / z * cky, ((Math.sqrt(3) / 2) * R * a) / z * ckx) : Math.max(((2 * R * ax) / z) * ckx, ((2 * R * ay) / z) * cky);
  const q = Hvlak(1) / v.F_Ed; // u·z
  const knoopPast = d * d > 2 * q;
  let z = d;
  for (let i = 0; i < 500 && knoopPast; i++) z = d - Hvlak(z) / v.F_Ed / 2;
  if (!knoopPast) z = d / 2;
  const L = Math.hypot(z, a);
  const C = (R * L) / z;
  let Ftd, Ftdx = 0, Ftdy = 0;
  const diag = !drie && v.trekbanden === 2;
  if (drie) Ftd = (R * a) / z / (2 * Math.cos(Math.PI / 6));
  else if (!diag) { Ftdx = (R * ax) / z; Ftdy = (R * ay) / z; Ftd = Math.max(Ftdx, Ftdy); }
  else Ftd = (R * a) / z;
  const As = (n * Math.PI * phi ** 2) / 4;
  const AsNodig = (Ftd * 1e3) / fyd;
  const UCtrek = AsNodig / As;

  // Knopen
  const sEd1 = kolomDruk ? (v.F_Ed * 1e3) / Ablok : 0;
  const UCkn1 = sEd1 / (nuK * fcd);
  const Ap = rondP ? (Math.PI * v.b_paal ** 2) / 4 : pxP * pyP;
  const ap = rondP ? Math.sqrt(Ap) : Math.min(pxP, pyP);
  const w2 = ap * (z / L) + 2 * ys * (a / L);
  const sd = (C * 1e3) / (w2 * ap);
  // Boven de paal: bij drie palen en bij banden langs de randen zijn trekbanden
  // in twee richtingen verankerd, (6.62) met k_3 = 0,75; over de diagonalen één
  // band, (6.61) met k_2 = 0,85 — volgens de NB alleen met haarspelden
  // loodrecht op het vlak, anders ook 0,75.
  const kKnoop = !drie && diag && v.haarspelden === 1 ? 0.85 : 0.75;
  const UCkn2 = Math.max((R * 1e3) / Ap, sd) / (kKnoop * nuK * fcd);

  // Verankering en ombuiging
  const bband = Math.min(ap + 2 * ys, 2 * (o - c));
  const sh = (bband - phi) / Math.max(n - 1, 1);
  const eta2 = phi <= 32 ? 1 : (132 - phi) / 100;
  const fbd = 2.25 * eta2 * fctd;
  const lbrqd = ((phi / 4) * ((Ftd * 1e3) / As)) / fbd;
  const p = (R * 1e3) / (ap + 2 * ys) ** 2;
  const a5 = Math.min(1, Math.max(0.7, 1 - 0.04 * p));
  const cd = Math.min((sh - phi) / 2, c);
  const a1 = cd > 3 * phi ? 0.7 : 1;
  const lbd = Math.max(a1 * a5 * lbrqd, 0.3 * lbrqd, 10 * phi, 100);
  const phim = Math.max((phi <= 16 ? 4 : 5) * phi, (((Ftd * 1e3) / n) * (1 / Math.min(sh / 2, c + phi / 2) + 1 / (2 * phi))) / Math.min(fcd, 55 / 1.5));
  const ov = o - e;
  const UCrol = (phim / 2 + phi) / (ov - c);
  const rb = phim / 2 + phi / 2;
  const l1 = ov + ap / 2 - c - phim / 2 - phi;
  const lv = h - c - ys - rb;
  const lbesch = l1 + (Math.PI * rb) / 2 + lv;
  const UCank = lbd / lbesch;
  const lvNodig = Math.max(lbd - l1 - (Math.PI * rb) / 2, 5 * phi);

  // Dwarskracht en pons
  const k = Math.min(2, 1 + Math.sqrt(200 / d));
  const staalLengte = drie ? 3 * As * s : diag ? 2 * As * Math.hypot(s, ly) : 2 * As * (s + ly); // mm³
  const rho = Math.min(0.02, staalLengte / (2 * Apoer * d));
  const vRdc = Math.max(0.12 * k * (100 * rho * fck) ** (1 / 3), 0.035 * k ** 1.5 * Math.sqrt(fck));
  const nu = 0.6 * nuK;
  const snedes = drie
    ? [{ V: 2 * R, b: s + 2 * o, av: Math.max(r / 2 - cyK / 2 - ap / 2, 0) }, { V: R, b: (2 / Math.sqrt(3)) * (2 * o + ap / 2), av: Math.max(r - cyK / 2 - ap / 2, 0) }]
    : [{ V: 2 * R, b: ly + 2 * o, av: Math.max(s / 2 - cxK / 2 - ap / 2, 0) }, { V: 2 * R, b: s + 2 * o, av: Math.max(ly / 2 - cyK / 2 - ap / 2, 0) }];
  let UCV = 0, UCVmax = 0;
  for (const sn of snedes) {
    const beta = Math.min(1, Math.max(sn.av, 0.5 * d) / (2 * d));
    UCV = Math.max(UCV, (beta * sn.V * 1e3) / (vRdc * sn.b * d));
    UCVmax = Math.max(UCVmax, (sn.V * 1e3) / (0.5 * sn.b * d * nu * fcd));
  }
  const apons = Math.min(2 * d, apk);
  const vRd = (vRdc * 2 * d) / apons;
  const vRdmax = 0.4 * nu * fcd;
  // Tabel 6.1 met lineaire interpolatie
  const kTab = (rr) => {
    const t = [[0.5, 0.45], [1, 0.6], [2, 0.7], [3, 0.8]];
    if (rr <= 0.5) return 0.45; if (rr >= 3) return 0.8;
    for (let i = 1; i < t.length; i++) if (rr <= t[i][0]) return t[i - 1][1] + ((t[i][1] - t[i - 1][1]) * (rr - t[i - 1][0])) / (t[i][0] - t[i - 1][0]);
    return 0.8;
  };
  // W van een controle-omtrek op afstand a rond een rechthoekige kolom
  // numeriek: ∫|x|·dl over de afgeronde rechthoek, x in de richting van c1.
  const Wnum = (c1, c2, aa) => {
    let W = 0; const m = 4000;
    W += 2 * c2 * (c1 / 2 + aa);                                  // twee zijden evenwijdig aan c2 op x = ±(c1/2 + a)
    for (let i = 0; i < m; i++) { const x = -c1 / 2 + ((i + 0.5) / m) * c1; W += 2 * Math.abs(x) * (c1 / m); } // twee zijden evenwijdig aan c1
    for (let i = 0; i < m; i++) { const t = ((i + 0.5) / m) * (Math.PI / 2); W += 4 * (c1 / 2 + aa * Math.cos(t)) * aa * (Math.PI / 2 / m); } // vier bogen
    return W;
  };
  let vEdk, beta0, u0;
  const Mx = Math.abs(v.M_Ed) * 1e6, My = Math.abs(v.M_Ed_y) * 1e6; // N·mm
  if (rondK) {
    u0 = Math.PI * v.d_kolom;
    const u = Math.PI * (v.d_kolom + 2 * apons);
    vEdk = (N * 1e3) / (u * d) + (0.6 * Math.hypot(Mx, My)) / ((v.d_kolom + 2 * apons) ** 2 * d);
    beta0 = 1 + (0.6 * Math.PI * Math.hypot(ex, ey)) / (v.d_kolom + 4 * d);
  } else {
    u0 = 2 * (cxK + cyK);
    const u = u0 + 2 * Math.PI * apons;
    const kx = kTab(cxK / cyK), ky = kTab(cyK / cxK);
    vEdk = (N * 1e3) / (u * d) + (kx * Mx) / (Wnum(cxK, cyK, apons) * d) + (ky * My) / (Wnum(cyK, cxK, apons) * d);
    beta0 = 1 + ((kx * Mx) / Wnum(cxK, cyK, 2 * d) + (ky * My) / Wnum(cyK, cxK, 2 * d)) * (u0 + 4 * Math.PI * d) / (v.F_Ed * 1e3);
  }
  const UCponsK = vEdk / vRd;
  const up0 = rondP ? Math.PI * v.b_paal : 2 * (pxP + pyP);
  // Rond de paal: de omtrek op a, bij de hoek afgesneden door de twee randen op
  // o − e van het paalhart (figuur 6.15): twee rechte stukken o − e plus een boog
  // van de hoek tussen de randen (90° of 60°). Afgesneden → hoek, β = 1,5 (figuur 6.21N).
  const hoek = drie ? Math.PI / 3 : Math.PI / 2;
  const uVol = up0 + 2 * Math.PI * apons, uRand = 2 * (o - e) + (hoek / (2 * Math.PI)) * uVol;
  const upp = Math.min(uVol, uRand);
  const betaP = uRand < uVol ? 1.5 : 1;
  const UCponsP = (betaP * R * 1e3) / (upp * d) / vRd;
  // Langs de paal (6.53): paalrand dichter dan d bij de randen → hoekkolom, u_0 = min(3d; c_1 + c_2)
  // (de halve omtrek) en β = 1,5; anders de hele omtrek met β = 1.
  const er = o - e - Math.max(pxP, pyP) / 2;
  const [up0r, betaP0] = er < d ? [Math.min(3 * d, up0 / 2), 1.5] : [up0, 1];
  const UCpons0 = Math.max((beta0 * v.F_Ed * 1e3) / (u0 * d), (betaP0 * R * 1e3) / (up0r * d)) / vRdmax;

  // Scheurwijdte
  const Nfr = v.F_fr + Gk;
  const [Rfr] = reacties(Nfr).map((x, i) => (i === 0 ? x : 0));
  // BGT: het drukblok over de hele kolom; alleen bij een moment anders dan de UGT.
  let zFr = z;
  if (kolomDruk && ex + ey > 0) {
    const c0x = rondK ? ak : cxK, c0y = rondK ? ak : cyK;
    const qfr = drie ? Math.max(R * a * c0y, (Math.sqrt(3) / 2) * R * a * c0x) / v.F_Ed : (2 * R * Math.max(ax * c0x, ay * c0y)) / v.F_Ed;
    zFr = (d + Math.sqrt(Math.max(d * d - 2 * qfr, 0))) / 2;
  }
  const ss = (((Ftd * Rfr) / R) * (z / zFr) * 1e3) / As;
  const hcef = Math.min(2.5 * ys, h / 2);
  const rpe = As / (bband * hcef);
  const srmax = sh > 5 * (c + phi / 2) ? 1.3 * h : 3.4 * c + (0.17 * phi) / rpe;
  const eps = Math.max((ss - ((0.4 * fctm) / rpe) * (1 + (Es / Ecm) * rpe)) / Es, (0.6 * ss) / Es);
  const wk = srmax * eps;
  const UCw = wk / (v.betonoppervlak === 1 ? 0.3 : 0.2);

  // Detaillering; A_s,min per richting over de breedte van de doorsnede.
  const asmin1 = (fcd * (d - Math.sqrt(d * d - (h * h * fctm) / (3 * fcd)))) / fyd; // mm²/mm
  let bx, by, Asx, Asy, Asxn, Asyn;
  if (drie) { bx = (Math.sqrt(3) / 2) * s + 2 * o; by = (2 * s) / 3 + (4 / Math.sqrt(3)) * o; Asx = As; Asy = 2 * Math.cos(Math.PI / 6) ** 2 * As; Asxn = AsNodig; Asyn = 1.5 * AsNodig; }
  else if (!diag) { bx = ly + 2 * o; by = s + 2 * o; Asx = 2 * As; Asy = 2 * As; Asxn = (2 * Ftdx * 1e3) / fyd; Asyn = (2 * Ftdy * 1e3) / fyd; }
  else { const cb = s / Math.hypot(s, ly); bx = ly + 2 * o; by = s + 2 * o; Asx = 2 * cb * cb * As; Asy = 2 * (1 - cb * cb) * As; Asxn = 2 * cb * cb * AsNodig; Asyn = 2 * (1 - cb * cb) * AsNodig; }
  const Asminx = Math.min(asmin1 * bx, 1.25 * Asxn), Asminy = Math.min(asmin1 * by, 1.25 * Asyn);
  const det = phi >= 8 && !(n > 1 && sh - phi < Math.max(phi, 37)) && Asx >= Asminx && Asy >= Asminy && lv >= 5 * phi;

  const UCmax = Math.max(UCpaal, UCtrek, UCkn1, UCkn2, UCank, UCrol, UCV, UCVmax, UCponsK, UCponsP, UCpons0, UCw);
  const voldoet = knoopPast && det && UCmax <= 1 && Rmin >= 0 && kolomDruk;
  return {
    geldig, R, Rmin, UCpaal, z, Ftd, UCtrek, kolomDruk, UCkn1, UCkn2, apk, lbd, phim, UCrol, lbesch, UCank, lvNodig,
    rho, UCV, UCVmax, apons, UCponsK, UCponsP, UCpons0, zFr, ss, wk, UCw, Asminx, Asminy, UCmax, knoopPast, det, voldoet, Ablok,
  };
}

// ── Onafhankelijke uitwerking, poer op staal; N en mm, lasten in kN ─────────
function uitwerkingStaal(v, CC = 2) {
  const trek = v.belasting_staal === 2;
  const fck = v.betonklasse, fcd = fck / 1.5, fctm = 0.3 * fck ** (2 / 3), fctd = (0.7 * fctm) / 1.5, fyd = 500 / 1.15;
  const rondK = v.kolomvorm === 1;
  const cx = v.d_kolom, cy = rondK ? v.d_kolom : v.b_kolom;
  const Bx = v.B_x, By = v.B_y, h = v.h_poer, D = v.D_aanleg, c = v.c_dek;
  const phi = trek ? v.d_boven : v.d_langs, sp = trek ? v.s_boven : v.s_langs;
  let geldig = cx > 0 && cy > 0 && Bx > cx && By > cy && D >= h && c >= 0 && v.gamma_k > 0 && v.gamma_sat > 0 && v.F_Ed > 0 &&
    h > c + 2 * phi && phi > 0 && sp > phi;
  if (!trek) geldig = geldig && v.phi_k > 0 && v.phi_k < 50 && v.c_eff_k >= 0 && (v.H_Ed === 0 || (v.phi_cv_k > 0 && v.phi_cv_k < 50));
  if (!geldig) return { geldig };
  const gG = CC === 1 ? 1.2 : CC === 3 ? 1.5 : 1.35;
  const Ab = (Bx * By) / 1e6, Ak = (rondK ? (Math.PI * cx * cx) / 4 : cx * cy) / 1e6; // m²
  const nat = v.grondwater === 3;
  const Gk = 25 * Ab * (h / 1000) + (nat ? v.gamma_sat : v.gamma_k) * (Ab - Ak) * ((D - h) / 1000);
  const Uk = nat ? 10 * (D / 1000) * Ab : 0;
  const rad = Math.PI / 180;

  // Pons: de ongunstigste controle-omtrek door een fijne scan over a.
  const kTab = (rr) => {
    const t = [[0.5, 0.45], [1, 0.6], [2, 0.7], [3, 0.8]];
    if (rr <= 0.5) return 0.45; if (rr >= 3) return 0.8;
    for (let i = 1; i < t.length; i++) if (rr <= t[i][0]) return t[i - 1][1] + ((t[i][1] - t[i - 1][1]) * (rr - t[i - 1][0])) / (t[i][0] - t[i - 1][0]);
    return 0.8;
  };
  const vc = (dd, rr) => { const k = Math.min(2, 1 + Math.sqrt(200 / dd)); return Math.max(0.12 * k * (100 * rr * fck) ** (1 / 3), 0.035 * k ** 1.5 * Math.sqrt(fck)); };
  const pons = (F, sigma, dp, rho, Mx, My) => {
    // F in kN, sigma in kPa (= 1e-3 N/mm²), M in kNm
    const vRdc = vc(dp, rho);
    const amax = Math.min(2 * dp, (Bx - cx) / 2, (By - cy) / 2);
    const vE = (a) => {
      const u = rondK ? Math.PI * (cx + 2 * a) : 2 * (cx + cy) + 2 * Math.PI * a;
      const A = rondK ? Math.PI * (cx / 2 + a) ** 2 : cx * cy + 2 * a * (cx + cy) + Math.PI * a * a;
      const V = Math.max(F * 1e3 - sigma * 1e-3 * A, 0);
      const W = (c1, c2) => c1 * c1 / 2 + c1 * c2 + 2 * c2 * a + 4 * a * a + Math.PI * a * c1;
      const mom = rondK ? (0.6 * Math.hypot(Mx, My) * 1e6) / (cx + 2 * a) ** 2 : (kTab(cx / cy) * Mx * 1e6) / W(cx, cy) + (kTab(cy / cx) * My * 1e6) / W(cy, cx);
      return V / (u * dp) + mom / dp;
    };
    const UC = (a) => vE(a) / ((vRdc * 2 * dp) / a);
    let best = 0, abest = 0;
    const lo = 0.05 * dp, hi = Math.max(amax, 0.06 * dp);
    for (let i = 0; i <= 4000; i++) { const a = lo + ((hi - lo) * i) / 4000; const u = UC(a); if (u > best) { best = u; abest = a; } }
    return { UC: best, a: abest, vRdc };
  };

  if (trek) {
    const [gdst, gstb] = v.factoren === 2 ? [1.1, 0.9] : [1.0, 0.9];
    const UCupl = (v.F_Ed + gdst * Uk) / (gstb * Gk);
    const qt = v.F_Ed / Ab; // kPa
    const dx = h - c - phi / 2, dy = h - c - (3 * phi) / 2;
    const as = (Math.PI * phi * phi) / 4 / sp; // mm²/mm
    const Mx = (qt * 1e-3 * By * (Bx / 2 - cx / 2) ** 2) / 2, My = (qt * 1e-3 * Bx * (By / 2 - cy / 2) ** 2) / 2; // N·mm
    const Asn = (M, b, dd) => (b * fcd * (dd - Math.sqrt(dd * dd - (2 * M) / (b * fcd)))) / fyd;
    const Asxn = Asn(Mx, By, dx), Asyn = Asn(My, Bx, dy);
    const UCM = Math.max(Asxn / (as * By), Asyn / (as * Bx));
    const Vx = qt * 1e-3 * By * Math.max(Bx / 2 - cx / 2 - dx, 0), Vy = qt * 1e-3 * Bx * Math.max(By / 2 - cy / 2 - dy, 0);
    const UCV = Math.max(Vx / (vc(dx, Math.min(0.02, as / dx)) * By * dx), Vy / (vc(dy, Math.min(0.02, as / dy)) * Bx * dy));
    const dp = (dx + dy) / 2;
    const rho = Math.sqrt(Math.min(0.02, as / dx) * Math.min(0.02, as / dy));
    const pn = pons(v.F_Ed, qt, dp, rho, 0, 0);
    const u0 = rondK ? Math.PI * cx : 2 * (cx + cy);
    const UCpons0 = (v.F_Ed * 1e3) / (u0 * dp) / (0.4 * 0.6 * (1 - fck / 250) * fcd);
    // A_s,min1 per richting met de eigen nuttige hoogte (de staven in y liggen een staaf hoger).
    const asmin1 = (dd) => (fcd * (dd - Math.sqrt(dd * dd - (h * h * fctm) / (3 * fcd)))) / fyd;
    const det = phi >= 8 && sp <= Math.min(2 * h, 250) && sp - phi >= Math.max(phi, 37) &&
      as * By >= Math.min(asmin1(dx) * By, 1.25 * Asxn) && as * Bx >= Math.min(asmin1(dy) * Bx, 1.25 * Asyn);
    const okM = dx * dx > (2 * Mx) / (By * fcd) && dy * dy > (2 * My) / (Bx * fcd);
    const UCmax = Math.max(UCupl, UCM, UCV, pn.UC, UCpons0);
    return { geldig, trek, Gk, UCupl, UCM, UCV, UCpons: pn.UC, akrit: pn.a, UCpons0, UCmax, voldoet: okM && det && UCmax <= 1 };
  }

  // Druk: grond
  const Vd = v.F_Ed + gG * Gk - Uk, Vmin = v.F_Ed + 0.9 * Gk - Uk;
  const Mxd = Math.abs(v.M_Ed) + Math.abs(v.H_Ed) * (h / 1000), Myd = Math.abs(v.M_Ed_y);
  if (Vmin <= 0) return { geldig, drijft: true, voldoet: false };
  let ex = (Mxd / Vmin) * 1000, ey = (Myd / Vmin) * 1000;
  const kier = ex > Bx / 6 || ey > By / 6;
  if (ex > Bx / 6) ex += v.afwijking * 100;
  if (ey > By / 6) ey += v.afwijking * 100;
  if (ex >= Bx / 2 || ey >= By / 2) return { geldig, drijft: true, voldoet: false };
  const Bxe = Bx - 2 * ex, Bye = By - 2 * ey, Aeff = (Bxe * Bye) / 1e6;
  const b = Math.min(Bxe, Bye), l = Math.max(Bxe, Bye);
  const phid = Math.atan(Math.tan(v.phi_k * rad) / 1.15);
  const cd = v.c_eff_k / 1.6;
  const Nq = Math.exp(Math.PI * Math.tan(phid)) * Math.tan(Math.PI / 4 + phid / 2) ** 2;
  const Nc = (Nq - 1) / Math.tan(phid), Ng = 2 * (Nq - 1) * Math.tan(phid);
  const sq = 1 + (b / l) * Math.sin(phid), sg = 1 - (0.3 * b) / l, sc = (sq * Nq - 1) / (Nq - 1);
  let iq = 1, ig = 1, ic = 1;
  if (v.H_Ed !== 0) {
    const m = Bxe <= Bye ? (2 + b / l) / (1 + b / l) : (2 + l / b) / (1 + l / b);
    const f = Math.max(1 - Math.abs(v.H_Ed) / Vmin, 0);
    iq = f ** m; ig = f ** (m + 1);
    if (cd > 0) ic = Math.max(iq - (1 - iq) / (Nc * Math.tan(phid)), 0);
  }
  const q = nat ? (v.gamma_sat * D) / 1000 / 1.1 - (10 * D) / 1000 : (v.gamma_k * D) / 1000 / 1.1;
  const gEff = v.grondwater === 1 ? v.gamma_k / 1.1 : v.gamma_sat / 1.1 - 10;
  let sig = cd * Nc * sc * ic + q * Nq * sq * iq + 0.5 * gEff * (b / 1000) * Ng * sg * ig;
  if (kier) sig = Math.min(sig, cd * Nc * sc + 0.5 * gEff * (b / 1000) * Ng * sg);
  const Rd = Math.max(sig, 0) * Aeff;
  const UCdraag = Vd / Math.max(Rd, 0.001);
  const UCglij = v.H_Ed !== 0 ? Math.abs(v.H_Ed) / (Vmin * Math.tan(Math.atan(Math.tan(v.phi_cv_k * rad) / 1.15))) : 0;

  // Grondspanning per richting als functie van x (mm vanaf het midden), in N/mm².
  const verdeling = (B, Bdw, e) => {
    if (e <= B / 6) return (x) => ((Vd * 1e3) / (B * Bdw)) * (1 + (12 * e * x) / (B * B));
    const Lc = 3 * (B / 2 - e), pm = (2 * Vd * 1e3) / (3 * Bdw * (B / 2 - e));
    return (x) => Math.max(0, (pm * (x - (B / 2 - Lc))) / Lc);
  };
  const px = verdeling(Bx, By, ex), py = verdeling(By, Bx, ey);
  const g = ((gG * Gk - Uk) * 1e3) / (Bx * By); // N/mm²
  // Numerieke integratie (Simpson) van de netto grondspanning voorbij x0.
  const integreer = (f, a0, a1) => { const m = 2000, hh = (a1 - a0) / m; let t = f(a0) + f(a1); for (let i = 1; i < m; i++) t += (i % 2 ? 4 : 2) * f(a0 + i * hh); return (t * hh) / 3; };
  const kracht = (p, B, Bdw, x0) => integreer((x) => (p(x) - g) * Bdw, x0, B / 2);              // N
  const moment = (p, B, Bdw, x0) => integreer((x) => (p(x) - g) * Bdw * (x - x0), x0, B / 2);   // N·mm
  const bk = rondK ? (Math.sqrt(Math.PI) / 2) * cx : cx, bky = rondK ? bk : cy;
  const xM = 0.35 * bk, yM = 0.35 * bky;
  const Mbx = Math.max(moment(px, Bx, By, xM), 0), Mby = Math.max(moment(py, By, Bx, yM), 0);
  const dx = h - c - phi / 2, dy = h - c - (3 * phi) / 2;
  const as = (Math.PI * phi * phi) / 4 / sp;
  const Asn = (M, bb, dd) => (bb * fcd * (dd - Math.sqrt(Math.max(dd * dd - (2 * M) / (bb * fcd), 0)))) / fyd;
  const Asxn = Asn(Mbx, By, dx), Asyn = Asn(Mby, Bx, dy);
  const UCM = Math.max(Asxn / (as * By), Asyn / (as * Bx));
  const okM = dx * dx > (2 * Mbx) / (By * fcd) && dy * dy > (2 * Mby) / (Bx * fcd);
  // Verankering op x = h/2 van de rand
  const eta2 = phi <= 32 ? 1 : (132 - phi) / 100, fbd = 2.25 * eta2 * fctd;
  const ank = (p, B, Bdw, xm, dd, As) => {
    const xa = Math.min(h / 2, B / 2 - xm);
    const x0 = B / 2 - xa;
    const Ra = kracht(p, B, Bdw, x0);
    const Mr = integreer((x) => (p(x) - g) * Bdw * (B / 2 - x), x0, B / 2); // om de rand
    const ze = B / 2 - Mr / Ra - xm;
    const Fs = Math.max((Ra * ze) / (0.9 * dd), 0);
    const lbrqd = ((phi / 4) * Fs) / As / fbd;
    // Blijft er binnen x_min na de dekking niets over, dan is de staaf niet te
    // verankeren: 1 mm als ondergrens maakt de UC groot in plaats van negatief.
    return Math.max(lbrqd, 10 * phi, 100) / Math.max(xa - c, 1);
  };
  const UCank = Math.max(ank(px, Bx, By, xM, dx, as * By), ank(py, By, Bx, yM, dy, as * Bx));
  // Dwarskracht op d van de kolomrand
  const Vx = Bx / 2 > cx / 2 + dx ? Math.max(kracht(px, Bx, By, cx / 2 + dx), 0) : 0;
  const Vy = By / 2 > cy / 2 + dy ? Math.max(kracht(py, By, Bx, cy / 2 + dy), 0) : 0;
  const rx = Math.min(0.02, as / dx), ry = Math.min(0.02, as / dy);
  const UCV = Math.max(Vx / (vc(dx, rx) * By * dx), Vy / (vc(dy, ry) * Bx * dy));
  // Pons
  const dp = (dx + dy) / 2;
  const sigN = Math.max(Math.min(px(0), py(0)) - g, 0) * 1e3; // kPa
  const pn = pons(v.F_Ed, sigN, dp, Math.sqrt(rx * ry), Math.abs(v.M_Ed), Math.abs(v.M_Ed_y));
  let beta0;
  if (rondK) beta0 = 1 + (0.6 * Math.PI * (Math.hypot(v.M_Ed, v.M_Ed_y) / v.F_Ed) * 1000) / (cx + 4 * dp);
  else {
    const W1 = (c1, c2) => c1 * c1 / 2 + c1 * c2 + 4 * c2 * dp + 16 * dp * dp + 2 * Math.PI * dp * c1;
    beta0 = 1 + ((kTab(cx / cy) * Math.abs(v.M_Ed) * 1e6) / W1(cx, cy) + (kTab(cy / cx) * Math.abs(v.M_Ed_y) * 1e6) / W1(cy, cx)) * (2 * (cx + cy) + 4 * Math.PI * dp) / (v.F_Ed * 1e3);
  }
  const u0 = rondK ? Math.PI * cx : 2 * (cx + cy);
  const UCpons0 = (beta0 * v.F_Ed * 1e3) / (u0 * dp) / (0.4 * 0.6 * (1 - fck / 250) * fcd);
  const asmin1 = (dd) => (fcd * (dd - Math.sqrt(dd * dd - (h * h * fctm) / (3 * fcd)))) / fyd;
  const det = phi >= 8 && sp <= Math.min(2 * h, 250) && sp - phi >= Math.max(phi, 37) &&
    as * By >= Math.min(asmin1(dx) * By, 1.25 * Asxn) && as * Bx >= Math.min(asmin1(dy) * Bx, 1.25 * Asyn);
  const hoekLos = (6 * ex) / Bx + (6 * ey) / By > 1 && ex > 0 && ey > 0;
  const UCmax = Math.max(UCdraag, UCglij, UCM, UCank, UCV, pn.UC, UCpons0);
  return {
    geldig, trek, Gk, Vd, Vmin, ex, ey, kier, Rd, UCdraag, UCglij, Mbx, Mby, UCM, UCank, UCV, UCpons: pn.UC, akrit: pn.a, UCpons0, UCmax,
    voldoet: okM && det && UCmax <= 1 && !hoekLos,
  };
}

function verwachtingen34(r, v) {
  const uit = {
    R_Ed: ruim(r.R), R_Ed_min: ruim(r.Rmin), z: ruim(r.z), F_td: ruim(r.Ftd), UC_trek: ruim(r.UCtrek), UC_kn_2: ruim(r.UCkn2),
    // de vrije afstand is bemonsterd: op een tiende millimeter
    a_pk: { waarde: s4(r.apk), tol: 0.2 },
    l_bd: ruim(r.lbd), φ_m: ruim(r.phim), UC_rol: ruim(r.UCrol), l_b_besch: ruim(r.lbesch), UC_ank: ruim(r.UCank),
    l_v_nodig: ruim(r.lvNodig), ρ_l: ruim(r.rho), UC_V: ruim(r.UCV), UC_Vmax: ruim(r.UCVmax), a_pons: { waarde: s4(r.apons), tol: 0.2 },
    UC_pons_k: ruim(r.UCponsK), UC_pons_p: ruim(r.UCponsP), UC_pons_0: ruim(r.UCpons0), σ_s: ruim(r.ss), w_k: ruim(r.wk),
    UC_w: ruim(r.UCw), A_s_min_x: ruim(r.Asminx), A_s_min_y: ruim(r.Asminy), UC_max: ruim(r.UCmax),
  };
  if (v.R_cd > 0) uit.UC_paal = ruim(r.UCpaal);
  if (r.kolomDruk) uit.UC_kn_1 = ruim(r.UCkn1);
  if (r.kolomDruk && (v.M_Ed !== 0 || v.M_Ed_y !== 0)) Object.assign(uit, { A_blok: ruim(r.Ablok), z_fr: ruim(r.zFr) });
  return uit;
}

function verwachtingenStaal(r, v) {
  if (r.drijft) return {};
  // a_krit ligt in een vlak maximum: op 2 %
  const uit = { UC_M: ruim(r.UCM), UC_V: ruim(r.UCV), UC_pons: ruim(r.UCpons), a_krit: { waarde: s4(r.akrit), tol: 0.02 * r.akrit },
    UC_pons_0: ruim(r.UCpons0), UC_max: ruim(r.UCmax), G_k: ruim(r.Gk) };
  if (r.trek) return Object.assign(uit, { UC_upl: ruim(r.UCupl) });
  Object.assign(uit, {
    V_d: ruim(r.Vd), V_d_min: ruim(r.Vmin), e_x_d: ruim(r.ex), e_y_d: ruim(r.ey), R_d: ruim(r.Rd), UC_draag: ruim(r.UCdraag),
    M_b_x: ruim(r.Mbx / 1e6), M_b_y: ruim(r.Mby / 1e6), UC_ank: ruim(r.UCank),
  });
  if (v.H_Ed !== 0) uit.UC_glij = ruim(r.UCglij);
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
  // ── Drie- en vierpaals poer ────────────────────────────────────────────────
  {
    naam: "29 — vierpaals poer: Ø500 op vier palen 450×450 h.o.h. 1600 × 1600, poer 2400 × 2400 × 1250, 6Ø32 per band langs de randen",
    invoer: { poertype: 4 },
    // Met de hand (N, mm, kN), f_cd, ν′, f_yd, f_ctd als set 1.
    // Paalreacties: L_x = L_y = 1600 + 2·400 = 2400; G_k = 25·2,4·2,4·1,25 = 180,0 kN; N = 3600 + 1,35·180 = 3843 kN.
    // Paalafwijking in de ongunstigste richting: N·e/2·√(1/l_x² + 1/l_y²) = 384,3/2·√2/1,6 = 192,15·0,8839 = 169,8 kN;
    // R_Ed = 3843/4 + 169,8 = 960,75 + 169,8 = 1130,6 kN (R_Ed,min = 790,9); UC_paal = 1130,6/2400 = 0,471.
    // Staafwerk: y_s = 55 + 32 = 87 (hart tussen de twee lagen), d = 1163; kwart kolom: x_k = y_k = 2·500/(3π) = 106,1;
    // a_x = a_y = 800 − 106,1 = 693,9, a = 693,9·√2 = 981,3. Vlak door de knoop: 2·R·a_x·a_k/F
    // = 2·1130,6·693,9·443,1/3600 = 193 120 → z = (1163 + √(1 352 569 − 386 240))/2 = (1163 + 983,0)/2 = 1073,0;
    // θ = atan(1073,0/981,3) = 47,56°; L_d = 1454,0; C_d = 1130,6·1454,0/1073,0 = 1532 kN; u = 193 120/1073,0 = 180,0 mm.
    // Trekband langs de rand: F_td = 1130,6·693,9/1073,0 = 731,1 kN → A_s,nodig = 1682 mm² tegen 4825: UC 0,349.
    // Knoop onder de kolom als bij twee palen: 18,33/20,07 = 0,914 (maatgevend). Boven de paal: σ_p = 1130,6e3/202 500
    // = 5,583; w_2 = (450·1073,0 + 174·981,3)/1454,0 = 449,5; σ_d = 1532e3/(449,5·450) = 7,574. Boven de paal zijn
    // de banden in x en in y verankerd: (6.62) met k_3 = 0,75 → 0,75·0,86·23,33 = 15,05 → UC 7,574/15,05 = 0,503
    // (met k_2 = 0,85 van (6.61), één trekrichting, zou het 0,444 zijn: 13 % te gunstig).
    // Band: min(450 + 2·87; 2·(400 − 55)) = 624, s_h = (624 − 32)/5 = 118,4. σ_sd = 731,1e3/4825 = 151,5;
    // l_b,rqd = 8·151,5/3,370 = 359,6; p = 1130,6e3/624² = 2,904 → α_5 = 0,884; c_d = 43,2 → α_1 = 1;
    // 0,884·359,6 = 318 < l_b,min = 320 → l_bd = 320. φ_m,bet = 121 850·(1/59,2 + 1/64)/23,33 = 169,8 (> 160);
    // UC_rol = (84,9 + 32)/(300 − 55) = 0,477; r_b = 100,9; l_1 = 300 + 225 − 55 − 84,9 − 32 = 353,1;
    // l_v = 1250 − 55 − 87 − 100,9 = 1007,1; l_b,besch = 353,1 + 158,5 + 1007,1 = 1518,7 → UC_ank = 0,211.
    // Dwarskracht: ρ_l = 4825·3200/(5,76e6·1163) = 0,002305; 0,12·1,4147·(8,068)^(1/3) = 0,3405 < v_min = 0,3484;
    // V = 2·1130,6 = 2261 kN over 2400, a_v = 800 − 250 − 225 = 325 < 0,5d → β = 0,25; V_Rd,c = 0,3484·2400·1163
    // = 972,5 kN → UC_V = 0,25·2261/972,5 = 0,581. (6.5): 2261/(0,5·2400·1163·0,516·23,33) = 0,135.
    // Pons: kolomrand tot paalhoek (575; 575): √2·575 − 250 = 563,2 mm < 2d → a = 563,2; v_Rd = 0,3484·2326/563,2 = 1,439.
    // Kolom: u = π·(500 + 2·563,2) = 5109 → v_Ed = 3843e3/(5109·1163) = 0,647 → UC 0,449.
    // Paal: de randen op o − e = 300 van het paalhart (9.8.1(1)): min(1800 + 2π·563,2; 2·300 + ¼·(1800 + 2π·563,2))
    // = min(5339; 1935) = 1935, afgesneden → hoek, β = 1,5 (figuur 6.21N): 1,5·1130,6e3/(1935·1163) = 0,754 → UC 0,524
    // (zonder β en met de randen op 400 was het 0,317). Langs de paal: paalrand 300 − 225 = 75 < d → hoekkolom,
    // u_0 = min(3·1163; 450 + 450) = 900: 1,5·1130,6e3/(900·1163) = 1,620 < 1,971 van de kolom.
    // Langs de kolom: 3600e3/(1571·1163) = 1,971 tegen 0,4·0,516·23,33 = 4,816 → 0,409.
    // Scheurwijdte: R_fr = 2680/4 + 268,0/2·0,8839 = 670 + 118,4 = 788,4; σ_s = 731,1·788,4/1130,6·1e3/4825 = 105,7;
    // h_c,ef = 217,5, ρ_p,eff = 4825/(624·217,5) = 0,03555; s_r,max = 3,4·55 + 0,17·32/0,03555 = 340,0;
    // (105,7 − 0,4·3,210/0,03555·1,209)/2e5 = 3,1e-4 < 0,6·105,7/2e5 = 3,171e-4 → w_k = 0,1078 → UC 0,359.
    // A_s,min: per breedte f_cd·(d − √(d² − h²·f_ctm/(3f_cd)))/f_yd = 23,33·(1163 − 1131,8)/434,8 = 1,676 mm²/mm;
    // × 2400 = 4022 < 1,25·2·1682 = 4204 → A_s,min,x = 4022 tegen 2·4825 = 9651: voldoet.
    handwerk: {
      L_x: "2400", G_k: "180.0", N_Ed: "3843", ΔR_e: "169.8", R_Ed: "1131", R_Ed_min: "790.9", UC_paal: "0.471",
      y_s: "87", d: "1163", x_k: "106.1", a_x: "693.9", a: "981.3", z: "1073", θ: "47.56", L_d: "1454", C_d: "1532",
      u_k: "180.0", F_td: "731.1", A_s_nodig: "1682", UC_trek: "0.349", UC_kn_1: "0.914", σ_p: "5.583", w_2: "449.5",
      σ_d: "7.574", σ_Rd_2: "15.05", UC_kn_2: "0.503", b_band: "624", s_h: "118.4", l_b_rqd: "359.6", α_5: "0.884", l_bd: "320",
      φ_m_bet: "169.8", UC_rol: "0.477", l_b_besch: "1519", UC_ank: "0.211", ρ_l: "0.002305", v_Rd_c: "0.3484",
      β_1: "0.25", V_Rd_c_1: "972.5", UC_V: "0.581", UC_Vmax: "0.135", a_pk: "563.2", v_Rd: "1.439", u_pk: "5109",
      v_Ed_k: "0.647", UC_pons_k: "0.449", u_pp: "1935", β_p: "1.5", UC_pons_p: "0.524", u_p0_r: "900", v_Ed_p0: "1.620", v_Ed_0: "1.971", UC_pons_0: "0.409",
      R_fr: "788.4", σ_s: "105.7", ρ_p_eff: "0.03555", s_r_max: "340.0", w_k: "0.1078", UC_w: "0.359", A_s_min_x: "4022",
      UC_max: "0.914",
    },
    // De slotregel noemt wat niet getoetst is: de dwarstrek in de drukdiagonalen (6.5.3(3)).
    melding: /\(knoop onder de kolom\) ≤ 1,0 → de poer voldoet op de getoetste punten; niet getoetst: dwarstrek in de drukdiagonalen/,
  },
  {
    naam: "30 — driepaals poer: Ø500 op drie palen 450×450 in een driehoek met zijde 1600, 6Ø32 per band langs de zijden",
    invoer: { poertype: 3 },
    // r = 1600/√3 = 923,8; A = √3/4·1600² + 3·1600·400 + 2√3·400² = 1 108 513 + 1 920 000 + 554 256 = 3,583 m²;
    // G_k = 25·3,583·1,25 = 112,0 kN; N = 3600 + 151,2 = 3751,1 kN; paalafwijking 2·N·e/(√3·l) = 750,2/2,771 = 270,7 kN;
    // R_Ed = 3751,1/3 + 270,7 = 1521,1 kN (R_Ed,min = 979,7); UC_paal = 0,634.
    // Sector van 120°: x_k = √3·500/(2π) = 137,8; a = 923,8 − 137,8 = 786,0. Vlak loodrecht op y:
    // R·a·a_k/F = 1521,1·786,0·443,1/3600 = 147 140 → z = (1163 + √(1 352 569 − 294 280))/2 = (1163 + 1028,7)/2 = 1095,9.
    // Band langs een zijde: F_td = R·a/(√3·z) = 1521,1·786,0/(1,732·1095,9) = 629,8 kN → UC 1449/4825 = 0,300.
    // θ = atan(1095,9/786,0) = 54,35°; σ_p = 1521,1e3/202 500 = 7,512.
    // Dwarskracht: ρ_l = 3·4825·1600/(2·3,583e6·1163) = 0,002779 → v_Rd,c = 0,12·1,4147·(9,727)^(1/3) = 0,3624.
    // Voor de derde paal: V = 1521,1 kN over (2/√3)·(800 + 225) = 1183,6; a_v = 923,8 − 250 − 225 = 448,8 → β = 0,25;
    // 0,25·1521,1e3/(0,3624·1183,6·1163) = 0,762 (langs de zijde met twee palen 0,752).
    // Pons: van de kolom tot paal A (575; 236,9): √(575² + 236,9²) − 250 = 371,9 mm;
    // rond de paal, de randen op o − e = 300: min(1800 + 2π·371,9; 600 + (1800 + 2π·371,9)/6) = min(4137; 1289,5) = 1289,5.
    handwerk: {
      r_p: "923.8", A_poer: "3.583", G_k: "112.0", ΔR_e: "270.7", R_Ed: "1521", R_Ed_min: "979.7", UC_paal: "0.634",
      x_k: "137.8", a: "785.9", z: "1096", F_td: "629.8", UC_trek: "0.300", θ: "54.35", σ_p: "7.512", ρ_l: "0.002779",
      v_Rd_c: "0.3624", b_V_2: "1184", a_v_2: "448.8", UC_V: "0.762", a_pk: "371.9", u_pp: "1289", UC_max: "0.914",
    },
  },
  {
    naam: "31 — vierpaals poer over de diagonalen, kolom 500×400 met M_Ed = 300 en M_Ed,y = 150 kNm, ronde palen Ø450",
    invoer: { poertype: 4, trekbanden: 2, kolomvorm: 2, b_kolom: 400, M_Ed: 300, M_Ed_y: 150, paalvorm: 2 },
    // ΔR_M = 300/3,2 + 150/3,2 = 93,75 + 46,88 = 140,6 kN → R_Ed = 960,75 + 140,6 + 169,8 = 1271,2 kN.
    // Drukblok (c_x − 2e_x)(c_y − 2e_y): e = 83,3 en 41,7 → 333,3 × 316,7 = 105 560 mm² → σ = 34,11 N/mm²: UC 1,700.
    // a_x = 800 − 125 = 675, a_y = 800 − 100 = 700; vlak loodrecht op x: 2·R·a_x·c_k,x/F = 2·1271,2·675·333,3/3600
    // = 158 880 (y: 157 440) → z = (1163 + √1 034 810)/2 = 1090,1; diagonaal a = √(675² + 700²) = 972,4:
    // F_td = 1271,2·972,4/1090,1 = 1134 kN → UC 0,541.
    // Pons: van de kolomhoek (250; 200) tot de paal Ø450 op (800; 800): √(550² + 600²) − 225 = 588,9;
    // k_x = 0,6 + 0,1·0,25 = 0,625, k_y = 0,45 + 0,3·0,3 = 0,54; W_x = 125 000 + 200 000 + 2·400·588,9 + 4·588,9²
    // + π·588,9·500 = 3,108e6; v_Ed = 3843e3/(5500·1163) + 0,625·300e6/(3,108e6·1163) + 0,54·150e6/(2,996e6·1163)
    // = 0,601 + 0,052 + 0,023 = 0,676.
    handwerk: {
      ΔR_M: "140.6", R_Ed: "1271", c_k_x: "333.3", c_k_y: "316.7", σ_Ed_1: "34.11", UC_kn_1: "1.700", a_x: "675.0",
      a_y: "700.0", z: "1090", a: "972.4", F_td: "1134", UC_trek: "0.541", a_pk: "588.9", k_x: "0.625", k_y: "0.54",
      v_Ed_k: "0.676",
    },
    melding: /\(knoop onder de kolom\) > 1,0/,
  },
  {
    naam: "32 — driepaals poer, kolom 500×400 met M_Ed,y = −300 kNm, rechthoekige palen",
    invoer: { poertype: 3, kolomvorm: 2, b_kolom: 400, M_Ed_y: -300 },
  },
  {
    naam: "33 — vierpaals poer 2000 × 1400 h.o.h., kolom 600×400 met M_Ed = 200 kNm, 5Ø25, h = 1100",
    invoer: { poertype: 4, l_hoh: 2000, l_hoh_y: 1400, kolomvorm: 2, d_kolom: 600, b_kolom: 400, M_Ed: 200, n_langs: 5, d_langs: 25, h_poer: 1100 },
  },
  {
    naam: "34 — vierpaals poer, kleine last met groot moment: de kolomvoet krijgt trek",
    invoer: { poertype: 4, F_Ed: 800, M_Ed: 700, F_fr: 500, R_cd: 0 },
    // e_k = 700/800 = 875 mm > 250: de knoop onder de kolom is niet getoetst; de knoop rekent met het blok over de hele kolom.
    melding: /kolomwapening krijgt trek/,
  },
  {
    naam: "35 — driepaals poer met palen die elkaar raken: invoer past niet",
    invoer: { poertype: 3, l_hoh: 440 },
    melding: /invoer onvolledig/,
  },
  // ── Poer op staal ──────────────────────────────────────────────────────────
  {
    naam: "36 — poer op staal, centrisch: 2400 × 2400 × 600 op 1,0 m, kolom 400 × 400, F_Ed = 1500 kN, φ′ = 30°",
    invoer: { ...STAAL },
    // G_k = 25·5,76·0,6 + 18·(5,76 − 0,16)·0,4 = 86,4 + 40,32 = 126,72 kN; V_d = 1500 + 1,35·126,72 = 1671,1 kN.
    // φ_d = atan(tan 30°/1,15) = atan(0,5020) = 26,66°; N_q = e^(π·0,5020)·tan²(58,33°) = 4,8415·2,6276 = 12,72;
    // N_c = 11,72/0,5020 = 23,35; N_γ = 2·11,72·0,5020 = 11,77. Vierkant (D.4): s_q = 1 + sin 26,66° = 1,449,
    // s_γ = 0,7, s_c = (1,449·12,72 − 1)/11,72 = 1,487. q = 18·1,0/1,1 = 16,36 kPa, γ′ = 16,36 kN/m³ (droog).
    // σ′_max = 16,36·12,72·1,449 + 0,5·16,36·2,4·11,77·0,7 = 301,6 + 161,8 = 463,3 kPa → R_d = 463,3·5,76 = 2669 kN:
    // UC_draag = 1671,1/2669 = 0,626.
    // Beton (C30/37): netto grondspanning V_d/A − 1,35·G_k/A = 290,1 − 29,7 = 260,4 kPa = F/A.
    // Buiging op 0,15·400 binnen de kolomrand, x = 140: M = 260,4·2,4·1,06²/2 = 351,1 kNm;
    // d_x = 600 − 50 − 8 = 542: A_s = 2400·20·(542 − √(542² − 2·351,1e6/48 000))/434,8 = 48 000·13,67/434,8 = 1509 mm²;
    // d_y = 526: 1556 mm² tegen 1340·2,4 = 3217 → UC_M = 0,484.
    // Verankering op h/2 = 300 van de rand: R = 260,4·2,4·0,3 = 187,5 kN, z_e = 1200 − 150 − 140 = 910:
    // F_s = 187,5·910/(0,9·542) = 349,8 kN; σ = 108,7 N/mm² → l_b,rqd = 4·108,7/3,041 = 143,0 → l_bd = 10φ = 160;
    // beschikbaar 300 − 50 = 250 → UC_ank = 0,640 (maatgevend).
    // Dwarskracht op d: 200 + 542 = 742 → V = 260,4·2,4·0,458 = 286,3 kN; ρ = 1340/(1000·542) = 0,002473, k = 1,607:
    // v_min = 0,035·1,607^1,5·√30 = 0,3907 > 0,3762 → V_Rd,c = 0,3907·2400·542 = 508,2 kN; in y 296,3/497,4 = 0,596.
    // Pons: d = (542 + 526)/2 = 534, v_Rd,c = v_min = 0,3923. De ongunstigste omtrek ligt op a = 408,1:
    // u = 1600 + 2π·408,1 = 4164; A = 160 000 + 2·408,1·800 + π·408,1² = 1,336 m² → V_red = 1500 − 260,4·1,336
    // = 1152,1 kN; v_Ed = 1152,1e3/(4164·534) = 0,518 tegen 0,3923·2·534/408,1 = 1,027 → UC 0,505.
    // (Op a = 0,5d: 0,469; op a = d: 0,483.) Langs de kolom: 1500e3/(1600·534) = 1,756 tegen 0,4·0,6·0,88·20 = 4,224 → 0,416.
    // A_s,min1 (NB bij 9.2.1.1(1)) per richting met de eigen d: h²·f_ctm/(3·f_cd) = 360 000·2,8965/60 = 17 379 mm²;
    // x: 20·(542 − √(293 764 − 17 379))/434,78 = 20·16,276/434,78 = 0,7487 mm²/mm; y: 20·(526 − √(276 676 − 17 379))/434,78
    // = 20·16,788/434,78 = 0,7722 mm²/mm → A_s,min,y = min(0,7722·2400; 1,25·1556) = 1853 mm² (met d_x ten onrechte 1797).
    handwerk: {
      G_k: "126.7", V_d: "1671", phi_d: "26.66", N_q: "12.72", N_c: "23.35", N_γ: "11.77", s_q: "1.449", s_c: "1.487",
      q_eff: "16.36", σ_max_d: "463.3", R_d: "2669", UC_draag: "0.626", σ_x_max: "290.1", g_d: "29.70", x_M: "140.0",
      M_b_x: "351.1", A_s_x_nodig: "1509", A_s_y_nodig: "1556", UC_M: "0.484", R_a_x: "187.5", z_e_x: "910.0", F_s_x: "349.8",
      l_b_rqd_x: "143.0", l_bd_x: "160", UC_ank: "0.640", V_Ed_x: "286.3", V_Rd_c_x: "508.2", UC_V: "0.596", d_p: "534",
      v_Rd_c: "0.3923", σ_n: "260.4", u_krit: { waarde: "4164", tol: 60, waarom: "de omtrek volgt a_krit, dat in een vlak maximum ligt" },
      UC_pons: "0.505", v_Ed_0: "1.756", UC_pons_0: "0.416", UC_max: "0.640",
      a_s_min1: "748.7", a_s_min1_y: "772.2", A_s_min_y: "1853",
    },
    melding: /\(verankering\) ≤ 1,0 → de poer voldoet/,
  },
  {
    naam: "37 — poer op staal, excentrisch binnen de kern: M_Ed = 500 kNm, grondwater op de zool",
    invoer: { ...STAAL, F_Ed: 1200, M_Ed: 500, grondwater: 2 },
    // V_d,min = 1200 + 0,9·126,72 = 1314,0 → e = 500/1314,0 = 380,5 mm < B/6 = 400: geen kier, geen afwijking.
    // b′ = 2400 − 761,0 = 1639; s_q = 1 + 0,683·0,4487 = 1,306, s_γ = 1 − 0,3·0,683 = 0,795; γ′ = 20/1,1 − 10 = 8,18;
    // σ′ = 16,36·12,72·1,306 + 0,5·8,18·1,639·11,77·0,795 = 271,9 + 62,7 = 334,7 kPa → R_d = 334,7·1,639·2,4 = 1317 kN;
    // V_d = 1200 + 171,1 = 1371,1 → UC 1,041: voldoet niet.
    // Grondspanning: 1371,1/5,76·(1 ± 6·380,5/2400) = 238,0·(1 ± 0,951) = 464,5 en 11,6 kPa.
    handwerk: { e_x: "380.5", B_x_eff: "1639", s_q: "1.306", γ_eff: "8.182", σ_max_d: "334.7", R_d: "1317", UC_draag: "1.041", σ_x_max: "464.5", σ_x_min: "11.6" },
    melding: /\(draagvermogen\) > 1,0/,
  },
  {
    naam: "38 — poer op staal met een kier, bij de uitvoering speciale zorg: voldoet met de maatregelen van 6.5.4(1)P",
    invoer: { ...STAAL, B_x: 3200, F_Ed: 900, M_Ed: 700, s_langs: 125, h_poer: 700, D_aanleg: 1200, phi_k: 35, afwijking: 0 },
    // G_k = 25·7,68·0,7 + 18·7,52·0,5 = 134,4 + 67,7 = 202,1 kN; V_d = 900 + 272,8 = 1172,8; V_d,min = 1081,9;
    // e = 700/1081,9 = 647,0 mm > 3200/6 = 533,3: kier; zonder afwijking b′ = 3200 − 1294,1 = 1905,9, ℓ′ = 2400.
    // φ_d = atan(0,7002/1,15) = 31,34°: N_q = 21,45, N_γ = 24,90; s_q = 1,413, s_γ = 0,762.
    // g1 = 19,64·21,45·1,413 + 0,5·16,36·1,906·24,90·0,762 = 595,1 + 295,8 = 890,9 kPa; g2 (q = 0) = 295,8 kPa
    // → R_d = 295,8·1,906·2,4 = 1353 kN → UC 0,867. Contactlengte 3·(1600 − 647,0) = 2859.
    handwerk: { e_x_d: "647.0", B_x_eff: "1906", N_q: "21.45", N_γ: "24.90", σ_g2_d: "295.8", σ_max_d: "295.8", R_d: "1353", UC_draag: "0.867", L_c_x: "2859" },
    melding: /met de speciale maatregelen van 6\.5\.4\(1\)P → de poer voldoet/,
  },
  {
    naam: "39 — dezelfde poer met de plaatsingsafwijking van 0,1 m (6.5.4(2)): voldoet niet",
    invoer: { ...STAAL, B_x: 3200, F_Ed: 900, M_Ed: 700, s_langs: 125, h_poer: 700, D_aanleg: 1200, phi_k: 35 },
    // e_d = 647,0 + 100 = 747,0 → b′ = 1705,9; s_q = 1,370, s_γ = 0,787; g2 = 0,5·16,36·1,706·24,90·0,787 = 273,5 kPa
    // → R_d = 273,5·1,706·2,4 = 1120 kN → UC 1,048.
    handwerk: { e_x_d: "747.0", B_x_eff: "1706", σ_max_d: "273.5", R_d: "1120", UC_draag: "1.048" },
    melding: /\(draagvermogen\) > 1,0/,
  },
  {
    naam: "40 — poer op staal met H_Ed = 80 kN in x: hellingsfactoren en glijden",
    invoer: { ...STAAL, M_Ed: 100, H_Ed: 80 },
    // M op de onderkant = 100 + 80·0,6 = 148 kNm; e = 148/1614,0 = 91,7 mm → b′ = 2216,6 (in x, langs H), ℓ′ = 2400.
    // m = m_B = (2 + 0,9236)/(1 + 0,9236) = 1,520; i_q = (1 − 80/1614,0)^1,520 = 0,9256, i_γ = 0,9504^2,520 = 0,8798.
    // s_q = 1 + 0,9236·0,4487 = 1,414, s_γ = 1 − 0,277 = 0,723; σ′ = 16,36·12,72·1,414·0,9256 + 0,5·16,36·2,217·11,77·0,723·0,8798
    // = 272,5 + 135,8 = 408,3 kPa → R_d = 408,3·2,217·2,4 = 2172 kN → UC 1671,1/2172 = 0,769.
    // Glijden: δ_d = φ′_cv;d = 26,66°, R_h = 1614,0·0,5020 = 810,3 kN → UC 80/810,3 = 0,099.
    handwerk: { M_x_d: "148.0", m_i: "1.520", i_q: "0.9256", i_γ: "0.8798", σ_max_d: "408.3", R_d: "2172", UC_draag: "0.769", R_h_d: "810.3", UC_glij: "0.0987" },
  },
  {
    naam: "41 — poer op staal op trek (UPL, tabel A.15), grondwater op maaiveld, net Ø12-150 bovenin",
    invoer: { ...STAAL, belasting_staal: 2, F_Ed: 150, grondwater: 3, D_aanleg: 1500, d_boven: 12, s_boven: 150 },
    // G_k = 25·5,76·0,6 + 20·(5,76 − 0,16)·0,9 = 86,4 + 100,8 = 187,2 kN; U = 10·1,5·5,76 = 86,4 kN.
    // V_dst = 150 + 1,0·86,4 = 236,4; G_stb = 0,9·187,2 = 168,5 → UC 1,403; extra ballast (236,4 − 168,5)/0,9 = 75,5 kN.
    // Buiging bovenin: q = 150/5,76 = 26,04 kPa, uitkraging vanaf de kolomrand 1000: M = 26,04·2,4·1,0²/2 = 31,25 kNm;
    // d_x = 600 − 50 − 6 = 544 → A_s = 48 000·(544 − √(544² − 2·31,25e6/48 000))/434,8 = 132,3 mm² tegen 754·2,4 = 1810.
    handwerk: { G_k: "187.2", U_k: "86.4", V_dst_d: "236.4", G_stb_d: "168.5", UC_upl: "1.403", ΔG_k: "75.47", q_t: "26.04", M_b_x: "31.25", A_s_x_nodig: "132.3" },
    melding: /\(evenwicht tegen trek\) > 1,0/,
  },
  {
    naam: "42 — poer op staal op trek met EQU (tabel NB.3 – A1.2(A)): 1,1 op de waterdruk",
    invoer: { ...STAAL, belasting_staal: 2, F_Ed: 150, grondwater: 3, D_aanleg: 1500, d_boven: 12, s_boven: 150, factoren: 2 },
    // V_dst = 150 + 1,1·86,4 = 245,0 → UC 245,0/168,5 = 1,454.
    handwerk: { γ_G_dst: "1.1", V_dst_d: "245.0", UC_upl: "1.454" },
  },
  {
    naam: "43 — poer op staal op trek die voldoet: droog, F_Ed = 100 kN",
    invoer: { ...STAAL, belasting_staal: 2, F_Ed: 100, D_aanleg: 1500, d_boven: 12, s_boven: 150 },
    // G_k = 86,4 + 18·5,6·0,9 = 177,1 kN; G_stb = 159,4 → UC 100/159,4 = 0,627.
    handwerk: { G_k: "177.1", UC_upl: "0.627" },
    melding: /\(evenwicht tegen trek\) ≤ 1,0 → de poer voldoet/,
  },
  {
    naam: "44 — poer op staal, in twee richtingen excentrisch buiten de kern: een hoek komt los",
    invoer: { ...STAAL, M_Ed: 400, M_Ed_y: 400 },
    // e = 400/1614,0 = 247,8 mm in x en in y: 6·247,8/2400·2 = 1,24 > 1.
    handwerk: { e_x: "247.8", e_y: "247.8" },
    melding: /een hoek van de poer komt los/,
  },
  {
    naam: "45 — poer op staal, de resultante valt buiten de poer",
    invoer: { ...STAAL, F_Ed: 100, M_Ed: 500 },
    melding: /de resultante valt buiten de poer/,
  },
  {
    naam: "46 — poer op staal met de onderkant boven de bovenkant: invoer past niet",
    invoer: { ...STAAL, D_aanleg: 500 },
    melding: /invoer onvolledig/,
  },
  {
    naam: "47 — vierpaals poer met moment: kolom 500×500, M_Ed = 300 kNm in x, palen 400×400 h.o.h. 1500, h = 1000, 6Ø20 langs de randen",
    invoer: {
      poertype: 4, kolomvorm: 2, d_kolom: 500, b_kolom: 500, paalvorm: 1, b_paal: 400, l_paal: 400, h_poer: 1000, l_hoh: 1500,
      l_hoh_y: 1500, oversteek: 450, e_paal: 0, betonklasse: 30, c_dek: 50, n_langs: 6, d_langs: 20, F_Ed: 3000, M_Ed: 300, F_fr: 2000, R_cd: 0,
    },
    // Met de hand (N, mm, kN), C30/37: f_cd = 20, ν′ = 0,88, f_yd = 434,8, f_ctm = 2,896, f_ctd = 1,352.
    // G_k = 25·2,4·2,4·1,0 = 144,0 kN; N = 3000 + 1,35·144 = 3194,4 kN. Palen op x = ±750: Σx² = 4·0,75² = 2,25 m²
    // → ΔR = 300·0,75/2,25 = 100,0 kN; R_Ed = 798,6 + 100 = 898,6 kN, R_Ed,min = 698,6 kN.
    // Drukblok: e = 300/3000 = 100 mm → 300 × 500, σ = 3000e3/150 000 = 20,00 tegen 1,0·0,88·20 = 17,60 → UC_kn,1 = 1,136.
    // Kwart kolom: x_k = y_k = 125, a_x = a_y = 625, a = 883,9. Het vlak loodrecht op y is het zwaarst (blok 500 lang):
    // 2·898,6·625·500/3000 = 187 208 → z = (930 + √(864 900 − 374 417))/2 = (930 + 700,3)/2 = 815,2 mm.
    // (Werkelijk ligt de knoop van de zware palen dichter bij de palen, x ≈ 165: a_x = 625 is de veilige kant.)
    // F_td = 898,6·625/815,2 = 689,0 kN → A_s,nodig = 1585 mm² tegen 6·314,2 = 1885: UC 0,841.
    // Paalknoop: L_d = √(815,2² + 883,9²) = 1202,4; C_d = 898,6·1202,4/815,2 = 1325 kN; w_2 = (400·815,2 + 140·883,9)/1202,4
    // = 374,1; σ_d = 1325e3/(374,1·400) = 8,86 (σ_p = 5,616). Banden in x en y verankerd: (6.62), 0,75·17,6 = 13,20
    // → UC_kn,2 = 0,671 (met k_2 = 0,85 zou het 0,592 zijn).
    // Pons: kolomhoek (250; 250) tot paalhoek (550; 550): a = 424,3; v_Rd = 0,3395·1860/424,3 = 1,488 (v_min, k = 1,464);
    // u = 2000 + 2π·424,3 = 4666; W = 125 000 + 250 000 + 1000·424,3 + 4·424,3² + π·424,3·500 = 2,186e6;
    // v_Ed = 3194,4e3/(4666·930) + 0,6·300e6/(2,186e6·930) = 0,736 + 0,089 = 0,825 → UC 0,554.
    // Scheurwijdte: R_fr = 2144/4 + 100 = 636,0; σ_s = 689,0·636,0/898,6·1e3/1885 = 258,7; band 540 breed, h_c,ef = 175,
    // ρ = 0,01995; s_r,max = 170 + 0,17·20/0,01995 = 340,4; ε = (258,7 − 0,4·2,896/0,01995·1,1215)/2e5 = 9,68e-4
    // → w_k = 0,330 → UC 1,10.
    handwerk: {
      G_k: "144.0", ΔR_M: "100.0", R_Ed: "898.6", R_Ed_min: "698.6", A_blok: "150000", σ_Ed_1: "20.00", UC_kn_1: "1.136",
      a: "883.9", z: "815.2", F_td: "689.0", UC_trek: "0.841", C_d: "1325", w_2: "374.1", σ_d: "8.86", σ_p: "5.616",
      σ_Rd_2: "13.20", UC_kn_2: "0.671", a_pk: "424.3", v_Rd: "1.488", u_pk: "4666", v_Ed_k: "0.825", UC_pons_k: "0.554",
      R_fr: "636.0", σ_s: "258.7", ρ_p_eff: "0.01995", w_k: "0.330", UC_w: "1.10", UC_max: "1.136",
    },
    melding: /\(knoop onder de kolom\) > 1,0/,
  },
  {
    naam: "49 — als 47, maar trekbanden over de diagonalen, zonder haarspelden: k = 0,75",
    invoer: {
      poertype: 4, kolomvorm: 2, d_kolom: 500, b_kolom: 500, paalvorm: 1, b_paal: 400, l_paal: 400, h_poer: 1000, l_hoh: 1500,
      l_hoh_y: 1500, oversteek: 450, e_paal: 0, betonklasse: 30, c_dek: 50, n_langs: 6, d_langs: 20, F_Ed: 3000, M_Ed: 300, F_fr: 2000, R_cd: 0,
      trekbanden: 2,
    },
    // Staafwerk als set 47 (het zwaarste vlak door de knoop hangt niet af van de banden): z = 815,2, σ_d = 8,86.
    // Eén trekband over de diagonaal, maar de NB staat k_2 = 0,85 van (6.61) alleen toe met haarspelden loodrecht
    // op het vlak; zonder: 0,75·0,88·20 = 13,20 → UC_kn,2 = 8,86/13,20 = 0,671.
    handwerk: { z: "815.2", σ_d: "8.86", σ_Rd_2: "13.20", UC_kn_2: "0.671" },
  },
  {
    naam: "50 — als 49, met haarspelden loodrecht op het vlak: k_2 = 0,85",
    invoer: {
      poertype: 4, kolomvorm: 2, d_kolom: 500, b_kolom: 500, paalvorm: 1, b_paal: 400, l_paal: 400, h_poer: 1000, l_hoh: 1500,
      l_hoh_y: 1500, oversteek: 450, e_paal: 0, betonklasse: 30, c_dek: 50, n_langs: 6, d_langs: 20, F_Ed: 3000, M_Ed: 300, F_fr: 2000, R_cd: 0,
      trekbanden: 2, haarspelden: 1,
    },
    // 0,85·0,88·20 = 14,96 → UC_kn,2 = 8,86/14,96 = 0,592.
    // Pons rond de paal (ook in 47): a = 424,3, u = min(1600 + 2π·424,3; 2·450 + ¼·4266) = min(4266; 1966) = 1966,
    // afgesneden → β = 1,5: 1,5·898,6e3/(1966·930) = 0,737 tegen v_Rd = 1,488 → UC 0,495. Langs de paal: paalrand
    // 450 − 200 = 250 < d = 930 → u_0 = min(2790; 800) = 800: 1,5·898,6e3/(800·930) = 1,812; kolom 3000e3/(2000·930)
    // ·β_0 (1,043) = 1,682 → UC 1,812/4,224 = 0,429.
    handwerk: { σ_Rd_2: "14.96", UC_kn_2: "0.592", u_pp: "1966", UC_pons_p: "0.495", v_Ed_p0: "1.812", UC_pons_0: "0.429" },
  },
  {
    naam: "48 — poer op staal, dun met een grote dekking: binnen x_min = h/2 geen verankeringslengte",
    invoer: { ...STAAL, B_x: 700, B_y: 700, h_poer: 150, D_aanleg: 600, c_dek: 90, d_langs: 10, s_langs: 150, F_Ed: 100 },
    // x_min = h/2 = 75 mm < c = 90 mm: na de dekking blijft er niets over om te verankeren.
    // G_k = 25·0,49·0,15 + 18·0,33·0,45 = 1,838 + 2,673 = 4,511 kN; netto grondspanning = F/A = 100/0,49 = 204,1 kPa.
    // R = 204,1·0,7·0,075 = 10,71 kN, z_e = 350 − 37,5 − 140 = 172,5, d_x = 150 − 90 − 5 = 55:
    // F_s = 10,71·172,5/(0,9·55) = 37,34 kN; A_s = 523,6·0,7 = 366,5 mm² → σ = 101,9 → l_b,rqd = 2,5·101,9/3,041 = 83,7
    // → l_bd = 100 mm (8.6). In y (d_y = 45): F_s = 10,71·172,5/40,5 = 45,64 kN → σ = 124,5 → l_bd = 102,3 mm.
    // Beschikbaar 75 − 90 < 0: vóór de correctie UC = 102,3/(−15) = −6,8 en "voldoet";
    // nu ten minste 1 mm → UC_ank = 102,3 → voldoet niet.
    handwerk: { x_a: "75.0", F_s_x: "37.34", l_b_rqd_x: "83.7", l_bd_x: "100", F_s_y: "45.6", l_bd_y: "102.3", UC_ank: "102.3" },
    melding: /geen verankeringslengte over/,
  },
];

let fouten = 0;
for (const set of SETS) {
  const v = { ...STANDAARD, ...set.invoer };
  const cc = set.cc ?? 2;
  const selectValues = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, selectValues, { CC: cc, K_FI: cc === 1 ? 0.9 : cc === 3 ? 1.1 : 1.0 });
  const [reken_, verwacht] = v.poertype === 1 ? [uitwerkingStaal, verwachtingenStaal]
    : v.poertype >= 3 ? [uitwerking34, verwachtingen34] : [uitwerking, verwachtingen];
  const r = reken_(v, cc);
  if (r.geldig) fouten += toets(`${set.naam} — narekening`, got, verwacht(r, v));
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

// ── Een blad van vóór de keuze poertype ──────────────────────────────────────
// Na "Bladen bijwerken" heeft zo'n blad alleen de oude invoervelden: de nieuwe
// keuzelijsten staan op hun eerste keuze, de nieuwe '?'-velden op 0. Het moet
// dan exact rekenen als de tweepaals poer met de volledige standaardinvoer.
{
  console.log("\nBlad van vóór de keuze poertype");
  const OUDE_VELDEN = [
    "kolomvorm", "paalvorm", "d_kolom", "b_kolom", "b_paal", "l_paal", "b_poer", "h_poer", "l_hoh", "oversteek", "e_paal",
    "betonklasse", "betonstaal", "betonoppervlak", "c_dek", "n_langs", "d_langs", "n_sneden", "d_beugel", "s_beugel",
    "F_Ed", "M_Ed", "F_fr", "R_cd",
  ];
  let mis = 0, n = 0;
  for (const set of SETS.filter((s) => !("poertype" in s.invoer) && !(s.invoer.poertype > 2))) {
    const v = { ...STANDAARD, ...set.invoer };
    const scope = { CC: 2, K_FI: 1.0 };
    const oud = reken(tpl, Object.fromEntries(OUDE_VELDEN.map((k) => [k, String(v[k])])), scope);
    const nu = reken(tpl, Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)])), scope);
    const namen = new Set([...Object.keys(oud.values), ...Object.keys(nu.values)]);
    for (const k of namen) if (oud.values[k] !== nu.values[k]) { mis++; if (mis < 6) console.log(`  FOUT   ${set.naam.slice(0, 40)}: ${k} ${oud.values[k]} tegen ${nu.values[k]}`); }
    if (oud.text !== nu.text) { mis++; console.log(`  FOUT   ${set.naam.slice(0, 40)}: de uitwerking verschilt`); }
    n++;
  }
  if (mis) fouten++;
  console.log(`  ${mis ? "FOUT  " : "OK    "} ${n} sets met alleen de oude invoer rekenen gelijk aan poertype = 2`);
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
    // Namen met een komma in het blad (`l_hoh,y`) staan in het beeld met een liggend streepje.
    ...[...tpl.matchAll(/^\s*([\p{L}_][\p{L}\p{N}_,]*)\s*=\s*\?/gmu)].map((m) => m[1].replace(/,/g, "_")),
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

afronden(fouten, "Poer");
