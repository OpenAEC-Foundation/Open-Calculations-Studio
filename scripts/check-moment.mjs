/**
 * Controlescript voor de module Momentverbinding (NEN-EN 1993-1-8 met NB).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten daarom op drie manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript, met lussen over de rijen
 *      in plaats van de uitgeschreven rijen van het blad: de T-stukken van
 *      kolomflens en kopplaat (tabel 6.2, 6.4, 6.6, α uit figuur 6.11 met een
 *      eigen bisectie), kolomlijf en liggerlijf op trek, de rijgroepen, de
 *      grens uit kolomlijf op afschuiving en druk en liggerflens op druk, de
 *      driehoeksverdeling (§6.2.7.2(9), met de NB vanaf 1,8·F_t,Rd), M_j,Rd,
 *      de dwarskracht via de bouten, de lassen, S_j,ini (tabel 6.11) en de
 *      classificatie. Ook de gelaste verbinding, met de flenslassen op de volle
 *      flens (§4.10(5)). De lassen volgens §6.2.3(4): de flenslas op
 *      M_j,Rd/z_f, en de lijflas buiten de component liggerlijf op trek, in de
 *      trekzone per mm minstens zo sterk als het lijf. Het oordeel wordt
 *      gelezen zoals de rapportkop dat doet.
 *   2. Een handberekening van het voorbeeld (de beginwaarden van het beeld),
 *      met de tussenstappen hieronder uitgeschreven, en grensgevallen: UC
 *      precies rond 1, een sluitring precies tegen de flenslas, α op de
 *      verticale tak van figuur 6.11 en de driehoeksverdeling.
 *   3. De voorwaarden die de toetsing blokkeren (botsing, tabel 3.3, keel
 *      < 3 mm, console steiler dan 45° of zonder hoogte of lengte, kopplaat
 *      zonder dikte of > 40 mm, slappe kolomflens of een liggerflens breder
 *      dan de kolomflens bij een gelaste flens, een tweede rij boven de
 *      ligger, een negatief moment of een negatieve dwarskracht): melding in
 *      het blad en "voldoet niet". Zonder overspanning L_b geen classificatie. Ook de opmerking in de NB bij §6.2.7.2(9): een rij
 *      boven 1,8·F_t,Rd keurt af, tenzij de verbinding volledig sterk is.
 *
 * Elk blad moet vrij zijn van NaN, ook als geen enkele rij boven het drukpunt
 * ligt.
 *
 * Daarnaast: de beginwaarden van het beeld geven een geldig blad dat voldoet.
 *
 * Draaien:  node scripts/check-moment.mjs
 * Vereist een gebouwde core (npm --prefix packages/core run build) en een Node
 * die TypeScript rechtstreeks laadt (22.18 of nieuwer), voor profielen.ts.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { parse, evaluate, render } from "../packages/core/dist/index.js";
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const hier = dirname(fileURLToPath(import.meta.url));
const { PROFIELEN } = await import(pathToFileURL(join(hier, "../packages/desktop/src/components/calc/profielen.ts")).href);
const tpl = laadTemplate("momentverbinding.ts");

/** Beginwaarden van het beeld; ook de basis van de sets. */
const beeld = readFileSync(join(hier, "../packages/desktop/src/components/calc/MomentverbindingDesigner.tsx"), "utf8");
const DEFAULTS = Object.fromEntries(
  [...beeld.slice(beeld.indexOf("const DEFAULTS"), beeld.indexOf("};", beeld.indexOf("const DEFAULTS"))).matchAll(/(\w+): (-?[\d.]+)/g)]
    .map((m) => [m[1], Number(m[2])]),
);

// ── Tabellen (ISO en EN 1993-1-8), los van het blad overgenomen ──────────────
const AS = { 12: 84.3, 16: 157, 20: 245, 24: 353, 27: 459, 30: 561 };
const D0 = { 12: 13, 16: 18, 20: 22, 24: 26, 27: 30, 30: 33 };
const RING = { 12: [24, 2.5], 16: [30, 3], 20: [37, 3], 24: [44, 4], 27: [50, 4], 30: [56, 4] }; // ISO 7089: Ø, dikte
const KOP = { 12: 7.5, 16: 10, 20: 12.5, 24: 15, 27: 17, 30: 18.7 };                   // ISO 4014
const MOER = { 12: 10.8, 16: 14.8, 20: 18, 24: 21.5, 27: 23.8, 30: 25.6 };               // ISO 4032
const SW = { 12: [18, 20.03], 16: [24, 26.75], 20: [30, 32.95], 24: [36, 39.55], 27: [41, 45.2], 30: [46, 50.85] };
const FUB = { 46: 400, 56: 500, 88: 800, 109: 1000 };
const FU = { 235: 360, 275: 430, 355: 490 };
const BW = { 235: 0.8, 275: 0.85, 355: 0.9 };

/** Figuur 6.11: α bij (λ1, λ2), met een eigen bisectie op de curve. */
function alfa(l1, l2) {
  const av = 2.75 + 1.25 / l1;                 // verticale tak: gelijk aan een onverstijfde rij
  if (av >= 8) return 8;
  const l2curve = (a) => {
    const l1lim = 1.25 / (a - 2.75);
    return ((a * l1lim) / 2) * Math.pow(l1lim / l1, Math.pow(a / Math.SQRT2, 1.785));
  };
  if (l2 >= (av * l1) / 2) return av;
  if (l2curve(8) >= l2) return 8;
  let lo = av, hi = 8;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (l2curve(mid) > l2) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ── Onafhankelijke uitwerking; eenheden N en mm ─────────────────────────────
function uitwerking(v) {
  const K = PROFIELEN[v.kolomprofiel], L = PROFIELEN[v.liggerprofiel];
  const fy = v.staalsoort, fu = FU[fy], bw = BW[fy], gM2 = 1.25, E = 210000;
  const geb = v.verbindingstype === 1;
  const hcs = v.console > 0 ? v.h_console : 0;
  // Schuine consoleflens (tan θ = h/l): op het plaatvlak t_f/cos θ dik.
  const tV = v.console === 2 ? L.tf * Math.sqrt(1 + (hcs / Math.max(v.l_console, 1)) ** 2) : L.tf;
  const yc = v.console === 2 ? L.h + hcs - tV / 2 : L.h - L.tf / 2;
  const zf = yc - L.tf / 2;
  const M = v.M_Ed * 1e6, V = v.V_Ed * 1e3;
  const r = { geldig: true, bots: [] };
  const blok = (reden) => { r.geldig = false; r.reden = r.reden ?? reden; };

  if (v.M_Ed < 0 || v.V_Ed < 0) blok("negatieve belasting");
  if (v.a_flens < 3 || v.a_lijf < 3) blok("keel");
  if (v.console > 0 && !(v.h_console > 0 && v.l_console > 0)) blok("console zonder maat");
  if (v.console === 2 && v.h_console > v.l_console) blok("console");
  const dwc = K.h - 2 * (K.tf + K.r);
  if (dwc / K.tw > 69 * Math.sqrt(235 / fy)) blok("lijf");

  // Geometrie van de geboute kopplaat
  let n = 0, y = [], ext = false, bp = 0, ep = 0, ec = 0, d0 = 0, rw = 0;
  if (geb) {
    n = Math.min(Math.max(Math.round(v.n_boutrijen), 1), 8);
    ext = v.kopplaattype !== 1;
    const yKp = ext ? -v.u_kp : 0, p12 = ext ? v.p_fl : v.p_kp;
    y = [...Array(n)].map((_, i) => (i === 0 ? yKp + v.e_kp : yKp + v.e_kp + p12 + (i - 1) * v.p_kp));
    bp = Math.max(v.b_kp, L.b); ep = (bp - v.w_kp) / 2; ec = (K.b - v.w_kp) / 2;
    d0 = D0[v.boutmaat]; rw = RING[v.boutmaat][0] / 2;
    // Een buitenlas alleen waar de plaat buiten de flens uitsteekt.
    const leg = Math.SQRT2 * v.a_flens;
    const boven = ext ? 1 : 0, onder = v.kopplaattype === 2 ? 1 : 0;
    const zones = [[-boven * leg, L.tf + leg], [L.h - L.tf - leg, L.h + (v.console === 2 ? 1 : onder) * leg]];
    if (v.console === 2) zones.push([L.h + hcs - tV - leg, L.h + hcs + onder * leg]);
    r.bots = y.map((yi) => zones.some(([o, u]) => yi > o - rw && yi < u + rw));
    if (r.bots.some(Boolean)) blok("botsing");
    const pOk = (n === 1 || p12 >= 2.2 * d0) && (n <= 2 || v.p_kp >= 2.2 * d0);
    if (!(v.e_kp >= 1.2 * d0 && ep >= 1.2 * d0 && ec >= 1.2 * d0 && v.w_kp >= 2.4 * d0 && pOk)) blok("tabel 3.3");
    if (!((v.w_kp - L.tw) / 2 - Math.SQRT2 * v.a_lijf >= rw && (v.w_kp - K.tw) / 2 - K.r >= rw)) blok("lijf te dichtbij");
    if (ext && !(y[0] < 0)) blok("rij 1 niet boven de ligger");
    if (ext && n >= 2 && !(y[1] > 0)) blok("rij 2 ook boven de ligger");
    if (!(v.t_kp > 0)) blok("kopplaat zonder dikte");
    if (v.t_kp > 40) blok("kopplaat > 40 mm");
    r.y = y;
  } else {
    const bfc = Math.min(K.tw + 2 * K.r + 7 * Math.min(K.tf / L.tf, 1) * K.tf, L.b);
    if (bfc < (fy / fu) * L.b) blok("kolomflens");
    if (L.b > K.b) blok("liggerflens breder dan de kolomflens");
    r.bfc = bfc;
  }
  if (!r.geldig) return r;

  // Kolomlijf en liggerflens
  const Avc = Math.max(K.Avz, (K.h - 2 * K.tf) * K.tw);
  const Vwp = (0.9 * fy * Avc) / Math.sqrt(3);
  const sp = geb ? Math.min(2 * v.t_kp, v.t_kp + (v.kopplaattype === 2 ? v.u_kp : 0)) : 0;
  // (6.10)/(6.11): een lasbeen aan de buitenkant van de drukflens alleen bij een gelaste flens
  // of een doorlopende plaat.
  const nLas = !geb || v.kopplaattype === 2 ? 2 : 1;
  const bc = L.tf + nLas * Math.SQRT2 * v.a_flens + 5 * (K.tf + K.r) + sp;
  const omega = (b) => 1 / Math.sqrt(1 + 1.3 * ((b * K.tw) / Avc) ** 2);
  const sigma = (v.N_c_Ed * 1e3) / K.A + (M * (K.h / 2 - K.tf - K.r)) / K.Iy;
  const kwc = sigma <= 0.7 * fy ? 1 : Math.max(1.7 - sigma / fy, 0);
  const lp = 0.932 * Math.sqrt((bc * dwc * fy) / (E * K.tw ** 2));
  const rho = lp <= 0.72 ? 1 : (lp - 0.2) / lp ** 2;
  const Fcwc = omega(bc) * kwc * rho * bc * K.tw * fy;
  const Avb = Math.max(L.Avz, (L.h - 2 * L.tf) * L.tw);
  const Vplb = (Avb * fy) / Math.sqrt(3);
  let Fcfb;
  if (v.console === 2) Fcfb = L.b * L.tf * fy;
  else {
    const rv = V > 0.5 * Vplb ? (2 * V / Vplb - 1) ** 2 : 0;
    Fcfb = (Math.max(L.Wply - (rv * (L.h - 2 * L.tf) ** 2 * L.tw) / 4, 0) * fy) / (L.h - L.tf);
  }
  const Flim = Math.min(Vwp, Fcwc, Fcfb);
  Object.assign(r, { Avc, Vwp, bc, Fcwc, Fcfb, Flim, Vplb, sigma, kwc });

  let Mj, Sj;
  if (geb) {
    const As = AS[v.boutmaat], fub = FUB[v.boutkwaliteit], d = v.boutmaat;
    const Ft = (0.9 * fub * As) / gM2;
    const tmin = Math.min(v.t_kp, K.tf);
    const Bp = (0.6 * Math.PI * ((SW[d][0] + SW[d][1]) / 2) * tmin * fu) / gM2;
    const Ftb = Math.min(Ft, Bp);
    const Lb = K.tf + v.t_kp + 2 * RING[d][1] + (KOP[d] + MOER[d]) / 2;
    const mc = (v.w_kp - K.tw) / 2 - 0.8 * K.r;
    const mp = (v.w_kp - L.tw) / 2 - 0.8 * Math.SQRT2 * v.a_lijf;
    const emin = Math.min(ec, ep);
    const nc = Math.min(emin, 1.25 * mc), np = Math.min(emin, 1.25 * mp);
    // T-stuk, tabel 6.2 (methode 1), k rijen van twee bouten
    const Tstuk = (l1, l2, t, m, nn, k) => {
      const Lster = (8.8 * m ** 3 * As * k) / (l1 * t ** 3);
      const F3 = 2 * k * Ftb;
      if (Lb <= Lster) return Math.min((l1 * t * t * fy) / m, (0.5 * l2 * t * t * fy + 2 * k * nn * Ftb) / (m + nn), F3);
      return Math.min((0.5 * l1 * t * t * fy) / m, F3);
    };
    const hr = y.map((yi) => yc - yi);
    const rf = ext ? 1 : 0;            // index van de eerste rij onder de trekflens
    let a = 8, mx = 0, lx = [0, 0];
    if (n > rf) {
      const m2 = y[rf] - L.tf - 0.8 * Math.SQRT2 * v.a_flens;
      a = alfa(mp / (mp + ep), m2 / (mp + ep));
      r.m2 = m2;
    }
    if (ext) {
      mx = -y[0] - 0.8 * Math.SQRT2 * v.a_flens;
      const ex = v.e_kp;
      lx = [
        Math.min(2 * Math.PI * mx, Math.PI * mx + v.w_kp, Math.PI * mx + 2 * ep),
        Math.min(4 * mx + 1.25 * ex, ep + 2 * mx + 0.625 * ex, 0.5 * bp, 0.5 * v.w_kp + 2 * mx + 0.625 * ex),
      ];
      r.Fpx = Tstuk(Math.min(...lx), lx[1], v.t_kp, mx, Math.min(ex, 1.25 * mx), 1);
    }
    // Kolomflens voor rijen i..j (tabel 6.4): lengtes als som over de groep
    const kolom = (i, j) => {
      const span = y[j] - y[i];
      const cp = 2 * Math.PI * mc + 2 * span, nc2 = 4 * mc + 1.25 * ec + span;
      const l1 = Math.min(cp, nc2);
      return { fl: Tstuk(l1, nc2, K.tf, mc, nc, j - i + 1), lijf: omega(l1) * l1 * K.tw * fy };
    };
    // Kopplaat (tabel 6.6) voor rijen i..j onder de trekflens
    const plaat = (i, j) => {
      const span = y[j] - y[i];
      const cp = 2 * Math.PI * mp + 2 * span;
      const nc2 = (i === rf ? a * mp : 4 * mp + 1.25 * ep) + span;
      const l1 = Math.min(cp, nc2);
      // Liggerlijf op trek (6.22) zonder de lijflas: die mag M_j,Rd niet begrenzen (§6.2.3(4)).
      return { pl: Tstuk(l1, nc2, v.t_kp, mp, np, j - i + 1), lijf: l1 * L.tw * fy };
    };
    const F = Array(n).fill(0);
    const detail = [];
    let x = null;                       // rij met meer dan 1,8·F_t,Rd (§6.2.7.2(9) met de NB)
    for (let j = 0; j < n; j++) {
      if (hr[j] <= 0) { detail.push(null); continue; }
      const kands = [];
      const kc = kolom(j, j);
      kands.push(kc.fl, kc.lijf);
      if (ext && j === 0) kands.push(r.Fpx);
      else { const p = plaat(j, j); kands.push(p.pl, p.lijf); }
      let groep = Infinity;
      for (let i = 0; i < j; i++) {
        const al = F.slice(i, j).reduce((s, f) => s + f, 0);
        const g = kolom(i, j);
        let gmin = Math.min(g.fl, g.lijf);
        if (i >= rf) { const p = plaat(i, j); gmin = Math.min(gmin, p.pl, p.lijf); }
        groep = Math.min(groep, gmin - al);
      }
      kands.push(groep);
      kands.push(Flim - F.slice(0, j).reduce((s, f) => s + f, 0));
      if (x !== null) kands.push((F[x] * hr[j]) / hr[x]);
      F[j] = Math.max(0, Math.min(...kands));
      detail.push({ groep });
      if (x === null && F[j] > 1.8 * Ft) x = j;
    }
    Mj = F.reduce((s, f, j) => s + f * hr[j], 0);
    // Opmerking in de NB bij §6.2.7.2(9): een rij boven 1,8·F_t,Rd mag alleen in een
    // volledig sterke verbinding, M_j,Rd ≥ min(M_pl,b,Rd; 2·M_pl,c,Rd) (figuur 5.5).
    const Mfs = Math.min(L.Wply, 2 * K.Wply) * fy;
    const nbOk = x === null || Mj >= Mfs;
    Object.assign(r, { Ft, Bp, Lb, mc, mp, nc, np, a, mx, lx, F, hr, x, detail, Mfs, nbOk });

    // Dwarskracht via de bouten
    const Fv = ((v.boutkwaliteit === 109 ? 0.5 : 0.6) * fub * As) / gM2;
    const e2 = Math.min(ep, ec);
    const k1 = Math.min(2.8 * e2 / d0 - 1.7, 1.4 * v.w_kp / d0 - 1.7, 2.5);
    const pmin = n >= 3 ? Math.min(ext ? v.p_fl : v.p_kp, v.p_kp) : n === 2 ? (ext ? v.p_fl : v.p_kp) : Infinity;
    const ab = Math.min(v.e_kp / (3 * d0), pmin / (3 * d0) - 0.25, fub / fu, 1);
    const Fb = (k1 * ab * fu * d * tmin) / gM2;
    const nt = 2 * F.filter((f) => f > 0).length;
    const VRd = (2 * n - nt) * Math.min(Fv, Fb) + nt * Math.min((0.4 / 1.4) * Fv, Fb);
    Object.assign(r, { Fv, Fb, VRd, UCV: V / VRd });

    // Stijfheid: l_eff per rij de kleinste van rij en groep (tabel 6.11)
    const nt2 = hr.filter((h) => h > 0).length;
    const k10 = (1.6 * As) / Lb;
    let s1 = 0, s2 = 0;
    for (let j = 0; j < nt2; j++) {
      const pb = j > 0 ? y[j] - y[j - 1] : null, po = j < nt2 - 1 ? y[j + 1] - y[j] : null;
      const lc = [2 * Math.PI * mc, 4 * mc + 1.25 * ec];
      if (pb !== null) lc.push(Math.PI * mc + pb, 2 * mc + 0.625 * ec + 0.5 * pb);
      if (po !== null) lc.push(Math.PI * mc + po, 2 * mc + 0.625 * ec + 0.5 * po);
      if (pb !== null && po !== null) lc.push(0.5 * (pb + po));
      let lp2, m5;
      if (ext && j === 0) { lp2 = Math.min(...lx); m5 = mx; } else {
        const lpl = [2 * Math.PI * mp, j === rf ? a * mp : 4 * mp + 1.25 * ep];
        if (pb !== null && j > rf) lpl.push(Math.PI * mp + pb, 2 * mp + 0.625 * ep + 0.5 * pb);
        if (po !== null) lpl.push(Math.PI * mp + po, j === rf ? 0.5 * po + a * mp - 2 * mp - 0.625 * ep : 2 * mp + 0.625 * ep + 0.5 * po);
        if (pb !== null && po !== null && j > rf) lpl.push(0.5 * (pb + po));
        lp2 = Math.min(...lpl); m5 = mp;
      }
      const lcm = Math.min(...lc);
      const k3 = (0.7 * lcm * K.tw) / dwc, k4 = (0.9 * lcm * K.tf ** 3) / mc ** 3, k5 = (0.9 * lp2 * v.t_kp ** 3) / m5 ** 3;
      const ke = 1 / (1 / k3 + 1 / k4 + 1 / k5 + 1 / k10);
      s1 += ke * hr[j]; s2 += ke * hr[j] ** 2;
    }
    const zeq = nt2 > 0 ? s2 / s1 : NaN, keq = s1 / zeq;
    const k1s = (0.38 * Avc) / zeq, k2s = (0.7 * bc * K.tw) / dwc;
    Sj = (E * zeq ** 2) / (1 / k1s + 1 / k2s + 1 / keq);
    Object.assign(r, { zeq, keq });
  } else {
    const bt = L.tf + 2 * Math.SQRT2 * v.a_flens + 5 * (K.tf + K.r);
    const Ftwc = omega(bt) * bt * K.tw * fy;
    const Ffc = r.bfc * L.tf * fy;
    Mj = zf * Math.min(Ftwc, Ffc, Flim);
    const k1s = (0.38 * Avc) / zf, k2s = (0.7 * bc * K.tw) / dwc, k3s = (0.7 * bt * K.tw) / dwc;
    Sj = (E * zf ** 2) / (1 / k1s + 1 / k2s + 1 / k3s);
    Object.assign(r, { Ftwc, Ffc, UCV: 0 });
  }

  // Lassen van de ligger
  // Korte kopplaat: de trekflens alleen aan de binnenzijde gelast.
  const Lwf = geb && v.kopplaattype === 1 ? L.b - L.tw - 2 * L.r : 2 * L.b - L.tw - 2 * L.r;
  const Fw_f = (v.a_flens * Lwf * fu) / (Math.SQRT2 * bw * gM2);
  const Fw_w = (v.a_lijf * 2 * (L.h - 2 * L.tf - 2 * L.r) * fu) / (Math.sqrt(3) * bw * gM2);
  // §6.2.3(4): de flenslas draagt de flenskracht bij M_j,Rd; een gelaste flens ten minste de
  // volle flens (§4.10(5)). De lijflas in de trekzone van een kopplaat moet per mm minstens zo
  // sterk zijn als het lijf: dubbele hoeklas dwars belast, √2·a·f_u/(β_w·γ_M2) ≥ t_w·f_y.
  const Ff = geb ? Mj / zf : Math.max(Mj / zf, L.b * L.tf * fy);
  const UClf = Ff / Fw_f, UClw = V / Fw_w;
  const UClt = geb ? (L.tw * fy) / ((Math.SQRT2 * v.a_lijf * fu) / (bw * gM2)) : 0;
  const UCM = M / Mj, UCVb = V / Vplb;
  const kb = v.stabiliteit === 2 ? 8 : 25;
  const EIL = (E * L.Iy) / v.L_b;
  const klasse = !(v.L_b > 0) ? "niet bepaald"
    : Sj >= kb * EIL ? "stijf" : Sj <= 0.5 * EIL ? "nominaal scharnierend" : "semi-stijf";
  const UCmax = Math.max(UCM, r.UCV, UCVb, UClf, UClw, UClt);
  return Object.assign(r, { Mj, Sj, UCM, UCVb, UClf, UClw, UClt, UCmax, klasse, zf, yc, Ff, Fw_f, tV });
}

// ── Vergelijken ──────────────────────────────────────────────────────────────
const s4 = (x) => {
  if (x === 0) return "0";
  const dec = Math.max(0, 3 - Math.floor(Math.log10(Math.abs(x))));
  return x.toFixed(dec);
};
const ruim = (x) => ({ waarde: s4(x), tol: Math.max(Math.abs(x) * 0.002, 1e-6) });

function verwachtingen(u, v) {
  if (!u.geldig) return {};
  const uit = {
    V_wp_Rd: ruim(u.Vwp / 1e3), b_eff_c_wc: ruim(u.bc), F_c_wc_Rd: ruim(u.Fcwc / 1e3),
    F_c_fb_Rd: ruim(u.Fcfb / 1e3), F_lim: ruim(u.Flim / 1e3), M_j_Rd: ruim(u.Mj / 1e6), UC_M: ruim(u.UCM),
    UC_Vb: ruim(u.UCVb), UC_lf: ruim(u.UClf), UC_lw: ruim(u.UClw), S_j_ini: ruim(u.Sj / 1e6), UC_max: ruim(u.UCmax),
    F_f_Ed: ruim(u.Ff / 1e3),
  };
  // Zonder momentweerstand geen UC_M en geen slotregel met een getal.
  if (!(u.Mj > 0)) { delete uit.UC_M; delete uit.UC_max; }
  if (v.verbindingstype === 1) {
    Object.assign(uit, {
      F_t_Rd: ruim(u.Ft / 1e3), B_p_Rd: ruim(u.Bp / 1e3), L_bout: ruim(u.Lb), m_c: ruim(u.mc), m_p: ruim(u.mp),
      F_v_Rd: ruim(u.Fv / 1e3), F_b_Rd: ruim(u.Fb / 1e3), V_Rd: ruim(u.VRd / 1e3), UC_V: ruim(u.UCV),
      UC_lt: ruim(u.UClt),
    });
    // Zonder rij boven het drukpunt vervalt de stijfheid (het blad meldt dat).
    if (Number.isFinite(u.zeq)) Object.assign(uit, { z_eq: ruim(u.zeq), k_eq: ruim(u.keq) });
    else delete uit.S_j_ini;
    u.F.forEach((f, j) => { uit[`F_t${j + 1}_Rd`] = { waarde: s4(f / 1e3), tol: Math.max((f / 1e3) * 0.002, 0.01) }; });
    if (u.m2 !== undefined) uit["α"] = ruim(u.a);
  } else {
    Object.assign(uit, { F_t_wc_Rd: ruim(u.Ftwc / 1e3), F_fc_Rd: ruim(u.Ffc / 1e3) });
  }
  return uit;
}

/**
 * Wat het blad verborgen rekent maar in de rijentabel en de slotregel laat
 * zien: per rij h_r, de losse componenten, de groepsgrens en F_tr,Rd, plus de
 * maatgevende UC. Namen als in het blad (h_1, Fc_1, …, F_t1_Rd, UC_max).
 */
function uitTabel(tplTekst, selectValues) {
  const html = render(evaluate(parse(tplTekst), selectValues, { CC: 2, K_FI: 1 }));
  const uit = {};
  const kop = html.indexOf("t.o.v. flens");
  if (kop >= 0) {
    const stuk = html.slice(kop, html.indexOf("</table>", kop));
    const getal = (c) => (c === "—" || c === "" ? undefined : Number(c.replace(",", ".")));
    for (const tr of stuk.matchAll(/<tr>(.*?)<\/tr>/g)) {
      const cel = [...tr[1].matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((c) => c[1].replace(/<[^>]+>/g, "").trim());
      if (cel.length !== 11) continue;
      const i = cel[0];
      const namen = [null, null, `h_${i}`, `Fc_${i}`, `Fw_${i}`, `Fp_${i}`, `Fb_${i}`, `Fg_${i}`, `Fr_${i}`, `Fd_${i}`, `F_t${i}_Rd`];
      namen.forEach((n, k) => { const w = getal(cel[k]); if (n && w !== undefined && Number.isFinite(w)) uit[n] = w; });
    }
  }
  const tekst = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const m = tekst.match(/Maatgevende UC = ([\d.]+)/);
  if (m) uit.UC_max = Number(m[1]);
  const y = tekst.match(/rij 1 op y = (-?[\d.]+) mm/i);
  if (y) uit.y_1 = Number(y[1]);
  return uit;
}

/** Het oordeel zoals de rapportkop het leest (bladResultaat.ts). */
function oordeel(text) {
  const i = text.lastIndexOf("Maatgevende UC");
  const zin = i >= 0 ? text.slice(i, i + 240) : "";
  return !/voldoe[nt] niet/.test(zin) && /voldoe[nt]/.test(zin);
}

const BASIS = { ...DEFAULTS };

const SETS = [
  {
    naam: "1 — voorbeeld: de beginwaarden van het beeld (handberekening)",
    invoer: {},
    // HEB 160 / IPE 240, S235, overstekende kopplaat 140 × 15, u = 60, 4 rijen M16 8.8
    // (e = 30, p_fl = 70, p = 60, w = 70), console met flens 120 × 240, a = 5/3 mm,
    // M_Ed = 60 kNm, V_Ed = 80 kN, N_c,Ed = 100 kN, L_b = 6000 mm, ongeschoord.
    //
    // Rijen: y = −30, 40, 100, 160 mm. De consoleflens loopt onder tan θ = 120/240 en is op het
    //   plaatvlak 9,8·√(1 + 0,5²) = 10,96 mm dik → drukpunt y_c = 240 + 120 − 10,96/2 = 354,52 mm
    //   → h_r = 384,5 / 314,5 / 254,5 / 194,5 mm. Sluitring Ø30: rij 1 ligt 22,9 mm
    //   boven de las (≥ 15), rij 2 23,1 mm onder de las (≥ 15): geen botsing.
    // Kolomlijf: A_vc = 17,59 cm² → V_wp,Rd = 0,9·235·1759/√3 = 214,8 kN.
    //   b_eff,c,wc = 9,8 + √2·5 + 5·(13 + 15) + 15 = 171,9 mm: één lasbeen, de overstekende plaat
    //   loopt niet onder de consoleflens door. ω = 1/√(1 + 1,3·(171,9·8/1759)²) = 0,7465;
    //   σ = 100 000/5425 + 60·10⁶·52/2492·10⁴ = 143,6 ≤ 164,5 → k_wc = 1;
    //   λ_p = 0,932·√(171,9·104·235/(210 000·8²)) = 0,521 → ρ = 1; F_c,wc,Rd = 0,7465·171,9·8·235 = 241,2 kN.
    //   Consoleflens: 120·9,8·235 = 276,4 kN. F_lim = 214,8 kN (afschuiving).
    // Bout: F_t,Rd = 0,9·800·157/1,25 = 90,43 kN; L_b = 13 + 15 + 2·3 + (10 + 14,8)/2 = 46,4 mm.
    //   m_c = 31 − 12 = 19, e_c = 45; m_p = 31,9 − 3,39 = 28,51, e_p = 35; n_c = 23,75, n_p = 35.
    //   m_x = 30 − 5,66 = 24,34, e_x = 30; m_2 = 40 − 9,8 − 5,66 = 24,54 mm.
    //   λ_1 = 28,51/63,51 = 0,449, λ_2 = 0,386 → α = 5,80 (α_v = 5,53 op de verticale tak).
    // Rij 1: kolomflens l_eff = 2π·19 = 119,4; L_b* = 8,8·19³·157/(119,4·13³) = 36,1 < 46,4:
    //   geen wrikkracht → 0,5·119,4·13²·235/19 = 124,8 kN. Kolomlijf ω = 0,850 → 190,8 kN.
    //   Kopplaat: l_eff = min(146,5; 70) = 70 (0,5·b_p); met wrikkracht: modus 2
    //   (0,5·70·15²·235 + 2·30·90 430)/(24,34 + 30) = 133,9 kN. → F_t1,Rd = 124,8 kN.
    // Rij 2: kopplaat α·m = 165,3 → modus 2 = 168,5 kN; liggerlijf 165,3·6,2·235 = 240,8 kN.
    //   Groep 1–2 in de kolomflens: l_eff = 132,25 + 70 = 202,3, L_b* = 42,7 < 46,4 → 211,4 kN,
    //   min rij 1 = 86,6 kN; rest F_lim = 214,8 − 124,8 = 90,0 → F_t2,Rd = 86,6 kN.
    // Rij 3: groep 1–3 kolomlijf: b = 262,3, ω = 0,592 → 292,1 − 211,4 = 80,7 kN; rest
    //   F_lim = 214,8 − 211,4 = 3,4 → F_t3,Rd = 3,4 kN. Rij 4: rest 0.
    // M_j,Rd = 0,3845·124,8 + 0,3145·86,6 + 0,2545·3,4 = 76,09 kNm → UC = 60/76,09 = 0,789.
    // Dwarskracht: F_v,Rd = 60,29 kN; F_b,Rd = 2,5·0,556·360·16·13/1,25 = 83,2 kN;
    //   6 getrokken bouten: V_Rd = 2·60,29 + 6·0,2857·60,29 = 223,9 kN → UC 0,357.
    // Lassen (§6.2.3(4)): z_f = 354,52 − 4,9 = 349,6 mm → F_f = M_j,Rd/z_f = 76,09/0,3496 = 217,6 kN
    //   (bij M_Ed zou het 171,6 kN zijn); flens 5·203,8·360/(√2·0,8·1,25) = 259,4 kN → UC 0,839; lijf op
    //   afschuiving 3·380,8·360/(√3·1,0) = 237,4 kN → UC 0,337. Lijflas in de trekzone: √2·3·360/(0,8·1,25)
    //   = 1527 N/mm tegen het lijf 6,2·235 = 1457 N/mm → UC 0,954, maatgevend. Het liggerlijf van rij 2
    //   (240,8 kN) was al zonder las maatgevend in die component, dus M_j,Rd blijft 76,09 kNm.
    // Stijfheid: z_eq = 308,2 mm, k_eq = 6,904 mm, k_1 = 0,38·1759/308,2 = 2,169, k_2 = 0,7·171,9·8/104
    //   = 9,255 → S_j,ini = 210 000·308,2²/(1/2,169 + 1/9,255 + 1/6,904) = 27 930 kNm/rad;
    //   stijf vanaf 25·E·I_b/L_b = 34 055 → semi-stijf.
    handwerk: {
      y_1: "-30", h_1: "384.5", V_wp_Rd: "214.8", b_eff_c_wc: "171.9", ω_c: "0.7465", σ_com_Ed: "143.6",
      F_c_wc_Rd: "241.2", F_c_fb_Rd: "276.4", F_lim: "214.8", F_t_Rd: "90.43", L_bout: "46.4", m_c: "19",
      m_p: "28.51", m_x: "24.34", m_2: "24.54", "α": "5.80", Fc_1: "124.8", Fw_1: "190.8", Fp_1: "133.9",
      Fp_2: "168.5", Fb_2: "240.8", F_t1_Rd: "124.8", F_t2_Rd: "86.6", F_t3_Rd: "3.4", F_t4_Rd: "0",
      M_j_Rd: "76.09", UC_M: "0.789", F_b_Rd: "83.2", V_Rd: "223.9", UC_V: "0.357", F_w_f_Rd: "259.4",
      F_f_Ed: "217.6", UC_lf: "0.839", F_w_w_Rd: "237.4", UC_lw: "0.337", UC_lt: "0.954", z_eq: "308.2", S_j_ini: "27930",
      UC_max: "0.954",
    },
    klasse: "semi-stijf",
  },
  {
    naam: "2 — grensgeval: M_Ed = 76,05 kNm, net onder M_j,Rd = 76,09",
    invoer: { M_Ed: 76.05 },
  },
  {
    naam: "3 — grensgeval: M_Ed = 76,15 kNm, net boven M_j,Rd",
    invoer: { M_Ed: 76.15 },
  },
  {
    naam: "4 — korte kopplaat, HEB 200 / IPE 300, S355, 3 rijen M20 10.9, geen console",
    invoer: {
      kopplaattype: 1, kolomprofiel: 16, liggerprofiel: 24, staalsoort: 355, boutkwaliteit: 109, boutmaat: 20,
      console: 0, n_boutrijen: 3, t_kp: 20, b_kp: 160, e_kp: 50, p_kp: 70, w_kp: 90, a_flens: 6, a_lijf: 4,
      M_Ed: 80, V_Ed: 100, N_c_Ed: 300, L_b: 7000, stabiliteit: 2,
    },
    // §6.2.3(4): een lijflas van 4 mm in S355 is zwakker dan het lijf, √2·4·490/(0,9·1,25) = 2464 N/mm
    // tegen 7,1·355 = 2520,5 N/mm → UC_lt = 1,023: voldoet niet, hoewel UC_M 0,785 is.
    handwerk: { UC_lt: "1.023" },
  },
  {
    naam: "4b — grensgeval lijflas: set 4 met a_lijf = 4,1 mm, net sterker dan het lijf",
    invoer: {
      kopplaattype: 1, kolomprofiel: 16, liggerprofiel: 24, staalsoort: 355, boutkwaliteit: 109, boutmaat: 20,
      console: 0, n_boutrijen: 3, t_kp: 20, b_kp: 160, e_kp: 50, p_kp: 70, w_kp: 90, a_flens: 6, a_lijf: 4.1,
      M_Ed: 80, V_Ed: 100, N_c_Ed: 300, L_b: 7000, stabiliteit: 2,
    },
    // √2·4,1·490/(0,9·1,25) = 2525,5 ≥ 2520,5 N/mm → UC_lt = 0,9980 (de grens ligt bij a = 4,092 mm).
    handwerk: { UC_lt: "0.9980" },
  },
  {
    naam: "5 — grensgeval sluitring: korte kopplaat, rij 1 op 31,9 mm (vrij: 9,8 + √2·5 + 15 = 31,87)",
    invoer: { kopplaattype: 1, e_kp: 31.9, p_kp: 60, n_boutrijen: 3, console: 0 },
    geenMelding: /botst/,
  },
  {
    naam: "6 — grensgeval sluitring: rij 1 op 31,8 mm raakt de flenslas",
    invoer: { kopplaattype: 1, e_kp: 31.8, p_kp: 60, n_boutrijen: 3, console: 0 },
    melding: /Rij 1 \(y = 31\.8 mm\) botst/,
  },
  {
    naam: "7 — α op de verticale tak van figuur 6.11: rij ver onder de flens",
    invoer: { kopplaattype: 1, e_kp: 100, p_kp: 60, n_boutrijen: 2, console: 0, M_Ed: 20 },
    // m_2 = 100 − 9,8 − 5,66 = 84,54 → λ_2 = 1,331 ≥ α_v·λ_1/2 = 1,242: α = α_v = 2,75 + 1,25/0,4489
    // = 5,535, zodat α·m = 4m + 1,25e = 157,8 mm, precies een onverstijfde rij.
    handwerk: { "α": "5.535" },
  },
  {
    naam: "8 — driehoeksverdeling: HEB 300 / IPE 300, kopplaat 25 mm, M12 8.8 (bouten maatgevend)",
    invoer: {
      kopplaattype: 3, kolomprofiel: 20, liggerprofiel: 24, boutmaat: 12, t_kp: 25, b_kp: 160, w_kp: 100,
      e_kp: 30, u_kp: 60, p_fl: 70, p_kp: 60, n_boutrijen: 4, console: 0, a_flens: 7, a_lijf: 4, M_Ed: 50,
    },
    // F_t,Rd = 0,9·800·84,3/1,25 = 48,56 kN. Rij 1 haalt modus 3: 2·48,56 = 97,1 kN > 1,8·48,56
    // = 87,4 kN (NB; zonder NB 1,9·48,56 = 92,3 kN), dus rij 2 en verder hoogstens
    // 97,1·h_r/h_1 (§6.2.7.2(9)).
    handwerk: { F_t_Rd: "48.56", F_t1_Rd: "97.1" },
    driehoek: true,
  },
  {
    naam: "9 — doorlopende kopplaat, console zonder flens, 5 rijen, HEA 240 / IPE 330, M24",
    invoer: {
      kopplaattype: 2, kolomprofiel: 8, liggerprofiel: 25, boutmaat: 24, t_kp: 20, b_kp: 170, w_kp: 100,
      e_kp: 40, u_kp: 80, p_fl: 100, p_kp: 70, n_boutrijen: 5, console: 1, h_console: 150, l_console: 300,
      a_flens: 6, a_lijf: 4, M_Ed: 90, V_Ed: 150, N_c_Ed: 400, staalsoort: 275,
    },
  },
  {
    naam: "10 — gelaste verbinding, HEB 200 / IPE 300, geschoord",
    invoer: {
      verbindingstype: 2, kolomprofiel: 16, liggerprofiel: 24, console: 0, a_flens: 7, a_lijf: 4,
      M_Ed: 70, V_Ed: 90, N_c_Ed: 200, stabiliteit: 2,
    },
    // b_eff,t,wc = 10,7 + 2√2·7 + 5·(15 + 18) = 195,5 mm, ω = 0,778 → F_t,wc,Rd = 321,6 kN;
    // b_eff,b,fc = min(9 + 36 + 7·15; 150) = 150 → F_fc,Rd = 150·10,7·235 = 377,2 kN;
    // V_wp,Rd = 303,2 kN maatgevend; z = 300 − 10,7 = 289,3 mm → M_j,Rd = 87,7 kNm.
    handwerk: { F_t_wc_Rd: "321.6", F_fc_Rd: "377.2", V_wp_Rd: "303.2", M_j_Rd: "87.7", UC_M: "0.798" },
    klasse: "stijf",
  },
  {
    naam: "11 — gelaste verbinding met console met flens, S275",
    invoer: {
      verbindingstype: 2, kolomprofiel: 18, liggerprofiel: 23, console: 2, h_console: 150, l_console: 300,
      a_flens: 6, a_lijf: 4, M_Ed: 110, V_Ed: 120, staalsoort: 275,
    },
  },
  {
    naam: "12 — tabel 3.3: w = 40 mm bij M16 (minimum 2,4·18 = 43,2 mm)",
    invoer: { w_kp: 40 },
    melding: /kleiner dan het minimum van tabel 3\.3/,
  },
  {
    naam: "13 — keeldikte lijflas 2,5 mm (§4.5.2(2))",
    invoer: { a_lijf: 2.5 },
    melding: /kleiner dan 3 mm/,
  },
  {
    naam: "14 — console steiler dan 45°: h 250 bij l 200",
    invoer: { h_console: 250, l_console: 200 },
    melding: /steiler dan 45°/,
  },
  {
    naam: "15 — kopplaat 45 mm (tabel 3.1 tot 40 mm)",
    invoer: { t_kp: 45 },
    melding: /dikker dan 40 mm/,
  },
  {
    naam: "16 — overstekende kopplaat met u < e: rij 1 ligt niet boven de ligger",
    invoer: { u_kp: 25, e_kp: 30, p_fl: 70 },
    melding: /botst|ligt niet boven de ligger/,
  },
  {
    naam: "17 — bouten te dicht bij het lijf: w = 60 bij HEB 240 (sluitring raakt de afronding)",
    invoer: { kolomprofiel: 18, w_kp: 60, b_kp: 140 },
    melding: /te dicht bij het lijf/,
  },
  {
    naam: "18 — zwaar belast: M_Ed 120 kNm, V_Ed 250 kN met M_c,Rd-vermindering",
    // w = 100: bij HEB 300 (r = 27) ligt de sluitring vrij van de afronding, (100 − 11)/2 − 27 = 17,5 ≥ 15.
    // V_Ed = 250 > 0,5·V_pl,Rd = 174,2 kN: ρ = (2·250/348,4 − 1)² = 0,189 in M_c,Rd (6.21).
    invoer: { console: 0, M_Ed: 120, V_Ed: 250, liggerprofiel: 24, kolomprofiel: 20, kopplaattype: 3, t_kp: 20, b_kp: 150, w_kp: 100 },
    handwerk: { "ρ_V": "0.189" },
  },
  {
    naam: "19 — overstekende kopplaat met rij 2 ook boven de ligger (u = 100, e = 30, p_fl = 40)",
    invoer: { u_kp: 100, e_kp: 30, p_fl: 40, p_kp: 80, n_boutrijen: 3 },
    melding: /Rij 2 [(]y = -30 mm[)] ligt ook boven de ligger/,
  },
  {
    naam: "20 — negatief moment (trek onderin): afgekeurd",
    invoer: { M_Ed: -60 },
    melding: /mogen niet negatief zijn/,
  },
  {
    naam: "21 — negatieve dwarskracht: afgekeurd",
    invoer: { V_Ed: -300 },
    melding: /mogen niet negatief zijn/,
  },
  {
    naam: "22 — gelaste flens, a = 5 mm: de las haalt de volle flens niet (§4.10(5))",
    invoer: { verbindingstype: 2, console: 0 },
    // Volle flens 120·9,8·235 = 276,4 kN > M_Ed/z = 60/0,2302 = 260,6 kN.
    // Flenslas 5·203,8·360/(√2·0,8·1,25) = 259,4 kN → UC = 276,4/259,4 = 1,065.
    handwerk: { F_f_Ed: "276.4", F_w_f_Rd: "259.4", UC_lf: "1.065" },
  },
  {
    naam: "23 — geen rij boven het drukpunt: geen stijfheid, geen NaN",
    invoer: { kopplaattype: 1, console: 0, e_kp: 300, n_boutrijen: 1 },
    melding: /Geen boutrij boven het drukpunt/,
  },
  {
    naam: "24 — driehoeksverdeling alleen met de NB: rij 1 op 1,887·F_t,Rd (tussen 1,8 en 1,9)",
    invoer: {
      kopplaattype: 1, kolomprofiel: 16, liggerprofiel: 24, boutmaat: 12, t_kp: 12, b_kp: 160, w_kp: 100, e_kp: 45,
      p_kp: 60, n_boutrijen: 4, console: 0, a_flens: 7, a_lijf: 4, M_Ed: 50,
    },
    // Korte kopplaat, rij 1 = eerste rij onder de trekflens. m_p = (100 − 7,1)/2 − 0,8·√2·4 = 41,92,
    // e_p = 30, m_2 = 45 − 10,7 − 0,8·√2·7 = 26,38 → λ_1 = 0,583, λ_2 = 0,367 → α = 5,184.
    // l_eff = α·m = 217,3 mm; L_b = 15 + 12 + 2·2,5 + (7,5 + 10,8)/2 = 41,15 < L_b* → wrikkracht, modus 2:
    // (0,5·217,3·12²·235 + 2·30·48 560)/(41,92 + 30) = 91,64 kN = 1,887·F_t,Rd. Met de NB (1,8) geldt
    // de driehoek: rij 3 ≤ 91,64·129,65/249,65 = 47,59 kN (zonder NB zou de groep 54,62 kN geven).
    handwerk: { "α": "5.184", F_t_Rd: "48.56", F_t1_Rd: "91.64", F_t3_Rd: "47.59" },
    driehoek: true,
  },
  {
    naam: "25 — opmerking NB bij §6.2.7.2(9): set 8 met V_Ed = 30 kN, rij 1 boven 1,8·F_t,Rd, niet volledig sterk",
    invoer: {
      kopplaattype: 3, kolomprofiel: 20, liggerprofiel: 24, boutmaat: 12, t_kp: 25, b_kp: 160, w_kp: 100,
      e_kp: 30, u_kp: 60, p_fl: 70, p_kp: 60, n_boutrijen: 4, console: 0, a_flens: 7, a_lijf: 4, M_Ed: 50, V_Ed: 30,
    },
    // Alle UC's ≤ 1 (UC_M = 50/67,68 = 0,739), maar F_t1,Rd = 97,1 kN > 1,8·48,56 = 87,4 kN en
    // M_j,Rd = 67,7 < min(628,4·235; 2·1869·235) = 147,7 kNm: de NB vraagt een ander ontwerp.
    handwerk: { UC_M: "0.739" },
    melding: /niet volledig sterk: M j,Rd &lt; min[(]M pl,b,Rd ; 2·M pl,c,Rd [)] = 147\.7 kNm/,
    driehoek: true,
  },
  {
    naam: "26 — opmerking NB bij §6.2.7.2(9): rij 1 boven 1,8·F_t,Rd in een volledig sterke verbinding (IPE 200)",
    invoer: {
      kopplaattype: 3, kolomprofiel: 20, liggerprofiel: 21, boutmaat: 16, t_kp: 25, b_kp: 150, w_kp: 100,
      e_kp: 30, u_kp: 60, p_fl: 70, p_kp: 60, n_boutrijen: 3, console: 0, a_flens: 7, a_lijf: 4, M_Ed: 40, V_Ed: 30,
    },
    // Rij 1 haalt modus 3: 2·90,43 = 180,9 kN > 1,8·90,43 = 162,8 kN. M_pl,b,Rd = 220,6·235 = 51,84 kNm
    // en M_j,Rd = 54,8 kNm ≥ 51,84: volledig sterk (figuur 5.5), de driehoek geldt en het blad keurt niet af.
    // Een volledig sterke verbinding vraagt ook een sterke flenslas (§6.2.3(4)): z_f = 195,75 − 4,25 = 191,5 mm,
    // F_f = 54,82/0,1915 = 286,3 kN ≤ 7·170,4·360/(√2·0,8·1,25) = 303,6 kN → UC 0,943 (met a = 5 mm: 1,32).
    handwerk: { F_t1_Rd: "180.9", F_f_Ed: "286.3", F_w_f_Rd: "303.6", UC_lf: "0.943" },
    geenMelding: /niet volledig sterk/,
    driehoek: true,
  },
  {
    naam: "27 — gelaste verbinding, IPE 400 op HEB 160: liggerflens breder dan de kolomflens",
    invoer: { verbindingstype: 2, kolomprofiel: 14, liggerprofiel: 27, console: 0, a_flens: 7, a_lijf: 4, M_Ed: 40 },
    // b_b = 180 > b_c = 160 mm: de flens ligt niet over de volle breedte op de kolom. De toets van
    // b_eff,b,fc haalt dat niet: min(8 + 2·15 + 7·(13/13,5)·13; 180) = 125,6 ≥ 235/360·180 = 117,5 mm.
    melding: /De liggerflens [(]b = 180 mm[)] is breder dan de kolomflens [(]b = 160 mm[)]/,
  },
  {
    naam: "28 — korte kopplaat: de trekflens alleen aan de binnenzijde gelast",
    invoer: {
      kopplaattype: 1, kolomprofiel: 20, liggerprofiel: 22, console: 0, n_boutrijen: 3, t_kp: 15, b_kp: 150,
      w_kp: 100, e_kp: 40, p_kp: 60, a_flens: 5, a_lijf: 3, M_Ed: 40, V_Ed: 80,
    },
    // De plaat steekt niet boven de flens uit: L_w,f = 120 − 6,2 − 2·15 = 83,8 mm (niet 2·120 − 6,2 − 30
    // = 203,8) → F_w,f,Rd = 5·83,8·360/(√2·0,8·1,25) = 106,7 kN. Bovenaan geen buitenlas: rij 1 op 40 mm
    // ligt vrij van 9,8 + √2·5 + 15 = 31,9 mm.
    handwerk: { F_w_f_Rd: "106.7" },
    geenMelding: /botst/,
  },
  {
    naam: "29 — console onder 45° (h = l = 240): drukpunt in de schuine flens",
    invoer: { h_console: 240, l_console: 240 },
    // Op het plaatvlak is de consoleflens 9,8·√2 = 13,86 mm dik → y_c = 240 + 240 − 6,93 = 473,07 mm
    // (met t_f/2 zou het 475,1 zijn) → h_1 = 503,1 mm. σ_com,Ed = 143,6 → k_wc = 1, F_lim = 214,8 kN
    // en de rijkrachten blijven 124,8 / 86,6 / 3,4 kN (set 1):
    // M_j,Rd = 0,5031·124,8 + 0,4331·86,6 + 0,3731·3,4 = 101,5 kNm (met 475,1 mm: 102,0) → UC 0,591.
    handwerk: { h_1: "503.1", M_j_Rd: "101.5", UC_M: "0.591" },
  },
  {
    naam: "30 — console onder 45°: rij 5 op 446,5 mm raakt de las aan de schuine flens",
    invoer: { h_console: 240, l_console: 240, n_boutrijen: 5, p_kp: 135.5 },
    // Rijen −30, 40, 175,5, 311, 446,5 mm. Botszone van de consoleflens vanaf 480 − 13,86 − √2·5 − 15
    // = 444,1 mm: rij 5 botst (met de flens op t_f zou de zone pas bij 448,1 mm beginnen).
    melding: /Rij 5 [(]y = 446\.5 mm[)] botst/,
  },
  {
    naam: "31 — kopplaat met dikte 0: afgekeurd, geen NaN",
    invoer: { t_kp: 0 },
    melding: /De dikte van de kopplaat moet groter zijn dan 0/,
  },
  {
    naam: "32 — console met negatieve hoogte: afgekeurd",
    invoer: { h_console: -50 },
    melding: /De hoogte en de lengte van de console moeten groter zijn dan 0/,
  },
  {
    naam: "33 — geen overspanning L_b: geen classificatie naar stijfheid",
    invoer: { L_b: 0 },
    klasse: "niet bepaald",
  },
];

let fouten = 0;
for (const set of SETS) {
  const v = { ...BASIS, ...set.invoer };
  const selectValues = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, selectValues, { CC: 2, K_FI: 1 });
  const tab = uitTabel(tpl, selectValues);
  const u = uitwerking(v);
  fouten += toets(`${set.naam} — narekening`, got, verwachtingen(u, v), {}, tab);
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk, {}, tab);

  // Rijen die botsen: het blad noemt dezelfde rijen als de narekening
  if (v.verbindingstype === 1) {
    const blad = u.bots.map((_, j) => got.text.includes(`Rij ${j + 1} (y = `) && new RegExp(`Rij ${j + 1} [(]y = [^)]*[)] botst`).test(got.text));
    const ok = blad.every((b, j) => b === u.bots[j]);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} botsing    blad ${blad.map(Number).join("")}   narekening ${u.bots.map(Number).join("")}`);
  }

  // Geen NaN in het blad
  const nan = /NaN/.test(got.text);
  if (nan) fouten++;
  console.log(`  ${nan ? "FOUT  " : "OK    "} geen NaN in het blad`);

  // Oordeel zoals de rapportkop het leest
  const voldoet = oordeel(got.text);
  const wil = u.geldig && u.UCmax <= 1 && u.nbOk !== false;
  const okO = voldoet === wil;
  if (!okO) fouten++;
  console.log(`  ${okO ? "OK    " : "FOUT  "} oordeel    blad ${voldoet ? "voldoet" : "voldoet niet"}   narekening ${wil ? "voldoet" : "voldoet niet"}${u.geldig ? "" : ` (${u.reden})`}`);

  if (set.klasse) {
    const zin = set.klasse === "niet bepaald" ? /Classificatie naar stijfheid niet bepaald/ : new RegExp(`Classificatie naar stijfheid: ${set.klasse}`);
    const gezien = zin.test(got.text) && u.klasse === set.klasse;
    if (!gezien) fouten++;
    console.log(`  ${gezien ? "OK    " : "FOUT  "} klasse     ${set.klasse} (narekening ${u.klasse})`);
  }
  if (set.driehoek) {
    const ok = u.x === 0 && u.F.slice(1).every((f, j) => f <= (u.F[0] * u.hr[j + 1]) / u.hr[0] + 1e-6)
      && Math.abs(tab.Fd_2 - (u.F[0] * u.hr[1]) / u.hr[0] / 1e3) < 0.05;
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} driehoek   rij 2 ≤ F_t1·h_2/h_1 = ${u.F ? ((u.F[0] * u.hr[1]) / u.hr[0] / 1e3).toFixed(2) : "—"} kN, blad ${tab.Fd_2}`);
  }
  if (set.geenMelding) {
    const gezien = set.geenMelding.test(got.text);
    if (gezien) fouten++;
    console.log(`  ${gezien ? "FOUT  " : "OK    "} geen melding ${set.geenMelding.source}`);
  }
  if (set.melding) {
    const gezien = set.melding.test(got.text);
    if (!gezien) fouten++;
    console.log(`  ${gezien ? "OK    " : "FOUT  "} melding    ${set.melding.source}`);
  }
}

// ── Het beeld: beginwaarden geldig en voldoen ────────────────────────────────
{
  console.log("\nBeginwaarden van het beeld");
  const nodig = ["u_kp", "p_fl", "N_c_Ed", "n_boutrijen", "t_kp", "e_kp", "p_kp", "w_kp", "M_Ed", "V_Ed", "L_b"];
  const mist = nodig.filter((k) => !(k in DEFAULTS));
  const u = uitwerking(BASIS);
  const ok = mist.length === 0 && u.geldig && u.UCmax <= 1;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${Object.keys(DEFAULTS).length} beginwaarden${mist.length ? `, ontbrekend: ${mist.join(", ")}` : ""}; ${u.geldig ? `UC ${u.UCmax.toFixed(3)}` : `ongeldig (${u.reden})`}`);
}

afronden(fouten, "Momentverbinding");
