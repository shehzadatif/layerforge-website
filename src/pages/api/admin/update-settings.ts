import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const prerender = false;

const settingKeys = [
  "company_name",
  "company_address",
  "company_phone",
  "support_email",
  "website",
  "quote_from_email",
  "order_from_email",
  "reply_to_email",
  "tax_name",
  "default_tax_rate",
  "production_lead_days",
  "shipping_lead_days",
] as const;

export const POST: APIRoute = async ({
  request,
  redirect,
}) => {
  try {
    const formData = await request.formData();

    const rows = settingKeys.map((key) => ({
      setting_key: key,
      setting_value: String(
        formData.get(key) ?? ""
      ).trim(),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin
      .from("settings")
      .upsert(rows, {
        onConflict: "setting_key",
      });

    if (error) {
      throw new Error(error.message);
    }

    return redirect("/admin/settings", 303);
  } catch (error) {
    console.error(
      "Unable to update settings:",
      error
    );

    return new Response(
      error instanceof Error
        ? error.message
        : "Unable to update settings.",
      {
        status: 500,
      }
    );
  }
};