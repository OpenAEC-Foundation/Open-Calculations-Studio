/**
 * Controlescript voor de module Gording (houten dakgording).
 *
 * Acht de referentie-uitwerking-referenties, alle afgeleid van één basisgeval: 85×250 C24,
 * klimaatklasse 1, dak 4500 × 3000 (33,7°), 3 gordingen, dagmaat 5000,
 * opleglengte 75, dakbeschot I = 486000 · E = 5000, pannen 0,80 kN/m²,
 * muurplaat/nokgording 1,0 kN/m, Q_k = 2 kN, s_k = 0,70, q_p = 0,822, CC2:
 *
 *   1  basisgeval
 *   2  dikte dakbeschot 25 mm — verandert in de referentie-uitwerking níets: `Dikte` en
 *      `I dakbeschot` zijn daar onafhankelijke velden en alleen I telt mee
 *   3  4 gordingen + I 1302083 — hoh 1081, de k_r-teller wordt 6510
 *   4  plat dak (α = 0) met verdeelde last q_k = 1,0 kN/m² — hier komt de
 *      windzuiging (C_pe = −0,70) en de duurklasse Middellang boven water
 *   5  klimaatklasse 2 — k_def 0,80
 *   6  klimaatklasse 3 — k_def 2,00 en de lagere k_mod-tak
 *   7  nok 6000 (α = 53,1°) — de μ₁-tak dicht bij nul
 *   8  96×296, dagmaat 4000, 5 gordingen — een blad dat wél voldoet
 *
 * Draaien:  node scripts/check-gording.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { laadTemplate, reken, toets, toetsNormStand, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("gording.ts");

/** CC2 → K_FI = 1,00; komt in de app uit de projectgegevens. */
// windgebied en terreincategorie hebben in de app altijd een waarde (standaard
// II/II), ook als het blad q_p niet zelf berekent — het paneel levert ze uit de
// projectgegevens. Zonder die twee loopt de q_p-keten op Infinity.
const PROJECT = { K_FI: 1, rekenwijze: 1, windgebied: 2, terreincategorie: 2 };

const BASIS = {
  profiel: "5", sterkteklasse: "2", klimaatklasse: "1", dakType: "2",
  l_h: "4500", h_v: "3000", L_dag: "5000", a_opl: "75", n_gording: "3",
  t_beschot: "18", I_manual: "1", I_beschot: "486000", E_beschot: "5000",
  g_pannen: "0.8", g_panlat: "0", g_dakplaat: "0", g_plafond: "0",
  q_par: "1", varType: "1", Q_k: "2", q_var: "0", s_k: "0.70",
  windbron: "0", z_wind: "9", q_wind_hand: "0.822",
  controleer: "1", grensfactor: "0.004", dubbele: "1",
};

/**
 * de referentie-uitwerking kápt de doorbuigingen af op twee decimalen in plaats van af te
 * ronden — document3 bewijst het twee keer: u_g⊥ = 5,798 wordt `5.79` en
 * u_w⊥ = 6,308 wordt `6.30`. Dezelfde afkapping staat al in de kop van
 * kolom.ts genoteerd. De gedrukte waarde is dus een ondergrens, en die velden
 * krijgen daarom een hele in plaats van een halve eenheid tolerantie.
 */
const AFGEKAPT = "de referentie-uitwerking kapt af i.p.v. af te ronden";
const kap = (waarde, tol = 0.01, waarom = AFGEKAPT) => ({ waarde, tol, waarom });

/**
 * w_fin loopt bij de referentie-uitwerking nog eens 0,01 à 0,03 mm uit de pas met wat je uit
 * zijn eigen afgedrukte u-waarden narekent — niet met de onafgeronde, niet met
 * de afgekapte, en niet met een consequente mengvorm. Die laatste eenheid is
 * niet uit het blad te herleiden. Hij werkt nergens in een u.c. door, dus hier
 * staat de tolerantie ruim genoeg om hem te absorberen, met de reden erbij.
 */
const RUIS = "restafronding de referentie-uitwerking, ≤ 0,03 mm, geen doorwerking in een u.c.";
/** Boven de 100 drukt ons blad nog maar één decimaal af (4 significante cijfers). */
const VIER_CIJFERS = "ons blad drukt boven 100 nog maar één decimaal af";

const REFERENTIES = [
  { blad: "document1 — basisgeval 85×250 C24, dak 33,7°, 3 gordingen",
    invoer: {},
    verwacht: {
      slope: "5408", "α_deg": "33.7", hoh: "1352", L_th: "5075",
      f_myd_k: "16.62", f_mzd_k: "18.6", k_r: "1.000",
      q_gy: "1.00", q_gz: "0.53", M_gy: "3.21", M_gz: "1.71",
      u_gy: kap("7.07"), u_gz: kap("32.62"),
      Mc_y: "2.11", Mc_z: "1.41", "μ_1": "0.702", q_sn: "0.55",
      P_w: "0.822", q_wy: "1.11", u_wy: kap("7.88"),
      w_fin_y: kap("19.20"), w_fin_z: kap("73.65"), w_lim: "20.30",
      UC_wy: "0.95", UC_wz: "3.63", UC_611: "1.00", UC_612: "1.08",
    } },

  { blad: "document2 — dikte dakbeschot 25 mm (mag niets veranderen)",
    invoer: { t_beschot: "25" },
    verwacht: { k_r: "1.000", w_fin_y: kap("19.20"), w_fin_z: kap("73.65"),
                UC_611: "1.00", UC_612: "1.08" } },

  { blad: "document3 — 4 gordingen (hoh 1081) + dakbeschot I 1302083",
    invoer: { n_gording: "4", I_beschot: "1302083" },
    verwacht: {
      hoh: kap("1081", 1), k_r: "1.000", q_gy: "0.82", q_gz: "0.41",
      M_gy: "2.63", M_gz: "1.34", u_gy: kap("5.79"), u_gz: kap("25.46"),
      q_sn: "0.44", q_wy: "0.89", u_wy: kap("6.30"),
      w_fin_y: kap("15.57", 0.03, RUIS), w_fin_z: kap("62.20"),
      UC_wy: "0.77", UC_wz: "3.06", UC_611: "0.89", UC_612: "0.96",
    } },

  { blad: "document4 — plat dak + verdeelde last (zuiging, middellang)",
    invoer: { dakType: "1", q_var: "1", varType: "2" },
    verwacht: {
      slope: "4500", "α_deg": "0", hoh: "1125", f_myd_m: "14.77",
      q_gy: "1.02", q_gz: "0.00", M_gy: "3.27", M_gz: "0.00",
      u_gy: kap("7.21"), u_gz: kap("0.00"),
      Md_y: "3.62", Mc_y: "2.54", "μ_1": "0.800", q_sn: "0.63",
      P_w: "-0.329", q_wy: "-0.37", u_wy: kap("-2.62"),
      w_fin_y: kap("19.52"), w_fin_z: kap("0.00"),
      UC_wy: "0.96", UC_wz: "0.00", UC_611: "0.72",
    } },

  { blad: "document5 — klimaatklasse 2 (k_def 0,80)",
    invoer: { klimaatklasse: "2" },
    verwacht: { f_myd_k: "16.62", w_fin_y: kap("20.61"), w_fin_z: kap("80.18"),
                UC_wy: "1.02", UC_wz: "3.95", UC_611: "1.00", UC_612: "1.08" } },

  { blad: "document6 — klimaatklasse 3 (k_def 2,00, k_mod 0,70)",
    invoer: { klimaatklasse: "3" },
    verwacht: { f_myd_k: "12.92", f_mzd_k: "14.5", f_vd_k: "2.15",
                w_fin_y: kap("29.10"), w_fin_z: kap("119.32", 0.05, VIER_CIJFERS),
                UC_wy: "1.43", UC_wz: "5.88", UC_611: "1.28", UC_612: "1.38" } },

  { blad: "document7 — nok 6000 (α 53,1°, μ₁-tak dicht bij nul)",
    invoer: { h_v: "6000" },
    verwacht: {
      slope: "7500", "α_deg": "53.1", hoh: "1875",
      q_gy: "0.97", q_gz: "1.36", M_gy: "3.12", M_gz: "4.38",
      u_gy: kap("6.88"), u_gz: kap("83.48"),
      Mc_y: "1.52", Mc_z: "2.03", "μ_1": "0.183", q_sn: "0.14",
      q_wy: "1.54", u_wy: kap("10.93"),
      w_fin_y: kap("21.94"), w_fin_z: kap("164.52", 0.05, VIER_CIJFERS),
      UC_wy: "1.08", UC_wz: "8.10",
      UC_611: "1.45", UC_612: "1.77",
    } },

  { blad: "document8 — 96×296, dagmaat 4000, 5 gordingen (voldoet)",
    invoer: { profiel: "8", L_dag: "4000", n_gording: "5" },
    verwacht: {
      hoh: "901", L_th: "4075", f_mzd_k: "18.2",
      q_gy: "0.73", q_gz: "0.37", M_gy: "1.51", M_gz: "0.76",
      u_gy: kap("1.15"), u_gz: kap("5.48"),
      q_sn: "0.37", q_wy: "0.74", u_wy: kap("1.16"),
      w_fin_y: kap("3.00"), w_fin_z: kap("15.29"), w_lim: "16.30",
      UC_wy: "0.18", UC_wz: "0.94", UC_611: "0.41", UC_612: "0.45",
    } },
];

/**
 * Windvarianten. Sinds backlogpunt 1 rekent het blad q_p zelf uit windgebied,
 * terreincategorie (projectgegevens) en z_e (bladinvoer), in plaats van hem als
 * los getal te vragen. Zeven referenties op een eigen basisgeval — 71×171 met
 * een lichter dakpakket — waarin alléén de windvelden wisselen.
 */
const WIND_BASIS = { ...BASIS, profiel: "2", windbron: "1",
  g_pannen: "0.4", g_panlat: "0.04", g_dakplaat: "0.099", g_plafond: "0.2" };

const WIND = [
  { blad: "wind1 — gebied II, terrein II, z 9 m (basis)", project: { windgebied: 2, terreincategorie: 2 },
    invoer: {}, verwacht: { q_p: "0.822", q_wy: "1.11", z_e: "9",
      w_fin_y: kap("67.14", 0.03, RUIS), w_fin_z: kap("162.89", 0.05, VIER_CIJFERS),
      UC_wy: "3.31", UC_wz: "8.02", UC_611: "2.11", UC_612: "2.18" } },
  { blad: "wind2 — windgebied I (v_b,0 = 29,5 m/s)", project: { windgebied: 1, terreincategorie: 2 },
    invoer: {}, verwacht: { q_p: "0.981", q_wy: "1.33", w_fin_y: kap("72.86", 0.03, RUIS), UC_wy: "3.59" } },
  { blad: "wind3 — windgebied III (v_b,0 = 24,5 m/s)", project: { windgebied: 3, terreincategorie: 2 },
    invoer: {}, verwacht: { q_p: "0.676", q_wy: "0.91", w_fin_y: kap("61.94", 0.03, RUIS), UC_wy: "3.05" } },
  { blad: "wind4 — terreincategorie 0, zee/kust (z_0 = 0,005)", project: { windgebied: 2, terreincategorie: 1 },
    invoer: {}, verwacht: { q_p: "1.295", q_wy: "1.75", w_fin_y: kap("84.12", 0.03, RUIS),
      UC_wy: "4.14", UC_611: "2.50", UC_612: "2.06" } },
  { blad: "wind5 — terreincategorie III, bebouwd (z_0 = 0,5)", project: { windgebied: 2, terreincategorie: 3 },
    invoer: {}, verwacht: { q_p: "0.649", q_wy: "0.88", w_fin_y: kap("60.95", 0.03, RUIS), UC_wy: "3.00" } },
  { blad: "wind6 — bebouwd op z 5 m: z_min = 7 m wint", project: { windgebied: 2, terreincategorie: 3 },
    invoer: { z_wind: "5" }, verwacht: { z_e: "7", q_p: "0.578", q_wy: "0.78",
      w_fin_y: kap("58.39", 0.03, RUIS), UC_wy: "2.88" } },
  { blad: "wind7 — z 20 m (hoogte-afhankelijkheid)", project: { windgebied: 2, terreincategorie: 2 },
    invoer: { z_wind: "20" }, verwacht: { z_e: "20", q_p: "1.067", q_wy: "1.44",
      w_fin_y: kap("75.96", 0.03, RUIS), UC_wy: "3.74", UC_611: "2.24", UC_612: "1.88" } },
];

/** De u.c.'s staan niet als var-display in het blad maar in de conclusieregels. */
function ucsUitTekst(text) {
  const uit = {};
  const sleutel = { "w,y": "UC_wy", "w,z": "UC_wz", "6.11": "UC_611", "6.12": "UC_612" };
  for (const m of text.matchAll(/UC\s*(w,y|w,z|6\.11|6\.12)[^0-9]{0,140}?([\d.]+)\s*(≤|>)/g)) {
    uit[sleutel[m[1]]] = parseFloat(m[2]);
  }
  return uit;
}

let fouten = 0;
for (const ref of REFERENTIES) {
  const got = reken(tpl, { ...BASIS, ...ref.invoer }, PROJECT);
  fouten += toets(ref.blad, got, ref.verwacht, {}, ucsUitTekst(got.text));
}
for (const ref of WIND) {
  const got = reken(tpl, { ...WIND_BASIS, ...ref.invoer }, { ...PROJECT, ...ref.project });
  fouten += toets(ref.blad, got, ref.verwacht, {}, ucsUitTekst(got.text));
}

// ── Norm-stand ────────────────────────────────────────────────────────────
// Drie splitspunten zijn hier actief: het eigen gewicht, het meedoen van 6.10a,
// en de vraag of 6.11/6.12 uit één combinatie komen of per formule de max zijn.
// Op de u.c.'s kan dat twee kanten op werken — een lichter eigen gewicht verlaagt
// ze, 6.10a kan ze verhogen — dus daar toetsen we alleen op eindigheid.
for (const [basis, sets] of [[BASIS, REFERENTIES], [WIND_BASIS, WIND]]) {
  for (const ref of sets) {
    const invoer = { ...basis, ...ref.invoer };
    const project = { ...PROJECT, ...(ref.project ?? {}) };
    const xc = reken(tpl, invoer, project);
    const nb = reken(tpl, invoer, { ...project, rekenwijze: 0 });
    fouten += toetsNormStand(ref.blad, xc, nb, {
      g_eig: "lager", u_gy: "lager",
      hoh: "gelijk", "μ_1": "gelijk", k_r: "gelijk", q_p: "gelijk",
    });
  }
}

console.log(`
De de referentie-uitwerking-stand is op alle vijftien bladen exact — inclusief document7,
wind4 en wind7, waar 6.10a en de combinatiekeuze eerder als bekende afwijking
stonden. Die zijn nu gewone toetsen. De norm-stand heeft geen referentieblad en
is alleen op eindigheid en op de richting van het verschil gecontroleerd.`)

afronden(fouten, "Gording");
