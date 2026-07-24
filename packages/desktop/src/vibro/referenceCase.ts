import type {
  CptCalibration,
  DigitizedCptPoint,
  PileResistanceResult,
  VibroPileInput,
} from "./types";
import type { ImageDataLike } from "./curveDigitizer";
import { calculatePileResistance } from "./geotechnical";

export const REFERENCE_METRIC_KEYS = [
  "qcIAvgMpa",
  "qcIIAvgMpa",
  "qcShaftAvgMpa",
  "qbMaxMpa",
  "rbCalKn",
  "rsCalKn",
  "rcDesignKn",
  "rcNetDesignKn",
] as const;

export type ReferenceMetricKey = typeof REFERENCE_METRIC_KEYS[number];
export type ReferenceComparisonStatus =
  | "within-pixel"
  | "curve-reading"
  | "investigate";

export interface VibroReferenceResult {
  pileTipNapM: number;
  qcIAvgMpa: number;
  qcIIAvgMpa: number;
  qcShaftAvgMpa: number;
  qbMaxMpa: number;
  rbCalKn: number;
  rsCalKn: number;
  rcDesignKn: number;
  rcNetDesignKn: number;
}

export interface ReferenceMetricComparison {
  expected: number;
  actual: number;
  absoluteDifference: number;
  percentageDifference: number;
  pixelTolerance: number;
  readingTolerance: number;
  status: ReferenceComparisonStatus;
}

export interface ReferenceComparison {
  pileTipNapM: number;
  metrics: Record<ReferenceMetricKey, ReferenceMetricComparison>;
  status: ReferenceComparisonStatus;
}

export interface ReferenceCalibration extends CptCalibration {
  qcMpaPerPixel: number;
  depthMPerPixel: number;
}

export interface ReferencePixelTolerance {
  pileTipNapM: number;
  metrics: Record<
    ReferenceMetricKey,
    { pixel: number; reading: number }
  >;
}

interface ReferencePageGeometry {
  width: number;
  height: number;
  pageIndex: number;
}

interface ReferencePageIdentity extends ReferencePageGeometry {
  sourceSha256: string;
  pageText: string;
}

const REFERENCE_PAGE_WIDTH = 842;
const REFERENCE_PAGE_HEIGHT = 1190;
const REFERENCE_PLOT_BOUNDS = {
  left: 211,
  top: 56,
  right: 696,
  bottom: 1084.5,
} as const;

const STATUS_SEVERITY: Record<ReferenceComparisonStatus, number> = {
  "within-pixel": 0,
  "curve-reading": 1,
  investigate: 2,
};
const REFERENCE_PILE_TIPS_NAP_M = [
  -18.5,
  -19,
  -19.5,
  -20,
  -20.5,
  -21,
  -21.5,
  -22,
] as const;

export const vibroReferenceSource = {
  groundPdfSha256:
    "c3c472a863c934ae05943776f860157a086abbd5ded0e2676c8ed38d91505c5e",
  projectMarker: "AA22485",
  cptNumber: "01",
  reportFields: {
    alphaS: 0.014,
    firstPileTipNapM: -18.5,
    firstShaftLengthM: 1.25,
    positiveShaftStartNapM: -17.25,
    negativeSkinMaxDesignProfile1Kn: 247,
    negativeSkinMaxDesignProfile2Kn: 0,
    negativeSkinDesignKn: 245,
  },
} as const;

const REFERENCE_NEGATIVE_SKIN_BY_TIP = new Map<number, number>(
  REFERENCE_PILE_TIPS_NAP_M.map((pileTipNapM) => [
    pileTipNapM,
    vibroReferenceSource.reportFields.negativeSkinDesignKn,
  ]),
);

export const vibroReferenceInput: VibroPileInput = {
  shaftDiameterMm: 323,
  baseDiameterMm: 365,
  pileHeadNapM: -0.9,
  pileTipNapM: -18.5,
  positiveShaftStartNapM: -17.25,
  alphaP: 0.7,
  alphaS: 0.014,
  beta: 1,
  shapeFactor: 1,
  xiSingleCpt: 1.3,
  gammaB: 1.2,
  gammaS: 1.2,
  designLoadKn: 0,
  positiveShaftLayers: [
    { bottomNapM: -18.5, topNapM: -17.25 },
  ],
  negativeSkinLayers: [],
};

export const vibroReferenceResults: readonly VibroReferenceResult[] = [
  {
    pileTipNapM: -18.5,
    qcIAvgMpa: 10.3,
    qcIIAvgMpa: 8.5,
    qcShaftAvgMpa: 10.6,
    qbMaxMpa: 4.66,
    rbCalKn: 487,
    rsCalKn: 189,
    rcDesignKn: 434,
    rcNetDesignKn: 189,
  },
  {
    pileTipNapM: -19,
    qcIAvgMpa: 9.3,
    qcIIAvgMpa: 8.5,
    qcShaftAvgMpa: 10.7,
    qbMaxMpa: 4.96,
    rbCalKn: 519,
    rsCalKn: 267,
    rcDesignKn: 504,
    rcNetDesignKn: 260,
  },
  {
    pileTipNapM: -19.5,
    qcIAvgMpa: 11.2,
    qcIIAvgMpa: 10.4,
    qcShaftAvgMpa: 10.4,
    qbMaxMpa: 6.13,
    rbCalKn: 641,
    rsCalKn: 334,
    rcDesignKn: 625,
    rcNetDesignKn: 380,
  },
  {
    pileTipNapM: -20,
    qcIAvgMpa: 12.5,
    qcIIAvgMpa: 11.3,
    qcShaftAvgMpa: 10.6,
    qbMaxMpa: 7.11,
    rbCalKn: 744,
    rsCalKn: 413,
    rcDesignKn: 741,
    rcNetDesignKn: 497,
  },
  {
    pileTipNapM: -20.5,
    qcIAvgMpa: 13.2,
    qcIIAvgMpa: 13.2,
    qcShaftAvgMpa: 10.7,
    qbMaxMpa: 7.88,
    rbCalKn: 824,
    rsCalKn: 496,
    rcDesignKn: 847,
    rcNetDesignKn: 602,
  },
  {
    pileTipNapM: -21,
    qcIAvgMpa: 13.8,
    qcIIAvgMpa: 12.3,
    qcShaftAvgMpa: 10.9,
    qbMaxMpa: 8.06,
    rbCalKn: 843,
    rsCalKn: 582,
    rcDesignKn: 914,
    rcNetDesignKn: 669,
  },
  {
    pileTipNapM: -21.5,
    qcIAvgMpa: 14.7,
    qcIIAvgMpa: 14.7,
    qcShaftAvgMpa: 11.1,
    qbMaxMpa: 8.88,
    rbCalKn: 929,
    rsCalKn: 672,
    rcDesignKn: 1026,
    rcNetDesignKn: 782,
  },
  {
    pileTipNapM: -22,
    qcIAvgMpa: 14.9,
    qcIIAvgMpa: 1.9,
    qcShaftAvgMpa: 11.5,
    qbMaxMpa: 3.58,
    rbCalKn: 374,
    rsCalKn: 776,
    rcDesignKn: 737,
    rcNetDesignKn: 493,
  },
];

export function createReferenceCalibration(
  page: ReferencePageGeometry,
): ReferenceCalibration {
  const scaleX = page.width / REFERENCE_PAGE_WIDTH;
  const scaleY = page.height / REFERENCE_PAGE_HEIGHT;
  const plotBoundsPx = {
    left: REFERENCE_PLOT_BOUNDS.left * scaleX,
    top: REFERENCE_PLOT_BOUNDS.top * scaleY,
    right: REFERENCE_PLOT_BOUNDS.right * scaleX,
    bottom: REFERENCE_PLOT_BOUNDS.bottom * scaleY,
  };
  const qcMinMpa = 0;
  const qcMaxMpa = 35;
  const depthTopNapM = 0;
  const depthBottomNapM = -37;

  return withReferencePixelResolution({
    pageIndex: page.pageIndex,
    plotBoundsPx,
    qcMinMpa,
    qcMaxMpa,
    depthTopNapM,
    depthBottomNapM,
  });
}

export function withReferencePixelResolution(
  calibration: CptCalibration,
): ReferenceCalibration {
  return {
    ...calibration,
    qcMpaPerPixel:
      (calibration.qcMaxMpa - calibration.qcMinMpa)
      / (
        calibration.plotBoundsPx.right
        - calibration.plotBoundsPx.left
      ),
    depthMPerPixel:
      Math.abs(
        calibration.depthTopNapM - calibration.depthBottomNapM,
      )
      / (
        calibration.plotBoundsPx.bottom
        - calibration.plotBoundsPx.top
      ),
  };
}

export function isolateReferenceQcCurve(
  image: ImageDataLike,
): ImageDataLike {
  const data = new Uint8ClampedArray(image.data.length);
  for (let offset = 0; offset < image.data.length; offset += 4) {
    const red = image.data[offset]!;
    const green = image.data[offset + 1]!;
    const blue = image.data[offset + 2]!;
    const isQcCurve =
      blue >= 120
      && blue - red >= 40
      && blue - green >= 40;
    const value = isQcCurve ? 0 : 255;
    data[offset] = value;
    data[offset + 1] = value;
    data[offset + 2] = value;
    data[offset + 3] = 255;
  }

  return {
    width: image.width,
    height: image.height,
    data,
  };
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data.slice().buffer);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")).join("");
}

export async function isReferencePdfBytes(
  data: Uint8Array,
): Promise<boolean> {
  return await sha256Hex(data) === vibroReferenceSource.groundPdfSha256;
}

export function isReferencePage(page: ReferencePageIdentity): boolean {
  const normalizedText = page.pageText.replace(/\s+/g, " ").trim();
  const identityPattern = new RegExp(
    `${vibroReferenceSource.projectMarker}\\s+`
      + `${vibroReferenceSource.cptNumber}\\s+1/2(?:\\D|$)`,
  );

  return page.sourceSha256 === vibroReferenceSource.groundPdfSha256
    && page.pageIndex === 0
    && Math.abs(page.width - REFERENCE_PAGE_WIDTH) < 0.5
    && Math.abs(page.height - REFERENCE_PAGE_HEIGHT) < 0.5
    && normalizedText.includes("Sondeernr.:")
    && identityPattern.test(normalizedText);
}

export function calculateReferenceResults(
  points: DigitizedCptPoint[],
  input: VibroPileInput = vibroReferenceInput,
): PileResistanceResult[] {
  return vibroReferenceResults.map(({ pileTipNapM }) => {
    const negativeSkinDesignKn =
      REFERENCE_NEGATIVE_SKIN_BY_TIP.get(pileTipNapM);
    if (negativeSkinDesignKn === undefined) {
      throw new RangeError(
        `Gepubliceerde negatieve kleef ontbreekt voor NAP ${pileTipNapM}`,
      );
    }
    const gross = calculatePileResistance(points, {
      ...input,
      pileTipNapM,
      positiveShaftLayers: [{
        bottomNapM: pileTipNapM,
        topNapM: input.positiveShaftStartNapM,
      }],
      negativeSkinLayers: [],
    });
    const rcNetDesignKn = gross.rcDesignKn - negativeSkinDesignKn;

    return {
      ...gross,
      negativeSkinDesignKn,
      rcNetDesignKn,
      unityCheck: input.designLoadKn / rcNetDesignKn,
    };
  });
}

export function deriveReferencePixelTolerances(
  points: DigitizedCptPoint[],
  calibration: ReferenceCalibration,
  input: VibroPileInput,
): ReferencePixelTolerance[] {
  const baseline = calculateReferenceResults(points, input);
  const onePixel = perturbedReferenceResults(
    points,
    calibration,
    input,
    1,
  );
  const twoPixels = perturbedReferenceResults(
    points,
    calibration,
    input,
    2,
  );

  return baseline.map((baselineRow) => {
    const onePixelRows = onePixel.map((variant) =>
      findResult(variant, baselineRow.pileTipNapM));
    const twoPixelRows = twoPixels.map((variant) =>
      findResult(variant, baselineRow.pileTipNapM));

    return {
      pileTipNapM: baselineRow.pileTipNapM,
      metrics: Object.fromEntries(
        REFERENCE_METRIC_KEYS.map((key) => [
          key,
          {
            pixel: maximumDifference(
              baselineRow[key],
              onePixelRows.map((row) => row[key]),
            ),
            reading: maximumDifference(
              baselineRow[key],
              twoPixelRows.map((row) => row[key]),
            ),
          },
        ]),
      ) as ReferencePixelTolerance["metrics"],
    };
  });
}

export function compareReferenceResults(
  actual: readonly PileResistanceResult[],
  expected: readonly VibroReferenceResult[],
  tolerance: readonly ReferencePixelTolerance[],
): ReferenceComparison[] {
  return expected.map((expectedRow) => {
    const actualRow = actual.find(
      (candidate) =>
        Math.abs(candidate.pileTipNapM - expectedRow.pileTipNapM) < 1e-9,
    );
    if (actualRow === undefined) {
      throw new RangeError(
        `Rekenresultaat voor NAP ${expectedRow.pileTipNapM.toFixed(2)} m ontbreekt`,
      );
    }

    const tolerances = tolerance.find(
      (candidate) =>
        Math.abs(candidate.pileTipNapM - expectedRow.pileTipNapM) < 1e-9,
    );
    if (tolerances === undefined) {
      throw new RangeError(
        `Pixeltolerantie voor NAP ${expectedRow.pileTipNapM.toFixed(2)} m ontbreekt`,
      );
    }
    const metrics = Object.fromEntries(
      REFERENCE_METRIC_KEYS.map((key) => {
        const absoluteDifference = Math.abs(actualRow[key] - expectedRow[key]);
        const pixelTolerance = tolerances.metrics[key].pixel;
        const readingTolerance = tolerances.metrics[key].reading;
        const status: ReferenceComparisonStatus =
          absoluteDifference <= pixelTolerance
            ? "within-pixel"
            : absoluteDifference <= readingTolerance
              ? "curve-reading"
              : "investigate";
        return [key, {
          expected: expectedRow[key],
          actual: actualRow[key],
          absoluteDifference,
          percentageDifference: expectedRow[key] === 0
            ? absoluteDifference === 0 ? 0 : Number.POSITIVE_INFINITY
            : absoluteDifference / Math.abs(expectedRow[key]) * 100,
          pixelTolerance,
          readingTolerance,
          status,
        }];
      }),
    ) as Record<ReferenceMetricKey, ReferenceMetricComparison>;
    const status = REFERENCE_METRIC_KEYS.reduce<ReferenceComparisonStatus>(
      (worst, key) =>
        STATUS_SEVERITY[metrics[key].status] > STATUS_SEVERITY[worst]
          ? metrics[key].status
          : worst,
      "within-pixel",
    );

    return {
      pileTipNapM: expectedRow.pileTipNapM,
      metrics,
      status,
    };
  });
}

function perturbedReferenceResults(
  points: DigitizedCptPoint[],
  calibration: ReferenceCalibration,
  input: VibroPileInput,
  pixelCount: number,
): PileResistanceResult[][] {
  const qcDelta = calibration.qcMpaPerPixel * pixelCount;
  const depthDelta = calibration.depthMPerPixel * pixelCount;
  return [
    points.map((point) => ({ ...point, qcMpa: point.qcMpa + qcDelta })),
    points.map((point) => ({
      ...point,
      qcMpa: Math.max(0, point.qcMpa - qcDelta),
    })),
    points.map((point) => ({
      ...point,
      depthNapM: point.depthNapM + depthDelta,
    })),
    points.map((point) => ({
      ...point,
      depthNapM: point.depthNapM - depthDelta,
    })),
  ].map((variant) => calculateReferenceResults(variant, input));
}

function findResult(
  results: PileResistanceResult[],
  pileTipNapM: number,
): PileResistanceResult {
  const result = results.find(
    (candidate) => Math.abs(candidate.pileTipNapM - pileTipNapM) < 1e-9,
  );
  if (result === undefined) {
    throw new RangeError(`Rekenresultaat voor NAP ${pileTipNapM} ontbreekt`);
  }
  return result;
}

function maximumDifference(
  baseline: number,
  alternatives: number[],
): number {
  return Math.max(
    ...alternatives.map((alternative) => Math.abs(alternative - baseline)),
  );
}
