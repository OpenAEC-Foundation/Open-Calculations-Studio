/**
 * Gedeelde bouwstenen voor de controlescripts `check-<module>.mjs`.
 *
 * Elk zo'n script zet de invoer van een de referentie-uitwerking-referentieblad in de module,
 * rekent hem door en vergelijkt de tussenstappen met het afgedrukte getal.
 * Bekende afwijkingen worden apart gemeld en tellen niet als fout — die staan
 * in docs/afwijkingen-referentie.md en zijn juist bewuste keuzes.
 *
 * Tolerantie volgt uit de gedocumenteerde precisie: staat er in het
 * referentieblad `96`, dan toetsen we op ±0,5; staat er `45,7`, dan op ±0,05.
 * Zo bewijst het script precies wat er is vastgesteld — niet meer.
 */
import { parse, evaluate, render } from "../../packages/core/dist/index.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const TPL_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../packages/desktop/src/templates");

/** Haalt de template-literal uit een `export const x = \`…\`;`-bestand. */
export function laadTemplate(bestand) {
  const src = readFileSync(join(TPL_DIR, bestand), "utf8");
  return src.slice(src.indexOf("`") + 1, src.lastIndexOf("`"));
}

/**
 * Rekent het blad door en geeft de var-displays plus de platte tekst terug.
 *
 * `initialScope` is voor bladen die projectgegevens gebruiken — K_FI en
 * verwanten staan in de app vóór de eerste regel in de scope, niet als
 * invoerveld. Zonder die derde parameter rekent zo'n blad met NaN door.
 */
export function reken(tpl, selectValues, initialScope) {
  const nodes = evaluate(parse(tpl), selectValues, initialScope);
  const values = {};
  const loop = (lijst) => {
    for (const n of lijst) {
      if (n.type === "var-display") values[n.name] = parseFloat(String(n.result).replace(",", "."));
      if (Array.isArray(n.children)) loop(n.children);
      if (Array.isArray(n.nodes)) loop(n.nodes);
    }
  };
  loop(nodes);
  const text = render(nodes).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return { values, text };
}

/** ±een halve eenheid van het laatst gedrukte cijfer. `45,7` → 0,05. */
function tolerantie(verwachtStr) {
  const m = String(verwachtStr).replace(",", ".").match(/\.(\d+)/);
  return 0.5 * Math.pow(10, -(m ? m[1].length : 0));
}

const getal = (s) => parseFloat(String(s).replace(",", "."));

/**
 * Leesbaar weergeven zonder kleine getallen te verminken — een vast aantal
 * decimalen maakte van i_r = 0,000027 gewoon `0`.
 */
const toon = (v) =>
  v === undefined || !Number.isFinite(v) ? String(v ?? "—") : String(Number(v.toPrecision(6)));

/**
 * Een verwachting is normaal de gedrukte waarde als string. Ligt de
 * referentiewaarde precies op een afrondgrens, dan mag een set een eigen
 * tolerantie meegeven: `{ waarde: "0.87", tol: 0.01, waarom: "…" }`.
 */
function ontleed(verwacht) {
  if (typeof verwacht === "object" && verwacht !== null) {
    return { doel: getal(verwacht.waarde), tol: verwacht.tol, str: verwacht.waarde, waarom: verwacht.waarom };
  }
  return { doel: getal(verwacht), tol: tolerantie(verwacht), str: String(verwacht) };
}

/**
 * Toetst één referentieset.
 *
 * @param naam        omschrijving van het referentieblad
 * @param got         {values, text} uit reken()
 * @param verwacht    { variabele: "gedrukte waarde" } — normconform, moet kloppen
 * @param afwijkend   { variabele: "gedrukte waarde" } — bekende de referentie-uitwerking-afwijking
 * @param afgeleid    { variabele: getal } — waarden die niet als var-display in
 *                    het blad staan maar uit de tekst zijn gehaald
 * @returns aantal fouten
 */
export function toets(naam, got, verwacht, afwijkend = {}, afgeleid = {}) {
  console.log(`\n${naam}`);
  let fouten = 0;
  const alle = { ...got.values, ...afgeleid };

  for (const [variabele, verwachting] of Object.entries(verwacht)) {
    const ons = alle[variabele];
    const { doel, tol, str, waarom } = ontleed(verwachting);
    // De 1e-9 vangt drijvendekomma-ruis op precies-op-de-grens gevallen af:
    // 59,85 − 59,8 levert 0,050000000000004 op en zou anders zakken.
    const ok = ons !== undefined && Number.isFinite(ons) && Math.abs(ons - doel) <= tol + 1e-9;
    if (!ok) fouten++;
    console.log(
      `  ${ok ? "OK    " : "FOUT  "} ${variabele.padEnd(10)} ons ${toon(ons).padStart(10)}   referentie ${str}` +
        (waarom ? `   [${waarom}]` : ""),
    );
  }

  for (const [variabele, verwachting] of Object.entries(afwijkend)) {
    const { str } = ontleed(verwachting);
    console.log(`  afwijkend ${variabele.padEnd(8)} ons ${toon(alle[variabele]).padStart(10)}   de referentie-uitwerking ${str}   (zie het register)`);
  }

  return fouten;
}

/**
 * Draait dezelfde referentiesets nóg een keer in de norm-stand
 * (`rekenwijze` = 0) en controleert wat daar te controleren valt.
 *
 * Die stand heeft per definitie géén referentieblad — er bestaat geen
 * referentie-uitwerking van wat de norm zou geven. Wat wél te toetsen is:
 *
 *   1. elke grootheid blijft een eindig getal (een tak die alleen in deze stand
 *      loopt sterft anders stilletjes af op een NaN of een lege variabele);
 *   2. de opgegeven grootheden bewegen de verwachte kant op ten opzichte van de
 *      de referentie-uitwerking-stand — dat is de enige inhoudelijke uitspraak die zonder
 *      referentie hard te maken is.
 *
 * @param richting  { variabele: "lager" | "hoger" | "gelijk" } t.o.v. de referentie-uitwerking
 */
export function toetsNormStand(naam, xc, nb, richting = {}) {
  console.log(`
${naam}  — norm-stand`);
  let fouten = 0;
  const stuk = [];
  for (const [k, v] of Object.entries(nb.values)) {
    if (!Number.isFinite(v)) stuk.push(k);
  }
  if (stuk.length) {
    fouten++;
    console.log(`  FOUT   niet-eindige waarden: ${stuk.join(", ")}`);
  } else {
    console.log(`  OK     alle ${Object.keys(nb.values).length} grootheden eindig`);
  }
  for (const [variabele, wil] of Object.entries(richting)) {
    const a = xc.values[variabele], b = nb.values[variabele];
    const ok =
      wil === "gelijk" ? Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a))
      : wil === "lager" ? b < a
      : b > a;
    if (!ok) fouten++;
    console.log(
      `  ${ok ? "OK    " : "FOUT  "} ${variabele.padEnd(10)} norm ${toon(b).padStart(10)}` +
        `   de referentie-uitwerking ${toon(a).padStart(10)}   verwacht ${wil}`,
    );
  }
  return fouten;
}

/** Sluit het script af met de gebruikelijke samenvatting en exitcode. */
export function afronden(fouten, module) {
  console.log(
    fouten === 0
      ? `\n${module}: alle referenties exact — op de gemarkeerde afwijkingen na.`
      : `\n${module}: ${fouten} afwijking(en) die niet in het register staan.`,
  );
  process.exit(fouten === 0 ? 0 : 1);
}
