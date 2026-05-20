import { useEffect, useRef, useMemo } from "react";
import { process, defaultStyles } from "@ifc-calc/core";
import { useDocumentStore } from "../../store/documentStore";
import { useLoadCaseStore } from "../../store/loadCaseStore";
import { calcpadIncludes } from "../../templates/calcpad-includes";
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
  // Prompt + select values are stored per-load-case. The active case's values
  // drive the evaluator; switching the case re-renders the preview.
  const activeId = useLoadCaseStore((s) => s.activeId);
  const valuesByCase = useLoadCaseStore((s) => s.valuesByCase);
  const setActiveValue = useLoadCaseStore((s) => s.setActiveValue);
  const selectValues = valuesByCase[activeId] ?? {};
  const setSelectValue = setActiveValue;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureCoreStyles();
  }, []);

  const html = useMemo(() => {
    try {
      return process(source, selectValues, { includes: calcpadIncludes });
    } catch (err) {
      const msg = (err as Error).message;
      return `<div class="ifc-calc"><p class="calc-text" style="color:#dc2626;">Render error: ${msg}</p></div>`;
    }
  }, [source, selectValues]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const selects = root.querySelectorAll<HTMLSelectElement>(".calc-select-input");
    const selectHandlers: Array<[HTMLSelectElement, () => void]> = [];

    for (const sel of selects) {
      const varName = sel.dataset.var;
      if (!varName) continue;
      const stored = selectValues[varName];
      if (stored !== undefined) sel.value = String(stored);
      const handler = () => {
        if (varName) setSelectValue(varName, sel.value);
      };
      sel.addEventListener("change", handler);
      selectHandlers.push([sel, handler]);
    }

    // CalcPAD `?` input prompts — same selectValues store, different DOM
    const prompts = root.querySelectorAll<HTMLInputElement>(".calc-input-value");
    const promptHandlers: Array<[HTMLInputElement, () => void]> = [];

    for (const inp of prompts) {
      const varName = inp.dataset.prompt;
      if (!varName) continue;
      const stored = selectValues[varName];
      if (stored !== undefined) inp.value = String(stored);
      const handler = () => {
        if (varName) setSelectValue(varName, inp.value);
      };
      inp.addEventListener("input", handler);
      promptHandlers.push([inp, handler]);
    }

    return () => {
      for (const [sel, handler] of selectHandlers) {
        sel.removeEventListener("change", handler);
      }
      for (const [inp, handler] of promptHandlers) {
        inp.removeEventListener("input", handler);
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
