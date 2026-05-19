import type { AstNode, ConditionalNode } from './types.js';

/**
 * Line-based parser with CalcPAD-syntax extensions:
 *   - Comments:        `'` or `//`  (whole line, never rendered)
 *   - Assignments:     `b = 300 mm` / `A = b * h` / `f = sin(x) + 1`
 *   - Input prompts:   `F = ? kN`  (CalcPAD-style — value supplied at runtime)
 *   - Headings:        `# h1 ... ###### h6`
 *   - Conditionals:    `#if cond` / `#else if cond` / `#else` / `#end if`  (cascading)
 *   - Visibility:      `#hide` / `#show`  (hidden assignments still execute; output skipped)
 *   - Blocks:          `@svg ... @end` / `@select ... @end` / `@gef name` / `@img(src)`
 *
 * Anything else becomes a plain text node (description prose).
 */

// ── Recognizers ────────────────────────────────────────────────────────
const ASSIGNMENT_RE = /^([a-zA-Z_]\w*)\s*=\s*(.+)$/;
const INPUT_PROMPT_RE = /^([a-zA-Z_]\w*)\s*=\s*\?\s*(.*)$/;
const USER_FUNC_RE = /^([a-zA-Z_]\w*)\s*\(\s*([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s*\)\s*=\s*(.+)$/;
const VAR_DISPLAY_RE = /^([a-zA-Z_]\w*)\s*$/;
const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const SVG_START_RE = /^@svg\s*$/;
const BLOCK_END_RE = /^@end\s*$/;
const IMG_RE = /^@img\((.+)\)\s*$/;
const SELECT_START_RE = /^@select\s+([a-zA-Z_]\w*)\s+"([^"]+)"\s*$/;
const SELECT_OPTION_RE = /^(.+?)\s*=\s*(.+)$/;
const GEF_RE = /^@gef\s+([a-zA-Z_]\w*)\s*$/;
const IF_RE = /^#if\s+(.+)$/;
const ELSE_IF_RE = /^#else\s*if\s+(.+)$/;
const ELSE_RE = /^#else\s*$/;
const ENDIF_RE = /^#end\s+if\s*$/;
const HIDE_RE = /^#hide\s*$/;
const SHOW_RE = /^#show\s*$/;
const PRE_RE = /^#pre\s*$/;
const ENDPRE_RE = /^#end\s+pre\s*$/;
const POST_RE = /^#post\s*$/;
const ENDPOST_RE = /^#end\s+post\s*$/;
const REPEAT_RE = /^#repeat\s+(.+)$/;
const ENDREPEAT_RE = /^#end\s+repeat\s*$/;
const COMMENT_APOS_RE = /^'(\s|$)/;
const COMMENT_SLASH_RE = /^\/\//;

interface ParserState {
  /** True while inside #hide … #show range. */
  hidden: boolean;
}

export function parse(source: string): AstNode[] {
  const lines = source.split('\n');
  const state: ParserState = { hidden: false };
  return parseLines(lines, 0, lines.length, state).nodes;
}

interface ParseResult {
  nodes: AstNode[];
  endIndex: number;
}

/**
 * Parse a contiguous slice of lines. When `stopOn` is provided, parsing halts at
 * the first line (NOT consuming it) for which the predicate returns true. This
 * lets conditional/loop bodies share all the top-level syntax handlers below.
 */
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

    if (stopOn && stopOn(trimmed)) {
      break;
    }

    // Empty line — skip
    if (trimmed === '') {
      i++;
      continue;
    }

    // CalcPAD comment (`'` or `//`)
    if (COMMENT_APOS_RE.test(trimmed) || COMMENT_SLASH_RE.test(trimmed)) {
      i++;
      continue;
    }

    // #hide / #show toggles
    if (HIDE_RE.test(trimmed)) {
      state.hidden = true;
      i++;
      continue;
    }
    if (SHOW_RE.test(trimmed)) {
      state.hidden = false;
      i++;
      continue;
    }

    // #pre … #end pre / #post … #end post — execute but never render
    if (PRE_RE.test(trimmed) || POST_RE.test(trimmed)) {
      const isPre = PRE_RE.test(trimmed);
      const wasHidden = state.hidden;
      state.hidden = true;
      i++;
      const inner = parseLines(lines, i, end, state, (t) =>
        isPre ? ENDPRE_RE.test(t) : ENDPOST_RE.test(t),
      );
      nodes.push(...inner.nodes);
      i = inner.endIndex;
      state.hidden = wasHidden;
      if (i < end) i++; // consume #end pre / #end post
      continue;
    }

    // #repeat N … #end repeat — body is collected verbatim and replayed in evaluator
    const repeatMatch = trimmed.match(REPEAT_RE);
    if (repeatMatch) {
      const count = repeatMatch[1];
      i++;
      const bodyResult = parseLines(lines, i, end, state, (t) => ENDREPEAT_RE.test(t));
      i = bodyResult.endIndex;
      if (i < end) i++; // consume #end repeat
      nodes.push(markHidden({ type: 'repeat', count, body: bodyResult.nodes }, state));
      continue;
    }

    // Heading
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

    // SVG block — passes through verbatim
    if (SVG_START_RE.test(trimmed)) {
      const svgLines: string[] = [];
      i++;
      while (i < end && !BLOCK_END_RE.test(lines[i].trim())) {
        svgLines.push(lines[i]);
        i++;
      }
      nodes.push(markHidden({ type: 'svg', content: svgLines.join('\n') }, state));
      i++; // skip @end
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
        if (optLine !== '' && !COMMENT_APOS_RE.test(optLine) && !COMMENT_SLASH_RE.test(optLine)) {
          const optMatch = optLine.match(SELECT_OPTION_RE);
          if (optMatch) {
            options.push({ text: optMatch[1].trim(), value: optMatch[2].trim() });
          }
        }
        i++;
      }
      nodes.push(markHidden({ type: 'select', name, label, options }, state));
      i++; // skip @end
      continue;
    }

    // Image
    const imgMatch = trimmed.match(IMG_RE);
    if (imgMatch) {
      nodes.push(markHidden({ type: 'image', src: imgMatch[1].trim() }, state));
      i++;
      continue;
    }

    // GEF upload
    const gefMatch = trimmed.match(GEF_RE);
    if (gefMatch) {
      nodes.push(markHidden({ type: 'gef-upload', name: gefMatch[1] }, state));
      i++;
      continue;
    }

    // Conditional #if / [#else if]* / [#else] / #end if
    const ifMatch = trimmed.match(IF_RE);
    if (ifMatch) {
      const result = parseConditional(lines, i, end, state, ifMatch[1]);
      nodes.push(result.node);
      i = result.endIndex;
      continue;
    }

    // CalcPAD input prompt: `F = ? kN` — check BEFORE generic assignment
    const promptMatch = trimmed.match(INPUT_PROMPT_RE);
    if (promptMatch) {
      const unit = promptMatch[2].trim();
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

    // User-defined function: `f(x) = x^2 + 1` — match BEFORE generic assignment
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

    // Assignment (variable = expression)
    const assignMatch = trimmed.match(ASSIGNMENT_RE);
    if (assignMatch) {
      nodes.push(
        markHidden({
          type: 'assignment',
          name: assignMatch[1],
          expression: assignMatch[2].trim(),
          raw: trimmed,
        }, state),
      );
      i++;
      continue;
    }

    // Bare variable display: `x` on its own line → show current value
    const varDisplayMatch = trimmed.match(VAR_DISPLAY_RE);
    if (varDisplayMatch) {
      nodes.push(markHidden({ type: 'var-display', name: varDisplayMatch[1] }, state));
      i++;
      continue;
    }

    // Plain text (description)
    nodes.push(markHidden({ type: 'text', text: trimmed }, state));
    i++;
  }

  return { nodes, endIndex: end };
}

function markHidden<T extends AstNode>(node: T, state: ParserState): T {
  if (state.hidden) {
    return { ...node, hidden: true };
  }
  return node;
}

/**
 * Parse a cascading conditional starting at the `#if` line (already consumed
 * `condition` from the IF_RE match). Returns the assembled node + final index
 * (one past the `#end if`).
 *
 * Supports `#if c1 ... #else if c2 ... #else if c3 ... #else ... #end if`.
 */
function parseConditional(
  lines: string[],
  start: number,
  end: number,
  state: ParserState,
  firstCondition: string,
): { node: ConditionalNode; endIndex: number } {
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

    // `#else if cond` → start another branch
    const elseIfMatch = trimmed.match(ELSE_IF_RE);
    if (elseIfMatch) {
      currentCondition = elseIfMatch[1];
      i++; // consume #else if
      continue;
    }

    // `#else` → collect final else body
    if (ELSE_RE.test(trimmed)) {
      i++; // consume #else
      const elseResult = collectConditionalBody(lines, i, end, state);
      elseBody = elseResult.nodes;
      i = elseResult.endIndex;
    }

    // `#end if` → stop
    if (i < end && ENDIF_RE.test(lines[i].trim())) {
      i++;
    }
    break;
  }

  const node: ConditionalNode = markHidden(
    {
      type: 'conditional' as const,
      branches,
      elseBody,
      // legacy compatibility
      condition: branches[0]?.condition,
      ifBody: branches[0]?.body,
    },
    state,
  );

  return { node, endIndex: i };
}

/**
 * Collect body lines for a single conditional branch — stops at #else, #else if,
 * #end if. Delegates to parseLines so the full syntax (functions, repeats, hide,
 * nested conditionals, input prompts, …) is supported inside branches.
 */
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
