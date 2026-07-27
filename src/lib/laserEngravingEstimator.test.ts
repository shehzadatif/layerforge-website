import { describe, expect, it } from "vitest";

import { estimateLaserEngraving } from "./laserEngravingEstimator";
import { DEFAULT_LASER_ENGRAVING_PRICING } from "./laserEngravingPricing";
import { toLaserEngravingPublicPricing } from "./laserEngravingPublicPricing";

describe("laser engraving estimator", () => {
  const pricing = toLaserEngravingPublicPricing(
    DEFAULT_LASER_ENGRAVING_PRICING,
  );

  it("estimates area, time, and a customer price range", () => {
    const estimate = estimateLaserEngraving(
      {
        width: 100,
        height: 50,
        units: "mm",
        mode: "raster",
        material: "wood",
        detail: "standard",
        locations: 1,
        rotary: false,
        quantity: 10,
        artworkPreparation: false,
      },
      pricing,
    );

    expect(estimate?.areaCm2).toBeCloseTo(50);
    expect(estimate?.minutesPerUnit).toBeCloseTo(50 / 12);
    expect(estimate!.low).toBeLessThan(estimate!.midpoint);
    expect(estimate!.high).toBeGreaterThan(estimate!.midpoint);
  });

  it("does not expose direct costs or target margin publicly", () => {
    expect(pricing).not.toHaveProperty("setupCost");
    expect(pricing).not.toHaveProperty("machineCostPerHour");
    expect(pricing).not.toHaveProperty("targetMarginPercent");
  });

  it("adds time for rotary work, detail, and multiple locations", () => {
    const base = estimateLaserEngraving(
      {
        width: 2,
        height: 2,
        units: "in",
        mode: "raster",
        material: "wood",
        detail: "standard",
        locations: 1,
        rotary: false,
        quantity: 1,
        artworkPreparation: false,
      },
      pricing,
    )!;
    const complex = estimateLaserEngraving(
      {
        width: 2,
        height: 2,
        units: "in",
        mode: "raster",
        material: "glass",
        detail: "detailed",
        locations: 2,
        rotary: true,
        quantity: 1,
        artworkPreparation: true,
      },
      pricing,
    )!;

    expect(complex.minutesPerUnit).toBeGreaterThan(base.minutesPerUnit);
    expect(complex.midpoint).toBeGreaterThanOrEqual(base.midpoint);
  });
});
