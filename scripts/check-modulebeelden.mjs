/** Elk selecteerbaar rekenblad heeft een eigen compact catalogusbeeld. */
import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";

const bron = readFileSync("packages/desktop/src/components/calc/projectTree.ts", "utf8");
const catalogus = bron.split("export const moduleCatalogus:")[1]?.split("export const bibliotheek:")[0] ?? "";
const ids = [...catalogus.matchAll(/templateId: "([^"]+)"/g)].map((m) => m[1]);
const map = "packages/desktop/src/assets/module-beelden";
const ontbrekend = ids.filter((id) => !existsSync(join(map, `${id}.webp`)));
const teGroot = ids.filter((id) => existsSync(join(map, `${id}.webp`)) && statSync(join(map, `${id}.webp`)).size > 200_000);
const namen = new Set(readdirSync(map));
const dubbeleIds = ids.filter((id, i) => ids.indexOf(id) !== i);
for (const id of ids) namen.delete(`${id}.webp`);
namen.delete("schijfwerking.webp"); // Oud blad blijft beschikbaar in bestaande projecten.
if (ontbrekend.length || teGroot.length || dubbeleIds.length || namen.size) {
  if (ontbrekend.length) console.error("Geen eigen beeld:", ontbrekend.join(", "));
  if (teGroot.length) console.error("Beeld groter dan 200 kB:", teGroot.join(", "));
  if (dubbeleIds.length) console.error("Dubbele module-id:", dubbeleIds.join(", "));
  if (namen.size) console.error("Ongebruikte beelden:", [...namen].join(", "));
  process.exitCode = 1;
} else {
  console.log(`${ids.length} modules hebben elk een eigen catalogusbeeld.`);
}
