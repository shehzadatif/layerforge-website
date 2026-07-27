import {
  laserGrossMarginMultiplier,
  type LaserEngravingPricingConfig,
} from "./laserEngravingPricing";

export interface LaserEngravingPublicPricing {
  version: string;
  setupRate: number;
  artworkPreparationRate: number;
  machineRatePerHour: number;
  minimumOrderPrice: number;
  rasterAreaCm2PerMinute: number;
  vectorAreaCm2PerMinute: number;
  rotaryTimeMultiplier: number;
  lowRangePercent: number;
  highRangePercent: number;
}

export function toLaserEngravingPublicPricing(
  pricing: LaserEngravingPricingConfig,
): LaserEngravingPublicPricing {
  const multiplier = laserGrossMarginMultiplier(pricing.targetMarginPercent);

  return {
    version: pricing.version,
    setupRate: pricing.setupCost * multiplier,
    artworkPreparationRate: pricing.artworkPreparationCost * multiplier,
    machineRatePerHour: pricing.machineCostPerHour * multiplier,
    minimumOrderPrice: pricing.minimumOrderPrice,
    rasterAreaCm2PerMinute: pricing.rasterAreaCm2PerMinute,
    vectorAreaCm2PerMinute: pricing.vectorAreaCm2PerMinute,
    rotaryTimeMultiplier: pricing.rotaryTimeMultiplier,
    lowRangePercent: pricing.lowRangePercent,
    highRangePercent: pricing.highRangePercent,
  };
}
