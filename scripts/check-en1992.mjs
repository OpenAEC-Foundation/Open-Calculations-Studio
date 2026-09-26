/**
 * Controlescript voor de EN 1992-1-1-bladen in templates/en1992.ts.
 *
 * Er is geen referentie-uitwerking voor deze bladen; de verwachtingen zijn met
 * de hand nagerekend en de berekening staat bij elke set. De invoer staat als
 * vaste waarde in de bladtekst, dus een set vervangt die regels.
 *
 * Wat vastligt:
 *   pons        u_1 en u_0 per kolomtype (fig. 6.15, art. 6.4.5(3)), k ≤ 2,
 *               v_Rd,c ≥ v_min, UC_max = max(UC_pons; UC_vRdmax)
 *   buiging     z = d(1 − ζ/2) met ζ = λx/d; M_Rd uit de aanwezige A_s, ook als
 *               het staal niet vloeit (rekverdeling)
 *   dwarskracht k ≤ 2, ρ_l ≤ 0,02, σ_cp ≤ 0,2 f_cd, V_Rd,c = max((6.2a); (6.2b))
 *   scheur      x uit de gescheurde doorsnede (langdurend met α_e,eff = α_e(1 + φ)),
 *               h_c,ef = min(2,5(h−d); (h−x)/3; h/2)
 *   betonbalk   dezelfde regels, z = 0,9d voor de beugels, M_qp als invoer
 *   alle bladen UC_max zichtbaar en een slotzin die daarmee klopt
 *
 * Draaien:  node scripts/check-en1992.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { reken, toets, afronden } from "./lib/refcheck.mjs";

const bron = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../packages/desktop/src/templates/en1992.ts"),
  "utf8",
);
const bladen = Object.fromEntries([...bron.matchAll(/export const (\w+) = `([\s\S]*?)`;/g)].map((m) => [m[1], m[2]]));

/** Vervangt vaste invoerregels (`b = 300 mm`) door een andere waarde. */
function metInvoer(tpl, invoer) {
  let uit = tpl;
  for (const [naam, waarde] of Object.entries(invoer)) {
    const re = new RegExp(`^${naam} = .*$`, "m");
    if (!re.test(uit)) throw new Error(`geen invoerregel ${naam}`);
    uit = uit.replace(re, `${naam} = ${waarde}`);
  }
  return uit;
}

const SETS = [
  // ── Pons ──────────────────────────────────────────────────────────────
  // d = 195, 400×400, V_Ed = 500 kN, C20/25, ρ = 0,008:
  // k = min(1 + √(200/195); 2) = 2 · v_Rd,c = 0,12·2·(100·0,008·20)^(1/3) = 0,6048
  // v_Rd,max = 0,4·0,552·13,33 = 2,944
  { blad: "ec2Pons", naam: "pons — middenkolom", select: { kolomtype: "1.15" },
    // u_1 = 2·800 + 4π·195 = 4050 · v_Ed = 1,15·500e3/(4050·195) = 0,728 → 0,728/0,6048 = 1,204
    // u_0 = 1600 · v_Ed,0 = 575000/(1600·195) = 1,843 → 1,843/2,944 = 0,626
    verwacht: { k_pons: "2.000", v_Rdc: "0.6048", u_1: "4050", UC_pons: "1.204",
                u_0: "1600", UC_vRdmax: "0.626", UC_max: "1.204" } },
  { blad: "ec2Pons", naam: "pons — randkolom, gelijk met de rand", select: { kolomtype: "1.40" },
    // u_1 = 2·400 + 400 + 2π·195 = 2425 · v_Ed = 1,4·500e3/(2425·195) = 1,480 → 2,448
    // u_0 = min(400 + 3·195; 400 + 2·400) = 985 · v_Ed,0 = 700000/(985·195) = 3,644 → 1,238
    verwacht: { u_1: "2425", v_Ed: "1.480", UC_pons: "2.448",
                u_0: "985", v_Ed0: "3.644", UC_vRdmax: "1.238" } },
  { blad: "ec2Pons", naam: "pons — hoekkolom, gelijk met beide randen", select: { kolomtype: "1.50" },
    // u_1 = 400 + 400 + π·195 = 1413 · v_Ed = 1,5·500e3/(1413·195) = 2,723 → 4,502
    // u_0 = min(3·195; 800) = 585 · v_Ed,0 = 750000/(585·195) = 6,575 → 2,233
    verwacht: { u_1: "1413", v_Ed: "2.723", UC_pons: "4.502",
                u_0: "585", v_Ed0: "6.575", UC_vRdmax: "2.233" } },
  { blad: "ec2Pons", naam: "pons — randkolom 200×400: u_0 = c_2 + 2c_1", select: { kolomtype: "1.40" },
    invoer: { c_1: "200 mm" },
    // u_1 = 2·200 + 400 + 2π·195 = 2025 · v_Ed = 700000/(2025·195) = 1,773 → 2,931
    // u_0 = min(400 + 585; 400 + 400) = 800 · v_Ed,0 = 700000/(800·195) = 4,487 → 1,524
    verwacht: { u_1: "2025", UC_pons: "2.931", u_0: "800", UC_vRdmax: "1.524" } },
  { blad: "ec2Pons", naam: "pons — middenkolom, V_Ed = 350 kN", select: { kolomtype: "1.15" },
    invoer: { V_Ed: "350 kN" },
    // v_Ed = 1,15·350e3/(4050·195) = 0,5096 → 0,5096/0,6048 = 0,843
    verwacht: { UC_pons: "0.843", UC_max: "0.843" } },

  // ── Buiging ───────────────────────────────────────────────────────────
  { blad: "ec2Buiging", naam: "buiging — 300×500, M_Ed = 200 kNm, A_s = 1257",
    // μ = 200e6/(300·450²·13,33) = 0,2469 · ζ = 1 − √(1 − 2μ) = 0,2885 (= λx/d)
    // z = 450(1 − 0,2885/2) = 385,1 · A_s,req = 200e6/(385,1·434,8) = 1195
    // x = 1257·434,8/(0,8·13,33·300) = 170,8 · z = 450 − 0,4·170,8 = 381,7
    // M_Rd = 1257·434,8·381,7 = 208,6 · UC = 0,959 · A_s,min = max(155,2; 175,5)
    verwacht: { zeta: "0.2885", z_req: "385.1", A_s_req: { waarde: "1195", tol: 1, waarom: "1194,6" },
                x_u: "170.8", z: "381.7", M_Rd: "208.6", UC_buiging: "0.959",
                A_smin: "175.5", UC_max: "0.959" } },

  // ── Dwarskracht zonder beugels ────────────────────────────────────────
  { blad: "ec2DwarskrachtZonder", naam: "dwarskracht — standaard, d = 450",
    // k = 1 + √(200/450) = 1,667 · ρ = 1257/135000 = 0,00931
    // v = 0,12·1,667·(18,62)^(1/3) = 0,5301 → V_Rd,c = 0,5301·135000 = 71,57
    verwacht: { k_shear: "1.667", rho_l: "0.00931", V_Rdc: "71.57" } },
  { blad: "ec2DwarskrachtZonder", naam: "dwarskracht — h = 200, d = 150: k en ρ begrensd",
    invoer: { h: "200 mm", d: "150 mm" },
    // k = 1 + √(200/150) = 2,155 → 2 · ρ = 1257/45000 = 0,0279 → 0,02
    // V_Rd,c = 0,12·2·40^(1/3)·45000 = 36,94
    verwacht: { k_shear: "2.000", rho_l: "0.0200", V_Rdc: "36.94" } },
  { blad: "ec2DwarskrachtZonder", naam: "dwarskracht — N_Ed = 2000 kN: σ_cp begrensd",
    invoer: { N_Ed: "2000 kN" },
    // N/A_c = 2e6/150000 = 13,33 → 0,2·13,33 = 2,667 · V_Rd,c = 71,57 + 0,15·2,667·135000 = 125,6
    verwacht: { sigma_cp: "2.667", V_Rdc: "125.6" } },

  // ── Dwarskracht met beugels ───────────────────────────────────────────
  { blad: "ec2DwarskrachtMet", naam: "beugels — Ø6 tweesnedig h.o.h. 200, cot θ = 2,5",
    // V_Rd,s = 56,6/200·495·434,8·2,5 = 152,3 · V_Rd,max = 300·495·0,552·13,33/2,9 = 376,9
    verwacht: { V_Rds: "152.3", V_Rdmax: "376.9", UC_max: "1.97" } },

  // ── Scheurwijdte ──────────────────────────────────────────────────────
  { blad: "ec2Scheurwijdte", naam: "scheur — kortdurend, α_e = E_s/E_cm", select: { belastingduur: "0.6" },
    // α_e·ρ = 6,675·0,00931 = 0,0622 → x = 450(√(0,0622² + 0,1243) − 0,0622) = 133,1
    // h_c,ef = min(125; 366,9/3; 250) = 122,3 · σ_s = 120e6/((450 − 44,4)·1257) = 235,4
    // ρ_p,eff = 0,03426 · s_r,max = 119 + 0,17·16/0,03426 = 198,4
    // ε = (235,4 − 0,6·2,21/0,03426·1,229)/2e5 = 9,39e-4 → w_k = 0,1863
    verwacht: { x: "133.1", h_cef: "122.3", sigma_s: "235.4", s_rmax: "198.4", w_k: "0.186" } },
  { blad: "ec2Scheurwijdte", naam: "scheur — langdurend, α_e,eff = α_e(1 + φ)", select: { belastingduur: "0.4" },
    // α_e,eff·ρ = 23,36·0,00931 = 0,2175 → x = 450(√(0,2175² + 0,4351) − 0,2175) = 214,7
    // σ_s = 120e6/((450 − 71,6)·1257) = 252,3 · h_c,ef = min(125; 285,3/3; 250) = 95,1
    // ρ_p,eff = 0,04405 · s_r,max = 119 + 2,72/0,04405 = 180,7
    // ε = (252,3 − 0,4·2,21/0,04405·1,294)/2e5 = 1,131e-3 (α_e = 6,675 in (7.9)) → w_k = 0,2045
    verwacht: { alpha_eL: "23.36", x: "214.7", sigma_s: "252.3", h_cef: "95.1", s_rmax: "180.7", w_k: "0.2045" } },
  { blad: "ec2Scheurwijdte", naam: "scheur — plaat h = 200, d = 165, Ø10-150, σ_s = 250",
    select: { belastingduur: "0.6" },
    invoer: { b: "1000 mm", h: "200 mm", d: "165 mm", phi: "10 mm", c: "30 mm",
              A_s: "523.6 mm^2", M_Ed_bgt: "20.26 kN*m" },
    // x = 30,6 → h_c,ef = min(87,5; 56,5; 100) = 56,5 · ρ_p,eff = 0,00928
    // s_r,max = 102 + 0,17·10/0,00928 = 285 · ε = 0,6·250/2e5 = 7,5e-4 → w_k = 0,214
    verwacht: { x: "30.6", h_cef: "56.5", s_rmax: "285", w_k: "0.214" } },

  // ── Volledige betonbalk ───────────────────────────────────────────────
  { blad: "ec2BetonBalk", naam: "betonbalk — 300×600, 4Ø20, L = 7 m, q_d = 30, q_qp = 20",
    // λx = 1257·434,8/(13,33·300) = 136,6 → x = 170,7 · z = 550 − 68,3 = 481,7
    // M_Rd = 1257·434,8·481,7 = 263,2 · UC = 183,75/263,2 = 0,698
    // V_Rd,s = 100,5/200·495·434,8·2,5 = 270,5 (z = 0,9d)
    // α_e,eff = 6,675·3,5 = 23,36 · ρ = 0,007616 → x = 244,5 · σ_s = 122,5e6/(468,5·1257) = 208,1
    // h_c,ef = min(125; 355,5/3; 300) = 118,5 · w_k = 215,2·8,86e-4 = 0,191
    verwacht: { x_u: "170.7", z: "481.7", M_Rd: "263.2", UC_buiging: "0.698",
                V_Rdc: "78.68", V_Rds: "270.5", x_bgt: "244.5", sigma_s: "208.1",
                h_cef: "118.5", w_k: "0.191", UC_max: "0.852" } },
  { blad: "ec2BetonBalk", naam: "betonbalk — 6Ø25: het staal vloeit niet",
    invoer: { phi: "25 mm", n_staven: "6" },
    // λx = 2945·434,8/(13,33·300) = 320 → x/d = 0,73 > 0,617: rekverdeling
    // 3200x² + 2,062e6·x − 2,062e6·550 = 0 → x = 354,7 · σ_s = 700(550 − 354,7)/354,7 = 385,4
    // M_Rd = 2945·385,4·(550 − 141,9) = 463,2
    verwacht: { x_u: "354.7", sigma_sd: "385.4", M_Rd: "463.2" } },

  // ── Doorbuiging ───────────────────────────────────────────────────────
  { blad: "ec2Doorbuiging", naam: "doorbuiging — standaard",
    // ρ = 0,00889 > ρ_0 = 0,00447 → (7.16b): 11 + 1,5·4,472·0,00447/0,00889 = 14,38
    // · 1257/1200 = 15,06 · l/d = 13,33 → 0,885
    verwacht: { ld_basis: "14.38", ld_toel: "15.06", UC_max: "0.885" } },
];

/** De slotzin moet hetzelfde zeggen als UC_max, zoals bladResultaat.leesResultaat hem leest. */
function slotzinKlopt(got) {
  const i = got.text.lastIndexOf("Maatgevende UC");
  if (i < 0 || got.values.UC_max === undefined) return false;
  const zin = got.text.slice(i, i + 240);
  const voldoet = !/voldoe[nt] niet/.test(zin) && /voldoe[nt]/.test(zin);
  return voldoet === got.values.UC_max <= 1;
}

let fouten = 0;
for (const set of SETS) {
  const tpl = metInvoer(bladen[set.blad], set.invoer ?? {});
  const got = reken(tpl, set.select ?? {}, {});
  fouten += toets(`${set.blad} · ${set.naam}`, got, set.verwacht);
}

console.log("\nSlotzin en kop van elk toetsblad");
for (const [naam, tpl] of Object.entries(bladen)) {
  const kop = tpl.match(/^# (.+)$/m)?.[1] ?? "";
  const kopOk = /\s—\s/.test(kop);
  if (!kopOk) fouten++;
  if (naam === "ec2Materiaal") {
    console.log(`  ${kopOk ? "OK    " : "FOUT  "} ${naam.padEnd(22)} kop "${kop}" (geen toetsing)`);
    continue;
  }
  const got = reken(tpl, {}, {});
  const ok = slotzinKlopt(got);
  if (!ok) fouten++;
  console.log(`  ${ok && kopOk ? "OK    " : "FOUT  "} ${naam.padEnd(22)} UC_max ${got.values.UC_max}   kop "${kop}"`);
}

afronden(fouten, "EN 1992");
