import type { IfcxDocument } from "@ifc-calc/core";
import { legeGegevens, type ProjectGegevens } from "./projectGegevens.ts";
import type { Exemplaar } from "./projectStore";
import { normaliseerRapport, type Rapport } from "../rapport/model.ts";
import { datumTekst } from "../rapport/revisies.ts";
import { standaardTeksten } from "../rapport/standaardteksten.ts";
import { leesRekenversie } from "../components/calc/bladVersie.ts";

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
 *               elk met eigen tekst en eigen invoerwaarden, en het
 *               constructierapport (`project.rapport`).
 *
 * `project.rapport` is optioneel: een bestand van vóór het constructierapport
 * krijgt bij openen een nieuw rapport met de standaardwaarden. De
 * formaatversie blijft daarom 1 (lezen controleert hem ook niet). Een oudere
 * versie van de app kent het veld niet en laat het bij opnieuw opslaan weg.
 *
 * Een exemplaar heeft `id`, `naam`, `templateId`, `source`, `waarden`,
 * `elementen` en, sinds de rekenversie per blad, `bronVersie`: de rekenversie
 * van de module bij invoegen of het laatste bijwerken
 * (components/calc/bladVersie.ts). Ook die is optioneel. Een blad zonder
 * vergelijkt zijn tekst met de module, zoals voorheen; een oudere versie van
 * de app laat het veld bij opnieuw opslaan weg, en dan gebeurt dat ook.
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
  /** Ontbreekt in bestanden van vóór het constructierapport. */
  rapport?: Rapport;
}

export interface GelezenProject {
  projectNaam: string;
  gegevens: ProjectGegevens;
  exemplaren: Exemplaar[];
  /** Afwezig bij een oud bestand of een los blad; laadProject maakt dan een nieuw rapport. */
  rapport?: Rapport;
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
          exemplaren: normaliseerExemplaren(p.exemplaren, bestandsnaam),
          // Per veld gecontroleerd: het bestand kan van een andere versie van
          // de app komen of met de hand zijn aangepast. Onbekende velden
          // vallen weg, ontbrekende krijgen hun standaardwaarde.
          rapport: p.rapport
            ? normaliseerRapport(p.rapport, datumTekst(new Date()), standaardTeksten())
            : undefined,
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

/**
 * Eén blad uit een bestand of uit de opgeslagen staat van de app, aangevuld
 * tot een volledig exemplaar. Beide kunnen van een andere versie van de app
 * komen of met de hand zijn aangepast: ontbrekende velden krijgen hun
 * standaardwaarde, velden van het verkeerde type ook, en een ongeldige
 * bronversie valt weg. Geen object: null.
 *
 * `naam` is de naam voor een blad zonder naam: de bestandsnaam bij het
 * openen, de projectnaam bij het herstellen van de opgeslagen staat.
 */
export function normaliseerExemplaar(x: unknown, naam: string): Exemplaar | null {
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  const e = x as Partial<Record<keyof Exemplaar, unknown>>;
  const tekst = (w: unknown) => (typeof w === "string" ? w : "");
  const ex: Exemplaar = {
    id: tekst(e.id) || losseId(),
    naam: tekst(e.naam) || naam,
    templateId: tekst(e.templateId),
    source: tekst(e.source),
    waarden: leesWaarden(e.waarden),
    // Ontbreekt in bestanden van vóór de elementkoppeling; leeg = losstaand.
    elementen: Array.isArray(e.elementen) ? (e.elementen as Exemplaar["elementen"]) : [],
  };
  // Alleen als hij er is: een blad zonder bronversie schrijft ook geen leeg veld weg.
  const bronVersie = leesRekenversie(e.bronVersie);
  if (bronVersie) ex.bronVersie = bronVersie;
  return ex;
}

/** Alle bladen uit een lijst van buiten de app; wat geen blad is, valt weg. */
export function normaliseerExemplaren(lijst: unknown, naam: string): Exemplaar[] {
  if (!Array.isArray(lijst)) return [];
  return lijst.map((x) => normaliseerExemplaar(x, naam)).filter((e): e is Exemplaar => e !== null);
}

/**
 * De invoer van een blad: per naam een tekst. Een getal of ja/nee uit een met
 * de hand aangepast bestand wordt tekst; iets anders valt weg. De invoervelden
 * rekenen met tekst en zouden op een ander type vastlopen.
 */
function leesWaarden(x: unknown): Record<string, string> {
  if (!x || typeof x !== "object" || Array.isArray(x)) return {};
  const uit: Record<string, string> = {};
  for (const [k, v] of Object.entries(x)) {
    if (typeof v === "string") uit[k] = v;
    else if (typeof v === "number" || typeof v === "boolean") uit[k] = String(v);
  }
  return uit;
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
