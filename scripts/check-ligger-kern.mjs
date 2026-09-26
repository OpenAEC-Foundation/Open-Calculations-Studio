/**
 * Controlescript voor de ligger in de rekenkern (packages/core/src/ligger.ts).
 *
 *   1. Vergeetmenietjes: gesloten formules voor de bekende gevallen — ligger
 *      op twee steunpunten (qL²/8, 5qL⁴/384EI, puntlast buiten het midden),
 *      uitkraging, eenzijdig en tweezijdig ingeklemd, twee en drie velden
 *      (drie-momentenvergelijking), overstek, gerberligger, trapezium- en
 *      driehoekslast, deellast en puntmoment. Ook de herkenning van een
 *      beweeglijke ligger.
 *   2. Een onafhankelijke numerieke oplossing: de ligger als één staaf,
 *      vanaf het linkereind tweemaal geïntegreerd (trapeziumregel op een fijn
 *      raster), met de onbekende reacties, eindwaarden en scharnierhoeken uit
 *      de randvoorwaarden. Geen elementen, geen vormfuncties: een andere
 *      rekenweg dan de kern. Vergeleken worden V, M en w langs de hele ligger
 *      en de reacties, voor een reeks samengestelde liggers.
 *   3. De omhullende: tegen het doorrekenen van alle schaakbordpatronen en
 *      alle keuzes van de overheersende last, met de permanente last als één
 *      bron (ongunstig of gunstig op het totaal) of per deel (EQU).
 *   4. De hulpfuncties (uitersten, interpolatie, nulpunt, velden, delen,
 *      SVG-punten) en het gebruik vanuit een rekenblad, met CalcPAD-matrices en
 *      grootheden met eenheid.
 *
 * Draaien:  node scripts/check-ligger-kern.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import {
  liggerOplossing, liggerReacties, liggerOmhullende, liggerOmhullendeReacties, liggerExtremen,
  liggerInterpoleer, liggerNulpunt, liggerStatus, liggerDelen, liggerVelden, liggerSvgPunten, liggerSamen,
  parse, evaluate,
} from "../packages/core/dist/index.js";

let fouten = 0;
let getest = 0;
const rel = (a, b) => Math.abs(a - b) / Math.max(1e-9, Math.abs(b), 1e-6);
function gelijk(wat, uit, verwacht, tol = 1e-7, abs = 1e-9) {
  getest++;
  const ok = Math.abs(uit - verwacht) <= abs || rel(uit, verwacht) <= tol;
  if (!ok) {
    fouten++;
    console.log(`  FOUT  ${wat}: ${uit} tegen ${verwacht}`);
  }
  return ok;
}
function waar(wat, ok, detail = "") {
  getest++;
  if (!ok) {
    fouten++;
    console.log(`  FOUT  ${wat}${detail ? `: ${detail}` : ""}`);
  }
}
const kop = (t) => console.log(`\n${t}`);
const tel = () => getest;

// Hulp: waarde van kolom k in x (rechts bij een sprong) en links bij een sprong.
// De oplossingen hieronder vragen de gebruikte x-waarden er exact bij (het
// laatste argument van liggerOplossing); tussen rasterpunten zou interpoleren
// een benadering zijn.
const kolom = { V: 2, M: 3, w: 4 };
const op = (R, g, x) => liggerInterpoleer(R, kolom[g], x);
/** Oplossing met de punten op elke 0,05 erbij, zodat de getoetste x-waarden exact zijn. */
function los(geo, last, EIx, f, deel) {
  const xs = geo.map((r) => r[0]);
  const lo = Math.min(...xs), hi = Math.max(...xs);
  const extra = [];
  for (let i = Math.ceil(lo / 0.05); i * 0.05 <= hi + 1e-9; i++) extra.push(i * 0.05);
  return liggerOplossing(geo, last, EIx, f, deel ?? 0, extra);
}
function links(R, g, x) {
  const k = kolom[g] - 1;
  const rij = R.filter((r) => Math.abs(r[0] - x) < 1e-9);
  return rij.length ? rij[0][k] : op(R, g, x);
}
const reactie = (RR, x) => (RR.find((r) => Math.abs(r[0] - x) < 1e-9) ?? [x, NaN, NaN])[1];
const steunM = (RR, x) => (RR.find((r) => Math.abs(r[0] - x) < 1e-9) ?? [x, NaN, NaN])[2];

const EI = 5000; // kNm²
const V = (x, s) => [x, s];

// ── 1. Vergeetmenietjes ─────────────────────────────────────────────────────
kop("1. Gesloten formules");
{
  const n0 = tel();
  const L = 6, q = 4;
  // Ligger op twee steunpunten, gelijkmatige last.
  {
    const geo = [V(0, 1), V(L, 1)];
    const last = [[1, 0, L, q, q]];
    const R = los(geo, last, EI);
    const RR = liggerReacties(geo, last, EI);
    const [Mmax, xM] = liggerExtremen(R, 3);
    gelijk("2 steunpunten q: M_max = qL²/8", Mmax, (q * L * L) / 8);
    gelijk("2 steunpunten q: plaats L/2", xM, L / 2);
    gelijk("2 steunpunten q: w_max = 5qL⁴/384EI", liggerExtremen(R, 4)[0], (5 * q * L ** 4) / (384 * EI));
    gelijk("2 steunpunten q: V(0) = qL/2", op(R, "V", 0), (q * L) / 2);
    gelijk("2 steunpunten q: V(L) = −qL/2", links(R, "V", L), (-q * L) / 2);
    gelijk("2 steunpunten q: R_A = qL/2", reactie(RR, 0), (q * L) / 2);
    gelijk("2 steunpunten q: R_B = qL/2", reactie(RR, L), (q * L) / 2);
    gelijk("2 steunpunten q: M(L/4) = 3qL²/32", op(R, "M", L / 4), (3 * q * L * L) / 32);
  }
  // Puntlast buiten het midden: a = 0,6L, b = 0,4L.
  {
    const F = 10, a = 0.6 * L, b = 0.4 * L;
    const geo = [V(0, 1), V(L, 1)];
    const R = los(geo, [[2, a, 0, F, 0]], EI);
    gelijk("puntlast: M_max = Fab/L", liggerExtremen(R, 3)[0], (F * a * b) / L);
    gelijk("puntlast: w onder de last = Fa²b²/3EIL", op(R, "w", a), (F * a * a * b * b) / (3 * EI * L));
    const xw = Math.sqrt((L * L - b * b) / 3);
    gelijk("puntlast: w_max = Fb(L²−b²)^1,5/(9√3·EIL)", liggerExtremen(R, 4)[0], (F * b * (L * L - b * b) ** 1.5) / (9 * Math.sqrt(3) * EI * L));
    gelijk("puntlast: plaats w_max = √((L²−b²)/3)", liggerExtremen(R, 4)[1], xw, 1e-6);
    gelijk("puntlast: V links van de last = Fb/L", links(R, "V", a), (F * b) / L);
    gelijk("puntlast: V rechts van de last = −Fa/L", op(R, "V", a), (-F * a) / L);
  }
  // Uitkraging, ingeklemd links.
  {
    const geo = [V(0, 2), V(L, 0)];
    const R = los(geo, [[1, 0, L, q, q]], EI);
    const RR = liggerReacties(geo, [[1, 0, L, q, q]], EI);
    gelijk("uitkraging q: M_klem = −qL²/2", steunM(RR, 0), (-q * L * L) / 2);
    gelijk("uitkraging q: R = qL", reactie(RR, 0), q * L);
    gelijk("uitkraging q: w_eind = qL⁴/8EI", op(R, "w", L), (q * L ** 4) / (8 * EI));
    const F = 7;
    const R2 = los(geo, [[2, L, 0, F, 0]], EI);
    gelijk("uitkraging F: w_eind = FL³/3EI", op(R2, "w", L), (F * L ** 3) / (3 * EI));
    gelijk("uitkraging F: M_klem = −FL", op(R2, "M", 0), -F * L);
    gelijk("uitkraging F: V = F", op(R2, "V", L / 2), F);
    // Ingeklemd rechts: spiegelbeeld.
    const R3 = los([V(0, 0), V(L, 2)], [[2, 0, 0, F, 0]], EI);
    gelijk("uitkraging rechts ingeklemd: w_eind = FL³/3EI", op(R3, "w", 0), (F * L ** 3) / (3 * EI));
    gelijk("uitkraging rechts ingeklemd: V = −F", op(R3, "V", L / 2), -F);
  }
  // Eenzijdig ingeklemd (inklemming links, steunpunt rechts).
  {
    const geo = [V(0, 2), V(L, 1)];
    const R = los(geo, [[1, 0, L, q, q]], EI);
    const RR = liggerReacties(geo, [[1, 0, L, q, q]], EI);
    gelijk("eenzijdig ingeklemd: M_A = −qL²/8", steunM(RR, 0), (-q * L * L) / 8);
    gelijk("eenzijdig ingeklemd: R_B = 3qL/8", reactie(RR, L), (3 * q * L) / 8);
    gelijk("eenzijdig ingeklemd: R_A = 5qL/8", reactie(RR, 0), (5 * q * L) / 8);
    gelijk("eenzijdig ingeklemd: M_veld = 9qL²/128", liggerExtremen(R, 3)[0], (9 * q * L * L) / 128);
    gelijk("eenzijdig ingeklemd: plaats 5L/8", liggerExtremen(R, 3)[1], (5 * L) / 8);
    const xw = (L * (15 - Math.sqrt(33))) / 16;
    const wx = (x) => (q * x * x * (3 * L * L - 5 * L * x + 2 * x * x)) / (48 * EI);
    gelijk("eenzijdig ingeklemd: w_max bij x = L(15 − √33)/16", liggerExtremen(R, 4)[0], wx(xw));
    gelijk("eenzijdig ingeklemd: plaats w_max", liggerExtremen(R, 4)[1], xw, 1e-6);
  }
  // Tweezijdig ingeklemd.
  {
    const geo = [V(0, 2), V(L, 2)];
    const R = los(geo, [[1, 0, L, q, q]], EI);
    gelijk("tweezijdig ingeklemd q: M_eind = −qL²/12", op(R, "M", 0), (-q * L * L) / 12);
    gelijk("tweezijdig ingeklemd q: M_midden = qL²/24", op(R, "M", L / 2), (q * L * L) / 24);
    gelijk("tweezijdig ingeklemd q: w_midden = qL⁴/384EI", op(R, "w", L / 2), (q * L ** 4) / (384 * EI));
    const F = 12;
    const R2 = los(geo, [[2, L / 2, 0, F, 0]], EI);
    gelijk("tweezijdig ingeklemd F: M_eind = −FL/8", op(R2, "M", 0), (-F * L) / 8);
    gelijk("tweezijdig ingeklemd F: M_midden = FL/8", op(R2, "M", L / 2), (F * L) / 8);
    gelijk("tweezijdig ingeklemd F: w = FL³/192EI", op(R2, "w", L / 2), (F * L ** 3) / (192 * EI));
  }
  // Twee gelijke velden (drie-momentenvergelijking).
  {
    const geo = [V(0, 1), V(L, 1), V(2 * L, 1)];
    const last = [[1, 0, 2 * L, q, q]];
    const R = los(geo, last, EI);
    const RR = liggerReacties(geo, last, EI);
    gelijk("twee velden: M_B = −qL²/8", steunM(RR, L), (-q * L * L) / 8);
    gelijk("twee velden: R_A = 3qL/8", reactie(RR, 0), (3 * q * L) / 8);
    gelijk("twee velden: R_B = 10qL/8", reactie(RR, L), (10 * q * L) / 8);
    gelijk("twee velden: M_veld = 9qL²/128", liggerExtremen(R, 3, 0, L)[0], (9 * q * L * L) / 128);
    gelijk("twee velden: w_max = qL⁴/185EI", liggerExtremen(R, 4)[0], 0.0054165 * (q * L ** 4) / EI, 1e-4);
    gelijk("twee velden: V links van B = −5qL/8", links(R, "V", L), (-5 * q * L) / 8);
    gelijk("twee velden: V rechts van B = 5qL/8", op(R, "V", L), (5 * q * L) / 8);
  }
  // Twee ongelijke velden: M_B = −q(L1³ + L2³)/(8(L1 + L2)).
  {
    const L1 = 5, L2 = 3.2;
    const geo = [V(0, 1), V(L1, 1), V(L1 + L2, 1)];
    const RR = liggerReacties(geo, [[1, 0, L1 + L2, q, q]], EI);
    gelijk("ongelijke velden: M_B (drie-momentenvergelijking)", steunM(RR, L1), (-q * (L1 ** 3 + L2 ** 3)) / (8 * (L1 + L2)));
    // Alleen veld 1 belast: M_B = −qL1³/(8(L1 + L2)).
    const RR1 = liggerReacties(geo, [[1, 0, L1, q, q]], EI);
    gelijk("ongelijke velden, alleen veld 1: M_B", steunM(RR1, L1), (-q * L1 ** 3) / (8 * (L1 + L2)));
    // Puntlast midden in veld 2: M_B = −3PL2²/(16(L1 + L2)).
    const P = 9;
    const RR2 = liggerReacties(geo, [[2, L1 + L2 / 2, 0, P, 0]], EI);
    gelijk("ongelijke velden, puntlast veld 2: M_B", steunM(RR2, L1), (-3 * P * L2 * L2) / (16 * (L1 + L2)));
  }
  // Drie gelijke velden: M_B = M_C = −qL²/10.
  {
    const geo = [V(0, 1), V(L, 1), V(2 * L, 1), V(3 * L, 1)];
    const last = [[1, 0, 3 * L, q, q]];
    const R = los(geo, last, EI);
    const RR = liggerReacties(geo, last, EI);
    gelijk("drie velden: M_B = −qL²/10", steunM(RR, L), (-q * L * L) / 10);
    gelijk("drie velden: M_C = −qL²/10", steunM(RR, 2 * L), (-q * L * L) / 10);
    gelijk("drie velden: R_A = 0,4qL", reactie(RR, 0), 0.4 * q * L);
    gelijk("drie velden: R_B = 1,1qL", reactie(RR, L), 1.1 * q * L);
    gelijk("drie velden: M_eindveld = 0,08qL²", liggerExtremen(R, 3, 0, L)[0], 0.08 * q * L * L);
    gelijk("drie velden: M_middenveld = 0,025qL²", liggerExtremen(R, 3, L, 2 * L)[0], 0.025 * q * L * L);
  }
  // Overstek: veld L met overstek a, alleen het overstek belast.
  {
    const a = 1.8;
    const geo = [V(0, 1), V(L, 1), V(L + a, 0)];
    const R = los(geo, [[1, L, L + a, q, q]], EI);
    const RR = liggerReacties(geo, [[1, L, L + a, q, q]], EI);
    gelijk("overstek: M_B = −qa²/2", steunM(RR, L), (-q * a * a) / 2);
    gelijk("overstek: w_eind = qa³(4L + 3a)/24EI", op(R, "w", L + a), (q * a ** 3 * (4 * L + 3 * a)) / (24 * EI));
    gelijk("overstek: w midden veld = −(qa²/2)L²/16EI", op(R, "w", L / 2), (-(q * a * a) / 2 * L * L) / (16 * EI));
    gelijk("overstek: R_A = −qa²/2L (trek)", reactie(RR, 0), (-q * a * a) / (2 * L));
    // Overstek links en rechts, gelijkmatige last over alles: M in het midden = qL²/8 − qa²/2.
    const geo2 = [V(0, 0), V(a, 1), V(a + L, 1), V(2 * a + L, 0)];
    const R2 = los(geo2, [[1, 0, 2 * a + L, q, q]], EI);
    gelijk("twee overstekken: M_midden = qL²/8 − qa²/2", op(R2, "M", a + L / 2), (q * L * L) / 8 - (q * a * a) / 2);
  }
  // Gerberligger: steunpunten 0, L1 en L1 + c + L3, scharnier op L1 + c.
  {
    const L1 = 6, c = 1.5, L3 = 4.5, xh = L1 + c, xe = L1 + c + L3;
    const geo = [V(0, 1), V(L1, 1), V(xh, 3), V(xe, 1)];
    waar("gerber: stabiel", liggerStatus(geo) === 1);
    const last = [[1, 0, xe, q, q]];
    const R = los(geo, last, EI);
    const RR = liggerReacties(geo, last, EI);
    gelijk("gerber: M in het scharnier = 0", op(R, "M", xh), 0, 1e-7, 1e-7);
    gelijk("gerber: R_eind = qL3/2", reactie(RR, xe), (q * L3) / 2);
    gelijk("gerber: M midden hangend deel = qL3²/8", op(R, "M", xh + L3 / 2), (q * L3 * L3) / 8);
    gelijk("gerber: M_B = −(qc²/2 + qL3·c/2)", steunM(RR, L1), -((q * c * c) / 2 + (q * L3 * c) / 2));
    // Scharnier boven een steunpunt: twee losse liggers.
    const geo2 = [V(0, 1), V(L, 1), V(L, 3), V(2 * L, 1)];
    const R2 = los(geo2, [[1, 0, 2 * L, q, q]], EI);
    gelijk("scharnier boven steunpunt: M_B = 0", op(R2, "M", L), 0, 1e-7, 1e-7);
    gelijk("scharnier boven steunpunt: M_veld = qL²/8", op(R2, "M", L / 2), (q * L * L) / 8);
  }
  // Driehoek en trapezium op een ligger op twee steunpunten.
  {
    const q0 = 6;
    const geo = [V(0, 1), V(L, 1)];
    const R = los(geo, [[1, 0, L, 0, q0]], EI);
    const RR = liggerReacties(geo, [[1, 0, L, 0, q0]], EI);
    gelijk("driehoek: R_A = q0L/6", reactie(RR, 0), (q0 * L) / 6);
    gelijk("driehoek: R_B = q0L/3", reactie(RR, L), (q0 * L) / 3);
    gelijk("driehoek: M_max = q0L²/(9√3)", liggerExtremen(R, 3)[0], (q0 * L * L) / (9 * Math.sqrt(3)));
    gelijk("driehoek: plaats L/√3", liggerExtremen(R, 3)[1], L / Math.sqrt(3), 1e-6);
    gelijk("driehoek: w midden = 5q0L⁴/768EI", op(R, "w", L / 2), (5 * q0 * L ** 4) / (768 * EI));
    // Trapezium = gelijkmatig q1 + driehoek (q2 − q1): superpositie.
    const q1 = 2, q2 = 5;
    const Rt = los(geo, [[1, 0, L, q1, q2]], EI);
    const w = (x) => (q1 * x * (L ** 3 - 2 * L * x * x + x ** 3)) / (24 * EI)
      + ((q2 - q1) * x * (7 * L ** 4 - 10 * L * L * x * x + 3 * x ** 4)) / (360 * EI * L);
    gelijk("trapezium: w(0,3L) (superpositie van de formules)", op(Rt, "w", 0.3 * L), w(0.3 * L));
    gelijk("trapezium: R_A = (2q1 + q2)L/6", liggerReacties(geo, [[1, 0, L, q1, q2]], EI)[0][1], ((2 * q1 + q2) * L) / 6);
    // Omgekeerd ingevoerd (b < a) is hetzelfde.
    const Rr = los(geo, [[1, L, 0, q2, q1]], EI);
    gelijk("trapezium omgekeerd ingevoerd", op(Rr, "w", 0.3 * L), w(0.3 * L));
  }
  // Deellast van a tot b en een puntmoment.
  {
    const a = 1.2, b = 4.0, cL = b - a;
    const geo = [V(0, 1), V(L, 1)];
    const R = los(geo, [[1, a, b, q, q]], EI);
    const RA = (q * cL * (L - (a + b) / 2)) / L;
    gelijk("deellast: R_A", liggerReacties(geo, [[1, a, b, q, q]], EI)[0][1], RA);
    gelijk("deellast: M(a) = R_A·a", op(R, "M", a), RA * a);
    gelijk("deellast: M(3,0) = R_A·3 − q(3 − a)²/2", op(R, "M", 3), RA * 3 - (q * (3 - a) ** 2) / 2);
    gelijk("deellast: M_max = R_A²/2q + R_A·a", liggerExtremen(R, 3)[0], (RA * RA) / (2 * q) + RA * a);
    const C = 8, xc = 2;
    const Rm = los(geo, [[3, xc, 0, C, 0]], EI);
    gelijk("puntmoment: M links = −C·x/L", links(Rm, "M", xc), (-C * xc) / L);
    gelijk("puntmoment: M rechts = C(1 − x/L)", op(Rm, "M", xc), C * (1 - xc / L));
    gelijk("puntmoment: V = −C/L", op(Rm, "V", 1), -C / L);
    // Midden: w = 0 door antisymmetrie van C in het midden.
    const Rm2 = los(geo, [[3, L / 2, 0, C, 0]], EI);
    gelijk("puntmoment midden: w(L/2) = 0", op(Rm2, "w", L / 2), 0, 1e-7, 1e-12);
  }
  // Beweeglijk en ongeldig.
  {
    waar("beweeglijk: twee steunpunten met scharnier in het veld", liggerStatus([V(0, 1), V(3, 3), V(6, 1)]) === -1);
    waar("beweeglijk: één steunpunt zonder inklemming", liggerStatus([V(0, 1), V(6, 0)]) === -1);
    waar("beweeglijk: overstek met scharnier boven het steunpunt", liggerStatus([V(0, 0), V(1, 1), V(1, 3), V(4, 1)]) === -1);
    waar("stabiel: uitkraging", liggerStatus([V(0, 2), V(3, 0)]) === 1);
    waar("stabiel: twee steunpunten met scharnier, één kant ingeklemd", liggerStatus([V(0, 2), V(3, 3), V(6, 1)]) === 1);
    waar("ongeldig: lengte nul", liggerStatus([V(0, 1), V(0, 1)]) === 0);
    waar("ongeldig: EI nul", liggerStatus([V(0, 1), V(4, 1)], 0) === 0);
    const R = los([V(0, 1), V(3, 3), V(6, 1)], [[1, 0, 6, q, q]], EI);
    waar("beweeglijk: uitkomst zonder getallen die niet eindig zijn", R.flat().every(Number.isFinite));
  }
  console.log(`  ${tel() - n0} vergelijkingen`);
}

// ── 2. Onafhankelijke numerieke oplossing ───────────────────────────────────
kop("2. Onafhankelijke oplossing: tweemaal integreren met de randvoorwaarden");

/**
 * Onafhankelijke rekenweg. De ligger van x = 0 tot L als één staaf. Onbekenden:
 * V en M rechts van het linkereind, w en θ daar, de reactie van elk steunpunt
 * voorbij het linkereind, het inklemmingsmoment van een inklemming voorbij het
 * linkereind en de hoeksprong in elk scharnier. M(x) volgt uit het evenwicht
 * van het deel links van x; θ en w uit tweemaal integreren van −M/EI met de
 * trapeziumregel op een fijn raster (de sprongen vallen op rasterpunten).
 * Voorwaarden: w = 0 in elk steunpunt, θ = 0 in een inklemming, M = 0 in een
 * scharnier, en aan elk vrij eind M = 0 en V = 0.
 */
function onafhankelijk(punten, lasten, EIv, N = 24000) {
  const ps = [...punten].sort((a, b) => a[0] - b[0]);
  const x0 = ps[0][0], xL = ps[ps.length - 1][0], L = xL - x0;
  const knopen = [];
  for (const [x, s] of ps) {
    let k = knopen.find((k) => Math.abs(k.x - x) < 1e-12);
    if (!k) knopen.push((k = { x, steun: false, klem: false, scharnier: false }));
    if (s === 1 || s === 2) k.steun = true;
    if (s === 2) k.klem = true;
    if (s === 3) k.scharnier = true;
  }
  knopen.sort((a, b) => a.x - b.x);
  const begin = knopen[0], eind = knopen[knopen.length - 1];
  // Raster met alle bijzondere punten erop.
  const xsSet = new Set();
  for (let i = 0; i <= N; i++) xsSet.add(x0 + (L * i) / N);
  for (const k of knopen) xsSet.add(k.x);
  for (const p of lasten) { xsSet.add(p[1]); if (p[0] === 1) xsSet.add(p[2]); }
  const xs = [...xsSet].filter((x) => x >= x0 - 1e-12 && x <= xL + 1e-12).sort((a, b) => a - b);
  const n = xs.length;
  // Moment van de lasten links van x (neerwaarts positief) en hun dwarskracht.
  const lastM = new Float64Array(n), lastV = new Float64Array(n);
  for (const p of lasten) {
    const [soort, a, b, qa, qb] = p;
    for (let i = 0; i < n; i++) {
      const x = xs[i];
      if (soort === 1) {
        const lo = Math.min(a, b), hi = Math.max(a, b);
        const qlo = a <= b ? qa : qb, qhi = a <= b ? qb : qa;
        const s1 = Math.min(hi, x);
        if (s1 <= lo) continue;
        // Numeriek: Simpson over [lo, s1] met 40 stukken.
        const m = 40, h = (s1 - lo) / m;
        let Q = 0, Mq = 0;
        for (let j = 0; j <= m; j++) {
          const s = lo + j * h;
          const w = j === 0 || j === m ? 1 : j % 2 ? 4 : 2;
          const qs = qlo + ((qhi - qlo) * (s - lo)) / (hi - lo);
          Q += (w * qs * h) / 3;
          Mq += (w * qs * (x - s) * h) / 3;
        }
        lastV[i] -= Q;
        lastM[i] -= Mq;
      } else if (soort === 2) {
        if (a < x || (a === x && a === xL)) { lastV[i] -= qa; lastM[i] -= qa * (x - a); }
      } else if (soort === 3) {
        if (a < x || (a === x && a === xL)) lastM[i] += qa;
      }
    }
  }
  // Onbekenden en hun bijdrage aan M(x) en V(x).
  const onb = [];
  onb.push({ naam: "V0", M: (x) => x - x0, V: () => 1 });
  onb.push({ naam: "M0", M: () => 1, V: () => 0 });
  for (const k of knopen.slice(1)) {
    if (k.steun) onb.push({ naam: `R${k.x}`, M: (x) => (x > k.x ? x - k.x : 0), V: (x) => (x > k.x ? 1 : 0), x: k.x, R: true });
    if (k.klem) onb.push({ naam: `C${k.x}`, M: (x) => (x > k.x ? 1 : 0), V: () => 0 });
  }
  const nM = onb.length;
  const hoek = knopen.filter((k) => k.scharnier && k !== begin && k !== eind);
  const nOnb = nM + 2 + hoek.length; // + w0, θ0, hoeksprongen
  // Per onbekende (en de lasten) de lijnen M, θ, w door integreren.
  function integreer(Mf) {
    const th = new Float64Array(n), w = new Float64Array(n);
    for (let i = 1; i < n; i++) {
      const h = xs[i] - xs[i - 1];
      th[i] = th[i - 1] - ((Mf[i - 1] + Mf[i]) / 2) * h / EIv;
      w[i] = w[i - 1] + ((th[i - 1] + th[i]) / 2) * h - 0; // tweede integraal
    }
    // Correctie voor de trapeziumregel op w: w'' = −M/EI, dus w ≈ ∑ θ·h met θ uit
    // de trapeziumregel; de fout is O(h²).
    return { th, w };
  }
  const basis = [];
  for (let u = 0; u < nOnb; u++) {
    const Mf = new Float64Array(n), Vf = new Float64Array(n);
    let th0 = 0, w0 = 0;
    const sprong = [];
    if (u < nM) for (let i = 0; i < n; i++) { Mf[i] = onb[u].M(xs[i]); Vf[i] = onb[u].V(xs[i]); }
    else if (u === nM) w0 = 1;
    else if (u === nM + 1) th0 = 1;
    else sprong.push(hoek[u - nM - 2].x);
    const { th, w } = integreer(Mf);
    for (let i = 0; i < n; i++) {
      th[i] += th0; w[i] += w0 + th0 * (xs[i] - x0);
      for (const xs0 of sprong) if (xs[i] > xs0) { th[i] += 1; w[i] += xs[i] - xs0; }
    }
    basis.push({ Mf, Vf, th, w });
  }
  const lastInt = integreer(lastM);
  const idx = (x) => xs.findIndex((v) => Math.abs(v - x) < 1e-12);
  // Voorwaarden.
  const A = [], rhs = [];
  const rij = (f, r) => { A.push(basis.map(f)); rhs.push(r); };
  const i0 = 0;
  // Linkereind.
  if (begin.steun) rij((b) => b.w[i0], -lastInt.w[i0]);
  if (begin.klem) rij((b) => b.th[i0], -lastInt.th[i0]);
  if (!begin.klem) rij((b) => b.Mf[i0], -lastM[i0]);
  if (!begin.steun) rij((b) => b.Vf[i0], -lastV[i0]);
  for (const k of knopen.slice(1)) {
    const i = idx(k.x);
    if (k.steun) rij((b) => b.w[i], -lastInt.w[i]);
    if (k.klem) rij((b) => b.th[i], -lastInt.th[i]);
    if (k.scharnier && k !== eind) rij((b) => b.Mf[i], -lastM[i]);
  }
  // Rechtereind: M = 0 tenzij ingeklemd, V = 0 als het eind vrij is (net rechts
  // van het eind: de reactie daar is meegeteld).
  const iL = n - 1;
  const MnaEind = (b) => b.Mf[iL];
  const VnaEind = (b, isLast) => b.Vf[iL];
  if (!eind.klem) rij(MnaEind, -lastM[iL]);
  if (!eind.steun) rij((b) => VnaEind(b), -lastV[iL]);
  // Bij een steun of inklemming op het rechtereind: evenwicht na de reactie.
  if (eind.steun) {
    // Reactie van het rechtereind is een onbekende met bijdrage alleen voorbij xL;
    // voeg daarom V(xL+) = 0 toe met die reactie erbij.
    const r = onb.findIndex((o) => o.R && Math.abs(o.x - xL) < 1e-12);
    rij((b, u) => b.Vf[iL] + (u === r ? 1 : 0), -lastV[iL]);
    if (eind.klem) {
      const c = onb.findIndex((o) => o.naam === `C${xL}`);
      rij((b, u) => b.Mf[iL] + (u === c ? 1 : 0), -lastM[iL]);
    }
  }
  // Oplossen (kleinste kwadraten als er een voorwaarde dubbel is).
  const At = A[0].map((_, j) => A.map((r) => r[j]));
  const AtA = At.map((r) => At.map((c) => r.reduce((s, v, k) => s + v * c[k], 0)));
  const Atb = At.map((r) => r.reduce((s, v, k) => s + v * rhs[k], 0));
  const m = AtA.length;
  const Mx = AtA.map((r, i) => [...r, Atb[i]]);
  for (let k = 0; k < m; k++) {
    let p = k;
    for (let i = k + 1; i < m; i++) if (Math.abs(Mx[i][k]) > Math.abs(Mx[p][k])) p = i;
    [Mx[k], Mx[p]] = [Mx[p], Mx[k]];
    for (let i = 0; i < m; i++) {
      if (i === k) continue;
      const f = Mx[i][k] / Mx[k][k];
      for (let j = k; j <= m; j++) Mx[i][j] -= f * Mx[k][j];
    }
  }
  const sol = Mx.map((r, i) => r[m] / r[i]);
  const comb = (g, i) => sol.reduce((s, c, u) => s + c * basis[u][g][i], 0);
  const Vx = (i) => lastV[i] + comb("Vf", i);
  const Mxx = (i) => lastM[i] + comb("Mf", i);
  const wx = (i) => lastInt.w[i] + comb("w", i);
  const reacties = [];
  if (begin.steun) reacties.push([begin.x, sol[0], begin.klem ? sol[1] : 0]);
  for (let u = 0; u < onb.length; u++) if (onb[u].R) reacties.push([onb[u].x, sol[u]]);
  return { xs, V: Vx, M: Mxx, w: wx, reacties };
}

const GEVALLEN = [
  {
    wat: "vier steunpunten, overstekken links en rechts, gemengde lasten",
    geo: [V(0, 0), V(1.2, 1), V(6.2, 1), V(10.4, 1), V(15.4, 1), V(17.0, 0)],
    last: [[1, 0, 17, 3.5, 3.5], [1, 2, 9, 1, 6], [2, 8.1, 0, 12, 0], [2, 17, 0, 4, 0], [1, 12, 16.2, 5, 0], [3, 3.3, 0, 6, 0]],
  },
  {
    wat: "drie steunpunten, links ingeklemd, overstek rechts",
    geo: [V(0, 2), V(5.5, 1), V(9.0, 1), V(11.0, 0)],
    last: [[1, 0, 11, 2, 2], [2, 2.5, 0, 15, 0], [1, 9, 11, 0, 8]],
  },
  {
    wat: "gerberligger op drie steunpunten met scharnier en trapeziumlast",
    geo: [V(0, 1), V(7, 1), V(8.5, 3), V(13, 1)],
    last: [[1, 0, 13, 4, 1.5], [2, 10, 0, 20, 0], [3, 5, 0, -7, 0]],
  },
  {
    wat: "tweezijdig ingeklemd met tussensteunpunt en driehoekslast",
    geo: [V(0, 2), V(4, 1), V(10, 2)],
    last: [[1, 1, 10, 0, 9], [2, 4, 0, 30, 0], [2, 7.3, 0, 11, 0]],
  },
  {
    wat: "uitkraging met deellast, puntlast en puntmoment",
    geo: [V(0, 0), V(3.5, 2)],
    last: [[1, 0.5, 2.5, 6, 2], [2, 0, 0, 5, 0], [3, 1.7, 0, 3, 0]],
  },
  {
    wat: "vier steunpunten met twee scharnieren (gerber) en overstek links",
    geo: [V(0, 0), V(1.5, 1), V(7.5, 1), V(9.0, 3), V(13.0, 3), V(14.5, 1), V(20.5, 1)],
    last: [[1, 0, 20.5, 5, 5], [2, 11, 0, 25, 0], [1, 14.5, 20.5, 2, 2]],
  },
];

for (const g of GEVALLEN) {
  const n0 = tel();
  const EIg = 12000;
  const o = onafhankelijk(g.geo, g.last, EIg);
  const xL = o.xs[o.xs.length - 1];
  const vergelijk = Array.from({ length: 199 }, (_, k) => (xL * (k + 1.37)) / 200).filter((x) => x < xL);
  const R = liggerOplossing(g.geo, g.last, EIg, undefined, 0, vergelijk);
  const RR = liggerReacties(g.geo, g.last, EIg);
  const Mmax = Math.max(...o.xs.map((_, i) => Math.abs(o.M(i))));
  const Vmax = Math.max(...o.xs.map((_, i) => Math.abs(o.V(i))));
  const wmax = Math.max(...o.xs.map((_, i) => Math.abs(o.w(i))));
  let grootste = { M: 0, V: 0, w: 0 };
  // Vergelijken in 200 punten die niet op een sprong liggen.
  for (const x of vergelijk) {
    const i = o.xs.findIndex((v) => v >= x);
    const t = (x - o.xs[i - 1]) / (o.xs[i] - o.xs[i - 1]);
    const lin = (f) => f(i - 1) + t * (f(i) - f(i - 1));
    for (const [gr, f, schaal] of [["M", o.M, Mmax], ["V", o.V, Vmax], ["w", o.w, wmax]]) {
      const d = Math.abs(op(R, gr, x) - lin(f)) / schaal;
      grootste[gr] = Math.max(grootste[gr], d);
    }
  }
  waar(`${g.wat}: M langs de ligger`, grootste.M < 1e-4, `grootste afwijking ${grootste.M.toExponential(2)} van M_max`);
  waar(`${g.wat}: V langs de ligger`, grootste.V < 1e-4, `grootste afwijking ${grootste.V.toExponential(2)} van V_max`);
  waar(`${g.wat}: w langs de ligger`, grootste.w < 1e-4, `grootste afwijking ${grootste.w.toExponential(2)} van w_max`);
  for (const [x, Ro] of o.reacties) {
    const Rk = reactie(RR, x);
    waar(`${g.wat}: reactie in x = ${x}`, Math.abs(Rk - Ro) <= 2e-4 * Math.max(1, Vmax), `${Rk} tegen ${Ro}`);
  }
  // Evenwicht: som van de reacties = som van de lasten.
  const som = g.last.reduce((s, [soort, a, b, qa, qb]) => s + (soort === 1 ? ((qa + qb) / 2) * Math.abs(b - a) : soort === 2 ? qa : 0), 0);
  gelijk(`${g.wat}: som van de reacties = som van de lasten`, RR.reduce((s, r) => s + r[1], 0), som, 1e-9);
  console.log(`  ${grootste.M < 1e-4 && grootste.V < 1e-4 && grootste.w < 1e-4 ? "OK    " : "FOUT  "} ${g.wat} (${tel() - n0} vergelijkingen, M ${grootste.M.toExponential(1)}, V ${grootste.V.toExponential(1)}, w ${grootste.w.toExponential(1)})`);
}

// ── 3. Omhullende tegen alle patronen ────────────────────────────────────────
kop("3. Omhullende tegen het doorrekenen van alle patronen");
{
  /**
   * Brute kracht: elke veranderlijke last aan of uit per deel (2^n patronen
   * per last), elke keuze van de overheersende last, en de permanente last met
   * de ongunstige of de gunstige factor (één bron) of per deel (EQU).
   */
  function bruut(geo, last, EIb, groep, f1, f2, teken, lead, alsReactie) {
    const nD = liggerDelen(geo).length;
    const grp = [...new Set(groep.filter((g) => g >= 1))];
    const basisX = liggerOmhullende(geo, last, EIb, groep, f1, f2, 1, 0).map((r) => r[0]);
    // Eén last op één deel, op de punten van het vaste raster (de oplossing
    // heeft daar nog de toppen tussen staan; die vallen hier weg).
    const eenheid = (j, d) => {
      const f = last.map((_, i) => (i === j ? 1 : 0));
      if (alsReactie) return liggerReacties(geo, last, EIb, f, d);
      const R = liggerOplossing(geo, last, EIb, f, d);
      const uit = [];
      let i = 0;
      for (const x of basisX) {
        while (i < R.length && Math.abs(R[i][0] - x) > 1e-9) i++;
        uit.push(R[i++]);
      }
      return uit;
    };
    const cache = {};
    const U = (j, d) => (cache[`${j}/${d}`] ??= eenheid(j, d));
    const nK = alsReactie ? 2 : 3;
    const nP = alsReactie ? liggerReacties(geo, last, EIb).length : basisX.length;
    const s = teken;
    const best = Array.from({ length: nP }, () => new Array(nK).fill(-Infinity));
    const gRijen = last.map((_, j) => j).filter((j) => groep[j] === 0);
    const eRijen = last.map((_, j) => j).filter((j) => groep[j] < 0);
    const leads = lead >= 1 ? [lead] : grp.length ? grp : [0];
    // Alle patronen: per groep (en per EQU-rij) een bitmasker over de delen.
    const maskers = (n) => {
      const uit = [[]];
      for (let i = 0; i < n; i++) {
        const nieuw = [];
        for (const m of uit) for (let b = 0; b < 1 << nD; b++) nieuw.push([...m, b]);
        uit.splice(0, uit.length, ...nieuw);
      }
      return uit;
    };
    const patronen = maskers(grp.length);
    const eqPatronen = maskers(eRijen.length);
    const aan = (m, d) => (m >> (d - 1)) & 1;
    for (const ld of leads) for (const pat of patronen) for (const gKeuze of [0, 1]) for (const eq of eqPatronen) {
      for (let p = 0; p < nP; p++) for (let k = 0; k < nK; k++) {
        let T = 0;
        for (const j of gRijen) T += (gKeuze ? f1[j] : f2[j]) * U(j, 0)[p][k + 1];
        eRijen.forEach((j, e) => {
          for (let d = 1; d <= nD; d++) T += (aan(eq[e], d) ? f1[j] : f2[j]) * U(j, d)[p][k + 1];
        });
        grp.forEach((g, gi) => {
          for (let d = 1; d <= nD; d++) {
            if (!aan(pat[gi], d)) continue;
            for (let j = 0; j < last.length; j++) if (groep[j] === g) T += (g === ld ? f1[j] : f2[j]) * U(j, d)[p][k + 1];
          }
        });
        best[p][k] = Math.max(best[p][k], s * T);
      }
    }
    return best.map((r) => r.map((v) => s * v));
  }

  const q = 3, g = 2;
  const opstellingen = [
    {
      wat: "drie velden, G en twee veranderlijke lasten",
      geo: [V(0, 1), V(5, 1), V(10, 1), V(15, 1)],
      last: [[1, 0, 15, g, g], [1, 0, 15, q, q], [2, 7.5, 0, 10, 0]],
      groep: [0, 1, 2], f1: [1.2, 1.5, 1.5], f2: [0.9, 1.5 * 0.4, 1.5 * 0.5],
    },
    {
      wat: "veld met overstek, G gunstig in het veld",
      geo: [V(0, 1), V(6, 1), V(8.5, 0)],
      last: [[1, 0, 8.5, g, g], [1, 0, 8.5, q, q]],
      groep: [0, 1], f1: [1.35, 1.5 * 0.4], f2: [0.9, 1.5 * 0.4],
    },
    {
      wat: "evenwicht (EQU) met G per deel",
      geo: [V(0, 1), V(6, 1), V(8.5, 0)],
      last: [[1, 0, 8.5, g, g], [2, 8.5, 0, 6, 0]],
      groep: [-1, 1], f1: [1.1, 1.5], f2: [0.9, 1.5],
    },
    {
      wat: "gerber met scharnier en drie veranderlijke lasten",
      geo: [V(0, 1), V(6, 1), V(7.5, 3), V(12, 1)],
      last: [[1, 0, 12, g, g], [1, 0, 12, q, q], [2, 3, 0, 8, 0], [1, 7.5, 12, 0, 4]],
      groep: [0, 1, 2, 3], f1: [1.2, 1.5, 1.5, 1.5], f2: [0.9, 0.6, 0.75, 0],
    },
  ];
  for (const o of opstellingen) {
    for (const teken of [1, -1]) {
      for (const lead of [0, 1]) {
        const O = liggerOmhullende(o.geo, o.last, EI, o.groep, o.f1, o.f2, teken, lead);
        const B = bruut(o.geo, o.last, EI, o.groep, o.f1, o.f2, teken, lead, false);
        let d = 0, schaal = 1e-9;
        O.forEach((r, i) => {
          for (let k = 0; k < 3; k++) {
            d = Math.max(d, Math.abs(r[k + 1] - B[i][k]));
            schaal = Math.max(schaal, Math.abs(B[i][k]));
          }
        });
        waar(`${o.wat}, teken ${teken}, lead ${lead}: omhullende`, d <= 1e-9 * Math.max(1, schaal) * 1e3, `afwijking ${d}`);
        const OR = liggerOmhullendeReacties(o.geo, o.last, EI, o.groep, o.f1, o.f2, teken, lead);
        const BR = bruut(o.geo, o.last, EI, o.groep, o.f1, o.f2, teken, lead, true);
        let dr = 0;
        OR.forEach((r, i) => { for (let k = 0; k < 2; k++) dr = Math.max(dr, Math.abs(r[k + 1] - BR[i][k])); });
        waar(`${o.wat}, teken ${teken}, lead ${lead}: reacties`, dr <= 1e-8, `afwijking ${dr}`);
      }
    }
    console.log(`  OK     ${o.wat}`);
  }
  // Bekende waarden: twee gelijke velden, veranderlijke last schaakbord.
  {
    const L = 5;
    const geo = [V(0, 1), V(L, 1), V(2 * L, 1)];
    const last = [[1, 0, 2 * L, 0, 0], [1, 0, 2 * L, q, q]];
    const O = liggerOmhullende(geo, last, EI, [0, 1], [0, 1], [0, 1], 1, 0);
    gelijk("schaakbord: grootste veldmoment = 49qL²/512", liggerExtremen(O, 3, 0, L)[0], (49 * q * L * L) / 512, 2e-3);
    const Om = liggerOmhullende(geo, last, EI, [0, 1], [0, 1], [0, 1], -1, 0);
    gelijk("schaakbord: steunmoment = −qL²/8 (beide velden)", liggerExtremen(Om, 3)[2], (-q * L * L) / 8);
    const ORm = liggerOmhullendeReacties(geo, last, EI, [0, 1], [0, 1], [0, 1], -1, 0);
    gelijk("schaakbord: kleinste R_A = −qL/16 (alleen veld 2)", ORm[0][1], (-q * L) / 16);
  }
}

// ── 4. Hulpfuncties en het rekenblad ─────────────────────────────────────────
kop("4. Hulpfuncties en gebruik vanuit een rekenblad");
{
  const geo = [V(0, 0), V(1, 1), V(6, 1), V(6, 3), V(9, 1), V(10.5, 0)];
  const d = liggerDelen(geo);
  waar("delen: overstek, veld, veld, overstek", JSON.stringify(d) === JSON.stringify([[0, 1], [1, 6], [6, 9], [9, 10.5]]), JSON.stringify(d));
  const v = liggerVelden(geo);
  waar("velden met overstek-kenmerk", JSON.stringify(v) === JSON.stringify([[0, 1, 1], [1, 6, 0], [6, 9, 0], [9, 10.5, 1]]), JSON.stringify(v));
  const d2 = liggerDelen([V(0, 1), V(6, 1), V(7.5, 3), V(12, 1)]);
  waar("delen: gesplitst op het scharnier", JSON.stringify(d2) === JSON.stringify([[0, 6], [6, 7.5], [7.5, 12]]), JSON.stringify(d2));

  const R = [[0, 1, 0, 0], [1, 1, 2, 0], [1, -3, 2, 0], [2, -3, -1, 0]];
  const e = liggerExtremen(R, 2);
  waar("uitersten: [max, x, min, x]", JSON.stringify(e) === JSON.stringify([1, 0, -3, 1]), JSON.stringify(e));
  gelijk("interpolatie tussen punten", liggerInterpoleer(R, 3, 1.5), 0.5);
  gelijk("interpolatie op een sprong: rechts", liggerInterpoleer(R, 2, 1), -3);
  gelijk("nulpunt vanaf x = 2 naar links", liggerNulpunt(R, 3, 2, 1), 5 / 3, 1e-6);
  waar("SVG-punten", liggerSvgPunten(R, 3, 10, 2, 50, -1) === "10,50 12,48 12,48 14,51", liggerSvgPunten(R, 3, 10, 2, 50, -1));
  const S = liggerSamen(1, R, [[0, 2, -1, 5], [1, 0, 3, 0], [1, -4, 3, 1], [2, 0, 0, 0]]);
  waar("samen, grootste", JSON.stringify(S) === JSON.stringify([[0, 2, 0, 5], [1, 1, 3, 0], [1, -3, 3, 1], [2, 0, 0, 0]]), JSON.stringify(S));
  const Sm = liggerSamen(-1, R, [[0, 2, -1, 5], [1, 0, 3, 0], [1, -4, 3, 1], [2, 0, 0, 0]]);
  waar("samen, kleinste", JSON.stringify(Sm) === JSON.stringify([[0, 1, -1, 0], [1, 0, 2, 0], [1, -4, 2, 0], [2, -3, -1, 0]]), JSON.stringify(Sm));

  // Via het rekenblad: CalcPAD-matrices, eenheden, en de functies zelf.
  const bron = [
    "EI = 210000 N/mm^2*8356 cm^4",
    "geo = [0; 6 | 1; 1]",
    "last = [1; 2 | 0; 3 | 6; 0 | 4; 10 | 4; 0]",
    "R = ligger(geo; last; EI)",
    "e = ligger_ext(R; 3)",
    "M_max = e.1",
    "w_mid = ligger_int(R; 4; 3)",
    "RR = ligger_R(geo; last; EI)",
    "R_A = RR.(1; 2)",
    "O = ligger_omh(geo; last; EI; [0; 1]; [1.2; 1.5]; [0.9; 0.6]; 1; 0)",
    "eO = ligger_ext(O; 3)",
    "M_d = eO.1",
    "Oa = ligger_omh(geo; last; EI; [0; 1]; [1.35; 0.6]; [0.9; 0.6]; 1; 0)",
    "Os = ligger_max(O; Oa)",
    "eS = ligger_ext(Os; 3)",
    "M_s = eS.1",
    "s = ligger_status(geo)",
    "n = n_rows(ligger_velden(geo))",
    "p = ligger_svg(R; 3; 0; 10; 0; 1)",
  ].join("\n");
  const knopen = evaluate(parse(bron), {});
  const uit = {};
  for (const k of knopen) if (k.type === "assignment") uit[k.name] = k.result;
  const EIkNm2 = 210e6 * 8356e-8;
  const L = 6, q = 4, F = 10;
  gelijk("blad: M_max = qL²/8 + FL/4", parseFloat(uit.M_max), (q * L * L) / 8 + (F * L) / 4, 1e-3);
  gelijk("blad: w midden (m), EI omgerekend naar kNm²", parseFloat(uit.w_mid), (5 * q * L ** 4) / (384 * EIkNm2) + (F * L ** 3) / (48 * EIkNm2), 1e-3);
  gelijk("blad: R_A = qL/2 + F/2", parseFloat(uit.R_A), (q * L) / 2 + F / 2, 1e-3);
  gelijk("blad: omhullende 1,2·G + 1,5·Q", parseFloat(uit.M_d), 1.2 * (q * L * L) / 8 + 1.5 * (F * L) / 4, 1e-3);
  gelijk("blad: ligger_max van 6.10a en 6.10b", parseFloat(uit.M_s), Math.max(1.2 * (q * L * L) / 8 + 1.5 * (F * L) / 4, 1.35 * (q * L * L) / 8 + 0.6 * (F * L) / 4), 1e-3);
  waar("blad: status 1", uit.s === "1", uit.s);
  waar("blad: één veld", uit.n === "1", uit.n);
  waar("blad: SVG-punten zijn tekst met getallen", /^[\d., -]+$/.test(String(uit.p)), String(uit.p).slice(0, 40));
  waar("blad: geen foutmelding", !Object.values(uit).some((v) => /Error/.test(String(v))), JSON.stringify(uit).slice(0, 200));
}

console.log(
  fouten === 0
    ? `\nLigger in de kern: alles klopt (${getest} vergelijkingen).`
    : `\nLigger in de kern: ${fouten} van ${getest} vergelijkingen wijken af.`,
);
process.exit(fouten === 0 ? 0 : 1);
