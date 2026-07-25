export const THREE_D_QUOTE_ESTIMATE_VERSION = "stl-browser-v3";

export type ThreeDPrintMaterial = "PLA" | "PETG" | "ABS" | "TPU";
export type ThreeDPrintQuality = "draft" | "standard" | "fine";

export interface ThreeDModelMetrics {
  volumeCm3: number;
  surfaceAreaCm2: number;
  dimensionsMm: {
    x: number;
    y: number;
    z: number;
  };
  triangleCount: number;
}

export interface ThreeDQuoteEstimateInput {
  metrics: ThreeDModelMetrics;
  material: string;
  quality: ThreeDPrintQuality;
  infillPercent: number;
  quantity: number;
}

export interface ThreeDQuoteEstimate {
  version: typeof THREE_D_QUOTE_ESTIMATE_VERSION;
  material: ThreeDPrintMaterial;
  quality: ThreeDPrintQuality;
  infillPercent: number;
  quantity: number;
  estimatedMaterialGramsPerUnit: number;
  estimatedPrintHoursPerUnit: number;
  estimatedUnitPrice: number;
  estimatedTotalMidpoint: number;
  estimatedTotalLow: number;
  estimatedTotalHigh: number;
}

export interface ThreeDMaterialProfile {
  densityGramsPerCm3: number;
  sellingPricePerGram: number;
  throughputGramsPerHour: number;
}

export interface ThreeDQuoteEstimatorConfig {
  materials: Record<ThreeDPrintMaterial, ThreeDMaterialProfile>;
  qualityTimeMultipliers: Record<ThreeDPrintQuality, number>;
  setupFee: number;
  machineRatePerHour: number;
  minimumOrderPrice: number;
  effectiveShellThicknessCm: number;
  supportAndWasteFactor: number;
  lowRangeFactor: number;
  highRangeFactor: number;
}

export const DEFAULT_THREE_D_QUOTE_ESTIMATOR_CONFIG: ThreeDQuoteEstimatorConfig = {
  materials: {
    PLA: {
      densityGramsPerCm3: 1.24,
      sellingPricePerGram: 0.13,
      throughputGramsPerHour: 8.5,
    },
    PETG: {
      densityGramsPerCm3: 1.27,
      sellingPricePerGram: 0.15,
      throughputGramsPerHour: 7.5,
    },
    ABS: {
      densityGramsPerCm3: 1.04,
      sellingPricePerGram: 0.16,
      throughputGramsPerHour: 7,
    },
    TPU: {
      densityGramsPerCm3: 1.21,
      sellingPricePerGram: 0.23,
      throughputGramsPerHour: 4.5,
    },
  },
  qualityTimeMultipliers: {
    draft: 0.82,
    standard: 1,
    fine: 1.55,
  },
  setupFee: 8,
  machineRatePerHour: 3.5,
  minimumOrderPrice: 18,
  effectiveShellThicknessCm: 0.08,
  supportAndWasteFactor: 1.1,
  lowRangeFactor: 0.92,
  highRangeFactor: 1.12,
};

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeMaterial(value: string): ThreeDPrintMaterial | null {
  const normalized = value.trim().toUpperCase();

  return ["PLA", "PETG", "ABS", "TPU"].includes(normalized)
    ? (normalized as ThreeDPrintMaterial)
    : null;
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function isValidMetrics(metrics: ThreeDModelMetrics): boolean {
  return (
    isPositiveFinite(metrics.volumeCm3) &&
    isPositiveFinite(metrics.surfaceAreaCm2) &&
    isPositiveFinite(metrics.dimensionsMm.x) &&
    isPositiveFinite(metrics.dimensionsMm.y) &&
    isPositiveFinite(metrics.dimensionsMm.z) &&
    Number.isInteger(metrics.triangleCount) &&
    metrics.triangleCount > 0
  );
}

function isValidConfig(
  config: ThreeDQuoteEstimatorConfig,
  material: ThreeDPrintMaterial,
  quality: ThreeDPrintQuality,
): boolean {
  const profile = config.materials[material];
  const qualityMultiplier = config.qualityTimeMultipliers[quality];

  return (
    Boolean(profile) &&
    isPositiveFinite(profile.densityGramsPerCm3) &&
    isNonNegativeFinite(profile.sellingPricePerGram) &&
    isPositiveFinite(profile.throughputGramsPerHour) &&
    isPositiveFinite(qualityMultiplier) &&
    isNonNegativeFinite(config.setupFee) &&
    isNonNegativeFinite(config.machineRatePerHour) &&
    isNonNegativeFinite(config.minimumOrderPrice) &&
    isPositiveFinite(config.effectiveShellThicknessCm) &&
    config.effectiveShellThicknessCm <= 1 &&
    isPositiveFinite(config.supportAndWasteFactor) &&
    config.supportAndWasteFactor >= 1 &&
    config.supportAndWasteFactor <= 3 &&
    isPositiveFinite(config.lowRangeFactor) &&
    config.lowRangeFactor <= 1 &&
    isPositiveFinite(config.highRangeFactor) &&
    config.highRangeFactor >= 1 &&
    config.highRangeFactor <= 3
  );
}

export function estimateThreeDPrintQuote(
  input: ThreeDQuoteEstimateInput,
  config: ThreeDQuoteEstimatorConfig = DEFAULT_THREE_D_QUOTE_ESTIMATOR_CONFIG,
): ThreeDQuoteEstimate | null {
  const material = normalizeMaterial(input.material);

  if (
    !material ||
    !isValidMetrics(input.metrics) ||
    !["draft", "standard", "fine"].includes(input.quality) ||
    !isValidConfig(config, material, input.quality) ||
    !Number.isFinite(input.infillPercent) ||
    input.infillPercent < 5 ||
    input.infillPercent > 100 ||
    !Number.isInteger(input.quantity) ||
    input.quantity < 1 ||
    input.quantity > 10_000
  ) {
    return null;
  }

  const profile = config.materials[material];
  const infillFraction = input.infillPercent / 100;

  /*
   * STL volume represents a fully solid part. Approximate the printed material
   * as an outer shell plus the selected infill percentage of the remaining
   * interior. Admin calibration settings tune the geometry approximation and
   * price model without requiring a code deployment.
   */
  const shellVolumeCm3 = Math.min(
    input.metrics.volumeCm3 * 0.72,
    input.metrics.surfaceAreaCm2 * config.effectiveShellThicknessCm,
  );
  const interiorVolumeCm3 = Math.max(
    0,
    input.metrics.volumeCm3 - shellVolumeCm3,
  );
  const printedVolumeCm3 =
    shellVolumeCm3 + interiorVolumeCm3 * infillFraction;
  const materialGramsPerUnit =
    printedVolumeCm3 *
    profile.densityGramsPerCm3 *
    config.supportAndWasteFactor;
  const printHoursPerUnit = Math.max(
    0.5,
    (materialGramsPerUnit / profile.throughputGramsPerHour) *
      config.qualityTimeMultipliers[input.quality],
  );
  const variableUnitPrice =
    materialGramsPerUnit * profile.sellingPricePerGram +
    printHoursPerUnit * config.machineRatePerHour;
  const midpoint = Math.max(
    config.minimumOrderPrice,
    config.setupFee + variableUnitPrice * input.quantity,
  );
  const low = Math.max(
    config.minimumOrderPrice,
    midpoint * config.lowRangeFactor,
  );
  const high = Math.max(low, midpoint * config.highRangeFactor);

  return {
    version: THREE_D_QUOTE_ESTIMATE_VERSION,
    material,
    quality: input.quality,
    infillPercent: input.infillPercent,
    quantity: input.quantity,
    estimatedMaterialGramsPerUnit: round(materialGramsPerUnit, 1),
    estimatedPrintHoursPerUnit: round(printHoursPerUnit, 1),
    estimatedUnitPrice: round(
      Math.max(0, midpoint - config.setupFee) / input.quantity,
      2,
    ),
    estimatedTotalMidpoint: round(midpoint, 2),
    estimatedTotalLow: round(low, 2),
    estimatedTotalHigh: round(high, 2),
  };
}
