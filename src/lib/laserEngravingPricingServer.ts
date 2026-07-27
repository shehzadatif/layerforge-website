import {
  LASER_ENGRAVING_PRICING_SETTING_KEYS,
  parseLaserEngravingPricingRows,
} from "./laserEngravingPricing";
import { toLaserEngravingPublicPricing } from "./laserEngravingPublicPricing";
import { supabaseAdmin } from "./supabaseAdmin";

export async function loadLaserEngravingPricing() {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("setting_key, setting_value")
    .in("setting_key", [...LASER_ENGRAVING_PRICING_SETTING_KEYS]);

  if (error) {
    console.error("Unable to load laser engraving pricing.", {
      error: error.message,
    });
  }

  return parseLaserEngravingPricingRows(data ?? []);
}

export async function loadLaserEngravingPublicPricing() {
  return toLaserEngravingPublicPricing(await loadLaserEngravingPricing());
}
