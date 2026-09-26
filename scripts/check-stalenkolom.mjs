/**
 * Controlescript voor de module Stalen kolom (NEN-EN 1993-1-1 met NB).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten daarom op twee manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript: het momentverloop over de
 *      kolom (M_Ed door het verloop fijn af te tasten, niet met de formule
 *      van het blad), doorsnedeklasse (tabel 5.2) met een effectief lijf bij
 *      zuivere druk (EN 1993-1-5 §4.4), doorsnede (§6.2), knik om beide assen
 *      en torsieknik om een as in de flens (§6.3.1), M_cr volgens bijlage
 *      NB.NB met χ_LT volgens 6.3.2.3, C_m uit tabel B.3 en de interactie
 *      volgens tabel B.2. Het blad moet daar op 0,2 % mee overeenkomen.
 *   2. Voor het standaardgeval en voor een grensgeval de getallen van een
 *      handberekening, in de commentaarregels bij die sets uitgeschreven.
 *
 * Daarnaast: het oordeel in de slotzin, de meldingen bij verplaatsbare knopen,
 * bij trek en bij L_cr/h < 5 (bijlage NB.NB geldt dan niet), en de
 * beginwaarden van het beeld tegen de standaardinvoer.
 *
 * De profielgegevens staan hieronder los overgenomen uit de profieltabel,
 * zodat ook de matrix in het blad wordt gecontroleerd.
 *
 * Draaien:  node scripts/check-stalenkolom.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const hier = dirname(fileURLToPath(import.meta.url));
const tpl = laadTemplate("stalenKolom.ts");

// ── Standaardinvoer (= de beginwaarden van het beeld) ───────────────────────
const STANDAARD = {
  profiel: 5, staalsoort: 235, knikvorm: 1,
  L_kolom: 3200, L_cry: 3200, L_crz: 3200, L_cr: 3200,
  N_Ed: 400, M_yA: 20, M_yB: -10, q_z: 0, lasthoogte: 1,
};

/**
 * id → h, b, t_w, t_f, r (mm); A (cm²); I_y (cm⁴); W_el,y, W_pl,y (cm³);
 * A_v,z (cm²); I_z (cm⁴); I_t (cm⁴); I_w (10³ cm⁶).
 */
const PROFIEL = {
  5: { naam: "HEA 180", h: 171, b: 180, tw: 6, tf: 9.5, r: 15, A: 45.25, Iy: 2510, Wel: 293.6, Wpl: 324.9, Avz: 14.47, Iz: 924.6, It: 14.8, Iw: 60.21 },
  10: { naam: "HEA 300", h: 290, b: 300, tw: 8.5, tf: 14, r: 27, A: 112.5, Iy: 18260, Wel: 1260, Wpl: 1383, Avz: 37.28, Iz: 6310, It: 85.17, Iw: 1200 },
  11: { naam: "HEB 100", h: 100, b: 100, tw: 6, tf: 10, r: 12, A: 26.04, Iy: 449.5, Wel: 89.91, Wpl: 104.2, Avz: 9.04, Iz: 167.3, It: 9.25, Iw: 3.38 },
  16: { naam: "HEB 200", h: 200, b: 200, tw: 9, tf: 15, r: 18, A: 78.08, Iy: 5696, Wel: 569.6, Wpl: 642.5, Avz: 24.83, Iz: 2003, It: 59.28, Iw: 171.1 },
  21: { naam: "IPE 200", h: 200, b: 100, tw: 5.6, tf: 8.5, r: 12, A: 28.48, Iy: 1943, Wel: 194.3, Wpl: 220.6, Avz: 14.0, Iz: 142.4, It: 6.98, Iw: 12.99 },
  23: { naam: "IPE 270", h: 270, b: 135, tw: 6.6, tf: 10.2, r: 15, A: 45.95, Iy: 5790, Wel: 428.9, Wpl: 484.0, Avz: 22.14, Iz: 419.9, It: 15.94, Iw: 70.58 },
  24: { naam: "IPE 300", h: 300, b: 150, tw: 7.1, tf: 10.7, r: 15, A: 53.81, Iy: 8356, Wel: 557.1, Wpl: 628.4, Avz: 25.68, Iz: 603.8, It: 20.12, Iw: 125.9 },
  26: { naam: "IPE 360", h: 360, b: 170, tw: 8, tf: 12.7, r: 18, A: 72.73, Iy: 16270, Wel: 903.6, Wpl: 1019, Avz: 35.14, Iz: 1043, It: 37.32, Iw: 313.6 },
  27: { naam: "IPE 400", h: 400, b: 180, tw: 8.6, tf: 13.5, r: 21, A: 84.46, Iy: 23130, Wel: 1156, Wpl: 1307, Avz: 42.69, Iz: 1318, It: 51.08, Iw: 490.0 },
};

// ── Onafhankelijke uitwerking; eenheden N en mm ─────────────────────────────
function uitwerking(v) {
  const p = PROFIEL[v.profiel];
  const { h, b, tw, tf, r } = p;
  const A = p.A * 1e2, Iy = p.Iy * 1e4, Iz = p.Iz * 1e4, Wel = p.Wel * 1e3, Wpl = p.Wpl * 1e3;
  const Avz = p.Avz * 1e2, It = p.It * 1e4, Iw = p.Iw * 1e9;
  const fy = v.staalsoort, E = 210000, G = 81000;
  const eps = Math.sqrt(235 / fy);
  const L = v.L_kolom, Lcrz = v.L_crz, Lcr = v.L_cr;
  const verplaatsbaar = v.knikvorm === 2;
  const Lcry = verplaatsbaar ? Math.max(v.L_cry, L) : v.L_cry;
  const N = v.N_Ed * 1e3, MA = v.M_yA * 1e6, MB = v.M_yB * 1e6, q = v.q_z; // q in N/mm

  // Momentverloop van boven (x = 0, M_A) naar onder (x = L, M_B); M_Ed door
  // aftasten, V_Ed als de grootste helling aan een van de einden.
  const M = (x) => MA + ((MB - MA) * x) / L + (q * x * (L - x)) / 2;
  let Mmax = 0;
  for (let i = 0; i <= 20000; i++) Mmax = Math.max(Mmax, Math.abs(M((i / 20000) * L)));
  const Ms = M(L / 2);
  const V = Math.max(Math.abs((MB - MA) / L + (q * L) / 2), Math.abs((MB - MA) / L - (q * L) / 2));

  // doorsnedeklasse, tabel 5.2, bij N en M_Ed
  const cf = (b - tw - 2 * r) / 2, cw = h - 2 * tf - 2 * r;
  const kf = cf / tf / eps;
  const fk = kf <= 9 ? 1 : kf <= 10 ? 2 : kf <= 14 ? 3 : 4;
  const alfa = Math.min(1, 0.5 * (1 + N / (cw * tw * fy)));
  const s1 = N / A + (Mmax * cw) / (2 * Iy), s2 = N / A - (Mmax * cw) / (2 * Iy);
  const psiW = Math.max(s2 / Math.max(s1, 0.001), -3);
  const kw = cw / tw / eps;
  const g1 = alfa > 0.5 ? 396 / (13 * alfa - 1) : 36 / alfa;
  const g2 = alfa > 0.5 ? 456 / (13 * alfa - 1) : 41.5 / alfa;
  const g3 = psiW > -1 ? 42 / (0.67 + 0.33 * psiW) : 62 * (1 - psiW) * Math.sqrt(-psiW);
  const wk = kw <= g1 ? 1 : kw <= g2 ? 2 : kw <= g3 ? 3 : 4;
  const klasse = Math.max(fk, wk);
  const Wy = klasse <= 2 ? Wpl : Wel;

  // lijf bij zuivere druk: EN 1993-1-5 §4.4, ψ = 1, k_σ = 4
  const lp = cw / tw / (28.4 * eps * 2);
  const rho = cw / tw <= 42 * eps ? 1 : Math.min(1, (lp - 0.22) / (lp * lp));
  const Aeff = A - (1 - rho) * cw * tw;

  // §6.2
  const Av = Math.max(Avz, (h - 2 * tf) * tw);
  const Vpl = (Av * fy) / Math.sqrt(3);
  const rhoV = V > 0.5 * Vpl ? (2 * V / Vpl - 1) ** 2 : 0;
  const Nc = (1 - rhoV) * Aeff * fy, Mc = (1 - rhoV) * Wy * fy;
  let UCd, MN = null;
  if (klasse <= 2) {
    const n = N / Nc, a = Math.min((A - 2 * b * tf) / A, 0.5);
    MN = N <= Math.min(0.25 * Nc, 0.5 * (h - 2 * tf) * tw * fy) ? Mc : Math.max(Math.min((Mc * (1 - n)) / (1 - 0.5 * a), Mc), 0);
    UCd = n < 1 ? Math.max(n, Mmax / MN) : n + Mmax / Mc;
  } else UCd = N / Nc + Mmax / Mc;

  // §6.3.1, tabel 6.2 (gewalst I-profiel, t_f ≤ 40 mm)
  const hb = h / b;
  const ay = hb > 1.2 ? 0.21 : 0.34, az = hb > 1.2 ? 0.34 : 0.49;
  const chi = (lam, a) => {
    const F = 0.5 * (1 + a * (lam - 0.2) + lam * lam);
    return Math.min(1, 1 / (F + Math.sqrt(F * F - lam * lam)));
  };
  const NRk = Aeff * fy;
  const Ncry = (Math.PI ** 2 * E * Iy) / Lcry ** 2, Ncrz = (Math.PI ** 2 * E * Iz) / Lcrz ** 2;
  const ly = Math.sqrt(NRk / Ncry), lz = Math.sqrt(NRk / Ncrz);
  const chiy = chi(ly, ay), chiz = chi(lz, az);
  let NcrT = null, lT = 0, chiT = 1;
  if (Lcrz < Lcr) {
    // torsieknik over L_cr om een as op a = h/2 (steun aan één flens)
    const a = h / 2;
    NcrT = ((Math.PI ** 2 * E * Iz * a * a) / Lcr ** 2 + (Math.PI ** 2 * E * Iw) / Lcr ** 2 + G * It) / ((Iy + Iz) / A + a * a);
    lT = Math.sqrt(NRk / NcrT);
    chiT = chi(lT, az);
  }
  const chizT = Math.min(chiz, chiT), lzT = chiT < chiz ? lT : lz;
  const Nb = Math.min(chiy, chizT) * NRk;

  // §6.3.2: C_1, C_2 en L_kip, M_cr volgens bijlage NB.NB
  const Mh = Math.abs(MA) >= Math.abs(MB) ? MA : MB;
  const psi = Mh !== 0 ? (Math.abs(MA) >= Math.abs(MB) ? MB : MA) / Mh : 1;
  const C2q = v.lasthoogte === 1 ? (-0.45 * h) / (h - tf) : v.lasthoogte === 2 ? 0 : 0.45;
  const eindmomenten = MA !== 0 || MB !== 0, last = q !== 0;
  let C1, C2, Lk, kipgeval;
  if (Lcr !== L || (last && eindmomenten)) {
    // C_1 = 1,0: een stabiliserende C_2 (last op de getrokken flens) telt niet mee
    kipgeval = 3; C1 = 1; C2 = last ? Math.min(C2q, 0) : 0; Lk = Lcr;
  } else if (last) {
    kipgeval = 2; C1 = 1.13; C2 = C2q; Lk = Lcr;
  } else {
    kipgeval = 1; C2 = 0;
    C1 = Math.min(1.75 - 1.05 * psi + 0.3 * psi * psi, 2.3);
    Lk = Math.min(Math.max(1.4 - 0.8 * psi, 1), 1.4) * Lcr;
  }
  const S = Math.sqrt((E * Iw) / (G * It));
  const Mcr = ((Math.PI * C1) / Lk) *
    (Math.sqrt(1 + ((Math.PI * S) / Lk) ** 2 * (C2 * C2 + 1)) + (Math.PI * C2 * S) / Lk) *
    Math.sqrt(E * Iz * G * It);
  const aLT = hb <= 2 ? 0.34 : 0.49;
  const lLT = Math.sqrt((Wy * fy) / Mcr);
  const FLT = 0.5 * (1 + aLT * (lLT - 0.4) + 0.75 * lLT * lLT);
  const chiLT = Math.min(1, 1 / (lLT * lLT), 1 / (FLT + Math.sqrt(FLT * FLT - 0.75 * lLT * lLT)));
  const Mb = chiLT * Wy * fy;

  // tabel B.3, gelijkmatige last
  let Cm;
  if (!last) Cm = Math.max(0.6 + 0.4 * psi, 0.4);
  else if (Math.abs(Ms) <= Math.abs(Mh)) {
    const as = Mh !== 0 ? Ms / Mh : 0;
    if (as >= 0) Cm = Math.max(0.2 + 0.8 * as, 0.4);
    else if (psi >= 0) Cm = Math.max(0.1 - 0.8 * as, 0.4);
    else Cm = Math.max(0.1 * (1 - psi) - 0.8 * as, 0.4);
  } else {
    const ah = Mh / Ms;
    Cm = ah >= 0 || psi >= 0 ? 0.95 + 0.05 * ah : 0.95 + 0.05 * ah * (1 + 2 * psi);
  }
  const Cmy = verplaatsbaar ? 0.9 : Cm;
  const CmLT = Lcr === L ? Cm : 1;

  // tabel B.2
  const ny = N / (chiy * NRk), nz = N / (chizT * NRk);
  let kyy, kzy;
  if (klasse <= 2) {
    kyy = Cmy * Math.min(1 + (ly - 0.2) * ny, 1 + 0.8 * ny);
    kzy = lzT < 0.4
      ? Math.min(0.6 + lzT, 1 - (0.1 * lzT * nz) / (CmLT - 0.25))
      : Math.max(1 - (0.1 * lzT * nz) / (CmLT - 0.25), 1 - (0.1 * nz) / (CmLT - 0.25));
  } else {
    kyy = Cmy * Math.min(1 + 0.6 * ly * ny, 1 + 0.6 * ny);
    kzy = Math.max(1 - (0.05 * lzT * nz) / (CmLT - 0.25), 1 - (0.05 * nz) / (CmLT - 0.25));
  }

  const UC = {
    V: V / Vpl, d: UCd, N: N / Nb, LT: Mmax / Mb,
    661: ny + (kyy * Mmax) / Mb, 662: nz + (kzy * Mmax) / Mb,
  };
  return {
    Mmax, Ms, V, klasse, rho, Aeff, Wy, Av, Vpl, rhoV, Nc, Mc, MN, Ncry, chiy, Ncrz, chiz, NcrT, chiT, Nb,
    kipgeval, C1, C2, Lk, S, Mcr, chiLT, Mb, Cm, Cmy, CmLT, kyy, kzy, UC, UCmax: Math.max(...Object.values(UC)),
  };
}

const s4 = (x) => {
  if (x === 0) return "0";
  const dec = Math.max(0, 3 - Math.floor(Math.log10(Math.abs(x))));
  return x.toFixed(dec);
};
const ruim = (x) => ({ waarde: s4(x), tol: Math.max(Math.abs(x) * 0.002, 1e-6) });

function verwachtingen(r) {
  const uit = {
    M_s: ruim(r.Ms / 1e6), M_Ed: ruim(r.Mmax / 1e6), V_Ed: ruim(r.V / 1e3),
    klasse: String(r.klasse), W_y: ruim(r.Wy / 1e3), A_v: ruim(r.Av / 1e2), V_pl_Rd: ruim(r.Vpl / 1e3), UC_V: ruim(r.UC.V),
    N_c_Rd: ruim(r.Nc / 1e3), M_c_Rd: ruim(r.Mc / 1e6), UC_d: ruim(r.UC.d),
    N_cr_y: ruim(r.Ncry / 1e3), χ_y: ruim(r.chiy), N_cr_z: ruim(r.Ncrz / 1e3), χ_z: ruim(r.chiz),
    N_b_Rd: ruim(r.Nb / 1e3), UC_N: ruim(r.UC.N),
    L_kip: ruim(r.Lk), C_1: ruim(r.C1), C_2: ruim(r.C2), S: ruim(r.S), M_cr: ruim(r.Mcr / 1e6),
    χ_LT: ruim(r.chiLT), M_b_Rd: ruim(r.Mb / 1e6), UC_LT: ruim(r.UC.LT),
    C_my: ruim(r.Cmy), C_mLT: ruim(r.CmLT), k_yy: ruim(r.kyy), k_zy: ruim(r.kzy),
    UC_661: ruim(r.UC[661]), UC_662: ruim(r.UC[662]), UC_max: ruim(r.UCmax),
  };
  if (r.klasse <= 2) uit.M_N_Rd = ruim(r.MN / 1e6);
  if (r.rho < 1) Object.assign(uit, { ρ_w: ruim(r.rho), A_eff: ruim(r.Aeff / 1e2) });
  if (r.rhoV > 0) uit.ρ_V = ruim(r.rhoV);
  if (r.NcrT !== null) Object.assign(uit, { N_cr_T: ruim(r.NcrT / 1e3), χ_T: ruim(r.chiT) });
  return uit;
}

const SETS = [
  {
    naam: "1 — standaard: HEA 180 S235, L = 3,2 m, N = 400 kN, M_yA = 20 en M_yB = −10 kNm",
    invoer: {},
    // Met de hand. HEA 180: A = 4525 mm², I_y = 2510·10⁴, I_z = 924,6·10⁴ mm⁴,
    // W_pl,y = 324,9·10³ mm³, I_t = 14,8·10⁴ mm⁴, I_w = 60,21·10⁹ mm⁶; ε = 1.
    // M_Ed = 20 kNm (aan de top), V_Ed = |−10 − 20|/3,2 = 9,375 kN.
    // Klasse: flens c = (180 − 6 − 30)/2 = 72, c/t = 7,58 ≤ 9; lijf c = 171 − 19 −
    // 30 = 122, c/t = 20,33, α = 1 (N > c·t_w·f_y = 172 kN) → grens 396/12 = 33:
    // klasse 1. A_v = max(1447; 152·6) = 1447 mm² → V_pl,Rd = 1447·235/√3 =
    // 196,3 kN. N_c,Rd = 4525·235 = 1063 kN, M_c,Rd = 324,9·10³·235 = 76,35 kNm;
    // n = 0,3762 > 0,25 → a = (4525 − 3420)/4525 = 0,2442, M_N,Rd = 76,35·0,6238/
    // 0,8779 = 54,26 kNm; UC_d = max(0,3762; 20/54,26 = 0,3686) = 0,3762.
    // Knik (h/b = 0,95: kromme b om y, c om z): N_cr,y = π²·210 000·2510·10⁴/3200²
    // = 5080 kN, λ̄_y = √(1063/5080) = 0,4575, Φ = 0,6484, χ_y = 0,9026;
    // N_cr,z = 1871 kN, λ̄_z = 0,7538, Φ = 0,9198, χ_z = 0,6912 → N_b,Rd = 735,0 kN,
    // UC_N = 0,5442.
    // Kip, geval 1 met β = ψ = −10/20 = −0,5: L_kip = min(1,4 + 0,4; 1,4)·3200 =
    // 4480 mm, C_1 = min(1,75 + 0,525 + 0,075; 2,3) = 2,3. S = √(E·I_w/(G·I_t)) =
    // 1027 mm; √(EI_z·GI_t) = 1,5257·10¹¹ Nmm²; √(1 + π²·1027²/4480²) = 1,2323
    // → M_cr = π·2,3/4480·1,2323·1,5257·10¹¹ = 303,2 kNm. λ̄_LT = √(76,35/303,2)
    // = 0,5018, kromme b: Φ_LT = 0,5·(1 + 0,34·0,1018 + 0,75·0,2518) = 0,6117 →
    // χ_LT = 1/(0,6117 + √(0,3742 − 0,1889)) = 0,9595; M_b,Rd = 73,26 kNm.
    // Tabel B.3: C_m = 0,6 + 0,4·(−0,5) = 0,4 (= de ondergrens).
    // n_y = 400/(0,9026·1063) = 0,4168, n_z = 0,5442.
    // k_yy = 0,4·min(1 + 0,2575·0,4168; 1 + 0,8·0,4168) = 0,4429;
    // k_zy = max(1 − 0,1·0,7538·0,5442/0,15; 1 − 0,1·0,5442/0,15) = 0,7265.
    // (6.61): 0,4168 + 0,4429·20/73,26 = 0,5377; (6.62): 0,5442 + 0,7265·0,2730
    // = 0,7426 → maatgevend, de kolom voldoet.
    handwerk: {
      V_Ed: "9.375", V_pl_Rd: "196.3", M_N_Rd: "54.26", UC_d: "0.3762", N_cr_y: "5080", χ_y: "0.9026",
      N_cr_z: "1871", χ_z: "0.6912", N_b_Rd: "735.0", L_kip: "4480", C_1: "2.3", S: "1027", M_cr: "303.2",
      χ_LT: "0.9595", M_b_Rd: "73.26", C_my: "0.4", k_yy: "0.4429", k_zy: "0.7265",
      UC_661: "0.5377", UC_662: "0.7426", UC_max: "0.7426",
    },
  },
  {
    naam: "2 — grensgeval: IPE 300 S355, lijf bij zuivere druk net slank (c/t = 35,01 > 42ε = 34,17), h/b = 2,00 precies, q_z op de gedrukte flens",
    invoer: { profiel: 24, staalsoort: 355, L_kolom: 3000, L_cry: 3000, L_crz: 3000, L_cr: 3000, N_Ed: 500, M_yA: 0, M_yB: 0, q_z: 6 },
    // Met de hand. IPE 300: A = 5381 mm², I_y = 8356·10⁴, I_z = 603,8·10⁴ mm⁴,
    // W_el,y = 557,1·10³ mm³, I_t = 20,12·10⁴ mm⁴, I_w = 125,9·10⁹ mm⁶;
    // ε = √(235/355) = 0,8136.
    // Lijf bij zuivere druk: c = 300 − 2·10,7 − 2·15 = 248,6 mm, c/t = 35,01 >
    // 42ε = 34,17 → λ̄_p = 35,01/(28,4·0,8136·2) = 0,7577, ρ = (0,7577 − 0,22)/
    // 0,7577² = 0,9366 → A_eff = 5381 − 0,0634·248,6·7,1 = 5269 mm² = 52,69 cm².
    // Belasting: M_Ed = 6·3²/8 = 6,75 kNm halverwege, V_Ed = 6·3/2 = 9 kN.
    // Klasse bij N en M: α = 0,5·(1 + 500/626,6) = 0,8990; σ_N = 92,92 en σ_M =
    // 6,75·10⁶·124,3/8356·10⁴ = 10,04 N/mm² → ψ = 82,88/102,96 = 0,8050.
    // Grenzen 396/(13·0,899 − 1) = 37,06, 456/10,69 = 42,67 en 42/(0,67 + 0,33·0,805)
    // = 44,89; c/(t·ε) = 43,04 → lijf klasse 3, flens klasse 1: elastisch.
    // (6.42): N_c,Rd = 5269·355 = 1871 kN, M_c,Rd = 557,1·10³·355 = 197,8 kNm →
    // UC_d = 500/1871 + 6,75/197,8 = 0,2673 + 0,0341 = 0,3014.
    // Knik (h/b = 2,0 > 1,2: kromme a om y, b om z): N_cr,y = 19 243 kN, λ̄_y =
    // √(1871/19 243) = 0,3118, Φ_y = 0,5603 → χ_y = 0,9747. N_cr,z = π²·210 000·
    // 603,8·10⁴/3000² = 1390 kN, λ̄_z = √(1871/1390) = 1,160, Φ_z = 0,5·(1 + 0,34·
    // 0,960 + 1,3452) = 1,3358 → χ_z = 1/(1,3358 + √(1,7843 − 1,3452)) = 0,5004;
    // N_b,Rd = 0,5004·1871 = 936,0 kN, UC_N = 0,5342.
    // Kip, geval 2: C_1 = 1,13, C_2 = −0,45·300/289,3 = −0,4666 (buitenvlak van de
    // gedrukte flens). S = √(210 000·125,9·10⁹/(81 000·20,12·10⁴)) = 1274 mm;
    // πS/L = 1,3338 → √(1 + 1,7791·(0,2178 + 1)) − 0,4666·1,3338 = 1,7795 − 0,6224
    // = 1,1570; √(EI_z·GI_t) = √(1,2680·10¹²·1,6297·10¹⁰) = 1,4375·10¹¹ Nmm² →
    // M_cr = π·1,13/3000·1,1570·1,4375·10¹¹ = 196,8 kNm. W_y = W_el,y (klasse 3):
    // λ̄_LT = √(197,8/196,8) = 1,002; h/b = 2,00 ≤ 2 → kipkromme b (α = 0,34):
    // Φ_LT = 0,5·(1 + 0,34·0,602 + 0,75·1,0048) = 0,9792 → χ_LT = 1/(0,9792 +
    // √(0,9589 − 0,7536)) = 0,6982, M_b,Rd = 0,6982·197,8 = 138,1 kNm.
    // Tabel B.3: alleen q_z, M_h = 0 → α_h = 0 → C_m = 0,95.
    // n_y = 500/(0,9747·1871) = 0,2742, n_z = 0,5342. Klasse 3, tabel B.2:
    // k_yy = 0,95·min(1 + 0,6·0,3118·0,2742; 1 + 0,6·0,2742) = 0,9987;
    // k_zy = max(1 − 0,05·1,160·0,5342/0,70; 1 − 0,05·0,5342/0,70) = 0,9618.
    // (6.62): 0,5342 + 0,9618·6,75/138,1 = 0,5812 → maatgevend, de kolom voldoet.
    handwerk: {
      ρ_w: "0.9366", A_eff: "52.69", klasse: "3", M_Ed: "6.75", N_c_Rd: "1871", UC_d: "0.3014",
      χ_y: "0.9747", N_cr_z: "1390", χ_z: "0.5004", N_b_Rd: "936.0", C_2: "-0.4666", S: "1274", M_cr: "196.8",
      χ_LT: "0.6982", M_b_Rd: "138.1", C_my: "0.95", k_yy: "0.9987", k_zy: "0.9618", UC_662: "0.5812", UC_max: "0.5812",
    },
  },
  {
    naam: "3 — HEB 200 S275, alleen q_z in het zwaartepunt, L = 4 m",
    invoer: { profiel: 16, staalsoort: 275, L_kolom: 4000, L_cry: 4000, L_crz: 4000, L_cr: 4000, N_Ed: 600, M_yA: 0, M_yB: 0, q_z: 5, lasthoogte: 2 },
  },
  {
    naam: "4 — als 3, q_z op de getrokken flens",
    invoer: { profiel: 16, staalsoort: 275, L_kolom: 4000, L_cry: 4000, L_crz: 4000, L_cr: 4000, N_Ed: 600, M_yA: 0, M_yB: 0, q_z: 5, lasthoogte: 3 },
  },
  {
    naam: "5 — HEB 200, eindmomenten en q_z samen (kip met C_1 = 1,0), enkele kromming, |M_s| > |M_h|",
    invoer: { profiel: 16, L_kolom: 5000, L_cry: 5000, L_crz: 5000, L_cr: 5000, N_Ed: 500, M_yA: 30, M_yB: 10, q_z: 8 },
  },
  {
    naam: "6 — HEA 300, ingeklemd aan beide einden: M_yA = M_yB = −q·L²/12 → α_s = −0,5, ψ = 1, C_m = 0,5",
    invoer: { profiel: 10, L_kolom: 6000, L_cry: 6000, L_crz: 6000, L_cr: 6000, N_Ed: 800, M_yA: -24, M_yB: -24, q_z: 8 },
    handwerk: { M_s: "12", M_Ed: "24", C_my: "0.5" },
  },
  {
    naam: "7 — HEA 300, dubbele kromming met q_z, |M_s| ≤ |M_h|, α_s < 0 en ψ < 0",
    invoer: { profiel: 10, L_kolom: 6000, L_cry: 6000, L_crz: 6000, L_cr: 6000, N_Ed: 800, M_yA: -60, M_yB: 20, q_z: 4 },
  },
  {
    naam: "8 — HEA 300, |M_s| > |M_h| met α_h < 0 en ψ < 0: C_m = 0,95 + 0,05·α_h·(1 + 2ψ)",
    invoer: { profiel: 10, L_kolom: 6000, L_cry: 6000, L_crz: 6000, L_cr: 6000, N_Ed: 800, M_yA: -10, M_yB: 4, q_z: 10 },
  },
  {
    naam: "9 — verplaatsbare knopen met L_cr,y < L: gerekend met L, C_my = 0,9",
    invoer: { knikvorm: 2, L_cry: 2500, N_Ed: 300, M_yA: 15, M_yB: 0 },
    tekst: /Bij verplaatsbare knopen is L cr,y ten minste L/,
    handwerk: { N_cr_y: "5080", C_my: "0.9" },
  },
  {
    naam: "10 — IPE 200, L_cr,z = L/2 < L_cr: torsieknik om een as in de flens",
    invoer: { profiel: 21, L_kolom: 4000, L_cry: 4000, L_crz: 2000, L_cr: 4000, N_Ed: 150, M_yA: 8, M_yB: 8 },
  },
  {
    naam: "11 — HEB 200, L_cr = 2 m < L: C_1 = 1,0 en C_mLT = 1,0",
    invoer: { profiel: 16, L_kolom: 4000, L_cry: 4000, L_crz: 2000, L_cr: 2000, N_Ed: 500, M_yA: 40, M_yB: 20 },
  },
  {
    naam: "12 — HEA 300 S355: flens in klasse 3, elastische toetsen",
    invoer: { profiel: 10, staalsoort: 355, L_kolom: 5000, L_cry: 5000, L_crz: 5000, L_cr: 5000, N_Ed: 1500, M_yA: 60, M_yB: 60 },
  },
  {
    naam: "13 — HEB 100, korte kolom met een groot momentverloop: V_Ed > 0,5·V_pl,Rd",
    invoer: { profiel: 11, L_kolom: 600, L_cry: 600, L_crz: 600, L_cr: 600, N_Ed: 50, M_yA: 20, M_yB: -20 },
    // Met de hand: V_Ed = 40/0,6 = 66,67 kN; A_v = 904 mm² → V_pl,Rd = 904·235/√3 =
    // 122,65 kN, dus V_Ed/V_pl,Rd = 0,5435 > 0,5 → ρ = (2·0,5435 − 1)² = 0,0871² =
    // 0,00758: N_c,Rd en M_c,Rd met (1 − ρ)·f_y.
    handwerk: { V_Ed: "66.67", V_pl_Rd: "122.7", ρ_V: "0.00758" },
  },
  {
    naam: "14 — IPE 400 zonder normaalkracht (h/b > 2: kipkromme c), M_yA = 0",
    invoer: { profiel: 27, L_kolom: 6000, L_cry: 6000, L_crz: 6000, L_cr: 6000, N_Ed: 0, M_yA: 0, M_yB: 120 },
  },
  {
    naam: "15 — HEA 180 met N_Ed net boven 0,5·h_w·t_w·f_y = 107,2 kN (6.34): (6.36) begrensd op M_pl,Rd",
    invoer: { N_Ed: 108, M_yA: 30, M_yB: 30 },
    // Met de hand: 108 kN > 0,5·152·6·235 = 107,2 kN, dus (6.36): n = 108/1063 =
    // 0,1016, a = 0,2442 → 76,35·0,8984/0,8779 = 78,13 kNm > M_pl,Rd → 76,35 kNm.
    handwerk: { M_N_Rd: "76.35" },
  },
  {
    naam: "16 — HEA 180, te slank: voldoet niet",
    invoer: { L_kolom: 6000, L_cry: 6000, L_crz: 6000, L_cr: 6000, N_Ed: 350, M_yA: 25, M_yB: 25 },
  },
  {
    naam: "17 — IPE 360 S355 zonder buiging: lijf in klasse 4 (6.44), L_cr,z = L/2 → torsieknik maatgevend",
    invoer: { profiel: 26, staalsoort: 355, L_kolom: 3000, L_cry: 3000, L_crz: 1500, L_cr: 3000, N_Ed: 1200, M_yA: 0, M_yB: 0 },
  },
  {
    naam: "18 — IPE 270 S275, L = 5 m, N = 150 kN, M_yA = 0 en M_yB = 40 kNm (ψ = 0): tweede handberekening",
    invoer: { profiel: 23, staalsoort: 275, L_kolom: 5000, L_cry: 5000, L_crz: 5000, L_cr: 5000, N_Ed: 150, M_yA: 0, M_yB: 40 },
    // Met de hand. IPE 270: A = 4595 mm², I_y = 5790·10⁴, I_z = 419,9·10⁴ mm⁴,
    // W_pl,y = 484,0·10³ mm³, A_v,z = 2214 mm², I_t = 15,94·10⁴ mm⁴,
    // I_w = 70,58·10⁹ mm⁶; ε = √(235/275) = 0,9244.
    // M_Ed = 40 kNm (onderaan), V_Ed = 40/5 = 8 kN.
    // Klasse: flens c/t = 49,2/10,2 = 4,82 = 5,22ε; lijf c = 270 − 20,4 − 30 =
    // 219,6 mm, c/t = 33,27 = 35,99ε; α = 0,5·(1 + 150/398,6) = 0,6882 → grens
    // 396/(13·0,6882 − 1) = 49,84: klasse 1. Bij zuivere druk 33,27 ≤ 42ε = 38,83.
    // V_pl,Rd = 2214·275/√3 = 351,5 kN. N_pl,Rd = 1264 kN, M_pl,Rd = 133,1 kNm;
    // 150 kN < 0,25·1264 en < 0,5·249,6·6,6·275 = 226,5 kN → M_N,Rd = M_pl,Rd,
    // UC_d = 40/133,1 = 0,3005.
    // Knik (h/b = 2,0: kromme a om y, b om z): N_cr,y = π²·210 000·5790·10⁴/5000²
    // = 4800 kN, λ̄_y = 0,5131, Φ_y = 0,6645, χ_y = 0,9202; N_cr,z = 348,1 kN,
    // λ̄_z = 1,905, Φ_z = 2,605, χ_z = 0,2283 → N_b,Rd = 288,4 kN, UC_N = 0,5201.
    // Kip, geval 1 met β = 0: L_kip = 1,4·5000 = 7000 mm, C_1 = 1,75, C_2 = 0.
    // S = √(210 000·70,58·10⁹/(81 000·15,94·10⁴)) = 1071 mm; πS/L_kip = 0,4809 →
    // √(1 + 0,2312) = 1,1096; √(EI_z·GI_t) = 1,0670·10¹¹ Nmm² → M_cr = π·1,75/
    // 7000·1,1096·1,0670·10¹¹ = 92,99 kNm. λ̄_LT = √(133,1/92,99) = 1,196, kromme
    // b (h/b = 2,0): Φ_LT = 0,5·(1 + 0,34·0,796 + 0,75·1,431) = 1,172 → χ_LT =
    // 1/(1,172 + √(1,3739 − 1,0735)) = 0,5813; M_b,Rd = 77,37 kNm, UC_LT = 0,5170.
    // Tabel B.3: C_m = 0,6 + 0,4·0 = 0,6. n_y = 150/(0,9202·1264) = 0,1290,
    // n_z = 0,5201. k_yy = 0,6·min(1 + 0,3131·0,1290; 1 + 0,8·0,1290) = 0,6242;
    // k_zy = max(1 − 0,1·1,905·0,5201/0,35; 1 − 0,1·0,5201/0,35) = 0,8514.
    // (6.61): 0,1290 + 0,6242·40/77,37 = 0,4517; (6.62): 0,5201 + 0,8514·0,5170
    // = 0,9602 → maatgevend, de kolom voldoet.
    handwerk: {
      V_Ed: "8", V_pl_Rd: "351.5", klasse: "1", M_N_Rd: "133.1", UC_d: "0.3005", N_cr_y: "4800", χ_y: "0.9202",
      N_cr_z: "348.1", χ_z: "0.2283", N_b_Rd: "288.4", UC_N: "0.5201", L_kip: "7000", C_1: "1.75", S: "1071",
      M_cr: "92.99", χ_LT: "0.5813", M_b_Rd: "77.37", UC_LT: "0.5170", C_my: "0.6", k_yy: "0.6242", k_zy: "0.8514",
      UC_661: "0.4517", UC_662: "0.9602", UC_max: "0.9602",
    },
  },
  {
    naam: "19 — HEA 180, eindmomenten en een kleine q_z op de getrokken flens: C_1 = 1,0 zonder stabiliserende C_2",
    invoer: { M_yA: 20, M_yB: 20, q_z: 0.1, lasthoogte: 3 },
    // Met de hand: geval 3, C_1 = 1,0 en C_2 = 0 (niet +0,45: de last op de
    // getrokken flens mag M_cr bij C_1 = 1,0 niet verhogen). πS/L = π·1027/3200
    // = 1,0083 → M_cr = π/3200·√(1 + 1,0166)·1,5257·10¹¹ = 212,7 kNm, gelijk aan
    // het geval zonder q_z.
    handwerk: { C_1: "1", C_2: "0", M_cr: "212.7" },
  },
  {
    naam: "20 — IPE 400, korte kolom: L_cr/h = 1800/400 = 4,5 < 5, bijlage NB.NB geldt niet (NB.NB.1(2))",
    invoer: { profiel: 27, L_kolom: 1800, L_cry: 1800, L_crz: 1800, L_cr: 1800, N_Ed: 400, M_yA: 40, M_yB: 0 },
    tekst: /L cr \/h &lt; 5: de rekenregels van bijlage NB\.NB gelden hier niet \(NB\.NB\.1\(2\)\)/,
  },
];

let fouten = 0;
for (const set of SETS) {
  const v = { ...STANDAARD, ...set.invoer };
  const selectValues = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, selectValues, {});
  const r = uitwerking(v);
  fouten += toets(`${set.naam} — narekening`, got, verwachtingen(r));
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk);
  if (set.tekst) {
    const ok = set.tekst.test(got.text);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} melding    ${set.tekst}`);
  }
  // De melding bij L_cr/h < 5 staat er precies dan, en anders niet.
  const kort = v.L_cr < 5 * PROFIEL[v.profiel].h;
  const gemeld = /bijlage NB\.NB gelden hier niet/.test(got.text);
  if (gemeld !== kort) fouten++;
  console.log(`  ${gemeld === kort ? "OK    " : "FOUT  "} L_cr/h     ${kort ? "< 5, gemeld" : "≥ 5, geen melding"}`);
  const voldoet = /de kolom voldoet(?! niet)/.test(got.text);
  const ok = voldoet === r.UCmax <= 1 && /Maatgevende UC = [\d.]+/.test(got.text);
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    ons ${voldoet ? "voldoet" : "voldoet niet"}   narekening ${r.UCmax <= 1 ? "voldoet" : "voldoet niet"}`);
}

// ── Trek: niet getoetst, en de rapportkop mag geen "voldoet" lezen ──────────
{
  console.log("\nTrek in plaats van druk");
  const v = { ...STANDAARD, N_Ed: -100 };
  const got = reken(tpl, Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)])), {});
  const ok = /N Ed is een trekkracht; dit blad toetst een kolom op druk/.test(got.text) &&
    /Maatgevende UC = [\d.]+ → de kolom is niet getoetst/.test(got.text) && !/de kolom voldoet/.test(got.text);
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} melding en slotzin "niet getoetst"`);
}

// ── De beginwaarden van het beeld zijn de standaardinvoer van dit script ─────
{
  console.log("\nBeginwaarden van het beeld tegen de standaardinvoer");
  const tsx = readFileSync(join(hier, "../packages/desktop/src/components/calc/StalenKolomDesigner.tsx"), "utf8");
  const blok = tsx.match(/const DEFAULTS[^{]*\{([^}]+)\}/)[1];
  const beeld = Object.fromEntries([...blok.matchAll(/(\w+): (-?[\d.]+)/g)].map((m) => [m[1], Number(m[2])]));
  const verschil = [...new Set([...Object.keys(beeld), ...Object.keys(STANDAARD)])].filter((k) => beeld[k] !== STANDAARD[k]);
  const ok = verschil.length === 0;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${Object.keys(beeld).length} beginwaarden${ok ? " gelijk" : `, verschil in ${verschil.join(", ")}`}`);
}

// ── Elke invoer van het blad heeft een beginwaarde in het beeld ─────────────
{
  console.log("\nInvoer van het blad tegen de beginwaarden van het beeld");
  const namen = new Set([
    ...[...tpl.matchAll(/^\s*([^\s='#]+)\s*=\s*\?/gmu)].map((m) => m[1]),
    ...[...tpl.matchAll(/@select\s+(\S+)/g)].map((m) => m[1]),
  ]);
  const ontbreekt = [...namen].filter((n) => !(n in STANDAARD));
  const over = Object.keys(STANDAARD).filter((n) => !namen.has(n));
  const ok = ontbreekt.length === 0 && over.length === 0;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${namen.size} invoervelden${ontbreekt.length ? `; zonder beginwaarde: ${ontbreekt.join(", ")}` : ""}${over.length ? `; niet in het blad: ${over.join(", ")}` : ""}`);
}

afronden(fouten, "Stalen kolom");
