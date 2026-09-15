/**
 * Bewaakt de conventie rond de projectvariabele `rekenwijze`.
 *
 * Op de punten waar de referentie-uitwerking aantoonbaar iets anders doet dan de norm rekent
 * een blad béide uitkomsten uit en kiest er één. De conventie:
 *
 *     X_nb = …                                  volgens de norm
 *     X_XC = …                                  volgens de referentie-uitwerking
 *     X    = if(rekenwijze ≡ 1; X_XC; X_nb)     de gehanteerde waarde
 *
 * en die keuze staat áltijd op de laatste stap vóór de u.c., nooit binnen een
 * tussenformule. Zo blijft de rekengang leesbaar en zie je in één oogopslag
 * waar de twee lezingen uiteenlopen.
 *
 * Wat hier misgaat als niemand kijkt: iemand voegt een de referentie-uitwerking-tak toe en
 * vergeet de schakelaar, waarna die tak wordt uitgerekend, netjes wordt
 * afgedrukt en nergens meetelt. Of andersom: de schakelaar staat er wel maar de
 * norm-tak ontbreekt, en dan levert de norm-stand een lege variabele op.
 *
 * Draaien:  node scripts/check-rekenwijze.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const hier = dirname(fileURLToPath(import.meta.url));
const TPL_DIR = join(hier, "../packages/desktop/src/templates");
const OVERSLAAN = new Set(["index.ts", "calcpad-samples.ts", "calcpad-includes.ts"]);

/**
 * `X,XC` en `X_xc` tellen allebei: de evaluator vouwt de komma tot een
 * underscore, en de oudere modules schrijven XC met hoofdletters. De naam zelf
 * mag alles bevatten behalve spaties en een isgelijkteken — variabelen als
 * `φ_t`, `β_H` en `F_b,Rd` moeten er allemaal doorheen komen.
 */
const XC_TAK = /^([^\s=]+?)[,_](?:XC|xc)\s*=/;
const NB_TAK = /^([^\s=]+?)[,_]nb\s*=/;

/**
 * Variabelenamen bevatten komma's, Griekse letters en accenten. Die in een
 * regex proppen vraagt om escape-ellende, dus doen we het met platte
 * tekstvergelijking op de vier schrijfwijzen die voorkomen.
 */
const varianten = (naam) => [`${naam},XC`, `${naam}_XC`, `${naam},xc`, `${naam}_xc`];
const telVoorkomens = (src, naam) =>
  varianten(naam).reduce((n, v) => n + src.split(v).length - 1, 0);

let fouten = 0;
const gevonden = [];

for (const bestand of readdirSync(TPL_DIR).filter((f) => f.endsWith(".ts") && !OVERSLAAN.has(f))) {
  const src = readFileSync(join(TPL_DIR, bestand), "utf8");
  const regels = src.split("\n");

  const xc = new Set(), nb = new Set();
  for (const regel of regels) {
    const a = regel.match(XC_TAK);
    if (a) xc.add(a[1]);
    const b = regel.match(NB_TAK);
    if (b) nb.add(b[1]);
  }
  const schakelt = /rekenwijze\s*≡\s*1/.test(src);
  if (xc.size === 0 && nb.size === 0 && !schakelt) continue;

  const module = bestand.replace(/\.ts$/, "");
  const problemen = [];

  // 1. Een tak zonder schakelaar wordt uitgerekend en nergens gebruikt.
  if ((xc.size > 0 || nb.size > 0) && !schakelt) {
    problemen.push("heeft een de referentie-uitwerking- of norm-tak maar schakelt nergens op `rekenwijze`");
  }
  // 2. Een schakelaar zonder takken kan geen twee lezingen bedienen.
  if (schakelt && xc.size === 0 && nb.size === 0) {
    problemen.push("schakelt op `rekenwijze` maar heeft geen `_XC`- of `_nb`-tak");
  }
  // 3. Elke de referentie-uitwerking-tak moet de schakelaar bereiken — direct of via een
  //    andere tak. Veel takken zijn tussenstappen (β_t0,XC → φ_0,XC → φ_t,XC);
  //    alleen de laatste staat in de `if`. We volgen de keten dus terug: begin
  //    bij wat in een schakelaar staat en trek daar alles naartoe wat in de
  //    definitieregel van een bereikbare tak voorkomt. Wat overblijft wordt
  //    uitgerekend, netjes afgedrukt, en telt nergens mee.
  const bereikbaar = new Set(
    [...xc].filter((n) => varianten(n).some((v) => src.includes(`if(rekenwijze ≡ 1; ${v}`))),
  );
  const definitie = (naam) =>
    regels.find((r) => varianten(naam).some((v) => r.startsWith(`${v} =`) || r.startsWith(`${v}=`))) ?? "";
  let groeide = true;
  while (groeide) {
    groeide = false;
    for (const gekend of [...bereikbaar]) {
      const regel = definitie(gekend);
      for (const kandidaat of xc) {
        if (bereikbaar.has(kandidaat)) continue;
        if (varianten(kandidaat).some((v) => regel.includes(v))) {
          bereikbaar.add(kandidaat);
          groeide = true;
        }
      }
    }
  }
  for (const naam of xc) {
    if (!bereikbaar.has(naam)) {
      problemen.push(`de XC-tak van \`${naam}\` bereikt geen enkele schakelaar — hij wordt berekend en telt nergens mee`);
    }
  }

  gevonden.push({ module, xc: [...xc], nb: [...nb], schakelt, problemen });
  fouten += problemen.length;
}

console.log("Modules met een splitspunt tussen de referentie-uitwerking en de norm:\n");
for (const g of gevonden) {
  const merk = g.problemen.length ? "✗" : "✓";
  console.log(`  ${merk} ${g.module.padEnd(22)} ${g.xc.length} XC-tak(ken), ${g.nb.length} norm-tak(ken)`);
  for (const p of g.problemen) console.log(`      ✗ ${p}`);
}

console.log(
  fouten === 0
    ? `\n${gevonden.length} modules met een splitspunt, alle netjes geschakeld.`
    : `\n${fouten} probleem(en) met de rekenwijze-conventie.`,
);
process.exit(fouten === 0 ? 0 : 1);
