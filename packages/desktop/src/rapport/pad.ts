/**
 * Onveranderlijk zetten van één waarde diep in het rapport.
 *
 * Het rapportpaneel heeft tientallen velden; in plaats van een actie per veld
 * geeft elk veld zijn plek als pad ("belastingen.wind.gebouwhoogte",
 * "uitgangspunten.materialen.2.soort") en zet de store de waarde daar. Alleen
 * de objecten en lijsten op het pad worden gekopieerd; de rest blijft gedeeld,
 * zodat React-selectors op ongewijzigde takken niet opnieuw renderen.
 */

export type Pad = (string | number)[];

/**
 * "belastingen.wind.gebouwhoogte" → ["belastingen","wind","gebouwhoogte"]; cijfers worden
 * indexen. Sleutels die zelf alleen uit cijfers bestaan kunnen dus niet via een tekstpad;
 * exemplaar-ids ("ex-…") en tekst-ids hebben daar geen last van.
 */
export function leesPad(pad: string): Pad {
  return pad
    .split(".")
    .filter((deel) => deel !== "")
    .map((deel) => (/^\d+$/.test(deel) ? Number(deel) : deel));
}

/** Nieuwe kopie met `waarde` op `pad`; tussenliggende objecten/lijsten worden gekopieerd. */
export function zetOpPad<T>(obj: T, pad: Pad, waarde: unknown): T {
  if (pad.length === 0) return waarde as T;
  const [kop, ...rest] = pad;
  if (typeof kop === "number") {
    // Een index: de lijst kopiëren, of een nieuwe beginnen als er nog niets staat.
    const lijst: unknown[] = Array.isArray(obj) ? obj.slice() : [];
    lijst[kop] = zetOpPad(lijst[kop], rest, waarde);
    return lijst as T;
  }
  const bron: Record<string, unknown> =
    obj !== null && typeof obj === "object" && !Array.isArray(obj) ? (obj as Record<string, unknown>) : {};
  return { ...bron, [kop]: zetOpPad(bron[kop], rest, waarde) } as T;
}
