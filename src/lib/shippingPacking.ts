export interface ProductShippingProfile {
  unitWeightLbs: number;
  referenceQuantity: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
}

export interface ShippingPackingItem {
  productId: string;
  variantId?: string;
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

export interface ApparelPackingItem {
  garmentType: "t-shirt" | "hoodie";
  size: string;
  quantity: number;
  unitWeightLbs?: number;
}

export interface ApparelShippingPlan {
  packages: ShippingPackage[];
  packageType: "poly-mailer" | "apparel-carton";
  bulkReviewRecommended: boolean;
}

export type ShippingPackageType =
  "poly-mailer" | "apparel-carton" | "standard-box" | "mixed";

export interface ShipmentPackingPlan {
  packages: ShippingPackage[];
  packageType: ShippingPackageType;
  bulkReviewRecommended: boolean;
}

export interface ResolvedShippingPackingItem extends ShippingPackingItem {
  shippingProfile?: ProductShippingProfile;
  apparel?: {
    garmentType: "t-shirt" | "hoodie";
    size: string;
  };
}

interface ApparelPackageProfile extends ShippingBox {
  packagingWeightLbs: number;
  capacityUnits: number;
}

const APPAREL_MAILERS: ApparelPackageProfile[] = [
  {
    length: 13,
    width: 10,
    height: 1,
    packagingWeightLbs: 0.04,
    capacityUnits: 1.5,
  },
  {
    length: 15.5,
    width: 12,
    height: 2,
    packagingWeightLbs: 0.06,
    capacityUnits: 3,
  },
  {
    length: 19,
    width: 14.5,
    height: 3,
    packagingWeightLbs: 0.09,
    capacityUnits: 6,
  },
  {
    length: 20,
    width: 15,
    height: 4,
    packagingWeightLbs: 0.14,
    capacityUnits: 8,
  },
];

const MEDIUM_APPAREL_CARTON: ApparelPackageProfile = {
  length: 18,
  width: 14,
  height: 8,
  packagingWeightLbs: 1,
  capacityUnits: 24,
};

const LARGE_APPAREL_CARTON: ApparelPackageProfile = {
  length: 20,
  width: 16,
  height: 12,
  packagingWeightLbs: 1.5,
  capacityUnits: 48,
};

const MAX_APPAREL_PRODUCT_WEIGHT_PER_CARTON_LBS = 38;
export const BULK_APPAREL_REVIEW_QUANTITY = 96;

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

function apparelSizeExtra(size: string): number {
  const normalized = size.trim().toUpperCase();
  if (normalized === "2XL") return 0.1;
  const extendedMatch = normalized.match(/^([3-9])XL$/);
  return extendedMatch ? (Number(extendedMatch[1]) - 1) * 0.1 : 0;
}

export function defaultApparelUnitWeightLbs(
  garmentType: "t-shirt" | "hoodie",
  size: string,
): number {
  const normalized = size.trim().toUpperCase();
  const base = garmentType === "hoodie" ? 1.35 : 0.45;
  const largeAdjustment = ["L", "XL"].includes(normalized)
    ? garmentType === "hoodie"
      ? 0.15
      : 0.05
    : 0;
  const extendedAdjustment =
    apparelSizeExtra(size) * (garmentType === "hoodie" ? 2 : 1);
  return rounded(base + largeAdjustment + extendedAdjustment);
}

function apparelPackingUnits(
  garmentType: "t-shirt" | "hoodie",
  size: string,
): number {
  return rounded((garmentType === "hoodie" ? 3 : 1) + apparelSizeExtra(size));
}

/**
 * Soft apparel is packed separately from rigid products. Small orders use the
 * smallest suitable poly mailer; larger orders use one or more apparel cartons.
 * The carton plan is constrained by both folded-garment capacity and weight.
 */
export function estimateApparelShippingPlan(
  items: ApparelPackingItem[],
): ApparelShippingPlan {
  const normalized = items.filter(
    (item) =>
      (item.garmentType === "t-shirt" || item.garmentType === "hoodie") &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0,
  );
  const totalQuantity = normalized.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const totalUnits = normalized.reduce(
    (total, item) =>
      total + apparelPackingUnits(item.garmentType, item.size) * item.quantity,
    0,
  );
  const productWeight = normalized.reduce(
    (total, item) =>
      total +
      (item.unitWeightLbs ??
        defaultApparelUnitWeightLbs(item.garmentType, item.size)) *
        item.quantity,
    0,
  );

  const mailer = APPAREL_MAILERS.find(
    (profile) => totalUnits <= profile.capacityUnits,
  );
  if (mailer) {
    return {
      packages: [
        {
          weight: rounded(productWeight + mailer.packagingWeightLbs),
          length: mailer.length,
          width: mailer.width,
          height: mailer.height,
        },
      ],
      packageType: "poly-mailer",
      bulkReviewRecommended: false,
    };
  }

  const carton =
    totalUnits <= MEDIUM_APPAREL_CARTON.capacityUnits
      ? MEDIUM_APPAREL_CARTON
      : LARGE_APPAREL_CARTON;
  const packageCount = Math.max(
    1,
    Math.ceil(totalUnits / carton.capacityUnits),
    Math.ceil(productWeight / MAX_APPAREL_PRODUCT_WEIGHT_PER_CARTON_LBS),
  );
  const productWeightPerCarton = productWeight / packageCount;

  return {
    packages: Array.from({ length: packageCount }, () => ({
      weight: rounded(productWeightPerCarton + carton.packagingWeightLbs),
      length: carton.length,
      width: carton.width,
      height: carton.height,
    })),
    packageType: "apparel-carton",
    bulkReviewRecommended: totalQuantity > BULK_APPAREL_REVIEW_QUANTITY,
  };
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

/**
 * Build a parcel plan that favours repeating the smallest suitable box instead
 * of continually moving an order into a much larger carton. This keeps the
 * estimate aligned with how small products are actually packed (for example,
 * twelve mounts in two six-piece cartons).
 */
export function estimateShippingPackages(
  items: ShippingPackingItem[],
  profiles: ReadonlyMap<string, ProductShippingProfile>,
  options: ShippingPackingOptions,
): ShippingPackage[] {
  const normalizedItems = items.filter(
    (item) =>
      item.productId && Number.isInteger(item.quantity) && item.quantity > 0,
  );
  const configuredItems = normalizedItems.map((item) => ({
    item,
    profile: profiles.get(item.productId),
  }));
  const everyItemConfigured =
    configuredItems.length > 0 &&
    configuredItems.every(({ profile }) => Boolean(profile));

  if (!everyItemConfigured) {
    return [estimateShippingPackage(items, profiles, options)];
  }

  let requiredVolume = 0;
  let productWeight = 0;
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
    productWeight += configuredProfile.unitWeightLbs * item.quantity;

    for (const [index, dimension] of sortedDimensions(referenceBox).entries()) {
      minimumDimensions[index] = Math.max(minimumDimensions[index], dimension);
    }
  }

  const boxes = [...options.standardBoxes].sort(
    (left, right) => volume(left) - volume(right),
  );
  const selected = boxes.find(
    (box) =>
      dimensionsFit(box, minimumDimensions) &&
      Math.ceil(requiredVolume / volume(box)) <= 20,
  );

  if (!selected) {
    return [estimateShippingPackage(items, profiles, options)];
  }

  const packageCount = Math.max(
    1,
    Math.ceil(requiredVolume / volume(selected)),
    Math.ceil(productWeight / Math.max(0.1, 200 - options.packagingWeightLbs)),
  );
  const baseProductWeight = productWeight / packageCount;

  return Array.from({ length: packageCount }, (_, index) => {
    const allocatedProductWeight =
      index === packageCount - 1
        ? productWeight - baseProductWeight * (packageCount - 1)
        : baseProductWeight;

    return {
      weight: rounded(
        Math.max(0.1, allocatedProductWeight + options.packagingWeightLbs),
      ),
      ...selected,
    };
  });
}

/**
 * Build the complete parcel plan after product, variant and apparel details
 * have been resolved. Soft apparel is kept in mailers/cartons and rigid goods
 * are packed in their configured boxes. Mixed carts therefore quote every
 * parcel instead of collapsing into the legacy single-box fallback.
 */
export function estimateResolvedShipmentPackingPlan(
  items: ResolvedShippingPackingItem[],
  options: ShippingPackingOptions,
): ShipmentPackingPlan {
  const apparelItems = items.filter((item) => item.apparel);
  const rigidItems = items.filter((item) => !item.apparel);
  const apparelPlan = apparelItems.length
    ? estimateApparelShippingPlan(
        apparelItems.map((item) => ({
          garmentType: item.apparel!.garmentType,
          size: item.apparel!.size,
          quantity: item.quantity,
          ...(item.shippingProfile?.unitWeightLbs
            ? { unitWeightLbs: item.shippingProfile.unitWeightLbs }
            : {}),
        })),
      )
    : null;

  const rigidProfiles = new Map<string, ProductShippingProfile>();
  const resolvedRigidItems = rigidItems.map((item, index) => {
    const key = `rigid-line-${index}`;
    if (item.shippingProfile) rigidProfiles.set(key, item.shippingProfile);
    return { productId: key, quantity: item.quantity };
  });
  const rigidPackages = resolvedRigidItems.length
    ? estimateShippingPackages(resolvedRigidItems, rigidProfiles, options)
    : [];

  if (apparelPlan && rigidPackages.length > 0) {
    return {
      packages: [...rigidPackages, ...apparelPlan.packages],
      packageType: "mixed",
      bulkReviewRecommended: apparelPlan.bulkReviewRecommended,
    };
  }

  if (apparelPlan) return apparelPlan;

  return {
    packages: rigidPackages,
    packageType: "standard-box",
    bulkReviewRecommended: false,
  };
}
