import { describe, expect, it } from "vitest";
import { getGarmentMockupImage } from "./apparelMockup";

describe("apparel mockup garment image", () => {
  it("uses the uploaded colour image for the front", () => {
    expect(
      getGarmentMockupImage({
        side: "front",
        garmentType: "t-shirt",
        colorName: "Black",
        frontImage: "https://example.com/black-front.jpg",
      }),
    ).toBe("https://example.com/black-front.jpg");
  });

  it("uses the matching T-shirt back image for supported colours", () => {
    expect(
      getGarmentMockupImage({
        side: "back",
        garmentType: "t-shirt",
        colorName: " White ",
        frontImage: "https://example.com/white-front.jpg",
      }),
    ).toBe("/images/apparel/gildan-g640-white-back.jpg");
  });

  it("never reuses a front image for the back of an unsupported garment", () => {
    expect(
      getGarmentMockupImage({
        side: "back",
        garmentType: "hoodie",
        colorName: "Black",
        frontImage: "https://example.com/hoodie-front.jpg",
      }),
    ).toBeUndefined();
  });
});
