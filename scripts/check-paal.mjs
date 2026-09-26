/**
 * Controlescript voor de module Paaldraagvermogen (NEN 9997-1 art. 7.6.2.3).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten daarom op twee manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript: α_p, α_s en de wrijvings-
 *      hoek uit tabel 7.c, Koppejan (7.6.2.3(e)) met de grens van 15 MPa en
 *      bij een avegaarpaal traject III ten hoogste 2 MPa, de schachtwrijving
 *      over ΔL (niet verder dan de onderkant van de lagen met negatieve kleef),
 *      ξ3 en ξ4 uit tabel A.10a of A.10b, γ_t, de variatiecoëfficiënt, en de
 *      negatieve kleef volgens 7.3.2.2(d) met de spanning over de
 *      grondwaterstand heen geïntegreerd. Het blad moet daar op vier
 *      significante cijfers mee overeenkomen.
 *   2. Voor een aantal sets de getallen van een handberekening.
 *
 * Het eindoordeel kent drie uitkomsten: voldoet niet (UC > 1), niet
 * aangetoond (VC > 12 %) en voldoet.
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
  // Positieve schachtwrijving alleen onder de lagen met negatieve kleef.
  const zDraag = v.nk === 1 ? v.z_mv - [1, 2, 3, 4, 5].slice(0, v.n_l).reduce((t, j) => t + v[`d_${j}`], 0) : v.z_kop;
  const dLmax = Math.max(Math.min(v.z_kop, zDraag) - v.z_punt, 0);
  const R = [];
  let begrensd = false, ingekort = false;
  for (let j = 1; j <= v.n_s; j++) {
    // Avegaarpaal: traject III begint met ten hoogste 2 MPa en wordt naar boven nooit hoger.
    const qIII = v.paaltype === 5 ? Math.min(v[`q_cIII_${j}`], 2) : v[`q_cIII_${j}`];
    if (qIII < v[`q_cIII_${j}`]) begrensd = true;
    const dL = Math.min(v[`ΔL_${j}`], dLmax);
    if (dL < v[`ΔL_${j}`]) ingekort = true;
    const qb = Math.min(0.5 * ap * v.β * s * ((v[`q_cI_${j}`] + v[`q_cII_${j}`]) / 2 + qIII), 15);
    const Rb = Ab * qb * 1000;
    const Rs = O * as * Math.min(v[`q_cs_${j}`], 15) * 1000 * dL;
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
  const oordeel = UC > 1 ? "voldoet niet" : VC > 0.12 ? "niet aangetoond" : "voldoet";
  return { Ab, O, Deq, R, gem, min, x3, x4, Rck, Rcd, VC, Fnk, UC, oordeel, begrensd, ingekort };
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
    naam: "3 — prefab met hoge conusweerstand (q_b,max afgetopt op 15 MPa), bovenbelasting, grondwater midden in laag 2, ΔL ingekort",
    invoer: {
      n_s: 1, q_cI_1: 32, q_cII_1: 30, q_cIII_1: 28, q_cs_1: 18, ΔL_1: 5, q_mv: 10, d_gw: 3.2,
    },
    // Met de hand: kleeflagen 2 + 3 + 5 = 10 m onder NAP −0,5 → z_draag = −10,5; punt −15 →
    // ΔL ten hoogste 4,5 m (ingevuld 5). q_b,max = min(½·0,7·(31 + 28); 15) = 15 MPa;
    // R_b = 0,0841·15 000 = 1261,5; R_s = 1,16·0,010·15 000·4,5 = 783,0 → 2044,5 kN.
    // n = 1: ξ = 1,39 → R_c;k = 1470,9; R_c;d = 1225,7 kN. UC = (450 + 174,5)/1225,7 = 0,510.
    handwerk: { ΔL_1: "4.5", R_scal_1: "783.0", R_ccal_1: "2045", R_cd: "1226", UC: "0.510" },
  },
  {
    naam: "4 — rechthoekige paal 250 × 450 (D_eq = a), s = 0,9, zes sonderingen met grote spreiding",
    invoer: {
      vorm: 3, a_p: 250, b_p: 450, s_p: 0.9, n_s: 6,
      q_cI_1: 25, q_cII_1: 22, q_cIII_1: 20, q_cs_1: 12, q_cI_2: 8, q_cII_2: 7, q_cIII_2: 6, q_cs_2: 5,
    },
  },
  {
    naam: "5 — avegaarpaal Ø 400 (in de grond gevormd, δ = φ), drie sonderingen, zandige laag met φ = 32,5°, traject III en ΔL begrensd",
    invoer: {
      paaltype: 5, vorm: 1, D: 400, n_s: 3, n_l: 4, φ_4: 32.5, d_4: 2, γ_4: 18, γ_sat_4: 20,
    },
    // Met de hand: q_c;III = 12/11/11 → 2 MPa. q_b,max = 0,28·(15 + 2) = 4,76; 0,28·(13 + 2) = 4,20;
    // 0,28·(14 + 2) = 4,48 MPa. Kleeflagen 12 m → z_draag = −12,5; ΔL = 3 → 2,5 m.
    // R_b = 0,12566·4760 = 598,2; R_s = 1,2566·0,006·10 000·2,5 = 188,5 → R_c;cal,1 = 786,7 kN;
    // R_c;cal,2 = 527,8 + 169,6 = 697,4; R_c;cal,3 = 563,0 + 169,6 = 732,6 kN.
    // n = 3: ξ3 = ξ4 = 1,30 → R_c;k = min(738,9; 697,4)/1,30 = 536,5; R_c;d = 447,1 kN.
    // UC = (450 + 158,2)/447,1 = 1,360.
    handwerk: { q_bmax_1: "4.76", q_bmax_2: "4.20", R_ccal_1: "786.7", R_ccal_2: "697.4", R_cd: "447.1", UC: "1.360" },
  },
  {
    naam: "6 — avegaarpaal Ø 400 zonder negatieve kleef: q_c;III = 12/11 MPa begrensd op 2 MPa",
    invoer: { paaltype: 5, vorm: 1, D: 400, nk: 0 },
    // Met de hand: q_b,max,1 = 0,5·0,56·((16 + 14)/2 + 2) = 4,76 MPa; R_b = 0,12566·4760 = 598,2;
    // R_s = 1,2566·0,006·10 000·3 = 226,2 → 824,4 kN. Sondering 2: 0,28·15 = 4,20 MPa →
    // 527,8 + 203,6 = 731,4 kN. n = 2: R_c;k = 731,4/1,32 = 554,1; R_c;d = 461,7 kN; UC = 450/461,7 = 0,975.
    handwerk: { q_bmax_1: "4.76", R_ccal_1: "824.4", R_ccal_2: "731.4", R_cd: "461.7", UC: "0.975" },
  },
  {
    naam: "7 — avegaarpaal met traject III al onder 2 MPa: geen begrenzing",
    invoer: { paaltype: 5, vorm: 1, D: 400, nk: 0, q_cIII_1: 1.5, q_cIII_2: 2 },
    // Met de hand: q_b,max,1 = 0,28·(15 + 1,5) = 4,62 MPa; q_b,max,2 = 0,28·(13 + 2) = 4,20 MPa.
    handwerk: { q_bmax_1: "4.62", q_bmax_2: "4.20" },
  },
  {
    naam: "8 — standaard met ΔL = 8 m: ingekort tot 4,5 m onder de kleeflagen",
    invoer: { ΔL_1: 8, ΔL_2: 8 },
    // Met de hand: R_s,1 = 1,16·0,010·10 000·4,5 = 522; R_c;cal,1 = 794,7 + 522 = 1316,7;
    // R_c;cal,2 = 0,0841·8400 + 1,16·0,010·9000·4,5 = 706,4 + 469,8 = 1176,2 kN.
    // n = 2: R_c;k = 1176,2/1,32 = 891,1; R_c;d = 742,6 kN; UC = 545,1/742,6 = 0,734.
    handwerk: { R_scal_1: "522.0", R_ccal_2: "1176", R_cd: "742.6", UC: "0.734" },
  },
  {
    naam: "9 — als set 4 met F_c;d = 300 kN: UC onder 1, maar VC boven 12 %",
    invoer: {
      vorm: 3, a_p: 250, b_p: 450, s_p: 0.9, n_s: 6, F_c_d: 300,
      q_cI_1: 25, q_cII_1: 22, q_cIII_1: 20, q_cs_1: 12, q_cI_2: 8, q_cII_2: 7, q_cIII_2: 6, q_cs_2: 5,
    },
    // Met de hand: F_nk = 1,40·0,25·328 = 114,8 kN; UC = (300 + 114,8)/562,4 = 0,738 → niet aangetoond.
    handwerk: { R_cd: "562.4", UC: "0.738" },
  },
];

/** Het eindoordeel zoals het blad het in de slotzin geeft. */
function oordeelBlad(tekst) {
  const i = tekst.lastIndexOf("Maatgevende UC");
  const zin = i < 0 ? "" : tekst.slice(i, i + 200);
  if (/voldoet niet/.test(zin)) return "voldoet niet";
  if (/niet aangetoond/.test(zin)) return "niet aangetoond";
  if (/draagvermogen \(7\.1\) voldoet/.test(zin)) return "voldoet";
  return "?";
}

let fouten = 0;
for (const set of SETS) {
  const v = { ...STANDAARD, ...set.invoer };
  const selectValues = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, selectValues);
  const r = uitwerking(v);
  fouten += toets(`${set.naam} — narekening`, got, verwachtingen(r, v));
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk);
  const oordeel = oordeelBlad(got.text);
  const ok = oordeel === r.oordeel;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    ons ${oordeel}   narekening ${r.oordeel}`);
  // Een begrenzing op traject III of ΔL meldt het blad, en alleen dan.
  for (const [wel, patroon, wat] of [
    [r.begrensd, /avegaarpaal: traject III ten hoogste 2 MPa/, "traject III begrensd op 2 MPa"],
    [r.ingekort, /ingekort tot de paallengte onder de lagen met negatieve kleef/, "ΔL ingekort"],
  ]) {
    const gemeld = patroon.test(got.text);
    if (gemeld !== wel) fouten++;
    if (wel || gemeld) console.log(`  ${gemeld === wel ? "OK    " : "FOUT  "} melding    ${wat}${wel ? "" : " (onterecht)"}`);
  }
  // Boven 12 % spreiding moet het blad waarschuwen.
  if (r.VC > 0.12) {
    const melding = /variatiecoëfficiënt is groter dan 12 %/.test(got.text);
    if (!melding) fouten++;
    console.log(`  ${melding ? "OK    " : "FOUT  "} melding    variatiecoëfficiënt ${s4(r.VC * 100)} % > 12 %`);
  }
}

afronden(fouten, "Paaldraagvermogen");
