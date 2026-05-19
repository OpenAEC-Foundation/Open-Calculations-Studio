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
  | EvaluatedConditionalBranch
  | EvaluatedSvg
  | EvaluatedImage
  | EvaluatedSelect
  | EvaluatedGefUpload;
