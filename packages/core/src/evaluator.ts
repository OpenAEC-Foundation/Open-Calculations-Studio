import { create, all, type MathJsInstance, type MathNode } from 'mathjs';
import type { AstNode, ConditionalNode, EvaluatedNode } from './types.js';

const math: MathJsInstance = create(all, {});

// CalcPAD-style helper functions that mathjs doesn't ship with.
math.import(
  {
    // Inline ternary: `if(cond, t, f)`
    if: function (cond: unknown, t: unknown, f: unknown) {
      return Boolean(cond) ? t : f;
    },
    // 1-based vector index: `take(2, [10, 20, 30])` → 20
    // Also tolerates 1-arg form `take(vec)` → first element.
    take: function (...args: unknown[]) {
      // CalcPAD syntax is `take(idx, vec)`; after `;` → `,` normalization
      // the second arg is the vector. mathjs may pass either order; accept both.
      if (args.length === 1) {
        const v = args[0];
        return Array.isArray(v) ? v[0] : v;
      }
      const [a, b] = args;
      const idx = typeof a === 'number' ? a : typeof b === 'number' ? b : NaN;
      const vec = Array.isArray(a) ? a : Array.isArray(b) ? b : null;
      if (!vec) return Number.NaN;
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
    hlookup: function (...args: unknown[]) {
      const arr = args.find((a) => Array.isArray(a)) as unknown[] | undefined;
      const target = args.find((a) => typeof a === 'number' || (a && typeof (a as object).valueOf === 'function')) ?? 0;
      if (!arr) return 0;
      const tNum = Number(target);
      let bestIdx = 0;
      let bestDelta = Infinity;
      for (let i = 0; i < arr.length; i++) {
        const v = Number(arr[i]);
        const d = Math.abs(v - tNum);
        if (d < bestDelta) { bestDelta = d; bestIdx = i; }
      }
      return arr[bestIdx];
    },
    vlookup: function (...args: unknown[]) {
      return (math as unknown as { hlookup: (...a: unknown[]) => unknown }).hlookup(...args);
    },
    // Variants of hlookup — closest-greater-or-equal, closest-less-or-equal
    hlookup_ge: function (...args: unknown[]) {
      const arr = args.find((a) => Array.isArray(a)) as unknown[] | undefined;
      const target = Number(args.find((a) => typeof a === 'number') ?? 0);
      if (!arr || arr.length === 0) return 0;
      let candidate: unknown = arr[0];
      let bestDelta = Infinity;
      for (const v of arr) {
        const n = Number(v);
        if (n >= target && n - target < bestDelta) { bestDelta = n - target; candidate = v; }
      }
      return candidate;
    },
    hlookup_le: function (...args: unknown[]) {
      const arr = args.find((a) => Array.isArray(a)) as unknown[] | undefined;
      const target = Number(args.find((a) => typeof a === 'number') ?? 0);
      if (!arr || arr.length === 0) return 0;
      let candidate: unknown = arr[arr.length - 1];
      let bestDelta = Infinity;
      for (const v of arr) {
        const n = Number(v);
        if (n <= target && target - n < bestDelta) { bestDelta = target - n; candidate = v; }
      }
      return candidate;
    },
    n_rows: function (v: unknown) {
      if (Array.isArray(v)) return v.length;
      return 1;
    },
    n_cols: function (v: unknown) {
      if (Array.isArray(v) && Array.isArray(v[0])) return v[0].length;
      return 1;
    },
    // CalcPAD `get(row, col, matrix)` — fetch matrix element (1-based)
    get: function (...args: unknown[]) {
      const mat = args.find((a) => Array.isArray(a)) as unknown[] | undefined;
      if (!mat) return 0;
      const nums = args.filter((a) => typeof a === 'number') as number[];
      const row = nums[0] ? Math.max(1, Math.trunc(nums[0])) - 1 : 0;
      const col = nums[1] ? Math.max(1, Math.trunc(nums[1])) - 1 : 0;
      const rowVal = mat[Math.min(row, mat.length - 1)];
      if (Array.isArray(rowVal)) {
        return rowVal[Math.min(col, rowVal.length - 1)];
      }
      return rowVal;
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

export function evaluate(nodes: AstNode[], selectValues?: SelectValues): EvaluatedNode[] {
  const scope: Scope = {};
  return evaluateNodes(nodes, scope, selectValues || {});
}

function evaluateNodes(nodes: AstNode[], scope: Scope, selectValues: SelectValues): EvaluatedNode[] {
  const result: EvaluatedNode[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case 'heading':
        if (node.hidden) break;
        result.push({ type: 'heading', level: node.level, text: node.text });
        break;

      case 'text':
        if (node.hidden) break;
        result.push({ type: 'text', text: node.text, html: node.html });
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
        const raw = selectValues[node.name] ?? node.defaultValue;
        const fullExpr = node.unit ? `${raw} ${node.unit}` : raw;
        try {
          scope[node.name] = math.evaluate(fullExpr, {});
        } catch {
          scope[node.name] = parseFloat(raw) || 0;
        }
        if (!node.hidden) {
          result.push({
            type: 'input-prompt',
            name: node.name,
            label: node.label,
            unit: node.unit,
            currentValue: raw,
          });
        }
        break;
      }

      case 'user-function': {
        // mathjs supports the `f(x) = expr` form natively via its parser.
        try {
          math.evaluate(node.raw, scope);
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
        const interpolated = interpolateSvg(node.content, scope);
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
    const formatted = formatInline(val);
    // Wrap in parentheses if value has a unit (contains space) to preserve
    // operator precedence: h^2 → (500 mm)^2, not 500 mm^2
    const wrapped = isUnit(val) ? `(${formatted})` : formatted;
    sub = sub.replace(new RegExp(`\\b${varName}\\b`, 'g'), wrapped);
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
  if (!isFinite(n)) return String(n);
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

function interpolateSvg(content: string, scope: Scope): string {
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
