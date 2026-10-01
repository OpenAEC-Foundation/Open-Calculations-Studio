import { create } from "zustand";

/**
 * Wat er wordt afgedrukt. "bladen" is de uitdraai van rekenbladen: één blad
 * als losse berekening met een titelblok, of meer bladen achter een voorblad.
 * "rapport" is het constructierapport, met de rekenbladen in bijlage A.
 */
export type AfdrukSoort = "bladen" | "rapport";

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
  /**
   * Bladen of rapport. Blijft staan tot een volgende afdruk of een volgend
   * voorbeeld een andere soort vraagt, net als `selectie`: de knop
   * "PDF / afdrukken…" in het voorbeeld drukt zo af wat er te zien is.
   */
  soort: AfdrukSoort;
  /** Start het afdrukken; een opgegeven selectie of soort wordt eerst ingesteld. */
  afdrukken: (selectie?: string[] | null, soort?: AfdrukSoort) => void;
  klaar: () => void;
  /** Opent het voorbeeld; een opgegeven selectie of soort wordt eerst ingesteld. */
  toonVoorbeeld: (selectie?: string[] | null, soort?: AfdrukSoort) => void;
  sluitVoorbeeld: () => void;
  kiesSelectie: (selectie: string[] | null) => void;
}

/** Alleen wat is opgegeven: een weggelaten argument laat de huidige keuze staan. */
function opgegeven(selectie?: string[] | null, soort?: AfdrukSoort): Partial<PrintState> {
  return {
    ...(selectie === undefined ? {} : { selectie }),
    ...(soort === undefined ? {} : { soort }),
  };
}

export const usePrintStore = create<PrintState>((set) => ({
  bezig: false,
  voorbeeld: false,
  selectie: null,
  soort: "bladen",
  afdrukken: (selectie, soort) => set({ bezig: true, ...opgegeven(selectie, soort) }),
  klaar: () => set({ bezig: false }),
  toonVoorbeeld: (selectie, soort) => set({ voorbeeld: true, ...opgegeven(selectie, soort) }),
  sluitVoorbeeld: () => set({ voorbeeld: false }),
  kiesSelectie: (selectie) => set({ selectie }),
}));

/**
 * De actie waarmee een knop of sneltoets het afdrukken start: het
 * constructierapport, tenzij het afdrukvoorbeeld openstaat — dan geldt wat
 * daar te zien is (het rapport, alle bladen of één blad).
 *
 * Twee selectors, in deze volgorde: App roept deze hook via useSneltoetsen
 * aan, en het aantal hooks daarin verandert niet zonder App mee te nemen.
 */
export function useAfdrukken(): () => void {
  const afdrukken = usePrintStore((s) => s.afdrukken);
  const voorbeeld = usePrintStore((s) => s.voorbeeld);
  return () => (voorbeeld ? afdrukken() : afdrukken(null, "rapport"));
}
