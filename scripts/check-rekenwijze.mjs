/**
 * Bewaakt de conventie rond de projectvariabele `rekenwijze`.
 *
 * Op de punten waar de referentie-uitwerking aantoonbaar iets anders doet dan de norm rekent
 * een blad béide uitkomsten uit en kiest er één. De conventie:
 *
 *     X_nb  = …                                 volgens de norm
 *     X_ref = …                                 volgens de referentie-uitwerking
 *     X     = if(rekenwijze ≡ 1; X_ref; X_nb)   de gehanteerde waarde
 *
 * en die keuze staat op één regel, de plek waar de twee lezingen uiteenlopen;
 * een blad kan zo ook een hele toets aan of uit zetten. Zo blijft de rekengang
 * leesbaar en zie je in één oogopslag waar de verschillen zitten.
 *
 * Wat hier misgaat als niemand kijkt: iemand voegt een referentietak toe en
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
 * `X,ref` en `X_ref` tellen allebei: de evaluator vouwt de komma tot een
 * underscore. De naam zelf mag alles bevatten behalve spaties en een
 * isgelijkteken — variabelen als `φ_t`, `β_H` en `F_b,Rd` moeten er allemaal
 * doorheen komen.
 */
const REF_TAK = /^([^\s=]+?)[,_]ref\s*=/;
const NB_TAK = /^([^\s=]+?)[,_]nb\s*=/;

/**
 * Grootheden die op `_ref` eindigen omdat de rekenregel ze zo noemt, en die
 * dus geen referentietak zijn. Per module: een nieuwe `_ref`-naam telt overal
 * elders gewoon als tak en moet dan een schakelaar bereiken.
 */
const GEEN_TAK = {
  balklaag: ["a", "EI"],   // a_ref en EI_ref: referentiemaat en -stijfheid in k_r
  gording: ["A"],          // A_ref: belaste oppervlakte voor c_pe
  schijfwerking: ["c"],    // c_ref: c_i van de breedste plaat in (9.23)
};

/**
 * Variabelenamen bevatten komma's, Griekse letters en accenten. Die in een
 * regex proppen vraagt om escape-ellende, dus doen we het met platte
 * tekstvergelijking op de twee schrijfwijzen die voorkomen.
 */
const varianten = (naam) => [`${naam},ref`, `${naam}_ref`];
const telVoorkomens = (src, naam) =>
  varianten(naam).reduce((n, v) => n + src.split(v).length - 1, 0);

let fouten = 0;
const gevonden = [];

for (const bestand of readdirSync(TPL_DIR).filter((f) => f.endsWith(".ts") && !OVERSLAAN.has(f))) {
  const src = readFileSync(join(TPL_DIR, bestand), "utf8");
  const regels = src.split("\n");

  const module = bestand.replace(/\.ts$/, "");
  const geenTak = new Set(GEEN_TAK[module] ?? []);
  const ref = new Set(), nb = new Set();
  for (const regel of regels) {
    const a = regel.match(REF_TAK);
    if (a && !geenTak.has(a[1])) ref.add(a[1]);
    const b = regel.match(NB_TAK);
    if (b) nb.add(b[1]);
  }
  const schakelt = /rekenwijze\s*≡\s*1/.test(src);
  if (ref.size === 0 && nb.size === 0 && !schakelt) continue;

  const problemen = [];

  // 1. Een tak zonder schakelaar wordt uitgerekend en nergens gebruikt.
  if ((ref.size > 0 || nb.size > 0) && !schakelt) {
    problemen.push("heeft een referentie- of normtak maar schakelt nergens op `rekenwijze`");
  }
  // 2. Een schakelaar zonder takken kan geen twee lezingen bedienen.
  if (schakelt && ref.size === 0 && nb.size === 0) {
    problemen.push("schakelt op `rekenwijze` maar heeft geen `_ref`- of `_nb`-tak");
  }
  // 3. Elke referentietak moet de schakelaar bereiken — direct of via een
  //    andere tak. Veel takken zijn tussenstappen (β_t0,ref → φ_0,ref → φ_t,ref);
  //    alleen de laatste staat in de `if`. We volgen de keten dus terug: begin
  //    bij wat in een schakelaar staat en trek daar alles naartoe wat in de
  //    definitieregel van een bereikbare tak voorkomt. Wat overblijft wordt
  //    uitgerekend, netjes afgedrukt, en telt nergens mee.
  const bereikbaar = new Set(
    [...ref].filter((n) => varianten(n).some((v) => src.includes(`if(rekenwijze ≡ 1; ${v}`))),
  );
  const definitie = (naam) =>
    regels.find((r) => varianten(naam).some((v) => r.startsWith(`${v} =`) || r.startsWith(`${v}=`))) ?? "";
  let groeide = true;
  while (groeide) {
    groeide = false;
    for (const gekend of [...bereikbaar]) {
      const regel = definitie(gekend);
      for (const kandidaat of ref) {
        if (bereikbaar.has(kandidaat)) continue;
        if (varianten(kandidaat).some((v) => regel.includes(v))) {
          bereikbaar.add(kandidaat);
          groeide = true;
        }
      }
    }
  }
  for (const naam of ref) {
    if (!bereikbaar.has(naam)) {
      problemen.push(`de referentietak van \`${naam}\` bereikt geen enkele schakelaar — hij wordt berekend en telt nergens mee`);
    }
  }

  gevonden.push({ module, ref: [...ref], nb: [...nb], schakelt, problemen });
  fouten += problemen.length;
}

console.log("Modules met een splitspunt tussen de referentie-uitwerking en de norm:\n");
for (const g of gevonden) {
  const merk = g.problemen.length ? "✗" : "✓";
  console.log(`  ${merk} ${g.module.padEnd(22)} ${g.ref.length} referentietak(ken), ${g.nb.length} normtak(ken)`);
  for (const p of g.problemen) console.log(`      ✗ ${p}`);
}

console.log(
  fouten === 0
    ? `\n${gevonden.length} modules met een splitspunt, alle netjes geschakeld.`
    : `\n${fouten} probleem(en) met de rekenwijze-conventie.`,
);
process.exit(fouten === 0 ? 0 : 1);
