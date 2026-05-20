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
  status: "draft" | "review" | "final";
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
    status: "draft",
    sections,
  };
}
