import { create } from "zustand";
import type { EditorView } from "@codemirror/view";

/**
 * Holds a reference to the live CodeMirror EditorView so non-editor
 * components (ribbon, menus) can dispatch commands like undo/redo or
 * insert text at the cursor.
 *
 * The Editor component registers itself on mount and unregisters on
 * unmount.
 */
interface EditorViewState {
  view: EditorView | null;
  setView: (v: EditorView | null) => void;
}

export const useEditorViewStore = create<EditorViewState>((set) => ({
  view: null,
  setView: (v) => set({ view: v }),
}));
