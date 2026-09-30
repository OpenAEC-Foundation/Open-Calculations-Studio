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
  { name: "Calculations", extensions: ["ifccalculation", "ifc-calculation", "cpd", "cpdz"] },
  { name: "CalcPAD bestanden", extensions: ["cpd", "cpdz"] },
  { name: "OpenAEC Calculations", extensions: ["ifccalculation", "ifc-calculation"] },
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

// De browser geeft geen bestandspad terug. Bewaar de gekozen handle gedurende
// de sessie, zodat Opslaan hetzelfde bestand kan overschrijven.
let browserHandle: FileSystemFileHandle | null = null;
let browserBestandsnaam: string | null = null;

type BestandsKiezer = Window & {
  showOpenFilePicker?: (options?: object) => Promise<FileSystemFileHandle[]>;
  showSaveFilePicker?: (options?: object) => Promise<FileSystemFileHandle>;
};

function geannuleerd(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
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

  const kies = (window as BestandsKiezer).showOpenFilePicker;
  if (kies) {
    try {
      const [handle] = await kies.call(window, {
        types: [{ description: "Berekeningen", accept: { "application/json": [".ifccalculation", ".ifc-calculation", ".cpd", ".cpdz"] } }],
        excludeAcceptAllOption: false,
      });
      if (!handle) return null;
      const raw = await (await handle.getFile()).text();
      browserHandle = handle;
      browserBestandsnaam = handle.name;
      return { path: handle.name, name: stripExt(handle.name), raw };
    } catch (error) {
      if (geannuleerd(error)) return null;
      throw error;
    }
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
      browserHandle = null;
      browserBestandsnaam = null;
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
  return s.replace(/\.(ifccalculation|ifc-calculation|cpd|cpdz|txt)$/i, "");
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_");
}

/**
 * Kan "Opslaan" zonder dialoog over dit bestand heen schrijven? Alleen in de
 * app (de browser kent geen pad) en alleen over een bestand in het eigen
 * formaat: een geopend `.cpd` of een oud `.ifc-calculation` overschrijf je
 * niet ongemerkt, daarvoor komt eerst de dialoog.
 */
export function kanDirectOpslaan(path: string | null): path is string {
  return !!path && /\.ifccalculation$/i.test(path) &&
    (isTauri() || (browserHandle !== null && browserBestandsnaam === path));
}

/** Schrijf een payload over een bestaand bestand heen, zonder dialoog. */
export async function schrijfCalculationFile(path: string, payload: string): Promise<void> {
  if (!isTauri()) {
    if (!browserHandle || browserBestandsnaam !== path) throw new Error("Geen geopend bestand om te overschrijven");
    const writable = await browserHandle.createWritable();
    await writable.write(payload);
    await writable.close();
    return;
  }
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");
  await writeTextFile(path, payload);
}

/**
 * Schrijf een kant-en-klare payload weg als `.ifc-calculation` via een Save
 * As-dialoog. De payload wordt gebouwd door `store/projectBestand.ts` — dat
 * bepaalt de vorm, dit bestand doet alleen de schijf.
 * Staat het project al in een bestand, dan opent de dialoog in die map.
 * Het absolute pad komt terug, of `null` als de gebruiker annuleert.
 */
export async function saveCalculationFile(
  payload: string,
  defaultName: string,
  huidigPad?: string | null,
): Promise<string | null> {
  const defaultFile = `${sanitizeFileName(defaultName)}.ifccalculation`;

  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const scheiding = huidigPad?.match(/[\\/]/)?.[0];
    const map = huidigPad && scheiding ? huidigPad.slice(0, huidigPad.lastIndexOf(scheiding)) : null;
    const path = await save({
      title: "Bestand opslaan als",
      defaultPath: map ? `${map}${scheiding}${defaultFile}` : defaultFile,
      filters: [
        { name: "OpenAEC Calculation (IFCX)", extensions: ["ifccalculation"] },
        { name: "Alle bestanden", extensions: ["*"] },
      ],
    });
    if (!path) return null;
    await writeTextFile(path, payload);
    return path;
  }

  const kies = (window as BestandsKiezer).showSaveFilePicker;
  if (kies) {
    try {
      const handle = await kies.call(window, {
        suggestedName: defaultFile,
        types: [{ description: "Berekening", accept: { "application/json": [".ifccalculation"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(payload);
      await writable.close();
      browserHandle = handle;
      browserBestandsnaam = handle.name;
      return handle.name;
    } catch (error) {
      if (geannuleerd(error)) return null;
      throw error;
    }
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
