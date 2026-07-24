import { evaluate, parse, type EvaluatedNode } from "@ifc-calc/core";
import type {
  CptCalibration,
  DigitizedCptPoint,
  PileResistanceResult,
  PositiveShaftLayer,
  VibroPileInput,
} from "./types";
import { clipPositiveShaftLayers } from "./geotechnical";

export interface VibroSheetModel {
  sourceFileName: string;
  calibration: CptCalibration;
  points: DigitizedCptPoint[];
  input: VibroPileInput;
  results: PileResistanceResult[];
}

const REQUIRED_LEVELS_NAP_M = [
  -18.5,
  -19,
  -19.5,
  -20,
  -20.5,
  -21,
  -21.5,
  -22,
] as const;
const LEVEL_TOLERANCE_M = 1e-9;

export function generateVibroPileSheet(model: VibroSheetModel): string {
  validateModel(model);

  const points = [...model.points].sort(
    (first, second) => first.depthNapM - second.depthNapM,
  );
  const sourceFileName = model.sourceFileName.replace(/\s+/g, " ").trim();
  const lines = [
    "# VIBRO-paaldraagvermogen",
    "",
    "Zelfstandige, auditbare berekening vanuit qc_data en expliciete invoer.",
    `Bronbestand: ${sourceFileName}`,
    `Bronpagina: ${model.calibration.pageIndex + 1}`,
    "",
    "## Kalibratie",
    "",
    ...calibrationAssignments(model.calibration),
    "",
    "## Meetpuntendata",
    "",
    "Kolommen: diepte [m NAP], qc [MPa], betrouwbaarheid [-].",
    `qc_data = ${matrix(points.map((point) => [
      point.depthNapM,
      point.qcMpa,
      point.confidence,
    ]))}`,
    `n_qc_meetpunten = ${points.length}`,
    "",
    "Lineaire interpolatie leest bij iedere evaluatie rechtstreeks uit qc_data.",
    ...qcInterpolationFunctions(),
    "",
    "## Paal- en rekeninvoer",
    "",
    ...inputAssignments(model.input),
    "",
    "## Grondlagen en negatieve kleef",
    "",
    ...negativeSkinAssignments(model.input),
    "",
    "## Positieve-schachtlagen",
    "",
    ...positiveShaftAssignments(model.input),
    "",
    "## Resultaten en auditformules",
    "",
    ...model.results.flatMap((result, index) =>
      resultFormulaBlock(result.pileTipNapM, index + 1, model.input)),
    "",
    "## Resultatentabel",
    "",
    renderResultTable(),
    "",
    "## qc-curve en rekentrajecten",
    "",
    ...svgAssignments(points.length),
    renderCurveSvg(points.length),
    "",
    "De zichtbare tabel en SVG gebruiken dezelfde geëvalueerde variabelen als",
    "de formuleblokken. Alleen qc_data, kalibratie en invoer zijn vaste brondata.",
    "",
  ];

  const source = lines.join("\n");
  assertSheetMatchesResults(source, model.results);
  return source;
}

function assertSheetMatchesResults(
  source: string,
  results: PileResistanceResult[],
): void {
  const evaluated = evaluate(parse(source));
  const expectedValues = results.flatMap((result, index) => {
    const suffix = index + 1;
    return [
      [`qc_I_gem_${suffix}`, result.qcIAvgMpa],
      [`qc_II_gem_${suffix}`, result.qcIIAvgMpa],
      [`qc_III_gem_${suffix}`, result.qcIIIAvgMpa],
      [`qc_z_a_gem_${suffix}`, result.qcShaftAvgMpa],
      [`R_b_cal_${suffix}`, result.rbCalKn],
      [`R_s_cal_${suffix}`, result.rsCalKn],
      [`R_c_d_${suffix}`, result.rcDesignKn],
      [`F_nk_d_${suffix}`, result.negativeSkinDesignKn],
      [`R_c_net_d_${suffix}`, result.rcNetDesignKn],
      [`unity_check_${suffix}`, result.unityCheck],
    ] as Array<[string, number]>;
  });

  for (const [name, expected] of expectedValues) {
    const assignment = findEvaluatedAssignment(evaluated, name);
    if (assignment === undefined || assignment.result.startsWith("Error:")) {
      throw new RangeError(
        `Sheetafwijking: ${name} kon niet eindig worden geëvalueerd`,
      );
    }
    const actual = Number(assignment.result);
    const tolerance = Math.max(1e-3, Math.abs(expected) * 5e-4);
    if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) {
      throw new RangeError(
        `Sheetafwijking bij ${name}: sheet ${assignment.result}, rekenkern ${number(expected)}`,
      );
    }
  }
}

function findEvaluatedAssignment(
  nodes: EvaluatedNode[],
  name: string,
): Extract<EvaluatedNode, { type: "assignment" }> | undefined {
  for (const node of nodes) {
    if (node.type === "assignment" && node.name === name) return node;
    if (node.type === "conditional-branch") {
      const nested = findEvaluatedAssignment(node.children, name);
      if (nested !== undefined) return nested;
    }
  }
  return undefined;
}

function calibrationAssignments(calibration: CptCalibration): string[] {
  return [
    `page_index_zero_based = ${number(calibration.pageIndex)}`,
    `plot_left_px = ${number(calibration.plotBoundsPx.left)}`,
    `plot_top_px = ${number(calibration.plotBoundsPx.top)}`,
    `plot_right_px = ${number(calibration.plotBoundsPx.right)}`,
    `plot_bottom_px = ${number(calibration.plotBoundsPx.bottom)}`,
    `qc_min_MPa = ${number(calibration.qcMinMpa)}`,
    `qc_max_MPa = ${number(calibration.qcMaxMpa)}`,
    `depth_top_NAP_m = ${number(calibration.depthTopNapM)}`,
    `depth_bottom_NAP_m = ${number(calibration.depthBottomNapM)}`,
  ];
}

function inputAssignments(input: VibroPileInput): string[] {
  return [
    `d_s_mm = ${number(input.shaftDiameterMm)}`,
    `d_b_mm = ${number(input.baseDiameterMm)}`,
    `pile_head_NAP_m = ${number(input.pileHeadNapM)}`,
    `pile_tip_reference_NAP_m = ${number(input.pileTipNapM)}`,
    `positive_shaft_start_NAP_m = ${number(input.positiveShaftStartNapM)}`,
    `alpha_p = ${number(input.alphaP)}`,
    `alpha_s = ${number(input.alphaS)}`,
    `beta = ${number(input.beta)}`,
    `shape_factor = ${number(input.shapeFactor)}`,
    `xi_single_CPT = ${number(input.xiSingleCpt)}`,
    `gamma_b = ${number(input.gammaB)}`,
    `gamma_s = ${number(input.gammaS)}`,
    `F_design_kN = ${number(input.designLoadKn)}`,
    "d_s_m = d_s_mm / 1000",
    "d_b_m = d_b_mm / 1000",
    "A_b_m2 = pi * d_b_m^2 / 4",
    "u_s_m = pi * d_s_m",
  ];
}

function negativeSkinAssignments(input: VibroPileInput): string[] {
  const rows = input.negativeSkinLayers.map((layer) => [
    layer.topNapM,
    layer.bottomNapM,
    layer.effectiveStressTopKpa,
    layer.effectiveStressBottomKpa,
    layer.k0,
    layer.tanDelta,
    layer.gamma,
  ]);
  const assignments = [
    "Kolommen: bovenkant, onderkant [m NAP], effectieve spanning boven/onder [kPa], k0, tan(delta), gamma.",
    `negatieve_kleeflaag_data = ${matrix(rows)}`,
    `n_negatieve_kleeflagen = ${rows.length}`,
  ];

  if (rows.length === 0) {
    assignments.push("F_nk_d_basis = 0");
    return assignments;
  }

  input.negativeSkinLayers.forEach((layer, index) => {
    const suffix = index + 1;
    assignments.push(
      `neg_top_${suffix} = ${number(layer.topNapM)}`,
      `neg_bottom_${suffix} = ${number(layer.bottomNapM)}`,
      `sigma_eff_top_${suffix} = ${number(layer.effectiveStressTopKpa)}`,
      `sigma_eff_bottom_${suffix} = ${number(layer.effectiveStressBottomKpa)}`,
      `k0_${suffix} = ${number(layer.k0)}`,
      `tan_delta_${suffix} = ${number(layer.tanDelta)}`,
      `gamma_nk_${suffix} = ${number(layer.gamma)}`,
      `neg_h_${suffix} = neg_top_${suffix} - neg_bottom_${suffix}`,
      `sigma_eff_gem_${suffix} = (sigma_eff_top_${suffix} + sigma_eff_bottom_${suffix}) / 2`,
      `F_nk_k_layer_${suffix} = u_s_m * neg_h_${suffix} * sigma_eff_gem_${suffix} * k0_${suffix} * tan_delta_${suffix}`,
      `F_nk_d_layer_${suffix} = F_nk_k_layer_${suffix} * gamma_nk_${suffix}`,
    );
  });
  assignments.push(
    `F_nk_d_basis = ${input.negativeSkinLayers
      .map((_, index) => `F_nk_d_layer_${index + 1}`)
      .join(" + ")}`,
  );
  return assignments;
}

function positiveShaftAssignments(input: VibroPileInput): string[] {
  const rows = input.positiveShaftLayers.map((layer) => [
    layer.bottomNapM,
    layer.topNapM,
  ]);
  const assignments = [
    "Kolommen: onderkant en bovenkant [m NAP].",
    `positieve_schachtlaag_data = ${matrix(rows)}`,
    `n_positieve_schachtlagen = ${rows.length}`,
  ];
  input.positiveShaftLayers.forEach((layer, index) => {
    const suffix = index + 1;
    assignments.push(
      `shaft_bottom_${suffix} = ${number(layer.bottomNapM)}`,
      `shaft_top_${suffix} = ${number(layer.topNapM)}`,
    );
  });
  return assignments;
}

function qcInterpolationFunctions(): string[] {
  return [
    "qc_at(z) = interpolate_linear(qc_data, z, 1, 2)",
  ];
}

function resultFormulaBlock(
  pileTipNapM: number,
  suffix: number,
  input: VibroPileInput,
): string[] {
  const tip = `pile_tip_${suffix}_NAP_m`;
  const critical = criticalDepthBlock(suffix, tip);
  const qcII = minimumRouteBlock(
    `qc_II_${suffix}`,
    `${tip} - critical_depth_${suffix}_m`,
    tip,
    `qc_at(${tip} - critical_depth_${suffix}_m)`,
  );
  const qcIII = minimumRouteBlock(
    `qc_III_${suffix}`,
    tip,
    `${tip} + trajectory_III_length_${suffix}_m`,
    `qc_II_${suffix}_running_min`,
  );
  const shaft = shaftQcBlock(
    suffix,
    clipPositiveShaftLayers(
      input.positiveShaftLayers,
      pileTipNapM,
      input.positiveShaftStartNapM,
    ),
  );

  return [
    `### Paalpunt NAP ${number(pileTipNapM, 2)} m`,
    "",
    `${tip} = ${number(pileTipNapM)}`,
    `critical_depth_min_${suffix}_m = 0.7 * d_b_m`,
    `critical_depth_max_${suffix}_m = 4 * d_b_m`,
    `trajectory_III_length_${suffix}_m = 8 * d_b_m`,
    "#hide",
    ...critical,
    ...qcII,
    ...qcIII,
    ...shaft,
    "#show",
    `qc_I_gem_${suffix} = qc_I_integral_${suffix} / critical_depth_${suffix}_m`,
    `qc_II_gem_${suffix} = qc_II_${suffix}_integral / critical_depth_${suffix}_m`,
    `qc_III_gem_${suffix} = qc_III_${suffix}_integral / trajectory_III_length_${suffix}_m`,
    `qc_z_a_gem_${suffix} = qc_z_a_integral_${suffix} / qc_z_a_length_${suffix}_m`,
    `q_b_raw_${suffix} = 0.5 * alpha_p * beta * shape_factor * (((qc_I_gem_${suffix} + qc_II_gem_${suffix}) / 2) + qc_III_gem_${suffix})`,
    `q_b_max_${suffix} = min(q_b_raw_${suffix}, 15)`,
    `R_b_cal_${suffix} = A_b_m2 * q_b_max_${suffix} * 1000`,
    `R_s_cal_${suffix} = u_s_m * alpha_s * qc_z_a_integral_${suffix} * 1000`,
    `R_c_cal_${suffix} = R_b_cal_${suffix} + R_s_cal_${suffix}`,
    `R_c_k_${suffix} = R_c_cal_${suffix} / xi_single_CPT`,
    `R_c_d_${suffix} = R_b_cal_${suffix} / xi_single_CPT / gamma_b + R_s_cal_${suffix} / xi_single_CPT / gamma_s`,
    `F_nk_d_${suffix} = F_nk_d_basis`,
    `R_c_net_d_${suffix} = R_c_d_${suffix} - F_nk_d_${suffix}`,
    `unity_check_${suffix} = F_design_kN / R_c_net_d_${suffix}`,
    "",
  ];
}

function criticalDepthBlock(suffix: number, tip: string): string[] {
  return [
    `critical_depth_${suffix}_m = linear_average_min_depth(qc_data, ${tip}, critical_depth_min_${suffix}_m, critical_depth_max_${suffix}_m, 1, 2)`,
    ...trapezoidIntegralBlock(
      `qc_I_integral_${suffix}`,
      `${tip} - critical_depth_${suffix}_m`,
      tip,
    ),
    `qc_I_bottom_${suffix}_NAP_m = ${tip} - critical_depth_${suffix}_m`,
  ];
}

function trapezoidIntegralBlock(
  resultName: string,
  lowerExpression: string,
  upperExpression: string,
): string[] {
  return [
    `${resultName} = integrate_linear(qc_data, ${lowerExpression}, ${upperExpression}, 1, 2)`,
  ];
}

function minimumRouteBlock(
  prefix: string,
  lowerExpression: string,
  upperExpression: string,
  initialMinimumExpression: string,
): string[] {
  return [
    `${prefix}_integral = 0`,
    `${prefix}_running_min = ${initialMinimumExpression}`,
    `${prefix}_start_row = lookup_row_le(qc_data, ${lowerExpression}, 1)`,
    `${prefix}_end_row = lookup_row_ge(qc_data, ${upperExpression}, 1)`,
    `#repeat ${prefix}_end_row - ${prefix}_start_row`,
    `${prefix}_row = ${prefix}_start_row + _i - 1`,
    `${prefix}_lo = max(${lowerExpression}, get(${prefix}_row, 1, qc_data))`,
    `${prefix}_hi = min(${upperExpression}, get(${prefix}_row + 1, 1, qc_data))`,
    `${prefix}_h = max(${prefix}_hi - ${prefix}_lo, 0)`,
    `#if ${prefix}_h > 0`,
    `${prefix}_q_lo = qc_at(${prefix}_lo)`,
    `${prefix}_q_hi = qc_at(${prefix}_hi)`,
    `#if ${prefix}_q_hi >= ${prefix}_q_lo`,
    `${prefix}_segment_integral = ${prefix}_running_min * ${prefix}_h`,
    `#else if ${prefix}_running_min <= ${prefix}_q_hi`,
    `${prefix}_segment_integral = ${prefix}_running_min * ${prefix}_h`,
    `#else if ${prefix}_running_min >= ${prefix}_q_lo`,
    `${prefix}_segment_integral = (${prefix}_q_lo + ${prefix}_q_hi) * ${prefix}_h / 2`,
    "#else",
    `${prefix}_crossing = ${prefix}_lo + ${prefix}_h * (${prefix}_q_lo - ${prefix}_running_min) / (${prefix}_q_lo - ${prefix}_q_hi)`,
    `${prefix}_segment_integral = ${prefix}_running_min * (${prefix}_crossing - ${prefix}_lo) + (${prefix}_running_min + ${prefix}_q_hi) * (${prefix}_hi - ${prefix}_crossing) / 2`,
    "#end if",
    `${prefix}_integral = ${prefix}_integral + ${prefix}_segment_integral`,
    `${prefix}_running_min = min(${prefix}_running_min, ${prefix}_q_hi)`,
    "#end if",
    "#end repeat",
  ];
}

function shaftQcBlock(
  suffix: number,
  layers: PositiveShaftLayer[],
): string[] {
  const lines = [
    `qc_z_a_integral_${suffix} = 0`,
    `qc_z_a_length_${suffix}_m = 0`,
  ];

  layers.forEach((activeLayer, layerIndex) => {
    const layer = layerIndex + 1;
    const prefix = `qc_z_a_${suffix}_layer_${layer}`;
    lines.push(
      `${prefix}_lo = ${number(activeLayer.bottomNapM)}`,
      `${prefix}_hi = ${number(activeLayer.topNapM)}`,
      `${prefix}_h = ${prefix}_hi - ${prefix}_lo`,
      `${prefix}_raw_min = min(qc_at(${prefix}_lo), qc_at(${prefix}_hi))`,
      `${prefix}_has_peak = 0`,
      `#if max(qc_at(${prefix}_lo), qc_at(${prefix}_hi)) > 12`,
      `${prefix}_has_peak = 1`,
      "#end if",
      `${prefix}_start_row = lookup_row_le(qc_data, ${prefix}_lo, 1)`,
      `${prefix}_end_row = lookup_row_ge(qc_data, ${prefix}_hi, 1)`,
      `#repeat ${prefix}_end_row - ${prefix}_start_row + 1`,
      `${prefix}_point_row = ${prefix}_start_row + _i - 1`,
      `${prefix}_point_depth = get(${prefix}_point_row, 1, qc_data)`,
      `#if ${prefix}_point_depth >= ${prefix}_lo`,
      `#if ${prefix}_point_depth <= ${prefix}_hi`,
      `${prefix}_point_qc = get(${prefix}_point_row, 2, qc_data)`,
      `${prefix}_raw_min = min(${prefix}_raw_min, ${prefix}_point_qc)`,
      `#if ${prefix}_point_qc > 12`,
      `${prefix}_has_peak = 1`,
      "#end if",
      "#end if",
      "#end if",
      "#end repeat",
      `${prefix}_cutoff = 1000000`,
      `#if ${prefix}_has_peak > 0`,
      `#if ${prefix}_h < 1`,
      `${prefix}_cutoff = 12`,
      "#else",
      `${prefix}_cutoff = min(${prefix}_raw_min, 15)`,
      "#end if",
      "#end if",
      `${prefix}_integral = integrate_linear_limited(qc_data, ${prefix}_lo, ${prefix}_hi, ${prefix}_cutoff, 1, 2)`,
      `qc_z_a_integral_${suffix} = qc_z_a_integral_${suffix} + ${prefix}_integral`,
      `qc_z_a_length_${suffix}_m = qc_z_a_length_${suffix}_m + ${prefix}_h`,
    );
  });
  return lines;
}

function renderResultTable(): string {
  const headers = [
    "Paalpunt [m NAP]",
    "qc;I",
    "qc;II",
    "qc;III",
    "qc;z;a",
    "Rb;cal",
    "Rs;cal",
    "Rc;d",
    "Fnk;d",
    "Rc;net;d",
    "Unity check",
  ];
  const head = headers.map((header) => `<th>${header}</th>`).join("");
  const rows = REQUIRED_LEVELS_NAP_M.map((_, index) => {
    const suffix = index + 1;
    const variables = [
      `pile_tip_${suffix}_NAP_m`,
      `qc_I_gem_${suffix}`,
      `qc_II_gem_${suffix}`,
      `qc_III_gem_${suffix}`,
      `qc_z_a_gem_${suffix}`,
      `R_b_cal_${suffix}`,
      `R_s_cal_${suffix}`,
      `R_c_d_${suffix}`,
      `F_nk_d_${suffix}`,
      `R_c_net_d_${suffix}`,
      `unity_check_${suffix}`,
    ];
    return `<tr>${variables.map((variable) =>
      `<td>'${variable}'</td>`).join("")}</tr>`;
  }).join("");
  return `'<table class="vibro-result-table"><caption>qc in MPa, weerstanden in kN en unity check dimensieloos</caption><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

function svgAssignments(pointCount: number): string[] {
  const lines: string[] = [];
  for (let row = 1; row <= pointCount; row += 1) {
    lines.push(
      `svg_qc_x_${row} = 76 + (get(${row}, 2, qc_data) - qc_min_MPa) / (qc_max_MPa - qc_min_MPa) * 536`,
      `svg_depth_y_${row} = 28 + (depth_top_NAP_m - get(${row}, 1, qc_data)) / (depth_top_NAP_m - depth_bottom_NAP_m) * 450`,
    );
  }
  lines.push(
    "svg_qc_I_top_y = 28 + (depth_top_NAP_m - pile_tip_1_NAP_m) / (depth_top_NAP_m - depth_bottom_NAP_m) * 450",
    "svg_qc_I_bottom_y = 28 + (depth_top_NAP_m - qc_I_bottom_1_NAP_m) / (depth_top_NAP_m - depth_bottom_NAP_m) * 450",
    "svg_qc_III_top_y = 28 + (depth_top_NAP_m - (pile_tip_1_NAP_m + trajectory_III_length_1_m)) / (depth_top_NAP_m - depth_bottom_NAP_m) * 450",
    "svg_shaft_top_y = 28 + (depth_top_NAP_m - positive_shaft_start_NAP_m) / (depth_top_NAP_m - depth_bottom_NAP_m) * 450",
  );
  return lines;
}

function renderCurveSvg(pointCount: number): string {
  const curvePoints = Array.from(
    { length: pointCount },
    (_, index) => `{{svg_qc_x_${index + 1}}},{{svg_depth_y_${index + 1}}}`,
  ).reverse().join(" ");
  return [
    "@svg",
    '<svg viewBox="0 0 640 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="qc-curve met rekentrajecten">',
    '<rect x="76" y="28" width="536" height="450" fill="#f8fafc" stroke="#94a3b8"/>',
    '<line data-traject="qc-I" x1="80" x2="80" y1="{{svg_qc_I_top_y}}" y2="{{svg_qc_I_bottom_y}}" stroke="#2563eb" stroke-width="8"/>',
    '<line data-traject="qc-II" x1="92" x2="92" y1="{{svg_qc_I_top_y}}" y2="{{svg_qc_I_bottom_y}}" stroke="#7c3aed" stroke-width="8"/>',
    '<line data-traject="qc-III" x1="104" x2="104" y1="{{svg_qc_I_top_y}}" y2="{{svg_qc_III_top_y}}" stroke="#ea580c" stroke-width="8"/>',
    '<line data-traject="qc-z-a" x1="116" x2="116" y1="{{svg_qc_I_top_y}}" y2="{{svg_shaft_top_y}}" stroke="#16a34a" stroke-width="8"/>',
    `<polyline data-curve="qc" points="${curvePoints}" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round"/>`,
    '<text x="76" y="508" fill="#334155">qc [MPa]</text>',
    '<text x="12" y="40" fill="#334155">NAP [m]</text>',
    "</svg>",
    "@end",
  ].join("\n");
}

function validateModel(model: VibroSheetModel): void {
  if (model.sourceFileName.trim() === "") {
    throw new RangeError("Een bronbestandsnaam is vereist");
  }
  const numericValues: number[] = [];
  collectFiniteNumbers(model.calibration, numericValues);
  collectFiniteNumbers(model.points, numericValues);
  collectFiniteNumbers(model.input, numericValues);
  collectFiniteNumbers(model.results, numericValues);
  if (!numericValues.every(Number.isFinite)) {
    throw new RangeError("Het sheetmodel mag uitsluitend eindige getallen bevatten");
  }
  if (model.points.length < 2) {
    throw new RangeError("Minimaal twee meetpunten zijn vereist");
  }
  if (model.results.length !== REQUIRED_LEVELS_NAP_M.length) {
    throw new RangeError(
      `Precies ${REQUIRED_LEVELS_NAP_M.length} paalpuntresultaten zijn vereist`,
    );
  }
  const levelsAreExact = model.results.every((result, index) =>
    Math.abs(result.pileTipNapM - REQUIRED_LEVELS_NAP_M[index])
      <= LEVEL_TOLERANCE_M);
  if (!levelsAreExact) {
    throw new RangeError(
      "De paalpunt-niveaureeks moet exact NAP -18,5 tot en met -22,0 m in stappen van 0,5 m zijn",
    );
  }
  if (
    model.calibration.qcMaxMpa <= model.calibration.qcMinMpa
    || model.calibration.depthTopNapM <= model.calibration.depthBottomNapM
  ) {
    throw new RangeError("De kalibratie moet positieve qc- en dieptebereiken hebben");
  }
  const sortedDepths = model.points
    .map((point) => point.depthNapM)
    .sort((first, second) => first - second);
  if (sortedDepths.some(
    (depth, index) =>
      index > 0 && depth - sortedDepths[index - 1] <= LEVEL_TOLERANCE_M,
  )) {
    throw new RangeError("Meetpuntdieptes moeten strikt oplopend en uniek zijn");
  }
  if (model.input.positiveShaftLayers.length === 0) {
    throw new RangeError("Minimaal één positieve-schachtlaag is vereist");
  }
}

function collectFiniteNumbers(value: unknown, target: number[]): void {
  if (typeof value === "number") {
    target.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectFiniteNumbers(item, target));
    return;
  }
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach((item) => collectFiniteNumbers(item, target));
  }
}

function matrix(rows: Array<Array<number>>): string {
  if (rows.length === 0) return "[]";
  return `[${rows.map((row) =>
    `[${row.map((value) => number(value)).join(", ")}]`).join(", ")}]`;
}

function number(value: number, precision = 12): string {
  const normalized = Object.is(value, -0) ? 0 : value;
  return normalized.toFixed(precision).replace(/\.?0+$/, "");
}
