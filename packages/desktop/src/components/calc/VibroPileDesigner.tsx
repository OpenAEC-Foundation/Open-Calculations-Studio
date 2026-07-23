import { useMemo, useState } from "react";
import { validateCalibration } from "../../vibro/calibration";
import {
  digitizeQcCurve,
  type CurveDigitizationResult,
} from "../../vibro/curveDigitizer";
import {
  evaluateDigitizationQuality,
  type RelevantDepthRange,
} from "../../vibro/designerQuality";
import {
  renderPdfPage,
  type RenderedPdfPage,
} from "../../vibro/pdfPage";
import type {
  CptCalibration,
  DigitizedCptPoint,
} from "../../vibro/types";
import VibroCalibrationPanel, {
  type CalibrationNumberField,
} from "./VibroCalibrationPanel";
import {
  EmptyOrLoadingState,
  QualityPanel,
  StageBadge,
  type DesignerStage,
} from "./VibroDesignerFeedback";
import VibroPdfViewport from "./VibroPdfViewport";
import "./VibroPileDesigner.css";

export type { DesignerStage } from "./VibroDesignerFeedback";

interface PickedPdf {
  source: string | Uint8Array;
  name: string;
}

const DEFAULT_RENDER_SCALE = 2;

export default function VibroPileDesigner() {
  const [stage, setStage] = useState<DesignerStage>("empty");
  const [pdfSource, setPdfSource] = useState<string | Uint8Array | null>(null);
  const [pdfName, setPdfName] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [renderScale, setRenderScale] = useState(DEFAULT_RENDER_SCALE);
  const [renderedPage, setRenderedPage] = useState<RenderedPdfPage | null>(null);
  const [calibration, setCalibration] = useState<CptCalibration | null>(null);
  const [relevantRange, setRelevantRange] = useState<RelevantDepthRange>({
    topNapM: 1,
    bottomNapM: -25,
  });
  const [digitization, setDigitization] =
    useState<CurveDigitizationResult | null>(null);
  const [acceptedPoints, setAcceptedPoints] =
    useState<DigitizedCptPoint[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const quality = useMemo(
    () => digitization === null
      ? null
      : evaluateDigitizationQuality(digitization, relevantRange),
    [digitization, relevantRange],
  );

  const choosePdf = async () => {
    try {
      const picked = await pickPdf();
      if (picked === null) return;

      setPdfSource(picked.source);
      setPdfName(picked.name);
      setPageIndex(0);
      await loadPage(picked.source, 0, renderScale);
    } catch (error) {
      showError(error);
    }
  };

  const loadPage = async (
    source: string | Uint8Array,
    nextPageIndex: number,
    nextScale: number,
  ) => {
    setStage("loading");
    setErrorMessage("");
    try {
      const page = await renderPdfPage(source, nextPageIndex, nextScale);
      const nextCalibration = defaultCalibration(
        page,
        nextPageIndex,
      );
      setRenderedPage(page);
      setCalibration(nextCalibration);
      setRelevantRange({
        topNapM: nextCalibration.depthTopNapM,
        bottomNapM: nextCalibration.depthBottomNapM,
      });
      setDigitization(null);
      setAcceptedPoints([]);
      setStage("calibrating");
    } catch (error) {
      showError(error);
    }
  };

  const showError = (error: unknown) => {
    setErrorMessage(
      error instanceof Error ? error.message : "De PDF kon niet worden verwerkt.",
    );
    setStage("error");
  };

  const changePage = (nextPageIndex: number) => {
    if (pdfSource === null) return;
    setPageIndex(nextPageIndex);
    void loadPage(pdfSource, nextPageIndex, renderScale);
  };

  const changeRenderScale = (value: number) => {
    setRenderScale(value);
    if (pdfSource !== null && Number.isFinite(value) && value > 0) {
      void loadPage(pdfSource, pageIndex, value);
    }
  };

  const changeCalibration = (
    field: CalibrationNumberField,
    value: number,
  ) => {
    setCalibration((current) => {
      if (current === null) return current;
      if (field in current.plotBoundsPx) {
        return {
          ...current,
          plotBoundsPx: {
            ...current.plotBoundsPx,
            [field]: value,
          },
        };
      }
      return { ...current, [field]: value };
    });
    setDigitization(null);
    setAcceptedPoints([]);
    setErrorMessage("");
    setStage("calibrating");
  };

  const determineCurve = () => {
    if (renderedPage === null || calibration === null) return;
    try {
      const errors = validateCalibration(calibration);
      const { left, top, right, bottom } = calibration.plotBoundsPx;
      if (
        left < 0
        || top < 0
        || right >= renderedPage.width
        || bottom >= renderedPage.height
      ) {
        errors.push("De diagramgrenzen moeten binnen de PDF-pagina vallen");
      }
      if (errors.length > 0) {
        throw new RangeError(errors.join(". "));
      }

      const context = renderedPage.canvas.getContext(
        "2d",
        { willReadFrequently: true },
      );
      if (context === null) {
        throw new Error("De PDF-pixels zijn niet beschikbaar.");
      }
      const image = context.getImageData(
        0,
        0,
        renderedPage.width,
        renderedPage.height,
      );
      setDigitization(digitizeQcCurve(image, calibration));
      setAcceptedPoints([]);
      setStage("review");
      setErrorMessage("");
    } catch (error) {
      showError(error);
    }
  };

  const acceptCalibration = () => {
    if (
      digitization === null
      || quality === null
      || quality.blockers.length > 0
    ) {
      return;
    }
    setAcceptedPoints(digitization.points.map((point) => ({ ...point })));
    setStage("ready");
  };

  return (
    <section className="vibro-designer" data-stage={stage}>
      <header className="vibro-designer-header">
        <div>
          <span className="vibro-kicker">PDF-kalibratie</span>
          <h2>VIBRO-paal</h2>
        </div>
        <StageBadge stage={stage} />
      </header>

      <div className="vibro-designer-toolbar">
        <button
          className="vibro-button vibro-button-primary"
          type="button"
          onClick={() => void choosePdf()}
          disabled={stage === "loading"}
        >
          <PdfIcon />
          Grondonderzoek-PDF kiezen
        </button>
        {pdfName !== "" && (
          <span className="vibro-file-name" title={pdfName}>{pdfName}</span>
        )}
      </div>

      {renderedPage === null || calibration === null ? (
        <EmptyOrLoadingState
          stage={stage}
          errorMessage={errorMessage}
        />
      ) : (
        <>
          {errorMessage !== "" && (
            <div className="vibro-inline-error" role="alert">{errorMessage}</div>
          )}
          <div className="vibro-workbench">
            <VibroCalibrationPanel
              renderedPage={renderedPage}
              calibration={calibration}
              pageIndex={pageIndex}
              renderScale={renderScale}
              relevantRange={relevantRange}
              canAccept={
                digitization !== null
                && quality !== null
                && quality.blockers.length === 0
              }
              onPageChange={changePage}
              onRenderScaleChange={changeRenderScale}
              onCalibrationChange={changeCalibration}
              onRelevantRangeChange={(range) => {
                setRelevantRange(range);
                setAcceptedPoints([]);
                setStage(digitization === null ? "calibrating" : "review");
              }}
              onDetermineCurve={determineCurve}
              onAcceptCalibration={acceptCalibration}
            />

            <main className="vibro-plot-panel">
              <div className="vibro-plot-meta">
                <span>{renderedPage.width} × {renderedPage.height} px</span>
                <span className="vibro-legend">
                  <i className="vibro-legend-line" /> qc-curve
                  <i className="vibro-legend-area" /> onzeker
                </span>
              </div>
              <div className="vibro-plot-scroll">
                <VibroPdfViewport
                  renderedPage={renderedPage}
                  calibration={calibration}
                  digitization={digitization}
                />
              </div>
              <QualityPanel
                digitization={digitization}
                quality={quality}
                acceptedPointCount={acceptedPoints.length}
                stage={stage}
              />
            </main>
          </div>
        </>
      )}
    </section>
  );
}

function defaultCalibration(
  page: RenderedPdfPage,
  pageIndex: number,
): CptCalibration {
  return {
    pageIndex,
    plotBoundsPx: {
      left: Math.round(page.width * 0.1),
      top: Math.round(page.height * 0.08),
      right: Math.round(page.width * 0.55),
      bottom: Math.round(page.height * 0.92),
    },
    qcMinMpa: 0,
    qcMaxMpa: 20,
    depthTopNapM: 1,
    depthBottomNapM: -25,
  };
}

function PdfIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 2.75h7l4 4V21.25H7z" />
      <path d="M14 2.75v4h4M9.5 15.5h5M9.5 12h5" />
    </svg>
  );
}

async function pickPdf(): Promise<PickedPdf | null> {
  if (isTauriRuntime()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const path = await open({
      title: "Grondonderzoek-PDF kiezen",
      multiple: false,
      directory: false,
      filters: [{ name: "PDF-document", extensions: ["pdf"] }],
    });
    if (typeof path !== "string") return null;
    return {
      source: path,
      name: path.split(/[\\/]/).pop() ?? path,
    };
  }

  return new Promise<PickedPdf | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf,.pdf";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file === undefined) {
        resolve(null);
        return;
      }
      resolve({
        source: new Uint8Array(await file.arrayBuffer()),
        name: file.name,
      });
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined"
    && "__TAURI_INTERNALS__" in window;
}
