/**
 * Controlescript voor de module Schoorverbinding (NEN-EN 1993-1-8 en
 * NEN-EN 1993-1-1 met NB): een hoekstaal met één rij bouten op een
 * schetsplaat die met twee randen aan de knoop is gelast.
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten daarom op drie manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript van elke toets: trek in het
 *      hoekstaal (6.6) en (3.11) tot (3.13) met tabel 3.8, blokschuif in het
 *      been (3.10), de bouten volgens tabel 3.4 met §3.6.1(10), §3.8 en de
 *      boutgroep van §3.7(1), de schetsplaat op trek over de spreiding onder
 *      30°, bij bout 1 begrensd door alle plaatranden ((6.6) en (6.7)),
 *      blokschuif in de plaat ((3.9) of (3.10)), knik
 *      van de plaat bij druk (§6.3.1, kromme c), de hoeklassen (4.3), (4.4),
 *      (4.9) en de schuif in de plaat langs de las (6.18), met de afstanden
 *      van tabel 3.3 (ook de kortste afstand tot een schuine vrije rand) en
 *      de eis dat het eind van het hoekstaal niet voorbij een gelaste rand
 *      steekt, dat het gat binnen het vlakke deel van het been ligt en dat
 *      de sluitring vrij blijft van de afronding r_1 van het hoekstaal.
 *   2. Voor enkele sets de getallen van een handberekening, met de
 *      tussenstappen in het commentaar. Set 1 is het voorbeeld dat ook de
 *      startwaarden van het beeld zijn.
 *   3. Het oordeel in de slotzin, ook bij de grensgevallen (UC precies rond
 *      1,0, een randafstand precies op 1,2·d_0) en bij een invoer die niet te
 *      toetsen is: gewist, negatief, een boutrij buiten de plaat, een te
 *      kleine las of druk met één bout. Zo'n blad mag nooit "voldoet" geven.
 *
 * De hoekstaalgegevens staan hieronder los overgenomen uit EN 10056-1; het
 * script vergelijkt ze met profielen.ts. De geplakte matrix in het blad
 * bewaakt scripts/check-profielen.mjs.
 *
 * Draaien:  node scripts/check-schoor.mjs
 * Vereist een gebouwde core (npm --prefix packages/core run build) en een Node
 * die TypeScript rechtstreeks laadt (22.18 of nieuwer).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const hier = dirname(fileURLToPath(import.meta.url));
const tpl = laadTemplate("schoorverbinding.ts");

// Een L 50×50×5 S235 met twee bouten M16 – 8.8, alleen trek. Gelijk aan de
// startwaarden van SchoorDesigner.tsx; dat controleert het script onderaan.
const STANDAARD = {
  hoekprofiel: 3, uitvoering: 1, staalsoort: 235, boutkwaliteit: 88, boutmaat: 16,
  krachtsoort: 1, stuikgrens: 1,
  n_bouten: 2, t_schets: 8, hoek: 35, e_1: 25, p_1: 55, e_2: 22, l_0: 50,
  b_schets: 170, h_schets: 120, a_las: 5, F_Ed: 40,
};
const PROJECT = { CC: 2, K_FI: 1, rekenwijze: 1 };

/** Gelijkzijdig hoekstaal volgens EN 10056-1: id → beenlengte h, dikte t (mm), A (mm²). */
const HOEK = {
  1: { h: 40, t: 4, r1: 6, A: 308 }, 2: { h: 45, t: 5, r1: 7, A: 430 }, 3: { h: 50, t: 5, r1: 7, A: 480 },
  4: { h: 60, t: 6, r1: 8, A: 691 }, 5: { h: 70, t: 7, r1: 9, A: 940 }, 6: { h: 80, t: 8, r1: 10, A: 1230 },
  7: { h: 90, t: 9, r1: 11, A: 1550 }, 8: { h: 100, t: 10, r1: 12, A: 1920 },
};
/** Buitendiameter van de sluitring, ISO 7089. */
const RING = { 12: 24, 16: 30, 20: 37, 24: 44 };
/** f_u (tabel 3.1, A1:2014), f_ub (EN 1993-1-8 tabel 3.1), gat (EN 1090-2), A_s (ISO 898-1), β_w (tabel 4.1). */
const FU = { 235: 360, 275: 430, 355: 490 };
const FUB = { 46: 400, 56: 500, 88: 800, 109: 1000 };
const GAT = { 12: 13, 16: 18, 20: 22, 24: 26 };
const AS = { 12: 84.3, 16: 157, 20: 245, 24: 353 };
const BW = { 235: 0.8, 275: 0.85, 355: 0.9 };

// ── Onafhankelijke uitwerking; eenheden N en mm ─────────────────────────────
function uitwerking(invoer) {
  // Een gewist veld leest de rekenkern als 0.
  const v = Object.fromEntries(Object.entries(invoer).map(([k, x]) => [k, x === "" ? 0 : Number(x)]));
  const { h, t, r1, A } = HOEK[v.hoekprofiel];
  const fy = v.staalsoort, fu = FU[fy], fub = FUB[v.boutkwaliteit];
  const av = v.boutkwaliteit === 109 ? 0.5 : 0.6;
  const d = v.boutmaat, d0 = GAT[d], As = AS[d];
  const nL = v.uitvoering === 2 ? 2 : 1;
  const n = Math.max(1, Math.round(v.n_bouten));
  const tp = v.t_schets, F = v.F_Ed * 1000;
  const th = (v.hoek * Math.PI) / 180, c = Math.cos(th), s = Math.sin(th);
  const gM2 = 1.25;

  // Hoekstaal op trek: (6.6), (3.11) tot (3.13).
  const Npl = nL * A * fy;
  const Anet = A - d0 * t;
  const rel = Math.min(Math.max((v.p_1 / d0 - 2.5) / 2.5, 0), 1);
  let beta = null, Nu;
  if (n === 1) Nu = (nL * 2 * (v.e_2 - d0 / 2) * t * fu) / gM2;
  else {
    beta = n === 2 ? 0.4 + 0.3 * rel : 0.5 + 0.2 * rel;
    Nu = (nL * beta * Anet * fu) / gM2;
  }
  const UCt = F / Math.min(Npl, Nu);

  // Blokschuif in het been (3.10): trek naar de vrije rand, afschuiving langs de boutrij.
  const Ant = (v.e_2 - d0 / 2) * t;
  const Anv = (v.e_1 + (n - 1) * v.p_1 - (n - 0.5) * d0) * t;
  const Veff2 = nL * ((0.5 * fu * Ant) / gM2 + (fy * Anv) / Math.sqrt(3));
  const UCbs = F / Veff2;

  // Ligging: bout 1 op l_0 + e_1 van het werkpunt, de buitenste bout n steken verder.
  const s1 = v.l_0 + v.e_1, sn = s1 + (n - 1) * v.p_1;
  const e1p = Math.min(v.b_schets / c, v.h_schets / s) - sn;
  /**
   * Afstand loodrecht op de as tot de vrije rand (boven of rechts), aan beide
   * kanten van de as. Komt de loodlijn eerst bij een gelaste rand (links of
   * onder), dan is er aan die kant geen vrije rand.
   */
  const vrijeRand = (afst) => {
    const x = afst * c, y = afst * s;
    const boven = (v.h_schets - y) / c, links = x / s;
    const rechts = (v.b_schets - x) / s, onder = y / c;
    return [boven < links ? boven : Infinity, rechts < onder ? rechts : Infinity];
  };
  const e2p = Math.min(...vrijeRand(sn));
  const vrij = Number.isFinite(e2p);
  // De vrije randen staan schuin op de as: de kortste afstand van de buitenste bout tot de
  // bovenrand of de rechterrand, loodrecht op die rand. De buitenste bout ligt het dichtst bij beide.
  const erand = Math.min(v.h_schets - sn * s, v.b_schets - sn * c);
  // Het eind van het hoekstaal: de vrije rand van het been (e_2 onder de as) moet boven de
  // onderrand blijven, de hiel (h − e_2 boven de as) rechts van de zijrand.
  const l0min = Math.max(v.e_2 / Math.tan(th), (h - v.e_2) * Math.tan(th));
  const okL = v.l_0 + 0.001 >= l0min;

  // Het gat in het vlakke deel van het been: niet in het uitstaande been.
  const gatOk = v.e_2 + d0 / 2 <= h - t + 0.001;
  // De sluitring naast het uitstaande been: vrij van de afronding r_1.
  const ringOk = h - v.e_2 - RING[d] / 2 + 0.001 >= t + r1;

  // Bouten: tabel 3.4, §3.6.1(10), §3.7(1); §3.8 bij L_j > 15·d.
  const Lj = (n - 1) * v.p_1;
  const bLf = Lj > 15 * d ? Math.max(0.75, Math.min(1, 1 - (Lj - 15 * d) / (200 * d))) : null;
  const Fv = ((bLf ?? 1) * nL * av * fub * As) / gM2;
  const k1L = Math.min((2.8 * v.e_2) / d0 - 1.7, 2.5);
  const k1p = vrij ? Math.min((2.8 * e2p) / d0 - 1.7, 2.5) : 2.5;
  const ab1 = Math.min(v.e_1 / (3 * d0), fub / fu, 1);
  const abi = Math.min(v.p_1 / (3 * d0) - 0.25, fub / fu, 1);
  const abp = Math.min(e1p / (3 * d0), fub / fu, 1);
  const stuik = (k, a, dikte) => (k * a * fu * d * dikte) / gM2;
  const FbL1 = nL * stuik(k1L, ab1, t), FbLi = nL * stuik(k1L, abi, t);
  const Fbpn = stuik(k1p, abp, tp), Fbpi = stuik(k1p, abi, tp);
  // §3.6.1(10) alleen bij een enkele overlap: één hoekstaal, en bij één bout altijd.
  const cap = nL === 2 ? false : n === 1 ? true : v.stuikgrens === 1;
  const Fcap = (1.5 * fu * d * Math.min(t, tp)) / gM2;
  const grens = cap ? Fcap : Infinity;
  let Fb1, Fbn = null, Fbm = null, Fgroep;
  if (n === 1) {
    Fb1 = Math.min(FbL1, Fbpn, grens);
    Fgroep = Math.min(Fv, Fb1);
  } else {
    Fb1 = Math.min(FbL1, Fbpi, grens);   // eindbout in het been, binnenste in de plaat
    Fbn = Math.min(FbLi, Fbpn, grens);   // binnenste in het been, eindbout in de plaat
    if (n >= 3) Fbm = Math.min(FbLi, Fbpi, grens);
    const per = [Fb1, Fbn, ...(Fbm === null ? [] : [Fbm])];
    Fgroep = Fv >= Math.max(...per) ? Fb1 + Fbn + (n - 2) * (Fbm ?? 0) : n * Math.min(Fv, ...per);
  }
  const UCb = F / Fgroep;

  // Schetsplaat op trek over de spreiding onder 30°, bij bout 1 begrensd door
  // alle randen van de plaat: loodrecht op de as naar links-boven tot de
  // bovenrand of de gelaste zijrand, naar rechts-onder tot de rechterrand of
  // de gelaste onderrand, wat het eerst komt.
  let bw = null, beff = null, Np = null, UCp = 0;
  if (n >= 2) {
    bw = 2 * (n - 1) * v.p_1 * Math.tan(Math.PI / 6);
    const x1 = s1 * c, y1 = s1 * s;
    const r1 = Math.min((v.h_schets - y1) / c, x1 / s);
    const r2 = Math.min((v.b_schets - x1) / s, y1 / c);
    beff = Math.min(bw / 2, r1) + Math.min(bw / 2, r2);
    Np = Math.min(beff * tp * fy, (0.9 * (beff - d0) * tp * fu) / gM2);
    UCp = F / Np;
  }
  // Blokschuif in de plaat: twee afschuifvlakken, of één met trek naar de vrije rand (0,5·f_u).
  const Anvp = (e1p + (n - 1) * v.p_1 - (n - 0.5) * d0) * tp;
  const S = (fy * Anvp) / Math.sqrt(3);
  const Antp = vrij ? (e2p - d0 / 2) * tp : null;
  const Veffp = vrij ? S + Math.min(S, (0.5 * fu * Antp) / gM2) : 2 * S;
  const UCbsp = F / Veffp;

  // Knik van de schetsplaat bij druk: strook b_eff, l_k = 0,65·(l_0 + e_1), kromme c.
  let drukOk = true, lam = null, chi = null, Nb = null, UCc = 0;
  if (v.krachtsoort === 2) {
    if (n === 1) drukOk = false;
    else {
      const eps = Math.sqrt(235 / fy);
      lam = (0.65 * s1 * Math.sqrt(12)) / (tp * 93.9 * eps);
      const Phi = 0.5 * (1 + 0.49 * (lam - 0.2) + lam * lam);
      chi = Math.min(1, 1 / (Phi + Math.sqrt(Phi * Phi - lam * lam)));
      Nb = chi * beff * tp * fy;
      UCc = F / Nb;
    }
  }

  // Las: de onderrand draagt F·cos θ, de zijrand F·sin θ, elk met twee hoeklassen.
  const fvwd = fu / (Math.sqrt(3) * BW[fy] * gM2);
  const bLw = Math.min(1, 1.2 - (0.2 * Math.max(v.b_schets, v.h_schets)) / (150 * v.a_las));
  const FwRd = bLw * fvwd * v.a_las;
  const FwEdb = (F * c) / (2 * (v.b_schets - 2 * v.a_las));
  const FwEdh = (F * s) / (2 * (v.h_schets - 2 * v.a_las));
  const UCw = Math.max(FwEdb, FwEdh) / FwRd;
  const UCvp = Math.max((F * c) / v.b_schets, (F * s) / v.h_schets) / ((tp * fy) / Math.sqrt(3));
  const lasOk = v.a_las >= 3 && Math.min(v.b_schets, v.h_schets) - 2 * v.a_las >= Math.max(30, 6 * v.a_las);

  // Tabel 3.3; bij druk ook de grootste steek (t = de dunste buitenste plaat).
  const emin = 1.2 * d0, pmin = 2.2 * d0, pmax = Math.min(14 * (nL === 2 ? t : Math.min(t, tp)), 200);
  const tekort =
    (v.e_1 < emin) + (v.e_2 < emin) + (n >= 2 && v.p_1 < pmin) + (e1p < emin) + (vrij && e2p < emin) +
    (erand < emin) + (v.krachtsoort === 2 && n >= 2 && v.p_1 > pmax);

  const invoerOk =
    [v.e_1, n >= 2 ? v.p_1 : 1, v.e_2, tp, v.b_schets, v.h_schets, v.a_las].every((x) => x > 0) &&
    v.l_0 >= 0 && v.n_bouten >= 1 && v.F_Ed > 0;
  const geoOk = v.hoek > 0 && v.hoek < 90 && e1p > 0 && gatOk;
  const UCmax = Math.max(UCt, UCbs, UCb, UCp, UCbsp, UCc, UCw, UCvp);
  return {
    n, nL, cap, vrij, erand, l0min, okL, gatOk, ringOk, bLf, Npl, Anet, beta, Nu, UCt, Ant, Anv, Veff2, UCbs, e1p, e2p, Fv, k1L, k1p, ab1, abi, abp,
    FbL1, FbLi, Fbpn, Fbpi, Fcap, Fb1, Fbn, Fbm, Fgroep, UCb, bw, beff, Np, UCp, Anvp, Antp, Veffp, UCbsp,
    drukOk, lam, chi, Nb, UCc, fvwd, bLw, FwRd, FwEdb, FwEdh, UCw, UCvp, lasOk, tekort, invoerOk, geoOk, UCmax,
  };
}

const s4 = (x) => {
  if (x === 0) return "0";
  const dec = Math.max(0, 3 - Math.floor(Math.log10(Math.abs(x))));
  return x.toFixed(dec);
};
const ruim = (x) => ({ waarde: s4(x), tol: Math.max(Math.abs(x) * 0.002, 1e-6) });
const kN = (x) => ruim(x / 1000);

/** De zichtbare uitkomsten van het blad die de narekening moet opleveren. */
function verwachtingen(r, v) {
  const uit = {
    N_pl_Rd: kN(r.Npl), N_u_Rd: kN(r.Nu), UC_t: ruim(r.UCt),
    A_nt: ruim(r.Ant), A_nv: ruim(r.Anv), V_eff_2_Rd: kN(r.Veff2), UC_bs: ruim(r.UCbs),
    F_v_Rd: kN(r.Fv), e_1_p: ruim(r.e1p), e_rand: ruim(r.erand), k_1_L: ruim(r.k1L), k_1_p: ruim(r.k1p),
    α_b_1: ruim(r.ab1), α_b_p: ruim(r.abp), F_b_L_1: kN(r.FbL1), F_b_p_n: kN(r.Fbpn),
    F_b_1: kN(r.Fb1), F_Rd_groep: kN(r.Fgroep), UC_b: ruim(r.UCb),
    A_nv_p: ruim(r.Anvp), V_eff_p_Rd: kN(r.Veffp), UC_bs_p: ruim(r.UCbsp),
    f_vw_d: ruim(r.fvwd), F_w_Rd: ruim(r.FwRd), F_w_Ed_b: ruim(r.FwEdb), F_w_Ed_h: ruim(r.FwEdh),
    UC_w: ruim(r.UCw), UC_v_p: ruim(r.UCvp),
  };
  if (r.n >= 2) {
    Object.assign(uit, {
      A_net: ruim(r.Anet), [r.n === 2 ? "β_2" : "β_3"]: ruim(r.beta), α_b_i: ruim(r.abi),
      F_b_L_i: kN(r.FbLi), F_b_p_i: kN(r.Fbpi), F_b_n: kN(r.Fbn), b_w: ruim(r.bw), N_p_Rd: kN(r.Np), UC_p: ruim(r.UCp),
    });
    if (r.Fbm !== null) uit.F_b_m = kN(r.Fbm);
    if (r.beff < r.bw - 1e-9) uit.b_eff = ruim(r.beff);
  }
  if (r.vrij) Object.assign(uit, { e_2_p: ruim(r.e2p), A_nt_p: ruim(r.Antp) });
  if (r.cap) uit.F_b_cap = kN(r.Fcap);
  if (r.Nb !== null) Object.assign(uit, { λ_p: ruim(r.lam), χ_p: ruim(r.chi), N_b_p_Rd: kN(r.Nb), UC_c: ruim(r.UCc) });
  if (r.bLw < 1) uit.β_Lw = ruim(r.bLw);
  if (r.bLf !== null) uit.β_Lf = ruim(r.bLf);
  return uit;
}

const SETS = [
  {
    naam: "1 — standaard: L 50×50×5 S235, twee bouten M16 – 8.8, e_2 = 22, alleen trek (startwaarden van het beeld)",
    invoer: {},
    // Met de hand. A = 480 mm², t = 5, r_1 = 7, d_0 = 18, f_y = 235, f_u = 360, f_ub = 800 N/mm².
    // Sluitring Ø30: 50 − 22 − 15 = 13 ≥ t + r_1 = 12 mm, vrij van de afronding.
    // Trek: N_pl,Rd = 480·235 = 112,8 kN. A_net = 480 − 18·5 = 390 mm²; p_1/d_0 = 3,056 →
    //   β_2 = 0,4 + 0,3·0,556/2,5 = 0,4667; N_u,Rd = 0,4667·390·360/1,25 = 52,42 kN → UC 0,7631.
    // Blokschuif (3.10): A_nt = (22 − 9)·5 = 65, A_nv = (25 + 55 − 1,5·18)·5 = 265 mm²;
    //   V_eff,2,Rd = 0,5·360·65/1,25 + 235·265/√3 = 9,36 + 35,95 = 45,31 kN → UC 0,8827.
    // Bouten: F_v,Rd = 0,6·800·157/1,25 = 60,29 kN. k_1 = 2,8·22/18 − 1,7 = 1,722 (één rij);
    //   α_b = 25/54 = 0,4630 (eindbout), 55/54 − 0,25 = 0,7685 (binnenste);
    //   been: 1,722·0,4630·360·16·5/1,25 = 18,37 kN en 1,722·0,7685·23 040 = 30,49 kN.
    //   Plaat: bout 1 op 50 + 25 = 75, bout 2 op 130 mm van het werkpunt; de as verlaat de plaat
    //   bij min(170/cos 35°; 120/sin 35°) = min(207,53; 209,21) → e_1,p = 207,53 − 130 = 77,53 mm.
    //   Loodrecht op de as vanaf bout 2: bovenrand op (120 − 74,56)/cos 35° = 55,47 mm (de linkerrand
    //   ligt op 185,7 mm); aan de andere kant eerst de gelaste onderrand. Loodrecht op de randen zelf:
    //   e_rand = min(120 − 74,565; 170 − 106,49) = 45,435 mm. l_0,min = max(22/tan 35°; 28·tan 35°) = 31,42 mm. k_1,p = min(6,93; 2,5) = 2,5,
    //   α_b,p = min(77,53/54; 1) = 1 → 2,5·360·16·8/1,25 = 92,16 kN; binnenste: 2,5·0,7685·36 864 = 70,83 kN.
    //   §3.6.1(10): 1,5·360·16·5/1,25 = 34,56 kN. Bout 1: min(18,37; 70,83; 34,56) = 18,37;
    //   bout 2: min(30,49; 92,16; 34,56) = 30,49. F_v,Rd ≥ beide → groep 48,87 kN → UC 0,8186.
    // Plaat: b_w = 2·55·tan 30° = 63,51 mm (vrije randen verder weg); N = min(63,51·8·235 = 119,4;
    //   0,9·45,51·8·360/1,25 = 94,37) = 94,37 kN → UC 0,4239.
    //   Blokschuif: A_nv,p = (77,532 + 55 − 27)·8 = 844,3 mm², A_nt,p = (55,47 − 9)·8 = 371,7 mm²;
    //   235·844,3/√3 = 114,5 kN, 0,5·360·371,7/1,25 = 53,53 kN → 114,5 + 53,53 = 168,1 kN → UC 0,2380.
    // Las: f_vw,d = 360/(√3·0,8·1,25) = 207,8 N/mm², F_w,Rd = 1039 N/mm. Onderrand 40·cos 35°/(2·160)
    //   = 102,4 N/mm, zijrand 40·sin 35°/(2·110) = 104,3 N/mm → UC 0,100.
    //   Schuif in de plaat: 32,77 kN/170 mm = 192,7 N/mm tegen 8·235/√3 = 1085 N/mm → UC 0,1776.
    // Maatgevend de blokschuif in het been: UC 0,8827, voldoet.
    handwerk: {
      N_pl_Rd: "112.8", A_net: "390", β_2: "0.4667", N_u_Rd: "52.42", UC_t: "0.7631",
      A_nt: "65", A_nv: "265", V_eff_2_Rd: "45.31", UC_bs: "0.8827",
      F_v_Rd: "60.29", e_1_p: "77.53", e_2_p: "55.47", e_rand: "45.44", k_1_L: "1.722", k_1_p: "2.5", α_b_1: "0.4630", α_b_i: "0.7685",
      F_b_L_1: "18.37", F_b_L_i: "30.49", F_b_p_n: "92.16", F_b_p_i: "70.83", F_b_cap: "34.56",
      F_b_1: "18.37", F_b_n: "30.49", F_Rd_groep: "48.87", UC_b: "0.8186",
      b_w: "63.51", N_p_Rd: "94.37", UC_p: "0.4239", A_nv_p: "844.3", A_nt_p: "371.7", V_eff_p_Rd: "168.1", UC_bs_p: "0.2380",
      f_vw_d: "207.8", F_w_Rd: "1039", F_w_Ed_b: "102.4", F_w_Ed_h: "104.3", UC_w: "0.100", UC_v_p: "0.1776",
      UC_max: "0.8827",
    },
  },
  {
    naam: "1b — p_1 = 70: de begrenzing van §3.6.1(10) werkt op bout 2",
    invoer: { p_1: 70 },
    // α_b,i = min(70/54 − 0,25; 1) = 1 → been 1,722·23 040 = 39,68 kN, begrensd op 34,56 kN;
    // plaat: e_1,p = 207,53 − 145 = 62,53 → α_b,p = 1, 92,16 kN. Groep 18,37 + 34,56 = 52,93 kN → UC 0,7557.
    // Trek: β_2 = 0,4 + 0,3·(3,889 − 2,5)/2,5 = 0,5667 → 0,5667·390·288 = 63,65 kN → UC 0,6285.
    // Blokschuif: A_nv = (25 + 70 − 27)·5 = 340 mm² → 9,36 + 46,13 = 55,49 kN → UC 0,7208.
    handwerk: {
      α_b_i: "1", F_b_L_i: "39.68", F_b_n: "34.56", F_Rd_groep: "52.93", UC_b: "0.7557",
      β_2: "0.5667", N_u_Rd: "63.65", A_nv: "340", V_eff_2_Rd: "55.49", UC_max: "0.7557",
    },
  },
  {
    naam: "1c — idem zonder de begrenzing van §3.6.1(10) voor twee bouten",
    invoer: { p_1: 70, stuikgrens: 0 },
    // Bout 2: min(39,68; 92,16) = 39,68 kN; groep 18,37 + 39,68 = 58,05 kN → UC 0,6891; maatgevend
    // wordt de blokschuif in het been, 0,7208.
    handwerk: { F_b_n: "39.68", F_Rd_groep: "58.05", UC_b: "0.6891", UC_max: "0.7208" },
  },
  {
    naam: "2a — grensgeval: F_Ed 45,31 kN, net onder V_eff,2,Rd = 45,315 kN",
    invoer: { F_Ed: 45.31 },
    // UC_bs = 45,31/45,3149 = 0,9999: voldoet.
    handwerk: { UC_bs: "0.9999" },
  },
  {
    naam: "2b — grensgeval: F_Ed 45,32 kN, net boven V_eff,2,Rd",
    invoer: { F_Ed: 45.32 },
    // UC_bs = 45,32/45,3149 = 1,0001: voldoet niet.
    handwerk: { UC_bs: "1.000" },
  },
  {
    naam: "3a — grensgeval tabel 3.3: e_2 precies 1,2·d_0 = 21,6 mm",
    invoer: { e_2: 21.6 },
    // Mag nog. k_1 = 2,8·21,6/18 − 1,7 = 1,660; been: 1,660·0,4630·23 040 = 17,71 kN en
    // 1,660·0,7685·23 040 = 29,39 kN (onder 34,56) → groep 47,10 kN → UC 0,8493.
    // A_nt = (21,6 − 9)·5 = 63 mm² → V_eff,2,Rd = 9,072 + 35,95 = 45,03 kN → UC 0,8884.
    handwerk: { k_1_L: "1.660", F_b_L_1: "17.71", F_b_L_i: "29.39", F_Rd_groep: "47.10", UC_b: "0.8493", A_nt: "63", V_eff_2_Rd: "45.03", UC_bs: "0.8884" },
  },
  {
    naam: "3b — grensgeval tabel 3.3: e_2 21,59 mm, net onder 1,2·d_0",
    invoer: { e_2: 21.59 },
  },
  {
    naam: "4 — één bout (3.11), §3.6.1(10) vanzelf, e_1 50",
    invoer: { n_bouten: 1, e_1: 50, F_Ed: 30 },
    // N_u,Rd = 2·(22 − 9)·5·360/1,25 = 37,44 kN → UC 0,8013. Blokschuif: A_nv = (50 − 9)·5 = 205 mm² →
    // 9,36 + 235·205/√3 = 9,36 + 27,81 = 37,17 kN → UC 0,8070.
    // Stuik been: α_b = 50/54 = 0,9259 → 1,722·0,9259·23 040 = 36,74 kN, begrensd op 34,56 kN;
    // plaat: e_1,p = 207,53 − 100 = 107,5 mm → 92,16 kN. Groep = min(60,29; 34,56) = 34,56 kN → UC 0,8681.
    handwerk: {
      N_u_Rd: "37.44", UC_t: "0.8013", A_nv: "205", V_eff_2_Rd: "37.17", UC_bs: "0.8070", α_b_1: "0.9259",
      F_b_L_1: "36.74", F_b_cap: "34.56", e_1_p: "107.5", F_b_1: "34.56", F_Rd_groep: "34.56", UC_b: "0.8681",
    },
  },
  {
    naam: "5 — dubbel L 80×80×8, drie bouten M20 – 4.6: afschuiving maatgevend in de boutgroep (§3.7(1))",
    invoer: {
      hoekprofiel: 6, uitvoering: 2, boutkwaliteit: 46, boutmaat: 20, n_bouten: 3, e_1: 35, p_1: 70, e_2: 35,
      l_0: 60, t_schets: 12, b_schets: 320, h_schets: 260, hoek: 40, F_Ed: 200,
    },
    // Twee afschuifvlakken: F_v,Rd = 2·0,6·400·245/1,25 = 94,08 kN. Geen begrenzing (geen enkele overlap).
    // Been (twee stuks): k_1 = min(4,45; 2,5) = 2,5; α_b = 35/66 = 0,5303 en 70/66 − 0,25 = 0,8106;
    //   2·2,5·0,5303·46 080 = 122,2 kN en 2·2,5·0,8106·46 080 = 186,8 kN.
    // Plaat t 12: e_1,p = min(417,7; 404,5) − 235 = 169,5 → α_b = 1 → 2,5·69 120 = 172,8 kN; binnenste 140,1 kN.
    // Per bout 122,2 / 172,8 / 140,1 kN, alle boven F_v,Rd → groep 3·94,08 = 282,2 kN → UC 0,7086.
    // Trek: β_3 = 0,5 + 0,2·(3,182 − 2,5)/2,5 = 0,5545; A_net = 1230 − 22·8 = 1054 mm² →
    //   N_u,Rd = 2·0,5545·1054·360/1,25 = 336,7 kN.
    // Blokschuif been: A_nt = (35 − 11)·8 = 192, A_nv = (35 + 140 − 55)·8 = 960 mm² →
    //   2·(27,65 + 130,25) = 315,8 kN. Plaat: b_w = 4·70·tan 30° = 161,7 mm, de helft 80,83 mm. Bout 1 op
    //   95 mm (x = 72,77, y = 61,06): naar links-boven eerst de gelaste zijrand op 72,77/sin 40° = 113,2 mm,
    //   naar rechts-onder de gelaste onderrand op 61,06/cos 40° = 79,72 mm → b_eff = 80,83 + 79,72 = 160,5 mm;
    //   min(452,8; 0,9·138,5·12·288 = 430,9) = 430,9 kN → UC 0,4641 (over de hele b_w: 434,4 kN).
    //   Las: zijrand 200·sin 40°/(2·250) = 257,1 N/mm → UC 0,2474.
    handwerk: {
      F_v_Rd: "94.08", F_b_L_1: "122.2", F_b_L_i: "186.8", F_b_p_n: "172.8", F_b_p_i: "140.1",
      F_Rd_groep: "282.2", UC_b: "0.7086", β_3: "0.5545", N_u_Rd: "336.7", V_eff_2_Rd: "315.8",
      b_w: "161.7", b_eff: "160.5", N_p_Rd: "430.9", UC_p: "0.4641", F_w_Ed_h: "257.1", UC_w: "0.2474", UC_max: "0.7086",
    },
  },
  {
    naam: "6 — trek en druk: knik van een schetsplaat van 6 mm met l_0 150",
    invoer: { krachtsoort: 2, l_0: 150, t_schets: 6, b_schets: 350, h_schets: 260 },
    // λ = 0,65·175·√12/(6·93,9) = 0,6994; Φ = 0,5·(1 + 0,49·0,4994 + 0,4892) = 0,8669;
    // χ = 1/(0,8669 + √(0,7516 − 0,4892)) = 0,7251; N_b,Rd = 0,7251·63,51·6·235 = 64,93 kN → UC 0,6161.
    // p_1 = 55 ≤ min(14·5; 200) = 70 mm.
    handwerk: { λ_p: "0.6994", χ_p: "0.7251", N_b_p_Rd: "64.93", UC_c: "0.6161" },
  },
  {
    naam: "7 — trek en druk met p_1 75 > 14·t = 70 mm (tabel 3.3)",
    invoer: { krachtsoort: 2, p_1: 75 },
  },
  {
    naam: "7b — trek en druk met p_1 precies 70 mm",
    invoer: { krachtsoort: 2, p_1: 70 },
  },
  {
    naam: "8 — trek en druk met één bout: knik van de plaat niet te toetsen",
    invoer: { krachtsoort: 2, n_bouten: 1, e_1: 40 },
  },
  { naam: "9 — las a 2,5 < 3 mm (§4.5.2(2))", invoer: { a_las: 2.5 } },
  {
    naam: "10 — las met l_eff < 6·a (§4.5.1(2)): L 40×40×4 met M12, hoek 15°, zijrand 55 mm, a 8",
    // e_2 = 17: sluitring Ø24 op 40 − 17 − 12 = 11 ≥ 4 + 6 = 10 mm. l_0,min = 17/tan 15° = 63,44 ≤ 75 mm.
    // Zijrand: 55 − 16 = 39 < 48 mm. De afstanden passen:
    // buitenste bout op 130 mm, 55 − 33,65 = 21,35 mm onder de bovenrand (≥ 1,2·13 = 15,6).
    invoer: { hoekprofiel: 1, boutmaat: 12, e_1: 20, p_1: 35, e_2: 17, l_0: 75, hoek: 15, h_schets: 55, a_las: 8 },
    handwerk: { e_rand: "21.35" },
  },
  { naam: "11 — schetsplaat 100×80: de buitenste bout valt buiten de plaat", invoer: { b_schets: 100, h_schets: 80 } },
  {
    naam: "12 — vlakke schoor (15°), vier bouten: de spreiding bij bout 1 raakt de bovenrand en de gelaste onderrand",
    invoer: { hoek: 15, n_bouten: 4, l_0: 100, b_schets: 330, h_schets: 105, t_schets: 10 },
    // Bout 1 op 125 mm: y = 32,35 → bovenrand op (105 − 32,35)/cos 15° = 75,21 mm, de halve
    // spreiding is 3·55·tan 30° = 95,26 mm. Onder komt eerst de gelaste onderrand, op 32,35/cos 15° =
    // 33,49 mm → b_eff = 75,21 + 33,49 = 108,7 mm (tot de gelaste rand begrensd, veilige kant; alleen
    // tot de vrije randen zou het 170,5 mm zijn).
    // Buitenste bout op 290 mm: e_2,p = (105 − 75,06)/cos 15° = 31,00 mm; e_1,p = 341,6 − 290 = 51,64 mm.
    // e_rand = min(105 − 75,06; 330 − 280,12) = 29,94 mm. l_0,min = 22/tan 15° = 82,10 ≤ 100 mm.
    handwerk: { b_w: "190.5", b_eff: "108.7", e_2_p: "31.00", e_1_p: "51.64", e_rand: "29.94" },
  },
  {
    naam: "13 — L 100×100×10 S355, vier bouten M24 – 10.9, zonder begrenzing",
    invoer: {
      hoekprofiel: 8, staalsoort: 355, boutkwaliteit: 109, boutmaat: 24, n_bouten: 4, e_1: 40, p_1: 70, e_2: 45,
      l_0: 80, t_schets: 12, b_schets: 420, h_schets: 320, hoek: 45, a_las: 6, F_Ed: 250, stuikgrens: 0,
    },
  },
  {
    naam: "14 — S275, drie bouten M12 – 5.6 met begrenzing, trek en druk",
    invoer: {
      hoekprofiel: 1, staalsoort: 275, boutkwaliteit: 56, boutmaat: 12, n_bouten: 3, e_1: 20, p_1: 35, e_2: 17,
      l_0: 40, t_schets: 6, b_schets: 200, h_schets: 160, hoek: 45, a_las: 4, F_Ed: 25, krachtsoort: 2,
    },
  },
  // Het eind van het hoekstaal tegen de gelaste randen: l_0,min = max(e_2/tan θ; (h − e_2)·tan θ).
  {
    naam: "16a — grensgeval l_0 31 mm < l_0,min = 22/tan 35° = 31,42 mm: de vrije rand van het been zakt door de onderrand",
    invoer: { l_0: 31 },
  },
  { naam: "16b — grensgeval l_0 32 mm ≥ l_0,min: past", invoer: { l_0: 32 } },
  {
    naam: "16c — hoek 80°, plaat 100×260: de hiel steekt door de gelaste zijrand (l_0,min = 28·tan 80° = 158,8 mm)",
    invoer: { hoek: 80, b_schets: 100, h_schets: 260 },
  },
  { naam: "16d — l_0 gewist: het hoekstaal begint in het werkpunt en steekt door de onderrand", invoer: { l_0: "" }, alleenOordeel: true },
  {
    naam: "17 — plaat 170×92,6: e_1,p en e_2,p halen 1,2·d_0, maar de buitenste bout ligt 18,04 mm onder de bovenrand",
    invoer: { h_schets: 92.6 },
    // y_n = 130·sin 35° = 74,565 → e_2,p = (92,6 − 74,565)/cos 35° = 22,02 mm (≥ 21,6), e_1,p = 92,6/sin 35° − 130
    // = 31,44 mm; loodrecht op de bovenrand 92,6 − 74,565 = 18,04 mm < 21,6 mm: tabel 3.3.
    handwerk: { e_2_p: "22.02", e_1_p: "31.44", e_rand: "18.04" },
  },
  {
    naam: "18 — lange verbinding (§3.8): L 60×60×6, zes bouten M12 – 4.6, p_1 50, afschuiving maatgevend",
    invoer: {
      hoekprofiel: 4, boutkwaliteit: 46, boutmaat: 12, n_bouten: 6, e_1: 25, p_1: 50, e_2: 25, l_0: 40,
      b_schets: 450, h_schets: 320, F_Ed: 60, stuikgrens: 0,
    },
    // L_j = 5·50 = 250 > 15·12 = 180 mm → β_Lf = 1 − 70/2400 = 0,9708.
    // F_v,Rd = 0,9708·0,6·400·84,3/1,25 = 15,71 kN (zonder reductie 16,19 kN).
    // Been: k_1 = min(3,685; 2,5) = 2,5; α_b = 25/39 = 0,6410 → 2,5·0,6410·25 920/1,25 = 33,23 kN;
    // binnenste α_b = min(0,0282 + 1; 1) = 1 → 51,84 kN. Plaat: α_b = 1 → 69,12 kN.
    // F_v,Rd < de stuik → groep 6·15,71 = 94,28 kN → UC 0,6364 (zonder §3.8: 97,11 kN, UC 0,6179).
    // Trek: β_3 = 0,5 + 0,2·(3,846 − 2,5)/2,5 = 0,6077; A_net = 691 − 78 = 613 mm² → 107,28 kN → UC 0,5593.
    // Plaat: b_w = 2·5·50·tan 30° = 288,7 mm, maar bout 1 (65 mm, x = 53,24, y = 37,28) ligt 53,24/sin 35°
    // = 92,83 mm van de gelaste zijrand en 37,28/cos 35° = 45,51 mm van de gelaste onderrand →
    // b_eff = 138,3 mm; min(138,3·8·235 = 260,0; 0,9·125,3·8·288 = 259,9) = 259,9 kN → UC 0,2308.
    handwerk: {
      β_Lf: "0.9708", F_v_Rd: "15.71", F_b_L_1: "33.23", F_b_L_i: "51.84", F_b_p_n: "69.12",
      F_Rd_groep: "94.28", UC_b: "0.6364", β_3: "0.6077", N_u_Rd: "107.3", UC_t: "0.5593", UC_max: "0.6364",
      b_w: "288.7", b_eff: "138.3", N_p_Rd: "259.9", UC_p: "0.2308",
    },
  },
  // Het gat moet binnen het vlakke deel van het been liggen: e_2 + d_0/2 ≤ h − t. L 50×50×5 met M20:
  // h − t = 45 mm, d_0/2 = 11 mm → e_2 ≤ 34 mm.
  {
    naam: "19a — grensgeval: L 50×50×5 met M20, e_2 34 mm: het gat raakt het uitstaande been net niet, maar de sluitring (Ø37) ligt op de afronding",
    invoer: { boutmaat: 20, e_1: 30, p_1: 60, e_2: 34, l_0: 60 },
    // A_net = 480 − 22·5 = 370 mm²; β_2 = 0,4 + 0,3·(2,727 − 2,5)/2,5 = 0,4273 → N_u,Rd = 45,53 kN → UC 0,8785.
    handwerk: { A_net: "370", β_2: "0.4273", N_u_Rd: "45.53", UC_t: "0.8785", UC_max: "0.8785" },
  },
  { naam: "19b — L 50×50×5 met M20, e_2 34,5 mm: het gat snijdt het uitstaande been", invoer: { boutmaat: 20, e_1: 30, p_1: 60, e_2: 34.5, l_0: 60 } },
  { naam: "19c — L 40×40×4 met M24, e_2 32 mm: het gat steekt buiten de hiel", invoer: { hoekprofiel: 1, boutmaat: 24, e_1: 35, p_1: 70, e_2: 32, l_0: 60, b_schets: 300, h_schets: 250, F_Ed: 20 } },
  // De sluitring naast het uitstaande been, vrij van de afronding: h − e_2 − d_s/2 ≥ t + r_1. L 50×50×5
  // met M16 (Ø30): 50 − e_2 − 15 ≥ 12 → e_2 ≤ 23 mm; tabel 3.3 vraagt e_2 ≥ 21,6 mm.
  {
    naam: "19d — grensgeval sluitring: L 50×50×5 met M16, e_2 23 mm: 50 − 23 − 15 = 12 mm = t + r_1",
    invoer: { e_2: 23 },
    tekst: /Sluitring Ø30 mm: h − e 2 − d s \/2 = 12 mm ≥ t \+ r 1 = 12 mm → vrij van de afronding/,
  },
  {
    naam: "19e — grensgeval sluitring: e_2 23,1 mm, de sluitring ligt op de afronding",
    invoer: { e_2: 23.1 },
    tekst: /De sluitring \(Ø30 mm\) ligt op de afronding van het hoekstaal/,
  },
  {
    naam: "20 — aantal bouten 2,4: het blad rekent met 2 en zegt dat",
    invoer: { n_bouten: 2.4 },
    tekst: /Het aantal bouten is geen geheel getal: gerekend met n = 2\./,
  },
  // Gewiste velden ('') leest de kern als 0; een negatieve kracht is geen grootte. Het oordeel
  // moet dan "niet te bepalen … voldoet niet" zijn, nooit "voldoet".
  { naam: "15a — e_2 gewist", invoer: { e_2: "" }, alleenOordeel: true },
  { naam: "15b — F_Ed gewist", invoer: { F_Ed: "" }, alleenOordeel: true },
  { naam: "15c — aantal bouten gewist", invoer: { n_bouten: "" }, alleenOordeel: true },
  { naam: "15d — F_Ed negatief", invoer: { F_Ed: -40 }, alleenOordeel: true },
];

let fouten = 0;
for (const set of SETS) {
  const v = { ...STANDAARD, ...set.invoer };
  const selectValues = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, selectValues, PROJECT);
  const r = uitwerking(v);
  const slot = got.text.slice(got.text.lastIndexOf("Maatgevende UC"));
  const ucSlot = slot.match(/Maatgevende UC = ([\d.]+)/);
  const afgeleid = ucSlot ? { UC_max: parseFloat(ucSlot[1]) } : {};

  if (!set.alleenOordeel) {
    fouten += toets(`${set.naam} — narekening`, got, { ...verwachtingen(r, v), UC_max: ruim(r.UCmax) }, {}, afgeleid);
  } else console.log(`\n${set.naam}`);
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk, {}, afgeleid);
  if (set.tekst) {
    const gezien = set.tekst.test(got.text);
    if (!gezien) fouten++;
    console.log(`  ${gezien ? "OK    " : "FOUT  "} tekst      ${set.tekst.source}`);
  }

  // Het oordeel in de slotzin, en wat de rapportkop daaruit leest (bladResultaat.leesResultaat).
  let ok;
  const gemeld = (re, wat) => {
    ok = re.test(slot) && /de verbinding voldoet niet/.test(slot);
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    ${wat}, gemeld als voldoet niet`);
  };
  if (!r.invoerOk) gemeld(/niet te bepalen/, "invoer ontbreekt");
  else if (!r.geoOk) gemeld(/valt buiten de schetsplaat/, "boutrij buiten de plaat of gat buiten het been");
  else if (!r.okL) gemeld(/steekt voorbij een gelaste rand/, "hoekstaal steekt voorbij een gelaste rand");
  else if (!r.ringOk) gemeld(/sluitring ligt op de afronding van het hoekstaal/, "sluitring op de afronding van het hoekstaal");
  else if (r.tekort) gemeld(/buiten tabel 3\.3/, `${r.tekort} afstand(en) buiten tabel 3.3`);
  else if (!r.lasOk) gemeld(/de las voldoet niet aan §4\.5\.1\(2\) of §4\.5\.2\(2\)/, "las te klein of te kort");
  else if (!r.drukOk) gemeld(/op druk niet getoetst/, "druk met één bout");
  else {
    const voldoet = /de verbinding voldoet(?! niet)/.test(slot);
    ok = voldoet === r.UCmax <= 1;
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    ons ${voldoet ? "voldoet" : "voldoet niet"}   narekening ${r.UCmax <= 1 ? "voldoet" : "voldoet niet"}`);
  }
  if (!ok) fouten++;
  const zin = slot.slice(0, 240);
  const kop = !/voldoe[nt] niet/.test(zin) && /voldoe[nt]/.test(zin);
  const kopOk = kop === (r.invoerOk && r.geoOk && r.okL && r.ringOk && !r.tekort && r.lasOk && r.drukOk && r.UCmax <= 1);
  if (!kopOk) fouten++;
  console.log(`  ${kopOk ? "OK    " : "FOUT  "} rapportkop leest ${kop ? "voldoet" : "voldoet niet"}`);
}

// ── Het beeld: startwaarden en profieltabel ─────────────────────────────────
{
  console.log("\nHet beeld en de profieltabel");
  const bron = readFileSync(join(hier, "../packages/desktop/src/components/calc/SchoorDesigner.tsx"), "utf8");
  const blok = bron.match(/const DEFAULTS[^=]*=\s*\{([\s\S]*?)\n\};/)?.[1] ?? "";
  const beeld = Object.fromEntries([...blok.matchAll(/(\w+):\s*(-?[\d.]+)/g)].map((m) => [m[1], Number(m[2])]));
  const verschil = [...new Set([...Object.keys(beeld), ...Object.keys(STANDAARD)])].filter((k) => beeld[k] !== STANDAARD[k]);
  if (verschil.length) fouten++;
  console.log(`  ${verschil.length ? "FOUT  " : "OK    "} startwaarden van het beeld gelijk aan set 1${verschil.length ? `; verschil in ${verschil.join(", ")}` : ""}`);

  const P = await import(pathToFileURL(join(hier, "../packages/desktop/src/components/calc/profielen.ts")).href);
  const mis = Object.entries(HOEK).filter(([id, p]) => {
    const q = P.HOEKSTALEN[id];
    return !q || q.h !== p.h || q.t !== p.t || q.r1 !== p.r1 || Math.abs(q.A - p.A) > 1e-9;
  });
  if (mis.length) fouten++;
  console.log(`  ${mis.length ? "FOUT  " : "OK    "} h, t, r_1 en A van ${Object.keys(HOEK).length} hoekstalen gelijk aan profielen.ts${mis.length ? `; verschil bij id ${mis.map(([id]) => id).join(", ")}` : ""}`);
}

afronden(fouten, "Schoorverbinding");
