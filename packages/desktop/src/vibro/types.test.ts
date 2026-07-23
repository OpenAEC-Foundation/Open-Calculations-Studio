import { describe, expect, it } from "vitest";
import type { CptCalibration } from "./types";

describe("CptCalibration", () => {
  it("blijft volledig JSON-serialiseerbaar", () => {
    const value: CptCalibration = {
      pageIndex: 0,
      plotBoundsPx: { left: 100, top: 50, right: 900, bottom: 1450 },
      qcMinMpa: 0,
      qcMaxMpa: 20,
      depthTopNapM: 0,
      depthBottomNapM: -37,
    };

    expect(JSON.parse(JSON.stringify(value))).toEqual(value);
  });
});
