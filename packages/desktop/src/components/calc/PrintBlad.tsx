import type { ReactNode } from "react";
import type { Exemplaar } from "../../store/projectStore";
import { ExemplaarContext } from "../../store/actiefBlad";
import { designerVoor } from "./designerKeuze";
import { ucTekst, type Resultaat } from "./bladResultaat";
import { rekenversie } from "./bladVersie";
import "./PrintDocument.css";

/*
 * Eén rekenblad op papier. Staat los van PrintDocument omdat ook het
 * constructierapport het gebruikt (bijlage A); zo importeren het rapport en
 * PrintDocument elkaar niet over en weer.
 */

/** Het oordeel als klein label: groen, rood of neutraal. */
export function Oordeel({ r }: { r: Resultaat }) {
  if (r.voldoet === null) return <span className="print-oordeel neutraal">—</span>;
  return (
    <span className={`print-oordeel ${r.voldoet ? "goed" : "fout"}`}>
      {r.voldoet ? "voldoet" : "voldoet niet"}
    </span>
  );
}

/**
 * Eén rekenblad in de uitdraai: de kop, het parametrische beeld, dan de
 * uitwerking. `nummer` is het volgnummer bij de losse bladen en het
 * bijlagenummer ("A.2") in het rapport.
 *
 * De rekenversie van het blad (bladVersie.ts) staat één keer op papier: in de
 * projectregel als die er is (een losse berekening), anders achter de
 * grondslag in de kop.
 *
 * `titelInKop`: de titelkop bovenaan de uitwerking vervalt, omdat de kop al
 * naam en grondslag noemt (bijlage A van het rapport). Alleen als er een
 * grondslag is: zonder staat de titel van de module nergens anders.
 */
export function PrintBlad({ ex, html, nummer, resultaat, projectregel, titelInKop = false }: {
  ex: Exemplaar; html: string; nummer: number | string; resultaat: Resultaat; projectregel?: ReactNode;
  titelInKop?: boolean;
}) {
  // Het beeld tekent zichzelf uit de waarden van dít exemplaar, niet uit het
  // blad dat toevallig openstaat. `alleenLezen` houdt tegen dat het afdrukken
  // standaardwaarden aanvult of iets anders aan het project verandert.
  const beeld = designerVoor(ex.source);
  const onderkop = [resultaat.norm, projectregel ? "" : `rekenversie ${rekenversie(ex.source)}`]
    .filter(Boolean)
    .join(" · ");
  return (
    <section className={titelInKop && resultaat.norm ? "print-blad print-titel-in-kop" : "print-blad"}>
      <header className="print-blad-kop">
        <span className="print-blad-nr">{nummer}</span>
        <span className="print-blad-titel">
          <span className="print-blad-naam">{ex.naam}</span>
          {onderkop && <span className="print-blad-norm">{onderkop}</span>}
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
