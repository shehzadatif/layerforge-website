import { describe, expect, it } from "vitest";
import { parseProductVariants, productVariantRow } from "./productVariants";

function apparelForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  const values = {
    variant_id: "",
    variant_name: "",
    variant_price: "34.99",
    variant_sku: "",
    apparel_garment_type: "hoodie",
    apparel_quality: "Premium",
    apparel_color_name: "Navy",
    apparel_color_hex: "#172554",
    apparel_size: "XL",
    inventory_quantity: "7",
    ...overrides,
  };
  Object.entries(values).forEach(([key, value]) => form.append(key, value));
  return form;
}

describe("apparel product variants", () => {
  it("creates a priced inventory combination", () => {
    const [variant] = parseProductVariants(apparelForm());
    expect(variant.name).toBe("Premium · Navy · XL");
    expect(variant.apparel).toEqual({
      garmentType: "hoodie",
      quality: "Premium",
      colorName: "Navy",
      colorHex: "#172554",
      size: "XL",
      inventoryQuantity: 7,
    });
    expect(productVariantRow("product-1", variant)).toMatchObject({
      apparel_garment_type: "hoodie",
      apparel_size: "XL",
      inventory_quantity: 7,
      price: 34.99,
    });
  });

  it("rejects incomplete stock data", () => {
    expect(() =>
      parseProductVariants(apparelForm({ inventory_quantity: "-1" })),
    ).toThrow("valid stock quantity");
  });
});
