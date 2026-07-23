import { describe, expect, it } from "vitest";
import {
  VIBRO_TYPES_SCHEMA_VERSION,
  type CptCalibration,
  type DigitizedCptPoint,
  type VibroPileInput,
} from "./types";

describe("VIBRO gegevensmodellen", () => {
  it("exporteert de schema-versie tijdens runtime", () => {
    expect(VIBRO_TYPES_SCHEMA_VERSION).toBe(1);
  });

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

  it("digitaliseerpunt blijft volledig JSON-serialiseerbaar", () => {
    const value: DigitizedCptPoint = {
      depthNapM: -18.5,
      qcMpa: 10.3,
      confidence: 0.98,
    };

    expect(JSON.parse(JSON.stringify(value))).toEqual(value);
  });

  it("paalinvoer blijft volledig JSON-serialiseerbaar", () => {
    const value: VibroPileInput = {
      shaftDiameterMm: 323,
      baseDiameterMm: 365,
      pileHeadNapM: -0.9,
      pileTipNapM: -18.5,
      positiveShaftStartNapM: -14.25,
      alphaP: 0.7,
      alphaS: 0.01,
      beta: 1,
      shapeFactor: 1,
      xiSingleCpt: 1.3,
      gammaB: 1.2,
      gammaS: 1.2,
      designLoadKn: 850,
      negativeSkinLayers: [
        {
          topNapM: -0.9,
          bottomNapM: -14.25,
          effectiveStressTopKpa: 10,
          effectiveStressBottomKpa: 120,
          k0: 0.5,
          tanDelta: 0.36,
          gamma: 1.1,
        },
      ],
    };

    expect(JSON.parse(JSON.stringify(value))).toEqual(value);
  });
});
