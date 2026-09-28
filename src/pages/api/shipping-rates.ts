import type { APIRoute } from "astro";

import { isSameOriginRequest } from "../../lib/isSameOriginRequest";
import { SHIPPING_RATES, type Province } from "../../lib/shipping";
import {
  getShippingRates,
  StallionError,
  type ShippingDestination,
} from "../../lib/stallion";

export const prerender = false;

function stringValue(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const customer =
      body?.customer && typeof body.customer === "object"
        ? (body.customer as Record<string, unknown>)
        : {};
    const items = Array.isArray(body?.items) ? body.items : [];
    const provinceCode = stringValue(customer.province, 2).toUpperCase();
    const postalCode = stringValue(customer.postalCode, 10).toUpperCase();
    const address1 = stringValue(customer.address, 160);
    const city = stringValue(customer.city, 80);

    if (!(provinceCode in SHIPPING_RATES)) {
      return Response.json(
        { error: "Select a supported Canadian province." },
        { status: 400 },
      );
    }

    if (!/^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/.test(postalCode)) {
      return Response.json(
        { error: "Enter a valid Canadian postal code." },
        { status: 400 },
      );
    }

    if (!address1 || !city) {
      return Response.json(
        { error: "Enter your street address and city first." },
        { status: 400 },
      );
    }

    const totalQuantity = items.reduce((total: number, item: unknown) => {
      const quantity = Number(
        item && typeof item === "object"
          ? (item as Record<string, unknown>).quantity
          : 0,
      );
      return (
        total +
        (Number.isInteger(quantity) && quantity > 0 && quantity <= 100
          ? quantity
          : 0)
      );
    }, 0);

    if (totalQuantity < 1 || totalQuantity > 5_000) {
      return Response.json({ error: "Your cart is empty." }, { status: 400 });
    }

    const destination: ShippingDestination = {
      name:
        [
          stringValue(customer.firstName, 80),
          stringValue(customer.lastName, 80),
        ]
          .filter(Boolean)
          .join(" ") || "Layer Forge customer",
      address1,
      address2: stringValue(customer.unit, 40) || undefined,
      city,
      provinceCode: provinceCode as Province,
      postalCode,
    };
    const rates = await getShippingRates(destination, totalQuantity);

    return Response.json({ rates });
  } catch (error) {
    if (error instanceof StallionError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error("Unable to quote shipping rates.", { error });
    return Response.json(
      { error: "Unable to load shipping rates." },
      { status: 500 },
    );
  }
};
