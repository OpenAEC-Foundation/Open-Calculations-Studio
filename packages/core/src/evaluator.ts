import { create, all, type MathJsInstance, type MathNode } from 'mathjs';
import type { AstNode, ConditionalNode, EvaluatedNode } from './types.js';

const math: MathJsInstance = create(all, {});

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
        result.push({ type: 'text', text: node.text });
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
        // Evaluate count as expression — fall back to integer parse.
        let count = 0;
        try {
          const v = math.evaluate(node.count, scope);
          count = Math.trunc(Number(v));
        } catch {
          count = parseInt(node.count, 10) || 0;
        }
        if (count < 0 || count > 10000) {
          // Safety cap — prevents runaway loops from freezing the UI.
          count = Math.min(Math.max(count, 0), 10000);
        }
        for (let iter = 1; iter <= count; iter++) {
          scope['_i'] = iter;
          const children = evaluateNodes(node.body, scope, selectValues);
          if (!node.hidden) result.push(...children);
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
