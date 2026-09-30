/**
 * check-balklaag-vlijn — tekenen het balklaagbeeld en het blad de juiste V-lijn?
 *
 * De omhullende dwarskrachtenlijn staat in twee helften, beide doorgetrokken:
 * boven de as per x de grootste positieve waarde over de UGT-combinaties,
 * onder de as de grootste negatieve. Twee manieren zijn fout:
 *   - alleen het algebraïsche maximum: bij een ligger op twee steunpunten is de
 *     dwarskracht bij de tweede oplegging negatief, en het maximum toont daar
 *     de lichtste combinatie (alleen permanent) in plaats van de zwaarste;
 *   - per x de grootste absolute waarde: waar de positieve en de negatieve
 *     grens even groot zijn, springt die lijn van +V naar −V zonder dat daar
 *     een last of oplegging zit.
 * Het maximum en het minimum van continue lijnen zijn continu; de omhullende
 * springt dus alleen waar een combinatie zelf springt (puntlast, oplegging).
 *
 * Handberekening, schema 1 (twee steunpunten), L = 5 m:
 *   g = 0,5·0,45 + 0,2 = 0,425 kN/m, q = 2,55·0,45 = 1,1475 kN/m, F = 3 kN
 *   6.10b rij 1 (G + Q): w = 1,2·0,425 + 1,5·1,1475 = 2,23125 kN/m
 *     V(0) = w·L/2 = 5,578 kN,  V(L) = −5,578 kN
 *   6.10b rij 4 (G + F): V(0) = 1,2·0,425·5/2 + 1,5·3/2 = 3,525 kN
 *     net links van het midden V = 1,5·3/2 = 2,25 kN (de verdeelde last heft
 *     zich daar op), net rechts −2,25 kN
 *   6.10a rij 4 (1,35·G + 1,5·0,4·F): in het midden ±0,6·3/2 = ±0,90 kN; de
 *     combinaties zonder puntlast zijn daar 0
 *   → boven de as +5,578 kN bij de eerste oplegging, onder de as −5,578 kN bij
 *     de tweede; bij de puntlast springt de lijn van +2,25 naar 0 (boven) en
 *     van 0 naar −2,25 kN (onder).
 *
 * Draaien: node scripts/check-balklaag-vlijn.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const ts = createRequire(import.meta.url)(join(repo, "node_modules", "typescript"));
const bron = readFileSync(join(repo, "packages/desktop/src/components/calc/balklaagLijnen.ts"), "utf8");
const map = mkdtempSync(join(tmpdir(), "vlijn-"));
const pad = join(map, "balklaagLijnen.mjs");
writeFileSync(pad, ts.transpileModule(bron, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText);
const m = await import(pathToFileURL(pad).href);
rmSync(map, { recursive: true, force: true });

let fout = 0;
const toets = (ok, tekst) => { console.log(`  ${ok ? "OK  " : "FOUT"}  ${tekst}`); if (!ok) fout++; };
const bijna = (a, b, tol = 1e-3) => Math.abs(a - b) <= tol;

if (typeof m.vOmhullende !== "function") {
  toets(false, "balklaagLijnen.ts exporteert vOmhullende() voor de omhullende V-lijn");
  process.exit(1);
}

const factoren = { gG: 1.2, gQ: 1.5, gGa: 1.35, gQa: 1.5 * 0.4 };
const LASTEN = { g: 0.5 * 0.45 + 0.2, q: 2.55 * 0.45, F: 3 };

function omhullende(ligger, lasten = LASTEN) {
  const combis = m.ugtCombinaties(m.belastinggevallen(ligger, lasten), factoren).map((c) => m.lijnen(ligger, c.set));
  return { combis, ...m.vOmhullende(combis.map((c) => c.V)) };
}

/** Plaatsen waar een combinatie zelf springt: opleggingen en puntlasten. */
function sprongplaatsen(g) {
  const tot = m.totaal(g);
  const uit = [0, g.L1 / 2, g.L1, tot];
  if (g.schema === 3) uit.push(g.L1 + g.L2 / 2);
  return uit;
}

/**
 * Plaatsen waar f tussen twee naburige punten meer verandert dan de snelst
 * veranderende combinatie, buiten de sprongplaatsen. Leeg = geen schijnsprong.
 */
function schijnsprongen(f, combis, g, n = 4000) {
  const tot = m.totaal(g);
  const vast = sprongplaatsen(g);
  const uit = [];
  for (let i = 0; i < n; i++) {
    const x0 = (tot * i) / n;
    const x1 = (tot * (i + 1)) / n;
    if (vast.some((b) => b >= x0 - 1e-12 && b <= x1 + 1e-12)) continue;
    const grens = Math.max(...combis.map((c) => Math.abs(c.V(x1) - c.V(x0))));
    if (Math.abs(f(x1) - f(x0)) > grens + 1e-9) uit.push(x0);
  }
  return uit;
}

// ── schema 1: twee steunpunten ───────────────────────────────────────────
{
  const L = 5;
  const { boven, onder } = omhullende({ schema: 1, L1: L, a: 0, L2: 0, EI: 1000 });
  toets(bijna(boven(0), 5.578), `schema 1: boven de as bij de eerste oplegging ${boven(0).toFixed(3)} kN = +5,578 kN`);
  toets(bijna(onder(L), -5.578), `schema 1: onder de as bij de tweede oplegging ${onder(L).toFixed(3)} kN = −5,578 kN`);
  toets(bijna(onder(0), 0) && bijna(boven(L), 0), "schema 1: geen trek in de opleggingen (onder 0 bij de eerste, boven 0 bij de tweede)");
  let anti = true;
  for (let i = 0; i <= 200; i++) {
    const x = (L * i) / 200;
    if (Math.abs(x - L / 2) < 1e-9) continue;          // de sprong van de puntlast
    if (!bijna(boven(x), -onder(L - x))) anti = false;
  }
  toets(anti, "schema 1: de helft boven de as is het spiegelbeeld van die onder de as");
  const e = 1e-7;
  toets(bijna(boven(L / 2 - e), 2.25) && bijna(boven(L / 2 + e), 0) && bijna(onder(L / 2 - e), 0) && bijna(onder(L / 2 + e), -2.25),
    `schema 1: sprong van de puntlast blijft staan (boven ${boven(L / 2 - e).toFixed(3)} → ${boven(L / 2 + e).toFixed(3)}, onder ${onder(L / 2 - e).toFixed(3)} → ${onder(L / 2 + e).toFixed(3)} kN)`);
}

// ── alle schema's: definitie en geen schijnsprongen ──────────────────────
const GEVALLEN = [
  { titel: "schema 1, 5,00 m", g: { schema: 1, L1: 5, a: 0, L2: 0, EI: 1000 } },
  { titel: "schema 2, overstek 4,20 + 0,80 m", g: { schema: 2, L1: 4.2, a: 0.8, L2: 0, EI: 1000 } },
  { titel: "schema 2, overstek 3,00 + 1,50 m (trek in de eerste oplegging)", g: { schema: 2, L1: 3.0, a: 1.5, L2: 0, EI: 1000 }, trek: true },
  { titel: "schema 3, twee velden 4,00 + 3,00 m", g: { schema: 3, L1: 4, a: 0, L2: 3, EI: 1000 } },
  { titel: "schema 3, twee velden 3,60 + 3,60 m zonder puntlast", g: { schema: 3, L1: 3.6, a: 0, L2: 3.6, EI: 1000 }, lasten: { ...LASTEN, F: 0 } },
  { titel: "schema 3, twee velden 3,00 + 4,50 m", g: { schema: 3, L1: 3, a: 0, L2: 4.5, EI: 1000 } },
];
// De oude lijn (per x de grootste absolute waarde), alleen om te laten zien
// dat de sprongtoets een schijnsprong ook echt vangt.
const grootsteAbsoluut = (fs) => (x) => {
  const w = fs.map((f) => f(x));
  const hi = Math.max(...w), lo = Math.min(...w);
  return Math.abs(lo) > Math.abs(hi) ? lo : hi;
};
let oudeSprongen = 0;
for (const { titel, g, lasten, trek } of GEVALLEN) {
  const { combis, boven, onder } = omhullende(g, lasten);
  const tot = m.totaal(g);
  let def = true;
  for (let i = 0; i <= 400; i++) {
    const x = (tot * i) / 400;
    const w = combis.map((c) => c.V(x));
    if (boven(x) < 0 || onder(x) > 0) def = false;
    if (!bijna(boven(x), Math.max(0, ...w), 1e-9) || !bijna(onder(x), Math.min(0, ...w), 1e-9)) def = false;
  }
  toets(def, `${titel}: boven = max(0; grootste), onder = min(0; kleinste) over de combinaties`);
  if (trek) toets(onder(0) < -0.01 && boven(0) > 0.01, `${titel}: beide helften bij de eerste oplegging (${boven(0).toFixed(3)} en ${onder(0).toFixed(3)} kN)`);
  const sb = schijnsprongen(boven, combis, g);
  const so = schijnsprongen(onder, combis, g);
  toets(sb.length === 0 && so.length === 0,
    `${titel}: geen sprong buiten puntlasten en opleggingen` +
    (sb.length + so.length ? ` (bij x = ${[...sb, ...so].slice(0, 3).map((x) => x.toFixed(3)).join(", ")} m)` : ""));
  oudeSprongen += schijnsprongen(grootsteAbsoluut(combis.map((c) => c.V)), combis, g).length;
}
toets(oudeSprongen > 0, `controle zelf: de sprongtoets vangt de schijnsprong van 'grootste absolute waarde' (${oudeSprongen}×)`);

// ── het beeld: BalklaagDesigner tekent de twee helften ───────────────────
// De tekening zelf draait in React; hier alleen of de V-lijn de omhullende uit
// balklaagLijnen.ts gebruikt, als twee doorgetrokken lijnen.
{
  const bron = readFileSync(join(repo, "packages/desktop/src/components/calc/BalklaagDesigner.tsx"), "utf8");
  const vLijnen = [...bron.matchAll(/<KrachtenLijn\b[\s\S]*?\/>/g)].map((t) => t[0]).filter((t) => /kleur=\{KLEUR_V\}/.test(t));
  toets(/\bvOmhullende\(/.test(bron), "beeld: BalklaagDesigner rekent de V-lijn met vOmhullende()");
  toets(vLijnen.length === 2 && /f=\{Vomh\.boven\}/.test(vLijnen[0]) && /f=\{Vomh\.onder\}/.test(vLijnen[1]),
    `beeld: twee V-lijnen, boven en onder de as (gevonden: ${vLijnen.length})`);
  toets(vLijnen.every((t) => !/\bstippel=/.test(t)), "beeld: beide V-lijnen doorgetrokken");
}

// ── het rekenblad zelf: de omhullende in §5 (SVG) ─────────────────────────
// Basisgeval van check-balklaag-schema3.mjs. De V-lijn bestaat uit twee
// doorgetrokken vlakken: het eerste nergens onder, het tweede nergens boven de
// as. Bij elke rand van een veld waar het vlak van de as af staat, staat een
// waarde met het teken van het vlak; de waarden overlappen elkaar niet en
// blijven binnen de tekening, ook bij een heel kort eerste of tweede veld.
{
  const { parse, evaluate, render } = await import(pathToFileURL(join(repo, "packages/core/dist/index.js")).href);
  const { laadTemplate } = await import(pathToFileURL(join(repo, "scripts/lib/refcheck.mjs")).href);
  const BASIS = {
    profiel: "12", sterkteklasse: "2", klimaat: "1", duurklasse: "2", schema: "1", ligger: "1",
    L_d: "5000", a_opl: "50", hoh: "600", t_vloer: "18", E_beschot: "7000", b_vloer: "5",
    a_over: "0", L_veld2: "0", b_sparing: "0", l_staart: "0", b_ond: "0", b_zelf: "0", h_zelf: "0",
    G_k: "1.0", Q_k: "1.75", F_k: "2", belastingcat: "2",
    "ψ_0_zelf": "0", "ψ_2_zelf": "0", controleer: "1", grensfactor: "0.004",
    controleer_trilling: "0", "ζ": "0.01", a_tril: "1", b_tril: "120",
  };
  const blad = parse(laadTemplate("balklaag.ts"));
  const punten = (s) => s.trim().split(/\s+/).map((p) => p.split(",").map(Number));
  // Tekstvak van een label, 11 px vet: ongeveer 5,6 px per teken, 8 px hoog.
  const vak = (t) => {
    const b = 5.6 * t.tekst.length;
    const x0 = t.anker === "end" ? t.x - b : t.anker === "middle" ? t.x - b / 2 : t.x;
    return { x0, x1: x0 + b, y0: t.y - 8, y1: t.y + 1 };
  };

  for (const { titel, invoer, trekEerste, trekLaatste } of [
    { titel: "schema 1, 5,00 m", invoer: {} },
    { titel: "schema 2, overstek 3,00 + 1,50 m", invoer: { schema: "2", L_d: "2950", a_over: "1500" }, trekEerste: true },
    { titel: "schema 3, twee velden 3,00 + 4,50 m", invoer: { schema: "3", L_d: "2950", L_veld2: "4500" } },
    { titel: "schema 3, twee velden 1,00 + 6,00 m", invoer: { schema: "3", L_d: "950", L_veld2: "6000" }, trekEerste: true },
    { titel: "schema 3, twee velden 6,00 + 1,00 m", invoer: { schema: "3", L_d: "5950", L_veld2: "1000" }, trekLaatste: true },
  ]) {
    const html = render(evaluate(blad, { ...BASIS, ...invoer }, { CC: 2, K_FI: 1, rekenwijze: 1 }));
    const svg = /<svg class="omhullende"[\s\S]*?<\/svg>/.exec(html)?.[0] ?? "";
    const vlakken = [...svg.matchAll(/<polygon points="([^"]+)" style="(fill:rgba\(59,130,246,[^"]*)"/g)];
    if (vlakken.length !== 2) {
      toets(false, `blad ${titel}: twee V-vlakken in de SVG van §5 (gevonden: ${vlakken.length})`);
      continue;
    }
    toets(vlakken.every((v) => !v[2].includes("dasharray")), `blad ${titel}: beide V-vlakken doorgetrokken`);
    const [bp, op] = vlakken.map((v) => punten(v[1]));
    const as = bp[0][1];
    toets(bp.every(([, y]) => y <= as + 0.01) && op.every(([, y]) => y >= as - 0.01),
      `blad ${titel}: positieve helft nergens onder, negatieve nergens boven de as`);

    // De waarden van de V-lijn (blauw). Randpunten van de vlakken: 1 = begin,
    // 26 = links van de tweede oplegging, 27 = rechts ervan, 52 = eind van veld 2.
    const teksten = [...svg.matchAll(/<text x="([^"]+)" y="([^"]+)"([^>]*)>(-?[\d.]+)<\/text>/g)]
      .filter((t) => t[3].includes("fill:#2563eb"))
      .map((t) => ({ x: Number(t[1]), y: Number(t[2]), anker: /text-anchor="(\w+)"/.exec(t[3])?.[1] ?? "start", tekst: t[4], v: Number(t[4]) }));
    const randen = [[1, "eerste oplegging"], [26, "tweede oplegging (links)"]];
    if (invoer.schema === "3") randen.push([27, "tweede oplegging (rechts)"], [52, "derde oplegging"]);
    else if (invoer.schema === "2") randen.push([27, "tweede oplegging (rechts)"]);
    for (const [vlak, teken, naam] of [[bp, 1, "positief"], [op, -1, "negatief"]]) {
      for (const [k, plek] of randen) {
        const [px, py] = vlak[k];
        if (Math.abs(as - py) < 1) continue;
        const t = teksten.find((t) => Math.abs(t.x - px) <= 15 && Math.abs(t.y - py) <= 20 && Math.sign(t.v) === teken && Math.sign(as - t.y) === teken);
        toets(!!t, `blad ${titel}: waarde ${naam} bij de ${plek}${t ? ` (${t.v} kN)` : " ontbreekt"}`);
      }
    }
    const vakken = teksten.map((t) => ({ t, ...vak(t) }));
    const botsing = [];
    for (let i = 0; i < vakken.length; i++) {
      for (let j = i + 1; j < vakken.length; j++) {
        const a = vakken[i], b = vakken[j];
        if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) botsing.push(`${a.t.tekst} en ${b.t.tekst}`);
      }
    }
    toets(botsing.length === 0, `blad ${titel}: waarden van de V-lijn overlappen niet${botsing.length ? ` (${botsing.join("; ")})` : ""}`);
    const [, , bw, bh] = (/viewbox="([^"]+)"/.exec(svg)?.[1] ?? "0 0 0 0").split(/\s+/).map(Number);
    const buiten = vakken.filter((v) => v.x0 < 0 || v.x1 > bw || v.y0 < 0 || v.y1 > bh).map((v) => v.t.tekst);
    toets(buiten.length === 0, `blad ${titel}: waarden van de V-lijn binnen de tekening${buiten.length ? ` (buiten: ${buiten.join(", ")})` : ""}`);

    if (!invoer.schema) {
      const links = as - bp[1][1];
      const rechts = op[op.length - 2][1] - as;
      toets(links > 0 && rechts > 0 && Math.abs(links - rechts) <= 0.02 * links,
        `blad ${titel}: V-lijn antisymmetrisch (links ${links.toFixed(1)} px boven, rechts ${rechts.toFixed(1)} px onder de as)`);
    }
    if (trekEerste) toets(op[1][1] > as + 1, `blad ${titel}: trek in de eerste oplegging zichtbaar onder de as`);
    if (trekLaatste) toets(bp[52][1] < as - 1, `blad ${titel}: trek in de derde oplegging zichtbaar boven de as`);
  }
}

if (fout) {
  console.log(`\n${fout} fout(en)`);
  process.exit(1);
}
console.log("\nbalklaag V-lijn: alles in orde");
