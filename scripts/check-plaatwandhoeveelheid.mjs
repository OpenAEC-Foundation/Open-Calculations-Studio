/**
 * Onafhankelijke handcontrole van de hoeveelheden; geen sterktetoets.
 *
 * Geval 1: twee platen van 4,0×3,0×0,2 m: 2,4 m³ per stuk.
 * Bij 50 mm randafstand zijn de verdeelafstanden 2900 en 3900 mm.
 * Onder langs: ceil(2900/200)+1 = 16 staven Ø10×3,9 m → 38,472 kg.
 * Onder dwars: ceil(3900/250)+1 = 17 staven Ø8×2,9 m → 19,453 kg.
 * Boven langs: ceil(2900/150)+1 = 21 staven Ø12×4,2 m → 78,305 kg.
 * Boven dwars: ceil(3900/200)+1 = 21 staven Ø10×3,1 m → 40,137 kg.
 * Acht haarspelden Ø8×0,5 m → 1,578 kg. Met 3 kg extra staal:
 * 180,945 kg per plaat, 361,890 kg totaal en 75,394 kg/m³.
 * De massa per meter volgt uit πd²/4 × 7850 kg/m³.
 *
 * Geval 2: 1,1×0,9×0,18 m + 0,0218 m³ = 0,2000 m³.
 * Vier staven Ø8×1,0 m: 4×0,394584 = 1,578336 kg en 7,89168 kg/m³.
 * Het aantal vier volgt uit ceil((900-2×50)/300)+1.
 */
import { plaatwandhoeveelheid } from "../packages/desktop/src/templates/plaatwandhoeveelheid.ts";
import { reken, toets } from "./lib/refcheck.mjs";

const invoer = (v) => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)]));
const basis = {
  n_el: 2, L_p: 4000, B_p: 3000, t_p: 200, V_extra: 0, a_rand: 50,
  d_ol: 10, s_ol: 200, l_ol: 3900,
  d_ob: 8, s_ob: 250, l_ob: 2900,
  d_bl: 12, s_bl: 150, l_bl: 4200,
  d_bb: 10, s_bb: 200, l_bb: 3100,
  n_h: 8, d_h: 8, l_h: 500, m_extra: 3,
};

let fouten = 0;
fouten += toets("Twee platen met vier netrichtingen", reken(plaatwandhoeveelheid, invoer(basis)), {
  V_el: "2.400", V_totaal: "4.800",
  n_ol: "16", n_ob: "17", n_bl: "21", n_bb: "21",
  m_ol: "38.47", m_ob: "19.45", m_bl: "78.31", m_bb: "40.14", m_h: "1.578",
  m_st_el: "180.9", m_st_totaal: "361.9", rho_w: "75.39",
});

fouten += toets("Eén plaat met afgerond aantal staven", reken(plaatwandhoeveelheid, invoer({
  ...basis, n_el: 1, L_p: 1100, B_p: 900, t_p: 180, V_extra: 0.0218,
  d_ol: 8, s_ol: 300, l_ol: 1000,
  d_ob: 0, s_ob: 0, l_ob: 0,
  d_bl: 0, s_bl: 0, l_bl: 0,
  d_bb: 0, s_bb: 0, l_bb: 0,
  n_h: 0, d_h: 0, l_h: 0, m_extra: 0,
})), {
  V_el: "0.2000", n_ol: "4", n_ob: "0", n_bl: "0", n_bb: "0",
  m_ol: "1.578", m_st_el: "1.578", m_st_totaal: "1.578", rho_w: "7.892",
});

for (const [naam, wijziging] of [
  ["zonder dikte", { t_p: 0 }],
  ["randafstand buiten plaat", { a_rand: 1500 }],
  ["onvolledige netrichting", { s_ol: 0 }],
  ["negatieve extra massa", { m_extra: -1 }],
  ["gebroken aantal elementen", { n_el: 1.5 }],
  ["gebroken aantal haarspelden", { n_h: 2.5 }],
  ["onvolledige haarspelden", { d_h: 0 }],
]) {
  const got = reken(plaatwandhoeveelheid, invoer({ ...basis, ...wijziging }));
  if ("m_st_totaal" in got.values || "rho_w" in got.values || !got.text.includes("Geen hoeveelheden berekend")) {
    console.error(`FOUT: ${naam} levert ten onrechte een hoeveelheid.`);
    fouten++;
  }
}

console.log(fouten ? `\n${fouten} fout(en).` : "\nPlaat- en wandhoeveelheden: handcontroles geslaagd.");
process.exitCode = fouten ? 1 : 0;
