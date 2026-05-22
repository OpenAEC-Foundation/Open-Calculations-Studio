import { create } from "zustand";
import type { SelectValues } from "@ifc-calc/core";
import { paalExample } from "../templates/examples";
import { getSetting, setSetting } from "../store";

const STORE_KEY = "documentState";

interface PersistedDoc {
  source: string;
  filePath: string | null;
}

interface DocumentState {
  source: string;
  selectValues: SelectValues;
  filePath: string | null;
  dirty: boolean;
  setSource: (src: string) => void;
  setSelectValue: (id: string, value: string) => void;
  loadTemplate: (src: string, name?: string) => void;
  /** Clear dirty flag and remember the on-disk filename (after Save / Save As). */
  markSaved: (filePath: string) => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  source: paalExample,
  selectValues: {},
  filePath: "Paaldraagvermogen",
  dirty: false,
  setSource: (src) => set({ source: src, dirty: true }),
  setSelectValue: (id, value) =>
    set((s) => ({ selectValues: { ...s.selectValues, [id]: value } })),
  loadTemplate: (src, name) =>
    set({ source: src, selectValues: {}, filePath: name ?? null, dirty: false }),
  markSaved: (filePath) =>
    set({ filePath, dirty: false }),
}));

// Persistence — hydrate source + filePath, then auto-save (debounced) on
// each change. Survives app restart so the user picks up where they left off.
let docPersistTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleDocPersist(snapshot: PersistedDoc) {
  if (docPersistTimer) clearTimeout(docPersistTimer);
  docPersistTimer = setTimeout(() => {
    void setSetting(STORE_KEY, snapshot);
    docPersistTimer = null;
  }, 500);
}

void getSetting<PersistedDoc | null>(STORE_KEY, null).then((saved) => {
  if (saved && typeof saved.source === "string") {
    useDocumentStore.setState({ source: saved.source, filePath: saved.filePath ?? null, dirty: false });
  }
  useDocumentStore.subscribe((s) =>
    scheduleDocPersist({ source: s.source, filePath: s.filePath }),
  );
});
