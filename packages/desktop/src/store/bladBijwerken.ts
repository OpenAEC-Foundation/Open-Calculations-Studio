import { create } from "zustand";

/**
 * Het scherm "Vergelijken en bijwerken" (components/calc/BladBijwerken.tsx).
 *
 * Geopend vanuit de melding boven een verouderd blad (één blad, uitgebreid
 * vergeleken) of vanuit de projectboom (alle verouderde bladen in één tabel).
 * Alleen welke bladen erin staan; de vergelijking rekent het scherm zelf.
 */
interface BladBijwerkenState {
  /** De bladen in het scherm; null = dicht. */
  ids: string[] | null;
  openen: (ids: string[]) => void;
  sluiten: () => void;
}

export const useBladBijwerken = create<BladBijwerkenState>((set) => ({
  ids: null,
  openen: (ids) => set({ ids: ids.length > 0 ? ids : null }),
  sluiten: () => set({ ids: null }),
}));
