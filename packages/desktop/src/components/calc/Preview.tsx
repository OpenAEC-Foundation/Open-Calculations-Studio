import { useEffect, useRef, useMemo, useState } from "react";
import { process, parse, extractScope, defaultStyles } from "@ifc-calc/core";
import { useDocumentStore } from "../../store/documentStore";
import { useLoadCaseStore } from "../../store/loadCaseStore";
import { useZoom } from "../../hooks/useZoom";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useProjectStore } from "../../store/projectStore";
import { calcpadIncludes, calcpadImageUrls } from "../../templates/calcpad-includes";
import HelpPanel from "./HelpPanel";
import WindAreaMap from "./WindAreaMap";
import { WizardHost } from "../wizards";
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
  // Debounce the source so re-render fires only after the user pauses typing
  // for ~250 ms — keeps the editor snappy on long sheets.
  const debouncedSource = useDebouncedValue(source, 250);
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

  // Globals from the projectMetadata sheet — every other sheet inherits
  // CC_klasse, K_FI, WindGebied, Terrein, sneeuw, etc. as part of its
  // initial scope. The metadata sheet is detected by its source content
  // (`@select WindGebied`) zodat library-vervangingen niet langer als
  // metadata-sheet worden gezien.
  const projectMetadataSource = useProjectStore((s) => {
    const meta = s.sheets.find((sh) => /@select\s+WindGebied\b/.test(sh.source));
    return meta?.source ?? null;
  });
  const isMetadataSheetSource = projectMetadataSource !== null && debouncedSource === projectMetadataSource;
  const initialScope = useMemo(() => {
    if (!projectMetadataSource || isMetadataSheetSource) return undefined;
    try {
      const ast = parse(projectMetadataSource, { includes: calcpadIncludes, imageUrls: calcpadImageUrls });
      return extractScope(ast, selectValues);
    } catch {
      return undefined;
    }
  }, [projectMetadataSource, isMetadataSheetSource, selectValues]);

  const html = useMemo(() => {
    try {
      return process(debouncedSource, selectValues, {
        includes: calcpadIncludes,
        imageUrls: calcpadImageUrls,
        initialScope,
      });
    } catch (err) {
      const msg = (err as Error).message;
      return `<div class="ifc-calc"><p class="calc-text" style="color:#dc2626;">Render error: ${msg}</p></div>`;
    }
  }, [debouncedSource, selectValues, initialScope]);

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

  const { ref: zoomRef, zoom } = useZoom();
  const isEmpty = debouncedSource.trim().length === 0;

  // Wizard-mode: actieve sheet kan een wizard zijn — dan toont de preview
  // de wizard-component i.p.v. de CalcPAD-render.
  const activeSheet = useProjectStore((s) =>
    s.sheets.find((sh) => sh.id === s.activeSheetId),
  );
  const wizardId =
    activeSheet?.type === "wizard" ? activeSheet.wizardId : undefined;

  // De windgebied-kaart is exclusief gekoppeld aan de project-metadata
  // sheet. We detecteren dit op SOURCE-niveau (`@select WindGebied`-marker)
  // ipv via templateId zodat hij ook verdwijnt wanneer de gebruiker een
  // library-template over de actieve sheet heen laadt.
  const isProjectMetadata = /@select\s+WindGebied\b/.test(debouncedSource);
  const [mapVisible, setMapVisible] = useState(true);

  return (
    <div
      className="calc-preview"
      ref={zoomRef}
      style={{ fontSize: `${zoom * 100}%` }}
    >
      {wizardId ? (
        <div className="calc-preview-content calc-preview-wizard">
          <WizardHost wizardId={wizardId} />
        </div>
      ) : isEmpty ? (
        <HelpPanel />
      ) : (
        <div
          ref={containerRef}
          className="calc-preview-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
      {!wizardId && !isEmpty && isProjectMetadata && (
        <div className="calc-preview-extras">
          <div className="wind-map-header">
            <h3 style={{ margin: 0, color: "var(--theme-accent)" }}>Windgebied — kaart</h3>
            <button
              type="button"
              className="wind-map-toggle"
              onClick={() => setMapVisible((v) => !v)}
              title={mapVisible ? "Verberg kaart" : "Toon kaart"}
            >
              {mapVisible ? "− Verberg" : "+ Toon kaart"}
            </button>
          </div>
          {mapVisible && <WindAreaMap />}
        </div>
      )}
    </div>
  );
}
