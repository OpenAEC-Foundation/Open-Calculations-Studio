import { useMemo } from "react";
import { parse, evaluate } from "@ifc-calc/core";
import type { AstNode, EvaluatedNode } from "@ifc-calc/core";
import { calcpadIncludes, calcpadImageUrls } from "../../templates/calcpad-includes";
import { useActiefExemplaar, useProjectScope } from "../../store/actiefBlad";

/**
 * De uitkomst van een doorgerekend blad: titel, norm, maatgevende UC en het
 * eindoordeel. De afdruk zet die in de kop van elk blad; een parametrisch beeld
 * kan hem in zijn eigen kop tonen. Zo staat er overal hetzelfde getal, en
 * hoeft een beeld de toetsing niet na te bouwen.
 */
export interface Resultaat {
  /** De kop van het rekenblad, zonder normverwijzing. */
  titel: string;
  /** Het deel van de kop na het gedachtestreepje: de norm of het hoofdstuk. */
  norm: string;
  /** De maatgevende unity check (UC_max), als het blad die noemt. */
  uc: number | null;
  /** Het eindoordeel van het blad; null als het blad er geen geeft. */
  voldoet: boolean | null;
}

/** Nederlandse notatie met twee decimalen; een oneindige UC als ∞. */
export const ucTekst = (uc: number) => (Number.isFinite(uc) ? uc.toFixed(2).replace(".", ",") : "∞");

/** Een uitkomst van het blad als getal. ∞ is een geldige UC: weerstand nul. */
function getal(tekst: string): number {
  const t = tekst.trim();
  return t.startsWith("∞") ? Infinity : parseFloat(t.replace(",", "."));
}

/** Loopt de uitgerekende knopen door, ook die binnen een voorwaardelijk blok. */
function* knopen(lijst: EvaluatedNode[]): Generator<EvaluatedNode> {
  for (const n of lijst) {
    yield n;
    if (n.type === "conditional-branch") yield* knopen(n.children);
  }
}

/**
 * Leest de uitkomst uit een doorgerekend blad.
 *
 * De maatgevende UC is de laatste zichtbare `UC_max`. Het oordeel komt uit de
 * slotzin ("Maatgevende UC = … → voldoet"), want een blad kan ondanks een UC
 * onder 1,0 afkeuren, bijvoorbeeld op de detaillering. Zonder slotzin beslist
 * de UC.
 */
export function leesResultaat(nodes: EvaluatedNode[], naam: string): Resultaat {
  let titel = naam;
  let norm = "";
  let uc: number | null = null;
  const tekstdelen: string[] = [];
  for (const n of knopen(nodes)) {
    if (n.type === "heading" && n.level === 1 && titel === naam) {
      const [voor, na] = n.text.split(/\s+—\s+/, 2);
      titel = voor || naam;
      norm = na ?? "";
    }
    if ((n.type === "assignment" || n.type === "var-display") && n.name === "UC_max") {
      const w = getal(String(n.result));
      if (!Number.isNaN(w)) uc = w;
    }
    if (n.type === "text") tekstdelen.push(n.text);
  }
  const tekst = tekstdelen.join(" ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const slot = tekst.lastIndexOf("Maatgevende UC");
  let voldoet: boolean | null = null;
  if (slot >= 0) {
    const zin = tekst.slice(slot, slot + 240);
    voldoet = !/voldoe[nt] niet/.test(zin) && /voldoe[nt]/.test(zin);
    // Staat UC_max niet zichtbaar in het blad, dan het getal uit de slotzin.
    if (uc === null) {
      const m = zin.match(/Maatgevende UC\s*=\s*([\d.,]+|∞)/);
      const w = m ? getal(m[1]) : NaN;
      if (!Number.isNaN(w)) uc = w;
    }
  } else if (uc !== null) {
    voldoet = uc <= 1;
  }
  return { titel, norm, uc, voldoet };
}

/**
 * Elke zichtbare uitkomst van het blad op naam, zonder eenheid: `h_ef` → 2100.
 * De eenheid is die van het blad (`to mm`, `to kN`). Staat een naam er twee
 * keer, dan telt de laatste — net als in de uitwerking zelf.
 */
export function leesGetallen(nodes: EvaluatedNode[]): Record<string, number> {
  const uit: Record<string, number> = {};
  for (const n of knopen(nodes)) {
    if (n.type === "assignment" || n.type === "var-display") {
      const w = getal(String(n.result));
      if (!Number.isNaN(w)) uit[n.name] = w;
    }
  }
  return uit;
}

/**
 * Een schakelaar tussen de twee lezingen: `X = if(rekenwijze ≡ 1; X_ref; X_nb)`.
 * Groep 2 is het achtervoegsel van de referentietak, zonder scheidingsteken.
 */
const SCHAKELAAR = /^[ \t]*([^\s=]+)[ \t]*=[ \t]*if\(rekenwijze ≡ 1;[ \t]*\1[,_]([^\s;,_]+)[ \t]*;/gmu;

/**
 * Zet de referentietakken van een blad onder hun huidige naam, `X_ref`.
 *
 * Een blad draagt zijn eigen rekentekst mee, dus een blad dat vóór die
 * naamgeving is opgeslagen, noemt zijn referentietakken nog anders. Welk
 * achtervoegsel het blad gebruikt, staat in zijn eigen schakelaars; dat lezen
 * we daar af. Zo hoeft een beeld alleen de huidige naam te kennen en leest het
 * een ouder blad toch goed. Bij een blad dat al `_ref` schrijft, verandert er
 * niets.
 */
export function metRefNamen(getallen: Record<string, number>, bron: string): Record<string, number> {
  const ander = new Set<string>();
  for (const m of bron.matchAll(SCHAKELAAR)) if (m[2] !== "ref") ander.add(m[2]);
  if (ander.size === 0) return getallen;
  const uit: Record<string, number> = {};
  for (const [naam, w] of Object.entries(getallen)) {
    const i = naam.lastIndexOf("_");
    uit[i > 0 && ander.has(naam.slice(i + 1)) ? `${naam.slice(0, i)}_ref` : naam] = w;
  }
  return uit;
}

/** Wat een beeld van zijn blad laat zien: het oordeel en de getallen van de uitwerking. */
export interface BladUitkomst {
  resultaat: Resultaat;
  getallen: Record<string, number>;
}

/** Leest een bladtekst in, met dezelfde includes en afbeeldingen als de uitwerking. */
export function leesBlad(source: string): AstNode[] {
  return parse(source, { includes: calcpadIncludes, imageUrls: calcpadImageUrls });
}

/**
 * Rekent een blad door met de gegeven invoer en projectgegevens. Los van de
 * hook, zodat een beeld het blad ook met een ándere invoer kan doorrekenen —
 * de ontwerpknop van de balklaag probeert zo de profielen uit de lijst. Een
 * al ingelezen blad scheelt dan het inlezen per poging.
 */
export function rekenBladDoor(
  blad: string | AstNode[],
  waarden: Record<string, string>,
  scope: Record<string, unknown>,
  naam: string,
): BladUitkomst | null {
  try {
    const ast = typeof blad === "string" ? leesBlad(blad) : blad;
    const nodes = evaluate(ast, waarden, scope);
    const getallen = leesGetallen(nodes);
    return {
      resultaat: leesResultaat(nodes, naam),
      getallen: typeof blad === "string" ? metRefNamen(getallen, blad) : getallen,
    };
  } catch {
    return null;
  }
}

/**
 * Rekent het blad dat het beeld tekent door: normaal het actieve blad, in de
 * afdruk het blad van de afdrukcontext. Met dezelfde invoer en
 * projectgegevens als de uitwerking ernaast, dus met dezelfde uitkomst.
 */
export function useBladUitkomst(): BladUitkomst | null {
  const exemplaar = useActiefExemplaar();
  const scope = useProjectScope();
  const source = exemplaar?.source;
  const waarden = exemplaar?.waarden;
  const naam = exemplaar?.naam ?? "";
  return useMemo(
    () => (source ? rekenBladDoor(source, waarden ?? {}, scope, naam) : null),
    [source, waarden, scope, naam],
  );
}

/** De automatische samenvatting voor hoofdstuk Berekeningen: "Houten balklaag — UC 0,82, voldoet.". */
export function samenvatting(r: Resultaat): string {
  const delen: string[] = [];
  if (r.uc !== null) delen.push(`UC ${ucTekst(r.uc)}`);
  if (r.voldoet !== null) delen.push(r.voldoet ? "voldoet" : "voldoet niet");
  return delen.length > 0 ? `${r.titel} — ${delen.join(", ")}.` : `${r.titel}.`;
}
