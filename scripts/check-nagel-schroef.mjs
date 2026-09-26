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
 *      koordeffect met de grenzen van §8.2.2(2) (vierkante en geprofileerde
 *      nagels 25 %) en de restcapaciteit van de NB bij §8.2.2(5); axiaal
 *      (8.23)–(8.26) en (8.38)–(8.41), het staal van de schroef met k_mod en
 *      γ_M = 1,3 volgens (2.17), met een vierkante of gegroefde nagel zonder
 *      profilering als gladde nagel; de groep met tabel 8.1 of (8.34)/(8.35)
 *      en de scherpe hoek tussen kracht en vezel; de combinatie (8.27)/(8.28);
 *      splijten (8.2)–(8.4) naar de belaste rand, bij een onbelaste rand a_4
 *      de rand aan de overkant; de afstanden uit tabel 8.2, 8.4 en 8.6, ook
 *      tot die overkant, en de detailleringseisen, met gipsplaat volgens de NB
 *      bij 3.8 (type A en F alleen in klimaatklasse 1, minimaal 12,5 mm). Het
 *      blad moet daar op vier significante cijfers mee overeenkomen, en het
 *      eindoordeel moet gelijk zijn.
 *   2. Voor een aantal gevallen een paar getallen die met de hand zijn
 *      nagerekend, zodat een fout die in beide uitwerkingen zit niet
 *      onopgemerkt blijft.
 *
 * Daarna hetzelfde voor de ambachtelijke verbindingen in hetzelfde blad
 * (soort 2 tot en met 4): keep, pen-en-gat en zwaluwstaart met de algemene
 * toetsen (6.1), (6.2), (6.3), (6.13), (6.16), de uitkeping (6.60)–(6.63) en
 * splijten (8.4), elk met een eigen uitwerking, handberekeningen, de
 * meldingen en het oordeel. Het blad zonder keuze voor de soort rekent als
 * stiftvormige verbinding: de sets hierboven hebben die keuze niet.
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
/** §8.2.2(2): gladde 15 %, vierkante en geprofileerde nagels (ook ring- en schroefnagels) 25 %, schroeven 100 %. */
const KOORD = [null, 0.15, 0.25, 0.25, 1.0];
/** γ_M voor verbindingen (tabel 2.3); ook het staal van de schroef volgt (2.17). */
const GM = 1.3;

const rad = (g) => (g * Math.PI) / 180;

function uitwerking(v) {
  const op = v.opbouw, mid = v.middel, d = v.d_v;
  const staalKop = op === 4, plaatKop = op === 3;
  // Materialen per rol. Bij plaat of staal op hout is het hout element 2; bij
  // hout–staal–hout zijn beide zijdelen element 1.
  const rhoZij = RHO[op === 3 || op === 4 ? v.klasse_2 : v.klasse_1];
  const rhoMid = RHO[op === 5 ? v.klasse_1 : v.klasse_2];
  const kh = KMOD_HOUT[v.klimaat][v.duur - 1];
  // Gipskarton type A en F (gips_type 1, de eerste keuze) alleen in klimaatklasse 1 (NB bij 3.8(1)).
  const gipsAF = v.plaat === 5 && (v.gips_type ?? 1) === 1 && v.klimaat >= 2;
  const kp = op === 3 ? (gipsAF ? 0 : KMOD_PLAAT[v.plaat][v.klimaat - 1]?.[v.duur - 1] ?? 0) : null;
  const kmod = op === 3 ? Math.sqrt(kh * kp) : kh;

  const dEf = mid === 4 ? 1.1 * v.d_1 : d;
  const stuikBout = mid === 4 ? dEf > 6 : d > 8;
  const boutregels = mid === 4 && dEf > 6;
  // Scherpe hoek tussen kracht en vezel: 150° is meetkundig gelijk aan 30°.
  const aMod = Math.abs(v.α) % 180;
  const an = Math.min(aMod, 180 - aMod);
  const a = rad(an);

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
  const lef = Math.min(tPen, v.l_g);
  // Een vierkante of gegroefde nagel zonder profilering is axiaal een gladde nagel.
  if (mid <= 2) {
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
    const hoek = 1.2 * Math.cos(rad(v.α_s)) ** 2 + Math.sin(rad(v.α_s)) ** 2;
    const binnen = d >= 6 && d <= 12 && v.d_1 / d >= 0.6 && v.d_1 / d <= 0.75;
    // Schroefdraad aan de puntzijde korter dan 6d: geen uittreksterkte (§8.7.2(3)).
    const uit = lef < 6 * d ? 0 : binnen
      ? (0.52 * d ** -0.5 * lef ** -0.1 * rhoPunt ** 0.8 * d * lef * Math.min(d / 8, 1)) / hoek
      : ((v.f_ax_in * d * lef) / hoek) * (rhoPunt / v.ρ_a) ** 0.8;
    const kop = staalKop ? Infinity : plaatKop ? kopPlaat * v.d_h ** 2 : v.f_head_k * v.d_h ** 2 * (rhoKop / v.ρ_a) ** 0.8;
    FaxRk = Math.min(uit, kop);
    Ft = v.f_tens_k * 1000;
  }
  const n = Math.max(v.n_1 * v.n_2, 1);
  const nAx = mid === 4 ? n ** 0.9 : n;
  const FaxRdGroep = (nAx * kmod * Math.min(FaxRk, Ft)) / GM; // N
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
    nEf = n0 + ((v.n_1 - n0) * an) / 90;
    UCv = (v.F_v_Ed * 1000) / (v.n_2 * nEf * ns * FvRd);
  }
  let UCax = 0, UCc = UCv;
  if (v.F_ax_Ed > 0) {
    const Rd = (nAx * kmod * Math.min(FaxRk, Ft)) / GM;
    UCax = (v.F_ax_Ed * 1000) / Rd;
    UCc = mid <= 2 ? UCax + UCv : UCax ** 2 + UCv ** 2;
  }

  // ── splijten (8.2)–(8.4), naaldhout, w = 1 ──
  // Bij elke kracht onder een hoek met de vezel. Belaste rand a_4: h_e = a_4 +
  // (n_2 − 1)·a_2; onbelaste rand a_4: de belaste rand ligt aan de overkant en
  // h_e = h − a_4. Element: het dunste (0, standaard), dat aan de puntzijde (1)
  // of het andere (2); zijdelen tellen samen.
  const splijt = an > 0;
  const groepH = v.a_4 + (v.n_2 - 1) * (v.n_2 > 1 ? v.a_2 : 0);
  const h90 = v.h_90 ?? 0;
  let UC90 = 0, ok90 = true;
  if (splijt) {
    // De keuze van het element bestaat alleen bij hout – hout; anders splijt het hout.
    const el = op <= 2 ? (v.el_90 ?? 0) : 1, eta = v.η_in ?? 0;
    const bPunt = op === 2 || op === 5 ? 2 * v.t_1 : v.t_2;
    const bAnder = op === 2 ? v.t_2 : v.t_1;
    const b = el === 1 ? bPunt : el === 2 ? bAnder : Math.min(bPunt, bAnder);
    ok90 = h90 > groepH;
    if (ok90) {
      const he = v.rand === 1 ? groepH : h90 - v.a_4;
      const F90Rd = (kh * 14 * b * Math.sqrt(he / (1 - he / h90))) / GM;
      const deel = eta > 0 ? Math.min(Math.max(eta, 0.5), 1) : 1;
      UC90 = (deel * v.F_v_Ed * 1000 * Math.sin(a)) / F90Rd;
    }
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
    // De rand aan de overkant: belast als de rand bij a_4 onbelast is en omgekeerd.
    a4o: (v.rand ? [5, 7, 3] : [5 + (klein ? 2 : 5) * s, 7 + (klein ? 2 : 5) * s, 3 + (klein ? 2 : 4) * s])[groep - 1] * d,
  };
  const tabel84 = {
    a1: (4 + c) * d,
    a2: 4 * d,
    a3: v.eind ? Math.max(7 * d, 80) : Math.max(4 * d, (1 + 6 * s) * d),
    a4: v.rand ? Math.max((2 + 2 * s) * d, 3 * d) : 3 * d,
    a4o: v.rand ? 3 * d : Math.max((2 + 2 * s) * d, 3 * d),
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
    a4o: Math.max(basis.a4o, axSchroef ? 4 * d : 0, gips ? (v.rand ? 7 : 10) * d : 0),
  };
  const tHout = op <= 2 ? Math.min(v.t_1, v.t_2) : op === 5 ? v.t_1 : v.t_2;
  const tElem = op === 2 || op === 5 ? v.t_1 : v.t_2;
  // Ook de schroefhoek telt als scherpe hoek met de vezel: 170° is 10°.
  const asMod = Math.abs(v.α_s) % 180;
  const asN = Math.min(asMod, 180 - asMod);
  const eisen = [
    v.a_1 >= min.a1 && (!gips || v.a_1 <= Math.min(60 * d, 150)),
    v.n_2 <= 1 || v.a_2 >= min.a2,
    v.a_3 >= min.a3,
    v.a_4 >= min.a4,
    // Met de hoogte h is ook de afstand tot de rand aan de overkant bekend; een
    // verspringende rij (alleen bij de nagelregels) brengt elk tweede
    // verbindingsmiddel 1d dichter bij die rand.
    !(splijt && ok90) || h90 - groepH - (!boutregels && v.versprongen ? d : 0) >= min.a4o,
    tPen >= (mid <= 2 ? 8 : 6) * d,
    v.voorboren || boutregels || tHout >= Math.max(7 * d, ((13 * d - 30) * rhoMax) / 400),
    v.voorboren || (mid === 4 ? d <= 6 : rhoMax <= 500 && d <= 6),
    mid === 4 || v.n_1 * v.n_2 >= 2,
    !(op === 3 && v.plaat <= 4) || v.d_h >= 2 * d,
    !gips || v.t_1 >= 12.5,
    mid === 4 || v.M_y_in > 0 || v.f_u >= 600,
    !axSchroef || asN >= 30,
    !axSchroef || tElem >= 12 * d,
    !axSchroef || lef >= 6 * d,
    !(mid <= 2 && v.F_ax_Ed > 0 && v.ax_lang === 1),
    kmod > 0,
  ];
  const detailOk = eisen.every(Boolean);

  return {
    kmod, tPen, My, FaxRk, koordRest, FvRk, FvRd, nEf, UCv, UCax, UCc, splijt, ok90, UC90,
    UCmax: Math.max(UCv, UCax, UCc, UC90), detailOk,
  };
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
  // Zonder uittreksterkte is UC_ax oneindig; dat toetst de regel met de maatgevende UC.
  if (v.F_ax_Ed > 0 && Number.isFinite(r.UCax)) Object.assign(uit, { UC_ax: ruim(r.UCax), UC_c: ruim(r.UCc) });
  if (r.splijt && r.ok90) uit.UC_90 = ruim(r.UC90);
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
    naam: "3 — schroeven 10 × 200 (kern 6,4): boutregels, 45°, voorgeboord, GL24h op C24, splijten in de balk h = 300",
    invoer: {
      middel: 4, d_v: 10, d_1: 6.4, l_v: 200, l_g: 100, d_h: 18, f_u: 800, f_tens_k: 28, voorboren: 1,
      klasse_1: 9, α: 45, n_1: 3, n_2: 2, a_1: 60, a_2: 50, a_3: 100, a_4: 50, t_1: 80, t_2: 140, F_v_Ed: 10, rand: 1,
      h_90: 300, el_90: 1,
    },
    // Met de hand, splijten van element 2 (b = 140): h_e = 50 + 50 = 100;
    // F_90,Rk = 14·140·√(100/(1 − 100/300)) = 1960·12,247 = 24 005 N;
    // F_90,Rd = 0,8·24 005/1,3 = 14,77 kN; F_90,Ed = 10·sin 45° = 7,071 kN; UC = 0,4787.
    handwerk: { h_e: "100", F_90_Rd: "14.77", UC_90: "0.4787" },
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
  {
    naam: "11 — vierkante nagels zonder profilering, kortdurend op trek: axiaal als gladde nagel, (8.27)",
    invoer: { middel: 2, F_ax_Ed: 1.0 },
    // Met de hand: f_ax,k = 20·10⁻⁶·350² = 2,45; f_head,k = 70·10⁻⁶·350² = 8,575;
    // t_pen = 52 ≥ 12d, k_pen = 1; (8.24a) 2,45·3,4·52 = 433,2; (8.24b) 2,45·3,4·38 +
    // 8,575·8² = 865,3; F_ax,Rd = 10·0,8·433,2/1,3 = 2666 N, UC_ax = 1000/2666 = 0,3752.
    // M_y = 0,45·600·3,4^2,6 = 6504; mechanisme (d) 1070,9 + koord (433,2·0,6248)/4 = 67,7
    // geeft 1138,5; UC_v = 4000/(2·4,369·0,8·1138,5/1,3) = 0,6535; (8.27) 0,3752 + 0,6535 = 1,029.
    handwerk: { f_ax_k: "2.45", F_ax_Rk: "433.2", UC_ax: "0.3752", UC_v: "0.6535", UC_c: "1.029" },
  },
  {
    naam: "12 — vierkante nagels zonder profilering met een langdurige axiale belasting: niet toegestaan",
    invoer: { middel: 2, F_ax_Ed: 0.5, ax_lang: 1 },
  },
  {
    naam: "13 — vierkante nagels zonder profilering 3,4 × 63: t_pen = 25 mm tussen 6d en 8d",
    invoer: { middel: 2, l_v: 63 },
    // Met de hand: t_pen = 63 − 38 = 25 mm = 7,35d < 8d = 27,2 mm: indringdiepte
    // voldoet niet (§8.3.1.2) en geen uittreksterkte, dus ook geen koordeffect (§8.3.2(7)).
    handwerk: { t_pen: "25", k_pen: "0", F_ax_Rk: "0", F_ax_koord: "0" },
  },
  {
    naam: "14 — schroeven 6 × 100 met 20 mm draad aan de puntzijde, op trek: draad korter dan 6d",
    invoer: {
      middel: 4, d_v: 6, d_1: 4, l_v: 100, l_g: 20, d_h: 12, f_u: 800, f_head_k: 10.5, f_tens_k: 11,
      t_1: 45, t_2: 120, a_1: 80, a_2: 30, a_3: 100, a_4: 30, F_ax_Ed: 1.5, F_v_Ed: 3,
    },
    // Met de hand: ℓ_ef = min(55; 20) = 20 mm < 6d = 36 mm: geen uittreksterkte (§8.7.2(3)),
    // dus F_ax,Rk = 0 en geen koordeffect; de trek kan niet worden opgenomen.
    handwerk: { ℓ_ef: "20", F_ax_a: "0", F_ax_Rk: "0", F_ax_koord: "0" },
  },
  {
    naam: "15 — gladde nagels, kracht onder 150° met de vezel: rekent als 30°",
    invoer: { α: 150, n_1: 10, a_1: 24 },
    // Met de hand: a_1 = 7,06d, k_ef = 0,7 + 0,15·0,059/3 = 0,7029, n_ef = 10^0,7029 = 5,046;
    // UC_v,0 = 4000·cos 30°/(2·5,046·608,5) = 0,5641 > UC_v,t = 4000/(20·608,5) = 0,3287.
    handwerk: { n_ef: "5.046", UC_v: "0.5641" },
  },
  {
    naam: "16 — schroeven 10 × 200 als set 3, kracht onder 120° met de vezel: rekent als 60°",
    invoer: {
      middel: 4, d_v: 10, d_1: 6.4, l_v: 200, l_g: 100, d_h: 18, f_u: 800, f_tens_k: 28, voorboren: 1,
      klasse_1: 9, α: 120, n_1: 3, n_2: 2, a_1: 60, a_2: 50, a_3: 100, a_4: 50, t_1: 80, t_2: 140, F_v_Ed: 10, rand: 1,
      h_90: 300, el_90: 1,
    },
    // Met de hand: n_ef,0 = min(3; 3^0,9·(60/130)^0,25) = 2,2155; (8.35) met 60°:
    // n_ef = 2,2155 + 0,7845·60/90 = 2,738, niet 3,262 zoals met 120° (dat is meer dan n).
    handwerk: { n_ef: "2.738" },
  },
  {
    naam: "17 — gladde nagels, kracht loodrecht op de vezel naar de belaste rand, h = 200 bij de oplegging: splijten",
    invoer: { α: 90, rand: 1, eind: 0, F_v_Ed: 6, h_90: 200, el_90: 1 },
    // Met de hand (8.4), element aan de puntzijde gekozen (b = 71): h_e = 25 + 25 = 50;
    // F_90,Rk = 14·71·√(50/(1 − 50/200)) = 8116 N;
    // F_90,Rd = 0,8·8116/1,3 = 4,994 kN; F_90,Ed = 6 kN (alles aan één zijde); UC = 1,201.
    handwerk: { b_90: "71", h_e: "50", F_90_Rd: "4.994", UC_90: "1.201" },
  },
  {
    naam: "18 — als 17, maar element 1 splijt en de kracht verdeelt zich gelijk over beide zijden",
    invoer: { α: 90, rand: 1, eind: 0, F_v_Ed: 6, h_90: 200, el_90: 2, η_in: 0.5 },
    // Met de hand: F_90,Rk = 14·38·8,165 = 4344 N; F_90,Rd = 0,8·4344/1,3 = 2,673 kN;
    // F_90,Ed = 0,5·6 = 3 kN; UC = 1,122.
    handwerk: { b_90: "38", F_90_Rd: "2.673", F_90_Ed: "3", UC_90: "1.122" },
  },
  {
    naam: "19 — kracht onder 45° naar de belaste rand zonder hoogte van het element: niet volledig getoetst",
    invoer: { α: 45, rand: 1 },
  },
  {
    naam: "20 — schroeven als set 2 op trek, schroefhoek ingevoerd als 170°",
    invoer: {
      middel: 4, d_v: 6, d_1: 4, l_v: 100, l_g: 60, d_h: 12, f_u: 800, f_head_k: 10.5, f_tens_k: 11,
      t_1: 45, t_2: 120, a_1: 80, a_2: 30, a_3: 100, a_4: 30, F_ax_Ed: 3, F_v_Ed: 5, α_s: 170,
    },
    // Met de hand: de scherpe hoek tussen schroefas en vezel is 180 − 170 = 10° < 30°:
    // de detaillering voldoet niet (§8.7.2(4)); (8.38) blijft gelijk aan 10°, want
    // 1,2·cos² + sin² is symmetrisch.
  },
  {
    naam: "21 — gladde nagels, kracht loodrecht op de vezel van de rand a_4 af, h = 100: splijten naar de overkant",
    invoer: { α: 90, rand: 0, h_90: 100 },
    // Met de hand: de belaste rand ligt tegenover a_4; h_e = 100 − 25 = 75. Zonder keuze
    // het dunste element, b = 38. F_90,Rk = 14·38·√(75/(1 − 75/100)) = 532·17,32 = 9214 N;
    // F_90,Rd = 0,8·9214/1,3 = 5,670 kN; F_90,Ed = 4 kN; UC = 0,7054. Randafstand aan
    // de overkant 100 − 25 − 25 = 50 ≥ (5 + 2)·3,4 = 23,8 (belast, d < 5 mm).
    handwerk: { b_90: "38", h_e: "75", F_90_Rd: "5.670", UC_90: "0.7054" },
  },
  {
    naam: "22 — als 21 met h = 70 en F_v,Ed = 3 kN: de rand aan de overkant ligt te dicht bij",
    invoer: { α: 90, rand: 0, h_90: 70, F_v_Ed: 3 },
    // Met de hand: h_e = 70 − 25 = 45; F_90,Rk = 14·38·√(45/(1 − 45/70)) = 532·√126 = 5972 N;
    // F_90,Rd = 0,8·5972/1,3 = 3,675 kN; UC = 3/3,6749 = 0,8164. Randafstand aan de
    // overkant 70 − 50 = 20 < 23,8: de detaillering voldoet niet.
    handwerk: { h_e: "45", F_90_Rd: "3.675", UC_90: "0.8164" },
  },
  {
    naam: "23 — kracht onder 30° van de rand a_4 af zonder hoogte van het element: niet volledig getoetst",
    invoer: { α: 30, rand: 0 },
  },
  {
    naam: "24 — dubbelsnedig 38 + 44 + 38, kracht loodrecht op de vezel naar de belaste rand, h = 150: het dunste element",
    invoer: {
      opbouw: 2, t_1: 38, t_2: 44, l_v: 120, d_v: 3.8, d_h: 9, a_1: 50, a_2: 30, a_3: 70, a_4: 30,
      α: 90, rand: 1, eind: 0, h_90: 150, F_v_Ed: 3,
    },
    // Met de hand: zijdelen samen 2·38 = 76, middendeel 44; het dunste is 44.
    // h_e = 30 + 30 = 60; F_90,Rk = 14·44·√(60/(1 − 60/150)) = 616·10 = 6160 N;
    // F_90,Rd = 0,8·6160/1,3 = 3,791 kN; UC = 3/3,791 = 0,7914.
    handwerk: { b_90: "44", h_e: "60", F_90_Rd: "3.791", UC_90: "0.7914" },
  },
  {
    naam: "25 — als 21 met h = 75, F_v,Ed = 2 kN en een verspringende rij: de verspringing telt mee tot de overkant",
    invoer: { α: 90, rand: 0, h_90: 75, versprongen: 1, F_v_Ed: 2 },
    // Met de hand: h_e = 75 − 25 = 50; F_90,Rk = 14·38·√(50/(1 − 50/75)) = 532·√150 = 6516 N;
    // F_90,Rd = 0,8·6516/1,3 = 4,010 kN; UC = 2/4,010 = 0,4988. Randafstand aan de overkant
    // 75 − 25 − 25 − 3,4 = 21,6 < 23,8: de detaillering voldoet niet (zonder de 1d: 25).
    handwerk: { h_e: "50", F_90_Rd: "4.010", UC_90: "0.4988", k_ef: "1" },
  },
  {
    naam: "26 — ringnagels 4 × 100 in C24 38 + 71, kort: koordeffect ten hoogste 25 %",
    invoer: {
      middel: 3, d_v: 4, l_v: 100, d_h: 9, l_g: 60, f_ax_nk: 10, f_head_nk: 20, duur: 4,
      n_1: 4, n_2: 1, a_1: 60, a_3: 80, a_4: 30, F_v_Ed: 2,
    },
    // Met de hand: f_h = 0,082·350·4^-0,3 = 18,93; M_y = 0,3·600·4^2,6 = 6617;
    // t_pen = 62, geprofileerd deel 60 ≥ 8d: F_ax,a = 10·4·60 = 2400, F_ax,b = 20·9² = 1620.
    // (f): 1,15·√(2·6617·18,93·4) = 1151,2; koord min(1620/4; 0,25·1151,2) = 287,8 → 1439,0
    // (met 50 % was het min(405; 575,6) = 405 → 1556, 8 % hoger). F_v,Rd = 0,9·1439,1/1,3 = 996,3.
    handwerk: { f_h_1: "18.93", M_y_Rk: "6617", F_ax_Rk: "1620", F_v_Rk: "1439", F_v_Rd: "996.3" },
  },
  {
    naam: "27 — schroeven als set 2 met f_tens,k = 1,2 kN: het staal is maatgevend op trek",
    invoer: {
      middel: 4, d_v: 6, d_1: 4, l_v: 100, l_g: 60, d_h: 12, f_u: 800, f_head_k: 10.5, f_tens_k: 1.2,
      t_1: 45, t_2: 120, a_1: 80, a_2: 30, a_3: 100, a_4: 30, F_ax_Ed: 3, F_v_Ed: 5,
    },
    // Met de hand, (2.17) met γ_M = 1,3 (tabel 2.3) en k_mod = 0,8: F_t,Rd = 7,943·0,8·1200/1,3
    // = 5866 N (met γ_M2 = 1,25 en zonder k_mod was het 7,625 kN); UC_ax = 3/5,866 = 0,5114.
    // Koordeffect: min(1512; 1200)·(1 − 3000/5866) = 586,3.
    handwerk: { F_t_Rd: "5.866", UC_ax: "0.5114", F_ax_koord: "586.3" },
  },
  {
    naam: "28 — gipskarton type A of F in klimaatklasse 2: niet toegestaan",
    invoer: {
      opbouw: 3, plaat: 5, t_1: 12.5, middel: 4, d_v: 3.9, d_1: 2.6, l_v: 40, l_g: 22, d_h: 8, duur: 4,
      n_1: 10, n_2: 1, a_1: 100, a_3: 40, a_4: 40, F_v_Ed: 2, klimaat: 2,
    },
  },
  {
    naam: "29 — gipskarton type H of FH in klimaatklasse 2, kort",
    invoer: {
      opbouw: 3, plaat: 5, gips_type: 2, t_1: 12.5, middel: 4, d_v: 3.9, d_1: 2.6, l_v: 40, l_g: 22, d_h: 8,
      duur: 4, n_1: 10, n_2: 1, a_1: 100, a_3: 40, a_4: 40, F_v_Ed: 2, klimaat: 2,
    },
    // Met de hand: k_mod,p = 0,60 (tabel NB.2, klimaatklasse 2, kort); k_mod = √(0,9·0,6) = 0,7348.
    handwerk: { k_mod_p: "0.60", k_mod: "0.7348" },
  },
  {
    naam: "30 — gipskarton type H of FH van 12 mm: te dun",
    invoer: {
      opbouw: 3, plaat: 5, gips_type: 2, t_1: 12, middel: 4, d_v: 3.9, d_1: 2.6, l_v: 40, l_g: 22, d_h: 8,
      duur: 4, n_1: 10, n_2: 1, a_1: 100, a_3: 40, a_4: 40, F_v_Ed: 2,
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

  // Eindoordeel en maatgevende UC staan in de slotzin; het oordeel wordt net zo
  // gelezen als de app dat doet (bladResultaat.ts).
  const slot = got.text.lastIndexOf("Maatgevende UC");
  const zin = slot >= 0 ? got.text.slice(slot, slot + 240) : "";
  const m = zin.match(/Maatgevende UC = ([\d.]+|∞)/);
  const ucBlad = m ? (m[1] === "∞" ? Infinity : parseFloat(m[1])) : NaN;
  // Zonder sterkte (k_mod = 0) noemt het blad geen UC maar de reden; zonder
  // uittreksterkte onder trek is de UC oneindig.
  const ucOk = r.kmod === 0
    ? !m && /De verbinding voldoet niet: dit plaatmateriaal/.test(got.text)
    : Number.isFinite(r.UCmax)
      ? Number.isFinite(ucBlad) && Math.abs(ucBlad - r.UCmax) <= Math.max(0.002 * r.UCmax, 1e-4)
      : ucBlad === Infinity;
  const voldoet = !/voldoe[nt] niet/.test(zin) && /voldoe[nt]/.test(zin);
  const wil = r.ok90 && r.UCmax <= 1 && r.detailOk;
  const oordeelOk = voldoet === wil;
  if (!ucOk) fouten++;
  if (!oordeelOk) fouten++;
  console.log(`  ${ucOk ? "OK    " : "FOUT  "} UC_max     ons ${String(ucBlad).padStart(10)}   narekening ${s4(r.UCmax)}`);
  console.log(`  ${oordeelOk ? "OK    " : "FOUT  "} oordeel    ons ${voldoet ? "voldoet" : "voldoet niet"}   narekening ${wil ? "voldoet" : "voldoet niet"}${r.detailOk ? "" : " (detaillering)"}${r.ok90 ? "" : " (splijten niet getoetst)"}`);
}

// Meldingen die in het blad moeten staan, per set.
const MELDINGEN = [
  [9, "gladde nagel axiaal", /geen blijvende of langdurige axiale belasting/],
  [10, "OSB in klimaatklasse 3", /mag in klimaatklasse 3 niet worden toegepast/],
  [12, "vierkante nagel axiaal, als gladde nagel", /geen blijvende of langdurige axiale belasting/],
  [14, "schroefdraad aan de puntzijde", /Schroefdraad aan de puntzijde, 6d \(§8\.7\.2\(3\)\) 20 36 voldoet niet/],
  [15, "hoek buiten 0 tot 90°", /gerekend is met de scherpe hoek tussen kracht en vezel, 30°/],
  [19, "hoogte voor splijten ontbreekt", /Splijten §8\.1\.4 — hoogte h ontbreekt .*voldoet niet: splijten is niet getoetst/],
  [20, "schroefhoek boven 90°", /De hoek tussen de schroefas en de vezel is kleiner dan 30°/],
  [21, "randafstand aan de overkant", /Randafstand aan de overkant, h − a 4 − \(n 2 − 1\)·a 2 50 23\.8 voldoet /],
  [22, "randafstand aan de overkant te klein", /Randafstand aan de overkant, h − a 4 − \(n 2 − 1\)·a 2 20 23\.8 voldoet niet/],
  [23, "hoogte voor splijten ontbreekt bij een onbelaste rand", /Splijten §8\.1\.4 — hoogte h ontbreekt .*voldoet niet: splijten is niet getoetst/],
  [25, "randafstand aan de overkant met een verspringende rij", /Randafstand aan de overkant, h − a 4 − \(n 2 − 1\)·a 2 − d 21\.6 23\.8 voldoet niet/],
  [28, "gipskarton type A in klimaatklasse 2", /mag in klimaatklasse 2 niet worden toegepast \(tabel 3\.1, NB bij 3\.8\(1\) en \(2\)\)/],
  [30, "gipsplaat dunner dan 12,5 mm", /Dikte gipsplaat \(NB bij 3\.8\(3\)\) 12 12\.5 voldoet niet/],
];
for (const [nr, naam, patroon] of MELDINGEN) {
  const v = { ...STANDAARD, ...SETS[nr - 1].invoer };
  const got = reken(tpl, Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)])));
  const ok = patroon.test(got.text);
  if (!ok) fouten++;
  console.log(`\nMelding ${naam} (set ${nr})\n  ${ok ? "OK    " : "FOUT  "} ${patroon.source}`);
}

// Een hoek boven 90° levert dezelfde uitkomst als de scherpe hoek.
for (const [a, b, set] of [[150, 30, SETS[14].invoer], [180, 0, SETS[14].invoer], [120, 60, SETS[15].invoer]]) {
  const uit = (hoek) => reken(tpl, Object.fromEntries(Object.entries({ ...STANDAARD, ...set, α: hoek }).map(([k, x]) => [k, String(x)]))).values;
  const va = uit(a), vb = uit(b);
  const ok = ["n_ef", "UC_v", "F_v_Rd"].every((k) => Number.isFinite(va[k]) && va[k] === vb[k]);
  if (!ok) fouten++;
  console.log(`\nHoek ${a}° tegen ${b}°\n  ${ok ? "OK    " : "FOUT  "} n_ef ${va.n_ef} / ${vb.n_ef}, UC_v ${va.UC_v} / ${vb.UC_v}`);
}

// ══ Ambachtelijke verbindingen: keep, pen-en-gat en zwaluwstaart ═══════════
// Eenheden als hierboven: N, mm, N/mm²; krachten in kN.

/** Per klasse C14..C30, GL24h..GL32h: [f_c,0,k, f_c,90,k, f_v,k, f_t,0,k, γ_M] (EN 338, EN 14080, tabel 2.3). */
const HOUT = [null,
  [16, 2.0, 3.0, 8, 1.3], [17, 2.2, 3.2, 10, 1.3], [18, 2.2, 3.4, 11, 1.3], [19, 2.3, 3.6, 12, 1.3],
  [20, 2.4, 3.8, 13, 1.3], [21, 2.5, 4.0, 14, 1.3], [22, 2.5, 4.0, 16, 1.3], [23, 2.7, 4.0, 18, 1.3],
  [24, 2.5, 3.5, 19.2, 1.25], [28, 2.5, 3.5, 22.3, 1.25], [32, 2.5, 3.5, 25.6, 1.25]];

/** (6.16) met k_c,90 = 1,0; hoek in graden. */
const fcAlfa = (f0, f90, a) => f0 / ((f0 / f90) * Math.sin(rad(a)) ** 2 + Math.cos(rad(a)) ** 2);

function uitwerkingAmbacht(v) {
  const kmod = KMOD_HOUT[v.klimaat][v.duur - 1];
  const rek = (k) => ({ c0: (kmod * HOUT[k][0]) / HOUT[k][4], c90: (kmod * HOUT[k][1]) / HOUT[k][4], v: (kmod * HOUT[k][2]) / HOUT[k][4], t0: (kmod * HOUT[k][3]) / HOUT[k][4] });
  const e1 = rek(v.klasse_1), e2 = rek(v.klasse_2);
  // Splijtsterkte (8.4) naar analogie, naaldhout, w = 1, γ_M = 1,3 voor verbindingen; in N.
  const splijt = (b, h, he) => (kmod * 14 * b * Math.sqrt(he / (1 - he / h))) / 1.3;
  const deel = (eta) => (eta > 0 ? Math.min(Math.max(eta, 0.5), 1) : 1);
  const uc = {};
  let ok = true, geldig = true;

  if (v.soort === 2) {
    // Keepvlak met de normaal onder φ met element 1: β/2 op de middellijn, β haaks op de schoor.
    const b = v.β_k, phi = v.keepvorm === 1 ? b / 2 : b;
    geldig = b > 0 && b < 90 && v.t_v > 0 && v.t_v < v.h_k && v.b_k > 0 && v.h_s > 0 && v.l_vh > 0;
    if (geldig) {
      const sigma = (v.N_s_Ed * 1000 * Math.cos(rad(b - phi)) * Math.cos(rad(phi))) / (v.b_k * v.t_v);
      uc.UC_c1 = sigma / fcAlfa(e1.c0, e1.c90, phi);
      uc.UC_c2 = sigma / fcAlfa(e2.c0, e2.c90, b - phi);
      uc.UC_v = (v.N_s_Ed * 1000 * Math.cos(rad(b))) / (v.b_k * Math.min(v.l_vh, 8 * v.t_v)) / e1.v;
      // Het keepvlak, gemeten over de doorsnede van de schoor, past in de schoor.
      ok = (v.t_v * Math.cos(rad(b - phi))) / Math.cos(rad(phi)) <= v.h_s;
    }
  } else if (v.soort === 3) {
    // Toognagel loodrecht op beide vezels: door h_p bij een balk (stand 1), door b_p bij een stijl.
    const tpt = v.stand === 1 ? v.h_p : v.b_p, tw = v.h_1 - tpt;
    const peg = v.toognagel === 1;
    geldig = v.b_p > 0 && v.h_p > 0 && v.l_p > 0 && v.b_p <= v.b_2 && v.a_o >= 0 && v.a_o + v.h_p <= v.h_2 && v.l_p <= v.l_1 && tw > 0
      && (v.stand !== 1 || (v.e_g > 0 && v.e_g + v.h_p <= v.h_1))
      && (!peg || (v.n_t >= 1 && v.d_t > 0 && v.e_t > v.d_t / 2 && v.e_t + v.d_t / 2 < v.l_p));
    if (geldig) {
      const eta = deel(v.η_in ?? 0);
      // Afschuiving van de pen als uitkeping (6.60)–(6.63): h_ef = h_p, x = l_p/2, i = 0.
      let kv = 1;
      if (v.a_o > 0) {
        const kn = v.klasse_2 >= 9 ? 6.5 : 5, a = v.h_p / v.h_2;
        kv = Math.min(1, kn / (Math.sqrt(v.h_2) * (Math.sqrt(a * (1 - a)) + ((0.8 * v.l_p) / 2 / v.h_2) * Math.sqrt(1 / a - a * a))));
      }
      const V = v.V_Ed * 1000;
      uc.UC_pv = (1.5 * V) / (v.b_p * v.h_p) / (kv * e2.v);
      const sp = V / (v.b_p * v.l_p);
      uc.UC_p2 = sp / e2.c90;
      uc.UC_p1 = sp / (v.stand === 1 ? e1.c90 : e1.c0);
      uc.UC_p90 = v.stand === 1 ? (eta * V) / splijt(v.l_1, v.h_1, v.e_g) : 0;
      uc.UC_b = v.N_c_Ed > 0 ? (v.N_c_Ed * 1000) / (v.b_2 * v.h_2 - v.b_p * v.h_p) / e1.c90 : 0;
      const N = v.N_t_Ed * 1000;
      if (N > 0 && peg) {
        const fvt = (kmod * v.f_v_k_t) / 1.3, fc90t = (kmod * v.f_c_90_k_t) / 1.3;
        uc.UC_tv = N / (v.n_t * 2 * Math.PI * v.d_t ** 2 / 4) / fvt;
        uc.UC_t2 = N / (v.n_t * v.d_t * tpt) / Math.min(e2.c0, fc90t);
        uc.UC_t1 = N / (v.n_t * v.d_t * tw) / Math.min(e1.c90, fc90t);
        uc.UC_ta = N / (2 * v.n_t * tpt * (v.l_p - v.e_t - v.d_t / 2)) / e2.v;
        uc.UC_t90 = (eta * N) / splijt(tw, v.l_1, v.e_t);
      }
      // Trek zonder toognagel: geen weg voor de kracht.
      ok = !(N > 0 && !peg);
    }
  } else {
    geldig = v.b_zh > 0 && v.b_ze > v.b_zh && v.l_z > 0 && v.l_z < v.l_1 && v.t_z > 0 && v.a_k >= 0;
    if (geldig) {
      const N = v.N_t_Ed * 1000, eta = deel(v.η_in ?? 0);
      const g = Math.atan((v.b_ze - v.b_zh) / (2 * v.l_z)) * 180 / Math.PI;
      const sigma = N / (v.t_z * (v.b_ze - v.b_zh));
      uc.UC_z1 = sigma / fcAlfa(e1.c0, e1.c90, g);
      uc.UC_z2 = sigma / fcAlfa(e2.c0, e2.c90, 90 - g);
      uc.UC_zt = N / (v.b_zh * v.t_z) / e2.t0;
      uc.UC_zv = N / (2 * v.t_z * v.l_z) / e2.v;
      uc.UC_z90 = (eta * N) / splijt(v.t_z, v.l_1, v.l_z);
      uc.UC_zk = v.a_k > 0 ? N / (2 * Math.tan(rad(g))) / (v.t_z * v.a_k) / e1.v : 0;
    }
  }
  return { geldig, ok, uc, UCmax: geldig ? Math.max(0, ...Object.values(uc)) : NaN };
}

const KEEP = {
  soort: 2, klimaat: 1, duur: 3, klasse_1: 6, klasse_2: 6, keepvorm: 1, β_k: 40, b_k: 100, h_s: 140, h_k: 200, t_v: 40,
  l_vh: 300, N_s_Ed: 30,
};
const PEN = {
  soort: 3, klimaat: 1, duur: 3, klasse_1: 6, klasse_2: 6, stand: 2, b_p: 40, h_p: 120, l_p: 80, b_2: 100, h_2: 180,
  a_o: 30, l_1: 140, h_1: 140, e_g: 0, V_Ed: 6, N_c_Ed: 0, N_t_Ed: 4, toognagel: 1, n_t: 1, d_t: 20, e_t: 40,
  f_v_k_t: 3.0, f_c_90_k_t: 8.0, η_in: 0,
};
const ZWALUW = {
  soort: 4, klimaat: 1, duur: 3, klasse_1: 6, klasse_2: 6, b_zh: 60, b_ze: 90, l_z: 60, t_z: 60, l_1: 150, a_k: 100,
  N_t_Ed: 5, η_in: 0,
};

const AMBACHT = [
  {
    naam: "A1 — keep op de middellijn, C24, β = 40°, t_v = 40, N = 30 kN",
    invoer: KEEP,
    // Met de hand: σ = 30 000·cos²20°/(100·40) = 6,623; f_c,0,d = 0,8·21/1,3 = 12,92, f_c,90,d = 1,538;
    // f_c,20°,d = 12,92/(8,4·sin²20° + cos²20°) = 6,927; UC = 0,9561 in beide elementen.
    // Voorhout: H = 30·cos 40° = 22,98 kN over min(300; 8·40) = 300 mm: τ = 0,766, UC = 0,766/2,462 = 0,3112.
    handwerk: { σ_c_α_d: "6.623", f_c_α_d_1: "6.927", UC_c1: "0.9561", UC_c2: "0.9561", H_Ed: "22.98", l_v_ef: "300", τ_d: "0.766", UC_v: "0.3112" },
  },
  {
    naam: "A2 — keep haaks op de schoor, verder als A1: element 1 onder 40° maatgevend",
    invoer: { ...KEEP, keepvorm: 2 },
    // Met de hand: A = 100·40/cos 40° = 5222 mm²; σ = 30 000/5222 = 5,745; f_c,40°,d = 12,92/(8,4·0,4132 + 0,5868) = 3,185;
    // UC_1 = 1,804; in de schoor evenwijdig aan de vezel 5,745/12,92 = 0,4446.
    handwerk: { A_k: "5222", σ_c_α_d: "5.745", f_c_α_d_1: "3.185", UC_c1: "1.804", UC_c2: "0.4446" },
  },
  {
    naam: "A3 — keep haaks op de schoor, β = 70°, t_v = 60, N = 10 kN: het keepvlak past niet in de schoor",
    invoer: { ...KEEP, keepvorm: 2, β_k: 70, t_v: 60, N_s_Ed: 10 },
    // Met de hand: het keepvlak is 60/cos 70° = 175,4 mm > h_s = 140: voldoet niet, ook al is UC ≤ 1.
    // σ = 10 000·cos 70°/(100·60) = 0,5700; f_c,70°,d = 12,92/(8,4·0,8830 + 0,1170) = 1,715; UC = 0,3323.
    handwerk: { σ_c_α_d: "0.5700", UC_c1: "0.3323" },
  },
  {
    naam: "A4 — pen-en-gat in een stijl met toognagel 20 mm, V = 6 kN en N_t = 4 kN",
    invoer: PEN,
    // Met de hand: α = 120/180; k_v = 5/(√180·(√(0,6667·0,3333) + 0,8·40/180·√(1,5 − 0,4444))) = 0,5698;
    // τ = 1,5·6000/(40·120) = 1,875; UC = 1,875/(0,5698·2,462) = 1,337. Stuik 6000/(40·80) = 1,875:
    // pen 1,875/1,538 = 1,219, stijl evenwijdig 1,875/12,92 = 0,1451.
    // Toognagel: τ = 4000/(2·π·20²/4) = 6,366, f_v,d = 0,8·3,0/1,3 = 1,846: UC = 3,448;
    // stuik in de pen 4000/(20·40) = 5,0 tegen min(12,92; 0,8·8/1,3 = 4,923): 1,016; in de wangen
    // 4000/(20·100) = 2,0 tegen 1,538: 1,300. Achter het gat 80 − 40 − 10 = 30 mm: τ = 4000/(2·40·30) = 1,667,
    // UC = 0,6771. Splijten (8.4): 0,8·14·100·√(40/(1 − 40/140))/1,3 = 6447 N; UC = 4/6,447 = 0,6204.
    handwerk: { k_v: "0.5698", UC_pv: "1.337", UC_p2: "1.219", UC_p1: "0.1451", t_w: "100", τ_t: "6.366", UC_tv: "3.448", UC_t2: "1.016", UC_t1: "1.300", l_a: "30", UC_ta: "0.6771", F_90_t_Rd: "6.447", UC_t90: "0.6204" },
  },
  {
    naam: "A5 — pen-en-gat, balk C24 in een balk GL24h, V = 4 kN, borst 2 kN, de kracht over twee zijden",
    invoer: { ...PEN, klasse_1: 9, stand: 1, b_p: 50, l_p: 90, a_o: 0, h_1: 300, e_g: 100, V_Ed: 4, N_c_Ed: 2, N_t_Ed: 0, toognagel: 0, η_in: 0.5 },
    // Met de hand: stuik 4000/(50·90) = 0,8889: pen 0,8889/1,538 = 0,5778, balk GL24h 0,8889/(0,8·2,5/1,25) = 0,5556;
    // pen gelijk met de onderkant, k_v = 1: τ = 1,5·4000/(50·120) = 1,0, UC = 0,4063.
    // Splijten (8.4): 0,8·14·140·√(100/(1 − 100/300))/1,3 = 14 773 N; F = 0,5·4 = 2 kN: UC = 0,1354.
    // Borst: 2000/(100·180 − 50·120) = 0,1667 tegen 1,6: UC = 0,1042. Maatgevend 0,5778: voldoet.
    handwerk: { k_v: "1", UC_p2: "0.5778", UC_p1: "0.5556", UC_pv: "0.4063", F_90_Rd: "14.77", F_90_Ed: "2", UC_p90: "0.1354", A_b: "12000", UC_b: "0.1042" },
  },
  {
    naam: "A6 — pen-en-gat op trek zonder toognagel: voldoet niet",
    invoer: { ...PEN, toognagel: 0, V_Ed: 1 },
  },
  {
    naam: "A7 — pen-en-gat met een pen langer dan element 1: niet getoetst",
    invoer: { ...PEN, l_p: 160 },
  },
  {
    naam: "A8 — zwaluwstaart 60/90 × 60, t = 60, N = 5 kN, 100 mm tot het kopse einde",
    invoer: ZWALUW,
    // Met de hand: tan γ = 15/60 = 0,25, γ = 14,04°; σ = 5000/(60·30) = 2,778.
    // Element 1 onder 14,04°: 12,92/(8,4·0,05882 + 0,9412) = 9,004, UC = 0,3085;
    // zwaluwstaart onder 75,96°: 12,92/(8,4·0,9412 + 0,05882) = 1,623, UC = 1,712.
    // Hals: 5000/(60·60) = 1,389 tegen 0,8·14/1,3 = 8,615: 0,1612. Langs de hals 5000/(2·60·60) = 0,6944: 0,2821.
    // Splijten (8.4): 0,8·14·60·√(60/0,6)/1,3 = 5169 N; UC = 0,9673. Kopse einde: Q = 5/(2·0,25) = 10 kN,
    // τ = 10 000/(60·100) = 1,667, UC = 0,6771.
    handwerk: { γ_z: "14.04", σ_z: "2.778", f_c_α_d_1: "9.004", UC_z1: "0.3085", f_c_α_d_2: "1.623", UC_z2: "1.712", UC_zt: "0.1612", UC_zv: "0.2821", F_90_Rd: "5.169", UC_z90: "0.9673", Q_z: "10", UC_zk: "0.6771" },
  },
  {
    naam: "A9 — zwaluwstaart 60/100 × 80, t = 100, GL24h in C24, kort, doorgaand element 1, kracht over twee zijden: voldoet",
    invoer: { ...ZWALUW, klasse_1: 9, duur: 4, b_ze: 100, l_z: 80, t_z: 100, l_1: 200, a_k: 0, η_in: 0.5 },
    // Met de hand: γ = 14,04° (tan 0,25); σ = 5000/(100·40) = 1,25; zwaluwstaart C24 kort f_c,0,d = 14,54,
    // f_c,90,d = 1,731: 14,54/7,965 = 1,825, UC = 0,6848. Splijten: 0,9·14·100·√(80/0,6)/1,3 = 11 192 N,
    // F = 0,5·5 = 2,5 kN: UC = 0,2234.
    handwerk: { UC_z2: "0.6848", F_90_Rd: "11.19", UC_z90: "0.2234" },
  },
  {
    naam: "A10 — zwaluwstaart zonder uitwaaiering: niet getoetst",
    invoer: { ...ZWALUW, b_ze: 60 },
  },
];

// Willekeurige combinaties per soort, met een vaste startwaarde: de uitwerking moet het blad overal volgen.
let zaad = 20260927;
const kies = (lijst) => { zaad = (zaad * 1103515245 + 12345) % 2147483648; return lijst[zaad % lijst.length]; };
for (let k = 0; k < 36; k++) {
  const basis = [KEEP, PEN, ZWALUW][k % 3];
  const v = { ...basis, klimaat: kies([1, 2, 3]), duur: kies([1, 2, 3, 4, 5]), klasse_1: kies([1, 3, 6, 8, 9, 11]), klasse_2: kies([2, 6, 7, 10]) };
  if (v.soort === 2) Object.assign(v, { keepvorm: kies([1, 2]), β_k: kies([25, 35, 45, 55, 65]), t_v: kies([20, 30, 45]), l_vh: kies([150, 250, 400]), N_s_Ed: kies([8, 15, 25]) });
  if (v.soort === 3) Object.assign(v, { stand: kies([1, 2]), a_o: kies([0, 20, 40]), h_1: kies([160, 240]), e_g: kies([40, 80]), V_Ed: kies([0, 3, 6]), N_c_Ed: kies([0, 5]), N_t_Ed: kies([0, 2]), toognagel: kies([1, 1, 0]), n_t: kies([1, 2]), d_t: kies([16, 22]), e_t: kies([30, 45]), η_in: kies([0, 0.5, 0.7]) });
  if (v.soort === 4) Object.assign(v, { b_ze: kies([75, 90, 110]), l_z: kies([50, 70]), t_z: kies([45, 80]), a_k: kies([0, 60, 150]), N_t_Ed: kies([2, 4, 7]), η_in: kies([0, 0.6]) });
  AMBACHT.push({ naam: `A${AMBACHT.length + 1} — willekeurig, soort ${v.soort}`, invoer: v });
}

for (const set of AMBACHT) {
  const v = set.invoer;
  const got = reken(tpl, Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)])));
  const r = uitwerkingAmbacht(v);
  // Een UC van 0 (geen last op dat deel) staat verborgen in het blad.
  const wil = Object.fromEntries(Object.entries(r.uc).filter(([, x]) => x !== 0).map(([k, x]) => [k, ruim(x)]));
  fouten += toets(`${set.naam} — narekening`, got, r.geldig ? wil : {});
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk);

  const slot = got.text.lastIndexOf("Maatgevende UC");
  const zin = slot >= 0 ? got.text.slice(slot, slot + 240) : "";
  const m = zin.match(/Maatgevende UC = ([\d.]+)/);
  const ucBlad = m ? parseFloat(m[1]) : NaN;
  // Zonder geldige invoer noemt het blad geen UC maar "niet bepaald".
  const ucOk = r.geldig
    ? Number.isFinite(ucBlad) && Math.abs(ucBlad - r.UCmax) <= Math.max(0.002 * r.UCmax, 1e-4)
    : !m && /niet bepaald → de verbinding is niet getoetst: invoer onvolledig/.test(zin);
  const voldoet = !/voldoe[nt] niet|niet getoetst/.test(zin) && /voldoe[nt]/.test(zin);
  const wilOordeel = r.geldig && r.ok && r.UCmax <= 1;
  const oordeelOk = voldoet === wilOordeel;
  // De grondslag staat op elk blad van deze soorten.
  const grondslag = /geeft voor een keep, pen-en-gat of zwaluwstaart geen eigen rekenregel/.test(got.text);
  const schoon = !/NaN|Error|Undefined symbol/.test(got.text);
  for (const [ok, wat] of [[ucOk, "UC_max"], [oordeelOk, "oordeel"], [grondslag, "grondslag"], [schoon, "geen NaN of fout"]]) if (!ok) { fouten++; console.log(`  FOUT   ${wat}`); }
  console.log(`  ${ucOk ? "OK    " : "FOUT  "} UC_max     ons ${String(ucBlad).padStart(10)}   narekening ${r.geldig ? s4(r.UCmax) : "niet bepaald"}`);
  console.log(`  ${oordeelOk ? "OK    " : "FOUT  "} oordeel    ons ${voldoet ? "voldoet" : "voldoet niet"}   narekening ${wilOordeel ? "voldoet" : "voldoet niet"}${r.ok ? "" : " (detaillering)"}`);
}

// Meldingen bij de ambachtelijke verbindingen.
const MELDINGEN_AMBACHT = [
  [3, "keepvlak past niet in de schoor", /past niet in de schoor van 140 mm/],
  [3, "keep dieper dan de vuistregel", /De keep is dieper dan de gebruikelijke 33\.33 mm .*geen eis van EN 1995-1-1/],
  [3, "oordeel bij een keepvlak dat niet past", /voldoet niet: het keepvlak past niet in de schoor/],
  [6, "trek zonder toognagel", /Zonder toognagel neemt pen-en-gat geen trek op/],
  [6, "oordeel trek zonder toognagel", /voldoet niet: trek zonder toognagel/],
  [7, "maten van pen-en-gat passen niet", /De maten passen niet/],
  [10, "zwaluwstaart zonder uitwaaiering", /Vul een hals, een breedere einde/],
  [2, "aanname voor het voorhout, geen normregel", /ten hoogste 8·t\s*v\s*: een gebruikelijke aanname, de norm geeft hiervoor geen regel/],
];
for (const [nr, naam, patroon] of MELDINGEN_AMBACHT) {
  const v = AMBACHT[nr - 1].invoer;
  const got = reken(tpl, Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)])));
  const ok = patroon.test(got.text);
  if (!ok) fouten++;
  console.log(`\nMelding ${naam} (set A${nr})\n  ${ok ? "OK    " : "FOUT  "} ${patroon.source}`);
}

afronden(fouten, "Nagel- en schroefverbinding");
