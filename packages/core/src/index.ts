export { parse, type ParseOptions } from './parser.js';
export { evaluate, extractScope, setAngleMode } from './evaluator.js';
export type { SelectValues, AngleMode, Scope } from './evaluator.js';
export { render, defaultStyles } from './renderer.js';
export { exprToLatex, nameToLatex } from './latex.js';
export { parseGef, type GefData } from './gef-parser.js';
export {
  generateIfcx,
  generateIfc4x3Step,
  type IfcGenerationOptions,
  type IfcGenerationResult,
  type IfcxDocument,
  type IfcxHeader,
  type IfcxEntry,
} from './ifc-generator.js';
export type * from './types.js';

import { parse, type ParseOptions } from './parser.js';
import { evaluate, type SelectValues, type Scope } from './evaluator.js';
import { render } from './renderer.js';

export interface ProcessOptions extends ParseOptions {
  /** Pre-bound scope variables (e.g. globals from a parent metadata sheet). */
  initialScope?: Scope;
}

/**
 * Process a calc document from source text to HTML output.
 * Convenience function that chains parse → evaluate → render.
 *
 * `options.includes` resolves `#include filename` directives at parse time —
 * the host (desktop, web) supplies a map of filename → contents.
 * `options.initialScope` seeds the evaluator with already-bound variables
 * (e.g. K_FI / windgebied uit projectgegevens) — used voor multi-sheet
 * projecten waar globals worden overgeërfd.
 */
export function process(
  source: string,
  selectValues?: SelectValues,
  options?: ProcessOptions,
): string {
  const ast = parse(source, options);
  const evaluated = evaluate(ast, selectValues, options?.initialScope);
  return render(evaluated);
}
