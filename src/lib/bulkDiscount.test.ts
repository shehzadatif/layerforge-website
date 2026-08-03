import { describe, expect, it } from "vitest";

import {
  calculateBulkDiscount,
  getBulkDiscountPercentage,
  getDiscountedUnitPriceCents,
  getNextBulkDiscountTier,
  parseBulkDiscountConfig,
} from "./bulkDiscount";

describe("bulk discount tiers", () => {
  it.each([
    [0, 0],
    [4, 0],
    [5, 5],
    [9, 5],
    [10, 10],
    [19, 10],
    [20, 15],
    [100, 15],
  ])(
    "uses the expected tier at %s eligible items",
    (quantity, expectedPercentage) => {
      expect(getBulkDiscountPercentage(quantity)).toBe(expectedPercentage);
    },
  );

  it("uses the combined quantity of eligible cart items", () => {
    expect(
      calculateBulkDiscount([
        { price: 10, quantity: 3, bulkDiscountEligible: true },
        { price: 20, quantity: 2, bulkDiscountEligible: true },
      ]),
    ).toEqual({
      totalQuantity: 5,
      eligibleQuantity: 5,
      discountPercentage: 5,
      subtotalCents: 7000,
      eligibleSubtotalCents: 7000,
      discountedSubtotalCents: 6650,
      discountCents: 350,
    });
  });

  it("does not count or discount ineligible products", () => {
    expect(
      calculateBulkDiscount([
        { price: 10, quantity: 5, bulkDiscountEligible: true },
        { price: 100, quantity: 20, bulkDiscountEligible: false },
      ]),
    ).toEqual({
      totalQuantity: 25,
      eligibleQuantity: 5,
      discountPercentage: 5,
      subtotalCents: 205000,
      eligibleSubtotalCents: 5000,
      discountedSubtotalCents: 204750,
      discountCents: 250,
    });
  });

  it("rounds discounted unit prices to the nearest cent", () => {
    expect(getDiscountedUnitPriceCents(999, 5)).toBe(949);

    expect(
      calculateBulkDiscount([
        { price: 9.99, quantity: 5, bulkDiscountEligible: true },
      ]),
    ).toEqual({
      totalQuantity: 5,
      eligibleQuantity: 5,
      discountPercentage: 5,
      subtotalCents: 4995,
      eligibleSubtotalCents: 4995,
      discountedSubtotalCents: 4745,
      discountCents: 250,
    });
  });

  it("supports admin-defined tiers and a global off switch", () => {
    const config = parseBulkDiscountConfig({
      bulk_discount_enabled: "true",
      bulk_discount_tier_1_minimum_quantity: "3",
      bulk_discount_tier_1_percentage: "4",
      bulk_discount_tier_2_minimum_quantity: "8",
      bulk_discount_tier_2_percentage: "8",
      bulk_discount_tier_3_minimum_quantity: "12",
      bulk_discount_tier_3_percentage: "12",
    });

    expect(getBulkDiscountPercentage(8, config)).toBe(8);
    expect(
      getBulkDiscountPercentage(20, {
        ...config,
        enabled: false,
      }),
    ).toBe(0);
  });

  it("describes the next available tier", () => {
    expect(getNextBulkDiscountTier(7)).toEqual({
      minimumQuantity: 10,
      percentage: 10,
      quantityNeeded: 3,
    });
    expect(getNextBulkDiscountTier(20)).toBeNull();
  });
});
