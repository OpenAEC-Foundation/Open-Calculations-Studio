import type { CurveDigitizationResult } from "./curveDigitizer";

export const MIN_DIGITIZATION_COVERAGE = 0.9;
export const MIN_RELEVANT_CONFIDENCE = 0.5;

export interface RelevantDepthRange {
  topNapM: number;
  bottomNapM: number;
}

export interface DigitizationQuality {
  coveragePass: boolean;
  trajectoryPass: boolean;
  blockers: string[];
}

const DEPTH_EDGE_TOLERANCE_M = 0.051;

export function evaluateDigitizationQuality(
  result: CurveDigitizationResult,
  relevantRange: RelevantDepthRange,
): DigitizationQuality {
  const coveragePass = result.coverage >= MIN_DIGITIZATION_COVERAGE;
  const blockers: string[] = [];
  if (!coveragePass) {
    blockers.push(
      "De curve dekt minder dan 90% van het gekalibreerde diagram.",
    );
  }

  const relevantMinimum = Math.min(
    relevantRange.topNapM,
    relevantRange.bottomNapM,
  );
  const relevantMaximum = Math.max(
    relevantRange.topNapM,
    relevantRange.bottomNapM,
  );
  const hasPositiveLength = Number.isFinite(relevantMinimum)
    && Number.isFinite(relevantMaximum)
    && relevantMaximum > relevantMinimum;
  if (!hasPositiveLength) {
    blockers.push(
      "Het relevante NAP-traject moet een positieve lengte hebben.",
    );
  }
  const relevantPoints = result.points.filter(
    (point) =>
      point.depthNapM >= relevantMinimum - DEPTH_EDGE_TOLERANCE_M
      && point.depthNapM <= relevantMaximum + DEPTH_EDGE_TOLERANCE_M,
  );
  const pointMinimum = Math.min(
    ...relevantPoints.map((point) => point.depthNapM),
  );
  const pointMaximum = Math.max(
    ...relevantPoints.map((point) => point.depthNapM),
  );
  const reachesTrajectoryEdges = relevantPoints.length > 0
    && pointMinimum <= relevantMinimum + DEPTH_EDGE_TOLERANCE_M
    && pointMaximum >= relevantMaximum - DEPTH_EDGE_TOLERANCE_M;
  if (!reachesTrajectoryEdges) {
    blockers.push(
      "De gedigitaliseerde curve dekt het relevante NAP-traject niet volledig.",
    );
  }

  const uncertainOverlap = result.uncertainDepthRanges.some((range) =>
    rangesOverlap(
      relevantMinimum,
      relevantMaximum,
      Math.min(range.topNapM, range.bottomNapM),
      Math.max(range.topNapM, range.bottomNapM),
    ));
  if (uncertainOverlap) {
    blockers.push(
      "Het relevante NAP-traject bevat een onzeker curvesegment.",
    );
  }

  const hasLowConfidence = relevantPoints.some(
    (point) => point.confidence < MIN_RELEVANT_CONFIDENCE,
  );
  if (hasLowConfidence) {
    blockers.push(
      "Het relevante NAP-traject bevat laagbetrouwbare meetpunten.",
    );
  }

  return {
    coveragePass,
    trajectoryPass:
      hasPositiveLength
      && reachesTrajectoryEdges
      && !uncertainOverlap
      && !hasLowConfidence,
    blockers,
  };
}

function rangesOverlap(
  firstMinimum: number,
  firstMaximum: number,
  secondMinimum: number,
  secondMaximum: number,
): boolean {
  return firstMinimum <= secondMaximum && secondMinimum <= firstMaximum;
}
