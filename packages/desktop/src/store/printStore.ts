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
  /**
   * Welke bladen er in de uitdraai komen, als id's; `null` is het hele
   * project. Eén blad is een losse berekening: die krijgt geen voorblad maar
   * een titelblok boven het blad.
   */
  selectie: string[] | null;
  /** Start het afdrukken; met een selectie wordt die eerst ingesteld. */
  afdrukken: (selectie?: string[] | null) => void;
  klaar: () => void;
  /** Opent het voorbeeld; met een selectie wordt die eerst ingesteld. */
  toonVoorbeeld: (selectie?: string[] | null) => void;
  sluitVoorbeeld: () => void;
  kiesSelectie: (selectie: string[] | null) => void;
}

export const usePrintStore = create<PrintState>((set) => ({
  bezig: false,
  voorbeeld: false,
  selectie: null,
  afdrukken: (selectie) => set(selectie === undefined ? { bezig: true } : { bezig: true, selectie }),
  klaar: () => set({ bezig: false }),
  toonVoorbeeld: (selectie) => set(selectie === undefined ? { voorbeeld: true } : { voorbeeld: true, selectie }),
  sluitVoorbeeld: () => set({ voorbeeld: false }),
  kiesSelectie: (selectie) => set({ selectie }),
}));

/**
 * De actie waarmee een knop of sneltoets het afdrukken start: het hele
 * project, tenzij het afdrukvoorbeeld openstaat — dan geldt de keuze die
 * daar is gemaakt.
 */
export function useAfdrukken(): () => void {
  const afdrukken = usePrintStore((s) => s.afdrukken);
  const voorbeeld = usePrintStore((s) => s.voorbeeld);
  return () => (voorbeeld ? afdrukken() : afdrukken(null));
}
