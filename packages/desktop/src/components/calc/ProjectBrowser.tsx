import { useState } from "react";
import {
  moduleCatalogus,
  bibliotheek,
  modulesPerTemplate,
  STATUS_UITLEG,
  type TreeNode,
} from "./projectTree";
import { templates } from "../../templates";
import { useProjectStore, PROJECT_ID, type Exemplaar } from "../../store/projectStore";
import "./ProjectBrowser.css";

interface TreeProps {
  node: TreeNode;
  level: number;
  onInsert: (templateId: string, label: string) => void;
}

/** Catalogus-tak: klikken voegt een exemplaar toe aan het project. */
function CatalogusNode({ node, level, onInsert }: TreeProps) {
  const [expanded, setExpanded] = useState(
    node.kind === "category" ? !!node.defaultExpanded : true,
  );

  if (node.kind === "section") {
    return (
      <div className="tree-section-children">
        {node.children.map((child) => (
          <CatalogusNode key={child.id} node={child} level={level} onInsert={onInsert} />
        ))}
      </div>
    );
  }

  if (node.kind === "category") {
    return (
      <div className={`tree-category${level > 0 ? " tree-subcategory" : ""}`}>
        <button
          className="tree-category-header"
          style={{ paddingLeft: 8 + level * 12 }}
          onClick={() => setExpanded((e) => !e)}
        >
          <span className={`tree-chevron${expanded ? " expanded" : ""}`}>▶</span>
          <span className="tree-category-label">{node.label}</span>
          {node.count != null && <span className="tree-category-count">{node.count}</span>}
        </button>
        {expanded && (
          <div className="tree-children">
            {node.children.map((child) => (
              <CatalogusNode key={child.id} node={child} level={level + 1} onInsert={onInsert} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const heeftSjabloon = !!node.templateId && !!templates[node.templateId];
  const status = node.status;
  const bolletje = status === "concept" ? "○" : status ? "●" : heeftSjabloon ? "○" : "□";
  const uitleg = status
    ? `${node.label} — ${STATUS_UITLEG[status]}\nKlik om toe te voegen aan het project`
    : heeftSjabloon
      ? `${node.label} — klik om toe te voegen aan het project`
      : `${node.label} (nog niet beschikbaar)`;

  return (
    <button
      className={`tree-item${heeftSjabloon ? "" : " tree-item-disabled"}`}
      style={{ paddingLeft: 16 + level * 12 }}
      onClick={() => heeftSjabloon && node.templateId && onInsert(node.templateId, node.label)}
      title={uitleg}
    >
      <span className={`tree-item-icon${status ? ` tree-status-${status}` : ""}`}>{bolletje}</span>
      <span className="tree-item-label">{node.label}</span>
      {heeftSjabloon && <span className="tree-item-plus">+</span>}
    </button>
  );
}

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

/** Verklaring van de bolletjes, onder aan de boom. */
function StatusLegenda() {
  return (
    <div className="tree-legend">
      {(["gereed", "controleren", "concept"] as const).map((s) => (
        <span key={s} className="tree-legend-row" title={STATUS_UITLEG[s]}>
          <span className={`tree-item-icon tree-status-${s}`}>{s === "concept" ? "○" : "●"}</span>
          {s === "gereed" ? "gecalibreerd" : s === "controleren" ? "nog controleren" : "nog uit te werken"}
        </span>
      ))}
    </div>
  );
}

export default function ProjectBrowser() {
  const [collapsed, setCollapsed] = useState(false);
  const [toonCatalogus, setToonCatalogus] = useState(true);
  // Een vers ingevoegd blad opent meteen met de naam in bewerkstand: in een
  // project heet een balklaag eerder "Dak" of "Verdiepingsvloer" dan
  // "Balklaag 1". Typ je niets, dan blijft de voorgestelde naam staan.
  const [nieuwId, setNieuwId] = useState<string | null>(null);
  const [toonBibliotheek, setToonBibliotheek] = useState(false);

  const exemplaren = useProjectStore((s) => s.exemplaren);
  const activeId = useProjectStore((s) => s.activeId);
  const selecteer = useProjectStore((s) => s.selecteer);
  const voegToe = useProjectStore((s) => s.voegToe);
  const projectNaam = useProjectStore((s) => s.projectNaam);

  const onInsert = (templateId: string, label: string) => {
    const bron = templates[templateId];
    if (!bron) return;
    // De catalogus draagt een toelichting in het label ("Balklaag (houten
    // vloerbalken)"); als naam van een blad is dat te lang. De korte vorm is
    // toch maar een voorstel — je typt er meteen "Dak" of "Verdiepingsvloer"
    // overheen.
    const kort = label.replace(/\s*\([^)]*\)\s*$/, "").trim() || label;
    setNieuwId(voegToe(templateId, kort, bron));
  };

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
                  Nog geen rekenbladen. Kies hieronder een module om er een toe te voegen.
                </p>
              )}

              {exemplaren.map((ex) => (
                <ExemplaarRij
                  key={ex.id}
                  ex={ex}
                  geselecteerd={ex.id === activeId}
                  metNaamInvoer={ex.id === nieuwId}
                  onNaamKlaar={() => setNieuwId(null)}
                />
              ))}
            </div>
          </div>

          {/* De catalogus: klikken voegt een nieuw exemplaar toe. */}
          <div className="tree-section">
            <button
              className="tree-section-header tree-section-toggle"
              onClick={() => setToonCatalogus((v) => !v)}
            >
              <span className={`tree-chevron${toonCatalogus ? " expanded" : ""}`}>▶</span>
              <span className="tree-section-label">Modules toevoegen</span>
            </button>
            {toonCatalogus && (
              <div className="tree-section-children">
                {moduleCatalogus.map((node) => (
                  <CatalogusNode key={node.id} node={node} level={0} onInsert={onInsert} />
                ))}
                <StatusLegenda />
              </div>
            )}
          </div>

          {/* Naslag — ook invoegbaar, bijvoorbeeld een normuitwerking als bijlage. */}
          <div className="tree-section">
            <button
              className="tree-section-header tree-section-toggle"
              onClick={() => setToonBibliotheek((v) => !v)}
            >
              <span className={`tree-chevron${toonBibliotheek ? " expanded" : ""}`}>▶</span>
              <span className="tree-section-label">Bibliotheek</span>
            </button>
            {toonBibliotheek && (
              <div className="tree-section-children">
                {bibliotheek.map((node) => (
                  <CatalogusNode key={node.id} node={node} level={0} onInsert={onInsert} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
