/**
 * Regressie voor browseropslag: Opslaan als kiest een bestand; Opslaan schrijft
 * daarna zonder tweede dialoog over datzelfde bestand. Een nieuw gekozen
 * bestand vervangt de handle voor de volgende Opslaan-actie.
 */
import { readFileSync } from "node:fs";
import ts from "typescript";

const bron = readFileSync(new URL("../packages/desktop/src/tauri/fileOps.ts", import.meta.url), "utf8");
const js = ts.transpileModule(bron, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;

let dialoogAantal = 0;
const bestanden = new Map();
function handle(naam) {
  return {
    name: naam,
    async createWritable() {
      return {
        async write(inhoud) { bestanden.set(naam, inhoud); },
        async close() {},
      };
    },
    async getFile() { return { async text() { return bestanden.get(naam); } }; },
  };
}
globalThis.window = {
  async showSaveFilePicker() { dialoogAantal++; return handle(`blad-${dialoogAantal}.ifccalculation`); },
  async showOpenFilePicker() { return [handle("blad-1.ifccalculation")]; },
};

const opslaan = await import(`data:text/javascript,${encodeURIComponent(js)}`);
const eerste = await opslaan.saveCalculationFile("versie 1", "blad");
if (eerste !== "blad-1.ifccalculation" || !opslaan.kanDirectOpslaan(eerste)) {
  throw new Error("Opslaan als heeft geen overschrijfbaar bestand gekozen");
}
await opslaan.schrijfCalculationFile(eerste, "versie 2");
if (dialoogAantal !== 1 || bestanden.get(eerste) !== "versie 2") {
  throw new Error("Opslaan overschrijft het gekozen bestand niet direct");
}
const tweede = await opslaan.saveCalculationFile("nieuw", "blad", eerste);
if (tweede === eerste || opslaan.kanDirectOpslaan(eerste) || !opslaan.kanDirectOpslaan(tweede)) {
  throw new Error("Opslaan als heeft de bestandskoppeling niet vervangen");
}
const geopend = await opslaan.openCalculationFile();
if (geopend?.raw !== "versie 2" || !opslaan.kanDirectOpslaan(eerste)) {
  throw new Error("Openen heeft de bestandskoppeling niet hersteld");
}
console.log("Browseropslag: Opslaan, Opslaan als en Openen akkoord.");
