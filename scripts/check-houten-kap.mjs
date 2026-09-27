/**
 * Controlescript voor de module Houten kap (templates/houtenKap.ts): sporen
 * van een zadeldak op muurplaat en nokgording (horizontale of schuine rol),
 * met een knieschot, een A-spant met trekband of hanenbalk, sporen van een
 * lessenaardak en een hoekkeper met driehoekige last.
 *
 * Geen referentieberekening beschikbaar. Het script rekent daarom op twee
 * manieren na:
 *   • per systeem een voorbeeld met de hand uitgewerkt (in het commentaar),
 *     met de gedrukte waarden van het blad;
 *   • een onafhankelijke numerieke uitwerking in JavaScript voor varianten:
 *     de staaf in 2000 stukjes, de reacties uit het evenwicht (bij het
 *     knieschot met de krachtenmethode, bij het A-spant met zes vergelijkingen
 *     voor de twee sporen, de trekband en het scharnier in de nok), M, V en N
 *     door optellen vanaf de voet en de zakking door twee keer integreren. De
 *     tabellen van het blad (per combinatie, de reacties, de windgevallen en
 *     de doorbuiging) worden rij voor rij vergeleken.
 * Daarnaast: elke variant rekent zonder NaN of foutmelding, de slotregel past
 * bij de UC, onvolledige invoer wordt niet getoetst, en de beginwaarden van
 * het beeld zijn de standaardinvoer hier.
 *
 * Draaien:  node scripts/check-houten-kap.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse, evaluate, render } from "../packages/core/dist/index.js";
import { laadTemplate, toets, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("houtenKap.ts");
/** Projectgegevens zoals de app ze vóór de eerste regel in de scope zet. */
const SCOPE = { CC: 2, RC: 2, K_FI: 1, DesignLife: 50, rekenwijze: 1, windgebied: 2, terreincategorie: 2 };

/** Standaardinvoer, gelijk aan de beginwaarden van het beeld (HoutenKapDesigner.tsx). */
const STANDAARD = {
  systeem: 1, rol: 1, puntlast: 1, sterkteklasse: 2, klimaatklasse: 1, ligging: 1, wmax_eis: 1,
  α_dak: 40, l_h: 4, a_hoh: 0.6, l_ks: 2, z_hb: 0,
  b_sp: 71, h_sp: 196, a_opl: 70, a_nok: 70, t_keep: 25, l_st: 0.3, l_so: 0,
  g_opb: 0.6, F_G: 0.5, F_Q: 2, x_F: 1.5, h_geb: 9, b_geb: 12,
};

// ── Doorrekenen en de tabellen van het blad lezen ───────────────────────────
function doorreken(v, scope = SCOPE) {
  const waarden = Object.fromEntries(Object.entries(v).map(([k, w]) => [k, String(w)]));
  const t0 = performance.now();
  const nodes = evaluate(parse(tpl), waarden, scope);
  const ms = performance.now() - t0;
  const html = render(nodes);
  const values = {};
  const loop = (lijst) => {
    for (const n of lijst) {
      if (n.type === "assignment" || n.type === "var-display") {
        const w = parseFloat(String(n.result).replace(",", "."));
        if (Number.isFinite(w)) values[n.name] = w;
      }
      if (Array.isArray(n.children)) loop(n.children);
    }
  };
  loop(nodes);
  const kaal = (s) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  // Tabellen: een tabel begint bij de kopregel; elke rij als lijst van celteksten.
  const tabellen = [];
  for (const rij of html.split(/<\/tr>/)) {
    const cellen = [...rij.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((m) => kaal(m[1]));
    if (!cellen.length) continue;
    if (/<th/.test(rij)) tabellen.push({ kop: cellen, rijen: [] });
    else if (tabellen.length) tabellen[tabellen.length - 1].rijen.push(cellen);
  }
  const text = kaal(html);
  return { values, text, tabellen, ms };
}
const tabel = (got, kop) => got.tabellen.find((t) => t.kop.some((c) => c.startsWith(kop)));

// ═════════════════════════════════════════════════════════════════════════════
// Onafhankelijke uitwerking
// ═════════════════════════════════════════════════════════════════════════════
const MAT = [null,
  { fm: 18, ft: 11, fc: 18, fv: 3.4, fc90: 2.2, E: 9000, E05: 6000, rho: 380, gM: 1.3, gl: false },
  { fm: 24, ft: 14, fc: 21, fv: 4.0, fc90: 2.5, E: 11000, E05: 7400, rho: 420, gM: 1.3, gl: false },
  { fm: 30, ft: 18, fc: 23, fv: 4.0, fc90: 2.7, E: 12000, E05: 8000, rho: 460, gM: 1.3, gl: false },
  { fm: 24, ft: 19.2, fc: 24, fv: 3.5, fc90: 2.5, E: 11500, E05: 9600, rho: 420, gM: 1.25, gl: true },
  { fm: 28, ft: 22.3, fc: 28, fv: 3.5, fc90: 2.5, E: 12600, E05: 10500, rho: 460, gM: 1.25, gl: true },
];

// Drukcoëfficiënten per helling 5, 15, 30, 45, 60 en 75°: [c_pe,10, c_pe,1].
const HELLING = [5, 15, 30, 45, 60, 75];
const nul = [[0, 0], [0, 0], [0, 0]];
const ZADEL0 = { // tabel NB.10 – 7.4a
  F: [[-1.7, -2.5], [-0.9, -2.0], [-0.5, -1.5], ...nul],
  G: [[-1.2, -2.0], [-0.8, -1.5], [-0.5, -1.5], ...nul],
  H: [[-0.6, -1.2], [-0.3, -1.0], [-0.2, -1.0], ...nul],
  I: [[-0.6, -1.0], [-0.4, -1.0], [-0.4, -1.0], [-0.2, -1.0], [-0.2, -1.0], [-0.2, -1.0]],
  J: [[-0.6, -1.0], [-1.0, -1.5], [-0.5, -1.0], [-0.3, -1.0], [-0.3, -1.0], [-0.3, -1.0]],
  dFG: [0, 0.2, 0.7, 0.7, 0.7, 0.8], dH: [0, 0.2, 0.4, 0.6, 0.7, 0.8],
};
const ZADEL90 = { // tabel NB.11 – 7.4b
  F: [[-1.6, -2.2], [-1.3, -2.0], [-1.1, -1.5], [-1.1, -1.5], [-1.1, -1.5], [-1.1, -1.5]],
  G: [[-1.3, -2.0], [-1.3, -2.0], [-1.4, -2.0], [-1.4, -2.0], [-1.2, -2.0], [-1.2, -2.0]],
  H: [[-0.7, -1.2], [-0.6, -1.2], [-0.8, -1.2], [-0.9, -1.2], [-0.8, -1.0], [-0.8, -1.0]],
  I: [[-0.6, -1.0], [-0.5, -1.0], [-0.5, -1.0], [-0.5, -1.0], [-0.5, -1.0], [-0.5, -1.0]],
};
const LES0 = { // tabel NB.8 – 7.3a
  F: [[-1.7, -2.5], [-0.9, -2.0], [-0.5, -1.5], ...nul],
  G: [[-1.2, -2.0], [-0.8, -1.5], [-0.5, -1.5], ...nul],
  H: [[-0.6, -1.2], [-0.3, -1.0], [-0.2, -1.0], ...nul],
  dF: [0, 0.2, 0.7, 0.7, 0.7, 0.8], dG: [0, 0.2, 0.7, 0.7, 0.7, 0.8], dH: [0, 0.2, 0.4, 0.6, 0.7, 0.8],
  F180: [[-2.3, -2.5], [-2.5, -2.8], [-1.1, -2.3], [-0.6, -1.3], [-0.5, -1.0], [-0.5, -1.0]],
  G180: [[-1.3, -2.0], [-1.3, -2.0], [-0.8, -1.5], [-0.5, -1.0], [-0.5, -1.0], [-0.5, -1.0]],
  H180: [[-0.8, -1.2], [-0.9, -1.2], [-0.8, -1.0], [-0.7, -1.0], [-0.5, -1.0], [-0.5, -1.0]],
};
const LES90 = { // tabel NB.9 – 7.3b
  Fh: [[-2.1, -2.6], [-2.4, -2.9], [-2.1, -2.9], [-1.5, -2.4], [-1.2, -2.0], [-1.2, -2.0]],
  Fl: [[-2.1, -2.4], [-1.6, -2.4], [-1.3, -2.0], [-1.3, -2.0], [-1.2, -2.0], [-1.2, -2.0]],
  G: [[-1.8, -2.0], [-1.9, -2.5], [-1.5, -2.0], [-1.4, -2.0], [-1.2, -2.0], [-1.2, -2.0]],
  I: [[-0.5, -1.0], [-0.7, -1.2], [-0.8, -1.2], [-0.9, -1.2], [-0.7, -1.2], [-0.5, -1.0]],
};
/** Lineair tussen de hellingen; onder 5° de waarden bij 5°. */
function helling(rij, a) {
  const x = Math.min(Math.max(a, 5), 75);
  let i = 0;
  while (i < HELLING.length - 2 && x > HELLING[i + 1]) i++;
  const t = (x - HELLING[i]) / (HELLING[i + 1] - HELLING[i]);
  const w = (v) => (Array.isArray(v) ? v : [v, v]);
  const a0 = w(rij[i]), a1 = w(rij[i + 1]);
  return [a0[0] + (a1[0] - a0[0]) * t, a0[1] + (a1[1] - a0[1]) * t];
}
/** Logaritmisch tussen c_pe,1 en c_pe,10 (7.2.1). */
function cpeA(paar, A) {
  const [c10, c1] = paar;
  return A >= 10 ? c10 : A <= 1 ? c1 : c1 - (c1 - c10) * Math.log10(A);
}

function qp(hGeb, scope) {
  const vb0 = [0, 29.5, 27.0, 24.5][scope.windgebied];
  const z0 = [0, 0.005, 0.2, 0.5][scope.terreincategorie], zmin = [0, 1, 4, 7][scope.terreincategorie];
  const z = Math.max(hGeb, zmin);
  const K = [0, 0.2, 0.234, 0.281][scope.windgebied];
  const t = Math.max(scope.DesignLife, 50);
  const cprob = Math.sqrt((1 - K * Math.log(-Math.log(1 - 1 / t))) / (1 - K * Math.log(-Math.log(0.98))));
  const vm = 0.19 * (z0 / 0.05) ** 0.07 * Math.log(z / z0) * cprob * vb0;
  return (1 + 7 / Math.log(z / z0)) * 0.5 * 1.25 * vm * vm / 1000;
}

/** Stelsel lineaire vergelijkingen met Gauss-eliminatie (kolomspil). */
function los(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

function model(inv, scope = SCOPE) {
  const sys = inv.systeem, rol = sys === 3 ? 1 : inv.rol, hoek = sys === 5, les = sys === 4;
  const mat = MAT[inv.sterkteklasse];
  const aDeg = inv.α_dak, a = (aDeg * Math.PI) / 180;
  const Lh = inv.l_h, ah = hoek ? 1 : inv.a_hoh;
  const b = inv.b_sp / 1000, h = inv.h_sp / 1000;
  const beta = hoek ? Math.atan(Math.tan(a) / Math.SQRT2) : a;
  const cb = Math.cos(beta), sb = Math.sin(beta), ca = Math.cos(a), sa = Math.sin(a);
  const Lp = hoek ? Math.SQRT2 * Lh : Lh, Lm = Lp / cb, hT = Lh * Math.tan(a);
  const A = b * h, W = (b * h * h) / 6, I = (b * h ** 3) / 12, EI = mat.E * 1000 * I;
  const kl = inv.klimaatklasse;
  const kmods = kl === 3 ? [0.5, 0.65, 0.7] : [0.6, 0.8, 0.9];
  const kdef = [0, 0.6, 0.8, 2.0][kl];
  const hmm = inv.h_sp;
  const kh = mat.gl ? (hmm < 600 ? Math.min((600 / hmm) ** 0.1, 1.1) : 1) : (hmm < 150 ? Math.min((150 / hmm) ** 0.2, 1.3) : 1);
  const gEig = (mat.rho * 9.81 * A) / 1000;
  const qk = aDeg < 15 ? 1.0 : aDeg < 20 ? 4 - 0.2 * aDeg : 0;
  const mu1 = aDeg <= 30 ? 0.8 : aDeg < 60 ? (0.8 * (60 - aDeg)) / 30 : 0;
  const sk = scope.DesignLife > 50
    ? ((1 - (0.8 * Math.sqrt(6)) / Math.PI * (Math.log(-Math.log(1 - 1 / scope.DesignLife)) + 0.57722)) / (1 + 2.5923 * 0.8)) * 0.7 : 0.7;
  const sn = mu1 * sk;
  const q = qp(inv.h_geb, scope);
  // wind
  const Aw = hoek ? (Lh * Lh) / (2 * ca) : ah * Lm;
  const c = (tab, zone) => cpeA(helling(tab[zone], aDeg), Aw);
  const d = (tab, zone) => helling(tab[zone], aDeg)[0];
  const e0 = Math.min(inv.b_geb, 2 * inv.h_geb), e90 = Math.min(les ? Lh : 2 * Lh, 2 * inv.h_geb);
  const xe0 = Math.min(e0 / 10, Lh), xe90 = Math.min(e90 / 4, Lh);
  const mid = inv.ligging === 1;
  let wind; // [cea, ceb, cpi, grens (horizontaal)]
  if (hoek) {
    wind = [[d(ZADEL0, "dH"), d(ZADEL0, "dH"), -0.3, Lp],
      (() => { const z = Math.min(c(ZADEL0, "H"), c(ZADEL0, "I"), c(ZADEL90, "H"), c(ZADEL90, "I")); return [z, z, 0.2, Lp]; })()];
  } else if (les) {
    wind = [
      [mid ? d(LES0, "dG") : d(LES0, "dF"), d(LES0, "dH"), -0.3, xe0],
      [mid ? c(LES0, "G") : c(LES0, "F"), c(LES0, "H"), 0.2, xe0],
      [c(LES0, "H180"), mid ? c(LES0, "G180") : c(LES0, "F180"), 0.2, Lh - xe0],
      mid ? [c(LES90, "I"), c(LES90, "I"), 0.2, Lh] : [c(LES90, "Fl"), Math.min(c(LES90, "G"), c(LES90, "Fh")), 0.2, xe90],
    ];
  } else {
    wind = [
      [d(ZADEL0, "dFG"), d(ZADEL0, "dH"), -0.3, xe0],
      [mid ? c(ZADEL0, "G") : c(ZADEL0, "F"), c(ZADEL0, "H"), 0.2, xe0],
      [c(ZADEL0, "I"), c(ZADEL0, "J"), 0.2, Lh - xe0],
      mid ? [c(ZADEL90, "I"), c(ZADEL90, "I"), 0.2, Lh] : [c(ZADEL90, "F"), c(ZADEL90, "G"), 0.2, xe90],
    ];
  }
  const Khk = Math.sqrt(2 * sa * sa + 4 * ca * ca);
  const fac = hoek ? (Khk * Lm * cb * cb) / (4 * ca) : ah;
  wind = wind.map(([ce1, ce2, cpi, x]) => ({ ce1, ce2, cpi, x, n1: (ce1 - cpi) * q * fac, n2: (ce2 - cpi) * q * fac, sw: Math.min(Math.max(x, 0), Lh) / cb }));

  // belastinggevallen per staaf: {v0, vt, na, nb, sw, nt, P}
  const G = hoek ? { v0: gEig, vt: (inv.g_opb / ca) * Lm * cb * cb / 2 } : { v0: inv.g_opb * ah + gEig, vt: 0 };
  const Qd = hoek ? { v0: 0, vt: (qk / ca) * Lm * cb * cb / 2 } : { v0: qk * ah, vt: 0 };
  const Sd = hoek ? { v0: 0, vt: sn * Lm * cb * cb / 2 } : { v0: sn * ah * cb, vt: 0 };
  const FG = inv.puntlast === 2 ? inv.F_G : 0;
  const FQ = inv.puntlast === 1 ? 2 : inv.puntlast === 2 ? inv.F_Q : 0;
  const SCk = inv.l_ks / cb, zt = inv.z_hb, SCt = zt / sb;
  const sQ = sys === 2 ? (SCk >= Lm - SCk ? SCk / 2 : (SCk + Lm) / 2)
    : sys === 3 && zt > 0 ? (SCt >= Lm - SCt ? SCt / 2 : (SCt + Lm) / 2) : Lm / 2;
  const sP0 = inv.puntlast === 2 ? inv.x_F / cb : sQ;
  let sP = sP0; // de vrije Q_k wordt hieronder op de ongunstigste plaats gezet
  const fsn = (v, r) => (v === 3 ? 1 : v === 4 ? (r === 1 ? 0.5 : 1) : v === 5 ? (r === 1 ? 1 : 0.5) : 0);
  const wsg = (v, r) => (v < 6 ? 0 : sys === 3 ? (r === 1 ? [1, 2, 3, 3, 4] : [3, 3, 1, 2, 4])[v - 6] : v - 5);
  function last(fg, fq, v, r) {
    const w = wsg(v, r), ws = w ? wind[w - 1] : null;
    return {
      v0: fg * G.v0 + fq * ((v === 1 ? Qd.v0 : 0) + fsn(v, r) * Sd.v0),
      vt: r === 1 ? fg * G.vt + fq * ((v === 1 ? Qd.vt : 0) + fsn(v, 1) * Sd.vt) : 0,
      na: ws && !hoek ? fq * ws.n1 : 0, nb: ws && !hoek ? fq * ws.n2 : 0, sw: ws && !hoek ? ws.sw : Lm,
      nt: ws && hoek && r === 1 ? fq * ws.n1 : 0,
      P: r === 1 ? fg * FG + fq * (v === 2 ? FQ : 0) : 0,
    };
  }

  // Staaf in 2000 stukjes; krachten in een lokaal stelsel met de voet in de oorsprong
  // en de staaf stijgend naar +x (de rechter spoor van het A-spant gespiegeld).
  const n = 2000, ds = Lm / n;
  const tx = cb, tz = sb, nx = sb, nz = -cb;          // t langs de staaf, n naar het dak toe
  function stukken(L) {
    const f = [];
    for (let j = 0; j < n; j++) {
      const s = (j + 0.5) * ds;
      const pp = cb * (L.v0 + (L.vt * s) / Lm) + (s < L.sw ? L.na : L.nb) + (L.nt * s) / Lm;
      const pa = sb * (L.v0 + (L.vt * s) / Lm);
      f.push({ s, fx: (pp * nx - pa * tx) * ds, fz: (pp * nz - pa * tz) * ds });
    }
    if (L.P) f.push({ s: sP, fx: 0, fz: -L.P });
    return f;
  }
  const som = (f) => f.reduce((o, k) => ({ fx: o.fx + k.fx, fz: o.fz + k.fz, m: o.m + (k.s * tx * k.fz - k.s * tz * k.fx) }), { fx: 0, fz: 0, m: 0 });
  /** M, V, N in de knopen, uit alle krachten (lasten, reacties, trekband) op de staaf. */
  /** Knopen: de gelijke verdeling, desgewenst met extra punten net voor en na een knoop of puntlast. */
  function snede(f, extra = []) {
    const fs = [...f].sort((p, q2) => p.s - q2.s);
    const uit = [];
    let Sx = 0, Sz = 0, Mo = 0, j = 0;
    const plekken = Array.from({ length: n + 1 }, (_, i) => (i === 0 ? 1e-9 : i === n ? Lm - 1e-9 : i * ds));
    for (const e of extra) for (const d of [-1e-7, 1e-7]) if (e + d > 1e-9 && e + d < Lm - 1e-9) plekken.push(e + d);
    plekken.sort((a, b2) => a - b2);
    for (const s of plekken) {
      while (j < fs.length && fs[j].s <= s) { Sx += fs[j].fx; Sz += fs[j].fz; Mo += fs[j].s * tx * fs[j].fz - fs[j].s * tz * fs[j].fx; j++; }
      const Px = s * tx, Pz = s * tz;
      uit.push({ s, M: -(Mo - (Px * Sz - Pz * Sx)), V: tx * Sz - tz * Sx, N: -(Sx * tx + Sz * tz) });
    }
    return uit;
  }
  const kracht = (s, fx, fz) => ({ s, fx, fz });
  const spiegel = (f) => f.map((k) => ({ s: k.s, fx: -k.fx, fz: k.fz }));

  /** Oplossing van een lastset: snedekrachten per staaf en de reacties. */
  function oplossing(fg, fq, v) {
    const LL = last(fg, fq, v, 1);
    const fL = stukken(LL);
    const R = { Az: 0, Ax: 0, Cz: 0, Bn: 0, Bx: 0, Bz: 0, T: 0 };
    let staven;
    if (sys === 3) {
      // Links in het echte stelsel; rechts gespiegeld opgesteld en terug gespiegeld.
      const fRm = stukken(last(fg, fq, v, 2));
      const fR = spiegel(fRm);                                 // rechter spoor, krachten in het echte stelsel
      const tL = som(fL);
      // momenten van de rechter lasten om B = (2Lh, 0); positie van een stukje: B + s·(−cb, sb)
      let RFx = 0, RFz = 0, RM = 0;
      for (const k of fR) { RFx += k.fx; RFz += k.fz; RM += (-k.s * cb) * k.fz - (k.s * sb) * k.fx; }
      const xc = zt / Math.tan(a);
      // onbekenden [Ax, Az, Bz, T, X, Z]
      const sol = los([
        [1, 0, 0, 1, 1, 0],
        [0, 1, 0, 0, 0, 1],
        [0, 0, 0, -zt, -hT, Lh],
        [0, 0, 0, -1, -1, 0],
        [0, 0, 1, 0, 0, -1],
        [0, 0, 0, zt, hT, Lh],
      ], [-tL.fx, -tL.fz, -tL.m, -RFx, -RFz, -RM]);
      void xc;
      const [Ax, Az, Bz, T] = sol;
      Object.assign(R, { Ax, Az, Bz, Bn: Bz, T });
      const SC = SCt;
      staven = [
        snede([...fL, kracht(0, Ax, Az), kracht(SC, T, 0)], [SC, sP]),
        snede([...fRm, kracht(0, 0, Bz), kracht(SC, T, 0)], [SC]),
      ];
      staven.velden = [[[0, Lm]], [[0, Lm]]];
      staven.krachten = [[...fL, kracht(0, Ax, Az), kracht(SC, T, 0)], [...fRm, kracht(0, 0, Bz), kracht(SC, T, 0)]];
    } else {
      const t = som(fL);
      const dB = rol === 1 ? [0, 1] : [-sb, cb];
      const rB = [Lm * tx, Lm * tz];
      const mB = rB[0] * dB[1] - rB[1] * dB[0];
      // zonder knieschot: Bm·mB + Mo = 0
      const oplos = (fx, fz, m) => { const bm = -m / mB; return { bm, Ax: -(fx + bm * dB[0]), Az: -(fz + bm * dB[1]) }; };
      const r0 = oplos(t.fx, t.fz, t.m);
      let f = [...fL, kracht(0, r0.Ax, r0.Az), kracht(Lm, r0.bm * dB[0], r0.bm * dB[1])];
      let Cz = 0, rr = r0;
      if (sys === 2) {
        // krachtenmethode: eenheidskracht verticaal omhoog op het knieschot
        const r1 = oplos(0, 1, SCk * tx * 1);
        const m0 = snede(f), m1 = snede([kracht(SCk, 0, 1), kracht(0, r1.Ax, r1.Az), kracht(Lm, r1.bm * dB[0], r1.bm * dB[1])]);
        let d0 = 0, d1 = 0;
        for (let i = 0; i <= n; i++) { const w = i === 0 || i === n ? 0.5 : 1; d0 += w * m0[i].M * m1[i].M; d1 += w * m1[i].M * m1[i].M; }
        Cz = -d0 / d1;
        rr = { bm: r0.bm + Cz * r1.bm, Ax: r0.Ax + Cz * r1.Ax, Az: r0.Az + Cz * r1.Az };
        f = [...fL, kracht(0, rr.Ax, rr.Az), kracht(Lm, rr.bm * dB[0], rr.bm * dB[1]), kracht(SCk, 0, Cz)];
      }
      Object.assign(R, { Ax: rr.Ax, Az: rr.Az, Cz, Bz: rr.bm * dB[1], Bn: rr.bm, Bx: rol === 1 ? 0 : rr.bm * sb });
      staven = [snede(f, sys === 2 ? [SCk, sP] : [sP])];
      staven.velden = [sys === 2 ? [[0, SCk], [SCk, Lm]] : [[0, Lm]]];
      staven.krachten = [f];
    }
    return { staven, R };
  }
  /** Grootste zakking t.o.v. de koorde per veld (twee keer integreren van −M/EI). */
  function zakking(opl) {
    let uc = 0, w = 0, l = Lm;
    opl.staven.forEach((st, r) => {
      for (const [s0, s1] of opl.staven.velden[r]) {
        const pts = st.filter((p) => p.s >= s0 - 1e-9 && p.s <= s1 + 1e-9);
        let th = 0, u = 0; const us = [0];
        for (let i = 1; i < pts.length; i++) {
          const dx = pts[i].s - pts[i - 1].s;
          const k0 = -pts[i - 1].M / EI, k1 = -pts[i].M / EI;
          u += th * dx + ((2 * k0 + k1) * dx * dx) / 6;
          th += ((k0 + k1) * dx) / 2;
          us.push(u);
        }
        // koorde tussen de eerste en de laatste knoop van het veld; de grens is de veldlengte
        const lf = s1 - s0, uEind = us[us.length - 1], a0 = pts[0].s, lk = pts[pts.length - 1].s - a0;
        for (let i = 0; i < pts.length; i++) {
          const rel = Math.abs(us[i] - (uEind * (pts[i].s - a0)) / lk);
          if (rel / (lf / 250) > uc) { uc = rel / (lf / 250); w = rel; l = lf; }
        }
      }
    });
    return { uc, w, l };
  }

  // combinaties
  const cc = scope.CC;
  const gG = cc === 1 ? 1.1 : cc === 3 ? 1.3 : 1.2, gQ = cc === 1 ? 1.35 : cc === 3 ? 1.65 : 1.5, gGa = cc === 1 ? 1.2 : cc === 3 ? 1.5 : 1.35;
  const KC = [ // [factor, v, duurklasse, spoor, A-spant, hoekkeper]
    [1, 0, 0, 1, 1, 1], [2, 1, 1, 1, 1, 1], [2, 2, 2, 1, 1, 1], [2, 3, 2, 1, 1, 1], [2, 4, 2, 0, 1, 0], [2, 5, 2, 0, 1, 0],
    [2, 6, 2, 1, 1, 1], [3, 6, 2, 0, 1, 0], [3, 7, 2, 1, 1, 1], [4, 8, 2, 1, 1, 0], [3, 8, 2, 0, 1, 0], [3, 9, 2, 1, 1, 0], [3, 10, 2, 0, 1, 0],
  ];
  const grp = sys === 3 ? 4 : hoek ? 5 : 3;
  const lz = (v) => (sys === 3 ? v === 7 || v === 9 : hoek ? false : v === 7);
  const act = (k) => {
    const [, v] = KC[k - 1];
    return KC[k - 1][grp] === 1 && (v !== 1 || qk > 0) && (v !== 2 || inv.puntlast > 0) && (!lz(v) || aDeg <= 45);
  };
  const vdoe = (v) => (v === 0 ? true : v === 1 ? qk > 0 : v === 2 ? inv.puntlast > 0 : v === 3 ? true : v <= 5 ? sys === 3
    : hoek ? v <= 7 : (v <= 9 || sys === 3) && (!lz(v) || aDeg <= 45));

  // knik en kip
  const Lcy = sys === 2 ? Math.max(SCk, Lm - SCk) : Lm;
  const lrel = (L, i) => (L / i / Math.PI) * Math.sqrt(mat.fc / mat.E05);
  const kc = (lr) => { if (lr <= 0.3) return 1; const bc = mat.gl ? 0.1 : 0.2; const k = 0.5 * (1 + bc * (lr - 0.3) + lr * lr); return 1 / (k + Math.sqrt(k * k - lr * lr)); };
  const kcy = kc(lrel(Lcy, h / Math.sqrt(12))), kcz = kc(lrel(inv.l_st, b / Math.sqrt(12)));
  const kcrit = (lef) => { const sc = (0.78 * b * b * mat.E05) / (h * lef); const lm = Math.sqrt(mat.fm / sc); return lm <= 0.75 ? 1 : lm <= 1.4 ? 1.56 - 0.75 * lm : 1 / (lm * lm); };
  const lbo = inv.l_so > 0 ? inv.l_so : Lcy;
  const kcrt = kcrit(0.9 * inv.l_st + 2 * h), kcrb = kcrit(Math.max(0.9 * lbo - 0.5 * h, 0.5 * lbo));
  // keep
  const hef = inv.h_sp - inv.t_keep, av = hef / inv.h_sp, kn = mat.gl ? 6.5 : 5;
  const kv = inv.t_keep > 0 ? Math.min(1, kn / (Math.sqrt(inv.h_sp) * (Math.sqrt(av * (1 - av)) + ((0.8 * inv.a_opl) / 2 / inv.h_sp) * Math.sqrt(1 / av - av * av)))) : 1;

  // ── De vrije Q_k op de ongunstigste plaats ──────────────────────────────────
  // Eigen zoekwijze (anders dan het blad): per deel van de staaf 120 gelijke stappen, dan
  // gulden-snede rond de beste. Doelen: het moment onder de last (veldmoment) en |M| bij het
  // knieschot of de hanenbalk (steunmoment), in γ_G·G + γ_Q·Q_k; voor de doorbuiging w_bij.
  /** M in de staaf op s, uit alle krachten vóór s (lasten, reacties, knoopkrachten). */
  const momentAt = (f, s) => {
    let Sx = 0, Sz = 0, Mo = 0;
    for (const k of f) if (k.s <= s + 1e-12) { Sx += k.fx; Sz += k.fz; Mo += k.s * tx * k.fz - k.s * tz * k.fx; }
    return -(Mo - (s * tx * Sz - s * tz * Sx));
  };
  const knoop = sys === 2 ? SCk : sys === 3 && zt > 0 ? SCt : null;
  const delen = knoop === null ? [[0, Lm]] : [[0, knoop], [knoop, Lm]];
  function zoek(doel) {
    let best = -Infinity, xb = sQ, stap = 0;
    for (const [a0, a1] of delen) {
      const n0 = 120, d = (a1 - a0) / n0;
      for (let i = 1; i < n0; i++) { const x = a0 + i * d, w = doel(x); if (best === -Infinity || w > best + 1e-6 * Math.abs(best)) { best = w; xb = x; stap = d; } }
    }
    let lo = Math.max(xb - stap, 1e-6), hi = Math.min(xb + stap, Lm - 1e-6);
    const g = (Math.sqrt(5) - 1) / 2;
    let x1 = hi - g * (hi - lo), x2 = lo + g * (hi - lo), f1 = doel(x1), f2 = doel(x2);
    for (let it = 0; it < 30; it++) {
      if (f1 >= f2) { hi = x2; x2 = x1; f2 = f1; x1 = hi - g * (hi - lo); f1 = doel(x1); }
      else { lo = x1; x1 = x2; f1 = f2; x2 = lo + g * (hi - lo); f2 = doel(x2); }
    }
    const xm = (lo + hi) / 2;
    return doel(xm) >= best ? xm : xb;
  }
  const opP = (s, fg, fq) => { sP = s; return oplossing(fg, fq, 2); };
  let qF = sQ, qS = sQ, qW = sQ;
  if (inv.puntlast === 1) {
    qF = zoek((s) => momentAt(opP(s, gG, gQ).staven.krachten[0], s));
    if (knoop !== null) qS = zoek((s) => Math.abs(momentAt(opP(s, gG, gQ).staven.krachten[0], knoop)));
  }
  sP = sP0;

  // ── Combinaties ─────────────────────────────────────────────────────────────
  const combos = {};
  const uit = { UC_NM: 0, UC_kip: 0, UC_V: 0, UC_keep: 0, UC_opl: 0 };
  const ext = { Azmax: 0, Azmin: 0, Axmax: 0, Axmin: 0, Tmax: 0 };
  // Zadelvlak aan de voet: een keep t loodrecht op de staaf, met een horizontale zadelsnede en
  // een loodrechte snede, laat een driehoek weg met hoogte t op de schuine zijde; de horizontale
  // rechthoekszijde is t/sin β. Langer dan de muurplaat kan het contact niet zijn.
  const lzv = inv.t_keep > 0 ? Math.min(inv.a_opl, inv.t_keep / sb) : inv.a_opl;
  for (let k = 1; k <= 13; k++) {
    if (!act(k)) continue;
    const [fc, v, dk] = KC[k - 1];
    const fg = fc === 1 ? gGa : fc === 2 ? gG : fc === 3 ? 0.9 : sys === 3 ? gG : 0.9;
    const fq = v > 0 ? gQ : 0;
    const km = kmods[dk];
    const fmd = (km * mat.fm * kh) / mat.gM, ftd = (km * mat.ft * kh) / mat.gM, fcd = (km * mat.fc) / mat.gM;
    const fvd = (km * mat.fv) / mat.gM, fc90d = (km * mat.fc90) / mat.gM, fcad = fcd / ((fcd / fc90d) * cb * cb + sb * sb);
    const dPQ = v === 2 && inv.puntlast === 1 ? (fq * 2) / 2 : 0;
    // (6.17)/(6.19) met (6.23)/(6.24) voor een moment m en een normaalkracht n (+ trek).
    const uSec = (m, n) => {
      const sm = Math.abs(m) / W / 1000, sn2 = n / A / 1000;
      const uS = sn2 >= 0 ? sn2 / ftd + sm / fmd : (sn2 / fcd) ** 2 + sm / fmd;
      const uB = sn2 >= 0 ? 0 : Math.max(-sn2 / (kcy * fcd) + sm / fmd, -sn2 / (kcz * fcd) + (0.7 * sm) / fmd);
      return Math.max(uS, uB);
    };
    const kipRatio = (m) => Math.abs(m) / W / 1000 / ((m >= 0 ? kcrt : kcrb) * fmd);
    // Vrije Q_k: de gevonden plaatsen, en bij een knoop ook direct eronder en erboven (0,001·L).
    const plaatsen = v === 2 && inv.puntlast === 1 ? (knoop === null ? [qF] : [qF, qS, knoop - 0.001 * Lm, knoop + 0.001 * Lm]) : [sP0];
    let M = 0, Nmin = 0, V = 0, unm = 0, ukp = 0, Vv = 0, sA = 0, sB = 0, sC = 0;
    for (const plek of plaatsen) {
      sP = plek;
      const opl = oplossing(fg, fq, v);
      for (const st of opl.staven) {
        Vv = Math.max(Vv, Math.abs(st[0].V));
        let Mst = 0, Nst = 0, rho = 0;
        for (const p of st) {
          const sn2 = p.N / A / 1000;
          M = Math.max(M, Math.abs(p.M)); Nmin = Math.min(Nmin, p.N); V = Math.max(V, Math.abs(p.V));
          const uK = sn2 < 0 ? kipRatio(p.M) ** 2 - sn2 / (kcz * fcd) : kipRatio(p.M);
          unm = Math.max(unm, uSec(p.M, p.N)); ukp = Math.max(ukp, uK);
          Mst = Math.max(Mst, Math.abs(p.M)); Nst = Math.min(Nst, p.N); rho = Math.max(rho, kipRatio(p.M));
        }
        // De staaf als geheel: grootste |M| met de grootste druk; kip met de grootste σ_m/(k_crit·f_m,d).
        unm = Math.max(unm, uSec(Mst, Nst));
        if (Nst < 0) ukp = Math.max(ukp, rho ** 2 - Nst / A / 1000 / (kcz * fcd));
      }
      const R = opl.R;
      sA = Math.max(sA, Math.max(R.Az + dPQ, 0) / (b * lzv / 1000) / 1000);
      sB = Math.max(sB, Math.max(R.Bn + dPQ * (rol === 1 ? 1 : cb), 0) / (b * (sys === 3 ? lzv : inv.a_nok) / 1000) / 1000);
      sC = Math.max(sC, Math.max(R.Cz + dPQ, 0) / (b * inv.a_opl / 1000) / 1000);
      ext.Azmax = Math.max(ext.Azmax, R.Az + dPQ); ext.Azmin = Math.min(ext.Azmin, R.Az);
      ext.Axmax = Math.max(ext.Axmax, R.Ax); ext.Axmin = Math.min(ext.Axmin, R.Ax); ext.Tmax = Math.max(ext.Tmax, R.T);
    }
    sP = sP0;
    V += dPQ * cb; Vv += dPQ * cb;
    const uV = (1.5 * V) / (b * h) / 1000 / fvd;
    const ukeep = inv.t_keep > 0 ? (1.5 * Vv) / (b * (hef / 1000)) / 1000 / (kv * fvd) : 0;
    const uo = Math.max(sA / fcad, sB / (rol === 2 && sys !== 3 ? fc90d : fcad), sC / fcad);
    combos[k] = { km, M, N: Nmin, V, unm, ukp, uV, uo, ukeep };
    uit.UC_NM = Math.max(uit.UC_NM, unm); uit.UC_kip = Math.max(uit.UC_kip, ukp); uit.UC_V = Math.max(uit.UC_V, uV);
    uit.UC_keep = Math.max(uit.UC_keep, ukeep); uit.UC_opl = Math.max(uit.UC_opl, uo);
  }
  // karakteristieke reacties en doorbuiging
  const reacties = {}, bgt = {};
  let UC_wbij = 0, UC_wmax = 0;
  if (inv.puntlast === 1) qW = zoek((s) => zakking(opP(s, kdef, 1)).uc);
  sP = sP0;
  for (let v = 0; v <= 10; v++) {
    if (!vdoe(v)) continue;
    const vrij = v === 2 && inv.puntlast === 1;
    sP = vrij ? qF : sP0;
    reacties[v] = oplossing(v === 0 ? 1 : 0, v > 0 ? 1 : 0, v).R;
    if (v === 0) continue;
    sP = vrij ? qW : sP0;
    const zb = zakking(oplossing(kdef, 1, v)), zm = zakking(oplossing(1 + kdef, 1, v));
    sP = sP0;
    bgt[v] = { wb: zb.w, ub: zb.uc, wm: zm.w, um: zm.uc, l: zb.l };
    UC_wbij = Math.max(UC_wbij, zb.uc); UC_wmax = Math.max(UC_wmax, zm.uc);
  }
  uit.UC_wbij = UC_wbij; uit.UC_wmax = inv.wmax_eis === 1 ? UC_wmax : 0;
  uit.UC_max = Math.max(...Object.values(uit));
  return { ...uit, combos, reacties, bgt, wind, ext, q_p: q, μ_1: mu1, kv, kcy, kcz, kcrt, kcrb, qF, qS, qW };
}

// ── Hulpjes ──────────────────────────────────────────────────────────────────
let fouten = 0;
const meld = (ok, wat, detail = "") => {
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${wat}${ok || !detail ? "" : "  -> " + detail}`);
};
const dicht = (a, b, rel, abs = 0) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= Math.max(abs, rel * Math.abs(b)) + 1e-9;

function slot(got) {
  const i = got.text.lastIndexOf("Maatgevende UC");
  if (i < 0) return null;
  const zin = got.text.slice(i, i + 220);
  const m = zin.match(/Maatgevende UC\s*=\s*([\d.]+|∞)/);
  return { zin, uc: m ? parseFloat(m[1]) : null, voldoet: !/voldoe[nt] niet/.test(zin) && /voldoe[nt]/.test(zin) };
}
function schoon(naam, got) {
  const stuk = ["NaN", "Error", "Undefined symbol", "niet gedefinieerd", "undefined", "Infinity"].filter((s) => got.text.includes(s));
  meld(stuk.length === 0, `${naam}: rekent zonder NaN of foutmelding`, stuk.join(", "));
}
function oordeelPast(naam, got) {
  const s = slot(got);
  if (!s) { meld(false, `${naam}: slotregel`, "geen slotregel"); return; }
  meld(s.uc !== null && (s.uc <= 1) === s.voldoet && dicht(s.uc, got.values.UC_max, 0, 1e-3),
    `${naam}: slotregel ${s.voldoet ? "voldoet" : "voldoet niet"} bij UC ${s.uc}`, s.zin.slice(0, 140));
}

/** Het blad tegen de onafhankelijke uitwerking: de UC's en de tabellen rij voor rij. */
function vergelijk(naam, inv, scope = SCOPE) {
  const got = doorreken(inv, scope);
  const u = model(inv, scope);
  console.log(`\n${naam} — tegen de onafhankelijke uitwerking (${got.ms.toFixed(0)} ms)`);
  schoon(naam, got);
  oordeelPast(naam, got);
  const vw = got.values;
  const uc = ["UC_NM", "UC_kip", "UC_V", "UC_keep", "UC_opl", "UC_wbij", "UC_wmax", "UC_max"];
  const afw = uc.filter((k) => !dicht(vw[k] ?? 0, u[k], 0.01, 2e-4));
  meld(afw.length === 0, `UC's: ${uc.map((k) => `${k.slice(3)} ${(vw[k] ?? 0).toFixed(3)}`).join(", ")}`,
    afw.map((k) => `${k}: blad ${vw[k]}, uitwerking ${u[k].toFixed(4)}`).join("; "));
  // combinaties
  const tc = tabel(got, "Combinatie");
  const nrs = [];
  let slecht = [];
  for (const rij of tc?.rijen ?? []) {
    const k = parseInt(rij[0]);
    const m = u.combos[k];
    nrs.push(k);
    if (!m) { slecht.push(`${k}: niet in de uitwerking`); continue; }
    const [, km, M, N, V, nm, kp, uv, uo] = rij.map((c) => parseFloat(c));
    const ok = dicht(km, m.km, 0, 1e-9) && dicht(M, m.M, 0.003, 0.011) && dicht(N, m.N, 0.003, 0.011) && dicht(V, m.V, 0.003, 0.011)
      && dicht(nm, m.unm, 0.006, 0.0015) && dicht(kp, m.ukp, 0.006, 0.0015) && dicht(uv, m.uV, 0.003, 0.0011) && dicht(uo, m.uo, 0.003, 0.0011);
    if (!ok) slecht.push(`${k}: blad ${rij.slice(1).join(" ")} | uitwerking ${m.km} ${m.M.toFixed(3)} ${m.N.toFixed(3)} ${m.V.toFixed(3)} ${m.unm.toFixed(4)} ${m.ukp.toFixed(4)} ${m.uV.toFixed(4)} ${m.uo.toFixed(4)}`);
  }
  const verwacht = Object.keys(u.combos).map(Number);
  meld(slecht.length === 0 && nrs.join() === verwacht.join(), `combinaties ${nrs.join(", ")}: M, N, V en de UC's per combinatie`,
    [...slecht, nrs.join() !== verwacht.join() ? `blad ${nrs.join()} / uitwerking ${verwacht.join()}` : ""].filter(Boolean).join(" || "));
  // reacties
  const tr = tabel(got, "Geval") && got.tabellen.find((t) => t.kop[0] === "Geval" && t.kop.some((c) => /^R /.test(c) || /^R\s/.test(c)));
  slecht = [];
  const namen = { G: 0, "q k": 1, "Q k": 2, "F Q": 2, S: 3, "S (i)": 3, "S (ii)": 4, "S (iii)": 5, W1: 6, W2: 7, W3: 8, W4: 9, W5: 10 };
  for (const rij of tr?.rijen ?? []) {
    const v = namen[rij[0]];
    const R = u.reacties[v];
    if (!R) { slecht.push(`${rij[0]}: niet in de uitwerking`); continue; }
    const cel = rij.slice(1).map(parseFloat);
    const ref = inv.systeem === 3 ? [R.Az, R.Ax, R.Bz, R.T] : inv.systeem === 2 ? [R.Az, R.Ax, R.Cz, R.Bn, R.Bx] : [R.Az, R.Ax, R.Bn, R.Bx];
    if (!cel.every((w, i) => dicht(w, ref[i], 0.002, 0.011))) slecht.push(`${rij[0]}: blad ${cel.join(" ")} | uitwerking ${ref.map((x) => x.toFixed(3)).join(" ")}`);
  }
  meld(slecht.length === 0 && (tr?.rijen.length ?? 0) === Object.keys(u.reacties).length, `reacties per belastinggeval (${tr?.rijen.length ?? 0} rijen)`, slecht.join(" || "));
  // doorbuiging
  const tb = tabel(got, "Overheersend");
  slecht = [];
  for (const rij of tb?.rijen ?? []) {
    const v = namen[rij[0]];
    const z = u.bgt[v];
    if (!z) { slecht.push(`${rij[0]}: niet in de uitwerking`); continue; }
    const [wb, ub, wm, um, lim] = rij.slice(1).map(parseFloat);
    const ok = dicht(wb, z.wb * 1000, 0.01, 0.06) && dicht(ub, z.ub, 0.01, 0.0015) && dicht(lim, (z.l / 250) * 1000, 0, 0.06)
      && (inv.wmax_eis !== 1 || (dicht(wm, z.wm * 1000, 0.01, 0.06) && dicht(um, z.um, 0.01, 0.0015)));
    if (!ok) slecht.push(`${rij[0]}: blad ${rij.slice(1).join(" ")} | uitwerking ${(z.wb * 1000).toFixed(2)} ${z.ub.toFixed(4)} ${(z.wm * 1000).toFixed(2)} ${z.um.toFixed(4)} ${(z.l / 250 * 1000).toFixed(2)}`);
  }
  meld(slecht.length === 0 && (tb?.rijen.length ?? 0) === Object.keys(u.bgt).length, `doorbuiging per overheersende belasting (${tb?.rijen.length ?? 0} rijen)`, slecht.join(" || "));
  // wind
  const tw = tabel(got, "Richting");
  slecht = [];
  (tw?.rijen ?? []).forEach((rij) => {
    const w = { W1: 1, W2: 2, W3: 3, W4: 4, a: 1, b: 2, c: 3, d: 4 }[rij[0]];
    const m = u.wind[w - 1];
    const ce1 = parseFloat(rij[3]), ce2 = parseFloat(rij[5]), n1 = parseFloat(rij[8]), n2 = parseFloat(rij[9]);
    const ok = dicht(ce1, m.ce1, 0, 0.0051) && (inv.systeem === 5 || dicht(ce2, m.ce2, 0, 0.0051)) && dicht(n1, m.n1, 0.002, 0.0011)
      && (inv.systeem === 5 || dicht(n2, m.n2, 0.002, 0.0011));
    if (!ok) slecht.push(`${rij[0]}: blad ${rij.slice(3).join(" ")} | uitwerking ${m.ce1.toFixed(3)} ${m.ce2.toFixed(3)} ${m.n1.toFixed(4)} ${m.n2.toFixed(4)}`);
  });
  meld(slecht.length === 0 && (tw?.rijen.length ?? 0) > 0, `windgevallen (${tw?.rijen.length ?? 0} rijen): c_pe en lijnlast`, slecht.join(" || "));
  return { got, u };
}

// ═════════════════════════════════════════════════════════════════════════════
// Handberekening 1 — sporen op muurplaat en nokgording, horizontale rol
// ═════════════════════════════════════════════════════════════════════════════
//
// α = 30°, l_h = 3,4641 m → L = 3,4641/cos 30° = 4,000 m; a = 0,6 m; 71×196 C24,
// klimaatklasse 1; g_opb = 0,5 kN/m²; Q_k midden; CC2, windgebied II, terrein II,
// nokhoogte 9 m, gebouw 12 m lang.
//   A = 13 916 mm², W = 71·196²/6 = 454 589 mm³, I = 44 549 755 mm⁴,
//   EI = 11 000·44,55e-6 = 490,05 kNm²
//   g_eig = 420·9,81·0,013916 = 0,05734 kN/m; g_d = 0,5·0,6 + 0,05734 = 0,35734 kN/m
//   q⊥,G = 0,35734·cos 30° = 0,30947 kN/m; langs 0,35734·0,5 = 0,17867 kN/m
//   μ_1 = 0,8 (α = 30°), s = 0,56 kN/m², per m spoor 0,56·0,6·cos 30° = 0,29098 kN/m
//   q_k = 0 (α ≥ 20°); Q_k = 2 kN.
// Wind: k_r = 0,19·4^0,07 = 0,20936; ln(9/0,2) = 3,80666; v_m = 0,79696·27 = 21,518 m/s;
//   I_v = 0,26270; q_p = (1 + 7·0,2627)·0,625·21,518²/1000 = 0,8216 kN/m².
//   A = 0,6·4 = 2,4 m², log 2,4 = 0,38021. Bij 30°: G −0,5/−1,5 → −1,5 + 1,0·0,38021
//   = −1,1198; H −0,2/−1,0 → −0,6958; I −0,4/−1,0 → −0,7719; J −0,5/−1,0 → −0,8099;
//   θ = 90° I −0,5/−1,0 → −0,8099. e = min(12; 18) = 12 m, strook 1,2 m horizontaal.
//   W1: (0,7 + 0,3)·0,8216·0,6 = 0,4929 kN/m op de strook, (0,4 + 0,3)·0,49293 = 0,3451
//   op de rest; W2: (−1,1198 − 0,2)·0,49293 = −0,6506 en (−0,8958)·0,49293 = −0,4416;
//   W3: −0,4791 en −0,4978; W4: −0,4978 over de hele spoor.
// Combinatie 1, 1,35·G: M = 1,35·0,30947·4²/8 = 0,8356 kNm; N aan de voet
//   −1,35·0,35734·4·0,5/2 = −0,4824 kN (horizontale rol: halve langslast).
// Combinatie 3, 1,2·G + 1,5·Q_k: M = 1,2·0,61894 + 1,5·2·cos 30°·4/4 = 0,7427 + 2,5981
//   = 3,3408 kNm; links van de last N = −1,5·2·0,5/2 = −0,75 kN.
//   σ_m = 3,3408e6/454 589 = 7,349 N/mm²; f_m,d = 0,9·24/1,3 = 16,615 → 0,4423;
//   λ_rel,y = 4000/56,58/π·√(21/7400) = 1,1988; k_y = 1,3084; k_c,y = 0,5456;
//   σ_c = 750/13 916 = 0,0539; f_c,0,d = 14,538 → (6.23) = 0,0068 + 0,4423 = 0,4491 in die doorsnede.
//   Knik is een staaftoets: de grootste druk zit aan de voet. Bovenin R = (1,2·1,42936 + 3)/2
//   = 2,35762 kN verticaal, langs de spoor 1,17881 (trek); de langslast is 1,2·1,42936·0,5 + 1,5·2·0,5
//   = 2,35762, dus N_voet = −1,17881 kN. Met het grootste moment: σ_c = 1178,8/13 916 = 0,08471;
//   (6.23) = 0,08471/(0,5456·14,538) + 0,4423 = 0,01068 + 0,4423 = 0,4530 (maatgevend, staaf als geheel).
//   V = 1,2·0,30947·2 + 1,5·2·cos 30° (last op het steunpunt) = 0,7427 + 2,5981 = 3,3408 kN;
//   τ = 1,5·3340,8/13 916 = 0,3601; f_v,d = 2,7692 → UC_V = 0,1300.
//   Keep 25 mm: h_ef = 171, α = 0,8724, x = 35 mm: k_v = 5/(14·(0,3337 + 0,0887))
//   = 0,8458; τ = 1,5·3340,8/(71·171) = 0,4128 → 0,4128/(0,8458·2,7692) = 0,1762.
//   Oplegging: R_voet = 1,2·0,71468 + 1,5·1 + 1,5·1 = 3,8576 kN (Q_k op het steunpunt).
//   Zadelvlak: de keep van 25 mm loodrecht op de spoor laat een horizontale zadelsnede van
//   25/sin 30° = 50 mm over, korter dan de muurplaat van 70 mm: de reactie gaat over 50 mm.
//   σ = 3857,6/(71·50) = 1,0867; f_c,α,d = 14,538/(8,4·0,75 + 0,25) = 2,2196 → 0,4896.
//   (Met de hele muurplaat als contact kwam er 0,3497 uit: 1,4 keer te gunstig.)
// Doorbuiging: u_G = 5·0,30947·4⁴/(384·490,05) = 2,105 mm; u_Q = 2·0,866·4³/(48·490,05)
//   = 4,713 mm; w_bij = 0,6·2,105 + 4,713 = 5,976 mm; ℓ/250 = 16 mm → 0,3735;
//   w_max = 1,6·2,105 + 4,713 = 8,081 mm → 0,5050 (maatgevend).
// Reacties W1: R⊥ bovenin = (0,49293·1,3856·0,6928 + 0,34505·2,6144·2,6928)/4 = 0,7256;
//   R⊥ voet = 0,6830 + 0,9021 − 0,7256 = 0,8595; langs bovenin 0,7256·tan 30° = 0,4189;
//   R_voet = 0,8595·0,866 − 0,4189·0,5 = 0,5349; H_voet = −0,8595·0,5 − 0,4189·0,866 = −0,7926
//   (naar binnen, gelijk aan de horizontale windlast); R_boven = 0,7256/0,866 = 0,8379.
const V1 = { ...STANDAARD, α_dak: 30, l_h: 3.4641, g_opb: 0.5 };
{
  const { got } = vergelijk("Handberekening 1 — sporen, horizontale rol", V1);
  fouten += toets("Handberekening 1 — gedrukte waarden", got, {
    g_eig: "0.05734", g_d: "0.3573", μ_1: "0.8", s_dak: "0.56", q_k: "0", q_p: "0.8216", A_ref: "2.4",
    "k_c_y": "0.5456", "λ_rel_y": "1.199", M_d: "3.341", N_d: "-1.179", UC_623: "0.453", UC_NM: "0.453",
    UC_V: "0.13", k_v: "0.8458", UC_keep: "0.1762", "f_c_α_d": "2.22", l_zv: "50", "σ_c_voet": "1.087", UC_opl: "0.4896",
    UC_wbij: "0.3735", UC_wmax: "0.505", UC_max: "0.505",
  });
  const tc = tabel(got, "Combinatie"), tw = tabel(got, "Richting"), tr = got.tabellen.find((t) => t.kop[0] === "Geval" && t.kop.includes("R voet"));
  const rij = (t, k) => t?.rijen.find((r) => r[0].startsWith(k))?.map((c, i) => (i ? parseFloat(c) : c));
  const c1 = rij(tc, "1:"), c3 = rij(tc, "3:"), w1 = rij(tw, "W1"), w2 = rij(tw, "W2"), rw1 = rij(tr, "W1");
  meld(c1 && dicht(c1[2], 0.84, 0, 0.001) && dicht(c1[3], -0.48, 0, 0.001), "combinatie 1: M = 0,84 kNm en N = −0,48 kN", c1?.join(" "));
  meld(c3 && dicht(c3[2], 3.34, 0, 0.001) && dicht(c3[4], 3.34, 0, 0.001), "combinatie 3: M = 3,34 kNm, V = 3,34 kN", c3?.join(" "));
  meld(w1 && dicht(w1[8], 0.493, 0, 0.001) && dicht(w1[9], 0.345, 0, 0.001) && dicht(w1[7], 1.2, 0, 0.001), "W1: 0,493 en 0,345 kN/m, grens 1,2 m", w1?.join(" "));
  meld(w2 && dicht(w2[3], -1.12, 0, 0.001) && dicht(w2[5], -0.7, 0, 0.001) && dicht(w2[8], -0.651, 0, 0.001), "W2: c_pe −1,12 en −0,70, lijnlast −0,651", w2?.join(" "));
  meld(rw1 && dicht(rw1[1], 0.53, 0, 0.011) && dicht(rw1[2], -0.79, 0, 0.001) && dicht(rw1[3], 0.84, 0, 0.001), "reacties W1: 0,53 / −0,79 / 0,84 kN", rw1?.join(" "));
}

// ═════════════════════════════════════════════════════════════════════════════
// Handberekening 2 — dezelfde spoor met een schuine rol
// ═════════════════════════════════════════════════════════════════════════════
//
// Reactie bovenin loodrecht op de spoor: R⊥ = 0,30947·4/2 = 0,6189 kN (G). De muurplaat
// neemt de hele langslast: R∥ = 0,17867·4 = 0,7147 kN.
//   R_voet = 0,6189·0,866 + 0,7147·0,5 = 0,8934 kN; H_voet = −0,6189·0,5 + 0,7147·0,866
//   = 0,3095 kN naar buiten (= W·sin α·cos α/2 = 1,4294·0,433/2); bovenin H = 0,6189·0,5
//   = 0,3095 kN. Combinatie 1: N aan de voet = −1,35·0,7147 = −0,9648 kN.
{
  const { got } = vergelijk("Handberekening 2 — sporen, schuine rol", { ...V1, rol: 2 });
  const tr = got.tabellen.find((t) => t.kop[0] === "Geval" && t.kop.includes("R voet"));
  const g = tr?.rijen.find((r) => r[0] === "G")?.map((c, i) => (i ? parseFloat(c) : c));
  meld(g && dicht(g[1], 0.89, 0, 0.001) && dicht(g[2], 0.31, 0, 0.001) && dicht(g[3], 0.62, 0, 0.001) && dicht(g[4], 0.31, 0, 0.001),
    "G: R_voet 0,89, H_voet 0,31 naar buiten, R⊥ boven 0,62, H boven 0,31 kN", g?.join(" "));
  const c1 = tabel(got, "Combinatie")?.rijen.find((r) => r[0].startsWith("1:"));
  meld(c1 && dicht(parseFloat(c1[3]), -0.96, 0, 0.001), "combinatie 1: N = −0,96 kN (hele langslast aan de voet)", c1?.join(" "));
}

// ═════════════════════════════════════════════════════════════════════════════
// Handberekening 2b — zadelvlak aan de voet korter dan de muurplaat
// ═════════════════════════════════════════════════════════════════════════════
//
// α = 35°, l_h = 3,5 m → L = 3,5/cos 35° = 4,2727 m; h.o.h. 0,8 m; 46×196 C24; g_opb = 1,0 kN/m²;
// schuine rol; keep 20 mm; muurplaat 90 mm.
//   g_eig = 420·9,81·0,009016 = 0,03715 kN/m; G = 1,0·0,8 + 0,03715 = 0,83715 kN/m, W_G = 3,5769 kN.
//   Schuine rol: bovenin alleen R⊥ = W·cos α/2, de voet krijgt de hele langslast W·sin α. Verticaal aan
//   de voet: W·(cos²α/2 + sin²α) = 0,66450·W → G: 2,3768 kN.
//   Q_k = 2 kN midden: verticaal aan de voet 2·(cos²α/2 + sin²α) = 1,3290 kN, plus γ_Q·Q_k/2 voor de last
//   op het steunpunt. Combinatie 3: 1,2·2,3768 + 1,5·1,3290 + 1,5 = 6,3457 kN.
//   Zadelvlak: 20/sin 35° = 34,87 mm (niet de 90 mm van de muurplaat).
//   σ = 6345,7/(46·34,87) = 3,956 N/mm²; f_c,α,d = 14,538/(8,4·cos²35° + sin²35°) = 14,538/5,9655 = 2,4371
//   → UC = 1,623: voldoet niet. Met de hele muurplaat als contact kwam er 6345,7/(46·90)/2,4371 = 0,629 uit,
//   en omdat de rest ten hoogste 0,966 is, gaf het blad eerder ten onrechte "voldoet".
{
  const V2b = { ...STANDAARD, rol: 2, α_dak: 35, l_h: 3.5, g_opb: 1.0, a_hoh: 0.8, t_keep: 20, b_sp: 46, h_sp: 196, wmax_eis: 0, a_opl: 90 };
  const { got } = vergelijk("Handberekening 2b — zadelvlak korter dan de muurplaat", V2b);
  fouten += toets("Handberekening 2b — gedrukte waarden", got, {
    R_voet_d: "6.346", l_zv: "34.87", "σ_c_voet": "3.956", "f_c_α_d": "2.437", UC_opl: "1.623", UC_max: "1.623",
  });
  const s = slot(got);
  meld(s && !s.voldoet, "het oordeel is voldoet niet (oplegging)", s?.zin.slice(0, 120));
}

// ═════════════════════════════════════════════════════════════════════════════
// Handberekening 3 — knieschot halverwege
// ═════════════════════════════════════════════════════════════════════════════
//
// Als 1 met l_ks = 1,7321 m: twee velden van 2 m. Alleen G, karakteristiek:
//   M_C = −q⊥·(L₁³ + L₂³)/(8(L₁ + L₂)) = −0,30947·16/32 = −0,1547 kNm;
//   R⊥ voet = 3/8·0,30947·2 = 0,2321; knieschot 10/8·0,6189 = 0,7737; nok 0,2321.
//   Verticaal: R_knieschot = 0,7737/0,866 = 0,8934, R_boven = 0,2321/0,866 = 0,2680;
//   langs aan de voet 0,7147 − (0,2321 + 0,7737)·tan 30° = 0,1340, dus R_voet = 0,2321·0,866
//   + 0,1340·0,5 = 0,2680 kN, H_voet = 0. Combinatie 1: M = 1,35·0,1547 = 0,2089 kNm.
// Doorbuiging: per veld een ligger met één ingeklemd einde, max 0,00542·q·L⁴/EI op
//   0,42·L; in de uitwerking t.o.v. de koorde van het veld.
// Combinatie 3, Q_k op de ongunstigste plaats (twee gelijke velden l = 2 m langs de spoor):
//   q⊥ = 1,2·0,30947 = 0,37136 kN/m, P⊥ = 1,5·2·cos 30° = 2,5981 kN op a in veld 1.
//   Steunmoment: M_C = −q⊥·l²/8 − P·a·(l² − a²)/(4l²) = −0,18568 − P·a·(4 − a²)/16; het grootst
//   bij a = l/√3 = 1,1547 m (horizontaal 1,0 m): −0,18568 − 2,5981·3,0792/16 = −0,68568 kNm
//   (met Q_k midden in het veld −0,67282).
//   Veldmoment onder de last: M(a) = q⊥·a(l − a)/2 + M_C,G·a/l + P·a(l − a)/l + M_C,Q(a)·a/l;
//   dM/da = 0 geeft a = 0,850 m (0,425·l, horizontaal 0,736 m): M = 1,1801 kNm, tegen 1,1483 kNm
//   met Q_k midden in het veld (+2,8 %). Het blad vindt 0,74 m en 1,0 m horizontaal.
{
  const { got } = vergelijk("Handberekening 3 — knieschot halverwege", { ...V1, systeem: 2, l_ks: 1.73205 });
  const tr = got.tabellen.find((t) => t.kop[0] === "Geval" && t.kop.includes("R knieschot"));
  const g = tr?.rijen.find((r) => r[0] === "G")?.map((c, i) => (i ? parseFloat(c) : c));
  meld(g && dicht(g[1], 0.27, 0, 0.001) && dicht(g[2], 0, 0, 0.001) && dicht(g[3], 0.89, 0, 0.001) && dicht(g[4], 0.27, 0, 0.001),
    "G: 0,27 / 0 / 0,89 / 0,27 kN", g?.join(" "));
  const c1 = tabel(got, "Combinatie")?.rijen.find((r) => r[0].startsWith("1:"));
  meld(c1 && dicht(parseFloat(c1[2]), 0.21, 0, 0.001), "combinatie 1: |M| = 0,21 kNm (steunmoment)", c1?.join(" "));
  const c3 = tabel(got, "Combinatie")?.rijen.find((r) => r[0].startsWith("3:"));
  meld(c3 && dicht(parseFloat(c3[2]), 1.18, 0, 0.001), "combinatie 3: M = 1,18 kNm met Q_k op 0,425·l (midden in het veld: 1,15)", c3?.join(" "));
  meld(/grootste veldmoment \(0\.74 m horizontaal vanaf de voet\) en op de plaats met het grootste moment bij het knieschot \(1 m\)/.test(got.text),
    "Q_k op 0,74 m (veldmoment) en 1,0 m (steunmoment) horizontaal vanaf de voet");
}

// ═════════════════════════════════════════════════════════════════════════════
// Handberekening 4 — A-spant met trekband op voethoogte
// ═════════════════════════════════════════════════════════════════════════════
//
// Als 1, beide sporen. G per spoor W = 0,35734·4 = 1,4294 kN.
//   T = W/(2·tan α) = 1,4294/(2·0,57735) = 1,2379 kN; R_links = R_rechts = 1,4294 kN.
//   M = q⊥·L²/8 = 0,6189 kNm (ligger tussen voet en nok);
//   N aan de voet: −(W·sin α + T·cos α) = −(0,7147 + 1,0720) = −1,7867 kN.
//   Combinatie 1: M = 0,8356 kNm, N = −1,35·1,7867 = −2,4120 kN.
{
  const { got } = vergelijk("Handberekening 4 — A-spant met trekband", { ...V1, systeem: 3, z_hb: 0 });
  const tr = got.tabellen.find((t) => t.kop[0] === "Geval" && t.kop.includes("R links"));
  const g = tr?.rijen.find((r) => r[0] === "G")?.map((c, i) => (i ? parseFloat(c) : c));
  meld(g && dicht(g[1], 1.43, 0, 0.001) && dicht(g[2], 0, 0, 0.001) && dicht(g[3], 1.43, 0, 0.001) && dicht(g[4], 1.24, 0, 0.001),
    "G: R 1,43 / H 0 / R 1,43 / T 1,24 kN", g?.join(" "));
  const c1 = tabel(got, "Combinatie")?.rijen.find((r) => r[0].startsWith("1:"));
  meld(c1 && dicht(parseFloat(c1[2]), 0.84, 0, 0.001) && dicht(parseFloat(c1[3]), -2.41, 0, 0.001), "combinatie 1: M = 0,84 kNm, N = −2,41 kN", c1?.join(" "));
}

// ═════════════════════════════════════════════════════════════════════════════
// Handberekening 5 — A-spant met hanenbalk halverwege de hoogte
// ═════════════════════════════════════════════════════════════════════════════
//
// Als 4 met z = 1,0 m (h = 3,4641·tan 30° = 2,0 m): de hanenbalk grijpt aan op
// s = 1,0/sin 30° = 2,0 m. Rechts een rol, dus geen spatkracht naar de muurplaat:
//   momentevenwicht van de linker spoor om de nok: T·(h − z) = W·l_h/2
//   → T = 1,4294·1,7321/1,0 = 2,4757 kN.
//   M onder de hanenbalk: M(s) = W·cos α·s − q⊥·s²/2 (nog stijgend) → M(2) = 1,2379·2
//   − 0,30947·2 = 1,8568 kNm (drie keer de ligger tussen voet en nok);
//   N boven de hanenbalk: −0,7147 + 0,17867·2 − 2,4757·cos 30° = −2,5014 kN.
//   Combinatie 1: M = 1,35·1,8568 = 2,5067 kNm, N = −1,35·2,5014 = −3,3769 kN.
// Combinatie 3, 1,2·G + 1,5·Q_k: het grootste moment ontstaat met Q_k in de knoop van de hanenbalk.
//   Per spoor W = 1,2·1,42936 = 1,71523 kN, P = 3,0 kN verticaal op x = 1,7321 m.
//   R_rechts = (1,71523·6,9282 + 3·1,7321)/6,9282 = 2,46523; R_links = 2·1,71523 + 3 − 2,46523 = 3,96523.
//   Hanenbalk uit de rechter helft om de nok: T·(2,0 − 1,0) = 3,4641·2,46523 − 1,7321·1,71523 → T = 5,5689 kN.
//   M in de knoop: R⊥ voet·s − q⊥·s²/2 = 3,96523·cos 30°·2 − 1,2·0,30947·2²/2 = 6,8680 − 0,7427 = 6,1253 kNm
//   (het blad zet Q_k tot 0,001·L naast de knoop en drukt 6,12).
//   N net boven de knoop, met Q_k net erboven: −3,96523·0,5 + 1,2·0,17867·2 − 5,5689·cos 30° = −1,98262
//   + 0,42881 − 4,82277 = −6,3766 kN (met Q_k net eronder: + 1,5 = −4,8766).
//   Knik als staaftoets: σ_m = 6,1253e6/454 589 = 13,474 → 0,8110; σ_c = 6376,6/13 916 = 0,45822;
//   (6.23) = 0,45822/(0,5456·14,538) + 0,8110 = 0,0578 + 0,8110 = 0,8687.
{
  const { got } = vergelijk("Handberekening 5 — A-spant met hanenbalk", { ...V1, systeem: 3, z_hb: 1.0 });
  const tr = got.tabellen.find((t) => t.kop[0] === "Geval" && t.kop.includes("R links"));
  const g = tr?.rijen.find((r) => r[0] === "G")?.map((c, i) => (i ? parseFloat(c) : c));
  meld(g && dicht(g[4], 2.48, 0, 0.001), "G: T hanenbalk 2,48 kN", g?.join(" "));
  const c1 = tabel(got, "Combinatie")?.rijen.find((r) => r[0].startsWith("1:"));
  meld(c1 && dicht(parseFloat(c1[2]), 2.51, 0, 0.001) && dicht(parseFloat(c1[3]), -3.38, 0, 0.001), "combinatie 1: M = 2,51 kNm, N = −3,38 kN", c1?.join(" "));
  const c3 = tabel(got, "Combinatie")?.rijen.find((r) => r[0].startsWith("3:"));
  meld(c3 && dicht(parseFloat(c3[2]), 6.125, 0, 0.006) && dicht(parseFloat(c3[3]), -6.38, 0, 0.001) && dicht(parseFloat(c3[5]), 0.869, 0, 0.0011),
    "combinatie 3: Q_k bij de hanenbalk, M = 6,125 kNm (tabel op 2 decimalen), N = −6,38 kN, N+M = 0,869", c3?.join(" "));
}

// ═════════════════════════════════════════════════════════════════════════════
// Handberekening 6 — lessenaardak, 15°
// ═════════════════════════════════════════════════════════════════════════════
//
// α = 15°, l_h = 3,8637 m → L = 4,000 m; a = 0,6. q_k = 4 − 0,2·15 = 1,0 kN/m²,
// middellang (k_mod = 0,8); μ_1 = 0,8.
// Wind (tabel NB.8 – 7.3a en NB.9 – 7.3b bij 15°, A = 2,4 m²):
//   W1 druk G en H +0,2: (0,2 + 0,3)·0,49293 = 0,2465 kN/m;
//   W2 G −0,8/−1,5 → −1,2338 en H −0,3/−1,0 → −0,7338: −0,7068 en −0,4603 kN/m;
//   W3 (θ = 180°) H −0,9/−1,2 → −1,0859 onderaan: −0,6339; G −1,3/−2,0 → −1,7338 in de
//   strook langs de hoge kant: −0,9532 kN/m; grens 3,8637 − 1,2 = 2,6637 m;
//   W4 (θ = 90°) I −0,7/−1,2 → −1,0099: −0,5964 kN/m.
// Combinatie 2, 1,2·G + 1,5·q_k: q⊥ = (1,2·0,35734 + 1,5·0,6)·cos 15° = 1,2835 kN/m;
//   M = 1,2835·16/8 = 2,567 kNm.
{
  const { got } = vergelijk("Handberekening 6 — lessenaardak 15°", { ...V1, systeem: 4, α_dak: 15, l_h: 3.8637 });
  fouten += toets("Handberekening 6 — gedrukte waarden", got, { q_k: "1", μ_1: "0.8" });
  const tw = tabel(got, "Richting");
  const w = (k) => tw?.rijen.find((r) => r[0] === k)?.map((c, i) => (i ? parseFloat(c) : c));
  const [w1, w2, w3, w4] = ["W1", "W2", "W3", "W4"].map(w);
  meld(w1 && dicht(w1[8], 0.246, 0, 0.001) && dicht(w1[9], 0.246, 0, 0.001), "W1: 0,246 kN/m", w1?.join(" "));
  meld(w2 && dicht(w2[8], -0.707, 0, 0.001) && dicht(w2[9], -0.46, 0, 0.001), "W2: −0,707 en −0,460 kN/m", w2?.join(" "));
  meld(w3 && dicht(w3[8], -0.634, 0, 0.001) && dicht(w3[9], -0.953, 0, 0.001) && dicht(w3[7], 2.66, 0, 0.001), "W3 (θ = 180°): −0,634 en −0,953 kN/m, grens 2,66 m", w3?.join(" "));
  meld(w4 && dicht(w4[8], -0.596, 0, 0.001), "W4 (θ = 90°): −0,596 kN/m", w4?.join(" "));
  const c2 = tabel(got, "Combinatie")?.rijen.find((r) => r[0].startsWith("2:"));
  meld(c2 && dicht(parseFloat(c2[1]), 0.8, 0, 1e-9) && dicht(parseFloat(c2[2]), 2.57, 0, 0.001), "combinatie 2 (q_k): k_mod = 0,8, M = 2,57 kNm", c2?.join(" "));
}

// ═════════════════════════════════════════════════════════════════════════════
// Handberekening 7 — hoekkeper, 45°
// ═════════════════════════════════════════════════════════════════════════════
//
// α = 45°, l_h = 3 m: tan β = 1/√2, β = 35,26°; in het grondvlak 3·√2 = 4,2426 m,
// L = 4,2426/cos β = 5,1962 m; 75×225 C24; g_opb = 0,5 kN/m².
//   Per m² grondvlak 0,5/cos 45° = 0,7071; bij de nok 0,7071·5,1962·cos²β/2 = 1,2247 kN/m
//   verticaal, loodrecht 1,2247·cos β = 1,000 kN/m (driehoek).
//   Driehoek: R⊥ voet = w·L/6 = 0,8660, nok w·L/3 = 1,7321; M_max = w·L²/(9√3) = 1,7321 kNm
//   op L/√3 = 3,0 m. Eigen gewicht 420·9,81·0,016875 = 0,06953 kN/m, loodrecht 0,05677.
//   R_voet (G, verticaal) = (0,8660 + 0,05677·5,1962/2)/cos β = (0,8660 + 0,1475)/0,8165 =
//   1,2413 kN; R_boven = (1,7321 + 0,1475)/0,8165 = 2,3021 kN.
//   Combinatie 1: M ≈ 1,35·(1,7321 + 0,05677·3·2,1962/2) = 1,35·1,9191 = 2,591 kNm.
// Wind W1 (druk H, 45°: +0,6): (0,6 + 0,3)·0,8216·√3·5,1962·cos²β/(4·cos 45°) = 1,5685 kN/m bij de nok.
{
  const { got } = vergelijk("Handberekening 7 — hoekkeper 45°", { ...V1, systeem: 5, α_dak: 45, l_h: 3, b_sp: 75, h_sp: 225 });
  fouten += toets("Handberekening 7 — gedrukte waarden", got, { g_top: "1.225", μ_1: "0.4" });
  const tr = got.tabellen.find((t) => t.kop[0] === "Geval" && t.kop.includes("R voet"));
  const g = tr?.rijen.find((r) => r[0] === "G")?.map((c, i) => (i ? parseFloat(c) : c));
  meld(g && dicht(g[1], 1.24, 0, 0.001) && dicht(g[3], 2.3, 0, 0.001), "G: R_voet 1,24 kN, R_boven 2,30 kN", g?.join(" "));
  const c1 = tabel(got, "Combinatie")?.rijen.find((r) => r[0].startsWith("1:"));
  meld(c1 && dicht(parseFloat(c1[2]), 2.59, 0, 0.011), "combinatie 1: M = 2,59 kNm", c1?.join(" "));
  const w1 = tabel(got, "Richting")?.rijen.find((r) => r[0] === "W1");
  meld(w1 && dicht(parseFloat(w1[8]), 1.569, 0, 0.0011), "W1: 1,569 kN/m bij de nok", w1?.join(" "));
}

// ═════════════════════════════════════════════════════════════════════════════
// Handberekening 8 — standaardinvoer (40°): knik als staaftoets
// ═════════════════════════════════════════════════════════════════════════════
//
// L = 4/cos 40° = 5,2216 m; G = 0,6·0,6 + 0,05734 = 0,41734 kN/m; combinatie 3, 1,2·G + 1,5·Q_k midden
// (bij één veld de plaats met het grootste veldmoment).
//   M = 1,2·0,31970·5,2216²/8 + 1,5·2 = 1,3075 + 3,0 = 4,3075 kNm; σ_m = 9,4756 → 9,4756/16,615 = 0,5703.
//   Bovenin R = (1,2·0,41734·5,2216 + 3)/2 = 2,8075 kN, langs 1,8046 (trek); langslast 1,2·0,26826·5,2216
//   + 1,5·2·sin 40° = 1,6809 + 1,9284 = 3,6093 → N_voet = −1,8047 kN.
//   λ_rel,y = 5221,6/56,580/π·√(21/7400) = 1,5649; k_y = 1,8510; k_c,y = 0,35218.
//   In de doorsnede onder de last (N = −0,964): 0,0135 + 0,5703 = 0,5838. Als staaf met de grootste
//   druk: σ_c = 1804,7/13 916 = 0,12969; (6.23) = 0,12969/(0,35218·14,538) + 0,5703 = 0,02533 + 0,5703 = 0,5956.
{
  const got = doorreken(STANDAARD);
  fouten += toets("Handberekening 8 — knik als staaftoets", got, { M_d: "4.308", N_d: "-1.805", UC_623: "0.5956", UC_NM: "0.5956" });
  meld(/de staaf als geheel: het grootste moment samen met de grootste drukkracht/.test(got.text), "het blad noemt de staaftoets als maatgevend");
}

// ═════════════════════════════════════════════════════════════════════════════
// Varianten tegen de onafhankelijke uitwerking
// ═════════════════════════════════════════════════════════════════════════════
const varianten = [
  ["standaardinvoer", STANDAARD],
  ["randgebied, 12°, geen puntlast", { ...STANDAARD, α_dak: 12, ligging: 2, puntlast: 0 }],
  ["puntlast op een vaste plaats, schuine rol", { ...STANDAARD, puntlast: 2, rol: 2 }],
  ["60°, GL24h, klimaatklasse 2, CC3", { ...STANDAARD, α_dak: 60, sterkteklasse: 4, klimaatklasse: 2 }, { ...SCOPE, CC: 3 }],
  ["knieschot op 1/3, schuine rol, randgebied", { ...STANDAARD, systeem: 2, l_ks: 1.4, rol: 2, ligging: 2 }],
  ["knieschot, 50°, steunafstand onderrand 1 m", { ...STANDAARD, systeem: 2, α_dak: 50, l_so: 1 }],
  ["A-spant, trekband, 35°", { ...STANDAARD, systeem: 3, α_dak: 35 }],
  ["A-spant, hanenbalk op 1,2 m, CC1, puntlast vast", { ...STANDAARD, systeem: 3, z_hb: 1.2, puntlast: 2, x_F: 2.5 }, { ...SCOPE, CC: 1 }],
  ["A-spant, hanenbalk, 55°, randgebied", { ...STANDAARD, systeem: 3, α_dak: 55, z_hb: 2, ligging: 2 }],
  ["lessenaardak 8°, randgebied, klimaatklasse 3", { ...STANDAARD, systeem: 4, α_dak: 8, l_h: 5, ligging: 2, klimaatklasse: 3 }],
  ["lessenaardak 25°, schuine rol", { ...STANDAARD, systeem: 4, α_dak: 25, rol: 2 }],
  ["hoekkeper 30°, schuine rol, GL28h", { ...STANDAARD, systeem: 5, α_dak: 30, l_h: 3, rol: 2, sterkteklasse: 5, b_sp: 90, h_sp: 270 }],
  ["hoekkeper 18° (q_k), puntlast vast", { ...STANDAARD, systeem: 5, α_dak: 18, l_h: 2.5, puntlast: 2, x_F: 2, b_sp: 75, h_sp: 225 }],
  ["ontwerplevensduur 100 jaar, windgebied I, zee", { ...STANDAARD, α_dak: 25 }, { ...SCOPE, DesignLife: 100, windgebied: 1, terreincategorie: 1 }],
  ["zonder w_max-eis, zonder keep", { ...STANDAARD, wmax_eis: 0, t_keep: 0 }],
];
for (const [naam, inv, scope] of varianten) vergelijk(`Variant: ${naam}`, inv, scope ?? SCOPE);

// ── Rondom ───────────────────────────────────────────────────────────────────
{
  console.log("\nOnvolledige invoer");
  for (const [naam, inv] of [
    ["knieschot buiten 0,1..0,9·l", { ...STANDAARD, systeem: 2, l_ks: 3.9 }],
    ["hanenbalk boven 0,8·h", { ...STANDAARD, systeem: 3, z_hb: 3.2 }],
    ["keep dieper dan h/2", { ...STANDAARD, t_keep: 120 }],
    ["helling 80°", { ...STANDAARD, α_dak: 80 }],
    ["puntlast buiten de spoor", { ...STANDAARD, puntlast: 2, x_F: 5 }],
  ]) {
    const got = doorreken(inv);
    const s = slot(got);
    meld(/niet getoetst: invoer onvolledig/.test(got.text) && s && s.uc === null && !s.voldoet, `${naam}: niet getoetst`);
  }
}
{
  console.log("\nAlle keuzes rekenen zonder NaN of foutmelding");
  let n = 0;
  for (const systeem of [1, 2, 3, 4, 5]) for (const rol of [1, 2]) for (const puntlast of [0, 1, 2]) for (const ligging of [1, 2]) {
    const got = doorreken({ ...STANDAARD, systeem, rol, puntlast, ligging });
    const stuk = ["NaN", "Error", "Undefined symbol", "niet gedefinieerd", "undefined", "Infinity"].filter((x) => got.text.includes(x));
    if (stuk.length || !slot(got)) { meld(false, `systeem ${systeem}, rol ${rol}, puntlast ${puntlast}, ligging ${ligging}`, stuk.join(", ") || "geen slotregel"); n++; }
  }
  meld(n === 0, "60 keuzecombinaties schoon, elk met een slotregel");
}
{
  console.log("\nBeeld en blad");
  const hier = dirname(fileURLToPath(import.meta.url));
  const pad = join(hier, "../packages/desktop/src/components/calc/HoutenKapDesigner.tsx");
  const velden = new Set([...tpl.matchAll(/^\s*([\p{L}_][\p{L}\p{N}_,]*)\s*=\s*\?/gmu)].map((m) => m[1].replace(/,/g, "_")));
  for (const m of tpl.matchAll(/^\s*@select\s+(\S+)/gm)) velden.add(m[1]);
  const zonder = [...velden].filter((k) => !(k in STANDAARD));
  meld(zonder.length === 0, "elk invoerveld van het blad heeft een beginwaarde", zonder.join(", "));
  const onbekend = Object.keys(STANDAARD).filter((k) => !velden.has(k));
  meld(onbekend.length === 0, "de standaardinvoer kent alleen velden van het blad", onbekend.join(", "));
  if (existsSync(pad)) {
    const bron = readFileSync(pad, "utf8");
    const blok = bron.match(/const DEFAULTS[^=]*=\s*\{([\s\S]*?)\n\};/);
    const def = {};
    for (const m of (blok?.[1] ?? "").matchAll(/([\p{L}_][\p{L}\p{N}_]*)\s*:\s*(-?[\d.]+)/gu)) def[m[1]] = parseFloat(m[2]);
    const verschil = [...new Set([...Object.keys(def), ...Object.keys(STANDAARD)])].filter((k) => def[k] !== STANDAARD[k]);
    meld(verschil.length === 0, "de beginwaarden van het beeld zijn de standaardinvoer",
      verschil.map((k) => `${k}: beeld ${def[k]} / hier ${STANDAARD[k]}`).join("; "));
    const marker = bron.match(/const MARKER = "([^"]+)"/)?.[1];
    meld(!!marker && tpl.split("\n")[0].includes(marker), `het beeld herkent het blad aan de titel ("${marker}")`);
  } else {
    meld(false, "het beeld HoutenKapDesigner.tsx bestaat");
  }
}

afronden(fouten, "Houten kap");
