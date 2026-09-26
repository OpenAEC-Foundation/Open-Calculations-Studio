/**
 * Controlescript voor de module Stalen gevelkolom (NEN-EN 1993-1-1 met NB).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten daarom op twee manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript: de wind volgens
 *      NEN-EN 1991-1-4 met NB (q_p uit windgebied en terreincategorie, c_pe
 *      voor de gevelzones van tabel NB.6 – 7.1, c_pi), doorsnedeklasse (tabel
 *      5.2), doorsnede (§6.2), knik om beide assen en torsieknik om de as van
 *      de regels — voor de knik zonder buiging met de grootste drukkracht van
 *      beide combinaties en een effectief lijf als dat bij zuivere druk in
 *      klasse 4 valt (NEN-EN 1993-1-5 §4.4) —, M_cr volgens bijlage NB.NB met
 *      χ_LT volgens 6.3.2.3 — bij
 *      winddruk voor álle velden tussen de regels, niet alleen de onderste
 *      helft zoals het blad — en de interactie volgens bijlage B. Het blad moet
 *      daar op vier significante cijfers mee overeenkomen.
 *   2. Voor het standaardgeval de getallen van een handberekening.
 *
 * De profielgegevens staan hieronder los overgenomen uit de profieltabel,
 * zodat ook de matrix in het blad wordt gecontroleerd.
 *
 * Draaien:  node scripts/check-gevelkolom.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("stalenGevelkolom.ts");

// ── Standaardinvoer ─────────────────────────────────────────────────────────
const STANDAARD = {
  profile: 11, staalkwaliteit: 235, L: 6, b_belast: 5, n_r: 2, regelsteun: 1,
  windbron: 1, z_wind: 7, d_geb: 20, a_hoek: 10, q_wind_hand: 0.8, w_d_hand: 0.9, w_z_hand: 0.7,
  N_Ed: 30, VerplGrens: 300,
};
const PROJECT = { CC: 2, K_FI: 1, windgebied: 2, terreincategorie: 2 };

/** id → h, b, t_w, t_f, r (mm); A (cm²); I_y, I_z (cm⁴); W_el,y, W_pl,y (cm³); I_t (cm⁴). */
const PROFIEL = {
  5: { naam: "IPE 160", h: 160, b: 82, tw: 5.0, tf: 7.4, r: 9, A: 20.1, Iy: 869, Iz: 68.3, Wel: 109, Wpl: 124, It: 3.6 },
  7: { naam: "IPE 200", h: 200, b: 100, tw: 5.6, tf: 8.5, r: 12, A: 28.5, Iy: 1940, Iz: 142, Wel: 194, Wpl: 221, It: 6.98 },
  11: { naam: "IPE 300", h: 300, b: 150, tw: 7.1, tf: 10.7, r: 15, A: 53.8, Iy: 8360, Iz: 604, Wel: 557, Wpl: 628, It: 20.1 },
  18: { naam: "IPE 600", h: 600, b: 220, tw: 12, tf: 19, r: 24, A: 156, Iy: 92080, Iz: 3390, Wel: 3070, Wpl: 3510, It: 165 },
  24: { naam: "HEA 200", h: 190, b: 200, tw: 6.5, tf: 10, r: 18, A: 53.8, Iy: 3690, Iz: 1340, Wel: 389, Wpl: 430, It: 20.98 },
  29: { naam: "HEA 300", h: 290, b: 300, tw: 8.5, tf: 14, r: 27, A: 112, Iy: 18260, Iz: 6310, Wel: 1260, Wpl: 1380, It: 85.2 },
  40: { naam: "HEA 800", h: 790, b: 300, tw: 15, tf: 28, r: 30, A: 285.8, Iy: 303400, Iz: 12640, Wel: 7682, Wpl: 8699, It: 596.9 },
  53: { naam: "HEB 300", h: 300, b: 300, tw: 11, tf: 19, r: 27, A: 149, Iy: 25170, Iz: 8560, Wel: 1680, Wpl: 1870, It: 185 },
};

// ── Wind; eenheden kN en m ────────────────────────────────────────────────
function wind(v, P) {
  if (v.windbron === 3) return { wd: v.w_d_hand, wz: v.w_z_hand };
  let qp = v.q_wind_hand;
  if (v.windbron === 1) {
    const vb0 = { 1: 29.5, 2: 27.0, 3: 24.5 }[P.windgebied];
    const [z0, zmin] = { 1: [0.005, 1], 2: [0.2, 4], 3: [0.5, 7] }[P.terreincategorie];
    const z = Math.max(v.z_wind, zmin);
    const vm = 0.19 * (z0 / 0.05) ** 0.07 * Math.log(z / z0) * vb0; // c_o = c_dir = c_season = 1
    const Iv = 1 / Math.log(z / z0); // k_l = 1
    qp = ((1 + 7 * Iv) * 0.5 * 1.25 * vm * vm) / 1000;
  }
  // c_pe tussen 1 en 10 m² logaritmisch tussen c_pe,1 en c_pe,10 (figuur 7.2)
  const Abel = v.b_belast * v.L;
  const cpe = (c1, c10) => (Abel >= 10 ? c10 : Abel <= 1 ? c1 : c1 - (c1 - c10) * Math.log10(Abel));
  const e = Math.min(v.d_geb, 2 * v.z_wind);
  const x = Math.max(v.a_hoek - v.b_belast / 2, 0);
  const zij = x < e / 5 ? cpe(-1.4, -1.2) : x < e ? cpe(-1.1, -0.8) : -0.5;
  const hd = v.z_wind / v.d_geb;
  const cE = hd <= 1 ? -0.5 : hd >= 5 ? -0.7 : -0.5 - (0.2 * (hd - 1)) / 4;
  const cD = cpe(1.0, 0.8), cz = Math.min(zij, cE);
  return { qp, cD, cz, wd: (cD + 0.3) * qp, wz: (0.2 - cz) * qp };
}

// ── Onafhankelijke uitwerking; eenheden N en mm ─────────────────────────────
function uitwerking(v, P) {
  const CC = P.CC;
  const w = wind(v, P);
  const p = PROFIEL[v.profile];
  const { h, b, tw, tf, r } = p;
  const A = p.A * 1e2, Iy = p.Iy * 1e4, Iz = p.Iz * 1e4, Wel = p.Wel * 1e3, Wpl = p.Wpl * 1e3, It = p.It * 1e4;
  const Iw = (Iz * (h - tf) ** 2) / 4;
  const fy = v.staalkwaliteit, E = 210000, G = 81000;
  const eps = Math.sqrt(235 / fy);
  const L = v.L * 1000, nr = v.n_r, Lst = L / (nr + 1);
  const kst = v.regelsteun === 1 && nr >= 1;
  const gQ = { 1: 1.35, 2: 1.5, 3: 1.65 }[CC];
  const qd = gQ * w.wd * v.b_belast, qz = gQ * w.wz * v.b_belast; // kN/m = N/mm
  const Md = (qd * L * L) / 8, Mz = (qz * L * L) / 8, M = Math.max(Md, Mz);
  const V = (Math.max(qd, qz) * L) / 2, N = v.N_Ed * 1000;

  // doorsnedeklasse, tabel 5.2
  const cf = (b - tw - 2 * r) / 2, cw = h - 2 * tf - 2 * r;
  const kf = cf / tf / eps;
  const fk = kf <= 9 ? 1 : kf <= 10 ? 2 : kf <= 14 ? 3 : 4;
  const alfa = Math.min(1, 0.5 * (1 + N / (cw * tw * fy)));
  const s1 = N / A + (M * cw) / (2 * Iy), s2 = N / A - (M * cw) / (2 * Iy);
  const psi = Math.max(s2 / Math.max(s1, 0.001), -3);
  const kw = cw / tw / eps;
  const g1 = alfa > 0.5 ? 396 / (13 * alfa - 1) : 36 / alfa;
  const g2 = alfa > 0.5 ? 456 / (13 * alfa - 1) : 41.5 / alfa;
  const g3 = psi > -1 ? 42 / (0.67 + 0.33 * psi) : 62 * (1 - psi) * Math.sqrt(-psi);
  const wk = kw <= g1 ? 1 : kw <= g2 ? 2 : kw <= g3 ? 3 : 4;
  const klasse = Math.max(fk, wk);
  const Wy = klasse <= 2 ? Wpl : Wel;

  // doorsnede
  const Npl = A * fy, Mc = Wy * fy;
  const Av = Math.max(A - 2 * b * tf + (tw + 2 * r) * tf, (h - 2 * tf) * tw);
  const Vpl = (Av * fy) / Math.sqrt(3);
  let UCd, MN;
  if (klasse <= 2) {
    const n = N / Npl, a = Math.min((A - 2 * b * tf) / A, 0.5);
    MN = N <= Math.min(0.25 * Npl, 0.5 * (h - 2 * tf) * tw * fy) ? Mc : Math.max(Math.min((Mc * (1 - n)) / (1 - 0.5 * a), Mc), 0);
    UCd = n < 1 ? M / MN : n + M / Mc;
  } else UCd = N / Npl + M / Mc;

  // knik en torsieknik
  const hb = h / b;
  const ay = hb > 1.2 ? 0.21 : 0.34, az = hb > 1.2 ? 0.34 : 0.49;
  const chi = (lam, a) => {
    const F = 0.5 * (1 + a * (lam - 0.2) + lam * lam);
    return Math.min(1, 1 / (F + Math.sqrt(F * F - lam * lam)));
  };
  const Ncry = (Math.PI ** 2 * E * Iy) / L ** 2;
  const Ncrz = (Math.PI ** 2 * E * Iz) / (kst ? Lst : L) ** 2;
  const ly = Math.sqrt((A * fy) / Ncry), lz = Math.sqrt((A * fy) / Ncrz);
  const chiy = chi(ly, ay), chiz = chi(lz, az);
  let NcrTF = null, lTF = 0, chiTF = 1;
  if (kst) {
    // Het profiel draait om de as van de regels op de buitenflens (a = h/2).
    const a = h / 2;
    NcrTF = ((Math.PI ** 2 * E * Iz * a * a) / L ** 2 + (Math.PI ** 2 * E * Iw) / L ** 2 + G * It) / ((Iy + Iz) / A + a * a);
    lTF = Math.sqrt((A * fy) / NcrTF);
    chiTF = chi(lTF, az);
  }
  const chizT = Math.min(chiz, chiTF), lzT = Math.max(lz, lTF);
  // Knik zonder buiging: de grootste N van beide combinaties, zonder wind is dat
  // zuivere druk. Lijf in klasse 4 (c/t > 42ε) → ρ met ψ = 1 en k_σ = 4.
  const Nmax = Math.max(N, (v.N_Ed_max ?? 0) * 1000);
  const lp = cw / tw / (28.4 * eps * 2);
  const rho = cw / tw <= 42 * eps ? 1 : Math.min(1, (lp - 0.22) / (lp * lp));
  const Aeff = A - (1 - rho) * cw * tw;
  const Nb = Math.min(chiy, chizT) * Aeff * fy;

  // kip: M_cr volgens NB.NB, χ_LT volgens 6.3.2.3
  const S = Math.sqrt((E * Iw) / (G * It));
  const aLT = hb <= 2 ? 0.34 : 0.49;
  const Mcr = (Lk, C1, C2) =>
    ((Math.PI * C1) / Lk) *
    (Math.sqrt(1 + ((Math.PI * S) / Lk) ** 2 * (C2 * C2 + 1)) + (Math.PI * C2 * S) / Lk) *
    Math.sqrt(E * Iz * G * It);
  const chiLT = (lam) => {
    const F = 0.5 * (1 + aLT * (lam - 0.4) + 0.75 * lam * lam);
    return Math.min(1, 1 / (lam * lam), 1 / (F + Math.sqrt(F * F - 0.75 * lam * lam)));
  };
  let chiLTd, Mcrd = null;
  if (kst) {
    // Alle velden, met de momenten van de gelijkmatige last op de regels.
    chiLTd = 1;
    for (let i = 1; i <= nr + 1; i++) {
      const x0 = (i - 1) * Lst, x1 = i * Lst;
      const m0 = x0 * (L - x0), m1 = x1 * (L - x1);
      const beta = Math.min(m0, m1) / Math.max(m0, m1);
      const k = Math.min(Math.max(1.4 - 0.8 * beta, 1), 1.4);
      const C1 = Math.min(1.75 - 1.05 * beta + 0.3 * beta * beta, 2.3);
      chiLTd = Math.min(chiLTd, chiLT(Math.sqrt((Wy * fy) / Mcr(k * Lst, C1, 0))));
    }
  } else {
    Mcrd = Mcr(L, 1.13, (-0.45 * h) / (h - tf));
    chiLTd = chiLT(Math.sqrt((Wy * fy) / Mcrd));
  }
  const Mbd = chiLTd * Wy * fy;
  const Mcrz = Mcr(L, 1.13, 0.45);
  const chiLTz = chiLT(Math.sqrt((Wy * fy) / Mcrz));
  const Mbz = chiLTz * Wy * fy;

  // bijlage B, tabel B.2
  const NRk = A * fy;
  const ny = N / (chiy * NRk), nz = N / (chizT * NRk);
  const Cmy = 0.95, CmLTd = kst ? 1.0 : 0.95, CmLTz = 0.95;
  let kyy, kzy;
  if (klasse <= 2) {
    kyy = Cmy * Math.min(1 + (ly - 0.2) * ny, 1 + 0.8 * ny);
    kzy = (Cm) =>
      lzT < 0.4
        ? Math.min(0.6 + lzT, 1 - (0.1 * lzT * nz) / (Cm - 0.25))
        : Math.max(1 - (0.1 * lzT * nz) / (Cm - 0.25), 1 - (0.1 * nz) / (Cm - 0.25));
  } else {
    kyy = Cmy * Math.min(1 + 0.6 * ly * ny, 1 + 0.6 * ny);
    kzy = (Cm) => Math.max(1 - (0.05 * lzT * nz) / (Cm - 0.25), 1 - (0.05 * nz) / (Cm - 0.25));
  }
  const kzyd = kzy(CmLTd), kzyz = kzy(CmLTz);

  // doorbuiging
  const qk = Math.max(w.wd, w.wz) * v.b_belast;
  const delta = (5 * qk * L ** 4) / (384 * E * Iy);
  const UC = {
    V: V / Vpl, d: UCd, N: Nmax / Nb, LTd: Md / Mbd, LTz: Mz / Mbz,
    d661: ny + (kyy * Md) / Mbd, d662: nz + (kzyd * Md) / Mbd,
    z661: ny + (kyy * Mz) / Mbz, z662: nz + (kzyz * Mz) / Mbz,
    δ: delta / (L / v.VerplGrens),
  };
  return {
    w, klasse, kst, Nmax, rho, Aeff, Wy, Npl, Mc, MN, Av, Vpl, Ncry, Ncrz, chiy, chiz, NcrTF, chiTF, Nb, S, chiLTd, Mcrd, Mbd,
    Mcrz, chiLTz, Mbz, kyy, kzyd, kzyz, delta, UC, UCmax: Math.max(...Object.values(UC)),
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
    w_d_k: ruim(r.w.wd), w_z_k: ruim(r.w.wz),
    klasse: String(r.klasse), W_y: ruim(r.Wy / 1e3), N_pl_Rd: ruim(r.Npl / 1e3), M_c_Rd: ruim(r.Mc / 1e6),
    A_v: ruim(r.Av), V_pl_Rd: ruim(r.Vpl / 1e3), UC_V: ruim(r.UC.V), UC_d: ruim(r.UC.d),
    N_cr_y: ruim(r.Ncry / 1e3), χ_y: ruim(r.chiy), N_cr_z: ruim(r.Ncrz / 1e3), χ_z: ruim(r.chiz),
    N_max: ruim(r.Nmax / 1e3), N_b_Rd: ruim(r.Nb / 1e3), UC_N: ruim(r.UC.N), S: ruim(r.S / 1e3),
    χ_LT_d: ruim(r.chiLTd), M_b_Rd_d: ruim(r.Mbd / 1e6), UC_LT_d: ruim(r.UC.LTd),
    M_cr_z: ruim(r.Mcrz / 1e6), χ_LT_z: ruim(r.chiLTz), M_b_Rd_z: ruim(r.Mbz / 1e6), UC_LT_z: ruim(r.UC.LTz),
    k_yy: ruim(r.kyy), k_zy_d: ruim(r.kzyd), k_zy_z: ruim(r.kzyz),
    UC_661_d: ruim(r.UC.d661), UC_662_d: ruim(r.UC.d662), UC_661_z: ruim(r.UC.z661), UC_662_z: ruim(r.UC.z662),
    δ_max: ruim(r.delta), UC_δ: ruim(r.UC.δ), UC_max: ruim(r.UCmax),
  };
  if (v.windbron !== 3) Object.assign(uit, { c_pe_D: ruim(r.w.cD), c_pe_z: ruim(r.w.cz) });
  if (v.windbron === 1) uit.q_p = ruim(r.w.qp);
  if (r.klasse <= 2) uit.M_N_Rd = ruim(r.MN / 1e6);
  if (r.rho < 1) Object.assign(uit, { ρ_w: ruim(r.rho), A_eff: ruim(r.Aeff / 1e2) });
  if (r.kst) Object.assign(uit, { N_cr_TF: ruim(r.NcrTF / 1e3), χ_TF: ruim(r.chiTF) });
  else uit.M_cr_d = ruim(r.Mcrd / 1e6);
  return uit;
}

const SETS = [
  {
    naam: "1 — standaard: IPE 300 S235, 6 m, twee regels die de buitenflens steunen, wind uit de projectgegevens",
    invoer: {},
    // Met de hand: windgebied II, onbebouwd (z_0 = 0,2 m), z = 7 m: k_r = 0,2094,
    // c_r = 0,2094·ln 35 = 0,7444, v_m = 20,10 m/s, I_v = 0,2813 → q_p =
    // (1 + 7·0,2813)·0,625·20,10²/1000 = 0,7495 kN/m². Zone D: (0,8 + 0,3)·q_p =
    // 0,8244; e = min(20; 14) = 14 m, rand belast vlak op 10 − 2,5 = 7,5 m < e →
    // zone B: (0,2 + 0,8)·q_p = 0,7495 kN/m². M_z,Ed = 1,5·0,7495·5·6²/8 = 25,30 kNm.
    // Torsieknik om de as van de regels (a = 150 mm):
    // (7,824 + 7,276 + 16,28)·10⁹ Nmm² / 39 162 mm² = 801,3 kN → λ̄ = 1,256,
    // kromme b → χ = 0,4486. Kip bij winddruk, eindveld: β = 0 → L_kip = 2,8 m,
    // C1 = 1,75, S = 1,277 m → M_cr = 492,9 kNm, λ̄_LT = 0,547 → χ_LT = 0,9404;
    // middenveld β = 1 → 505,9 kNm, χ_LT = 0,9434. Zuiging: L = 6 m, C1 = 1,13,
    // C2 = +0,45 → M_cr = 131,0 kNm, λ̄_LT = 1,061 → χ_LT = 0,6621. (6.62) bij
    // zuiging: 0,0529 + 0,9924·25,30/97,71 = 0,3098 → maatgevend.
    handwerk: {
      q_p: "0.7495", w_d_k: "0.8244", w_z_k: "0.7495",
      N_cr_TF: "801.3", χ_TF: "0.4486", χ_LT_d: "0.9404", M_cr_z: "131.0", χ_LT_z: "0.6621",
      UC_662_z: "0.3098", δ_max: "3.96",
    },
  },
  {
    naam: "2 — HEA 200 S355, CC3, geen regels: kip met de last op de gedrukte flens, flens klasse 2",
    CC: 3,
    invoer: { windbron: 3, profile: 24, staalkwaliteit: 355, L: 4.5, b_belast: 4, n_r: 0, w_d_hand: 1.0, w_z_hand: 0.8, N_Ed: 150 },
  },
  {
    naam: "3 — HEA 300 S355: flens klasse 3 (elastisch), drie regels, dus vier velden",
    invoer: { windbron: 3, profile: 29, staalkwaliteit: 355, L: 8, b_belast: 6, n_r: 3, w_d_hand: 1.2, w_z_hand: 1.0, N_Ed: 80 },
  },
  {
    naam: "4 — HEB 300 S275, één regel, zuiging groter dan druk, N groot genoeg voor (6.36)",
    invoer: { windbron: 3, profile: 53, staalkwaliteit: 275, L: 5, b_belast: 3, n_r: 1, w_d_hand: 0.8, w_z_hand: 1.1, N_Ed: 700 },
  },
  {
    naam: "5 — IPE 200, vier regels die niet aan een windverband vastzitten: voldoet niet",
    invoer: { windbron: 3, profile: 7, L: 7, b_belast: 6, n_r: 4, regelsteun: 0, w_d_hand: 1.0, w_z_hand: 0.8, N_Ed: 20, VerplGrens: 250 },
  },
  {
    naam: "6 — HEA 800, CC1, h/b > 2 (kipkromme c), vijf regels",
    CC: 1,
    invoer: { windbron: 3, profile: 40, L: 12, b_belast: 6, n_r: 5, w_d_hand: 1.0, w_z_hand: 1.0, N_Ed: 100 },
    // Met de hand, knik zonder buiging (zuivere druk): c_w = 790 − 2·28 − 2·30 =
    // 674 mm, c/t = 44,93 > 42ε = 42 → lijf in klasse 4. λ̄_p = 44,93/(28,4·2) =
    // 0,7911 → ρ = (0,7911 − 0,22)/0,7911² = 0,9125; A_eff = 28 580 − 0,0875·674·15
    // = 27 696 mm². N_b,Rd = χ_TF·A_eff·f_y = 0,4185·27 696·235 = 2724 kN (met het
    // bruto oppervlak was het 2811 kN).
    handwerk: { ρ_w: "0.9125", A_eff: "277.0", N_b_Rd: "2724" },
  },
  {
    naam: "7 — kleine kolom op de hoek: windgebied I, bebouwd, zone A, belaste oppervlakte 7,5 m²",
    project: { windgebied: 1, terreincategorie: 3 },
    invoer: { profile: 5, L: 5, b_belast: 1.5, n_r: 1, z_wind: 5, d_geb: 4, a_hoek: 1, N_Ed: 10 },
    // Met de hand: z = 5 m < z_min = 7 m → z = 7; k_r = 0,19·10^0,07 = 0,2232,
    // ln 14 = 2,639 → v_m = 0,5891·29,5 = 17,38 m/s, I_v = 0,3789 → q_p =
    // 3,652·0,625·17,38²/1000 = 0,6895 kN/m². A = 7,5 m²: log A = 0,8751 →
    // c_pe,D = 1,0 − 0,2·0,8751 = 0,8250 en zone A (rand 0,25 m < e/5 = 0,8 m):
    // −1,4 + 0,2·0,8751 = −1,225. w_d = 1,125·0,6895 = 0,7756; w_z = 1,425·0,6895 = 0,9825.
    handwerk: { q_p: "0.6895", c_pe_D: "0.8250", c_pe_z: "-1.225", w_d_k: "0.7756", w_z_k: "0.9825" },
  },
  {
    naam: "8 — q_p zelf ingevuld, hoog en ondiep gebouw (h/d = 3): zone E maatgevend boven zone C, CC3",
    CC: 3,
    invoer: { profile: 11, windbron: 2, q_wind_hand: 0.95, z_wind: 18, d_geb: 6, a_hoek: 30, L: 6 },
  },
  {
    naam: "9 — IPE 600 S355 met een grote drukkracht: lijf in klasse 4",
    invoer: { windbron: 3, profile: 18, staalkwaliteit: 355, L: 6, b_belast: 5, n_r: 2, w_d_hand: 0.5, w_z_hand: 0.4, N_Ed: 2000 },
  },
  {
    naam: "10 — standaard, met N_Ed,max = 300 kN uit de combinatie zonder wind: knik maatgevend",
    invoer: { N_Ed_max: 300 },
    // Met de hand: lijf bij zuivere druk c/t = 35,01 ≤ 42ε, dus het bruto oppervlak.
    // N_b,Rd = χ_TF·A·f_y = 0,4486·5380·235 = 567,2 kN → UC_N = 300/567,2 = 0,5289,
    // groter dan 0,3098 van (6.62) bij zuiging in de windcombinatie.
    handwerk: { N_max: "300", N_b_Rd: "567.2", UC_N: "0.5289", UC_max: "0.5289" },
  },
  {
    naam: "11 — IPE 300 S355 met N_Ed,max = 450 kN: lijf bij zuivere druk in klasse 4, in de windcombinatie klasse 1",
    invoer: { windbron: 3, staalkwaliteit: 355, w_d_hand: 0.6, w_z_hand: 0.5, N_Ed: 50, N_Ed_max: 450 },
    // Met de hand: ε = 0,8136, c/t = 35,01 > 42ε = 34,17 → klasse 4 bij zuivere druk.
    // λ̄_p = 35,01/(28,4·0,8136·2) = 0,7577 → ρ = (0,7577 − 0,22)/0,7577² = 0,9366;
    // A_eff = 5380 − 0,0634·248,6·7,1 = 5268 mm². Torsieknik: N_cr,TF = 801,3 kN,
    // λ̄ = √(5380·355/801 300) = 1,544, Φ = 1,920 → χ_TF = 0,3266 (maatgevend, χ_y =
    // 0,8783). N_b,Rd = 0,3266·5268·355 = 610,8 kN → UC_N = 450/610,8 = 0,7368.
    handwerk: { ρ_w: "0.9366", A_eff: "52.68", χ_TF: "0.3266", N_b_Rd: "610.8", UC_N: "0.7368" },
  },
];

let fouten = 0;
for (const set of SETS) {
  const v = { ...STANDAARD, ...set.invoer };
  const P = { ...PROJECT, ...set.project, ...(set.CC ? { CC: set.CC } : {}) };
  const selectValues = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, selectValues, P);
  const r = uitwerking(v, P);
  fouten += toets(`${set.naam} — narekening`, got, verwachtingen(r, v));
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk);

  // Het oordeel: klasse 4 heeft een eigen zin, anders volgt het uit UC_max.
  let ok;
  if (r.klasse === 4) {
    // De slotzin begint met "Maatgevende UC", zodat de rapportkop ook "voldoet niet" leest.
    ok = /de doorsnede valt in klasse 4, en die valt buiten deze module/.test(got.text) &&
      /Maatgevende UC = [\d.]+ → de kolom voldoet niet/.test(got.text);
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    klasse 4 gemeld`);
  } else {
    const voldoet = /de kolom voldoet(?! niet)/.test(got.text);
    ok = voldoet === r.UCmax <= 1;
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    ons ${voldoet ? "voldoet" : "voldoet niet"}   narekening ${r.UCmax <= 1 ? "voldoet" : "voldoet niet"}`);
  }
  if (!ok) fouten++;
}

// ── De profiellijst van het beeld loopt gelijk met het blad ─────────────────
{
  console.log("\nProfiellijst van het beeld tegen de keuzelijst en de matrix van het blad");
  const ts = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../packages/desktop/src/components/calc/gevelkolomProfielen.ts"), "utf8");
  const beeld = new Map(
    [...ts.matchAll(/^\s*(\d+): \{ naam: "([^"]+)", h: ([\d.]+), b: ([\d.]+), tw: ([\d.]+), tf: ([\d.]+) \}/gm)]
      .map((m) => [Number(m[1]), { naam: m[2], maten: m.slice(3, 7).map(Number) }]),
  );
  const keuze = tpl.slice(tpl.indexOf('@select profile'), tpl.indexOf("@end", tpl.indexOf('@select profile')));
  const opties = [...keuze.matchAll(/^\s+(.+?) = (\d+)$/gm)].map((m) => [Number(m[2]), m[1]]);
  const matrix = tpl.match(/profielen = \[([^\]]+)\]/)[1].split("|").map((k) => k.split(";").map((x) => Number(x.trim())));
  let ok = opties.length === beeld.size && opties.length === matrix[0].length;
  for (const [id, naam] of opties) {
    const b = beeld.get(id);
    const kolom = matrix[0].indexOf(id);
    const maten = [1, 2, 3, 4].map((r) => matrix[r][kolom]);
    if (!b || b.naam !== naam || kolom < 0 || b.maten.some((x, i) => x !== maten[i])) {
      ok = false;
      console.log(`  FOUT   id ${id}: blad "${naam}" ${maten.join("/")}, beeld ${b ? `"${b.naam}" ${b.maten.join("/")}` : "ontbreekt"}`);
    }
  }
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${opties.length} profielen in de keuzelijst, ${beeld.size} in het beeld, ${matrix[0].length} in de matrix`);
}

afronden(fouten, "Stalen gevelkolom");
