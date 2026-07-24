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
  PileResistanceResult,
  VibroPileInput,
} from "./types";
import {
  generateVibroPileSheet,
  type VibroSheetModel,
} from "./sheetGenerator";
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

const points: DigitizedCptPoint[] = [
  { depthNapM: -24, qcMpa: 11, confidence: 0.91 },
  { depthNapM: -19, qcMpa: 14, confidence: 0.96 },
  { depthNapM: -14, qcMpa: 7, confidence: 0.89 },
];

const input: VibroPileInput = {
  shaftDiameterMm: 323,
  baseDiameterMm: 365,
  pileHeadNapM: -0.9,
  pileTipNapM: -18.5,
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
    { bottomNapM: -18.5, topNapM: -14.25 },
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

function result(pileTipNapM: number, index: number): PileResistanceResult {
  const qcIAvgMpa = 8 + index / 10;
  const qcIIAvgMpa = 7.5 + index / 10;
  const qcIIIAvgMpa = 9 + index / 10;
  const qcShaftAvgMpa = 6 + index / 10;
  const baseAreaM2 = Math.PI * (input.baseDiameterMm / 1000) ** 2 / 4;
  const circumferenceM = Math.PI * input.shaftDiameterMm / 1000;
  const qbRawMpa =
    0.5
    * input.alphaP
    * input.beta
    * input.shapeFactor
    * (((qcIAvgMpa + qcIIAvgMpa) / 2) + qcIIIAvgMpa);
  const qbMaxMpa = Math.min(qbRawMpa, 15);
  const rbCalKn = baseAreaM2 * qbMaxMpa * 1000;
  const rsCalKn =
    circumferenceM
    * (input.positiveShaftStartNapM - pileTipNapM)
    * input.alphaS
    * qcShaftAvgMpa
    * 1000;
  const rcCalKn = rbCalKn + rsCalKn;
  const rcCharacteristicKn = rcCalKn / input.xiSingleCpt;
  const rcDesignKn =
    rbCalKn / input.xiSingleCpt / input.gammaB
    + rsCalKn / input.xiSingleCpt / input.gammaS;
  const negativeSkinDesignKn = 201;
  const rcNetDesignKn = rcDesignKn - negativeSkinDesignKn;

  return {
    pileTipNapM,
    qcIAvgMpa,
    qcIIAvgMpa,
    qcIIIAvgMpa,
    qcShaftAvgMpa,
    criticalDepthM: 1.2,
    qcIBottomNapM: pileTipNapM - 1.2,
    qcIIRoute: [
      { depthNapM: pileTipNapM - 1.2, qcMpa: qcIIAvgMpa + 1 },
      { depthNapM: pileTipNapM, qcMpa: qcIIAvgMpa - 1 },
    ],
    qcIIIRoute: [
      { depthNapM: pileTipNapM, qcMpa: qcIIIAvgMpa - 1 },
      { depthNapM: pileTipNapM + 2.92, qcMpa: qcIIIAvgMpa + 1 },
    ],
    qcShaftLayers: [
      {
        bottomNapM: pileTipNapM,
        topNapM: input.positiveShaftStartNapM,
        thicknessM: input.positiveShaftStartNapM - pileTipNapM,
        rawMinimumMpa: 5.5,
        cutoffMpa: 12,
        limitedAverageMpa: qcShaftAvgMpa,
      },
    ],
    qbRawMpa,
    qbMaxMpa,
    rbCalKn,
    rsCalKn,
    rcCalKn,
    rcCharacteristicKn,
    rcDesignKn,
    negativeSkinDesignKn,
    rcNetDesignKn,
    unityCheck: input.designLoadKn / rcNetDesignKn,
  };
}

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
  return {
    sourceFileName: "sondering-01.pdf",
    calibration,
    points,
    input,
    results: Array.from(
      { length: 8 },
      (_, index) => result(-18.5 - index * 0.5, index),
    ),
  };
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
      results: Array.from(
        { length: 8 },
        (_, index) => result(-18.5 - index * 0.5, index),
      ),
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
