import type { APIRoute } from "astro";

import { stripe } from "../../lib/stripe";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { quoteId } = await request.json();

    if (!quoteId) {
      return Response.json(
        {
          error: "Quote ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: quote, error: quoteError } =
      await supabaseAdmin
        .from("quotes")
        .select("*")
        .eq("id", quoteId)
        .single();

    if (quoteError || !quote) {
      return Response.json(
        {
          error: "Quote not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (quote.status !== "Approved") {
      return Response.json(
        {
          error: "Quote must be approved before payment.",
        },
        {
          status: 400,
        }
      );
    }

    if (quote.order_id) {
      return Response.json(
        {
          error: "This quote has already been converted to an order.",
        },
        {
          status: 409,
        }
      );
    }

    const quantity = Math.max(
      1,
      Number(quote.quantity ?? 1)
    );

    const quotedPrice = Number(
      quote.quoted_price ??
      quote.estimated_price ??
      0
    );

    const projectDetails =
      quote.project_details &&
      typeof quote.project_details === "object"
        ? quote.project_details
        : {};

    const unitPrice = Number(
      projectDetails.unit_price ??
      (quantity > 0
        ? quotedPrice / quantity
        : quotedPrice)
    );

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0
    ) {
      return Response.json(
        {
          error: "Quote price is invalid.",
        },
        {
          status: 400,
        }
      );
    }

    const baseUrl =
      import.meta.env.SITE ??
      "http://localhost:4321";

    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",

        customer_email: quote.email,

        automatic_tax: {
          enabled: true,
        },

        billing_address_collection: "required",

        shipping_address_collection: {
          allowed_countries: ["CA"],
        },

        metadata: {
          source: "quote",
          quoteId: quote.id,
        },

        line_items: [
          {
            price_data: {
              currency: "cad",

              product_data: {
                name:
                  quote.project_name ||
                  quote.service ||
                  "Custom Quote",

                description:
                  quote.material ||
                  quote.description ||
                  undefined,
              },

              unit_amount: Math.round(
                unitPrice * 100
              ),
            },

            quantity,
          },
        ],

        success_url:
          `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${baseUrl}/q/${quote.approval_token}`,
      });

    return Response.json({
      url: session.url,
    });
  } catch (error) {
    console.error(
      "Unable to create quote checkout session:",
      error
    );

    return Response.json(
      {
        error: "Unable to create payment session.",
      },
      {
        status: 500,
      }
    );
  }
};