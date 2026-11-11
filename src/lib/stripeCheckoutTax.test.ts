import { describe, expect, it } from "vitest";

import {
  attachCheckoutCustomer,
  isLocalPickupCheckout,
  LOCAL_PICKUP_TAX_ADDRESS,
} from "./stripeCheckoutTax";

describe("Stripe Checkout tax location", () => {
  it("recognizes a local-pickup shipping option", () => {
    expect(
      isLocalPickupCheckout({
        mode: "payment",
        success_url: "https://example.com/success",
        shipping_options: [
          {
            shipping_rate_data: {
              display_name: "Local Pickup",
              type: "fixed_amount",
              fixed_amount: {
                amount: 0,
                currency: "cad",
              },
            },
          },
        ],
      }),
    ).toBe(true);
  });

  it("does not classify regular shipping as local pickup", () => {
    expect(
      isLocalPickupCheckout({
        mode: "payment",
        success_url: "https://example.com/success",
        shipping_options: [
          {
            shipping_rate_data: {
              display_name: "Shipping to BC",
              type: "fixed_amount",
              fixed_amount: {
                amount: 1500,
                currency: "cad",
              },
            },
          },
        ],
      }),
    ).toBe(false);
  });

  it("attaches a Stripe customer without retaining customer_email", () => {
    const params = attachCheckoutCustomer(
      {
        mode: "payment",
        success_url: "https://example.com/success",
        customer_email: "customer@example.com",
      },
      "cus_pickup",
    );

    expect(params.customer).toBe("cus_pickup");
    expect(params.customer_email).toBeUndefined();
  });

  it("uses the public Surrey, BC pickup area without storing a street address", () => {
    expect(LOCAL_PICKUP_TAX_ADDRESS).toEqual({
      city: "Surrey",
      state: "BC",
      country: "CA",
    });
    expect(LOCAL_PICKUP_TAX_ADDRESS.line1).toBeUndefined();
  });
});
