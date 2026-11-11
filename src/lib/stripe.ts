import Stripe from "stripe";

import {
  attachCheckoutCustomer,
  isLocalPickupCheckout,
  LOCAL_PICKUP_TAX_ADDRESS,
} from "./stripeCheckoutTax";

const stripeClient = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
});

const createCheckoutSession =
  stripeClient.checkout.sessions.create.bind(stripeClient.checkout.sessions);

Object.defineProperty(stripeClient.checkout.sessions, "create", {
  configurable: true,
  value: async (
    params: Stripe.Checkout.SessionCreateParams,
    options?: Stripe.RequestOptions,
  ) => {
    if (
      isLocalPickupCheckout(params) &&
      !params.customer &&
      typeof params.customer_email === "string" &&
      params.customer_email.trim()
    ) {
      const pickupCustomer = await stripeClient.customers.create({
        email: params.customer_email.trim(),
        address: LOCAL_PICKUP_TAX_ADDRESS,
        metadata: {
          layer_forge_tax_location: "local_pickup_surrey_bc",
        },
      });

      return createCheckoutSession(
        attachCheckoutCustomer(params, pickupCustomer.id),
        options,
      );
    }

    return createCheckoutSession(params, options);
  },
});

export const stripe = stripeClient;
