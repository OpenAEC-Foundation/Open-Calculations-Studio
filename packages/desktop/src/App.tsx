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
import PrintDocument from "./components/calc/PrintDocument";
import IfcViewerPanel from "./components/calc/IfcViewerPanel";
import { getSetting } from "./store";
import { useProjectStore, PROJECT_ID } from "./store/projectStore";
import { usePrintStore } from "./store/printStore";
import { useRecentFiles } from "./hooks/useRecentFiles";
import { useSneltoetsen } from "./hooks/useSneltoetsen";
import { openCalculationFile } from "./tauri/fileOps";
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
  useSneltoetsen();

  // De afdrukweergave bestaat alleen tijdens het printen. Even wachten voordat
  // de printdialoog opent: de parametrische beelden meten hun tekengebied met
  // een ResizeObserver, en die vuurt pas ná de eerste opmaakronde. Print je te
  // vroeg, dan staan de tekeningen er nog niet of op de verkeerde maat.
  const printBezig = usePrintStore((s) => s.bezig);
  const printVoorbeeld = usePrintStore((s) => s.voorbeeld);
  const printKlaar = usePrintStore((s) => s.klaar);
  const afdrukmodus = printBezig || printVoorbeeld;

  // De afdrukopmaak hangt aan een klasse op <html> in plaats van aan
  // `@media print`, zodat het voorbeeld op het scherm er precies zo uitziet.
  useEffect(() => {
    const el = document.documentElement;
    if (afdrukmodus) el.classList.add("afdrukmodus");
    else el.classList.remove("afdrukmodus");
    return () => el.classList.remove("afdrukmodus");
  }, [afdrukmodus]);

  useEffect(() => {
    if (!printBezig) return;
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
  }, [printBezig, printKlaar]);

  const designerPane = designerVoor(source);
  // Het projectgegevens-formulier is geen rekenblad: geen editor, geen
  // uitwerking, geen splitsing — alleen het formulier.
  const toontProjectGegevens = activeId === PROJECT_ID;
  const hasDesigner = designerPane !== null && !toontProjectGegevens;
  const mode = hasDesigner ? splitMode : "cu";
  const leftPane = mode === "vu" ? designerPane : <Editor />;
  const rightPane = mode === "cv" ? designerPane : <Preview />;

  const handleBrowse = useCallback(async () => {
    try {
      const file = await openCalculationFile();
      if (!file) return;
      laadProject(leesProjectBestand(file.raw, file.name));
      markeerOpgeslagen(file.path);
      await addRecentFile({
        path: file.path,
        name: file.name,
        type: "report",
        timestamp: Date.now(),
      });
    } catch (err) {
      alert(`Bestand openen mislukt: ${(err as Error).message}`);
    }
  }, [laadProject, markeerOpgeslagen, addRecentFile]);

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
          {activeView === "ifc" ? (
            <IfcViewerPanel />
          ) : toontProjectGegevens ? (
            <ProjectGegevensPanel />
          ) : !actief ? (
            <div className="werkruimte-leeg">
              <h2>Nog geen rekenblad geopend</h2>
              <p>
                Kies links een module om er een aan dit project toe te voegen. Elk blad dat je
                toevoegt heeft zijn eigen invoer — je kunt dezelfde module meerdere keren
                gebruiken zonder dat de bladen elkaar beïnvloeden.
              </p>
            </div>
          ) : (
            <>
              {hasDesigner && (
                <div className="split-tabs">
                  <button className={`split-tab${mode === "cv" ? " active" : ""}`} onClick={() => setSplitMode("cv")}>Code + Visueel</button>
                  <button className={`split-tab${mode === "cu" ? " active" : ""}`} onClick={() => setSplitMode("cu")}>Code + Uitwerking</button>
                  <button className={`split-tab${mode === "vu" ? " active" : ""}`} onClick={() => setSplitMode("vu")}>Visueel + Uitwerking</button>
                </div>
              )}
              <div style={{ flex: 1, minHeight: 0 }}>
                <SplitPane left={leftPane} right={rightPane} />
              </div>
            </>
          )}
        </div>
      </main>
      <StatusBar />
      {afdrukmodus && <PrintDocument />}
      {printVoorbeeld && (
        <div className="afdruk-balk">
          <span>Afdrukvoorbeeld — zo komt het op papier</span>
          <button onClick={() => usePrintStore.getState().afdrukken()}>Afdrukken…</button>
          <button onClick={() => usePrintStore.getState().sluitVoorbeeld()}>Sluiten</button>
        </div>
      )}
      <Backstage
        open={backstageOpen}
        onClose={() => setBackstageOpen(false)}
        onOpenSettings={() => {
          setBackstageOpen(false);
          setSettingsOpen(true);
        }}
        onBrowse={handleBrowse}
        onOpenFile={handleOpenRecent}
      />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={handleThemeChange}
      />
    </>
  );
}
