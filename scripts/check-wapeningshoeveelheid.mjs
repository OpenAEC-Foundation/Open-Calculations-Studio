/**
 * Handcontrole van betonvolume en staalmassa. Geen sterktetoets.
 *
 * Set 1: drie elementen 0,300×0,500×4,000 m geven elk 0,600 m³ beton.
 * Vier staven Ø16 van 4,2 m wegen per element
 * 4·4,2·π·(0,016²/4)·7850 = 26,515 kg. Eenentwintig beugels Ø8
 * van 1,4 m wegen 21·1,4·π·(0,008²/4)·7850 = 11,601 kg.
 * Met 2 kg extra is dat 40,117 kg per element, 120,350 kg totaal en
 * 40,117/0,600 = 66,861 kg/m³ beton.
 *
 * Set 2: twee balken 0,400×0,500×10,000 m geven elk 2,000 m³.
 * Langsstaven: 2Ø10×11 m = 13,564 kg; 8Ø12×11 m = 78,128 kg;
 * 2Ø16×2 m = 6,313 kg. Beugels: 33Ø8×1,76 m = 22,917 kg.
 * Som = 120,922 kg per balk en 241,845 kg voor twee balken.
 */
import { wapeningshoeveelheid } from "../packages/desktop/src/templates/wapeningshoeveelheid.ts";
import { reken, toets } from "./lib/refcheck.mjs";

const invoer = (v) => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]));
const basis = {
  n_el: 3, b_el: 300, h_el: 500, l_el: 4000, V_extra: 0,
  n_1: 4, d_1: 16, l_1: 4200,
  n_2: 0, d_2: 0, l_2: 0,
  n_3: 0, d_3: 0, l_3: 0,
  n_bgl: 21, d_bgl: 8, l_bgl: 1400, m_extra: 2,
};

let fouten = 0;
fouten += toets("Drie balken met langsstaven en beugels", reken(wapeningshoeveelheid, invoer(basis)), {
  V_el: "0.600", V_totaal: "1.800",
  q_1: "1.578", q_bgl: "0.3946",
  m_1: "26.52", m_bgl: "11.60", m_st_el: "40.12",
  m_st_totaal: "120.4", rho_w: "66.86",
});

fouten += toets("Twee grotere balken", reken(wapeningshoeveelheid, invoer({
  ...basis, n_el: 2, b_el: 400, l_el: 10000,
  n_1: 2, d_1: 10, l_1: 11000,
  n_2: 8, d_2: 12, l_2: 11000,
  n_3: 2, d_3: 16, l_3: 2000,
  n_bgl: 33, l_bgl: 1760, m_extra: 0,
})), {
  V_el: "2.000", V_totaal: "4.000",
  q_1: "0.6165", q_2: "0.8878", q_3: "1.578", q_bgl: "0.3946",
  m_1: "13.56", m_2: "78.13", m_3: "6.313", m_bgl: "22.92",
  m_st_el: "120.9", m_st_totaal: "241.8", rho_w: "60.46",
});

for (const [naam, wijziging] of [
  ["zonder betonmaat", { b_el: 0 }],
  ["onvolledige staafgroep", { n_1: 4, d_1: 0 }],
  ["negatieve extra massa", { m_extra: -1 }],
  ["gebroken aantal elementen", { n_el: 1.5 }],
  ["gebroken aantal staven", { n_1: 3.5 }],
]) {
  const got = reken(wapeningshoeveelheid, invoer({ ...basis, ...wijziging }));
  if ("m_st_totaal" in got.values || "rho_w" in got.values || !got.text.includes("Geen hoeveelheden berekend")) {
    console.error(`FOUT: ${naam} levert ten onrechte een hoeveelheid.`);
    fouten++;
  }
}

console.log(fouten ? `\n${fouten} fout(en).` : "\nWapeningshoeveelheid: handcontroles geslaagd.");
process.exitCode = fouten ? 1 : 0;
