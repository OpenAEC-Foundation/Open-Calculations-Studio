import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import RibbonTab from "./RibbonTab";
import HomeTab from "./HomeTab";
import IfcTab from "./IfcTab";
import ReportTab from "./ReportTab";
import "./Ribbon.css";

interface RibbonProps {
  onFileTabClick?: () => void;
  onSettingsClick?: () => void;
  onProjectSettingsClick?: () => void;
  activeView: string;
  onViewChange: (view: string) => void;
  /** @deprecated — read from useReportStore in the Report tab/preview. Kept for prop-compat. */
  pageSize?: "A4" | "A3";
  /** @deprecated */
  orientation?: "portrait" | "landscape";
  /** @deprecated */
  onPageSizeChange?: (size: "A4" | "A3") => void;
  /** @deprecated */
  onOrientationChange?: (orientation: "portrait" | "landscape") => void;
}

const TABS = ["home", "ifc", "viewer", "report"] as const;
type TabId = (typeof TABS)[number];

export default function Ribbon({ onFileTabClick, onSettingsClick, onProjectSettingsClick, onViewChange }: RibbonProps) {
  const { t, i18n } = useTranslation("ribbon");
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [prevTab, setPrevTab] = useState<TabId | null>(null);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const tabsRef = useRef<HTMLDivElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);
  const gapRef = useRef<HTMLDivElement>(null);

  const updateHighlight = useCallback(() => {
    const tabsEl = tabsRef.current;
    const borderEl = borderRef.current;
    const gapEl = gapRef.current;
    if (!tabsEl || !borderEl || !gapEl) return;

    const activeEl = tabsEl.querySelector(".ribbon-tab.active") as HTMLElement | null;
    if (!activeEl) {
      borderEl.style.opacity = "0";
      gapEl.style.opacity = "0";
      return;
    }

    const tabsRect = tabsEl.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    const left = activeRect.left - tabsRect.left;
    const top = activeRect.top - tabsRect.top;
    const width = activeRect.width;
    const height = activeRect.height;

    borderEl.style.opacity = "1";
    borderEl.style.left = `${left}px`;
    borderEl.style.top = `${top}px`;
    borderEl.style.width = `${width}px`;
    borderEl.style.height = `${height}px`;

    gapEl.style.opacity = "1";
    gapEl.style.left = `${left + 1}px`;
    gapEl.style.width = `${width - 2}px`;
  }, []);

  const switchTab = useCallback((newTab: TabId) => {
    if (newTab === activeTab) return;
    const oldIndex = TABS.indexOf(activeTab);
    const newIndex = TABS.indexOf(newTab);
    setDirection(newIndex > oldIndex ? "right" : "left");
    setPrevTab(activeTab);
    setActiveTab(newTab);
    setAnimating(true);

    // Switch main content view based on tab
    if (newTab === "ifc") onViewChange("ifc");
    else if (newTab === "viewer") onViewChange("viewer");
    else if (newTab === "report") onViewChange("report");
    else onViewChange("default");
  }, [activeTab, onViewChange]);

  useEffect(() => {
    updateHighlight();
    requestAnimationFrame(updateHighlight);
  }, [activeTab, i18n.language, updateHighlight]);

  useEffect(() => {
    window.addEventListener("resize", updateHighlight);
    return () => window.removeEventListener("resize", updateHighlight);
  }, [updateHighlight]);

  useEffect(() => {
    if (!animating) return;
    const timer = setTimeout(() => {
      setAnimating(false);
      setPrevTab(null);
    }, 250);
    return () => clearTimeout(timer);
  }, [animating]);

  const renderContent = (tab: TabId) => {
    switch (tab) {
      case "home": return <HomeTab onSettingsClick={onSettingsClick} onProjectSettingsClick={onProjectSettingsClick} />;
      case "ifc": return <IfcTab />;
      case "viewer": return null; // 3D Viewer has no ribbon buttons
      case "report": return <ReportTab />;
    }
  };

  // Hide ribbon content area for viewer tab (no buttons needed)
  const hideContent = activeTab === "viewer";

  return (
    <div className="ribbon-container">
      <div className="ribbon-tabs" ref={tabsRef}>
        <RibbonTab label={t("tabs.file")} isFileTab onClick={() => onFileTabClick?.()} />
        {TABS.map((tab) => (
          <RibbonTab
            key={tab}
            label={t(`tabs.${tab}`)}
            isActive={activeTab === tab}
            onClick={() => switchTab(tab)}
          />
        ))}
        <div className="ribbon-tab-border" ref={borderRef} />
        <div className="ribbon-tab-gap" ref={gapRef} />
      </div>

      {!hideContent && (
        <div className="ribbon-content-wrapper">
          {animating && prevTab && prevTab !== "viewer" && (
            <div
              className={`ribbon-content-panel ribbon-panel-exit-${direction}`}
              key={`prev-${prevTab}`}
            >
              {renderContent(prevTab)}
            </div>
          )}
          <div
            className={`ribbon-content-panel${animating ? ` ribbon-panel-enter-${direction}` : ""}`}
            key={`active-${activeTab}`}
          >
            {renderContent(activeTab)}
          </div>
        </div>
      )}
    </div>
  );
}
