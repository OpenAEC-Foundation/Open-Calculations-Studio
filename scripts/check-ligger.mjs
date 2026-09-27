/**
 * Controlescript voor de module Ligger (templates/ligger.ts): één blad voor een
 * ligger van hout of staal op steunpunten.
 *
 * Geen referentieberekening beschikbaar. De rekenkern zelf (de oplossing van
 * de ligger, de omhullende) is getoetst in scripts/check-ligger-kern.mjs, tegen
 * gesloten formules en een onafhankelijke numerieke oplossing. Dit script
 * toetst het blad: lasten, factoren, combinaties, belastingsduur, de toetsen
 * en de doorbuiging, met voorbeelden die hieronder met de hand zijn
 * uitgewerkt (de formules staan in de code, de getallen in het commentaar):
 *
 *   1. Houten vloerbalk op twee steunpunten (het voorbeeld van het beeld):
 *      buiging, afschuiving, oplegdruk, w_max en w_bij met k_def.
 *   2. Stalen IPE 300 op twee steunpunten, kip met M_cr volgens bijlage NB.NB
 *      en de last op de bovenflens.
 *   2b. Kip met een puntlast: alleen gaffels (kwartpunten) en met kipsteunen
 *      (rechte momentenlijn: C_1 uit tabel NB.NB.1, L_kip = (1,4 − 0,8β)·L_st).
 *   3. Twee gelijke velden in staal: schaakbordbelasting (het grootste
 *      veldmoment met de veranderlijke last op één veld), steunmoment qL²/8,
 *      dwarskracht en de kleinste reactie uit de evenwichtscombinatie.
 *   3b. Drie steunpunten met overstek en twee veranderlijke lasten: de
 *      drie-momentenvergelijking, alle schaakbordpatronen uitgeschreven,
 *      trek in het tussensteunpunt uit de evenwichtscombinatie en de
 *      doorbuiging per veld met de eenheidslastmethode.
 *   4. Stalen uitkraging met een puntlast op het eind: inklemmingsmoment, kip
 *      als 2·L en doorbuiging met l_rep = 2·L.
 *   5. Houten balk met een grote permanente last en sneeuw: de combinatie
 *      met alleen de permanente last en k_mod blijvend is maatgevend.
 *   5b. Gelamineerde balk met een vloerlast en een opslaglast (puntlast):
 *      w_bij en w_max volgens A1.4.3 met k_def en per punt de overheersende
 *      last, buiging per belastingsduur, afschuiving en oplegdruk. De
 *      doorbuiging van hout telt de afschuifvervorming mee (M/κGA).
 *   5c. Kip van een houten overstek over een gaffel (l_ef = 2·l + 2h) en van
 *      een ingeklemde uitkraging (0,8·l + 2h, tabel 6.1).
 *   5d. ψ_0 van categorie C: 0,6 voor vluchtroutes en trappen (standaard),
 *      0,4 voor de overige delen.
 *   6. Overstek met een puntlast op het eind: trek in het eindsteunpunt uit de
 *      evenwichtscombinatie (G per deel 0,9 en 1,1).
 *   6b. Korte stalen ligger met een zware puntlast: buiging met dwarskracht,
 *      M_y,V,Rd volgens (6.30).
 *   7. Beweeglijk en leeg: slotregel met ∞ en "voldoet niet", of geen oordeel;
 *      een last buiten de ligger geeft een melding.
 *   8. De beginwaarden van het beeld (LiggerDesigner.tsx) zijn voorbeeld 1.
 *
 * Draaien:  node scripts/check-ligger.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse, evaluate, render } from "../packages/core/dist/index.js";
import { laadTemplate } from "./lib/refcheck.mjs";

const hier = dirname(fileURLToPath(import.meta.url));
const tpl = laadTemplate("ligger.ts");
/** Projectgegevens zoals de app ze vóór de eerste regel in de scope zet (CC2). */
const SCOPE = { CC: 2, RC: 2, K_FI: 1, DesignLife: 50, rekenwijze: 1 };

let fouten = 0;
let getest = 0;

/** Doorrekenen: de zichtbare uitkomsten (4 significante cijfers) en de platte tekst. */
function doorreken(waarden) {
  const nodes = evaluate(parse(tpl), waarden, SCOPE);
  const uit = {};
  const loop = (lijst) => {
    for (const n of lijst) {
      if (n.type === "assignment" || n.type === "var-display") {
        const w = parseFloat(String(n.result).replace(",", "."));
        if (Number.isFinite(w) || String(n.result).startsWith("∞")) uit[n.name] = String(n.result).startsWith("∞") ? Infinity : w;
      }
      if (Array.isArray(n.children)) loop(n.children);
    }
  };
  loop(nodes);
  const html = render(nodes);
  const tekst = html.replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return { uit, tekst };
}

/** Vergelijkt met de handberekening; het blad drukt 4 significante cijfers af. */
function toets(r, verwacht, tol = 1.5e-3) {
  for (const [naam, doel] of Object.entries(verwacht)) {
    getest++;
    const ons = r.uit[naam];
    const ok = ons !== undefined && (Math.abs(ons - doel) <= tol * Math.max(Math.abs(doel), 1e-9) || Math.abs(ons - doel) < 1e-9);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} ${naam.padEnd(12)} blad ${String(ons).padStart(10)}   hand ${Number(doel.toPrecision(6))}`);
  }
}
function waar(wat, ok, detail = "") {
  getest++;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} ${wat}${ok || !detail ? "" : ` — ${detail}`}`);
}
function geenFouten(r, wat) {
  const signaal = ["Error", "Undefined symbol", "NaN", "niet gedefinieerd", "Unexpected type"].find((s) => r.tekst.includes(s));
  waar(`${wat}: geen foutmelding of NaN`, !signaal, signaal ? r.tekst.slice(Math.max(0, r.tekst.indexOf(signaal) - 80), r.tekst.indexOf(signaal) + 80) : "");
}

const E_hout = 11000; // N/mm², C24
const bl = (b, h) => ({ A: b * h, W: (b * h * h) / 6, I: (b * h ** 3) / 12 });

// ── 1. Houten vloerbalk op twee steunpunten ─────────────────────────────────
console.log("\n1. Houten vloerbalk, C24 71×221, L = 4,0 m, G = 0,9 + eigen gewicht, Q = 1,05 kN/m (cat. A)");
const VOORBEELD_1 = {
  materiaal: "1", houtklasse: "2", klimaat: "1", b: "71", h: "221", a_opl: "90",
  systeem: "2", L_1: "4", a_l: "0", a_r: "0", inklemming: "0", scharnieren: "0", kipsteun: "1", eg: "1",
  soort_1: "1", vorm_1: "1", q_1: "0.9", soort_2: "2", vorm_2: "1", cat_2: "1", q_2: "1.05",
  soort_3: "0", soort_4: "0", soort_5: "0", soort_6: "0", toepassing: "2", uiterlijk: "1",
};
{
  const r = doorreken(VOORBEELD_1);
  geenFouten(r, "voorbeeld 1");
  const L = 4, s = bl(71, 221);
  // Eigen gewicht A·ρ_mean·g = 15691 mm² · 420 kg/m³ · 9,81 = 0,06465 kN/m.
  const g = 0.9 + (s.A * 1e-6 * 420 * 9.81) / 1000;
  const q = 1.05;
  // Niveau 3 (middellang, k_mod = 0,8): 6.10b 1,2·G + 1,5·Q = 2,733 kN/m
  // → M = 5,465 kNm, σ = 9,456 N/mm², f_m,d = 0,8·24/1,3 = 14,77 → UC 0,640.
  // Niveau 1 (alleen G, k_mod = 0,6): 1,35·G = 1,302 → UC 0,407, niet maatgevend.
  const pd = 1.2 * g + 1.5 * q;
  const M = (pd * L * L) / 8;
  const fmd = (0.8 * 24) / 1.3;
  const V = (pd * L) / 2;
  const fvd = (0.8 * 4.0) / 1.3;
  // Oplegdruk: l_ef = 90 + 30 mm (eindoplegging), k_c,90 = 1,5 (massief, l ≥ 2h).
  const sc90 = (V * 1000) / (71 * 120);
  const fc90d = (0.8 * 2.5) / 1.3;
  // Doorbuiging: EI = 11000 · 63,86·10⁶ = 702,5 kNm²; met de afschuifvervorming (2.2.3(1)P):
  // κ·G·A = 5/6 · 690 · 15691 = 9022 kN, w = 5qL⁴/(384EI) + qL²/(8κGA):
  // w_G = 4,577 + 0,214 = 4,791 mm, w_Q = 4,982 + 0,233 = 5,215 mm (afschuiving + 4,7 %).
  const EI = (E_hout * s.I) / 1e9;
  const GA = (5 / 6) * 690e3 * s.A * 1e-6;
  const wG = ((5 * g * L ** 4) / (384 * EI) + (g * L * L) / (8 * GA)) * 1000;
  const wQ = ((5 * q * L ** 4) / (384 * EI) + (q * L * L) / (8 * GA)) * 1000;
  const kdef = 0.6, ψ1 = 0.5, ψ2 = 0.3;
  // w_max = (1 + k_def)·w_G + (1 + ψ2·k_def)·w_Q = 13,82 mm ≤ 0,004·4000 = 16 mm (zonder afschuiving 13,20).
  const wmax = (1 + kdef) * wG + (1 + ψ2 * kdef) * wQ;
  // w_bij (frequent) = k_def·w_G + (ψ1 + ψ2·k_def)·w_Q = 6,134 mm ≤ 0,003·4000 = 12 mm.
  const wbij = kdef * wG + (ψ1 + ψ2 * kdef) * wQ;
  toets(r, {
    g_eg: g - 0.9,
    EI,
    M_y_Ed: M,
    k_mod_b: 0.8,
    f_m_d: fmd,
    σ_m_y_d: (M * 1e6) / s.W,
    UC_buiging: (M * 1e6) / s.W / fmd,
    V_z_Ed: V,
    τ_d: (1.5 * V * 1000) / s.A,
    UC_afsch: (1.5 * V * 1000) / s.A / fvd,
    k_c_90: 1.5,
    R_Ed: V,
    l_ef: 120,
    UC_c90: sc90 / (1.5 * fc90d),
    UC_kip: 0,
    w_max_lijn: wmax,
    UC_wmax: wmax / 16,
    UC_wbij: wbij / 12,
    UC_max: wmax / 16,
  });
}

// ── 2. Stalen IPE 300, kip met M_cr ─────────────────────────────────────────
console.log("\n2. IPE 300 S235 op twee steunpunten, L = 6 m, G = 4 + eigen gewicht, Q = 5 kN/m (cat. B), kip, last op de bovenflens");
{
  const r = doorreken({
    materiaal: "2", profiel: "24", staalsoort: "235", systeem: "2", L_1: "6", a_l: "0", a_r: "0",
    kipsteun: "2", aangrijping: "1", eg: "1",
    soort_1: "1", vorm_1: "1", q_1: "4", soort_2: "2", vorm_2: "1", cat_2: "2", q_2: "5",
    soort_3: "0", soort_4: "0", soort_5: "0", soort_6: "0", toepassing: "2", uiterlijk: "1",
  });
  geenFouten(r, "voorbeeld 2");
  const L = 6;
  // IPE 300: A = 53,81 cm², I_y = 8356 cm⁴, W_pl = 628,4 cm³, A_v,z = 25,68 cm²,
  // I_z = 603,8 cm⁴, I_t = 20,12 cm⁴, I_w = 125,9·10³ cm⁶.
  const g = 4 + 53.81e-4 * 78.5; // 4,422 kN/m
  const q = 5;
  const pd = 1.2 * g + 1.5 * q; // 12,81 kN/m (6.10b; 6.10a geeft 9,72)
  const M = (pd * L * L) / 8; // 57,63 kNm
  const Mc = 628.4e-6 * 235e3; // 147,7 kNm (klasse 1)
  const V = (pd * L) / 2; // 38,42 kN
  const Vpl = (2568 * 235) / Math.sqrt(3) / 1000; // 348,4 kN
  // Kip: C1 uit de kwartpunten van een paraboolvormige momentenlijn,
  // √(35/(1 + 9·0,75² + 16 + 9·0,75²)) = 1,1359; C2 = −0,45 (bovenflens).
  const C1 = Math.sqrt(35 / (1 + 9 * 0.5625 + 16 + 9 * 0.5625));
  const C2 = -0.45;
  const E = 210e6, G = 81e6; // kN/m²
  const Iz = 603.8e-8, It = 20.12e-8, Iw = 125.9e3 * 1e-12;
  const S = Math.sqrt((E * Iw) / (G * It)); // 1,274 m
  const Mcr = ((C1 * Math.PI) / L) * (Math.sqrt(1 + (Math.PI ** 2 * S * S * (C2 * C2 + 1)) / (L * L)) + (Math.PI * C2 * S) / L) * Math.sqrt(E * Iz * G * It); // 80,3 kNm
  const λ = Math.sqrt(Mc / Mcr);
  const Φ = 0.5 * (1 + 0.34 * (λ - 0.4) + 0.75 * λ * λ); // kromme b (h/b = 2)
  const χ = Math.min(1, 1 / (λ * λ), 1 / (Φ + Math.sqrt(Φ * Φ - 0.75 * λ * λ))); // 0,494
  // Doorbuiging, staal zonder kruip: w_max = w_G + w_Q, w_bij = ψ1·w_Q (frequent).
  const EI = 210000 * 8356e4 / 1e9; // 17548 kNm²
  const wG = ((5 * g * L ** 4) / (384 * EI)) * 1000; // 4,253 mm
  const wQ = ((5 * q * L ** 4) / (384 * EI)) * 1000; // 4,808 mm
  toets(r, {
    klasse: 1,
    M_y_Ed: M,
    M_c_Rd: Mc,
    UC_buiging: M / Mc,
    V_z_Ed: V,
    V_pl_Rd: Vpl,
    UC_dwars: V / Vpl,
    UC_kip: M / (χ * Mc),
    UC_wmax: (wG + wQ) / 24,
    UC_wbij: (0.5 * wQ) / 18,
  });
  console.log(`         (M_cr = ${Mcr.toFixed(2)} kNm, λ_LT = ${λ.toFixed(4)}, χ_LT = ${χ.toFixed(4)})`);
}

// ── 3. Twee gelijke velden, schaakbord ──────────────────────────────────────
console.log("\n3. IPE 240 op drie steunpunten, 2 × 5 m, G = 3, Q = 4 kN/m (cat. A), zonder eigen gewicht");
{
  const r = doorreken({
    materiaal: "2", profiel: "22", staalsoort: "235", systeem: "3", L_1: "5", L_2: "5", a_l: "0", a_r: "0",
    kipsteun: "1", eg: "0",
    soort_1: "1", vorm_1: "1", q_1: "3", soort_2: "2", vorm_2: "1", cat_2: "1", q_2: "4",
    soort_3: "0", soort_4: "0", soort_5: "0", soort_6: "0", toepassing: "2", uiterlijk: "1",
  });
  geenFouten(r, "voorbeeld 3");
  const L = 5, g = 3, q = 4;
  // Steunmoment: beide velden vol, 6.10b: −(1,2·3 + 1,5·4)·L²/8 = −30,0 kNm.
  const Ms = -((1.2 * g + 1.5 * q) * L * L) / 8;
  // Veldmoment: G op beide velden (ongunstig, 1,2), Q alleen op veld 1:
  // R_A = 1,2g·3L/8 + 1,5q·7L/16 = 19,875 kN → M = R_A²/(2·(1,2g + 1,5q)) = 20,57 kNm.
  const RA = 1.2 * g * (3 * L) / 8 + 1.5 * q * (7 * L) / 16;
  const Mv = (RA * RA) / (2 * (1.2 * g + 1.5 * q));
  // Dwarskracht bij het tussensteunpunt: 5/8·(1,2g + 1,5q)·L = 30,0 kN.
  const V = (5 / 8) * (1.2 * g + 1.5 * q) * L;
  // Kleinste reactie in A. UGT: 0,9·G (gunstig) met Q op veld 2 (−qL/16):
  // 0,9·3·15/8 − 1,5·4·5/16 = 3,1875. Evenwicht (tabel NB.3): G per deel,
  // 0,9 op veld 1 (7gL/16) en 1,1 op veld 2 (−gL/16), 1,5·Q op veld 2:
  // 0,9·3·35/16 − 1,1·3·5/16 − 1,5·4·5/16 = 3,000 kN → maatgevend.
  const RminEqu = (0.9 * g * 7 * L) / 16 - (1.1 * g * L) / 16 - (1.5 * q * L) / 16;
  toets(r, {
    M_Ed_max: Mv,
    M_Ed_min: Ms,
    V_Ed_max: V,
    R_Ed_min: RminEqu,
    M_y_Ed: -Ms,
  });
}

// ── 4. Stalen uitkraging ────────────────────────────────────────────────────
console.log("\n4. IPE 300 als uitkraging, L = 2 m, G = 2 kN/m, F_Q = 10 kN op het eind (cat. A), zonder eigen gewicht");
{
  const r = doorreken({
    materiaal: "2", profiel: "24", staalsoort: "235", systeem: "1", L_1: "2", kipsteun: "2", aangrijping: "1", eg: "0",
    soort_1: "1", vorm_1: "1", q_1: "2", soort_2: "2", vorm_2: "4", cat_2: "1", F_2: "10", a_2: "2",
    soort_3: "0", soort_4: "0", soort_5: "0", soort_6: "0", toepassing: "2", uiterlijk: "1",
  });
  geenFouten(r, "voorbeeld 4");
  const L = 2, g = 2, F = 10;
  // Inklemmingsmoment 6.10b: −(1,2·g·L²/2 + 1,5·F·L) = −34,8 kNm; 6.10a: −17,4.
  const M = (1.2 * g * L * L) / 2 + 1.5 * F * L;
  const V = 1.2 * g * L + 1.5 * F;
  const Mc = 628.4e-6 * 235e3;
  // Kip: een overstek als L_kip = 2·L = 4 m met C1 = 1 en C2 = −0,45.
  const Lk = 2 * L, C1 = 1, C2 = -0.45;
  const E = 210e6, G = 81e6, Iz = 603.8e-8, It = 20.12e-8, Iw = 125.9e3 * 1e-12;
  const S = Math.sqrt((E * Iw) / (G * It));
  const Mcr = ((C1 * Math.PI) / Lk) * (Math.sqrt(1 + (Math.PI ** 2 * S * S * (C2 * C2 + 1)) / (Lk * Lk)) + (Math.PI * C2 * S) / Lk) * Math.sqrt(E * Iz * G * It);
  const λ = Math.sqrt(Mc / Mcr);
  const Φ = 0.5 * (1 + 0.34 * (λ - 0.4) + 0.75 * λ * λ);
  const χ = Math.min(1, 1 / (λ * λ), 1 / (Φ + Math.sqrt(Φ * Φ - 0.75 * λ * λ)));
  // Doorbuiging van het eind: qL⁴/8EI + FL³/3EI, l_rep = 2·L = 4 m.
  const EI = 210000 * 8356e4 / 1e9;
  const wG = ((g * L ** 4) / (8 * EI)) * 1000;
  const wQ = ((F * L ** 3) / (3 * EI)) * 1000;
  toets(r, {
    M_Ed_min: -M,
    M_y_Ed: M,
    V_z_Ed: V,
    UC_buiging: M / Mc,
    UC_kip: M / (χ * Mc),
    UC_wmax: (wG + wQ) / 16,
    UC_wbij: (0.5 * wQ) / 12,
  });
}

// ── 5. k_mod: de permanente last alleen is maatgevend ───────────────────────
console.log("\n5. Houten balk C24 71×221, L = 4 m, G = 3 kN/m en sneeuw 0,5 kN/m, zonder eigen gewicht");
{
  const r = doorreken({
    ...VOORBEELD_1, eg: "0", q_1: "3", cat_2: "9", q_2: "0.5",
  });
  geenFouten(r, "voorbeeld 5");
  const L = 4, s = bl(71, 221);
  // Blijvend (k_mod = 0,6): 1,35·3 = 4,05 kN/m → M = 8,1 kNm, σ = 14,01 N/mm²,
  // f_m,d = 0,6·24/1,3 = 11,08 → UC = 1,265.
  // Kort (k_mod = 0,9): 1,2·3 + 1,5·0,5 = 4,35 → M = 8,7, f_m,d = 16,62 → UC = 0,906.
  const Mb = (1.35 * 3 * L * L) / 8;
  const Mk = ((1.2 * 3 + 1.5 * 0.5) * L * L) / 8;
  const ucB = (Mb * 1e6) / s.W / ((0.6 * 24) / 1.3);
  const ucK = (Mk * 1e6) / s.W / ((0.9 * 24) / 1.3);
  toets(r, { M_y_Ed: Mb, k_mod_b: 0.6, UC_buiging: Math.max(ucB, ucK) });
  waar("voorbeeld 5: de combinatie met alleen de permanente last is maatgevend", ucB > ucK);
  waar("voorbeeld 5: slotregel voldoet niet", /Maatgevende UC = [\d.]+ > 1\.0 → Ligger voldoet niet/.test(r.tekst));
}

// ── 6. Overstek: trek in het eindsteunpunt ──────────────────────────────────
console.log("\n6. IPE 300, veld 6 m met overstek 2,5 m, G = 2 kN/m, F_Q = 20 kN op het eind, zonder eigen gewicht");
{
  const r = doorreken({
    materiaal: "2", profiel: "24", staalsoort: "235", systeem: "2", L_1: "6", a_l: "0", a_r: "2.5", kipsteun: "1", eg: "0",
    soort_1: "1", vorm_1: "1", q_1: "2", soort_2: "2", vorm_2: "4", cat_2: "1", F_2: "20", a_2: "8.5",
    soort_3: "0", soort_4: "0", soort_5: "0", soort_6: "0", toepassing: "2", uiterlijk: "1",
  });
  geenFouten(r, "voorbeeld 6");
  const L = 6, a = 2.5, g = 2, F = 20;
  // UGT: G als één bron gunstig (0,9): 0,9·g·(L² − a²)/(2L) = 4,4625; F op het
  // eind: −1,5·F·a/L = −12,5 → −8,04 kN.
  const ugt = (0.9 * g * (L * L - a * a)) / (2 * L) - (1.5 * F * a) / L;
  // Evenwicht: G op het veld gunstig 0,9·gL/2 = 5,4, G op het overstek ongunstig
  // −1,1·g·a²/(2L) = −1,146, F: −12,5 → −8,246 kN (maatgevend).
  const equ = (0.9 * g * L) / 2 - (1.1 * g * a * a) / (2 * L) - (1.5 * F * a) / L;
  // Steunmoment boven B: −(1,2·g·a²/2 + 1,5·F·a) = −82,5 kNm.
  toets(r, { R_Ed_min: Math.min(ugt, equ), M_Ed_min: -((1.2 * g * a * a) / 2 + 1.5 * F * a) });
  waar("voorbeeld 6: evenwicht maatgevend boven de UGT", equ < ugt);
  waar("voorbeeld 6: melding trek met verankering", /Trek in een oplegging/.test(r.tekst));
}

// ── 6b. Buiging met dwarskracht ─────────────────────────────────────────────
console.log("\n6b. IPE 200 S235, L = 1 m, F_Q = 120 kN op 0,25 m (cat. A), zonder eigen gewicht: M–V-interactie");
{
  const r = doorreken({
    materiaal: "2", profiel: "21", staalsoort: "235", systeem: "2", L_1: "1", a_l: "0", a_r: "0", kipsteun: "1", eg: "0",
    soort_1: "0", soort_2: "2", vorm_2: "4", cat_2: "1", F_2: "120", a_2: "0.25",
    soort_3: "0", soort_4: "0", soort_5: "0", soort_6: "0", toepassing: "2", uiterlijk: "1",
  });
  geenFouten(r, "voorbeeld 6b");
  // V links van de last: 1,5·120·0,75 = 135 kN > 0,5·V_pl,Rd; V_pl,Rd = 1400·235/√3 = 189,9 kN.
  const V = 1.5 * 120 * 0.75;
  const Vpl = (1400 * 235) / Math.sqrt(3) / 1000;
  // Onder de last: M = 1,5·120·0,25·0,75 = 33,75 kNm met ρ = (2·135/189,9 − 1)² = 0,178;
  // A_w = (200 − 2·8,5)·5,6 = 1024,8 mm², M_y,V,Rd = (220,6·10³ − ρ·A_w²/(4·5,6))·235 = 49,9 kNm.
  const M = 1.5 * 120 * 0.25 * 0.75;
  const ρ = (2 * V / Vpl - 1) ** 2;
  const Aw = (200 - 2 * 8.5) * 5.6;
  const MV = ((220.6e3 - (ρ * Aw * Aw) / (4 * 5.6)) * 235) / 1e6;
  toets(r, { V_z_Ed: V, V_pl_Rd: Vpl, UC_dwars: V / Vpl, M_y_Ed: M, UC_MV: M / MV });
}

// ── 2b. Kip tussen kipsteunen: C_1 uit tabel NB.NB.1 bij een rechte lijn ────
console.log("\n2b. IPE 300 S235, L = 7 m, F_Q = 30 kN in het midden (cat. B) op de bovenflens, zonder eigen gewicht: kip");
{
  const basis = {
    materiaal: "2", profiel: "24", staalsoort: "235", systeem: "2", L_1: "7", a_l: "0", a_r: "0", inklemming: "0", scharnieren: "0",
    kipsteun: "2", aangrijping: "1", eg: "0", soort_1: "2", vorm_1: "4", cat_1: "2", F_1: "30", a_1: "3.5",
    soort_2: "0", soort_3: "0", soort_4: "0", soort_5: "0", soort_6: "0", toepassing: "2", uiterlijk: "1",
  };
  const E = 210e6, G = 81e6, Iz = 603.8e-8, It = 20.12e-8, Iw = 125.9e3 * 1e-12, Mc = 628.4e-6 * 235e3;
  const S = Math.sqrt((E * Iw) / (G * It)); // 1,2737 m
  const Mcr = (L, C1, C2) => ((C1 * Math.PI) / L) * (Math.sqrt(1 + (Math.PI ** 2 * S * S * (C2 * C2 + 1)) / (L * L)) + (Math.PI * C2 * S) / L) * Math.sqrt(E * Iz * G * It);
  const χ = (λ) => { const Φ = 0.5 * (1 + 0.34 * (λ - 0.4) + 0.75 * λ * λ); return Math.min(1, 1 / (λ * λ), 1 / (Φ + Math.sqrt(Φ * Φ - 0.75 * λ * λ))); };
  const M = (1.5 * 30 * 7) / 4; // 78,75 kNm
  // Alleen gaffels: puntlast in het midden, C_1 uit de kwartpunten √(35/(1 + 9·0,5² + 16 + 9·0,5²)) = 1,2759 met
  // C_2 = −0,45: M_cr = 75,98 kNm, λ_LT = 1,394, χ_LT = 0,4756 → UC = 1,121. Tabel NB.NB.1 geval 3 (C_1 = 1,35,
  // C_2 = −0,55) geeft M_cr = 76,61 en UC = 1,115: het blad zit hier aan de veilige kant.
  const Mcr1 = Mcr(7, Math.sqrt(35 / 21.5), -0.45);
  toets(doorreken(basis), { UC_kip: M / (χ(Math.sqrt(Mc / Mcr1)) * Mc) });
  // Kipsteunen op 3,5 m: twee segmenten met een rechte momentenlijn van 0 tot M, β = 0.
  // L_kip = (1,4 − 0,8·0)·3,5 = 4,9 m; C_1 = 1,75 (tabel NB.NB.1 geval 1; de kwartpuntformule gaf 1,815,
  // te hoog); C_2 = −0,45 volgens het aangrijpingspunt (veilige kant, er zit geen last in het segment).
  // M_cr = 157,24 kNm, λ_LT = 0,9691, χ_LT = 0,7185 → UC = 0,7422 (met de kwartpuntformule was het 0,7314).
  const Mcr2 = Mcr(4.9, 1.75, -0.45);
  toets(doorreken({ ...basis, kipsteun: "3", a_kip: "3.5" }), { UC_kip: M / (χ(Math.sqrt(Mc / Mcr2)) * Mc) });
  console.log(`         (M_cr gaffels = ${Mcr1.toFixed(2)} kNm, M_cr segment = ${Mcr2.toFixed(2)} kNm)`);
}

// ── 3b. Drie steunpunten, overstek, twee veranderlijke lasten ───────────────
console.log("\n3b. IPE 300 S235, velden 5 + 4 m en overstek 1,5 m, G = 3 kN/m, F_Q = 20 kN op het eind (cat. B), Q = 4 kN/m (cat. A)");
{
  const r = doorreken({
    materiaal: "2", profiel: "24", staalsoort: "235", systeem: "3", L_1: "5", L_2: "4", a_l: "0", a_r: "1.5", inklemming: "0", scharnieren: "0",
    kipsteun: "1", eg: "0", soort_1: "1", vorm_1: "1", q_1: "3", soort_2: "2", vorm_2: "4", cat_2: "2", F_2: "20", a_2: "10.5",
    soort_3: "2", vorm_3: "1", cat_3: "1", q_3: "4", soort_4: "0", soort_5: "0", soort_6: "0", toepassing: "2", uiterlijk: "1",
  });
  geenFouten(r, "voorbeeld 3b");
  // Handberekening met de drie-momentenvergelijking. Steunpunten A (0), B (5), C (9), eind D (10,5), a = 1,5 m.
  // Per lastgeval: q1, q2, q3 op veld 1, veld 2 en het overstek en P op D:
  //   M_C = −q3·a²/2 − P·a,  2·M_B·(L1 + L2) = −(q1·L1³ + q2·L2³)/4 − M_C·L2.
  // Permanent: M_C = −3,375, M_B = (−141,75 + 13,5)/18 = −7,125 kNm.
  const L1 = 5, L2 = 4, a = 1.5, xB = 5, xC = 9, xD = 10.5;
  const geval = (q1, q2, q3, P) => {
    const MC = -q3 * a * a / 2 - P * a;
    const MB = (-(q1 * L1 ** 3 + q2 * L2 ** 3) / 4 - MC * L2) / (2 * (L1 + L2));
    const VA = q1 * L1 / 2 + MB / L1, VBp = q2 * L2 / 2 + (MC - MB) / L2;
    const M = (x) => (x <= xB ? VA * x - q1 * x * x / 2 : x <= xC ? MB + VBp * (x - xB) - q2 * (x - xB) ** 2 / 2 : -q3 * (xD - x) ** 2 / 2 - P * (xD - x));
    return { M, MC, RB: VBp - (VA - q1 * L1), RC: q3 * a + P - (VBp - q2 * L2), VCp: q3 * a + P, VCm: VBp - q2 * L2 };
  };
  // Doorbuiging met de eenheidslastmethode op de grondligger A–C met overstek (B weggenomen): w(x0) = ∫M·m/EI.
  const EI = 210e6 * 8356e-8;
  const m1 = (x0, x) => (x0 <= xC ? (x <= x0 ? ((xC - x0) / xC) * x : x <= xC ? ((xC - x0) / xC) * x - (x - x0) : 0) : x <= xC ? (-(x0 - xC) / xC) * x : x < x0 ? -(x0 - x) : 0);
  const w = (g, x0) => {
    const knik = [0, xB, xC, xD, x0].sort((p, q) => p - q);
    let s = 0;
    for (let i = 0; i + 1 < knik.length; i++) {
      const p = knik[i], q = knik[i + 1], n = 200, h = (q - p) / n;
      if (!(q - p > 1e-12)) continue;
      for (let j = 0; j <= n; j++) { const x = p + j * h; s += (j === 0 || j === n ? 1 : j % 2 ? 4 : 2) * g.M(x) * m1(x0, x) * h / 3; }
    }
    return s / EI;
  };
  const cG = geval(3, 3, 3, 0), cF = geval(0, 0, 0, 20), cQ = [geval(4, 0, 0, 0), geval(0, 4, 0, 0), geval(0, 0, 4, 0)];
  // Alle patronen: Q op elke deelverzameling van de delen, F aan of uit, elk van beide overheersend (ψ_0: F 0,5, Q 0,4).
  const patronen = [];
  for (let d = 0; d < 8; d++) for (const f of [0, 1]) for (const lead of ["F", "Q"]) patronen.push({ d, f, lead });
  const uiterst = (grootheid, fG, fF, fQ) => {
    let max = -Infinity, min = Infinity;
    for (const gG of fG) for (const { d, f, lead } of patronen) {
      const kF = f * (lead === "F" ? fF[0] : fF[1]), kQ = lead === "Q" ? fQ[0] : fQ[1];
      let v = gG * grootheid(cG) + kF * grootheid(cF);
      cQ.forEach((c, i) => { if (d & (1 << i)) v += kQ * grootheid(c); });
      max = Math.max(max, v); min = Math.min(min, v);
    }
    return [max, min];
  };
  const ugt = (gr) => {
    const A = uiterst(gr, [1.35, 0.9], [1.5 * 0.5, 1.5 * 0.5], [1.5 * 0.4, 1.5 * 0.4]); // 6.10a
    const B = uiterst(gr, [1.2, 0.9], [1.5, 1.5 * 0.5], [1.5, 1.5 * 0.4]); // 6.10b
    return [Math.max(A[0], B[0]), Math.min(A[1], B[1])];
  };
  let Mmax = 0;
  for (let i = 0; i <= 2100; i++) Mmax = Math.max(Mmax, ugt((c) => c.M((i * xD) / 2100))[0]);
  // Steunmoment in C: 6.10b met F overheersend −(1,2·3,375 + 1,5·30 + 1,5·0,4·4,5) = −51,75 kNm.
  const Mmin = -(1.2 * 3.375 + 1.5 * 30 + 1.5 * 0.4 * 4.5);
  // Dwarskracht rechts van C: 1,2·3·1,5 + 1,5·20 + 1,5·0,4·4·1,5 = 39,0 kN.
  const V = 1.2 * 3 * 1.5 + 1.5 * 20 + 1.5 * 0.4 * 4 * 1.5;
  // Kleinste reactie in B, evenwicht (tabel NB.3): G per deel 0,9 of 1,1, F (R_B = −10,5 kN per 20 kN) overheersend
  // met 1,5, Q met 1,5·0,4 op het overstek: 0,9·(10,375 + 6,4) − 1,1·1,05 − 1,5·10,5 − 0,6·1,575 = −2,655 kN.
  const Gd = [geval(3, 0, 0, 0), geval(0, 3, 0, 0), geval(0, 0, 3, 0)];
  let RBequ = Infinity;
  for (let s = 0; s < 8; s++) for (const { d, f, lead } of patronen) {
    let v = Gd.reduce((t, c, i) => t + (s & (1 << i) ? 1.1 : 0.9) * c.RB, 0);
    v += f * (lead === "F" ? 1.5 : 0.75) * cF.RB;
    cQ.forEach((c, i) => { if (d & (1 << i)) v += (lead === "Q" ? 1.5 : 0.6) * c.RB; });
    RBequ = Math.min(RBequ, v);
  }
  // Doorbuiging per veld (staal, k_def = 0): w_max karakteristiek, w_bij frequent (ψ_1: F 0,5, Q 0,5; ψ_2 0,3).
  const velden = [[0, 5, 5], [5, 9, 4], [9, 10.5, 3]];
  let uWmax = 0, uWbij = 0;
  for (const [p, q, lrep] of velden) {
    let wm = 0, wb = 0;
    for (let i = 0; i <= 60; i++) {
      const x = p + ((q - p) * i) / 60;
      const wx = new Map([cG, cF, ...cQ].map((c) => [c, w(c, x)]));
      const gr = (c) => wx.get(c);
      const [k1, k2] = uiterst(gr, [1], [1, 0.5], [1, 0.4]);
      const [b1, b2] = uiterst(gr, [0], [0.5, 0.3], [0.5, 0.3]);
      wm = Math.max(wm, k1, -k2); wb = Math.max(wb, b1, -b2);
    }
    uWmax = Math.max(uWmax, (wm * 1000) / (4 * lrep)); uWbij = Math.max(uWbij, (wb * 1000) / (3 * lrep));
  }
  toets(r, { M_Ed_max: Mmax, M_Ed_min: Mmin, V_Ed_max: V, R_Ed_min: RBequ, UC_buiging: -Mmin / (628.4e-6 * 235e3), UC_wmax: uWmax, UC_wbij: uWbij });
  waar("voorbeeld 3b: trek in steunpunt B gemeld", /Trek in een oplegging/.test(r.tekst));
}

// ── 5b. Gelamineerd hout, twee veranderlijke lasten van verschillende duur ──
console.log("\n5b. GL24h 90×315, L = 6 m, klimaatklasse 2, G = 1,2 kN/m + eigen gewicht, Q = 2,0 kN/m (cat. A), F = 4 kN op 2 m (cat. E)");
{
  const r = doorreken({
    materiaal: "1", houtklasse: "4", klimaat: "2", b: "90", h: "315", a_opl: "100",
    systeem: "2", L_1: "6", a_l: "0", a_r: "0", inklemming: "0", scharnieren: "0", kipsteun: "1", eg: "1",
    soort_1: "1", vorm_1: "1", q_1: "1.2", soort_2: "2", vorm_2: "1", cat_2: "1", q_2: "2.0",
    soort_3: "2", vorm_3: "4", cat_3: "5", F_3: "4", a_3: "2.0", soort_4: "0", soort_5: "0", soort_6: "0", toepassing: "2", uiterlijk: "1",
  });
  geenFouten(r, "voorbeeld 5b");
  const L = 6, b = 0.09, h = 0.315, A = b * h, W = (b * h * h) / 6, EI = 11500e3 * (b * h ** 3) / 12; // EI = 2695,8 kNm²
  const g = 1.2 + (A * 420 * 9.81) / 1000, q = 2.0, P = 4, aP = 2, bP = L - aP; // g = 1,3168 kN/m
  // Doorbuiging vrij opgelegd: gelijkmatig qx(L³ − 2Lx² + x³)/24EI, puntlast Pbx(L² − b² − x²)/6LEI (x ≤ a) en
  // Pa(L − x)(2Lx − x² − a²)/6LEI (x ≥ a); plus de afschuifvervorming ∫V/κGA = M(x)/κGA (vrij opgelegd: M(0) = 0),
  // κ·G·A = 5/6 · 650 · 28350 = 15356 kN (GL24h: G_mean = 650 N/mm²).
  const GA = (5 / 6) * 650e3 * A;
  const wq = (qq, x) => (qq * x * (L ** 3 - 2 * L * x * x + x ** 3)) / (24 * EI) + (qq * x * (L - x)) / 2 / GA;
  const wP = (x) => (x <= aP ? (P * bP * x * (L * L - bP * bP - x * x)) / (6 * L * EI) + (P * bP * x) / L / GA : (P * aP * (L - x) * (2 * L * x - x * x - aP * aP)) / (6 * L * EI) + (P * aP * (L - x)) / L / GA);
  // k_def = 0,8. Cat. A: ψ = 0,4 / 0,5 / 0,3; cat. E: ψ = 1,0 / 0,9 / 0,8.
  // w_bij = 0,8·w_G + max((0,5 + 0,8·0,3)·w_Q + (0,8 + 0,8·0,8)·w_F; (0,9 + 0,8·0,8)·w_F + (0,3 + 0,8·0,3)·w_Q)
  // w_max = 1,8·w_G + max((1 + 0,24)·w_Q + (1,0 + 0,64)·w_F; (1 + 0,64)·w_F + (0,4 + 0,24)·w_Q); grootste over x.
  let wb = 0, wm = 0;
  for (let i = 0; i <= 6000; i++) {
    const x = (L * i) / 6000, G = wq(g, x), Q = wq(q, x), F = wP(x);
    wb = Math.max(wb, 0.8 * G + Math.max(0.74 * Q + 1.44 * F, 1.54 * F + 0.54 * Q));
    wm = Math.max(wm, 1.8 * G + Math.max(1.24 * Q + 1.64 * F, 1.64 * F + 0.64 * Q));
  }
  // w_bij = 25,21 mm > 0,003·6000 = 18 mm; w_max = 41,57 mm > 0,004·6000 = 24 mm (zonder afschuiving 24,08 en 39,71).
  // UGT, middellang (k_mod 0,8, alle lasten): 6.10b met Q overheersend 1,2·G + 1,5·Q + 1,5·1,0·F:
  // M = 27,05 kNm; f_m,d = 0,8·k_h·24/1,25 met k_h = (600/315)^0,1 = 1,0666 → UC = 1,109.
  // Lang (k_mod 0,7, G en F): 1,2·G + 1,5·F → M = 15,11 kNm, UC 0,708; blijvend 1,35·G → UC 0,437.
  let M = 0;
  for (let i = 0; i <= 6000; i++) {
    const x = (L * i) / 6000, Mg = (g * x * (L - x)) / 2, Mq = (q * x * (L - x)) / 2, MF = x <= aP ? (P * bP * x) / L : (P * aP * (L - x)) / L;
    M = Math.max(M, 1.2 * Mg + 1.5 * Mq + 1.5 * MF, 1.2 * Mg + 1.5 * 0.4 * Mq + 1.5 * MF, 1.35 * Mg + 1.5 * 0.4 * Mq + 1.5 * MF);
  }
  const kh = (600 / 315) ** 0.1;
  // Oplegdruk links: R = 1,2·g·3 + 1,5·q·3 + 1,5·F·4/6 = 17,74 kN op 90 × (100 + 30) mm, k_c,90 = 1,75 (gelijmd, l ≤ 400 mm).
  const R = 1.2 * g * 3 + 1.5 * q * 3 + (1.5 * P * bP) / L;
  toets(r, {
    k_h: kh, M_y_Ed: M, UC_buiging: M / W / ((0.8 * kh * 24e3) / 1.25),
    UC_afsch: (1.5 * R) / A / ((0.8 * 3.5e3) / 1.25), UC_c90: R / (b * 0.13) / ((1.75 * 0.8 * 2.5e3) / 1.25),
    UC_wbij: (wb * 1000) / 18, UC_wmax: (wm * 1000) / 24,
  });
}

// ── 5c. Hout: kip van een overstek ───────────────────────────────────────────
console.log("\n5c. C24 45×270, veld 4 m met overstek 1,5 m, G = 1 kN/m, F_Q = 2 kN op het eind (cat. A), last op de bovenzijde: kip");
{
  const basis = {
    materiaal: "1", houtklasse: "2", klimaat: "1", b: "45", h: "270", a_opl: "90", systeem: "2", L_1: "4", a_l: "0", a_r: "1.5",
    inklemming: "0", scharnieren: "0", kipsteun: "3", a_kip: "0.5", aangrijping: "1", eg: "0",
    soort_1: "1", vorm_1: "1", q_1: "1", soort_2: "2", vorm_2: "4", cat_2: "1", F_2: "2", a_2: "5.5",
    soort_3: "0", soort_4: "0", soort_5: "0", soort_6: "0", toepassing: "2", uiterlijk: "1",
  };
  // Moment boven het steunpunt (middellang, k_mod 0,8): 1,2·1·1,5²/2 + 1,5·2·1,5 = 5,85 kNm; σ = 5,85·10⁶/546750 = 10,70 N/mm²;
  // f_m,d = 0,8·24/1,3 = 14,77 N/mm². λ_rel,m = √(f_m,k·h·l_ef/(0,78·b²·E_0,05)), k_crit volgens (6.34).
  const b = 45, h = 270, W = (b * h * h) / 6, fmd = (0.8 * 24) / 1.3, σ = ((1.2 * 1.5 ** 2) / 2 + 1.5 * 2 * 1.5) * 1e6 / W;
  const kcrit = (lef) => { const λ = Math.sqrt((24 * h * lef) / (0.78 * b * b * 7400)); return λ <= 0.75 ? 1 : λ <= 1.4 ? 1.56 - 0.75 * λ : 1 / λ ** 2; };
  // Overstek over een gaffel: l_ef = 2·1500 + 2·270 = 3540 mm → λ = 1,401, k_crit = 0,510 → UC = 1,422
  // (met 0,8·l, zoals voorheen, 1740 mm: k_crit = 0,823 en UC = 0,880 — onveilig). Het veld heeft kipsteunen op 0,5 m:
  // l_ef = 500 + 540 = 1040 mm, k_crit = 0,990, UC = 0,731: het overstek is maatgevend.
  toets(doorreken(basis), { UC_kip: σ / (kcrit(2 * 1500 + 2 * h) * fmd) });
  // Een ingeklemde uitkraging van 1,5 m met dezelfde lasten: tabel 6.1, l_ef = 0,8·1500 + 540 = 1740 mm → UC = 0,880.
  toets(doorreken({ ...basis, systeem: "1", L_1: "1.5", a_r: "0", a_2: "1.5" }), { UC_kip: σ / (kcrit(0.8 * 1500 + 2 * h) * fmd) });
}

// ── 5d. ψ_0 van categorie C ──────────────────────────────────────────────────
console.log("\n5d. IPE 300, L = 6 m, G = 10 kN/m, Q = 2 kN/m cat. C: ψ_0 = 0,6 (vluchtroute, standaard) of 0,4 (overige delen)");
{
  const st = {
    materiaal: "2", profiel: "24", staalsoort: "235", systeem: "2", L_1: "6", a_l: "0", a_r: "0", inklemming: "0", scharnieren: "0", kipsteun: "1", eg: "0",
    soort_1: "1", vorm_1: "1", q_1: "10", soort_2: "2", vorm_2: "1", cat_2: "3", q_2: "2",
    soort_3: "0", soort_4: "0", soort_5: "0", soort_6: "0", toepassing: "2", uiterlijk: "1",
  };
  // Tabel NB.2: C 0,6/0,4 met voetnoot a (0,6 voor vluchtroutes en trappen). Keuze 3: 6.10a 1,35·10 + 1,5·0,6·2 = 15,3 kN/m
  // > 6.10b 1,2·10 + 1,5·2 = 15,0 → M = 15,3·6²/8 = 68,85 kNm. Keuze 11 (ψ_0 = 0,4): 6.10a 14,7 < 15,0 → M = 67,5 kNm.
  toets(doorreken(st), { M_Ed_max: (15.3 * 36) / 8 });
  toets(doorreken({ ...st, cat_2: "11" }), { M_Ed_max: (15 * 36) / 8 });
}

// ── 7. Beweeglijk en leeg ───────────────────────────────────────────────────
console.log("\n7. Beweeglijk systeem en een leeg blad");
{
  const r = doorreken({ ...VOORBEELD_1, scharnieren: "1", x_h1: "2" });
  geenFouten(r, "beweeglijk");
  waar("beweeglijk: melding in §2", /De ligger is beweeglijk/.test(r.tekst));
  waar("beweeglijk: slotregel ∞ en voldoet niet", /Maatgevende UC = ∞ → Ligger voldoet niet/.test(r.tekst));
  const leeg = doorreken({});
  waar("leeg: vraagt om de overspanning", /Vul de overspanning/.test(leeg.tekst));
  waar("leeg: geen slotregel", !/Maatgevende UC/.test(leeg.tekst));
  // Gerberscharnier in een doorgaande ligger: stabiel, rekent door.
  const gb = doorreken({ ...VOORBEELD_1, systeem: "3", L_2: "4", scharnieren: "1", x_h1: "5" });
  geenFouten(gb, "gerberligger");
  waar("gerberligger: stabiel, met slotregel", /Maatgevende UC = [\d.]+/.test(gb.tekst) && !/beweeglijk/.test(gb.tekst));
  // Een puntlast buiten de ligger telt niet mee; dat mag niet stil gebeuren (L = 4 m, puntlast op 5 m).
  const buiten = doorreken({ ...VOORBEELD_1, vorm_2: "4", F_2: "5", a_2: "5" });
  waar("puntlast buiten de ligger: melding", /Last 2: de puntlast ligt buiten de ligger/.test(buiten.tekst));
  const deels = doorreken({ ...VOORBEELD_1, vorm_2: "2", q_2: "1", a_2: "3", b_2: "6" });
  waar("deellast voorbij het eind: melding", /Last 2: de last loopt buiten de ligger/.test(deels.tekst));
  waar("voorbeeld 1: geen melding over lasten buiten de ligger", !/buiten de ligger/.test(doorreken(VOORBEELD_1).tekst));
}

// ── 8. Het beeld begint bij voorbeeld 1 ─────────────────────────────────────
console.log("\n8. Beginwaarden van het beeld");
{
  const bron = readFileSync(join(hier, "../packages/desktop/src/components/calc/LiggerDesigner.tsx"), "utf8");
  const blok = bron.match(/const DEFAULTS[^=]*=\s*\{([\s\S]*?)\n\};/)[1];
  const defaults = Object.fromEntries([...blok.matchAll(/([\p{L}_][\p{L}\p{N}_]*):\s*(-?[\d.]+)/gu)].map((m) => [m[1], m[2]]));
  const verschil = Object.entries(VOORBEELD_1).filter(([k, v]) => k in defaults && Number(defaults[k]) !== Number(v));
  waar("de beginwaarden van het beeld zijn de invoer van voorbeeld 1", verschil.length === 0, verschil.map(([k, v]) => `${k}: beeld ${defaults[k]}, voorbeeld ${v}`).join(", "));
  const a = doorreken(defaults).uit.UC_max, b = doorreken(VOORBEELD_1).uit.UC_max;
  waar("met de beginwaarden van het beeld dezelfde UC als voorbeeld 1", a === b, `${a} tegen ${b}`);
}

console.log(
  fouten === 0
    ? `\nLigger: alle ${getest} controles kloppen met de handberekening.`
    : `\nLigger: ${fouten} van ${getest} controles wijken af.`,
);
process.exit(fouten === 0 ? 0 : 1);
