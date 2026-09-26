/**
 * Controlescript voor de module Stabiliteit HSB-wanden (EN 1995-1-1 §9.2.4.2).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten daarom op twee manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript van dezelfde normregels:
 *      Johansen (8.6) met de stuiksterkten (8.15), (8.20), (8.22), NB.8.1 en
 *      NB.8.2 en het vloeimoment (8.14) per soort nagel, de sterkte in het
 *      wandvlak (9.21)/(9.22) met de regels voor restpanelen, dubbelzijdige
 *      beplating (§9.2.4.2(7)), NB (17) en (18), de verdeling met torsie voor
 *      een last op B/2 ± e_F, de ankerkracht (9.23) met de meetellende lengte
 *      als hefboom en alleen de last op de eindstijl als ontlasting (methode A),
 *      de eindstijl (6.23)/(6.24), de druk loodrecht op de onderregel (6.3), de
 *      schuifspanning in de beplating en de indicatieve verplaatsing. Het blad
 *      moet daar op vier significante cijfers mee overeenkomen.
 *   2. Voor een paar gevallen getallen die met de hand zijn nagerekend, zodat
 *      een fout die in beide uitwerkingen zit niet onopgemerkt blijft.
 *
 * De uitdraai toont per wand alleen de krachten en de unity checks in
 * tabellen; de tussenstappen staan achter #hide. Daarom rekent dit script het
 * blad een tweede keer door met alle regels zichtbaar en leest het de waarden
 * daaruit. De teksttoetsen (meldingen, eindoordeel) lezen de echte uitdraai.
 *
 * Draaien:  node scripts/check-hsb-stabiliteit.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("hsbStabiliteit.ts");
/** Hetzelfde blad met elke regel zichtbaar: de rekenwaarden, niet de afdruk. */
const tplAlles = tpl.replace(/^[ \t]*#(hide|show)\b.*$/gm, "");

// ── Standaardinvoer: dezelfde waarden als het parametrische beeld seedt ──────
// Velden die het beeld niet seedt (G_pl, K_ser, u_a, a_op, M_y,Rk, type
// gipsplaat) staan in het blad op 0 of op de eerste keuze.
const STANDAARD = {
  klimaat: 1, lastinvoer: 1, F_w_k: 20, F_v_Ed: 30, B_gevel: 10, e_F: 0,
  sterkteklasse: 6, b_st: 38, h_st: 140, hoh: 600, n_eind: 2, h_w: 2600,
  plaat_A: 1, t_A: 12, b_pl_A: 1200, s_A: 100, f_v_A: 6.8,
  bevestiging_A: 1, d_A: 2.8, l_A: 65, bron_A: 1, f_u_A: 600, F_ax_A: 0, ρ_pl_A: 450, F_f_Rd_A: 0.4,
  plaat_B: 5, t_B: 12.5, b_pl_B: 1200, s_B: 100, f_v_B: 6.8,
  bevestiging_B: 3, d_B: 2.75, l_B: 35, bron_B: 1, f_u_B: 600, F_ax_B: 0, ρ_pl_B: 450, F_f_Rd_B: 0.3,
  n_wanden: 3, cat_Q: 1, F_a_Rd: 15, v_Rd: 8, naad: 0, gelijke_k: 0,
  L_1: 3600, zijden_1: 1, x_1: 0, G_k_1: 4, Q_k_1: 2, w_k_1: 0.6,
  L_2: 2400, zijden_2: 3, x_2: 10, G_k_2: 4, Q_k_2: 2, w_k_2: 0.6,
  L_3: 3000, zijden_3: 5, x_3: 5, G_k_3: 6, Q_k_3: 3, w_k_3: 0,
  L_4: 2400, zijden_4: 1, x_4: 2.5, G_k_4: 4, Q_k_4: 2, w_k_4: 0,
  L_5: 2400, zijden_5: 1, x_5: 7.5, G_k_5: 4, Q_k_5: 2, w_k_5: 0,
  L_6: 2400, zijden_6: 1, x_6: 8.5, G_k_6: 4, Q_k_6: 2, w_k_6: 0,
};

// ── Onafhankelijke uitwerking ─────────────────────────────────────────────
// Eenheden: N, mm, N/mm² — behalve waar kN of m erbij staat.

/** EN 338: [f_m,k, f_c,0,k, f_c,90,k, E_0,05, ρ_k, ρ_mean, E_0,mean] per sterkteklasse 1..8 (C14..C30). */
const HOUT = [null,
  [14, 16, 2.0, 4700, 290, 350, 7000], [16, 17, 2.2, 5400, 310, 370, 8000], [18, 18, 2.2, 6000, 320, 380, 9000],
  [20, 19, 2.3, 6400, 330, 390, 9500], [22, 20, 2.4, 6700, 340, 410, 10000], [24, 21, 2.5, 7400, 350, 420, 11000],
  [27, 22, 2.6, 7700, 370, 450, 11500], [30, 23, 2.7, 8000, 380, 460, 12000]];

/** k_mod bij kort, per plaat (1..6) en klimaatklasse (1..3); 0 = niet toegestaan. */
const KMOD_PLAAT = [null,
  [0.90, 0.70, 0], [0.90, 0.70, 0], [0.85, 0.60, 0], [0.90, 0.90, 0.70], [0.80, 0.60, 0], [0.80, 0.60, 0]];
const GAMMA_PLAAT = [null, 1.2, 1.2, 1.3, 1.2, 1.3, 1.3];

const of0 = (x) => x ?? 0;

function verbindingsmiddel(v, P, rhoK, rhoM, kmodHout) {
  const plaat = v[`plaat_${P}`], t = v[`t_${P}`], d = v[`d_${P}`], l = v[`l_${P}`];
  const bev = v[`bevestiging_${P}`];
  // Gipskarton type A of F mag alleen in klimaatklasse 1 (NB bij 3.8(1)).
  const gipsAF = plaat === 5 && (v[`gips_${P}`] ?? 1) === 1 && v.klimaat >= 2;
  const kmodPl = gipsAF ? 0 : KMOD_PLAAT[plaat][v.klimaat - 1];
  // Verschuivingsmodulus: ingevoerd, of Tabel 7.1 met ρ_m van het hout (schroef
  // ρ_m^1,5·d/23, nagel zonder voorboren ρ_m^1,5·d^0,8/30); bij gips onbekend.
  const K = of0(v[`K_ser_${P}`]) > 0 ? v[`K_ser_${P}`] : plaat >= 5 ? 0
    : bev === 3 ? (rhoM ** 1.5 * d) / 23 : (rhoM ** 1.5 * d ** 0.8) / 30;
  let FfRd;
  if (v[`bron_${P}`] === 1) {
    const fh1 =
      plaat <= 3 ? 65 * d ** -0.7 * t ** 0.1
      : plaat === 4 ? 0.11 * v[`ρ_pl_${P}`] * d ** -0.3
      : plaat === 5 ? 3.9 * d ** -0.6 * t ** 0.7
      : 7 * d ** -0.7 * t ** 0.9;
    const fh2 = 0.082 * rhoK * d ** -0.3;
    // (8.14): 0,3 voor ronde nagels (glad, geprofileerd) en schroeven, 0,45 voor
    // vierkante en gegroefde; bij een geprofileerde nagel mag M_y,Rk uit de DoP.
    const MyDoP = bev === 2 ? of0(v[`M_y_Rk_${P}`]) : 0;
    const My = MyDoP > 0 ? MyDoP : (bev === 4 ? 0.45 : 0.3) * v[`f_u_${P}`] * d ** 2.6;
    const t1 = t, t2 = Math.max(l - t, 0.1), b = fh2 / fh1, r = t2 / t1;
    const a = fh1 * t1 * d;
    const bb = fh2 * t2 * d;
    const c = (fh1 * t1 * d) / (1 + b) * (Math.sqrt(b + 2 * b * b * (1 + r + r * r) + b ** 3 * r * r) - b * (1 + r));
    const dd = 1.05 * (fh1 * t1 * d) / (2 + b) * (Math.sqrt(2 * b * (1 + b) + (4 * b * (2 + b) * My) / (fh1 * d * t1 * t1)) - b);
    const e = 1.05 * (fh1 * t2 * d) / (1 + 2 * b) * (Math.sqrt(2 * b * b * (1 + b) + (4 * b * (1 + 2 * b) * My) / (fh1 * d * t2 * t2)) - b);
    const f = 1.15 * Math.sqrt((2 * b) / (1 + b)) * Math.sqrt(2 * My * fh1 * d);
    const pAx = plaat >= 5 ? 0 : bev === 1 ? 0.15 : bev === 3 ? 1 : 0.25;
    const koord = (x) => x + Math.min(v[`F_ax_${P}`] / 4, pAx * x);
    const FvRk = Math.min(a, bb, koord(c), koord(dd), koord(e), koord(f));
    FfRd = (Math.sqrt(kmodHout * kmodPl) * FvRk) / 1.3 / 1000; // kN
    return { FvRk, FfRd, kmodPl, K, rand: 1.2 * FfRd };
  }
  FfRd = v[`F_f_Rd_${P}`];
  return { FvRk: NaN, FfRd, kmodPl, K, rand: 1.2 * FfRd };
}

function uitwerking(v) {
  const [fmk, fc0k, fc90k, E005, rhoK, rhoM, E0mean] = HOUT[v.sterkteklasse];
  const gG = v.CC === 1 ? 1.1 : v.CC === 3 ? 1.3 : 1.2;
  const gQ = v.CC === 1 ? 1.35 : v.CC === 3 ? 1.65 : 1.5;
  const kmod = v.klimaat === 3 ? 0.7 : 0.9;
  const kh = v.h_st < 150 ? Math.min(1.3, (150 / v.h_st) ** 0.2) : 1;
  const fmd = (kh * kmod * fmk) / 1.3, fc0d = (kmod * fc0k) / 1.3, fc90d = (kmod * fc90k) / 1.3;
  const FvEd = v.lastinvoer === 1 ? gQ * v.F_w_k : v.F_v_Ed;
  const hw = v.h_w;

  const A = verbindingsmiddel(v, "A", rhoK, rhoM, kmod);
  const B = verbindingsmiddel(v, "B", rhoK, rhoM, kmod);
  const PL = { A, B };
  const k18 = (P) => (v[`plaat_${P}`] >= 5 ? Math.min(1, (35 * v[`t_${P}`]) / v.hoh) : 1);
  const fvd = (P) => (PL[P].kmodPl * (v[`plaat_${P}`] === 5 ? 1.0 : v[`f_v_${P}`])) / GAMMA_PLAAT[v[`plaat_${P}`]];

  const b0 = hw / 2;
  const ci = (b) => Math.min(1, b / b0);
  const kNaad = (b) => (v.naad === 1 && b < 0.5 * hw ? 0.85 : 1);
  const paneel = (P, b) => (b >= hw / 4 ? 1 : 0) * (PL[P].rand * b * ci(b) * kNaad(b) * k18(P)) / v[`s_${P}`];
  const zijde = (P, L) => {
    const bpl = v[`b_pl_${P}`], n = Math.floor(L / bpl);
    return n * paneel(P, bpl) + paneel(P, L - n * bpl);
  };
  // Hefboom (9.23) per zijde: het breedste paneel b_e draagt F·R_p(b_e)/R en
  // krijgt dus F·h/L_e met L_e = R·b_e/R_p(b_e). Zonder sterkte de wandlengte.
  const be = (P, L) => Math.min(L, v[`b_pl_${P}`]);
  const Le = (P, L) => {
    const rp = paneel(P, be(P, L));
    return rp > 0 ? (zijde(P, L) * be(P, L)) / rp : L;
  };
  const Lef = (L, z) => (z === 3 ? Math.min(Le("A", L), Le("B", L)) : z === 2 || z === 5 ? Le("B", L) : Le("A", L));
  const zelfde = v.plaat_A === v.plaat_B && v.t_A === v.t_B && v.bevestiging_A === v.bevestiging_B && v.d_A === v.d_B && v.l_A === v.l_B;
  const fZwak = zelfde ? 1 : v.gelijke_k === 1 ? 0.75 : 0.5;
  const sterkte = (L, z) => {
    const ra = zijde("A", L), rb = zijde("B", L);
    return z === 1 ? ra : z === 2 ? rb : z === 3 ? Math.max(ra, rb) + fZwak * Math.min(ra, rb) : z === 4 ? 2 * ra : 2 * rb;
  };

  const wanden = [];
  for (let j = 1; j <= 6; j++) {
    const actief = j <= v.n_wanden;
    const L = actief ? v[`L_${j}`] : 0;
    const z = actief ? v[`zijden_${j}`] : 1;
    wanden.push({ j, actief, L, z, x: actief ? v[`x_${j}`] : 0, G: actief ? v[`G_k_${j}`] : 0,
      Q: actief ? v[`Q_k_${j}`] : 0, w: actief ? v[`w_k_${j}`] : 0, aOp: actief ? of0(v[`a_op_${j}`]) : 0,
      R: sterkte(L, z) });
  }
  const Rtot = wanden.reduce((s, w) => s + w.R, 0);
  const xc = wanden.reduce((s, w) => s + w.R * w.x, 0) / Math.max(Rtot, 0.001);
  // De excentriciteit geldt naar beide kanten (asymmetrische wind).
  const eF = Math.abs(v.e_F);
  const MtA = FvEd * (v.B_gevel / 2 + eF - xc);
  const MtB = FvEd * (v.B_gevel / 2 - eF - xc);
  const IR = wanden.reduce((s, w) => s + w.R * (w.x - xc) ** 2, 0);

  const psi0 = [null, 0.4, 0.5, 0.6, 0.4, 1.0, 0][v.cat_Q];
  const aE = v.hoh / 2;
  const Aeind = v.n_eind * v.b_st * v.h_st;
  const Weind = (v.n_eind * v.b_st * v.h_st ** 2) / 6;
  const lrel = (lam) => (lam / Math.PI) * Math.sqrt(fc0k / E005);
  const kc = (lr) => {
    const k = 0.5 * (1 + 0.2 * (lr - 0.3) + lr * lr);
    return Math.min(1, 1 / (k + Math.sqrt(k * k - lr * lr)));
  };
  const kcy = kc(lrel(hw / (v.h_st / Math.sqrt(12))));
  const kcz = kc(lrel(Math.max(v.s_A, v.s_B) / ((v.n_eind * v.b_st) / Math.sqrt(12))));
  const Aef = v.h_st * (v.n_eind * v.b_st + 30);
  const Gpl = { A: of0(v.G_pl_A), B: of0(v.G_pl_B) };
  const bekend = (P) => PL[P].K > 0 && Gpl[P] > 0;

  for (const w of wanden) {
    const dF = IR > 0.001 ? Math.max((MtA * w.R * (w.x - xc)) / IR, (MtB * w.R * (w.x - xc)) / IR) : 0;
    w.F = (FvEd * w.R) / Math.max(Rtot, 0.001) + Math.max(0, dF);
    if (!w.actief) continue;
    w.Lef = Lef(w.L, w.z);
    const Ft = (w.F * hw) / Math.max(w.Lef, 1);
    // Methode A: alleen de last op de eindstijl zelf ontlast het anker.
    w.Nt = Math.max(0, Ft - (0.9 * w.G * aE) / 1000);
    w.Nc = Ft + ((gG * w.G + gQ * psi0 * w.Q) * (aE + w.aOp)) / 1000;
    const Mw = (gQ * w.w * (aE + w.aOp) * hw * hw) / 8 / 1e3; // N·mm, met w in kN/m² = 1e-3 N/mm²
    const sc = (w.Nc * 1000) / Aeind, sm = Mw / Weind;
    w.UCst = Math.max(sc / (kcy * fc0d) + sm / fmd, sc / (kcz * fc0d) + (0.7 * sm) / fmd);
    w.UCc90 = (w.Nc * 1000) / (Aef * 1.25 * fc90d);
    w.UCgl = w.F / (v.v_Rd * (Math.max(w.L, 1) / 1000));
    w.UCa = w.Nt / v.F_a_Rd;
    w.UCr = w.F / Math.max(w.R, 0.001);
    const ra = zijde("A", w.L), rb = zijde("B", w.L);
    const cA = ra >= rb ? ra : fZwak * ra, cB = rb > ra ? rb : fZwak * rb;
    const aA = w.z === 1 ? 1 : w.z === 2 ? 0 : w.z === 3 ? cA / Math.max(cA + cB, 0.001) : w.z === 4 ? 0.5 : 0;
    const aB = w.z === 1 ? 0 : w.z === 2 ? 1 : w.z === 3 ? cB / Math.max(cA + cB, 0.001) : w.z === 4 ? 0 : 0.5;
    // Een zijde zonder aandeel telt niet mee; een niet-toegestane plaat heeft
    // geen sterkte en maakt de toets onvoldoende als hij toch zou dragen. De
    // schuifspanning zit in het volle paneel: F·a/(L_e·t).
    const u = (aX, t, P) => (aX > 0 ? (w.F * 1000 * aX) / (Math.max(Le(P, w.L), 1) * t) / Math.max(fvd(P), 0.001) : 0);
    w.UCpl = Math.max(u(aA, v.t_A, "A"), u(aB, v.t_B, "B"));
    // Verplaatsing bij F/γ_Q: per zijde slip + afschuiving van het volle paneel,
    // daarbij ankerslip en rek van de eindstijlen over de hefboom L_ef.
    w.onb = (aA > 0 && !bekend("A")) || (aB > 0 && !bekend("B"));
    const Fk = (w.F / gQ) * 1000;
    const vz = (aX, P) => {
      if (aX <= 0) return 0;
      const b = be(P, w.L);
      return (Fk * aX * ((2 * v[`s_${P}`] * (b + hw)) / (PL[P].K * b) + hw / (Gpl[P] * v[`t_${P}`]))) / Math.max(Le(P, w.L), 1);
    };
    w.u = w.onb ? 0 : Math.max(vz(aA, "A"), vz(aB, "B"))
      + (of0(v.u_a) + (2 * Fk * hw * hw) / (Math.max(w.Lef, 1) * E0mean * Aeind)) * hw / Math.max(w.Lef, 1);
    w.UCu = w.u / (hw / 300);
    w.UC = Math.max(w.UCr, w.UCa, w.UCst, w.UCc90, w.UCgl, w.UCpl, w.UCu);
  }
  // Zonder enige sterkte (R_tot = 0) beslist de bouwlaag als geheel.
  const UCmax = Math.max(...wanden.filter((w) => w.actief).map((w) => w.UC), FvEd / Math.max(Rtot, 0.001));
  return { A, B, FvEd, Rtot, wanden, UCmax };
}

// ── Vergelijken ───────────────────────────────────────────────────────────
/** Vier significante cijfers als string, zodat toets() de passende tolerantie kiest. */
const s4 = (x) => {
  if (x === 0) return "0";
  const d = Math.max(0, 3 - Math.floor(Math.log10(Math.abs(x))));
  return x.toFixed(d);
};

/**
 * Het blad rondt uitkomsten af op vier significante cijfers; de narekening
 * niet. Op een afrondgrens kan dat één eenheid in het laatste cijfer schelen,
 * daarom een tolerantie van 0,2 % in plaats van een halve eenheid.
 */
const ruim = (x) => ({ waarde: s4(x), tol: Math.max(Math.abs(x) * 0.002, 1e-6) });

function verwachtingen(r, v) {
  const uit = {};
  if (v.bron_A === 1) uit.F_v_Rk_A = ruim(r.A.FvRk);
  if (v.bron_B === 1) uit.F_v_Rk_B = ruim(r.B.FvRk);
  uit.F_f_rand_A = ruim(r.A.rand);
  uit.F_f_rand_B = ruim(r.B.rand);
  // Een ingevoerde rekenwaarde is een invoerveld en geen rekenregel.
  if (v.lastinvoer === 1) uit.F_v_Ed = ruim(r.FvEd);
  uit.R_tot = ruim(r.Rtot);
  for (const w of r.wanden.filter((w) => w.actief)) {
    const j = w.j;
    Object.assign(uit, {
      [`R_${j}`]: ruim(w.R), [`F_${j}`]: ruim(w.F), [`UC_r_${j}`]: ruim(w.UCr), [`L_ef_${j}`]: ruim(w.Lef),
      [`N_t_${j}`]: ruim(w.Nt), [`UC_a_${j}`]: ruim(w.UCa), [`N_c_${j}`]: ruim(w.Nc),
      [`UC_st_${j}`]: ruim(w.UCst), [`UC_c90_${j}`]: ruim(w.UCc90), [`UC_gl_${j}`]: ruim(w.UCgl),
      [`UC_pl_${j}`]: ruim(w.UCpl), [`u_${j}`]: ruim(w.u), [`onb_${j}`]: w.onb ? "1" : "0", [`UC_w_${j}`]: ruim(w.UC),
    });
  }
  return uit;
}

const SETS = [
  {
    naam: "1 — standaard: OSB/3 met gladde nagels, gipskarton met schroeven, 3 wanden, torsie uit de sterkteverdeling",
    invoer: {}, project: { CC: 2, K_FI: 1 },
    // Met de hand nagerekend (zie de uitleg bovenaan):
    //   f_h,1 = 65·2,8^-0,7·12^0,1 = 40,53; f_h,2 = 0,082·350·2,8^-0,3 = 21,07;
    //   β = 0,520; M_y = 0,3·600·2,8^2,6 = 2617 Nmm → mechanisme (d) = 587,7 N.
    //   Wand 1: 3 panelen × 0,4883·1200·(1200/1300)/100 = 16,23 kN.
    //   Wand 2: A 10,82 + ½ × B 4,418 = 13,03 kN (gips ×35·12,5/600).
    //   Wand 3: 2 × (2 panelen gips; rest 600 < h/4 = 650 telt niet) = 8,837 kN.
    //   F_2 = 30·13,03/38,09 + 1,228 (torsie) = 11,49 kN.
    //   Anker, methode A — alleen de last op de eindstijl, a_eind = 600/2 = 300 mm:
    //   N_t,1 = 12,78·2,6/3,6 − 0,9·4·0,3 = 9,23 − 1,08 = 8,15 kN;
    //   N_t,2 = 11,49·2,6/2,4 − 1,08 = 12,45 − 1,08 = 11,37 kN (F_2 afgerond, vandaar 0,01).
    //   Wand 3: hefboom = de twee volle panelen, L_ef = 2400 mm (het restpaneel telt niet):
    //   F_t,3 = 7,025·2,6/2,4 = 7,61 kN; N_c,3 = 7,61 + (1,2·6 + 1,5·0,4·3)·0,3 = 10,31 kN.
    handwerk: {
      F_v_Rk_A: "587.7", R_1: "16.23", R_2: "13.03", R_3: "8.837", F_2: "11.49", N_t_1: "8.15",
      N_t_2: { waarde: "11.37", tol: 0.01, waarom: "F_2 = 11,49 afgerond" }, L_ef_3: "2400", N_c_3: "10.31",
    },
  },
  {
    naam: "2 — CC1, klimaatklasse 2, multiplex met geprofileerde nagels en koordeffect, horizontale naad, excentrische last, gipskarton type H",
    invoer: {
      lastinvoer: 2, F_v_Ed: 24, e_F: 1.5, klimaat: 2, sterkteklasse: 3, h_st: 120,
      plaat_A: 4, t_A: 15, ρ_pl_A: 410, bevestiging_A: 2, d_A: 3.1, l_A: 75, F_ax_A: 400, s_A: 75,
      b_pl_A: 1220, naad: 1, gelijke_k: 1, zijden_3: 3, gips_B: 2,
    },
    project: { CC: 1, K_FI: 0.9 },
  },
  {
    naam: "3 — CC3, spaanplaat P5 met schroeven, gipsvezelplaat, één wand met een excentrische last",
    invoer: {
      n_wanden: 1, e_F: 2, plaat_A: 3, t_A: 18, bevestiging_A: 3, d_A: 4.4, l_A: 60, f_u_A: 800, F_ax_A: 900,
      plaat_B: 6, t_B: 15, f_v_B: 2.5, bevestiging_B: 1, d_B: 2.5, l_B: 45, zijden_1: 3, L_1: 5000,
    },
    project: { CC: 3, K_FI: 1.1 },
  },
  {
    naam: "4 — klimaatklasse 3: OSB niet toegestaan, multiplex wel",
    invoer: { klimaat: 3, plaat_B: 4, t_B: 18, zijden_2: 2, zijden_3: 2 },
    project: { CC: 2, K_FI: 1 },
  },
  {
    naam: "5 — zes wanden, rekenwaarde per verbindingsmiddel ingevoerd, 2× A en 2× B, C18 met één eindstijl",
    invoer: {
      n_wanden: 6, bron_A: 2, F_f_Rd_A: 0.45, bron_B: 2, F_f_Rd_B: 0.25, sterkteklasse: 3, n_eind: 1,
      zijden_1: 4, zijden_4: 5, zijden_5: 3, zijden_6: 2, L_4: 1800, L_5: 4800, L_6: 900, e_F: -1,
      w_k_4: 0.8, F_w_k: 35,
    },
    project: { CC: 2, K_FI: 1 },
  },
  {
    naam: "6 — één wand van 3000 mm: restpaneel 600 < h/4 telt niet mee, ook niet in de hefboom",
    invoer: { n_wanden: 1, L_1: 3000, x_1: 5, F_w_k: 7, G_k_1: 1, F_a_Rd: 9 },
    project: { CC: 2, K_FI: 1 },
    // R_1 = 2 × 0,4883·1200·(1200/1300)/100 = 10,82 kN; F_1 = 1,5·7 = 10,5 kN.
    // Hefboom = de twee volle panelen, 2400 mm: F_t = 10,5·2,6/2,4 = 11,375 kN;
    // N_t = 11,375 − 0,9·1·0,3 = 11,105 kN → UC_a = 11,105/9 = 1,234.
    handwerk: { R_1: "10.82", F_1: "10.5", L_ef_1: "2400", N_t_1: "11.11", UC_a_1: "1.234" },
  },
  {
    naam: "7 — één wand van 3300 mm: restpaneel 900 tussen h/4 en h/2 telt naar rato van c_i",
    invoer: { n_wanden: 1, L_1: 3300, x_1: 5, F_w_k: 7, G_k_1: 1, F_a_Rd: 9 },
    project: { CC: 2, K_FI: 1 },
    // R_1 = 10,818 + 0,4883·900·(900/1300)/100 = 13,86 kN.
    // L_ef = 2400 + 900·(900/1300)/(1200/1300) = 2400 + 675 = 3075 mm;
    // N_t = 10,5·2600/3075 − 0,27 = 8,878 − 0,27 = 8,608 kN.
    handwerk: { R_1: "13.86", L_ef_1: "3075", N_t_1: "8.608" },
  },
  {
    naam: "8 — standaard, wand 1 naast een raam van 1,8 m: eindstijl draagt de halve opening mee",
    invoer: { a_op_1: 900 },
    project: { CC: 2, K_FI: 1 },
    // F_t,1 = 9,23 kN; N_c,1 = 9,23 + (1,2·4 + 1,5·0,4·2)·(0,3 + 0,9) = 9,23 + 7,2 = 16,43 kN.
    // M_w = 1,5·0,6·1,2·2,6²/8 = 0,9126 kNm; λ_rel,y = 1,091, k_c,y = 0,6218;
    // UC_st = 16430/10640/(0,6218·14,54) + 0,9126e6/248267/16,85 = 0,389;
    // UC_c90 = 16430/(14840·1,25·1,731) = 0,512.
    handwerk: { N_c_1: "16.43", UC_st_1: "0.389", UC_c90_1: "0.512", N_t_1: "8.15" },
  },
  {
    naam: "9 — standaard met e_F = ±1 m: elke wand krijgt het torsiedeel van de ongunstige kant",
    invoer: { e_F: 1 },
    project: { CC: 2, K_FI: 1 },
    // x_c = 4,58 m, I_R = 724,6 kNm². Wand 1 is maatgevend met de last op 4 m:
    //   M_t = 30·(4 − 4,58) = −17,4 kNm; F_1 = 30·16,23/38,09 + 17,4·16,23·4,58/724,6
    //   = 12,78 + 1,785 = 14,565 kN (op de afrondgrens, vandaar 0,01).
    // Wand 2 met de last op 6 m: M_t = 30·(6 − 4,58) = 42,6 kNm;
    //   F_2 = 30·13,03/38,09 + 42,6·13,03·5,42/724,6 = 10,26 + 4,15 = 14,41 kN.
    // Met een eenzijdige e_F kreeg steeds één van beide te weinig.
    handwerk: { F_1: { waarde: "14.565", tol: 0.01, waarom: "op de afrondgrens" }, F_2: "14.41" },
  },
  {
    naam: "10 — dezelfde set met e_F = −1 m: hetzelfde resultaat",
    invoer: { e_F: -1 },
    project: { CC: 2, K_FI: 1 },
    handwerk: { F_1: { waarde: "14.565", tol: 0.01, waarom: "op de afrondgrens" }, F_2: "14.41" },
  },
  {
    naam: "11 — standaard met een geprofileerde nagel voor A: vloeimoment 0,3·f_u·d^2,6, net als glad",
    invoer: { bevestiging_A: 2 },
    project: { CC: 2, K_FI: 1 },
    // F_ax = 0, dus het koordeffect speelt niet: dezelfde 587,7 N en 16,23 kN als glad.
    handwerk: { F_v_Rk_A: "587.7", R_1: "16.23" },
  },
  {
    naam: "12 — standaard met een vierkante nagel voor A en een geprofileerde met M_y,Rk uit de DoP voor B",
    invoer: { bevestiging_A: 4, bevestiging_B: 2, M_y_Rk_B: 3000 },
    project: { CC: 2, K_FI: 1 },
    // M_y = 0,45·600·2,8^2,6 = 3926 Nmm → mechanisme (d) = 661,2 N.
    handwerk: { F_v_Rk_A: "661.2" },
  },
  {
    naam: "13 — standaard met G en K_ser ingevuld en 2 mm ankerslip: de verplaatsing",
    invoer: { G_pl_A: 1080, G_pl_B: 700, K_ser_B: 250, u_a: 2 },
    project: { CC: 2, K_FI: 1 },
    // Wand 1, F_k = 12,78/1,5 = 8,52 kN in panelen van 1200:
    //   K_ser = 420^1,5·2,8^0,8/30 = 653,9 N/mm (Tabel 7.1);
    //   slip = 2·8520·100·(1200 + 2600)/(653,9·1200·3600) = 2,292 mm;
    //   plaat = 8520·2600/(1080·12·3600) = 0,475 mm;
    //   anker = 2·2600/3600 = 1,444 mm; eindstijlen 2·6153·2600/(11000·10640)·2600/3600 = 0,197 mm;
    //   u = 4,409 mm → UC = 4,409/(2600/300) = 0,509.
    handwerk: { u_1: "4.409", UC_u_1: "0.509" },
  },
  {
    naam: "14 — als 13, maar beplating A met schroeven: K_ser uit Tabel 7.1 voor schroeven",
    invoer: { bevestiging_A: 3, G_pl_A: 1080, G_pl_B: 700, K_ser_B: 250, u_a: 2 },
    project: { CC: 2, K_FI: 1 },
    // F_ax = 0: F_v,Rk,A blijft 587,7 N, R_1 blijft 16,23 kN.
    //   K_ser = 420^1,5·2,8/23 = 1047,9 N/mm (schroef, Tabel 7.1);
    //   slip = 2·2840·100·3800/(1047,9·1200²) = 1,431 mm; plaat 0,475, anker 1,444,
    //   eindstijlen 0,197 mm → u = 3,547 mm.
    handwerk: { R_1: "16.23", u_1: "3.547" },
  },
  {
    naam: "15 — één wand van 600 mm < h/4: geen sterkte, de bouwlaag voldoet niet",
    invoer: { n_wanden: 1, L_1: 600 },
    project: { CC: 2, K_FI: 1 },
    // R_1 = 0 (§9.2.4.2(2)), dus R_tot = 0 en UC_totaal = 30/0,001 = 30 000.
    handwerk: { R_1: "0", R_tot: "0" },
  },
];

let fouten = 0;
for (const set of SETS) {
  const v = { ...STANDAARD, ...set.invoer, CC: set.project.CC };
  const selectValues = Object.fromEntries(Object.entries({ ...STANDAARD, ...set.invoer }).map(([k, x]) => [k, String(x)]));
  const got = reken(tplAlles, selectValues, set.project);
  const echt = reken(tpl, selectValues, set.project);
  const r = uitwerking(v);
  fouten += toets(`${set.naam} — narekening`, got, verwachtingen(r, v));
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk);

  // Het eindoordeel staat in een tekstregel van de uitdraai; neem de maatgevende UC daaruit over.
  const m = echt.text.match(/Maatgevende UC = ([\d.]+)/);
  const ucBlad = m ? parseFloat(m[1]) : NaN;
  const ok = Number.isFinite(ucBlad) ? Math.abs(ucBlad - r.UCmax) <= Math.max(0.002 * r.UCmax, 1e-4) : r.UCmax > 1e6;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} UC_max     ons ${String(ucBlad).padStart(10)}   narekening ${s4(r.UCmax)}`);
}

/** Toetst of een tekst in de echte uitdraai staat (of juist niet). */
function tekst(naam, invoer, project, eisen) {
  const selectValues = Object.fromEntries(Object.entries({ ...STANDAARD, ...invoer }).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, selectValues, project);
  const ok = eisen.every(([re, moet]) => re.test(got.text) === moet);
  if (!ok) fouten++;
  console.log(`\n${naam}\n  ${ok ? "OK    " : "FOUT  "} ${eisen.map(([re, moet]) => `${moet ? "" : "geen "}${re.source}`).join("; ")}`);
}

// Klimaatklasse 3 met OSB moet expliciet als niet toegestaan in het blad staan.
tekst("OSB in klimaatklasse 3", { klimaat: 3 }, { CC: 2, K_FI: 1 },
  [[/Plaatmateriaal A is in klimaatklasse 3 niet toegestaan/, true], [/voldoen niet/, true]]);
// Gipskarton type A of F mag niet in klimaatklasse 2 (NB bij 3.8(1)); type H wel.
tekst("gipskarton type A in klimaatklasse 2", { klimaat: 2 }, { CC: 2, K_FI: 1 },
  [[/Plaatmateriaal B is in klimaatklasse 2 niet toegestaan/, true], [/voldoen niet/, true]]);
tekst("gipskarton type H in klimaatklasse 2", { klimaat: 2, gips_B: 2 }, { CC: 2, K_FI: 1 },
  [[/Plaatmateriaal B is in klimaatklasse 2 niet toegestaan/, false]]);
// Een restpaneel smaller dan h/4 vraagt om een melding over de plaats van het anker.
tekst("melding restpaneel < h/4", { n_wanden: 1, L_1: 3000 }, { CC: 2, K_FI: 1 },
  [[/Wand 1: het restpaneel is smaller dan h\/4/, true]]);
tekst("geen melding bij volle panelen", {}, { CC: 2, K_FI: 1 },
  [[/Wand 1: het restpaneel/, false], [/Wand 3: het restpaneel is smaller dan h\/4/, true]]);
// Zonder G en K_ser is de verplaatsing niet bepaald, en dat staat erbij.
tekst("verplaatsing niet bepaald", {}, { CC: 2, K_FI: 1 }, [[/n\.b\.: verplaatsing niet bepaald/, true]]);
tekst("verplaatsing bepaald", { G_pl_A: 1080, G_pl_B: 700, K_ser_B: 250 }, { CC: 2, K_FI: 1 },
  [[/n\.b\.: verplaatsing niet bepaald/, false], [/de verplaatsing is niet bepaald/, false]]);
// Het eindoordeel zegt het ook als de verplaatsing ontbreekt.
tekst("eindoordeel zonder verplaatsing", {}, { CC: 2, K_FI: 1 },
  [[/voldoen ; de verplaatsing is niet bepaald \(n\.b\.\) en apart aan te tonen/, true]]);
// Zonder enige sterkte in het wandvlak voldoet de bouwlaag niet.
tekst("wand korter dan h/4, geen sterkte", { n_wanden: 1, L_1: 600 }, { CC: 2, K_FI: 1 },
  [[/> 1,0 → de wanden in deze richting voldoen niet/, true]]);

afronden(fouten, "Stabiliteit HSB-wanden");
