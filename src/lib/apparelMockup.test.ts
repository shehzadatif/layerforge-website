import { describe, expect, it } from "vitest";
import {
  getGarmentMockupColourFilter,
  getGarmentMockupImage,
  getGarmentPrintArea,
} from "./apparelMockup";

describe("apparel mockup garment image", () => {
  it("pins supported front colours to their matching mockup asset", () => {
    expect(
      getGarmentMockupImage({
        side: "front",
        garmentType: "t-shirt",
        colorName: "Black",
        frontImage: "https://example.com/black-front.jpg",
      }),
    ).toBe("/images/apparel/gildan-g640-front-photo-1.jpg");
  });

  it("uses the dark photo base and the right colour filter for navy", () => {
    expect(
      getGarmentMockupImage({
        side: "front",
        garmentType: "t-shirt",
        colorName: "Navy",
      }),
    ).toBe("/images/apparel/gildan-g640-front-photo-1.jpg");
    expect(getGarmentMockupColourFilter("t-shirt", " Navy ")).toBe("navy");
  });

  it("uses the dark back photo and the right colour filter for charcoal", () => {
    expect(
      getGarmentMockupImage({
        side: "back",
        garmentType: "t-shirt",
        colorName: "Charcoal",
      }),
    ).toBe("/images/apparel/gildan-g640-black-back.png");
    expect(getGarmentMockupColourFilter("t-shirt", "Charcoal")).toBe(
      "charcoal",
    );
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
