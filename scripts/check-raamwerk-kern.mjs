/**
 * Controlescript voor het raamwerk in de rekenkern (packages/core/src/raamwerk.ts).
 *
 *   1. Gesloten oplossingen: het portaal met twee scharnieren en het
 *      ingeklemde portaal onder een gelijkmatige last op de regel en onder een
 *      horizontale last (knoopmomenten, reacties, zijdelingse verplaatsing), een
 *      A-spant met nokscharnier en trekband en zonder trekband (driescharnier-
 *      spant), een ingeklemde kolom, de lastrichtingen (per m staaf, per m
 *      horizontale projectie, loodrecht op de staaf, langs de staaf), een
 *      puntlast, een moment en een scharnier; ook de herkenning van een
 *      beweeglijk en een ongeldig raamwerk. De kritieke belastingsfactor α_cr:
 *      de knikkracht van Euler, de uitkraging en het verplaatsbare portaal met
 *      scharnierende en met ingeklemde voeten (λ·tan λ = 6·I_r·h/(I_k·L) en
 *      tan λ = −λ·I_k·L/(6·I_r·h)).
 *   2. Een onafhankelijke numerieke oplossing: het raamwerk als keten van
 *      staven, vanaf de eerste oplegging doorgerekend. De snedekrachten volgen
 *      uit het evenwicht van het deel achter de snede (statica, de verdeelde
 *      lasten per stapje samengenomen), de verplaatsingen uit het integreren
 *      van de rek en de kromming (trapeziumregel op een fijn raster). De
 *      onbekenden — de reactie in de eerste oplegging, de beginrotatie of het
 *      inklemmingsmoment, de hoekverdraaiing in een scharnier en de kracht in
 *      een trekband — volgen uit de randvoorwaarden aan het eind, M = 0 in de
 *      scharnieren en de rek van de trekband. Geen stijfheidsmatrix, geen
 *      vormfuncties: een andere rekenweg dan de kern. Vergeleken worden N, V,
 *      M, u_x en u_y langs alle staven en de reacties, voor een reeks
 *      samengestelde raamwerken met alle soorten lasten.
 *   3. Het evenwicht van het hele raamwerk en de hulpfuncties (uitersten,
 *      interpolatie, SVG-punten, verplaatste vorm) en het gebruik vanuit een
 *      rekenblad, met CalcPAD-matrices en grootheden met eenheid.
 *   4. De afschuifvervorming (GA in de zevende kolom van de staven): gesloten
 *      formules met de term ∫V/GA en de knik van een pendelstaaf tegen Engesser.
 *
 * Draaien:  node scripts/check-raamwerk-kern.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import {
  raamwerkOplossing, raamwerkReacties, raamwerkVerplaatsingen, raamwerkStatus, raamwerkExtremen,
  raamwerkInterpoleer, raamwerkSvgPunten, raamwerkVormPunten, raamwerkKnik, raamwerkSamenvatting, raamwerkZakking,
  parse, evaluate,
} from "../packages/core/dist/index.js";

let fouten = 0;
let getest = 0;
const rel = (a, b) => Math.abs(a - b) / Math.max(1e-9, Math.abs(b), 1e-6);
function gelijk(wat, uit, verwacht, tol = 1e-6, abs = 1e-9) {
  getest++;
  const ok = Number.isFinite(uit) && (Math.abs(uit - verwacht) <= abs || rel(uit, verwacht) <= tol);
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

// Kolommen van de uitkomst: [staaf, s, x, y, N, V, M, u_x, u_y, w].
const K = { N: 5, V: 6, M: 7, ux: 8, uy: 9, w: 10 };
const op = (R, staaf, g, s) => raamwerkInterpoleer(R, staaf, K[g], s);
const reactie = (RR, knoop) => RR.find((r) => r[0] === knoop) ?? [knoop, NaN, NaN, NaN];
/** Heel stijf in de lengte: de gesloten formules verwaarlozen de rek. */
const STIJF = 1e11;

// ── 1. Gesloten oplossingen ─────────────────────────────────────────────────
kop("1. Gesloten oplossingen");
{
  const L = 10, h = 5, EIk = 20000, EIr = 40000, q = 4, H = 10;
  const kn = [[0, 0], [0, h], [L, h], [L, 0]];
  const st = [[1, 2, EIk, STIJF, 0, 0], [2, 3, EIr, STIJF, 0, 0], [3, 4, EIk, STIJF, 0, 0]];
  const k = (EIr / EIk) * (h / L);
  const scharnier = [[1, 1, 1, 0], [4, 1, 1, 0]];
  const klem = [[1, 1, 1, 1], [4, 1, 1, 1]];
  const qLast = [[2, 1, 0, L, q, q, 2]];
  const hLast = [[2, 3, 0, 0, H, 0, 1]];

  // Portaal met twee scharnieren, q op de regel: H = qL²/(4h(2k + 3)).
  {
    const R = raamwerkOplossing(kn, st, scharnier, qLast, undefined, 1);
    const RR = raamwerkReacties(kn, st, scharnier, qLast);
    const Mk = -(q * L * L) / (4 * (2 * k + 3));
    gelijk("portaal 2 scharnieren, q: knoopmoment −qL²/(4(2k + 3))", op(R, 2, "M", 0), Mk);
    gelijk("portaal 2 scharnieren, q: knoopmoment in de kolom", op(R, 1, "M", h), Mk);
    gelijk("portaal 2 scharnieren, q: veldmoment qL²/8 + M_k", raamwerkExtremen(R, 2, K.M)[0], (q * L * L) / 8 + Mk);
    gelijk("portaal 2 scharnieren, q: veldmoment in het midden", raamwerkExtremen(R, 2, K.M)[1], L / 2);
    gelijk("portaal 2 scharnieren, q: H_A = qL²/(4h(2k + 3))", reactie(RR, 1)[1], (q * L * L) / (4 * h * (2 * k + 3)));
    gelijk("portaal 2 scharnieren, q: V_A = qL/2", reactie(RR, 1)[2], (q * L) / 2);
    gelijk("portaal 2 scharnieren, q: N in de kolom = −qL/2", op(R, 1, "N", h / 2), (-q * L) / 2);
    gelijk("portaal 2 scharnieren, q: N in de regel = −H", op(R, 2, "N", L / 2), -(q * L * L) / (4 * h * (2 * k + 3)));
    gelijk("portaal 2 scharnieren, q: M aan de voet = 0", op(R, 1, "M", 0), 0, 1e-6, 1e-9);
    gelijk("portaal 2 scharnieren, q: V aan het begin van de regel = qL/2", op(R, 2, "V", 0), (q * L) / 2);
  }
  // Ingeklemd portaal, q op de regel: M_k = −qL²/(6(k + 2)), M_voet = qL²/(12(k + 2)).
  {
    const R = raamwerkOplossing(kn, st, klem, qLast, undefined, 1);
    const RR = raamwerkReacties(kn, st, klem, qLast);
    const Mk = -(q * L * L) / (6 * (k + 2));
    gelijk("ingeklemd portaal, q: knoopmoment −qL²/(6(k + 2))", op(R, 2, "M", 0), Mk);
    gelijk("ingeklemd portaal, q: voetmoment qL²/(12(k + 2))", op(R, 1, "M", 0), (q * L * L) / (12 * (k + 2)));
    gelijk("ingeklemd portaal, q: veldmoment qL²/8 + M_k", op(R, 2, "M", L / 2), (q * L * L) / 8 + Mk);
    gelijk("ingeklemd portaal, q: H_A = 3·M_voet/h", reactie(RR, 1)[1], (3 * (q * L * L)) / (12 * (k + 2)) / h);
    gelijk("ingeklemd portaal, q: inklemmingsmoment als reactie (rechtsom)", reactie(RR, 1)[3], (q * L * L) / (12 * (k + 2)));
  }
  // Horizontale last H in de linker knoop.
  {
    const R = raamwerkOplossing(kn, st, scharnier, hLast);
    const RR = raamwerkReacties(kn, st, scharnier, hLast);
    const u = raamwerkVerplaatsingen(kn, st, scharnier, hLast);
    gelijk("portaal 2 scharnieren, H: knoopmoment H·h/2", op(R, 1, "M", h), (H * h) / 2);
    gelijk("portaal 2 scharnieren, H: H_A = −H/2", reactie(RR, 1)[1], -H / 2);
    gelijk("portaal 2 scharnieren, H: V_A = −H·h/L", reactie(RR, 1)[2], (-H * h) / L);
    gelijk("portaal 2 scharnieren, H: δ = H·h²/12·(2h/EI_k + L/EI_r)", u[1][1], ((H * h * h) / 12) * ((2 * h) / EIk + L / EIr));
    gelijk("portaal 2 scharnieren, H: δ rechts gelijk", u[2][1], u[1][1], 1e-6);
  }
  {
    const R = raamwerkOplossing(kn, st, klem, hLast);
    const u = raamwerkVerplaatsingen(kn, st, klem, hLast);
    gelijk("ingeklemd portaal, H: voetmoment −(Hh/2)(3k + 1)/(6k + 1)", op(R, 1, "M", 0), -((H * h) / 2) * ((3 * k + 1) / (6 * k + 1)));
    gelijk("ingeklemd portaal, H: knoopmoment (Hh/2)·3k/(6k + 1)", op(R, 1, "M", h), ((H * h) / 2) * ((3 * k) / (6 * k + 1)));
    gelijk("ingeklemd portaal, H: δ = Hh³(2 + 3k)/(12EI_k(1 + 6k))", u[1][1], (H * h ** 3 * (2 + 3 * k)) / (12 * EIk * (1 + 6 * k)));
  }

  // A-spant: nokscharnier, vast scharnier links, rol rechts, trekband (pendelstaaf).
  {
    const B = 8, f = 3, qs = 2.5;
    const knA = [[0, 0], [B / 2, f], [B, 0]];
    const stA = [[1, 2, 5000, STIJF, 0, 1], [2, 3, 5000, STIJF, 0, 0], [1, 3, 1, 2e5, 1, 1]];
    const opA = [[1, 1, 1, 0], [3, 0, 1, 0]];
    const lA = [[1, 1, 0, 10, qs, qs, 3], [2, 1, 0, 10, qs, qs, 3]];
    const R = raamwerkOplossing(knA, stA, opA, lA, undefined, 1);
    const RR = raamwerkReacties(knA, stA, opA, lA);
    const Ls = Math.hypot(B / 2, f);
    gelijk("A-spant met trekband: trekkracht qB²/(8f)", op(R, 3, "N", B / 2), (qs * B * B) / (8 * f));
    gelijk("A-spant met trekband: V_A = qB/2", reactie(RR, 1)[2], (qs * B) / 2);
    gelijk("A-spant met trekband: H_A = 0", reactie(RR, 1)[1], 0, 1e-6, 1e-8);
    gelijk("A-spant met trekband: M midden spoor = q(B/2)²/8", op(R, 1, "M", Ls / 2), (qs * (B / 2) ** 2) / 8);
    gelijk("A-spant met trekband: M in het nokscharnier = 0", op(R, 1, "M", Ls), 0, 1e-6, 1e-8);
    const sin = f / Ls, cos = (B / 2) / Ls;
    gelijk("A-spant met trekband: N aan de voet = −(V·sin + H·cos)", op(R, 1, "N", 0), -((qs * B) / 2 * sin + (qs * B * B) / (8 * f) * cos));
    // Zonder trekband, twee vaste scharnieren: dezelfde spatkracht als reactie.
    const R2 = raamwerkReacties(knA, stA.slice(0, 2), [[1, 1, 1, 0], [3, 1, 1, 0]], lA);
    gelijk("driescharnierspant: H_A = qB²/(8f)", reactie(R2, 1)[1], (qs * B * B) / (8 * f));
    gelijk("driescharnierspant: H_B = −qB²/(8f)", reactie(R2, 3)[1], -(qs * B * B) / (8 * f));
  }

  // Ingeklemde kolom met de lastrichtingen.
  {
    const Hk = 4, EI = 3000, w = 1.5;
    const knK = [[0, 0], [0, Hk]];
    const stK = [[1, 2, EI, STIJF, 0, 0]];
    const opK = [[1, 1, 1, 1]];
    // Loodrecht op de staaf (richting 4): van onder naar boven is de rechterkant +x.
    const R = raamwerkOplossing(knK, stK, opK, [[1, 1, 0, Hk, w, w, 4]]);
    const u = raamwerkVerplaatsingen(knK, stK, opK, [[1, 1, 0, Hk, w, w, 4]]);
    gelijk("kolom, wind loodrecht: voetmoment −wH²/2 (trek links)", op(R, 1, "M", 0), (-w * Hk * Hk) / 2);
    gelijk("kolom, wind loodrecht: kopverplaatsing wH⁴/(8EI)", u[1][1], (w * Hk ** 4) / (8 * EI));
    gelijk("kolom, wind loodrecht: kophoek wH³/(6EI), rechtsom", u[1][3], (w * Hk ** 3) / (6 * EI));
    // Dezelfde last als richting 1 (globaal x) geeft hetzelfde.
    const R1 = raamwerkOplossing(knK, stK, opK, [[1, 1, 0, Hk, w, w, 1]]);
    gelijk("kolom, last in x: gelijk aan loodrecht", op(R1, 1, "M", 0), (-w * Hk * Hk) / 2);
    // Langs de staaf (richting 5) en verticaal (2): normaalkracht, geen moment.
    const R5 = raamwerkOplossing(knK, stK, opK, [[1, 1, 0, Hk, 2, 2, 5]]);
    gelijk("kolom, last langs de staaf (omhoog, de voet houdt vast): trek N(0) = 2·H", op(R5, 1, "N", 0), 2 * Hk);
    const R2 = raamwerkOplossing(knK, stK, opK, [[1, 1, 0, Hk, 2, 2, 2]]);
    gelijk("kolom, eigen gewicht: N(0) = −2·H", op(R2, 1, "N", 0), -2 * Hk);
    gelijk("kolom, eigen gewicht: geen moment", raamwerkExtremen(R2, 1, K.M)[0], 0, 1e-6, 1e-9);
    // Een moment in de kop, rechtsom: het moment in de kolom is overal gelijk.
    const Rm = raamwerkOplossing(knK, stK, opK, [[2, 3, 0, 0, 5, 0, 6]]);
    gelijk("kolom, knoopmoment rechtsom: M = −5 langs de hele kolom (trek links)", op(Rm, 1, "M", 1), -5);
    const um = raamwerkVerplaatsingen(knK, stK, opK, [[2, 3, 0, 0, 5, 0, 6]]);
    gelijk("kolom, knoopmoment: kophoek MH/EI rechtsom", um[1][3], (5 * Hk) / EI);
    gelijk("kolom, knoopmoment: kopverplaatsing MH²/(2EI)", um[1][1], (5 * Hk * Hk) / (2 * EI));
  }

  // Schuine ligger op twee steunpunten: per m horizontale projectie tegen per m staaf.
  {
    const Lh = 6, dz = 2.5, qv = 3;
    const Ls = Math.hypot(Lh, dz);
    const knS = [[0, 0], [Lh, dz]];
    const stS = [[1, 2, 8000, STIJF, 0, 0]];
    const opS = [[1, 1, 1, 0], [2, 0, 1, 0]];
    const Rp = raamwerkOplossing(knS, stS, opS, [[1, 1, 0, Ls, qv, qv, 3]], undefined, 1);
    gelijk("schuine ligger, q per m projectie: M_max = qL_h²/8", raamwerkExtremen(Rp, 1, K.M)[0], (qv * Lh * Lh) / 8);
    const Rs = raamwerkOplossing(knS, stS, opS, [[1, 1, 0, Ls, qv, qv, 2]], undefined, 1);
    gelijk("schuine ligger, q per m staaf: M_max = q·L_s·L_h/8", raamwerkExtremen(Rs, 1, K.M)[0], (qv * Ls * Lh) / 8);
    // Puntlast F in het midden en een trapezium op een deel.
    const F = 7;
    const RF = raamwerkOplossing(knS, stS, opS, [[1, 2, Ls / 2, 0, F, 0, 2]]);
    gelijk("schuine ligger, puntlast: M = F·L_h/4", op(RF, 1, "M", Ls / 2), (F * Lh) / 4);
    gelijk("schuine ligger, puntlast: sprong in V = F·cos α", op(RF, 1, "V", Ls / 2) - RF.find((r) => Math.abs(r[1] - Ls / 2) < 1e-9)[5], -F * (Lh / Ls));
  }

  // Scharnier: driescharnierportaal met het scharnier midden in de regel.
  {
    const kn3 = [[0, 0], [0, h], [L / 2, h], [L, h], [L, 0]];
    const st3 = [[1, 2, EIk, STIJF, 0, 0], [2, 3, EIr, STIJF, 0, 1], [3, 4, EIr, STIJF, 0, 0], [4, 5, EIk, STIJF, 0, 0]];
    const l3 = [[2, 1, 0, L / 2, q, q, 2], [3, 1, 0, L / 2, q, q, 2]];
    const R = raamwerkOplossing(kn3, st3, scharnier.map((r) => (r[0] === 4 ? [5, 1, 1, 0] : r)), l3);
    gelijk("driescharnierportaal: knoopmoment −qL²/8", op(R, 1, "M", h), (-q * L * L) / 8);
    gelijk("driescharnierportaal: M in het scharnier = 0", op(R, 2, "M", L / 2), 0, 1e-6, 1e-8);
    // Een scharnier te veel: beweeglijk.
    const st4 = st3.map((r) => (r[0] === 1 ? [1, 2, EIk, STIJF, 0, 1] : r));
    waar("beweeglijk: scharnier in de knie erbij", raamwerkStatus(kn3, st4, [[1, 1, 1, 0], [5, 1, 1, 0]]) === -1);
    waar("beweeglijk: alleen rollen", raamwerkStatus(kn, st, [[1, 0, 1, 0], [4, 0, 1, 0]]) === -1);
    waar("ongeldig: staaf van lengte nul", raamwerkStatus([[0, 0], [0, 0]], [[1, 2, 1, 1, 0, 0]], [[1, 1, 1, 1]]) === 0);
    waar("ongeldig: knoop bestaat niet", raamwerkStatus(kn, [[1, 7, 1, 1, 0, 0]], klem) === 0);
    waar("ongeldig: EI nul", raamwerkStatus(kn, [[1, 2, 0, 1, 0, 0]], klem) === 0);
    waar("stabiel: ongebruikte staafrij telt niet", raamwerkStatus(kn, [...st, [0, 0, 0, 0, 0, 0]], klem) === 1);
    const leeg = raamwerkOplossing(kn3, st4, [[1, 1, 1, 0], [5, 1, 1, 0]], l3);
    waar("beweeglijk: één rij nullen", leeg.length === 1 && leeg[0].every((v) => v === 0));
  }

  // Kritieke belastingsfactor.
  {
    const EI = 1000, Hk = 5;
    const euler = raamwerkKnik([[0, 0], [0, Hk]], [[1, 2, EI, 1e8, 0, 0]], [[1, 1, 1, 0], [2, 1, 0, 0]], [[2, 3, 0, 0, 1, 0, 2]]);
    gelijk("α_cr: Euler, scharnierend-scharnierend π²EI/L²", euler, (Math.PI ** 2 * EI) / Hk ** 2, 3e-4);
    const kraag = raamwerkKnik([[0, 0], [0, Hk]], [[1, 2, EI, 1e8, 0, 0]], [[1, 1, 1, 1]], [[2, 3, 0, 0, 1, 0, 2]]);
    gelijk("α_cr: uitkraging π²EI/(2L)²", kraag, (Math.PI ** 2 * EI) / (2 * Hk) ** 2, 3e-4);
    const dubbel = raamwerkKnik([[0, 0], [0, Hk]], [[1, 2, EI, 1e8, 0, 0]], [[1, 1, 1, 0], [2, 1, 0, 0]], [[2, 3, 0, 0, 2.5, 0, 2]]);
    gelijk("α_cr: tweemaal de last, de helft van de factor", dubbel, euler / 2.5, 1e-6);
    waar("α_cr: alleen trek, geen knik (10⁶)", raamwerkKnik([[0, 0], [0, Hk]], [[1, 2, EI, 1e8, 0, 0]], [[1, 1, 1, 1]], [[2, 3, 0, 0, -1, 0, 2]]) === 1e6);
    // Verplaatsbaar portaal, P op elke kolom (C_A = I_k·L/(6·I_r·h), NB.NA.1.3(2)).
    const P = [[2, 3, 0, 0, 1, 0, 2], [3, 3, 0, 0, 1, 0, 2]];
    const cA = (EIk / h) / ((6 * EIr) / L);
    const wortel = (fn, lo, hi) => {
      for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (fn(lo) * fn(m) <= 0) hi = m; else lo = m; }
      return (lo + hi) / 2;
    };
    const λs = wortel((l) => l * Math.tan(l) - 1 / cA, 1e-9, Math.PI / 2 - 1e-9);
    gelijk("α_cr: portaal 2 scharnieren, λ·tan λ = 1/C_A", raamwerkKnik(kn, st, scharnier, P), (λs ** 2 * EIk) / h ** 2, 3e-4);
    const λk = wortel((l) => Math.tan(l) + cA * l, Math.PI / 2 + 1e-9, Math.PI - 1e-9);
    gelijk("α_cr: ingeklemd portaal, tan λ = −C_A·λ", raamwerkKnik(kn, st, klem, P), (λk ** 2 * EIk) / h ** 2, 3e-4);
    waar("α_cr: beweeglijk raamwerk geeft 0", raamwerkKnik(kn, st, [[1, 0, 1, 0], [4, 0, 1, 0]], P) === 0);
  }
}

// ── 2. Onafhankelijke oplossing ─────────────────────────────────────────────
kop("2. Onafhankelijke oplossing: de keten van staven met de statica en tweemaal integreren");

/**
 * Een raamwerk als keten van knopen n0 → n1 → … → nk (de staven liggen in die
 * volgorde, van i naar j), met een oplegging aan het begin (klem of scharnier)
 * en aan het eind (klem, scharnier of rol: vrij in x), scharnieren in
 * binnenknopen en eventueel een trekband tussen twee knopen van de keten.
 */
function keten({ kn, st, lasten, begin, eind, band }) {
  const ketenStaven = st.filter((r) => !band || r !== band.rij);
  const knoopVolg = [ketenStaven[0][0] - 1, ...ketenStaven.map((r) => r[1] - 1)];
  const scharnierBij = new Set();
  ketenStaven.forEach((r, k) => {
    if (r[5] >= 0.5 && k + 1 < ketenStaven.length) scharnierBij.add(k + 1);
    if (r[4] >= 0.5 && k > 0) scharnierBij.add(k);
  });
  const schar = [...scharnierBij].sort((a, b) => a - b);
  const nOnb = 3 + schar.length + (band ? 1 : 0);
  const STAP = 3000;

  const staafInfo = ketenStaven.map((r) => {
    const A = kn[r[0] - 1], B = kn[r[1] - 1];
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const c = (B[0] - A[0]) / L, s = (B[1] - A[1]) / L;
    return { nr: st.indexOf(r) + 1, A, B, L, c, s, EI: r[2], EA: r[3] };
  });
  // Lasten per staaf als globale vectoren; knooplasten per knoop.
  const vector = (si, richting, q) => {
    const { c, s } = staafInfo[si];
    switch (richting) {
      case 1: return [q, 0];
      case 2: return [0, -q];
      case 3: return [0, -q * Math.abs(c)];
      case 4: return [q * s, -q * c];
      case 5: return [q * c, q * s];
      default: return [0, 0];
    }
  };
  const verdeeld = staafInfo.map(() => []);
  const punt = staafInfo.map(() => []);
  const knoop = new Map();
  for (const r of lasten) {
    const [nr, soort, a, b, qa, qb, richting] = r;
    if (soort === 3) {
      const k = knoopVolg.indexOf(nr - 1);
      const v = knoop.get(k) ?? { F: [0, 0], C: 0 };
      if (richting === 1) v.F[0] += qa;
      else if (richting === 2 || richting === 3) v.F[1] -= qa;
      else if (richting === 6) v.C -= qa;
      knoop.set(k, v);
      continue;
    }
    const si = staafInfo.findIndex((i) => i.nr === nr);
    if (si < 0) continue;
    if (soort === 1) {
      const lo = Math.max(Math.min(a, b), 0), hi = Math.min(Math.max(a, b), staafInfo[si].L);
      const qt = (t) => qa + ((qb - qa) * (t - a)) / (b - a);
      verdeeld[si].push({ lo, hi, f: (t) => vector(si, richting, qt(t)) });
    } else if (soort === 2) {
      punt[si].push(richting === 6 ? { a, F: [0, 0], C: -qa } : { a, F: vector(si, richting === 3 ? 2 : richting, qa), C: 0 });
    }
  }

  /** Eén doorloop met de onbekenden p; geeft de restwaarden en de verlopen. */
  function doorloop(p, bewaar) {
    let SF = [0, 0], SM = 0;
    const kracht = (P, F, C = 0) => {
      SF = [SF[0] + F[0], SF[1] + F[1]];
      SM += P[0] * F[1] - P[1] * F[0] + C;
    };
    const P0 = staafInfo[0].A;
    kracht(P0, [p[0], p[1]], begin === "klem" ? p[2] : 0);
    let θ = begin === "klem" ? 0 : p[2];
    let u = [0, 0];
    const rest = [];
    const verlopen = staafInfo.map(() => []);
    const plaatsKnoop = (k, P) => {
      const v = knoop.get(k);
      if (v) kracht(P, v.F, v.C);
      if (band && band.van === k) kracht(P, band.e.map((x) => x * p[nOnb - 1]));
      if (band && band.naar === k) kracht(P, band.e.map((x) => -x * p[nOnb - 1]));
    };
    plaatsKnoop(0, P0);
    const uKnoop = [u];
    staafInfo.forEach((si, k) => {
      if (k > 0) {
        const h = schar.indexOf(k);
        if (h >= 0) {
          // M in het scharnier moet nul zijn.
          const P = si.A;
          rest.push(-(SM - (P[0] * SF[1] - P[1] * SF[0])));
          θ += p[3 + h];
        }
      }
      const t = [si.c, si.s], n = [-si.s, si.c];
      const sn = (P) => {
        const Mb = SM - (P[0] * SF[1] - P[1] * SF[0]);
        return { N: -(SF[0] * t[0] + SF[1] * t[1]), V: SF[0] * n[0] + SF[1] * n[1], M: -Mb };
      };
      const grenzen = new Set();
      for (let i = 0; i <= STAP; i++) grenzen.add((si.L * i) / STAP);
      for (const pl of punt[k]) grenzen.add(Math.min(Math.max(pl.a, 0), si.L));
      for (const d of verdeeld[k]) { grenzen.add(d.lo); grenzen.add(d.hi); }
      const g = [...grenzen].sort((a, b) => a - b);
      const plek = (s) => [si.A[0] + si.c * s, si.A[1] + si.s * s];
      // Puntlasten precies op het begin tellen direct.
      const puntOp = (s) => punt[k].filter((pl) => Math.abs(Math.min(Math.max(pl.a, 0), si.L) - s) < 1e-12);
      let links = sn(plek(g[0]));
      for (const pl of puntOp(g[0])) kracht(plek(g[0]), pl.F, pl.C);
      let rechts = sn(plek(g[0]));
      if (bewaar) verlopen[k].push({ s: g[0], L: links, R: rechts, u: [...u] });
      for (let i = 0; i + 1 < g.length; i++) {
        const sa = g[i], sb = g[i + 1], ds = sb - sa;
        if (ds <= 0) continue;
        const m = (sa + sb) / 2;
        let F = [0, 0];
        for (const d of verdeeld[k]) {
          if (m < d.lo || m > d.hi) continue;
          const v = d.f(m);
          F = [F[0] + v[0] * ds, F[1] + v[1] * ds];
        }
        const a = rechts;
        kracht(plek(m), F);
        const b = sn(plek(sb));
        const θb = θ + ((a.M + b.M) / 2) * (ds / si.EI);
        const εm = (a.N + b.N) / 2 / si.EA;
        const θm = (θ + θb) / 2;
        u = [u[0] + (εm * t[0] + θm * n[0]) * ds, u[1] + (εm * t[1] + θm * n[1]) * ds];
        θ = θb;
        links = b;
        for (const pl of puntOp(sb)) kracht(plek(sb), pl.F, pl.C);
        rechts = sn(plek(sb));
        if (bewaar) verlopen[k].push({ s: sb, L: links, R: rechts, u: [...u] });
      }
      plaatsKnoop(k + 1, si.B);
      uKnoop.push(u);
    });
    const Pe = staafInfo[staafInfo.length - 1].B;
    const Me = SM - (Pe[0] * SF[1] - Pe[1] * SF[0]);
    if (eind === "klem") rest.push(u[0], u[1], θ);
    else if (eind === "scharnier") rest.push(u[0], u[1], Me);
    else rest.push(SF[0], u[1], Me);
    if (band) {
      const ua = uKnoop[band.van], ub = uKnoop[band.naar];
      rest.push((ub[0] - ua[0]) * band.e[0] + (ub[1] - ua[1]) * band.e[1] - (p[nOnb - 1] * band.L) / band.EA);
    }
    return { rest, verlopen, SF, SM, uKnoop, θ };
  }

  const b0 = doorloop(new Array(nOnb).fill(0), false).rest;
  const A = [];
  for (let j = 0; j < nOnb; j++) {
    const e = new Array(nOnb).fill(0);
    e[j] = 1;
    const r = doorloop(e, false).rest;
    A.push(r.map((v, i) => v - b0[i]));
  }
  // Los A·p = −b op (A per kolom opgebouwd).
  const M = b0.map((_, i) => [...A.map((kol) => kol[i]), -b0[i]]);
  for (let k = 0; k < nOnb; k++) {
    let piv = k;
    for (let i = k + 1; i < nOnb; i++) if (Math.abs(M[i][k]) > Math.abs(M[piv][k])) piv = i;
    [M[k], M[piv]] = [M[piv], M[k]];
    for (let i = 0; i < nOnb; i++) {
      if (i === k) continue;
      const f = M[i][k] / M[k][k];
      for (let j = k; j <= nOnb; j++) M[i][j] -= f * M[k][j];
    }
  }
  const p = M.map((r, i) => r[nOnb] / r[i]);
  const eindUit = doorloop(p, true);
  return { p, staafInfo, verlopen: eindUit.verlopen, eindReactie: [-eindUit.SF[0], -eindUit.SF[1]], bandKracht: band ? p[nOnb - 1] : 0 };
}

/** Waarde uit de keten in s van staaf k (links of rechts van een sprong). */
function ketenWaarde(v, k, s, kant, g) {
  const lijst = v.verlopen[k];
  let i = lijst.findIndex((e) => e.s >= s - 1e-12);
  if (i < 0) i = lijst.length - 1;
  const e = lijst[i];
  const pak = (x) => (g === "ux" ? x.u[0] : g === "uy" ? x.u[1] : (kant < 0 ? x.L : x.R)[g]);
  if (Math.abs(e.s - s) < 1e-12 || i === 0) return pak(e);
  const a = lijst[i - 1];
  const r = (s - a.s) / (e.s - a.s);
  const va = g === "ux" ? a.u[0] : g === "uy" ? a.u[1] : a.R[g];
  const vb = g === "ux" ? e.u[0] : g === "uy" ? e.u[1] : e.L[g];
  return va + r * (vb - va);
}

function vergelijk(naam, geval) {
  const { kn, st, opl, lasten } = geval;
  const v = keten(geval);
  const R = raamwerkOplossing(kn, st, opl, lasten);
  const RR = raamwerkReacties(kn, st, opl, lasten);
  let n = 0;
  for (const g of ["N", "V", "M", "ux", "uy"]) {
    const kol = K[g] - 1;
    const schaal = Math.max(1e-9, ...R.map((r) => Math.abs(r[kol])));
    let slechtst = 0, waar_ = "";
    v.staafInfo.forEach((si, k) => {
      const rijenStaaf = R.filter((r) => r[0] === si.nr);
      rijenStaaf.forEach((r, i) => {
        const kant = i + 1 < rijenStaaf.length && Math.abs(rijenStaaf[i + 1][1] - r[1]) < 1e-12 ? -1 : 1;
        const kw = ketenWaarde(v, k, r[1], kant, g);
        const d = Math.abs(kw - r[kol]) / schaal;
        n++;
        if (d > slechtst) { slechtst = d; waar_ = `staaf ${si.nr}, s = ${r[1].toFixed(3)}: kern ${r[kol]}, keten ${kw}`; }
      });
    });
    gelijk(`${naam}: ${g} langs alle staven (grootste afwijking ${slechtst.toExponential(1)} van ${schaal.toPrecision(4)})`, slechtst, 0, 0, 2e-5);
    if (slechtst > 2e-5) console.log(`        ${waar_}`);
  }
  // Reacties: begin en eind van de keten.
  const eerste = st.find((r) => r !== geval.band?.rij)[0];
  const laatste = st.filter((r) => r !== geval.band?.rij).at(-1)[1];
  const r0 = reactie(RR, eerste), r1 = reactie(RR, laatste);
  const schaalR = Math.max(1, ...RR.map((r) => Math.max(Math.abs(r[1]), Math.abs(r[2]))));
  gelijk(`${naam}: R_x begin`, r0[1] / schaalR, v.p[0] / schaalR, 1e-5, 2e-6);
  gelijk(`${naam}: R_y begin`, r0[2] / schaalR, v.p[1] / schaalR, 1e-5, 2e-6);
  gelijk(`${naam}: R_x eind`, r1[1] / schaalR, v.eindReactie[0] / schaalR, 1e-5, 2e-6);
  gelijk(`${naam}: R_y eind`, r1[2] / schaalR, v.eindReactie[1] / schaalR, 1e-5, 2e-6);
  if (geval.begin === "klem") gelijk(`${naam}: inklemmingsmoment begin (rechtsom)`, r0[3] / schaalR, -v.p[2] / schaalR, 1e-5, 2e-6);
  if (geval.band) {
    const Nb = raamwerkExtremen(R, geval.band.nr, K.N);
    gelijk(`${naam}: kracht in de trekband`, Nb[0] / schaalR, v.bandKracht / schaalR, 1e-5, 2e-6);
  }
  return n;
}

{
  // Zadelportaal met alle soorten lasten: eigen gewicht, sneeuw per m
  // projectie (trapezium op een deel), wind loodrecht, puntlast, moment,
  // knooplast en een last langs de staaf.
  const B = 12, h = 4.5, f = 1.8;
  const kn = [[0, 0], [0, h], [B / 2, h + f], [B, h], [B, 0]];
  const st = [[1, 2, 30000, 1.2e6, 0, 0], [2, 3, 45000, 1.5e6, 0, 0], [3, 4, 45000, 1.5e6, 0, 0], [4, 5, 30000, 1.2e6, 0, 0]];
  const Lr = Math.hypot(B / 2, f);
  const lasten = [
    [1, 1, 0, h, 0.6, 0.6, 2], [4, 1, 0, h, 0.6, 0.6, 2],
    [2, 1, 0, Lr, 2.2, 2.2, 2], [3, 1, 0, Lr, 2.2, 2.2, 2],
    [2, 1, 1.0, 5.5, 3.0, 1.2, 3],
    [1, 1, 0, h, 1.1, 1.1, 4], [2, 1, 0, Lr, -0.9, -0.9, 4], [3, 1, 0, Lr, -0.5, -0.5, 4], [4, 1, 0, h, -0.4, -0.4, 4],
    [3, 2, 2.2, 0, 8, 0, 2], [2, 2, 4.0, 0, 3, 0, 6], [2, 3, 0, 0, 5, 0, 1], [4, 1, 0.5, 3.0, 0.8, 0.8, 5],
    [3, 3, 0, 0, 12, 0, 2],
  ];
  const n1 = vergelijk("zadelportaal, voeten scharnierend", { kn, st, opl: [[1, 1, 1, 0], [5, 1, 1, 0]], lasten, begin: "scharnier", eind: "scharnier" });
  const n2 = vergelijk("zadelportaal, voeten ingeklemd", { kn, st, opl: [[1, 1, 1, 1], [5, 1, 1, 1]], lasten, begin: "klem", eind: "klem" });
  const n3 = vergelijk("zadelportaal, links ingeklemd, rechts rol", { kn, st, opl: [[1, 1, 1, 1], [5, 0, 1, 0]], lasten, begin: "klem", eind: "rol" });
  // Lessenaarspant: ongelijke kolommen, links ingeklemd, rechts scharnier.
  const knL = [[0, 0], [0, 3.2], [7.5, 5.1], [7.5, 0]];
  const stL = [[1, 2, 18000, 9e5, 0, 0], [2, 3, 26000, 1.1e6, 0, 0], [3, 4, 18000, 9e5, 0, 0]];
  const lL = [
    [2, 1, 0, 8, 2.5, 2.5, 3], [1, 1, 0, 3.2, 0.9, 0.9, 4], [3, 1, 0, 5.1, -0.6, -0.4, 4], [2, 1, 0, 8, -0.7, -0.7, 4],
    [2, 2, 3.0, 0, 6, 0, 1], [1, 2, 1.5, 0, 2, 0, 6], [2, 3, 0, 0, 4, 0, 1],
  ];
  const n4 = vergelijk("lessenaarspant", { kn: knL, st: stL, opl: [[1, 1, 1, 1], [4, 1, 1, 0]], lasten: lL, begin: "klem", eind: "scharnier" });
  // A-spant met stijve nok en trekband, rol rechts.
  const knA = [[0, 0], [5, 4.2], [10, 0]];
  const band = [1, 3, 2, 3e4, 1, 1];
  const stA = [[1, 2, 6000, 4e5, 0, 0], [2, 3, 6000, 4e5, 0, 0], band];
  const lA = [
    [1, 1, 0, 7, 1.8, 1.8, 2], [2, 1, 0, 7, 1.8, 1.8, 2], [1, 1, 0, 7, 1.4, 1.4, 3], [1, 1, 0, 7, 0.6, 0.6, 4], [2, 1, 0, 7, -0.8, -0.8, 4],
    [2, 2, 2.0, 0, 3, 0, 2], [2, 3, 0, 0, 1.5, 0, 1],
  ];
  const n5 = vergelijk("A-spant, stijve nok en trekband", {
    kn: knA, st: stA, opl: [[1, 1, 1, 0], [3, 0, 1, 0]], lasten: lA, begin: "scharnier", eind: "rol",
    band: { rij: band, nr: 3, van: 0, naar: 2, e: [1, 0], L: 10, EA: 3e4 },
  });
  // A-spant met nokscharnier, zonder trekband: driescharnierspant.
  const stA2 = [[1, 2, 6000, 4e5, 0, 1], [2, 3, 6000, 4e5, 0, 0]];
  const n6 = vergelijk("driescharnierspant", { kn: knA, st: stA2, opl: [[1, 1, 1, 0], [3, 1, 1, 0]], lasten: lA, begin: "scharnier", eind: "scharnier" });
  // Portaal met een scharnier in de regel en een verdeelde last over een deel.
  const knP = [[0, 0], [0, 4], [3.5, 4], [9, 4], [9, 0]];
  const stP = [[1, 2, 22000, 1e6, 0, 0], [2, 3, 30000, 1e6, 0, 1], [3, 4, 30000, 1e6, 0, 0], [4, 5, 22000, 1e6, 0, 0]];
  const lP = [[2, 1, 1, 3.5, 4, 6, 2], [3, 1, 0, 4, 5, 5, 2], [1, 1, 0, 4, 1, 0, 4], [4, 2, 2, 0, 3, 0, 4]];
  const n7 = vergelijk("portaal met scharnier in de regel", { kn: knP, st: stP, opl: [[1, 1, 1, 1], [5, 1, 1, 1]], lasten: lP, begin: "klem", eind: "klem" });
  console.log(`  ${n1 + n2 + n3 + n4 + n5 + n6 + n7} rasterpunten × 5 grootheden vergeleken`);
}

// ── 3. Evenwicht, hulpfuncties en het rekenblad ─────────────────────────────
kop("3. Evenwicht, hulpfuncties en gebruik vanuit een rekenblad");
{
  // Evenwicht van het hele raamwerk: som van lasten en reacties is nul.
  const B = 10, h = 4, f = 2;
  const kn = [[0, 0], [0, h], [B / 2, h + f], [B, h], [B, 0]];
  const st = [[1, 2, 20000, 1e6, 0, 0], [2, 3, 30000, 1e6, 0, 0], [3, 4, 30000, 1e6, 0, 0], [4, 5, 20000, 1e6, 0, 0]];
  const opl = [[1, 1, 1, 1], [5, 1, 1, 0]];
  const Lr = Math.hypot(B / 2, f);
  const lasten = [[2, 1, 0, Lr, 3, 3, 3], [3, 1, 1, 4, 1, 2, 2], [1, 1, 0, h, 0.8, 0.8, 4], [2, 1, 0, Lr, -0.6, -0.6, 4], [3, 2, 2, 0, 5, 0, 1], [2, 3, 0, 0, 2, 0, 6]];
  const RR = raamwerkReacties(kn, st, opl, lasten);
  // Lastresultante met de hand: projectie 3·B/2 omlaag; op staaf 3 trapezium (1→2)·3 m omlaag;
  // wind loodrecht op de kolom (h·0,8 naar rechts) en op de spoor (0,6·L_r, naar buiten);
  // puntlast 5 naar rechts; knoopmoment 2 rechtsom in knoop 2.
  const c = (B / 2) / Lr, s = f / Lr;
  const Fx = 0.8 * h + (-0.6 * Lr) * s + 5;
  const Fy = -3 * (B / 2) - 1.5 * 3 + (-0.6 * Lr) * -c;
  gelijk("evenwicht: ΣR_x = −ΣF_x", RR.reduce((t, r) => t + r[1], 0), -Fx, 1e-9, 1e-9);
  gelijk("evenwicht: ΣR_y = −ΣF_y", RR.reduce((t, r) => t + r[2], 0), -Fy, 1e-9, 1e-9);

  const R = raamwerkOplossing(kn, st, opl, lasten);
  const e = raamwerkExtremen(R, 2, K.M);
  const alle = R.filter((r) => r[0] === 2).map((r) => r[6]);
  gelijk("uitersten per staaf: max", e[0], Math.max(...alle));
  gelijk("uitersten per staaf: min", e[2], Math.min(...alle));
  const eAlle = raamwerkExtremen(R, 0, K.M);
  gelijk("uitersten over alle staven", eAlle[0], Math.max(...R.map((r) => r[6])));
  // Raster: een puntlast staat twee keer (links en rechts), V springt.
  const dubbel = R.filter((r) => r[0] === 3 && Math.abs(r[1] - 2) < 1e-12);
  waar("raster: puntlast staat links en rechts", dubbel.length === 2, String(dubbel.length));
  // Staaf 3 loopt van de nok omlaag naar rechts; een last in x heeft een
  // component −5·sin α naar de rechterkant, dus V springt met +5·sin α.
  gelijk("raster: V springt met de component loodrecht op de staaf", dubbel[1][5] - dubbel[0][5], 5 * s, 1e-9);
  // Hetzelfde raster voor elke factorvector.
  const R2 = raamwerkOplossing(kn, st, opl, lasten, [1.2, 0, 1.5, 1.5, 0, 0]);
  waar("raster: gelijk voor elke factorvector", R2.length === R.length && R2.every((r, i) => r[1] === R[i][1] && r[0] === R[i][0]));
  // Superpositie.
  const Ra = raamwerkOplossing(kn, st, opl, lasten, [1, 0, 0, 0, 0, 0]);
  const Rb = raamwerkOplossing(kn, st, opl, lasten, [0, 0, 1, 0, 0, 0]);
  const Rab = raamwerkOplossing(kn, st, opl, lasten, [2, 0, -0.5, 0, 0, 0]);
  gelijk("superpositie: 2·A − 0,5·B", Rab[40][6], 2 * Ra[40][6] - 0.5 * Rb[40][6], 1e-9);
  // Met toppen: het uiterste van M exact, tussen de rasterpunten.
  const Rt = raamwerkOplossing(kn, st, opl, lasten, undefined, 1);
  waar("toppen: meer punten dan het vaste raster", Rt.length > R.length);
  waar("toppen: M_max niet kleiner dan op het raster", raamwerkExtremen(Rt, 2, K.M)[0] >= e[0] - 1e-12);
  // w: nul aan de staafeinden.
  gelijk("w aan het begin van de staaf = 0", op(R, 2, "w", 0), 0, 1e-9, 1e-12);
  gelijk("w aan het eind van de staaf = 0", R.filter((r) => r[0] === 2).at(-1)[9], 0, 1e-9, 1e-12);
  // Verplaatsingen van een knoop langs beide staven gelijk.
  const u = raamwerkVerplaatsingen(kn, st, opl, lasten);
  gelijk("knoop 3: u_x aan het eind van staaf 2", R.filter((r) => r[0] === 2).at(-1)[7], u[2][1], 1e-8, 1e-12);
  gelijk("knoop 3: u_x aan het begin van staaf 3", op(R, 3, "ux", 0), u[2][1], 1e-8, 1e-12);

  // Samenvatting per staaf: dezelfde uitersten als raamwerkExtremen, M op de kwartpunten.
  const sam = raamwerkSamenvatting(R, 2);
  gelijk("samenvatting: N_min", sam[0], raamwerkExtremen(R, 2, K.N)[2]);
  gelijk("samenvatting: M_max", sam[5], e[0]);
  gelijk("samenvatting: M(L/4) als interpolatie", sam[7], raamwerkInterpoleer(R, 2, K.M, sam[11] / 4));
  gelijk("samenvatting: lengte van de staaf", sam[11], Lr);
  waar("samenvatting: onbekende staaf geeft nullen", raamwerkSamenvatting(R, 9).every((v) => v === 0));
  // Zakking ten opzichte van de lijn door de knieën: met de knoopverplaatsingen als eindpunten.
  const zk = raamwerkZakking(R, 2, 0, u[1][2], B, u[3][2]);
  const zelf = Math.max(...R.filter((r) => r[0] === 2).map((r) => Math.abs(r[8] - (u[1][2] + ((u[3][2] - u[1][2]) * r[2]) / B))));
  gelijk("zakking ten opzichte van de knieën", zk, zelf);
  const Rs = [[1, 0, 0, 0, 0, 0, 0, 0, 0, 0], [1, 2, 0, 2, 0, 0, 4, 0.1, 0, 0], [2, 0, 0, 2, 0, 0, 4, 0, 0, 0], [2, 3, 3, 2, 0, 0, -2, 0, 0, 0]];
  gelijk("interpolatie in een staaf", raamwerkInterpoleer(Rs, 1, 7, 1), 2);
  gelijk("interpolatie: andere staaf", raamwerkInterpoleer(Rs, 2, 7, 1.5), 1);
  const svg = raamwerkSvgPunten(Rs, 1, 7, 10, 100, 10, 0.5);
  waar("SVG-punten: as, verloop naar de rechterkant, as", svg === "10,100 10,100 30,80 10,80", svg);
  const vorm = raamwerkVormPunten(Rs, 1, 10, 100, 10, 100);
  waar("verplaatste vorm", vorm === "10,100 110,80", vorm);

  // Via het rekenblad: CalcPAD-matrices en eenheden.
  const bron = [
    "EI_k = 210000 N/mm^2*5790 cm^4",
    "EI_r = 210000 N/mm^2*8356 cm^4",
    "EA = 210000 N/mm^2*50 cm^2",
    "L = 10 m",
    "h = 5 m",
    "kn = [0; 0; L; L | 0; h; h; 0]",
    "st = [1; 2; 3 | 2; 3; 4 | EI_k; EI_r; EI_k | EA; EA; EA | 0; 0; 0 | 0; 0; 0]",
    "opl = [1; 4 | 1; 1 | 1; 1 | 0; 0]",
    "last = [2; 2 | 1; 3 | 0; 0 | L; 0 | 4 kN/m; 10 kN | 4 kN/m; 0 | 2; 1]",
    "R = raamwerk(kn; st; opl; last)",
    "Rq = raamwerk(kn; st; opl; last; [1; 0])",
    "e = raamwerk_ext(Rq; 2; 7)",
    "M_veld = e.1",
    "M_knie = raamwerk_int(Rq; 2; 7; 0)",
    "RR = raamwerk_R(kn; st; opl; last; [1; 0])",
    "H_A = RR.(1; 2)",
    "u = raamwerk_u(kn; st; opl; last; [0; 1])",
    "δ = u.(2; 2)",
    "α = raamwerk_acr(kn; st; opl; last; [1; 0])",
    "s = raamwerk_status(kn; st; opl)",
    "Rm = raamwerk_max(Rq; raamwerk(kn; st; opl; last; [0; 1]))",
    "p = raamwerk_svg(Rq; 2; 7; 20; 100; 20; 1)",
    "v = raamwerk_vorm(Rq; 2; 20; 100; 20; 100)",
  ].join("\n");
  const knopen = evaluate(parse(bron), {});
  const uit = {};
  for (const n of knopen) if (n.type === "assignment") uit[n.name] = n.result;
  const EIk = 210e6 * 5790e-8, EIr = 210e6 * 8356e-8, EA = 210e6 * 50e-4;
  const refR = raamwerkOplossing([[0, 0], [0, 5], [10, 5], [10, 0]], [[1, 2, EIk, EA, 0, 0], [2, 3, EIr, EA, 0, 0], [3, 4, EIk, EA, 0, 0]], [[1, 1, 1, 0], [4, 1, 1, 0]], [[2, 1, 0, 10, 4, 4, 2], [2, 3, 0, 0, 10, 0, 1]], [1, 0]);
  gelijk("blad: veldmoment als de kern met kale getallen", parseFloat(uit.M_veld), raamwerkExtremen(refR, 2, K.M)[0], 1e-3);
  gelijk("blad: knoopmoment", parseFloat(uit.M_knie), raamwerkInterpoleer(refR, 2, K.M, 0), 1e-3);
  const k = (EIr / EIk) * 0.5;
  gelijk("blad: H_A = qL²/(4h(2k + 3)), met de rek van de staven", parseFloat(uit.H_A), (4 * 100) / (4 * 5 * (2 * k + 3)), 2e-3);
  gelijk("blad: δ onder H = 10 kN", parseFloat(uit["δ"]), ((10 * 25) / 12) * (10 / EIk + 10 / EIr), 2e-3);
  waar("blad: α_cr is een getal boven 1", parseFloat(uit["α"]) > 1, String(uit["α"]));
  waar("blad: status 1", uit.s === "1", uit.s);
  waar("blad: SVG-punten zijn tekst met getallen", /^[\d., -]+$/.test(String(uit.p)), String(uit.p).slice(0, 40));
  waar("blad: vorm is tekst met getallen", /^[\d., -]+$/.test(String(uit.v)), String(uit.v).slice(0, 40));
  waar("blad: geen foutmelding", !Object.values(uit).some((v) => /Error|NaN/.test(String(v))), JSON.stringify(uit).slice(0, 200));
}

// ── 4. Afschuifvervorming (Timoshenko) ──────────────────────────────────────
console.log("\n4. Afschuifvervorming: GA in de zevende kolom van de staven");
{
  const EI = 1000, GA = 5000, L = 4, q = 3, P = 7;
  // Ingeklemde kolom, horizontale puntlast in de top: u = PL³/(3EI) + PL/GA = 0,15493 m.
  const U = raamwerkVerplaatsingen([[0, 0], [0, L]], [[1, 2, EI, 1e9, 0, 0, GA]], [[1, 1, 1, 1]], [[2, 3, 0, 0, P, 0, 1]]);
  gelijk("kolom: u_top", U[1][1], (P * L ** 3) / (3 * EI) + (P * L) / GA);
  // Vrij opgelegde staaf, verticaal q: w_midden = 5qL⁴/(384EI) + qL²/(8GA) = 0,0112 m.
  const R = raamwerkOplossing([[0, 0], [L, 0]], [[1, 2, EI, 1e9, 0, 0, GA]], [[1, 1, 1, 0], [2, 0, 1, 0]], [[1, 1, 0, L, q, q, 2]]);
  gelijk("ligger: w_midden", Math.max(...R.map((r) => Math.abs(r[9]))), (5 * q * L ** 4) / (384 * EI) + (q * L * L) / (8 * GA));
  // Schuine staaf van (0, 0) naar (3, 4), last loodrecht, L = 5 m: t.o.v. de koorde 5qL⁴/(384EI) + qL²/(8GA).
  const R3 = raamwerkOplossing([[0, 0], [3, 4]], [[1, 2, EI, 1e12, 0, 0, GA]], [[1, 1, 1, 0], [2, 0, 1, 0]], [[1, 1, 0, 5, q, q, 4]]);
  gelijk("schuine staaf: w t.o.v. de koorde", Math.max(...R3.map((r) => Math.abs(r[9]))), (5 * q * 5 ** 4) / (384 * EI) + (q * 25) / (8 * GA));
  // Knik van een pendelstaaf met afschuiving: onder Euler P_E = π²EI/L² = 616,85 kN en net onder Engesser
  // P_E/(1 + P_E/GA) = 549,11 kN (elementen met afschuiving, geometrische stijfheid zonder: aan de veilige kant).
  const PE = (Math.PI ** 2 * EI) / L ** 2, Eng = PE / (1 + PE / GA);
  const a = raamwerkKnik([[0, 0], [0, L]], [[1, 2, EI, 1e9, 0, 0, GA]], [[1, 1, 1, 0], [2, 1, 0, 0]], [[2, 3, 0, 0, 1, 0, 2]]);
  waar("knik met afschuiving: tussen 0,99·Engesser en Engesser", a <= Eng * 1.0001 && a >= 0.99 * Eng, `${a} tegen ${Eng}`);
  // Zonder GA: Euler.
  gelijk("knik zonder GA: Euler", raamwerkKnik([[0, 0], [0, L]], [[1, 2, EI, 1e9, 0, 0, 0]], [[1, 1, 1, 0], [2, 1, 0, 0]], [[2, 3, 0, 0, 1, 0, 2]]), PE, 1e-3);
}

console.log(
  fouten === 0
    ? `\nRaamwerk in de kern: alles klopt (${getest} vergelijkingen).`
    : `\nRaamwerk in de kern: ${fouten} van ${getest} vergelijkingen wijken af.`,
);
process.exit(fouten === 0 ? 0 : 1);
