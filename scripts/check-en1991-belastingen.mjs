/**
 * Controlescript voor de bladen van templates/en1991.ts: opgelegde belasting,
 * sneeuw en wind (NEN-EN 1991-1-1, -1-3 en -1-4 met NB).
 *
 * Geen referentieblad; elke verwachting is een handberekening, hieronder bij
 * de set uitgeschreven. Windgebied II en terreincategorie II uit de
 * projectgegevens, z = 10 m:
 *
 *   k_r = 0,19·(0,2/0,05)^0,07 = 0,2094     c_r = k_r·ln(10/0,2) = 0,8190
 *   v_m = 0,8190·27,0 = 22,11 m/s            I_v = 1/ln(50) = 0,2556
 *   q_p = (1 + 7·0,2556)·0,5·1,25·22,11² = 852,5 N/m² → 0,8525 kN/m²
 *
 * Netto winddruk met c_pi = +0,2 (zuiging) en −0,3 (druk), 7.2.9(6), of met
 * één ingevulde c_pi bij een dominante gevel, 7.2.9(5).
 *
 * Ontwerplevensduur 100 jaar (A1.1(2) van de NB bij NEN-EN 1990), p = 0,01:
 *   wind, windgebied II (K = 0,234, n = 0,5, tabel NB.2):
 *     c_prob² = (1 − 0,234·ln(−ln 0,99))/(1 − 0,234·ln(−ln 0,98))
 *             = (1 + 0,234·4,6001)/(1 + 0,234·3,9019) = 2,0764/1,9131 = 1,0854
 *     c_prob = 1,0418;  q_p = 1,0854·0,8525 = 0,9253 kN/m²
 *   sneeuw (D.1), V = 0,8:
 *     (1 − 0,8·(√6/π)·(ln(−ln 0,99) + 0,57722))/(1 + 2,5923·0,8)
 *     = (1 + 0,6238·4,0229)/3,0738 = 3,5093/3,0738 = 1,1417;  s_k = 0,7992 kN/m²
 *     (ter controle bij 15 jaar: 0,751, gelijk aan tabel NB.2: s_k15 = 0,75·s_k50)
 *
 * Lijnlast op een element: de belaste strook loopt van x tot x + b vanaf de
 * rand; per zone (cs·c_pe − c_pi)·q_p maal de lengte van de strook in die
 * zone, e = min(b; 2h) met h = z. Uitgewerkt voorbeeld, zadeldak θ = 0°,
 * α = 30°, A = 10 m² (tabel NB.10 – 7.4a, c_pe,10), gebouw b = 12 m:
 *   e = min(12; 2·10) = 12 m, e/10 = 1,2 m; zone G tot 1,2 m, daarna H.
 *   G: −0,5 / +0,7;  H: −0,2 / +0,4.  Strook [1,0; 2,2]: G 0,2 m, H 1,0 m.
 *   q_zuiging = 0,8525·(−0,5·0,2 − 0,2·1,0 − 0,2·1,2) = 0,8525·(−0,54) = −0,4604 kN/m
 *   q_druk    = 0,8525·(0,7·0,2 + 0,4·1,0 + 0,3·1,2) = 0,8525·0,90  =  0,7673 kN/m
 * Luifel (7.2.12, tabel NB.18 – 8), h = z = 9 m, h_1 = 2,7, d_1 = 0,8, b_1 = 1,6:
 *   q_p(9 m): c_r = 0,2094·ln 45 = 0,7970, v_m = 21,52 m/s, I_v = 0,2627,
 *     q_p = (1 + 7·0,2627)·0,625·21,52² = 821,6 N/m² → 0,8216 kN/m²
 *   h_1/h = 0,3; h_1/d_1 = 3,375 → t = (3,375 − 1)/2,5 = 0,95
 *   A: neer +0,7, op −0,9 + 0,95·(−1,4 + 0,9) = −1,375;  B: neer +0,4, op −0,2 − 0,95·0,3 = −0,485
 *   e = min(0,8/4; 1,6/2) = 0,2 m. Een stang aan de zijrand draagt de halve luifel,
 *   strook [0; 0,8]: A 0,2 m, B 0,6 m.
 *   q_op   = 0,8216·(−1,375·0,2 − 0,485·0,6) = 0,8216·(−0,566) = −0,4650 kN/m
 *   q_neer = 0,8216·(0,7·0,2 + 0,4·0,6)     = 0,8216·0,38    =  0,3122 kN/m
 *
 * Sneeuw tegen een hoger bouwdeel, h = 3,5, b_1 = 9,6, b_2 = 4,8, hoog dak 40°:
 *   l_s = 7 m; μ_w = 14,4/7 = 2,057 (≤ 2·3,5/0,7 = 10); μ_s = 0,5333·9,6/7 = 0,7314
 *   μ_2 = 2,789, s_2 = 1,952; b_2 < l_s: μ = 2,789 − 1,989·4,8/7 = 1,425 → 0,9975 kN/m²
 *   Element tegen de wand, strook [0; 1]: s in het midden = 0,7·(2,789 − 1,989·0,5/7) = 1,853 kN/m.
 *
 * Draaien:  node scripts/check-en1991-belastingen.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { reken, toets, afronden } from "./lib/refcheck.mjs";

const BRON = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../packages/desktop/src/templates/en1991.ts"),
  "utf8",
);

/** Eén blad uit een bestand met meerdere `export const x = \`…\`;`. */
function blad(naam) {
  const kop = `export const ${naam} = \``;
  const i = BRON.indexOf(kop);
  if (i < 0) throw new Error(`blad ${naam} niet gevonden`);
  return BRON.slice(i + kop.length, BRON.indexOf("`;", i + kop.length));
}

const PROJECT = { CC: 2, K_FI: 1, rekenwijze: 1, windgebied: 2, terreincategorie: 2, DesignLife: 50 };
let fouten = 0;

/** Een regel van de zonetabel, als platte tekst: zone, c_pe zuiging en druk, q zuiging en druk. */
function tabelregel(got, regel) {
  const ok = got.text.includes(` ${regel} `);
  console.log(`  ${ok ? "OK    " : "FOUT  "} tabel      ${regel}`);
  return ok ? 0 : 1;
}

// ── Wind ─────────────────────────────────────────────────────────────────────
const wind = blad("en1991Windbelasting");
const W = (zone, A, extra = {}) => reken(wind, { zone_cpe: String(zone), z: "10", A_bel: String(A), ...extra }, PROJECT);

// Zone F, A = 1 m²: c_pe,1 = −2,5. Zuiging (−2,5 − 0,2)·0,8525 = −2,302; druk (−2,5 + 0,3)·0,8525 = −1,876.
// (Het blad gaf eerder −1,279: alleen c_pe,10 en c_pi = −0,3.)
fouten += toets("wind zone F, A = 1 m²", W(6, 1), { q_p: "0.8525", c_pe: "-2.5", w_z: "-2.302", w_d: "-1.876", w_net: "-2.302", F_w: "-2.302" });
// Zone F, A = 10 m²: c_pe,10 = −1,8 → (−1,8 − 0,2)·0,8525 = −1,705.
fouten += toets("wind zone F, A = 10 m²", W(6, 10), { w_net: "-1.705" });
// Zone G, A = 10 m²: (−1,2 − 0,2)·0,8525 = −1,194.
fouten += toets("wind zone G, A = 10 m²", W(7, 10), { w_net: "-1.194" });
// Zone I, A = 10 m² (tabel NB.7 – 7.2: +0,2 en c_pe,10 = −0,2): druk (0,2 + 0,3)·0,8525 = +0,4263;
// zuiging (−0,2 − 0,2)·0,8525 = −0,341.
fouten += toets("wind zone I, A = 10 m²", W(9, 10), { c_pe_I: "-0.2", w_d: "0.4263", w_z: "-0.341", w_net: "0.4263" });
// Zone I, A = 1 m²: zuiging met c_pe,1 = −0,5 → (−0,5 − 0,2)·0,8525 = −0,5968 (gaf eerder −0,341 met −0,2);
// druk blijft +0,4263. F_w = (−0,5 − 0,2)·0,8525·1 = −0,5968.
fouten += toets("wind zone I, A = 1 m²", W(9, 1), { c_pe: "0.2", c_pe_I: "-0.5", w_d: "0.4263", w_z: "-0.5968", w_net: "-0.5968", F_w: "-0.5968" });
// Zone I, A = 2 m²: c_pe = −0,5 + 0,3·log10(2) = −0,4097; (−0,4097 − 0,2)·0,8525 = −0,5198.
fouten += toets("wind zone I, A = 2 m²", W(9, 2), { c_pe_I: "-0.4097", w_z: "-0.5198", w_net: "-0.5198" });
// Zone A, A = 5 m²: c_pe = −1,4 + 0,2·log10(5) = −1,2602; (−1,2602 − 0,2)·0,8525 = −1,245; F_w = −1,245·5 = −6,224.
fouten += toets("wind zone A, A = 5 m²", W(1, 5), { c_pe: "-1.260", w_net: "-1.245", F_w: "-6.224" });
// Zone D, A = 10 m²: (0,8 + 0,3)·0,8525 = 0,9378.
fouten += toets("wind zone D, A = 10 m²", W(4, 10), { w_net: "0.9378" });
// Zone E, h/d = 3: c_pe = −0,5 − 0,2·(3 − 1)/4 = −0,6; (−0,6 − 0,2)·0,8525 = −0,682.
fouten += toets("wind zone E, h/d = 3", W(5, 10, { hd: "3" }), { c_pe: "-0.6", w_net: "-0.682" });
// Zelf ingevulde c_pe = −0,9: (−0,9 − 0,2)·0,8525 = −0,9378.
fouten += toets("wind c_pe zelf ingevuld", W(0, 10, { c_pe_hand: "-0.9" }), { c_pe: "-0.9", w_net: "-0.9378" });
// Dominante gevel (7.2.9(5)), c_pi = 0,9·0,8 = +0,72 bij een open loefgevel.
// Zone F, A = 1 m²: (−2,5 − 0,72)·0,8525 = −2,745 (zonder dominante gevel −2,302).
fouten += toets("wind zone F, dominante gevel c_pi = +0,72", W(6, 1, { inwendig: "2", c_pi: "0.72" }), { w_net: "-2.745", F_w: "-2.745" });
// Zone I met c_pi = −0,6: c_pe = +0,2 is dan ongunstig → (0,2 + 0,6)·0,8525 = 0,682; F_w = 0,682·10 = 6,82.
fouten += toets("wind zone I, dominante gevel c_pi = −0,6", W(9, 10, { inwendig: "2", c_pi: "-0.6" }), { w_net: "0.682", F_w: "6.82" });
// Zone I met c_pi = +0,72: c_pe = −0,2 → (−0,2 − 0,72)·0,8525 = −0,7843.
fouten += toets("wind zone I, dominante gevel c_pi = +0,72", W(9, 10, { inwendig: "2", c_pi: "0.72" }), { w_net: "-0.7843" });
// Idem bij A = 1 m²: c_pe,1 = −0,5 → (−0,5 − 0,72)·0,8525 = −1,040; F_w = −1,040.
fouten += toets("wind zone I, A = 1 m², dominante gevel c_pi = +0,72", W(9, 1, { inwendig: "2", c_pi: "0.72" }), { w_net: "-1.040", F_w: "-1.040" });
// c_pi = −0,1 bij A = 1 m²: |−0,5 + 0,1| = 0,4 > |0,2 + 0,1| = 0,3, dus zuiging: −0,4·0,8525 = −0,341.
fouten += toets("wind zone I, A = 1 m², dominante gevel c_pi = −0,1", W(9, 1, { inwendig: "2", c_pi: "-0.1" }), { w_net: "-0.341" });
// F_w kiest zelf, want c_s·c_d staat alleen op c_pe (5.5, 5.6). c_pe = −0,06, c_s·c_d = 0,8, A = 10 m²:
//   w_z = (−0,06 − 0,2)·0,8525 = −0,2217 en w_d = (−0,06 + 0,3)·0,8525 = 0,2046 → w_net zuiging;
//   F_z = (0,8·−0,06 − 0,2)·0,8525·10 = −2,114 en F_d = (−0,048 + 0,3)·8,525 = 2,148 → F_w druk (gaf eerder −2,114).
fouten += toets("wind F_w met c_s·c_d < 1", W(0, 10, { c_pe_hand: "-0.06", bouwwerkfactor: "3", cs_cd: "0.8" }),
  { w_z: "-0.2217", w_d: "0.2046", w_net: "-0.2217", F_w: "2.148" });
// Ontwerplevensduur 100 jaar (zie de kop): c_prob = 1,042, q_p = 0,9253; zone F, A = 10 m²: (−1,8 − 0,2)·0,9253 = −1,851.
fouten += toets("wind, ontwerplevensduur 100 jaar", reken(wind, { zone_cpe: "6", z: "10", A_bel: "10" }, { ...PROJECT, DesignLife: 100 }),
  { c_prob: "1.042", q_p: "0.9253", w_net: "-1.851" });
// 25 jaar: geen verlaging, q_p blijft 0,8525 (aan de veilige kant).
fouten += toets("wind, ontwerplevensduur 25 jaar", reken(wind, { zone_cpe: "6", z: "10", A_bel: "10" }, { ...PROJECT, DesignLife: 25 }),
  { q_p: "0.8525", w_net: "-1.705" });

// ── Wind: zadeldak, overkapping, luifel en de lijnlast op een element ────────
const ZD = (zone, α, A, extra = {}) =>
  reken(wind, { onderdeel: "2", zone_zd: String(zone), α_zd: String(α), z: "10", A_bel: String(A), ...extra }, PROJECT);

// Het uitgewerkte voorbeeld uit de kop: zone G, α = 30°, strook [1,0; 2,2] over G en H.
// w_z = (−0,5 − 0,2)·0,8525 = −0,5968; w_d = (0,7 + 0,3)·0,8525 = 0,8525 → druk.
// Zonetabel met b = 1,2 m: F en G (−0,7·1,023 = −0,716; 1,0·1,023 = 1,023), H (−0,4 → −0,409; 0,7 → 0,716),
// I (−0,4 met +0,0 tussen 15° en 45°: −0,614; 0,3·1,023 = 0,307), J (−0,5 en 0: −0,716; 0,307).
{
  const r = ZD(2, 30, 10, { b_bel: "1.2", x_el: "1.0", b_geb: "12" });
  fouten += toets("zadeldak θ = 0°, zone G, α = 30°, element over G en H", r,
    { c_pe_z: "-0.5", c_pe_d: "0.7", w_z: "-0.5968", w_d: "0.8525", w_net: "0.8525", e_w: "12", q_el_z: "-0.4604", q_el_d: "0.7673" });
  for (const regel of ["F -0.5 0.7 -0.716 1.023", "G -0.5 0.7 -0.716 1.023", "H -0.2 0.4 -0.409 0.716", "I -0.4 0 -0.614 0.307", "J -0.5 0 -0.716 0.307"]) {
    fouten += tabelregel(r, regel);
  }
}
// α = 20°, zone F, A = 1 m²: c_pe,1 = −2,0 + 0,5·5/15 = −1,833; druk 0,2 + 0,5·5/15 = 0,3667.
fouten += toets("zadeldak θ = 0°, zone F, α = 20°, A = 1 m²", ZD(1, 20, 1), { c_pe_z: "-1.833", c_pe_d: "0.3667" });
// α = 30°, zone H, A = 5 m²: c_pe = −1,0 + 0,8·log10(5) = −0,4408 (c_pe,1 = −1,0 uit tabel NB.10 – 7.4a).
fouten += toets("zadeldak θ = 0°, zone H, α = 30°, A = 5 m²", ZD(3, 30, 5), { c_pe_z: "-0.4408", c_pe_d: "0.4" });
// α = 10°, zone J: c_pe,10 = (−0,6 − 1,0)/2 = −0,8; druk (0,2 + 0)/2 = 0,1. Element langs de nok, x = 0, b = 1,
// e/10 = 2 m: geheel in J → q_z = (−0,8 − 0,2)·0,8525 = −0,8525; q_d = (0,1 + 0,3)·0,8525 = 0,341.
fouten += toets("zadeldak θ = 0°, zone J, α = 10°", ZD(5, 10, 10, { b_bel: "1", x_el: "0", b_geb: "20" }),
  { c_pe_z: "-0.8", c_pe_d: "0.1", q_el_z: "-0.8525", q_el_d: "0.341" });
// α = 60°, zone F: alleen druk +0,7 → w_net = (0,7 + 0,3)·0,8525 = 0,8525.
fouten += toets("zadeldak θ = 0°, zone F, α = 60°", ZD(1, 60, 10), { c_pe_z: "0.7", c_pe_d: "0.7", w_net: "0.8525" });
// θ = 90°, α = 30°, zone G: −1,4 (tabel NB.11 – 7.4b) → w_net = (−1,4 − 0,2)·0,8525 = −1,364.
// Element b = 10 m → e = 10, strook [1; 3] geheel in H (e/10 = 1 tot e/2 = 5): (−0,8 − 0,2)·2·0,8525 = −1,705.
fouten += toets("zadeldak θ = 90°, zone G, α = 30°", ZD(7, 30, 10, { b_bel: "2", x_el: "1", b_geb: "10" }),
  { c_pe_z: "-1.4", w_net: "-1.364", q_el_z: "-1.705" });

const OV = (zone, α, φ, extra = {}) =>
  reken(wind, { onderdeel: "3", zone_ov: String(zone), α_ov: String(α), φ_ov: String(φ), z: "10", A_bel: "5", ...extra }, PROJECT);
// Open overkapping (tabel 7.6), α = 10°, φ = 0,5, zone C: neer +1,6; op −2,1 + 0,5·(−2,7 + 2,1) = −2,4.
// w_neer = 1,6·0,8525 = 1,364; w_op = −2,046; F = w·5. Strook [0,3; 1,3] met d = 8 (d/10 = 0,8): C 0,5 m, A 0,5 m
// (A: +1,2 en −1,5 + 0,5·(−0,1) = −1,55): q_op = 0,8525·(−2,4·0,5 − 1,55·0,5) = −1,684; q_neer = 0,8525·1,4 = 1,194.
fouten += toets("overkapping, zone C, α = 10°, φ = 0,5", OV(3, 10, 0.5, { b_bel: "1", x_el: "0.3", d_ov: "8" }),
  { c_p_net_neer: "1.6", c_p_net_op: "-2.4", w_neer: "1.364", w_op: "-2.046", F_w_neer: "6.82", F_w_op: "-10.23", q_el_z: "-1.684", q_el_d: "1.194" });
// Zone B, zelfde helling en φ: +2,4 en −2,0 + 0,5·(−0,6) = −2,3. Strook [0; 1] met b = 20 (b/10 = 2): geheel in B.
fouten += toets("overkapping, zone B, α = 10°, φ = 0,5", OV(2, 10, 0.5, { b_bel: "1", x_el: "0", b_ov: "20" }),
  { c_p_net_neer: "2.4", c_p_net_op: "-2.3", q_el_z: "-1.961", q_el_d: "2.046" });
// α = 12,5°, zone A: neer 1,2 + 0,5·0,2 = 1,3; op bij φ = 0: −1,5 − 0,5·0,3 = −1,65, bij φ = 1: −1,6 → −1,625.
fouten += toets("overkapping, zone A, α = 12,5°, φ = 0,5", OV(1, 12.5, 0.5, { b_bel: "1" }),
  { c_p_net_neer: "1.3", c_p_net_op: "-1.625", q_el_z: "-1.385", q_el_d: "1.108" });

// Luifel: zie de kop.
fouten += toets("luifel aan een gebouw, stang aan de zijrand",
  reken(wind, { onderdeel: "4", zone_lf: "1", h_1: "2.7", d_1: "0.8", b_1: "1.6", z: "9", A_bel: "1", b_bel: "0.8", x_el: "0" }, PROJECT),
  { q_p: "0.8216", r_h: "0.3", r_d: "3.375", c_p_net_neer: "0.7", c_p_net_op: "-1.375", e_A: "0.2", q_el_z: "-0.4650", q_el_d: "0.3122" });

// Plat dak, zone F, b = 20 m → e = 20: strook [1; 3] over F (tot 2 m) en H.
// q_z = 0,8525·(−1,8 − 0,7 − 0,2·2) = −2,472; q_d = 0,8525·(−1,8 − 0,7 + 0,3·2) = −1,620.
fouten += toets("plat dak, element over F en H", W(6, 10, { b_bel: "2", x_el: "1", b_geb: "20" }),
  { e_w: "20", q_el_z: "-2.472", q_el_d: "-1.620" });
// Zone H, strook [9; 11] over H en I (vanaf e/2 = 10 m): q_z = 0,8525·(−0,7 − 0,2 − 0,4) = −1,108;
// q_d = 0,8525·(−0,7 + 0,2 + 0,3·2) = 0,0853.
fouten += toets("plat dak, element over H en I", W(8, 10, { b_bel: "2", x_el: "9", b_geb: "20" }),
  { q_el_z: "-1.108", q_el_d: "0.0853" });
// Zijgevel, zone A, e = 20: strook [3; 5] over A (tot e/5 = 4) en B: 0,8525·(−1,2 − 0,8 − 0,2·2) = −2,046.
fouten += toets("zijgevel, element over A en B", W(1, 10, { b_bel: "2", x_el: "3", b_geb: "20" }), { q_el_z: "-2.046" });
// Gevel zone D, b = 1,5 m: q_z = (0,8 − 0,2)·0,8525·1,5 = 0,7673; q_d = (0,8 + 0,3)·1,279 = 1,407.
// Met c_s·c_d = 0,9: (0,72 − 0,2)·1,279 = 0,6650 en (0,72 + 0,3)·1,279 = 1,304.
fouten += toets("gevel zone D", W(4, 10, { b_bel: "1.5" }), { q_el_z: "0.7673", q_el_d: "1.407" });
fouten += toets("gevel zone D, c_s·c_d = 0,9", W(4, 10, { b_bel: "1.5", bouwwerkfactor: "3", cs_cd: "0.9" }),
  { q_el_z: "0.6650", q_el_d: "1.304" });

// ── Sneeuw ───────────────────────────────────────────────────────────────────
const sneeuw = blad("en1991Sneeuwbelasting");
const S = (v) => reken(sneeuw, v, PROJECT);

// Plat dak: 0,8·1,0·1,0·0,7 = 0,56.
fouten += toets("sneeuw plat dak", S({ α: "0" }), { μ_1: "0.8", s: "0.56", s_maatgevend: "0.56" });
// Ontwerplevensduur 100 jaar (zie de kop): s_k = 1,1417·0,7 = 0,7992; s = 0,8·0,7992 = 0,6393 (gaf eerder 0,56).
fouten += toets("sneeuw plat dak, ontwerplevensduur 100 jaar", reken(sneeuw, { α: "0" }, { ...PROJECT, DesignLife: 100 }),
  { f_sn: "1.142", s_k: "0.7992", s: "0.6393" });
// 25 jaar: s_k blijft 0,7.
fouten += toets("sneeuw plat dak, ontwerplevensduur 25 jaar", reken(sneeuw, { α: "0" }, { ...PROJECT, DesignLife: 25 }), { s_k: "0.7", s: "0.56" });
// α = 40°: μ_1 = 0,8·(60 − 40)/30 = 0,5333 → 0,3733 (gaf eerder NaN).
fouten += toets("sneeuw α = 40°", S({ α: "40" }), { μ_1: "0.5333", s: "0.3733" });
// Kiel, ᾱ = 20°: μ_2 = 0,8 + 0,8·20/30 = 1,333 → 0,9333 (gaf eerder 0,8 → 0,56, en s_maatgevend = s).
fouten += toets("sneeuw kiel ᾱ = 20°", S({ α: "20", ophoping: "1", α_1: "20", α_2: "20" }), { μ_2: "1.333", s_2: "0.9333", s_maatgevend: "0.9333" });
// Kiel, ᾱ = 40°: μ_2 = 1,6 → 1,12.
fouten += toets("sneeuw kiel ᾱ = 40°", S({ α: "40", ophoping: "1", α_1: "30", α_2: "50" }), { μ_2: "1.6", s_2: "1.12", s_maatgevend: "1.12" });
// Hoger bouwdeel, h = 3, b_1 = 10, b_2 = 8, plat: μ_w = 18/6 = 3,0 (≤ 2·3/0,7 = 8,57; ≤ 4); l_s = 6 m; s_2 = 2,1.
fouten += toets("sneeuw tegen hoger bouwdeel", S({ α: "0", ophoping: "2", h_sp: "3", b_1: "10", b_2: "8", α_b: "0" }), { l_s: "6", μ_w: "3", μ_s: "0", μ_2: "3", s_2: "2.1", s_maatgevend: "2.1" });
// Idem, hoog dak 30°: μ_s = 0,8·10/6 = 1,333 (helft van 0,8·s_k·10 als driehoek over 6 m); μ_2 = 4,333; s_2 = 3,033.
fouten += toets("sneeuw hoger bouwdeel, dak 30°", S({ α: "0", ophoping: "2", h_sp: "3", b_1: "10", b_2: "8", α_b: "30" }), { μ_s: "1.333", μ_2: "4.333", s_2: "3.033" });
// μ_w-grenzen: h = 1, b_1 + b_2 = 30 → 15, maar ≤ 2·1/0,7 = 2,857.
fouten += toets("sneeuw μ_w begrensd op γh/s_k", S({ α: "0", ophoping: "2", h_sp: "1", b_1: "20", b_2: "10", α_b: "0" }), { μ_w: "2.857", l_s: "5" });
// Dakrand h = 1,0: 2·1/0,7 = 2,857 → 2,0; s_2 = 1,4; l_s = max(2; 5) = 5.
fouten += toets("sneeuw dakrand 1,0 m", S({ α: "0", ophoping: "3", h_ob: "1" }), { μ_2: "2", l_s: "5", s_2: "1.4" });
// Dakrand h = 0,5: 2·0,5/0,7 = 1,429 → s_2 = 1,0.
fouten += toets("sneeuw dakrand 0,5 m", S({ α: "0", ophoping: "3", h_ob: "0.5" }), { μ_2: "1.429", s_2: "1" });

// Hoger bouwdeel met b_2 < l_s: zie de kop.
const HB = { α: "0", ophoping: "2", h_sp: "3.5", b_1: "9.6", b_2: "4.8", α_b: "40" };
fouten += toets("sneeuw hoger bouwdeel, b_2 < l_s, element tegen de wand", S({ ...HB, b_sn: "1", x_sn: "0" }),
  { l_s: "7", μ_w: "2.057", μ_s: "0.7314", μ_2: "2.789", s_2: "1.952", μ_eind: "1.425", s_eind: "0.9975", q_sn: "1.853" });
// Strook [4,2; 4,8]: s in het midden 0,7·(2,789 − 1,989·4,5/7) = 1,0571 → 0,6343 kN/m.
fouten += toets("sneeuw hoger bouwdeel, element bij het einde van het lagere dak", S({ ...HB, b_sn: "0.6", x_sn: "4.2" }), { q_sn: "0.6343" });
// Strook [4,4; 5,0], afgekapt op b_2 = 4,8: 0,56·0,4 + 1,392·((4,8 − 4,8²/14) − (4,4 − 4,4²/14)) = 0,224 + 1,392·0,1371 = 0,4149.
fouten += toets("sneeuw hoger bouwdeel, strook voorbij het lagere dak", S({ ...HB, b_sn: "0.6", x_sn: "4.4" }), { q_sn: "0.4149" });
// Kiel, α_1 = 32°, α_2 = 26°: geval (i) μ_1 = 0,8·28/30 = 0,7467 en 0,8; geval (ii) ᾱ = 29° → μ_2 = 0,8 + 0,8·29/30 = 1,573,
// s_2 = 1,101 (met μ_2 per dakvlak zou het 1,12 en 1,045 zijn; figuur 5.3 rekent met ᾱ).
// Element in de kiel op het vlak van 32°, l_k = 5: 0,5227 + (1,1013 − 0,5227)·(1 − 1/10) = 1,043.
fouten += toets("sneeuw kiel, α_1 = 32°, α_2 = 26°", S({ α: "32", ophoping: "1", α_1: "32", α_2: "26", b_sn: "1", x_sn: "0", l_k: "5" }),
  { μ_1_α1: "0.7467", μ_1_α2: "0.8", α_gem: "29", μ_2: "1.573", s_2: "1.101", q_sn: "1.043" });
// Dakrand h = 1 (μ_2 = 2, l_s = 5): strook [2; 3], s in het midden 0,56 + 0,84·(1 − 2,5/5) = 0,98.
fouten += toets("sneeuw dakrand, element op 2 m", S({ α: "0", ophoping: "3", h_ob: "1", b_sn: "1", x_sn: "2" }), { q_sn: "0.98" });
// Zonder ophoping: 0,56·1,2 = 0,672.
fouten += toets("sneeuw zonder ophoping, lijnlast", S({ α: "0", b_sn: "1.2" }), { q_sn: "0.672" });

// ── Opgelegde belasting op een dak ───────────────────────────────────────────
const gebruik = blad("en1991Gebruiksbelasting");
const G = (v) => reken(gebruik, v, PROJECT);
// 17°: 4 − 0,2·17 = 0,6 (gaf eerder een foutmelding); direct onder het dakbeschot 2,0 kN.
fouten += toets("dak 17°, direct onder het dakbeschot", G({ daktype: "1", α_dak: "17", dakelement: "1" }), { q_dak: "0.6", Q_dak: "2" });
// 10°: 1,0.  30°, overige elementen: q = 0 maar Q_k = 1,5 kN (gaf eerder 0 kN).
fouten += toets("dak 10°", G({ daktype: "1", α_dak: "10", dakelement: "1" }), { q_dak: "1", Q_dak: "2" });
fouten += toets("dak 30°, overige elementen", G({ daktype: "1", α_dak: "30", dakelement: "2" }), { q_dak: "0", Q_dak: "1.5" });
// Vloer C2 met wand 1-2 kN/m: 4,0 + 0,8 = 4,8; Q_k = 7.
fouten += toets("vloer C2 met scheidingswand", G({ gebruikscategorie: "8", scheidingswand: "2" }), { q_k: "4", Q_k: "7", q_totaal: "4.8" });
// C, omsloten afzonderlijke verkeersruimte, niet C5 (tabel NB.1 – 6.2): q_k = 5,0, Q_k = 3 (ontbrak eerder).
fouten += toets("vloer C, omsloten verkeersruimte", G({ gebruikscategorie: "15" }), { q_k: "5", Q_k: "3", q_totaal: "5" });

afronden(fouten, "EN 1991 belastingen");
