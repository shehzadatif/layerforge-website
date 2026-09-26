import {
  DEFAULT_SALES_TAX_CONFIG,
  parseSalesTaxConfig,
  SALES_TAX_SETTING_KEYS,
  type SalesTaxConfig,
} from "./taxConfig";
import { supabaseAdmin } from "./supabaseAdmin";

export async function getSalesTaxConfig(): Promise<SalesTaxConfig> {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("setting_key, setting_value")
    .in("setting_key", [...SALES_TAX_SETTING_KEYS]);

  if (error) {
    console.error("Unable to load sales tax settings.", {
      error,
    });

    return DEFAULT_SALES_TAX_CONFIG;
  }

  return parseSalesTaxConfig(
    new Map((data ?? []).map((row) => [row.setting_key, row.setting_value])),
  );
}
