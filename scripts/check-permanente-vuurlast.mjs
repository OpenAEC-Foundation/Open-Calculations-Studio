/**
 * Controlescript voor de module Permanente vuurlast.
 *
 * Geen referentieblad; een handberekening met de verbrandingswaarden uit
 * tabel NB.6 van NEN-EN 1991-1-2:
 *
 *   hout      1000 kg × 18 = 18 000 MJ
 *   PUR/PIR    100 kg × 26 =  2 600 MJ
 *   EPS         50 kg × 40 =  2 000 MJ
 *   bitumen    400 kg × 42 = 16 800 MJ
 *   PVC         20 kg × 17 =    340 MJ
 *   PE          10 kg × 44 =    440 MJ
 *   overig       5 kg × 30 =    150 MJ
 *                            ─────────
 *                            40 330 MJ over 100 m² → 403,3 MJ/m², UC 0,81
 *
 * Draaien:  node scripts/check-permanente-vuurlast.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("permanenteVuurlast.ts");
const PROJECT = { CC: 2, K_FI: 1, rekenwijze: 1 };

const BASIS = {
  A_f: "100", m_hout: "1000", m_pir: "100", m_eps: "50", m_bitumen: "400",
  m_pvc: "20", m_pe: "10", m_overig: "5", H_u_overig: "30",
};

/** De slotzin van het blad: "Maatgevende UC = … → …". */
function slotzin(got) {
  const i = got.text.lastIndexOf("Maatgevende UC");
  return i < 0 ? "" : got.text.slice(i, i + 140);
}

let fouten = 0;

const got = reken(tpl, BASIS, PROJECT);
fouten += toets("handberekening — 100 m², zeven materialen", got,
  { Q_totaal: "40330", q_f_k: "403.3", UC_max: "0.81" });
{
  const zin = slotzin(got);
  const ok = /voldoet\s*: de permanente vuurbelasting is niet groter dan 500/.test(zin);
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} slotzin   ${zin.slice(0, 90)}`);
}

// Boven de grens: 1000 kg bitumen extra op dezelfde 100 m² → 823,3 MJ/m².
const zwaar = reken(tpl, { ...BASIS, m_bitumen: "1400" }, PROJECT);
fouten += toets("boven de grens — 1400 kg bitumen", zwaar, { q_f_k: "823.3", UC_max: "1.65" });
{
  const zin = slotzin(zwaar);
  const ok = /voldoet niet\s*: de permanente vuurbelasting is groter dan 500/.test(zin);
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK    " : "FOUT  "} slotzin   ${zin.slice(0, 90)}`);
}

// Zonder vloeroppervlakte: geen deling door nul maar een melding en ∞.
const leeg = reken(tpl, { ...BASIS, A_f: "0" }, PROJECT);
{
  const zin = slotzin(leeg);
  const ok = /Vul de vloeroppervlakte/.test(leeg.text) && zin.startsWith("Maatgevende UC = ∞");
  if (!ok) fouten++;
  console.log(`\nzonder vloeroppervlakte\n  ${ok ? "OK    " : "FOUT  "} melding en slotzin   ${zin.slice(0, 60) || "(geen)"}`);
}

afronden(fouten, "Permanente vuurlast");
