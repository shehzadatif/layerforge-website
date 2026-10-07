import { describe, expect, it } from "vitest";

import { orderShippedHtml } from "./orderShipped";

describe("orderShippedHtml", () => {
  it("includes a shipped message and order tracking link without carrier details", () => {
    const html = orderShippedHtml(
      "Layer Forge Customer",
      "LF000030",
      "https://example.com/t/tracking-token",
    );

    expect(html).toContain("Your Layer Forge order has shipped");
    expect(html).toContain("LF000030");
    expect(html).toContain(
      "Carrier and tracking details will be added to your order page when available.",
    );
    expect(html).toContain("https://example.com/t/tracking-token");
  });

  it("includes carrier and package tracking details when available", () => {
    const html = orderShippedHtml(
      "Layer Forge Customer",
      "LF000031",
      "https://example.com/t/order-token",
      "Canada Post",
      "CX123456789CA",
      "https://www.canadapost-postescanada.ca/track-reperage/en#/details/CX123456789CA",
    );

    expect(html).toContain("Carrier: Canada Post");
    expect(html).toContain("Tracking number: CX123456789CA");
    expect(html).toContain("Track Package");
  });

  it("escapes text and rejects non-http tracking URLs", () => {
    const html = orderShippedHtml(
      '<Customer & "Friend">',
      "LF000032",
      "https://example.com/t/token?source=email&status=shipped",
      "Carrier & Co.",
      '<tracking-"number">',
      "javascript:alert(1)",
    );

    expect(html).toContain(
      "&lt;Customer &amp; &quot;Friend&quot;&gt;",
    );
    expect(html).toContain("Carrier &amp; Co.");
    expect(html).toContain("&lt;tracking-&quot;number&quot;&gt;");
    expect(html).toContain("source=email&amp;status=shipped");
    expect(html).not.toContain("javascript:alert(1)");
  });
});
