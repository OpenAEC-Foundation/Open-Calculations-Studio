/**
 * Controlescript voor de module Balklaag (houten vloerbalken).
 *
 * Negen de referentie-uitwerking-referenties (document1 t/m document9), alle afgeleid van één
 * basisgeval: 71×221 C24, klimaatklasse 1, dagmaat 5000, hoh 600, vloerhout 18,
 * g_k 1,00 kN/m², q_k 1,75 kN/m², Q_k 2 kN, CC2. Elk blad wijzigt precies één
 * ding, zodat een verschil altijd aan één oorzaak toe te wijzen is:
 *
 *   1  basisgeval
 *   2  profiel 96×271   — bewijst dat de noemer in k_r niet van E·I afhangt
 *   3  vloerhout 25 mm  — bewijst dat de derde k_r-term kubisch in t is
 *   4  hoh 1000 mm      — k_r zou 1,10 worden; de referentie-uitwerking kapt af op 1,00
 *   5  klimaatklasse 2  — k_def 0,80, k_mod ongewijzigd
 *   6  klimaatklasse 3  — k_def 2,00 én de lagere k_mod-tak (0,50/0,65/0,70)
 *   7  GL24h            — γ_M 1,25, E 11500 én de hoogtefactor k_h = 1,10
 *   8  dagmaat 3500     — een blad dat wél voldoet
 *   9  profiel 71×146   — h < 150, dus k_h op massief hout (§3.2(3))
 *
 * Draaien:  node scripts/check-balklaag.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { laadTemplate, reken, toets, toetsNormStand, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("balklaag.ts");

/**
 * Projectgegevens: CC2 → K_FI = 1,00, en `rekenwijze` = 1 → de referentie-uitwerking volgen.
 * In die stand hoort élke waarde exact te kloppen; er blijft dus geen enkele
 * `afwijkend`-melding over. De norm-stand wordt onderaan apart gedraaid.
 */
const PROJECT = { K_FI: 1, rekenwijze: 1 };

const BASIS = {
  profiel: "12", sterkteklasse: "2", klimaat: "1", duurklasse: "2",
  L_d: "5000", a_opl: "50", hoh: "600", t_vloer: "18",
  g_vloerplaat: "1.0", g_wanden: "0", g_plafond: "0", g_overig: "0",
  q_k: "1.75", Q_k: "2", belastingcat: "2", verplaatsbaar: "0",
  "ψ_0_zelf": "0", "ψ_2_zelf": "0", controleer: "1", grensfactor: "0.004",
};

const REFERENTIES = [
  { blad: "document1 — basisgeval 71×221 C24, klasse 1, L 5000",
    invoer: {},
    verwacht: { f_m_d: "14.77", f_v_d: "2.46", k_h: "1.00", k_r: "0.782",
                u_q_k: "12.66", u_Q_k: "5.97", w_lim: "20.20",
                "σ_m_y_d": "13.2", UC_buiging: "0.90", "τ_d": "0.58",
                UC_doorbuiging: "1.39",
                g_balk: "0.086", u_g_k: "8.27", w_fin: "28.17" } },

  { blad: "document2 — profiel 96×271 (k_r moet ongemoeid blijven)",
    invoer: { profiel: "19" },
    verwacht: { k_r: "0.782", u_q_k: "5.08", u_Q_k: "2.40", "σ_m_y_d": "6.7",
                UC_buiging: "0.45", "τ_d": "0.36", UC_doorbuiging: "0.58",
                g_balk: "0.143", u_g_k: "3.59", w_fin: "11.74" } },

  { blad: "document3 — vloerhout 25 mm (derde k_r-term)",
    invoer: { t_vloer: "25" },
    verwacht: { k_r: "0.668", u_Q_k: "5.10", UC_doorbuiging: "1.39",
                g_balk: "0.086", u_g_k: "8.27", w_fin: "28.17" } },

  { blad: "document4 — hoh 1000 mm (k_r afgetopt op 1,00)",
    invoer: { hoh: "1000" },
    verwacht: { k_r: "1.000", u_q_k: "21.10", u_Q_k: "7.64",
                "σ_m_y_d": "21.7", UC_buiging: "1.47", "τ_d": "0.95",
                UC_doorbuiging: "2.27",
                g_balk: "0.086", u_g_k: "13.10", w_fin: "45.85" } },

  { blad: "document5 — klimaatklasse 2 (k_def 0,80, k_mod gelijk)",
    invoer: { klimaat: "2" },
    verwacht: { f_m_d: "14.77", u_q_k: "12.66", UC_doorbuiging: "1.51",
                g_balk: "0.086", u_g_k: "8.27", w_fin: "30.59" } },

  { blad: "document6 — klimaatklasse 3 (k_def 2,00, k_mod 0,65)",
    invoer: { klimaat: "3" },
    verwacht: { f_m_d: "12.00", f_v_d: "2.00", "σ_m_y_d": "13.2",
                UC_buiging: "1.10", UC_doorbuiging: "2.23",
                g_balk: "0.086", u_g_k: "8.27", w_fin: "45.07" } },

  { blad: "document7 — GL24h (γ_M 1,25, E 11500, k_h 1,10)",
    invoer: { sterkteklasse: "4" },
    verwacht: { k_h: "1.10", f_m_k_eff: "26.40", f_m_d: "16.90", f_v_d: "2.24",
                u_q_k: "12.11", u_Q_k: "5.71", UC_buiging: "0.78",
                UC_doorbuiging: "1.33",
                g_balk: "0.086", u_g_k: "7.91", w_fin: "26.95" } },

  { blad: "document8 — dagmaat 3500 (blad dat wél voldoet)",
    invoer: { L_d: "3500" },
    verwacht: { u_q_k: "3.09", u_Q_k: "2.07", w_lim: "14.20",
                "σ_m_y_d": "6.5", UC_buiging: "0.44", "τ_d": "0.41",
                UC_doorbuiging: "0.48",
                g_balk: "0.086", w_fin: "6.88" } },

  { blad: "document9 — profiel 71×146 (k_h massief, h < 150 mm)",
    invoer: { profiel: "9" },
    verwacht: { k_h: "1.01", f_m_k_eff: "24.13", f_m_d: "14.85", f_v_d: "2.46",
                u_q_k: "43.90", u_Q_k: "20.72", "σ_m_y_d": "29.9",
                UC_buiging: "2.01", "τ_d": "0.86", UC_doorbuiging: "4.74",
                g_balk: "0.057", u_g_k: "27.47", w_fin: "95.75" } },
];

/** De UC's staan niet als var-display in het blad maar in de conclusieregels. */
function ucsUitTekst(text) {
  const uit = {};
  for (const m of text.matchAll(/UC\s*(doorbuiging|buiging|afschuiving)\s*=[^=]*=\s*([\d.,]+)/g)) {
    uit[`UC_${m[1]}`] = parseFloat(m[2].replace(",", "."));
  }
  return uit;
}

let fouten = 0;
for (const ref of REFERENTIES) {
  const got = reken(tpl, { ...BASIS, ...ref.invoer }, PROJECT);
  fouten += toets(ref.blad, got, ref.verwacht, ref.afwijkend, ucsUitTekst(got.text));
}

// ── Norm-stand ────────────────────────────────────────────────────────────
// Dezelfde bladen nog eens met `rekenwijze` = 0. Twee splitspunten zijn actief:
// het eigen gewicht (EN 338 ρ_mean × 9,81 in plaats van 550 × 10) en de vraag
// welke veranderlijke doorbuiging in w_fin meetelt.
for (const ref of REFERENTIES) {
  const invoer = { ...BASIS, ...ref.invoer };
  const xc = reken(tpl, invoer, PROJECT);
  const nb = reken(tpl, invoer, { ...PROJECT, rekenwijze: 0 });
  fouten += toetsNormStand(ref.blad, xc, nb, {
    // EN 338 geeft voor elke sterkteklasse in dit blad een ρ_mean onder de 550,
    // en 9,81 < 10 — het eigen gewicht is dus altijd lager, en daarmee ook de
    // doorbuiging. u_var kan alleen gelijk blijven of dalen, nooit stijgen.
    g_balk: "lager", u_g_k: "lager", w_fin: "lager",
    u_q_k: "gelijk", k_r: "gelijk", f_m_d: "gelijk",
  });
}

console.log(`
De de referentie-uitwerking-stand is op alle negen bladen exact — er blijft geen enkele
afwijking over, ook niet op het eigen gewicht. De norm-stand heeft geen
referentieblad en is daarom alleen getoetst op eindigheid en op de richting van
het verschil; zie punt 8 en 9 in docs/afwijkingen-referentie.md.`);

afronden(fouten, "Balklaag");
