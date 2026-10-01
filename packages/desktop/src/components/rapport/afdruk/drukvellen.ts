/**
 * Het rapport afdrukken zoals het afdrukvoorbeeld het toont.
 *
 * Het voorbeeld bouwt zelf exacte A4-vellen, met de voetafbeelding onderaan
 * en het paginanummer rechts. Laat je de browser het rapport zelf pagineren,
 * dan zet hij de vastgezette voet bij een eigen paginaformaat op de verkeerde
 * plek en vallen koppen weg. Daarom gaat een kopie van díe vellen naar de
 * printer: wat je in het voorbeeld ziet, komt op papier.
 */

const VELLEN = ".av-vellen-binnen .av-pagina";

/** Wacht tot het voorbeeld zijn vellen heeft gebouwd en het aantal stil staat. */
export function wachtOpVellen(maxMs = 10000): Promise<HTMLElement[]> {
  return new Promise((klaar, mis) => {
    const begin = Date.now();
    let vorige = -1;
    const kijk = () => {
      const vellen = [...document.querySelectorAll<HTMLElement>(VELLEN)];
      if (vellen.length > 0 && vellen.length === vorige) return klaar(vellen);
      vorige = vellen.length;
      if (Date.now() - begin > maxMs) return mis(new Error("Het afdrukvoorbeeld van het rapport bouwde geen vellen."));
      window.setTimeout(kijk, 300);
    };
    kijk();
  });
}

/**
 * Zet een kopie van de vellen klaar om af te drukken en verbergt de rest van
 * de app. Geeft de functie terug die alles weer opruimt.
 */
export function zetDrukvellenKlaar(vellen: HTMLElement[]): () => void {
  const bak = document.createElement("div");
  bak.className = "rpa-drukvellen";
  for (const vel of vellen) bak.appendChild(vel.cloneNode(true));
  document.body.appendChild(bak);
  document.documentElement.classList.add("rapportdruk");
  return () => {
    bak.remove();
    document.documentElement.classList.remove("rapportdruk");
  };
}
