export const VIBRO_TYPES_SCHEMA_VERSION = 1;

export interface DigitizedCptPoint {
  depthNapM: number;
  qcMpa: number;
  confidence: number;
}

export interface PlotBoundsPx {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CptCalibration {
  pageIndex: number;
  plotBoundsPx: PlotBoundsPx;
  qcMinMpa: number;
  qcMaxMpa: number;
  depthTopNapM: number;
  depthBottomNapM: number;
}

export interface NegativeSkinLayer {
  topNapM: number;
  bottomNapM: number;
  effectiveStressTopKpa: number;
  effectiveStressBottomKpa: number;
  k0: number;
  tanDelta: number;
  gamma: number;
}

export interface PositiveShaftLayer {
  bottomNapM: number;
  topNapM: number;
}

export interface VibroPileInput {
  shaftDiameterMm: number;
  baseDiameterMm: number;
  pileHeadNapM: number;
  pileTipNapM: number;
  positiveShaftStartNapM: number;
  alphaP: number;
  alphaS: number;
  beta: number;
  shapeFactor: number;
  xiSingleCpt: number;
  gammaB: number;
  gammaS: number;
  designLoadKn: number;
  positiveShaftLayers: PositiveShaftLayer[];
  negativeSkinLayers: NegativeSkinLayer[];
}

export interface QcAverages {
  qcIAvgMpa: number;
  qcIIAvgMpa: number;
  qcIIIAvgMpa: number;
  qcShaftAvgMpa: number;
  criticalDepthM: number;
  qcIBottomNapM: number;
  qcIIRoute: QcRoutePoint[];
  qcIIIRoute: QcRoutePoint[];
  qcShaftLayers: ShaftQcLayerResult[];
}

export interface QcRoutePoint {
  depthNapM: number;
  qcMpa: number;
}

export interface ShaftQcLayerResult extends PositiveShaftLayer {
  thicknessM: number;
  rawMinimumMpa: number;
  cutoffMpa: number | null;
  limitedAverageMpa: number;
}

export interface ShaftQcProfileResult {
  profile: QcRoutePoint[];
  layers: ShaftQcLayerResult[];
  qcShaftAvgMpa: number;
}

export interface PileResistanceResult extends QcAverages {
  pileTipNapM: number;
  qbRawMpa: number;
  qbMaxMpa: number;
  rbCalKn: number;
  rsCalKn: number;
  rcCalKn: number;
  rcCharacteristicKn: number;
  rcDesignKn: number;
  negativeSkinDesignKn: number;
  rcNetDesignKn: number;
  unityCheck: number;
}

export interface DigitizationResult {
  points: DigitizedCptPoint[];
  warnings: string[];
}
