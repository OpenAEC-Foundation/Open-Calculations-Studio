export type DimensionlessNumericTable = ReadonlyArray<ReadonlyArray<number>>;
export type LookupDirection = "ge" | "le";

interface TableRow {
  key: number;
  value: number;
  rowNumber: number;
}

const COMPARISON_TOLERANCE = 1e-12;

/**
 * Lineaire tabelfuncties accepteren uitsluitend eindige, dimensieloze
 * JavaScript-getallen. Units, impliciete conversies en extrapolatie zijn
 * bewust niet toegestaan.
 */
export function interpolateLinearTable(
  table: DimensionlessNumericTable,
  target: number,
  lookupColumn: number,
  returnColumn: number,
): number {
  const rows = validateTable(table, lookupColumn, returnColumn);
  assertFiniteNumber(target, "Zoekwaarde");
  assertCovered(rows, target);
  return interpolateRows(rows, target);
}

export function integrateLinearTable(
  table: DimensionlessNumericTable,
  lower: number,
  upper: number,
  lookupColumn: number,
  returnColumn: number,
): number {
  const rows = validateTable(table, lookupColumn, returnColumn);
  validateInterval(rows, lower, upper);
  return integrateRows(clipRows(rows, lower, upper));
}

export function integrateLimitedLinearTable(
  table: DimensionlessNumericTable,
  lower: number,
  upper: number,
  cutoff: number,
  lookupColumn: number,
  returnColumn: number,
): number {
  const rows = validateTable(table, lookupColumn, returnColumn);
  validateInterval(rows, lower, upper);
  assertFiniteNumber(cutoff, "Afsnijwaarde");
  const clipped = clipRows(rows, lower, upper);
  const limited: TableRow[] = [{
    ...clipped[0]!,
    value: Math.min(clipped[0]!.value, cutoff),
  }];
  for (let index = 1; index < clipped.length; index += 1) {
    const previous = clipped[index - 1]!;
    const current = clipped[index]!;
    if ((previous.value - cutoff) * (current.value - cutoff) < 0) {
      const fraction =
        (cutoff - previous.value) / (current.value - previous.value);
      limited.push({
        key: previous.key + fraction * (current.key - previous.key),
        value: cutoff,
        rowNumber: 0,
      });
    }
    limited.push({ ...current, value: Math.min(current.value, cutoff) });
  }
  return integrateRows(limited);
}

export function lookupLinearTableRow(
  table: DimensionlessNumericTable,
  target: number,
  lookupColumn: number,
  direction: LookupDirection,
): number {
  const rows = validateTable(table, lookupColumn, lookupColumn);
  assertFiniteNumber(target, "Zoekwaarde");
  assertCovered(rows, target);
  if (direction === "le") {
    for (let index = rows.length - 1; index >= 0; index -= 1) {
      if (rows[index]!.key <= target) return rows[index]!.rowNumber;
    }
  } else if (direction === "ge") {
    for (const row of rows) {
      if (row.key >= target) return row.rowNumber;
    }
  } else {
    throw new RangeError("Zoekrichting moet 'ge' of 'le' zijn");
  }
  throw new RangeError("Geen tabelrij gevonden binnen de dekking");
}

export function findLinearAverageMinimumDepth(
  table: DimensionlessNumericTable,
  tip: number,
  minimumDepth: number,
  maximumDepth: number,
  lookupColumn: number,
  returnColumn: number,
): number {
  const rows = validateTable(table, lookupColumn, returnColumn);
  assertFiniteNumber(tip, "Puntniveau");
  assertFiniteNumber(minimumDepth, "Minimale diepte");
  assertFiniteNumber(maximumDepth, "Maximale diepte");
  if (minimumDepth <= 0 || maximumDepth <= minimumDepth) {
    throw new RangeError(
      "Kritieke-dieptegrenzen moeten positief en strikt oplopend zijn",
    );
  }
  assertCovered(rows, tip);
  assertCovered(rows, tip - maximumDepth);

  const segmentBoundaries = rows
    .map((row) => tip - row.key)
    .filter(
      (depth) =>
        depth > minimumDepth + COMPARISON_TOLERANCE
        && depth < maximumDepth - COMPARISON_TOLERANCE,
    )
    .sort((first, second) => first - second);
  const boundaries = [
    minimumDepth,
    ...segmentBoundaries,
    maximumDepth,
  ];
  const candidates = [...boundaries];

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index]!;
    const end = boundaries[index + 1]!;
    const startGradient = averageGradientNumerator(rows, tip, start);
    const endGradient = averageGradientNumerator(rows, tip, end);
    if (startGradient * endGradient < 0) {
      candidates.push(findGradientRoot(rows, tip, start, end));
    }
  }

  let criticalDepth = candidates[0]!;
  let minimumAverage = averageBelowTip(rows, tip, criticalDepth);
  for (const candidate of candidates.slice(1)) {
    const average = averageBelowTip(rows, tip, candidate);
    if (average < minimumAverage - COMPARISON_TOLERANCE) {
      criticalDepth = candidate;
      minimumAverage = average;
    }
  }
  return criticalDepth;
}

function validateTable(
  table: DimensionlessNumericTable,
  lookupColumn: number,
  returnColumn: number,
): TableRow[] {
  if (!Array.isArray(table) || table.length < 2) {
    throw new RangeError("Lineaire tabel moet minimaal twee rijen bevatten");
  }
  assertColumn(lookupColumn, "Zoekkolom");
  assertColumn(returnColumn, "Retourkolom");
  const columnCount = Array.isArray(table[0]) ? table[0].length : 0;
  if (
    columnCount === 0
    || lookupColumn > columnCount
    || returnColumn > columnCount
  ) {
    throw new RangeError("Tabelkolom valt buiten de matrix");
  }

  const rows = table.map((row, index) => {
    if (!Array.isArray(row) || row.length !== columnCount) {
      throw new RangeError("Lineaire tabel moet rechthoekig zijn");
    }
    for (const cell of row) {
      if (typeof cell !== "number" || !Number.isFinite(cell)) {
        throw new TypeError(
          "Lineaire tabel accepteert alleen eindige dimensieloze getallen",
        );
      }
    }
    return {
      key: row[lookupColumn - 1]!,
      value: row[returnColumn - 1]!,
      rowNumber: index + 1,
    };
  });

  for (let index = 1; index < rows.length; index += 1) {
    if (rows[index]!.key <= rows[index - 1]!.key) {
      throw new RangeError(
        "Lineaire tabelsleutels moeten uniek en strikt oplopend zijn",
      );
    }
  }
  return rows;
}

function assertColumn(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} moet een positieve gehele kolomindex zijn`);
  }
}

function assertFiniteNumber(value: number, name: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} moet een eindig dimensieloos getal zijn`);
  }
}

function assertCovered(rows: TableRow[], target: number): void {
  if (target < rows[0]!.key || target > rows[rows.length - 1]!.key) {
    throw new RangeError("Zoekwaarde valt buiten de lineaire tabeldekking");
  }
}

function validateInterval(
  rows: TableRow[],
  lower: number,
  upper: number,
): void {
  assertFiniteNumber(lower, "Ondergrens");
  assertFiniteNumber(upper, "Bovengrens");
  if (upper <= lower) {
    throw new RangeError("Integratiegrenzen moeten strikt oplopend zijn");
  }
  assertCovered(rows, lower);
  assertCovered(rows, upper);
}

function interpolateRows(rows: TableRow[], target: number): number {
  const exact = rows.find((row) => row.key === target);
  if (exact !== undefined) return exact.value;
  const upperIndex = rows.findIndex((row) => row.key > target);
  const lower = rows[upperIndex - 1]!;
  const upper = rows[upperIndex]!;
  return lower.value
    + (target - lower.key) * (upper.value - lower.value)
      / (upper.key - lower.key);
}

function clipRows(
  rows: TableRow[],
  lower: number,
  upper: number,
): TableRow[] {
  return [
    { key: lower, value: interpolateRows(rows, lower), rowNumber: 0 },
    ...rows.filter((row) => row.key > lower && row.key < upper),
    { key: upper, value: interpolateRows(rows, upper), rowNumber: 0 },
  ];
}

function integrateRows(rows: TableRow[]): number {
  let integral = 0;
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1]!;
    const current = rows[index]!;
    integral +=
      (current.key - previous.key) * (previous.value + current.value) / 2;
  }
  return integral;
}

function averageGradientNumerator(
  rows: TableRow[],
  tip: number,
  depth: number,
): number {
  const boundary = tip - depth;
  return interpolateRows(rows, boundary) * depth
    - integrateRows(clipRows(rows, boundary, tip));
}

function averageBelowTip(
  rows: TableRow[],
  tip: number,
  depth: number,
): number {
  return integrateRows(clipRows(rows, tip - depth, tip)) / depth;
}

function findGradientRoot(
  rows: TableRow[],
  tip: number,
  initialLower: number,
  initialUpper: number,
): number {
  let lower = initialLower;
  let upper = initialUpper;
  let lowerGradient = averageGradientNumerator(rows, tip, lower);
  for (let iteration = 0; iteration < 60; iteration += 1) {
    const middle = (lower + upper) / 2;
    const middleGradient = averageGradientNumerator(rows, tip, middle);
    if (Math.abs(middleGradient) <= 1e-14) return middle;
    if (lowerGradient * middleGradient <= 0) {
      upper = middle;
    } else {
      lower = middle;
      lowerGradient = middleGradient;
    }
  }
  return (lower + upper) / 2;
}
