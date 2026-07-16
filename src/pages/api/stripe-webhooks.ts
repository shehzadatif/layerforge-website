import type { APIRoute } from "astro";
import Stripe from "stripe";

import { stripe } from "../../lib/stripe";
import {
  markOrderPaid,
  getOrderForNotification,
} from "../../lib/orders";

import { sendOrderConfirmation } from "../../services/notifications";

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
  } catch (err) {
    console.error(err);

    return new Response("Webhook Error", {
      status: 400,
    });
  }

  switch (event.type) {
    case "checkout.session.completed": {

      const session =
        event.data.object as Stripe.Checkout.Session;

      const orderId =
        session.metadata?.orderId;

      if (!orderId) {
        console.error("Missing orderId");

        break;
      }

     await markOrderPaid(
  orderId,
  String(session.payment_intent)
);

const order =
  await getOrderForNotification(orderId);

await sendOrderConfirmation(order);

console.log(
  `Order ${orderId} marked paid`
);

      break;
    }

    default:
      console.log(
        `Unhandled event ${event.type}`
      );
  }

  return new Response(
    JSON.stringify({
      received: true,
    }),
    {
      status: 200,
    }
  );
};