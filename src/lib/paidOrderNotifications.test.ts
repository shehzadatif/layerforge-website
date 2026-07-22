import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CompletedOrder } from "./quoteToOrder";

const mocks = vi.hoisted(() => ({
  markOrderNotificationSent: vi.fn(),
  sendAdminOrderNotification: vi.fn(),
  sendPaymentConfirmation: vi.fn(),
}));

vi.mock("./orders", () => ({
  markOrderNotificationSent: mocks.markOrderNotificationSent,
}));

vi.mock("./quoteToOrder", () => ({
  sendAdminOrderNotification: mocks.sendAdminOrderNotification,
  sendPaymentConfirmation: mocks.sendPaymentConfirmation,
}));

import { sendPaidOrderNotifications } from "./paidOrderNotifications";

function createOrder(overrides: Partial<CompletedOrder> = {}): CompletedOrder {
  return {
    id: "order-39",
    order_number: 39,
    customer_name: "Layer Forge Customer",
    email: "customer@example.com",
    subtotal: 100,
    shipping: 0,
    tax: 5,
    total: 105,
    created_at: "2026-07-22T03:46:01.659Z",
    tracking_token: "tracking-token",
    payment_confirmation_sent_at: null,
    admin_notification_sent_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  mocks.markOrderNotificationSent.mockResolvedValue(undefined);
  mocks.sendAdminOrderNotification.mockResolvedValue(undefined);
  mocks.sendPaymentConfirmation.mockResolvedValue(undefined);

  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

describe("sendPaidOrderNotifications", () => {
  it("sends and records both missing notifications", async () => {
    const order = createOrder();

    await sendPaidOrderNotifications(order, "Quote");

    expect(mocks.sendPaymentConfirmation).toHaveBeenCalledWith(order);
    expect(mocks.sendAdminOrderNotification).toHaveBeenCalledWith(order);
    expect(mocks.markOrderNotificationSent.mock.calls).toEqual([
      [order.id, "customer"],
      [order.id, "admin"],
    ]);
  });

  it("skips notifications that were already recorded", async () => {
    const order = createOrder({
      payment_confirmation_sent_at: "2026-07-22T03:46:02.643Z",
      admin_notification_sent_at: "2026-07-22T03:46:03.362Z",
    });

    await sendPaidOrderNotifications(order, "Quote");

    expect(mocks.sendPaymentConfirmation).not.toHaveBeenCalled();
    expect(mocks.sendAdminOrderNotification).not.toHaveBeenCalled();
    expect(mocks.markOrderNotificationSent).not.toHaveBeenCalled();
  });

  it("sends only the admin notification when the customer email is recorded", async () => {
    const order = createOrder({
      payment_confirmation_sent_at: "2026-07-22T03:46:02.643Z",
    });

    await sendPaidOrderNotifications(order, "Shop");

    expect(mocks.sendPaymentConfirmation).not.toHaveBeenCalled();
    expect(mocks.sendAdminOrderNotification).toHaveBeenCalledWith(order);
    expect(mocks.markOrderNotificationSent).toHaveBeenCalledOnce();
    expect(mocks.markOrderNotificationSent).toHaveBeenCalledWith(
      order.id,
      "admin",
    );
  });

  it("sends only the customer notification when the admin email is recorded", async () => {
    const order = createOrder({
      admin_notification_sent_at: "2026-07-22T03:46:03.362Z",
    });

    await sendPaidOrderNotifications(order, "Shop");

    expect(mocks.sendPaymentConfirmation).toHaveBeenCalledWith(order);
    expect(mocks.sendAdminOrderNotification).not.toHaveBeenCalled();
    expect(mocks.markOrderNotificationSent).toHaveBeenCalledOnce();
    expect(mocks.markOrderNotificationSent).toHaveBeenCalledWith(
      order.id,
      "customer",
    );
  });

  it("still attempts the admin email when the customer email fails", async () => {
    const order = createOrder();
    mocks.sendPaymentConfirmation.mockRejectedValueOnce(
      new Error("Resend customer failure"),
    );

    await expect(sendPaidOrderNotifications(order, "Quote")).rejects.toThrow(
      `One or more notifications for order ${order.id} could not be sent.`,
    );

    expect(mocks.sendAdminOrderNotification).toHaveBeenCalledWith(order);
    expect(mocks.markOrderNotificationSent).toHaveBeenCalledOnce();
    expect(mocks.markOrderNotificationSent).toHaveBeenCalledWith(
      order.id,
      "admin",
    );
  });

  it("records the customer email and returns failure when the admin email fails", async () => {
    const order = createOrder();
    mocks.sendAdminOrderNotification.mockRejectedValueOnce(
      new Error("Resend admin failure"),
    );

    await expect(sendPaidOrderNotifications(order, "Shop")).rejects.toThrow(
      `One or more notifications for order ${order.id} could not be sent.`,
    );

    expect(mocks.sendPaymentConfirmation).toHaveBeenCalledWith(order);
    expect(mocks.markOrderNotificationSent).toHaveBeenCalledOnce();
    expect(mocks.markOrderNotificationSent).toHaveBeenCalledWith(
      order.id,
      "customer",
    );
  });
});
