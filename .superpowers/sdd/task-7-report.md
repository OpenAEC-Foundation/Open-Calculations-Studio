# Taak 7 - referentiedigitalisering en vergelijking

## Resultaat

- Acht gepubliceerde rijen voor sondering 1 en paalpuntniveaus NAP -18,5 m
  tot en met -22,0 m zijn exact vastgelegd.
- Pagina 1 krijgt een geschaald kalibratievoorstel op basis van de bekende
  pagina-indeling. De vier grenzen blijven afzonderlijk corrigeerbaar.
- De blauwe qc-curve wordt vóór tracering op kleur geïsoleerd. Daardoor
  beïnvloeden assen, rasterlijnen en de rode hulplijn de qc-route niet.
- De vergelijking rapporteert per niveau en per gepubliceerde grootheid de
  absolute en procentuele afwijking.
- De UI toont groen voor maximaal één beeldpixel, oranje voor maximaal twee
  beeldpixels en rood voor een verschil dat onderzoek vereist.

## Kalibratie en tolerantie

De vaste bronpagina is 842 x 1190 punten. Het voorstel gebruikt:

| Grens | Waarde op schaal 1 |
|---|---:|
| links | 211 px |
| rechts | 696 px |
| boven | 56 px |
| onder | 1084,5 px |
| qc-bereik | 0 - 35 MPa |
| dieptebereik | NAP 0 - -37 m |

Bij renderschaal 2 is de horizontale resolutie
`35 / (1392 - 422) = 0,03608 MPa/pixel`. De groene tolerantie bestaat uit
één pixel plus uitsluitend de zichtbare afronding van de gepubliceerde waarde.
De oranje curveleesmarge gebruikt twee pixels plus dezelfde afronding.
Afgeleide kN-toleranties volgen rechtstreeks uit paaloppervlak,
schachtomtrek, trajectlengte en de ingestelde rekenfactoren.

## Echte-PDF-keten

Bron:
`C:\Users\rickd\Documents\GitHub\verification-files\Constructieberekeningen\Funderingspaal\Vibro\AA22485resultaten grondonderzoek.pdf`

De render op schaal 2 leverde 1800 gedigitaliseerde punten en 95,87%
pixeldekking. Alle acht vereiste rekentrajecten hebben volledige dekking.

| NAP (m) | qc-I werkelijk | qc-I gepubliceerd | qc-I status | Rc;netto;d werkelijk (kN) | gepubliceerd (kN) | absolute afwijking (kN) | status |
|---:|---:|---:|---|---:|---:|---:|---|
| -18,5 | 10,160 | 10,3 | onderzoeken | 324,175 | 189 | 135,175 | onderzoeken |
| -19,0 | 9,169 | 9,3 | onderzoeken | 345,509 | 260 | 85,509 | onderzoeken |
| -19,5 | 11,154 | 11,2 | binnen 1 pixel | 434,315 | 380 | 54,315 | onderzoeken |
| -20,0 | 12,588 | 12,5 | curvelezing | 493,552 | 497 | 3,448 | binnen 1 pixel |
| -20,5 | 13,532 | 13,2 | onderzoeken | 551,676 | 602 | 50,324 | onderzoeken |
| -21,0 | 13,055 | 13,8 | onderzoeken | 544,125 | 669 | 124,875 | onderzoeken |
| -21,5 | 14,959 | 14,7 | onderzoeken | 618,156 | 782 | 163,844 | onderzoeken |
| -22,0 | 14,663 | 14,9 | onderzoeken | 258,557 | 493 | 234,443 | onderzoeken |

De rode uitkomsten zijn bewust niet met een ruimere tolerantie weggefilterd.
Ze maken zichtbaar waar curvelezing, invoer of rekenroute verder moet worden
onderzocht.

## TDD en verificatie

- Rood: referentierijen, vergelijking, kalibratie, kleurisolatie en UI-render
  faalden eerst omdat de productie-API's nog ontbraken.
- Groen: de gerichte referentietest bevat zes tests, inclusief de echte
  render/digitaliseer/reken-keten.
- De bestaande designer-unit- en integratietests blijven groen.
- De TypeScript- en Vite-productiebouw is geslaagd.
