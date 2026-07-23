import { pixelToDepthNap, pixelToQc } from "./calibration";
import type { CptCalibration, DigitizationResult, DigitizedCptPoint } from "./types";

export interface ImageDataLike {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface DigitizationOptions {
  maxJumpPx?: number;
  maxGapRows?: number;
}

export interface UncertainDepthRange {
  topNapM: number;
  bottomNapM: number;
}

export interface CurveDigitizationResult extends DigitizationResult {
  coverage: number;
  uncertainDepthRanges: UncertainDepthRange[];
}

interface TracedPixel {
  y: number;
  x: number;
  confidence: number;
}

const DARK_LUMINANCE = 128;
const SAMPLE_INTERVAL_M = 0.02;

export function digitizeQcCurve(
  image: ImageDataLike,
  calibration: CptCalibration,
  options: DigitizationOptions = {},
): CurveDigitizationResult {
  const maxJumpPx = options.maxJumpPx ?? 24;
  const maxGapRows = options.maxGapRows ?? 5;
  const bounds = boundedPlot(calibration, image);
  const rowCount = Math.max(0, bounds.bottom - bounds.top + 1);

  if (rowCount === 0) {
    return emptyResult();
  }

  const suppressedColumns = findPersistentDarkColumns(image, bounds);
  const traced: Array<TracedPixel | undefined> = [];
  let previousX: number | undefined;

  for (let y = bounds.top; y <= bounds.bottom; y += 1) {
    const candidate = chooseCandidate(
      image,
      y,
      bounds.left,
      bounds.right,
      suppressedColumns,
      previousX,
      maxJumpPx,
    );

    if (candidate !== undefined) {
      traced.push({ y, x: candidate, confidence: 1 });
      previousX = candidate;
    } else {
      traced.push(undefined);
    }
  }

  interpolateShortGaps(traced, maxGapRows);

  const uncertainDepthRanges = collectUncertainRanges(traced, calibration, bounds.top);
  const coveredRows = traced.filter((point) => point !== undefined).length;

  return {
    points: aggregatePoints(traced, calibration, bounds.top),
    coverage: coveredRows / rowCount,
    warnings: uncertainDepthRanges.map(
      (range) =>
        `Curve ontbreekt tussen NAP ${range.topNapM.toFixed(2)} m en ${range.bottomNapM.toFixed(2)} m`,
    ),
    uncertainDepthRanges,
  };
}

function emptyResult(): CurveDigitizationResult {
  return {
    points: [],
    coverage: 0,
    warnings: [],
    uncertainDepthRanges: [],
  };
}

function boundedPlot(calibration: CptCalibration, image: ImageDataLike) {
  return {
    left: Math.max(0, Math.ceil(calibration.plotBoundsPx.left)),
    top: Math.max(0, Math.ceil(calibration.plotBoundsPx.top)),
    right: Math.min(image.width - 1, Math.floor(calibration.plotBoundsPx.right)),
    bottom: Math.min(image.height - 1, Math.floor(calibration.plotBoundsPx.bottom)),
  };
}

function findPersistentDarkColumns(
  image: ImageDataLike,
  bounds: ReturnType<typeof boundedPlot>,
): Set<number> {
  const suppressed = new Set<number>();
  const rowCount = bounds.bottom - bounds.top + 1;

  for (let x = bounds.left; x <= bounds.right; x += 1) {
    let darkRows = 0;
    for (let y = bounds.top; y <= bounds.bottom; y += 1) {
      if (luminanceAt(image, x, y) < DARK_LUMINANCE) {
        darkRows += 1;
      }
    }
    if (darkRows / rowCount > 0.7) {
      suppressed.add(x);
    }
  }

  return suppressed;
}

function chooseCandidate(
  image: ImageDataLike,
  y: number,
  left: number,
  right: number,
  suppressedColumns: ReadonlySet<number>,
  previousX: number | undefined,
  maxJumpPx: number,
): number | undefined {
  let bestX: number | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let x = left; x <= right; x += 1) {
    if (suppressedColumns.has(x)) {
      continue;
    }

    const luminance = luminanceAt(image, x, y);
    if (luminance >= DARK_LUMINANCE) {
      continue;
    }

    const distance = previousX === undefined ? 0 : Math.abs(x - previousX);
    if (distance > maxJumpPx) {
      continue;
    }

    const darknessScore = (DARK_LUMINANCE - luminance) / DARK_LUMINANCE;
    const continuityScore = previousX === undefined ? 0 : 1 - distance / maxJumpPx;
    const score = darknessScore + continuityScore;
    if (score > bestScore) {
      bestScore = score;
      bestX = x;
    }
  }

  return bestX;
}

function interpolateShortGaps(
  traced: Array<TracedPixel | undefined>,
  maxGapRows: number,
): void {
  let index = 0;

  while (index < traced.length) {
    if (traced[index] !== undefined) {
      index += 1;
      continue;
    }

    const gapStart = index;
    while (index < traced.length && traced[index] === undefined) {
      index += 1;
    }
    const gapEnd = index - 1;
    const before = traced[gapStart - 1];
    const after = traced[index];
    const gapLength = gapEnd - gapStart + 1;

    if (before === undefined || after === undefined || gapLength > maxGapRows) {
      continue;
    }

    for (let offset = 1; offset <= gapLength; offset += 1) {
      const fraction = offset / (gapLength + 1);
      traced[gapStart + offset - 1] = {
        y: before.y + offset,
        x: before.x + fraction * (after.x - before.x),
        confidence: 0.5,
      };
    }
  }
}

function collectUncertainRanges(
  traced: ReadonlyArray<TracedPixel | undefined>,
  calibration: CptCalibration,
  firstY: number,
): UncertainDepthRange[] {
  const ranges: UncertainDepthRange[] = [];
  let index = 0;

  while (index < traced.length) {
    if (traced[index] !== undefined) {
      index += 1;
      continue;
    }

    const start = index;
    while (index < traced.length && traced[index] === undefined) {
      index += 1;
    }
    ranges.push({
      topNapM: pixelToDepthNap(firstY + start, calibration),
      bottomNapM: pixelToDepthNap(firstY + index - 1, calibration),
    });
  }

  return ranges;
}

function aggregatePoints(
  traced: ReadonlyArray<TracedPixel | undefined>,
  calibration: CptCalibration,
  firstY: number,
): DigitizedCptPoint[] {
  const bins = new Map<number, TracedPixel[]>();
  const depthPerPixel = Math.abs(
    (calibration.depthBottomNapM - calibration.depthTopNapM)
      / (calibration.plotBoundsPx.bottom - calibration.plotBoundsPx.top),
  );

  for (const point of traced) {
    if (point === undefined) {
      continue;
    }
    const bin = Math.floor(
      ((point.y - firstY) * depthPerPixel + Number.EPSILON) / SAMPLE_INTERVAL_M,
    );
    const entries = bins.get(bin);
    if (entries === undefined) {
      bins.set(bin, [point]);
    } else {
      entries.push(point);
    }
  }

  return Array.from(bins.values(), (entries) => {
    const y = average(entries.map((entry) => entry.y));
    const x = average(entries.map((entry) => entry.x));
    return {
      depthNapM: pixelToDepthNap(y, calibration),
      qcMpa: pixelToQc(x, calibration),
      confidence: Math.min(...entries.map((entry) => entry.confidence)),
    };
  });
}

function luminanceAt(image: ImageDataLike, x: number, y: number): number {
  const offset = (y * image.width + x) * 4;
  const alpha = image.data[offset + 3] / 255;
  const red = image.data[offset] * alpha + 255 * (1 - alpha);
  const green = image.data[offset + 1] * alpha + 255 * (1 - alpha);
  const blue = image.data[offset + 2] * alpha + 255 * (1 - alpha);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
