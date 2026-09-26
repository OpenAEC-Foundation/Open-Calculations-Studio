/**
 * Controlescript voor wat het gordingblad naast de referentie-uitwerking toetst.
 *
 * Geen referentieblad: elke verwachting hieronder is met de hand nagerekend,
 * de rekensom staat erbij. Alle gevallen gaan uit van het basisgeval van
 * check-gording.mjs (85×250 C24, dak 4500 × 3000, dagmaat 5000, CC2).
 *
 *   A  k_r buiten 0 < k_r ≤ 1 (stijf beschot): geen reductie, k_r = 1
 *   B  k_r binnen het geldigheidsgebied: de reductie blijft staan
 *   C  plat dak, opwaartse wind: combinatie 0,9·G + 1,5·W met c_pi = +0,2,
 *      kip van de onderrand en de verankeringskracht
 *   D  6.10a: kanttekening in de referentie-rekenwijze, toets in de norm-stand
 *   E  oplegdruk §6.1.5
 *   F  de getallen die het parametrisch beeld van het blad leest
 *   G  zonder dubbele buiging stuurt 6.12 de keuze van de combinatie niet
 *
 * Draaien:  node scripts/check-gording-aanvullend.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("gording.ts");
const PROJECT = { CC: 2, K_FI: 1, rekenwijze: 1, windgebied: 2, terreincategorie: 2 };
const NORM = { ...PROJECT, rekenwijze: 0 };

const BASIS = {
  profiel: "5", sterkteklasse: "2", klimaatklasse: "1", dakType: "2",
  l_h: "4500", h_v: "3000", L_dag: "5000", a_opl: "75", n_gording: "3",
  t_beschot: "18", I_manual: "1", I_beschot: "486000", E_beschot: "5000",
  g_pannen: "0.8", g_panlat: "0", g_dakplaat: "0", g_plafond: "0",
  q_par: "1", Q_k: "2", q_var: "0", s_k: "0.70",
  windbron: "0", z_wind: "9", q_wind_hand: "0.822", c_pe_zuig: "-0.7",
  controleer: "1", grensfactor: "0.004", dubbele: "1",
};

/** De u.c.'s uit de conclusieregels, zoals check-gording.mjs ze leest. */
function ucsUitTekst(text) {
  const uit = {};
  const sleutel = { "w,y": "UC_wy", "w,z": "UC_wz", "6.11": "UC_611", "6.12": "UC_612" };
  for (const m of text.matchAll(/UC\s*(w,y|w,z|6\.11|6\.12)[^0-9]{0,140}?([\d.]+)\s*(≤|>)/g)) {
    uit[sleutel[m[1]]] = parseFloat(m[2]);
  }
  return uit;
}

let fouten = 0;
const geval = (naam, invoer, project, verwacht) => {
  const got = reken(tpl, { ...BASIS, ...invoer }, project);
  fouten += toets(naam, got, verwacht, {}, ucsUitTekst(got.text));
  return got;
};
const eis = (naam, ok) => {
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${naam}`);
};

// ── A. k_r buiten het geldigheidsgebied ──────────────────────────────────────
// 7 gordingen: hoh = 5408,3/8 = 676,0 mm. Beschot I = 10 416 667 mm⁴, E = 11 000:
//   k_r,0 = 0,37 + 0,8·0,676 − 11000·10416667/5·10¹⁰ = 0,37 + 0,541 − 2,292 = −1,381
// buiten 0 < k_r ≤ 1, dus k_r = 1 en de volle 2 kN:
//   Mc_y = 2·0,8321·5,075/4 = 2,111 kNm    Mc_z = 2·0,5547·5,075/4 = 1,408 kNm
//   q_gy = 0,676·0,6656 + 0,1169·0,8321 = 0,547 kN/m → M_gy = 0,547·5,075²/8 = 1,762 kNm
//   q_gz = (5,408·0,4438 + 7·0,1169·0,5547 − 1)/7 = 0,265 kN/m → M_gz = 0,853 kNm
//   M_y,d = 1,2·1,762 + 1,5·2,111 = 5,281    M_z,d = 1,2·0,853 + 1,5·1,408 = 3,135
//   6.12 = 0,7·(5,281e6/885400)/16,62 + (3,135e6/301000)/18,61 = 0,251 + 0,560 = 0,81
// (voorheen k_r = −1,381, de puntlast werkte opwaarts en 6.12 bleef op 0,47)
geval("A — k_r,0 = −1,381 (stijf beschot): geen reductie",
  { n_gording: "7", I_beschot: "10416667", E_beschot: "11000" }, PROJECT,
  { k_r_0: "-1.381", k_r: "1.000", Mc_y: "2.111", Mc_z: "1.408", UC_612: "0.81" });

// ── B. k_r binnen het geldigheidsgebied ──────────────────────────────────────
// I automatisch uit t = 18 mm: 1000·18³/12 = 486 000 mm⁴, E = 5000:
//   k_r = 0,37 + 0,8·0,676 − 5000·486000/5·10¹⁰ = 0,37 + 0,5408 − 0,0486 = 0,862
geval("B — k_r = 0,862 (formule NB.5.1 geldig, reductie blijft)",
  { n_gording: "7", I_manual: "0", t_beschot: "18", E_beschot: "5000" }, PROJECT,
  { k_r: "0.862" });

// ── C. Plat dak, opwaartse wind ──────────────────────────────────────────────
// 71×196 C24, L_th = 3500 + 75 = 3575, l_h 7500 met 3 gordingen: hoh = 1875.
// g = 0,25 kN/m²; windgebied I, terreincategorie 0, z = 6 m:
//   c_r = 0,1617·ln(6/0,005) = 1,146, v_m = 33,82, I_v = 0,141 → q_p = 1,421 kN/m²
// Zuiging met c_pe = −0,7 en c_pi = +0,2:
//   P_w,op = −0,9·1,421 = −1,279    q_w,op = 1,875·−1,279 = −2,398 kN/m
//   M_w,op = −2,398·3,575²/8 = −3,831 kNm
//   g_eig = 13916 mm²·5,5 = 0,0765 kN/m → q_gy = 1,875·0,25 + 0,0765 = 0,545 kN/m
//   M_gy = 0,545·3,575²/8 = 0,871 kNm    V_gy = 0,545·3,575/2 = 0,975 kN
//   M_y,d = 0,9·0,871 − 1,5·3,831 = −4,963 kNm → σ = 4,963e6/454600 = 10,92 N/mm²
//   6.11 = 10,92/16,62 = 0,66 (combinatie 5 maatgevend; voorheen viel hij weg en stond 0,49)
// Kip: l_ef = 0,9·3575 − 0,5·196 = 3120; σ_crit = 0,78·71²·7400/(196·3120) = 47,6
//   λ_rel = √(24/47,6) = 0,71 ≤ 0,75 → k_crit = 1 → UC_kip = 0,66
// Verankering: F_t,d = −(0,9·0,975 − 1,5·2,398·3,575/2) = 5,55 kN per oplegging
geval("C — plat dak, 0,9·G + 1,5·W opwaarts",
  { dakType: "1", profiel: "3", L_dag: "3500", l_h: "7500", g_pannen: "0.25",
    windbron: "1", z_wind: "6" },
  { ...PROJECT, windgebied: 1, terreincategorie: 1 },
  { q_p: "1.421", P_w_op: "-1.279", q_w_op: "-2.398", M_w_op: "-3.831",
    l_ef: "3120", "σ_m_crit": "47.6", k_crit: "1.00", "σ_m_y_d_5": "10.92",
    UC_611: "0.66", UC_kip: "0.66", F_t_d: "5.55" });

// ── D. 6.10a ─────────────────────────────────────────────────────────────────
// document7 (nok 6000, α = 53,1°). 6.10a: 1,35·G met k_mod = 0,60 (blijvend):
//   M_y = 1,35·3,123 = 4,216 kNm    M_z = 1,35·4,379 = 5,912 kNm
//   6.11 = (4,216e6/885400)/11,08 + 0,7·(5,912e6/301000)/12,41 = 0,430 + 1,108 = 1,54
//   6.12 = 0,7·(4,216e6/885400)/11,08 + (5,912e6/301000)/12,41 = 0,301 + 1,583 = 1,88
// De referentie-rekenwijze telt 6.10a niet (6.12 = 1,77 uit 6.10b) en zet de
// 6.10a-uitkomst als kanttekening op het blad. De norm-stand toetst hem wel:
// met ρ_mean = 420 kg/m³ en g = 9,81 wordt M_y = 4,140, M_z = 5,810 en
//   6.12 = 0,7·4,676/11,08 + 19,30/12,41 = 0,295 + 1,555 = 1,85
const d7 = geval("D — document7, referentie-rekenwijze: 6.10a als kanttekening",
  { h_v: "6000" }, PROJECT, { UC_611: "1.45", UC_612: "1.77" });
const kant = d7.text.match(/meegeteld zou \(6\.11\) = ([\d.]+) en \(6\.12\) = ([\d.]+)/);
eis(`kanttekening 6.10a: (6.11) ${kant?.[1]} ≈ 1,54 en (6.12) ${kant?.[2]} ≈ 1,88`,
  !!kant && Math.abs(kant[1] - 1.54) <= 0.005 && Math.abs(kant[2] - 1.88) <= 0.005);
const d7n = geval("D — document7, norm-stand: 6.10a telt mee", { h_v: "6000" }, NORM,
  { UC_611: "1.51", UC_612: "1.85" });
eis("norm-stand: geen kanttekening", !/meegeteld zou/.test(d7n.text));
const d1 = reken(tpl, BASIS, PROJECT);
eis("document1: 6.10a lager dan 6.10b, geen kanttekening", !/meegeteld zou/.test(d1.text));

// ── E. Oplegdruk §6.1.5 ──────────────────────────────────────────────────────
// document1: maatgevend combinatie 4, V_z,d = 1,2·2,531 + 1,5·2,820 = 7,267 kN.
//   l_ef = 75 + 30 = 105 mm (alleen aan de binnenzijde); A_ef = 85·105 = 8925 mm²
//   σ_c,90,d = 7267/8925 = 0,814 N/mm²; f_c,90,d = 0,9·2,5/1,3 = 1,731 N/mm²
//   l_1 = 5000 ≥ 2h = 500 → k_c,90 = 1,5 → UC = 0,814/(1,5·1,731) = 0,31
geval("E — document1, oplegdruk", {}, PROJECT,
  { "l_ef_c90": "105", "σ_c_90_d": "0.814", "f_c_90_d": "1.731", k_c_90: "1.5", UC_c90: "0.31" });

// ── F. Wat het parametrisch beeld van het blad leest ─────────────────────────
// GordingDesigner.tsx toont de u.c.'s uit de uitwerking en rekent zelf niets.
// Ontbreekt een naam als zichtbare uitkomst, dan staat er in het beeld "—".
const NODIG = ["UC_611", "UC_612", "UC_afsch", "UC_c90", "UC_kip", "UC_wy", "UC_wz", "UC_max", "μ_1", "q_wind"];
const ontbreekt = NODIG.filter((n) => d1.values[n] === undefined);
eis(`beeld: ${NODIG.join(", ")} staan op het blad` + (ontbreekt.length ? ` — ontbreekt: ${ontbreekt.join(", ")}` : ""),
  ontbreekt.length === 0);
const zelf = reken(tpl, { ...BASIS, windbron: "1" }, PROJECT);
eis("beeld: q_p staat op het blad als het blad hem berekent", zelf.values.q_p !== undefined);

// ── G. Zonder dubbele buiging kiest de referentie-rekenwijze op 6.11 ─────────
// document7 met dubbele = 0: 6.12 wordt niet getoetst en mag de keuze van de
// combinatie dus niet sturen (anders wint de puntlast op zijn 6.12 van 1,77).
//   g_eig = 0,1169 kN/m; q_gy = 1,875·0,8·0,6 + 0,1169·0,6 = 0,970 kN/m
//   M_gy = 0,970·5,075²/8 = 3,123 kNm    M_wy = 1,875·0,822·5,075²/8 = 4,962 kNm
//   combinatie 4: M_y,d = 1,2·3,123 + 1,5·4,962 = 11,19 kNm → 11,19e6/885400 = 12,64
//   6.11 = 12,64/16,62 = 0,76 (combinatie 2 met de puntlast: 6,03 kNm → 0,41)
geval("G — document7 zonder dubbele buiging: 6.11 uit combinatie 4",
  { h_v: "6000", dubbele: "0" }, PROJECT, { UC_611: "0.76" });

afronden(fouten, "Gording (aanvullend)");
