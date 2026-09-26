/**
 * Wachtpost bij een leeg invoerveld (`naam = ?…`) in de rekenkern.
 *
 * Maakt de gebruiker een veld leeg, dan komt er "" binnen. Met een eenheid
 * werd dat " kN": een eenheid zonder getal. Die rekende als 1 kN of gaf
 * verderop NaN en "unit with undefined value" (gevelkolom met N_Ed,max leeg:
 * "Maatgevende UC = NaN"), en een #if koos de verkeerde tak (boutberekening
 * met p_2 leeg). Zonder eenheid bleef de naam ongedefinieerd.
 *
 * Afspraak (packages/core/src/evaluator.ts, case 'input-prompt'): een leeg
 * veld telt als 0 in de eenheid van het veld, net als een nieuw '?'-veld. Het
 * veld zelf blijft leeg. Dit script bewaakt dat op drie niveaus:
 *   1. een klein blad met velden met, zonder en met samengestelde eenheid;
 *   2. elk rekenblad: alle velden leeg rekent precies als alle velden 0;
 *   3. de twee gemelde gevallen met realistische invoer.
 *
 * Draaien:  node scripts/check-lege-invoer.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { parse, evaluate, render } from "../packages/core/dist/index.js";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { laadTemplate } from "./lib/refcheck.mjs";

const hier = dirname(fileURLToPath(import.meta.url));
const TPL_DIR = join(hier, "../packages/desktop/src/templates");

let fouten = 0;
const meld = (ok, wat, detail = "") => {
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK  " : "FOUT"} ${wat}${ok || !detail ? "" : "  -> " + detail}`);
};

/** Uitkomsten (naam → "getal eenheid") en de platte tekst van een doorgerekend blad. */
function doorreken(bron, waarden, scope) {
  const nodes = evaluate(parse(bron), waarden, scope);
  const uitkomsten = {};
  const velden = {};
  const loop = (lijst) => {
    for (const n of lijst) {
      if (n.type === "assignment" || n.type === "var-display") {
        uitkomsten[n.name] = String(n.result);
      }
      if (n.type === "input-prompt") velden[n.name] = n.currentValue;
      if (Array.isArray(n.children)) loop(n.children);
      if (Array.isArray(n.nodes)) loop(n.nodes);
    }
  };
  loop(nodes);
  const tekst = render(nodes).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return { uitkomsten, velden, tekst };
}

/** Eerste verschil tussen twee doorrekeningen, of null als ze gelijk zijn. */
function verschil(a, b) {
  for (const naam of new Set([...Object.keys(a.uitkomsten), ...Object.keys(b.uitkomsten)])) {
    if (a.uitkomsten[naam] !== b.uitkomsten[naam]) {
      return `${naam}: ${a.uitkomsten[naam] ?? "—"} tegen ${b.uitkomsten[naam] ?? "—"}`;
    }
  }
  if (a.tekst !== b.tekst) {
    let i = 0;
    while (a.tekst[i] === b.tekst[i]) i++;
    return `tekst: …${a.tekst.slice(Math.max(0, i - 40), i + 40)}… tegen …${b.tekst.slice(Math.max(0, i - 40), i + 40)}…`;
  }
  return null;
}

// ── 1. Klein blad ────────────────────────────────────────────────────────────
console.log("Klein blad — leeg, spaties en een half getal tellen als 0:");
const KLEIN = `N = ?kN
q = ?*(kN/m)
n = ?
p = ?*(mm)
N
q
n
p
x = N + 2kN
z = n + 1
#if p > 0 mm
'tak: p groter dan 0
#else
'tak: p is 0
#end if
`;
const nul = doorreken(KLEIN, { N: "0", q: "0", n: "0", p: "0" });
meld(
  nul.uitkomsten.N === "0 kN" && nul.uitkomsten.q === "0 kN / m" && nul.uitkomsten.n === "0" &&
    nul.uitkomsten.p === "0 mm" && nul.uitkomsten.x === "2 kN" && nul.tekst.includes("tak: p is 0"),
  "velden op 0 rekenen als 0 in hun eenheid",
  JSON.stringify(nul.uitkomsten),
);
for (const [wat, waarden] of [
  ["niets ingevuld (nieuw blad)", {}],
  ["alle velden leeg", { N: "", q: "", n: "", p: "" }],
  ["alle velden alleen spaties", { N: " ", q: "  ", n: " ", p: "\t" }],
  ["half getal of alleen een teken", { N: "-", q: ",", n: "-", p: "." }],
  ["alleen een eenheid getypt", { N: "kN", q: "kN", n: "", p: "mm" }],
]) {
  const r = doorreken(KLEIN, waarden);
  const d = verschil(nul, r);
  meld(d === null && !/NaN|undefined|niet gedefinieerd|Error/.test(r.tekst), wat, d ?? r.tekst.slice(0, 160));
}
const leeg = doorreken(KLEIN, { N: "", q: "", n: "", p: "" });
meld(
  Object.values(leeg.velden).every((v) => v === ""),
  "een leeg veld blijft leeg (currentValue)",
  JSON.stringify(leeg.velden),
);
const ingevuld = doorreken(KLEIN, { N: "5", q: "1,5", n: "3", p: "12,5" });
meld(
  ingevuld.uitkomsten.N === "5 kN" && ingevuld.uitkomsten.q === "1.5 kN / m" &&
    ingevuld.uitkomsten.n === "3" && ingevuld.uitkomsten.p === "12.5 mm" &&
    ingevuld.tekst.includes("tak: p groter dan 0"),
  "ingevulde waarden (ook met decimale komma) ongewijzigd",
  JSON.stringify(ingevuld.uitkomsten),
);

// ── 2. Elk rekenblad: leeg ≡ 0 ───────────────────────────────────────────────
console.log("\nElk rekenblad — alle invoervelden leeg rekent als alle velden 0:");
const GEEN_BLAD = new Set(["index.ts", "calcpad-includes.ts", "calcpad-samples.ts", "nl-windgebieden.ts"]);

/** Projectgegevens zoals de app ze vóór de eerste regel in de scope zet (als check-renders). */
function projectScope() {
  const src = readFileSync(join(hier, "../packages/desktop/src/store/projectGegevens.ts"), "utf8");
  const scope = {};
  const veld = /naam:\s*"([^"]+)"[\s\S]*?type:\s*"(keuze|tekst)"[\s\S]*?standaard:\s*"([^"]*)"/g;
  for (const [, naam, type, standaard] of src.matchAll(veld)) {
    const n = parseFloat(standaard);
    scope[naam] = type === "keuze" && Number.isFinite(n) ? n : standaard;
  }
  const cc = typeof scope.CC === "number" ? scope.CC : 2;
  scope.K_FI = cc === 1 ? 0.9 : cc === 3 ? 1.1 : 1.0;
  return scope;
}
const SCOPE = projectScope();

let bladen = 0;
let afwijkend = 0;
for (const bestand of readdirSync(TPL_DIR).filter((f) => f.endsWith(".ts") && !GEEN_BLAD.has(f)).sort()) {
  const src = readFileSync(join(TPL_DIR, bestand), "utf8");
  for (const [, naam, tpl] of src.matchAll(/export const (\w+) = `([\s\S]*?)`;/g)) {
    const velden = new Set();
    for (const m of tpl.matchAll(/^\s*([^\s='#]+)\s*=\s*\?/gmu)) velden.add(m[1].replace(/,/g, "_"));
    if (velden.size === 0) continue;
    bladen++;
    const opNul = {}, opLeeg = {};
    for (const v of velden) { opNul[v] = "0"; opLeeg[v] = ""; }
    let d;
    try {
      d = verschil(doorreken(tpl, opNul, SCOPE), doorreken(tpl, opLeeg, SCOPE));
    } catch (e) {
      d = `gooit: ${String(e.message).slice(0, 120)}`;
    }
    if (d !== null) {
      afwijkend++;
      meld(false, `${bestand} :: ${naam}`, d);
    }
  }
}
meld(afwijkend === 0, `${bladen} rekenbladen met invoervelden: leeg en 0 geven dezelfde uitkomsten en tekst`);

// ── 3. De gemelde gevallen met realistische invoer ──────────────────────────
console.log("\nGemelde gevallen — één veld leeg tussen ingevulde waarden:");
{
  const tpl = laadTemplate("stalenGevelkolom.ts");
  const PROJECT = { CC: 2, K_FI: 1, windgebied: 2, terreincategorie: 2 };
  const invoer = {
    profile: "11", staalkwaliteit: "235", L: "6", b_belast: "5", n_r: "2", regelsteun: "1",
    windbron: "1", z_wind: "7", d_geb: "20", a_hoek: "10", q_wind_hand: "0.8", w_d_hand: "0.9",
    w_z_hand: "0.7", N_Ed: "30", VerplGrens: "300",
  };
  const opNul = doorreken(tpl, { ...invoer, N_Ed_max: "0" }, PROJECT);
  const opLeeg = doorreken(tpl, { ...invoer, N_Ed_max: "" }, PROJECT);
  const d = verschil(opNul, opLeeg);
  meld(
    d === null && Number.isFinite(parseFloat(opLeeg.uitkomsten.UC_max)) && !/\bNaN\b/.test(opLeeg.tekst),
    `gevelkolom, N_Ed,max leeg: zelfde als 0, UC_max = ${opLeeg.uitkomsten.UC_max}`,
    d ?? `UC_max = ${opLeeg.uitkomsten.UC_max}`,
  );
}
{
  const tpl = laadTemplate("boutberekening.ts");
  const PROJECT = { rekenwijze: 1 };
  const invoer = {
    staalsoort: "235", boutkwaliteit: "88", boutdiameter: "16",
    afschuifvlak: "1", boutpositie: "1", randpositie: "1",
    t_plaat: "20", e_1: "30", p_1: "80", e_2: "25",
    n_v: "1", F_v_Ed: "50", F_t_Ed: "0",
  };
  const opNul = doorreken(tpl, { ...invoer, p_2: "0" }, PROJECT);
  const opLeeg = doorreken(tpl, { ...invoer, p_2: "" }, PROJECT);
  const d = verschil(opNul, opLeeg);
  // Randbout met p_2 = 0: de tak zonder tweede bout loodrecht op de kracht,
  // dus k_1,rand en géén k_1,bin. Een eenheid zonder getal (1 mm) koos de
  // andere tak, met k_1,bin = 1,4·p_2/d_0 − 1,7 < 0.
  const tak = Object.keys(opLeeg.uitkomsten).filter((k) => k.startsWith("k_1")).join(", ");
  meld(
    d === null && "k_1_rand" in opLeeg.uitkomsten && !("k_1_bin" in opLeeg.uitkomsten) &&
      opLeeg.tekst.includes("randbout zonder tweede bout loodrecht op de kracht") &&
      !/\bNaN\b/.test(opLeeg.tekst),
    `boutberekening, p_2 leeg: zelfde tak als p_2 = 0 (${tak})`,
    d ?? tak,
  );
}

console.log(
  fouten === 0
    ? "\nEen leeg invoerveld rekent overal als 0 in zijn eenheid."
    : `\n${fouten} controle(s) gezakt.`,
);
process.exit(fouten === 0 ? 0 : 1);
