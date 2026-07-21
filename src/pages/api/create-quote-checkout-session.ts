import type { APIRoute } from "astro";

import { isSameOriginRequest } from "../../lib/isSameOriginRequest";
import { stripe } from "../../lib/stripe";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      {
        error: "Invalid request origin.",
      },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const quoteId = String(body?.quoteId ?? "").trim();
    const approvalToken = String(body?.approvalToken ?? "").trim();

    if (body?.termsAccepted !== true) {
      return Response.json(
        {
          error: "You must review and accept the Terms & Policies.",
        },
        { status: 400 },
      );
    }

    if (!quoteId || !approvalToken) {
      return Response.json(
        {
          error: "Quote ID and approval token are required.",
        },
        {
          status: 400,
        },
      );
    }

    const { data: quote, error: quoteError } = await supabaseAdmin
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .eq("approval_token", approvalToken)
      .maybeSingle();

    if (quoteError || !quote) {
      return Response.json(
        {
          error: "Quote not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (quote.status !== "Approved") {
      return Response.json(
        {
          error: "Quote must be approved before payment.",
        },
        {
          status: 400,
        },
      );
    }

    if (quote.order_id) {
      return Response.json(
        {
          error: "This quote has already been converted to an order.",
        },
        {
          status: 409,
        },
      );
    }

    const quantity = Number(quote.quantity ?? 1);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
      return Response.json(
        {
          error: "Quote quantity is invalid.",
        },
        { status: 400 },
      );
    }

    const quotedPrice = Number(
      quote.quoted_price ?? quote.estimated_price ?? 0,
    );

    const projectDetails =
      quote.project_details && typeof quote.project_details === "object"
        ? quote.project_details
        : {};

    const unitPrice = Number(
      projectDetails.unit_price ??
        (quantity > 0 ? quotedPrice / quantity : quotedPrice),
    );

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0 ||
      Math.round(unitPrice * 100) <= 0
    ) {
      return Response.json(
        {
          error: "Quote price is invalid.",
        },
        {
          status: 400,
        },
      );
    }

    const baseUrl = import.meta.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

    if (!baseUrl) {
      throw new Error("Missing PUBLIC_SITE_URL environment variable.");
    }

    const isLocalPickup =
      String(quote.delivery_method ?? "").toLowerCase() === "pickup";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      customer_email: quote.email,

      automatic_tax: {
        enabled: true,
      },

      custom_text: {
        submit: {
          message:
            "Final sale: By completing payment, you acknowledge that this order is non-refundable, except where a refund is required by applicable law.",
        },
      },

      shipping_options: isLocalPickup
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
                  amount: 1500,
                  currency: "cad",
                },
              },
            },
          ],

      billing_address_collection: "required",

      shipping_address_collection: isLocalPickup
        ? undefined
        : {
            allowed_countries: ["CA"],
          },

      metadata: {
        source: "quote",
        quoteId: quote.id,
        termsAccepted: "true",
        termsVersion: "2026-07-20",
        refundPolicyAccepted: "true",
      },

      line_items: [
        {
          price_data: {
            currency: "cad",

            product_data: {
              name: quote.project_name || quote.service || "Custom Quote",

              description: quote.material || quote.description || undefined,
            },

            unit_amount: Math.round(unitPrice * 100),
          },

          quantity,
        },
      ],

      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${baseUrl}/q/${quote.approval_token}`,
    });

    return Response.json({
      url: session.url,
    });
  } catch (error) {
    console.error("Unable to create quote checkout session:", error);

    return Response.json(
      {
        error: "Unable to create payment session.",
      },
      {
        status: 500,
      },
    );
  }
};
