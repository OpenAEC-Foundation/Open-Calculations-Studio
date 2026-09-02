import { useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { useActieveBron, useZetActieveBron } from "../../store/actiefBlad";
import { useZoom } from "../../hooks/useZoom";
import { ifcCalcLang } from "./ifcCalcLanguage";
import "./Editor.css";

const BASE_FONT_PX = 13;

export default function Editor() {
  const source = useActieveBron();
  const setSource = useZetActieveBron();
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
          // Geen eigen geschiedenis: ongedaan maken loopt via de projectstore,
          // zodat Ctrl+Z hetzelfde doet of je nu in de tekst typt, een maat in
          // het beeld versleept of een blad hernoemt. Twee stapels naast elkaar
          // geeft anders een onvoorspelbare volgorde.
          history: false,
          historyKeymap: false,
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
