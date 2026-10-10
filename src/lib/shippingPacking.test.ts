import { describe, expect, it } from "vitest";

import {
  DEFAULT_STANDARD_BOXES,
  BULK_APPAREL_REVIEW_QUANTITY,
  defaultApparelUnitWeightLbs,
  estimateApparelShippingPlan,
  estimateShippingPackage,
  estimateShippingPackages,
  estimateResolvedShipmentPackingPlan,
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

describe("estimateShippingPackages", () => {
  it("uses two reference cartons when the quantity doubles", () => {
    expect(
      estimateShippingPackages(
        [{ productId: "mount", quantity: 12 }],
        new Map([["mount", mountProfile]]),
        options,
      ),
    ).toEqual([
      { weight: 1.45, length: 4, width: 2, height: 2 },
      { weight: 1.45, length: 4, width: 2, height: 2 },
    ]);
  });

  it("keeps an unconfigured order on the legacy single-package fallback", () => {
    expect(
      estimateShippingPackages(
        [{ productId: "unknown", quantity: 2 }],
        new Map(),
        options,
      ),
    ).toEqual([{ weight: 1.25, length: 8, width: 6, height: 4 }]);
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

describe("apparel packing", () => {
  it("uses a slim mailer for one T-shirt", () => {
    expect(
      estimateApparelShippingPlan([
        { garmentType: "t-shirt", size: "M", quantity: 1 },
      ]),
    ).toEqual({
      packages: [{ weight: 0.49, length: 13, width: 10, height: 1 }],
      packageType: "poly-mailer",
      bulkReviewRecommended: false,
    });
  });

  it("uses a gusseted mailer for two hoodies", () => {
    const plan = estimateApparelShippingPlan([
      { garmentType: "hoodie", size: "M", quantity: 2 },
    ]);

    expect(plan.packageType).toBe("poly-mailer");
    expect(plan.packages).toEqual([
      { weight: 2.79, length: 19, width: 14.5, height: 3 },
    ]);
  });

  it("splits 300 T-shirts into multiple apparel cartons", () => {
    const plan = estimateApparelShippingPlan([
      { garmentType: "t-shirt", size: "M", quantity: 300 },
    ]);

    expect(plan.packageType).toBe("apparel-carton");
    expect(plan.bulkReviewRecommended).toBe(true);
    expect(plan.packages).toHaveLength(7);
    expect(plan.packages.every((parcel) => parcel.length === 20)).toBe(true);
    expect(plan.packages.every((parcel) => parcel.weight < 38)).toBe(true);
  });

  it("flags only apparel orders above the review threshold", () => {
    expect(BULK_APPAREL_REVIEW_QUANTITY).toBe(96);
    expect(
      estimateApparelShippingPlan([
        { garmentType: "t-shirt", size: "M", quantity: 96 },
      ]).bulkReviewRecommended,
    ).toBe(false);
    expect(
      estimateApparelShippingPlan([
        { garmentType: "t-shirt", size: "M", quantity: 97 },
      ]).bulkReviewRecommended,
    ).toBe(true);
  });

  it("increases default apparel weight for extended sizes", () => {
    expect(defaultApparelUnitWeightLbs("t-shirt", "3XL")).toBeGreaterThan(
      defaultApparelUnitWeightLbs("t-shirt", "M"),
    );
    expect(defaultApparelUnitWeightLbs("hoodie", "XL")).toBeGreaterThan(
      defaultApparelUnitWeightLbs("t-shirt", "XL"),
    );
  });
});

describe("mixed-cart packing", () => {
  it("keeps apparel separate from rigid products and quotes both parcels", () => {
    const plan = estimateResolvedShipmentPackingPlan(
      [
        {
          productId: "mount",
          quantity: 4,
          shippingProfile: mountProfile,
        },
        {
          productId: "shirt",
          variantId: "shirt-white-large",
          quantity: 2,
          apparel: { garmentType: "t-shirt", size: "L" },
        },
      ],
      options,
    );

    expect(plan.packageType).toBe("mixed");
    expect(plan.packages).toEqual([
      { weight: 1.05, length: 4, width: 2, height: 2 },
      { weight: 1.06, length: 15.5, width: 12, height: 2 },
    ]);
  });
});
