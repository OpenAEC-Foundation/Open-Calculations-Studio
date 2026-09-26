/**
 * Wachtpost bij de formaataanduiding (`:F2`, `:N0`, `:G`, `:E3`, `:P`).
 *
 * De parser knipt een formaataanduiding achter een expressie weg
 * (stripFormatSpecs in packages/core/src/parser.ts); het is een
 * weergave-opdracht, geen rekenwerk. Liep dat knippen over de hele regel, dan
 * verdween ook in tekst elke dubbele punt met een losse F, N, G, E of P erachter:
 * "Glijden: F/(v·L)" werd "Glijden/(v·L)", en in `#for i = 1 : n` verdween
 * het bereik. Dit script bewaakt beide kanten: in rekendelen wordt geknipt,
 * in tekst, titels, tekeningen en bereiken niet.
 *
 * Draaien:  node scripts/check-formaataanduiding.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { parse, evaluate, render } from "../packages/core/dist/index.js";

const plat = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const reken = (bron) => {
  const nodes = evaluate(parse(bron), {});
  const uitkomsten = {};
  const loop = (lijst) => {
    for (const n of lijst) {
      if (n.type === "assignment" || n.type === "var-display") uitkomsten[n.name] = String(n.result);
      if (Array.isArray(n.children)) loop(n.children);
    }
  };
  loop(nodes);
  return { uitkomsten, html: render(nodes), tekst: plat(render(nodes)) };
};

let fouten = 0;
const meld = (ok, wat, detail) => {
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK  " : "FOUT"} ${wat}${ok ? "" : "  -> " + detail}`);
};

console.log("Tekst blijft heel:");
for (const [wat, bron, verwacht] of [
  ["prozaregel", "'Glijden: F/(v·L) en schuin dak: G werkt\n", ["Glijden: F/(v·L)", "dak: G werkt"]],
  ["prozaregel met formule", "'Eigen gewicht per m¹: g = b·h·ρ\n", ["per m¹: g = b·h·ρ"]],
  ["kop", "## Stap 2: N en M\n", ["Stap 2: N en M"]],
  ["titel", '"Toets: E-modulus\n', ["Toets: E-modulus"]],
  ["toelichting achter een formule", "x = 2', uitleg: n = 3'\n", ["uitleg: n = 3"]],
  ["tekst in een tekening", '@svg\n<svg><text x="1" y="2">dak: G werkt</text></svg>\n@end\n', ["dak: G werkt"]],
]) {
  const { tekst, html } = reken(bron);
  const ok = verwacht.every((v) => tekst.includes(v) || html.includes(v));
  meld(ok, wat, tekst.slice(0, 140));
}

console.log("\nIn rekendelen wordt geknipt:");
{
  const r = reken("Z_0 = 3.14159:F2\nZ_0:F2\na = 1/4 : N0\n'Waarde 'a:F2' mm\n");
  meld(r.uitkomsten.Z_0 === "3.142" && r.uitkomsten.a === "0.25", "toekenning en kale weergave", JSON.stringify(r.uitkomsten));
  meld(r.tekst.includes("Waarde 0.25 mm") && !r.tekst.includes(":F2"), "ingevoegde expressie in tekst", r.tekst);
}

console.log("\nEen bereik is geen formaataanduiding:");
{
  const r = reken("n = 3\ns = 0\n#for i = 1 : n\ns = s + i\n#loop\ns\n");
  meld(r.uitkomsten.s === "6", "#for i = 1 : n", JSON.stringify(r.uitkomsten));
}
{
  const r = reken("N = 4\nf(x) = x^2 - N\nw = $Root{f(x) @ x = 0 : N }\n");
  meld(Math.abs(parseFloat(r.uitkomsten.w) - 2) < 1e-6, "$Root{… @ x = 0 : N }", JSON.stringify(r.uitkomsten));
}

console.log(fouten === 0 ? "\nFormaataanduiding alleen in rekendelen geknipt." : `\n${fouten} controle(s) gezakt.`);
process.exit(fouten === 0 ? 0 : 1);
