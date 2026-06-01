import { create } from "zustand";
import { useDocumentStore } from "./documentStore";
import { templates } from "../templates";
import { getSetting, setSetting } from "../store";

/**
 * Project = a user-composed ordered list of sheets. Each sheet is either a
 * calc-template (CalcPAD source) or a "cover" (voorblad) page.
 *
 * Active sheet's `source` is mirrored into documentStore.source so the editor
 * and preview keep working with a single shared `source` string. On switch,
 * the previous active sheet's source is captured from documentStore back
 * into the sheet record.
 */

export type SheetType = "cover" | "calc" | "wizard";

export interface ProjectSheet {
  id: string;
  type: SheetType;
  /** Display label in the sidebar. */
  label: string;
  /** Optional templateId for first-load. Once user edits, source is authoritative. */
  templateId?: string;
  /** Live CalcPAD source for this sheet (alleen voor "cover" / "calc"). */
  source: string;
  /** Wizard-id (e.g. "spuwer") — alleen voor type="wizard". */
  wizardId?: string;
}

interface ProjectState {
  sheets: ProjectSheet[];
  activeSheetId: string | null;

  /** Replace the entire sheet list (used by file-open hydration). */
  loadSheets: (sheets: ProjectSheet[], activeId?: string) => void;
  /** Append a new sheet built from a template (or empty). */
  addSheet: (templateId: string | null, type: SheetType, label: string) => void;
  /** Append a new wizard-sheet (geen calcpad-source, draait via WizardHost). */
  addWizardSheet: (wizardId: string, label: string) => void;
  /** Remove a sheet by id. Active id slides to the previous (or next) sheet. */
  removeSheet: (id: string) => void;
  /** Move a sheet up/down in the order. */
  moveSheet: (id: string, dir: "up" | "down") => void;
  /** Switch the active sheet — flushes current docStore.source into the
   *  previous sheet, then loads the new sheet's source into docStore. */
  switchTo: (id: string) => void;
  /** Read the source of the active sheet. */
  getActiveSource: () => string;
  /** Rename a sheet. */
  renameSheet: (id: string, label: string) => void;
}

function newId(): string {
  return `sheet-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Build the project's default starter sheets — only Projectgegevens for new projects. */
function defaultSheets(): ProjectSheet[] {
  return [
    {
      id: "sheet-metadata",
      type: "calc",
      label: "Projectgegevens",
      templateId: "project-metadata",
      source: templates["project-metadata"] ?? "",
    },
  ];
}

const STORE_KEY = "projectSheets";

let projectPersistTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleProjectPersist(snapshot: { sheets: ProjectSheet[]; activeSheetId: string | null }) {
  if (projectPersistTimer) clearTimeout(projectPersistTimer);
  projectPersistTimer = setTimeout(() => {
    void setSetting(STORE_KEY, snapshot);
    projectPersistTimer = null;
  }, 400);
}

export const useProjectStore = create<ProjectState>((set, get) => {
  const initial = defaultSheets();
  return {
    sheets: initial,
    activeSheetId: initial[0].id,

    loadSheets: (sheets, activeId) =>
      set(() => {
        const active = activeId && sheets.some((s) => s.id === activeId)
          ? activeId
          : (sheets[0]?.id ?? null);
        // Push active sheet's source into documentStore so the editor reflects it.
        const activeSheet = sheets.find((s) => s.id === active);
        if (activeSheet) {
          useDocumentStore.getState().setSource(activeSheet.source);
        }
        return { sheets, activeSheetId: active };
      }),

    addSheet: (templateId, type, label) =>
      set((s) => {
        const source = templateId ? (templates[templateId] ?? "") : "";
        const sheet: ProjectSheet = {
          id: newId(),
          type,
          label,
          templateId: templateId ?? undefined,
          source,
        };
        // Flush current source into old active before swapping.
        const docSource = useDocumentStore.getState().source;
        const sheets = s.sheets.map((x) =>
          x.id === s.activeSheetId ? { ...x, source: docSource } : x,
        );
        useDocumentStore.getState().setSource(source);
        return { sheets: [...sheets, sheet], activeSheetId: sheet.id };
      }),

    addWizardSheet: (wizardId, label) =>
      set((s) => {
        const sheet: ProjectSheet = {
          id: newId(),
          type: "wizard",
          label,
          wizardId,
          source: "",
        };
        // Flush current source into old active before swapping.
        const docSource = useDocumentStore.getState().source;
        const sheets = s.sheets.map((x) =>
          x.id === s.activeSheetId ? { ...x, source: docSource } : x,
        );
        // Bij switch naar wizard: editor source leeg laten zodat de
        // CalcPAD-editor niets onzinnigs toont (al wordt hij niet gebruikt).
        useDocumentStore.getState().setSource("");
        return { sheets: [...sheets, sheet], activeSheetId: sheet.id };
      }),

    removeSheet: (id) =>
      set((s) => {
        if (s.sheets.length <= 1) return s;
        const idx = s.sheets.findIndex((x) => x.id === id);
        if (idx < 0) return s;
        const remaining = s.sheets.filter((x) => x.id !== id);
        let newActive = s.activeSheetId;
        if (s.activeSheetId === id) {
          const nextIdx = Math.min(idx, remaining.length - 1);
          newActive = remaining[nextIdx]?.id ?? null;
          if (newActive) {
            const next = remaining.find((x) => x.id === newActive);
            if (next) useDocumentStore.getState().setSource(next.source);
          }
        }
        return { sheets: remaining, activeSheetId: newActive };
      }),

    moveSheet: (id, dir) =>
      set((s) => {
        const idx = s.sheets.findIndex((x) => x.id === id);
        if (idx < 0) return s;
        const target = dir === "up" ? idx - 1 : idx + 1;
        if (target < 0 || target >= s.sheets.length) return s;
        const sheets = [...s.sheets];
        [sheets[idx], sheets[target]] = [sheets[target], sheets[idx]];
        return { sheets };
      }),

    switchTo: (id) =>
      set((s) => {
        if (id === s.activeSheetId) return s;
        const target = s.sheets.find((x) => x.id === id);
        if (!target) return s;
        // Flush current docStore source into previous active sheet.
        const docSource = useDocumentStore.getState().source;
        const sheets = s.sheets.map((x) =>
          x.id === s.activeSheetId ? { ...x, source: docSource } : x,
        );
        useDocumentStore.getState().setSource(target.source);
        return { sheets, activeSheetId: id };
      }),

    getActiveSource: () => {
      const { sheets, activeSheetId } = get();
      return sheets.find((s) => s.id === activeSheetId)?.source ?? "";
    },

    renameSheet: (id, label) =>
      set((s) => ({
        sheets: s.sheets.map((x) => (x.id === id ? { ...x, label } : x)),
      })),
  };
});

/**
 * Detecteert opgeslagen sheets die corrupt zijn geraakt door een eerdere
 * UX-bug: de actieve Projectgegevens-sheet kreeg een vreemde source als de
 * gebruiker per ongeluk op een library-item klikte. Een echte Projectgegevens
 * bevat ALTIJD `@select WindGebied`. Mist die marker bij een sheet met
 * templateId="project-metadata", dan herstellen we de canonical source.
 */
function repairMetadataSheets(sheets: ProjectSheet[]): ProjectSheet[] {
  const canonical = templates["project-metadata"];
  if (!canonical) return sheets;
  return sheets.map((s) => {
    if (s.templateId === "project-metadata" && !/@select\s+WindGebied\b/.test(s.source)) {
      return { ...s, source: canonical };
    }
    return s;
  });
}

// Hydrate from Tauri store on first import, then auto-save (debounced) on
// every mutation. Also auto-flush docStore.source into the active sheet so
// it survives reloads.
void getSetting<{ sheets: ProjectSheet[]; activeSheetId: string | null } | null>(STORE_KEY, null)
  .then((saved) => {
    if (saved && Array.isArray(saved.sheets) && saved.sheets.length > 0) {
      const repaired = repairMetadataSheets(saved.sheets);
      useProjectStore.setState({
        sheets: repaired,
        activeSheetId: saved.activeSheetId ?? repaired[0].id,
      });
      const active = repaired.find((s) => s.id === (saved.activeSheetId ?? repaired[0].id));
      if (active) useDocumentStore.getState().setSource(active.source);
    }
    useProjectStore.subscribe((s) => {
      // Flush docStore.source into the active sheet whenever the store updates.
      const docSource = useDocumentStore.getState().source;
      const sheets = s.sheets.map((x) =>
        x.id === s.activeSheetId ? { ...x, source: docSource } : x,
      );
      scheduleProjectPersist({ sheets, activeSheetId: s.activeSheetId });
    });
    // Also subscribe to docStore source changes — flush into active sheet.
    useDocumentStore.subscribe((doc) => {
      const { sheets, activeSheetId } = useProjectStore.getState();
      if (!activeSheetId) return;
      const sheet = sheets.find((s) => s.id === activeSheetId);
      if (sheet && sheet.source !== doc.source) {
        useProjectStore.setState({
          sheets: sheets.map((s) => (s.id === activeSheetId ? { ...s, source: doc.source } : s)),
        });
      }
    });
  });
