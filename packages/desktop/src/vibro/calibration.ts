import type { CptCalibration } from "./types";

export function pixelToQc(xPx: number, calibration: CptCalibration): number {
  const { left, right } = calibration.plotBoundsPx;
  assertWithinRange(xPx, left, right, "xPx");
  const tx = (xPx - left) / (right - left);

  return calibration.qcMinMpa + tx * (calibration.qcMaxMpa - calibration.qcMinMpa);
}

export function pixelToDepthNap(yPx: number, calibration: CptCalibration): number {
  const { top, bottom } = calibration.plotBoundsPx;
  assertWithinRange(yPx, top, bottom, "yPx");
  const ty = (yPx - top) / (bottom - top);

  return calibration.depthTopNapM
    + ty * (calibration.depthBottomNapM - calibration.depthTopNapM);
}

export function qcToPixel(qcMpa: number, calibration: CptCalibration): number {
  const { left, right } = calibration.plotBoundsPx;
  assertWithinRange(qcMpa, calibration.qcMinMpa, calibration.qcMaxMpa, "qcMpa");
  const tq = (qcMpa - calibration.qcMinMpa)
    / (calibration.qcMaxMpa - calibration.qcMinMpa);

  return left + tq * (right - left);
}

export function depthNapToPixel(depthNapM: number, calibration: CptCalibration): number {
  const { top, bottom } = calibration.plotBoundsPx;
  assertWithinRange(
    depthNapM,
    calibration.depthTopNapM,
    calibration.depthBottomNapM,
    "depthNapM",
  );
  const td = (depthNapM - calibration.depthTopNapM)
    / (calibration.depthBottomNapM - calibration.depthTopNapM);

  return top + td * (bottom - top);
}

export function validateCalibration(calibration: CptCalibration): string[] {
  const errors: string[] = [];
  const { left, top, right, bottom } = calibration.plotBoundsPx;

  if (!Number.isFinite(calibration.pageIndex)) {
    errors.push("pageIndex moet een eindig getal zijn");
  }
  if (![left, top, right, bottom].every(Number.isFinite)) {
    errors.push("plotBoundsPx moet uitsluitend eindige waarden bevatten");
  }
  if (right <= left) {
    errors.push("plotBoundsPx moet een positieve breedte hebben");
  }
  if (bottom <= top) {
    errors.push("plotBoundsPx moet een positieve hoogte hebben");
  }
  if (![calibration.qcMinMpa, calibration.qcMaxMpa].every(Number.isFinite)) {
    errors.push("qcMinMpa en qcMaxMpa moeten eindige waarden zijn");
  }
  if (calibration.qcMaxMpa <= calibration.qcMinMpa) {
    errors.push("qcMaxMpa moet groter zijn dan qcMinMpa");
  }
  if (![calibration.depthTopNapM, calibration.depthBottomNapM].every(Number.isFinite)) {
    errors.push("depthTopNapM en depthBottomNapM moeten eindige waarden zijn");
  }
  if (calibration.depthTopNapM === calibration.depthBottomNapM) {
    errors.push("depthTopNapM en depthBottomNapM moeten verschillen");
  }

  return errors;
}

function assertWithinRange(
  value: number,
  firstEndpoint: number,
  secondEndpoint: number,
  name: string,
): void {
  const minimum = Math.min(firstEndpoint, secondEndpoint);
  const maximum = Math.max(firstEndpoint, secondEndpoint);

  if (value < minimum || value > maximum) {
    throw new RangeError(`${name} ligt buiten het gekalibreerde bereik`);
  }
}
