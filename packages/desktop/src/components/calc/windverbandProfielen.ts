/**
 * Profielen van het rekenblad Verticaal windverband: dezelfde id's als de
 * keuzelijst in templates/verticaalWindverband.ts, met alleen de maten die het
 * parametrische beeld tekent (mm). De doorsnedegrootheden staan in de matrix
 * van het blad; scripts/check-windverband.mjs bewaakt dat beide gelijk lopen.
 */
export interface VerbandProfiel {
  naam: string;
  /** 1 = strip, 2 = gelijkzijdig hoekprofiel */
  soort: 1 | 2;
  b: number;
  t: number;
  /** Afstand van het zwaartepunt tot de hiel (hoekprofiel), anders 0. */
  e: number;
}

export const VERBAND_PROFIELEN: Record<number, VerbandProfiel> = {
  1: { naam: "Strip 30 × 5", soort: 1, b: 30, t: 5, e: 0 },
  2: { naam: "Strip 40 × 5", soort: 1, b: 40, t: 5, e: 0 },
  3: { naam: "Strip 50 × 5", soort: 1, b: 50, t: 5, e: 0 },
  4: { naam: "Strip 60 × 5", soort: 1, b: 60, t: 5, e: 0 },
  5: { naam: "Strip 60 × 8", soort: 1, b: 60, t: 8, e: 0 },
  6: { naam: "Strip 60 × 10", soort: 1, b: 60, t: 10, e: 0 },
  7: { naam: "Strip 80 × 6", soort: 1, b: 80, t: 6, e: 0 },
  8: { naam: "Strip 80 × 8", soort: 1, b: 80, t: 8, e: 0 },
  9: { naam: "Strip 80 × 10", soort: 1, b: 80, t: 10, e: 0 },
  10: { naam: "Strip 100 × 8", soort: 1, b: 100, t: 8, e: 0 },
  11: { naam: "Strip 100 × 10", soort: 1, b: 100, t: 10, e: 0 },
  12: { naam: "Strip 100 × 12", soort: 1, b: 100, t: 12, e: 0 },
  13: { naam: "Strip 120 × 10", soort: 1, b: 120, t: 10, e: 0 },
  14: { naam: "Strip 120 × 12", soort: 1, b: 120, t: 12, e: 0 },
  15: { naam: "Strip 150 × 12", soort: 1, b: 150, t: 12, e: 0 },
  16: { naam: "L 30 × 30 × 3", soort: 2, b: 30, t: 3, e: 8.35 },
  17: { naam: "L 40 × 40 × 4", soort: 2, b: 40, t: 4, e: 11.2 },
  18: { naam: "L 50 × 50 × 5", soort: 2, b: 50, t: 5, e: 14 },
  19: { naam: "L 50 × 50 × 6", soort: 2, b: 50, t: 6, e: 14.5 },
  20: { naam: "L 60 × 60 × 6", soort: 2, b: 60, t: 6, e: 16.9 },
  21: { naam: "L 60 × 60 × 8", soort: 2, b: 60, t: 8, e: 17.7 },
  22: { naam: "L 70 × 70 × 7", soort: 2, b: 70, t: 7, e: 19.7 },
  23: { naam: "L 80 × 80 × 8", soort: 2, b: 80, t: 8, e: 22.6 },
  24: { naam: "L 80 × 80 × 10", soort: 2, b: 80, t: 10, e: 23.4 },
  25: { naam: "L 90 × 90 × 9", soort: 2, b: 90, t: 9, e: 25.4 },
  26: { naam: "L 100 × 100 × 10", soort: 2, b: 100, t: 10, e: 28.2 },
  27: { naam: "L 100 × 100 × 12", soort: 2, b: 100, t: 12, e: 29 },
  28: { naam: "L 120 × 120 × 12", soort: 2, b: 120, t: 12, e: 34 },
  29: { naam: "L 150 × 150 × 12", soort: 2, b: 150, t: 12, e: 41.2 },
  30: { naam: "L 150 × 150 × 15", soort: 2, b: 150, t: 15, e: 42.5 },
};
