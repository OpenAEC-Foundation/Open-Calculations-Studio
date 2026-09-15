import { create } from "zustand";
import type { ElementRef } from "@ifc-calc/core";
import { getSetting, setSetting } from "../store";
import { legeGegevens, type ProjectGegevens } from "./projectGegevens";

const STORE_KEY = "projectState";

/** Vaste id van het projectgegevens-formulier; geen exemplaar, wel selecteerbaar. */
export const PROJECT_ID = "__projectgegevens__";

/**
 * Eén rekenblad in het project.
 *
 * Een exemplaar draagt zijn **eigen kopie** van de rekentekst en zijn **eigen**
 * invoerwaarden. Drie balklagen naast elkaar zijn dus drie volledig losse
 * berekeningen: wat je in de ene invult raakt de andere niet, ook al heten de
 * variabelen hetzelfde. Dat is precies waar het oude model op stukliep — daar
 * was er één platte waardenmap voor de hele app, zodat `N_Ed` van de kolom en
 * `N_Ed` van de wand hetzelfde vakje waren.
 *
 * `templateId` is alleen herkomst: waaruit is dit exemplaar ontstaan. De tekst
 * volgt het sjabloon niet meer zodra hij is ingevoegd — een opgeleverde
 * berekening moet over vijf jaar nog hetzelfde uitrekenen, ook als het sjabloon
 * intussen is verbeterd.
 */
export interface Exemplaar {
  id: string;
  naam: string;
  templateId: string;
  source: string;
  /** Invoerwaarden van dit exemplaar, per variabelenaam. */
  waarden: Record<string, string>;
  /**
   * Elementen in een bronmodel waar dit blad over gaat.
   *
   * Leeg (of afwezig) betekent: losstaande berekening — de IFC-export maakt dan
   * zelf een element aan onder de naam van dit exemplaar. Staat er wél iets in,
   * dan draagt de export de toetsing over op díé elementen, zodat één balklaag-
   * berekening aan alle balken van die laag hangt.
   *
   * Het aanwijzen zelf komt later, samen met het inladen van een model. De
   * koppeling wordt bewust nooit geraden: welk element een toetsing beschrijft
   * weet alleen de constructeur.
   */
  elementen?: ElementRef[];
}

interface Persisted {
  projectNaam: string;
  bestandspad: string | null;
  gegevens: ProjectGegevens;
  exemplaren: Exemplaar[];
  activeId: string;
}

interface ProjectState {
  projectNaam: string;
  bestandspad: string | null;
  gegevens: ProjectGegevens;
  exemplaren: Exemplaar[];
  /** Wat er in de werkruimte staat: een exemplaar-id of PROJECT_ID. */
  activeId: string;
  dirty: boolean;
  /** Stapels voor ongedaan maken; niet opgeslagen, alleen voor deze sessie. */
  verleden: Momentopname[];
  toekomst: Momentopname[];

  selecteer: (id: string) => void;
  voegToe: (templateId: string, basisNaam: string, source: string) => string;
  dupliceer: (id: string) => string | null;
  hernoem: (id: string, naam: string) => void;
  verwijder: (id: string) => void;
  verplaats: (id: string, richting: -1 | 1) => void;

  zetBron: (id: string, source: string) => void;
  zetWaarde: (id: string, naam: string, waarde: string) => void;
  /** Vult ontbrekende waarden aan; bestaande blijven staan. */
  seedWaarden: (id: string, defaults: Record<string, string>) => void;

  /** Legt vast welke elementen uit een bronmodel dit blad toetst. */
  zetElementen: (id: string, elementen: ElementRef[]) => void;

  zetGegeven: (naam: string, waarde: string) => void;
  zetProjectNaam: (naam: string) => void;

  ongedaan: () => void;
  opnieuw: () => void;

  nieuwProject: () => void;
  laadProject: (p: Partial<Persisted>) => void;
  markeerOpgeslagen: (bestandspad: string) => void;
}

/**
 * Toestand waar "ongedaan maken" naar terugkeert.
 *
 * Alleen verwijzingen: omdat elke mutatie een nieuw object maakt en de rest
 * ongemoeid laat, delen opeenvolgende momentopnamen bijna alles met elkaar.
 * Honderd stappen geschiedenis kost daardoor nauwelijks geheugen.
 */
interface Momentopname {
  exemplaren: Exemplaar[];
  gegevens: ProjectGegevens;
  activeId: string;
}

const MAX_GESCHIEDENIS = 200;
/** Binnen deze tijd telt doortypen in hetzelfde veld als één stap. */
const SAMENVOEG_MS = 700;

let laatsteSleutel: string | null = null;
let laatsteTijd = 0;

/**
 * Zet een punt in de geschiedenis vóór een wijziging.
 *
 * `sleutel` maakt samenvoegen mogelijk: typ je in hetzelfde veld door, dan is
 * dat één stap en niet één per aanslag. Een `null`-sleutel is altijd een eigen
 * stap — dat zijn de handelingen waarvan je wilt dat ze los terugdraaibaar
 * zijn: invoegen, verwijderen, hernoemen, verplaatsen.
 */
function metGeschiedenis(s: ProjectState, sleutel: string | null) {
  const nu = Date.now();
  const samenvoegen =
    sleutel !== null && sleutel === laatsteSleutel && nu - laatsteTijd < SAMENVOEG_MS;
  laatsteSleutel = sleutel;
  laatsteTijd = nu;
  if (samenvoegen) return { toekomst: [] as Momentopname[] };
  const punt: Momentopname = {
    exemplaren: s.exemplaren,
    gegevens: s.gegevens,
    activeId: s.activeId,
  };
  return {
    verleden: [...s.verleden, punt].slice(-MAX_GESCHIEDENIS),
    toekomst: [] as Momentopname[],
  };
}

let teller = 0;
function nieuweId(): string {
  teller += 1;
  return `ex-${Date.now().toString(36)}-${teller.toString(36)}`;
}

/**
 * "Balklaag" wordt "Balklaag 1", de volgende "Balklaag 2".
 *
 * Zoekt het eerste vrije nummer in plaats van te tellen: na het verwijderen van
 * "Balklaag 1" zou tellen opnieuw "Balklaag 2" opleveren, en dan heb je twee
 * bladen met dezelfde naam in je uitdraai.
 */
function vrijeNaam(exemplaren: Exemplaar[], basisNaam: string, altijdNummeren = true): string {
  const bezet = new Set(exemplaren.map((e) => e.naam));
  if (!altijdNummeren && !bezet.has(basisNaam)) return basisNaam;
  for (let n = 1; ; n++) {
    const kandidaat = `${basisNaam} ${n}`;
    if (!bezet.has(kandidaat)) return kandidaat;
  }
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectNaam: "Nieuw project",
  bestandspad: null,
  gegevens: legeGegevens(),
  exemplaren: [],
  activeId: PROJECT_ID,
  dirty: false,
  verleden: [],
  toekomst: [],

  selecteer: (id) => set({ activeId: id }),

  voegToe: (templateId, basisNaam, source) => {
    const id = nieuweId();
    set((s) => ({
      ...metGeschiedenis(s, null),
      exemplaren: [
        ...s.exemplaren,
        {
          id,
          naam: vrijeNaam(s.exemplaren, basisNaam),
          templateId,
          source,
          waarden: {},
        },
      ],
      activeId: id,
      dirty: true,
    }));
    return id;
  },

  dupliceer: (id) => {
    const bron = get().exemplaren.find((e) => e.id === id);
    if (!bron) return null;
    const nieuw: Exemplaar = {
      ...bron,
      id: nieuweId(),
      naam: vrijeNaam(get().exemplaren, `${bron.naam} (kopie)`, false),
      waarden: { ...bron.waarden },
    };
    set((s) => {
      const i = s.exemplaren.findIndex((e) => e.id === id);
      const lijst = [...s.exemplaren];
      lijst.splice(i + 1, 0, nieuw);
      return { ...metGeschiedenis(s, null), exemplaren: lijst, activeId: nieuw.id, dirty: true };
    });
    return nieuw.id;
  },

  hernoem: (id, naam) =>
    set((s) => ({
      ...metGeschiedenis(s, null),
      exemplaren: s.exemplaren.map((e) => (e.id === id ? { ...e, naam } : e)),
      dirty: true,
    })),

  verwijder: (id) =>
    set((s) => {
      const i = s.exemplaren.findIndex((e) => e.id === id);
      const rest = s.exemplaren.filter((e) => e.id !== id);
      const active =
        s.activeId !== id ? s.activeId : (rest[Math.min(i, rest.length - 1)]?.id ?? PROJECT_ID);
      return { ...metGeschiedenis(s, null), exemplaren: rest, activeId: active, dirty: true };
    }),

  verplaats: (id, richting) =>
    set((s) => {
      const i = s.exemplaren.findIndex((e) => e.id === id);
      const j = i + richting;
      if (i < 0 || j < 0 || j >= s.exemplaren.length) return s;
      const lijst = [...s.exemplaren];
      const bewaar = lijst[i];
      lijst[i] = lijst[j];
      lijst[j] = bewaar;
      return { ...metGeschiedenis(s, null), exemplaren: lijst, dirty: true };
    }),

  zetBron: (id, source) =>
    set((s) => {
      if (!s.exemplaren.some((e) => e.id === id)) return s;
      return {
      ...metGeschiedenis(s, `bron:${id}`),
      exemplaren: s.exemplaren.map((e) => (e.id === id ? { ...e, source } : e)),
      dirty: true,
      };
    }),

  zetWaarde: (id, naam, waarde) =>
    set((s) => {
      if (!s.exemplaren.some((e) => e.id === id)) return s;
      return {
      ...metGeschiedenis(s, `waarde:${id}:${naam}`),
      exemplaren: s.exemplaren.map((e) =>
        e.id === id ? { ...e, waarden: { ...e.waarden, [naam]: waarde } } : e,
      ),
      dirty: true,
      };
    }),

  seedWaarden: (id, defaults) =>
    set((s) => {
      const ex = s.exemplaren.find((e) => e.id === id);
      if (!ex) return s;
      let veranderd = false;
      const samen = { ...ex.waarden };
      for (const [k, v] of Object.entries(defaults)) {
        if (samen[k] === undefined || samen[k] === "") {
          samen[k] = v;
          veranderd = true;
        }
      }
      // Geen ontbrekende sleutels betekent geen update, anders blijft React
      // rondpompen tussen designer en store.
      if (!veranderd) return s;
      return {
        exemplaren: s.exemplaren.map((e) => (e.id === id ? { ...e, waarden: samen } : e)),
      };
    }),

  zetElementen: (id, elementen) =>
    set((s) => ({
      ...metGeschiedenis(s, null),
      exemplaren: s.exemplaren.map((e) => (e.id === id ? { ...e, elementen } : e)),
      dirty: true,
    })),

  zetGegeven: (naam, waarde) =>
    set((s) => ({
      ...metGeschiedenis(s, `gegeven:${naam}`),
      gegevens: { ...s.gegevens, [naam]: waarde },
      dirty: true,
    })),

  zetProjectNaam: (naam) => set({ projectNaam: naam, dirty: true }),

  ongedaan: () =>
    set((s) => {
      const vorige = s.verleden[s.verleden.length - 1];
      if (!vorige) return s;
      laatsteSleutel = null;
      return {
        verleden: s.verleden.slice(0, -1),
        toekomst: [
          ...s.toekomst,
          { exemplaren: s.exemplaren, gegevens: s.gegevens, activeId: s.activeId },
        ],
        exemplaren: vorige.exemplaren,
        gegevens: vorige.gegevens,
        activeId: vorige.activeId,
        dirty: true,
      };
    }),

  opnieuw: () =>
    set((s) => {
      const volgende = s.toekomst[s.toekomst.length - 1];
      if (!volgende) return s;
      laatsteSleutel = null;
      return {
        toekomst: s.toekomst.slice(0, -1),
        verleden: [
          ...s.verleden,
          { exemplaren: s.exemplaren, gegevens: s.gegevens, activeId: s.activeId },
        ].slice(-MAX_GESCHIEDENIS),
        exemplaren: volgende.exemplaren,
        gegevens: volgende.gegevens,
        activeId: volgende.activeId,
        dirty: true,
      };
    }),

  nieuwProject: () =>
    set({
      projectNaam: "Nieuw project",
      bestandspad: null,
      gegevens: legeGegevens(),
      exemplaren: [],
      activeId: PROJECT_ID,
      dirty: false,
      verleden: [],
      toekomst: [],
    }),

  laadProject: (p) =>
    set({
      projectNaam: p.projectNaam ?? "Nieuw project",
      bestandspad: p.bestandspad ?? null,
      gegevens: { ...legeGegevens(), ...(p.gegevens ?? {}) },
      exemplaren: p.exemplaren ?? [],
      activeId: p.exemplaren?.[0]?.id ?? PROJECT_ID,
      dirty: false,
      verleden: [],
      toekomst: [],
    }),

  markeerOpgeslagen: (bestandspad) => set({ bestandspad, dirty: false }),
}));

// Persistentie -------------------------------------------------------------
// Debounced wegschrijven naar de Tauri-store, zodat de app opent waar je hem
// achterliet. Het projectbestand op schijf is iets anders; zie tauri/fileOps.

let timer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(snapshot: Persisted) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void setSetting(STORE_KEY, snapshot);
    timer = null;
  }, 400);
}

void getSetting<Persisted | null>(STORE_KEY, null).then((saved) => {
  // De opgeslagen staat komt asynchroon binnen. Heeft de gebruiker in die
  // tussentijd al iets gedaan — een module toegevoegd, een veld ingevuld — dan
  // zou terugzetten dat werk weggooien. Alleen hydrateren als er nog niets is
  // gebeurd.
  const nu = useProjectStore.getState();
  const onaangeroerd = nu.exemplaren.length === 0 && !nu.dirty;
  if (saved && Array.isArray(saved.exemplaren) && onaangeroerd) {
    useProjectStore.setState({
      projectNaam: saved.projectNaam ?? "Nieuw project",
      bestandspad: saved.bestandspad ?? null,
      gegevens: { ...legeGegevens(), ...(saved.gegevens ?? {}) },
      exemplaren: saved.exemplaren,
      activeId: saved.activeId ?? PROJECT_ID,
      dirty: false,
    });
  }
  useProjectStore.subscribe((s) =>
    schedulePersist({
      projectNaam: s.projectNaam,
      bestandspad: s.bestandspad,
      gegevens: s.gegevens,
      exemplaren: s.exemplaren,
      activeId: s.activeId,
    }),
  );
});
