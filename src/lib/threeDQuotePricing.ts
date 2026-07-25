export const THREE_D_QUOTE_PRICING_VERSION = "admin-cost-v1";

export const THREE_D_QUOTE_MATERIALS = ["PLA", "PETG", "ABS", "TPU"] as const;

export type ThreeDQuoteMaterial = (typeof THREE_D_QUOTE_MATERIALS)[number];

export interface ThreeDQuoteMaterialPricing {
  costPerGram: number;
  throughputGramsPerHour: number;
}

export interface ThreeDQuotePricingConfig {
  version: typeof THREE_D_QUOTE_PRICING_VERSION;
  setupCost: number;
  machineCostPerHour: number;
  minimumOrderPrice: number;
  targetMarginPercent: number;
  wasteAllowancePercent: number;
  lowRangePercent: number;
  highRangePercent: number;
  materials: Record<ThreeDQuoteMaterial, ThreeDQuoteMaterialPricing>;
}

export const THREE_D_QUOTE_PRICING_KEYS = {
  setupCost: "three_d_quote_setup_cost",
  machineCostPerHour: "three_d_quote_machine_cost_per_hour",
  minimumOrderPrice: "three_d_quote_minimum_order_price",
  targetMarginPercent: "three_d_quote_target_margin_percent",
  wasteAllowancePercent: "three_d_quote_waste_allowance_percent",
  lowRangePercent: "three_d_quote_low_range_percent",
  highRangePercent: "three_d_quote_high_range_percent",
  materialCostPerGram: {
    PLA: "three_d_quote_pla_cost_per_gram",
    PETG: "three_d_quote_petg_cost_per_gram",
    ABS: "three_d_quote_abs_cost_per_gram",
    TPU: "three_d_quote_tpu_cost_per_gram",
  },
  materialThroughput: {
    PLA: "three_d_quote_pla_throughput_grams_per_hour",
    PETG: "three_d_quote_petg_throughput_grams_per_hour",
    ABS: "three_d_quote_abs_throughput_grams_per_hour",
    TPU: "three_d_quote_tpu_throughput_grams_per_hour",
  },
} as const;

export const THREE_D_QUOTE_PRICING_SETTING_KEYS = [
  THREE_D_QUOTE_PRICING_KEYS.setupCost,
  THREE_D_QUOTE_PRICING_KEYS.machineCostPerHour,
  THREE_D_QUOTE_PRICING_KEYS.minimumOrderPrice,
  THREE_D_QUOTE_PRICING_KEYS.targetMarginPercent,
  THREE_D_QUOTE_PRICING_KEYS.wasteAllowancePercent,
  THREE_D_QUOTE_PRICING_KEYS.lowRangePercent,
  THREE_D_QUOTE_PRICING_KEYS.highRangePercent,
  ...THREE_D_QUOTE_MATERIALS.map(
    (material) => THREE_D_QUOTE_PRICING_KEYS.materialCostPerGram[material],
  ),
  ...THREE_D_QUOTE_MATERIALS.map(
    (material) => THREE_D_QUOTE_PRICING_KEYS.materialThroughput[material],
  ),
] as const;

/*
 * These defaults preserve the original customer-facing rates at a 40% gross
 * margin. The cost basis can include filament, consumables, expected failures,
 * electricity, and routine machine wear.
 */
export const DEFAULT_THREE_D_QUOTE_PRICING: ThreeDQuotePricingConfig = {
  version: THREE_D_QUOTE_PRICING_VERSION,
  setupCost: 4.8,
  machineCostPerHour: 2.1,
  minimumOrderPrice: 18,
  targetMarginPercent: 40,
  wasteAllowancePercent: 10,
  lowRangePercent: 8,
  highRangePercent: 12,
  materials: {
    PLA: {
      costPerGram: 0.078,
      throughputGramsPerHour: 8.5,
    },
    PETG: {
      costPerGram: 0.09,
      throughputGramsPerHour: 7.5,
    },
    ABS: {
      costPerGram: 0.096,
      throughputGramsPerHour: 7,
    },
    TPU: {
      costPerGram: 0.138,
      throughputGramsPerHour: 4.5,
    },
  },
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

export function grossMarginMultiplier(marginPercent: number): number {
  const normalizedMargin = boundedNumber(marginPercent, 0, 0, 80);
  return 1 / (1 - normalizedMargin / 100);
}

export function customerRateFromCost(
  cost: number,
  marginPercent: number,
): number {
  return cost * grossMarginMultiplier(marginPercent);
}

export function normalizeThreeDQuotePricingConfig(
  value: unknown,
): ThreeDQuotePricingConfig {
  const input = value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
  const inputMaterials = input.materials && typeof input.materials === "object"
    ? (input.materials as Record<string, unknown>)
    : {};

  const materials = Object.fromEntries(
    THREE_D_QUOTE_MATERIALS.map((material) => {
      const fallback = DEFAULT_THREE_D_QUOTE_PRICING.materials[material];
      const raw = inputMaterials[material] && typeof inputMaterials[material] === "object"
        ? (inputMaterials[material] as Record<string, unknown>)
        : {};

      return [
        material,
        {
          costPerGram: boundedNumber(raw.costPerGram, fallback.costPerGram, 0.001, 10),
          throughputGramsPerHour: boundedNumber(
            raw.throughputGramsPerHour,
            fallback.throughputGramsPerHour,
            0.1,
            100,
          ),
        },
      ];
    }),
  ) as Record<ThreeDQuoteMaterial, ThreeDQuoteMaterialPricing>;

  return {
    version: THREE_D_QUOTE_PRICING_VERSION,
    setupCost: boundedNumber(
      input.setupCost,
      DEFAULT_THREE_D_QUOTE_PRICING.setupCost,
      0,
      10_000,
    ),
    machineCostPerHour: boundedNumber(
      input.machineCostPerHour,
      DEFAULT_THREE_D_QUOTE_PRICING.machineCostPerHour,
      0,
      1_000,
    ),
    minimumOrderPrice: boundedNumber(
      input.minimumOrderPrice,
      DEFAULT_THREE_D_QUOTE_PRICING.minimumOrderPrice,
      0,
      100_000,
    ),
    targetMarginPercent: boundedNumber(
      input.targetMarginPercent,
      DEFAULT_THREE_D_QUOTE_PRICING.targetMarginPercent,
      0,
      80,
    ),
    wasteAllowancePercent: boundedNumber(
      input.wasteAllowancePercent,
      DEFAULT_THREE_D_QUOTE_PRICING.wasteAllowancePercent,
      0,
      100,
    ),
    lowRangePercent: boundedNumber(
      input.lowRangePercent,
      DEFAULT_THREE_D_QUOTE_PRICING.lowRangePercent,
      0,
      50,
    ),
    highRangePercent: boundedNumber(
      input.highRangePercent,
      DEFAULT_THREE_D_QUOTE_PRICING.highRangePercent,
      0,
      100,
    ),
    materials,
  };
}

export function parseThreeDQuotePricingRows(
  rows: SettingRow[],
): ThreeDQuotePricingConfig {
  const values = new Map(
    rows.map((row) => [row.setting_key, String(row.setting_value ?? "").trim()]),
  );

  return normalizeThreeDQuotePricingConfig({
    setupCost: values.get(THREE_D_QUOTE_PRICING_KEYS.setupCost),
    machineCostPerHour: values.get(THREE_D_QUOTE_PRICING_KEYS.machineCostPerHour),
    minimumOrderPrice: values.get(THREE_D_QUOTE_PRICING_KEYS.minimumOrderPrice),
    targetMarginPercent: values.get(
      THREE_D_QUOTE_PRICING_KEYS.targetMarginPercent,
    ),
    wasteAllowancePercent: values.get(
      THREE_D_QUOTE_PRICING_KEYS.wasteAllowancePercent,
    ),
    lowRangePercent: values.get(THREE_D_QUOTE_PRICING_KEYS.lowRangePercent),
    highRangePercent: values.get(THREE_D_QUOTE_PRICING_KEYS.highRangePercent),
    materials: Object.fromEntries(
      THREE_D_QUOTE_MATERIALS.map((material) => [
        material,
        {
          costPerGram: values.get(
            THREE_D_QUOTE_PRICING_KEYS.materialCostPerGram[material],
          ),
          throughputGramsPerHour: values.get(
            THREE_D_QUOTE_PRICING_KEYS.materialThroughput[material],
          ),
        },
      ]),
    ),
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

export function parseThreeDQuotePricingInput(
  read: (key: string) => unknown,
): ThreeDQuotePricingConfig {
  return {
    version: THREE_D_QUOTE_PRICING_VERSION,
    setupCost: requiredNumber(
      read,
      THREE_D_QUOTE_PRICING_KEYS.setupCost,
      "Setup cost",
      0,
      10_000,
    ),
    machineCostPerHour: requiredNumber(
      read,
      THREE_D_QUOTE_PRICING_KEYS.machineCostPerHour,
      "Machine cost per hour",
      0,
      1_000,
    ),
    minimumOrderPrice: requiredNumber(
      read,
      THREE_D_QUOTE_PRICING_KEYS.minimumOrderPrice,
      "Minimum order price",
      0,
      100_000,
    ),
    targetMarginPercent: requiredNumber(
      read,
      THREE_D_QUOTE_PRICING_KEYS.targetMarginPercent,
      "Target profit margin",
      0,
      80,
    ),
    wasteAllowancePercent: requiredNumber(
      read,
      THREE_D_QUOTE_PRICING_KEYS.wasteAllowancePercent,
      "Waste allowance",
      0,
      100,
    ),
    lowRangePercent: requiredNumber(
      read,
      THREE_D_QUOTE_PRICING_KEYS.lowRangePercent,
      "Lower estimate allowance",
      0,
      50,
    ),
    highRangePercent: requiredNumber(
      read,
      THREE_D_QUOTE_PRICING_KEYS.highRangePercent,
      "Upper estimate allowance",
      0,
      100,
    ),
    materials: Object.fromEntries(
      THREE_D_QUOTE_MATERIALS.map((material) => [
        material,
        {
          costPerGram: requiredNumber(
            read,
            THREE_D_QUOTE_PRICING_KEYS.materialCostPerGram[material],
            `${material} cost per gram`,
            0.001,
            10,
          ),
          throughputGramsPerHour: requiredNumber(
            read,
            THREE_D_QUOTE_PRICING_KEYS.materialThroughput[material],
            `${material} throughput`,
            0.1,
            100,
          ),
        },
      ]),
    ) as Record<ThreeDQuoteMaterial, ThreeDQuoteMaterialPricing>,
  };
}

export function threeDQuotePricingSettingValues(
  config: ThreeDQuotePricingConfig,
): Array<{ setting_key: string; setting_value: string }> {
  const rows = [
    [THREE_D_QUOTE_PRICING_KEYS.setupCost, config.setupCost],
    [THREE_D_QUOTE_PRICING_KEYS.machineCostPerHour, config.machineCostPerHour],
    [THREE_D_QUOTE_PRICING_KEYS.minimumOrderPrice, config.minimumOrderPrice],
    [
      THREE_D_QUOTE_PRICING_KEYS.targetMarginPercent,
      config.targetMarginPercent,
    ],
    [
      THREE_D_QUOTE_PRICING_KEYS.wasteAllowancePercent,
      config.wasteAllowancePercent,
    ],
    [THREE_D_QUOTE_PRICING_KEYS.lowRangePercent, config.lowRangePercent],
    [THREE_D_QUOTE_PRICING_KEYS.highRangePercent, config.highRangePercent],
    ...THREE_D_QUOTE_MATERIALS.flatMap((material) => [
      [
        THREE_D_QUOTE_PRICING_KEYS.materialCostPerGram[material],
        config.materials[material].costPerGram,
      ],
      [
        THREE_D_QUOTE_PRICING_KEYS.materialThroughput[material],
        config.materials[material].throughputGramsPerHour,
      ],
    ]),
  ] as Array<[string, number]>;

  return rows.map(([setting_key, value]) => ({
    setting_key,
    setting_value: String(value),
  }));
}
