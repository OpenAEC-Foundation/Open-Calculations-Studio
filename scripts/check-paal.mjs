/**
 * Controlescript voor de module Paaldraagvermogen (NEN 9997-1 art. 7.6.2.3).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten daarom op twee manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript: α_p, α_s en de wrijvings-
 *      hoek uit tabel 7.c, Koppejan (7.6.2.3(e)) met de grens van 15 MPa, de
 *      schachtwrijving over ΔL, ξ3 en ξ4 uit tabel A.10a of A.10b, γ_t, de
 *      variatiecoëfficiënt, en de negatieve kleef volgens 7.3.2.2(d) met de
 *      spanning over de grondwaterstand heen geïntegreerd. Het blad moet daar
 *      op vier significante cijfers mee overeenkomen.
 *   2. Voor het standaardgeval de getallen van een handberekening.
 *
 * Draaien:  node scripts/check-paal.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("paaldraagvermogen.ts");

// ── Standaardinvoer: dezelfde waarden als het parametrische beeld seedt ──────
const STANDAARD = {
  paaltype: 1, vorm: 2, D: 400, a_p: 290, b_p: 290, s_p: 1, β: 1, z_kop: -1, z_punt: -15, stijf: 0,
  n_s: 2,
  q_cI_1: 16, q_cII_1: 14, q_cIII_1: 12, q_cs_1: 10, ΔL_1: 3,
  q_cI_2: 14, q_cII_2: 12, q_cIII_2: 11, q_cs_2: 9, ΔL_2: 3,
  q_cI_3: 15, q_cII_3: 13, q_cIII_3: 11, q_cs_3: 9, ΔL_3: 3,
  q_cI_4: 15, q_cII_4: 13, q_cIII_4: 11, q_cs_4: 9, ΔL_4: 3,
  q_cI_5: 15, q_cII_5: 13, q_cIII_5: 11, q_cs_5: 9, ΔL_5: 3,
  q_cI_6: 15, q_cII_6: 13, q_cIII_6: 11, q_cs_6: 9, ΔL_6: 3,
  nk: 1, z_mv: -0.5, d_gw: 1, q_mv: 0, n_l: 3,
  d_1: 2, γ_1: 17, γ_sat_1: 17, φ_1: 22.5,
  d_2: 3, γ_2: 11, γ_sat_2: 11, φ_2: 15,
  d_3: 5, γ_3: 17, γ_sat_3: 17, φ_3: 22.5,
  d_4: 1, γ_4: 17, γ_sat_4: 17, φ_4: 22.5,
  d_5: 1, γ_5: 17, γ_sat_5: 17, φ_5: 22.5,
  F_c_d: 450,
};

// ── Onafhankelijke uitwerking; eenheden kN, m, kPa ────────────────────────
/** Tabel 7.c: [α_p, α_s, in de grond gevormd]. */
const TAB7C = [null,
  [0.7, 0.010, 0], [0.7, 0.014, 1], [0.7, 0.012, 1], [0.63, 0.009, 1], [0.56, 0.006, 1], [0.35, 0.006, 1],
  [0.70, 0.010, 0], [0.70, 0.006, 0], [0.56, 0.006, 0], [0.63, 0.009, 1], [0.7, 0.010, 0], [0.7, 0.012, 0]];
/** Tabel A.10a en A.10b, n = 1..5, 7, 10; n = 6 lineair tussen 5 en 7. */
const KSI = {
  a: { x3: [1.39, 1.32, 1.30, 1.28, 1.28, 1.27, 1.25], x4: [1.39, 1.32, 1.30, 1.03, 1.03, 1.01, 1.00] },
  b: { x3: [1.26, 1.20, 1.18, 1.17, 1.17, 1.15, 1.14], x4: [1.26, 0.96, 0.94, 0.93, 0.93, 0.92, 0.91] },
};
const NTAB = [1, 2, 3, 4, 5, 7, 10];
function ksi(rij, n) {
  const i = NTAB.findIndex((x) => x >= n);
  if (NTAB[i] === n) return rij[i];
  const t = (n - NTAB[i - 1]) / (NTAB[i] - NTAB[i - 1]);
  return rij[i - 1] + t * (rij[i] - rij[i - 1]);
}

function uitwerking(v) {
  const [ap, as, insitu] = TAB7C[v.paaltype];
  let Ab, O, Deq, s = 1;
  if (v.vorm === 1) { const D = v.D / 1000; Ab = (Math.PI * D * D) / 4; O = Math.PI * D; Deq = D; }
  else if (v.vorm === 2) { const a = v.a_p / 1000; Ab = a * a; O = 4 * a; Deq = Math.sqrt((4 * Ab) / Math.PI); }
  else {
    const a = v.a_p / 1000, b = v.b_p / 1000;
    Ab = a * b; O = 2 * (a + b); Deq = b > 1.5 * a ? a : Math.sqrt((4 * Ab) / Math.PI); s = v.s_p;
  }
  const R = [];
  for (let j = 1; j <= v.n_s; j++) {
    const qb = Math.min(0.5 * ap * v.β * s * ((v[`q_cI_${j}`] + v[`q_cII_${j}`]) / 2 + v[`q_cIII_${j}`]), 15);
    const Rb = Ab * qb * 1000;
    const Rs = O * as * Math.min(v[`q_cs_${j}`], 15) * 1000 * v[`ΔL_${j}`];
    R.push({ qb, Rb, Rs, Rc: Rb + Rs });
  }
  const gem = R.reduce((s2, r) => s2 + r.Rc, 0) / R.length;
  const min = Math.min(...R.map((r) => r.Rc));
  const tab = v.stijf ? KSI.b : KSI.a;
  const x3 = ksi(tab.x3, Math.min(v.n_s, 6)), x4 = ksi(tab.x4, Math.min(v.n_s, 6));
  const Rck = Math.min(gem / x3, min / x4);
  const Rcd = Rck / 1.2;
  const VC = R.length > 1 ? Math.sqrt(R.reduce((s2, r) => s2 + (r.Rc - gem) ** 2, 0) / (R.length - 1)) / gem : 0;

  // negatieve kleef: per laag ∫σ'v dz, stuk voor stuk boven en onder de grondwaterstand
  let Fnk = 0;
  if (v.nk === 1) {
    let z = 0, sigma = v.q_mv;
    for (let j = 1; j <= v.n_l; j++) {
      const d = v[`d_${j}`];
      const boven = Math.min(Math.max(v.d_gw - z, 0), d), onder = d - boven;
      const sM = sigma + v[`γ_${j}`] * boven;
      const sB = sM + (v[`γ_sat_${j}`] - 10) * onder;
      const I = ((sigma + sM) / 2) * boven + ((sM + sB) / 2) * onder;
      const phi = (v[`φ_${j}`] * Math.PI) / 180;
      const delta = insitu ? phi : 0.75 * phi;
      const c = Math.max((1 - Math.sin(phi)) * Math.tan(delta), 0.25);
      Fnk += O * c * I;
      z += d;
      sigma = sB;
    }
  }
  const UC = (v.F_c_d + Fnk) / Rcd;
  return { Ab, O, Deq, R, gem, min, x3, x4, Rck, Rcd, VC, Fnk, UC };
}

const s4 = (x) => {
  if (x === 0) return "0";
  const dec = Math.max(0, 3 - Math.floor(Math.log10(Math.abs(x))));
  return x.toFixed(dec);
};
const ruim = (x) => ({ waarde: s4(x), tol: Math.max(Math.abs(x) * 0.002, 1e-6) });

function verwachtingen(r, v) {
  const uit = {
    A_b: ruim(r.Ab), O_s: ruim(r.O), D_eq: ruim(r.Deq),
    R_ccal_gem: ruim(r.gem), R_ccal_min: ruim(r.min), ξ_3: ruim(r.x3), ξ_4: ruim(r.x4),
    R_ck: ruim(r.Rck), R_cd: ruim(r.Rcd), UC: ruim(r.UC),
  };
  r.R.forEach((x, i) => {
    uit[`q_bmax_${i + 1}`] = ruim(x.qb);
    uit[`R_ccal_${i + 1}`] = ruim(x.Rc);
  });
  if (v.n_s >= 2) uit.VC = ruim(r.VC);
  if (v.nk === 1) uit.F_nk_k = ruim(r.Fnk);
  return uit;
}

const SETS = [
  {
    naam: "1 — standaard: prefab beton 290 × 290, twee sonderingen, negatieve kleef in drie lagen",
    invoer: {},
    // Met de hand: q_b,max = ½·0,7·(15 + 12) = 9,45 MPa; R_b = 0,0841·9450 = 794,7;
    // R_s = 1,16·0,010·10 000·3 = 348 → 1143 kN. Sondering 2: 1020 kN. n = 2:
    // ξ3 = ξ4 = 1,32 → R_c;k = 1020/1,32 = 772,5; R_c;d = 643,7 kN.
    // Negatieve kleef: K0·tan δ < 0,25 in alle lagen → 0,25; ∫σ'v = 29 + 76,5 +
    // 222,5 = 328 kN/m → 1,16·0,25·328 = 95,1 kN. UC = (450 + 95,1)/643,7 = 0,847.
    handwerk: { q_bmax_1: "9.45", R_ccal_1: "1143", R_ck: "772.5", R_cd: "643.7", F_nk_k: "95.12", UC: "0.847" },
  },
  {
    naam: "2 — stalen buis Ø 324, gesloten punt, vier sonderingen, stijf bouwwerk, geen negatieve kleef",
    invoer: {
      paaltype: 7, vorm: 1, D: 324, n_s: 4, stijf: 1, nk: 0,
      q_cI_3: 18, q_cII_3: 17, q_cIII_3: 13, q_cs_3: 11, ΔL_3: 4, q_cI_4: 12, q_cII_4: 11, q_cIII_4: 9, q_cs_4: 8, ΔL_4: 2.5,
    },
  },
  {
    naam: "3 — prefab met hoge conusweerstand (q_b,max afgetopt op 15 MPa), bovenbelasting, grondwater midden in laag 2",
    invoer: {
      n_s: 1, q_cI_1: 32, q_cII_1: 30, q_cIII_1: 28, q_cs_1: 18, ΔL_1: 5, q_mv: 10, d_gw: 3.2,
    },
  },
  {
    naam: "4 — rechthoekige paal 250 × 450 (D_eq = a), s = 0,9, zes sonderingen met grote spreiding",
    invoer: {
      vorm: 3, a_p: 250, b_p: 450, s_p: 0.9, n_s: 6,
      q_cI_1: 25, q_cII_1: 22, q_cIII_1: 20, q_cs_1: 12, q_cI_2: 8, q_cII_2: 7, q_cIII_2: 6, q_cs_2: 5,
    },
  },
  {
    naam: "5 — avegaarpaal Ø 400 (in de grond gevormd, δ = φ), drie sonderingen, zandige laag met φ = 32,5°",
    invoer: {
      paaltype: 5, vorm: 1, D: 400, n_s: 3, n_l: 4, φ_4: 32.5, d_4: 2, γ_4: 18, γ_sat_4: 20,
    },
  },
];

let fouten = 0;
for (const set of SETS) {
  const v = { ...STANDAARD, ...set.invoer };
  const selectValues = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, selectValues);
  const r = uitwerking(v);
  fouten += toets(`${set.naam} — narekening`, got, verwachtingen(r, v));
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk);
  const voldoet = /de paal voldoet(?! niet)/.test(got.text);
  const ok = voldoet === (r.UC <= 1);
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    ons ${voldoet ? "voldoet" : "voldoet niet"}   narekening ${r.UC <= 1 ? "voldoet" : "voldoet niet"}`);
  // Boven 12 % spreiding moet het blad waarschuwen.
  if (r.VC > 0.12) {
    const melding = /variatiecoëfficiënt is groter dan 12 %/.test(got.text);
    if (!melding) fouten++;
    console.log(`  ${melding ? "OK    " : "FOUT  "} melding    variatiecoëfficiënt ${s4(r.VC * 100)} % > 12 %`);
  }
}

afronden(fouten, "Paaldraagvermogen");
