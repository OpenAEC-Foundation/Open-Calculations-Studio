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
  /**
   * Keuzes die een eerdere versie aanbood en nu niet meer. Een project dat er
   * nog een heeft, laadt en rekent gewoon door, met de keuze `naar` (altijd de
   * veilige kant). Het formulier toont de oude keuze tot je zelf een andere
   * kiest; de opgeslagen waarde blijft staan.
   */
  vervallen?: { waarde: string; label: string; naar: string }[];
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
    hint: "Bepaalt K_FI (tabel B3, met de opmerking bij tabel NB.4 – A1.2(B)): CC1 → 0,90 · CC2 → 1,00 · CC3 → 1,10. Elk blad krijgt zowel CC als K_FI.",
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
      { label: "5 jaar — klasse 1: tijdelijk, hooguit 5 jaar in gebruik", waarde: "5" },
      { label: "15 jaar — klasse 2: landbouw, industrie met 1 of 2 bouwlagen", waarde: "15" },
      { label: "50 jaar — klasse 3: gebouwen en gewone constructies (standaard)", waarde: "50" },
      { label: "100 jaar — klasse 4: monumentale gebouwen", waarde: "100" },
    ],
    // 10 en 25 jaar zijn geen klasse van tabel NB.1 – 2.1; een project dat ze
    // nog heeft, rekent met de klasse erboven.
    vervallen: [
      { waarde: "10", label: "10 jaar", naar: "15" },
      { waarde: "25", label: "25 jaar", naar: "50" },
    ],
    hint: "Minimumwaarden volgens tabel NB.1 – 2.1. Een tijdelijk bouwwerk valt in klasse 3, tenzij het hooguit 5 jaar in gebruik is (klasse 1) of een bestemming uit klasse 2 heeft. De belastingen rekenen met een referentieperiode van ten minste 15 jaar.",
  },

  // ── Locatiegebonden (NEN-EN 1991-1-4 + NB) ───────────────────────────────
  {
    groep: "Wind (NEN-EN 1991-1-4 + NB)",
    naam: "windgebied",
    label: "Windgebied",
    type: "keuze",
    standaard: "2",
    opties: [
      { label: "I — Waddeneilanden, Waddenzee, IJsselmeer, Markermeer en Noord-Holland-noord (v_b0 = 29,5 m/s)", waarde: "1" },
      { label: "II — rest van Noord-Holland, vasteland Groningen en Friesland, Flevoland, Zuid-Holland, Zeeland (27,0)", waarde: "2" },
      { label: "III — rest van Nederland (24,5)", waarde: "3" },
    ],
    hint: "Indeling volgens 4.2(1) opmerking 2 van de NB, v_b0 uit tabel NB.1. Noord-Holland-noord: ten noorden van Heemskerk, Uitgeest, Wormerland, Purmerend en Edam-Volendam (o.a. Den Helder, Alkmaar, Hoorn). Binnen 5 km van een grens gaat v_b0 geleidelijk over (figuur NB.1); het gebied waarin de locatie ligt, zit dan aan de veilige kant. De gording en de stalen gevelkolom rekenen q_p hieruit, met de referentiehoogte uit het blad.",
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

/** De vervallen keuze die `ruw` is, of niets. */
export function vervallenKeuze(veld: VeldDef, ruw: string): { waarde: string; label: string; naar: string } | undefined {
  return veld.vervallen?.find((v) => v.waarde === ruw);
}

/** De waarde waarmee gerekend wordt: een vervallen keuze wordt haar vervanger. */
export function geldendeWaarde(veld: VeldDef, ruw: string): string {
  return vervallenKeuze(veld, ruw)?.naar ?? ruw;
}

/**
 * De geldende waarde van een projectveld, voor wie hem buiten de rekenbladen
 * toont (afdruk, rapport). Zo staat daar hetzelfde als waarmee gerekend is.
 */
export function projectWaarde(g: ProjectGegevens, veldNaam: string): string | undefined {
  const veld = PROJECT_VELDEN.find((v) => v.naam === veldNaam);
  const ruw = g[veldNaam];
  return veld && ruw !== undefined ? geldendeWaarde(veld, ruw) : ruw;
}

/**
 * De keuzes voor het formulier. Staat er in het project een waarde die er niet
 * (meer) bij hoort, dan komt die als extra keuze onderaan, zodat het formulier
 * toont wat er werkelijk staat in plaats van stil de eerste keuze.
 */
export function keuzesVoor(veld: VeldDef, ruw: string): Keuze[] {
  const opties = veld.opties ?? [];
  if (opties.some((o) => o.waarde === ruw)) return opties;
  const oud = vervallenKeuze(veld, ruw);
  // Van de vervanger alleen het deel vóór de toelichting: "50 jaar".
  const vervanger = oud && opties.find((o) => o.waarde === oud.naar)?.label.split(" — ")[0];
  const label = oud
    ? `${oud.label} — vervallen keuze, gerekend als ${vervanger ?? oud.naar}`
    : `${ruw} — onbekende keuze`;
  return [...opties, { label, waarde: ruw }];
}

/** K_FI bij een gevolgklasse — tabel B3, met de opmerking bij tabel NB.4 – A1.2(B). */
export function kFiVoor(cc: number): number {
  if (cc <= 1) return 0.9;
  if (cc >= 3) return 1.1;
  return 1.0;
}

/**
 * Partiële belastingsfactoren bij een gevolgklasse — NEN-EN 1990 NB, tabel
 * NB.4 (CC2) en NB.5 (CC1 en CC3), STR/GEO groep B.
 *
 * Bewust de tabelwaarden en niet K_FI × de factoren van CC2: de tabel rondt
 * af (1,1 in plaats van 0,9 × 1,2 = 1,08) en geeft bij CC3 voor 6.10a 1,5 in
 * plaats van 1,1 × 1,35 = 1,485.
 */
export function belastingFactoren(cc: number): { gG: number; gQ: number; gGa: number } {
  if (cc <= 1) return { gG: 1.1, gQ: 1.35, gGa: 1.2 };
  if (cc >= 3) return { gG: 1.3, gQ: 1.65, gGa: 1.5 };
  return { gG: 1.2, gQ: 1.5, gGa: 1.35 };
}

/**
 * Zet de projectgegevens om in variabelen voor de evaluator.
 *
 * Keuzevelden worden getallen (zodat `#if CC ≡ 2` werkt), tekstvelden blijven
 * tekst; een vervallen keuze (zie `VeldDef.vervallen`) telt als haar
 * vervanger. K_FI wordt afgeleid uit CC — je vult de gevolgklasse in, de
 * factor volgt vanzelf, zodat de twee nooit uit de pas kunnen lopen.
 */
export function projectScope(g: ProjectGegevens): Record<string, unknown> {
  const scope: Record<string, unknown> = {};
  for (const veld of PROJECT_VELDEN) {
    const ruw = g[veld.naam] ?? veld.standaard;
    if (veld.type === "keuze") {
      const n = parseFloat(geldendeWaarde(veld, ruw));
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
