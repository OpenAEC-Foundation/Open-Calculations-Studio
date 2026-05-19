import { useCallback, useEffect, useRef } from "react";

export interface DetachOptions {
  view: string;
  title: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

/** Payload sent when a detached window wants to dock back. */
export interface DockBackPayload {
  label: string;
  title: string;
  view: string;
}

/** Payload sent by the main window to confirm the dock. */
export interface DockConfirmPayload {
  label: string;
}

// ── Events ──
export const EVT_DOCK_REQUEST = "openaec:dock-request";
export const EVT_DOCK_CONFIRM = "openaec:dock-confirm";

let windowCounter = 0;

export function useWindowManager() {
  const listenersRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    return () => {
      listenersRef.current.forEach((unlisten) => unlisten());
    };
  }, []);

  const createDetachedWindow = useCallback(async (opts: DetachOptions) => {
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");

    windowCounter++;
    const label = `detached-${windowCounter}`;
    const url = `index.html?view=${encodeURIComponent(opts.view)}&title=${encodeURIComponent(opts.title)}&detached=true`;

    const webview = new WebviewWindow(label, {
      url,
      title: opts.title,
      width: opts.width ?? 800,
      height: opts.height ?? 600,
      x: opts.x,
      y: opts.y,
      decorations: false,
      center: opts.x === undefined,
    });

    webview.once("tauri://error", (e) => {
      console.error("Failed to create window:", e);
    });

    return label;
  }, []);

  const broadcastEvent = useCallback(async (event: string, payload: unknown) => {
    try {
      const { emit } = await import("@tauri-apps/api/event");
      await emit(event, payload);
    } catch {
      // Not in Tauri context
    }
  }, []);

  const listenEvent = useCallback(async (event: string, handler: (payload: unknown) => void) => {
    try {
      const { listen } = await import("@tauri-apps/api/event");
      const unlisten = await listen(event, (e) => handler(e.payload));
      listenersRef.current.push(unlisten);
      return unlisten;
    } catch {
      return () => {};
    }
  }, []);

  /** Request the main window to dock this detached window back as a tab. */
  const requestDockBack = useCallback(async (title: string, view: string) => {
    try {
      const { emit } = await import("@tauri-apps/api/event");
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const label = getCurrentWindow().label;
      await emit(EVT_DOCK_REQUEST, { label, title, view } satisfies DockBackPayload);
    } catch {
      // Not in Tauri context
    }
  }, []);

  /** Confirm dock and close the detached window. */
  const confirmDock = useCallback(async (label: string) => {
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const target = await WebviewWindow.getByLabel(label);
      if (target) {
        await target.close();
      }
    } catch {
      // Window might already be closed
    }
  }, []);

  return {
    createDetachedWindow,
    broadcastEvent,
    listenEvent,
    requestDockBack,
    confirmDock,
  };
}

/**
 * Check if this window was opened as a detached view.
 */
export function getDetachedParams(): {
  detached: boolean;
  view: string | null;
  title: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  return {
    detached: params.get("detached") === "true",
    view: params.get("view"),
    title: params.get("title"),
  };
}
