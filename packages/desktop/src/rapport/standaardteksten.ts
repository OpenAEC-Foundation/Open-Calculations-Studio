/**
 * Meegeleverde tekstvarianten per tekstonderdeel van het rapport.
 *
 * Neutraal geformuleerd: geen bureau-, persoons-, project- of productnamen.
 * Wat per project of bureau verschilt gaat via invulvelden ({adviseur},
 * {projectnaam}, … — zie invullen.ts). Een bureau legt zijn eigen varianten
 * vast in de instellingen; die komen in het keuzemenu naast deze.
 *
 * De tekst-ids zijn de knoop-ids uit opzet.ts. Regelopmaak: een regel is een
 * rij in het rapport, een lege regel een nieuwe alinea, een regel die met "-"
 * begint een opsommingsregel.
 */

export interface Tekstvariant { label: string; tekst: string; }

/** Per tekst-id de meegeleverde varianten; de eerste is de standaard in een nieuw rapport. */
export const STANDAARD_TEKSTEN: Record<string, readonly Tekstvariant[]> = {
  // ── 1 Inleiding ──
  inleiding: [
    {
      label: "Hoofdberekening",
      tekst: [
        "Ten behoeve van het genoemde project brengt {adviseur} op verzoek van de opdrachtgever in dit rapport een constructieadvies uit.",
        "",
        "Het advies is gebaseerd op de verstrekte gegevens.",
        "",
        "Dit rapport omvat de hoofdberekening van de constructie.",
        "Voor de detailengineering dienen nog aanvullende berekeningen door derden te worden uitgevoerd, die door {adviseur} worden gecontroleerd:",
        "-Tekeningen en berekeningen systeemvloeren;",
        "-Tekeningen en berekeningen staalconstructie;",
        "-Sondering en funderingsadvies;",
      ].join("\n"),
    },
    {
      label: "Alleen uitgangspunten",
      tekst: [
        "Ten behoeve van het genoemde project brengt {adviseur} op verzoek van de opdrachtgever in dit rapport een constructieadvies uit.",
        "",
        "Het advies is gebaseerd op de verstrekte gegevens.",
        "",
        "Dit rapport omvat de uitgangspunten van de constructie.",
      ].join("\n"),
    },
  ],

  // ── 2 Projectgegevens ──
  projectomschrijving: [
    { label: "Aanbouw", tekst: "Het project omvat het realiseren van een aanbouw." },
    { label: "Dakopbouw", tekst: "Het project omvat het realiseren van een dakopbouw." },
    { label: "Nieuwbouw woning", tekst: "Het project omvat het realiseren van een woonhuis." },
    { label: "Verbouwing", tekst: "Het project omvat de verbouwing van een bestaand pand." },
  ],
  rol: [
    { label: "Opdracht constructieadvies", tekst: "{adviseur} heeft opdracht voor het constructieadvies voor dit project." },
    { label: "Opdracht toetsing", tekst: "{adviseur} heeft opdracht voor het toetsen van de constructie van dit project." },
  ],

  // ── 3.1 Toelichting constructie: bestaande situatie ──
  "bestaand-verticaal": [
    {
      label: "Houten balklagen op metselwerk",
      tekst: "De vloeren bestaan uit houten balklagen. Deze dragen via de gemetselde bouwmuren af naar de fundering.",
    },
    {
      label: "Gordingenkap en houten balklagen",
      tekst: "Het dak bestaat uit een gordingenkap. De vloeren bestaan uit houten balklagen.\nDeze dragen via de gemetselde bouwmuren en een dragende tussenwand af naar de fundering.",
    },
    {
      label: "Betonvloeren op dragende wanden",
      tekst: "De vloeren bestaan uit betonvloeren. Deze dragen via de dragende wanden af naar de fundering.",
    },
  ],
  "bestaand-stabiliteit": [
    { label: "Gemetselde bouwmuren", tekst: "De stabiliteit wordt verzorgd door de gemetselde bouwmuren." },
    {
      label: "Stabiliteitswanden en schijfwerking",
      tekst: "De stabiliteit wordt verzorgd door de stabiliteitswanden, in combinatie met de schijfwerking van de vloeren.",
    },
  ],
  "bestaand-fundatie": [
    {
      label: "Onbekend, vermoedelijk op staal",
      tekst: "Er zijn geen archiefgegevens bekend. Vermoedelijk is het gebouw op staal gefundeerd.",
    },
    { label: "Op staal", tekst: "Het gebouw is volgens de archiefgegevens op staal gefundeerd." },
    { label: "Op palen", tekst: "Het gebouw is volgens de archiefgegevens op palen gefundeerd." },
  ],
  "bestaand-beoordeling": [
    {
      label: "Geen aanleiding tot twijfel",
      tekst: "Er is geen aanleiding om te twijfelen aan de bouwkwaliteit van de bestaande constructie.",
    },
    {
      label: "Beoordelen in het werk",
      tekst: "De staat van de bestaande constructie is niet bekend. Deze wordt voor aanvang van de werkzaamheden in het werk beoordeeld.",
    },
  ],

  // ── 3.1 Toelichting constructie: wijziging en belendingen ──
  wijziging: [
    {
      label: "Doorbraak in dragende wand",
      tekst: [
        "Er wordt een doorbraak gemaakt in een dragende wand met een stalen portaal.",
        "De stabiliteit wordt verzorgd door het resterende deel van de wand.",
        "De verticale belastingafdracht naar de fundering gaat via de kolommen en de onderligger naar de bestaande fundering.",
      ].join("\n"),
    },
    {
      label: "Aanbouw met houten balklaag",
      tekst: "De aanbouw wordt gerealiseerd met een houten balklaag als dak, die via dragende wanden afdraagt naar een nieuwe fundering op staal.",
    },
  ],
  belendingen: [
    { label: "Niet beschouwd", tekst: "De constructieve invloed van belendingen is in deze berekening niet beschouwd." },
  ],

  // ── 3.2 Aandachtspunten bij uitvoering ──
  "uitvoering-bestaand": [
    {
      label: "Maatvoering controleren",
      tekst: "-Maatvoering is gebaseerd op archiefstukken en/of de tekening van de architect.\n-Maatvoering moet in het werk worden gecontroleerd.",
    },
  ],
  "uitvoering-verbouw": [
    {
      label: "Stempelen bij nieuwe openingen",
      tekst: "-Bij het maken van nieuwe openingen in bestaand metselwerk de wand en de omliggende constructie voldoende stempelen.",
    },
    {
      label: "Volgorde van slopen",
      tekst: "-Dragende onderdelen pas verwijderen als de nieuwe constructie is aangebracht of de belasting tijdelijk is opgevangen.",
    },
  ],
  "uitvoering-nieuwbouw": [
    {
      label: "Fundering op staal",
      tekst: "-Fundering op staal: de draagkrachtige laag vaststellen tijdens het ontgraven.\n-Wapening voor het storten laten controleren.",
    },
    {
      label: "Paalfundering",
      tekst: "-Kalenderstaten en paalafwijkingen naar de constructeur sturen.\n-Wapeningscontroles van de fundering en van alle vloerstorts.",
    },
  ],

  // ── 4 Uitgangspunten ──
  trillingen: [
    {
      label: "Trillingen bij vloeren",
      tekst: "Bij vloerconstructies worden trillingsberekeningen uitgevoerd.\nVoor overige onderdelen worden trillingen verder niet beschouwd.",
    },
    { label: "Niet beschouwd", tekst: "Trillingen worden in deze berekening niet beschouwd." },
  ],
  vervormingen: [
    { label: "Standaard", tekst: "De onderstaande vervormingseisen worden gehanteerd voor dit project." },
  ],
  montage: [
    {
      label: "Eindfase",
      tekst: "Deze berekening gaat uit van de constructie in de eindfase. Het berekenen van de verschillende bouwfasen, zoals onderstempeling, is niet meegenomen.",
    },
  ],
  rekenprogrammatuur: [
    { label: "OpenAEC Calc", tekst: "De berekeningen in dit rapport zijn opgesteld met OpenAEC Calc." },
    {
      label: "OpenAEC Calc met bijlagen",
      tekst: "De berekeningen in dit rapport zijn opgesteld met OpenAEC Calc.\nBerekeningen met andere rekenprogrammatuur staan in de bijlagen; daarin is de gebruikte versie benoemd.",
    },
  ],
  temperatuur: [
    { label: "Niet aan de orde", tekst: "Bij dit project zijn geen bijzondere temperatuursinvloeden aan de orde." },
    { label: "Per onderdeel", tekst: "Temperatuursinvloeden worden bij de desbetreffende onderdelen beschouwd." },
  ],
  aardbeving: [
    { label: "Niet voorgeschreven", tekst: "Er is geen aardbevingsontwerpsituatie voorgeschreven." },
  ],

  // ── 5 Belastingen ──
  sneeuw: [
    {
      label: "Standaard",
      tekst: "Sneeuwophoping en sneeuwbelasting op hellende daken worden bij de desbetreffende onderdelen berekend, indien van toepassing.",
    },
  ],
  regenwater: [
    { label: "Niet van toepassing", tekst: "Niet van toepassing" },
    {
      label: "Per dakonderdeel",
      tekst: "Wateraccumulatie op platte daken wordt bij de desbetreffende dakonderdelen berekend.",
    },
  ],
};

/**
 * De tekst-ids die in een nieuw rapport meteen hun eerste variant krijgen. De
 * overige onderdelen (bestaande situatie, wijziging, belendingen,
 * aandachtspunten) verschillen per project te veel: die beginnen leeg en
 * vallen dan uit het rapport tot de gebruiker er iets invult.
 */
export const STANDAARD_IN_NIEUW_RAPPORT: readonly string[] = [
  "inleiding", "projectomschrijving", "rol", "trillingen", "vervormingen", "montage",
  "rekenprogrammatuur", "temperatuur", "aardbeving", "sneeuw", "regenwater",
];

/** Per tekst-id de eerste variant, voor standaardRapport(); ids zonder standaard ontbreken. */
export function standaardTeksten(): Record<string, string> {
  const uit: Record<string, string> = {};
  for (const id of STANDAARD_IN_NIEUW_RAPPORT) {
    const eerste = STANDAARD_TEKSTEN[id]?.[0];
    if (eerste) uit[id] = eerste.tekst;
  }
  return uit;
}
