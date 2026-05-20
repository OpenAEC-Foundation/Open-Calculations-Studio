/**
 * CalcPAD #include resolution table. Files referenced via `#include name.cpd`
 * in a calc source are looked up here and inlined at parse time.
 *
 * Add new entries by importing the raw file content via Vite's `?raw` suffix.
 */

import svgDrawing from "./calcpad-samples/svg_drawing.cpd?raw";
import funderingDetail from "./calcpad-samples/fundering-detail.svg?raw";
import picture0 from "./calcpad-samples/Images/Picture0.png?url";
import picture1 from "./calcpad-samples/Images/Picture1.png?url";
import picture2 from "./calcpad-samples/Images/Picture2.png?url";
import picture3 from "./calcpad-samples/Images/Picture3.png?url";
import picture4 from "./calcpad-samples/Images/Picture4.png?url";
import picture5 from "./calcpad-samples/Images/Picture5.png?url";

export const calcpadIncludes: ReadonlyMap<string, string> = new Map([
  // CalcPAD library — drawing macros
  ["svg_drawing.cpd", svgDrawing],
  // External SVG drawings inlined via @img(<file>.svg)
  ["fundering-detail.svg", funderingDetail],
]);

/**
 * Raster images referenced inline via `<img src="./Images/Picture0.png">`.
 * Looked up by basename (case-insensitive) at parse time.
 */
export const calcpadImageUrls: ReadonlyMap<string, string> = new Map([
  ["Picture0.png", picture0],
  ["Picture1.png", picture1],
  ["Picture2.png", picture2],
  ["Picture3.png", picture3],
  ["Picture4.png", picture4],
  ["Picture5.png", picture5],
]);
