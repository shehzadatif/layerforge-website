import { describe, expect, it } from "vitest";

import { ORDER_STATUS } from "./orderStatus";
import { getOrderStatusEmailKind } from "./orderStatusEmail";

describe("getOrderStatusEmailKind", () => {
  it("sends an in-progress email only when entering In Progress", () => {
    expect(
      getOrderStatusEmailKind({
        previousStatus: ORDER_STATUS.NEW,
        requestedStatus: ORDER_STATUS.IN_PROGRESS,
        isPickupOrder: false,
      }),
    ).toBe("in_progress");

    expect(
      getOrderStatusEmailKind({
        previousStatus: ORDER_STATUS.IN_PROGRESS,
        requestedStatus: ORDER_STATUS.IN_PROGRESS,
        isPickupOrder: false,
      }),
    ).toBeNull();
  });

  it("keeps pickup-ready emails retryable", () => {
    expect(
      getOrderStatusEmailKind({
        previousStatus: ORDER_STATUS.IN_PROGRESS,
        requestedStatus: ORDER_STATUS.READY,
        isPickupOrder: true,
      }),
    ).toBe("pickup_ready");

    expect(
      getOrderStatusEmailKind({
        previousStatus: ORDER_STATUS.READY,
        requestedStatus: ORDER_STATUS.READY,
        isPickupOrder: true,
      }),
    ).toBe("pickup_ready");
  });

  it("does not send a pickup-ready email for shipped orders", () => {
    expect(
      getOrderStatusEmailKind({
        previousStatus: ORDER_STATUS.IN_PROGRESS,
        requestedStatus: ORDER_STATUS.READY,
        isPickupOrder: false,
      }),
    ).toBeNull();
  });

  it("sends a shipped email only when a delivery order enters Shipped", () => {
    expect(
      getOrderStatusEmailKind({
        previousStatus: ORDER_STATUS.READY,
        requestedStatus: ORDER_STATUS.SHIPPED,
        isPickupOrder: false,
      }),
    ).toBe("shipped");

    expect(
      getOrderStatusEmailKind({
        previousStatus: ORDER_STATUS.SHIPPED,
        requestedStatus: ORDER_STATUS.SHIPPED,
        isPickupOrder: false,
      }),
    ).toBeNull();

    expect(
      getOrderStatusEmailKind({
        previousStatus: ORDER_STATUS.READY,
        requestedStatus: ORDER_STATUS.SHIPPED,
        isPickupOrder: true,
      }),
    ).toBeNull();
  });

  it("sends completion email only on the transition into Completed", () => {
    expect(
      getOrderStatusEmailKind({
        previousStatus: ORDER_STATUS.READY,
        requestedStatus: ORDER_STATUS.COMPLETED,
        isPickupOrder: true,
      }),
    ).toBe("completed");

    expect(
      getOrderStatusEmailKind({
        previousStatus: ORDER_STATUS.COMPLETED,
        requestedStatus: ORDER_STATUS.COMPLETED,
        isPickupOrder: true,
      }),
    ).toBeNull();
  });
});
