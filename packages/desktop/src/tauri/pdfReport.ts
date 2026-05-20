/**
 * Frontend wrappers around the openaec-core Rust PDF engine Tauri commands:
 *   - `engine_save_pdf`    → user-chosen path via save dialog
 *   - `engine_preview_pdf` → temp file path for in-app iframe preview
 *
 * Both go through `documentToReport()` to convert the evaluated document
 * into the openaec-core ReportData schema first.
 */

import { documentToReport } from "../lib/documentToReport";
import type { EvaluatedNode } from "@ifc-calc/core";

function isTauriEnv(): boolean {
  try {
    // @ts-expect-error — runtime probe of Tauri internals
    return typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;
  } catch {
    return false;
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_");
}

/**
 * Open a save dialog and write the generated PDF to the chosen location.
 * Returns the saved path, or `null` if the user cancelled.
 */
export async function savePdfReport(
  nodes: EvaluatedNode[],
  projectName: string,
): Promise<string | null> {
  if (!isTauriEnv()) {
    alert(
      "PDF rapportgeneratie werkt alleen in de Tauri desktop app, " +
        "niet in de browser preview. Open via `tauri dev` of de gebouwde executable.",
    );
    return null;
  }

  const report = documentToReport(nodes, projectName);
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { invoke } = await import("@tauri-apps/api/core");

  const defaultName = `${sanitizeFileName(projectName)}.pdf`;
  const path = await save({
    title: "PDF rapport opslaan",
    defaultPath: defaultName,
    filters: [{ name: "PDF document", extensions: ["pdf"] }],
  });
  if (!path) return null;

  const bytes = await invoke<number>("engine_save_pdf", { report, path });
  console.log(`PDF rapport opgeslagen (${bytes} bytes) → ${path}`);
  return path;
}

/**
 * Generate the PDF into the OS temp dir and return the absolute path.
 * Caller is expected to wrap the path with `convertFileSrc()` and load it
 * into an <iframe> for in-app preview.
 *
 * Throws when running outside Tauri so the caller can show a fallback UI.
 */
export async function previewPdfReport(
  nodes: EvaluatedNode[],
  projectName: string,
): Promise<string> {
  if (!isTauriEnv()) {
    throw new Error(
      "PDF preview vereist de Tauri desktop app — gebruik `npm run tauri dev` of de gebouwde executable.",
    );
  }
  const report = documentToReport(nodes, projectName);
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("engine_preview_pdf", { report });
}
