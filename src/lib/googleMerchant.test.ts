import { describe, expect, it } from "vitest";

import {
  buildGoogleMerchantFeed,
  buildProductStructuredData,
  getMerchantPrice,
  serializeJsonLd,
  toMerchantListing,
} from "./googleMerchant";

const product = {
  id: "product-id",
  name: "Custom QR & Stand",
  slug: "custom-qr-stand",
  sku: "LF-P-000001",
  short_description: "A <strong>custom</strong> display.",
  price: 20,
  sale_price: 15,
  product_images: [{ image_url: "qr.webp", sort_order: 0 }],
  product_materials: [{ materials: { markup_percent: 10 } }],
};

describe("Google Merchant product data", () => {
  it("uses the sale price and lowest material adjustment", () => {
    expect(getMerchantPrice(product)).toBe(16.5);
  });

  it("normalizes a database product into a Merchant listing", () => {
    expect(
      toMerchantListing(
        product,
        "https://layerforgecanada.com",
        "https://cdn.example.com/products",
      ),
    ).toEqual({
      id: "LF-P-000001",
      title: "Custom QR & Stand",
      description: "A custom display.",
      link: "https://layerforgecanada.com/shop/custom-qr-stand",
      imageLink: "https://cdn.example.com/products/qr.webp",
      price: 16.5,
      brand: "Layer Forge Canada",
    });
  });

  it("generates escaped RSS XML with required product attributes", () => {
    const listing = toMerchantListing(
      product,
      "https://layerforgecanada.com",
      "https://cdn.example.com/products",
    );
    const xml = buildGoogleMerchantFeed([listing!]);

    expect(xml).toContain("<g:id>LF-P-000001</g:id>");
    expect(xml).toContain("<g:title>Custom QR &amp; Stand</g:title>");
    expect(xml).toContain("<g:price>16.50 CAD</g:price>");
    expect(xml).toContain("<g:identifier_exists>no</g:identifier_exists>");
  });

  it("uses matching values for product JSON-LD", () => {
    const listing = toMerchantListing(
      product,
      "https://layerforgecanada.com",
      "https://cdn.example.com/products",
    );
    const structuredData = buildProductStructuredData(listing!);

    expect(structuredData.offers.price).toBe("16.50");
    expect(structuredData.offers.priceCurrency).toBe("CAD");
    expect(serializeJsonLd({ name: "</script>" })).not.toContain("</script>");
  });

  it("omits incomplete products instead of publishing invalid feed rows", () => {
    expect(
      toMerchantListing(
        { ...product, product_images: [] },
        "https://layerforgecanada.com",
        "https://cdn.example.com/products",
      ),
    ).toBeNull();
  });
});
