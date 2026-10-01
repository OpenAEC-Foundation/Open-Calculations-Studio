# @openaec/calculations-studio

Open Calculations Studio is een React- en TypeScript-app met een Tauri 2
desktop-shell. De app bevat een modulekiezer, rekenbladen met parametrische
tekeningen, een constructierapport met standaardteksten en IFC-export.

## Ontwikkeling

Voer vanuit de repository-root uit (Node.js 24 voor de controlescripts):

```bash
npm ci
npm run dev
```

Dit bouwt eerst de rekenkern en start de browser-preview op
http://localhost:3021. Native bestandsdialogen en instellingenopslag vereisen
de desktop-shell:

```bash
npm run build --workspace=@ifc-calc/core
npm run tauri:dev --workspace=@openaec/calculations-studio
```

## Bouwen en controleren

Vanuit de repository-root:

```bash
# Rekenkern en frontend, inclusief TypeScript-controle
npm run build

# Native debug-binary zonder installatiepakket
npm run build:debug

# Alle rekencontroles
npm run check
```

Voor een native build zijn Rust en de platformspecifieke Tauri-buildtools
nodig. Op Linux zijn dat onder meer de GTK- en WebKitGTK-ontwikkelbibliotheken.
De Rust-rapportengine is optioneel; afdrukken gebruikt standaard de browser.

Via **Module → Normbestanden** kun je eigen PDF's met normnummer en editie
bewaren en terugvinden. De bestanden blijven lokaal in de appopslag en gaan
niet mee in projectbestanden. Deze catalogus leest geen normwaarden automatisch
in rekenbladen in.

Zie de [hoofd-README](../../README.md) voor installatie en
[de overdracht](../../docs/overdracht.md) voor de huidige stand en werkafspraken.
