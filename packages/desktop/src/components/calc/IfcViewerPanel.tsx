import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDocumentStore } from "../../store/documentStore";
import { useLoadCaseStore } from "../../store/loadCaseStore";
import { calcpadIncludes, calcpadImageUrls } from "../../templates/calcpad-includes";
import { parse, evaluate, generateIfcx, generateIfc4x3Step, type IfcGenerationResult, type IfcxDocument } from "@ifc-calc/core";
import { wrapAsIfcCalculation } from "../../tauri/fileOps";
import "./IfcViewerPanel.css";

// ── BuildingSMART documentation links ─────────────────────────

const IFC4_DOCS_BASE = "https://ifc43-docs.standards.buildingsmart.org/IFC/RELEASE/IFC4x3/HTML/lexical/";
function getIfcDocsUrl(entityType: string): string {
  const normalized = entityType.startsWith("IFC")
    ? "Ifc" + entityType.slice(3).toLowerCase().replace(/(^|_)(\w)/g, (_m, _p, c) => c.toUpperCase())
    : entityType;
  return `${IFC4_DOCS_BASE}${normalized}.htm`;
}

function openIfcDocs(entityType: string, e: React.MouseEvent) {
  e.stopPropagation();
  const url = getIfcDocsUrl(entityType);
  import("@tauri-apps/plugin-opener").then(({ openUrl }) => {
    openUrl(url);
  }).catch(() => {
    window.open(url, "_blank", "noopener");
  });
}

// ── Syntax highlighting for IFC4 STEP ─────────────────────────

const STEP_KEYWORDS = new Set([
  "ISO-10303-21", "HEADER", "ENDSEC", "DATA", "END-ISO-10303-21",
  "FILE_DESCRIPTION", "FILE_NAME", "FILE_SCHEMA",
]);

function highlightStepLine(text: string): React.ReactNode {
  const tokens: React.ReactNode[] = [];
  const re = /(#\d+)|(IFC[A-Z][A-Z0-9_]+)|([A-Z_][A-Z_0-9]{3,})|('(?:[^'\\]|\\.)*')|(\.[A-Z_]+\.)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) tokens.push(text.slice(last, match.index));
    const [full] = match;
    if (match[1]) {
      tokens.push(<span key={key++} className="step-entity-ref">{full}</span>);
    } else if (match[2]) {
      tokens.push(
        <a
          key={key++}
          className="step-entity-type step-link"
          title={`${full} — BuildingSMART docs`}
          onClick={(e) => openIfcDocs(full, e)}
        >
          {full}
        </a>
      );
    } else if (STEP_KEYWORDS.has(full)) {
      tokens.push(<span key={key++} className="step-keyword">{full}</span>);
    } else if (match[4]) {
      tokens.push(<span key={key++} className="step-string">{full}</span>);
    } else if (match[5]) {
      tokens.push(<span key={key++} className="step-enum">{full}</span>);
    } else {
      tokens.push(full);
    }
    last = match.index + full.length;
  }
  if (last < text.length) tokens.push(text.slice(last));
  return <>{tokens}</>;
}

// ── Syntax highlighting for IFCX JSON ─────────────────────────

function highlightJson(json: string): React.ReactNode {
  const tokens: React.ReactNode[] = [];
  const re = /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|(true|false|null)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],])/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(json)) !== null) {
    if (match.index > last) tokens.push(json.slice(last, match.index));
    const [full] = match;
    if (match[1]) {
      tokens.push(<span key={key++} className="step-entity-type">{full}</span>);
    } else if (match[2]) {
      const inner = full.slice(1, -1);
      if (/^Ifc[A-Z][a-zA-Z]+$/.test(inner)) {
        tokens.push(
          <a
            key={key++}
            className="step-string step-link"
            title={`${inner} — BuildingSMART docs`}
            onClick={(e) => openIfcDocs(inner, e)}
          >
            {full}
          </a>
        );
      } else {
        tokens.push(<span key={key++} className="step-string">{full}</span>);
      }
    } else if (match[3]) {
      tokens.push(<span key={key++} className="step-enum">{full}</span>);
    } else if (match[4]) {
      tokens.push(<span key={key++} className="step-entity-ref">{full}</span>);
    } else if (match[5]) {
      tokens.push(<span key={key++} className="step-keyword">{full}</span>);
    } else {
      tokens.push(full);
    }
    last = match.index + full.length;
  }
  if (last < json.length) tokens.push(json.slice(last));
  return <>{tokens}</>;
}

// ── Spatial tree ─────────────────────────────────────────────

interface TreeNode {
  type: string;
  name: string;
  count?: number;
  children?: TreeNode[];
}

const TYPE_COLORS: Record<string, string> = {
  IfcProject: "#c084fc",
  IfcSite: "#34d399",
  IfcBuilding: "#60a5fa",
  IfcBuildingStorey: "#fbbf24",
  IfcWall: "#fb923c",
  IfcSlab: "#f472b6",
  IfcBeam: "#a78bfa",
  IfcColumn: "#38bdf8",
  IfcSpace: "#4ade80",
  IfcPile: "#f87171",
  IfcFooting: "#ef4444",
  IfcMember: "#fdba74",
};

function buildTreeFromIfcx(doc: IfcxDocument): TreeNode {
  // Walk doc.data entries — paths like "/project/site/building/storey/0/pile/P1"
  const root: TreeNode = { type: "IfcProject", name: doc.header?.projectName ?? "Project", children: [] };
  const byPath = new Map<string, TreeNode>([["/project", root]]);
  const ordered = [...doc.data].sort((a, b) => a.path.length - b.path.length);

  for (const entry of ordered) {
    if (entry.path === "/project") {
      root.name = entry.name ?? root.name;
      continue;
    }
    const parentPath = entry.path.split("/").slice(0, -1).join("/") || "/project";
    const parent = byPath.get(parentPath) ?? root;
    const node: TreeNode = {
      type: `Ifc${entry.type}`,
      name: entry.name ?? entry.path.split("/").pop() ?? "",
      children: [],
    };
    parent.children!.push(node);
    byPath.set(entry.path, node);
  }
  // Strip empty children arrays for cleaner display
  const clean = (n: TreeNode): TreeNode => ({
    ...n,
    children: n.children && n.children.length > 0 ? n.children.map(clean) : undefined,
  });
  return clean(root);
}

function TreeItem({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 3);
  const hasChildren = node.children && node.children.length > 0;
  const color = TYPE_COLORS[node.type] || "var(--theme-text-secondary)";

  return (
    <div className="ifc-tree-item">
      <button
        className="ifc-tree-row"
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          <svg className={`ifc-tree-chevron${expanded ? " open" : ""}`} width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="3,2 7,5 3,8" />
          </svg>
        ) : (
          <span className="ifc-tree-dot" style={{ background: color }} />
        )}
        <a
          className="ifc-tree-type step-link"
          style={{ color }}
          title={`${node.type} — BuildingSMART docs`}
          onClick={(e) => openIfcDocs(node.type, e)}
        >{node.type}</a>
        <span className="ifc-tree-name">{node.name}</span>
        {node.count != null && <span className="ifc-tree-count">{node.count}</span>}
      </button>
      {expanded && hasChildren && (
        <div className="ifc-tree-children">
          {node.children!.map((child, i) => (
            <TreeItem key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function StructureBrowser({ tree }: { tree: TreeNode }) {
  const { t } = useTranslation("ribbon");
  return (
    <div className="ifc-structure-pane">
      <div className="ifc-viewer-toolbar">
        <span className="ifc-viewer-label">{t("ifc.structure", "Spatial Tree")}</span>
      </div>
      <div className="ifc-structure-tree">
        <TreeItem node={tree} />
      </div>
    </div>
  );
}

// ── Viewer panes ─────────────────────────────────────────────

function StepViewer({ content }: { content: string }) {
  const { t } = useTranslation("ribbon");
  const [copied, setCopied] = useState(false);

  const lines = useMemo(
    () => content.split("\n").map((text, i) => ({ lineNumber: i + 1, text })),
    [content]
  );

  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(content); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = content; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleExport = useCallback(() => {
    const blob = new Blob([content], { type: "application/x-step" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "model.ifc";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content]);

  const size = new Blob([content]).size;
  const sizeLabel = size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;

  return (
    <div className="ifc-viewer-pane">
      <div className="ifc-viewer-toolbar">
        <span className="ifc-viewer-label">IFC4x3 STEP</span>
        <span className="ifc-viewer-stats">{lines.length} {t("ifc.lines", "regels")} &middot; {sizeLabel}</span>
        <div className="ifc-viewer-actions">
          <button onClick={handleCopy} title={t("copy", "Kopieer")}>{copied ? "✓" : "⎘"}</button>
          <button onClick={handleExport} title={t("export", "Exporteer")}>.ifc</button>
        </div>
      </div>
      <div className="ifc-viewer-code">
        <table className="ifc-viewer-table">
          <tbody>
            {lines.map((line) => (
              <tr key={line.lineNumber}>
                <td className="ifc-viewer-linenum">{line.lineNumber}</td>
                <td className="ifc-viewer-text">{highlightStepLine(line.text)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IfcxViewer({ content }: { content: string }) {
  const { t } = useTranslation("ribbon");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(content); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = content; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleExport = useCallback(() => {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "model.ifcx";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content]);

  const size = new Blob([content]).size;
  const sizeLabel = size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;

  return (
    <div className="ifc-viewer-pane">
      <div className="ifc-viewer-toolbar">
        <span className="ifc-viewer-label">IFCX JSON</span>
        <span className="ifc-viewer-stats">{sizeLabel}</span>
        <div className="ifc-viewer-actions">
          <button onClick={handleCopy} title={t("copy", "Kopieer")}>{copied ? "✓" : "⎘"}</button>
          <button onClick={handleExport} title={t("export", "Exporteer")}>.ifcx</button>
        </div>
      </div>
      <div className="ifc-viewer-code">
        <pre className="ifc-viewer-json">{highlightJson(content)}</pre>
      </div>
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────

/** IFCX shown in the viewer mirrors EXACTLY what Save writes to disk. */
interface GeneratedIfc extends IfcGenerationResult {
  /** Pretty-printed JSON identical to the on-disk `.ifc-calculation` payload. */
  ifcxJsonString: string;
}

function useGeneratedIfc(): GeneratedIfc {
  const source = useDocumentStore((s) => s.source);
  const filePath = useDocumentStore((s) => s.filePath);
  const activeId = useLoadCaseStore((s) => s.activeId);
  const valuesByCase = useLoadCaseStore((s) => s.valuesByCase);
  const selectValues = valuesByCase[activeId] ?? {};

  return useMemo(() => {
    try {
      const ast = parse(source, { includes: calcpadIncludes, imageUrls: calcpadImageUrls });
      const ev = evaluate(ast, selectValues);
      const projectName = filePath?.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") ?? "Berekening";
      const ifcx = generateIfcx(ev, { projectName });
      const step = generateIfc4x3Step(ev, { projectName });
      // Show the IFCX exactly as it will be persisted on disk — same JSON the
      // saveCalculationFile() helper writes.
      const ifcxJsonString = wrapAsIfcCalculation(source, ifcx);
      return { ifcx, step, ifcxJsonString };
    } catch (err) {
      const errorDoc: IfcxDocument = { header: { name: "error.ifcx", error: (err as Error).message }, data: [] };
      return {
        ifcx: errorDoc,
        step: `// Generation error: ${(err as Error).message}\n`,
        ifcxJsonString: JSON.stringify(errorDoc, null, 2),
      };
    }
  }, [source, selectValues, filePath]);
}

export default function IfcViewerPanel() {
  const { ifcx, step, ifcxJsonString } = useGeneratedIfc();
  const tree = useMemo(() => buildTreeFromIfcx(ifcx), [ifcx]);

  return (
    <div className="ifc-viewer-panel">
      <StructureBrowser tree={tree} />
      <div className="ifc-viewer-divider" />
      <StepViewer content={step} />
      <div className="ifc-viewer-divider" />
      <IfcxViewer content={ifcxJsonString} />
    </div>
  );
}
