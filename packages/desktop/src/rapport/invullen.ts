/**
 * Invulvelden en tekstopmaak van de rapportteksten.
 *
 * Een standaardtekst noemt het bureau of het project niet letterlijk maar via
 * een invulveld: "{adviseur} heeft opdracht voor het constructieadvies voor dit
 * project." Zo blijft een eigen variant bruikbaar in elk volgend project. De
 * waarden komen bij het opmaken uit het rapport, het bureauprofiel en de
 * projectgegevens; opgeslagen wordt alleen de tekst met de accolades.
 *
 * Opmaak is bewust minimaal, net als in de referentie: één regel is één rij in
 * het rapport, een lege regel is een lege rij (een nieuwe alinea), en een regel
 * die met "-" begint is een opsommingsregel die één kolom inspringt.
 */

export interface Invulwaarden {
  adviseur: string; projectnummer: string; projectnaam: string; opdrachtgever: string;
  locatie: string; verantwoordelijk: string; uitvoerend: string;
}

/** De invulvelden in de volgorde waarin het paneel ze onder een tekstblok toont. */
export const INVULVELDEN: readonly (keyof Invulwaarden)[] = [
  "adviseur", "projectnummer", "projectnaam", "opdrachtgever",
  "locatie", "verantwoordelijk", "uitvoerend",
];

function isInvulveld(naam: string): naam is keyof Invulwaarden {
  return (INVULVELDEN as readonly string[]).includes(naam);
}

/**
 * {naam} → waarde; leeg → "—"; onbekende {x} blijven staan.
 *
 * Een leeg veld wordt een gedachtestreepje in plaats van niets, zodat een zin
 * als "Opdrachtgever: —" in de afdruk laat zien dát er iets ontbreekt. Een
 * onbekende naam blijft letterlijk staan: een tikfout ("{adviseru}") valt dan
 * op in het afdrukvoorbeeld in plaats van stil te verdwijnen.
 */
export function vulIn(tekst: string, w: Invulwaarden): string {
  return tekst.replace(/\{([A-Za-z]+)\}/g, (heel: string, naam: string) => {
    if (!isInvulveld(naam)) return heel;
    const waarde = w[naam].trim();
    return waarde === "" ? "—" : waarde;
  });
}

/** Eén regel van een tekst zoals hij in het rapport komt. */
export interface Tekstregel { tekst: string; leeg: boolean; inspringen: boolean; }

/**
 * Splitst op regeleinden; een lege regel is een lege rij; een regel die met "-" begint springt
 * één kolom in. Laat voor- en naloop van lege regels weg.
 */
export function tekstRegels(tekst: string): Tekstregel[] {
  const regels: Tekstregel[] = tekst.split(/\r\n|\r|\n/).map((ruw) => {
    const regel = ruw.trim();
    return { tekst: regel, leeg: regel === "", inspringen: regel.startsWith("-") };
  });
  let begin = 0;
  let eind = regels.length;
  while (begin < eind && regels[begin].leeg) begin++;
  while (eind > begin && regels[eind - 1].leeg) eind--;
  return regels.slice(begin, eind);
}
