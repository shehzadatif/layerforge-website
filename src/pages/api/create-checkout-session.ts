import type { APIRoute } from "astro";
import { stripe } from "../../lib/stripe";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { items } = await request.json();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      payment_method_types: ["card"],

      line_items: items.map((item: any) => ({
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

      success_url:
        "http://localhost:4321/checkout/success",

      cancel_url:
        "http://localhost:4321/checkout",

      billing_address_collection: "required",
    });

    return new Response(
      JSON.stringify({
        url: session.url,
      }),
      {
        status: 200,
      }
    );
  } catch (err) {
    console.error(err);

    return new Response(
      JSON.stringify({
        error: "Unable to create checkout session.",
      }),
      {
        status: 500,
      }
    );
  }
};