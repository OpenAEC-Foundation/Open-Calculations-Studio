/**
 * Controlescript voor de module Kruipfactor φ(t;t₀).
 *
 * Zes referentieberekeningen, alle bij t₀ = 28 d en h₀ = 300 mm. Het blad
 * rapporteert φ(t;t₀) bij t = 100000 dagen — niet φ₀; dat scheelt 1,62 tegen
 * 1,61.
 *
 * Twee gedocumenteerde afwijkingen (register §1 en §2) zijn een splitspunt op
 * β(t₀) en β_H. De referentiestand (`rekenwijze` = 1) hoort het referentieblad
 * exact te geven; de norm-stand (`rekenwijze` = 0) de waarde van bijlage B:
 *   §1  De referentie-uitwerking rekent de cementcorrectie (B.9) uit maar vult in (B.5) toch
 *       de onbewerkte t₀ = 28 in. Cementklasse heeft daar dus géén effect:
 *       N, R en S geven alle drie 1,61. Volgens de norm: R → 1,57,
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
    verwacht: { "φ_RH": "1.229", "φ_0": "1.385", "β_H": "653", "φ_t": "1.382" },
    // β_H = 1,5·(1 + 0,84^18)·300 + 250·0,8126 = 469,5 + 203,2 = 672,7
    norm: { "β_H": "673", "φ_t": "1.382" } },

  { blad: "document2A — C45/55 · R · RH 50 (afwijking §1: cementcorrectie)",
    invoer: { cementklasse: R },
    verwacht: { "φ_t": "1.61" },
    norm: { "φ_t": { waarde: "1.57", tol: 0.005, waarom: "norm — cementklasse R werkt door via (B.5)" } } },

  { blad: "document4A — C45/55 · S · RH 50 (afwijking §1: cementcorrectie)",
    invoer: { cementklasse: S },
    verwacht: { "φ_t": "1.61" },
    norm: { "φ_t": { waarde: "1.66", tol: 0.005, waarom: "norm — cementklasse S werkt door via (B.5)" } },
    // In de referentiestand meldt het blad dat bijlage B een hogere φ geeft.
    melding: true },
];

let fouten = 0;
for (const ref of REFERENTIES) {
  const invoer = { ...BASIS, ...ref.invoer };
  const got = reken(tpl, invoer, PROJECT);
  fouten += toets(ref.blad, got, ref.verwacht, {});

  // Elke afgedrukte regel moet rekenkundig kloppen: φ_t = φ_0·β_c in beide standen.
  for (const [stand, uit] of [["referentie", got], ["norm", reken(tpl, invoer, { ...PROJECT, rekenwijze: 0 })]]) {
    const v = uit.values;
    const ok = Math.abs(v["φ_t"] - v["φ_0"] * v["β_c"]) < 1e-3 && Math.abs(v["φ_0"] - v["φ_RH"] * v["β_fcm"] * v["β_t0"]) < 1e-3;
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} ${stand}stand: φ_0 = φ_RH·β_fcm·β_t0 en φ_t = φ_0·β_c`);
    if (stand === "norm" && ref.norm) fouten += toets(`${ref.blad} — norm-stand`, uit, ref.norm, {});
  }

  const meldt = /volgens bijlage B is/.test(got.text);
  const meldingOk = meldt === (ref.melding === true);
  if (!meldingOk) fouten++;
  console.log(`  ${meldingOk ? "OK    " : "FOUT  "} melding 'volgens bijlage B hoger': ${meldt ? "ja" : "nee"}`);
}

afronden(fouten, "Kruipfactor");
