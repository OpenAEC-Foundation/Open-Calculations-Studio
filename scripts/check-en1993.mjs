/**
 * Controlescript voor de EC3-normbladen (templates/en1993.ts).
 *
 * Er is geen referentieberekening. Het script rekent daarom op twee manieren
 * na, net als check-gevelkolom:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript van knik (knikkromme uit
 *      tabel 6.2, bij klasse 4 A_eff volgens NEN-EN 1993-1-5 §4.4 met (6.51)
 *      en (6.48)), kip (M_cr met C_2·z_g, kipkromme uit tabel 6.4/6.5, de grens
 *      1/λ̄² van 6.3.2.3), de doorsnedeklasse (tabel 5.2 met α en ψ), buiging
 *      met normaalkracht (6.2.9.1 of 6.42), de volledige liggertoets (met
 *      kipsteunen per veld volgens NB.NB.4.3 en buiging met dwarskracht volgens
 *      6.2.8) en de doorbuiging met w_bij. Het blad moet daar op vier cijfers
 *      mee kloppen.
 *   2. Getallen van een handberekening, als commentaar bij de set.
 *
 * Elk toetsblad sluit af met de slotzin "Maatgevende UC = … → voldoet", die de
 * rapportkop leest; het script controleert dat oordeel tegen de UC. Klasse 4
 * en een lijf dat op plooi door afschuiving moet worden getoetst keuren af.
 *
 * De bladen hebben vaste profielgegevens in de bron; een set die een ander
 * profiel toetst, vervangt die regels (`vervang`).
 *
 * Draaien:  node scripts/check-en1993.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { reken, toets, afronden } from "./lib/refcheck.mjs";

const BRON = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../packages/desktop/src/templates/en1993.ts"),
  "utf8",
);

/** De bladtekst van één export uit en1993.ts. */
function blad(naam) {
  const kop = `export const ${naam} = \``;
  const b = BRON.indexOf(kop);
  if (b < 0) throw new Error(`blad ${naam} niet gevonden`);
  return BRON.slice(b + kop.length, BRON.indexOf("`;", b));
}

/** Vervangt vaste toekenningen (`A = 5381 mm^2`) door andere profielgegevens. */
function vervang(tpl, regels = {}) {
  for (const [naam, waarde] of Object.entries(regels)) {
    const re = new RegExp(`^${naam} = .*$`, "m");
    if (!re.test(tpl)) throw new Error(`geen regel ${naam}`);
    tpl = tpl.replace(re, `${naam} = ${waarde}`);
  }
  return tpl;
}

const PROJECT = { CC: 2, K_FI: 1, rekenwijze: 1 };
const ruim = (x) => ({ waarde: String(Number(x.toPrecision(4))), tol: Math.max(Math.abs(x) * 0.002, 1e-6) });
const E = 210000, G = 81000;
const LETTER = { 0.21: "a", 0.34: "b", 0.49: "c", 0.76: "d" };

/** χ volgens (6.49) of (6.56). */
const chi = (lam, a, lam0 = 0.2, beta = 1, grens = false) => {
  const F = 0.5 * (1 + a * (lam - lam0) + beta * lam * lam);
  const x = 1 / (F + Math.sqrt(F * F - beta * lam * lam));
  return Math.min(1, x, grens ? 1 / (lam * lam) : Infinity);
};

// ── Knik (ec3Knik) ──────────────────────────────────────────────────────────
function knik(v) {
  const { A, Iy, Iz, h, b, tw, tf, r, fy, Ly, Lz, doorsnede } = v;
  // Tabel 6.2, kolom S235–S420: [y, z] als index in a, b, c, d.
  let k;
  if (doorsnede === 1) k = h / b > 1.2 && tf <= 40 ? [0, 1] : tf <= 100 ? [1, 2] : [3, 3];
  else if (doorsnede === 2) k = tf <= 40 ? [1, 2] : [2, 3];
  else k = { 3: [0, 0], 4: [2, 2], 5: [2, 2], 6: [1, 1] }[doorsnede];
  const alfa = [0.21, 0.34, 0.49, 0.76];
  // Klasse 4 bij zuivere druk: I-profiel volgens NEN-EN 1993-1-5 §4.4 (ψ = 1,
  // k_σ = 4 voor het lijf en 0,43 voor de flens), anders de opgegeven A_eff.
  let Aeff = A;
  if (doorsnede <= 2) {
    const eps = Math.sqrt(235 / fy);
    const cw = h - 2 * tf - 2 * r, cf = (b - tw - 2 * r) / 2;
    const lw = cw / tw / (28.4 * eps * 2), lf = cf / tf / (28.4 * eps * Math.sqrt(0.43));
    const rw = cw / tw <= 42 * eps ? 1 : Math.min(1, (lw - 0.22) / (lw * lw));
    const rf = cf / tf <= 14 * eps ? 1 : Math.min(1, (lf - 0.188) / (lf * lf));
    Aeff = A - (1 - rw) * cw * tw - 4 * (1 - rf) * cf * tf;
  } else if (v.Aeff !== undefined) Aeff = v.Aeff;
  const l1 = Math.PI * Math.sqrt(E / fy);
  // (6.50), bij klasse 4 (6.51): λ̄ = √(A_eff·f_y/N_cr)
  const f = Math.sqrt(Aeff / A);
  const ly = (Ly / (Math.sqrt(Iy / A) * l1)) * f, lz = (Lz / (Math.sqrt(Iz / A) * l1)) * f;
  const cy = chi(ly, alfa[k[0]]), cz = chi(lz, alfa[k[1]]);
  const Nb = Math.min(cy, cz) * Aeff * fy;
  const [ay, az] = [alfa[k[0]], alfa[k[1]]];
  const uit = { tekst: `Kromme ${LETTER[ay]} om de y-as (α = ${ay}) en ${LETTER[az]} om de z-as (α = ${az})`,
    lambda_bar_y: ruim(ly), lambda_bar_z: ruim(lz),
    chi_y: ruim(cy), chi_z: ruim(cz), N_bRd: ruim(Nb / 1e3), UC_knik: ruim(v.N / Nb) };
  if (Aeff < A && doorsnede <= 2) uit.A_eff = ruim(Aeff);
  return uit;
}

// ── Kip (ec3Kip) ────────────────────────────────────────────────────────────
function kip(v) {
  const { h, b, tw, tf, r, Iz, It, Iw, Wpl, Wel, fy, L, C1, aangrijping, methode, fabricage, M } = v;
  const eps = Math.sqrt(235 / fy);
  const kf = (b - tw - 2 * r) / 2 / tf / eps, kw = (h - 2 * tf - 2 * r) / tw / eps;
  const klasse = Math.max(kf <= 9 ? 1 : kf <= 10 ? 2 : kf <= 14 ? 3 : 4, kw <= 72 ? 1 : kw <= 83 ? 2 : kw <= 124 ? 3 : 4);
  const Wy = klasse <= 2 ? Wpl : Wel;
  const C2 = C1 === 1.13 ? 0.45 : C1 === 1.35 ? 0.55 : 0;
  const zg = (aangrijping * h) / 2;
  const P = (Math.PI ** 2 * E * Iz) / L ** 2;
  const Mcr = C1 * P * (Math.sqrt(Iw / Iz + (L * L * G * It) / (Math.PI ** 2 * E * Iz) + (C2 * zg) ** 2) - C2 * zg);
  const lam = Math.sqrt((Wy * fy) / Mcr);
  const hb = h / b <= 2;
  const aLT = methode === 1
    ? (fabricage === 1 ? (hb ? 0.21 : 0.34) : hb ? 0.49 : 0.76)
    : (fabricage === 1 ? (hb ? 0.34 : 0.49) : hb ? 0.49 : 0.76);
  const x = methode === 1 ? chi(lam, aLT) : chi(lam, aLT, 0.4, 0.75, true);
  const Mb = x * Wy * fy;
  return { tekst: `Kipkromme ${LETTER[aLT]} volgens tabel ${methode === 1 ? "6.4" : "6.5"}`,
    klasse: String(klasse), M_cr: ruim(Mcr / 1e6), lambda_LT: ruim(lam),
    chi_LT: ruim(x), M_bRd: ruim(Mb / 1e6), UC_kip: ruim(M / Mb) };
}

// ── Classificatie (ec3Classificatie) ────────────────────────────────────────
function klasse(v) {
  const { h, b, tw, tf, r, fy, belasting } = v;
  const eps = Math.sqrt(235 / fy);
  const cw = h - 2 * tf - 2 * r, cf = (b - tw - 2 * r) / 2;
  let a, psi;
  if (belasting === 1) [a, psi] = [0.5, -1];
  else if (belasting === 2) [a, psi] = [1, 1];
  else {
    a = Math.min(1, 0.5 * (1 + v.N / (cw * tw * fy)));
    const s1 = v.N / v.A + (v.M * cw) / (2 * v.Iy), s2 = v.N / v.A - (v.M * cw) / (2 * v.Iy);
    psi = Math.max(s2 / Math.max(s1, 0.001), -3);
  }
  const g1 = a > 0.5 ? (396 * eps) / (13 * a - 1) : (36 * eps) / a;
  const g2 = a > 0.5 ? (456 * eps) / (13 * a - 1) : (41.5 * eps) / a;
  const g3 = psi > -1 ? (42 * eps) / (0.67 + 0.33 * psi) : 62 * eps * (1 - psi) * Math.sqrt(-psi);
  const kw = cw / tw, kf = cf / tf;
  const lw = kw <= g1 ? 1 : kw <= g2 ? 2 : kw <= g3 ? 3 : 4;
  const lf = kf <= 9 * eps ? 1 : kf <= 10 * eps ? 2 : kf <= 14 * eps ? 3 : 4;
  return { c_w_over_tw: ruim(kw), c_f_over_tf: ruim(kf), klasse: String(Math.max(lw, lf)) };
}

// ── Buiging met normaalkracht (ec3BuigingNormaalkracht) ─────────────────────
function buigingN(v) {
  const { A, h, b, tw, tf, r, Iy, Wply, Wplz, Wely, Welz, fy, N, My, Mz } = v;
  const k = klasse({ h, b, tw, tf, r, fy, belasting: 3, N, M: My, A, Iy }).klasse;
  const Npl = A * fy;
  const uit = { klasse: k, N_plRd: ruim(Npl / 1e3) };
  if (Number(k) <= 2) {
    const n = N / Npl, a = Math.min((A - 2 * b * tf) / A, 0.5);
    const MNy = Math.max(Math.min((Wply * fy * (1 - n)) / (1 - 0.5 * a), Wply * fy), 0);
    const MNz = n > a ? Math.max(Wplz * fy * (1 - ((n - a) / (1 - a)) ** 2), 0) : Wplz * fy;
    Object.assign(uit, { M_NyRd: ruim(MNy / 1e6), M_NzRd: ruim(MNz / 1e6),
      UC_MN: ruim((My / MNy) ** 2 + (Mz / MNz) ** Math.max(1, 5 * n)) });
  } else if (k === "3") {
    uit.UC_MN = ruim(N / Npl + My / (Wely * fy) + Mz / (Welz * fy));
  }
  return uit;
}

// ── Volledige liggertoets (ec3StalenLigger) ─────────────────────────────────
/** h, b, t_w, t_f, r (mm); A (cm²); I_y, I_z (cm⁴); W_el,y, W_pl,y (cm³); I_t (cm⁴). */
const PROFIEL = {
  200: { h: 200, b: 100, tw: 5.6, tf: 8.5, r: 12, A: 28.5, Iy: 1940, Iz: 142, Wel: 194, Wpl: 221, It: 6.98 },
  300: { h: 300, b: 150, tw: 7.1, tf: 10.7, r: 15, A: 53.8, Iy: 8360, Iz: 604, Wel: 557, Wpl: 628, It: 20.1 },
  600: { h: 600, b: 220, tw: 12, tf: 19, r: 24, A: 156, Iy: 92080, Iz: 3390, Wel: 3070, Wpl: 3510, It: 165 },
  1300: { h: 290, b: 300, tw: 8.5, tf: 14, r: 27, A: 112, Iy: 18260, Iz: 6310, Wel: 1260, Wpl: 1380, It: 85.2 },
  2200: { h: 200, b: 200, tw: 9, tf: 15, r: 18, A: 78.1, Iy: 5700, Iz: 2000, Wel: 570, Wpl: 642, It: 59.3 },
};
function ligger(v) {
  const p = PROFIEL[v.profiel];
  const { h, b, tw, tf, r } = p;
  const A = p.A * 1e2, Iy = p.Iy * 1e4, Iz = p.Iz * 1e4, Wel = p.Wel * 1e3, Wpl = p.Wpl * 1e3, It = p.It * 1e4;
  const Iw = (Iz * (h - tf) ** 2) / 4;
  const fy = v.staalsoort, L = v.L ?? 6000, qd = v.qd ?? 25, gk = 7, qk = 10, nst = v.n_st ?? 0;
  const eps = Math.sqrt(235 / fy);
  const kw = (h - 2 * tf - 2 * r) / tw / eps, kf = (b - tw - 2 * r) / 2 / tf / eps;
  const kl = Math.max(kw <= 72 ? 1 : kw <= 83 ? 2 : kw <= 124 ? 3 : 4, kf <= 9 ? 1 : kf <= 10 ? 2 : kf <= 14 ? 3 : 4);
  const Wy = kl <= 2 ? Wpl : Wel;
  const M = (qd * L * L) / 8, V = (qd * L) / 2;
  const Mc = Wy * fy;
  const Av = Math.max(A - 2 * b * tf + (tw + 2 * r) * tf, (h - 2 * tf) * tw);
  const Vpl = (Av * fy) / Math.sqrt(3);
  // 6.2.8: waar V_Ed(x) > 0,5·V_pl,Rd is het moment ten hoogste M(x0), met ρ van de oplegging.
  let MV = null, MVRd = null;
  if (V > 0.5 * Vpl) {
    const hw = h - 2 * tf, rho = (2 * V / Vpl - 1) ** 2;
    MV = M * (1 - (Vpl / (2 * V)) ** 2);
    MVRd = Math.min(Math.max(Wy - (rho * hw * hw * tw) / 4, 0) * fy, Mc);
  }
  const aLT = h / b <= 2 ? 0.34 : 0.49;
  const McrF = (Lk, C1, C2zg) => C1 * ((Math.PI ** 2 * E * Iz) / Lk ** 2) *
    (Math.sqrt(Iw / Iz + (Lk ** 2 * G * It) / (Math.PI ** 2 * E * Iz) + C2zg ** 2) - C2zg);
  let Mcr = null, lam = null, x;
  if (nst === 0) {
    // Geen kipsteunen: tabel NB.NB.1 geval 2, C_1 = 1,13 en C_2 = 0,45.
    Mcr = McrF(L, 1.13, 0.45 * (v.aangrijping * h) / 2);
    lam = Math.sqrt((Wy * fy) / Mcr);
    x = chi(lam, aLT, 0.4, 0.75, true);
  } else {
    // Kipsteunen: álle velden (niet alleen de helft zoals het blad) volgens
    // NB.NB.4.3 met tabel NB.NB.1 geval 1; de kleinste χ_LT geldt.
    const Nv = nst + 1, Lst = L / Nv;
    x = 1;
    for (let i = 1; i <= Nv; i++) {
      const x0 = (i - 1) * Lst, x1 = i * Lst;
      const m0 = x0 * (L - x0), m1 = x1 * (L - x1);
      const beta = Math.min(m0, m1) / Math.max(m0, m1);
      const Lk = Math.min(Math.max(1.4 - 0.8 * beta, 1), 1.4) * Lst;
      const C1 = Math.min(1.75 - 1.05 * beta + 0.3 * beta * beta, 2.3);
      x = Math.min(x, chi(Math.sqrt((Wy * fy) / McrF(Lk, C1, 0)), aLT, 0.4, 0.75, true));
    }
  }
  const Mb = x * Wy * fy;
  const wmax = (5 * (gk + qk) * L ** 4) / (384 * E * Iy), wbij = (5 * qk * L ** 4) / (384 * E * Iy);
  const UC = { b: M / Mc, v: V / Vpl, k: M / Mb, wm: wmax / (0.004 * L), wb: wbij / (v.grens_bij * L) };
  if (MV !== null) UC.mv = MV / MVRd;
  const uit = {
    klasse: String(kl), W_y: ruim(Wy / 1e3), M_cRd: ruim(Mc / 1e6), UC_buiging: ruim(UC.b), A_v: ruim(Av),
    V_plRd: ruim(Vpl / 1e3), UC_dwarskracht: ruim(UC.v),
    chi_LT: ruim(x), M_bRd: ruim(Mb / 1e6), UC_kip: ruim(UC.k), w_max: ruim(wmax), w_bij: ruim(wbij),
    UC_w_max: ruim(UC.wm), UC_w_bij: ruim(UC.wb), UC_max: ruim(Math.max(...Object.values(UC))),
  };
  if (Mcr !== null) Object.assign(uit, { M_cr: ruim(Mcr / 1e6), lambda_LT: ruim(lam) });
  if (MV !== null) Object.assign(uit, { M_x0: ruim(MV / 1e6), M_VRd: ruim(MVRd / 1e6), UC_MV: ruim(UC.mv) });
  return uit;
}

// ── Sets ────────────────────────────────────────────────────────────────────
const IPE300 = { A: 5381, Iy: 83.56e6, Iz: 6.038e6, h: 300, b: 150, tw: 7.1, tf: 10.7, r: 15 };
const HEB200 = {
  A: "7808 mm^2", I_y: "56960000 mm^4", I_z: "20030000 mm^4", h: "200 mm", b: "200 mm", t_w: "9 mm", t_f: "15 mm", r: "18 mm",
};
const HEA300 = {
  A: "11250 mm^2", h: "290 mm", b: "300 mm", t_w: "8.5 mm", t_f: "14 mm", r: "27 mm", I_y: "182600000 mm^4",
  W_ply: "1383000 mm^3", W_plz: "641200 mm^3", W_ely: "1260000 mm^3", W_elz: "420600 mm^3",
};

const SETS = [
  // Knik
  {
    naam: "Knik 1 — standaard: IPE 300 S235, 6 m, gewalst, h/b = 2 > 1,2 → kromme a (y) en b (z)",
    blad: "ec3Knik", invoer: {},
    narekening: knik({ ...IPE300, fy: 235, Ly: 6000, Lz: 6000, doorsnede: 1, N: 500e3 }),
    // Met de hand: λ̄_z = 6000/(33,50·93,91) = 1,907; Φ = 0,5·(1 + 0,34·1,707 + 3,638) =
    // 2,609; χ_z = 1/(2,609 + √(6,808 − 3,638)) = 0,2278; N_b,Rd = 0,2278·5381·235 =
    // 288,1 kN. Met de oude standaardkromme a0 was het 321,3 kN.
    handwerk: { chi_z: "0.2278", N_bRd: "288.1" },
  },
  {
    naam: "Knik 2 — HEB 200 S235, 6 m: h/b = 1,0 ≤ 1,2 → kromme b (y) en c (z)",
    blad: "ec3Knik", invoer: {}, vervang: HEB200,
    narekening: knik({ A: 7808, Iy: 56.96e6, Iz: 20.03e6, h: 200, b: 200, tw: 9, tf: 15, r: 18, fy: 235, Ly: 6000, Lz: 6000, doorsnede: 1, N: 500e3 }),
    // Met de hand: i_z = √(20,03e6/7808) = 50,65 mm, λ̄_z = 6000/(50,65·93,91) = 1,261;
    // Φ = 0,5·(1 + 0,49·1,061 + 1,590) = 1,556; χ_z = 0,4055; N_b,Rd = 0,4055·7808·235 =
    // 744,1 kN (met a0/a0 was het 973,4 kN).
    handwerk: { chi_z: "0.4055", N_bRd: "744.1" },
  },
  {
    naam: "Knik 3 — gelast I-profiel, S355",
    blad: "ec3Knik", invoer: { doorsnede: 2, staalsoort: 355 },
    narekening: knik({ ...IPE300, fy: 355, Ly: 6000, Lz: 6000, doorsnede: 2, N: 500e3 }),
  },
  {
    naam: "Knik 4 — koudgevormd buisprofiel: kromme c om beide assen",
    blad: "ec3Knik", invoer: { doorsnede: 4 },
    narekening: knik({ ...IPE300, fy: 235, Ly: 6000, Lz: 6000, doorsnede: 4, N: 500e3 }),
  },
  {
    naam: "Knik 5 — IPE 300 S355 gewalst: lijf bij zuivere druk in klasse 4 → A_eff, (6.51) en (6.48)",
    blad: "ec3Knik", invoer: { staalsoort: 355 },
    narekening: knik({ ...IPE300, fy: 355, Ly: 6000, Lz: 6000, doorsnede: 1, N: 500e3 }),
    // Met de hand: ε = 0,8136; c/t = 248,6/7,1 = 35,01 > 42ε = 34,17. λ̄_p = 35,01/(28,4·0,8136·2)
    // = 0,7577 → ρ = (0,7577 − 0,22)/0,7577² = 0,9366; A_eff = 5381 − 0,0634·248,6·7,1 = 5269 mm².
    // λ̄_z = 6000/(33,50·76,41)·√(5269/5381) = 2,344·0,9895 = 2,320; Φ = 3,551 → χ_z = 0,1603;
    // N_b,Rd = 0,1603·5269·355 = 299,8 kN (met het bruto oppervlak was het 300,3 kN).
    handwerk: { A_eff: "5269", lambda_bar_z: "2.320", chi_z: "0.1603", N_bRd: "299.8" },
  },
  {
    naam: "Knik 6 — warmgevormde buis in klasse 4 met A_eff = 4800 mm²",
    blad: "ec3Knik", invoer: { doorsnede: 3, klasse_druk: 4, A_eff: 4800 },
    narekening: knik({ ...IPE300, fy: 235, Ly: 6000, Lz: 6000, doorsnede: 3, Aeff: 4800, N: 500e3 }),
    // Met de hand: λ̄_z = 1,907·√(4800/5381) = 1,801; kromme a: Φ = 2,291 → χ_z = 0,2699;
    // N_b,Rd = 0,2699·4800·235 = 304,4 kN → UC = 1,642.
    handwerk: { chi_z: "0.2699", N_bRd: "304.4", UC_knik: "1.642" },
  },
  {
    naam: "Knik 7 — hoekprofiel in klasse 4: niet dubbelsymmetrisch, ΔM volgens 6.3.1.1(2) valt buiten het blad",
    blad: "ec3Knik", invoer: { doorsnede: 6, klasse_druk: 4, A_eff: 4800 }, vervang: { N_Ed: "100 kN" },
    narekening: knik({ ...IPE300, fy: 235, Ly: 6000, Lz: 6000, doorsnede: 6, Aeff: 4800, N: 100e3 }),
    // Met de hand: λ̄_z = 1,801 (als Knik 6); kromme b: Φ = 0,5·(1 + 0,34·1,601 + 3,245) = 2,395
    // → χ_z = 0,25173; N_b,Rd = 0,25173·4800·235 = 283,95 kN → UC = 0,3522. Toch voldoet niet:
    // het effectieve zwaartepunt verschuift (e_N), en dat extra moment rekent het blad niet.
    handwerk: { chi_z: "0.2517", N_bRd: "284.0", UC_knik: "0.3522" },
  },
  // Kip
  {
    naam: "Kip 1 — standaard: methode 6.3.2.2, constant moment, 4 m → kromme a (tabel 6.4)",
    blad: "ec3Kip", invoer: {},
    narekening: kip({ ...IPE300, Iz: 6.038e6, It: 201000, Iw: 126e9, Wpl: 628400, Wel: 557300, fy: 235, L: 4000, C1: 1.0, aangrijping: 1, methode: 1, fabricage: 1, M: 80e6 }),
    // Ongewijzigd: M_cr = 159,7 kNm, λ̄_LT = 0,9616, χ_LT = 0,6923, M_b,Rd = 102,2 kNm.
    handwerk: { M_cr: "159.7", chi_LT: "0.6923", M_bRd: "102.2" },
  },
  {
    naam: "Kip 2 — methode 6.3.2.3, verder standaard → kromme b (tabel 6.5)",
    blad: "ec3Kip", invoer: { methode: 2 },
    narekening: kip({ ...IPE300, Iz: 6.038e6, It: 201000, Iw: 126e9, Wpl: 628400, Wel: 557300, fy: 235, L: 4000, C1: 1.0, aangrijping: 1, methode: 2, fabricage: 1, M: 80e6 }),
    // Met de hand: Φ = 0,5·(1 + 0,34·0,5616 + 0,75·0,9247) = 0,9422; χ_LT =
    // 1/(0,9422 + √(0,8878 − 0,6935)) = 0,7230; M_b,Rd = 0,7230·147,67 = 106,8 kNm.
    // Met de oude standaardkromme a was het 117,0 kNm.
    handwerk: { chi_LT: "0.7230", M_bRd: "106.8" },
  },
  {
    naam: "Kip 3 — methode 6.3.2.3, L = 12 m: χ_LT begrensd op 1/λ̄² (6.57)",
    blad: "ec3Kip", invoer: { methode: 2 }, vervang: { L_cr: "12000 mm" },
    narekening: kip({ ...IPE300, Iz: 6.038e6, It: 201000, Iw: 126e9, Wpl: 628400, Wel: 557300, fy: 235, L: 12000, C1: 1.0, aangrijping: 1, methode: 2, fabricage: 1, M: 80e6 }),
    // Met de hand: M_cr = 86,91 kN·√(20 868 + 187 340) mm = 39,66 kNm, λ̄_LT = 1,930;
    // Φ = 2,157 geeft 0,2841, maar 1/λ̄² = 0,2685 → M_b,Rd = 0,2685·147,67 = 39,66 kNm
    // (= M_cr). Zonder de grens was het 41,96 kNm.
    handwerk: { chi_LT: "0.2685", M_bRd: "39.66" },
  },
  {
    naam: "Kip 4 — gelijkmatige last op de gedrukte flens, 6 m, methode 6.3.2.3",
    blad: "ec3Kip", invoer: { methode: 2, C1_factor: 1.13 }, vervang: { L_cr: "6000 mm" },
    narekening: kip({ ...IPE300, Iz: 6.038e6, It: 201000, Iw: 126e9, Wpl: 628400, Wel: 557300, fy: 235, L: 6000, C1: 1.13, aangrijping: 1, methode: 2, fabricage: 1, M: 80e6 }),
    // Met de hand: π²EI_z/L² = 347,6 kN; C_2·z_g = 0,45·150 = 67,5 mm;
    // √(20 868 + 46 835 + 67,5²) − 67,5 = 201,3 mm → M_cr = 1,13·347,6·201,3 = 79,08 kNm
    // (102,2 kNm met de last in het dwarskrachtcentrum).
    handwerk: { M_cr: "79.08" },
  },
  {
    naam: "Kip 5 — gelast profiel, methode 6.3.2.2, puntlast op de getrokken flens",
    blad: "ec3Kip", invoer: { fabricage: 2, C1_factor: 1.35, aangrijping: -1 },
    narekening: kip({ ...IPE300, Iz: 6.038e6, It: 201000, Iw: 126e9, Wpl: 628400, Wel: 557300, fy: 235, L: 4000, C1: 1.35, aangrijping: -1, methode: 1, fabricage: 2, M: 80e6 }),
  },
  {
    naam: "Kip 6 — HEA 300 in S355: flens in klasse 3, dus W_el,y",
    blad: "ec3Kip", invoer: { staalsoort: 355, methode: 2 },
    vervang: { h: "290 mm", b: "300 mm", t_w: "8.5 mm", t_f: "14 mm", r: "27 mm", I_z: "63100000 mm^4", I_t: "852000 mm^4", I_w: "1200000000000 mm^6", W_ply: "1383000 mm^3", W_ely: "1260000 mm^3" },
    narekening: kip({ h: 290, b: 300, tw: 8.5, tf: 14, r: 27, Iz: 63.1e6, It: 852000, Iw: 1.2e12, Wpl: 1383000, Wel: 1260000, fy: 355, L: 4000, C1: 1.0, aangrijping: 1, methode: 2, fabricage: 1, M: 80e6 }),
  },
  // Classificatie
  {
    naam: "Klasse 1 — standaard: IPE 300 S235 op buiging",
    blad: "ec3Classificatie", invoer: {},
    narekening: klasse({ ...IPE300, fy: 235, belasting: 1 }),
  },
  {
    naam: "Klasse 2 — IPE 300 S355 onder zuivere druk: lijf in klasse 4",
    blad: "ec3Classificatie", invoer: { staalsoort: 355, belasting: 2 },
    narekening: klasse({ ...IPE300, fy: 355, belasting: 2 }),
    // Met de hand: ε = 0,8136; c/t = 248,6/7,1 = 35,01 > 42ε = 34,17 → klasse 4.
    // Op buiging gaf het blad klasse 1 (72ε = 58,58).
    handwerk: { klasse: "4" },
  },
  {
    naam: "Klasse 3 — IPE 300 S355 onder druk met buiging (N = 200 kN, M = 50 kNm)",
    blad: "ec3Classificatie", invoer: { staalsoort: 355, belasting: 3 },
    narekening: klasse({ ...IPE300, fy: 355, belasting: 3, N: 200e3, M: 50e6 }),
    // Met de hand: α = 0,5·(1 + 200 000/(248,6·7,1·355)) = 0,6596 → 396ε/(13α − 1) = 42,53
    // ≥ 35,01 → klasse 1.
    handwerk: { klasse: "1" },
  },
  // Buiging met normaalkracht
  {
    naam: "N+M 1 — standaard: IPE 300 S235, klasse 1 → (6.36) en (6.41)",
    blad: "ec3BuigingNormaalkracht", invoer: {},
    narekening: buigingN({ ...IPE300, Iy: 83.56e6, Wply: 628400, Wplz: 98520, Wely: 557300, Welz: 80500, fy: 235, N: 200e3, My: 50e6, Mz: 5e6 }),
    // Ongewijzigd: UC = (50/147,7)² + 5/23,15 = 0,3306.
    handwerk: { UC_MN: "0.3306" },
  },
  {
    naam: "N+M 2 — HEA 300 S355: flens klasse 3 → elastisch volgens (6.42)",
    blad: "ec3BuigingNormaalkracht", invoer: { staalsoort: 355 }, vervang: HEA300,
    narekening: buigingN({ A: 11250, h: 290, b: 300, tw: 8.5, tf: 14, r: 27, Iy: 182.6e6, Wply: 1383000, Wplz: 641200, Wely: 1260000, Welz: 420600, fy: 355, N: 200e3, My: 50e6, Mz: 5e6 }),
    // Met de hand: 200/3994 + 50/447,3 + 5/149,3 = 0,0501 + 0,1118 + 0,0335 = 0,1953.
    handwerk: { klasse: "3", UC_MN: "0.1953" },
  },
  // Druk
  {
    naam: "Druk — klasse 4 met A_eff = 4800 mm² (6.11)",
    blad: "ec3Druk", invoer: { dwarsdoorsnede_klasse: 4, A_eff: 4800 },
    // Met de hand: N_c,Rd = 4800·235 = 1128 kN (bruto was 1265 kN); UC = 500/1128 = 0,4433.
    handwerk: { N_cRd: "1128", UC_druk: "0.4433" },
  },
  // Dwarskracht
  {
    naam: "Dwarskracht 1 — standaard: IPE 300 S235, h_w/t_w ≤ 72ε/η",
    blad: "ec3Dwarskracht", invoer: {},
    // Met de hand: A_v = 5381 − 2·150·10,7 + (7,1 + 30)·10,7 = 2568 mm²; V_pl,Rd = 2568·235/√3 =
    // 348,4 kN; V_Ed = 20·6/2 = 60 kN → UC = 0,1722. h_w/t_w = 278,6/7,1 = 39,24 ≤ 72.
    handwerk: { V_plRd: "348.4", UC_dwarskracht: "0.1722" },
  },
  {
    naam: "Dwarskracht 2 — slank lijf (h = 600, t_w = 5 mm): plooi door afschuiving valt buiten het blad",
    blad: "ec3Dwarskracht", invoer: {}, vervang: { h: "600 mm", t_w: "5 mm" },
    // Met de hand: h_w/t_w = 578,6/5 = 115,7 > 72ε/η = 72 (6.22) → voldoet niet, ook al is
    // UC = 60/392,5 = 0,1529.
    handwerk: { UC_dwarskracht: "0.1529" },
    plooi: true,
  },
  // Doorbuiging
  {
    naam: "Doorbuiging — standaard: w_max ≤ L/250 en w_bij ≤ 0,003·L",
    blad: "ec3Doorbuiging", invoer: {},
    // Met de hand: δ_Q = 5·10·6000⁴/(384·210 000·83,56e6) = 9,617 mm; w_max = 4,808 +
    // 9,617 = 14,43 mm ≤ 24 mm; w_bij = 9,617 ≤ 18 mm → UC 0,5343.
    handwerk: { w_max: "14.43", w_bij: "9.617", UC_w_max: "0.6010", UC_w_bij: "0.5343" },
  },
  // Volledige liggertoets
  {
    naam: "Ligger 1 — standaard: IPE 300 S235, last op de bovenflens",
    blad: "ec3StalenLigger", invoer: {},
    narekening: ligger({ profiel: 300, staalsoort: 235, aangrijping: 1, grens_bij: 0.003 }),
    // Met de hand: I_w = 604e4·289,3²/4 = 1,264e11 mm⁶; M_cr = 1,13·347,7 kN·
    // (√(20 924 + 46 820 + 67,5²) − 67,5) = 79,13 kNm; λ̄_LT = √(147,6/79,13) = 1,366;
    // h/b = 2 ≤ 2 → kromme b: Φ = 1,364, χ_LT = 0,4897; M_b,Rd = 72,27 kNm → UC 1,557.
    // Het oude blad: 77,36 kNm (kromme c, geen C_2·z_g).
    handwerk: { M_cr: "79.13", chi_LT: "0.4897", M_bRd: "72.27", UC_kip: "1.557" },
  },
  {
    naam: "Ligger 2 — IPE 200: de keuzelijst bepaalt nu de profielgegevens",
    blad: "ec3StalenLigger", invoer: { profiel: 200 },
    narekening: ligger({ profiel: 200, staalsoort: 235, aangrijping: 1, grens_bij: 0.003 }),
    // Met de hand: M_c,Rd = 221·235 = 51,94 kNm → UC = 112,5/51,94 = 2,166 (was 0,76).
    handwerk: { UC_buiging: "2.166" },
  },
  {
    naam: "Ligger 3 — HEA 300 S355: flens klasse 3, dus W_el,y (6.14)",
    blad: "ec3StalenLigger", invoer: { profiel: 1300, staalsoort: 355 },
    narekening: ligger({ profiel: 1300, staalsoort: 355, aangrijping: 1, grens_bij: 0.003 }),
    // Met de hand: c/t = 118,75/14 = 8,48 > 10ε = 8,14 → klasse 3; M_c,Rd = 1260·355 =
    // 447,3 kNm (met W_pl was het 489,9 kNm).
    handwerk: { klasse: "3", M_cRd: "447.3" },
  },
  {
    naam: "Ligger 4 — IPE 600, last in het dwarskrachtcentrum: h/b > 2 → kipkromme c",
    blad: "ec3StalenLigger", invoer: { profiel: 600, aangrijping: 0, grens_bij: 0.002 },
    narekening: ligger({ profiel: 600, staalsoort: 235, aangrijping: 0, grens_bij: 0.002 }),
  },
  {
    naam: "Ligger 5 — HEB 200 S275, last op de onderflens",
    blad: "ec3StalenLigger", invoer: { profiel: 2200, staalsoort: 275, aangrijping: -1 },
    narekening: ligger({ profiel: 2200, staalsoort: 275, aangrijping: -1, grens_bij: 0.003 }),
  },
  {
    naam: "Ligger 6 — IPE 300, twee kipsteunen, last op de onderflens: per veld volgens NB.NB.4.3",
    blad: "ec3StalenLigger", invoer: { aangrijping: -1 }, vervang: { n_st: "2" },
    narekening: ligger({ profiel: 300, staalsoort: 235, aangrijping: -1, grens_bij: 0.003, n_st: 2 }),
    // Met de hand: L_st = 2 m. Eindveld β = 0 → L_kip = 2,8 m, C_1 = 1,75: π²EI_z/L_kip² =
    // 1597 kN, √(20 924 + 10 202) = 176,4 mm → M_cr = 492,9 kNm, λ̄_LT = 0,5472, χ_LT = 0,9404.
    // Middenveld β = 1 → L_kip = 2 m, C_1 = 1,0: M_cr = 3130·161,6 = 505,9 kNm, χ_LT = 0,9434.
    // M_b,Rd = 0,9404·147,58 = 138,8 kNm → UC 0,8106. Het oude blad nam C_1 = 1,13 en
    // C_2·z_g = −67,5 mm over L_kip = 2 m: M_cr = 858,2 kNm, meer dan het kritieke moment van
    // de hele ligger met deze steunen.
    handwerk: { chi_LT: "0.9404", M_bRd: "138.8", UC_kip: "0.8106" },
  },
  {
    naam: "Ligger 7 — IPE 300, L = 3 m, q_d = 125 kN/m: V_Ed > 0,5·V_pl,Rd, dus 6.2.8",
    blad: "ec3StalenLigger", invoer: {}, vervang: { L: "3000 mm", q_d: "125 kN/m" },
    narekening: ligger({ profiel: 300, staalsoort: 235, aangrijping: 1, grens_bij: 0.003, L: 3000, qd: 125 }),
    // Met de hand: V_Ed = 187,5 kN, V_pl,Rd = 348,3 kN → ρ = (2·0,5384 − 1)² = 0,00589.
    // M(x0) = 140,6·(1 − (348,3/375)²) = 19,33 kNm; M_V,Rd = (628 000 − 0,00589·278,6²·7,1/4)·235
    // = 147,4 kNm → UC = 0,1311.
    handwerk: { M_x0: "19.33", M_VRd: "147.4", UC_MV: "0.1311" },
  },
];

let fouten = 0;
for (const set of SETS) {
  const tpl = vervang(blad(set.blad), set.vervang);
  const waarden = Object.fromEntries(Object.entries(set.invoer).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, waarden, PROJECT);
  // De maatgevende UC staat in de slotzin, die de rapportkop ook leest.
  const i = got.text.lastIndexOf("Maatgevende UC");
  const zin = i < 0 ? "" : got.text.slice(i, i + 240);
  const slot = zin.match(/^Maatgevende UC = ([\d.]+|Infinity)/);
  const afgeleid = slot ? { UC_max: parseFloat(slot[1]) } : {};
  const { tekst, ...verwacht } = set.narekening ?? {};
  if (set.narekening) fouten += toets(`${set.naam} — narekening`, got, verwacht, {}, afgeleid);
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk, {}, afgeleid);
  if (tekst) {
    const ok = got.text.includes(tekst);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} tekst      "${tekst}"`);
  }
  if (!["ec3Materiaal", "ec3Classificatie"].includes(set.blad)) {
    // Klasse 4 en een lijf dat op plooi moet worden getoetst keuren af, ook bij een UC onder 1,0.
    const blok = /valt in klasse 4|op plooi door afschuiving worden getoetst/.test(zin);
    const voldoet = !/voldoe[nt] niet/.test(zin) && /voldoe[nt]/.test(zin);
    // Een set die plooi verwacht, moet de plooiregel ook in de slotzin krijgen, en andersom.
    const plooiOk = !!set.plooi === /op plooi door afschuiving/.test(zin);
    const ok = i >= 0 && plooiOk && voldoet === (!blok && !!slot && parseFloat(slot[1]) <= 1);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    ${voldoet ? "voldoet" : "voldoet niet"} bij UC = ${slot ? slot[1] : "—"}${blok ? ", afgekeurd op klasse 4 of plooi" : ""}`);
  }
  if (/Error|NaN|niet gedefinieerd/.test(got.text)) {
    fouten++;
    console.log("  FOUT   het blad meldt een fout of NaN");
  }
}

// De oude bladen drukten een markdown-tabel en [OK]-codes af die niet als
// tabel of oordeel verschijnen; die horen er niet meer in te staan.
{
  console.log("\nUitdraai");
  const rest = [...BRON.matchAll(/^\|.*\|\s*$|\[(NIET )?OK\]|^- /gm)].map((m) => m[0].trim());
  const ok = rest.length === 0;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} geen markdown-tabellen, opsommingen of [OK]-codes${ok ? "" : `: ${rest.slice(0, 3).join(" · ")}`}`);
}

afronden(fouten, "EC3-normbladen");
