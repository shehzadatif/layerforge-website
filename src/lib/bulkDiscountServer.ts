import {
  BULK_DISCOUNT_SETTING_KEYS,
  DEFAULT_BULK_DISCOUNT_CONFIG,
  parseBulkDiscountConfig,
  type BulkDiscountConfig,
} from "./bulkDiscount";
import { supabaseAdmin } from "./supabaseAdmin";

export async function getBulkDiscountConfig(): Promise<BulkDiscountConfig> {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("setting_key, setting_value")
    .in("setting_key", [...BULK_DISCOUNT_SETTING_KEYS]);

  if (error) {
    console.error("Unable to load bulk discount settings.", {
      error,
    });

    return DEFAULT_BULK_DISCOUNT_CONFIG;
  }

  return parseBulkDiscountConfig(
    new Map((data ?? []).map((row) => [row.setting_key, row.setting_value])),
  );
}
