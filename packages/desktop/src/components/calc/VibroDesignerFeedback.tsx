import type { CurveDigitizationResult } from "../../vibro/curveDigitizer";
import type { DigitizationQuality } from "../../vibro/designerQuality";

export type DesignerStage =
  | "empty"
  | "loading"
  | "calibrating"
  | "review"
  | "ready"
  | "error";

export function StageBadge({ stage }: { stage: DesignerStage }) {
  const labels: Record<DesignerStage, string> = {
    empty: "Geen PDF",
    loading: "Laden",
    calibrating: "Kalibreren",
    review: "Controleren",
    ready: "Gereed",
    error: "Fout",
  };
  return <span className={`vibro-stage-badge is-${stage}`}>{labels[stage]}</span>;
}

export function EmptyOrLoadingState({
  stage,
  errorMessage,
}: {
  stage: DesignerStage;
  errorMessage: string;
}) {
  if (stage === "loading") {
    return (
      <div className="vibro-empty-state" role="status">
        <span className="vibro-loader" />
        <h3>PDF-pagina wordt opgebouwd</h3>
        <p>De geselecteerde pagina wordt op meetresolutie gerenderd.</p>
      </div>
    );
  }
  if (stage === "error") {
    return (
      <div className="vibro-empty-state vibro-empty-error" role="alert">
        <h3>PDF verwerken mislukt</h3>
        <p>{errorMessage}</p>
        <small>Kies de PDF opnieuw of controleer of het bestand leesbaar is.</small>
      </div>
    );
  }
  return (
    <div className="vibro-empty-state">
      <div className="vibro-empty-mark" aria-hidden="true">qc</div>
      <h3>Selecteer een grondonderzoek</h3>
      <p>
        Kies een lokale PDF om één sonderingspagina te kalibreren en de
        gemeten qc-curve controleerbaar over te nemen.
      </p>
    </div>
  );
}

export function QualityPanel({
  digitization,
  quality,
  acceptedPointCount,
  stage,
}: {
  digitization: CurveDigitizationResult | null;
  quality: DigitizationQuality | null;
  acceptedPointCount: number;
  stage: DesignerStage;
}) {
  if (digitization === null || quality === null) {
    return (
      <div className="vibro-quality-panel">
        <strong>Nog niet beoordeeld</strong>
        <span>Stel de diagramgrenzen in en bepaal daarna de curve.</span>
      </div>
    );
  }

  const ready = quality.blockers.length === 0;
  return (
    <div
      className={`vibro-quality-panel ${ready ? "is-valid" : "is-blocked"}`}
      role={ready ? "status" : "alert"}
    >
      <div className="vibro-quality-summary">
        <strong>
          {stage === "ready"
            ? `Kalibratie geaccepteerd · ${acceptedPointCount} meetpunten`
            : ready
              ? "Kalibratie klaar voor acceptatie"
              : "Kalibratie geblokkeerd"}
        </strong>
        <span>{Math.round(digitization.coverage * 100)}% curvedekking</span>
      </div>
      {quality.blockers.length > 0 && (
        <ul>
          {quality.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
        </ul>
      )}
      {digitization.warnings.length > 0 && (
        <p>{digitization.warnings.join(" ")}</p>
      )}
    </div>
  );
}
