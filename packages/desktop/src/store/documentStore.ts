import { create } from "zustand";
import type { SelectValues } from "@ifc-calc/core";
import { paalExample } from "../templates/examples";

interface DocumentState {
  source: string;
  selectValues: SelectValues;
  filePath: string | null;
  dirty: boolean;
  setSource: (src: string) => void;
  setSelectValue: (id: string, value: string) => void;
  loadTemplate: (src: string, name?: string) => void;
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
}));
