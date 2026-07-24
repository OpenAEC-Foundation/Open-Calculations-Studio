import type {
  CptCalibration,
  PileResistanceResult,
  VibroPileInput,
} from "./types";
import type { ImageDataLike } from "./curveDigitizer";

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

interface ReferencePage {
  width: number;
  height: number;
  pageIndex: number;
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

const PUBLICATION_ROUNDING: Record<ReferenceMetricKey, number> = {
  qcIAvgMpa: 0.05,
  qcIIAvgMpa: 0.05,
  qcShaftAvgMpa: 0.05,
  qbMaxMpa: 0.005,
  rbCalKn: 0.5,
  rsCalKn: 0.5,
  rcDesignKn: 0.5,
  rcNetDesignKn: 0.5,
};

export const vibroReferenceInput: VibroPileInput = {
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
  designLoadKn: 0,
  positiveShaftLayers: [
    { bottomNapM: -18.5, topNapM: -14.25 },
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
  page: ReferencePage,
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

  return {
    pageIndex: page.pageIndex,
    plotBoundsPx,
    qcMinMpa,
    qcMaxMpa,
    depthTopNapM,
    depthBottomNapM,
    qcMpaPerPixel:
      (qcMaxMpa - qcMinMpa) / (plotBoundsPx.right - plotBoundsPx.left),
    depthMPerPixel:
      (depthTopNapM - depthBottomNapM)
      / (plotBoundsPx.bottom - plotBoundsPx.top),
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

export function compareReferenceResults(
  actual: readonly PileResistanceResult[],
  expected: readonly VibroReferenceResult[],
  calibration: CptCalibration = createReferenceCalibration({
    width: REFERENCE_PAGE_WIDTH,
    height: REFERENCE_PAGE_HEIGHT,
    pageIndex: 0,
  }),
): ReferenceComparison[] {
  const qcMpaPerPixel =
    (calibration.qcMaxMpa - calibration.qcMinMpa)
    / (calibration.plotBoundsPx.right - calibration.plotBoundsPx.left);
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

    const tolerances = metricTolerances(
      expectedRow.pileTipNapM,
      qcMpaPerPixel,
    );
    const metrics = Object.fromEntries(
      REFERENCE_METRIC_KEYS.map((key) => {
        const absoluteDifference = Math.abs(actualRow[key] - expectedRow[key]);
        const pixelTolerance = tolerances[key].pixel;
        const readingTolerance = tolerances[key].reading;
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

function metricTolerances(
  pileTipNapM: number,
  qcMpaPerPixel: number,
): Record<ReferenceMetricKey, { pixel: number; reading: number }> {
  const baseAreaM2 =
    Math.PI * (vibroReferenceInput.baseDiameterMm / 1000) ** 2 / 4;
  const shaftCircumferenceM =
    Math.PI * vibroReferenceInput.shaftDiameterMm / 1000;
  const shaftLengthM =
    vibroReferenceInput.positiveShaftStartNapM - pileTipNapM;
  const qbPerQcMpa = vibroReferenceInput.alphaP
    * vibroReferenceInput.beta
    * vibroReferenceInput.shapeFactor;

  const atPixels = (pixelCount: number) => {
    const qcTolerance =
      pixelCount * qcMpaPerPixel + PUBLICATION_ROUNDING.qcIAvgMpa;
    const qbTolerance =
      pixelCount * qcMpaPerPixel * qbPerQcMpa
      + PUBLICATION_ROUNDING.qbMaxMpa;
    const rbTolerance =
      baseAreaM2 * qbTolerance * 1_000
      + PUBLICATION_ROUNDING.rbCalKn;
    const rsTolerance =
      shaftCircumferenceM
      * shaftLengthM
      * vibroReferenceInput.alphaS
      * pixelCount
      * qcMpaPerPixel
      * 1_000
      + PUBLICATION_ROUNDING.rsCalKn;
    const rcTolerance =
      rbTolerance
        / vibroReferenceInput.xiSingleCpt
        / vibroReferenceInput.gammaB
      + rsTolerance
        / vibroReferenceInput.xiSingleCpt
        / vibroReferenceInput.gammaS
      + PUBLICATION_ROUNDING.rcDesignKn;

    return {
      qcTolerance,
      qbTolerance,
      rbTolerance,
      rsTolerance,
      rcTolerance,
    };
  };
  const pixel = atPixels(1);
  const reading = atPixels(2);

  return {
    qcIAvgMpa: {
      pixel: pixel.qcTolerance,
      reading: reading.qcTolerance,
    },
    qcIIAvgMpa: {
      pixel: pixel.qcTolerance,
      reading: reading.qcTolerance,
    },
    qcShaftAvgMpa: {
      pixel: pixel.qcTolerance,
      reading: reading.qcTolerance,
    },
    qbMaxMpa: {
      pixel: pixel.qbTolerance,
      reading: reading.qbTolerance,
    },
    rbCalKn: {
      pixel: pixel.rbTolerance,
      reading: reading.rbTolerance,
    },
    rsCalKn: {
      pixel: pixel.rsTolerance,
      reading: reading.rsTolerance,
    },
    rcDesignKn: {
      pixel: pixel.rcTolerance,
      reading: reading.rcTolerance,
    },
    rcNetDesignKn: {
      pixel: pixel.rcTolerance,
      reading: reading.rcTolerance,
    },
  };
}
