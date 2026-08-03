export interface BulkDiscountTier {
  minimumQuantity: number;
  percentage: number;
}

export interface BulkDiscountConfig {
  enabled: boolean;
  tiers: BulkDiscountTier[];
}

export const DEFAULT_BULK_DISCOUNT_CONFIG: BulkDiscountConfig = {
  enabled: true,
  tiers: [
    { minimumQuantity: 5, percentage: 5 },
    { minimumQuantity: 10, percentage: 10 },
    { minimumQuantity: 20, percentage: 15 },
  ],
};

export const BULK_DISCOUNT_SETTING_KEYS = [
  "bulk_discount_enabled",
  "bulk_discount_tier_1_minimum_quantity",
  "bulk_discount_tier_1_percentage",
  "bulk_discount_tier_2_minimum_quantity",
  "bulk_discount_tier_2_percentage",
  "bulk_discount_tier_3_minimum_quantity",
  "bulk_discount_tier_3_percentage",
] as const;

export type BulkDiscountSettingKey =
  (typeof BULK_DISCOUNT_SETTING_KEYS)[number];

export interface BulkDiscountItem {
  price: number;
  quantity: number;
  bulkDiscountEligible?: boolean;
}

export interface BulkDiscountPricing {
  totalQuantity: number;
  eligibleQuantity: number;
  discountPercentage: number;
  subtotalCents: number;
  eligibleSubtotalCents: number;
  discountedSubtotalCents: number;
  discountCents: number;
}

export interface NextBulkDiscountTier extends BulkDiscountTier {
  quantityNeeded: number;
}

function safeInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function settingValue(
  settings: ReadonlyMap<string, unknown> | Record<string, unknown>,
  key: string,
): unknown {
  return settings instanceof Map ? settings.get(key) : settings[key];
}

export function normalizeBulkDiscountConfig(
  config: BulkDiscountConfig,
): BulkDiscountConfig {
  const tiers = config.tiers
    .map((tier) => ({
      minimumQuantity: safeInteger(tier.minimumQuantity, 0),
      percentage: Math.min(100, safeInteger(tier.percentage, 0)),
    }))
    .filter((tier) => tier.minimumQuantity > 0 && tier.percentage > 0)
    .sort((left, right) => left.minimumQuantity - right.minimumQuantity);

  return {
    enabled: Boolean(config.enabled),
    tiers,
  };
}

export function parseBulkDiscountConfig(
  settings: ReadonlyMap<string, unknown> | Record<string, unknown>,
): BulkDiscountConfig {
  const fallbackTiers = DEFAULT_BULK_DISCOUNT_CONFIG.tiers;
  const enabledValue = settingValue(settings, "bulk_discount_enabled");

  return normalizeBulkDiscountConfig({
    enabled:
      enabledValue == null
        ? DEFAULT_BULK_DISCOUNT_CONFIG.enabled
        : String(enabledValue).toLowerCase() === "true",
    tiers: [1, 2, 3].map((tierNumber, index) => ({
      minimumQuantity: safeInteger(
        settingValue(
          settings,
          `bulk_discount_tier_${tierNumber}_minimum_quantity`,
        ),
        fallbackTiers[index].minimumQuantity,
      ),
      percentage: safeInteger(
        settingValue(settings, `bulk_discount_tier_${tierNumber}_percentage`),
        fallbackTiers[index].percentage,
      ),
    })),
  });
}

export function getBulkDiscountPercentage(
  eligibleQuantity: number,
  config: BulkDiscountConfig = DEFAULT_BULK_DISCOUNT_CONFIG,
): number {
  if (!config.enabled) return 0;

  const safeQuantity = Number.isFinite(eligibleQuantity)
    ? Math.max(0, Math.floor(eligibleQuantity))
    : 0;
  const tiers = normalizeBulkDiscountConfig(config).tiers;

  for (let index = tiers.length - 1; index >= 0; index -= 1) {
    const tier = tiers[index];

    if (safeQuantity >= tier.minimumQuantity) {
      return tier.percentage;
    }
  }

  return 0;
}

export function getDiscountedUnitPriceCents(
  unitPriceCents: number,
  discountPercentage: number,
): number {
  const safeUnitPrice = Number.isFinite(unitPriceCents)
    ? Math.max(0, Math.round(unitPriceCents))
    : 0;
  const safePercentage = Number.isFinite(discountPercentage)
    ? Math.min(100, Math.max(0, discountPercentage))
    : 0;

  return Math.round(safeUnitPrice * (1 - safePercentage / 100));
}

export function calculateBulkDiscount(
  items: BulkDiscountItem[],
  config: BulkDiscountConfig = DEFAULT_BULK_DISCOUNT_CONFIG,
): BulkDiscountPricing {
  const normalizedItems = items.map((item) => ({
    unitPriceCents: Number.isFinite(item.price)
      ? Math.max(0, Math.round(item.price * 100))
      : 0,
    quantity: Number.isFinite(item.quantity)
      ? Math.max(0, Math.floor(item.quantity))
      : 0,
    eligible: item.bulkDiscountEligible === true,
  }));
  const totalQuantity = normalizedItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const eligibleItems = normalizedItems.filter((item) => item.eligible);
  const eligibleQuantity = eligibleItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const discountPercentage = getBulkDiscountPercentage(
    eligibleQuantity,
    config,
  );
  const subtotalCents = normalizedItems.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  const eligibleSubtotalCents = eligibleItems.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  const discountedSubtotalCents = normalizedItems.reduce(
    (sum, item) =>
      sum +
      (item.eligible
        ? getDiscountedUnitPriceCents(item.unitPriceCents, discountPercentage)
        : item.unitPriceCents) *
        item.quantity,
    0,
  );

  return {
    totalQuantity,
    eligibleQuantity,
    discountPercentage,
    subtotalCents,
    eligibleSubtotalCents,
    discountedSubtotalCents,
    discountCents: subtotalCents - discountedSubtotalCents,
  };
}

export function getNextBulkDiscountTier(
  eligibleQuantity: number,
  config: BulkDiscountConfig = DEFAULT_BULK_DISCOUNT_CONFIG,
): NextBulkDiscountTier | null {
  if (!config.enabled) return null;

  const safeQuantity = Number.isFinite(eligibleQuantity)
    ? Math.max(0, Math.floor(eligibleQuantity))
    : 0;
  const nextTier = normalizeBulkDiscountConfig(config).tiers.find(
    (tier) => safeQuantity < tier.minimumQuantity,
  );

  if (!nextTier) {
    return null;
  }

  return {
    ...nextTier,
    quantityNeeded: nextTier.minimumQuantity - safeQuantity,
  };
}
