import { create } from "zustand";
import type { SelectValues } from "@ifc-calc/core";

/**
 * Per-document `belastingsgeval` (load case) state. Each load case stores its
 * own input-prompt + select values, so the user can switch between scenarios
 * (LC1 permanent, LC2 variabel, ULS, SLS, ...) without re-typing values.
 *
 * The active case feeds into the evaluator via Preview and CalcTab.
 */

export interface LoadCase {
  id: string;
  label: string;
}

const defaultCases: LoadCase[] = [
  { id: "lc-1", label: "LC1 Permanent" },
  { id: "lc-2", label: "LC2 Variabel" },
  { id: "lc-uls", label: "UGT" },
  { id: "lc-sls", label: "BGT" },
];

interface LoadCaseState {
  cases: LoadCase[];
  activeId: string;
  /** values keyed by load-case id, then by prompt/select variable name */
  valuesByCase: Record<string, SelectValues>;

  switchTo: (id: string) => void;
  addCase: (label?: string) => void;
  removeCase: (id: string) => void;
  renameCase: (id: string, label: string) => void;

  /** read active case's values (used by Preview / evaluator) */
  getActiveValues: () => SelectValues;
  /** write a value into the active case */
  setActiveValue: (name: string, value: string) => void;
}

export const useLoadCaseStore = create<LoadCaseState>((set, get) => ({
  cases: defaultCases,
  activeId: defaultCases[0].id,
  valuesByCase: Object.fromEntries(defaultCases.map((c) => [c.id, {} as SelectValues])),

  switchTo: (id) => set({ activeId: id }),

  addCase: (label) =>
    set((s) => {
      const next = s.cases.length + 1;
      const id = `lc-${Date.now().toString(36)}`;
      const newCase: LoadCase = { id, label: label ?? `LC${next}` };
      return {
        cases: [...s.cases, newCase],
        valuesByCase: { ...s.valuesByCase, [id]: {} },
        activeId: id,
      };
    }),

  removeCase: (id) =>
    set((s) => {
      if (s.cases.length <= 1) return s; // always keep at least one
      const remaining = s.cases.filter((c) => c.id !== id);
      const { [id]: _removed, ...restValues } = s.valuesByCase;
      void _removed;
      const newActive = s.activeId === id ? remaining[0].id : s.activeId;
      return { cases: remaining, valuesByCase: restValues, activeId: newActive };
    }),

  renameCase: (id, label) =>
    set((s) => ({
      cases: s.cases.map((c) => (c.id === id ? { ...c, label } : c)),
    })),

  getActiveValues: () => {
    const { valuesByCase, activeId } = get();
    return valuesByCase[activeId] ?? {};
  },

  setActiveValue: (name, value) =>
    set((s) => {
      const current = s.valuesByCase[s.activeId] ?? {};
      return {
        valuesByCase: {
          ...s.valuesByCase,
          [s.activeId]: { ...current, [name]: value },
        },
      };
    }),
}));
