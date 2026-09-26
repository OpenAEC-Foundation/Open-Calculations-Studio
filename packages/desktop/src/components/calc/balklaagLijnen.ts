/**
 * De lijnen van de balklaag voor het parametrische beeld: moment, dwarskracht
 * en zakking van een lastset, dezelfde statica als het rekenmodel in
 * `templates/balklaag.ts` (§4b). Hier wordt niets getoetst — de getallen die
 * tellen (unity checks, M_y,Ed, V_z,Ed, w_fin) komen uit het blad zelf. Dit
 * bestand tekent alleen de vorm, met de lasten en factoren uit dat blad.
 *
 * Eenheden: lengtes in m, verdeelde lasten in kN/m, puntlasten in kN, EI in
 * kNm². Moment in kNm (positief bij trek aan de onderzijde), dwarskracht in kN,
 * zakking in mm (omlaag positief).
 */

/** De ligger: veld 1 en eventueel een overstek (schema 2) of veld 2 (schema 3). */
export interface Ligger {
  schema: number;
  /** Overspanning van veld 1. */
  L1: number;
  /** Lengte van het overstek; 0 buiten schema 2. */
  a: number;
  /** Overspanning van veld 2; 0 buiten schema 3. */
  L2: number;
  /** Buigstijfheid van de balk. */
  EI: number;
}

/**
 * Een set lasten: verdeelde last op veld 1 en op het tweede deel, puntlast
 * midden in veld 1 en op het tweede deel (midden in veld 2, of op het uiteinde
 * van het overstek).
 */
export interface Lastset {
  w1: number;
  w2: number;
  P1: number;
  P2: number;
}

export const GEEN: Lastset = { w1: 0, w2: 0, P1: 0, P2: 0 };

/** Σ factor · lastset — een combinatie is een optelling van belastinggevallen. */
export function tel(delen: [Lastset, number][]): Lastset {
  const uit = { ...GEEN };
  for (const [s, f] of delen) {
    uit.w1 += f * s.w1;
    uit.w2 += f * s.w2;
    uit.P1 += f * s.P1;
    uit.P2 += f * s.P2;
  }
  return uit;
}

export const totaal = (g: Ligger) => g.L1 + (g.schema === 2 ? g.a : 0) + (g.schema === 3 ? g.L2 : 0);

/**
 * Steunmoment bij de tussenoplegging, positief bij trek aan de bovenzijde:
 * bij twee velden uit de drie-momentenvergelijking, bij een overstek uit het
 * evenwicht van de kraag.
 */
export function steunmoment(g: Ligger, s: Lastset): number {
  if (g.schema === 3) {
    const n = g.L1 + g.L2;
    return (s.w1 * g.L1 ** 3 + s.w2 * g.L2 ** 3) / (8 * n) + (3 * (s.P1 * g.L1 ** 2 + s.P2 * g.L2 ** 2)) / (16 * n);
  }
  if (g.schema === 2) return (s.w2 * g.a ** 2) / 2 + s.P2 * g.a;
  return 0;
}

/**
 * De belastinggevallen BG1 … BG5 uit de lasten per balk, zoals het blad ze
 * definieert (§7): BG1 permanent overal, BG2 veranderlijk op veld 1 (bij een
 * overstek ook op het overstek), BG3 veranderlijk op veld 2, BG4 puntlast in
 * veld 1 (bij een overstek dat langer is dan L/4 op het uiteinde), BG5 puntlast
 * in veld 2.
 */
export function belastinggevallen(g: Ligger, lasten: { g: number; q: number; F: number }): Record<1 | 2 | 3 | 4 | 5, Lastset> {
  const s2 = g.schema === 2, s3 = g.schema === 3;
  const eind = s2 && g.a > g.L1 / 4;
  return {
    1: { w1: lasten.g, w2: lasten.g, P1: 0, P2: 0 },
    2: { w1: lasten.q, w2: s2 ? lasten.q : 0, P1: 0, P2: 0 },
    3: { w1: 0, w2: s3 ? lasten.q : 0, P1: 0, P2: 0 },
    4: { w1: 0, w2: 0, P1: eind ? 0 : lasten.F, P2: eind ? lasten.F : 0 },
    5: { w1: 0, w2: 0, P1: 0, P2: s3 ? lasten.F : 0 },
  };
}

/** De vijf UGT-combinaties (6.10b) van §8 als lastset. */
export function ugtCombinaties(bg: Record<1 | 2 | 3 | 4 | 5, Lastset>, gG: number, gQ: number): Lastset[] {
  return [
    tel([[bg[1], gG], [bg[2], gQ]]),
    tel([[bg[1], gG], [bg[2], gQ], [bg[3], gQ]]),
    tel([[bg[1], gG], [bg[3], gQ]]),
    tel([[bg[1], gG], [bg[4], gQ]]),
    tel([[bg[1], gG], [bg[5], gQ]]),
  ];
}

export interface Lijnen {
  M: (x: number) => number;
  V: (x: number) => number;
  u: (x: number) => number;
}

/** Moment, dwarskracht en zakking van één lastset op afstand x van het begin. */
export function lijnen(g: Ligger, s: Lastset): Lijnen {
  const { L1, EI } = g;
  const a = g.schema === 2 ? g.a : 0;
  const L2 = g.schema === 3 ? g.L2 : 0;
  const tot = L1 + a + L2;
  const Ms = steunmoment(g, s);
  const Ra = (s.w1 * L1) / 2 + s.P1 / 2 - Ms / L1;
  const Rc = L2 > 0 ? (s.w2 * L2) / 2 + s.P2 / 2 - Ms / L2 : 0;
  // Zakking van een veld met lengte L: verdeelde last, puntlast in het midden
  // en een inklemmend moment aan het eind; t vanaf de scharnierende oplegging.
  const up = (t: number, L: number) => {
    const r = t <= L / 2 ? t : L - t;
    return (r * (3 * L * L - 4 * r * r)) / 48;
  };
  const uv = (t: number, L: number, w: number, P: number) =>
    (w * t * (L ** 3 - 2 * L * t * t + t ** 3)) / 24 + P * up(t, L) - (Ms * t * (L * L - t * t)) / (6 * L);
  // Hoekverdraaiing van veld 1 bij de tweede oplegging; positief draait het overstek omlaag.
  const tv = (Ms * L1) / 3 - (s.w1 * L1 ** 3) / 24 - (s.P1 * L1 * L1) / 16;
  return {
    M: (x) => {
      if (x <= L1) return Ra * x - (s.w1 * x * x) / 2 - s.P1 * Math.max(0, x - L1 / 2);
      const t = tot - x;
      if (a > 0) return (-s.w2 * t * t) / 2 - s.P2 * t;
      return Rc * t - (s.w2 * t * t) / 2 - s.P2 * Math.max(0, t - L2 / 2);
    },
    V: (x) => {
      if (x <= L1) return Ra - s.w1 * x - (x > L1 / 2 ? s.P1 : 0);
      const t = tot - x;
      if (a > 0) return s.w2 * t + s.P2;
      return s.w2 * t + (t > L2 / 2 ? s.P2 : 0) - Rc;
    },
    u: (x) => {
      let v: number;
      if (x <= L1) v = uv(x, L1, s.w1, s.P1);
      else if (a > 0) {
        const z = x - L1;
        v = tv * z + (s.w2 * z * z * (6 * a * a - 4 * a * z + z * z)) / 24 + (s.P2 * z * z * (3 * a - z)) / 6;
      } else v = uv(tot - x, L2, s.w2, s.P2);
      return (1000 * v) / EI;
    },
  };
}
