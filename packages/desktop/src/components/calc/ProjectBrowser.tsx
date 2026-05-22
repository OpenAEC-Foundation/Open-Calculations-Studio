import { useState } from "react";
import { projectTree, type TreeNode } from "./projectTree";
import { templates } from "../../templates";
import { useDocumentStore } from "../../store/documentStore";
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
  const isEmphasis = node.kind === "item" && node.emphasis;
  return (
    <button
      className={`tree-item${isSelected ? " selected" : ""}${hasTemplate ? "" : " tree-item-disabled"}${isEmphasis ? " tree-item-emphasis" : ""}`}
      style={{ paddingLeft: 16 + level * 12 }}
      onClick={() => onSelect(node.id, node.templateId, node.label)}
      title={hasTemplate ? `Laad: ${node.label}` : `${node.label} (nog niet beschikbaar)`}
    >
      {!isEmphasis && <span className="tree-item-icon">{hasTemplate ? "○" : "□"}</span>}
      <span className="tree-item-label">{node.label}</span>
    </button>
  );
}

export default function ProjectBrowser() {
  const [collapsed, setCollapsed] = useState(false);
  const filePath = useDocumentStore((s) => s.filePath);
  const loadTemplate = useDocumentStore((s) => s.loadTemplate);
  const [selectedId, setSelectedId] = useState<string | null>("calc-paaldraagvermogen");

  const onSelect = (id: string, templateId: string | undefined, label: string) => {
    setSelectedId(id);
    if (templateId && templates[templateId]) {
      loadTemplate(templates[templateId], label);
    }
  };

  // Suppress unused — kept so we can show dirty marker later
  void filePath;

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
          {projectTree.map((node) => (
            <TreeNodeView
              key={node.id}
              node={node}
              level={0}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
