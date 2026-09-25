/**
 * Controlescript voor de module Stabiliteit HSB-wanden (EN 1995-1-1 §9.2.4.2).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten daarom op twee manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript van dezelfde normregels:
 *      Johansen (8.6) met de stuiksterkten (8.15), (8.20), (8.22), NB.8.1 en
 *      NB.8.2, de sterkte in het wandvlak (9.21)/(9.22) met de regels voor
 *      restpanelen, dubbelzijdige beplating (§9.2.4.2(7)), NB (17) en (18), de
 *      verdeling met torsie, de ankerkracht (9.23), de eindstijl (6.23)/(6.24)
 *      en de druk loodrecht op de onderregel (6.3). Het blad moet daar op vier
 *      significante cijfers mee overeenkomen.
 *   2. Voor het standaardgeval een paar getallen die met de hand zijn
 *      nagerekend, zodat een fout die in beide uitwerkingen zit niet onopgemerkt
 *      blijft.
 *
 * De vijf invoersets raken samen alle zes wandblokken, alle plaatsoorten, beide
 * bronnen voor de sterkte per verbindingsmiddel, het koordeffect, de
 * horizontale naad, de drie gevolgklassen en de drie klimaatklassen.
 *
 * Draaien:  node scripts/check-hsb-stabiliteit.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("hsbStabiliteit.ts");

// ── Standaardinvoer: dezelfde waarden als het parametrische beeld seedt ──────
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

/** EN 338: [f_m,k, f_c,0,k, f_c,90,k, E_0,05, ρ_k] per sterkteklasse 1..8 (C14..C30). */
const HOUT = [null,
  [14, 16, 2.0, 4700, 290], [16, 17, 2.2, 5400, 310], [18, 18, 2.2, 6000, 320], [20, 19, 2.3, 6400, 330],
  [22, 20, 2.4, 6700, 340], [24, 21, 2.5, 7400, 350], [27, 22, 2.6, 7700, 370], [30, 23, 2.7, 8000, 380]];

/** k_mod bij kort, per plaat (1..6) en klimaatklasse (1..3); 0 = niet toegestaan. */
const KMOD_PLAAT = [null,
  [0.90, 0.70, 0], [0.90, 0.70, 0], [0.85, 0.60, 0], [0.90, 0.90, 0.70], [0.80, 0.60, 0], [0.80, 0.60, 0]];
const GAMMA_PLAAT = [null, 1.2, 1.2, 1.3, 1.2, 1.3, 1.3];

function verbindingsmiddel(v, P, rhoK, kmodHout) {
  const plaat = v[`plaat_${P}`], t = v[`t_${P}`], d = v[`d_${P}`], l = v[`l_${P}`];
  const bev = v[`bevestiging_${P}`];
  const kmodPl = KMOD_PLAAT[plaat][v.klimaat - 1];
  let FfRd;
  if (v[`bron_${P}`] === 1) {
    const fh1 =
      plaat <= 3 ? 65 * d ** -0.7 * t ** 0.1
      : plaat === 4 ? 0.11 * v[`ρ_pl_${P}`] * d ** -0.3
      : plaat === 5 ? 3.9 * d ** -0.6 * t ** 0.7
      : 7 * d ** -0.7 * t ** 0.9;
    const fh2 = 0.082 * rhoK * d ** -0.3;
    const My = (bev === 2 ? 0.45 : 0.3) * v[`f_u_${P}`] * d ** 2.6;
    const t1 = t, t2 = Math.max(l - t, 0.1), b = fh2 / fh1, r = t2 / t1;
    const a = fh1 * t1 * d;
    const bb = fh2 * t2 * d;
    const c = (fh1 * t1 * d) / (1 + b) * (Math.sqrt(b + 2 * b * b * (1 + r + r * r) + b ** 3 * r * r) - b * (1 + r));
    const dd = 1.05 * (fh1 * t1 * d) / (2 + b) * (Math.sqrt(2 * b * (1 + b) + (4 * b * (2 + b) * My) / (fh1 * d * t1 * t1)) - b);
    const e = 1.05 * (fh1 * t2 * d) / (1 + 2 * b) * (Math.sqrt(2 * b * b * (1 + b) + (4 * b * (1 + 2 * b) * My) / (fh1 * d * t2 * t2)) - b);
    const f = 1.15 * Math.sqrt((2 * b) / (1 + b)) * Math.sqrt(2 * My * fh1 * d);
    const pAx = plaat >= 5 ? 0 : bev === 1 ? 0.15 : bev === 2 ? 0.25 : 1;
    const koord = (x) => x + Math.min(v[`F_ax_${P}`] / 4, pAx * x);
    const FvRk = Math.min(a, bb, koord(c), koord(dd), koord(e), koord(f));
    FfRd = (Math.sqrt(kmodHout * kmodPl) * FvRk) / 1.3 / 1000; // kN
    return { FvRk, FfRd, kmodPl, rand: 1.2 * FfRd };
  }
  FfRd = v[`F_f_Rd_${P}`];
  return { FvRk: NaN, FfRd, kmodPl, rand: 1.2 * FfRd };
}

function uitwerking(v) {
  const [fmk, fc0k, fc90k, E005, rhoK] = HOUT[v.sterkteklasse];
  const gG = v.CC === 1 ? 1.1 : v.CC === 3 ? 1.3 : 1.2;
  const gQ = v.CC === 1 ? 1.35 : v.CC === 3 ? 1.65 : 1.5;
  const kmod = v.klimaat === 3 ? 0.7 : 0.9;
  const kh = v.h_st < 150 ? Math.min(1.3, (150 / v.h_st) ** 0.2) : 1;
  const fmd = (kh * kmod * fmk) / 1.3, fc0d = (kmod * fc0k) / 1.3, fc90d = (kmod * fc90k) / 1.3;
  const FvEd = v.lastinvoer === 1 ? gQ * v.F_w_k : v.F_v_Ed;
  const hw = v.h_w;

  const A = verbindingsmiddel(v, "A", rhoK, kmod);
  const B = verbindingsmiddel(v, "B", rhoK, kmod);
  const k18 = (P) => (v[`plaat_${P}`] >= 5 ? Math.min(1, (35 * v[`t_${P}`]) / v.hoh) : 1);
  const kmodPl = { A: A.kmodPl, B: B.kmodPl };
  const fvd = (P) => (kmodPl[P] * (v[`plaat_${P}`] === 5 ? 1.0 : v[`f_v_${P}`])) / GAMMA_PLAAT[v[`plaat_${P}`]];

  const b0 = hw / 2;
  const ci = (b) => Math.min(1, b / b0);
  const kNaad = (b) => (v.naad === 1 && b < 0.5 * hw ? 0.85 : 1);
  const paneel = (P, b) => (b >= hw / 4 ? 1 : 0) * ({ A, B }[P].rand * b * ci(b) * kNaad(b) * k18(P)) / v[`s_${P}`];
  const zijde = (P, L) => {
    const bpl = v[`b_pl_${P}`], n = Math.floor(L / bpl);
    return n * paneel(P, bpl) + paneel(P, L - n * bpl);
  };
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
      Q: actief ? v[`Q_k_${j}`] : 0, w: actief ? v[`w_k_${j}`] : 0, R: sterkte(L, z) });
  }
  const Rtot = wanden.reduce((s, w) => s + w.R, 0);
  const xc = wanden.reduce((s, w) => s + w.R * w.x, 0) / Math.max(Rtot, 0.001);
  const Mt = FvEd * (v.B_gevel / 2 + v.e_F - xc);
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

  for (const w of wanden) {
    const dF = IR > 0.001 ? (Mt * w.R * (w.x - xc)) / IR : 0;
    w.F = (FvEd * w.R) / Math.max(Rtot, 0.001) + Math.max(0, dF);
    if (!w.actief) continue;
    const Ft = (w.F * hw) / Math.max(w.L, 1);
    w.Nt = Math.max(0, Ft - (0.9 * w.G * w.L) / 2 / 1000);
    w.Nc = Ft + ((gG * w.G + gQ * psi0 * w.Q) * aE) / 1000;
    const Mw = (gQ * w.w * aE * hw * hw) / 8 / 1e3; // N·mm, met w in kN/m² = 1e-3 N/mm²
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
    // geen sterkte en maakt de toets onvoldoende als hij toch zou dragen.
    const u = (aX, t, P) => (aX > 0 ? (w.F * 1000 * aX) / (Math.max(w.L, 1) * t) / Math.max(fvd(P), 0.001) : 0);
    w.UCpl = Math.max(u(aA, v.t_A, "A"), u(aB, v.t_B, "B"));
    w.UC = Math.max(w.UCr, w.UCa, w.UCst, w.UCc90, w.UCgl, w.UCpl);
  }
  const UCmax = Math.max(...wanden.filter((w) => w.actief).map((w) => w.UC));
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
      [`R_${j}`]: ruim(w.R), [`F_${j}`]: ruim(w.F), [`UC_r_${j}`]: ruim(w.UCr),
      [`N_t_${j}`]: ruim(w.Nt), [`UC_a_${j}`]: ruim(w.UCa), [`N_c_${j}`]: ruim(w.Nc),
      [`UC_st_${j}`]: ruim(w.UCst), [`UC_c90_${j}`]: ruim(w.UCc90), [`UC_gl_${j}`]: ruim(w.UCgl),
      [`UC_pl_${j}`]: ruim(w.UCpl), [`UC_w_${j}`]: ruim(w.UC),
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
    //   F_2 = 30·13,03/38,09 + 1,228 (torsie) = 11,49 kN;
    //   N_t,2 = 11,49·2,6/2,4 − 0,9·4·2,4/2 = 8,125 kN.
    handwerk: { F_v_Rk_A: "587.7", R_1: "16.23", R_2: "13.03", R_3: "8.837", F_2: "11.49", N_t_2: "8.125" },
  },
  {
    naam: "2 — CC1, klimaatklasse 2, multiplex met geprofileerde nagels en koordeffect, horizontale naad, excentrische last",
    invoer: {
      lastinvoer: 2, F_v_Ed: 24, e_F: 1.5, klimaat: 2, sterkteklasse: 3, h_st: 120,
      plaat_A: 4, t_A: 15, ρ_pl_A: 410, bevestiging_A: 2, d_A: 3.1, l_A: 75, F_ax_A: 400, s_A: 75,
      b_pl_A: 1220, naad: 1, gelijke_k: 1, zijden_3: 3,
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
];

let fouten = 0;
for (const set of SETS) {
  const v = { ...STANDAARD, ...set.invoer, CC: set.project.CC };
  const selectValues = Object.fromEntries(Object.entries({ ...STANDAARD, ...set.invoer }).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, selectValues, set.project);
  const r = uitwerking(v);
  fouten += toets(`${set.naam} — narekening`, got, verwachtingen(r, v));
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk);

  // Het eindoordeel staat in een tekstregel; neem de maatgevende UC daaruit over.
  const m = got.text.match(/Maatgevende UC = ([\d.]+)/);
  const ucBlad = m ? parseFloat(m[1]) : NaN;
  const ok = Number.isFinite(ucBlad) ? Math.abs(ucBlad - r.UCmax) <= Math.max(0.002 * r.UCmax, 1e-4) : r.UCmax > 1e6;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} UC_max     ons ${String(ucBlad).padStart(10)}   narekening ${s4(r.UCmax)}`);
}

// Klimaatklasse 3 met OSB moet expliciet als niet toegestaan in het blad staan.
{
  const selectValues = Object.fromEntries(Object.entries({ ...STANDAARD, klimaat: 3 }).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, selectValues, { CC: 2, K_FI: 1 });
  const ok = /Plaatmateriaal A is in klimaatklasse 3 niet toegestaan/.test(got.text) && /voldoen niet/.test(got.text);
  if (!ok) fouten++;
  console.log(`\nOSB in klimaatklasse 3\n  ${ok ? "OK    " : "FOUT  "} melding "niet toegestaan" en eindoordeel "voldoen niet"`);
}

afronden(fouten, "Stabiliteit HSB-wanden");
