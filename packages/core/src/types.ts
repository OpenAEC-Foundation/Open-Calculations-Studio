/**
 * CalcPAD-compatible node types.
 *
 * Visibility model: each renderable node may carry `hidden: true` (set by parser
 * inside #hide…#show ranges). Hidden assignments still execute (variable binds
 * to scope) but the renderer skips them. Compatible with CalcPAD's `#hide`/`#show`
 * directives.
 */

export interface HeadingNode {
  type: 'heading';
  level: number;
  text: string;
  hidden?: boolean;
}

export interface TextNode {
  type: 'text';
  text: string;
  /** True when text came from a CalcPAD prose line (`'...`) — content is passed
   *  through as HTML without escaping. False (default) for derived/safe text. */
  html?: boolean;
  /** Optional template parts for CalcPAD prose interpolation. When present,
   *  the renderer should concat literal segments with evaluated expressions.
   *  Example: `'<svg viewbox="'-xx' '-yy'" ...>` becomes
   *    [{lit:'<svg viewbox="'}, {expr:'-xx'}, {lit:' '}, {expr:'-yy'}, {lit:'" ...>'}] */
  parts?: Array<{ kind: 'literal'; value: string } | { kind: 'expr'; value: string }>;
  hidden?: boolean;
}

export interface AssignmentNode {
  type: 'assignment';
  name: string;
  expression: string;
  raw: string;
  hidden?: boolean;
}

/**
 * Cascading conditional with CalcPAD-style `#else if`.
 * `branches[0]` is the primary `#if`; subsequent are `#else if`.
 * `elseBody` is the final `#else` (or empty).
 */
export interface ConditionalNode {
  type: 'conditional';
  branches: { condition: string; body: AstNode[] }[];
  elseBody: AstNode[];
  hidden?: boolean;
  /** Backwards-compat shims (renderer/legacy code may still reference these). */
  condition?: string;
  ifBody?: AstNode[];
}

/**
 * CalcPAD `?` input prompt — `F = ? kN` prompts user for a numeric value.
 * Interactive: renderer emits an <input>, value flows back via SelectValues.
 */
export interface InputPromptNode {
  type: 'input-prompt';
  name: string;
  label: string;
  defaultValue: string;
  unit: string;
  hidden?: boolean;
}

/**
 * CalcPAD user-defined function: `f(x) = x^2 + 1` or `g(a, b) = sqrt(a^2 + b^2)`.
 * Evaluator passes the full assignment string verbatim to mathjs which supports
 * function definitions natively (`f = (x) -> x^2 + 1`).
 */
export interface UserFunctionNode {
  type: 'user-function';
  name: string;
  params: string[];
  expression: string;
  raw: string;
  hidden?: boolean;
}

/**
 * Read-only variable display — `x` alone on a line renders the current value.
 * Useful for referencing earlier-computed quantities in narrative flow.
 */
export interface VarDisplayNode {
  type: 'var-display';
  name: string;
  hidden?: boolean;
}

/**
 * CalcPAD `#repeat n … #end repeat` loop. The body is evaluated `count` times;
 * scope is shared across iterations so values accumulate (e.g. running totals).
 *
 * Iteration index is bound to the variable `_i` (1-based) within the body.
 */
export interface RepeatNode {
  type: 'repeat';
  count: string; // raw expression — evaluated against scope per repeat
  body: AstNode[];
  hidden?: boolean;
}

/**
 * CalcPAD `$Plot{curve1 & curve2 @ var = lo : hi}` inline 2D plot.
 * Each curve is either `yExpr` (implicit x) or `xExpr|yExpr` (parametric).
 * The parameter (variable name + range) is shared across all curves.
 *
 * Evaluator samples each curve at `samples` points and renders as inline SVG.
 */
export interface PlotNode {
  type: 'plot';
  curves: { xExpr?: string; yExpr: string }[];
  param: string;        // variable name, e.g. "x" or "θ"
  lo: string;           // expression for lower bound
  hi: string;           // expression for upper bound
  samples?: number;     // default 100
  hidden?: boolean;
}

export interface EvaluatedPlot {
  type: 'plot';
  svg: string;
}

export interface SvgNode {
  type: 'svg';
  content: string;
  hidden?: boolean;
}

export interface ImageNode {
  type: 'image';
  src: string;
  hidden?: boolean;
}

export interface SelectOption {
  text: string;
  value: string;
}

export interface SelectNode {
  type: 'select';
  name: string;
  label: string;
  options: SelectOption[];
  hidden?: boolean;
}

export interface GefUploadNode {
  type: 'gef-upload';
  name: string;  // variable prefix, e.g. "sondering1"
  hidden?: boolean;
}

export type AstNode =
  | HeadingNode
  | TextNode
  | AssignmentNode
  | ConditionalNode
  | InputPromptNode
  | UserFunctionNode
  | VarDisplayNode
  | RepeatNode
  | PlotNode
  | SvgNode
  | ImageNode
  | SelectNode
  | GefUploadNode;

export interface EvaluatedHeading {
  type: 'heading';
  level: number;
  text: string;
}

export interface EvaluatedText {
  type: 'text';
  text: string;
  html?: boolean;
}

export interface EvaluatedAssignment {
  type: 'assignment';
  name: string;
  expression: string;
  substitution: string;
  result: string;
  unit: string;
  hidden?: boolean;
}

export interface EvaluatedInputPrompt {
  type: 'input-prompt';
  name: string;
  label: string;
  unit: string;
  currentValue: string;
}

export interface EvaluatedUserFunction {
  type: 'user-function';
  name: string;
  params: string[];
  expression: string;
}

/** Renders as `name = <value>` — same chrome as a regular assignment with no substitution. */
export interface EvaluatedVarDisplay {
  type: 'var-display';
  name: string;
  result: string;
  unit: string;
}

export interface EvaluatedConditionalBranch {
  type: 'conditional-branch';
  children: EvaluatedNode[];
}

export interface EvaluatedSvg {
  type: 'svg';
  content: string;
}

export interface EvaluatedImage {
  type: 'image';
  src: string;
}

export interface EvaluatedSelect {
  type: 'select';
  name: string;
  label: string;
  options: SelectOption[];
  selectedValue: string;
}

export interface EvaluatedGefUpload {
  type: 'gef-upload';
  name: string;
  data: null;  // data comes from runtime upload
}

export type EvaluatedNode =
  | EvaluatedHeading
  | EvaluatedText
  | EvaluatedAssignment
  | EvaluatedInputPrompt
  | EvaluatedUserFunction
  | EvaluatedVarDisplay
  | EvaluatedConditionalBranch
  | EvaluatedPlot
  | EvaluatedSvg
  | EvaluatedImage
  | EvaluatedSelect
  | EvaluatedGefUpload;
