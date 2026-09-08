import { useMemo } from "react";
import { process, defaultStyles } from "@ifc-calc/core";
import { useProjectStore, type Exemplaar } from "../../store/projectStore";
import { projectScope } from "../../store/projectGegevens";
import { ExemplaarContext } from "../../store/actiefBlad";
import { designerVoor } from "./designerKeuze";
import { calcpadIncludes, calcpadImageUrls } from "../../templates/calcpad-includes";
import "./PrintDocument.css";

let stijlenGeplaatst = false;
/** De opmaak van de rekenbladen staat in de core; die moet ook bij het printen mee. */
function zorgVoorKernstijlen() {
  if (stijlenGeplaatst || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = defaultStyles;
  el.dataset.ifcCalc = "core-styles";
  document.head.appendChild(el);
  stijlenGeplaatst = true;
}

/** Eén rekenblad in de uitdraai: het parametrische beeld, dan de uitwerking. */
export function PrintBlad({ ex, html, nummer }: { ex: Exemplaar; html: string; nummer: number }) {
  // Het beeld tekent zichzelf uit de waarden van dít exemplaar, niet uit het
  // blad dat toevallig openstaat. `alleenLezen` houdt tegen dat het afdrukken
  // standaardwaarden aanvult of iets anders aan het project verandert.
  const beeld = designerVoor(ex.source);
  return (
    <section className="print-blad">
      <h2 className="print-blad-kop">
        <span className="print-blad-nr">{nummer}</span>
        {ex.naam}
      </h2>
      {beeld && (
        <div className="print-beeld">
          <ExemplaarContext.Provider value={{ exemplaar: ex, alleenLezen: true }}>
            {beeld}
          </ExemplaarContext.Provider>
        </div>
      )}
      <div className="ifc-calc" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}

/** Wat er op het voorblad en in de uitdraai staat. */
export interface Uitdraai {
  projectNaam: string;
  bladen: { ex: Exemplaar; html: string }[];
  /** De ingevulde projectgegevens, als label/waarde-paren. */
  kopregels: [string, string][];
  datum: string;
  onderdeel: string | undefined;
  projectNummer: string | undefined;
}

/**
 * Bouwt het hele project één keer door en levert alles wat een uitdraai nodig
 * heeft. Zowel de afdruk als het afdrukvoorbeeld in de app gebruiken deze
 * hook, zodat er maar één opbouw bestaat en de twee niet uiteen kunnen lopen.
 */
export function useUitdraai(): Uitdraai {
  const projectNaam = useProjectStore((s) => s.projectNaam);
  const gegevens = useProjectStore((s) => s.gegevens);
  const exemplaren = useProjectStore((s) => s.exemplaren);

  zorgVoorKernstijlen();

  const bladen = useMemo(() => {
    const scope = projectScope(gegevens);
    return exemplaren.map((ex) => {
      let html: string;
      try {
        html = process(
          ex.source,
          ex.waarden,
          { includes: calcpadIncludes, imageUrls: calcpadImageUrls },
          scope,
        );
      } catch (err) {
        html = `<p class="calc-text" style="color:#b91c1c">Dit blad kon niet worden doorgerekend: ${
          (err as Error).message
        }</p>`;
      }
      return { ex, html };
    });
  }, [exemplaren, gegevens]);

  const kop: Array<[string, string | undefined]> = [
    ["Projectnummer", gegevens.project_nummer],
    ["Projectnaam", gegevens.project_naam],
    ["Onderdeel", gegevens.onderdeel],
    ["Opdrachtgever", gegevens.opdrachtgever],
    ["Constructeur", gegevens.constructeur],
    ["Locatie", gegevens.locatie],
    ["Gevolgklasse", gegevens.CC ? `CC${gegevens.CC}` : undefined],
    ["Betrouwbaarheidsklasse", gegevens.RC ? `RC${gegevens.RC}` : undefined],
    ["Ontwerplevensduur", gegevens.DesignLife ? `${gegevens.DesignLife} jaar` : undefined],
    // Op de splitspunten tussen de referentie-uitwerking en de norm rekent elk blad allebei en
    // kiest er één. Welke, moet op de afdruk staan: zonder die regel zijn twee
    // rapporten uit hetzelfde project niet met elkaar te vergelijken, en weet
    // een controleur niet welke lezing hij voor zich heeft.
    [
      "Rekenwijze",
      gegevens.rekenwijze === "0"
        ? "de norm gevolgd op de gemarkeerde punten"
        : "de referentie-uitwerking gevolgd op de gemarkeerde punten",
    ],
  ];

  return {
    projectNaam,
    bladen,
    kopregels: kop.filter((r): r is [string, string] => !!r[1]),
    datum: new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }),
    onderdeel: gegevens.onderdeel,
    projectNummer: gegevens.project_nummer,
  };
}

/** Het voorblad: projectgegevens plus de inhoudsopgave. */
export function PrintVoorblad({ uitdraai }: { uitdraai: Uitdraai }) {
  const { projectNaam, kopregels, bladen, datum } = uitdraai;
  return (
    <section className="print-voorblad">
      <p className="print-soort">Constructieve berekening</p>
      <h1>{projectNaam || "Berekening"}</h1>
      {kopregels.length > 0 && (
        <table>
          <tbody>
            {kopregels.map(([label, waarde]) => (
              <tr key={label}>
                <th>{label}</th>
                <td>{waarde}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="print-inhoud-kop">Inhoud</p>
      <ol className="print-inhoud">
        {bladen.map(({ ex }) => (
          <li key={ex.id}>{ex.naam}</li>
        ))}
      </ol>
      <p className="print-datum">{datum}</p>
    </section>
  );
}

/**
 * Het hele project als één afdrukbaar document.
 *
 * Waarom via de browser en niet via de rapportengine: die levert alleen
 * rekentabellen — geen koppen, geen proza, geen variabelenamen en geen
 * tekeningen (zie docs/backlog.md, punt 4). Hier printen we exact wat de
 * uitwerking toont, plus het parametrische beeld dat de app zelf tekent.
 */
export default function PrintDocument() {
  const uitdraai = useUitdraai();
  const { projectNaam, bladen, datum, onderdeel, projectNummer } = uitdraai;

  return (
    <div className="print-root print-opmaak" aria-hidden="true">
      {/* Loopt op elke pagina mee: vaste elementen herhaalt de browser bij het printen. */}
      <div className="print-loopkop">
        <span>{projectNummer ? `${projectNummer} · ` : ""}{projectNaam}</span>
        <span>{onderdeel}</span>
      </div>
      <div className="print-loopvoet">
        <span>Open Calculations Studio</span>
        <span>{datum}</span>
      </div>

      <PrintVoorblad uitdraai={uitdraai} />

      {bladen.map(({ ex, html }, i) => (
        <PrintBlad key={ex.id} ex={ex} html={html} nummer={i + 1} />
      ))}
    </div>
  );
}
