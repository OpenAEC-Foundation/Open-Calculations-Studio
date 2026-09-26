import { Fragment, type CSSProperties } from "react";
import { STANDAARD_HUISSTIJL, type BureauProfiel, type Huisstijl } from "../../../rapport/model";
import { PrintBlad } from "../../calc/PrintBlad";
import { useRapportWeergave, type RapportBlad } from "./useRapportWeergave";
import { hoofdstukStukken, type Stuk } from "./Knopen";
import Voorblad from "./Voorblad";
import Inhoud from "./Inhoud";
import "./RapportAfdruk.css";

/** De huisstijl als CSS-variabelen op de wortel. Een leeg veld valt terug op de standaard. */
function huisstijlStijl(h: Huisstijl): CSSProperties {
  const s = STANDAARD_HUISSTIJL;
  return {
    "--rpa-hoofd": h.hoofdkleur || s.hoofdkleur,
    "--rpa-accent": h.accentkleur || s.accentkleur,
    "--rpa-tabel": h.tabeltekst || s.tabeltekst,
    "--rpa-invoer": h.invoerkleur || s.invoerkleur,
    "--rpa-font": h.lettertype || s.lettertype,
  } as CSSProperties;
}

/** Stukken in secties: een stuk met `nieuwePagina` begint een nieuwe sectie, en daarmee een nieuw vel. */
function groepeer(stukken: Stuk[]): Stuk[][] {
  const secties: Stuk[][] = [];
  for (const s of stukken) {
    if (s.nieuwePagina || secties.length === 0) secties.push([s]);
    else secties[secties.length - 1].push(s);
  }
  return secties;
}

/**
 * De voet voor de echte afdruk: de voetafbeelding van het bureau over de
 * volle breedte in de ondermarge, of zonder afbeelding een dunne lijn met de
 * bureaunaam. Een vast element herhaalt de browser op elke afgedrukte pagina;
 * op het scherm is hij onzichtbaar (het afdrukvoorbeeld tekent zijn eigen
 * voet per vel).
 */
function Voet({ bureau }: { bureau: BureauProfiel }) {
  return (
    <div className="rpa-voet" aria-hidden="true">
      {bureau.voetafbeelding ? (
        <img className="rpa-voet-beeld" src={bureau.voetafbeelding} alt="" />
      ) : (
        <div className="rpa-voet-lijn">{bureau.naam}</div>
      )}
    </div>
  );
}

/** Een blad in bijlage A, met zijn bijlagenummer. */
type BijlageBlad = RapportBlad & { nummer: string };

/**
 * Het volledige constructierapport: voorblad, inhoud, de hoofdstukken en
 * bijlage A. Elke `section` begint op een nieuw vel — in het afdrukvoorbeeld
 * omdat de verdeling dat zo doet, bij het printen via `break-before`.
 */
export default function RapportAfdruk() {
  const w = useRapportWeergave();
  const secties = groepeer(hoofdstukStukken(w));

  // Bijlage A: de bladen waarvan de uitwerking niet in het hoofdstuk zelf
  // staat, in de volgorde en met de nummers van hoofdstuk Berekeningen.
  const berekeningen = w.knopen.find((k) => k.id === "berekeningen");
  const inBijlage = (berekeningen?.kinderen ?? []).flatMap((k): BijlageBlad[] => {
    const blad = k.blad;
    if (!blad || !blad.bijlage || w.rapport.inHoofdstuk[blad.id]) return [];
    const b = w.bladen.find((x) => x.ex.id === blad.id);
    return b ? [{ ...b, nummer: blad.bijlage }] : [];
  });
  const titelA = w.bijlagen.find((b) => b.letter === "A")?.titel ?? "Uitgebreide uitwerking berekeningen";

  return (
    <div className="rpa-wortel" style={huisstijlStijl(w.bureau.huisstijl)}>
      <Voet bureau={w.bureau} />
      <Voorblad w={w} />
      <Inhoud w={w} />
      {secties.map((stukken) => (
        <section key={stukken[0].sleutel} className="rpa-sectie">
          {stukken.map((s) => (
            <Fragment key={s.sleutel}>{s.inhoud}</Fragment>
          ))}
        </section>
      ))}
      {inBijlage.length > 0 && (
        <section className="rpa-sectie rpa-bijlagekop">
          <h1 className="rpa-h1">Bijlage A {titelA}</h1>
        </section>
      )}
      {inBijlage.map((b) => (
        <PrintBlad key={b.ex.id} ex={b.ex} html={b.html} nummer={b.nummer} resultaat={b.resultaat} />
      ))}
    </div>
  );
}
