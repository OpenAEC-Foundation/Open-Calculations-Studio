import { describe, expect, it } from "vitest";
import type { DigitizedCptPoint, VibroPileInput } from "./types";
import { vibroReferenceInput } from "./referenceCase";
import {
  calculateNegativeSkinFriction,
  calculatePileResistance,
  calculateQcAverages,
  calculateShaftQcProfile,
  constructMinimumRoute,
  validateCoverage,
} from "./geotechnical";

function point(
  depthNapM: number,
  qcMpa: number,
  confidence = 1,
): DigitizedCptPoint {
  return { depthNapM, qcMpa, confidence };
}

function sampleCurve(
  bottomNapM: number,
  topNapM: number,
  qcAt: (depthNapM: number) => number,
): DigitizedCptPoint[] {
  const spacingM = 0.05;
  const intervals = Math.ceil((topNapM - bottomNapM) / spacingM);
  return Array.from({ length: intervals + 1 }, (_, index) => {
    const depthNapM = index === intervals
      ? topNapM
      : bottomNapM + index * spacingM;
    return point(depthNapM, qcAt(depthNapM));
  });
}

function withInput(changes: Partial<VibroPileInput> = {}): VibroPileInput {
  const input = {
    ...vibroReferenceInput,
    designLoadKn: 500,
    ...changes,
  };
  if (
    changes.positiveShaftLayers === undefined
    && (
      changes.pileTipNapM !== undefined
      || changes.positiveShaftStartNapM !== undefined
    )
  ) {
    input.positiveShaftLayers = [{
      bottomNapM: input.pileTipNapM,
      topNapM: input.positiveShaftStartNapM,
    }];
  }
  return input;
}

describe("calculateQcAverages", () => {
  it("integreert een constante curve over alle vereiste trajecten", () => {
    const points = sampleCurve(-20, -14, () => 10);

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
    const points = sampleCurve(-20.2, -14, qcAt);

    const qc = calculateQcAverages(points, input);
    const diameterM = input.baseDiameterMm / 1000;
    const simpleAverageBelowTip = 10 - 4 * diameterM;

    expect(qc.qcIAvgMpa).toBeCloseTo(simpleAverageBelowTip, 8);
    expect(qc.qcIIAvgMpa).toBeCloseTo(10 - 8 * diameterM, 8);
    expect(qc.qcIIAvgMpa).toBeLessThan(simpleAverageBelowTip);
    expect(qc.qcIIIAvgMpa).toBeCloseTo(10 - 8 * diameterM, 8);
    expect(qc.qcShaftAvgMpa).toBeCloseTo(10, 8);
    expect(qc.qcShaftLayers[0]?.cutoffMpa).toBeCloseTo(10, 8);
    expect(qc.criticalDepthM).toBeCloseTo(4 * diameterM, 8);
    expect(qc.qcIBottomNapM)
      .toBeCloseTo(input.pileTipNapM - 4 * diameterM, 8);
    expect(qc.qcIIRoute[0]?.depthNapM).toBeCloseTo(qc.qcIBottomNapM, 8);
    expect(qc.qcIIRoute[qc.qcIIRoute.length - 1]?.depthNapM)
      .toBeCloseTo(input.pileTipNapM, 8);
    expect(qc.qcIIRoute.every(
      (routePoint, index) =>
        index === 0
        || routePoint.qcMpa <= qc.qcIIRoute[index - 1]!.qcMpa + 1e-12,
    )).toBe(true);
  });

  it("weigert een curve die niet alle rekentrajecten dekt", () => {
    const points = [point(-19.9, 10), point(-15.7, 10)];

    expect(validateCoverage(points, withInput())).toEqual(
      expect.arrayContaining([
        expect.stringContaining("onderzijde"),
        expect.stringContaining("bovenzijde"),
      ]),
    );
    expect(() => calculateQcAverages(points, withInput()))
      .toThrowError(/onvoldoende dekking/i);
  });

  it("weigert een intern gat groter dan het expliciete interpolatie-interval", () => {
    const points = sampleCurve(-20, -14, () => 10).filter(
      ({ depthNapM }) => depthNapM < -17.2 || depthNapM > -16.9,
    );

    expect(validateCoverage(points, withInput())).toEqual(
      expect.arrayContaining([expect.stringContaining("intern gat")]),
    );
    expect(() => calculateQcAverages(points, withInput()))
      .toThrowError(/intern gat/);
  });

  it.each([
    ["qc-I/II", -19.5],
    ["qc-III", -17],
    ["positieve schacht", -17.5],
  ])("weigert confidence nul binnen het %s-traject", (_label, targetNapM) => {
    const points = sampleCurve(-20, -14, () => 10).map((curvePoint) =>
      Math.abs(curvePoint.depthNapM - targetNapM) < 1e-8
        ? { ...curvePoint, confidence: 0 }
        : curvePoint
    );

    expect(validateCoverage(points, withInput())).toEqual(
      expect.arrayContaining([expect.stringContaining("onbetrouwbaar")]),
    );
    expect(() => calculateQcAverages(points, withInput()))
      .toThrowError(/onbetrouwbaar/);
  });
});

describe("constructMinimumRoute", () => {
  it("maakt daling, interne kruising en herstel afzonderlijk observeerbaar", () => {
    const result = constructMinimumRoute([
      point(-2, 8),
      point(-1.5, 12),
      point(-1, 6),
      point(-0.5, 10),
      point(0, 4),
    ]);

    const expectedRoute = [
      [-2, 8],
      [-1.5, 8],
      [-7 / 6, 8],
      [-1, 6],
      [-0.5, 6],
      [-1 / 6, 6],
      [0, 4],
    ];
    expect(result.route).toHaveLength(expectedRoute.length);
    result.route.forEach((routePoint, index) => {
      expect(routePoint.depthNapM).toBeCloseTo(expectedRoute[index]![0]!, 12);
      expect(routePoint.qcMpa).toBeCloseTo(expectedRoute[index]![1]!, 12);
    });
    expect(result.endMinimumMpa).toBe(4);
    expect(result.integralMpaM).toBeCloseTo(41 / 3, 8);
  });
});

describe("calculateShaftQcProfile", () => {
  it("snuit een piek in een laag korter dan 1 m af op 12 MPa", () => {
    const points = sampleCurve(
      -18.5,
      -17.7,
      (depthNapM) =>
        depthNapM >= -18.25 && depthNapM <= -18 ? 20 : 10,
    );

    const result = calculateShaftQcProfile(points, [
      { bottomNapM: -18.5, topNapM: -17.7 },
    ]);

    expect(result.layers[0]?.thicknessM).toBeCloseTo(0.8, 8);
    expect(result.layers[0]?.cutoffMpa).toBe(12);
    expect(Math.max(...result.profile.map(({ qcMpa }) => qcMpa))).toBe(12);
    expect(result.qcShaftAvgMpa).toBeGreaterThan(10);
    expect(result.qcShaftAvgMpa).toBeLessThan(12);
  });

  it("voegt een exact kruispunt toe waar een lineair segment 12 MPa passeert", () => {
    const points = sampleCurve(
      -18.5,
      -17.7,
      (depthNapM) => 10 + 12.5 * (depthNapM + 18.5),
    );

    const result = calculateShaftQcProfile(points, [
      { bottomNapM: -18.5, topNapM: -17.7 },
    ]);

    expect(result.profile.some(
      ({ depthNapM, qcMpa }) =>
        Math.abs(depthNapM - -18.34) < 1e-10
        && qcMpa === 12,
    )).toBe(true);
    expect(result.qcShaftAvgMpa).toBeCloseTo(11.8, 8);
  });

  it("snuit een hoge laag vanaf exact 1 m af op maximaal 15 MPa", () => {
    const points = sampleCurve(-18.5, -17.5, () => 20);

    const result = calculateShaftQcProfile(points, [
      { bottomNapM: -18.5, topNapM: -17.5 },
    ]);

    expect(result.layers[0]?.thicknessM).toBeCloseTo(1, 8);
    expect(result.layers[0]?.rawMinimumMpa).toBe(20);
    expect(result.layers[0]?.cutoffMpa).toBe(15);
    expect(result.qcShaftAvgMpa).toBeCloseTo(15, 8);
  });

  it("gebruikt in een dikke pieklaag de laagste gemeten zone als afsnijwaarde", () => {
    const points = sampleCurve(
      -18.5,
      -16.5,
      (depthNapM) => depthNapM <= -18.25 ? 13 : 20,
    );

    const result = calculateShaftQcProfile(points, [
      { bottomNapM: -18.5, topNapM: -16.5 },
    ]);

    expect(result.layers[0]?.rawMinimumMpa).toBe(13);
    expect(result.layers[0]?.cutoffMpa).toBe(13);
    expect(result.qcShaftAvgMpa).toBeCloseTo(13, 8);
    expect(result.profile.every((profilePoint) => profilePoint.qcMpa <= 13))
      .toBe(true);
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
    const points = sampleCurve(-20, -10, () => 10);

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

  it("begrensd de maximale puntweerstand op 15 MPa en bewaart de ruwe waarde", () => {
    const input = withInput();
    const points = sampleCurve(-20, -14, () => 40);

    const result = calculatePileResistance(points, input);

    expect(result.qbRawMpa).toBeCloseTo(28, 8);
    expect(result.qbMaxMpa).toBe(15);
    expect(result.rbCalKn).toBeCloseTo(
      Math.PI * (input.baseDiameterMm / 1000) ** 2 / 4 * 15 * 1000,
      8,
    );
  });
});
