import { useState, useEffect, useCallback } from "react";
import { getSetting, setSetting } from "../store";

export interface RecentFile {
  path: string;
  name: string;
  type: "report" | "ifc" | "project" | "unknown";
  timestamp: number;
  tenant?: string;
}

const STORE_KEY = "recentFiles";
const MAX_RECENT = 10;

function inferType(path: string): RecentFile["type"] {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "ifc" || ext === "ifcx") return "ifc";
  if (ext === "oaec" || ext === "json") return "report";
  if (ext === "oaecproj") return "project";
  return "unknown";
}

export function useRecentFiles() {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSetting<RecentFile[]>(STORE_KEY, []).then((files) => {
      setRecentFiles(files);
      setLoaded(true);
    });
  }, []);

  const addRecentFile = useCallback(
    async (pathOrFile: string | RecentFile) => {
      const file: RecentFile =
        typeof pathOrFile === "string"
          ? {
              path: pathOrFile,
              name: pathOrFile.split(/[/\\]/).pop() ?? pathOrFile,
              type: inferType(pathOrFile),
              timestamp: Date.now(),
            }
          : { ...pathOrFile, timestamp: Date.now() };

      const updated = [
        file,
        ...recentFiles.filter((f) => f.path !== file.path),
      ].slice(0, MAX_RECENT);

      setRecentFiles(updated);
      await setSetting(STORE_KEY, updated);
    },
    [recentFiles]
  );

  const removeRecentFile = useCallback(
    async (path: string) => {
      const updated = recentFiles.filter((f) => f.path !== path);
      setRecentFiles(updated);
      await setSetting(STORE_KEY, updated);
    },
    [recentFiles]
  );

  const clearRecentFiles = useCallback(async () => {
    setRecentFiles([]);
    await setSetting(STORE_KEY, []);
  }, []);

  return { recentFiles, loaded, addRecentFile, removeRecentFile, clearRecentFiles };
}
