import { useProjectStore, PROJECT_ID } from "../store/projectStore";
import "./DocumentBar.css";

/**
 * Balk boven de werkruimte: welk projectbestand open is, en welk rekenblad
 * daarbinnen. Eén project is één bestand — de bladen erin zijn geen losse
 * documenten maar onderdelen van dezelfde berekening. Het amberkleurige
 * stipje betekent: nog niet opgeslagen.
 */
export default function DocumentBar() {
  const projectNaam = useProjectStore((s) => s.projectNaam);
  const dirty = useProjectStore((s) => s.dirty);
  const activeId = useProjectStore((s) => s.activeId);
  const exemplaren = useProjectStore((s) => s.exemplaren);

  const bladNaam =
    activeId === PROJECT_ID
      ? "Projectgegevens"
      : (exemplaren.find((e) => e.id === activeId)?.naam ?? null);

  const title = `${projectNaam || "Naamloos"}.ifc-calculation`;

  return (
    <div className="document-bar">
      <div className="document-tabs">
        <button className="document-tab active" type="button">
          <span className="document-tab-title">{title}</span>
          {bladNaam && <span className="document-tab-blad">› {bladNaam}</span>}
          {dirty && <span className="document-tab-modified" title="Niet-opgeslagen wijzigingen" />}
        </button>
      </div>
    </div>
  );
}
