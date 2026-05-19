import { useState, useRef, useCallback, useEffect } from "react";
import {
  useWindowManager,
  EVT_DOCK_REQUEST,
  type DockBackPayload,
} from "../hooks/useWindowManager";
import { getDetachedParams } from "../hooks/useWindowManager";
import "./DocumentBar.css";

interface DocTab {
  id: string;
  title: string;
  view?: string;
  modified?: boolean;
}

const INITIAL_DOCS: DocTab[] = [
  { id: "1", title: "Project Overview.oaec", view: "default", modified: false },
  { id: "2", title: "Floor Plan - Level 1.oaec", view: "default", modified: true },
  { id: "3", title: "Structural Analysis.oaec", view: "default", modified: false },
];

const DRAG_DETACH_THRESHOLD = 60;

let nextId = 100;

export default function DocumentBar() {
  const [docs, setDocs] = useState<DocTab[]>(INITIAL_DOCS);
  const [activeId, setActiveId] = useState("1");
  const [dockIndicator, setDockIndicator] = useState(false);
  const { createDetachedWindow, listenEvent, confirmDock } = useWindowManager();

  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragTabId = useRef<string | null>(null);
  const isDragging = useRef(false);

  // ── Listen for dock-back requests from detached windows ──
  useEffect(() => {
    const { detached } = getDetachedParams();
    if (detached) return; // Don't listen in detached windows

    listenEvent(EVT_DOCK_REQUEST, (payload) => {
      const data = payload as DockBackPayload;

      // Add the tab back
      nextId++;
      const newTab: DocTab = {
        id: `docked-${nextId}`,
        title: data.title,
        view: data.view,
        modified: false,
      };

      setDocs((prev) => [...prev, newTab]);
      setActiveId(newTab.id);

      // Flash the dock indicator briefly
      setDockIndicator(true);
      setTimeout(() => setDockIndicator(false), 600);

      // Close the detached window
      confirmDock(data.label);
    });
  }, [listenEvent, confirmDock]);

  const closeDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = docs.filter((d) => d.id !== id);
    setDocs(remaining);
    if (activeId === id && remaining.length > 0) {
      setActiveId(remaining[0].id);
    }
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      dragStartPos.current = { x: e.screenX, y: e.screenY };
      dragTabId.current = tabId;
      isDragging.current = false;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragStartPos.current || !dragTabId.current) return;
        const dy = ev.screenY - dragStartPos.current.y;

        if (Math.abs(dy) > DRAG_DETACH_THRESHOLD && !isDragging.current) {
          isDragging.current = true;

          const tab = docs.find((d) => d.id === dragTabId.current);
          if (tab && docs.length > 1) {
            createDetachedWindow({
              view: tab.view ?? "default",
              title: tab.title,
              x: ev.screenX - 400,
              y: ev.screenY - 50,
            });

            setDocs((prev) => {
              const remaining = prev.filter((d) => d.id !== dragTabId.current);
              if (activeId === dragTabId.current && remaining.length > 0) {
                setActiveId(remaining[0].id);
              }
              return remaining;
            });
          }

          cleanup();
        }
      };

      const handleMouseUp = () => {
        if (!isDragging.current && dragTabId.current) {
          setActiveId(dragTabId.current);
        }
        cleanup();
      };

      const cleanup = () => {
        dragStartPos.current = null;
        dragTabId.current = null;
        isDragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [docs, activeId, createDetachedWindow]
  );

  return (
    <div className={`document-bar${dockIndicator ? " dock-flash" : ""}`}>
      <div className="document-tabs">
        {docs.map((doc) => (
          <button
            key={doc.id}
            className={`document-tab${activeId === doc.id ? " active" : ""}`}
            onMouseDown={(e) => handleMouseDown(e, doc.id)}
          >
            <span className="document-tab-title">{doc.title}</span>
            {doc.modified && <span className="document-tab-modified" />}
            <span
              className="document-tab-close"
              onClick={(e) => closeDoc(doc.id, e)}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" />
              </svg>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
