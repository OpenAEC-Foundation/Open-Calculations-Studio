/**
 * Controlescript voor de module Voetplaatverbinding (NEN-EN 1993-1-8 met NB,
 * kegelbreuk volgens NEN-EN 1992-4).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten daarom op twee manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript: de T-stukken onder druk
 *      (§6.2.5), de ankerrij met de voetplaat op buiging (tabel 6.2 en 6.6),
 *      bij ankers binnen het profiel het T-stuk rond het lijf (tabel 6.4), de
 *      krachtsverdeling bij N en M (tabel 6.7), de kegelbreuk, afschuiving
 *      met wrijving en α_bc (§6.2.2), de interactie per anker (tabel 3.4), de
 *      hoeklassen en de voorwaarden voor blokhoogte, randafstand (tabel 3.3,
 *      met d_0 naar de gatspeling van EN 1090-2 tabel 11) en plaatdikte
 *      (tabel 3.1). Is de ondersabeling dikker dan 0,2·min(b_p; d_p), of ligt
 *      er een rand dichtbij terwijl ankers trek krijgen, dan is de verbinding
 *      niet volledig getoetst en mag de rapportkop geen "voldoet" lezen.
 *   2. Voor een aantal sets de getallen van een handberekening, en bij de
 *      invoercontroles de melding in het blad.
 *
 * Daarnaast: de profieltabel van het beeld moet gelijk lopen met de matrix in
 * het blad.
 *
 * Draaien:  node scripts/check-voetplaat.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("voetplaatverbinding.ts");

const STANDAARD = {
  profile: 11, staalsoort: 235, hoeklas: 6, ank_opzet: 2, t_p: 25, d_p: 460, b_p: 380, e_d: 40, e_b: 40,
  d_anker: 24, kwaliteit: 8.8, gatspeling: 1, h_ef: 200, betonklasse: 25, gescheurd: 1, positie: 1,
  t_g: 30, h_b: 300, N_Ed: 300, M_Ed: 0, V_Ed: 0, wrijving: 1,
};

/** id → h, b, t_w, t_f (mm), A (mm²), W_pl,y (mm³) — Europese profieltabel. */
const PROFIEL = {
  6: { h: 200, b: 200, tw: 9, tf: 15, A: 7810, Wpl: 642e3 },
  11: { h: 300, b: 300, tw: 11, tf: 19, A: 14900, Wpl: 1870e3 },
  21: { h: 190, b: 200, tw: 6.5, tf: 10, A: 5380, Wpl: 430e3 },
  35: { h: 300, b: 150, tw: 7.1, tf: 10.7, A: 5380, Wpl: 628e3 },
};
const AS = { 12: 84.3, 16: 157, 20: 245, 24: 353, 30: 561, 36: 817 };
const FYB = { 4.6: 240, 5.6: 300, 8.8: 640, 10.9: 900 };
const FUB = { 4.6: 400, 5.6: 500, 8.8: 800, 10.9: 1000 };

// ── Onafhankelijke uitwerking; eenheden N en mm ─────────────────────────────
function uitwerking(v) {
  const p = PROFIEL[v.profile];
  // Tabel 3.1 (EN 10025-2): t ≤ 40 mm voor de kolom; de plaat naar haar dikte.
  const fy = v.staalsoort, fu = { 235: 360, 275: 430, 355: 490 }[fy], bw = { 235: 0.8, 275: 0.85, 355: 0.9 }[fy];
  const fyp = v.t_p <= 40 ? fy : fy - 20, fup = v.t_p <= 40 ? fu : { 235: 360, 275: 410, 355: 470 }[fy];
  const flush = v.ank_opzet === 1 || v.ank_opzet === 6;
  const na = v.ank_opzet === 1 ? 2 : v.ank_opzet === 2 || v.ank_opzet === 6 ? 4 : 6;
  const dp = flush ? Math.min(v.d_p, p.h) : Math.max(v.d_p, p.h), bp = Math.max(v.b_p, p.b);
  const xE = dp / 2 - v.e_d, yE = bp / 2 - v.e_b;
  const xh = (p.h / 2 - p.tf) / 2, yg = (p.tw / 2 + p.b / 2) / 2;
  const xmax = v.ank_opzet === 1 ? 0 : v.ank_opzet === 6 ? xh : xE, ymax = flush ? yg : yE;
  const d = v.d_anker, As = AS[d], fyb = FYB[v.kwaliteit], fub = FUB[v.kwaliteit];
  const N = v.N_Ed * 1e3, M = Math.abs(v.M_Ed) * 1e6, V = Math.abs(v.V_Ed) * 1e3;

  // druk: T-stukken
  const fcd = v.betonklasse / 1.5;
  const kj = v.positie === 1 ? Math.min(3, 1 + v.h_b / Math.max(bp, dp)) : 1;
  const fjd = (2 / 3) * kj * fcd;
  const c = v.t_p * Math.sqrt(fyp / (3 * fjd));
  const cp = (dp - p.h) / 2, ci = Math.min(c, (p.h - 2 * p.tf) / 2);
  const Fcpl = fjd * (p.tf + Math.min(c, cp) + ci) * Math.min(p.b + 2 * c, bp);
  const Njrd = 2 * Fcpl + fjd * Math.min(p.tw + 2 * c, bp) * Math.max(0, p.h - 2 * p.tf - 2 * c);
  const FCrd = Math.min(Fcpl, (p.Wpl * fy) / (p.h - p.tf));

  // trek: ankers en plaat
  const Ftrd = (0.9 * fub * As) / 1.25;
  let FTrd = null;
  if (!flush) {
    const mx = xE - p.h / 2 - 0.8 * Math.SQRT2 * v.hoeklas, w = 2 * yE, e = v.e_b, ex = v.e_d;
    const lcp = Math.min(2 * Math.PI * mx, Math.PI * mx + w, Math.PI * mx + 2 * e);
    const lnc = Math.min(4 * mx + 1.25 * ex, e + 2 * mx + 0.625 * ex, 0.5 * bp, 0.5 * w + 2 * mx + 0.625 * ex);
    const l1 = Math.min(lcp, lnc);
    const Mpl1 = 0.25 * l1 * v.t_p ** 2 * fyp, Mpl2 = 0.25 * lnc * v.t_p ** 2 * fyp;
    const n = Math.min(ex, 1.25 * mx);
    const Lb = 8 * d + v.t_g + v.t_p + 0.6 * d, Lbs = (8.8 * mx ** 3 * As) / (l1 * v.t_p ** 3);
    const F12 = (2 * Mpl1) / mx, F2 = (2 * Mpl2 + n * 2 * Ftrd) / (mx + n), F3 = 2 * Ftrd, Ffl = p.b * p.tf * fy;
    FTrd = Lb > Lbs ? Math.min(F12, F3, Ffl) : Math.min(F12, F2, F3, Ffl);
  } else if (N < 0) {
    // T-stuk rond het lijf (tabel 6.4, rij zonder verstijving): per kant n_a/2
    // ankers; F_T,Rd geldt voor het hele T-stuk, dus voor alle ankers samen.
    const mw = yg - p.tw / 2 - 0.8 * Math.SQRT2 * v.hoeklas, ew = bp / 2 - yg, sw = 2 * xh;
    const lcp = v.ank_opzet === 1 ? 2 * Math.PI * mw : Math.min(4 * Math.PI * mw, 2 * Math.PI * mw + 2 * sw);
    const lnc = v.ank_opzet === 1 ? 4 * mw + 1.25 * ew : Math.min(8 * mw + 2.5 * ew, 4 * mw + 1.25 * ew + sw);
    const l1 = Math.min(lcp, lnc);
    const Mpl1 = 0.25 * l1 * v.t_p ** 2 * fyp, Mpl2 = 0.25 * lnc * v.t_p ** 2 * fyp;
    const n = Math.min(ew, 1.25 * mw);
    const Lb = 8 * d + v.t_g + v.t_p + 0.6 * d, Lbs = (8.8 * mw ** 3 * As * (na / 2)) / (l1 * v.t_p ** 3);
    const F12 = (2 * Mpl1) / mw, F2 = (2 * Mpl2 + n * na * Ftrd) / (mw + n), F3 = na * Ftrd, Fwb = l1 * p.tw * fy;
    FTrd = Lb > Lbs ? Math.min(F12, F3, Fwb) : Math.min(F12, F2, F3, Fwb);
  }

  // krachtsverdeling
  let UCc = 0, UCt = 0, FT = 0, Fta = 0, Fgroep = 0, sx = 0, sy = 0, psi = 1, schar = false;
  const zC = (p.h - p.tf) / 2;
  if (flush) {
    if (M > 0) schar = true;
    else if (N >= 0) UCc = N / Njrd;
    else {
      Fta = -N / na; UCt = -N / FTrd; Fgroep = -N;
      sx = v.ank_opzet === 6 ? 2 * xh : 0; sy = 2 * yg;
    }
  } else {
    const zT = xE, z = zT + zC;
    if (M === 0 && N >= 0) UCc = N / Njrd;
    else {
      const FT0 = (M - N * zC) / z;
      if (FT0 <= 0) UCc = (N / 2 + M / (2 * zC)) / FCrd;
      else if (N + FT0 > 0) {
        FT = FT0; UCc = (N + FT) / FCrd; UCt = FT / FTrd; Fta = FT / 2; Fgroep = FT; sy = 2 * yE;
      } else {
        FT = -N / 2 + M / (2 * zT); UCt = FT / FTrd; Fta = FT / 2; Fgroep = -N;
        sx = 2 * xE; sy = 2 * yE; psi = 1 / (1 + (2 * (M / -N)) / (3 * v.h_ef));
      }
    }
  }

  // kegelbreuk
  let UCk = 0;
  if (Fgroep > 0) {
    const k1 = v.gescheurd === 1 ? 8.9 : 12.7, scr = 3 * v.h_ef;
    const N0 = k1 * Math.sqrt(v.betonklasse) * v.h_ef ** 1.5;
    const Ac = (scr + Math.min(sx, scr)) * (scr + Math.min(sy, scr));
    const Nrdc = (N0 * (Ac / scr ** 2) * Math.min(1, 0.5 + v.h_ef / 200) * psi) / 1.5;
    UCk = Fgroep / Nrdc;
  }

  // afschuiving
  const Ff = v.wrijving === 1 ? 0.2 * Math.max(N, 0) : 0;
  // §3.3(1): ankers op afschuiving hebben f_yb ≤ 640 N/mm²; 10.9 telt daar niet mee.
  const F2vb = fyb <= 640 ? ((0.44 - 0.0003 * fyb) * fub * As) / 1.25 : 0;
  // EN 1090-2 tabel 11: normale speling 1/2/3 mm, vergrote gaten 3/4/6/8 mm.
  const d0 = d + (v.gatspeling === 1 ? (d <= 14 ? 1 : d <= 24 ? 2 : 3) : (d <= 12 ? 3 : d <= 22 ? 4 : d <= 24 ? 6 : 8));
  const e1 = dp / 2 - xmax, e2 = bp / 2 - ymax;
  const ab = Math.min(e1 / (3 * d0), fub / fup, 1), k1s = Math.max(Math.min((2.8 * e2) / d0 - 1.7, 2.5), 0);
  const F1vb = (k1s * ab * fup * d * v.t_p) / 1.25;
  const Fvb = Math.min(F1vb, F2vb);
  const nv = v.gatspeling === 1 && fyb <= 640 ? na : 0;
  const Vrd = Ff + nv * Fvb;
  // Geen dwarskracht is UC 0, ook zonder weerstand; dwarskracht zonder weerstand voldoet niet.
  const UCv = V > 0 ? V / Vrd : 0;
  const UCtv = Fta > 0 && nv > 0 ? Math.max(V - Ff, 0) / nv / Fvb + Fta / (1.4 * Ftrd) : 0;

  // lassen: f_u van het zwakste deel (§4.5.3.2(6)), dus van de plaat
  const Ffl = Math.max(M / (p.h - p.tf) - (N * p.b * p.tf) / p.A, 0);
  const afl = (Math.SQRT2 * (Ffl / (2 * p.b - p.tw)) * bw * 1.25) / fup;
  const Aw = (p.h - 2 * p.tf) * p.tw;
  const Fdw = (Math.max(-N, 0) * Aw) / p.A / (2 * (p.h - 2 * p.tf)), Fla = V / (2 * (p.h - 2 * p.tf));
  const aw = (Math.sqrt(2 * Fdw ** 2 + 3 * Fla ** 2) * bw * 1.25) / fup;
  const UClas = Math.max(3, afl, aw) / v.hoeklas;

  // Voorwaarden die los van de UC "voldoet niet" geven: blokhoogte (standaard
  // 50 mm onder de ankerplaat), randafstand ≥ 1,2·d_0 (tabel 3.3), plaat ≤ 80 mm.
  const ok = v.h_b >= v.h_ef + (v.c_onder ?? 50) && Math.min(e1, e2) >= 1.2 * d0 && v.t_p <= 80;
  // Voorwaarden van de toetsen zelf: β_j = 2/3 alleen bij t_g ≤ 0,2·min(b_p; d_p)
  // (§6.2.5(7)); de kegelbreuk alleen zonder rand dichtbij.
  const volledig = v.t_g <= 0.2 * Math.min(bp, dp) && (v.positie === 1 || Fgroep <= 0);

  const UCmax = Math.max(UCc, UCt, UCk, UCv, UCtv, UClas);
  return { kj, fjd, c, Fcpl, Njrd, FCrd, Ftrd, FTrd, FT, UCc, UCt, UCk, F2vb, F1vb, Vrd, UCv, UCtv, UClas, UCmax, schar, ok, volledig };
}

const s4 = (x) => {
  if (x === 0) return "0";
  const dec = Math.max(0, 3 - Math.floor(Math.log10(Math.abs(x))));
  return x.toFixed(dec);
};
const ruim = (x) => ({ waarde: s4(x), tol: Math.max(Math.abs(x) * 0.002, 1e-6) });

function verwachtingen(r, v) {
  const uit = {
    k_j: ruim(r.kj), f_jd: ruim(r.fjd), c: ruim(r.c), F_c_pl_Rd: ruim(r.Fcpl / 1e3), N_j_Rd: ruim(r.Njrd / 1e3),
    F_C_Rd: ruim(r.FCrd / 1e3), F_t_Rd: ruim(r.Ftrd / 1e3), F_1_vb_Rd: ruim(r.F1vb / 1e3),
    V_Rd: ruim(r.Vrd / 1e3), UC_v: ruim(r.UCv), UC_las: ruim(r.UClas), UC_max: ruim(r.UCmax),
  };
  // Een toets die in deze situatie niet speelt, staat in het blad niet als getal.
  for (const [k, x] of [["UC_c", r.UCc], ["UC_t", r.UCt], ["UC_kegel", r.UCk], ["UC_tv", r.UCtv]]) if (x > 0) uit[k] = ruim(x);
  // Ankers 10.9 werken niet op afschuiving: dan staat (6.2) niet in het blad.
  if (r.F2vb > 0) uit.F_2_vb_Rd = ruim(r.F2vb / 1e3);
  if (r.FTrd !== null) uit.F_T_Rd = ruim(r.FTrd / 1e3);
  if (r.FT > 0) uit.F_T = ruim(r.FT / 1e3);
  // Dwarskracht zonder weerstand: het blad geeft een melding in plaats van een oneindige UC.
  for (const k of ["UC_v", "UC_max"]) if (!Number.isFinite(Number(uit[k].waarde))) delete uit[k];
  return uit;
}

const SETS = [
  {
    naam: "1 — standaard: HEB 300 op 460 × 380 × 25, 4 × M24 8.8, alleen druk",
    invoer: {},
  },
  {
    naam: "2 — standaard met M = 60 kNm en V = 50 kN: één kant getrokken",
    invoer: { M_Ed: 60, V_Ed: 50 },
    // Met de hand: k_j = 1 + 300/460 = 1,652, f_jd = 2/3·1,652·16,67 = 18,36 N/mm²,
    // c = 25·√(235/(3·18,36)) = 51,6 mm → T-stuk onder een flens (19 + 51,6 + 51,6)·380·18,36
    // = 853 kN. Ankerrij: m_x = 190 − 150 − 0,8·√2·6 = 33,2 mm, l_eff = 131,4 mm
    // (e + 2m_x + 0,625e_x), M_pl = 0,25·131,4·25²·235 = 4,83 kNm → F_T,1-2 = 2·4,83/0,0332
    // = 290,6 kN (L_b = 261 > L_b* = 55: geen wrikkracht). z_C = 140,5, z_T = 190 mm:
    // F_T = (60 000 − 300·140,5)/330,5 = 54,0 kN, F_C = 354 kN → UC 0,415. Afschuiving:
    // α_bc = 0,44 − 0,0003·640 = 0,248 → 56,0 kN per anker; V_Rd = 0,2·300 + 4·56,0 = 284 kN.
    handwerk: { k_j: "1.652", f_jd: "18.36", c: "51.6", F_c_pl_Rd: "853", F_T_Rd: "290.6", F_T: "54.0", UC_c: "0.415", F_2_vb_Rd: "56.0", V_Rd: "284" },
  },
  {
    naam: "3 — groot moment met weinig druk, S355, 6 ankers (opzet 5), ongescheurd",
    invoer: { staalsoort: 355, ank_opzet: 5, N_Ed: 50, M_Ed: 90, V_Ed: 30, t_p: 30, gescheurd: 0, hoeklas: 8 },
    // S355 volgens EN 10025-2 met t ≤ 40 mm: f_u = 490 N/mm² (tabel 3.1 van de A1:2014-versie;
    // 510 geldt alleen voor buisprofielen S355H). Stuik: α_b = min(40/(3·26); 800/490; 1) = 0,5128,
    // k_1 = min(2,8·40/26 − 1,7; 2,5) = 2,5 → F_1,vb,Rd = 2,5·0,5128·490·24·30/1,25 = 361,8 kN.
    // V_Rd blijft 0,2·50 + 6·56,0 = 346,2 kN.
    handwerk: { f_u: "490", F_1_vb_Rd: "361.8", V_Rd: "346.2" },
  },
  {
    naam: "4 — opwaartse kracht met klein moment: beide ankerrijen getrokken, M20 5.6",
    invoer: { N_Ed: -120, M_Ed: 8, d_anker: 20, kwaliteit: 5.6, V_Ed: 20 },
  },
  {
    naam: "5 — HEA 200, plaat gelijk met het profiel, 2 ankers, opwaarts (scharnierend)",
    invoer: { profile: 21, ank_opzet: 1, d_p: 190, b_p: 300, e_b: 40, N_Ed: -40, V_Ed: 15, d_anker: 16 },
  },
  {
    naam: "6 — IPE 300 met 4 ankers binnen het profiel, zuivere druk, rand dichtbij (k_j = 1)",
    invoer: { profile: 35, ank_opzet: 6, d_p: 300, b_p: 150, positie: 3, N_Ed: 400 },
  },
  {
    naam: "7 — HEB 200, beide kanten gedrukt, vergrote gaten: afschuiving alleen via wrijving",
    invoer: { profile: 6, d_p: 360, b_p: 300, N_Ed: 500, M_Ed: 25, V_Ed: 80, gatspeling: 0 },
  },
  {
    naam: "8 — dunne plaat met de ankers ver van de flens: wrikkracht voor de ankers (L_b ≤ L_b*)",
    invoer: { t_p: 10, d_p: 520, e_d: 40, N_Ed: 20, M_Ed: 40, d_anker: 16, kwaliteit: 4.6 },
  },
  {
    naam: "9 — HEA 200, opzet 1, dunne plaat, opwaarts: de plaat buigt rond het lijf",
    invoer: { profile: 21, ank_opzet: 1, d_p: 190, b_p: 200, t_p: 10, d_anker: 16, h_ef: 300, h_b: 400, N_Ed: -150 },
    // Met de hand: y_g = (3,25 + 100)/2 = 51,63; m_w = 51,63 − 3,25 − 0,8·√2·6 = 41,59 mm;
    // e_w = 100 − 51,63 = 48,38 mm; l_eff = min(2π·41,59 = 261,3; 4·41,59 + 1,25·48,38 = 226,8)
    // = 226,8 mm; M_pl = 0,25·226,8·10²·235 = 1,333 kNm → F_T,1-2 = 2·1,333/0,04159 = 64,1 kN.
    // Dat is de weerstand van het hele T-stuk, dus van beide ankers samen (tabel 6.2: in
    // modus 3 is het ΣF_t,Rd van alle ankers). UC_t = 150/64,1 = 2,34.
    handwerk: { F_T_Rd: "64.1", UC_t: "2.34" },
  },
  {
    naam: "10 — HEA 200, opzet 6: vier ankers, per kant twee als groep langs het lijf",
    invoer: { profile: 21, ank_opzet: 6, d_p: 190, b_p: 200, t_p: 10, d_anker: 16, h_ef: 300, h_b: 400, N_Ed: -150 },
    // Met de hand: s = 2·x_h = 2·(95 − 10)/2 = 85 mm; l_eff,cp = min(4π·41,59 = 522,6;
    // 2π·41,59 + 2·85 = 431,3); l_eff,nc = min(8·41,59 + 2,5·48,38 = 453,6; 226,8 + 85 = 311,8)
    // → l_eff = 311,8 mm; M_pl = 0,25·311,8·10²·235 = 1,832 kNm; F_T,1-2 = 2·1,832/0,04159
    // = 88,1 kN voor de vier ankers samen. UC_t = 150/88,1 = 1,70.
    handwerk: { F_T_Rd: "88.1", UC_t: "1.70" },
  },
  {
    naam: "11 — opwaarts zonder dwarskracht, vergrote gaten: geen afschuifweerstand nodig",
    invoer: { N_Ed: -100, gatspeling: 0 },
    // V_Rd = 0 en V_Ed = 0: UC_v = 0; maatgevend is de las met 3/6 = 0,50 → voldoet.
    handwerk: { V_Rd: "0", UC_v: "0", UC_max: "0.500" },
  },
  {
    naam: "12 — dwarskracht zonder wrijving en met vergrote gaten: geen afschuifweerstand",
    invoer: { N_Ed: 100, wrijving: 0, gatspeling: 0, V_Ed: 10 },
    melding: /Geen afschuifweerstand/,
  },
  {
    naam: "13 — plaat van 50 mm: f_y en f_u van de plaat voor 40 < t ≤ 80 mm, ondersabeling 60 mm",
    invoer: { t_p: 50, d_p: 560, e_d: 50, d_anker: 30, M_Ed: 180, N_Ed: 100, t_g: 60 },
    // Tabel 3.1, S235 met 40 < t ≤ 80: f_y = 215 N/mm². k_j = 1 + 300/560 = 1,536,
    // f_jd = 2/3·1,536·16,67 = 17,06 → c = 50·√(215/(3·17,06)) = 102,5 mm. Ankerrij:
    // m_x = 230 − 150 − 6,79 = 73,21 mm, l_eff = 0,5·380 = 190 mm → M_pl = 0,25·190·50²·215
    // = 25,53 kNm → F_T,1-2 = 2·25,53/0,07321 = 697,5 kN. t_g = 60 > 50: f_ck,g ≥ f_ck = 25.
    handwerk: { f_y_p: "215", c: "102.5", F_T_12_Rd: "697.5", f_ck_g: "25" },
  },
  {
    naam: "14 — verankering dieper dan het blok: h_ef = 400 in een blok van 300 mm",
    invoer: { N_Ed: -150, h_ef: 400, h_b: 300 },
    melding: /te laag voor de verankeringsdiepte/,
  },
  {
    naam: "15 — randafstand 25 mm bij M24: kleiner dan 1,2·d_0 = 31,2 mm (tabel 3.3)",
    invoer: { e_d: 25, e_b: 25 },
    melding: /randafstand van de ankers is kleiner/,
  },
  {
    naam: "16 — vergrote gaten, randafstand 35 mm bij M24: d_0 uit EN 1090-2 tabel 11",
    invoer: { e_d: 35, e_b: 35, gatspeling: 0, N_Ed: -100 },
    // Met de hand: vergrote gaten bij M24 geven 6 mm speling, d_0 = 30 mm, dus
    // 1,2·d_0 = 36 mm > 35 mm. Met normale gaten (d_0 = 26) was 31,2 mm voldoende.
    handwerk: { d_0: "30" },
    melding: /randafstand van de ankers is kleiner/,
  },
  {
    naam: "17 — ondersabeling 90 mm onder 460 × 380: dikker dan 0,2·min(b_p; d_p)",
    invoer: { t_g: 90 },
    // Met de hand: t_g,max = 0,2·380 = 76 mm < 90 mm, dus β_j = 2/3 geldt niet.
    // UC_max = 0,50 (las), maar de slotzin mag geen "voldoet" geven.
    handwerk: { t_g_max: "76", f_ck_g: "25", UC_max: "0.500" },
    melding: /niet volledig getoetst/,
  },
  {
    naam: "18 — één rand dichtbij met getrokken ankers: kegelbreuk zonder rand",
    invoer: { positie: 2, M_Ed: 60, V_Ed: 50 },
    // Als set 2, maar k_j = 1: f_jd = 2/3·16,67 = 11,11 N/mm². De kegelbreuk is
    // zonder rand gerekend, dus de verbinding is niet volledig getoetst.
    handwerk: { k_j: "1", f_jd: "11.11" },
    melding: /niet volledig getoetst/,
  },
  {
    naam: "19 — HEB 300, S355, plaat 500 × 400 × 30, M = 190 kNm: de hoeklas met f_u = 490",
    invoer: { staalsoort: 355, t_p: 30, d_p: 500, b_p: 400, e_d: 50, e_b: 50, N_Ed: 200, M_Ed: 190, V_Ed: 60, hoeklas: 3.2 },
    // Met de hand: F_M = 190 000/(300 − 19) = 676,2 kN, F_N = 200·300·19/14 900 = 76,5 kN →
    // F_fl = 599,6 kN; a_fl,req = √2·599 600/(2·300 − 11)·0,9·1,25/490 = 3,306 mm → UC_las =
    // 3,306/3,2 = 1,033: voldoet niet (met 510 was het 3,176 mm en UC 0,993). Stuik:
    // α_b = min(50/78; 800/490; 1) = 0,6410, k_1 = 2,5 → F_1,vb,Rd = 2,5·0,6410·490·24·30/1,25
    // = 452,3 kN (470,8 kN met 510).
    handwerk: { a_fl_req: "3.306", UC_las: "1.033", F_1_vb_Rd: "452.3" },
  },
  {
    naam: "20 — ankers 10.9 met dwarskracht: f_yb > 640 N/mm², alleen de wrijving telt (§3.3(1))",
    invoer: { kwaliteit: 10.9, M_Ed: 60, V_Ed: 50 },
    // Met de hand: n_v = 0 en F_2,vb,Rd = 0; V_Rd = F_f,Rd = 0,2·300 = 60 kN → UC_v = 50/60 = 0,833.
    // Eerder telde (6.2) met α_bc = 0,44 − 0,0003·900 = 0,17 doorgetrokken: V_Rd = 60 + 4·48,0 = 252 kN.
    handwerk: { n_v: "0", V_Rd: "60.0", UC_v: "0.833" },
  },
  {
    naam: "21 — ankers 10.9, opwaarts met dwarskracht: geen afschuifweerstand",
    invoer: { kwaliteit: 10.9, N_Ed: -100, V_Ed: 20 },
    melding: /Geen afschuifweerstand/,
  },
];

let fouten = 0;
for (const set of SETS) {
  const v = { ...STANDAARD, ...set.invoer };
  const selectValues = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, selectValues, { CC: 2, K_FI: 1 });
  const r = uitwerking(v);
  fouten += toets(`${set.naam} — narekening`, got, verwachtingen(r, v));
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk);
  let ok;
  if (r.schar) {
    ok = /een scharnierende kolomvoet kan het moment niet overbrengen/.test(got.text);
  } else {
    // Zoals de rapportkop het leest (bladResultaat.ts): de slotzin vanaf
    // "Maatgevende UC" bevat "voldoet" en niet "voldoet niet".
    const i = got.text.lastIndexOf("Maatgevende UC");
    const zin = i >= 0 ? got.text.slice(i, i + 240) : "";
    const voldoet = !/voldoe[nt] niet/.test(zin) && /voldoe[nt]/.test(zin);
    const wil = r.ok && r.volledig && r.UCmax <= 1;
    ok = voldoet === wil;
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    ons ${voldoet ? "voldoet" : "voldoet niet"}   narekening ${wil ? "voldoet" : "voldoet niet"}`);
  }
  if (!ok) fouten++;
  if (set.melding) {
    const gezien = set.melding.test(got.text);
    if (!gezien) fouten++;
    console.log(`  ${gezien ? "OK    " : "FOUT  "} melding    ${set.melding.source}`);
  }
}

// ── De profieltabel van het beeld loopt gelijk met het blad ─────────────────
{
  console.log("\nProfieltabel van het beeld tegen de matrix van het blad");
  const ts = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../packages/desktop/src/components/calc/VoetplaatDesigner.tsx"), "utf8");
  const beeld = new Map(
    [...ts.matchAll(/^\s*(\d+): \{ name: "([^"]+)", h: ([\d.]+), b: ([\d.]+), tw: ([\d.]+), tf: ([\d.]+) \}/gm)]
      .map((m) => [Number(m[1]), { naam: m[2], maten: m.slice(3, 7).map(Number) }]),
  );
  const keuze = tpl.slice(tpl.indexOf("@select profile"), tpl.indexOf("@end", tpl.indexOf("@select profile")));
  const opties = [...keuze.matchAll(/^\s+(.+?) = (\d+)$/gm)].map((m) => [Number(m[2]), m[1]]);
  const matrix = tpl.match(/profielen = \[([^\]]+)\]/)[1].split("|").map((k) => k.split(";").map((x) => Number(x.trim())));
  let ok = opties.length === beeld.size;
  for (const [id, naam] of opties) {
    const b = beeld.get(id), k = matrix[0].indexOf(id);
    const maten = [1, 2, 3, 4].map((r) => matrix[r][k]);
    if (!b || b.naam !== naam || b.maten.some((x, i) => x !== maten[i])) {
      ok = false;
      console.log(`  FOUT   id ${id}: blad "${naam}" ${maten.join("/")}, beeld ${b ? `"${b.naam}" ${b.maten.join("/")}` : "ontbreekt"}`);
    }
  }
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${opties.length} profielen in de keuzelijst, ${beeld.size} in het beeld`);
}

afronden(fouten, "Voetplaatverbinding");
