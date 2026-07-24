import {
  evaluate,
  parse,
  render,
  type EvaluatedNode,
} from "@ifc-calc/core";
import { describe, expect, it } from "vitest";
import type {
  CptCalibration,
  DigitizedCptPoint,
  VibroPileInput,
} from "./types";
import {
  generateVibroPileSheet,
  type VibroSheetModel,
} from "./sheetGenerator";
import { calculatePileResistance } from "./geotechnical";
import { templates } from "../templates";
import { projectTree, type TreeNode } from "../components/calc/projectTree";

const calibration: CptCalibration = {
  pageIndex: 2,
  plotBoundsPx: {
    left: 42,
    top: 64,
    right: 522,
    bottom: 748,
  },
  qcMinMpa: 0,
  qcMaxMpa: 20,
  depthTopNapM: -14,
  depthBottomNapM: -24,
};

const points: DigitizedCptPoint[] = Array.from(
  { length: 101 },
  (_, index) => {
    const depthNapM = -24 + index * 0.1;
    const qcMpa = depthNapM <= -19
      ? 11 + (depthNapM + 24) * 0.6
      : 14 - (depthNapM + 19) * 1.4;
    return {
      depthNapM,
      qcMpa,
      confidence:
        depthNapM === -24 ? 0.91
          : depthNapM === -19 ? 0.96
            : depthNapM === -14 ? 0.89
              : 0.95,
    };
  },
);

const input: VibroPileInput = {
  shaftDiameterMm: 323,
  baseDiameterMm: 365,
  pileHeadNapM: -0.9,
  pileTipNapM: -22,
  positiveShaftStartNapM: -14.25,
  alphaP: 0.7,
  alphaS: 0.01,
  beta: 1,
  shapeFactor: 1,
  xiSingleCpt: 1.3,
  gammaB: 1.2,
  gammaS: 1.2,
  designLoadKn: 500,
  positiveShaftLayers: [
    { bottomNapM: -22, topNapM: -14.25 },
  ],
  negativeSkinLayers: [
    {
      topNapM: -0.9,
      bottomNapM: -14.25,
      effectiveStressTopKpa: 0,
      effectiveStressBottomKpa: 85,
      k0: 0.5,
      tanDelta: 0.35,
      gamma: 1,
    },
  ],
};

function collectEvaluationErrors(nodes: EvaluatedNode[]): string[] {
  return nodes.flatMap((node) => {
    if (node.type === "assignment" && node.result.startsWith("Error:")) {
      return [`${node.name}: ${node.result}`];
    }
    if (node.type === "conditional-branch") {
      return collectEvaluationErrors(node.children);
    }
    return [];
  });
}

function evaluatedNumber(nodes: EvaluatedNode[], name: string): number {
  const assignments = nodes.flatMap((node): EvaluatedNode[] =>
    node.type === "conditional-branch"
      ? node.children
      : [node]);
  const matches = assignments
    .filter((node) => node.type === "assignment" && node.name === name);
  const assignment = matches[matches.length - 1];
  if (assignment?.type !== "assignment") {
    throw new Error(`Assignment ${name} ontbreekt`);
  }
  const value = Number(assignment.result);
  if (!Number.isFinite(value)) {
    throw new Error(`Assignment ${name} is niet numeriek: ${assignment.result}`);
  }
  return value;
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  return nodes.flatMap((node) => [
    node,
    ...("children" in node ? flattenTree(node.children) : []),
  ]);
}

function completeModel(): VibroSheetModel {
  const results = Array.from({ length: 8 }, (_, index) => {
    const pileTipNapM = -18.5 - index * 0.5;
    return calculatePileResistance(points, {
      ...input,
      pileTipNapM,
      positiveShaftLayers: [{
        bottomNapM: pileTipNapM,
        topNapM: input.positiveShaftStartNapM,
      }],
    });
  });
  return {
    sourceFileName: "sondering-01.pdf",
    calibration,
    points,
    input,
    results,
  };
}

function crossCheckModel(
  qcAtDepth: (depthNapM: number) => number,
): VibroSheetModel {
  const crossCheckInput: VibroPileInput = {
    ...input,
    pileTipNapM: -22,
    positiveShaftLayers: [
      { bottomNapM: -22, topNapM: -15.1 },
      { bottomNapM: -15.1, topNapM: -14.25 },
    ],
  };
  const crossCheckPoints = Array.from({ length: 101 }, (_, index) => {
    const depthNapM = -24 + index * 0.1;
    return {
      depthNapM,
      qcMpa: qcAtDepth(depthNapM),
      confidence: 0.95,
    };
  });
  const results = Array.from({ length: 8 }, (_, index) => {
    const pileTipNapM = -18.5 - index * 0.5;
    return calculatePileResistance(crossCheckPoints, {
      ...crossCheckInput,
      pileTipNapM,
      positiveShaftLayers: crossCheckInput.positiveShaftLayers
        .map((layer) => ({
          bottomNapM: Math.max(layer.bottomNapM, pileTipNapM),
          topNapM: layer.topNapM,
        }))
        .filter((layer) => layer.topNapM > layer.bottomNapM),
    });
  });
  return {
    sourceFileName: "kruiscontrole.pdf",
    calibration,
    points: crossCheckPoints,
    input: crossCheckInput,
    results,
  };
}

function expectSheetValue(
  evaluated: EvaluatedNode[],
  name: string,
  expected: number,
): void {
  const actual = evaluatedNumber(evaluated, name);
  const tolerance = Math.max(1e-3, Math.abs(expected) * 5e-4);
  expect(Math.abs(actual - expected), `${name}: ${actual} versus ${expected}`)
    .toBeLessThanOrEqual(tolerance);
}

describe("generateVibroPileSheet", () => {
  it("genereert een complete Calcpad-rekensheet die zonder fouten evalueert", () => {
    const model = completeModel();

    const source = generateVibroPileSheet(model);

    expect(source).toContain("# VIBRO-paaldraagvermogen");
    expect(source).toContain("sondering-01.pdf");
    expect(source).toContain("Bronpagina: 3");
    expect(source).toContain("plot_left_px = 42");
    expect(source).toContain("qc_data = [[-24, 11, 0.91]");
    expect(source).toContain("alpha_p = 0.7");
    expect(source).toContain("negatieve_kleeflaag_data");
    expect(source).toContain("qc_I_gem");
    expect(source).toContain(
      "qc_I_gem_1 = qc_I_integral_1 / critical_depth_1_m",
    );
    expect(source).toContain(
      "qc_II_gem_1 = qc_II_1_integral / critical_depth_1_m",
    );
    expect(source).toContain(
      "qc_III_gem_1 = qc_III_1_integral / trajectory_III_length_1_m",
    );
    expect(source).toContain(
      "qc_z_a_gem_1 = qc_z_a_integral_1 / qc_z_a_length_1_m",
    );
    expect(source).toContain("R_c_net_d");
    expect(source).toContain("@svg");
    expect(source).toContain('data-traject="qc-I"');
    expect(source).toContain("qc;I");
    expect(source).toContain("qc;II");
    expect(source).toContain("qc;III");
    expect(source).toContain("qc;z;a");
    expect(source).toContain("Rb;cal");
    expect(source).toContain("Rs;cal");
    expect(source).toContain("Rc;d");
    expect(source).toContain("Fnk;d");
    expect(source).toContain("Rc;net;d");
    expect(source).toContain("Unity check");
    expect(source.match(/^### Paalpunt NAP /gm)).toHaveLength(8);
    [
      "-18.5",
      "-19",
      "-19.5",
      "-20",
      "-20.5",
      "-21",
      "-21.5",
      "-22",
    ].forEach((level) => {
      expect(source).toContain(`### Paalpunt NAP ${level} m`);
    });
    expect(source).not.toContain("NaN");
    expect(source).not.toContain("Infinity");

    const ast = parse(source);
    const evaluated = evaluate(ast);
    expect(collectEvaluationErrors(evaluated)).toEqual([]);
    const html = render(evaluated);
    expect(html).toContain("<table");
    expect(html).toContain("<th>qc;I</th>");
  });

  it("laat qc_data en rekenfactoren de qc-afleiding en netto weerstand sturen", () => {
    const source = generateVibroPileSheet(completeModel());
    const baseline = evaluate(parse(source));
    const changedPointSource = source.replace(
      "[-19, 14, 0.96]",
      "[-19, 4, 0.96]",
    );
    expect(changedPointSource).not.toBe(source);
    const changedPoint = evaluate(parse(changedPointSource));

    expect(evaluatedNumber(changedPoint, "qc_I_gem_1")).not.toBeCloseTo(
      evaluatedNumber(baseline, "qc_I_gem_1"),
      8,
    );
    expect(evaluatedNumber(changedPoint, "R_c_net_d_1")).not.toBeCloseTo(
      evaluatedNumber(baseline, "R_c_net_d_1"),
      8,
    );

    const changedFactor = evaluate(parse(source.replace(
      "alpha_p = 0.7",
      "alpha_p = 0.5",
    )));
    expect(evaluatedNumber(changedFactor, "R_c_net_d_1")).not.toBeCloseTo(
      evaluatedNumber(baseline, "R_c_net_d_1"),
      8,
    );
  });

  it("reproduceert de rekenkern voor continue minima en afsnijkruisingen", () => {
    const models = [
      crossCheckModel((depthNapM) =>
        10
        + 3.2 * Math.sin((depthNapM + 24) * 1.7)
        + 1.4 * Math.cos((depthNapM + 24) * 3.1)),
      crossCheckModel((depthNapM) => {
        if (depthNapM < -15.1) {
          return 8.5 + 2.1 * Math.sin((depthNapM + 22) * 2.3);
        }
        if (depthNapM <= -15) {
          return 10 + (depthNapM + 15.1) * 40;
        }
        if (depthNapM <= -14.9) {
          return 14 - (depthNapM + 15) * 40;
        }
        return 10 + 0.8 * Math.cos((depthNapM + 14.9) * 4);
      }),
    ];

    for (const model of models) {
      const evaluated = evaluate(parse(generateVibroPileSheet(model)));
      expect(collectEvaluationErrors(evaluated)).toEqual([]);
      model.results.forEach((expected, index) => {
        const suffix = index + 1;
        expectSheetValue(evaluated, `qc_I_gem_${suffix}`, expected.qcIAvgMpa);
        expectSheetValue(evaluated, `qc_II_gem_${suffix}`, expected.qcIIAvgMpa);
        expectSheetValue(evaluated, `qc_III_gem_${suffix}`, expected.qcIIIAvgMpa);
        expectSheetValue(
          evaluated,
          `qc_z_a_gem_${suffix}`,
          expected.qcShaftAvgMpa,
        );
        expectSheetValue(evaluated, `R_b_cal_${suffix}`, expected.rbCalKn);
        expectSheetValue(evaluated, `R_s_cal_${suffix}`, expected.rsCalKn);
        expectSheetValue(evaluated, `R_c_d_${suffix}`, expected.rcDesignKn);
        expectSheetValue(
          evaluated,
          `R_c_net_d_${suffix}`,
          expected.rcNetDesignKn,
        );
        expectSheetValue(
          evaluated,
          `unity_check_${suffix}`,
          expected.unityCheck,
        );
      });
    }
  }, 20_000);

  it("blokkeert generatie wanneer de sheet van de rekenkern afwijkt", () => {
    const model = crossCheckModel((depthNapM) =>
      9 + 2.5 * Math.sin((depthNapM + 24) * 1.9));
    model.results[0] = {
      ...model.results[0]!,
      rcNetDesignKn: model.results[0]!.rcNetDesignKn + 25,
    };

    expect(() => generateVibroPileSheet(model)).toThrow(/afwijking/i);
  });

  it("weigert een incompleet of niet-eindig model", () => {
    expect(() => generateVibroPileSheet({
      sourceFileName: "",
      calibration,
      points,
      input,
      results: [],
    })).toThrow(/bronbestandsnaam/i);

    expect(() => generateVibroPileSheet({
      sourceFileName: "sondering.pdf",
      calibration,
      points: [{ ...points[0], qcMpa: Number.NaN }],
      input,
      results: completeModel().results,
    })).toThrow(/eindige/i);

    const wrongLevels = completeModel();
    wrongLevels.results[3] = {
      ...wrongLevels.results[3],
      pileTipNapM: -20.25,
    };
    expect(() => generateVibroPileSheet(wrongLevels))
      .toThrow(/niveaureeks/i);
  });

  it("registreert de starttemplate onder funderingen", () => {
    expect(templates["vibro-paaldraagvermogen"]).toContain(
      "# VIBRO-paaldraagvermogen",
    );
    expect(templates["vibro-paaldraagvermogen"]).toContain(
      "eerst een PDF",
    );

    const foundations = flattenTree(projectTree).find(
      (node) => node.kind === "category" && node.id === "foundations",
    );
    expect(foundations).toMatchObject({
      kind: "category",
      label: "Funderingen",
    });
    expect(flattenTree(projectTree)).toContainEqual(expect.objectContaining({
      kind: "item",
      templateId: "vibro-paaldraagvermogen",
    }));
  });
});
