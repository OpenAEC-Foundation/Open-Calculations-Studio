/**
 * Controlescript voor de module Opdrijven en drijvend lichaam
 * (templates/opdrijven.ts): drie delen op één blad.
 *
 *   1. Opdrijven van een kelder of bak (UPL), NEN 9997-1 (2.8): opwaartse
 *      waterdruk bij de rekenwaarde van de waterstand tegen het eigen gewicht,
 *      overige blijvende belasting, ballast en trekpalen; factoren uit tabel
 *      A.15 en A.16, of de EQU-set van NEN-EN 1990 tabel NB.3 – A1.2(A).
 *   2. Zwaartepunt van tot tien lasten, met excentriciteit en moment t.o.v.
 *      een referentiepunt.
 *   3. Drijvende betonbak: diepgang, drukkingspunt B, gewichtszwaartepunt G,
 *      metacentrum M (BM = I/V), GM, scheefstand met de kleine-hoekbenadering
 *      en vrijboord aan de lage hoek, in rust, met wind en met een
 *      excentrische last.
 *
 * Geen referentieberekening beschikbaar. Het script rekent daarom op twee
 * manieren na:
 *   • per deel een voorbeeld met de hand uitgewerkt (hieronder in het
 *     commentaar), met de gedrukte waarden van het blad;
 *   • een onafhankelijke uitwerking in JavaScript voor varianten: EQU, (NB.4),
 *     trekpalen, grensgevallen rond UC = 1, tien lasten met een negatieve,
 *     een bak met dek en ongelijke wanden, een instabiele bak, een bak die
 *     zinkt en een bak waarvan de kim boven water komt.
 * Daarnaast: elke variant rekent zonder NaN of foutmelding, de slotregel past
 * bij de UC, deel 2 geeft geen oordeel, en de beginwaarden van het beeld zijn
 * de standaardinvoer hier.
 *
 * Draaien:  node scripts/check-opdrijven.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("opdrijven.ts");
/** Projectgegevens zoals de app ze vóór de eerste regel in de scope zet. */
const SCOPE = { CC: 2, RC: 2, K_FI: 1, DesignLife: 50, rekenwijze: 1 };

/**
 * Standaardinvoer, gelijk aan de beginwaarden van het beeld
 * (components/calc/OpdrijvenDesigner.tsx). Eén bak voor deel 1 en 3: open,
 * 12 × 8 × 2,5 m, vloer 300 en wanden 250 mm; drie lasten voor deel 2 en 3.
 */
const STANDAARD = {
  deel: 1,
  l_bak: 12, b_bak: 8, h_bak: 2.5, t_vl: 0.3, t_dak: 0, γ_c: 25, γ_w: 10,
  t_w1: 0.25, t_w2: 0.25, t_w3: 0.25, t_w4: 0.25,
  waterstand: 1, h_d: 1.6, h_k: 1.4, h_m: 1.2, G_ov: 600, G_bal: 0, n_tp: 0, R_t_k: 250, factoren: 1,
  n_last: 3,
  F_1: 300, x_1: 0.5, y_1: 0, z_1: 3.5,
  F_2: 60, x_2: 2, y_2: 1.5, z_2: 2.8,
  F_3: 40, x_3: -3, y_3: -1, z_3: 0.5,
  x_ref: 0, y_ref: 0, z_ref: 0,
  Q_v: 60, z_Q: 2.8, P_e: 20, e_P: 3, z_P: 3, F_w: 15, a_w: 3, φ_max: 5, f_min: 0.3, GM_min: 0.5,
};

const alsTekst = (v) => Object.fromEntries(Object.entries(v).map(([k, w]) => [k, String(w)]));
const doorreken = (v) => reken(tpl, alsTekst(v), SCOPE);

// ── Onafhankelijke uitwerking; eenheden kN en m ─────────────────────────────
function geometrie(v) {
  const hw = v.h_bak - v.t_vl - v.t_dak, lk = v.b_bak - v.t_w1 - v.t_w2;
  const geldig = v.l_bak > 0 && v.b_bak > 0 && v.t_vl > 0 && v.t_dak >= 0 &&
    [v.t_w1, v.t_w2, v.t_w3, v.t_w4].every((t) => t >= 0) &&
    hw > 0 && lk > 0 && v.l_bak - v.t_w3 - v.t_w4 > 0 && v.γ_c > 0 && v.γ_w > 0;
  return { hw, lk, geldig };
}

function deel1(v) {
  const { hw, lk, geldig } = geometrie(v);
  const h_d = v.waterstand === 2 ? v.h_k + (v.h_k - v.h_m) : v.h_d;
  if (!geldig || h_d > v.h_bak || (v.waterstand === 2 && v.h_m > v.h_k) || v.n_tp < 0 || v.R_t_k < 0 || v.G_ov < 0 || v.G_bal < 0) return { geldig: false };
  const V_c = v.l_bak * v.b_bak * (v.t_vl + v.t_dak) + (v.l_bak * (v.t_w1 + v.t_w2) + lk * (v.t_w3 + v.t_w4)) * hw;
  const G_bak = v.γ_c * V_c;
  const G_stb_k = G_bak + v.G_ov + v.G_bal;
  const U_k = v.γ_w * Math.max(h_d, 0) * v.l_bak * v.b_bak;
  const gDst = v.factoren === 2 ? 1.1 : 1.0, gStb = 0.9;
  const V_dst_d = gDst * U_k, G_stb_d = gStb * G_stb_k, R_d = (v.n_tp * v.R_t_k) / 1.4;
  const UC_upl = V_dst_d / (G_stb_d + R_d);
  // h_d is alleen een uitkomst als hij uit (NB.4) volgt; anders is het invoer.
  return { geldig, ...(v.waterstand === 2 ? { h_d } : {}), V_c, G_bak, G_stb_k, U_k, V_dst_d, G_stb_d, R_d, UC_upl, ΔG_k: Math.max(V_dst_d - G_stb_d - R_d, 0) / gStb, UC_max: UC_upl };
}

function lasten(v) {
  const n = Math.min(10, Math.max(0, Math.round(v.n_last)));
  const uit = [];
  for (let i = 1; i <= n; i++) uit.push({ F: v[`F_${i}`] ?? 0, x: v[`x_${i}`] ?? 0, y: v[`y_${i}`] ?? 0, z: v[`z_${i}`] ?? 0 });
  return uit;
}

function deel2(v) {
  const L = lasten(v);
  const R = L.reduce((s, l) => s + l.F, 0);
  if (L.length === 0 || Math.abs(R) < 1e-6) return { geldig: false };
  const x_R = L.reduce((s, l) => s + l.F * l.x, 0) / R;
  const y_R = L.reduce((s, l) => s + l.F * l.y, 0) / R;
  const z_R = L.reduce((s, l) => s + l.F * l.z, 0) / R;
  const e_x = x_R - v.x_ref, e_y = y_R - v.y_ref, e_z = z_R - v.z_ref;
  return { geldig: true, R, x_R, y_R, z_R, e_x, e_y, e_z, M_ex: R * e_x, M_ey: R * e_y };
}

function deel3(v) {
  const { hw, lk, geldig } = geometrie(v);
  const { l_bak: l, b_bak: b, h_bak: h, γ_c: gc, γ_w: gw } = v;
  // Onderdelen van de bak: [G, x, y, z]. Langswanden over de volle lengte,
  // kopwanden ertussen (hun hart ligt op (t_w1 − t_w2)/2 over de breedte).
  const zw = v.t_vl + hw / 2, yk = (v.t_w1 - v.t_w2) / 2;
  const delen = [
    [gc * l * b * v.t_vl, 0, 0, v.t_vl / 2],
    [gc * l * b * v.t_dak, 0, 0, h - v.t_dak / 2],
    [gc * l * v.t_w1 * hw, 0, -b / 2 + v.t_w1 / 2, zw],
    [gc * l * v.t_w2 * hw, 0, b / 2 - v.t_w2 / 2, zw],
    [gc * lk * v.t_w3 * hw, -l / 2 + v.t_w3 / 2, yk, zw],
    [gc * lk * v.t_w4 * hw, l / 2 - v.t_w4 / 2, yk, zw],
  ];
  const G_bak = delen.reduce((s, d) => s + d[0], 0);
  for (const q of lasten(v)) delen.push([q.F, q.x, q.y, q.z]);
  const G = delen.reduce((s, d) => s + d[0], 0);
  const ok = geldig && G > 0 && v.φ_max > 0 && v.Q_v >= 0 && v.P_e >= 0 && v.F_w >= 0 && v.f_min >= 0 && v.GM_min >= 0;
  if (!ok) return { geldig: false };
  const x_G = delen.reduce((s, d) => s + d[0] * d[1], 0) / G;
  const y_G = delen.reduce((s, d) => s + d[0] * d[2], 0) / G;
  const z_G = delen.reduce((s, d) => s + d[0] * d[3], 0) / G;
  const A = l * b;

  /** Eén toestand: waterverplaatsing Δ, zwaartepunt KG, kenterend moment M. */
  function toestand(Δ, KG, M) {
    const d = Δ / (gw * A);
    const GM = d / 2 + (b * b) / (12 * d) - KG;
    const GML = d / 2 + (l * l) / (12 * d) - KG;
    const φ = M / (Δ * GM);                        // rad, kleine hoek
    const θ = (G * Math.abs(x_G)) / (Δ * GML);     // trim, rad
    const δ = (φ * b + θ * l) / 2;                 // inzakken van de lage hoek
    // De hoge hoek komt evenveel omhoog als de lage zakt; blijft hij onder water,
    // dan snijdt de waterlijn overal de wanden en geldt de benadering.
    return { Δ, KG, d, GM, GML, M, φ, φgr: (φ * 180) / Math.PI, δ, f: h - d - δ, kim: δ <= d };
  }
  const M0 = G * Math.abs(y_G);
  const t0 = toestand(G, z_G, M0);
  const Δw = G + v.Q_v;
  const tw = toestand(Δw, (G * z_G + v.Q_v * v.z_Q) / Δw, M0 + v.F_w * Math.abs(v.a_w));
  const Δp = G + v.Q_v + v.P_e;
  const tp = toestand(Δp, (G * z_G + v.Q_v * v.z_Q + v.P_e * v.z_P) / Δp, M0 + v.P_e * Math.abs(v.e_P));
  const T = [t0, tw, tp];
  const stabiel = T.every((t) => t.GM > 0 && t.GML > 0);
  const UC_GM = v.GM_min / Math.min(...T.map((t) => t.GM));
  const UC_φ = Math.max(...T.map((t) => t.φgr)) / v.φ_max;
  const UC_f = (Math.max(...T.map((t) => t.d + t.δ)) + v.f_min) / h;
  return {
    geldig: true, stabiel, kim: T.every((t) => t.kim), zinkt: T.some((t) => t.d >= h),
    G_bak, G_tot: G, x_G, y_G, z_G, A_w: A,
    d_0: t0.d, KB_0: t0.d / 2, BM_0: (b * b) / (12 * t0.d), KM_0: t0.d / 2 + (b * b) / (12 * t0.d),
    GM_0: t0.GM, GML_0: t0.GML, C_0: G * t0.GM, M_0: M0, φ_0: t0.φgr, δ_0: t0.δ, f_0: t0.f,
    Δ_w: tw.Δ, KG_w: tw.KG, d_w: tw.d, GM_w: tw.GM, GML_w: tw.GML, M_w: tw.M, φ_w: tw.φgr, δ_w: tw.δ, f_w: tw.f,
    Δ_p: tp.Δ, KG_p: tp.KG, d_p: tp.d, GM_p: tp.GM, GML_p: tp.GML, M_p: tp.M, φ_p: tp.φgr, δ_p: tp.δ, f_p: tp.f,
    UC_GM, UC_φ, UC_f, UC_max: Math.max(UC_GM, UC_φ, UC_f),
  };
}

// ── Hulpjes ──────────────────────────────────────────────────────────────────
let fouten = 0;
const meld = (ok, wat, detail = "") => {
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${wat}${ok || !detail ? "" : "  -> " + detail}`);
};

/** Het blad drukt vier significante cijfers af; tolerantie een halve eenheid daarvan. */
function vergelijk(naam, got, verwacht) {
  console.log(`\n${naam} — tegen de onafhankelijke uitwerking`);
  for (const [k, w] of Object.entries(verwacht)) {
    if (typeof w !== "number") continue;
    const ons = got.values[k.replace(/,/g, "_")];
    const tol = w === 0 ? 1e-9 : 0.5 * 10 ** (Math.floor(Math.log10(Math.abs(w))) - 3) + 1e-9;
    const ok = ons !== undefined && Math.abs(ons - w) <= tol * 1.0001;
    meld(ok, `${k.padEnd(10)} ons ${String(ons).padStart(10)}   uitwerking ${Number(w.toPrecision(6))}`);
  }
}

/** De slotregel: UC en oordeel, en of ze bij elkaar passen. */
function slot(got) {
  const i = got.text.lastIndexOf("Maatgevende UC");
  if (i < 0) return null;
  const zin = got.text.slice(i, i + 260);
  const m = zin.match(/Maatgevende UC\s*=\s*([\d.]+|∞)/);
  return {
    zin,
    uc: m ? parseFloat(m[1]) : null,
    voldoet: !/voldoe[nt] niet/.test(zin) && /voldoe[nt]/.test(zin),
    onvolledig: /niet volledig getoetst/.test(zin),
  };
}

function schoon(naam, got) {
  const stuk = ["NaN", "Error", "Undefined symbol", "niet gedefinieerd", "undefined", "Infinity"].filter((s) => got.text.includes(s));
  meld(stuk.length === 0, `${naam}: rekent zonder NaN of foutmelding`, stuk.join(", "));
}

function oordeelPast(naam, got, verwachtVoldoet) {
  const s = slot(got);
  if (!s) { meld(false, `${naam}: slotregel "Maatgevende UC = …"`, "geen slotregel"); return; }
  const past = s.uc === null ? true : (s.uc <= 1) === s.voldoet || s.onvolledig;
  meld(past && s.voldoet === verwachtVoldoet,
    `${naam}: slotregel ${s.voldoet ? "voldoet" : "voldoet niet"}${s.uc !== null ? ` bij UC ${s.uc}` : ""}`, s.zin.slice(0, 160));
}

// ═════════════════════════════════════════════════════════════════════════════
// Deel 1 — opdrijven
// ═════════════════════════════════════════════════════════════════════════════
//
// Handberekening, standaardinvoer (UPL, h_d = 1,6 m rechtstreeks):
//   h_wand = 2,5 − 0,3 − 0 = 2,2 m; kopwanden 8 − 2·0,25 = 7,5 m lang
//   V_c = 12·8·0,3 + 12·0,5·2,2 + 7,5·0,5·2,2 = 28,8 + 13,2 + 8,25 = 50,25 m³
//   G_bak = 25·50,25 = 1256,25 kN; G_stb;k = 1256,25 + 600 + 0 = 1856,25 kN
//   U_k = 10·1,6·96 = 1536 kN; V_dst;d = 1,0·1536 = 1536 kN
//   G_stb;d = 0,9·1856,25 = 1670,625 kN; R_d = 0
//   UC = 1536/1670,625 = 0,9194 → voldoet; extra ballast 0.
// EQU: V_dst;d = 1,1·1536 = 1689,6 kN; UC = 1689,6/1670,625 = 1,0114 → voldoet
//   niet; extra ballast (1689,6 − 1670,625)/0,9 = 21,08 kN.
// (NB.4): h_k = 1,4, h_m = 1,2 → h_d = 1,4 + (1,4 − 1,2) = 1,6 m, dus als boven.
// Trekpalen bij h_d = 2,2 m: U_k = 10·2,2·96 = 2112 kN. Zonder palen UC =
//   2112/1670,625 = 1,2642 en extra ballast 441,375/0,9 = 490,4 kN; met 4 palen
//   R_t;k = 250 kN: R_d = 4·250/1,4 = 714,29 kN, UC = 2112/2384,91 = 0,8856.
// Grensgeval: UC = 1 bij 0,9·(1256,25 + G_ov) = 1536, G_ov = 450,42 kN.
//   G_ov = 449 → UC = 1536/1534,725 = 1,0008 (voldoet niet);
//   G_ov = 452 → UC = 1536/1537,425 = 0,9991 (voldoet).
{
  const got = doorreken(STANDAARD);
  fouten += toets("Deel 1 — standaard, UPL (handberekening)", got,
    { V_vd: "28.8", V_wl: "13.2", V_wk: "8.25", V_c: "50.25", G_bak: "1256", G_stb_k: "1856", A_g: "96", U_k: "1536", γ_G_dst: "1.0", γ_G_stb: "0.9", γ_s_t: "1.4",
      V_dst_d: "1536", G_stb_d: "1671", R_d: "0", UC_upl: "0.9194", ΔG_k: "0", UC_max: "0.9194" });
  schoon("standaard", got);
  oordeelPast("standaard", got, true);
  meld(!/grondkluit/.test(got.text), "zonder trekpalen geen opmerking over de grondkluit");
  meld(/gevolgklasse CC2/.test(got.text), "de gevolgklasse van het project staat bij de waterstand");
}
{
  const v = { ...STANDAARD, factoren: 2 };
  const got = doorreken(v);
  fouten += toets("Deel 1 — EQU (handberekening)", got, { V_dst_d: "1690", UC_upl: "1.011", ΔG_k: "21.08" });
  vergelijk("Deel 1 — EQU", got, deel1(v));
  oordeelPast("EQU", got, false);
}
{
  const v = { ...STANDAARD, waterstand: 2 };
  const got = doorreken(v);
  fouten += toets("Deel 1 — waterstand met (NB.4) (handberekening)", got, { h_d: "1.6", UC_upl: "0.9194" });
}
{
  const zonder = doorreken({ ...STANDAARD, h_d: 2.2 });
  fouten += toets("Deel 1 — h_d = 2,2 m zonder trekpalen (handberekening)", zonder, { U_k: "2112", UC_upl: "1.264", ΔG_k: "490.4" });
  oordeelPast("zonder trekpalen", zonder, false);
  meld(/490\.4 kN extra ballast/.test(zonder.text), "de slotregel noemt de extra ballast");
  const v = { ...STANDAARD, h_d: 2.2, n_tp: 4 };
  const met = doorreken(v);
  fouten += toets("Deel 1 — h_d = 2,2 m met vier trekpalen (handberekening)", met, { R_d: "714.3", UC_upl: "0.8856", ΔG_k: "0" });
  vergelijk("Deel 1 — trekpalen", met, deel1(v));
  oordeelPast("met trekpalen", met, true);
  meld(/grondkluit met de palen \(7\.6\.3\.1\(4\)\) is niet getoetst/.test(met.text), "met trekpalen de opmerking over de grondkluit");
}
for (const [G_ov, voldoet] of [[449, false], [452, true]]) {
  const v = { ...STANDAARD, G_ov };
  const got = doorreken(v);
  vergelijk(`Deel 1 — grensgeval G_ov = ${G_ov} kN`, got, { UC_upl: deel1(v).UC_upl });
  oordeelPast(`grensgeval G_ov = ${G_ov}`, got, voldoet);
}
{
  // Een dichte kelder met dak en ongelijke wanden, EQU, (NB.4), ballast en palen.
  const v = { ...STANDAARD, l_bak: 9.6, b_bak: 5.4, h_bak: 3.2, t_vl: 0.35, t_dak: 0.22, t_w1: 0.3, t_w2: 0.2, t_w3: 0.25, t_w4: 0.18,
    γ_c: 24, waterstand: 2, h_k: 2.1, h_m: 1.3, G_ov: 150, G_bal: 80, n_tp: 3, R_t_k: 180, factoren: 2 };
  const got = doorreken(v);
  vergelijk("Deel 1 — kelder met dak, ongelijke wanden, EQU, (NB.4)", got, deel1(v));
  schoon("kelder met dak", got);
  oordeelPast("kelder met dak", got, deel1(v).UC_upl <= 1);
}
{
  const got = doorreken({ ...STANDAARD, h_d: 2.6 });
  meld(/waterstand tussen de onderkant en de bovenkant van de bak/.test(got.text) && /niet getoetst: invoer onvolledig/.test(got.text),
    "Deel 1 — een waterstand boven de bak wordt niet getoetst");
  const s = slot(got);
  meld(s && s.uc === null && !s.voldoet, "  en de slotregel geeft geen UC en geen 'voldoet'");
}
{
  // (NB.4) met h_m boven h_k (verwisseld): h_d = 2·1,2 − 1,4 = 1,0 m zou lager
  // uitkomen dan h_k en de bak ten onrechte laten voldoen. Niet getoetst.
  const got = doorreken({ ...STANDAARD, waterstand: 2, h_k: 1.2, h_m: 1.4 });
  meld(/gemiddelde waterstand niet boven de karakteristieke/.test(got.text) && /niet getoetst: invoer onvolledig/.test(got.text),
    "Deel 1 — (NB.4) met h_m > h_k wordt niet getoetst");
  const s = slot(got);
  meld(s && s.uc === null && !s.voldoet, "  en de slotregel geeft geen UC en geen 'voldoet'");
}

// ═════════════════════════════════════════════════════════════════════════════
// Deel 2 — zwaartepunt
// ═════════════════════════════════════════════════════════════════════════════
//
// Handberekening, standaardinvoer (drie lasten, referentiepunt (0; 0; 0)):
//   R = 300 + 60 + 40 = 400 kN
//   ΣF·x = 300·0,5 + 60·2 + 40·(−3) = 150 + 120 − 120 = 150 kNm → x_R = 0,375 m
//   ΣF·y = 0 + 60·1,5 + 40·(−1) = 90 − 40 = 50 kNm → y_R = 0,125 m
//   ΣF·z = 300·3,5 + 60·2,8 + 40·0,5 = 1050 + 168 + 20 = 1238 kNm → z_R = 3,095 m
//   M_ex = 400·0,375 = 150 kNm, M_ey = 400·0,125 = 50 kNm.
// Vijf lasten, waarvan een sparing van −25 kN, referentiepunt (1; 0,5; 0):
//   100 (0; 0; 1), 50 (4; 0; 2), 30 (−2; 3; 3), 20 (2; −1; 5), −25 (1; 1; 0)
//   R = 175 kN; ΣF·x = 0 + 200 − 60 + 40 − 25 = 155 → x_R = 0,8857 m
//   ΣF·y = 0 + 0 + 90 − 20 − 25 = 45 → y_R = 0,2571 m
//   ΣF·z = 100 + 100 + 90 + 100 + 0 = 390 → z_R = 2,2286 m
//   e = (−0,1143; −0,2429; 2,2286) m; M_ex = 175·(−0,1143) = −20 kNm, M_ey = −42,5 kNm.
{
  const v = { ...STANDAARD, deel: 2 };
  const got = doorreken(v);
  fouten += toets("Deel 2 — standaard (handberekening)", got,
    { R: "400", x_R: "0.375", y_R: "0.125", z_R: "3.095", e_x: "0.375", e_z: "3.095", M_ex: "150", M_ey: "50" });
  schoon("deel 2 standaard", got);
  meld(slot(got) === null && !/voldoe/.test(got.text), "deel 2 geeft geen UC en geen oordeel");
}
{
  const v = { ...STANDAARD, deel: 2, n_last: 5, x_ref: 1, y_ref: 0.5, z_ref: 0,
    F_1: 100, x_1: 0, y_1: 0, z_1: 1, F_2: 50, x_2: 4, y_2: 0, z_2: 2, F_3: 30, x_3: -2, y_3: 3, z_3: 3,
    F_4: 20, x_4: 2, y_4: -1, z_4: 5, F_5: -25, x_5: 1, y_5: 1, z_5: 0 };
  const got = doorreken(v);
  fouten += toets("Deel 2 — vijf lasten met een sparing (handberekening)", got,
    { R: "175", x_R: "0.8857", y_R: "0.2571", z_R: "2.229", e_x: "-0.1143", e_y: "-0.2429", e_z: "2.229", M_ex: "-20", M_ey: "-42.5" });
  // Een last boven n_last telt niet mee, ook als hij een waarde heeft.
  const minder = doorreken({ ...v, n_last: 4 });
  fouten += toets("Deel 2 — dezelfde, n_last = 4: de sparing valt weg", minder, { R: "200", x_R: "0.9" });
}
{
  // Tien lasten met een vaste pseudo-willekeurige reeks.
  let s = 7;
  const rnd = (a, b) => { s = (s * 16807) % 2147483647; return a + ((s - 1) / 2147483646) * (b - a); };
  const v = { ...STANDAARD, deel: 2, n_last: 10, x_ref: 0.7, y_ref: -0.4, z_ref: 1.1 };
  for (let i = 1; i <= 10; i++) Object.assign(v, {
    [`F_${i}`]: Math.round(rnd(-20, 150) * 10) / 10, [`x_${i}`]: Math.round(rnd(-6, 6) * 100) / 100,
    [`y_${i}`]: Math.round(rnd(-4, 4) * 100) / 100, [`z_${i}`]: Math.round(rnd(0, 6) * 100) / 100 });
  const got = doorreken(v);
  const { geldig, ...u } = deel2(v);
  vergelijk("Deel 2 — tien lasten", got, { ...u, R: u.R });
  schoon("tien lasten", got);
}
{
  const got = doorreken({ ...STANDAARD, deel: 2, n_last: 2, F_1: 50, F_2: -50 });
  meld(/resultante nul/.test(got.text) && got.values.x_R === undefined, "Deel 2 — resultante nul: geen zwaartepunt");
  const leeg = doorreken({ ...STANDAARD, deel: 2, n_last: 0 });
  meld(/Geen lasten/.test(leeg.text), "Deel 2 — geen lasten: melding");
}

// ═════════════════════════════════════════════════════════════════════════════
// Deel 3 — drijvend lichaam
// ═════════════════════════════════════════════════════════════════════════════
//
// Handberekening, standaardinvoer (open bak 12 × 8 × 2,5 m, drie lasten):
//   vloer 25·12·8·0,3 = 720 kN op z = 0,15; wanden 1 en 2 25·12·0,25·2,2 = 165 kN
//   op y = ∓3,875; wanden 3 en 4 25·7,5·0,25·2,2 = 103,125 kN op x = ∓5,875;
//   wanden op z = 0,3 + 2,2/2 = 1,4. G_bak = 720 + 330 + 206,25 = 1256,25 kN.
//   Lasten als in deel 2: 400 kN, ΣF·x = 150, ΣF·y = 50, ΣF·z = 1238 kNm.
//   G = 1656,25 kN; x_G = 150/1656,25 = 0,09057; y_G = 50/1656,25 = 0,03019;
//   z_G = (720·0,15 + 536,25·1,4 + 1238)/1656,25 = 2096,75/1656,25 = 1,2660 m.
//   In rust: d = 1656,25/(10·96) = 1,7253 m; KB = 0,8626; BM = 8²/(12·1,7253)
//   = 3,0913; KM = 3,9540; GM = 3,9540 − 1,2660 = 2,6880 m; GM_L = 0,8626 +
//   12²/(12·1,7253) − 1,2660 = 6,5521 m; C = 1656,25·2,6880 = 4452 kNm/rad.
//   M = G·y_G = 50 kNm; φ = 50/4452 = 0,011231 rad = 0,6435°; trim θ = 150/
//   (1656,25·6,5521) = 0,013822; δ = (0,011231·8 + 0,013822·12)/2 = 0,1279 m;
//   f = 2,5 − 1,7253 − 0,1279 = 0,6469 m.
//   Met Q_v = 60 kN op z = 2,8 en wind 15 kN × 3 m: Δ = 1716,25; KG = (2096,75
//   + 168)/1716,25 = 1,3196; d = 1,7878; GM = 0,8939 + 64/21,4531 − 1,3196 =
//   2,5575; M = 50 + 45 = 95; φ = 95/(1716,25·2,5575) = 0,021643 rad = 1,240°;
//   GM_L = 6,2866, θ = 150/(1716,25·6,2866) = 0,013903; δ = 0,1700; f = 0,5423 m.
//   Met ook P_e = 20 kN op 3 m, z = 3: Δ = 1736,25; KG = 2324,75/1736,25 =
//   1,3389; d = 1,8086; GM = 0,9043 + 64/21,7031 − 1,3389 = 2,5142; M = 50 + 60
//   = 110; φ = 110/(1736,25·2,5142) = 0,025199 rad = 1,444°; GM_L = 6,2003,
//   θ = 0,013934; δ = 0,1844; f = 2,5 − 1,8086 − 0,1844 = 0,5070 m.
//   UC_GM = 0,5/2,5142 = 0,1989; UC_φ = 1,444/5 = 0,2888;
//   kleinste vrijboord 0,5070 m; UC_f = (2,5 − 0,5070 + 0,3)/2,5 = (1,8086 + 0,1844 +
//   0,3)/2,5 = 0,9172 → maatgevend, voldoet.
// Grensgeval vrijboord: f_min = 0,50 → UC_f = 2,4930/2,5 = 0,9972 (voldoet);
//   f_min = 0,51 → UC_f = 2,5030/2,5 = 1,0012 (voldoet niet).
{
  const v = { ...STANDAARD, deel: 3 };
  const got = doorreken(v);
  fouten += toets("Deel 3 — standaard (handberekening)", got, {
    G_bak: "1256", G_tot: "1656", x_G: "0.09057", y_G: "0.03019", z_G: "1.266",
    d_0: "1.725", KB_0: "0.8626", BM_0: "3.091", KM_0: "3.954", GM_0: "2.688", GML_0: "6.552", C_0: "4452",
    M_0: "50", φ_0: "0.6435", δ_0: "0.1279", f_0: "0.6469",
    Δ_w: "1716", KG_w: "1.320", d_w: "1.788", GM_w: "2.558", GML_w: "6.287", M_w: "95", φ_w: "1.240", f_w: "0.5423",
    Δ_p: "1736", KG_p: "1.339", d_p: "1.809", GM_p: "2.514", GML_p: "6.200", M_p: "110", φ_p: "1.444", δ_p: "0.1844", f_p: "0.5070",
    f_kl: "0.5070", UC_GM: "0.1989", UC_φ: "0.2888", UC_f: "0.9172", UC_max: "0.9172",
  });
  const { geldig, stabiel, kim, zinkt, ...u } = deel3(v);
  vergelijk("Deel 3 — standaard", got, u);
  schoon("deel 3 standaard", got);
  oordeelPast("deel 3 standaard", got, true);
  meld(/\(vrijboord\)/.test(slot(got)?.zin ?? ""), "de slotregel noemt het vrijboord als maatgevend");
}
{
  // Een negatief ingevulde arm van de wind mag het kenterend moment niet
  // verkleinen: de wind werkt aan de kant van de scheefstand in rust.
  // Met de hand, standaardinvoer met a_w = −3 m: M_w = 50 + 15·|−3| = 95 kNm,
  // gelijk aan a_w = +3 m; φ_w = 1,240° en f_w = 0,5423 m als hierboven.
  const v = { ...STANDAARD, deel: 3, a_w: -3 };
  const got = doorreken(v);
  fouten += toets("Deel 3 — negatieve arm van de wind (handberekening)", got, { M_w: "95", φ_w: "1.240", f_w: "0.5423", UC_max: "0.9172" });
  vergelijk("Deel 3 — negatieve arm van de wind", got, { M_w: deel3(v).M_w });
}
for (const [f_min, voldoet] of [[0.5, true], [0.51, false]]) {
  const v = { ...STANDAARD, deel: 3, f_min };
  const got = doorreken(v);
  vergelijk(`Deel 3 — grensgeval f_min = ${f_min} m`, got, { UC_f: deel3(v).UC_f });
  oordeelPast(`grensgeval f_min = ${f_min}`, got, voldoet);
}
{
  // Met dek, ongelijke wanden, lasten buiten het hart en wind van formaat.
  const v = { ...STANDAARD, deel: 3, l_bak: 15, b_bak: 7.2, h_bak: 2.2, t_vl: 0.28, t_dak: 0.18, γ_c: 24.5, γ_w: 9.81,
    t_w1: 0.3, t_w2: 0.2, t_w3: 0.25, t_w4: 0.18, n_last: 4,
    F_1: 180, x_1: -1.5, y_1: 0.4, z_1: 3.2, F_2: 45, x_2: 3, y_2: -1.2, z_2: 2.6, F_3: -12, x_3: 2, y_3: 2, z_3: 2.1, F_4: 30, x_4: -5, y_4: 0, z_4: 0.6,
    Q_v: 85, z_Q: 2.6, P_e: 30, e_P: -2.8, z_P: 2.9, F_w: 22, a_w: 2.4, φ_max: 4, f_min: 0.25, GM_min: 0.6 };
  const got = doorreken(v);
  const { geldig, stabiel, kim, zinkt, ...u } = deel3(v);
  vergelijk("Deel 3 — dek, ongelijke wanden, lasten buiten het hart", got, u);
  schoon("deel 3 variant", got);
  oordeelPast("deel 3 variant", got, u.UC_max <= 1);
}
{
  // Smalle, hoge bak met een zware last hoog: G boven M.
  const v = { ...STANDAARD, deel: 3, l_bak: 12, b_bak: 3, h_bak: 3, t_vl: 0.25, t_w1: 0.2, t_w2: 0.2, t_w3: 0.2, t_w4: 0.2,
    n_last: 1, F_1: 200, x_1: 0, y_1: 0, z_1: 8 };
  const got = doorreken(v);
  const r = deel3(v);
  meld(!r.stabiel && /instabiel/.test(got.text), "Deel 3 — G boven het metacentrum: instabiel", `GM_0 = ${r.GM_0}`);
  const s = slot(got);
  meld(s && s.uc === null && !s.voldoet, "  de slotregel: voldoet niet, zonder UC");
  schoon("instabiel", got);
}
{
  // Te zwaar voor zijn hoogte: de diepgang groter dan de bak.
  const v = { ...STANDAARD, deel: 3, n_last: 1, F_1: 1500, x_1: 0, y_1: 0, z_1: 1.5 };
  const got = doorreken(v);
  const r = deel3(v);
  meld(r.zinkt && /de bak zinkt/.test(got.text), "Deel 3 — diepgang groter dan de hoogte: de bak zinkt", `d_0 = ${r.d_0}`);
  oordeelPast("zinkt", got, false);
}
{
  // Lichte bak, hoge wanden en veel wind: de kim komt boven water terwijl
  // scheefstand en vrijboord binnen de eisen blijven.
  const v = { ...STANDAARD, deel: 3, h_bak: 3, t_vl: 0.15, t_w1: 0.15, t_w2: 0.15, t_w3: 0.15, t_w4: 0.15, n_last: 0,
    Q_v: 0, P_e: 0, F_w: 350, a_w: 3, φ_max: 15 };
  const got = doorreken(v);
  const r = deel3(v);
  meld(!r.kim && r.UC_max <= 1 && /kim komt boven water/.test(got.text), "Deel 3 — kim boven water: gemeld", `UC_max = ${r.UC_max}`);
  const s = slot(got);
  meld(s && s.onvolledig && !s.voldoet, "  de slotregel: niet volledig getoetst");
}
{
  const got = doorreken({ ...STANDAARD, deel: 3, φ_max: 0 });
  meld(/niet getoetst: invoer onvolledig/.test(got.text), "Deel 3 — φ_max = 0: invoer onvolledig");
}

// ── Beeld en blad ────────────────────────────────────────────────────────────
// De beginwaarden van het beeld zijn de standaardinvoer hier, elk invoerveld
// van het blad heeft een beginwaarde (op de lasten na die boven n_last vallen)
// en het beeld schrijft alleen naar velden die het blad kent.
{
  console.log("\nBeeld en blad");
  const hier = dirname(fileURLToPath(import.meta.url));
  const pad = join(hier, "../packages/desktop/src/components/calc/OpdrijvenDesigner.tsx");
  const velden = new Set([...tpl.matchAll(/^\s*([\p{L}_][\p{L}\p{N}_,]*)\s*=\s*\?/gmu)].map((m) => m[1].replace(/,/g, "_")));
  for (const m of tpl.matchAll(/^\s*@select\s+(\S+)/gm)) velden.add(m[1]);
  const zonder = [...velden].filter((k) => !(k in STANDAARD) && !/^[Fxyz]_(\d+)$/.test(k));
  const lastZonder = [...velden].filter((k) => /^[Fxyz]_(\d+)$/.test(k) && Number(k.split("_")[1]) <= STANDAARD.n_last && !(k in STANDAARD));
  meld(zonder.length === 0 && lastZonder.length === 0, "elk invoerveld van het blad heeft een beginwaarde", [...zonder, ...lastZonder].join(", "));
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
    meld(false, "het beeld OpdrijvenDesigner.tsx bestaat");
  }
}

afronden(fouten, "Opdrijven en drijvend lichaam");
