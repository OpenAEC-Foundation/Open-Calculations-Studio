// @ts-expect-error Node-types zijn niet nodig voor de browserbuild.
import { readFile } from "node:fs/promises";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReferenceComparisonTable } from "../components/calc/VibroPileDesigner";
import { digitizeQcCurve } from "./curveDigitizer";
import { validateCoverage } from "./geotechnical";
import {
  REFERENCE_METRIC_KEYS,
  calculateReferenceResults,
  compareReferenceResults,
  createReferenceCalibration,
  deriveReferencePixelTolerances,
  isolateReferenceQcCurve,
  isReferencePdfBytes,
  isReferencePage,
  vibroReferenceInput,
  vibroReferenceResults,
  vibroReferenceSource,
} from "./referenceCase";
import type {
  ReferencePixelTolerance,
  ReferenceComparisonStatus,
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

  it("legt de rekeninvoer en negatieve-kleefbron zonder terugkalibratie vast", () => {
    expect(vibroReferenceInput.alphaS).toBe(0.014);
    expect(vibroReferenceInput.positiveShaftStartNapM).toBe(-17.25);
    expect(vibroReferenceInput.positiveShaftLayers).toEqual([
      { bottomNapM: -18.5, topNapM: -17.25 },
    ]);
    expect(vibroReferenceSource.reportFields).toEqual({
      alphaS: 0.014,
      firstPileTipNapM: -18.5,
      firstShaftLengthM: 1.25,
      positiveShaftStartNapM: -17.25,
      negativeSkinMaxDesignProfile1Kn: 247,
      negativeSkinMaxDesignProfile2Kn: 0,
      negativeSkinDesignKn: 245,
    });

    const publishedFirstRsKn =
      Math.PI * 0.323 * 1.25 * 0.014 * 10.6 * 1_000;
    expect(publishedFirstRsKn).toBeCloseTo(188.2, 1);
  });

  it("rapporteert verschillen tegen uitsluitend aangeleverde pixeltoleranties", () => {
    const expected = vibroReferenceResults.slice(0, 2);
    const actual = expected.map((row, index) => ({
      ...row,
      rcNetDesignKn: row.rcNetDesignKn + (index === 0 ? 2 : 20),
    })) as PileResistanceResult[];
    const tolerances = expected.map((row): ReferencePixelTolerance => ({
      pileTipNapM: row.pileTipNapM,
      metrics: Object.fromEntries(
        REFERENCE_METRIC_KEYS.map((key) => [
          key,
          key === "rcNetDesignKn"
            ? { pixel: 3, reading: 6 }
            : { pixel: 0.1, reading: 0.2 },
        ]),
      ) as ReferencePixelTolerance["metrics"],
    }));

    const comparison = compareReferenceResults(
      actual,
      expected,
      tolerances,
    );

    expect(comparison[0]!.metrics.rcNetDesignKn).toMatchObject({
      absoluteDifference: 2,
      percentageDifference: 2 / 189 * 100,
      pixelTolerance: 3,
      readingTolerance: 6,
      status: "within-pixel",
    });
    expect(comparison[1]!.metrics.rcNetDesignKn.status).toBe("investigate");
  });

  it("schaalt het vaste paginavoorstel en maakt beide pixelresoluties expliciet", () => {
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
    expect(calibration.depthMPerPixel).toBeCloseTo(37 / 1028.5, 12);
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

  it("weigert een verkeerde bron of sondeerpagina", async () => {
    const data = new TextEncoder().encode("verkeerde pdf");
    expect(await isReferencePdfBytes(data)).toBe(false);
    expect(isReferencePage({
      sourceSha256: vibroReferenceSource.groundPdfSha256,
      pageIndex: 0,
      pageText: "Projectnr.: AA22485 Sondeernr.: 02",
      width: 842,
      height: 1190,
    })).toBe(false);
    expect(isReferencePage({
      sourceSha256: "0".repeat(64),
      pageIndex: 0,
      pageText: "Projectnr.: AA22485 Sondeernr.: 01",
      width: 842,
      height: 1190,
    })).toBe(false);
  });

  it("toont per niveau de absolute en procentuele afwijking", () => {
    const actual = vibroReferenceResults.map((row) => ({
      ...row,
    })) as PileResistanceResult[];
    const tolerance = vibroReferenceResults.map(
      (row): ReferencePixelTolerance => ({
        pileTipNapM: row.pileTipNapM,
        metrics: Object.fromEntries(
          REFERENCE_METRIC_KEYS.map((key) => [
            key,
            { pixel: 0.1, reading: 0.2 },
          ]),
        ) as ReferencePixelTolerance["metrics"],
      }),
    );
    const comparisons = compareReferenceResults(
      actual,
      vibroReferenceResults,
      tolerance,
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
  "bindt de juiste bron en valideert alle 64 tussenstapstatussen",
  async () => {
    const data = new Uint8Array(await readFile(referencePdfPath!));
    expect(await isReferencePdfBytes(data)).toBe(true);

    const loadingTask = getDocument({ data: data.slice() });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const pageTextContent = await page.getTextContent();
    const pageText = pageTextContent.items
      .map((item) => "str" in item ? item.str : "")
      .join(" ");
    expect(isReferencePage({
      sourceSha256: vibroReferenceSource.groundPdfSha256,
      pageIndex: 0,
      pageText,
      width: page.view[2],
      height: page.view[3],
    })).toBe(true);

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
    for (const { pileTipNapM } of vibroReferenceResults) {
      expect(validateCoverage(digitization.points, {
        ...vibroReferenceInput,
        pileTipNapM,
        positiveShaftLayers: [{
          bottomNapM: pileTipNapM,
          topNapM: vibroReferenceInput.positiveShaftStartNapM,
        }],
      })).toEqual([]);
    }

    const actual = calculateReferenceResults(digitization.points);
    const tolerance = deriveReferencePixelTolerances(
      digitization.points,
      calibration,
      vibroReferenceInput,
    );
    const comparison = compareReferenceResults(
      actual,
      vibroReferenceResults,
      tolerance,
    );
    const statusMatrix = comparison.map((row) =>
      REFERENCE_METRIC_KEYS.map((key) => row.metrics[key].status));

    expect(digitization.points.length).toBeGreaterThan(1_000);
    expect(comparison).toHaveLength(8);
    expect(actual.every((row) =>
      row.negativeSkinDesignKn === 245
      && Math.abs(row.rcNetDesignKn - (row.rcDesignKn - 245)) < 1e-9
    )).toBe(true);
    expect(statusMatrix.flat()).toHaveLength(64);
    expect(statusMatrix).toEqual(
      EXPECTED_REFERENCE_STATUS_MATRIX,
    );

    await pdf.destroy();
  },
  30_000,
);

const EXPECTED_REFERENCE_STATUS_MATRIX: ReferenceComparisonStatus[][] = [
  [
    "investigate", "within-pixel", "investigate", "within-pixel",
    "within-pixel", "investigate", "investigate", "investigate",
  ],
  [
    "curve-reading", "within-pixel", "investigate", "within-pixel",
    "within-pixel", "investigate", "investigate", "investigate",
  ],
  [
    "within-pixel", "within-pixel", "investigate", "within-pixel",
    "within-pixel", "investigate", "investigate", "investigate",
  ],
  [
    "curve-reading", "within-pixel", "investigate", "within-pixel",
    "within-pixel", "investigate", "investigate", "investigate",
  ],
  [
    "within-pixel", "within-pixel", "investigate", "within-pixel",
    "within-pixel", "investigate", "investigate", "investigate",
  ],
  [
    "investigate", "curve-reading", "investigate", "investigate",
    "investigate", "investigate", "investigate", "investigate",
  ],
  [
    "curve-reading", "curve-reading", "investigate", "within-pixel",
    "within-pixel", "investigate", "investigate", "investigate",
  ],
  [
    "curve-reading", "within-pixel", "investigate", "curve-reading",
    "curve-reading", "investigate", "investigate", "investigate",
  ],
];
