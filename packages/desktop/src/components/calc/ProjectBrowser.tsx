import { useState } from "react";
import { modulesPerTemplate } from "./projectTree";
import { useProjectStore, PROJECT_ID, type Exemplaar } from "../../store/projectStore";
import { useModuleKiezer } from "../../store/moduleKiezer";
import "./ProjectBrowser.css";

/** Eén rekenblad in het project, met hernoemen en de knopjes ernaast. */
function ExemplaarRij({
  ex,
  geselecteerd,
  metNaamInvoer,
  onNaamKlaar,
}: {
  ex: Exemplaar;
  geselecteerd: boolean;
  /** Net ingevoegd: begin direct in de naamgeef-stand. */
  metNaamInvoer: boolean;
  onNaamKlaar: () => void;
}) {
  const selecteer = useProjectStore((s) => s.selecteer);
  const hernoem = useProjectStore((s) => s.hernoem);
  const dupliceer = useProjectStore((s) => s.dupliceer);
  const verwijder = useProjectStore((s) => s.verwijder);
  const verplaats = useProjectStore((s) => s.verplaats);
  const [zelfBewerken, setZelfBewerken] = useState(false);
  const bewerken = zelfBewerken || metNaamInvoer;
  const stopBewerken = () => {
    setZelfBewerken(false);
    onNaamKlaar();
  };

  const info = modulesPerTemplate[ex.templateId];
  const status = info?.status;
  const bolletje = status === "concept" ? "○" : status ? "●" : "○";

  if (bewerken) {
    return (
      <div className="tree-item exemplaar-rij selected">
        <span className={`tree-item-icon${status ? ` tree-status-${status}` : ""}`}>{bolletje}</span>
        <input
          className="exemplaar-naam-input"
          defaultValue={ex.naam}
          autoFocus
          // Alles geselecteerd, zodat je bij een vers blad meteen "Dak" kunt
          // typen zonder eerst de voorgestelde naam weg te halen.
          onFocus={(e) => e.target.select()}
          onBlur={(e) => {
            const naam = e.target.value.trim();
            if (naam) hernoem(ex.id, naam);
            stopBewerken();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") stopBewerken();
          }}
        />
      </div>
    );
  }

  return (
    <div className={`tree-item exemplaar-rij${geselecteerd ? " selected" : ""}`}>
      <button
        className="exemplaar-open"
        onClick={() => selecteer(ex.id)}
        onDoubleClick={() => setZelfBewerken(true)}
        title={`${ex.naam}${info ? ` — ${info.label}` : ""}\nDubbelklik om te hernoemen`}
      >
        <span className={`tree-item-icon${status ? ` tree-status-${status}` : ""}`}>{bolletje}</span>
        <span className="tree-item-label">{ex.naam}</span>
      </button>
      <span className="exemplaar-acties">
        <button title="Omhoog" onClick={() => verplaats(ex.id, -1)}>↑</button>
        <button title="Omlaag" onClick={() => verplaats(ex.id, 1)}>↓</button>
        <button title="Hernoemen" onClick={() => setZelfBewerken(true)}>✎</button>
        <button title="Dupliceren (kopie met dezelfde invoer)" onClick={() => dupliceer(ex.id)}>⧉</button>
        <button
          title="Verwijderen"
          onClick={() => {
            if (confirm(`"${ex.naam}" uit het project verwijderen?`)) verwijder(ex.id);
          }}
        >
          ✕
        </button>
      </span>
    </div>
  );
}

export default function ProjectBrowser() {
  const [collapsed, setCollapsed] = useState(false);
  // Een vers ingevoegd blad opent meteen met de naam in bewerkstand; zie
  // store/moduleKiezer.ts.
  const nieuwId = useModuleKiezer((s) => s.nieuwId);
  const naamKlaar = useModuleKiezer((s) => s.naamKlaar);
  const openModuleKiezer = useModuleKiezer((s) => s.openen);

  const exemplaren = useProjectStore((s) => s.exemplaren);
  const activeId = useProjectStore((s) => s.activeId);
  const selecteer = useProjectStore((s) => s.selecteer);
  const projectNaam = useProjectStore((s) => s.projectNaam);

  return (
    <aside className={`project-browser${collapsed ? " collapsed" : ""}`}>
      <div className="project-browser-header">
        {!collapsed && <span className="project-browser-title">Project</span>}
        <button
          className="project-browser-toggle"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Zijpaneel uitklappen" : "Zijpaneel inklappen"}
        >
          {collapsed ? "▶" : "◀"}
        </button>
      </div>

      {!collapsed && (
        <div className="project-browser-tree">
          {/* Het project zelf: de bladen die je hebt toegevoegd. */}
          <div className="tree-section">
            <div className="tree-section-header">
              <span className="tree-section-label">{projectNaam || "Project"}</span>
            </div>
            <div className="tree-section-children">
              <button
                className={`tree-item tree-item-emphasis${activeId === PROJECT_ID ? " selected" : ""}`}
                onClick={() => selecteer(PROJECT_ID)}
                title="Projectgegevens — gelden voor alle bladen in dit project"
              >
                <span className="tree-item-label">Projectgegevens</span>
              </button>

              {exemplaren.length === 0 && (
                <p className="project-leeg">
                  Nog geen rekenbladen. Voeg er een toe met <b>Module</b> in het lint.
                </p>
              )}

              {exemplaren.map((ex) => (
                <ExemplaarRij
                  key={ex.id}
                  ex={ex}
                  geselecteerd={ex.id === activeId}
                  metNaamInvoer={ex.id === nieuwId}
                  onNaamKlaar={naamKlaar}
                />
              ))}
            </div>
          </div>

          <button className="tree-item tree-item-toevoegen" onClick={openModuleKiezer}
            title="Een module of een naslagblad aan dit project toevoegen">
            <span className="tree-item-icon">+</span>
            <span className="tree-item-label">Module toevoegen…</span>
          </button>
        </div>
      )}
    </aside>
  );
}
