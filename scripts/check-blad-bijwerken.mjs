/**
 * Controlescript voor de rekenversie en het bijwerken van bladen
 * (packages/desktop/src/components/calc/bladVersie.ts).
 *
 *   rekenversie        7 hextekens, stabiel (FNV-1a over UTF-8, vaste
 *                      referentiewaarde), ongevoelig voor regeleinden, BOM,
 *                      spaties aan het regeleinde en lege slotregels; wel
 *                      gevoelig voor elke echte wijziging
 *   isVerouderd        alleen bij een bekende module met een andere tekst;
 *                      nooit zonder of met een onbekende templateId; met een
 *                      bronversie alleen als de module een andere
 *                      rekenversie heeft, niet om een eigen aanpassing
 *   heeftEigenCode     de bladtekst wijkt af van zijn bronversie; zonder
 *                      bronversie (een ouder blad) nooit
 *   leesRekenversie    zeven hextekens uit een bestand, anders niets
 *   projectbestand     bronVersie gaat mee door opslaan en openen; ontbrekende
 *                      of verkeerde velden van een blad worden aangevuld, ook
 *                      bij het herstellen van de opgeslagen staat
 *                      (normaliseerExemplaren)
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
 * vertalingen: elke gebruikte sleutel `bladVersie.…` in nl en en, en de
 * modulestatus alleen daar (niet nog eens als vaste tekst in de code).
 *
 * Het zetten van de bronversie bij invoegen en bijwerken (projectStore.ts)
 * valt hierbuiten: de store laadt niet in Node.
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
  heeftEigenCode,
  huidigeModuletekst,
  invoervelden,
  isUcNaam,
  isVerouderd,
  leesRekenversie,
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
import {
  bouwProjectBestand,
  leesProjectBestand,
  normaliseerExemplaren,
} from "../packages/desktop/src/store/projectBestand.ts";

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

// ── 2b. Bronversie: nieuwere module of eigen aanpassing ─────────────────────
console.log("Bronversie en eigen aanpassing:");
{
  const moduleOud = "\"Balk\nL = ?*(mm)\nUC_max = L/(1000mm)\n";
  const moduleNieuw = "\"Balk\nL = ?*(mm)\nUC_max = L/(900mm)\n";
  const eigenTekst = moduleOud.replace("\"Balk\n", "\"Balk\n'Eigen aantekening\n");
  const bron = rekenversie(moduleOud);
  const nu = { balk: moduleOud };
  const later = { balk: moduleNieuw };
  const blad = (source, bronVersie) => ({ templateId: "balk", source, ...(bronVersie ? { bronVersie } : {}) });

  // Net ingevoegd: tekst en bronversie zijn die van de module.
  meld(!isVerouderd(blad(moduleOud, bron), nu) && !heeftEigenCode(blad(moduleOud, bron)),
    "net ingevoegd: niet verouderd, geen eigen aanpassing");
  // De module wordt verbeterd, het blad blijft ongemoeid.
  meld(isVerouderd(blad(moduleOud, bron), later) && !heeftEigenCode(blad(moduleOud, bron)),
    "nieuwere module, blad ongewijzigd: verouderd, geen eigen aanpassing");
  // De gebruiker past de rekentekst aan; de module is dezelfde gebleven.
  meld(!isVerouderd(blad(eigenTekst, bron), nu), "eigen aanpassing, module ongewijzigd: niet verouderd");
  meld(heeftEigenCode(blad(eigenTekst, bron)), "  en wel een eigen aanpassing");
  // Beide: de melding komt, en het scherm waarschuwt voor de eigen aanpassing.
  meld(isVerouderd(blad(eigenTekst, bron), later) && heeftEigenCode(blad(eigenTekst, bron)),
    "eigen aanpassing én nieuwere module: verouderd met eigen aanpassing");
  // Regeleinden en slotspaties zijn geen aanpassing.
  meld(!heeftEigenCode(blad(moduleOud.replace(/\n/g, "  \r\n"), bron)), "andere regeleinden zijn geen eigen aanpassing");
  meld(!isVerouderd(blad(moduleOud, bron), { balk: moduleOud.replace(/\n/g, "\r\n") }),
    "module met andere regeleinden: niet verouderd");
  // Staat de tekst al gelijk aan de nieuwe module, dan valt er niets bij te werken.
  meld(!isVerouderd(blad(moduleNieuw, bron), later), "tekst al gelijk aan de nieuwe module: niet verouderd");
  // Een ouder blad zonder bronversie: zoals vóór dit veld.
  meld(isVerouderd(blad(eigenTekst), nu), "zonder bronversie: een eigen aanpassing telt als verouderd (tekstvergelijking)");
  meld(!heeftEigenCode(blad(eigenTekst)), "zonder bronversie: geen eigen aanpassing te zien");
  meld(!isVerouderd(blad(moduleOud), nu) && isVerouderd(blad(moduleOud), later), "zonder bronversie: verouderd zodra de tekst afwijkt");
  // Geen of een onbekende module: nooit verouderd, ook niet met bronversie.
  meld(!isVerouderd({ templateId: "", source: eigenTekst, bronVersie: bron }, later), "los blad met bronversie: niet verouderd");
  meld(!isVerouderd({ templateId: "weg", source: eigenTekst, bronVersie: bron }, later), "onbekende module met bronversie: niet verouderd");

  gelijk(leesRekenversie(bron), bron, "leesRekenversie: geldige rekenversie blijft");
  gelijk(leesRekenversie(` ${bron.toUpperCase()} `), bron, "leesRekenversie: hoofdletters en spaties genormaliseerd");
  gelijk([leesRekenversie("abc"), leesRekenversie("0123456789"), leesRekenversie("xyz1234"), leesRekenversie(1234567),
    leesRekenversie(null), leesRekenversie(undefined)], [undefined, undefined, undefined, undefined, undefined, undefined],
  "leesRekenversie: te kort, te lang, geen hex of geen tekst geeft niets");
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

// ── 8. Projectbestand en opgeslagen staat ────────────────────────────────────
console.log("Bronversie in het projectbestand:");
{
  const bron = rekenversie("\"Balk\nL = ?*(mm)\n");
  const bladen = [
    { id: "ex-a", naam: "Balk", templateId: "balk", source: "\"Balk\nL = ?*(mm)\n", bronVersie: bron, waarden: { L: "3600" }, elementen: [] },
    { id: "ex-b", naam: "Oud blad", templateId: "balk", source: "\"Balk\n", waarden: {}, elementen: [] },
  ];
  const tekst = bouwProjectBestand({ versie: 1, naam: "Proef", gegevens: {}, exemplaren: bladen }, null);
  const terug = leesProjectBestand(tekst, "proef").exemplaren;
  gelijk(terug[0].bronVersie, bron, "opslaan en openen: bronVersie blijft");
  meld(!("bronVersie" in terug[1]), "een blad zonder bronversie krijgt er bij openen geen");
  gelijk(JSON.parse(tekst).project.exemplaren.map((e) => e.bronVersie ?? null), [bron, null], "de bronversie staat in het bestand");

  // Een met de hand aangepast of verminkt bestand.
  const rauw = JSON.stringify({ project: { naam: "Proef", exemplaren: [
    { id: "ex-c", naam: "Hoofdletters", templateId: "balk", source: "x", bronVersie: bron.toUpperCase(), waarden: {} },
    { id: "ex-d", naam: "Verminkt", templateId: "balk", source: "x", bronVersie: "geen-versie", waarden: {} },
    { id: "ex-e", templateId: 12, waarden: { L: 3600, open: true, weg: { a: 1 }, h: "200" }, elementen: "geen lijst" },
    null,
    "geen blad",
  ] } });
  const gelezen = leesProjectBestand(rauw, "bestandsnaam").exemplaren;
  gelijk(gelezen.map((e) => e.id), ["ex-c", "ex-d", "ex-e"], "wat geen blad is, valt weg");
  gelijk(gelezen[0].bronVersie, bron, "bronVersie in hoofdletters wordt genormaliseerd");
  meld(!("bronVersie" in gelezen[1]), "een ongeldige bronVersie valt weg");
  gelijk([gelezen[2].naam, gelezen[2].templateId, gelezen[2].source, gelezen[2].elementen],
    ["bestandsnaam", "", "", []], "ontbrekende of verkeerde velden krijgen hun standaardwaarde");
  gelijk(gelezen[2].waarden, { L: "3600", open: "true", h: "200" }, "invoer: getallen en ja/nee worden tekst, de rest valt weg");

  // Herstel uit de opgeslagen staat van de app: dezelfde aanvulling.
  const hersteld = normaliseerExemplaren([{ id: "ex-f", naam: "Zonder tekst", templateId: "balk", bronVersie: bron }, 7], "Project");
  gelijk(hersteld.map((e) => [e.id, e.source, e.waarden, e.elementen, e.bronVersie]),
    [["ex-f", "", {}, [], bron]], "opgeslagen staat: ontbrekende tekst en invoer aangevuld, bronVersie blijft");
  meld(hersteld.length === 1 && normaliseerExemplaren("geen lijst", "Project").length === 0, "opgeslagen staat: geen lijst geeft geen bladen");
  meld(normaliseerExemplaren([{ source: "x" }], "Project")[0].id.startsWith("ex-"), "een blad zonder id krijgt er een");
}

// ── 9. Vertalingen ───────────────────────────────────────────────────────────
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
  const BESTANDEN = ["components/calc/BladVersieKop.tsx", "components/calc/BladBijwerken.tsx",
    "components/calc/ProjectBrowser.tsx", "components/calc/ModuleKiezer.tsx"];
  for (const bestand of BESTANDEN) {
    const bron = lees(bestand);
    for (const m of bron.matchAll(/\bt\(\s*"(bladVersie\.[\w.]+)"/g)) gebruikt.add(m[1]);
    // `bladVersie.status.${status}`: elke modulestatus.
    for (const m of bron.matchAll(/\bt\(\s*`(bladVersie\.[\w.]+)\.\$\{status\}`/g)) {
      for (const s of ["gereed", "controleren", "concept"]) gebruikt.add(`${m[1]}.${s}`);
    }
  }
  // Meervoud van de regeltelling: "1 regel vervalt", "2 regels vervallen".
  for (const k of ["bladVersie.regelsWeg", "bladVersie.regelsBij"]) {
    meld(talen.nl.has(`${k}_one`) && talen.nl.has(`${k}_other`) && talen.en.has(`${k}_one`) && talen.en.has(`${k}_other`),
      `${k}: enkelvoud en meervoud in nl en en`);
  }
  // De modulestatus heeft één bron: de vertalingen. Geen vaste teksten meer
  // in de catalogus of het scherm "Module toevoegen".
  const statusTekst = /Gecalibreerd —|"gecalibreerd"|nog uit te werken"/;
  const vast = ["components/calc/projectTree.ts", "components/calc/ModuleKiezer.tsx"].filter((b) => statusTekst.test(lees(b)));
  meld(vast.length === 0, "modulestatus alleen in de vertalingen, niet als vaste tekst", vast.join(", "));
  const nl = JSON.parse(lees("i18n/locales/nl/common.json")).bladVersie;
  const en = JSON.parse(lees("i18n/locales/en/common.json")).bladVersie;
  meld(nl.regelsWeg_one.includes("regel ") && !nl.regelsWeg_one.includes("regels") && en.regelsWeg_one.includes("line ")
    && !en.regelsWeg_one.includes("lines"), "enkelvoud zegt regel/line, niet regels/lines");
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
