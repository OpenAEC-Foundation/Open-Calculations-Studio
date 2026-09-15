/**
 * Controlescript voor de module Spuwer (noodoverlaat).
 *
 * Acht de referentie-uitwerking-referenties, alle met afvoergebied A = 600 m².
 * Sets 1S t/m 5S bij t = 50 jaar variëren het aantal spuwers en de afmetingen;
 * 6S t/m 8S variëren de ontwerplevensduur en daarmee de regenintensiteit i_r.
 *
 * De u.c. staat niet als losse grootheid in het blad maar in de conclusieregel;
 * die wordt daarom uit de gerenderde tekst gehaald.
 *
 * Draaien:  node scripts/check-spuwer.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("spuwer.ts");

/** A = 600 m² in alle sets; de rest varieert per referentieblad. */
const BASIS = { A_afv: "600", n_sp: "3", b_sp: "600", h_sp: "80", h_nd: "50", t_ref: "50" };

const REFERENTIES = [
  { blad: "1S — n 3 · b 600 · h 80 · h_nd 50 · t 50 jaar",
    invoer: {},
    verwacht: { d_nd: "45.7", d_hw: "96", h_min: "76", d_min: "160", UC: "0.95" } },
  { blad: "2S — n 2 (minder spuwers, zelfde dak)",
    invoer: { n_sp: "2" },
    verwacht: { d_nd: "59.8", d_hw: "110", h_min: "90", d_min: "160", UC: "1.12" } },
  { blad: "3S — n 2 · b 300 (halve spuwerbreedte)",
    invoer: { n_sp: "2", b_sp: "300" },
    verwacht: { d_nd: "95.0", d_hw: "145", h_min: "125", d_min: "80", UC: "1.56" } },
  { blad: "4S — n 2 · h 100 (hogere spuwer)",
    invoer: { n_sp: "2", h_sp: "100" },
    verwacht: { d_nd: "59.8", d_hw: "110", h_min: "90", d_min: "160", UC: "0.90" } },
  { blad: "5S — n 2 · h_nd 30 (lagere drempel)",
    invoer: { n_sp: "2", h_nd: "30" },
    verwacht: { d_nd: "59.8", d_hw: "90", h_min: "90", d_min: "160", UC: "1.12" } },

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
  const got = reken(tpl, { ...BASIS, ...ref.invoer });
  // De u.c. staat in de conclusieregel: "u.c. = 0.9459 ≤ 1.0 → Spuwer voldoet".
  const m = got.text.match(/u\.c\.\s*=\s*([\d.]+)/);
  const afgeleid = m ? { UC: parseFloat(m[1]) } : {};
  fouten += toets(ref.blad, got, ref.verwacht, {}, afgeleid);
}

afronden(fouten, "Spuwer");
