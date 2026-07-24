# Taak 7 - referentiedigitalisering en vergelijking

## Resultaat

- De validatie is gebonden aan het exacte bronbestand, pagina 1, de
  bronafmetingen 842 x 1190 en sondeeridentiteit `AA22485 01 1/2`.
- Acht gepubliceerde rijen voor paalpuntniveaus NAP -18,5 m tot en met
  -22,0 m zijn exact vastgelegd.
- De referentie-invoer gebruikt `alphaS = 0,014` en een positieve
  schachtstart op NAP -17,25 m. Voor de eerste paalpunt is de gepubliceerde
  schachtlengte daarmee 1,25 m.
- De gepubliceerde ontwerpwaarde voor negatieve kleef is 245 kN voor alle
  acht rijen. Deze waarde wordt rechtstreeks uit de rapporttabel toegepast;
  hij wordt niet uit het gewenste netto eindresultaat teruggerekend.
- De vergelijking rekent met de actuele zichtbare paalinvoer. Bij een
  afwijkende configuratie toont de UI een waarschuwing en geen
  referentiestatus. De gebruiker kan de expliciete referentie-invoer
  toepassen.

## Herkomst en consistentie van de invoer

Het referentierapport publiceert voor bodemprofiel 1 en 2 respectievelijk
`Fnk;max;d = 247 kN` en `0 kN`. De rijwaarde `Fnk;d = 245 kN` staat voor
ieder van de acht paalpuntniveaus in de resultatenkolom.

De onderliggende laagparameters voor een onafhankelijke reconstructie van
negatieve kleef worden niet in het rapport gepubliceerd. Daarom bevat de
actuele invoer een expliciet veld voor de gepubliceerde ontwerpwaarde
`Fnk;d = 245 kN`. De rekenkern en gegenereerde sheet lezen hetzelfde veld.
Zo blijft de herkomst controleerbaar en wordt het netto resultaat niet
teruggerekend.

De referentiestatus wordt alleen berekend wanneer alle actuele
paalparameters, factoren, positieve-schachtlagen, negatieve-kleefinvoer en
ontwerpbelasting exact met de referentieconfiguratie overeenkomen. Bij een
afwijking blijft de tabel verborgen en verschijnt
`Referentieconfiguratie wijkt af`.

## Bronbinding

Bron:
`C:\Users\rickd\Documents\GitHub\verification-files\Constructieberekeningen\Funderingspaal\Vibro\AA22485resultaten grondonderzoek.pdf`

| Kenmerk | Vereiste |
|---|---|
| SHA-256 | `c3c472a863c934ae05943776f860157a086abbd5ded0e2676c8ed38d91505c5e` |
| pagina-index | 0 |
| bronafmetingen | 842 x 1190 |
| tekstmarker | `Sondeernr.:` |
| project en sondering | `AA22485 01 1/2` |

## Kalibratie en tolerantie

Het vaste voorstel op renderschaal 1 gebruikt:

| Grens | Waarde |
|---|---:|
| links | 211 px |
| rechts | 696 px |
| boven | 56 px |
| onder | 1084,5 px |
| qc-bereik | 0 - 35 MPa |
| dieptebereik | NAP 0 - -37 m |

De pixelsensitiviteit wordt door de productierekenroute bepaald voor alle
acht combinaties van `qc = -1, 0, +1 pixel` en
`diepte = -1, 0, +1 pixel`, met uitzondering van de ongewijzigde combinatie.
Lokale horizontale pixelwijzigingen liggen door de monotone qc-formules
binnen de gelijktijdige plus/min-envelop. Dezelfde route wordt voor twee
pixels herhaald.

Publicatieafronding blijft een afzonderlijke component:

- qc-gemiddelden: 0,05 MPa;
- `qb;max`: 0,005 MPa;
- gepubliceerde gehele kN-waarden: 0,5 kN.

Groen is de eenpixelgevoeligheid plus publicatieafronding. Oranje is de
tweepixelgevoeligheid plus dezelfde publicatieafronding. Er wordt geen
andere vaste invoermarge toegevoegd.

## Echte-PDF-keten

De echte bron-PDF wordt gerenderd, de blauwe qc-curve wordt geïsoleerd en
gedigitaliseerd, en alle acht rekentrajecten worden op dekking gecontroleerd.
De actuele referentie-invoer, rekenkern en sheet gebruiken in iedere rij
dezelfde ontwerpwaarde 245 kN en `Rc;netto;d = Rc;d - 245`.

| NAP (m) | Rc;d berekend (kN) | Rc;d rapport (kN) | Rc;netto;d berekend (kN) | Rc;netto;d rapport (kN) | status netto |
|---:|---:|---:|---:|---:|---|
| -18,5 | 378,667 | 434 | 133,667 | 189 | onderzoeken |
| -19,0 | 425,037 | 504 | 180,037 | 260 | onderzoeken |
| -19,5 | 538,879 | 625 | 293,879 | 380 | onderzoeken |
| -20,0 | 623,151 | 741 | 378,151 | 497 | onderzoeken |
| -20,5 | 706,311 | 847 | 461,311 | 602 | onderzoeken |
| -21,0 | 723,796 | 914 | 478,796 | 669 | onderzoeken |
| -21,5 | 822,862 | 1026 | 577,862 | 782 | onderzoeken |
| -22,0 | 488,299 | 737 | 243,299 | 493 | onderzoeken |

De rode uitkomsten blijven zichtbaar. Ze worden niet met een aangepaste
negatieve-kleefwaarde of niet-herleidbare marge weggefilterd.

## TDD en verificatie

- De 2D-hoektest faalde eerst aantoonbaar met een te krappe envelop:
  4,210 kN tegenover een benodigde 5,889 kN.
- De sheetconsistentietest faalde eerst met sheetwaarde 0 kN tegenover
  rekenkernwaarde 245 kN.
- Match- en mismatchtests controleren dat alleen actuele, exact
  overeenkomende invoer een statusoordeel krijgt.
- De echte-PDF-test valideert alle 64 tussenstapstatussen.
- De volledige desktop-suite is geslaagd: 13 testbestanden en 97 tests.
- De TypeScript- en Vite-productiebouw is geslaagd.
