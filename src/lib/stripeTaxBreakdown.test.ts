import { describe, expect, it } from "vitest";
import type Stripe from "stripe";

import { getPaidSessionAmounts } from "./stripeTaxBreakdown";

describe("paid Stripe session amounts", () => {
  it("reads the configured GST and PST amounts from checkout metadata", () => {
    const session = {
      amount_total: 4144,
      metadata: {
        taxCalculationVersion: "admin-config-v1",
        merchandiseSubtotalCents: "2200",
        shippingCents: "1500",
        gstRate: "5",
        gstAmountCents: "185",
        pstRate: "7",
        pstAmountCents: "259",
      },
    } as unknown as Stripe.Checkout.Session;

    expect(getPaidSessionAmounts(session)).toEqual({
      subtotal: 22,
      shipping: 15,
      gstRate: 5,
      gstAmount: 1.85,
      pstRate: 7,
      pstAmount: 2.59,
      tax: 4.44,
      total: 41.44,
    });
  });

  it("preserves legacy automatic-tax totals when no manual metadata exists", () => {
    const session = {
      amount_subtotal: 2200,
      amount_total: 3959,
      metadata: {},
      shipping_cost: {
        amount_subtotal: 1500,
        amount_tax: 105,
        amount_total: 1605,
      },
      total_details: {
        amount_tax: 259,
        breakdown: { taxes: [] },
      },
    } as unknown as Stripe.Checkout.Session;

    expect(getPaidSessionAmounts(session)).toMatchObject({
      subtotal: 22,
      shipping: 15,
      gstAmount: 0,
      pstAmount: 0,
      tax: 2.59,
      total: 39.59,
    });
  });

  it("removes shipping tax when Stripe omits the shipping subtotal", () => {
    const session = {
      amount_subtotal: 2200,
      amount_total: 3959,
      metadata: {},
      shipping_cost: { amount_tax: 105, amount_total: 1605 },
      total_details: {
        amount_tax: 259,
        breakdown: { taxes: [] },
      },
    } as unknown as Stripe.Checkout.Session;

    expect(getPaidSessionAmounts(session).shipping).toBe(15);
  });
});
