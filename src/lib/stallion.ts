import { getShippingCost, type Province } from "./shipping";

const DEFAULT_BASE_URL = "https://sandbox.stallion.ca/api/v5";
const DEFAULT_ITEM_WEIGHT_LBS = 0.5;
const DEFAULT_PACKAGING_WEIGHT_LBS = 0.25;

export interface ShippingDestination {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  provinceCode: Province;
  postalCode: string;
}

export interface ShippingRate {
  service: string;
  carrier: string;
  serviceName: string;
  amountCents: number;
  currency: "CAD";
  estimatedDays?: number;
  source: "stallion" | "fallback";
}

export class StallionError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRate(value: unknown): ShippingRate | null {
  if (!value || typeof value !== "object") return null;

  const rate = value as Record<string, unknown>;
  const carrierObject =
    rate.carrier && typeof rate.carrier === "object"
      ? (rate.carrier as Record<string, unknown>)
      : null;
  const service =
    text(rate.service) ||
    text(rate.service_code) ||
    text(carrierObject?.service_code);
  const carrier =
    text(rate.carrier_name) ||
    text(carrierObject?.name) ||
    text(rate.carrier) ||
    "Carrier";
  const serviceName =
    text(rate.service_name) || text(carrierObject?.service_name) || service;
  const total =
    numberValue(rate.total) ??
    numberValue(rate.amount) ??
    numberValue(rate.price);
  const currency = text(rate.currency).toUpperCase() || "CAD";
  const estimatedDays =
    numberValue(rate.estimated_days) ??
    numberValue(rate.delivery_days) ??
    numberValue(rate.transit_days);

  if (!service || !serviceName || total === null || total <= 0) return null;
  if (currency !== "CAD") return null;

  return {
    service,
    carrier,
    serviceName,
    amountCents: Math.round(total * 100),
    currency: "CAD",
    ...(estimatedDays !== null && estimatedDays >= 0
      ? { estimatedDays: Math.round(estimatedDays) }
      : {}),
    source: "stallion",
  };
}

function fallbackRate(province: Province): ShippingRate {
  const amount = getShippingCost("shipping", province);

  return {
    service: `layerforge.flat.${province.toLowerCase()}`,
    carrier: "Layer Forge Canada",
    serviceName: "Standard shipping",
    amountCents: Math.round(amount * 100),
    currency: "CAD",
    source: "fallback",
  };
}

export function stallionIsConfigured(): boolean {
  return Boolean(import.meta.env.STALLION_TOKEN?.trim());
}

export async function getShippingRates(
  destination: ShippingDestination,
  totalQuantity: number,
): Promise<ShippingRate[]> {
  const token = import.meta.env.STALLION_TOKEN?.trim();

  if (!token) {
    return [fallbackRate(destination.provinceCode)];
  }

  const itemWeight = positiveNumber(
    import.meta.env.STALLION_DEFAULT_ITEM_WEIGHT_LBS,
    DEFAULT_ITEM_WEIGHT_LBS,
  );
  const packagingWeight = positiveNumber(
    import.meta.env.STALLION_PACKAGING_WEIGHT_LBS,
    DEFAULT_PACKAGING_WEIGHT_LBS,
  );
  const weight = Math.max(
    0.1,
    Math.round((packagingWeight + itemWeight * totalQuantity) * 100) / 100,
  );
  const baseUrl = (
    import.meta.env.STALLION_BASE_URL?.trim() || DEFAULT_BASE_URL
  ).replace(/\/+$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`${baseUrl}/rates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "LayerForgeCanada-Checkout/1.0",
      },
      body: JSON.stringify({
        to_address: {
          name: destination.name,
          address1: destination.address1,
          ...(destination.address2 ? { address2: destination.address2 } : {}),
          city: destination.city,
          province_code: destination.provinceCode,
          postal_code: destination.postalCode,
          country_code: "CA",
        },
        packages: [
          {
            weight,
            weight_unit: "lbs",
            package_contents: "Layer Forge Canada order",
          },
        ],
        timeout: 8,
      }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!response.ok) {
      const error =
        payload?.error && typeof payload.error === "object"
          ? (payload.error as Record<string, unknown>)
          : null;

      throw new StallionError(
        text(error?.message) || "Stallion could not quote this address.",
        response.status >= 400 && response.status < 500 ? 400 : 502,
      );
    }

    const rates = (Array.isArray(payload?.data) ? payload.data : [])
      .map(parseRate)
      .filter((rate): rate is ShippingRate => rate !== null)
      .sort((left, right) => left.amountCents - right.amountCents);

    if (rates.length === 0) {
      throw new StallionError(
        "No Stallion shipping services are available for this address.",
        409,
      );
    }

    return rates;
  } catch (error) {
    if (error instanceof StallionError) throw error;

    if (error instanceof Error && error.name === "AbortError") {
      throw new StallionError(
        "Shipping rates took too long to load. Please try again.",
        504,
      );
    }

    throw new StallionError("Unable to load Stallion shipping rates.");
  } finally {
    clearTimeout(timeout);
  }
}
