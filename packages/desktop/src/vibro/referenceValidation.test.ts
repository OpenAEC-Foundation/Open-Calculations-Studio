// @ts-expect-error Node-types zijn niet nodig voor de browserbuild.
import { readFile } from "node:fs/promises";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReferenceComparisonTable } from "../components/calc/VibroPileDesigner";
import { digitizeQcCurve } from "./curveDigitizer";
import {
  calculatePileResistance,
  validateCoverage,
} from "./geotechnical";
import {
  compareReferenceResults,
  createReferenceCalibration,
  isolateReferenceQcCurve,
  vibroReferenceInput,
  vibroReferenceResults,
} from "./referenceCase";
import type { PileResistanceResult } from "./types";

declare const process: {
  env: Record<string, string | undefined>;
};

const referencePdfPath = process.env.VIBRO_REFERENCE_PDF;

describe("referentievergelijking", () => {
  it("legt de acht gepubliceerde rijen van sondering 1 exact vast", () => {
    expect(vibroReferenceResults).toEqual([
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
    ]);
  });

  it("rapporteert absolute en procentuele afwijkingen met zichtbare tolerantie", () => {
    const expected = vibroReferenceResults.slice(0, 2);
    const actual = expected.map((row, index) => ({
      ...row,
      rcNetDesignKn: row.rcNetDesignKn + (index === 0 ? 2 : 20),
    })) as PileResistanceResult[];

    const comparison = compareReferenceResults(actual, expected);

    expect(comparison).toHaveLength(2);
    expect(comparison[0]!.metrics.rcNetDesignKn).toMatchObject({
      absoluteDifference: 2,
      percentageDifference: 2 / 189 * 100,
      status: "within-pixel",
    });
    expect(comparison[0]!.metrics.rcNetDesignKn.pixelTolerance).toBeGreaterThan(0);
    expect(comparison[0]!.metrics.rcNetDesignKn.readingTolerance)
      .toBeGreaterThan(comparison[0]!.metrics.rcNetDesignKn.pixelTolerance);
    expect(comparison[1]!.metrics.rcNetDesignKn).toMatchObject({
      absoluteDifference: 20,
      status: "investigate",
    });
  });

  it("schaalt het vaste paginavoorstel en maakt de pixelresolutie expliciet", () => {
    const calibration = createReferenceCalibration({
      width: 842,
      height: 1190,
      pageIndex: 0,
    });

    expect(calibration.plotBoundsPx).toEqual({
      left: 211,
      top: 56,
      right: 696,
      bottom: 1084.5,
    });
    expect(calibration.depthTopNapM).toBe(0);
    expect(calibration.depthBottomNapM).toBe(-37);
    expect(calibration.qcMpaPerPixel).toBeCloseTo(35 / 485, 12);
  });

  it("isoleert de blauwe qc-curve van zwarte assen en rode hulplijnen", () => {
    const isolated = isolateReferenceQcCurve({
      width: 3,
      height: 1,
      data: new Uint8ClampedArray([
        10, 30, 230, 255,
        10, 10, 10, 255,
        230, 30, 10, 255,
      ]),
    });

    expect([...isolated.data]).toEqual([
      0, 0, 0, 255,
      255, 255, 255, 255,
      255, 255, 255, 255,
    ]);
  });

  it("toont per niveau de absolute en procentuele netto-afwijking", () => {
    const actual = vibroReferenceResults.map((row) => ({
      ...row,
    })) as PileResistanceResult[];
    const comparisons = compareReferenceResults(
      actual,
      vibroReferenceResults,
    );

    const markup = renderToStaticMarkup(
      ReferenceComparisonTable({ comparisons }),
    );

    expect(markup).toContain("Afwijking referentierapport");
    expect(markup).toContain("Absoluut");
    expect(markup).toContain("Procentueel");
    expect(markup).toContain("Binnen 1 pixel");
    expect(markup.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0].match(/<tr/g))
      .toHaveLength(8);
  });
});

it.skipIf(referencePdfPath === undefined)(
  "digitaliseert pagina 1 en rekent alle acht niveaus zonder ontbrekende dekking",
  async () => {
    const data = await readFile(referencePdfPath!);
    const loadingTask = getDocument({
      data: new Uint8Array(data),
    });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height),
    );
    const context = canvas.getContext("2d");
    await page.render({
      canvas: canvas as never,
      canvasContext: context as never,
      viewport,
    }).promise;

    const calibration = createReferenceCalibration({
      width: canvas.width,
      height: canvas.height,
      pageIndex: 0,
    });
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const digitization = digitizeQcCurve(
      isolateReferenceQcCurve(image),
      calibration,
      {
      maxJumpPx:
        calibration.plotBoundsPx.right - calibration.plotBoundsPx.left,
      },
    );
    console.info({
      calibration,
      pointCount: digitization.points.length,
      firstPoint: digitization.points[0],
      lastPoint: digitization.points[digitization.points.length - 1],
      coverage: digitization.coverage,
      warnings: digitization.warnings,
    });
    const actual = vibroReferenceResults.map(({ pileTipNapM }) => {
      const input = {
        ...vibroReferenceInput,
        pileTipNapM,
        positiveShaftLayers: [{
          bottomNapM: pileTipNapM,
          topNapM: vibroReferenceInput.positiveShaftStartNapM,
        }],
      };
      expect(validateCoverage(digitization.points, input)).toEqual([]);
      return calculatePileResistance(digitization.points, input);
    });
    const comparison = compareReferenceResults(
      actual,
      vibroReferenceResults,
      calibration,
    );

    console.table(comparison.map((row) => ({
      pileTipNapM: row.pileTipNapM,
      qcIActual: row.metrics.qcIAvgMpa.actual,
      qcIExpected: row.metrics.qcIAvgMpa.expected,
      qcIStatus: row.metrics.qcIAvgMpa.status,
      rcNetActual: row.metrics.rcNetDesignKn.actual,
      rcNetExpected: row.metrics.rcNetDesignKn.expected,
      rcNetDifference: row.metrics.rcNetDesignKn.absoluteDifference,
      rcNetStatus: row.metrics.rcNetDesignKn.status,
    })));
    expect(digitization.points.length).toBeGreaterThan(1_000);
    expect(comparison).toHaveLength(8);
    expect(comparison.every((row) =>
      Object.values(row.metrics).every((metric) =>
        Number.isFinite(metric.absoluteDifference)
        && Number.isFinite(metric.percentageDifference)
      )
    )).toBe(true);
    expect(comparison[2]!.metrics.qcIAvgMpa.status).toBe("within-pixel");
    expect(comparison[3]!.metrics.qcIAvgMpa.status).toBe("curve-reading");
    expect(comparison[3]!.metrics.rcNetDesignKn.status).toBe("within-pixel");
    expect(comparison[0]!.metrics.rcNetDesignKn.status).toBe("investigate");
    expect(comparison[0]!.metrics.qcIAvgMpa.pixelTolerance).toBeLessThan(0.09);
    expect(comparison[0]!.metrics.qcIAvgMpa.readingTolerance).toBeLessThan(0.13);

    await pdf.destroy();
  },
  30_000,
);
