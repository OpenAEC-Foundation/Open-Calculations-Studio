import { useEffect, useMemo, useRef } from "react";
import { depthNapToPixel, qcToPixel } from "../../vibro/calibration";
import type { CurveDigitizationResult } from "../../vibro/curveDigitizer";
import type { RenderedPdfPage } from "../../vibro/pdfPage";
import type { CptCalibration } from "../../vibro/types";

interface VibroPdfViewportProps {
  renderedPage: RenderedPdfPage;
  calibration: CptCalibration;
  digitization: CurveDigitizationResult | null;
}

export default function VibroPdfViewport({
  renderedPage,
  calibration,
  digitization,
}: VibroPdfViewportProps) {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const curvePath = useMemo(
    () => createCurvePath(digitization, calibration),
    [calibration, digitization],
  );

  useEffect(() => {
    const host = canvasHostRef.current;
    const canvas = renderedPage.canvas;
    if (host === null) return;

    canvas.className = "vibro-pdf-canvas";
    canvas.setAttribute("aria-label", "Originele sonderingspagina");
    host.replaceChildren(canvas);

    return () => {
      if (canvas.parentElement === host) {
        host.removeChild(canvas);
      }
    };
  }, [renderedPage]);

  const { left, top, right, bottom } = calibration.plotBoundsPx;

  return (
    <div
      className="vibro-pdf-sheet"
      style={{ aspectRatio: `${renderedPage.width} / ${renderedPage.height}` }}
    >
      <div className="vibro-pdf-canvas-host" ref={canvasHostRef} />
      <svg
        className="vibro-pdf-overlay"
        viewBox={`0 0 ${renderedPage.width} ${renderedPage.height}`}
        aria-label="Controlelaag met diagramgrenzen en gedigitaliseerde curve"
      >
        {digitization?.uncertainDepthRanges.map((range) => {
          const firstY = depthToBoundedPixel(
            range.topNapM,
            calibration,
          );
          const secondY = depthToBoundedPixel(
            range.bottomNapM,
            calibration,
          );
          return (
            <rect
              className="vibro-overlay-uncertain"
              key={`${range.topNapM}-${range.bottomNapM}`}
              x={left}
              y={Math.min(firstY, secondY)}
              width={right - left}
              height={Math.max(2, Math.abs(secondY - firstY))}
            />
          );
        })}
        <rect
          className="vibro-overlay-bounds"
          x={left}
          y={top}
          width={right - left}
          height={bottom - top}
        />
        {curvePath !== "" && (
          <>
            <path className="vibro-overlay-curve-halo" d={curvePath} />
            <path className="vibro-overlay-curve" d={curvePath} />
          </>
        )}
      </svg>
    </div>
  );
}

function createCurvePath(
  digitization: CurveDigitizationResult | null,
  calibration: CptCalibration,
): string {
  if (digitization === null) return "";

  return digitization.points
    .filter((point) =>
      isBetween(
        point.depthNapM,
        calibration.depthTopNapM,
        calibration.depthBottomNapM,
      )
      && isBetween(point.qcMpa, calibration.qcMinMpa, calibration.qcMaxMpa))
    .map((point, index) => {
      const x = qcToPixel(point.qcMpa, calibration);
      const y = depthNapToPixel(point.depthNapM, calibration);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function depthToBoundedPixel(
  depthNapM: number,
  calibration: CptCalibration,
): number {
  const minimum = Math.min(
    calibration.depthTopNapM,
    calibration.depthBottomNapM,
  );
  const maximum = Math.max(
    calibration.depthTopNapM,
    calibration.depthBottomNapM,
  );
  return depthNapToPixel(
    Math.min(maximum, Math.max(minimum, depthNapM)),
    calibration,
  );
}

function isBetween(value: number, first: number, second: number): boolean {
  return value >= Math.min(first, second) && value <= Math.max(first, second);
}
