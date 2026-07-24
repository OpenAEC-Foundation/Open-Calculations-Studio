import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluator.js";
import {
  findLinearAverageMinimumDepth,
  integrateLinearTable,
  integrateLimitedLinearTable,
  interpolateLinearTable,
  lookupLinearTableRow,
} from "./linear-table.js";
import { parse } from "./parser.js";

describe("dimensieloze lineaire tabelfuncties", () => {
  const table = [
    [0, 10],
    [1, 14],
    [2, 8],
  ];

  it("interpoleert en integreert binnen de volledige dekking", () => {
    expect(interpolateLinearTable(table, 0.5, 1, 2)).toBe(12);
    expect(interpolateLinearTable(table, 1, 1, 2)).toBe(14);
    expect(integrateLinearTable(table, 0.5, 1.5, 1, 2)).toBe(12.75);
    expect(lookupLinearTableRow(table, 0.4, 1, "le")).toBe(1);
    expect(lookupLinearTableRow(table, 0.4, 1, "ge")).toBe(2);
  });

  it("integreert een interne afsnijkruising met het exacte plateau", () => {
    expect(integrateLimitedLinearTable(
      [[0, 10], [1, 14]],
      0,
      1,
      12,
      1,
      2,
    )).toBe(11.5);
  });

  it("vindt het continue minimum tussen twee tabelgrenzen", () => {
    const criticalDepth = findLinearAverageMinimumDepth(
      [[-4, 10], [-2, 2], [0, 10]],
      0,
      2,
      4,
      1,
      2,
    );
    expect(criticalDepth).toBeCloseTo(Math.sqrt(8), 12);
  });

  it.each([
    {
      name: "onsorteerde sleutels",
      table: [[1, 10], [0, 12]],
      action: (value: number[][]) => interpolateLinearTable(value, 0.5, 1, 2),
    },
    {
      name: "dubbele sleutels",
      table: [[0, 10], [0, 12]],
      action: (value: number[][]) => interpolateLinearTable(value, 0, 1, 2),
    },
    {
      name: "ongeldige kolom",
      table,
      action: (value: number[][]) => interpolateLinearTable(value, 0.5, 1, 3),
    },
    {
      name: "onder de dekking",
      table,
      action: (value: number[][]) => interpolateLinearTable(value, -0.1, 1, 2),
    },
    {
      name: "boven de dekking",
      table,
      action: (value: number[][]) => integrateLinearTable(value, 0, 2.1, 1, 2),
    },
  ])("weigert $name", ({ table: invalidTable, action }) => {
    expect(() => action(invalidTable)).toThrow(RangeError);
  });

  it("weigert Units en andere niet-numerieke matrixcellen", () => {
    const unitLike = { toNumber: () => 1 };
    expect(() => interpolateLinearTable(
      [[unitLike, 10], [2, 12]] as unknown as number[][],
      1.5,
      1,
      2,
    )).toThrow(/dimensielo/i);
  });

  it("maakt contractfouten zichtbaar als evaluatiefout", () => {
    const sources = [
      "x = interpolate_linear([[0, 10], [1, 14]], 2, 1, 2)",
      "x = interpolate_linear([[0 m, 10], [1 m, 14]], 0.5, 1, 2)",
    ];
    for (const source of sources) {
      const evaluated = evaluate(parse(source));
      const assignment = evaluated.find((node) =>
        node.type === "assignment" && node.name === "x");
      expect(assignment?.type).toBe("assignment");
      if (assignment?.type === "assignment") {
        expect(assignment.result).toMatch(/^Error:/);
      }
    }
  });
});
