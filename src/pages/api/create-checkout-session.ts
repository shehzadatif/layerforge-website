import type { APIRoute } from "astro";
import { stripe } from "../../lib/stripe";
import { getShippingCost } from "../../lib/shipping";

import {
  createOrder,
  createOrderItems,
  updateStripeSession,
} from "../../lib/orders";

interface CheckoutItem {
  id: string;
  name: string;
  materialId?: string;
  materialName: string;
  image?: string;
  quantity: number;
  price: number;
  productionDays?: number;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { items, customer } = await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return Response.json(
        { error: "Cart is empty." },
        { status: 400 }
      );
    }

    if (!customer?.email) {
      return Response.json(
        { error: "Customer email is required." },
        { status: 400 }
      );
    }

    //
    // Calculate subtotal
    //
    const subtotal = items.reduce(
      (sum: number, item: CheckoutItem) =>
        sum + item.price * item.quantity,
      0
    );

    //
    // Build material summary
    //
    customer.materialSummary = [
      ...new Set(items.map((item) => item.materialName)),
    ].join(", ");

    //
    // Create Order
    //
    const order = await createOrder(customer, subtotal);

    //
    // Create Order Items
    //
    await createOrderItems(order.id, items);

   const baseUrl =
  import.meta.env.PUBLIC_SITE_URL
    ?.trim()
    .replace(/\/+$/, "");

if (!baseUrl) {
  throw new Error(
    "Missing PUBLIC_SITE_URL environment variable.",
  );
}




    //
    // Calculate shipping cost
    //
    const shippingCost = getShippingCost(
      customer.deliveryMethod,
      customer.province
    );
    //

    //
    // Create Stripe Checkout Session
    //
    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      customer_email: customer.email,

      automatic_tax: {
        enabled: true,
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
            display_name: "Flat Rate Shipping",
            type: "fixed_amount",
            fixed_amount: {
              amount: Math.round(shippingCost * 100),
              currency: "cad",
            },
          },
        },
      ],

      billing_address_collection: "required",

      shipping_address_collection: {
        allowed_countries: ["CA"],
      },

      metadata: {
        orderId: order.id,
      },

      line_items: items.map((item: CheckoutItem) => ({
        price_data: {
          currency: "cad",

          product_data: {
            name: item.name,
            description: item.materialName,
            images: item.image ? [item.image] : [],
          },

          unit_amount: Math.round(item.price * 100),
        },

        quantity: item.quantity,
      })),

      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${baseUrl}/checkout/cancel`,
    });

    //
    // Save Stripe Session ID
    //
    await updateStripeSession(
      order.id,
      session.id
    );

    return Response.json({
      url: session.url,
    });

  } catch (err) {
    console.error(err);

    return Response.json(
      {
        error: "Unable to create checkout session.",
      },
      {
        status: 500,
      }
    );
  }
};