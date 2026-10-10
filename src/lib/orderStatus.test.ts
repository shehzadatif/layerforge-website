import { describe, expect, it } from "vitest";

import {
  getNextButtonLabel,
  getNextOrderStatus,
  getOrderStatusDisplayLabel,
  ORDER_STATUS,
} from "./orderStatus";

describe("order status workflow", () => {
  it("does not let shipping orders bypass tracking after production", () => {
    expect(getNextOrderStatus(ORDER_STATUS.READY, false)).toBeNull();
    expect(getNextButtonLabel(ORDER_STATUS.READY, false)).toBe("");
  });

  it("lets pickup orders complete after they are ready", () => {
    expect(getNextOrderStatus(ORDER_STATUS.READY, true)).toBe(
      ORDER_STATUS.COMPLETED,
    );
    expect(getNextButtonLabel(ORDER_STATUS.READY, true)).toContain(
      "Complete Pickup",
    );
  });

  it("uses customer-friendly labels for the ready state", () => {
    expect(getOrderStatusDisplayLabel(ORDER_STATUS.READY, true)).toBe(
      "Ready for Pickup",
    );
    expect(getOrderStatusDisplayLabel(ORDER_STATUS.READY, false)).toBe(
      "Production Complete",
    );
  });
});
