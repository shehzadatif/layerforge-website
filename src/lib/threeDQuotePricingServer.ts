import {
  DEFAULT_THREE_D_QUOTE_PRICING,
  parseThreeDQuotePricingRows,
  THREE_D_QUOTE_PRICING_SETTING_KEYS,
} from "./threeDQuotePricing";
import { type ThreeDQuotePublicPricingConfig } from "./threeDQuotePublicPricing";
import { toThreeDQuotePublicPricingConfig } from "./threeDQuotePublicPricingServer";
import { supabaseAdmin } from "./supabaseAdmin";

export async function loadThreeDQuotePublicPricing(): Promise<ThreeDQuotePublicPricingConfig> {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("setting_key, setting_value")
    .in("setting_key", [...THREE_D_QUOTE_PRICING_SETTING_KEYS]);

  if (error) {
    console.warn(
      `Unable to load 3D quote pricing settings: ${JSON.stringify({
        error: error.message,
      })}`,
    );
  }

  const privatePricing = error
    ? DEFAULT_THREE_D_QUOTE_PRICING
    : parseThreeDQuotePricingRows(data ?? []);

  return toThreeDQuotePublicPricingConfig(privatePricing);
}
