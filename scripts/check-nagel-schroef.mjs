/**
 * Controlescript voor de module Nagel- en schroefverbinding (EN 1995-1-1 H8).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten daarom op twee manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript van dezelfde normregels:
 *      stuiksterkte (8.15), (8.16), (8.20), (8.22), NB.8.1, NB.8.2 en voor de
 *      boutregels (8.31)–(8.33); vloeimoment (8.14)/(8.30); Johansen (8.6),
 *      (8.7), (8.9)–(8.11) met interpolatie tussen dunne en dikke plaat; het
 *      koordeffect met de grenzen van §8.2.2(2) en de restcapaciteit van de NB
 *      bij §8.2.2(5); axiaal (8.23)–(8.26) en (8.38)–(8.41); de groep met tabel
 *      8.1 of (8.34)/(8.35); de combinatie (8.27)/(8.28); de afstanden uit
 *      tabel 8.2, 8.4 en 8.6 en de detailleringseisen. Het blad moet daar op
 *      vier significante cijfers mee overeenkomen, en het eindoordeel moet
 *      gelijk zijn.
 *   2. Voor twee gevallen een paar getallen die met de hand zijn nagerekend,
 *      zodat een fout die in beide uitwerkingen zit niet onopgemerkt blijft.
 *
 * Draaien:  node scripts/check-nagel-schroef.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("nagelSchroefverbinding.ts");

// ── Standaardinvoer: dezelfde waarden als het parametrische beeld seedt ──────
const STANDAARD = {
  klimaat: 1, duur: 3, opbouw: 1, klasse_1: 6, klasse_2: 6, t_1: 38, t_2: 71,
  plaat: 1, ρ_pl: 420, t_s: 5,
  middel: 1, d_v: 3.4, l_v: 90, d_h: 8, f_u: 600, d_1: 2.4, l_g: 60,
  f_head_k: 10, f_tens_k: 3.5, ρ_a: 350, f_ax_in: 12, α_s: 90,
  f_ax_nk: 4.5, f_head_nk: 10, voorboren: 0, M_y_in: 0, f_head_p: 10,
  n_1: 5, n_2: 2, versprongen: 0, a_1: 40, a_2: 25, a_3: 60, a_4: 25,
  eind: 1, rand: 0, α: 0, F_v_Ed: 4, F_ax_Ed: 0, ax_lang: 0,
};

// ── Onafhankelijke uitwerking ─────────────────────────────────────────────
// Eenheden: N, mm, N/mm²; krachten op de verbinding in kN.

/** ρ_k per klasse: C14..C30 (EN 338), GL24h..GL32h (EN 14080). */
const RHO = [null, 290, 310, 320, 330, 340, 350, 370, 380, 385, 425, 440];
/** k_mod per klimaatklasse, per belastingsduur blijvend..zeer kort. */
const KMOD_HOUT = [null, [0.6, 0.7, 0.8, 0.9, 1.1], [0.6, 0.7, 0.8, 0.9, 1.1], [0.5, 0.55, 0.65, 0.7, 0.9]];
const OSB = [[0.4, 0.5, 0.7, 0.9, 1.1], [0.3, 0.4, 0.55, 0.7, 0.9], null];
const GIPS = [[0.2, 0.4, 0.6, 0.8, 1.0], [0.15, 0.3, 0.45, 0.6, 0.8], null];
const KMOD_PLAAT = [null, OSB, OSB,
  [[0.3, 0.45, 0.65, 0.85, 1.1], [0.2, 0.3, 0.45, 0.6, 0.8], null],
  [[0.6, 0.7, 0.8, 0.9, 1.1], [0.6, 0.7, 0.8, 0.9, 1.1], [0.5, 0.55, 0.65, 0.7, 0.9]],
  GIPS, GIPS];
const KOORD = [null, 0.15, 0.25, 0.5, 1.0];
const GM = 1.3, GM2 = 1.25;

const rad = (g) => (g * Math.PI) / 180;

function uitwerking(v) {
  const op = v.opbouw, mid = v.middel, d = v.d_v;
  const staalKop = op === 4, plaatKop = op === 3;
  // Materialen per rol. Bij plaat of staal op hout is het hout element 2; bij
  // hout–staal–hout zijn beide zijdelen element 1.
  const rhoZij = RHO[op === 3 || op === 4 ? v.klasse_2 : v.klasse_1];
  const rhoMid = RHO[op === 5 ? v.klasse_1 : v.klasse_2];
  const kh = KMOD_HOUT[v.klimaat][v.duur - 1];
  const kp = op === 3 ? (KMOD_PLAAT[v.plaat][v.klimaat - 1]?.[v.duur - 1] ?? 0) : null;
  const kmod = op === 3 ? Math.sqrt(kh * kp) : kh;

  const dEf = mid === 4 ? 1.1 * v.d_1 : d;
  const stuikBout = mid === 4 ? dEf > 6 : d > 8;
  const boutregels = mid === 4 && dEf > 6;
  const a = rad(v.α);

  const stuikHout = (rho) => {
    if (stuikBout) {
      const k90 = 1.35 + 0.015 * dEf;
      return (0.082 * (1 - 0.01 * dEf) * rho) / (k90 * Math.sin(a) ** 2 + Math.cos(a) ** 2);
    }
    return v.voorboren ? 0.082 * (1 - 0.01 * dEf) * rho : 0.082 * rho * dEf ** -0.3;
  };
  const stuikPlaat = () => {
    const t = v.t_1;
    if (v.plaat <= 3) return 65 * dEf ** -0.7 * t ** 0.1;
    if (v.plaat === 4) return 0.11 * v.ρ_pl * dEf ** -0.3;
    if (v.plaat === 5) return 3.9 * dEf ** -0.6 * t ** 0.7;
    return 7 * dEf ** -0.7 * t ** 0.9;
  };

  // Lagen van kop naar punt; de punt zit in de laatste.
  const lagen = op === 1 || op === 3 ? [v.t_1, v.t_2]
    : op === 2 ? [v.t_1, v.t_2, v.t_1]
    : op === 4 ? [v.t_s, v.t_2]
    : [v.t_1, v.t_s, v.t_1];
  const voorPunt = lagen.slice(0, -1).reduce((s, t) => s + t, 0);
  const tPen = Math.max(0, Math.min(v.l_v - voorPunt, lagen[lagen.length - 1]));

  const My = v.M_y_in > 0 ? v.M_y_in : (mid === 2 ? 0.45 : 0.3) * v.f_u * dEf ** 2.6;

  // ── axiaal, per verbindingsmiddel ──
  const rhoPunt = op === 2 || op === 5 ? rhoZij : rhoMid;
  const rhoKop = rhoZij;
  // Door gipsplaat geen axiale sterkte: het blad vraagt daar geen doortrekwaarde.
  const kopPlaat = v.plaat >= 5 ? 0 : v.f_head_p;
  let FaxRk, Ft = Infinity;
  if (mid === 1) {
    const fax = 20e-6 * rhoPunt ** 2, fhead = 70e-6 * rhoKop ** 2;
    const k = tPen >= 12 * d ? 1 : tPen >= 8 * d ? tPen / (4 * d) - 2 : 0;
    const uit = k * fax * d * tPen;
    const kop = staalKop ? Infinity : plaatKop ? kopPlaat * v.d_h ** 2 : k * fax * d * v.t_1 + fhead * v.d_h ** 2;
    FaxRk = Math.min(uit, kop);
  } else if (mid <= 3) {
    const tpg = Math.min(tPen, v.l_g);
    const k = tpg >= 8 * d ? 1 : tpg >= 6 * d ? tpg / (2 * d) - 3 : 0;
    const uit = k * v.f_ax_nk * d * tpg;
    const kop = staalKop ? Infinity : plaatKop ? kopPlaat * v.d_h ** 2 : v.f_head_nk * v.d_h ** 2;
    FaxRk = Math.min(uit, kop);
  } else {
    const lef = Math.min(tPen, v.l_g);
    const hoek = 1.2 * Math.cos(rad(v.α_s)) ** 2 + Math.sin(rad(v.α_s)) ** 2;
    const binnen = d >= 6 && d <= 12 && v.d_1 / d >= 0.6 && v.d_1 / d <= 0.75;
    const uit = binnen
      ? (0.52 * d ** -0.5 * Math.max(lef, 0.1) ** -0.1 * rhoPunt ** 0.8 * d * lef * Math.min(d / 8, 1)) / hoek
      : ((v.f_ax_in * d * lef) / hoek) * (rhoPunt / v.ρ_a) ** 0.8;
    const kop = staalKop ? Infinity : plaatKop ? kopPlaat * v.d_h ** 2 : v.f_head_k * v.d_h ** 2 * (rhoKop / v.ρ_a) ** 0.8;
    FaxRk = Math.min(uit, kop);
    Ft = v.f_tens_k * 1000;
  }
  const n = Math.max(v.n_1 * v.n_2, 1);
  const nAx = mid === 4 ? n ** 0.9 : n;
  const FaxRdGroep = Math.min((nAx * kmod * FaxRk) / GM, (nAx * Ft) / GM2); // N
  const koordRest = Math.min(FaxRk, Ft) * Math.max(0, 1 - (v.F_ax_Ed * 1000) / Math.max(FaxRdGroep, 1));

  // ── afschuiving, per verbindingsmiddel en per snede ──
  const p = (op === 3 && v.plaat >= 5 ? 0 : 1) * KOORD[mid];
  const metKoord = (J) => J + Math.min(koordRest / 4, p * J);
  let FvRk;
  if (op === 1 || op === 3) {
    const f1 = op === 3 ? stuikPlaat() : stuikHout(rhoZij), f2 = stuikHout(rhoMid);
    const b = f2 / f1, t1 = v.t_1, t2 = tPen, r = t2 / t1;
    const J = [
      f1 * t1 * dEf,
      f2 * t2 * dEf,
      metKoord(((f1 * t1 * dEf) / (1 + b)) * (Math.sqrt(b + 2 * b * b * (1 + r + r * r) + b ** 3 * r * r) - b * (1 + r))),
      metKoord(((1.05 * f1 * t1 * dEf) / (2 + b)) * (Math.sqrt(2 * b * (1 + b) + (4 * b * (2 + b) * My) / (f1 * dEf * t1 * t1)) - b)),
      metKoord(((1.05 * f1 * t2 * dEf) / (1 + 2 * b)) * (Math.sqrt(2 * b * b * (1 + b) + (4 * b * (1 + 2 * b) * My) / (f1 * dEf * t2 * t2)) - b)),
      metKoord(1.15 * Math.sqrt((2 * b) / (1 + b)) * Math.sqrt(2 * My * f1 * dEf)),
    ];
    FvRk = Math.min(...J);
  } else if (op === 2) {
    const f1 = stuikHout(rhoZij), f2 = stuikHout(rhoMid), b = f2 / f1;
    const t1 = Math.min(v.t_1, tPen), t2 = v.t_2;
    FvRk = Math.min(
      f1 * t1 * dEf,
      0.5 * f2 * t2 * dEf,
      metKoord(((1.05 * f1 * t1 * dEf) / (2 + b)) * (Math.sqrt(2 * b * (1 + b) + (4 * b * (2 + b) * My) / (f1 * dEf * t1 * t1)) - b)),
      metKoord(1.15 * Math.sqrt((2 * b) / (1 + b)) * Math.sqrt(2 * My * f1 * dEf)),
    );
  } else if (op === 4) {
    const fh = stuikHout(rhoMid), t = tPen;
    const dun = Math.min(0.4 * fh * t * dEf, metKoord(1.15 * Math.sqrt(2 * My * fh * dEf)));
    const dik = Math.min(
      fh * t * dEf,
      metKoord(fh * t * dEf * (Math.sqrt(2 + (4 * My) / (fh * dEf * t * t)) - 1)),
      metKoord(2.3 * Math.sqrt(My * fh * dEf)),
    );
    const w = Math.min(1, Math.max(0, (v.t_s / d - 0.5) / 0.5));
    FvRk = dun + w * (dik - dun);
  } else {
    const fh = stuikHout(rhoZij), t = Math.min(v.t_1, tPen);
    FvRk = Math.min(
      fh * t * dEf,
      metKoord(fh * t * dEf * (Math.sqrt(2 + (4 * My) / (fh * dEf * t * t)) - 1)),
      metKoord(2.3 * Math.sqrt(My * fh * dEf)),
    );
  }
  const FvRd = (kmod * FvRk) / GM;

  // ── groep ──
  const ns = op === 2 || op === 5 ? 2 : 1;
  let nEf, UCv;
  if (!boutregels) {
    const x = v.a_1 / d;
    const kef0 = x >= 14 ? 1 : x >= 10 ? 0.85 + (0.15 * (x - 10)) / 4 : x >= 7 ? 0.7 + (0.15 * (x - 7)) / 3
      : v.voorboren ? Math.max(0.5, 0.5 + (0.2 * (x - 4)) / 3) : 0.7;
    const kef = v.versprongen ? 1 : kef0;
    nEf = v.n_1 ** kef;
    const evenwijdig = (v.F_v_Ed * 1000 * Math.cos(a)) / (v.n_2 * nEf * ns * FvRd);
    const totaal = (v.F_v_Ed * 1000) / (v.n_2 * v.n_1 * ns * FvRd);
    UCv = Math.max(evenwijdig, totaal);
  } else {
    const n0 = Math.min(v.n_1, v.n_1 ** 0.9 * (v.a_1 / (13 * d)) ** 0.25);
    nEf = n0 + ((v.n_1 - n0) * v.α) / 90;
    UCv = (v.F_v_Ed * 1000) / (v.n_2 * nEf * ns * FvRd);
  }
  let UCax = 0, UCc = UCv;
  if (v.F_ax_Ed > 0) {
    const Rd = Math.min((nAx * kmod * FaxRk) / GM, mid === 4 ? (nAx * Ft) / GM2 : Infinity);
    UCax = (v.F_ax_Ed * 1000) / Rd;
    UCc = mid === 1 ? UCax + UCv : UCax ** 2 + UCv ** 2;
  }

  // ── afstanden en detaillering ──
  const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const rhoMax = op <= 2 ? Math.max(rhoZij, rhoMid) : op === 5 ? rhoZij : rhoMid;
  const groep = v.voorboren ? 3 : rhoMax <= 420 ? 1 : 2;
  const klein = d < 5;
  const tabel82 = {
    a1: [5 + (klein ? 5 : 7) * c, 7 + 8 * c, 4 + c][groep - 1] * d,
    a2: [5, 7, 3 + s][groep - 1] * d,
    a3: (v.eind ? [10 + 5 * c, 15 + 5 * c, 7 + 5 * c] : [10, 15, 7])[groep - 1] * d,
    a4: (v.rand ? [5 + (klein ? 2 : 5) * s, 7 + (klein ? 2 : 5) * s, 3 + (klein ? 2 : 4) * s] : [5, 7, 3])[groep - 1] * d,
  };
  const tabel84 = {
    a1: (4 + c) * d,
    a2: 4 * d,
    a3: v.eind ? Math.max(7 * d, 80) : Math.max(4 * d, (1 + 6 * s) * d),
    a4: v.rand ? Math.max((2 + 2 * s) * d, 3 * d) : 3 * d,
  };
  const tus = op === 3 ? 0.85 : op >= 4 ? 0.7 : 1;
  const axSchroef = mid === 4 && v.F_ax_Ed > 0;
  const gips = op === 3 && v.plaat >= 5;
  const basis = boutregels ? tabel84 : { ...tabel82, a1: tus * tabel82.a1, a2: tus * tabel82.a2 };
  const min = {
    a1: Math.max(basis.a1, axSchroef ? 7 * d : 0, gips ? 20 * d : 0),
    a2: Math.max(basis.a2, axSchroef ? 5 * d : 0),
    a3: Math.max(basis.a3, axSchroef ? 10 * d : 0),
    a4: Math.max(basis.a4, axSchroef ? 4 * d : 0, gips ? (v.rand ? 10 : 7) * d : 0),
  };
  const tHout = op <= 2 ? Math.min(v.t_1, v.t_2) : op === 5 ? v.t_1 : v.t_2;
  const tElem = op === 2 || op === 5 ? v.t_1 : v.t_2;
  const eisen = [
    v.a_1 >= min.a1 && (!gips || v.a_1 <= Math.min(60 * d, 150)),
    v.n_2 <= 1 || v.a_2 >= min.a2,
    v.a_3 >= min.a3,
    v.a_4 >= min.a4,
    tPen >= (mid === 1 ? 8 : 6) * d,
    v.voorboren || boutregels || tHout >= Math.max(7 * d, ((13 * d - 30) * rhoMax) / 400),
    v.voorboren || (mid === 4 ? d <= 6 : rhoMax <= 500 && d <= 6),
    mid === 4 || v.n_1 * v.n_2 >= 2,
    !(op === 3 && v.plaat <= 4) || v.d_h >= 2 * d,
    mid === 4 || v.M_y_in > 0 || v.f_u >= 600,
    !axSchroef || v.α_s >= 30,
    !axSchroef || tElem >= 12 * d,
    !(mid === 1 && v.F_ax_Ed > 0 && v.ax_lang === 1),
    kmod > 0,
  ];
  const detailOk = eisen.every(Boolean);

  return { kmod, tPen, My, FaxRk, koordRest, FvRk, FvRd, nEf, UCv, UCax, UCc, UCmax: Math.max(UCv, UCax, UCc), detailOk };
}

const s4 = (x) => {
  if (x === 0) return "0";
  const dec = Math.max(0, 3 - Math.floor(Math.log10(Math.abs(x))));
  return x.toFixed(dec);
};

/**
 * Het blad rondt uitkomsten af op vier significante cijfers; de narekening
 * niet. Op een afrondgrens kan dat één eenheid in het laatste cijfer schelen,
 * daarom een tolerantie van 0,2 % in plaats van een halve eenheid.
 */
const ruim = (x) => ({ waarde: s4(x), tol: Math.max(Math.abs(x) * 0.002, 1e-6) });

function verwachtingen(r, v) {
  // Niet toegestaan materiaal: k_mod = 0 en geen zinvolle sterkte meer.
  if (r.kmod === 0) return { k_mod: "0" };
  const uit = {
    k_mod: ruim(r.kmod), t_pen: ruim(r.tPen), M_y_Rk: ruim(r.My),
    F_v_Rk: ruim(r.FvRk), F_v_Rd: ruim(r.FvRd), n_ef: ruim(r.nEf), UC_v: ruim(r.UCv),
    F_ax_Rk: ruim(r.FaxRk), F_ax_koord: ruim(r.koordRest),
  };
  if (v.F_ax_Ed > 0) Object.assign(uit, { UC_ax: ruim(r.UCax), UC_c: ruim(r.UCc) });
  return uit;
}

const SETS = [
  {
    naam: "1 — standaard: C24 38 + 71, tien gladde nagels 3,4 × 90",
    invoer: {},
    // Met de hand: f_h = 0,082·350·3,4^-0,3 = 19,88; M_y = 0,3·600·3,4^2,6 = 4336;
    // F_ax,Rk = 2,45·3,4·52 = 433,2 (t_pen ≥ 12d); mechanisme (f):
    // 1,15·√(2·4336·19,88·3,4) = 880,5, plus min(433,2/4; 0,15·880,5) = 108,3.
    // k_ef bij a_1 = 11,8d: 0,85 + 0,15·1,76/4 = 0,916; n_ef = 5^0,916 = 4,37.
    handwerk: { f_h_1: "19.88", M_y_Rk: "4336", F_ax_Rk: "433.2", F_v_Rk: "988.8", F_v_Rd: "608.5", k_ef: "0.916", UC_v: "0.752" },
  },
  {
    naam: "2 — schroeven 6 × 100 (kern 4) in C24, ook op trek, afstanden voor tabel 8.2 en 8.6",
    invoer: {
      middel: 4, d_v: 6, d_1: 4, l_v: 100, l_g: 60, d_h: 12, f_u: 800, f_head_k: 10.5, f_tens_k: 11,
      t_1: 45, t_2: 120, a_1: 80, a_2: 30, a_3: 100, a_4: 30, F_ax_Ed: 3, F_v_Ed: 5,
    },
    // Met de hand: d_ef = 4,4; f_ax,k (8.39) = 0,52·6^-0,5·55^-0,1·350^0,8 = 15,42;
    // k_d = 0,75; uittrekken 15,42·6·55·0,75 = 3817; doortrekken 10,5·12² = 1512.
    handwerk: { d_ef: "4.4", f_ax_k: "15.42", F_ax_a: "3817", F_ax_Rk: "1512", n_ef_ax: "7.943" },
  },
  {
    naam: "3 — schroeven 10 × 200 (kern 6,4): boutregels, 45°, voorgeboord, GL24h op C24",
    invoer: {
      middel: 4, d_v: 10, d_1: 6.4, l_v: 200, l_g: 100, d_h: 18, f_u: 800, f_tens_k: 28, voorboren: 1,
      klasse_1: 9, α: 45, n_1: 3, n_2: 2, a_1: 60, a_2: 50, a_3: 100, a_4: 50, t_1: 80, t_2: 140, F_v_Ed: 10, rand: 1,
    },
  },
  {
    naam: "4 — OSB/3 18 mm op C18 met ringnagels, klimaatklasse 2, kort",
    invoer: {
      opbouw: 3, plaat: 1, t_1: 18, klasse_2: 3, klimaat: 2, duur: 4, middel: 3, d_v: 2.8, l_v: 63, d_h: 6.5,
      l_g: 40, n_1: 8, n_2: 1, a_1: 50, a_3: 50, a_4: 20, F_v_Ed: 3,
    },
  },
  {
    naam: "5 — gipskarton 12,5 op C24 met schroeven 3,9 × 35: geen koordeffect",
    invoer: {
      opbouw: 3, plaat: 5, t_1: 12.5, middel: 4, d_v: 3.9, d_1: 2.6, l_v: 35, l_g: 22, d_h: 8, duur: 4,
      n_1: 10, n_2: 1, a_1: 100, a_3: 40, a_4: 40, F_v_Ed: 2,
    },
  },
  {
    naam: "6 — staalplaat 3 mm (tussen dun en dik) op C24 met ankernagels 4 × 40",
    invoer: {
      opbouw: 4, t_s: 3, middel: 3, d_v: 4, l_v: 40, d_h: 8, l_g: 30, n_1: 6, n_2: 2,
      a_1: 30, a_2: 20, a_3: 60, a_4: 20, F_v_Ed: 5,
    },
  },
  {
    naam: "7 — dubbelsnedig 22 + 44 + 22 met gladde nagels 3,8 × 100: indringdiepte tussen 8d en 12d",
    invoer: { opbouw: 2, t_1: 38, t_2: 44, l_v: 120, d_v: 3.8, d_h: 9, a_1: 50, a_2: 30, a_3: 70, a_4: 30, F_v_Ed: 6, F_ax_Ed: 0.3 },
  },
  {
    naam: "8 — hout – staal – hout met schroeven 8 × 120 (kern 5,4), voorgeboord, op trek",
    invoer: {
      opbouw: 5, t_1: 60, t_s: 8, middel: 4, d_v: 8, d_1: 5.4, l_v: 120, l_g: 50, d_h: 14, f_u: 800,
      f_tens_k: 20, voorboren: 1, a_1: 80, a_2: 40, a_3: 100, a_4: 40, F_v_Ed: 20, F_ax_Ed: 2,
    },
  },
  {
    naam: "9 — gladde nagels met een langdurige axiale belasting: niet toegestaan",
    invoer: { F_ax_Ed: 0.5, ax_lang: 1 },
  },
  {
    naam: "10 — OSB in klimaatklasse 3: niet toegestaan",
    invoer: { opbouw: 3, plaat: 1, t_1: 18, klimaat: 3, middel: 3, d_v: 2.8, l_v: 63, d_h: 6.5, l_g: 40 },
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

  // Eindoordeel en maatgevende UC staan in een tekstregel.
  const m = got.text.match(/Maatgevende UC = ([\d.]+|∞)/);
  const ucBlad = m ? (m[1] === "∞" ? Infinity : parseFloat(m[1])) : NaN;
  // Zonder sterkte (k_mod = 0) noemt het blad geen UC maar de reden.
  const ucOk = Number.isFinite(r.UCmax)
    ? Number.isFinite(ucBlad) && Math.abs(ucBlad - r.UCmax) <= Math.max(0.002 * r.UCmax, 1e-4)
    : !m && /De verbinding voldoet niet: dit plaatmateriaal/.test(got.text);
  const voldoet = /de verbinding voldoet(?! niet)/i.test(got.text);
  const wil = r.UCmax <= 1 && r.detailOk;
  const oordeelOk = voldoet === wil;
  if (!ucOk) fouten++;
  if (!oordeelOk) fouten++;
  console.log(`  ${ucOk ? "OK    " : "FOUT  "} UC_max     ons ${String(ucBlad).padStart(10)}   narekening ${s4(r.UCmax)}`);
  console.log(`  ${oordeelOk ? "OK    " : "FOUT  "} oordeel    ons ${voldoet ? "voldoet" : "voldoet niet"}   narekening ${wil ? "voldoet" : "voldoet niet"}${r.detailOk ? "" : " (detaillering)"}`);
}

// Twee meldingen die in het blad moeten staan.
{
  const v = { ...STANDAARD, ...SETS[8].invoer };
  const got = reken(tpl, Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)])));
  const ok = /geen blijvende of langdurige axiale belasting/.test(got.text);
  if (!ok) fouten++;
  console.log(`\nMelding gladde nagel axiaal\n  ${ok ? "OK    " : "FOUT  "} "geen blijvende of langdurige axiale belasting"`);
}
{
  const v = { ...STANDAARD, ...SETS[9].invoer };
  const got = reken(tpl, Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)])));
  const ok = /mag in klimaatklasse 3 niet worden toegepast/.test(got.text);
  if (!ok) fouten++;
  console.log(`\nMelding OSB in klimaatklasse 3\n  ${ok ? "OK    " : "FOUT  "} "mag in klimaatklasse 3 niet worden toegepast"`);
}

afronden(fouten, "Nagel- en schroefverbinding");
