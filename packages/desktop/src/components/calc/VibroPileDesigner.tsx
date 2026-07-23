import { useLayoutEffect, useMemo } from "react";
import { useVibroDesignerStore } from "../../store/vibroDesignerStore";
import { validateCalibration } from "../../vibro/calibration";
import {
  digitizeQcCurve,
} from "../../vibro/curveDigitizer";
import {
  evaluateDigitizationQuality,
} from "../../vibro/designerQuality";
import {
  getPdfRenderScaleError,
  renderPdfPage,
  type RenderedPdfPage,
} from "../../vibro/pdfPage";
import type { CptCalibration } from "../../vibro/types";
import VibroCalibrationPanel, {
  type CalibrationNumberField,
} from "./VibroCalibrationPanel";
import {
  EmptyOrLoadingState,
  QualityPanel,
  StageBadge,
} from "./VibroDesignerFeedback";
import VibroPdfViewport from "./VibroPdfViewport";
import "./VibroPileDesigner.css";

export type { DesignerStage } from "./VibroDesignerFeedback";

interface PickedPdf {
  source: string | Uint8Array;
  name: string;
}

interface VibroPileDesignerProps {
  documentRevision: number;
}

export default function VibroPileDesigner({
  documentRevision,
}: VibroPileDesignerProps) {
  const {
    documentRevision: workflowDocumentRevision,
    stage,
    isReloading,
    pdfSource,
    pdfName,
    pageIndex,
    renderScale,
    renderScaleError,
    renderedPage,
    calibration,
    relevantRange,
    digitization,
    acceptedPoints,
    errorMessage,
    updateWorkflow,
    bindDocument,
    beginRenderRequest,
    isCurrentRenderRequest,
  } = useVibroDesignerStore();

  useLayoutEffect(() => {
    bindDocument(documentRevision);
  }, [bindDocument, documentRevision]);

  const quality = useMemo(
    () => digitization === null
      ? null
      : evaluateDigitizationQuality(digitization, relevantRange),
    [digitization, relevantRange],
  );

  const choosePdf = async () => {
    try {
      const picked = await pickPdf();
      if (
        picked === null
        || useVibroDesignerStore.getState().documentRevision
          !== documentRevision
      ) {
        return;
      }

      updateWorkflow({
        pdfSource: picked.source,
        pdfName: picked.name,
        pageIndex: 0,
        renderScaleError: "",
      });
      await loadPage(picked.source, 0, renderScale);
    } catch (error) {
      if (
        useVibroDesignerStore.getState().documentRevision
        === documentRevision
      ) {
        showError(error);
      }
    }
  };

  const loadPage = async (
    source: string | Uint8Array,
    nextPageIndex: number,
    nextScale: number,
  ) => {
    const requestId = beginRenderRequest();
    const reloadInProgress = useVibroDesignerStore.getState();
    updateWorkflow({
      stage: "loading",
      isReloading:
        reloadInProgress.renderedPage !== null
        || reloadInProgress.isReloading,
      renderedPage: null,
      calibration: null,
      digitization: null,
      acceptedPoints: [],
      errorMessage: "",
    });
    try {
      const page = await renderPdfPage(source, nextPageIndex, nextScale);
      if (!isCurrentRenderRequest(requestId)) return;

      const nextCalibration = defaultCalibration(
        page,
        nextPageIndex,
      );
      updateWorkflow({
        pageIndex: nextPageIndex,
        renderedPage: page,
        calibration: nextCalibration,
        relevantRange: {
          topNapM: nextCalibration.depthTopNapM,
          bottomNapM: nextCalibration.depthBottomNapM,
        },
        digitization: null,
        acceptedPoints: [],
        stage: "calibrating",
        isReloading: false,
        errorMessage: "",
      });
    } catch (error) {
      if (isCurrentRenderRequest(requestId)) {
        showError(error);
      }
    }
  };

  const showError = (error: unknown) => {
    updateWorkflow({
      errorMessage:
        error instanceof Error
          ? error.message
          : "De PDF kon niet worden verwerkt.",
      stage: "error",
      isReloading: false,
    });
  };

  const changePage = (nextPageIndex: number) => {
    if (pdfSource === null) return;
    updateWorkflow({ pageIndex: nextPageIndex });
    void loadPage(pdfSource, nextPageIndex, renderScale);
  };

  const changeRenderScale = (value: number) => {
    const validationError = getPdfRenderScaleError(value);
    if (validationError !== null) {
      updateWorkflow({ renderScaleError: validationError });
      return;
    }

    updateWorkflow({
      renderScale: value,
      renderScaleError: "",
      errorMessage: "",
    });
    if (pdfSource !== null) void loadPage(pdfSource, pageIndex, value);
  };

  const changeCalibration = (
    field: CalibrationNumberField,
    value: number,
  ) => {
    if (calibration === null) return;
    const nextCalibration = field in calibration.plotBoundsPx
      ? {
        ...calibration,
        plotBoundsPx: {
          ...calibration.plotBoundsPx,
          [field]: value,
        },
      }
      : { ...calibration, [field]: value };
    updateWorkflow({
      calibration: nextCalibration,
      digitization: null,
      acceptedPoints: [],
      errorMessage: "",
      stage: "calibrating",
    });
  };

  const determineCurve = () => {
    if (
      stage !== "calibrating"
      && stage !== "review"
      && stage !== "ready"
    ) {
      return;
    }
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
      updateWorkflow({
        digitization: digitizeQcCurve(image, calibration),
        acceptedPoints: [],
        stage: "review",
        errorMessage: "",
      });
    } catch (error) {
      showError(error);
    }
  };

  const acceptCalibration = () => {
    if (
      stage !== "review"
      || workflowDocumentRevision !== documentRevision
      || digitization === null
      || quality === null
      || quality.blockers.length > 0
    ) {
      return;
    }
    updateWorkflow({
      acceptedPoints: digitization.points.map((point) => ({ ...point })),
      stage: "ready",
    });
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
      <span
        className="vibro-sr-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="PDF-laadstatus"
      >
        {stage === "loading"
          ? isReloading
            ? "PDF-pagina wordt opnieuw geladen."
            : "PDF-pagina wordt geladen."
          : ""}
      </span>

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
              renderScaleError={renderScaleError}
              relevantRange={relevantRange}
              canAccept={
                stage === "review"
                && digitization !== null
                && quality !== null
                && quality.blockers.length === 0
              }
              onPageChange={changePage}
              onRenderScaleChange={changeRenderScale}
              onCalibrationChange={changeCalibration}
              onRelevantRangeChange={(range) => {
                updateWorkflow({
                  relevantRange: range,
                  acceptedPoints: [],
                  stage: digitization === null ? "calibrating" : "review",
                });
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
