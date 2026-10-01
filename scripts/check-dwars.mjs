/**
 * Controlescript voor de module Dwarskrachtverbinding (NEN-EN 1993-1-8 met
 * NB), de kopplaatvariant.
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent het
 * blad daarom op twee manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript (N en mm): tabel 3.3,
 *      tabel 3.4 met de stuik in de kopplaat én in de kolomflens, de groep
 *      volgens §3.7(1) (per bout nagelopen, niet via het maximum per rijtype
 *      zoals het blad), §3.8, (3.2) bij één boutrij, de kopplaat bruto en
 *      netto en op blokschuif
 *      (3.9) en (3.10), het liggerlijf, de las (§4.5.3.3 met §4.5.1(2) en
 *      §4.5.2(2)), (6.32), de rotatie van het liggereinde met de plaat op z
 *      onder de bovenkant (ten minste t_f) en de passing van de sluitring
 *      (ISO 7089) langs de afronding van de kolom en de las. Daarbij het
 *      eindoordeel zoals de rapportkop het leest (bladResultaat.ts): voldoet
 *      alleen als alle voorwaarden kloppen en de grootste UC ≤ 1 is.
 *   2. Een handberekening van de standaardinvoer (de beginwaarden van het
 *      beeld) en van grensgevallen, als vaste getallen.
 *
 * Daarnaast: de beginwaarden van het beeld dekken elk invoerveld van het blad
 * en zijn gelijk aan de standaardset hieronder, en de profielkeuzes van beeld
 * en blad lopen gelijk.
 *
 * Draaien:  node scripts/check-dwars.mjs
 * Vereist een gebouwde core (npm --prefix packages/core run build) en een Node
 * die TypeScript rechtstreeks laadt (22.18 of nieuwer): de profielgegevens
 * komen uit profielen.ts, net als de matrix in het blad
 * (scripts/check-profielen.mjs bewaakt dat die twee gelijk lopen).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const hier = dirname(fileURLToPath(import.meta.url));
const tpl = laadTemplate("dwarskrachtverbinding.ts");
const BEELD = join(hier, "../packages/desktop/src/components/calc/DwarskrachtDesigner.tsx");
const { PROFIELEN } = await import(pathToFileURL(join(hier, "../packages/desktop/src/components/calc/profielen.ts")).href);

/** Gelijk aan DEFAULTS in DwarskrachtDesigner.tsx; dat wordt hieronder nagelopen. */
const STANDAARD = {
  verbindingsvorm: 1, kolomprofiel: 7, liggerprofiel: 22,
  staalsoort: 235, boutkwaliteit: 88, boutmaat: 16, hartlijn: 2,
  n_boutrijen: 3, t_kp: 10, b_kp: 130, e_kp: 25, p_kp: 50, w_kp: 80,
  z_kp: 30, a_las: 5, V_Ed: 80, L_b: 4,
};

// ── Onafhankelijke uitwerking; eenheden N en mm ─────────────────────────────
function uitwerking(v) {
  const c = PROFIELEN[v.kolomprofiel], b = PROFIELEN[v.liggerprofiel];
  // Tabel 3.1 van EN 1993-1-1 (t ≤ 40 mm, S355 f_u = 490), β_w uit tabel 4.1.
  const fy = v.staalsoort, fu = { 235: 360, 275: 430, 355: 490 }[fy], bw = { 235: 0.8, 275: 0.85, 355: 0.9 }[fy];
  const fub = { 46: 400, 56: 500, 88: 800, 109: 1000 }[v.boutkwaliteit];
  const av = v.boutkwaliteit === 109 ? 0.5 : 0.6;
  const d = v.boutmaat, d0 = { 12: 13, 16: 18, 20: 22, 24: 26 }[d], As = { 12: 84.3, 16: 157, 20: 245, 24: 353 }[d];
  const gM0 = 1, gM2 = 1.25, E = 210000, wortel3 = Math.sqrt(3);
  const V = Math.abs(v.V_Ed) * 1e3;
  const n = Math.max(1, Math.round(v.n_boutrijen));
  const e1 = v.e_kp, p1 = v.p_kp, w = v.w_kp, tp = v.t_kp, bp = v.b_kp, a = v.a_las;

  const hp = 2 * e1 + (n - 1) * p1;
  const dw = b.h - 2 * b.tf - 2 * b.r;
  if (v.verbindingsvorm !== 1) return { vorm: v.verbindingsvorm, hp, dw, past: hp <= dw };

  // De plaat op z onder de bovenkant, ten minste t_f (een lege z telt als een
  // plaat tegen de bovenflens). Las en liggerlijf alleen over het deel op het
  // rechte lijf, tussen t_f + r en h − t_f − r.
  const zp = Math.max(v.z_kp ?? 0, b.tf);
  const lw = Math.max(0, Math.min(zp + hp, b.h - b.tf - b.r) - Math.max(zp, b.tf + b.r));
  const e2 = (bp - w) / 2, e2c = (c.b - w) / 2;
  const tekort = [e1 < 1.2 * d0, e2 < 1.2 * d0, e2c < 1.2 * d0, n >= 2 && p1 < 2.2 * d0, w < 2.4 * d0].filter(Boolean).length;
  const binnen = zp + hp <= b.h - b.tf;
  // Sluitring (ISO 7089) vrij van de afronding van de kolom en van de las.
  const ds = { 12: 24, 16: 30, 20: 37, 24: 44 }[d];
  const ringVrij = w / 2 - ds / 2 >= Math.max(c.tw / 2 + c.r, b.tw / 2 + a * Math.SQRT2);

  // Bouten. De kopplaat zakt: in de kopplaat is de bovenste rij de eindbout
  // (e_1 naar de bovenrand), in de kolomflens de onderste (de kolom loopt door).
  const Lj = (n - 1) * p1;
  const bLf = Lj > 15 * d ? Math.max(0.75, Math.min(1, 1 - (Lj - 15 * d) / (200 * d))) : 1;
  const Fv = (bLf * av * fub * As) / gM2;
  const k1 = Math.min((2.8 * e2) / d0 - 1.7, (1.4 * w) / d0 - 1.7, 2.5);
  const k1c = Math.min((2.8 * e2c) / d0 - 1.7, (1.4 * w) / d0 - 1.7, 2.5);
  const abE = Math.min(e1 / (3 * d0), fub / fu, 1);
  const abI = Math.min(p1 / (3 * d0) - 0.25, fub / fu, 1);
  const abC = Math.min(fub / fu, 1);
  // Eén boutrij in een enkelsnedige verbinding: §3.6.1(10), k_1·α_b hoogstens 1,5 (3.2).
  const Fb = (k, ab, t) => ((n === 1 ? Math.min(k * ab, 1.5) : k * ab) * fu * d * t) / gM2;
  const kpE = Fb(k1, abE, tp), kpI = Fb(k1, abI, tp), cI = Fb(k1c, abI, c.tf), cE = Fb(k1c, abC, c.tf);
  // Stuikweerstand per bout, rij voor rij van boven naar beneden: het minimum van beide platen.
  const perBout = [];
  for (let i = 0; i < n; i++) {
    const kp = i === 0 ? kpE : kpI;
    const kol = i === n - 1 ? cE : cI;
    perBout.push(Math.min(kp, kol), Math.min(kp, kol));
  }
  let Vb = null, okB = true;
  if (Math.min(...perBout) <= 0) okB = false;
  else if (perBout.every((f) => Fv >= f)) Vb = perBout.reduce((s, f) => s + f, 0);
  else Vb = perBout.length * Math.min(Fv, ...perBout);
  const UCb = Vb ? V / Vb : 0;

  // Kopplaat.
  const Vg = (2 * hp * tp * fy) / (1.27 * wortel3 * gM0);
  const Vn = (2 * (hp - n * d0) * tp * fu) / (wortel3 * gM2);
  const Ant = (e2 - d0 / 2) * tp, Anti = (w - d0) * tp, Anv = (hp - e1 - (n - 0.5) * d0) * tp;
  const Veff2 = 2 * ((0.5 * fu * Ant) / gM2 + (fy * Anv) / (wortel3 * gM0));
  const Veff1 = (fu * Anti) / gM2 + (2 * fy * Anv) / (wortel3 * gM0);
  const Vkp = Math.min(Vg, Vn, Veff2, Veff1);
  const okKp = Math.min(Ant, Anti, Anv) > 0 && Vkp > 0;
  const UCkp = okKp ? V / Vkp : 0;

  // Liggerlijf en las.
  const Vwb = (b.tw * lw * fy) / (wortel3 * gM0);
  const UCwb = V / Vwb;
  const fvw = fu / (wortel3 * bw * gM2), leff = lw - 2 * a;
  const okLas = a >= 3 && leff >= Math.max(30, 6 * a);
  const Vw = leff > 0 ? 2 * a * leff * fvw : null;
  const UCw = Vw ? V / Vw : 0;

  // Scharnier: (6.32) en de rotatie tot de onderflens de kolom raakt.
  const tmin = Math.min(tp, c.tf), tmax = 0.36 * d * Math.sqrt(fub / fy);
  let he = null, phiRd = null, phiEd = null, UCphi = 0;
  if (binnen) {
    he = b.h - zp - hp;
    phiRd = tp / he;
    if (v.L_b > 0) {
      phiEd = (V * (v.L_b * 1e3) ** 2) / (8 * E * b.Iy);
      UCphi = phiEd / phiRd;
    }
  }
  const okRot = !binnen || v.L_b > 0;

  const UCmax = Math.max(UCb, UCkp, UCwb, UCw, UCphi);
  const maatgevend = UCmax <= 0 ? "geen dwarskracht"
    : [["liggerlijf", UCwb], ["bouten", UCb], ["kopplaat", UCkp], ["las", UCw], ["rotatie", UCphi]].find(([, u]) => u === UCmax)[0];
  const voorwaarden = tekort === 0 && binnen && ringVrij && okRot && okB && okKp && okLas && tmin <= tmax;
  return {
    vorm: 1, hp, dw, zp, lw, e2, e2c, tekort, binnen, ringVrij, okRot, bLf, Lj, d, Fv, k1, k1c, abE, abI, abC, kpE, kpI, cI, cE, n, Vb, UCb,
    Vg, Vn, Ant, Anti, Anv, Veff2, Veff1, Vkp, UCkp, Vwb, UCwb, fvw, leff, Vw, UCw, tmin, tmax, he, phiRd, phiEd, UCphi,
    UCmax, maatgevend, voorwaarden, voldoet: voorwaarden && UCmax <= 1,
  };
}

const s4 = (x) => {
  if (x === 0) return "0";
  const dec = Math.max(0, 3 - Math.floor(Math.log10(Math.abs(x))));
  return x.toFixed(dec);
};
const ruim = (x) => ({ waarde: s4(x), tol: Math.max(Math.abs(x) * 0.002, 1e-6) });

/** Wat het blad in deze situatie als getal toont, met de narekening als verwachting. */
function verwachtingen(r) {
  const uit = { h_p: ruim(r.hp), d_w: ruim(r.dw) };
  if (r.vorm !== 1) return uit;
  Object.assign(uit, {
    z_p: ruim(r.zp), l_w: ruim(r.lw), e_2: ruim(r.e2), e_2_c: ruim(r.e2c), F_v_Rd: ruim(r.Fv / 1e3),
    k_1: ruim(r.k1), k_1_c: ruim(r.k1c), α_b_e: ruim(r.abE), α_b_c: ruim(r.abC),
    F_b_kp_e: ruim(r.kpE / 1e3), F_b_c_e: ruim(r.cE / 1e3),
    V_g_Rd: ruim(r.Vg / 1e3), V_n_Rd: ruim(r.Vn / 1e3), A_nt: ruim(r.Ant), A_nt_i: ruim(r.Anti), A_nv: ruim(r.Anv),
    V_eff_2_Rd: ruim(r.Veff2 / 1e3), V_eff_1_Rd: ruim(r.Veff1 / 1e3), V_kp_Rd: ruim(r.Vkp / 1e3),
    V_wb_Rd: ruim(r.Vwb / 1e3), UC_wb: ruim(r.UCwb), f_vw_d: ruim(r.fvw), l_eff: ruim(r.leff),
    t_min: ruim(r.tmin), t_max: ruim(r.tmax),
  });
  if (r.Lj > 15 * r.d) uit.β_Lf = ruim(r.bLf);
  if (r.n >= 2) Object.assign(uit, { α_b_i: ruim(r.abI), F_b_kp_i: ruim(r.kpI / 1e3), F_b_c_i: ruim(r.cI / 1e3) });
  if (r.Vb !== null) Object.assign(uit, { V_b_Rd: ruim(r.Vb / 1e3), UC_b: ruim(r.UCb) });
  if (r.UCkp > 0) uit.UC_kp = ruim(r.UCkp);
  if (r.Vw !== null) Object.assign(uit, { V_w_Rd: ruim(r.Vw / 1e3), UC_w: ruim(r.UCw) });
  if (r.binnen) Object.assign(uit, { h_e: ruim(r.he), φ_Rd: ruim(r.phiRd) });
  if (r.phiEd !== null) Object.assign(uit, { φ_Ed: ruim(r.phiEd), UC_φ: ruim(r.UCphi) });
  return uit;
}

const SETS = [
  {
    naam: "1 — standaard: HEA 220 / IPE 240, S235, 3 × 2 M16 8.8, kopplaat 130 × 150 × 10 op z = 30, w = 80, V = 80 kN, L = 4 m",
    invoer: {},
    // Met de hand. h_p = 2·25 + 2·50 = 150 mm; d_w = 240 − 2·9,8 − 2·15 = 190,4 mm. De plaat loopt van
    // z = 30 tot 180 mm, het rechte lijf van 24,8 tot 215,2 mm → l_w = 150 mm.
    // e_2 = (130 − 80)/2 = 25, e_2,c = (220 − 80)/2 = 70 mm; tabel 3.3: 1,2d_0 = 21,6, 2,2d_0 = 39,6,
    // 2,4d_0 = 43,2 mm, alles gehaald. Sluitring Ø30: 40 − 15 = 25 ≥ 3,5 + 18 = 21,5 (afronding HEA 220)
    // en ≥ 3,1 + 5·√2 = 10,17 mm (las): ligt vrij.
    // Bouten: F_v,Rd = 0,6·800·157/1,25 = 60,29 kN (L_j = 100 ≤ 15d = 240: geen §3.8).
    // k_1 = min(2,8·25/18 − 1,7 = 2,189; 1,4·80/18 − 1,7 = 4,522; 2,5) = 2,189; k_1,c = 2,5.
    // α_b: eind kopplaat 25/54 = 0,4630, binnen 50/54 − 0,25 = 0,6759, eind kolomflens 1.
    // F_b: kopplaat 2,189·0,4630·360·16·10/1,25 = 46,70 en 2,189·0,6759·46 080 = 68,18 kN;
    // kolomflens 2,5·0,6759·360·16·11/1,25 = 85,65 en 2,5·1·50 688 = 126,7 kN.
    // Per bout: boven 46,70, midden en onder 68,18 kN; 68,18 > F_v,Rd = 60,29, dus §3.7(1):
    // V_b,Rd = 6·min(60,29; 46,70) = 280,2 kN → UC 80/280,2 = 0,2855.
    // Kopplaat: bruto 2·150·10·235/(1,27·√3) = 320,5; netto 2·(150 − 3·18)·10·360/(√3·1,25) = 319,3;
    // A_nt = (25 − 9)·10 = 160, A_nv = (150 − 25 − 2,5·18)·10 = 800 mm²:
    // (3.10) 2·(0,5·360·160/1,25 + 235·800/√3) = 263,2; (3.9) A_nt = 620 mm²: 360·620/1,25 + 2·108,5 = 395,6
    // → V_kp,Rd = 263,2 kN, UC 0,3040.
    // Liggerlijf: 6,2·150·235/√3 = 126,2 kN → UC 0,6340 (maatgevend).
    // Las: f_vw,d = 360/(√3·0,8·1,25) = 207,8 N/mm², l_eff = 150 − 10 = 140 mm,
    // 2·5·140·207,8 = 291,0 kN → UC 0,2749.
    // (6.32): t_max = 0,36·16·√(800/235) = 10,63 mm ≥ min(10; 11) = 10 mm.
    // Rotatie: h_e = 240 − 30 − 150 = 60 mm, φ_Rd = 10/60 = 0,1667;
    // φ_Ed = 80 000·4000²/(8·210 000·3892·10⁴) = 0,01958 → UC 0,1175.
    handwerk: {
      h_p: "150", d_w: "190.4", z_p: "30", l_w: "150", e_2: "25", e_2_c: "70", F_v_Rd: "60.29", k_1: "2.189", k_1_c: "2.5",
      α_b_e: "0.4630", α_b_i: "0.6759", α_b_c: "1", F_b_kp_e: "46.70", F_b_kp_i: "68.18", F_b_c_i: "85.65", F_b_c_e: "126.7",
      V_b_Rd: "280.2", UC_b: "0.2855", V_g_Rd: "320.5", V_n_Rd: "319.3", A_nt: "160", A_nt_i: "620", A_nv: "800",
      V_eff_2_Rd: "263.2", V_eff_1_Rd: "395.6", V_kp_Rd: "263.2", UC_kp: "0.3040", V_wb_Rd: "126.2", UC_wb: "0.6340",
      f_vw_d: "207.8", l_eff: "140", V_w_Rd: "291.0", UC_w: "0.2749", t_min: "10", t_max: "10.63",
      h_e: "60", φ_Rd: "0.1667", φ_Ed: "0.01958", UC_φ: "0.1175",
    },
    melding: /Sluitring Ø30 mm: w\/2 − d s \/2 = 25 mm ≥ .*→ ligt vrij/,
    maatgevend: "liggerlijf",
  },
  {
    naam: "2 — grensgeval: V_Ed = 126,18 kN, net onder V_wb,Rd = 126,181 kN",
    invoer: { V_Ed: 126.18 },
    // Met de hand: UC_wb = 126,18/126,181 = 0,99999 → voldoet, en het liggerlijf blijft maatgevend.
    // Het blad drukt de UC op vier cijfers af (1); het oordeel hieronder toetst de grens zelf.
    handwerk: { V_wb_Rd: "126.2", UC_wb: { waarde: "1.000", tol: 0.0005, waarom: "afgedrukt op vier cijfers" } },
    maatgevend: "liggerlijf",
  },
  {
    naam: "3 — grensgeval: V_Ed = 126,19 kN, net boven V_wb,Rd",
    invoer: { V_Ed: 126.19 },
    // Met de hand: UC_wb = 126,19/126,181 = 1,00007 → voldoet niet, hoewel de afgedrukte UC 1 is.
    handwerk: { UC_wb: { waarde: "1.000", tol: 0.0005, waarom: "afgedrukt op vier cijfers" } },
    melding: /> 1,0 → de verbinding voldoet niet/,
  },
  {
    naam: "4 — negatieve dwarskracht: de plaat is symmetrisch, dus als set 1",
    invoer: { V_Ed: -80 },
    handwerk: { UC_wb: "0.6340", UC_b: "0.2855" },
  },
  {
    naam: "5 — grensgeval tabel 3.3: e_1 = 21,6 mm = 1,2·d_0 precies",
    invoer: { e_kp: 21.6 },
    // Met de hand: h_p = 2·21,6 + 100 = 143,2 mm; α_b,e = 21,6/54 = 0,4 → F_b,kp,e = 2,189·0,4·46 080 = 40,35 kN.
    handwerk: { h_p: "143.2", α_b_e: "0.4000", F_b_kp_e: "40.35" },
  },
  {
    naam: "6 — grensgeval tabel 3.3: e_1 = 21,5 mm, net onder 1,2·d_0",
    invoer: { e_kp: 21.5 },
    melding: /1 afstand\(en\) onder het minimum van tabel 3\.3/,
  },
  {
    naam: "7 — M20 8.8, e = 30, w = 80, b = 140: F_v,Rd ≥ elke F_b,Rd, dus de som van de stuikweerstanden",
    invoer: { boutmaat: 20, e_kp: 30, w_kp: 80, b_kp: 140 },
    // Met de hand. Sluitring Ø37: 40 − 18,5 = 21,5 mm = 3,5 + 18 precies, dus net vrij van de afronding.
    // d_0 = 22, F_v,Rd = 0,6·800·245/1,25 = 94,08 kN. e_2 = 30: k_1 = 2,8·30/22 − 1,7 = 2,118;
    // α_b,e = 30/66 = 0,4545, α_b,i = 50/66 − 0,25 = 0,5076. F_b,kp,e = 2,118·0,4545·360·20·10/1,25 = 55,46,
    // F_b,kp,i = 2,118·0,5076·57 600 = 61,93, F_b,c,i = 2,5·0,5076·63 360 = 80,40 kN. Per bout 55,46 en
    // 61,93 kN, allemaal ≤ 94,08: V_b,Rd = 2·(55,46 + 61,93 + 61,93) = 358,6 kN → UC 0,2231.
    // Liggerlijf over h_p = 160 mm (30 tot 190, op het rechte lijf): 6,2·160·235/√3 = 134,6 kN → UC 0,5944.
    handwerk: { F_v_Rd: "94.08", k_1: "2.118", F_b_kp_e: "55.46", F_b_kp_i: "61.93", F_b_c_i: "80.40", V_b_Rd: "358.6", UC_b: "0.2231", V_wb_Rd: "134.6", UC_wb: "0.5944" },
    maatgevend: "liggerlijf",
  },
  {
    naam: "8 — IPE 400 op HEB 240, 6 rijen, p = 60: lange verbinding (§3.8) en de plaat hoger dan het rechte lijf",
    invoer: { liggerprofiel: 27, kolomprofiel: 18, n_boutrijen: 6, p_kp: 60, w_kp: 90, b_kp: 140 },
    // Met de hand: L_j = 5·60 = 300 > 15·16 = 240 → β_Lf = 1 − 60/3200 = 0,98125, F_v,Rd = 0,98125·60,29 = 59,16 kN.
    // h_p = 50 + 300 = 350 mm, van z = 30 tot 380 ≤ h − t_f = 386,5; het rechte lijf loopt van 34,5 tot
    // 365,5 mm → l_w = 331 mm = d_w. Sluitring: 45 − 15 = 30 ≥ 5 + 21 = 26 mm (HEB 240).
    // Liggerlijf 8,6·331·235/√3 = 386,2 kN; las 2·5·321·207,8 = 667,2 kN; h_e = 400 − 30 − 350 = 20 mm, φ_Rd = 0,5;
    // φ_Ed = 80 000·4000²/(8·210 000·23 130·10⁴) = 0,003294.
    // Bouten: per bout min 46,70 kN (bovenste rij, kopplaat) → 12·46,70 = 560,4 kN.
    handwerk: { β_Lf: { waarde: "0.98125", tol: 0.0001, waarom: "afgedrukt op vier cijfers" }, F_v_Rd: "59.16", h_p: "350", d_w: "331", l_w: "331", V_wb_Rd: "386.2", V_w_Rd: "667.2", h_e: "20", φ_Rd: "0.5000", φ_Ed: "0.003294", V_b_Rd: "560.4" },
    maatgevend: "liggerlijf",
  },
  {
    naam: "9 — één boutrij met e = 40: kleine laslengte, het liggerlijf bezwijkt",
    invoer: { n_boutrijen: 1, e_kp: 40 },
    // Met de hand: h_p = 80 mm; α_b,e = 40/54 = 0,7407, k_1·α_b,e = 2,189·0,7407 = 1,621 > 1,5, dus
    // (3.2): F_b,kp,e = 1,5·46 080 = 69,12 kN > F_v,Rd, en V_b,Rd = 2·60,29 = 120,6 kN.
    // Liggerlijf 6,2·80·235/√3 = 67,30 kN → UC 1,189 → voldoet niet.
    handwerk: { h_p: "80", F_b_kp_e: "69.12", V_b_Rd: "120.6", V_wb_Rd: "67.30", UC_wb: "1.189" },
    melding: /> 1,0 → de verbinding voldoet niet/,
  },
  {
    naam: "10 — kopplaat van 12 mm op HEA 220: (6.32) niet gehaald",
    invoer: { t_kp: 12 },
    // Met de hand: t_min = min(12; 11) = 11 mm > t_max = 10,63 mm → voldoet niet, ook met UC 0,634.
    handwerk: { t_min: "11", t_max: "10.63" },
    melding: /\(6\.32\) is niet gehaald/,
  },
  {
    naam: "11 — kopplaat van 12 mm op HEA 200: de kolomflens van 10 mm haalt (6.32) wel",
    invoer: { t_kp: 12, kolomprofiel: 6 },
    // Met de hand: t_min = min(12; 10) = 10 mm ≤ 10,63 mm; de flens vloeit voordat de bouten bezwijken.
    handwerk: { t_min: "10" },
    maatgevend: "liggerlijf",
  },
  {
    naam: "12 — vijf rijen: z + h_p = 30 + 250 = 280 mm reikt tot de onderflens (h − t_f = 230,2 mm)",
    invoer: { n_boutrijen: 5, V_Ed: 50 },
    melding: /reikt tot de onderflens en kan niet draaien/,
  },
  {
    naam: "13 — keeldikte 2,5 mm: onder de 3 mm van §4.5.2(2)",
    invoer: { a_las: 2.5 },
    melding: /de las voldoet niet aan §4\.5\.1\(2\) of §4\.5\.2\(2\)/,
  },
  {
    naam: "14 — S355, 10.9, M24, IPE 300 op HEB 300, 4 rijen",
    invoer: { staalsoort: 355, boutkwaliteit: 109, boutmaat: 24, liggerprofiel: 24, kolomprofiel: 20, n_boutrijen: 4, e_kp: 35, p_kp: 60, w_kp: 110, b_kp: 180, t_kp: 12, a_las: 6, V_Ed: 250, L_b: 8 },
  },
  {
    naam: "15 — lijfplaat, vier rijen: h_p = 200 mm valt in de afrondingen van de IPE 240 (d_w = 190,4)",
    invoer: { verbindingsvorm: 2, n_boutrijen: 4 },
    melding: /de plaat past niet tussen de afrondingen/,
  },
  {
    naam: "16 — dubbel hoekstaal, drie rijen: past, maar de toetsing is niet uitgewerkt",
    invoer: { verbindingsvorm: 3 },
    melding: /niet getoetst\s*: alleen de kopplaat is uitgewerkt/,
  },
  {
    naam: "17 — één boutrij M24 8.8, e = 80, w = 90, b = 160, t = 8: (3.2) van §3.6.1(10) begrenst de stuik",
    invoer: { n_boutrijen: 1, boutmaat: 24, e_kp: 80, w_kp: 90, b_kp: 160, t_kp: 8 },
    // Met de hand: d_0 = 26; e_2 = 35, e_2,c = 65 mm; sluitring Ø44: 45 − 22 = 23 ≥ 21,5 mm. F_v,Rd = 0,6·800·353/1,25 = 135,6 kN.
    // k_1 = 2,8·35/26 − 1,7 = 2,069; α_b,e = min(80/78; 800/360; 1) = 1 → k_1·α_b = 2,069 > 1,5:
    // F_b,kp,e = 1,5·360·24·8/1,25 = 82,94 kN (zonder (3.2) 114,4). Kolomflens k_1,c·α_b,c = 2,5 > 1,5:
    // F_b,c,e = 1,5·360·24·11/1,25 = 114,0 kN. F_v,Rd ≥ beide, dus de som: V_b,Rd = 2·82,94 = 165,9 kN
    // → UC 0,4823. Kopplaat: A_nv = (160 − 80 − 13)·8 = 536 mm², (3.10) 2·(0,5·360·176/1,25 + 235·536/√3)
    // = 196,1 kN. Liggerlijf 6,2·160·235/√3 = 134,6 kN → UC 0,5944 (maatgevend). h_e = 240 − 30 − 160 = 50 mm,
    // φ_Rd = 8/50 = 0,16.
    handwerk: { F_v_Rd: "135.6", k_1: "2.069", α_b_e: "1", F_b_kp_e: "82.94", F_b_c_e: "114.0", V_b_Rd: "165.9", UC_b: "0.4823", A_nv: "536", V_eff_2_Rd: "196.1", V_wb_Rd: "134.6", UC_wb: "0.5944", φ_Rd: "0.1600" },
    maatgevend: "liggerlijf",
  },
  {
    naam: "18 — HEB 200 / IPE 300, S355, 4 × 2 M20 10.9, e/p/w = 35/60/90, plaat 150 × 250 × 10, a = 4, V = 200 kN, L = 7 m",
    invoer: { kolomprofiel: 16, liggerprofiel: 24, staalsoort: 355, boutkwaliteit: 109, boutmaat: 20, n_boutrijen: 4, e_kp: 35, p_kp: 60, w_kp: 90, t_kp: 10, b_kp: 150, z_kp: 25, a_las: 4, V_Ed: 200, L_b: 7 },
    // Met de hand: h_p = 70 + 180 = 250 mm, van z = 25 tot 275 ≤ h − t_f = 289,3 mm; het rechte lijf loopt van
    // 25,7 tot 274,3 mm (d_w = 248,6), de plaat bedekt het helemaal → l_w = 248,6 mm. Sluitring Ø37:
    // 45 − 18,5 = 26,5 ≥ 4,5 + 18 = 22,5 mm (HEB 200).
    // F_v,Rd = 0,5·1000·245/1,25 = 98,0 kN (L_j = 180 ≤ 300). k_1 = 2,8·30/22 − 1,7 = 2,118, k_1,c = 2,5;
    // α_b,e = 35/66 = 0,5303, α_b,i = 60/66 − 0,25 = 0,6591. F_b,kp,e = 2,118·0,5303·490·20·10/1,25 = 88,07,
    // F_b,kp,i = 109,5, F_b,c,i = 2,5·0,6591·117 600 = 193,8, F_b,c,e = 294,0 kN. 109,5 > 98,0, dus
    // V_b,Rd = 8·min(98,0; 88,07) = 704,5 kN → UC 0,2839. Kopplaat: A_nv = (250 − 35 − 3,5·22)·10 = 1380 mm²,
    // (3.10) 2·(0,5·490·190/1,25 + 355·1380/√3) = 640,2 kN. Liggerlijf 7,1·248,6·355/√3 = 361,8 kN → UC 0,5528.
    // Las: f_vw,d = 490/(√3·0,9·1,25) = 251,5; 2·4·240,6·251,5 = 484,0 kN. (6.32): 0,36·20·√(1000/355) = 12,08 mm.
    // Rotatie: h_e = 300 − 25 − 250 = 25 mm; φ_Ed = 200 000·7000²/(8·210 000·8356·10⁴) = 0,06981,
    // φ_Rd = 10/25 = 0,4 → UC 0,1745.
    handwerk: {
      h_p: "250", l_w: "248.6", F_v_Rd: "98.00", k_1: "2.118", α_b_e: "0.5303", α_b_i: "0.6591", F_b_kp_e: "88.07", F_b_kp_i: "109.5",
      F_b_c_i: "193.8", F_b_c_e: "294.0", V_b_Rd: "704.5", UC_b: "0.2839", A_nv: "1380", V_eff_2_Rd: "640.2", V_kp_Rd: "640.2",
      V_wb_Rd: "361.8", UC_wb: "0.5528", f_vw_d: "251.5", V_w_Rd: "484.0", t_max: "12.08", φ_Ed: "0.06981", UC_φ: "0.1745",
    },
    maatgevend: "liggerlijf",
  },
  {
    naam: "19 — HEA 160 / IPE 200, S355, 2 × 2 M24 4.6: α_b in de kolomflens is f_ub/f_u",
    invoer: { kolomprofiel: 4, liggerprofiel: 21, staalsoort: 355, boutkwaliteit: 46, boutmaat: 24, n_boutrijen: 2, e_kp: 35, p_kp: 60, w_kp: 80, t_kp: 8, b_kp: 150, a_las: 3, V_Ed: 60, L_b: 5 },
    // Met de hand: α_b,c = 400/490 = 0,8163 → F_b,c,e = 2,5·0,8163·490·24·9/1,25 = 172,8 kN.
    // Sluitring Ø44: 40 − 22 = 18 mm = 3 + 15 precies (afronding HEA 160), dus net vrij.
    // F_v,Rd = 0,6·400·353/1,25 = 67,78 kN < F_b,kp,e = 69,88 kN, dus V_b,Rd = 4·67,78 = 271,1 kN.
    // (6.32): 0,36·24·√(400/355) = 9,171 mm ≥ 8 mm. Liggerlijf 5,6·130·355/√3 = 149,2 kN → UC 0,4021.
    handwerk: { α_b_c: "0.8163", F_b_c_e: "172.8", F_v_Rd: "67.78", F_b_kp_e: "69.88", V_b_Rd: "271.1", t_max: "9.171", V_wb_Rd: "149.2", UC_wb: "0.4021" },
    maatgevend: "liggerlijf",
  },
  {
    naam: "20 — blad van vóór z_kp, bijgewerkt: z_kp = 0, w = 70, b = 120, versprongen",
    invoer: { hartlijn: 1, b_kp: 120, w_kp: 70, z_kp: 0 },
    // Met de hand: z_kp = 0 < t_f, dus de plaat tegen de bovenflens: z = 9,8 mm, plaat tot 159,8 mm; het
    // rechte lijf begint op 24,8 mm → l_w = 135 mm. Liggerlijf 6,2·135·235/√3 = 113,6 kN → UC 0,7045;
    // las 2·5·125·207,8 = 259,8 kN → UC 0,3079. h_e = 240 − 9,8 − 150 = 80,2 mm, φ_Rd = 10/80,2 = 0,1247,
    // UC_φ = 0,01958/0,1247 = 0,1570. Sluitring Ø30: 35 − 15 = 20 < 21,5 mm → voldoet niet.
    handwerk: { z_p: "9.8", l_w: "135", V_wb_Rd: "113.6", UC_wb: "0.7045", V_w_Rd: "259.8", UC_w: "0.3079", h_e: "80.2", φ_Rd: "0.1247", UC_φ: "0.1570" },
    melding: /sluitring ligt op de afronding van de kolom of op de las → de verbinding voldoet niet/,
    tekst: [/z kp &lt; t f : gerekend met de plaat tegen de bovenflens/, /Versprongen getekend; gerekend met w = 70 mm en e 2 = 25 mm in elke rij/],
  },
  {
    naam: "21 — grensgeval sluitring: w = 73, b = 125 op HEA 220, 36,5 − 15 = 21,5 mm precies",
    invoer: { w_kp: 73, b_kp: 125 },
    maatgevend: "liggerlijf",
  },
  {
    naam: "22 — grensgeval sluitring: w = 72,9, b = 125, 21,45 < 21,5 mm",
    invoer: { w_kp: 72.9, b_kp: 125 },
    melding: /sluitring ligt op de afronding van de kolom of op de las/,
  },
  {
    naam: "23 — geen overspanning: L_b = 0, de rotatie is niet getoetst",
    invoer: { L_b: 0 },
    melding: /de rotatie is niet getoetst: de overspanning L b ontbreekt → de verbinding voldoet niet/,
    tekst: [/Rotatie niet getoetst: vul de overspanning L b van de ligger in/],
  },
  {
    naam: "24 — plaat laag: z = 80, plaat tot 230 ≤ h − t_f = 230,2 mm",
    invoer: { z_kp: 80 },
    // Met de hand: l_w = min(230; 215,2) − 80 = 135,2 mm; h_e = 240 − 80 − 150 = 10 mm, φ_Rd = 10/10 = 1.
    handwerk: { l_w: "135.2", h_e: "10", φ_Rd: "1" },
    maatgevend: "liggerlijf",
  },
  {
    naam: "25 — plaat te laag: z = 81, plaat tot 231 > 230,2 mm",
    invoer: { z_kp: 81 },
    melding: /reikt tot de onderflens en kan niet draaien/,
  },
];

let fouten = 0;
for (const set of SETS) {
  const v = { ...STANDAARD, ...set.invoer };
  const selectValues = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, selectValues, { CC: 2, K_FI: 1 });
  const r = uitwerking(v);
  fouten += toets(`${set.naam} — narekening`, got, verwachtingen(r));
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk);

  // Zoals de rapportkop het leest (bladResultaat.ts): de slotzin vanaf
  // "Maatgevende UC" bevat "voldoet" en niet "voldoet niet".
  const i = got.text.lastIndexOf("Maatgevende UC");
  const zin = i >= 0 ? got.text.slice(i, i + 240) : "";
  const voldoet = !/voldoe[nt] niet/.test(zin) && /voldoe[nt]/.test(zin);
  const wil = r.vorm === 1 ? r.voldoet : false;
  let ok = voldoet === wil;
  console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    ons ${voldoet ? "voldoet" : "voldoet niet"}   narekening ${wil ? "voldoet" : "voldoet niet"}`);
  if (!ok) fouten++;
  if (r.vorm === 1) {
    // Het getal in de slotzin is de grootste UC van de narekening.
    const m = zin.match(/Maatgevende UC = ([\d.]+)/);
    const uc = m ? Number(m[1]) : NaN;
    ok = Math.abs(uc - r.UCmax) <= Math.max(r.UCmax * 0.002, 1e-6);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} UC_max     ons ${String(uc).padStart(10)}   narekening ${s4(r.UCmax)}`);
  } else if (/Maatgevende UC =/.test(zin)) {
    fouten++;
    console.log("  FOUT   een niet uitgewerkte vorm hoort geen UC in de slotzin te hebben");
  }
  if (set.maatgevend) {
    const gezien = zin.includes(`(${set.maatgevend})`) && r.maatgevend === set.maatgevend;
    if (!gezien) fouten++;
    console.log(`  ${gezien ? "OK    " : "FOUT  "} maatgevend ${set.maatgevend} (narekening ${r.maatgevend})`);
  }
  if (set.melding) {
    const gezien = set.melding.test(got.text);
    if (!gezien) fouten++;
    console.log(`  ${gezien ? "OK    " : "FOUT  "} melding    ${set.melding.source}`);
  }
  for (const re of set.tekst ?? []) {
    const gezien = re.test(got.text);
    if (!gezien) fouten++;
    console.log(`  ${gezien ? "OK    " : "FOUT  "} tekst      ${re.source}`);
  }
  // De uitleg bij versprongen bouten staat er precies dan.
  if (r.vorm === 1) {
    const uitleg = /Versprongen getekend/.test(got.text);
    ok = uitleg === (v.hartlijn === 1);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} hartlijn   ${v.hartlijn === 1 ? "versprongen, uitleg" : "in lijn, geen uitleg"}`);
  }
}

// ── Beeld en blad lopen gelijk ──────────────────────────────────────────────
{
  console.log("\nBeginwaarden en keuzelijsten van het beeld tegen het blad");
  const ts = readFileSync(BEELD, "utf8");
  const blok = ts.match(/const DEFAULTS: Record<string, number> = \{([\s\S]*?)\};/);
  const defaults = blok
    ? Object.fromEntries([...blok[1].matchAll(/([\wφ]+):\s*(-?[\d.]+)/g)].map((m) => [m[1], Number(m[2])]))
    : {};
  const velden = [...tpl.matchAll(/^\s*([^\s='#]+)\s*=\s*\?/gmu)].map((m) => m[1]);
  const keuzes = [...tpl.matchAll(/@select\s+(\S+)/g)].map((m) => m[1]);
  const ontbreekt = [...velden, ...keuzes].filter((k) => !(k in defaults));
  let ok = ontbreekt.length === 0;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${velden.length} invoervelden en ${keuzes.length} keuzes hebben een beginwaarde${ok ? "" : `; ontbreekt: ${ontbreekt.join(", ")}`}`);
  if (!ok) fouten++;

  const verschil = Object.keys({ ...defaults, ...STANDAARD }).filter((k) => defaults[k] !== STANDAARD[k]);
  ok = verschil.length === 0;
  console.log(`  ${ok ? "OK    " : "FOUT  "} standaardset van dit script gelijk aan DEFAULTS${ok ? "" : `; verschilt: ${verschil.join(", ")}`}`);
  if (!ok) fouten++;

  for (const [lijst, sel] of [["KOLOMMEN", "kolomprofiel"], ["LIGGERS", "liggerprofiel"]]) {
    const m = ts.match(new RegExp(`const ${lijst} = \\[([^\\]]*)\\]`));
    const beeld = m ? m[1].split(",").map((x) => Number(x.trim())) : [];
    const b = tpl.slice(tpl.indexOf(`@select ${sel}`), tpl.indexOf("@end", tpl.indexOf(`@select ${sel}`)));
    const blad = [...b.matchAll(/=\s*(\d+)\s*$/gm)].map((x) => Number(x[1]));
    ok = beeld.length > 0 && beeld.join(",") === blad.join(",");
    console.log(`  ${ok ? "OK    " : "FOUT  "} ${sel}: beeld [${beeld.join(", ")}], blad [${blad.join(", ")}]`);
    if (!ok) fouten++;
  }
}

afronden(fouten, "Dwarskrachtverbinding");
