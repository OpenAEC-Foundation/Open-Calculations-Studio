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
