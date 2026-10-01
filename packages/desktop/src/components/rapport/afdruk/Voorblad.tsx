import type { ReactNode } from "react";
import { eersteDatum, rapportStatus } from "../../../rapport/revisies";
import type { RapportWeergave } from "./useRapportWeergave";
import { Cel, Leeg, Rij, Vlak } from "./raster";

/*
 * Het voorblad, regel voor regel op de plaatsen van de referentie: titel en
 * projectnaam bovenaan, daaronder het project en de opdrachtgever, en in de
 * onderste helft de documentgegevens met lijnen eronder.
 */

/** Een regel documentgegevens: label in de accentkleur, de waarde, een lijn onder beide. */
function Gegeven({ label, waarde, ingesprongen }: { label: ReactNode; waarde?: string; ingesprongen?: boolean }) {
  return (
    <Rij>
      <Cel k={ingesprongen ? 4 : 3} n={ingesprongen ? 2 : 3} o klasse="rpa-label">{label}</Cel>
      <Cel k={6} n={2} o>{waarde}</Cel>
    </Rij>
  );
}

/** "ter goedkeuring" → "Ter goedkeuring". */
const metHoofdletter = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function Voorblad({ w }: { w: RapportWeergave }) {
  const { rapport, bureau, invul } = w;
  const project = [invul.projectnummer, invul.projectnaam].filter(Boolean).join(" - ");
  const adres = rapport.opdrachtgeverAdres
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean);
  // Minstens vier regels, zodat de documentgegevens op hun vaste plaats blijven
  // staan, ook bij een opdrachtgever zonder adres.
  const opdracht = [invul.opdrachtgever, ...adres];
  while (opdracht.length < 4) opdracht.push("");
  const later = rapport.revisies.slice(1);

  return (
    <section className="rpa-sectie rpa-voorblad">
      <Vlak>
        <h1 className="rpa-vb-titel">
          {rapport.titel}
          {bureau.logo && <img className="rpa-vb-logo" src={bureau.logo} alt="" />}
        </h1>
        <p className="rpa-vb-ondertitel">{invul.projectnaam}</p>
        <Leeg n={11} />
        <Rij>
          <Cel k={3} n={3} klasse="rpa-vet">Project</Cel>
          <Cel k={6} n={5}>{project}</Cel>
        </Rij>
        <Leeg />
        {opdracht.map((regel, i) => (
          <Rij key={i}>
            {i === 0 && <Cel k={3} n={3} klasse="rpa-vet">In opdracht van</Cel>}
            <Cel k={6} n={5}>{regel}</Cel>
          </Rij>
        ))}
        <Leeg n={3} />
        <Gegeven label="Adviseur" waarde={bureau.naam} />
        <Gegeven label="Verantwoordelijk constructeur" waarde={rapport.verantwoordelijk} />
        <Gegeven label="Uitvoerend constructeur" waarde={rapport.uitvoerend} />
        <Gegeven label="Toegepaste Normen" waarde={rapport.normen} />
        <Gegeven label="Documentgegevens" />
        <Gegeven label={<>1<sup>e</sup> Datum rapport</>} waarde={eersteDatum(rapport.revisies)} />
        {later.length === 0 ? (
          <Gegeven label="Datum wijz." ingesprongen />
        ) : (
          later.map((r, i) => (
            <Gegeven key={i} label={`Datum wijz. ${r.code}`} waarde={r.datum} ingesprongen />
          ))
        )}
        <Leeg n={2} />
        <Gegeven label="Fase in bouwproces" waarde={rapport.fase} />
        <Gegeven label="Rapportstatus" waarde={metHoofdletter(rapportStatus(rapport.revisies))} />
        <Gegeven label="Documentkenmerk" waarde={rapport.kenmerk} />
      </Vlak>
    </section>
  );
}
