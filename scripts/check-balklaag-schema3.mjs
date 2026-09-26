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
 *      (verplaatsingsmethode met een fijne verdeling);
 *   3  de combinaties: M_y,Ed en V_z,Ed als maximum over de UGT-combinaties,
 *      de omhullende tegen de volle belasting, en de quasi-blijvende
 *      combinatie (6.16b) als optelling van de belastinggevallen;
 *   4  schema 2 en 4 tegen de uitkomsten van het blad vóór de
 *      belastinggevallen — die mogen niet veranderen;
 *   5  vrije afmetingen ("Zelf invullen") en de onderslag met belaste breedte;
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
  const tot = L1 + deel2;
  const grootste = (f, a0, b0) => {
    let best = -Infinity;
    for (let i = 0; i <= 4000; i++) best = Math.max(best, f(a0 + ((b0 - a0) * i) / 4000));
    return best;
  };
  const eps = 1e-7;
  const vPunten = [eps, L1 / 2 - eps, L1 / 2 + eps, L1 - eps, L1 + eps, xP2 - eps, xP2 + eps, tot - eps];
  return {
    M, V, u, R,
    veld1: Math.max(0, grootste(M, 0, L1)),
    steun: schema === 2 || schema === 3 ? -M(L1) : 0,
    veld2: schema === 3 ? Math.max(0, grootste(M, L1, tot)) : 0,
    vmax: Math.max(...vPunten.filter((x) => x > 0 && x < tot).map((x) => Math.abs(V(x)))),
    uMid1: u(L1 / 2),
    uMid2: schema === 3 ? u(L1 + L2 / 2) : 0,
    uEind: schema === 2 ? u(tot) : 0,
  };
}

/** De lastsets van de vijf belastinggevallen, zoals het blad ze definieert. */
function gevallen({ schema, L1, a = 0 }, { g, q, F }) {
  const eind = schema === 2 && a > L1 / 4;
  return {
    1: { w1: g, w2: schema === 2 || schema === 3 ? g : 0 },
    2: { w1: q, w2: schema === 2 ? q : 0 },
    3: { w2: schema === 3 ? q : 0 },
    4: eind ? { P2: F } : { P1: F },
    5: { P2: schema === 3 ? F : 0 },
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
  const verwacht = geo.schema === 3 ? [1, 2, 3, 4, 5] : [1, 2, 4];
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
  { titel: "Overstek 4,00 + 1,20 m (puntlast op het uiteinde)", invoer: { schema: "2", L_d: "3950", a_over: "1200" }, geo: { schema: 2, L1: 4.0, a: 1.2 } },
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

for (const { titel, geo, r, lasten, sets } of uitkomsten.filter((u) => u.geo.schema === 3)) {
  console.log(`\n3. Combinaties — ${titel}`);
  const num = (set) => balkNumeriek({ ...geo, EI: EI_71x221, ...set });
  const bg = Object.fromEntries([1, 2, 3, 4, 5].map((k) => [k, num(sets[k])]));
  const c1 = num(combineer(sets, { 1: γG, 2: γQ }));
  const c2 = num(combineer(sets, { 1: γG, 2: γQ, 3: γQ }));
  const c3 = num(combineer(sets, { 1: γG, 3: γQ }));
  const mG = Math.max(bg[1].veld1, bg[1].steun, bg[1].veld2);
  const verwachtM = [
    c1.veld1,
    c2.steun,
    c3.veld2,
    γG * mG + γQ * Math.max(bg[4].veld1, bg[4].steun),
    γG * mG + γQ * Math.max(bg[5].veld2, bg[5].steun),
  ];
  const verwachtV = [c1.vmax, c2.vmax, c3.vmax, γG * bg[1].vmax + γQ * lasten.F, γG * bg[1].vmax + γQ * lasten.F];
  const onsM = getallenUit(r.ingevuld.M_y_Ed);
  const onsV = getallenUit(r.ingevuld.V_z_Ed);
  const namen = ["veld 1", "steun", "veld 2", "puntlast veld 1", "puntlast veld 2"];
  namen.forEach((n, i) => gelijk(`M_Ed ${n}`, onsM[i], verwachtM[i]));
  namen.forEach((n, i) => gelijk(`V_Ed ${n}`, onsV[i], verwachtV[i]));
  gelijk("M_y,Ed = maximum", r.alle.M_y_Ed, Math.max(...verwachtM));
  gelijk("V_z,Ed = maximum", r.alle.V_z_Ed, Math.max(...verwachtV));
  // De omhullende tegen de volle belasting op beide velden (het oude blad).
  const vol = c2;
  waar("veldmoment veld 1 ≥ volle belasting", verwachtM[0] >= vol.veld1 - 1e-9 && onsM[0] >= vol.veld1 * (1 - 1e-3),
    `${toon(onsM[0])} tegen ${toon(vol.veld1)}`);
  waar("veldmoment veld 2 ≥ volle belasting", onsM[2] >= vol.veld2 * (1 - 1e-3), `${toon(onsM[2])} tegen ${toon(vol.veld2)}`);
  waar("V_z,Ed ≥ volle belasting", r.alle.V_z_Ed >= vol.vmax * (1 - 1e-3), `${toon(r.alle.V_z_Ed)} tegen ${toon(vol.vmax)}`);

  // Zakkingen per veld: midden van het veld, met 4 % toeslag, negatief telt als nul.
  const z = (v) => 1.04 * Math.max(v, 0);
  gelijk("u_g,k   BG1 veld 1", r.alle.u_g_k, z(bg[1].uMid1), { rel: 2e-3, abs: 5e-3 });
  gelijk("u_q,k   BG2 veld 1", r.alle.u_q_k, z(bg[2].uMid1), { rel: 2e-3, abs: 5e-3 });
  gelijk("u_Q,k   BG4 veld 1", r.alle.u_Q_k, z(bg[4].uMid1), { rel: 2e-3, abs: 5e-3 });
  gelijk("u_g,k,2 BG1 veld 2", r.alle.u_g_k_2, z(bg[1].uMid2), { rel: 2e-3, abs: 5e-3 });
  gelijk("u_q,k,2 BG3 veld 2", r.alle.u_q_k_2, z(bg[3].uMid2), { rel: 2e-3, abs: 5e-3 });
  gelijk("u_Q,k,2 BG5 veld 2", r.alle.u_Q_k_2, z(bg[5].uMid2), { rel: 2e-3, abs: 5e-3 });
  const fin = (ug, uv) => (1 + K_DEF) * ug + (1 + Ψ2 * K_DEF) * uv;
  gelijk("w_fin   veld 1", r.alle.w_fin, fin(z(bg[1].uMid1), z(bg[2].uMid1)), { rel: 2e-3, abs: 5e-3 });
  gelijk("w_fin,2 veld 2", r.alle.w_fin_2, fin(z(bg[1].uMid2), z(bg[3].uMid2)), { rel: 2e-3, abs: 5e-3 });
  const volFin1 = fin(z(bg[1].uMid1), z(num({ w1: lasten.q, w2: lasten.q }).uMid1));
  const volFin2 = fin(z(bg[1].uMid2), z(num({ w1: lasten.q, w2: lasten.q }).uMid2));
  waar("w_fin veld 1 ≥ volle belasting", r.alle.w_fin >= volFin1 * (1 - 1e-3), `${toon(r.alle.w_fin)} tegen ${toon(volFin1)}`);
  waar("w_fin veld 2 ≥ volle belasting", r.alle.w_fin_2 >= volFin2 * (1 - 1e-3), `${toon(r.alle.w_fin_2)} tegen ${toon(volFin2)}`);
  gelijk("w_lim,2 = 0,004·L2", r.alle.w_lim_2, 0.004 * geo.L2 * 1000);
  gelijk("UC_doorbuiging = max per veld", r.alle.UC_doorbuiging,
    Math.max(r.alle.w_fin / r.alle.w_lim, r.alle.w_fin_2 / r.alle.w_lim_2));

  // 6.16b uitgeschreven: de regels zijn de optelling van de belastinggevallen.
  const a = r.alle;
  gelijk("q_qp = 1,0·P_g,k + ψ_2·q_q,k", a.q_qp, a.P_g_k + a["ψ_2"] * a.q_q_k, { rel: 1.5e-3, abs: 1e-4 });
  gelijk("w_qp = 1,0·u_g,k + ψ_2·u_var", a.w_qp, a.u_g_k + a["ψ_2"] * a.u_var, { rel: 1.5e-3, abs: 1e-3 });
  gelijk("w_qp,2 = 1,0·u_g,k,2 + ψ_2·u_var,2", a.w_qp_2, a.u_g_k_2 + a["ψ_2"] * a.u_var_2, { rel: 1.5e-3, abs: 1e-3 });
  gelijk("w_kruip = k_def·w_qp", a.w_kruip, a.k_def * a.w_qp, { rel: 1.5e-3, abs: 1e-3 });
  gelijk("w_fin = w_inst + w_kruip", a.w_fin, a.w_inst + a.w_kruip, { rel: 1.5e-3, abs: 1e-3 });
  gelijk("w_fin,2 = w_inst,2 + w_kruip,2", a.w_fin_2, a.w_inst_2 + a.w_kruip_2, { rel: 1.5e-3, abs: 1e-3 });
}

// Norm-stand: de maatgevende van verdeelde last en puntlast telt mee in u_var.
{
  console.log("\n3. Norm-stand — u_var is de maatgevende van verdeelde last en puntlast");
  const r = reken({ schema: "3", L_d: "3110", L_veld2: "2610", F_k: "3", Q_k: "1.0" }, { ...PROJECT, rekenwijze: 0 });
  const a = r.alle;
  waar("de puntlast is maatgevend in veld 1", a.u_Q_k > a.u_q_k, `u_Q,k ${toon(a.u_Q_k)} tegen u_q,k ${toon(a.u_q_k)}`);
  gelijk("u_var = max(u_q,k; u_Q,k)", a.u_var, Math.max(a.u_q_k, a.u_Q_k), { rel: 1.5e-3, abs: 1e-3 });
  gelijk("u_var,2 = max(u_q,k,2; u_Q,k,2)", a.u_var_2, Math.max(a.u_q_k_2, a.u_Q_k_2), { rel: 1.5e-3, abs: 1e-3 });
  gelijk("w_qp = 1,0·u_g,k + ψ_2·u_var", a.w_qp, a.u_g_k + a["ψ_2"] * a.u_var, { rel: 1.5e-3, abs: 1e-3 });
}

// ── 4. Schema 2 en 4 veranderen niet ──────────────────────────────────────

/**
 * Uitkomsten van het blad vóór de belastinggevallen (commit cf60233), op vier
 * significante cijfers. Voor een ligger met één veld is er niets te verdelen;
 * elke afwijking hier is dus een fout.
 */
const OUD = {
  "overstek 4,05 + 0,80 m": {
    invoer: { schema: "2", L_d: "4000", a_over: "800" },
    waarden: { P_g_k: 0.6863, q_q_k: 1.05, F_Q_k: 1.564, k_r: 0.782, u_g_k: 3.226, u_q_k: 4.936, u_Q_k: 3.081, w_inst: 8.161, w_qp: 4.707, w_fin: 10.99, w_lim: 16.2, M_y_Ed: 4.542, V_z_Ed: 5.047, "σ_m_y_d": 7.858, "τ_d": 0.4824, UC_buiging: 0.532, UC_afsch: 0.196, UC_doorbuiging: 0.6781, UC_max: 0.6781 },
  },
  "overstek 3,05 + 1,50 m, F 3 kN": {
    invoer: { schema: "2", L_d: "3000", a_over: "1500", F_k: "3" },
    waarden: { P_g_k: 0.6863, q_q_k: 1.05, F_Q_k: 2.346, k_r: 0.782, u_g_k: 0.4803, u_q_k: 0.7348, u_Q_k: 11.4, w_inst: 1.215, w_qp: 0.7007, w_fin: 1.635, w_lim: 12.2, M_y_Ed: 6.205, V_z_Ed: 5.079, "σ_m_y_d": 10.74, "τ_d": 0.4855, UC_buiging: 0.7269, UC_afsch: 0.1972, UC_doorbuiging: 0.1341, UC_max: 0.7269 },
  },
  "overstek 4,05 + 1,20 m, norm-stand": {
    invoer: { schema: "2", L_d: "4000", a_over: "1200" }, rekenwijze: 0,
    waarden: { P_g_k: 0.6647, q_q_k: 1.05, F_Q_k: 1.564, k_r: 0.782, u_g_k: 2.721, u_q_k: 4.298, u_Q_k: 5.61, w_inst: 8.331, w_qp: 4.404, w_fin: 10.97, w_lim: 16.2, M_y_Ed: 4.176, V_z_Ed: 5.226, "σ_m_y_d": 7.225, "τ_d": 0.4996, UC_buiging: 0.4892, UC_afsch: 0.203, UC_doorbuiging: 0.6773, UC_max: 0.6773 },
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
    // De grootste waarde van de omhullende in veld 1 is het veldmoment van UGT veld 1 of van de puntlast.
    const combis = ugtCombinaties(bg, γG, γQ).map((s) => lijnen(ligger, s));
    let piek = 0;
    for (let i = 0; i <= 4000; i++) {
      const x = (geo.L1 * i) / 4000;
      piek = Math.max(piek, ...combis.slice(0, 3).map((c) => c.M(x)));
    }
    const [mVeld1] = getallenUit(r.ingevuld.M_y_Ed);
    gelijk("omhullende veld 1 (verdeelde last) = M_Ed veld 1", piek, mVeld1);
  }
}

afronden(fouten, "Balklaag — belastinggevallen en combinaties");
