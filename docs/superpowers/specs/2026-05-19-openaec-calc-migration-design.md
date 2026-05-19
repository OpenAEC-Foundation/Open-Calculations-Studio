# OpenAEC Calc — Migration Design

> **Status:** Draft (brainstorm output) — awaiting plan
> **Date:** 2026-05-19
> **Source repos:**
> - [`OpenAEC-Foundation/OpenAEC-style-book`](https://github.com/OpenAEC-Foundation/OpenAEC-style-book) — brandbook + Tauri+React template (primaire bron — exact volgen)
> - [`OpenAEC-Foundation/openaec-ui`](https://github.com/OpenAEC-Foundation/openaec-ui) — CSS design tokens + componenten (`.oaec-*`); niet op npm — kopieer files of installeer via `github:OpenAEC-Foundation/openaec-ui`. Bij conflict met template: template wint.

## 0. Doel & directieve

Ifc-Calc (lightweight CalcPAD-alternatief voor Eurocode-toetsingen) wordt herbouwd als **OpenAEC Calc**, een Tauri v2 + React + TypeScript desktop applicatie die **volledig conformeert** aan het OpenAEC Foundation design system.

**Directieve van gebruiker:** _"Volledige adoptatie van de style repo. Geen enkele concessie."_

Operationele consequentie: alle UI keuzes volgen `OpenAEC-Foundation/OpenAEC-style-book` verbatim. Bij twijfel tussen "aanpassen" en "exact volgen": exact volgen. Geen eigen brand-varianten, geen eigen kleuren, geen eigen fonts.

## 1. Architectuur

| Laag | Keuze | Versie (uit OpenAEC template) | Reden |
|---|---|---|---|
| Desktop shell | Tauri | `^2` | Native chrome, ~10MB binary, file dialogs, persistente storage |
| Frontend | React + TypeScript | `^19.2` / `~5.9` | Exact match met OpenAEC template |
| Bundler | Vite | `^7.3` | Match met template |
| Styling | Pure CSS met design tokens | n.v.t. | OpenAEC template gebruikt **geen Tailwind** — pure CSS via `themes.css` + per-component CSS. We volgen dat. |
| State | Zustand | `^5` | Wat de OpenAEC template gebruikt (`src/store.ts`) |
| Editor | CodeMirror 6 via `@uiw/react-codemirror` | latest | Behoud van syntax highlighting + line numbers |
| Math rendering | KaTeX (via `@ifc-calc/core`) | n.v.t. | Geen wijziging — core blijft single source of truth |
| Rekenengine | `@ifc-calc/core` (ongewijzigd) | workspace `*` | DSL parsing/evaluatie/rendering |
| i18n | `i18next` + `react-i18next` + `i18next-browser-languagedetector` | `^25.8` / `^16.5` / `^8.2` | Exact match met OpenAEC template |
| Persistence | `@tauri-apps/plugin-store` | `^2.4` | Recent files, theme, sidebar width, view mode |
| Fonts | Space Grotesk 700 (headings) / Inter 400-600 (body+UI) / JetBrains Mono 400 (code) | n.v.t. | OpenAEC type system |

**Visuele tokens (verplicht):**

| Token | Waarde | Gebruik |
|---|---|---|
| `--amber` | `#D97706` | Accenten, primary buttons, links |
| `--deep-forge` | `#36363E` | Donkere achtergrond |
| `--signal-orange` | `#EA580C` | Hover states |
| `--warm-gold` | `#F59E0B` | Highlights, badges |
| `--blueprint-white` | `#FAFAF9` | Lichte achtergrond |
| `--concrete` | `#F5F5F4` | Cards, code blocks |
| `--night-build` | `#2A2A32` | Donkerste achtergrond |
| `--success` `--error` `--warning` `--info` | per OpenAEC tokens.css | Semantic states |

**Geen eigen hex codes in componenten.** Alle kleuren via CSS variables uit `tokens.css`.

## 2. Project-structuur

```
Ifc-Calc/
├── packages/
│   ├── core/                             ← ONGEWIJZIGD
│   │   └── src/{parser,evaluator,latex,renderer,gef-parser,types}.ts
│   │
│   └── desktop/                          ← NIEUW (vervangt packages/web)
│       ├── src-tauri/
│       │   ├── src/main.rs               ← Rust shell + commands
│       │   ├── tauri.conf.json           ← frameless, 1280×800 min
│       │   ├── icons/                    ← OpenAEC symbol app-icoon
│       │   └── Cargo.toml
│       ├── src/
│       │   ├── main.tsx                  ← React root + i18n + theme load
│       │   ├── App.tsx                   ← shell composition
│       │   ├── styles/
│       │   │   ├── tokens.css            ← @openaec/ui tokens
│       │   │   ├── components.css        ← @openaec/ui components
│       │   │   └── app.css               ← Ifc-Calc-specifieke aanvullingen
│       │   ├── components/
│       │   │   ├── shell/                ← uit OpenAEC template
│       │   │   │   ├── TitleBar.{tsx,css}
│       │   │   │   ├── Ribbon.{tsx,css}
│       │   │   │   ├── RibbonTab.tsx
│       │   │   │   ├── RibbonGroup.tsx
│       │   │   │   ├── RibbonButton.tsx
│       │   │   │   ├── Backstage.{tsx,css}
│       │   │   │   ├── StatusBar.{tsx,css}
│       │   │   │   ├── DocumentBar.{tsx,css}
│       │   │   │   ├── Modal.{tsx,css}
│       │   │   │   └── ThemedSelect.{tsx,css}
│       │   │   ├── calc/                 ← Ifc-Calc-specifiek
│       │   │   │   ├── Editor.tsx
│       │   │   │   ├── Preview.tsx
│       │   │   │   ├── ProjectBrowser.tsx
│       │   │   │   ├── ProjectTreeNode.tsx
│       │   │   │   ├── GefDialog.tsx
│       │   │   │   └── SplitPane.tsx
│       │   │   └── ribbon-tabs/
│       │   │       ├── StartTab.tsx      ← Nieuw/Open/Opslaan/PDF/IFC
│       │   │       ├── InsertTab.tsx     ← Kop/Formule/Keuzelijst/SVG/Img
│       │   │       ├── ViewTab.tsx       ← Split/Editor/Preview/Zoom
│       │   │       └── IfcTab.tsx        ← GEF→IFC/BRO→IFC/Spatial
│       │   ├── store/
│       │   │   ├── documentStore.ts      ← Zustand: source, selectValues, dirty
│       │   │   ├── projectStore.ts       ← openDocs, activeDocId, recentFiles
│       │   │   └── settingsStore.ts      ← theme, language, sidebarWidth, viewMode
│       │   ├── templates/                ← 50+ Eurocode templates (uit web/)
│       │   │   ├── {en1990,en1991,en1992,en1993,en1996,en1997,eurocode5,vandepitte}.ts
│       │   │   └── examples/{paaldraagvermogen,stalen-ligger}.ts
│       │   ├── i18n/
│       │   │   ├── nl.json
│       │   │   ├── en.json
│       │   │   └── index.ts
│       │   ├── tauri/
│       │   │   ├── fileOps.ts            ← Tauri fs/dialog wrappers
│       │   │   └── store.ts              ← tauri-plugin-store wrapper
│       │   └── assets/
│       │       ├── openaec-logo-amber-on-dark.svg
│       │       └── openaec-symbol-amber.svg
│       ├── index.html                    ← minimaal: <div id="root"> + Google Fonts
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       └── package.json                  ← name: "@openaec/calc"
│
├── package.json                          ← workspaces: ["packages/core", "packages/desktop"]
├── docs/superpowers/specs/               ← deze spec
│   └── 2026-05-19-openaec-calc-migration-design.md
└── tsconfig.base.json
```

**Drie strikte regels (geen concessies):**

1. **Geen eigen kleuren** — uitsluitend `var(--*)` uit `tokens.css`. Zero hardcoded hex codes in component CSS.
2. **Geen eigen typografie** — exclusief Space Grotesk / Inter / JetBrains Mono. Segoe UI fallback eruit.
3. **Geen eigen component-stijlen** waar OpenAEC een component biedt. Eigen CSS alleen voor Ifc-Calc-specifieke onderdelen (project tree, GEF widget, split pane handle).

## 3. Componenten & data-flow

### 3.1 Component-mapping

| Huidig (vanilla DOM) | Nieuw (React) | Bron |
|---|---|---|
| `.app-titlebar` div | `<TitleBar/>` met Tauri window controls | OpenAEC template — verbatim |
| `.ribbon-container` + tab-switch | `<Ribbon/>` + `<RibbonTab/>` + `<RibbonGroup/>` + `<RibbonButton/>` | OpenAEC template — verbatim |
| Bestand-tab | `<Backstage/>` — Office-stijl full-screen menu | OpenAEC template — verbatim |
| `.project-browser` + expand/collapse | `<ProjectBrowser/>` + `<ProjectTreeNode/>` recursief | Ifc-Calc-specifiek |
| `.split-pane` + mousemove resize | `<SplitPane/>` (`react-resizable-panels`) | Ifc-Calc-specifiek |
| CodeMirror in `editor.ts` | `<Editor/>` met `@uiw/react-codemirror` | Ifc-Calc-specifiek |
| KaTeX render in `preview.ts` | `<Preview/>` met `dangerouslySetInnerHTML` + select handlers | Ifc-Calc-specifiek |
| `@gef` upload placeholder | `<GefDialog/>` met Tauri file dialog | Ifc-Calc-specifiek |
| (geen statusbar nu) | `<StatusBar/>` met file path, line:col, dirty | OpenAEC template — verbatim |

### 3.2 Stores (Zustand)

**documentStore** — actieve document state:
```ts
{
  source: string;
  selectValues: Map<string, number>;
  dirty: boolean;
  filePath: string | null;
  setSource(src: string): void;
  setSelectValue(id: string, value: number): void;
  markSaved(path: string): void;
}
```

**projectStore** — multi-document + tree state:
```ts
{
  openDocuments: Document[];      // { id, filePath, source, dirty }
  activeDocumentId: string;
  recentFiles: string[];          // max 10, persist
  treeSelection: string | null;   // selected template id
  openDocument(doc): void;
  closeDocument(id): void;
  switchToDocument(id): void;
}
```

**settingsStore** — persistent settings via tauri-plugin-store:
```ts
{
  theme: 'light' | 'openaec';     // OpenAEC tokens.css attribuut waarden
  language: 'nl' | 'en';
  sidebarWidth: number;
  viewMode: 'split' | 'editor' | 'preview';
  setTheme(t): void;
  // etc.
}
```

### 3.3 Editor → Preview pijplijn

```
<Editor/>.onChange(src)
   └─► debounce(250ms)
       └─► documentStore.setSource(src)
           └─► subscriber re-render
               ├─► <Preview/>:
               │     html = process(source, selectValues)   // @ifc-calc/core
               │     setInnerHTML(html)
               │     bind <select> change handlers
               │       └─► documentStore.setSelectValue(id, val)
               │           └─► triggers re-render loop
               └─► <TitleBar/>: toon "*" indien dirty
```

### 3.4 Tauri IPC

`src/tauri/fileOps.ts` — alle file IO via wrapper:

| Functie | Tauri call | Gebruikt door |
|---|---|---|
| `openFile()` | `dialog.open()` + `fs.readTextFile()` | StartTab.btnOpen, Backstage.recentFile |
| `saveFile(path, content)` | `fs.writeTextFile()` | StartTab.btnSave (bestaand path) |
| `saveFileAs(content)` | `dialog.save()` + `fs.writeTextFile()` | StartTab.btnSaveAs |
| `pickGefFile()` | `dialog.open({filters: [{ext: 'gef'}]})` | GefDialog |

Dev-mode fallback: in browser (geen Tauri) gebruik `FileSystemAccessAPI`, zodat `npm run dev` zonder Tauri werkt. Bij ontbreken van beide: `<input type=file>` fallback.

## 4. Migratie-fasering

| Fase | Doel | Eindstaat |
|---|---|---|
| **1 — Scaffold** | Tauri+React workspace draait | Leeg venster met OpenAEC titlebar/ribbon-shell/statusbar; amber/forge palet zichtbaar |
| **2 — Domain shell** | Ribbon vult zich met Ifc-Calc tabs | UI matcht huidige app, maar in OpenAEC stijl. Klikken doet nog niets. |
| **3 — Core integratie** | Rekenengine werkt in nieuwe shell | Volledige feature parity: alle 50+ templates laden, `@select` werkt, preview rendert |
| **4 — Native features** | File IO + persistence | Open/save .ifc-calc files, recent list, settings persist over restart, GEF dialog |
| **5 — Branding & i18n polish** | Visueel onmogelijk te onderscheiden van OpenAEC sister-tools | Logo's, "OpenAEC Calc" string overal, NL+EN i18n, theme switcher, splash screen. `packages/web/` verwijderd. |

Elke fase eindigt met: app draait, manuele smoke test, commit-checkpoint.

## 5. Wat blijft, wat verdwijnt

**Blijft (ongewijzigd):**
- `packages/core/` — rekenengine
- DSL syntax: `@select`, `@gef`, `#if`, `@svg`, formules met units
- Alle 50+ Eurocode/Vandepitte templates — verhuizen 1-op-1
- GEF parser
- KaTeX rendering pipeline

**Verdwijnt:**
- `packages/web/` — vervangen door `packages/desktop/`
- Inline HTML+CSS in `index.html` — herverdeeld over componenten
- "Open 2D Studio" blauwe palet (`--theme-border: #0f3460`, `--theme-accent: #3b82f6` etc.)
- Eigen Segoe UI / system-ui font stack
- Eigen titlebar markup (zelfgebouwd) → Tauri native frameless

## 6. Open punten / risico's

| Risico | Mitigatie |
|---|---|
| Tauri Rust toolchain niet aanwezig op dev-machine | Fase 1 begint met `rustup` install check; spec-internal documentatie |
| Codemirror React wrapper (`@uiw/react-codemirror`) heeft andere lifecycle dan vanilla | Fase 3 begint met minimaal werkend Editor; lock CodeMirror versie |
| OpenAEC template bevat IFC viewer dependencies (`@thatopen/components`, `three`) die we (nog) niet nodig hebben | Fase 1: behoud deps voor latere IFC viewer feature; geen actief gebruik in MVP. Verwijderen indien build-size onacceptabel. |
| React 19 is recent (Oct 2024) — minder community ervaring, mogelijk peer-dep issues met CodeMirror wrapper | Fase 3: test eerst `@uiw/react-codemirror` met React 19 in isolatie; downgrade naar React 18 alleen indien blocker |
| OpenAEC template heeft eigen `themes.css` met "openaec" theme — mogelijk afwijking van `@openaec/ui/css/tokens.css` | Bron-conflict: template wint (per "geen concessies"). Documenteer wijkingen in component-comments. |
| 50+ templates zijn TS exports met multiline template strings — encoding-issues bij verplaatsing | Verhuis met `git mv`, niet copy-paste; smoke-test alle templates na verhuizing |
| Tauri builds zijn platform-specifiek; CI/release pipeline nog niet gedefinieerd | Out of scope voor deze spec — addresseren in latere spec |

## 7. Buiten scope

- IFC import/export functionaliteit (knoppen aanwezig in IfcTab, implementatie volgt later)
- PDF export
- IFC viewer / 3D scene
- Cloud sync / collaboration
- Authenticated features
- CI/CD release pipeline
- Code signing

Alleen UI shell + bestaande feature parity + OpenAEC adoptie.

## 8. Succescriteria

1. App start op Windows/macOS/Linux via `npm run tauri dev`
2. Alle 50+ Eurocode templates laden en evalueren correct
3. Bestaande `.ifc-calc` files openen zonder syntaxwijzigingen
4. Visuele review: side-by-side met OpenAEC BIM Validator / BCF Platform — chrome onmogelijk te onderscheiden
5. Geen hardcoded hex codes in `src/components/**/*.css` buiten `tokens.css`
6. NL + EN UI strings volledig vertaald
7. Settings persistent over app-restart
8. `packages/web/` is verwijderd; `packages/desktop/` is enige UI workspace
