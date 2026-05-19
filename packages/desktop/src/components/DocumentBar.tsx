import { useDocumentStore } from "../store/documentStore";
import "./DocumentBar.css";

/**
 * Single-document tab bar wired to documentStore. The active template name
 * (set by ProjectBrowser when loading a template) is shown with the
 * `.ifc-calculation` extension. The amber dot indicates unsaved changes.
 *
 * Multi-document workflow (multiple .ifc-calculation files open) lands later.
 */
export default function DocumentBar() {
  const filePath = useDocumentStore((s) => s.filePath);
  const dirty = useDocumentStore((s) => s.dirty);

  const baseName = filePath ?? "Naamloos";
  const title = `${baseName}.ifc-calculation`;

  return (
    <div className="document-bar">
      <div className="document-tabs">
        <button className="document-tab active" type="button">
          <span className="document-tab-title">{title}</span>
          {dirty && <span className="document-tab-modified" title="Niet-opgeslagen wijzigingen" />}
        </button>
      </div>
    </div>
  );
}
