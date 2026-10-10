import { describe, expect, it } from "vitest";

import { shippingConfirmationHtml } from "./shippingConfirmation";

describe("shippingConfirmationHtml", () => {
  it("contains the carrier, tracking number and both tracking links", () => {
    const html = shippingConfirmationHtml(
      "Jane Customer",
      "LF000123",
      "Canada Post",
      "TRACK123",
      "https://carrier.example/TRACK123",
      "https://example.com/t/order-token",
    );

    expect(html).toContain("Canada Post");
    expect(html).toContain("TRACK123");
    expect(html).toContain("https://carrier.example/TRACK123");
    expect(html).toContain("https://example.com/t/order-token");
  });
});
