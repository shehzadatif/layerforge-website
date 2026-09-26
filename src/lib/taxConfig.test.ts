import { describe, expect, it } from "vitest";

import { calculateSalesTaxes, parseSalesTaxConfig } from "./taxConfig";

describe("sales tax configuration", () => {
  it("defaults to GST disabled and 7% BC PST enabled", () => {
    expect(calculateSalesTaxes(3700, "BC")).toEqual({
      taxableAmountCents: 3700,
      gstRate: 0,
      gstAmountCents: 0,
      pstRate: 7,
      pstAmountCents: 259,
      totalTaxCents: 259,
      totalCents: 3959,
    });
  });

  it("does not apply BC PST to another province", () => {
    expect(calculateSalesTaxes(10000, "AB").pstAmountCents).toBe(0);
    expect(calculateSalesTaxes(10000, "AB").totalTaxCents).toBe(0);
  });

  it("uses admin-defined rates and enable switches", () => {
    const config = parseSalesTaxConfig({
      gst_enabled: "false",
      gst_rate: "6.25",
      pst_enabled: "true",
      pst_rate: "8.5",
    });

    expect(calculateSalesTaxes(10000, "BC", config)).toMatchObject({
      gstRate: 0,
      gstAmountCents: 0,
      pstRate: 8.5,
      pstAmountCents: 850,
    });
  });

  it("rounds each tax amount to the nearest cent", () => {
    expect(
      calculateSalesTaxes(999, "BC", {
        gstEnabled: true,
        gstRate: 5,
        pstEnabled: true,
        pstRate: 7,
      }),
    ).toMatchObject({
      gstAmountCents: 50,
      pstAmountCents: 70,
    });
  });
});
