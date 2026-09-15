import { create } from "zustand";

/**
 * Schakelaar voor de afdrukweergave.
 *
 * Het hele project als HTML opbouwen kost tijd bij twintig bladen, dus dat
 * gebeurt niet bij elke render maar alleen op het moment dat je print. `bezig`
 * staat aan tussen "print gevraagd" en "printdialoog gesloten"; alleen dan
 * bestaat `<PrintDocument />` in de DOM.
 */
interface PrintState {
  bezig: boolean;
  /**
   * Afdrukvoorbeeld: dezelfde weergave, maar op het scherm en zonder de
   * printdialoog. Zonder dit is een printlayout niet te controleren zonder hem
   * uit te draaien — en dan zie je pas op papier dat er iets niet klopt.
   */
  voorbeeld: boolean;
  afdrukken: () => void;
  klaar: () => void;
  toonVoorbeeld: () => void;
  sluitVoorbeeld: () => void;
}

export const usePrintStore = create<PrintState>((set) => ({
  bezig: false,
  voorbeeld: false,
  afdrukken: () => set({ bezig: true }),
  klaar: () => set({ bezig: false }),
  toonVoorbeeld: () => set({ voorbeeld: true }),
  sluitVoorbeeld: () => set({ voorbeeld: false }),
}));

/** De actie waarmee elke knop het afdrukken start. */
export function useAfdrukken(): () => void {
  return usePrintStore((s) => s.afdrukken);
}
