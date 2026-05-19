import { useState, useEffect } from "react";
import TitleBar from "./components/TitleBar";
import Ribbon from "./components/ribbon/Ribbon";
import DocumentBar from "./components/DocumentBar";
import StatusBar from "./components/StatusBar";
import Backstage from "./components/backstage/Backstage";
import SettingsDialog, { applyTheme } from "./components/settings/SettingsDialog";
import { getSetting } from "./store";

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
    // Show window once theme is applied (avoids flash of unstyled chrome)
    import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => {
        getCurrentWindow().show();
      })
      .catch(() => {
        // Browser fallback (npm run dev without Tauri)
      });
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

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
      <main
        className="main-view"
        style={{ flex: 1 }}
      >
        <div
          className="placeholder"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-body, Inter, sans-serif)",
          }}
        >
          <p>Editor + Preview komen in Fase 3</p>
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
