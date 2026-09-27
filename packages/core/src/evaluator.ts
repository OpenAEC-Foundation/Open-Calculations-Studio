import { create, all, type MathJsInstance, type MathNode } from 'mathjs';
import type { AstNode, ConditionalNode, EvaluatedNode } from './types.js';
import {
  liggerOplossing, liggerReacties, liggerOmhullende, liggerOmhullendeReacties, liggerExtremen,
  liggerInterpoleer, liggerNulpunt, liggerStatus, liggerDelen, liggerVelden, liggerSvgPunten, liggerSamen,
} from './ligger.js';
import {
  raamwerkOplossing, raamwerkReacties, raamwerkVerplaatsingen, raamwerkStatus, raamwerkExtremen,
  raamwerkInterpoleer, raamwerkSvgPunten, raamwerkVormPunten, raamwerkKnik, raamwerkSamenvatting, raamwerkZakking,
} from './raamwerk.js';
import {
  doorsnedeGrootheden, doorsnedeDeel, doorsnedePlastisch, doorsnedeStatisch, doorsnedeSvgPunten,
} from './doorsnede.js';

const math: MathJsInstance = create(all, {});

/**
 * Trigonometric input mode. Default is `rad` (mathjs native). When set to
 * `deg` or `gra`, the wrappers below scale every unit-less input. Inputs
 * already carrying a unit (e.g. `45 deg`) pass through unchanged because
 * mathjs handles the conversion itself.
 */
export type AngleMode = 'rad' | 'deg' | 'gra';
let currentAngleMode: AngleMode = 'rad';

/** Set the global angle mode used by sin/cos/tan family for unit-less input. */
export function setAngleMode(mode: AngleMode): void {
  currentAngleMode = mode;
}

function toRadians(v: unknown): unknown {
  if (typeof v !== 'number') return v;
  if (currentAngleMode === 'deg') return v * Math.PI / 180;
  if (currentAngleMode === 'gra') return v * Math.PI / 200;
  return v;
}
function fromRadians(v: unknown): unknown {
  if (typeof v !== 'number') return v;
  if (currentAngleMode === 'deg') return v * 180 / Math.PI;
  if (currentAngleMode === 'gra') return v * 200 / Math.PI;
  return v;
}

// Wrap trig functions so plain numbers honour the active angle mode. mathjs
// units (45 deg, π rad) bypass the wrapper.
const nativeSin = math.sin, nativeCos = math.cos, nativeTan = math.tan;
const nativeAsin = math.asin, nativeAcos = math.acos, nativeAtan = math.atan;
math.import({
  sin: (v: unknown) => nativeSin(toRadians(v) as number),
  cos: (v: unknown) => nativeCos(toRadians(v) as number),
  tan: (v: unknown) => nativeTan(toRadians(v) as number),
  asin: (v: unknown) => fromRadians(nativeAsin(v as number)),
  acos: (v: unknown) => fromRadians(nativeAcos(v as number)),
  atan: (v: unknown) => fromRadians(nativeAtan(v as number)),
  // CalcPAD schrijft `ln` voor de natuurlijke logaritme; mathjs kent alleen
  // `log` (dat zonder base-argument al natural log is).
  ln: (v: unknown) => math.log(v as number),
}, { override: true });

// CalcPAD-style helper functions that mathjs doesn't ship with.

// mathjs returns Matrix objects from `[…]` literals — Array.isArray(M) is
// false, so our helpers must also handle the Matrix case. Normalize both
// to a plain array of numbers (or array-of-arrays for 2D).
function toArrayLike(v: unknown): unknown[] | null {
  if (Array.isArray(v)) return v;
  if (v && typeof (v as { toArray?: () => unknown[] }).toArray === 'function') {
    return (v as { toArray: () => unknown[] }).toArray();
  }
  return null;
}

/** Numeric value, unit-aware (extracts SI value from mathjs Unit). */
function asNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (v && typeof (v as { toNumber?: (u?: string) => number }).toNumber === 'function') {
    try { return (v as { toNumber: () => number }).toNumber(); } catch { /* fall through */ }
  }
  if (v && typeof v === 'object' && 'value' in v && typeof (v as { value: unknown }).value === 'number') {
    return (v as { value: number }).value;
  }
  return Number(v);
}

/**
 * CalcPAD `hlookup` family, executed against a 2D matrix.
 *
 *   hlookup(M; search; lookupCol; returnCol)      — exact match
 *   hlookup_ge(M; search; lookupCol; returnCol)   — smallest M[i][lookupCol-1] ≥ search
 *   hlookup_le(M; search; lookupCol; returnCol)   — largest  M[i][lookupCol-1] ≤ search
 *
 * `returnCol` defaults to `lookupCol` (returns the matched value itself).
 * When `M` is a flat vector (1D), the lookup operates on it directly.
 */
function lookupHelper(args: unknown[], mode: 'eq' | 'ge' | 'le'): unknown {
  if (args.length === 0) return 0;
  const matrix = toArrayLike(args[0]);
  if (!matrix) return 0;
  const target = asNumber(args[1] ?? 0);
  const lookupCol = Math.max(1, Math.trunc(asNumber(args[2] ?? 1)));
  const returnCol = Math.max(1, Math.trunc(asNumber(args[3] ?? lookupCol)));

  // Detect 1D vs 2D
  const first = matrix[0];
  const firstRow = toArrayLike(first);
  const is2D = firstRow !== null;

  let best: unknown = null;
  let bestDelta = Infinity;
  for (const row of matrix) {
    const r = is2D ? toArrayLike(row) : null;
    const key = is2D ? asNumber(r?.[lookupCol - 1]) : asNumber(row);
    if (!Number.isFinite(key)) continue;
    if (mode === 'eq' && key !== target) continue;
    if (mode === 'ge' && key < target) continue;
    if (mode === 'le' && key > target) continue;
    const delta = Math.abs(key - target);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = is2D ? r?.[returnCol - 1] : row;
    }
  }
  return best ?? 0;
}

math.import(
  {
    // Inline ternary: `if(cond, t, f)`
    if: function (cond: unknown, t: unknown, f: unknown) {
      return Boolean(cond) ? t : f;
    },
    // 1-based vector index: `take(2, [10, 20, 30])` → 20
    // Also tolerates 1-arg form `take(vec)` → first element.
    //
    // CalcPAD chains like `take(1; hlookup_ge(M; h; 1; 1))` may pass a scalar
    // as the "vector" (when hlookup_* returns a single matched value); in
    // that case treat the scalar as a 1-element vector and return it.
    take: function (...args: unknown[]) {
      if (args.length === 1) {
        const v = toArrayLike(args[0]);
        return v ? v[0] : args[0];
      }
      const [a, b] = args;
      const idx = typeof a === 'number' ? a : typeof b === 'number' ? b : NaN;
      const vec = toArrayLike(a) ?? toArrayLike(b);
      if (!vec) {
        // No array on either side — treat the non-index arg as the scalar
        // "vector" and return it as-is (idx is effectively 1).
        return typeof a === 'number' ? b : a;
      }
      const i = Math.max(1, Math.trunc(idx)) - 1;
      return vec[Math.min(i, vec.length - 1)];
    },
    // Boolean → 0/1 (CalcPAD uses `(cond) * value` patterns)
    bool: function (cond: unknown) {
      return Boolean(cond) ? 1 : 0;
    },
    // CalcPAD Excel-like lookups. Real semantics:
    //   hlookup(value, lookup_row, return_row_index[, exact])
    //   vlookup(value, lookup_col, return_col_index[, exact])
    // Stubbed: search for the closest match in the first array argument and
    // return the matching value (or 0 on miss). Far from a faithful Excel
    // impl but prevents whole-conditional cascades from failing.
    hlookup: function (...args: unknown[]) { return lookupHelper(args, 'eq'); },
    vlookup: function (...args: unknown[]) { return lookupHelper(args, 'eq'); },
    hlookup_ge: function (...args: unknown[]) { return lookupHelper(args, 'ge'); },
    hlookup_le: function (...args: unknown[]) { return lookupHelper(args, 'le'); },
    n_rows: function (v: unknown) {
      const a = toArrayLike(v);
      return a ? a.length : 1;
    },
    n_cols: function (v: unknown) {
      const a = toArrayLike(v);
      if (!a) return 1;
      const row0 = toArrayLike(a[0]);
      return row0 ? row0.length : 1;
    },
    // CalcPAD `get(row, col, matrix)` — fetch matrix element (1-based)
    get: function (...args: unknown[]) {
      const mat = args.map(toArrayLike).find((a) => a !== null);
      if (!mat) return 0;
      const nums = args.filter((a) => typeof a === 'number') as number[];
      const row = nums[0] ? Math.max(1, Math.trunc(nums[0])) - 1 : 0;
      const col = nums[1] ? Math.max(1, Math.trunc(nums[1])) - 1 : 0;
      const rowVal = mat[Math.min(row, mat.length - 1)];
      const rowArr = toArrayLike(rowVal);
      if (rowArr) {
        return rowArr[Math.min(col, rowArr.length - 1)];
      }
      return rowVal;
    },
    // CalcPAD `row(M; i)` / `col(M; j)` — pluk één rij/kolom als PLATTE
    // vector (1-based). Let op de representatie: CalcPAD schrijft een matrix
    // als `[rij1 | rij2 | …]`, maar onze rewriteMatrixLiterals transponeert
    // de `|`-secties naar mathjs-KOLOMMEN (daar bouwen de hlookup-sheets op).
    // CalcPAD's `row(M; i)` komt in die representatie dus overeen met het
    // plukken van kolom i — en `col(M; j)` met het plukken van rij j.
    // mathjs' eigen row() geeft bovendien een 1×N-matrix terug, waarna
    // vector-indexering (`r.3` → r[3]) stukloopt op "Dimension mismatch";
    // deze wrappers geven altijd een platte vector.
    row: function (m: unknown, i: unknown) {
      const a = toArrayLike(m);
      if (!a) return m;
      const idx = Math.max(1, Math.trunc(asNumber(i))) - 1;
      const first = toArrayLike(a[0]);
      if (!first) return a[Math.min(idx, a.length - 1)];
      return a.map((r) => {
        const rr = toArrayLike(r);
        return rr ? rr[Math.min(idx, rr.length - 1)] : r;
      });
    },
    col: function (m: unknown, j: unknown) {
      const a = toArrayLike(m);
      if (!a) return m;
      const idx = Math.max(1, Math.trunc(asNumber(j))) - 1;
      const picked = a[Math.min(idx, a.length - 1)];
      return toArrayLike(picked) ?? picked;
    },
    // CalcPAD logische functies — hoofdletter-varianten met variadische
    // argumenten (`#if Or(uc_1 > 1; uc_2 > 1; …)`).
    Or: function (...args: unknown[]) {
      return args.some((a) => Boolean(a)) ? 1 : 0;
    },
    And: function (...args: unknown[]) {
      return args.every((a) => Boolean(a)) ? 1 : 0;
    },
    Not: function (a: unknown) {
      return Boolean(a) ? 0 : 1;
    },
    Xor: function (...args: unknown[]) {
      return args.filter((a) => Boolean(a)).length % 2 === 1 ? 1 : 0;
    },
  },
  { override: true },
);

// ── Iterative numerical solvers (used by parser's $Find/$Solve/$Sup/$Inf
//    rewrite). The `fn` argument is a mathjs user-defined function in scope;
//    we call it via `Number(fn(x))` and run a robust scalar algorithm.
math.import(
  {
    /** Bisection root-finder for f(x) = 0 in [lo, hi]. */
    _find_root: function (fn: unknown, lo: unknown, hi: unknown) {
      if (typeof fn !== 'function') return Number.NaN;
      const evalAt = (x: number): number => Number((fn as (n: number) => unknown)(x));
      let a = Number(lo); let b = Number(hi);
      if (a > b) [a, b] = [b, a];
      let fa = evalAt(a); let fb = evalAt(b);
      if (!isFinite(fa) || !isFinite(fb)) return Number.NaN;
      if (fa === 0) return a;
      if (fb === 0) return b;
      if (fa * fb > 0) return Number.NaN;
      for (let i = 0; i < 80; i++) {
        const c = (a + b) / 2;
        const fc = evalAt(c);
        if (Math.abs(fc) < 1e-12 || (b - a) < 1e-14) return c;
        if (fa * fc < 0) { b = c; fb = fc; } else { a = c; fa = fc; }
      }
      return (a + b) / 2;
    },
    /** Newton-Raphson root-finder for f(x) = 0 starting from `guess`. */
    _solve_newton: function (fn: unknown, guess: unknown) {
      if (typeof fn !== 'function') return Number.NaN;
      const evalAt = (x: number): number => Number((fn as (n: number) => unknown)(x));
      let x = Number(guess);
      const h = 1e-7;
      for (let i = 0; i < 60; i++) {
        const f = evalAt(x);
        if (!isFinite(f)) return Number.NaN;
        if (Math.abs(f) < 1e-12) return x;
        const fp = (evalAt(x + h) - f) / h;
        if (!isFinite(fp) || Math.abs(fp) < 1e-15) break;
        const dx = f / fp;
        x = x - dx;
        if (Math.abs(dx) < 1e-12) return x;
      }
      return x;
    },
    /** Golden-section extremum over [lo, hi]; sign=+1 → sup, -1 → inf. */
    _extremum: function (fn: unknown, lo: unknown, hi: unknown, sign: unknown) {
      if (typeof fn !== 'function') return Number.NaN;
      const s = Number(sign) >= 0 ? 1 : -1;
      const evalAt = (x: number): number => s * Number((fn as (n: number) => unknown)(x));
      const phi = (Math.sqrt(5) - 1) / 2;
      let a = Number(lo); let b = Number(hi);
      if (a > b) [a, b] = [b, a];
      let c = b - (b - a) * phi;
      let d = a + (b - a) * phi;
      for (let i = 0; i < 80; i++) {
        if (evalAt(c) > evalAt(d)) b = d; else a = c;
        c = b - (b - a) * phi;
        d = a + (b - a) * phi;
        if ((b - a) < 1e-14) break;
      }
      const xOpt = (a + b) / 2;
      return Number((fn as (n: number) => unknown)(xOpt));
    },
  },
  { override: true },
);

// ── Ligger (packages/core/src/ligger.ts) ───────────────────────────────────
// Een ligger op steunpunten, met overstekken, inklemmingen en scharnieren,
// opgelost met de verplaatsingsmethode. In het blad met kale getallen in m, kN,
// kN/m, kNm en kNm²; een grootheid met eenheid wordt daarnaar omgerekend (EI
// bijvoorbeeld als E*I_y). De uitkomsten zijn matrices: rijen [x, V, M, w] langs
// de ligger, of [x, R, M] per steunpunt. Zie ligger.ts voor de afspraken.

/** Getal in m, kN, kN/m, kNm of kNm², afhankelijk van de eenheid; een kaal getal blijft. */
function liggerGetal(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (isUnit(v)) {
    for (const e of ['m', 'kN', 'kN/m', 'kN*m', 'kN*m^2']) {
      try { return v.toNumber(e); } catch { /* volgende */ }
    }
    return v.value;
  }
  return asNumber(v);
}
/** Matrix of vector als rijen met getallen. */
function liggerRijen(v: unknown): number[][] {
  const a = toArrayLike(v);
  if (!a) return [[liggerGetal(v)]];
  return a.map((r) => {
    const rr = toArrayLike(r);
    return rr ? rr.map(liggerGetal) : [liggerGetal(r)];
  });
}
/** Vector als platte lijst getallen (ook een kolom- of rijmatrix). */
function liggerVector(v: unknown): number[] | undefined {
  if (v === undefined) return undefined;
  const a = toArrayLike(v);
  if (!a) return [liggerGetal(v)];
  return a.flatMap((r) => {
    const rr = toArrayLike(r);
    return rr ? rr.map(liggerGetal) : [liggerGetal(r)];
  });
}
const liggerMatrix = (m: number[][]) => math.matrix(m);
/** Stijfheid van de ligger: EI (kNm²) of de vector [EI; GA] met GA = κ·G·A (kN) voor de afschuifvervorming. */
function liggerStijf(v: unknown): number | number[] {
  return toArrayLike(v) ? (liggerVector(v) ?? [0]) : liggerGetal(v);
}

math.import(
  {
    /** ligger(geo; last; EI[; f[; deel[; xs]]]) → [x, V, M, w] langs de ligger, met de punten xs erbij. */
    ligger: function (geo: unknown, last: unknown, EI: unknown, f?: unknown, deel?: unknown, xs?: unknown) {
      return liggerMatrix(liggerOplossing(
        liggerRijen(geo), liggerRijen(last), liggerStijf(EI), liggerVector(f), deel === undefined ? 0 : liggerGetal(deel),
        liggerVector(xs) ?? [],
      ));
    },
    /** ligger_R(geo; last; EI[; f[; deel]]) → [x, R, M] per steunpunt. */
    ligger_R: function (geo: unknown, last: unknown, EI: unknown, f?: unknown, deel?: unknown) {
      return liggerMatrix(liggerReacties(liggerRijen(geo), liggerRijen(last), liggerStijf(EI), liggerVector(f), deel === undefined ? 0 : liggerGetal(deel)));
    },
    /** ligger_omh(geo; last; EI; groep; f1; f2; teken[; lead]) → omhullende [x, V, M, w]. */
    ligger_omh: function (geo: unknown, last: unknown, EI: unknown, groep: unknown, f1: unknown, f2: unknown, teken?: unknown, lead?: unknown) {
      return liggerMatrix(liggerOmhullende(
        liggerRijen(geo), liggerRijen(last), liggerStijf(EI), liggerVector(groep) ?? [], liggerVector(f1) ?? [], liggerVector(f2) ?? [],
        teken === undefined ? 1 : liggerGetal(teken), lead === undefined ? 0 : liggerGetal(lead),
      ));
    },
    /** ligger_omhR(…) → omhullende [x, R, M] per steunpunt, argumenten als ligger_omh. */
    ligger_omhR: function (geo: unknown, last: unknown, EI: unknown, groep: unknown, f1: unknown, f2: unknown, teken?: unknown, lead?: unknown) {
      return liggerMatrix(liggerOmhullendeReacties(
        liggerRijen(geo), liggerRijen(last), liggerStijf(EI), liggerVector(groep) ?? [], liggerVector(f1) ?? [], liggerVector(f2) ?? [],
        teken === undefined ? 1 : liggerGetal(teken), lead === undefined ? 0 : liggerGetal(lead),
      ));
    },
    /** ligger_max(R1; R2; …) → per punt en per kolom de grootste waarde (x uit R1). */
    ligger_max: function (...ms: unknown[]) {
      return liggerMatrix(liggerSamen(1, ...ms.map(liggerRijen)));
    },
    /** ligger_min(R1; R2; …) → per punt en per kolom de kleinste waarde (x uit R1). */
    ligger_min: function (...ms: unknown[]) {
      return liggerMatrix(liggerSamen(-1, ...ms.map(liggerRijen)));
    },
    /** ligger_ext(R; k[; x1; x2]) → [max; x bij max; min; x bij min] van kolom k. */
    ligger_ext: function (R: unknown, k: unknown, x1?: unknown, x2?: unknown) {
      return math.matrix(liggerExtremen(liggerRijen(R), liggerGetal(k),
        x1 === undefined ? -Infinity : liggerGetal(x1), x2 === undefined ? Infinity : liggerGetal(x2)));
    },
    /** ligger_int(R; k; x) → kolom k in x, lineair tussen de rasterpunten. */
    ligger_int: function (R: unknown, k: unknown, x: unknown) {
      return liggerInterpoleer(liggerRijen(R), liggerGetal(k), liggerGetal(x));
    },
    /** ligger_nul(R; k; x_van; x_tot) → eerste x vanaf x_van waar kolom k niet negatief is. */
    ligger_nul: function (R: unknown, k: unknown, xVan: unknown, xTot: unknown) {
      return liggerNulpunt(liggerRijen(R), liggerGetal(k), liggerGetal(xVan), liggerGetal(xTot));
    },
    /** ligger_status(geo[; EI]) → 1 stabiel, -1 beweeglijk, 0 ongeldig. */
    ligger_status: function (geo: unknown, EI?: unknown) {
      return liggerStatus(liggerRijen(geo), EI === undefined ? 1 : liggerStijf(EI));
    },
    /** ligger_delen(geo) → [x_begin, x_eind] per deel voor de schaakbordbelasting. */
    ligger_delen: function (geo: unknown) {
      return liggerMatrix(liggerDelen(liggerRijen(geo)));
    },
    /** ligger_velden(geo) → [x_begin, x_eind, overstek] per veld tussen de steunpunten. */
    ligger_velden: function (geo: unknown) {
      return liggerMatrix(liggerVelden(liggerRijen(geo)));
    },
    /** ligger_svg(R; k; x0; sx; y0; sy) → "X,Y X,Y …" voor een polyline of polygon. */
    ligger_svg: function (R: unknown, k: unknown, x0: unknown, sx: unknown, y0: unknown, sy: unknown) {
      return liggerSvgPunten(liggerRijen(R), liggerGetal(k), liggerGetal(x0), liggerGetal(sx), liggerGetal(y0), liggerGetal(sy));
    },
  },
  { override: true },
);

// ── Raamwerk (packages/core/src/raamwerk.ts) ────────────────────────────────
// Een vlak raamwerk van knopen en staven met scharnieren en opleggingen,
// eerste orde opgelost met de verplaatsingsmethode. Kale getallen in m, kN,
// kN/m, kNm, kNm² (EI) en kN (EA); een grootheid met eenheid wordt omgerekend
// zoals bij de ligger. Uitkomst per staaf: rijen [staaf, s, x, y, N, V, M, u_x,
// u_y, w]. Zie raamwerk.ts voor de afspraken.

/**
 * Rijen van een matrix voor de raamwerkfuncties. Een blad vraagt een uitkomst
 * vaak vele keren op (per staaf, per toets); een matrix met alleen kale getallen
 * gaat daarom zonder kopie door, de rest via liggerRijen (eenheden, vectoren).
 */
function raamwerkRijen(v: unknown): number[][] {
  const d = (v as { _data?: unknown })?._data;
  if (Array.isArray(d) && d.length && d.every((r) => Array.isArray(r) && (r as unknown[]).every((x) => typeof x === 'number'))) {
    return d as number[][];
  }
  return liggerRijen(v);
}

math.import(
  {
    /** raamwerk(kn; st; op; last[; f[; toppen]]) → [staaf, s, x, y, N, V, M, u_x, u_y, w] langs de staven. */
    raamwerk: function (kn: unknown, st: unknown, op: unknown, last: unknown, f?: unknown, toppen?: unknown) {
      return liggerMatrix(raamwerkOplossing(
        raamwerkRijen(kn), raamwerkRijen(st), raamwerkRijen(op), raamwerkRijen(last), liggerVector(f),
        toppen === undefined ? 0 : liggerGetal(toppen),
      ));
    },
    /** raamwerk_R(kn; st; op; last[; f]) → [knoop, R_x, R_y, M] per oplegging. */
    raamwerk_R: function (kn: unknown, st: unknown, op: unknown, last: unknown, f?: unknown) {
      return liggerMatrix(raamwerkReacties(raamwerkRijen(kn), raamwerkRijen(st), raamwerkRijen(op), raamwerkRijen(last), liggerVector(f)));
    },
    /** raamwerk_u(kn; st; op; last[; f]) → [knoop, u_x, u_y, φ] per knoop. */
    raamwerk_u: function (kn: unknown, st: unknown, op: unknown, last: unknown, f?: unknown) {
      return liggerMatrix(raamwerkVerplaatsingen(raamwerkRijen(kn), raamwerkRijen(st), raamwerkRijen(op), raamwerkRijen(last), liggerVector(f)));
    },
    /** raamwerk_acr(kn; st; op; last[; f]) → kritieke belastingsfactor α_cr van de combinatie. */
    raamwerk_acr: function (kn: unknown, st: unknown, op: unknown, last: unknown, f?: unknown) {
      return raamwerkKnik(raamwerkRijen(kn), raamwerkRijen(st), raamwerkRijen(op), raamwerkRijen(last), liggerVector(f));
    },
    /** raamwerk_status(kn; st; op) → 1 stabiel, -1 beweeglijk, 0 ongeldig. */
    raamwerk_status: function (kn: unknown, st: unknown, op: unknown) {
      return raamwerkStatus(raamwerkRijen(kn), raamwerkRijen(st), raamwerkRijen(op));
    },
    /** raamwerk_ext(R; staaf; k) → [max; s bij max; min; s bij min] van kolom k (staaf 0: alle staven). */
    raamwerk_ext: function (R: unknown, staaf: unknown, k: unknown) {
      return math.matrix(raamwerkExtremen(raamwerkRijen(R), liggerGetal(staaf), liggerGetal(k)));
    },
    /** raamwerk_int(R; staaf; k; s) → kolom k van de staaf in s, lineair tussen de rasterpunten. */
    raamwerk_int: function (R: unknown, staaf: unknown, k: unknown, s: unknown) {
      return raamwerkInterpoleer(raamwerkRijen(R), liggerGetal(staaf), liggerGetal(k), liggerGetal(s));
    },
    /** raamwerk_sam(R; staaf) → [N_min; N_max; V_min; V_max; M_min; M_max; M(0); M(L/4); M(L/2); M(3L/4); M(L); L; w_min; w_max]. */
    raamwerk_sam: function (R: unknown, staaf: unknown) {
      return math.matrix(raamwerkSamenvatting(raamwerkRijen(R), liggerGetal(staaf)));
    },
    /** raamwerk_zak(R; staaf; x_a; u_a; x_b; u_b) → grootste verticale verplaatsing ten opzichte van de lijn door (x_a, u_a) en (x_b, u_b). */
    raamwerk_zak: function (R: unknown, staaf: unknown, xa: unknown, ua: unknown, xb: unknown, ub: unknown) {
      return raamwerkZakking(raamwerkRijen(R), liggerGetal(staaf), liggerGetal(xa), liggerGetal(ua), liggerGetal(xb), liggerGetal(ub));
    },
    /** raamwerk_svg(R; staaf; k; x0; y0; schaal; sk) → "X,Y …" voor een polygoon met het verloop van kolom k. */
    raamwerk_svg: function (R: unknown, staaf: unknown, k: unknown, x0: unknown, y0: unknown, schaal: unknown, sk: unknown) {
      return raamwerkSvgPunten(raamwerkRijen(R), liggerGetal(staaf), liggerGetal(k), liggerGetal(x0), liggerGetal(y0), liggerGetal(schaal), liggerGetal(sk));
    },
    /** raamwerk_vorm(R; staaf; x0; y0; schaal; su) → "X,Y …" voor de verplaatste vorm van de staaf. */
    raamwerk_vorm: function (R: unknown, staaf: unknown, x0: unknown, y0: unknown, schaal: unknown, su: unknown) {
      return raamwerkVormPunten(raamwerkRijen(R), liggerGetal(staaf), liggerGetal(x0), liggerGetal(y0), liggerGetal(schaal), liggerGetal(su));
    },
    /** raamwerk_max(R1; R2; …) → per punt en per kolom de grootste waarde (zelfde raster). */
    raamwerk_max: function (...ms: unknown[]) {
      return liggerMatrix(liggerSamen(1, ...ms.map(liggerRijen)));
    },
    /** raamwerk_min(R1; R2; …) → per punt en per kolom de kleinste waarde (zelfde raster). */
    raamwerk_min: function (...ms: unknown[]) {
      return liggerMatrix(liggerSamen(-1, ...ms.map(liggerRijen)));
    },
  },
  { override: true },
);

// ── Doorsnede (packages/core/src/doorsnede.ts) ──────────────────────────────
// Grootheden van een samengestelde doorsnede: rijen [soort, p1 … p5, y, z, n,
// draai] per deel, kale getallen in mm (een lengte met eenheid wordt naar mm
// omgerekend). Zie doorsnede.ts voor de afspraken.

/** Getal in mm; een kaal getal blijft. */
function doorsnedeGetal(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (isUnit(v)) {
    try { return v.toNumber('mm'); } catch { return v.value; }
  }
  return asNumber(v);
}
function doorsnedeRijen(v: unknown): number[][] {
  const a = toArrayLike(v);
  if (!a) return [[doorsnedeGetal(v)]];
  return a.map((r) => {
    const rr = toArrayLike(r);
    return rr ? rr.map(doorsnedeGetal) : [doorsnedeGetal(r)];
  });
}

math.import(
  {
    /** doorsnede(D) → [A; y_c; z_c; I_y; I_z; I_yz; y_min; y_max; z_min; z_max] van de ideële doorsnede. */
    doorsnede: function (D: unknown) {
      return math.matrix(doorsnedeGrootheden(doorsnedeRijen(D)));
    },
    /** doorsnede_deel(D; i) → [A; I_y; I_z; y_min; y_max; z_min; z_max] van deel i, om zijn eigen hart, zonder n. */
    doorsnede_deel: function (D: unknown, i: unknown) {
      return math.matrix(doorsnedeDeel(doorsnedeRijen(D), doorsnedeGetal(i)));
    },
    /** doorsnede_pl(D; as) → [W_pl; plaats van de plastische neutrale lijn], as 1 = om de y-as, 2 = om de z-as. */
    doorsnede_pl: function (D: unknown, as: unknown) {
      return math.matrix(doorsnedePlastisch(doorsnedeRijen(D), doorsnedeGetal(as)));
    },
    /** doorsnede_S(D; as; s) → [S; b]: statisch moment voorbij de lijn s om de zwaartelijn, en de breedte daar. */
    doorsnede_S: function (D: unknown, as: unknown, s: unknown) {
      return math.matrix(doorsnedeStatisch(doorsnedeRijen(D), doorsnedeGetal(as), doorsnedeGetal(s)));
    },
    /** doorsnede_svg(D; i; x0; y0; schaal) → "X,Y …" voor een polygoon met de omtrek van deel i. */
    doorsnede_svg: function (D: unknown, i: unknown, x0: unknown, y0: unknown, schaal: unknown) {
      return doorsnedeSvgPunten(doorsnedeRijen(D), doorsnedeGetal(i), doorsnedeGetal(x0), doorsnedeGetal(y0), doorsnedeGetal(schaal));
    },
  },
  { override: true },
);

export interface Scope {
  [key: string]: unknown;
}

/**
 * Values supplied at runtime for interactive nodes:
 *   - @select blocks  → keyed by `name`, value is one of the option `value`s
 *   - `?` input prompts (CalcPAD) → keyed by `name`, value is a number+unit string
 */
export interface SelectValues {
  [key: string]: string;
}

/**
 * Evaluate a parsed document.
 *
 * `initialScope` seeds the scope before the first line runs. De desktop-app
 * gebruikt dat voor de projectgegevens: gevolgklasse, ontwerplevensduur en de
 * projectkop staan één keer op projectniveau en zijn in elk rekenblad
 * beschikbaar zonder dat ze in de bladtekst herhaald worden. Een blad mag de
 * naam gewoon overschrijven — de seed is een startwaarde, geen slot.
 */
export function evaluate(
  nodes: AstNode[],
  selectValues?: SelectValues,
  initialScope?: Scope,
): EvaluatedNode[] {
  const scope: Scope = { ...(initialScope ?? {}) };
  return evaluateNodes(nodes, scope, selectValues || {});
}

/**
 * Evaluate a sheet ONLY to extract its final scope (variables that ended
 * up bound after running). Used by hosts that need to inherit globals
 * from a parent sheet without rendering its output. Errors are silently
 * ignored — partial scope is still returned.
 */
export function extractScope(nodes: AstNode[], selectValues?: SelectValues): Scope {
  const scope: Scope = {};
  try {
    evaluateNodes(nodes, scope, selectValues || {});
  } catch {
    /* swallow — best-effort scope extraction */
  }
  // Strip internal flags.
  delete scope[BREAK_FLAG];
  delete scope['_i'];
  return scope;
}

/** Sentinel key on `scope` used by `#break` to short-circuit out of a loop. */
const BREAK_FLAG = '__break__';

function evaluateNodes(nodes: AstNode[], scope: Scope, selectValues: SelectValues): EvaluatedNode[] {
  const result: EvaluatedNode[] = [];

  for (const node of nodes) {
    // `#break` raised by a deeper node — stop evaluating siblings. The
    // enclosing `repeat` case picks up the flag and exits the loop.
    if (scope[BREAK_FLAG]) break;
    switch (node.type) {
      case 'heading':
        if (node.hidden) break;
        result.push({ type: 'heading', level: node.level, text: node.text });
        break;

      case 'text':
        if (node.hidden) break;
        if (node.parts && node.parts.length > 0) {
          // Resolve CalcPAD prose interpolation — eval each `expr` part and
          // concat with literal parts. Failed exprs fall back to the source.
          const out: string[] = [];
          for (const p of node.parts) {
            if (p.kind === 'literal') {
              out.push(p.value);
            } else {
              try {
                const v = math.evaluate(p.value, scope);
                out.push(stringifyInterpolated(v));
              } catch {
                out.push(p.value);
              }
            }
          }
          result.push({ type: 'text', text: out.join(''), html: true, ...(node.inline ? { inline: true } : {}) });
        } else {
          // De normbladen schrijven een uitkomst als {{naam}} in een tekstregel,
          // zoals in een tekening. Zonder invulling stond er letterlijk
          // "UC = {{UC_druk}}" op het blad.
          const text = node.text.includes('{{') ? interpolateBraces(node.text, scope) : node.text;
          result.push({ type: 'text', text, html: node.html, ...(node.inline ? { inline: true } : {}) });
        }
        break;

      case 'assignment': {
        // Always evaluate so subsequent formulas see the binding — but only emit
        // the rendered node when not hidden.
        const evaluated = evaluateAssignment(node.name, node.expression, scope);
        if (!node.hidden) result.push(evaluated);
        break;
      }

      case 'input-prompt': {
        // CalcPAD `?` prompt — pick the user-supplied value or fall back to the default.
        // Het veld toont wat er is ingetypt; gerekend wordt met een punt. Een
        // komma is hier altijd een decimaalteken: "0,42" is 0,42.
        const invoer = String(selectValues[node.name] ?? node.defaultValue);
        // Een leeg veld telt als 0 in de eenheid van het veld, net als een
        // nieuw '?'-veld. Zonder deze stap werd "" met eenheid " kN": een
        // eenheid zonder getal, die als 1 kN rekende of verderop NaN en
        // "unit with undefined value" gaf; zonder eenheid bleef de naam
        // ongedefinieerd. Het veld zelf blijft leeg (currentValue).
        const raw = invoer.trim().replace(',', '.') || '0';
        const fullExpr = node.unit ? `${raw} ${node.unit}` : raw;
        try {
          const waarde = math.evaluate(fullExpr, {});
          // Wat geen getal oplevert (alleen een eenheid of een teken, zoals
          // "kN" of "-"), gaat naar de afhandeling van een halve invoer.
          if (waarde === undefined || waarde === null || (isUnit(waarde) && waarde.value === null)) {
            throw new Error('invoer zonder getal');
          }
          scope[node.name] = waarde;
        } catch {
          // Een halve invoer (tijdens het typen "0." of "") telt als getal, en
          // houdt zijn eenheid: zonder eenheid liep elke regel die er verderop
          // mee rekende vast op "Units do not match".
          const getal = parseFloat(raw);
          const n = Number.isFinite(getal) ? getal : 0;
          try {
            scope[node.name] = node.unit ? math.evaluate(`${n} ${node.unit}`, {}) : n;
          } catch {
            scope[node.name] = n;
          }
        }
        if (!node.hidden) {
          result.push({
            type: 'input-prompt',
            name: node.name,
            label: node.label,
            unit: node.unit,
            currentValue: invoer,
          });
        }
        break;
      }

      case 'user-function': {
        // mathjs supports the `f(x) = expr` form natively via its parser, maar
        // wel in zíjn eigen notatie. Daarom de genormaliseerde body gebruiken
        // en niet de rauwe regel: die staat er nog in CalcPAD-notatie, met
        // puntkomma's in `if(a; b; c)` en tekens als ≤ en ≡. mathjs slikte dat
        // niet, de definitie mislukte, en omdat de fout bij een verborgen regel
        // wordt ingeslikt bleef de aanroep verderop stilzwijgend als tekst in
        // de uitdraai staan.
        try {
          math.evaluate(`${node.name}(${node.params.join(', ')}) = ${node.expression}`, scope);
        } catch (err) {
          // Surface error as a hidden text — function won't be callable later.
          if (!node.hidden) {
            result.push({
              type: 'text',
              text: `Error defining function ${node.name}: ${(err as Error).message}`,
            });
          }
        }
        if (!node.hidden) {
          result.push({
            type: 'user-function',
            name: node.name,
            params: node.params,
            expression: node.expression,
          });
        }
        break;
      }

      case 'var-display': {
        const value = scope[node.name];
        if (value === undefined) {
          if (!node.hidden) {
            result.push({ type: 'text', text: `(${node.name} is niet gedefinieerd)` });
          }
          break;
        }
        if (!node.hidden) {
          const resultStr = formatResult(value);
          const unit = isUnit(value) ? simplifyUnitString(value) : '';
          result.push({ type: 'var-display', name: node.name, result: resultStr, unit });
        }
        break;
      }

      case 'break': {
        // Set the break flag — the enclosing repeat case consumes it.
        scope[BREAK_FLAG] = true;
        break;
      }

      case 'repeat': {
        let count = 0;
        try {
          const v = math.evaluate(node.count, scope);
          count = Math.trunc(Number(v));
        } catch {
          count = parseInt(node.count, 10) || 0;
        }
        if (count < 0 || count > 10000) {
          count = Math.min(Math.max(count, 0), 10000);
        }
        for (let iter = 1; iter <= count; iter++) {
          scope['_i'] = iter;
          const children = evaluateNodes(node.body, scope, selectValues);
          if (!node.hidden) result.push(...children);
          if (scope[BREAK_FLAG]) {
            // Iteration stopped — consume the flag so outer loops aren't
            // also broken out of.
            delete scope[BREAK_FLAG];
            break;
          }
        }
        break;
      }

      case 'plot': {
        if (node.hidden) break;
        try {
          const svg = renderPlotSvg(node, scope);
          result.push({ type: 'plot', svg });
        } catch (err) {
          result.push({
            type: 'text',
            text: `Plot fout: ${(err as Error).message}`,
          });
        }
        break;
      }

      case 'conditional': {
        const condResult = evaluateConditional(node, scope, selectValues);
        if (condResult && !node.hidden) result.push(condResult);
        break;
      }

      case 'svg': {
        if (node.hidden) break;
        const interpolated = interpolateBraces(node.content, scope);
        result.push({ type: 'svg', content: interpolated });
        break;
      }

      case 'image':
        if (node.hidden) break;
        result.push({ type: 'image', src: node.src });
        break;

      case 'gef-upload':
        if (node.hidden) break;
        result.push({ type: 'gef-upload', name: node.name, data: null });
        break;

      case 'select': {
        const selectedValue = selectValues[node.name] ?? node.options[0]?.value ?? '0';
        // Always bind to scope; only emit when not hidden.
        try {
          scope[node.name] = math.evaluate(selectedValue, {});
        } catch {
          scope[node.name] = parseFloat(selectedValue) || 0;
        }
        if (!node.hidden) {
          result.push({
            type: 'select',
            name: node.name,
            label: node.label,
            options: node.options,
            selectedValue,
          });
        }
        break;
      }
    }
  }

  return result;
}

// Separate "expr to unit" into expression and target unit
const TO_UNIT_RE = /^(.+?)\s+to\s+(.+)$/;
const IN_UNIT_RE = /^(.+?)\s+in\s+(.+)$/;

function evaluateAssignment(
  name: string,
  expression: string,
  scope: Scope
): EvaluatedNode {
  try {
    // Parse "to unit" / "in unit" for display purposes
    let displayExpr = expression;
    const toMatch = expression.match(TO_UNIT_RE) || expression.match(IN_UNIT_RE);
    if (toMatch) {
      displayExpr = toMatch[1].trim();
    }

    // Evaluate the full expression (including "to unit" if present)
    const compiled = math.parse(expression);
    const value = compiled.evaluate(scope);
    scope[name] = value;

    // Build substitution: replace variable names with their values
    const substitution = buildSubstitution(displayExpr, scope, name);

    // Format the result with simplified units
    const resultStr = formatResult(value);
    const unit = isUnit(value) ? simplifyUnitString(value) : '';

    return {
      type: 'assignment',
      name,
      expression: displayExpr,
      substitution,
      result: resultStr,
      unit,
    };
  } catch (err) {
    // Bind to NaN so downstream references don't cascade into "Undefined
    // symbol" — they'll get NaN and either short-circuit or propagate.
    scope[name] = Number.NaN;
    return {
      type: 'assignment',
      name,
      expression,
      substitution: '',
      result: `Error: ${(err as Error).message}`,
      unit: '',
    };
  }
}

function buildSubstitution(
  expression: string,
  scope: Scope,
  currentVar: string
): string {
  const parsed = math.parse(expression);
  const variables = new Set<string>();
  parsed.traverse((node: MathNode) => {
    if (node.type === 'SymbolNode' && 'name' in node) {
      const nodeName = (node as unknown as { name: string }).name;
      if (nodeName !== currentVar && nodeName in scope) {
        variables.add(nodeName);
      }
    }
  });

  if (variables.size === 0) {
    return '';
  }

  let sub = expression;
  for (const varName of variables) {
    const val = scope[varName];
    // Alleen getallen, grootheden met eenheid en teksten invullen. Een
    // gebruikersfunctie staat ook in de scope, maar dan kwam de broncode van de
    // mathjs-functie in de uitdraai; een matrix werd een lege plek, zodat er
    // `hlookup(, 2, 1, 2)` stond. Die houden hun naam.
    const invulbaar =
      typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean' || isUnit(val);
    if (!invulbaar) continue;
    const formatted = formatInline(val);
    // Wrap in parentheses if value has a unit (contains space) to preserve
    // operator precedence: h^2 → (500 mm)^2, not 500 mm^2
    const wrapped = isUnit(val) ? `(${formatted})` : formatted;
    // Grenzen op letters en cijfers in Unicode-zin. `\b` kent alleen ASCII,
    // waardoor een naam die met een Griekse letter begint (γ_M, σ_m,d, ψ_0)
    // nooit werd ingevuld: de ingevulde formule toonde dan nog het symbool.
    const naam = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    sub = sub.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${naam}(?![\\p{L}\\p{N}_])`, 'gu'), wrapped);
  }
  return sub;
}

// ─── Unit simplification ────────────────────────────────────────────

interface UnitComponent {
  unit: { name: string };
  prefix: { name: string };
  power: number;
}

interface MathUnit {
  toNumber: (unit: string) => number;
  formatUnits: () => string;
  units: UnitComponent[];
  value: number;
}

/** Check if a value is a mathjs Unit */
function isUnit(value: unknown): value is MathUnit {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).toNumber === 'function' &&
    typeof (value as Record<string, unknown>).formatUnits === 'function'
  );
}

/**
 * Simplify unit string by combining like units.
 * mm mm → mm^2, kN / (mm mm) → kN / mm^2
 */
function simplifyUnitString(value: MathUnit): string {
  const groups: Record<string, { name: string; power: number }> = {};

  for (const u of value.units) {
    const key = u.prefix.name + u.unit.name;
    if (groups[key] === undefined) {
      groups[key] = { name: key, power: 0 };
    }
    groups[key].power += u.power;
  }

  const entries = Object.values(groups).filter(g => g.power !== 0);
  const pos = entries.filter(g => g.power > 0);
  const neg = entries.filter(g => g.power < 0);

  let result = pos
    .map(g => (g.power === 1 ? g.name : `${g.name}^${g.power}`))
    .join(' ');

  if (neg.length > 0) {
    const negStr = neg
      .map(g => {
        const absPow = Math.abs(g.power);
        return absPow === 1 ? g.name : `${g.name}^${absPow}`;
      })
      .join(' ');

    if (pos.length === 0) {
      // Pure inverse: 1 / mm^2
      result = `1 / ${neg.length > 1 ? `(${negStr})` : negStr}`;
    } else {
      result += ` / ${neg.length > 1 ? `(${negStr})` : negStr}`;
    }
  }

  return result;
}

/** Get the numeric value in the simplified unit */
function getNumericValue(value: MathUnit): number {
  try {
    const simplified = simplifyUnitString(value);
    return value.toNumber(simplified);
  } catch {
    // Fallback: extract from toString
    const str = String(value);
    const match = str.match(/^([+-]?\d+\.?\d*(?:e[+-]?\d+)?)\s/i);
    if (match) return parseFloat(match[1]);
    return value.value;
  }
}

// ─── Number formatting ──────────────────────────────────────────────

function formatNumber(n: number): string {
  // Een deling door een weerstand nul geeft een oneindige unity check; die
  // hoort als ∞ op het blad, niet als het woord "Infinity".
  if (Number.isNaN(n)) return 'NaN';
  if (!isFinite(n)) return n > 0 ? '∞' : '-∞';
  if (n === 0) return '0';

  // If integer and not too large, show exact
  if (Number.isInteger(n) && Math.abs(n) < 1e12) {
    return n.toString();
  }

  // Use 4 significant digits for non-integers
  const formatted = parseFloat(n.toPrecision(4));

  // Avoid scientific notation for reasonable ranges
  if (Math.abs(formatted) >= 0.001 && Math.abs(formatted) < 1e9) {
    return formatted.toString();
  }

  return n.toExponential(3);
}

/** Format value for the final result: "150000 mm^2" */
function formatResult(value: unknown): string {
  if (value === null || value === undefined) return '';

  if (isUnit(value)) {
    const num = getNumericValue(value);
    const unit = simplifyUnitString(value);
    return `${formatNumber(num)} ${unit}`;
  }

  if (typeof value === 'number') {
    return formatNumber(value);
  }

  return String(value);
}

/** Format value for inline substitution: "300 mm" */
function formatInline(value: unknown): string {
  if (value === null || value === undefined) return '';

  if (isUnit(value)) {
    const num = getNumericValue(value);
    const unit = simplifyUnitString(value);
    return `${formatNumber(num)} ${unit}`;
  }

  if (typeof value === 'number') {
    return formatNumber(value);
  }

  return String(value);
}

// ─── Conditionals ───────────────────────────────────────────────────

/**
 * Cascading evaluation — first branch whose condition is truthy wins.
 * Falls through to `elseBody` if none match.
 */
function evaluateConditional(
  node: ConditionalNode,
  scope: Scope,
  selectValues: SelectValues,
): EvaluatedNode | null {
  const branches = node.branches ?? (
    // Legacy fallback if a caller hands us pre-cascading nodes
    node.condition !== undefined && node.ifBody !== undefined
      ? [{ condition: node.condition, body: node.ifBody }]
      : []
  );

  for (const branch of branches) {
    try {
      const condValue = math.evaluate(branch.condition, scope);
      if (Boolean(condValue)) {
        if (branch.body.length === 0) return null;
        const children = evaluateNodes(branch.body, scope, selectValues);
        return { type: 'conditional-branch', children };
      }
    } catch {
      return {
        type: 'conditional-branch',
        children: [{ type: 'text', text: `Error evaluating condition: ${branch.condition}` }],
      };
    }
  }

  // No branch matched — try else
  if (node.elseBody && node.elseBody.length > 0) {
    const children = evaluateNodes(node.elseBody, scope, selectValues);
    return { type: 'conditional-branch', children };
  }
  return null;
}

// ─── Plot rendering ─────────────────────────────────────────────────

/**
 * Sample each curve at `samples` evenly-spaced parameter values and produce
 * a self-contained SVG with axes + colored polylines. Numbers are coerced to
 * plain JS numbers (units are stripped via `valueOf`).
 */
function renderPlotSvg(
  node: { curves: { xExpr?: string; yExpr: string }[]; param: string; lo: string; hi: string; samples?: number },
  scope: Scope,
): string {
  const samples = node.samples ?? 120;
  const lo = toPlain(math.evaluate(node.lo, scope));
  const hi = toPlain(math.evaluate(node.hi, scope));
  if (!isFinite(lo) || !isFinite(hi) || lo === hi) {
    throw new Error(`invalid range ${lo} … ${hi}`);
  }

  // Pre-compile each curve's expressions
  const compiled = node.curves.map((c) => ({
    x: c.xExpr ? math.parse(c.xExpr).compile() : null,
    y: math.parse(c.yExpr).compile(),
  }));

  // Sample
  type Pt = { x: number; y: number };
  const seriesData: Pt[][] = compiled.map(() => []);
  const innerScope: Scope = { ...scope };
  for (let i = 0; i <= samples; i++) {
    const t = lo + ((hi - lo) * i) / samples;
    innerScope[node.param] = t;
    for (let s = 0; s < compiled.length; s++) {
      try {
        const x = compiled[s].x ? toPlain(compiled[s].x!.evaluate(innerScope)) : t;
        const y = toPlain(compiled[s].y.evaluate(innerScope));
        if (isFinite(x) && isFinite(y)) {
          seriesData[s].push({ x, y });
        }
      } catch { /* skip bad sample */ }
    }
  }

  // Compute bounds across all series
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const series of seriesData) {
    for (const p of series) {
      if (p.x < xMin) xMin = p.x;
      if (p.x > xMax) xMax = p.x;
      if (p.y < yMin) yMin = p.y;
      if (p.y > yMax) yMax = p.y;
    }
  }
  if (!isFinite(xMin) || xMin === xMax) { xMin -= 1; xMax += 1; }
  if (!isFinite(yMin) || yMin === yMax) { yMin -= 1; yMax += 1; }
  const xPad = (xMax - xMin) * 0.05;
  const yPad = (yMax - yMin) * 0.08;
  xMin -= xPad; xMax += xPad; yMin -= yPad; yMax += yPad;

  const W = 520;
  const H = 320;
  const padL = 44, padR = 16, padT = 16, padB = 32;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const sx = (v: number): number => padL + ((v - xMin) / (xMax - xMin)) * plotW;
  const sy = (v: number): number => padT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const colors = ['#D97706', '#2563EB', '#16A34A', '#DC2626', '#7C3AED', '#0891B2'];
  const series = seriesData.map((pts, s) => {
    if (pts.length === 0) return '';
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
    const color = colors[s % colors.length];
    // Single-point series (e.g. roots `x_1|0`) → dot instead of line.
    if (pts.length <= 2 && pts.every((p, i, arr) => i === 0 || (p.x === arr[i - 1].x && p.y === arr[i - 1].y))) {
      const p = pts[0];
      return `<circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="4" fill="${color}" />`;
    }
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round" />`;
  });

  // Axes — origin lines if 0 is inside the range
  const axes: string[] = [];
  if (xMin < 0 && xMax > 0) {
    const x0 = sx(0);
    axes.push(`<line x1="${x0.toFixed(1)}" y1="${padT}" x2="${x0.toFixed(1)}" y2="${padT + plotH}" stroke="#94a3b8" stroke-width="0.8" />`);
  }
  if (yMin < 0 && yMax > 0) {
    const y0 = sy(0);
    axes.push(`<line x1="${padL}" y1="${y0.toFixed(1)}" x2="${padL + plotW}" y2="${y0.toFixed(1)}" stroke="#94a3b8" stroke-width="0.8" />`);
  }

  // Frame + tick labels (4 on each axis)
  const ticks: string[] = [];
  for (let i = 0; i <= 4; i++) {
    const tx = xMin + ((xMax - xMin) * i) / 4;
    const ty = yMin + ((yMax - yMin) * i) / 4;
    const x = sx(tx);
    const y = sy(ty);
    ticks.push(`<text x="${x.toFixed(1)}" y="${H - padB + 14}" font-size="9" fill="#64748b" text-anchor="middle">${formatTick(tx)}</text>`);
    ticks.push(`<text x="${padL - 6}" y="${y.toFixed(1) }" font-size="9" fill="#64748b" text-anchor="end" dominant-baseline="middle">${formatTick(ty)}</text>`);
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="calc-plot">
    <rect x="${padL}" y="${padT}" width="${plotW}" height="${plotH}" fill="#fafaf9" stroke="#e7e5e4" stroke-width="1" />
    ${axes.join('\n    ')}
    ${series.join('\n    ')}
    ${ticks.join('\n    ')}
  </svg>`;
}

function toPlain(v: unknown): number {
  if (typeof v === 'number') return v;
  if (isUnit(v)) {
    try { return getNumericValue(v); } catch { return Number.NaN; }
  }
  const n = Number(v);
  return isFinite(n) ? n : Number.NaN;
}

function formatTick(n: number): string {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1000 || abs < 0.01) return n.toExponential(1);
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(2).replace(/\.?0+$/, '');
}

// ─── SVG interpolation ──────────────────────────────────────────────

/**
 * Convert an evaluated mathjs value to a string suitable for inlining into
 * SVG / HTML markup. Numbers lose their units (SVG coordinates are unitless).
 */
function stringifyInterpolated(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return formatNumber(v);
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (isUnit(v)) return formatNumber(getNumericValue(v));
  return String(v);
}

/** Vult {{naam}} in met de waarde uit de scope, zonder eenheid; onbekende namen blijven staan. */
function interpolateBraces(content: string, scope: Scope): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, varName: string) => {
    if (varName in scope) {
      const val = scope[varName];
      if (isUnit(val)) {
        return formatNumber(getNumericValue(val));
      }
      if (typeof val === 'number') {
        return formatNumber(val);
      }
      return String(val);
    }
    return `{{${varName}}}`;
  });
}
