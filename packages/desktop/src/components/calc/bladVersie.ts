import type { AstNode } from "@ifc-calc/core";

/*
 * Rekenversie van een blad, en het bijwerken van een verouderd blad.
 *
 * Een blad draagt zijn eigen kopie van de rekentekst (store/projectStore.ts):
 * een opgeleverde berekening moet over vijf jaar nog hetzelfde uitrekenen. De
 * keerzijde is dat een verbetering van een rekenmodule een bestaand blad nooit
 * bereikt. Dit bestand maakt dat zichtbaar en bijwerken mogelijk, als bewuste
 * stap van de gebruiker:
 *
 *   rekenversie      een korte vingerafdruk van de bladtekst; staat in de kop
 *                    van het blad en op de afdruk, zodat later na te gaan is
 *                    met welke versie er gerekend is.
 *   isVerouderd      de bladtekst wijkt af van de huidige module.
 *   invoervelden,    welke invoer blijft, vervalt of nieuw is, en welke
 *   vergelijkInvoer  waarden het blad na bijwerken heeft.
 *   vergelijkUitkomst  maatgevende UC, oordeel en de UC-waarden oud → nieuw.
 *
 * Puur en zonder waarde-imports: scripts/check-blad-bijwerken.mjs laadt dit
 * bestand rechtstreeks in Node. Het doorrekenen zelf (parse en evaluate) doet
 * de aanroeper; hier komen alleen de uitkomsten binnen.
 */

/** Aantal hextekens van een rekenversie. */
export const VERSIE_LENGTE = 7;

/**
 * De bladtekst zoals de rekenversie hem ziet: zonder BOM, met \n als
 * regeleinde, zonder spaties of tabs aan het eind van een regel en zonder lege
 * regels aan het eind. Zo geeft dezelfde tekst na opslaan op een andere
 * machine, of door een editor die regeleinden omzet, dezelfde versie.
 */
export function normaliseerBladtekst(tekst: string): string {
  return tekst
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n+$/, "");
}

/**
 * FNV-1a (32 bits) over de UTF-8-bytes. Eenvoudig, snel en overal na te
 * rekenen; voor een vingerafdruk van een tekst is meer niet nodig.
 */
function fnv1a(tekst: string): number {
  const bytes = new TextEncoder().encode(tekst);
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/*
 * Kleine geheugens, want de projectboom vraagt bij elke wijziging de versie
 * van elk blad op. De sleutel is de tekst zelf: ongewijzigde bladen houden in
 * de store dezelfde string, en die zoekt een Map snel op. Begrensd, omdat
 * typen in de rekentekst bij elke toets een nieuwe tekst oplevert; wat het
 * langst niet gevraagd is valt eruit. Ruim genoeg voor een project waarin
 * elk blad een andere oude tekst heeft plus de huidige moduleteksten: een
 * te krap geheugen rekent bij elke toetsaanslag alle teksten opnieuw door.
 */
const MAX_ONTHOUDEN = 64;
const versies = new Map<string, string>();
const genormaliseerd = new Map<string, string>();

function onthoud<T>(geheugen: Map<string, T>, sleutel: string, maak: () => T): T {
  const bekend = geheugen.get(sleutel);
  if (bekend !== undefined) {
    // Achteraan zetten: de volgorde van de Map is die van het laatste gebruik.
    geheugen.delete(sleutel);
    geheugen.set(sleutel, bekend);
    return bekend;
  }
  const waarde = maak();
  if (geheugen.size >= MAX_ONTHOUDEN) geheugen.delete(geheugen.keys().next().value as string);
  geheugen.set(sleutel, waarde);
  return waarde;
}

const normaal = (tekst: string) => onthoud(genormaliseerd, tekst, () => normaliseerBladtekst(tekst));

/** De rekenversie van een bladtekst: 7 hextekens, bv. "3f9a1c0". */
export function rekenversie(tekst: string): string {
  return onthoud(versies, tekst, () =>
    fnv1a(normaal(tekst)).toString(16).padStart(8, "0").slice(0, VERSIE_LENGTE),
  );
}

/** Zijn twee bladteksten na normaliseren gelijk? */
export function zelfdeRekentekst(a: string, b: string): boolean {
  return a === b || normaal(a) === normaal(b);
}

/** Wat van een blad nodig is om zijn herkomst op te zoeken. */
export interface BladHerkomst {
  templateId?: string;
  source: string;
}

/**
 * De huidige tekst van de module waaruit het blad is ontstaan, of null als het
 * blad geen (bekende) module heeft: een los geopend blad of een module die niet
 * meer bestaat. `hasOwnProperty`, zodat een id als "constructor" niets vindt.
 */
export function huidigeModuletekst(ex: BladHerkomst, sjablonen: Record<string, string>): string | null {
  const id = ex.templateId;
  if (!id || !Object.prototype.hasOwnProperty.call(sjablonen, id)) return null;
  const tekst = sjablonen[id];
  return typeof tekst === "string" ? tekst : null;
}

/**
 * Rekent dit blad met een andere tekst dan de huidige module? Een blad zonder
 * bekende module is nooit verouderd: er is niets om naar bij te werken.
 *
 * Let op: ook een blad waarvan de gebruiker zelf de rekentekst heeft aangepast
 * wijkt af. Bijwerken zet die aanpassingen terug; het vergelijkingsscherm zegt
 * dat erbij en telt de regels die verschillen (regelverschil).
 */
export function isVerouderd(ex: BladHerkomst, sjablonen: Record<string, string>): boolean {
  const nieuw = huidigeModuletekst(ex, sjablonen);
  return nieuw !== null && !zelfdeRekentekst(ex.source, nieuw);
}

/** Aantal regels dat alleen in de oude (`weg`) of alleen in de nieuwe tekst (`bij`) staat. */
export function regelverschil(oud: string, nieuw: string): { weg: number; bij: number } {
  const tel = new Map<string, number>();
  for (const r of normaal(oud).split("\n")) tel.set(r, (tel.get(r) ?? 0) + 1);
  let bij = 0;
  for (const r of normaal(nieuw).split("\n")) {
    const n = tel.get(r) ?? 0;
    if (n > 0) tel.set(r, n - 1);
    else bij++;
  }
  let weg = 0;
  for (const n of tel.values()) weg += n;
  return { weg, bij };
}

// ── Invoer ──────────────────────────────────────────────────────────────────

/** Een invoerveld van een blad: een `?`-veld of een keuzelijst. */
export interface Invoerveld {
  naam: string;
  soort: "invoer" | "keuze";
  /** Waarmee het blad rekent zolang er niets is ingevuld: "0" of de eerste keuze. */
  beginwaarde: string;
  eenheid: string;
  /** Alleen bij een keuzelijst: tekst en waarde van elke keuze. */
  keuzes: { text: string; value: string }[];
}

function* knopen(lijst: AstNode[]): Generator<AstNode> {
  for (const n of lijst) {
    yield n;
    if (n.type === "conditional") {
      for (const tak of n.branches) yield* knopen(tak.body);
      yield* knopen(n.elseBody);
    } else if (n.type === "repeat") {
      yield* knopen(n.body);
    }
  }
}

/**
 * De invoervelden van een ingelezen blad, in de volgorde van het blad, ook die
 * binnen een #if of #repeat. Een naam die twee keer voorkomt telt één keer.
 */
export function invoervelden(ast: AstNode[]): Invoerveld[] {
  const uit: Invoerveld[] = [];
  const gezien = new Set<string>();
  for (const n of knopen(ast)) {
    if (n.type !== "input-prompt" && n.type !== "select") continue;
    if (gezien.has(n.name)) continue;
    gezien.add(n.name);
    if (n.type === "input-prompt") {
      uit.push({ naam: n.name, soort: "invoer", beginwaarde: n.defaultValue, eenheid: n.unit, keuzes: [] });
    } else {
      uit.push({
        naam: n.name,
        soort: "keuze",
        beginwaarde: n.options[0]?.value ?? "0",
        eenheid: "",
        keuzes: n.options.map((o) => ({ text: o.text, value: o.value })),
      });
    }
  }
  return uit;
}

/**
 * Een waarde van een veld zoals de gebruiker hem kent: bij een keuzelijst de
 * tekst van de keuze, anders het getal met de eenheid.
 */
export function veldTekst(veld: Invoerveld, waarde: string): string {
  if (veld.soort === "keuze") {
    const keuze = veld.keuzes.find((k) => k.value === waarde);
    return keuze ? keuze.text : waarde;
  }
  const getal = waarde.trim() === "" ? "0" : waarde.trim();
  return veld.eenheid ? `${getal} ${veld.eenheid}` : getal;
}

/** Een veld met de waarde die het blad ervoor heeft; `undefined` = niets ingevuld. */
export interface VeldMetWaarde {
  veld: Invoerveld;
  waarde: string | undefined;
}

export interface InvoerVergelijking {
  /** De invoer van het blad na bijwerken. */
  waarden: Record<string, string>;
  /** Velden die in beide teksten staan; hun waarde blijft. */
  behouden: string[];
  /** Velden die alleen in de oude tekst staan; hun waarde vervalt. */
  vervallen: VeldMetWaarde[];
  /**
   * Velden die alleen in de nieuwe tekst staan. Heeft het blad er al een
   * waarde voor (het parametrische beeld vult zijn standaardwaarden aan, ook
   * voor velden die de oude tekst nog niet kende), dan rekent het blad daarmee;
   * anders met de beginwaarde van het veld.
   */
  nieuw: VeldMetWaarde[];
}

/**
 * Welke invoer blijft, vervalt of nieuw is als een blad van `oud` naar `nieuw`
 * gaat.
 *
 * Alleen de waarden van velden die de oude tekst wél en de nieuwe niet meer
 * heeft vallen weg. Sleutels die in de oude tekst geen veld waren, blijven
 * staan: dat zijn instellingen van het parametrische beeld, en die gaan deze
 * vergelijking niet aan.
 */
export function vergelijkInvoer(
  waarden: Record<string, string>,
  oud: Invoerveld[],
  nieuw: Invoerveld[],
): InvoerVergelijking {
  const inNieuw = new Set(nieuw.map((v) => v.naam));
  const inOud = new Set(oud.map((v) => v.naam));
  const bekend = (naam: string) => Object.prototype.hasOwnProperty.call(waarden, naam);
  const vervallen = oud
    .filter((v) => !inNieuw.has(v.naam))
    .map((veld) => ({ veld, waarde: bekend(veld.naam) ? waarden[veld.naam] : undefined }));
  const weg = new Set(vervallen.map((v) => v.veld.naam));
  const na: Record<string, string> = {};
  for (const [naam, waarde] of Object.entries(waarden)) {
    if (!weg.has(naam)) na[naam] = waarde;
  }
  return {
    waarden: na,
    behouden: nieuw.filter((v) => inOud.has(v.naam)).map((v) => v.naam),
    vervallen,
    nieuw: nieuw
      .filter((v) => !inOud.has(v.naam))
      .map((veld) => ({ veld, waarde: bekend(veld.naam) ? waarden[veld.naam] : undefined })),
  };
}

/**
 * Valt er bij bijwerken ingevulde invoer weg: een veld dat vervalt en een
 * waarde had? Het vergelijkingsscherm klapt zo'n blad meteen open, zodat het
 * verlies niet achter "Details" blijft staan. Een leeg veld telt niet: dat
 * rekende al als 0.
 */
export function verliestInvoer(invoer: InvoerVergelijking): boolean {
  return invoer.vervallen.some(({ waarde }) => waarde !== undefined && waarde.trim() !== "");
}

// ── Uitkomst ────────────────────────────────────────────────────────────────

/**
 * Wat van een doorgerekend blad nodig is; BladUitkomst uit bladResultaat.ts
 * voldoet hieraan. `null` = het blad kon niet worden doorgerekend.
 */
export interface Uitkomst {
  resultaat: { uc: number | null; voldoet: boolean | null };
  getallen: Record<string, number>;
}

/** Een unity check: `UC`, `UC_M`, `uc_y`, … */
export const isUcNaam = (naam: string) => /^uc(?:$|_)/i.test(naam);

/**
 * Twee UC's zijn gelijk als ze op twee decimalen gelijk zijn, de precisie
 * waarmee de app en de afdruk ze tonen. Een verschil dat niemand kan zien, is
 * geen verschil om te melden.
 */
export function zelfdeUc(a: number | null | undefined, b: number | null | undefined): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return (a ?? null) === (b ?? null);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
  return Math.round(a * 100) === Math.round(b * 100);
}

export interface UcVerschil {
  naam: string;
  /** `null`: de UC staat niet (zichtbaar) in die tekst. */
  oud: number | null;
  nieuw: number | null;
}

export interface UitkomstVergelijking {
  /** De oude of nieuwe tekst rekende niet door. */
  oudMislukt: boolean;
  nieuwMislukt: boolean;
  ucOud: number | null;
  ucNieuw: number | null;
  ucVeranderd: boolean;
  oordeelOud: boolean | null;
  oordeelNieuw: boolean | null;
  oordeelVeranderd: boolean;
  /**
   * De UC-waarden die veranderen, in de volgorde van het blad; de maatgevende
   * UC (`UC_max`) staat er niet nog eens in.
   */
  ucVariabelen: UcVerschil[];
}

export function vergelijkUitkomst(oud: Uitkomst | null, nieuw: Uitkomst | null): UitkomstVergelijking {
  const ucOud = oud?.resultaat.uc ?? null;
  const ucNieuw = nieuw?.resultaat.uc ?? null;
  const oordeelOud = oud?.resultaat.voldoet ?? null;
  const oordeelNieuw = nieuw?.resultaat.voldoet ?? null;
  const a = oud?.getallen ?? {};
  const b = nieuw?.getallen ?? {};
  const namen = [...new Set([...Object.keys(b), ...Object.keys(a)])].filter(
    (n) => isUcNaam(n) && n !== "UC_max",
  );
  const ucVariabelen: UcVerschil[] = [];
  for (const naam of namen) {
    const o = naam in a ? a[naam] : null;
    const n = naam in b ? b[naam] : null;
    if (!zelfdeUc(o, n)) ucVariabelen.push({ naam, oud: o, nieuw: n });
  }
  return {
    oudMislukt: oud === null,
    nieuwMislukt: nieuw === null,
    ucOud,
    ucNieuw,
    ucVeranderd: !zelfdeUc(ucOud, ucNieuw),
    oordeelOud,
    oordeelNieuw,
    oordeelVeranderd: oordeelOud !== oordeelNieuw,
    ucVariabelen,
  };
}
