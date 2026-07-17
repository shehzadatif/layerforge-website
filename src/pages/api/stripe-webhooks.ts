import type { APIRoute } from "astro";
import Stripe from "stripe";

import { stripe } from "../../lib/stripe";
import { markOrderPaid } from "../../lib/orders";
import { convertPaidQuoteToOrder } from "../../lib/quoteToOrder";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing signature.", {
      status: 400,
    });
  }

  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      import.meta.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Stripe webhook signature error:", error);

    return new Response("Webhook Error", {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        const source = session.metadata?.source;
        const quoteId = session.metadata?.quoteId;
        const orderId = session.metadata?.orderId;

        if (source === "quote") {
          if (!quoteId) {
            throw new Error(
              "Quote checkout session is missing quoteId metadata."
            );
          }

          const createdOrderId =
            await convertPaidQuoteToOrder(
              quoteId,
              session
            );

          console.log(
            `Quote ${quoteId} converted to order ${createdOrderId}`
          );

          break;
        }

        if (!orderId) {
          throw new Error(
            "Checkout session is missing orderId metadata."
          );
        }

        const paymentIntent =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? "";

        await markOrderPaid(
          orderId,
          paymentIntent
        );

        console.log(
          `Order ${orderId} marked paid`
        );

        break;
      }

      default:
        console.log(
          `Unhandled Stripe event: ${event.type}`
        );
    }

    return Response.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Stripe webhook processing error:",
      error
    );

    return Response.json(
      {
        received: false,
        error: "Webhook processing failed.",
      },
      {
        status: 500,
      }
    );
  }
};