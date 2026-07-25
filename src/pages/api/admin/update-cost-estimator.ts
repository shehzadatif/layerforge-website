import type { APIRoute } from "astro";

import { isSameOriginRequest } from "../../../lib/isSameOriginRequest";
import {
  parseThreeDQuotePricingInput,
  THREE_D_QUOTE_PRICING_SETTING_KEYS,
  threeDQuotePricingSettingValues,
} from "../../../lib/threeDQuotePricing";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  if (!isSameOriginRequest(request)) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const formData = await request.formData();
    const pricing = parseThreeDQuotePricingInput((key) => formData.get(key));
    const updatedAt = new Date().toISOString();
    const rows = threeDQuotePricingSettingValues(pricing).map((row) => ({
      ...row,
      updated_at: updatedAt,
    }));

    if (rows.length !== THREE_D_QUOTE_PRICING_SETTING_KEYS.length) {
      throw new Error("The estimator pricing configuration is incomplete.");
    }

    const { error } = await supabaseAdmin.from("settings").upsert(rows, {
      onConflict: "setting_key",
    });

    if (error) {
      throw new Error(error.message);
    }

    return redirect("/admin/cost-estimator?saved=1", 303);
  } catch (error) {
    console.error("Unable to update 3D cost estimator settings.", {
      error: error instanceof Error ? error.message : String(error),
    });

    return new Response(
      error instanceof Error
        ? error.message
        : "Unable to update cost estimator settings.",
      { status: 400 },
    );
  }
};
