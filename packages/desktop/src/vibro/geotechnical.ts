import type {
  DigitizedCptPoint,
  PileResistanceResult,
  QcAverages,
  VibroPileInput,
} from "./types";

const DEPTH_TOLERANCE_M = 1e-9;

export interface NegativeSkinLayerResult {
  topNapM: number;
  bottomNapM: number;
  averageEffectiveStressKpa: number;
  negativeSkinCharacteristicKn: number;
  negativeSkinDesignKn: number;
}

export interface NegativeSkinResult {
  layers: NegativeSkinLayerResult[];
  negativeSkinCharacteristicKn: number;
  negativeSkinDesignKn: number;
}

export function calculateQcAverages(
  points: DigitizedCptPoint[],
  input: VibroPileInput,
): QcAverages {
  const errors = validateCoverage(points, input);
  if (errors.length > 0) {
    throw new RangeError(`Onvoldoende dekking of ongeldige invoer: ${errors.join("; ")}`);
  }

  const curve = sortCurve(points);
  const baseDiameterM = input.baseDiameterMm / 1000;
  const minimumCriticalDepthM = 0.7 * baseDiameterM;
  const maximumCriticalDepthM = 4 * baseDiameterM;
  const criticalDepthM = findCriticalDepth(
    curve,
    input.pileTipNapM,
    minimumCriticalDepthM,
    maximumCriticalDepthM,
  );
  const criticalBottomNapM = input.pileTipNapM - criticalDepthM;
  const qcIAvgMpa =
    integrateCurve(curve, criticalBottomNapM, input.pileTipNapM) / criticalDepthM;

  const trajectoryII = clipCurve(curve, criticalBottomNapM, input.pileTipNapM);
  const qcII = integrateRunningMinimum(trajectoryII);
  const trajectoryIIILengthM = 8 * baseDiameterM;
  const trajectoryIII = clipCurve(
    curve,
    input.pileTipNapM,
    input.pileTipNapM + trajectoryIIILengthM,
  );
  const qcIII = integrateRunningMinimum(trajectoryIII, qcII.endMinimumMpa);
  const positiveShaftLengthM =
    input.positiveShaftStartNapM - input.pileTipNapM;
  const qcShaftAvgMpa =
    integrateCurve(
      curve,
      input.pileTipNapM,
      input.positiveShaftStartNapM,
    ) / positiveShaftLengthM;

  return {
    qcIAvgMpa,
    qcIIAvgMpa: qcII.integralMpaM / criticalDepthM,
    qcIIIAvgMpa: qcIII.integralMpaM / trajectoryIIILengthM,
    qcShaftAvgMpa,
  };
}

export function calculateNegativeSkinFriction(
  input: VibroPileInput,
): NegativeSkinResult {
  const errors = validateNegativeSkinLayers(input);
  if (errors.length > 0) {
    throw new RangeError(`Ongeldige negatieve-kleeflagen: ${errors.join("; ")}`);
  }

  const shaftCircumferenceM = Math.PI * input.shaftDiameterMm / 1000;
  const sortedLayers = [...input.negativeSkinLayers].sort(
    (first, second) => second.topNapM - first.topNapM,
  );
  const layers = sortedLayers.map<NegativeSkinLayerResult>((layer) => {
    const layerThicknessM = layer.topNapM - layer.bottomNapM;
    const averageEffectiveStressKpa =
      (layer.effectiveStressTopKpa + layer.effectiveStressBottomKpa) / 2;
    const negativeSkinCharacteristicKn =
      shaftCircumferenceM
      * layerThicknessM
      * averageEffectiveStressKpa
      * layer.k0
      * layer.tanDelta;

    return {
      topNapM: layer.topNapM,
      bottomNapM: layer.bottomNapM,
      averageEffectiveStressKpa,
      negativeSkinCharacteristicKn,
      negativeSkinDesignKn: negativeSkinCharacteristicKn * layer.gamma,
    };
  });

  return {
    layers,
    negativeSkinCharacteristicKn: layers.reduce(
      (sum, layer) => sum + layer.negativeSkinCharacteristicKn,
      0,
    ),
    negativeSkinDesignKn: layers.reduce(
      (sum, layer) => sum + layer.negativeSkinDesignKn,
      0,
    ),
  };
}

export function calculatePileResistance(
  points: DigitizedCptPoint[],
  input: VibroPileInput,
): PileResistanceResult {
  const qc = calculateQcAverages(points, input);
  const negativeSkin = calculateNegativeSkinFriction(input);
  const baseDiameterM = input.baseDiameterMm / 1000;
  const shaftDiameterM = input.shaftDiameterMm / 1000;
  const baseAreaM2 = Math.PI * baseDiameterM ** 2 / 4;
  const shaftCircumferenceM = Math.PI * shaftDiameterM;
  const positiveShaftLengthM =
    input.positiveShaftStartNapM - input.pileTipNapM;
  const qbMaxMpa =
    0.5
    * input.alphaP
    * input.beta
    * input.shapeFactor
    * (((qc.qcIAvgMpa + qc.qcIIAvgMpa) / 2) + qc.qcIIIAvgMpa);
  const rbCalKn = baseAreaM2 * qbMaxMpa * 1000;
  const rsCalKn =
    shaftCircumferenceM
    * positiveShaftLengthM
    * input.alphaS
    * qc.qcShaftAvgMpa
    * 1000;
  const rcCalKn = rbCalKn + rsCalKn;
  const rcCharacteristicKn = rcCalKn / input.xiSingleCpt;
  const rcDesignKn =
    rbCalKn / input.xiSingleCpt / input.gammaB
    + rsCalKn / input.xiSingleCpt / input.gammaS;
  const rcNetDesignKn = rcDesignKn - negativeSkin.negativeSkinDesignKn;

  return {
    ...qc,
    pileTipNapM: input.pileTipNapM,
    qbMaxMpa,
    rbCalKn,
    rsCalKn,
    rcCalKn,
    rcCharacteristicKn,
    rcDesignKn,
    negativeSkinDesignKn: negativeSkin.negativeSkinDesignKn,
    rcNetDesignKn,
    unityCheck: input.designLoadKn / rcNetDesignKn,
  };
}

export function validateCoverage(
  points: DigitizedCptPoint[],
  input: VibroPileInput,
): string[] {
  const errors = validatePileInput(input);
  const finitePoints = points.filter(
    (point) =>
      Number.isFinite(point.depthNapM)
      && Number.isFinite(point.qcMpa)
      && Number.isFinite(point.confidence),
  );

  if (finitePoints.length !== points.length) {
    errors.push("Meetpunten moeten uitsluitend eindige waarden bevatten");
  }
  if (finitePoints.some((point) => point.qcMpa < 0)) {
    errors.push("Conusweerstand mag niet negatief zijn");
  }
  if (finitePoints.some(
    (point) => point.confidence < 0 || point.confidence > 1,
  )) {
    errors.push("Betrouwbaarheid van meetpunten moet tussen 0 en 1 liggen");
  }

  const depths = finitePoints
    .map((point) => point.depthNapM)
    .sort((first, second) => first - second);
  if (depths.length < 2) {
    errors.push("Minimaal twee meetpunten zijn vereist");
    return errors;
  }
  if (depths.some(
    (depth, index) =>
      index > 0 && Math.abs(depth - depths[index - 1]!) <= DEPTH_TOLERANCE_M,
  )) {
    errors.push("Meetpunten mogen geen dubbele dieptes bevatten");
  }

  if (input.baseDiameterMm > 0 && Number.isFinite(input.baseDiameterMm)) {
    const baseDiameterM = input.baseDiameterMm / 1000;
    const requiredBottomNapM = input.pileTipNapM - 4 * baseDiameterM;
    const requiredTopNapM = Math.max(
      input.pileTipNapM + 8 * baseDiameterM,
      input.positiveShaftStartNapM,
    );
    const availableBottomNapM = depths[0]!;
    const availableTopNapM = depths[depths.length - 1]!;

    if (availableBottomNapM > requiredBottomNapM + DEPTH_TOLERANCE_M) {
      errors.push(
        `Curve mist dekking aan de onderzijde tot NAP ${requiredBottomNapM.toFixed(3)} m`,
      );
    }
    if (availableTopNapM < requiredTopNapM - DEPTH_TOLERANCE_M) {
      errors.push(
        `Curve mist dekking aan de bovenzijde tot NAP ${requiredTopNapM.toFixed(3)} m`,
      );
    }
  }

  return errors;
}

function validatePileInput(input: VibroPileInput): string[] {
  const errors: string[] = [];
  const numericValues = [
    input.shaftDiameterMm,
    input.baseDiameterMm,
    input.pileHeadNapM,
    input.pileTipNapM,
    input.positiveShaftStartNapM,
    input.alphaP,
    input.alphaS,
    input.beta,
    input.shapeFactor,
    input.xiSingleCpt,
    input.gammaB,
    input.gammaS,
    input.designLoadKn,
  ];

  if (!numericValues.every(Number.isFinite)) {
    errors.push("Paalinvoer moet uitsluitend eindige waarden bevatten");
    return errors;
  }
  if (input.shaftDiameterMm <= 0 || input.baseDiameterMm <= 0) {
    errors.push("Paaldiameters moeten positief zijn");
  }
  if (
    input.pileHeadNapM <= input.positiveShaftStartNapM
    || input.positiveShaftStartNapM <= input.pileTipNapM
  ) {
    errors.push(
      "Niveaus moeten aflopen van paalkop via positieve-schachtstart naar paalpunt",
    );
  }
  if (
    input.alphaP < 0
    || input.alphaS < 0
    || input.beta <= 0
    || input.shapeFactor <= 0
    || input.xiSingleCpt <= 0
    || input.gammaB <= 0
    || input.gammaS <= 0
  ) {
    errors.push("Rekenfactoren moeten fysiek geldige positieve waarden hebben");
  }
  if (input.designLoadKn < 0) {
    errors.push("Ontwerpbelasting mag niet negatief zijn");
  }

  return errors;
}

function validateNegativeSkinLayers(input: VibroPileInput): string[] {
  const errors = validatePileInput(input);
  const layers = [...input.negativeSkinLayers].sort(
    (first, second) => second.topNapM - first.topNapM,
  );

  for (const layer of layers) {
    const numericValues = [
      layer.topNapM,
      layer.bottomNapM,
      layer.effectiveStressTopKpa,
      layer.effectiveStressBottomKpa,
      layer.k0,
      layer.tanDelta,
      layer.gamma,
    ];
    if (!numericValues.every(Number.isFinite)) {
      errors.push("Negatieve-kleeflagen moeten uitsluitend eindige waarden bevatten");
      continue;
    }
    if (layer.topNapM <= layer.bottomNapM) {
      errors.push("Elke negatieve-kleeflaag moet een positieve dikte hebben");
    }
    if (
      layer.effectiveStressTopKpa < 0
      || layer.effectiveStressBottomKpa < 0
      || layer.k0 < 0
      || layer.tanDelta < 0
      || layer.gamma <= 0
    ) {
      errors.push("Spanningen en negatieve-kleeffactoren moeten fysiek geldig zijn");
    }
  }

  if (layers.length === 0) {
    return errors;
  }
  if (Math.abs(layers[0]!.topNapM - input.pileHeadNapM) > DEPTH_TOLERANCE_M) {
    errors.push("Negatieve-kleeflagen moeten aansluiten op de paalkop");
  }
  for (let index = 1; index < layers.length; index += 1) {
    const previousBottomNapM = layers[index - 1]!.bottomNapM;
    const currentTopNapM = layers[index]!.topNapM;
    if (currentTopNapM < previousBottomNapM - DEPTH_TOLERANCE_M) {
      errors.push("Negatieve-kleeflagen bevatten een gat");
    } else if (currentTopNapM > previousBottomNapM + DEPTH_TOLERANCE_M) {
      errors.push("Negatieve-kleeflagen bevatten overlap");
    }
  }
  if (
    Math.abs(
      layers[layers.length - 1]!.bottomNapM - input.positiveShaftStartNapM,
    ) > DEPTH_TOLERANCE_M
  ) {
    errors.push("Negatieve-kleeflagen moeten aansluiten op de positieve-schachtstart");
  }

  return errors;
}

function sortCurve(points: DigitizedCptPoint[]): DigitizedCptPoint[] {
  return [...points].sort(
    (first, second) => first.depthNapM - second.depthNapM,
  );
}

function findCriticalDepth(
  curve: DigitizedCptPoint[],
  pileTipNapM: number,
  minimumDepthM: number,
  maximumDepthM: number,
): number {
  const segmentBoundaries = curve
    .map((point) => pileTipNapM - point.depthNapM)
    .filter(
      (depthM) =>
        depthM > minimumDepthM + DEPTH_TOLERANCE_M
        && depthM < maximumDepthM - DEPTH_TOLERANCE_M,
    )
    .sort((first, second) => first - second);
  const boundaries = [minimumDepthM, ...segmentBoundaries, maximumDepthM];
  const candidates = [...boundaries];

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startDepthM = boundaries[index]!;
    const endDepthM = boundaries[index + 1]!;
    const startGradient = averageGradientNumerator(
      curve,
      pileTipNapM,
      startDepthM,
    );
    const endGradient = averageGradientNumerator(
      curve,
      pileTipNapM,
      endDepthM,
    );
    if (startGradient * endGradient < 0) {
      candidates.push(findGradientRoot(
        curve,
        pileTipNapM,
        startDepthM,
        endDepthM,
      ));
    }
  }

  let criticalDepthM = candidates[0]!;
  let minimumAverageMpa = averageBelowTip(curve, pileTipNapM, criticalDepthM);
  for (const candidateDepthM of candidates.slice(1)) {
    const averageMpa = averageBelowTip(curve, pileTipNapM, candidateDepthM);
    if (averageMpa < minimumAverageMpa - 1e-12) {
      criticalDepthM = candidateDepthM;
      minimumAverageMpa = averageMpa;
    }
  }

  return criticalDepthM;
}

function findGradientRoot(
  curve: DigitizedCptPoint[],
  pileTipNapM: number,
  initialLowerM: number,
  initialUpperM: number,
): number {
  let lowerM = initialLowerM;
  let upperM = initialUpperM;
  let lowerGradient = averageGradientNumerator(curve, pileTipNapM, lowerM);

  for (let iteration = 0; iteration < 60; iteration += 1) {
    const middleM = (lowerM + upperM) / 2;
    const middleGradient =
      averageGradientNumerator(curve, pileTipNapM, middleM);
    if (Math.abs(middleGradient) <= 1e-14) {
      return middleM;
    }
    if (lowerGradient * middleGradient <= 0) {
      upperM = middleM;
    } else {
      lowerM = middleM;
      lowerGradient = middleGradient;
    }
  }

  return (lowerM + upperM) / 2;
}

function averageGradientNumerator(
  curve: DigitizedCptPoint[],
  pileTipNapM: number,
  depthM: number,
): number {
  const boundaryQcMpa = interpolateQc(curve, pileTipNapM - depthM);
  const integralMpaM =
    integrateCurve(curve, pileTipNapM - depthM, pileTipNapM);
  return boundaryQcMpa * depthM - integralMpaM;
}

function averageBelowTip(
  curve: DigitizedCptPoint[],
  pileTipNapM: number,
  depthM: number,
): number {
  return integrateCurve(curve, pileTipNapM - depthM, pileTipNapM) / depthM;
}

function integrateCurve(
  curve: DigitizedCptPoint[],
  lowerNapM: number,
  upperNapM: number,
): number {
  const clipped = clipCurve(curve, lowerNapM, upperNapM);
  let integralMpaM = 0;

  for (let index = 1; index < clipped.length; index += 1) {
    const previous = clipped[index - 1]!;
    const current = clipped[index]!;
    integralMpaM +=
      (current.depthNapM - previous.depthNapM)
      * (previous.qcMpa + current.qcMpa)
      / 2;
  }

  return integralMpaM;
}

function clipCurve(
  curve: DigitizedCptPoint[],
  lowerNapM: number,
  upperNapM: number,
): DigitizedCptPoint[] {
  if (lowerNapM >= upperNapM) {
    throw new RangeError("Rekentraject moet een positieve lengte hebben");
  }

  return [
    {
      depthNapM: lowerNapM,
      qcMpa: interpolateQc(curve, lowerNapM),
      confidence: interpolateConfidence(curve, lowerNapM),
    },
    ...curve.filter(
      (point) =>
        point.depthNapM > lowerNapM + DEPTH_TOLERANCE_M
        && point.depthNapM < upperNapM - DEPTH_TOLERANCE_M,
    ),
    {
      depthNapM: upperNapM,
      qcMpa: interpolateQc(curve, upperNapM),
      confidence: interpolateConfidence(curve, upperNapM),
    },
  ];
}

function interpolateQc(
  curve: DigitizedCptPoint[],
  depthNapM: number,
): number {
  return interpolateProperty(curve, depthNapM, "qcMpa");
}

function interpolateConfidence(
  curve: DigitizedCptPoint[],
  depthNapM: number,
): number {
  return interpolateProperty(curve, depthNapM, "confidence");
}

function interpolateProperty(
  curve: DigitizedCptPoint[],
  depthNapM: number,
  property: "qcMpa" | "confidence",
): number {
  if (
    depthNapM < curve[0]!.depthNapM - DEPTH_TOLERANCE_M
    || depthNapM > curve[curve.length - 1]!.depthNapM + DEPTH_TOLERANCE_M
  ) {
    throw new RangeError("Rekentraject valt buiten de gedigitaliseerde curve");
  }

  const exact = curve.find(
    (point) => Math.abs(point.depthNapM - depthNapM) <= DEPTH_TOLERANCE_M,
  );
  if (exact !== undefined) {
    return exact[property];
  }

  const upperIndex = curve.findIndex((point) => point.depthNapM > depthNapM);
  const lower = curve[upperIndex - 1]!;
  const upper = curve[upperIndex]!;
  const fraction =
    (depthNapM - lower.depthNapM) / (upper.depthNapM - lower.depthNapM);

  return lower[property] + fraction * (upper[property] - lower[property]);
}

function integrateRunningMinimum(
  points: DigitizedCptPoint[],
  initialMinimumMpa?: number,
): { integralMpaM: number; endMinimumMpa: number } {
  let runningMinimumMpa = Math.min(
    initialMinimumMpa ?? points[0]!.qcMpa,
    points[0]!.qcMpa,
  );
  let integralMpaM = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    const lengthM = current.depthNapM - previous.depthNapM;

    if (current.qcMpa >= previous.qcMpa) {
      integralMpaM += runningMinimumMpa * lengthM;
    } else if (runningMinimumMpa <= current.qcMpa) {
      integralMpaM += runningMinimumMpa * lengthM;
    } else if (runningMinimumMpa >= previous.qcMpa) {
      integralMpaM += (previous.qcMpa + current.qcMpa) / 2 * lengthM;
    } else {
      const fractionToCrossing =
        (previous.qcMpa - runningMinimumMpa)
        / (previous.qcMpa - current.qcMpa);
      const constantLengthM = lengthM * fractionToCrossing;
      const descendingLengthM = lengthM - constantLengthM;
      integralMpaM +=
        runningMinimumMpa * constantLengthM
        + (runningMinimumMpa + current.qcMpa) / 2 * descendingLengthM;
    }

    runningMinimumMpa = Math.min(runningMinimumMpa, current.qcMpa);
  }

  return { integralMpaM, endMinimumMpa: runningMinimumMpa };
}
