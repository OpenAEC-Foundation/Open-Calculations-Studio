import type { ReactNode } from "react";
import type { Rapportknoop } from "../../../rapport/opzet";
import { vulIn } from "../../../rapport/invullen";
import { samenvatting } from "../../calc/bladResultaat";
import type { RapportWeergave } from "./useRapportWeergave";
import { Cel, Leeg, Rij, Tekst, Vlak } from "./raster";
import { Bestaand, Bouwwerk, Brand, Conservering, Factoren, Materialen, Vervormingen } from "./Uitgangspunten";
import { Groep, Sneeuw, Veranderlijk, Wind } from "./Belastingen";

/*
 * De hoofdstukken van het rapport: koppen met nummering, en per soort inhoud
 * de weergave.
 *
 * Uitkomst is een rij "stukken": één per knoop, met zijn kop en zijn eigen
 * inhoud. RapportAfdruk zet stukken die doorlopen in één sectie en begint een
 * nieuwe sectie waar een knoop op een nieuwe pagina hoort. Zo kan elk
 * hoofdstuk, elke paragraaf en ook het blok WANDEN op een vers vel beginnen,
 * zonder dat een kop en zijn inhoud van elkaar loskomen.
 *
 * Witregels volgen de referentie: een kop heeft een lege regel boven zich,
 * behalve direct onder de kop van zijn ouder; hoofdstuk-, paragraaf- en
 * blokkoppen hebben er ook een onder zich.
 */

/** Een stuk rapport: begint het op een nieuw vel, en wat staat erin. */
export interface Stuk {
  sleutel: string;
  nieuwePagina: boolean;
  inhoud: ReactNode;
}

/** Waar een knoop staat. */
interface Plaats {
  /** Begint een nieuwe sectie, en dus een nieuw vel. */
  begin: boolean;
  /** Staat direct onder de kop van zijn ouder, zonder iets ertussen. */
  direct: boolean;
  /** Inspringen van de inhoud, geërfd van het hoofdstuk. */
  inspringen: 0 | 1;
}

type Blad = NonNullable<Rapportknoop["blad"]>;

/** De kop van een knoop, met nummer. */
function Kop({ knoop, plaats }: { knoop: Rapportknoop; plaats: Plaats }) {
  const tekst = knoop.nummer ? `${knoop.nummer} ${knoop.titel}` : knoop.titel;
  const direct = plaats.direct ? " rpa-direct" : "";
  if (knoop.blad) return <h2 className="rpa-hb">{tekst}</h2>;
  // Een hoofdstuk dat binnen een sectie doorloopt krijgt een extra lege regel
  // boven zich; bovenaan een vel begint het blok van drie regels meteen.
  if (knoop.niveau === 1) return <h1 className={plaats.begin ? "rpa-h1" : "rpa-h1 rpa-vervolg"}>{tekst}</h1>;
  if (knoop.niveau === 2) return <h2 className={`rpa-h2${direct}`}>{tekst}</h2>;
  if (knoop.niveau === 3) return <h3 className={`rpa-h3${direct}`}>{tekst}</h3>;
  return <h4 className={`rpa-h4${direct}`}>{tekst}</h4>;
}

/** 2.2 Rol binnen het project: de openingszin, dan de rol, de architect en de datum van de onderlegger. */
function RolInhoud({ w }: { w: RapportWeergave }) {
  const { rol } = w.rapport;
  return (
    <>
      <Tekst tekst={w.rapport.teksten.rol} invul={w.invul} />
      <Rij>
        <Cel k={1} n={5}>{vulIn("Rol van {adviseur} in dit project:", w.invul)}</Cel>
        <Cel k={6} n={5}>{rol.rol}</Cel>
      </Rij>
      <Rij>
        <Cel k={2} n={4}>Bouwkundig adviseur/Architect:</Cel>
        <Cel k={6} n={5}>{rol.architect}</Cel>
      </Rij>
      <Rij>
        <Cel k={2} n={4}>Datum bouwkundige onderlegger:</Cel>
        <Cel k={6} n={5}>{rol.datumOnderlegger}</Cel>
      </Rij>
    </>
  );
}

/**
 * Het begin van hoofdstuk Berekeningen: een eigen inhoudsopgave van de
 * paragrafen (die staan niet in de inhoud voorin), met een lijn onder elke
 * regel en twee lege regels erna.
 */
function BerekeningenInhoud({ knoop }: { knoop: Rapportknoop }) {
  const paragrafen = knoop.kinderen.filter((k) => k.blad);
  if (paragrafen.length === 0) return <p className="rpa-tekst">Dit project bevat nog geen rekenbladen.</p>;
  return (
    <>
      <h3 className="rpa-io-kop">Inhoudsopgave</h3>
      {paragrafen.map((k) => (
        <Rij key={k.id} klasse="rpa-tt">
          <Cel k={1} n={3} o>{k.nummer} {k.titel}</Cel>
        </Rij>
      ))}
      <Leeg />
    </>
  );
}

/**
 * Eén blad in hoofdstuk Berekeningen: de automatische samenvatting uit de
 * bladkop, daaronder de eigen toelichting als die er is; dan de verwijzing
 * naar bijlage A, of — als het blad in het hoofdstuk zelf hoort — de
 * uitwerking hier.
 */
function Berekening({ blad, w }: { blad: Blad; w: RapportWeergave }) {
  const b = w.bladen.find((x) => x.ex.id === blad.id);
  const toelichting = w.rapport.toelichting[blad.id] ?? "";
  const inHoofdstuk = w.rapport.inHoofdstuk[blad.id] === true;
  return (
    <>
      {/* Zonder UC of oordeel zegt de samenvatting niets meer dan de kop. */}
      {b && (b.resultaat.uc !== null || b.resultaat.voldoet !== null) && (
        <p className="rpa-tekst">{samenvatting(b.resultaat)}</p>
      )}
      {toelichting.trim() && <Tekst tekst={toelichting} invul={w.invul} />}
      {inHoofdstuk && b ? (
        // `print-blad` geeft de uitwerking dezelfde compacte opmaak als een
        // los blad; `rpa-inline` haalt de paginasprong van een los blad weg.
        <Vlak klasse="print-blad rpa-inline">
          <div className="ifc-calc" dangerouslySetInnerHTML={{ __html: b.html }} />
        </Vlak>
      ) : (
        blad.bijlage && <p className="rpa-tekst">Zie bijlage {blad.bijlage}.</p>
      )}
    </>
  );
}

/** De eigen inhoud van een knoop, naar zijn soort. */
function InhoudVan({ knoop, w }: { knoop: Rapportknoop; w: RapportWeergave }) {
  switch (knoop.inhoud) {
    case "tekst":
      return <Tekst tekst={w.rapport.teksten[knoop.id]} invul={w.invul} />;
    case "rol":
      return <RolInhoud w={w} />;
    case "bouwwerk":
      return <Bouwwerk w={w} />;
    case "brand":
      return <Brand w={w} />;
    case "materialen":
      return <Materialen w={w} />;
    case "conservering":
      return <Conservering w={w} />;
    case "factoren":
      return <Factoren w={w} />;
    case "bestaand":
      return <Bestaand w={w} />;
    case "vervormingen":
      return <Vervormingen w={w} />;
    case "sneeuw":
      return <Sneeuw w={w} />;
    case "wind":
      return <Wind w={w} />;
    case "veranderlijk":
      return <Veranderlijk w={w} />;
    case "berekeningen":
      return <BerekeningenInhoud knoop={knoop} />;
    default:
      // "blijvend" krijgt in voegToe een eigen behandeling; zonder inhoud is er niets.
      return null;
  }
}

/** Zet een knoop en daarna zijn kinderen als stukken in `uit`. */
function voegToe(knoop: Rapportknoop, w: RapportWeergave, plaats: Plaats, uit: Stuk[]): void {
  const inspringen = knoop.inspringen ?? plaats.inspringen;
  const kop = <Kop knoop={knoop} plaats={plaats} />;

  // 5.5 heeft twee groepen. WANDEN begint standaard op een nieuw vel — maar
  // alleen als er ook vloeren of daken zijn, anders bleef de kop 5.5 alleen
  // achter op het vorige vel.
  if (knoop.inhoud === "blijvend") {
    const { vloerenDaken, wanden } = w.rapport.belastingen;
    const wandenApart = vloerenDaken.length > 0 && wanden.length > 0;
    uit.push({
      sleutel: knoop.id,
      nieuwePagina: plaats.begin,
      inhoud: (
        <Vlak>
          {kop}
          {vloerenDaken.length > 0 && (
            <Groep titel="VLOER, DAKEN" opbouwen={vloerenDaken} direct inspringen={inspringen} />
          )}
          {wanden.length > 0 && !wandenApart && (
            <Groep titel="WANDEN" opbouwen={wanden} direct={vloerenDaken.length === 0} inspringen={inspringen} />
          )}
        </Vlak>
      ),
    });
    if (wandenApart) {
      uit.push({
        sleutel: `${knoop.id}-wanden`,
        nieuwePagina: true,
        inhoud: (
          <Vlak>
            <Groep titel="WANDEN" opbouwen={wanden} direct={false} inspringen={inspringen} />
          </Vlak>
        ),
      });
    }
    return;
  }

  const eigen = knoop.blad ? (
    <Berekening blad={knoop.blad} w={w} />
  ) : knoop.inhoud ? (
    <InhoudVan knoop={knoop} w={w} />
  ) : null;
  uit.push({
    sleutel: knoop.id,
    nieuwePagina: plaats.begin,
    inhoud: (
      <Vlak>
        {kop}
        {eigen && (inspringen ? <Vlak klasse="rpa-in">{eigen}</Vlak> : eigen)}
      </Vlak>
    ),
  });

  // Het eerste kind staat direct onder deze kop als deze knoop zelf niets
  // toont en het kind niet op een nieuw vel begint.
  const zonderEigen = !knoop.inhoud && !knoop.blad;
  knoop.kinderen.forEach((kind, i) =>
    voegToe(
      kind,
      w,
      { begin: kind.nieuwePagina, direct: i === 0 && zonderEigen && !kind.nieuwePagina, inspringen },
      uit,
    ),
  );
}

/** Alle hoofdstukken als stukken. Het eerste begint altijd op een vers vel: de inhoud gaat eraan vooraf. */
export function hoofdstukStukken(w: RapportWeergave): Stuk[] {
  const uit: Stuk[] = [];
  w.knopen.forEach((knoop, i) =>
    voegToe(knoop, w, { begin: i === 0 || knoop.nieuwePagina, direct: false, inspringen: 0 }, uit),
  );
  return uit;
}
