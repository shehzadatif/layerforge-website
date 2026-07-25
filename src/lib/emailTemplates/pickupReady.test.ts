import { describe, expect, it } from "vitest";

import { pickupReadyHtml } from "./pickupReady";

describe("pickupReadyHtml", () => {
  it("includes the pickup address, scheduling phone, map link, and order link", () => {
    const html = pickupReadyHtml(
      "Layer Forge Customer",
      "LF000123",
      "123 Example Avenue\nSurrey, BC",
      "604-555-0100",
      "https://example.com/t/tracking-token",
    );

    expect(html).toContain("Your Layer Forge order is ready for pickup");
    expect(html).toContain("123 Example Avenue<br>Surrey, BC");
    expect(html).toContain('href="tel:6045550100"');
    expect(html).toContain("604-555-0100");
    expect(html).toContain("confirm your scheduled pickup time before arriving");
    expect(html).toContain(
      "query=123%20Example%20Avenue%2C%20Surrey%2C%20BC",
    );
    expect(html).toContain("https://example.com/t/tracking-token");
  });

  it("escapes customer-controlled and settings-provided text", () => {
    const html = pickupReadyHtml(
      '<Customer & "Friend">',
      "LF000456",
      "123 Example & Main",
      "604-555-0100",
      "https://example.com/t/token?source=email&status=ready",
    );

    expect(html).toContain(
      "&lt;Customer &amp; &quot;Friend&quot;&gt;",
    );
    expect(html).toContain("123 Example &amp; Main");
    expect(html).toContain("source=email&amp;status=ready");
    expect(html).not.toContain('<Customer & "Friend">');
  });
});
