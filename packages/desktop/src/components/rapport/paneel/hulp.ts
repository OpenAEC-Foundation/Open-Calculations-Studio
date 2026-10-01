/**
 * Hulpfuncties van het rapportpaneel, zonder React.
 *
 * Los van de componenten, zodat scripts/check-rapportpaneel.mjs ze direct kan
 * laden. Daarom staan de imports hier mét `.ts`, net als in src/rapport/:
 * Node 24 laadt ze zo zonder bouwstap.
 */
import type { BureauProfiel } from "../../../rapport/model.ts";
import { fmt } from "../../../rapport/normwaarden.ts";
import { OPZET, type Knoop } from "../../../rapport/opzet.ts";
import type { Pad } from "../../../rapport/pad.ts";

/** Zoekt een knoop in de vaste opzet op id, diepte eerst. */
export function vindKnoop(id: string, lijst: readonly Knoop[] = OPZET): Knoop | undefined {
  for (const k of lijst) {
    if (k.id === id) return k;
    const dieper = k.kinderen ? vindKnoop(id, k.kinderen) : undefined;
    if (dieper) return dieper;
  }
  return undefined;
}

/**
 * De waarde op `pad`, of undefined als een tussenstap ontbreekt of geen object
 * is. De leestegenhanger van zetOpPad: een structurele wijziging (rij
 * toevoegen, verwijderen, verplaatsen) moet de lijst van dát moment hebben,
 * niet die van de laatste render.
 */
export function opPad(obj: unknown, pad: Pad): unknown {
  let hier: unknown = obj;
  for (const stap of pad) {
    if (hier === null || typeof hier !== "object") return undefined;
    hier = (hier as Record<string | number, unknown>)[stap];
  }
  return hier;
}

/**
 * Een kopie van `lijst` waarin element `i` één plek omhoog (-1) of omlaag (1)
 * staat. Aan de rand blijft alles staan. Het is altijd een nieuwe lijst, zodat
 * de store een wijziging ziet.
 */
export function verplaatst<T>(lijst: readonly T[], i: number, richting: -1 | 1): T[] {
  const uit = [...lijst];
  const j = i + richting;
  if (i < 0 || i >= uit.length || j < 0 || j >= uit.length) return uit;
  [uit[i], uit[j]] = [uit[j], uit[i]];
  return uit;
}

/** Een getal in Nederlandse notatie, of "—" als er (nog) geen getal is. */
export function getalTekst(v: number | null | undefined, dec: number, trim = false): string {
  return typeof v === "number" && Number.isFinite(v) ? fmt(v, dec, trim) : "—";
}

/** De eerste niet-lege regel van een tekst, ingekort voor in een keuzemenu. */
export function uittreksel(tekst: string, max = 80): string {
  const regel = tekst.split("\n").map((r) => r.trim()).find((r) => r !== "") ?? "";
  return regel.length > max ? `${regel.slice(0, max - 1)}…` : regel;
}

/** Letter van de i-de eigen bijlage: 0 → "B", 24 → "Z", 25 → "AA" (zelfde reeks als opzet.ts). */
export function bijlageLetter(index: number): string {
  let n = index + 1;
  let s = "";
  do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return s;
}

/** De eerste familie uit een CSS font-family: '"Segoe UI", Arial' → "Segoe UI". */
export function lettertypeNaam(fontFamily: string): string {
  return (fontFamily.split(",")[0] ?? "").replace(/["']/g, "").trim();
}

/** Adres, postcode en plaats op één regel; lege delen vallen weg. */
export function adresRegel(b: BureauProfiel): string {
  const plaats = [b.postcode, b.plaats].map((s) => s.trim()).filter((s) => s !== "").join(" ");
  return [b.adres.trim(), plaats].filter((s) => s !== "").join(", ");
}

const PROFIELVELDEN = [
  "naam",
  "adres",
  "postcode",
  "plaats",
  "telefoon",
  "email",
  "logo",
  "voetafbeelding",
] as const;
const STIJLVELDEN = ["hoofdkleur", "accentkleur", "tabeltekst", "invoerkleur", "lettertype"] as const;

/**
 * Zijn twee bureauprofielen inhoudelijk gelijk?
 *
 * Per veld en niet via JSON.stringify: de volgorde van de sleutels hangt af
 * van waar het object vandaan komt (projectbestand of instellingen), en de
 * afbeeldingen zijn data-URL's van honderden kilobytes die je niet bij elke
 * toetsaanslag wilt serialiseren. Een ongewijzigde afbeelding is dezelfde
 * string, en die vergelijking is direct klaar.
 */
export function zelfdeBureau(a: BureauProfiel, b: BureauProfiel): boolean {
  if (PROFIELVELDEN.some((v) => a[v] !== b[v])) return false;
  if (STIJLVELDEN.some((v) => a.huisstijl[v] !== b.huisstijl[v])) return false;
  if (a.constructeurs.length !== b.constructeurs.length) return false;
  return a.constructeurs.every((c, i) => {
    const d = b.constructeurs[i];
    return c.naam === d.naam && c.telefoon === d.telefoon && c.email === d.email;
  });
}
