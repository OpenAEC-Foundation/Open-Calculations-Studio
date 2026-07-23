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
    const interpolatedPoints = result.points.filter((point) => point.confidence < 1);

    expect(result.coverage).toBeGreaterThan(0.95);
    expect(interpolatedPoints.length).toBeGreaterThan(0);
    expect(interpolatedPoints.every((point) => point.confidence > 0)).toBe(true);
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
});
