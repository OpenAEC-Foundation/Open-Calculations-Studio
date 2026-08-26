/**
 * Europese profieltabel — gedeeld door de staalmodules (stalen kolom,
 * brandwerendheid, moment- en dwarskrachtverbinding).
 *
 * De id's komen overeen met de @select-waarden in de bijbehorende rekenbladen.
 * Maten in mm, oppervlak in mm². Waarden volgens de Europese profieltabellen;
 * dezelfde reeks als de matrix in voetplaatverbinding.ts.
 */

export interface Profiel {
  naam: string;
  h: number;   // profielhoogte
  b: number;   // flensbreedte
  tw: number;  // lijfdikte
  tf: number;  // flensdikte
  A: number;   // doorsnede-oppervlak
}

export const PROFIELEN: Record<number, Profiel> = {
  1: { naam: "HEA 100", h: 96, b: 100, tw: 5, tf: 8, A: 2124 },
  2: { naam: "HEA 120", h: 114, b: 120, tw: 5, tf: 8, A: 2534 },
  3: { naam: "HEA 140", h: 133, b: 140, tw: 5.5, tf: 8.5, A: 3142 },
  4: { naam: "HEA 160", h: 152, b: 160, tw: 6, tf: 9, A: 3877 },
  5: { naam: "HEA 180", h: 171, b: 180, tw: 6, tf: 9.5, A: 4525 },
  6: { naam: "HEA 200", h: 190, b: 200, tw: 6.5, tf: 10, A: 5383 },
  7: { naam: "HEA 220", h: 210, b: 220, tw: 7, tf: 11, A: 6434 },
  8: { naam: "HEA 240", h: 230, b: 240, tw: 7.5, tf: 12, A: 7684 },
  9: { naam: "HEA 260", h: 250, b: 260, tw: 7.5, tf: 12.5, A: 8682 },
  10: { naam: "HEA 300", h: 290, b: 300, tw: 8.5, tf: 14, A: 11250 },
  11: { naam: "HEB 100", h: 100, b: 100, tw: 6, tf: 10, A: 2604 },
  12: { naam: "HEB 120", h: 120, b: 120, tw: 6.5, tf: 11, A: 3401 },
  13: { naam: "HEB 140", h: 140, b: 140, tw: 7, tf: 12, A: 4296 },
  14: { naam: "HEB 160", h: 160, b: 160, tw: 8, tf: 13, A: 5425 },
  15: { naam: "HEB 180", h: 180, b: 180, tw: 8.5, tf: 14, A: 6525 },
  16: { naam: "HEB 200", h: 200, b: 200, tw: 9, tf: 15, A: 7808 },
  17: { naam: "HEB 220", h: 220, b: 220, tw: 9.5, tf: 16, A: 9104 },
  18: { naam: "HEB 240", h: 240, b: 240, tw: 10, tf: 17, A: 10600 },
  19: { naam: "HEB 260", h: 260, b: 260, tw: 10, tf: 17.5, A: 11840 },
  20: { naam: "HEB 300", h: 300, b: 300, tw: 11, tf: 19, A: 14910 },
  21: { naam: "IPE 200", h: 200, b: 100, tw: 5.6, tf: 8.5, A: 2848 },
  22: { naam: "IPE 240", h: 240, b: 120, tw: 6.2, tf: 9.8, A: 3912 },
  23: { naam: "IPE 270", h: 270, b: 135, tw: 6.6, tf: 10.2, A: 4595 },
  24: { naam: "IPE 300", h: 300, b: 150, tw: 7.1, tf: 10.7, A: 5381 },
  25: { naam: "IPE 330", h: 330, b: 160, tw: 7.5, tf: 11.5, A: 6261 },
  26: { naam: "IPE 360", h: 360, b: 170, tw: 8, tf: 12.7, A: 7273 },
  27: { naam: "IPE 400", h: 400, b: 180, tw: 8.6, tf: 13.5, A: 8446 },
};

export const profiel = (id: number, terugval = 5): Profiel =>
  PROFIELEN[Math.round(id)] ?? PROFIELEN[terugval];

/** Keuzelijst voor een `<select>`, in tabelvolgorde. */
export const profielOpties = (ids?: number[]) =>
  (ids ?? Object.keys(PROFIELEN).map(Number)).map((id) => ({ v: id, label: PROFIELEN[id].naam }));

/**
 * Verhitte omtrek A_m [mm/m'] van een I-profiel, voor de profielfactor A_m/V.
 * `koker` = kokervormig omhuld (rechthoekige omtrek), anders profielvolgend.
 * `zijden` = 4 (alzijdig) of 3 (vloer op de bovenflens).
 */
export function omtrek(p: Profiel, koker: boolean, zijden: 3 | 4): number {
  if (koker) return zijden === 4 ? 2 * (p.h + p.b) : 2 * p.h + p.b;
  return zijden === 4 ? 2 * p.h + 4 * p.b - 2 * p.tw : 2 * p.h + 3 * p.b - 2 * p.tw;
}
