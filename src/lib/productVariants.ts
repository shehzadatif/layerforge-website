export type ProductVariantInput = {
  id?: string;
  name: string;
  price: number;
  sku: string;
  sortOrder: number;
};

const MAX_VARIANTS = 50;
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
  const rowCount = Math.max(
    ids.length,
    names.length,
    prices.length,
    skus.length,
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
    const name = names[index] ?? "";
    const priceText = prices[index] ?? "";
    const sku = skus[index] ?? "";

    if (!id && !name && !priceText && !sku) {
      continue;
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
  };
}
