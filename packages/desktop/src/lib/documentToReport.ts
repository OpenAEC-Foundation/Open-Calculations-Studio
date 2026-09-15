/**
 * Convert an evaluated .ifc-calculation document into a `ReportData` JSON
 * matching the openaec-core schema. Used as input for the Rust PDF engine.
 *
 * Mapping:
 *   heading (level 1)         → new Section { title, level: 1 }
 *   heading (level 2)         → new Section { title, level: 2 }
 *   heading (level 3+)        → Heading2Block within current section
 *   text                      → ParagraphBlock { text, style: "Normal" }
 *   assignment                → CalculationBlock { title=name, formula=expression,
 *                                                   substitution, result, unit }
 *   conditional-branch        → recurse into children
 *   svg / image / select / gef-upload / input-prompt → skipped (out-of-scope for PDF)
 */

import type { EvaluatedNode } from "@ifc-calc/core";

interface ContentBlock {
  type: string;
  [key: string]: unknown;
}

interface Section {
  title: string;
  level: number;
  content: ContentBlock[];
  page_break_before?: boolean;
}

export interface ReportData {
  template: string;
  project: string;
  tenant?: string;
  format: "A4" | "A3";
  orientation: "portrait" | "landscape";
  author: string;
  date: string;
  version: string;
  /**
   * Let op: de Rust-engine kent alleen deze drie, in hoofdletters en in het
   * Nederlands. Hier stond "draft", wat door serde geweigerd wordt — daarmee
   * viel élke aanroep van de engine om op de eerste regel.
   */
  status: "CONCEPT" | "DEFINITIEF" | "REVISIE";
  sections: Section[];
  metadata?: Record<string, unknown>;
}

export function documentToReport(
  nodes: EvaluatedNode[],
  projectName: string,
  options: { author?: string; tenant?: string } = {},
): ReportData {
  const sections: Section[] = [];
  let currentSection: Section | null = null;

  // Flatten conditional branches so their children also map into the report.
  const flat: EvaluatedNode[] = [];
  const collect = (arr: EvaluatedNode[]): void => {
    for (const n of arr) {
      if (n.type === "conditional-branch") {
        collect(n.children);
      } else {
        flat.push(n);
      }
    }
  };
  collect(nodes);

  const ensureSection = (): Section => {
    if (!currentSection) {
      currentSection = { title: projectName, level: 1, content: [] };
      sections.push(currentSection);
    }
    return currentSection;
  };

  for (const node of flat) {
    switch (node.type) {
      case "heading": {
        if (node.level <= 2) {
          currentSection = {
            title: node.text,
            level: node.level,
            content: [],
            page_break_before: node.level === 1 && sections.length > 0,
          };
          sections.push(currentSection);
        } else {
          ensureSection().content.push({
            type: "heading_2",
            text: node.text,
          });
        }
        break;
      }

      case "text":
        ensureSection().content.push({
          type: "paragraph",
          text: node.text,
          style: "Normal",
        });
        break;

      case "assignment": {
        const block: ContentBlock = {
          type: "calculation",
          title: node.name,
        };
        if (node.expression) block.formula = node.expression;
        if (node.substitution) block.substitution = node.substitution;
        if (node.result) block.result = node.result;
        if (node.unit) block.unit = node.unit;
        ensureSection().content.push(block);
        break;
      }

      // Skip media + interactive blocks for PDF
      case "svg":
      case "image":
      case "select":
      case "gef-upload":
      case "input-prompt":
        break;
    }
  }

  if (sections.length === 0) {
    sections.push({ title: projectName, level: 1, content: [] });
  }

  return {
    template: "default",
    project: projectName,
    tenant: options.tenant ?? "openaec_foundation",
    format: "A4",
    orientation: "portrait",
    author: options.author ?? "Open Calculations Studio",
    date: new Date().toISOString().slice(0, 10),
    version: "0.1",
    status: "CONCEPT",
    sections,
  };
}

/** Eén rekenblad zoals het in de projectuitdraai terechtkomt. */
export interface RapportBlad {
  naam: string;
  nodes: EvaluatedNode[];
}

/**
 * Zet het héle project in één rapport: een voorblad met de projectgegevens,
 * daarna elk rekenblad in de volgorde van de projectboom, elk op een nieuwe
 * pagina en met de naam die het blad in het project heeft.
 *
 * Dat is wat "exporteren" hoort te doen zodra een project meerdere bladen kent
 * — drie balklagen leveren drie hoofdstukken op, niet alleen degene die
 * toevallig openstond.
 */
export function projectToReport(
  bladen: RapportBlad[],
  projectNaam: string,
  gegevens: Record<string, string> = {},
  options: { author?: string; tenant?: string } = {},
): ReportData {
  const sections: Section[] = [];

  // Voorblad — alleen de ingevulde velden, zodat een leeg project geen
  // pagina vol lege regels oplevert.
  const kop: Array<[string, string | undefined]> = [
    ["Projectnummer", gegevens.project_nummer],
    ["Projectnaam", gegevens.project_naam],
    ["Onderdeel", gegevens.onderdeel],
    ["Opdrachtgever", gegevens.opdrachtgever],
    ["Constructeur", gegevens.constructeur],
    ["Locatie", gegevens.locatie],
    ["Gevolgklasse", gegevens.CC ? `CC${gegevens.CC}` : undefined],
    ["Betrouwbaarheidsklasse", gegevens.RC ? `RC${gegevens.RC}` : undefined],
    ["Ontwerplevensduur", gegevens.DesignLife ? `${gegevens.DesignLife} jaar` : undefined],
  ];
  const voorblad: Section = { title: projectNaam, level: 1, content: [] };
  for (const [label, waarde] of kop) {
    if (waarde) voorblad.content.push({ type: "paragraph", text: `${label}: ${waarde}`, style: "Normal" });
  }
  voorblad.content.push({
    type: "paragraph",
    text: `Deze uitdraai bevat ${bladen.length} ${bladen.length === 1 ? "rekenblad" : "rekenbladen"}.`,
    style: "Normal",
  });
  sections.push(voorblad);

  for (const blad of bladen) {
    const deel = documentToReport(blad.nodes, blad.naam, options);
    const eigen = deel.sections;
    // De naam uit de projectboom wint van de titelregel in de bladtekst: bij
    // drie balklagen moet je in de PDF kunnen zien wélke je voor je hebt.
    sections.push({ title: blad.naam, level: 1, content: [], page_break_before: true });
    for (const sec of eigen) {
      // Eén niveau inspringen onder de bladkop. Niet dieper dan 2: de mapping
      // bovenaan dit bestand kent alleen niveau 1 en 2 als sectie, dieper wordt
      // een kopblok binnen een sectie.
      sections.push({ ...sec, level: Math.min(sec.level + 1, 2), page_break_before: false });
    }
  }

  return {
    template: "default",
    project: projectNaam,
    tenant: options.tenant ?? "openaec_foundation",
    format: "A4",
    orientation: "portrait",
    // Let op: een niet-ingevuld veld is "" en niet undefined, dus || en niet ??.
    author: options.author || gegevens.constructeur || "Open Calculations Studio",
    date: new Date().toISOString().slice(0, 10),
    version: "0.1",
    status: "CONCEPT",
    sections,
  };
}
