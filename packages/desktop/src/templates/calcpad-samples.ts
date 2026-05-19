/**
 * Real CalcPAD `.cpd` samples downloaded from upstream repos:
 *   - alphacheng/Calcpad   (Examples/Mathematics + Structural Design)
 *   - imartincei/CalcpadLibrary
 *
 * Imported via Vite's `?raw` so contents are baked into the bundle at build time.
 */

import quadratic from "./calcpad-samples/Quadratic Equation.cpd?raw";
import cubic from "./calcpad-samples/Cubic Equation.cpd?raw";
import lissajous from "./calcpad-samples/Lissajous Curve.cpd?raw";
import rectangleArea from "./calcpad-samples/Rectangle Area.cpd?raw";

export const calcpadSamples = {
  "cpd-quadratic": quadratic,
  "cpd-cubic": cubic,
  "cpd-lissajous": lissajous,
  "cpd-rectangle": rectangleArea,
} as const;
