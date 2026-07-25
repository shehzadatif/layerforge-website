import { describe, expect, it } from "vitest";

import {
  estimateThreeDPrintQuote,
  THREE_D_QUOTE_ESTIMATE_VERSION,
  type ThreeDModelMetrics,
} from "./threeDQuoteEstimator";

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
      (estimate?.estimatedTotalHigh ?? 0) -
      (estimate?.estimatedTotalLow ?? 0);

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

  it("applies setup cost once across multiple units", () => {
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
