/**
 * Controlescript voor de module Schijfwerking (EN 1995-1-1 §9.2.4.2, methode A).
 *
 * Geen vastgelegd referentieblad; een handberekening met de startwaarden van
 * het beeld: schroeven F_f,Rd = 0,42 kN op 150 mm, dubbelzijdig, plaat 12 mm,
 * stijlen en regels 76×184 C24, klimaatklasse 1, wand 7200 × 2600 mm, platen
 * 1220 mm breed, stijlen 610 h.o.h., F1 = F2 = 5 kN, F_i,v,Ed = 20 kN.
 *
 *   f_c,0,d  = 21 × 0,9/1,3 = 14,54          f_c,90,d = 2,5 × 1,25 × 0,9/1,3 = 2,163
 *   c_i      = 1220/1300 = 0,938             F_i,v,Rd = 0,42 × 7200 × 0,938 × 2/150 = 37,84 kN
 *   F_i,t,Ed = 20 × 2600/7200 = 7,22 kN      F_tot = 7,22 + 5 = 12,22 kN
 *   druk ⊥   = 12 222/(76 × 184) = 0,874 → 0,404
 *   plooi    = 610/12/100 = 0,508            h.o.h. = 150/150 = 1,00
 *   stijl    : L = 2600 − 2 × 76 = 2448, λ_rel,y = 0,782, k_c,y = 0,836 → 0,072
 *
 * Draaien:  node scripts/check-schijfwerking.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("schijfwerking.ts");
const PROJECT = { CC: 2, K_FI: 1, rekenwijze: 1 };

const BASIS = {
  verbindingsmiddel: "1", F_f_Rd: "0.42", s_verb: "150", n_zijdig: "2", t_bepl: "12",
  t_stijl: "76", b_stijl: "184", t_regel: "76", b_regel: "184", detail_AC: "1",
  sterkteklasse: "2", klimaatklasse: "1", b: "7200", h: "2600", bi: "1220", hoh: "610",
  F1: "5", F2: "5", F_ivEd: "20",
};

/** De slotzin van het blad: "Maatgevende UC = … → Schijfwerking voldoet (niet)". */
function slotzin(got) {
  const i = got.text.lastIndexOf("Maatgevende UC");
  return i < 0 ? "" : got.text.slice(i, i + 120);
}

let fouten = 0;

fouten += toets("startwaarden van het beeld", reken(tpl, BASIS, PROJECT), {
  f_c0d: "14.54", f_c90d: "2.163", c_i: "0.938", F_ivRd: "37.84", UC_sterkte: "0.529",
  F_itEd: "7.22", F_tot: "12.22", UC_druk90: "0.404", UC_plooi: "0.508", UC_hoh: "1.00",
  L_cry: "2448", λ_rely: "0.782", k_cy: "0.836", UC_stijl: "0.072", UC_max: "1.00",
});

// Wind van de andere kant: de gedrukte eindstijl krijgt F2 = 15 kN.
// F_tot = 7,22 + 15 = 22,22 kN → druk ⊥ = 22 222/13 984/2,163 = 0,735.
fouten += toets("grootste verticale last rechts, F2 = 15 kN", reken(tpl, { ...BASIS, F2: "15" }, PROJECT),
  { F_tot: "22.22", UC_druk90: "0.735" });

// Een regel die dikker is dan de stijl: het contactvlak blijft 38 × 184 = 6992 mm²
// (niet de doorsnede van de regel, 100 × 184), en de stijl is 2600 − 200 = 2400 lang.
fouten += toets("regel 100 mm dik, stijl 38 mm", reken(tpl, { ...BASIS, t_stijl: "38", t_regel: "100" }, PROJECT),
  { A_c90: "6992", UC_druk90: "0.808", L_cry: "2400" });

// Platen van 600 mm bij h = 2600: smaller dan h/4 = 650, dus geen bijdrage.
{
  const got = reken(tpl, { ...BASIS, bi: "600" }, PROJECT);
  fouten += toets("platen smaller dan h/4", got, { F_ivRd: "0" });
  const zin = slotzin(got);
  const ok = zin.startsWith("Maatgevende UC = ∞") && /voldoet niet/.test(zin) && /kleiner dan h\/4/.test(got.text);
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} slotzin   ${zin.slice(0, 70) || "(geen)"}`);
}

// Stijl doorlopend: de toets op druk ⊥ vervalt.
fouten += toets("stijl doorlopend", reken(tpl, { ...BASIS, detail_AC: "2" }, PROJECT),
  { UC_max: "1.00" });

afronden(fouten, "Schijfwerking");
