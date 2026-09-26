/**
 * Wat het beeld van een balklaag moet weten over de tekst van zijn blad.
 *
 * Een ingevoegd blad bewaart zijn eigen tekst en volgt het sjabloon daarna niet
 * meer. Een balklaag uit een oudere versie kent de keuze "soort ligger" en de
 * vrije maat ("Zelf invullen") niet, en toont k_def niet. Het beeld leest hier
 * af wat het blad wél kent, zodat het niets tekent of aanbiedt waar het blad
 * niet mee rekent.
 */

/** Welke onderdelen de tekst van het blad kent. */
export interface BalklaagKent {
  /** De keuze "soort ligger" (balk in een balklaag of onderslag). */
  ligger: boolean;
  /** De keuze "Zelf invullen" in de profiellijst. */
  zelf: boolean;
}

export function balklaagKent(source: string): BalklaagKent {
  return {
    ligger: /@select ligger\b/.test(source),
    zelf: /Zelf invullen = 28\b/.test(source),
  };
}

/**
 * Kruipfactor k_def voor massief hout (EN 1995-1-1 Tabel 3.2), gelijk aan het
 * blad. Terugval voor een ouder blad waarin k_def verborgen staat.
 */
export function kdefUitKlimaat(klimaat: number): number {
  return klimaat === 1 ? 0.6 : klimaat === 2 ? 0.8 : 2.0;
}
