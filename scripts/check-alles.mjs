/**
 * Draait alle controlescripts achter elkaar en vat het resultaat samen.
 *
 * Twee soorten controle, met een verschillend referentiepunt:
 *   • check-<module>.mjs  — klopt de module nog met het de referentie-uitwerking-referentie-
 *     blad? Referentiepunt is de externe waarheid.
 *   • check-afkortingen   — houdt de parser de rekentaal-tekst heel?
 *
 * Voor de vraag "is er iets veránderd" is er een ander gereedschap:
 * scripts/snapshot-templates.mjs, te draaien vóór en ná een core-wijziging.
 *
 * Draaien:  npm run check     (of: node scripts/check-alles.mjs)
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const hier = dirname(fileURLToPath(import.meta.url));

const SCRIPTS = readdirSync(hier)
  .filter((f) => f.startsWith("check-") && f.endsWith(".mjs") && f !== "check-alles.mjs")
  .sort();

const uitslag = [];
for (const script of SCRIPTS) {
  console.log(`\n${"─".repeat(72)}\n▶ ${script}\n${"─".repeat(72)}`);
  const r = spawnSync(process.execPath, [join(hier, script)], { stdio: "inherit" });
  uitslag.push({ script, ok: r.status === 0 });
}

console.log(`\n${"═".repeat(72)}`);
for (const u of uitslag) console.log(`  ${u.ok ? "✓" : "✗"}  ${u.script}`);
const gezakt = uitslag.filter((u) => !u.ok);
console.log(
  gezakt.length === 0
    ? `\n${uitslag.length} controles, alle groen.`
    : `\n${gezakt.length} van de ${uitslag.length} controles gezakt.`,
);
process.exit(gezakt.length === 0 ? 0 : 1);
