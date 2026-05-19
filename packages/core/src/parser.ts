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

function parseLines(
  lines: string[],
  start: number,
  end: number,
  state: ParserState,
): ParseResult {
  const nodes: AstNode[] = [];
  let i = start;

  while (i < end) {
    const line = lines[i];
    const trimmed = line.trim();

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

/** Collect body lines for a single conditional branch — stops at #else, #else if, #end if. */
function collectConditionalBody(
  lines: string[],
  start: number,
  end: number,
  state: ParserState,
): ParseResult {
  const nodes: AstNode[] = [];
  let i = start;

  while (i < end) {
    const trimmed = lines[i].trim();
    if (
      ELSE_RE.test(trimmed) ||
      ELSE_IF_RE.test(trimmed) ||
      ENDIF_RE.test(trimmed)
    ) {
      break;
    }

    // Empty line
    if (trimmed === '') {
      i++;
      continue;
    }

    // Comment
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

    // Nested #if
    const ifMatch = trimmed.match(IF_RE);
    if (ifMatch) {
      const result = parseConditional(lines, i, end, state, ifMatch[1]);
      nodes.push(result.node);
      i = result.endIndex;
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

    // Input prompt
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

    // Assignment
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

    nodes.push(markHidden({ type: 'text', text: trimmed }, state));
    i++;
  }

  return { nodes, endIndex: i };
}
