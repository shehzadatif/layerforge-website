import { describe, expect, it } from "vitest";

import {
  estimateThreeDPrintQuote,
  priceThreeDPrintQuoteFromSlicer,
  THREE_D_QUOTE_ESTIMATE_VERSION,
  THREE_D_QUOTE_SLICER_ESTIMATE_VERSION,
  type ThreeDModelMetrics,
} from "./threeDQuoteEstimator";
import { DEFAULT_THREE_D_QUOTE_PRICING } from "./threeDQuotePricing";
import { toThreeDQuotePublicPricingConfig } from "./threeDQuotePublicPricingServer";

const metrics: ThreeDModelMetrics = {
  volumeCm3: 100,
  surfaceAreaCm2: 130,
  dimensionsMm: {
    x: 80,
    y: 50,
    z: 40,
  },
  triangleCount: 1200,
};

function privatePricingWithMargin(targetMarginPercent: number) {
  return {
    ...DEFAULT_THREE_D_QUOTE_PRICING,
    targetMarginPercent,
    materials: {
      PLA: { ...DEFAULT_THREE_D_QUOTE_PRICING.materials.PLA },
      PETG: { ...DEFAULT_THREE_D_QUOTE_PRICING.materials.PETG },
      ABS: { ...DEFAULT_THREE_D_QUOTE_PRICING.materials.ABS },
      TPU: { ...DEFAULT_THREE_D_QUOTE_PRICING.materials.TPU },
    },
  };
}

function publicPricingWithMargin(targetMarginPercent: number) {
  return toThreeDQuotePublicPricingConfig(
    privatePricingWithMargin(targetMarginPercent),
  );
}

describe("estimateThreeDPrintQuote", () => {
  it("returns a focused preliminary range for a supported material", () => {
    const estimate = estimateThreeDPrintQuote({
      metrics,
      material: "PLA",
      quality: "standard",
      infillPercent: 20,
      quantity: 1,
    });

    expect(estimate).not.toBeNull();
    expect(estimate?.version).toBe(THREE_D_QUOTE_ESTIMATE_VERSION);
    expect(estimate?.estimatedMaterialGramsPerUnit).toBeGreaterThan(0);
    expect(estimate?.estimatedPrintHoursPerUnit).toBeGreaterThan(0);
    expect(estimate?.estimatedTotalLow).toBeLessThan(
      estimate?.estimatedTotalHigh ?? 0,
    );
    expect(estimate?.estimatedTotalMidpoint).toBeGreaterThanOrEqual(18);

    const midpoint = estimate?.estimatedTotalMidpoint ?? 0;
    const rangeWidth =
      (estimate?.estimatedTotalHigh ?? 0) - (estimate?.estimatedTotalLow ?? 0);

    expect(estimate?.estimatedTotalLow).toBeCloseTo(
      Math.max(18, midpoint * 0.92),
      1,
    );
    expect(estimate?.estimatedTotalHigh).toBeCloseTo(midpoint * 1.12, 1);
    expect(rangeWidth).toBeLessThanOrEqual(midpoint * 0.21);
  });

  it("increases the estimate for finer quality", () => {
    const draft = estimateThreeDPrintQuote({
      metrics,
      material: "PETG",
      quality: "draft",
      infillPercent: 20,
      quantity: 1,
    });
    const fine = estimateThreeDPrintQuote({
      metrics,
      material: "PETG",
      quality: "fine",
      infillPercent: 20,
      quantity: 1,
    });

    expect(fine?.estimatedTotalMidpoint).toBeGreaterThan(
      draft?.estimatedTotalMidpoint ?? 0,
    );
  });

  it("applies setup price once across multiple units", () => {
    const single = estimateThreeDPrintQuote({
      metrics,
      material: "ABS",
      quality: "standard",
      infillPercent: 30,
      quantity: 1,
    });
    const batch = estimateThreeDPrintQuote({
      metrics,
      material: "ABS",
      quality: "standard",
      infillPercent: 30,
      quantity: 4,
    });

    expect(batch?.estimatedTotalMidpoint).toBeGreaterThan(
      single?.estimatedTotalMidpoint ?? 0,
    );
    expect(batch?.estimatedUnitPrice).toBeLessThan(
      single?.estimatedTotalMidpoint ?? Number.POSITIVE_INFINITY,
    );
  });

  it("uses the admin target margin through derived customer rates", () => {
    const lowerMargin = estimateThreeDPrintQuote({
      metrics,
      material: "PLA",
      quality: "standard",
      infillPercent: 20,
      quantity: 3,
      pricing: publicPricingWithMargin(20),
    });
    const higherMargin = estimateThreeDPrintQuote({
      metrics,
      material: "PLA",
      quality: "standard",
      infillPercent: 20,
      quantity: 3,
      pricing: publicPricingWithMargin(60),
    });

    expect(higherMargin?.estimatedTotalMidpoint).toBeGreaterThan(
      lowerMargin?.estimatedTotalMidpoint ?? 0,
    );
  });

  it("uses the admin material cost basis without exposing it to the estimator", () => {
    const normalPrivatePricing = privatePricingWithMargin(40);
    const expensivePrivatePricing = privatePricingWithMargin(40);
    expensivePrivatePricing.materials.PLA.costPerGram =
      normalPrivatePricing.materials.PLA.costPerGram * 3;

    const normal = estimateThreeDPrintQuote({
      metrics,
      material: "PLA",
      quality: "standard",
      infillPercent: 20,
      quantity: 4,
      pricing: toThreeDQuotePublicPricingConfig(normalPrivatePricing),
    });
    const expensive = estimateThreeDPrintQuote({
      metrics,
      material: "PLA",
      quality: "standard",
      infillPercent: 20,
      quantity: 4,
      pricing: toThreeDQuotePublicPricingConfig(expensivePrivatePricing),
    });

    expect(expensive?.estimatedTotalMidpoint).toBeGreaterThan(
      normal?.estimatedTotalMidpoint ?? 0,
    );
  });

  it("rejects unsupported or invalid input", () => {
    expect(
      estimateThreeDPrintQuote({
        metrics,
        material: "Nylon",
        quality: "standard",
        infillPercent: 20,
        quantity: 1,
      }),
    ).toBeNull();

    expect(
      estimateThreeDPrintQuote({
        metrics,
        material: "PLA",
        quality: "standard",
        infillPercent: 0,
        quantity: 1,
      }),
    ).toBeNull();
  });
});

describe("priceThreeDPrintQuoteFromSlicer", () => {
  it("prices actual Bambu Studio material and time with the waste allowance", () => {
    const pricing = publicPricingWithMargin(40);
    const estimate = priceThreeDPrintQuoteFromSlicer({
      material: "PLA",
      quality: "standard",
      infillPercent: 20,
      quantity: 2,
      materialGramsPerUnit: 100,
      printHoursPerUnit: 3,
      pricing,
    });

    expect(estimate?.version).toBe(THREE_D_QUOTE_SLICER_ESTIMATE_VERSION);
    expect(estimate?.estimatedMaterialGramsPerUnit).toBe(110);
    expect(estimate?.estimatedPrintHoursPerUnit).toBe(3);
    expect(estimate?.estimatedTotalMidpoint).toBeCloseTo(57.6, 2);
  });

  it("rejects missing or unrealistic slicer measurements", () => {
    expect(
      priceThreeDPrintQuoteFromSlicer({
        material: "PLA",
        quality: "standard",
        infillPercent: 20,
        quantity: 1,
        materialGramsPerUnit: 0,
        printHoursPerUnit: 2,
        pricing: publicPricingWithMargin(40),
      }),
    ).toBeNull();
  });
});
