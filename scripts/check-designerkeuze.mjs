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
console.log(fouten ? `\nDesignerkeuze: ${fouten} blad(en) krijgen het beeld van een ander blad.` : "\nDesignerkeuze: elk blad krijgt zijn eigen beeld.");
process.exit(fouten ? 1 : 0);
