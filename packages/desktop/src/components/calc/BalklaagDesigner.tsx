import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useProjectKFI, useProjectGetal, useActiefExemplaar, useAlleenLezen } from "../../store/actiefBlad";
import { JaNee } from "./designerKit";
import "./VoetplaatDesigner.css"; // hergebruik vd-* stijlen

/**
 * Losstaand parametrisch beeld van een balklaag (doorsnede): beschot op
 * houten balken, hart-op-hart afstand. Leest/schrijft dezelfde invoer als de
 * rekensheet (balklaag.ts) via het exemplaar in de projectstore; de unity
 * checks lopen live
 * mee (gespiegeld aan de template).
 */
const MARKER = "Balklaag";

interface Prof { name: string; b: number; h: number }
const PROFILES: Record<number, Prof> = {
  1: { name: "46×96", b: 46, h: 96 }, 2: { name: "46×146", b: 46, h: 146 },
  3: { name: "46×171", b: 46, h: 171 }, 4: { name: "46×196", b: 46, h: 196 },
  5: { name: "63×146", b: 63, h: 146 }, 6: { name: "63×171", b: 63, h: 171 },
  7: { name: "63×196", b: 63, h: 196 }, 8: { name: "63×221", b: 63, h: 221 },
  9: { name: "71×146", b: 71, h: 146 }, 10: { name: "71×171", b: 71, h: 171 },
  11: { name: "71×196", b: 71, h: 196 }, 12: { name: "71×221", b: 71, h: 221 },
  13: { name: "71×246", b: 71, h: 246 }, 14: { name: "71×271", b: 71, h: 271 },
  15: { name: "96×171", b: 96, h: 171 }, 16: { name: "96×196", b: 96, h: 196 },
  17: { name: "96×221", b: 96, h: 221 }, 18: { name: "96×246", b: 96, h: 246 },
  19: { name: "96×271", b: 96, h: 271 },
  // SLS — geschaafd naaldhout in Noord-Amerikaanse maatvoering (38 mm dik),
  // zoals dat in de houtskeletbouw wordt geleverd. De dubbele varianten zijn
  // twee stuks tegen elkaar.
  20: { name: "SLS 38×89", b: 38, h: 89 }, 21: { name: "SLS 38×140", b: 38, h: 140 },
  22: { name: "SLS 38×184", b: 38, h: 184 }, 23: { name: "SLS 38×235", b: 38, h: 235 },
  24: { name: "SLS 38×285", b: 38, h: 285 },
  25: { name: "SLS dubbel 76×184", b: 76, h: 184 },
  26: { name: "SLS dubbel 76×235", b: 76, h: 235 },
  27: { name: "SLS dubbel 76×285", b: 76, h: 285 },
};

interface Mat { name: string; fmk: number; fvk: number; E: number; rho: number; gM: number }
const MATS: Record<number, Mat> = {
  1: { name: "C18", fmk: 18, fvk: 3.4, E: 9000, rho: 380, gM: 1.30 },
  2: { name: "C24", fmk: 24, fvk: 4.0, E: 11000, rho: 420, gM: 1.30 },
  3: { name: "C30", fmk: 30, fvk: 4.0, E: 12000, rho: 460, gM: 1.30 },
  4: { name: "GL24h", fmk: 24, fvk: 3.5, E: 11500, rho: 420, gM: 1.25 },
  5: { name: "GL28h", fmk: 28, fvk: 3.5, E: 12600, rho: 425, gM: 1.25 },
};
const DUUR: { v: number; label: string }[] = [
  { v: 1, label: "Kort" }, { v: 2, label: "Middellang" }, { v: 3, label: "Lang" }, { v: 4, label: "Blijvend" },
];
/**
 * Klimaatklassen volgens EN 1995-1-1 §2.3.1.3. De klasse bepaalt k_mod
 * (Tabel 3.1) en k_def (Tabel 3.2) en dus zowel de sterkte als de kruip —
 * vandaar de omschrijving erbij in plaats van alleen een nummer.
 */
const KLIM: { v: number; label: string; uitleg: string }[] = [
  {
    v: 1,
    label: "1 — verwarmd binnen",
    uitleg:
      "Klimaatklasse 1 — houtvochtgehalte horend bij 20 °C en een relatieve luchtvochtigheid die slechts enkele weken per jaar boven 65 % komt. Gemiddeld vochtgehalte ten hoogste 12 %. Typisch: verwarmde, gesloten binnenruimten.",
  },
  {
    v: 2,
    label: "2 — overdekt, onverwarmd",
    uitleg:
      "Klimaatklasse 2 — 20 °C met een relatieve luchtvochtigheid die slechts enkele weken per jaar boven 85 % komt. Gemiddeld vochtgehalte ten hoogste 20 %. Typisch: overdekt maar open of onverwarmd — carport, geventileerde kruipruimte, onverwarmde zolder.",
  },
  {
    v: 3,
    label: "3 — buiten / vochtig",
    uitleg:
      "Klimaatklasse 3 — omstandigheden die tot een hoger vochtgehalte leiden dan klasse 2. Typisch: onbeschermd buiten of blijvend vochtige ruimten. Geeft de laagste k_mod en de hoogste kruipfactor.",
  },
];
/**
 * ψ-factoren uit NEN-EN 1990 Tabel NB.2 — A1.1, gelijk aan de tabel in
 * `templates/balklaag.ts`. Beeld en rekensheet moeten dezelfde waarden
 * gebruiken, anders wijst het paneel een andere UC aan dan de uitwerking.
 */
const CAT: { v: number; label: string; psi0: number; psi1: number; psi2: number }[] = [
  { v: 1, label: "A — woon- en verblijfsruimtes", psi0: 0.4, psi1: 0.5, psi2: 0.3 },
  { v: 2, label: "B — kantoorruimtes", psi0: 0.5, psi1: 0.5, psi2: 0.3 },
  { v: 3, label: "C — bijeenkomstruimtes", psi0: 0.4, psi1: 0.7, psi2: 0.6 },
  { v: 4, label: "D — winkelruimtes", psi0: 0.4, psi1: 0.7, psi2: 0.6 },
  { v: 5, label: "E — opslagruimtes", psi0: 1.0, psi1: 0.9, psi2: 0.8 },
  { v: 6, label: "F — verkeersruimte, voertuig ≤ 25 kN", psi0: 0.7, psi1: 0.7, psi2: 0.6 },
  { v: 7, label: "G — verkeersruimte, 25 < voertuig ≤ 160 kN", psi0: 0.7, psi1: 0.5, psi2: 0.3 },
  { v: 8, label: "H — daken", psi0: 0, psi1: 0, psi2: 0 },
  { v: 9, label: "Sneeuwbelasting", psi0: 0, psi1: 0.2, psi2: 0 },
  { v: 10, label: "Windbelasting", psi0: 0, psi1: 0.2, psi2: 0 },
  { v: 11, label: "Zelf invullen", psi0: 0.5, psi1: 0.5, psi2: 0.3 },
];
/**
 * De statische schema's. De coëfficiënten in `toets()` volgen deze nummering,
 * en `templates/balklaag.ts` gebruikt dezelfde — beeld en uitwerking moeten
 * hetzelfde schema doorrekenen.
 */
const SCHEMA: { v: number; label: string }[] = [
  { v: 1, label: "Enkelvoudig, op twee steunpunten" },
  { v: 2, label: "Met overstek aan één zijde" },
  { v: 3, label: "Op drie steunpunten (twee velden)" },
  { v: 4, label: "Raveelbalk langs een sparing" },
];
const GRENS: { v: number; label: string }[] = [
  { v: 0.004, label: "0,004 × L" }, { v: 0.003, label: "0,003 × L" }, { v: 0.002, label: "0,002 × L" },
];


/**
 * Alles wat de toetsing nodig heeft, als één object. Los van de React-state,
 * zodat dezelfde berekening ook op een ánder profiel losgelaten kan worden —
 * dat is precies wat de ontwerpknop doet.
 */
interface Invoer {
  prof: Prof;
  mat: Mat;
  /** 1 enkelvoudig, 2 overstek, 3 drie steunpunten, 4 raveelbalk. */
  schema: number;
  aOver: number;
  LVeld2: number;
  bSparing: number;
  lStaart: number;
  duur: number;
  klim: number;
  /** Eigen gewicht volgens de referentie-uitwerking in plaats van EN 338. */
  xc: boolean;
  kfi: number;
  Ld: number;
  aOpl: number;
  hoh: number;
  tVloer: number;
  eBeschot: number;
  bVloer: number;
  gk: number;
  qk: number;
  Qk: number;
  psi2: number;
  controleer: number;
  grens: number;
  tril: number;
  zeta: number;
  aTril: number;
  bTril: number;
}

/**
 * De toetsing van één balklaag, gespiegeld aan `templates/balklaag.ts`.
 *
 * Zuivere functie: het paneel roept hem aan voor het gekozen profiel, de
 * ontwerpknop voor elk kandidaat-profiel. Eén bron voor de formules — een
 * tweede kopie zou vroeg of laat van de rekensheet af gaan wijken.
 */
function toets(inv: Invoer) {
  const {
    prof, mat, duur, klim, xc, kfi, Ld, aOpl, hoh, tVloer, eBeschot, bVloer,
    gk, qk, Qk, psi2, controleer, grens, tril, zeta, aTril, bTril,
    schema, aOver, LVeld2, bSparing, lStaart,
  } = inv;
  const { b, h } = prof;
  // ── doorsnede + checks (gespiegeld aan balklaag.ts), in N en mm ──────────
  const A = b * h, Iy = (b * h ** 3) / 12, Wy = (b * h ** 2) / 6, Sy = (b * h ** 2) / 8;
  const kmod12 = duur === 1 ? 0.9 : duur === 2 ? 0.8 : duur === 3 ? 0.7 : 0.6;
  const kmod3 = duur === 1 ? 0.7 : duur === 2 ? 0.65 : duur === 3 ? 0.55 : 0.5;
  const kmod = klim === 3 ? kmod3 : kmod12;
  const kdef = klim === 1 ? 0.6 : klim === 2 ? 0.8 : 2.0;
  const fmd = (kmod * mat.fmk) / mat.gM, fvd = (kmod * mat.fvk) / mat.gM;
  // Bij een raveelbalk is de overspanning de breedte van de sparing.
  const Lth = schema === 4 ? bSparing + aOpl : Ld + aOpl;
  const qkEff = qk;
  const gBalk = xc ? (A * 1e-6 * 550 * 10) / 1000 : (A * 1e-6 * mat.rho * 9.81) / 1000; // kN/m
  // En de belaste breedte niet de hart-op-hart afstand maar de halve
  // staartlengte: elke onderbroken balk zet zijn oplegreactie op de raveelbalk af.
  const bBelast = schema === 4 ? lStaart / 2 : hoh;
  const Pg = (bBelast / 1000) * gk + gBalk; // kN/m = N/mm
  const qq = (bBelast / 1000) * qkEff; // N/mm

  /*
   * Coefficienten van het statische schema, gelijk aan die in balklaag.ts.
   * Elk veld is een overspanning met een inklemmend eindmoment; daarmee
   * volstaat één stel coefficienten voor alle schema's:
   *   M_veld = cM*q   M_steun = cMs*q   V = cV*q   u = cu*q/EI
   * Nagerekend tegen een onafhankelijke numerieke balkberekening.
   */
  // Buigstijfheid van de balk zelf. Niet EIb noemen: de trillingstoets verderop
  // gebruikt die naam al voor de stijfheid per meter vloerbreedte.
  const EIbalk = mat.E * Iy;
  let cM = (Lth * Lth) / 8;
  let cMs = 0;
  let cV = Lth / 2;
  let cU = (5 * Lth ** 4) / 384;
  let cUe = 0; // zakking x EI van het uiteinde van een overstek
  if (schema === 2) {
    const cR = (Lth * Lth - aOver * aOver) / (2 * Lth);
    cMs = (aOver * aOver) / 2;
    cM = cR > 0 ? (cR * cR) / 2 : 0;
    cV = Math.max(cR, aOver, Lth - cR);
    cU = Math.max(1.04 * ((5 * Lth ** 4) / 384 - (cMs * Lth * Lth) / 16), 0);
    // Negatief betekent dat het uiteinde omhoog komt: bij een kort overstek
    // kantelt de ligger over de tweede oplegging.
    cUe = (aOver / 24) * (4 * aOver * aOver * Lth + 3 * aOver ** 3 - Lth ** 3);
  } else if (schema === 3 && LVeld2 > 0) {
    cMs = (Lth ** 3 + LVeld2 ** 3) / (8 * (Lth + LVeld2));
    const cRa = Lth / 2 - cMs / Lth;
    const cRb = LVeld2 / 2 - cMs / LVeld2;
    cM = Math.max(cRa * cRa, cRb * cRb) / 2;
    cV = Math.max(Lth - cRa, LVeld2 - cRb, cRa, cRb);
    const ua = (5 * Lth ** 4) / 384 - (cMs * Lth * Lth) / 16;
    const ub = (5 * LVeld2 ** 4) / 384 - (cMs * LVeld2 * LVeld2) / 16;
    cU = Math.max(1.04 * Math.max(ua, ub), 0);
  }

  const ug = (cU * Pg) / EIbalk;
  const uq = (cU * qq) / EIbalk;
  const ueG = (cUe * Pg) / EIbalk;
  const ueQ = (cUe * qq) / EIbalk;
  // Concentratiefactor: derde term = (EI)_l/EI_ref met (EI)_l = E_beschot·t³/12
  // per mm plaatbreedte. De E-modulus van het beschot is nu invoer, zodat een
  // stijver of slapper beschot ook echt doorwerkt.
  // Bij een raveelbalk staat de last rechtstreeks op de balk; er is dan geen
  // balklaag waarover hij zich verdeelt.
  const kr = schema === 4
    ? 1
    : Math.min(1, 0.37 + (0.8 * hoh) / 1000 - (eBeschot * tVloer ** 3) / 12 / 50000000);
  const FQ = Qk * kr; // kN
  // De puntlast wordt op twee plaatsen beschouwd — midden in het veld en, bij
  // een overstek, op het uiteinde. Ze kunnen niet tegelijk optreden, dus per
  // grootheid telt de ongunstigste van de twee.
  const uQveld = (1 / 48) * (FQ * 1000 * Lth ** 3) / EIbalk;
  const uQeind = schema === 2
    ? (FQ * 1000 * aOver * aOver * (Lth + aOver)) / (3 * EIbalk)
    : 0;
  const uQ = Math.max(uQveld, uQeind);
  const uvar = Math.max(uq, uQ);
  const wfin0 = (1 + kdef) * ug + (1 + psi2 * kdef) * uvar;
  // Het uiteinde van een overstek zakt anders dan het veld; beide worden
  // getoetst en de grootste telt.
  const wfinEind = (1 + kdef) * Math.abs(ueG) + (1 + psi2 * kdef) * Math.abs(ueQ);
  const wfin = Math.max(wfin0, schema === 2 ? wfinEind : 0);
  const wlim = grens * Lth;
  const ucDoor = wfin / wlim;

  // De doorsnede is prismatisch, dus alleen de grootte telt: veld of steun,
  // welke van de twee groter is.
  const Mg = Math.max(cM, cMs) * Pg, Mq = Math.max(cM, cMs) * qq; // N·mm
  const MQ = Math.max((FQ * 1000 * Lth) / 4, schema === 2 ? FQ * 1000 * aOver : 0);
  const Vg = cV * Pg, Vq = cV * qq, VQ = FQ * 1000; // N
  const MyEd = kfi * Math.max(1.2 * Mg + 1.5 * Mq, 1.2 * Mg + 1.5 * MQ);
  const VzEd = kfi * Math.max(1.2 * Vg + 1.5 * Vq, 1.2 * Vg + 1.5 * VQ);
  const ucBuig = MyEd / Wy / fmd;
  const ucAfsch = (VzEd * Sy) / (b * Iy) / fvd;
  // ── trillingen §7.3.3 — in SI: N, m, kg ───────────────────────────────────
  const Lm = Lth / 1000;                                  // overspanning [m]
  const EIb = (mat.E * 1e6 * (Iy * 1e-12)) / (hoh / 1000); // (EI)_b [Nm²/m]
  const EIl = (eBeschot * 1e6 * (1 * (tVloer / 1000) ** 3)) / 12; // (EI)_l [Nm²/m]
  const mOpp = (gk + gBalk / (hoh / 1000)) * 1000 / 9.81;  // massa [kg/m²], permanent
  const f1 = (Math.PI / (2 * Lm ** 2)) * Math.sqrt(EIb / mOpp);
  // Criterium 1 — stijfheid onder 1 kN (7.3): w/F ≤ a
  const wPerKN = ((1000 * kr) * Lth ** 3) / (48 * mat.E * Iy); // mm per kN
  const ucTrilA = wPerKN / aTril;
  // Criterium 2 — responssnelheid (7.4/7.6/7.7)
  const n40 = Math.pow(Math.max(0, (40 / f1) ** 2 - 1) * (bVloer / Lm) ** 4 * (EIl / EIb), 0.25);
  const vResp = (4 * (0.4 + 0.6 * n40)) / (mOpp * bVloer * Lm + 200);
  const vLim = Math.pow(bTril, f1 * zeta - 1);
  const ucTrilV = vResp / vLim;
  const ucTril = Math.max(ucTrilA, ucTrilV);

  const ucs = [ucBuig, ucAfsch];
  if (controleer === 1) ucs.push(ucDoor);
  if (tril === 1) ucs.push(ucTril);
  const ucMax = Math.max(...ucs);
  const ok = ucMax <= 1.0;
  return {
    schema, aOver, LVeld2, bSparing, lStaart, cM, cMs, cV, cU,
    b, h, A, Iy, Wy, Sy, kmod, kdef, fmd, fvd, Lth, gBalk, Pg, qq, kr, FQ,
    ug, uq, uQ, uvar, wfin, wlim, ucDoor,
    MyEd, VzEd, ucBuig, ucAfsch,
    f1, wPerKN, ucTrilA, n40, vResp, vLim, ucTrilV, ucTril,
    ucMax, ok,
  };
}

/**
 * Het eerste profiel uit de keuzelijst dat op alle ingeschakelde toetsen
 * voldoet, of `null` als geen enkel profiel het haalt.
 *
 * "Eerste" is de volgorde van de lijst zelf. Die loopt per reeks van klein
 * naar groot, dus het eerste passende profiel is ook het lichtste dat het
 * redt — en de gebruiker ziet dezelfde volgorde in de keuzelijst terug.
 */
function eerstePassendProfiel(inv: Invoer): number | null {
  const ids = Object.keys(PROFILES).map(Number).sort((a, b) => a - b);
  for (const id of ids) {
    if (toets({ ...inv, prof: PROFILES[id] }).ok) return id;
  }
  return null;
}

/**
 * Scharnier links, rol rechts — klein weergegeven, om onder een diagram te
 * zetten. Zonder die twee is uit een M- of V-lijn niet af te lezen waar de
 * ligger wordt ondersteund, en dus ook niet waarom de lijn daar nul is.
 */
function Steunpunten({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  const g = 7;
  return (
    <g style={{ stroke: "#6b7280", strokeWidth: 1, fill: "none" }}>
      <polygon points={`${x1},${y} ${x1 - g},${y + 2 * g} ${x1 + g},${y + 2 * g}`} />
      <line x1={x1 - g - 3} y1={y + 2 * g} x2={x1 + g + 3} y2={y + 2 * g} />
      <polygon points={`${x2},${y} ${x2 - g},${y + 1.6 * g} ${x2 + g},${y + 1.6 * g}`} />
      <circle cx={x2 - 3.5} cy={y + 1.6 * g + 2.6} r={2.4} />
      <circle cx={x2 + 3.5} cy={y + 1.6 * g + 2.6} r={2.4} />
      <line x1={x2 - g - 3} y1={y + 1.6 * g + 5.6} x2={x2 + g + 3} y2={y + 1.6 * g + 5.6} />
    </g>
  );
}

/*
 * Vaste kleuren per lastsoort. Permanent en veranderlijk gaan met verschillende
 * partiële factoren de combinatie in (1,20 tegen 1,50) en horen in de quasi-
 * blijvende combinatie verschillend mee te tellen; één kleur voor de som maakt
 * uit de tekening niet meer op te maken wélk deel dat is.
 */
const KLEUR_G = "#475569"; // permanent
const KLEUR_Q = "#B45309"; // veranderlijk, verdeeld
const KLEUR_F = "#B91C1C"; // veranderlijk, geconcentreerd

/** Band met neerwaartse pijlen voor een verdeelde last: basislijn op `yTop`,
 *  pijlpunten op `yTip`. */
function Verdeellast({
  x1,
  x2,
  yTop,
  yTip,
  kleur,
}: {
  x1: number;
  x2: number;
  yTop: number;
  yTip: number;
  kleur: string;
}) {
  const n = Math.max(4, Math.round((x2 - x1) / 30));
  const stap = (x2 - x1) / n;
  return (
    <g>
      <line x1={x1} y1={yTop} x2={x2} y2={yTop} style={{ stroke: kleur, strokeWidth: 1.6 }} />
      {Array.from({ length: n + 1 }, (_, i) => {
        const px = x1 + i * stap;
        return (
          <g key={i}>
            <line x1={px} y1={yTop} x2={px} y2={yTip - 4} style={{ stroke: kleur, strokeWidth: 1.1 }} />
            <polygon
              points={`${px},${yTip} ${px - 3.2},${yTip - 7} ${px + 3.2},${yTip - 7}`}
              style={{ fill: kleur }}
            />
          </g>
        );
      })}
    </g>
  );
}

/**
 * Eén unity check in de voetregel, gekleurd naar de uitkomst. Een rij grijze
 * getallen dwingt je ze allemaal te lezen om te zien welke knelt; met kleur
 * springt de maatgevende er meteen uit.
 */
function UcChip({ naam, uc, extra }: { naam: string; uc: number; extra?: string }) {
  const staat = uc > 1 ? "bad" : uc > 0.9 ? "warn" : "ok";
  return (
    <span className={`vd-uc-chip ${staat}`}>
      {naam} {uc.toFixed(2)}
      {extra ? ` (${extra})` : ""}
    </span>
  );
}

/**
 * Eén bron van waarheid voor de invoer-defaults. Wordt zowel gebruikt om de
 * controls te tonen (via num()) als om de gedeelde store te seeden, zodat de
 * evaluator (rekensheet) en de designer nooit op verschillende defaults
 * uitkomen. Zonder seed valt de evaluator terug op de eerste @select-optie en
 * '0' voor `?`-velden — die wijken af van wat het beeld toont.
 */
const DEFAULTS: Record<string, number> = {
  profiel: 10, sterkteklasse: 2, duurklasse: 2, klimaat: 1,
  schema: 1, a_over: 800, L_veld2: 3000, b_sparing: 2400, l_staart: 1800,
  L_d: 5000, a_opl: 50, hoh: 450, t_vloer: 25,
  E_beschot: 7000, b_vloer: 5,
  G_k: 0.5, Q_k: 2.55, F_k: 2, belastingcat: 1,
  "ψ_0_zelf": 0.5, "ψ_2_zelf": 0.3, controleer: 1, grensfactor: 0.004,
  controleer_trilling: 1, "ζ": 0.01, a_tril: 1.0, b_tril: 120,
};

export default function BalklaagDesigner() {
  // Invoer hoort bij het exemplaar dat openstaat: twee bladen van dezelfde
  // module delen niets, ook al gebruiken ze dezelfde variabelenamen.
  // Welk blad getekend wordt: normaal het actieve, in de afdruk het blad dat de
  // context aanwijst. `alleenLezen` houdt daar het schrijven tegen.
  const exemplaar = useActiefExemplaar();
  const alleenLezen = useAlleenLezen();
  const activeId = alleenLezen ? "" : (exemplaar?.id ?? "");
  const zetWaarde = useProjectStore((s) => s.zetWaarde);
  const seedWaarden = useProjectStore((s) => s.seedWaarden);
  const source = exemplaar?.source ?? "";
  const zetBladWaarde = useCallback(
    (naam: string, waarde: string) => zetWaarde(activeId, naam, waarde),
    [activeId, zetWaarde],
  );
  const seedBladWaarden = useCallback(
    (defaults: Record<string, string>) => seedWaarden(activeId, defaults),
    [activeId, seedWaarden],
  );
  const [editing, setEditing] = useState<string | null>(null);
  // Uitkomst van de ontwerpknop. De handtekening is een vingerafdruk van de
  // invoer waarop gezocht is — het profiel zit er bewust NIET in, want dat
  // verandert de knop zelf. Wijzigt de gebruiker daarna iets anders, dan klopt
  // de melding niet meer en verdwijnt hij vanzelf.
  const [ontwerp, setOntwerp] = useState<{ sig: string; tekst: string } | null>(null);

  // Meet het beschikbare tekengebied zodat het beeld meegroeit met het paneel.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 620, h: 360 });

  // Push the displayed defaults into the shared store on open / case switch, so
  // the rekensheet evaluates with the same inputs the picture shows. Only fills
  // missing keys — user-set values are never overwritten.
  const isBalklaag = source.includes(MARKER);
  useEffect(() => {
    if (!isBalklaag) return;
    const seed: Record<string, string> = {};
    for (const [k, v] of Object.entries(DEFAULTS)) seed[k] = String(v);
    seedBladWaarden(seed);
  }, [isBalklaag, activeId, seedBladWaarden]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      const w = Math.max(220, Math.floor(r.width));
      const h = Math.max(200, Math.floor(r.height));
      // Alleen bijwerken bij een merkbaar verschil. Het beeld schaalt op deze
      // maat, dus een verandering van één pixel zou een nieuwe meting kunnen
      // uitlokken en het beeld aan het trillen brengen.
      setBox((vorige) =>
        Math.abs(vorige.w - w) > 2 || Math.abs(vorige.h - h) > 2 ? { w, h } : vorige,
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isBalklaag]);

  // Projectwaarden: hooks, dus ze moeten vóór de vroege return staan. Anders
  // roept deze component in de ene render meer hooks aan dan in de andere en
  // klapt React eruit zodra het paneel van blad wisselt.
  const kfi = useProjectKFI();
  const xc = Math.round(useProjectGetal("rekenwijze", 1)) === 1;

  if (!isBalklaag) return null;

  const vals = exemplaar?.waarden ?? {};
  const num = (name: string, def: number): number => {
    const raw = vals[name];
    if (raw === undefined || raw === "") return def;
    const n = parseFloat(String(raw).replace(",", "."));
    return Number.isFinite(n) ? n : def;
  };
  const setVal = (name: string, value: number) => zetBladWaarde(name, String(value));

  // ── invoer (defaults uit gedeelde DEFAULTS-bron, zie boven) ───────────────
  const d = (name: string) => num(name, DEFAULTS[name]);
  const profId = Math.round(d("profiel"));
  const prof = PROFILES[profId] ?? PROFILES[DEFAULTS.profiel];
  const matId = Math.round(d("sterkteklasse"));
  const mat = MATS[matId] ?? MATS[DEFAULTS.sterkteklasse];
  const duur = Math.round(d("duurklasse"));
  const klim = Math.round(d("klimaat"));
  // Het eigen gewicht is een splitspunt: De referentie-uitwerking rekent 550 kg/m³ met g = 10,
  // de norm ρ_mean uit EN 338 met g = 9,81. Die keuze staat in de
  // projectgegevens en niet in dit paneel — het blad leest hem daar ook.
  const schema = Math.round(d("schema"));
  const aOver = d("a_over");
  const LVeld2 = d("L_veld2");
  const bSparing = d("b_sparing");
  const lStaart = d("l_staart");
  const Ld = d("L_d");
  const aOpl = d("a_opl");
  const hoh = d("hoh");
  const tVloer = d("t_vloer");
  const eBeschot = d("E_beschot");
  const bVloer = d("b_vloer");
  const gk = d("G_k");
  const qk = d("Q_k");
  const Qk = d("F_k");
  const cat = Math.round(d("belastingcat"));
  const tril = Math.round(d("controleer_trilling"));
  const zeta = d("ζ");
  const aTril = d("a_tril");
  const bTril = d("b_tril");
  const psi0zelf = d("ψ_0_zelf");
  const psi2zelf = d("ψ_2_zelf");
  const catRij = CAT.find((c) => c.v === cat) ?? CAT[1];
  const psi2 = cat === 11 ? psi2zelf : catRij.psi2;
  const controleer = Math.round(d("controleer"));
  const grens = d("grensfactor");

  const inv: Invoer = {
    prof, mat, duur, klim, xc, kfi, Ld, aOpl, hoh, tVloer, eBeschot, bVloer,
    gk, qk, Qk, psi2, controleer, grens, tril, zeta, aTril, bTril,
    schema, aOver, LVeld2, bSparing, lStaart,
  };
  const {
    b, h, Lth, Pg, qq, kr, ug, uvar, wfin, wlim, ucDoor,
    MyEd, VzEd, ucBuig, ucAfsch, f1, ucTril, ucMax, ok,
  } = toets(inv);

  // Alles waarop de ontwerpzoektocht gebaseerd was, behalve het profiel.
  const ontwerpSig = JSON.stringify([
    Ld, aOpl, hoh, tVloer, eBeschot, bVloer, gk, qk, Qk, matId, duur, klim,
    cat, psi2, controleer, grens, tril, zeta, aTril, bTril, xc, kfi,
  ]);
  const ontwerpMelding = ontwerp && ontwerp.sig === ontwerpSig ? ontwerp.tekst : null;
  const kiesEerstePassend = () => {
    const id = eerstePassendProfiel(inv);
    if (id === null) {
      setOntwerp({
        sig: ontwerpSig,
        tekst: "Geen enkel profiel uit de lijst voldoet. Verklein de h.o.h. afstand of de overspanning, of kies een hogere sterkteklasse.",
      });
      return;
    }
    setVal("profiel", id);
    setOntwerp({
      sig: ontwerpSig,
      tekst:
        id === profId
          ? `${PROFILES[id].name} voldoet al — lichter kan niet binnen deze lijst.`
          : `${PROFILES[id].name} gekozen: het eerste profiel dat op alle toetsen voldoet.`,
    });
  };

  // ── doorsnede-tekening — vult het gemeten tekengebied, gecentreerd ─────────
  // Eén uniforme fit-schaal: het beeld groeit/krimpt evenredig mee met het
  // paneel en blijft dimensioneel correct (x = y).
  const capH = 26;                                 // ruimte voor het onderschrift boven de stage
  const nJ = 4;
  const schemaH = 150;                             // vaste hoogte voor het statisch schema
  const mvH = 150;                                 // idem voor de M- en V-lijn
  const uH = 130;                                  // en voor de doorbuigingslijn
  const W = box.w;
  // De doorsnede krijgt wat overblijft nadat schema en M/V-lijn hun deel hebben.
  const legH = 30;                                 // legenda onder het statisch schema
  // 3 × 14 px tussenruimte tussen de vier tekeningen (`gap` op .vd-canvases).
  const gapH = 3 * 14;
  const H = Math.max(130, box.h - 4 * capH - schemaH - mvH - uH - legH - gapH);
  const mX = 46, mTop = 26, mBot = 48;             // marges (px)
  const totalMM = (nJ - 1) * hoh + b;              // breedte van de balken-groep
  const availW = W - 2 * mX, availH = H - mTop - mBot;
  // grootste schaal die zowel de breedte als de hoogte (beschot + balk) laat passen
  const s = Math.min(availW / totalMM, availH / (tVloer + h));
  const jW = b * s, jH = h * s, sp = hoh * s, tV = Math.max(6, tVloer * s);
  const groupW = (nJ - 1) * sp + jW;               // getekende breedte van de balken
  const x0 = (W - groupW) / 2;                     // horizontaal gecentreerd
  const boardL = Math.min(mX, x0 - sp * 0.4), boardR = Math.max(W - mX, x0 + groupW + sp * 0.4);
  const blockH = tV + jH;
  const yBoard = mTop + Math.max(0, (availH - blockH) / 2);  // verticaal gecentreerd
  const yJoist = yBoard + tV;

  function Dim(props: { name: string; value: number; x: number; y: number; step?: number }) {
    const { name, value, x, y, step = 5 } = props;
    const isEd = editing === name;
    return (
      <div className="vd-dim" style={{ left: x, top: y }}>
        {isEd ? (
          <input className="vd-dim-input" type="number" step={step} defaultValue={value} autoFocus
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => { setVal(name, parseFloat(e.target.value)); setEditing(null); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { setVal(name, parseFloat((e.target as HTMLInputElement).value)); setEditing(null); }
              if (e.key === "Escape") setEditing(null);
            }} />
        ) : (
          <button className="vd-dim-num" title={`${name} — klik om te wijzigen`} onClick={() => setEditing(name)}>
            {Number.isInteger(value) ? value : value.toFixed(0)}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="vd-panel">
      <div className="vd-head">
        <strong>Parametrisch beeld — balklaag</strong>
        <span className={`vd-uc ${ok ? "ok" : "bad"}`}>
          UC<sub>max</sub> = {ucMax.toFixed(2)} {ok ? "✓ voldoet" : "✗ voldoet niet"}
        </span>
      </div>

      <div className="vd-body" style={{ flex: 1, minHeight: 0, alignItems: "stretch" }}>
        {/* De invoerkolom scrollt zelf: hij is langer dan het paneel hoog is,
            en zonder eigen scroll puilt hij over de voetregel heen. */}
        <div className="vd-controls vd-compact" style={{ alignSelf: "stretch", overflowY: "auto", minHeight: 0 }}>
          <span className="vd-ctrl-h">Algemeen</span>
          <span className="vd-ctrl-h">Statisch schema</span>
          <label>Schema
            <select value={schema} onChange={(e) => setVal("schema", parseInt(e.target.value))}>
              {SCHEMA.map((x) => <option key={x.v} value={x.v}>{x.label}</option>)}
            </select>
          </label>
          {schema === 2 && (
            <label>Overstek a (mm)
              <input type="number" step={50} value={aOver}
                onChange={(e) => setVal("a_over", parseFloat(e.target.value))} />
            </label>
          )}
          {schema === 3 && (
            <label>Tweede overspanning (mm)
              <input type="number" step={100} value={LVeld2}
                onChange={(e) => setVal("L_veld2", parseFloat(e.target.value))} />
            </label>
          )}
          {schema === 4 && (
            <>
              <label>Breedte sparing (mm)
                <input type="number" step={100} value={bSparing}
                  onChange={(e) => setVal("b_sparing", parseFloat(e.target.value))} />
              </label>
              <label>Staartlengte (mm)
                <input type="number" step={100} value={lStaart}
                  onChange={(e) => setVal("l_staart", parseFloat(e.target.value))} />
              </label>
            </>
          )}

          <span className="vd-ctrl-h">Geometrie</span>
          <label>Profiel (b×h)
            <select value={profId} onChange={(e) => setVal("profiel", parseInt(e.target.value))}>
              {Object.entries(PROFILES).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}
            </select>
          </label>
          <div className="vd-ontwerp">
            <button type="button" onClick={kiesEerstePassend} disabled={alleenLezen}>
              Ontwerp
            </button>
            <span>kiest het eerste profiel dat voldoet</span>
          </div>
          {ontwerpMelding && <p className="vd-ontwerp-melding">{ontwerpMelding}</p>}
          <label>Dagmaat (mm)
            <input type="number" step={100} value={Ld} onChange={(e) => setVal("L_d", parseFloat(e.target.value))} />
          </label>
          <label>Opleglengte (mm)
            <input type="number" step={5} value={aOpl} onChange={(e) => setVal("a_opl", parseFloat(e.target.value))} />
          </label>
          <label>H.o.h. afstand (mm)
            <input type="number" step={10} value={hoh} onChange={(e) => setVal("hoh", parseFloat(e.target.value))} />
          </label>
          <label>Dikte beschot (mm)
            <input type="number" step={1} value={tVloer} onChange={(e) => setVal("t_vloer", parseFloat(e.target.value))} />
          </label>
          <label>E-modulus beschot (N/mm²)
            <input type="number" step={100} value={eBeschot} onChange={(e) => setVal("E_beschot", parseFloat(e.target.value))} />
          </label>
          <label>Breedte vloerveld (m)
            <input type="number" step={0.5} value={bVloer} onChange={(e) => setVal("b_vloer", parseFloat(e.target.value))} />
          </label>

          <span className="vd-ctrl-h">Materiaal</span>
          <label>Sterkteklasse
            <select value={matId} onChange={(e) => setVal("sterkteklasse", parseInt(e.target.value))}>
              {Object.entries(MATS).map(([id, mm]) => <option key={id} value={id}>{mm.name}</option>)}
            </select>
          </label>
          <label title={KLIM.map((k) => k.uitleg).join("\n\n")}>
            <span className="vd-help">Klimaatklasse</span>
            <select
              value={klim}
              title={(KLIM.find((k) => k.v === klim) ?? KLIM[0]).uitleg}
              onChange={(e) => setVal("klimaat", parseInt(e.target.value))}
            >
              {KLIM.map((k) => <option key={k.v} value={k.v} title={k.uitleg}>{k.label}</option>)}
            </select>
          </label>
          <label>Belastingduurklasse
            <select value={duur} onChange={(e) => setVal("duurklasse", parseInt(e.target.value))}>
              {DUUR.map((d) => <option key={d.v} value={d.v}>{d.label}</option>)}
            </select>
          </label>

          <span className="vd-ctrl-h">Belasting</span>
          <label>G<sub>k</sub> (kN/m²)
            <input type="number" step={0.1} value={gk} onChange={(e) => setVal("G_k", parseFloat(e.target.value))} />
          </label>
          <label>Q<sub>k</sub> (kN/m²)
            <input type="number" step={0.5} value={qk} onChange={(e) => setVal("Q_k", parseFloat(e.target.value))} />
          </label>
          <label>F<sub>k</sub> (kN)
            <input type="number" step={0.5} value={Qk} onChange={(e) => setVal("F_k", parseFloat(e.target.value))} />
          </label>
          <label>Categorie (Tabel NB.2 — A1.1)
            <select value={cat} onChange={(e) => {
              const v = parseInt(e.target.value); setVal("belastingcat", v);
              const rij = CAT.find((c) => c.v === v);
              // Bij een normcategorie de bijbehorende waarden meesturen, zodat
              // "zelf invullen" begint bij wat er stond in plaats van bij nul.
              if (rij && v !== 11) { setVal("ψ_0_zelf", rij.psi0); setVal("ψ_2_zelf", rij.psi2); }
            }}>
              {CAT.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
            </select>
          </label>
          {cat === 11 && (
            <>
              <label>ψ<sub>0</sub>
                <input type="number" step={0.1} value={psi0zelf} onChange={(e) => setVal("ψ_0_zelf", parseFloat(e.target.value))} />
              </label>
              <label>ψ<sub>2</sub>
                <input type="number" step={0.1} value={psi2zelf} onChange={(e) => setVal("ψ_2_zelf", parseFloat(e.target.value))} />
              </label>
            </>
          )}

          <span className="vd-ctrl-h">Doorbuiging</span>
          <JaNee
            label="Controleer doorbuiging"
            waarde={controleer === 1}
            onChange={(v) => setVal("controleer", v ? 1 : 0)}
          />
          <label>Toelaatbare bijkomende doorbuiging
            <select value={grens} onChange={(e) => setVal("grensfactor", parseFloat(e.target.value))}>
              {GRENS.map((g) => <option key={g.v} value={g.v}>{g.label}</option>)}
            </select>
          </label>

          <span className="vd-ctrl-h">Trilling (§7.3.3)</span>
          <JaNee
            label="Controleer trilling"
            waarde={tril === 1}
            onChange={(v) => setVal("controleer_trilling", v ? 1 : 0)}
          />
          {tril === 1 && (
            <>
              <label>ζ — demping
                <input type="number" step={0.005} value={zeta} onChange={(e) => setVal("ζ", parseFloat(e.target.value))} />
              </label>
              <label>a (mm/kN)
                <input type="number" step={0.1} value={aTril} onChange={(e) => setVal("a_tril", parseFloat(e.target.value))} />
              </label>
              <label>b (—)
                <input type="number" step={5} value={bTril} onChange={(e) => setVal("b_tril", parseFloat(e.target.value))} />
              </label>
            </>
          )}
        </div>

        <div ref={wrapRef} className="vd-canvases" style={{ flex: 1, minWidth: 0, justifyContent: "center", borderLeft: "1px solid var(--theme-border-subtle, #d1d5db)", paddingLeft: 18 }}>
          <div className="vd-canvas">
            <div className="vd-caption">Doorsnede</div>
            <div className="vd-stage" style={{ width: W, height: H, background: "transparent", border: "none", borderRadius: 0 }}>
              <svg width={W} height={H} className="vd-svg">
                <defs>
                  <marker id="bdDim" markerWidth="10" markerHeight="12" refX="5" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
                    <circle cx="5" cy="6" r="2.4" className="vd-dimarrow" />
                  </marker>
                </defs>
                {/* beschot */}
                <rect x={boardL} y={yBoard} width={boardR - boardL} height={tV} style={{ fill: "#D9B382", stroke: "#8B6F47", strokeWidth: 1.5 }} />
                {/* balken */}
                {Array.from({ length: nJ }, (_, i) => (
                  <rect key={i} x={x0 + i * sp} y={yJoist} width={jW} height={jH} style={{ fill: "#E3C08A", stroke: "#8B6F47", strokeWidth: 1.5 }} />
                ))}
                {/* hoh maatlijn tussen balk 1 en 2 */}
                <line x1={x0 + jW / 2} y1={yJoist + jH + 18} x2={x0 + sp + jW / 2} y2={yJoist + jH + 18} className="vd-dimmeasure" markerStart="url(#bdDim)" markerEnd="url(#bdDim)" />
                <line x1={x0 + jW / 2} y1={yJoist + jH} x2={x0 + jW / 2} y2={yJoist + jH + 22} className="vd-dimext" />
                <line x1={x0 + sp + jW / 2} y1={yJoist + jH} x2={x0 + sp + jW / 2} y2={yJoist + jH + 22} className="vd-dimext" />
              </svg>
              <Dim name="hoh" value={hoh} x={x0 + sp / 2 + jW / 2} y={yJoist + jH + 18} step={10} />
              <Dim name="t_vloer" value={tVloer} x={boardR - 26} y={yBoard + tV / 2} step={1} />
              <div className="vd-dim-ro" style={{ left: x0 + jW / 2, top: yJoist + jH / 2 }}>{b}×{h}</div>
            </div>
          </div>

          {/* ── Statisch schema, met de opleggingen van het gekozen schema ── */}
          <div className="vd-canvas">
            <div className="vd-caption">Statisch schema</div>
            <div className="vd-stage" style={{ width: W, height: schemaH, background: "transparent", border: "none", borderRadius: 0 }}>
              {(() => {
                const mx = 54;
                // De balk is bij een overstek of een tweede veld langer dan de
                // overspanning; sx2 blijft de tweede oplegging, sxE het einde.
                const Ltot = schema === 2 ? Lth + aOver : schema === 3 ? Lth + LVeld2 : Lth;
                const sx1 = mx, sxE = Math.max(mx + 80, W - mx);
                const sx2 = sx1 + ((sxE - sx1) * Lth) / Math.max(Ltot, 1);
                const smid = (sx1 + sx2) / 2;
                const ay = 84;                       // hoogte van de balk-as
                const gTop = ay - 30;                // basislijn permanente last
                const qTop = gTop - 28;              // basislijn veranderlijke last
                const heeftQ = qq > 0;
                return (
                  <>
                    <svg width={W} height={schemaH} className="vd-svg">
                      <defs>
                        <marker id="bdDim2" markerWidth="10" markerHeight="12" refX="5" refY="6" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
                          <circle cx="5" cy="6" r="2.4" className="vd-dimarrow" />
                        </marker>
                      </defs>
                      {/* veranderlijke verdeelde last, met eigen basislijn erboven */}
                      {heeftQ && <Verdeellast x1={sx1} x2={sxE} yTop={qTop} yTip={gTop - 8} kleur={KLEUR_Q} />}
                      {/* permanente verdeelde last, direct op de balk */}
                      <Verdeellast x1={sx1} x2={sxE} yTop={gTop} yTip={ay - 5} kleur={KLEUR_G} />
                      {/* geconcentreerde veranderlijke last in het midden; met een witte
                          onderlaag, anders loopt hij zichtbaar dóór de twee lastbanden */}
                      {Qk > 0 && (
                        <>
                          <line x1={smid} y1={qTop - 14} x2={smid} y2={ay - 12} style={{ stroke: "#fff", strokeWidth: 5 }} />
                          <line x1={smid} y1={qTop - 14} x2={smid} y2={ay - 12} style={{ stroke: KLEUR_F, strokeWidth: 2 }} />
                          <polygon points={`${smid},${ay - 7} ${smid - 4.5},${ay - 17} ${smid + 4.5},${ay - 17}`} style={{ fill: KLEUR_F }} />
                        </>
                      )}
                      {/* de balk */}
                      <rect x={sx1} y={ay - 5} width={sxE - sx1} height={10} style={{ fill: "#E3C08A", stroke: "#8B6F47", strokeWidth: 1.5 }} />
                      {/* opleggingen: scharnier links, rol rechts */}
                      <polygon points={`${sx1},${ay + 5} ${sx1 - 10},${ay + 23} ${sx1 + 10},${ay + 23}`} style={{ fill: "none", stroke: "#374151", strokeWidth: 1.5 }} />
                      <line x1={sx1 - 16} y1={ay + 24} x2={sx1 + 16} y2={ay + 24} style={{ stroke: "#374151", strokeWidth: 1.5 }} />
                      <polygon points={`${sx2},${ay + 5} ${sx2 - 10},${ay + 19} ${sx2 + 10},${ay + 19}`} style={{ fill: "none", stroke: "#374151", strokeWidth: 1.5 }} />
                      <circle cx={sx2 - 5} cy={ay + 23} r={3.6} style={{ fill: "none", stroke: "#374151", strokeWidth: 1.4 }} />
                      <circle cx={sx2 + 5} cy={ay + 23} r={3.6} style={{ fill: "none", stroke: "#374151", strokeWidth: 1.4 }} />
                      <line x1={sx2 - 16} y1={ay + 28} x2={sx2 + 16} y2={ay + 28} style={{ stroke: "#374151", strokeWidth: 1.5 }} />
                      {/* derde oplegging bij twee velden */}
                      {schema === 3 && (
                        <>
                          <polygon points={`${sxE},${ay + 5} ${sxE - 10},${ay + 19} ${sxE + 10},${ay + 19}`} style={{ fill: "none", stroke: "#374151", strokeWidth: 1.5 }} />
                          <circle cx={sxE - 5} cy={ay + 23} r={3.6} style={{ fill: "none", stroke: "#374151", strokeWidth: 1.4 }} />
                          <circle cx={sxE + 5} cy={ay + 23} r={3.6} style={{ fill: "none", stroke: "#374151", strokeWidth: 1.4 }} />
                          <line x1={sxE - 16} y1={ay + 28} x2={sxE + 16} y2={ay + 28} style={{ stroke: "#374151", strokeWidth: 1.5 }} />
                        </>
                      )}
                      {/* maatlijn overspanning */}
                      <line x1={sx1} y1={ay + 46} x2={sx2} y2={ay + 46} className="vd-dimmeasure" markerStart="url(#bdDim2)" markerEnd="url(#bdDim2)" />
                      <line x1={sx1} y1={ay + 30} x2={sx1} y2={ay + 50} className="vd-dimext" />
                      <line x1={sx2} y1={ay + 34} x2={sx2} y2={ay + 50} className="vd-dimext" />
                    </svg>
                    <Dim name="L_d" value={Ld} x={smid} y={ay + 46} step={100} />
                  </>
                );
              })()}
            </div>
            {/* De waarden staan onder de tekening in plaats van als zwevende labels
                erin: zo is er ruimte om er de lastsoort bij te schrijven, en dekt
                geen labelvlak de pijl van de puntlast af. */}
            <div className="vd-legenda" style={{ width: W }}>
              <span>
                <i style={{ color: KLEUR_G }} />
                P<sub>g,k</sub> = {Pg.toFixed(2)} kN/m · permanent
              </span>
              {qq > 0 && (
                <span>
                  <i style={{ color: KLEUR_Q }} />
                  q<sub>q,k</sub> = {qq.toFixed(2)} kN/m · veranderlijk
                </span>
              )}
              {Qk > 0 && (
                <span>
                  <i style={{ color: KLEUR_F }} />
                  F<sub>Q,k</sub> = {(Qk * kr).toFixed(2)} kN · veranderlijk
                </span>
              )}
            </div>
          </div>

          {/* ── Momenten- en dwarskrachtenlijn (UGT) ─────────────────────
              Bij een overstek of twee velden heeft de lijn een andere vorm dan
              hier getekend wordt. Liever niets tonen dan een kromme die niet
              klopt; de uitwerking geeft de juiste waarden. */}
          {schema !== 2 && schema !== 3 && (
          <div className="vd-canvas">
            <div className="vd-caption">M- en V-lijn (UGT)</div>
            <div className="vd-stage" style={{ width: W, height: mvH, background: "transparent", border: "none", borderRadius: 0 }}>
              {(() => {
                const mx = 54;
                const mx1 = mx, mx2 = Math.max(mx + 80, W - mx);
                const mmid = (mx1 + mx2) / 2;
                // De parabool hangt onder zijn as, de V-lijn steekt naar beide
                // kanten uit — vandaar twee assen met ruimte ertussen.
                const amp = 26;
                const myAs = 30;
                const vyAs = 110;
                const Mk = MyEd / 1e6;             // N·mm → kN·m
                const Vk = VzEd / 1000;            // N → kN
                return (
                  <>
                    <svg width={W} height={mvH} className="vd-svg">
                      {/* M-lijn */}
                      <line x1={mx1 - 8} y1={myAs} x2={mx2 + 8} y2={myAs} style={{ stroke: "#374151", strokeWidth: 0.8 }} />
                      <path
                        d={`M ${mx1} ${myAs} Q ${mmid} ${myAs + 2 * amp} ${mx2} ${myAs}`}
                        style={{ fill: "#DBEAFE", stroke: "#1E40AF", strokeWidth: 1.2 }}
                      />
                      <line x1={mmid} y1={myAs} x2={mmid} y2={myAs + amp} style={{ stroke: "#1E40AF", strokeWidth: 0.8, strokeDasharray: "3 3" }} />
                      <Steunpunten x1={mx1} x2={mx2} y={myAs} />
                      {/* V-lijn */}
                      <line x1={mx1 - 8} y1={vyAs} x2={mx2 + 8} y2={vyAs} style={{ stroke: "#374151", strokeWidth: 0.8 }} />
                      <polygon points={`${mx1},${vyAs - amp} ${mmid},${vyAs} ${mx1},${vyAs}`} style={{ fill: "#DCFCE7", stroke: "#15803D", strokeWidth: 1.2 }} />
                      <polygon points={`${mmid},${vyAs} ${mx2},${vyAs + amp} ${mx2},${vyAs}`} style={{ fill: "#DCFCE7", stroke: "#15803D", strokeWidth: 1.2 }} />
                      <Steunpunten x1={mx1} x2={mx2} y={vyAs} />
                    </svg>
                    <div className="vd-dim-ro" style={{ left: mx1 + 20, top: myAs - 9, color: "#374151", fontWeight: 700 }}>M-lijn</div>
                    <div className="vd-dim-ro" style={{ left: mmid, top: myAs + amp + 12, color: "#1E40AF", fontWeight: 700 }}>
                      M = {Mk.toFixed(2)} kNm
                    </div>
                    <div className="vd-dim-ro" style={{ left: mx1 + 20, top: vyAs - 9, color: "#374151", fontWeight: 700 }}>V-lijn</div>
                    <div className="vd-dim-ro" style={{ left: mx1 + 46, top: vyAs - amp - 4, color: "#15803D", fontWeight: 700 }}>
                      +V = {Vk.toFixed(2)} kN
                    </div>
                    <div className="vd-dim-ro" style={{ left: mx2 - 38, top: vyAs + amp + 4, color: "#15803D", fontWeight: 700 }}>
                      −V
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
          )}

          {/* ── Doorbuigingslijn (BGT) ─────────────────────────────────── */}
          {schema !== 2 && schema !== 3 && (
          <div className="vd-canvas">
            <div className="vd-caption">Doorbuiging (BGT)</div>
            <div className="vd-stage" style={{ width: W, height: uH, background: "transparent", border: "none", borderRadius: 0 }}>
              {(() => {
                const mx = 54;
                const ux1 = mx, ux2 = Math.max(mx + 80, W - mx);
                const umid = (ux1 + ux2) / 2;
                const uAs = 26;
                // De twee zakkingen op dezelfde schaal, zodat je in één blik
                // ziet hoeveel de kruip er nog bovenop doet.
                const amp = 34;
                const grootste = Math.max(wfin, ug + uvar, 1e-6);
                const sInst = (amp * (ug + uvar)) / grootste;
                const sFin = (amp * wfin) / grootste;
                return (
                  <>
                    <svg width={W} height={uH} className="vd-svg">
                      <line x1={ux1 - 8} y1={uAs} x2={ux2 + 8} y2={uAs} style={{ stroke: "#374151", strokeWidth: 0.8, strokeDasharray: "4 3" }} />
                      {/* momentaan (6.14b) */}
                      <path
                        d={`M ${ux1} ${uAs} Q ${umid} ${uAs + 2 * sInst} ${ux2} ${uAs}`}
                        style={{ fill: "none", stroke: "#0EA5E9", strokeWidth: 1.2, strokeDasharray: "5 3" }}
                      />
                      {/* eindstand incl. kruip (6.16b) */}
                      <path
                        d={`M ${ux1} ${uAs} Q ${umid} ${uAs + 2 * sFin} ${ux2} ${uAs}`}
                        style={{ fill: "rgba(14,165,233,0.10)", stroke: "#0369A1", strokeWidth: 1.4 }}
                      />
                      <line x1={umid} y1={uAs} x2={umid} y2={uAs + sFin} style={{ stroke: "#0369A1", strokeWidth: 0.8, strokeDasharray: "3 3" }} />
                      <Steunpunten x1={ux1} x2={ux2} y={uAs} />
                    </svg>
                    <div className="vd-dim-ro" style={{ left: ux1 + 26, top: uAs - 9, color: "#374151", fontWeight: 700 }}>onvervormd</div>
                    <div className="vd-dim-ro" style={{ left: umid + 62, top: uAs + sInst - 4, color: "#0EA5E9", fontWeight: 700 }}>
                      w<sub>inst</sub> = {(ug + uvar).toFixed(1)} mm
                    </div>
                    <div className="vd-dim-ro" style={{ left: umid, top: uAs + sFin + 12, color: "#0369A1", fontWeight: 700 }}>
                      w<sub>fin</sub> = {wfin.toFixed(1)} mm (grens {wlim.toFixed(1)})
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
          )}
        </div>
      </div>

      <div className="vd-foot">
        <span>Klik op een blauwe maat om die te wijzigen — stroomt direct terug in de rekensheet.</span>
        <span className="vd-live">
          {controleer === 1 ? <UcChip naam="doorbuiging" uc={ucDoor} /> : <span className="vd-uc-nvt">doorbuiging n.v.t.</span>}
          <UcChip naam="buiging" uc={ucBuig} />
          <UcChip naam="afschuiving" uc={ucAfsch} />
          {tril === 1
            ? <UcChip naam="trilling" uc={ucTril} extra={`f₁ = ${f1.toFixed(1)} Hz`} />
            : <span className="vd-uc-nvt">trilling n.v.t.</span>}
        </span>
      </div>
    </div>
  );
}
