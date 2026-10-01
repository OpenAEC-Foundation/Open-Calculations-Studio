import { create } from "zustand";
import { templates } from "../templates";
import { useProjectStore } from "./projectStore";

/**
 * Het scherm "Module toevoegen" en het blad dat daar net mee is ingevoegd.
 *
 * Modules en naslagbladen komen via één scherm het project in, geopend vanuit
 * het lint. Een vers ingevoegd blad staat in de projectlijst meteen met zijn
 * naam in bewerkstand: in een project heet een balklaag eerder "Dak" of
 * "Verdiepingsvloer" dan "Balklaag 1". Typ je niets, dan blijft de voorgestelde
 * naam staan.
 */
interface ModuleKiezerState {
  open: boolean;
  /** Het blad dat net is ingevoegd; de projectlijst zet het in de naamgeefstand. */
  nieuwId: string | null;
  openen: () => void;
  sluiten: () => void;
  naamKlaar: () => void;
  /** Voegt een blad uit de catalogus toe, selecteert het en sluit het scherm. */
  voegToe: (templateId: string, label: string) => void;
}

export const useModuleKiezer = create<ModuleKiezerState>((set) => ({
  open: false,
  nieuwId: null,
  openen: () => set({ open: true }),
  sluiten: () => set({ open: false }),
  naamKlaar: () => set({ nieuwId: null }),
  voegToe: (templateId, label) => {
    const bron = templates[templateId];
    if (!bron) return;
    // De catalogus draagt een toelichting in het label ("Balklaag (houten
    // vloerbalken)"); als naam van een blad is dat te lang. De korte vorm is
    // toch maar een voorstel.
    const kort = label.replace(/\s*\([^)]*\)\s*$/, "").trim() || label;
    const id = useProjectStore.getState().voegToe(templateId, kort, bron);
    set({ nieuwId: id, open: false });
  },
}));
