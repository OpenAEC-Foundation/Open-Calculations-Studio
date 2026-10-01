import { useEffect } from "react";
import { useProjectStore } from "../store/projectStore";
import { useAfdrukken } from "../store/printStore";
import { useBestandActies } from "./useBestandActies";

/**
 * Sneltoetsen: Ctrl+Z / Ctrl+Y (en Ctrl+Shift+Z) om ongedaan te maken, Ctrl+P
 * om af te drukken, en voor het bestand Ctrl+N, Ctrl+O, Ctrl+S en
 * Ctrl+Shift+S.
 *
 * De editor heeft zijn eigen geschiedenis uitstaan, dus deze snelkoppelingen
 * werken overal hetzelfde: in de rekentekst, in het parametrische beeld en in
 * de projectboom.
 *
 * Uitzondering: staat de cursor in een gewoon invoerveld — een naam die je aan
 * het typen bent, een veld in de projectgegevens — dan laat de browser zijn
 * eigen ongedaan-gedrag doen. Anders zou één toetsaanslag zowel het woord als
 * de vorige projectwijziging terugdraaien. De bestandstoetsen gelden wél
 * overal: opslaan terwijl je nog in een veld staat moet gewoon werken.
 */
export function useSneltoetsen(): void {
  const ongedaan = useProjectStore((s) => s.ongedaan);
  const opnieuw = useProjectStore((s) => s.opnieuw);
  const afdrukken = useAfdrukken();
  const { nieuw, openen, opslaan, opslaanAls } = useBestandActies();

  useEffect(() => {
    const opToets = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const bestand: Record<string, () => void> = {
        n: nieuw,
        o: openen,
        s: e.shiftKey ? opslaanAls : opslaan,
      };
      const actie = e.altKey ? undefined : bestand[e.key.toLowerCase()];
      if (actie) {
        e.preventDefault();
        actie();
        return;
      }
      const doel = e.target as HTMLElement | null;
      const tag = doel?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      const toets = e.key.toLowerCase();
      if (toets === "p") {
        // Eigen afdrukweergave in plaats van de kale pagina van de browser.
        e.preventDefault();
        afdrukken();
      } else if (toets === "z" && !e.shiftKey) {
        e.preventDefault();
        ongedaan();
      } else if (toets === "y" || (toets === "z" && e.shiftKey)) {
        e.preventDefault();
        opnieuw();
      }
    };
    window.addEventListener("keydown", opToets);
    return () => window.removeEventListener("keydown", opToets);
  }, [ongedaan, opnieuw, afdrukken, nieuw, openen, opslaan, opslaanAls]);
}
