import { describe, expect, it } from "vitest";
import { getGarmentMockupImage, getGarmentPrintArea } from "./apparelMockup";

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
    ).toBe("/images/apparel/gildan-g640-white-back.png");
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

describe("apparel mockup physical scale", () => {
  it("calibrates the printable area to the selected shirt dimensions", () => {
    const large = getGarmentPrintArea({ garmentType: "t-shirt", size: "L" });

    expect(large.widthPercent).toBeCloseTo(28.36, 2);
    expect(large.heightPercent).toBeCloseTo(43.73, 2);
  });

  it("shows the same physical print smaller on a larger shirt", () => {
    const medium = getGarmentPrintArea({ garmentType: "t-shirt", size: "M" });
    const extraLarge = getGarmentPrintArea({
      garmentType: "t-shirt",
      size: "XL",
    });

    expect(extraLarge.widthPercent).toBeLessThan(medium.widthPercent);
    expect(extraLarge.heightPercent).toBeLessThan(medium.heightPercent);
  });
});
