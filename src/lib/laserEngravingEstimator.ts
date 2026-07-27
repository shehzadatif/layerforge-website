import type { LaserEngravingPublicPricing } from "./laserEngravingPublicPricing";

export const LASER_MATERIAL_MULTIPLIERS = {
  wood: 1,
  acrylic: 0.9,
  "anodized-aluminum": 0.8,
  "coated-metal": 0.9,
  glass: 1.4,
  leather: 1.1,
  other: 1.2,
} as const;

export const LASER_DETAIL_MULTIPLIERS = {
  simple: 0.75,
  standard: 1,
  detailed: 1.5,
} as const;

export interface LaserEngravingEstimateInput {
  width: number;
  height: number;
  units: "mm" | "in";
  mode: "raster" | "vector";
  material: keyof typeof LASER_MATERIAL_MULTIPLIERS;
  detail: keyof typeof LASER_DETAIL_MULTIPLIERS;
  locations: number;
  rotary: boolean;
  quantity: number;
  artworkPreparation: boolean;
}

export interface LaserEngravingEstimate {
  areaCm2: number;
  minutesPerUnit: number;
  totalMachineHours: number;
  low: number;
  midpoint: number;
  high: number;
}

export function estimateLaserEngraving(
  input: LaserEngravingEstimateInput,
  pricing: LaserEngravingPublicPricing,
): LaserEngravingEstimate | null {
  const values = [input.width, input.height, input.locations, input.quantity];
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
    return null;
  }

  const conversion = input.units === "in" ? 2.54 : 0.1;
  const areaCm2 = input.width * conversion * input.height * conversion;
  const throughput =
    input.mode === "raster"
      ? pricing.rasterAreaCm2PerMinute
      : pricing.vectorAreaCm2PerMinute;
  const minutesPerUnit =
    (areaCm2 / throughput) *
    LASER_DETAIL_MULTIPLIERS[input.detail] *
    LASER_MATERIAL_MULTIPLIERS[input.material] *
    (input.rotary ? pricing.rotaryTimeMultiplier : 1) *
    input.locations;
  const totalMachineHours = (minutesPerUnit * input.quantity) / 60;
  const calculated =
    pricing.setupRate +
    (input.artworkPreparation ? pricing.artworkPreparationRate : 0) +
    totalMachineHours * pricing.machineRatePerHour;
  const midpoint = Math.max(pricing.minimumOrderPrice, calculated);

  return {
    areaCm2,
    minutesPerUnit,
    totalMachineHours,
    low: midpoint * (1 - pricing.lowRangePercent / 100),
    midpoint,
    high: midpoint * (1 + pricing.highRangePercent / 100),
  };
}
