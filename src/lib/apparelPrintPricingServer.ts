import {
  APPAREL_PRINT_PRICING_SETTING_KEYS,
  DEFAULT_APPAREL_PRINT_PRICING,
  parseApparelPrintPricingConfig,
  type ApparelPrintPricingConfig,
} from "./apparelDesigner";
import { supabaseAdmin } from "./supabaseAdmin";

export async function getApparelPrintPricingConfig(): Promise<ApparelPrintPricingConfig> {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("setting_key, setting_value")
    .in("setting_key", [...APPAREL_PRINT_PRICING_SETTING_KEYS]);

  if (error) {
    console.error("Unable to load apparel print pricing settings.", { error });
    return DEFAULT_APPAREL_PRINT_PRICING;
  }

  return parseApparelPrintPricingConfig(
    new Map((data ?? []).map((row) => [row.setting_key, row.setting_value])),
  );
}
