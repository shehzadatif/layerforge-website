import type { APIRoute } from "astro";

import {
  DEFAULT_THREE_D_QUOTE_PRICING,
  parseThreeDQuotePricingRows,
  THREE_D_QUOTE_PRICING_SETTING_KEYS,
} from "../../../lib/threeDQuotePricing";
import { toThreeDQuotePublicPricingConfig } from "../../../lib/threeDQuotePublicPricing";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

export const GET: APIRoute = async () => {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("setting_key, setting_value")
    .in("setting_key", [...THREE_D_QUOTE_PRICING_SETTING_KEYS]);

  if (error) {
    console.warn(
      `Unable to load public 3D quote pricing settings: ${JSON.stringify({
        error: error.message,
      })}`,
    );
  }

  const privatePricing = error
    ? DEFAULT_THREE_D_QUOTE_PRICING
    : parseThreeDQuotePricingRows(data ?? []);
  const publicPricing = toThreeDQuotePublicPricingConfig(privatePricing);

  return Response.json(publicPricing, {
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
