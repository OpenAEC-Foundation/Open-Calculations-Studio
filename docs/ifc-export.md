# De IFC-export

## Waarom dit meer is dan een exportknop

Binnen het OpenAEC-ecosysteem is **IFCX de centrale drager**. De stichting
schrijft het zelf zo op: *"Within the OpenAEC ecosystem, IFCX is the central
data format. Each tool reads and writes IFCX"* — zodat data door de hele
AEC-keten stroomt *"without conversion or data loss"*.

Dit programma is daarin de constructieve rekenschakel. Wat hier niet in de
IFCX belandt, bestaat voor de rest van de keten niet: de geotechniekstudio
levert de sondering, dit levert de toetsing, een viewer toont het. Een project
van tien bladen dat er één exporteert, levert de keten dus negen bladen te
weinig.

Zie [projectmodel.md](projectmodel.md) voor hoe een project is opgebouwd.

## Wat er wordt weggeschreven

`Opslaan` schrijft één `.ifc-calculation`-bestand met drie lagen:

| veld | inhoud | voor wie |
|---|---|---|
| IFCX-document (`header`, `data`) | het **hele project** in één ruimtelijke boom | elke IFC-lezer |
| `source` | de rekentekst van het eerste blad | lezers die één blad verwachten |
| `project` | projectgegevens plus alle exemplaren met hun eigen invoer | deze app |

De ruimtelijke boom wordt één keer opgebouwd — `Project → Site → Building →
Storey` — en daaronder komen de elementen van álle bladen. Elk blad krijgt zijn
eigen elementnaam uit de projectboom:

```
/project/site/building/storey/0/beam/bl-01-begane-grond   "BL-01 begane grond"
/project/site/building/storey/0/beam/bl-02-verdieping     "BL-02 verdieping"
```

Drie balklagen zijn dus drie elementen, niet drie keer `B1`. Dat kon in het
oude model niet: één bestand was één blad was één element.

Voor `generateIfcx` (één blad) verandert er niets — die wordt nog gebruikt voor
de weergave in de IFC-tab, en houdt de vertrouwde namen `P1` / `F1` / `B1`.

Dezelfde slag is gemaakt voor **IFC4x3 STEP** (`generateProjectIfc4x3Step`).
Dat is het formaat dat bestaande viewers vandaag lezen; IFCX is de weg voor
straks. Beide horen hetzelfde te vertellen, dus ze lopen in de pas.

## Koppelen aan een bestaand model

Een exemplaar kan vastleggen over wélke elementen in een bronmodel het gaat:

```ts
elementen?: ElementRef[]   // { id: GlobalId of IFCX-pad, naam?: string }
```

- **Leeg** — losstaande berekening. De export maakt zelf een element aan onder
  de naam van het exemplaar. Dit is de normale gang van zaken en blijft dat:
  een kruipfactor of een boutberekening heeft geen model nodig, en dit
  programma is de opvolger van CalcPAD.
- **Gevuld** — de toetsing hoort bij díé elementen. Eén balklaagberekening kan
  zo aan alle balken van die laag hangen; dat is precies hoe je toetst.

De koppeling wordt **nooit geraden**. De heuristiek in `ifc-generator.ts`
herkent hoogstens het *soort* element — of het een balk of een paal is — en
zelfs dat ging mis tot de aanscherping van 25-08-2026 (zie punt 2 hieronder).
Wélk element een toetsing beschrijft weet alleen de constructeur, dus dat wordt
aangewezen, niet afgeleid.

Het veld is er nu wel, maar er is nog geen manier om het te vullen: het
inladen van een model en het aanklikken van elementen is een eigen feature.
De reden om het veld tóch alvast te hebben is het archief — bestanden die je
vanaf nu opslaat dragen identiteiten in de vorm waarin de koppeling past.

## Wat nog open staat

**1. Namespace.** De sleutels `properties` en `verification` zijn eigen
uitbreidingen zonder namespace. OpenAEC werkt juist met namespaces per domein
en publiceert die openbaar. Zolang er geen afspraak is voor toetsresultaten
blijven onze sleutels kaal — bij het invoeren van de namespace moeten ze daar
in één keer onder. **Openstaande vraag aan Maarten.**

**2. Detectie — deels opgelost, dekking nog dun.** De heuristiek werkt op
variabelenamen. Op 25-08-2026 zijn de valse positieven eruit gehaald: de
paalregel zocht naar `D` en `L`, en omdat de naamvergelijking hoofdletters
negeerde matchte `d` (nuttige hoogte) op `D`. Gevolg: elke doorsnede met een
`d` en een `L` werd een funderingspaal, terwijl het echte paalblad (`D_eq` +
`L_paal`) juist niet werd herkend.

Nu geldt: enkele letters zijn hoofdlettergevoelig (in constructieve notatie is
`d` de nuttige hoogte en `D` een diameter, `h` een hoogte en `H` een
horizontale kracht), en de paal wordt alleen herkend op ondubbelzinnige namen
(`D_paal`, `d_paal`, `D_eq`, `L_paal`, `l_paal`).

Wat blijft: **9 van de 79 bladen** leveren een element op, en er zijn maar drie
soorten (paal, fundering, balk). Kolommen, wanden en verbindingen worden niet
herkend. Dat uitbreiden vraagt domeinkennis over welke variabelenaam wat
betekent — geen giswerk.

**3. Bladen zonder element.** Een boutberekening of kruipfactor levert nu
niets in de IFCX, ook niet als hij aan elementen gekoppeld is. Daar is een
vorm voor nodig (een toetsresultaat dat aan een element hangt zonder zelf een
element te zijn) en die vorm hangt af van punt 1.

**4. Geometrie.** Die informatie bestáát niet in dit programma. Een balklaag
kent zijn overspanning en profiel, maar niet waar hij staat. Zonder posities
geen 3D-model; dat zou nieuwe invoer vragen.
