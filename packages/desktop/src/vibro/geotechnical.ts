import type {
  DigitizedCptPoint,
  PileResistanceResult,
  PositiveShaftLayer,
  QcAverages,
  QcRoutePoint,
  ShaftQcLayerResult,
  ShaftQcProfileResult,
  VibroPileInput,
} from "./types";

const DEPTH_TOLERANCE_M = 1e-9;
// De digitaliseerder levert 20-mm dieptebins. Vijf opeenvolgende bins is het
// maximaal expliciet interpoleerbare kerninterval; grotere stappen zijn gaten.
export const MAX_CPT_POINT_SPACING_M = 0.1;

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
  const qcII = constructMinimumRoute(trajectoryII);
  const trajectoryIIILengthM = 8 * baseDiameterM;
  const trajectoryIII = clipCurve(
    curve,
    input.pileTipNapM,
    input.pileTipNapM + trajectoryIIILengthM,
  );
  const qcIII = constructMinimumRoute(trajectoryIII, qcII.endMinimumMpa);
  const shaftQc = calculateShaftQcProfile(curve, input.positiveShaftLayers);

  return {
    qcIAvgMpa,
    qcIIAvgMpa: qcII.integralMpaM / criticalDepthM,
    qcIIIAvgMpa: qcIII.integralMpaM / trajectoryIIILengthM,
    qcShaftAvgMpa: shaftQc.qcShaftAvgMpa,
    criticalDepthM,
    qcIBottomNapM: criticalBottomNapM,
    qcIIRoute: qcII.route,
    qcIIIRoute: qcIII.route,
    qcShaftLayers: shaftQc.layers,
  };
}

/**
 * Past de expliciete qc;z;a-afsnijregel per opgegeven grondlaag toe.
 *
 * Alleen lagen met een ruwe qc-piek boven 12 MPa worden begrensd. Voor een
 * laag dunner dan 1 m is de afsnijwaarde 12 MPa. Voor een laag van ten minste
 * 1 m is de afsnijwaarde de laagste lineair geïnterpoleerde qc in die laag,
 * met een absoluut maximum van 15 MPa. De begrenzing wordt vóór de
 * trapeziumintegratie punt voor punt toegepast.
 */
export function calculateShaftQcProfile(
  points: DigitizedCptPoint[],
  layers: PositiveShaftLayer[],
): ShaftQcProfileResult {
  if (layers.length === 0) {
    throw new RangeError("Minimaal één positieve-schachtlaag is vereist");
  }
  const curve = sortCurve(points);
  const sortedLayers = [...layers].sort(
    (first, second) => first.bottomNapM - second.bottomNapM,
  );
  validateStandaloneShaftLayers(sortedLayers);

  const profile: QcRoutePoint[] = [];
  const layerResults: ShaftQcLayerResult[] = [];
  let totalIntegralMpaM = 0;
  let totalLengthM = 0;

  for (const layer of sortedLayers) {
    const rawLayer = clipCurve(curve, layer.bottomNapM, layer.topNapM);
    const thicknessM = layer.topNapM - layer.bottomNapM;
    const rawMinimumMpa = Math.min(...rawLayer.map((point) => point.qcMpa));
    const containsPeak = rawLayer.some((point) => point.qcMpa > 12);
    const cutoffMpa = containsPeak
      ? thicknessM < 1 - DEPTH_TOLERANCE_M
        ? 12
        : Math.min(rawMinimumMpa, 15)
      : null;
    const limitedLayer = limitCurveAtCutoff(rawLayer, cutoffMpa);
    const layerIntegralMpaM = integrateRoute(limitedLayer);

    profile.push(...limitedLayer);
    totalIntegralMpaM += layerIntegralMpaM;
    totalLengthM += thicknessM;
    layerResults.push({
      ...layer,
      thicknessM,
      rawMinimumMpa,
      cutoffMpa,
      limitedAverageMpa: layerIntegralMpaM / thicknessM,
    });
  }

  return {
    profile,
    layers: layerResults,
    qcShaftAvgMpa: totalIntegralMpaM / totalLengthM,
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
  const qbRawMpa =
    0.5
    * input.alphaP
    * input.beta
    * input.shapeFactor
    * (((qc.qcIAvgMpa + qc.qcIIAvgMpa) / 2) + qc.qcIIIAvgMpa);
  const qbMaxMpa = Math.min(qbRawMpa, 15);
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
    qbRawMpa,
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

    const sortedPoints = [...finitePoints].sort(
      (first, second) => first.depthNapM - second.depthNapM,
    );
    const unreliablePoint = sortedPoints.find(
      (point) =>
        point.depthNapM >= requiredBottomNapM - DEPTH_TOLERANCE_M
        && point.depthNapM <= requiredTopNapM + DEPTH_TOLERANCE_M
        && point.confidence <= 0,
    );
    if (unreliablePoint !== undefined) {
      errors.push(
        `Curve bevat een onbetrouwbaar punt op NAP ${unreliablePoint.depthNapM.toFixed(3)} m`,
      );
    }
    for (let index = 1; index < sortedPoints.length; index += 1) {
      const lower = sortedPoints[index - 1]!;
      const upper = sortedPoints[index]!;
      const intersectsRequiredRange =
        lower.depthNapM < requiredTopNapM - DEPTH_TOLERANCE_M
        && upper.depthNapM > requiredBottomNapM + DEPTH_TOLERANCE_M;
      if (
        intersectsRequiredRange
        && upper.depthNapM - lower.depthNapM
          > MAX_CPT_POINT_SPACING_M + DEPTH_TOLERANCE_M
      ) {
        errors.push(
          `Curve bevat een intern gat van ${(upper.depthNapM - lower.depthNapM).toFixed(3)} m tussen NAP ${lower.depthNapM.toFixed(3)} m en ${upper.depthNapM.toFixed(3)} m`,
        );
      }
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
  errors.push(...validateInputShaftLayers(input));

  return errors;
}

function validateInputShaftLayers(input: VibroPileInput): string[] {
  const errors: string[] = [];
  if (!Array.isArray(input.positiveShaftLayers)) {
    return ["Positieve-schachtlagen ontbreken"];
  }
  const layers = [...input.positiveShaftLayers].sort(
    (first, second) => first.bottomNapM - second.bottomNapM,
  );
  if (layers.length === 0) {
    return ["Minimaal één positieve-schachtlaag is vereist"];
  }
  for (const layer of layers) {
    if (
      !Number.isFinite(layer.bottomNapM)
      || !Number.isFinite(layer.topNapM)
      || layer.topNapM <= layer.bottomNapM
    ) {
      errors.push("Positieve-schachtlagen moeten eindig en positief dik zijn");
    }
  }
  if (
    Math.abs(layers[0]!.bottomNapM - input.pileTipNapM)
      > DEPTH_TOLERANCE_M
  ) {
    errors.push("Positieve-schachtlagen moeten aansluiten op de paalpunt");
  }
  for (let index = 1; index < layers.length; index += 1) {
    const previousTopNapM = layers[index - 1]!.topNapM;
    const currentBottomNapM = layers[index]!.bottomNapM;
    if (currentBottomNapM > previousTopNapM + DEPTH_TOLERANCE_M) {
      errors.push("Positieve-schachtlagen bevatten een gat");
    } else if (currentBottomNapM < previousTopNapM - DEPTH_TOLERANCE_M) {
      errors.push("Positieve-schachtlagen bevatten overlap");
    }
  }
  if (
    Math.abs(
      layers[layers.length - 1]!.topNapM - input.positiveShaftStartNapM,
    ) > DEPTH_TOLERANCE_M
  ) {
    errors.push(
      "Positieve-schachtlagen moeten aansluiten op de positieve-schachtstart",
    );
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
  assertReliableCurveSegment(curve, lowerNapM, upperNapM);

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

export function constructMinimumRoute(
  points: DigitizedCptPoint[],
  initialMinimumMpa?: number,
): {
  integralMpaM: number;
  endMinimumMpa: number;
  route: QcRoutePoint[];
} {
  let runningMinimumMpa = Math.min(
    initialMinimumMpa ?? points[0]!.qcMpa,
    points[0]!.qcMpa,
  );
  const route: QcRoutePoint[] = [
    { depthNapM: points[0]!.depthNapM, qcMpa: runningMinimumMpa },
  ];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    const lengthM = current.depthNapM - previous.depthNapM;

    if (current.qcMpa >= previous.qcMpa) {
      route.push({ depthNapM: current.depthNapM, qcMpa: runningMinimumMpa });
    } else if (runningMinimumMpa <= current.qcMpa) {
      route.push({ depthNapM: current.depthNapM, qcMpa: runningMinimumMpa });
    } else if (runningMinimumMpa >= previous.qcMpa) {
      route.push({ depthNapM: current.depthNapM, qcMpa: current.qcMpa });
    } else {
      const fractionToCrossing =
        (previous.qcMpa - runningMinimumMpa)
        / (previous.qcMpa - current.qcMpa);
      route.push({
        depthNapM: previous.depthNapM + lengthM * fractionToCrossing,
        qcMpa: runningMinimumMpa,
      });
      route.push({ depthNapM: current.depthNapM, qcMpa: current.qcMpa });
    }

    runningMinimumMpa = Math.min(runningMinimumMpa, current.qcMpa);
  }

  return {
    integralMpaM: integrateRoute(route),
    endMinimumMpa: runningMinimumMpa,
    route,
  };
}

function validateStandaloneShaftLayers(layers: PositiveShaftLayer[]): void {
  for (const layer of layers) {
    if (
      !Number.isFinite(layer.bottomNapM)
      || !Number.isFinite(layer.topNapM)
      || layer.topNapM <= layer.bottomNapM
    ) {
      throw new RangeError(
        "Positieve-schachtlagen moeten eindig en positief dik zijn",
      );
    }
  }
  for (let index = 1; index < layers.length; index += 1) {
    const previousTopNapM = layers[index - 1]!.topNapM;
    const currentBottomNapM = layers[index]!.bottomNapM;
    if (
      Math.abs(previousTopNapM - currentBottomNapM) > DEPTH_TOLERANCE_M
    ) {
      throw new RangeError(
        currentBottomNapM > previousTopNapM
          ? "Positieve-schachtlagen bevatten een gat"
          : "Positieve-schachtlagen bevatten overlap",
      );
    }
  }
}

function limitCurveAtCutoff(
  curve: DigitizedCptPoint[],
  cutoffMpa: number | null,
): QcRoutePoint[] {
  if (cutoffMpa === null) {
    return curve.map(({ depthNapM, qcMpa }) => ({ depthNapM, qcMpa }));
  }

  const limited: QcRoutePoint[] = [{
    depthNapM: curve[0]!.depthNapM,
    qcMpa: Math.min(curve[0]!.qcMpa, cutoffMpa),
  }];
  for (let index = 1; index < curve.length; index += 1) {
    const previous = curve[index - 1]!;
    const current = curve[index]!;
    if (
      (previous.qcMpa - cutoffMpa) * (current.qcMpa - cutoffMpa) < 0
    ) {
      const crossingFraction =
        (cutoffMpa - previous.qcMpa) / (current.qcMpa - previous.qcMpa);
      limited.push({
        depthNapM:
          previous.depthNapM
          + crossingFraction * (current.depthNapM - previous.depthNapM),
        qcMpa: cutoffMpa,
      });
    }
    limited.push({
      depthNapM: current.depthNapM,
      qcMpa: Math.min(current.qcMpa, cutoffMpa),
    });
  }
  return limited;
}

function assertReliableCurveSegment(
  curve: DigitizedCptPoint[],
  lowerNapM: number,
  upperNapM: number,
): void {
  const relevantPoints = curve.filter(
    (point) =>
      point.depthNapM >= lowerNapM - DEPTH_TOLERANCE_M
      && point.depthNapM <= upperNapM + DEPTH_TOLERANCE_M,
  );
  if (relevantPoints.some((point) => point.confidence <= 0)) {
    throw new RangeError("Rekentraject bevat een onbetrouwbaar meetpunt");
  }
  for (let index = 1; index < curve.length; index += 1) {
    const lower = curve[index - 1]!;
    const upper = curve[index]!;
    const intersectsSegment =
      lower.depthNapM < upperNapM - DEPTH_TOLERANCE_M
      && upper.depthNapM > lowerNapM + DEPTH_TOLERANCE_M;
    if (
      intersectsSegment
      && upper.depthNapM - lower.depthNapM
        > MAX_CPT_POINT_SPACING_M + DEPTH_TOLERANCE_M
    ) {
      throw new RangeError("Rekentraject bevat een te groot intern gat");
    }
  }
  const lowerConfidence = interpolateConfidence(curve, lowerNapM);
  const upperConfidence = interpolateConfidence(curve, upperNapM);
  if (lowerConfidence <= 0 || upperConfidence <= 0) {
    throw new RangeError("Rekentrajectgrens is onbetrouwbaar");
  }
}

function integrateRoute(route: QcRoutePoint[]): number {
  let integralMpaM = 0;
  for (let index = 1; index < route.length; index += 1) {
    const previous = route[index - 1]!;
    const current = route[index]!;
    integralMpaM +=
      (current.depthNapM - previous.depthNapM)
      * (previous.qcMpa + current.qcMpa)
      / 2;
  }
  return integralMpaM;
}
