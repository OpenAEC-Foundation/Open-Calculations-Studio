import { useEffect, useRef, useMemo } from "react";
import { process, defaultStyles } from "@ifc-calc/core";
import { useDocumentStore } from "../../store/documentStore";
import "katex/dist/katex.min.css";
import "./Preview.css";

let stylesInjected = false;
function ensureCoreStyles() {
  if (stylesInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = defaultStyles;
  style.dataset.ifcCalc = "core-styles";
  document.head.appendChild(style);
  stylesInjected = true;
}

export default function Preview() {
  const source = useDocumentStore((s) => s.source);
  const selectValues = useDocumentStore((s) => s.selectValues);
  const setSelectValue = useDocumentStore((s) => s.setSelectValue);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureCoreStyles();
  }, []);

  const html = useMemo(() => {
    try {
      return process(source, selectValues);
    } catch (err) {
      const msg = (err as Error).message;
      return `<div class="ifc-calc"><p class="calc-text" style="color:#dc2626;">Render error: ${msg}</p></div>`;
    }
  }, [source, selectValues]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const selects = root.querySelectorAll<HTMLSelectElement>(".calc-select-input");
    const handlers: Array<[HTMLSelectElement, () => void]> = [];

    for (const sel of selects) {
      const varName = sel.dataset.var;
      if (!varName) continue;
      const stored = selectValues[varName];
      if (stored !== undefined) sel.value = String(stored);
      const handler = () => {
        if (varName) setSelectValue(varName, sel.value);
      };
      sel.addEventListener("change", handler);
      handlers.push([sel, handler]);
    }

    return () => {
      for (const [sel, handler] of handlers) {
        sel.removeEventListener("change", handler);
      }
    };
  }, [html, selectValues, setSelectValue]);

  return (
    <div className="calc-preview">
      <div
        ref={containerRef}
        className="calc-preview-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
