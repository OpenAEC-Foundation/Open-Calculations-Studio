/**
 * Controlescript voor de bladen van templates/vandepitte.ts.
 *
 * Geen referentieblad; elke verwachting is een handberekening, hieronder bij
 * de set uitgeschreven. Het gaat vooral om de plekken waar een blad een
 * oordeel geeft: knik met χ of k_c in plaats van de Eulerlast, schuifspanning
 * tegen de materiaalsterkte, Mohr met θ_B = PaL/3EI en a_C voor hetzelfde
 * lastgeval, de eigenfrequentie bij de gekozen randvoorwaarde.
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

// ── Knik ─────────────────────────────────────────────────────────────────────
const knik = blad("vandepitteKnikken");
const K = { randvoorwaarden: "1.0", b: "100", h: "100", l: "3" };
// S235, 100×100, l_k = 3 m, kromme c (α = 0,49):
//   P_E = π²·210000·8,333·10⁶/3000² = 1919 kN;  λ̄ = √(10000·235/1919·10³) = 1,107
//   Φ = 0,5·(1 + 0,49·0,907 + 1,107²) = 1,334;  χ = 1/(1,334 + √(1,334² − 1,107²)) = 0,4808
//   N_b,Rd = 0,4808·10000·235 = 1130 kN;  UC bij 1500 kN = 1,328 (het blad gaf eerder 0,78 op de Eulerlast)
fouten += toets("knik S235, kromme c", reken(knik, { ...K, N_Ed: "1500" }, PROJECT),
  { P_E: "1919", λ_rel: "1.107", χ: "0.4808", N_bRd: "1130", UC_max: "1.328" });
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
// C24, middellang: f_v,d = 0,8·4,0/1,3 = 2,462; τ_d = 1,406/0,67 = 2,099; UC = 0,853 (eerder 0,014 tegen 100 N/mm²).
fouten += toets("schuif C24, middellang", reken(schuif, { ...SR, materiaal: "4", belastingduurklasse: "3" }, PROJECT),
  { V_Ed: "75", τ_max: "1.406", f_vd: "2.462", τ_d: "2.099", UC_max: "0.853" });
// S235: τ_Rd = 235/√3 = 135,7; UC = 1,406/135,7 = 0,01036.
fouten += toets("schuif S235", reken(schuif, { ...SR, materiaal: "1" }, PROJECT), { τ_Rd: "135.7", UC_max: "0.01036" });
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
// I-profiel (IPE 300): λ = 5381/1978 = 2,720; v_1 = 2,720·50·3000²/(8·81000·5381) = 0,3511.
fouten += toets("doorbuiging I-profiel", reken(blad("vandepitteDoorbuiging"),
  { materiaal: "1", doorsnedevorm: "2", A: "5381", A_lijf: "1978", I: "83560000", L: "3", q: "50" }, PROJECT),
  { λ: "2.720", v_1: "0.3511" });

// ── Virtuele arbeid ──────────────────────────────────────────────────────────
// Ongewijzigd model: 2·δ_boven + 2·δ_onder + 2·δ_diag = 15,65 mm bij de oude voorbeeldwaarden.
fouten += toets("vakwerk", reken(blad("vandepitteVirtueleArbeid"),
  { L: "12", H: "2", E: "210000", A_boven: "2000", A_onder: "2000", A_diag: "1000", F: "100" }, PROJECT),
  { δ_totaal: "15.65" });

afronden(fouten, "Vandepitte");
