# VIBRO-paaldraagvermogen uit een sonderings-PDF

Datum: 2026-07-23  
Status: goedgekeurd concept voor implementatieplanning

## Doel

Open Calculations Studio krijgt een specifieke VIBRO-palentool die uit één
sonderingsgrafiek in een PDF automatisch de conusweerstand `qc` digitaliseert.
De tool bepaalt voor één sondering de benodigde punt- en schachtgemiddelden,
genereert een controleerbare rekensheet in Calcpad-syntax en slaat die sheet op
in het bestaande documentmodel.

De eerste validatie gebruikt sondering 1 uit het grondonderzoek van project
AA22485 en vergelijkt de resultaten met bijlage 3.4 van het bijbehorende
referentierapport.

## Afbakening versie 1

Versie 1 ondersteunt:

- één sondering per rekensheet;
- invoer uit een sonderingsgrafiek in PDF-formaat;
- een geheide/getrokken VIBRO-paal;
- automatische digitalisering van de `qc`-curve;
- automatische bepaling van `qc;I`, `qc;II`, `qc;III` en `qc;z;a`;
- punt-, schacht- en netto paaldraagvermogen;
- negatieve kleef;
- een unity check op de rekenwaarde van de paalbelasting;
- opslag van de gegenereerde Calcpad-rekensheet;
- opslag van de gedigitaliseerde meetpunten in de sheet.

Niet opgenomen in versie 1:

- meerdere sonderingen in één sheet;
- gecombineerde statistische verwerking met afzonderlijke gemiddelde en
  minimale waarden over meerdere sonderingen;
- rechtstreekse GEF-import;
- automatische verwerking van willekeurige rapportlay-outs zonder
  gebruikerscontrole;
- trekweerstand, paalgroepen, horizontale belasting of constructieve
  doorsnedetoetsing van de paal.

## Eerste validatiegeval

De vaste eerste testconfiguratie is:

- sondering: 1;
- paaltype: VIBRO-paal, heiend getrokken;
- schachtdiameter: 323 mm;
- voetdiameter: 365 mm;
- te onderzoeken paalpuntniveaus: NAP -18,50 m tot en met NAP -22,00 m;
- stapgrootte paalpuntniveau: 0,50 m;
- referentie: bijlage 3.4 van het referentierapport;
- gewenste eindwaarde: `Rc;net;d`.

De test vergelijkt per paalpuntniveau eerst de vier afgeleide `qc`-waarden en
pas daarna de daaruit berekende weerstanden. Hierdoor is onderscheid mogelijk
tussen digitaliseringsafwijkingen en formuleafwijkingen.

## Gebruikersstroom

1. De gebruiker opent de VIBRO-palentool.
2. De gebruiker selecteert een lokaal grondonderzoek in PDF-formaat.
3. De tool toont de pagina's en laat de gebruiker sondering 1 kiezen.
4. De tool herkent het `qc`-diagram en toont een visuele controlelaag met:
   - de gevonden diagramgrenzen;
   - de horizontale schaal;
   - de verticale schaal en het referentieniveau;
   - de gevonden `qc`-curve.
5. De gebruiker corrigeert zo nodig de grenzen, assen of curve.
6. De gebruiker vult paalgeometrie, factoren, positieve-kleefzone,
   grondlagen voor negatieve kleef en paalbelasting in.
7. De tool berekent de trajectgemiddelden voor alle gekozen
   paalpuntniveaus.
8. De gebruiker genereert de rekensheet.
9. Open Calculations Studio opent en bewaart de sheet via de bestaande
   documentopslag.

De berekening mag niet worden gegenereerd wanneer de assen, diepteschaal of
curve onvoldoende betrouwbaar zijn bepaald.

## Componenten

### VIBRO-paalontwerper

Een nieuwe React-component volgt de bestaande ontwerperpatronen in de desktop-
app. De component beheert uitsluitend de gebruikersstroom, invoervelden,
visuele controle en het genereren van de sheet.

### PDF-paginarendering

De desktoplaag rendert de gekozen PDF-pagina naar een rasterafbeelding met
voldoende resolutie om de grafieklijn betrouwbaar te bemonsteren. De bron-PDF
blijft ongewijzigd.

### Grafiekkalibratie

De kalibratielaag bepaalt of ontvangt:

- de pixelgrenzen van het `qc`-diagram;
- `qc_min` en `qc_max`, in de eerste test 0 en 20 MPa;
- het bovenste en onderste diepteniveau;
- het maaiveld- of NAP-referentieniveau.

Pixelcoördinaten worden met een lineaire transformatie naar `qc` en diepte
omgezet. Alle kalibratieparameters worden samen met de gedigitaliseerde curve
bewaard.

### Curvedigitalisering

De digitaliseerder:

1. beperkt de analyse tot het gekalibreerde diagram;
2. onderdrukt rasterlijnen, tekst en markeringen;
3. detecteert per verticale positie kandidaatpixels van de `qc`-curve;
4. kiest een doorlopende route met een voorkeur voor beperkte sprongen;
5. vult alleen kleine onderbrekingen door interpolatie;
6. levert meetpunten met diepte, `qc` en een betrouwbaarheidsscore.

De visuele controlelaag tekent de gekozen route over de originele pagina.
Onzekere segmenten krijgen een afwijkende kleur.

### Geotechnische rekenkern

De rekenkern is onafhankelijk van React en ontvangt uitsluitend getypeerde
meetpunten en invoerparameters. Per paalpuntniveau bepaalt hij:

- `qc;I;gem` in traject I onder de paalpunt;
- `qc;II;gem` volgens de voorgeschreven minimumroute onder de paalpunt;
- `qc;III;gem` boven de paalpunt;
- `qc;z;a` over het positieve-schachtwrijvingstraject;
- `qb;max`;
- `Rb;cal`;
- `Rs;cal`;
- `Rc;cal`;
- `Rc;k` met de correlatiefactor voor één sondering;
- `Rc;d`;
- `Fnk;d`;
- `Rc;net;d`;
- de unity check.

De exacte trajectconstructie en afrondingsvolgorde worden als afzonderlijke,
testbare functies geïmplementeerd. Normfactoren staan zichtbaar als invoer in
de sheet en worden niet verborgen in de code.

### Calcpad-sheetgenerator

De generator maakt een zelfstandige en leesbare sheet met:

- project- en brongegevens;
- paalgeometrie en niveaus;
- digitaliserings- en kalibratiegegevens;
- de relevante gedigitaliseerde meetpunten;
- alle normfactoren en grondparameters;
- de afleiding van de vier `qc`-waarden;
- punt- en schachtweerstand;
- negatieve kleef per grondlaag;
- `Rc;net;d` en unity check;
- een compacte grafiek met curve en gebruikte trajecten;
- een vergelijkingstabel voor de reeks paalpuntniveaus.

De sheet bevat echte Calcpad-formules voor alle afgeleide waarden. Alleen
bronmeetpunten en expliciete gebruikersinvoer worden als vaste waarden
opgenomen.

## Gegevensmodel

De kern gebruikt ten minste de volgende modellen:

```ts
type DigitizedCptPoint = {
  depthNapM: number;
  qcMpa: number;
  confidence: number;
};

type CptCalibration = {
  pageIndex: number;
  plotBoundsPx: { left: number; top: number; right: number; bottom: number };
  qcMinMpa: number;
  qcMaxMpa: number;
  depthTopNapM: number;
  depthBottomNapM: number;
};

type VibroPileInput = {
  shaftDiameterMm: number;
  baseDiameterMm: number;
  pileHeadNapM: number;
  pileTipNapM: number;
  positiveShaftStartNapM: number;
  alphaP: number;
  alphaS: number;
  beta: number;
  shapeFactor: number;
  xiSingleCpt: number;
  gammaB: number;
  gammaS: number;
  designLoadKn: number;
  negativeSkinLayers: NegativeSkinLayer[];
};
```

Het opgeslagen document bevat voldoende informatie om een sheet opnieuw te
genereren zonder de PDF opnieuw te digitaliseren.

## Betrouwbaarheid en foutafhandeling

De tool blokkeert genereren wanneer:

- geen diagramgebied is gevonden;
- de schaal niet eenduidig is;
- de curve over een relevant rekentraject ontbreekt;
- een paalpunt of invloedsgebied buiten de gedigitaliseerde diepte valt;
- minder dan het vereiste aandeel van een traject betrouwbare meetpunten
  bevat;
- een grondlaag voor negatieve kleef een gat of overlap veroorzaakt;
- diameters, niveaus of factoren fysiek ongeldige waarden bevatten.

Waarschuwingen, maar geen blokkade, gelden voor:

- korte geïnterpoleerde curveonderbrekingen;
- lokaal lage betrouwbaarheid buiten gebruikte trajecten;
- kleine verschillen tussen herkende en handmatig gecorrigeerde assen.

Geen resultaat wordt stilzwijgend geëxtrapoleerd buiten het bereik van de
gedigitaliseerde curve.

## Validatiestrategie

### Eenheidstests

- pixel-naar-`qc`-transformatie;
- pixel-naar-NAP-transformatie;
- lijnselectie bij rasterlijnen en curveonderbrekingen;
- trajectselectie voor `qc;I`, `qc;II` en `qc;III`;
- minimumroute voor `qc;II`;
- schachtgemiddelde `qc;z;a`;
- punt- en schachtweerstand;
- negatieve kleef per laag en als som;
- correlatie- en materiaalfactoren;
- `Rc;net;d` en unity check.

### Referentietest

Voor sondering 1 worden de resultaten op alle acht paalpuntniveaus vergeleken
met de waarden in het referentierapport. De testuitvoer toont:

- absolute afwijking;
- procentuele afwijking;
- afwijking van elk `qc`-gemiddelde;
- afwijking van `Rb;cal`, `Rs;cal`, `Rc;d` en `Rc;net;d`.

De tolerantie wordt niet vooraf ruim gekozen. Eerst wordt de werkelijke
pixelresolutie bepaald; daarna wordt een onderbouwde tolerantie vastgelegd die
past bij de leesnauwkeurigheid van de grafiek.

### Integratietest

Een integratietest doorloopt PDF-selectie, kalibratie, digitalisering,
sheetgeneratie, parsering en evaluatie van de gegenereerde Calcpad-bron. De
test controleert dat de opgeslagen sheet na heropenen dezelfde resultaten
geeft.

## Acceptatiecriteria

Versie 1 is gereed wanneer:

- sondering 1 uit de aangewezen PDF automatisch wordt gedigitaliseerd;
- de gebruiker de gedetecteerde assen en curve visueel kan controleren en
  corrigeren;
- de vier vereiste `qc`-waarden automatisch worden berekend;
- de sheet voor alle gekozen niveaus `Rc;net;d` berekent;
- de sheet zonder parser- of evaluatiefouten opent;
- opslaan en heropenen geen meetpunten of invoer verliest;
- afwijkingen ten opzichte van het referentierapport per tussenstap zichtbaar
  en technisch verklaard zijn;
- alle automatische tests slagen.

