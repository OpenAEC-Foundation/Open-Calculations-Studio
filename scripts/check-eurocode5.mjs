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
 * in de doorbuiging ψ_2 per belastingcategorie. Per blad leest één set ook het
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

/** Zet voorbeeldwaarden in de bladtekst: `{ L_opl: "450 mm" }`. */
function met(tpl, waarden) {
  let uit = tpl;
  for (const [naam, waarde] of Object.entries(waarden)) {
    const regel = new RegExp(`^(${naam} = )[^'\\n]+`, "m");
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
{
  const tpl = bladen.ec5Doorbuiging;
  // Standaard: C18, klimaatklasse 1, categorie A (ψ_2 0,3).
  // w_G = 5·1,0·4000⁴/(384·9000·46,67·10⁶) = 7,937; w_Q = 19,84; w_inst = 27,78;
  // w_fin = 7,937·1,6 + 19,84·(1 + 0,3·0,6) = 12,70 + 23,41 = 36,11;
  // UC: 27,78/13,33 = 2,083; 36,11/16 = 2,257; 36,11/26,67 = 1,354.
  fouten += toetsMetOordeel("doorbuiging — standaard (C18, klimaatklasse 1, categorie A)",
    reken(tpl, {}, PROJECT),
    { E_mean: "9000", k_def: "0.60", psi_2: "0.3", w_inst: "27.78", w_fin: "36.11",
      UC_inst: "2.083", UC_netfin: "2.257", UC_fin: "1.354", UC_max: "2.257", UC_slot: "2.257", voldoet: "0" });
  // GL32h (E_0,mean 14 200 volgens EN 14080, was 13 700), klimaatklasse 2, opslag (ψ_2 0,8, was vast 0,3):
  // w_G = 7,937·9000/14 200 = 5,030; w_Q = 12,58; w_fin,Q = 12,58·(1 + 0,8·0,8) = 20,62;
  // w_net,fin = 5,030·1,8 + 20,62 = 29,68; UC = 29,68/16 = 1,855 (was 1,597).
  fouten += toets("doorbuiging — GL32h, klimaatklasse 2, categorie E",
    reken(tpl, { sterkteklasse: GL32h, klimaatklasse: "2", belastingcat: "5" }, PROJECT),
    { E_mean: "14200", k_def: "0.80", psi_2: "0.8", w_inst_G: "5.030", w_fin_Q: "20.62", w_netfin: "29.68",
      UC_netfin: "1.855" });
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
  // Maatgevend is kip: UC_max = 2,564, de balk voldoet niet.
  fouten += toetsMetOordeel("houten balk — standaard (C18, blijvend, CC2, categorie A)",
    reken(tpl, {}, PROJECT),
    { q_da: "3.225", q_db: "4.80", q_d: "4.80", M_Ed: "9.60", f_md: "8.31", UC_buiging: "2.476",
      tau_d: "1.029", UC_afschuiving: "0.6555", L_ef: "130", UC_c90: "0.693",
      l_ef: "4000", sigma_mcrit: "28.67", lambda_relm: "0.792", k_crit: "0.966", UC_kip: "2.564",
      w_netfin: "37.78", UC_doorbuiging: "2.361", UC_slot: "2.564", voldoet: "0" });
  // C24 100×300, middellang: q_d = 4,80 met k_mod 0,80 (2,025/0,6 = 3,375 < 4,8/0,8 = 6,0).
  // σ = 9,60·10⁶/1,5·10⁶ = 6,40; f_m,d = 14,77; UC = 0,433.
  // τ = 1,5·9600/(100·300) = 0,480; f_v,d = 2,462; UC = 0,195.
  // σ_c,90 = 9600/(100·130) = 0,738; UC = 0,738/(1,5·1,538) = 0,320.
  // l_ef = 3600 + 600 = 4200; σ_crit = 0,78·100²·7400/(300·4200) = 45,81; λ = 0,724 → k_crit 1.
  // w = 2,020·1,6 + 2,694·1,18 = 6,411; UC = 0,401. UC_max = 0,433: de balk voldoet.
  fouten += toetsMetOordeel("houten balk — C24 100×300, middellang: voldoet",
    reken(met(tpl, { b: "100 mm", h: "300 mm" }), { sterkteklasse: C24, belastingduurklasse: MIDDELLANG }, PROJECT),
    { UC_buiging: "0.433", UC_afschuiving: "0.195", UC_c90: "0.320", k_crit: "1.0", UC_kip: "0.433",
      w_netfin: "6.41", UC_doorbuiging: "0.401", UC_slot: "0.433", voldoet: "1" });
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

afronden(fouten, "Normbladen EN 1995-1-1");
