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
  negativeSkinLayers: NegativeSkinLayer[];
}

export interface QcAverages {
  qcIAvgMpa: number;
  qcIIAvgMpa: number;
  qcIIIAvgMpa: number;
  qcShaftAvgMpa: number;
}

export interface PileResistanceResult extends QcAverages {
  pileTipNapM: number;
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
