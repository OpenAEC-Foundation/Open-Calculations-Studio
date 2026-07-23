import { describe, expect, it } from "vitest";
import type { DigitizedCptPoint, VibroPileInput } from "./types";
import { vibroReferenceInput } from "./referenceCase";
import {
  calculateNegativeSkinFriction,
  calculatePileResistance,
  calculateQcAverages,
  validateCoverage,
} from "./geotechnical";

function point(depthNapM: number, qcMpa: number): DigitizedCptPoint {
  return { depthNapM, qcMpa, confidence: 1 };
}

function withInput(changes: Partial<VibroPileInput> = {}): VibroPileInput {
  return {
    ...vibroReferenceInput,
    designLoadKn: 500,
    ...changes,
  };
}

describe("calculateQcAverages", () => {
  it("integreert een constante curve over alle vereiste trajecten", () => {
    const points = [
      point(-20, 10),
      point(-18.5, 10),
      point(-17, 10),
      point(-14, 10),
    ];

    const qc = calculateQcAverages(points, withInput());

    expect(qc.qcIAvgMpa).toBeCloseTo(10, 8);
    expect(qc.qcIIAvgMpa).toBeCloseTo(10, 8);
    expect(qc.qcIIIAvgMpa).toBeCloseTo(10, 8);
    expect(qc.qcShaftAvgMpa).toBeCloseTo(10, 8);
  });

  it("interpoleert exacte trajectgrenzen en gebruikt de continue minimumroute", () => {
    const input = withInput();
    const qcAt = (depthNapM: number) =>
      10 + 2 * (depthNapM - input.pileTipNapM);
    const points = [-20.2, -19.1, -18.1, -16.2, -14].map(
      (depthNapM) => point(depthNapM, qcAt(depthNapM)),
    );

    const qc = calculateQcAverages(points, input);
    const diameterM = input.baseDiameterMm / 1000;
    const simpleAverageBelowTip = 10 - 4 * diameterM;

    expect(qc.qcIAvgMpa).toBeCloseTo(simpleAverageBelowTip, 8);
    expect(qc.qcIIAvgMpa).toBeCloseTo(10 - 8 * diameterM, 8);
    expect(qc.qcIIAvgMpa).toBeLessThan(simpleAverageBelowTip);
    expect(qc.qcIIIAvgMpa).toBeCloseTo(10 - 8 * diameterM, 8);
    expect(qc.qcShaftAvgMpa).toBeCloseTo(14.25, 8);
  });

  it("weigert een curve die niet alle rekentrajecten dekt", () => {
    const points = [point(-19.9, 10), point(-14.3, 10)];

    expect(validateCoverage(points, withInput())).toEqual(
      expect.arrayContaining([
        expect.stringContaining("onderzijde"),
        expect.stringContaining("bovenzijde"),
      ]),
    );
    expect(() => calculateQcAverages(points, withInput()))
      .toThrowError(/onvoldoende dekking/i);
  });
});

describe("calculateNegativeSkinFriction", () => {
  it("integreert effectieve spanning per laag met de trapeziumregel", () => {
    const input = withInput({
      pileHeadNapM: 0,
      positiveShaftStartNapM: -10,
      negativeSkinLayers: [
        {
          topNapM: 0,
          bottomNapM: -4,
          effectiveStressTopKpa: 0,
          effectiveStressBottomKpa: 40,
          k0: 0.5,
          tanDelta: 0.4,
          gamma: 1.1,
        },
        {
          topNapM: -4,
          bottomNapM: -10,
          effectiveStressTopKpa: 40,
          effectiveStressBottomKpa: 100,
          k0: 0.5,
          tanDelta: 0.4,
          gamma: 1.1,
        },
      ],
    });
    const perimeterM = Math.PI * input.shaftDiameterMm / 1000;
    const expectedCharacteristicKn =
      perimeterM * 0.5 * 0.4 * ((0 + 40) / 2 * 4 + (40 + 100) / 2 * 6);

    const result = calculateNegativeSkinFriction(input);

    expect(result.layers).toHaveLength(2);
    expect(result.negativeSkinCharacteristicKn)
      .toBeCloseTo(expectedCharacteristicKn, 8);
    expect(result.negativeSkinDesignKn)
      .toBeCloseTo(expectedCharacteristicKn * 1.1, 8);
  });

  it.each([
    ["een gat", -4.1],
    ["overlap", -3.9],
  ])("weigert %s tussen negatieve-kleeflagen", (_label, secondTopNapM) => {
    const input = withInput({
      pileHeadNapM: 0,
      positiveShaftStartNapM: -10,
      negativeSkinLayers: [
        {
          topNapM: 0,
          bottomNapM: -4,
          effectiveStressTopKpa: 0,
          effectiveStressBottomKpa: 40,
          k0: 0.5,
          tanDelta: 0.4,
          gamma: 1,
        },
        {
          topNapM: secondTopNapM,
          bottomNapM: -10,
          effectiveStressTopKpa: 40,
          effectiveStressBottomKpa: 100,
          k0: 0.5,
          tanDelta: 0.4,
          gamma: 1,
        },
      ],
    });

    expect(() => calculateNegativeSkinFriction(input))
      .toThrowError(/gat|overlap/);
  });
});

describe("calculatePileResistance", () => {
  it("berekent punt-, schacht- en netto ontwerpweerstand zichtbaar", () => {
    const input = withInput({
      pileHeadNapM: 0,
      positiveShaftStartNapM: -10,
      negativeSkinLayers: [
        {
          topNapM: 0,
          bottomNapM: -10,
          effectiveStressTopKpa: 0,
          effectiveStressBottomKpa: 100,
          k0: 0.5,
          tanDelta: 0.4,
          gamma: 1.1,
        },
      ],
    });
    const points = [point(-20, 10), point(-18.5, 10), point(-10, 10)];

    const result = calculatePileResistance(points, input);
    const baseAreaM2 = Math.PI * (input.baseDiameterMm / 1000) ** 2 / 4;
    const shaftCircumferenceM = Math.PI * input.shaftDiameterMm / 1000;
    const qbMaxMpa =
      0.5 * input.alphaP * input.beta * input.shapeFactor * (10 + 10);
    const rbCalKn = baseAreaM2 * qbMaxMpa * 1000;
    const rsCalKn =
      shaftCircumferenceM * 8.5 * input.alphaS * 10 * 1000;

    expect(result.qbMaxMpa).toBeCloseTo(qbMaxMpa, 8);
    expect(result.rbCalKn).toBeCloseTo(rbCalKn, 8);
    expect(result.rsCalKn).toBeCloseTo(rsCalKn, 8);
    expect(result.rcCalKn).toBeCloseTo(rbCalKn + rsCalKn, 8);
    expect(result.rcCharacteristicKn)
      .toBeCloseTo((rbCalKn + rsCalKn) / input.xiSingleCpt, 8);
    expect(result.rcDesignKn).toBeCloseTo(
      rbCalKn / input.xiSingleCpt / input.gammaB
        + rsCalKn / input.xiSingleCpt / input.gammaS,
      8,
    );
    expect(result.rcNetDesignKn)
      .toBeCloseTo(result.rcDesignKn - result.negativeSkinDesignKn, 8);
    expect(result.unityCheck)
      .toBeCloseTo(input.designLoadKn / result.rcNetDesignKn, 8);
  });
});
