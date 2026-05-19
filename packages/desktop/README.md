# @openaec/calc

OpenAEC Calc — a Tauri v2 + React 19 + TypeScript desktop application built on the OpenAEC Foundation design system. Active migration target for the `@ifc-calc/web` rekenmodule (CalcPAD alternative for Eurocode verifications).

**Status:** Phase 1 — shell scaffold complete. Calc functionality not yet wired (comes in Phase 2-5).

## Development

```bash
# From repo root
npm install

# Browser-only dev (Vite, no Tauri window) — fast, good for UI work
npm run dev --workspace=@openaec/calc
# → http://localhost:3021/

# Full Tauri desktop window — slower first compile (~5 min cold)
npm run tauri dev --workspace=@openaec/calc
```

## What's here

- ✅ Tauri 2 Rust shell (no MCP, no PDF generation — those template modules are stripped)
- ✅ React 19 + TypeScript 5.9 + Vite 7.3 frontend
- ✅ OpenAEC visual identity:
  - amber/forge color palette via `themes.css` (light + openaec dark themes)
  - Custom frameless TitleBar, animated tab Ribbon, DocumentBar, StatusBar, Backstage, SettingsDialog, Modal, ThemedSelect — all vendored verbatim from `OpenAEC-style-book/project-templates/Tauri+React`
- ✅ 4 Ifc-Calc-specific ribbon tabs (Start / Invoegen / Weergave / IFC) — buttons present, `onClick` stubs awaiting Phase 2-4
- ✅ NL primary + EN secondary i18n via i18next
- ✅ Persistent settings (theme, sidebar etc.) via `@tauri-apps/plugin-store`

## What's coming

| Phase | Goal |
|---|---|
| 2 | Domain shell — ProjectBrowser sidebar with Books / Standards / Calculations tree |
| 3 | Core integration — CodeMirror editor + KaTeX preview + `@ifc-calc/core` pipeline + 50+ Eurocode templates |
| 4 | Native features — file open/save dialogs, recent files, GEF upload via Tauri dialog |
| 5 | Branding & i18n polish — OpenAEC logo SVGs as window/taskbar icons, full Inter/Space Grotesk/JetBrains Mono font loading, `packages/web/` removal |

## Stack notes

- **Frontend pure CSS, not Tailwind** — matches OpenAEC template's actual implementation (template has a leftover `tailwind.config.ts` but no Tailwind dep). All styling via `themes.css` tokens + per-component `.css` files.
- **Fonts per brandbook §2.2** — body Inter, headings Space Grotesk, code JetBrains Mono. Loaded via Google Fonts link in `index.html`. The template's `App.css` originally hardcoded Segoe UI; we override to comply with the brandbook.
- **Port 3021** — distinct from sister tool `cpt-viewer` on 3020 (template default).

## Stripped from OpenAEC template

Out of scope for OpenAEC Calc:

- IFC viewer (`@thatopen/components`, `three`, `html2canvas`)
- PDF generation engine (`pdf-writer`, `ttf-parser`, `lopdf` Rust crates + `tenants/` brand assets)
- MCP server (Rust `src-tauri/src/mcp/`)
- Welcome screen + Start sidebar
- Project settings dialog
- Extension manager
- Feedback dialog
- Detached window manager
- Path dependency on local `openaec-reports` crate
