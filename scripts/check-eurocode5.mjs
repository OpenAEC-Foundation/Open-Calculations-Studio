/**
 * Controlescript voor de normbladen EN 1995-1-1 (templates/eurocode5.ts).
 *
 * De normbladen hebben geen eigen referentieblad; elke verwachting hieronder
 * is met de hand nagerekend en staat als commentaar bij de set. Het script
 * bewaakt vooral dat de keuzes op het blad ook echt doorwerken: sterkteklasse
 * (EN 338 / EN 14080), klimaatklasse × belastingduurklasse (k_mod, tabel 3.1),
 * γ_M per houttype (tabel 2.3 NB), k_cr = 1,0 (NB art. 6.1.7(2)), k_c,90 en l_ef bij
 * een eind- of tussenoplegging (6.1.5), k_crit volgens (6.34) met l_ef + 2h,
 * in de houten balk de combinatie met alleen blijvende belasting (3.1.3(2)) en
 * in de doorbuiging ψ_2 per belastingcategorie en de grenzen uit de NB bij
 * NEN-EN 1990 (A1.4.3(3) en (4), via NB 7.2(2)). Verder wringing met α en k_shape
 * bij een rechthoekige en een ronde doorsnede (6.14, 6.15), de tapse ligger met
 * k_m,α bij trek en druk langs de tapse rand (6.37 t/m 6.40) en de uitkeping bij
 * de oplegging met k_v en k_n (6.60 t/m 6.63). Het vloer- en dakbeschot rekent
 * met coëfficiënten van een doorgaande ligger: die rekent dit script met een
 * eigen driemomentenberekening na (naar boven afgerond, ten hoogste 0,1 %
 * erboven), en daarmee het hele blad over een reeks materialen, velden en
 * categorieën; een paar sets met de hand. Per blad leest één set ook het
 * oordeel zoals de afdruk dat doet, uit de slotzin "Maatgevende UC = …".
 *
 * De bladen dragen hun invoer als voorbeeldwaarden in de tekst; dit script
 * vervangt die regels per set.
 *
 * Draaien:  node scripts/check-eurocode5.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { reken, toets, afronden } from "./lib/refcheck.mjs";

const hier = dirname(fileURLToPath(import.meta.url));
const code = readFileSync(join(hier, "../packages/desktop/src/templates/eurocode5.ts"), "utf8");
const bladen = await import("data:text/javascript;base64," + Buffer.from(code, "utf8").toString("base64"));
const PROJECT = { CC: 2, K_FI: 1, rekenwijze: 1 };

/**
 * Zet voorbeeldwaarden in de bladtekst: `{ L_opl: "450 mm" }`. Een invoerregel
 * mag ingesprongen binnen een #if staan (de maten van één doorsnedevorm).
 */
function met(tpl, waarden) {
  let uit = tpl;
  for (const [naam, waarde] of Object.entries(waarden)) {
    const regel = new RegExp(`^([ \\t]*${naam} = )[^'\\n]+`, "m");
    if (!regel.test(uit)) throw new Error(`geen invoerregel ${naam} in het blad`);
    uit = uit.replace(regel, `$1${waarde}`);
  }
  return uit;
}

/**
 * Toetst een set en leest daarbij het oordeel zoals de afdruk dat doet: het
 * getal en het woord uit de laatste slotzin "Maatgevende UC = …" (UC_slot, en
 * voldoet als 1 of 0). Zonder slotzin blijven beide leeg en zakt de set.
 */
function toetsMetOordeel(naam, got, verwacht) {
  const i = got.text.lastIndexOf("Maatgevende UC");
  const zin = i < 0 ? "" : got.text.slice(i, i + 240);
  const m = zin.match(/Maatgevende UC\s*=\s*([\d.,]+)/);
  const voldoet = !/voldoe[nt] niet/.test(zin) && /voldoe[nt]/.test(zin);
  return toets(naam, got, verwacht, {}, {
    UC_slot: m ? parseFloat(m[1].replace(",", ".")) : NaN,
    voldoet: i < 0 ? NaN : voldoet ? 1 : 0,
  });
}

// Keuzewaarden: sterkteklasse in de bladen met zes klassen.
const C18 = "1", C24 = "2", C30 = "3", GL24h = "4", GL28h = "5", GL32h = "6";
const BLIJVEND = "1", LANG = "2", MIDDELLANG = "3", KORT = "4", ZEER_KORT = "5";

let fouten = 0;

// ── Buiging ──────────────────────────────────────────────────────────────
// M_Ed = 5·3²/8 = 5,625 kNm, W_y = 70·200²/6 = 466 667 mm³, σ_m,d = 12,05.
{
  const tpl = bladen.ec5Buiging;
  // C24, klimaatklasse 3, blijvend: k_mod 0,50; f_m,d = 0,5·24/1,3 = 9,23; UC = 12,05/9,23 = 1,306.
  fouten += toetsMetOordeel("buiging — C24, klimaatklasse 3, blijvend",
    reken(tpl, { sterkteklasse: "6", klimaatklasse: "3", belastingduurklasse: BLIJVEND }, PROJECT),
    { f_mk: "24", gamma_M: "1.30", k_mod: "0.50", f_md: "9.23", sigma_md: "12.05", UC_buiging: "1.306",
      UC_slot: "1.306", voldoet: "0" });
  // GL24h, middellang: γ_M 1,25; f_m,d = 0,8·24/1,25 = 15,36; UC = 12,05/15,36 = 0,785.
  fouten += toets("buiging — GL24h, middellang",
    reken(tpl, { sterkteklasse: "16", belastingduurklasse: MIDDELLANG }, PROJECT),
    { gamma_M: "1.25", k_mod: "0.80", f_md: "15.36", UC_buiging: "0.785" });
  // D30, klimaatklasse 2, kort: k_mod 0,90; f_m,d = 0,9·30/1,3 = 20,77; UC = 0,580.
  fouten += toets("buiging — D30, klimaatklasse 2, kort",
    reken(tpl, { sterkteklasse: "11", klimaatklasse: "2", belastingduurklasse: KORT }, PROJECT),
    { f_mk: "30", k_mod: "0.90", f_md: "20.77", UC_buiging: "0.580" });
}

// ── Afschuiving ──────────────────────────────────────────────────────────
// V_Ed = 5·3/2 = 7,5 kN; k_cr = 1,0 (NB art. 6.1.7(2), prismatische doorsnede),
// dus b_ef = 70 mm; τ_d = 1,5·7500/(70·200) = 0,8036.
{
  const tpl = bladen.ec5Afschuiving;
  // C24, middellang: f_v,d = 0,8·4,0/1,3 = 2,462; UC = 0,8036/2,462 = 0,326 (was 0,487 met k_cr = 0,67).
  fouten += toetsMetOordeel("afschuiving — C24, middellang",
    reken(tpl, { sterkteklasse: C24, belastingduurklasse: MIDDELLANG }, PROJECT),
    { f_vk: "4.0", f_vd: "2.462", k_cr: "1.0", b_ef: "70.0", tau_d: "0.8036", UC_afschuiving: "0.326",
      UC_slot: "0.326", voldoet: "1" });
  // C18, blijvend: f_v,d = 0,6·3,4/1,3 = 1,569; UC = 0,8036/1,569 = 0,512.
  fouten += toets("afschuiving — C18, blijvend",
    reken(tpl, {}, PROJECT),
    { f_vk: "3.4", k_mod: "0.60", f_vd: "1.569", UC_afschuiving: "0.512" });
  // GL24h, middellang: f_v,d = 0,8·3,5/1,25 = 2,24; UC = 0,8036/2,24 = 0,359.
  fouten += toets("afschuiving — GL24h, middellang",
    reken(tpl, { sterkteklasse: GL24h, belastingduurklasse: MIDDELLANG }, PROJECT),
    { gamma_M: "1.25", f_vd: "2.24", UC_afschuiving: "0.359" });
  // C30, klimaatklasse 3, zeer kort: k_mod 0,90; f_v,d = 0,9·4,0/1,3 = 2,769; UC = 0,8036/2,769 = 0,290.
  fouten += toets("afschuiving — C30, klimaatklasse 3, zeer kort",
    reken(tpl, { sterkteklasse: C30, klimaatklasse: "3", belastingduurklasse: ZEER_KORT }, PROJECT),
    { k_mod: "0.90", f_vd: "2.769", UC_afschuiving: "0.290" });
}

// ── Druk evenwijdig ──────────────────────────────────────────────────────
// σ_c,0,d = 50 kN / (100·100) = 5,0 N/mm².
{
  const tpl = bladen.ec5Druk;
  // C24, middellang: f_c,0,d = 0,8·21/1,3 = 12,92; UC = 0,387.
  fouten += toetsMetOordeel("druk evenwijdig — C24, middellang",
    reken(tpl, { sterkteklasse: C24, belastingduurklasse: MIDDELLANG }, PROJECT),
    { f_c0k: "21", f_c0d: "12.92", UC_druk: "0.387", UC_slot: "0.387", voldoet: "1" });
  // GL28h, klimaatklasse 3, lang: k_mod 0,55; f_c,0,d = 0,55·28/1,25 = 12,32; UC = 0,406.
  fouten += toets("druk evenwijdig — GL28h, klimaatklasse 3, lang",
    reken(tpl, { sterkteklasse: GL28h, klimaatklasse: "3", belastingduurklasse: LANG }, PROJECT),
    { f_c0k: "28", k_mod: "0.55", f_c0d: "12.32", UC_druk: "0.406" });
}

// ── Druk loodrecht ───────────────────────────────────────────────────────
// F = 15 kN, b = 70 mm, L_opl = 100 mm.
{
  const tpl = bladen.ec5DrukLoodrecht;
  // GL32h, middellang, eindoplegging, discreet: f_c,90,k 2,5 (EN 14080, was 3,3);
  // f_c,90,d = 0,8·2,5/1,25 = 1,60; l_ef = 100 + 30 = 130 (was 160);
  // σ = 15000/(70·130) = 1,648; UC = 1,648/(1,75·1,60) = 0,589 (was 0,44).
  fouten += toetsMetOordeel("druk loodrecht — GL32h, eindoplegging, discreet",
    reken(tpl, { sterkteklasse: GL32h, belastingduurklasse: MIDDELLANG }, PROJECT),
    { f_c90k: "2.5", f_c90d: "1.60", k_c90: "1.75", L_ef: "130", sigma_c90d: "1.648", UC_c90: "0.589",
      UC_slot: "0.589", voldoet: "1" });
  // C24, middellang, tussenoplegging, doorgaand: k_c,90 1,25; l_ef = 160;
  // σ = 15000/11200 = 1,339; f_c,90,d = 0,8·2,5/1,3 = 1,538; UC = 1,339/(1,25·1,538) = 0,696.
  fouten += toets("druk loodrecht — C24, tussenoplegging, doorgaand",
    reken(tpl, { sterkteklasse: C24, belastingduurklasse: MIDDELLANG, zijden: "2", steunpunttype: "2" }, PROJECT),
    { f_c90d: "1.538", k_c90: "1.25", L_ef: "160", sigma_c90d: "1.339", UC_c90: "0.696" });
  // GL24h met L_opl 450 > 400 mm: geen 1,75, dus k_c,90 = 1,0; l_ef = 480;
  // σ = 15000/(70·480) = 0,446; UC = 0,446/1,60 = 0,279.
  fouten += toets("druk loodrecht — GL24h, L_opl 450 mm",
    reken(met(tpl, { L_opl: "450 mm" }), { sterkteklasse: GL24h, belastingduurklasse: MIDDELLANG }, PROJECT),
    { k_c90: "1.0", L_ef: "480", UC_c90: "0.279" });
  // Contactlengte 20 mm: vergroting ten hoogste l zelf, dus l_ef = 20 + 20 = 40.
  fouten += toets("druk loodrecht — L_opl 20 mm, eindoplegging",
    reken(met(tpl, { L_opl: "20 mm" }), { sterkteklasse: C24 }, PROJECT),
    { L_ef: "40" });
  fouten += toets("druk loodrecht — C18, overige ondersteuning",
    reken(tpl, { steunpunttype: "3" }, PROJECT),
    { k_c90: "1.0" });
}

// ── Knik ─────────────────────────────────────────────────────────────────
// 100×100, L_k = 3000: λ_z = 3000/(100/√12) = 103,9; σ_c,0,d = 80 kN / 10 000 mm² = 8,0.
{
  const tpl = bladen.ec5Knik;
  // C18, middellang: E_0,05 6000 (was vast 7400); λ_rel = 103,9/π·√(18/6000) = 1,812;
  // k = 0,5·(1 + 0,2·1,512 + 1,812²) = 2,293; k_c = 1/(2,293 + √(2,293² − 1,812²)) = 0,2705;
  // f_c,0,d = 0,8·18/1,3 = 11,08; UC = 8/(0,2705·11,08) = 2,67 (was 2,21).
  fouten += toetsMetOordeel("knik — C18, middellang",
    reken(tpl, { sterkteklasse: C18, belastingduurklasse: MIDDELLANG }, PROJECT),
    { E_005: "6000", beta_c: "0.2", lambda_relz: "1.812", k_z: "2.293", k_cz: "0.2705", UC_knik: "2.67",
      UC_slot: "2.67", voldoet: "0" });
  // b = 200 > h = 100: de zwakke as hoort bij h, dus λ_z = 3000/(100/√12) = 103,9 en
  // λ_rel = 1,812, k_c = 0,2705 als hierboven; σ = 80 000/20 000 = 4,0;
  // UC = 4,0/(0,2705·11,08) = 1,335 (met b in de slankheid was het 0,477).
  fouten += toets("knik — C18, b 200 > h 100",
    reken(met(tpl, { b: "200 mm" }), { sterkteklasse: C18, belastingduurklasse: MIDDELLANG }, PROJECT),
    { lambda_z: "103.9", lambda_relz: "1.812", k_cz: "0.2705", sigma_c0d: "4.00", UC_knik: "1.335" });
  // C24, L_k = 1000: f_c,0,k 21 (was 24); λ_rel = 34,64/π·√(21/7400) = 0,587;
  // k = 0,5·(1 + 0,2·0,287 + 0,587²) = 0,701; k_c = 0,922; k_c·f_c,0,d = 0,922·12,92 = 11,92;
  // UC = 8/11,92 = 0,671.
  fouten += toets("knik — C24, L_k 1000 mm",
    reken(met(tpl, { L_k: "1000 mm" }), { sterkteklasse: C24, belastingduurklasse: MIDDELLANG }, PROJECT),
    { f_c0k: "21", f_c0d: "12.92", lambda_relz: "0.587", k_cz: "0.922", UC_knik: "0.671" });
  // GL24h, middellang: β_c 0,1, E_0,05 9600, γ_M 1,25; λ_rel = 33,08·√(24/9600) = 1,654;
  // k = 0,5·(1 + 0,1·1,354 + 1,654²) = 1,936; k_c = 1/(1,936 + √(1,936² − 1,654²)) = 0,340;
  // f_c,0,d = 0,8·24/1,25 = 15,36; UC = 8/(0,340·15,36) = 1,53.
  fouten += toets("knik — GL24h, middellang",
    reken(tpl, { sterkteklasse: GL24h, belastingduurklasse: MIDDELLANG }, PROJECT),
    { beta_c: "0.1", gamma_M: "1.25", lambda_relz: "1.654", k_z: "1.936", k_cz: "0.340", UC_knik: "1.53" });
  // λ_rel = 13,86/π·√(21/7400) = 0,235 < 0,3: k_c = 1 (6.3.2(2)); de formule gaf 1,02.
  fouten += toets("knik — C24, L_k 400 mm, gedrongen",
    reken(met(tpl, { L_k: "400 mm" }), { sterkteklasse: C24 }, PROJECT),
    { lambda_relz: "0.235", k_cz: "1.000" });
}

// ── Doorbuiging ──────────────────────────────────────────────────────────
// 70×200, L = 4000: I_y = 46,67·10⁶ mm⁴; g_k 1,0 en q_k 2,5 kN/m.
// Grenzen volgens NB 7.2(2), dus de NB bij NEN-EN 1990: w_bij = w_2 + w_3 ≤ 0,003·L,
// L/500 of L/250 (A1.4.3(3)) en w_net,fin ≤ L/250 (A1.4.3(4)). De voorbeelden uit
// tabel 7.2 (w_inst ≤ L/300, w_fin ≤ L/150) gelden niet meer.
// w_2 = k_def·(w_G + ψ_2·w_Q); w_3 = ψ_1·w_Q (frequent, 6.15b) of w_Q (karakteristiek, 6.14b).
{
  const tpl = bladen.ec5Doorbuiging;
  // Standaard: C18, klimaatklasse 1, categorie A (ψ_1 0,5, ψ_2 0,3), vloer.
  // w_G = 5·1,0·4000⁴/(384·9000·46,67·10⁶) = 7,937; w_Q = 19,84;
  // w_fin = 7,937·1,6 + 19,84·(1 + 0,3·0,6) = 12,70 + 23,41 = 36,11; UC = 36,11/16 = 2,257.
  // w_2 = 0,6·(7,937 + 0,3·19,84) = 8,333; w_3 = 0,5·19,84 = 9,921; w_bij = 18,25;
  // UC_bij = 18,25/12 = 1,521.
  fouten += toetsMetOordeel("doorbuiging — standaard (C18, klimaatklasse 1, categorie A, vloer)",
    reken(tpl, {}, PROJECT),
    { E_mean: "9000", k_def: "0.60", psi_2: "0.3", psi_w3: "0.5", w_fin: "36.11",
      w_2: "8.333", w_3: "9.921", w_bij: "18.25", w_bij_lim: "12.0",
      UC_bij: "1.521", UC_netfin: "2.257", UC_max: "2.257", UC_slot: "2.257", voldoet: "0" });
  // GL32h (E_0,mean 14 200 volgens EN 14080, was 13 700), klimaatklasse 2, opslag (ψ_1 0,9, ψ_2 0,8):
  // w_G = 7,937·9000/14 200 = 5,030; w_Q = 12,58; w_fin,Q = 12,58·(1 + 0,8·0,8) = 20,62;
  // w_net,fin = 5,030·1,8 + 20,62 = 29,68; UC = 29,68/16 = 1,855.
  // w_bij = 0,8·(5,030 + 0,8·12,58) + 0,9·12,58 = 12,07 + 11,32 = 23,39; UC = 23,39/12 = 1,949.
  fouten += toets("doorbuiging — GL32h, klimaatklasse 2, categorie E",
    reken(tpl, { sterkteklasse: GL32h, klimaatklasse: "2", belastingcat: "5" }, PROJECT),
    { E_mean: "14200", k_def: "0.80", psi_2: "0.8", w_inst_G: "5.030", w_fin_Q: "20.62", w_netfin: "29.68",
      UC_netfin: "1.855", w_bij: "23.39", UC_bij: "1.949", UC_max: "1.949" });
  // Lichte opslagvloer 70×250 C24, g_k 0,5 en q_k 2,6 kN/m, klimaatklasse 1, categorie E:
  // I_y = 91,15·10⁶; w_G = 5·0,5·4000⁴/(384·11 000·91,15·10⁶) = 1,662; w_Q = 8,644;
  // w_net,fin = 1,662·1,6 + 8,644·1,48 = 15,45; UC = 0,966 (dat was eerder het hele oordeel).
  // w_2 = 0,6·(1,662 + 0,8·8,644) = 5,147.
  const licht = met(tpl, { h: "250 mm", g_k: "0.5 kN/m", q_k: "2.6 kN/m" });
  const lichtInvoer = { sterkteklasse: C24, belastingcat: "5" };
  // Vloer: w_3 = 0,9·8,644 = 7,780; w_bij = 12,93 > 0,003·4000 = 12; UC = 1,077: voldoet niet.
  fouten += toetsMetOordeel("doorbuiging — lichte opslagvloer, 0,003·L",
    reken(licht, lichtInvoer, PROJECT),
    { w_netfin: "15.45", UC_netfin: "0.966", w_2: "5.147", w_3: "7.780", w_bij: "12.93", UC_bij: "1.077",
      UC_slot: "1.077", voldoet: "0" });
  // Scheurgevoelige scheidingswanden: grens 4000/500 = 8,0; UC = 12,93/8 = 1,616.
  fouten += toets("doorbuiging — lichte opslagvloer, scheurgevoelige wanden L/500",
    reken(licht, { ...lichtInvoer, toepassing: "2" }, PROJECT),
    { w_bij_lim: "8.0", UC_bij: "1.616", UC_max: "1.616" });
  // Overig dak, karakteristiek: w_3 = w_Q = 8,644; w_bij = 13,79; grens 16; UC = 0,862;
  // w_net,fin maatgevend met 0,966.
  fouten += toetsMetOordeel("doorbuiging — overig dak L/250, karakteristiek",
    reken(licht, { ...lichtInvoer, toepassing: "3" }, PROJECT),
    { psi_w3: "1.0", w_3: "8.644", w_bij: "13.79", w_bij_lim: "16.0", UC_bij: "0.862", UC_max: "0.966",
      UC_slot: "0.966", voldoet: "1" });
}

// ── Volledige toetsing houten balk ───────────────────────────────────────
// 70×200, L = 4000, L_opl = 100: W_y = 466 667 mm³, I_y = 46,67·10⁶ mm⁴.
{
  const tpl = bladen.ec5HoutenBalk;
  // Standaard: C18, klimaatklasse 1, blijvend, CC2, categorie A, g_k 1,5 en q_k 2,0 kN/m.
  // q_d,a = 1,35·1,5 + 1,5·0,4·2,0 = 3,225; q_d,b = 1,2·1,5 + 1,5·2,0 = 4,80 → q_d = 4,80.
  // M = 4,8·4²/8 = 9,60; σ = 20,57; f_m,d = 0,6·18/1,3 = 8,31; UC = 2,476.
  // τ = 1,5·9600/(1,0·70·200) = 1,029 (k_cr = 1,0); f_v,d = 0,6·3,4/1,3 = 1,569; UC = 0,6555.
  // l_ef = 100 + 30 = 130; σ_c,90 = 9600/9100 = 1,055; UC = 1,055/(1,5·1,015) = 0,693.
  // l_ef = 0,9·4000 + 2·200 = 4000; σ_crit = 0,78·70²·6000/(200·4000) = 28,67;
  // λ = √(18/28,67) = 0,792; k_crit = 1,56 − 0,75·0,792 = 0,966; UC = 20,57/(0,966·8,31) = 2,564.
  // w_G = 5·1,5·4000⁴/(384·9000·46,67·10⁶) = 11,90; w_Q = 15,87;
  // w_net,fin = 11,90·1,6 + 15,87·(1 + 0,3·0,6) = 37,78; UC = 37,78/16 = 2,361.
  // w_bij = 0,6·(11,90 + 0,3·15,87) + 0,5·15,87 = 10,00 + 7,94 = 17,94 (A1.4.3(3), frequent);
  // UC = 17,94/12 = 1,495. Maatgevend is kip: UC_max = 2,564, de balk voldoet niet.
  fouten += toetsMetOordeel("houten balk — standaard (C18, blijvend, CC2, categorie A)",
    reken(tpl, {}, PROJECT),
    { q_da: "3.225", q_db: "4.80", q_d: "4.80", M_Ed: "9.60", f_md: "8.31", UC_buiging: "2.476",
      tau_d: "1.029", UC_afschuiving: "0.6555", L_ef: "130", UC_c90: "0.693",
      l_ef: "4000", sigma_mcrit: "28.67", lambda_relm: "0.792", k_crit: "0.966", UC_kip: "2.564",
      w_netfin: "37.78", UC_doorbuiging: "2.361", w_bij: "17.94", UC_bij: "1.495", UC_slot: "2.564", voldoet: "0" });
  // C24 100×300, middellang: q_d = 4,80 met k_mod 0,80 (2,025/0,6 = 3,375 < 4,8/0,8 = 6,0).
  // σ = 9,60·10⁶/1,5·10⁶ = 6,40; f_m,d = 14,77; UC = 0,433.
  // τ = 1,5·9600/(100·300) = 0,480; f_v,d = 2,462; UC = 0,195.
  // σ_c,90 = 9600/(100·130) = 0,738; UC = 0,738/(1,5·1,538) = 0,320.
  // l_ef = 3600 + 600 = 4200; σ_crit = 0,78·100²·7400/(300·4200) = 45,81; λ = 0,724 → k_crit 1.
  // w = 2,020·1,6 + 2,694·1,18 = 6,411; UC = 0,401.
  // w_bij = 0,6·(2,020 + 0,3·2,694) + 0,5·2,694 = 1,697 + 1,347 = 3,044; UC = 0,254.
  // UC_max = 0,433: de balk voldoet.
  fouten += toetsMetOordeel("houten balk — C24 100×300, middellang: voldoet",
    reken(met(tpl, { b: "100 mm", h: "300 mm" }), { sterkteklasse: C24, belastingduurklasse: MIDDELLANG }, PROJECT),
    { UC_buiging: "0.433", UC_afschuiving: "0.195", UC_c90: "0.320", k_crit: "1.0", UC_kip: "0.433",
      w_netfin: "6.41", UC_doorbuiging: "0.401", w_bij: "3.044", UC_bij: "0.254", UC_slot: "0.433", voldoet: "1" });
  // Lichte opslagvloer 70×250 C24, g_k 0,5 en q_k 2,6 kN/m, middellang, categorie E: alle
  // sterktetoetsen en w_net,fin (15,45/16 = 0,966) voldoen, de bijkomende doorbuiging niet:
  // w_bij = 0,6·(1,662 + 0,8·8,644) + 0,9·8,644 = 12,93 > 12; UC = 1,077 (was het oordeel 0,966).
  fouten += toetsMetOordeel("houten balk — lichte opslagvloer: bijkomende doorbuiging maatgevend",
    reken(met(tpl, { h: "250 mm", g_k: "0.5 kN/m", q_k: "2.6 kN/m" }),
      { sterkteklasse: C24, belastingduurklasse: MIDDELLANG, belastingcat: "5" }, PROJECT),
    { UC_doorbuiging: "0.966", w_bij: "12.93", UC_bij: "1.077", UC_slot: "1.077", voldoet: "0" });
  // C24, middellang, q_d = 5 kN/m (alleen q_k = 10/3).
  // σ_crit = 0,78·4900·7400/(200·4000) = 35,35; λ = 0,824; k_crit = 0,942;
  // UC_kip = 21,43/(0,942·14,77) = 1,54 (was 1,45 met k_crit = 1 en l_ef = 0,9·L).
  // σ_c,90 = 10 000/9100 = 1,099; UC = 1,099/(1,5·1,538) = 0,476 (was 0,387 met l_ef 160).
  fouten += toets("houten balk — C24, middellang, q_d = 5 kN/m",
    reken(met(tpl, { g_k: "0 kN/m", q_k: "10/3 kN/m" }), { sterkteklasse: C24, belastingduurklasse: MIDDELLANG }, PROJECT),
    { q_d: "5.00", UC_buiging: "1.451", sigma_mcrit: "35.35", lambda_relm: "0.824", k_crit: "0.942",
      UC_kip: "1.540", UC_c90: "0.476" });
  // C18 in klimaatklasse 3, middellang: k_mod 0,65, k_def 2,0; f_m,d = 0,65·18/1,3 = 9,00.
  fouten += toets("houten balk — C18, klimaatklasse 3, middellang",
    reken(tpl, { klimaatklasse: "3", belastingduurklasse: MIDDELLANG }, PROJECT),
    { f_mk: "18", k_mod: "0.65", k_def: "2.0", f_md: "9.00" });
  // GL24h, middellang, q_d = 5: k_c,90 1,75; σ_crit met (6.31), G_0,05 = 540:
  // I_z = 5,717·10⁶, I_tor = 200·70³/3·(1 − 0,63·0,35) = 17,82·10⁶;
  // σ_crit = π·√(9600·5,717·10⁶·540·17,82·10⁶)/(4000·466 667) = 38,68;
  // λ = √(24/38,68) = 0,788; k_crit = 0,969; UC = 21,43/(0,969·15,36) = 1,439.
  fouten += toets("houten balk — GL24h, middellang, q_d = 5 kN/m",
    reken(met(tpl, { g_k: "0 kN/m", q_k: "10/3 kN/m" }), { sterkteklasse: GL24h, belastingduurklasse: MIDDELLANG }, PROJECT),
    { gamma_M: "1.25", k_c90: "1.75", UC_c90: "0.393", sigma_mcrit: "38.68", k_crit: "0.969", UC_kip: "1.439" });
  // 40×240 over 6 m, C24: l_ef = 5400 + 480 = 5880; σ_crit = 0,78·1600·7400/(240·5880) = 6,544;
  // λ = √(24/6,544) = 1,915 > 1,4 → k_crit = 1/λ² = 0,273.
  fouten += toets("houten balk — C24 40×240 over 6 m, elastisch kippen",
    reken(met(tpl, { b: "40 mm", h: "240 mm", L: "6000 mm" }), { sterkteklasse: C24 }, PROJECT),
    { l_ef: "5880", sigma_mcrit: "6.544", lambda_relm: "1.915", k_crit: "0.273" });
  // CC3, dak (ψ_0 = ψ_2 = 0): q_d,a = 1,5·1,5 = 2,25; q_d,b = 1,3·1,5 + 1,65·2,0 = 5,25.
  fouten += toets("houten balk — CC3, dak",
    reken(tpl, { belastingcat: "8" }, { ...PROJECT, CC: 3 }),
    { gamma_Ga: "1.50", gamma_Gb: "1.30", gamma_Q: "1.65", psi_2: "0", q_da: "2.25", q_db: "5.25" });
  // Zwaar dak met sneeuw (ψ_0 = 0), C24, kort: q_d,a = 1,35·3,0 = 4,05; q_d,b = 1,2·3,0 + 1,5·0,5 = 4,35.
  // Alleen blijvend: q_d,G = 4,05 met k_mod 0,60; 4,05/0,60 = 6,75 > 4,35/0,90 = 4,83, dus maatgevend.
  // M = 4,05·4²/8 = 8,10; σ = 17,36; f_m,d = 0,6·24/1,3 = 11,08; UC = 1,567
  // (met q_d,b en k_mod 0,90 zou het 18,64/16,62 = 1,122 zijn).
  fouten += toets("houten balk — zwaar dak, sneeuw, kort: alleen blijvend maatgevend",
    reken(met(tpl, { g_k: "3.0 kN/m", q_k: "0.5 kN/m" }), { sterkteklasse: C24, belastingduurklasse: KORT, belastingcat: "9" }, PROJECT),
    { q_da: "4.05", q_db: "4.35", q_dG: "4.05", q_d: "4.05", k_mod: "0.60", M_Ed: "8.10", f_md: "11.08", UC_buiging: "1.567" });
  // Balkeinde minstens 30 mm voorbij de oplegging: l_ef = 100 + 2·30 = 160.
  fouten += toets("houten balk — balkeinde voorbij de oplegging",
    reken(tpl, { zijden: "2" }, PROJECT),
    { L_ef: "160" });
}

// ── Wringing ─────────────────────────────────────────────────────────────
// τ_tor,d = T_Ed/W_tor ≤ k_shape·f_v,d (6.14). Rechthoek: W_tor = α·h·b² met h de grootste en
// b de kleinste maat (Saint-Venant: α = 0,208 bij een vierkant, 0,246 bij h/b = 2, 0,299 bij
// h/b = 6) en k_shape = min(1 + 0,15·h/b; 2,0); rond: W_tor = π·d³/16 en k_shape = 1,2 (6.15).
{
  const tpl = bladen.ec5Wringing;
  // 100×200 C24, middellang, T = 1,0 kNm: W_tor = 0,2459·200·100² = 491 800 mm³; τ = 2,033;
  // k_shape = 1 + 0,15·2 = 1,3; f_v,d = 0,8·4,0/1,3 = 2,462; UC = 2,033/(1,3·2,462) = 0,6355.
  fouten += toetsMetOordeel("wringing — 100×200 C24, middellang",
    reken(tpl, { sterkteklasse: C24, belastingduurklasse: MIDDELLANG }, PROJECT),
    { h_1: "200", b_1: "100", alpha_tor: "0.2459", W_tor: "491800", k_shape: "1.3", f_vd: "2.462",
      tau_tord: "2.033", UC_wringing: "0.6355", UC_slot: "0.6355", voldoet: "1" });
  // Rond, d = 150, C18 blijvend: W_tor = π·150³/16 = 662 680 mm³; τ = 1,509; f_v,d = 0,6·3,4/1,3 = 1,569;
  // UC = 1,509/(1,2·1,569) = 0,8014.
  fouten += toets("wringing — rond d 150, C18, blijvend",
    reken(tpl, { vorm: "2" }, PROJECT),
    { W_tor: "662700", k_shape: "1.2", tau_tord: "1.509", UC_wringing: "0.8014" });
  // Vierkant 150×150 GL24h, kort, T = 3,0 kNm: α = 0,2082; W_tor = 0,2082·150·150² = 702 600 mm³;
  // τ = 4,270; k_shape = 1,15; f_v,d = 0,9·3,5/1,25 = 2,52; UC = 4,270/(1,15·2,52) = 1,473: voldoet niet.
  fouten += toetsMetOordeel("wringing — 150×150 GL24h, kort: voldoet niet",
    reken(met(tpl, { b: "150 mm", h: "150 mm", T_Ed: "3.0 kN*m" }), { sterkteklasse: GL24h, belastingduurklasse: KORT }, PROJECT),
    { alpha_tor: "0.2082", k_shape: "1.15", f_vd: "2.52", tau_tord: "4.270", UC_wringing: "1.473",
      UC_slot: "1.473", voldoet: "0" });
  // Plat 240×40 (b > h: de grootste maat telt als h), C24 middellang, T = 0,5 kNm:
  // α = 0,2984; W_tor = 0,2984·240·40² = 114 600 mm³; τ = 4,364; k_shape = 1 + 0,15·6 = 1,9;
  // UC = 4,364/(1,9·2,462) = 0,9331.
  fouten += toets("wringing — plat 240×40, C24, middellang",
    reken(met(tpl, { b: "240 mm", h: "40 mm", T_Ed: "0.5 kN*m" }), { sterkteklasse: C24, belastingduurklasse: MIDDELLANG }, PROJECT),
    { h_1: "240", b_1: "40", alpha_tor: "0.2984", k_shape: "1.9", tau_tord: "4.364", UC_wringing: "0.9331" });
}

// ── Tapse ligger ─────────────────────────────────────────────────────────
// Eenzijdig taps, op twee steunpunten, gelijkmatige q_d. De grootste spanning ligt op
// x = L·h_0/(h_0 + h_1) vanaf het lage einde; σ_m,α,d = σ_m,0,d = 6·M/(b·h_x²) (6.37) en
// σ_m,α,d ≤ k_m,α·f_m,d (6.38), met k_m,α volgens (6.39) bij trek en (6.40) bij druk langs de
// tapse rand. f_t,90,k = 0,4 (EN 338) en 0,5 N/mm² (EN 14080).
{
  const tpl = bladen.ec5TapseLigger;
  // GL24h 140 × 300/600 over 8 m, q_d = 6 kN/m, middellang: tan α = 300/8000 = 0,0375 (2,148°);
  // x = 8000·300/900 = 2667; h_x = 400; M = 6·2,667·5,333/2 = 42,67 kNm; σ = 6·42,67·10⁶/(140·400²) = 11,43.
  // f_m,d = 15,36; f_v,d = 2,24; f_c,90,d = 1,60; f_t,90,d = 0,8·0,5/1,25 = 0,32.
  // Druk (6.40): k = 1/√(1 + (15,36/(1,5·2,24)·0,0375)² + (15,36/1,60·0,0375²)²) = 1/√(1 + 0,02939 + 0,00018)
  // = 0,9855; UC = 11,43/(0,9855·15,36) = 0,7550; rechte rand 11,43/15,36 = 0,7440.
  fouten += toetsMetOordeel("tapse ligger — GL24h, druk langs de tapse rand",
    reken(tpl, { sterkteklasse: GL24h, belastingduurklasse: MIDDELLANG }, PROJECT),
    { f_t90k: "0.5", f_md: "15.36", f_vd: "2.24", f_c90d: "1.60", f_t90d: "0.32", tan_alpha: "0.0375",
      alpha: "2.148", x_m: "2667", h_x: "400", M_Ed: "42.67", sigma_mad: "11.43", k_malpha: "0.9855",
      UC_taps: "0.7550", UC_recht: "0.7440", UC_max: "0.7550", UC_slot: "0.7550", voldoet: "1" });
  // Trek (6.39): k = 1/√(1 + (15,36/(0,75·2,24)·0,0375)² + (15,36/0,32·0,0375²)²)
  // = 1/√(1 + 0,11755 + 0,00456) = 0,9440; UC = 11,43/(0,9440·15,36) = 0,7882.
  fouten += toets("tapse ligger — GL24h, trek langs de tapse rand",
    reken(tpl, { sterkteklasse: GL24h, belastingduurklasse: MIDDELLANG, tapserand: "2" }, PROJECT),
    { k_malpha: "0.9440", UC_taps: "0.7882", UC_max: "0.7882" });
  // C24 100 × 200/500 over 4 m, q_d = 5 kN/m, middellang: tan α = 0,075; x = 4000·200/700 = 1143;
  // h_x = 285,7; M = 5·1,143·2,857/2 = 8,163 kNm; σ = 6·8,163·10⁶/(100·285,7²) = 6,000.
  // f_m,d/(0,75·f_v,d) = 24/3 = 8 en f_m,d/f_t,90,d = 24/0,4 = 60, beide los van k_mod en γ_M:
  // trek: k = 1/√(1 + 0,6² + (60·0,005625)²) = 1/√1,4739 = 0,8237; UC = 6,000/(0,8237·14,77) = 0,4932.
  const steil = met(tpl, { b: "100 mm", h_0: "200 mm", h_1: "500 mm", L: "4000 mm", q_d: "5.0 kN/m" });
  fouten += toets("tapse ligger — C24, steiler, trek",
    reken(steil, { sterkteklasse: C24, belastingduurklasse: MIDDELLANG, tapserand: "2" }, PROJECT),
    { f_t90k: "0.4", tan_alpha: "0.075", x_m: "1143", h_x: "285.7", M_Ed: "8.163", sigma_mad: "6.000",
      k_malpha: "0.8237", UC_taps: "0.4932" });
  // Druk: k = 1/√(1 + (4·0,075)² + (9,6·0,005625)²) = 1/√1,0929 = 0,9565; UC = 6,000/(0,9565·14,77) = 0,4247.
  fouten += toets("tapse ligger — C24, steiler, druk",
    reken(steil, { sterkteklasse: C24, belastingduurklasse: MIDDELLANG }, PROJECT),
    { k_malpha: "0.9565", UC_taps: "0.4247" });
  // Afschuiving bij het lage einde (6.13), k_cr = 1,0: in de standaardset V = 6·8/2 = 24 kN,
  // τ = 1,5·24 000/(140·300) = 0,8571, f_v,d = 2,24 → UC_v = 0,3827; de buiging (0,7550) blijft maatgevend.
  fouten += toets("tapse ligger — afschuiving bij het lage einde, standaardset",
    reken(tpl, { sterkteklasse: GL24h, belastingduurklasse: MIDDELLANG }, PROJECT),
    { V_Ed: "24", tau_d: "0.8571", UC_v: "0.3827", UC_max: "0.7550" });
  // Kort en hoog: GL24h 140 × 200/600 over 3 m, q_d = 25 kN/m, middellang. De verhouding τ/σ is h_1/L
  // (σ_max = 3qL²/(4·b·h_0·h_1), τ = 0,75·qL/(b·h_0)), hier 0,2: afschuiving wordt maatgevend.
  // V = 37,5 kN; τ = 1,5·37 500/(140·200) = 2,009; UC_v = 2,009/2,24 = 0,8968.
  // σ = 3·25·3000²/(4·140·200·600) = 10,045 (x = 750, h_x = 300, M = 25·0,75·2,25/2 = 21,09 kNm);
  // tan α = 400/3000 = 0,1333; druk (6.40): k = 1/√(1 + (15,36/3,36·0,1333)² + (15,36/1,60·0,01778)²)
  // = 1/√(1 + 0,37152 + 0,02913) = 0,84496; UC_taps = 10,045/(0,84496·15,36) = 0,7739; rechte rand 10,045/15,36 = 0,6539.
  // Maatgevend afschuiving 0,8968: voldoet. Zonder deze toets bleef het oordeel op 0,7739 staan.
  fouten += toetsMetOordeel("tapse ligger — kort en hoog: afschuiving bij het lage einde maatgevend",
    reken(met(tpl, { h_0: "200 mm", h_1: "600 mm", L: "3000 mm", q_d: "25 kN/m" }), { sterkteklasse: GL24h, belastingduurklasse: MIDDELLANG }, PROJECT),
    { x_m: "750", h_x: "300", M_Ed: "21.09", sigma_mad: "10.04", k_malpha: "0.8450", UC_taps: "0.7739", UC_recht: "0.6539",
      V_Ed: "37.5", tau_d: "2.009", UC_v: "0.8968", UC_max: "0.8968", UC_slot: "0.8968", voldoet: "1" });
  // Met q_d = 30 kN/m: τ = 2,411, UC_v = 1,076 > 1 terwijl de buiging 12,054/(0,84496·15,36) = 0,9287 geeft: voldoet niet.
  fouten += toetsMetOordeel("tapse ligger — kort en hoog, q_d 30: voldoet niet op afschuiving",
    reken(met(tpl, { h_0: "200 mm", h_1: "600 mm", L: "3000 mm", q_d: "30 kN/m" }), { sterkteklasse: GL24h, belastingduurklasse: MIDDELLANG }, PROJECT),
    { UC_taps: "0.9287", UC_v: "1.076", UC_slot: "1.076", voldoet: "0" });
  {
    const got = reken(tpl, { sterkteklasse: GL24h, belastingduurklasse: MIDDELLANG }, PROJECT);
    const ok = /Niet getoetst: kip \(§6\.3\.3\), doorbuiging \(§7\.2\) en de oplegdruk/.test(got.text);
    if (!ok) fouten++;
    console.log(`\ntapse ligger — regel niet getoetst\n  ${ok ? "OK    " : "FOUT  "} kip, doorbuiging en oplegdruk genoemd`);
  }
}

// ── Uitkeping bij de oplegging ───────────────────────────────────────────
// τ_d = 1,5·V/(b_ef·h_ef) ≤ k_v·f_v,d (6.60), b_ef = b met k_cr = 1,0 (NB art. 6.1.7(2)).
// Uitkeping aan de kant van de oplegging (6.62):
// k_v = min(1; k_n·(1 + 1,1·i^1,5/√h)/(√h·(√(α(1−α)) + 0,8·x/h·√(1/α − α²)))), k_n = 5 massief,
// 6,5 gelamineerd (6.63); aan de andere kant k_v = 1 (6.61).
{
  const tpl = bladen.ec5Uitkeping;
  // 100×250, h_ef = 175 (α = 0,7), x = 60, haaks (i = 0), V = 12 kN, C24 middellang:
  // √(0,7·0,3) = 0,4583; 0,8·0,24·√(1/0,7 − 0,49) = 0,1860; k_v = 5/(15,81·0,6443) = 0,4908;
  // τ = 1,5·12 000/(100·175) = 1,029; f_v,d = 2,462; UC = 1,029/(0,4908·2,462) = 0,8513.
  fouten += toetsMetOordeel("uitkeping — C24 100×250, h_ef 175, x 60",
    reken(tpl, { sterkteklasse: C24, belastingduurklasse: MIDDELLANG }, PROJECT),
    { alpha: "0.7", k_n: "5", k_v: "0.4908", b_ef: "100", tau_d: "1.029", UC_uitkeping: "0.8513",
      UC_slot: "0.8513", voldoet: "1" });
  // GL24h: k_n = 6,5 → k_v = 6,5/10,187 = 0,6381; f_v,d = 2,24; UC = 1,029/(0,6381·2,24) = 0,7196.
  fouten += toets("uitkeping — GL24h, k_n 6,5",
    reken(tpl, { sterkteklasse: GL24h, belastingduurklasse: MIDDELLANG }, PROJECT),
    { k_n: "6.5", k_v: "0.6381", UC_uitkeping: "0.7196" });
  // Afgeschuind met i = 2: factor 1 + 1,1·2^1,5/√250 = 1,1968; k_v = 0,4908·1,1968 = 0,5874; UC = 1,029/(0,5874·2,462) = 0,7113.
  fouten += toets("uitkeping — C24, afgeschuind i = 2",
    reken(met(tpl, { i_uk: "2" }), { sterkteklasse: C24, belastingduurklasse: MIDDELLANG }, PROJECT),
    { k_v: "0.5874", UC_uitkeping: "0.7113" });
  // x = 120: 0,8·0,48·0,9688 = 0,3720; k_v = 5/(15,81·0,8303) = 0,3809.
  fouten += toets("uitkeping — C24, x 120 mm",
    reken(met(tpl, { x: "120 mm" }), { sterkteklasse: C24, belastingduurklasse: MIDDELLANG }, PROJECT),
    { k_v: "0.3809" });
  // Ondiepe uitkeping h_ef = 245 (α = 0,98), x = 10: de formule geeft 2,14, dus k_v = 1 (ten hoogste 1).
  fouten += toets("uitkeping — ondiep: k_v begrensd op 1",
    reken(met(tpl, { h_ef: "245 mm", x: "10 mm" }), { sterkteklasse: C24, belastingduurklasse: MIDDELLANG }, PROJECT),
    { k_v: "1.0" });
  // Uitkeping aan de andere kant (6.61): k_v = 1; UC = 1,029/2,462 = 0,4179.
  fouten += toets("uitkeping — tegenover de oplegging",
    reken(tpl, { sterkteklasse: C24, belastingduurklasse: MIDDELLANG, zijde: "2" }, PROJECT),
    { k_v: "1.0", UC_uitkeping: "0.4179" });
  // V = 16 kN, C18 blijvend: τ = 1,371; f_v,d = 1,569; UC = 1,371/(0,4908·1,569) = 1,781: voldoet niet.
  fouten += toetsMetOordeel("uitkeping — C18, blijvend, V 16 kN: voldoet niet",
    reken(met(tpl, { V_Ed: "16 kN" }), {}, PROJECT),
    { f_vd: "1.569", tau_d: "1.371", UC_uitkeping: "1.781", UC_slot: "1.781", voldoet: "0" });
}

// ── Vloer- en dakbeschot ─────────────────────────────────────────────────
// Doorgaande ligger over n gelijke velden (hart-op-hartafstand L): g op alle velden,
// q op de ongunstigste velden en de puntlast Q op de ongunstigste plaats (6.2.1 van
// NEN-EN 1991-1-1). Veld en steunpunt apart, g en q (of Q) opgeteld. Doorbuiging
// w_bij = k_def·(w_G + ψ_2·w_Q) + ψ·w_Q (ψ_1, of 1,0 bij een overig dak) ≤ 0,003·L,
// L/500 of L/250 en w_net,fin = w_G·(1 + k_def) + w_Q·(1 + ψ_2·k_def) ≤ L/250.
{
  const tpl = bladen.ec5Beschot;

  // Eigen driemomentenberekening (L = 1, EI = 1): steunmomenten, en per veld M(x) en
  // w(x) uit w'' = −M met w = 0 op beide steunpunten.
  function doorgaand(n, last, punt) {
    const M = new Array(n + 1).fill(0);
    if (n > 1) {
      const m = n - 1, A = [], r = [];
      for (let j = 1; j <= m; j++) {
        A.push(Array.from({ length: m }, (_, k) => (k === j - 1 ? 4 : Math.abs(k - (j - 1)) === 1 ? 1 : 0)));
        let rhs = last[j - 1] / 4 + last[j] / 4;
        if (punt && punt.veld === j - 1) rhs += punt.a * (1 - punt.a) * (1 + punt.a);
        if (punt && punt.veld === j) rhs += punt.a * (1 - punt.a) * (2 - punt.a);
        r.push(-rhs);
      }
      for (let k = 0; k < m; k++) for (let i = k + 1; i < m; i++) {
        const f = A[i][k] / A[k][k];
        for (let c = k; c < m; c++) A[i][c] -= f * A[k][c];
        r[i] -= f * r[k];
      }
      for (let i = m - 1; i >= 0; i--) {
        let s = r[i];
        for (let c = i + 1; c < m; c++) s -= A[i][c] * M[c + 1];
        M[i + 1] = s / A[i][i];
      }
    }
    const N = 400;
    let Mmax = 0, Mmin = 0, wmax = 0;
    for (let v = 0; v < n; v++) {
      const Ms = [];
      for (let k = 0; k <= N; k++) {
        const x = k / N;
        let Mx = (last[v] * x * (1 - x)) / 2 + M[v] * (1 - x) + M[v + 1] * x;
        if (punt && punt.veld === v) Mx += x <= punt.a ? (1 - punt.a) * x : punt.a * (1 - x);
        Ms.push(Mx);
        Mmax = Math.max(Mmax, Mx); Mmin = Math.min(Mmin, Mx);
      }
      let th = 0, u = 0;
      const us = [0];
      for (let k = 1; k <= N; k++) {
        const th1 = th + (Ms[k] + Ms[k - 1]) / 2 / N;
        u += (th + th1) / 2 / N; th = th1; us.push(u);
      }
      for (let k = 0; k <= N; k++) wmax = Math.max(wmax, -(us[k] - (us[N] * k) / N));
    }
    return { Mmax, Mmin, wmax };
  }
  function coefficienten(n) {
    const alle = doorgaand(n, new Array(n).fill(1));
    const c = { gf: alle.Mmax, gs: -alle.Mmin, gw: alle.wmax, qf: 0, qs: 0, qw: 0, Pf: 0, Ps: 0, Pw: 0 };
    for (let mask = 1; mask < 1 << n; mask++) {
      const r = doorgaand(n, Array.from({ length: n }, (_, i) => (mask >> i) & 1));
      c.qf = Math.max(c.qf, r.Mmax); c.qs = Math.max(c.qs, -r.Mmin); c.qw = Math.max(c.qw, r.wmax);
    }
    for (let v = 0; v < n; v++) for (let k = 1; k < 200; k++) {
      const r = doorgaand(n, new Array(n).fill(0), { veld: v, a: k / 200 });
      c.Pf = Math.max(c.Pf, r.Mmax); c.Ps = Math.max(c.Ps, -r.Mmin); c.Pw = Math.max(c.Pw, r.wmax);
    }
    return c;
  }
  const SLEUTELS = ["gf", "gs", "gw", "qf", "qs", "qw", "Pf", "Ps", "Pw"];
  const EIGEN = { 1: coefficienten(1), 2: coefficienten(2), 3: coefficienten(3) };
  // Vier of meer velden: de omhullende over vier tot en met acht velden.
  EIGEN[4] = Object.fromEntries(SLEUTELS.map((k) => [k, 0]));
  for (let n = 4; n <= 8; n++) {
    const c = coefficienten(n);
    for (const k of SLEUTELS) EIGEN[4][k] = Math.max(EIGEN[4][k], c[k]);
  }
  // Bekende waarden voor één en twee velden: ql²/8, 5ql⁴/384, PL/4, PL³/48; 9ql²/128 en ql²/8.
  const bekend = [[EIGEN[1].gf, 1 / 8], [EIGEN[1].gw, 5 / 384], [EIGEN[1].Pf, 1 / 4], [EIGEN[1].Pw, 1 / 48],
    [EIGEN[2].gf, 9 / 128], [EIGEN[2].gs, 1 / 8], [EIGEN[3].gs, 1 / 10]];
  const eigenOk = bekend.every(([a, b]) => Math.abs(a - b) <= 2e-4 * b);
  if (!eigenOk) fouten++;
  console.log(`\nbeschot — eigen driemomentenberekening tegen bekende waarden\n  ${eigenOk ? "OK    " : "FOUT  "} ql²/8, 5ql⁴/384, PL/4, PL³/48, 9ql²/128, ql²/8 en ql²/10`);

  // De tabel in het blad: niet lager dan de eigen waarde en ten hoogste 0,1 % erboven.
  const rijen = tpl.match(/coef = \[([^\]]+)\]/)[1].split("|").map((r) => r.split(";").map(Number));
  console.log("\nbeschot — coëfficiënten in het blad tegen de eigen berekening");
  let coefFout = 0;
  for (let kol = 0; kol < 4; kol++) {
    const n = rijen[0][kol];
    for (const [i, k] of SLEUTELS.entries()) {
      const blad = rijen[i + 1][kol], eigen = EIGEN[n][k];
      const ok = eigen < 1e-9 ? blad === 0 : blad >= eigen * (1 - 2e-5) && blad <= eigen * 1.001;
      if (!ok) { coefFout++; console.log(`  FOUT   ${n} velden, ${k}: blad ${blad}, eigen ${eigen.toPrecision(6)}`); }
    }
  }
  fouten += coefFout;
  if (!coefFout) console.log(`  OK     ${4 * SLEUTELS.length} coëfficiënten: niet lager dan de eigen waarde, ten hoogste 0,1 % erboven`);

  // Materialen: massief hout EN 338 [f_m,k, E_0,mean]; k_mod per klimaatklasse (tabel 3.1, null = niet
  // toegestaan), k_def (tabel 3.2) en γ_M (tabel 2.3) per materiaal: massief, multiplex, OSB/3-4, P5, P7.
  const HOUT = [null, [14, 7000], [16, 8000], [18, 9000], [20, 9500], [22, 10000], [24, 11000], [27, 11500], [30, 12000]];
  const MASSIEF = [0.6, 0.7, 0.8, 0.9, 1.1], MASSIEF3 = [0.5, 0.55, 0.65, 0.7, 0.9];
  const KMOD = [null,
    [MASSIEF, MASSIEF, MASSIEF3], [MASSIEF, MASSIEF, MASSIEF3],
    [[0.4, 0.5, 0.7, 0.9, 1.1], [0.3, 0.4, 0.55, 0.7, 0.9], null],
    [[0.3, 0.45, 0.65, 0.85, 1.1], [0.2, 0.3, 0.45, 0.6, 0.8], null],
    [[0.4, 0.5, 0.7, 0.9, 1.1], [0.3, 0.4, 0.55, 0.7, 0.9], null]];
  const KDEF = [null, [0.6, 0.8, 2.0], [0.8, 1.0, 2.5], [1.5, 2.25], [2.25, 3.0], [1.5, 2.25]];
  const GM = [null, 1.3, 1.2, 1.2, 1.3, 1.3];
  // Categorie: [q_k, Q_k, ψ_0, ψ_1, ψ_2] (NEN-EN 1991-1-1 NB; NEN-EN 1990 tabel NB.2 — A1.1).
  const CAT = [null, [1.75, 3, 0.4, 0.5, 0.3], [2.0, 3, 0.4, 0.5, 0.3], [2.5, 3, 0.4, 0.5, 0.3], [3.0, 3, 0.4, 0.5, 0.3],
    [2.5, 3, 0.5, 0.5, 0.3], [4.0, 3, 0.4, 0.7, 0.6], [4.0, 7, 0.4, 0.7, 0.6], [5.0, 7, 0.4, 0.7, 0.6],
    [4.0, 7, 0.4, 0.7, 0.6], [1.0, 1.5, 0, 0, 0]];
  const STANDAARD = {
    materiaal: 1, sterkteklasse: 1, klimaatklasse: 1, belastingduurklasse: 1, velden: 1, t: 22, L: 600, b_v: 300,
    g_k: 0.25, gebruikscategorie: 1, toepassing: 1, f_m_plaat: 14.8, E_plaat: 4930, CC: 2,
  };

  function beschot(v) {
    const km = KMOD[v.materiaal][v.klimaatklasse - 1];
    if (!km) return { toegestaan: false };
    const kG = km[0], kQ = km[v.belastingduurklasse - 1], kdef = KDEF[v.materiaal][v.klimaatklasse - 1], gM = GM[v.materiaal];
    const [fmk, E] = v.materiaal === 1 ? HOUT[v.sterkteklasse] : [v.f_m_plaat, v.E_plaat];
    const kh = v.materiaal === 1 ? Math.min((150 / v.t) ** 0.2, 1.3) : 1;
    const [qk, Qk, p0, p1, p2] = CAT[v.gebruikscategorie];
    const c = EIGEN[v.velden];
    const gGa = v.CC === 1 ? 1.2 : v.CC === 3 ? 1.5 : 1.35, gGb = v.CC === 1 ? 1.1 : v.CC === 3 ? 1.3 : 1.2;
    const gQ = v.CC === 1 ? 1.35 : v.CC === 3 ? 1.65 : 1.5;
    // N en mm: kN/m² = 10⁻³ N/mm².
    const g = v.g_k / 1000, q = qk / 1000, Q = Qk * 1000, L = v.L, t = v.t, bm = 1000, bv = v.b_v;
    const fG = (kG * kh * fmk) / gM, fQ = (kQ * kh * fmk) / gM;
    const uc = (Mgf, Mgs, Mvf, Mvs, W) => Math.max(
      Math.max(gGa * Mgf + gQ * p0 * Mvf, gGa * Mgs + gQ * p0 * Mvs, gGb * Mgf + gQ * Mvf, gGb * Mgs + gQ * Mvs) / W / fQ,
      (gGa * Math.max(Mgf, Mgs)) / W / fG);
    const UC_mq = uc(c.gf * g * bm * L * L, c.gs * g * bm * L * L, c.qf * q * bm * L * L, c.qs * q * bm * L * L, (bm * t * t) / 6);
    const UC_mQ = uc(c.gf * g * bv * L * L, c.gs * g * bv * L * L, c.Pf * Q * L, c.Ps * Q * L, (bv * t * t) / 6);
    const Im = (bm * t ** 3) / 12, Iv = (bv * t ** 3) / 12;
    const wG = (c.gw * g * bm * L ** 4) / (E * Im), wq = (c.qw * q * bm * L ** 4) / (E * Im), wQ = (c.Pw * Q * L ** 3) / (E * Iv);
    const pw3 = v.toepassing === 3 ? 1 : p1;
    const bij = (L * (v.toepassing === 2 ? 1 / 500 : v.toepassing === 3 ? 1 / 250 : 0.003)), fin = L / 250;
    const r = {
      toegestaan: true, UC_mq, UC_mQ, w_G: wG, w_q: wq, w_Q: wQ,
      UC_bij_q: (kdef * (wG + p2 * wq) + pw3 * wq) / bij, UC_fin_q: (wG * (1 + kdef) + wq * (1 + p2 * kdef)) / fin,
      UC_bij_Q: (kdef * (wG + p2 * wQ) + pw3 * wQ) / bij, UC_fin_Q: (wG * (1 + kdef) + wQ * (1 + p2 * kdef)) / fin,
    };
    r.UC_max = Math.max(r.UC_mq, r.UC_mQ, r.UC_bij_q, r.UC_fin_q, r.UC_bij_Q, r.UC_fin_Q);
    return r;
  }
  const s4b = (x) => (x === 0 ? "0" : x.toFixed(Math.max(0, 3 - Math.floor(Math.log10(Math.abs(x))))));
  // Tolerantie 0,2 %: de coëfficiënten in het blad liggen tot 0,1 % boven de exacte.
  const ruimB = (x) => ({ waarde: s4b(x), tol: Math.max(Math.abs(x) * 0.002, 1e-6) });
  const LETTERLIJK = ["t", "L", "b_v", "g_k", "f_m_plaat", "E_plaat"];
  const eenheid = { t: "mm", L: "mm", b_v: "mm", g_k: "kN/m^2", f_m_plaat: "N/mm^2", E_plaat: "N/mm^2" };
  const rekenSet = (v) => {
    const letterlijk = Object.fromEntries(LETTERLIJK.filter((k) => v[k] !== STANDAARD[k]).map((k) => [k, `${v[k]} ${eenheid[k]}`]));
    const keuzes = Object.fromEntries(["materiaal", "sterkteklasse", "klimaatklasse", "belastingduurklasse", "velden", "gebruikscategorie", "toepassing"].map((k) => [k, String(v[k])]));
    return reken(Object.keys(letterlijk).length ? met(tpl, letterlijk) : tpl, keuzes, { ...PROJECT, CC: v.CC });
  };

  // Met de hand.
  // Standaard: planken C14 22 mm op 600 mm, één veld, blijvend, categorie A (q_k 1,75, Q_k 3 kN), b_v = 300.
  // k_h = min((150/22)^0,2; 1,3) = 1,3; f_m,d = 0,6·1,3·14/1,3 = 8,40.
  // q: M_d = 1,2·0,125·0,25·0,36 + 1,5·0,125·1,75·0,36 = 0,01350 + 0,1181 = 0,1316 kNm; W = 1000·22²/6 = 80 667;
  //    σ = 1,632, UC = 0,1943.
  // Q: M_d = 1,2·0,125·0,25·0,3·0,36 + 1,5·3·0,6/4 = 0,00405 + 0,675 = 0,6791 kNm; W = 300·22²/6 = 24 200;
  //    σ = 28,06, UC = 3,340 (M_d = 0,67905).
  // w_Q = 3000·600³/(48·7000·300·22³/12) = 7,245 mm (het blad met 0,02084 in plaats van 1/48: 7,247);
  // w_G = 5·0,25·10⁻³·1000·600⁴/(384·7000·887 333) = 0,0679; w_net,fin = 0,0679·1,6 + 7,247·1,18 = 8,66 > 600/250 = 2,4:
  // UC = 3,608, maatgevend. w_bij = 0,6·(0,0679 + 0,3·7,247) + 0,5·7,247 = 4,969 > 1,8: UC = 2,760.
  fouten += toetsMetOordeel("beschot — standaard: planken C14 22 mm, één veld, puntlast 3 kN op 300 mm",
    rekenSet(STANDAARD),
    { k_h: "1.3", f_md_Q: "8.40", M_db: "0.1316", sigma_mq: "1.632", UC_mq: "0.1943", M_dbv: "0.679", W_v: "24200",
      sigma_mQ: "28.06", UC_mQ: "3.340", w_Q: "7.25", w_G: "0.0680", UC_fin_Q: "3.608", UC_bij_Q: "2.760",
      UC_slot: "3.608", voldoet: "0" });
  // Planken C24 28 mm op 500 mm over drie velden, middellang, b_v = 300: k_h = 1,3, f_m,d = 0,8·1,3·24/1,3 = 19,2.
  // Q: M_veld = 1,2·0,08·0,25·0,3·0,25 + 1,5·0,2050·3·0,5 = 0,0018 + 0,4613 = 0,4631 kNm (steunpunt
  // 1,2·0,1·0,25·0,3·0,25 + 1,5·0,1027·1,5 = 0,2333); W = 300·28²/6 = 39 200; σ = 11,81; UC = 0,6152.
  // q: steunpunt maatgevend, 1,2·0,1·0,25·0,25 + 1,5·0,1167·1,75·0,25 = 0,08408 kNm; σ = 0,6435, UC = 0,03352.
  // w_Q = 0,01473·3000·500³/(11 000·300·28³/12) = 0,9150; w_G = 0,005346; w_bij = 0,6·(0,005346 + 0,3·0,9150)
  // + 0,5·0,9150 = 0,6254 ≤ 1,5: UC = 0,4169; w_net,fin = 0,00855 + 0,9150·1,18 = 1,088 ≤ 2,0: UC = 0,5441. Voldoet.
  fouten += toetsMetOordeel("beschot — planken C24 28 mm op 500 mm, drie velden, middellang: voldoet",
    rekenSet({ ...STANDAARD, sterkteklasse: 6, t: 28, L: 500, velden: 3, belastingduurklasse: 3 }),
    { f_md_Q: "19.20", M_dbv: "0.4631", sigma_mQ: "11.81", UC_mQ: "0.6152", M_db: "0.08408", UC_mq: "0.03352",
      w_Q: "0.9150", w_G: "0.005346", UC_bij_Q: "0.4169", UC_fin_Q: "0.5441", UC_slot: "0.6152", voldoet: "1" });
  // OSB 18 mm (f_m,k 14,8, E 4930) op 600 mm, twee velden, klimaatklasse 2, kort, dak (H: Q_k 1,5 kN, ψ = 0),
  // overig dak, g_k 0,3: k_mod 0,70 en blijvend 0,30, k_def 2,25, γ_M 1,2; f_m,d = 0,7·14,8/1,2 = 8,633.
  // Q: 1,2·0,07032·0,3·0,3·0,36 + 1,5·0,2075·1,5·0,6 = 0,00273 + 0,2801 = 0,2829 kNm; W = 300·18²/6 = 16 200;
  // σ = 17,46, UC = 2,022. w_Q = 0,01510·1500·600³/(4930·300·18³/12) = 6,806; w_G = 0,08790;
  // w_bij = 2,25·0,0879 + 6,806 = 7,004 > 2,4 (L/250): UC = 2,918; w_net,fin = 0,0879·3,25 + 6,806 = 7,092: UC = 2,955.
  fouten += toetsMetOordeel("beschot — OSB 18 mm, twee velden, klimaatklasse 2, dak",
    rekenSet({ ...STANDAARD, materiaal: 3, klimaatklasse: 2, belastingduurklasse: 4, velden: 2, t: 18, g_k: 0.3, gebruikscategorie: 10, toepassing: 3 }),
    { k_mod_G: "0.30", k_mod_Q: "0.70", k_def: "2.25", gamma_M: "1.2", f_md_Q: "8.633", sigma_mQ: "17.46", UC_mQ: "2.022",
      w_Q: "6.806", w_G: "0.08790", UC_bij_Q: "2.918", UC_fin_Q: "2.955", UC_slot: "2.955", voldoet: "0" });
  // OSB in klimaatklasse 3: niet toegestaan (tabel 3.1): geen UC, het beschot voldoet niet.
  {
    const got = rekenSet({ ...STANDAARD, materiaal: 3, klimaatklasse: 3 });
    const ok = /mag in klimaatklasse 3 niet worden toegepast/.test(got.text) && /niet bepaald → het beschot voldoet niet/.test(got.text) && !/NaN/.test(got.text);
    if (!ok) fouten++;
    console.log(`\nbeschot — OSB in klimaatklasse 3\n  ${ok ? "OK    " : "FOUT  "} niet toegestaan, geen UC`);
  }

  // Narekening over een reeks materialen, velden, categorieën, klimaat- en duurklassen.
  let zaad = 20260927;
  const kies = (lijst) => { zaad = (zaad * 1103515245 + 12345) % 2147483648; return lijst[zaad % lijst.length]; };
  for (let k = 0; k < 40; k++) {
    const v = {
      ...STANDAARD, materiaal: 1 + (k % 5), sterkteklasse: kies([1, 3, 6, 8]), klimaatklasse: kies([1, 1, 2, 3]),
      belastingduurklasse: kies([1, 2, 3, 4, 5]), velden: 1 + ((k >> 1) % 4), t: kies([18, 22, 28, 40]), L: kies([400, 500, 600, 800]),
      b_v: kies([100, 200, 300, 500]), g_k: kies([0.2, 0.4]), gebruikscategorie: 1 + (k % 10), toepassing: kies([1, 2, 3]),
      f_m_plaat: kies([14.8, 23.0]), E_plaat: kies([4930, 8000]), CC: kies([1, 2, 3]),
    };
    const r = beschot(v);
    const got = rekenSet(v);
    const naam = `beschot — narekening ${k + 1}: materiaal ${v.materiaal}, ${v.velden} veld(en), categorie ${v.gebruikscategorie}, klimaatklasse ${v.klimaatklasse}`;
    if (!r.toegestaan) {
      const ok = /niet worden toegepast/.test(got.text) && !/Maatgevende UC =/.test(got.text);
      if (!ok) fouten++;
      console.log(`\n${naam}\n  ${ok ? "OK    " : "FOUT  "} niet toegestaan`);
      continue;
    }
    const verwacht = Object.fromEntries(["UC_mq", "UC_mQ", "UC_bij_q", "UC_fin_q", "UC_bij_Q", "UC_fin_Q", "w_G", "w_q", "w_Q"].map((x) => [x, ruimB(r[x])]));
    fouten += toetsMetOordeel(naam, got, { ...verwacht, UC_slot: ruimB(r.UC_max), voldoet: r.UC_max <= 1 ? "1" : "0" });
  }
}

afronden(fouten, "Normbladen EN 1995-1-1");
