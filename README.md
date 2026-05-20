# Open Calculations Studio

Open desktop-applicatie voor constructieve berekeningen op basis van CalcPAD-syntax, met directe export naar IFC (4x3 STEP) en IFCX (JSON-LD). Werkt zowel als standalone Tauri-app als embedded library voor FEM-applicaties en normtoetsingen.

> Voorheen bekend als **Ifc-Calc** — herbouwd onder de OpenAEC Foundation als opvolger van CalcPAD met open file-formats en moderne web-tech.

## Features

### Rekenen
- **Formules met eenheden** — `mm`, `kN`, `N/mm²`, `mm⁴`, … via mathjs unit-aware arithmetic
- **Automatische unit-simplificatie** — `b*h` geeft direct `mm²`, geen handmatige `to`-cast nodig
- **Wiskundige opmaak** — KaTeX-rendering met echte breuken, superscripts, subscripts en Griekse letters
- **Formule-keten** — toont `naam = formule = ingevulde waarden = resultaat` op één regel
- **Live preview** — split-pane editor (CodeMirror 6) en debounced preview, syntax highlighting voor `.cpd`
- **Belastingsgevallen** — tabs onderaan voor SLS / ULS / aardbeving etc., elk met eigen prompt-waarden

### CalcPAD-compatibiliteit
Full subset compatibility met real-world CalcPAD-bestanden. Het 1094-regel `2259-Intertek-units.cpd` regressie-bestand evalueert met 0 errors en rendert 6 SVG-tekeningen.

- `"Title`, `'prose`, `// comment`
- `#if … #else if … #else … #end if`, `#hide / #show / #pre / #post`
- `#repeat n … #end repeat` en `#for var = lo : hi … #loop` (incl. nested)
- `#def name(p1; p2; …) … #end def` macros, `#def Name$ = literal` constants
- `#include filename.cpd` — externe macro-libraries en SVG drawings
- `$Plot{ … @ x = lo : hi }` — inline parametrische plots
- Subscript-comma's (`V_b,0`, `n_Int,support,points`), `$`-getypeerde refs, matrix `[a;b|c;d]`
- Format-specs (`:F2`), dotted/percent identifiers (`Cs.Cd`, `F_0.9G50%TotalWeight`)
- mathjs Matrix-aware `take`, `hlookup`, `hlookup_ge`, `hlookup_le`, `vlookup`, `get`

### Tekeningen
- **Parametrische SVG-macros** — prose-line value interpolation (`'<line x1="'a'" y1="'b'"/>`)
- **`@svg … @end`** blocks voor handgeschreven SVG
- **`@img(file.svg)`** — externe SVG-tekeningen worden inline ge-embed (incl. `<polygon fill="…">`, hatch patterns, gradients) via dezelfde include-resolver als `#include`
- **`@img(file.png|jpg|…)`** — raster afbeeldingen via `<img src>`

### IFC export
Live IFCX (JSON-LD draft) en IFC4x3 STEP-SPF generatie vanuit de huidige calc.
- Detecteert structurele elementen via conventionele variabelenamen (`b_fdn`, `l_fdn`, `D_paal`, `M_Ed`, `R_c_d`, …)
- Altijd geldig Project → Site → Building → Storey skelet
- IFC-tab met spatial tree, STEP viewer en IFCX JSON viewer (syntax highlighting + klikbare entity-types naar BuildingSMART docs)
- Eén klik export: `.ifc` / `.ifcx` download

### Overig
- **Belastingsgevallen** (load cases) met eigen prompt-waarden per case
- **PDF-export** via Tauri shell + headless preview
- **GEF-upload** (`@gef name`) voor sonderingsdata
- **5 themes** (light, forge, openaec, blueprint, contrast) — OpenAEC design tokens
- **`@select var "Label" … @end`** dropdown-blocks voor materiaalkeuzes etc.

## Projectstructuur

```
Open-Calculations-Studio/
├── packages/
│   ├── core/                          # @ifc-calc/core — rekenengine (TS library)
│   │   ├── src/
│   │   │   ├── parser.ts              # Line-based parser, macro expansion, #include
│   │   │   ├── evaluator.ts           # mathjs evaluator + CalcPAD helpers
│   │   │   ├── ifc-generator.ts       # IFCX / IFC4x3 STEP generators
│   │   │   ├── latex.ts               # Expr → LaTeX converter
│   │   │   ├── renderer.ts            # HTML renderer (KaTeX, SVG coalescing)
│   │   │   ├── gef-parser.ts          # Sondering (GEF) parser
│   │   │   ├── types.ts               # Public types
│   │   │   └── index.ts               # Public API
│   │   └── package.json
│   ├── desktop/                       # @openaec/calculations-studio — Tauri app
│   │   ├── src/                       # React UI (ribbon, panels, preview)
│   │   ├── src-tauri/                 # Rust shell (Tauri 2)
│   │   └── src/templates/calcpad-samples/   # Vendored .cpd + .svg samples
│   └── web/                           # @ifc-calc/web — browser-only build
├── docs/superpowers/                  # Design docs + implementation plans
└── package.json                       # npm workspaces root
```

## Document Syntax

```calcpad
"Project — woning Laageind 57

#include svg_drawing.cpd

# 1. Invoer
b = 300 mm
h = 500 mm
N_Ed = ?*(kN)
fck = 30 N/mm^2

# 2. Geometrie
A = b*h          // mm² — automatisch
W_y = b*h^2/6    // mm³

# 3. Toetsing
sigma = N_Ed/A to N/mm^2

#if sigma ≤ fck/1.5
    'Voldoet ✓
#else
    'Voldoet NIET ✗
#end if

# 4. Detail-tekening
@img(detail-D1.svg)

# 5. Belasting-diagram
$Plot{f(x) @ x = 0 : L}
```

## Installatie

```bash
npm install
```

## Ontwikkeling

```bash
# Core package bouwen (watch)
npm run build --workspace=@ifc-calc/core

# Desktop (Tauri) starten
npm run tauri:dev --workspace=@openaec/calculations-studio

# Of alleen de Vite browser-preview
npm run dev --workspace=@openaec/calculations-studio
```

## Gebruik als library

```typescript
import {
  parse,
  evaluate,
  render,
  generateIfcx,
  generateIfc4x3Step,
} from '@ifc-calc/core';

const source = `
b = 300 mm
h = 500 mm
A = b*h
N_Ed = 120 kN
sigma = N_Ed/A to N/mm^2
`;

// Render naar HTML (KaTeX formules + SVG)
const ast = parse(source);
const evaluated = evaluate(ast, {});
const html = render(evaluated);

// IFC export uit dezelfde calc
const ifcx = generateIfcx(evaluated, { projectName: 'Toetsing balk B1' });
const step = generateIfc4x3Step(evaluated, { projectName: 'Toetsing balk B1' });
```

### Externe SVG / `#include` inlinen

```typescript
import detailSvg from './detail-D1.svg?raw';
import svgDrawing from './svg_drawing.cpd?raw';

const ast = parse(source, {
  includes: new Map([
    ['detail-D1.svg', detailSvg],     // wordt door @img(detail-D1.svg) inline ge-embed
    ['svg_drawing.cpd', svgDrawing],  // wordt door #include svg_drawing.cpd geladen
  ]),
});
```

## Tech Stack

- **TypeScript** — type-safe codebase
- **mathjs** — expressie-parsing, eenheden, matrices
- **KaTeX** — wiskundige opmaak
- **CodeMirror 6** — editor met `.cpd` syntax highlighting + autocomplete
- **React 19** — desktop UI
- **Tauri 2** — Rust shell met file-system + dialog plugins
- **Vite** — bundler met `?raw` imports voor samples
- **npm workspaces** — monorepo

## Licentie

Zie [`LICENSE`](LICENSE).

## Status

In actieve ontwikkeling onder de [OpenAEC Foundation](https://github.com/OpenAEC-Foundation). PRs en issues welkom.
