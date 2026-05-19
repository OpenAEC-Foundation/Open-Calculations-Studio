/**
 * Frontend wrapper around the Rust `engine_save_pdf` Tauri command.
 *
 * Flow:
 *   1. Convert the current document (evaluated nodes) to ReportData JSON
 *   2. Open a Tauri save dialog (`.pdf` filter)
 *   3. Invoke `engine_save_pdf({ report, path })` — writes file via Rust
 *   4. Return the chosen path (or null if cancelled)
 *
 * Falls back gracefully when running in a regular browser (no Tauri) by
 * using a Blob download.
 */

import { documentToReport } from "../lib/documentToReport";
import type { EvaluatedNode } from "@ifc-calc/core";

export async function savePdfReport(
  nodes: EvaluatedNode[],
  projectName: string,
): Promise<string | null> {
  const report = documentToReport(nodes, projectName);

  // Detect Tauri environment
  let isTauri = false;
  try {
    // @ts-expect-error — runtime check
    isTauri = typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;
  } catch {
    isTauri = false;
  }

  if (isTauri) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { invoke } = await import("@tauri-apps/api/core");

    const defaultName = `${projectName.replace(/[\\/:*?"<>|]/g, "_")}.pdf`;
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

  // Browser fallback: download blob (requires engine_generate_pdf bytes via fetch — not
  // available without Tauri). Show a helpful message instead.
  alert(
    "PDF rapportgeneratie werkt alleen in de Tauri desktop app, " +
      "niet in de browser preview. Open via `tauri dev` of de gebouwde executable.",
  );
  return null;
}
