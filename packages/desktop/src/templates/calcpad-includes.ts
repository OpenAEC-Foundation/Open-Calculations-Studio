/**
 * CalcPAD #include resolution table. Files referenced via `#include name.cpd`
 * in a calc source are looked up here and inlined at parse time.
 *
 * Add new entries by importing the raw file content via Vite's `?raw` suffix.
 */

import svgDrawing from "./calcpad-samples/svg_drawing.cpd?raw";
import funderingDetail from "./calcpad-samples/fundering-detail.svg?raw";

export const calcpadIncludes: ReadonlyMap<string, string> = new Map([
  // CalcPAD library — drawing macros
  ["svg_drawing.cpd", svgDrawing],
  // External SVG drawings inlined via @img(<file>.svg)
  ["fundering-detail.svg", funderingDetail],
]);
