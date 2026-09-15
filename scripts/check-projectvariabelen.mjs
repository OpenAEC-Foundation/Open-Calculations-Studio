/**
 * Bewaakt de grens tussen projectgegevens en bladinvoer.
 *
 * De projectgegevens (gevolgklasse, ontwerplevensduur, windgebied, de
 * projectkop) worden vóór de eerste regel van elk rekenblad in de scope gezet.
 * Zet een blad daarna zélf een invoerveld met dezelfde naam neer — een
 * `@select CC` of een `CC = ?` prompt, of een designer met `CC` in zijn
 * DEFAULTS — dan staan er ineens twee bronnen voor dezelfde grootheid en wint
 * de laatste. Precies het soort stille dubbeling waar het oude model op
 * stukliep.
 *
 * Deze controle valt niet over een gewone toekenning (`K_FI = 0.9` in een
 * normblad dat de tabel uitwerkt is juist zinvol) — alleen over invóér.
 *
 * Draaien:  node scripts/check-projectvariabelen.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const hier = dirname(fileURLToPath(import.meta.url));
const SRC = join(hier, "../packages/desktop/src");
const TPL_DIR = join(SRC, "templates");
const CALC_DIR = join(SRC, "components/calc");

/** Namen die het project levert, plus de afgeleide K_FI. */
function projectVariabelen() {
  const bron = readFileSync(join(SRC, "store/projectGegevens.ts"), "utf8");
  const namen = [...bron.matchAll(/naam:\s*"([^"]+)"/g)].map((m) => m[1]);
  if (namen.length === 0) throw new Error("geen projectvelden gevonden in projectGegevens.ts");
  return new Set([...namen, "K_FI"]);
}

const PROJECT = projectVariabelen();
const botsingen = [];

// ── Rekenbladen: @select-blokken en `?`-prompts ────────────────────────────
const OVERSLAAN = new Set(["index.ts", "calcpad-samples.ts", "calcpad-includes.ts"]);
for (const bestand of readdirSync(TPL_DIR).filter((f) => f.endsWith(".ts") && !OVERSLAAN.has(f))) {
  const regels = readFileSync(join(TPL_DIR, bestand), "utf8").split("\n");
  regels.forEach((regel, i) => {
    const sel = regel.match(/^@select\s+([A-Za-z_][A-Za-z0-9_]*)\b/);
    if (sel && PROJECT.has(sel[1])) {
      botsingen.push([`${bestand}:${i + 1}`, sel[1], "@select in een rekenblad"]);
    }
    const prompt = regel.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\?/);
    if (prompt && PROJECT.has(prompt[1])) {
      botsingen.push([`${bestand}:${i + 1}`, prompt[1], "invoerprompt in een rekenblad"]);
    }
  });
}

// ── Designers: de DEFAULTS-blokken ─────────────────────────────────────────
for (const bestand of readdirSync(CALC_DIR).filter((f) => /Designer\.tsx$/.test(f))) {
  const bron = readFileSync(join(CALC_DIR, bestand), "utf8");
  const m = bron.match(/const DEFAULTS[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!m) continue;
  const voorafRegels = bron.slice(0, bron.indexOf(m[0])).split("\n").length;
  m[1].split("\n").forEach((regel, i) => {
    for (const sleutel of regel.matchAll(/(?:^|[\s,{])([A-Za-z_][A-Za-z0-9_]*)\s*:/g)) {
      if (PROJECT.has(sleutel[1])) {
        botsingen.push([`${bestand}:${voorafRegels + i}`, sleutel[1], "DEFAULTS van een designer"]);
      }
    }
  });
}

console.log(`Projectvariabelen: ${[...PROJECT].sort().join(", ")}\n`);

if (botsingen.length === 0) {
  console.log(`Geen enkel blad of designer vraagt een projectvariabele zelf op — grens is heel.`);
  process.exit(0);
}

console.log("Deze invoervelden overschrijven een projectgegeven:\n");
for (const [waar, naam, soort] of botsingen) {
  console.log(`  ${naam.padEnd(18)} ${soort.padEnd(32)} ${waar}`);
}
console.log(
  "\nHaal het invoerveld weg en gebruik de projectwaarde, of geef de grootheid" +
    "\nin het blad een eigen naam als hij écht per blad verschilt.",
);
process.exit(1);
