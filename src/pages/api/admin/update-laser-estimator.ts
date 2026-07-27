import type { APIRoute } from "astro";

import { isSameOriginRequest } from "../../../lib/isSameOriginRequest";
import {
  laserEngravingSettingValues,
  LASER_ENGRAVING_PRICING_SETTING_KEYS,
  parseLaserEngravingPricingInput,
} from "../../../lib/laserEngravingPricing";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  if (!isSameOriginRequest(request)) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const formData = await request.formData();
    const pricing = parseLaserEngravingPricingInput((key) => formData.get(key));
    const updatedAt = new Date().toISOString();
    const rows = laserEngravingSettingValues(pricing).map((row) => ({
      ...row,
      updated_at: updatedAt,
    }));

    if (rows.length !== LASER_ENGRAVING_PRICING_SETTING_KEYS.length) {
      throw new Error("The laser estimator configuration is incomplete.");
    }

    const { error } = await supabaseAdmin.from("settings").upsert(rows, {
      onConflict: "setting_key",
    });
    if (error) throw new Error(error.message);

    return redirect("/admin/laser-estimator?saved=1", 303);
  } catch (error) {
    console.error("Unable to update laser estimator.", error);
    return new Response(
      error instanceof Error ? error.message : "Unable to save settings.",
      { status: 400 },
    );
  }
};
