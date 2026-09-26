/**
 * Controlescript voor de module Lasberekening (NEN-EN 1993-1-8 §4.5, §4.7 en
 * §4.11 met NB).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script rekent de
 * uitkomsten daarom op twee manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript van alle drie lasfiguren
 *      (dubbele hoeklas langs een plaat, rondgaande hoeklas om L × b, stompe
 *      las volledig doorgelast), beide toetsmethoden van de hoeklas en de
 *      reductie voor lange verbindingen. De hoeklassen worden daarin per
 *      hoekpunt en per las uitgerekend, met de ontbinding naar het keelvlak
 *      onder 45° en alle vier de tekencombinaties van de dwarsbelasting; het
 *      blad neemt de bovengrens met opgetelde absolute waarden. Beide moeten
 *      hetzelfde getal geven.
 *   2. Voor een aantal sets de getallen van een handberekening, waaronder de
 *      beginwaarden van een nieuw blad (DEFAULTS uit LasDesigner.tsx) en
 *      grensgevallen: UC net boven en net onder 1,0, l_eff precies op
 *      max(30 mm; 6a) en a precies op 3 mm.
 *
 * Het oordeel wordt gelezen zoals de rapportkop dat doet (bladResultaat.ts):
 * de slotzin vanaf "Maatgevende UC".
 *
 * Daarnaast: elke invoer van het blad heeft een beginwaarde in het beeld, en
 * omgekeerd.
 *
 * Draaien:  node scripts/check-las.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const hier = dirname(fileURLToPath(import.meta.url));
const tpl = laadTemplate("lasberekening.ts");
const beeld = readFileSync(join(hier, "../packages/desktop/src/components/calc/LasDesigner.tsx"), "utf8");

/** De beginwaarden van een nieuw blad, zoals het beeld ze zaait. */
const DEFAULTS = Object.fromEntries(
  [...beeld.match(/const DEFAULTS[^{]*\{([\s\S]*?)\};/)[1].matchAll(/(\w+):\s*(-?[\d.]+)/g)].map((m) => [m[1], Number(m[2])]),
);

// ── Onafhankelijke uitwerking; eenheden N en mm ─────────────────────────────
const FU = { 40: { 235: 360, 275: 430, 355: 490 }, 80: { 235: 360, 275: 410, 355: 470 } };
const BW = { 235: 0.8, 275: 0.85, 355: 0.9 };

/**
 * Hoeklas in één punt: σ_x (loodrecht op het aansluitvlak), q (dwars op de
 * las) en p (langs de las), met teken. Het keelvlak ligt onder 45°; aan de ene
 * kant van het deel is σ⊥ = (σ_x − q)/√2 en τ⊥ = (σ_x + q)/√2, aan de andere
 * kant andersom. Geeft (4.1) en |σ⊥| voor de las aan kant `zijde` (±1).
 */
function keelvlak(sx, q, p, zijde) {
  const sPerp = (sx - zijde * q) / Math.SQRT2;
  const tPerp = (sx + zijde * q) / Math.SQRT2;
  return { vm: Math.sqrt(sPerp ** 2 + 3 * (tPerp ** 2 + p ** 2)), sPerp: Math.abs(sPerp) };
}

function uitwerking(v) {
  const uit = { fout: 0 };
  const Fx = Math.abs(v.F_xEd) * 1e3, Fy = Math.abs(v.F_yEd) * 1e3, Fz = Math.abs(v.F_zEd) * 1e3;
  const Mx = Math.abs(v.M_xEd) * 1e6, My = Math.abs(v.M_yEd) * 1e6, Mz = Math.abs(v.M_zEd) * 1e6;
  uit.belast = Fx + Fy + Fz + Mx + My + Mz > 0;
  const tk = v.typelas !== 3 && v.t_plaat > 40 ? 80 : v.dikte;
  const fu = FU[tk][v.staalsoort], bw = BW[v.staalsoort], gM2 = 1.25;

  if (v.typelas === 2) {
    if (v.t_plaat <= 0 || v.t_plaat > 80 || v.L_las < v.t_plaat) return { ...uit, fout: 3 };
    const L = v.L_las, t = v.t_plaat;
    // §4.7.1: het zwakste verbonden deel; bij één staalsoort het dikste (tabel 3.1).
    const fyd = tk === 80 ? v.staalsoort - 20 : v.staalsoort;
    const A = L * t, Wy = (t * L * L) / 6, Wz = (L * t * t) / 6, Wt = ((L * t * t) / 3) * (1 - (0.63 * t) / L);
    const sEd = Fx / A + My / Wy + Mz / Wz;
    const tEd = (1.5 * Math.hypot(Fy, Fz)) / A + Mx / Wt;
    uit.UC_s = Math.sqrt(sEd ** 2 + 3 * tEd ** 2) / fyd;
    uit.UC_max = uit.UC_s;
    Object.assign(uit, { f_y: fyd, A_p: A, σ_Ed: sEd, τ_Ed: tEd });
    return uit;
  }

  const a = v.a_las, L = v.L_las;
  if (v.typelas === 1 && (v.t_plaat <= 0 || v.t_plaat > 80)) uit.fout = 3;
  if (v.typelas === 3 && v.b_las <= 0) uit.fout = 3;
  if (a < 3) uit.fout = 1;
  const lmin = Math.max(30, 6 * a);
  let Lw, s, nb;
  if (v.typelas === 1) {
    Lw = L - 2 * a; s = v.t_plaat; nb = 0;
    if (Lw < lmin) uit.fout = 2;
  } else {
    Lw = L; s = v.b_las; nb = v.b_las >= lmin ? 1 : 0;
    if (L < lmin) uit.fout = 2;
  }
  const bLw = v.langeverb === 1 ? Math.min(1, 1.2 - (0.2 * L) / (150 * a))
    : v.langeverb === 2 ? Math.min(1, Math.max(0.6, 1.1 - L / 17000)) : 1;
  if (bLw <= 0) uit.fout = 4;
  Object.assign(uit, { f_u: fu, l_min: lmin, β_Lw: bLw, lang: v.langeverb !== 0 });
  if (v.typelas === 1) uit.l_eff = Lw;
  if (uit.fout) return uit;

  // Lijnen in het aansluitvlak, geconcentreerd in de laswortel: twee over
  // Lw op y = ±s/2 (langs z) en, bij nb = 1, twee over s op z = ±Lw/2 (langs y).
  const Aw = 2 * a * (Lw + nb * s);
  const Iy = (2 * a * Lw ** 3) / 12 + nb * 2 * a * s * (Lw / 2) ** 2;      // spanning verloopt met z
  const Iz = nb * (2 * a * s ** 3) / 12 + 2 * a * Lw * (s / 2) ** 2;       // spanning verloopt met y
  const Ip = Iy + Iz;
  Object.assign(uit, { A_w: Aw, W_y: Iy / (Lw / 2), W_z: Iz / (s / 2), I_p: Ip });

  // Alle hoekpunten, alle tekens van de belasting, beide lassen per hoekpunt.
  const TEKENS = [-1, 1];
  let vm = 0, sPerpMax = 0, res = 0, vmB = 0, sx0 = 0, ty0 = 0, tz0 = 0;
  for (const sFx of TEKENS) for (const sFy of TEKENS) for (const sFz of TEKENS)
    for (const sMx of TEKENS) for (const sMy of TEKENS) for (const sMz of TEKENS)
      for (const yc of [-s / 2, s / 2]) for (const zc of [-Lw / 2, Lw / 2]) {
        // Beam-theorie in het aansluitvlak: σ_x = N/A + M_y·z/I_y − M_z·y/I_z;
        // wringing M_x geeft τ_y = −M_x·z/I_p en τ_z = M_x·y/I_p.
        const sx = (sFx * Fx) / Aw + (sMy * My * zc) / Iy - (sMz * Mz * yc) / Iz;
        const ty = (sFy * Fy) / Aw - (sMx * Mx * zc) / Ip;
        const tz = (sFz * Fz) / Aw + (sMx * Mx * yc) / Ip;
        if (Math.abs(sx) > sx0) sx0 = Math.abs(sx);
        ty0 = Math.max(ty0, Math.abs(ty)); tz0 = Math.max(tz0, Math.abs(tz));
        res = Math.max(res, a * Math.hypot(sx, ty, tz));
        // Las over L (langs z) aan kant sign(yc): dwars is y, langs is z.
        const k = keelvlak(sx, ty, tz, Math.sign(yc));
        vm = Math.max(vm, k.vm); sPerpMax = Math.max(sPerpMax, k.sPerp);
        if (nb) {
          // Las over b (langs y) aan kant sign(zc): dwars is z, langs is y.
          const kb = keelvlak(sx, tz, ty, Math.sign(zc));
          vmB = Math.max(vmB, kb.vm); sPerpMax = Math.max(sPerpMax, kb.sPerp);
        }
      }
  Object.assign(uit, { σ_x: sx0, τ_y: ty0, τ_z: tz0 });
  if (v.methode === 1) {
    uit.UC_41 = vm / ((bLw * fu) / (bw * gM2));
    if (nb) uit.UC_41_b = vmB / ((bLw * fu) / (bw * gM2));
    uit.UC_σ = sPerpMax / ((bLw * 0.9 * fu) / gM2);
    uit.UC_max = Math.max(uit.UC_41, uit.UC_41_b ?? 0, uit.UC_σ);
  } else {
    const fvwd = fu / (Math.sqrt(3) * bw * gM2);
    Object.assign(uit, { f_vw_d: fvwd, F_w_Rd: bLw * fvwd * a, F_w_Ed: res });
    uit.UC_w = res / (bLw * fvwd * a);
    uit.UC_max = uit.UC_w;
  }
  return uit;
}

const s4 = (x) => {
  if (x === 0) return "0";
  const dec = Math.max(0, 3 - Math.floor(Math.log10(Math.abs(x))));
  return x.toFixed(dec);
};
const ruim = (x) => ({ waarde: s4(x), tol: Math.max(Math.abs(x) * 0.002, 1e-6) });

/** Wat de uitwerking zegt en het blad als getal toont. */
function verwachtingen(r) {
  const uit = {};
  for (const k of ["l_min", "l_eff", "β_Lw", "A_w", "W_y", "W_z", "I_p", "σ_x", "τ_y", "τ_z", "UC_41", "UC_41_b", "UC_σ",
    "f_vw_d", "F_w_Rd", "F_w_Ed", "UC_w", "A_p", "σ_Ed", "τ_Ed", "UC_s"]) {
    if (r[k] === undefined) continue;
    if (k === "β_Lw" && !r.lang) continue;           // zonder lange verbinding staat β_Lw = 1 verborgen
    uit[k] = ruim(r[k]);
  }
  return uit;
}

const SETS = [
  {
    naam: "1 — beginwaarden van een nieuw blad: consoleplaat t_p = 10, L = 200, a = 6, S235",
    invoer: {},
    // Met de hand, richtingsmethode (4.1). f_u = 360 N/mm² (tabel 3.1), β_w = 0,8
    // (tabel 4.1), γ_M2 = 1,25 → f_u/(β_w·γ_M2) = 360 N/mm²; 0,9·f_u/γ_M2 = 259,2 N/mm².
    // l_eff = 200 − 2·6 = 188 mm ≥ l_min = max(30; 6·6) = 36 mm.
    // A_w = 2·6·188 = 2256 mm²; W_y = 6·188²/3 = 70 688 mm³.
    // σ_x = 20 000/2256 + 10·10⁶/70 688 = 8,87 + 141,47 = 150,33 N/mm²;
    // τ_y = 0; τ_z = 100 000/2256 = 44,33 N/mm².
    // σ⊥ = τ⊥ = 150,33/√2 = 106,30 N/mm²; τ∥ = 44,33 N/mm².
    // √(106,30² + 3·(106,30² + 44,33²)) = √51 094 = 226,04 N/mm² → UC = 226,04/360 = 0,628.
    // Tweede voorwaarde: σ⊥ = 106,30 ≤ 259,2 → UC = 0,410. Maatgevend 0,628: voldoet.
    handwerk: { l_eff: "188", l_min: "36", A_w: "2256", W_y: "70688", σ_x: "150.3", τ_z: "44.33",
      σ_perp: "106.3", τ_perp: "106.3", τ_par: "44.33", UC_41: "0.628", UC_σ: "0.410" },
    oordeel: "voldoet",
  },
  {
    naam: "2 — grensgeval: zuivere kracht langs de las 469 kN, vereenvoudigde methode",
    invoer: { methode: 2, F_xEd: 0, M_yEd: 0, F_zEd: 469 },
    // Met de hand: f_vw,d = 360/(√3·0,8·1,25) = 207,85 N/mm² (4.4); F_w,Rd = 207,85·6
    // = 1247,1 N/mm (4.3); F_w,Ed = 469 000/(2·188) = 1247,3 N/mm → UC = 1,0002 > 1,0.
    // Dat is precies de draagkracht 2·188·1247,1 = 468,9 kN: net niet.
    handwerk: { f_vw_d: "207.8", F_w_Rd: "1247", F_w_Ed: "1247", UC_w: "1.000" },
    oordeel: "voldoet niet",
  },
  {
    naam: "3 — grensgeval: dezelfde las met 468 kN",
    invoer: { methode: 2, F_xEd: 0, M_yEd: 0, F_zEd: 468 },
    // 468 000/376 = 1244,7 N/mm → UC = 0,998.
    handwerk: { UC_w: "0.998" },
    oordeel: "voldoet",
  },
  {
    naam: "4 — zuivere kracht langs de las, richtingsmethode: gelijk aan de vereenvoudigde",
    invoer: { F_xEd: 0, M_yEd: 0, F_zEd: 469 },
    // Alleen τ∥: √3·τ∥ ≤ f_u/(β_w·γ_M2) is dezelfde eis als (4.3)/(4.4). UC_41 = 1,0002.
    handwerk: { τ_par: "207.9", σ_perp: "0", UC_41: "1.000" },
    oordeel: "voldoet niet",
  },
  {
    naam: "5 — zuivere normaalkracht 300 kN: richtingsmethode",
    invoer: { F_xEd: 300, F_zEd: 0, M_yEd: 0 },
    // σ_x = 300 000/2256 = 132,98 N/mm²; σ⊥ = τ⊥ = 94,03 → √(4·94,03²) = 188,06 N/mm²
    // → UC = 0,522.
    handwerk: { σ_x: "133.0", UC_41: "0.522" },
    oordeel: "voldoet",
  },
  {
    naam: "6 — dezelfde normaalkracht, vereenvoudigde methode: factor √1,5 zwaarder",
    invoer: { methode: 2, F_xEd: 300, F_zEd: 0, M_yEd: 0 },
    // F_w,Ed = 6·132,98 = 797,9 N/mm → UC = 797,9/1247,1 = 0,640 = 0,522·√1,5.
    handwerk: { F_w_Ed: "797.9", UC_w: "0.640" },
    oordeel: "voldoet",
  },
  {
    naam: "7 — moment om de lasas M_z = 1 kNm en dwarskracht F_y = 40 kN",
    invoer: { F_xEd: 0, F_zEd: 0, M_yEd: 0, M_zEd: 1, F_yEd: 40 },
    // Koppel over de laswortels: W_z = 6·188·10 = 11 280 mm³ → σ_x = 10⁶/11 280 = 88,65 N/mm².
    // τ_y = 40 000/2256 = 17,73 N/mm². Maatgevende las: τ⊥ = (88,65 + 17,73)/√2 = 75,22,
    // σ⊥ = (88,65 − 17,73)/√2 = 50,15 → √(50,15² + 3·75,22²) = 139,6 → UC = 0,388.
    // Tweede voorwaarde: σ⊥ van de andere las = 75,22 → UC = 75,22/259,2 = 0,290.
    handwerk: { W_z: "11280", σ_x: "88.65", τ_y: "17.73", τ_perp: "75.22", σ_perp: "50.15", UC_41: "0.388", UC_σ: "0.290" },
    oordeel: "voldoet",
  },
  {
    naam: "8 — wringing M_x = 2 kNm in het aansluitvlak",
    invoer: { F_xEd: 0, F_zEd: 0, M_yEd: 0, M_xEd: 2 },
    // I_p = 6·188·(188² + 3·10²)/6 = 6 701 000 mm⁴ (≈ 2·a·l³/12 + 2·a·l·(t/2)²).
    // τ_y = 2·10⁶·94/6,701·10⁶ = 28,06 N/mm²; τ_z = 2·10⁶·5/6,701·10⁶ = 1,49 N/mm².
    handwerk: { I_p: "6701000", τ_y: "28.06", τ_z: "1.492" },
    oordeel: "voldoet",
  },
  {
    naam: "9 — rondgaande hoeklas om 200 × 120, a = 5, alle zes componenten",
    invoer: { typelas: 3, a_las: 5, F_xEd: 50, F_yEd: 30, F_zEd: 40, M_xEd: 3, M_yEd: 8, M_zEd: 4 },
    // A_w = 2·5·(200 + 120) = 3200 mm²; W_y = 5·200·(200/3 + 120) = 186 667 mm³;
    // W_z = 5·120·(200 + 120/3) = 144 000 mm³; I_p = 5·320³/6 = 27,31·10⁶ mm⁴.
    // σ_x = 15,63 + 42,86 + 27,78 = 86,26; τ_y = 9,38 + 3·10⁶·100/I_p = 20,36;
    // τ_z = 12,50 + 3·10⁶·60/I_p = 19,09 N/mm².
    // Lassen over L: σ⊥ = 46,60, τ⊥ = 75,39, τ∥ = 19,09 → UC = 142,5/360 = 0,396.
    // Lassen over b: σ⊥ = 47,50, τ⊥ = 74,49, τ∥ = 20,36 → UC = 0,394.
    handwerk: { A_w: "3200", W_y: "186700", W_z: "144000", I_p: "27310000", σ_x: "86.26", τ_y: "20.36", τ_z: "19.09",
      UC_41: "0.396", UC_41_b: "0.394", UC_σ: "0.291" },
    oordeel: "voldoet",
  },
  {
    naam: "10 — rondgaande hoeklas om een plaat 200 × 10: de lassen over b dragen niet",
    invoer: { typelas: 3, b_las: 10 },
    // b = 10 < l_min = 36 mm (§4.5.1(2)): alleen twee lassen van 200 mm op 10 mm.
    // A_w = 2400 mm²; W_y = 6·200²/3 = 80 000 mm³; σ_x = 20 000/2400 + 10⁷/80 000 = 133,3.
    handwerk: { A_w: "2400", W_y: "80000", σ_x: "133.3" },
    melding: /de lassen over b dragen niet mee/,
    oordeel: "voldoet",
  },
  {
    naam: "11 — stompe las, volledig doorgelast: plaat 200 × 10 met F_x = 300 kN en M_y = 5 kNm",
    invoer: { typelas: 2, F_xEd: 300, F_zEd: 0, M_yEd: 5 },
    // σ = 300 000/2000 + 5·10⁶/(10·200²/6) = 150 + 75 = 225 N/mm² ≤ f_y = 235 → UC 0,957.
    handwerk: { A_p: "2000", σ_Ed: "225.0", UC_s: "0.957" },
    oordeel: "voldoet",
  },
  {
    naam: "12 — stompe las met dwarskracht en wringing, plaat 50 mm dik (f_y = 215)",
    invoer: { typelas: 2, t_plaat: 50, L_las: 300, F_xEd: 0, F_yEd: 200, F_zEd: 400, M_yEd: 0, M_xEd: 5 },
    // A = 15 000 mm²; W_t = 300·50²/3·(1 − 0,63·50/300) = 250 000·0,895 = 223 750 mm³.
    // τ = 1,5·√(200² + 400²)·10³/15 000 + 5·10⁶/223 750 = 44,72 + 22,35 = 67,07 N/mm²
    // → UC = √3·67,07/215 = 0,540.
    handwerk: { W_t: { waarde: "223750", tol: 50, waarom: "blad toont 4 cijfers" }, τ_Ed: "67.07", UC_s: "0.540" },
    oordeel: "voldoet",
  },
  {
    naam: "13 — overlapverbinding van 1500 mm: β_Lw,1 = 1,2 − 0,2·1500/900 = 0,867",
    invoer: { langeverb: 1, L_las: 1500, F_xEd: 0, M_yEd: 0, F_zEd: 1000 },
    handwerk: { β_Lw: "0.8667" },
    oordeel: "voldoet",
  },
  {
    naam: "13b — overlap korter dan 150a: L = 200 < 900 mm, β_Lw,1 = min(1; 1,156) = 1",
    invoer: { langeverb: 1 },
    handwerk: { β_Lw: "1.000", UC_41: "0.628" },
    oordeel: "voldoet",
  },
  {
    naam: "14 — dwarsverstijving van 2500 mm: β_Lw,2 = 1,1 − 2,5/17 = 0,953",
    invoer: { langeverb: 2, L_las: 2500, F_xEd: 0, M_yEd: 0, F_zEd: 1000 },
    handwerk: { β_Lw: "0.9529" },
    oordeel: "voldoet",
  },
  {
    naam: "15 — dwarsverstijving van 10 m: β_Lw,2 op de ondergrens 0,6",
    invoer: { langeverb: 2, L_las: 10000, F_xEd: 0, M_yEd: 0, F_zEd: 1000 },
    handwerk: { β_Lw: "0.600" },
    oordeel: "voldoet",
  },
  {
    naam: "16 — grensgeval l_eff = 6a: L = 48 mm, a = 6 → l_eff = 36 mm mag nog",
    invoer: { L_las: 48, F_xEd: 0, M_yEd: 0, F_zEd: 20 },
    handwerk: { l_eff: "36", A_w: "432" },
    oordeel: "voldoet",
  },
  {
    naam: "17 — grensgeval: L = 47 mm → l_eff = 35 mm < 36 mm, de las draagt niet",
    invoer: { L_las: 47, F_xEd: 0, M_yEd: 0, F_zEd: 20 },
    melding: /mag geen kracht overbrengen/,
    oordeel: "voldoet niet",
  },
  {
    naam: "18 — grensgeval a = 3 mm mag; a = 2,9 mm niet (§4.5.2(2))",
    invoer: { a_las: 3, F_xEd: 0, M_yEd: 0, F_zEd: 20 },
    handwerk: { l_min: "30", l_eff: "194" },
    oordeel: "voldoet",
  },
  {
    naam: "19 — a = 2,9 mm",
    invoer: { a_las: 2.9, F_xEd: 0, M_yEd: 0, F_zEd: 20 },
    melding: /te kleine keeldikte/,
    oordeel: "voldoet niet",
  },
  {
    naam: "20 — S355 met een dikste deel van 40 tot 80 mm: f_u = 470, β_w = 0,9",
    invoer: { staalsoort: 355, dikte: 80 },
    // f_u/(β_w·γ_M2) = 470/(0,9·1,25) = 417,8 → UC_41 = 226,04/417,8 = 0,541.
    handwerk: { UC_41: "0.541" },
    oordeel: "voldoet",
  },
  {
    naam: "21 — S275, plaat van 50 mm: f_u volgt de plaat, 410 N/mm²",
    invoer: { staalsoort: 275, t_plaat: 50 },
    oordeel: "voldoet",
  },
  {
    naam: "22 — S355, t ≤ 40 mm: f_u = 490 N/mm² volgens de NEN-uitgave van tabel 3.1",
    invoer: { staalsoort: 355 },
    // 490/(0,9·1,25) = 435,6 → UC_41 = 226,04/435,6 = 0,519.
    handwerk: { UC_41: "0.519" },
    oordeel: "voldoet",
  },
  {
    naam: "23 — overlap te lang voor (4.9): β_Lw,1 ≤ 0",
    invoer: { langeverb: 1, L_las: 6000 },
    melding: /te lang voor \(4\.9\)/,
    oordeel: "voldoet niet",
  },
  {
    naam: "24 — stompe las in een plaat van 90 mm: buiten tabel 3.1",
    invoer: { typelas: 2, t_plaat: 90 },
    melding: /buiten tabel 3\.1/,
    oordeel: "voldoet niet",
  },
  {
    naam: "25 — geen belasting: geen oordeel",
    invoer: { F_xEd: 0, F_zEd: 0, M_yEd: 0 },
    melding: /Geen belasting ingevoerd/,
    oordeel: null,
  },
  {
    naam: "26 — negatieve belasting geeft dezelfde UC als positieve",
    invoer: { F_xEd: -20, F_zEd: -100, M_yEd: -10 },
    handwerk: { UC_41: "0.628" },
    oordeel: "voldoet",
  },
  {
    naam: "27 — rondgaande hoeklas met b = 0: geen lasfiguur (W_z = 0 gaf een UC NaN)",
    invoer: { typelas: 3, b_las: 0 },
    melding: /Vul een breedte b &gt; 0 mm in|Vul een breedte b > 0 mm in/,
    geenMelding: /de lassen over b dragen niet mee/,
    oordeel: "voldoet niet",
  },
  {
    naam: "28 — rondgaande hoeklas met b < 0 en M_z: mag niet voldoen (een negatieve W_z verlaagde σ_x)",
    invoer: { typelas: 3, b_las: -50, M_zEd: 2 },
    melding: /Vul een breedte b &gt; 0 mm in|Vul een breedte b > 0 mm in/,
    oordeel: "voldoet niet",
  },
  {
    naam: "29 — rondgaande hoeklas 150 × 100, a = 4, S355, alle zes componenten, beide methoden",
    invoer: { typelas: 3, staalsoort: 355, L_las: 150, b_las: 100, a_las: 4,
      F_xEd: 100, F_yEd: 20, F_zEd: 0, M_xEd: 1.5, M_yEd: 6, M_zEd: 3 },
    // f_u/(β_w·γ_M2) = 490/(0,9·1,25) = 435,6 N/mm²; 0,9·f_u/γ_M2 = 352,8 N/mm².
    // A_w = 2·4·250 = 2000 mm²; W_y = 4·150·(50 + 100) = 90 000 mm³;
    // W_z = 4·100·(150 + 33,33) = 73 333 mm³; I_p = 4·250³/6 = 10,42·10⁶ mm⁴.
    // σ_x = 50 + 66,67 + 40,91 = 157,58; τ_y = 10 + 1,5·10⁶·75/I_p = 20,80;
    // τ_z = 1,5·10⁶·50/I_p = 7,20 N/mm².
    // Over L: σ⊥ = 136,78/√2 = 96,72, τ⊥ = 178,38/√2 = 126,13, τ∥ = 7,20 → √57 236 = 239,2 → UC 0,549.
    // Over b: σ⊥ = 150,38/√2 = 106,33, τ⊥ = 164,78/√2 = 116,51, τ∥ = 20,80 → 230,9 → UC 0,530.
    // σ⊥,max = 126,13/352,8 = 0,358.
    handwerk: { W_z: "73330", I_p: "10420000", σ_x: "157.6", τ_y: "20.80", τ_z: "7.200",
      σ_perp: "96.72", τ_perp: "126.1", UC_41: "0.549", UC_41_b: "0.530", UC_σ: "0.358" },
    oordeel: "voldoet",
  },
  {
    naam: "30 — dezelfde las, vereenvoudigde methode",
    invoer: { typelas: 3, staalsoort: 355, L_las: 150, b_las: 100, a_las: 4, methode: 2,
      F_xEd: 100, F_yEd: 20, F_zEd: 0, M_xEd: 1.5, M_yEd: 6, M_zEd: 3 },
    // f_vw,d = 490/(√3·0,9·1,25) = 251,5 N/mm²; F_w,Rd = 1006 N/mm;
    // F_w,Ed = 4·√(157,58² + 20,80² + 7,20²) = 636,4 N/mm → UC 0,633.
    handwerk: { f_vw_d: "251.5", F_w_Rd: "1006", F_w_Ed: "636.4", UC_w: "0.633" },
    oordeel: "voldoet",
  },
  {
    naam: "31 — stompe las S275, plaat 250 × 20, alle zes componenten; de keuzes van de hoeklas vervallen",
    invoer: { typelas: 2, staalsoort: 275, L_las: 250, t_plaat: 20,
      F_xEd: 400, F_yEd: 30, F_zEd: 150, M_xEd: 0.5, M_yEd: 12, M_zEd: 1 },
    // A = 5000 mm²; W_y = 20·250²/6 = 208 333; W_z = 250·20²/6 = 16 667;
    // W_t = 250·20²/3·(1 − 0,63·20/250) = 31 653 mm³.
    // σ = 80 + 57,6 + 60 = 197,6; τ = 1,5·√(30² + 150²)/5 + 0,5·10⁶/31 653 = 45,89 + 15,80 = 61,69 N/mm²
    // → √(197,6² + 3·61,69²) = 224,6 → UC = 224,6/275 = 0,817.
    handwerk: { W_t: { waarde: "31650", tol: 5, waarom: "blad toont 4 cijfers" }, σ_Ed: "197.6", τ_Ed: "61.69", UC_s: "0.817" },
    geenMelding: /Toets van de hoeklas|Lange verbinding/,
    oordeel: "voldoet",
  },
  {
    naam: "32 — stompe las: plaat 20 mm op een deel van 40 tot 80 mm, f_y van het dikste deel (§4.7.1)",
    invoer: { typelas: 2, staalsoort: 355, dikte: 80, L_las: 250, t_plaat: 20,
      F_xEd: 400, F_yEd: 30, F_zEd: 150, M_xEd: 0.5, M_yEd: 12, M_zEd: 1 },
    // Zelfde spanningen als set 31: √(197,6² + 3·61,69²) = 224,6 N/mm².
    // S355, dikste deel 40–80 mm: f_y = 335 → UC = 224,6/335 = 0,671 (met f_y = 355 was het 0,633).
    handwerk: { σ_Ed: "197.6", τ_Ed: "61.69", UC_s: "0.671" },
    melding: /t ≤ 80 mm/,
    oordeel: "voldoet",
  },
  {
    naam: "33 — keeldikte 0 met een overlapverbinding: alleen de melding over a, geen β_Lw = −∞",
    invoer: { a_las: 0, langeverb: 1 },
    melding: /te kleine keeldikte/,
    geenMelding: /te lang voor \(4\.9\)|∞/,
    oordeel: "voldoet niet",
  },
];

let fouten = 0;
for (const set of SETS) {
  const v = { ...DEFAULTS, ...set.invoer };
  const selectValues = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]));
  const got = reken(tpl, selectValues);
  const r = uitwerking(v);
  if (!r.fout && r.belast) fouten += toets(`${set.naam} — narekening`, got, verwachtingen(r));
  if (set.handwerk) fouten += toets(`${set.naam} — handberekening`, got, set.handwerk);

  // Het oordeel zoals de rapportkop het leest (bladResultaat.ts).
  const i = got.text.lastIndexOf("Maatgevende UC");
  const zin = i >= 0 ? got.text.slice(i, i + 240) : "";
  const ons = i < 0 ? null : !/voldoe[nt] niet/.test(zin) && /voldoe[nt]/.test(zin) ? "voldoet" : "voldoet niet";
  const narekening = !r.belast ? null : r.fout ? "voldoet niet" : r.UC_max <= 1 ? "voldoet" : "voldoet niet";
  const ok = ons === set.oordeel && narekening === set.oordeel;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    ons ${ons ?? "geen"}   narekening ${narekening ?? "geen"}   verwacht ${set.oordeel ?? "geen"}`);
  if (set.melding) {
    const gezien = set.melding.test(got.text);
    if (!gezien) fouten++;
    console.log(`  ${gezien ? "OK    " : "FOUT  "} melding    ${set.melding.source}`);
  }
  if (set.geenMelding) {
    const gezien = set.geenMelding.test(got.text);
    if (gezien) fouten++;
    console.log(`  ${gezien ? "FOUT  " : "OK    "} niet in blad ${set.geenMelding.source}`);
  }
}

// ── Beginwaarden van het beeld tegen de invoer van het blad ─────────────────
{
  console.log("\nBeginwaarden van het beeld tegen de invoer van het blad");
  const invoer = new Set([
    ...[...tpl.matchAll(/^\s*([^\s='#]+)\s*=\s*\?/gmu)].map((m) => m[1]),
    ...[...tpl.matchAll(/@select\s+(\w+)/g)].map((m) => m[1]),
  ]);
  const zonder = [...invoer].filter((k) => !(k in DEFAULTS));
  const over = Object.keys(DEFAULTS).filter((k) => !invoer.has(k));
  const ok = zonder.length === 0 && over.length === 0;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${invoer.size} invoervelden en keuzes` +
    (zonder.length ? `; zonder beginwaarde: ${zonder.join(", ")}` : "") +
    (over.length ? `; beginwaarde zonder invoer: ${over.join(", ")}` : ""));
}

afronden(fouten, "Lasberekening");
