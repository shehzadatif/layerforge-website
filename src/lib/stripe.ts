import Stripe from "stripe";

export const stripe = new Stripe(
  import.meta.env.STRIPE_SECRET_KEY,
  {
    apiVersion: "2025-06-30.basil",
  }
);