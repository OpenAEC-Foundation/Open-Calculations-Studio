# Schematische beelden in de modulecatalogus

Elk van de 38 selecteerbare rekenmodules heeft een eigen getekend symbool in
`packages/desktop/src/components/calc/ModuleAfbeelding.tsx`. Het oudere losse
schijfblad heeft ook een symbool voor bestaande projecten. De beelden tonen
het constructiedeel, de belasting of de relevante doorsnede. Ze zijn bedoeld
om snel een module te herkennen en bevatten geen projectinvoer of toetsresultaat.

De modulekiezer toont de tekening op een rustig raster. Vorm, opleggingen en
krachten zijn lijnwerk; oranje markeert belasting, beweging of een specifiek
detail. Daardoor blijven de beelden op klein formaat leesbaar en in lichte en
donkere thema's consistent. Er staan geen maatgetallen of normwaarden in de
catalogusbeelden.

`scripts/check-modulebeelden.mjs` vergelijkt de getekende symbolen met de
modulecatalogus. Een nieuw module-id moet eerst een eigen tekening krijgen.
