/**
 * Europese profieltabel — gedeeld door de staalmodules (stalen kolom,
 * brandwerendheid, moment-, dwarskracht- en schoorverbinding).
 *
 * De id's komen overeen met de @select-waarden in de bijbehorende rekenbladen.
 * Dezelfde gegevens zijn er in twee vormen:
 *
 *   • PROFIELEN en HOEKSTALEN, voor de beelden. Alles in mm: maten in mm,
 *     oppervlak in mm², weerstandsmoment in mm³, traagheidsmoment in mm⁴,
 *     welvingsconstante in mm⁶.
 *   • profielMatrix() met profielOpzoeking(), en hoekstaalMatrix() met
 *     hoekstaalOpzoeking(), voor de rekenbladen: een CalcPAD-matrix in de
 *     eenheden van de profieltabel (mm, cm², cm⁴, …) plus de hlookup-regels die
 *     er de grootheden mét eenheid uithalen. Zie de toelichting bij
 *     profielMatrix() voor het gebruik in een blad.
 *
 * Waarden: nominaal volgens de gangbare profieltabellen (EN 10365 voor I- en
 * H-profielen, EN 10056-1 voor hoekstaal), met de afronding van die tabellen.
 * scripts/check-profielen.mjs rekent ze na uit de nominale maten en bewaakt dat
 * de matrix in een blad gelijk loopt met deze tabel.
 */

// ── I- en H-profielen ────────────────────────────────────────────────────────

/**
 * Eén regel van de tabel, in de eenheden en de kolomvolgorde van de
 * profieltabel: id, naam | h, b, t_w, t_f, r (mm) | A (cm²) | I_y (cm⁴),
 * W_el,y, W_pl,y (cm³), i_y (cm), A_v,z (cm²) | I_z (cm⁴), W_el,z, W_pl,z (cm³),
 * i_z (cm) | I_t (cm⁴), I_w (10³ cm⁶).
 */
type IRegel = readonly [
  id: number, naam: string,
  h: number, b: number, tw: number, tf: number, r: number, A: number,
  Iy: number, Wely: number, Wply: number, iy: number, Avz: number,
  Iz: number, Welz: number, Wplz: number, iz: number,
  It: number, Iw: number,
];

/**
 * A_v,z = A − 2·b·t_f + (t_w + 2r)·t_f, EN 1993-1-1 6.2.6(3)a, zonder de
 * ondergrens η·h_w·t_w: die hangt van η af en hoort in het blad.
 * I_t telt de afrondingen mee; I_w = t_f·b³·(h − t_f)²/24.
 */
const I_TABEL: readonly IRegel[] = [
  [1, "HEA 100", 96, 100, 5, 8, 12, 21.24, 349.2, 72.76, 83.01, 4.06, 7.56, 133.8, 26.76, 41.14, 2.51, 5.24, 2.58],
  [2, "HEA 120", 114, 120, 5, 8, 12, 25.34, 606.2, 106.3, 119.5, 4.89, 8.46, 230.9, 38.48, 58.85, 3.02, 5.99, 6.47],
  [3, "HEA 140", 133, 140, 5.5, 8.5, 12, 31.42, 1033, 155.4, 173.5, 5.73, 10.12, 389.3, 55.62, 84.85, 3.52, 8.13, 15.06],
  [4, "HEA 160", 152, 160, 6, 9, 15, 38.77, 1673, 220.1, 245.1, 6.57, 13.21, 615.6, 76.95, 117.6, 3.98, 12.19, 31.41],
  [5, "HEA 180", 171, 180, 6, 9.5, 15, 45.25, 2510, 293.6, 324.9, 7.45, 14.47, 924.6, 102.7, 156.5, 4.52, 14.80, 60.21],
  [6, "HEA 200", 190, 200, 6.5, 10, 18, 53.83, 3692, 388.6, 429.5, 8.28, 18.08, 1336, 133.6, 203.8, 4.98, 20.98, 108.0],
  [7, "HEA 220", 210, 220, 7, 11, 18, 64.34, 5410, 515.2, 568.5, 9.17, 20.67, 1955, 177.7, 270.6, 5.51, 28.46, 193.3],
  [8, "HEA 240", 230, 240, 7.5, 12, 21, 76.84, 7763, 675.1, 744.6, 10.05, 25.18, 2769, 230.7, 351.7, 6.00, 41.55, 328.5],
  [9, "HEA 260", 250, 260, 7.5, 12.5, 24, 86.82, 10450, 836.4, 919.8, 10.97, 28.76, 3668, 282.1, 430.2, 6.50, 52.37, 516.4],
  [10, "HEA 300", 290, 300, 8.5, 14, 27, 112.5, 18260, 1260, 1383, 12.74, 37.28, 6310, 420.6, 641.2, 7.49, 85.17, 1200],
  [11, "HEB 100", 100, 100, 6, 10, 12, 26.04, 449.5, 89.91, 104.2, 4.16, 9.04, 167.3, 33.45, 51.42, 2.53, 9.25, 3.38],
  [12, "HEB 120", 120, 120, 6.5, 11, 12, 34.01, 864.4, 144.1, 165.2, 5.04, 10.96, 317.5, 52.92, 80.97, 3.06, 13.84, 9.41],
  [13, "HEB 140", 140, 140, 7, 12, 12, 42.96, 1509, 215.6, 245.4, 5.93, 13.08, 549.7, 78.52, 119.8, 3.58, 20.06, 22.48],
  [14, "HEB 160", 160, 160, 8, 13, 15, 54.25, 2492, 311.5, 354.0, 6.78, 17.59, 889.2, 111.2, 170.0, 4.05, 31.24, 47.94],
  [15, "HEB 180", 180, 180, 8.5, 14, 15, 65.25, 3831, 425.7, 481.4, 7.66, 20.24, 1363, 151.4, 231.0, 4.57, 42.16, 93.75],
  [16, "HEB 200", 200, 200, 9, 15, 18, 78.08, 5696, 569.6, 642.5, 8.54, 24.83, 2003, 200.3, 305.8, 5.07, 59.28, 171.1],
  [17, "HEB 220", 220, 220, 9.5, 16, 18, 91.04, 8091, 735.5, 827.0, 9.43, 27.92, 2843, 258.5, 393.9, 5.59, 76.57, 295.4],
  [18, "HEB 240", 240, 240, 10, 17, 21, 106.0, 11260, 938.3, 1053, 10.31, 33.23, 3923, 326.9, 498.4, 6.08, 102.7, 486.9],
  [19, "HEB 260", 260, 260, 10, 17.5, 24, 118.4, 14920, 1148, 1283, 11.22, 37.59, 5135, 395.0, 602.2, 6.58, 123.8, 753.7],
  [20, "HEB 300", 300, 300, 11, 19, 27, 149.1, 25170, 1678, 1869, 12.99, 47.43, 8563, 570.9, 870.1, 7.58, 185.0, 1688],
  [21, "IPE 200", 200, 100, 5.6, 8.5, 12, 28.48, 1943, 194.3, 220.6, 8.26, 14.00, 142.4, 28.47, 44.61, 2.24, 6.98, 12.99],
  [22, "IPE 240", 240, 120, 6.2, 9.8, 15, 39.12, 3892, 324.3, 366.6, 9.97, 19.14, 283.6, 47.27, 73.92, 2.69, 12.88, 37.39],
  [23, "IPE 270", 270, 135, 6.6, 10.2, 15, 45.95, 5790, 428.9, 484.0, 11.23, 22.14, 419.9, 62.20, 96.95, 3.02, 15.94, 70.58],
  [24, "IPE 300", 300, 150, 7.1, 10.7, 15, 53.81, 8356, 557.1, 628.4, 12.46, 25.68, 603.8, 80.50, 125.2, 3.35, 20.12, 125.9],
  [25, "IPE 330", 330, 160, 7.5, 11.5, 18, 62.61, 11770, 713.1, 804.3, 13.71, 30.81, 788.1, 98.52, 153.7, 3.55, 28.15, 199.1],
  [26, "IPE 360", 360, 170, 8, 12.7, 18, 72.73, 16270, 903.6, 1019, 14.95, 35.14, 1043, 122.8, 191.1, 3.79, 37.32, 313.6],
  [27, "IPE 400", 400, 180, 8.6, 13.5, 21, 84.46, 23130, 1156, 1307, 16.55, 42.69, 1318, 146.4, 229.0, 3.95, 51.08, 490.0],
];

/** Een I- of H-profiel, alles in mm-eenheden (zie de kop van dit bestand). */
export interface Profiel {
  naam: string;
  h: number;    // profielhoogte
  b: number;    // flensbreedte
  tw: number;   // lijfdikte
  tf: number;   // flensdikte
  A: number;    // doorsnede-oppervlak [mm²]
  r: number;    // afrondingsstraal tussen lijf en flens [mm]
  Iy: number;   // traagheidsmoment om de sterke as [mm⁴]
  Iz: number;   // traagheidsmoment om de zwakke as [mm⁴]
  Wely: number; // elastisch weerstandsmoment, sterke as [mm³]
  Welz: number; // elastisch weerstandsmoment, zwakke as [mm³]
  Wply: number; // plastisch weerstandsmoment, sterke as [mm³]
  Wplz: number; // plastisch weerstandsmoment, zwakke as [mm³]
  iy: number;   // traagheidsstraal, sterke as [mm]
  iz: number;   // traagheidsstraal, zwakke as [mm]
  Avz: number;  // afschuifoppervlak evenwijdig aan het lijf [mm²], zie I_TABEL
  It: number;   // torsieconstante [mm⁴]
  Iw: number;   // welvingsconstante [mm⁶]
}

/** Tabelwaarde maal een macht van tien, zonder drijvendekommaruis (21.24·100 = 2124). */
const maal = (v: number, f: number) => Number((v * f).toPrecision(12));

export const PROFIELEN: Record<number, Profiel> = Object.fromEntries(
  I_TABEL.map(([id, naam, h, b, tw, tf, r, A, Iy, Wely, Wply, iy, Avz, Iz, Welz, Wplz, iz, It, Iw]) => [id, {
    naam, h, b, tw, tf, A: maal(A, 1e2), r,
    Iy: maal(Iy, 1e4), Iz: maal(Iz, 1e4),
    Wely: maal(Wely, 1e3), Welz: maal(Welz, 1e3), Wply: maal(Wply, 1e3), Wplz: maal(Wplz, 1e3),
    iy: maal(iy, 10), iz: maal(iz, 10), Avz: maal(Avz, 1e2),
    It: maal(It, 1e4), Iw: maal(Iw, 1e9),
  }]),
);

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

// ── Gelijkzijdig hoekstaal ───────────────────────────────────────────────────

/**
 * Eén regel, in de eenheden en de kolomvolgorde van de profieltabel:
 * id, naam | h, t, r_1, r_2 (mm) | A (cm²) | e (cm) | I_y (cm⁴), W_el (cm³),
 * i_y (cm) | I_u (cm⁴), i_u (cm) | I_v (cm⁴), i_v (cm).
 *
 * h = beenlengte, r_1 = afronding in de binnenhoek, r_2 = afronding aan de
 * teen, e = afstand van het zwaartepunt tot de rug van een been. I_y = I_z en
 * W_el,y = W_el,z (om de assen evenwijdig aan de benen), u–u is de sterke en
 * v–v de zwakke hoofdas. I_v volgt de tabel; die ligt voor enkele maten tot
 * 0,4 % onder de exacte uitkomst uit de nominale maten (de veilige kant).
 */
type LRegel = readonly [
  id: number, naam: string,
  h: number, t: number, r1: number, r2: number,
  A: number, e: number, Iy: number, Wel: number, iy: number,
  Iu: number, iu: number, Iv: number, iv: number,
];

/** Dezelfde id's als de keuzelijst in templates/schoorverbinding.ts. */
const L_TABEL: readonly LRegel[] = [
  [1, "L 40x40x4", 40, 4, 6, 3, 3.08, 1.12, 4.47, 1.55, 1.21, 7.09, 1.52, 1.86, 0.78],
  [2, "L 45x45x5", 45, 5, 7, 3.5, 4.30, 1.28, 7.84, 2.43, 1.35, 12.4, 1.70, 3.25, 0.87],
  [3, "L 50x50x5", 50, 5, 7, 3.5, 4.80, 1.40, 11.0, 3.05, 1.51, 17.4, 1.90, 4.54, 0.97],
  [4, "L 60x60x6", 60, 6, 8, 4, 6.91, 1.69, 22.8, 5.29, 1.82, 36.1, 2.29, 9.43, 1.17],
  [5, "L 70x70x7", 70, 7, 9, 4.5, 9.40, 1.97, 42.3, 8.41, 2.12, 67.1, 2.67, 17.5, 1.36],
  [6, "L 80x80x8", 80, 8, 10, 5, 12.3, 2.26, 72.2, 12.6, 2.43, 115, 3.06, 29.9, 1.56],
  [7, "L 90x90x9", 90, 9, 11, 5.5, 15.5, 2.54, 116, 17.9, 2.73, 184, 3.44, 47.8, 1.76],
  [8, "L 100x100x10", 100, 10, 12, 6, 19.2, 2.82, 177, 24.6, 3.04, 280, 3.83, 73.0, 1.95],
];

/** Een gelijkzijdig hoekstaal, alles in mm-eenheden. */
export interface Hoekstaal {
  naam: string;
  h: number;    // beenlengte
  t: number;    // dikte
  r1: number;   // afronding in de binnenhoek
  r2: number;   // afronding aan de teen
  A: number;    // doorsnede-oppervlak [mm²]
  e: number;    // afstand van het zwaartepunt tot de rug van een been [mm]
  Iy: number;   // traagheidsmoment om een as evenwijdig aan een been (= I_z) [mm⁴]
  Wel: number;  // elastisch weerstandsmoment om die as [mm³]
  iy: number;   // traagheidsstraal om die as [mm]
  Iu: number;   // traagheidsmoment om de sterke hoofdas [mm⁴]
  iu: number;   // traagheidsstraal om de sterke hoofdas [mm]
  Iv: number;   // traagheidsmoment om de zwakke hoofdas [mm⁴]
  iv: number;   // traagheidsstraal om de zwakke hoofdas [mm]
}

export const HOEKSTALEN: Record<number, Hoekstaal> = Object.fromEntries(
  L_TABEL.map(([id, naam, h, t, r1, r2, A, e, Iy, Wel, iy, Iu, iu, Iv, iv]) => [id, {
    naam, h, t, r1, r2, A: maal(A, 1e2), e: maal(e, 10),
    Iy: maal(Iy, 1e4), Wel: maal(Wel, 1e3), iy: maal(iy, 10),
    Iu: maal(Iu, 1e4), iu: maal(iu, 10), Iv: maal(Iv, 1e4), iv: maal(iv, 10),
  }]),
);

export const hoekstaal = (id: number, terugval = 3): Hoekstaal =>
  HOEKSTALEN[Math.round(id)] ?? HOEKSTALEN[terugval];

/** Keuzelijst voor een `<select>`, in tabelvolgorde. */
export const hoekstaalOpties = (ids?: number[]) =>
  (ids ?? Object.keys(HOEKSTALEN).map(Number)).map((id) => ({ v: id, label: HOEKSTALEN[id].naam }));

// ── CalcPAD-matrix voor de rekenbladen ───────────────────────────────────────

/** Grootheden van een I-profiel, in de rijvolgorde van profielMatrix() (rij 1 = id). */
export type ProfielGrootheid =
  | "h" | "b" | "tw" | "tf" | "r" | "A"
  | "Iy" | "Wely" | "Wply" | "iy" | "Avz"
  | "Iz" | "Welz" | "Wplz" | "iz"
  | "It" | "Iw";

/** Grootheden van een hoekstaal, in de rijvolgorde van hoekstaalMatrix() (rij 1 = id). */
export type HoekstaalGrootheid =
  | "h" | "t" | "r1" | "r2" | "A" | "e"
  | "Iy" | "Wel" | "iy" | "Iu" | "iu" | "Iv" | "iv";

interface Kolom<G extends string> {
  veld: G;
  /** Standaardnaam van de variabele in het blad. */
  naam: string;
  /** CalcPAD-eenheid van de matrixwaarde. */
  eenheid: string;
  /** Matrixwaarde = tabelwaarde · factor (alleen I_w: tabel in 10³ cm⁶). */
  factor?: number;
}

/** Rij k + 2 van de matrix = kolom k + 2 van een IRegel. */
const I_KOLOMMEN: readonly Kolom<ProfielGrootheid>[] = [
  { veld: "h", naam: "h", eenheid: "mm" },
  { veld: "b", naam: "b", eenheid: "mm" },
  { veld: "tw", naam: "t_w", eenheid: "mm" },
  { veld: "tf", naam: "t_f", eenheid: "mm" },
  { veld: "r", naam: "r", eenheid: "mm" },
  { veld: "A", naam: "A", eenheid: "cm^2" },
  { veld: "Iy", naam: "I_y", eenheid: "cm^4" },
  { veld: "Wely", naam: "W_el,y", eenheid: "cm^3" },
  { veld: "Wply", naam: "W_pl,y", eenheid: "cm^3" },
  { veld: "iy", naam: "i_y", eenheid: "cm" },
  { veld: "Avz", naam: "A_v,z", eenheid: "cm^2" },
  { veld: "Iz", naam: "I_z", eenheid: "cm^4" },
  { veld: "Welz", naam: "W_el,z", eenheid: "cm^3" },
  { veld: "Wplz", naam: "W_pl,z", eenheid: "cm^3" },
  { veld: "iz", naam: "i_z", eenheid: "cm" },
  { veld: "It", naam: "I_t", eenheid: "cm^4" },
  { veld: "Iw", naam: "I_w", eenheid: "cm^6", factor: 1e3 },
];

/** Rij k + 2 van de matrix = kolom k + 2 van een LRegel. */
const L_KOLOMMEN: readonly Kolom<HoekstaalGrootheid>[] = [
  { veld: "h", naam: "h", eenheid: "mm" },
  { veld: "t", naam: "t", eenheid: "mm" },
  { veld: "r1", naam: "r_1", eenheid: "mm" },
  { veld: "r2", naam: "r_2", eenheid: "mm" },
  { veld: "A", naam: "A", eenheid: "cm^2" },
  { veld: "e", naam: "e", eenheid: "cm" },
  { veld: "Iy", naam: "I_y", eenheid: "cm^4" },
  { veld: "Wel", naam: "W_el", eenheid: "cm^3" },
  { veld: "iy", naam: "i_y", eenheid: "cm" },
  { veld: "Iu", naam: "I_u", eenheid: "cm^4" },
  { veld: "iu", naam: "i_u", eenheid: "cm" },
  { veld: "Iv", naam: "I_v", eenheid: "cm^4" },
  { veld: "iv", naam: "i_v", eenheid: "cm" },
];

/** Kopregel waaraan scripts/check-profielen.mjs een matrix in een blad herkent. */
export const PROFIEL_KOP = "'Profieltabel uit profielen.ts:";
export const HOEKSTAAL_KOP = "'Hoekstaaltabel uit profielen.ts:";

const SUPER: Record<string, string> = { 2: "²", 3: "³", 4: "⁴", 6: "⁶" };
const leesbaar = (eenheid: string) => eenheid.replace(/\^(\d)/g, (_, n: string) => SUPER[n] ?? `^${n}`);

function matrix<G extends string>(
  kop: string, naam: string, regels: readonly (readonly (string | number)[])[],
  kolommen: readonly Kolom<G>[], ids?: readonly number[],
): string {
  const gekozen = ids
    ? ids.map((id) => {
        const regel = regels.find((r) => r[0] === id);
        if (!regel) throw new Error(`profielen.ts: onbekend id ${id}`);
        return regel;
      })
    : regels;
  const rijen = [gekozen.map((r) => String(r[0]))];
  kolommen.forEach((k, i) => {
    rijen.push(gekozen.map((r) => String(maal(r[i + 2] as number, k.factor ?? 1))));
  });
  const uitleg = ["id", ...kolommen.map((k) => `${k.naam} (${leesbaar(k.eenheid)})`)].join(" | ");
  return `${kop} ${uitleg}\n${naam} = [${rijen.map((r) => r.join("; ")).join(" |")}]`;
}

function opzoeking<G extends string>(
  kolommen: readonly Kolom<G>[], sleutel: string, matrixnaam: string, namen?: Partial<Record<G, string>>,
): string {
  const regels: string[] = [];
  kolommen.forEach((k, i) => {
    const naam = namen ? namen[k.veld] : k.naam;
    if (naam) regels.push(`${naam} = hlookup(${matrixnaam}; ${sleutel}; 1; ${i + 2})*${k.eenheid}`);
  });
  return regels.join("\n");
}

/**
 * CalcPAD-matrix met de I- en H-profielen: een kopregel (tekst, hoort binnen
 * #hide) en de regel `naam = [...]`. Rij 1 bevat het id, de overige rijen de
 * grootheden in de volgorde van ProfielGrootheid en in de eenheden van de
 * profieltabel: h, b, t_w, t_f, r in mm; A en A_v,z in cm²; I_y, I_z, I_t in
 * cm⁴; W in cm³; i in cm; I_w in cm⁶.
 *
 * `ids` beperkt de matrix tot die profielen, in die volgorde.
 *
 * Gebruik in een blad: plak de uitvoer binnen #hide … #show, gevolgd door
 * profielOpzoeking(). Een blad kan hem ook met `${profielMatrix()}` in de
 * template-string opnemen, maar de controlescripts lezen de templates als ruwe
 * tekst en zien dan geen matrix. Een geplakte matrix bewaakt
 * scripts/check-profielen.mjs; afdrukken met
 *   node scripts/check-profielen.mjs --matrix [id,id,…]
 */
export function profielMatrix(opties: { naam?: string; ids?: readonly number[] } = {}): string {
  return matrix(PROFIEL_KOP, opties.naam ?? "profielen", I_TABEL, I_KOLOMMEN, opties.ids);
}

/**
 * De hlookup-regels die de grootheden van het gekozen profiel met eenheid uit
 * de matrix halen, bijvoorbeeld `I_y = hlookup(profielen; profiel; 1; 8)*cm^4`.
 *
 * `sleutel`  de @select-variabele met het profiel-id (`profiel`, `kolomprofiel`)
 * `namen`    eigen variabelenamen, bijvoorbeeld { h: "h_c", tf: "t_fc" }. Alleen
 *            de genoemde grootheden krijgen dan een regel. Zonder `namen` komen
 *            alle grootheden erin, met de standaardnamen h, b, t_w, t_f, r, A,
 *            I_y, W_el,y, W_pl,y, i_y, A_v,z, I_z, W_el,z, W_pl,z, i_z, I_t, I_w.
 * `matrix`   naam van de matrix, standaard "profielen".
 */
export function profielOpzoeking(
  sleutel: string,
  opties: { namen?: Partial<Record<ProfielGrootheid, string>>; matrix?: string } = {},
): string {
  return opzoeking(I_KOLOMMEN, sleutel, opties.matrix ?? "profielen", opties.namen);
}

/**
 * Als profielMatrix(), voor het gelijkzijdig hoekstaal. Rijen na het id: h, t,
 * r_1, r_2 (mm), A (cm²), e (cm), I_y (cm⁴), W_el (cm³), i_y (cm), I_u (cm⁴),
 * i_u (cm), I_v (cm⁴), i_v (cm). Afdrukken met
 *   node scripts/check-profielen.mjs --hoekmatrix [id,id,…]
 */
export function hoekstaalMatrix(opties: { naam?: string; ids?: readonly number[] } = {}): string {
  return matrix(HOEKSTAAL_KOP, opties.naam ?? "hoekstalen", L_TABEL, L_KOLOMMEN, opties.ids);
}

/**
 * Als profielOpzoeking(), voor het hoekstaal. Standaardnamen: h, t, r_1, r_2,
 * A, e, I_y, W_el, i_y, I_u, i_u, I_v, i_v; matrix standaard "hoekstalen".
 */
export function hoekstaalOpzoeking(
  sleutel: string,
  opties: { namen?: Partial<Record<HoekstaalGrootheid, string>>; matrix?: string } = {},
): string {
  return opzoeking(L_KOLOMMEN, sleutel, opties.matrix ?? "hoekstalen", opties.namen);
}
