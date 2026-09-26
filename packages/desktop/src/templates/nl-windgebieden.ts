/**
 * Windgebieden Nederland — NEN-EN 1991-1-4, nationale bijlage, figuur NB.1.
 *
 * De bijlage omschrijft de gebieden in woorden:
 *
 *   I   Markermeer, IJsselmeer, Waddenzee, Waddeneilanden en de provincie
 *       Noord-Holland ten noorden van de gemeenten Heemskerk, Uitgeest,
 *       Wormerland, Purmerend en Edam-Volendam
 *   II  het resterende deel van Noord-Holland (waartoe ook Zaanstad behoort),
 *       het vasteland van Groningen en Friesland, en de provincies
 *       Flevoland, Zuid-Holland en Zeeland
 *   III het resterende deel van Nederland
 *
 * Alle grenzen zijn provinciegrenzen, behalve die tussen gebied I en II in
 * Noord-Holland: die volgt de noordgrens van de vijf genoemde gemeenten.
 *
 * `nl-windgebieden.geojson` wordt gemaakt door
 * `scripts/windgebieden/genereer.py`, uit de CBS-provinciegrenzen en de
 * CBS-gemeentegrenzen van 2015. De meren en de Waddenzee zijn aparte vlakken
 * (soort "water"). Het rekenwerk staat in `lib/windgebieden.ts`.
 */

import windgebiedenRaw from "./nl-windgebieden.geojson?raw";
import { maakWindKaart, type WindGebied, type WindGebiedenKaart } from "../lib/windgebieden";

export { VB0, OVERGANG_KM, type WindGebied, type WindLocatie } from "../lib/windgebieden";

const kaart = maakWindKaart(JSON.parse(windgebiedenRaw) as WindGebiedenKaart);

/** Voor Leaflet, het water onder het land. */
export const windGebiedenGeoJSON = kaart.tekenVolgorde;
/** Het windgebied van een punt, of null buiten Nederland. */
export const windGebiedForLatLng = kaart.gebiedVoor;
/** Windgebied en v_b,0 van een punt, met de overgangszone van figuur NB.2. */
export const windLocatie = kaart.locatie;

/** Kleuren per gebied — laag-opacity overlay op de basiskaart. */
export const GEBIED_COLORS: Record<WindGebied, string> = {
  // Gedempte tinten — de kaart is een hulpmiddel, geen signaallamp. Het
  // kleurverschil blijft leesbaar maar schreeuwt niet; de Romeinse cijfers
  // op de kaart dragen de identificatie.
  1: "#8c9bad", // grijsblauw — kust en water
  2: "#a8a08f", // taupe
  3: "#93a596", // grijsgroen — binnenland
};

export const GEBIED_NAMES: Record<WindGebied, string> = {
  1: "Gebied I — Waddeneilanden, Waddenzee, IJsselmeer, Markermeer en Noord-Holland-noord",
  2: "Gebied II — rest van Noord-Holland, vasteland Groningen en Friesland, Flevoland, Zuid-Holland, Zeeland",
  3: "Gebied III — rest van Nederland",
};
