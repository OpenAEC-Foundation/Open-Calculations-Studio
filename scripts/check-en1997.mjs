/**
 * Controlescript voor de normbladen NEN 9997-1 in en1997.ts.
 *
 * Voor deze bladen bestaat geen referentieberekening. Het script rekent ze
 * op twee manieren na:
 *
 *   1. Een onafhankelijke uitwerking in JavaScript (eenheden kN, m, kPa):
 *      funderingsstrook met bijlage D en de factoren van tabel A.4a (γ_φ' op
 *      tan φ', γ_γ op het volumiek gewicht), zakking met de 1:2-spreiding en
 *      de invloedsfactor, glijding met δ_d uit φ'_cv;d en de ongedraineerde
 *      toets (6.4a) met de grens (6.5).
 *   2. Voor het standaardgeval de getallen van een handberekening.
 *
 * Het blad "§7 Paaldraagvermogen" rekent niet zelf; hier alleen de controle
 * dat het naar de module Paaldraagvermogen verwijst en geen UC geeft.
 *
 * Draaien:  node scripts/check-en1997.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { reken, toets, afronden } from "./lib/refcheck.mjs";

const BESTAND = join(dirname(fileURLToPath(import.meta.url)), "../packages/desktop/src/templates/en1997.ts");

/** Eén blad uit en1997.ts; regeleinden zoals een template-literal ze geeft. */
function blad(naam) {
  const src = readFileSync(BESTAND, "utf8").replace(/\r\n/g, "\n");
  const m = src.match(new RegExp(`export const ${naam} = \`([\\s\\S]*?)\`;`));
  if (!m) throw new Error(`blad ${naam} niet gevonden`);
  return m[1];
}

const graden = (x) => (x * Math.PI) / 180;
const s4 = (x) => {
  if (x === 0) return "0";
  const dec = Math.max(0, 3 - Math.floor(Math.log10(Math.abs(x))));
  return x.toFixed(dec);
};
const ruim = (x) => ({ waarde: s4(x), tol: Math.max(Math.abs(x) * 0.002, 1e-6) });
const alsTekst = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)]));

let fouten = 0;

// ── Funderingsstrook ─────────────────────────────────────────────────────────
const strook = blad("en1997Funderingsstrook");

function strookNa(grondwater) {
  const phi = Math.atan(Math.tan(graden(25)) / 1.15);
  const Nq = Math.exp(Math.PI * Math.tan(phi)) * Math.tan(Math.PI / 4 + phi / 2) ** 2;
  const Ng = 2 * (Nq - 1) * Math.tan(phi);
  const [boven, onder] = grondwater === 1 ? [18, 18] : grondwater === 2 ? [18, 10] : [10, 10];
  const q = (boven * 0.8) / 1.1, g = onder / 1.1;
  const Rd = (q * Nq + 0.5 * g * 0.6 * Ng) * 0.6;
  return { phi_d_deg: ruim((phi * 180) / Math.PI), N_q: ruim(Nq), N_gamma: ruim(Ng), q_eff: ruim(q), gamma_eff: ruim(g), R_d: ruim(Rd), UC: ruim(80 / Rd) };
}

for (const grondwater of [1, 2, 3]) {
  const got = reken(strook, alsTekst({ grondwater }));
  fouten += toets(`Funderingsstrook, grondwater keuze ${grondwater} — narekening`, got, strookNa(grondwater));
}
// Met de hand, standaard: φ_d = atan(tan 25°/1,15) = 22,07°; N_q = 7,88; N_γ = 5,58;
// q = 18·0,8/1,1 = 13,09 kPa; γ = 18/1,1 = 16,36 kN/m³;
// σ = 13,09·7,88 + 0,5·16,36·0,6·5,58 = 103,1 + 27,4 = 130,5 kPa; R_d = 130,5·0,6 = 78,3 kN/m;
// UC = 80/78,3 = 1,02.
fouten += toets("Funderingsstrook, standaard — handberekening", reken(strook, {}), {
  phi_d_deg: "22.07", q_eff: "13.09", R_over_A: "130.5", R_d: "78.3", UC: "1.02",
});
// De factoren van tabel A.4a hangen voor funderingen op staal niet af van de gevolgklasse.
for (const CC of [1, 3]) {
  fouten += toets(`Funderingsstrook, CC${CC} — gelijk aan CC2`, reken(strook, {}, { CC }), { R_d: "78.3" });
}

// ── Zakking ──────────────────────────────────────────────────────────────────
const zetting = blad("en1997Zetting");
// Met de hand: σ_gem = 100/((1 + 1,5)·(1 + 1,5)) = 16 kPa; s = 16·3/10 000 = 0,0048 m = 4,8 mm;
// UC = 4,8/25 = 0,192. Invloedsfactor: s = 100·1,0·0,85/10 000 = 0,0085 m = 8,5 mm.
fouten += toets("Zakking, 1:2-spreiding — handberekening", reken(zetting, {}), {
  sigma_0: "100", sigma_v0: "14.4", sigma_gem: "16", s: "4.8", UC: "0.192",
});
fouten += toets("Zakking, invloedsfactor — handberekening", reken(zetting, { zettingsmethode: "2" }), { s: "8.5", UC: "0.340" });
// Slappe klei, E_s = 2 MPa: s = 16·3/2000 = 0,024 m = 24 mm.
fouten += toets("Zakking, 1:2-spreiding op slappe klei — handberekening", reken(zetting, { grondtype: "2" }), { s: "24.0" });

// ── Glijding ─────────────────────────────────────────────────────────────────
const glijding = blad("en1997Glijding");

function glijdingNa(uitvoering, ondergrond) {
  const phicv = Math.atan(Math.tan(graden(25)) / 1.15);
  const delta = uitvoering === 1 ? phicv : (2 / 3) * phicv;
  const Rh = 60 * Math.tan(delta);
  const uit = { delta_d: ruim((delta * 180) / Math.PI), R_h: ruim(Rh), UC_dr: ruim(10 / Rh) };
  let UC = 10 / Rh;
  if (ondergrond === 2) {
    const Rhu = Math.min((0.6 * 50) / 1.35, 0.4 * 60);
    uit.R_hu = ruim(Rhu);
    UC = Math.max(UC, 10 / Rhu);
  }
  uit.UC = ruim(UC);
  return uit;
}

for (const [uitvoering, ondergrond] of [[1, 1], [2, 1], [1, 2], [2, 2]]) {
  const got = reken(glijding, alsTekst({ uitvoering, ondergrond }));
  fouten += toets(`Glijding, uitvoering ${uitvoering}, ondergrond ${ondergrond} — narekening`, got, glijdingNa(uitvoering, ondergrond));
}
// Met de hand: δ_d = φ'_cv;d = atan(tan 25°/1,15) = 22,07°; R_h = 60·tan 22,07° = 24,33 kN/m;
// UC = 10/24,33 = 0,411. Glad prefab: δ_d = 14,71°, R_h = 15,76 kN/m. Ongedraineerd:
// 0,6·50/1,35 = 22,22 kN/m < 0,4·60 = 24 kN/m → UC = 10/22,22 = 0,450.
fouten += toets("Glijding, standaard — handberekening", reken(glijding, {}), { delta_d: "22.07", R_h: "24.33", UC: "0.411" });
fouten += toets("Glijding, glad prefab — handberekening", reken(glijding, { uitvoering: "2" }), { R_h: "15.76" });
fouten += toets("Glijding, ongedraineerd — handberekening", reken(glijding, { ondergrond: "2" }), { R_hu: "22.22", UC: "0.450" });

// ── §7 Paaldraagvermogen: alleen een verwijzing ─────────────────────────────
{
  const got = reken(blad("en1997Paaldraagvermogen"), {});
  const verwijst = /module Paaldraagvermogen/.test(got.text);
  const zonderUC = !("UC" in got.values);
  console.log("\n§7 Paaldraagvermogen — verwijzing");
  for (const [ok, wat] of [[verwijst, "verwijst naar de module Paaldraagvermogen"], [zonderUC, "rekent zelf geen UC"]]) {
    if (!ok) fouten++;
    console.log(`  ${ok ? "OK    " : "FOUT  "} ${wat}`);
  }
}

afronden(fouten, "NEN 9997-1 normbladen");
