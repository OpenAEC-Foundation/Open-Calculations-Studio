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
import { getSetting } from "./store";
import { useDocumentStore } from "./store/documentStore";
import { useRecentFiles } from "./hooks/useRecentFiles";
import { openCalculationFile, unwrapFromIfcCalculation, projectFromIfcCalculation } from "./tauri/fileOps";
import { useProjectStore, type ProjectSheet } from "./store/projectStore";
import { setAngleMode, type AngleMode } from "@ifc-calc/core";
import { UNITS_DEFAULTS, type UnitsSettings } from "./components/settings/SettingsDialog";

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [backstageOpen, setBackstageOpen] = useState(false);
  const [activeView, setActiveView] = useState("default");
  const [theme, setTheme] = useState("light");

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
  const { addRecentFile } = useRecentFiles();

  const handleBrowse = useCallback(async () => {
    try {
      const file = await openCalculationFile();
      if (!file) return;
      // Try to load the multi-sheet project list from the raw payload (it
      // may have been read again inside openCalculationFile — easier: read
      // the file once more here, since we only need it for hydration).
      const win = window as unknown as { __TAURI_INTERNALS__?: unknown };
      let rawJson: string | null = null;
      if (win.__TAURI_INTERNALS__) {
        const { readTextFile } = await import("@tauri-apps/plugin-fs");
        rawJson = await readTextFile(file.path);
      }
      const sheets = rawJson ? (projectFromIfcCalculation(rawJson) as ProjectSheet[] | null) : null;
      loadTemplate(file.content, file.name);
      markSaved(file.path);
      if (sheets && sheets.length > 0) {
        useProjectStore.getState().loadSheets(sheets);
      }
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
      const sheets = projectFromIfcCalculation(raw) as ProjectSheet[] | null;
      const name = path.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") ?? path;
      loadTemplate(content, name);
      markSaved(path);
      if (sheets && sheets.length > 0) {
        useProjectStore.getState().loadSheets(sheets);
      }
      await addRecentFile(path);
    } catch (err) {
      alert(`Bestand openen mislukt: ${(err as Error).message}`);
    }
  }, [loadTemplate, markSaved, addRecentFile]);

  // Detecteer of de actieve sheet een wizard is — dan tonen we de Preview
  // volledige breedte (geen CodeMirror-editor, want die heeft geen functie
  // bij een wizard-sheet).
  const activeIsWizard = useProjectStore((s) => {
    const sheet = s.sheets.find((x) => x.id === s.activeSheetId);
    return sheet?.type === "wizard";
  });

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
        <div style={{ flex: 1, minWidth: 0 }}>
          {activeView === "ifc" ? (
            <IfcViewerPanel />
          ) : activeIsWizard ? (
            <Preview />
          ) : (
            <SplitPane left={<Editor />} right={<Preview />} />
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
