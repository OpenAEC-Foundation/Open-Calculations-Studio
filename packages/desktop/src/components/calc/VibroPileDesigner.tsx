import { useLayoutEffect, useMemo, useState } from "react";
import { useDocumentStore } from "../../store/documentStore";
import { useVibroDesignerStore } from "../../store/vibroDesignerStore";
import { validateCalibration } from "../../vibro/calibration";
import {
  digitizeQcCurve,
} from "../../vibro/curveDigitizer";
import {
  evaluateDigitizationQuality,
} from "../../vibro/designerQuality";
import {
  calculatePileResistance,
  clipPositiveShaftLayers,
} from "../../vibro/geotechnical";
import {
  getPdfRenderScaleError,
  renderPdfPage,
  type RenderedPdfPage,
} from "../../vibro/pdfPage";
import { generateVibroPileSheet } from "../../vibro/sheetGenerator";
import type {
  CptCalibration,
  NegativeSkinLayer,
  VibroPileInput,
} from "../../vibro/types";
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
  const loadTemplate = useDocumentStore((state) => state.loadTemplate);
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
    pileInput,
    inputError,
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

  const generateSheet = () => {
    if (
      stage !== "ready"
      || calibration === null
      || acceptedPoints.length === 0
      || pdfName === ""
    ) {
      return;
    }
    try {
      const pileTipsNapM = Array.from(
        { length: 8 },
        (_, index) => -18.5 - index * 0.5,
      );
      const results = pileTipsNapM.map((pileTipNapM) =>
        calculatePileResistance(acceptedPoints, {
          ...pileInput,
          pileTipNapM,
          positiveShaftLayers: clipPositiveShaftLayers(
            pileInput.positiveShaftLayers,
            pileTipNapM,
            pileInput.positiveShaftStartNapM,
          ),
        }));
      const source = generateVibroPileSheet({
        sourceFileName: pdfName,
        calibration,
        points: acceptedPoints,
        input: pileInput,
        results,
      });
      updateWorkflow({ inputError: "" });
      loadTemplate(source, "VIBRO-paal sondering 1");
    } catch (error) {
      updateWorkflow({
        inputError:
          error instanceof Error
            ? error.message
            : "De paal- en grondinvoer is ongeldig.",
      });
    }
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
        {stage === "ready" && (
          <button
            className="vibro-button vibro-button-primary"
            type="button"
            onClick={generateSheet}
          >
            Rekensheet genereren
          </button>
        )}
      </div>

      {calibration !== null && (
        <PileInputPanel
          input={pileInput}
          onChange={(nextInput) => updateWorkflow({
            pileInput: nextInput,
            inputError: "",
          })}
        />
      )}
      {inputError !== "" && (
        <div className="vibro-inline-error" role="alert">{inputError}</div>
      )}

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

type PileScalarField = Exclude<
  keyof VibroPileInput,
  "positiveShaftLayers" | "negativeSkinLayers"
>;

interface PileInputPanelProps {
  input: VibroPileInput;
  onChange: (input: VibroPileInput) => void;
}

function PileInputPanel({
  input,
  onChange,
}: PileInputPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const changeScalar = (field: PileScalarField, value: number) => {
    const next = { ...input, [field]: value };
    if (field === "pileHeadNapM" && next.negativeSkinLayers.length > 0) {
      next.negativeSkinLayers = next.negativeSkinLayers.map((layer, index) =>
        index === 0 ? { ...layer, topNapM: value } : layer);
    }
    if (
      field === "positiveShaftStartNapM"
      && next.negativeSkinLayers.length > 0
    ) {
      const lastIndex = next.negativeSkinLayers.length - 1;
      next.negativeSkinLayers = next.negativeSkinLayers.map((layer, index) =>
        index === lastIndex ? { ...layer, bottomNapM: value } : layer);
      next.positiveShaftLayers = next.positiveShaftLayers.map(
        (layer, index, layers) =>
          index === layers.length - 1 ? { ...layer, topNapM: value } : layer,
      );
    }
    onChange(next);
  };

  const changeNegativeLayer = (
    index: number,
    field: keyof NegativeSkinLayer,
    value: number,
  ) => {
    const layers = input.negativeSkinLayers.map((layer, layerIndex) =>
      layerIndex === index ? { ...layer, [field]: value } : { ...layer });
    const next = { ...input, negativeSkinLayers: layers };

    if (field === "topNapM") {
      if (index === 0) {
        next.pileHeadNapM = value;
      } else {
        layers[index - 1]!.bottomNapM = value;
      }
    }
    if (field === "bottomNapM") {
      if (index === layers.length - 1) {
        next.positiveShaftStartNapM = value;
        next.positiveShaftLayers = input.positiveShaftLayers.map(
          (layer, layerIndex, positiveLayers) =>
            layerIndex === positiveLayers.length - 1
              ? { ...layer, topNapM: value }
              : layer,
        );
      } else {
        layers[index + 1]!.topNapM = value;
      }
    }
    onChange(next);
  };

  const addNegativeLayer = () => {
    const layers = input.negativeSkinLayers;
    if (layers.length === 0) {
      onChange({
        ...input,
        negativeSkinLayers: [createNegativeSkinLayer(
          input.pileHeadNapM,
          input.positiveShaftStartNapM,
        )],
      });
      return;
    }

    const last = layers[layers.length - 1]!;
    const boundaryNapM = (last.topNapM + last.bottomNapM) / 2;
    const boundaryStressKpa =
      (last.effectiveStressTopKpa + last.effectiveStressBottomKpa) / 2;
    onChange({
      ...input,
      negativeSkinLayers: [
        ...layers.slice(0, -1),
        {
          ...last,
          bottomNapM: boundaryNapM,
          effectiveStressBottomKpa: boundaryStressKpa,
        },
        {
          ...last,
          topNapM: boundaryNapM,
          effectiveStressTopKpa: boundaryStressKpa,
        },
      ],
    });
  };

  const removeNegativeLayer = (index: number) => {
    if (input.negativeSkinLayers.length <= 1) return;
    const removed = input.negativeSkinLayers[index]!;
    const layers = input.negativeSkinLayers
      .filter((_, layerIndex) => layerIndex !== index)
      .map((layer) => ({ ...layer }));
    if (index === 0) {
      layers[0]!.topNapM = removed.topNapM;
      layers[0]!.effectiveStressTopKpa = removed.effectiveStressTopKpa;
    } else {
      layers[index - 1]!.bottomNapM = removed.bottomNapM;
      layers[index - 1]!.effectiveStressBottomKpa =
        removed.effectiveStressBottomKpa;
    }
    onChange({ ...input, negativeSkinLayers: layers });
  };

  return (
    <details
      className="vibro-pile-input-panel"
      open={isExpanded}
      onToggle={(event) => setIsExpanded(event.currentTarget.open)}
    >
      <summary>Paal-, belasting- en grondinvoer</summary>
      <div className="vibro-pile-input-content">
        <fieldset className="vibro-control-section">
          <legend>Paal en belasting</legend>
          <div className="vibro-field-grid">
            <PileNumberField
              label="Schachtdiameter (mm)"
              value={input.shaftDiameterMm}
              onChange={(value) => changeScalar("shaftDiameterMm", value)}
            />
            <PileNumberField
              label="Voetdiameter (mm)"
              value={input.baseDiameterMm}
              onChange={(value) => changeScalar("baseDiameterMm", value)}
            />
            <PileNumberField
              label="Paalkop (m NAP)"
              value={input.pileHeadNapM}
              onChange={(value) => changeScalar("pileHeadNapM", value)}
            />
            <PileNumberField
              label="Start positieve schacht (m NAP)"
              value={input.positiveShaftStartNapM}
              onChange={(value) =>
                changeScalar("positiveShaftStartNapM", value)}
            />
            <PileNumberField
              label="Ontwerpbelasting (kN)"
              value={input.designLoadKn}
              onChange={(value) => changeScalar("designLoadKn", value)}
            />
          </div>
        </fieldset>

        <fieldset className="vibro-control-section">
          <legend>Rekenfactoren</legend>
          <div className="vibro-field-grid">
            <PileNumberField
              label="Alpha p"
              value={input.alphaP}
              onChange={(value) => changeScalar("alphaP", value)}
            />
            <PileNumberField
              label="Alpha s"
              value={input.alphaS}
              onChange={(value) => changeScalar("alphaS", value)}
            />
            <PileNumberField
              label="Beta"
              value={input.beta}
              onChange={(value) => changeScalar("beta", value)}
            />
            <PileNumberField
              label="Vormfactor"
              value={input.shapeFactor}
              onChange={(value) => changeScalar("shapeFactor", value)}
            />
            <PileNumberField
              label="Xi enkele sondering"
              value={input.xiSingleCpt}
              onChange={(value) => changeScalar("xiSingleCpt", value)}
            />
            <PileNumberField
              label="Gamma b"
              value={input.gammaB}
              onChange={(value) => changeScalar("gammaB", value)}
            />
            <PileNumberField
              label="Gamma s"
              value={input.gammaS}
              onChange={(value) => changeScalar("gammaS", value)}
            />
          </div>
        </fieldset>

        <fieldset className="vibro-control-section vibro-negative-skin">
          <legend>Negatieve kleef</legend>
          {input.negativeSkinLayers.map((layer, index) => {
            const layerNumber = index + 1;
            return (
              <div className="vibro-layer-card" key={index}>
                <div className="vibro-layer-heading">
                  <strong>Laag {layerNumber}</strong>
                  {input.negativeSkinLayers.length > 1 && (
                    <button
                      className="vibro-button vibro-button-secondary"
                      type="button"
                      aria-label={`Negatieve-kleeflaag ${layerNumber} verwijderen`}
                      onClick={() => removeNegativeLayer(index)}
                    >
                      Verwijderen
                    </button>
                  )}
                </div>
                <div className="vibro-field-grid">
                  <PileNumberField
                    label={`Bovenkant laag ${layerNumber} (m NAP)`}
                    value={layer.topNapM}
                    onChange={(value) =>
                      changeNegativeLayer(index, "topNapM", value)}
                  />
                  <PileNumberField
                    label={`Onderkant laag ${layerNumber} (m NAP)`}
                    value={layer.bottomNapM}
                    onChange={(value) =>
                      changeNegativeLayer(index, "bottomNapM", value)}
                  />
                  <PileNumberField
                    label={`Effectieve spanning boven laag ${layerNumber} (kPa)`}
                    value={layer.effectiveStressTopKpa}
                    onChange={(value) =>
                      changeNegativeLayer(
                        index,
                        "effectiveStressTopKpa",
                        value,
                      )}
                  />
                  <PileNumberField
                    label={`Effectieve spanning onder laag ${layerNumber} (kPa)`}
                    value={layer.effectiveStressBottomKpa}
                    onChange={(value) =>
                      changeNegativeLayer(
                        index,
                        "effectiveStressBottomKpa",
                        value,
                      )}
                  />
                  <PileNumberField
                    label={`K0 laag ${layerNumber}`}
                    value={layer.k0}
                    onChange={(value) =>
                      changeNegativeLayer(index, "k0", value)}
                  />
                  <PileNumberField
                    label={`Tan delta laag ${layerNumber}`}
                    value={layer.tanDelta}
                    onChange={(value) =>
                      changeNegativeLayer(index, "tanDelta", value)}
                  />
                  <PileNumberField
                    label={`Gamma laag ${layerNumber}`}
                    value={layer.gamma}
                    onChange={(value) =>
                      changeNegativeLayer(index, "gamma", value)}
                  />
                </div>
              </div>
            );
          })}
          <button
            className="vibro-button vibro-button-secondary"
            type="button"
            onClick={addNegativeLayer}
          >
            Negatieve-kleeflaag toevoegen
          </button>
        </fieldset>
      </div>
    </details>
  );
}

interface PileNumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function PileNumberField({
  label,
  value,
  onChange,
}: PileNumberFieldProps) {
  return (
    <label className="vibro-field">
      <span>{label}</span>
      <input
        type="number"
        step="any"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function createNegativeSkinLayer(
  topNapM: number,
  bottomNapM: number,
): NegativeSkinLayer {
  return {
    topNapM,
    bottomNapM,
    effectiveStressTopKpa: 0,
    effectiveStressBottomKpa: 85,
    k0: 0.5,
    tanDelta: 0.35,
    gamma: 1,
  };
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
