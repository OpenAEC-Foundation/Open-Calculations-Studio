import { useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { useDocumentStore } from "../../store/documentStore";
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
        theme={oneDark}
        extensions={[markdown()]}
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
