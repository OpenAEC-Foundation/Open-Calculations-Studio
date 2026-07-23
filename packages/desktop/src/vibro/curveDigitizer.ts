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
  source: "observed" | "interpolated";
}

interface CandidatePixel {
  x: number;
  darkness: number;
  persistentThin: boolean;
  strokeWidth: number;
}

interface RouteState {
  candidate: CandidatePixel;
  confidence: number;
  rowIndex: number;
  score: number;
  previous?: RouteState;
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
  assertPlotWithinImage(calibration, image);
  const bounds = boundedPlot(calibration);
  const rowCount = Math.max(0, bounds.bottom - bounds.top + 1);

  if (rowCount === 0) {
    return emptyResult();
  }

  const persistentDarkColumns = findPersistentDarkColumns(image, bounds);
  const rawCandidatesByRow = Array.from({ length: rowCount }, (_, rowIndex) =>
    findRowCandidates(
      image,
      bounds.top + rowIndex,
      bounds.left,
      bounds.right,
      persistentDarkColumns,
    ));
  const hasBroaderCurveCandidate = rawCandidatesByRow.some((candidates) =>
    candidates.some((candidate) => !candidate.persistentThin));
  const candidatesByRow = hasBroaderCurveCandidate
    ? rawCandidatesByRow.map((candidates) =>
      candidates.filter((candidate) => !candidate.persistentThin))
    : rawCandidatesByRow;
  const traced = traceBestRoutes(
    candidatesByRow,
    bounds.top,
    maxJumpPx,
    maxGapRows,
  );

  interpolateShortGaps(traced, maxGapRows);

  const uncertainDepthRanges = collectUncertainRanges(traced, calibration, bounds.top);
  const coveredRows = traced.filter((point) => point?.source === "observed").length;

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

function boundedPlot(calibration: CptCalibration) {
  return {
    left: Math.ceil(calibration.plotBoundsPx.left),
    top: Math.ceil(calibration.plotBoundsPx.top),
    right: Math.floor(calibration.plotBoundsPx.right),
    bottom: Math.floor(calibration.plotBoundsPx.bottom),
  };
}

function assertPlotWithinImage(
  calibration: CptCalibration,
  image: ImageDataLike,
): void {
  const { left, top, right, bottom } = calibration.plotBoundsPx;
  if (
    ![left, top, right, bottom].every(Number.isFinite)
    || left < 0
    || top < 0
    || right > image.width - 1
    || bottom > image.height - 1
  ) {
    throw new RangeError("plotBoundsPx moet volledig binnen het beeld vallen");
  }
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

function findRowCandidates(
  image: ImageDataLike,
  y: number,
  left: number,
  right: number,
  persistentDarkColumns: ReadonlySet<number>,
): CandidatePixel[] {
  const candidates: CandidatePixel[] = [];
  let x = left;

  while (x <= right) {
    if (luminanceAt(image, x, y) >= DARK_LUMINANCE) {
      x += 1;
      continue;
    }

    const start = x;
    const weights: number[] = [];
    while (x <= right && luminanceAt(image, x, y) < DARK_LUMINANCE) {
      weights.push((DARK_LUMINANCE - luminanceAt(image, x, y)) / DARK_LUMINANCE);
      x += 1;
    }
    const strokeWidth = x - start;
    const persistentThin = strokeWidth === 1
      && persistentDarkColumns.has(start);

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const weightedX = weights.reduce(
      (sum, weight, offset) => sum + (start + offset) * weight,
      0,
    ) / totalWeight;
    candidates.push({
      x: weightedX,
      darkness: totalWeight / weights.length,
      persistentThin,
      strokeWidth,
    });
  }

  return candidates;
}

function traceBestRoutes(
  candidatesByRow: ReadonlyArray<ReadonlyArray<CandidatePixel>>,
  firstY: number,
  maxJumpPx: number,
  maxGapRows: number,
): Array<TracedPixel | undefined> {
  const traced: Array<TracedPixel | undefined> = Array(candidatesByRow.length);
  const candidateRows = candidatesByRow
    .map((candidates, rowIndex) => ({ candidates, rowIndex }))
    .filter(({ candidates }) => candidates.length > 0);
  let segmentStart = 0;

  while (segmentStart < candidateRows.length) {
    let segmentEnd = segmentStart + 1;
    while (
      segmentEnd < candidateRows.length
      && candidateRows[segmentEnd].rowIndex
        - candidateRows[segmentEnd - 1].rowIndex
        - 1 <= maxGapRows
    ) {
      segmentEnd += 1;
    }

    traceRouteSegment(
      candidateRows.slice(segmentStart, segmentEnd),
      traced,
      firstY,
      maxJumpPx,
    );
    segmentStart = segmentEnd;
  }

  return traced;
}

function traceRouteSegment(
  rows: ReadonlyArray<{ candidates: ReadonlyArray<CandidatePixel>; rowIndex: number }>,
  traced: Array<TracedPixel | undefined>,
  firstY: number,
  maxJumpPx: number,
): void {
  let previousStates: RouteState[] = [];

  for (const row of rows) {
    const states = row.candidates.map((candidate): RouteState => {
      const predecessor = previousStates
        .filter((state) => Math.abs(state.candidate.x - candidate.x) <= maxJumpPx)
        .reduce<RouteState | undefined>(
          (best, state) => best === undefined || state.score > best.score ? state : best,
          undefined,
        );
      const alternativeScore = row.candidates
        .filter((alternative) => alternative !== candidate)
        .reduce(
          (highest, alternative) => Math.max(highest, candidateScore(alternative)),
          Number.NEGATIVE_INFINITY,
        );
      return {
        candidate,
        confidence: directConfidence(
          candidate,
          predecessor,
          alternativeScore,
          maxJumpPx,
        ),
        rowIndex: row.rowIndex,
        score: candidateScore(candidate) + (predecessor?.score ?? 0),
        previous: predecessor,
      };
    });
    previousStates = states;
  }

  let state = previousStates.reduce<RouteState | undefined>(
    (best, candidate) => best === undefined || candidate.score > best.score
      ? candidate
      : best,
    undefined,
  );
  while (state !== undefined) {
    traced[state.rowIndex] = {
      y: firstY + state.rowIndex,
      x: state.candidate.x,
      confidence: state.confidence,
      source: "observed",
    };
    state = state.previous;
  }
}

function candidateScore(candidate: CandidatePixel): number {
  const persistentLinePenalty = candidate.persistentThin ? 0.35 : 0;
  return candidate.darkness
    + Math.min(candidate.strokeWidth, 3) * 0.1
    - persistentLinePenalty;
}

function directConfidence(
  candidate: CandidatePixel,
  predecessor: RouteState | undefined,
  alternativeScore: number,
  maxJumpPx: number,
): number {
  const continuity = predecessor === undefined
    ? 0.75
    : 1 - Math.min(
      1,
      Math.abs(predecessor.candidate.x - candidate.x) / Math.max(maxJumpPx, 1),
    );
  const ambiguity = Number.isFinite(alternativeScore)
    ? clamp((candidateScore(candidate) - alternativeScore) / 0.25, 0, 1)
    : 1;

  return clamp(
    0.1 + 0.45 * candidate.darkness + 0.25 * continuity + 0.15 * ambiguity,
    0.05,
    0.95,
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
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
        source: "interpolated",
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
    if (traced[index]?.source === "observed") {
      index += 1;
      continue;
    }

    const start = index;
    while (index < traced.length && traced[index]?.source !== "observed") {
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
