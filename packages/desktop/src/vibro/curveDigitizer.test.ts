import { describe, expect, it } from "vitest";
import type { CptCalibration } from "./types";
import { digitizeQcCurve, type ImageDataLike } from "./curveDigitizer";

const WIDTH = 241;
const HEIGHT = 160;

const calibration: CptCalibration = {
  pageIndex: 0,
  plotBoundsPx: { left: 20, top: 0, right: 220, bottom: HEIGHT - 1 },
  qcMinMpa: 0,
  qcMaxMpa: 20,
  depthTopNapM: 0,
  depthBottomNapM: -3.18,
};

function createCurveImage(gapRows: ReadonlySet<number> = new Set()): ImageDataLike {
  const image = createWhiteImage();
  const { data } = image;

  for (const x of [20, 70, 120, 170, 220]) {
    for (let y = 0; y < HEIGHT; y += 1) {
      setGray(data, x, y, 170);
    }
  }
  for (let y = 0; y < HEIGHT; y += 1) {
    setGray(data, 110, y, 0);
  }

  for (let y = 0; y < HEIGHT; y += 1) {
    if (gapRows.has(y)) {
      continue;
    }

    const qcMpa = 4 + (8 * y) / (HEIGHT - 1);
    const x = Math.round(
      calibration.plotBoundsPx.left
        + (qcMpa / calibration.qcMaxMpa)
          * (calibration.plotBoundsPx.right - calibration.plotBoundsPx.left),
    );
    setGray(data, x - 1, y, 25);
    setGray(data, x, y, 10);
    setGray(data, x + 1, y, 25);
  }

  return image;
}

function createWhiteImage(): ImageDataLike {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);

  for (let pixel = 0; pixel < WIDTH * HEIGHT; pixel += 1) {
    const offset = pixel * 4;
    data[offset] = 255;
    data[offset + 1] = 255;
    data[offset + 2] = 255;
    data[offset + 3] = 255;
  }

  return { width: WIDTH, height: HEIGHT, data };
}

function setGray(data: Uint8ClampedArray, x: number, y: number, value: number): void {
  const offset = (y * WIDTH + x) * 4;
  data[offset] = value;
  data[offset + 1] = value;
  data[offset + 2] = value;
  data[offset + 3] = 255;
}

function drawThreePixelStroke(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  value = 10,
): void {
  setGray(data, x - 1, y, value + 15);
  setGray(data, x, y, value);
  setGray(data, x + 1, y, value + 15);
}

describe("digitizeQcCurve", () => {
  it("volgt een donkere doorlopende curve door een grijs raster", () => {
    const result = digitizeQcCurve(createCurveImage(), calibration);

    expect(result.points.length).toBeGreaterThan(100);
    expect(result.coverage).toBeGreaterThan(0.95);
    expect(result.points[0]?.qcMpa).toBeCloseTo(4, 0);
    expect(result.points[result.points.length - 1]?.qcMpa).toBeCloseTo(12, 0);
  });

  it("interpoleert een onderbreking van drie pixels met lagere zekerheid", () => {
    const result = digitizeQcCurve(createCurveImage(new Set([78, 79, 80])), calibration);
    const interpolatedPoints = result.points.filter(
      (point) => point.depthNapM <= -1.56 && point.depthNapM >= -1.6,
    );

    expect(result.coverage).toBeCloseTo(157 / 160, 8);
    expect(interpolatedPoints.length).toBeGreaterThan(0);
    expect(interpolatedPoints.every(
      (point) => point.confidence > 0 && point.confidence <= 0.5,
    )).toBe(true);
    expect(result.uncertainDepthRanges).toHaveLength(1);
    expect(result.uncertainDepthRanges[0]?.topNapM).toBeCloseTo(-1.56, 8);
    expect(result.uncertainDepthRanges[0]?.bottomNapM).toBeCloseTo(-1.6, 8);
    expect(result.warnings).toHaveLength(1);
  });

  it("retourneert nul dekking voor een leeg beeld", () => {
    const result = digitizeQcCurve(createWhiteImage(), calibration);

    expect(result.coverage).toBe(0);
    expect(result.points).toEqual([]);
  });

  it("waarschuwt met het dieptebereik van een ontbrekend middengebied", () => {
    const missingRows = new Set(
      Array.from({ length: 31 }, (_, index) => index + 60),
    );
    const result = digitizeQcCurve(createCurveImage(missingRows), calibration);

    expect(result.coverage).toBeLessThan(0.9);
    expect(result.uncertainDepthRanges).toHaveLength(1);
    expect(result.uncertainDepthRanges[0]?.topNapM).toBeCloseTo(-1.2, 8);
    expect(result.uncertainDepthRanges[0]?.bottomNapM).toBeCloseTo(-1.8, 8);
    expect(result.warnings.some(
      (warning) => warning.includes("-1.20") && warning.includes("-1.80"),
    )).toBe(true);
  });

  it("verkiest een lange curve boven een tijdelijke donkere tekstlokker", () => {
    const image = createCurveImage();
    for (let y = 0; y <= 20; y += 1) {
      drawThreePixelStroke(image.data, 30, y, 0);
    }

    const result = digitizeQcCurve(image, calibration);

    expect(result.coverage).toBeGreaterThan(0.95);
    expect(result.points[0]?.qcMpa).toBeCloseTo(4, 0);
    expect(result.points[result.points.length - 1]?.qcMpa).toBeCloseTo(12, 0);
  });

  it("verkiest een lichtere vloeiende route boven een donkerdere springende route", () => {
    const image = createWhiteImage();
    for (let y = 0; y < HEIGHT; y += 1) {
      drawThreePixelStroke(image.data, 70, y, 30);
      drawThreePixelStroke(image.data, y % 2 === 0 ? 90 : 110, y, 0);
    }

    const result = digitizeQcCurve(image, calibration);

    expect(result.coverage).toBe(1);
    expect(result.points.every((point) => Math.abs(point.qcMpa - 5) < 0.2)).toBe(true);
  });

  it("vindt de curve opnieuw na een lang gat en een sprong groter dan maxJumpPx", () => {
    const image = createWhiteImage();
    for (let y = 0; y < 60; y += 1) {
      drawThreePixelStroke(image.data, 60, y);
    }
    for (let y = 90; y < HEIGHT; y += 1) {
      drawThreePixelStroke(image.data, 160, y);
    }

    const result = digitizeQcCurve(image, calibration);

    expect(result.coverage).toBeCloseTo(130 / 160, 8);
    expect(result.points[0]?.qcMpa).toBeCloseTo(4, 8);
    expect(result.points[result.points.length - 1]?.qcMpa).toBeCloseTo(14, 8);
  });

  it("behoudt een vrijwel verticale curve naast een dunne rasterkolom", () => {
    const image = createWhiteImage();
    for (let y = 0; y < HEIGHT; y += 1) {
      drawThreePixelStroke(image.data, 70, y);
      setGray(image.data, 110, y, 0);
    }

    const result = digitizeQcCurve(image, calibration);

    expect(result.coverage).toBe(1);
    expect(result.points.length).toBeGreaterThan(100);
    expect(result.points.every((point) => Math.abs(point.qcMpa - 5) < 0.2)).toBe(true);
  });

  it("behoudt een legitieme bijna-verticale een-pixelcurve met variatie", () => {
    const image = createWhiteImage();
    for (let y = 0; y < HEIGHT; y += 1) {
      setGray(image.data, y < HEIGHT / 2 ? 70 : 71, y, 10);
    }

    const result = digitizeQcCurve(image, calibration);

    expect(result.coverage).toBe(1);
    expect(result.warnings).toEqual([]);
    expect(result.points.every((point) => Math.abs(point.qcMpa - 5.05) < 0.1)).toBe(true);
  });

  it("markeert een beeld met alleen een persistente dunne lijn als onzeker", () => {
    const image = createWhiteImage();
    for (let y = 0; y < HEIGHT; y += 1) {
      setGray(image.data, 70, y, 10);
    }

    const result = digitizeQcCurve(image, calibration);

    expect(result.coverage).toBe(0);
    expect(result.points).toEqual([]);
    expect(result.uncertainDepthRanges).toEqual([
      { topNapM: 0, bottomNapM: -3.18 },
    ]);
    expect(result.warnings.some((warning) => warning.includes("niet betrouwbaar")))
      .toBe(true);
  });

  it("geeft zwakke directe kandidaten minder confidence dan donkere kandidaten", () => {
    const darkImage = createWhiteImage();
    const weakImage = createWhiteImage();
    for (let y = 0; y < HEIGHT; y += 1) {
      drawThreePixelStroke(darkImage.data, 70, y, 10);
      drawThreePixelStroke(weakImage.data, 70, y, 110);
    }

    const darkResult = digitizeQcCurve(darkImage, calibration);
    const weakResult = digitizeQcCurve(weakImage, calibration);
    const darkConfidence = averageConfidence(darkResult.points);
    const weakConfidence = averageConfidence(weakResult.points);

    expect(weakConfidence).toBeLessThan(darkConfidence - 0.2);
    expect(darkResult.points.every((point) => point.confidence < 1)).toBe(true);
  });

  it("verlaagt confidence op een rij met een gelijkwaardige kandidaat", () => {
    const image = createWhiteImage();
    for (let y = 0; y < HEIGHT; y += 1) {
      drawThreePixelStroke(image.data, 70, y);
    }
    drawThreePixelStroke(image.data, 85, 80);

    const result = digitizeQcCurve(image, calibration);
    const ambiguous = closestPoint(result.points, -1.6);
    const preceding = closestPoint(result.points, -1.58);

    expect(ambiguous.confidence).toBeLessThan(preceding.confidence - 0.1);
  });

  it.each([
    ["links", { left: -1 }],
    ["boven", { top: -1 }],
    ["rechts", { right: WIDTH }],
    ["onder", { bottom: HEIGHT }],
  ])("weigert een plotgrens buiten het beeld aan de %s-rand", (_edge, change) => {
    const invalidCalibration: CptCalibration = {
      ...calibration,
      plotBoundsPx: { ...calibration.plotBoundsPx, ...change },
    };

    expect(() => digitizeQcCurve(createWhiteImage(), invalidCalibration))
      .toThrowError(new RangeError("plotBoundsPx moet volledig binnen het beeld vallen"));
  });

  it("extrapoleert niet over ontbrekende rijen aan begin en einde", () => {
    const edgeGaps = new Set([0, 1, 2, 157, 158, 159]);
    const result = digitizeQcCurve(createCurveImage(edgeGaps), calibration);

    expect(result.coverage).toBeCloseTo(154 / 160, 8);
    expect(result.points[0]?.depthNapM).toBeCloseTo(-0.06, 8);
    expect(result.points[result.points.length - 1]?.depthNapM).toBeCloseTo(-3.12, 8);
    expect(result.uncertainDepthRanges).toHaveLength(2);
  });
});

function averageConfidence(points: ReadonlyArray<{ confidence: number }>): number {
  return points.reduce((sum, point) => sum + point.confidence, 0) / points.length;
}

function closestPoint<T extends { depthNapM: number }>(
  points: readonly T[],
  targetDepthNapM: number,
): T {
  const point = points.reduce<T | undefined>(
    (closest, candidate) =>
      closest === undefined
      || Math.abs(candidate.depthNapM - targetDepthNapM)
        < Math.abs(closest.depthNapM - targetDepthNapM)
        ? candidate
        : closest,
    undefined,
  );
  if (point === undefined) {
    throw new Error("Geen gedigitaliseerd punt gevonden");
  }
  return point;
}
