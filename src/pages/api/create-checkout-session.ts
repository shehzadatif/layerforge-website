import type { APIRoute } from "astro";

import { isSameOriginRequest } from "../../lib/isSameOriginRequest";
import {
  createOrder,
  createOrderItems,
  updateStripeSession,
  type CustomerInfo,
} from "../../lib/orders";
import { getShippingCost, SHIPPING_RATES } from "../../lib/shipping";
import { stripe } from "../../lib/stripe";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import {
  formatProductionDuration,
  getEstimatedReadyDate,
  getOrderProductionDays,
} from "../../lib/productionEstimate";

export const prerender = false;

const MAX_CART_LINES = 50;
const MAX_QUANTITY_PER_LINE = 100;

interface RequestedCheckoutItem {
  id?: unknown;
  materialId?: unknown;
  quantity?: unknown;
  price?: unknown;
}

interface MaterialRecord {
  id: string;
  name: string;
  markup_percent: number | string | null;
  default_production_days: number | string | null;
}

interface ProductMaterialRecord {
  material_id: string;
  materials: MaterialRecord | MaterialRecord[] | null;
}

interface ProductRecord {
  id: string;
  name: string;
  price: number | string | null;
  sale_price: number | string | null;
  status: string | null;
  product_materials: ProductMaterialRecord[] | null;
}

interface TrustedCheckoutItem {
  id: string;
  name: string;
  materialId: string;
  materialName: string;
  quantity: number;
  price: number;
  productionDays: number;
  unitPriceCents: number;
}

class CheckoutRequestError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "INVALID_CHECKOUT",
  ) {
    super(message);
  }
}

function textValue(
  value: unknown,
  label: string,
  maxLength: number,
  required = true,
): string {
  const text = typeof value === "string" ? value.trim() : "";

  if (required && !text) {
    throw new CheckoutRequestError(`${label} is required.`);
  }

  if (text.length > maxLength) {
    throw new CheckoutRequestError(`${label} is too long.`);
  }

  return text;
}

function validateCustomer(value: unknown): CustomerInfo {
  if (!value || typeof value !== "object") {
    throw new CheckoutRequestError("Customer information is required.");
  }

  const input = value as Record<string, unknown>;
  const email = textValue(input.email, "Email", 254).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new CheckoutRequestError("Enter a valid email address.");
  }

  const deliveryMethod = textValue(input.deliveryMethod, "Delivery method", 20);

  if (deliveryMethod !== "shipping" && deliveryMethod !== "pickup") {
    throw new CheckoutRequestError("Select a valid delivery method.");
  }

  const requestedProvince = textValue(
    input.province,
    "Province",
    2,
  ).toUpperCase();

  if (!(requestedProvince in SHIPPING_RATES)) {
    throw new CheckoutRequestError("Select a supported Canadian province.");
  }

  const shipping = deliveryMethod === "shipping";
  const postalCode = textValue(
    input.postalCode,
    "Postal code",
    10,
    shipping,
  ).toUpperCase();

  if (shipping && !/^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/.test(postalCode)) {
    throw new CheckoutRequestError("Enter a valid Canadian postal code.");
  }

  return {
    firstName: textValue(input.firstName, "First name", 80),
    lastName: textValue(input.lastName, "Last name", 80),
    email,
    phone: textValue(input.phone, "Phone number", 30),
    address: textValue(input.address, "Street address", 160, shipping),
    unit: textValue(input.unit, "Unit", 40, false),
    city: textValue(input.city, "City", 80, shipping),
    province: shipping ? requestedProvince : "BC",
    postalCode: shipping ? postalCode : "",
    deliveryMethod,
  };
}

function getMaterial(relation: ProductMaterialRecord): MaterialRecord | null {
  if (Array.isArray(relation.materials)) {
    return relation.materials[0] ?? null;
  }

  return relation.materials;
}

async function buildTrustedItems(
  requestedItems: RequestedCheckoutItem[],
): Promise<TrustedCheckoutItem[]> {
  if (requestedItems.length === 0 || requestedItems.length > MAX_CART_LINES) {
    throw new CheckoutRequestError(
      "The cart must contain between 1 and 50 items.",
    );
  }

  const normalizedItems = requestedItems.map((item) => {
    const id = textValue(item?.id, "Product", 100);
    const materialId = textValue(item?.materialId, "Material", 100);
    const quantity = Number(item?.quantity);
    const displayedPrice = Number(item?.price);

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY_PER_LINE
    ) {
      throw new CheckoutRequestError(
        `Quantity must be between 1 and ${MAX_QUANTITY_PER_LINE}.`,
      );
    }

    if (!Number.isFinite(displayedPrice) || displayedPrice <= 0) {
      throw new CheckoutRequestError(
        "The cart contains an invalid displayed price.",
      );
    }

    return {
      id,
      materialId,
      quantity,
      displayedPriceCents: Math.round(displayedPrice * 100),
    };
  });

  const productIds = [...new Set(normalizedItems.map((item) => item.id))];

  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      `
      id,
      name,
      price,
      sale_price,
      status,
      product_materials(
        material_id,
        materials(
          id,
          name,
          markup_percent,
          default_production_days
        )
      )
    `,
    )
    .in("id", productIds);

  if (error) {
    console.error("Unable to validate checkout products.", {
      productIds,
      error,
    });

    throw new Error("Product validation failed.");
  }

  const products = new Map(
    ((data ?? []) as ProductRecord[]).map((product) => [
      String(product.id),
      product,
    ]),
  );

  return normalizedItems.map((requestedItem) => {
    const product = products.get(requestedItem.id);

    if (!product || product.status !== "Active") {
      throw new CheckoutRequestError(
        "A product in your cart is no longer available.",
        409,
        "PRODUCT_UNAVAILABLE",
      );
    }

    const relation = (product.product_materials ?? []).find(
      (item) => String(item.material_id) === requestedItem.materialId,
    );
    const material = relation ? getMaterial(relation) : null;

    if (!material) {
      throw new CheckoutRequestError(
        `The selected material is unavailable for ${product.name}.`,
        409,
        "MATERIAL_UNAVAILABLE",
      );
    }

    const regularPrice = Number(product.price);
    const salePrice = Number(product.sale_price);
    const basePrice =
      Number.isFinite(salePrice) && salePrice > 0 ? salePrice : regularPrice;
    const markupPercent = Number(material.markup_percent ?? 0);

    if (
      !Number.isFinite(basePrice) ||
      basePrice <= 0 ||
      !Number.isFinite(markupPercent) ||
      markupPercent <= -100
    ) {
      throw new CheckoutRequestError(
        `Pricing is unavailable for ${product.name}.`,
        409,
        "PRICING_UNAVAILABLE",
      );
    }

    const unitPriceCents = Math.round(
      basePrice * (1 + markupPercent / 100) * 100,
    );

    if (unitPriceCents <= 0) {
      throw new CheckoutRequestError(
        `Pricing is unavailable for ${product.name}.`,
        409,
        "PRICING_UNAVAILABLE",
      );
    }

    if (requestedItem.displayedPriceCents !== unitPriceCents) {
      throw new CheckoutRequestError(
        `The price of ${product.name} has changed. Remove it from your cart and add it again before checking out.`,
        409,
        "CART_PRICE_CHANGED",
      );
    }

    const productionDays = Number(material.default_production_days ?? 0);

    return {
      id: String(product.id),
      name: String(product.name),
      materialId: String(material.id),
      materialName: String(material.name),
      quantity: requestedItem.quantity,
      price: unitPriceCents / 100,
      productionDays:
        Number.isFinite(productionDays) && productionDays >= 0
          ? Math.round(productionDays)
          : 0,
      unitPriceCents,
    };
  });
}

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      {
        error: "Invalid request origin.",
        code: "INVALID_ORIGIN",
      },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const requestedItems = Array.isArray(body?.items)
      ? (body.items as RequestedCheckoutItem[])
      : [];

    if (body?.termsAccepted !== true) {
      throw new CheckoutRequestError(
        "You must review and accept the Terms & Policies.",
      );
    }

    const customer = validateCustomer(body?.customer);
    const trustedItems = await buildTrustedItems(requestedItems);

    const subtotalCents = trustedItems.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0,
    );
    const orderStartTime = new Date();
    const subtotal = subtotalCents / 100;
    const productionDays = getOrderProductionDays(trustedItems);
    const estimatedReadyDate = getEstimatedReadyDate(
      orderStartTime,
      productionDays,
    );

    customer.materialSummary = [
      ...new Set(trustedItems.map((item) => item.materialName)),
    ].join(", ");

    const shippingCost = getShippingCost(
      customer.deliveryMethod,
      customer.province as keyof typeof SHIPPING_RATES,
    );

    if (
      customer.deliveryMethod === "shipping" &&
      (!Number.isFinite(shippingCost) || shippingCost <= 0)
    ) {
      throw new CheckoutRequestError(
        "Shipping is unavailable for the selected province.",
      );
    }

    const baseUrl = import.meta.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

    if (!baseUrl) {
      throw new Error("Missing PUBLIC_SITE_URL environment variable.");
    }

    const order = await createOrder(customer, subtotal);
    await createOrderItems(order.id, trustedItems);

    const stripeCustomer =
      customer.deliveryMethod === "shipping"
        ? await stripe.customers.create({
            email: customer.email,
            name: `${customer.firstName} ${customer.lastName}`,
            phone: customer.phone,
            address: {
              line1: customer.address,
              line2: customer.unit || undefined,
              city: customer.city,
              state: customer.province,
              postal_code: customer.postalCode,
              country: "CA",
            },
            shipping: {
              name: `${customer.firstName} ${customer.lastName}`,
              phone: customer.phone,
              address: {
                line1: customer.address,
                line2: customer.unit || undefined,
                city: customer.city,
                state: customer.province,
                postal_code: customer.postalCode,
                country: "CA",
              },
            },
            metadata: {
              orderId: order.id,
            },
          })
        : null;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ...(stripeCustomer
        ? { customer: stripeCustomer.id }
        : { customer_email: customer.email }),
      automatic_tax: {
        enabled: true,
      },
      custom_text: {
        submit: {
          message:
            "Final sale: By completing payment, you acknowledge that this order is non-refundable, except where a refund is required by applicable law.",
        },
      },
      shipping_options:
        customer.deliveryMethod === "pickup"
          ? [
              {
                shipping_rate_data: {
                  display_name: "Local Pickup",
                  type: "fixed_amount",
                  fixed_amount: {
                    amount: 0,
                    currency: "cad",
                  },
                },
              },
            ]
          : [
              {
                shipping_rate_data: {
                  display_name: `Shipping to ${customer.province}`,
                  type: "fixed_amount",
                  fixed_amount: {
                    amount: Math.round(shippingCost * 100),
                    currency: "cad",
                  },
                },
              },
            ],
      billing_address_collection: "required",
      metadata: {
        orderId: order.id,
        termsAccepted: "true",
        termsVersion: "2026-07-20",
        refundPolicyAccepted: "true",
        productionDays: String(productionDays),
        ...(estimatedReadyDate
          ? {
              estimatedReadyDate: estimatedReadyDate.toISOString().slice(0, 10),
            }
          : {}),
      },
      line_items: trustedItems.map((item) => ({
        price_data: {
          currency: "cad",
          product_data: {
            name: item.name,
            description: item.productionDays
              ? `${item.materialName} · ${formatProductionDuration(item.productionDays)} production`
              : item.materialName,
          },
          unit_amount: item.unitPriceCents,
        },
        quantity: item.quantity,
      })),
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/cancel`,
    });

    await updateStripeSession(order.id, session.id);

    return Response.json({
      url: session.url,
    });
  } catch (error) {
    if (error instanceof CheckoutRequestError) {
      return Response.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.status },
      );
    }

    console.error("Unable to create checkout session.", {
      error,
    });

    return Response.json(
      {
        error: "Unable to create checkout session.",
        code: "CHECKOUT_FAILED",
      },
      { status: 500 },
    );
  }
};
