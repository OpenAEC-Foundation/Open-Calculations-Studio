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
 *      grondwaterstand heen geïntegreerd. De schachtwrijving rekent met
 *      O_s;ΔL;gem (7.6.2.3(c)) en de negatieve kleef met O_s;gem (7.3.2.2(d));
 *      zonder andere schacht zijn dat allebei de omtrek van de paalvoet. Het
 *      blad moet daar op vier significante cijfers mee overeenkomen.
 *   2. Voor een aantal sets de getallen van een handberekening.
 *
 * Daarnaast dezelfde twee wegen voor wat later is toegevoegd: de overige
 * paaltypen van tabel 7.c, de tapse houten paal met betonopzetter (omtrek
 * lineair van de punt naar het hout bovenaan, daarboven de opzetter; per
 * sondering de gemiddelde omtrek over ΔL, per kleeflaag die van de laag), de
 * open stalen buis met onderrand en grondprop (7.6.2.3(d)), trekpalen
 * (7.6.3.3: α_t, ξ, γ_s;t = 1,35, γ_m;var;qc, en in een groep f2 en het
 * kluitgewicht) en de indicatieve kalendercontrole met de energievergelijking
 * van Hiley.
 *
 * Het eindoordeel kent drie uitkomsten: voldoet niet (UC > 1), niet
 * aangetoond (VC > 12 %, een open stalen buis waarvan de volle doorsnede een
 * grondprop veronderstelt, een andere schacht zonder ingevulde omtrek, buiten
 * de grenzen van tabel 7.c of van 7.6.3.3(a), of een UC die door lege invoer
 * niet uit te rekenen is) en voldoet. De meldingen bij een ingekorte ΔL, een
 * paalpunt in de kleeflagen, een open buis en de kalender verschijnen alleen
 * als ze gelden.
 *
 * Een bestaand blad dat naar de nieuwe tekst gaat, heeft de nieuwe velden
 * niet: de sets 1 tot en met 16 zetten ze daarom ook niet, en een aparte set
 * zet de beginwaarden van het beeld erbij en moet dan precies set 1 geven.
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

// De beginwaarden die het beeld (PaalDesigner.tsx) voor de later toegevoegde
// velden in een blad zet. Ze mogen een bestaand blad niets doen.
const NIEUWE_BEGINWAARDEN = {
  richting: 0, trekgroep: 0, kal: 0, F_t_d: 150, γ_var: 1,
  D_hout: 260, L_opz: 2, D_opz: 320, t_w: 12, L_prop: 0,
  G_blok: 40, h_val: 1, η_h: 0.7, G_paal: 30, e_r: 0.25, c_el: 10, n_25: 0,
};

// ── Onafhankelijke uitwerking; eenheden kN, m, kPa ────────────────────────
/** Tabel 7.c: [α_p, α_s, in de grond gevormd, α_t, geheid]; gepulst (16) zonder α_t. */
const TAB7C = [null,
  [0.7, 0.010, 0, 0.007, 1], [0.7, 0.014, 1, 0.012, 1], [0.7, 0.012, 1, 0.010, 1], [0.63, 0.009, 1, 0.009, 0],
  [0.56, 0.006, 1, 0.0045, 0], [0.35, 0.006, 1, 0.0045, 0], [0.70, 0.010, 0, 0.007, 1], [0.70, 0.006, 0, 0.004, 1],
  [0.56, 0.006, 0, 0.0045, 0], [0.63, 0.009, 1, 0.009, 0], [0.7, 0.010, 0, 0.007, 1], [0.7, 0.012, 0, 0.007, 1],
  // 13 houten paal taps met opzetter, 14 open stalen buis, 15 groutschil rond profiel met voetplaat,
  // 16 gepulst, 17 en 18 micropaal met boorbuis (niet / wel afgeperst), 19 met ankerbuizen, 20 met hulpbuis.
  [0.7, 0.012, 0, 0.007, 1], [0.70, 0.006, 0, 0.004, 1], [0.70, 0.014, 1, 0.012, 1], [0.35, 0.005, 0, 0, 0],
  [0.35, 0.008, 1, 0.008, 0], [0.35, 0.011, 1, 0.011, 0], [0.35, 0.008, 1, 0.008, 0], [0.35, 0.006, 1, 0.006, 0]];
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

/** Gemiddelde van f over [a, b] met de middelpuntregel; bij a = b de waarde in a. */
function gemiddelde(f, a, b, n = 4000) {
  if (b - a <= 0) return f(a);
  const h = (b - a) / n;
  let s = 0;
  for (let i = 0; i < n; i++) s += f(a + (i + 0.5) * h);
  return s / n;
}

/**
 * Rendement van de klap volgens de stoottheorie van Newton: de bewegingsenergie
 * van de paal na de stoot, plus die van het valblok zolang dat nog omlaag gaat.
 * Met een valsnelheid 1 en de energie van het blok als eenheid.
 */
function stootrendement(W, P, e) {
  const vBlok = (W - e * P) / (W + P);
  const vPaal = (W * (1 + e)) / (W + P);
  return (P * vPaal ** 2) / W + (vBlok > 0 ? vBlok ** 2 : 0);
}

function uitwerking(v) {
  // Een bestaand blad heeft de later toegevoegde keuzes niet: dan telt de eerste keuze.
  const trek = v.richting === 1;
  const groep = trek && v.trekgroep === 1;
  const [ap, as, insitu, at, geheid] = TAB7C[v.paaltype];
  const taps13 = v.paaltype === 13, open14 = v.paaltype === 14;
  const vorm = taps13 || open14 ? 1 : v.vorm;
  let Ab, O, Deq, s = 1, Ai = 0, Oi = 0, Di = 0;
  if (open14) {
    // Open buis (7.6.2.3(d)): de onderrand als punt, de grondprop apart.
    const D = v.D / 1000;
    Di = Math.max(D - (2 * v.t_w) / 1000, 0);
    Ab = (Math.PI * (D * D - Di * Di)) / 4; Ai = (Math.PI * Di * Di) / 4; O = Math.PI * D; Oi = Math.PI * Di; Deq = D;
  } else if (vorm === 1) { const D = v.D / 1000; Ab = (Math.PI * D * D) / 4; O = Math.PI * D; Deq = D; }
  else if (vorm === 2) { const a = v.a_p / 1000; Ab = a * a; O = 4 * a; Deq = Math.sqrt((4 * Ab) / Math.PI); }
  else {
    const a = v.a_p / 1000, b = v.b_p / 1000;
    Ab = a * b; O = 2 * (a + b); Deq = b > 1.5 * a ? a : Math.sqrt((4 * Ab) / Math.PI); s = v.s_p;
  }
  // Een andere schacht dan de paalvoet: O_s;ΔL;gem voor de schachtwrijving (7.6.2.3(c)),
  // O_s;gem voor de negatieve kleef (7.3.2.2(d)); niet ingevuld telt als 0.
  const anders = !taps13 && v.schacht === 1;
  const OdL = anders ? v.O_s_ΔL ?? 0 : O;
  const Ogem = anders && v.nk === 1 ? v.O_s_gem ?? 0 : O;
  const Lpaal = v.z_kop - v.z_punt;
  // Tapse houten paal: de omtrek op hoogte x boven de punt, lineair van de punt naar het
  // hout bovenaan, daarboven de opzetter (of zonder opzetter het hout bovenaan).
  const Lopz = v.L_opz ?? 0;
  const Lh = Math.max(Lpaal - Lopz, 0.001);
  const Oh = (Math.PI * (v.D_hout ?? 0)) / 1000;
  const Oo = Lopz > 0 ? (Math.PI * (v.D_opz ?? 0)) / 1000 : Oh;
  const omtrek = (x) => (x < 0 ? O : x <= Lh ? O + ((Oh - O) * x) / Lh : Oo);
  // Positieve schachtwrijving alleen onder de lagen met negatieve kleef.
  const zDraag = v.nk === 1 ? v.z_mv - [1, 2, 3, 4, 5].slice(0, v.n_l).reduce((t, j) => t + v[`d_${j}`], 0) : v.z_kop;
  // Een trekpaal in een groep: geen schachtwrijving in de bovenste meter grond (7.6.3.3(g)).
  const zMv = v.nk === 1 ? v.z_mv : v.z_kop;
  const dLmax = Math.max(Math.min(v.z_kop, zDraag, groep ? zMv - 1 : v.z_kop) - v.z_punt, 0);
  const R = [];
  let begrensd = false, ingekort = false;
  for (let j = 1; j <= v.n_s; j++) {
    const dL = Math.min(v[`ΔL_${j}`], dLmax);
    if (dL < v[`ΔL_${j}`]) ingekort = true;
    const Oj = taps13 ? gemiddelde(omtrek, 0, dL) : OdL;
    const qs = Math.min(v[`q_cs_${j}`], 15) * 1000;
    if (trek) {
      // 7.6.3.3(b): alleen schachtwrijving, met α_t.
      const Rt = Oj * at * qs * dL;
      R.push({ O: Oj, Rt, Rc: Rt });
      continue;
    }
    // Avegaarpaal: traject III begint met ten hoogste 2 MPa en wordt naar boven nooit hoger.
    const qIII = v.paaltype === 5 ? Math.min(v[`q_cIII_${j}`], 2) : v[`q_cIII_${j}`];
    if (qIII < v[`q_cIII_${j}`]) begrensd = true;
    const qb = Math.min(0.5 * ap * v.β * s * ((v[`q_cI_${j}`] + v[`q_cII_${j}`]) / 2 + qIII), 15);
    const Rb = Ab * qb * 1000;
    const Rs = Oj * as * qs * dL;
    // Grondprop: wrijving op de binnenwand over de prop, niet meer dan de volle doorsnede aan de punt.
    const Rprop = open14 ? Math.min(Oi * as * qs * Math.min(v.L_prop ?? 0, dL), Ai * qb * 1000) : 0;
    R.push({ O: Oj, qb, Rb, Rs, Rprop, Rc: Rb + Rprop + Rs });
  }
  const gem = R.reduce((s2, r) => s2 + r.Rc, 0) / R.length;
  const min = Math.min(...R.map((r) => r.Rc));
  const tab = v.stijf ? KSI.b : KSI.a;
  const x3 = ksi(tab.x3, Math.min(v.n_s, 6)), x4 = ksi(tab.x4, Math.min(v.n_s, 6));
  const Rk = Math.min(gem / x3, min / x4);
  const VC = R.length > 1 ? Math.sqrt(R.reduce((s2, r) => s2 + (r.Rc - gem) ** 2, 0) / (R.length - 1)) / gem : 0;
  let Rck, Rcd, Rtk, Rtd, gVar;
  if (trek) {
    // ξ, γ_s;t = 1,35 en γ_m;var;qc staan op q_c; R_t is lineair in q_c.
    Rtk = Rk;
    gVar = Math.min(Math.max(v.γ_var ?? 0, 1), 1.5);
    Rtd = Rtk / (1.35 * gVar);
    if (groep) Rtd = Math.min(Math.min(Math.max(v.f_2 ?? 0, 0), 1) * Rtd, v.R_tkluit_d ?? 0);
  } else {
    Rck = Rk;
    Rcd = Rck / 1.2;
  }

  // negatieve kleef: per laag ∫σ'v dz, stuk voor stuk boven en onder de grondwaterstand
  let Fnk = 0;
  const Onk = [];
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
      // Tapse paal: de gemiddelde omtrek over de laag, gemeten vanaf de punt.
      const Ol = taps13 ? gemiddelde(omtrek, v.z_mv - z - d - v.z_punt, v.z_mv - z - v.z_punt) : Ogem;
      Onk.push(Ol);
      Fnk += Ol * c * I;
      z += d;
      sigma = sB;
    }
  }
  const UC = trek ? v.F_t_d / Rtd : (v.F_c_d + Fnk) / Rcd;
  // Paaltype 8 met een ronde doorsnede is een open buis: de volle doorsnede als
  // paalpunt veronderstelt een grondprop, die het blad niet aantoont.
  const openBuis = v.paaltype === 8 && vorm === 1;
  const puntInKleef = v.nk === 1 && v.z_punt >= zDraag;
  const schachtLeeg = anders && (trek ? OdL <= 0 : Math.min(OdL, Ogem) <= 0);
  // Tapse houten paal met de omtrek van de punt: die onderschat de negatieve kleef (7.3.2.2(d)).
  const taps = v.paaltype === 12 && !anders;
  // Grenzen van tabel 7.c: voetplaat (voetnoten b en c) en schachtmiddellijn van een micropaal (d).
  const uitsteek = anders && vorm === 1 ? (v.D - (OdL / Math.PI) * 1000) / 2 : 0;
  const vpFout = (v.paaltype === 7 && uitsteek > 10) || ((v.paaltype === 2 || v.paaltype === 3) && trek && uitsteek > 25);
  const mpFout = v.paaltype >= 17 && (OdL / Math.PI) * 1000 > (v.paaltype === 19 ? 400 : 200);
  const tpFout = taps13 && (!(v.D_hout >= v.D) || Lopz >= Lpaal || Lopz < 0 || (Lopz > 0 && !(v.D_opz > 0)));
  const buisFout = open14 && (!(v.t_w > 0) || Di <= 0);
  // 7.6.3.3(a): L/D ≥ 13,5 en 7 m ≤ L ≤ 50 m.
  const trBuiten = trek && (Lpaal / Deq < 13.5 || Lpaal < 7 || Lpaal > 50);
  const gepulst = trek && v.paaltype === 16;
  let reden;
  if (trek) {
    reden = gepulst ? "gepulst" : UC > 1 ? "uc" : VC > 0.12 ? "vc" : trBuiten ? "buiten" : vpFout || mpFout || tpFout ? "tabel"
      : schachtLeeg ? "schacht" : UC <= 1 ? "voldoet" : "invoer";
  } else {
    reden = UC > 1 ? "uc" : VC > 0.12 ? "vc" : openBuis ? "openbuis" : taps && v.nk === 1 ? "taps" : schachtLeeg ? "schacht"
      : vpFout || mpFout ? "tabel" : tpFout ? "taps13" : buisFout ? "buis" : UC <= 1 ? "voldoet" : "invoer";
  }
  const oordeel = reden === "uc" ? "voldoet niet" : reden === "voldoet" ? "voldoet" : "niet aangetoond";

  // Kalendercontrole: R·(s + c/2) = η·G·h·ε, met R = (R_c;cal)_min (indicatief).
  let kal = null;
  if (!trek && geheid && v.kal === 1) {
    const E = v.η_h * v.G_blok * v.h_val;
    const eps = stootrendement(v.G_blok, v.G_paal, v.e_r);
    const smax = (E * eps) / min - v.c_el / 2000;
    kal = { E, eps, R: min, smax };
    if (smax > 0) {
      kal.n = Math.ceil(0.25 / smax - 1e-9);
      if (v.n_25 > 0) {
        kal.Rdyn = (E * eps) / (0.25 / v.n_25 + v.c_el / 2000);
        kal.haalt = v.n_25 >= kal.n;
      }
    }
  }
  return {
    trek, Ab, Ai, O, Deq, R, gem, min, x3, x4, Rck, Rcd, Rtk, Rtd, gVar, VC, Fnk, Onk, UC, oordeel, reden,
    begrensd, ingekort, openBuis, puntInKleef, taps, taps13, open14, vpFout, mpFout, tpFout, trBuiten, gepulst, kal,
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
    A_b: ruim(r.Ab), O_s: ruim(r.O), D_eq: ruim(r.Deq), ξ_3: ruim(r.x3), ξ_4: ruim(r.x4), UC: ruim(r.UC),
  };
  if (r.trek) {
    Object.assign(uit, { R_tcal_gem: ruim(r.gem), R_tcal_min: ruim(r.min), R_tk: ruim(r.Rtk), R_td: ruim(r.Rtd) });
    r.R.forEach((x, i) => { uit[`R_tcal_${i + 1}`] = ruim(x.Rt); });
  } else {
    Object.assign(uit, { R_ccal_gem: ruim(r.gem), R_ccal_min: ruim(r.min), R_ck: ruim(r.Rck), R_cd: ruim(r.Rcd) });
    r.R.forEach((x, i) => {
      uit[`q_bmax_${i + 1}`] = ruim(x.qb);
      uit[`R_ccal_${i + 1}`] = ruim(x.Rc);
      if (r.open14) uit[`R_prop_${i + 1}`] = ruim(x.Rprop);
    });
    if (r.open14) uit.A_i = ruim(r.Ai);
  }
  if (r.taps13) r.R.forEach((x, i) => { uit[`O_s_ΔL_${i + 1}`] = ruim(x.O); });
  if (r.taps13) r.Onk.forEach((o, i) => { if (v[`d_${i + 1}`] > 0) uit[`O_nk_${i + 1}`] = ruim(o); });
  if (v.n_s >= 2) uit.VC = ruim(r.VC);
  if (v.nk === 1) uit.F_nk_k = ruim(r.Fnk);
  if (r.kal) {
    Object.assign(uit, { E_n: ruim(r.kal.E), ε_k: ruim(r.kal.eps), R_kal: ruim(r.kal.R) });
    uit.s_max = ruim(r.kal.smax * 1000);
    if (r.kal.n !== undefined) uit.n_kal = { waarde: String(r.kal.n), tol: 1e-9 };
    if (r.kal.Rdyn !== undefined) uit.R_dyn = ruim(r.kal.Rdyn);
  }
  // Zonder weerstand (een gepulste paal op trek) is de UC oneindig en de VC 0/0: niets na te rekenen.
  for (const [k, w] of Object.entries(uit)) if (!Number.isFinite(parseFloat(w.waarde))) delete uit[k];
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
    // Zo'n 1,5 MPa is bijvoorbeeld de omhullende van een traject III met onderaan 5 en bovenaan
    // 1 MPa: begin met 2, daarboven 1 (7.6.2.3(e)). Het ongecorrigeerde gemiddelde 3 MPa zou het
    // blad afkappen op 2 (4,76 MPa, set 6): de afkapping is een bovengrens, geen omhullende.
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
  {
    naam: "10 — standaard met de paalpunt op NAP −10, in de kleeflagen: melding en geen positieve schachtwrijving",
    invoer: { z_punt: -10 },
    // Met de hand: z_draag = −0,5 − 10 = −10,5 m ligt onder de punt → ΔL = max(−10,5 + 10; 0) = 0.
    // R_c;cal,1 = 0,0841·9450 = 794,7; R_c;cal,2 = 0,0841·8400 = 706,4 kN. n = 2: R_c;k = 706,4/1,32 = 535,2;
    // R_c;d = 446,0 kN. F_nk telt alle kleeflagen (veilige kant): UC = (450 + 95,1)/446,0 = 1,222.
    handwerk: { R_scal_1: "0", R_ccal_1: "794.7", R_ccal_2: "706.4", R_cd: "446.0", UC: "1.222" },
  },
  {
    naam: "11 — paaltype 8 met ronde doorsnede Ø 324 (open buis), geen negatieve kleef: niet aangetoond",
    invoer: { paaltype: 8, vorm: 1, D: 324, nk: 0 },
    // Met de hand: A_b = π/4·0,324² = 0,08245 m²; O_s = 1,0179 m; α_s = 0,006.
    // R_c;cal,1 = 0,082448·9450 + 1,01788·0,006·10 000·3 = 779,13 + 183,22 = 962,35 ≈ 962,4 kN;
    // R_c;cal,2 = 0,08245·8400 + 1,0179·0,006·9000·3 = 692,6 + 164,9 = 857,5 kN.
    // n = 2: R_c;k = 857,5/1,32 = 649,6; R_c;d = 541,3 kN; UC = 450/541,3 = 0,831 → niet aangetoond (grondprop).
    handwerk: { R_ccal_1: "962.4", R_ccal_2: "857.5", R_cd: "541.3", UC: "0.831" },
  },
  {
    naam: "12 — geen negatieve kleef, ΔL = 20 m bij een paal van 14 m: ingekort tot de paallengte",
    invoer: { nk: 0, ΔL_1: 20, ΔL_2: 20 },
    // Met de hand: ΔL = z_kop − z_punt = −1 + 15 = 14 m. R_s,1 = 1,16·0,010·10 000·14 = 1624,0 →
    // R_c;cal,1 = 794,7 + 1624,0 = 2418,7; R_c;cal,2 = 706,4 + 1,16·0,010·9000·14 = 706,4 + 1461,6 = 2168,0 kN.
    // n = 2: R_c;k = min(2293,4/1,32; 2168,0/1,32) = min(1737,4; 1642,4) = 1642,4; R_c;d = 1368,7 kN;
    // UC = 450/1368,7 = 0,329.
    handwerk: { ΔL_1: "14.0", R_scal_1: "1624", R_ccal_2: "2168", R_cd: "1369", UC: "0.329" },
  },
  {
    naam: "13 — tapse houten paal, punt Ø 180, andere schacht: O_s;ΔL;gem = 0,6 m, O_s;gem = 0,8 m in de kleeflagen",
    invoer: { paaltype: 12, vorm: 1, D: 180, schacht: 1, O_s_ΔL: 0.6, O_s_gem: 0.8, F_c_d: 180 },
    // Met de hand: A_b = π/4·0,18² = 0,02545 m²; α_s = 0,012. R_b,1 = 0,02545·9450 = 240,5;
    // R_s,1 = 0,6·0,012·10 000·3 = 216,0 → 456,5 kN; R_b,2 = 0,02545·8400 = 213,8;
    // R_s,2 = 0,6·0,012·9000·3 = 194,4 → 408,2 kN. n = 2: R_c;k = 408,2/1,32 = 309,2; R_c;d = 257,7 kN.
    // F_nk = 0,8·0,25·328 = 65,6 kN (met de omtrek van de punt, π·0,18 = 0,565 m, was het 46,4 kN).
    // UC = (180 + 65,6)/257,7 = 0,953.
    handwerk: { R_scal_1: "216.0", R_ccal_1: "456.5", R_ccal_2: "408.2", R_cd: "257.7", F_nk_k: "65.60", UC: "0.953" },
  },
  {
    naam: "14 — in de grond gevormd (mantelbuis getrild), voetplaat Ø 460 op buis Ø 406: schacht met de omtrek van de buis",
    invoer: { paaltype: 3, vorm: 1, D: 460, schacht: 1, O_s_ΔL: 1.2755, O_s_gem: 1.2755 },
    // Met de hand: A_b = π/4·0,46² = 0,16619 m²; O = π·0,406 = 1,2755 m; α_s = 0,012; δ = φ.
    // R_b,1 = 0,16619·9450 = 1570,5; R_s,1 = 1,2755·0,012·10 000·3 = 459,2 → 2029,7 kN;
    // R_b,2 = 1396,0; R_s,2 = 1,2755·0,012·9000·3 = 413,3 → 1809,3 kN. R_c;k = 1809,3/1,32 = 1370,7;
    // R_c;d = 1142,2 kN. c_nk = K0·tan φ: 0,6173·0,4142 = 0,2557 (laag 1 en 3), 0,1986 → 0,25 (laag 2);
    // F_nk = 1,2755·(0,2557·29 + 0,25·76,5 + 0,2557·222,5) = 1,2755·83,43 = 106,4 kN
    // (met de voetplaat, π·0,46 = 1,445 m: 120,6 kN). UC = (450 + 106,4)/1142,2 = 0,487.
    handwerk: { R_scal_1: "459.2", R_ccal_1: "2030", R_ccal_2: "1809", R_cd: "1142", F_nk_k: "106.4", UC: "0.487" },
  },
  {
    naam: "15 — andere schacht, omtrek in de kleeflagen niet ingevuld: niet aangetoond",
    invoer: { schacht: 1, O_s_ΔL: 1.16 },
    // Met de hand: O_s;gem = 0 → F_nk = 0 en UC = 450/643,7 = 0,699; zonder omtrek zegt het blad
    // "niet aangetoond", niet "voldoet".
    handwerk: { R_cd: "643.7", UC: "0.699" },
  },
  {
    naam: "16 — tapse houten paal, punt Ø 180, met negatieve kleef en de omtrek van de punt: niet aangetoond",
    invoer: { paaltype: 12, vorm: 1, D: 180, F_c_d: 180 },
    // Met de hand: F_nk = π·0,18·0,25·328 = 46,4 kN met de omtrek van de punt; met de schacht van
    // set 13 (0,8 m) is het 65,6 kN. R_c;d = 250,6 kN (narekening), UC = (180 + 46,4)/250,6 = 0,903:
    // onder 1, maar het oordeel is "niet aangetoond", niet "voldoet".
    handwerk: { F_nk_k: "46.37", UC: "0.903" },
  },
  {
    naam: "17 — tapse houten paal Ø140/Ø210 met betonopzetter Ø280 over 2 m, negatieve kleef in drie lagen",
    invoer: {
      paaltype: 13, D: 140, D_hout: 210, L_opz: 2, D_opz: 280, z_kop: -0.5, z_punt: -14,
      q_cI_1: 12, q_cII_1: 11, q_cIII_1: 9, q_cs_1: 8, q_cI_2: 11, q_cII_2: 10, q_cIII_2: 8, q_cs_2: 7,
      z_mv: -0.5, d_gw: 1, n_l: 3, d_1: 2, γ_1: 17, γ_sat_1: 19, φ_1: 30, d_2: 3, γ_2: 11, γ_sat_2: 11, φ_2: 15,
      d_3: 3, γ_3: 16, γ_sat_3: 16, φ_3: 22.5, F_c_d: 90,
    },
    // Met de hand: A_b = π/4·0,14² = 0,01539 m². q_b,max,1 = ½·0,7·(11,5 + 9) = 7,175 MPa → R_b,1 = 110,5 kN;
    // q_b,max,2 = 0,35·(10,5 + 8) = 6,475 MPa → 99,7 kN. Het hout verloopt over L_h = 13,5 − 2 = 11,5 m van
    // Ø140 naar Ø210: 3 m boven de punt Ø158,3, over ΔL gemiddeld Ø149,1 → O = 0,4685 m.
    // R_s,1 = 0,4685·0,012·8000·3 = 134,9; R_s,2 = 0,4685·0,012·7000·3 = 118,1 → R_c;cal = 245,4 en 217,7 kN.
    // ξ = 1,32 → R_c;k = min(231,6; 217,7)/1,32 = 164,95; R_c;d = 137,46 kN.
    // Negatieve kleef, c = 0,25 in alle lagen: laag 1 ligt geheel naast de opzetter, π·0,28 = 0,8796 m,
    // ∫σ'v = 8,5 + 21,5 = 30 → 6,60 kN; laag 2 hout van Ø210 naar Ø191,7, gemiddeld 0,6311 m, ∫σ'v = 82,5
    // → 13,02 kN; laag 3 van Ø191,7 naar Ø173,5, 0,5737 m, ∫σ'v = 114 → 16,35 kN. F_nk = 35,96 kN (met de
    // omtrek van de punt voor het hout zou het 28,2 kN zijn). UC = (90 + 35,96)/137,46 = 0,916.
    handwerk: {
      A_b: "0.01539", q_bmax_1: "7.175", q_bmax_2: "6.475", O_s_ΔL_1: "0.4685", R_ccal_1: "245.4", R_ccal_2: "217.7",
      R_ck: "165.0", R_cd: "137.5", O_nk_1: "0.8796", O_nk_2: "0.6311", O_nk_3: "0.5737", F_nk_k: "35.96", UC: "0.916",
    },
  },
  {
    naam: "18 — tapse houten paal Ø180 aan de punt, Ø260 aan de kop, zonder opzetter, één sondering, geen negatieve kleef",
    invoer: {
      paaltype: 13, D: 180, D_hout: 260, L_opz: 0, z_kop: -1, z_punt: -13, n_s: 1,
      q_cI_1: 14, q_cII_1: 13, q_cIII_1: 11, q_cs_1: 9, ΔL_1: 4, nk: 0, F_c_d: 150,
    },
    // Met de hand: A_b = π/4·0,18² = 0,02545 m²; q_b,max = 0,35·(13,5 + 11) = 8,575 MPa → R_b = 218,2 kN.
    // Het hout verloopt over 12 m van Ø180 naar Ø260; 4 m boven de punt Ø206,7, gemiddeld Ø193,3 →
    // O = 0,6074 m; R_s = 0,6074·0,012·9000·4 = 262,4 → R_c;cal = 480,6 kN. n = 1: ξ = 1,39 →
    // R_c;k = 345,8; R_c;d = 288,1 kN; UC = 150/288,1 = 0,521.
    handwerk: { q_bmax_1: "8.575", O_s_ΔL_1: "0.6074", R_ccal_1: "480.6", R_cd: "288.1", UC: "0.521" },
  },
  {
    naam: "19 — trekpaal, alleenstaand: prefab 290 × 290, twee sonderingen; de negatieve kleef telt niet mee",
    invoer: { richting: 1, F_t_d: 100, γ_var: 1 },
    // Met de hand: α_t = 0,007; ΔL = 3 m (≤ 4,5 m onder de kleeflagen). R_t,1 = 1,16·0,007·10 000·3 = 243,6;
    // R_t,2 = 1,16·0,007·9000·3 = 219,24 kN. n = 2: ξ = 1,32 → R_t;k = min(231,42; 219,24)/1,32 = 166,09;
    // γ_s;t = 1,35, γ_m;var;qc = 1 → R_t;d = 123,03 kN. L/D = 14/0,327 = 42,8. UC = 100/123,03 = 0,813.
    handwerk: { R_tcal_1: "243.6", R_tcal_2: "219.2", R_tk: "166.1", R_td: "123.0", UC: "0.813" },
  },
  {
    naam: "20 — trekpaal in een paalgroep, stijf bouwwerk, drie sonderingen, ΔL ingekort, γ_m;var;qc = 1,2: kluitgewicht maatgevend",
    invoer: {
      richting: 1, trekgroep: 1, stijf: 1, n_s: 3, ΔL_1: 8, ΔL_2: 8, ΔL_3: 8, γ_var: 1.2, f_2: 0.8, R_tkluit_d: 120, F_t_d: 90,
    },
    // Met de hand: ΔL = 4,5 m; R_t = 1,16·0,007·4,5·q_cs = 36,54·q_cs → 365,4 / 328,86 / 328,86 kN.
    // n = 3, stijf: ξ3 = 1,18, ξ4 = 0,94 → R_t;k = min(341,04/1,18; 328,86/0,94) = min(289,0; 349,9) = 289,0.
    // f2·R_t;k/(γ_s;t·γ_m;var;qc) = 0,8·289,0/(1,35·1,2) = 142,7 > kluitgewicht 120 → R_t;d = 120 kN.
    // UC = 90/120 = 0,750.
    handwerk: { R_tcal_1: "365.4", R_tk: "289.0", R_td: "120.0", UC: "0.750" },
  },
  {
    naam: "21 — trekpaal van 6 m: buiten het toepassingsgebied van 7.6.3.3(a), niet aangetoond",
    invoer: { richting: 1, nk: 0, z_kop: -9, F_t_d: 50, γ_var: 1 },
    // Met de hand: L = −9 + 15 = 6 m < 7 m (L/D = 18,3 is wel genoeg). R_t;d als set 19: 123,03 kN; UC = 50/123,03 = 0,406.
    handwerk: { R_td: "123.0", UC: "0.406" },
  },
  {
    naam: "22 — gepulste stalen paal op trek: tabel 7.c geeft geen α_t, niet aangetoond",
    invoer: { richting: 1, paaltype: 16, vorm: 1, D: 273, nk: 0, F_t_d: 50, γ_var: 1 },
  },
  {
    naam: "23 — open stalen buis Ø508 × 12,7 met een grondprop van 2 m, geen negatieve kleef",
    invoer: { paaltype: 14, D: 508, t_w: 12.7, L_prop: 2, nk: 0, F_c_d: 300 },
    // Met de hand: D_i = 482,6 mm; A_b = π/4·(0,508² − 0,4826²) = 0,01976 m² (onderrand), A_i = 0,1829 m².
    // Sondering 1: R_b = 0,01976·9450 = 186,7; R_s = π·0,508·0,006·10 000·3 = 287,3; prop:
    // π·0,4826·0,006·10 000·2 = 181,9 < A_i·q_b = 1729 → R_c;cal,1 = 656,0 kN. Sondering 2: 166,0 + 258,5 + 163,7
    // = 588,3 kN. R_c;k = 588,3/1,32 = 445,7; R_c;d = 371,4 kN; UC = 300/371,4 = 0,808.
    handwerk: { A_b: "0.01976", A_i: "0.1829", R_prop_1: "181.9", R_ccal_1: "656.0", R_ccal_2: "588.3", R_cd: "371.4", UC: "0.808" },
  },
  {
    naam: "24 — open stalen buis Ø114,3 × 6,3 met een prop van 6 m: de wrijving binnen begrensd op A_i·q_b;max",
    invoer: { paaltype: 14, D: 114.3, t_w: 6.3, L_prop: 6, nk: 0, ΔL_1: 6, ΔL_2: 6, F_c_d: 80 },
    // Met de hand: D_i = 101,7 mm, A_i = 0,008123 m². Sondering 1: wrijving binnen π·0,1017·0,006·10 000·6 = 115,0
    // > A_i·q_b = 0,008123·9450 = 76,76 → R_prop = 76,76; R_b = 0,002138·9450 = 20,2; R_s = 129,3 → 226,2 kN.
    // Sondering 2: R_prop = 0,008123·8400 = 68,24; 18,0 + 68,2 + 116,3 = 202,5 kN. R_c;k = 202,5/1,32 = 153,4;
    // R_c;d = 127,9 kN; UC = 80/127,9 = 0,626.
    handwerk: { R_prop_1: "76.77", R_prop_2: "68.24", R_ccal_1: "226.2", R_cd: "127.9", UC: "0.626" },
  },
  {
    naam: "25 — stalen buis Ø168 met gesloten punt en voetplaat Ø178 (5 mm uitsteek), β = 0,9, negatieve kleef",
    invoer: { paaltype: 7, vorm: 1, D: 178, schacht: 1, O_s_ΔL: 0.52779, O_s_gem: 0.52779, β: 0.9, F_c_d: 150 },
    // Met de hand: A_b = π/4·0,178² = 0,02488 m². q_b,max,1 = ½·0,7·0,9·27 = 8,505 MPa → 211,6 kN;
    // R_s,1 = 0,52779·0,010·10 000·3 = 158,3 → 370,0 kN. q_b,max,2 = 0,315·24 = 7,56 → 188,1 + 142,5 = 330,6 kN.
    // R_c;k = 330,6/1,32 = 250,5; R_c;d = 208,7 kN. F_nk = 0,52779·0,25·328 = 43,28 kN (omtrek van de buis).
    // UC = (150 + 43,28)/208,7 = 0,926.
    handwerk: { q_bmax_1: "8.505", R_ccal_1: "370.0", R_ccal_2: "330.6", R_cd: "208.7", F_nk_k: "43.28", UC: "0.926" },
  },
  {
    naam: "26 — stalen buis Ø323,9 met voetplaat Ø356: 16 mm uitsteek, meer dan 10 mm (tabel 7.c, b), niet aangetoond",
    invoer: { paaltype: 7, vorm: 1, D: 356, schacht: 1, O_s_ΔL: 1.01756, O_s_gem: 1.01756, nk: 0, F_c_d: 200 },
  },
  {
    naam: "27 — micropaal met boorbuis, afgeperst, Ø150 op trek",
    invoer: { richting: 1, paaltype: 18, vorm: 1, D: 150, nk: 0, F_t_d: 70, γ_var: 1 },
    // Met de hand: α_t = 0,011; O = π·0,15 = 0,4712 m. R_t,1 = 0,4712·0,011·10 000·3 = 155,5; R_t,2 = 140,0 kN.
    // R_t;k = min(147,7; 140,0)/1,32 = 106,0; R_t;d = 78,54 kN; UC = 70/78,54 = 0,891.
    handwerk: { R_tcal_1: "155.5", R_td: "78.54", UC: "0.891" },
  },
  {
    naam: "28 — micropaal met boorbuis, niet afgeperst, Ø250: groter dan 200 mm (tabel 7.c, d), niet aangetoond",
    invoer: { paaltype: 17, vorm: 1, D: 250, nk: 0, F_c_d: 100 },
  },
  {
    naam: "29 — kalendercontrole bij de standaardpaal: valblok 40 kN, 1 m, gemeten 40 slagen per 0,25 m",
    invoer: { kal: 1, G_blok: 40, h_val: 1, η_h: 0.7, G_paal: 30, e_r: 0.25, c_el: 10, n_25: 40 },
    // Met de hand: E = 0,7·40·1 = 28 kNm; ε = (40 + 0,25²·30)/(40 + 30) = 41,875/70 = 0,5982.
    // R = (R_c;cal)_min = 1019,6 kN (set 1). s = 28·0,5982/1019,6 − 0,010/2 = 0,01643 − 0,005 = 11,43 mm per klap
    // → ten minste 250/11,43 = 21,9 → 22 slagen per 0,25 m. Gemeten 40: s = 6,25 mm →
    // R = 16,75/(0,00625 + 0,005) = 1489 kN ≥ 1019,6.
    handwerk: { E_n: "28.0", ε_k: "0.5982", R_kal: "1020", s_max: "11.43", n_kal: "22", R_dyn: "1489" },
  },
  {
    naam: "30 — kalendercontrole met een zware paal (e·G_paal > G_blok): gemeten 60 slagen, minder dan nodig",
    invoer: { kal: 1, G_blok: 20, h_val: 2, η_h: 0.8, G_paal: 100, e_r: 0.4, c_el: 10, n_25: 60 },
    // Met de hand: het valblok kaatst terug (20 < 0,4·100), dus alleen de energie van de paal:
    // ε = (20 + 0,16·100)/120 − ((20 − 40)/120)² = 0,3 − 0,0278 = 0,2722. E = 0,8·20·2 = 32 kNm.
    // s = 32·0,2722/1019,6 − 0,005 = 3,543 mm → 250/3,543 = 70,6 → 71 slagen. Gemeten 60:
    // R = 8,711/(0,004167 + 0,005) = 950,3 kN < 1019,6 → melding.
    handwerk: { ε_k: "0.2722", s_max: "3.543", n_kal: "71", R_dyn: "950.3" },
  },
  {
    naam: "31 — kalendercontrole met een te licht heiblok: 10 kN over 0,5 m",
    invoer: { kal: 1, G_blok: 10, h_val: 0.5, η_h: 0.7, G_paal: 30, e_r: 0.25, c_el: 10, n_25: 0 },
    // Met de hand: E = 3,5 kNm; ε = 11,875/40 = 0,2969; s = 3,5·0,2969/1019,6 − 0,005 = −3,981 mm < 0.
    handwerk: { s_max: "-3.981" },
  },
  {
    naam: "32 — tapse houten paal zonder opzetter op trek (set 18): voldoet niet",
    invoer: {
      richting: 1, paaltype: 13, D: 180, D_hout: 260, L_opz: 0, z_kop: -1, z_punt: -13, n_s: 1, q_cs_1: 9, ΔL_1: 4,
      nk: 0, F_t_d: 100, γ_var: 1,
    },
    // Met de hand: O over ΔL = 0,6074 m (set 18); R_t = 0,6074·0,007·9000·4 = 153,06 kN; n = 1: ξ = 1,39 →
    // R_t;k = 110,11; R_t;d = 81,57 kN; UC = 100/81,57 = 1,226.
    handwerk: { R_tcal_1: "153.1", R_td: "81.57", UC: "1.226" },
  },
  {
    naam: "33 — standaard met de beginwaarden van het beeld voor de nieuwe velden: gelijk aan set 1",
    invoer: { ...NIEUWE_BEGINWAARDEN },
    handwerk: { q_bmax_1: "9.45", R_ccal_1: "1143", R_ck: "772.5", R_cd: "643.7", F_nk_k: "95.12", UC: "0.847" },
  },
  {
    naam: "34 — als set 17, maar laag 2 loopt van de opzetter in het hout: de omtrek per laag over beide delen",
    invoer: {
      paaltype: 13, D: 140, D_hout: 210, L_opz: 2, D_opz: 280, z_kop: -0.5, z_punt: -14,
      q_cI_1: 12, q_cII_1: 11, q_cIII_1: 9, q_cs_1: 8, q_cI_2: 11, q_cII_2: 10, q_cIII_2: 8, q_cs_2: 7,
      z_mv: -0.5, d_gw: 1, n_l: 3, d_1: 1.5, γ_1: 17, γ_sat_1: 19, φ_1: 30, d_2: 3.5, γ_2: 11, γ_sat_2: 11, φ_2: 15,
      d_3: 3, γ_3: 16, γ_sat_3: 16, φ_3: 22.5, F_c_d: 90,
    },
    // Met de hand: laag 2 van NAP −2,0 tot −5,5: 0,5 m naast de opzetter (0,8796 m) en 3 m naast het hout
    // (gemiddeld 0,6311 m, als laag 2 van set 17) → (0,5·0,8796 + 3·0,6311)/3,5 = 0,6666 m.
    handwerk: { O_nk_1: "0.8796", O_nk_2: "0.6666", O_nk_3: "0.5737" },
  },
  {
    naam: "35 — tapse paal met het hout bovenaan dunner dan aan de punt: niet aangetoond",
    invoer: { paaltype: 13, D: 200, D_hout: 180, L_opz: 0, nk: 0, F_c_d: 100 },
  },
  {
    naam: "36 — trekpaal in een paalgroep zonder kleeflagen, ΔL = 14 m: niet in de bovenste meter (7.6.3.3(g))",
    invoer: { richting: 1, trekgroep: 1, nk: 0, ΔL_1: 14, ΔL_2: 14, f_2: 1, R_tkluit_d: 5000, F_t_d: 300, γ_var: 1 },
    // Met de hand: zonder kleeflagen telt de kop als maaiveld: ΔL ≤ (−1 − 1) + 15 = 13 m.
    // R_t,1 = 1,16·0,007·10 000·13 = 1055,6; R_t,2 = 1,16·0,007·9000·13 = 950,0 kN. R_t;k = min(1002,8; 950,0)/1,32
    // = 719,7; R_t;d = 719,7/1,35 = 533,1 kN (f2 = 1, kluit niet maatgevend); UC = 300/533,1 = 0,563.
    handwerk: { ΔL_1: "13.0", R_tcal_1: "1056", R_td: "533.1", UC: "0.563" },
  },
];

/** Het eindoordeel zoals het blad het in de slotzin geeft. */
function oordeelBlad(tekst) {
  const i = tekst.lastIndexOf("Maatgevende UC");
  const zin = i < 0 ? "" : tekst.slice(i, i + 200);
  if (/voldoet niet/.test(zin)) return "voldoet niet";
  if (/niet aangetoond/.test(zin)) return "niet aangetoond";
  if (/draagvermogen \(7\.1\) voldoet/.test(zin)) return "voldoet";
  if (/trekweerstand \(7\.12\) voldoet/.test(zin)) return "voldoet";
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
  // Een begrenzing op traject III of ΔL, een paalpunt in de kleeflagen, een
  // open buis, de grenzen van tabel 7.c en 7.6.3.3(a) en de uitkomst van de
  // kalender meldt het blad, en alleen dan. Zonder negatieve kleef noemt de
  // melding bij ΔL geen kleeflagen.
  for (const [wel, patroon, wat] of [
    [r.begrensd, /avegaarpaal: traject III ten hoogste 2 MPa/, "traject III begrensd op 2 MPa"],
    [r.ingekort && v.nk === 1, /ingekort tot de paallengte onder de lagen met negatieve kleef/, "ΔL ingekort onder de kleeflagen"],
    [r.ingekort && v.nk !== 1 && !(v.richting === 1 && v.trekgroep === 1), /ingekort tot de paallengte(?! onder)/, "ΔL ingekort tot de paallengte"],
    [r.ingekort && v.nk !== 1 && v.richting === 1 && v.trekgroep === 1, /ingekort tot de paallengte onder de bovenste meter/, "ΔL ingekort onder de bovenste meter (groep)"],
    [r.puntInKleef, /paalpunt ligt niet onder de lagen met negatieve kleef/, "paalpunt in de kleeflagen"],
    [r.openBuis, /Open stalen buis: de volle doorsnede/, "open buis: grondprop"],
    [r.taps, /Tapse houten paal: de omtrek van de punt/, "tapse paal: omtrek van de punt"],
    [r.reden === "schacht", /omtrek van de schacht niet ingevuld/, "omtrek van de schacht niet ingevuld"],
    [r.vpFout, /De voetplaat steekt [\d.]+ mm buiten de schacht uit/, "voetplaat steekt te ver uit"],
    [r.mpFout, /Micropaal met een schachtmiddellijn van/, "micropaal: schachtmiddellijn te groot"],
    [r.tpFout, /De maten van de tapse paal zijn onvolledig of kloppen niet/, "tapse paal: maten onvolledig"],
    [r.trBuiten, /Buiten het toepassingsgebied van 7\.6\.3\.3\(a\)/, "trek: buiten 7.6.3.3(a)"],
    [r.gepulst, /gepulste paal geen α t/, "trek: gepulste paal zonder α_t"],
    [r.kal !== null && r.kal.smax <= 0, /Het heiblok is te licht/, "kalender: heiblok te licht"],
    [r.kal?.haalt === true, /De gemeten kalender haalt het benodigde aantal slagen/, "kalender gehaald"],
    [r.kal?.haalt === false, /De gemeten kalender blijft onder het benodigde aantal slagen/, "kalender niet gehaald"],
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

// Een blad zonder invoer (zoals vlak na het invoegen, vóór het beeld de standaardwaarden
// zet) heeft n_s = 0, dus R_c;cal;gem = 0/0 en UC = NaN. Het oordeel mag dan nooit
// "voldoet" zijn; vroeger viel NaN door alle vergelijkingen heen naar "voldoet".
{
  const got = reken(tpl, {});
  const oordeel = oordeelBlad(got.text);
  const ok = oordeel === "niet aangetoond";
  if (!ok) fouten++;
  console.log(`\nLege invoer — geen uitrekenbare UC\n  ${ok ? "OK    " : "FOUT  "} oordeel    ons ${oordeel}   verwacht niet aangetoond`);
}

// De correcties op q_c (7.6.2.3(i) t/m (l)) rekent het blad niet; het zegt dat ze in de invoer zitten.
{
  const tekst = reken(tpl, Object.fromEntries(Object.entries(STANDAARD).map(([k, x]) => [k, String(x)]))).text;
  const ok = /correcties van 7\.6\.2\.3\(j\) t\/m \(l\)/.test(tekst) && /correcties op q c \(7\.6\.2\.3\(i\) t\/m \(l\)\)/.test(tekst);
  if (!ok) fouten++;
  console.log(`
Correcties op q_c
  ${ok ? "OK    " : "FOUT  "} genoemd bij de invoer en in de slotlijst`);
}

// De kalendercontrole hoort bij geheide palen op druk: bij een avegaarpaal of een trekpaal
// biedt het blad hem niet aan, ook niet als de keuze nog in het blad staat.
{
  const kal = { kal: 1, G_blok: 40, h_val: 1, η_h: 0.7, G_paal: 30, e_r: 0.25, c_el: 10, n_25: 40 };
  console.log("\nKalendercontrole alleen bij geheide palen op druk");
  for (const [wat, extra] of [["avegaarpaal", { paaltype: 5, vorm: 1, D: 400 }], ["trekpaal", { richting: 1, F_t_d: 100, γ_var: 1 }]]) {
    const v = { ...STANDAARD, ...kal, ...extra };
    const tekst = reken(tpl, Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]))).text;
    const ok = !/Kalendercontrole/.test(tekst);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} ${wat}: geen kalendercontrole`);
  }
}

afronden(fouten, "Paaldraagvermogen");
