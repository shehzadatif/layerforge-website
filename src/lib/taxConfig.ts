export interface SalesTaxConfig {
  gstEnabled: boolean;
  gstRate: number;
  pstEnabled: boolean;
  pstRate: number;
}

export interface SalesTaxBreakdown {
  taxableAmountCents: number;
  gstRate: number;
  gstAmountCents: number;
  pstRate: number;
  pstAmountCents: number;
  totalTaxCents: number;
  totalCents: number;
}

export const DEFAULT_SALES_TAX_CONFIG: SalesTaxConfig = {
  gstEnabled: false,
  gstRate: 5,
  pstEnabled: true,
  pstRate: 7,
};

export const SALES_TAX_SETTING_KEYS = [
  "gst_enabled",
  "gst_rate",
  "pst_enabled",
  "pst_rate",
] as const;

function settingValue(
  settings: ReadonlyMap<string, unknown> | Record<string, unknown>,
  key: string,
): unknown {
  return settings instanceof Map ? settings.get(key) : settings[key];
}

function enabledSetting(value: unknown, fallback: boolean): boolean {
  if (value == null) return fallback;

  return String(value).toLowerCase() === "true";
}

function rateSetting(value: unknown, fallback: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return fallback;
  }

  return Math.round(parsed * 10_000) / 10_000;
}

export function parseSalesTaxConfig(
  settings: ReadonlyMap<string, unknown> | Record<string, unknown>,
): SalesTaxConfig {
  return {
    gstEnabled: enabledSetting(
      settingValue(settings, "gst_enabled"),
      DEFAULT_SALES_TAX_CONFIG.gstEnabled,
    ),
    gstRate: rateSetting(
      settingValue(settings, "gst_rate"),
      DEFAULT_SALES_TAX_CONFIG.gstRate,
    ),
    pstEnabled: enabledSetting(
      settingValue(settings, "pst_enabled"),
      DEFAULT_SALES_TAX_CONFIG.pstEnabled,
    ),
    pstRate: rateSetting(
      settingValue(settings, "pst_rate"),
      DEFAULT_SALES_TAX_CONFIG.pstRate,
    ),
  };
}

export function calculateSalesTaxes(
  taxableAmountCents: number,
  province: string,
  config: SalesTaxConfig = DEFAULT_SALES_TAX_CONFIG,
): SalesTaxBreakdown {
  const safeTaxableAmountCents = Number.isFinite(taxableAmountCents)
    ? Math.max(0, Math.round(taxableAmountCents))
    : 0;
  const normalizedProvince = String(province ?? "")
    .trim()
    .toUpperCase();
  const gstRate = config.gstEnabled ? rateSetting(config.gstRate, 0) : 0;
  const pstRate =
    config.pstEnabled && normalizedProvince === "BC"
      ? rateSetting(config.pstRate, 0)
      : 0;
  const gstAmountCents = Math.round(safeTaxableAmountCents * (gstRate / 100));
  const pstAmountCents = Math.round(safeTaxableAmountCents * (pstRate / 100));
  const totalTaxCents = gstAmountCents + pstAmountCents;

  return {
    taxableAmountCents: safeTaxableAmountCents,
    gstRate,
    gstAmountCents,
    pstRate,
    pstAmountCents,
    totalTaxCents,
    totalCents: safeTaxableAmountCents + totalTaxCents,
  };
}

export function formatTaxRate(rate: number): string {
  return Number(rate).toLocaleString("en-CA", {
    maximumFractionDigits: 4,
  });
}
