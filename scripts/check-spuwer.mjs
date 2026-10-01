/**
 * Controlescript voor de module Spuwer (noodoverlaat).
 *
 * Acht referentieberekeningen, alle met afvoergebied A = 600 m².
 * Sets 1S t/m 5S bij t = 50 jaar variëren het aantal spuwers en de afmetingen;
 * 6S t/m 8S variëren de ontwerplevensduur en daarmee de regenintensiteit i_r.
 *
 * Splitspunt (register punt 20): de referentie-uitwerking rekent met afgeronde
 * waarden uit tabel NB.1, de norm-stand met de tabel zelf (7.2(4)). De
 * referentiesets draaien in de referentiestand; daarna volgen 6S, 7S en 8S in
 * de norm-stand met een handberekening.
 *
 * De UC wordt uit de slotzin gehaald ("Maatgevende UC = …"): daar leest ook de
 * rapportkop de uitkomst en het oordeel van het blad.
 *
 * De referentiebladen geven ook een ronde spuwer bij gelijke d_nd (160 / 160 /
 * 80 / 160 / 160 mm). Het blad drukt die niet meer af: het is geen minimale
 * maat, want §7.3(3) vraagt voor een ronde spuwer ten minste 117 mm. Het
 * script bewaakt dat die maat niet terugkomt.
 *
 * Draaien:  node scripts/check-spuwer.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("spuwer.ts");
const REFERENTIE = { rekenwijze: 1 };
const NORM = { rekenwijze: 0 };

/** A = 600 m² in alle sets; de rest varieert per referentieblad. */
const BASIS = { A_afv: "600", n_sp: "3", b_sp: "600", h_sp: "80", h_nd: "50", t_ref: "50" };

const REFERENTIES = [
  { blad: "1S — n 3 · b 600 · h 80 · h_nd 50 · t 50 jaar",
    invoer: {},
    verwacht: { d_nd: "45.7", d_hw: "96", h_min: "76", UC: "0.95" } },
  { blad: "2S — n 2 (minder spuwers, zelfde dak)",
    invoer: { n_sp: "2" },
    verwacht: { d_nd: "59.8", d_hw: "110", h_min: "90", UC: "1.12" } },
  { blad: "3S — n 2 · b 300 (halve spuwerbreedte)",
    invoer: { n_sp: "2", b_sp: "300" },
    verwacht: { d_nd: "95.0", d_hw: "145", h_min: "125", UC: "1.56" } },
  { blad: "4S — n 2 · h 100 (hogere spuwer)",
    invoer: { n_sp: "2", h_sp: "100" },
    verwacht: { d_nd: "59.8", d_hw: "110", h_min: "90", UC: "0.90" } },
  { blad: "5S — n 2 · h_nd 30 (lagere drempel)",
    invoer: { n_sp: "2", h_nd: "30" },
    verwacht: { d_nd: "59.8", d_hw: "90", h_min: "90", UC: "1.12" } },

  // 6S t/m 8S: n 3 · b 600 · h 80 · h_nd 30, alleen de referentieperiode wisselt.
  // Toetst tabel NB.1 — i_r per ontwerplevensduur.
  { blad: "6S — t 5 jaar (i_r 0,000027)",
    invoer: { h_nd: "30", t_ref: "5" },
    verwacht: { i_r: "0.000027", d_nd: "30.3", d_hw: "60", UC: "0.75" } },
  { blad: "7S — t 15 jaar (i_r 0,000041)",
    invoer: { h_nd: "30", t_ref: "15" },
    // de referentie-uitwerking's d_nd = 40,0 geeft h_min 70,0 en dus u.c. = 70/80 = 0,875 —
    // exact de afrondgrens naar twee decimalen, en het blad drukt 0,87 af.
    // Onze 40,01 tilt het naar 0,8751, dat naar 0,88 zou afronden. Het
    // onderliggende getal komt dus overeen; alleen de afronding valt anders.
    // Daarom hier één gedrukte eenheid tolerantie in plaats van een halve.
    verwacht: { i_r: "0.000041", d_nd: "40.0", d_hw: "70",
                UC: { waarde: "0.87", tol: 0.01, waarom: "0,875 ligt exact op de afrondgrens" } } },
  { blad: "8S — t 100 jaar (i_r 0,000056)",
    invoer: { h_nd: "30", t_ref: "100" },
    verwacht: { i_r: "0.000056", d_nd: "49.3", d_hw: "79", UC: "0.99" } },
];

let fouten = 0;
for (const ref of REFERENTIES) {
  const got = reken(tpl, { ...BASIS, ...ref.invoer }, REFERENTIE);
  // De slotzin: "Maatgevende UC = 0.9459 ≤ 1.0 → Spuwer voldoet".
  const m = got.text.match(/Maatgevende UC\s*=\s*([\d.]+)/);
  const afgeleid = m ? { UC: parseFloat(m[1]) } : {};
  fouten += toets(ref.blad, got, ref.verwacht, {}, afgeleid);
  if (!m) {
    fouten++;
    console.log("  FOUT   geen slotzin 'Maatgevende UC = …'");
  } else {
    // Het oordeel in de slotzin moet bij de UC passen.
    const zin = got.text.slice(got.text.lastIndexOf("Maatgevende UC"));
    const voldoet = !/voldoet niet/.test(zin) && /voldoet/.test(zin);
    const ok = voldoet === (parseFloat(m[1]) <= 1);
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} oordeel   ${voldoet ? "voldoet" : "voldoet niet"}`);
  }
  if (/ronde spuwer/i.test(got.text)) {
    fouten++;
    console.log('  FOUT   het blad drukt weer een ronde-spuwerdiameter af');
  }
}

// ── Norm-stand: tabel NB.1 zelf (7.2(4)) ─────────────────────────────────────
// n 3 · b 0,6 m · h 80 · h_nd 30, A = 600 m²; d_nd = 0,7·(A·i_r/(n·b))^(2/3), UC = (d_nd + 30)/80.
//   5 jaar:   i_r = 0,0215 + 4/14·(0,0406 − 0,0215) = 0,02696·10⁻³ → (600·2,696e-5/1,8)^(2/3) = 0,04322
//             → d_nd = 30,26 mm, UC = 0,7532 (referentie 0,000027: 30,29 en 0,7536)
//   15 jaar:  i_r = 0,0406·10⁻³ → d_nd = 0,7·0,013533^(2/3) = 39,75 mm, UC = 0,8719 (referentie 40,01 en 0,8752)
//   100 jaar: i_r = 0,0561·10⁻³ → d_nd = 0,7·0,018700^(2/3) = 49,32 mm, UC = 0,9915 (referentie 49,26 en 0,9907)
for (const [blad, t, verwacht] of [
  ["6S norm-stand — t 5 jaar", "5", { i_r: "0.00002696", d_nd: "30.26", UC: "0.7532" }],
  ["7S norm-stand — t 15 jaar", "15", { i_r: "0.0000406", d_nd: "39.75", UC: "0.8719" }],
  ["8S norm-stand — t 100 jaar", "100", { i_r: "0.0000561", d_nd: "49.32", UC: "0.9915" }],
]) {
  const got = reken(tpl, { ...BASIS, h_nd: "30", t_ref: t }, NORM);
  const m = got.text.match(/Maatgevende UC\s*=\s*([\d.]+)/);
  fouten += toets(blad, got, verwacht, {}, m ? { UC: parseFloat(m[1]) } : {});
}
// De referentiestand meldt het verschil met tabel NB.1, de norm-stand niet.
{
  const melding = /Tabel NB\.1 geeft/;
  const ok = melding.test(reken(tpl, { ...BASIS, t_ref: "100" }, REFERENTIE).text) &&
    !melding.test(reken(tpl, { ...BASIS, t_ref: "50" }, REFERENTIE).text) &&
    !melding.test(reken(tpl, { ...BASIS, t_ref: "100" }, NORM).text);
  if (!ok) fouten++;
  console.log(`\nmelding bij een afgeronde i_r\n  ${ok ? "OK    " : "FOUT  "} alleen in de referentiestand en alleen als het verschilt`);
}

afronden(fouten, "Spuwer");
