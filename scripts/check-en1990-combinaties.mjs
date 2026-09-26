/**
 * Controlescript voor de bladen van templates/en1990.ts: de combinaties van
 * NEN-EN 1990 met NB.
 *
 * Geen referentieblad; elke verwachting is een handberekening, hieronder bij
 * de set uitgeschreven. ψ-factoren uit tabel NB.2 – A1.1, γ uit tabel NB.3,
 * NB.4 en NB.5.
 *
 * Draaien:  node scripts/check-en1990-combinaties.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { reken, toets, afronden } from "./lib/refcheck.mjs";

const BRON = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../packages/desktop/src/templates/en1990.ts"),
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
const BASIS = { G_ksup: "10", Q_k1: "5", Q_k2: "2" };
let fouten = 0;

// ── Fundamenteel ─────────────────────────────────────────────────────────────
const fund = blad("en1990Fundamenteel");

// CC2, Q_k1 en Q_k2 categorie A (ψ0 = 0,4):
//   6.10a   1,35·10 + 1,5·0,4·5 + 1,5·0,4·2 = 13,5 + 3,0 + 1,2 = 17,7
//   6.10b,1 1,2·10 + 1,5·5 + 1,5·0,4·2      = 12 + 7,5 + 1,2   = 20,7
//   6.10b,2 1,2·10 + 1,5·2 + 1,5·0,4·5      = 12 + 3,0 + 3,0   = 18,0
// (Het blad gaf eerder 19,5: ψ0,2 stond vast op 0.)
fouten += toets("fundamenteel, CC2, beide categorie A", reken(fund, BASIS, PROJECT),
  { E_610a: "17.7", E_610b_1: "20.7", E_610b_2: "18.0", E_d: "20.7" });
// Q_k2 wind (ψ0 = 0): 13,5 + 3,0 = 16,5 en 12 + 7,5 = 19,5 — de oude uitkomst.
fouten += toets("fundamenteel, Q_k2 wind", reken(fund, { ...BASIS, categorie_2: "10" }, PROJECT),
  { E_610a: "16.5", E_610b_1: "19.5", E_d: "19.5" });
// Q_k2 overheersend: Q_k1 = 1 (A, ψ0 0,4), Q_k2 = 5 (B, ψ0 0,5):
//   6.10b,1 12 + 1,5 + 1,5·0,5·5 = 17,25;  6.10b,2 12 + 7,5 + 1,5·0,4·1 = 20,1;  6.10a 13,5 + 0,6 + 3,75 = 17,85
fouten += toets("fundamenteel, Q_k2 overheersend", reken(fund, { G_ksup: "10", Q_k1: "1", Q_k2: "5", categorie_2: "2" }, PROJECT),
  { E_610a: "17.85", E_610b_1: "17.25", E_610b_2: "20.1", E_d: "20.1" });
// Categorie C, vluchtroute (ψ0 = 0,6, voetnoot a bij tabel NB.2 – A1.1): G = 300, Q_k1 = 50:
//   6.10a 1,35·300 + 1,5·0,6·50 = 405 + 45 = 450;  6.10b 1,2·300 + 1,5·50 = 435 → 450
//   (met ψ0 = 0,4 voor de overige delen van C: 6.10a = 435, E_d = 435).
fouten += toets("fundamenteel, categorie C vluchtroute", reken(fund,
  { G_ksup: "300", Q_k1: "50", Q_k2: "0", belastingcategorie: "11" }, PROJECT), { E_610a: "450", E_610b_1: "435", E_d: "450" });
fouten += toets("fundamenteel, categorie C overig", reken(fund,
  { G_ksup: "300", Q_k1: "50", Q_k2: "0", belastingcategorie: "3" }, PROJECT), { E_610a: "435", E_d: "435" });
// CC3 (tabel NB.5): 1,5·10 + 1,65·0,4·5 + 1,65·0,4·2 = 15 + 3,3 + 1,32 = 19,62; 1,3·10 + 1,65·5 + 1,32 = 22,57.
fouten += toets("fundamenteel, CC3", reken(fund, BASIS, { ...PROJECT, CC: 3, K_FI: 1.1 }),
  { E_610a: "19.62", E_610b_1: "22.57", E_d: "22.57" });
// Windzuiging op een licht dak: 0,9·0,3 − 1,5·0,8 = −0,93 (opwaarts).
fouten += toets("fundamenteel, Q_k1 tegen G in", reken(fund,
  { richting: "2", G_ksup: "0.3", G_kinf: "0.3", Q_k1: "0.8", Q_k2: "0", belastingcategorie: "10" }, PROJECT),
  { E_d: "0.405", E_d_inf: "-0.93" });

// ── Compleet ─────────────────────────────────────────────────────────────────
// UGT als hierboven; BGT met beide categorie A (ψ = 0,4 / 0,5 / 0,3):
//   kar   max(10 + 5 + 0,4·2; 10 + 2 + 0,4·5) = max(15,8; 14,0) = 15,8
//   freq  max(10 + 0,5·5 + 0,3·2; 10 + 0,5·2 + 0,3·5) = max(13,1; 12,5) = 13,1
//   qp    10 + 0,3·5 + 0,3·2 = 12,1
const compleet = blad("en1990Compleet");
fouten += toets("compleet, CC2, beide categorie A", reken(compleet, BASIS, PROJECT),
  { E_UGT: "20.7", E_kar: "15.8", E_freq: "13.1", E_qp: "12.1" });
fouten += toets("compleet, Q_k2 wind — de oude uitkomsten", reken(compleet, { ...BASIS, categorie_2: "10" }, PROJECT),
  { E_UGT: "19.5", E_kar: "15", E_freq: "12.5", E_qp: "11.5" });
// Q_k2 categorie C, vluchtroute (ψ = 0,6 / 0,7 / 0,6), Q_k1 categorie A:
//   UGT  6.10a 13,5 + 3,0 + 1,5·0,6·2 = 18,3;  6.10b,1 12 + 7,5 + 1,8 = 21,3;  6.10b,2 12 + 3 + 3 = 18 → 21,3
//   kar  max(10 + 5 + 0,6·2; 10 + 2 + 0,4·5) = 16,2;  freq max(10 + 2,5 + 0,6·2; 10 + 0,7·2 + 0,3·5) = 13,7
//   qp   10 + 0,3·5 + 0,6·2 = 12,7
fouten += toets("compleet, Q_k2 categorie C vluchtroute", reken(compleet, { ...BASIS, categorie_2: "11" }, PROJECT),
  { E_UGT: "21.3", E_kar: "16.2", E_freq: "13.7", E_qp: "12.7" });
// Q_k1 tegen G in: E_UGT = max(1,35·10 + 1,5·0,4·2; 1,2·10 + 1,5·2) = max(14,7; 15,0) = 15,0;
// E_UGT,inf = 0,9·8 − 1,5·5 = −0,3; BGT in de richting van G: 12 / 11 / 10,6.
// BGT tegen G in, Q_k1 categorie A (ψ1 = 0,5, ψ2 = 0,3): 8 − 5 = 3; 8 − 0,5·5 = 5,5; 8 − 0,3·5 = 6,5.
fouten += toets("compleet, Q_k1 tegen G in", reken(compleet, { ...BASIS, richting: "2", G_kinf: "8" }, PROJECT),
  { E_UGT: "15.0", E_UGT_inf: "-0.3", E_kar: "12", E_freq: "11", E_qp: "10.6", E_kar_inf: "3", E_freq_inf: "5.5", E_qp_inf: "6.5" });
// Windzuiging op een licht dak, wind (ψ1 = 0,2, ψ2 = 0): 0,3 − 0,8 = −0,5 (netto opwaarts); 0,3 − 0,2·0,8 = 0,14; 0,3.
fouten += toets("compleet, windzuiging op een licht dak", reken(compleet,
  { richting: "2", G_ksup: "0.3", G_kinf: "0.3", Q_k1: "0.8", Q_k2: "0", belastingcategorie: "10" }, PROJECT),
  { E_UGT_inf: "-0.93", E_kar_inf: "-0.5", E_freq_inf: "0.14", E_qp_inf: "0.3" });

// ── BGT ──────────────────────────────────────────────────────────────────────
fouten += toets("BGT, beide categorie A", reken(blad("en1990BGT"), { G_k: "10", Q_k1: "5", Q_k2: "2" }, PROJECT),
  { E_kar: "15.8", E_freq: "13.1", E_qp: "12.1" });

// ── EQU ──────────────────────────────────────────────────────────────────────
// Q_ki categorie B (ψ0 = 0,5): 1,1·5 + 1,5·3 + 1,5·0,5·2 = 11,5; 0,9·8 = 7,2; UC = 1,597.
// (Het blad gaf eerder 10,0 bij elke categorie: ψ0,i stond vast op 0.)
fouten += toets("EQU, Q_ki categorie B", reken(blad("en1990EQU"),
  { G_kdst: "5", G_kstb: "8", Q_k1dst: "3", Q_kidst: "2", belastingcategorie: "0.5" }, PROJECT),
  { E_d_dst: "11.5", E_d_stb: "7.2", UC_max: "1.597" });

// ── Buitengewoon, aardbeving, groep C, toetsing ──────────────────────────────
// Buitengewoon: Q_k1 met ψ2,1, alleen wind bij brand met ψ1,1 (tabel NB.10 – A1.3, voetnoot a).
// Brand, Q_k1 A (ψ2 = 0,3), Q_k2 A (ψ2 = 0,3): 10 + 20 + 1,5 + 0,6 = 32,1 (gaf eerder 33,1 met ψ1 = 0,5).
const bg = blad("en1990Buitengewoon");
fouten += toets("buitengewoon, brand", reken(bg, { G_k: "10", A_d: "20", Q_k1: "5", Q_k2: "2" }, PROJECT),
  { ψ_2_1: "0.3", E_d: "32.1" });
// Brand, Q_k1 wind (ψ1 = 0,2): 10 + 20 + 1,0 + 0,6 = 31,6.
fouten += toets("buitengewoon, brand met wind", reken(bg, { belastingcategorie: "7", G_k: "10", A_d: "20", Q_k1: "5", Q_k2: "2" }, PROJECT),
  { ψ_1_1: "0.2", E_d: "31.6" });
// Overige situatie, Q_k1 sneeuw (ψ2 = 0): 10 + 20 + 0 + 0,6 = 30,6 (gaf eerder 31,6 met ψ1 = 0,2).
fouten += toets("buitengewoon, overig met sneeuw", reken(bg,
  { type_buitengewoon: "3", belastingcategorie: "6", G_k: "10", A_d: "20", Q_k1: "5", Q_k2: "2" }, PROJECT), { E_d: "30.6" });
// Schok, Q_k1 C (ψ2 = 0,6), Q_k2 opslag (ψ2 = 0,8): 10 + 20 + 3,0 + 1,6 = 34,6.
fouten += toets("buitengewoon, schok", reken(bg,
  { type_buitengewoon: "2", belastingcategorie: "3", categorie_2: "0.8", G_k: "10", A_d: "20", Q_k1: "5", Q_k2: "2" }, PROJECT),
  { E_d: "34.6" });
// 10 + 15 + 0,3·5 + 0,3·2 = 27,1.
fouten += toets("aardbeving", reken(blad("en1990Aardbeving"), { G_k: "10", A_Ed: "15", Q_k1: "5", Q_k2: "2" }, PROJECT),
  { E_d: "27.1" });
// 1,0·10 + 1,3·5 + 1,3·0,4·2 = 17,54.
fouten += toets("groep C", reken(blad("en1990GroepC"), BASIS, PROJECT), { E_d: "17.54" });
// 100/120 = 0,8333.
fouten += toets("toetsing E_d ≤ R_d", reken(blad("en1990Rekenwaarden"), { E_d: "100", R_d: "120" }, PROJECT), { UC_max: "0.8333" });

// ── Referentieperiode uit de projectgegevens ─────────────────────────────────
// 50 jaar: factor 1 (het blad gaf eerder zonder keuze 5 jaar: 0,8465).
// 25 jaar: 1 + 0,6/9·ln(0,5) = 0,9538 → 4,769.  100 jaar: 1 + 0,6/9·ln 2 = 1,046 → 5,231.
const ref = blad("en1990Referentieperiode");
fouten += toets("referentieperiode 50 jaar", reken(ref, { F_t0: "5" }, PROJECT), { t: "50", factor: "1.000", F_t: "5.000" });
fouten += toets("referentieperiode 25 jaar", reken(ref, { F_t0: "5" }, { ...PROJECT, DesignLife: 25 }), { factor: "0.9538", F_t: "4.769" });
fouten += toets("referentieperiode 100 jaar", reken(ref, { F_t0: "5" }, { ...PROJECT, DesignLife: 100 }), { factor: "1.046", F_t: "5.231" });
// 10 jaar: de referentieperiode is ten minste 15 jaar (tabel NB.1 – 2.1): 1 + 0,6/9·ln(0,3) = 0,9197 → 1,75·0,9197 = 1,610
// (gaf eerder t = 10: 0,8927 → 1,562).
fouten += toets("referentieperiode 10 jaar → 15", reken(ref, { F_t0: "1.75" }, { ...PROJECT, DesignLife: 10 }), { t: "15", factor: "0.9197", F_t: "1.610" });
// Idem, categorie C vluchtroute (ψ0 = 0,6): 1 + 0,4/9·ln(0,3) = 0,9465.
fouten += toets("referentieperiode 10 jaar, categorie C vluchtroute", reken(ref, { F_t0: "1.75", belastingcategorie: "0.6" }, { ...PROJECT, DesignLife: 10 }),
  { ψ_0: "0.6", factor: "0.9465" });

afronden(fouten, "EN 1990 combinaties");
