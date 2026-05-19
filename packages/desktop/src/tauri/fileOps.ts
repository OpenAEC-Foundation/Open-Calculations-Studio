/**
 * File I/O helpers wrapping the Tauri dialog + fs plugins.
 *
 * Falls back gracefully in browser-dev (no Tauri runtime) by using the
 * File System Access API where available, or a stub <input type=file>.
 */

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
  content: string;
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

    const content = await readTextFile(picked);
    const name = pathBaseName(picked);
    return { path: picked, name, content };
  }

  // Browser fallback: HTML <input type=file>
  return new Promise<OpenedFile | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".ifc-calculation,.cpd,.cpdz,.txt";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      const content = await f.text();
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
  return s.replace(/\.(ifc-calculation|cpd|cpdz|txt)$/i, "");
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_");
}

/**
 * Save the current document via a Save As dialog. Defaults to the supplied
 * `defaultName` (without extension) and writes a `.ifc-calculation` file. The
 * resolved absolute path is returned, or `null` if the user cancelled.
 */
export async function saveCalculationFile(
  content: string,
  defaultName: string,
): Promise<string | null> {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const path = await save({
      title: "Bestand opslaan als",
      defaultPath: `${sanitizeFileName(defaultName)}.ifc-calculation`,
      filters: SUPPORTED_FILTERS,
    });
    if (!path) return null;
    await writeTextFile(path, content);
    return path;
  }

  // Browser fallback — download via Blob link
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFileName(defaultName)}.ifc-calculation`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return a.download;
}
