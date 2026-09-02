/**
 * Windgebieden Nederland — NEN-EN 1991-1-4 NB Figuur NA.1.
 *
 * De indeling volgt grotendeels de provincie-grenzen, met één uitzondering
 * die de norm expliciet maakt: de zuidgrens van gebied I ligt niet op een
 * provinciegrens maar op **52° noorderbreedte**. Gebied I loopt daardoor
 * langs de kust dóór tot in Zuid-Holland: Katwijk, Noordwijk en Hillegom
 * vallen er nog onder, Den Haag en Rotterdam niet.
 *
 * Basis zijn de PDOK provincie-polygonen (CBS 2024). Zuid-Holland wordt op
 * de 52°-lijn in tweeën geknipt; de rest van de provincies ligt volledig aan
 * één kant van die lijn en blijft ongesplitst.
 *
 *   Gebied I  — kust boven 52°N: Noord-Holland · Friesland · Groningen
 *               + Zuid-Holland boven 52°N
 *   Gebied II — overgangszone:   Zuid-Holland onder 52°N · Utrecht ·
 *               Flevoland · Drenthe · Zeeland
 *   Gebied III — binnenland:     Gelderland · Overijssel · Noord-Brabant · Limburg
 */

import provinciesRaw from "./nl-provincies.geojson?raw";
import type { FeatureCollection, MultiPolygon, Polygon, Position } from "geojson";

export type WindGebied = 1 | 2 | 3;

/** Zuidgrens van windgebied I — NEN-EN 1991-1-4 NB. */
export const GEBIED_I_GRENS_LAT = 52.0;

const PROVINCIE_TO_GEBIED: Record<string, WindGebied> = {
  "Noord-Holland": 1,
  "Fryslân": 1,
  "Friesland": 1,
  "Groningen": 1,
  "Zuid-Holland": 2,
  "Utrecht": 2,
  "Flevoland": 2,
  "Drenthe": 2,
  "Zeeland": 2,
  "Gelderland": 3,
  "Overijssel": 3,
  "Noord-Brabant": 3,
  "Limburg": 3,
};

/**
 * Kustprovincies waarvan het deel bóven 52°N alsnog bij gebied I hoort.
 *
 * Alleen provincies aan de Noordzee komen hiervoor in aanmerking: de
 * 52°-lijn snijdt ook Utrecht en Gelderland, maar dat is binnenland en
 * blijft gewoon gebied II respectievelijk III.
 */
const KUST_PROVINCIES_MET_GEBIED_I_DEEL = new Set(["Zuid-Holland"]);

interface ProvincieProperties {
  statnaam: string;
  statcode?: string;
  gebied: WindGebied;
}

const provinciesParsed = JSON.parse(provinciesRaw) as FeatureCollection<
  Polygon | MultiPolygon,
  { statnaam: string; statcode?: string }
>;

/**
 * Knip één ring af op een breedtegraad (Sutherland-Hodgman tegen een
 * halfvlak). Houdt de helft boven óf onder `lat` over; een lege uitkomst
 * betekent dat de ring volledig aan de andere kant lag.
 */
function clipRingByLat(ring: Position[], lat: number, keepAbove: boolean): Position[] {
  const binnen = (p: Position) => (keepAbove ? p[1] >= lat : p[1] <= lat);
  const snijpunt = (a: Position, b: Position): Position => {
    const t = (lat - a[1]) / (b[1] - a[1]);
    return [a[0] + t * (b[0] - a[0]), lat];
  };
  const uit: Position[] = [];
  for (let i = 0; i < ring.length; i++) {
    const huidig = ring[i];
    const vorig = ring[(i + ring.length - 1) % ring.length];
    const hIn = binnen(huidig);
    const vIn = binnen(vorig);
    if (hIn) {
      if (!vIn) uit.push(snijpunt(vorig, huidig));
      uit.push(huidig);
    } else if (vIn) {
      uit.push(snijpunt(vorig, huidig));
    }
  }
  // Een ring van minder dan drie punten heeft geen oppervlak.
  if (uit.length < 3) return [];
  // Ring sluiten zoals GeoJSON voorschrijft.
  const [ex, ey] = uit[0];
  const [lx, ly] = uit[uit.length - 1];
  if (ex !== lx || ey !== ly) uit.push([ex, ey]);
  return uit;
}

/** Knip een hele geometrie af op een breedtegraad. Null = niets over. */
function clipGeometryByLat(
  geom: Polygon | MultiPolygon,
  lat: number,
  keepAbove: boolean,
): Polygon | MultiPolygon | null {
  const polygonen = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  const behouden: Position[][][] = [];
  for (const polygon of polygonen) {
    // Alleen de buitenring knippen; de PDOK-provincies hebben geen gaten
    // die over de 52°-lijn heen liggen.
    const buiten = clipRingByLat(polygon[0], lat, keepAbove);
    if (buiten.length >= 4) behouden.push([buiten]);
  }
  if (behouden.length === 0) return null;
  if (behouden.length === 1) return { type: "Polygon", coordinates: behouden[0] };
  return { type: "MultiPolygon", coordinates: behouden };
}

/**
 * Provincie-grenzen met gebied-attribuut, klaar voor Leaflet GeoJSON.
 *
 * Kustprovincies die de 52°-lijn kruisen leveren twee features op: het
 * noordelijke deel als gebied I, het zuidelijke deel met het eigen gebied.
 */
export const windGebiedenGeoJSON: FeatureCollection<
  Polygon | MultiPolygon,
  ProvincieProperties
> = {
  type: "FeatureCollection",
  features: provinciesParsed.features.flatMap((feature) => {
    const naam = feature.properties.statnaam;
    const basisGebied = PROVINCIE_TO_GEBIED[naam] ?? 3;
    const maak = (
      geometry: Polygon | MultiPolygon,
      gebied: WindGebied,
    ) => ({
      ...feature,
      geometry,
      properties: { statnaam: naam, statcode: feature.properties.statcode, gebied },
    });

    if (!KUST_PROVINCIES_MET_GEBIED_I_DEEL.has(naam) || basisGebied === 1) {
      return [maak(feature.geometry, basisGebied)];
    }

    const noord = clipGeometryByLat(feature.geometry, GEBIED_I_GRENS_LAT, true);
    const zuid = clipGeometryByLat(feature.geometry, GEBIED_I_GRENS_LAT, false);
    // Ligt de provincie toch volledig aan één kant, dan blijft hij heel.
    if (!noord || !zuid) return [maak(feature.geometry, basisGebied)];
    return [maak(noord, 1), maak(zuid, basisGebied)];
  }),
};

/** Kleuren per gebied — laag-opacity overlay op de basismap. */
export const GEBIED_COLORS: Record<WindGebied, string> = {
  // Gedempte tinten — de kaart is een hulpmiddel, geen signaallamp. Het
  // kleurverschil blijft leesbaar maar schreeuwt niet; de Romeinse cijfers
  // op de kaart dragen de identificatie.
  1: "#8c9bad", // grijsblauw — kust
  2: "#a8a08f", // taupe — overgang
  3: "#93a596", // grijsgroen — binnenland
};

export const GEBIED_NAMES: Record<WindGebied, string> = {
  1: "Gebied I — kust boven 52°N (NH/FR/GR + ZH-noord)",
  2: "Gebied II — overgangszone (ZH-zuid/UT/FL/DR/ZL)",
  3: "Gebied III — binnenland (GE/OV/NB/LI)",
};

/** Ray-casting point-in-polygon for a single ring [[lng, lat], …]. */
function pointInRing(point: [number, number], ring: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Handles both Polygon and MultiPolygon geometries. */
function pointInGeometry(point: [number, number], geom: Polygon | MultiPolygon): boolean {
  if (geom.type === "Polygon") {
    // First ring = outer; subsequent = holes (ignored — provincies rarely have meaningful holes).
    return pointInRing(point, geom.coordinates[0]);
  }
  // MultiPolygon — any constituent polygon counts.
  for (const polygon of geom.coordinates) {
    if (pointInRing(point, polygon[0])) return true;
  }
  return false;
}

/**
 * Determine the windgebied for a lat/lng. Returns null when the point falls
 * outside every Dutch provincie (e.g. in Belgium / Germany / sea).
 */
export function windGebiedForLatLng(lat: number, lng: number): WindGebied | null {
  const pt: [number, number] = [lng, lat];
  for (const feature of windGebiedenGeoJSON.features) {
    if (pointInGeometry(pt, feature.geometry)) {
      return feature.properties.gebied;
    }
  }
  return null;
}
