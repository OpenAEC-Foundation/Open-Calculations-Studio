/**
 * Real CalcPAD `.cpd` samples downloaded from upstream repos:
 *   - alphacheng/Calcpad   (Examples/Mathematics + Mechanics)
 *   - imartincei/CalcpadLibrary
 *
 * Imported via Vite's `?raw` so contents are baked into the bundle at build time.
 */

import quadratic from "./calcpad-samples/Quadratic Equation.cpd?raw";
import cubic from "./calcpad-samples/Cubic Equation.cpd?raw";
import lissajous from "./calcpad-samples/Lissajous Curve.cpd?raw";
import rectangleArea from "./calcpad-samples/Rectangle Area.cpd?raw";
import circleArea from "./calcpad-samples/Circle Area.cpd?raw";
import sphereVolume from "./calcpad-samples/Sphere Volume.cpd?raw";
import roseCurve from "./calcpad-samples/Rose Curve.cpd?raw";
import hexagonSection from "./calcpad-samples/Hexagon Section.cpd?raw";
import ssbForce from "./calcpad-samples/SSB Concentrated Force.cpd?raw";
import deepBeam from "./calcpad-samples/Deep Beam.cpd?raw";
import intertekUnits from "./calcpad-samples/2259-Intertek-units.cpd?raw";
import funderingMetSvg from "./calcpad-samples/fundering-met-svg.cpd?raw";

export const calcpadSamples = {
  "cpd-quadratic": quadratic,
  "cpd-cubic": cubic,
  "cpd-lissajous": lissajous,
  "cpd-rectangle": rectangleArea,
  "cpd-circle": circleArea,
  "cpd-sphere": sphereVolume,
  "cpd-rose": roseCurve,
  "cpd-hexagon": hexagonSection,
  "cpd-ssb-force": ssbForce,
  "cpd-deep-beam": deepBeam,
  "cpd-2259-intertek": intertekUnits,
  "cpd-fundering-met-svg": funderingMetSvg,
} as const;
