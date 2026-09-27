/**
 * Controlescript voor de module Betonplaat en console (NEN-EN 1992-1-1 met NB).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent haar
 * daarom op drie manieren na:
 *
 *   1. De momentcoëfficiënten van de tweezijdig dragende plaat. Het blad heeft
 *      een tabel uit een eigen plaatberekening: dunne plaat (Kirchhoff),
 *      ν = 0,2, eindige differenties (13-puntsster, spookpunten voor vrij
 *      opgelegde en ingeklemde randen), Richardson-extrapolatie over twee
 *      roosters en een parabool door de buren van het grootste rooster-
 *      punt. Per rand­geval en verhouding l_lang/l_kort = 1,0 … 2,0: het
 *      wapeningsmoment m + |m_xy| (5.1.1(8), NB) onder en boven, in beide
 *      richtingen. Dit script rekent de hele tabel opnieuw uit op een grover
 *      rooster en vergelijkt; met --tabel rekent het haar uit op het rooster
 *      van het blad en drukt het de regels voor het blad af. De
 *      plaatberekening zelf wordt getoetst aan de gesloten reeksoplossing van
 *      de vrij opgelegde plaat (dubbele sinusreeks), onafhankelijk van de
 *      differenties, en aan de bekende waarden van de ingeklemde vierkante
 *      plaat (ν = 0,3).
 *   2. Een onafhankelijke uitwerking in JavaScript van het hele blad: dezelfde
 *      normregels, maar anders gerekend. De drukzone en de nodige wapening
 *      door te halveren (het blad lost de vergelijkingen gesloten op), de
 *      gescheurde doorsnede door te halveren, de interpolatie in de tabel met
 *      een eigen zoekslag, en bij de console z_0 met een vaste-puntiteratie in
 *      plaats van de wortelformule. Het blad moet daar op vier significante
 *      cijfers mee overeenkomen.
 *   3. Handberekeningen bij de sets, uitgeschreven in het commentaar.
 *
 * Verder: het oordeel in de slotzin, de lege en onvolledige invoer (geen NaN,
 * wel "voldoet niet") en de beginwaarden van het beeld.
 *
 * Draaien:  node scripts/check-betonplaat.mjs          (een paar seconden)
 *           node scripts/check-betonplaat.mjs --tabel  (de tabel opnieuw, ruim een minuut)
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

// ── Eigen plaatberekening: eindige differenties ──────────────────────────────
// a = 1 (de korte zijde, x), b = ε, q = 1, D = 1: momenten in q·a².
// rand = [x = 0, x = a, y = 0, y = b]: −1 vrij opgelegd, +1 ingeklemd (het
// spookpunt buiten de rand is −w of +w van het punt erbinnen).

function losPlaat(N, eps, rand, nu) {
  const Nx = N, Ny = Math.round(N * eps);
  const h = 1 / N, nx = Nx - 1, ny = Ny - 1, n = nx * ny, bw = 2 * nx, W = bw + 1;
  const idx = (i, j) => i - 1 + (j - 1) * nx;
  const [sx0, sx1, sy0, sy1] = rand;
  const A = new Float64Array(n * W);
  for (let j = 1; j <= ny; j++) {
    for (let i = 1; i <= nx; i++) {
      const r = idx(i, j);
      const zet = (ii, jj, v) => {
        if (ii === -1) { ii = 1; v *= sx0; }
        if (ii === Nx + 1) { ii = Nx - 1; v *= sx1; }
        if (jj === -1) { jj = 1; v *= sy0; }
        if (jj === Ny + 1) { jj = Ny - 1; v *= sy1; }
        if (ii <= 0 || ii >= Nx || jj <= 0 || jj >= Ny) return;
        const c = idx(ii, jj);
        if (c >= r) A[r * W + (c - r)] += v;
      };
      zet(i, j, 20);
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) zet(i + di, j + dj, -8);
      for (const [di, dj] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) zet(i + di, j + dj, 2);
      for (const [di, dj] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) zet(i + di, j + dj, 1);
    }
  }
  // Cholesky van de bandmatrix (A = UᵀU), dan heen en terug substitueren.
  for (let r = 0; r < n; r++) {
    let s = A[r * W];
    const k0 = Math.max(0, r - bw);
    for (let k = k0; k < r; k++) s -= A[k * W + (r - k)] ** 2;
    const dg = Math.sqrt(s);
    A[r * W] = dg;
    for (let c = r + 1; c <= Math.min(n - 1, r + bw); c++) {
      let t = A[r * W + (c - r)];
      for (let k = Math.max(k0, c - bw); k < r; k++) t -= A[k * W + (r - k)] * A[k * W + (c - k)];
      A[r * W + (c - r)] = t / dg;
    }
  }
  const x = new Float64Array(n).fill(h ** 4);
  for (let r = 0; r < n; r++) {
    for (let k = Math.max(0, r - bw); k < r; k++) x[r] -= A[k * W + (r - k)] * x[k];
    x[r] /= A[r * W];
  }
  for (let r = n - 1; r >= 0; r--) {
    for (let c = r + 1; c <= Math.min(n - 1, r + bw); c++) x[r] -= A[r * W + (c - r)] * x[c];
    x[r] /= A[r * W];
  }
  const w = (i, j) => {
    let f = 1;
    if (i === -1) { i = 1; f *= sx0; }
    if (i === Nx + 1) { i = Nx - 1; f *= sx1; }
    if (j === -1) { j = 1; f *= sy0; }
    if (j === Ny + 1) { j = Ny - 1; f *= sy1; }
    if (i <= 0 || i >= Nx || j <= 0 || j >= Ny) return 0;
    return f * x[idx(i, j)];
  };
  const mx = [], my = [], mxy = [];
  for (let i = 0; i <= Nx; i++) {
    mx.push(new Float64Array(Ny + 1)); my.push(new Float64Array(Ny + 1)); mxy.push(new Float64Array(Ny + 1));
    for (let j = 0; j <= Ny; j++) {
      const wxx = (w(i + 1, j) - 2 * w(i, j) + w(i - 1, j)) / (h * h);
      const wyy = (w(i, j + 1) - 2 * w(i, j) + w(i, j - 1)) / (h * h);
      const wxy = (w(i + 1, j + 1) - w(i + 1, j - 1) - w(i - 1, j + 1) + w(i - 1, j - 1)) / (4 * h * h);
      mx[i][j] = -(wxx + nu * wyy); my[i][j] = -(wyy + nu * wxx); mxy[i][j] = -(1 - nu) * wxy;
    }
  }
  return { Nx, Ny, mx, my, mxy, wmid: w(Nx / 2, Ny / 2) };
}

/**
 * Richardson over de roosters N en 2N op de knopen van het grove rooster; per
 * grootheid het grootste knooppunt, verfijnd met een parabool door de buren.
 * ko/lo: onder, moment in de korte (x) en de lange (y) richting; kb/lb: boven.
 */
function coefficienten(N, eps, rand, nu = 0.2) {
  const g = losPlaat(N, eps, rand, nu), f = losPlaat(2 * N, eps, rand, nu);
  const R = (A, B, i, j) => (4 * B[2 * i][2 * j] - A[i][j]) / 3;
  const veld = { ko: [], lo: [], kb: [], lb: [] };
  for (let i = 0; i <= g.Nx; i++) {
    for (const k in veld) veld[k].push(new Float64Array(g.Ny + 1));
    for (let j = 0; j <= g.Ny; j++) {
      const mx = R(g.mx, f.mx, i, j), my = R(g.my, f.my, i, j), t = Math.abs(R(g.mxy, f.mxy, i, j));
      veld.ko[i][j] = mx + t; veld.lo[i][j] = my + t; veld.kb[i][j] = -mx + t; veld.lb[i][j] = -my + t;
    }
  }
  const uit = { g, f, wmid: (4 * f.wmid - g.wmid) / 3 };
  const par = (a, b, c) => { const k = a - 2 * b + c; return k < 0 ? -((a - c) ** 2) / (8 * k) : 0; };
  for (const k in veld) {
    const V = veld[k];
    let best = -Infinity, bi = 0, bj = 0;
    for (let i = 0; i <= g.Nx; i++) for (let j = 0; j <= g.Ny; j++) if (V[i][j] > best) { best = V[i][j]; bi = i; bj = j; }
    if (bi > 0 && bi < g.Nx) best += par(V[bi - 1][bj], V[bi][bj], V[bi + 1][bj]);
    if (bj > 0 && bj < g.Ny) best += par(V[bi][bj - 1], V[bi][bj], V[bi][bj + 1]);
    uit[k] = best;
  }
  return uit;
}

/** Rand per geval k = 3·n_k + n_l + 1: n_k ingeklemde randen langs x (x = 0 eerst), n_l langs y. */
const randVan = (nk, nl) => [nk >= 1 ? 1 : -1, nk >= 2 ? 1 : -1, nl >= 1 ? 1 : -1, nl >= 2 ? 1 : -1];
const GEVALLEN = [0, 1, 2].flatMap((nk) => [0, 1, 2].map((nl) => ({ nk, nl, k: 3 * nk + nl + 1 })));
const VERHOUDINGEN = Array.from({ length: 11 }, (_, i) => 1 + i / 10);

if (process.argv.includes("--tabel")) {
  // De tabel van het blad: rooster 60 (fijn 120). Duurt ruim een minuut.
  const t0 = Date.now();
  const rijen = { ko: [], lo: [], kb: [], lb: [] };
  for (const { nk, nl, k } of GEVALLEN) {
    const c = VERHOUDINGEN.map((e) => coefficienten(60, e, randVan(nk, nl)));
    for (const s in rijen) rijen[s].push(`            T${s}_${k} = [${c.map((x) => Number(x[s].toPrecision(4))).join("; ")}]`);
  }
  for (const s in rijen) console.log(rijen[s].join("\n"));
  console.error(`tabel in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  process.exit(0);
}

const tpl = laadTemplate("betonplaat.ts");
if (!tpl.startsWith('"Betonplaat en console')) {
  console.log("FOUT  de bladtekst begint niet met de kop; staat er een backtick in het commentaar erboven?");
  process.exit(1);
}
let fouten = 0;
const meld = (ok, wat) => { console.log(`  ${ok ? "OK    " : "FOUT  "} ${wat}`); if (!ok) fouten++; };

// ── 1. De tabel in het blad tegen de eigen plaatberekening ───────────────────
const TABEL = { ko: {}, lo: {}, kb: {}, lb: {} };
for (const m of tpl.matchAll(/T(ko|lo|kb|lb)_(\d) = \[([^\]]+)\]/g)) TABEL[m[1]][Number(m[2])] = m[3].split(";").map(Number);
{
  console.log("Momentcoëfficiënten: de tabel van het blad tegen de eigen plaatberekening (rooster 20 en 40)");
  const volledig = Object.values(TABEL).every((t) => GEVALLEN.every(({ k }) => t[k]?.length === 11));
  meld(volledig, "tabel compleet: 4 soorten × 9 gevallen × 11 verhoudingen");
  let grootste = 0, waar = "";
  for (const { nk, nl, k } of GEVALLEN) {
    VERHOUDINGEN.forEach((e, i) => {
      const c = coefficienten(20, e, randVan(nk, nl));
      for (const s of ["ko", "lo", "kb", "lb"]) {
        const t = TABEL[s][k]?.[i];
        const rel = Math.abs(c[s] - t) / Math.max(Math.abs(t), 0.004);
        if (!(rel <= grootste)) { grootste = rel; waar = `T${s}_${k} bij ${e.toFixed(1)}: blad ${t}, rooster 20 ${c[s].toFixed(5)}`; }
      }
    });
  }
  // Rooster 20 tegen 60 verschilt ten hoogste een paar tiende procent; de tabel heeft vier cijfers.
  meld(grootste <= 0.005, `396 coëfficiënten binnen 0,5 %, grootste verschil ${(grootste * 100).toFixed(2)} % (${waar})`);
}

// De plaatberekening tegen de reeksoplossing van de vrij opgelegde plaat (Navier), ν = 0,2:
// m_x, m_y en m_xy op elk punt als dubbele sinusreeks over de oneven m en n.
{
  console.log("\nDe plaatberekening tegen de reeksoplossing van de vrij opgelegde plaat");
  const nu = 0.2, M = 199;
  const navier = (eps, px, py) => {
    const a = 1, b = eps;
    let mx = 0, my = 0, mxy = 0;
    for (let m = 1; m <= M; m += 2) {
      const am = (m * Math.PI) / a, sx = Math.sin(am * px), cx = Math.cos(am * px);
      for (let n = 1; n <= M; n += 2) {
        const bn = (n * Math.PI) / b;
        const c = 16 / (Math.PI ** 2 * m * n * (am * am + bn * bn) ** 2);
        const sy = Math.sin(bn * py), cy = Math.cos(bn * py);
        mx += c * (am * am + nu * bn * bn) * sx * sy;
        my += c * (bn * bn + nu * am * am) * sx * sy;
        mxy -= (1 - nu) * c * am * bn * cx * cy;
      }
    }
    return { mx, my, mxy };
  };
  for (const eps of [1, 1.5, 2]) {
    const i = Math.round((eps - 1) * 10);
    const mid = navier(eps, 0.5, eps / 2), hoek = navier(eps, 0, 0);
    // Het grootste wapeningsmoment m_y + |m_xy| over een rooster van 1/40.
    let lo = 0;
    for (let a = 0; a <= 40; a++) for (let c = 0; c <= Math.round(40 * eps); c++) {
      const p = navier(eps, a / 40, c / 40); lo = Math.max(lo, p.my + Math.abs(p.mxy));
    }
    const rij = [
      ["ko (midden)", TABEL.ko[1][i], mid.mx], ["kb (hoek)", TABEL.kb[1][i], Math.abs(hoek.mxy)], ["lo (grootste)", TABEL.lo[1][i], lo],
    ];
    for (const [naam, blad, reeks] of rij) {
      const rel = Math.abs(blad - reeks) / reeks;
      meld(rel <= 0.004, `ε = ${eps.toFixed(1)}  ${naam.padEnd(13)} tabel ${blad}  reeks ${reeks.toFixed(5)}  (${(rel * 100).toFixed(2)} %)`);
    }
  }
  // De ingeklemde vierkante plaat met ν = 0,3: w = 0,00126·qa⁴/D, midden 0,0229·qa², rand −0,0513·qa².
  const c = coefficienten(20, 1, [1, 1, 1, 1], 0.3);
  const midden = (4 * c.f.mx[20][20] - c.g.mx[10][10]) / 3, rand = (4 * c.f.mx[0][20] - c.g.mx[0][10]) / 3;
  meld(Math.abs(c.wmid - 0.00126) < 1e-5 && Math.abs(midden - 0.0229) < 1e-4 && Math.abs(rand + 0.0513) < 1e-4,
    `ingeklemde vierkante plaat, ν = 0,3: w = ${c.wmid.toFixed(6)}, m midden ${midden.toFixed(4)}, m rand ${rand.toFixed(4)}`);
}

// ── 2. Standaardinvoer (= beginwaarden van het beeld) ───────────────────────
const STANDAARD = {
  constructiedeel: 1, betonklasse: 30, betonstaal: 2, draagwijze: 2,
  h_pl: 200, c_pl: 25, l_x: 4.5, l_y: 6, rand_x0: 0, rand_x1: 1, rand_y0: 0, rand_y1: 0,
  g_Ed: 7.5, q_Ed: 3.75, g_fr: 6, q_fr: 1.25, "φ_kr": 2, milieuklasse: 1, belastingduur: 1, wanden: 0,
  buitenlaag: 1, ds_xo: 10, s_xo: 150, ds_yo: 8, s_yo: 150, ds_xb: 10, s_xb: 150, ds_yb: 8, s_yb: 150,
  ds_xm: 8, s_xm: 200, ds_ym: 8, s_ym: 200, k_neg: 0.75, k_pos: 0.6,
  b_con: 300, h_con: 400, l_con: 500, a_con: 150, l_opl: 120, b_opl: 200, h_opl: 20, c_con: 30,
  F_Ed: 250, H_Ed: 0, n_hfd: 3, ds_hfd: 16, n_bgl: 3, ds_bgl: 10, l_bkol: 400, aanhechting: 2, staafvorm: 3,
};
const PROJECT = { CC: 2, K_FI: 1, rekenwijze: 0 };

// ── Onafhankelijke uitwerking; eenheden N, mm (overspanningen in m) ─────────
const ES = 200000, ECU3 = 0.0035;
/** Wortel van f op [lo, hi] door halveren (f van teken wisselend). */
function halveer(f, lo, hi, n = 200) {
  const flo = f(lo);
  for (let i = 0; i < n; i++) { const m = (lo + hi) / 2; if ((f(m) < 0) === (flo < 0)) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
function materiaal(v) {
  const fck = v.betonklasse;
  return { fck, fcd: fck / 1.5, fyd: 500 / 1.15, fctm: 0.3 * fck ** (2 / 3), Ecm: 22000 * ((fck + 8) / 10) ** 0.3 };
}

/** Plaatstrook van 1000 mm: buiging, nodige wapening, A_s,min, s_max en scheurwijdte. */
function laag(v, mt, { m, mfr, ds, s, d, c }) {
  const b = 1000, h = v.h_pl, { fcd, fyd, fctm, Ecm, fck } = mt;
  const r = { m: m / 1e6, d };
  r.as = (Math.PI * ds * ds) / 4 / s * b;
  // Drukzone door te halveren op het krachtenevenwicht; staal op f_yd of elastisch.
  const sig = (x) => Math.min(fyd, (ES * ECU3 * (d - x)) / x);
  const xu = halveer((x) => 0.8 * fcd * b * x - r.as * sig(x), 1e-6, d);
  r.xu = xu;
  r.mRd = (0.8 * fcd * b * xu * (d - 0.4 * xu)) / 1e6;
  r.UCM = m / 1e6 / r.mRd;
  // Nodige wapening: halveren op de oppervlakte tot m_Rd = m.
  const mRd = (a) => {
    if (a <= 0) return 0;
    const x = halveer((t) => 0.8 * fcd * b * t - a * sig(t), 1e-9, d);
    return 0.8 * fcd * b * x * (d - 0.4 * x);
  };
  const nodig = (mm) => (mm <= 0 ? 0 : mm / (fcd * b * d * d) > 0.48 ? Infinity : halveer((a) => mRd(a) - mm, 0, 50 * r.as + 1e5));
  r.req = nodig(m);
  const mcr = (fctm * b * h * h) / 6;
  r.min1 = nodig(mcr); r.min2 = 1.25 * r.req; r.min = Math.min(r.min1, r.min2);
  r.UCmin = r.min <= 0 ? 0 : r.min / r.as;
  r.UCs = s / Math.min(2 * h, 250);
  r.mfr = mfr / 1e6;
  if (mfr <= mcr) r.UCw = 0;
  else {
    const phit = v.belastingduur === 1 ? v["φ_kr"] : 0, ae = ES / Ecm, aL = ae * (1 + phit);
    r.xfr = halveer((x) => (b * x * x) / 2 - aL * r.as * (d - x), 0, d);
    r.sig = mfr / (r.as * (d - r.xfr / 3));
    r.rho = r.as / (b * Math.min(2.5 * (h - d), (h - r.xfr) / 3, h / 2));
    r.sr = s <= 5 * (c + ds / 2) ? Math.min(3.4 * c + (0.8 * 0.5 * 0.425 * ds) / r.rho, Math.max(50 - 0.8 * fck, 15) * ds) : 1.3 * (h - r.xfr);
    const kt = v.belastingduur === 1 ? 0.4 : 0.6;
    r.wk = r.sr * Math.max((r.sig - ((kt * fctm) / r.rho) * (1 + ae * r.rho)) / ES, (0.6 * r.sig) / ES);
    r.UCw = r.wk / (v.milieuklasse === 1 ? 0.4 : v.milieuklasse === 2 ? 0.3 : 0.2);
  }
  r.UC = Math.max(r.UCM, r.UCmin, r.UCs, r.UCw);
  return r;
}

function plaat(v) {
  const r = { soort: "plaat" };
  const mt = materiaal(v);
  const deel = v.constructiedeel, twee = deel === 2 || v.draagwijze === 2;
  const h = v.h_pl, c = v.c_pl, lx = v.l_x, ly = twee ? v.l_y : v.l_x;
  const rx = [v.rand_x0, v.rand_x1], ry = twee ? [v.rand_y0, v.rand_y1] : [0, 0];
  const st = {};
  for (const k of ["xo", "yo", "xb", "yb", "xm", "ym"]) st[k] = { ds: v[`ds_${k}`], s: v[`s_${k}`] };
  if (deel === 1 && !twee && rx[0] + rx[1] === 0) st.xb = { ...st.xo };
  if (deel === 1 && !twee) st.yb = { ...st.yo };
  if (deel === 1) { st.xm = { ...st.xb }; st.ym = { ...st.yb }; }
  const xb = v.buitenlaag === 1;
  // Onder: xo en yo kruisen elkaar; boven xb en yb; de middenstrook xm en ym.
  for (const [p, q] of [["xo", "yo"], ["xb", "yb"], ["xm", "ym"]]) {
    st[p].d = h - c - (xb ? st[p].ds / 2 : st[q].ds + st[p].ds / 2);
    st[q].d = h - c - (xb ? st[p].ds + st[q].ds / 2 : st[q].ds / 2);
    st[p].c = c + (xb ? 0 : st[q].ds);
    st[q].c = c + (xb ? st[p].ds : 0);
  }
  const lmin = Math.min(lx, ly), lmax = Math.max(lx, ly);
  const alle = Object.values(st);
  r.geldig = h > 0 && c >= 0 && alle.every((x) => x.ds > 0 && x.s - x.ds > 0 && x.d > 0) && lmin > 0 && lmin * 1000 >= 5 * h;
  if (!r.geldig) return r;

  const telC = (a) => a.filter((x) => x >= 1).length, telS = (a) => a.filter((x) => x === 2).length;
  const nxc = telC(rx), nxs = telS(rx), nyc = telC(ry), nys = telS(ry);
  const bf = [1 / 8, 9 / 128, 1 / 24], bs = [0, 1 / 8, 1 / 12];
  const g = v.g_Ed, q = v.q_Ed, gf = v.g_fr, qf = v.q_fr;
  const eps = lmax / lmin;
  const M = {}, F = {};
  const zet = (k, med, mfr) => { M[k] = med * 1e6; F[k] = mfr * 1e6; };
  for (const k of ["xo", "yo", "xb", "yb", "xm", "ym"]) zet(k, 0, 0);
  if (deel === 1 && twee && eps <= 2) {
    // Interpoleren in de tabel: de twee kolommen rond ε opzoeken.
    const i = Math.min(VERHOUDINGEN.findIndex((e, j) => eps <= VERHOUDINGEN[j + 1] + 1e-12), 9);
    const t = (eps - VERHOUDINGEN[i]) / 0.1;
    const kortX = lx <= ly;
    const geval = (nk, nl) => 3 * nk + nl + 1;
    const kc = kortX ? geval(nxc, nyc) : geval(nyc, nxc), ks = kortX ? geval(nxs, nys) : geval(nys, nxs);
    const ip = (s, k) => TABEL[s][k][i] * (1 - t) + TABEL[s][k][i + 1] * t;
    const kort = { o: "ko", b: "kb" }, lang = { o: "lo", b: "lb" };
    const α = {};
    for (const zijde of ["o", "b"]) {
      α[`x${zijde}`] = { c: ip((kortX ? kort : lang)[zijde], kc), s: ip((kortX ? kort : lang)[zijde], ks) };
      α[`y${zijde}`] = { c: ip((kortX ? lang : kort)[zijde], kc), s: ip((kortX ? lang : kort)[zijde], ks) };
    }
    r.α = α;
    const veld = (a, gg, qq) => (a.c * (gg + qq / 2) + (a.s * qq) / 2) * lmin * lmin;
    const steun = (a, gg, qq) => Math.max(a.c * (gg + qq), a.c * (gg + qq / 2) + (a.s * qq) / 2) * lmin * lmin;
    zet("xo", veld(α.xo, g, q), veld(α.xo, gf, qf)); zet("yo", veld(α.yo, g, q), veld(α.yo, gf, qf));
    zet("xb", steun(α.xb, g, q), steun(α.xb, gf, qf)); zet("yb", steun(α.yb, g, q), steun(α.yb, gf, qf));
    r.hoofdY = true; r.rld = kortX ? "x" : "y"; r.lld = lmin; r.K = [1, 1.3, 1.5][kortX ? nxc : nyc]; r.lw = 7;
  } else if (deel === 1) {
    const inX = !twee || lx <= ly;
    const nc = inX ? nxc : nyc, ns = inX ? nxs : nys, l = inX ? lx : ly;
    const veld = (gg, qq) => (bf[nc] * (gg + qq / 2) + (bf[ns] * qq) / 2) * l * l;
    const steun = (gg, qq) => bs[nc] * (gg + qq) * l * l;
    const d = inX ? "x" : "y";
    zet(`${d}o`, veld(g, q), veld(gf, qf)); zet(`${d}b`, steun(g, q), steun(gf, qf));
    r.hoofdY = false; r.rld = d; r.lld = l; r.K = [1, 1.3, 1.5][nc]; r.lw = 7;
  } else {
    const kn = Math.min(Math.max(v.k_neg, 0.6), 0.8), kp = Math.min(Math.max(v.k_pos, 0.5), 0.7);
    const bk = 0.5 * lmin;
    for (const [d, l, bw, nc, ns] of [["x", lx, ly, nxc, nxs], ["y", ly, lx, nyc, nys]]) {
      const neg = (gg, qq) => bs[nc] * (gg + qq) * l * l * bw;
      const pos = (gg, qq) => (bf[nc] * (gg + qq / 2) + (bf[ns] * qq) / 2) * l * l * bw;
      r[`M${d}neg`] = neg(g, q);
      zet(`${d}b`, (kn * neg(g, q)) / bk, (kn * neg(gf, qf)) / bk);
      zet(`${d}m`, ((1 - kn) * neg(g, q)) / (bw - bk), ((1 - kn) * neg(gf, qf)) / (bw - bk));
      const f = Math.max(kp / bk, (1 - kp) / (bw - bk));
      zet(`${d}o`, f * pos(g, q), f * pos(gf, qf));
    }
    r.bk = bk; r.hoofdY = true; r.rld = lx >= ly ? "x" : "y"; r.lld = lmax; r.K = 1.2; r.lw = 8.5;
  }
  r.M = M;
  // Per laag toetsen, alleen waar het blad dat ook doet.
  r.lagen = {};
  const doe = (k) => { r.lagen[k] = laag(v, mt, { m: M[k], mfr: F[k], ...st[k] }); };
  if (r.hoofdY || r.rld === "x") doe("xo");
  if (r.hoofdY || r.rld === "y") doe("yo");
  if (!r.hoofdY) {
    const hk = r.rld === "x" ? st.xo : st.yo, vk = r.rld === "x" ? st.yo : st.xo;
    const ah = (Math.PI * hk.ds ** 2) / 4 / hk.s * 1000, av = (Math.PI * vk.ds ** 2) / 4 / vk.s * 1000;
    r.UCverd = Math.max((0.2 * ah) / av, vk.s / Math.min(3 * h, 400, h > 250 ? 250 : 400));
  } else r.UCverd = 0;
  for (const k of ["xb", "yb"]) if (M[k] > 0) doe(k);
  if (deel === 2) {
    for (const k of ["xm", "ym"]) if (M[k] > 0) doe(k);
    if (nxc + nyc > 0) {
      const nodigTot = (Mtot, bw, d) => laag(v, mt, { m: (Mtot / bw) * 1e6 , mfr: 0, ds: 10, s: 100, d, c }).req * bw;
      const At = { x: nodigTot(r.Mxneg, ly, st.xb.d), y: nodigTot(r.Myneg, lx, st.yb.d) };
      const band = (d, bw) => {
        const bb = 0.25 * bw, ak = (Math.PI * st[`${d}b`].ds ** 2) / 4 / st[`${d}b`].s, am = (Math.PI * st[`${d}m`].ds ** 2) / 4 / st[`${d}m`].s;
        return (ak * Math.min(bb, r.bk) + am * Math.max(bb - r.bk, 0)) * 1000;
      };
      r.At = At; r.Aband = { x: band("x", ly), y: band("y", lx) };
      r.UC941 = Math.max((0.5 * At.x) / r.Aband.x, (0.5 * At.y) / r.Aband.y);
    } else r.UC941 = 0;
  } else r.UC941 = 0;
  // Doorbuiging (7.16a/b) en (7.17)
  const L = r.lagen[`${r.rld}o`] ?? laag(v, mt, { m: M[`${r.rld}o`], mfr: 0, ...st[`${r.rld}o`] });
  if (L.req <= 0) r.UCld = 0;
  else {
    const rho0 = Math.sqrt(mt.fck) / 1000, rho = L.req / (1000 * L.d);
    r.rho = rho;
    r.ldb = rho <= rho0
      ? r.K * (11 + 1.5 * Math.sqrt(mt.fck) * (rho0 / rho) + 3.2 * Math.sqrt(mt.fck) * (rho0 / rho - 1) ** 1.5)
      : r.K * (11 + 1.5 * Math.sqrt(mt.fck) * (rho0 / rho));
    const fw = v.wanden === 1 && r.lld > r.lw ? r.lw / r.lld : 1;
    r.ldg = r.ldb * (L.as / L.req) * fw;
    r.ld = (r.lld * 1000) / L.d;
    r.UCld = r.ld / r.ldg;
  }
  r.UCh = 80 / h;
  r.UCmax = Math.max(...Object.values(r.lagen).map((x) => x.UC), r.UCverd, r.UC941, r.UCld, r.UCh);
  return r;
}

function consoleUit(v) {
  const r = { soort: "console" };
  const { fck, fcd, fyd, fctm } = materiaal(v);
  const b = v.b_con, h = v.h_con, a = v.a_con, F = v.F_Ed * 1e3;
  r.A = (v.n_hfd * Math.PI * v.ds_hfd ** 2) / 4;
  r.Alnk = (v.n_bgl * 2 * Math.PI * v.ds_bgl ** 2) / 4;
  r.d = h - v.c_con - v.ds_bgl - v.ds_hfd / 2;
  r.lbcon = v.l_con - v.c_con - (a - v.l_opl / 2);
  r.geldig = b > 0 && h > 0 && a > 0 && v.l_opl > 0 && v.b_opl > 0 && v.b_opl <= b && v.h_opl >= 0 && v.c_con >= 0 &&
    v.n_hfd >= 1 && v.ds_hfd > 0 && v.ds_bgl >= 0 && v.n_bgl >= 0 && r.d > 0 && a + v.l_opl / 2 < v.l_con - v.c_con && F > 0;
  if (!r.geldig) return r;
  const nu = 1 - fck / 250, s1 = nu * fcd, s2 = 0.85 * nu * fcd;
  const H = Math.max(v.H_Ed * 1e3, 0.2 * F), aH = h - r.d + v.h_opl;
  Object.assign(r, { s1, s2, H, aH });
  // Vaste punt: z = d − y0/2 met y0 = M0/(z·b·σ1) en a_eff = max(a_c; z/2,5).
  const Mvan = (ae) => F * ae + H * aH;
  if (Mvan(a) > 0.5 * b * s1 * r.d ** 2) { r.UCN2 = Mvan(a) / (0.5 * b * s1 * r.d ** 2); r.gestopt = true; r.UCmax = r.UCN2; return r; }
  let z = r.d;
  for (let i = 0; i < 500; i++) z = r.d - Mvan(Math.max(a, z / 2.5)) / (2 * z * b * s1);
  r.aeff = Math.max(a, z / 2.5); r.M0 = Mvan(r.aeff); r.z = z;
  r.UCN2 = r.M0 / (0.5 * b * s1 * r.d ** 2);
  r.tan = z / a; r.y0 = 2 * (r.d - z);
  if (r.tan < 1) { r.geenConsole = true; return r; }
  r.Ftd = r.M0 / z + H; r.UCT = r.Ftd / (r.A * fyd);
  r.sopl = F / (v.l_opl * v.b_opl); r.UCN1 = r.sopl / s2;
  const Ch = r.Ftd - H, C = Math.hypot(F, Ch);
  r.a2 = (v.l_opl * F) / C + 2 * (h - r.d) * (Ch / C); r.C = C;
  r.sdiag = C / (v.b_opl * r.a2); r.UCN1d = r.sdiag / s2;
  if (a <= 0.5 * h) r.Amin = 0.25 * r.A;
  else {
    const k = Math.min(1 + Math.sqrt(200 / r.d), 2), rho = Math.min(r.A / (b * r.d), 0.02);
    const vc = Math.max((0.18 / 1.5) * k * (100 * rho * fck) ** (1 / 3), 0.035 * k ** 1.5 * Math.sqrt(fck));
    r.VRdc = Math.max((vc - (0.15 * H) / (b * h)) * b * r.d, 0);
    r.Amin = F > r.VRdc ? (0.5 * F) / fyd : 0;
  }
  r.UCbgl = r.Amin <= 0 ? 0 : r.Amin / r.Alnk;
  const eta1 = v.aanhechting === 1 ? 1 : 0.7, eta2 = v.ds_hfd <= 32 ? 1 : (132 - v.ds_hfd) / 100;
  r.fbd = 2.25 * eta1 * eta2 * ((0.7 * fctm) / 1.5);
  r.ssd = Math.min(r.Ftd / r.A, fyd);
  r.lbrqd = ((v.ds_hfd / 4) * r.ssd) / r.fbd;
  const a1 = v.staafvorm === 2 && v.c_con > 3 * v.ds_hfd ? 0.7 : 1, a4 = v.staafvorm === 3 ? 0.7 : 1;
  r.lbmin = Math.max(0.3 * r.lbrqd, 10 * v.ds_hfd, 100);
  r.lbd = Math.max(a1 * a4 * r.lbrqd, r.lbmin);
  r.UCvk = v.l_bkol > 0 ? r.lbd / v.l_bkol : Infinity;
  r.UCvc = r.lbd / r.lbcon;
  r.UCmax = Math.max(r.UCT, r.UCN1, r.UCN1d, r.UCN2, r.UCbgl, r.UCvk, r.UCvc);
  return r;
}

// ── Van de uitwerking naar de namen in het blad ─────────────────────────────
const s4 = (x) => String(Number(x.toPrecision(4)));
const ruim = (x) => ({ waarde: s4(x), tol: Math.max(Math.abs(x) * 0.001, 1e-6) });

function verwachtingen(r) {
  const uit = {};
  if (r.soort === "plaat") {
    for (const [k, x] of Object.entries(r.M)) if (x !== 0 || r.lagen[k]) uit[`m_Ed_${k}`] = ruim(x / 1e6);
    if (r.α) for (const [k, a] of Object.entries(r.α)) Object.assign(uit, { [`α_${k}_c`]: ruim(a.c), [`α_${k}_s`]: ruim(a.s) });
    for (const [k, L] of Object.entries(r.lagen)) {
      Object.assign(uit, {
        [`d_pl_${k}`]: ruim(L.d), [`a_s_${k}`]: ruim(L.as), [`x_u_${k}`]: ruim(L.xu), [`m_Rd_${k}`]: ruim(L.mRd),
        [`UC_M_${k}`]: ruim(L.UCM), [`a_s_min_${k}`]: ruim(L.min), [`UC_min_${k}`]: ruim(L.UCmin), [`UC_s_${k}`]: ruim(L.UCs),
        [`UC_pl_${k}`]: ruim(L.UC),
      });
      if (Number.isFinite(L.req)) uit[`a_s_req_${k}`] = ruim(L.req);
      if (L.wk !== undefined) Object.assign(uit, { [`σ_s_${k}`]: ruim(L.sig), [`s_r_max_${k}`]: ruim(L.sr), [`w_k_${k}`]: ruim(L.wk), [`UC_w_${k}`]: ruim(L.UCw) });
    }
    if (!r.hoofdY) uit.UC_verd = ruim(r.UCverd);
    if (r.At) Object.assign(uit, { A_t_x: ruim(r.At.x), A_bx: ruim(r.Aband.x), A_t_y: ruim(r.At.y), A_by: ruim(r.Aband.y), UC_941: ruim(r.UC941) });
    if (r.UCld > 0) Object.assign(uit, { K_ld: ruim(r.K), ρ_ld: ruim(r.rho), ld_basis: ruim(r.ldb), ld_grens: ruim(r.ldg), ld: ruim(r.ld), UC_ld: ruim(r.UCld) });
  } else {
    Object.assign(uit, { d_con: ruim(r.d), UC_N2: ruim(r.UCN2) });
    if (!r.gestopt) Object.assign(uit, { z_0: ruim(r.z), tan_θ: ruim(r.tan), y_0: ruim(r.y0), M_0: ruim(r.M0 / 1e6) });
    if (r.UCT !== undefined) {
      Object.assign(uit, {
        H_Ed_r: ruim(r.H / 1e3), F_td: ruim(r.Ftd / 1e3), UC_T: ruim(r.UCT), σ_opl: ruim(r.sopl), a_2: ruim(r.a2), C_d: ruim(r.C / 1e3),
        σ_diag: ruim(r.sdiag), UC_N1: ruim(r.UCN1), UC_N1d: ruim(r.UCN1d), UC_bgl: ruim(r.UCbgl), f_bd: ruim(r.fbd),
        σ_sd: ruim(r.ssd), l_b_rqd: ruim(r.lbrqd), l_b_min: ruim(r.lbmin), l_bd: ruim(r.lbd), UC_vk: ruim(r.UCvk), UC_vc: ruim(r.UCvc),
      });
      if (r.Amin > 0) uit.A_lnk_min = ruim(r.Amin);
      if (r.VRdc !== undefined) uit.V_Rd_c = ruim(r.VRdc / 1e3);
    }
  }
  if (r.UCmax !== undefined && !r.geenConsole) uit.UC_max = ruim(r.UCmax);
  // Een oneindige UC (weerstand of wapening nul) staat niet als getal in het blad.
  return Object.fromEntries(Object.entries(uit).filter(([, w]) => Number.isFinite(Number(w.waarde))));
}

/** Het oordeel zoals de rapportkop het leest: de laatste slotzin "Maatgevende UC … → …". */
function slotzin(text) {
  const i = text.lastIndexOf("Maatgevende UC");
  if (i < 0) return null;
  const zin = text.slice(i, i + 240);
  return { voldoet: !/voldoe[nt] niet/.test(zin) && /voldoe[nt]/.test(zin), zin };
}

// ── Sets ────────────────────────────────────────────────────────────────────
/*
 * ── Handberekening, set 1 (standaard) ───────────────────────────────────────
 * Tweezijdig dragend, l_x = 4,5 m (kort), l_y = 6 m, rand x = l_x doorgaand, de rest vrij opgelegd;
 * h = 200, c = 25, C30/37: f_cd = 20, f_yd = 434,8, f_ctm = 2,896 N/mm². g_Ed = 7,5, q_Ed = 3,75 kN/m².
 * Geval met de doorgaande rand ingeklemd: één rand langs de lange zijde → k_c = 3·1 + 0 + 1 = 4;
 * met de doorgaande rand vrij opgelegd k_s = 1. ε = 6/4,5 = 1,333, tussen de kolommen 1,3 en 1,4 (t = 1/3):
 *   α_xo,c = 0,05222 + (0,05539 − 0,05222)/3 = 0,05328;  α_xo,s = 0,06614 + (0,07252 − 0,06614)/3 = 0,06827;
 *   α_yo,c = 0,03548;  α_yo,s = 0,04872;  α_xb,c = 0,1032 + 0,0044/3 = 0,1047;  α_xb,s = 0,04632;
 *   α_yb,c = 0,03434;  α_yb,s = 0,04632.
 *   m_Ed,xo = (0,05328·(7,5 + 1,875) + 0,06827·1,875)·4,5² = 0,6275·20,25 = 12,71 kNm per m;
 *   m_Ed,yo = (0,03548·9,375 + 0,04872·1,875)·20,25 = 8,586 kNm;
 *   m_Ed,xb = max(0,1047·11,25; 0,1047·9,375 + 0,04632·1,875)·20,25 = 1,1775·20,25 = 23,84 kNm;
 *   m_Ed,yb = max(0,3864; 0,3220 + 0,0869)·20,25 = 0,4088·20,25 = 8,279 kNm (de hoekwringing telt).
 * Onder x, Ø10-150: d = 200 − 25 − 5 = 170 mm, a_s = 523,6 mm²; x_u = 523,6·434,8/(0,8·20·1000) = 14,23 mm
 *   (vloeit: x_lim = 0,617·170); m_Rd = 523,6·434,8·(170 − 0,4·14,23) = 37,41 kNm → UC = 0,3397.
 *   Nodig: μ = 12,71·10⁶/(20·1000·170²) = 0,02199 → y = 170·(1 − √(1 − 2μ)) = 3,779 mm → 173,8 mm².
 *   W·f_ctm = 1000·200²/6·2,896 = 19,31 kNm → μ = 0,03341 → 265,8 mm²; 1,25 × 173,8 = 217,3 → A_s,min = 217,3
 *   → UC = 0,415. s_max = min(2·200; 250) = 250 → 150/250 = 0,6.
 * Boven x, Ø10-150 (d = 170): UC_M = 23,84/37,41 = 0,6375, maatgevend.
 * Doorbuiging: K = 1,3 (één doorgaande rand langs de korte overspanning), ρ = 173,8/(1000·170) = 0,001023,
 *   ρ_0 = √30/1000 = 0,005477 ≥ ρ → (7.16a): 1,3·(11 + 1,5·5,477·5,356 + 3,2·5,477·4,356^1,5) = 278,7;
 *   (7.17): 523,6/173,8 = 3,012 → 839,4 tegen l/d = 4500/170 = 26,47 → UC = 0,03154.
 */
const HAND_1 = {
  α_xo_c: "0.05328", α_xo_s: "0.06827", α_yo_c: "0.03548", α_yo_s: "0.04872", α_xb_c: "0.1047", α_xb_s: "0.04632", α_yb_c: "0.03434", α_yb_s: "0.04632",
  m_Ed_xo: "12.71", m_Ed_yo: "8.586", m_Ed_xb: "23.84", m_Ed_yb: "8.279",
  d_pl_xo: "170", a_s_xo: "523.6", x_u_xo: "14.23", m_Rd_xo: "37.41", UC_M_xo: "0.3397", a_s_req_xo: "173.8", a_s_min1_xo: "265.8", a_s_min_xo: "217.3", UC_min_xo: "0.415", UC_s_xo: "0.6",
  UC_M_xb: "0.6375", K_ld: "1.3", ld_basis: "278.7", f_ld: "3.012", ld_grens: "839.4", ld: "26.47", UC_ld: "0.03154", UC_max: "0.6375",
};

/*
 * ── Handberekening, set 2: scheurwijdte ─────────────────────────────────────
 * Vierkant 6 × 6 m, alle randen vrij opgelegd (k = 1, geen splitsing), h = 180; onder x Ø12-150.
 *   m_Ed,xo = 0,0442·11,25·36 = 17,90 kNm; boven in de hoeken 0,03712·11,25·36 = 15,03 kNm.
 *   BGT: m_fr = 0,0442·(8 + 3)·36 = 17,50 kNm > W·f_ctm = 1000·180²/6·2,896 = 15,64 kNm: gescheurd.
 *   d = 180 − 25 − 6 = 149 mm, a_s = 754,0 mm², α_L = 6,091·(1 + 2) = 18,27 → α·a_s = 13 777 mm²;
 *   500·x² + 13 777·x − 13 777·149 = 0 → x = 51,76 mm; σ_s = 17,50·10⁶/(754,0·(149 − 17,25)) = 176,2 N/mm².
 *   h_c,ef = min(2,5·31; 128,24/3; 90) = 42,75 mm → ρ_p,eff = 754,0/42 750 = 0,01764.
 *   150 ≤ 5·(25 + 6) = 155 → (7.11): 3,4·25 + 0,8·0,5·0,425·12/0,01764 = 200,7 mm (≤ 26·12).
 *   (7.9): (176,2 − 0,4·2,896/0,01764·1,107)/200 000 = 5,17·10⁻⁴ < 0,6·176,2/200 000 = 5,29·10⁻⁴
 *   → w_k = 200,7·5,286·10⁻⁴ = 0,1061 mm → UC = 0,1061/0,4 = 0,2652.
 */
const HAND_2 = {
  m_Ed_xo: "17.9", m_Ed_xb: "15.03", d_pl_xo: "149", a_s_xo: "754", x_fr_xo: "51.76", σ_s_xo: "176.2", ρ_p_eff_xo: "0.01764",
  s_r_max_xo: "200.7", w_k_xo: "0.1061", UC_w_xo: "0.2652",
};

/*
 * ── Handberekening, set 6: eenzijdig dragend ────────────────────────────────
 * l = 5 m, doorgaand bij x = 0, ingeklemd bij x = l_x: met de doorgaande rand ingeklemd twee
 * ingeklemde einden (pl²/24), met de doorgaande rand vrij opgelegd één (9pl²/128).
 *   m_Ed,xo = (9,375/24 + 9/128·1,875)·25 = (0,3906 + 0,1318)·25 = 13,06 kNm;
 *   m_Ed,xb = 11,25·25/12 = 23,44 kNm → UC_M = 23,44/37,41 = 0,6266.
 *   Verdeelwapening Ø8-150 = 335,1 mm² ≥ 0,2·523,6 = 104,7 (UC 0,3125); s_max = 3h ≤ 400 mm voor
 *   verdeelwapening in het gebied met het grootste moment (NB bij 9.3.1.1(3)) → 150/400 = 0,375.
 *   K = 1,5 (twee doorgaande of ingeklemde einden); nodig 178,8 mm² → ρ = 0,001052 → (7.16a) 307,7,
 *   × 523,6/178,8 = 2,929 → 901,3 tegen 5000/170 = 29,41.
 */
const HAND_6 = {
  β_f_c: "0.04167", β_f_s: "0.07031", β_s: "0.08333", m_Ed_xo: "13.06", m_Ed_xb: "23.44", UC_M_xb: "0.6266", UC_verd: "0.375",
  a_s_req_xo: "178.8", K_ld: "1.5", ld_basis: "307.7", ld_grens: "901.3", ld: "29.41",
};

/*
 * ── Handberekening, set 8: vlakke plaat ─────────────────────────────────────
 * Kolomafstanden 6 m (x) en 7,2 m (y), h = 250. In x één doorgaande rand, in y twee.
 *   M_x,neg = (7,5 + 3,75)·6²·7,2/8 = 364,5 kNm; M_x,pos = (9/128·9,375 + 1/8·1,875)·36·7,2 = 231,6 kNm;
 *   M_y,neg = 11,25·7,2²·6/12 = 291,6 kNm; M_y,pos = (9,375/24 + 1,875/8)·51,84·6 = 194,4 kNm.
 *   Kolomstrook 0,5·6 = 3 m; k_neg = 0,75, k_pos = 0,6:
 *   m_xb = 0,75·364,5/3 = 91,13; m_xm = 0,25·364,5/4,2 = 21,70; m_yb = 0,75·291,6/3 = 72,90;
 *   m_ym = 0,25·291,6/3 = 24,30; m_xo = max(0,6/3; 0,4/4,2)·231,6 = 46,32; m_yo = 0,2·194,4 = 38,88 kNm per m.
 *   9.4.1(2): A_t,x voor 364,5/7,2 = 50,63 kNm per m met d = 217: μ = 0,05375 → 551,8 mm² per m
 *   → A_t,x = 3973 mm²; strook 0,25·7,2 = 1,8 m met Ø16-125 (1608 mm² per m) → 2895 mm² ≥ 0,5·3973.
 *   A_t,y voor 291,6/6 = 48,6 kNm per m met d = 203: μ = 0,05897 → 567,9 → 3407 mm²; strook 1,5 m met
 *   Ø12-100 → 1696 mm² < 0,5·3407 = 1704 → UC = 1,004: voldoet niet.
 */
const HAND_8 = {
  M_x_neg: "364.5", M_x_pos: "231.6", M_y_neg: "291.6", M_y_pos: "194.4", b_k: "3",
  m_Ed_xb: "91.13", m_Ed_xm: "21.7", m_Ed_yb: "72.9", m_Ed_ym: "24.3", m_Ed_xo: "46.32", m_Ed_yo: "38.88",
  A_t_x: "3973", A_bx: "2895", A_t_y: "3407", A_by: "1696", UC_941: "1.004", UC_max: "1.004",
};

/*
 * ── Handberekening, set 12: console ─────────────────────────────────────────
 * b = 300, h_c = 400, a_c = 150, oplegplaat 120 × 200 op 20 mm; F_Ed = 250 kN, H_Ed = 0; 3Ø16, beugels 3 × Ø10.
 *   d = 400 − 30 − 10 − 8 = 352 mm; ν' = 0,88 → σ_Rd,1 = 17,6, σ_Rd,2 = 0,85·17,6 = 14,96 N/mm².
 *   H_Ed = 0,2·250 = 50 kN op a_H = 400 − 352 + 20 = 68 mm boven de trekband.
 *   M_0 = 250·0,150 + 50·0,068 = 40,9 kNm → UC = 40,9/(0,5·300·17,6·352²) = 0,125.
 *   z_0 = 176 + √(176² − 40,9·10⁶/(2·300·17,6)) = 176 + √27 103 = 340,6 mm; tan θ = 2,271 (≤ 2,5);
 *   y_0 = 2·(352 − 340,6) = 22,74 mm.
 *   F_td = 40,9·10⁶/340,6 + 50 000 = 170,1 kN → UC = 170,1/(603,2·434,8) = 0,6485.
 *   Oplegplaat 250 000/(120·200) = 10,42 N/mm² → 0,6963. Diagonaal: C_h = 120,1 kN, C = 277,3 kN,
 *   a_2 = 120·0,9014 + 96·0,4329 = 149,7 mm → 277 300/(200·149,7) = 9,261 N/mm² → 0,6191.
 *   Beugels: a_c ≤ 200 → 0,25·603,2 = 150,8 mm² tegen 3·2·78,54 = 471,2 → 0,32.
 *   Verankering: f_bd = 2,25·0,7·0,7·2,896/1,5 = 2,129; σ_sd = 170 070/603,2 = 281,9 →
 *   l_b,rqd = 16/4·281,9/2,129 = 529,8; gelaste dwarsstaaf α_4 = 0,7 → l_bd = 370,8 mm;
 *   in de kolom 400 → 0,927, in de console 500 − 30 − (150 − 60) = 380 → 0,9759: maatgevend.
 */
const HAND_12 = {
  d_con: "352", σ_Rd_1: "17.6", σ_Rd_2: "14.96", H_Ed_r: "50", a_H: "68", M_0: "40.9", UC_N2: "0.125", z_0: "340.6", tan_θ: "2.271", y_0: "22.74",
  F_td: "170.1", UC_T: "0.6485", σ_opl: "10.42", UC_N1: "0.6963", a_2: "149.7", σ_diag: "9.261", UC_N1d: "0.6191", A_lnk_min: "150.8", UC_bgl: "0.32",
  f_bd: "2.129", l_b_rqd: "529.8", l_bd: "370.8", UC_vk: "0.927", UC_vc: "0.9759", UC_max: "0.9759",
};

/*
 * ── Handberekening, set 13: verticale beugels ───────────────────────────────
 * a_c = 250 > 0,5·400, F_Ed = 200 kN → H = 40 kN; M_0 = 200·0,25 + 40·0,068 = 52,72 kNm;
 *   z_0 = 176 + √(30 976 − 52,72·10⁶/10 560) = 337,2 mm; F_td = 52,72·10⁶/337,2 + 40 000 = 196,3 kN.
 *   V_Rd,c: k = 1 + √(200/352) = 1,754; ρ = 603,2/(300·352) = 0,005712;
 *   0,12·1,754·(100·0,005712·30)^⅓ = 0,5425 N/mm² (≥ v_min 0,4453); σ_cp = −40 000/(300·400) = −0,333
 *   → (0,5425 − 0,05)·300·352 = 52,02 kN < F_Ed → verticale beugels 0,5·200 000/434,8 = 230,0 mm² → 0,4881.
 *   Goede aanhechting: f_bd = 3,041; σ_sd = 325,5 → l_b,rqd = 428,2 → l_bd = 0,7·428,2 = 299,7 mm;
 *   in de console 550 − 30 − 190 = 330 → 0,9082.
 */
const HAND_13 = { M_0: "52.72", z_0: "337.2", F_td: "196.3", V_Rd_c: "52.02", A_lnk_min: "230", UC_bgl: "0.4881", f_bd: "3.041", l_bd: "299.7", UC_vc: "0.9082" };

/*
 * ── Handberekening, set 14: steile diagonaal ────────────────────────────────
 * a_c = 60: met a_c zou z_0 = 176 + √(30 976 − 18,4·10⁶/10 560) = 347,0 > 2,5·60, dus tan θ = 2,5 en
 * a_c = z_0/2,5. Dan z_0² − (d − 0,2·F/(b·σ))·z_0 + H·a_H/(2·b·σ) = 0 met d − 50 000/5280 = 342,5:
 *   z_0 = 171,3 + √(171,3² − 50 000·68/10 560) = 341,6 mm → a_c = 136,6 mm; M_0 = 250·0,1366 + 3,4 = 37,56 kNm;
 *   F_td = 37,56·10⁶/341,6 + 50 000 = 160,0 kN.
 */
const HAND_14 = { a_c_eff: "136.6", M_0: "37.56", z_0: "341.6", F_td: "160" };

const SETS = [
  { naam: "1 — tweezijdig 4,5 × 6 m, rand x = l_x doorgaand, h = 200, C30/37 (standaard)", invoer: {}, handwerk: HAND_1 },
  { naam: "2 — vierkant 6 × 6 m, alle randen vrij opgelegd, h = 180, gescheurd in de BGT", invoer: { l_x: 6, l_y: 6, rand_x1: 0, h_pl: 180, g_fr: 8, q_fr: 3, ds_xo: 12, ds_yo: 10, ds_yb: 10 }, handwerk: HAND_2 },
  { naam: "3 — als 1, maar gedraaid: l_x = 6 m, l_y = 4,5 m, rand y = l_y doorgaand", invoer: { l_x: 6, l_y: 4.5, rand_x1: 0, rand_y1: 1, ds_xo: 8, ds_yo: 10, ds_xb: 8, ds_yb: 10, buitenlaag: 2 } },
  { naam: "4 — alle randen ingeklemd, C25/30, h = 180", invoer: { rand_x0: 2, rand_x1: 2, rand_y0: 2, rand_y1: 2, betonklasse: 25, h_pl: 180 } },
  { naam: "5 — tweezijdig 7,2 × 3 m (verhouding 2,4): strook in de korte (y-)richting", invoer: { l_x: 7.2, l_y: 3, rand_y0: 1, rand_x1: 0 } },
  { naam: "6 — eenzijdig 5 m, doorgaand bij x = 0 en ingeklemd bij x = l_x", invoer: { draagwijze: 1, l_x: 5, rand_x0: 1, rand_x1: 2 }, handwerk: HAND_6 },
  { naam: "7 — eenzijdig 3,6 m, vrij opgelegd, geen bovenwapening", invoer: { draagwijze: 1, l_x: 3.6, rand_x1: 0, h_pl: 160, ds_xo: 8, s_xo: 200, ds_yo: 6, s_yo: 250 } },
  { naam: "8 — vlakke plaat 6 × 7,2 m, h = 250, drie doorgaande randen", invoer: { constructiedeel: 2, h_pl: 250, l_x: 6, l_y: 7.2, rand_x1: 1, rand_y0: 1, rand_y1: 1, ds_xo: 12, s_xo: 150, ds_yo: 12, s_yo: 150, ds_xb: 16, s_xb: 125, ds_yb: 12, s_yb: 100, ds_xm: 10, s_xm: 200, ds_ym: 10, s_ym: 200 }, handwerk: HAND_8 },
  { naam: "9 — vlakke plaat, hoekveld, aandelen buiten tabel I.1 (begrensd)", invoer: { constructiedeel: 2, h_pl: 250, l_x: 6, l_y: 6, rand_x1: 1, rand_y1: 1, k_neg: 0.9, k_pos: 0.4, ds_xo: 12, s_xo: 150, ds_yo: 12, s_yo: 150, ds_xb: 12, s_xb: 100, ds_yb: 12, s_yb: 100 } },
  { naam: "10 — eenzijdig 7,5 m, h = 280, kwetsbare scheidingswanden (7/l_eff)", invoer: { draagwijze: 1, l_x: 7.5, rand_x1: 0, h_pl: 280, ds_xo: 16, s_xo: 150, ds_yo: 10, s_yo: 250, wanden: 1, g_Ed: 9.5, g_fr: 7.7 } },
  { naam: "11 — wijde staafafstand (7.14), kortdurend, XD", invoer: { s_xo: 250, s_yo: 250, s_xb: 250, s_yb: 250, g_fr: 9, q_fr: 3.75, belastingduur: 2, milieuklasse: 3 } },
  { naam: "12 — console standaard: a_c ≤ 0,5·h_c, horizontale beugels", invoer: { constructiedeel: 3 }, handwerk: HAND_12 },
  { naam: "13 — console a_c > 0,5·h_c: verticale beugels (J.3(3))", invoer: { constructiedeel: 3, a_con: 250, l_con: 550, F_Ed: 200, aanhechting: 1 }, handwerk: HAND_13 },
  { naam: "14 — console met een steile diagonaal: a_c = z_0/2,5", invoer: { constructiedeel: 3, a_con: 60, l_con: 350 }, handwerk: HAND_14 },
  { naam: "15 — console met H_Ed = 80 kN > 0,2·F_Ed", invoer: { constructiedeel: 3, H_Ed: 80 } },
  { naam: "16 — console: de drukzone past niet", invoer: { constructiedeel: 3, F_Ed: 1500 } },
  { naam: "17 — console met a_c ≥ z_0: geen korte console", invoer: { constructiedeel: 3, a_con: 380, l_con: 600 } },
  { naam: "18 — console, goede aanhechting en lussen met c > 3Ø (α_1 = 0,7)", invoer: { constructiedeel: 3, aanhechting: 1, staafvorm: 2, c_con: 50 } },
  { naam: "19 — console zonder beugels", invoer: { constructiedeel: 3, n_bgl: 0 } },
  // Set 20: een negatieve beschikbare lengte in de kolom (een tikfout) gaf UC_vk = l_bd/l_bkol < 0 en daarmee
  // "voldoet". Met de hand: er is geen verankeringslengte, dus l_bd/0 = ∞ → voldoet niet, zoals de narekening.
  { naam: "20 — console met een negatieve verankeringslengte in de kolom: ∞, voldoet niet", invoer: { constructiedeel: 3, l_bkol: -100 } },
];

const naarInvoer = (o) => Object.fromEntries(Object.entries(o).map(([k, x]) => [k, String(x)]));
for (const set of SETS) {
  const v = { ...STANDAARD, ...set.invoer };
  const got = reken(tpl, naarInvoer(v), PROJECT);
  const r = v.constructiedeel === 3 ? consoleUit(v) : plaat(v);
  fouten += toets(`${set.naam} — narekening`, got, verwachtingen(r));
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk);
  const oordeel = slotzin(got.text);
  const verwacht = r.geenConsole || !r.geldig ? false : r.UCmax <= 1;
  meld(oordeel !== null && oordeel.voldoet === verwacht, `oordeel: blad ${oordeel ? (oordeel.voldoet ? "voldoet" : "voldoet niet") : "geen slotzin"}, narekening ${verwacht ? "voldoet" : "voldoet niet"}`);
  meld(!/NaN|Error|Undefined|niet gedefinieerd/.test(got.text), "geen NaN of foutmelding in het blad");
}

// ── Gespiegeld: set 1 met x en y verwisseld (set 3) geeft dezelfde getallen ──
{
  console.log("\nGespiegeld: x en y verwisseld, ook de randen en de buitenste laag");
  const a = reken(tpl, naarInvoer({ ...STANDAARD, ...SETS[0].invoer }), PROJECT).values;
  const b = reken(tpl, naarInvoer({ ...STANDAARD, ...SETS[2].invoer }), PROJECT).values;
  const wissel = (k) => k.replace(/_x(o|b)$/, "_Y$1").replace(/_y(o|b)$/, "_x$1").replace(/_Y(o|b)$/, "_y$1").replace(/α_x(o|b)_/, "α_Y$1_").replace(/α_y(o|b)_/, "α_x$1_").replace(/α_Y(o|b)_/, "α_y$1_");
  const namen = Object.keys(a).filter((k) => /_(x|y)(o|b)$|^α_/.test(k));
  const anders = namen.filter((k) => a[k] !== b[wissel(k)]);
  meld(namen.length > 40 && anders.length === 0, `${namen.length} grootheden gelijk na verwisselen${anders.length ? `, anders: ${anders.slice(0, 4).map((k) => `${k} ${a[k]}/${b[wissel(k)]}`).join(", ")}` : ""}`);
  meld(a.UC_max === b.UC_max && a.UC_ld === b.UC_ld, `UC_max ${a.UC_max} en UC_ld ${a.UC_ld} gelijk`);
}

// ── Onvolledige invoer: een melding, "voldoet niet" en geen NaN ─────────────
for (const [naam, invoer] of [
  ["alle invoer 1, vloerplaat (zoals de rendercontrole)", { ...Object.fromEntries(Object.keys(STANDAARD).map((k) => [k, 1])), constructiedeel: 1 }],
  ["alle invoer 1, vlakke plaat", { ...Object.fromEntries(Object.keys(STANDAARD).map((k) => [k, 1])), constructiedeel: 2 }],
  ["alle invoer 1, console", { ...Object.fromEntries(Object.keys(STANDAARD).map((k) => [k, 1])), constructiedeel: 3 }],
  ["alle invoer 0, vloerplaat", { ...Object.fromEntries(Object.keys(STANDAARD).map((k) => [k, 0])), constructiedeel: 1, draagwijze: 2, betonklasse: 30 }],
  ["alle invoer 0, console", { ...Object.fromEntries(Object.keys(STANDAARD).map((k) => [k, 0])), constructiedeel: 3, betonklasse: 30 }],
  ["overspanning kleiner dan 5·h (geen plaat)", { ...STANDAARD, l_x: 0.9 }],
  ["staven tegen elkaar (h.o.h. = Ø)", { ...STANDAARD, s_yo: 8 }],
  ["oplegplaat voorbij het einde van de staven", { ...STANDAARD, constructiedeel: 3, a_con: 440 }],
]) {
  console.log(`\nOnvolledige invoer (${naam})`);
  const got = reken(tpl, naarInvoer(invoer), PROJECT);
  const oordeel = slotzin(got.text);
  meld(/er valt niets te toetsen/.test(got.text) && oordeel?.voldoet === false && got.values.UC_max === undefined && !/NaN/.test(got.text),
    'melding, "voldoet niet", geen UC_max en geen NaN');
}

// ── Oneindige UC: een console zonder beugels voldoet niet, met ∞ in de slotzin ─
{
  console.log("\nConsole zonder beugels: UC = ∞");
  const got = reken(tpl, naarInvoer({ ...STANDAARD, constructiedeel: 3, n_bgl: 0 }), PROJECT);
  meld(/Maatgevende UC = ∞/.test(got.text) && slotzin(got.text)?.voldoet === false, "∞ in de slotzin, voldoet niet");
}

// ── De beginwaarden van het beeld zijn de standaardinvoer van dit script ─────
{
  console.log("\nBeginwaarden van het beeld tegen de standaardinvoer");
  const tsx = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../packages/desktop/src/components/calc/BetonplaatDesigner.tsx"), "utf8");
  const blok = tsx.match(/const DEFAULTS[^{]*\{([\s\S]*?)\n\};/)[1];
  const beeld = Object.fromEntries([...blok.matchAll(/"?([\p{L}_][\p{L}\p{N}_]*)"?: (-?[\d.]+)/gu)].map((m) => [m[1], Number(m[2])]));
  const verschil = [...new Set([...Object.keys(beeld), ...Object.keys(STANDAARD)])].filter((k) => beeld[k] !== STANDAARD[k]);
  meld(verschil.length === 0, `${Object.keys(beeld).length} beginwaarden${verschil.length === 0 ? " gelijk" : `, verschil in ${verschil.join(", ")}`}`);
  const velden = [...tpl.matchAll(/^\s*([^\s='#]+)\s*=\s*\?/gmu)].map((m) => m[1].replace(/,/g, "_"));
  const keuzes = [...tpl.matchAll(/@select\s+(\S+)/g)].map((m) => m[1]);
  const mist = [...new Set([...velden, ...keuzes])].filter((k) => !(k in beeld));
  meld(mist.length === 0, `${new Set(velden).size} invoervelden en ${keuzes.length} keuzes${mist.length === 0 ? " hebben een beginwaarde" : `, zonder beginwaarde: ${mist.join(", ")}`}`);
}

afronden(fouten, "Betonplaat en console");
