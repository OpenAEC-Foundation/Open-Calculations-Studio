/**
 * Controlescript voor de normbladen EN 1996-1-1 (templates/en1996.ts).
 *
 * De normbladen hebben geen eigen referentieblad. Wand op druk rekent op een
 * strook van 1 m en valt daarmee samen met de wandmodule bij ℓ = 1000 mm; de
 * referentiesets van die module (metselwerkwand-1 t/m -10, zie
 * check-metselwerkwand.mjs) gelden dus ook hier, op de sets na die de
 * lage-belastingstak of een verticale randsteuning nodig hebben. Druksterkte,
 * afschuiving en slankheid worden met de hand nagerekend.
 *
 * De bladen dragen hun invoer als voorbeeldwaarden in de tekst; dit script
 * vervangt die regels per set.
 *
 * Draaien:  node scripts/check-en1996.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { reken, toets, afronden } from "./lib/refcheck.mjs";

const hier = dirname(fileURLToPath(import.meta.url));
const code = readFileSync(join(hier, "../packages/desktop/src/templates/en1996.ts"), "utf8");
const bladen = await import("data:text/javascript;base64," + Buffer.from(code, "utf8").toString("base64"));
const PROJECT = { CC: 2, K_FI: 1, rekenwijze: 1 };

/** Zet voorbeeldwaarden in de bladtekst: `{ M_1Ed: "5*kN*m" }`. */
function met(tpl, waarden) {
  let uit = tpl;
  for (const [naam, waarde] of Object.entries(waarden)) {
    const regel = new RegExp(`^(${naam} = )[^'\\n]+`, "m");
    if (!regel.test(uit)) throw new Error(`geen invoerregel ${naam} in het blad`);
    uit = uit.replace(regel, `$1${waarde}`);
  }
  return uit;
}

/** Het blad toont vier cijfers: 151,07 staat er als 151,1. */
const VIER_CIJFERS = (waarde) => ({ waarde, tol: 0.05, waarom: "het blad toont vier cijfers" });

let fouten = 0;

// ── Druksterkte ──────────────────────────────────────────────────────────
// Groep 1 met metselmortel: K = 0,6, α = 0,65, β = 0,25 (tabel NB-2), dus
// baksteen <25 % met f_b = 12 en M15 geeft dezelfde 5,94 als kalkzandsteen in
// metselwerkwand-1. Baksteen fb 18 met lijmmortel L12,5: 9,00 (metselwerkwand-8).
{
  const tpl = bladen.en1996Druksterkte;
  fouten += toets("druksterkte — groep 1, f_b = 12, M15", reken(tpl, {}, PROJECT),
    { f_k: "5.94", f_d: "3.49" });
  fouten += toets("druksterkte — baksteen fb 18, lijmmortel L12,5",
    reken(met(tpl, { f_b: "18", f_m: "12.5" }), { morteltype: "2" }, PROJECT),
    { f_k: "9.00", f_d: "5.29" });
  // f_m ≤ 2·f_b bij metselmortel: fb 5 met M15 rekent met f_m = 10.
  fouten += toets("druksterkte — fb 5 met M15, f_m begrensd op 2·f_b",
    reken(met(tpl, { f_b: "5" }), {}, PROJECT),
    { f_meff: "10", f_k: "3.04" });
}

// ── Wand op druk ─────────────────────────────────────────────────────────
{
  const tpl = bladen.en1996Drukwand;
  const SETS = [
    { naam: "metselwerkwand-1 — alle momenten nul", invoer: {},
      verwacht: { f_k: "5.94", Phi_it: "0.900", Phi_ib: "0.900", Phi_m: "0.605", UC_1: "0.79",
                  Phi_m2: "0.360", N_Rdm2: VIER_CIJFERS("151.07"), UC_2: "1.32" } },
    { naam: "metselwerkwand-2 — M_1Ed = 5 kNm", invoer: { M_1Ed: "5*kN*m" },
      verwacht: { Phi_it: "0.506", N_Rdt: VIER_CIJFERS("211.91"), UC_1: "0.94" } },
    { naam: "metselwerkwand-3 — M_mEd = 5 kNm", invoer: { M_mEd: "5*kN*m" },
      verwacht: { e_mk: "29.7", Phi_m: "0.201", UC_1: "2.37" } },
    { naam: "metselwerkwand-4 — N = 300, M = 7/5/3", invoer: { N_Ed: "300*kN", M_1Ed: "7*kN*m", M_mEd: "5*kN*m", M_2Ed: "3*kN*m" },
      verwacht: { Phi_it: "0.533", Phi_ib: "0.756", Phi_m: "0.334", UC_1: "2.14" } },
    { naam: "metselwerkwand-5 — M_mEd = 1 kNm", invoer: { M_mEd: "1*kN*m" },
      verwacht: { e_m: "9.7", Phi_m: "0.539", N_Rdm: VIER_CIJFERS("225.77"), UC_1: "0.89" } },
    { naam: "metselwerkwand-6 — N_Ed = 30 kN", invoer: { N_Ed: "30*kN" },
      verwacht: { UC_1: "0.12" } },
    { naam: "metselwerkwand-8 — baksteen fb 18, lijmmortel L12,5", invoer: { f_b: "18", f_m: "12.5" },
      selects: { morteltype: "2" },
      verwacht: { f_k: "9.00", f_d: "5.29", UC_1: "0.52", UC_2: "0.87" } },
    { naam: "metselwerkwand-9 — CC3, M5", invoer: { f_m: "5" }, project: { CC: 3 },
      verwacht: { f_k: "4.51", gam_M: "1.70", UC_1: "1.04" } },
    { naam: "metselwerkwand-10 — M = 10/5/7, e_t > 0,25·t", invoer: { M_1Ed: "10*kN*m", M_mEd: "5*kN*m", M_2Ed: "7*kN*m" },
      verwacht: { rho_2: "1.00", h_ef: "2800", Phi_it: "0.063", Phi_ib: "0.313", Phi_m: "0.075",
                  N_Rd: "26.39", UC_1: "7.58" } },
    // Buiten de referenties: de resultante buiten de doorsnede geeft Φ = 0 en
    // N_Rd = 0; het oordeel volgt uit de slotzin hieronder.
    { naam: "resultante buiten de doorsnede — M_1Ed = 20 kNm", invoer: { M_1Ed: "20*kN*m" },
      verwacht: { Phi_it: "0", N_Rd: "0" }, oordeel: "voldoet niet" },
    { naam: "betonvloer aan één zijde met een kortere oplegging", invoer: {}, selects: { ondersteuning: "4" },
      verwacht: { rho_2: "1.00", h_ef: "2800" } },
  ];
  for (const s of SETS) {
    const got = reken(met(tpl, s.invoer), s.selects ?? {}, { ...PROJECT, ...s.project });
    fouten += toets(`wand op druk: ${s.naam}`, got, s.verwacht);
    if (s.oordeel) {
      const i = got.text.lastIndexOf("Maatgevende UC");
      const zin = i < 0 ? "" : got.text.slice(i, i + 120);
      const ok = zin.includes("∞") && zin.includes(s.oordeel);
      if (!ok) fouten++;
      console.log(`  ${ok ? "OK    " : "FOUT  "} slotzin   ${zin.slice(0, 70) || "(geen)"}`);
    }
  }
}

// ── Afschuiving ──────────────────────────────────────────────────────────
// σ_d = 80 kN / (100 × 3000 mm²) = 0,267; f_vk = 0,20 + 0,4 × 0,267 = 0,307
// ≤ 0,065 × 12 = 0,78; f_vd = 0,307 / 1,7 = 0,180; V_Rd = 0,180 × 100 × 3000 = 54,1 kN.
{
  const tpl = bladen.en1996Afschuiving;
  fouten += toets("afschuiving — gevulde stootvoegen", reken(tpl, {}, PROJECT),
    { sig_d: "0.267", f_vk: "0.307", f_vd: "0.180", V_Rd: "54.1", UC_max: "0.277" });
  // Ongevulde stootvoegen (3.6): 0,5 × 0,20 + 0,107 = 0,207.
  fouten += toets("afschuiving — ongevulde stootvoegen", reken(tpl, { stootvoegen: "2" }, PROJECT),
    { f_vk: "0.207" });
  // Bovengrens: f_b = 4 → f_vlt = 0,26 < 0,307. Eerder werd die grens alleen gemeld.
  fouten += toets("afschuiving — f_vk begrensd op 0,065·f_b", reken(met(tpl, { f_b: "4" }), {}, PROJECT),
    { f_vlt: "0.26", f_vk: "0.26" });
}

// ── Slankheid ────────────────────────────────────────────────────────────
// h = 2700, t = 100: n = 2 → h_ef = 0,75 × 2700 = 2025, λ = 20,25.
// n = 4 met L_v = 2000 < 30·t: h > 1,15·L_v → ρ_4 = 0,5 × 2000/2700 (5.9) → h_ef = 1000.
// n = 3 met L_v = 4000 ≥ 15·t = 1500: terug naar n = 2.
{
  const tpl = bladen.en1996Slankheid;
  fouten += toets("slankheid — n = 2, betonvloer", reken(tpl, {}, PROJECT),
    { h_ef: "2025", lam: "20.25", UC_max: "0.75" });
  fouten += toets("slankheid — n = 4, L_v = 2000", reken(met(tpl, { L_v: "2000*mm" }), { n_rand: "4" }, PROJECT),
    { n_eff: "4", h_ef: "1000", lam: "10.0" });
  fouten += toets("slankheid — n = 3 met L_v ≥ 15·t valt terug op n = 2", reken(tpl, { n_rand: "3" }, PROJECT),
    { n_eff: "2", h_ef: "2025" });
  fouten += toets("slankheid — houten vloer", reken(tpl, { ondersteuning: "3" }, PROJECT),
    { rho_2: "1.00", h_ef: "2700", UC_max: "1.00" });
}

afronden(fouten, "Normbladen EN 1996-1-1");
