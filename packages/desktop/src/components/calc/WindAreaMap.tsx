import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  windGebiedenGeoJSON,
  windLocatie,
  GEBIED_COLORS,
  GEBIED_NAMES,
  type WindGebied,
  type WindLocatie,
} from "../../templates/nl-windgebieden";
import "./WindAreaMap.css";

const ROMEINS: Record<WindGebied, string> = { 1: "I", 2: "II", 3: "III" };
const komma = (v: number, dec: number) => v.toFixed(dec).replace(".", ",");

// Leaflet default-icon images don't resolve under bundlers without a hack —
// pin the marker icon to a public CDN-shipped PNG.
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/**
 * Vaste labelpunten met de gebied-nummers, getekend óp de kaart. Gebied I
 * ligt op het land (Noord-Holland-noord) en op het water; gebied II loopt van
 * Zeeland tot Noord-Holland en van Flevoland tot Groningen.
 */
const GEBIED_LABELS: Array<{ pos: [number, number]; tekst: string }> = [
  { pos: [52.7, 4.85], tekst: "I" },
  { pos: [52.9, 5.3], tekst: "I" },
  { pos: [51.95, 4.45], tekst: "II" },
  { pos: [52.45, 5.6], tekst: "II" },
  { pos: [53.05, 5.75], tekst: "II" },
  { pos: [53.3, 6.7], tekst: "II" },
  { pos: [52.1, 5.9], tekst: "III" },
  { pos: [52.85, 6.6], tekst: "III" },
];

function gebiedLabelIcon(tekst: string): L.DivIcon {
  return L.divIcon({
    className: "wind-area-gebiedlabel",
    html: tekst,
    iconSize: [34, 22],
    iconAnchor: [17, 11],
  });
}

interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

/** Free-tier Nominatim geocoder. Adds usage-policy required user-agent. */
async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=nl&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "nl,en" } });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!data.length) return null;
  const top = data[0];
  return { lat: parseFloat(top.lat), lng: parseFloat(top.lon), displayName: top.display_name };
}

/** Sub-component that recenters the map when location changes. */
function MapRecenter({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 11, { duration: 0.8 });
  }, [position, map]);
  return null;
}

/** Een klik op de kaart kiest die plek als locatie. */
function KlikOpKaart({ onKlik }: { onKlik: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onKlik(e.latlng.lat, e.latlng.lng) });
  return null;
}

export interface WindAreaMapProps {
  /** Initial address — comes from project metadata. Empty means user enters fresh. */
  initialAddress?: string;
  /** Called when a gebied is detected. */
  onWindGebiedChange?: (gebied: WindGebied | null, location: GeocodeResult | null) => void;
}

export default function WindAreaMap({ initialAddress = "", onWindGebiedChange }: WindAreaMapProps) {
  const [address, setAddress] = useState(initialAddress);
  const [location, setLocation] = useState<GeocodeResult | null>(null);
  const [loc, setLoc] = useState<WindLocatie | null>(null);
  // Alleen na zoeken vliegt de kaart naar de plek; bij een klik blijft hij staan.
  const [vliegNaar, setVliegNaar] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback(async () => {
    if (!address.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await geocodeAddress(address);
      if (!result) {
        setError("Adres niet gevonden in Nederland.");
        setLocation(null);
        setLoc(null);
        onWindGebiedChange?.(null, null);
        return;
      }
      const l = windLocatie(result.lat, result.lng);
      setLocation(result);
      setLoc(l);
      setVliegNaar([result.lat, result.lng]);
      onWindGebiedChange?.(l?.gebied ?? null, result);
    } catch (err) {
      setError(`Geocoding fout: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [address, onWindGebiedChange]);

  const kiesPunt = useCallback(
    (lat: number, lng: number) => {
      const plek: GeocodeResult = {
        lat,
        lng,
        displayName: `punt op de kaart, ${komma(lat, 4)}° NB ${komma(lng, 4)}° OL`,
      };
      const l = windLocatie(lat, lng);
      setError(null);
      setLocation(plek);
      setLoc(l);
      onWindGebiedChange?.(l?.gebied ?? null, plek);
    },
    [onWindGebiedChange],
  );

  const geoJsonStyle = useCallback(
    (feature?: { properties?: { gebied?: WindGebied } }) => {
      const g = feature?.properties?.gebied;
      const color = g ? GEBIED_COLORS[g] : "#999";
      return {
        color,
        weight: 1,
        fillColor: color,
        fillOpacity: 0.26,
      };
    },
    [],
  );

  const center: [number, number] = useMemo(() => [52.2, 5.5], []); // mid NL
  const markerPos: [number, number] | null = location ? [location.lat, location.lng] : null;

  return (
    <div className="wind-area-map">
      <form
        className="wind-area-search"
        onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
      >
        <input
          ref={inputRef}
          className="wind-area-input"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Adres of plaats in Nederland — bv. 'Rokin 100, Amsterdam'"
        />
        <button type="submit" className="wind-area-search-btn" disabled={loading}>
          {loading ? "Bezig…" : "Zoek"}
        </button>
      </form>
      {error && <div className="wind-area-error">{error}</div>}
      {loc && location && (
        <div
          className="wind-area-result"
          style={{ borderLeftColor: GEBIED_COLORS[loc.gebied] }}
        >
          <strong>
            Windgebied {ROMEINS[loc.gebied]} · v<sub>b,0</sub> = {komma(loc.vb0Gebied, 1)} m/s
          </strong>
          <span> · {location.displayName}</span>
          {loc.overgang && (
            <div className="wind-area-overgang">
              {komma(loc.overgang.afstandKm, 1)} km van de grens met gebied{" "}
              {ROMEINS[loc.overgang.naarGebied]}: in de overgangszone van figuur NB.2 mag
              v<sub>b,0</sub> = {komma(loc.overgang.vb0, 1)} m/s. De bladen rekenen met de
              gebiedswaarde, aan de veilige kant.
            </div>
          )}
        </div>
      )}
      {!loc && location && (
        <div className="wind-area-result wind-area-result-warn">
          Locatie gevonden maar valt buiten de gedefinieerde polygons — kies handmatig in de Projectgegevens.
        </div>
      )}
      <div className="wind-area-mapwrap">
        <MapContainer center={center} zoom={7} className="wind-area-leaflet">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
          />
          <GeoJSON
            data={windGebiedenGeoJSON}
            style={geoJsonStyle as never}
            onEachFeature={(feature, layer) => {
              const { naam, gebied } = feature.properties as { naam: string; gebied: WindGebied };
              layer.bindTooltip(`${naam} — gebied ${ROMEINS[gebied]}`, { sticky: true });
            }}
          />
          {GEBIED_LABELS.map((l, i) => (
            <Marker
              key={i}
              position={l.pos}
              icon={gebiedLabelIcon(l.tekst)}
              interactive={false}
            />
          ))}
          {markerPos && (
            <Marker position={markerPos} icon={defaultIcon}>
              <Popup>
                <strong>{location?.displayName}</strong>
                <br />
                {loc ? GEBIED_NAMES[loc.gebied] : "Geen gebied bepaald"}
              </Popup>
            </Marker>
          )}
          <MapRecenter position={vliegNaar} />
          <KlikOpKaart onKlik={kiesPunt} />
        </MapContainer>
      </div>
      <div className="wind-area-legend">
        <span className="wind-area-legend-item">
          <i className="wind-area-legend-dot" style={{ background: GEBIED_COLORS[1] }} />
          I — noordkust en meren
        </span>
        <span className="wind-area-legend-item">
          <i className="wind-area-legend-dot" style={{ background: GEBIED_COLORS[2] }} />
          II — overige kust
        </span>
        <span className="wind-area-legend-item">
          <i className="wind-area-legend-dot" style={{ background: GEBIED_COLORS[3] }} />
          III — binnenland
        </span>
      </div>
      <p className="wind-area-note">
        Indeling volgens NEN-EN 1991-1-4, nationale bijlage, figuur NB.1: provinciegrenzen, en in
        Noord-Holland de noordgrens van Heemskerk, Uitgeest, Wormerland, Purmerend en
        Edam-Volendam (gemeentegrenzen van 2015). Klik op de kaart om een plek te kiezen.
      </p>
    </div>
  );
}
