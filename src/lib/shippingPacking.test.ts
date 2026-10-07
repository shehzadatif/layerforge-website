import { describe, expect, it } from "vitest";

import {
  DEFAULT_STANDARD_BOXES,
  estimateShippingPackage,
  parseProductShippingProfile,
  parseStandardBoxes,
  type ProductShippingProfile,
} from "./shippingPacking";

const options = {
  defaultItemWeightLbs: 0.5,
  packagingWeightLbs: 0.25,
  fallbackLengthIn: 8,
  fallbackWidthIn: 6,
  fallbackHeightIn: 4,
  standardBoxes: DEFAULT_STANDARD_BOXES,
};

const mountProfile: ProductShippingProfile = {
  unitWeightLbs: 0.2,
  referenceQuantity: 6,
  lengthIn: 4,
  widthIn: 2,
  heightIn: 2,
};

describe("estimateShippingPackage", () => {
  it("uses the reference box when the ordered quantity matches the test pack", () => {
    expect(
      estimateShippingPackage(
        [{ productId: "mount", quantity: 6 }],
        new Map([["mount", mountProfile]]),
        options,
      ),
    ).toEqual({
      weight: 1.45,
      length: 4,
      width: 2,
      height: 2,
    });
  });

  it("selects the next standard box as packed volume increases", () => {
    expect(
      estimateShippingPackage(
        [{ productId: "mount", quantity: 7 }],
        new Map([["mount", mountProfile]]),
        options,
      ),
    ).toEqual({
      weight: 1.65,
      length: 6,
      width: 4,
      height: 3,
    });
  });

  it("combines configured product volumes and weights", () => {
    const secondProfile: ProductShippingProfile = {
      unitWeightLbs: 0.5,
      referenceQuantity: 2,
      lengthIn: 6,
      widthIn: 4,
      heightIn: 3,
    };

    expect(
      estimateShippingPackage(
        [
          { productId: "mount", quantity: 6 },
          { productId: "second", quantity: 2 },
        ],
        new Map([
          ["mount", mountProfile],
          ["second", secondProfile],
        ]),
        options,
      ),
    ).toEqual({
      weight: 2.45,
      length: 8,
      width: 6,
      height: 4,
    });
  });

  it("keeps legacy package dimensions when any product is unconfigured", () => {
    expect(
      estimateShippingPackage(
        [
          { productId: "mount", quantity: 6 },
          { productId: "unknown", quantity: 1 },
        ],
        new Map([["mount", mountProfile]]),
        options,
      ),
    ).toEqual({
      weight: 1.95,
      length: 8,
      width: 6,
      height: 4,
    });
  });
});

describe("shipping profile parsing", () => {
  it("parses stored product profiles", () => {
    expect(parseProductShippingProfile(JSON.stringify(mountProfile))).toEqual(
      mountProfile,
    );
  });

  it("falls back when a standard-box setting is invalid", () => {
    expect(parseStandardBoxes("not-a-box")).toEqual(DEFAULT_STANDARD_BOXES);
  });

  it("parses configurable standard boxes", () => {
    expect(parseStandardBoxes("4x2x2, 8x6x4")).toEqual([
      { length: 4, width: 2, height: 2 },
      { length: 8, width: 6, height: 4 },
    ]);
  });
});
