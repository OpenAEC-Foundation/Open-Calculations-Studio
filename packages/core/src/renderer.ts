import katex from 'katex';
import type { EvaluatedNode } from './types.js';
import { exprToLatex, nameToLatex, resultToLatex } from './latex.js';

// ─── KaTeX rendering ────────────────────────────────────────────────

function renderLatex(latex: string, displayMode = false): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      fleqn: true,
      throwOnError: false,
      trust: true,
      strict: false,
    });
  } catch {
    return `<span class="calc-error-inline">${escapeHtml(latex)}</span>`;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Node rendering ─────────────────────────────────────────────────

/**
 * Coalesce consecutive HTML text nodes that together form an `<svg>...</svg>`
 * block into a single `svg` node. This is needed because CalcPAD's SVG macros
 * emit one prose line per element (`'<line .../>`, `'<rect .../>`, etc.), and
 * the default text renderer wraps each in `<p>`, which breaks SVG nesting.
 */
function coalesceSvg(nodes: EvaluatedNode[]): EvaluatedNode[] {
  const out: EvaluatedNode[] = [];
  let i = 0;
  while (i < nodes.length) {
    const n = nodes[i];
    if (n.type === 'conditional-branch') {
      out.push({ ...n, children: coalesceSvg(n.children) });
      i++;
      continue;
    }
    if (n.type === 'text' && n.html && /<svg\b/i.test(n.text)) {
      const buf: string[] = [n.text];
      let depth = (n.text.match(/<svg\b/gi)?.length ?? 0)
                - (n.text.match(/<\/svg>/gi)?.length ?? 0);
      i++;
      while (i < nodes.length && depth > 0) {
        const m = nodes[i];
        if (m.type !== 'text' || !m.html) break;
        buf.push(m.text);
        depth += (m.text.match(/<svg\b/gi)?.length ?? 0)
               - (m.text.match(/<\/svg>/gi)?.length ?? 0);
        i++;
      }
      out.push({ type: 'svg', content: buf.join('\n') });
      continue;
    }
    out.push(n);
    i++;
  }
  return out;
}

export function render(nodes: EvaluatedNode[]): string {
  const coalesced = coalesceSvg(nodes);
  const parts: string[] = ['<div class="ifc-calc">'];

  for (const node of coalesced) {
    parts.push(renderNode(node));
  }

  parts.push('</div>');
  return parts.join('\n');
}

function renderNode(node: EvaluatedNode): string {
  switch (node.type) {
    case 'heading':
      return `<h${node.level}>${escapeHtml(node.text)}</h${node.level}>`;

    case 'text':
      // CalcPAD prose lines (`'…`) come through with `html: true` and may contain
      // inline tags like <i>, <b>, <hr/>, <sub>. Pass them through unescaped.
      return node.html
        ? `<p class="calc-text">${node.text}</p>`
        : `<p class="calc-text">${escapeHtml(node.text)}</p>`;

    case 'plot':
      return `<div class="calc-plot-wrap">${node.svg}</div>`;

    case 'assignment':
      return renderAssignment(node);

    case 'conditional-branch':
      return node.children.map(renderNode).join('\n');

    case 'svg':
      return `<div class="calc-svg">${node.content}</div>`;

    case 'image':
      return `<div class="calc-image"><img src="${escapeHtml(node.src)}" alt="" /></div>`;

    case 'select':
      return renderSelect(node);

    case 'input-prompt':
      return renderInputPrompt(node);

    case 'user-function':
      return renderUserFunction(node);

    case 'var-display':
      return renderVarDisplay(node);

    case 'gef-upload':
      return renderGefUpload(node);
  }
}

function renderUserFunction(node: { name: string; params: string[]; expression: string }): string {
  const nameLatex = nameToLatex(node.name);
  const paramsLatex = node.params.map(nameToLatex).join(", \\, ");
  const exprLatex = exprToLatex(node.expression);
  const latex = `${nameLatex}(${paramsLatex}) = ${exprLatex}`;
  return `<div class="calc-line"><span class="calc-formula">${renderLatex(latex, true)}</span></div>`;
}

function renderVarDisplay(node: { name: string; result: string; unit: string }): string {
  const nameLatex = nameToLatex(node.name);
  // node.result already includes the unit ("2.91 m"); pass num + unit to
  // resultToLatex separately so we don't double-print the unit suffix.
  const { numStr, unitStr } = splitResult(node.result);
  const effectiveUnit = node.unit || unitStr;
  const valueLatex = resultToLatex(numStr, effectiveUnit);
  const latex = `${nameLatex} = ${valueLatex}`;
  return `<div class="calc-line"><span class="calc-formula">${renderLatex(latex, true)}</span></div>`;
}

function renderInputPrompt(node: {
  name: string;
  label: string;
  unit: string;
  currentValue: string;
}): string {
  const unitSuffix = node.unit
    ? `<span class="calc-input-unit">${escapeHtml(node.unit)}</span>`
    : '';
  return `<div class="calc-input-prompt">
  <label class="calc-input-label">${escapeHtml(node.label)} =</label>
  <input type="number"
    class="calc-input-value"
    data-prompt="${escapeHtml(node.name)}"
    value="${escapeHtml(node.currentValue)}"
    step="any" />
  ${unitSuffix}
</div>`;
}

function renderSelect(node: {
  name: string;
  label: string;
  options: { text: string; value: string }[];
  selectedValue: string;
}): string {
  const optionsHtml = node.options
    .map(opt => {
      const selected = opt.value === node.selectedValue ? ' selected' : '';
      return `<option value="${escapeHtml(opt.value)}"${selected}>${escapeHtml(opt.text)}</option>`;
    })
    .join('\n');

  return `<div class="calc-select">
  <label class="calc-select-label">${escapeHtml(node.label)}</label>
  <select class="calc-select-input" data-var="${escapeHtml(node.name)}">
    ${optionsHtml}
  </select>
</div>`;
}

function renderGefUpload(node: { name: string }): string {
  return `<div class="calc-gef-upload" data-gef-var="${escapeHtml(node.name)}">
  <div class="calc-gef-dropzone" id="gef-drop-${escapeHtml(node.name)}">
    <span class="calc-gef-icon">&#x1F4CA;</span>
    <span class="calc-gef-text">GEF-bestand slepen of klikken om te uploaden</span>
    <input type="file" accept=".gef,.GEF" class="calc-gef-input" />
  </div>
  <div class="calc-gef-result" style="display:none">
    <div class="calc-gef-filename"></div>
    <div class="calc-gef-chart"></div>
    <div class="calc-gef-values"></div>
  </div>
</div>`;
}

function renderAssignment(node: {
  name: string;
  expression: string;
  substitution: string;
  result: string;
  unit: string;
}): string {
  // Error case
  if (node.result.startsWith('Error:')) {
    return `<div class="calc-line calc-error">
  ${renderLatex(`${nameToLatex(node.name)} = ${exprToLatex(node.expression)}`)}
  <span class="calc-error-msg">${escapeHtml(node.result)}</span>
</div>`;
  }

  // Build the LaTeX chain: name = expr [= substitution] = result
  // Split numeric value and unit from result
  const { numStr, unitStr } = splitResult(node.result);
  const resultLatex = resultToLatex(numStr, unitStr);

  // Name
  const nameTex = nameToLatex(node.name);

  // Symbolic expression
  const exprTex = exprToLatex(node.expression);

  // Check if expression is just a direct value (no variables to substitute)
  const isDirectValue = !node.substitution || node.substitution === node.expression;

  let fullLatex: string;

  if (isDirectValue) {
    // Simple: name = value (e.g., b = 300 mm)
    fullLatex = `${nameTex} = \\textcolor{#059669}{\\boldsymbol{${resultLatex}}}`;
  } else {
    // Full chain: name = expr = substitution = result
    let subTex: string;
    try {
      subTex = exprToLatex(node.substitution);
    } catch {
      subTex = escapeLatexStr(node.substitution);
    }

    fullLatex = `${nameTex} = ${exprTex} = ${subTex} = \\textcolor{#059669}{\\boldsymbol{${resultLatex}}}`;
  }

  return `<div class="calc-line">${renderLatex(fullLatex, true)}</div>`;
}

/** Split a result string like "150000 mm^2" into number and unit */
function splitResult(result: string): { numStr: string; unitStr: string } {
  const match = result.match(/^([+-]?\d+\.?\d*(?:e[+-]?\d+)?)\s+(.+)$/i);
  if (match) {
    return { numStr: match[1], unitStr: match[2] };
  }
  return { numStr: result, unitStr: '' };
}

function escapeLatexStr(s: string): string {
  return s.replace(/[_^{}\\#&%$]/g, c => '\\' + c);
}

// ─── Styles ─────────────────────────────────────────────────────────

export const defaultStyles = `
.ifc-calc {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  max-width: 900px;
  padding: 2rem;
  line-height: 1.7;
  color: #1a1a1a;
}

.ifc-calc h1, .ifc-calc h2, .ifc-calc h3,
.ifc-calc h4, .ifc-calc h5, .ifc-calc h6 {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  color: #0d2137;
  border-bottom: 1px solid #d1d5db;
  padding-bottom: 0.3em;
}
.ifc-calc h1 { font-size: 1.5em; }
.ifc-calc h2 { font-size: 1.25em; }
.ifc-calc h3 { font-size: 1.1em; }

.calc-text {
  margin: 0.3em 0;
  color: #374151;
  font-size: 0.95em;
}

.calc-line {
  /* CalcPAD-stijl: geen achtergrond / linker streep — gewoon de formule. */
  padding: 0.15em 0;
  margin: 0.25em 0;
  /* Verbergt overflow zonder slider; KaTeX past zich via .calc-line .katex aan. */
  overflow-x: hidden;
}

.calc-line .katex-display {
  margin: 0.2em 0;
  text-align: left !important;
}

.calc-line .katex-display > .katex {
  text-align: left !important;
}

.calc-line .katex {
  font-size: 1.1em;
  text-align: left;
}

.calc-error {
  /* Fout-regels krijgen wel een lichte rood-tint zodat ze opvallen. */
  background: #fef2f2;
  border-left: 3px solid #dc2626;
  padding-left: 0.6em;
}

.calc-error-msg {
  display: block;
  color: #dc2626;
  font-size: 0.85em;
  margin-top: 0.3em;
  font-family: 'Consolas', monospace;
}

.calc-error-inline {
  color: #dc2626;
  font-family: 'Consolas', monospace;
}

.calc-svg {
  margin: 1em 0;
  text-align: center;
}
.calc-svg svg {
  max-width: 100%;
}

.calc-plot-wrap {
  margin: 1em 0;
  background: #fafaf9;
  border: 1px solid #e7e5e4;
  border-radius: 6px;
  padding: 6px;
  text-align: center;
}
.calc-plot {
  max-width: 100%;
  height: auto;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
}

.calc-image {
  margin: 1em 0;
  text-align: center;
}
.calc-image img {
  max-width: 100%;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.calc-select {
  display: flex;
  align-items: center;
  gap: 0.75em;
  margin: 0.4em 0;
  padding: 0.5em 1em;
  background: #f0f9ff;
  border-left: 3px solid #0ea5e9;
  border-radius: 0 6px 6px 0;
}

.calc-select-label {
  font-size: 0.9em;
  font-weight: 600;
  color: #0369a1;
  white-space: nowrap;
}

.calc-select-input {
  padding: 0.35em 0.75em;
  border: 1px solid #bae6fd;
  border-radius: 4px;
  background: white;
  font-size: 0.9em;
  color: #1a1a1a;
  cursor: pointer;
  min-width: 200px;
}

.calc-select-input:focus {
  outline: none;
  border-color: #0ea5e9;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
}

/* ─── CalcPAD ? Input Prompt ─────────────────────────────────────── */

.calc-input-prompt {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin: 0.35em 0;
  padding: 0.4em 1em;
  background: #fef3c7;
  border-left: 3px solid #D97706;
  border-radius: 0 6px 6px 0;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
}

.calc-input-label {
  font-size: 0.95em;
  font-weight: 600;
  color: #92400E;
  white-space: nowrap;
}

.calc-input-value {
  padding: 0.25em 0.5em;
  border: 1px solid #fcd34d;
  border-radius: 4px;
  background: white;
  font-family: inherit;
  font-size: 0.95em;
  color: #1a1a1a;
  width: 8em;
}

.calc-input-value:focus {
  outline: none;
  border-color: #D97706;
  box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.2);
}

.calc-input-unit {
  font-size: 0.9em;
  color: #92400E;
  font-style: italic;
}

/* ─── GEF Upload ─────────────────────────────────────────────────── */

.calc-gef-upload {
  margin: 0.75em 0;
}

.calc-gef-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  padding: 1.5em 1em;
  border: 2px dashed #94a3b8;
  border-radius: 8px;
  background: #f8fafc;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  position: relative;
}

.calc-gef-dropzone:hover,
.calc-gef-dropzone.drag-over {
  border-color: #3b82f6;
  background: #eff6ff;
}

.calc-gef-icon {
  font-size: 2em;
  line-height: 1;
}

.calc-gef-text {
  font-size: 0.9em;
  color: #64748b;
}

.calc-gef-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.calc-gef-result {
  margin-top: 0.75em;
}

.calc-gef-filename {
  font-size: 0.85em;
  font-weight: 600;
  color: #0369a1;
  margin-bottom: 0.5em;
  padding: 0.3em 0.6em;
  background: #f0f9ff;
  border-radius: 4px;
  display: inline-block;
}

.calc-gef-chart {
  margin: 0.5em 0;
  overflow-x: auto;
}

.calc-gef-chart svg {
  display: block;
}

.calc-gef-values {
  font-size: 0.9em;
  color: #374151;
  padding: 0.5em 0.75em;
  background: #f0fdf4;
  border-left: 3px solid #22c55e;
  border-radius: 0 6px 6px 0;
  line-height: 1.8;
}

.calc-gef-values strong {
  color: #166534;
}
`;
