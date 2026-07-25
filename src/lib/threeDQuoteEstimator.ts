import {
  DEFAULT_THREE_D_QUOTE_PUBLIC_PRICING,
  normalizeThreeDQuotePublicPricingConfig,
  type ThreeDQuotePublicPricingConfig,
} from "./threeDQuotePublicPricing";
import type { ThreeDQuoteMaterial } from "./threeDQuotePricing";

export const THREE_D_QUOTE_ESTIMATE_VERSION =
  "stl-browser-v5-admin-private-margin";

export type ThreeDPrintMaterial = ThreeDQuoteMaterial;
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
  pricing?: ThreeDQuotePublicPricingConfig;
}

export interface ThreeDQuoteEstimate {
  version: typeof THREE_D_QUOTE_ESTIMATE_VERSION;
  pricingVersion: string;
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

interface MaterialPhysicalProfile {
  densityGramsPerCm3: number;
}

const MATERIAL_PROFILES: Record<ThreeDPrintMaterial, MaterialPhysicalProfile> = {
  PLA: { densityGramsPerCm3: 1.24 },
  PETG: { densityGramsPerCm3: 1.27 },
  ABS: { densityGramsPerCm3: 1.04 },
  TPU: { densityGramsPerCm3: 1.21 },
};

const QUALITY_TIME_MULTIPLIERS: Record<ThreeDPrintQuality, number> = {
  draft: 0.82,
  standard: 1,
  fine: 1.55,
};

const EFFECTIVE_SHELL_THICKNESS_CM = 0.08;

let activePricingConfig = DEFAULT_THREE_D_QUOTE_PUBLIC_PRICING;

/*
 * Load a derived customer-rate configuration before this browser module
 * finishes initializing. The endpoint never exposes Layer Forge's direct
 * costs or target margin; it publishes only the rates needed to calculate the
 * customer-facing estimate. Server-side imports retain safe defaults.
 */
if (typeof window !== "undefined") {
  try {
    const response = await fetch("/api/quote/3d-pricing-config", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (response.ok) {
      activePricingConfig = normalizeThreeDQuotePublicPricingConfig(
        await response.json(),
      );
    } else {
      console.warn(
        `Unable to load 3D quote pricing configuration: HTTP ${response.status}`,
      );
    }
  } catch (error) {
    console.warn("Unable to load 3D quote pricing configuration.", error);
  }
}

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
  const pricing = input.pricing
    ? normalizeThreeDQuotePublicPricingConfig(input.pricing)
    : activePricingConfig;

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

  const physicalProfile = MATERIAL_PROFILES[material];
  const pricingProfile = pricing.materials[material];
  const infillFraction = input.infillPercent / 100;
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
  const wasteFactor = 1 + pricing.wasteAllowancePercent / 100;
  const materialGramsPerUnit =
    printedVolumeCm3 * physicalProfile.densityGramsPerCm3 * wasteFactor;
  const printHoursPerUnit = Math.max(
    0.5,
    (materialGramsPerUnit / pricingProfile.throughputGramsPerHour) *
      QUALITY_TIME_MULTIPLIERS[input.quality],
  );
  const customerMaterialPricePerUnit =
    materialGramsPerUnit * pricingProfile.customerPricePerGram;
  const customerMachinePricePerUnit =
    printHoursPerUnit * pricing.machinePricePerHour;
  const midpoint = Math.max(
    pricing.minimumOrderPrice,
    pricing.setupPrice +
      (customerMaterialPricePerUnit + customerMachinePricePerUnit) *
        input.quantity,
  );
  const low = Math.max(
    pricing.minimumOrderPrice,
    midpoint * (1 - pricing.lowRangePercent / 100),
  );
  const high = Math.max(
    low,
    midpoint * (1 + pricing.highRangePercent / 100),
  );

  return {
    version: THREE_D_QUOTE_ESTIMATE_VERSION,
    pricingVersion: pricing.version,
    material,
    quality: input.quality,
    infillPercent: input.infillPercent,
    quantity: input.quantity,
    estimatedMaterialGramsPerUnit: round(materialGramsPerUnit, 1),
    estimatedPrintHoursPerUnit: round(printHoursPerUnit, 1),
    estimatedUnitPrice: round(midpoint / input.quantity, 2),
    estimatedTotalMidpoint: round(midpoint, 2),
    estimatedTotalLow: round(low, 2),
    estimatedTotalHigh: round(high, 2),
  };
}
