import type { APIRoute } from "astro";

import { isSameOriginRequest } from "../../lib/isSameOriginRequest";
import { SHIPPING_RATES, type Province } from "../../lib/shipping";

export const prerender = false;

const AUTOCOMPLETE_ENDPOINT =
  "https://api.geoapify.com/v1/geocode/autocomplete";
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

const PROVINCE_CODES: Record<string, Province> = {
  alberta: "AB",
  "british columbia": "BC",
  manitoba: "MB",
  "new brunswick": "NB",
  "newfoundland and labrador": "NL",
  "newfoundland & labrador": "NL",
  "northwest territories": "NT",
  "nova scotia": "NS",
  nunavut: "NU",
  ontario: "ON",
  "prince edward island": "PE",
  quebec: "QC",
  saskatchewan: "SK",
  yukon: "YT",
};

interface GeoapifyResult {
  address_line1?: unknown;
  address_line2?: unknown;
  city?: unknown;
  country_code?: unknown;
  county?: unknown;
  formatted?: unknown;
  housenumber?: unknown;
  municipality?: unknown;
  place_id?: unknown;
  postcode?: unknown;
  result_type?: unknown;
  state?: unknown;
  state_code?: unknown;
  town?: unknown;
  village?: unknown;
}

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRateLimited(request: Request): boolean {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0];
  const clientId =
    request.headers.get("CF-Connecting-IP")?.trim() ||
    forwardedFor?.trim() ||
    "unknown";
  const now = Date.now();
  const current = rateLimitBuckets.get(clientId);

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(clientId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });

    if (rateLimitBuckets.size > 1_000) {
      for (const [key, bucket] of rateLimitBuckets) {
        if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
      }
    }

    return false;
  }

  current.count += 1;
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

function getProvinceCode(row: GeoapifyResult): Province | null {
  const directCode = stringValue(row.state_code)
    .toUpperCase()
    .replace(/^CA-/, "");

  if (directCode in SHIPPING_RATES) {
    return directCode as Province;
  }

  return PROVINCE_CODES[stringValue(row.state).toLowerCase()] ?? null;
}

function getCity(row: GeoapifyResult): string {
  for (const value of [
    row.city,
    row.town,
    row.village,
    row.municipality,
    row.county,
  ]) {
    const city = stringValue(value);
    if (city) return city;
  }

  return "";
}

export const GET: APIRoute = async ({ request }) => {
  if (!isSameOriginRequest(request)) {
    return json({ error: "Invalid request origin." }, 403);
  }

  if (isRateLimited(request)) {
    return json(
      { error: "Too many address searches. Please wait a moment." },
      429,
    );
  }

  const apiKey = import.meta.env.GEOAPIFY_API_KEY?.trim();

  if (!apiKey) {
    return json(
      {
        error:
          "Address search is not configured yet. Please enter your address manually.",
      },
      503,
    );
  }

  const requestUrl = new URL(request.url);
  const searchTerm = (requestUrl.searchParams.get("q") ?? "").trim();

  if (searchTerm.length < 3 || searchTerm.length > 160) {
    return json({ error: "Enter at least three address characters." }, 400);
  }

  const url = new URL(AUTOCOMPLETE_ENDPOINT);
  url.searchParams.set("text", searchTerm);
  url.searchParams.set("filter", "countrycode:ca");
  url.searchParams.set("lang", "en");
  url.searchParams.set("limit", "8");
  url.searchParams.set("format", "json");
  url.searchParams.set("apiKey", apiKey);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(7_000),
    });

    if (!response.ok) {
      throw new Error(`Geoapify returned HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as { results?: unknown };
    const rows = Array.isArray(payload.results)
      ? (payload.results as GeoapifyResult[])
      : [];

    const suggestions = rows.flatMap((row) => {
      if (stringValue(row.country_code).toLowerCase() !== "ca") return [];

      const line1 = stringValue(row.address_line1);
      const city = getCity(row);
      const province = getProvinceCode(row);
      const isDeliverableAddress =
        Boolean(stringValue(row.housenumber)) ||
        stringValue(row.result_type) === "building";

      if (!line1 || !city || !province || !isDeliverableAddress) return [];

      const postalCode = stringValue(row.postcode).toUpperCase();
      const formatted = stringValue(row.formatted);
      const fallbackId = `${line1}|${city}|${province}|${postalCode}`;

      return [
        {
          id: stringValue(row.place_id) || fallbackId,
          text: line1,
          description:
            stringValue(row.address_line2) ||
            `${city}, ${province}${postalCode ? ` ${postalCode}` : ""}`,
          address: {
            line1,
            city,
            province,
            postalCode,
            label:
              formatted ||
              `${line1}, ${city}, ${province}${postalCode ? ` ${postalCode}` : ""}`,
          },
        },
      ];
    });

    return json({ suggestions });
  } catch (error) {
    console.error("Geoapify address lookup failed.", { error });

    return json(
      {
        error:
          "Address search is temporarily unavailable. Please enter your address manually.",
      },
      502,
    );
  }
};
