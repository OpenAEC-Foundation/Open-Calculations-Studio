import { create } from "zustand";
import { getSetting, setSetting } from "../store";
import { leegBureau, type BureauProfiel } from "../rapport/model";
import type { Tekstvariant } from "../rapport/standaardteksten";
import {
  metEigenVariant,
  normaliseerBureau,
  normaliseerEigenTeksten,
  zonderEigenVariant,
} from "../rapport/bureau";

/**
 * Het bureauprofiel en de eigen tekstvarianten: instellingen van de gebruiker,
 * niet van een project.
 *
 * Een rapport krijgt een vastgelegde kopie van het profiel (`rapport.bureau`),
 * zodat een oud rapport niet verandert als het profiel later verandert. Deze
 * store is de bron voor die kopie, voor de tab Bureau in de instellingen en
 * voor de keuzelijst met standaardteksten in het rapportpaneel. Wie iets
 * moet weten, leest de store; er gaan geen vensterevents rond.
 *
 * Bewaard onder twee instellingssleutels, elk apart, zodat een nieuwe tekst
 * niet het hele profiel met zijn afbeeldingen opnieuw wegschrijft. In een
 * browser zonder Tauri is er geen opslag (zie store.ts): dan blijft alles
 * alleen in het geheugen en begint elke sessie met een leeg profiel.
 */

const PROFIEL_KEY = "bureauProfiel";
const TEKSTEN_KEY = "rapportTeksten";

interface BureauState {
  profiel: BureauProfiel;
  /** Eigen varianten per tekst-id. */
  eigenTeksten: Record<string, Tekstvariant[]>;
  zetProfiel: (p: BureauProfiel) => void;
  /** Achteraan erbij; een variant met hetzelfde label wordt vervangen. */
  voegTekstToe: (id: string, v: Tekstvariant) => void;
  /** `index` telt binnen de eigen varianten van `id`. */
  verwijderTekst: (id: string, index: number) => void;
}

// De beginstand, als vaste objecten: zolang de store nog precies deze
// objecten bevat, heeft niemand iets gewijzigd en mag de opgeslagen stand
// eroverheen.
const BEGIN_PROFIEL = leegBureau();
const BEGIN_TEKSTEN: Record<string, Tekstvariant[]> = {};

export const useBureauStore = create<BureauState>((set) => ({
  profiel: BEGIN_PROFIEL,
  eigenTeksten: BEGIN_TEKSTEN,

  zetProfiel: (p) => set({ profiel: p }),

  voegTekstToe: (id, v) => set((s) => ({ eigenTeksten: metEigenVariant(s.eigenTeksten, id, v) })),

  verwijderTekst: (id, index) =>
    set((s) => {
      const eigenTeksten = zonderEigenVariant(s.eigenTeksten, id, index);
      // Niets weggehaald: geen nieuwe stand, dus ook niets op te slaan.
      return eigenTeksten === s.eigenTeksten ? s : { eigenTeksten };
    }),
}));

// Persistentie -------------------------------------------------------------
// Zelfde patroon als projectStore: hydrateren bij het importeren, daarna
// debounced wegschrijven. Per sleutel een eigen timer, zodat typen in het
// profiel een net bewaarde tekstvariant niet ophoudt.

const timers = new Map<string, ReturnType<typeof setTimeout>>();
function planOpslag(sleutel: string, waarde: unknown) {
  const lopend = timers.get(sleutel);
  if (lopend) clearTimeout(lopend);
  timers.set(
    sleutel,
    setTimeout(() => {
      timers.delete(sleutel);
      void setSetting(sleutel, waarde);
    }, 400),
  );
}

void Promise.all([
  getSetting<unknown>(PROFIEL_KEY, null),
  getSetting<unknown>(TEKSTEN_KEY, null),
]).then(([profiel, teksten]) => {
  // De opgeslagen stand komt asynchroon binnen. Wat de gebruiker in de
  // tussentijd al heeft veranderd, wint: dat wordt niet overschreven maar
  // alsnog bewaard.
  const nu = useBureauStore.getState();
  const terug: Partial<Pick<BureauState, "profiel" | "eigenTeksten">> = {};
  if (nu.profiel !== BEGIN_PROFIEL) planOpslag(PROFIEL_KEY, nu.profiel);
  else if (profiel !== null) terug.profiel = normaliseerBureau(profiel);
  if (nu.eigenTeksten !== BEGIN_TEKSTEN) planOpslag(TEKSTEN_KEY, nu.eigenTeksten);
  else if (teksten !== null) terug.eigenTeksten = normaliseerEigenTeksten(teksten);
  if (terug.profiel || terug.eigenTeksten) useBureauStore.setState(terug);

  useBureauStore.subscribe((s, vorige) => {
    if (s.profiel !== vorige.profiel) planOpslag(PROFIEL_KEY, s.profiel);
    if (s.eigenTeksten !== vorige.eigenTeksten) planOpslag(TEKSTEN_KEY, s.eigenTeksten);
  });
});
