/**
 * Controlescript voor de rekenversie en het bijwerken van bladen
 * (packages/desktop/src/components/calc/bladVersie.ts).
 *
 *   rekenversie        7 hextekens, stabiel (FNV-1a over UTF-8, vaste
 *                      referentiewaarde), ongevoelig voor regeleinden, BOM,
 *                      spaties aan het regeleinde en lege slotregels; wel
 *                      gevoelig voor elke echte wijziging
 *   isVerouderd        alleen bij een bekende module met een andere tekst;
 *                      nooit zonder of met een onbekende templateId
 *   invoervelden       `?`-velden en keuzelijsten, ook binnen #if en #repeat
 *   vergelijkInvoer    waarden behouden, vervallen en nieuw; instellingen van
 *                      het beeld (geen veld in de oude tekst) blijven staan
 *   verliestInvoer     ingevulde invoer die bij bijwerken wegvalt; het scherm
 *                      klapt zo'n blad vanzelf open
 *   vergelijkUitkomst  maatgevende UC, oordeel en veranderende UC-waarden op
 *                      twee decimalen
 *   regelverschil      regels alleen in de oude of alleen in de nieuwe tekst
 *
 * En één keer het hele pad: een oud en een nieuw blad met de rekenkern
 * doorgerekend, zoals het vergelijkingsscherm dat doet. Tot slot de
 * vertalingen: elke gebruikte sleutel `bladVersie.…` in nl en en.
 *
 * Node 24 laadt het .ts-bestand rechtstreeks (typen worden weggestreept).
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 *
 * Draaien:  node scripts/check-blad-bijwerken.mjs
 */
import { readFileSync } from "node:fs";
import { parse, evaluate } from "../packages/core/dist/index.js";
import {
  VERSIE_LENGTE,
  huidigeModuletekst,
  invoervelden,
  isUcNaam,
  isVerouderd,
  normaliseerBladtekst,
  regelverschil,
  rekenversie,
  veldTekst,
  vergelijkInvoer,
  vergelijkUitkomst,
  verliestInvoer,
  zelfdeRekentekst,
  zelfdeUc,
} from "../packages/desktop/src/components/calc/bladVersie.ts";

let fouten = 0;
let aantal = 0;
const meld = (ok, wat, detail = "") => {
  aantal++;
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK  " : "FOUT"} ${wat}${ok || !detail ? "" : "  -> " + detail}`);
};
const gelijk = (a, b, wat) => meld(JSON.stringify(a) === JSON.stringify(b), wat, `${JSON.stringify(a)} tegen ${JSON.stringify(b)}`);

// ── 1. Rekenversie ───────────────────────────────────────────────────────────
console.log("Rekenversie:");
{
  // FNV-1a 32 van "hello" is 0x4f9f2cab; de versie is daarvan de eerste 7 tekens.
  gelijk(rekenversie("hello"), "4f9f2ca", "vaste referentiewaarde (FNV-1a van \"hello\")");
  const blad = "\"Balk — test\n'Invoer\nL = ?*(mm)\nq = 2 kN/m\nUC_max = q*L/(10kN)\n";
  const v = rekenversie(blad);
  meld(new RegExp(`^[0-9a-f]{${VERSIE_LENGTE}}$`).test(v), `${VERSIE_LENGTE} hextekens (${v})`);
  gelijk(rekenversie(blad), v, "twee keer dezelfde uitkomst");
  gelijk(rekenversie(blad.replace(/\n/g, "\r\n")), v, "CRLF geeft dezelfde versie");
  gelijk(rekenversie(blad.replace(/\n/g, "\r")), v, "alleen CR geeft dezelfde versie");
  gelijk(rekenversie("﻿" + blad), v, "BOM telt niet mee");
  gelijk(rekenversie(blad.replace(/\n/g, "  \t\n")), v, "spaties aan het regeleinde tellen niet mee");
  gelijk(rekenversie(blad + "\n\n\n"), v, "lege regels aan het eind tellen niet mee");
  gelijk(rekenversie(blad.trimEnd()), v, "zonder slotregeleinde dezelfde versie");
  meld(rekenversie(blad.replace("2 kN/m", "3 kN/m")) !== v, "een ander getal geeft een andere versie");
  meld(rekenversie(blad.replace("q = 2", "q  = 2")) !== v, "een spatie binnen de regel telt wél");
  meld(rekenversie(blad.replace("—", "-")) !== v, "een ander teken (— tegen -) telt wél");
  meld(rekenversie("\n" + blad) !== v, "een lege regel aan het begin telt wél");
  gelijk(normaliseerBladtekst("a  \r\nb\t\r\n\r\n"), "a\nb", "normaliseren: regeleinden, slotspaties, slotregels");
  meld(zelfdeRekentekst(blad, blad.replace(/\n/g, "\r\n")), "zelfdeRekentekst: CRLF en LF gelijk");
  meld(!zelfdeRekentekst(blad, blad.replace("2 kN", "4 kN")), "zelfdeRekentekst: andere inhoud ongelijk");
  // Veel verschillende teksten: het geheugen blijft begrensd en de uitkomst juist.
  const eerst = rekenversie("tekst 0");
  for (let i = 1; i < 100; i++) rekenversie(`tekst ${i}`);
  gelijk(rekenversie("tekst 0"), eerst, "na 100 andere teksten nog dezelfde versie");
}

// ── 2. Verouderd ─────────────────────────────────────────────────────────────
console.log("Verouderd blad herkennen:");
{
  const sjablonen = { balk: "\"Balk\nL = ?*(mm)\n", kolom: "\"Kolom\nh = ?*(mm)\n" };
  meld(!isVerouderd({ templateId: "balk", source: sjablonen.balk }, sjablonen), "gelijke tekst: niet verouderd");
  meld(!isVerouderd({ templateId: "balk", source: sjablonen.balk.replace(/\n/g, "\r\n") }, sjablonen),
    "alleen andere regeleinden: niet verouderd");
  meld(isVerouderd({ templateId: "balk", source: "\"Balk\nL = ?*(m)\n" }, sjablonen), "andere tekst: verouderd");
  meld(!isVerouderd({ templateId: "", source: "iets" }, sjablonen), "zonder templateId: geen melding");
  meld(!isVerouderd({ source: "iets" }, sjablonen), "templateId ontbreekt: geen melding");
  meld(!isVerouderd({ templateId: "bestaat-niet", source: "iets" }, sjablonen), "onbekende templateId: geen melding");
  meld(!isVerouderd({ templateId: "constructor", source: "iets" }, sjablonen), "templateId \"constructor\": geen melding");
  meld(!isVerouderd({ templateId: "toString", source: "iets" }, sjablonen), "templateId \"toString\": geen melding");
  gelijk(huidigeModuletekst({ templateId: "kolom", source: "" }, sjablonen), sjablonen.kolom, "huidige moduletekst gevonden");
  gelijk(huidigeModuletekst({ templateId: "x", source: "" }, sjablonen), null, "geen moduletekst bij onbekende id");
}

// ── 3. Invoervelden ──────────────────────────────────────────────────────────
console.log("Invoervelden:");
const OUD = `"Balk — test
'Invoer
L = ?*(mm)
q = ?*(kN/m)
k_oud = ?
@select klasse "Sterkteklasse"
  C18 = 1
  C24 = 2
@end
#if klasse == 2
  f = ?*(N/mm^2)
#end if
M = q*L^2/8 to kN*m
M_Rd = 10 kN*m
UC_M = M/M_Rd
UC_V = 0.3
UC_max = max(UC_M; UC_V)
'<b>Maatgevende UC = 'UC_max'</b> → voldoet
`;
const NIEUW = `"Balk — test
'Invoer
L = ?*(mm)
q = ?*(kN/m)
@select klasse "Sterkteklasse"
  C18 = 1
  C24 = 2
@end
#if klasse == 2
  f = ?*(N/mm^2)
#end if
#repeat 2
  g_bl = ?*(kN/m)
#end repeat
@select kmod "Klimaatklasse"
  klasse 1 = 1
  klasse 2 = 2
@end
M = q*L^2/8 + g_bl*L^2/8 to kN*m
M_Rd = 8 kN*m
UC_M = M/M_Rd
UC_V = 0.3
UC_nieuw = 0.2
UC_max = max(UC_M; UC_V)
'<b>Maatgevende UC = 'UC_max'</b> → voldoet
`;
const veldenOud = invoervelden(parse(OUD));
const veldenNieuw = invoervelden(parse(NIEUW));
{
  gelijk(veldenOud.map((v) => v.naam), ["L", "q", "k_oud", "klasse", "f"], "oude tekst: velden in bladvolgorde, ook binnen #if");
  gelijk(veldenNieuw.map((v) => v.naam), ["L", "q", "klasse", "f", "g_bl", "kmod"],
    "nieuwe tekst: ook binnen #repeat, dubbele naam één keer");
  const L = veldenOud.find((v) => v.naam === "L");
  gelijk([L.soort, L.beginwaarde, L.eenheid], ["invoer", "0", "mm"], "?-veld: beginwaarde 0, eenheid mm");
  const kl = veldenOud.find((v) => v.naam === "klasse");
  gelijk([kl.soort, kl.beginwaarde], ["keuze", "1"], "keuzelijst: beginwaarde is de eerste keuze");
  gelijk(veldTekst(kl, "2"), "C24", "keuzelijst toont de tekst van de keuze");
  gelijk(veldTekst(L, "3600"), "3600 mm", "?-veld toont getal en eenheid");
  gelijk(veldTekst(L, ""), "0 mm", "leeg ?-veld telt als 0");
  gelijk(veldTekst(veldenOud.find((v) => v.naam === "k_oud"), "0.4"), "0.4", "?-veld zonder eenheid");
}

// ── 4. Waarden behouden, vervallen en nieuw ──────────────────────────────────
console.log("Waarden bij bijwerken:");
const WAARDEN = { L: "3600", q: "2.5", k_oud: "0.4", klasse: "2", f: "24", g_bl: "0.1", zoom_beeld: "1.5" };
const invoer = vergelijkInvoer(WAARDEN, veldenOud, veldenNieuw);
{
  gelijk(invoer.behouden, ["L", "q", "klasse", "f"], "behouden: velden die in beide staan");
  gelijk(invoer.vervallen.map((v) => [v.veld.naam, v.waarde]), [["k_oud", "0.4"]], "vervallen: veld alleen in de oude tekst, met zijn waarde");
  gelijk(invoer.nieuw.map((v) => [v.veld.naam, v.waarde ?? null]), [["g_bl", "0.1"], ["kmod", null]],
    "nieuw: al ingevulde waarde (door het beeld) of niets");
  gelijk(invoer.waarden, { L: "3600", q: "2.5", klasse: "2", f: "24", g_bl: "0.1", zoom_beeld: "1.5" },
    "na bijwerken: behouden waarden, beeldinstelling blijft, vervallen weg");
  meld(WAARDEN.k_oud === "0.4", "de oorspronkelijke waarden blijven ongemoeid");
  const leeg = vergelijkInvoer({}, veldenOud, veldenNieuw);
  gelijk(leeg.vervallen.map((v) => [v.veld.naam, v.waarde ?? null]), [["k_oud", null]], "vervallen veld zonder waarde");
  gelijk(leeg.waarden, {}, "lege invoer blijft leeg");
  const zelfde = vergelijkInvoer(WAARDEN, veldenOud, veldenOud);
  gelijk([zelfde.vervallen.length, zelfde.nieuw.length], [0, 0], "zelfde tekst: niets vervalt, niets nieuw");
  gelijk(zelfde.waarden, WAARDEN, "zelfde tekst: alle waarden blijven");
  // Verlies van ingevulde invoer: die rij klapt in het scherm vanzelf open.
  meld(verliestInvoer(invoer), "verliestInvoer: k_oud had een waarde");
  meld(!verliestInvoer(leeg), "verliestInvoer: vervallen veld zonder waarde is geen verlies");
  meld(!verliestInvoer(vergelijkInvoer({ ...WAARDEN, k_oud: " " }, veldenOud, veldenNieuw)), "verliestInvoer: een leeg veld is geen verlies");
  meld(!verliestInvoer(zelfde), "verliestInvoer: zelfde tekst");
}

// ── 5. Uitkomsten vergelijken ────────────────────────────────────────────────
console.log("Uitkomsten vergelijken:");
{
  meld(isUcNaam("UC") && isUcNaam("UC_M") && isUcNaam("uc_y") && isUcNaam("UC_max"), "UC-namen herkend");
  meld(!isUcNaam("UCL") && !isUcNaam("M_UC") && !isUcNaam("u_c"), "geen UC: UCL, M_UC, u_c");
  meld(zelfdeUc(0.812, 0.814), "0,812 en 0,814 zijn op twee decimalen gelijk");
  meld(!zelfdeUc(0.81, 0.82), "0,81 en 0,82 verschillen");
  meld(zelfdeUc(null, null) && !zelfdeUc(null, 0.5) && !zelfdeUc(0.5, undefined), "ontbrekende UC");
  meld(zelfdeUc(Infinity, Infinity) && !zelfdeUc(Infinity, 1), "oneindige UC");

  const oud = { resultaat: { uc: 0.81, voldoet: true }, getallen: { UC_M: 0.81, UC_V: 0.3, UC_max: 0.81, UC_weg: 0.5, M: 12 } };
  const nieuw = { resultaat: { uc: 1.04, voldoet: false }, getallen: { UC_M: 1.04, UC_V: 0.301, UC_max: 1.04, UC_nieuw: 0.2, M: 14 } };
  const v = vergelijkUitkomst(oud, nieuw);
  gelijk([v.ucOud, v.ucNieuw, v.ucVeranderd], [0.81, 1.04, true], "maatgevende UC oud → nieuw");
  gelijk([v.oordeelOud, v.oordeelNieuw, v.oordeelVeranderd], [true, false, true], "oordeel oud → nieuw");
  gelijk(v.ucVariabelen, [
    { naam: "UC_M", oud: 0.81, nieuw: 1.04 },
    { naam: "UC_nieuw", oud: null, nieuw: 0.2 },
    { naam: "UC_weg", oud: 0.5, nieuw: null },
  ], "veranderende UC's: volgorde van het nieuwe blad, dan wat verdwijnt; UC_V (gelijk op 2 dec.), UC_max en M niet");
  const zelfde = vergelijkUitkomst(oud, oud);
  gelijk([zelfde.ucVeranderd, zelfde.oordeelVeranderd, zelfde.ucVariabelen.length], [false, false, 0], "gelijke uitkomst: niets veranderd");
  const mis = vergelijkUitkomst(oud, null);
  gelijk([mis.oudMislukt, mis.nieuwMislukt, mis.ucNieuw, mis.oordeelNieuw], [false, true, null, null], "nieuwe tekst rekent niet door");
}

// ── 6. Regelverschil ─────────────────────────────────────────────────────────
console.log("Regelverschil:");
{
  gelijk(regelverschil("a\nb\nc", "a\nb\nc"), { weg: 0, bij: 0 }, "gelijke tekst");
  gelijk(regelverschil("a\nb\nc", "a\nx\nc\nd"), { weg: 1, bij: 2 }, "één regel anders, één erbij");
  gelijk(regelverschil("a\na\nb", "a\nb"), { weg: 1, bij: 0 }, "dubbele regel telt dubbel");
  gelijk(regelverschil("a\r\nb\r\n", "a\nb"), { weg: 0, bij: 0 }, "regeleinden tellen niet");
}

// ── 7. Het hele pad met de rekenkern ─────────────────────────────────────────
console.log("Oud en nieuw blad doorgerekend:");
{
  // Zoals rekenBladDoor/leesResultaat: alle zichtbare uitkomsten als getal,
  // UC_max als maatgevende UC, het oordeel uit de slotzin.
  const reken = (bron, waarden) => {
    const getallen = {};
    let tekst = "";
    const loop = (lijst) => {
      for (const n of lijst) {
        if (n.type === "assignment" || n.type === "var-display") {
          const w = parseFloat(String(n.result).replace(",", "."));
          if (!Number.isNaN(w)) getallen[n.name] = w;
        }
        if (n.type === "text") tekst += " " + n.text;
        if (Array.isArray(n.children)) loop(n.children);
      }
    };
    loop(evaluate(parse(bron), waarden, {}));
    const zin = tekst.slice(tekst.lastIndexOf("Maatgevende UC"));
    return {
      resultaat: { uc: getallen.UC_max ?? null, voldoet: !/voldoe[nt] niet/.test(zin) && /voldoe[nt]/.test(zin) },
      getallen,
    };
  };
  const waarden = { L: "4000", q: "4", klasse: "1", k_oud: "0.4" };
  const inv = vergelijkInvoer(waarden, veldenOud, veldenNieuw);
  const v = vergelijkUitkomst(reken(OUD, waarden), reken(NIEUW, inv.waarden));
  // M = 4·4²/8 = 8 kNm; oud M_Rd = 10 → 0,80; nieuw M_Rd = 8 en g_bl leeg (0) → 1,00.
  gelijk([Number(v.ucOud.toFixed(3)), Number(v.ucNieuw.toFixed(3))], [0.8, 1], "UC_max 0,80 → 1,00 (M_Rd 10 → 8 kNm, g_bl leeg telt als 0)");
  gelijk(v.ucVariabelen.map((u) => u.naam), ["UC_M", "UC_nieuw"], "UC_M verandert, UC_nieuw komt erbij, UC_V blijft");
  gelijk(inv.vervallen.map((x) => x.veld.naam), ["k_oud"], "k_oud vervalt");
  gelijk(inv.nieuw.map((x) => x.veld.naam), ["g_bl", "kmod"], "g_bl en kmod zijn nieuw");
}

// ── 8. Vertalingen ───────────────────────────────────────────────────────────
console.log("Vertalingen (common.json, sectie bladVersie):");
{
  const SRC = new URL("../packages/desktop/src/", import.meta.url);
  const lees = (pad) => readFileSync(new URL(pad, SRC), "utf8");
  const plat = (o, voor = "") =>
    Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? plat(v, `${voor}${k}.`) : [`${voor}${k}`]));
  const talen = Object.fromEntries(["nl", "en"].map((taal) => [
    taal, new Set(plat(JSON.parse(lees(`i18n/locales/${taal}/common.json`)).bladVersie ?? {}, "bladVersie.")),
  ]));
  const gebruikt = new Set();
  for (const bestand of ["components/calc/BladVersieKop.tsx", "components/calc/BladBijwerken.tsx", "components/calc/ProjectBrowser.tsx"]) {
    const bron = lees(bestand);
    for (const m of bron.matchAll(/\bt\(\s*"(bladVersie\.[\w.]+)"/g)) gebruikt.add(m[1]);
    // `bladVersie.status.${status}`: elke modulestatus.
    for (const m of bron.matchAll(/\bt\(\s*`(bladVersie\.[\w.]+)\.\$\{status\}`/g)) {
      for (const s of ["gereed", "controleren", "concept"]) gebruikt.add(`${m[1]}.${s}`);
    }
  }
  // Meervoud: i18next zoekt _one en _other bij een count.
  const ontbreekt = (taal) => [...gebruikt].filter((k) => !talen[taal].has(k) && !talen[taal].has(`${k}_other`));
  meld(gebruikt.size > 30, `${gebruikt.size} gebruikte sleutels gevonden`);
  meld(ontbreekt("nl").length === 0, "elke gebruikte sleutel staat in nl", ontbreekt("nl").join(", "));
  meld(ontbreekt("en").length === 0, "elke gebruikte sleutel staat in en", ontbreekt("en").join(", "));
  const alleenNl = [...talen.nl].filter((k) => !talen.en.has(k));
  const alleenEn = [...talen.en].filter((k) => !talen.nl.has(k));
  meld(alleenNl.length === 0 && alleenEn.length === 0, "nl en en hebben dezelfde sleutels", [...alleenNl, ...alleenEn].join(", "));
}

console.log(`\n${aantal - fouten} van ${aantal} controles goed${fouten ? `, ${fouten} FOUT` : ""}.`);
process.exitCode = fouten ? 1 : 0;
