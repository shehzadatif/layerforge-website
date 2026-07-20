import type Stripe from "stripe";
import { Resend } from "resend";

import { supabaseAdmin } from "./supabaseAdmin";
import { generateTrackingToken } from "./tracking";
import { ORDER_STATUS } from "./orderStatus";
import { generateInvoicePdf } from "./invoicePdf";
import { paymentConfirmationHtml } from "./emailTemplates/paymentConfirmation";

interface CompletedOrder {
  id: string;
  order_number: number | string;
  customer_name: string | null;
  email: string | null;
  total: number | string;
  tracking_token: string;
  order_items?: unknown[];
}

export async function convertPaidQuoteToOrder(
  quoteId: string,
  session: Stripe.Checkout.Session,
): Promise<string> {
  const { data: quote, error: quoteError } =
    await supabaseAdmin
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();

  if (quoteError) {
    throw new Error(
      `Unable to load quote: ${quoteError.message}`,
    );
  }

  if (!quote) {
    throw new Error("Quote not found.");
  }

  /*
   * Stripe may retry webhooks. Return the existing order
   * instead of creating another one.
   */
  if (quote.order_id) {
    return quote.order_id;
  }

  const quantity = Math.max(
    1,
    Number(quote.quantity ?? 1),
  );

  const quotedPrice = Number(
    quote.quoted_price ??
      quote.estimated_price ??
      0,
  );

  if (!Number.isFinite(quotedPrice) || quotedPrice < 0) {
    throw new Error("Quote price is invalid.");
  }

  const projectDetails =
    quote.project_details &&
    typeof quote.project_details === "object"
      ? quote.project_details
      : {};

  const unitPrice = Number(
    projectDetails.unit_price ??
      quotedPrice / quantity,
  );

  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new Error("Quote unit price is invalid.");
  }

  const customerDetails = session.customer_details;
  const address = customerDetails?.address;

  const subtotal =
    Number(session.amount_subtotal ?? 0) / 100;

  const shipping =
    Number(session.shipping_cost?.amount_total ?? 0) /
    100;

  const tax =
    Number(session.total_details?.amount_tax ?? 0) /
    100;

  const total =
    Number(session.amount_total ?? 0) / 100;

  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? "";

  const trackingToken = generateTrackingToken();

  const { data: order, error: orderError } =
    await supabaseAdmin
      .from("orders")
      .insert({
        customer_name:
          customerDetails?.name ??
          quote.name ??
          "",

        email:
          customerDetails?.email ??
          quote.email ??
          "",

        phone:
          customerDetails?.phone ??
          quote.phone ??
          "",

        shipping_address:
          address?.line1 ?? "",

        unit:
          address?.line2 ?? "",

        city:
          address?.city ?? "",

        province:
          address?.state ?? "",

        postal_code:
          address?.postal_code ?? "",

        country:
          address?.country ?? "CA",

        delivery_method: "shipping",

        material_summary:
          quote.material ?? "",

        subtotal,
        shipping,
        tax,
        total,

        payment_status: "Paid",
        order_status: ORDER_STATUS.IN_PROGRESS,

        stripe_session_id: session.id,
        stripe_payment_intent: paymentIntent,
        tracking_token: trackingToken,
      })
      .select()
      .single();

  if (orderError || !order) {
    throw new Error(
      `Unable to create order: ${
        orderError?.message ?? "Unknown error"
      }`,
    );
  }

  const { error: itemError } =
    await supabaseAdmin
      .from("order_items")
      .insert({
        order_id: order.id,
        product_id: null,

        product_name:
          quote.project_name ||
          quote.service ||
          "Custom Quote",

        material: quote.material ?? "",
        quantity,
        unit_price: unitPrice,
        total_price: quotedPrice,
        production_days: 0,
      });

  if (itemError) {
    await supabaseAdmin
      .from("orders")
      .delete()
      .eq("id", order.id);

    throw new Error(
      `Unable to create order item: ${itemError.message}`,
    );
  }

  const { error: updateQuoteError } =
    await supabaseAdmin
      .from("quotes")
      .update({
        status: "Converted",
        order_id: order.id,
        converted_at: new Date().toISOString(),
      })
      .eq("id", quoteId)
      .is("order_id", null);

  if (updateQuoteError) {
    await supabaseAdmin
      .from("order_items")
      .delete()
      .eq("order_id", order.id);

    await supabaseAdmin
      .from("orders")
      .delete()
      .eq("id", order.id);

    throw new Error(
      `Unable to convert quote: ${updateQuoteError.message}`,
    );
  }

  const {
    data: completedOrder,
    error: completedOrderError,
  } = await supabaseAdmin
    .from("orders")
    .select(`
      *,
      order_items(*)
    `)
    .eq("id", order.id)
    .single();

  if (completedOrderError || !completedOrder) {
    throw new Error(
      completedOrderError?.message ??
        "Unable to load completed order.",
    );
  }

  try {
    await sendPaymentConfirmation(
      completedOrder as CompletedOrder,
    );
  } catch (emailError) {
    /*
     * Payment and order creation remain successful even
     * when the email provider is temporarily unavailable.
     */
    console.error(
      "Unable to send payment confirmation email.",
      {
        orderId: order.id,
        error: emailError,
      },
    );
  }

  return order.id;
}

async function sendPaymentConfirmation(
  order: CompletedOrder,
): Promise<void> {
  const apiKey =
    import.meta.env.RESEND_API_KEY?.trim();

  const fromEmail =
    import.meta.env.ORDER_FROM_EMAIL?.trim() ||
    import.meta.env.FROM_EMAIL?.trim();

  const siteUrl =
    import.meta.env.PUBLIC_SITE_URL
      ?.trim()
      .replace(/\/+$/, "");

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY environment variable is required.",
    );
  }

  if (!fromEmail) {
    throw new Error(
      "ORDER_FROM_EMAIL or FROM_EMAIL environment variable is required.",
    );
  }

  if (!siteUrl) {
    throw new Error(
      "PUBLIC_SITE_URL environment variable is required.",
    );
  }

  const customerEmail =
    String(order.email ?? "").trim();

  if (!customerEmail) {
    throw new Error(
      "Order customer email is missing.",
    );
  }

  console.log("Generating invoice PDF.", {
    orderId: order.id,
    recipient: customerEmail,
  });

  const invoicePdf =
    await generateInvoicePdf(order);

  if (!invoicePdf?.length) {
    throw new Error(
      "Invoice PDF generation returned an empty document.",
    );
  }

  const orderNumber =
    `LF${String(order.order_number).padStart(
      6,
      "0",
    )}`;

  const trackingUrl =
    `${siteUrl}/t/${encodeURIComponent(
      order.tracking_token,
    )}`;

  /*
   * Resend accepts Base64 attachment content. This avoids
   * relying on Node Buffer objects in the Worker request.
   */
  const invoiceBase64 =
    Buffer.from(invoicePdf).toString("base64");

  console.log("Sending payment confirmation.", {
    orderId: order.id,
    orderNumber,
    recipient: customerEmail,
    invoiceBytes: invoicePdf.length,
  });

  const resend = new Resend(apiKey);

  const { data, error } =
    await resend.emails.send({
      from: fromEmail,
      to: customerEmail,
      subject:
        `Payment confirmed — Order ${orderNumber}`,
      html: paymentConfirmationHtml(
        order.customer_name ?? "Customer",
        orderNumber,
        trackingUrl,
        Number(order.total),
      ),
      attachments: [
        {
          filename:
            `Layer-Forge-Invoice-${orderNumber}.pdf`,
          content: invoiceBase64,
        },
      ],
    });

  if (error) {
    throw new Error(
      `Resend rejected the payment confirmation: ${error.message}`,
    );
  }

  console.log("Payment confirmation sent.", {
    orderId: order.id,
    orderNumber,
    recipient: customerEmail,
    resendEmailId: data?.id,
  });
}

  if (error) {
    throw new Error(
      `Unable to send payment confirmation: ${error.message}`,
    );
  }

  console.log("Payment confirmation sent.", {
    orderId: order.id,
    orderNumber,
  });
}