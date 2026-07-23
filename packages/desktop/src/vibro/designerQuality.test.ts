import { describe, expect, it } from "vitest";
import type { CurveDigitizationResult } from "./curveDigitizer";
import {
  MIN_DIGITIZATION_COVERAGE,
  evaluateDigitizationQuality,
} from "./designerQuality";

function completeResult(): CurveDigitizationResult {
  return {
    coverage: 0.98,
    warnings: [],
    uncertainDepthRanges: [],
    points: Array.from({ length: 41 }, (_, index) => ({
      depthNapM: 1 - index * 0.05,
      qcMpa: 8,
      confidence: 0.85,
    })),
  };
}

describe("evaluateDigitizationQuality", () => {
  it("accepteert een betrouwbare curve die het volledige relevante traject dekt", () => {
    const quality = evaluateDigitizationQuality(
      completeResult(),
      { topNapM: 1, bottomNapM: -1 },
    );

    expect(quality).toEqual({
      coveragePass: true,
      trajectoryPass: true,
      blockers: [],
    });
  });

  it("blokkeert bij onvoldoende totale curvedekking", () => {
    const result = completeResult();
    result.coverage = MIN_DIGITIZATION_COVERAGE - 0.01;

    const quality = evaluateDigitizationQuality(
      result,
      { topNapM: 1, bottomNapM: -1 },
    );

    expect(quality.coveragePass).toBe(false);
    expect(quality.blockers).toContain(
      "De curve dekt minder dan 90% van het gekalibreerde diagram.",
    );
  });

  it("blokkeert wanneer meetpunten een relevante trajectgrens niet bereiken", () => {
    const result = completeResult();
    result.points = result.points.filter((point) => point.depthNapM > -0.7);

    const quality = evaluateDigitizationQuality(
      result,
      { topNapM: 1, bottomNapM: -1 },
    );

    expect(quality.trajectoryPass).toBe(false);
    expect(quality.blockers).toContain(
      "De gedigitaliseerde curve dekt het relevante NAP-traject niet volledig.",
    );
  });

  it("blokkeert een onzeker segment dat het relevante traject overlapt", () => {
    const result = completeResult();
    result.uncertainDepthRanges = [{
      topNapM: 0.2,
      bottomNapM: 0.05,
    }];

    const quality = evaluateDigitizationQuality(
      result,
      { topNapM: 1, bottomNapM: -1 },
    );

    expect(quality.trajectoryPass).toBe(false);
    expect(quality.blockers).toContain(
      "Het relevante NAP-traject bevat een onzeker curvesegment.",
    );
  });

  it("blokkeert laagbetrouwbare meetpunten binnen het relevante traject", () => {
    const result = completeResult();
    result.points[20] = { ...result.points[20], confidence: 0.2 };

    const quality = evaluateDigitizationQuality(
      result,
      { topNapM: 1, bottomNapM: -1 },
    );

    expect(quality.trajectoryPass).toBe(false);
    expect(quality.blockers).toContain(
      "Het relevante NAP-traject bevat laagbetrouwbare meetpunten.",
    );
  });

  it("blokkeert een relevant traject zonder lengte", () => {
    const quality = evaluateDigitizationQuality(
      completeResult(),
      { topNapM: -0.5, bottomNapM: -0.5 },
    );

    expect(quality.trajectoryPass).toBe(false);
    expect(quality.blockers).toContain(
      "Het relevante NAP-traject moet een positieve lengte hebben.",
    );
  });
});
