import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { windGebiedenGeoJSON, windGebiedForLatLng, GEBIED_COLORS, type WindGebied } from "../../templates/nl-windgebieden";
import "./WindAreaMap.css";

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

export interface WindAreaMapProps {
  /** Initial address — comes from project metadata. Empty means user enters fresh. */
  initialAddress?: string;
  /** Called when a gebied is detected. */
  onWindGebiedChange?: (gebied: WindGebied | null, location: GeocodeResult | null) => void;
}

export default function WindAreaMap({ initialAddress = "", onWindGebiedChange }: WindAreaMapProps) {
  const [address, setAddress] = useState(initialAddress);
  const [location, setLocation] = useState<GeocodeResult | null>(null);
  const [gebied, setGebied] = useState<WindGebied | null>(null);
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
        setGebied(null);
        onWindGebiedChange?.(null, null);
        return;
      }
      const g = windGebiedForLatLng(result.lat, result.lng);
      setLocation(result);
      setGebied(g);
      onWindGebiedChange?.(g, result);
    } catch (err) {
      setError(`Geocoding fout: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [address, onWindGebiedChange]);

  const geoJsonStyle = useCallback(
    (feature?: { properties?: { gebied?: WindGebied } }) => {
      const g = feature?.properties?.gebied;
      const color = g ? GEBIED_COLORS[g] : "#999";
      return {
        color,
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.25,
      };
    },
    [],
  );

  const center: [number, number] = useMemo(() => [52.2, 5.5], []); // mid NL
  const markerPos: [number, number] | null = location ? [location.lat, location.lng] : null;

  const onFeatureClick = useCallback(
    (e: { propagatedFrom?: { feature?: { properties?: { naam?: string } } } }) => {
      const naam = e.propagatedFrom?.feature?.properties?.naam;
      if (naam) console.debug("Klikten op:", naam);
    },
    [],
  );

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
      {gebied !== null && location && (
        <div
          className="wind-area-result"
          style={{ borderLeftColor: GEBIED_COLORS[gebied] }}
        >
          <strong>Windgebied {gebied === 1 ? "I" : gebied === 2 ? "II" : "III"}</strong>
          <span> · {location.displayName}</span>
        </div>
      )}
      {gebied === null && location && (
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
              layer.bindTooltip(feature.properties.naam, { sticky: true });
              layer.on({ click: onFeatureClick });
            }}
          />
          {markerPos && (
            <Marker position={markerPos} icon={defaultIcon}>
              <Popup>
                <strong>{location?.displayName}</strong>
                <br />
                {gebied !== null
                  ? `Windgebied ${gebied === 1 ? "I (kust)" : gebied === 2 ? "II (overgang)" : "III (binnenland)"}`
                  : "Geen gebied bepaald"}
              </Popup>
            </Marker>
          )}
          <MapRecenter position={markerPos} />
        </MapContainer>
      </div>
      <div className="wind-area-legend">
        <span className="wind-area-legend-item" style={{ background: GEBIED_COLORS[1] }}>I — kust</span>
        <span className="wind-area-legend-item" style={{ background: GEBIED_COLORS[2] }}>II — overgang</span>
        <span className="wind-area-legend-item" style={{ background: GEBIED_COLORS[3] }}>III — binnenland</span>
      </div>
      <p className="wind-area-note">
        Polygonen zijn een vereenvoudigde weergave van NEN-EN 1991-1-4 NB Figuur A.1. Voor de exacte
        gebiedstoewijzing per gemeente: raadpleeg NB-tabel A.1.
      </p>
    </div>
  );
}
