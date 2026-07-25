import { describe, expect, it } from "vitest";

import { orderInProgressHtml } from "./orderInProgress";

describe("orderInProgressHtml", () => {
  it("includes the order number and tracking link", () => {
    const html = orderInProgressHtml(
      "Layer Forge Customer",
      "LF000030",
      "https://example.com/t/tracking-token",
    );

    expect(html).toContain("Your Layer Forge order is now in production");
    expect(html).toContain("LF000030");
    expect(html).toContain("https://example.com/t/tracking-token");
    expect(html).toContain("Track Order");
  });

  it("escapes customer-controlled values", () => {
    const html = orderInProgressHtml(
      '<Customer & "Friend">',
      "LF000031",
      "https://example.com/t/token?source=email&status=in-progress",
    );

    expect(html).toContain(
      "&lt;Customer &amp; &quot;Friend&quot;&gt;",
    );
    expect(html).toContain("source=email&amp;status=in-progress");
    expect(html).not.toContain('<Customer & "Friend">');
  });
});
