// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { CurveDigitizationResult } from "../../vibro/curveDigitizer";
import type { RenderedPdfPage } from "../../vibro/pdfPage";
import type { CptCalibration } from "../../vibro/types";
import VibroPdfViewport from "./VibroPdfViewport";

afterEach(() => {
  cleanup();
});

describe("VibroPdfViewport", () => {
  it("behoudt canvas- en overlaycoördinaten wanneer het omringende paneel versmalt", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 800;
    const page: RenderedPdfPage = {
      canvas,
      width: 600,
      height: 800,
      pageCount: 1,
    };
    const calibration: CptCalibration = {
      pageIndex: 0,
      plotBoundsPx: { left: 60, top: 80, right: 420, bottom: 720 },
      qcMinMpa: 0,
      qcMaxMpa: 20,
      depthTopNapM: 1,
      depthBottomNapM: -15,
    };
    const digitization: CurveDigitizationResult = {
      coverage: 1,
      warnings: [],
      uncertainDepthRanges: [{ topNapM: -3, bottomNapM: -4 }],
      points: [
        { depthNapM: 1, qcMpa: 5, confidence: 0.9 },
        { depthNapM: -15, qcMpa: 15, confidence: 0.9 },
      ],
    };
    const view = render(
      <div data-testid="paneel" style={{ width: 800 }}>
        <VibroPdfViewport
          renderedPage={page}
          calibration={calibration}
          digitization={digitization}
        />
      </div>,
    );

    const initialOverlay = view.container.querySelector(
      ".vibro-pdf-overlay",
    );
    const initialPath = view.container.querySelector(".vibro-overlay-curve");
    expect(initialOverlay?.getAttribute("viewBox")).toBe("0 0 600 800");
    expect(initialPath?.getAttribute("d")).toBe(
      "M 150.00 80.00 L 330.00 720.00",
    );
    expect(canvas.parentElement?.className).toBe("vibro-pdf-canvas-host");

    view.rerender(
      <div data-testid="paneel" style={{ width: 320 }}>
        <VibroPdfViewport
          renderedPage={page}
          calibration={calibration}
          digitization={digitization}
        />
      </div>,
    );

    const resizedSheet = view.container.querySelector(
      ".vibro-pdf-sheet",
    ) as HTMLDivElement;
    const resizedOverlay = view.container.querySelector(
      ".vibro-pdf-overlay",
    );
    const resizedPath = view.container.querySelector(".vibro-overlay-curve");
    expect(resizedSheet.style.aspectRatio).toBe("600 / 800");
    expect(resizedOverlay?.getAttribute("viewBox")).toBe("0 0 600 800");
    expect(resizedPath?.getAttribute("d")).toBe(
      "M 150.00 80.00 L 330.00 720.00",
    );
    expect(canvas.parentElement?.className).toBe("vibro-pdf-canvas-host");
  });
});
