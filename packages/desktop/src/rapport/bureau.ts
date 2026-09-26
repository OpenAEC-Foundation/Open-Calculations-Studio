/**
 * Het bureauprofiel en de eigen tekstvarianten zoals ze in de instellingen
 * staan: normaliseren, en eigen varianten toevoegen en verwijderen.
 *
 * Zonder React en zonder bijwerkingen: store/bureauProfiel.ts gebruikt dit, en
 * scripts/check-bureauprofiel.mjs laadt het rechtstreeks in Node. Wat uit de
 * instellingen komt, is net zo onbetrouwbaar als een projectbestand: het kan
 * door een andere versie van de app zijn geschreven of met de hand zijn
 * aangepast.
 *
 * Elke bewerking geeft een nieuw object terug en laat het oude staan. Zo ziet
 * de store dat er iets veranderd is, en blijft een oude stand bruikbaar.
 */
import type { Tekstvariant } from "./standaardteksten.ts";

/** Eén plek die weet hoe een profiel eruitziet: zie model.ts. */
export { normaliseerBureau } from "./model.ts";

/** Eigen varianten per tekst-id, in de volgorde waarin ze zijn bewaard. */
export type EigenTeksten = Record<string, Tekstvariant[]>;

/**
 * Eigen varianten uit de instellingen. Alleen varianten met een tekstlabel en
 * een tekst blijven staan, zonder extra velden; een tekst-id zonder geldige
 * varianten valt weg.
 */
export function normaliseerEigenTeksten(x: unknown): EigenTeksten {
  if (!x || typeof x !== "object" || Array.isArray(x)) return {};
  const uit: EigenTeksten = {};
  for (const [id, lijst] of Object.entries(x)) {
    if (!Array.isArray(lijst)) continue;
    const varianten: Tekstvariant[] = [];
    for (const v of lijst as unknown[]) {
      if (!v || typeof v !== "object") continue;
      const { label, tekst } = v as Record<string, unknown>;
      if (typeof label === "string" && typeof tekst === "string") varianten.push({ label, tekst });
    }
    if (varianten.length > 0) uit[id] = varianten;
  }
  return uit;
}

/**
 * Voegt een eigen variant toe aan tekst-id `id`, achteraan.
 *
 * Een variant met hetzelfde label wordt op zijn plek vervangen: nog eens
 * "Bewaar als eigen variant" onder dezelfde naam werkt die variant bij, in
 * plaats van een tweede met dezelfde naam in de keuzelijst te zetten.
 */
export function metEigenVariant(eigen: EigenTeksten, id: string, v: Tekstvariant): EigenTeksten {
  const schoon: Tekstvariant = { label: v.label, tekst: v.tekst };
  const lijst = eigen[id] ?? [];
  const i = lijst.findIndex((w) => w.label === schoon.label);
  const nieuw = i < 0 ? [...lijst, schoon] : lijst.map((w, j) => (j === i ? schoon : w));
  return { ...eigen, [id]: nieuw };
}

/**
 * Haalt eigen variant `index` van tekst-id `id` weg. `index` telt binnen de
 * eigen varianten van die tekst, niet in de keuzelijst met de meegeleverde
 * erbij. Is de lijst daarna leeg, dan verdwijnt de tekst-id. Een onbekende id
 * of index verandert niets: dan komt hetzelfde object terug.
 */
export function zonderEigenVariant(eigen: EigenTeksten, id: string, index: number): EigenTeksten {
  const lijst = eigen[id];
  if (!lijst || index < 0 || index >= lijst.length) return eigen;
  const rest = lijst.filter((_, j) => j !== index);
  const uit = { ...eigen };
  if (rest.length > 0) uit[id] = rest;
  else delete uit[id];
  return uit;
}
