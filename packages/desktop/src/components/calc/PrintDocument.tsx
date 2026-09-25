import { useMemo, type ReactNode } from "react";
import { parse, evaluate, render, defaultStyles } from "@ifc-calc/core";
import { useProjectStore, type Exemplaar } from "../../store/projectStore";
import { projectScope } from "../../store/projectGegevens";
import { ExemplaarContext } from "../../store/actiefBlad";
import { usePrintStore } from "../../store/printStore";
import { designerVoor } from "./designerKeuze";
import { calcpadIncludes, calcpadImageUrls } from "../../templates/calcpad-includes";
import { leesResultaat, ucTekst, type Resultaat } from "./bladResultaat";
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

/** Het oordeel als klein label: groen, rood of neutraal. */
export function Oordeel({ r }: { r: Resultaat }) {
  if (r.voldoet === null) return <span className="print-oordeel neutraal">—</span>;
  return (
    <span className={`print-oordeel ${r.voldoet ? "goed" : "fout"}`}>
      {r.voldoet ? "voldoet" : "voldoet niet"}
    </span>
  );
}

/** Eén rekenblad in de uitdraai: de kop, het parametrische beeld, dan de uitwerking. */
export function PrintBlad({ ex, html, nummer, resultaat, projectregel }: {
  ex: Exemplaar; html: string; nummer: number; resultaat: Resultaat; projectregel?: ReactNode;
}) {
  // Het beeld tekent zichzelf uit de waarden van dít exemplaar, niet uit het
  // blad dat toevallig openstaat. `alleenLezen` houdt tegen dat het afdrukken
  // standaardwaarden aanvult of iets anders aan het project verandert.
  const beeld = designerVoor(ex.source);
  return (
    <section className="print-blad">
      <header className="print-blad-kop">
        <span className="print-blad-nr">{nummer}</span>
        <span className="print-blad-titel">
          <span className="print-blad-naam">{ex.naam}</span>
          {resultaat.norm && <span className="print-blad-norm">{resultaat.norm}</span>}
        </span>
        <span className="print-blad-uitkomst">
          {resultaat.uc !== null && <span className="print-blad-uc">UC {ucTekst(resultaat.uc)}</span>}
          <Oordeel r={resultaat} />
        </span>
      </header>
      {projectregel}
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
  bladen: { ex: Exemplaar; html: string; resultaat: Resultaat }[];
  /** Alle bladen van het project, voor de keuze in het afdrukvoorbeeld. */
  alleBladen: Exemplaar[];
  /** Eén losse berekening: geen voorblad, wel een projectregel onder de bladkop. */
  enkel: boolean;
  /** De ingevulde projectgegevens, als label/waarde-paren. */
  kopregels: [string, string][];
  datum: string;
  onderdeel: string | undefined;
  projectNummer: string | undefined;
  constructeur: string | undefined;
}

/**
 * Bouwt de gekozen bladen één keer door en levert alles wat een uitdraai
 * nodig heeft. Zowel de afdruk als het afdrukvoorbeeld in de app gebruiken
 * deze hook, zodat er maar één opbouw bestaat en de twee niet uiteen kunnen
 * lopen.
 */
export function useUitdraai(): Uitdraai {
  const projectNaam = useProjectStore((s) => s.projectNaam);
  const gegevens = useProjectStore((s) => s.gegevens);
  const exemplaren = useProjectStore((s) => s.exemplaren);
  const selectie = usePrintStore((s) => s.selectie);

  zorgVoorKernstijlen();

  const bladen = useMemo(() => {
    const scope = projectScope(gegevens);
    // Een selectie met alleen verdwenen bladen valt terug op het hele project.
    const gekozen = selectie ? exemplaren.filter((e) => selectie.includes(e.id)) : exemplaren;
    return (gekozen.length ? gekozen : exemplaren).map((ex) => {
      let html: string;
      let resultaat: Resultaat = { titel: ex.naam, norm: "", uc: null, voldoet: null };
      try {
        const opties = { includes: calcpadIncludes, imageUrls: calcpadImageUrls };
        const nodes = evaluate(parse(ex.source, opties), ex.waarden, scope);
        html = render(nodes);
        resultaat = leesResultaat(nodes, ex.naam);
      } catch (err) {
        html = `<p class="calc-text" style="color:#b91c1c">Dit blad kon niet worden doorgerekend: ${
          (err as Error).message
        }</p>`;
      }
      return { ex, html, resultaat };
    });
  }, [exemplaren, gegevens, selectie]);

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
    alleBladen: exemplaren,
    enkel: bladen.length === 1,
    kopregels: kop.filter((r): r is [string, string] => !!r[1]),
    datum: new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }),
    onderdeel: gegevens.onderdeel,
    projectNummer: gegevens.project_nummer,
    constructeur: gegevens.constructeur,
  };
}

/** De resultatentabel: per blad de norm, de maatgevende UC en het oordeel. */
function Resultaten({ uitdraai }: { uitdraai: Uitdraai }) {
  const { bladen } = uitdraai;
  const nietGoed = bladen.filter((b) => b.resultaat.voldoet === false).length;
  return (
    <>
      <p className="print-sectiekop">Inhoud en resultaten</p>
      <table className="print-resultaten">
        <thead>
          <tr>
            <th className="nr">#</th>
            <th>Onderdeel</th>
            <th>Grondslag</th>
            <th className="uc">UC</th>
            <th>Oordeel</th>
          </tr>
        </thead>
        <tbody>
          {bladen.map(({ ex, resultaat }, i) => (
            <tr key={ex.id}>
              <td className="nr">{i + 1}</td>
              <td>{ex.naam}</td>
              <td className="norm">{resultaat.norm || "—"}</td>
              <td className="uc">{resultaat.uc !== null ? ucTekst(resultaat.uc) : "—"}</td>
              <td><Oordeel r={resultaat} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="print-resultaten-noot">
        {nietGoed === 0
          ? "Alle getoetste onderdelen voldoen."
          : `${nietGoed} van de ${bladen.length} onderdelen ${nietGoed === 1 ? "voldoet" : "voldoen"} niet; zie het betreffende blad.`}
        {" "}UC is de maatgevende unity check van het blad; — betekent dat het blad geen eindtoets heeft.
      </p>
    </>
  );
}

/** Het voorblad: projectgegevens plus de inhoud met de resultaten. */
export function PrintVoorblad({ uitdraai }: { uitdraai: Uitdraai }) {
  const { projectNaam, kopregels, datum, onderdeel, projectNummer, constructeur } = uitdraai;
  return (
    <section className="print-voorblad">
      <div className="print-voorblad-band" />
      <p className="print-soort">Constructieve berekening</p>
      <h1>{projectNaam || "Berekening"}</h1>
      {onderdeel && <p className="print-ondertitel">{onderdeel}</p>}
      {kopregels.length > 0 && (
        <table className="print-gegevens">
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
      <Resultaten uitdraai={uitdraai} />
      <div className="print-voorblad-voet">
        <span>{projectNummer ? `Project ${projectNummer}` : ""}</span>
        <span>{constructeur ? `Opgesteld door ${constructeur}` : ""}</span>
        <span>{datum}</span>
      </div>
    </section>
  );
}

/**
 * De projectgegevens bij een losse berekening, als één compacte regel onder
 * de bladkop. Een apart titelblok kostte zoveel hoogte dat een groot
 * parametrisch beeld niet meer op de eerste pagina paste en die pagina
 * verder leeg bleef; het project staat bovendien al in de loopkop.
 */
export function PrintProjectregel({ uitdraai }: { uitdraai: Uitdraai }) {
  const { kopregels, datum } = uitdraai;
  // Naam en nummer staan al in de loopkop; hier de rest van de gegevens.
  const regels = kopregels.filter(([label]) => label !== "Projectnaam" && label !== "Projectnummer");
  return (
    <p className="print-projectregel">
      <span className="print-soort">Constructieve berekening</span>
      {regels.map(([label, waarde]) => (
        <span key={label}><b>{label}</b> {waarde}</span>
      ))}
      <span>{datum}</span>
    </p>
  );
}

/** Voorblad plus bladen, of bij één blad het blad met een projectregel. */
export function UitdraaiInhoud({ uitdraai }: { uitdraai: Uitdraai }) {
  const { bladen, enkel } = uitdraai;
  return (
    <>
      {!enkel && <PrintVoorblad uitdraai={uitdraai} />}
      {bladen.map(({ ex, html, resultaat }, i) => (
        <PrintBlad key={ex.id} ex={ex} html={html} nummer={i + 1} resultaat={resultaat}
          projectregel={enkel ? <PrintProjectregel uitdraai={uitdraai} /> : undefined} />
      ))}
    </>
  );
}

/** Tekst voor de loopkop links: projectnummer en -naam. */
export const loopkopLinks = (u: Uitdraai) => (u.projectNummer ? `${u.projectNummer} · ` : "") + u.projectNaam;

/**
 * De gekozen bladen als één afdrukbaar document.
 *
 * Waarom via de browser en niet via de rapportengine: die levert alleen
 * rekentabellen — geen koppen, geen proza, geen variabelenamen en geen
 * tekeningen (zie docs/backlog.md, punt 4). Hier printen we exact wat de
 * uitwerking toont, plus het parametrische beeld dat de app zelf tekent.
 */
export default function PrintDocument() {
  const uitdraai = useUitdraai();
  const { datum, onderdeel } = uitdraai;

  return (
    <div className="print-root print-opmaak" aria-hidden="true">
      {/* Loopt op elke pagina mee: vaste elementen herhaalt de browser bij het printen.
          Het paginanummer staat in de paginamarge zelf (@page in de CSS). */}
      <div className="print-loopkop">
        <span>{loopkopLinks(uitdraai)}</span>
        <span>{onderdeel}</span>
      </div>
      <div className="print-loopvoet">
        <span>Open Calculations Studio</span>
        <span>{datum}</span>
      </div>

      <UitdraaiInhoud uitdraai={uitdraai} />
    </div>
  );
}
