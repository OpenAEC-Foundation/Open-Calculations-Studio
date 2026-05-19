import type { AstNode, ConditionalNode, PlotNode } from './types.js';

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

// ── Entry point ────────────────────────────────────────────────────────
export function parse(source: string): AstNode[] {
  source = rewriteMatrixLiterals(stripDollarSuffix(foldSubscriptCommas(source)));
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
    // Toggle split — alternating code / prose fragments
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
    const proseMatch = trimmed.match(PROSE_RE);
    if (proseMatch) {
      const text = proseMatch[1].trim();
      // Skip empty prose AND CalcPAD's persisted input values that latch
      // onto a trailing `'` (e.g. `'2	1` at EOF).
      if (text !== '' && !TRAILING_DATA_RE.test(text)) {
        nodes.push(markHidden({ type: 'text', text, html: true }, state));
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
      // Preserve outer hidden state — `#hide` inside the body shouldn't bubble
      // up and mark the repeat itself as hidden.
      const repeatNode = { type: 'repeat' as const, count, body: bodyResult.nodes };
      nodes.push(wasHidden ? { ...repeatNode, hidden: true } : repeatNode);
      continue;
    }

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
