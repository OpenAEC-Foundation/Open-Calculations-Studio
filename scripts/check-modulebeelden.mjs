/** Elk selecteerbaar rekenblad heeft een eigen schematisch catalogusbeeld. */
import { readFileSync } from "node:fs";
import ts from "typescript";

const boom = readFileSync("packages/desktop/src/components/calc/projectTree.ts", "utf8");
const catalogus = boom.split("export const moduleCatalogus:")[1]?.split("export const bibliotheek:")[0] ?? "";
const ids = [...catalogus.matchAll(/templateId: "([^"]+)"/g)].map((m) => m[1]);
const dubbel = ids.filter((id, i) => ids.indexOf(id) !== i);

const bron = readFileSync("packages/desktop/src/components/calc/ModuleAfbeelding.tsx", "utf8");
const syntax = ts.createSourceFile("ModuleAfbeelding.tsx", bron, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const verklaring = syntax.statements.find((s) =>
  ts.isVariableStatement(s) && s.declarationList.declarations.some((d) => d.name.getText(syntax) === "beelden"));
const initialisatie = verklaring?.declarationList.declarations.find((d) => d.name.getText(syntax) === "beelden")?.initializer;
if (!initialisatie || !ts.isObjectLiteralExpression(initialisatie)) {
  throw new Error("Catalogusbeelden niet gevonden");
}
const beeldIds = initialisatie.properties.map((eigenschap) => {
  if (!ts.isPropertyAssignment(eigenschap) && !ts.isShorthandPropertyAssignment(eigenschap)) {
    throw new Error("Onbekende beeldeigenschap");
  }
  return eigenschap.name.text;
});
const ontbrekend = ids.filter((id) => !beeldIds.includes(id));
const ongebruikt = beeldIds.filter((id) => !ids.includes(id) && id !== "schijfwerking");
const dubbeleBeelden = beeldIds.filter((id, i) => beeldIds.indexOf(id) !== i);

if (ontbrekend.length || ongebruikt.length || dubbel.length || dubbeleBeelden.length) {
  if (ontbrekend.length) console.error("Geen schematisch beeld:", ontbrekend.join(", "));
  if (ongebruikt.length) console.error("Ongebruikt beeld:", ongebruikt.join(", "));
  if (dubbel.length) console.error("Dubbele module-id:", dubbel.join(", "));
  if (dubbeleBeelden.length) console.error("Dubbele beeld-id:", dubbeleBeelden.join(", "));
  process.exitCode = 1;
} else {
  console.log(`${ids.length} modules hebben elk een eigen schematisch catalogusbeeld.`);
}
