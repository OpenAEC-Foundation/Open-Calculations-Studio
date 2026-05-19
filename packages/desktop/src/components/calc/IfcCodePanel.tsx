import { useState } from "react";
import { ifc4x3Sample, ifcxSample } from "./ifcSamples";
import "./IfcCodePanel.css";

type IfcView = "ifc4x3" | "ifcx" | "split";

export default function IfcCodePanel() {
  const [view, setView] = useState<IfcView>("split");

  return (
    <div className="ifc-code-panel">
      <header className="ifc-code-header">
        <h2 className="ifc-code-title">IFC export voorbeeld</h2>
        <p className="ifc-code-subtitle">
          Automatisch gegenereerde IFC4x3 (ISO 16739-1) en IFCX (volgende-generatie) representaties
          van een paaldraagvermogen-toetsing. Wijzig de berekening in het Start-tabblad en de IFC
          output wordt bijgewerkt bij volgende export.
        </p>
        <div className="ifc-code-tabs">
          <button
            className={`ifc-code-tab${view === "split" ? " active" : ""}`}
            onClick={() => setView("split")}
            type="button"
          >
            Beide
          </button>
          <button
            className={`ifc-code-tab${view === "ifc4x3" ? " active" : ""}`}
            onClick={() => setView("ifc4x3")}
            type="button"
          >
            IFC4x3 (STEP)
          </button>
          <button
            className={`ifc-code-tab${view === "ifcx" ? " active" : ""}`}
            onClick={() => setView("ifcx")}
            type="button"
          >
            IFCX (JSON)
          </button>
        </div>
      </header>

      <div className={`ifc-code-body view-${view}`}>
        {view !== "ifcx" && (
          <section className="ifc-code-section">
            <div className="ifc-code-label">
              <span className="ifc-code-badge">IFC4x3</span>
              <span className="ifc-code-format">.ifc · STEP physical file (SPF)</span>
            </div>
            <pre className="ifc-code-block ifc-code-step">{ifc4x3Sample}</pre>
          </section>
        )}
        {view !== "ifc4x3" && (
          <section className="ifc-code-section">
            <div className="ifc-code-label">
              <span className="ifc-code-badge">IFCX</span>
              <span className="ifc-code-format">.ifcx · JSON-LD (draft)</span>
            </div>
            <pre className="ifc-code-block ifc-code-json">{ifcxSample}</pre>
          </section>
        )}
      </div>
    </div>
  );
}
