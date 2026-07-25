import { describe, expect, it } from "vitest";

import {
  DEFAULT_THREE_D_QUOTE_PRICING,
  type ThreeDQuotePricingConfig,
} from "./threeDQuotePricing";
import {
  DEFAULT_THREE_D_QUOTE_PUBLIC_PRICING,
  normalizeThreeDQuotePublicPricingConfig,
  toThreeDQuotePublicPricingConfig,
} from "./threeDQuotePublicPricing";

function clonePricing(): ThreeDQuotePricingConfig {
  return {
    ...DEFAULT_THREE_D_QUOTE_PRICING,
    materials: {
      PLA: { ...DEFAULT_THREE_D_QUOTE_PRICING.materials.PLA },
      PETG: { ...DEFAULT_THREE_D_QUOTE_PRICING.materials.PETG },
      ABS: { ...DEFAULT_THREE_D_QUOTE_PRICING.materials.ABS },
      TPU: { ...DEFAULT_THREE_D_QUOTE_PRICING.materials.TPU },
    },
  };
}

describe("3D quote public pricing", () => {
  it("preserves the original customer rates through the default margin", () => {
    const pricing = toThreeDQuotePublicPricingConfig(
      DEFAULT_THREE_D_QUOTE_PRICING,
    );

    expect(pricing.setupPrice).toBeCloseTo(8, 4);
    expect(pricing.machinePricePerHour).toBeCloseTo(3.5, 4);
    expect(pricing.materials.PLA.customerPricePerGram).toBeCloseTo(0.13, 4);
    expect(pricing.materials.PETG.customerPricePerGram).toBeCloseTo(0.15, 4);
  });

  it("never serializes direct costs or the target margin", () => {
    const serialized = JSON.stringify(
      toThreeDQuotePublicPricingConfig(DEFAULT_THREE_D_QUOTE_PRICING),
    );

    expect(serialized).not.toContain("targetMarginPercent");
    expect(serialized).not.toContain("costPerGram");
    expect(serialized).not.toContain("setupCost");
    expect(serialized).not.toContain("machineCostPerHour");
  });

  it("raises customer rates when the admin margin increases", () => {
    const lowerMargin = clonePricing();
    lowerMargin.targetMarginPercent = 20;
    const higherMargin = clonePricing();
    higherMargin.targetMarginPercent = 60;

    const lowerPublic = toThreeDQuotePublicPricingConfig(lowerMargin);
    const higherPublic = toThreeDQuotePublicPricingConfig(higherMargin);

    expect(higherPublic.setupPrice).toBeGreaterThan(lowerPublic.setupPrice);
    expect(higherPublic.machinePricePerHour).toBeGreaterThan(
      lowerPublic.machinePricePerHour,
    );
    expect(higherPublic.materials.PLA.customerPricePerGram).toBeGreaterThan(
      lowerPublic.materials.PLA.customerPricePerGram,
    );
  });

  it("falls back safely when a public response is incomplete or invalid", () => {
    const pricing = normalizeThreeDQuotePublicPricingConfig({
      setupPrice: -10,
      machinePricePerHour: "invalid",
      materials: {
        PLA: {
          customerPricePerGram: 0.25,
          throughputGramsPerHour: 0,
        },
      },
    });

    expect(pricing.setupPrice).toBe(
      DEFAULT_THREE_D_QUOTE_PUBLIC_PRICING.setupPrice,
    );
    expect(pricing.machinePricePerHour).toBe(
      DEFAULT_THREE_D_QUOTE_PUBLIC_PRICING.machinePricePerHour,
    );
    expect(pricing.materials.PLA.customerPricePerGram).toBe(0.25);
    expect(pricing.materials.PLA.throughputGramsPerHour).toBe(
      DEFAULT_THREE_D_QUOTE_PUBLIC_PRICING.materials.PLA
        .throughputGramsPerHour,
    );
  });
});
