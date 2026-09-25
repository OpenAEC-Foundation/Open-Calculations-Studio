/**
 * Controlescript voor de module Verticaal windverband (NEN-EN 1993-1-1 en
 * NEN-EN 1993-1-8 met NB).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten daarom op twee manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript: de horizontale kracht uit
 *      wind en scheefstand (5.3.2), trek op de bruto en de netto doorsnede —
 *      strip volgens (6.7), hoekprofiel aan één been volgens (3.11) tot (3.13)
 *      met tabel 3.8 —, knik van een enkele diagonaal met de effectieve
 *      slankheid van BB.1.2, en de horizontale verplaatsing.
 *   2. Voor twee sets de getallen van een handberekening.
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
  aansluiting: 2, d_0: 18, p_1: 60, e_2: 30, n_d: 1, grens_u: 300,
};
const PROJECT = { CC: 2, K_FI: 1 };

/** id → soort (1 strip, 2 hoek), b, t (mm), A (mm²), I_y, I_v (mm⁴). */
const PROFIEL = {
  5: { soort: 1, b: 60, t: 8 },
  11: { soort: 1, b: 100, t: 10 },
  18: { soort: 2, b: 50, t: 5, A: 480, Iy: 11.0e4, Iv: 4.54e4 },
  20: { soort: 2, b: 60, t: 6, A: 691, Iy: 22.8e4, Iv: 9.43e4 },
  23: { soort: 2, b: 80, t: 8, A: 1230, Iy: 72.2e4, Iv: 29.9e4 },
  26: { soort: 2, b: 100, t: 10, A: 1920, Iy: 177e4, Iv: 73.0e4 },
  28: { soort: 2, b: 120, t: 12, A: 2750, Iy: 368e4, Iv: 152e4 },
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
  const Fh = Fw + H, N = Fh / cos;

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
  return { phi, H, Fh, N, Npl, Nu, beta, Nt, UCt, drukOk, lamEff, chi, Nb, UCc, u, UCu, UCmax: Math.max(UCt, UCc, UCu) };
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
    handwerk: { φ: "0.003536", H_imp: "2.121", N_Ed: "80.86", β_2: "0.500", N_u_Rd: "83.95", UC_t: "0.963", u_h: "3.65" },
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
    naam: "4 — L 100×100×10 S235 als enkele diagonaal, gelast: trek en knik",
    invoer: { verbandtype: 2, profile: 26, aansluiting: 0, b_v: 4, h_v: 3.5, F_w_k: 25 },
    // Met de hand: L_d = √(16 + 12,25) = 5,315 m. i_v = √(73,0/19,2) = 19,50 mm,
    // λ_v = 5315/(19,50·93,9) = 2,903 → λ_eff,v = 0,35 + 0,7·2,903 = 2,382;
    // i_y = 30,36 mm → λ_eff,y = 0,5 + 0,7·1,864 = 1,805. Φ = 3,708 →
    // χ = 1/(3,708 + √(13,750 − 5,674)) = 0,1527; N_b,Rd = 0,1527·1920·235 = 68,9 kN.
    handwerk: { λ_eff: "2.382", χ: "0.1527", N_b_Rd: "68.9" },
  },
  {
    naam: "5 — L 50×50×5, één bout (3.11), X-kruis",
    invoer: { profile: 18, aansluiting: 1, d_0: 14, e_2: 25, F_w_k: 20, V_Ed: 0 },
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
  if (!r.drukOk) {
    ok = /Het verband voldoet niet: de druk bij omkerende wind/.test(got.text);
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    druk niet op te nemen of niet te toetsen, gemeld`);
  } else {
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
