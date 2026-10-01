/**
 * Controlescript voor de module Beton detaillering (NEN-EN 1992-1-1 met de NB):
 * betondekking (§4.4.1), wapeningstabellen met staafafstanden (§8.2, §9.2.1.1,
 * §9.3.1.1, §9.6) en wandwapening (§9.6).
 *
 * Er is geen referentieblad voor deze module: elke set hieronder is met de hand
 * nagerekend, en die handberekening staat erbij. Tot slot een doorloop over
 * alle keuzes van het blad met gewone invoer: overal een eindig getal, geen
 * foutmelding en een slotregel.
 *
 * Draaien:  node scripts/check-betondetaillering.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { laadTemplate, reken, toets } from "./lib/refcheck.mjs";

const tpl = laadTemplate("betonDetaillering.ts");

/** Projectgegevens: alleen de ontwerplevensduur telt in dit blad. */
const project = (jaren = 50) => ({ DesignLife: jaren, rekenwijze: 1, CC: 2, K_FI: 1, RC: 2 });

let fouten = 0;

/** Toetst of een tekst in de uitwerking staat (of juist niet). */
function tekst(got, patroon, moet = true) {
  const gezien = patroon.test(got.text);
  const ok = gezien === moet;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} tekst      ${moet ? "" : "niet: "}${patroon.source}`);
}

// ── 1. Betondekking ─────────────────────────────────────────────────────────
// Keuzewaarden: milieuklasse 1 X0 · 2 XC1 · 3 XC2 · 4 XC3 · 5 XC4 · 6 XD1 · 7 XD2 ·
// 8 XD3 · 9 XS1 · 10 XS2 · 11 XS3. betonklasse is het volgnummer: 3 C20/25 ·
// 5 C30/37 · 6 C35/45 · 7 C40/50 · 8 C45/55.
const DEKKING = {
  onderwerp: "1", d_g: "16", milieuklasse: "4", aantasting: "0", betonklasse: "5",
  luchtbel: "0", plaatvorm: "0", kwaliteit: "0", ds_hfd: "16", ds_bgl: "8",
  n_bundel: "1", oppervlak: "1", uitvoering: "1", ondergrond: "1", c_dek: "30",
};

{
  // XC3 in C30/37: de grens voor XC2/XC3 is C35/45, dus geen vermindering → S4.
  // Tabel 4.4N (NB), S4, XC2/XC3: c_min,dur = 25 mm. Beugel Ø8: c_min,b = 8,
  // c_min = max(8; 25; 10) = 25, c_nom = 25 + 5 = 30 mm. Hoofdstaaf Ø16: c_min =
  // max(16; 25; 10) = 25, c_nom = 30 mm; aanwezig 30 + 8 = 38 → 30/38 = 0,789.
  const got = reken(tpl, DEKKING, project());
  fouten += toets("dekking 1 — XC3 · C30/37 · 50 jaar · Ø16 met beugel Ø8 · c 30", got, {
    S_kl: "4", c_min_dur: "25", c_min_b_bgl: "8", c_min_bgl: "25", c_min_hfd: "25",
    "Δc_dev": "5", c_nom_bgl: "30", c_nom_hfd: "30", c_hfd: "38",
    UC_c_bgl: "1.000", UC_c_hfd: "0.789", UC_max: "1.000",
  });
  tekst(got, /Maatgevende UC = 1 ≤ 1,0 → voldoet/);
}

{
  // XC4 in C45/55, 100 jaar, plaatgeometrie: 4 + 2 − 1 (≥ C40/50) − 1 = S4.
  // XC4 in S4: c_min,dur = 30. Hoofdstaaf Ø12 zonder beugel: c_min = 30, c_nom = 35.
  const got = reken(tpl, { ...DEKKING, milieuklasse: "5", betonklasse: "8", plaatvorm: "1",
    ds_hfd: "12", ds_bgl: "0", c_dek: "35" }, project(100));
  fouten += toets("dekking 2 — XC4 · C45/55 · 100 jaar · plaat · Ø12 zonder beugel · c 35", got, {
    S_kl: "4", c_min_dur: "30", c_min_hfd: "30", c_nom_hfd: "35", c_eis_hfd: "35", UC_max: "1.000",
  });
}

{
  // Dezelfde XC4 in C30/37, 100 jaar, geen plaat: 4 + 2 = S6 → c_min,dur = 40,
  // c_nom = 45; met c 35 → 45/35 = 1,286.
  const got = reken(tpl, { ...DEKKING, milieuklasse: "5", betonklasse: "5",
    ds_hfd: "12", ds_bgl: "0", c_dek: "35" }, project(100));
  fouten += toets("dekking 3 — XC4 · C30/37 · 100 jaar: S6", got, {
    S_kl: "6", c_min_dur: "40", c_nom_hfd: "45", UC_max: "1.286",
  });
  tekst(got, /voldoet niet/);
}

{
  // XD3: de grens is invoer, hier C45/55 (8); C35/45 haalt die niet → S4. Tabel
  // 4.4N (NB) XD3/XS3 in S4: 40 mm. Direct tegen de grond: k₂ = 40 + 50 = 90 mm.
  // Bundel 2Ø25: Φ_n = 25·√2 = 35,36 mm; d_g 40 > 32 → +5 → c_min,b = 40,36;
  // c_min = 40,36, c_nom = 45,36. Beugel Ø10: c_min,b = 15, c_min = 40, c_nom = 45,
  // vereist max(45; 90) = 90 → 90/80 = 1,125. Hoofdstaaf: 45,36/(80 + 10) = 0,504.
  // Φ_n/55 = 0,643.
  const got = reken(tpl, { ...DEKKING, milieuklasse: "8", grensklasse: "8", betonklasse: "6",
    d_g: "40", ds_hfd: "25", n_bundel: "2", ds_bgl: "10", ondergrond: "3", c_dek: "80" }, project());
  fouten += toets("dekking 4 — XD3 · bundel 2Ø25 · d_g 40 · tegen de grond · c 80", got, {
    S_kl: "4", c_min_dur: "40", "Φ_n": "35.36", c_min_b_hfd: "40.36", c_nom_hfd: "45.36",
    c_min_b_bgl: "15", c_nom_bgl: "45", c_ond: "90", c_eis_bgl: "90",
    UC_c_bgl: "1.125", UC_c_hfd: "0.504", "UC_Φn": "0.643", UC_max: "1.125",
  });
}

{
  // X0, C20/25, 15 jaar, kwaliteitsbeheersing: 4 − 1 = S3 → X0: 10 mm. Oneffen
  // oppervlak: c_min = max(10; 10; 10) + 5 = 15. De reductie van Δc_dev mag niet
  // samen met de klassevermindering: Δc_dev blijft 5 → c_nom = 20.
  const got = reken(tpl, { ...DEKKING, milieuklasse: "1", betonklasse: "3", kwaliteit: "1",
    uitvoering: "2", red_dev: "5", oppervlak: "2", ds_hfd: "10", ds_bgl: "0", c_dek: "20" }, project(15));
  fouten += toets("dekking 5 — X0 · kwaliteitsbeheersing én reductie Δc_dev · oneffen", got, {
    S_kl: "3", c_min_dur: "10", c_min_hfd: "15", "Δc_dev": "5", c_nom_hfd: "20", UC_max: "1.000",
  });
  tekst(got, /de reductie van Δc dev is niet toegepast/);
}

{
  // Zonder kwaliteitsbeheersing: S4, X0 10 mm; reductie 5 → Δc_dev = 0 → c_nom = 15
  // met het oneffen oppervlak; 15/20 = 0,75.
  const got = reken(tpl, { ...DEKKING, milieuklasse: "1", betonklasse: "3",
    uitvoering: "2", red_dev: "5", oppervlak: "2", ds_hfd: "10", ds_bgl: "0", c_dek: "20" }, project(15));
  fouten += toets("dekking 6 — X0 · reductie Δc_dev 5 mm", got, {
    S_kl: "4", "Δc_dev": "0", c_nom_hfd: "15", UC_max: "0.75",
  });
  tekst(got, /niet toegepast/, false);
}

{
  // XC4 in C35/45 met luchtinsluiting: de grens C40/50 gaat één klasse omlaag naar
  // C35/45 → S3; XC4 in S3: 25 mm → c_nom 30. Zonder luchtinsluiting S4: 30 → 35.
  const met = reken(tpl, { ...DEKKING, milieuklasse: "5", betonklasse: "6", luchtbel: "1",
    ds_hfd: "12", ds_bgl: "0", c_dek: "30" }, project());
  fouten += toets("dekking 7 — XC4 · C35/45 · luchtinsluiting > 4 %", met, {
    S_kl: "3", c_min_dur: "25", c_nom_hfd: "30", UC_max: "1.000",
  });
  const zonder = reken(tpl, { ...DEKKING, milieuklasse: "5", betonklasse: "6",
    ds_hfd: "12", ds_bgl: "0", c_dek: "30" }, project());
  fouten += toets("dekking 8 — dezelfde zonder luchtinsluiting", zonder, {
    S_kl: "4", c_min_dur: "30", c_nom_hfd: "35", UC_max: "1.167",
  });
}

{
  // XS1 valt in tabel 4.4N onder XD1/XS1. Grens (invoer) C40/50, beton C40/50 →
  // S3 → 30 mm; Ø16 zonder beugel → c_nom 35.
  const got = reken(tpl, { ...DEKKING, milieuklasse: "9", grensklasse: "7", betonklasse: "7",
    ds_bgl: "0", c_dek: "35" }, project());
  fouten += toets("dekking 9 — XS1 · grens C40/50 als invoer", got, {
    S_kl: "3", c_min_dur: "30", c_nom_hfd: "35", UC_max: "1.000",
  });
}

{
  // Begrenzing S1: X0 in C30/37, plaat én kwaliteitsbeheersing: 4 − 3 = S1 → 10.
  // Voorbereide ondergrond: k₁ = 10 + 10 = 20 op de buitenste staaf; c_nom = 15.
  const got = reken(tpl, { ...DEKKING, milieuklasse: "1", plaatvorm: "1", kwaliteit: "1",
    ds_hfd: "10", ds_bgl: "0", ondergrond: "2", c_dek: "25" }, project());
  fouten += toets("dekking 10 — X0 · S1 · voorbereide ondergrond", got, {
    S_kl: "1", c_min_dur: "10", c_nom_hfd: "15", c_ond: "20", c_eis_hfd: "20", UC_max: "0.80",
  });
}

// ── 2. Wapeningstabellen ────────────────────────────────────────────────────
const TABEL = { onderwerp: "2", d_g: "16", toepassing: "1", rol: "1", zone: "2", h_el: "200",
  A_nodig: "500", ds_kz: "0", s_kz: "0" };

{
  // Plaat 200 mm, hoofdwapening bij het grootste moment: s_max = min(2·200; 250) =
  // 250. a_min = max(Ø; 16 + 5; 20) = 21 tot Ø21. Nodig 500 mm²/m:
  //   Ø6: s ≤ 28,3·1000/500 = 56,5 → past niet (kleinste h.o.h. 75)
  //   Ø8: s ≤ 100,5 → 100 → 502,7   Ø10: s ≤ 157,1 → 150 → 523,6
  //   Ø12: s ≤ 226,2 → 200 → 565,5  Ø16: 402,1 → begrensd op 250 → 804,2
  // Lichtste: Ø8–100. UC 500/502,7 = 0,995; s_min 8 + 21 = 29 → 0,29; 100/250 = 0,4;
  // A_s,max = 0,04·200·1000 = 8000 → 0,063; Ø5/Ø8 = 0,625.
  const got = reken(tpl, TABEL, project());
  fouten += toets("tabel 1 — plaat 200 · hoofdwapening bij het grootste moment · 500 mm²/m", got, {
    s_max: "250", A_s_max: "8000", a_min: "21", a_s_g: "502.7", UC_A: "0.995",
    UC_smin: "0.29", UC_smax: "0.4", UC_Amax: "0.063", UC_ds: "0.625", UC_max: "0.995",
  });
  tekst(got, /1 Ø8–100 503 99 % 2 Ø10–150 524 95 % 3 Ø12–200 565 88 % 4 Ø16–250 804/);
  tekst(got, /Ø6–/, false);
}

{
  // Plaat 300 mm, verdeelwapening, algemeen: min(3,5·300; 450) = 450, maar dikker
  // dan 250 mm → 250 (9.3.1.1(8)). Gekozen Ø10–300: 300/250 = 1,2.
  const got = reken(tpl, { ...TABEL, h_el: "300", rol: "2", zone: "1", A_nodig: "0",
    ds_kz: "10", s_kz: "300" }, project());
  fouten += toets("tabel 2 — plaat 300 · verdeelwapening · Ø10–300", got, {
    s_max: "250", a_s_g: "261.8", UC_A: "0", UC_smax: "1.2", UC_max: "1.2",
  });
}

{
  // Wand 200 mm, verticaal: s_max = min(600; 400) = 400. Nodig 400 mm²/m:
  //   Ø6: s ≤ 70,7 → past niet   Ø8: s ≤ 125,7 → 125 → 402,1
  //   Ø10: s ≤ 196,3 → 175 → 448,8   Ø12: s ≤ 282,7 → 250 → 452,4
  // Lichtste Ø8–125: 400/402,1 = 0,995.
  const got = reken(tpl, { ...TABEL, toepassing: "2", richting: "1", A_nodig: "400" }, project());
  fouten += toets("tabel 3 — wand 200 · verticaal · 400 mm²/m", got, {
    s_max: "400", A_s_max: "8000", a_s_g: "402.1", UC_A: "0.995", UC_max: "0.995",
  });
  tekst(got, /1 Ø8–125 402 99 % 2 Ø10–175 449 89 % 3 Ø12–250 452 88 %/);
}

const BALK = { onderwerp: "2", d_g: "16", toepassing: "3", h_el: "500", b_el: "300",
  c_dek: "30", ds_bgl: "8", A_nodig: "1200", ds_kz: "0", n_kz: "0" };

{
  // Balk 300 × 500, dekking 30 op beugel Ø8: b_besch = 300 − 2·38 = 224 mm.
  // n_max = ⌊(224 + a)/(Ø + a)⌋ met a = max(Ø; 21; 20):
  //   Ø16: ⌊245/37⌋ = 6, nodig ⌈1200/201,1⌉ = 6 → 1206,4 (past)
  //   Ø20: ⌊245/41⌋ = 5, nodig 4 → 1256,6   Ø25: ⌊249/50⌋ = 4, nodig 3 → 1472,6
  //   Ø12: ⌊245/33⌋ = 7, nodig 11 → past niet
  // Lichtste 6Ø16: 6·16 + 5·21 = 201 ≤ 224 → 0,897; A_s,max = 0,04·300·500 = 6000.
  const got = reken(tpl, BALK, project());
  fouten += toets("tabel 4 — balk 300 × 500 · 1200 mm² · lichtste keuze", got, {
    b_besch: "224", A_s_max: "6000", A_s_g: "1206", UC_A: "0.995", b_nodig: "201",
    UC_b: "0.897", UC_max: "0.995",
  });
  tekst(got, /1 6Ø16 1206 99 % 2 4Ø20 1257 95 % 3 3Ø25 1473 81 % 4 2Ø32 1608 75 % 5 2Ø40 2513 48 %/);
  tekst(got, /Ø16 6 201 402 603 804 1005 1206 1407/);
}

{
  // Eigen keuze 4Ø20: 1200/1256,6 = 0,955; 4·20 + 3·21 = 143 → 143/224 = 0,638;
  // 1256,6/6000 = 0,209.
  const got = reken(tpl, { ...BALK, ds_kz: "20", n_kz: "4" }, project());
  fouten += toets("tabel 5 — balk · eigen keuze 4Ø20", got, {
    A_s_g: "1257", UC_A: "0.955", b_nodig: "143", UC_b: "0.638", UC_Amax: "0.209", UC_max: "0.955",
  });
}

{
  // Grover toeslagmateriaal d_g 32: a = max(Ø; 37; 20). Ø16: ⌊261/53⌋ = 4 < 6 →
  // past niet. Ø20: ⌊261/57⌋ = 4, nodig 4 → 1256,6: nu het lichtst.
  const got = reken(tpl, { ...BALK, d_g: "32" }, project());
  fouten += toets("tabel 6 — balk · d_g 32 mm", got, {
    a_min: "37", A_s_g: "1257", b_nodig: "191", UC_max: "0.955",
  });
  tekst(got, /1 4Ø20 1257/);
}

// ── 3. Wandwapening ─────────────────────────────────────────────────────────
const WAND = { onderwerp: "3", d_g: "16", h_el: "200", l_w: "3", c_dek: "25", netten: "2",
  dragend: "1", bekist: "0", ds_v: "10", s_v: "200", ds_h: "8", s_h: "250", buitenlaag: "1" };

{
  // Wand 200 mm, twee netten Ø10–200 verticaal en Ø8–250 horizontaal:
  // A_s,v = 2·78,54·1000/200 = 785,4 mm²/m, A_c = 200 000 → ρ 0,393 %; A_s,vmax 8000.
  // h_min = max(100; 120) = 120 → 0,6. l/h: 4·200/3000 = 0,267. s_v,max = 400 → 0,5.
  // 785,4 < 0,02·A_c = 4000: geen beugels. Maatgevend Ø5/Ø8 en 250/400 = 0,625.
  const got = reken(tpl, WAND, project());
  fouten += toets("wand 1 — 200 mm · Ø10–200 en Ø8–250 · twee netten", got, {
    UC_lh: "0.267", h_min: "120", UC_h: "0.6", a_s_v: "785.4", "ρ_v": "0.393",
    A_s_vmax: "8000", UC_vmax: "0.098", s_v_max: "400", UC_sv: "0.5", s_v_min: "31",
    a_s_h: "402.1", UC_sh: "0.625", s_h_min: "29", UC_ds: "0.625", UC_max: "0.625",
  });
  tekst(got, /vraagt geen beugels/);
}

{
  // Ø20–100 verticaal aan de buitenkant: A_s,v = 2·314,16·1000/100 = 6283 > 4000 →
  // beugels volgens 9.5.3. Ø_min = max(6; 20/4) = 6 → 6/8 = 0,75. Boven een vloer:
  // 0,6·min(20·20; 200; 400) = 120 → 150/120 = 1,25. Zone min(4·200; 3000) = 800.
  // Buitenste laag verticaal, Ø20 > 16: 4 per m² nodig → 4/4 = 1.
  const got = reken(tpl, { ...WAND, ds_v: "20", s_v: "100", buitenlaag: "2",
    ds_dw: "8", s_dw: "150", zone_dw: "2", n_dw: "4" }, project());
  fouten += toets("wand 2 — Ø20–100 buiten · beugels boven een vloer", got, {
    a_s_v: "6283", UC_vmax: "0.785", ds_dw_min: "6", UC_dw1: "0.75", s_cl_tmax: "120",
    UC_dw2: "1.25", l_zone: "800", UC_n: "1", s_v_min: "41", UC_av: "0.41", UC_max: "1.25",
  });
  tekst(got, /voldoet niet/);
}

{
  // Dragend, één net, één blijvend bekist oppervlak, 100 mm: h_min = 100 + 5 = 105
  // → 1,05. s_v,max = min(3·100; 400) = 300 → 250/300 = 0,833. Bij één net geldt
  // 9.6.4(2) niet.
  const got = reken(tpl, { ...WAND, h_el: "100", netten: "1", bekist: "1", ds_v: "8", s_v: "250",
    ds_h: "8", s_h: "250", buitenlaag: "2" }, project());
  fouten += toets("wand 3 — 100 mm · één net · blijvende bekisting", got, {
    h_min: "105", UC_h: "1.05", s_v_max: "300", UC_sv: "0.833", UC_max: "1.05",
  });
  tekst(got, /Eén net: 9\.6\.4\(2\)/);
}

{
  // Ø12–75 aan beide zijden in 150 mm: 2·113,1·1000/75 = 3016 > 0,02·150 000 = 3000.
  // Bij een overlappingslas met Ø12 ≤ 14 geen factor 0,6: min(240; 150; 400) = 150.
  // Buitenste laag verticaal, Ø12 met dekking 30 > 24: geen dwarsverbindingen.
  const got = reken(tpl, { ...WAND, h_el: "150", l_w: "2", c_dek: "30", ds_v: "12", s_v: "75",
    buitenlaag: "2", ds_dw: "6", s_dw: "150", zone_dw: "3" }, project());
  fouten += toets("wand 4 — Ø12–75 · overlappingslas met Ø ≤ 14", got, {
    a_s_v: "3016", s_cl_tmax: "150", UC_dw2: "1", UC_dw1: "1", UC_h: "0.8", UC_max: "1",
  });
  tekst(got, /geen dwarswapening nodig/);
}

{
  // Een tikfout met een minteken: n_dw = −4 en een beugel Ø−8 gaven UC_n = 4/(−4) = −1 en
  // UC_dw1 = 6/(−8) = −0,75, en daarmee "voldoet". Met de hand: er zijn geen dwarsverbindingen
  // en geen beugels, dus 4/0 = ∞ en 6/0 = ∞ → voldoet niet (verder als wand 2).
  const got = reken(tpl, { ...WAND, ds_v: "20", s_v: "100", buitenlaag: "2",
    ds_dw: "-8", s_dw: "150", zone_dw: "2", n_dw: "-4" }, project());
  console.log("\nwand 5 — negatieve beugel en dwarsverbindingen");
  tekst(got, /= ∞ , geen beugel/);
  tekst(got, /= ∞ , ten minste 4 per m²/);
  tekst(got, /Maatgevende UC = ∞ > 1,0 → voldoet niet/);
}

// ── Doorloop over alle keuzes ───────────────────────────────────────────────
{
  console.log("\ndoorloop — alle keuzes met gewone invoer");
  const sets = [];
  for (const mk of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"])
    for (const ond of ["1", "2", "3"])
      sets.push({ ...DEKKING, milieuklasse: mk, grensklasse: "99", ondergrond: ond, aantasting: mk === "3" ? "4" : "9" });
  for (const opp of ["1", "2"]) for (const b of ["1", "2", "3", "4"]) for (const u of ["1", "2"])
    sets.push({ ...DEKKING, oppervlak: opp, n_bundel: b, uitvoering: u, red_dev: "3", ds_bgl: b === "2" ? "0" : "8" });
  for (const rol of ["1", "2"]) for (const zone of ["1", "2"]) for (const h of ["160", "300"])
    for (const kz of ["0", "12"]) sets.push({ ...TABEL, rol, zone, h_el: h, ds_kz: kz, s_kz: "150" });
  for (const richting of ["1", "2"]) for (const an of ["0", "700"])
    sets.push({ ...TABEL, toepassing: "2", richting, A_nodig: an, ds_kz: "10", s_kz: "150" });
  for (const an of ["0", "900", "99999"]) for (const kz of ["0", "16"])
    sets.push({ ...BALK, A_nodig: an, ds_kz: kz, n_kz: "3" });
  for (const netten of ["1", "2"]) for (const dragend of ["0", "1"]) for (const buiten of ["1", "2"])
    for (const zone of ["1", "2", "3"]) for (const dv of ["10", "16", "25"])
      sets.push({ ...WAND, netten, dragend, buitenlaag: buiten, ds_v: dv, s_v: "100", zone_dw: zone,
        ds_dw: "8", s_dw: "150", n_dw: "4" });
  let stuk = 0;
  for (const s of sets) {
    const got = reken(tpl, s, project(s.milieuklasse === "2" ? 100 : 50));
    const niet = Object.entries(got.values).filter(([, v]) => !Number.isFinite(v)).map(([k]) => k);
    const fout = /Error|NaN|Undefined symbol|Cannot/.test(got.text);
    const slot = /Maatgevende UC = ([\d.]+|—)/.test(got.text);
    if (niet.length || fout || !slot) {
      stuk++;
      if (stuk <= 5) console.log(`  FOUT   ${JSON.stringify(s)}: ${niet.join(", ")}${fout ? " foutmelding" : ""}${slot ? "" : " geen slotregel"}`);
    }
  }
  if (stuk) fouten++;
  console.log(`  ${stuk ? "FOUT  " : "OK    "} ${sets.length} keuzesets: eindig, zonder foutmelding, met een slotregel`);
}

console.log(
  fouten === 0
    ? "\nBeton detaillering: alle handberekeningen kloppen."
    : `\nBeton detaillering: ${fouten} afwijking(en) van de handberekening.`,
);
process.exit(fouten === 0 ? 0 : 1);
