import type { APIRoute } from "astro";

import {
  DEFAULT_THREE_D_QUOTE_PRICING,
  parseThreeDQuotePricingRows,
  THREE_D_QUOTE_PRICING_SETTING_KEYS,
} from "../../../lib/threeDQuotePricing";
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

  const pricing = error
    ? DEFAULT_THREE_D_QUOTE_PRICING
    : parseThreeDQuotePricingRows(data ?? []);

  return Response.json(pricing, {
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
