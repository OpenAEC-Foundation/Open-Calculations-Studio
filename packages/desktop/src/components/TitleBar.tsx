import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./TitleBar.css";

interface TitleBarProps {
  onSettingsClick?: () => void;
}

function TitleBar({ onSettingsClick }: TitleBarProps) {
  const { t } = useTranslation();
  const [isMaximized, setIsMaximized] = useState(false);
  const [appVersion, setAppVersion] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appWindowRef = useRef<any>(null);

  const getWindow = useCallback(async () => {
    if (!appWindowRef.current) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      appWindowRef.current = getCurrentWindow();
    }
    return appWindowRef.current;
  }, []);

  useEffect(() => {
    import("@tauri-apps/api/app")
      .then(({ getVersion }) => getVersion())
      .then(setAppVersion)
      .catch(() => setAppVersion(""));
  }, []);

  const updateMaximizedState = useCallback(async () => {
    try {
      const win = await getWindow();
      const maximized = await win.isMaximized();
      setIsMaximized(maximized);
    } catch { /* not in Tauri */ }
  }, [getWindow]);

  useEffect(() => {
    updateMaximizedState();

    let cleanup: (() => void) | undefined;
    getWindow()
      .then((win) => win.onResized(() => updateMaximizedState()))
      .then((unlisten) => { cleanup = unlisten; })
      .catch(() => {});

    return () => { cleanup?.(); };
  }, [updateMaximizedState, getWindow]);

  const handleMinimize = async () => (await getWindow()).minimize();
  const handleMaximize = async () => (await getWindow()).toggleMaximize();
  const handleClose = async () => (await getWindow()).close();

  const handleDoubleClick = async (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".titlebar-button")) return;
    (await getWindow()).toggleMaximize();
  };

  return (
    <div className="titlebar" onDoubleClick={handleDoubleClick}>
      <div className="titlebar-drag" data-tauri-drag-region />

      <div className="titlebar-left">
        <div className="titlebar-icon">
          <svg
            width="16"
            height="16"
            viewBox="0 0 1024 1024"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="40"
              y="40"
              width="944"
              height="944"
              rx="180"
              fill="var(--theme-accent)"
            />
            <text
              x="512"
              y="580"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--theme-accent-text)"
              fontSize="340"
              fontFamily="Arial, sans-serif"
              fontWeight="400"
            >
              tmp
            </text>
          </svg>
        </div>

        <div className="titlebar-quick-access">
        <button
          className="titlebar-quick-btn"
          title={`${t("save")} (Ctrl+S)`}
          aria-label={t("save")}
          tabIndex={-1}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        </button>
        <button
          className="titlebar-quick-btn"
          title={`${t("undo")} (Ctrl+Z)`}
          aria-label={t("undo")}
          tabIndex={-1}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
          </svg>
        </button>
        <button
          className="titlebar-quick-btn"
          title={`${t("redo")} (Ctrl+Y)`}
          aria-label={t("redo")}
          tabIndex={-1}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 11-2.13-9.36L23 10" />
          </svg>
        </button>
        <button
          className="titlebar-quick-btn"
          title={`${t("print")} (Ctrl+P)`}
          aria-label={t("print")}
          tabIndex={-1}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
        </button>
          <button
            className="titlebar-quick-btn"
            title={t("preferences")}
            aria-label={t("preferences")}
            tabIndex={-1}
            onClick={onSettingsClick}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      <span className="titlebar-title" data-tauri-drag-region>
        {t("appName")}
        {appVersion && <span className="titlebar-version">v{appVersion}</span>}
      </span>

      <div className="titlebar-controls">
        <button
          className="titlebar-button titlebar-minimize"
          onClick={handleMinimize}
          aria-label={t("minimize")}
          tabIndex={-1}
        >
          <svg width="10" height="1" viewBox="0 0 10 1">
            <rect width="10" height="1" fill="currentColor" />
          </svg>
        </button>

        <button
          className="titlebar-button titlebar-maximize"
          onClick={handleMaximize}
          aria-label={isMaximized ? t("restore") : t("maximize")}
          tabIndex={-1}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="0.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <polyline points="2.5 2.5 2.5 0.5 9.5 0.5 9.5 7.5 7.5 7.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          )}
        </button>

        <button
          className="titlebar-button titlebar-close"
          onClick={handleClose}
          aria-label={t("close")}
          tabIndex={-1}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2" />
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default TitleBar;
