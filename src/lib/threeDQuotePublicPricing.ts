import {
  customerRateFromCost,
  DEFAULT_THREE_D_QUOTE_PRICING,
  normalizeThreeDQuotePricingConfig,
  THREE_D_QUOTE_MATERIALS,
  type ThreeDQuoteMaterial,
  type ThreeDQuotePricingConfig,
} from "./threeDQuotePricing";

export const THREE_D_QUOTE_PUBLIC_PRICING_VERSION = "admin-customer-v1";

export interface ThreeDQuotePublicMaterialPricing {
  customerPricePerGram: number;
  throughputGramsPerHour: number;
}

export interface ThreeDQuotePublicPricingConfig {
  version: typeof THREE_D_QUOTE_PUBLIC_PRICING_VERSION;
  setupPrice: number;
  machinePricePerHour: number;
  minimumOrderPrice: number;
  wasteAllowancePercent: number;
  lowRangePercent: number;
  highRangePercent: number;
  materials: Record<ThreeDQuoteMaterial, ThreeDQuotePublicMaterialPricing>;
}

function boundedNumber(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

function round(value: number, digits = 6): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function toThreeDQuotePublicPricingConfig(
  value: ThreeDQuotePricingConfig,
): ThreeDQuotePublicPricingConfig {
  const pricing = normalizeThreeDQuotePricingConfig(value);

  return {
    version: THREE_D_QUOTE_PUBLIC_PRICING_VERSION,
    setupPrice: round(
      customerRateFromCost(pricing.setupCost, pricing.targetMarginPercent),
    ),
    machinePricePerHour: round(
      customerRateFromCost(
        pricing.machineCostPerHour,
        pricing.targetMarginPercent,
      ),
    ),
    minimumOrderPrice: pricing.minimumOrderPrice,
    wasteAllowancePercent: pricing.wasteAllowancePercent,
    lowRangePercent: pricing.lowRangePercent,
    highRangePercent: pricing.highRangePercent,
    materials: Object.fromEntries(
      THREE_D_QUOTE_MATERIALS.map((material) => [
        material,
        {
          customerPricePerGram: round(
            customerRateFromCost(
              pricing.materials[material].costPerGram,
              pricing.targetMarginPercent,
            ),
          ),
          throughputGramsPerHour:
            pricing.materials[material].throughputGramsPerHour,
        },
      ]),
    ) as Record<ThreeDQuoteMaterial, ThreeDQuotePublicMaterialPricing>,
  };
}

export const DEFAULT_THREE_D_QUOTE_PUBLIC_PRICING =
  toThreeDQuotePublicPricingConfig(DEFAULT_THREE_D_QUOTE_PRICING);

export function normalizeThreeDQuotePublicPricingConfig(
  value: unknown,
): ThreeDQuotePublicPricingConfig {
  const input =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const inputMaterials =
    input.materials && typeof input.materials === "object"
      ? (input.materials as Record<string, unknown>)
      : {};

  const materials = Object.fromEntries(
    THREE_D_QUOTE_MATERIALS.map((material) => {
      const fallback = DEFAULT_THREE_D_QUOTE_PUBLIC_PRICING.materials[material];
      const raw =
        inputMaterials[material] &&
        typeof inputMaterials[material] === "object"
          ? (inputMaterials[material] as Record<string, unknown>)
          : {};

      return [
        material,
        {
          customerPricePerGram: boundedNumber(
            raw.customerPricePerGram,
            fallback.customerPricePerGram,
            0.001,
            100,
          ),
          throughputGramsPerHour: boundedNumber(
            raw.throughputGramsPerHour,
            fallback.throughputGramsPerHour,
            0.1,
            100,
          ),
        },
      ];
    }),
  ) as Record<ThreeDQuoteMaterial, ThreeDQuotePublicMaterialPricing>;

  return {
    version: THREE_D_QUOTE_PUBLIC_PRICING_VERSION,
    setupPrice: boundedNumber(
      input.setupPrice,
      DEFAULT_THREE_D_QUOTE_PUBLIC_PRICING.setupPrice,
      0,
      100_000,
    ),
    machinePricePerHour: boundedNumber(
      input.machinePricePerHour,
      DEFAULT_THREE_D_QUOTE_PUBLIC_PRICING.machinePricePerHour,
      0,
      10_000,
    ),
    minimumOrderPrice: boundedNumber(
      input.minimumOrderPrice,
      DEFAULT_THREE_D_QUOTE_PUBLIC_PRICING.minimumOrderPrice,
      0,
      100_000,
    ),
    wasteAllowancePercent: boundedNumber(
      input.wasteAllowancePercent,
      DEFAULT_THREE_D_QUOTE_PUBLIC_PRICING.wasteAllowancePercent,
      0,
      100,
    ),
    lowRangePercent: boundedNumber(
      input.lowRangePercent,
      DEFAULT_THREE_D_QUOTE_PUBLIC_PRICING.lowRangePercent,
      0,
      50,
    ),
    highRangePercent: boundedNumber(
      input.highRangePercent,
      DEFAULT_THREE_D_QUOTE_PUBLIC_PRICING.highRangePercent,
      0,
      100,
    ),
    materials,
  };
}
