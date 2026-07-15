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
import IfcViewerPanel from "./components/calc/IfcViewerPanel";
import VoetplaatDesigner from "./components/calc/VoetplaatDesigner";
import BalklaagDesigner from "./components/calc/BalklaagDesigner";
import { getSetting } from "./store";
import { useDocumentStore } from "./store/documentStore";
import { useRecentFiles } from "./hooks/useRecentFiles";
import { openCalculationFile, unwrapFromIfcCalculation } from "./tauri/fileOps";
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

  const loadTemplate = useDocumentStore((s) => s.loadTemplate);
  const markSaved = useDocumentStore((s) => s.markSaved);
  const source = useDocumentStore((s) => s.source);
  const { addRecentFile } = useRecentFiles();

  // De visuele designer-pane bestaat voor sheets met een parametrisch beeld.
  const designerPane = source.includes("Voetplaatverbinding") ? <VoetplaatDesigner />
    : source.includes("Balklaag") ? <BalklaagDesigner />
    : null;
  const hasDesigner = designerPane !== null;
  const mode = hasDesigner ? splitMode : "cu";
  const leftPane = mode === "vu" ? designerPane : <Editor />;
  const rightPane = mode === "cv" ? designerPane : <Preview />;

  const handleBrowse = useCallback(async () => {
    try {
      const file = await openCalculationFile();
      if (!file) return;
      loadTemplate(file.content, file.name);
      markSaved(file.path);
      await addRecentFile({
        path: file.path,
        name: file.name,
        type: "report",
        timestamp: Date.now(),
      });
    } catch (err) {
      alert(`Bestand openen mislukt: ${(err as Error).message}`);
    }
  }, [loadTemplate, markSaved, addRecentFile]);

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
      const content = unwrapFromIfcCalculation(raw);
      const name = path.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") ?? path;
      loadTemplate(content, name);
      markSaved(path);
      await addRecentFile(path);
    } catch (err) {
      alert(`Bestand openen mislukt: ${(err as Error).message}`);
    }
  }, [loadTemplate, markSaved, addRecentFile]);

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
