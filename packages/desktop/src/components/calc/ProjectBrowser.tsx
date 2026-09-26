import { useState } from "react";
import { useTranslation } from "react-i18next";
import { modulesPerTemplate } from "./projectTree";
import { useProjectStore, PROJECT_ID, RAPPORT_ID, type Exemplaar } from "../../store/projectStore";
import { useModuleKiezer } from "../../store/moduleKiezer";
import { useBladBijwerken } from "../../store/bladBijwerken";
import { templates } from "../../templates";
import { huidigeModuletekst, isVerouderd, rekenversie } from "./bladVersie";
import "./ProjectBrowser.css";
import "./BladVersie.css";

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
  const { t } = useTranslation();
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
  // Modulestatus en rekenversie in de tooltip; een blad met een nieuwere
  // rekenversie krijgt daarnaast een teken achter zijn naam.
  const verouderd = isVerouderd(ex, templates);
  const nieuweVersie = verouderd ? rekenversie(huidigeModuletekst(ex, templates) ?? "") : "";
  const versieRegel = [
    status ? t(`bladVersie.status.${status}`) : "",
    `${t("bladVersie.rekenversie")} ${rekenversie(ex.source)}`,
  ].filter(Boolean).join(" · ");

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
        title={
          `${ex.naam}${info ? ` — ${info.label}` : ""}\n${versieRegel}` +
          (verouderd ? `\n${t("bladVersie.rijVerouderd", { nieuw: nieuweVersie })}` : "") +
          "\nDubbelklik om te hernoemen"
        }
      >
        <span className={`tree-item-icon${status ? ` tree-status-${status}` : ""}`}>{bolletje}</span>
        <span className="tree-item-label">{ex.naam}</span>
        {verouderd && <span className="bv-rij-vlag" aria-label={t("bladVersie.melding")}>↻</span>}
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
  const { t } = useTranslation();
  const openBijwerken = useBladBijwerken((s) => s.openen);
  // De bladen waarvan de module intussen een nieuwere rekenversie heeft.
  const verouderd = exemplaren.filter((ex) => isVerouderd(ex, templates));

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

              {/* Het rapport hoort, net als de projectgegevens, bij het hele
                  project en niet bij één blad: daarom een vaste knoop erboven. */}
              <button
                className={`tree-item tree-item-emphasis${activeId === RAPPORT_ID ? " selected" : ""}`}
                onClick={() => selecteer(RAPPORT_ID)}
                title="Rapport — het constructierapport van dit project, met de rekenbladen als bijlage"
              >
                <span className="tree-item-label">Rapport</span>
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

          {/* Alleen als er iets bij te werken is; bijwerken gaat altijd via de vergelijking. */}
          {verouderd.length > 0 && (
            <button className="tree-item tree-item-toevoegen"
              onClick={() => openBijwerken(verouderd.map((ex) => ex.id))}
              title={t("bladVersie.alleUitleg")}>
              <span className="tree-item-icon">↻</span>
              <span className="tree-item-label">{t("bladVersie.alle")}</span>
              <span className="tree-category-count">{verouderd.length}</span>
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
