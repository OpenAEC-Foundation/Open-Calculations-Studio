/**
 * Revisies van het rapport: de volgende code, de status en de datums op het
 * voorblad.
 *
 * De eerste revisie geeft de "1ᵉ datum rapport", de laatste bepaalt de
 * rapportstatus. Codes volgen wat het bureau gewend is: letters (A, B, … Z,
 * AA), cijfers (1, 2, …) of een combinatie (B2 → B3). De volgende code gaat
 * altijd uit van de laatste revisie in de lijst, niet van de hoogste: wie een
 * revisie tussenvoegt, heeft daar zelf voor gekozen.
 */
import type { Revisie, RevisieStatus } from "./model.ts";

/** A → B, Z → AA, AZ → BA; hoofd- en kleine letters blijven wat ze waren. */
function volgendeLetters(letters: string): string {
  const tekens = letters.split("");
  for (let i = tekens.length - 1; i >= 0; i--) {
    const t = tekens[i];
    if (t === "Z") { tekens[i] = "A"; continue; }
    if (t === "z") { tekens[i] = "a"; continue; }
    tekens[i] = String.fromCharCode(t.charCodeAt(0) + 1);
    return tekens.join("");
  }
  // Alles liep over (Z → AA, ZZ → AAA): er komt een letter vóór, in de kast van de eerste.
  const eerste = letters[0];
  return (eerste === eerste.toLowerCase() ? "a" : "A") + tekens.join("");
}

/** "A"→"B", "Z"→"AA", "3"→"4", "B2"→"B3"; lijst leeg → "A"; neemt de laatste revisie als basis. */
export function volgendeCode(revisies: Revisie[]): string {
  const laatste = laatsteRevisie(revisies);
  const code = laatste ? laatste.code.trim() : "";
  if (code === "") return "A";
  // Eindigt op cijfers: die ophogen, met behoud van voorloopnullen ("09" → "10", "007" → "008").
  const cijfers = /^(.*?)(\d+)$/.exec(code);
  if (cijfers) {
    const [, voor, getal] = cijfers;
    return voor + String(Number(getal) + 1).padStart(getal.length, "0");
  }
  const letters = /^(.*?)([A-Za-z]+)$/.exec(code);
  if (letters) {
    const [, voor, reeks] = letters;
    return voor + volgendeLetters(reeks);
  }
  // Eindigt op iets anders ("A." of "rev-"): een volgnummer erachter.
  return code + "1";
}

/** Status van de laatste revisie; "" als er geen is. */
export function rapportStatus(revisies: Revisie[]): RevisieStatus | "" {
  return laatsteRevisie(revisies)?.status ?? "";
}

/** Datum van de eerste revisie ("1ᵉ datum rapport"), of "". */
export function eersteDatum(revisies: Revisie[]): string {
  return revisies.length > 0 ? revisies[0].datum : "";
}

export function laatsteRevisie(revisies: Revisie[]): Revisie | undefined {
  return revisies.length > 0 ? revisies[revisies.length - 1] : undefined;
}

/** dd-mm-jjjj, in lokale tijd: de datum die de gebruiker op zijn klok ziet. */
export function datumTekst(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}
