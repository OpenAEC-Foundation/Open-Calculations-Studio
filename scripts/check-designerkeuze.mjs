/**
 * Bewaakt de koppeling tussen rekenblad en parametrisch beeld.
 *
 * designerKeuze.tsx kiest het beeld op de eerste herkenningstekst uit zijn lijst
 * die in de bladtekst voorkomt. Noemt een blad in zijn uitleg een ander blad —
 * "toets de bouten met het blad Boutberekening" —, dan kan het beeld van dat
 * andere blad winnen, en dat zie je pas als je het blad opent. Deze controle
 * eist daarom dat de gekozen herkenningstekst in de titel van het blad staat.
 *
 * Draaien:  node scripts/check-designerkeuze.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const hier = dirname(fileURLToPath(import.meta.url));
const SRC = join(hier, "../packages/desktop/src");
const keuze = readFileSync(join(SRC, "components/calc/designerKeuze.tsx"), "utf8");
const markers = [...keuze.matchAll(/marker: "([^"]+)"/g)].map((m) => m[1]);
if (markers.length === 0) throw new Error("geen herkenningsteksten gevonden in designerKeuze.tsx");

const OVERSLAAN = new Set(["index.ts", "calcpad-samples.ts", "calcpad-includes.ts"]);
const TPL_DIR = join(SRC, "templates");
let fouten = 0, gekoppeld = 0;
for (const bestand of readdirSync(TPL_DIR).filter((f) => f.endsWith(".ts") && !OVERSLAAN.has(f))) {
  const bron = readFileSync(join(TPL_DIR, bestand), "utf8");
  // De bladtekst zelf: de template-literal na `export const x = `.
  const m = bron.match(/export const \w+ = `([\s\S]*)`;\s*$/);
  if (!m) continue;
  const tekst = m[1];
  const eerste = markers.find((mk) => tekst.includes(mk));
  if (!eerste) continue;
  gekoppeld++;
  const titel = tekst.split("\n")[0];
  if (!titel.includes(eerste)) {
    fouten++;
    const alle = markers.filter((mk) => tekst.includes(mk));
    console.log(`  FOUT   ${bestand}: kiest het beeld van "${eerste}", maar de titel is ${titel.slice(0, 60)}`);
    console.log(`         herkenningsteksten in het blad: ${alle.join(", ")}`);
  }
}
console.log(`  ${fouten ? "FOUT  " : "OK    "} ${gekoppeld} bladen met een beeld, elk op een herkenningstekst uit de eigen titel`);

// ── Elke startwaarde van een beeld is invoer van het blad ────────────────────
// Het beeld schrijft zijn waarden in het blad onder de naam uit DEFAULTS. Heet
// de invoer in het blad anders, dan verandert het beeld niets aan de
// berekening — zonder foutmelding. Namen met een komma in het blad (`F_v,Ed`)
// staan in het beeld met een liggend streepje (`F_v_Ed`).
const bladen = readdirSync(TPL_DIR)
  .filter((f) => f.endsWith(".ts") && !OVERSLAAN.has(f))
  .map((f) => readFileSync(join(TPL_DIR, f), "utf8").match(/export const \w+ = `([\s\S]*)`;\s*$/)?.[1])
  .filter(Boolean);
let losse = 0, beelden = 0;
for (const [, marker, comp] of keuze.matchAll(/marker: "([^"]+)", beeld: \(\) => <(\w+) \/>/g)) {
  const bron = readFileSync(join(SRC, "components/calc", `${comp}.tsx`), "utf8");
  const blok = bron.match(/const DEFAULTS[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!blok) continue;
  beelden++;
  const sleutels = [...blok[1].matchAll(/(?:^|[\s,{])"?([\p{L}_][\p{L}\p{N}_]*)"?\s*:/gu)].map((m) => m[1]);
  const invoer = new Set();
  for (const tekst of bladen.filter((t) => t.split("\n")[0].includes(marker))) {
    for (const m of tekst.matchAll(/^\s*([\p{L}_][\p{L}\p{N}_,]*)\s*=\s*\?/gmu)) invoer.add(m[1].replace(/,/g, "_"));
    for (const m of tekst.matchAll(/^\s*@select\s+(\w+)/gm)) invoer.add(m[1]);
  }
  const zonder = sleutels.filter((k) => !invoer.has(k));
  if (zonder.length) {
    losse += zonder.length;
    console.log(`  FOUT   ${comp}: ${zonder.join(", ")} — geen invoer in het blad "${marker}"`);
  }
}
console.log(`  ${losse ? "FOUT  " : "OK    "} ${beelden} beelden: elke startwaarde is invoer van het eigen blad`);
fouten += losse ? 1 : 0;

console.log(fouten ? `\nDesignerkeuze: ${fouten} probleem/problemen tussen beeld en blad.` : "\nDesignerkeuze: elk blad krijgt zijn eigen beeld, en elk beeld schrijft in zijn blad.");
process.exit(fouten ? 1 : 0);
