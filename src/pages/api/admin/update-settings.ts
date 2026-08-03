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

function integerSetting(
  formData: FormData,
  key: string,
  label: string,
  minimum: number,
  maximum: number,
): number {
  const value = Number(formData.get(key));

  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(
      `${label} must be a whole number between ${minimum} and ${maximum}.`,
    );
  }

  return value;
}

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const formData = await request.formData();

    const tierSettings = [1, 2, 3].map((tierNumber) => ({
      tierNumber,
      minimumQuantity: integerSetting(
        formData,
        `bulk_discount_tier_${tierNumber}_minimum_quantity`,
        `Tier ${tierNumber} minimum quantity`,
        1,
        1000,
      ),
      percentage: integerSetting(
        formData,
        `bulk_discount_tier_${tierNumber}_percentage`,
        `Tier ${tierNumber} percentage`,
        1,
        50,
      ),
    }));

    for (let index = 1; index < tierSettings.length; index += 1) {
      if (
        tierSettings[index].minimumQuantity <=
        tierSettings[index - 1].minimumQuantity
      ) {
        throw new Error(
          "Bulk discount minimum quantities must increase from one tier to the next.",
        );
      }

      if (tierSettings[index].percentage < tierSettings[index - 1].percentage) {
        throw new Error(
          "Bulk discount percentages cannot decrease at a higher tier.",
        );
      }
    }

    const updatedAt = new Date().toISOString();
    const rows: Array<{
      setting_key: string;
      setting_value: string;
      updated_at: string;
    }> = settingKeys.map((key) => ({
      setting_key: key,
      setting_value: String(formData.get(key) ?? "").trim(),
      updated_at: updatedAt,
    }));

    rows.push({
      setting_key: "bulk_discount_enabled",
      setting_value:
        formData.get("bulk_discount_enabled") === "on" ? "true" : "false",
      updated_at: updatedAt,
    });

    for (const tier of tierSettings) {
      rows.push(
        {
          setting_key: `bulk_discount_tier_${tier.tierNumber}_minimum_quantity`,
          setting_value: String(tier.minimumQuantity),
          updated_at: updatedAt,
        },
        {
          setting_key: `bulk_discount_tier_${tier.tierNumber}_percentage`,
          setting_value: String(tier.percentage),
          updated_at: updatedAt,
        },
      );
    }

    const { error } = await supabaseAdmin.from("settings").upsert(rows, {
      onConflict: "setting_key",
    });

    if (error) {
      throw new Error(error.message);
    }

    return redirect("/admin/settings", 303);
  } catch (error) {
    console.error("Unable to update settings:", error);

    return new Response(
      error instanceof Error ? error.message : "Unable to update settings.",
      {
        status: 500,
      },
    );
  }
};
