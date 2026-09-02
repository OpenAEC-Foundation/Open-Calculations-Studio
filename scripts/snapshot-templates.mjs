/**
 * Snapshot van álle rekenbladen — vangnet bij wijzigingen in packages/core.
 *
 * Haalt elk template door parse → evaluate → render en legt twee dingen vast:
 *   • values — elke var-display met zijn uitkomst (de getállen)
 *   • text   — de gerenderde platte tekst (de woorden)
 *
 * Door voor en na een core-wijziging te snapshotten en te vergelijken is in één
 * oogopslag te zien of er een berekening is verschoven of alleen tekst. Een
 * wijziging in `values` is bijna altijd een regressie; een wijziging in `text`
 * kan bedoeld zijn.
 *
 * Gebruik:
 *   node scripts/snapshot-templates.mjs voor.json
 *   ... wijzig packages/core, npm --prefix packages/core run build ...
 *   node scripts/snapshot-templates.mjs na.json
 *   node scripts/snapshot-templates.mjs --compare voor.json na.json
 *
 * Vereist een gebouwde core: npm --prefix packages/core run build
 */
import { parse, evaluate, render } from "../packages/core/dist/index.js";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const hier = dirname(fileURLToPath(import.meta.url));
const TPL_DIR = join(hier, "../packages/desktop/src/templates");

/** Vite-specifieke imports (`?raw`, `?url`) zijn buiten de bundler niet te laden. */
const OVERSLAAN = new Set(["index.ts", "calcpad-samples.ts", "calcpad-includes.ts"]);

/**
 * Laadt een templatebestand als ES-module via een data-URL. De bestanden zijn
 * op één ding na kale JavaScript: sommige array-exports dragen een
 * type-annotatie (`export const x: { id: string }[] = [`). Die strippen we.
 */
async function laad(bestand) {
  const code = readFileSync(join(TPL_DIR, bestand), "utf8")
    .replace(/^export const (\w+)\s*:\s*[^=]+=/gm, "export const $1 =");
  const url = "data:text/javascript;base64," + Buffer.from(code, "utf8").toString("base64");
  return import(url);
}

/** Alle template-strings uit een module, inclusief die in `…Formules`-arrays. */
function templatesUit(mod, bestand) {
  const uit = [];
  for (const [naam, waarde] of Object.entries(mod)) {
    if (typeof waarde === "string") {
      uit.push([`${bestand}:${naam}`, waarde]);
    } else if (Array.isArray(waarde)) {
      for (const item of waarde) {
        if (item && typeof item.template === "string") {
          uit.push([`${bestand}:${naam}[${item.id ?? uit.length}]`, item.template]);
        }
      }
    }
  }
  return uit;
}

/**
 * De projectgegevens zoals de app ze aan elk blad meegeeft.
 *
 * Sinds de bladen hun gevolgklasse van het project krijgen, evalueert een
 * template niet meer zelfstandig: zonder `CC` valt hij om op een onbekende
 * variabele. Hier lezen we de veldnamen en standaarden rechtstreeks uit
 * `store/projectGegevens.ts`, zodat de snapshot meebeweegt als daar een veld
 * bijkomt.
 */
function projectScopeUitBron() {
  const bron = readFileSync(
    join(hier, "../packages/desktop/src/store/projectGegevens.ts"),
    "utf8",
  );
  const scope = {};
  const namen = [...bron.matchAll(/naam:\s*"([^"]+)"/g)].map((m) => m[1]);
  const standaarden = [...bron.matchAll(/standaard:\s*"([^"]*)"/g)].map((m) => m[1]);
  if (namen.length !== standaarden.length) {
    throw new Error(
      `projectGegevens.ts: ${namen.length} namen maar ${standaarden.length} standaarden — ` +
        "de snapshot kan de projectwaarden niet betrouwbaar afleiden.",
    );
  }
  namen.forEach((naam, i) => {
    const ruw = standaarden[i];
    const n = parseFloat(ruw);
    scope[naam] = ruw !== "" && Number.isFinite(n) ? n : ruw;
  });
  const cc = typeof scope.CC === "number" ? scope.CC : 2;
  scope.K_FI = cc <= 1 ? 0.9 : cc >= 3 ? 1.1 : 1.0;
  return scope;
}

const PROJECT_SCOPE = projectScopeUitBron();

/** Getallen en tekst van één rekenblad. */
function verwerk(bron) {
  const values = {};
  let text = "";
  try {
    const nodes = evaluate(parse(bron), {}, PROJECT_SCOPE);
    const loop = (lijst) => {
      for (const n of lijst) {
        if (n.type === "var-display") values[n.name] = `${n.result}${n.unit ? " " + n.unit : ""}`;
        if (Array.isArray(n.children)) loop(n.children);
        if (Array.isArray(n.nodes)) loop(n.nodes);
      }
    };
    loop(nodes);
    text = render(nodes)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch (err) {
    text = `__FOUT__ ${err.message}`;
  }
  return { values, text };
}

async function maakSnapshot() {
  const snap = {};
  const bestanden = readdirSync(TPL_DIR).filter((f) => f.endsWith(".ts") && !OVERSLAAN.has(f));
  for (const bestand of bestanden.sort()) {
    let mod;
    try {
      mod = await laad(bestand);
    } catch (err) {
      snap[`${bestand}:__laadfout__`] = { values: {}, text: `__FOUT__ ${err.message}` };
      continue;
    }
    for (const [sleutel, bron] of templatesUit(mod, bestand)) snap[sleutel] = verwerk(bron);
  }
  return snap;
}

/** Waar in de tekst zit het eerste verschil — geeft context rond dat punt. */
function eersteVerschil(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const van = Math.max(0, i - 45);
  return { voor: a.slice(van, i + 55), na: b.slice(van, i + 55) };
}

function vergelijk(padA, padB) {
  const A = JSON.parse(readFileSync(padA, "utf8"));
  const B = JSON.parse(readFileSync(padB, "utf8"));
  const sleutels = [...new Set([...Object.keys(A), ...Object.keys(B)])].sort();

  const getalDiffs = [];
  const tekstDiffs = [];
  const structuur = [];

  for (const s of sleutels) {
    if (!A[s]) { structuur.push(`+ nieuw blad: ${s}`); continue; }
    if (!B[s]) { structuur.push(`- verdwenen blad: ${s}`); continue; }
    for (const naam of new Set([...Object.keys(A[s].values), ...Object.keys(B[s].values)])) {
      const va = A[s].values[naam], vb = B[s].values[naam];
      if (va !== vb) getalDiffs.push(`  ${s}  ${naam}: ${va ?? "—"} -> ${vb ?? "—"}`);
    }
    if (A[s].text !== B[s].text) tekstDiffs.push([s, eersteVerschil(A[s].text, B[s].text)]);
  }

  console.log(`${sleutels.length} rekenbladen vergeleken.\n`);
  if (structuur.length) console.log("STRUCTUUR:\n" + structuur.join("\n") + "\n");

  if (getalDiffs.length) {
    console.log(`GETALLEN GEWIJZIGD — ${getalDiffs.length} stuks. Dit is bijna altijd een regressie:`);
    console.log(getalDiffs.slice(0, 60).join("\n"));
    if (getalDiffs.length > 60) console.log(`  … en nog ${getalDiffs.length - 60}`);
  } else {
    console.log("GETALLEN: geen enkele uitkomst gewijzigd.");
  }

  console.log(`\nTEKST GEWIJZIGD — ${tekstDiffs.length} van de ${sleutels.length} bladen:`);
  for (const [s, d] of tekstDiffs.slice(0, 40)) {
    console.log(`  ${s}\n    voor: …${d.voor}…\n    na:   …${d.na}…`);
  }
  if (tekstDiffs.length > 40) console.log(`  … en nog ${tekstDiffs.length - 40}`);

  process.exit(getalDiffs.length === 0 ? 0 : 1);
}

const args = process.argv.slice(2);
if (args[0] === "--compare") {
  vergelijk(args[1], args[2]);
} else {
  const uit = args[0] ?? "snapshot.json";
  const snap = await maakSnapshot();
  writeFileSync(uit, JSON.stringify(snap, null, 1), "utf8");
  const fouten = Object.entries(snap).filter(([, v]) => v.text.startsWith("__FOUT__"));
  console.log(`${Object.keys(snap).length} rekenbladen gesnapshot naar ${uit}.`);
  if (fouten.length) {
    console.log(`${fouten.length} met een fout (blijft ok zolang die voor én na gelijk is):`);
    for (const [s, v] of fouten.slice(0, 12)) console.log(`  ${s}: ${v.text.slice(0, 110)}`);
  }
}
