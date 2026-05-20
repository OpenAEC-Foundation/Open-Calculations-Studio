export { parse, type ParseOptions } from './parser.js';
export { evaluate, setAngleMode } from './evaluator.js';
export type { SelectValues, AngleMode } from './evaluator.js';
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
import { evaluate, type SelectValues } from './evaluator.js';
import { render } from './renderer.js';

/**
 * Process a calc document from source text to HTML output.
 * Convenience function that chains parse → evaluate → render.
 *
 * `options.includes` resolves `#include filename` directives at parse time —
 * the host (desktop, web) supplies a map of filename → contents.
 */
export function process(
  source: string,
  selectValues?: SelectValues,
  options?: ParseOptions,
): string {
  const ast = parse(source, options);
  const evaluated = evaluate(ast, selectValues);
  return render(evaluated);
}
