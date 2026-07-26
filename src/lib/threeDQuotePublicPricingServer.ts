import {
  customerRateFromCost,
  normalizeThreeDQuotePricingConfig,
  THREE_D_QUOTE_MATERIALS,
  type ThreeDQuotePricingConfig,
} from "./threeDQuotePricing";
import {
  THREE_D_QUOTE_PUBLIC_PRICING_VERSION,
  type ThreeDQuotePublicPricingConfig,
} from "./threeDQuotePublicPricing";

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
    ) as ThreeDQuotePublicPricingConfig["materials"],
  };
}
