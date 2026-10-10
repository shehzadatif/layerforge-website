export type ProductVariantInput = {
  id?: string;
  name: string;
  price: number;
  sku: string;
  sortOrder: number;
  apparel?: {
    garmentType: "t-shirt" | "hoodie";
    quality: string;
    colorName: string;
    colorHex: string;
    size: string;
    inventoryQuantity: number;
  };
};

const MAX_VARIANTS = 300;
const MAX_NAME_LENGTH = 120;
const MAX_SKU_LENGTH = 80;

export class ProductVariantValidationError extends Error {}

function values(formData: FormData, name: string): string[] {
  return formData.getAll(name).map((value) => String(value).trim());
}

export function parseProductVariants(
  formData: FormData,
): ProductVariantInput[] {
  const ids = values(formData, "variant_id");
  const names = values(formData, "variant_name");
  const prices = values(formData, "variant_price");
  const skus = values(formData, "variant_sku");
  const garmentTypes = values(formData, "apparel_garment_type");
  const qualities = values(formData, "apparel_quality");
  const colorNames = values(formData, "apparel_color_name");
  const colorHexes = values(formData, "apparel_color_hex");
  const sizes = values(formData, "apparel_size");
  const inventoryQuantities = values(formData, "inventory_quantity");
  const rowCount = Math.max(
    ids.length,
    names.length,
    prices.length,
    skus.length,
    garmentTypes.length,
    qualities.length,
    colorNames.length,
    colorHexes.length,
    sizes.length,
    inventoryQuantities.length,
  );

  if (rowCount > MAX_VARIANTS) {
    throw new ProductVariantValidationError(
      `A product can have up to ${MAX_VARIANTS} variants.`,
    );
  }

  const variants: ProductVariantInput[] = [];
  const usedNames = new Set<string>();

  for (let index = 0; index < rowCount; index += 1) {
    const id = ids[index] ?? "";
    let name = names[index] ?? "";
    const priceText = prices[index] ?? "";
    const sku = skus[index] ?? "";

    const garmentType = garmentTypes[index] ?? "";
    const quality = qualities[index] ?? "";
    const colorName = colorNames[index] ?? "";
    const colorHex = colorHexes[index] ?? "";
    const size = (sizes[index] ?? "").toUpperCase();
    const inventoryText = inventoryQuantities[index] ?? "";
    const isApparel = Boolean(
      garmentType || quality || colorName || colorHex || size || inventoryText,
    );

    if (!id && !name && !priceText && !sku && !isApparel) {
      continue;
    }

    let apparel: ProductVariantInput["apparel"];
    if (isApparel) {
      if (garmentType !== "t-shirt" && garmentType !== "hoodie") {
        throw new ProductVariantValidationError(
          `Inventory row ${index + 1} needs a garment type.`,
        );
      }
      if (!quality || quality.length > 80) {
        throw new ProductVariantValidationError(
          `Inventory row ${index + 1} needs a quality name.`,
        );
      }
      if (!colorName || colorName.length > 60) {
        throw new ProductVariantValidationError(
          `Inventory row ${index + 1} needs a colour name.`,
        );
      }
      if (!/^#[0-9a-f]{6}$/i.test(colorHex)) {
        throw new ProductVariantValidationError(
          `Inventory row ${index + 1} needs a valid colour swatch.`,
        );
      }
      if (!size || size.length > 12) {
        throw new ProductVariantValidationError(
          `Inventory row ${index + 1} needs a size.`,
        );
      }
      const inventoryQuantity = Number(inventoryText);
      if (
        inventoryText === "" ||
        !Number.isInteger(inventoryQuantity) ||
        inventoryQuantity < 0 ||
        inventoryQuantity > 100000
      ) {
        throw new ProductVariantValidationError(
          `Inventory row ${index + 1} needs a valid stock quantity.`,
        );
      }
      apparel = {
        garmentType,
        quality,
        colorName,
        colorHex: colorHex.toUpperCase(),
        size,
        inventoryQuantity,
      };
      name = `${quality} · ${colorName} · ${size}`;
    }

    if (!name) {
      throw new ProductVariantValidationError(
        `Variant ${index + 1} needs a name.`,
      );
    }

    if (name.length > MAX_NAME_LENGTH) {
      throw new ProductVariantValidationError(
        `Variant ${index + 1} has a name longer than ${MAX_NAME_LENGTH} characters.`,
      );
    }

    if (sku.length > MAX_SKU_LENGTH) {
      throw new ProductVariantValidationError(
        `Variant ${index + 1} has an SKU longer than ${MAX_SKU_LENGTH} characters.`,
      );
    }

    const price = Number(priceText);

    if (!priceText || !Number.isFinite(price) || price <= 0) {
      throw new ProductVariantValidationError(
        `Variant ${index + 1} needs a valid price greater than zero.`,
      );
    }

    const normalizedName = name.toLocaleLowerCase("en-CA");

    if (usedNames.has(normalizedName)) {
      throw new ProductVariantValidationError(
        `Variant names must be unique. “${name}” is listed more than once.`,
      );
    }

    usedNames.add(normalizedName);
    variants.push({
      ...(id ? { id } : {}),
      name,
      price: Math.round(price * 100) / 100,
      sku,
      sortOrder: variants.length,
      ...(apparel ? { apparel } : {}),
    });
  }

  return variants;
}

export function productVariantRow(
  productId: string,
  variant: ProductVariantInput,
  imageUrl?: string | null,
) {
  return {
    product_id: productId,
    option_name: "Variant",
    option_value: variant.name,
    price: variant.price,
    sku: variant.sku || null,
    active: true,
    sort_order: variant.sortOrder,
    ...(imageUrl !== undefined ? { image_url: imageUrl } : {}),
    apparel_garment_type: variant.apparel?.garmentType ?? null,
    apparel_quality: variant.apparel?.quality ?? null,
    apparel_color_name: variant.apparel?.colorName ?? null,
    apparel_color_hex: variant.apparel?.colorHex ?? null,
    apparel_size: variant.apparel?.size ?? null,
    inventory_quantity: variant.apparel?.inventoryQuantity ?? null,
  };
}
