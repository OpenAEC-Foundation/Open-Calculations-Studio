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
 * accepted on open; `store/projectBestand.ts` beslist wat een bestand voorstelt
 * en maakt er zo nodig een project met één rekenblad van.
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
  { name: "Calculations", extensions: ["ifc-calculation", "cpd", "cpdz"] },
  { name: "CalcPAD bestanden", extensions: ["cpd", "cpdz"] },
  { name: "OpenAEC Calculations", extensions: ["ifc-calculation"] },
  { name: "Alle bestanden", extensions: ["*"] },
];

export interface OpenedFile {
  path: string;
  name: string;
  /**
   * Onbewerkte bestandsinhoud. Het uitpakken gebeurt in
   * `store/projectBestand.ts`: die kent zowel het projectformaat als de oudere
   * losse-blad-vormen, en kan als enige beslissen wat een bestand voorstelt.
   */
  raw: string;
}

/**
 * Wrap a CalcPAD source + IFCX representation into the on-disk
 * `.ifc-calculation` JSON-LD format. The result IS a valid IFCX document
 * (an IFC consumer can read it) with one extra `source` field for round-trip.
 */
export function wrapAsIfcCalculation(source: string, ifcx: IfcxDocument): string {
  const doc = {
    ...ifcx,
    source: {
      format: "calcpad",
      language: "ifc-calculation",
      content: source,
    },
  };
  return JSON.stringify(doc, null, 2);
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
    const name = pathBaseName(picked);
    return { path: picked, name, raw };
  }

  // Browser fallback: HTML <input type=file>
  return new Promise<OpenedFile | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".ifc-calculation,.cpd,.cpdz,.txt";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      const raw = await f.text();
      resolve({ path: f.name, name: stripExt(f.name), raw });
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
  return s.replace(/\.(ifc-calculation|cpd|cpdz|txt)$/i, "");
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_");
}

/**
 * Schrijf een kant-en-klare payload weg als `.ifc-calculation` via een Save
 * As-dialoog. De payload wordt gebouwd door `store/projectBestand.ts` — dat
 * bepaalt de vorm, dit bestand doet alleen de schijf.
 * Het absolute pad komt terug, of `null` als de gebruiker annuleert.
 */
export async function saveCalculationFile(
  payload: string,
  defaultName: string,
): Promise<string | null> {
  const defaultFile = `${sanitizeFileName(defaultName)}.ifc-calculation`;

  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const path = await save({
      title: "Bestand opslaan als",
      defaultPath: defaultFile,
      filters: [
        { name: "OpenAEC Calculation (IFCX)", extensions: ["ifc-calculation"] },
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
