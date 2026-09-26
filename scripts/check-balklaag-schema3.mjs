/**
 * Controlescript voor de belastinggevallen en combinaties van de Balklaag.
 *
 * check-balklaag.mjs toetst het blad tegen de referentiebladen; die kennen
 * alleen de enkelvoudige ligger. Dit script toetst wat daar buiten valt:
 *
 *   1  de ligger op drie steunpunten (schema 3) met de veranderlijke last per
 *      veld (schaakbordbelasting), met de hand nagerekend op gelijke velden;
 *   2  ongelijke velden, een overstek en een enkelvoudige ligger tegen een
 *      onafhankelijke numerieke balkberekening in dit script
 *      (verplaatsingsmethode met een fijne verdeling); ook het overstek krijgt
 *      zijn veranderlijke last apart;
 *   3  de combinaties: M_y,Ed en V_z,Ed als maximum over de UGT-combinaties,
 *      elk met 6.10a én 6.10b, de omhullende tegen de volle belasting, de
 *      zakking als grootste waarde langs de lijn van elk veld (en het uiteinde
 *      van een overstek), en de quasi-blijvende combinatie (6.16b) als
 *      optelling van de belastinggevallen;
 *   4  schema 4 tegen de uitkomsten van het blad vóór de belastinggevallen —
 *      die mogen niet veranderen; bij schema 2 alleen wat niet van de
 *      lastverdeling afhangt;
 *   5  vrije afmetingen ("Zelf invullen"), de onderslag met belaste breedte en
 *      de trillingstoets (langste veld, niet bij een onderslag);
 *   6  een rendercontrole per schema: geen foutmelding, geen NaN en geen
 *      onuitgerekende expressie in een tekening.
 *
 * Draaien:  node scripts/check-balklaag-schema3.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { parse, evaluate, render } from "../packages/core/dist/index.js";
import { laadTemplate, afronden } from "./lib/refcheck.mjs";

const ast = parse(laadTemplate("balklaag.ts"));

/** Projectgegevens: CC2 (γ_G 1,2 en γ_Q 1,5) en de referentiestand. */
const PROJECT = { CC: 2, K_FI: 1, rekenwijze: 1 };
const γG = 1.2;
const γQ = 1.5;

/**
 * Het basisgeval van check-balklaag.mjs: 71×221 C24, klimaatklasse 1
 * (k_def 0,60), categorie B (ψ_2 0,3), trilling uit.
 */
const BASIS = {
  profiel: "12", sterkteklasse: "2", klimaat: "1", duurklasse: "2", schema: "1", ligger: "1",
  L_d: "5000", a_opl: "50", hoh: "600", t_vloer: "18", E_beschot: "7000", b_vloer: "5",
  a_over: "0", L_veld2: "0", b_sparing: "0", l_staart: "0", b_ond: "0", b_zelf: "0", h_zelf: "0",
  G_k: "1.0", Q_k: "1.75", F_k: "2", belastingcat: "2",
  "ψ_0_zelf": "0", "ψ_2_zelf": "0", controleer: "1", grensfactor: "0.004",
  controleer_trilling: "0", "ζ": "0.01", a_tril: "1", b_tril: "120",
};
const K_DEF = 0.6;
const Ψ2 = 0.3;
/** Buigstijfheid van 71×221 C24 in kNm². */
const EI_71x221 = 11000e3 * (0.071 * 0.221 ** 3) / 12;

// ── Het blad doorrekenen ──────────────────────────────────────────────────

const getal = (s) => parseFloat(String(s).replace(",", "."));

/**
 * Rekent het blad door en geeft drie dingen terug: alle zichtbare waarden (de
 * laatste telt), de waarden per belastinggeval — alles wat onder een kop
 * `<h6>BGk — …` staat, tot de volgende kop — en de ingevulde formules.
 */
function reken(invoer, project = PROJECT) {
  const nodes = evaluate(ast, { ...BASIS, ...invoer }, project);
  const alle = {};
  const perGeval = {};
  const ingevuld = {};
  let geval = null;
  const loop = (lijst) => {
    for (const n of lijst) {
      if (n.type === "heading") geval = null;
      if (n.type === "text" && /<h6>/.test(n.text)) {
        const m = /<h6>\s*BG(\d)\b/.exec(n.text);
        geval = m ? Number(m[1]) : null;
        if (geval) perGeval[geval] = {};
      }
      if (n.type === "assignment" || n.type === "var-display") {
        const w = getal(n.result);
        if (Number.isFinite(w)) {
          alle[n.name] = w;
          if (geval) perGeval[geval][n.name] = w;
        }
        if (n.type === "assignment") ingevuld[n.name] = n.substitution;
      }
      if (Array.isArray(n.children)) loop(n.children);
    }
  };
  loop(nodes);
  return { alle, perGeval, ingevuld, nodes };
}

/** De getallen uit een ingevulde formule, in volgorde. */
const getallenUit = (tekst) => (String(tekst ?? "").match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/g) ?? []).map(Number);

// ── Vergelijken ───────────────────────────────────────────────────────────

let fouten = 0;
const toon = (v) => (v === undefined || !Number.isFinite(v) ? String(v ?? "—") : String(Number(v.toPrecision(5))));

/**
 * Het blad drukt vier significante cijfers af; daarom een relatieve marge,
 * met een kleine absolute ondergrens voor waarden die nul horen te zijn.
 */
function gelijk(label, ons, doel, { rel = 2e-3, abs = 2e-3 } = {}) {
  const ok = Number.isFinite(ons) && Math.abs(ons - doel) <= rel * Math.abs(doel) + abs;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${label.padEnd(34)} blad ${toon(ons).padStart(10)}   verwacht ${toon(doel)}`);
}

function waar(label, ok, toelichting = "") {
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${label}${toelichting ? `   (${toelichting})` : ""}`);
}

// ── Een onafhankelijke numerieke balkberekening ───────────────────────────

/**
 * Verplaatsingsmethode met Euler-Bernoulli-balkelementen: honderd elementen
 * per veld, consistente knooplasten voor de verdeelde last, puntlasten in een
 * knoop. Uit de verplaatsingen volgen de oplegreacties (K·d − F); moment en
 * dwarskracht daarna uit het evenwicht van het deel links van x. Zo is de
 * uitkomst onafhankelijk van de vormfuncties in het blad.
 *
 * Lengtes in m, lasten in kN/m en kN, EI in kNm². Zakking in mm, omlaag
 * positief; moment positief bij trek aan de onderzijde.
 */
function balkNumeriek({ schema, L1, L2 = 0, a = 0, EI, w1 = 0, w2 = 0, P1 = 0, P2 = 0 }) {
  const deel2 = schema === 3 ? L2 : schema === 2 ? a : 0;
  const n = 100;
  const xs = [];
  for (let i = 0; i <= n; i++) xs.push((L1 * i) / n);
  if (deel2 > 0) for (let i = 1; i <= n; i++) xs.push(L1 + (deel2 * i) / n);
  const N = xs.length;
  const nd = 2 * N;
  const K = Array.from({ length: nd }, () => new Float64Array(nd));
  const F = new Float64Array(nd);
  for (let e = 0; e < N - 1; e++) {
    const l = xs[e + 1] - xs[e];
    const w = xs[e] < L1 - 1e-12 ? w1 : w2;
    const ke = [
      [12, 6 * l, -12, 6 * l],
      [6 * l, 4 * l * l, -6 * l, 2 * l * l],
      [-12, -6 * l, 12, -6 * l],
      [6 * l, 2 * l * l, -6 * l, 4 * l * l],
    ];
    const fe = [(w * l) / 2, (w * l * l) / 12, (w * l) / 2, (-w * l * l) / 12];
    const dofs = [2 * e, 2 * e + 1, 2 * e + 2, 2 * e + 3];
    for (let r = 0; r < 4; r++) {
      F[dofs[r]] += fe[r];
      for (let c = 0; c < 4; c++) K[dofs[r]][dofs[c]] += (EI / l ** 3) * ke[r][c];
    }
  }
  // Puntlast midden veld 1; op het tweede deel midden veld 2 of het uiteinde van het overstek.
  const xP1 = L1 / 2;
  const xP2 = schema === 3 ? L1 + L2 / 2 : L1 + a;
  const knoop = (x) => xs.findIndex((xi) => Math.abs(xi - x) < 1e-9);
  if (P1) F[2 * knoop(xP1)] += P1;
  if (P2) F[2 * knoop(xP2)] += P2;
  const steunen = schema === 3 ? [0, L1, L1 + L2] : [0, L1];
  const vast = new Set(steunen.map((x) => 2 * knoop(x)));
  const vrij = [...Array(nd).keys()].filter((i) => !vast.has(i));
  // Gauss-eliminatie op het gereduceerde stelsel.
  const m = vrij.length;
  const A = vrij.map((i) => [...vrij.map((j) => K[i][j]), F[i]]);
  for (let c = 0; c < m; c++) {
    let p = c;
    for (let r = c + 1; r < m; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = c + 1; r < m; r++) {
      const f = A[r][c] / A[c][c];
      if (f === 0) continue;
      for (let k = c; k <= m; k++) A[r][k] -= f * A[c][k];
    }
  }
  const dv = new Float64Array(m);
  for (let r = m - 1; r >= 0; r--) {
    let s = A[r][m];
    for (let k = r + 1; k < m; k++) s -= A[r][k] * dv[k];
    dv[r] = s / A[r][r];
  }
  const d = new Float64Array(nd);
  vrij.forEach((i, k) => { d[i] = dv[k]; });
  // Reactie omhoog = F − K·d in de vaste vrijheidsgraad.
  const R = steunen.map((x) => {
    const i = 2 * knoop(x);
    let s = 0;
    for (let j = 0; j < nd; j++) s += K[i][j] * d[j];
    return F[i] - s;
  });
  const M = (x) => {
    let s = 0;
    steunen.forEach((xs_, k) => { if (xs_ < x) s += R[k] * (x - xs_); });
    const x1 = Math.min(x, L1);
    s -= w1 * x1 * (x - x1 / 2) + (w2 * Math.max(0, x - L1) ** 2) / 2;
    s -= P1 * Math.max(0, x - xP1) + P2 * Math.max(0, x - xP2);
    return s;
  };
  const V = (x) => {
    let s = 0;
    steunen.forEach((xs_, k) => { if (xs_ < x) s += R[k]; });
    s -= w1 * Math.min(x, L1) + w2 * Math.max(0, x - L1);
    s -= (x > xP1 ? P1 : 0) + (x > xP2 ? P2 : 0);
    return s;
  };
  const u = (x) => 1000 * d[2 * knoop(x)];
  // Zakking tussen de knopen: de Hermite-vormfuncties van het element, met de
  // zakking en de hoekverdraaiing van beide knopen.
  const uBij = (x) => {
    let i = 1;
    while (i < N - 1 && xs[i] < x) i++;
    const l = xs[i] - xs[i - 1];
    const t = Math.min(Math.max((x - xs[i - 1]) / l, 0), 1);
    const [w0, r0, w1, r1] = [d[2 * i - 2], d[2 * i - 1], d[2 * i], d[2 * i + 1]];
    return 1000 * ((1 - 3 * t * t + 2 * t ** 3) * w0 + l * (t - 2 * t * t + t ** 3) * r0
      + (3 * t * t - 2 * t ** 3) * w1 + l * (t ** 3 - t * t) * r1);
  };
  const tot = L1 + deel2;
  const grootste = (f, a0, b0) => {
    let best = -Infinity;
    for (let i = 0; i <= 4000; i++) best = Math.max(best, f(a0 + ((b0 - a0) * i) / 4000));
    return best;
  };
  const eps = 1e-7;
  const vPunten = [eps, L1 / 2 - eps, L1 / 2 + eps, L1 - eps, L1 + eps, xP2 - eps, xP2 + eps, tot - eps];
  return {
    M, V, u, uBij, R,
    veld1: Math.max(0, grootste(M, 0, L1)),
    steun: schema === 2 || schema === 3 ? -M(L1) : 0,
    veld2: schema === 3 ? Math.max(0, grootste(M, L1, tot)) : 0,
    vmax: Math.max(...vPunten.filter((x) => x > 0 && x < tot).map((x) => Math.abs(V(x)))),
    uMid1: u(L1 / 2),
    uMid2: schema === 3 ? u(L1 + L2 / 2) : 0,
    uEind: schema === 2 ? u(tot) : 0,
  };
}

/**
 * De lastsets van de vijf belastinggevallen, zoals het blad ze definieert. Een
 * overstek is voor de schaakbordbelasting een tweede deel, net als veld 2: de
 * veranderlijke last en de puntlast staan er apart op (BG3 en BG5).
 */
function gevallen({ schema }, { g, q, F }) {
  const twee = schema === 2 || schema === 3;
  return {
    1: { w1: g, w2: twee ? g : 0 },
    2: { w1: q },
    3: { w2: twee ? q : 0 },
    4: { P1: F },
    5: { P2: twee ? F : 0 },
  };
}

// ── 1. Gelijke velden, met de hand nagerekend ─────────────────────────────

console.log("\n1. Twee gelijke velden L = 4,00 m — handberekening");
{
  const r = reken({ schema: "3", L_d: "3950", L_veld2: "4000" });
  const { P_g_k: g, q_q_k: q, F_Q_k: F } = r.alle;
  const L = 4.0;
  const bg = r.perGeval;
  waar("vijf belastinggevallen in beeld", [1, 2, 3, 4, 5].every((k) => bg[k]), Object.keys(bg).join(", "));
  const hand = { rel: 1.5e-3, abs: 1e-4 };
  gelijk("BG2 steunmoment q·L²/16", bg[2]?.M_steun, (q * L * L) / 16, hand);
  gelijk("BG2 veldmoment veld 1 49/512·q·L²", bg[2]?.M_veld1, (49 / 512) * q * L * L, hand);
  gelijk("BG3 steunmoment q·L²/16", bg[3]?.M_steun, (q * L * L) / 16, hand);
  gelijk("BG3 veldmoment veld 2 49/512·q·L²", bg[3]?.M_veld2, (49 / 512) * q * L * L, hand);
  gelijk("BG1 steunmoment g·L²/8", bg[1]?.M_steun, (g * L * L) / 8, hand);
  gelijk("BG1 veldmoment veld 1 9/128·g·L²", bg[1]?.M_veld1, (9 / 128) * g * L * L, hand);
  gelijk("BG1 veldmoment veld 2 9/128·g·L²", bg[1]?.M_veld2, (9 / 128) * g * L * L, hand);
  gelijk("BG4 steunmoment 3·F·L1²/(16·(L1+L2))", bg[4]?.M_steun, (3 * F * L * L) / (16 * 2 * L), hand);
  gelijk("BG5 steunmoment 3·F·L2²/(16·(L1+L2))", bg[5]?.M_steun, (3 * F * L * L) / (16 * 2 * L), hand);
  // Volle belasting als combinatie: γ_G·BG1 + γ_Q·(BG2 + BG3) geeft qL²/8 op de steun.
  const qEd = γG * g + γQ * q;
  const [, mSteun] = getallenUit(r.ingevuld.M_y_Ed);
  gelijk("UGT steun (volle belasting) q_Ed·L²/8", mSteun, (qEd * L * L) / 8, hand);
}

// ── 2. Tegen de numerieke balk ────────────────────────────────────────────

/** Vergelijkt de kenmerkende waarden van elk getoond belastinggeval met de numerieke balk. */
function perGevalTegenNumeriek(titel, invoer, geo) {
  console.log(`\n2. ${titel}`);
  const r = reken(invoer);
  const lasten = { g: r.alle.P_g_k, q: r.alle.q_q_k, F: r.alle.F_Q_k };
  const sets = gevallen(geo, lasten);
  const verwacht = geo.schema === 2 || geo.schema === 3 ? [1, 2, 3, 4, 5] : [1, 2, 4];
  waar("getoonde belastinggevallen", JSON.stringify(Object.keys(r.perGeval).map(Number)) === JSON.stringify(verwacht),
    `verwacht ${verwacht.join(", ")}`);
  for (const k of verwacht) {
    const num = balkNumeriek({ ...geo, EI: EI_71x221, ...sets[k] });
    const bg = r.perGeval[k] ?? {};
    gelijk(`BG${k} M_veld1`, bg.M_veld1, num.veld1);
    if (geo.schema === 2 || geo.schema === 3) gelijk(`BG${k} M_steun`, bg.M_steun, num.steun);
    if (geo.schema === 3) gelijk(`BG${k} M_veld2`, bg.M_veld2, num.veld2);
    gelijk(`BG${k} V_max`, bg.V_max, num.vmax);
    gelijk(`BG${k} u_veld1`, bg.u_veld1, num.uMid1, { rel: 2e-3, abs: 5e-3 });
    if (geo.schema === 3) gelijk(`BG${k} u_veld2`, bg.u_veld2, num.uMid2, { rel: 2e-3, abs: 5e-3 });
    if (geo.schema === 2) gelijk(`BG${k} u_eind`, bg.u_eind, num.uEind, { rel: 2e-3, abs: 5e-3 });
  }
  return { r, lasten, sets };
}

const CONFIGS = [
  { titel: "Twee velden 3,16 + 2,61 m (balklaag in een lopend project)", invoer: { schema: "3", L_d: "3110", L_veld2: "2610" }, geo: { schema: 3, L1: 3.16, L2: 2.61 } },
  { titel: "Twee velden 4,60 + 4,40 m", invoer: { schema: "3", L_d: "4550", L_veld2: "4400" }, geo: { schema: 3, L1: 4.6, L2: 4.4 } },
  { titel: "Twee velden 2,00 + 5,00 m (kort veld komt omhoog)", invoer: { schema: "3", L_d: "1950", L_veld2: "5000" }, geo: { schema: 3, L1: 2.0, L2: 5.0 } },
  { titel: "Twee velden 3,00 + 4,00 m, zware permanente last (zakking kort veld)", invoer: { schema: "3", L_d: "2950", L_veld2: "4000", G_k: "3.0", Q_k: "1.0" }, geo: { schema: 3, L1: 3.0, L2: 4.0 } },
  { titel: "Overstek 4,00 + 1,20 m (puntlast op het uiteinde)", invoer: { schema: "2", L_d: "3950", a_over: "1200" }, geo: { schema: 2, L1: 4.0, a: 1.2 } },
  { titel: "Overstek 4,05 + 1,20 m (veld zonder last op het overstek)", invoer: { schema: "2", L_d: "4000", a_over: "1200" }, geo: { schema: 2, L1: 4.05, a: 1.2 } },
  { titel: "Overstek 4,00 + 0,60 m (puntlast in het veld)", invoer: { schema: "2", L_d: "3950", a_over: "600" }, geo: { schema: 2, L1: 4.0, a: 0.6 } },
  { titel: "Enkelvoudige ligger 5,05 m", invoer: { schema: "1" }, geo: { schema: 1, L1: 5.05 } },
];

const uitkomsten = CONFIGS.map((c) => ({ ...c, ...perGevalTegenNumeriek(c.titel, c.invoer, c.geo) }));

// ── 3. Combinaties ────────────────────────────────────────────────────────

/** Een lastset vermenigvuldigd en opgeteld: Σ f_k · BG_k. */
function combineer(sets, factoren) {
  const uit = { w1: 0, w2: 0, P1: 0, P2: 0 };
  for (const [k, f] of Object.entries(factoren)) {
    for (const s of ["w1", "w2", "P1", "P2"]) uit[s] += f * (sets[k][s] ?? 0);
  }
  return uit;
}

/** 6.10a met γ_G = 1,35 (CC2) en ψ_0·γ_Q; 6.10b met γ_G = 1,2 en γ_Q. */
const γGa = 1.35;
const formules = (ψ0) => [[γGa, γQ * ψ0], [γG, γQ]];

/** De grootste waarde van f op [x0, x1] en de plaats ervan, fijn bemonsterd. */
function grootsteOp(f, x0, x1, n = 2000) {
  let w = -Infinity;
  let x = x0;
  for (let i = 0; i <= n; i++) {
    const xi = x0 + ((x1 - x0) * i) / n;
    const v = f(xi);
    if (v > w) { w = v; x = xi; }
  }
  return { w, x };
}

/**
 * M_Ed en V_Ed per UGT-rij uit de numerieke balk, elk de ongunstigste van
 * 6.10a en 6.10b. Rij 4 en 5 (puntlast) tellen de maxima van BG1 en de
 * puntlast op, zoals het blad.
 */
function ugtVerwacht(geo, sets, F, ψ0) {
  const num = (set) => balkNumeriek({ ...geo, EI: EI_71x221, ...set });
  const bg = Object.fromEntries([1, 2, 3, 4, 5].map((k) => [k, num(sets[k])]));
  const rijen = { 1: [2], 2: [2, 3], 3: [3] };
  const perRij = (rij) => formules(ψ0).map(([fG, fQ]) => {
    const f = { 1: fG };
    for (const k of rijen[rij]) f[k] = fQ;
    return num(combineer(sets, f));
  });
  const [r1, r2, r3] = [1, 2, 3].map(perRij);
  const mG = Math.max(bg[1].veld1, bg[1].steun, bg[1].veld2);
  const beide = (f) => Math.max(...formules(ψ0).map(([fG, fQ]) => f(fG, fQ)));
  const M = [
    Math.max(...r1.map((c) => c.veld1)),
    Math.max(...r2.map((c) => c.steun)),
    Math.max(...r3.map((c) => (geo.schema === 3 ? c.veld2 : c.steun))),
    beide((fG, fQ) => fG * mG + fQ * Math.max(bg[4].veld1, bg[4].steun)),
    beide((fG, fQ) => fG * mG + fQ * Math.max(bg[5].veld2, bg[5].steun)),
  ];
  const V = [
    Math.max(...r1.map((c) => c.vmax)),
    Math.max(...r2.map((c) => c.vmax)),
    Math.max(...r3.map((c) => c.vmax)),
    beide((fG, fQ) => fG * bg[1].vmax + fQ * F),
    beide((fG, fQ) => fG * bg[1].vmax + fQ * F),
  ];
  // Volle belasting op beide delen met 6.10b: zo rekende het blad vroeger.
  return { M, V, bg, vol: r2[1] };
}

/**
 * De zakking die het blad hoort te geven, uit de numerieke balk: per veld de
 * grootste eindstand w_fin langs de lijn (BG1 met het veranderlijke geval op
 * dat veld; in de norm-stand de puntlast als die de grootste eindstand geeft),
 * bij een overstek daarnaast het uiteinde.
 */
function zakkingVerwacht(geo, bg, { kdef, ψ2, normStand }) {
  const cG = 1 + kdef;
  const cQ = 1 + ψ2 * kdef;
  const fin = (v) => (x) => cG * bg[1].uBij(x) + cQ * bg[v].uBij(x);
  const tot = geo.L1 + (geo.a ?? 0) + (geo.L2 ?? 0);
  const kies = (q, F) => (normStand && F.w > q.w ? F : q);
  const veld1 = kies({ ...grootsteOp(fin(2), 0, geo.L1), v: 2 }, { ...grootsteOp(fin(4), 0, geo.L1), v: 4 });
  let deel2 = null;
  if (geo.schema === 3) {
    deel2 = kies({ ...grootsteOp(fin(3), geo.L1, tot), v: 3 }, { ...grootsteOp(fin(5), geo.L1, tot), v: 5 });
  } else if (geo.schema === 2) {
    deel2 = kies({ w: fin(3)(tot), x: tot, v: 3 }, { w: fin(5)(tot), x: tot, v: 5 });
  }
  const inst = (d) => d && bg[1].uBij(d.x) + bg[d.v].uBij(d.x);
  return { veld1, deel2, inst1: inst(veld1), inst2: inst(deel2) };
}

const Z = { rel: 2e-3, abs: 5e-3 };

for (const { titel, geo, r, lasten, sets } of uitkomsten.filter((u) => u.geo.schema === 2 || u.geo.schema === 3)) {
  console.log(`\n3. Combinaties — ${titel}`);
  const { M: verwachtM, V: verwachtV, bg, vol } = ugtVerwacht(geo, sets, lasten.F, 0.5);
  const onsM = getallenUit(r.ingevuld.M_y_Ed);
  const onsV = getallenUit(r.ingevuld.V_z_Ed);
  const deel = geo.schema === 3 ? "veld 2" : "overstek";
  const namen = ["veld 1", "steun", deel, "puntlast veld 1", `puntlast ${geo.schema === 3 ? "veld 2" : "uiteinde"}`];
  namen.forEach((n, i) => gelijk(`M_Ed ${n}`, onsM[i], verwachtM[i]));
  namen.forEach((n, i) => gelijk(`V_Ed ${n}`, onsV[i], verwachtV[i]));
  gelijk("M_y,Ed = maximum", r.alle.M_y_Ed, Math.max(...verwachtM));
  gelijk("V_z,Ed = maximum", r.alle.V_z_Ed, Math.max(...verwachtV));
  // De omhullende tegen de volle belasting op beide delen (het oude blad).
  waar("veldmoment veld 1 ≥ volle belasting", onsM[0] >= vol.veld1 * (1 - 1e-3), `${toon(onsM[0])} tegen ${toon(vol.veld1)}`);
  if (geo.schema === 3) waar("veldmoment veld 2 ≥ volle belasting", onsM[2] >= vol.veld2 * (1 - 1e-3), `${toon(onsM[2])} tegen ${toon(vol.veld2)}`);
  waar("V_z,Ed ≥ volle belasting", r.alle.V_z_Ed >= vol.vmax * (1 - 1e-3), `${toon(r.alle.V_z_Ed)} tegen ${toon(vol.vmax)}`);

  // Zakking: de grootste eindstand langs de lijn van elk veld, en het uiteinde.
  const a = r.alle;
  const z = zakkingVerwacht(geo, bg, { kdef: K_DEF, ψ2: Ψ2, normStand: false });
  gelijk("w_fin   veld 1, grootste langs de lijn", a.w_fin, z.veld1.w, Z);
  gelijk("x_w1    plaats daarvan", a.x_w1, z.veld1.x, { rel: 0, abs: geo.L1 / 100 });
  gelijk("u_g,k   BG1 in x_w1", a.u_g_k, bg[1].uBij(a.x_w1), Z);
  gelijk("u_q,k   BG2 in x_w1", a.u_q_k, bg[2].uBij(a.x_w1), Z);
  gelijk("w_inst  veld 1", a.w_inst, z.inst1, Z);
  if (geo.schema === 3) {
    gelijk("w_fin,2 veld 2, grootste langs de lijn", a.w_fin_2, z.deel2.w, Z);
    gelijk("x_w2    plaats daarvan", a.x_w2, z.deel2.x, { rel: 0, abs: geo.L2 / 100 });
    gelijk("u_q,k,2 BG3 in x_w2", a.u_q_k_2, bg[3].uBij(a.x_w2), Z);
    gelijk("w_lim,2 = 0,004·L2", a.w_lim_2, 0.004 * geo.L2 * 1000);
    // Volle belasting: de veranderlijke last op beide velden tegelijk.
    const bgVol = balkNumeriek({ ...geo, EI: EI_71x221, ...combineer(sets, { 2: 1, 3: 1 }) });
    const volFin = (x0, x1) => grootsteOp((x) => (1 + K_DEF) * bg[1].uBij(x) + (1 + Ψ2 * K_DEF) * bgVol.uBij(x), x0, x1).w;
    waar("w_fin veld 1 ≥ volle belasting", a.w_fin >= volFin(0, geo.L1) * (1 - 1e-3), `${toon(a.w_fin)} tegen ${toon(volFin(0, geo.L1))}`);
    waar("w_fin veld 2 ≥ volle belasting", a.w_fin_2 >= volFin(geo.L1, geo.L1 + geo.L2) * (1 - 1e-3),
      `${toon(a.w_fin_2)} tegen ${toon(volFin(geo.L1, geo.L1 + geo.L2))}`);
  } else {
    gelijk("w_fin,2 uiteinde overstek (BG1 + BG3)", a.w_fin_2, z.deel2.w, Z);
    gelijk("u_q,k,2 BG3 op het uiteinde", a.u_q_k_2, bg[3].uEind, Z);
    gelijk("w_lim,2 = 0,004·2·a", a.w_lim_2, 0.004 * 2 * geo.a * 1000);
  }
  gelijk("UC_doorbuiging = max per deel", a.UC_doorbuiging, Math.max(a.w_fin / a.w_lim, a.w_fin_2 / a.w_lim_2));

  // 6.16b uitgeschreven: de regels zijn de optelling van de belastinggevallen.
  gelijk("q_qp = 1,0·P_g,k + ψ_2·q_q,k", a.q_qp, a.P_g_k + a["ψ_2"] * a.q_q_k, { rel: 1.5e-3, abs: 1e-4 });
  gelijk("w_qp = 1,0·u_g,k + ψ_2·u_var", a.w_qp, a.u_g_k + a["ψ_2"] * a.u_var, { rel: 1.5e-3, abs: 1e-3 });
  gelijk("w_qp,2 = 1,0·u_g,k,2 + ψ_2·u_var,2", a.w_qp_2, a.u_g_k_2 + a["ψ_2"] * a.u_var_2, { rel: 1.5e-3, abs: 1e-3 });
  gelijk("w_kruip = k_def·w_qp", a.w_kruip, a.k_def * a.w_qp, { rel: 1.5e-3, abs: 1e-3 });
  gelijk("w_fin = w_inst + w_kruip", a.w_fin, a.w_inst + a.w_kruip, { rel: 1.5e-3, abs: 1e-3 });
  gelijk("w_fin,2 = w_inst,2 + w_kruip,2", a.w_fin_2, a.w_inst_2 + a.w_kruip_2, { rel: 1.5e-3, abs: 1e-3 });
}

// Norm-stand: de maatgevende van verdeelde last en puntlast telt mee in u_var.
const NORMSTAND = [
  { titel: "twee velden 3,16 + 2,61 m, F 3 kN", invoer: { schema: "3", L_d: "3110", L_veld2: "2610", F_k: "3", Q_k: "1.0" }, geo: { schema: 3, L1: 3.16, L2: 2.61 } },
  { titel: "overstek 3,05 + 1,20 m, F 3 kN (puntlast op het uiteinde maatgevend)", invoer: { schema: "2", L_d: "3000", a_over: "1200", F_k: "3" }, geo: { schema: 2, L1: 3.05, a: 1.2 } },
];
for (const { titel, invoer, geo } of NORMSTAND) {
  console.log(`\n3. Norm-stand — ${titel}`);
  const r = reken(invoer, { ...PROJECT, rekenwijze: 0 });
  const a = r.alle;
  const sets = gevallen(geo, { g: a.P_g_k, q: a.q_q_k, F: a.F_Q_k });
  const bg = Object.fromEntries([1, 2, 3, 4, 5].map((k) => [k, balkNumeriek({ ...geo, EI: EI_71x221, ...sets[k] })]));
  const z = zakkingVerwacht(geo, bg, { kdef: K_DEF, ψ2: Ψ2, normStand: true });
  waar("de puntlast is maatgevend", z.veld1.v === 4 || z.deel2.v === 5, `veld 1: BG${z.veld1.v}, deel 2: BG${z.deel2.v}`);
  gelijk("u_var = max(u_q,k; u_Q,k)", a.u_var, Math.max(a.u_q_k, a.u_Q_k), { rel: 1.5e-3, abs: 1e-3 });
  gelijk("u_var,2 = max(u_q,k,2; u_Q,k,2)", a.u_var_2, Math.max(a.u_q_k_2, a.u_Q_k_2), { rel: 1.5e-3, abs: 1e-3 });
  gelijk("w_fin   veld 1", a.w_fin, z.veld1.w, Z);
  waar("x_w1 ligt in veld 1", a.x_w1 >= 0 && a.x_w1 <= geo.L1, `x_w1 = ${toon(a.x_w1)} m`);
  gelijk("x_w1    plaats van de grootste eindstand", a.x_w1, z.veld1.x, { rel: 0, abs: geo.L1 / 100 });
  gelijk(`w_fin,2 ${geo.schema === 3 ? "veld 2" : "uiteinde"}`, a.w_fin_2, z.deel2.w, Z);
  gelijk("w_qp = 1,0·u_g,k + ψ_2·u_var", a.w_qp, a.u_g_k + a["ψ_2"] * a.u_var, { rel: 1.5e-3, abs: 1e-3 });
}

// 6.10a naast 6.10b: bij ψ_0 = 1,0 (categorie E) en bij een zware permanente last wint 6.10a.
{
  console.log("\n3. 6.10a — categorie E (ψ_0 = 1,0), twee velden 3,16 + 2,61 m");
  const geo = { schema: 3, L1: 3.16, L2: 2.61 };
  const r = reken({ schema: "3", L_d: "3110", L_veld2: "2610", belastingcat: "5" });
  const sets = gevallen(geo, { g: r.alle.P_g_k, q: r.alle.q_q_k, F: r.alle.F_Q_k });
  const { M, V } = ugtVerwacht(geo, sets, r.alle.F_Q_k, 1.0);
  gelijk("γ_G,a = 1,35 (CC2)", r.alle.γ_G_a, 1.35, { rel: 0, abs: 1e-9 });
  gelijk("M_y,Ed = maximum over 6.10a en 6.10b", r.alle.M_y_Ed, Math.max(...M));
  gelijk("V_z,Ed = maximum over 6.10a en 6.10b", r.alle.V_z_Ed, Math.max(...V));
  const [, mSteun] = getallenUit(r.ingevuld.M_y_Ed);
  const g = r.alle.P_g_k;
  const q = r.alle.q_q_k;
  const mb = (w) => (w * (geo.L1 ** 3 + geo.L2 ** 3)) / (8 * (geo.L1 + geo.L2));
  gelijk("UGT steun = 6.10a: 1,35·M_B(g) + 1,5·M_B(q)", mSteun, 1.35 * mb(g) + 1.5 * mb(q));
}
{
  console.log("\n3. 6.10a — onderslag met een zware permanente last (G_k 6,0, Q_k 0,5)");
  const r = reken({ ligger: "2", b_ond: "1.0", G_k: "6.0", Q_k: "0.5", belastingcat: "1" });
  const a = r.alle;
  const L = 5.05;
  const ψ0 = 0.4;
  const Mg = (a.P_g_k * L * L) / 8;
  const Mq = (a.q_q_k * L * L) / 8;
  const MF = (a.F_Q_k * L) / 4;
  waar("6.10a is hier maatgevend", 1.35 * Mg + 1.5 * ψ0 * Mq > 1.2 * Mg + 1.5 * Mq);
  gelijk("M_y,Ed = 1,35·M_g + 1,5·ψ_0·M_q", a.M_y_Ed,
    Math.max(1.35 * Mg + 1.5 * ψ0 * Mq, 1.2 * Mg + 1.5 * Mq, 1.35 * Mg + 1.5 * ψ0 * MF, 1.2 * Mg + 1.5 * MF));
  const Vg = (a.P_g_k * L) / 2;
  const Vq = (a.q_q_k * L) / 2;
  gelijk("V_z,Ed = maximum", a.V_z_Ed,
    Math.max(1.35 * Vg + 1.5 * ψ0 * Vq, 1.2 * Vg + 1.5 * Vq, 1.35 * Vg + 1.5 * ψ0 * a.F_Q_k, 1.2 * Vg + 1.5 * a.F_Q_k));
}

// ── 4. Schema 4 verandert niet, schema 2 alleen door de lastverdeling ─────

/**
 * Uitkomsten van het blad vóór de belastinggevallen (commit cf60233), op vier
 * significante cijfers. De raveelbalk is een ligger met één veld: daar is niets
 * te verdelen, en elke afwijking is een fout.
 *
 * Bij het overstek zette het oude blad de veranderlijke last tegelijk op het
 * veld en op het overstek. Die last op het overstek ontlast het veld, zodat
 * het veldmoment en de doorbuiging te gunstig uitkwamen (bij 4,05 + 1,20 m
 * M_y,Ed 9,6 % te laag). Nu staat hij per deel apart; wat daarvan afhangt
 * toetsen §2 en §3 tegen de numerieke balk. Hier alleen wat er niet van
 * afhangt: de lasten per balk, de grens van het veld, en bij het lange overstek
 * met F = 3 kN het moment uit de puntlast op het uiteinde (F·a).
 */
const OUD = {
  "overstek 4,05 + 0,80 m": {
    invoer: { schema: "2", L_d: "4000", a_over: "800" },
    waarden: { P_g_k: 0.6863, q_q_k: 1.05, F_Q_k: 1.564, k_r: 0.782, w_lim: 16.2 },
  },
  "overstek 3,05 + 1,50 m, F 3 kN": {
    invoer: { schema: "2", L_d: "3000", a_over: "1500", F_k: "3" },
    waarden: { P_g_k: 0.6863, q_q_k: 1.05, F_Q_k: 2.346, k_r: 0.782, w_lim: 12.2, M_y_Ed: 6.205, "σ_m_y_d": 10.74, UC_buiging: 0.7269 },
  },
  "overstek 4,05 + 1,20 m, norm-stand": {
    invoer: { schema: "2", L_d: "4000", a_over: "1200" }, rekenwijze: 0,
    waarden: { P_g_k: 0.6647, q_q_k: 1.05, F_Q_k: 1.564, k_r: 0.782, w_lim: 16.2 },
  },
  "raveelbalk 2,45 m, staart 1,80 m": {
    invoer: { schema: "4", b_sparing: "2400", l_staart: "1800" },
    waarden: { P_g_k: 0.9863, q_q_k: 1.575, F_Q_k: 2, k_r: 1, u_g_k: 0.6587, u_q_k: 1.052, u_Q_k: 0.8722, w_inst: 1.71, w_qp: 0.9742, w_fin: 2.295, w_lim: 9.8, M_y_Ed: 2.726, V_z_Ed: 4.45, "σ_m_y_d": 4.716, "τ_d": 0.4254, UC_buiging: 0.3193, UC_afsch: 0.1728, UC_doorbuiging: 0.2342, UC_max: 0.3193 },
  },
  "raveelbalk 3,05 m, staart 2,50 m, norm-stand": {
    invoer: { schema: "4", b_sparing: "3000", l_staart: "2500" }, rekenwijze: 0,
    waarden: { P_g_k: 1.315, q_q_k: 2.188, F_Q_k: 2, k_r: 1, u_g_k: 2.109, u_q_k: 3.509, u_Q_k: 1.683, w_inst: 5.617, w_qp: 3.161, w_fin: 7.514, w_lim: 12.2, M_y_Ed: 5.65, V_z_Ed: 7.41, "σ_m_y_d": 9.776, "τ_d": 0.7083, UC_buiging: 0.6619, UC_afsch: 0.2878, UC_doorbuiging: 0.6159, UC_max: 0.6619 },
  },
};

for (const [naam, { invoer, rekenwijze = 1, waarden }] of Object.entries(OUD)) {
  console.log(`\n4. Ongewijzigd — ${naam}`);
  const r = reken(invoer, { ...PROJECT, rekenwijze });
  // Beide kanten op vier cijfers afgerond: één eenheid in het vierde cijfer mag.
  for (const [k, v] of Object.entries(waarden)) gelijk(k, r.alle[k], v, { rel: 1.01e-3, abs: 1e-9 });
}

// ── 5. Vrije afmetingen en onderslag ──────────────────────────────────────

console.log("\n5. Profiel \"Zelf invullen\" 71×221 = profiel 71×221 uit de lijst");
{
  const lijst = reken({}).alle;
  const zelf = reken({ profiel: "28", b_zelf: "71", h_zelf: "221" }).alle;
  for (const k of ["b_balk", "h_balk", "k_h", "g_balk", "u_g_k", "w_fin", "σ_m_y_d", "τ_d", "UC_max"]) {
    gelijk(k, zelf[k], lijst[k], { rel: 1e-9, abs: 1e-9 });
  }
  const r = reken({ profiel: "28", b_zelf: "63", h_zelf: "211" }).alle;
  gelijk("b_balk 63 mm", r.b_balk, 63, { rel: 0, abs: 1e-9 });
  gelijk("h_balk 211 mm", r.h_balk, 211, { rel: 0, abs: 1e-9 });
  gelijk("I_y = b·h³/12", r.I_y, (63 * 211 ** 3) / 12, { rel: 1e-3, abs: 0 });
}

console.log("\n5. Onderslag met een belaste breedte van 2,50 m");
{
  const r = reken({ ligger: "2", b_ond: "2.5" }).alle;
  gelijk("b_belast = b_ond", r.b_belast, 2500, { rel: 0, abs: 1e-9 });
  gelijk("k_r = 1", r.k_r, 1, { rel: 0, abs: 1e-9 });
  gelijk("F_Q,k = F_k", r.F_Q_k, 2, { rel: 0, abs: 1e-9 });
  gelijk("P_g,k = 2,5·G_k + g_balk", r.P_g_k, 2.5 * 1.0 + r.g_balk, { rel: 1.5e-3, abs: 1e-4 });
  gelijk("q_q,k = 2,5·Q_k", r.q_q_k, 2.5 * 1.75, { rel: 1e-3, abs: 1e-4 });
  const rav = reken({ ligger: "2", b_ond: "2.5", schema: "4", b_sparing: "2400", l_staart: "1800" }).alle;
  gelijk("raveelbalk: b_belast = l_staart/2", rav.b_belast, 900, { rel: 0, abs: 1e-9 });
}

console.log("\n5. Onderslag bij een raveelbalk: de belaste breedte blijft l_staart/2");
{
  const invoer = { ...BASIS, ligger: "2", b_ond: "2.9", schema: "4", b_sparing: "2400", l_staart: "1800" };
  const html = render(evaluate(ast, invoer, PROJECT));
  waar("§6 noemt geen belaste breedte b_ond", !/b<sub>ond<\/sub>|belaste breedte 2\.9/.test(html));
  const bij = render(evaluate(ast, { ...invoer, schema: "1" }, PROJECT));
  waar("bij schema 1 wel, met eenheid", /b<sub>ond<\/sub> = [^<]*2\.9[^<]*m per strekkende meter/.test(bij.replace(/<[^>]*span[^>]*>/g, "")));
}

console.log("\n5. Trillingstoets bij twee velden: het langste veld telt, met de doorlopendheid");
{
  const tril = { controleer_trilling: "1", schema: "3" };
  const a = reken({ ...tril, L_d: "2950", L_veld2: "4500" }).alle;
  const b = reken({ ...tril, L_d: "4450", L_veld2: "3000" }).alle;
  const enkel = reken({ controleer_trilling: "1", schema: "1", L_d: "4450" }).alle;
  for (const k of ["f_1", "w_per_kN", "UC_tril_a", "UC_tril_v", "UC_trilling"]) {
    gelijk(`${k} gelijk in spiegelbeeld`, a[k], b[k], { rel: 1e-3, abs: 1e-9 });
  }
  // f_1 en de responssnelheid: het langste veld als ligger op twee steunpunten.
  for (const k of ["f_1", "UC_tril_v"]) {
    gelijk(`${k} = enkelvoudige ligger van 4,50 m`, b[k], enkel[k], { rel: 1e-3, abs: 1e-9 });
  }
  // 1 kN midden in het langste veld L, met het steunmoment uit de
  // drie-momentenvergelijking: w = P·L³/(48·EI) − M_B·L²/(16·EI),
  // M_B = 3·P·L²/(16·(L1 + L2)). P is het deel k_r dat op één balk komt.
  const P = b.k_r;
  const L = 4.5;
  const MB = (3 * P * L * L) / (16 * (4.5 + 3.0));
  const w = (1000 * ((P * L ** 3) / 48 - (MB * L * L) / 16)) / EI_71x221;
  gelijk("w/F = P·L³/(48·EI) − M_B·L²/(16·EI)", b.w_per_kN, w, { rel: 1.5e-3, abs: 1e-9 });
  waar("stijver dan de enkelvoudige ligger", b.w_per_kN < enkel.w_per_kN, `${toon(b.w_per_kN)} tegen ${toon(enkel.w_per_kN)} mm/kN`);
  // Twee gelijke velden, met de hand: w = (1/48 − 3/512)·P·L³/EI = 23/1536·P·L³/EI.
  const g = reken({ ...tril, L_d: "3950", L_veld2: "4000" }).alle;
  gelijk("gelijke velden 4,00 m: w/F = 23/1536·P·L³/EI", g.w_per_kN, (1000 * 23 * g.k_r * 4 ** 3) / (1536 * EI_71x221), { rel: 1.5e-3, abs: 1e-9 });
}

console.log("\n5. Trillingstoets bij een onderslag: niet van toepassing, ook als hij aan staat");
{
  const r = reken({ ligger: "2", b_ond: "2.5", controleer_trilling: "1" });
  waar("geen UC_trilling boven nul", !(r.alle.UC_trilling > 0), `UC_trilling = ${toon(r.alle.UC_trilling)}`);
  gelijk("UC_max zonder trilling", r.alle.UC_max, Math.max(r.alle.UC_buiging, r.alle.UC_afsch, r.alle.UC_doorbuiging));
  const html = render(r.nodes);
  waar("het blad zegt waarom", /onderslag niet van toepassing/.test(html));
  const rav = reken({ ligger: "2", schema: "4", b_sparing: "2400", l_staart: "1800", controleer_trilling: "1" });
  waar("bij een raveelbalk blijft de toets", rav.alle.UC_trilling > 0, `UC_trilling = ${toon(rav.alle.UC_trilling)}`);
}

// ── 6. Rendercontrole per schema ──────────────────────────────────────────

/** Dezelfde toetsen als check-renders.mjs, op het gerenderde blad. */
function problemen(html) {
  const uit = [];
  const tekst = html.replace(/<[^>]+>/g, " ");
  for (const s of ["Render error", "Undefined symbol", "Unexpected type", "is not defined", "Invalid argument",
    "Error evaluating condition", "Error defining function", "Error:", "niet gedefinieerd"]) {
    if (tekst.includes(s)) uit.push(`foutmelding "${s}"`);
  }
  const zonder = html.replace(/<svg[\s\S]*?<\/svg>/g, "");
  if (/\bNaN\b/.test(zonder.replace(/<[^>]+>/g, " "))) uit.push("NaN in de uitwerking");
  for (const svg of html.match(/<svg[\s\S]*?<\/svg>/g) || []) {
    for (const m of svg.matchAll(/\s(x|y|x1|y1|x2|y2|cx|cy|r|width|height|points)="([^"]*)"/g)) {
      if (/NaN|Infinity|∞/.test(m[2])) uit.push(`NaN in een tekening: ${m[1]}`);
      else if (!/^\s*(-?[\d.]+(e[-+]?\d+)?(em|ex|px|pt|pc|mm|cm|in|%)?[\s,]*)*$/i.test(m[2])) {
        uit.push(`onuitgerekend: ${m[1]}="${m[2].slice(0, 40)}"`);
      }
    }
  }
  const gelekt = zonder.match(/<p class="calc-text">\s*<(line|rect|polygon|circle|path|text|polyline)\b/g) || [];
  if (gelekt.length) uit.push(`tekening in stukken (${gelekt.length})`);
  return [...new Set(uit)];
}

console.log("\n6. Rendercontrole per schema, soort ligger en rekenwijze");
for (const schema of ["1", "2", "3", "4"]) {
  for (const ligger of ["1", "2"]) {
    for (const rekenwijze of [0, 1]) {
      const invoer = {
        ...BASIS, schema, ligger, b_ond: "2.9", a_over: "900", L_veld2: "2610", b_sparing: "2400", l_staart: "1800",
        controleer_trilling: "1",
      };
      const html = render(evaluate(ast, invoer, { ...PROJECT, rekenwijze }));
      const p = problemen(html);
      waar(`schema ${schema}, ligger ${ligger}, rekenwijze ${rekenwijze}`, p.length === 0, p.slice(0, 3).join("; "));
    }
  }
}

// ── 7. De lijnen van het beeld ────────────────────────────────────────────

/**
 * Het parametrische beeld tekent zijn lijnen met balklaagLijnen.ts, met de
 * lasten en factoren uit het blad. Die statica hoort gelijk te zijn aan die
 * van het blad; hier tegen dezelfde numerieke balk. Node leest TypeScript pas
 * vanaf versie 22.6 zonder hulpmiddel; op een oudere versie slaan we dit over.
 */
let lijnenModule = null;
try {
  lijnenModule = await import("../packages/desktop/src/components/calc/balklaagLijnen.ts");
} catch {
  console.log("\n7. Lijnen van het beeld — overgeslagen: deze Node-versie leest geen TypeScript");
}
if (lijnenModule) {
  const { belastinggevallen, lijnen, steunmoment, ugtCombinaties } = lijnenModule;
  for (const { titel, geo, r, lasten } of uitkomsten) {
    console.log(`\n7. Lijnen van het beeld — ${titel}`);
    const ligger = { schema: geo.schema, L1: geo.L1, a: geo.a ?? 0, L2: geo.L2 ?? 0, EI: EI_71x221 };
    const bg = belastinggevallen(ligger, lasten);
    const tot = geo.L1 + (geo.a ?? 0) + (geo.L2 ?? 0);
    const blad = gevallen(geo, lasten);
    const zelfde = [1, 2, 3, 4, 5].every((k) => ["w1", "w2", "P1", "P2"].every((s) => Math.abs((bg[k][s] ?? 0) - (blad[k][s] ?? 0)) < 1e-12));
    waar("belastinggevallen gelijk aan die van het blad", zelfde);
    let grootste = 0;
    for (const k of [1, 2, 3, 4, 5]) {
      const num = balkNumeriek({ ...geo, EI: EI_71x221, ...bg[k] });
      const l = lijnen(ligger, bg[k]);
      for (let i = 1; i < 40; i++) {
        const x = (tot * i) / 40 + 1e-7;
        grootste = Math.max(grootste, Math.abs(l.M(x) - num.M(x)), Math.abs(l.V(x) - num.V(x)));
      }
      // De zakking van de numerieke balk is bekend in de knopen: midden in elk veld en op het uiteinde.
      const knopen = [geo.L1 / 2, ...(geo.schema === 3 ? [geo.L1 + geo.L2 / 2] : []), ...(geo.schema === 2 ? [tot] : [])];
      for (const x of knopen) grootste = Math.max(grootste, Math.abs(l.u(x) - num.u(x)));
      if (geo.schema === 3 || geo.schema === 2) grootste = Math.max(grootste, Math.abs(steunmoment(ligger, bg[k]) - num.steun));
    }
    waar("M, V en u van BG1 … BG5 gelijk aan de numerieke balk", grootste < 1e-6, `grootste verschil ${grootste.toExponential(2)}`);
    // De grootste waarde van de omhullende in veld 1 is het veldmoment van UGT
    // veld 1 of van de puntlast, over 6.10a en 6.10b.
    const combis = ugtCombinaties(bg, { gG: γG, gQ: γQ, gGa: γGa, gQa: γQ * 0.5 });
    waar("tien combinaties: vijf rijen, elk met 6.10a en 6.10b", combis.length === 10
      && [1, 2, 3, 4, 5].every((rij) => combis.filter((c) => c.rij === rij).length === 2));
    const verdeeld = combis.filter((c) => c.rij <= 3).map((c) => lijnen(ligger, c.set));
    let piek = 0;
    for (let i = 0; i <= 4000; i++) {
      const x = (geo.L1 * i) / 4000;
      piek = Math.max(piek, ...verdeeld.map((c) => c.M(x)));
    }
    const [mVeld1] = getallenUit(r.ingevuld.M_y_Ed);
    gelijk("omhullende veld 1 (verdeelde last) = M_Ed veld 1", piek, mVeld1);
  }
  const zonderA = ugtCombinaties(belastinggevallen({ schema: 1, L1: 5, a: 0, L2: 0, EI: 1 }, { g: 1, q: 1, F: 1 }), { gG: γG, gQ: γQ });
  waar("zonder factoren voor 6.10a (ouder blad): alleen 6.10b", zonderA.length === 5 && zonderA.every((c) => c.formule === "6.10b"));
}

/**
 * Een ingevoegd blad bewaart zijn eigen tekst. Een balklaag uit een oudere
 * versie kent de soort ligger, de vrije maat en een zichtbare k_def niet; het
 * beeld leest af wat het blad wel kent (balklaagBlad.ts).
 */
let bladModule = null;
try {
  bladModule = await import("../packages/desktop/src/components/calc/balklaagBlad.ts");
} catch {
  console.log("\n7. Oudere bladen — overgeslagen: deze Node-versie leest geen TypeScript");
}
if (bladModule) {
  console.log("\n7. Oudere bladen in het beeld");
  const { balklaagKent, kdefUitKlimaat } = bladModule;
  const nu = laadTemplate("balklaag.ts");
  const kent = balklaagKent(nu);
  waar("het huidige blad kent soort ligger en vrije maat", kent.ligger && kent.zelf);
  const oud = nu.replace(/@select ligger[\s\S]*?@end\r?\n/, "").replace(/\s*Zelf invullen = 28\r?\n/, "\n");
  const kentOud = balklaagKent(oud);
  waar("een blad zonder die keuzes kent ze niet", !kentOud.ligger && !kentOud.zelf);
  gelijk("k_def klimaatklasse 1", kdefUitKlimaat(1), 0.6, { rel: 0, abs: 1e-12 });
  gelijk("k_def klimaatklasse 2", kdefUitKlimaat(2), 0.8, { rel: 0, abs: 1e-12 });
  gelijk("k_def klimaatklasse 3", kdefUitKlimaat(3), 2.0, { rel: 0, abs: 1e-12 });
  waar("k_def staat zichtbaar in het huidige blad", reken({}).alle.k_def === 0.6);
}

afronden(fouten, "Balklaag — belastinggevallen en combinaties");
