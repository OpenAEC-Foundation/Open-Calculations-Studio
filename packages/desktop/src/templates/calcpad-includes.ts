/**
 * CalcPAD #include resolution table. Files referenced via `#include name.cpd`
 * in a calc source are looked up here and inlined at parse time.
 *
 * Add new entries by importing the raw file content via Vite's `?raw` suffix.
 */

import svgDrawing from "./calcpad-samples/svg_drawing.cpd?raw";

export const calcpadIncludes: ReadonlyMap<string, string> = new Map([
  ["svg_drawing.cpd", svgDrawing],
]);
