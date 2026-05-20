import { StreamLanguage, type StreamParser } from "@codemirror/language";
import {
  HighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { tags as t } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";

/**
 * CodeMirror 6 stream parser for the .ifc-calculation / CalcPAD syntax.
 *
 * Token classes (Lezer tags):
 *   heading       → '# h1 …'  and  '"CalcPAD Title'
 *   comment       → '//' line comment
 *   keyword       → '#if', '#else', '#else if', '#end if', '#hide', '#show',
 *                   '#pre', '#post', '#repeat', '#end repeat',
 *                   '#rad', '#deg', '#gra'
 *   meta          → '@svg', '@end', '@select', '@gef', '@img(…)', '$Plot{ … }'
 *   string        → CalcPAD prose lines starting with `'`
 *   variableName  → identifier on the LHS of '='
 *   operator      → '=' '+' '-' '*' '/' '^' 'to' 'in'
 *   number        → numeric literal (decimal + scientific)
 *   unit          → units like mm, kN, MPa, deg, rad (after a number)
 *   punctuation   → '(' ')' '[' ']' '{' '}' ',' ';'
 */

const KEYWORDS = new Set([
  "if",
  "else",
  "end",
  "hide",
  "show",
  "pre",
  "post",
  "repeat",
  "rad",
  "deg",
  "gra",
]);

const UNIT_KEYWORDS = new Set([
  // length
  "mm", "cm", "dm", "m", "km",
  // mass
  "g", "kg", "ton",
  // force
  "N", "kN", "MN",
  // pressure / stress
  "Pa", "kPa", "MPa", "GPa",
  // moment
  "Nm",
  // angles
  "deg", "rad",
  // time
  "s", "min", "h", "ms",
  // misc
  "mol", "K",
]);

const parser: StreamParser<{ inPlot: boolean }> = {
  startState: () => ({ inPlot: false }),

  token(stream, state) {
    // EOL
    if (stream.eol()) return null;

    // CalcPAD title line `"Title …` — only at column 0
    if (stream.sol() && stream.peek() === '"') {
      stream.skipToEnd();
      return "heading";
    }

    // Markdown heading `# … ######`
    if (stream.sol() && stream.match(/^#{1,6}\s+/)) {
      stream.skipToEnd();
      return "heading";
    }

    // CalcPAD directive `#if`, `#hide`, `#repeat`, …
    if (stream.sol() && stream.match(/^#[a-zA-Z]+/)) {
      const matched = stream.current().slice(1); // remove leading '#'
      if (KEYWORDS.has(matched)) {
        // Eat optional rest of line for `#if`, `#else if`, `#repeat`
        return "keyword";
      }
      return "keyword";
    }

    // CalcPAD prose line `'…` at column 0 — runs to EOL
    if (stream.sol() && stream.peek() === "'") {
      stream.skipToEnd();
      return "string";
    }

    // Line comment `//…`
    if (stream.match("//")) {
      stream.skipToEnd();
      return "lineComment";
    }

    // Inline prose toggle `'…` mid-line — until next `'` or EOL
    if (stream.peek() === "'") {
      stream.next(); // consume opening quote
      while (!stream.eol() && stream.peek() !== "'") stream.next();
      if (stream.peek() === "'") stream.next(); // consume closing quote
      return "string";
    }

    // Inline double-quoted string `"…"` — used in #def constants
    // (`#def style1$ = style="…"`), HTML/SVG attributes, and string-typed
    // params. Highlight everything between the quotes as a string.
    if (stream.peek() === '"') {
      stream.next();
      while (!stream.eol() && stream.peek() !== '"') {
        if (stream.peek() === "\\") stream.next();
        stream.next();
      }
      if (stream.peek() === '"') stream.next();
      return "string";
    }

    // Block markers
    if (stream.match(/^@(svg|end|select|gef|img)\b/)) {
      // For @img() also consume the rest
      if (stream.current() === "@img") {
        stream.eatWhile(/[^\n]/);
      }
      return "meta";
    }

    // Plot directive `$Plot{ … }` or `$Map{ … }` / `$Sum{ … }`
    if (stream.match(/^\$(Plot|Map|Sum|Prod|Integral|Solve|Find)\b/)) {
      state.inPlot = true;
      return "meta";
    }
    if (state.inPlot && stream.eat("}")) {
      state.inPlot = false;
      return "meta";
    }

    // Numbers
    if (stream.match(/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/)) {
      return "number";
    }

    // Whitespace
    if (stream.eatSpace()) return null;

    // Identifiers — Unicode letters/digits/underscore (θ, α, π, …)
    if (stream.match(/^[\p{L}_][\p{L}\p{N}_]*/u)) {
      const word = stream.current();
      // Operator keywords `to` / `in` for unit conversion
      if (word === "to" || word === "in") return "operatorKeyword";
      // Constants
      if (word === "pi" || word === "e") return "atom";
      // Known unit identifier preceded by space + number? Just tint as unit class.
      if (UNIT_KEYWORDS.has(word)) return "unit";
      // Function call?  `foo(…`
      if (stream.peek() === "(") return "function";
      // Generic identifier
      return "variable";
    }

    // Operators
    if (stream.match(/^(=|<=|>=|<|>|==|!=|\+|-|\*|\/|\^)/)) return "operator";
    // Punctuation
    if (stream.match(/^[(){}\[\],;]/)) return "punctuation";

    // Fallback — advance one char
    stream.next();
    return null;
  },

  languageData: {
    commentTokens: { line: "//" },
  },
};

const ifcCalcStream = StreamLanguage.define(parser);

/**
 * Color palette anchored on the OpenAEC brand tokens.
 * Keep contrast WCAG-AA against the light editor background (#FAFAF9).
 */
const ifcCalcHighlight = HighlightStyle.define([
  { tag: t.heading, color: "#D97706", fontWeight: "700" },
  { tag: t.keyword, color: "#7C3AED", fontWeight: "600" }, // amethyst — directives stand out
  { tag: t.controlKeyword, color: "#7C3AED", fontWeight: "600" },
  { tag: t.operatorKeyword, color: "#7C3AED", fontStyle: "italic" }, // `to` / `in`
  { tag: t.meta, color: "#0891B2" }, // teal — @svg @select @gef $Plot
  { tag: t.string, color: "#16A34A", fontStyle: "italic" }, // green prose
  { tag: t.lineComment, color: "#94A3B8", fontStyle: "italic" }, // muted grey
  { tag: t.number, color: "#DC2626" }, // construction red (matches q-load arrows)
  { tag: t.atom, color: "#DC2626" }, // pi, e
  { tag: t.unit, color: "#92400E", fontStyle: "italic" }, // amber-dark
  { tag: t.variableName, color: "#1E40AF" }, // blueprint blue
  { tag: t.function(t.variableName), color: "#1E40AF", fontWeight: "600" },
  { tag: t.operator, color: "#525252" },
  { tag: t.punctuation, color: "#525252" },
]);

// ── Autocomplete (IntelliSense) ────────────────────────────────────────

/** Static keyword/snippet completions — directives, functions, units. */
const STATIC_COMPLETIONS: Completion[] = [
  // Directives
  { label: "#if", type: "keyword", detail: "conditional", apply: "#if " },
  { label: "#else", type: "keyword", detail: "conditional" },
  { label: "#else if", type: "keyword", detail: "conditional", apply: "#else if " },
  { label: "#end if", type: "keyword", detail: "conditional" },
  { label: "#hide", type: "keyword", detail: "visibility" },
  { label: "#show", type: "keyword", detail: "visibility" },
  { label: "#pre", type: "keyword", detail: "calcpad marker" },
  { label: "#post", type: "keyword", detail: "calcpad marker" },
  { label: "#repeat", type: "keyword", detail: "loop", apply: "#repeat " },
  { label: "#end repeat", type: "keyword", detail: "loop" },
  { label: "#rad", type: "keyword", detail: "angle mode" },
  { label: "#deg", type: "keyword", detail: "angle mode" },

  // Blocks
  { label: "@svg", type: "namespace", detail: "drawing block", apply: "@svg\n\n@end" },
  { label: "@select", type: "namespace", detail: "dropdown block", apply: '@select var "label"\n  optie = 1\n@end' },
  { label: "@gef", type: "namespace", detail: "sondering upload", apply: "@gef sondering1" },
  { label: "@img", type: "namespace", detail: "image", apply: "@img(pad/naar.png)" },
  { label: "@end", type: "namespace", detail: "block end" },

  // Plot operators
  { label: "$Plot", type: "namespace", detail: "line plot", apply: "$Plot{f(x) @ x = -10 : 10}" },
  { label: "$Map", type: "namespace", detail: "2D contour" },
  { label: "$Sum", type: "namespace", detail: "summation", apply: "$Sum{f(n) @ n = 1 : N}" },
  { label: "$Prod", type: "namespace", detail: "product" },
  { label: "$Integral", type: "namespace", detail: "integral" },

  // Math functions (mathjs)
  ...[
    ["sin", "trig"], ["cos", "trig"], ["tan", "trig"],
    ["asin", "trig"], ["acos", "trig"], ["atan", "trig"], ["atan2", "trig"],
    ["sqrt", "math"], ["sqr", "math (=sqrt)"], ["abs", "math"],
    ["log", "math (natural)"], ["log10", "math"], ["lg", "math (=log10)"],
    ["exp", "math"], ["pow", "math"],
    ["floor", "math"], ["ceil", "math"], ["round", "math"],
    ["min", "math"], ["max", "math"], ["sign", "math"],
    ["if", "calcpad ternary"],
    ["det", "matrix"], ["inv", "matrix"], ["transpose", "matrix"],
  ].map(([label, detail]) => ({ label, type: "function" as const, detail, apply: `${label}(` })),

  // Constants
  { label: "pi", type: "constant", detail: "π = 3.14159…" },
  { label: "e", type: "constant", detail: "Euler ≈ 2.71828" },

  // Unit-conversion operators
  { label: "to", type: "keyword", detail: "convert unit", apply: "to " },
  { label: "in", type: "keyword", detail: "convert unit", apply: "in " },

  // Common units
  ...["mm", "cm", "m", "km", "g", "kg", "ton", "N", "kN", "MN",
      "Pa", "kPa", "MPa", "GPa", "Nm", "kNm", "deg", "rad", "s"].map((u) => ({
    label: u, type: "type" as const, detail: "unit",
  })),
];

/**
 * Build completions by scanning the document for user-defined variables and
 * functions. Picks up assignments (`x = ...`), prompts (`F = ?kN`), and
 * function definitions (`f(x) = ...`).
 */
function dynamicCompletions(source: string): Completion[] {
  const out: Completion[] = [];
  const seen = new Set<string>();
  const lines = source.split("\n");

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("'") || line.startsWith("//") || line.startsWith("#") || line.startsWith("@") || line.startsWith("$") || line.startsWith('"')) continue;

    // Function def: f(x) = ... or g(a,b) = ...
    const fnMatch = line.match(/^([\p{L}_][\p{L}\p{N}_]*)\s*\(([^)]+)\)\s*=/u);
    if (fnMatch && !seen.has(fnMatch[1])) {
      seen.add(fnMatch[1]);
      out.push({
        label: fnMatch[1],
        type: "function",
        detail: `(${fnMatch[2].split(",").map((s) => s.trim()).join(", ")})`,
        apply: `${fnMatch[1]}(`,
      });
      continue;
    }

    // Assignment / prompt: name = ... or name = ?
    const assignMatch = line.match(/^([\p{L}_][\p{L}\p{N}_]*)\s*=/u);
    if (assignMatch && !seen.has(assignMatch[1])) {
      seen.add(assignMatch[1]);
      const isPrompt = line.includes("= ?");
      out.push({
        label: assignMatch[1],
        type: "variable",
        detail: isPrompt ? "input prompt" : "variable",
      });
    }
  }
  return out;
}

function calcpadCompletionSource(ctx: CompletionContext): CompletionResult | null {
  // Allow identifier characters + leading #, @, $ for directive triggers
  const before = ctx.matchBefore(/[#@$]?[\p{L}_][\p{L}\p{N}_]*$/u) ??
                 ctx.matchBefore(/[#@$]$/);
  if (!before && !ctx.explicit) return null;
  const word = before;
  if (!word) return null;

  const source = ctx.state.doc.toString();
  const dynamic = dynamicCompletions(source);

  return {
    from: word.from,
    options: [...STATIC_COMPLETIONS, ...dynamic],
    validFor: /^[#@$]?[\p{L}\p{N}_]*$/u,
  };
}

/** Composite extension consumed by `<CodeMirror extensions={[ifcCalcLang()]}/>`. */
export function ifcCalcLang(): Extension {
  return [
    ifcCalcStream,
    syntaxHighlighting(ifcCalcHighlight),
    autocompletion({
      override: [calcpadCompletionSource],
      activateOnTyping: true,
      defaultKeymap: true,
    }),
  ];
}
