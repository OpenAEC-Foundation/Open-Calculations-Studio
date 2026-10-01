/**
 * Controlescript voor de module Metselwerk loodrecht belast
 * (templates/metselwerkLoodrecht.ts): vier gevallen op één blad.
 *
 * Er is geen referentieberekening. Per geval staat hieronder een voorbeeld dat
 * met de hand is uitgewerkt; het blad moet die getallen geven. Daarna de takken
 * die het voorbeeld niet raakt (andere ondersteuning, verticale belasting,
 * cellenbeton, grenzen van de tabel en de grafieken, kantelen, trek) en een
 * rondgang langs elke keuze van elk geval: geen NaN, geen foutmelding, en
 * altijd een slotzin met "Maatgevende UC".
 *
 * Gemeenschappelijk: γ_M = 1,7 (categorie I, CC2, tabel NB-1); f_k = K·f_b^α·f_m^β
 * met K, α, β uit tabel NB-2; strook b = 1000 mm.
 *
 * Draaien:  node scripts/check-metselwerk-loodrecht.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("metselwerkLoodrecht.ts");
const PROJECT = { CC: 2, K_FI: 1.0, rekenwijze: 1 };

let fouten = 0;

/** De slotzin van het blad, vanaf "Maatgevende UC". */
function slotzin(got) {
  const i = got.text.lastIndexOf("Maatgevende UC");
  return i < 0 ? "" : got.text.slice(i, i + 200);
}

/** "voldoet", "voldoet niet" of "niet getoetst", zoals de rapportage het leest. */
function staat(zin) {
  if (/voldoet niet/.test(zin)) return "voldoet niet";
  if (/voldoet/.test(zin)) return "voldoet";
  if (/niet (volledig )?getoetst/.test(zin)) return "niet getoetst";
  return "(geen slotzin)";
}

function oordeel(got, wil, tekst = []) {
  const zin = slotzin(got);
  const is = staat(zin);
  const ok = is === wil;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel    ${is}   verwacht ${wil}`);
  for (const t of tekst) {
    const ok2 = got.text.includes(t);
    if (!ok2) fouten++;
    console.log(`  ${ok2 ? "OK    " : "FOUT  "} tekst      "${t}"`);
  }
}

function geval(naam, invoer, verwacht, wil, tekst) {
  const got = reken(tpl, invoer, PROJECT);
  fouten += toets(naam, got, verwacht);
  oordeel(got, wil, tekst);
  return got;
}

// ═══ Geval 1 — wand of strook loodrecht op het vlak belast ═══════════════════
// Kalkzandsteen < 25 % CS12 met M10: f_k = 0,6·12^0,65·10^0,25 = 0,6·5,029·1,778
// = 5,366 N/mm², f_d = 5,366/1,7 = 3,156. f_xk1 = 0,20 en f_xk2 = 0,40 N/mm²:
// f_xd1 = 0,1176 en f_xd2 = 0,2353. t = 100: Z = 1000·100²/6 = 1,667·10⁶ mm³,
// M_Rd1 = 0,1176·1,667·10⁶ = 0,1961 kNm en M_Rd2 = 0,3922 kNm per m.
const MW = {
  geval: "1", steensoort: "3", steencategorie: "1", f_b: "12", morteltype: "1", f_m: "10", langsvoeg: "1",
  t_w: "100", W_Ed: "0.9", f_xk1: "0.2", f_xk2: "0.4", vert: "1",
};

// 1a  Staande strook, boven en onder gesteund, h = 2700, W_Ed = 0,9 kN/m²:
//     M_Ed = 0,9·2,7²/8 = 0,8201 kNm → UC = 0,8201/0,1961 = 4,18.
//     Bijlage F(2): h/(30·t) = 2700/3000 = 0,90.
geval("1a  staande strook op twee steunen", { ...MW, steun: "1", h_w: "2700" },
  { f_k: "5.366", f_xd1: "0.1176", f_xd2: "0.2353", M_Ed: "0.8201", M_Rd: "0.1961", UC_M: "4.183", UC_F: "0.900" },
  "voldoet niet");

// 1b  Idem met een verticale last N = 20 kN/m (σ = 0,20 N/mm²). Φ_m volgens
//     bijlage G met h_ef = 2700 (ρ₂ = 1): λ = 27, e_k = 0, e_mk = max(6; 5) = 6,
//     A₁ = 0,88, u = (27/√700 − 0,063)/(0,73 − 1,17·0,06) = 0,9575/0,6598 = 1,4512,
//     Φ_m1 = 0,88·e^(−1,053) = 0,3070. De NB bij 6.1.2.2(1)(ii) en 5.5.1.1(5)
//     vraagt ook e_mk = max(10; 2700/300 = 9) = 10 mm: A₁ = 0,80, u = 0,9575/
//     (0,73 − 0,117) = 1,5620, Φ_m2 = 0,80·e^(−1,2199) = 0,2362 → Φ_m = 0,2362.
//     Grens 0,15·0,2362·3,156 = 0,1118 < 0,20, dus σ_d = 0,1118 en
//     f_xd1,app = 0,1176 + 0,1118 = 0,2295 (6.17).
//     M_Rd = 0,2295·1,667·10⁶ = 0,3825 kNm → UC = 0,8201/0,3825 = 2,144.
//     (Met alleen h_ef/450 was het 0,4383 kNm en UC 1,871 geweest.)
geval("1b  idem met gunstige verticale belasting (6.17)",
  { ...MW, steun: "1", h_w: "2700", vert: "2", N_v_Ed: "20" },
  { "Φ_m": "0.2362", "λ": "27.0", e_mk: "6.00", e_mk2: "10.0",
    "σ_d_max": "0.1118", "σ_d": "0.1118", f_xd1_app: "0.2295", M_Rd: "0.3825", UC_M: "2.144" },
  "voldoet niet");

// 1b2 Grensgeval dat zonder de NB-excentriciteit ten onrechte voldeed.
//     Baksteen < 25 % f_b 15 met M7,5: f_k = 0,6·15^0,65·7,5^0,25 = 0,6·5,8140·
//     1,6549 = 5,773, f_d = 3,396. f_xk1 = 0,25 → f_xd1 = 0,1471. t = 100,
//     h = 2600, W_Ed = 0,58, N = 15 kN/m (σ = 0,15 N/mm²).
//     λ = 26: Φ_m1 (e = 5,78 mm) = 0,3373; Φ_m2 (e = 10 mm): A₁ = 0,80,
//     u = (26/√700 − 0,063)/0,613 = 1,5003, Φ_m2 = 0,80·e^(−1,1255) = 0,2596.
//     Grens 0,15·0,2596·3,396 = 0,1322 < 0,15 → σ_d = 0,1322,
//     f_xd1,app = 0,2793; M_Rd = 0,2793·1,667 = 0,4655 kNm.
//     M_Ed = 0,58·2,6²/8 = 0,4901 kNm → UC = 1,053: voldoet niet.
//     (Met alleen Φ_m1 gaf de grens 0,1718, σ_d = 0,15 en UC = 0,990.)
geval("1b2 staande strook op de grens: de NB-excentriciteit beslist",
  { ...MW, steensoort: "1", f_b: "15", f_m: "7.5", f_xk1: "0.25", f_xk2: "0.5", steun: "1", h_w: "2600",
    W_Ed: "0.58", vert: "2", N_v_Ed: "15" },
  { f_k: "5.773", e_mk2: "10.0", "Φ_m": "0.2596", "σ_d": "0.1322", f_xd1_app: "0.2793", M_Ed: "0.4901",
    M_Rd: "0.4655", UC_M: "1.053" },
  "voldoet niet");

// 1c  Uitkragende tuinmuur, steens baksteen < 25 % fb 20 met M5 en een
//     langsvoeg: f_k = 0,8·0,6·20^0,65·5^0,25 = 5,031, f_d = 2,959.
//     t = 210, h = 1000, W_Ed = 0,9: M_Ed = 0,9·1,0²/2 = 0,450 kNm aan de voet.
//     Eigen gewicht 0,9·19·0,21·1,0 = 3,591 kN/m → σ = 3591/210 000 = 0,0171.
//     Grens: h_ef = 2·1000, λ = 9,52, e_mk = max(4,44; 10,5) = 10,5, A₁ = 0,90,
//     u = (9,524/√700 − 0,063)/(0,73 − 0,0585) = 0,4423, Φ_m = 0,90·e^(−0,0978)
//     = 0,8162 → 0,15·0,8162·2,959 = 0,3623 ≥ 0,0171: σ_d = 0,0171.
//     f_xd1,app = 0,1176 + 0,0171 = 0,1347; Z = 1000·210²/6 = 7,35·10⁶;
//     M_Rd = 0,9904 kNm → UC = 0,454. Bijlage F dekt de uitkraging niet.
geval("1c  uitkragende wand met eigen gewicht",
  { ...MW, steensoort: "1", f_b: "20", f_m: "5", langsvoeg: "2", steun: "2", t_w: "210", h_w: "1000",
    vert: "2", N_v_Ed: "3.591" },
  { f_k: "5.031", "Φ_m": "0.8162", "σ_d": "0.0171", f_xd1_app: "0.1347", M_Ed: "0.4500", M_Rd: "0.9904", UC_M: "0.4544" },
  "voldoet", ["bijlage F niet getoetst"]);

// 1d  Liggende strook tussen twee verticale steunen, l = 2000:
//     M_Ed = 0,9·2,0²/8 = 0,450 kNm, M_Rd = f_xd2·Z = 0,3922 → UC = 1,15.
geval("1d  liggende strook", { ...MW, steun: "3", l_w: "2000" },
  { M_Ed: "0.4500", M_Rd: "0.3922", UC_M: "1.15" }, "voldoet niet");

// 1e  Paneel langs vier randen, h = 2600, l = 4000, α₂ = 0,040 (ingevuld):
//     μ = 0,1176/0,2353 = 0,50, α₁ = 0,020.
//     M_Ed1 = 0,020·0,9·4² = 0,288, M_Ed2 = 0,040·0,9·4² = 0,576 kNm;
//     UC = 0,288/0,1961 = 0,576/0,3922 = 1,469 (met α₁ = μ·α₂ gelijk).
geval("1e  paneel, α₂ uit bijlage E", { ...MW, steun: "4", h_w: "2600", l_w: "4000", "α_2": "0.04" },
  { "μ": "0.500", "α_1": "0.0200", M_Ed1: "0.2880", M_Ed2: "0.5760", M_Rd1: "0.1961", M_Rd2: "0.3922", UC_M: "1.469" },
  "voldoet niet", ["figuren F.1 t/m F.3"]);

// 1f  Idem met N = 20 kN/m: h_ef = 2600, λ = 26, Φ_m1 = 0,3373 (e = 5,78 mm);
//     met de NB-excentriciteit e = max(10; 8,67) = 10 mm: A₁ = 0,80,
//     u = (26/√700 − 0,063)/0,613 = 1,5003, Φ_m2 = 0,80·e^(−1,1255) = 0,2596 → Φ_m.
//     σ_d = min(0,20; 0,15·0,2596·3,156 = 0,1229) = 0,1229, f_xd1,app = 0,2405,
//     μ = 0,2405/0,2353 = 1,022 (aangepast volgens §6.3.1(4)(i)).
//     α₂ = 0,035 (opnieuw afgelezen): α₁ = 0,03578, M_Ed1 = 0,5153, M_Ed2 = 0,504;
//     M_Rd1 = 0,2405·1,667·10⁶ = 0,4009 → UC = max(1,285; 1,285) = 1,285.
geval("1f  paneel met verticale belasting: μ aangepast",
  { ...MW, steun: "4", h_w: "2600", l_w: "4000", vert: "2", N_v_Ed: "20", "α_2": "0.035" },
  { "Φ_m": "0.2596", "σ_d": "0.1229", f_xd1_app: "0.2405", "μ": "1.022", M_Ed1: "0.5153", M_Ed2: "0.5040",
    M_Rd1: "0.4009", UC_M: "1.285" },
  "voldoet niet");

// 1g  Paneel dikker dan 250 mm: bijlage E geldt niet → niet getoetst, geen UC.
geval("1g  paneel met t = 300: buiten bijlage E",
  { ...MW, steun: "4", t_w: "300", h_w: "2600", l_w: "4000", "α_2": "0.04" }, {}, "niet getoetst",
  ["bijlage E geldt voor wanden tot 250 mm dik"]);

// 1h  Cellenbeton G4 met lijmmortel: K = 0,8, α = 0,85, β = 0 → f_k = 0,8·4^0,85
//     = 2,599 (tussen 1 en 5): f_xk1 = f_xk2 = 0,15·2,599 = 0,3899 (NB bij 3.6.4(7)).
//     Staande strook h = 2700, t = 100: M_Rd = 0,3899/1,7·1,667·10⁶ = 0,3822 kNm
//     → UC = 0,8201/0,3822 = 2,146.
geval("1h  cellenbeton, f_xk uit 0,15·f_k",
  { ...MW, steensoort: "7", f_b: "4", morteltype: "2", f_m: "12.5", bron_fx: "1", steun: "1", h_w: "2700" },
  { f_k: "2.599", f_xk1: "0.3899", f_xk2: "0.3899", M_Rd: "0.3822", UC_M: "2.146" }, "voldoet niet");

// 1i  Cellenbeton G10 met lijmmortel: f_k = 0,8·10^0,85 = 5,664 > 5 — de regel
//     van de NB geldt niet → niet getoetst.
geval("1i  cellenbeton met f_k boven 5 N/mm²",
  { ...MW, steensoort: "7", f_b: "10", morteltype: "2", f_m: "12.5", bron_fx: "1", steun: "1", h_w: "2700" },
  { f_k: "5.664" }, "niet getoetst", ["geldt alleen bij 1 ≤"]);

// 1j  Staande strook met t = 90: bijlage F geldt pas vanaf 100 mm (F(3)).
//     h = 1500, W_Ed = 0,5: M_Ed = 0,5·1,5²/8 = 0,1406; Z = 1000·90²/6 = 1,35·10⁶,
//     M_Rd = 0,1176·1,35·10⁶ = 0,1588 → UC = 0,886.
geval("1j  staande strook dunner dan 100 mm",
  { ...MW, steun: "1", t_w: "90", h_w: "1500", W_Ed: "0.5" },
  { M_Ed: "0.1406", M_Rd: "0.1588", UC_M: "0.8854" }, "voldoet", ["bijlage F geldt vanaf t = 100 mm"]);

// 1k  Slanke uitkraging met verticale last: h = 2700, t = 100 → h_ef = 5400,
//     λ = 54 > 27, dus kruip telt (NB bij 6.1.2.2(2)): φ_∞ = 1,1 (kalkzandsteen,
//     metselmortel, tabel NB-3), e_init = 12, e_k = 0,002·1,1·54·√(100·12) = 4,115,
//     e_mk = 16,12, A₁ = 0,6777, u = (54/√700 − 0,063)/(0,73 − 1,17·0,1612) = 3,653,
//     Φ_m1 = 0,6777·e^(−6,673) = 0,000857. Met de NB-excentriciteit
//     e = max(10; 5400/300 = 18) = 18, e_k2 = 0,002·1,1·54·√(100·18) = 5,040,
//     e_mk2 = 23,04, A₁ = 0,5392, u = 1,9780/(0,73 − 0,2696) = 4,296,
//     Φ_m2 = 0,5392·e^(−9,228) = 0,0000530 → Φ_m = 0,0000530,
//     σ_d = 0,15·0,0000530·3,156 = 0,000025: de verticale last helpt niet.
//     M_Ed = 0,9·2,7²/2 = 3,281 kNm, M_Rd = 0,1177·1,667·10⁶ = 0,1961 → UC = 16,7.
geval("1k  slanke uitkraging: kruip en een kleine Φ_m",
  { ...MW, steun: "2", h_w: "2700", vert: "2", N_v_Ed: "20" },
  { "λ": "54.0", e_k: "4.115", e_mk: "16.12", e_mk2: "23.04", "Φ_m": "0.0000530",
    M_Ed: "3.281", M_Rd: "0.1961", UC_M: "16.7" },
  "voldoet niet");

// ═══ Geval 2 — spouwmuur belast door wind ════════════════════════════════════
// Type U2, randvoorwaarde R2 (buitenblad ongesteund, binnenblad gesteund),
// gebouw lager dan 10 m: q_u = 1,19 kN/m² uit de tabel. q_p = 0,85 → UC = 0,714.
// Penant: l = 2,7 m, b01 = 1,8, b02 = 0,9, b2 = 0,9 → b01/l = 0,667,
// b02/l = b2/l = 0,333. Afgelezen: 1,30 (b02/l = 0) en 1,55 (b02/l = 1):
// k_p = 1,30 + 0,25·0,333 = 1,383, q_ep = 1,383·0,85 = 1,176 → UC = 0,988.
// Ankers: W_Ed = 1,5·2,0·(0,8 + 0,2)·0,85 = 2,55 kN/m²; F_d = min(1,6; 1,2)/2,0
// = 0,60 kN; n_nodig = 2,55/0,60 = 4,25 per m²; aanwezig 5 → UC = 0,85.
const SM = {
  geval: "2", type_U: "2", type_R: "2", h_geb: "8", h_vd: "2.7", q_p: "0.85", bron_qu: "1",
  penant: "2", b_01: "1.8", b_02: "0.9", b_2: "0.9", k_0: "1.30", k_1: "1.55",
  ca_keuze: "1", c_pe_10: "0.8", c_pi: "0.2", F_t_dec: "1.6", F_c_dec: "1.2", n_t: "5",
};
geval("2a  spouwmuur U2/R2 met penant en ankers", SM,
  { q_u: "1.19", UC_sm: "0.7143", k_p: "1.383", q_ep: "1.176", UC_pen: "0.9881", "γ_Q": "1.50", c_a: "2.0",
    W_a_Ed: "2.550", F_d: "0.600", n_t_nodig: "4.250", UC_ank: "0.8500", UC_max: "0.9881" },
  "voldoet", ["NPR 9096"]);

// 2b  Vier ankers per m²: UC = 4,25/4 = 1,06.
geval("2b  te weinig spouwankers", { ...SM, n_t: "4" }, { UC_ank: "1.06" }, "voldoet niet");

// 2c  Eén anker per m²: de minimale 2 per m² (NB bij 8.5.2.2(2)) is maatgevend
//     als de windbelasting laag is. q_p = 0,20: W_Ed = 0,60, n_nodig = 1,0 →
//     UC = max(1,0; 2)/1 = 2,0.
geval("2c  onder n_t,min = 2", { ...SM, q_p: "0.2", n_t: "1" }, { n_t_nodig: "1.000", UC_ank: "2.000" }, "voldoet niet");

// 2d  CC1: γ_Q = 1,35 en γ_M = 1,8 voor de ankers. W_Ed = 1,35·2·1,0·0,85 = 2,295,
//     F_d = 1,2/1,8 = 0,6667 → n = 3,443 → UC = 3,443/5 = 0,689.
{
  const got = reken(tpl, SM, { ...PROJECT, CC: 1, K_FI: 0.9 });
  fouten += toets("2d  gevolgklasse CC1", got, { "γ_Q": "1.35", "γ_M_a": "1.8", W_a_Ed: "2.295", F_d: "0.6667", UC_ank: "0.6885" });
  oordeel(got, "voldoet");
}

// 2e  R4 met U1: q_u = 0,60 → UC = 0,85/0,60 = 1,42.  2f  R3 met U3: 0,85 → 1,00.
geval("2e  tabel R4/U1", { ...SM, type_R: "4", type_U: "1", penant: "1" }, { q_u: "0.60", UC_sm: "1.417" }, "voldoet niet");
geval("2f  tabel R3/U3", { ...SM, type_R: "3", type_U: "3", penant: "1" }, { q_u: "0.85", UC_sm: "1.000" }, "voldoet");

// 2g  Gebouw van 12 m met de tabel: buiten de tabel → niet getoetst.
geval("2g  gebouwhoogte 12 m met de tabel", { ...SM, h_geb: "12" }, {}, "niet getoetst", ["lager dan 10 m"]);

// 2h  Eigen waarde q_u = 1,00: UC_sm = 0,85; het penant 1,176/1,00 = 1,18.
geval("2h  eigen q_u", { ...SM, h_geb: "12", bron_qu: "2", q_u: "1.0" }, { UC_sm: "0.8500", UC_pen: "1.176" }, "voldoet niet");

// 2i  Opening breder dan de verdiepingshoogte (b01/l > 1): buiten de grafiek.
//     Spouwmuur en ankers voldoen, het penant is niet getoetst.
geval("2i  penant buiten de grafiek", { ...SM, b_01: "3.0" }, { UC_sm: "0.7143" }, "niet getoetst",
  ["Penant niet getoetst"]);

// 2j  Factor c_a = 1,5 en 3,0.
geval("2j  c_a = 1,5", { ...SM, ca_keuze: "2" }, { c_a: "1.5", W_a_Ed: "1.913" }, "voldoet");
geval("2k  c_a = 3,0", { ...SM, ca_keuze: "3" }, { c_a: "3.0", W_a_Ed: "3.825", n_t_nodig: "6.375", UC_ank: "1.275" }, "voldoet niet");

// ═══ Geval 3 — kelderwand, NEN-EN 1996-3 §4.5 ════════════════════════════════
// Kalkzandsteen < 25 % CS20 met M10: f_k = 0,6·20^0,65·10^0,25 = 7,479,
// f_d = 7,479/1,7 = 4,399. t = 300, h = 2600, h_e = 2200, b_c = 4000,
// ρ_e = 18 kN/m³. h < b_c < 2h → β = 60 − 20·4,0/2,6 = 29,23.
// (4.11): t·b·f_d/3 = 300·1000·4,399/3 = 439,9 kN → UC = 180/439,9 = 0,409.
// (4.12): 18·1·2,6·2,2²/(29,23·0,3) = 226,5/8,769 = 25,83 kN → UC = 25,83/50 = 0,517.
const KW = {
  geval: "3", steensoort: "3", steencategorie: "1", f_b: "20", morteltype: "1", f_m: "10", langsvoeg: "1",
  t_k: "300", h_k: "2600", h_e: "2200", b_c: "4000", "ρ_e": "18", q_k: "5", N_Ed_max: "180", N_Ed_min: "50",
};
geval("3a  kelderwand", KW,
  { f_k: "7.479", f_d: "4.399", "β_k": "29.23", N_Rd_max: "439.9", N_Ed_nodig: "25.83", UC_411: "0.4092", UC_412: "0.5166" },
  "voldoet");
// 3b/c  β = 40 bij b_c ≤ h (b_c = 2000): 18·2,6·4,84/(40·0,3) = 18,88 → 0,378;
//       β = 20 bij b_c ≥ 2h (b_c = 6000): 37,75 → 0,755.
geval("3b  dwarswanden dichtbij: β = 40", { ...KW, b_c: "2000" }, { "β_k": "40", N_Ed_nodig: "18.88", UC_412: "0.3775" }, "voldoet");
geval("3c  dwarswanden ver weg: β = 20", { ...KW, b_c: "6000" }, { "β_k": "20", N_Ed_nodig: "37.75", UC_412: "0.7550" }, "voldoet");
// 3d  Te weinig bovenbelasting: N_Ed,min = 20 → 25,83/20 = 1,29.
geval("3d  te weinig verticale belasting", { ...KW, N_Ed_min: "20" }, { UC_412: "1.292" }, "voldoet niet");
// 3e  Geen verticale belasting: (4.12) kan niet → UC oneindig.
geval("3e  zonder verticale belasting", { ...KW, N_Ed_min: "0" }, {}, "voldoet niet", ["Geen verticale belasting"]);
// 3f  Wanddikte 190 < 200 mm en 3g hoogte 2800 > 2600: buiten §4.5(1).
geval("3f  t = 190 mm", { ...KW, t_k: "190" }, {}, "niet getoetst", ["Buiten de voorwaarden van §4.5(1)"]);
geval("3g  h = 2800 mm", { ...KW, h_k: "2800", h_e: "2200" }, {}, "niet getoetst");
geval("3h  bovenbelasting 7,5 kN/m²", { ...KW, q_k: "7.5" }, {}, "niet getoetst");
// 3i  Categorie II: γ_M = 2,2, ook in CC1 (NB bij NEN-EN 1996-3): f_d = 3,399,
//     N_Rd,max = 339,9 → UC = 0,530.
{
  const got = reken(tpl, { ...KW, steencategorie: "2" }, { ...PROJECT, CC: 1, K_FI: 0.9 });
  fouten += toets("3i  categorie II in CC1", got, { "γ_M": "2.2", f_d: "3.399", N_Rd_max: "339.9", UC_411: "0.5295" });
  oordeel(got, "voldoet");
}

// ═══ Geval 4 — stabiliteitswand op afschuiving, §6.2 ═════════════════════════
// l = 3000, t = 100, N = 80 kN, M = 60 kNm, V = 20 kN, f_vk0 = 0,20, f_b = 12.
// e = 60/80 = 750 mm > l/6 = 500 → l_c = 3·(1500 − 750) = 2250 mm.
// σ_d = 80 000/(100·2250) = 0,3556 N/mm²; (3.5): f_vk = 0,20 + 0,4·0,3556 = 0,3422
// ≤ f_vlt = 0,065·12 = 0,78; f_vd = 0,2013; V_Rd = 0,2013·100·2250 = 45,29 kN
// → UC = 20/45,29 = 0,442.
const SW = {
  geval: "4", steensoort: "3", steencategorie: "1", f_b: "12",
  l_s: "3000", t_s: "100", f_vk0: "0.2", stootvoegen: "1", V_Ed: "20", N_s_Ed: "80", M_s_Ed: "60",
};
geval("4a  stabiliteitswand, deels gedrukt", SW,
  { e_s: "750", l_c: "2250", "σ_d": "0.3556", f_vk_1: "0.3422", f_vlt: "0.780", f_vk: "0.3422", f_vd: "0.2013",
    V_Rd: "45.29", UC_max: "0.4416" }, "voldoet");
// 4b  Ongevulde stootvoegen (3.6): 0,10 + 0,1422 = 0,2422 → V_Rd = 32,06 → 0,624.
geval("4b  ongevulde stootvoegen", { ...SW, stootvoegen: "2" }, { f_vk_1: "0.2422", V_Rd: "32.06", UC_max: "0.6239" }, "voldoet");
// 4c  Zonder moment: l_c = l = 3000, σ = 0,2667, f_vk = 0,3067 → V_Rd = 54,12 → 0,370.
geval("4c  geheel gedrukt", { ...SW, M_s_Ed: "0" }, { l_c: "3000", "σ_d": "0.2667", V_Rd: "54.12", UC_max: "0.3696" }, "voldoet");
// 4d  Bovengrens f_vlt: f_b = 3 → 0,195 < 0,3422 → V_Rd = 25,81 → 0,775.
geval("4d  bovengrens f_vlt", { ...SW, f_b: "3" }, { f_vlt: "0.195", f_vk: "0.195", V_Rd: "25.81", UC_max: "0.7749" }, "voldoet");
// 4e  e = 130/80 = 1625 mm ≥ l/2: de wand kantelt.
geval("4e  resultante buiten de wand", { ...SW, M_s_Ed: "130" }, {}, "voldoet niet", ["de wand kantelt"]);
// 4f  Trek, en een moment zonder normaalkracht.
geval("4f  trek", { ...SW, N_s_Ed: "-10" }, {}, "voldoet niet", ["Trek, of een moment zonder normaalkracht"]);
geval("4g  moment zonder normaalkracht", { ...SW, N_s_Ed: "0" }, {}, "voldoet niet");
// 4h  CC1: γ_M = 1,5 → V_Rd = 0,3422/1,5·100·2250 = 51,33 → 0,390.
{
  const got = reken(tpl, SW, { ...PROJECT, CC: 1, K_FI: 0.9 });
  fouten += toets("4h  gevolgklasse CC1", got, { "γ_M": "1.5", V_Rd: "51.33", UC_max: "0.3896" });
  oordeel(got, "voldoet");
}

// ═══ Lege invoer en een rondgang langs alle keuzes ═══════════════════════════
// Een vers ingevoegd blad heeft lege velden (0): elk geval hoort dan "niet
// getoetst" te melden, zonder NaN. Daarna per geval elke keuze van elk @select
// apart, met de voorbeeldinvoer van dat geval.
const SIGNALEN = ["NaN", "Render error", "Undefined symbol", "Unexpected type", "Cannot read",
  "is not defined", "Invalid argument", "Error evaluating condition", "Error:"];
const schoon = (got) => SIGNALEN.find((s) => got.text.includes(s));

console.log("\nLege invoer");
for (const g of ["1", "2", "3", "4"]) {
  const got = reken(tpl, { geval: g }, PROJECT);
  const fout = schoon(got);
  const is = staat(slotzin(got));
  const ok = !fout && (is === "niet getoetst" || is === "voldoet niet");
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} geval ${g}: ${fout ? `"${fout}" in de uitwerking` : is}`);
}

console.log("\nAlle keuzes per geval");
const KEUZES = {
  "1": { basis: { ...MW, h_w: "2700", l_w: "4000", "α_2": "0.04", N_v_Ed: "20", bron_fx: "1" },
         selects: { steun: 4, vert: 2, steensoort: 7, morteltype: 2, langsvoeg: 2, steencategorie: 2, bron_fx: 2 } },
  "2": { basis: SM, selects: { type_U: 3, type_R: 4, bron_qu: 2, penant: 2, ca_keuze: 3 } },
  "3": { basis: KW, selects: { steensoort: 7, morteltype: 2, langsvoeg: 2, steencategorie: 2 } },
  "4": { basis: SW, selects: { steensoort: 7, stootvoegen: 2, steencategorie: 2 } },
};
let sets = 0, mis = 0;
for (const [g, { basis, selects }] of Object.entries(KEUZES)) {
  const varianten = [basis];
  for (const [naam, n] of Object.entries(selects)) {
    for (let k = 1; k <= n; k++) varianten.push({ ...basis, [naam]: String(k) });
  }
  // Ook de ondersteuningen onderling met en zonder verticale last.
  if (g === "1") for (let s = 1; s <= 4; s++) for (let v = 1; v <= 2; v++) varianten.push({ ...basis, steun: String(s), vert: String(v) });
  for (const v of varianten) {
    sets++;
    for (const cc of [1, 2, 3]) {
      const got = reken(tpl, v, { ...PROJECT, CC: cc, K_FI: cc === 1 ? 0.9 : cc === 3 ? 1.1 : 1.0 });
      const fout = schoon(got);
      const zin = slotzin(got);
      if (fout || !zin) {
        mis++;
        console.log(`  FOUT   geval ${g}, CC${cc}, ${JSON.stringify(v).slice(0, 400)}: ${fout ?? "geen slotzin"}`);
      }
    }
  }
}
if (mis) fouten += mis;
console.log(`  ${mis ? "FOUT  " : "OK    "} ${sets} keuzesets × 3 gevolgklassen: geen NaN of foutmelding, altijd een slotzin`);

afronden(fouten, "Metselwerk loodrecht belast");
