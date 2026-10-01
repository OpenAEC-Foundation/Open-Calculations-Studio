/**
 * Controlescript voor de module Verticaal windverband (NEN-EN 1993-1-1 en
 * NEN-EN 1993-1-8 met NB).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten daarom op twee manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript: de horizontale kracht uit
 *      wind en scheefstand (5.3.2), vergroot met 1/(1 − 1/α_cr) als
 *      3 ≤ α_cr < 10 (5.2.2(5)B), trek op de bruto en de netto doorsnede —
 *      strip volgens (6.7), hoekprofiel aan één been volgens (3.11) tot (3.13)
 *      met tabel 3.8 —, de blokschuif (3.9) of (3.10), knik van een enkele
 *      diagonaal met de effectieve slankheid van BB.1.2, de twee flankelassen
 *      van een gelaste aansluiting (4.2) tot (4.4) en (4.9) en de horizontale
 *      verplaatsing.
 *   2. Voor enkele sets de getallen van een handberekening.
 *   3. Voor een ontbrekende, nul of gewiste maat ('') het oordeel: een toets
 *      die niet uit te rekenen is, blijft "niet getoetst", nooit "voldoet".
 *
 * De profielgegevens staan hieronder los overgenomen uit EN 10056-1, zodat ook
 * de matrix in het blad wordt gecontroleerd.
 *
 * Draaien:  node scripts/check-windverband.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("verticaalWindverband.ts");

const STANDAARD = {
  verbandtype: 1, profile: 20, staalkwaliteit: 235, b_v: 6, h_v: 5, F_w_k: 40, V_Ed: 600, m_k: 4,
  aansluiting: 2, d_0: 18, p_1: 60, e_1: 40, e_2: 30, n_d: 1, grens_u: 300,
};
const PROJECT = { CC: 2, K_FI: 1 };

/** id → soort (1 strip, 2 hoek), b, t (mm), A (mm²), e (mm), I_y, I_v (mm⁴). */
const PROFIEL = {
  5: { soort: 1, b: 60, t: 8 },
  11: { soort: 1, b: 100, t: 10 },
  14: { soort: 1, b: 120, t: 12 },
  18: { soort: 2, b: 50, t: 5, A: 480, e: 14.0, Iy: 11.0e4, Iv: 4.54e4 },
  20: { soort: 2, b: 60, t: 6, A: 691, e: 16.9, Iy: 22.8e4, Iv: 9.43e4 },
  23: { soort: 2, b: 80, t: 8, A: 1230, e: 22.6, Iy: 72.2e4, Iv: 29.9e4 },
  26: { soort: 2, b: 100, t: 10, A: 1920, e: 28.2, Iy: 177e4, Iv: 73.0e4 },
  28: { soort: 2, b: 120, t: 12, A: 2750, e: 34.0, Iy: 368e4, Iv: 152e4 },
};
for (const p of Object.values(PROFIEL)) if (p.soort === 1) p.A = p.b * p.t;

// ── Onafhankelijke uitwerking; eenheden N en mm ─────────────────────────────
function uitwerking(v, P) {
  const p = PROFIEL[v.profile];
  const fy = v.staalkwaliteit, fu = { 235: 360, 275: 430, 355: 490 }[fy];
  const eps = Math.sqrt(235 / fy);
  const b = v.b_v * 1000, h = v.h_v * 1000, L = Math.hypot(b, h), cos = b / L, sin = h / L;
  const gQ = { 1: 1.35, 2: 1.5, 3: 1.65 }[P.CC];
  const Fw = gQ * v.F_w_k * 1000, V = v.V_Ed * 1000;
  const ah = Math.min(Math.max(2 / Math.sqrt(v.h_v), 2 / 3), 1);
  const am = Math.sqrt(0.5 * (1 + 1 / Math.max(v.m_k, 1)));
  const phi = (ah * am) / 200;
  const H = Fw >= 0.15 * V ? 0 : phi * V; // 5.3.2(4)B
  // (5.2) met δ = F·L/(E·A·cos²α): alleen de verlenging van de diagonaal.
  const acr = V > 0 ? (h * 210000 * p.A * cos * cos) / (V * L) : Infinity;
  const kcr = acr >= 3 && acr < 10 ? 1 / (1 - 1 / acr) : 1;
  const tweedeOk = acr >= 3;
  const Fh = kcr * (Fw + H), N = Fh / cos;

  const Npl = p.A * fy;
  let Nu = Infinity, beta = null;
  if (v.aansluiting > 0) {
    if (p.soort === 1) Nu = (0.9 * (p.A - v.n_d * v.d_0 * p.t) * fu) / 1.25;
    else {
      const Anet = p.A - v.d_0 * p.t;
      const r = Math.min(Math.max((v.p_1 / v.d_0 - 2.5) / 2.5, 0), 1);
      if (v.aansluiting === 1) Nu = (2 * (v.e_2 - 0.5 * v.d_0) * p.t * fu) / 1.25;
      else {
        beta = v.aansluiting === 2 ? 0.4 + 0.3 * r : 0.5 + 0.2 * r;
        Nu = (beta * Anet * fu) / 1.25;
      }
    }
  }
  const Nt = Math.min(Npl, Nu);

  // Blokschuif: hoek (3.10) naar de vrije rand van het been, strip met meer
  // gaten naast elkaar (3.9): het blok tussen de buitenste rijen of de twee
  // randstroken daarbuiten, met dezelfde afschuifvlakken; een strip met één rij
  // heeft geen blok. Drie of meer bouten → 3. A_nt of A_nv ≤ 0 → niet getoetst.
  // Zonder gatdiameter zijn de netto doorsnede en de blokschuif niet te toetsen.
  const gatOk = !(v.aansluiting > 0) || v.d_0 > 0;
  let blokOk = true, Veff = null, UCbs = 0, Anw = null, fvwd = null;
  let las = 1, UCw = 0, Nlas = null, leff = null, bLw = null, FwEd = null, FwRd = null;
  if (v.aansluiting > 0 && (p.soort === 2 || v.n_d > 1)) {
    const n = Math.min(v.aansluiting, 3);
    const lv = v.e_1 + (n - 1) * v.p_1 - (n - 0.5) * v.d_0;
    const Ant = p.soort === 2
      ? (v.e_2 - 0.5 * v.d_0) * p.t
      : Math.min(p.b - 2 * v.e_2 - (v.n_d - 1) * v.d_0, 2 * v.e_2 - v.d_0) * p.t;
    const Anv = (p.soort === 2 ? 1 : 2) * lv * p.t;
    if (!(v.e_1 > 0) || Ant <= 0 || Anv <= 0) blokOk = false;
    else Veff = ((p.soort === 2 ? 0.5 : 1) * fu * Ant) / 1.25 + (fy * Anv) / Math.sqrt(3);
    if (Veff !== null) UCbs = N / Veff;
  } else if (v.aansluiting === 0) {
    // Twee gelijke flankelassen. Een strip verdeelt de kracht gelijk; bij een
    // hoekprofiel loopt de kracht op e van de hiel, dus de hiellas krijgt
    // N·(b − e)/b (evenwicht om de werklijn). Zonder a of l_w: niet getoetst (0);
    // a < 3 mm of l_eff < max(30; 6a): de las mag geen kracht overbrengen (2).
    const bw = { 235: 0.8, 275: 0.85, 355: 0.9 }[fy];
    fvwd = fu / (Math.sqrt(3) * bw * 1.25);
    Nlas = p.soort === 1 ? N / 2 : (N * (p.b - p.e)) / p.b;
    const a = v.a_w ?? 0, lw = v.l_w ?? 0;
    if (!(a > 0 && lw > 0)) {
      las = 0;
      Anw = Nlas / fvwd;
    } else {
      leff = lw - 2 * a;
      if (a < 3 || leff < Math.max(30, 6 * a)) las = 2;
      else {
        bLw = Math.min(1, 1.2 - (0.2 * lw) / (150 * a));
        FwEd = Nlas / leff;
        FwRd = bLw * fvwd * a;
        UCw = FwEd / FwRd;
      }
    }
  }

  let drukOk = true, UCc = 0, Nb = null, lamEff = null, chi = null;
  if (v.verbandtype === 2) {
    if (p.soort === 1 || v.aansluiting === 1 || p.b / p.t / eps > 11.5) drukOk = false;
    else {
      const l1 = 93.9 * eps;
      const lv = L / (Math.sqrt(p.Iv / p.A) * l1), ly = L / (Math.sqrt(p.Iy / p.A) * l1);
      lamEff = Math.max(0.35 + 0.7 * lv, 0.5 + 0.7 * ly);
      const F = 0.5 * (1 + 0.34 * (lamEff - 0.2) + lamEff * lamEff);
      chi = Math.min(1, 1 / (F + Math.sqrt(F * F - lamEff * lamEff)));
      Nb = chi * p.A * fy;
      UCc = N / Nb;
    }
  }
  const u = (v.F_w_k * 1000 * L) / (210000 * p.A * cos * cos);
  const UCt = N / Nt, UCu = u / (h / v.grens_u);
  return {
    phi, acr, kcr, tweedeOk, H, Fh, N, Npl, Nu, beta, Nt, UCt, gatOk, blokOk, Veff, UCbs, fvwd, Anw,
    las, Nlas, leff, bLw, FwEd, FwRd, UCw,
    drukOk, lamEff, chi, Nb, UCc, u, UCu, UCmax: Math.max(UCt, UCc, UCu, UCbs, UCw),
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
    H_imp: ruim(r.H / 1000), F_h_Ed: ruim(r.Fh / 1000), N_Ed: ruim(r.N / 1000), N_pl_Rd: ruim(r.Npl / 1000),
    N_t_Rd: ruim(r.Nt / 1000), UC_t: ruim(r.UCt), u_h: ruim(r.u), UC_u: ruim(r.UCu),
  };
  if (Number.isFinite(r.Nu)) uit.N_u_Rd = ruim(r.Nu / 1000);
  if (r.beta !== null) uit[v.aansluiting === 2 ? "β_2" : "β_3"] = ruim(r.beta);
  if (r.Nb !== null) Object.assign(uit, { λ_eff: ruim(r.lamEff), χ: ruim(r.chi), N_b_Rd: ruim(r.Nb / 1000), UC_c: ruim(r.UCc) });
  if (Number.isFinite(r.acr)) uit.α_cr = ruim(r.acr);
  if (r.kcr > 1) uit.k_cr = ruim(r.kcr);
  if (r.Veff !== null) Object.assign(uit, { V_eff_Rd: ruim(r.Veff / 1000), UC_bs: ruim(r.UCbs) });
  if (r.fvwd !== null) Object.assign(uit, { f_vw_d: ruim(r.fvwd), N_las: ruim(r.Nlas / 1000) });
  if (r.Anw !== null) uit.A_w_nodig = ruim(r.Anw);
  if (r.leff !== null) uit.l_eff = ruim(r.leff);
  if (r.bLw !== null && r.bLw < 1) uit.β_Lw = ruim(r.bLw);
  if (r.FwEd !== null) Object.assign(uit, { F_las_Ed: ruim(r.FwEd), F_las_Rd: ruim(r.FwRd), UC_w: ruim(r.UCw) });
  if (r.drukOk) uit.UC_max = ruim(r.UCmax);
  return uit;
}

const SETS = [
  {
    naam: "1 — standaard: L 60×60×6 S235 in een X-kruis, twee bouten, wind met scheefstand",
    invoer: {},
    // Met de hand: L_d = √61 = 7,810 m, cos α = 0,7682. F_w,Ed = 1,5·40 = 60 kN <
    // 0,15·600 = 90 → scheefstand: α_h = 2/√5 = 0,894, α_m = √0,625 = 0,791,
    // φ = 0,003536, H = 2,12 kN. N_Ed = 62,12/0,7682 = 80,86 kN. p_1/d_0 = 3,33 →
    // β_2 = 0,4 + 0,3·0,333 = 0,50; A_net = 691 − 18·6 = 583 mm² →
    // N_u,Rd = 0,5·583·360/1,25 = 83,95 kN; UC = 0,963. u = 40 000·7810/(210 000·691·0,590) = 3,65 mm.
    // α_cr = 5000·210 000·691·0,590/(600 000·7810) = 91 ≥ 10 → geen vergroting.
    // Blokschuif (3.10), e₁ = 40: A_nt = (30 − 9)·6 = 126 mm²; A_nv = (40 + 60 − 1,5·18)·6 = 438 mm²;
    // V_eff,2,Rd = 0,5·360·126/1,25 + 235·438/√3 = 18,14 + 59,43 = 77,57 kN → UC = 80,86/77,57 = 1,042.
    handwerk: {
      φ: "0.003536", H_imp: "2.121", N_Ed: "80.86", β_2: "0.500", N_u_Rd: "83.95", UC_t: "0.963", u_h: "3.65",
      α_cr: "91", A_nt: "126", A_nv: "438", V_eff_Rd: "77.57", UC_bs: "1.042",
    },
  },
  {
    naam: "2 — strip 100×10 S275, één bout, CC3",
    CC: 3,
    invoer: { profile: 11, staalkwaliteit: 275, aansluiting: 1, n_d: 1, d_0: 18, F_w_k: 30 },
  },
  {
    naam: "3 — L 80×80×8 S355, drie bouten (β_3 tussen de grenzen), geen scheefstand",
    invoer: { profile: 23, staalkwaliteit: 355, aansluiting: 3, d_0: 22, p_1: 100, V_Ed: 200, F_w_k: 60 },
  },
  {
    naam: "4 — L 100×100×10 S235 als enkele diagonaal, gelast met a 4 en l_w 100: trek, knik en las",
    invoer: { verbandtype: 2, profile: 26, aansluiting: 0, b_v: 4, h_v: 3.5, F_w_k: 25, a_w: 4, l_w: 100 },
    // Met de hand: L_d = √(16 + 12,25) = 5,315 m. i_v = √(73,0/19,2) = 19,50 mm,
    // λ_v = 5315/(19,50·93,9) = 2,903 → λ_eff,v = 0,35 + 0,7·2,903 = 2,382;
    // i_y = 30,36 mm → λ_eff,y = 0,5 + 0,7·1,864 = 1,805. Φ = 3,708 →
    // χ = 1/(3,708 + √(13,750 − 5,674)) = 0,1527; N_b,Rd = 0,1527·1920·235 = 68,9 kN.
    // Las: N_Ed = 39,87/0,7526 = 52,98 kN; f_vw,d = 360/(√3·0,8·1,25) = 207,8 N/mm².
    // Hiellas: N_las = 52,98·(100 − 28,2)/100 = 38,04 kN; l_eff = 100 − 2·4 = 92 mm;
    // F_w,Ed = 38 040/92 = 413,5 N/mm; F_w,Rd = 207,8·4 = 831,4 N/mm → UC_w = 0,497.
    handwerk: {
      λ_eff: "2.382", χ: "0.1527", N_b_Rd: "68.9", N_Ed: "52.98", f_vw_d: "207.8",
      N_las: "38.04", l_eff: "92", F_las_Ed: "413.5", F_las_Rd: "831.4", UC_w: "0.497",
    },
  },
  {
    naam: "4b — idem zonder a en l_w: las niet getoetst",
    invoer: { verbandtype: 2, profile: 26, aansluiting: 0, b_v: 4, h_v: 3.5, F_w_k: 25 },
    // Hiellas: a·l_eff ≥ 38 040/207,85 = 183,0 mm² — dat is wat de hiellas vraagt als
    // de twee lassen even lang zijn; de som over beide lassen (254,9 mm²) volstaat dan niet.
    handwerk: { N_las: "38.04", A_w_nodig: "183.0" },
  },
  {
    naam: "4c — strip 100×10 gelast, a 3 en l_w 500 > 150·a: β_Lw (4.9)",
    invoer: { profile: 11, aansluiting: 0, a_w: 3, l_w: 500 },
    // N_Ed = 80,86 kN (set 1) → N_las = 40,43 kN per las; l_eff = 500 − 6 = 494 mm;
    // β_Lw = 1,2 − 0,2·500/450 = 0,9778; F_w,Rd = 0,9778·207,8·3 = 609,7 N/mm;
    // F_w,Ed = 40 430/494 = 81,84 N/mm → UC_w = 0,134.
    handwerk: { N_las: "40.43", l_eff: "494", β_Lw: "0.9778", F_las_Rd: "609.7", UC_w: "0.134" },
  },
  {
    naam: "4d — strip 100×10 gelast, a 4 en l_w 36: l_eff 28 < 30 mm (§4.5.1(2))",
    invoer: { profile: 11, aansluiting: 0, a_w: 4, l_w: 36 },
  },
  {
    naam: "4e — strip 100×10 gelast, a 2,5 < 3 mm (§4.5.2(2))",
    invoer: { profile: 11, aansluiting: 0, a_w: 2.5, l_w: 100 },
  },
  {
    naam: "5 — L 50×50×5, één bout (3.11), X-kruis",
    invoer: { profile: 18, aansluiting: 1, d_0: 14, e_2: 25, F_w_k: 20, V_Ed: 0 },
    // Met de hand: N_Ed = 30/0,7682 = 39,05 kN; (3.11) N_u,Rd = 2·(25 − 7)·5·360/1,25 = 51,84 kN.
    // Blokschuif (3.10), e₁ = 40: A_nt = (25 − 7)·5 = 90 mm², A_nv = (40 − 0,5·14)·5 = 165 mm²;
    // V_eff,2,Rd = 0,5·360·90/1,25 + 235·165/√3 = 12,96 + 22,39 = 35,35 kN → UC = 1,105: voldoet niet.
    handwerk: { N_u_Rd: "51.84", A_nt: "90", A_nv: "165", V_eff_Rd: "35.35", UC_bs: "1.105" },
  },
  {
    naam: "6 — L 120×120×12 als enkele diagonaal, twee bouten op ruime steek (β_2 = 0,7), grens h/150",
    invoer: { verbandtype: 2, profile: 28, aansluiting: 2, d_0: 22, p_1: 120, b_v: 3, h_v: 3, grens_u: 150 },
  },
  {
    naam: "7 — strip als enkele diagonaal: geen druk mogelijk",
    invoer: { verbandtype: 2, profile: 5, aansluiting: 2 },
  },
  {
    naam: "8 — L 100×100×10 S355 als enkele diagonaal: klasse 4",
    invoer: { verbandtype: 2, profile: 26, staalkwaliteit: 355, aansluiting: 2, d_0: 18, p_1: 70 },
  },
  {
    naam: "9 — strip 120×12, smal vak met grote V_Ed: 3 ≤ α_cr < 10",
    invoer: { profile: 14, b_v: 3, h_v: 6, F_w_k: 60, V_Ed: 6000, m_k: 6, aansluiting: 2, d_0: 18, n_d: 1 },
    // Met de hand: L_d = √45 = 6,708 m, cos α = 0,4472, cos²α = 0,2, A = 1440 mm².
    // α_cr = 6000·210 000·1440·0,2/(6 000 000·6708) = 9,016 → k = 1/(1 − 1/9,016) = 1,125.
    // F_w,Ed = 90 kN < 0,15·6000 → φ = (2/√6)·√(0,5·7/6)/200 = 0,003118, H = 18,71 kN.
    // F_h,Ed = 1,125·108,71 = 122,3 kN; N_Ed = 122,3/0,4472 = 273,4 kN.
    // N_u,Rd = 0,9·(1440 − 18·12)·360/1,25 = 317,3 kN → UC_t = 0,862 (zonder vergroting 0,766).
    handwerk: { α_cr: "9.016", k_cr: "1.125", F_h_Ed: "122.3", N_Ed: "273.4", UC_t: "0.862" },
  },
  {
    naam: "10 — idem met V_Ed 20 000: α_cr < 3, tweede-orde-analyse nodig",
    invoer: { profile: 14, b_v: 3, h_v: 6, F_w_k: 60, V_Ed: 20000, m_k: 6, aansluiting: 2, d_0: 18, n_d: 1 },
    // α_cr = 9,016·6000/20 000 = 2,705 < 3.
    handwerk: { α_cr: "2.705" },
  },
  {
    naam: "11 — standaard zonder e₁: blokschuif niet getoetst",
    invoer: { e_1: 0 },
  },
  {
    naam: "11b — strip 100×10 met één rij bouten, zonder e₁: geen blokschuif, dus ook geen e₁ nodig",
    invoer: { profile: 11, aansluiting: 2, n_d: 1, e_1: 0 },
  },
  {
    naam: "12 — strip 100×10 met twee gaten naast elkaar, drie bouten: blokschuif (3.9)",
    invoer: { profile: 11, aansluiting: 3, n_d: 2, e_2: 25 },
    // A_nt = (100 − 2·25 − 18)·10 = 320 mm²; A_nv = 2·(40 + 2·60 − 2,5·18)·10 = 2300 mm²;
    // V_eff,1,Rd = 360·320/1,25 + 235·2300/√3 = 92,16 + 312,1 = 404,2 kN.
    handwerk: { A_nt: "320", A_nv: "2300", V_eff_Rd: "404.2" },
  },
  {
    naam: "12b — idem met gaten dicht bij de rand (e₂ 22): de randstroken zijn maatgevend",
    invoer: { profile: 11, aansluiting: 3, n_d: 2, e_2: 22 },
    // Blok tussen de rijen: (100 − 2·22 − 18)·10 = 380 mm²; randstroken: (2·22 − 18)·10 = 260 mm² → A_nt = 260.
    // A_nv = 2·(40 + 2·60 − 2,5·18)·10 = 2300 mm²;
    // V_eff,1,Rd = 360·260/1,25 + 235·2300/√3 = 74,88 + 312,1 = 386,9 kN.
    handwerk: { A_nt: "260", A_nv: "2300", V_eff_Rd: "386.9" },
  },
  {
    naam: "12c — strip 100×10, twee gaten naast elkaar met e₂ 8 < d₀/2: blokschuif niet te toetsen",
    invoer: { profile: 11, aansluiting: 3, n_d: 2, e_2: 8 },
  },
  {
    naam: "13 — standaard met d₀ 0: gatdiameter ontbreekt",
    invoer: { d_0: 0 },
    // Het blad rekent A_net = A en β_2 = 0,7 (p₁/d₀ oneindig) en zou zonder de
    // vlag 'voldoet' geven (UC_bs 0,753); met d₀ 0 is er niets te toetsen.
  },
  // Gewiste velden (''): de kern leest ze als 0 in de eenheid van het veld, net
  // als de narekening (Number('') = 0). Het oordeel moet dan op "niet getoetst"
  // blijven staan, nooit op "voldoet".
  { naam: "14a — gelast, a gewist", invoer: { aansluiting: 0, a_w: "", l_w: 100 } },
  { naam: "14b — gelast, l_w gewist", invoer: { aansluiting: 0, a_w: 4, l_w: "" } },
  { naam: "14c — standaard, e₁ gewist", invoer: { e_1: "" } },
  { naam: "14d — standaard met e₁ 60, e₂ gewist", invoer: { e_1: 60, e_2: "" } },
  { naam: "14e — standaard, d₀ gewist", invoer: { d_0: "" } },
  {
    naam: "14f — strip 100×10, twee gaten naast elkaar, e₁ gewist",
    invoer: { profile: 11, aansluiting: 3, n_d: 2, e_2: 25, e_1: "" },
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

  let ok;
  const slot = got.text.slice(got.text.lastIndexOf("Maatgevende UC"));
  const gemeld = (re, wat) => {
    ok = re.test(slot) && /het verband voldoet niet/.test(slot);
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    ${wat}, gemeld als voldoet niet`);
  };
  if (!r.drukOk) gemeld(/de druk bij omkerende wind/, "druk niet op te nemen of niet te toetsen");
  else if (!r.gatOk) gemeld(/de gatdiameter d\s*0 ontbreekt/, "gatdiameter ontbreekt");
  else if (!r.blokOk) gemeld(/de blokschuif is niet getoetst/, "blokschuif niet getoetst");
  else if (r.las === 0) gemeld(/de las is niet getoetst/, "las niet getoetst");
  else if (r.las === 2) gemeld(/de las voldoet niet aan §4\.5\.1\(2\) of §4\.5\.2\(2\)/, "las mag geen kracht overbrengen");
  else if (!r.tweedeOk) gemeld(/tweede-orde-analyse/, "α_cr < 3");
  else {
    const voldoet = /het verband voldoet(?! niet)/.test(got.text);
    ok = voldoet === r.UCmax <= 1;
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    ons ${voldoet ? "voldoet" : "voldoet niet"}   narekening ${r.UCmax <= 1 ? "voldoet" : "voldoet niet"}`);
  }
  if (!ok) fouten++;
}

// ── De profiellijst van het beeld loopt gelijk met het blad ─────────────────
{
  console.log("\nProfiellijst van het beeld tegen de keuzelijst en de matrix van het blad");
  const ts = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../packages/desktop/src/components/calc/windverbandProfielen.ts"), "utf8");
  const beeld = new Map(
    [...ts.matchAll(/^\s*(\d+): \{ naam: "([^"]+)", soort: (\d), b: ([\d.]+), t: ([\d.]+), e: ([\d.]+) \}/gm)]
      .map((m) => [Number(m[1]), { naam: m[2], maten: [Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6])] }]),
  );
  const keuze = tpl.slice(tpl.indexOf("@select profile"), tpl.indexOf("@end", tpl.indexOf("@select profile")));
  const opties = [...keuze.matchAll(/^\s+(.+?) = (\d+)$/gm)].map((m) => [Number(m[2]), m[1]]);
  const matrix = tpl.match(/profielen = \[([^\]]+)\]/)[1].split("|").map((k) => k.split(";").map((x) => Number(x.trim())));
  let ok = opties.length === beeld.size && opties.length === matrix[0].length;
  for (const [id, naam] of opties) {
    const b = beeld.get(id);
    const k = matrix[0].indexOf(id);
    // soort, b, t uit de matrix; e staat daar in cm, in het beeld in mm
    const maten = [matrix[1][k], matrix[2][k], matrix[3][k], matrix[5][k] * 10];
    if (!b || b.naam !== naam || k < 0 || b.maten.some((x, i) => Math.abs(x - maten[i]) > 1e-6)) {
      ok = false;
      console.log(`  FOUT   id ${id}: blad "${naam}" ${maten.join("/")}, beeld ${b ? `"${b.naam}" ${b.maten.join("/")}` : "ontbreekt"}`);
    }
  }
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${opties.length} profielen in de keuzelijst, ${beeld.size} in het beeld, ${matrix[0].length} in de matrix`);
}

afronden(fouten, "Verticaal windverband");
