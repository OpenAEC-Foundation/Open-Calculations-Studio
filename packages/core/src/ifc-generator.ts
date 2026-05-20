/**
 * IFC generators — produce IFCX (JSON-LD) and IFC4x3 STEP-SPF text from a
 * CalcPAD-evaluated AST. The detection heuristics are intentionally light:
 * for every calculation we always emit a valid skeleton (Project → Site →
 * Building → Storey) and then layer structural elements on top when their
 * conventional variable names are present (e.g. `b_fdn`, `l_fdn`,
 * `D_paal`, `R_c_d`).
 *
 * No attempt is made to round-trip back into the calc model — these
 * generators are one-way exporters consumed by the IFC viewer panel.
 */

import type { EvaluatedNode, EvaluatedAssignment, EvaluatedVarDisplay } from './types.js';

export interface IfcGenerationOptions {
  /** Project title. Falls back to "Berekening" when omitted. */
  projectName?: string;
  /** Author for FILE_NAME / IFCX header. */
  author?: string;
  /** Organization for FILE_NAME / IFCX header. */
  organization?: string;
  /** Override timestamp (ISO 8601). Defaults to `new Date()`. */
  timestamp?: string;
}

export interface IfcxHeader {
  name: string;
  description?: string;
  projectName?: string;
  timestamp?: string;
  schema?: string;
  author?: string;
  organization?: string;
  preprocessor?: string;
  originatingSystem?: string;
  /** Generation error message, set when generation failed. */
  error?: string;
}

export type IfcxEntry = {
  path: string;
  type: string;
  name?: string;
} & Record<string, unknown>;

export interface IfcxDocument {
  '@context'?: string;
  '@type'?: string;
  header: IfcxHeader;
  data: IfcxEntry[];
}

export interface IfcGenerationResult {
  ifcx: IfcxDocument;
  step: string;
}

// ── Extraction helpers ────────────────────────────────────────────

interface ScalarBinding {
  name: string;
  /** Numeric portion of result, e.g. "150" from "150 mm". NaN if not numeric. */
  value: number;
  /** Unit portion, e.g. "mm" from "150 mm". Empty when dimensionless. */
  unit: string;
  /** Raw result string for display. */
  raw: string;
}

/** Walk evaluated tree and gather all assignment + var-display bindings. */
function collectBindings(nodes: EvaluatedNode[]): ScalarBinding[] {
  const out: ScalarBinding[] = [];
  const walk = (arr: EvaluatedNode[]): void => {
    for (const n of arr) {
      if (n.type === 'assignment') {
        const a = n as EvaluatedAssignment;
        if (typeof a.result === 'string' && !a.result.startsWith('Error')) {
          out.push(parseScalar(a.name, a.result, a.unit));
        }
      } else if (n.type === 'var-display') {
        const v = n as EvaluatedVarDisplay;
        out.push(parseScalar(v.name, v.result, v.unit));
      } else if (n.type === 'conditional-branch') {
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return out;
}

function parseScalar(name: string, raw: string, unitHint: string): ScalarBinding {
  // `formatResult` produces "150 mm" or "150000 mm^2"; unitHint mirrors the
  // unit portion. Split off the numeric prefix robustly.
  const m = String(raw).match(/^\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*(.*)$/);
  if (m) {
    return { name, value: parseFloat(m[1]), unit: (unitHint || m[2] || '').trim(), raw };
  }
  return { name, value: Number.NaN, unit: unitHint, raw };
}

/** Convert a value to a given length unit (mm), returning NaN if incompatible. */
function toMillimeters(b: ScalarBinding): number {
  if (!Number.isFinite(b.value)) return Number.NaN;
  const u = b.unit.toLowerCase();
  if (u === 'mm') return b.value;
  if (u === 'm' || u === '') return b.value * 1000;
  if (u === 'cm') return b.value * 10;
  return Number.NaN;
}

function findBinding(bindings: ScalarBinding[], names: readonly string[]): ScalarBinding | undefined {
  for (const target of names) {
    const exact = bindings.find((b) => b.name === target);
    if (exact) return exact;
  }
  // Case-insensitive fallback
  for (const target of names) {
    const lower = target.toLowerCase();
    const ci = bindings.find((b) => b.name.toLowerCase() === lower);
    if (ci) return ci;
  }
  return undefined;
}

// ── Element detection ─────────────────────────────────────────────

interface DetectedPile {
  diameter_mm: number;
  length_m: number;
  Rcd_kN?: number;
  NEd_kN?: number;
  unityCheck?: number;
}

interface DetectedFooting {
  width_mm: number;
  length_mm: number;
  thickness_mm?: number;
  selfWeight_kN?: number;
  bearingPressure_kPa?: number;
}

interface DetectedBeam {
  span_mm?: number;
  width_mm?: number;
  height_mm?: number;
  MEd_kNm?: number;
  unityCheck?: number;
}

interface DetectedElements {
  building?: { stories?: number; height_mm?: number };
  pile?: DetectedPile;
  footing?: DetectedFooting;
  beam?: DetectedBeam;
}

function detectElements(bindings: ScalarBinding[]): DetectedElements {
  const out: DetectedElements = {};

  // Building dimensions
  const stories = findBinding(bindings, ['n_story', 'n_stories', 'nStories', 'nStorey']);
  const buildingHeight = findBinding(bindings, ['h_Building', 'hBuilding', 'h_building']);
  if (stories || buildingHeight) {
    out.building = {
      stories: stories && Number.isFinite(stories.value) ? Math.round(stories.value) : undefined,
      height_mm: buildingHeight ? toMillimeters(buildingHeight) : undefined,
    };
  }

  // Pile detection — paaldraagvermogen calculation typically uses D, L, R_c_d
  const D = findBinding(bindings, ['D_paal', 'D', 'd_paal']);
  const L = findBinding(bindings, ['L_paal', 'L', 'l_paal']);
  const Rcd = findBinding(bindings, ['R_c_d', 'Rcd', 'R_cd']);
  const NEd = findBinding(bindings, ['N_Ed', 'NEd']);
  const ucPile = findBinding(bindings, ['UC_paal', 'uc_paal']);
  if (D && L) {
    out.pile = {
      diameter_mm: toMillimeters(D),
      length_m: L.unit.toLowerCase() === 'm' ? L.value : toMillimeters(L) / 1000,
      Rcd_kN: Rcd?.value,
      NEd_kN: NEd?.value,
      unityCheck: ucPile?.value,
    };
  }

  // Footing detection — 2259-Intertek uses b_fdn / l_fdn / t_fdn / G_fdn
  const bFdn = findBinding(bindings, ['b_fdn', 'b_fdn_1', 'b_fdn1']);
  const lFdn = findBinding(bindings, ['l_fdn', 'l_fdn_1', 'l_fdn1']);
  const tFdn = findBinding(bindings, ['t_fdn', 'h_fdn']);
  const gFdn = findBinding(bindings, ['G_fdn']);
  const pGround = findBinding(bindings, ['p_ground', 'p_max']);
  if (bFdn && lFdn) {
    out.footing = {
      width_mm: toMillimeters(bFdn),
      length_mm: toMillimeters(lFdn),
      thickness_mm: tFdn ? toMillimeters(tFdn) : undefined,
      selfWeight_kN: gFdn?.value,
      bearingPressure_kPa: pGround?.value,
    };
  }

  // Beam detection
  const span = findBinding(bindings, ['L_beam', 'L_balk', 'span', 'L']);
  const beamW = findBinding(bindings, ['b_beam', 'b_balk', 'b']);
  const beamH = findBinding(bindings, ['h_beam', 'h_balk', 'h']);
  const MEd = findBinding(bindings, ['M_Ed', 'MEd']);
  const ucBeam = findBinding(bindings, ['UC_M', 'uc_buiging']);
  if ((MEd || ucBeam) && (beamW || beamH)) {
    out.beam = {
      span_mm: span ? toMillimeters(span) : undefined,
      width_mm: beamW ? toMillimeters(beamW) : undefined,
      height_mm: beamH ? toMillimeters(beamH) : undefined,
      MEd_kNm: MEd?.value,
      unityCheck: ucBeam?.value,
    };
  }

  return out;
}

// ── Title extraction ──────────────────────────────────────────────

function extractTitle(nodes: EvaluatedNode[]): string | undefined {
  for (const n of nodes) {
    if (n.type === 'heading' && n.level === 1 && n.text) return n.text;
  }
  return undefined;
}

// ── IFCX generation ───────────────────────────────────────────────

/**
 * Generate an IFCX (JSON-LD draft) document from evaluated calc nodes.
 *
 * Always returns a valid document with a Project → Site → Building → Storey
 * skeleton. Detected structural elements (Pile / Footing / Beam) are appended
 * as additional entries with `verification` blocks carrying the calc results.
 */
export function generateIfcx(
  nodes: EvaluatedNode[],
  options: IfcGenerationOptions = {},
): IfcxDocument {
  const title = extractTitle(nodes);
  const projectName = options.projectName || title || 'Berekening';
  const bindings = collectBindings(nodes);
  const elements = detectElements(bindings);

  const doc: IfcxDocument = {
    '@context': 'https://standards.buildingsmart.org/IFC/IFCX/0.1/context.jsonld',
    '@type': 'IfcxFile',
    header: {
      name: `${slug(projectName)}.ifcx`,
      description: title,
      projectName,
      timestamp: options.timestamp ?? new Date().toISOString(),
      schema: 'ifcx:0.1',
      author: options.author ?? 'OpenAEC Calc',
      organization: options.organization ?? 'OpenAEC Foundation',
      preprocessor: 'OpenAEC Calc IFCX exporter',
      originatingSystem: 'OpenAEC Calc',
    },
    data: [],
  };

  doc.data.push({
    path: '/project',
    type: 'Project',
    name: projectName,
    units: { length: 'mm', force: 'kN', stress: 'MPa', angle: 'rad' },
  });
  doc.data.push({ path: '/project/site', type: 'Site', name: 'Site' });
  doc.data.push({ path: '/project/site/building', type: 'Building', name: 'Hoofdgebouw' });

  const storeyCount = elements.building?.stories ?? 1;
  for (let i = 0; i < storeyCount; i++) {
    doc.data.push({
      path: `/project/site/building/storey/${i}`,
      type: 'BuildingStorey',
      name: i === 0 ? 'Begane grond' : `${i + 1}e verdieping`,
      elevation: elements.building?.height_mm
        ? (i * elements.building.height_mm) / Math.max(storeyCount, 1)
        : i * 3000,
    });
  }

  if (elements.pile) {
    doc.data.push({
      path: '/project/site/foundation/pile/P1',
      type: 'Pile',
      name: 'Paal P1',
      predefinedType: 'COHESION_FRICTION',
      properties: {
        diameter_mm: elements.pile.diameter_mm,
        length_m: elements.pile.length_m,
      },
      verification: {
        standard: 'NEN 9997-1',
        Rcd_kN: elements.pile.Rcd_kN,
        NEd_kN: elements.pile.NEd_kN,
        unityCheck: elements.pile.unityCheck,
        result: typeof elements.pile.unityCheck === 'number'
          ? (elements.pile.unityCheck <= 1.0 ? 'PASS' : 'FAIL')
          : undefined,
      },
    });
  }

  if (elements.footing) {
    doc.data.push({
      path: '/project/site/foundation/footing/F1',
      type: 'Footing',
      name: 'Fundering F1',
      predefinedType: 'PAD_FOOTING',
      properties: {
        width_mm: elements.footing.width_mm,
        length_mm: elements.footing.length_mm,
        thickness_mm: elements.footing.thickness_mm,
        selfWeight_kN: elements.footing.selfWeight_kN,
      },
      verification: {
        standard: 'EN 1997',
        bearingPressure_kPa: elements.footing.bearingPressure_kPa,
      },
    });
  }

  if (elements.beam) {
    doc.data.push({
      path: '/project/site/building/storey/0/beam/B1',
      type: 'Beam',
      name: 'Balk B1',
      properties: {
        span_mm: elements.beam.span_mm,
        width_mm: elements.beam.width_mm,
        height_mm: elements.beam.height_mm,
      },
      verification: {
        standard: 'EN 1993 / EN 1995',
        MEd_kNm: elements.beam.MEd_kNm,
        unityCheck: elements.beam.unityCheck,
        result: typeof elements.beam.unityCheck === 'number'
          ? (elements.beam.unityCheck <= 1.0 ? 'PASS' : 'FAIL')
          : undefined,
      },
    });
  }

  return doc;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'berekening';
}

// ── STEP (IFC4x3 SPF) generation ──────────────────────────────────

/**
 * Generate an IFC4x3 STEP-SPF (`.ifc`) document from evaluated calc nodes.
 *
 * Mirrors `generateIfcx` — emits Project → Site → Building → Storey plus any
 * detected structural elements. Suitable for round-trip into an IFC viewer.
 */
export function generateIfc4x3Step(
  nodes: EvaluatedNode[],
  options: IfcGenerationOptions = {},
): string {
  const title = extractTitle(nodes);
  const projectName = options.projectName || title || 'Berekening';
  const bindings = collectBindings(nodes);
  const elements = detectElements(bindings);
  const ts = options.timestamp ?? new Date().toISOString().replace(/\.\d{3}Z$/, '');
  const author = options.author ?? 'OpenAEC Calc';
  const organization = options.organization ?? 'OpenAEC Foundation';
  const fileName = `${slug(projectName)}.ifc`;
  const guidProject = guid(1);
  const guidSite = guid(2);
  const guidBuilding = guid(3);
  const guidStoreyBase = (i: number) => guid(10 + i);

  const lines: string[] = [];
  lines.push('ISO-10303-21;');
  lines.push('HEADER;');
  lines.push(`FILE_DESCRIPTION(('ViewDefinition [DesignTransferView_V1.0]'),'2;1');`);
  lines.push(`FILE_NAME('${fileName}','${ts}',('${author}'),('${organization}'),'OpenAEC Calc','OpenAEC Calc STEP exporter','');`);
  lines.push(`FILE_SCHEMA(('IFC4X3_ADD2'));`);
  lines.push('ENDSEC;');
  lines.push('');
  lines.push('DATA;');
  lines.push(`#1=IFCPROJECT('${guidProject}',$,'${escapeStep(projectName)}',$,$,$,$,(#10),#20);`);
  lines.push(`#2=IFCSITE('${guidSite}',$,'Site',$,$,#30,$,$,.ELEMENT.,$,$,$,$,$);`);
  lines.push(`#3=IFCBUILDING('${guidBuilding}',$,'Hoofdgebouw',$,$,#31,$,$,.ELEMENT.,$,$,$);`);

  const storeyCount = elements.building?.stories ?? 1;
  for (let i = 0; i < storeyCount; i++) {
    const elev = elements.building?.height_mm
      ? (i * elements.building.height_mm) / Math.max(storeyCount, 1) / 1000
      : i * 3.0;
    lines.push(`#${4 + i}=IFCBUILDINGSTOREY('${guidStoreyBase(i)}',$,'${i === 0 ? 'Begane grond' : `${i + 1}e verdieping`}',$,$,#${32 + i},$,$,.ELEMENT.,${elev.toFixed(3)});`);
  }

  lines.push(`#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-05,#11,$);`);
  lines.push(`#11=IFCAXIS2PLACEMENT3D(#12,$,$);`);
  lines.push(`#12=IFCCARTESIANPOINT((0.,0.,0.));`);
  lines.push(`#20=IFCUNITASSIGNMENT((#21,#22,#23));`);
  lines.push(`#21=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);`);
  lines.push(`#22=IFCSIUNIT(*,.FORCEUNIT.,.KILO.,.NEWTON.);`);
  lines.push(`#23=IFCSIUNIT(*,.PRESSUREUNIT.,.MEGA.,.PASCAL.);`);

  lines.push(`#30=IFCLOCALPLACEMENT($,#11);`);
  lines.push(`#31=IFCLOCALPLACEMENT(#30,#11);`);
  for (let i = 0; i < storeyCount; i++) {
    lines.push(`#${32 + i}=IFCLOCALPLACEMENT(#31,#11);`);
  }

  let nextId = 100;
  if (elements.pile) {
    const pileGuid = guid(40);
    lines.push('');
    lines.push('/* Funderingspaal — toegevoegd door OpenAEC Calc na paaldraagvermogen toetsing */');
    lines.push(`#${nextId}=IFCPILE('${pileGuid}',$,'Paal P1','D=${Math.round(elements.pile.diameter_mm)} mm, L=${elements.pile.length_m.toFixed(2)} m','NEN 9997-1',$,$,'P1',.COHESION_FRICTION.,$,$);`);
    nextId += 1;
  }
  if (elements.footing) {
    const fGuid = guid(50);
    lines.push('');
    lines.push('/* Fundering — toegevoegd door OpenAEC Calc na funderingsberekening */');
    lines.push(`#${nextId}=IFCFOOTING('${fGuid}',$,'Fundering F1','b=${Math.round(elements.footing.width_mm)} mm, l=${Math.round(elements.footing.length_mm)} mm','EN 1997',$,$,'F1',.PAD_FOOTING.);`);
    nextId += 1;
  }
  if (elements.beam) {
    const bGuid = guid(60);
    lines.push('');
    lines.push('/* Balk — toegevoegd door OpenAEC Calc na buigingsberekening */');
    lines.push(`#${nextId}=IFCBEAM('${bGuid}',$,'Balk B1','b=${elements.beam.width_mm ?? '?'} mm, h=${elements.beam.height_mm ?? '?'} mm','EN 1993/1995',$,$,'B1',.BEAM.);`);
    nextId += 1;
  }

  lines.push('');
  lines.push('ENDSEC;');
  lines.push('END-ISO-10303-21;');
  return lines.join('\n') + '\n';
}

/** Stable pseudo-GUID for deterministic IFC output. */
function guid(seed: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_$';
  let r = seed * 2654435761;
  let out = '';
  for (let i = 0; i < 22; i++) {
    r = (r * 1664525 + 1013904223) | 0;
    out += chars[Math.abs(r) % chars.length];
  }
  return out;
}

function escapeStep(s: string): string {
  return s.replace(/'/g, "''");
}
