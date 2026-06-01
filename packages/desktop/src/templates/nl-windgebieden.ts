/**
 * Windgebieden Nederland — NEN-EN 1991-1-4 NB Figuur NA.1.
 *
 * In de praktijk volgt de gebiedsindeling de provincie-grenzen (met enkele
 * uitzonderingen rond 52°N). Voor deze app gebruiken we de officiële PDOK
 * provincie-polygonen (CBS 2024) en wijzen elk gebied toe op provincie-
 * niveau:
 *
 *   Gebied I  — kustprovincies: Noord-Holland · Friesland · Groningen
 *   Gebied II — overgangszone:  Zuid-Holland · Utrecht · Flevoland · Drenthe · Zeeland
 *   Gebied III — binnenland:    Gelderland · Overijssel · Noord-Brabant · Limburg
 */

import provinciesRaw from "./nl-provincies.geojson?raw";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";

export type WindGebied = 1 | 2 | 3;

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

interface ProvincieProperties {
  statnaam: string;
  statcode?: string;
  gebied: WindGebied;
}

const provinciesParsed = JSON.parse(provinciesRaw) as FeatureCollection<
  Polygon | MultiPolygon,
  { statnaam: string; statcode?: string }
>;

/** Provincie-grenzen met gebied-attribuut, klaar voor Leaflet GeoJSON. */
export const windGebiedenGeoJSON: FeatureCollection<
  Polygon | MultiPolygon,
  ProvincieProperties
> = {
  type: "FeatureCollection",
  features: provinciesParsed.features.map((feature) => {
    const name = feature.properties.statnaam;
    const gebied = PROVINCIE_TO_GEBIED[name] ?? 3;
    return {
      ...feature,
      properties: {
        statnaam: name,
        statcode: feature.properties.statcode,
        gebied,
      },
    };
  }),
};

/** Kleuren per gebied — laag-opacity overlay op de basismap. */
export const GEBIED_COLORS: Record<WindGebied, string> = {
  1: "#DC2626", // rood — hoogste belasting (kust)
  2: "#F59E0B", // amber — overgang
  3: "#10B981", // groen — laagste (binnenland)
};

export const GEBIED_NAMES: Record<WindGebied, string> = {
  1: "Gebied I — kustprovincies (NH/FR/GR)",
  2: "Gebied II — overgangszone (ZH/UT/FL/DR/ZL)",
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
