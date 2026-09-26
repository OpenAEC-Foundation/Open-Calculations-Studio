import type { RapportWeergave } from "./useRapportWeergave";
import { Cel, Rij, Vlak } from "./raster";

/**
 * De inhoudsopgave: hoofdstukken (vet, accentkleur, met een lege regel
 * ervoor) en paragrafen, daarna de bijlagen. Zonder paginanummers: bij
 * afdrukken via de browser liggen die vooraf niet vast.
 */
export default function Inhoud({ w }: { w: RapportWeergave }) {
  return (
    <section className="rpa-sectie rpa-inhoud">
      <Vlak>
        <h1 className="rpa-h1">Inhoud</h1>
        {w.inhoud.map((r, i) => (
          <Rij key={r.nummer} klasse={r.niveau === 1 ? (i === 0 ? "rpa-io1" : "rpa-io1 rpa-voor") : undefined}>
            <Cel k={2}>{r.nummer}</Cel>
            <Cel k={3} n={8}>{r.titel}</Cel>
          </Rij>
        ))}
        {w.bijlagen.map((b, i) => (
          <Rij key={b.letter} klasse={i === 0 ? "rpa-voor" : undefined}>
            <Cel k={2} klasse="rpa-vet">Bijlage {b.letter}</Cel>
            <Cel k={3} n={8}>{b.titel}</Cel>
          </Rij>
        ))}
      </Vlak>
    </section>
  );
}
