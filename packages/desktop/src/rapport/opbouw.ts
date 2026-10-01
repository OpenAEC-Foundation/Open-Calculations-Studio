/**
 * Sommen van de belastingopbouwen in 5.5 Blijvende belastingen.
 *
 * Twee soorten, zoals in de referentie:
 *   vlak  (vloeren, daken, wanden per m²): p = d × ρ, of de ingevulde p, som in kN/m²;
 *   gevel (lijnlast op een ligger):       q = p × h × vulling, som in kN/m¹.
 *
 * De som wordt niet afgerond; dat doet de afdruk met fmt(som, 2). Zo telt een
 * laag van 0,135 als 0,135 mee en niet als de 0,14 die in de tabel staat, net
 * als in de referentie (0,30 + 0,08 + 0,08 + 0,135 = 0,595 → 0,60).
 */
import type { Gevellaag, Laag } from "./model.ts";
import { fmt, getal } from "./normwaarden.ts";

export interface VlakRegel { naam: string; d: number | null; rho: number | null; p: number; }
export interface GevelRegel { naam: string; p: number; h: number; vulling: number; q: number; }

/** Een getal of null als het veld leeg of ongeldig is. */
function ingevuld(s: string): number | null {
  const v = getal(s);
  return Number.isFinite(v) ? v : null;
}

/**
 * Vlakopbouw. Een ingevulde p gaat voor d × ρ (voor lagen waarvan alleen het
 * gewicht per m² bekend is, of waar een vullingsgraad in zit). Een laag zonder
 * p en zonder volledige d en ρ telt als 0.
 */
export function vlakOpbouw(lagen: Laag[]): { regels: VlakRegel[]; som: number } {
  const regels = lagen.map((l): VlakRegel => {
    const d = ingevuld(l.d);
    const rho = ingevuld(l.rho);
    const direct = ingevuld(l.p);
    const p = direct ?? (d !== null && rho !== null ? d * rho : 0);
    return { naam: l.naam, d, rho, p };
  });
  return { regels, som: regels.reduce((s, r) => s + r.p, 0) };
}

/**
 * Vullingsgraad als factor: "90%" → 0,9. Zonder procentteken geldt een getal
 * boven 1 als percentage ("90" → 0,9) en anders als factor ("0,9" → 0,9).
 * Leeg of ongeldig → 1: een gevellaag zonder vulling loopt over de volle hoogte.
 */
export function leesVulling(s: string): number {
  const t = s.trim();
  if (t.endsWith("%")) {
    const v = getal(t.slice(0, -1));
    return Number.isFinite(v) ? v / 100 : 1;
  }
  const v = getal(t);
  if (!Number.isFinite(v)) return 1;
  return v > 1 ? v / 100 : v;
}

/** 0,9 → "90%"; 0,125 → "12,5%". */
export function vullingTekst(v: number): string {
  const s = fmt(v * 100, 1, true);
  return s === "" ? "" : `${s}%`;
}

/**
 * Gevelopbouw: q = p × h × vulling per laag. p en h zijn NaN als ze ontbreken
 * (de afdruk laat die cel leeg); q is dan 0 en telt niet mee.
 */
export function gevelOpbouw(lagen: Gevellaag[]): { regels: GevelRegel[]; som: number } {
  const regels = lagen.map((l): GevelRegel => {
    const p = getal(l.p);
    const h = getal(l.h);
    const vulling = leesVulling(l.vulling);
    const q = p * h * vulling;
    return { naam: l.naam, p, h, vulling, q: Number.isFinite(q) ? q : 0 };
  });
  return { regels, som: regels.reduce((s, r) => s + r.q, 0) };
}
