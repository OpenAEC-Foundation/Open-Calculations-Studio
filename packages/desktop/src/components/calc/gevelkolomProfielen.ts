/**
 * Profielen van het rekenblad Stalen gevelkolom: dezelfde id's als de
 * keuzelijst in templates/stalenGevelkolom.ts, met alleen de maten die het
 * parametrische beeld tekent. De doorsnedegrootheden staan in de matrix van het
 * blad; scripts/check-gevelkolom.mjs bewaakt dat beide lijsten gelijk lopen.
 */
export interface GevelProfiel {
  naam: string;
  h: number;
  b: number;
  tw: number;
  tf: number;
}

export const GEVEL_PROFIELEN: Record<number, GevelProfiel> = {
  1: { naam: "IPE 80", h: 80, b: 46, tw: 3.8, tf: 5.2 },
  2: { naam: "IPE 100", h: 100, b: 55, tw: 4.1, tf: 5.7 },
  3: { naam: "IPE 120", h: 120, b: 64, tw: 4.4, tf: 6.3 },
  4: { naam: "IPE 140", h: 140, b: 73, tw: 4.7, tf: 6.9 },
  5: { naam: "IPE 160", h: 160, b: 82, tw: 5, tf: 7.4 },
  6: { naam: "IPE 180", h: 180, b: 91, tw: 5.3, tf: 8 },
  7: { naam: "IPE 200", h: 200, b: 100, tw: 5.6, tf: 8.5 },
  8: { naam: "IPE 220", h: 220, b: 110, tw: 5.9, tf: 9.2 },
  9: { naam: "IPE 240", h: 240, b: 120, tw: 6.2, tf: 9.8 },
  10: { naam: "IPE 270", h: 270, b: 135, tw: 6.6, tf: 10.2 },
  11: { naam: "IPE 300", h: 300, b: 150, tw: 7.1, tf: 10.7 },
  12: { naam: "IPE 330", h: 330, b: 160, tw: 7.5, tf: 11.5 },
  13: { naam: "IPE 360", h: 360, b: 170, tw: 8, tf: 12.7 },
  14: { naam: "IPE 400", h: 400, b: 180, tw: 8.6, tf: 13.5 },
  15: { naam: "IPE 450", h: 450, b: 190, tw: 9.4, tf: 14.6 },
  16: { naam: "IPE 500", h: 500, b: 200, tw: 10.2, tf: 16 },
  17: { naam: "IPE 550", h: 550, b: 210, tw: 11.1, tf: 17.2 },
  18: { naam: "IPE 600", h: 600, b: 220, tw: 12, tf: 19 },
  19: { naam: "HEA 100", h: 96, b: 100, tw: 5, tf: 8 },
  20: { naam: "HEA 120", h: 114, b: 120, tw: 5, tf: 8 },
  21: { naam: "HEA 140", h: 133, b: 140, tw: 5.5, tf: 8.5 },
  22: { naam: "HEA 160", h: 152, b: 160, tw: 6, tf: 9 },
  23: { naam: "HEA 180", h: 171, b: 180, tw: 6, tf: 9.5 },
  24: { naam: "HEA 200", h: 190, b: 200, tw: 6.5, tf: 10 },
  25: { naam: "HEA 220", h: 210, b: 220, tw: 7, tf: 11 },
  26: { naam: "HEA 240", h: 230, b: 240, tw: 7.5, tf: 12 },
  27: { naam: "HEA 260", h: 250, b: 260, tw: 7.5, tf: 12.5 },
  28: { naam: "HEA 280", h: 270, b: 280, tw: 8, tf: 13 },
  29: { naam: "HEA 300", h: 290, b: 300, tw: 8.5, tf: 14 },
  30: { naam: "HEA 320", h: 310, b: 300, tw: 9, tf: 15.5 },
  31: { naam: "HEA 340", h: 330, b: 300, tw: 9.5, tf: 16.5 },
  32: { naam: "HEA 360", h: 350, b: 300, tw: 10, tf: 17.5 },
  33: { naam: "HEA 400", h: 390, b: 300, tw: 11, tf: 19 },
  34: { naam: "HEA 450", h: 440, b: 300, tw: 11.5, tf: 21 },
  35: { naam: "HEA 500", h: 490, b: 300, tw: 12, tf: 23 },
  36: { naam: "HEA 550", h: 540, b: 300, tw: 12.5, tf: 24 },
  37: { naam: "HEA 600", h: 590, b: 300, tw: 13, tf: 25 },
  38: { naam: "HEA 650", h: 640, b: 300, tw: 13.5, tf: 26 },
  39: { naam: "HEA 700", h: 690, b: 300, tw: 14.5, tf: 27 },
  40: { naam: "HEA 800", h: 790, b: 300, tw: 15, tf: 28 },
  41: { naam: "HEA 900", h: 890, b: 300, tw: 16, tf: 30 },
  42: { naam: "HEA 1000", h: 990, b: 300, tw: 16.5, tf: 31 },
  43: { naam: "HEB 100", h: 100, b: 100, tw: 6, tf: 10 },
  44: { naam: "HEB 120", h: 120, b: 120, tw: 6.5, tf: 11 },
  45: { naam: "HEB 140", h: 140, b: 140, tw: 7, tf: 12 },
  46: { naam: "HEB 160", h: 160, b: 160, tw: 8, tf: 13 },
  47: { naam: "HEB 180", h: 180, b: 180, tw: 8.5, tf: 14 },
  48: { naam: "HEB 200", h: 200, b: 200, tw: 9, tf: 15 },
  49: { naam: "HEB 220", h: 220, b: 220, tw: 9.5, tf: 16 },
  50: { naam: "HEB 240", h: 240, b: 240, tw: 10, tf: 17 },
  51: { naam: "HEB 260", h: 260, b: 260, tw: 10, tf: 17.5 },
  52: { naam: "HEB 280", h: 280, b: 280, tw: 10.5, tf: 18 },
  53: { naam: "HEB 300", h: 300, b: 300, tw: 11, tf: 19 },
  54: { naam: "HEB 320", h: 320, b: 300, tw: 11.5, tf: 20.5 },
  55: { naam: "HEB 340", h: 340, b: 300, tw: 12, tf: 21.5 },
  56: { naam: "HEB 360", h: 360, b: 300, tw: 12.5, tf: 22.5 },
  57: { naam: "HEB 400", h: 400, b: 300, tw: 13.5, tf: 24 },
};
