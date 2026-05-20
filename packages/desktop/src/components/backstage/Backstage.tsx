import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useRecentFiles, type RecentFile } from "../../hooks/useRecentFiles";
import "./Backstage.css";

const ICONS = {
  new: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6m-3 3h6"/></svg>',
  open: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>',
  save: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4z"/><path d="M17 3v4a1 1 0 01-1 1H8"/><path d="M7 14h10v7H7z"/></svg>',
  saveAs: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4z"/><path d="M17 3v4a1 1 0 01-1 1H8"/><path d="M12 12v6m-3-3h6"/></svg>',
  print: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
  export: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  import: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  preferences: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  about: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  exit: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
};

function MenuItem({
  icon,
  label,
  shortcut,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`backstage-item${active ? " active" : ""}`}
      onClick={onClick}
    >
      <span
        className="backstage-item-icon"
        dangerouslySetInnerHTML={{ __html: icon }}
      />
      <span className="backstage-item-label">{label}</span>
      {shortcut && (
        <span className="backstage-item-shortcut">{shortcut}</span>
      )}
    </button>
  );
}

function Divider() {
  return <div className="backstage-divider" />;
}

interface BackstageProps {
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  /** Open a specific (recent) file by absolute path. */
  onOpenFile?: (path: string) => void;
  /** Launch the OS file picker via the "Browse..." action in the Open panel. */
  onBrowse?: () => void;
}

export default function Backstage({ open, onClose, onOpenSettings, onOpenFile, onBrowse }: BackstageProps) {
  const { t } = useTranslation("backstage");
  const [activePanel, setActivePanel] = useState<string>("none");
  const { recentFiles, removeRecentFile, clearRecentFiles } = useRecentFiles();

  const actionAndClose = useCallback(
    (fn?: () => void) => {
      onClose();
      fn?.();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) {
      setActivePanel("none");
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const hasActivePanel =
    activePanel === "open" ||
    activePanel === "about" ||
    activePanel === "export";

  return (
    <div className="backstage-overlay">
      <div className="backstage-sidebar">
        <button className="backstage-back" onClick={onClose}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>{t("file")}</span>
        </button>
        <div className="backstage-items">
          <MenuItem
            icon={ICONS.new}
            label={t("new")}
            shortcut="Ctrl+N"
            onClick={() => actionAndClose()}
          />
          <MenuItem
            icon={ICONS.open}
            label={t("open")}
            shortcut="Ctrl+O"
            active={activePanel === "open"}
            onClick={() => setActivePanel("open")}
          />
          <MenuItem
            icon={ICONS.save}
            label={t("save")}
            shortcut="Ctrl+S"
            onClick={() => actionAndClose()}
          />
          <MenuItem
            icon={ICONS.saveAs}
            label={t("saveAs")}
            shortcut="Ctrl+Shift+S"
            onClick={() => actionAndClose()}
          />
          <MenuItem
            icon={ICONS.print}
            label={t("print")}
            shortcut="Ctrl+P"
            onClick={() => actionAndClose()}
          />
          <Divider />
          <MenuItem
            icon={ICONS.export}
            label={t("export")}
            active={activePanel === "export"}
            onClick={() => setActivePanel("export")}
          />
          <Divider />
          <MenuItem
            icon={ICONS.preferences}
            label={t("preferences")}
            shortcut="Ctrl+,"
            onClick={() => actionAndClose(onOpenSettings)}
          />
          <Divider />
          <MenuItem
            icon={ICONS.about}
            label={t("about")}
            active={activePanel === "about"}
            onClick={() => setActivePanel("about")}
          />
          <Divider />
          <MenuItem
            icon={ICONS.exit}
            label={t("exit")}
            shortcut="Alt+F4"
            onClick={() => {
              onClose();
              import("@tauri-apps/api/window").then(({ getCurrentWindow }) =>
                getCurrentWindow().close()
              );
            }}
          />
        </div>
      </div>
      {hasActivePanel && (
        <div className="backstage-content">
          {activePanel === "open" && (
            <OpenPanel
              recentFiles={recentFiles}
              onBrowse={() => { onClose(); onBrowse?.(); }}
              onOpenFile={(path) => { onClose(); onOpenFile?.(path); }}
              onRemoveFile={removeRecentFile}
              onClearAll={clearRecentFiles}
            />
          )}
          {activePanel === "about" && <AboutPanel />}
          {activePanel === "export" && <ExportPanel />}
        </div>
      )}
      {/* Click anywhere outside the menu/panel to close */}
      <div className="backstage-dismiss-area" onClick={onClose} />
    </div>
  );
}

function AboutPanel() {
  const { t } = useTranslation("backstage");

  const openExternal = (url: string) => async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="bs-about-panel">
      <h2 className="bs-about-title">{t("aboutPanel.title")}</h2>
      <div className="bs-about-app">
        <div className="bs-about-logo">
          <svg
            viewBox="0 0 1024 1024"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="40" y="40" width="944" height="944" rx="180" fill="var(--theme-accent)" />
            <text
              x="512"
              y="600"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--theme-accent-text)"
              fontSize="320"
              fontFamily="'Space Grotesk', 'Inter', Arial, sans-serif"
              fontWeight="700"
            >
              OA
            </text>
          </svg>
        </div>
        <div className="bs-about-app-info">
          <h1 className="bs-about-app-name">{t("aboutPanel.appName")}</h1>
          <p className="bs-about-version">{t("aboutPanel.version")} 0.1.0</p>
        </div>
      </div>
      <p className="bs-about-tagline">{t("aboutPanel.tagline")}</p>
      <p className="bs-about-description">{t("aboutPanel.description")}</p>
      <div className="bs-about-company">
        <h3 className="bs-about-company-name">{t("aboutPanel.companyName")}</h3>
        <p className="bs-about-company-desc">{t("aboutPanel.companyDescription")}</p>
        <p className="bs-about-company-meta">
          {t("aboutPanel.stichting")}
        </p>
      </div>
      <div className="bs-about-links">
        <a
          href="https://www.open-aec.com/"
          className="bs-about-link"
          onClick={openExternal("https://www.open-aec.com/")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" />
          </svg>
          {t("aboutPanel.website")}
        </a>
        <a
          href="https://github.com/OpenAEC-Foundation"
          className="bs-about-link"
          onClick={openExternal("https://github.com/OpenAEC-Foundation")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" />
          </svg>
          {t("aboutPanel.github")}
        </a>
      </div>
      <div className="bs-about-footer">
        <p className="bs-about-copyright">
          {t("aboutPanel.copyright")}
        </p>
      </div>
    </div>
  );
}

function OpenPanel({
  recentFiles,
  onBrowse,
  onOpenFile,
  onRemoveFile,
  onClearAll,
}: {
  recentFiles: RecentFile[];
  onBrowse: () => void;
  onOpenFile: (path: string) => void;
  onRemoveFile: (path: string) => void;
  onClearAll: () => void;
}) {
  const { t } = useTranslation("backstage");

  const typeIcon = (type: RecentFile["type"]) => {
    switch (type) {
      case "ifc":
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>';
      case "report":
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>';
      case "project":
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>';
      default:
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M13 2v7h7"/></svg>';
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return t("openPanel.justNow", "Just now");
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="bs-export-panel">
      <button
        className="bs-browse-card"
        onClick={onBrowse}
        type="button"
      >
        <span className="bs-browse-card-icon" dangerouslySetInnerHTML={{ __html: ICONS.open }} />
        <span className="bs-browse-card-info">
          <span className="bs-browse-card-title">{t("openPanel.browse", "Browse…")}</span>
          <span className="bs-browse-card-desc">
            {t("openPanel.browseDesc", "Open een .cpd of .ifc-calculation bestand vanaf schijf")}
          </span>
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto", opacity: 0.5 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 12 }}>
        <h2 className="bs-export-title" style={{ margin: 0 }}>{t("openPanel.title", "Recente bestanden")}</h2>
        {recentFiles.length > 0 && (
          <button
            onClick={onClearAll}
            style={{
              background: "none",
              border: "none",
              color: "var(--theme-text-muted, #888)",
              cursor: "pointer",
              fontSize: "0.8rem",
              textDecoration: "underline",
            }}
          >
            {t("openPanel.clearAll", "Wis lijst")}
          </button>
        )}
      </div>
      {recentFiles.length === 0 ? (
        <p style={{ color: "var(--theme-text-muted, #888)", fontStyle: "italic" }}>
          {t("openPanel.noRecent", "No recent files")}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {recentFiles.map((file) => (
            <div
              key={file.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 6,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              className="bs-recent-item"
              onClick={() => onOpenFile(file.path)}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--theme-hover, rgba(0,0,0,0.05))")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span dangerouslySetInnerHTML={{ __html: typeIcon(file.type) }} style={{ opacity: 0.6, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {file.name}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--theme-text-muted, #888)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {file.path}
                </div>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--theme-text-muted, #888)", flexShrink: 0 }}>
                {formatDate(file.timestamp)}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveFile(file.path); }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  opacity: 0.4,
                  color: "currentColor",
                  flexShrink: 0,
                }}
                title={t("openPanel.remove", "Remove")}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M3 3l6 6M9 3l-6 6" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExportPanel() {
  const { t } = useTranslation("backstage");
  return (
    <div className="bs-export-panel">
      <h2 className="bs-export-title">{t("exportPanel.title")}</h2>
      <div className="bs-export-cards">
        <div className="bs-export-card">
          <div className="bs-export-card-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
          </div>
          <div className="bs-export-card-info">
            <h3>{t("exportPanel.asPdf")}</h3>
            <p>{t("exportPanel.asPdfDesc")}</p>
          </div>
        </div>
        <div className="bs-export-card">
          <div className="bs-export-card-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <div className="bs-export-card-info">
            <h3>{t("exportPanel.asImage")}</h3>
            <p>{t("exportPanel.asImageDesc")}</p>
          </div>
        </div>
        <div className="bs-export-card">
          <div className="bs-export-card-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div className="bs-export-card-info">
            <h3>{t("exportPanel.asHtml")}</h3>
            <p>{t("exportPanel.asHtmlDesc")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
