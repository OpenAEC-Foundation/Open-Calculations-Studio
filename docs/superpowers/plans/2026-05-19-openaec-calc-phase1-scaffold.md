# OpenAEC Calc — Phase 1: Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provision `packages/desktop/` — a fresh Tauri 2 + React 19 + TypeScript workspace using the OpenAEC `OpenAEC-Foundation/OpenAEC-style-book` Tauri+React template as the visual+structural baseline. End state: `npm run tauri dev` in the worktree opens a frameless window titled "OpenAEC Calc" with the OpenAEC titlebar, ribbon shell (4 stub tabs), and statusbar visible — no real calc functionality yet, but the chrome is byte-for-byte identical to OpenAEC sister tools.

**Architecture:** Add `packages/desktop` as a new npm workspace alongside `packages/core` and `packages/web` (which stays untouched until Phase 5). Vendor the template files into `packages/desktop/` rather than installing the template as a dependency — the template is not on npm and we'll customize incrementally. Strip template content that's irrelevant to a calc app (IFC viewer, PDF generation, MCP server in Rust, welcome screen, project settings dialog, detached window manager). Rebrand the resulting shell as "OpenAEC Calc" with the OpenAEC logo placeholder in the titlebar.

**Tech Stack:** Tauri 2.x (Rust), React 19.2, TypeScript 5.9, Vite 7.3, Zustand 5, i18next 25, `@tauri-apps/plugin-store` 2.4.

**Scope discipline:** This plan stops at "shell renders correctly". No CodeMirror integration, no preview pipeline, no file IO, no template-library bindings — those come in Phase 2-5 plans.

---

## File Structure

After Phase 1 completes, the new `packages/desktop/` tree is:

```
packages/desktop/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs                  ← minimal entry (no MCP, no PDF)
│   │   └── lib.rs                   ← Tauri builder + plugins
│   ├── icons/                       ← placeholder; OpenAEC icons in Phase 5
│   │   ├── 32x32.png
│   │   ├── 128x128.png
│   │   ├── 128x128@2x.png
│   │   ├── icon.icns
│   │   ├── icon.ico
│   │   └── icon.png
│   ├── capabilities/
│   │   └── default.json             ← Tauri 2 capability manifest
│   ├── Cargo.toml                   ← strip thatopen/PDF crates
│   ├── tauri.conf.json              ← rebranded to "OpenAEC Calc"
│   ├── build.rs                     ← copied verbatim
│   └── .gitignore                   ← copied verbatim
├── src/
│   ├── main.tsx                     ← React root + i18n init + theme load
│   ├── App.tsx                      ← stripped-down composition (no welcome/PDF/IFC viewer/detached)
│   ├── App.css                      ← copied verbatim from template
│   ├── themes.css                   ← copied verbatim (OpenAEC tokens)
│   ├── store.ts                     ← tauri-plugin-store wrapper (verbatim)
│   ├── vite-env.d.ts                ← verbatim
│   ├── assets/
│   │   └── react.svg                ← verbatim (placeholder; OpenAEC logo in Phase 5)
│   ├── components/
│   │   ├── TitleBar.{tsx,css}       ← verbatim
│   │   ├── StatusBar.{tsx,css}      ← verbatim
│   │   ├── DocumentBar.{tsx,css}    ← verbatim
│   │   ├── Modal.{tsx,css}          ← verbatim
│   │   ├── ThemedSelect.{tsx,css}   ← verbatim
│   │   ├── ribbon/
│   │   │   ├── Ribbon.{tsx,css}     ← verbatim
│   │   │   ├── RibbonTab.tsx        ← verbatim
│   │   │   ├── RibbonGroup.tsx      ← verbatim
│   │   │   ├── RibbonButton.tsx     ← verbatim
│   │   │   ├── RibbonButtonStack.tsx ← verbatim
│   │   │   ├── icons.ts             ← verbatim (SVG icon library)
│   │   │   └── CalcTab.tsx          ← NEW: replaces HomeTab, stub Ifc-Calc ribbon
│   │   ├── backstage/
│   │   │   ├── Backstage.{tsx,css}  ← verbatim
│   │   │   └── (ExtensionManagerPanel removed — out of scope)
│   │   └── settings/
│   │       └── SettingsDialog.{tsx,css} ← verbatim (theme/language switcher works)
│   ├── i18n/
│   │   ├── config.ts                ← verbatim
│   │   └── locales/{nl,en}/
│   │       ├── common.json          ← verbatim, but app name → "OpenAEC Calc"
│   │       ├── backstage.json       ← verbatim
│   │       ├── ribbon.json          ← modified: Ifc-Calc-specific tab labels
│   │       └── settings.json        ← verbatim
│   └── hooks/                       ← (omitted in Phase 1 — useWindowManager not needed)
├── index.html                       ← minimal: <div id="root">
├── package.json                     ← name: "@openaec/calc"
├── tsconfig.json                    ← verbatim
├── tsconfig.node.json               ← verbatim
└── vite.config.ts                   ← verbatim
```

**Removed from template (not copied):**
- `src/components/feedback/*` — feedback dialog (no telemetry endpoint yet)
- `src/components/welcome/*` — welcome screen / start sidebar
- `src/components/panels/*` — IFC viewer, ReportPreview, ThreeViewer
- `src/components/project/*` — ProjectSettingsDialog (different concept)
- `src/components/backstage/ExtensionManagerPanel.*` — extension system out of scope
- `src/components/ribbon/{HomeTab,IfcTab,ReportTab,ViewerTab,ExtensionsTab}.tsx` — replaced by Ifc-Calc tabs
- `src/hooks/*` — depend on omitted features
- `src/stores/reportStore.ts` — report-specific
- `src/types/report.ts` — report-specific
- `src-tauri/src/mcp/*` — MCP server in Rust
- `src-tauri/src/pdf/*` — PDF generation engine in Rust
- `src-tauri/tenants/*` — multi-tenant branding (PDF-only)
- `tailwind.config.ts` — Tailwind not actually used (no Tailwind in deps)
- `.github/workflows/*` — CI separately, not in scope
- `screenshots/*` — template marketing material

**Stays untouched in this phase:** `packages/core/`, `packages/web/`, root `package.json` workspaces array gains one entry.

---

## Task 1: Verify Rust + Tauri prerequisites

**Files:** none modified.

- [ ] **Step 1: Confirm Rust toolchain present**

Run: `rustc --version && cargo --version`
Expected: both print versions (1.7x+ recommended; both must succeed)
If missing: install via `https://rustup.rs/`.

- [ ] **Step 2: Confirm Node version sufficient**

Run: `node --version`
Expected: v20+ (Tauri 2 requires Node 20+ for the dev-server)

- [ ] **Step 3: Confirm OS build deps (Windows)**

Run: `where link.exe`
Expected: a path under "Microsoft Visual Studio". If missing: install "Desktop development with C++" workload from Visual Studio Build Tools.

This task is verification only — no commit.

---

## Task 2: Add `packages/desktop` workspace entry

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Read current root `package.json`**

Current content:
```json
{
  "name": "ifc-calc-monorepo",
  "private": true,
  "workspaces": [
    "packages/core",
    "packages/web"
  ]
}
```

- [ ] **Step 2: Add `packages/desktop` to workspaces**

Replace with:
```json
{
  "name": "ifc-calc-monorepo",
  "private": true,
  "workspaces": [
    "packages/core",
    "packages/web",
    "packages/desktop"
  ]
}
```

- [ ] **Step 3: Verify workspace addition is syntactically valid**

Run: `node -e "console.log(JSON.parse(require('fs').readFileSync('package.json','utf8')).workspaces)"`
Expected: `[ 'packages/core', 'packages/web', 'packages/desktop' ]`

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: add packages/desktop workspace entry"
```

---

## Task 3: Create empty `packages/desktop/` skeleton

**Files:**
- Create: `packages/desktop/package.json`
- Create: `packages/desktop/index.html`
- Create: `packages/desktop/.gitignore`

- [ ] **Step 1: Create directory**

Run: `mkdir -p packages/desktop`
Expected: directory exists.

- [ ] **Step 2: Write `packages/desktop/package.json`**

Content (versions copied verbatim from OpenAEC template):
```json
{
  "name": "@openaec/calc",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "@ifc-calc/core": "*",
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-dialog": "^2",
    "@tauri-apps/plugin-opener": "^2",
    "@tauri-apps/plugin-os": "^2.3.2",
    "@tauri-apps/plugin-store": "^2.4.2",
    "i18next": "^25.8.14",
    "i18next-browser-languagedetector": "^8.2.1",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-i18next": "^16.5.4",
    "zustand": "^5"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.4",
    "typescript": "~5.9.3",
    "vite": "^7.3.1"
  }
}
```

Note: `@thatopen/components`, `@thatopen/fragments`, `three`, `html2canvas` from the template are **omitted** — they're for IFC viewer/PDF generation which are out of scope for Phase 1.

- [ ] **Step 3: Write `packages/desktop/index.html`**

Content:
```html
<!DOCTYPE html>
<html lang="nl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OpenAEC Calc</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Write `packages/desktop/.gitignore`**

Content:
```
node_modules/
dist/
.vite/
*.tsbuildinfo
src-tauri/target/
```

- [ ] **Step 5: Run install to wire workspace**

Run: `npm install`
Expected: installs all new deps; `node_modules/@openaec/calc` symlink appears via npm workspace mechanism. Output ends with "added N packages".

- [ ] **Step 6: Commit**

```bash
git add packages/desktop/package.json packages/desktop/index.html packages/desktop/.gitignore package-lock.json
git commit -m "feat(desktop): scaffold @openaec/calc package skeleton"
```

---

## Task 4: Vendor TypeScript config + Vite config from template

**Files:**
- Create: `packages/desktop/tsconfig.json`
- Create: `packages/desktop/tsconfig.node.json`
- Create: `packages/desktop/vite.config.ts`
- Create: `packages/desktop/src/vite-env.d.ts`

- [ ] **Step 1: Fetch `tsconfig.json` from template**

Run:
```bash
gh api repos/OpenAEC-Foundation/OpenAEC-style-book/contents/project-templates/Tauri+React/tsconfig.json --jq '.content' | base64 -d > packages/desktop/tsconfig.json
```
Expected: file exists. Open it and confirm it has `"target": "ES2020"` or similar and `"jsx": "react-jsx"`.

- [ ] **Step 2: Fetch `tsconfig.node.json` from template**

Run:
```bash
gh api repos/OpenAEC-Foundation/OpenAEC-style-book/contents/project-templates/Tauri+React/tsconfig.node.json --jq '.content' | base64 -d > packages/desktop/tsconfig.node.json
```
Expected: file exists.

- [ ] **Step 3: Fetch `vite.config.ts` from template**

Run:
```bash
gh api repos/OpenAEC-Foundation/OpenAEC-style-book/contents/project-templates/Tauri+React/vite.config.ts --jq '.content' | base64 -d > packages/desktop/vite.config.ts
```
Expected: file exists.

- [ ] **Step 4: Create `packages/desktop/src/` and `src/vite-env.d.ts`**

Run: `mkdir -p packages/desktop/src`

Write `packages/desktop/src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

- [ ] **Step 5: Verify TypeScript can parse the config**

Run: `npx tsc --noEmit -p packages/desktop/tsconfig.json` (from repo root)
Expected: no errors. If errors about missing source files: OK for now — we haven't added them yet. The relevant assertion is "TypeScript can parse the config without complaining about JSON shape".

- [ ] **Step 6: Commit**

```bash
git add packages/desktop/tsconfig.json packages/desktop/tsconfig.node.json packages/desktop/vite.config.ts packages/desktop/src/vite-env.d.ts
git commit -m "feat(desktop): vendor tsconfig + vite config from OpenAEC template"
```

---

## Task 5: Vendor Tauri Rust shell (stripped: no MCP, no PDF)

**Files:**
- Create: `packages/desktop/src-tauri/Cargo.toml`
- Create: `packages/desktop/src-tauri/build.rs`
- Create: `packages/desktop/src-tauri/tauri.conf.json`
- Create: `packages/desktop/src-tauri/src/main.rs`
- Create: `packages/desktop/src-tauri/src/lib.rs`
- Create: `packages/desktop/src-tauri/capabilities/default.json`
- Create: `packages/desktop/src-tauri/icons/{32x32,128x128,128x128@2x}.png`
- Create: `packages/desktop/src-tauri/icons/icon.{ico,icns,png}`
- Create: `packages/desktop/src-tauri/.gitignore`

- [ ] **Step 1: Fetch template Cargo.toml**

Run:
```bash
mkdir -p packages/desktop/src-tauri/src packages/desktop/src-tauri/capabilities packages/desktop/src-tauri/icons
gh api repos/OpenAEC-Foundation/OpenAEC-style-book/contents/project-templates/Tauri+React/src-tauri/Cargo.toml --jq '.content' | base64 -d > packages/desktop/src-tauri/Cargo.toml
```

- [ ] **Step 2: Strip out MCP + PDF + thatopen deps from Cargo.toml**

Open `packages/desktop/src-tauri/Cargo.toml` and identify any `[dependencies]` entries related to MCP server, PDF engine, or ThatOpen ecosystem (e.g. `printpdf`, `rmcp`, `clap` if only used by MCP CLI). Remove those entries.

If unsure which deps are MCP/PDF related, check by searching the template's `src/`:
```bash
gh api repos/OpenAEC-Foundation/OpenAEC-style-book/contents/project-templates/Tauri+React/src-tauri/src/mcp/mod.rs --jq '.content' | base64 -d | grep "^use "
gh api repos/OpenAEC-Foundation/OpenAEC-style-book/contents/project-templates/Tauri+React/src-tauri/src/pdf/mod.rs --jq '.content' | base64 -d | grep "^use "
```

Expected result: `Cargo.toml` only contains `tauri`, `tauri-build`, `tauri-plugin-*`, `serde`, `serde_json` (plus minor utilities). Commit the as-is version first, then strip in a separate commit if it's unclear.

- [ ] **Step 3: Write minimal `src-tauri/src/main.rs`**

Content:
```rust
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    openaec_calc_lib::run()
}
```

- [ ] **Step 4: Write minimal `src-tauri/src/lib.rs`**

Content:
```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 5: Fetch and adapt `build.rs`**

Run:
```bash
gh api repos/OpenAEC-Foundation/OpenAEC-style-book/contents/project-templates/Tauri+React/src-tauri/build.rs --jq '.content' | base64 -d > packages/desktop/src-tauri/build.rs
```

Open it and verify it's just `tauri_build::build()` — strip any MCP/PDF build steps if present.

- [ ] **Step 6: Write `src-tauri/tauri.conf.json`**

Content:
```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "OpenAEC Calc",
  "version": "0.1.0",
  "identifier": "org.openaec.calc",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:3020",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "OpenAEC Calc",
        "width": 1280,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "decorations": false,
        "transparent": false,
        "visible": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": ["nsis", "dmg", "deb", "appimage"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "nsis": {
        "installMode": "perMachine",
        "installerIcon": "icons/icon.ico"
      }
    }
  }
}
```

- [ ] **Step 7: Fetch default capabilities**

Run:
```bash
gh api repos/OpenAEC-Foundation/OpenAEC-style-book/contents/project-templates/Tauri+React/src-tauri/capabilities/default.json --jq '.content' | base64 -d > packages/desktop/src-tauri/capabilities/default.json
```

- [ ] **Step 8: Fetch placeholder icons (we'll swap for OpenAEC logo in Phase 5)**

Run:
```bash
for icon in 32x32.png 128x128.png 128x128@2x.png icon.icns icon.ico icon.png; do
  gh api repos/OpenAEC-Foundation/OpenAEC-style-book/contents/project-templates/Tauri+React/src-tauri/icons/$icon --jq '.content' | base64 -d > packages/desktop/src-tauri/icons/$icon
done
```

Expected: 6 icon files exist in `packages/desktop/src-tauri/icons/`.

- [ ] **Step 9: Write `src-tauri/.gitignore`**

Content:
```
/target/
Cargo.lock
```

- [ ] **Step 10: Verify Cargo compiles**

Run: `cargo check --manifest-path packages/desktop/src-tauri/Cargo.toml`
Expected: completes with no errors. First run will compile many deps (slow, 2-5 min) — be patient. If errors mention missing crates that were stripped: re-add them and document in commit message.

- [ ] **Step 11: Commit**

```bash
git add packages/desktop/src-tauri/
git commit -m "feat(desktop): vendor Tauri Rust shell (minimal — no MCP, no PDF)"
```

---

## Task 6: Vendor React app shell — themes + main entry

**Files:**
- Create: `packages/desktop/src/themes.css`
- Create: `packages/desktop/src/App.css`
- Create: `packages/desktop/src/store.ts`
- Create: `packages/desktop/src/main.tsx`
- Create: `packages/desktop/src/assets/react.svg`

- [ ] **Step 1: Fetch `themes.css`**

Run:
```bash
gh api repos/OpenAEC-Foundation/OpenAEC-style-book/contents/project-templates/Tauri+React/src/themes.css --jq '.content' | base64 -d > packages/desktop/src/themes.css
```

Expected: file with OpenAEC tokens (`--amber: #D97706`, `--deep-forge: #36363E`, etc.) and `[data-theme="light"]` + `[data-theme="openaec"]` blocks.

- [ ] **Step 2: Fetch `App.css`**

Run:
```bash
gh api repos/OpenAEC-Foundation/OpenAEC-style-book/contents/project-templates/Tauri+React/src/App.css --jq '.content' | base64 -d > packages/desktop/src/App.css
```

- [ ] **Step 3: Fetch `store.ts` (tauri-plugin-store wrapper)**

Run:
```bash
gh api repos/OpenAEC-Foundation/OpenAEC-style-book/contents/project-templates/Tauri+React/src/store.ts --jq '.content' | base64 -d > packages/desktop/src/store.ts
```

- [ ] **Step 4: Fetch the placeholder react.svg**

Run:
```bash
mkdir -p packages/desktop/src/assets
gh api repos/OpenAEC-Foundation/OpenAEC-style-book/contents/project-templates/Tauri+React/src/assets/react.svg --jq '.content' | base64 -d > packages/desktop/src/assets/react.svg
```

- [ ] **Step 5: Write `src/main.tsx`**

Content:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n/config";
import App from "./App";
import "./themes.css";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 6: Commit**

```bash
git add packages/desktop/src/themes.css packages/desktop/src/App.css packages/desktop/src/store.ts packages/desktop/src/main.tsx packages/desktop/src/assets/
git commit -m "feat(desktop): vendor theme tokens + main entry"
```

---

## Task 7: Vendor i18n config + locales (rebrand app name)

**Files:**
- Create: `packages/desktop/src/i18n/config.ts`
- Create: `packages/desktop/src/i18n/locales/nl/common.json`
- Create: `packages/desktop/src/i18n/locales/nl/backstage.json`
- Create: `packages/desktop/src/i18n/locales/nl/ribbon.json`
- Create: `packages/desktop/src/i18n/locales/nl/settings.json`
- Create: `packages/desktop/src/i18n/locales/en/common.json`
- Create: `packages/desktop/src/i18n/locales/en/backstage.json`
- Create: `packages/desktop/src/i18n/locales/en/ribbon.json`
- Create: `packages/desktop/src/i18n/locales/en/settings.json`

- [ ] **Step 1: Create dirs + fetch each locale file**

Run:
```bash
mkdir -p packages/desktop/src/i18n/locales/nl packages/desktop/src/i18n/locales/en

for lang in nl en; do
  for ns in common backstage ribbon settings; do
    gh api "repos/OpenAEC-Foundation/OpenAEC-style-book/contents/project-templates/Tauri+React/src/i18n/locales/$lang/$ns.json" --jq '.content' | base64 -d > "packages/desktop/src/i18n/locales/$lang/$ns.json"
  done
done

gh api repos/OpenAEC-Foundation/OpenAEC-style-book/contents/project-templates/Tauri+React/src/i18n/config.ts --jq '.content' | base64 -d > packages/desktop/src/i18n/config.ts
```

Expected: 8 JSON locale files + `config.ts` exist.

- [ ] **Step 2: Rebrand app name in NL common.json**

Open `packages/desktop/src/i18n/locales/nl/common.json`. Find any key containing "Open Template" or template-specific app name. Replace with "OpenAEC Calc".

If the file has structure like `"appName": "Open Template"`, change to `"appName": "OpenAEC Calc"`. Verify with grep:
```bash
grep -i "template" packages/desktop/src/i18n/locales/nl/common.json
```
Expected after edit: no matches for "open template".

- [ ] **Step 3: Same rebrand for EN common.json**

Same as Step 2 but for `packages/desktop/src/i18n/locales/en/common.json`.

- [ ] **Step 4: Verify i18n config imports are sound**

Open `packages/desktop/src/i18n/config.ts` and check that imports reference paths that exist. If any imports reference removed namespaces (e.g. `feedback.json` which we may not have copied), remove those imports + the namespace registration.

If `config.ts` imports `feedback.json`: also fetch it for completeness, since the FeedbackDialog component was omitted but the namespace might still be referenced. To stay safe, fetch all locale files referenced by config.ts:
```bash
grep "from.*locales" packages/desktop/src/i18n/config.ts
```

If unfetched files are imported: fetch them too.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src/i18n/
git commit -m "feat(desktop): vendor i18n locales (NL+EN), rebrand to OpenAEC Calc"
```

---

## Task 8: Vendor shell components (TitleBar, StatusBar, DocumentBar, Modal, ThemedSelect)

**Files:**
- Create: `packages/desktop/src/components/TitleBar.{tsx,css}`
- Create: `packages/desktop/src/components/StatusBar.{tsx,css}`
- Create: `packages/desktop/src/components/DocumentBar.{tsx,css}`
- Create: `packages/desktop/src/components/Modal.{tsx,css}`
- Create: `packages/desktop/src/components/ThemedSelect.{tsx,css}`

- [ ] **Step 1: Fetch all five components**

Run:
```bash
mkdir -p packages/desktop/src/components
for comp in TitleBar StatusBar DocumentBar Modal ThemedSelect; do
  for ext in tsx css; do
    gh api "repos/OpenAEC-Foundation/OpenAEC-style-book/contents/project-templates/Tauri+React/src/components/$comp.$ext" --jq '.content' | base64 -d > "packages/desktop/src/components/$comp.$ext"
  done
done
```

Expected: 10 files exist (5 × {tsx, css}).

- [ ] **Step 2: Open `TitleBar.tsx` — check for FeedbackDialog references**

Run: `grep -n "Feedback" packages/desktop/src/components/TitleBar.tsx`
If matches exist: remove the FeedbackDialog import + the JSX block + the button that opens it. Keep the rest of TitleBar intact (drag region, window controls, app icon, title).

- [ ] **Step 3: Update app title hardcoded string**

Open `packages/desktop/src/components/TitleBar.tsx`. If the app title is hardcoded as "Open Template" (rather than coming from i18n), replace with `"OpenAEC Calc"` or with a `t("appName")` call. Be specific: search and replace exact string "Open Template".

- [ ] **Step 4: Commit**

```bash
git add packages/desktop/src/components/TitleBar.{tsx,css} packages/desktop/src/components/StatusBar.{tsx,css} packages/desktop/src/components/DocumentBar.{tsx,css} packages/desktop/src/components/Modal.{tsx,css} packages/desktop/src/components/ThemedSelect.{tsx,css}
git commit -m "feat(desktop): vendor shell components (TitleBar, StatusBar, DocumentBar, Modal, ThemedSelect)"
```

---

## Task 9: Vendor ribbon framework components

**Files:**
- Create: `packages/desktop/src/components/ribbon/Ribbon.{tsx,css}`
- Create: `packages/desktop/src/components/ribbon/RibbonTab.tsx`
- Create: `packages/desktop/src/components/ribbon/RibbonGroup.tsx`
- Create: `packages/desktop/src/components/ribbon/RibbonButton.tsx`
- Create: `packages/desktop/src/components/ribbon/RibbonButtonStack.tsx`
- Create: `packages/desktop/src/components/ribbon/icons.ts`

- [ ] **Step 1: Fetch ribbon files**

Run:
```bash
mkdir -p packages/desktop/src/components/ribbon
for file in Ribbon.tsx Ribbon.css RibbonTab.tsx RibbonGroup.tsx RibbonButton.tsx RibbonButtonStack.tsx icons.ts; do
  gh api "repos/OpenAEC-Foundation/OpenAEC-style-book/contents/project-templates/Tauri+React/src/components/ribbon/$file" --jq '.content' | base64 -d > "packages/desktop/src/components/ribbon/$file"
done
```

Expected: 7 files exist.

- [ ] **Step 2: Check `Ribbon.tsx` for imports of stripped tabs**

Run: `grep -n "import.*Tab" packages/desktop/src/components/ribbon/Ribbon.tsx`

If `Ribbon.tsx` imports `HomeTab`, `IfcTab`, `ReportTab`, `ViewerTab`, `ExtensionsTab` — leave the imports for now; we'll replace them with our own tabs in Task 11. (Build will fail until then, but commits should still pass type-check; if not, comment out the offending imports temporarily.)

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/components/ribbon/
git commit -m "feat(desktop): vendor ribbon framework (Ribbon, Tab, Group, Button, ButtonStack, icons)"
```

---

## Task 10: Vendor Backstage + SettingsDialog (drop ExtensionManagerPanel)

**Files:**
- Create: `packages/desktop/src/components/backstage/Backstage.{tsx,css}`
- Create: `packages/desktop/src/components/settings/SettingsDialog.{tsx,css}`

- [ ] **Step 1: Fetch Backstage**

Run:
```bash
mkdir -p packages/desktop/src/components/backstage packages/desktop/src/components/settings
gh api repos/OpenAEC-Foundation/OpenAEC-style-book/contents/project-templates/Tauri+React/src/components/backstage/Backstage.tsx --jq '.content' | base64 -d > packages/desktop/src/components/backstage/Backstage.tsx
gh api repos/OpenAEC-Foundation/OpenAEC-style-book/contents/project-templates/Tauri+React/src/components/backstage/Backstage.css --jq '.content' | base64 -d > packages/desktop/src/components/backstage/Backstage.css
```

- [ ] **Step 2: Remove ExtensionManagerPanel references from Backstage.tsx**

Run: `grep -n "Extension" packages/desktop/src/components/backstage/Backstage.tsx`

For each match: either remove the import + corresponding JSX block, or replace with a placeholder stub. Concretely:
- Remove `import ExtensionManagerPanel from "./ExtensionManagerPanel"`
- Remove the `<ExtensionManagerPanel />` usage from the panel-switch
- Remove the "extensions" entry from the panel navigation list

If after these edits Backstage compiles but has dead references to the "extensions" panel id, remove the related menu item too.

- [ ] **Step 3: Fetch SettingsDialog**

Run:
```bash
gh api repos/OpenAEC-Foundation/OpenAEC-style-book/contents/project-templates/Tauri+React/src/components/settings/SettingsDialog.tsx --jq '.content' | base64 -d > packages/desktop/src/components/settings/SettingsDialog.tsx
gh api repos/OpenAEC-Foundation/OpenAEC-style-book/contents/project-templates/Tauri+React/src/components/settings/SettingsDialog.css --jq '.content' | base64 -d > packages/desktop/src/components/settings/SettingsDialog.css
```

- [ ] **Step 4: Verify `applyTheme` export exists**

Run: `grep -n "applyTheme" packages/desktop/src/components/settings/SettingsDialog.tsx`
Expected: a line like `export function applyTheme(...)`. App.tsx in Task 12 will import this.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src/components/backstage/ packages/desktop/src/components/settings/
git commit -m "feat(desktop): vendor Backstage + SettingsDialog (omit ExtensionManagerPanel)"
```

---

## Task 11: Create Ifc-Calc-specific ribbon tabs (stubs only)

**Files:**
- Create: `packages/desktop/src/components/ribbon/CalcTab.tsx` (replaces HomeTab)
- Create: `packages/desktop/src/components/ribbon/InsertTab.tsx`
- Create: `packages/desktop/src/components/ribbon/ViewTab.tsx`
- Create: `packages/desktop/src/components/ribbon/IfcTab.tsx`

These are STUBS in Phase 1 — buttons have labels and OpenAEC icons, but `onClick` is `() => {}`. Real functionality in Phase 2-4.

- [ ] **Step 1: Write `CalcTab.tsx`**

Content:
```tsx
import { useTranslation } from "react-i18next";
import RibbonGroup from "./RibbonGroup";
import RibbonButton from "./RibbonButton";
import { newIcon, openIcon, saveIcon, undoIcon, redoIcon, exportPdfIcon } from "./icons";

export default function CalcTab() {
  const { t } = useTranslation("ribbon");
  return (
    <>
      <RibbonGroup label={t("file.label", "Bestand")}>
        <RibbonButton icon={newIcon} label={t("file.new", "Nieuw")} onClick={() => {}} />
        <RibbonButton icon={openIcon} label={t("file.open", "Openen")} onClick={() => {}} />
        <RibbonButton icon={saveIcon} label={t("file.save", "Opslaan")} onClick={() => {}} />
      </RibbonGroup>
      <RibbonGroup label={t("edit.label", "Bewerken")}>
        <RibbonButton icon={undoIcon} label={t("edit.undo", "Ongedaan")} onClick={() => {}} />
        <RibbonButton icon={redoIcon} label={t("edit.redo", "Opnieuw")} onClick={() => {}} />
      </RibbonGroup>
      <RibbonGroup label={t("export.label", "Exporteren")}>
        <RibbonButton icon={exportPdfIcon} label={t("export.pdf", "PDF")} onClick={() => {}} />
      </RibbonGroup>
    </>
  );
}
```

Note: this imports icons from `./icons`. If `icons.ts` (Task 9) doesn't export `newIcon`/`openIcon`/`saveIcon`/`undoIcon`/`redoIcon`/`exportPdfIcon`, check what it does export and substitute. Likely it exports them under other names (e.g. `IconNew`, `iconNew`, `FileNew`) — adapt accordingly. If a needed icon doesn't exist in template's `icons.ts`, use the first available file/edit icon and document the substitution in commit message.

- [ ] **Step 2: Write `InsertTab.tsx`**

Content:
```tsx
import { useTranslation } from "react-i18next";
import RibbonGroup from "./RibbonGroup";
import RibbonButton from "./RibbonButton";
import * as icons from "./icons";

export default function InsertTab() {
  const { t } = useTranslation("ribbon");
  return (
    <>
      <RibbonGroup label={t("insert.elements", "Elementen")}>
        <RibbonButton icon={icons.headingIcon ?? icons.textIcon} label={t("insert.heading", "Kop")} onClick={() => {}} />
        <RibbonButton icon={icons.formulaIcon ?? icons.textIcon} label={t("insert.formula", "Formule")} onClick={() => {}} />
        <RibbonButton icon={icons.selectIcon ?? icons.textIcon} label={t("insert.select", "Keuzelijst")} onClick={() => {}} />
      </RibbonGroup>
      <RibbonGroup label={t("insert.media", "Media")}>
        <RibbonButton icon={icons.imageIcon ?? icons.textIcon} label={t("insert.image", "Afbeelding")} onClick={() => {}} />
        <RibbonButton icon={icons.svgIcon ?? icons.textIcon} label={t("insert.svg", "SVG")} onClick={() => {}} />
      </RibbonGroup>
    </>
  );
}
```

- [ ] **Step 3: Write `ViewTab.tsx`**

Content:
```tsx
import { useTranslation } from "react-i18next";
import RibbonGroup from "./RibbonGroup";
import RibbonButton from "./RibbonButton";
import * as icons from "./icons";

export default function ViewTab() {
  const { t } = useTranslation("ribbon");
  return (
    <>
      <RibbonGroup label={t("view.layout", "Indeling")}>
        <RibbonButton icon={icons.splitIcon ?? icons.textIcon} label={t("view.split", "Splitsen")} onClick={() => {}} />
        <RibbonButton icon={icons.editorIcon ?? icons.textIcon} label={t("view.editor", "Editor")} onClick={() => {}} />
        <RibbonButton icon={icons.previewIcon ?? icons.textIcon} label={t("view.preview", "Preview")} onClick={() => {}} />
      </RibbonGroup>
    </>
  );
}
```

- [ ] **Step 4: Write `IfcTab.tsx`**

Content:
```tsx
import { useTranslation } from "react-i18next";
import RibbonGroup from "./RibbonGroup";
import RibbonButton from "./RibbonButton";
import * as icons from "./icons";

export default function IfcTab() {
  const { t } = useTranslation("ribbon");
  return (
    <>
      <RibbonGroup label={t("ifc.file", "Bestand")}>
        <RibbonButton icon={icons.openIcon ?? icons.textIcon} label={t("ifc.open", "IFC Open")} onClick={() => {}} />
      </RibbonGroup>
      <RibbonGroup label={t("ifc.convert", "Converteren")}>
        <RibbonButton icon={icons.uploadIcon ?? icons.textIcon} label={t("ifc.gefToIfc", "GEF naar IFC")} onClick={() => {}} />
        <RibbonButton icon={icons.uploadIcon ?? icons.textIcon} label={t("ifc.broToIfc", "BRO naar IFC")} onClick={() => {}} />
      </RibbonGroup>
    </>
  );
}
```

- [ ] **Step 5: Wire new tabs into Ribbon.tsx**

Open `packages/desktop/src/components/ribbon/Ribbon.tsx`. Replace any imports of `HomeTab`/`IfcTab`/`ReportTab`/`ViewerTab`/`ExtensionsTab` with our four new tabs (`CalcTab`, `InsertTab`, `ViewTab`, `IfcTab`).

The tab registration array typically looks like:
```tsx
const TABS = [
  { id: "home", component: HomeTab, labelKey: "tabs.home" },
  ...
];
```

Replace with:
```tsx
const TABS = [
  { id: "calc", component: CalcTab, labelKey: "tabs.calc" },
  { id: "insert", component: InsertTab, labelKey: "tabs.insert" },
  { id: "view", component: ViewTab, labelKey: "tabs.view" },
  { id: "ifc", component: IfcTab, labelKey: "tabs.ifc" },
];
```

(The exact prop names depend on the template — adjust to match what `RibbonTab` expects.)

- [ ] **Step 6: Add corresponding ribbon labels to locale files**

Open `packages/desktop/src/i18n/locales/nl/ribbon.json`. Ensure these keys exist:
```json
{
  "tabs": {
    "calc": "Start",
    "insert": "Invoegen",
    "view": "Weergave",
    "ifc": "IFC"
  }
}
```

Add the same structure to `en/ribbon.json` with English labels: "Home" / "Insert" / "View" / "IFC".

(The full file likely has more keys; only ensure `tabs.*` exist. Merge into existing JSON structure.)

- [ ] **Step 7: Commit**

```bash
git add packages/desktop/src/components/ribbon/CalcTab.tsx packages/desktop/src/components/ribbon/InsertTab.tsx packages/desktop/src/components/ribbon/ViewTab.tsx packages/desktop/src/components/ribbon/IfcTab.tsx packages/desktop/src/components/ribbon/Ribbon.tsx packages/desktop/src/i18n/locales/
git commit -m "feat(desktop): add Ifc-Calc-specific ribbon tabs (Calc/Insert/View/IFC) as stubs"
```

---

## Task 12: Write minimal `App.tsx` (no welcome, no PDF, no IFC viewer)

**Files:**
- Create: `packages/desktop/src/App.tsx`

- [ ] **Step 1: Write `App.tsx`**

Content:
```tsx
import { useState, useEffect } from "react";
import TitleBar from "./components/TitleBar";
import Ribbon from "./components/ribbon/Ribbon";
import DocumentBar from "./components/DocumentBar";
import StatusBar from "./components/StatusBar";
import Backstage from "./components/backstage/Backstage";
import SettingsDialog, { applyTheme } from "./components/settings/SettingsDialog";
import { getSetting } from "./store";
import "./themes.css";
import "./App.css";

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [backstageOpen, setBackstageOpen] = useState(false);

  useEffect(() => {
    getSetting<string>("theme", "light").then((saved) => applyTheme(saved));
    // Show window once theme is applied (avoids flash of unstyled chrome)
    import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      getCurrentWindow().show();
    }).catch(() => {
      // Browser fallback (npm run dev without Tauri)
    });
  }, []);

  return (
    <>
      <TitleBar
        onSettingsClick={() => setSettingsOpen(true)}
        onBackstageClick={() => setBackstageOpen(true)}
      />
      <Ribbon onBackstageOpen={() => setBackstageOpen(true)} />
      <DocumentBar />
      <main className="main-view" style={{ flex: 1 }}>
        <div className="placeholder" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-secondary)" }}>
          <p>Editor + Preview komen in Fase 3</p>
        </div>
      </main>
      <StatusBar />
      <Backstage open={backstageOpen} onClose={() => setBackstageOpen(false)} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
```

Note: the prop names (`onSettingsClick`, `onBackstageClick`, `onBackstageOpen`) match the template's interface. If TitleBar's props differ (e.g. uses `onFeedbackClick` which we removed): inspect TitleBar.tsx props in the file and adjust the call site.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd packages/desktop && npx tsc --noEmit`
Expected: no type errors. Common failure modes:
- "Cannot find module './components/...'" — file naming mismatch; check that case (Backstage vs backstage/) is consistent.
- "Property 'onSettingsClick' does not exist on type 'TitleBarProps'" — adjust prop names to match TitleBar component.

Fix any type errors before moving on.

- [ ] **Step 3: Commit**

```bash
git add packages/desktop/src/App.tsx
git commit -m "feat(desktop): wire minimal App.tsx (no welcome, no IFC viewer, no PDF)"
```

---

## Task 13: Run Vite dev server, smoke test in browser

**Files:** none modified. Verification step.

- [ ] **Step 1: Start Vite dev server (browser, no Tauri)**

Run: `npm run dev --workspace=@openaec/calc`
Expected: Vite prints "Local: http://localhost:3020" within 1-2 seconds. No errors in terminal.

- [ ] **Step 2: Open in browser**

Navigate to `http://localhost:3020` in any browser.
Expected: page loads with:
- Frameless-look titlebar (but standard browser chrome will surround it since we're not in Tauri)
- OpenAEC ribbon with 4 tabs visible (Start/Invoegen/Weergave/IFC)
- DocumentBar visible
- Placeholder text "Editor + Preview komen in Fase 3"
- StatusBar at the bottom
- Amber accent color on active tab
- Fonts loaded: Space Grotesk (headings) + Inter (body) + JetBrains Mono (section labels)

If the page is blank or shows errors: open browser devtools console. Common failures:
- `Failed to fetch dynamic import @tauri-apps/api/window` — expected in browser mode; should be caught by `.catch()` in App.tsx
- `Cannot find module './...'` — file imports broken; fix and re-run
- 404 on locale files — i18n config paths broken; check `src/i18n/config.ts`

- [ ] **Step 3: Test theme switcher**

Click settings cog in TitleBar (if visible). Theme selector in SettingsDialog → switch to "openaec" (dark).
Expected: page immediately re-themes; background goes dark, accents stay amber.

If SettingsDialog button isn't visible: skip this step for now and document in commit message.

- [ ] **Step 4: Stop dev server**

Press Ctrl+C in terminal.

- [ ] **Step 5: Commit** (no file changes, but bookmark the milestone)

Not a real commit — just verify previous commits stand. Run:
```bash
git log --oneline -10
```
Expected: see the commits from Tasks 2-12 in reverse chronological order.

---

## Task 14: Run Tauri dev (real desktop window)

**Files:** none modified. Verification step.

- [ ] **Step 1: Run `npm run tauri dev` from desktop package**

Run: `npm run tauri dev --workspace=@openaec/calc`
Expected: lengthy first-time compilation of Rust crates (3-8 minutes on cold cache). On Windows: a UAC prompt may appear if `windows-rs` builds for the first time.

If compilation succeeds: a native window opens titled "OpenAEC Calc", with the OpenAEC ribbon shell. The Vite dev server output indicates frontend HMR is live.

- [ ] **Step 2: Visual smoke checks**

Verify in the native window:
- [ ] Window title (in taskbar) reads "OpenAEC Calc"
- [ ] Frameless window: no native OS title bar at top; our custom titlebar is the only header
- [ ] Window controls (min/max/close) in the top-right work
- [ ] Drag region: clicking and dragging the titlebar repositions the window
- [ ] Ribbon tabs: all 4 (Start/Invoegen/Weergave/IFC) clickable, switching them changes ribbon content
- [ ] Theme switch: opens dark theme without visual breakage
- [ ] DocumentBar: visible above the placeholder area
- [ ] StatusBar: visible at the bottom of the window

If any check fails: file the failure as a follow-up task with the specific symptom, but do NOT fix here (Phase 1 acceptance is "shell renders" — minor cosmetic issues can be addressed in Phase 2's first task).

- [ ] **Step 3: Close window**

Click the X in the titlebar. The dev server should terminate cleanly.

- [ ] **Step 4: Document the verification**

Append to `packages/desktop/README.md` (create if absent) a section:
```markdown
# @openaec/calc — Phase 1 Scaffold

This package is the OpenAEC-themed shell for the Ifc-Calc rekenmodule, in active migration from `@ifc-calc/web`.

**Status:** Phase 1 complete — shell renders. No calc functionality yet.

## Development

```bash
npm install                              # from repo root
npm run dev --workspace=@openaec/calc    # Vite only, browser at :3020
npm run tauri dev --workspace=@openaec/calc  # full Tauri desktop window
```

## What's here / what's not

✅ Tauri 2 + React 19 + TypeScript scaffold
✅ OpenAEC titlebar / ribbon / statusbar / backstage / settings
✅ Light + dark (openaec) themes
✅ NL + EN i18n
✅ 4 stub ribbon tabs: Start, Invoegen, Weergave, IFC

🚧 Coming in Phase 2-5:
- Project browser sidebar
- CodeMirror editor + KaTeX preview
- File open/save via Tauri dialogs
- 50+ Eurocode templates
- OpenAEC logo + bundled fonts (currently using web fonts from Google Fonts)
```

- [ ] **Step 5: Commit README**

```bash
git add packages/desktop/README.md
git commit -m "docs(desktop): document Phase 1 scaffold status"
```

---

## Task 15: Final Phase 1 commit — tag the milestone

**Files:** none modified.

- [ ] **Step 1: Verify git state is clean**

Run: `git status`
Expected: "nothing to commit, working tree clean"

- [ ] **Step 2: Confirm overall test**

Run `npm run tauri dev --workspace=@openaec/calc` one more time and confirm:
- [ ] Window opens within 5 seconds (after initial Rust compile, subsequent runs are fast)
- [ ] Title reads "OpenAEC Calc"
- [ ] No console errors in devtools (right-click → Inspect Element)

- [ ] **Step 3: Tag the phase**

Run:
```bash
git tag -a phase1-scaffold -m "Phase 1: OpenAEC Calc scaffold complete"
git log --oneline -20
```
Expected: tag shown in log.

Phase 1 acceptance: ✅ Shell renders identically to OpenAEC sister tools (BIM Validator, BCF Platform chrome). No calc functionality yet. Ready for Phase 2 plan.

---

## Self-Review

**Spec coverage:**
- ✅ Spec §1 architecture (Tauri 2 + React 19 + Vite 7 + Zustand 5) → Tasks 3, 5, 6
- ✅ Spec §2 project structure (`packages/desktop/`) → Tasks 2, 3, 4, 5, 6, 7, 8, 9, 10
- ✅ Spec §3 component mapping (TitleBar/Ribbon/etc. from template) → Tasks 8, 9, 10
- ✅ Spec §3 Ifc-Calc-specific tabs → Task 11
- ✅ Spec §4 Phase 1 acceptance criteria → Tasks 13, 14
- 🚧 Spec §3.2 stores (documentStore/projectStore/settingsStore) — Phase 1 only uses `store.ts` from template for settings persistence; full Zustand stores in Phase 2-4
- 🚧 Spec §3.3 editor→preview pipeline — Phase 3
- 🚧 Spec §3.4 Tauri file IO — Phase 4
- 🚧 Spec §5 stays/disappears — `packages/web/` removal in Phase 5

**Placeholder scan:** No "TBD"/"TODO"/"implement later". Stub `onClick={() => {}}` handlers in Task 11 are explicit phase-1 stubs, documented in plan intro.

**Type consistency:** Component prop names (`onSettingsClick`, `onBackstageOpen` etc.) match template's component interfaces — Task 12 explicitly notes adjustment may be needed based on actual prop signatures.

**Known risks (carried from spec):**
- Task 5 step 10 (Cargo check) may surface stripped-dep issues — plan accommodates with rollback note.
- Task 11 step 1+ may need icon-name remapping — plan notes the `*Icon` fallback pattern.
- Task 13 theme switcher may not be visible if SettingsDialog trigger isn't wired — plan explicitly allows deferring.

Phase 2-5 plans to follow after Phase 1 ships.
