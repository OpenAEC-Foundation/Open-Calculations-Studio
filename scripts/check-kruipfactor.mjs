/**
 * Controlescript voor de module Kruipfactor φ(t;t₀).
 *
 * Zes de referentie-uitwerking-referenties, alle bij t₀ = 28 d en h₀ = 300 mm. Het blad
 * rapporteert φ(t;t₀) bij t = 100000 dagen — niet φ₀; dat scheelt 1,62 tegen
 * 1,61 en was in een eerdere sessie de grootste valkuil.
 *
 * Twee gedocumenteerde afwijkingen (register §1 en §2) staan hier als
 * `afwijkend` en tellen niet als fout:
 *   §1  De referentie-uitwerking rekent de cementcorrectie (B.9) uit maar vult in (B.5) toch
 *       de onbewerkte t₀ = 28 in. Cementklasse heeft daar dus géén effect:
 *       N, R en S geven alle drie 1,61. Dit blad volgt de norm: R → 1,57,
 *       S → 1,66.
 *   §2  Bij de referentie-uitwerking is β_H onafhankelijk van RH. Bij RH 70 staat er 653
 *       waar de norm 673 vraagt. Bij t = 100000 verandert dat het eindresultaat
 *       niet — vandaar dat φ_t bij RH 70 in beide gevallen 1,382 is.
 *
 * Draaien:  node scripts/check-kruipfactor.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { laadTemplate, reken, toets, afronden } from "./lib/refcheck.mjs";

const tpl = laadTemplate("kruipfactor.ts");

/** Keuzewaarden: cementklasse 1 = S, 2 = N, 3 = R. */
const S = "1", N = "2", R = "3";

const BASIS = { betonkwaliteit: "45", cementklasse: N, RH: "50", t_0: "28", h_0: "300", t: "100000" };

/** `rekenwijze` = 1 → de referentie-uitwerking volgen; dan hoort élke waarde exact te kloppen. */
const PROJECT = { rekenwijze: 1 };

const REFERENTIES = [
  { blad: "document1A — C45/55 · N · RH 50",
    invoer: {},
    verwacht: {
      "φ_RH": "1.434", "β_fcm": "2.308", "β_t0": "0.488",
      "φ_0": "1.617", "β_H": "653", "β_c": "0.998", "φ_t": "1.614",
    } },

  { blad: "document3A — C20/25 · N · RH 50 (andere tak: f_cm ≤ 35 → B.3a/B.8a)",
    invoer: { betonkwaliteit: "20" },
    verwacht: { "φ_RH": "1.747", "β_fcm": "3.175", "φ_0": "2.709", "β_H": "700", "φ_t": "2.703" } },

  { blad: "document5A — C45/55 · N · RH 30",
    invoer: { RH: "30" },
    verwacht: { "φ_RH": "1.640", "φ_0": "1.849", "β_H": "653", "φ_t": "1.845" } },

  { blad: "document6A — C45/55 · N · RH 70",
    invoer: { RH: "70" },
    // β_H is hier het strijdpunt: de norm rekent (0,012·RH)^18 mee, de referentie-uitwerking
    // niet. Op het eindresultaat maakt dat bij t = 100000 niets uit.
    verwacht: { "φ_RH": "1.229", "φ_0": "1.385", "φ_t_nb": "1.382", "β_H_XC": "653" } },

  { blad: "document2A — C45/55 · R · RH 50 (afwijking §1: cementcorrectie)",
    invoer: { cementklasse: R },
    verwacht: { "φ_t_nb": { waarde: "1.57", tol: 0.005, waarom: "norm — cementklasse R werkt door via (B.5)" },
                "φ_t": "1.61" } },

  { blad: "document4A — C45/55 · S · RH 50 (afwijking §1: cementcorrectie)",
    invoer: { cementklasse: S },
    verwacht: { "φ_t_nb": { waarde: "1.66", tol: 0.005, waarom: "norm — cementklasse S werkt door via (B.5)" },
                "φ_t": "1.61" } },
];

let fouten = 0;
for (const ref of REFERENTIES) {
  const got = reken(tpl, { ...BASIS, ...ref.invoer }, PROJECT);
  fouten += toets(ref.blad, got, ref.verwacht, {});
}

afronden(fouten, "Kruipfactor");
