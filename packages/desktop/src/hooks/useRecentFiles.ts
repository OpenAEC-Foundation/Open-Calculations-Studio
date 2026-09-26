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
/** Het lint, het Bestand-menu en de sneltoetsen hebben elk een eigen
 *  exemplaar van deze hook; zo zien ze elkaars wijzigingen. */
const GEWIJZIGD = "recent-files-changed";

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
    const lees = () =>
      getSetting<RecentFile[]>(STORE_KEY, []).then((files) => {
        setRecentFiles(files);
        setLoaded(true);
      });
    lees();
    window.addEventListener(GEWIJZIGD, lees);
    return () => window.removeEventListener(GEWIJZIGD, lees);
  }, []);

  const bewaar = useCallback(async (files: RecentFile[]) => {
    setRecentFiles(files);
    await setSetting(STORE_KEY, files);
    window.dispatchEvent(new Event(GEWIJZIGD));
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

      // Van de opgeslagen lijst uitgaan, niet van de eigen kopie: die kan
      // achterlopen op een ander exemplaar.
      const huidig = await getSetting<RecentFile[]>(STORE_KEY, []);
      await bewaar([file, ...huidig.filter((f) => f.path !== file.path)].slice(0, MAX_RECENT));
    },
    [bewaar]
  );

  const removeRecentFile = useCallback(
    async (path: string) => {
      const huidig = await getSetting<RecentFile[]>(STORE_KEY, []);
      await bewaar(huidig.filter((f) => f.path !== path));
    },
    [bewaar]
  );

  const clearRecentFiles = useCallback(() => bewaar([]), [bewaar]);

  return { recentFiles, loaded, addRecentFile, removeRecentFile, clearRecentFiles };
}
