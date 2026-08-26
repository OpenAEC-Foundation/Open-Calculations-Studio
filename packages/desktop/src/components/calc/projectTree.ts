/**
 * Modulecatalogus en naslagbibliotheek voor het zijpaneel.
 *
 * Dit bestand beschrijft WAT je kunt invoegen, niet wat er in je project zit.
 * De projectinhoud staat in `store/projectStore.ts`: een lijst exemplaren, elk
 * met een eigen kopie van de rekentekst en eigen invoerwaarden. Een module uit
 * deze catalogus kan dus meerdere keren in een project voorkomen.
 *
 *   - `moduleCatalogus` — rekenmodules, gegroepeerd per materiaal. Invoegen
 *     maakt er een exemplaar van.
 *   - `bibliotheek` — naslag: boeken, normuitwerkingen, CalcPAD-voorbeelden.
 *     Ook invoegbaar, zodat je een normuitwerking in je berekening kunt
 *     opnemen.
 *
 * `templateId` matcht een sleutel in `src/templates/index.ts`.
 */

export type ModuleStatus =
  /** Toetsing uitgewerkt én nagerekend op referentiebladen. */
  | "gereed"
  /** Toetsing staat er, maar is nog niet tegen referentiebladen gecontroleerd. */
  | "controleren"
  /** Alleen invoer en parametrisch beeld — de toetsing moet nog worden gemaakt. */
  | "concept";

export const STATUS_UITLEG: Record<ModuleStatus, string> = {
  gereed: "Gecalibreerd — toetsing nagerekend op referentiebladen",
  controleren: "Toetsing uitgewerkt, nog niet tegen referentiebladen gecontroleerd",
  concept: "Nog uit te werken — alleen invoer en parametrisch beeld, geen toetsing",
};

export type TreeNode =
  | { kind: "section"; id: string; label: string; children: TreeNode[] }
  | { kind: "category"; id: string; label: string; defaultExpanded?: boolean; children: TreeNode[]; count?: number }
  | { kind: "item"; id: string; label: string; templateId?: string; emphasis?: boolean; status?: ModuleStatus };

/**
 * Calc-sheets binnen het huidige project, gegroepeerd per materiaal.
 *
 * Vijf categorieën — Algemeen, Staal, Beton, Hout, Metselwerk — elk met de
 * modules die erbij horen. Binnen een categorie eerst de constructiedelen
 * (kolom, ligger, wand), daarna de verbindingen en tot slot de losse toetsen.
 *
 * Een `▫` achter het label betekent: invoer en parametrisch beeld zijn er, de
 * toetsing moet nog worden uitgewerkt.
 *
 * Voor nu hardcoded; later vervangen door dynamische projectstaat (persisted
 * per project file).
 */
export const moduleCatalogus: TreeNode[] = [
  {
    kind: "category",
    id: "cat-algemeen",
    label: "Algemeen",
    defaultExpanded: true,
    count: 2,
    children: [
      { kind: "item", id: "sheet-spuwer", label: "Spuwer (noodoverlaat)", templateId: "spuwer", status: "gereed" },
      { kind: "item", id: "sheet-paaldraagvermogen", label: "Paaldraagvermogen", templateId: "paaldraagvermogen", status: "controleren" },
    ],
  },
  {
    kind: "category",
    id: "cat-staal",
    label: "Staal",
    defaultExpanded: true,
    count: 12,
    children: [
      // "Stalen ligger IPE 300" stond hier als module, maar is een uitgewerkt
      // voorbeeld met de doorsnede hard ingetypt — geen profielkeuze, geen
      // parametrisch beeld. De echte toetsing staat als "Volledige toetsing
      // stalen ligger" in de bibliotheek hieronder.
      { kind: "item", id: "sheet-stalen-gevelkolom", label: "Stalen gevelkolom (wind + N)", templateId: "stalen-gevelkolom", status: "controleren" },
      { kind: "item", id: "sheet-verticaal-windverband", label: "Verticaal windverband", templateId: "verticaal-windverband", status: "controleren" },
      { kind: "item", id: "sheet-voetplaatverbinding", label: "Voetplaatverbinding (kolomvoet)", templateId: "voetplaatverbinding", status: "controleren" },
      { kind: "item", id: "sheet-boutberekening", label: "Boutberekening", templateId: "boutberekening", status: "gereed" },
      {
        kind: "category",
        id: "cat-staal-concept",
        label: "Nog uit te werken",
        defaultExpanded: true,
        count: 7,
        children: [
          { kind: "item", id: "sheet-stalen-kolom", label: "Stalen kolom", templateId: "stalen-kolom", status: "concept" },
          { kind: "item", id: "sheet-momentverbinding", label: "Momentverbinding", templateId: "momentverbinding", status: "concept" },
          { kind: "item", id: "sheet-dwarskrachtverbinding", label: "Dwarskrachtverbinding", templateId: "dwarskrachtverbinding", status: "concept" },
          { kind: "item", id: "sheet-schoorverbinding", label: "Schoorverbinding", templateId: "schoorverbinding", status: "concept" },
          { kind: "item", id: "sheet-penverbinding", label: "Penverbinding", templateId: "penverbinding", status: "concept" },
          { kind: "item", id: "sheet-lasberekening", label: "Lasberekening", templateId: "lasberekening", status: "concept" },
          { kind: "item", id: "sheet-brandwerendheid", label: "Brandwerendheid", templateId: "brandwerendheid", status: "concept" },
        ],
      },
    ],
  },
  {
    kind: "category",
    id: "cat-beton",
    label: "Beton",
    defaultExpanded: true,
    count: 6,
    children: [
      { kind: "item", id: "sheet-kruipfactor", label: "Kruipfactor", templateId: "kruipfactor", status: "gereed" },
      { kind: "item", id: "sheet-verankeringslengte", label: "Verankeringslengte", templateId: "verankeringslengte", status: "gereed" },
      {
        kind: "category",
        id: "cat-beton-concept",
        label: "Nog uit te werken",
        defaultExpanded: true,
        count: 4,
        children: [
          { kind: "item", id: "sheet-betondoorsnede", label: "Betondoorsnede", templateId: "betondoorsnede", status: "concept" },
          { kind: "item", id: "sheet-betonkolom", label: "Betonkolom", templateId: "betonkolom", status: "concept" },
          { kind: "item", id: "sheet-ponsberekening", label: "Pons", templateId: "ponsberekening", status: "concept" },
          { kind: "item", id: "sheet-tweepaals-poer", label: "Tweepaals poer", templateId: "tweepaals-poer", status: "concept" },
        ],
      },
    ],
  },
  {
    kind: "category",
    id: "cat-hout",
    label: "Hout",
    defaultExpanded: true,
    count: 4,
    children: [
      { kind: "item", id: "sheet-kolom", label: "Kolom (houten kolom)", templateId: "kolom", status: "gereed" },
      { kind: "item", id: "sheet-balklaag", label: "Balklaag (houten vloerbalken)", templateId: "balklaag", status: "gereed" },
      { kind: "item", id: "sheet-gording", label: "Gording (dakgording)", templateId: "gording", status: "gereed" },
      { kind: "item", id: "sheet-schijfwerking", label: "Schijfwerking (wandschijf)", templateId: "schijfwerking", status: "controleren" },
    ],
  },
  {
    kind: "category",
    id: "cat-metselwerk",
    label: "Metselwerk",
    defaultExpanded: true,
    count: 2,
    children: [
      { kind: "item", id: "sheet-metselwerkwand", label: "Dragende metselwerkwand", templateId: "metselwerkwand", status: "controleren" },
      { kind: "item", id: "sheet-opleg-metselwerk", label: "Oplegging op metselwerk", templateId: "opleg-metselwerk", status: "controleren" },
    ],
  },
];

export const bibliotheek: TreeNode[] = [
  {
    kind: "category",
    id: "books",
    label: "Books",
    defaultExpanded: false,
    count: 8,
    children: [
      { kind: "item", id: "book-bijlage-a", label: "Constructieberekening Bijlage A" },
      { kind: "item", id: "book-funderingsadvies", label: "Funderingsadvies" },
      { kind: "item", id: "vdp-schuifspanning", label: "Vandepitte: Schuifspanningen (Jourawsky)", templateId: "vdp-schuifspanning" },
      { kind: "item", id: "vdp-doorbuiging", label: "Vandepitte: Doorbuiging + dwarskracht", templateId: "vdp-doorbuiging" },
      { kind: "item", id: "vdp-knikken", label: "Vandepitte: Knikken (Euler)", templateId: "vdp-knikken" },
      { kind: "item", id: "vdp-mohr", label: "Vandepitte: Doorbuiging (Mohr)", templateId: "vdp-mohr" },
      { kind: "item", id: "vdp-eigenfrequentie", label: "Vandepitte: Eigenfrequentie", templateId: "vdp-eigenfrequentie" },
      { kind: "item", id: "vdp-virtuele-arbeid", label: "Vandepitte: Virtuele Arbeid (vakwerk)", templateId: "vdp-virtuele-arbeid" },
    ],
  },
  {
    kind: "category",
    id: "standards",
    label: "Standards",
    defaultExpanded: true,
    children: [
      {
        kind: "category",
        id: "std-en1990",
        label: "NEN-EN 1990 Grondslagen",
        children: [
          { kind: "item", id: "en1990-compleet", label: "Overzicht combinaties", templateId: "en1990-compleet" },
          { kind: "item", id: "en1990-fundamenteel", label: "§6.4.3.2 UGT Fundamenteel (STR/GEO)", templateId: "en1990-fundamenteel" },
          { kind: "item", id: "en1990-equ", label: "§6.4.2 UGT Evenwicht (EQU)", templateId: "en1990-equ" },
          { kind: "item", id: "en1990-buitengewoon", label: "§6.4.3.3 UGT Buitengewoon", templateId: "en1990-buitengewoon" },
          { kind: "item", id: "en1990-aardbeving", label: "§6.4.3.4 UGT Aardbeving", templateId: "en1990-aardbeving" },
          { kind: "item", id: "en1990-bgt", label: "§6.5.3 BGT (SLS)", templateId: "en1990-bgt" },
          { kind: "item", id: "en1990-groep-c", label: "Tabel NB.6 Geotechnisch (groep C)", templateId: "en1990-groep-c" },
          { kind: "item", id: "en1990-rekenwaarden", label: "§6.3 Rekenwaarden", templateId: "en1990-rekenwaarden" },
          { kind: "item", id: "en1990-referentieperiode", label: "NB Referentieperiode", templateId: "en1990-referentieperiode" },
        ],
      },
      {
        kind: "category",
        id: "std-en1991",
        label: "EN 1991 Belastingen",
        children: [
          { kind: "item", id: "en1991-gebruiksbelasting", label: "1-1 Opgelegde belastingen (Tabel NB.1-6.2)", templateId: "en1991-gebruiksbelasting" },
          { kind: "item", id: "en1991-sneeuwbelasting", label: "1-3 §5.2 Sneeuwbelasting", templateId: "en1991-sneeuwbelasting" },
          { kind: "item", id: "en1991-windbelasting", label: "1-4 §4/§7 Windbelasting", templateId: "en1991-windbelasting" },
        ],
      },
      {
        kind: "category",
        id: "std-en1992",
        label: "EN 1992-1-1 Beton",
        children: [
          { kind: "item", id: "ec2-materiaal", label: "Tabel 3.1 Materiaaleigenschappen", templateId: "ec2-materiaal" },
          { kind: "item", id: "ec2-buiging", label: "§6.1 Buiging", templateId: "ec2-buiging" },
          { kind: "item", id: "ec2-dwarskracht-zonder", label: "§6.2.2 Dwarskracht zonder beugels", templateId: "ec2-dwarskracht-zonder" },
          { kind: "item", id: "ec2-dwarskracht-met", label: "§6.2.3 Dwarskracht met beugels", templateId: "ec2-dwarskracht-met" },
          { kind: "item", id: "ec2-pons", label: "§6.4 Pons", templateId: "ec2-pons" },
          { kind: "item", id: "ec2-scheurwijdte", label: "§7.3.4 Scheurwijdte", templateId: "ec2-scheurwijdte" },
          { kind: "item", id: "ec2-doorbuiging", label: "§7.4.2 Doorbuiging", templateId: "ec2-doorbuiging" },
          { kind: "item", id: "ec2-betonbalk", label: "Volledige toetsing betonbalk", templateId: "ec2-betonbalk" },
        ],
      },
      {
        kind: "category",
        id: "std-en1993",
        label: "EN 1993-1-1 Staal",
        children: [
          { kind: "item", id: "ec3-materiaal", label: "§3.2 Materiaal + partiële factoren", templateId: "ec3-materiaal" },
          { kind: "item", id: "ec3-classificatie", label: "§5.5 Doorsnedeclassificatie", templateId: "ec3-classificatie" },
          { kind: "item", id: "ec3-trek", label: "§6.2.3 Trek", templateId: "ec3-trek" },
          { kind: "item", id: "ec3-druk", label: "§6.2.4 Druk", templateId: "ec3-druk" },
          { kind: "item", id: "ec3-buiging", label: "§6.2.5 Buiging", templateId: "ec3-buiging" },
          { kind: "item", id: "ec3-dwarskracht", label: "§6.2.6 Dwarskracht", templateId: "ec3-dwarskracht" },
          { kind: "item", id: "ec3-buiging-normaalkracht", label: "§6.2.9 Buiging + normaalkracht", templateId: "ec3-buiging-normaalkracht" },
          { kind: "item", id: "ec3-kip", label: "§6.3.2 Kip (LTB)", templateId: "ec3-kip" },
          { kind: "item", id: "ec3-knik", label: "§6.3.1 Knik", templateId: "ec3-knik" },
          { kind: "item", id: "ec3-doorbuiging", label: "§7.2 Doorbuiging (SLS)", templateId: "ec3-doorbuiging" },
          { kind: "item", id: "ec3-stalen-ligger", label: "Volledige toetsing stalen ligger", templateId: "ec3-stalen-ligger" },
        ],
      },
      {
        kind: "category",
        id: "std-en1995",
        label: "EN 1995-1-1 Hout",
        children: [
          { kind: "item", id: "ec5-buiging", label: "§6.1.6 Buiging", templateId: "ec5-buiging" },
          { kind: "item", id: "ec5-afschuiving", label: "§6.1.7 Afschuiving", templateId: "ec5-afschuiving" },
          { kind: "item", id: "ec5-druk", label: "§6.1.4 Druk evenwijdig", templateId: "ec5-druk" },
          { kind: "item", id: "ec5-druk-loodrecht", label: "§6.1.5 Druk loodrecht", templateId: "ec5-druk-loodrecht" },
          { kind: "item", id: "ec5-knik", label: "§6.3.2 Knik", templateId: "ec5-knik" },
          { kind: "item", id: "ec5-doorbuiging", label: "§7.2 Doorbuiging", templateId: "ec5-doorbuiging" },
          { kind: "item", id: "ec5-houten-balk", label: "Volledige toetsing houten balk", templateId: "ec5-houten-balk" },
        ],
      },
      {
        kind: "category",
        id: "std-en1996",
        label: "EN 1996-1-1 Metselwerk",
        children: [
          { kind: "item", id: "en1996-druksterkte", label: "§3.6 Druksterkte metselwerk", templateId: "en1996-druksterkte" },
          { kind: "item", id: "en1996-drukwand", label: "§6.1.2 Wand op druk", templateId: "en1996-drukwand" },
          { kind: "item", id: "en1996-afschuiving", label: "§6.2 Afschuiving", templateId: "en1996-afschuiving" },
          { kind: "item", id: "en1996-slankheid", label: "§5.5.1 Slankheid", templateId: "en1996-slankheid" },
        ],
      },
      {
        kind: "category",
        id: "std-nen9997",
        label: "NEN 9997-1 Geotechniek",
        children: [
          { kind: "item", id: "en1997-funderingsstrook", label: "§6 Funderingsstrook", templateId: "en1997-funderingsstrook" },
          { kind: "item", id: "en1997-paaldraagvermogen", label: "§7 Paaldraagvermogen", templateId: "en1997-paaldraagvermogen" },
          { kind: "item", id: "en1997-zetting", label: "§6.6 Zetting", templateId: "en1997-zetting" },
          { kind: "item", id: "en1997-glijding", label: "§6.5.3 Glijding", templateId: "en1997-glijding" },
        ],
      },
    ],
  },
  {
    kind: "category",
    id: "calcpad-samples",
    label: "CalcPAD voorbeelden",
    defaultExpanded: false,
    count: 12,
    children: [
      { kind: "item", id: "cpd-2259-intertek", label: "2259 Intertek units (real-world)", templateId: "cpd-2259-intertek" },
      { kind: "item", id: "cpd-calcpad-demo", label: "CalcPAD syntax demo", templateId: "calcpad-demo" },
      { kind: "item", id: "cpd-quadratic", label: "Quadratic Equation", templateId: "cpd-quadratic" },
      { kind: "item", id: "cpd-cubic", label: "Cubic Equation", templateId: "cpd-cubic" },
      { kind: "item", id: "cpd-lissajous", label: "Lissajous Curve", templateId: "cpd-lissajous" },
      { kind: "item", id: "cpd-rose", label: "Rose Curve", templateId: "cpd-rose" },
      { kind: "item", id: "cpd-rectangle", label: "Rectangle Area", templateId: "cpd-rectangle" },
      { kind: "item", id: "cpd-circle", label: "Circle Area", templateId: "cpd-circle" },
      { kind: "item", id: "cpd-sphere", label: "Sphere Volume", templateId: "cpd-sphere" },
      { kind: "item", id: "cpd-hexagon", label: "Hexagon Section", templateId: "cpd-hexagon" },
      { kind: "item", id: "cpd-ssb-force", label: "SSB Concentrated Force", templateId: "cpd-ssb-force" },
      { kind: "item", id: "cpd-deep-beam", label: "Deep Beam (Elastic)", templateId: "cpd-deep-beam" },
    ],
  },
];

/** Wat de app van een sjabloon moet weten zodra het een exemplaar wordt. */
export interface ModuleInfo {
  templateId: string;
  label: string;
  status?: ModuleStatus;
  /** Categorie waaronder hij in de catalogus staat (Staal, Beton, ...). */
  categorie: string;
}

function verzamel(nodes: TreeNode[], categorie: string, uit: Record<string, ModuleInfo>) {
  for (const node of nodes) {
    if (node.kind === "item") {
      if (node.templateId && !uit[node.templateId]) {
        uit[node.templateId] = {
          templateId: node.templateId,
          label: node.label,
          status: node.status,
          categorie,
        };
      }
    } else {
      verzamel(node.children, node.kind === "category" ? node.label : categorie, uit);
    }
  }
}

/** Sjabloon-id naar label en status, voor de naamgeving van nieuwe exemplaren. */
export const modulesPerTemplate: Record<string, ModuleInfo> = (() => {
  const uit: Record<string, ModuleInfo> = {};
  verzamel(moduleCatalogus, "Algemeen", uit);
  verzamel(bibliotheek, "Bibliotheek", uit);
  return uit;
})();
