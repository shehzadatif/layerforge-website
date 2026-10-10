import { describe, expect, it } from "vitest";

import { productionCompleteHtml } from "./productionComplete";

describe("productionCompleteHtml", () => {
  it("explains that production is complete and shipping details will follow", () => {
    const html = productionCompleteHtml(
      "Jane Customer",
      "LF000123",
      "https://example.com/t/token",
    );

    expect(html).toContain("Production is complete");
    expect(html).toContain("LF000123");
    expect(html).toContain("carrier and tracking details");
    expect(html).toContain("https://example.com/t/token");
  });
});
