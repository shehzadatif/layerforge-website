import { describe, expect, it } from "vitest";

import {
  customerRateFromCost,
  DEFAULT_THREE_D_QUOTE_PRICING,
  grossMarginMultiplier,
  parseThreeDQuotePricingInput,
  parseThreeDQuotePricingRows,
  THREE_D_QUOTE_PRICING_KEYS,
  threeDQuotePricingSettingValues,
} from "./threeDQuotePricing";

describe("3D quote pricing settings", () => {
  it("converts direct cost into a gross-margin customer rate", () => {
    expect(grossMarginMultiplier(40)).toBeCloseTo(1.6667, 4);
    expect(customerRateFromCost(6, 40)).toBeCloseTo(10, 2);
    expect(customerRateFromCost(10, 0)).toBe(10);
  });

  it("loads saved setting rows and preserves defaults for missing values", () => {
    const pricing = parseThreeDQuotePricingRows([
      {
        setting_key: THREE_D_QUOTE_PRICING_KEYS.targetMarginPercent,
        setting_value: "55",
      },
      {
        setting_key: THREE_D_QUOTE_PRICING_KEYS.materialCostPerGram.PLA,
        setting_value: "0.05",
      },
    ]);

    expect(pricing.targetMarginPercent).toBe(55);
    expect(pricing.materials.PLA.costPerGram).toBe(0.05);
    expect(pricing.materials.PETG.costPerGram).toBe(
      DEFAULT_THREE_D_QUOTE_PRICING.materials.PETG.costPerGram,
    );
  });

  it("validates admin input and serializes every setting", () => {
    const values = new Map(
      threeDQuotePricingSettingValues(DEFAULT_THREE_D_QUOTE_PRICING).map(
        (row) => [row.setting_key, row.setting_value],
      ),
    );
    values.set(THREE_D_QUOTE_PRICING_KEYS.targetMarginPercent, "45");

    const pricing = parseThreeDQuotePricingInput((key) => values.get(key));
    const rows = threeDQuotePricingSettingValues(pricing);

    expect(pricing.targetMarginPercent).toBe(45);
    expect(rows).toHaveLength(15);
  });

  it("rejects an impossible target margin", () => {
    const values = new Map(
      threeDQuotePricingSettingValues(DEFAULT_THREE_D_QUOTE_PRICING).map(
        (row) => [row.setting_key, row.setting_value],
      ),
    );
    values.set(THREE_D_QUOTE_PRICING_KEYS.targetMarginPercent, "99");

    expect(() =>
      parseThreeDQuotePricingInput((key) => values.get(key)),
    ).toThrow("Target profit margin");
  });
});
