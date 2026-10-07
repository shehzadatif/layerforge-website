import { getShippingCost, type Province } from "./shipping";

const DEFAULT_BASE_URL = "https://ship.stallion.ca/api/v5";
const DEFAULT_ITEM_WEIGHT_LBS = 0.5;
const DEFAULT_PACKAGING_WEIGHT_LBS = 0.25;
const DEFAULT_PACKAGE_LENGTH_IN = 8;
const DEFAULT_PACKAGE_WIDTH_IN = 6;
const DEFAULT_PACKAGE_HEIGHT_IN = 4;

export interface ShippingDestination {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  provinceCode: Province;
  postalCode: string;
  email?: string;
  phone?: string;
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

export interface StallionPackage {
  weight: number;
  length: number;
  width: number;
  height: number;
}

export interface StallionRateShipment {
  totalQuantity: number;
  package: StallionPackage;
}

export interface StallionLabelRequest {
  destination: ShippingDestination;
  orderReference: string;
  package: StallionPackage;
  packageContents: string;
  service: string;
}

export interface StallionLabelResult {
  shipmentId: string;
  shipCode: string;
  trackingNumber: string;
  labelUrl: string;
  carrier: string;
  service: string;
  serviceName: string;
  costCents: number;
  currency: "CAD";
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

export function getEstimatedShipmentWeight(totalQuantity: number): number {
  const itemWeight = positiveNumber(
    process.env.STALLION_DEFAULT_ITEM_WEIGHT_LBS,
    DEFAULT_ITEM_WEIGHT_LBS,
  );
  const packagingWeight = positiveNumber(
    process.env.STALLION_PACKAGING_WEIGHT_LBS,
    DEFAULT_PACKAGING_WEIGHT_LBS,
  );

  return Math.max(
    0.1,
    Math.round(
      (packagingWeight + itemWeight * Math.max(0, totalQuantity)) * 100,
    ) / 100,
  );
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
  return Boolean(process.env.STALLION_TOKEN?.trim());
}

export async function getShippingRates(
  destination: ShippingDestination,
  shipment: number | StallionRateShipment,
): Promise<ShippingRate[]> {
  const token = process.env.STALLION_TOKEN?.trim();

  if (!token) {
    return [fallbackRate(destination.provinceCode)];
  }

  const totalQuantity =
    typeof shipment === "number" ? shipment : shipment.totalQuantity;
  const parcel =
    typeof shipment === "number"
      ? {
          weight: getEstimatedShipmentWeight(totalQuantity),
          length: positiveNumber(
            process.env.STALLION_DEFAULT_PACKAGE_LENGTH_IN,
            DEFAULT_PACKAGE_LENGTH_IN,
          ),
          width: positiveNumber(
            process.env.STALLION_DEFAULT_PACKAGE_WIDTH_IN,
            DEFAULT_PACKAGE_WIDTH_IN,
          ),
          height: positiveNumber(
            process.env.STALLION_DEFAULT_PACKAGE_HEIGHT_IN,
            DEFAULT_PACKAGE_HEIGHT_IN,
          ),
        }
      : shipment.package;
  const baseUrl = (
    process.env.STALLION_BASE_URL?.trim() || DEFAULT_BASE_URL
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
        type: "regular",
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
            weight: parcel.weight,
            weight_unit: "lbs",
            length: parcel.length,
            width: parcel.width,
            height: parcel.height,
            size_unit: "in",
            package_contents: "Layer Forge Canada order",
          },
        ],
        items: [
          {
            title: "Layer Forge Canada order",
            description: "Custom printed and fabricated products",
            customs_description: "Custom merchandise",
            quantity: Math.max(1, totalQuantity),
            value: 0.01,
            currency: "CAD",
            country_of_origin: "CA",
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

export async function getMultiPackageShippingRates(
  destination: ShippingDestination,
  packages: StallionPackage[],
  totalQuantity: number,
): Promise<ShippingRate[]> {
  if (packages.length === 0) {
    throw new StallionError("At least one shipping package is required.", 400);
  }

  if (packages.length === 1 || !stallionIsConfigured()) {
    return getShippingRates(destination, {
      totalQuantity,
      package: packages[0],
    });
  }

  const ratesByPackage = await Promise.all(
    packages.map((parcel) =>
      getShippingRates(destination, {
        totalQuantity,
        package: parcel,
      }),
    ),
  );
  const [firstRates, ...remainingRates] = ratesByPackage;

  return firstRates
    .flatMap((firstRate) => {
      const matchingRates = remainingRates.map((rates) =>
        rates.find((rate) => rate.service === firstRate.service),
      );

      if (matchingRates.some((rate) => !rate)) return [];

      const allRates = [firstRate, ...(matchingRates as ShippingRate[])];
      return [
        {
          ...firstRate,
          amountCents: allRates.reduce(
            (total, rate) => total + rate.amountCents,
            0,
          ),
          estimatedDays: allRates.reduce<number | undefined>(
            (longest, rate) =>
              rate.estimatedDays === undefined
                ? longest
                : Math.max(longest ?? 0, rate.estimatedDays),
            undefined,
          ),
        },
      ];
    })
    .sort((left, right) => left.amountCents - right.amountCents);
}

function stallionConfig(): { token: string; baseUrl: string } {
  const token = process.env.STALLION_TOKEN?.trim();

  if (!token) {
    throw new StallionError(
      "Stallion label purchasing is not configured.",
      503,
    );
  }

  return {
    token,
    baseUrl: (
      process.env.STALLION_BASE_URL?.trim() || DEFAULT_BASE_URL
    ).replace(/\/+$/, ""),
  };
}

function stallionError(
  payload: Record<string, unknown> | null,
  fallback: string,
  status: number,
): StallionError {
  const error =
    payload?.error && typeof payload.error === "object"
      ? (payload.error as Record<string, unknown>)
      : null;

  return new StallionError(
    text(error?.message) || fallback,
    status >= 400 && status < 500 ? status : 502,
  );
}

async function idempotencyKey(
  operation: string,
  body: unknown,
): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(body));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const hash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `layerforge-${operation}-${hash}`;
}

async function stallionJson(
  url: string,
  options: RequestInit,
  fallbackError: string,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!response.ok || !payload) {
      throw stallionError(payload, fallbackError, response.status);
    }

    return payload;
  } catch (error) {
    if (error instanceof StallionError) throw error;

    if (error instanceof Error && error.name === "AbortError") {
      throw new StallionError(
        "Stallion took too long to respond. No additional purchase was attempted.",
        504,
      );
    }

    throw new StallionError(fallbackError);
  } finally {
    clearTimeout(timeout);
  }
}

export async function createStallionLabel(
  request: StallionLabelRequest,
): Promise<StallionLabelResult> {
  const { token, baseUrl } = stallionConfig();
  const shipment = {
    type: "regular",
    to_address: {
      name: request.destination.name,
      address1: request.destination.address1,
      ...(request.destination.address2
        ? { address2: request.destination.address2 }
        : {}),
      city: request.destination.city,
      province_code: request.destination.provinceCode,
      postal_code: request.destination.postalCode,
      country_code: "CA",
      ...(request.destination.email
        ? { email: request.destination.email }
        : {}),
      ...(request.destination.phone
        ? { phone: request.destination.phone }
        : {}),
      is_residential: true,
    },
    packages: [
      {
        weight: request.package.weight,
        weight_unit: "lbs",
        length: request.package.length,
        width: request.package.width,
        height: request.package.height,
        size_unit: "in",
        package_contents: request.packageContents,
      },
    ],
    service: request.service,
    order_id: request.orderReference,
  };
  const createBody = { shipments: [shipment] };
  const createPayload = await stallionJson(
    `${baseUrl}/shipments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "LayerForgeCanada-Admin/1.0",
        "Idempotency-Key": await idempotencyKey("shipment", createBody),
      },
      body: JSON.stringify(createBody),
    },
    "Unable to create the Stallion shipment.",
  );
  const createData =
    createPayload.data && typeof createPayload.data === "object"
      ? (createPayload.data as Record<string, unknown>)
      : null;
  const shipments = Array.isArray(createData?.shipments)
    ? createData.shipments
    : [];
  const created =
    shipments[0] && typeof shipments[0] === "object"
      ? (shipments[0] as Record<string, unknown>)
      : null;
  const shipmentId = text(created?.id) || String(created?.id ?? "").trim();

  if (!shipmentId) {
    const errors = Array.isArray(createData?.errors) ? createData.errors : [];
    const firstError =
      errors[0] && typeof errors[0] === "object"
        ? (errors[0] as Record<string, unknown>)
        : null;

    throw new StallionError(
      text(firstError?.message) || "Stallion did not create the shipment.",
      422,
    );
  }

  const ratesPayload = await stallionJson(
    `${baseUrl}/rates/${encodeURIComponent(shipmentId)}?timeout=12`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "LayerForgeCanada-Admin/1.0",
      },
    },
    "Unable to verify the Stallion shipping service.",
  );
  const rates = (Array.isArray(ratesPayload.data) ? ratesPayload.data : [])
    .map(parseRate)
    .filter((rate): rate is ShippingRate => rate !== null)
    .sort((left, right) => left.amountCents - right.amountCents);
  const selectedRate =
    request.service === "cheapest_tracked"
      ? (rates[0] ?? null)
      : (rates.find((rate) => rate.service === request.service) ?? null);

  if (!selectedRate) {
    throw new StallionError(
      "The shipping service selected at checkout is no longer available. Refresh the order before purchasing a label.",
      409,
    );
  }

  const labelBody = {
    service: selectedRate.service,
    label_format: "pdf",
  };
  const labelPayload = await stallionJson(
    `${baseUrl}/labels/${encodeURIComponent(shipmentId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "LayerForgeCanada-Admin/1.0",
        "Idempotency-Key": await idempotencyKey(
          `label-${shipmentId}`,
          labelBody,
        ),
      },
      body: JSON.stringify(labelBody),
    },
    "Unable to purchase the Stallion label.",
  );
  const label =
    labelPayload.data && typeof labelPayload.data === "object"
      ? (labelPayload.data as Record<string, unknown>)
      : labelPayload;
  const labelUrl = text(label.label_url);
  const trackingNumber = text(label.tracking_number);
  const shipCode = text(label.ship_code);
  const parsedUrl = (() => {
    try {
      return new URL(labelUrl);
    } catch {
      return null;
    }
  })();

  if (!parsedUrl || parsedUrl.protocol !== "https:" || !trackingNumber) {
    throw new StallionError(
      "Stallion purchased the shipment but did not return a printable label. Check the shipment in Stallion before retrying.",
      502,
    );
  }

  const labelRate =
    label.rate && typeof label.rate === "object"
      ? (label.rate as Record<string, unknown>)
      : null;
  const chargedTotal = numberValue(labelRate?.total);
  const currency = text(labelRate?.currency).toUpperCase() || "CAD";

  if (currency !== "CAD") {
    throw new StallionError(
      "Stallion returned an unsupported label currency.",
      502,
    );
  }

  return {
    shipmentId,
    shipCode,
    trackingNumber,
    labelUrl: parsedUrl.toString(),
    carrier: text(labelRate?.carrier) || selectedRate.carrier,
    service: text(labelRate?.service) || selectedRate.service,
    serviceName: text(labelRate?.service_name) || selectedRate.serviceName,
    costCents: Math.round(
      (chargedTotal ?? selectedRate.amountCents / 100) * 100,
    ),
    currency: "CAD",
  };
}
