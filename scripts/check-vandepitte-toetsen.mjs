/**
 * Controlescript voor de bladen van templates/vandepitte.ts.
 *
 * Geen referentieblad; elke verwachting is een handberekening, hieronder bij
 * de set uitgeschreven. Het gaat vooral om de plekken waar een blad een
 * oordeel geeft: knik met χ of k_c in plaats van de Eulerlast, schuifspanning
 * tegen de materiaalsterkte (staal: f_y uit tabel 3.1 naar de dikte, boven
 * 80 mm geen oordeel "voldoet"), Mohr met θ_B = PaL/3EI en a_C voor hetzelfde
 * lastgeval, de eigenfrequentie bij de gekozen randvoorwaarde, het vakwerk
 * als Warrenvakwerk met n velden.
 *
 * Draaien:  node scripts/check-vandepitte-toetsen.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { reken, toets, afronden } from "./lib/refcheck.mjs";

const BRON = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../packages/desktop/src/templates/vandepitte.ts"),
  "utf8",
);

/** Eén blad uit een bestand met meerdere `export const x = \`…\`;`. */
function blad(naam) {
  const kop = `export const ${naam} = \``;
  const i = BRON.indexOf(kop);
  if (i < 0) throw new Error(`blad ${naam} niet gevonden`);
  return BRON.slice(i + kop.length, BRON.indexOf("`;", i + kop.length));
}

const PROJECT = { CC: 2, K_FI: 1, rekenwijze: 1 };
let fouten = 0;

/** Het oordeel in de slotzin, zoals de rapportkop het leest. */
function oordeel(naam, got, wil, melding) {
  const i = got.text.lastIndexOf("Maatgevende UC");
  const zin = i < 0 ? "" : got.text.slice(i, i + 240);
  const ons = /voldoe[nt] niet/.test(zin) ? "voldoet niet" : /voldoe[nt]/.test(zin) ? "voldoet" : "—";
  const ok = ons === wil && (!melding || melding.test(got.text));
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    ${naam}: ons ${ons}, hand ${wil}${melding ? `, melding ${melding.source}` : ""}`);
}

// ── Knik ─────────────────────────────────────────────────────────────────────
const knik = blad("vandepitteKnikken");
const K = { randvoorwaarden: "1.0", b: "100", h: "100", l: "3" };
// S235, 40×100, l_k = 1 m, kromme c (α = 0,49); t = 40 mm → f_y = 235 (tabel 3.1):
//   P_E = π²·210000·5,333·10⁵/1000² = 1105 kN;  λ̄ = √(4000·235/1105·10³) = 0,9222
//   Φ = 0,5·(1 + 0,49·0,7222 + 0,9222²) = 1,1021;  χ = 1/(1,1021 + √(1,1021² − 0,9222²)) = 0,5863
//   N_b,Rd = 0,5863·4000·235 = 551,1 kN;  UC bij 500 kN = 0,9073 (op de Eulerlast was het 0,45)
{
  const got = reken(knik, { ...K, b: "40", l: "1", N_Ed: "500" }, PROJECT);
  fouten += toets("knik S235, 40 × 100, kromme c", got,
    { f_y: "235", P_E: "1105", λ_rel: "0.9222", χ: "0.5863", N_bRd: "551.1", UC_max: "0.9073" });
  oordeel("t = 40 mm", got, "voldoet");
}
// S355, ronde staaf D = 60, l = 1 m, kromme c: t = 60 mm → f_y = 335 (tabel 3.1, 40 < t ≤ 80).
//   A = 2827 mm², I = 636 200 mm⁴ → P_E = 1318,5 kN; λ̄ = √(2827·335/1 318 540) = 0,8476
//   Φ = 0,5·(1 + 0,49·0,6476 + 0,7184) = 1,0178; χ = 0,6323; N_b,Rd = 0,6323·2827·335 = 598,9 kN
//   UC bij 600 kN = 1,002: voldoet niet (met f_y = 355 was het 619,1 kN en UC 0,969). Het blad
//   drukt vier cijfers af: P_E 1319 en N_b,Rd 599.
{
  const got = reken(knik, { ...K, doorsnedevorm: "2", D: "60", l: "1", materiaal: "3", N_Ed: "600" }, PROJECT);
  fouten += toets("knik S355, rond 60 mm: 40 < t ≤ 80", got,
    { f_y: "335", P_E: "1319", λ_rel: "0.8476", χ: "0.6323", N_bRd: "599", UC_max: "1.002" });
  oordeel("t = 60 mm", got, "voldoet niet");
}
// S235, 100×100, l = 3 m: t = 100 mm > 80 → tabel 3.1 geeft geen f_y (productnorm, NB bij
// 3.2.1(1)); het blad keurt af. P_E hangt niet van f_y af: π²·210000·8,333·10⁶/3000² = 1919 kN.
{
  const got = reken(knik, { ...K, N_Ed: "500" }, PROJECT);
  fouten += toets("knik S235, 100 × 100: t > 80 mm", got, { P_E: "1919" });
  oordeel("t = 100 mm", got, "voldoet niet", /tabel 3\.1 van NEN-EN 1993-1-1 geeft geen f/);
}
// C24, kort, klimaatklasse 1: E_0,05 = 7400 → P_E = π²·7400·8,333·10⁶/3000² = 67,63 kN
//   λ_rel = 103,9/π·√(21/7400) = 1,762;  k = 0,5·(1 + 0,2·1,462 + 1,762²) = 2,199
//   k_c = 1/(2,199 + √(2,199² − 1,762²)) = 0,2846;  f_c,0,d = 0,9·21/1,3 = 14,54
//   N_b,Rd = 0,2846·10000·14,54 = 41,37 kN
fouten += toets("knik C24, kort", reken(knik, { ...K, materiaal: "4", belastingduurklasse: "4", N_Ed: "30" }, PROJECT),
  { P_E: "67.63", λ_rel: "1.762", k_c: "0.2846", N_bRd: "41.37", UC_max: "0.7251" });

// ── Schuifspanning ───────────────────────────────────────────────────────────
const schuif = blad("vandepitteSchuifspanning");
const SR = { b: "200", h: "400", L: "6", q: "25" };
// V = 25·6/2 = 75 kN; τ = 1,5·75000/(200·400) = 1,406.
// C24, middellang, rechthoek: k_cr = 1,0 (NB art. 6.1.7(2), prismatische doorsnede);
//   f_v,d = 0,8·4,0/1,3 = 2,462; τ_d = 1,406/1,0 = 1,406; UC = 1,406/2,462 = 0,5713
//   (met k_cr = 0,67 was het 2,099 en 0,853).
fouten += toets("schuif C24, middellang", reken(schuif, { ...SR, materiaal: "4", belastingduurklasse: "3" }, PROJECT),
  { V_Ed: "75", τ_max: "1.406", f_vd: "2.462", k_cr: "1.0", τ_d: "1.406", UC_max: "0.5713" });
// Dezelfde doorsnede als I-profiel ingevoerd (I_z = 200·400³/12, S = 200·400²/8, t = 200): de
// flensbreedte is onbekend, dus de ondergrens k_cr = 0,8 (NB art. 6.1.7(2));
//   τ_d = 1,406/0,8 = 1,758; UC = 1,758/2,462 = 0,7141.
fouten += toets("schuif C24, middellang, I-profiel",
  reken(schuif, { profieltype: "2", I_z: "1066666667", S_zmax: "4000000", t: "200", L: "6", q: "25", materiaal: "4", belastingduurklasse: "3" }, PROJECT),
  { τ_max: "1.406", k_cr: "0.8", τ_d: "1.758", UC_max: "0.7141" });
// S235, 20 × 400 (t = 20 mm): τ = 1,5·75 000/8000 = 14,06; τ_Rd = 235/√3 = 135,7; UC = 0,1036.
{
  const got = reken(schuif, { ...SR, b: "20", materiaal: "1" }, PROJECT);
  fouten += toets("schuif S235, 20 × 400", got, { τ_max: "14.06", τ_Rd: "135.7", UC_max: "0.1036" });
  oordeel("t = 20 mm", got, "voldoet");
}
// S355, 50 × 400 (t = 50 mm): f_y = 335 (tabel 3.1, 40 < t ≤ 80); τ = 1,5·75 000/20 000 = 5,625;
// τ_Rd = 335/√3 = 193,4; UC = 0,02908 (met 355: 205,0 en 0,02744).
fouten += toets("schuif S355, 50 × 400: 40 < t ≤ 80", reken(schuif, { ...SR, b: "50", materiaal: "3" }, PROJECT),
  { f_y: "335", τ_Rd: "193.4", UC_max: "0.02908" });
// S235, 200 × 400: t = 200 mm > 80 → buiten tabel 3.1, het blad keurt af.
oordeel("schuif S235, 200 × 400: t > 80 mm", reken(schuif, { ...SR, materiaal: "1" }, PROJECT), "voldoet niet",
  /tabel 3\.1 van NEN-EN 1993-1-1 geeft geen f/);
// Cirkel D = 200: A = 31416 mm²; τ = 4/3·75000/31416 = 3,183 (eerder met A = b·h).
fouten += toets("schuif cirkel", reken(schuif, { profieltype: "3", D: "200", L: "6", q: "25", materiaal: "0" }, PROJECT),
  { A: "31420", τ_max: "3.183" });

// ── Mohr ─────────────────────────────────────────────────────────────────────
const mohr = blad("vandepitteMohr");
const M = { L: "6", a: "2", E: "210000", I: "83560000", P: "10", q: "10" };
// EI = 1,755·10¹³ Nmm².  P = 10 kN op C:
//   θ_B = 10000·2000·6000/(3·EI) = 0,00228 (eerder 0,00114: dat is θ_A)
//   a_C = 10000·2000²·8000/(3·EI) = 6,079 mm;  a_1 = −10000·2000·6000²/(16·EI) = −2,564
//   UC overstek 6,079/(2·2000/250) = 0,380 (eerder 0,253 tegen L/250)
fouten += toets("Mohr puntlast op C", reken(mohr, { ...M, belastinggeval: "1" }, PROJECT),
  { θ_B: "0.00228", a_C: "6.079", a_1: "-2.564", UC_overstek: "0.3799", UC_max: "0.3799" });
// q = 10 kN/m alleen op het overstek: a_C = q·a³·(3a + 4L)/(24EI) = 10·2000³·30000/(24·EI) = 5,699 (eerder 4,939)
fouten += toets("Mohr q op het overstek", reken(mohr, { ...M, belastinggeval: "2" }, PROJECT), { a_C: "5.699" });
// q op het veld: a_1 = 5·10·6000⁴/(384·EI) = 9,617; a_C = −10·6000³·2000/(24·EI) = −10,26 (omhoog)
fouten += toets("Mohr q op het veld", reken(mohr, { ...M, belastinggeval: "3" }, PROJECT), { a_1: "9.617", a_C: "-10.26", UC_max: "0.6411" });
// q op veld en overstek: a_1 = 9,617 − 2,564 = 7,052; a_C = q·a·(3a³ + 4a²L − L³)/(24EI) = −4,559
fouten += toets("Mohr q op veld en overstek", reken(mohr, { ...M, belastinggeval: "4" }, PROJECT), { a_1: "7.052", a_C: "-4.559" });
// Grens 0,003·ℓ (vloer, A1.4.3(3) van de NB): v_veld = 18 mm, v_overstek = 0,003·4000 = 12 mm;
// UC = max(9,617/18; 10,26/12) = max(0,5343; 0,8548) = 0,8548 (bij 0,004: 0,6411).
fouten += toets("Mohr q op het veld, grens 0,003", reken(mohr, { ...M, belastinggeval: "3", grensfactor: "0.003" }, PROJECT),
  { v_veld: "18", v_overstek: "12", UC_veld: "0.5343", UC_max: "0.8548" });

// ── Eigenfrequentie ──────────────────────────────────────────────────────────
const freq = blad("vandepitteEigenfrequentie");
const F = { E: "210000", I: "83560000", L: "6", m: "500", m_bar: "50" };
// Kraagbalk: K = 3·EI/L³ = 243,7 N/mm; f = √(243700/500)/2π = 3,514 Hz.
fouten += toets("frequentie kraagbalk met puntmassa", reken(freq, { ...F, systeem: "1" }, PROJECT), { K: "243.7", f: "3.514" });
// Verdeelde massa: √(EI/(m̄L⁴)) = √(1,755·10⁷/(50·6⁴)) = 16,46 s⁻¹.
// Scharnierend: π²/2π·16,46 = 25,85 Hz; kraagligger 1,875²/2π·16,46 = 9,208 Hz (eerder altijd 4,730: 58,6 Hz).
fouten += toets("frequentie verdeelde massa, scharnierend", reken(freq, { ...F, systeem: "3", randvoorwaarde: "3.1416" }, PROJECT), { f: "25.85" });
fouten += toets("frequentie verdeelde massa, kraagligger", reken(freq, { ...F, systeem: "3", randvoorwaarde: "1.875" }, PROJECT), { f: "9.208" });

// ── Doorbuiging met dwarskracht ──────────────────────────────────────────────
// C24, 200×400, L = 5 m, q = 15: v_2 = 5·15·5000⁴/(384·11000·1,0667·10⁹) = 10,40;
// v_1 = 1,2·15·5000²/(8·690·80000) = 1,019; aandeel 8,92 % — dus geen "kleiner dan 3 %".
const door = reken(blad("vandepitteDoorbuiging"), { materiaal: "3", b: "200", h: "400", L: "5", q: "15" }, PROJECT);
fouten += toets("doorbuiging C24", door, { v_2: "10.40", v_1: "1.019", p_V: "8.921", UC_max: "0.5711" });
{
  const ok = !door.text.includes("kleiner dan 3");
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} geen oordeel "verwaarloosbaar" bij 8,9 %`);
}
// Vloer met scheurgevoelige scheidingswanden, grens 0,002·L (A1.4.3(3) van de NB): v_toel = 10 mm;
// UC = 11,42/10 = 1,142 (met de standaardgrens 0,004·L: 0,571).
fouten += toets("doorbuiging C24, grens 0,002", reken(blad("vandepitteDoorbuiging"),
  { materiaal: "3", b: "200", h: "400", L: "5", q: "15", grensfactor: "0.002" }, PROJECT), { v_toel: "10", UC_max: "1.142" });
// I-profiel (IPE 300): λ = 5381/1978 = 2,720; v_1 = 2,720·50·3000²/(8·81000·5381) = 0,3511.
fouten += toets("doorbuiging I-profiel", reken(blad("vandepitteDoorbuiging"),
  { materiaal: "1", doorsnedevorm: "2", A: "5381", A_lijf: "1978", I: "83560000", L: "3", q: "50" }, PROJECT),
  { λ: "2.720", v_1: "0.3511" });

// ── Virtuele arbeid ──────────────────────────────────────────────────────────
// Warrenvakwerk zonder verticalen, L = 12 m, H = 2 m, E = 210000, A_rand = 2000, A_diag = 1000, F = 100 kN.
// Twee velden (l_v = 6 m): één bovenrandstaaf N = F·L/4H = 150 kN, twee onderrandstaven F·L/8H = 75 kN,
// vier diagonalen F/2·L_d/H = 90,14 kN met L_d = √(2² + 3²) = 3,606 m. Σ N·n·L/EA met n = N/F:
//   boven 150000·1,5·6000/(210000·2000) = 3,214;  onder 2·75000·0,75·6000/(210000·2000) = 1,607
//   diagonalen 4·90139·0,9014·3606/(210000·1000) = 5,580;  totaal 10,40 mm
// (het oude model gaf 15,65: randen twee tot vier keer, diagonalen half; met een stijfheidsmatrix nagerekend).
const vakwerk = blad("vandepitteVirtueleArbeid");
const V = { L: "12", H: "2", E: "210000", A_boven: "2000", A_onder: "2000", A_diag: "1000", F: "100" };
fouten += toets("vakwerk, twee velden", reken(vakwerk, { ...V, n_v: "2" }, PROJECT),
  { N_boven: "-150", N_onder: "75", N_diag: "90.14", δ_boven: "3.214", δ_onder: "1.607", δ_diag: "5.580", δ_totaal: "10.40",
    v_toel: "36", UC_max: "0.2889" });
// Standaardgrens 0,003·L = 36 mm (de vroegere vaste L/300 = 40 mm is geen NB-waarde); als dakligger 0,004·L = 48 mm: 0,2167.
fouten += toets("vakwerk, twee velden, grens 0,004", reken(vakwerk, { ...V, n_v: "2", grensfactor: "0.004" }, PROJECT),
  { v_toel: "48", UC_max: "0.2167" });
// Zes velden (l_v = 2 m, L_d = √5 = 2,236 m); F·l_v³/(4H²E) = 100000·2000³/(4·2000²·210000) = 238,1 mm³:
//   boven Σk² = 1 + 4 + 9 + 4 + 1 = 19 → 238,1·19/2000 = 2,262
//   onder Σ(k − ½)² = 2·(0,25 + 2,25 + 6,25) = 17,5 → 238,1·17,5/2000 = 2,083
//   diagonalen 6·100000·2236³/(2·2000²·210000·1000) = 3,993;  totaal 8,338 mm
fouten += toets("vakwerk, zes velden", reken(vakwerk, { ...V, n_v: "6" }, PROJECT),
  { N_onder: "125", S_boven: "19", S_onder: "17.5", δ_totaal: "8.338" });
// Slanke diagonalen, A_diag = 200: 3,214 + 1,607 + 5·5,580 = 32,72 mm (het oude model gaf 26,81: te laag).
fouten += toets("vakwerk, slanke diagonalen", reken(vakwerk, { ...V, n_v: "2", A_diag: "200" }, PROJECT),
  { δ_diag: "27.90", δ_totaal: "32.72" });
{
  const oneven = reken(vakwerk, { ...V, n_v: "3" }, PROJECT);
  const ok = /Vul een even aantal velden in/.test(oneven.text) && /Maatgevende UC = ∞/.test(oneven.text);
  if (!ok) fouten++;
  console.log(`\nvakwerk, oneven aantal velden\n  ${ok ? "OK    " : "FOUT  "} melding en UC = ∞`);
}

afronden(fouten, "Vandepitte");
