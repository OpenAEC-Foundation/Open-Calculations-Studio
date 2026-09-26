/**
 * Normwaarden voor de hoofdstukken Uitgangspunten en Belastingen.
 *
 * Niets hiervan wordt opgeslagen: het rapport bewaart alleen de invoer (en de
 * projectgegevens bewaren CC, RC, ontwerplevensduur, windgebied en
 * terreincategorie), en bij het opmaken wordt alles hieruit afgeleid. Zo kan
 * een afgeleide waarde nooit uit de pas lopen met zijn bron.
 *
 * Alleen getallen en tabelnummers uit de normen; geen normtekst. Bronnen:
 *   NEN-EN 1990 + NB      tabel NB.1–2.1, B2, B3, B4, B5, NB.2–A1.1, NB.3, NB.4, NB.5
 *   NEN-EN 1991-1-1 + NB  tabel NB.1–6.2, NB.4–6.10
 *   NEN-EN 1991-1-3 + NB  s_k, C_e, C_t, μ₁ (formule 5.1)
 *   NEN-EN 1991-1-4 + NB  tabel NB.1, NB.3–4.1, formules 4.3 t/m 4.8
 *
 * Buiten deze map alleen ../store/projectGegevens.ts: dat bestand heeft zelf
 * geen imports, dus scripts/check-rapport.mjs kan alles rechtstreeks laden.
 */
import { belastingFactoren, kFiVoor } from "../store/projectGegevens.ts";

/** K_FI bij een gevolgklasse (tabel B3); hier doorgegeven zodat het rapport één bron heeft. */
export { kFiVoor };

// ── Getallen lezen en schrijven ─────────────────────────────────────────────

/** "0,56" → 0.56; "" of ongeldig → NaN. Invoer staat als tekst in het rapport. */
export function getal(s: string | undefined): number {
  if (s === undefined) return NaN;
  const t = s.trim().replace(/,/g, ".");
  return t === "" ? NaN : Number(t);
}

/**
 * Afronden zonder zwevendekommafout: rond(11.025, 2) === 11.03.
 *
 * 11,025 staat binair als 11,02499999…; `Math.round(11.025 * 100)` geeft dan
 * 1102. Via de exponent in de tekst ("11.025e2") rekent JavaScript met de
 * decimale waarde en komt er 1102,5 → 1103 uit. Vooraf gaat de ruis van het
 * optellen eraf (0,1 + 0,2 = 0,30000000000000004) door op 15 cijfers te
 * normaliseren. Halven gaan van nul af: −11,025 → −11,03.
 */
export function rond(v: number, dec: number): number {
  if (!Number.isFinite(v)) return v;
  const schoon = Number(Math.abs(v).toPrecision(15));
  const [m, e = "0"] = String(schoon).split("e");
  const heel = Math.round(Number(`${m}e${Number(e) + dec}`));
  const [m2, e2 = "0"] = String(heel).split("e");
  return Math.sign(v) * Number(`${m2}e${Number(e2) - dec}`);
}

/**
 * Nederlandse notatie; `dec` vaste decimalen; `trim` haalt nullen achteraan weg.
 * Geen getal (NaN, ontbrekende invoer) → "": de afdruk laat de cel dan leeg.
 */
export function fmt(v: number, dec: number, trim = false): string {
  if (!Number.isFinite(v)) return "";
  // `|| 0` maakt van −0 een gewone 0, anders staat er "-0,00".
  let s = (rond(v, dec) || 0).toFixed(dec);
  if (trim && s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s.replace(".", ",");
}

// ── Klassen (NEN-EN 1990) ───────────────────────────────────────────────────

export type Klasse = 1 | 2 | 3;

/** Een keuzeveld uit de projectgegevens ("1", "2", "3") als klasse; anders `standaard`. */
export function klasse(s: string | undefined, standaard: Klasse): Klasse {
  const n = getal(s);
  return n === 1 || n === 2 || n === 3 ? n : standaard;
}

/**
 * Ontwerplevensduurklasse volgens NB-tabel NB.1–2.1 (die vervangt tabel 2.1 voor
 * gebouwen): 5 → 1, 15 → 2, 50 → 3, 100 → 4. Tussenwaarden: de kleinste klasse
 * met jaren ≥ invoer (10 → 2, 25 → 3); boven 100 jaar blijft het klasse 4.
 */
export function levensduurklasse(jaren: number): number {
  if (!Number.isFinite(jaren) || jaren <= 0) return NaN;
  const GRENZEN: [number, number][] = [[5, 1], [15, 2], [50, 3], [100, 4]];
  for (const [grens, k] of GRENZEN) if (jaren <= grens) return k;
  return 4;
}

/** Betrouwbaarheidsindex β voor een referentieperiode van 50 jaar — tabel B2. */
export function beta(rc: Klasse): number {
  return rc === 1 ? 3.3 : rc === 3 ? 4.3 : 3.8;
}

/** Ontwerp- en berekeningssupervisie — tabel B4. */
export function ontwerpSupervisie(rc: Klasse): string {
  return `DSL${rc}`;
}

/** Inspectieniveau tijdens de uitvoering — tabel B5. */
export function inspectieniveau(rc: Klasse): string {
  return `IL${rc}`;
}

// ── 4.5 Belastingfactoren ───────────────────────────────────────────────────

export interface FactorRij {
  groep: string; naam: string;
  /** Opgemaakte cellen; `null` = de hele rij "niet van toepassing". */
  cellen: [string, string, string, string] | null;
  /** Opmerking rechts van de tabel (bijv. "niet gebruikt"). */
  opmerking?: string;
}

/**
 * 4.5 volgens NB.3, NB.4, NB.5 (via belastingFactoren(cc)); ψ als "ψ0"/"ψ1"/"ψ2" (de afdruk
 * zet het cijfer als subscript).
 *
 * Kolommen: γ_G,inf (gunstig), γ_G,sup (ongunstig), γ_Q,1 (overheersend),
 * γ_Q,i (overige). EQU (tabel NB.3) hangt niet van de gevolgklasse af; STR
 * 6.10a en 6.10b komen uit tabel NB.4 (CC2) en NB.5 (CC1, CC3). De tabel
 * rondt zelf af, dus bewust niet K_FI × de factoren van CC2 — zie
 * `belastingFactoren` in projectGegevens.ts. De buitengewone en de
 * bruikbaarheidscombinaties (tabel A1.4) hebben overal factor 1,0.
 */
export function belastingfactorTabel(cc: Klasse): FactorRij[] {
  const { gG, gQ, gGa } = belastingFactoren(cc);
  const g = (v: number) => fmt(v, 2);
  const q = (v: number) => fmt(v, 2, true);
  return [
    { groep: "A", naam: "EQU(6.10)", cellen: [g(0.9), g(1.1), q(1.5), `${q(1.5)}ψ0`] },
    { groep: "B", naam: "STR(6.10a)", cellen: [g(0.9), g(gGa), `${q(gQ)}ψ0`, `${q(gQ)}ψ0`] },
    { groep: "B", naam: "STR(6.10b)", cellen: [g(0.9), g(gG), q(gQ), `${q(gQ)}ψ0`] },
    { groep: "C", naam: "GEO(6.10)", cellen: null },
    { groep: "D", naam: "FAT", cellen: null },
    { groep: "F", naam: "HYD", cellen: null },
    { groep: "", naam: "Buitengewoon(6.11a/b)", cellen: ["1,00", "1,00", "1,0ψ1", "1,0ψ2"], opmerking: "niet gebruikt" },
    { groep: "", naam: "Karakteristiek(6.14b)", cellen: ["1,00", "1,00", "1,00", "1,0ψ0"] },
    { groep: "", naam: "Frequent(6.15b)", cellen: ["1,00", "1,00", "1,0ψ1", "1,0ψ2"] },
    { groep: "", naam: "Quasi-Blijvend(6.16b)", cellen: ["1,00", "1,00", "1,0ψ2", "1,0ψ2"] },
  ];
}

// ── 4.6 Bestaande situatie ──────────────────────────────────────────────────

/**
 * Voorschriften waaronder een bestaand gebouw vermoedelijk is ontworpen, per
 * jaar van invoering. Dezelfde opzoektabel als de referentie-spreadsheet; alleen
 * "TGB 1990" krijgt een spatie, net als de andere namen.
 */
export const BOUWJAAR_NORMEN: readonly (readonly [number, string])[] = [
  [1800, "-"],
  [1912, "GBV 1912"],
  [1918, "GBV 1918"],
  [1930, "GBV 1930"],
  [1940, "GBV 1940"],
  [1950, "GBV 1950"],
  [1962, "GBV 1962"],
  [1974, "VB 1974"],
  [1984, "VB 1984"],
  [1990, "TGB 1990"],
  [2012, "Eurocodes"],
];

/** Opzoektabel van de referentie; grootste jaartal ≤ bouwjaar. Geen bouwjaar → ""; vóór 1800 → "-". */
export function normVoorBouwjaar(jaar: number): string {
  if (!Number.isFinite(jaar)) return "";
  let norm = "-";
  for (const [vanaf, naam] of BOUWJAAR_NORMEN) if (jaar >= vanaf) norm = naam;
  return norm;
}

// ── 5.4 Opgelegde belastingen ───────────────────────────────────────────────

export interface Categorie {
  id: string; label: string;
  soort: "vloer" | "dak";
  /** kN/m²; bij daken de waarde voor een plat dak. */
  qk: number;
  /** kN */
  Qk: number;
  psi: [number, number, number];
}

// ψ0, ψ1, ψ2 per categorie — NEN-EN 1990 tabel NB.2–A1.1. Bij C geldt ψ0 = 0,6
// voor vluchtroutes en trappen (hier: omsloten verkeersruimte), anders 0,4.
const PSI_A: [number, number, number] = [0.4, 0.5, 0.3];
const PSI_B: [number, number, number] = [0.5, 0.5, 0.3];
const PSI_C: [number, number, number] = [0.4, 0.7, 0.6];
const PSI_C_VERKEER: [number, number, number] = [0.6, 0.7, 0.6];
const PSI_D: [number, number, number] = [0.4, 0.7, 0.6];
const PSI_H: [number, number, number] = [0, 0, 0];

/** NEN-EN 1991-1-1 NB (NB.1–6.2, NB.4–6.10) en NEN-EN 1990 NB (NB.2–A1.1). */
export const CATEGORIEEN: readonly Categorie[] = [
  { id: "A-vloer", label: "Categorie A: woon- en verblijfsruimtes", soort: "vloer", qk: 1.75, Qk: 3.0, psi: PSI_A },
  { id: "A-trap", label: "Categorie A: trappen", soort: "vloer", qk: 2.0, Qk: 3.0, psi: PSI_A },
  { id: "A-balkon", label: "Categorie A: balkons", soort: "vloer", qk: 2.5, Qk: 3.0, psi: PSI_A },
  { id: "A-gemeenschappelijk", label: "Categorie A: gemeenschappelijke ruimtes", soort: "vloer", qk: 3.0, Qk: 3.0, psi: PSI_A },
  { id: "B", label: "Categorie B: kantoorruimtes", soort: "vloer", qk: 2.5, Qk: 3.0, psi: PSI_B },
  { id: "B-verkeer", label: "Categorie B: omsloten verkeersruimte", soort: "vloer", qk: 3.0, Qk: 3.0, psi: PSI_B },
  { id: "C-verkeer", label: "Categorie C: omsloten verkeersruimte", soort: "vloer", qk: 5.0, Qk: 3.0, psi: PSI_C_VERKEER },
  { id: "C1", label: "Categorie C1: ruimtes met tafels", soort: "vloer", qk: 4.0, Qk: 3.0, psi: PSI_C },
  { id: "C2", label: "Categorie C2: ruimtes met vaste zitplaatsen", soort: "vloer", qk: 4.0, Qk: 7.0, psi: PSI_C },
  { id: "C3", label: "Categorie C3: ruimtes zonder obstakels", soort: "vloer", qk: 5.0, Qk: 7.0, psi: PSI_C },
  { id: "C4", label: "Categorie C4: ruimtes voor lichamelijke activiteiten", soort: "vloer", qk: 5.0, Qk: 7.0, psi: PSI_C },
  { id: "C5", label: "Categorie C5: ruimtes voor grote menigten", soort: "vloer", qk: 5.0, Qk: 7.0, psi: PSI_C },
  { id: "D-verkeer", label: "Categorie D: omsloten verkeersruimte", soort: "vloer", qk: 4.0, Qk: 7.0, psi: PSI_D },
  { id: "D1", label: "Categorie D1: detailhandel", soort: "vloer", qk: 4.0, Qk: 7.0, psi: PSI_D },
  { id: "D2", label: "Categorie D2: warenhuizen", soort: "vloer", qk: 4.0, Qk: 7.0, psi: PSI_D },
  { id: "H-dak", label: "Categorie H: daken", soort: "dak", qk: 1.0, Qk: 1.5, psi: PSI_H },
];

export function categorie(id: string): Categorie | undefined {
  return CATEGORIEEN.find((c) => c.id === id);
}

/**
 * q_k van een niet-toegankelijk dak bij dakhelling α (graden) — tabel NB.4–6.10:
 * α < 15° → 1,0; 15–20° → 4 − 0,2α; ≥ 20° → 0 (kN/m²). Geen helling → NaN.
 */
export function dakQk(alfaGraden: number): number {
  if (!Number.isFinite(alfaGraden)) return NaN;
  if (alfaGraden < 15) return 1.0;
  if (alfaGraden < 20) return 4 - 0.2 * alfaGraden;
  return 0;
}

/** Q_k voor elementen direct onder de dakbeschot (NB.4–6.10): 2,0 kN; anders 1,5 kN. */
export const DAK_QK_DIRECT = 2.0;

// ── 5.1 Sneeuw (NEN-EN 1991-1-3 + NB) ───────────────────────────────────────

/** s_k in heel Nederland, μ₁ voor een plat dak (0–30°), C_e en C_t. */
export const SNEEUW = { sk: 0.7, mu1: 0.8, ce: 1.0, ct: 1.0 } as const;

/** s = μ₁ · C_e · C_t · s_k (formule 5.1) = 0,56 kN/m² op een plat dak. */
export function sneeuwPlatDak(): number {
  return SNEEUW.mu1 * SNEEUW.ce * SNEEUW.ct * SNEEUW.sk;
}

// ── 5.2 Wind (NEN-EN 1991-1-4 + NB) ─────────────────────────────────────────

/** ψ0, ψ1, ψ2 voor wind — tabel NB.2–A1.1. */
export const PSI_WIND: [number, number, number] = [0, 0.2, 0];

export interface WindUitkomst { vb0: number; z0: number; zmin: number; ze: number; qp: number; }

// Codes zoals in de projectgegevens: windgebied 1..3 = I..III; terreincategorie
// 1 = 0 (zee/kust), 2 = II (onbebouwd), 3 = III (bebouwd).
const VB0: Record<Klasse, number> = { 1: 29.5, 2: 27.0, 3: 24.5 };          // tabel NB.1, m/s
const Z0: Record<Klasse, number> = { 1: 0.005, 2: 0.2, 3: 0.5 };            // tabel NB.3–4.1, m
const ZMIN: Record<Klasse, number> = { 1: 1, 2: 4, 3: 7 };                  // tabel NB.3–4.1, m
const TERREIN: Record<Klasse, string> = { 1: "kust", 2: "onbebouwd", 3: "bebouwd" };

/**
 * Zelfde keten als templates/gording.ts: projectgegevens-codes windgebied 1..3,
 * terreincategorie 1 (0/kust) 2 (II) 3 (III).
 *
 * c_dir = c_season = 1, c_o = 1 (vlak terrein), k_l = 1, ρ = 1,25 kg/m³:
 *   z_e = max(z; z_min)
 *   k_r = 0,19 · (z₀ / 0,05)^0,07              (4.5)
 *   v_m = k_r · ln(z_e / z₀) · v_b,0           (4.3, 4.4)
 *   I_v = 1 / ln(z_e / z₀)                     (4.7)
 *   q_p = (1 + 7 I_v) · ½ · ρ · v_m² / 1000    (4.8, kN/m²)
 * Geen hoogte (NaN) → q_p NaN.
 */
export function windQp(windgebied: Klasse, terrein: Klasse, zMeter: number): WindUitkomst {
  const vb0 = VB0[windgebied];
  const z0 = Z0[terrein];
  const zmin = ZMIN[terrein];
  const ze = Math.max(zMeter, zmin);
  const kr = 0.19 * Math.pow(z0 / 0.05, 0.07);
  const ln = Math.log(ze / z0);
  const vm = kr * ln * vb0;
  const iv = 1 / ln;
  const qp = ((1 + 7 * iv) * 0.5 * 1.25 * vm * vm) / 1000;
  return { vb0, z0, zmin, ze, qp };
}

/** "1 kust" / "2 onbebouwd" / "3 bebouwd": het label van 5.2. */
export function windLabel(windgebied: Klasse, terrein: Klasse): string {
  return `${windgebied} ${TERREIN[terrein]}`;
}
