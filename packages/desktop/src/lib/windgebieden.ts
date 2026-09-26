/**
 * Rekenwerk op de windgebiedenkaart: in welk gebied ligt een punt, en hoe ver
 * ligt het van de grens met het lagere gebied.
 *
 * Los van Vite, zodat `scripts/check-windgebieden.mjs` dezelfde code met
 * dezelfde kaartdata kan draaien. De kaartdata zelf en de omschrijving van de
 * gebieden staan in `templates/nl-windgebieden.ts`.
 */
import type { FeatureCollection, MultiPolygon, Polygon, Position } from "geojson";

export type WindGebied = 1 | 2 | 3;

export interface WindGebiedProperties {
  gebied: WindGebied;
  naam: string;
  soort: "land" | "water";
}

export type WindGebiedenKaart = FeatureCollection<Polygon | MultiPolygon, WindGebiedProperties>;

/** Fundamentele waarde van de basiswindsnelheid v_b,0 in m/s — tabel NB.1. */
export const VB0: Record<WindGebied, number> = { 1: 29.5, 2: 27.0, 3: 24.5 };

/** Breedte van de overgangszone langs een gebiedsgrens, in km — figuur NB.2. */
export const OVERGANG_KM = 5;

export interface WindLocatie {
  gebied: WindGebied;
  /** v_b,0 van het gebied zelf, tabel NB.1. Hiermee rekenen de bladen. */
  vb0Gebied: number;
  /**
   * Binnen 5 km van de grens met het lagere gebied loopt v_b,0 lineair af tot
   * de waarde van dat gebied op de grens (figuur NB.2). De gebiedswaarde
   * blijft aan de veilige kant; de overgang mag lager.
   */
  overgang: { naarGebied: WindGebied; afstandKm: number; vb0: number } | null;
}

/** Ray-casting point-in-polygon voor één ring [[lng, lat], …]. */
function inRing(x: number, y: number, ring: Position[]): boolean {
  let binnen = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) binnen = !binnen;
  }
  return binnen;
}

function polygonen(geom: Polygon | MultiPolygon): Position[][][] {
  return geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
}

/** Binnen een buitenring en buiten de gaten daarin. */
function inGeometrie(x: number, y: number, geom: Polygon | MultiPolygon): boolean {
  return polygonen(geom).some(
    ([buiten, ...gaten]) => inRing(x, y, buiten) && !gaten.some((g) => inRing(x, y, g)),
  );
}

export function maakWindKaart(kaart: WindGebiedenKaart) {
  const land = kaart.features.filter((f) => f.properties.soort === "land");
  const water = kaart.features.filter((f) => f.properties.soort === "water");

  /**
   * Het windgebied van een punt. Het land gaat voor het water, zodat een punt
   * op een dijk of in een haven het gebied van de wal krijgt. Null buiten
   * Nederland en op open zee.
   */
  function gebiedVoor(lat: number, lng: number): WindGebied | null {
    for (const f of [...land, ...water]) {
      if (inGeometrie(lng, lat, f.geometry)) return f.properties.gebied;
    }
    return null;
  }

  /**
   * Kortste afstand in km van een punt tot de vlakken van een gebied. Vlak
   * benaderd rond het punt zelf; over een paar kilometer is dat ruim nauwkeurig.
   */
  function afstandTotGebiedKm(lat: number, lng: number, gebied: WindGebied): number {
    const kx = 111.32 * Math.cos((lat * Math.PI) / 180);
    const ky = 110.57;
    let min = Infinity;
    for (const f of kaart.features) {
      if (f.properties.gebied !== gebied) continue;
      for (const polygon of polygonen(f.geometry)) {
        for (const ring of polygon) {
          for (let i = 1; i < ring.length; i++) {
            const ax = (ring[i - 1][0] - lng) * kx;
            const ay = (ring[i - 1][1] - lat) * ky;
            const dx = (ring[i][0] - ring[i - 1][0]) * kx;
            const dy = (ring[i][1] - ring[i - 1][1]) * ky;
            const l2 = dx * dx + dy * dy;
            const t = l2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
            min = Math.min(min, Math.hypot(ax + t * dx, ay + t * dy));
          }
        }
      }
    }
    return min;
  }

  /** Windgebied en v_b,0 van een punt, met de overgangszone van figuur NB.2. */
  function locatie(lat: number, lng: number): WindLocatie | null {
    const gebied = gebiedVoor(lat, lng);
    if (gebied === null) return null;
    const vb0Gebied = VB0[gebied];
    if (gebied === 3) return { gebied, vb0Gebied, overgang: null };
    const lager = (gebied + 1) as WindGebied;
    const afstandKm = afstandTotGebiedKm(lat, lng, lager);
    if (afstandKm >= OVERGANG_KM) return { gebied, vb0Gebied, overgang: null };
    const vb0 = VB0[lager] + ((vb0Gebied - VB0[lager]) * afstandKm) / OVERGANG_KM;
    return { gebied, vb0Gebied, overgang: { naarGebied: lager, afstandKm, vb0 } };
  }

  /**
   * Voor Leaflet: eerst het water, dan het land erbovenop. De watervlakken
   * sluiten op de kust aan; de volgorde houdt de randen van het land zichtbaar.
   */
  const tekenVolgorde: WindGebiedenKaart = { type: "FeatureCollection", features: [...water, ...land] };

  return { gebiedVoor, locatie, tekenVolgorde };
}
