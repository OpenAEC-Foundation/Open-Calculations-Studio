/**
 * Bibliotheek met gewichten voor de opbouwen in 5.5 Blijvende belastingen.
 *
 * Twee lijsten, beide te kiezen via "uit bibliotheek" in het rapportpaneel:
 *   OPBOUWEN     complete opbouwen per bouwdeel (vloer, dak, wand), in te
 *                voegen als nieuwe vlakopbouw;
 *   LAAGGROEPEN  losse lagen per groep (vloerelementen, houtskeletbouw,
 *                materialen, …), in te voegen in een opbouw die er al staat.
 *
 * Een laag heeft een gewicht per m² (p) of een dikte en volumiek gewicht (d en
 * ρ), zoals in opbouw.ts: een ingevulde p gaat voor d × ρ. Een materiaal met
 * alleen ρ komt zonder d in de opbouw; de dikte vult de constructeur in.
 * Eenheden: d in m, ρ in kN/m³, p in kN/m².
 *
 * De waarden komen uit een eigen gewichtenoverzicht en zijn nagelopen op
 * eenheid en orde van grootte (scripts/check-rapport.mjs). Niet opgenomen:
 * veranderlijke belastingen, korrelvolumieke massa's van toeslagmaterialen
 * (dat is geen stortgewicht) en waarden die alleen als bereik bekend zijn.
 * Elementen heten naar wat ze zijn, niet naar een merk of fabrikant.
 */
import type { Gevellaag, Laag, Opbouw } from "./model.ts";
import { fmt } from "./normwaarden.ts";
import { vlakOpbouw } from "./opbouw.ts";

export type Bouwdeel = "vloer" | "dak" | "wand";

/** Eén laag uit de bibliotheek. Getallen, zodat de controle ermee kan rekenen. */
export interface Gewicht {
  naam: string;
  /** Dikte [m]. */
  d?: number;
  /** Volumiek gewicht [kN/m³]. */
  rho?: number;
  /** Gewicht per m² [kN/m²]; gaat voor d × ρ. */
  p?: number;
  /** Korte toelichting in het keuzemenu. */
  opmerking?: string;
}

export interface Bibliotheekopbouw {
  bouwdeel: Bouwdeel;
  naam: string;
  lagen: readonly Gewicht[];
}

export interface Laaggroep {
  naam: string;
  /** Bij welke bouwdelen de groep in het keuzemenu staat. */
  bouwdelen: readonly Bouwdeel[];
  lagen: readonly Gewicht[];
}

const ALLE: readonly Bouwdeel[] = ["vloer", "dak", "wand"];

// ── Elementen ───────────────────────────────────────────────────────────────

const kanaalplaat = (h: number, p: number): Gewicht => ({ naam: `kanaalplaatvloer ${h} mm`, p });
const verzwaard = (h: number, p: number): Gewicht => ({
  naam: `kanaalplaatvloer verzwaard ${h} mm`,
  p,
  opmerking: "woningscheidend",
});
const kernactivering = (h: number, p: number): Gewicht => ({
  naam: `kanaalplaatvloer met betonkernactivering ${h} mm`,
  p,
});

const VLOERELEMENTEN: readonly Gewicht[] = [
  kanaalplaat(150, 2.64),
  kanaalplaat(200, 3.03),
  kanaalplaat(260, 3.76),
  kanaalplaat(320, 4.43),
  kanaalplaat(400, 5.48),
  verzwaard(200, 3.82),
  verzwaard(260, 5.05),
  kernactivering(200, 3.78),
  kernactivering(260, 4.99),
  kernactivering(320, 5.94),
  { naam: "combinatievloer, beton met EPS-vulelementen", p: 2.45 },
  { naam: "ribcassettevloer", p: 2.6 },
  { naam: "gipsvezel vloerelement 2×12,5 mm + houtwol", p: 0.38 },
  { naam: "renovatievloer met EPS-elementen, droge afwerking", p: 0.4 },
  { naam: "renovatievloer met EPS-elementen, halfdroge afwerking", p: 0.88 },
  { naam: "renovatievloer met EPS-elementen, standaard afwerking", p: 1.72 },
];

const HOUTVEZELCEMENT: Gewicht = { naam: "houtvezelcement dakplaten 100 mm", p: 0.95 };
const BESTAAND: readonly Gewicht[] = [{ naam: "bimsbetonplaten", rho: 10 }, HOUTVEZELCEMENT];

const DAKPANEEL: Gewicht = { naam: "geïsoleerd stalen dakpaneel, grote overspanning", p: 0.2 };
const DAKELEMENTEN: readonly Gewicht[] = [
  DAKPANEEL,
  { naam: "zonnepanelen op hellend dak", p: 0.25 },
  { naam: "zonnepanelen op plat dak, met ballast", p: 1.0 },
];

const DAKTUIN: readonly Gewicht[] = [
  { naam: "mos-sedumvegetatie", p: 1.05, opmerking: "dak met afschot" },
  { naam: "substraat", rho: 14, opmerking: "voor beplanting" },
  { naam: "mineraal granulaat", rho: 13, opmerking: "drainagelaag" },
  { naam: "zand", rho: 19 },
];

// ── Houtskeletbouw en glas ──────────────────────────────────────────────────

const GIPSPLAAT: Gewicht = { naam: "gipsplaat", d: 0.012, rho: 9 };
const OSB: Gewicht = { naam: "OSB/3", d: 0.01, rho: 6 };
const HPL_PANEEL: Gewicht = { naam: "wandpaneel natte ruimte (HPL)", p: 0.08 };
const STIJLWERK: Gewicht = {
  naam: "HSB-stijlwerk, vulling 9%",
  d: 0.1,
  rho: 5,
  p: 0.045,
  opmerking: "0,100 m × 5,0 kN/m³ × 9%",
};
const ISOLATIE: Gewicht = { naam: "isolatie", p: 0.05 };

const HSB: readonly Gewicht[] = [GIPSPLAAT, OSB, HPL_PANEEL, STIJLWERK, ISOLATIE];

const GLAS_PAKKET: Gewicht = { naam: "glas, totale glasdikte 25 mm", d: 0.025, rho: 25 };
const GLAS_STIJLEN: Gewicht = {
  naam: "stijlen 67×120 mm, 4 m¹ per m²",
  p: 0.129,
  opmerking: "0,067 × 0,120 m × 4,0 kN/m³ × 4 m¹/m²",
};

const GLAS: readonly Gewicht[] = [GLAS_PAKKET, GLAS_STIJLEN];

// ── Materialen ──────────────────────────────────────────────────────────────

const STEENACHTIG: readonly Gewicht[] = [
  { naam: "beton, ter plaatse gestort", rho: 25 },
  { naam: "beton, prefab", rho: 25 },
  { naam: "kalkzandsteen", rho: 18 },
  { naam: "metselwerk", rho: 20 },
  { naam: "gipsblokken", rho: 11 },
  { naam: "poreuze kleiblokken", rho: 14 },
  { naam: "grind", rho: 19 },
];

const METALEN: readonly Gewicht[] = [
  { naam: "staal", rho: 78.5 },
  { naam: "aluminium", rho: 27 },
];

const AFWERKING: readonly Gewicht[] = [
  { naam: "gipskartonplaat", rho: 9 },
  { naam: "gips", rho: 11 },
  { naam: "cementdekvloer", rho: 20 },
  { naam: "glas", rho: 25 },
];

/** De losse lagen, per groep in de volgorde van het keuzemenu. */
export const LAAGGROEPEN: readonly Laaggroep[] = [
  { naam: "Vloerelementen", bouwdelen: ["vloer"], lagen: VLOERELEMENTEN },
  { naam: "Bestaande vloer- en dakplaten", bouwdelen: ["vloer", "dak"], lagen: BESTAAND },
  { naam: "Dakelementen", bouwdelen: ["dak"], lagen: DAKELEMENTEN },
  { naam: "Daktuin", bouwdelen: ["dak"], lagen: DAKTUIN },
  { naam: "Houtskeletbouw", bouwdelen: ["wand"], lagen: HSB },
  { naam: "Glazen puien en daken", bouwdelen: ["dak", "wand"], lagen: GLAS },
  { naam: "Steenachtige materialen", bouwdelen: ALLE, lagen: STEENACHTIG },
  { naam: "Metalen", bouwdelen: ALLE, lagen: METALEN },
  { naam: "Afwerking", bouwdelen: ALLE, lagen: AFWERKING },
];

// ── Complete opbouwen ───────────────────────────────────────────────────────

/** "kanaalplaatvloer 200 mm" → "Kanaalplaatvloer 200 mm". */
function hoofdletter(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Een element als opbouw van één laag; de afwerking komt er in het rapport bij. */
const enkel = (bouwdeel: Bouwdeel, g: Gewicht): Bibliotheekopbouw => ({
  bouwdeel,
  naam: hoofdletter(g.naam),
  lagen: [g],
});

export const OPBOUWEN: readonly Bibliotheekopbouw[] = [
  ...VLOERELEMENTEN.map((g) => enkel("vloer", g)),
  enkel("dak", DAKPANEEL),
  enkel("dak", HOUTVEZELCEMENT),
  { bouwdeel: "dak", naam: "Glazen dak", lagen: GLAS },
  {
    bouwdeel: "wand",
    naam: "HSB-binnenwand met gipsplaat",
    lagen: [GIPSPLAAT, OSB, STIJLWERK, ISOLATIE, OSB, GIPSPLAAT],
  },
  {
    bouwdeel: "wand",
    naam: "HSB-binnenwand natte ruimte",
    lagen: [HPL_PANEEL, OSB, STIJLWERK, ISOLATIE, OSB, HPL_PANEEL],
  },
  { bouwdeel: "wand", naam: "Glazen pui", lagen: GLAS },
];

// ── Kiezen en invoegen ──────────────────────────────────────────────────────

/** De opbouwen van deze bouwdelen, in de volgorde van OPBOUWEN. */
export function opbouwenVoor(bouwdelen: readonly Bouwdeel[]): Bibliotheekopbouw[] {
  return OPBOUWEN.filter((o) => bouwdelen.includes(o.bouwdeel));
}

/** De laaggroepen die bij ten minste één van deze bouwdelen horen. */
export function laaggroepenVoor(bouwdelen: readonly Bouwdeel[]): Laaggroep[] {
  return LAAGGROEPEN.filter((g) => g.bouwdelen.some((b) => bouwdelen.includes(b)));
}

/**
 * Een getal als invoertekst met ten minste `min` en ten hoogste `max`
 * decimalen: 0,2 → "0,20", 0,045 → "0,045", 25 → "25,0". Geen getal → "".
 */
function invoer(v: number | undefined, min: number, max: number): string {
  if (v === undefined) return "";
  const s = fmt(v, max, true);
  const [heel, dec = ""] = s.split(",");
  if (dec.length >= min) return s;
  return `${heel},${dec.padEnd(min, "0")}`;
}

/** Een bibliotheeklaag zoals hij in een vlakopbouw komt te staan. */
export function alsLaag(g: Gewicht): Laag {
  return { naam: g.naam, d: invoer(g.d, 3, 3), rho: invoer(g.rho, 1, 2), p: invoer(g.p, 2, 3) };
}

/** Een bibliotheekopbouw als nieuwe vlakopbouw in het rapport. */
export function alsOpbouw(o: Bibliotheekopbouw): Opbouw {
  return { soort: "vlak", naam: o.naam, lagen: o.lagen.map(alsLaag) };
}

/** Het totaal van een bibliotheekopbouw in kN/m², met dezelfde som als het rapport. */
export function somVan(o: Bibliotheekopbouw): number {
  return vlakOpbouw(o.lagen.map(alsLaag)).som;
}

/**
 * Een complete opbouw als één laag van een gevelopbouw: p is het totaal per
 * m², afgerond zoals het rapport de som van een vlakopbouw toont. Hoogte en
 * vulling vult de constructeur in.
 */
export function alsGevellaag(o: Bibliotheekopbouw): Gevellaag {
  return { naam: o.naam, p: fmt(somVan(o), 2), h: "", vulling: "" };
}

/** Wat het menu onder de naam van een laag laat zien. */
export function omschrijving(g: Gewicht): string {
  const toe = g.opmerking ? ` (${g.opmerking})` : "";
  if (g.p !== undefined) return `${invoer(g.p, 2, 3)} kN/m²${toe}`;
  if (g.d !== undefined && g.rho !== undefined) {
    return `${invoer(g.d, 3, 3)} m × ${invoer(g.rho, 1, 2)} kN/m³ = ${fmt(g.d * g.rho, 2)} kN/m²${toe}`;
  }
  if (g.rho !== undefined) return `ρ = ${invoer(g.rho, 1, 2)} kN/m³, dikte invullen${toe}`;
  return g.opmerking ?? "";
}

/** Een rij waarin niets is ingevuld. */
function leeg(rij: object): boolean {
  return Object.values(rij).every((v) => typeof v !== "string" || v.trim() === "");
}

/**
 * Een nieuwe lijst met `rij` achteraan. Lege rijen aan het eind vervallen:
 * een nieuwe opbouw begint met één lege laag, en die hoort niet boven de
 * gekozen laag te blijven staan.
 */
export function voegToe<T extends object>(lijst: readonly T[], rij: T): T[] {
  let eind = lijst.length;
  while (eind > 0 && leeg(lijst[eind - 1])) eind--;
  return [...lijst.slice(0, eind), rij];
}
