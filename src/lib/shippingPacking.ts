export interface ProductShippingProfile {
  unitWeightLbs: number;
  referenceQuantity: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
}

export interface ShippingPackingItem {
  productId: string;
  quantity: number;
}

export interface ShippingPackage {
  weight: number;
  length: number;
  width: number;
  height: number;
}

export interface ShippingPackingOptions {
  defaultItemWeightLbs: number;
  packagingWeightLbs: number;
  fallbackLengthIn: number;
  fallbackWidthIn: number;
  fallbackHeightIn: number;
  standardBoxes: ShippingBox[];
}

export interface ShippingBox {
  length: number;
  width: number;
  height: number;
}

export const DEFAULT_STANDARD_BOXES: ShippingBox[] = [
  { length: 4, width: 2, height: 2 },
  { length: 6, width: 4, height: 3 },
  { length: 8, width: 6, height: 4 },
  { length: 10, width: 8, height: 6 },
  { length: 12, width: 10, height: 8 },
  { length: 16, width: 12, height: 10 },
  { length: 20, width: 14, height: 12 },
  { length: 24, width: 18, height: 18 },
];

const PROFILE_SETTING_PREFIX = "product_shipping_profile:";

function positiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

function volume(box: ShippingBox): number {
  return box.length * box.width * box.height;
}

function sortedDimensions(box: ShippingBox): number[] {
  return [box.length, box.width, box.height].sort(
    (left, right) => right - left,
  );
}

function dimensionsFit(box: ShippingBox, minimum: number[]): boolean {
  const dimensions = sortedDimensions(box);
  return dimensions.every((dimension, index) => dimension >= minimum[index]);
}

function validProfile(value: unknown): ProductShippingProfile | null {
  if (!value || typeof value !== "object") return null;

  const profile = value as Record<string, unknown>;
  const unitWeightLbs = positiveNumber(profile.unitWeightLbs);
  const referenceQuantity = positiveNumber(profile.referenceQuantity);
  const lengthIn = positiveNumber(profile.lengthIn);
  const widthIn = positiveNumber(profile.widthIn);
  const heightIn = positiveNumber(profile.heightIn);

  if (
    unitWeightLbs === null ||
    referenceQuantity === null ||
    !Number.isInteger(referenceQuantity) ||
    lengthIn === null ||
    widthIn === null ||
    heightIn === null
  ) {
    return null;
  }

  return {
    unitWeightLbs,
    referenceQuantity,
    lengthIn,
    widthIn,
    heightIn,
  };
}

export function productShippingProfileSettingKey(productId: string): string {
  return `${PROFILE_SETTING_PREFIX}${productId}`;
}

export function productIdFromShippingProfileSettingKey(
  settingKey: string,
): string | null {
  return settingKey.startsWith(PROFILE_SETTING_PREFIX)
    ? settingKey.slice(PROFILE_SETTING_PREFIX.length)
    : null;
}

export function parseProductShippingProfile(
  value: unknown,
): ProductShippingProfile | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    return validProfile(JSON.parse(value));
  } catch {
    return null;
  }
}

export function parseStandardBoxes(value: string | undefined): ShippingBox[] {
  const parsed = (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const dimensions = entry
        .toLowerCase()
        .split("x")
        .map((dimension) => positiveNumber(dimension.trim()));

      if (dimensions.length !== 3 || dimensions.some((item) => item === null)) {
        return [];
      }

      return [
        {
          length: dimensions[0] as number,
          width: dimensions[1] as number,
          height: dimensions[2] as number,
        },
      ];
    });

  return parsed.length > 0 ? parsed : DEFAULT_STANDARD_BOXES;
}

export function estimateShippingPackage(
  items: ShippingPackingItem[],
  profiles: ReadonlyMap<string, ProductShippingProfile>,
  options: ShippingPackingOptions,
): ShippingPackage {
  const normalizedItems = items.filter(
    (item) =>
      item.productId && Number.isInteger(item.quantity) && item.quantity > 0,
  );
  const weight = rounded(
    Math.max(
      0.1,
      options.packagingWeightLbs +
        normalizedItems.reduce((total, item) => {
          const profile = profiles.get(item.productId);
          return (
            total +
            item.quantity *
              (profile?.unitWeightLbs ?? options.defaultItemWeightLbs)
          );
        }, 0),
    ),
  );

  const configuredItems = normalizedItems.map((item) => ({
    item,
    profile: profiles.get(item.productId),
  }));
  const everyItemConfigured =
    configuredItems.length > 0 &&
    configuredItems.every(({ profile }) => Boolean(profile));

  if (!everyItemConfigured) {
    return {
      weight,
      length: options.fallbackLengthIn,
      width: options.fallbackWidthIn,
      height: options.fallbackHeightIn,
    };
  }

  let requiredVolume = 0;
  const minimumDimensions = [0, 0, 0];

  for (const { item, profile } of configuredItems) {
    const configuredProfile = profile as ProductShippingProfile;
    const referenceBox = {
      length: configuredProfile.lengthIn,
      width: configuredProfile.widthIn,
      height: configuredProfile.heightIn,
    };
    requiredVolume +=
      (volume(referenceBox) / configuredProfile.referenceQuantity) *
      item.quantity;

    for (const [index, dimension] of sortedDimensions(referenceBox).entries()) {
      minimumDimensions[index] = Math.max(minimumDimensions[index], dimension);
    }
  }

  const boxes = [...options.standardBoxes].sort(
    (left, right) => volume(left) - volume(right),
  );
  const selected = boxes.find(
    (box) =>
      volume(box) >= requiredVolume && dimensionsFit(box, minimumDimensions),
  );

  if (selected) {
    return { weight, ...selected };
  }

  const largest = boxes.at(-1) ?? {
    length: options.fallbackLengthIn,
    width: options.fallbackWidthIn,
    height: options.fallbackHeightIn,
  };
  const [minimumLength, minimumWidth, minimumHeight] = minimumDimensions;
  const width = Math.max(largest.width, minimumWidth);
  const height = Math.max(largest.height, minimumHeight);
  const length = Math.max(
    largest.length,
    minimumLength,
    Math.ceil((requiredVolume / (width * height)) * 100) / 100,
  );

  return { weight, length, width, height };
}
