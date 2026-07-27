import type { ThreeDQuoteMaterial } from "./threeDQuotePricing";

export const THREE_D_QUOTE_PUBLIC_PRICING_VERSION = "admin-customer-v1";
export const THREE_D_QUOTE_PUBLIC_MATERIALS = [
  "PLA",
  "PETG",
  "ABS",
  "TPU",
] as const satisfies readonly ThreeDQuoteMaterial[];

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

/*
 * These are customer-facing defaults, not Layer Forge Canada's underlying cost
 * basis. Keeping this browser-safe fallback separate from the server-side
 * converter prevents direct costs and the target margin from entering the
 * public JavaScript bundle.
 */
export const DEFAULT_THREE_D_QUOTE_PUBLIC_PRICING: ThreeDQuotePublicPricingConfig =
  {
    version: THREE_D_QUOTE_PUBLIC_PRICING_VERSION,
    setupPrice: 8,
    machinePricePerHour: 3.5,
    minimumOrderPrice: 18,
    wasteAllowancePercent: 10,
    lowRangePercent: 8,
    highRangePercent: 12,
    materials: {
      PLA: {
        customerPricePerGram: 0.13,
        throughputGramsPerHour: 8.5,
      },
      PETG: {
        customerPricePerGram: 0.15,
        throughputGramsPerHour: 7.5,
      },
      ABS: {
        customerPricePerGram: 0.16,
        throughputGramsPerHour: 7,
      },
      TPU: {
        customerPricePerGram: 0.23,
        throughputGramsPerHour: 4.5,
      },
    },
  };

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
    THREE_D_QUOTE_PUBLIC_MATERIALS.map((material) => {
      const fallback = DEFAULT_THREE_D_QUOTE_PUBLIC_PRICING.materials[material];
      const raw =
        inputMaterials[material] && typeof inputMaterials[material] === "object"
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
