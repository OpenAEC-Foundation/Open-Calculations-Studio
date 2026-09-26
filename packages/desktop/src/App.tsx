import { useState, useEffect, useCallback } from "react";
import TitleBar from "./components/TitleBar";
import Ribbon from "./components/ribbon/Ribbon";
import DocumentBar from "./components/DocumentBar";
import StatusBar from "./components/StatusBar";
import Backstage from "./components/backstage/Backstage";
import SettingsDialog, { applyTheme } from "./components/settings/SettingsDialog";
import Editor from "./components/calc/Editor";
import Preview from "./components/calc/Preview";
import SplitPane from "./components/calc/SplitPane";
import ProjectBrowser from "./components/calc/ProjectBrowser";
import { designerVoor } from "./components/calc/designerKeuze";
import ProjectGegevensPanel from "./components/calc/ProjectGegevensPanel";
import RapportPanel from "./components/rapport/RapportPanel";
import PrintDocument from "./components/calc/PrintDocument";
import { wachtOpVellen, zetDrukvellenKlaar } from "./components/rapport/afdruk/drukvellen";
import AfdrukVoorbeeld from "./components/calc/AfdrukVoorbeeld";
import ModuleKiezer from "./components/calc/ModuleKiezer";
import IfcViewerPanel from "./components/calc/IfcViewerPanel";
import { getSetting } from "./store";
import { useProjectStore, PROJECT_ID, RAPPORT_ID } from "./store/projectStore";
import { usePrintStore } from "./store/printStore";
import { useRecentFiles } from "./hooks/useRecentFiles";
import { useSneltoetsen } from "./hooks/useSneltoetsen";
import { useBestandActies } from "./hooks/useBestandActies";
import { leesProjectBestand } from "./store/projectBestand";
import { setAngleMode, type AngleMode } from "@ifc-calc/core";
import { UNITS_DEFAULTS, type UnitsSettings } from "./components/settings/SettingsDialog";

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [backstageOpen, setBackstageOpen] = useState(false);
  const [activeView, setActiveView] = useState("default");
  const [theme, setTheme] = useState("light");
  // 2-pane werkruimte-modus: code+visueel / code+uitwerking / visueel+uitwerking
  const [splitMode, setSplitMode] = useState<"cv" | "cu" | "vu">("vu");

  useEffect(() => {
    getSetting<string>("theme", "light").then((saved) => {
      setTheme(saved);
      applyTheme(saved);
    });
    getSetting<UnitsSettings>("units", UNITS_DEFAULTS).then((u) => {
      setAngleMode(u.angleMode as AngleMode);
    });
    const onUnits = (e: Event) => {
      const detail = (e as CustomEvent<UnitsSettings>).detail;
      if (detail) setAngleMode(detail.angleMode as AngleMode);
    };
    window.addEventListener("units-changed", onUnits);
    // Show window once theme is applied (avoids flash of unstyled chrome)
    import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => {
        getCurrentWindow().show();
      })
      .catch(() => {
        // Browser fallback (npm run dev without Tauri)
      });
    return () => window.removeEventListener("units-changed", onUnits);
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  const activeId = useProjectStore((s) => s.activeId);
  const exemplaren = useProjectStore((s) => s.exemplaren);
  const laadProject = useProjectStore((s) => s.laadProject);
  const markeerOpgeslagen = useProjectStore((s) => s.markeerOpgeslagen);
  const actief = exemplaren.find((e) => e.id === activeId) ?? null;
  const source = actief?.source ?? "";
  const { addRecentFile } = useRecentFiles();
  const { openen } = useBestandActies();
  useSneltoetsen();

  // De afdrukweergave bestaat alleen tijdens het printen. Even wachten voordat
  // de printdialoog opent: de parametrische beelden meten hun tekengebied met
  // een ResizeObserver, en die vuurt pas ná de eerste opmaakronde. Print je te
  // vroeg, dan staan de tekeningen er nog niet of op de verkeerde maat.
  const printBezig = usePrintStore((s) => s.bezig);
  const printVoorbeeld = usePrintStore((s) => s.voorbeeld);
  const printKlaar = usePrintStore((s) => s.klaar);
  const toonVoorbeeld = usePrintStore((s) => s.toonVoorbeeld);
  const sluitVoorbeeld = usePrintStore((s) => s.sluitVoorbeeld);
  const printSelectie = usePrintStore((s) => s.selectie);
  const kiesSelectie = usePrintStore((s) => s.kiesSelectie);
  const printSoort = usePrintStore((s) => s.soort);
  // Alleen het échte printen zet de app weg. Het afdrukvoorbeeld is een paneel
  // binnen de applicatie: lint, projectboom en statusbalk blijven staan.
  // Het rapport gaat via de vellen van het afdrukvoorbeeld (drukvellen.ts);
  // de app blijft daarbij staan, want het voorbeeld moet die vellen bouwen.
  const afdrukmodus = printBezig && printSoort !== "rapport";

  // De afdrukopmaak hangt aan een klasse op <html> in plaats van aan
  // `@media print`, zodat het voorbeeld op het scherm er precies zo uitziet.
  useEffect(() => {
    const el = document.documentElement;
    if (afdrukmodus) el.classList.add("afdrukmodus");
    else el.classList.remove("afdrukmodus");
    return () => el.classList.remove("afdrukmodus");
  }, [afdrukmodus]);

  useEffect(() => {
    if (!printBezig || printSoort !== "rapport") return;
    let afgebroken = false;
    useProjectStore.getState().selecteer(RAPPORT_ID);
    toonVoorbeeld(null, "rapport");
    wachtOpVellen()
      .then((vellen) => {
        if (afgebroken) return;
        const opruimen = zetDrukvellenKlaar(vellen);
        try {
          window.print();
        } finally {
          opruimen();
          printKlaar();
        }
      })
      .catch((err) => {
        alert((err as Error).message);
        printKlaar();
      });
    return () => {
      afgebroken = true;
    };
  }, [printBezig, printSoort, printKlaar, toonVoorbeeld]);

  useEffect(() => {
    if (!printBezig || printSoort === "rapport") return;
    let afgebroken = false;
    const id = window.setTimeout(() => {
      if (afgebroken) return;
      try {
        window.print();
      } finally {
        printKlaar();
      }
    }, 250);
    return () => {
      afgebroken = true;
      clearTimeout(id);
    };
  }, [printBezig, printSoort, printKlaar]);

  // Staat het afdrukvoorbeeld op één blad en open je een ander blad, dan volgt
  // het voorbeeld mee. Een keuze voor het hele project blijft staan.
  useEffect(() => {
    if (!printVoorbeeld || !actief) return;
    if (printSelectie && printSelectie.length === 1 && printSelectie[0] !== actief.id) {
      kiesSelectie([actief.id]);
    }
  }, [printVoorbeeld, actief, printSelectie, kiesSelectie]);

  // Het rapportvoorbeeld hoort bij de knoop Rapport, het voorbeeld van bladen
  // bij de bladen. Kies je een andere knoop terwijl het rapportvoorbeeld
  // openstaat, of de knoop Rapport terwijl er bladen in het voorbeeld staan,
  // dan gaat het voorbeeld dicht. Anders blijft het onzichtbaar "open" en
  // drukt Ctrl+P iets anders af dan je ziet. Hetzelfde als je vanuit het
  // voorbeeld van een blad het rapport afdrukt: dat voorbeeld zou daarna het
  // rapport tonen onder de tabs van het blad.
  useEffect(() => {
    if (!printVoorbeeld) return;
    if ((printSoort === "rapport") !== (activeId === RAPPORT_ID)) sluitVoorbeeld();
  }, [printVoorbeeld, printSoort, activeId, sluitVoorbeeld]);

  const designerPane = designerVoor(source);
  // Het projectgegevens-formulier is geen rekenblad: geen editor, geen
  // uitwerking, geen splitsing — alleen het formulier.
  const toontProjectGegevens = activeId === PROJECT_ID;
  // Het rapport is evenmin een rekenblad: een eigen paneel, met het hele
  // rapport als afdrukvoorbeeld in de tweede tab. Net als bij de bladen wint
  // een open voorbeeld van de IFC-weergave, het invulpaneel niet.
  const toontRapport = activeId === RAPPORT_ID;
  const rapportVoorbeeld = printVoorbeeld && printSoort === "rapport";
  const rapportWerkruimte = toontRapport && (rapportVoorbeeld || activeView !== "ifc");
  const hasDesigner = designerPane !== null && !toontProjectGegevens;
  const mode = hasDesigner ? splitMode : "cu";
  const leftPane = mode === "vu" ? designerPane : <Editor />;
  const rightPane = mode === "cv" ? designerPane : <Preview />;

  // De weergaven van een geopend blad, met het afdrukvoorbeeld als laatste tab.
  // Dat voorbeeld toont de bladen, ook als er eerder een rapport is afgedrukt.
  const kiesWeergave = (m: "cv" | "cu" | "vu") => {
    sluitVoorbeeld();
    setSplitMode(m);
  };
  const tabBalk = actief && !toontProjectGegevens ? (
    <div className="split-tabs">
      {hasDesigner && (
        <button className={`split-tab${!printVoorbeeld && mode === "cv" ? " active" : ""}`} onClick={() => kiesWeergave("cv")}>Code + Visueel</button>
      )}
      <button className={`split-tab${!printVoorbeeld && mode === "cu" ? " active" : ""}`} onClick={() => kiesWeergave("cu")}>Code + Uitwerking</button>
      {hasDesigner && (
        <button className={`split-tab${!printVoorbeeld && mode === "vu" ? " active" : ""}`} onClick={() => kiesWeergave("vu")}>Visueel + Uitwerking</button>
      )}
      <button className={`split-tab${printVoorbeeld ? " active" : ""}`} onClick={() => toonVoorbeeld([actief.id], "bladen")}>Afdrukvoorbeeld</button>
    </div>
  ) : null;

  // De knoop Rapport: het invulpaneel, of het hele rapport zoals het op papier komt.
  const rapportTabs = (
    <div className="split-tabs">
      <button className={`split-tab${rapportVoorbeeld ? "" : " active"}`} onClick={() => sluitVoorbeeld()}>Rapport</button>
      <button className={`split-tab${rapportVoorbeeld ? " active" : ""}`} onClick={() => toonVoorbeeld(null, "rapport")}>Afdrukvoorbeeld</button>
    </div>
  );

  const handleOpenRecent = useCallback(async (path: string) => {
    try {
      // Only Tauri runtime can read by absolute path; browser fallback cannot.
      const win = window as unknown as { __TAURI_INTERNALS__?: unknown };
      if (!win.__TAURI_INTERNALS__) {
        alert("Recente bestanden openen vereist de desktop-app.");
        return;
      }
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const raw = await readTextFile(path);
      const name = path.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") ?? path;
      laadProject(leesProjectBestand(raw, name));
      markeerOpgeslagen(path);
      await addRecentFile(path);
    } catch (err) {
      alert(`Bestand openen mislukt: ${(err as Error).message}`);
    }
  }, [laadProject, markeerOpgeslagen, addRecentFile]);

  return (
    <>
      <TitleBar onSettingsClick={() => setSettingsOpen(true)} />
      <Ribbon
        onFileTabClick={() => setBackstageOpen(true)}
        onSettingsClick={() => setSettingsOpen(true)}
        activeView={activeView}
        onViewChange={setActiveView}
      />
      <DocumentBar />
      <main className="main-view" style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <ProjectBrowser />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {rapportWerkruimte ? (
            <>
              {rapportTabs}
              {rapportVoorbeeld ? (
                <AfdrukVoorbeeld />
              ) : (
                <div style={{ flex: 1, minHeight: 0 }}>
                  <RapportPanel />
                </div>
              )}
            </>
          ) : printVoorbeeld ? (
            <>
              {tabBalk}
              <AfdrukVoorbeeld />
            </>
          ) : activeView === "ifc" ? (
            <IfcViewerPanel />
          ) : toontProjectGegevens ? (
            <ProjectGegevensPanel />
          ) : !actief ? (
            <div className="werkruimte-leeg">
              <h2>Nog geen rekenblad geopend</h2>
              <p>
                Voeg een module toe met <b>Module</b> in het lint (tab Start). Elk blad dat je
                toevoegt heeft zijn eigen invoer — je kunt dezelfde module meerdere keren
                gebruiken zonder dat de bladen elkaar beïnvloeden.
              </p>
            </div>
          ) : (
            <>
              {tabBalk}
              <div style={{ flex: 1, minHeight: 0 }}>
                <SplitPane left={leftPane} right={rightPane} />
              </div>
            </>
          )}
        </div>
      </main>
      <StatusBar />
      {afdrukmodus && <PrintDocument />}
      <Backstage
        open={backstageOpen}
        onClose={() => setBackstageOpen(false)}
        onOpenSettings={() => {
          setBackstageOpen(false);
          setSettingsOpen(true);
        }}
        onBrowse={openen}
        onOpenFile={handleOpenRecent}
      />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={handleThemeChange}
      />
      <ModuleKiezer />
    </>
  );
}
