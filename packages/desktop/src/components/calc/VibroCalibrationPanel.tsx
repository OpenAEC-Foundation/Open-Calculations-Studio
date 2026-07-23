import { useEffect, useId, useState } from "react";
import type { RelevantDepthRange } from "../../vibro/designerQuality";
import type { RenderedPdfPage } from "../../vibro/pdfPage";
import type { CptCalibration, PlotBoundsPx } from "../../vibro/types";

export type CalibrationNumberField =
  | keyof PlotBoundsPx
  | "qcMinMpa"
  | "qcMaxMpa"
  | "depthTopNapM"
  | "depthBottomNapM";

interface VibroCalibrationPanelProps {
  renderedPage: RenderedPdfPage;
  calibration: CptCalibration;
  pageIndex: number;
  renderScale: number;
  renderScaleError: string;
  relevantRange: RelevantDepthRange;
  canAccept: boolean;
  onPageChange: (pageIndex: number) => void;
  onRenderScaleChange: (scale: number) => void;
  onCalibrationChange: (
    field: CalibrationNumberField,
    value: number,
  ) => void;
  onRelevantRangeChange: (range: RelevantDepthRange) => void;
  onDetermineCurve: () => void;
  onAcceptCalibration: () => void;
}

export default function VibroCalibrationPanel({
  renderedPage,
  calibration,
  pageIndex,
  renderScale,
  renderScaleError,
  relevantRange,
  canAccept,
  onPageChange,
  onRenderScaleChange,
  onCalibrationChange,
  onRelevantRangeChange,
  onDetermineCurve,
  onAcceptCalibration,
}: VibroCalibrationPanelProps) {
  return (
    <aside className="vibro-calibration-panel">
      <ControlSection title="Pagina">
        <label className="vibro-field">
          <span>PDF-pagina</span>
          <select
            value={pageIndex}
            onChange={(event) => onPageChange(Number(event.target.value))}
          >
            {Array.from(
              { length: renderedPage.pageCount },
              (_, index) => (
                <option value={index} key={index}>
                  Pagina {index + 1}
                </option>
              ),
            )}
          </select>
        </label>
        <NumberField
          label="Renderschaal"
          value={renderScale}
          min={0.5}
          max={4}
          step={0.25}
          error={renderScaleError}
          onCommit={onRenderScaleChange}
        />
      </ControlSection>

      <ControlSection title="Diagramgrenzen in pixels">
        <div className="vibro-field-grid">
          <NumberField
            label="Links"
            value={calibration.plotBoundsPx.left}
            onChange={(value) => onCalibrationChange("left", value)}
          />
          <NumberField
            label="Rechts"
            value={calibration.plotBoundsPx.right}
            onChange={(value) => onCalibrationChange("right", value)}
          />
          <NumberField
            label="Boven"
            value={calibration.plotBoundsPx.top}
            onChange={(value) => onCalibrationChange("top", value)}
          />
          <NumberField
            label="Onder"
            value={calibration.plotBoundsPx.bottom}
            onChange={(value) => onCalibrationChange("bottom", value)}
          />
        </div>
      </ControlSection>

      <ControlSection title="Assen en NAP-schaal">
        <div className="vibro-field-grid">
          <NumberField
            label="qc minimum (MPa)"
            value={calibration.qcMinMpa}
            step={0.1}
            onChange={(value) => onCalibrationChange("qcMinMpa", value)}
          />
          <NumberField
            label="qc maximum (MPa)"
            value={calibration.qcMaxMpa}
            step={0.1}
            onChange={(value) => onCalibrationChange("qcMaxMpa", value)}
          />
          <NumberField
            label="Bovenkant (m NAP)"
            value={calibration.depthTopNapM}
            step={0.1}
            onChange={(value) => onCalibrationChange("depthTopNapM", value)}
          />
          <NumberField
            label="Onderkant (m NAP)"
            value={calibration.depthBottomNapM}
            step={0.1}
            onChange={(value) => onCalibrationChange("depthBottomNapM", value)}
          />
        </div>
      </ControlSection>

      <ControlSection title="Relevant rekentraject">
        <div className="vibro-field-grid">
          <NumberField
            label="Bovenkant (m NAP)"
            value={relevantRange.topNapM}
            step={0.1}
            onChange={(topNapM) => onRelevantRangeChange({
              ...relevantRange,
              topNapM,
            })}
          />
          <NumberField
            label="Onderkant (m NAP)"
            value={relevantRange.bottomNapM}
            step={0.1}
            onChange={(bottomNapM) => onRelevantRangeChange({
              ...relevantRange,
              bottomNapM,
            })}
          />
        </div>
      </ControlSection>

      <div className="vibro-actions">
        <button
          className="vibro-button vibro-button-secondary"
          type="button"
          onClick={onDetermineCurve}
        >
          Curve opnieuw bepalen
        </button>
        <button
          className="vibro-button vibro-button-primary"
          type="button"
          onClick={onAcceptCalibration}
          disabled={!canAccept}
        >
          Kalibratie accepteren
        </button>
      </div>
    </aside>
  );
}

function ControlSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="vibro-control-section">
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  error = "",
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  error?: string;
  onChange?: (value: number) => void;
  onCommit?: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const errorId = useId();

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const next = Number(draft);
    if (!Number.isFinite(next)) {
      setDraft(String(value));
      return;
    }
    onChange?.(next);
    onCommit?.(next);
  };

  return (
    <label className="vibro-field">
      <span>{label}</span>
      <input
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        aria-invalid={error !== ""}
        aria-describedby={error !== "" ? errorId : undefined}
        onChange={(event) => {
          setDraft(event.target.value);
          if (onChange !== undefined && event.target.value.trim() !== "") {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onChange(next);
          }
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
      />
      {error !== "" && (
        <small className="vibro-field-error" id={errorId}>{error}</small>
      )}
    </label>
  );
}
