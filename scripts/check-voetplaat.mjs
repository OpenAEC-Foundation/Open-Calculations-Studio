/**
 * Controlescript voor de module Voetplaatverbinding (NEN-EN 1993-1-8 met NB,
 * kegelbreuk volgens NEN-EN 1992-4).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten daarom op twee manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript: de T-stukken onder druk
 *      (§6.2.5), de ankerrij met de voetplaat op buiging (tabel 6.2 en 6.6),
 *      de krachtsverdeling bij N en M (tabel 6.7), de kegelbreuk, afschuiving
 *      met wrijving en α_bc (§6.2.2), de interactie per anker (tabel 3.4) en
 *      de hoeklassen.
 *   2. Voor de standaardset met moment de getallen van een handberekening.
 *
 * Daarnaast: de profieltabel van het beeld moet gelijk lopen met de matrix in
 * het blad.
 *
 * Draaien:  node scripts/check-voetplaat.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("voetplaatverbinding.ts");

const STANDAARD = {
  profile: 11, staalsoort: 235, hoeklas: 6, ank_opzet: 2, t_p: 25, d_p: 460, b_p: 380, e_d: 40, e_b: 40,
  d_anker: 24, kwaliteit: 8.8, gatspeling: 1, h_ef: 200, betonklasse: 25, gescheurd: 1, positie: 1,
  t_g: 30, h_b: 300, N_Ed: 300, M_Ed: 0, V_Ed: 0, wrijving: 1,
};

/** id → h, b, t_w, t_f (mm), A (mm²), W_pl,y (mm³) — Europese profieltabel. */
const PROFIEL = {
  6: { h: 200, b: 200, tw: 9, tf: 15, A: 7810, Wpl: 642e3 },
  11: { h: 300, b: 300, tw: 11, tf: 19, A: 14900, Wpl: 1870e3 },
  21: { h: 190, b: 200, tw: 6.5, tf: 10, A: 5380, Wpl: 430e3 },
  35: { h: 300, b: 150, tw: 7.1, tf: 10.7, A: 5380, Wpl: 628e3 },
};
const AS = { 12: 84.3, 16: 157, 20: 245, 24: 353, 30: 561, 36: 817 };
const FYB = { 4.6: 240, 5.6: 300, 8.8: 640, 10.9: 900 };
const FUB = { 4.6: 400, 5.6: 500, 8.8: 800, 10.9: 1000 };

// ── Onafhankelijke uitwerking; eenheden N en mm ─────────────────────────────
function uitwerking(v) {
  const p = PROFIEL[v.profile];
  const fy = v.staalsoort, fu = { 235: 360, 275: 430, 355: 490 }[fy], bw = { 235: 0.8, 275: 0.85, 355: 0.9 }[fy];
  const flush = v.ank_opzet === 1 || v.ank_opzet === 6;
  const na = v.ank_opzet === 1 ? 2 : v.ank_opzet === 2 || v.ank_opzet === 6 ? 4 : 6;
  const dp = flush ? Math.min(v.d_p, p.h) : Math.max(v.d_p, p.h), bp = Math.max(v.b_p, p.b);
  const xE = dp / 2 - v.e_d, yE = bp / 2 - v.e_b;
  const xh = (p.h / 2 - p.tf) / 2, yg = (p.tw / 2 + p.b / 2) / 2;
  const xmax = v.ank_opzet === 1 ? 0 : v.ank_opzet === 6 ? xh : xE, ymax = flush ? yg : yE;
  const d = v.d_anker, As = AS[d], fyb = FYB[v.kwaliteit], fub = FUB[v.kwaliteit];
  const N = v.N_Ed * 1e3, M = Math.abs(v.M_Ed) * 1e6, V = Math.abs(v.V_Ed) * 1e3;

  // druk: T-stukken
  const fcd = v.betonklasse / 1.5;
  const kj = v.positie === 1 ? Math.min(3, 1 + v.h_b / Math.max(bp, dp)) : 1;
  const fjd = (2 / 3) * kj * fcd;
  const c = v.t_p * Math.sqrt(fy / (3 * fjd));
  const cp = (dp - p.h) / 2, ci = Math.min(c, (p.h - 2 * p.tf) / 2);
  const Fcpl = fjd * (p.tf + Math.min(c, cp) + ci) * Math.min(p.b + 2 * c, bp);
  const Njrd = 2 * Fcpl + fjd * Math.min(p.tw + 2 * c, bp) * Math.max(0, p.h - 2 * p.tf - 2 * c);
  const FCrd = Math.min(Fcpl, (p.Wpl * fy) / (p.h - p.tf));

  // trek: ankers en plaat
  const Ftrd = (0.9 * fub * As) / 1.25;
  let FTrd = null;
  if (!flush) {
    const mx = xE - p.h / 2 - 0.8 * Math.SQRT2 * v.hoeklas, w = 2 * yE, e = v.e_b, ex = v.e_d;
    const lcp = Math.min(2 * Math.PI * mx, Math.PI * mx + w, Math.PI * mx + 2 * e);
    const lnc = Math.min(4 * mx + 1.25 * ex, e + 2 * mx + 0.625 * ex, 0.5 * bp, 0.5 * w + 2 * mx + 0.625 * ex);
    const l1 = Math.min(lcp, lnc);
    const Mpl1 = 0.25 * l1 * v.t_p ** 2 * fy, Mpl2 = 0.25 * lnc * v.t_p ** 2 * fy;
    const n = Math.min(ex, 1.25 * mx);
    const Lb = 8 * d + v.t_g + v.t_p + 0.6 * d, Lbs = (8.8 * mx ** 3 * As) / (l1 * v.t_p ** 3);
    const F12 = (2 * Mpl1) / mx, F2 = (2 * Mpl2 + n * 2 * Ftrd) / (mx + n), F3 = 2 * Ftrd, Ffl = p.b * p.tf * fy;
    FTrd = Lb > Lbs ? Math.min(F12, F3, Ffl) : Math.min(F12, F2, F3, Ffl);
  }

  // krachtsverdeling
  let UCc = 0, UCt = 0, FT = 0, Fta = 0, Fgroep = 0, sx = 0, sy = 0, psi = 1, schar = false;
  const zC = (p.h - p.tf) / 2;
  if (flush) {
    if (M > 0) schar = true;
    else if (N >= 0) UCc = N / Njrd;
    else {
      Fta = -N / na; UCt = Fta / Ftrd; Fgroep = -N;
      sx = v.ank_opzet === 6 ? 2 * xh : 0; sy = 2 * yg;
    }
  } else {
    const zT = xE, z = zT + zC;
    if (M === 0 && N >= 0) UCc = N / Njrd;
    else {
      const FT0 = (M - N * zC) / z;
      if (FT0 <= 0) UCc = (N / 2 + M / (2 * zC)) / FCrd;
      else if (N + FT0 > 0) {
        FT = FT0; UCc = (N + FT) / FCrd; UCt = FT / FTrd; Fta = FT / 2; Fgroep = FT; sy = 2 * yE;
      } else {
        FT = -N / 2 + M / (2 * zT); UCt = FT / FTrd; Fta = FT / 2; Fgroep = -N;
        sx = 2 * xE; sy = 2 * yE; psi = 1 / (1 + (2 * (M / -N)) / (3 * v.h_ef));
      }
    }
  }

  // kegelbreuk
  let UCk = 0;
  if (Fgroep > 0) {
    const k1 = v.gescheurd === 1 ? 8.9 : 12.7, scr = 3 * v.h_ef;
    const N0 = k1 * Math.sqrt(v.betonklasse) * v.h_ef ** 1.5;
    const Ac = (scr + Math.min(sx, scr)) * (scr + Math.min(sy, scr));
    const Nrdc = (N0 * (Ac / scr ** 2) * Math.min(1, 0.5 + v.h_ef / 200) * psi) / 1.5;
    UCk = Fgroep / Nrdc;
  }

  // afschuiving
  const Ff = v.wrijving === 1 ? 0.2 * Math.max(N, 0) : 0;
  const F2vb = ((0.44 - 0.0003 * fyb) * fub * As) / 1.25;
  const d0 = d + (d <= 14 ? 1 : d <= 24 ? 2 : 3);
  const e1 = dp / 2 - xmax, e2 = bp / 2 - ymax;
  const ab = Math.min(e1 / (3 * d0), fub / fu, 1), k1s = Math.max(Math.min((2.8 * e2) / d0 - 1.7, 2.5), 0);
  const F1vb = (k1s * ab * fu * d * v.t_p) / 1.25;
  const Fvb = Math.min(F1vb, F2vb);
  const nv = v.gatspeling === 1 ? na : 0;
  const Vrd = Ff + nv * Fvb;
  const UCv = V / Vrd;
  const UCtv = Fta > 0 && nv > 0 ? Math.max(V - Ff, 0) / nv / Fvb + Fta / (1.4 * Ftrd) : 0;

  // lassen
  const Ffl = Math.max(M / (p.h - p.tf) - (N * p.b * p.tf) / p.A, 0);
  const afl = (Math.SQRT2 * (Ffl / (2 * p.b - p.tw)) * bw * 1.25) / fu;
  const Aw = (p.h - 2 * p.tf) * p.tw;
  const Fdw = (Math.max(-N, 0) * Aw) / p.A / (2 * (p.h - 2 * p.tf)), Fla = V / (2 * (p.h - 2 * p.tf));
  const aw = (Math.sqrt(2 * Fdw ** 2 + 3 * Fla ** 2) * bw * 1.25) / fu;
  const UClas = Math.max(3, afl, aw) / v.hoeklas;

  const UCmax = Math.max(UCc, UCt, UCk, UCv, UCtv, UClas);
  return { kj, fjd, c, Fcpl, Njrd, FCrd, Ftrd, FTrd, FT, UCc, UCt, UCk, F2vb, F1vb, Vrd, UCv, UCtv, UClas, UCmax, schar };
}

const s4 = (x) => {
  if (x === 0) return "0";
  const dec = Math.max(0, 3 - Math.floor(Math.log10(Math.abs(x))));
  return x.toFixed(dec);
};
const ruim = (x) => ({ waarde: s4(x), tol: Math.max(Math.abs(x) * 0.002, 1e-6) });

function verwachtingen(r, v) {
  const uit = {
    k_j: ruim(r.kj), f_jd: ruim(r.fjd), c: ruim(r.c), F_c_pl_Rd: ruim(r.Fcpl / 1e3), N_j_Rd: ruim(r.Njrd / 1e3),
    F_C_Rd: ruim(r.FCrd / 1e3), F_t_Rd: ruim(r.Ftrd / 1e3), F_2_vb_Rd: ruim(r.F2vb / 1e3), F_1_vb_Rd: ruim(r.F1vb / 1e3),
    V_Rd: ruim(r.Vrd / 1e3), UC_v: ruim(r.UCv), UC_las: ruim(r.UClas), UC_max: ruim(r.UCmax),
  };
  // Een toets die in deze situatie niet speelt, staat in het blad niet als getal.
  for (const [k, x] of [["UC_c", r.UCc], ["UC_t", r.UCt], ["UC_kegel", r.UCk], ["UC_tv", r.UCtv]]) if (x > 0) uit[k] = ruim(x);
  if (r.FTrd !== null) uit.F_T_Rd = ruim(r.FTrd / 1e3);
  if (r.FT > 0) uit.F_T = ruim(r.FT / 1e3);
  return uit;
}

const SETS = [
  {
    naam: "1 — standaard: HEB 300 op 460 × 380 × 25, 4 × M24 8.8, alleen druk",
    invoer: {},
  },
  {
    naam: "2 — standaard met M = 60 kNm en V = 50 kN: één kant getrokken",
    invoer: { M_Ed: 60, V_Ed: 50 },
    // Met de hand: k_j = 1 + 300/460 = 1,652, f_jd = 2/3·1,652·16,67 = 18,36 N/mm²,
    // c = 25·√(235/(3·18,36)) = 51,6 mm → T-stuk onder een flens (19 + 51,6 + 51,6)·380·18,36
    // = 853 kN. Ankerrij: m_x = 190 − 150 − 0,8·√2·6 = 33,2 mm, l_eff = 131,4 mm
    // (e + 2m_x + 0,625e_x), M_pl = 0,25·131,4·25²·235 = 4,83 kNm → F_T,1-2 = 2·4,83/0,0332
    // = 290,6 kN (L_b = 261 > L_b* = 55: geen wrikkracht). z_C = 140,5, z_T = 190 mm:
    // F_T = (60 000 − 300·140,5)/330,5 = 54,0 kN, F_C = 354 kN → UC 0,415. Afschuiving:
    // α_bc = 0,44 − 0,0003·640 = 0,248 → 56,0 kN per anker; V_Rd = 0,2·300 + 4·56,0 = 284 kN.
    handwerk: { k_j: "1.652", f_jd: "18.36", c: "51.6", F_c_pl_Rd: "853", F_T_Rd: "290.6", F_T: "54.0", UC_c: "0.415", F_2_vb_Rd: "56.0", V_Rd: "284" },
  },
  {
    naam: "3 — groot moment met weinig druk, S355, 6 ankers (opzet 5), ongescheurd",
    invoer: { staalsoort: 355, ank_opzet: 5, N_Ed: 50, M_Ed: 90, V_Ed: 30, t_p: 30, gescheurd: 0, hoeklas: 8 },
  },
  {
    naam: "4 — opwaartse kracht met klein moment: beide ankerrijen getrokken, M20 5.6",
    invoer: { N_Ed: -120, M_Ed: 8, d_anker: 20, kwaliteit: 5.6, V_Ed: 20 },
  },
  {
    naam: "5 — HEA 200, plaat gelijk met het profiel, 2 ankers, opwaarts (scharnierend)",
    invoer: { profile: 21, ank_opzet: 1, d_p: 190, b_p: 300, e_b: 40, N_Ed: -40, V_Ed: 15, d_anker: 16 },
  },
  {
    naam: "6 — IPE 300 met 4 ankers binnen het profiel, zuivere druk, rand dichtbij (k_j = 1)",
    invoer: { profile: 35, ank_opzet: 6, d_p: 300, b_p: 150, positie: 3, N_Ed: 400 },
  },
  {
    naam: "7 — HEB 200, beide kanten gedrukt, vergrote gaten: afschuiving alleen via wrijving",
    invoer: { profile: 6, d_p: 360, b_p: 300, N_Ed: 500, M_Ed: 25, V_Ed: 80, gatspeling: 0 },
  },
  {
    naam: "8 — dunne plaat met de ankers ver van de flens: wrikkracht voor de ankers (L_b ≤ L_b*)",
    invoer: { t_p: 10, d_p: 520, e_d: 40, N_Ed: 20, M_Ed: 40, d_anker: 16, kwaliteit: 4.6 },
  },
];

let fouten = 0;
for (const set of SETS) {
  const v = { ...STANDAARD, ...set.invoer };
  const selectValues = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, selectValues, { CC: 2, K_FI: 1 });
  const r = uitwerking(v);
  fouten += toets(`${set.naam} — narekening`, got, verwachtingen(r, v));
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk);
  let ok;
  if (r.schar) {
    ok = /een scharnierende kolomvoet kan het moment niet overbrengen/.test(got.text);
  } else {
    const voldoet = /de verbinding voldoet(?! niet)/.test(got.text);
    ok = voldoet === r.UCmax <= 1;
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    ons ${voldoet ? "voldoet" : "voldoet niet"}   narekening ${r.UCmax <= 1 ? "voldoet" : "voldoet niet"}`);
  }
  if (!ok) fouten++;
}

// ── De profieltabel van het beeld loopt gelijk met het blad ─────────────────
{
  console.log("\nProfieltabel van het beeld tegen de matrix van het blad");
  const ts = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../packages/desktop/src/components/calc/VoetplaatDesigner.tsx"), "utf8");
  const beeld = new Map(
    [...ts.matchAll(/^\s*(\d+): \{ name: "([^"]+)", h: ([\d.]+), b: ([\d.]+), tw: ([\d.]+), tf: ([\d.]+) \}/gm)]
      .map((m) => [Number(m[1]), { naam: m[2], maten: m.slice(3, 7).map(Number) }]),
  );
  const keuze = tpl.slice(tpl.indexOf("@select profile"), tpl.indexOf("@end", tpl.indexOf("@select profile")));
  const opties = [...keuze.matchAll(/^\s+(.+?) = (\d+)$/gm)].map((m) => [Number(m[2]), m[1]]);
  const matrix = tpl.match(/profielen = \[([^\]]+)\]/)[1].split("|").map((k) => k.split(";").map((x) => Number(x.trim())));
  let ok = opties.length === beeld.size;
  for (const [id, naam] of opties) {
    const b = beeld.get(id), k = matrix[0].indexOf(id);
    const maten = [1, 2, 3, 4].map((r) => matrix[r][k]);
    if (!b || b.naam !== naam || b.maten.some((x, i) => x !== maten[i])) {
      ok = false;
      console.log(`  FOUT   id ${id}: blad "${naam}" ${maten.join("/")}, beeld ${b ? `"${b.naam}" ${b.maten.join("/")}` : "ontbreekt"}`);
    }
  }
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${opties.length} profielen in de keuzelijst, ${beeld.size} in het beeld`);
}

afronden(fouten, "Voetplaatverbinding");
