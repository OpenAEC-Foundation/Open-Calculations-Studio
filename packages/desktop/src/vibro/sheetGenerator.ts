import type {
  CptCalibration,
  DigitizedCptPoint,
  PileResistanceResult,
  VibroPileInput,
} from "./types";

export interface VibroSheetModel {
  sourceFileName: string;
  calibration: CptCalibration;
  points: DigitizedCptPoint[];
  input: VibroPileInput;
  results: PileResistanceResult[];
}

const RESULT_COUNT = 8;

export function generateVibroPileSheet(model: VibroSheetModel): string {
  validateModel(model);

  const sourceFileName = model.sourceFileName.replace(/\s+/g, " ").trim();
  const lines = [
    "# VIBRO-paaldraagvermogen",
    "",
    "Zelfstandige, auditbare berekening op basis van een gedigitaliseerde qc-curve.",
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
    `qc_data = ${matrix(model.points.map((point) => [
      point.depthNapM,
      point.qcMpa,
      point.confidence,
    ]))}`,
    `n_qc_meetpunten = ${model.points.length}`,
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
    "## qc-curve en rekentrajecten",
    "",
    renderCurveSvg(model),
    "",
    "## Resultaten en audit",
    "",
    renderResultTable(model.results),
    "",
    ...model.results.flatMap((result, index) =>
      resultBlock(result, index + 1)),
    "",
    "## Auditgegevens per traject",
    "",
    ...model.results.flatMap((result, index) =>
      routeAudit(result, index + 1)),
    "",
    "De berekening bevat de oorspronkelijke invoer, meetpunten, trajecten,",
    "tussenwaarden en vergelijkingswaarden uit de ontwerper.",
    "",
  ];

  return lines.join("\n");
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

  if (input.negativeSkinLayers.length === 0) {
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
      `shaft_h_${suffix} = shaft_top_${suffix} - shaft_bottom_${suffix}`,
    );
  });
  return assignments;
}

function resultBlock(
  result: PileResistanceResult,
  suffix: number,
): string[] {
  return [
    `### Paalpunt NAP ${number(result.pileTipNapM, 2)} m`,
    "",
    `pile_tip_${suffix}_NAP_m = ${number(result.pileTipNapM)}`,
    `critical_depth_${suffix}_m = ${number(result.criticalDepthM)}`,
    `qc_I_bottom_${suffix}_NAP_m = ${number(result.qcIBottomNapM)}`,
    `positive_shaft_length_${suffix}_m = positive_shaft_start_NAP_m - pile_tip_${suffix}_NAP_m`,
    `trajectory_III_length_${suffix}_m = 8 * d_b_m`,
    `qc_I_integral_${suffix} = ${number(result.qcIAvgMpa * result.criticalDepthM)}`,
    `qc_I_gem_${suffix} = qc_I_integral_${suffix} / critical_depth_${suffix}_m`,
    `qc_II_integral_${suffix} = ${trapezoidExpression(result.qcIIRoute)}`,
    `qc_II_gem_${suffix} = qc_II_integral_${suffix} / critical_depth_${suffix}_m`,
    `qc_III_integral_${suffix} = ${trapezoidExpression(result.qcIIIRoute)}`,
    `qc_III_gem_${suffix} = qc_III_integral_${suffix} / trajectory_III_length_${suffix}_m`,
    `qc_z_a_integral_${suffix} = ${shaftIntegralExpression(result)}`,
    `qc_z_a_gem_${suffix} = qc_z_a_integral_${suffix} / positive_shaft_length_${suffix}_m`,
    `q_b_raw_${suffix} = 0.5 * alpha_p * beta * shape_factor * (((qc_I_gem_${suffix} + qc_II_gem_${suffix}) / 2) + qc_III_gem_${suffix})`,
    `q_b_max_${suffix} = min(q_b_raw_${suffix}, 15)`,
    `R_b_cal_${suffix} = A_b_m2 * q_b_max_${suffix} * 1000`,
    `R_s_cal_${suffix} = u_s_m * positive_shaft_length_${suffix}_m * alpha_s * qc_z_a_gem_${suffix} * 1000`,
    `R_c_cal_${suffix} = R_b_cal_${suffix} + R_s_cal_${suffix}`,
    `R_c_k_${suffix} = R_c_cal_${suffix} / xi_single_CPT`,
    `R_c_d_${suffix} = R_b_cal_${suffix} / xi_single_CPT / gamma_b + R_s_cal_${suffix} / xi_single_CPT / gamma_s`,
    `F_nk_d_${suffix} = F_nk_d_basis`,
    `R_c_net_d_${suffix} = R_c_d_${suffix} - F_nk_d_${suffix}`,
    `unity_check_${suffix} = F_design_kN / R_c_net_d_${suffix}`,
    `qc_I_gem_audit_${suffix} = ${number(result.qcIAvgMpa)}`,
    `qc_II_gem_audit_${suffix} = ${number(result.qcIIAvgMpa)}`,
    `qc_III_gem_audit_${suffix} = ${number(result.qcIIIAvgMpa)}`,
    `qc_z_a_gem_audit_${suffix} = ${number(result.qcShaftAvgMpa)}`,
    `q_b_raw_audit_${suffix} = ${number(result.qbRawMpa)}`,
    `q_b_max_audit_${suffix} = ${number(result.qbMaxMpa)}`,
    `R_b_cal_audit_${suffix} = ${number(result.rbCalKn)}`,
    `R_s_cal_audit_${suffix} = ${number(result.rsCalKn)}`,
    `R_c_cal_audit_${suffix} = ${number(result.rcCalKn)}`,
    `R_c_k_audit_${suffix} = ${number(result.rcCharacteristicKn)}`,
    `R_c_d_audit_${suffix} = ${number(result.rcDesignKn)}`,
    `F_nk_d_audit_${suffix} = ${number(result.negativeSkinDesignKn)}`,
    `R_c_net_d_audit_${suffix} = ${number(result.rcNetDesignKn)}`,
    `unity_check_audit_${suffix} = ${number(result.unityCheck)}`,
    `delta_qc_I_gem_${suffix} = qc_I_gem_${suffix} - qc_I_gem_audit_${suffix}`,
    `delta_qc_II_gem_${suffix} = qc_II_gem_${suffix} - qc_II_gem_audit_${suffix}`,
    `delta_qc_III_gem_${suffix} = qc_III_gem_${suffix} - qc_III_gem_audit_${suffix}`,
    `delta_qc_z_a_gem_${suffix} = qc_z_a_gem_${suffix} - qc_z_a_gem_audit_${suffix}`,
    `delta_R_c_net_d_${suffix} = R_c_net_d_${suffix} - R_c_net_d_audit_${suffix}`,
    `delta_unity_check_${suffix} = unity_check_${suffix} - unity_check_audit_${suffix}`,
    "",
  ];
}

function renderResultTable(results: PileResistanceResult[]): string {
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
  const body = results.map((result) => {
    const values = [
      number(result.pileTipNapM, 3),
      number(result.qcIAvgMpa, 3),
      number(result.qcIIAvgMpa, 3),
      number(result.qcIIIAvgMpa, 3),
      number(result.qcShaftAvgMpa, 3),
      number(result.rbCalKn, 1),
      number(result.rsCalKn, 1),
      number(result.rcDesignKn, 1),
      number(result.negativeSkinDesignKn, 1),
      number(result.rcNetDesignKn, 1),
      number(result.unityCheck, 3),
    ];
    return `<tr>${values.map((value) => `<td>${value}</td>`).join("")}</tr>`;
  }).join("");
  return `'<table class="vibro-result-table"><caption>qc in MPa, weerstanden in kN en unity check dimensieloos</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function trapezoidExpression(
  route: PileResistanceResult["qcIIRoute"],
): string {
  const sorted = [...route].sort(
    (first, second) => first.depthNapM - second.depthNapM,
  );
  if (sorted.length < 2) return "0";
  return sorted.slice(1).map((point, index) => {
    const previous = sorted[index]!;
    return `((${number(previous.qcMpa)} + ${number(point.qcMpa)}) / 2) * (${number(point.depthNapM)} - ${number(previous.depthNapM)})`;
  }).join(" + ");
}

function shaftIntegralExpression(result: PileResistanceResult): string {
  if (result.qcShaftLayers.length === 0) return "0";
  return result.qcShaftLayers.map((layer) =>
    `${number(layer.thicknessM)} * ${number(layer.limitedAverageMpa)}`)
    .join(" + ");
}

function routeAudit(
  result: PileResistanceResult,
  suffix: number,
): string[] {
  const lines = [
    `### Audit traject ${suffix}`,
    "",
    "Kolommen traject II en III: diepte [m NAP], begrensde qc [MPa].",
    `qc_II_route_${suffix} = ${matrix(result.qcIIRoute.map((point) => [
      point.depthNapM,
      point.qcMpa,
    ]))}`,
    `qc_III_route_${suffix} = ${matrix(result.qcIIIRoute.map((point) => [
      point.depthNapM,
      point.qcMpa,
    ]))}`,
    "Kolommen schachtaudit: onderkant, bovenkant [m NAP], dikte [m], ruwe minimum-qc, afsnijwaarde en begrensd gemiddelde [MPa].",
    `qc_z_a_layers_${suffix} = ${matrix(result.qcShaftLayers.map((layer) => [
      layer.bottomNapM,
      layer.topNapM,
      layer.thicknessM,
      layer.rawMinimumMpa,
      layer.cutoffMpa ?? 0,
      layer.limitedAverageMpa,
    ]))}`,
    "",
  ];
  return lines;
}

function renderCurveSvg(model: VibroSheetModel): string {
  const width = 640;
  const height = 520;
  const margin = { left: 76, top: 28, right: 28, bottom: 42 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const calibration = model.calibration;
  const qcSpan = calibration.qcMaxMpa - calibration.qcMinMpa;
  const depthSpan =
    calibration.depthTopNapM - calibration.depthBottomNapM;
  const x = (qcMpa: number) =>
    margin.left
    + ((qcMpa - calibration.qcMinMpa) / qcSpan) * plotWidth;
  const y = (depthNapM: number) =>
    margin.top
    + ((calibration.depthTopNapM - depthNapM) / depthSpan) * plotHeight;
  const curvePoints = [...model.points]
    .sort((first, second) => second.depthNapM - first.depthNapM)
    .map((point) => `${number(x(point.qcMpa), 2)},${number(y(point.depthNapM), 2)}`)
    .join(" ");
  const first = model.results[0];
  const trajectory = (
    name: string,
    topNapM: number,
    bottomNapM: number,
    color: string,
    offset: number,
  ) => {
    const yTop = y(Math.max(topNapM, bottomNapM));
    const yBottom = y(Math.min(topNapM, bottomNapM));
    return `<rect data-traject="${name}" x="${margin.left + offset}" y="${number(yTop, 2)}" width="8" height="${number(Math.max(2, yBottom - yTop), 2)}" fill="${color}" opacity="0.8"/>`;
  };
  const svgLines = [
    "@svg",
    `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="qc-curve met rekentrajecten">`,
    `<rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" fill="#f8fafc" stroke="#94a3b8"/>`,
    trajectory(
      "qc-I",
      first.pileTipNapM,
      first.qcIBottomNapM,
      "#2563eb",
      4,
    ),
    trajectory(
      "qc-II",
      first.pileTipNapM,
      first.qcIBottomNapM,
      "#7c3aed",
      16,
    ),
    trajectory(
      "qc-III",
      first.pileTipNapM + 8 * model.input.baseDiameterMm / 1000,
      first.pileTipNapM,
      "#ea580c",
      28,
    ),
    trajectory(
      "qc-z-a",
      model.input.positiveShaftStartNapM,
      first.pileTipNapM,
      "#16a34a",
      40,
    ),
    `<polyline data-curve="qc" points="${curvePoints}" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round"/>`,
    `<text x="${margin.left}" y="${height - 12}" fill="#334155">qc [MPa]</text>`,
    `<text x="12" y="${margin.top + 12}" fill="#334155">NAP [m]</text>`,
    "</svg>",
    "@end",
  ];
  return svgLines.join("\n");
}

function validateModel(model: VibroSheetModel): void {
  if (model.sourceFileName.trim() === "") {
    throw new RangeError("Een bronbestandsnaam is vereist");
  }
  if (model.points.length === 0) {
    throw new RangeError("Minimaal één meetpunt is vereist");
  }
  if (model.results.length !== RESULT_COUNT) {
    throw new RangeError(`Precies ${RESULT_COUNT} paalpuntresultaten zijn vereist`);
  }

  const numericValues: number[] = [];
  collectFiniteNumbers(model.calibration, numericValues);
  collectFiniteNumbers(model.points, numericValues);
  collectFiniteNumbers(model.input, numericValues);
  collectFiniteNumbers(model.results, numericValues);
  if (!numericValues.every(Number.isFinite)) {
    throw new RangeError("Het sheetmodel mag uitsluitend eindige getallen bevatten");
  }
  if (
    model.calibration.qcMaxMpa <= model.calibration.qcMinMpa
    || model.calibration.depthTopNapM <= model.calibration.depthBottomNapM
  ) {
    throw new RangeError("De kalibratie moet positieve qc- en dieptebereiken hebben");
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
