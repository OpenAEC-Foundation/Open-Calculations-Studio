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
- De UI toont de referentiekalibratie, kleurisolatie en vergelijking alleen
  wanneer de volledige bronidentiteit klopt. Een willekeurige PDF op pagina
  1 krijgt de generieke kalibratieroute.

## Herkomst van de invoer

Het referentierapport publiceert voor bodemprofiel 1 en 2 respectievelijk
`Fnk;max;d = 247 kN` en `0 kN`. De rijwaarde `Fnk;d = 245 kN` staat voor
ieder van de acht paalpuntniveaus in de resultatenkolom.

De onderliggende laagparameters voor een onafhankelijke reconstructie van
negatieve kleef worden niet in het rapport gepubliceerd. Daarom gebruikt de
referentieketen de expliciet gepubliceerde rijwaarde 245 kN. Zo blijft de
herkomst controleerbaar en wordt het netto resultaat niet gekalibreerd.

## Bronbinding

Bron:
`C:\Users\rickd\Documents\GitHub\verification-files\Constructieberekeningen\Funderingspaal\Vibro\AA22485resultaten grondonderzoek.pdf`

De bronbinding controleert:

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

De toleranties bevatten uitsluitend de formulegevoeligheid voor
pixelonzekerheid:

- groen: maximale uitkomstverandering door plus of min één pixel in qc- of
  diepterichting;
- oranje: dezelfde berekening voor plus of min twee pixels;
- rood: groter dan de tweepixelgevoeligheid.

Er wordt geen tolerantie voor publicatieafronding of vaste invoer opgeteld.

## Echte-PDF-keten

De echte bron-PDF wordt gerenderd, de blauwe qc-curve wordt geïsoleerd en
gedigitaliseerd, en alle acht rekentrajecten worden op dekking gecontroleerd.
De ontwerpwaarde voor negatieve kleef is in iedere rij 245 kN en
`Rc;netto;d = Rc;d - 245`.

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

De rode uitkomsten blijven zichtbaar. Ze worden niet met verruimde
toleranties of een aangepaste negatieve-kleefwaarde weggefilterd.

## TDD en verificatie

- De bronidentiteitstest faalde eerst omdat de renderlaag nog geen hash,
  paginatekst en bronafmetingen doorgaf.
- De referentietest valideert de invoerherkomst, bronbinding, kleurisolatie,
  kalibratieresolutie, tolerantieherkomst en alle 64 statussen.
- De integratietest bewijst dat een verkeerde bestandshash de
  referentieroute uitschakelt.
- De volledige desktop-suite is geslaagd: 13 testbestanden en 92 tests.
- De TypeScript- en Vite-productiebouw is geslaagd.
