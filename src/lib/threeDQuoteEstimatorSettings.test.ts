import { describe, expect, it } from "vitest";

import {
  DEFAULT_THREE_D_QUOTE_ESTIMATOR_ADMIN_VALUES,
  getThreeDQuoteEstimatorConfig,
  parseThreeDQuoteEstimatorFormData,
  readThreeDQuoteEstimatorAdminValues,
  ThreeDQuoteEstimatorSettingsError,
  toThreeDQuoteEstimatorSettingRows,
} from "./threeDQuoteEstimatorSettings";

describe("threeDQuoteEstimatorSettings", () => {
  it("uses safe defaults when settings are missing", () => {
    const values = readThreeDQuoteEstimatorAdminValues([]);

    expect(values).toEqual(DEFAULT_THREE_D_QUOTE_ESTIMATOR_ADMIN_VALUES);

    const config = getThreeDQuoteEstimatorConfig([]);

    expect(config.materials.PLA.sellingPricePerGram).toBe(0.13);
    expect(config.machineRatePerHour).toBe(3.5);
    expect(config.lowRangeFactor).toBeCloseTo(0.92);
    expect(config.highRangeFactor).toBeCloseTo(1.12);
  });

  it("applies stored pricing and calibration overrides", () => {
    const values = readThreeDQuoteEstimatorAdminValues([
      {
        setting_key: "three_d_estimator_pla_price_per_gram",
        setting_value: "0.25",
      },
      {
        setting_key: "three_d_estimator_machine_rate_per_hour",
        setting_value: "4.75",
      },
      {
        setting_key: "three_d_estimator_range_below_percent",
        setting_value: "5",
      },
      {
        setting_key: "three_d_estimator_range_above_percent",
        setting_value: "8",
      },
    ]);

    expect(values.materials.PLA.sellingPricePerGram).toBe(0.25);
    expect(values.machineRatePerHour).toBe(4.75);

    const config = getThreeDQuoteEstimatorConfig(
      toThreeDQuoteEstimatorSettingRows(values),
    );

    expect(config.materials.PLA.sellingPricePerGram).toBe(0.25);
    expect(config.machineRatePerHour).toBe(4.75);
    expect(config.lowRangeFactor).toBeCloseTo(0.95);
    expect(config.highRangeFactor).toBeCloseTo(1.08);
  });

  it("falls back instead of accepting invalid stored values", () => {
    const values = readThreeDQuoteEstimatorAdminValues([
      {
        setting_key: "three_d_estimator_pla_price_per_gram",
        setting_value: "-2",
      },
      {
        setting_key: "three_d_estimator_shell_thickness_mm",
        setting_value: "not-a-number",
      },
    ]);

    expect(values.materials.PLA.sellingPricePerGram).toBe(0.13);
    expect(values.shellThicknessMm).toBe(0.8);
  });

  it("validates administrator form values", () => {
    const formData = new FormData();

    for (const row of toThreeDQuoteEstimatorSettingRows(
      DEFAULT_THREE_D_QUOTE_ESTIMATOR_ADMIN_VALUES,
    )) {
      formData.set(row.setting_key, row.setting_value);
    }

    formData.set("three_d_estimator_pla_price_per_gram", "0.27");

    expect(
      parseThreeDQuoteEstimatorFormData(formData).materials.PLA
        .sellingPricePerGram,
    ).toBe(0.27);

    formData.set("three_d_estimator_machine_rate_per_hour", "-1");

    expect(() => parseThreeDQuoteEstimatorFormData(formData)).toThrow(
      ThreeDQuoteEstimatorSettingsError,
    );
  });
});
