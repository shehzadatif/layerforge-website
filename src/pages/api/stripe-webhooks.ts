import type { APIRoute } from "astro";
import Stripe from "stripe";

import { stripe } from "../../lib/stripe";
import { markOrderPaid } from "../../lib/orders";
import {
  convertPaidQuoteToOrder,
  sendAdminOrderNotification,
  sendPaymentConfirmation,
  type CompletedOrder,
} from "../../lib/quoteToOrder";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error(
      "Stripe webhook request is missing the stripe-signature header.",
    );

    return new Response("Missing signature.", {
      status: 400,
    });
  }

  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    console.error(
      "STRIPE_WEBHOOK_SECRET is unavailable to the Worker runtime.",
    );

    return new Response("Webhook configuration error.", {
      status: 500,
    });
  }

  const body = await request.text();

  let event: Stripe.Event;

  try {
    const cryptoProvider = Stripe.createSubtleCryptoProvider();

    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider,
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
      hasSignature: Boolean(signature),
      webhookSecretConfigured: Boolean(webhookSecret),
    });

    return new Response("Webhook signature verification failed.", {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const source = session.metadata?.source;

        const quoteId = session.metadata?.quoteId;

        const orderId = session.metadata?.orderId;

        if (source === "quote") {
          if (!quoteId) {
            throw new Error(
              "Quote checkout session is missing quoteId metadata.",
            );
          }

          const createdOrderId = await convertPaidQuoteToOrder(
            quoteId,
            session,
          );

          console.log(`Quote ${quoteId} converted to order ${createdOrderId}`);

          break;
        }

        if (!orderId) {
          throw new Error("Checkout session is missing orderId metadata.");
        }

        const paymentIntent =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? "");

        const subtotal = Number(session.amount_subtotal ?? 0) / 100;

        const shipping = Number(session.shipping_cost?.amount_total ?? 0) / 100;

        const tax = Number(session.total_details?.amount_tax ?? 0) / 100;

        const total = Number(session.amount_total ?? 0) / 100;

        const { order, newlyPaid } = await markOrderPaid(
          orderId,
          paymentIntent,
          {
            subtotal,
            shipping,
            tax,
            total,
          },
        );

        console.log(`Order ${orderId} marked paid`);

        if (newlyPaid) {
          try {
            await sendPaymentConfirmation(order as CompletedOrder);
          } catch (emailError) {
            /*
             * Payment remains successful if invoice generation
             * or email delivery fails.
             */
            console.error("Unable to send Shop payment confirmation email.", {
              orderId,
              error: emailError,
            });
          }

          try {
            await sendAdminOrderNotification(order as CompletedOrder);
          } catch (emailError) {
            console.error(
              "Unable to send Shop admin order notification email.",
              {
                orderId,
                error: emailError,
              },
            );
          }
        } else {
          console.log(
            `Order ${orderId} was already paid; confirmation email skipped`,
          );
        }

        break;
      }

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    return Response.json({
      received: true,
    });
  } catch (error) {
    console.error("Stripe webhook processing error.", {
      eventId: event.id,
      eventType: event.type,
      error,
    });

    return Response.json(
      {
        received: false,
        error: "Webhook processing failed.",
      },
      {
        status: 500,
      },
    );
  }
};
