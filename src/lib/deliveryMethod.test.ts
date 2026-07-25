import { describe, expect, it } from "vitest";

import {
  isPickupDeliveryMethod,
  normalizeDeliveryMethod,
} from "./deliveryMethod";

describe("delivery method normalization", () => {
  it.each([
    "pickup",
    " Pickup ",
    "PICK UP",
    "Local Pickup",
    "local_pickup",
    "LOCAL-PICKUP",
    "local pick up",
  ])("recognizes %s as local pickup", (value) => {
    expect(isPickupDeliveryMethod(value)).toBe(true);
  });

  it.each(["shipping", "ship to address", "", null, undefined])(
    "does not recognize %s as local pickup",
    (value) => {
      expect(isPickupDeliveryMethod(value)).toBe(false);
    },
  );

  it("normalizes whitespace and separators", () => {
    expect(normalizeDeliveryMethod("  LOCAL__PICK-UP  ")).toBe(
      "local pick up",
    );
  });
});
