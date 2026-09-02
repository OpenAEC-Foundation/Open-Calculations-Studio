/**
 * Projectgegevens — de waarden die voor het héle project gelden.
 *
 * Alles wat hier staat wordt in élk rekenblad van het project als variabele
 * beschikbaar gesteld (via `initialScope` van de evaluator). Een blad hoeft ze
 * dus niet zelf te vragen: de gevolgklasse vul je één keer in en hij werkt
 * overal door.
 *
 * Wat hier NIET thuishoort is alles wat per constructiedeel verschilt —
 * belastingen, afmetingen, materiaalkeuzes. Die horen bij het exemplaar, en
 * twee exemplaren van dezelfde module horen elkaar daarin nooit te raken.
 * Zie `projectStore.ts` voor die scheiding.
 */

export type VeldType = "tekst" | "keuze";

export interface Keuze {
  label: string;
  waarde: string;
}

export interface VeldDef {
  /** Variabelenaam zoals de rekenbladen hem gebruiken. */
  naam: string;
  label: string;
  type: VeldType;
  standaard: string;
  opties?: Keuze[];
  /** Toelichting onder het veld — normverwijzing of gebruiksregel. */
  hint?: string;
  /** Kop waaronder het veld in het formulier valt. */
  groep: string;
}

export const PROJECT_VELDEN: VeldDef[] = [
  // ── Rekenwijze ───────────────────────────────────────────────────────────
  // Op de plaatsen waar de referentie-uitwerking aantoonbaar iets anders doet dan de norm
  // rekent elk blad béide uitkomsten uit. Dit veld bepaalt welke van de twee de
  // conclusie stuurt; de andere verschijnt als kanttekening zodra hij afwijkt.
  // Het register met alle splitspunten staat in docs/afwijkingen-referentie.md.
  {
    groep: "Rekenwijze",
    naam: "rekenwijze",
    label: "Rekenwijze bij een verschil met het referentieprogramma",
    type: "keuze",
    standaard: "1",
    opties: [
      { label: "de referentie-uitwerking volgen (huidige praktijk)", waarde: "1" },
      { label: "De norm volgen", waarde: "0" },
    ],
    hint: "de referentie-uitwerking is het rekenprogramma dat we vandaag hanteren en is daarom de standaard; elke uitkomst is tegen referentiebladen na te rekenen. De norm-stand rekent op de gemarkeerde punten volgens de Eurocode zelf — die tak is niet tegen een referentie te toetsen en staat er voor het moment dat dit programma op eigen benen staat. Het gekozen antwoord staat altijd op de afdruk.",
  },

  // ── Projectkop ───────────────────────────────────────────────────────────
  { groep: "Project", naam: "project_nummer", label: "Projectnummer", type: "tekst", standaard: "" },
  { groep: "Project", naam: "project_naam", label: "Projectnaam", type: "tekst", standaard: "" },
  { groep: "Project", naam: "opdrachtgever", label: "Opdrachtgever", type: "tekst", standaard: "" },
  { groep: "Project", naam: "constructeur", label: "Constructeur", type: "tekst", standaard: "" },
  { groep: "Project", naam: "locatie", label: "Locatie", type: "tekst", standaard: "" },
  { groep: "Project", naam: "onderdeel", label: "Onderdeel", type: "tekst", standaard: "" },

  // ── Grondslagen (NEN-EN 1990 + NB) ───────────────────────────────────────
  {
    groep: "Grondslagen (NEN-EN 1990 + NB)",
    naam: "CC",
    label: "Gevolgklasse",
    type: "keuze",
    standaard: "2",
    opties: [
      { label: "CC1 — beperkte gevolgen", waarde: "1" },
      { label: "CC2 — middelmatige gevolgen", waarde: "2" },
      { label: "CC3 — grote gevolgen", waarde: "3" },
    ],
    hint: "Bepaalt K_FI (Tabel NB.A1.1): CC1 → 0,90 · CC2 → 1,00 · CC3 → 1,10. Elk blad krijgt zowel CC als K_FI.",
  },
  {
    groep: "Grondslagen (NEN-EN 1990 + NB)",
    naam: "RC",
    label: "Betrouwbaarheidsklasse",
    type: "keuze",
    standaard: "2",
    opties: [
      { label: "RC1", waarde: "1" },
      { label: "RC2", waarde: "2" },
      { label: "RC3", waarde: "3" },
    ],
  },
  {
    groep: "Grondslagen (NEN-EN 1990 + NB)",
    naam: "DesignLife",
    label: "Ontwerplevensduur",
    type: "keuze",
    standaard: "50",
    opties: [
      { label: "10 jaar (tijdelijk)", waarde: "10" },
      { label: "25 jaar", waarde: "25" },
      { label: "50 jaar (standaard)", waarde: "50" },
      { label: "100 jaar (monumenten/infra)", waarde: "100" },
    ],
  },

  // ── Locatiegebonden (NEN-EN 1991-1-4 + NB) ───────────────────────────────
  {
    groep: "Wind (NEN-EN 1991-1-4 + NB)",
    naam: "windgebied",
    label: "Windgebied",
    type: "keuze",
    standaard: "2",
    opties: [
      { label: "I — Kust, Markermeer, IJsselmeer (v_b0 = 29,5 m/s)", waarde: "1" },
      { label: "II — Noord-Holland, Groningen, Friesland, Flevoland, Zuid-Holland, Zeeland (27,0)", waarde: "2" },
      { label: "III — Overig Nederland (24,5)", waarde: "3" },
    ],
    hint: "Volgt uit de gemeente (Tabel NB.1). Het beeld van de gording rekent q_p hieruit; de rekenbladen van gording en gevelkolom vragen q_p nog als los getal — zie docs/backlog.md.",
  },
  {
    groep: "Wind (NEN-EN 1991-1-4 + NB)",
    naam: "terreincategorie",
    label: "Terreincategorie",
    type: "keuze",
    standaard: "2",
    opties: [
      { label: "0 — Zee of kustgebied (z₀ = 0,005 · z_min = 1)", waarde: "1" },
      { label: "II — Onbebouwd gebied (z₀ = 0,2 · z_min = 4)", waarde: "2" },
      { label: "III — Bebouwd gebied (z₀ = 0,5 · z_min = 7)", waarde: "3" },
    ],
    hint: "Volgt uit de omgeving van het gebouw (Tabel NB.3-4.1).",
  },
];

export type ProjectGegevens = Record<string, string>;

/** Verse projectgegevens: elk veld op zijn standaard. */
export function legeGegevens(): ProjectGegevens {
  const g: ProjectGegevens = {};
  for (const v of PROJECT_VELDEN) g[v.naam] = v.standaard;
  return g;
}

/** K_FI bij een gevolgklasse — Tabel NB.A1.1. */
export function kFiVoor(cc: number): number {
  if (cc <= 1) return 0.9;
  if (cc >= 3) return 1.1;
  return 1.0;
}

/**
 * Zet de projectgegevens om in variabelen voor de evaluator.
 *
 * Keuzevelden worden getallen (zodat `#if CC ≡ 2` werkt), tekstvelden blijven
 * tekst. K_FI wordt afgeleid uit CC — je vult de gevolgklasse in, de factor
 * volgt vanzelf, zodat de twee nooit uit de pas kunnen lopen.
 */
export function projectScope(g: ProjectGegevens): Record<string, unknown> {
  const scope: Record<string, unknown> = {};
  for (const veld of PROJECT_VELDEN) {
    const ruw = g[veld.naam] ?? veld.standaard;
    if (veld.type === "keuze") {
      const n = parseFloat(ruw);
      if (Number.isFinite(n)) scope[veld.naam] = n;
    } else {
      // Ook lege tekstvelden krijgen een waarde: een blad dat de projectnaam
      // afdrukt mag niet omvallen op "onbekende variabele" omdat het veld nog
      // niet is ingevuld.
      scope[veld.naam] = ruw;
    }
  }
  const cc = typeof scope.CC === "number" ? scope.CC : 2;
  scope.K_FI = kFiVoor(cc);
  return scope;
}
