import { useEffect, useRef, useMemo } from "react";
import { parse, evaluate, render, defaultStyles } from "@ifc-calc/core";
import {
  useActieveBron,
  useActieveWaarden,
  useProjectScope,
  useZetActieveWaarde,
} from "../../store/actiefBlad";
import { useZoom } from "../../hooks/useZoom";
import { calcpadIncludes, calcpadImageUrls } from "../../templates/calcpad-includes";
import HelpPanel from "./HelpPanel";
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
  const source = useActieveBron();
  // Invoerwaarden horen bij het blad dat openstaat, niet bij de app. Twee
  // exemplaren van dezelfde module hebben dus elk hun eigen set.
  const selectValues = useActieveWaarden();
  const setSelectValue = useZetActieveWaarde();
  // De projectgegevens (gevolgklasse, levensduur, ...) staan als variabelen
  // klaar voordat de eerste regel van het blad draait.
  const projectScope = useProjectScope();
  const containerRef = useRef<HTMLDivElement>(null);
  // Het invoerveld waarin getypt wordt, met de cursorpositie. Elke toetsaanslag
  // rekent het blad opnieuw door en vervangt de hele uitwerking, dus ook dit
  // veld; zonder deze administratie verloor het na één teken de focus en kwam
  // de rest van de invoer nergens terecht.
  const typtIn = useRef<{ naam: string; start: number; eind: number } | null>(null);

  useEffect(() => {
    ensureCoreStyles();
  }, []);

  // Invoerwaarden veranderen tijdens het typen, de bladtekst niet. De
  // syntaxisboom hoeft dan niet bij iedere toetsaanslag opnieuw opgebouwd.
  const ast = useMemo(() => {
    try {
      return parse(source, { includes: calcpadIncludes, imageUrls: calcpadImageUrls });
    } catch (err) {
      return err as Error;
    }
  }, [source]);

  const html = useMemo(() => {
    try {
      if (ast instanceof Error) throw ast;
      return render(evaluate(ast, selectValues, projectScope));
    } catch (err) {
      const msg = (err as Error).message;
      return `<div class="ifc-calc"><p class="calc-text" style="color:#dc2626;">Render error: ${msg}</p></div>`;
    }
  }, [ast, selectValues, projectScope]);

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
    const promptHandlers: Array<[HTMLInputElement, () => void, () => void]> = [];

    for (const inp of prompts) {
      const varName = inp.dataset.prompt;
      if (!varName) continue;
      const stored = selectValues[varName];
      if (stored !== undefined) inp.value = String(stored);
      const handler = () => {
        typtIn.current = {
          naam: varName,
          start: inp.selectionStart ?? inp.value.length,
          eind: inp.selectionEnd ?? inp.value.length,
        };
        setSelectValue(varName, inp.value);
      };
      // Pas bij het echt verlaten van het veld de administratie loslaten. De
      // browser stuurt ook een blur als het veld vervangen wordt, en dan hangt
      // het op dat moment nog in de pagina; daarom een tel later kijken. Is het
      // veld dan weg, dan was het een vervanging en blijft de administratie staan.
      const verlaat = () => {
        window.setTimeout(() => {
          if (inp.isConnected && typtIn.current?.naam === varName) typtIn.current = null;
        }, 0);
      };
      inp.addEventListener("input", handler);
      inp.addEventListener("blur", verlaat);
      promptHandlers.push([inp, handler, verlaat]);
    }

    // Het veld waarin werd getypt is door de nieuwe uitwerking vervangen:
    // focus en cursor terug op de plek waar ze stonden.
    const vorig = typtIn.current;
    if (vorig) {
      const opnieuw = [...prompts].find((p) => p.dataset.prompt === vorig.naam);
      if (opnieuw && document.activeElement !== opnieuw) {
        opnieuw.focus({ preventScroll: true });
        const max = opnieuw.value.length;
        opnieuw.setSelectionRange(Math.min(vorig.start, max), Math.min(vorig.eind, max));
      }
    }

    return () => {
      for (const [sel, handler] of selectHandlers) {
        sel.removeEventListener("change", handler);
      }
      for (const [inp, handler, verlaat] of promptHandlers) {
        inp.removeEventListener("input", handler);
        inp.removeEventListener("blur", verlaat);
      }
    };
  }, [html, selectValues, setSelectValue]);

  const { ref: zoomRef, zoom } = useZoom();
  const isEmpty = source.trim().length === 0;

  return (
    <div
      className="calc-preview"
      ref={zoomRef}
      style={{ fontSize: `${zoom * 100}%` }}
    >
      {isEmpty ? (
        <HelpPanel />
      ) : (
        <div
          ref={containerRef}
          className="calc-preview-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}
