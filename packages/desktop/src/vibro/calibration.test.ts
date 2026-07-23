import { describe, expect, it } from "vitest";

import {
  depthNapToPixel,
  pixelToDepthNap,
  pixelToQc,
  qcToPixel,
  validateCalibration,
} from "./calibration";
import type { CptCalibration } from "./types";

const calibration: CptCalibration = {
  pageIndex: 0,
  plotBoundsPx: { left: 0, top: 250, right: 1000, bottom: 1250 },
  qcMinMpa: 0,
  qcMaxMpa: 20,
  depthTopNapM: -10,
  depthBottomNapM: -27,
};

describe("CPT-diagramkalibratie", () => {
  it("vertaalt pixelcoordinaten lineair naar qc en NAP", () => {
    expect(pixelToQc(500, calibration)).toBeCloseTo(10, 8);
    expect(pixelToDepthNap(750, calibration)).toBeCloseTo(-18.5, 8);
  });

  it("vertaalt qc en NAP lineair terug naar pixelcoordinaten", () => {
    expect(qcToPixel(10, calibration)).toBeCloseTo(500, 8);
    expect(depthNapToPixel(-18.5, calibration)).toBeCloseTo(750, 8);
  });

  it("meldt ongeldige kalibratieparameters", () => {
    expect(validateCalibration({ ...calibration, qcMaxMpa: 0 }))
      .toContain("qcMaxMpa moet groter zijn dan qcMinMpa");
    expect(validateCalibration({
      ...calibration,
      plotBoundsPx: { ...calibration.plotBoundsPx, right: 0 },
      depthBottomNapM: -10,
    })).toEqual(expect.arrayContaining([
      "plotBoundsPx moet een positieve breedte hebben",
      "depthTopNapM en depthBottomNapM moeten verschillen",
    ]));
  });

  it("meldt niet-eindige kalibratiewaarden", () => {
    expect(validateCalibration({ ...calibration, pageIndex: Number.NaN }))
      .toContain("pageIndex moet een eindig getal zijn");
    expect(validateCalibration({ ...calibration, qcMinMpa: Number.POSITIVE_INFINITY }))
      .toContain("qcMinMpa en qcMaxMpa moeten eindige waarden zijn");
  });
});
