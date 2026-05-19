/**
 * Project browser tree — hierarchical organization of every template
 * (Eurocodes, Vandepitte books, project calcs) the user can drop into the editor.
 *
 * `templateId` matches a key in `src/templates/index.ts`.
 */

export type TreeNode =
  | { kind: "category"; id: string; label: string; defaultExpanded?: boolean; children: TreeNode[]; count?: number }
  | { kind: "item"; id: string; label: string; templateId?: string };

export const projectTree: TreeNode[] = [
  {
    kind: "category",
    id: "books",
    label: "Books",
    defaultExpanded: true,
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
    id: "calculations",
    label: "Calculations",
    defaultExpanded: true,
    count: 3,
    children: [
      { kind: "item", id: "calc-calcpad-demo", label: "CalcPAD syntax demo", templateId: "calcpad-demo" },
      { kind: "item", id: "calc-paaldraagvermogen", label: "Paaldraagvermogen", templateId: "paaldraagvermogen" },
      { kind: "item", id: "calc-stalen-ligger", label: "Stalen ligger IPE 300", templateId: "stalen-ligger" },
    ],
  },
];
