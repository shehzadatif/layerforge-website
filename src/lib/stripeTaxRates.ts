import { stripe } from "./stripe";
import type { SalesTaxConfig } from "./taxConfig";

const MANAGED_BY = "layerforge-admin-tax-settings";

async function getOrCreateTaxRate({
  key,
  displayName,
  description,
  jurisdiction,
  state,
  percentage,
}: {
  key: "gst" | "pst";
  displayName: string;
  description: string;
  jurisdiction: string;
  state?: string;
  percentage: number;
}): Promise<string> {
  const taxRates = await stripe.taxRates.list({
    active: true,
    limit: 100,
  });

  const existing = taxRates.data.find(
    (rate) =>
      rate.metadata?.managedBy === MANAGED_BY &&
      rate.metadata?.taxKey === key &&
      Number(rate.percentage) === percentage &&
      rate.inclusive === false,
  );

  if (existing) {
    return existing.id;
  }

  const created = await stripe.taxRates.create({
    display_name: displayName,
    description,
    inclusive: false,
    jurisdiction,
    percentage,
    country: "CA",
    ...(state ? { state } : {}),
    metadata: {
      managedBy: MANAGED_BY,
      taxKey: key,
      configuredRate: String(percentage),
    },
  });

  return created.id;
}

export async function getCheckoutTaxRateIds(
  province: string,
  config: SalesTaxConfig,
): Promise<string[]> {
  const normalizedProvince = String(province ?? "")
    .trim()
    .toUpperCase();
  const taxRateIds: string[] = [];

  if (config.gstEnabled && config.gstRate > 0) {
    taxRateIds.push(
      await getOrCreateTaxRate({
        key: "gst",
        displayName: "GST",
        description: "Federal Goods and Services Tax",
        jurisdiction: "Canada",
        percentage: config.gstRate,
      }),
    );
  }

  if (config.pstEnabled && config.pstRate > 0 && normalizedProvince === "BC") {
    taxRateIds.push(
      await getOrCreateTaxRate({
        key: "pst",
        displayName: "PST",
        description: "British Columbia Provincial Sales Tax",
        jurisdiction: "British Columbia",
        state: "BC",
        percentage: config.pstRate,
      }),
    );
  }

  return taxRateIds;
}
