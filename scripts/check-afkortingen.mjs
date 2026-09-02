/**
 * Wachtpost bij de puntafkortingen in de rekentaal.
 *
 * De parser vouwt `naam.i` naar een vectorindex `naam[i]` voor CalcPAD. Zonder
 * bescherming sloopt die regel elke Nederlandse afkorting met een enkele
 * letter: `t.o.v.` werd `t[o].v.` en `u.c.` werd `u[c].` — zichtbaar in de
 * uitvoer van bladen die op GEREED staan.
 *
 * Twee lookaheads in packages/core/src/parser.ts (foldIdentifierDots) sluiten
 * nu een volgende punt uit. Dit script bewaakt dat, én bewaakt dat de
 * vectorindexering zelf blijft werken — dat is de reden dat de regel bestaat.
 *
 * Draaien:  node scripts/check-afkortingen.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { parse, evaluate, render } from "../packages/core/dist/index.js";

/**
 * Afkortingen die ongeschonden door de parser moeten komen. Ze eindigen alle
 * op een punt — dát is waar de bescherming op aangrijpt.
 */
const AFKORTINGEN = [
  "t.o.v.", "h.o.h.", "i.p.v.", "t.p.v.", "u.c.", "c.t.c.",
  "e.g.", "o.a.", "d.w.z.", "m.b.t.", "b.v.", "excl.", "art.", "max.", "nr.",
  "N.L.", "NB.3.",
];

/**
 * Vormen die juist WÉL gevouwen moeten blijven worden — de puntfold bestaat
 * niet voor niets. Breekt een van deze, dan is de reparatie te ruim geweest.
 */
const VOUWEN = [
  { bron: "Cs.Cd = 3\nCs.Cd\n", verwacht: "3", wat: "dotted identifier Cs.Cd" },
  { bron: "q.tot = 5\nq.tot\n", verwacht: "5", wat: "dotted identifier q.tot" },
];

/**
 * BEKENDE BEPERKING. De bescherming grijpt aan op de afsluitende punt. Een
 * verwijzing zonder punt erachter — "zie Tabel NB.3 hierboven" — is voor de
 * parser niet te onderscheiden van CalcPAD-vectorindexering `cc.3` en wordt
 * dus nog steeds `NB[3]`. Schrijf zulke verwijzingen mét punt, of anders
 * (bijv. "Tabel NB 3"). Deze regel legt dat vast zodat de beperking bekend
 * blijft in plaats van ooit als verrassing terug te komen.
 */
const BEPERKING = { bron: "'Zie Tabel NB.3 hierboven.\n", mangelt: "NB[3]" };

const plat = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

let fouten = 0;

for (const afk of AFKORTINGEN) {
  const uit = plat(render(evaluate(parse(`'Een zin met ${afk} erin.\n`), {})));
  const ok = uit.includes(afk);
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK  " : "FOUT"} ${afk.padEnd(8)} ${ok ? "" : "-> " + uit}`);
}

console.log("");
for (const g of VOUWEN) {
  let uit = "";
  try {
    uit = plat(render(evaluate(parse(g.bron), {})));
  } catch (err) {
    uit = `fout: ${err.message}`;
  }
  const ok = uit.includes(g.verwacht) && !uit.includes("niet gedefinieerd");
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK  " : "FOUT"} ${g.wat.padEnd(28)} ${ok ? "" : "-> " + uit}`);
}

const beperkingUit = plat(render(evaluate(parse(BEPERKING.bron), {})));
const beperkingGeldt = beperkingUit.includes(BEPERKING.mangelt);
console.log(
  `\n  ${beperkingGeldt ? "bekend" : "GEWIJZIGD"}  "Tabel NB.3" zonder afsluitende punt ` +
    `${beperkingGeldt ? "wordt nog steeds NB[3] — zie de toelichting hierboven" : `-> ${beperkingUit}`}`,
);

console.log(
  fouten === 0
    ? "\nAfkortingen blijven heel en de puntfold werkt nog."
    : `\n${fouten} fout(en) — zie foldIdentifierDots in packages/core/src/parser.ts.`,
);
process.exit(fouten === 0 ? 0 : 1);
