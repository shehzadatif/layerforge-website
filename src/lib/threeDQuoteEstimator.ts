export const THREE_D_QUOTE_ESTIMATE_VERSION = "stl-browser-v1";

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

interface MaterialProfile {
  densityGramsPerCm3: number;
  sellingPricePerGram: number;
  throughputGramsPerHour: number;
}

const MATERIAL_PROFILES: Record<ThreeDPrintMaterial, MaterialProfile> = {
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
};

const QUALITY_TIME_MULTIPLIERS: Record<ThreeDPrintQuality, number> = {
  draft: 0.82,
  standard: 1,
  fine: 1.55,
};

const SETUP_FEE = 8;
const MACHINE_RATE_PER_HOUR = 3.5;
const MINIMUM_ORDER_PRICE = 18;
const EFFECTIVE_SHELL_THICKNESS_CM = 0.08;
const SUPPORT_AND_WASTE_FACTOR = 1.1;
const LOW_RANGE_FACTOR = 0.84;
const HIGH_RANGE_FACTOR = 1.28;

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeMaterial(value: string): ThreeDPrintMaterial | null {
  const normalized = value.trim().toUpperCase();

  return normalized in MATERIAL_PROFILES
    ? (normalized as ThreeDPrintMaterial)
    : null;
}

function isValidMetrics(metrics: ThreeDModelMetrics): boolean {
  return (
    Number.isFinite(metrics.volumeCm3) &&
    metrics.volumeCm3 > 0 &&
    Number.isFinite(metrics.surfaceAreaCm2) &&
    metrics.surfaceAreaCm2 > 0 &&
    Number.isFinite(metrics.dimensionsMm.x) &&
    metrics.dimensionsMm.x > 0 &&
    Number.isFinite(metrics.dimensionsMm.y) &&
    metrics.dimensionsMm.y > 0 &&
    Number.isFinite(metrics.dimensionsMm.z) &&
    metrics.dimensionsMm.z > 0 &&
    Number.isInteger(metrics.triangleCount) &&
    metrics.triangleCount > 0
  );
}

export function estimateThreeDPrintQuote(
  input: ThreeDQuoteEstimateInput,
): ThreeDQuoteEstimate | null {
  const material = normalizeMaterial(input.material);

  if (
    !material ||
    !isValidMetrics(input.metrics) ||
    !(input.quality in QUALITY_TIME_MULTIPLIERS) ||
    !Number.isFinite(input.infillPercent) ||
    input.infillPercent < 5 ||
    input.infillPercent > 100 ||
    !Number.isInteger(input.quantity) ||
    input.quantity < 1 ||
    input.quantity > 10_000
  ) {
    return null;
  }

  const profile = MATERIAL_PROFILES[material];
  const infillFraction = input.infillPercent / 100;

  /*
   * STL volume represents a fully solid part. Approximate the printed material
   * as an outer shell plus the selected infill percentage of the remaining
   * interior. The final range intentionally leaves room for orientation,
   * supports, wall count, top/bottom layers, and slicer-specific behaviour.
   */
  const shellVolumeCm3 = Math.min(
    input.metrics.volumeCm3 * 0.72,
    input.metrics.surfaceAreaCm2 * EFFECTIVE_SHELL_THICKNESS_CM,
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
    SUPPORT_AND_WASTE_FACTOR;
  const printHoursPerUnit = Math.max(
    0.5,
    (materialGramsPerUnit / profile.throughputGramsPerHour) *
      QUALITY_TIME_MULTIPLIERS[input.quality],
  );
  const variableUnitPrice =
    materialGramsPerUnit * profile.sellingPricePerGram +
    printHoursPerUnit * MACHINE_RATE_PER_HOUR;
  const midpoint = Math.max(
    MINIMUM_ORDER_PRICE,
    SETUP_FEE + variableUnitPrice * input.quantity,
  );
  const low = Math.max(MINIMUM_ORDER_PRICE, midpoint * LOW_RANGE_FACTOR);
  const high = Math.max(low, midpoint * HIGH_RANGE_FACTOR);

  return {
    version: THREE_D_QUOTE_ESTIMATE_VERSION,
    material,
    quality: input.quality,
    infillPercent: input.infillPercent,
    quantity: input.quantity,
    estimatedMaterialGramsPerUnit: round(materialGramsPerUnit, 1),
    estimatedPrintHoursPerUnit: round(printHoursPerUnit, 1),
    estimatedUnitPrice: round((midpoint - SETUP_FEE) / input.quantity, 2),
    estimatedTotalMidpoint: round(midpoint, 2),
    estimatedTotalLow: round(low, 2),
    estimatedTotalHigh: round(high, 2),
  };
}
