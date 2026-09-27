/**
 * Controlescript voor de module Hekwerk en balustrade (templates/hekwerk.ts).
 *
 * Er is geen referentieberekening. Het script rekent daarom op twee manieren
 * na, net als check-gevelkolom:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript: de belasting uit tabel
 *      NB.A.1 (hieronder los overgenomen), de kracht op een tussenstaander, de
 *      staander in staal (doorsnedeklasse, buiging, dwarskracht met 6.2.8, kip
 *      van een uitkraging met χ_LT volgens 6.3.2.2) of hout (k_h, k_crit,
 *      afschuiving), de leuning in beide richtingen, de verplaatsing van de
 *      bovenrand, de verticale doorbuiging van de leuning en de kracht per
 *      anker. De koker rekent het script niet met de formules van het blad maar
 *      door numerieke integratie over de hoogte van een rechthoek met
 *      afgeronde hoeken (r_o = 2t, r_i = t). De doorgaande leuning (eindveld
 *      x_e·a, verder velden a, over twee, drie en vier velden) lost het script
 *      op met de vergelijking van de drie momenten, en de grootste reactie van
 *      de puntlast zoekt het door de last in stappen van a/400 over de leuning
 *      te schuiven; het blad gebruikt de liggeroplosser met invloedslijnen. Het
 *      blad moet daar op vier significante cijfers mee overeenkomen.
 *   2. Voor een aantal sets de getallen van een handberekening, als commentaar.
 *   3. Bij kip met de last op de voorzijde: de benadering k_g van het blad mag
 *      niet boven de exacte oplossing van de differentiaalvergelijking van de
 *      uitkraging uitkomen (hier numeriek opgelost).
 *
 * De profielgegevens (hoekstaal, HEA/HEB) staan hieronder los overgenomen uit
 * de profieltabel; check-profielen bewaakt dat de matrix in het blad gelijk
 * loopt met profielen.ts.
 *
 * Draaien:  node scripts/check-hekwerk.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("hekwerk.ts");

// ── Standaardinvoer ─────────────────────────────────────────────────────────
const STANDAARD = {
  gebruik: 4, verticaal: 1, factor: 1, h_leu: 1.0, a_st: 1.5, doorgaand: 1,
  vorm_s: 2, vorm_l: 1, staalsoort: 235, houtklasse: 2, klimaat: 1, duur: 4,
  d_s: 60, t_s: 12, b_s: 40, D_s: 48.3, hoekprofiel: 4, iprofiel: 1, as_s: 1,
  D_l: 42.4, t_l: 2.6, b_l: 60, h_l: 40,
  w_keuze: 20, w_hand: 20, q_hand: 1, F_hand: 1,
  n_t: 2, n_a: 4, z_a: 80, N_Rd_a: 10, V_Rd_a: 8,
  eindveld: 1, a_eind: 1.5, samen: 1, aangrijping: 1, hoek_steun: 0,
};
const PROJECT = { CC: 2, K_FI: 1, rekenwijze: 1 };

/** Tabel NB.A.1: q_k (kN/m), F_k in zone a (kN), per keuze van het blad. */
const NBA1 = { 1: [0.3, 0.5], 2: [0.5, 1], 3: [0.5, 1], 4: [0.5, 1], 5: [0.8, 1], 6: [3, 1], 7: [0.8, 1], 8: [0, 1] };

/** Hoekstaal: h, t (mm), A (cm²), I_y (cm⁴), W_el (cm³). */
const HOEK = { 4: { h: 60, t: 6, A: 6.91, I: 22.8, W: 5.29 }, 6: { h: 80, t: 8, A: 12.3, I: 72.2, W: 12.6 } };

/** I-profielen: h, b, t_w, t_f, r (mm) | A, A_v,z (cm²) | I_y, I_z, I_t (cm⁴) | W_el,y, W_pl,y, W_el,z, W_pl,z (cm³). */
const IPROF = {
  1: { h: 96, b: 100, tw: 5, tf: 8, r: 12, A: 21.24, Avz: 7.56, Iy: 349.2, Iz: 133.8, It: 5.24, Wely: 72.76, Wply: 83.01, Welz: 26.76, Wplz: 41.14 },
  11: { h: 100, b: 100, tw: 6, tf: 10, r: 12, A: 26.04, Avz: 9.04, Iy: 449.5, Iz: 167.3, It: 9.25, Wely: 89.91, Wply: 104.2, Welz: 33.45, Wplz: 51.42 },
};

/** Hout: f_m,k, f_v,k, E_mean, E_0,05 (N/mm²), γ_M. */
const HOUT = { 1: [18, 3.4, 9000, 6000, 1.3], 2: [24, 4.0, 11000, 7400, 1.3], 3: [30, 4.0, 12000, 8000, 1.3], 4: [24, 3.5, 11500, 9600, 1.25] };

const E = 210000, G = 81000;

function losOp(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}

/**
 * Doorgaande ligger op starre steunpunten, vergelijking van de drie momenten (EI constant):
 * L_i·M_(i−1) + 2(L_i + L_(i+1))·M_i + L_(i+1)·M_(i+1) = −6·(θ_rechts,i + θ_links,(i+1)), met de
 * eindrotaties van de losse velden (q: qL³/24; P op a: P·a·b·(L + b)/(6L) links en P·a·b·(L + a)/(6L)
 * rechts). Reacties en dwarskrachten aan de veldeinden volgen uit het evenwicht per veld.
 */
function drieMomenten(velden, lasten) {
  const n = velden.length;
  const thL = new Array(n).fill(0), thR = new Array(n).fill(0), RL = new Array(n).fill(0), RR = new Array(n).fill(0);
  for (const l of lasten) {
    const L = velden[l.veld];
    if (l.soort === "q") {
      thL[l.veld] += (l.q * L ** 3) / 24; thR[l.veld] += (l.q * L ** 3) / 24; RL[l.veld] += (l.q * L) / 2; RR[l.veld] += (l.q * L) / 2;
    } else {
      const a = l.a, b = L - a;
      thL[l.veld] += (l.P * a * b * (L + b)) / (6 * L); thR[l.veld] += (l.P * a * b * (L + a)) / (6 * L);
      RL[l.veld] += (l.P * b) / L; RR[l.veld] += (l.P * a) / L;
    }
  }
  const m = n - 1, A = Array.from({ length: m }, () => new Array(m).fill(0)), rhs = new Array(m).fill(0);
  for (let i = 1; i <= m; i++) {
    const Li = velden[i - 1], Lj = velden[i];
    if (i > 1) A[i - 1][i - 2] = Li;
    A[i - 1][i - 1] = 2 * (Li + Lj);
    if (i < m) A[i - 1][i] = Lj;
    rhs[i - 1] = -6 * (thR[i - 1] + thL[i]);
  }
  const M = [0, ...losOp(A, rhs), 0];
  const R = new Array(n + 1).fill(0), V = [];
  for (let j = 0; j < n; j++) {
    const d = (M[j + 1] - M[j]) / velden[j];
    R[j] += RL[j] + d; R[j + 1] += RR[j] - d;
    V.push(Math.abs(RL[j] + d), Math.abs(RR[j] - d));
  }
  return { R, V, M };
}

/** Doorgaande leuning, eindveld x_e en verder velden 1, over 2, 3 en 4 velden: k_R, k_V (per q·a) en k_F (per F). */
function leuningFactoren(xe) {
  let kR = 0, kV = 0, kF = 1;
  for (const n of [2, 3, 4]) {
    const velden = [xe, ...Array(n - 1).fill(1)];
    const q = drieMomenten(velden, velden.map((_, veld) => ({ veld, soort: "q", q: 1 })));
    kR = Math.max(kR, ...q.R.map(Math.abs));
    kV = Math.max(kV, ...q.V);
    for (let veld = 0; veld < n; veld++) {
      for (let k = 0; k <= 400; k++) {
        const r = drieMomenten(velden, [{ veld, soort: "P", P: 1, a: (velden[veld] * k) / 400 }]).R;
        kF = Math.max(kF, ...r.map(Math.abs));
      }
    }
  }
  return { kR, kV, kF };
}

/**
 * Exacte kipfactor γ = P·L²/√(E·I_z·G·I_t) van een uitkraging zonder welving met een puntlast aan het
 * vrije einde, ε·L·√(G·I_t/(E·I_z)) voor het dwarskrachtcentrum (destabiliserend): φ'' + γ²·t²·φ = 0
 * met t vanaf het vrije einde, φ'(0) = −γ·ε·φ(0) en φ(1) = 0. Kleinste γ met Runge-Kutta en bisectie.
 */
function gammaExact(eps) {
  const eind = (g) => {
    let t = 0, y = 1, dy = -g * eps;
    const n = 2000, h = 1 / n, f = (t, y) => -g * g * t * t * y;
    for (let i = 0; i < n; i++) {
      const k1y = dy, k1v = f(t, y);
      const k2y = dy + (h / 2) * k1v, k2v = f(t + h / 2, y + (h / 2) * k1y);
      const k3y = dy + (h / 2) * k2v, k3v = f(t + h / 2, y + (h / 2) * k2y);
      const k4y = dy + h * k3v, k4v = f(t + h, y + h * k3y);
      y += (h / 6) * (k1y + 2 * k2y + 2 * k3y + k4y); dy += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v); t += h;
    }
    return y;
  };
  let f0 = eind(0.01);
  for (let g = 0.02; g < 10; g += 0.01) {
    const f = eind(g);
    if (f0 * f <= 0) {
      let lo = g - 0.01, hi = g;
      for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (eind(lo) * eind(mid) <= 0) hi = mid; else lo = mid; }
      return (lo + hi) / 2;
    }
    f0 = f;
  }
  return NaN;
}

/**
 * Koker d × w × t met hoeken r_o = min(2t; min(d, w)/2) en r_i = max(r_o − t; 0),
 * door numerieke integratie over de hoogte (d in de buigrichting).
 */
function koker(d, w, t) {
  t = Math.min(t, Math.min(d, w) / 2);
  const ro = Math.min(2 * t, Math.min(d, w) / 2), ri = Math.max(ro - t, 0);
  const breedte = (y, D, W, r) => {
    const a = Math.abs(y);
    if (a > D / 2) return 0;
    const y0 = D / 2 - r;
    if (a <= y0 || r === 0) return W;
    return W - 2 * (r - Math.sqrt(Math.max(r * r - (a - y0) ** 2, 0)));
  };
  const n = 200000, dy = d / n;
  let A = 0, I = 0, S = 0;
  for (let i = 0; i < n; i++) {
    const y = -d / 2 + (i + 0.5) * dy;
    const b = breedte(y, d, w, ro) - breedte(y, d - 2 * t, w - 2 * t, ri);
    A += b * dy;
    I += b * y * y * dy;
    S += b * Math.abs(y) * dy;
  }
  // Torsie: Bredt met de hartlijn van de wand, hoekstraal (r_o + r_i)/2.
  const rm = (ro + ri) / 2;
  const Am = (d - t) * (w - t) - (4 - Math.PI) * rm * rm;
  const p = 2 * (d - t) + 2 * (w - t) - 2 * (4 - Math.PI) * rm;
  return { A, I, Wel: (2 * I) / d, Wpl: S, It: (4 * Am * Am * t) / p, t };
}

function buis(D, t) {
  t = Math.min(t, D / 2);
  const Di = D - 2 * t;
  const A = (Math.PI * (D * D - Di * Di)) / 4, I = (Math.PI * (D ** 4 - Di ** 4)) / 64;
  return { A, I, Wel: (2 * I) / D, Wpl: (D ** 3 - Di ** 3) / 6, Av: (2 * A) / Math.PI, dt: D / t };
}

const klW = (c, eps) => (c <= 72 * eps ? 1 : c <= 83 * eps ? 2 : c <= 124 * eps ? 3 : 4);
const klF = (c, eps) => (c <= 33 * eps ? 1 : c <= 38 * eps ? 2 : c <= 42 * eps ? 3 : 4);
const klBuis = (dt, eps) => (dt <= 50 * eps * eps ? 1 : dt <= 70 * eps * eps ? 2 : dt <= 90 * eps * eps ? 3 : 4);
const kcrit = (l) => (l <= 0.75 ? 1 : l <= 1.4 ? 1.56 - 0.75 * l : 1 / (l * l));
const khFn = (gelijmd) => (d) => (gelijmd ? (d < 600 ? Math.min(1.1, (600 / d) ** 0.1) : 1) : d < 150 ? Math.min(1.3, (150 / d) ** 0.2) : 1);

// ── Onafhankelijke uitwerking; eenheden N en mm ─────────────────────────────
function uitwerking(v, P) {
  const [q, Fk] = v.gebruik === 9 ? [v.q_hand, v.F_hand] : NBA1[v.gebruik]; // q in N/mm, F in kN
  const F = Fk * 1000, Fv = v.verticaal ? 1000 : 0;
  const gQ = v.factor === 2 ? 1 : { 1: 1.35, 2: 1.5, 3: 1.65 }[P.CC];
  const h = v.h_leu * 1000, a = v.a_st * 1000;
  const xe = Math.max((v.eindveld === 0 ? v.a_eind : v.a_st) / v.a_st, 0.01), amax = Math.max(1, xe) * a;
  const fac = v.doorgaand ? leuningFactoren(xe) : { kR: Math.max(1, (1 + xe) / 2), kV: Math.max(1, xe) / 2, kF: 1 };
  const kR = fac.kR, kF = fac.kF;
  const R = gQ * kR * q * a, Fd = gQ * kF * F, H = Math.max(R, Fd), M = H * h;
  const samen = v.verticaal ? v.samen : 0;
  const aang = [2, 4, 5, 6].includes(v.vorm_s) ? v.aangrijping : 0;

  const fy = v.staalsoort, eps = Math.sqrt(235 / fy);
  const [fmk, fvk, Emean, E005, gM] = HOUT[v.houtklasse] ?? HOUT[2];
  const kmod = v.klimaat === 3 ? (v.duur === 5 ? 0.9 : 0.7) : v.duur === 5 ? 1.1 : 0.9;
  const kh = khFn(v.houtklasse >= 4);
  const uit = { gQ, R, Fd, H, M, kR, kF };

  // Staander
  let s;
  if (v.vorm_s === 1) {
    const b = buis(v.D_s, v.t_s);
    s = { ...b, klasse: klBuis(b.dt, eps), kip: false, Es: E };
  } else if (v.vorm_s === 2) {
    const d = v.d_s, t = v.t_s, lang = Math.max(d, t), kort = Math.min(d, t);
    s = { A: d * t, I: (t * d ** 3) / 12, Wel: (t * d * d) / 6, Wpl: (t * d * d) / 4, Av: d * t, klasse: 1, kip: d > t,
      Iz: (d * t ** 3) / 12, It: ((lang * kort ** 3) / 3) * (1 - (0.63 * kort) / lang), aLT: 0.76, Es: E, zg: d / 2 };
  } else if (v.vorm_s === 3) {
    const L = HOEK[v.hoekprofiel];
    s = { A: L.A * 100, I: L.I * 1e4, Wel: L.W * 1e3, Wpl: L.W * 1e3, Av: L.h * L.t, klasse: L.h / L.t <= 14 * eps ? 3 : 4, kip: false, Es: E,
      buiten: !v.hoek_steun };
  } else if (v.vorm_s === 4) {
    const k = koker(v.d_s, v.b_s, v.t_s), kz = koker(v.b_s, v.d_s, v.t_s), t = k.t;
    const klasse = Math.max(klW(Math.max(v.d_s - 3 * t, 0) / t, eps), klF(Math.max(v.b_s - 3 * t, 0) / t, eps));
    s = { ...k, Av: (k.A * v.d_s) / (v.d_s + v.b_s), klasse, kip: v.d_s > v.b_s, Iz: kz.I, aLT: 0.76, Es: E, zg: v.d_s / 2 };
  } else if (v.vorm_s === 5) {
    const p = IPROF[v.iprofiel];
    const cw = (p.h - 2 * p.tf - 2 * p.r) / p.tw, cf = (p.b - p.tw - 2 * p.r) / 2 / p.tf;
    const kf = cf <= 9 * eps ? 1 : cf <= 10 * eps ? 2 : cf <= 14 * eps ? 3 : 4;
    if (v.as_s === 1) {
      s = { A: p.A * 100, I: p.Iy * 1e4, Wel: p.Wely * 1e3, Wpl: p.Wply * 1e3, Av: Math.max(p.Avz * 100, (p.h - 2 * p.tf) * p.tw),
        klasse: Math.max(klW(cw, eps), kf), kip: true, Iz: p.Iz * 1e4, It: p.It * 1e4, aLT: p.h / p.b <= 2 ? 0.21 : 0.34, Es: E, zg: p.h / 2 };
    } else {
      s = { A: p.A * 100, I: p.Iz * 1e4, Wel: p.Welz * 1e3, Wpl: p.Wplz * 1e3, Av: p.A * 100 - (p.h - 2 * p.tf) * p.tw, klasse: kf, kip: false, Es: E };
    }
  } else {
    const b = v.b_s, d = v.d_s;
    s = { A: b * d, I: (b * d ** 3) / 12, Wel: (b * d * d) / 6, klasse: 1, Es: Emean, hout: true };
  }
  Object.assign(uit, { A_s: s.A, I_s: s.I, W_el_s: s.Wel, klasse_s: s.klasse });
  if (!s.hout) {
    const W = s.klasse <= 2 ? s.Wpl : s.Wel;
    const Mc = W * fy, Vpl = (s.Av * fy) / Math.sqrt(3), UCV = H / Vpl;
    const rho = UCV > 0.5 ? (2 * UCV - 1) ** 2 : 0;
    let chi = 1, Mcr, lam;
    if (s.kip) {
      // Last op de voorzijde: z_g = d/2 voor het dwarskrachtcentrum, destabiliserend.
      const epsg = ((aang * s.zg) / h) * Math.sqrt((E * s.Iz) / (G * s.It));
      const kg = Math.sqrt(1 + (2.05 * epsg) ** 2) - 2.05 * epsg;
      Object.assign(uit, { epsg, kg });
      Mcr = ((kg * 4.013) / h) * Math.sqrt(E * s.Iz * G * s.It);
      lam = Math.sqrt((W * fy) / Mcr);
      const Phi = 0.5 * (1 + s.aLT * (lam - 0.2) + lam * lam);
      chi = Math.min(1, 1 / (Phi + Math.sqrt(Phi * Phi - lam * lam)));
    }
    const MRd = Math.min(1 - rho, chi) * W * fy;
    Object.assign(uit, { W_s: W, W_pl_s: s.Wpl, A_v_s: s.Av, Mc, Vpl, UCV_s: UCV, Mcr, lam, chi, MRd_s: MRd, UCM_s: M / MRd });
  } else {
    const fmd = (kmod * kh(v.d_s) * fmk) / gM;
    const lefs = 0.8 * h + aang * 2 * v.d_s;
    const scrit = (0.78 * v.b_s ** 2 * E005) / (v.d_s * lefs);
    const lrel = Math.sqrt(fmk / scrit), kc = kcrit(lrel);
    const sig = M / s.Wel, fvd = (kmod * fvk) / gM, tau = (1.5 * H) / (v.b_s * v.d_s);
    Object.assign(uit, { fmd, lefs, scrit, lrel, kc, sig, fvd, tau, UCM_s: sig / (kc * fmd), UCV_s: tau / fvd });
  }
  uit.UC_s = Math.max(uit.UCM_s, uit.UCV_s);

  // Leuning. Dwarskracht: bij een doorgaande leuning 5/8·q·a naast het middensteunpunt van twee
  // gelijke velden (het grootste voor elk aantal gelijke velden), bij losse velden q·a/2.
  // Met een eindveld de dwarskracht uit de doorgaande ligger (k_V) en ten hoogste k_F·F voor de puntlast.
  const Mh = gQ * Math.max((q * amax * amax) / 8, (F * amax) / 4), Vh = gQ * Math.max(fac.kV * q * a, kF * F);
  const Mv = (gQ * Fv * amax) / 4, Vv = gQ * kF * Fv;
  let l;
  if (v.vorm_l === 1) {
    const b = buis(v.D_l, v.t_l), kl = klBuis(b.dt, eps);
    l = { Ih: b.I, Iv: b.I, Wh: kl <= 2 ? b.Wpl : b.Wel, Wv: kl <= 2 ? b.Wpl : b.Wel, Avh: b.Av, Avv: b.Av, klh: kl, klv: kl, El: E };
  } else if (v.vorm_l === 2) {
    const kh_ = koker(v.b_l, v.h_l, v.t_l), kv_ = koker(v.h_l, v.b_l, v.t_l), t = kh_.t;
    const cb = Math.max(v.b_l - 3 * t, 0) / t, ch = Math.max(v.h_l - 3 * t, 0) / t;
    const klh = Math.max(klW(cb, eps), klF(ch, eps)), klv = Math.max(klW(ch, eps), klF(cb, eps));
    l = { Ih: kh_.I, Iv: kv_.I, Wh: klh <= 2 ? kh_.Wpl : kh_.Wel, Wv: klv <= 2 ? kv_.Wpl : kv_.Wel,
      Avh: (kh_.A * v.b_l) / (v.b_l + v.h_l), Avv: (kh_.A * v.h_l) / (v.b_l + v.h_l), klh, klv, El: E };
  } else {
    const b = v.b_l, hh = v.h_l;
    l = { Ih: (hh * b ** 3) / 12, Iv: (b * hh ** 3) / 12, klh: 1, klv: 1, El: Emean, hout: true };
  }
  const rho = (u) => (u > 0.5 ? (2 * u - 1) ** 2 : 0);
  if (!l.hout) {
    const Vrh = (l.Avh * fy) / Math.sqrt(3), Vrv = (l.Avv * fy) / Math.sqrt(3);
    const buisSamen = v.vorm_l === 1 && samen, Vr = Math.hypot(Vh, Vv);
    const rh = rho((buisSamen ? Vr : Vh) / Vrh), rv = rho((buisSamen ? Vr : Vv) / Vrv);
    const MRh = (1 - rh) * l.Wh * fy, MRv = (1 - rv) * l.Wv * fy;
    let UCM, UCV;
    if (buisSamen) {
      // Ronde buis, de verticale last gelijktijdig: vectorsom.
      uit.Ml = Math.hypot(Mh, Mv);
      UCM = uit.Ml / MRh; UCV = Vr / Vrh;
    } else if (samen) {
      UCM = Mh / MRh + Mv / MRv; UCV = Math.max(Vh / Vrh, Vv / Vrv);
    } else {
      UCM = Math.max(Mh / MRh, Mv / MRv); UCV = Math.max(Vh / Vrh, Vv / Vrv);
    }
    Object.assign(uit, { MRd_lh: MRh, MRd_lv: MRv, UCM_l: UCM, UCV_l: UCV });
  } else {
    // l_ef = 0,9·a over het langste veld, plus 2 × de hoogte in de buigrichting (last op het oppervlak).
    const b = v.b_l, hh = v.h_l, lefh = 0.9 * amax + 2 * b, lefv = 0.9 * amax + 2 * hh;
    const kch = kcrit(Math.sqrt(fmk / ((0.78 * hh * hh * E005) / (b * lefh))));
    const kcv = kcrit(Math.sqrt(fmk / ((0.78 * b * b * E005) / (hh * lefv))));
    const sh = Mh / ((hh * b * b) / 6), sv = Mv / ((b * hh * hh) / 6);
    const fmh = (kch * kmod * kh(b) * fmk) / gM, fmv = (kcv * kmod * kh(hh) * fmk) / gM;
    Object.assign(uit, { sh, sv, fmh, fmv,
      UCM_l: samen ? sh / fmh + sv / fmv : Math.max(sh / fmh, sv / fmv),
      UCV_l: (1.5 * (samen ? Vh + Vv : Math.max(Vh, Vv))) / (b * hh * ((kmod * fvk) / gM)) });
  }
  uit.UC_l = Math.max(uit.UCM_l, uit.UCV_l);
  Object.assign(uit, { Mh, Vh, Mv, Vv });

  // Vervorming, karakteristiek
  const EIs = s.Es * s.I, EIh = l.El * l.Ih, EIv = l.El * l.Iv;
  const wq = (kR * q * a * h ** 3) / (3 * EIs) + (5 * q * amax ** 4) / (384 * EIh);
  const wF1 = (kF * F * h ** 3) / (3 * EIs), wF2 = ((F / 2) * h ** 3) / (3 * EIs) + (F * amax ** 3) / (48 * EIh);
  const wh = Math.max(wq, wF1, wF2), wgrens = v.w_keuze === 0 ? v.w_hand : v.w_keuze;
  const wv = (Fv * amax ** 3) / (48 * EIv);
  Object.assign(uit, { wq, wF1, wF2, wh, UCwh: wh / wgrens, wv, UCwv: v.verticaal ? wv / (amax / 150) : 0 });

  // Voetbevestiging
  const Na = M / (Math.max(v.n_t, 1) * v.z_a), Va = H / Math.max(v.n_a, 1);
  uit.Na = Na; uit.Va = Va; uit.UCa = Na / (v.N_Rd_a * 1000) + Va / (v.V_Rd_a * 1000);

  uit.kl4 = (!s.hout && s.klasse === 4) || (!l.hout && (l.klh === 4 || l.klv === 4));
  uit.buiten = !!s.buiten;
  uit.UCmax = Math.max(uit.UC_s, uit.UC_l, uit.UCwh, uit.UCwv, uit.UCa);
  return uit;
}

const ruim = (x) => ({ waarde: String(Number(x.toPrecision(4))), tol: Math.max(Math.abs(x) * 0.002, 1e-6) });

function verwachtingen(r, v) {
  const uit = {
    γ_Q: ruim(r.gQ), k_R: ruim(r.kR), k_F: ruim(r.kF), R_Ed: ruim(r.R / 1e3), F_Ed: ruim(r.Fd / 1e3), H_Ed: ruim(r.H / 1e3), M_Ed: ruim(r.M / 1e6),
    I_s: ruim(r.I_s), W_el_s: ruim(r.W_el_s), UC_M_s: ruim(r.UCM_s), UC_V_s: ruim(r.UCV_s), UC_s: ruim(r.UC_s),
    M_h_Ed: ruim(r.Mh / 1e6), V_h_Ed: ruim(r.Vh / 1e3), M_v_Ed: ruim(r.Mv / 1e6), V_v_Ed: ruim(r.Vv / 1e3),
    UC_M_l: ruim(r.UCM_l), UC_V_l: ruim(r.UCV_l), UC_l: ruim(r.UC_l),
    w_q: ruim(r.wq), w_F1: ruim(r.wF1), w_F2: ruim(r.wF2), w_h: ruim(r.wh), UC_w_h: ruim(r.UCwh),
    N_Ed_a: ruim(r.Na / 1e3), V_Ed_a: ruim(r.Va / 1e3), UC_a: ruim(r.UCa), UC_max: ruim(r.UCmax),
  };
  if (v.vorm_s !== 3) uit.A_s = ruim(r.A_s);
  if (r.W_s !== undefined) Object.assign(uit, { W_s: ruim(r.W_s), M_c_Rd: ruim(r.Mc / 1e6), V_pl_Rd: ruim(r.Vpl / 1e3), M_Rd_s: ruim(r.MRd_s / 1e6) });
  if (r.W_pl_s !== undefined && v.vorm_s !== 3) uit.W_pl_s = ruim(r.W_pl_s);
  if (r.Mcr !== undefined) Object.assign(uit, { k_g: ruim(r.kg), M_cr: ruim(r.Mcr / 1e6), λ_LT: ruim(r.lam), χ_LT: ruim(r.chi) });
  if (r.Ml !== undefined) uit.M_l_Ed = ruim(r.Ml / 1e6);
  if (r.fmd !== undefined) Object.assign(uit, { l_ef_s: ruim(r.lefs), f_m_d: ruim(r.fmd), σ_m_crit: ruim(r.scrit), λ_rel_m: ruim(r.lrel), k_crit: ruim(r.kc), σ_m_d: ruim(r.sig), f_v_d: ruim(r.fvd), τ_d: ruim(r.tau) });
  if (r.MRd_lh !== undefined) Object.assign(uit, { M_Rd_lh: ruim(r.MRd_lh / 1e6), M_Rd_lv: ruim(r.MRd_lv / 1e6) });
  if (r.sh !== undefined) Object.assign(uit, { σ_m_lh: ruim(r.sh), σ_m_lv: ruim(r.sv), f_m_lh: ruim(r.fmh), f_m_lv: ruim(r.fmv) });
  if (v.verticaal) Object.assign(uit, { w_v: ruim(r.wv), UC_w_v: ruim(r.UCwv) });
  return uit;
}

const SETS = [
  {
    naam: "1 — standaard: strip 60 × 12 S235, buisleuning 42,4 × 2,6, klasse A overige ruimten, h = 1,0 m, a = 1,5 m",
    invoer: {},
    // Met de hand: q_k = 0,5 kN/m, F_k = 1 kN, γ_Q = 1,5 (CC2). Lijnlast: k_R = 1,25 (middensteunpunt van
    // twee gelijke velden), R = 1,5·1,25·0,5·1,5 = 1,406 kN. Puntlast: de invloedslijn komt net boven 1;
    // vier gelijke velden, last op 0,94·a in het eindveld (0,06·a vóór de eerste tussenstaander): drie
    // momenten met θ_B = 0,94·0,06·1,94/6 = 0,018236 → 4M_B + M_C = −0,10942, M_B + 4M_C + M_D = 0,
    // M_C + 4M_D = 0 → M_B = −0,029308, M_C = 0,0078154 → R_B = 0,94 + 0,029308 + (0,0078154 + 0,029308)
    // = 1,0064 = k_F → F_Ed = 1,5·1,0064 = 1,510 kN > R → M_Ed = 1,510 kNm. Strip: W_pl = 12·60²/4 =
    // 10 800 mm³, M_c,Rd = 2,538 kNm. Kip: I_z = 8640 mm⁴, I_t = 60·12³/3·(1 − 0,63·0,2) = 30 205 mm⁴;
    // de leuning op de voorzijde: z_g = 30 mm, ε = 0,03·√(210 000·8640/(81 000·30 205)) = 0,02584,
    // k_g = √(1 + (2,05·0,02584)²) − 2,05·0,02584 = 0,9484 → M_cr = 0,9484·8,455 = 8,019 kNm,
    // λ̄_LT = √(2,538/8,019) = 0,5626, kromme d: Φ = 0,5·(1 + 0,76·0,3626 + 0,3165) = 0,7960 → χ_LT =
    // 0,7357; M_Rd = 1,867 kNm → UC 0,8085. Leuning: W_pl = (42,4³ − 37,2³)/6 = 4124 mm³ → M_Rd =
    // 0,9692 kNm; horizontaal en verticaal elk 1,5·1·1,5/4 = 0,5625 kNm, gelijktijdig: √2·0,5625 =
    // 0,7955 kNm → UC 0,8208. Verplaatsing: w_q = 1,25·0,5·1500·1000³/(3·210 000·216 000) +
    // 5·0,5·1500⁴/(384·210 000·64 643) = 6,889 + 2,428 = 9,317 mm. Ankers: 1,510e6/(2·80) = 9435 N →
    // 9,435/10 + 0,3774/8 = 0,9907 (maatgevend).
    handwerk: { R_Ed: "1.406", k_F: "1.006", F_Ed: "1.510", M_c_Rd: "2.538", k_g: "0.9484", M_cr: "8.019", λ_LT: "0.5626",
      χ_LT: "0.7357", UC_M_s: "0.8085", M_Rd_lh: "0.9692", M_l_Ed: "0.7955", UC_M_l: "0.8208", w_q: "9.317",
      N_Ed_a: "9.435", UC_a: "0.9907", UC_max: "0.9907" },
  },
  {
    naam: "1b — als 1, de leuning in het hart van de staander en de verticale last apart",
    invoer: { aangrijping: 0, samen: 0 },
    // Met de hand: k_g = 1 → M_cr = 8,455 kNm, λ̄_LT = √(2,538/8,455) = 0,5479, Φ = 0,5·(1 + 0,76·0,3479
    // + 0,3002) = 0,7823 → χ_LT = 0,7459, M_Rd = 1,893 kNm → UC = 1,510/1,893 = 0,7975. Leuning apart:
    // 0,5625/0,9692 = 0,5804.
    handwerk: { k_g: "1", M_cr: "8.455", λ_LT: "0.5479", χ_LT: "0.7459", UC_M_s: "0.7975", UC_M_l: "0.5804" },
  },
  {
    naam: "2 — klasse C5, CC3, losse velden: buis 88,9 × 5 als staander, koker 60 × 40 × 3 als leuning",
    CC: 3,
    invoer: { gebruik: 6, h_leu: 1.1, a_st: 1.2, doorgaand: 0, vorm_s: 1, D_s: 88.9, t_s: 5, vorm_l: 2, b_l: 60, h_l: 40, t_l: 3,
      n_t: 2, n_a: 4, z_a: 150, N_Rd_a: 30, V_Rd_a: 20 },
    // Met de hand: R = 1,65·1·3·1,2 = 5,94 kN > F = 1,65 kN; M_Ed = 5,94·1,1 = 6,534 kNm.
    // Buis: d/t = 17,78 ≤ 50 → klasse 1; W_pl = (88,9³ − 78,9³)/6 = 35 238 mm³ → M_c,Rd = 8,281 kNm
    // → UC 0,7890. Kokerleuning 60 (horizontaal) × 40 × 3, hoeken r_o = 6 en r_i = 3 mm (sp_a = 0,2146·r²,
    // sp_e = 0,2234·r): W_pl,h = (40·60² − 34·54²)/4 − 4·7,726·(30 − 1,340) + 4·1,931·(27 − 0,670) =
    // 11 214 − 885,7 + 203,4 = 10 532 mm³ → M_Rd,h = 2,475 kNm; W_pl,v = (60·40² − 54·34²)/4 −
    // 4·7,726·(20 − 1,340) + 4·1,931·(17 − 0,670) = 8394 − 576,7 + 126,2 = 7943 mm³ → M_Rd,v = 1,867 kNm.
    // M_h = 1,65·3·1,2²/8 = 0,891 kNm, M_v = 1,65·1·1,2/4 = 0,495 kNm, gelijktijdig: 0,891/2,475 +
    // 0,495/1,867 = 0,3600 + 0,2652 = 0,6252.
    handwerk: { R_Ed: "5.94", M_Ed: "6.534", W_pl_s: { waarde: "35238", tol: 5, waarom: "het blad toont vier cijfers" }, M_c_Rd: "8.281", UC_M_s: "0.7890",
      M_Rd_lh: "2.475", M_Rd_lv: "1.867", UC_M_l: "0.6252" },
  },
  {
    naam: "3 — hoekstaal L 60x60x6, zijdelings gehouden, met een houten leuning 44 × 68 C24, woonfunctie (0,3 kN/m), γ = 1,0, losse velden",
    invoer: { gebruik: 1, factor: 2, doorgaand: 0, a_st: 1.8, vorm_s: 3, hoekprofiel: 4, hoek_steun: 1, vorm_l: 3, b_l: 44, h_l: 68, klimaat: 2 },
    // Met de hand: R = 1·0,3·1,8 = 0,54 kN > F = 0,5 kN; M_Ed = 0,54 kNm. h/t = 10 ≤ 14ε → klasse 3,
    // M_c,Rd = 5290·235 = 1,243 kNm → UC 0,4344. Leuning verticaal: I = 44·68³/12 = 1 152 917 mm⁴,
    // w_v = 1000·1800³/(48·11 000·1 152 917) = 9,580 mm ≤ 1800/150 = 12 mm.
    handwerk: { R_Ed: "0.54", M_c_Rd: "1.243", UC_M_s: "0.4344", w_v: "9.580" },
  },
  {
    naam: "4 — koker 50 × 30 × 3 S355, klassen F en G, CC1, eigen grens 30 mm: kip om de sterke as",
    CC: 1,
    invoer: { gebruik: 7, a_st: 1.2, vorm_s: 4, d_s: 50, b_s: 30, t_s: 3, staalsoort: 355, D_l: 33.7, t_l: 2.6, w_keuze: 0, w_hand: 30 },
    // Met de hand (koker met r_o = 6 en r_i = 3 mm): A = 1500 − 1056 − 4·0,2146·36 + 4·0,2146·9 =
    // 420,8 mm²; I = 142 132 − 4·(9,78 + 7,726·23,66²) + 4·(0,61 + 1,931·21,33²) = 128 311 mm⁴.
    handwerk: { A_s: "420.8", I_s: { waarde: "128311", tol: 15, waarom: "het blad toont vier cijfers" } },
  },
  {
    naam: "5 — HEA 100 om de sterke as, overige klassen, a = 2,0 m, koker 80 × 40 × 3 als leuning",
    invoer: { gebruik: 5, h_leu: 1.2, a_st: 2.0, vorm_s: 5, iprofiel: 1, as_s: 1, vorm_l: 2, b_l: 80, h_l: 40, t_l: 3 },
    // Met de hand: R = 1,5·1,25·0,8·2 = 3,0 kN > F_Ed = 1,510 kN; M_Ed = 3,6 kNm; W_pl,y = 83 010 mm³ →
    // M_c,Rd = 19,51 kNm. M_cr met de last in het hart = 4,013/1200·√(210 000·1,338e6·81 000·52 400) =
    // 115,5 kNm. De leuning op de voorzijde: z_g = h/2 = 48 mm, ε = 48/1200·√(210 000·1,338e6/(81 000·
    // 52 400)) = 0,04·8,136 = 0,3255 → k_g = √(1 + 0,6672²) − 0,6672 = 0,5350 → M_cr = 61,78 kNm →
    // λ̄_LT = √(19,51/61,78) = 0,5619, kromme a: Φ = 0,5·(1 + 0,21·0,3619 + 0,3158) = 0,6959 → χ_LT =
    // 0,9039. (Met welving, hier weggelaten, ligt M_cr hoger.)
    handwerk: { R_Ed: "3", M_Ed: "3.6", M_c_Rd: "19.51", k_g: "0.5350", M_cr: "61.78", λ_LT: "0.5619", χ_LT: "0.9039" },
  },
  {
    naam: "6 — HEB 100 om de zwakke as S275, gemeenschappelijke woonruimte",
    invoer: { gebruik: 2, vorm_s: 5, iprofiel: 11, as_s: 2, staalsoort: 275 },
    // Met de hand: flens c/t = (100 − 6 − 24)/2/10 = 3,5 → klasse 1; M_c,Rd = 51 420·275 = 14,14 kNm.
    handwerk: { M_c_Rd: "14.14" },
  },
  {
    naam: "7 — houten staander 70 × 90 C24 met houten leuning 44 × 68, klimaatklasse 3, zeer kort",
    invoer: { gebruik: 3, vorm_s: 6, b_s: 70, d_s: 90, vorm_l: 3, b_l: 44, h_l: 68, klimaat: 3, duur: 5 },
    // Met de hand: F_Ed = 1,5·1,0064·1 = 1,510 kN > R = 1,406 kN → M_Ed = 1,510 kNm; k_h = (150/90)^0,2 =
    // 1,108, f_m,d = 0,9·1,108·24/1,3 = 18,40 N/mm²; W = 70·90²/6 = 94 500 mm³ → σ = 15,98 N/mm². Last op
    // de voorzijde: ℓ_ef = 0,8·1000 + 2·90 = 980 mm → σ_crit = 0,78·70²·7400/(90·980) = 320,7 → λ =
    // 0,2736, k_crit = 1 → UC 0,8681.
    handwerk: { f_m_d: "18.40", σ_m_d: "15.98", l_ef_s: "980", σ_m_crit: "320.7", UC_M_s: "0.8681" },
  },
  {
    naam: "8 — q_k en F_k zelf ingevuld, γ = 1,0, zonder verticale last, GL24h-staander",
    invoer: { gebruik: 9, q_hand: 1.2, F_hand: 1.5, factor: 2, verticaal: 0, vorm_s: 6, b_s: 90, d_s: 90, houtklasse: 4 },
  },
  {
    naam: "9 — leuning alleen ter steun: F = 1 kN, buis 42,4 × 2,6 als staander, h = 0,9 m",
    invoer: { gebruik: 8, h_leu: 0.9, vorm_s: 1, D_s: 42.4, t_s: 2.6 },
    // Met de hand: q = 0 → H = 1,5·1,0064 = 1,510 kN, M = 1,359 kNm; W_pl = 4124 mm³ → M_c,Rd =
    // 0,9692 kNm → UC 1,402.
    handwerk: { H_Ed: "1.510", M_Ed: "1.359", UC_M_s: "1.402" },
  },
  {
    naam: "10 — dunwandige buis 100 × 1 S355: klasse 4, het blad keurt af",
    invoer: { vorm_s: 1, D_s: 100, t_s: 1, staalsoort: 355 },
  },
  {
    naam: "11 — kleine strip 40 × 8 bij klasse C5: voldoet niet",
    invoer: { gebruik: 6, d_s: 40, t_s: 8 },
    // Met de hand, de doorgaande buisleuning 42,4 × 2,6: q_k = 3 kN/m, a = 1,5 m. Dwarskracht naast het
    // middensteunpunt van twee gelijke velden 5/8·q·a: V_h,Ed = 1,5·0,625·3·1,5 = 4,219 kN; verticaal
    // 1,5·1,0064·1 = 1,510 kN, gelijktijdig √(4,219² + 1,510²) = 4,481 kN. A = π(42,4² − 37,2²)/4 =
    // 325,1 mm², A_v = 2A/π = 207,0 mm² → V_pl,Rd = 207,0·235/√3 = 28,08 kN → UC 0,1596. M_h,Ed =
    // 1,5·3·1,5²/8 = 1,266 kNm, M_v,Ed = 0,5625 kNm → √(1,266² + 0,5625²) = 1,385 kNm, M_Rd = 0,9692 →
    // UC 1,429.
    handwerk: { V_h_Ed: "4.219", M_h_Ed: "1.266", M_l_Ed: "1.385", UC_V_l: "0.1596", UC_M_l: "1.429" },
  },
  {
    naam: "12 — ronde buis 60,3 × 3,2 ingeklemd, leuning 48,3 × 2,6 doorgaand over velden van 1,8 m, gemeenschappelijke woonfunctie",
    invoer: { gebruik: 2, a_st: 1.8, vorm_s: 1, D_s: 60.3, t_s: 3.2, D_l: 48.3, t_l: 2.6, z_a: 100, N_Rd_a: 12, V_Rd_a: 8 },
    // Met de hand: tabel NB.A.1 q_k = 0,5 kN/m, F_k = 1 kN, γ_Q = 1,5. Middelste staander bij twee velden:
    // 1,25·q·a, R = 1,5·1,25·0,5·1,8 = 1,6875 kN > F_Ed = 1,5·1,0064 = 1,510 kN → M_Ed = 1,688 kNm. Buis:
    // d/t = 18,84 ≤ 50 → klasse 1; W_pl = (60,3³ − 53,9³)/6 = (219 256 − 156 591)/6 = 10 444 mm³ →
    // M_c,Rd = 2,454 kNm → UC 0,6875. Leuning: W_pl = (48,3³ − 43,1³)/6 = 5436 mm³ → M_Rd = 1,277 kNm;
    // M_h = M_v = 1,5·1·1,8/4 = 0,675 kNm, gelijktijdig √2·0,675 = 0,9546 kNm → UC 0,7473. Verplaatsing:
    // I_staander = π(60,3⁴ − 53,9⁴)/64 = 234 680 mm⁴, I_leuning = π(48,3⁴ − 43,1⁴)/64 = 97 765 mm⁴; w_q =
    // 1,25·0,5·1800·1000³/(3·210 000·234 680) + 5·0,5·1800⁴/(384·210 000·97 765) = 7,609 + 3,329 =
    // 10,94 mm ≤ 20 mm. Verticaal: w_v = 1000·1800³/(48·210 000·97 765) = 5,918 mm ≤ 12 mm. Ankers:
    // 1,6875e6/(2·100) = 8438 N → 8,438/12 + 0,4219/8 = 0,7559.
    handwerk: { R_Ed: "1.688", M_Ed: "1.688", M_c_Rd: "2.454", UC_M_s: "0.6875", M_Rd_lh: "1.277", M_l_Ed: "0.9546",
      UC_M_l: "0.7473", w_q: "10.94", w_v: "5.918", UC_a: "0.7559" },
  },
  {
    naam: "13 — strip 80 × 10 S355, klasse C5, losse velden van 1,0 m, h = 1,1 m: de kip beslist",
    invoer: { gebruik: 6, a_st: 1.0, h_leu: 1.1, doorgaand: 0, d_s: 80, t_s: 10, staalsoort: 355 },
    // Met de hand: R = 1,5·1·3·1,0 = 4,5 kN > F_Ed = 1,5 kN → M_Ed = 4,5·1,1 = 4,95 kNm. W_pl =
    // 10·80²/4 = 16 000 mm³ → M_c,Rd = 5,680 kNm (zonder kip UC 0,8715). I_z = 80·10³/12 = 6667 mm⁴,
    // I_t = 80·10³/3·(1 − 0,63·10/80) = 24 567 mm⁴; in het hart M_cr = 4,013/1100·√(210 000·6667·81 000·
    // 24 567) = 6,089 kNm. Op de voorzijde: z_g = 40 mm, ε = 40/1100·√(210 000·6667/(81 000·24 567)) =
    // 0,03050 → k_g = √(1 + 0,06253²) − 0,06253 = 0,9394 → M_cr = 5,720 kNm → λ̄_LT = √(5,680/5,720) =
    // 0,9965; kromme d: Φ = 0,5·(1 + 0,76·0,7965 + 0,9930) = 1,2991 → χ_LT = 1/(1,2991 + √(1,6877 −
    // 0,9930)) = 0,4689 → M_Rd = 2,663 kNm → UC 1,859.
    handwerk: { M_Ed: "4.95", M_c_Rd: "5.68", k_g: "0.9394", M_cr: "5.720", λ_LT: "0.9965", χ_LT: "0.4689", UC_M_s: "1.859" },
  },
  {
    naam: "14 — houten staander 45 × 95 C24 met houten leuning 70 × 45, woonfunctie: de gelijktijdige verticale last beslist",
    invoer: { gebruik: 1, a_st: 1.2, vorm_s: 6, b_s: 45, d_s: 95, vorm_l: 3, b_l: 70, h_l: 45, klimaat: 2 },
    // Met de hand: q_k = 0,3 kN/m, F_k = 0,5 kN; R = 1,5·1,25·0,3·1,2 = 0,675 kN < F_Ed = 1,5·1,0064·0,5 =
    // 0,7548 kN → M_Ed = 0,7548 kNm. k_h = (150/95)^0,2 = 1,0957 → f_m,d = 0,9·1,0957·24/1,3 = 18,20 N/mm²;
    // W = 45·95²/6 = 67 688 mm³ → σ = 11,15 N/mm²; op de voorzijde ℓ_ef = 800 + 2·95 = 990 mm → σ_crit =
    // 0,78·45²·7400/(95·990) = 124,3 → λ = 0,4394 → k_crit = 1 → UC 0,6126. Leuning: horizontaal M =
    // 1,5·0,5·1,2/4 = 0,225 kNm, W = 45·70²/6 = 36 750 mm³ → σ = 6,122 N/mm², k_h = (150/70)^0,2 = 1,1647,
    // f = 0,9·1,1647·24/1,3 = 19,35 N/mm² (σ_crit = 0,78·45²·7400/(70·(1080 + 140)) = 136,9 → k_crit = 1)
    // → 0,3164; verticaal M = 1,5·1·1,2/4 = 0,45 kNm, W = 70·45²/6 = 23 625 mm³ → σ = 19,05 N/mm²,
    // k_h = (150/45)^0,2 = 1,2723 → f = 21,14 N/mm² (σ_crit = 0,78·70²·7400/(45·(1080 + 90)) = 537,2 →
    // k_crit = 1) → 0,9011. Gelijktijdig: 0,3164 + 0,9011 = 1,217 > 1 (apart zou het 0,9011 zijn).
    // w_v = 1000·1200³/(48·11 000·531 563) = 6,157 mm ≤ 8 mm.
    handwerk: { F_Ed: "0.7548", f_m_d: "18.20", σ_m_d: "11.15", l_ef_s: "990", σ_m_crit: "124.3", UC_M_s: "0.6126",
      σ_m_lh: "6.122", f_m_lh: "19.35", σ_m_lv: "19.05", f_m_lv: "21.14", UC_M_l: "1.217", w_v: "6.157" },
  },
  {
    naam: "15 — hoekstaal L 60x60x6 dat niet zijdelings wordt gehouden: buiten het blad, voldoet niet",
    invoer: { vorm_s: 3, hoekprofiel: 4 },
    // Zonder zijsteun buigt het hoekstaal scheef om zijn hoofdassen (I_u = 36,1, I_v = 9,43 cm⁴ tegen 22,8 cm⁴
    // om de as evenwijdig aan een been), grijpt de last buiten de hiel aan (torsie) en is er voor kip van een
    // hoekprofiel geen M_cr in NEN-EN 1993-1-1 met de NB. Het blad rekent de doorsnede wel, maar keurt af.
  },
  {
    naam: "16 — kort eindveld van 0,25 m bij velden van 1,5 m: de eerste tussenstaander krijgt 16/9·F",
    invoer: { gebruik: 2, a_st: 1.5, eindveld: 0, a_eind: 0.25, vorm_s: 1, D_s: 60.3, t_s: 3.2, D_l: 48.3, t_l: 2.6,
      z_a: 100, N_Rd_a: 12, V_Rd_a: 8 },
    // Met de hand, in eenheden van a: eindveld x = 1/6, twee velden (dat geeft hier het grootste).
    // Lijnlast: M_B = −q·(x³ + 1)/(8(1 + x)) = −0,10764 → R_B = (1 + x)/2 + 0,10764·(1 + 1/x) = 0,5833 +
    // 0,7535 = 1,337 = k_R; dwarskracht naast B in het eindveld x/2 + 0,10764/x = 0,7292 = k_V.
    // Puntlast op c·a voorbij B: M_B = −c(1 − c)(2 − c)/(2(1 + x)) → R_B = (1 − c) + c(1 − c)(2 − c)/(2x)
    // = 1 − c + 3c(1 − c)(2 − c); dR_B/dc = 0 bij c = 1/3 → R_B = 2/3 + 3·(1/3)(2/3)(5/3) = 16/9 = 1,778
    // = k_F (de eindstaander trekt terug met 0,952·F). F_Ed = 1,5·1,778·1 = 2,667 kN > R = 1,5·1,337·
    // 0,5·1,5 = 1,504 kN → M_Ed = 2,667 kNm; M_c,Rd = 10 444·235 = 2,454 kNm → UC 1,086: voldoet niet
    // (met gelijke velden 0,6151).
    handwerk: { k_R: "1.337", k_F: "1.778", F_Ed: "2.667", M_Ed: "2.667", UC_M_s: "1.086", V_h_Ed: "2.667" },
  },
];

let fouten = 0;
for (const set of SETS) {
  const v = { ...STANDAARD, ...set.invoer };
  const P = { ...PROJECT, ...(set.CC ? { CC: set.CC } : {}) };
  const selectValues = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, selectValues, P);
  const r = uitwerking(v, P);
  fouten += toets(`${set.naam} — narekening`, got, verwachtingen(r, v));
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk);

  // Het oordeel: klasse 4 heeft een eigen zin, anders volgt het uit UC_max.
  const zin = got.text.slice(got.text.lastIndexOf("Maatgevende UC"));
  let ok;
  if (r.kl4) {
    ok = /Maatgevende UC = [\d.]+ → het hekwerk voldoet niet\s*: een doorsnede valt in klasse 4/.test(zin);
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    klasse 4 gemeld`);
  } else if (r.buiten) {
    ok = /Maatgevende UC = [\d.]+ → het hekwerk voldoet niet\s*: een hoekstaal dat niet zijdelings wordt gehouden/.test(zin);
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    hoekstaal zonder zijsteun: buiten het blad`);
  } else {
    const voldoet = /het hekwerk voldoet(?! niet)/.test(zin);
    ok = voldoet === r.UCmax <= 1;
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    ons ${voldoet ? "voldoet" : "voldoet niet"}   narekening ${r.UCmax <= 1 ? "voldoet" : "voldoet niet"}`);
  }
  if (!ok) fouten++;
  if (r.kg !== undefined && r.epsg > 0) {
    // De benadering van het blad mag niet boven de exacte kipfactor uitkomen.
    const exact = gammaExact(r.epsg), ok2 = 4.013 * r.kg <= exact * 1.0002;
    if (!ok2) fouten++;
    console.log(`  ${ok2 ? "OK    " : "FOUT  "} kip        ε = ${r.epsg.toFixed(4)}: 4,013·k_g = ${(4.013 * r.kg).toFixed(4)} ≤ exact ${exact.toFixed(4)}`);
  }
  if (/NaN|Infinity|niet gedefinieerd|Error/.test(got.text)) {
    fouten++;
    console.log("  FOUT   het blad meldt een fout, NaN of Infinity");
  }
}

afronden(fouten, "Hekwerk en balustrade");
