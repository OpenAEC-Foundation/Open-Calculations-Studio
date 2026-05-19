import { useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { useDocumentStore } from "../../store/documentStore";
import { ifcCalcLang } from "./ifcCalcLanguage";
import "./Editor.css";

export default function Editor() {
  const source = useDocumentStore((s) => s.source);
  const setSource = useDocumentStore((s) => s.setSource);

  const onChange = useCallback(
    (value: string) => {
      setSource(value);
    },
    [setSource],
  );

  return (
    <div className="calc-editor">
      <CodeMirror
        value={source}
        height="100%"
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
