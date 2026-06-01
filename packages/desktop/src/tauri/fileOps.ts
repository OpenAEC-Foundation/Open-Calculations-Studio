/**
 * File I/O helpers wrapping the Tauri dialog + fs plugins.
 *
 * Falls back gracefully in browser-dev (no Tauri runtime) by using the
 * File System Access API where available, or a stub <input type=file>.
 *
 * File format
 * -----------
 * `.ifc-calculation` files are IFCX (JSON-LD draft) documents with an extra
 * `source` field holding the raw CalcPAD text. This lets the SAME file act as
 *   • an IFC representation of the calc result (consumable by an IFC viewer)
 *   • the round-trippable calc source (consumable by this app)
 *
 * Legacy `.cpd`, `.cpdz` and raw-text `.ifc-calculation` files are still
 * accepted on open — `unwrapFromIfcCalculation` falls through to treating the
 * payload as raw CalcPAD when JSON parsing fails or `source` is absent.
 */

import type { IfcxDocument } from "@ifc-calc/core";

function isTauri(): boolean {
  try {
    // @ts-expect-error — runtime probe
    return typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;
  } catch {
    return false;
  }
}

const SUPPORTED_FILTERS = [
  { name: "OpenAEC Calculations", extensions: ["ifccalculation", "ifc-calculation"] },
  { name: "CalcPAD bestanden", extensions: ["cpd", "cpdz"] },
  { name: "Alle bestanden", extensions: ["*"] },
];

/** Primary save extension. Legacy `.ifc-calculation` still accepted on open. */
const SAVE_EXTENSION = "ifccalculation";

export interface OpenedFile {
  path: string;
  name: string;
  /** Raw CalcPAD source — IFCX-wrapping (when present) is already stripped. */
  content: string;
}

/**
 * Wrap a CalcPAD source + IFCX representation into the on-disk
 * `.ifccalculation` JSON-LD format. The result IS a valid IFCX document
 * (an IFC consumer can read it) with one extra `source` field for round-trip.
 *
 * `projectSheets`, when provided, persists the full multi-sheet project
 * state under `source.project.sheets[]`. On open, the projectStore is
 * rehydrated from this list.
 */
export function wrapAsIfcCalculation(
  source: string,
  ifcx: IfcxDocument,
  projectSheets?: unknown,
): string {
  const doc = {
    ...ifcx,
    source: {
      format: "calcpad",
      language: "ifccalculation",
      content: source,
      ...(projectSheets ? { project: { sheets: projectSheets } } : {}),
    },
  };
  return JSON.stringify(doc, null, 2);
}

/**
 * Extract the multi-sheet project (if any) from a `.ifccalculation` file.
 * Returns the sheets array verbatim — caller validates the shape.
 */
export function projectFromIfcCalculation(content: string): unknown[] | null {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as {
      source?: { project?: { sheets?: unknown[] } };
    };
    const sheets = parsed?.source?.project?.sheets;
    return Array.isArray(sheets) ? sheets : null;
  } catch {
    return null;
  }
}

/**
 * Extract the CalcPAD source from a `.ifccalculation` file. Accepts either:
 *   • new format: JSON document with `source.content`
 *   • legacy: raw CalcPAD text (also matches `.cpd` / `.cpdz` files)
 */
export function unwrapFromIfcCalculation(content: string): string {
  // Quick guard — only try JSON.parse when the payload looks like JSON.
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("{")) return content;
  try {
    const parsed = JSON.parse(trimmed) as { source?: { content?: unknown } };
    if (parsed && typeof parsed.source?.content === "string") {
      return parsed.source.content;
    }
  } catch {
    // Fall through — not JSON, treat as raw CalcPAD.
  }
  return content;
}

/**
 * Open a `.ifc-calculation` or `.cpd` file via the OS file picker.
 * Resolves with the loaded content, or `null` if the user cancelled.
 */
export async function openCalculationFile(): Promise<OpenedFile | null> {
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");

    const picked = await open({
      title: "Bestand openen",
      multiple: false,
      directory: false,
      filters: SUPPORTED_FILTERS,
    });
    if (!picked || typeof picked !== "string") return null;

    const raw = await readTextFile(picked);
    const content = unwrapFromIfcCalculation(raw);
    const name = pathBaseName(picked);
    return { path: picked, name, content };
  }

  // Browser fallback: HTML <input type=file>
  return new Promise<OpenedFile | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".ifccalculation,.ifc-calculation,.cpd,.cpdz,.txt";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      const raw = await f.text();
      const content = unwrapFromIfcCalculation(raw);
      resolve({ path: f.name, name: stripExt(f.name), content });
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

function pathBaseName(p: string): string {
  const last = p.split(/[\\/]/).pop() ?? p;
  return stripExt(last);
}

function stripExt(s: string): string {
  return s.replace(/\.(ifccalculation|ifc-calculation|cpd|cpdz|txt)$/i, "");
}

export type PickedImage =
  | { kind: "raster"; name: string; dataUrl: string }
  | { kind: "svg"; name: string; content: string; dataUrl: string };

/**
 * Open an image picker that accepts both raster (.png/.jpg/.gif/.webp/.bmp)
 * and vector (.svg) files. Returns the loaded content as a data URL (raster)
 * or as the raw SVG text (vector).
 */
export async function openImageOrSvgDialog(): Promise<PickedImage | null> {
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readFile, readTextFile } = await import("@tauri-apps/plugin-fs");
    const picked = await open({
      title: "Afbeelding of SVG kiezen",
      multiple: false,
      filters: [
        { name: "Afbeeldingen + SVG", extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"] },
        { name: "Alle bestanden", extensions: ["*"] },
      ],
    });
    if (!picked || typeof picked !== "string") return null;
    const name = picked.split(/[\\/]/).pop() ?? picked;
    const ext = (name.split(".").pop() ?? "").toLowerCase();
    if (ext === "svg") {
      const content = await readTextFile(picked);
      const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(content)}`;
      return { kind: "svg", name, content, dataUrl };
    }
    const bytes = await readFile(picked);
    const dataUrl = bytesToDataUrl(bytes, ext);
    return { kind: "raster", name, dataUrl };
  }

  // Browser fallback
  return new Promise<PickedImage | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".png,.jpg,.jpeg,.gif,.webp,.bmp,.svg,image/*";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      const ext = (f.name.split(".").pop() ?? "").toLowerCase();
      if (ext === "svg" || f.type === "image/svg+xml") {
        const content = await f.text();
        const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(content)}`;
        resolve({ kind: "svg", name: f.name, content, dataUrl });
      } else {
        const dataUrl = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onload = () => res(String(reader.result));
          reader.readAsDataURL(f);
        });
        resolve({ kind: "raster", name: f.name, dataUrl });
      }
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

function bytesToDataUrl(bytes: Uint8Array, ext: string): string {
  const mimeMap: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    gif: "image/gif", webp: "image/webp", bmp: "image/bmp",
  };
  const mime = mimeMap[ext] ?? "application/octet-stream";
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  // btoa expects ASCII binary string; safe for image bytes.
  // eslint-disable-next-line no-undef
  return `data:${mime};base64,${btoa(binary)}`;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_");
}

/**
 * Save the current calc as a `.ifc-calculation` file via a Save As dialog.
 *
 * The on-disk payload is an IFCX JSON-LD document with the CalcPAD source
 * embedded under `source.content` — see the module header for the format.
 * The resolved absolute path is returned, or `null` if the user cancelled.
 */
export async function saveCalculationFile(
  source: string,
  ifcx: IfcxDocument,
  defaultName: string,
  projectSheets?: unknown,
): Promise<string | null> {
  const payload = wrapAsIfcCalculation(source, ifcx, projectSheets);
  const defaultFile = `${sanitizeFileName(defaultName)}.${SAVE_EXTENSION}`;

  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const path = await save({
      title: "Bestand opslaan als",
      defaultPath: defaultFile,
      filters: [
        { name: "OpenAEC Calculation (IFCX)", extensions: ["ifccalculation"] },
        { name: "Legacy (.ifc-calculation)", extensions: ["ifc-calculation"] },
        { name: "Alle bestanden", extensions: ["*"] },
      ],
    });
    if (!path) return null;
    await writeTextFile(path, payload);
    return path;
  }

  // Browser fallback — download via Blob link
  const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultFile;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return a.download;
}
