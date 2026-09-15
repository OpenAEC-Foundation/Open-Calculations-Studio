# Het projectmodel

Een project is een lijst rekenbladen die naast elkaar bestaan, met één laag
gedeelde projectgegevens erboven. Dit document legt vast hoe die scheiding
loopt en waarom hij zo strikt is.

## De kern in één regel

**Projectgegevens zijn gedeeld en expliciet. Al het andere hoort bij het blad
waar het staat.**

## Exemplaren

Een module uit de catalogus (`components/calc/projectTree.ts`) kan zo vaak in
een project voorkomen als je wilt. Elke invoeging maakt een **exemplaar**
(`store/projectStore.ts`):

```ts
interface Exemplaar {
  id: string;
  naam: string;                        // "Balklaag 1", te hernoemen
  templateId: string;                  // herkomst, alleen ter informatie
  source: string;                      // eigen kopie van de rekentekst
  waarden: Record<string, string>;     // eigen invoer
  elementen?: ElementRef[];            // elementen in een bronmodel; leeg = losstaand
}
```

Twee dingen zijn hier bewust zo:

**Eigen kopie van de tekst.** Een exemplaar volgt zijn sjabloon niet. Verbeter
je het sjabloon, dan verandert een berekening die je vorig jaar hebt
opgeleverd níét — een opgeleverd stuk moet over vijf jaar hetzelfde uitrekenen.
En je mag de tekst van dít exemplaar aanpassen (een extra toetsing, een
aangepaste aanname) zonder de andere exemplaren te raken.

**Eigen waardenmap.** `N_Ed` in de kolom en `N_Ed` in de wand zijn verschillende
vakjes. Dat lijkt vanzelfsprekend, maar was het niet: tot 25-08-2026 was er één
platte waardenmap voor de hele app, waarin de variabelenaam de enige sleutel
was. Negentien namen werden gedeeld tussen bladen, en het blad dat als eerste
opende bepaalde de waarde voor alle volgende. In de praktijk betekende dat
bijvoorbeeld dat je na het openen van *Dragende metselwerkwand* in *Oplegging
op metselwerk* een unity check van 3,95 kreeg in plaats van 12,66 — een factor
3,2, de onveilige kant op, zonder enig teken in de UI. Die hele klasse fouten is
met de per-exemplaar-opslag onmogelijk geworden.

## Projectgegevens

De velden staan in `store/projectGegevens.ts` en worden ingevuld in het
formulier *Projectgegevens* (`components/calc/ProjectGegevensPanel.tsx`):

| veld | variabele | wat het is |
|---|---|---|
| Projectnummer, -naam, opdrachtgever, constructeur, locatie, onderdeel | `project_nummer`, `project_naam`, `opdrachtgever`, `constructeur`, `locatie`, `onderdeel` | de kop van de berekening |
| Gevolgklasse | `CC` (1/2/3) | plus de afgeleide `K_FI` (0,90 / 1,00 / 1,10) |
| Betrouwbaarheidsklasse | `RC` | |
| Ontwerplevensduur | `DesignLife` | in jaren |
| Windgebied | `windgebied` | volgt uit de gemeente (Tabel NB.1) |
| Terreincategorie | `terreincategorie` | volgt uit de omgeving (Tabel NB.3-4.1) |

Deze waarden gaan als **`initialScope`** de evaluator in, vóór de eerste regel
van het blad draait (`packages/core/src/evaluator.ts`). Een blad gebruikt ze
gewoon als variabele:

```calcpad
γ_G = 1.2*K_FI
#if CC ≡ 1
```

Er is dus geen `@select gevolgklasse` meer in de bladen, en geen invoerveld in
de designers. Een blad mág de naam overschrijven met een eigen toekenning — de
normbladen EN 1990 en EN 1997 doen dat, omdat ze de tabel juist uitwerken —
maar het mag er geen tweede *invoerveld* voor neerzetten.

### Wat hoort er níét in

Alles wat per constructiedeel verschilt: belastingen, afmetingen, profielen,
materiaalklassen. Beton C30/37 in de fundering en C45/55 in de kern is een
normaal geval, dus de betonklasse hoort bij het blad.

Grensgeval: de **referentiehoogte** voor wind. Windgebied en terreincategorie
zijn eigenschappen van de locatie en staan dus op projectniveau; z_e hoort bij
het constructiedeel (een gording op 9 m, een gevelkolom op 4 m) en staat dus in
het blad. Zie `docs/backlog.md` voor wat daar nog aan open staat.

## De grens wordt bewaakt

`scripts/check-projectvariabelen.mjs` (onderdeel van `npm run check`) faalt
zodra een rekenblad of designer zélf een invoerveld neerzet met de naam van een
projectvariabele. Zonder die controle sluipt de oude dubbeling er bij de
volgende module zo weer in.

## Het bestand

Eén project is één `.ifc-calculation`-bestand (`store/projectBestand.ts`). Het
blijft een geldig IFCX JSON-LD document, met twee extra velden:

- `source` — de rekentekst van het eerste blad, voor lezers die één blad
  verwachten;
- `project` — de eigenlijke inhoud: projectgegevens plus alle exemplaren.

Een bestand zonder `project` (een oudere versie, of een `.cpd`) wordt geopend
als een project met één exemplaar, zodat er nooit werk verloren gaat.

## Koppeling met een model

`elementen` legt vast over welke elementen in een bronmodel dit blad gaat. Leeg
is de normale toestand: een losstaande berekening, precies zoals CalcPAD het
deed. Zie [ifc-export.md](ifc-export.md) — daar staat waarom die koppeling
wordt aangewezen en niet geraden, en wat er nog voor nodig is.

## Exporteren

`Opslaan` schrijft het hele project als één IFCX-document — alle bladen in één
ruimtelijke boom, want dat is wat de rest van het OpenAEC-ecosysteem van dit
programma verwacht. Details in [ifc-export.md](ifc-export.md).

`PDF opslaan` (en de Print-knop, en Ctrl+P) bouwt het hele project op als één
afdrukbaar document: een voorblad uit de projectgegevens, een inhoudsopgave,
daarna elk blad op een eigen pagina — met **het parametrische beeld** erboven en
de uitwerking eronder. Drie balklagen leveren dus drie hoofdstukken op, niet
alleen degene die toevallig openstond. In de printdialoog kies je "Opslaan als
PDF".

Met **Voorbeeld** zie je diezelfde weergave op het scherm. Dat is geen luxe: de
afdrukopmaak hangt aan een klasse (`html.afdrukmodus`) in plaats van aan
`@media print`, juist zodat hij te controleren is zonder hem uit te draaien.

Het beeld dat elk blad meekrijgt komt van zijn eigen exemplaar, niet van het
blad dat openstaat. Dat loopt via `ExemplaarContext` in `store/actiefBlad.ts`:
de designers lezen normaal het actieve blad, en de afdruk zet er per blad een
ander voor in de plaats. `alleenLezen` staat daarbij aan — een afdruk hoort niets
aan je project te veranderen, ook geen standaardwaarden aan te vullen.

Dat gaat bewust via de browser en niet via de Rust-rapportengine — zie
`docs/backlog.md`. De engine slaat tekeningen over, en zonder de
`openaec-reports`-repo is de app niet eens te bouwen.

## Ongedaan maken

Eén stapel voor het hele project (`verleden` / `toekomst` in `projectStore.ts`),
niet één per onderdeel. Ctrl+Z draait dus hetzelfde terug of je nu in de
rekentekst typt, een maat in het parametrische beeld versleept, een blad
hernoemt of er een verwijdert.

De editor heeft zijn eigen geschiedenis daarom **uit** (`basicSetup.history:
false`). Twee stapels naast elkaar geeft een onvoorspelbare volgorde: dezelfde
toets zou dan eens een letter en dan weer een verwijderd blad terugdraaien.

Doortypen in hetzelfde veld telt als één stap (700 ms samenvoegvenster).
Handelingen die je los wilt kunnen terugdraaien — invoegen, verwijderen,
hernoemen, verplaatsen — krijgen altijd hun eigen stap. Automatisch seeden van
standaardwaarden komt níét in de geschiedenis: dat is geen handeling van jou.

Een momentopname bewaart alleen verwijzingen naar `exemplaren` en `gegevens`.
Omdat elke mutatie een nieuw object maakt en de rest ongemoeid laat, delen
opeenvolgende stappen bijna alles; tweehonderd stappen kosten daardoor
nauwelijks geheugen. De geschiedenis wordt niet opgeslagen — hij geldt per
sessie en wordt gewist bij Nieuw en bij het openen van een bestand.

## Wat er verdwenen is

De belastinggeval-laag (`loadCaseStore`, `LoadCaseTabs`) is weg. De tabbalk werd
nergens gerenderd — het component was nooit geïmporteerd — terwijl de store
eronder wél de waarden van alle bladen door elkaar husselde. UGT en BGT worden
per blad volgens de norm berekend; dat is geen invoerlaag.
