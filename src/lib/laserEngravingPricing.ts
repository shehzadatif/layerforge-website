export const LASER_ENGRAVING_PRICING_VERSION = "laser-engraving-v1";

export const LASER_ENGRAVING_PRICING_KEYS = {
  setupCost: "laser_engraving_setup_cost",
  artworkPreparationCost: "laser_engraving_artwork_preparation_cost",
  machineCostPerHour: "laser_engraving_machine_cost_per_hour",
  minimumOrderPrice: "laser_engraving_minimum_order_price",
  targetMarginPercent: "laser_engraving_target_margin_percent",
  rasterAreaCm2PerMinute: "laser_engraving_raster_area_cm2_per_minute",
  vectorAreaCm2PerMinute: "laser_engraving_vector_area_cm2_per_minute",
  rotaryTimeMultiplier: "laser_engraving_rotary_time_multiplier",
  lowRangePercent: "laser_engraving_low_range_percent",
  highRangePercent: "laser_engraving_high_range_percent",
} as const;

export const LASER_ENGRAVING_PRICING_SETTING_KEYS = Object.values(
  LASER_ENGRAVING_PRICING_KEYS,
);

export interface LaserEngravingPricingConfig {
  version: typeof LASER_ENGRAVING_PRICING_VERSION;
  setupCost: number;
  artworkPreparationCost: number;
  machineCostPerHour: number;
  minimumOrderPrice: number;
  targetMarginPercent: number;
  rasterAreaCm2PerMinute: number;
  vectorAreaCm2PerMinute: number;
  rotaryTimeMultiplier: number;
  lowRangePercent: number;
  highRangePercent: number;
}

export const DEFAULT_LASER_ENGRAVING_PRICING: LaserEngravingPricingConfig = {
  version: LASER_ENGRAVING_PRICING_VERSION,
  setupCost: 8,
  artworkPreparationCost: 5,
  machineCostPerHour: 12,
  minimumOrderPrice: 20,
  targetMarginPercent: 40,
  rasterAreaCm2PerMinute: 12,
  vectorAreaCm2PerMinute: 30,
  rotaryTimeMultiplier: 1.35,
  lowRangePercent: 10,
  highRangePercent: 20,
};

interface SettingRow {
  setting_key: string;
  setting_value: string | number | null;
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

export function laserGrossMarginMultiplier(marginPercent: number): number {
  const margin = boundedNumber(marginPercent, 0, 0, 80);
  return 1 / (1 - margin / 100);
}

export function normalizeLaserEngravingPricing(
  value: unknown,
): LaserEngravingPricingConfig {
  const input =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const defaults = DEFAULT_LASER_ENGRAVING_PRICING;

  return {
    version: LASER_ENGRAVING_PRICING_VERSION,
    setupCost: boundedNumber(input.setupCost, defaults.setupCost, 0, 10_000),
    artworkPreparationCost: boundedNumber(
      input.artworkPreparationCost,
      defaults.artworkPreparationCost,
      0,
      10_000,
    ),
    machineCostPerHour: boundedNumber(
      input.machineCostPerHour,
      defaults.machineCostPerHour,
      0,
      1_000,
    ),
    minimumOrderPrice: boundedNumber(
      input.minimumOrderPrice,
      defaults.minimumOrderPrice,
      0,
      100_000,
    ),
    targetMarginPercent: boundedNumber(
      input.targetMarginPercent,
      defaults.targetMarginPercent,
      0,
      80,
    ),
    rasterAreaCm2PerMinute: boundedNumber(
      input.rasterAreaCm2PerMinute,
      defaults.rasterAreaCm2PerMinute,
      0.1,
      10_000,
    ),
    vectorAreaCm2PerMinute: boundedNumber(
      input.vectorAreaCm2PerMinute,
      defaults.vectorAreaCm2PerMinute,
      0.1,
      10_000,
    ),
    rotaryTimeMultiplier: boundedNumber(
      input.rotaryTimeMultiplier,
      defaults.rotaryTimeMultiplier,
      1,
      10,
    ),
    lowRangePercent: boundedNumber(
      input.lowRangePercent,
      defaults.lowRangePercent,
      0,
      50,
    ),
    highRangePercent: boundedNumber(
      input.highRangePercent,
      defaults.highRangePercent,
      0,
      100,
    ),
  };
}

export function parseLaserEngravingPricingRows(
  rows: SettingRow[],
): LaserEngravingPricingConfig {
  const values = new Map(
    rows.map((row) => [
      row.setting_key,
      String(row.setting_value ?? "").trim(),
    ]),
  );
  const keys = LASER_ENGRAVING_PRICING_KEYS;

  return normalizeLaserEngravingPricing({
    setupCost: values.get(keys.setupCost),
    artworkPreparationCost: values.get(keys.artworkPreparationCost),
    machineCostPerHour: values.get(keys.machineCostPerHour),
    minimumOrderPrice: values.get(keys.minimumOrderPrice),
    targetMarginPercent: values.get(keys.targetMarginPercent),
    rasterAreaCm2PerMinute: values.get(keys.rasterAreaCm2PerMinute),
    vectorAreaCm2PerMinute: values.get(keys.vectorAreaCm2PerMinute),
    rotaryTimeMultiplier: values.get(keys.rotaryTimeMultiplier),
    lowRangePercent: values.get(keys.lowRangePercent),
    highRangePercent: values.get(keys.highRangePercent),
  });
}

function requiredNumber(
  read: (key: string) => unknown,
  key: string,
  label: string,
  minimum: number,
  maximum: number,
): number {
  const value = Number(String(read(key) ?? "").trim());

  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}.`);
  }

  return value;
}

export function parseLaserEngravingPricingInput(
  read: (key: string) => unknown,
): LaserEngravingPricingConfig {
  const keys = LASER_ENGRAVING_PRICING_KEYS;

  return {
    version: LASER_ENGRAVING_PRICING_VERSION,
    setupCost: requiredNumber(read, keys.setupCost, "Setup cost", 0, 10_000),
    artworkPreparationCost: requiredNumber(
      read,
      keys.artworkPreparationCost,
      "Artwork preparation cost",
      0,
      10_000,
    ),
    machineCostPerHour: requiredNumber(
      read,
      keys.machineCostPerHour,
      "Machine cost per hour",
      0,
      1_000,
    ),
    minimumOrderPrice: requiredNumber(
      read,
      keys.minimumOrderPrice,
      "Minimum order price",
      0,
      100_000,
    ),
    targetMarginPercent: requiredNumber(
      read,
      keys.targetMarginPercent,
      "Target margin",
      0,
      80,
    ),
    rasterAreaCm2PerMinute: requiredNumber(
      read,
      keys.rasterAreaCm2PerMinute,
      "Raster throughput",
      0.1,
      10_000,
    ),
    vectorAreaCm2PerMinute: requiredNumber(
      read,
      keys.vectorAreaCm2PerMinute,
      "Vector throughput",
      0.1,
      10_000,
    ),
    rotaryTimeMultiplier: requiredNumber(
      read,
      keys.rotaryTimeMultiplier,
      "Rotary time multiplier",
      1,
      10,
    ),
    lowRangePercent: requiredNumber(
      read,
      keys.lowRangePercent,
      "Lower estimate range",
      0,
      50,
    ),
    highRangePercent: requiredNumber(
      read,
      keys.highRangePercent,
      "Upper estimate range",
      0,
      100,
    ),
  };
}

export function laserEngravingSettingValues(
  pricing: LaserEngravingPricingConfig,
) {
  const keys = LASER_ENGRAVING_PRICING_KEYS;

  return [
    [keys.setupCost, pricing.setupCost],
    [keys.artworkPreparationCost, pricing.artworkPreparationCost],
    [keys.machineCostPerHour, pricing.machineCostPerHour],
    [keys.minimumOrderPrice, pricing.minimumOrderPrice],
    [keys.targetMarginPercent, pricing.targetMarginPercent],
    [keys.rasterAreaCm2PerMinute, pricing.rasterAreaCm2PerMinute],
    [keys.vectorAreaCm2PerMinute, pricing.vectorAreaCm2PerMinute],
    [keys.rotaryTimeMultiplier, pricing.rotaryTimeMultiplier],
    [keys.lowRangePercent, pricing.lowRangePercent],
    [keys.highRangePercent, pricing.highRangePercent],
  ].map(([setting_key, setting_value]) => ({ setting_key, setting_value }));
}
