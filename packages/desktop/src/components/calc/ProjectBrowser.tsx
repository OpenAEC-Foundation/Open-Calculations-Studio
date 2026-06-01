import { useEffect, useRef, useState } from "react";
import { projectTree, type TreeNode } from "./projectTree";
import { templates } from "../../templates";
import { useDocumentStore } from "../../store/documentStore";
import { useProjectStore, type SheetType } from "../../store/projectStore";
import { wizards } from "../wizards";
import "./ProjectBrowser.css";

interface TreeProps {
  node: TreeNode;
  level: number;
  selectedId: string | null;
  onSelect: (id: string, templateId: string | undefined, label: string) => void;
}

function TreeNodeView({ node, level, selectedId, onSelect }: TreeProps) {
  const [expanded, setExpanded] = useState(
    node.kind === "category" ? !!node.defaultExpanded : node.kind === "section",
  );

  if (node.kind === "section") {
    return (
      <div className="tree-section">
        <div className="tree-section-header">
          <span className="tree-section-label">{node.label}</span>
        </div>
        <div className="tree-section-children">
          {node.children.map((child) => (
            <TreeNodeView
              key={child.id}
              node={child}
              level={0}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
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
              <TreeNodeView
                key={child.id}
                node={child}
                level={level + 1}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isSelected = selectedId === node.id;
  const hasTemplate = !!node.templateId;
  return (
    <div
      role="button"
      tabIndex={0}
      className={`tree-item${isSelected ? " selected" : ""}${hasTemplate ? "" : " tree-item-disabled"}`}
      style={{ paddingLeft: 16 + level * 12 }}
      onClick={() => onSelect(node.id, node.templateId, node.label)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(node.id, node.templateId, node.label);
        }
      }}
      title={
        hasTemplate
          ? `Klik om in actieve sheet te laden — of sleep naar PROJECT om als nieuwe sheet toe te voegen.`
          : `${node.label} (nog niet beschikbaar)`
      }
      draggable={hasTemplate}
      onDragStart={(e) => {
        if (!hasTemplate || !node.templateId) return;
        const payload = JSON.stringify({ templateId: node.templateId, label: node.label });
        // Set BOTH a custom MIME type AND a text/plain fallback. Sommige browsers
        // (en Tauri's WebView2) tonen `.types` alleen na het zetten van text/plain.
        e.dataTransfer.setData("application/x-ocs-template", payload);
        e.dataTransfer.setData("text/plain", payload);
        e.dataTransfer.effectAllowed = "copy";
        // Globale class op body zodat de drop-zone in PROJECT zichtbaar wordt
        // vanaf het moment dat het slepen begint (zonder over hem te hoeven).
        document.body.classList.add("ocs-dragging-template");
      }}
      onDragEnd={() => {
        document.body.classList.remove("ocs-dragging-template");
      }}
    >
      <span className="tree-item-icon">{hasTemplate ? "○" : "□"}</span>
      <span className="tree-item-label">{node.label}</span>
    </div>
  );
}

/** Sheet-type menu items shown when "+ Voeg sheet toe" is clicked.
 *  templateId is `string` voor calcpad-templates, of `"wizard:<id>"` voor
 *  een wizard. Een `null` templateId staat voor een lege berekening. */
const SHEET_PRESETS: Array<{
  type: SheetType;
  templateId: string | null;
  label: string;
  icon: string;
}> = [
  { type: "cover", templateId: "voorblad", label: "Voorblad", icon: "▤" },
  { type: "calc", templateId: "project-metadata", label: "Projectgegevens", icon: "≡" },
  { type: "calc", templateId: "stalen-gevelkolom", label: "Stalen gevelkolom", icon: "│" },
  { type: "calc", templateId: "verticaal-windverband", label: "Verticaal windverband", icon: "✕" },
  { type: "calc", templateId: "houten-balklaag", label: "Houten balklaag", icon: "▤" },
  { type: "calc", templateId: "houten-kolom", label: "Houten kolom (knik)", icon: "║" },
  { type: "calc", templateId: "oplegging-metselwerk", label: "Oplegging op metselwerk", icon: "⊥" },
  { type: "calc", templateId: "paaldraagvermogen", label: "Paaldraagvermogen", icon: "⫯" },
  { type: "calc", templateId: "stalen-ligger", label: "Stalen ligger", icon: "─" },
  { type: "wizard", templateId: "wizard:spuwer", label: "Spuwer (wizard)", icon: "💧" },
  { type: "calc", templateId: null, label: "Lege berekening", icon: "+" },
];

function AddSheetButton() {
  const addSheet = useProjectStore((s) => s.addSheet);
  const addWizardSheet = useProjectStore((s) => s.addWizardSheet);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const onPick = (preset: typeof SHEET_PRESETS[number]) => {
    if (preset.type === "wizard" && preset.templateId?.startsWith("wizard:")) {
      const wizardId = preset.templateId.slice("wizard:".length);
      addWizardSheet(wizardId, preset.label);
    } else {
      addSheet(preset.templateId, preset.type, preset.label);
    }
    setOpen(false);
  };

  return (
    <div className="sheet-add" ref={ref}>
      <button
        className="sheet-add-trigger"
        onClick={() => setOpen((o) => !o)}
        title="Voeg een sheet toe aan het project"
      >
        + Voeg sheet toe
      </button>
      {open && (
        <div className="sheet-add-menu">
          {SHEET_PRESETS.map((p, i) => (
            <button key={i} className="sheet-add-item" onClick={() => onPick(p)}>
              <span className="sheet-add-icon">{p.icon}</span>
              <span className="sheet-add-label">{p.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectSection() {
  const sheets = useProjectStore((s) => s.sheets);
  const activeSheetId = useProjectStore((s) => s.activeSheetId);
  const switchTo = useProjectStore((s) => s.switchTo);
  const removeSheet = useProjectStore((s) => s.removeSheet);
  const moveSheet = useProjectStore((s) => s.moveSheet);
  const addSheet = useProjectStore((s) => s.addSheet);
  const addWizardSheet = useProjectStore((s) => s.addWizardSheet);
  const [dragOver, setDragOver] = useState(false);

  const onDragOver = (e: React.DragEvent) => {
    // Accept either our custom MIME or a text/plain fallback (some browsers
    // mask custom types until drop). Just preventDefault to enable dropping.
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!dragOver) setDragOver(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    // Only clear when leaving the container itself (not bubbling from children).
    if (e.currentTarget === e.target) setDragOver(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    document.body.classList.remove("ocs-dragging-template");
    const raw =
      e.dataTransfer.getData("application/x-ocs-template") ||
      e.dataTransfer.getData("text/plain");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { templateId?: string; label?: string };
      if (parsed.templateId && parsed.label) {
        if (parsed.templateId.startsWith("wizard:")) {
          addWizardSheet(parsed.templateId.slice("wizard:".length), parsed.label);
        } else {
          addSheet(parsed.templateId, "calc", parsed.label);
        }
      }
    } catch { /* ignore malformed drop payload */ }
  };

  return (
    <div
      className={`tree-section${dragOver ? " drop-target" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="tree-section-header">
        <span className="tree-section-label">Project</span>
        {dragOver && <span className="tree-section-drop-hint">sleep om toe te voegen</span>}
      </div>
      <div className="tree-section-children">
        {sheets.map((sheet, idx) => {
          const isActive = sheet.id === activeSheetId;
          return (
            <div
              key={sheet.id}
              className={`project-sheet-row${isActive ? " active" : ""}`}
            >
              <button
                className="project-sheet-pick"
                onClick={() => switchTo(sheet.id)}
                title={`Schakel naar ${sheet.label}`}
              >
                <span className="project-sheet-icon">
                  {sheet.type === "cover"
                    ? "▤"
                    : sheet.type === "wizard"
                    ? (wizards[sheet.wizardId ?? ""]?.icon ?? "✦")
                    : "○"}
                </span>
                <span className="project-sheet-label">{sheet.label}</span>
              </button>
              <div className="project-sheet-actions">
                {sheet.templateId && templates[sheet.templateId] && (
                  <button
                    className="project-sheet-act"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (sheet.templateId && templates[sheet.templateId]) {
                        // Activeer eerst de sheet, daarna source vervangen
                        if (sheet.id !== activeSheetId) switchTo(sheet.id);
                        useDocumentStore.getState().setSource(templates[sheet.templateId]);
                      }
                    }}
                    title={`Herstel naar template (${sheet.templateId})`}
                  >↻</button>
                )}
                <button
                  className="project-sheet-act"
                  onClick={(e) => { e.stopPropagation(); moveSheet(sheet.id, "up"); }}
                  disabled={idx === 0}
                  title="Omhoog"
                >▲</button>
                <button
                  className="project-sheet-act"
                  onClick={(e) => { e.stopPropagation(); moveSheet(sheet.id, "down"); }}
                  disabled={idx === sheets.length - 1}
                  title="Omlaag"
                >▼</button>
                <button
                  className="project-sheet-act danger"
                  onClick={(e) => { e.stopPropagation(); removeSheet(sheet.id); }}
                  disabled={sheets.length <= 1}
                  title="Verwijder"
                >×</button>
              </div>
            </div>
          );
        })}
        <AddSheetButton />
      </div>
    </div>
  );
}

export default function ProjectBrowser() {
  const [collapsed, setCollapsed] = useState(false);
  const filePath = useDocumentStore((s) => s.filePath);
  const setSource = useDocumentStore((s) => s.setSource);
  const addWizardSheet = useProjectStore((s) => s.addWizardSheet);
  const addSheet = useProjectStore((s) => s.addSheet);
  const [librarySelectedId, setLibrarySelectedId] = useState<string | null>(null);

  // Library section: clicking a template inserts/replaces the active sheet's
  // source. Wizards en de Projectgegevens-sheet zijn beschermd:
  //   • Wizard-klik → voegt NIEUWE wizard-sheet toe aan PROJECT
  //   • Klik terwijl Projectgegevens actief is → voegt NIEUWE calc-sheet toe
  //     (anders overschrijft de gebruiker per ongeluk z'n metadata)
  const onLibrarySelect = (id: string, templateId: string | undefined, label: string) => {
    setLibrarySelectedId(id);
    if (!templateId) return;

    if (templateId.startsWith("wizard:")) {
      const wizardId = templateId.slice("wizard:".length);
      const w = wizards[wizardId];
      if (w) addWizardSheet(wizardId, label.replace(/^[^A-Za-z0-9]+/, "").trim() || w.label);
      return;
    }

    if (!templates[templateId]) return;

    // Is de actieve sheet de Projectgegevens? → nooit overschrijven, voeg toe.
    const { sheets, activeSheetId } = useProjectStore.getState();
    const active = sheets.find((s) => s.id === activeSheetId);
    const isMetadataActive =
      active?.templateId === "project-metadata" ||
      /@select\s+WindGebied\b/.test(active?.source ?? "");

    if (isMetadataActive && templateId !== "project-metadata") {
      addSheet(templateId, "calc", label);
    } else {
      setSource(templates[templateId]);
    }
  };

  // Suppress unused — kept for future "dirty" indicator
  void filePath;

  // Library = everything in projectTree EXCEPT the legacy hard-coded Project
  // section (which is now driven by projectStore).
  const libraryNodes = projectTree.filter(
    (n) => n.kind !== "section" || n.id !== "project",
  );

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
          <ProjectSection />
          {libraryNodes.map((node) => (
            <TreeNodeView
              key={node.id}
              node={node}
              level={0}
              selectedId={librarySelectedId}
              onSelect={onLibrarySelect}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
