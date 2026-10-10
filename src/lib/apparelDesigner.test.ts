import { describe, expect, it } from "vitest";
import {
  getApparelPrintClass,
  getApparelUnitPriceCents,
  parseApparelDesignData,
} from "./apparelDesigner";

const front = {
  artworkPath: "incoming/123e4567-e89b-12d3-a456-426614174000/front.png",
  originalName: "logo.png",
  mimeType: "image/png",
  widthIn: 10,
  heightIn: 8,
  xPercent: 50,
  yPercent: 45,
};

describe("apparel designer", () => {
  it("normalizes a valid design", () => {
    const design = parseApparelDesignData({
      size: "xl",
      colorId: "black",
      quality: "Premium",
      sides: { front },
    });

    expect(design.size).toBe("XL");
    expect(design.colorName).toBe("Black");
    expect(design.sides.front?.widthIn).toBe(10);
  });

  it("charges the configured extra amount only for two printed sides", () => {
    const smallFront = { ...front, widthIn: 4, heightIn: 4 };
    const oneSide = parseApparelDesignData({
      size: "L",
      colorId: "navy",
      quality: "Standard",
      sides: { front: smallFront },
    });
    const twoSides = parseApparelDesignData({
      size: "L",
      colorId: "navy",
      quality: "Standard",
      sides: {
        front: smallFront,
        back: {
          ...smallFront,
          artworkPath: "incoming/123e4567-e89b-12d3-a456-426614174001/back.png",
        },
      },
    });

    expect(getApparelUnitPriceCents(2500, 800, oneSide)).toBe(2500);
    expect(getApparelUnitPriceCents(2500, 800, twoSides)).toBe(3300);
  });

  it("classifies artwork dimensions and prices each printed side", () => {
    expect(getApparelPrintClass({ widthIn: 4, heightIn: 4 })).toBe("small");
    expect(getApparelPrintClass({ widthIn: 10, heightIn: 4 })).toBe("standard");
    expect(getApparelPrintClass({ widthIn: 10, heightIn: 8 })).toBe("large");

    const design = parseApparelDesignData({
      size: "L",
      colorId: "black",
      quality: "Standard",
      sides: {
        front: { ...front, widthIn: 10, heightIn: 4 },
        back: {
          ...front,
          artworkPath: "incoming/123e4567-e89b-12d3-a456-426614174001/back.png",
        },
      },
    });

    expect(
      getApparelUnitPriceCents(2499, 800, design, {
        standardSurchargeCents: 400,
        largeSurchargeCents: 800,
      }),
    ).toBe(4499);
  });

  it("rejects invalid sizes and untrusted artwork paths", () => {
    expect(() =>
      parseApparelDesignData({
        size: "child",
        colorId: "black",
        quality: "Premium",
        sides: { front },
      }),
    ).toThrow("valid apparel size");

    expect(() =>
      parseApparelDesignData({
        size: "L",
        colorId: "black",
        quality: "Premium",
        sides: {
          front: { ...front, artworkPath: "https://example.com/file.png" },
        },
      }),
    ).toThrow("artwork path is invalid");
  });
});
