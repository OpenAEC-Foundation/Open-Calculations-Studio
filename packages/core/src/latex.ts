import { parse, type MathNode } from 'mathjs';

// ─── Greek letters ──────────────────────────────────────────────────

const GREEK: Record<string, string> = {
  alpha: '\\alpha', beta: '\\beta', gamma: '\\gamma', delta: '\\delta',
  epsilon: '\\varepsilon', zeta: '\\zeta', eta: '\\eta', theta: '\\theta',
  iota: '\\iota', kappa: '\\kappa', lambda: '\\lambda', mu: '\\mu',
  nu: '\\nu', xi: '\\xi', pi: '\\pi', rho: '\\rho',
  sigma: '\\sigma', tau: '\\tau', upsilon: '\\upsilon', phi: '\\varphi',
  chi: '\\chi', psi: '\\psi', omega: '\\omega',
  Gamma: '\\Gamma', Delta: '\\Delta', Theta: '\\Theta', Lambda: '\\Lambda',
  Sigma: '\\Sigma', Phi: '\\Phi', Psi: '\\Psi', Omega: '\\Omega',
};

// ─── Unit names ─────────────────────────────────────────────────────

const UNIT_NAMES = new Set([
  'mm', 'cm', 'dm', 'm', 'km', 'inch', 'ft',
  'mm2', 'cm2', 'm2', 'mm3', 'cm3', 'm3', 'mm4', 'cm4', 'm4',
  'N', 'kN', 'MN', 'GN', 'mN',
  'Pa', 'kPa', 'MPa', 'GPa',
  'kg', 'g', 't',
  's', 'ms', 'min', 'hr',
  'Hz', 'kHz',
  'J', 'kJ', 'MJ',
  'W', 'kW', 'MW',
  'deg', 'rad',
  'K', 'C',
]);

function isKnownUnit(name: string): boolean {
  return UNIT_NAMES.has(name);
}

// ─── Typed node access (mathjs MathNode is loosely typed) ───────────

interface AnyNode {
  type: string;
  value?: number | string;
  name?: string;
  op?: string;
  fn?: string | { name?: string };
  implicit?: boolean;
  args?: MathNode[];
  content?: MathNode;
}

function n(node: MathNode): AnyNode {
  return node as unknown as AnyNode;
}

// ─── Symbol formatting ──────────────────────────────────────────────

function escapeText(s: string): string {
  // KaTeX's `\text{}` is text-mode: `_` and `^` and `\` and `{}` need escaping
  // to render literally. CalcPAD identifiers fold multi-comma subscripts to
  // `_` (e.g. `V_b_0`), so the sub-string commonly contains underscores.
  return s.replace(/\\/g, '\\backslash{}').replace(/[_^{}#$%&]/g, '\\$&');
}

function symbolToLatex(name: string): string {
  const underscoreIdx = name.indexOf('_');
  if (underscoreIdx > 0) {
    const base = name.substring(0, underscoreIdx);
    const sub = name.substring(underscoreIdx + 1);
    const baseLatex = GREEK[base] || base;
    return `{${baseLatex}_{\\text{${escapeText(sub)}}}}`;
  }
  if (GREEK[name]) return GREEK[name];
  // Multi-letter non-Greek variable: use mathrm
  if (name.length > 1 && !isKnownUnit(name)) return `\\text{${escapeText(name)}}`;
  return name;
}

function unitToLatex(name: string): string {
  return `\\text{${escapeText(name)}}`;
}

// ─── Number formatting ──────────────────────────────────────────────

function numberToLatex(value: number): string {
  if (!isFinite(value)) return String(value);
  if (value === 0) return '0';

  // Integer in reasonable range
  if (Number.isInteger(value) && Math.abs(value) < 1e12) {
    return value.toString();
  }

  // Small precision for display
  const rounded = parseFloat(value.toPrecision(4));

  // Use scientific notation only for very large/small
  if (Math.abs(rounded) >= 0.001 && Math.abs(rounded) < 1e9) {
    return rounded.toString();
  }

  // Scientific notation: 3.125 × 10⁹
  const exp = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = parseFloat((value / Math.pow(10, exp)).toPrecision(4));
  return `${mantissa} \\times 10^{${exp}}`;
}

// ─── AST to LaTeX ───────────────────────────────────────────────────

export function exprToLatex(expr: string): string {
  try {
    const node = parse(expr);
    return nodeToLatex(node);
  } catch {
    return escapeLatex(expr);
  }
}

function escapeLatex(s: string): string {
  return s.replace(/[_^{}\\]/g, c => '\\' + c);
}

function nodeToLatex(node: MathNode): string {
  const nd = n(node);

  switch (nd.type) {
    case 'ConstantNode':
      return numberToLatex(Number(nd.value));

    case 'SymbolNode': {
      const name = nd.name!;
      if (isKnownUnit(name)) return unitToLatex(name);
      return symbolToLatex(name);
    }

    case 'OperatorNode':
      return operatorToLatex(nd);

    case 'FunctionNode':
      return functionToLatex(nd);

    case 'ParenthesisNode':
      return `\\left(${nodeToLatex(nd.content!)}\\right)`;

    case 'ArrayNode':
    case 'BlockNode':
      return nd.args ? nd.args.map(a => nodeToLatex(a)).join(', ') : '';

    default:
      return String(node);
  }
}

function operatorToLatex(nd: AnyNode): string {
  const args = nd.args || [];

  switch (nd.op) {
    case '/': {
      // Fraction: \frac{num}{den}
      const num = args[0] ? nodeToLatex(args[0]) : '';
      const den = args[1] ? nodeToLatex(args[1]) : '';
      return `\\frac{${num}}{${den}}`;
    }

    case '*': {
      if (nd.implicit) {
        // Implicit multiplication (number · unit): 300 mm → 300\;mm
        const left = args[0] ? nodeToLatex(args[0]) : '';
        const right = args[1] ? nodeToLatex(args[1]) : '';
        // If left is a number and right is a unit, use thin space
        const rightNd = n(args[1]);
        if (rightNd.type === 'SymbolNode' && isKnownUnit(rightNd.name!)) {
          return `${left} \\; ${right}`;
        }
        // Otherwise (e.g., 2x), just juxtapose
        return `${left} \\, ${right}`;
      }
      // Explicit multiplication: a · b
      const parts = args.map(arg => {
        const child = n(arg);
        // Wrap addition/subtraction in parentheses
        if (child.type === 'OperatorNode' && (child.op === '+' || child.op === '-') && (child.args?.length ?? 0) > 1) {
          return `\\left(${nodeToLatex(arg)}\\right)`;
        }
        return nodeToLatex(arg);
      });
      return parts.join(' \\cdot ');
    }

    case '^': {
      const base = args[0] ? nodeToLatex(args[0]) : '';
      const exp = args[1] ? nodeToLatex(args[1]) : '';
      // If base is a complex expression, wrap in braces
      const baseNd = n(args[0]);
      if (baseNd.type === 'OperatorNode' || baseNd.type === 'FunctionNode') {
        return `{\\left(${base}\\right)}^{${exp}}`;
      }
      return `{${base}}^{${exp}}`;
    }

    case '+': {
      return args.map(arg => nodeToLatex(arg)).join(' + ');
    }

    case '-': {
      if (args.length === 1) {
        // Unary minus
        return `-${nodeToLatex(args[0])}`;
      }
      return args.map((arg, i) => {
        if (i === 0) return nodeToLatex(arg);
        return `- ${nodeToLatex(arg)}`;
      }).join(' ');
    }

    default:
      return args.map(arg => nodeToLatex(arg)).join(` \\; ${nd.op} \\; `);
  }
}

function functionToLatex(nd: AnyNode): string {
  const args = nd.args || [];
  const fnName = typeof nd.fn === 'string' ? nd.fn : nd.fn?.name || nd.name || 'f';

  switch (fnName) {
    case 'sqrt':
      return `\\sqrt{${args.map(a => nodeToLatex(a)).join(', ')}}`;

    case 'abs':
      return `\\left|${args.map(a => nodeToLatex(a)).join(', ')}\\right|`;

    case 'sin': case 'cos': case 'tan':
    case 'asin': case 'acos': case 'atan':
    case 'sinh': case 'cosh': case 'tanh':
    case 'log': case 'ln': case 'exp':
    case 'min': case 'max': {
      const latexFn = fnName === 'ln' ? '\\ln' : `\\${fnName}`;
      return `${latexFn}\\left(${args.map(a => nodeToLatex(a)).join(', ')}\\right)`;
    }

    case 'pow': {
      if (args.length === 2) {
        const base = nodeToLatex(args[0]);
        const exp = nodeToLatex(args[1]);
        return `{${base}}^{${exp}}`;
      }
      break;
    }

    case 'round': case 'ceil': case 'floor': {
      return `\\text{${fnName}}\\left(${args.map(a => nodeToLatex(a)).join(', ')}\\right)`;
    }
  }

  // Fallback
  return `\\text{${fnName}}\\left(${args.map(a => nodeToLatex(a)).join(', ')}\\right)`;
}

// ─── Result formatting ──────────────────────────────────────────────

/** Format a result value (number + unit) as LaTeX */
export function resultToLatex(numStr: string, unitStr: string): string {
  const num = escapeLatex(numStr);
  if (!unitStr) return num;
  return `${num} \\; ${unitPartToLatex(unitStr)}`;
}

/** Format a unit string like "N / mm^2" as LaTeX */
export function unitPartToLatex(unitStr: string): string {
  // Handle compound units like "N / mm^2" or "kN m"
  // Parse as a mathjs expression to get proper LaTeX
  try {
    // Wrap in "1 unit" so mathjs parses it as a unit expression
    const node = parse(`1 ${unitStr}`);
    const latex = nodeToLatex(node);
    // Remove the leading "1 \;" from the result
    return latex.replace(/^1\s*\\[;,]\s*/, '').replace(/^1\s+/, '');
  } catch {
    // Fallback: simple text rendering
    return `\\text{${unitStr.replace(/\^(\d+)/g, '}^{$1}\\text{')}}`;
  }
}

/** Format a variable name as LaTeX */
export function nameToLatex(name: string): string {
  return symbolToLatex(name);
}
