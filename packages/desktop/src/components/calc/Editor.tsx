import { useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { useDocumentStore } from "../../store/documentStore";
import { useZoom } from "../../hooks/useZoom";
import { ifcCalcLang } from "./ifcCalcLanguage";
import "./Editor.css";

const BASE_FONT_PX = 13;

export default function Editor() {
  const source = useDocumentStore((s) => s.source);
  const setSource = useDocumentStore((s) => s.setSource);
  const { ref, zoom } = useZoom();

  const onChange = useCallback(
    (value: string) => {
      setSource(value);
    },
    [setSource],
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
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: true,
          bracketMatching: true,
        }}
      />
    </div>
  );
}
