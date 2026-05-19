import { StreamLanguage, type StreamParser } from "@codemirror/language";
import {
  HighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
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

/** Composite extension consumed by `<CodeMirror extensions={[ifcCalcLang()]}/>`. */
export function ifcCalcLang(): Extension {
  return [ifcCalcStream, syntaxHighlighting(ifcCalcHighlight)];
}
