# Prestaties van de rekenkern

Stand 30-09-2026. Metingen op een Ryzen 7 3700U met Node 24.19.0. De
metingen zijn warme medianen; achtergrondbelasting en energiebeheer kunnen
de absolute tijden veranderen. Herhaal de meting met
`node scripts/bench-rekenkern.mjs` na het bouwen van `packages/core`.

## Waar de tijd heen gaat

Een HSB-blad met ongewijzigde bladtekst kostte bij volledige verwerking
ongeveer 88 ms. Wanneer alleen de invoer verandert, kan de eerder geparste
syntaxisboom worden hergebruikt: ongeveer 59 ms bij bytegelijke HTML-uitvoer.
De preview doet dit nu. Voor hetzelfde blad was de verdeling vóór de wijziging
ongeveer 28 ms parsen, 41 ms evalueren en 37 ms HTML opbouwen.

De evaluatie van gewone toewijzingen hergebruikt nu dezelfde formuleboom voor
de waardeberekening en de ingevulde formule. Voor eenheidsconversies blijft de
weergegeven deeluitdrukking apart geparst. Het effect op losse formules is
klein en wisselt met de opwarming van de JavaScript-engine; daarom staat er
geen vaste versnellingsfactor bij.

Een raamwerk van 25 staven met gewijzigde geometrie werd in circa 6 ms
opgelost. De elastische knikfactor voor hetzelfde model kostte circa 187 ms.
Daarvoor wordt een groot, grotendeels leeg stelsel tientallen keren als dichte
matrix ontbonden. Bij drie en tien staven was dit respectievelijk circa 6 en
29 ms. Het model met 25 staven is een kunstmatige, maar geldige ingeklemde
staafketen onder drukkracht; de benchmark gebruikt telkens een nieuwe
geometrie om de bestaande cache niet te meten.

## Rust als kandidaat

In een losse proef met exact dezelfde dichte LDLᵀ-lus en symmetrische,
onbepaalde matrices kostten 30 ontbindingen van een matrix met 100, 200 en
450 vrijheidsgraden in JavaScript ongeveer 5,5, 19 en 122 ms; in
geoptimaliseerde Rust ongeveer 1,5, 15 en 97 ms. De niet-nul-uitkomst (het
aantal negatieve spilelementen) was gelijk.
Deze microbenchmark omvat geen overdracht tussen de browser en Rust en is
geen snelheidsmeting van een volledig rekenblad. De grotere winst ligt naar
verwachting in de matrixrepresentatie en het algoritme, niet uitsluitend in
de programmeertaal.

De rekenkern draait ook in de browser. Een desktopcommando voor iedere formule
zou daarom twee rekenroutes en asynchrone gegevensoverdracht introduceren.
Rust is pas zinvol voor een afgebakende, grotere numerieke taak wanneer een
prototype de totale tijd inclusief gegevensoverdracht en uitvoercontrole
verbetert. Een synchrone gedeelde module voor browser en desktop kan dan
worden onderzocht.

## Volgende proef

1. Bewaar voor de knikfactor de symmetrische matrix in een compacte schaarse
   vorm en hergebruik de symbolische structuur tijdens het zoeken naar α.
2. Vergelijk een stabiele schaarse factorisatie met de huidige dichte LDLᵀ
   op kleine, grote, bijna-singuliere en beweeglijke modellen. De bestaande
   drempel en het oordeel over stabiliteit mogen niet ongemerkt veranderen.
3. Meet pas daarna dezelfde factorisatie in Rust, inclusief aanroep- en
   kopieerkosten. Behoud de huidige implementatie als terugval totdat alle
   uitkomsten en statusgevallen overeenkomen.

De gewone raamwerkoplossing bewaart nu een inverse per geometrie en gebruikt
die voor meerdere belastingen. Bij grotere modellen kan een factorisatie met
meerdere rechterleden voordeliger zijn, maar dat vergt dezelfde controles op
singulariteit en residuen. Optimaliseer deze route pas als de benchmark met
representatieve projecten er een knelpunt in laat zien.
