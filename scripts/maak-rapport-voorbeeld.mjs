/**
 * Maakt scripts/fixtures/rapport-voorbeeld.ifccalculation: een verzonnen
 * project waarmee scripts/rapport-pdf.mjs als rooktest een volledig rapport
 * afdrukt.
 *
 * Alles is fictief: geen bestaand bureau, geen personen, geen echt project.
 * De rekenteksten van de twee bladen komen rechtstreeks uit src/templates en
 * de standaardwaarden uit src/rapport. Verandert een van beide, dan maakt één
 * commando het voorbeeld weer passend; `--controleer` meldt of dat nodig is.
 *
 * Het voorbeeld raakt bewust de randen van de opmaak:
 *   • nieuwbouw: de bestaande situatie (3.1 en 4.6) valt weg, net als de
 *     blokken "Bestaande situatie" en "Verbouw, renovatie" in 3.2;
 *   • twee revisies (A en B);
 *   • een invulveld en opsommingsregels in de projectomschrijving;
 *   • vlak- en gevelopbouwen met de getallen uit scripts/check-rapport.mjs,
 *     zodat de sommen in de afdruk bekend zijn (0,70 · 0,60 · 11,03);
 *   • één blad in hoofdstuk 6 zelf, één in bijlage A, en een eigen bijlage B;
 *   • geen voetafbeelding: de voet valt terug op een lijn met de bureaunaam.
 *
 * Draaien:      node scripts/maak-rapport-voorbeeld.mjs
 * Controleren:  node scripts/maak-rapport-voorbeeld.mjs --controleer
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { balklaag } from "../packages/desktop/src/templates/balklaag.ts";
import { spuwer } from "../packages/desktop/src/templates/spuwer.ts";
import { legeGegevens } from "../packages/desktop/src/store/projectGegevens.ts";
import { PROJECT_FORMAAT_VERSIE } from "../packages/desktop/src/store/projectBestand.ts";
import { leegBureau, normaliseerRapport, standaardRapport } from "../packages/desktop/src/rapport/model.ts";
import { standaardTeksten } from "../packages/desktop/src/rapport/standaardteksten.ts";
import { gevelOpbouw, vlakOpbouw } from "../packages/desktop/src/rapport/opbouw.ts";
import { rond } from "../packages/desktop/src/rapport/normwaarden.ts";

const hier = dirname(fileURLToPath(import.meta.url));
const REPO = join(hier, "..");
const DOEL = join(hier, "fixtures", "rapport-voorbeeld.ifccalculation");
const NAAM = relative(REPO, DOEL).replaceAll("\\", "/");

/** Vast, zodat het bestand niet elke dag verandert. */
const DATUM = "01-09-2026";
const BALKLAAG_ID = "ex-voorbeeld-balklaag";
const SPUWER_ID = "ex-voorbeeld-spuwer";

/** De sommen die de afdruk moet tonen (zelfde getallen als scripts/check-rapport.mjs). */
const VERWACHTE_SOMMEN = { Dak: 0.7, Verdiepingsvloer: 0.6, Gevel: 11.03 };

function bouwProject() {
  const gegevens = {
    ...legeGegevens(),
    project_nummer: "2026-001",
    project_naam: "Voorbeeldproject",
    opdrachtgever: "Voorbeeldopdrachtgever B.V.",
    constructeur: "Ir. A. Voorbeeld",
    locatie: "Voorbeeldstad",
    CC: "2",
    RC: "2",
    DesignLife: "50",
    windgebied: "2",
    terreincategorie: "3",
  };

  const exemplaren = [
    { id: BALKLAAG_ID, naam: "Balklaag verdiepingsvloer", templateId: "balklaag", source: balklaag, waarden: {}, elementen: [] },
    { id: SPUWER_ID, naam: "Spuwer dakrand", templateId: "spuwer", source: spuwer, waarden: {}, elementen: [] },
  ];

  const rapport = standaardRapport(DATUM, standaardTeksten());
  rapport.kenmerk = "VB-2026-001";
  rapport.fase = "DO";
  rapport.opdrachtgeverAdres = "Voorbeeldstraat 1\n1234 AB Voorbeeldstad";
  rapport.verantwoordelijk = "Ir. A. Voorbeeld";
  rapport.uitvoerend = "Ing. B. Voorbeeld";
  rapport.revisies = [
    { code: "A", datum: DATUM, omschrijving: "Eerste uitgave", status: "concept" },
    { code: "B", datum: "15-09-2026", omschrijving: "Opmerkingen opdrachtgever verwerkt", status: "ter goedkeuring" },
  ];
  rapport.teksten = {
    ...rapport.teksten,
    projectomschrijving:
      "Het project {projectnaam} omvat de nieuwbouw van een vrijstaande woning met een plat dak.\n" +
      "\n" +
      "-fundering op staal;\n" +
      "-dragende wanden van kalkzandsteen;\n" +
      "-houten balklaag als verdiepingsvloer.",
    belendingen: "Er staan geen bouwwerken binnen de invloedssfeer van de nieuwe fundering.",
    "uitvoering-nieuwbouw":
      "-Maatvoering in het werk controleren.\n" +
      "-Wapening laten keuren voor het storten.",
  };
  rapport.rol = { rol: "Hoofdconstructeur", architect: "Voorbeeldarchitecten", datumOnderlegger: "25-08-2026" };
  rapport.uitgangspunten.brand = { hoofddraagconstructie: "30", brandscheiding: "-", vluchtroute: "-", verwijzing: "" };
  rapport.belastingen.wind = { ...rapport.belastingen.wind, gebouwhoogte: "9" };
  rapport.belastingen.vloerenDaken = [
    {
      soort: "vlak",
      naam: "Dak",
      lagen: [
        { naam: "dakpannen", d: "", rho: "", p: "0,48" },
        { naam: "dakplaten", d: "", rho: "", p: "0,07" },
        { naam: "gordingen", d: "", rho: "", p: "0,15" },
      ],
    },
    {
      soort: "vlak",
      naam: "Verdiepingsvloer",
      lagen: [
        { naam: "vloerafwerking", d: "", rho: "", p: "0,30" },
        { naam: "beschot", d: "0,02", rho: "4,0", p: "" },
        { naam: "balklaag", d: "", rho: "", p: "0,08" },
        { naam: "plafond", d: "0,015", rho: "9,0", p: "" },
      ],
    },
  ];
  rapport.belastingen.wanden = [
    {
      soort: "gevel",
      naam: "Gevel",
      lagen: [
        { naam: "metselwerk buitenblad", p: "2,00", h: "3,00", vulling: "90%" },
        { naam: "metselwerk binnenblad", p: "2,00", h: "3,00", vulling: "90%" },
        { naam: "kozijnen", p: "0,75", h: "3,00", vulling: "10%" },
      ],
    },
  ];
  rapport.toelichting = {
    [BALKLAAG_ID]: "Houten balklaag van de verdiepingsvloer, hart op hart 600 mm, opgelegd op de dragende wanden.",
    [SPUWER_ID]: "Noodoverlaat in de dakrand van het platte dak.",
  };
  rapport.inHoofdstuk = { [SPUWER_ID]: true };
  rapport.bijlagen = ["Constructieoverzicht"];
  rapport.bureau = {
    ...leegBureau(),
    naam: "Voorbeeldbureau B.V.",
    adres: "Voorbeeldlaan 10",
    postcode: "1234 AB",
    plaats: "Voorbeeldstad",
    telefoon: "010-000 00 00",
    email: "info@voorbeeldbureau.example",
    constructeurs: [
      { naam: "Ir. A. Voorbeeld", telefoon: "010-000 00 01", email: "a.voorbeeld@voorbeeldbureau.example" },
      { naam: "Ing. B. Voorbeeld", telefoon: "010-000 00 02", email: "b.voorbeeld@voorbeeldbureau.example" },
    ],
  };

  // Zelfde vorm als bouwProjectBestand() in store/projectBestand.ts, zonder
  // IFCX-inhoud en zonder `source` (de rekentekst van het eerste blad voor
  // lezers die één blad verwachten): bij het openen telt alleen `project`.
  return { project: { versie: PROJECT_FORMAAT_VERSIE, naam: gegevens.project_naam, gegevens, exemplaren, rapport } };
}

/** Paden waarop twee waarden verschillen, als leesbare regels. */
function verschillen(a, b, pad) {
  if (isDeepStrictEqual(a, b)) return [];
  if (a && b && typeof a === "object" && typeof b === "object" && Array.isArray(a) === Array.isArray(b)) {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => verschillen(a[k], b[k], `${pad}.${k}`));
  }
  return [`${pad}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`];
}

/** Het voorbeeld moet de normalisatie ongeschonden doorstaan en de bekende sommen geven. */
function controleerInhoud(doc) {
  const fouten = [];
  const { rapport } = doc.project;
  // Zoals na opslaan en openen: via JSON, en normaliseerRapport krijgt zijn eigen kopie.
  const gelezen = JSON.parse(JSON.stringify(rapport));
  const genormaliseerd = normaliseerRapport(JSON.parse(JSON.stringify(rapport)), DATUM, standaardTeksten());
  for (const v of verschillen(gelezen, genormaliseerd, "rapport")) fouten.push(`normaliseerRapport verandert ${v}`);
  for (const o of [...rapport.belastingen.vloerenDaken, ...rapport.belastingen.wanden]) {
    const som = rond((o.soort === "vlak" ? vlakOpbouw(o.lagen) : gevelOpbouw(o.lagen)).som, 2);
    if (som !== VERWACHTE_SOMMEN[o.naam]) fouten.push(`opbouw ${o.naam}: som ${som}, verwacht ${VERWACHTE_SOMMEN[o.naam]}`);
  }
  return fouten;
}

const controleer = process.argv.includes("--controleer");
const doc = bouwProject();
const tekst = JSON.stringify(doc, null, 2) + "\n";
const fouten = controleerInhoud(doc);
if (controleer) {
  if (!existsSync(DOEL)) fouten.push(`${NAAM} ontbreekt: draai node scripts/maak-rapport-voorbeeld.mjs`);
  // Git kan op Windows met CRLF uitchecken; de inhoud telt, niet het regeleinde.
  else if (readFileSync(DOEL, "utf8").replace(/\r\n/g, "\n") !== tekst) {
    fouten.push(`${NAAM} is verouderd: draai node scripts/maak-rapport-voorbeeld.mjs`);
  }
}
if (fouten.length) {
  for (const f of fouten) console.error(`FOUT  ${f}`);
  process.exit(1);
}
if (controleer) {
  console.log(`${NAAM} klopt`);
} else {
  mkdirSync(dirname(DOEL), { recursive: true });
  writeFileSync(DOEL, tekst);
  console.log(`geschreven: ${NAAM} (${doc.project.exemplaren.length} bladen, ${Math.round(Buffer.byteLength(tekst) / 1024)} kB)`);
}
