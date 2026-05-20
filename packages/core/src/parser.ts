import type { AstNode, ConditionalNode, PlotNode, TextNode } from './types.js';

/**
 * Line-based parser with CalcPAD-compatible syntax.
 *
 * Supports the subset documented at https://calcpad.eu plus our own additions:
 *
 *   Title / heading:    `"Title text`           → H1
 *                       `# h1 … ###### h6`      → markdown headings (own extension)
 *
 *   Prose:              `'free text`            → HTML-passthrough paragraph
 *
 *   Comments:           `// js-style comment`   → skipped
 *
 *   Assignments:        `b = 300 mm`            → variable binds to scope
 *                       `f(x) = x^2 + 1`        → user-defined function (mathjs lambda)
 *
 *   Input prompts:      `F = ? kN`              → interactive numeric input
 *
 *   Bare display:       `UC`                    → show "UC = <current value>"
 *
 *   Directives:         `#hide` … `#show`       → execute but skip render
 *                       `#pre`                  → standalone marker (no-op for us)
 *                       `#post`                 → standalone marker (no-op for us)
 *                       `#rad` / `#deg`         → angle mode hints (no-op; mathjs handles)
 *
 *   Conditionals:       `#if cond` / `#else if` / `#else` / `#end if`
 *                       HTML-wrapped conditions `#if '<!--cond-->'` are unwrapped.
 *
 *   Loops:              `#repeat n` … `#end repeat`  (iteration index = _i)
 *
 *   Plots:              `$Plot{c1 & c2 @ x = lo : hi}`
 *                       Each curve: `yExpr` or `xExpr|yExpr`. Samples 100 points.
 *
 *   Blocks (ours):      `@svg …@end`, `@select … @end`, `@gef name`, `@img(src)`
 *
 *   Statement separator: `,'` (single comma + single-quote) splits one line into
 *                        multiple statements. Used heavily in CalcPAD files like
 *                        `a = ?', 'b = ?', 'c = ?`.
 *
 *   Trailing data:      Lines of pure numbers separated by tabs/spaces at the EOF
 *                       are CalcPAD's persisted prompt-input values. Skipped here;
 *                       a future enhancement could feed them into SelectValues.
 */

// ── Recognizers ────────────────────────────────────────────────────────
// Identifier = unicode letter/underscore + letters/digits/underscores. Matches
// CalcPAD's use of Greek and other non-ASCII letters (θ, α, β, …).
const IDENT = '[\\p{L}_][\\p{L}\\p{N}_]*';
const ASSIGNMENT_RE = new RegExp(`^(${IDENT})\\s*=\\s*(.+)$`, 'u');
const INPUT_PROMPT_RE = new RegExp(`^(${IDENT})\\s*=\\s*\\?\\s*(.*)$`, 'u');
const USER_FUNC_RE = new RegExp(
  `^(${IDENT})\\s*\\(\\s*(${IDENT}(?:\\s*,\\s*${IDENT})*)\\s*\\)\\s*=\\s*(.+)$`,
  'u',
);
const VAR_DISPLAY_RE = new RegExp(`^(${IDENT})\\s*$`, 'u');

const TITLE_RE = /^"(.*)$/;           // CalcPAD title: "Quadratic Equation
const PROSE_RE = /^'(.*)$/;           // CalcPAD prose: 'free text with <i>HTML</i>
const COMMENT_SLASH_RE = /^\/\//;

const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const SVG_START_RE = /^@svg\s*$/;
const BLOCK_END_RE = /^@end\s*$/;
const IMG_RE = /^@img\((.+)\)\s*$/;
const SELECT_START_RE = /^@select\s+([a-zA-Z_]\w*)\s+"([^"]+)"\s*$/;
const SELECT_OPTION_RE = /^(.+?)\s*=\s*(.+)$/;
const GEF_RE = /^@gef\s+([a-zA-Z_]\w*)\s*$/;
// Directive recognizers. All allow trailing characters after the keyword because
// CalcPAD frequently packs persisted-input values onto the same line as the
// closing directive (e.g. `#end if 2\t3\t-5`).
const IF_RE = /^#if\s+(.+)$/;
const ELSE_IF_RE = /^#else\s*if\s+(.+)$/;
const ELSE_RE = /^#else\b/;
const ENDIF_RE = /^#end\s+if\b/;
const HIDE_RE = /^#hide\b/;
const SHOW_RE = /^#show\b/;
const PRE_RE = /^#pre\b/;
const POST_RE = /^#post\b/;
const ANGLE_MODE_RE = /^#(rad|deg|gra|equ)\b/;
// CalcPAD `#def Name$ = "string"` constant definitions, `#include filename`,
// `#novar` (hide variable substitution), `#varsub` (variable substitution
// control). Silently ignored — they don't change calculation values.
const NO_OP_DIRECTIVE_RE = /^#(def|include|novar|varsub)\b/;
const REPEAT_RE = /^#repeat\s+(.+)$/;
const ENDREPEAT_RE = /^#end\s+repeat\b/;
// CalcPAD `#for var = lo : hi … #loop` (#break supported as early exit)
const FOR_RE = /^#for\s+([\p{L}_][\p{L}\p{N}_]*)\s*=\s*(.+?)\s*:\s*(.+)$/u;
const LOOP_RE = /^#loop\b/;
const BREAK_RE = /^#break\b/;
// Match `$Plot{...}` even when CalcPAD has appended trailing persisted-input
// data after the closing brace (e.g. `}\v2\t3`).
const PLOT_RE = /^\$Plot\s*\{([^}]+)\}/;
const TRAILING_DATA_RE = /^[\s\d.eE+\-,;]+$/;  // pure numeric/whitespace line

// HTML wrappers CalcPAD uses around conditions / equation fragments.
const HTML_COMMENT_WRAPPER_RE = /^\s*'?<!--\s*'?(.+?)'?\s*-->\s*'?\s*$/;

// ── State ──────────────────────────────────────────────────────────────
interface ParserState {
  hidden: boolean;
}

/**
 * Pre-process the entire source to fold CalcPAD's comma-subscript identifiers
 * (e.g. `V_b,0`, `n_Int,support,points`, `A_WindPressure,Suction`) into
 * underscore-only equivalents that math.js can parse as valid identifiers.
 *
 * Heuristic — a comma is part of a subscript when it follows an identifier
 * that already contains at least one `_`:
 *   `n_Int,support,points`  →  `n_Int_support_points`
 *   `V_b,0`                  →  `V_b_0`
 *   `min(x_1; x_2)`          →  unchanged (`;` not `,`)
 *   `f(x, y)`                →  unchanged (no `_` before the comma)
 *   `min(x_1, x_2)`          →  unchanged (after `;` → `,` normalization runs
 *                              later; `_1` lacks the comma cluster `,word`)
 *
 * Applied once at the top of parse() so all regexes downstream see clean
 * identifiers.
 */
function foldSubscriptCommas(source: string): string {
  return source.replace(
    /(?<![\p{L}\p{N}_])([\p{L}_][\p{L}\p{N}_]*_[\p{L}\p{N}_]+(?:,[\p{L}\p{N}_]+)+)(?![\p{L}\p{N}_])/gu,
    (match) => match.replace(/,/g, '_'),
  );
}

/**
 * CalcPAD identifies string variables with a trailing `$` (e.g. `ii$`,
 * `Client$`, `getFdn$(ii$)`). math.js doesn't allow `$` in identifiers, so
 * these references blow up entire conditional cascades. We simply strip the
 * trailing `$` everywhere a word character precedes it — the values still
 * bind to scope under the bare name, and the `$Plot{ … }` / `$Sum{ … }`
 * directives (which start with `$`) are unaffected because they have no
 * preceding word char.
 */
function stripDollarSuffix(source: string): string {
  return source.replace(/([\p{L}\p{N}_])\$/gu, '$1');
}

/**
 * Expand CalcPAD multi-line `#def name(p1; p2; ...) ... #end def` macros via
 * textual substitution. Single-line `#def name = "value"` and
 * `#def name(args) = expression` are skipped (handled later).
 *
 * The macro body lines have parameter references like `x1`, `dist*3/10`, or
 * nested macro calls `line(...)`. We substitute params with the actual call
 * arguments and re-emit the body lines in place of the call site. Recursive
 * expansion runs up to MAX_PASSES times to resolve macro→macro→macro chains.
 */
function expandMacros(source: string): string {
  interface Macro { params: string[]; body: string[]; oneLine: string | null }
  const macros = new Map<string, Macro>();
  // Constant `#def Name$ = literal` macros — expanded as bare-identifier
  // textual substitution (no call syntax).
  const constants = new Map<string, string>();

  // Pass 1 — collect definitions and remove their lines from the source.
  const raw = source.split('\n');
  const stripped: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const line = raw[i];
    const trimmed = line.trim();
    // Multi-line: `#def name(p1; p2; ...)` or `#def name$(p1$; p2$; ...)`
    // (no `=` sign on the def line). `$` is a CalcPAD string-type suffix.
    const blockDef = trimmed.match(/^#def\s+([\p{L}_][\p{L}\p{N}_]*)\$?\s*\(\s*([^)]*)\s*\)\s*$/u);
    if (blockDef) {
      const name = blockDef[1];
      const params = blockDef[2]
        .split(/[,;]/)
        .map((p) => p.trim().replace(/\$$/, ''))  // strip trailing $ from param names
        .filter(Boolean);
      const body: string[] = [];
      i++;
      while (i < raw.length && !/^\s*#end\s+def\b/.test(raw[i])) {
        body.push(raw[i]);
        i++;
      }
      macros.set(name, { params, body, oneLine: null });
      continue;
    }
    // Inline: `#def name(p1; p2) = template-text` (string suffix optional)
    const inlineDef = trimmed.match(/^#def\s+([\p{L}_][\p{L}\p{N}_]*)\$?\s*\(\s*([^)]*)\s*\)\s*=\s*(.+)$/u);
    if (inlineDef) {
      const name = inlineDef[1];
      const params = inlineDef[2]
        .split(/[,;]/)
        .map((p) => p.trim().replace(/\$$/, ''))
        .filter(Boolean);
      macros.set(name, { params, body: [], oneLine: inlineDef[3] });
      continue;
    }
    // Inline constant: `#def Name$ = literal` (no parens). Collect for
    // bare-identifier textual replacement in pass 3.
    const constDef = trimmed.match(/^#def\s+([\p{L}_][\p{L}\p{N}_]*)\$?\s*=\s*(.+)$/u);
    if (constDef) {
      constants.set(constDef[1], constDef[2]);
      continue;
    }
    stripped.push(line);
  }

  if (macros.size === 0 && constants.size === 0) return source;

  // Pass 2 — left-to-right linear scan, expanding macro calls one at a time.
  // `\$?` between the name and `(` matches CalcPAD's string-typed call syntax
  // `getFdn$(arg)`, `line$(...)`.
  let text = stripped.join('\n');

  // Constant substitution helper — bare-identifier replacement, optional
  // trailing `$`. Loop a few times so constants referencing other constants
  // resolve.
  const constPattern = constants.size > 0
    ? `(?<![\\p{L}\\p{N}_])(${[...constants.keys()].map(escapeRegExp).join('|')})\\$?(?![\\p{L}\\p{N}_(])`
    : null;
  const expandConstants = (s: string): string => {
    if (!constPattern) return s;
    let out = s;
    for (let pass = 0; pass < 4; pass++) {
      let changed = false;
      out = out.replace(new RegExp(constPattern, 'gu'), (_m, name: string) => {
        changed = true;
        return constants.get(name) ?? '';
      });
      if (!changed) break;
    }
    return out;
  };

  // Pass 1.5 — substitute constants (so constants referenced in macro CALLS
  // get expanded before macro arg-substitution sees them).
  text = expandConstants(text);

  if (macros.size === 0) return text;

  const namePattern = `(?<![\\p{L}\\p{N}_])(${[...macros.keys()].map(escapeRegExp).join('|')})\\$?\\s*\\(`;
  const MAX_PASSES = 8;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let changed = false;
    let cursor = 0;
    const out: string[] = [];
    const callRe = new RegExp(namePattern, 'gu');
    let match;
    while ((match = callRe.exec(text)) !== null) {
      const name = match[1];
      const openParen = match.index + match[0].length - 1;
      const closeParen = findMatchingParen(text, openParen);
      if (closeParen === -1) { callRe.lastIndex = openParen + 1; continue; }
      const args = splitArgs(text.slice(openParen + 1, closeParen));
      const macro = macros.get(name)!;
      const expanded = applyMacro(macro, args);
      out.push(text.slice(cursor, match.index));
      out.push(expanded);
      cursor = closeParen + 1;
      callRe.lastIndex = cursor;
      changed = true;
    }
    out.push(text.slice(cursor));
    text = out.join('');
    if (!changed) break;
  }
  // Pass 3 — re-substitute constants that surfaced via macro arg-substitution
  // (e.g. `rect$(...; style1$)` injects `style1$` into the macro body, which
  // must now resolve to `style="stroke:..."`).
  text = expandConstants(text);
  return text;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMatchingParen(s: string, openIdx: number): number {
  let depth = 0;
  let inString = false;
  for (let i = openIdx; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function splitArgs(raw: string): string[] {
  // CalcPAD uses `;` to separate function/macro arguments. Comma is reserved
  // for subscripts (`b_fdn,1`) which foldSubscriptCommas rewrites later.
  // Splitting on `,` here would scramble argument order whenever a subscript
  // value is passed in (e.g. `drawFDN$(...; b_fdn,1; b_fdn,2; ...)`).
  const out: string[] = [];
  let depth = 0, inString = false, start = 0;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === ';' && depth === 0) {
      out.push(raw.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(raw.slice(start).trim());
  return out.filter((s, idx) => idx < out.length - 1 || s !== '');
}

function applyMacro(macro: { params: string[]; body: string[]; oneLine: string | null }, args: string[]): string {
  // CalcPAD typed-param refs carry `$` (`x$`, `n_Length$`). Bare refs
  // (`n_Length` without `$`) also occur in arithmetic context, but bare refs
  // for single-letter params (`x`, `y`, `b`, `h`, `l`, `w`) collide with SVG
  // attribute names inside prose-template lines (`<rect x="…">`). Strategy:
  //   • Always substitute `paramname$`.
  //   • In *code* lines (no leading `'`), also substitute bare `paramname`.
  //   • In *prose* lines, ONLY substitute `$`-suffixed refs.
  const substLine = (s: string, isProse: boolean): string => {
    let result = s;
    for (let i = 0; i < macro.params.length; i++) {
      const p = macro.params[i];
      const a = args[i] ?? '';
      // 1) `$`-suffixed (always applies)
      result = result.replace(
        new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(p)}\\$(?![\\p{L}\\p{N}_])`, 'gu'),
        a,
      );
      // 2) bare reference (skip in prose to protect SVG attribute names)
      if (!isProse) {
        result = result.replace(
          new RegExp(`(?<![\\p{L}\\p{N}_.])${escapeRegExp(p)}(?![\\p{L}\\p{N}_])`, 'gu'),
          a,
        );
      }
    }
    return result;
  };
  if (macro.oneLine !== null) {
    return substLine(macro.oneLine, macro.oneLine.trimStart().startsWith("'"));
  }
  return macro.body
    .map((line) => substLine(line, line.trimStart().startsWith("'")))
    .join('\n');
}

/**
 * CalcPAD allows `.` and `%` inside identifier names (e.g. `Cs.Cd`,
 * `F_0.9G50%TotalWeight`). mathjs treats `.` as member access and `%` as
 * modulo, so these names blow up. Fold them to `_` when the surrounding
 * tokens form an identifier-like cluster: a leading letter/underscore,
 * followed by one or more `.`/`%`-separated word groups.
 *
 *   `Cs.Cd`                  →  `Cs_Cd`
 *   `F_0.9G50%TotalWeight`   →  `F_0_9G50_TotalWeight`
 *   `0.5`                    →  unchanged (leading digit excluded)
 *   `q * 0.9`                →  unchanged
 */
function foldIdentifierDots(source: string): string {
  // Skip content inside double-quoted strings on a PER-LINE basis. Unbalanced
  // quotes on one line (e.g. `"Title` heading) shouldn't poison the rest of
  // the file. URLs like "http://www.w3.org/..." and dotted text inside SVG
  // attribute values must survive unchanged.
  const transformOutsideQuotes = (text: string): string => {
    let out = text;
    // CalcPAD vector index `name.digit` → `name[digit]`. Must precede the
    // identifier-cluster fold so `cc.3` isn't mistakenly read as `cc_3`.
    out = out.replace(
      /(?<![\p{L}\p{N}_.])([\p{L}_][\p{L}\p{N}_]*)\.(\d+)(?![\p{L}\p{N}_.])/gu,
      (_m, name, idx) => `${name}[${idx}]`,
    );
    // Identifier-cluster fold: `Cs.Cd`, `F_0.9G50%TotalWeight` → underscores.
    out = out.replace(
      /(?<![\p{L}\p{N}_])([\p{L}_][\p{L}\p{N}_]*(?:[.%][\p{L}\p{N}_]+)+)(?![\p{L}\p{N}_])/gu,
      (match) => match.replace(/[.%]/g, '_'),
    );
    return out;
  };

  return source
    .split('\n')
    .map((line) => {
      if (line.indexOf('"') === -1) return transformOutsideQuotes(line);
      const segs = line.split('"');
      return segs.map((seg, i) => (i % 2 === 1 ? seg : transformOutsideQuotes(seg))).join('"');
    })
    .join('\n');
}

/**
 * CalcPAD lets every expression carry a trailing display-format hint
 * (`:F2` = fixed-point 2 decimals, `:N0`, `:G`, `:E3`, `:P`). It's a
 * display directive, not part of the math — strip everywhere.
 *
 *   `Z_0:F2`         →  `Z_0`           (bare display)
 *   `Cs.Cd = 1:F2`   →  `Cs.Cd = 1`     (assignment value)
 *   `ψ_0,wind = 0.0:F2`  →  `ψ_0,wind = 0.0`
 */
function stripFormatSpecs(source: string): string {
  // Match `:F2`, `:N0`, `:G`, `:E3`, `:P0` where preceded by digit/letter/`)`
  // and followed by end-of-token (whitespace, EOL, or expression operator).
  return source.replace(/(?<=[\p{L}\p{N}_)])\s*:\s*[FNGEPfngep]\d*(?=\s|$|[,;)+\-*/'])/gu, '');
}

/**
 * Rewrite CalcPAD multi-column matrix literals `[a;b;c|d;e;f]` into mathjs
 * nested-array form `[[a,d],[b,e],[c,f]]`. CalcPAD uses `|` as the column
 * separator and `;` between rows within a column. mathjs has no `|` operator
 * for matrices and needs explicit row-of-row form.
 *
 * Pattern matches a `[…]` block that contains at least one `|`. Inside, each
 * `|`-delimited column is split on `;` into row values. The result is a
 * mathjs nested array transposed so the rows iterate properly.
 */
function rewriteMatrixLiterals(source: string): string {
  return source.replace(/\[([^\[\]]*\|[^\[\]]+)\]/g, (full, inner: string) => {
    const columns = inner.split('|').map((col) =>
      col.split(';').map((s) => s.trim()).filter(Boolean),
    );
    if (columns.length < 2) return full;
    const rowCount = Math.max(...columns.map((c) => c.length));
    const rows: string[] = [];
    for (let r = 0; r < rowCount; r++) {
      const cells = columns.map((c) => c[r] ?? '0');
      rows.push(`[${cells.join(', ')}]`);
    }
    return `[${rows.join(', ')}]`;
  });
}

/**
 * Inline `#include filename` directives by looking up each filename in the
 * resolver map. Missing files become a comment line. Runs once before macro
 * expansion so included macros (`#def …`) participate in expansion.
 */
function inlineIncludes(source: string, includes: ReadonlyMap<string, string>): string {
  return source.replace(/^[ \t]*#include\s+(\S+)\s*$/gmu, (match, name: string) => {
    const key = name.trim().replace(/^["']|["']$/g, '');
    const content = includes.get(key);
    if (content === undefined) return `// (include not found: ${key})`;
    return content;
  });
}

/**
 * Inline `@img(file.svg)` directives whose target is an SVG file in the
 * include resolver — replace the line with an `@svg … @end` block so the
 * actual SVG markup is rendered inline (not as `<img src="file.svg">`).
 * Non-SVG targets (`.png`, `.jpg`, URLs) are left as `@img` directives and
 * resolved by the host at render time.
 *
 * The host registers SVG image files alongside library .cpd files in the
 * same `ParseOptions.includes` map.
 */
function inlineSvgImages(source: string, includes: ReadonlyMap<string, string>): string {
  return source.replace(/^[ \t]*@img\(([^)]+)\)\s*$/gmu, (match, name: string) => {
    const key = name.trim().replace(/^["']|["']$/g, '');
    if (!/\.svg$/i.test(key)) return match;
    const content = includes.get(key);
    if (content === undefined) return match;
    // Strip XML prolog + DOCTYPE — they don't belong inline inside HTML
    const cleaned = content
      .replace(/<\?xml\b[^?]*\?>/g, '')
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .trim();
    return `@svg\n${cleaned}\n@end`;
  });
}

export interface ParseOptions {
  /** Map of filename → contents for `#include filename` resolution. */
  includes?: ReadonlyMap<string, string>;
}

// ── Entry point ────────────────────────────────────────────────────────
export function parse(source: string, options: ParseOptions = {}): AstNode[] {
  if (options.includes && options.includes.size > 0) {
    source = inlineIncludes(source, options.includes);
    source = inlineSvgImages(source, options.includes);
  }
  // Macro expansion runs BEFORE \$-stripping so we still see param names like
  // `x1\$` and substitute them across the body. After expansion we strip \$
  // from any remaining identifiers.
  source = expandMacros(source);
  source = rewriteMatrixLiterals(
    stripDollarSuffix(
      foldIdentifierDots(stripFormatSpecs(foldSubscriptCommas(source))),
    ),
  );
  // CalcPAD's `'` character toggles between CODE and PROSE on a single line.
  // Lines start in CODE mode. Each `'` flips mode. So:
  //   a = ?', 'b = ?     →  CODE `a = ?` + PROSE `, ` + CODE `b = ?`
  //   f(x) = c'= 0       →  CODE `f(x) = c` + PROSE `= 0`
  //   '<hr />            →  PROSE `<hr />`  (whole line)
  //   "Title             →  CODE (title) — NO toggle on `"` lines
  //
  // We pre-flatten each raw line into N logical lines so the rest of the parser
  // can stay single-statement-per-line.
  const rawLines = source.split('\n');
  const lines: string[] = [];
  for (const raw of rawLines) {
    const trimmed = raw.trim();
    // Directive / title / block / plot lines: do NOT toggle-split — single-line
    // statements that contain inline apostrophes (e.g. `#if '<!--cond-->'`).
    if (
      trimmed.startsWith('"') ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('@') ||
      trimmed.startsWith('$')
    ) {
      lines.push(raw);
      continue;
    }
    if (raw.indexOf("'") === -1) {
      lines.push(raw);
      continue;
    }
    // Prose lines (leading `'`) split toggle-style into alternating prose/code
    // segments. If NO code segment looks like an assignment (`name = value`),
    // treat the whole line as one prose template with inline value interp
    // (SVG macros: `'<line x1="'a'" y1="'b'"/>`). If any segment is a real
    // assignment (e.g. `'→'b_fdn = 0.58m`), fall back to per-segment split.
    if (trimmed.startsWith("'")) {
      const segs = raw.split("'");
      // Code segments are at even indices ≥ 2. Treat as assignment if it
      // matches IDENT '=' VALUE (single `=`, not `==` / `!=` / `<=` / `>=`).
      const assignLikeRe = /^\s*[\p{L}_][\p{L}\p{N}_,]*\s*=(?!=)/u;
      let hasAssignment = false;
      for (let k = 2; k < segs.length; k += 2) {
        if (assignLikeRe.test(segs[k])) { hasAssignment = true; break; }
      }
      if (!hasAssignment) {
        lines.push(raw);
        continue;
      }
    }
    // Toggle split — alternating code / prose fragments (`a = ?', 'b = ?`)
    const parts = raw.split("'");
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isCode = i % 2 === 0;
      if (part.trim() === '') continue;
      lines.push(isCode ? part : "'" + part);
    }
  }

  const state: ParserState = { hidden: false };
  return parseLines(lines, 0, lines.length, state).nodes;
}

interface ParseResult {
  nodes: AstNode[];
  endIndex: number;
}

function parseLines(
  lines: string[],
  start: number,
  end: number,
  state: ParserState,
  stopOn?: (trimmed: string) => boolean,
): ParseResult {
  const nodes: AstNode[] = [];
  let i = start;

  while (i < end) {
    const line = lines[i];
    const trimmed = line.trim();

    if (stopOn && stopOn(trimmed)) break;

    // Skip empties
    if (trimmed === '') {
      i++;
      continue;
    }

    // JS-style comment line — fully ignored
    if (COMMENT_SLASH_RE.test(trimmed)) {
      i++;
      continue;
    }

    // CalcPAD prose line: 'free text + <i>HTML</i>
    // May contain embedded `'expr'` value interpolation (e.g. SVG macros).
    const proseMatch = trimmed.match(PROSE_RE);
    if (proseMatch) {
      const text = proseMatch[1];
      const textTrim = text.trim();
      // Skip empty prose AND CalcPAD's persisted input values that latch
      // onto a trailing `'` (e.g. `'2	1` at EOF).
      if (textTrim !== '' && !TRAILING_DATA_RE.test(textTrim)) {
        if (text.indexOf("'") !== -1) {
          // Interpolation: split on `'`, alternating literal/expression.
          const segments = text.split("'");
          const parts: NonNullable<TextNode['parts']> = [];
          for (let k = 0; k < segments.length; k++) {
            const seg = segments[k];
            if (k % 2 === 0) {
              if (seg !== '') parts.push({ kind: 'literal', value: seg });
            } else {
              const expr = seg.trim();
              if (expr !== '') parts.push({ kind: 'expr', value: expr });
            }
          }
          nodes.push(markHidden({ type: 'text', text: textTrim, html: true, parts }, state));
        } else {
          nodes.push(markHidden({ type: 'text', text: textTrim, html: true }, state));
        }
      }
      i++;
      continue;
    }

    // CalcPAD title line: "Title text → emit as H1
    const titleMatch = trimmed.match(TITLE_RE);
    if (titleMatch) {
      const text = titleMatch[1].trim();
      if (text !== '') {
        nodes.push(markHidden({ type: 'heading', level: 1, text }, state));
      }
      i++;
      continue;
    }

    // Markdown headings
    const headingMatch = trimmed.match(HEADING_RE);
    if (headingMatch) {
      nodes.push(
        markHidden({
          type: 'heading',
          level: headingMatch[1].length,
          text: headingMatch[2],
        }, state),
      );
      i++;
      continue;
    }

    // Visibility directives
    if (HIDE_RE.test(trimmed)) { state.hidden = true; i++; continue; }
    if (SHOW_RE.test(trimmed)) { state.hidden = false; i++; continue; }

    // `#pre` / `#post` are CalcPAD visibility markers (no paired end). Real
    // CalcPAD files often use `#hide` followed by `#post` to "begin showing
    // results again" — so `#post` effectively un-hides. `#pre` is left as a
    // no-op (would mark the start of the pre-calc input section).
    if (POST_RE.test(trimmed)) { state.hidden = false; i++; continue; }
    if (PRE_RE.test(trimmed)) { i++; continue; }

    // #rad / #deg / #gra — angle mode hint. We rely on mathjs unit handling.
    // #equ — CalcPAD equation-mode marker, same no-op for us.
    if (ANGLE_MODE_RE.test(trimmed)) { i++; continue; }

    // #def / #include — currently skipped (string-constant definitions and
    // file inclusion are out of scope for this engine).
    if (NO_OP_DIRECTIVE_RE.test(trimmed)) { i++; continue; }

    // #repeat N … #end repeat
    const repeatMatch = trimmed.match(REPEAT_RE);
    if (repeatMatch) {
      const wasHidden = state.hidden;
      const count = repeatMatch[1];
      i++;
      const bodyResult = parseLines(lines, i, end, state, (t) => ENDREPEAT_RE.test(t));
      i = bodyResult.endIndex;
      if (i < end) i++;
      const repeatNode = { type: 'repeat' as const, count, body: bodyResult.nodes };
      nodes.push(wasHidden ? { ...repeatNode, hidden: true } : repeatNode);
      continue;
    }

    // CalcPAD `#for var = lo : hi … #loop` — emit as a repeat node with the
    // loop-var name baked into a synthetic `var = lo + _i - 1` prelude. Evaluator
    // already exposes `_i` (1-based iteration counter) inside repeat bodies, so
    // we only need to bind the user's `var` to the right value.
    const forMatch = trimmed.match(FOR_RE);
    if (forMatch) {
      const wasHidden = state.hidden;
      const varName = forMatch[1];
      const lo = forMatch[2].trim();
      const hi = forMatch[3].trim();
      i++;
      const bodyResult = parseLines(lines, i, end, state, (t) => LOOP_RE.test(t));
      i = bodyResult.endIndex;
      if (i < end) i++;
      // Prepend a synthetic assignment so the loop variable is in scope each iter.
      // Hidden so it doesn't show up in the rendered output (it's an implementation
      // detail of the #for → repeat translation, not user-authored math).
      const prelude: AstNode = {
        type: 'assignment',
        name: varName,
        expression: `(${lo}) + _i - 1`,
        raw: `${varName} = ${lo} + _i - 1`,
        hidden: true,
      };
      const count = `(${hi}) - (${lo}) + 1`;
      const repeatNode = {
        type: 'repeat' as const,
        count,
        body: [prelude, ...bodyResult.nodes],
      };
      nodes.push(wasHidden ? { ...repeatNode, hidden: true } : repeatNode);
      continue;
    }

    // `#break` inside loops — not currently supported; emit as a no-op (the
    // iteration still completes, but the loop won't terminate early).
    if (BREAK_RE.test(trimmed)) { i++; continue; }

    // SVG block
    if (SVG_START_RE.test(trimmed)) {
      const svgLines: string[] = [];
      i++;
      while (i < end && !BLOCK_END_RE.test(lines[i].trim())) {
        svgLines.push(lines[i]);
        i++;
      }
      nodes.push(markHidden({ type: 'svg', content: svgLines.join('\n') }, state));
      if (i < end) i++;
      continue;
    }

    // Select block
    const selectMatch = trimmed.match(SELECT_START_RE);
    if (selectMatch) {
      const name = selectMatch[1];
      const label = selectMatch[2];
      const options: { text: string; value: string }[] = [];
      i++;
      while (i < end && !BLOCK_END_RE.test(lines[i].trim())) {
        const optLine = lines[i].trim();
        if (optLine !== '' && !COMMENT_SLASH_RE.test(optLine)) {
          const optMatch = optLine.match(SELECT_OPTION_RE);
          if (optMatch) {
            options.push({ text: optMatch[1].trim(), value: optMatch[2].trim() });
          }
        }
        i++;
      }
      nodes.push(markHidden({ type: 'select', name, label, options }, state));
      if (i < end) i++;
      continue;
    }

    // @img(...)
    const imgMatch = trimmed.match(IMG_RE);
    if (imgMatch) {
      nodes.push(markHidden({ type: 'image', src: imgMatch[1].trim() }, state));
      i++;
      continue;
    }

    // @gef name
    const gefMatch = trimmed.match(GEF_RE);
    if (gefMatch) {
      nodes.push(markHidden({ type: 'gef-upload', name: gefMatch[1] }, state));
      i++;
      continue;
    }

    // Conditional cascade
    const ifMatch = trimmed.match(IF_RE);
    if (ifMatch) {
      // IF_RE captures everything after `#if `. The condition may itself
      // contain trailing CalcPAD junk (e.g. extra `'` tokens); strip it.
      const cond = stripCondWrapping(ifMatch[1]);
      const result = parseConditional(lines, i, end, state, cond);
      nodes.push(result.node);
      i = result.endIndex;
      continue;
    }

    // $Plot{...}
    const plotMatch = trimmed.match(PLOT_RE);
    if (plotMatch) {
      const plot = parsePlotSpec(plotMatch[1]);
      if (plot) {
        nodes.push(markHidden(plot, state));
      }
      i++;
      continue;
    }

    // Input prompt — check BEFORE generic assignment
    const promptMatch = trimmed.match(INPUT_PROMPT_RE);
    if (promptMatch) {
      // CalcPAD allows `?*(unit)` for prompts that imply multiplication by the
      // unit (e.g. `q = ?*(kN/m)`). Strip the leading `*` plus optional parens.
      let unit = promptMatch[2].trim();
      if (unit.startsWith('*')) unit = unit.slice(1).trim();
      if (unit.startsWith('(') && unit.endsWith(')')) {
        unit = unit.slice(1, -1).trim();
      }
      nodes.push(
        markHidden({
          type: 'input-prompt',
          name: promptMatch[1],
          label: promptMatch[1],
          defaultValue: '0',
          unit,
        }, state),
      );
      i++;
      continue;
    }

    // User function — match BEFORE generic assignment
    const fnMatch = trimmed.match(USER_FUNC_RE);
    if (fnMatch) {
      const params = fnMatch[2].split(',').map((p) => p.trim());
      nodes.push(
        markHidden({
          type: 'user-function',
          name: fnMatch[1],
          params,
          expression: fnMatch[3].trim(),
          raw: trimmed,
        }, state),
      );
      i++;
      continue;
    }

    // Generic assignment
    const assignMatch = trimmed.match(ASSIGNMENT_RE);
    if (assignMatch) {
      nodes.push(
        markHidden({
          type: 'assignment',
          name: assignMatch[1],
          expression: normalizeExpression(assignMatch[2].trim()),
          raw: trimmed,
        }, state),
      );
      i++;
      continue;
    }

    // Bare variable display
    const varDisplayMatch = trimmed.match(VAR_DISPLAY_RE);
    if (varDisplayMatch) {
      nodes.push(markHidden({ type: 'var-display', name: varDisplayMatch[1] }, state));
      i++;
      continue;
    }

    // CalcPAD trailing data (persisted prompt inputs) — skip silently
    if (TRAILING_DATA_RE.test(trimmed)) {
      i++;
      continue;
    }

    // Fallback: plain text (escaped at render)
    nodes.push(markHidden({ type: 'text', text: trimmed }, state));
    i++;
  }

  return { nodes, endIndex: i };
}

function markHidden<T extends AstNode>(node: T, state: ParserState): T {
  if (state.hidden) {
    return { ...node, hidden: true };
  }
  return node;
}

/**
 * Strip CalcPAD's HTML-comment wrapping from a condition string.
 * `'<!--'a ≡ 0'-->`  →  `a ≡ 0`
 * Also normalises CalcPAD-specific operators to math.js-compatible forms.
 */
function stripCondWrapping(cond: string): string {
  const m = cond.match(HTML_COMMENT_WRAPPER_RE);
  let stripped = m ? m[1].trim() : cond.trim();
  // CalcPAD comparison operators → math.js
  stripped = stripped
    .replace(/≡/g, '==')
    .replace(/≠/g, '!=')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=');
  return normalizeExpression(stripped);
}

/**
 * Translate CalcPAD-specific identifiers / Unicode constants / separators to
 * math.js-compatible forms.
 *
 *   sqr(x)         → sqrt(x)
 *   lg(x)          → log10(x)         (CalcPAD common-log)
 *   π              → pi
 *   f(a; b; c)     → f(a, b, c)       (CalcPAD uses `;` as arg separator)
 */
function normalizeExpression(expr: string): string {
  return expr
    .replace(/\bsqr\b/g, 'sqrt')
    .replace(/\blg\b/g, 'log10')
    .replace(/π/g, 'pi')
    .replace(/;/g, ',');
}

/**
 * Parse a $Plot{...} body. Examples:
 *   "x|f(x) & x_1|0 @ x = x_min : x_max"   → 2 curves over x ∈ [x_min, x_max]
 *   "sin(t)|cos(t) @ t = 0 : 2*π"           → single parametric curve
 *   "f(x) @ x = -10 : 10"                   → single y=f(x) curve, implicit x
 */
function parsePlotSpec(spec: string): PlotNode | null {
  const atIdx = spec.lastIndexOf('@');
  if (atIdx === -1) return null;

  const curvesStr = spec.slice(0, atIdx).trim();
  const paramStr = spec.slice(atIdx + 1).trim();

  const eqIdx = paramStr.indexOf('=');
  if (eqIdx === -1) return null;
  const paramName = paramStr.slice(0, eqIdx).trim();
  const range = paramStr.slice(eqIdx + 1).trim();
  const colonIdx = range.indexOf(':');
  if (colonIdx === -1) return null;
  const lo = range.slice(0, colonIdx).trim();
  const hi = range.slice(colonIdx + 1).trim();

  const curves = curvesStr.split('&').map((c) => {
    const c2 = c.trim();
    const pipeIdx = c2.indexOf('|');
    if (pipeIdx === -1) {
      return { yExpr: c2 };
    }
    return {
      xExpr: c2.slice(0, pipeIdx).trim(),
      yExpr: c2.slice(pipeIdx + 1).trim(),
    };
  });

  return {
    type: 'plot',
    curves: curves.map((c) => ({
      xExpr: c.xExpr ? normalizeExpression(c.xExpr) : undefined,
      yExpr: normalizeExpression(c.yExpr),
    })),
    param: paramName,
    lo: normalizeExpression(lo),
    hi: normalizeExpression(hi),
    samples: 120,
  };
}

/**
 * Parse a cascading conditional starting at the `#if` line (already consumed).
 * `firstCondition` is the (already unwrapped) condition expression.
 */
function parseConditional(
  lines: string[],
  start: number,
  end: number,
  state: ParserState,
  firstCondition: string,
): { node: ConditionalNode; endIndex: number } {
  // Snapshot hidden state at the moment the `#if` appears. `#hide` inside any
  // branch body should not retroactively hide the conditional node itself.
  const wasHidden = state.hidden;
  const branches: { condition: string; body: AstNode[] }[] = [];
  let elseBody: AstNode[] = [];
  let currentCondition = firstCondition;
  let i = start + 1;

  while (i < end) {
    const bodyResult = collectConditionalBody(lines, i, end, state);
    branches.push({ condition: currentCondition, body: bodyResult.nodes });
    i = bodyResult.endIndex;

    if (i >= end) break;
    const trimmed = lines[i].trim();

    const elseIfMatch = trimmed.match(ELSE_IF_RE);
    if (elseIfMatch) {
      currentCondition = stripCondWrapping(elseIfMatch[1]);
      i++;
      continue;
    }

    if (ELSE_RE.test(trimmed)) {
      i++;
      const elseResult = collectConditionalBody(lines, i, end, state);
      elseBody = elseResult.nodes;
      i = elseResult.endIndex;
    }

    if (i < end && ENDIF_RE.test(lines[i].trim())) {
      i++;
    }
    break;
  }

  const node: ConditionalNode = {
    type: 'conditional' as const,
    branches,
    elseBody,
    condition: branches[0]?.condition,
    ifBody: branches[0]?.body,
  };
  if (wasHidden) node.hidden = true;

  return { node, endIndex: i };
}

function collectConditionalBody(
  lines: string[],
  start: number,
  end: number,
  state: ParserState,
): ParseResult {
  return parseLines(lines, start, end, state, (trimmed) =>
    ELSE_RE.test(trimmed) || ELSE_IF_RE.test(trimmed) || ENDIF_RE.test(trimmed),
  );
}
