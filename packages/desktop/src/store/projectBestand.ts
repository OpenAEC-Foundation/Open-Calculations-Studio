import type { IfcxDocument } from "@ifc-calc/core";
import { legeGegevens, type ProjectGegevens } from "./projectGegevens";
import type { Exemplaar } from "./projectStore";

/**
 * Het projectbestand: één `.ifc-calculation` met de héle berekening erin.
 *
 * Formaat
 * -------
 * Het bestand blijft een geldig IFCX JSON-LD document — een IFC-lezer kan het
 * openen — met twee extra velden:
 *
 *   `source`  — de rekentekst van het eerste blad. Alleen voor lezers die één
 *               blad verwachten; wij gebruiken hem niet bij het openen zodra
 *               `project` aanwezig is.
 *   `project` — de eigenlijke inhoud: projectgegevens plus alle exemplaren,
 *               elk met eigen tekst en eigen invoerwaarden.
 *
 * Een bestand zonder `project` is een los rekenblad uit een oudere versie (of
 * een `.cpd`). Dat wordt geopend als een project met één exemplaar erin, zodat
 * er nooit werk verloren gaat.
 */

export const PROJECT_FORMAAT_VERSIE = 1;

export interface ProjectPayload {
  versie: number;
  naam: string;
  gegevens: ProjectGegevens;
  exemplaren: Exemplaar[];
}

export interface GelezenProject {
  projectNaam: string;
  gegevens: ProjectGegevens;
  exemplaren: Exemplaar[];
}

/** Bouwt de tekst die naar schijf gaat. */
export function bouwProjectBestand(
  payload: ProjectPayload,
  ifcx: IfcxDocument | null,
): string {
  const doc = {
    ...(ifcx ?? {}),
    source: {
      format: "calcpad",
      language: "ifc-calculation",
      content: payload.exemplaren[0]?.source ?? "",
    },
    project: payload,
  };
  return JSON.stringify(doc, null, 2);
}

let losTeller = 0;
function losseId(): string {
  losTeller += 1;
  return `ex-los-${Date.now().toString(36)}-${losTeller.toString(36)}`;
}

/**
 * Leest een bestand terug. Accepteert drie vormen:
 *   1. nieuw  — JSON met `project`
 *   2. oud    — JSON met `source.content` (één rekenblad)
 *   3. kaal   — losse CalcPAD-tekst (`.cpd`)
 */
export function leesProjectBestand(raw: string, bestandsnaam: string): GelezenProject {
  const trimmed = raw.trimStart();

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as {
        project?: Partial<ProjectPayload>;
        source?: { content?: unknown };
      };

      const p = parsed.project;
      if (p && Array.isArray(p.exemplaren)) {
        return {
          projectNaam: p.naam || bestandsnaam,
          gegevens: { ...legeGegevens(), ...(p.gegevens ?? {}) },
          exemplaren: p.exemplaren.map((e) => ({
            id: e.id || losseId(),
            naam: e.naam || bestandsnaam,
            templateId: e.templateId || "",
            source: e.source || "",
            waarden: e.waarden ?? {},
            // Ontbreekt in bestanden van vóór de elementkoppeling; leeg = losstaand.
            elementen: e.elementen ?? [],
          })),
        };
      }

      if (typeof parsed.source?.content === "string") {
        return losBlad(parsed.source.content, bestandsnaam);
      }
    } catch {
      // Geen geldige JSON — behandel de inhoud als kale CalcPAD-tekst.
    }
  }

  return losBlad(raw, bestandsnaam);
}

function losBlad(source: string, bestandsnaam: string): GelezenProject {
  return {
    projectNaam: bestandsnaam,
    gegevens: legeGegevens(),
    exemplaren: [
      { id: losseId(), naam: bestandsnaam, templateId: "", source, waarden: {}, elementen: [] },
    ],
  };
}
