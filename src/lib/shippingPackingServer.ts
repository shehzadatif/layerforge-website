import {
  estimateShippingPackage,
  estimateResolvedShipmentPackingPlan,
  parseProductShippingProfile,
  parseStandardBoxes,
  productIdFromShippingProfileSettingKey,
  productShippingProfileSettingKey,
  type ProductShippingProfile,
  type ShippingPackingItem,
  type ShippingPackage,
  type ShipmentPackingPlan,
} from "./shippingPacking";
import { supabaseAdmin } from "./supabaseAdmin";

const DEFAULT_ITEM_WEIGHT_LBS = 0.5;
const DEFAULT_PACKAGING_WEIGHT_LBS = 0.25;
const DEFAULT_PACKAGE_LENGTH_IN = 8;
const DEFAULT_PACKAGE_WIDTH_IN = 6;
const DEFAULT_PACKAGE_HEIGHT_IN = 4;
const VARIANT_PROFILE_SETTING_PREFIX = "variant_shipping_profile:";

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export class ProductShippingProfileValidationError extends Error {}

function optionalPositiveNumber(
  formData: FormData,
  key: string,
  label: string,
): number | null {
  const text = String(formData.get(key) ?? "").trim();
  if (!text) return null;

  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0 || value > 200) {
    throw new ProductShippingProfileValidationError(
      `${label} must be greater than zero and no more than 200.`,
    );
  }

  return value;
}

export function parseProductShippingProfileForm(
  formData: FormData,
): ProductShippingProfile | null {
  const unitWeightLbs = optionalPositiveNumber(
    formData,
    "shipping_unit_weight_lbs",
    "Unit shipping weight",
  );
  const referenceQuantity = optionalPositiveNumber(
    formData,
    "shipping_reference_quantity",
    "Reference packed quantity",
  );
  const lengthIn = optionalPositiveNumber(
    formData,
    "shipping_package_length_in",
    "Reference package length",
  );
  const widthIn = optionalPositiveNumber(
    formData,
    "shipping_package_width_in",
    "Reference package width",
  );
  const heightIn = optionalPositiveNumber(
    formData,
    "shipping_package_height_in",
    "Reference package height",
  );
  const values = [
    unitWeightLbs,
    referenceQuantity,
    lengthIn,
    widthIn,
    heightIn,
  ];

  if (values.every((value) => value === null)) return null;
  if (values.some((value) => value === null)) {
    throw new ProductShippingProfileValidationError(
      "Complete every Shipping & Packing field, or leave all of them blank.",
    );
  }
  if (!Number.isInteger(referenceQuantity)) {
    throw new ProductShippingProfileValidationError(
      "Reference packed quantity must be a whole number.",
    );
  }

  return {
    unitWeightLbs: unitWeightLbs as number,
    referenceQuantity: referenceQuantity as number,
    lengthIn: lengthIn as number,
    widthIn: widthIn as number,
    heightIn: heightIn as number,
  };
}

export function parseVariantShippingProfilesForm(
  formData: FormData,
  variantCount: number,
): Array<ProductShippingProfile | null> {
  const fieldNames = [
    "variant_shipping_unit_weight_lbs",
    "variant_shipping_reference_quantity",
    "variant_shipping_package_length_in",
    "variant_shipping_package_width_in",
    "variant_shipping_package_height_in",
  ] as const;
  const values = new Map(
    fieldNames.map((name) => [
      name,
      formData.getAll(name).map((value) => String(value).trim()),
    ]),
  );

  return Array.from({ length: variantCount }, (_, index) => {
    const row = fieldNames.map((name) => values.get(name)?.[index] ?? "");
    if (row.every((value) => !value)) return null;
    if (row.some((value) => !value)) {
      throw new ProductShippingProfileValidationError(
        `Complete every Shipping Override field for variant ${index + 1}, or leave all five blank.`,
      );
    }

    const parsed = row.map(Number);
    if (
      parsed.some(
        (value) => !Number.isFinite(value) || value <= 0 || value > 200,
      )
    ) {
      throw new ProductShippingProfileValidationError(
        `Variant ${index + 1} shipping values must be greater than zero and no more than 200.`,
      );
    }
    if (!Number.isInteger(parsed[1])) {
      throw new ProductShippingProfileValidationError(
        `Variant ${index + 1} packed quantity must be a whole number.`,
      );
    }

    return {
      unitWeightLbs: parsed[0],
      referenceQuantity: parsed[1],
      lengthIn: parsed[2],
      widthIn: parsed[3],
      heightIn: parsed[4],
    };
  });
}

export async function saveProductShippingProfile(
  productId: string,
  profile: ProductShippingProfile | null,
): Promise<void> {
  const settingKey = productShippingProfileSettingKey(productId);

  if (!profile) {
    const { error } = await supabaseAdmin
      .from("settings")
      .delete()
      .eq("setting_key", settingKey);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabaseAdmin.from("settings").upsert(
    {
      setting_key: settingKey,
      setting_value: JSON.stringify(profile),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "setting_key" },
  );

  if (error) throw new Error(error.message);
}

export async function saveVariantShippingProfile(
  variantId: string,
  profile: ProductShippingProfile | null,
): Promise<void> {
  const settingKey = `${VARIANT_PROFILE_SETTING_PREFIX}${variantId}`;
  if (!profile) {
    const { error } = await supabaseAdmin
      .from("settings")
      .delete()
      .eq("setting_key", settingKey);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabaseAdmin.from("settings").upsert(
    {
      setting_key: settingKey,
      setting_value: JSON.stringify(profile),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "setting_key" },
  );
  if (error) throw new Error(error.message);
}

export async function getVariantShippingProfiles(
  variantIds: string[],
): Promise<Map<string, ProductShippingProfile>> {
  const ids = [...new Set(variantIds.filter(Boolean))];
  if (ids.length === 0) return new Map();
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("setting_key, setting_value")
    .in(
      "setting_key",
      ids.map((id) => `${VARIANT_PROFILE_SETTING_PREFIX}${id}`),
    );
  if (error) {
    console.error("Unable to load variant shipping profiles.", { error });
    return new Map();
  }

  const profiles = new Map<string, ProductShippingProfile>();
  for (const row of data ?? []) {
    const settingKey = String(row.setting_key ?? "");
    const variantId = settingKey.startsWith(VARIANT_PROFILE_SETTING_PREFIX)
      ? settingKey.slice(VARIANT_PROFILE_SETTING_PREFIX.length)
      : "";
    const profile = parseProductShippingProfile(row.setting_value);
    if (variantId && profile) profiles.set(variantId, profile);
  }
  return profiles;
}

export async function getProductShippingProfiles(
  productIds: string[],
): Promise<Map<string, ProductShippingProfile>> {
  const ids = [...new Set(productIds.filter(Boolean))];
  if (ids.length === 0) return new Map();

  const settingKeys = ids.map(productShippingProfileSettingKey);
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("setting_key, setting_value")
    .in("setting_key", settingKeys);

  if (error) {
    console.error("Unable to load product shipping profiles.", { error });
    return new Map();
  }

  const profiles = new Map<string, ProductShippingProfile>();
  for (const row of data ?? []) {
    const productId = productIdFromShippingProfileSettingKey(row.setting_key);
    const profile = parseProductShippingProfile(row.setting_value);
    if (productId && profile) profiles.set(productId, profile);
  }

  return profiles;
}

export async function getProductShippingProfile(
  productId: string,
): Promise<ProductShippingProfile | null> {
  return (await getProductShippingProfiles([productId])).get(productId) ?? null;
}

export async function estimateShipmentPackageForItems(
  items: ShippingPackingItem[],
): Promise<ShippingPackage> {
  const profiles = await getProductShippingProfiles(
    items.map((item) => item.productId),
  );

  return estimateShippingPackage(items, profiles, {
    defaultItemWeightLbs: positiveNumber(
      process.env.STALLION_DEFAULT_ITEM_WEIGHT_LBS,
      DEFAULT_ITEM_WEIGHT_LBS,
    ),
    packagingWeightLbs: positiveNumber(
      process.env.STALLION_PACKAGING_WEIGHT_LBS,
      DEFAULT_PACKAGING_WEIGHT_LBS,
    ),
    fallbackLengthIn: positiveNumber(
      process.env.STALLION_DEFAULT_PACKAGE_LENGTH_IN,
      DEFAULT_PACKAGE_LENGTH_IN,
    ),
    fallbackWidthIn: positiveNumber(
      process.env.STALLION_DEFAULT_PACKAGE_WIDTH_IN,
      DEFAULT_PACKAGE_WIDTH_IN,
    ),
    fallbackHeightIn: positiveNumber(
      process.env.STALLION_DEFAULT_PACKAGE_HEIGHT_IN,
      DEFAULT_PACKAGE_HEIGHT_IN,
    ),
    standardBoxes: parseStandardBoxes(process.env.STALLION_STANDARD_BOXES_IN),
  });
}

export async function estimateShipmentPackagesForItems(
  items: ShippingPackingItem[],
): Promise<ShippingPackage[]> {
  return (await getShipmentPackingPlanForItems(items)).packages;
}

export async function getShipmentPackingPlanForItems(
  items: ShippingPackingItem[],
): Promise<ShipmentPackingPlan> {
  const [productProfiles, variantProfiles] = await Promise.all([
    getProductShippingProfiles(items.map((item) => item.productId)),
    getVariantShippingProfiles(items.map((item) => item.variantId ?? "")),
  ]);

  const variantIds = [
    ...new Set(items.map((item) => item.variantId).filter(Boolean)),
  ] as string[];
  const { data: apparelVariants, error: apparelVariantError } =
    variantIds.length
      ? await supabaseAdmin
          .from("product_variants")
          .select("id, apparel_garment_type, apparel_size")
          .in("id", variantIds)
      : { data: [], error: null };
  if (apparelVariantError) {
    console.error("Unable to load apparel packing details.", {
      error: apparelVariantError,
    });
  }
  const apparelByVariant = new Map(
    (apparelVariants ?? []).flatMap((variant) => {
      const garmentType = variant.apparel_garment_type;
      return garmentType === "t-shirt" || garmentType === "hoodie"
        ? [
            [
              String(variant.id),
              { garmentType, size: String(variant.apparel_size ?? "M") },
            ] as const,
          ]
        : [];
    }),
  );
  const resolvedItems = items.map((item) => {
    const shippingProfile =
      (item.variantId ? variantProfiles.get(item.variantId) : null) ??
      productProfiles.get(item.productId);
    const apparel = item.variantId
      ? apparelByVariant.get(item.variantId)
      : undefined;

    return {
      ...item,
      ...(shippingProfile ? { shippingProfile } : {}),
      ...(apparel ? { apparel } : {}),
    };
  });

  return estimateResolvedShipmentPackingPlan(resolvedItems, {
    defaultItemWeightLbs: positiveNumber(
      process.env.STALLION_DEFAULT_ITEM_WEIGHT_LBS,
      DEFAULT_ITEM_WEIGHT_LBS,
    ),
    packagingWeightLbs: positiveNumber(
      process.env.STALLION_PACKAGING_WEIGHT_LBS,
      DEFAULT_PACKAGING_WEIGHT_LBS,
    ),
    fallbackLengthIn: positiveNumber(
      process.env.STALLION_DEFAULT_PACKAGE_LENGTH_IN,
      DEFAULT_PACKAGE_LENGTH_IN,
    ),
    fallbackWidthIn: positiveNumber(
      process.env.STALLION_DEFAULT_PACKAGE_WIDTH_IN,
      DEFAULT_PACKAGE_WIDTH_IN,
    ),
    fallbackHeightIn: positiveNumber(
      process.env.STALLION_DEFAULT_PACKAGE_HEIGHT_IN,
      DEFAULT_PACKAGE_HEIGHT_IN,
    ),
    standardBoxes: parseStandardBoxes(process.env.STALLION_STANDARD_BOXES_IN),
  });
}
