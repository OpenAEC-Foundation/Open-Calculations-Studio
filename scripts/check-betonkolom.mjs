/**
 * Controlescript voor de module Betonkolom (NEN-EN 1992-1-1 met NB).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten daarom op twee manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript. De doorsnede is hier een
 *      lijst staven met hun werkelijke plaats (u langs b, w langs h), niet de
 *      rijen van het blad; de drukzone van de ronde doorsnede wordt numeriek
 *      geïntegreerd (Simpson) in plaats van met de segmentformule, en x volgt
 *      uit een eigen bisectie op log x. Daarna dezelfde normketen: imperfectie
 *      (5.1)/(5.2), λ_lim (5.13N), de nominale kromming (5.31)–(5.37), de
 *      scheiding (5.38) en (5.39) in twee gevallen, en de detaillering van
 *      §9.5 en §9.8.5. Het blad moet op 0,2 % overeenkomen.
 *   2. Voor het standaardgeval een handberekening, en twee grensgevallen: net
 *      onder en net boven λ_lim, en net onder en net boven N_Rd,max.
 *
 * Draaien:  node scripts/check-betonkolom.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("betonkolom.ts");

// ── Standaardinvoer, gelijk aan de DEFAULTS van het beeld ───────────────────
const STANDAARD = {
  vorm: 1, h_kol: 350, b_kol: 350, L_kol: 3500, insitu: 0,
  betonklasse: 30, betonstaal: 2, c_dek: 30,
  n_h: 3, n_b: 3, n_rond: 8, d_staaf: 20, d_beugel: 8, s_beugel: 250,
  L_cry: 3500, L_crz: 3500, geschoord_y: 1, geschoord_z: 1,
  N_Ed: 1200, "φ_ef": 1.5, M_yEd: 40, M_yEd_1: 20, M_zEd: 10, M_zEd_1: 10,
};

const klem = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// ── Doorsnede: N_R(x) en M_R(x) voor een lijst staven; eenheden N en mm ─────
/**
 * @param H      hoogte in de buigrichting
 * @param beton  (s) → { N, M }: drukkracht van het spanningsblok met hoogte s en
 *               het moment daarvan om het midden
 * @param ys     afstanden van de staven tot de gedrukte rand
 */
function doorsnede(H, beton, ys, A1, fcd, fyd, eta) {
  const eps = (x, y) => (x <= H ? (0.0035 * (x - y)) / x : (0.00175 * (x - y)) / (x - H / 2));
  const sig = (e) => klem(200000 * e, -fyd, fyd);
  const NR = (x) => {
    const s = Math.min(0.8 * x, H);
    let N = beton(s).N;
    for (const y of ys) N += A1 * (sig(eps(x, y)) - (y < s ? eta * fcd : 0));
    return N;
  };
  const MR = (x) => {
    const s = Math.min(0.8 * x, H);
    let M = beton(s).M;
    for (const y of ys) M += A1 * (sig(eps(x, y)) - (y < s ? eta * fcd : 0)) * (H / 2 - y);
    return M;
  };
  return { NR, MR };
}

/** x uit N_R(x) = N, met een bisectie op log x. */
function zoekX(NR, N) {
  let lo = Math.log(1e-9), hi = Math.log(1e12);
  for (let i = 0; i < 200; i++) {
    const m = (lo + hi) / 2;
    if (NR(Math.exp(m)) < N) lo = m; else hi = m;
  }
  return Math.exp((lo + hi) / 2);
}

/** Simpson over [0, s] van f. */
function simpson(f, s, n = 4000) {
  if (s <= 0) return 0;
  const hh = s / n;
  let som = f(0) + f(s);
  for (let i = 1; i < n; i++) som += (i % 2 ? 4 : 2) * f(i * hh);
  return (som * hh) / 3;
}

// ── Onafhankelijke uitwerking; eenheden N en mm ─────────────────────────────
function uitwerking(v) {
  const rond = v.vorm === 2;
  const fck = v.betonklasse, fcd = fck / 1.5, fyd = 500 / 1.15, eyd = fyd / 200000;
  const red = (x) => (x < 400 ? x - 20 : x <= 1000 ? 0.95 * x : x - 50); // §2.3.4.2(2)
  const hN = v.h_kol, bN = rond ? v.h_kol : v.b_kol;
  const h = v.insitu ? red(hN) : hN;
  const b = rond ? h : v.insitu ? red(bN) : bN;
  const as = v.c_dek + v.d_beugel + v.d_staaf / 2;
  const A1 = (Math.PI * v.d_staaf ** 2) / 4;

  // Staven als (u, w) vanaf het midden: u langs b, w langs h.
  const staven = (psi = 0) => {
    const uit = [];
    if (rond) {
      const n = klem(Math.round(v.n_rond), 3, 20);
      const R = hN / 2 - as;
      for (let i = 0; i < n; i++) {
        const a = (2 * Math.PI * i) / n + psi;
        uit.push({ u: R * Math.sin(a), w: R * Math.cos(a) });
      }
    } else {
      const nh = klem(Math.round(v.n_h), 2, 10), nb = klem(Math.round(v.n_b), 2, 10);
      const eu = bN / 2 - as, ew = hN / 2 - as;
      for (let i = 0; i < nb; i++) {
        const u = -eu + (2 * eu * i) / (nb - 1);
        uit.push({ u, w: ew }, { u, w: -ew });
      }
      for (let j = 1; j < nh - 1; j++) {
        const w = -ew + (2 * ew * j) / (nh - 1);
        uit.push({ u: -eu, w }, { u: eu, w });
      }
    }
    return uit;
  };
  const st = staven();
  const nS = st.length, As = nS * A1;
  const Ac = rond ? (Math.PI * h * h) / 4 : b * h;
  const iy = rond ? h / 4 : h / Math.sqrt(12), iz = rond ? h / 4 : b / Math.sqrt(12);
  // Traagheidsstraal van de wapening, rechtstreeks uit de staafposities.
  const isy = Math.sqrt(st.reduce((s, p) => s + p.w * p.w, 0) / nS);
  const isz = Math.sqrt(st.reduce((s, p) => s + p.u * p.u, 0) / nS);
  const omega = (As * fyd) / (Ac * fcd);

  // Eerste orde en imperfectie
  const N = v.N_Ed * 1e3;
  const sorteer = (Ma, Mb) => {
    const M0 = Math.max(Math.abs(Ma), Math.abs(Mb));
    const M1 = Math.abs(Ma) >= Math.abs(Mb) ? Mb * Math.sign(Ma) : Ma * Math.sign(Mb);
    return { M0: M0 * 1e6, M1: M1 * 1e6 };
  };
  const my = sorteer(v.M_yEd, v.M_yEd_1), mz = sorteer(v.M_zEd, v.M_zEd_1);
  const lamy = v.L_cry / iy, lamz = v.L_crz / iz;
  const druk = N > 0;
  const alfah = klem(2 / Math.sqrt(v.L_kol / 1000), 2 / 3, 1);
  const theta = alfah / 200;
  const n = N / (Ac * fcd);
  const A = 1 / (1 + 0.2 * v["φ_ef"]), B = Math.sqrt(1 + 2 * omega);
  const Kr = klem((1 + omega - n) / (1 + omega - 0.4), 0, 1);

  const as_ = (m, L0, lam, geschoord, Hs, is, e0) => {
    const r = { lam };
    if (!druk) {
      r.MEd = m.M0;
      r.M0 = m.M0;
      return r;
    }
    r.ei = (theta * L0) / 2;
    r.M02 = m.M0 + N * r.ei;
    r.M01 = m.M1 + N * r.ei;
    r.C = geschoord ? 1.7 - r.M01 / r.M02 : 0.7;
    r.lamlim = (20 * A * B * r.C) / Math.sqrt(n);
    r.t2 = lam > r.lamlim;
    r.M2 = 0;
    if (r.t2) {
      r.Kphi = Math.max(1, 1 + (0.35 + fck / 200 - lam / 150) * v["φ_ef"]);
      r.d = Hs / 2 + is;
      // c = 10, bij een constant eerste-orde-moment 8 (5.8.8.2(4)); daartussen
      // lineair met de verhouding van de ingevoerde eindmomenten.
      r.c = 10 - 2 * Math.max(0, m.M0 > 0 ? m.M1 / m.M0 : 0);
      r.e2 = ((Kr * r.Kphi * eyd) / (0.45 * r.d)) * (L0 * L0) / r.c;
      r.M2 = N * r.e2;
    }
    r.e0 = e0;
    if (geschoord) {
      r.M0e = Math.max(0.6 * r.M02 + 0.4 * r.M01, 0.4 * r.M02);
      r.MEd = Math.max(r.M0e + r.M2, r.M02, N * e0);
      // zonder imperfectie en zonder e_0, voor scheve buiging
      r.M0 = Math.max(Math.max(0.6 * m.M0 + 0.4 * m.M1, 0.4 * m.M0) + r.M2, m.M0);
    } else {
      r.MEd = Math.max(r.M02 + r.M2, N * e0);
      r.M0 = m.M0 + r.M2;
    }
    return r;
  };
  const Y = as_(my, v.L_cry, lamy, v.geschoord_y === 1, h, isy, Math.max(h / 30, 20));
  const Z = as_(mz, v.L_crz, lamz, v.geschoord_z === 1, b, isz, Math.max(b / 30, 20));

  // Doorsnede
  const eta = rond ? 0.9 : 1.0;
  const Nmax = eta * fcd * Ac + As * (200000 * 0.00175 - eta * fcd);
  const Nmin = -As * fyd;
  const Nt = klem(N, 0.999999 * Nmin, 0.999999 * Nmax);
  let xy, xz, MRdy, MRdz;
  if (rond) {
    const R = h / 2;
    const breedte = (t) => 2 * Math.sqrt(Math.max(0, R * R - (R - t) ** 2));
    const beton = (s) => ({
      N: eta * fcd * simpson(breedte, s),
      M: eta * fcd * simpson((t) => breedte(t) * (R - t), s),
    });
    let best = null;
    for (const psi of [0, Math.PI / klem(Math.round(v.n_rond), 3, 20)]) {
      const ys = staven(psi).map((p) => h / 2 - p.w);
      const { NR, MR } = doorsnede(h, beton, ys, A1, fcd, fyd, eta);
      const x = zoekX(NR, Nt);
      const M = MR(x);
      if (!best || M < best.M) best = { x, M };
    }
    xy = xz = best.x;
    MRdy = MRdz = best.M;
  } else {
    const opY = doorsnede(h, (s) => ({ N: fcd * b * s, M: fcd * b * s * (h - s) / 2 }), st.map((p) => h / 2 - p.w), A1, fcd, fyd, 1);
    const opZ = doorsnede(b, (s) => ({ N: fcd * h * s, M: fcd * h * s * (b - s) / 2 }), st.map((p) => b / 2 - p.u), A1, fcd, fyd, 1);
    xy = zoekX(opY.NR, Nt);
    xz = zoekX(opZ.NR, Nt);
    MRdy = opY.MR(xy);
    MRdz = opZ.MR(xz);
  }
  const buiten = N >= Nmax || N <= Nmin;
  const UCy = N >= Nmax ? N / Nmax : N <= Nmin ? N / Nmin : Y.MEd / MRdy;
  const UCz = N >= Nmax ? N / Nmax : N <= Nmin ? N / Nmin : Z.MEd / MRdz;

  // Scheve buiging (5.38) en (5.39)
  const My0 = druk ? Y.M0 : Y.MEd, Mz0 = druk ? Z.M0 : Z.MEd;
  const q = (Myy, Mzz) => {
    const a = Myy / h, c = Mzz / b;
    return Math.min(a, c) / Math.max(a, c, 1e-3);
  };
  const qA = q(Y.MEd, Mz0), qB = q(My0, Z.MEd);
  const okLam = lamy / lamz <= 2 && lamz / lamy <= 2;
  const NRd = Ac * fcd + As * fyd;
  const rN = N / NRd;
  const aN = rond ? 2 : rN <= 0.1 ? 1 : rN <= 0.7 ? 1 + ((rN - 0.1) / 0.6) * 0.5 : rN <= 1 ? 1.5 + ((rN - 0.7) / 0.3) * 0.5 : 2;
  let UCA = 0, UCB = 0, biax = false;
  if (!buiten && Y.MEd !== 0 && Z.MEd !== 0) {
    biax = true;
    if (!(okLam && qA <= 0.2)) UCA = (Y.MEd / MRdy) ** aN + (Mz0 / MRdz) ** aN;
    if (!(okLam && qB <= 0.2)) UCB = (My0 / MRdy) ** aN + (Z.MEd / MRdz) ** aN;
  }

  // Detaillering. De minimumwapening van een in-situ paal met de nominale
  // doorsnede, aan de veilige kant; de rekenmaat geldt voor het draagvermogen.
  const AcMin = !v.insitu ? Ac : rond ? (Math.PI * hN * hN) / 4 : bN * hN;
  const Asp = !v.insitu ? 0 : AcMin <= 0.5e6 ? 0.005 * AcMin : AcMin <= 1e6 ? 2500 : 0.0025 * AcMin;
  const AsMin = Math.max((0.1 * N) / fyd, 0.002 * AcMin, Asp);
  const AsMax = 0.04 * Ac;
  const phiMin = v.insitu ? 16 : 8, nMin = v.insitu ? 6 : 4;
  const phiBmin = Math.max(6, v.d_staaf / 4);
  const sMax = Math.min(20 * v.d_staaf, Math.min(b, h), 400);
  let nTot, sVrij;
  if (rond) {
    nTot = v.n_rond;
    sVrij = (2 * Math.PI * (hN / 2 - as)) / nS - v.d_staaf;
  } else {
    const nh = klem(Math.round(v.n_h), 2, 10), nb = klem(Math.round(v.n_b), 2, 10);
    nTot = 2 * v.n_h + 2 * v.n_b - 4;
    const aY = as - (hN - h) / 2, aZ = as - (bN - b) / 2;
    sVrij = Math.max((h - 2 * aY) / (nh - 1), (b - 2 * aZ) / (nb - 1)) - v.d_staaf;
  }
  const ok = {
    As: As >= AsMin && As <= AsMax,
    phi: v.d_staaf >= phiMin && v.d_beugel >= phiBmin,
    s: v.s_beugel <= sMax,
    n: (rond || (v.n_h >= 2 && v.n_b >= 2)) && nTot >= nMin,
    vrij: !v.insitu || sVrij <= 200,
  };
  const okDet = Object.values(ok).every(Boolean);
  const UCmax = Math.max(UCy, UCz, UCA, UCB);
  return {
    h, b, Ac, As, nS, omega, iy, iz, isy, isz, lamy, lamz, alfah, theta, n, A, B, Kr, Y, Z,
    Nmax, Nmin, xy, xz, MRdy, MRdz, buiten, UCy, UCz, biax, qA, qB, NRd, rN, aN, UCA, UCB,
    AsMin, AsMax, phiBmin, sMax, ok, okDet, UCmax, druk,
  };
}

const s4 = (x) => {
  if (x === 0) return "0";
  const dec = Math.max(0, 3 - Math.floor(Math.log10(Math.abs(x))));
  return x.toFixed(dec);
};
const ruim = (x) => ({ waarde: s4(x), tol: Math.max(Math.abs(x) * 0.002, 1e-6) });

/** Wat het blad bij deze invoer zichtbaar toont, in de eenheden van het blad (mm, kN, kNm). */
function verwachtingen(r, v) {
  const uit = {
    A_c: ruim(r.Ac), A_s: ruim(r.As), n_s: String(r.nS), ω: ruim(r.omega),
    λ_y: ruim(r.lamy), λ_z: ruim(r.lamz),
    N_Rd_max: ruim(r.Nmax / 1e3),
    UC_y: ruim(r.UCy),
    A_s_min: ruim(r.AsMin), A_s_max: ruim(r.AsMax), Ø_b_min: ruim(r.phiBmin), s_cl_max: ruim(r.sMax),
    UC_max: ruim(r.UCmax),
  };
  // Buiten het bereik van N staat alleen UC_y in het blad; UC_z is daar gelijk.
  if (!r.buiten) uit.UC_z = ruim(r.UCz);
  if (v.vorm === 1) Object.assign(uit, { i_y: ruim(r.iy), i_z: ruim(r.iz) });
  else uit.i_y = ruim(r.iy);
  if (v.insitu) uit.h = ruim(r.h);
  if (r.druk) {
    Object.assign(uit, {
      α_h: ruim(r.alfah), θ_i: ruim(r.theta), n: ruim(r.n), A_φ: ruim(r.A), B_ω: ruim(r.B),
      e_i_y: ruim(r.Y.ei), e_i_z: ruim(r.Z.ei),
      M_02_y: ruim(r.Y.M02 / 1e6), M_02_z: ruim(r.Z.M02 / 1e6), M_01_y: ruim(r.Y.M01 / 1e6), M_01_z: ruim(r.Z.M01 / 1e6),
      C_y: ruim(r.Y.C), C_z: ruim(r.Z.C), λ_lim_y: ruim(r.Y.lamlim), λ_lim_z: ruim(r.Z.lamlim),
      e_0_y: ruim(r.Y.e0), e_0_z: ruim(r.Z.e0),
    });
    if (r.Y.t2 || r.Z.t2) uit.K_r = ruim(r.Kr);
    for (const [k, A] of [["y", r.Y], ["z", r.Z]]) {
      if (A.t2) Object.assign(uit, { [`K_φ_${k}`]: ruim(A.Kphi), [`d_${k}`]: ruim(A.d), [`c_${k}`]: ruim(A.c), [`e_2_${k}`]: ruim(A.e2), [`M_2_${k}`]: ruim(A.M2 / 1e6) });
      if (A.M0e !== undefined) uit[`M_0e_${k}`] = ruim(A.M0e / 1e6);
    }
  }
  Object.assign(uit, { M_Ed_y: ruim(r.Y.MEd / 1e6), M_Ed_z: ruim(r.Z.MEd / 1e6) });
  if (!r.buiten) {
    Object.assign(uit, { x_y: ruim(r.xy), M_Rd_y: ruim(r.MRdy / 1e6) });
    if (v.vorm === 1) Object.assign(uit, { x_z: ruim(r.xz), M_Rd_z: ruim(r.MRdz / 1e6) });
  }
  if (r.UCA > 0) uit.UC_A = ruim(r.UCA);
  if (r.UCB > 0) uit.UC_B = ruim(r.UCB);
  if ((r.UCA > 0 || r.UCB > 0) && v.vorm === 1) Object.assign(uit, { r_N: ruim(r.rN), a_N: ruim(r.aN) });
  return uit;
}

// ── Referentiesets ──────────────────────────────────────────────────────────
const SETS = [
  {
    naam: "1 — standaard: 350×350 C30/37, 8Ø20, L = 3,5 m geschoord, N = 1200 kN, M_y 40/20 en M_z 10/10 kNm",
    invoer: {},
    // Met de hand. f_cd = 20, f_yd = 434,8 N/mm², ε_yd = 2,174 ‰. a = 30 + 8 + 10 =
    // 48 mm, A_c = 122 500 mm², A_s = 8·314,2 = 2513 mm², ω = 2513·434,8/(122 500·20)
    // = 0,4460. i = 350/√12 = 101,0 mm → λ = 3500/101,0 = 34,64 om beide assen.
    // α_h = 2/√3,5 = 1,07 → 1, θ_i = 1/200, e_i = 0,005·3500/2 = 8,75 mm,
    // N·e_i = 10,5 kNm. Om y: M_02 = 40 + 10,5 = 50,5, M_01 = 20 + 10,5 = 30,5 kNm,
    // r_m = 0,604, C = 1,096. n = 1 200 000/(122 500·20) = 0,4898, A = 1/1,3 =
    // 0,7692, B = √(1 + 2·0,446) = 1,376 → λ_lim,y = 20·0,7692·1,376·1,096/0,6999 =
    // 33,14 < 34,64: tweede orde. Om z: M_01 = M_02 = 20,5 → C = 0,7, λ_lim,z = 21,17.
    // K_r = (1,446 − 0,4898)/(1,446 − 0,4) = 0,9142; β = 0,35 + 0,15 − 34,64/150 =
    // 0,2691 → K_φ = 1 + 0,2691·1,5 = 1,404. i_s = 127·√(6/8) = 110,0 mm (de
    // middenrij ligt op de as), d = 175 + 110 = 285 mm. 1/r = 0,9142·1,404·0,002174
    // /(0,45·285) = 2,175·10⁻⁵ /mm. Om y: M_01/M_02 = 20/40 = 0,5 → c = 10 − 2·0,5 =
    // 9 → e_2 = 2,175·10⁻⁵·3500²/9 = 29,60 mm, M_2 = 1200·0,02960 = 35,53 kNm.
    // Om z: constant moment 10/10 → c = 8 → e_2 = 33,31 mm, M_2 = 39,97 kNm.
    // M_0e,y = max(0,6·50,5 + 0,4·30,5; 0,4·50,5) = 42,5 → M_Ed,y = 42,5 + 35,53 =
    // 78,03 kNm; M_Ed,z = 20,5 + 39,97 = 60,47 kNm (e_0 = 20 mm geeft 24 kNm).
    // Doorsnede om y, x = 197,7 mm, blok 0,8x = 158,2 mm: beton 20·350·158,2 =
    // 1107 kN; bovenrij ε = 3,5‰·149,7/197,7 = 2,650‰ → f_yd − f_cd = 414,8 N/mm²
    // × 942,5 = 391 kN; middenrij ε = 0,402‰ → 80,4 N/mm² × 628,3 = 50,5 kN;
    // onderrij ε = −1,846‰ → −369,3 N/mm² × 942,5 = −348 kN; samen 1200 kN.
    // M_Rd = 1107·(175 − 79,1) + 391·127 + 348·127 = 106,2 + 49,6 + 44,2 =
    // 200,0 kNm → UC_y = 78,03/200,1 = 0,390. Scheve buiging, geval A: M_Ed,z
    // zonder imperfectie = 10 + 39,97 = 49,97 kNm; verhouding 49,97/78,03 =
    // 0,640 > 0,2 → (5.39) met N/N_Rd = 1200/3543 = 0,3387 → a = 1,199:
    // (78,03/200,1)^1,199 + (49,97/200,1)^1,199 = 0,3234 + 0,1895 = 0,5129.
    handwerk: {
      ω: "0.4460", λ_y: "34.64", λ_lim_y: "33.14", λ_lim_z: "21.17", K_r: "0.9142", K_φ_y: "1.404",
      d_y: "285.0", c_y: "9", c_z: "8", e_2_y: "29.60", M_2_y: "35.53", e_2_z: "33.31", M_2_z: "39.97",
      M_Ed_y: "78.03", M_Ed_z: "60.47",
      x_y: "197.7", M_Rd_y: { waarde: "200.0", tol: 0.15, waarom: "handwerk met x afgerond op 0,1 mm" },
      UC_y: "0.390", a_N: "1.199", UC_A: "0.5129",
    },
  },
  {
    naam: "2 — 500×300 (h × b) C35/45, 4 staven per zijde langs h, ongeschoord om z, grote kniklengte om z",
    invoer: {
      h_kol: 500, b_kol: 300, betonklasse: 35, n_h: 4, n_b: 2, d_staaf: 25, s_beugel: 300, L_kol: 3500,
      L_cry: 3500, L_crz: 7000, geschoord_z: 0, N_Ed: 1800, M_yEd: 120, M_yEd_1: -60, M_zEd: 15, M_zEd_1: 15,
    },
  },
  {
    naam: "3 — in-situ gestorte paal Ø400, 6Ø16: rekenmaat 380 mm, paaleisen van 9.8.5(3)",
    invoer: { vorm: 2, h_kol: 400, insitu: 1, n_rond: 6, d_staaf: 16, M_zEd: 25, M_zEd_1: -10 },
    // Met de hand: D = 400 − 20 = 380 mm (§2.3.4.2(2)), A_c = π·380²/4 = 113 411 mm²
    // voor het draagvermogen. De minimumwapening met de nominale doorsnede:
    // A_s,min = 0,005·π·400²/4 = 628,3 mm² (tabel 9.6N), vrij tussen de staven
    // 2π·(200 − 46)/6 − 16 = 145,3 mm ≤ 200 mm.
    handwerk: { h: "380", A_c: "113400", A_s_min: "628.3" },
  },
  {
    naam: "4 — ronde kolom Ø500, 10Ø20, ongeschoord om beide assen, N = 2500 kN",
    invoer: {
      vorm: 2, h_kol: 500, n_rond: 10, d_staaf: 20, s_beugel: 300, L_kol: 4000, L_cry: 8000, L_crz: 8000,
      geschoord_y: 0, geschoord_z: 0, N_Ed: 2500, M_yEd: 60, M_yEd_1: 0, M_zEd: 20, M_zEd_1: 0, "φ_ef": 2,
    },
  },
  {
    naam: "5 — geen drukkracht (N = 0): alleen buiging, geen imperfectie en geen tweede orde",
    invoer: { N_Ed: 0, M_yEd: 80, M_yEd_1: -40, M_zEd: 0, M_zEd_1: 0 },
  },
  {
    naam: "6 — trek (N = −300 kN) met buiging om beide assen, C20/25",
    invoer: { betonklasse: 20, N_Ed: -300, M_yEd: 30, M_yEd_1: 30, M_zEd: 10, M_zEd_1: 10 },
  },
  {
    naam: "7 — grote M_y en kleine M_z: (5.38) voldaan, geen (5.39)",
    invoer: { L_cry: 2500, L_crz: 2500, N_Ed: 800, M_yEd: 150, M_yEd_1: 150, M_zEd: 0, M_zEd_1: 0 },
  },
  {
    naam: "8 — beugelafstand 400 mm > s_cl,max = 350 mm: UC < 1, maar de kolom voldoet niet",
    invoer: { s_beugel: 400 },
  },
  {
    naam: "9 — kleine kolom 250×250, 4Ø12, zwaar belast: voldoet niet",
    invoer: { h_kol: 250, b_kol: 250, n_h: 2, n_b: 2, d_staaf: 12, d_beugel: 6, s_beugel: 200, N_Ed: 1100, M_yEd: 25, M_yEd_1: 25 },
  },
];

// ── Grensgevallen ───────────────────────────────────────────────────────────
// λ_y precies op λ_lim,y: zoek de kniklengte om y waarbij ze gelijk zijn (λ_lim
// hangt via e_i en r_m zelf van l_0 af). Net eronder geen tweede orde, net
// erboven wel, met de volle e_2: de nominale kromming springt op die grens.
{
  const basis = { ...STANDAARD };
  let lo = 2000, hi = 5000;
  for (let i = 0; i < 100; i++) {
    const m = (lo + hi) / 2;
    const r = uitwerking({ ...basis, L_cry: m });
    if (r.Y.lam > r.Y.lamlim) hi = m; else lo = m;
  }
  const grens = (lo + hi) / 2;
  SETS.push(
    { naam: `10 — grensgeval: l_0,y = ${grens.toFixed(1)}·0,999 mm, net onder λ_lim,y`, invoer: { L_cry: grens * 0.999 }, grens: "onder" },
    { naam: `11 — grensgeval: l_0,y = ${grens.toFixed(1)}·1,001 mm, net boven λ_lim,y`, invoer: { L_cry: grens * 1.001 }, grens: "boven" },
  );
  const Nmax = uitwerking(basis).Nmax / 1e3;
  SETS.push(
    { naam: `12 — grensgeval: N_Ed = 0,999·N_Rd,max = ${(0.999 * Nmax).toFixed(1)} kN`, invoer: { N_Ed: 0.999 * Nmax } },
    { naam: `13 — grensgeval: N_Ed = 1,001·N_Rd,max = ${(1.001 * Nmax).toFixed(1)} kN`, invoer: { N_Ed: 1.001 * Nmax } },
  );
}

let fouten = 0;
for (const set of SETS) {
  const v = { ...STANDAARD, ...set.invoer };
  const selectValues = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, selectValues, { CC: 2, K_FI: 1 });
  const r = uitwerking(v);
  fouten += toets(`${set.naam} — narekening`, got, verwachtingen(r, v));
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk);

  // Tweede orde om y alleen boven λ_lim,y.
  if (set.grens) {
    const heeft = got.values.M_2_y !== undefined;
    const ok = heeft === (set.grens === "boven") && heeft === r.Y.t2;
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} tweede orde om y ${heeft ? "wel" : "niet"} in het blad, ${r.Y.t2 ? "wel" : "niet"} in de narekening`);
  }

  // (5.39) alleen waar (5.38) niet voldaan is.
  for (const [naam, uc] of [["UC_A", r.UCA], ["UC_B", r.UCB]]) {
    const inBlad = got.values[naam] !== undefined;
    if (inBlad !== uc > 0) {
      fouten++;
      console.log(`  FOUT   ${naam} ${inBlad ? "wel" : "niet"} in het blad, ${uc > 0 ? "wel" : "niet"} in de narekening`);
    }
  }

  // Het oordeel: de detaillering telt mee, ook als UC_max ≤ 1.
  const voldoet = /Maatgevende UC = [\d.]+[^.]*?de kolom voldoet(?! niet)/.test(got.text);
  const moet = r.UCmax <= 1 && r.okDet;
  const detailZin = /de detaillering voldoet niet \(§9\.5\)/.test(got.text);
  const ok = voldoet === moet && detailZin === !r.okDet;
  if (!ok) fouten++;
  console.log(
    `  ${ok ? "OK    " : "FOUT  "} oordeel    ons ${voldoet ? "voldoet" : "voldoet niet"}   narekening ${moet ? "voldoet" : "voldoet niet"}` +
      (r.okDet ? "" : ` (detaillering: ${Object.entries(r.ok).filter(([, x]) => !x).map(([k]) => k).join(", ")})`),
  );
  if (/NaN|Infinity/.test(got.text)) {
    fouten++;
    console.log("  FOUT   NaN of Infinity in de uitwerking");
  }
}

// ── De beginwaarden van het beeld zijn de standaardinvoer van dit script ─────
{
  console.log("\nBeginwaarden van het beeld tegen de standaardinvoer");
  const tsx = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../packages/desktop/src/components/calc/BetonkolomDesigner.tsx"), "utf8");
  const blok = tsx.match(/const DEFAULTS[^{]*\{([^}]+)\}/)[1];
  const beeld = Object.fromEntries([...blok.matchAll(/"?([\p{L}\w]+)"?: (-?[\d.]+)/gu)].map((m) => [m[1], Number(m[2])]));
  const verschil = [...new Set([...Object.keys(beeld), ...Object.keys(STANDAARD)])].filter((k) => beeld[k] !== STANDAARD[k]);
  const ok = verschil.length === 0;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${Object.keys(beeld).length} beginwaarden${ok ? " gelijk" : `, verschil in ${verschil.join(", ")}`}`);
}

// ── Elk invoerveld van het blad heeft een beginwaarde in het beeld ───────────
{
  console.log("\nInvoervelden van het blad tegen de beginwaarden van het beeld");
  const velden = new Set();
  for (const m of tpl.matchAll(/^\s*([^\s='#]+)\s*=\s*\?/gmu)) velden.add(m[1].replace(/,/g, "_"));
  for (const m of tpl.matchAll(/^@select\s+(\S+)/gmu)) velden.add(m[1]);
  const mist = [...velden].filter((k) => !(k in STANDAARD));
  const ok = mist.length === 0;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${velden.size} velden${ok ? ", alle met een beginwaarde" : `, zonder beginwaarde: ${mist.join(", ")}`}`);
}

afronden(fouten, "Betonkolom");
