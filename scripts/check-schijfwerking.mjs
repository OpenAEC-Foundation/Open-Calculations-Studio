/**
 * Controlescript voor de module Schijfwerking (EN 1995-1-1 §9.2.4.2, methode A).
 *
 * Geen vastgelegd referentieblad; een handberekening met de startwaarden van
 * het beeld: schroeven F_f,Rd = 0,42 kN op 150 mm, dubbelzijdig, plaat 12 mm,
 * stijlen en regels 76×184 C24, klimaatklasse 1, wand 7200 × 2600 mm, platen
 * 1220 mm breed, stijlen 610 h.o.h., F1 = F2 = 5 kN, F_i,v,Ed = 20 kN.
 *
 *   f_c,0,d  = 21 × 0,9/1,3 = 14,54          f_c,90,d = 2,5 × 1,25 × 0,9/1,3 = 2,163
 *   panelen  : 5 × 1220 (c = 1220/1300 = 0,938) + rest 1100 (c = 1100/1300 = 0,846)
 *   Σ b_i·c_i = 5 × 1220 × 0,9385 + 1100 × 0,8462 = 6655 mm
 *   F_i,v,Rd = 0,42 × 6655 × 2/150 = 37,27 kN (rekenwijze 1, zonder de 1,2)
 *   L_ef     = 6655/0,9385 = 7092 mm          F_i,t,Ed = 20 × 2600/7092 = 7,33 kN
 *   F_tot    = 7,33 + 5 = 12,33 kN            druk ⊥ = 12 332/(76 × 184)/2,163 = 0,408
 *   plooi    = 610/12/100 = 0,508            h.o.h. = 150/150 = 1,00
 *   stijl    : L = 2600 − 2 × 76 = 2448, λ_rel,y = 0,782, k_c,y = 0,836 → 0,0726
 *   UC_max   = 20/37,27 = 0,537: de detailleringsregels (plooi, h.o.h.) tellen
 *              als voldoet/voldoet niet en niet mee in de maatgevende UC.
 *
 * Eerder rekende het blad F_i,v,Rd met de hele wandlengte en de c_i van een
 * volle plaat (37,84 kN) en F_i,t,Ed met b (7,22 kN): het restpaneel van 1100
 * telde te zwaar mee, en een restpaneel smaller dan h/4 zelfs helemaal.
 *
 * Draaien:  node scripts/check-schijfwerking.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { laadTemplate, reken, toets, toetsNormStand, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("schijfwerking.ts");
const PROJECT = { CC: 2, K_FI: 1, rekenwijze: 1 };
const NORM = { ...PROJECT, rekenwijze: 0 };

const BASIS = {
  verbindingsmiddel: "1", F_f_Rd: "0.42", s_verb: "150", n_zijdig: "2", t_bepl: "12",
  t_stijl: "76", b_stijl: "184", t_regel: "76", b_regel: "184", detail_AC: "1",
  sterkteklasse: "2", klimaatklasse: "1", b: "7200", h: "2600", bi: "1220", hoh: "610",
  F1: "5", F2: "5", F_ivEd: "20",
};

/** De slotzin van het blad: "Maatgevende UC = … → Schijfwerking voldoet (niet)". */
function slotzin(got) {
  const i = got.text.lastIndexOf("Maatgevende UC");
  return i < 0 ? "" : got.text.slice(i, i + 160);
}

let fouten = 0;
function zin(naam, got, eisen) {
  const s = slotzin(got);
  const ok = eisen.every((re) => re.test(s));
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} slotzin   ${s.slice(0, 110) || "(geen)"}   [${naam}]`);
}

{
  const got = reken(tpl, BASIS, PROJECT);
  fouten += toets("startwaarden van het beeld", got, {
    f_c0d: "14.54", f_c90d: "2.163", c_i: "0.938", b_ef: "6655", F_ivRd: "37.27", UC_sterkte: "0.537",
    L_ef: "7092", F_itEd: "7.33", F_tot: "12.33", UC_druk90: "0.408", UC_plooi: "0.508", UC_hoh: "1.00",
    L_cry: "2448", λ_rely: "0.782", k_cy: "0.836", UC_stijl: "0.0726", UC_max: "0.537", N_t: "7.33",
  });
  // Zonder ingevulde capaciteit zijn anker, glijden en plaat niet getoetst, en dat zegt de slotzin.
  zin("anker, glijden en plaat open", got, [/≤ 1,0 → schijf en eindstijl voldoen/, /apart aantonen/]);

  // Dezelfde invoer volgens de norm: ×1,2 op F_f,Rd, dagmaat voor plooi, 200 mm
  // bij schroeven, +30 mm contactvlak. Handwerk: 44,72 kN; 534/12/100 = 0,445;
  // 150/200 = 0,75; 12 332/(106 × 184)/2,163 = 0,292.
  const nb = reken(tpl, BASIS, NORM);
  fouten += toets("startwaarden, volgens de norm", nb, {
    F_ivRd: "44.72", UC_plooi: "0.445", UC_hoh: "0.75", A_c90: "19504", UC_druk90: "0.292", F_itEd: "7.33",
  });
  fouten += toetsNormStand("startwaarden van het beeld", got, nb, {
    F_ivRd: "hoger", UC_sterkte: "lager", UC_plooi: "lager", UC_hoh: "lager", A_c90: "hoger",
    UC_druk90: "lager", F_itEd: "gelijk", UC_stijl: "gelijk",
  });
}

// Anker, glijden en plaat ingevuld: G_k = 3 kN, F_a,Rd = 10 kN, v_Rd = 5 kN/m, f_v,d = 3,5 N/mm².
//   N_t = 7,332 − 0,9 × 3 = 4,632 kN → 0,463; glijden 20/(5 × 7,2) = 0,556;
//   τ = 20 000/(2 × 7092 × 12) = 0,1175 N/mm² → 0,0336.
{
  const got = reken(tpl, { ...BASIS, G_k_eind: "3", F_a_Rd: "10", v_Rd: "5", f_v_d: "3.5" }, PROJECT);
  fouten += toets("anker, glijden en plaat getoetst", got,
    { N_t: "4.632", UC_anker: "0.463", UC_glijden: "0.556", τ_d: "0.1175", UC_plaat: "0.0336", UC_max: "0.556" });
  zin("alles getoetst", got, [/≤ 1,0 → Schijfwerking voldoet/]);
  const zwak = reken(tpl, { ...BASIS, G_k_eind: "3", F_a_Rd: "4", v_Rd: "5", f_v_d: "3.5" }, PROJECT);
  zin("anker te zwak", zwak, [/> 1,0 → Schijfwerking voldoet niet/]);
}

// Wind van de andere kant: de gedrukte eindstijl krijgt F2 = 15 kN.
// F_tot = 7,33 + 15 = 22,33 kN → druk ⊥ = 22 332/13 984/2,163 = 0,738.
fouten += toets("grootste verticale last rechts, F2 = 15 kN", reken(tpl, { ...BASIS, F2: "15" }, PROJECT),
  { F_tot: "22.33", UC_druk90: "0.738" });

// Een regel die dikker is dan de stijl: het contactvlak blijft 38 × 184 = 6992 mm²
// (niet de doorsnede van de regel, 100 × 184), en de stijl is 2600 − 200 = 2400 lang.
// Druk ⊥ = 12 332/6992/2,163 = 0,815.
fouten += toets("regel 100 mm dik, stijl 38 mm", reken(tpl, { ...BASIS, t_stijl: "38", t_regel: "100" }, PROJECT),
  { A_c90: "6992", UC_druk90: "0.815", L_cry: "2400" });

// Wand van 1800 mm: één plaat van 1220, het restpaneel van 580 < h/4 = 650 telt niet.
//   F_i,v,Rd = 0,42 × 1220 × 0,9385 × 2/150 = 6,41 kN (volgens de norm × 1,2 = 7,69 kN);
//   bij 8,5 kN: UC = 1,33 (norm 1,10). De hefboom is de ene plaat: 8,5 × 2600/1220 = 18,11 kN.
//   Het blad gaf eerder 9,46 kN en 12,28 kN.
{
  const invoer = { ...BASIS, b: "1800", F_ivEd: "8.5" };
  const got = reken(tpl, invoer, PROJECT);
  fouten += toets("wand 1800: restpaneel smaller dan h/4", got,
    { b_ef: "1145", F_ivRd: "6.41", UC_sterkte: "1.33", L_ef: "1220", F_itEd: "18.11" });
  fouten += toets("wand 1800, volgens de norm", reken(tpl, invoer, NORM), { F_ivRd: "7.69", UC_sterkte: "1.10" });
  const ok = /Het restpaneel is smaller dan h\/4/.test(got.text);
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} melding over het anker bij een restpaneel smaller dan h/4`);
}

// Wand van 700 mm, korter dan een plaat maar breder dan h/4: één paneel met
// c = 700/1300 = 0,538. F_i,v,Rd = 0,42 × 700 × 0,538 × 2/150 = 2,11 kN (norm 2,53 kN),
// hefboom = 700 mm. Het blad gaf eerder 3,68 kN.
fouten += toets("wand 700: één smal paneel", reken(tpl, { ...BASIS, b: "700", F_ivEd: "2.5" }, PROJECT),
  { F_ivRd: "2.11", L_ef: "700", F_itEd: "9.29" });
fouten += toets("wand 700, volgens de norm", reken(tpl, { ...BASIS, b: "700", F_ivEd: "2.5" }, NORM), { F_ivRd: "2.53" });

// Wand van 600 mm < h/4: telt niet mee; het blad gaf eerder 3,15 kN en "voldoet".
{
  const got = reken(tpl, { ...BASIS, b: "600", F_ivEd: "2.5" }, PROJECT);
  fouten += toets("wand korter dan h/4", got, { F_ivRd: "0" });
  zin("wand korter dan h/4", got, [/^Maatgevende UC = ∞/, /voldoet niet/]);
  const ok = /De wand is korter dan h\/4/.test(got.text);
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} melding "korter dan h/4"`);
}

// Platen van 600 mm bij h = 2600: smaller dan h/4 = 650, dus geen bijdrage.
{
  const got = reken(tpl, { ...BASIS, bi: "600" }, PROJECT);
  fouten += toets("platen smaller dan h/4", got, { F_ivRd: "0" });
  zin("platen smaller dan h/4", got, [/^Maatgevende UC = ∞/, /voldoet niet/]);
  const ok = /kleiner dan h\/4/.test(got.text);
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} melding "kleiner dan h/4"`);
}

// Stijl doorlopend: de toets op druk ⊥ vervalt (UC_druk90 = 0, verborgen); de sterkte blijft maatgevend.
fouten += toets("stijl doorlopend", reken(tpl, { ...BASIS, detail_AC: "2" }, PROJECT),
  { UC_max: "0.537" });

// Verbindingsmiddelen op 200 mm: de sterkte-UC blijft onder 1, maar de
// detaillering niet (200/150 = 1,33), en dat moet de slotzin zeggen.
// Volgens de norm mag 200 mm bij schroeven: 200/200 = 1,00.
{
  const got = reken(tpl, { ...BASIS, s_verb: "200" }, PROJECT);
  fouten += toets("schroeven op 200 mm", got, { UC_hoh: "1.33" });
  zin("detaillering", got, [/Schijfwerking voldoet niet: de detaillering klopt niet/]);
  fouten += toets("schroeven op 200 mm, volgens de norm", reken(tpl, { ...BASIS, s_verb: "200" }, NORM), { UC_hoh: "1.00" });
}

afronden(fouten, "Schijfwerking");
