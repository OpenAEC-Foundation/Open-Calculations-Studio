/**
 * Controlescript voor de module Ponsberekening (NEN-EN 1992-1-1 §6.4 met NB).
 *
 * Voor deze module bestaat geen referentieberekening. Dit script legt de
 * uitkomsten op vier manieren vast:
 *
 *   1. Twee voorbeelden, met de hand uitgewerkt (de berekening staat bij de
 *      set): de middenkolom met de beginwaarden van het beeld, en een
 *      randkolom met β volgens (6.44) en ponswapening met de detaillering van
 *      §9.4.3.
 *   2. Grensgevallen: u_1* met 1,5d in plaats van 0,5c, β uit (6.39), (6.42)
 *      en (6.43), k in (6.44) bij een randkolom die langs de rand breder is,
 *      een ronde randkolom als vierkant met dezelfde omtrek, een
 *      excentriciteit naar de rand (niet getoetst), een nuttige hoogte ≤ 0,
 *      ontbrekende of onvolledige ponswapening, α onder 45°, ponswapening in
 *      een plaat dunner dan 200 mm, een negatieve V_Ed en ρ_l begrensd op 0,02.
 *   3. Dezelfde invoer als het normblad ec2Pons (en1992.ts) met β volgens
 *      figuur 6.21N moet dezelfde omtrekken, spanningen en UC's geven.
 *   4. Een onafhankelijke uitwerking in JavaScript over een raster van keuzes
 *      (vorm, plaats, β, ponswapening, belasting). Die rekent anders dan het
 *      blad: de omtrek als functie van de afstand tot de kolom, W_1 door de
 *      omtrek numeriek te integreren, u_1* door de rechte stukken langs de rand
 *      in te korten en u_out,ef door de omtrekfunctie terug te zoeken. Per set
 *      ook het oordeel van de slotzin, zoals de rapportkop het leest, en geen
 *      NaN of foutmelding.
 *
 * Daarnaast: de beginwaarden (DEFAULTS) van het beeld en de invoer van het
 * blad zijn dezelfde namen, zodat het beeld elk invoerveld vult.
 *
 * Draaien:  node scripts/check-pons.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const hier = dirname(fileURLToPath(import.meta.url));
const tpl = laadTemplate("ponsberekening.ts");

// ── De beginwaarden van het beeld ────────────────────────────────────────────
const beeldBron = readFileSync(join(hier, "../packages/desktop/src/components/calc/PonsDesigner.tsx"), "utf8");
const DEFAULTS = Object.fromEntries(
  [...beeldBron.match(/const DEFAULTS[^=]*=\s*\{([\s\S]*?)\};/)[1].matchAll(/(\w+):\s*(-?[\d.]+)/g)].map((m) => [m[1], m[2]]),
);

let fouten = 0;

{
  console.log("Invoer van het blad tegen de beginwaarden van het beeld");
  const invoer = new Set([
    ...[...tpl.matchAll(/^\s*([^\s='#]+)\s*=\s*\?/gmu)].map((m) => m[1]),
    ...[...tpl.matchAll(/@select\s+(\S+)/g)].map((m) => m[1]),
  ]);
  const beeld = new Set(Object.keys(DEFAULTS));
  const zonderBeeld = [...invoer].filter((k) => !beeld.has(k));
  const zonderBlad = [...beeld].filter((k) => !invoer.has(k));
  const ok = zonderBeeld.length === 0 && zonderBlad.length === 0;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${invoer.size} invoervelden in het blad, ${beeld.size} beginwaarden in het beeld` +
    (zonderBeeld.length ? `; zonder beginwaarde: ${zonderBeeld.join(", ")}` : "") +
    (zonderBlad.length ? `; niet in het blad: ${zonderBlad.join(", ")}` : ""));
}

// ── Onafhankelijke uitwerking; eenheden N en mm ─────────────────────────────

/** Tabel 6.1, lineair geïnterpoleerd. */
function kTabel(r) {
  const pt = [[0.5, 0.45], [1, 0.6], [2, 0.7], [3, 0.8]];
  if (r <= pt[0][0]) return pt[0][1];
  for (let i = 1; i < pt.length; i++) {
    if (r <= pt[i][0]) return pt[i - 1][1] + ((pt[i][1] - pt[i - 1][1]) * (r - pt[i - 1][0])) / (pt[i][0] - pt[i - 1][0]);
  }
  return pt[pt.length - 1][1];
}

/**
 * W_1 = ∫|x| dl langs een omtrek van rechte stukken en bogen, numeriek. De as
 * x = 0 ligt door het hart van de kolom; x wijst in de richting van de
 * excentriciteit.
 */
function W1(stukken) {
  let som = 0;
  for (const st of stukken) {
    const n = 4000;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      if (st.lijn) {
        const [x0, y0, x1, y1] = st.lijn;
        som += Math.abs(x0 + (x1 - x0) * t) * Math.hypot(x1 - x0, y1 - y0) / n;
      } else {
        const { mx, my, r, van, tot } = st.boog;
        const phi = van + (tot - van) * t;
        som += Math.abs(mx + r * Math.cos(phi)) * r * Math.abs(tot - van) / n;
        void my;
      }
    }
  }
  return som;
}

/** Volledige omtrek op 2d rond een rechthoekige middenkolom; x langs a, y langs b. */
function omtrekMidden(a, b, d) {
  const r = 2 * d, hx = a / 2, hy = b / 2, q = Math.PI / 2;
  return [
    { lijn: [-hx, hy + r, hx, hy + r] }, { lijn: [-hx, -hy - r, hx, -hy - r] },
    { lijn: [hx + r, -hy, hx + r, hy] }, { lijn: [-hx - r, -hy, -hx - r, hy] },
    { boog: { mx: hx, my: hy, r, van: 0, tot: q } }, { boog: { mx: -hx, my: hy, r, van: q, tot: 2 * q } },
    { boog: { mx: -hx, my: -hy, r, van: 2 * q, tot: 3 * q } }, { boog: { mx: hx, my: -hy, r, van: 3 * q, tot: 4 * q } },
  ];
}

/**
 * Omtrek van figuur 6.15a rond een randkolom, met x evenwijdig aan de rand
 * (langs c_2): de as loodrecht op de rand gaat door het hart van de kolom.
 * De rand ligt op y = 0, de kolom op 0 ≤ y ≤ c_1.
 */
function omtrekRand(c1, c2, d) {
  const r = 2 * d, hx = c2 / 2, q = Math.PI / 2;
  return [
    { lijn: [-hx - r, 0, -hx - r, c1] }, { lijn: [hx + r, 0, hx + r, c1] },
    { lijn: [-hx, c1 + r, hx, c1 + r] },
    { boog: { mx: hx, my: c1, r, van: 0, tot: q } }, { boog: { mx: -hx, my: c1, r, van: q, tot: 2 * q } },
  ];
}

function uitwerking(w) {
  const n = (k) => Number(w[k]);
  const vorm = n("vorm"), plaats = n("plaats"), bk = n("beta_keuze"), ponswap = n("ponswap");
  const h = n("h_plaat"), cd = n("c_dek"), fy = n("d_wapy"), fz = n("d_wapz");
  const [dy, dz] = n("eerstelaag") === 1
    ? [h - cd - fy / 2, h - cd - fy - fz / 2]
    : [h - cd - fz - fy / 2, h - cd - fz / 2];
  const r = { d_y: dy, d_z: dz };
  if (Math.min(dy, dz) <= 0) return { r, oordeel: "voldoet niet", geenUC: true };
  const d = (dy + dz) / 2;
  const rly = (Math.PI * fy ** 2) / 4 / (n("s_wapy") * dy), rlz = (Math.PI * fz ** 2) / 4 / (n("s_wapz") * dz);
  Object.assign(r, { d_eff: d, ρ_ly: rly, ρ_lz: rlz, ρ_l: Math.min(Math.sqrt(rly * rlz), 0.02) });

  // Een ronde rand- of hoekkolom als vierkant met dezelfde omtrek.
  let c1 = n("c_1"), c2 = vorm === 1 ? n("c_2") : c1;
  if (vorm === 2 && plaats > 1) { c1 = c2 = (Math.PI * n("c_1")) / 4; r.c_k = c1; }
  const rond = vorm === 2 && plaats === 1;

  // De omtrek als functie van de afstand a tot de kolomrand.
  const uA = (a) => rond ? Math.PI * n("c_1") + 2 * Math.PI * a
    : plaats === 1 ? 2 * (c1 + c2) + 2 * Math.PI * a
    : plaats === 2 ? 2 * c1 + c2 + Math.PI * a
    : c1 + c2 + (Math.PI / 2) * a;
  const u1 = uA(2 * d);
  const u0 = rond ? Math.PI * c1 : plaats === 1 ? 2 * (c1 + c2)
    : plaats === 2 ? Math.min(c2 + 3 * d, c2 + 2 * c1) : Math.min(3 * d, c1 + c2);
  Object.assign(r, { u_0: u0, u_1: u1 });

  // β
  let beta, ongeldig = false;
  const ey = n("e_y"), ez = n("e_z");
  if (bk === 2) beta = { 1: 1.15, 2: 1.4, 3: 1.5 }[plaats];
  else if (bk === 1) beta = Math.max(n("beta_hand"), 1);
  else if (plaats === 1) {
    if (rond) beta = 1 + (0.6 * Math.PI * Math.hypot(ey, ez)) / (c1 + 4 * d);
    else if (ey !== 0 && ez !== 0) beta = 1 + 1.8 * Math.hypot(ey / (c2 + 4 * d), ez / (c1 + 4 * d));
    else if (ez !== 0) beta = 1 + (kTabel(c2 / c1) * Math.abs(ez) * u1) / W1(omtrekMidden(c2, c1, d));
    else beta = 1 + (kTabel(c1 / c2) * Math.abs(ey) * u1) / W1(omtrekMidden(c1, c2, d));
  } else if (ey < 0 || (plaats === 3 && ez < 0)) {
    ongeldig = true;
  } else {
    // u_1* (figuur 6.20): de rechte stukken naar de rand ingekort tot min(0,5c; 1,5d).
    const u1r = plaats === 2
      ? u1 - 2 * (c1 - Math.min(c1 / 2, 1.5 * d))
      : u1 - (c1 - Math.min(c1 / 2, 1.5 * d)) - (c2 - Math.min(c2 / 2, 1.5 * d));
    r.u_1_red = u1r;
    beta = u1 / u1r;
    // (6.44): tabel 6.1 met c_1/(2c_2) in de maten van figuur 6.20 of van tabel 6.1; de grootste telt.
    if (plaats === 2 && ez !== 0) beta += (kTabel(Math.max(c1 / (2 * c2), c2 / (2 * c1))) * Math.abs(ez) * u1) / W1(omtrekRand(c1, c2, d));
  }
  if (ongeldig) return { r, oordeel: "niet getoetst", geenUC: true };
  r.β = beta;

  const fck = n("betonklasse"), V = Math.abs(n("V_Ed")) * 1e3;
  const k = Math.min(1 + Math.sqrt(200 / d), 2);
  const vmin = 0.035 * k ** 1.5 * Math.sqrt(fck);
  const vRdc = Math.max(0.12 * k * (100 * r.ρ_l * fck) ** (1 / 3), vmin);
  const vEd = (beta * V) / (u1 * d), vEd0 = (beta * V) / (u0 * d);
  const vRdmax = 0.4 * 0.6 * (1 - fck / 250) * (fck / 1.5);
  Object.assign(r, { k, v_min: vmin, v_Rd_c: vRdc, v_Ed: vEd, UC_pons: vEd / vRdc, v_Ed_0: vEd0, v_Rd_max: vRdmax, UC_vRd_max: vEd0 / vRdmax });

  let UCw = r.UC_pons;
  if (r.UC_pons > 1) {
    const fywdef = Math.min(250 + 0.25 * d, 500 / 1.15);
    r.f_ywd_ef = fywdef;
    if (ponswap === 0) {
      r.A_sw_nodig = ((vEd - 0.75 * vRdc) * u1 * 0.75 * d) / (1.5 * fywdef);
    } else {
      const nsw = n("n_sw"), nom = n("n_om"), sr = n("s_r"), dsw = n("d_sw"), a1 = n("a_sw"), alfa = n("hoek_pons");
      if (nsw < 1 || nom < 1 || sr <= 0 || dsw <= 0 || a1 <= 0 || alfa < 45 || alfa > 90) {
        return { r, oordeel: "niet getoetst", geenUC: true };
      }
      const sa = Math.sin((alfa * Math.PI) / 180), ca = Math.cos((alfa * Math.PI) / 180);
      const Asw = (nsw * Math.PI * dsw ** 2) / 4;
      const vRdcs = 0.75 * vRdc + (1.5 * (d / sr) * Asw * fywdef * sa) / (u1 * d);
      const uout = (beta * V) / (vRdc * d);
      // u_out,ef terugzoeken op de omtrekfunctie.
      let lo = 0, hi = 1e6;
      for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (uA(m) < uout) lo = m; else hi = m; }
      const aOut = lo, an = a1 + (nom - 1) * sr, st = u1 / nsw;
      Object.assign(r, {
        A_sw: Asw, v_Rd_s: vRdcs - 0.75 * vRdc, v_Rd_cs: vRdcs, UC_cs: vEd / vRdcs, u_out_ef: uout, a_out: aOut, a_n: an,
        UC_uit: (aOut - 1.5 * d) / an, UC_n: 2 / nom, UC_sr: sr / (0.75 * d), UC_a: a1 / (0.5 * d), UC_h: 200 / h,
        s_t: st, UC_st: st / (1.5 * d),
      });
      r.UC_st_uit = 0;
      if (an > 2 * d) { r.s_t_uit = uA(an) / nsw; r.UC_st_uit = r.s_t_uit / (2 * d); }
      // (9.11) per staaf met de grootste tangentiële afstand van de omtrekken:
      // binnen 2d ten hoogste die op u_1, daarbuiten die op de buitenste omtrek.
      r.A_sw_min = ((0.08 * Math.sqrt(fck)) / 500) * sr * Math.max(st, r.s_t_uit ?? 0) / (1.5 * sa + ca);
      r.UC_min = r.A_sw_min / ((Math.PI * dsw ** 2) / 4);
      UCw = Math.max(r.UC_cs, r.UC_uit, r.UC_n, r.UC_sr, r.UC_a, r.UC_h, r.UC_st, r.UC_st_uit, r.UC_min);
    }
  }
  r.UC_max = Math.max(UCw, r.UC_vRd_max);
  return { r, oordeel: r.UC_max <= 1 ? "voldoet" : "voldoet niet" };
}

/** Het oordeel van de slotzin, zoals bladResultaat.leesResultaat het leest. */
function slotzin(got) {
  const i = got.text.lastIndexOf("Maatgevende UC");
  if (i < 0) return "(geen slotzin)";
  const zin = got.text.slice(i, i + 240);
  if (/niet getoetst/.test(zin)) return "niet getoetst";
  return !/voldoe[nt] niet/.test(zin) && /voldoe[nt]/.test(zin) ? "voldoet" : "voldoet niet";
}

/** Het blad drukt vier significante cijfers af: de narekening moet daarbinnen vallen. */
function vierCijfers(naam, got, r) {
  const verwacht = {};
  for (const [k, x] of Object.entries(r)) {
    if (!Number.isFinite(x) || got.values[k] === undefined && k === "UC_st_uit" && x === 0) continue;
    const tol = x === 0 ? 1e-9 : 0.51 * 10 ** (Math.floor(Math.log10(Math.abs(x))) - 3);
    verwacht[k] = { waarde: String(x), tol };
  }
  return toets(naam, got, verwacht);
}

const blad = (invoer) => reken(tpl, { ...DEFAULTS, ...invoer }, {});

function oordeel(naam, got, wil) {
  const ons = slotzin(got);
  const ok = ons === wil;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} slotzin    ${ons}   verwacht ${wil}`);
}

function geenUC(got) {
  const ok = got.values.UC_max === undefined;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} UC_max     ${ok ? "niet in het blad, dus geen UC in de rapportkop" : `staat er toch: ${got.values.UC_max}`}`);
}

function schoon(got) {
  const m = got.text.match(/\bNaN\b|Infinity|Error|Undefined symbol|Unexpected type/);
  if (m) {
    fouten++;
    console.log(`  FOUT   "${m[0]}" in de uitwerking`);
  }
}

// ── 1. Handberekeningen ──────────────────────────────────────────────────────
const HAND = [
  {
    naam: "Voorbeeld 1 — de beginwaarden van het beeld: middenkolom 300×300, h = 200, C45/55, Ø10-250 beide richtingen, V_Ed = 250 kN, β figuur 6.21N",
    invoer: {},
    // d_y = 200 − 25 − 10/2 = 170 · d_z = 200 − 25 − 10 − 10/2 = 160 · d = 165 (6.32)
    // A_s = π·10²/4 = 78,54 mm² · ρ_ly = 78,54/(250·170) = 0,001848 · ρ_lz = 78,54/(250·160) = 0,001963
    // ρ_l = √(0,001848·0,001963) = 0,001905
    // u_1 = 2·(300 + 300) + 4π·165 = 1200 + 2073,5 = 3273 mm · u_0 = 2·600 = 1200 mm · β = 1,15
    // v_Ed = 1,15·250 000/(3273,5·165) = 0,5323 N/mm²
    // k = 1 + √(200/165) = 2,101 → 2 · (6.47): 0,12·2·(100·0,001905·45)^(1/3) = 0,24·2,047 = 0,4912
    // v_min = 0,035·2^1,5·√45 = 0,6641 → v_Rd,c = 0,6641 · UC = 0,5323/0,6641 = 0,8015
    // ν = 0,6·(1 − 45/250) = 0,492 · v_Rd,max = 0,4·0,492·30 = 5,904
    // v_Ed,0 = 287 500/(1200·165) = 1,452 · UC = 1,452/5,904 = 0,2459
    verwacht: {
      d_y: "170", d_z: "160", d_eff: "165", ρ_ly: "0.001848", ρ_lz: "0.001963", ρ_l: "0.001905",
      u_0: "1200", u_1: "3273", β: "1.15", k: "2", v_min: "0.6641", v_Rd_c: "0.6641", v_Ed: "0.5323",
      UC_pons: "0.8015", ν: "0.492", v_Rd_max: "5.904", v_Ed_0: "1.452", UC_vRd_max: "0.2459", UC_max: "0.8015",
    },
    oordeel: "voldoet",
  },
  {
    naam: "Voorbeeld 2 — randkolom 300×300, h = 250, C30/37, Ø16-150 beide richtingen, c = 30, V_Ed = 300 kN, e_y = 100 (naar binnen), e_z = 50; ponswapening 3 omtrekken van 8Ø8",
    invoer: {
      plaats: 2, h_plaat: 250, betonklasse: 30, d_wapy: 16, s_wapy: 150, d_wapz: 16, s_wapz: 150, c_dek: 30,
      V_Ed: 300, beta_keuze: 0, e_y: 100, e_z: 50,
      ponswap: 1, d_sw: 8, n_sw: 8, n_om: 3, s_r: 150, a_sw: 100, hoek_pons: 90,
    },
    // d_y = 250 − 30 − 8 = 212 · d_z = 250 − 30 − 16 − 8 = 196 · d = 204
    // A_s = 201,06 · ρ_ly = 201,06/(150·212) = 0,006323 · ρ_lz = 201,06/(150·196) = 0,006839 · ρ_l = 0,006576
    // u_1 = 2·300 + 300 + 2π·204 = 2181,8 (fig. 6.15) · u_1* = 300 + 2·min(150; 306) + 2π·204 = 1881,8 (fig. 6.20a)
    // (6.44): k uit tabel 6.1 met c_1/(2c_2) = 0,5 → 0,45
    //   W_1 (6.45) = 300²/4 + 300·300 + 4·300·204 + 8·204² + π·204·300 = 882 494 mm²
    //   β = 2181,8/1881,8 + 0,45·50·2181,8/882 494 = 1,1594 + 0,0556 = 1,2151
    // v_Ed = 1,2151·300 000/(2181,8·204) = 0,8190
    // k = 1 + √(200/204) = 1,990 · (6.47): 0,12·1,990·(100·0,006576·30)^(1/3) = 0,2388·2,702 = 0,6453
    // v_min = 0,035·1,990^1,5·√30 = 0,5382 → v_Rd,c = 0,6453 · UC_pons = 0,8190/0,6453 = 1,269: ponswapening nodig
    // u_0 = min(300 + 3·204; 300 + 2·300) = 900 · v_Ed,0 = 364 515/(900·204) = 1,985
    // v_Rd,max = 0,4·0,528·20 = 4,224 · UC = 0,4700
    // f_ywd,ef = 250 + 0,25·204 = 301 ≤ 434,8 · A_sw = 8·50,27 = 402,1 mm²
    // v_Rd,cs = 0,75·0,6453 + 1,5·(204/150)·402,1·301/(2181,8·204)·1 = 0,4840 + 0,5548 = 1,039 · UC = 0,7884
    // u_out,ef = 364 515/(0,6453·204) = 2769 · a_out = (2769 − 600 − 300)/π = 594,9
    // a_n = 100 + 2·150 = 400 ≥ 594,9 − 1,5·204 = 288,9 → UC = 0,722
    // s_r = 150 ≤ 0,75·204 = 153 → 0,9804 · a = 100 ≤ 0,5·204 = 102 → 0,9804 · 2 omtrekken → 2/3
    // h = 250 ≥ 200 mm (9.3.2(1)) → 0,8
    // s_t = 2181,8/8 = 272,7 ≤ 1,5·204 = 306 → 0,8912 · a_n = 400 < 2d = 408: geen toets op 2d
    // (9.11): A_sw,min = 0,08·√30/500·150·272,7/1,5 = 23,90 mm² ≤ 50,27 → 0,4755
    // UC_max = 0,9804 (de detaillering is maatgevend)
    verwacht: {
      d_y: "212", d_z: "196", d_eff: "204", ρ_ly: "0.006323", ρ_lz: "0.006839", ρ_l: "0.006576",
      u_1: "2182", u_1_red: "1882", k_β: "0.45", W_1: "882500", β: "1.215", v_Ed: "0.8190",
      k: "1.990", v_min: "0.5382", v_Rd_c: "0.6453", UC_pons: "1.269",
      u_0: "900", v_Ed_0: "1.985", v_Rd_max: "4.224", UC_vRd_max: "0.4700",
      f_ywd_ef: "301", A_sw: "402.1", v_Rd_s: "0.5548", v_Rd_cs: "1.039", UC_cs: "0.7884", u_out_ef: "2769", a_out: "594.9",
      a_n: "400", UC_uit: "0.722", UC_n: "0.6667", UC_sr: "0.9804", UC_a: "0.9804", UC_h: "0.8", s_t: "272.7", UC_st: "0.8912",
      A_sw_min: "23.90", UC_min: "0.4755", UC_max: "0.9804",
    },
    oordeel: "voldoet",
  },
  {
    naam: "Grensgeval — hoekkolom 600×600, h = 200: 0,5c = 300 > 1,5d = 247,5, dus u_1* met 1,5d; β volgens (6.46) boven figuur 6.21N",
    invoer: { plaats: 3, c_1: 600, c_2: 600, V_Ed: 100, beta_keuze: 0, e_y: 0, e_z: 0 },
    // d = 165 · u_1 = 600 + 600 + π·165 = 1718,4 · u_1* = 247,5 + 247,5 + π·165 = 1013,4
    // β = 1718,4/1013,4 = 1,696 (figuur 6.21N zou 1,5 geven) · v_Ed = 100 000/(1013,4·165) = 0,5981
    // UC = 0,5981/0,6641 = 0,9006 · u_0 = min(3·165; 1200) = 495 · v_Ed,0 = 1,696·100 000/(495·165) = 2,076 → 0,3517
    verwacht: {
      u_1: "1718", u_1_red: "1013", β: "1.696", v_Ed: "0.5981", UC_pons: "0.9006",
      u_0: "495", v_Ed_0: "2.076", UC_vRd_max: "0.3517", UC_max: "0.9006",
    },
    oordeel: "voldoet",
  },
  {
    naam: "Grensgeval — ronde middenkolom Ø400 met e_y = 60 en e_z = 80: (6.42) met e = 100",
    invoer: { vorm: 2, c_1: 400, beta_keuze: 0, e_y: 60, e_z: 80 },
    // u_1 = π·(400 + 4·165) = 3330 · u_0 = π·400 = 1257
    // β = 1 + 0,6π·100/(400 + 660) = 1,178 · v_Ed = 1,1778·250 000/(3330·165) = 0,5359 → 0,8070
    verwacht: { e_tot: "100", u_1: "3330", u_0: "1257", β: "1.178", v_Ed: "0.5359", UC_pons: "0.8070" },
    oordeel: "voldoet",
  },
  {
    naam: "Grensgeval — middenkolom 400×250 met alleen e_y = 150: (6.39) met W_1 volgens (6.41)",
    invoer: { c_1: 400, c_2: 250, beta_keuze: 0, e_y: 150, e_z: 0 },
    // c_1/c_2 = 1,6 → k = 0,6 + 0,1·0,6 = 0,66
    // W_1 = 400²/2 + 400·250 + 4·250·165 + 16·165² + 2π·165·400 = 1 195 290 mm²
    // u_1 = 1300 + 4π·165 = 3373,5 · β = 1 + 0,66·150·3373,5/1 195 290 = 1,279
    // v_Ed = 1,2794·250 000/(3373,5·165) = 0,5746 → 0,8653
    verwacht: { k_β: "0.66", W_1: "1195000", β: "1.279", UC_pons: "0.8653" },
    oordeel: "voldoet",
  },
  {
    naam: "Grensgeval — dezelfde kolom een kwartslag gedraaid: 250×400 met alleen e_z = 150 geeft dezelfde β",
    invoer: { c_1: 250, c_2: 400, beta_keuze: 0, e_y: 0, e_z: 150 },
    verwacht: { k_β: "0.66", W_1: "1195000", β: "1.279", UC_pons: "0.8653" },
    oordeel: "voldoet",
  },
  {
    naam: "Grensgeval — middenkolom 400×250 met e_y = 150 en e_z = 100: (6.43)",
    invoer: { c_1: 400, c_2: 250, beta_keuze: 0, e_y: 150, e_z: 100 },
    // β = 1 + 1,8·√((150/(250 + 660))² + (100/(400 + 660))²) = 1 + 1,8·0,18992 = 1,342
    verwacht: { β: "1.342" },
    oordeel: "voldoet",
  },
  {
    naam: "Grensgeval — ronde randkolom Ø400: vierkant met dezelfde omtrek, zijde π·400/4 = 314,2",
    invoer: { vorm: 2, plaats: 2, c_1: 400 },
    // u_1 = 3·314,16 + 2π·165 = 1979 · u_0 = min(314,2 + 495; 3·314,2) = 809,2 · β = 1,4
    // v_Ed = 1,4·250 000/(1979,2·165) = 1,0718 → UC = 1,614: zonder ponswapening voldoet de plaat niet
    verwacht: { c_k: "314.2", u_1: "1979", u_0: "809.2", β: "1.4", UC_pons: "1.614" },
    oordeel: "voldoet niet",
  },
  {
    naam: "Grensgeval — ponswapening nodig maar niet aanwezig: V_Ed = 400 kN",
    invoer: { V_Ed: 400 },
    // v_Ed = 1,15·400 000/(3273,5·165) = 0,8517 → UC 1,282
    // f_ywd,ef = 250 + 0,25·165 = 291,3 · A_sw,nodig = (0,8517 − 0,75·0,6641)·3273,5·0,75·165/(1,5·291,3) = 327,9
    verwacht: { UC_pons: "1.282", f_ywd_ef: "291.3", A_sw_nodig: "327.9", UC_max: "1.282" },
    oordeel: "voldoet niet",
    melding: /ponswapening nodig/,
  },
  {
    naam: "Grensgeval — zes omtrekken van 14Ø10: op de buitenste omtrek staan de staven verder dan 2d uit elkaar",
    invoer: { V_Ed: 400, ponswap: 1, d_sw: 10, n_sw: 14, n_om: 6, s_r: 100, a_sw: 80, hoek_pons: 90 },
    // s_t = 3273,5/14 = 233,8 ≤ 1,5·165 = 247,5 → 0,9447
    // a_n = 80 + 5·100 = 580 > 2d = 330: u(580) = 1200 + 2π·580 = 4844 → s_t = 4844/14 = 346,0 > 2d = 330 → 1,05
    // v_Rd,cs = 0,75·0,6641 + 1,5·(165/100)·1099,6·291,3/(3273,5·165) = 0,4981 + 1,467 = 1,966 → 0,8517/1,966 = 0,4333
    // (9.11) met de grootste s_t, die op de buitenste omtrek: 0,08·√45/500·100·346,0/1,5 = 24,76 mm² ≤ 78,54 → 0,3152
    verwacht: { s_t: "233.8", UC_st: "0.9447", a_n: "580", s_t_uit: "346.0", UC_st_uit: "1.05", v_Rd_cs: "1.966", UC_cs: "0.4333",
      A_sw_min: "24.76", UC_min: "0.3152", UC_max: "1.05" },
    oordeel: "voldoet niet",
  },
  {
    naam: "Grensgeval — randkolom 300×600 (c_2 langs de rand) met alleen e_z = 80: k in (6.44) uit de grootste lezing van c_1/(2c_2)",
    invoer: { plaats: 2, c_1: 300, c_2: 600, beta_keuze: 0, e_y: 0, e_z: 80 },
    // d = 165 · u_1 = 2·300 + 600 + 2π·165 = 2236,7 · u_1* = 600 + 2·min(150; 247,5) + 2π·165 = 1936,7
    // tabel 6.1: c_1/(2c_2) = 0,25 → 0,45; c_2/(2c_1) = 1,0 → 0,60; de grootste: k = 0,60
    // W_1 (6.45) = 600²/4 + 300·600 + 4·300·165 + 8·165² + π·165·600 = 996 818 mm²
    // β = 2236,7/1936,7 + 0,60·80·2236,7/996 818 = 1,1549 + 0,1077 = 1,263
    // v_Ed = 1,2626·250 000/(2236,7·165) = 0,8553 → UC = 0,8553/0,6641 = 1,288: ponswapening nodig
    // u_0 = min(600 + 495; 600 + 600) = 1095 · v_Ed,0 = 315 652/(1095·165) = 1,747 → 0,2959
    // A_sw,nodig = (0,8553 − 0,75·0,6641)·2236,7·0,75·165/(1,5·291,25) = 226,3 mm²
    verwacht: {
      u_1: "2237", u_1_red: "1937", k_β: "0.6", W_1: "996800", β: "1.263", v_Ed: "0.8553", UC_pons: "1.288",
      u_0: "1095", v_Ed_0: "1.747", UC_vRd_max: "0.2959", A_sw_nodig: "226.3", UC_max: "1.288",
    },
    oordeel: "voldoet niet",
    melding: /ponswapening nodig/,
  },
  {
    naam: "Grensgeval — ponswapening in een plaat van 180 mm: dunner dan 200 mm (9.3.2(1))",
    invoer: { h_plaat: 180, V_Ed: 330, ponswap: 1, d_sw: 10, n_sw: 16, n_om: 3, s_r: 100, a_sw: 70, hoek_pons: 90 },
    // d_y = 150 · d_z = 140 · d = 145; UC_pons > 1, dus de ponswapening telt
    // 9.3.2(1): 200/180 = 1,111 > 1,0; de overige toetsen blijven eronder, dus maatgevend
    verwacht: { d_eff: "145", UC_h: "1.111", UC_max: "1.111" },
    oordeel: "voldoet niet",
  },
  {
    naam: "Grensgeval — V_Ed = −250 kN: het teken telt niet, dezelfde uitkomst als voorbeeld 1",
    invoer: { V_Ed: -250 },
    verwacht: { V_Ed: "250", v_Ed: "0.5323", UC_pons: "0.8015", v_Ed_0: "1.452", UC_max: "0.8015" },
    oordeel: "voldoet",
  },
  {
    naam: "Grensgeval — zware wapening: ρ_l begrensd op 0,02",
    invoer: { h_plaat: 300, d_wapy: 25, s_wapy: 75, d_wapz: 25, s_wapz: 75 },
    // d_y = 262,5 · d_z = 237,5 · ρ_ly = 490,9/(75·262,5) = 0,02493 · ρ_lz = 0,02756 → √ = 0,0262 → 0,02
    verwacht: { ρ_ly: "0.02493", ρ_lz: "0.02756", ρ_l: "0.02" },
    oordeel: "voldoet",
  },
];

for (const set of HAND) {
  const got = blad(set.invoer);
  fouten += toets(set.naam, got, set.verwacht);
  oordeel(set.naam, got, set.oordeel);
  if (set.melding) {
    const ok = set.melding.test(got.text);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} melding    ${set.melding.source}`);
  }
  schoon(got);
}

// ── 2. Grensgevallen zonder uitkomst ─────────────────────────────────────────
const LEEG = [
  {
    naam: "Grensgeval — randkolom met e_y = −50: de excentriciteit wijst naar de rand",
    invoer: { plaats: 2, beta_keuze: 0, e_y: -50, e_z: 0 },
    oordeel: "niet getoetst", melding: /wijst naar de rand/,
  },
  {
    naam: "Grensgeval — hoekkolom met e_z = −20",
    invoer: { plaats: 3, beta_keuze: 0, e_y: 30, e_z: -20 },
    oordeel: "niet getoetst", melding: /wijst naar de rand/,
  },
  {
    naam: "Grensgeval — plaat van 40 mm: de nuttige hoogte is nul",
    invoer: { h_plaat: 40 },
    oordeel: "voldoet niet", melding: /nuttige hoogte is nul of negatief/,
  },
  {
    naam: "Grensgeval — ponswapening nodig en gekozen, maar zonder omtrekken",
    invoer: { V_Ed: 400, ponswap: 1, n_om: 0 },
    oordeel: "niet getoetst", melding: /niet volledig ingevuld/,
  },
  {
    naam: "Grensgeval — ponswapening onder 20°: buiten 45°–90°",
    invoer: { V_Ed: 400, ponswap: 1, hoek_pons: 20 },
    oordeel: "niet getoetst", melding: /niet volledig ingevuld/,
  },
  {
    naam: "Grensgeval — ponswapening onder 40°: 30° mag alleen bij één rij opgebogen staven (9.4.3(4))",
    invoer: { V_Ed: 400, ponswap: 1, hoek_pons: 40 },
    oordeel: "niet getoetst", melding: /niet volledig ingevuld/,
  },
];
for (const set of LEEG) {
  console.log(`\n${set.naam}`);
  const got = blad(set.invoer);
  oordeel(set.naam, got, set.oordeel);
  geenUC(got);
  const ok = set.melding.test(got.text);
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} melding    ${set.melding.source}`);
  schoon(got);
}

{
  console.log("\nGrensgeval — ponswapening aanwezig maar niet nodig: telt niet mee");
  const got = blad({ ponswap: 1 });
  const ok = got.values.UC_cs === undefined && Math.abs(got.values.UC_max - 0.8015) < 5e-5 && /niet nodig en telt niet mee/.test(got.text);
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} UC_max ${got.values.UC_max}, geen UC_cs`);
}

{
  console.log("\nVeilige kant — een ronde randkolom als vierkant geeft een kortere u_1 dan de ronde omtrek");
  for (const plaats of [2, 3]) {
    const got = blad({ vorm: 2, plaats, c_1: 400 });
    const c = 400, d = got.values.d_eff;
    // De ronde omtrek tot de rand: halve (hoek: kwart) cirkel op c/2 + 2d plus rechte stukken van c/2.
    const rondeOmtrek = plaats === 2 ? c + Math.PI * (c / 2 + 2 * d) : c + (Math.PI / 2) * (c / 2 + 2 * d);
    const ok = got.values.u_1 < rondeOmtrek;
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} ${plaats === 2 ? "rand" : "hoek"}  u_1 = ${got.values.u_1} < ${rondeOmtrek.toFixed(0)} mm`);
  }
}

// ── 3. Gelijk aan het normblad ec2Pons ───────────────────────────────────────
{
  const bron = readFileSync(join(hier, "../packages/desktop/src/templates/en1992.ts"), "utf8");
  const ec2Pons = bron.match(/export const ec2Pons = `([\s\S]*?)`;/)[1];
  const metInvoer = (t, invoer) => {
    let uit = t;
    for (const [naam, waarde] of Object.entries(invoer)) {
      const re = new RegExp(`^${naam} = .*$`, "m");
      if (!re.test(uit)) throw new Error(`geen invoerregel ${naam} in ec2Pons`);
      uit = uit.replace(re, `${naam} = ${waarde}`);
    }
    return uit;
  };
  const GELIJK = [
    { plaats: 1, kolomtype: "1.15", invoer: { c_1: 400, c_2: 400, V_Ed: 500, h_plaat: 250, betonklasse: 25, d_wapy: 12, s_wapy: 125, d_wapz: 12, s_wapz: 125 } },
    { plaats: 2, kolomtype: "1.40", invoer: { c_1: 300, c_2: 450, V_Ed: 280, h_plaat: 240, betonklasse: 35, d_wapy: 16, s_wapy: 200, d_wapz: 12, s_wapz: 150 } },
    { plaats: 3, kolomtype: "1.50", invoer: { c_1: 350, c_2: 300, V_Ed: 150, h_plaat: 220, betonklasse: 30, d_wapy: 12, s_wapy: 150, d_wapz: 12, s_wapz: 150, eerstelaag: 2 } },
  ];
  for (const set of GELIJK) {
    const w = { ...DEFAULTS, ...set.invoer, plaats: set.plaats, beta_keuze: 2 };
    const ons = reken(tpl, w, {});
    const { r } = uitwerking(w);
    const norm = reken(metInvoer(ec2Pons, {
      c_1: `${w.c_1} mm`, c_2: `${w.c_2} mm`, V_Ed: `${w.V_Ed} kN`,
      d_y: `${r.d_y} mm`, d_z: `${r.d_z} mm`, rho_ly: String(r.ρ_ly), rho_lz: String(r.ρ_lz),
    }), { sterkteklasse: String(w.betonklasse), kolomtype: set.kolomtype }, {});
    const paren = [["u_1", "u_1"], ["u_0", "u_0"], ["d_eff", "d_eff"], ["β", "beta_pons"], ["v_Ed", "v_Ed"],
      ["v_Rd_c", "v_Rdc"], ["UC_pons", "UC_pons"], ["v_Ed_0", "v_Ed0"], ["v_Rd_max", "v_Rdmax"],
      ["UC_vRd_max", "UC_vRdmax"], ["UC_max", "UC_max"]];
    const verwacht = Object.fromEntries(paren.map(([o, n]) => [o, { waarde: String(norm.values[n]), tol: 1e-9 + Math.abs(norm.values[n]) * 6e-4 }]));
    fouten += toets(`Gelijk aan ec2Pons — kolomtype ${set.kolomtype}, ${w.c_1}×${w.c_2}, V_Ed = ${w.V_Ed} kN`, ons, verwacht);
  }
}

// ── 4. Onafhankelijke uitwerking over een raster van keuzes ──────────────────
{
  const BASIS = {
    ...DEFAULTS, c_1: 400, c_2: 250, h_plaat: 220, betonklasse: 30, d_wapy: 12, s_wapy: 150, d_wapz: 10, s_wapz: 200,
    eerstelaag: 2, c_dek: 30, d_sw: 10, n_sw: 16, n_om: 3, s_r: 120, a_sw: 70, hoek_pons: 90, beta_hand: 1.3,
  };
  const EXC = [[0, 0], [80, 0], [0, 60], [80, 60], [-40, 30], [40, -30]];
  let sets = 0, fout0 = fouten;
  for (const vorm of [1, 2]) for (const plaats of [1, 2, 3]) for (const bk of [2, 0, 1])
    for (const ponswap of [0, 1]) for (const V of [150, 420]) for (const [ey, ez] of bk === 0 ? EXC : [[0, 0]]) {
      const w = { ...BASIS, vorm, plaats, beta_keuze: bk, ponswap, V_Ed: V, e_y: ey, e_z: ez, hoek_pons: ponswap && V > 400 && ey === 0 ? 60 : 90 };
      const got = reken(tpl, w, {});
      const { r, oordeel: wil, geenUC } = uitwerking(w);
      sets++;
      // Alleen afwijkingen tonen: een regel per set zou honderden regels geven.
      const log = console.log;
      const regels = [];
      console.log = (x) => regels.push(x);
      let f = vierCijfers(`raster ${JSON.stringify({ vorm, plaats, bk, ponswap, V, ey, ez })}`, got, r);
      console.log = log;
      const ons = slotzin(got);
      if (ons !== wil) f++;
      if (geenUC && got.values.UC_max !== undefined) f++;
      if (/\bNaN\b|Infinity|Error|Undefined symbol/.test(got.text)) f++;
      if (f) {
        fouten += f;
        for (const x of regels) if (!/^\s+OK/.test(x)) console.log(x);
        console.log(`  slotzin ${ons}, narekening ${wil}`);
      }
    }
  console.log(`\nOnafhankelijke uitwerking: ${sets} sets over vorm, plaats, β, ponswapening, belasting en excentriciteit — ${fouten - fout0 === 0 ? "alle waarden binnen de vier afgedrukte cijfers, slotzin gelijk" : `${fouten - fout0} afwijking(en)`}`);
}

afronden(fouten, "Ponsberekening");
