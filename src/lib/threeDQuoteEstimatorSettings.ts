import {
  DEFAULT_THREE_D_QUOTE_ESTIMATOR_CONFIG,
  type ThreeDPrintMaterial,
  type ThreeDPrintQuality,
  type ThreeDQuoteEstimatorConfig,
} from "./threeDQuoteEstimator";

export const THREE_D_QUOTE_ESTIMATOR_SETTING_KEYS = [
  "three_d_estimator_setup_fee",
  "three_d_estimator_machine_rate_per_hour",
  "three_d_estimator_minimum_order_price",
  "three_d_estimator_shell_thickness_mm",
  "three_d_estimator_support_waste_percent",
  "three_d_estimator_range_below_percent",
  "three_d_estimator_range_above_percent",
  "three_d_estimator_quality_draft_multiplier",
  "three_d_estimator_quality_standard_multiplier",
  "three_d_estimator_quality_fine_multiplier",
  "three_d_estimator_pla_price_per_gram",
  "three_d_estimator_pla_density",
  "three_d_estimator_pla_throughput",
  "three_d_estimator_petg_price_per_gram",
  "three_d_estimator_petg_density",
  "three_d_estimator_petg_throughput",
  "three_d_estimator_abs_price_per_gram",
  "three_d_estimator_abs_density",
  "three_d_estimator_abs_throughput",
  "three_d_estimator_tpu_price_per_gram",
  "three_d_estimator_tpu_density",
  "three_d_estimator_tpu_throughput",
] as const;

export type ThreeDQuoteEstimatorSettingKey =
  (typeof THREE_D_QUOTE_ESTIMATOR_SETTING_KEYS)[number];

export interface ThreeDQuoteEstimatorSettingRow {
  setting_key: string;
  setting_value: string | null;
}

interface MaterialAdminValues {
  sellingPricePerGram: number;
  densityGramsPerCm3: number;
  throughputGramsPerHour: number;
}

export interface ThreeDQuoteEstimatorAdminValues {
  setupFee: number;
  machineRatePerHour: number;
  minimumOrderPrice: number;
  shellThicknessMm: number;
  supportWastePercent: number;
  rangeBelowPercent: number;
  rangeAbovePercent: number;
  qualityMultipliers: Record<ThreeDPrintQuality, number>;
  materials: Record<ThreeDPrintMaterial, MaterialAdminValues>;
}

export class ThreeDQuoteEstimatorSettingsError extends Error {}

const MATERIALS: ThreeDPrintMaterial[] = ["PLA", "PETG", "ABS", "TPU"];

const KEY_BY_MATERIAL: Record<
  ThreeDPrintMaterial,
  {
    price: ThreeDQuoteEstimatorSettingKey;
    density: ThreeDQuoteEstimatorSettingKey;
    throughput: ThreeDQuoteEstimatorSettingKey;
  }
> = {
  PLA: {
    price: "three_d_estimator_pla_price_per_gram",
    density: "three_d_estimator_pla_density",
    throughput: "three_d_estimator_pla_throughput",
  },
  PETG: {
    price: "three_d_estimator_petg_price_per_gram",
    density: "three_d_estimator_petg_density",
    throughput: "three_d_estimator_petg_throughput",
  },
  ABS: {
    price: "three_d_estimator_abs_price_per_gram",
    density: "three_d_estimator_abs_density",
    throughput: "three_d_estimator_abs_throughput",
  },
  TPU: {
    price: "three_d_estimator_tpu_price_per_gram",
    density: "three_d_estimator_tpu_density",
    throughput: "three_d_estimator_tpu_throughput",
  },
};

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function defaultAdminValues(): ThreeDQuoteEstimatorAdminValues {
  const defaults = DEFAULT_THREE_D_QUOTE_ESTIMATOR_CONFIG;

  return {
    setupFee: defaults.setupFee,
    machineRatePerHour: defaults.machineRatePerHour,
    minimumOrderPrice: defaults.minimumOrderPrice,
    shellThicknessMm: defaults.effectiveShellThicknessCm * 10,
    supportWastePercent: (defaults.supportAndWasteFactor - 1) * 100,
    rangeBelowPercent: (1 - defaults.lowRangeFactor) * 100,
    rangeAbovePercent: (defaults.highRangeFactor - 1) * 100,
    qualityMultipliers: {
      ...defaults.qualityTimeMultipliers,
    },
    materials: {
      PLA: { ...defaults.materials.PLA },
      PETG: { ...defaults.materials.PETG },
      ABS: { ...defaults.materials.ABS },
      TPU: { ...defaults.materials.TPU },
    },
  };
}

export const DEFAULT_THREE_D_QUOTE_ESTIMATOR_ADMIN_VALUES =
  defaultAdminValues();

function storedNumber(
  settings: Map<string, string>,
  key: ThreeDQuoteEstimatorSettingKey,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const raw = settings.get(key);
  const value = raw === undefined ? Number.NaN : Number(raw);

  return Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : fallback;
}

function requiredFormNumber(
  formData: FormData,
  key: ThreeDQuoteEstimatorSettingKey,
  label: string,
  minimum: number,
  maximum: number,
): number {
  const raw = String(formData.get(key) ?? "").trim();
  const value = Number(raw);

  if (!raw || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new ThreeDQuoteEstimatorSettingsError(
      `${label} must be between ${minimum} and ${maximum}.`,
    );
  }

  return value;
}

export function readThreeDQuoteEstimatorAdminValues(
  rows: ThreeDQuoteEstimatorSettingRow[] | null | undefined,
): ThreeDQuoteEstimatorAdminValues {
  const defaults = defaultAdminValues();
  const settings = new Map(
    (rows ?? []).map((row) => [
      String(row.setting_key),
      String(row.setting_value ?? "").trim(),
    ]),
  );

  const materials = {} as Record<ThreeDPrintMaterial, MaterialAdminValues>;

  for (const material of MATERIALS) {
    const keys = KEY_BY_MATERIAL[material];
    const fallback = defaults.materials[material];

    materials[material] = {
      sellingPricePerGram: storedNumber(
        settings,
        keys.price,
        fallback.sellingPricePerGram,
        0,
        10,
      ),
      densityGramsPerCm3: storedNumber(
        settings,
        keys.density,
        fallback.densityGramsPerCm3,
        0.1,
        5,
      ),
      throughputGramsPerHour: storedNumber(
        settings,
        keys.throughput,
        fallback.throughputGramsPerHour,
        0.1,
        1000,
      ),
    };
  }

  return {
    setupFee: storedNumber(
      settings,
      "three_d_estimator_setup_fee",
      defaults.setupFee,
      0,
      1000,
    ),
    machineRatePerHour: storedNumber(
      settings,
      "three_d_estimator_machine_rate_per_hour",
      defaults.machineRatePerHour,
      0,
      500,
    ),
    minimumOrderPrice: storedNumber(
      settings,
      "three_d_estimator_minimum_order_price",
      defaults.minimumOrderPrice,
      0,
      10_000,
    ),
    shellThicknessMm: storedNumber(
      settings,
      "three_d_estimator_shell_thickness_mm",
      defaults.shellThicknessMm,
      0.1,
      10,
    ),
    supportWastePercent: storedNumber(
      settings,
      "three_d_estimator_support_waste_percent",
      defaults.supportWastePercent,
      0,
      200,
    ),
    rangeBelowPercent: storedNumber(
      settings,
      "three_d_estimator_range_below_percent",
      defaults.rangeBelowPercent,
      0,
      50,
    ),
    rangeAbovePercent: storedNumber(
      settings,
      "three_d_estimator_range_above_percent",
      defaults.rangeAbovePercent,
      0,
      100,
    ),
    qualityMultipliers: {
      draft: storedNumber(
        settings,
        "three_d_estimator_quality_draft_multiplier",
        defaults.qualityMultipliers.draft,
        0.1,
        5,
      ),
      standard: storedNumber(
        settings,
        "three_d_estimator_quality_standard_multiplier",
        defaults.qualityMultipliers.standard,
        0.1,
        5,
      ),
      fine: storedNumber(
        settings,
        "three_d_estimator_quality_fine_multiplier",
        defaults.qualityMultipliers.fine,
        0.1,
        5,
      ),
    },
    materials,
  };
}

export function parseThreeDQuoteEstimatorFormData(
  formData: FormData,
): ThreeDQuoteEstimatorAdminValues {
  const materials = {} as Record<ThreeDPrintMaterial, MaterialAdminValues>;

  for (const material of MATERIALS) {
    const keys = KEY_BY_MATERIAL[material];

    materials[material] = {
      sellingPricePerGram: requiredFormNumber(
        formData,
        keys.price,
        `${material} price per gram`,
        0,
        10,
      ),
      densityGramsPerCm3: requiredFormNumber(
        formData,
        keys.density,
        `${material} density`,
        0.1,
        5,
      ),
      throughputGramsPerHour: requiredFormNumber(
        formData,
        keys.throughput,
        `${material} throughput`,
        0.1,
        1000,
      ),
    };
  }

  return {
    setupFee: requiredFormNumber(
      formData,
      "three_d_estimator_setup_fee",
      "Setup fee",
      0,
      1000,
    ),
    machineRatePerHour: requiredFormNumber(
      formData,
      "three_d_estimator_machine_rate_per_hour",
      "Machine rate",
      0,
      500,
    ),
    minimumOrderPrice: requiredFormNumber(
      formData,
      "three_d_estimator_minimum_order_price",
      "Minimum order price",
      0,
      10_000,
    ),
    shellThicknessMm: requiredFormNumber(
      formData,
      "three_d_estimator_shell_thickness_mm",
      "Effective shell thickness",
      0.1,
      10,
    ),
    supportWastePercent: requiredFormNumber(
      formData,
      "three_d_estimator_support_waste_percent",
      "Support and waste allowance",
      0,
      200,
    ),
    rangeBelowPercent: requiredFormNumber(
      formData,
      "three_d_estimator_range_below_percent",
      "Lower estimate range",
      0,
      50,
    ),
    rangeAbovePercent: requiredFormNumber(
      formData,
      "three_d_estimator_range_above_percent",
      "Upper estimate range",
      0,
      100,
    ),
    qualityMultipliers: {
      draft: requiredFormNumber(
        formData,
        "three_d_estimator_quality_draft_multiplier",
        "Draft quality multiplier",
        0.1,
        5,
      ),
      standard: requiredFormNumber(
        formData,
        "three_d_estimator_quality_standard_multiplier",
        "Standard quality multiplier",
        0.1,
        5,
      ),
      fine: requiredFormNumber(
        formData,
        "three_d_estimator_quality_fine_multiplier",
        "Fine quality multiplier",
        0.1,
        5,
      ),
    },
    materials,
  };
}

export function toThreeDQuoteEstimatorConfig(
  values: ThreeDQuoteEstimatorAdminValues,
): ThreeDQuoteEstimatorConfig {
  return {
    materials: {
      PLA: { ...values.materials.PLA },
      PETG: { ...values.materials.PETG },
      ABS: { ...values.materials.ABS },
      TPU: { ...values.materials.TPU },
    },
    qualityTimeMultipliers: {
      ...values.qualityMultipliers,
    },
    setupFee: values.setupFee,
    machineRatePerHour: values.machineRatePerHour,
    minimumOrderPrice: values.minimumOrderPrice,
    effectiveShellThicknessCm: values.shellThicknessMm / 10,
    supportAndWasteFactor: 1 + values.supportWastePercent / 100,
    lowRangeFactor: 1 - values.rangeBelowPercent / 100,
    highRangeFactor: 1 + values.rangeAbovePercent / 100,
  };
}

export function getThreeDQuoteEstimatorConfig(
  rows: ThreeDQuoteEstimatorSettingRow[] | null | undefined,
): ThreeDQuoteEstimatorConfig {
  return toThreeDQuoteEstimatorConfig(
    readThreeDQuoteEstimatorAdminValues(rows),
  );
}

export function toThreeDQuoteEstimatorSettingRows(
  values: ThreeDQuoteEstimatorAdminValues,
  updatedAt = new Date().toISOString(),
) {
  const rows: Array<{
    setting_key: ThreeDQuoteEstimatorSettingKey;
    setting_value: string;
    updated_at: string;
  }> = [
    {
      setting_key: "three_d_estimator_setup_fee",
      setting_value: String(round(values.setupFee)),
      updated_at: updatedAt,
    },
    {
      setting_key: "three_d_estimator_machine_rate_per_hour",
      setting_value: String(round(values.machineRatePerHour)),
      updated_at: updatedAt,
    },
    {
      setting_key: "three_d_estimator_minimum_order_price",
      setting_value: String(round(values.minimumOrderPrice)),
      updated_at: updatedAt,
    },
    {
      setting_key: "three_d_estimator_shell_thickness_mm",
      setting_value: String(round(values.shellThicknessMm)),
      updated_at: updatedAt,
    },
    {
      setting_key: "three_d_estimator_support_waste_percent",
      setting_value: String(round(values.supportWastePercent)),
      updated_at: updatedAt,
    },
    {
      setting_key: "three_d_estimator_range_below_percent",
      setting_value: String(round(values.rangeBelowPercent)),
      updated_at: updatedAt,
    },
    {
      setting_key: "three_d_estimator_range_above_percent",
      setting_value: String(round(values.rangeAbovePercent)),
      updated_at: updatedAt,
    },
    {
      setting_key: "three_d_estimator_quality_draft_multiplier",
      setting_value: String(round(values.qualityMultipliers.draft)),
      updated_at: updatedAt,
    },
    {
      setting_key: "three_d_estimator_quality_standard_multiplier",
      setting_value: String(round(values.qualityMultipliers.standard)),
      updated_at: updatedAt,
    },
    {
      setting_key: "three_d_estimator_quality_fine_multiplier",
      setting_value: String(round(values.qualityMultipliers.fine)),
      updated_at: updatedAt,
    },
  ];

  for (const material of MATERIALS) {
    const keys = KEY_BY_MATERIAL[material];
    const profile = values.materials[material];

    rows.push(
      {
        setting_key: keys.price,
        setting_value: String(round(profile.sellingPricePerGram)),
        updated_at: updatedAt,
      },
      {
        setting_key: keys.density,
        setting_value: String(round(profile.densityGramsPerCm3)),
        updated_at: updatedAt,
      },
      {
        setting_key: keys.throughput,
        setting_value: String(round(profile.throughputGramsPerHour)),
        updated_at: updatedAt,
      },
    );
  }

  return rows;
}
