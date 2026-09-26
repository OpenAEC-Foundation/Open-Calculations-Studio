/**
 * Projectkop voor de normbladen van de web-app.
 *
 * Dit is geen kopie van een desktopblad. De andere bestanden in deze map zijn
 * gelijk aan die in packages/desktop/src/templates. In de desktop-app zet de
 * app de projectgegevens (rekenwijze, gevolgklasse, ontwerplevensduur, wind)
 * vóór de eerste regel in de scope; zie store/projectGegevens.ts daar. De
 * web-app heeft geen projectgegevens en rekent een blad zonder scope door. Een
 * blad dat een projectgegeven gebruikt, zou dan stranden op een onbekend
 * symbool.
 *
 * Daarom krijgt zo'n blad hier, direct onder de titel, een keuzelijst per
 * projectgegeven dat het gebruikt. De eerste keuze is steeds de standaard van
 * de desktop-app, zodat een blad in beide apps hetzelfde uitrekent. K_FI volgt
 * uit de gevolgklasse, net als in de desktop-app (tabel NB.A1.1).
 */

interface Projectkeuze {
  /** Variabelenaam zoals de bladen hem gebruiken. */
  naam: string;
  /** Het @select-blok; de eerste keuze is de standaard van de desktop-app. */
  blok: string;
}

const KEUZES: Projectkeuze[] = [
  {
    naam: 'rekenwijze',
    blok: `@select rekenwijze "Rekenwijze bij een verschil met de referentie-uitwerking"
De referentie-uitwerking volgen = 1
De norm volgen = 0
@end`,
  },
  {
    naam: 'CC',
    blok: `@select CC "Gevolgklasse"
CC2 — middelmatige gevolgen = 2
CC1 — beperkte gevolgen = 1
CC3 — grote gevolgen = 3
@end`,
  },
  {
    naam: 'RC',
    blok: `@select RC "Betrouwbaarheidsklasse"
RC2 = 2
RC1 = 1
RC3 = 3
@end`,
  },
  {
    naam: 'DesignLife',
    blok: `@select DesignLife "Ontwerplevensduur"
50 jaar (standaard) = 50
10 jaar (tijdelijk) = 10
25 jaar = 25
100 jaar (monumenten/infra) = 100
@end`,
  },
  {
    naam: 'windgebied',
    blok: `@select windgebied "Windgebied (tabel NB.1)"
II — v_b,0 27,0 m/s = 2
I — v_b,0 29,5 m/s = 1
III — v_b,0 24,5 m/s = 3
@end`,
  },
  {
    naam: 'terreincategorie',
    blok: `@select terreincategorie "Terreincategorie (tabel NB.3 – 4.1)"
II — onbebouwd gebied = 2
0 — zee of kustgebied = 1
III — bebouwd gebied = 3
@end`,
  },
];

/** K_FI bij de gevolgklasse, tabel NB.A1.1: CC1 0,9 · CC2 1,0 · CC3 1,1. */
const K_FI_BLOK = `#hide
K_FI = if(CC ≡ 1; 0.9; if(CC ≡ 3; 1.1; 1))
#show`;

/** Komt `naam` als losse naam in het blad voor? */
function gebruikt(blad: string, naam: string): boolean {
  return new RegExp(`(?<![\\p{L}\\p{N}_])${naam}(?![\\p{L}\\p{N}_])`, 'u').test(blad);
}

/**
 * Het blad met, direct onder de titelregel, de keuzelijsten van de
 * projectgegevens die het gebruikt. Een blad zonder projectgegevens blijft
 * ongewijzigd.
 */
export function metProjectkop(blad: string): string {
  const kFi = gebruikt(blad, 'K_FI');
  const blokken = KEUZES
    .filter((k) => gebruikt(blad, k.naam) || (kFi && k.naam === 'CC'))
    .map((k) => k.blok);
  if (kFi) blokken.push(K_FI_BLOK);
  if (blokken.length === 0) return blad;

  const kop = `${blokken.join('\n')}\n`;
  const eindTitel = blad.indexOf('\n');
  if (/^["#]/.test(blad) && eindTitel >= 0) {
    return `${blad.slice(0, eindTitel + 1)}${kop}${blad.slice(eindTitel + 1)}`;
  }
  return kop + blad;
}
