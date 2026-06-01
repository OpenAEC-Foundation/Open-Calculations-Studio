import { useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import type { EditorView } from "@codemirror/view";
import { useDocumentStore } from "../../store/documentStore";
import { useEditorViewStore } from "../../store/editorViewStore";
import { useZoom } from "../../hooks/useZoom";
import { ifcCalcLang } from "./ifcCalcLanguage";
import "./Editor.css";

const BASE_FONT_PX = 13;

export default function Editor() {
  const source = useDocumentStore((s) => s.source);
  const setSource = useDocumentStore((s) => s.setSource);
  const setView = useEditorViewStore((s) => s.setView);
  const { ref, zoom } = useZoom();

  const onChange = useCallback(
    (value: string) => {
      setSource(value);
    },
    [setSource],
  );

  // Publish the EditorView to the shared store so ribbon buttons (undo/redo,
  // insert) can dispatch commands without prop-drilling.
  const onCreateEditor = useCallback(
    (view: EditorView) => {
      setView(view);
    },
    [setView],
  );

  return (
    <div
      className="calc-editor"
      ref={ref}
      style={{ ["--cm-font-size" as string]: `${BASE_FONT_PX * zoom}px` }}
    >
      <CodeMirror
        value={source}
        extensions={[ifcCalcLang()]}
        onChange={onChange}
        onCreateEditor={onCreateEditor}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: true,
          bracketMatching: true,
          // CodeMirror's history extension provides Ctrl+Z / Ctrl+Y plus
          // the dispatchable `undo` / `redo` commands the ribbon uses.
          history: true,
        }}
      />
    </div>
  );
}
